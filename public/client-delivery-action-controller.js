import {
  connectorActionLabel,
  deliveryAuthorityRequirementForAction,
  deliveryAuthorityOwnerLabel,
  deliveryAuthoritySummary,
  deliveryErrorPresentation,
  deliveryGoogleSourceFlowPlan,
  deliveryGoogleSourceFieldDescriptors,
  deliveryGoogleSourceLoadLabel,
  deliveryLocalExecutionPlan,
  deliveryOutcomePresentation,
  deliveryExecutionPromptPresentation,
  deliveryExecutionSideEffectPlan,
  deliveryExecutorStatePresentation,
  deliverySchedulePromptPresentation,
  deliveryScheduleSideEffectPlan,
  deliveryDraftDefaultsForType,
  deliveryControlFieldsForType,
  extractSocialPostTextFromDeliveryContent,
  genericDeliverableSectionDescriptors,
  deliveryPrimaryActionDescriptors,
  deliveryUiText,
  resolveDeliveryExecutionAction,
  resolveDeliveryScheduleAction,
  resolveDeliveryActionContract,
  deliveryActionContractForType,
  validateDeliveryExecutionDraft
} from './delivery-action-contract.js';
import { normalizeArticleText } from './client-delivery-files.js?v=20260526b';
import { compactClientText as compactChatText } from './client-text-utils.js?v=20260521a';
import { createClientDeliveryPublishController } from './client-delivery-publish-controller.js?v=20260528a';
import { createClientDeliveryExecutorPreferences } from './client-delivery-executor-preferences.js?v=20260601a';
import { createClientDeliveryFollowupController } from './client-delivery-followup-controller.js?v=20260602a';

export function createClientDeliveryActionController(deps = {}) {
  const {
    api,
    appendOrderChatExchange,
    apiPayloadFromOrderDraftWithChatSession,
    chatEngineIsNeedsInputResponse,
    clearFollowupContext,
    connectorActionForChat,
    connectorStatusForClient,
    copyTextToClipboard,
    createdOrderPrimaryId,
    downloadDeliveryFile,
    downloadDeliverySummaryFile,
    downloadDeliveryZip,
    els,
    ensureCurrentOpenChatSessionId,
    escapeHtml,
    flash,
    focusWorkResults,
    handleNeedsInputResponse,
    handleOrderFundingPrompt,
    handleOrderPreflightPrompt,
    findLoadedGithubRepo,
    isGithubLinked,
    loadOrderDraftIntoComposer,
    looksJapanese,
    markCurrentOpenChatSessionLinkedOrder,
    mergeProgressJobIntoSnapshot,
    normalizeClientConnector,
    normalizeClientConnectorCapabilityList,
    normalizeClientList,
    normalizeOrderProgressStatus,
    normalizeRepoFullName,
    openJobDetail,
    openGithubSignIn,
    openLoginForProtectedAction,
    openSettingsSection,
    orderProgressMeta,
    orderProgressTone,
    preflightFromError,
    refresh,
    renderDeliveryFilesPanel,
    renderRunDelivery,
    renderWorkflowChildNote,
    renderWorkflowTeamSummary,
    revealCreatedOrderInHistory,
    scheduledWorkTimeLabel,
    selectedJob,
    selectedRepoFromPicker,
    setDetail,
    startOpenChatOrderProgressPolling,
    state,
    summarizeOrderDraftForAnalytics,
    switchTab,
    trackChatTranscript,
    trackConversionEvent,
    updateCliPanels,
    upsertOpenChatOrderProgressMessage,
    validateOrderDraft,
    visitorId,
    xApprovalPayloadForClient,
    xConnectorIdentityForClient
  } = deps;

  const deliveryExecutorPersistTimers = new Map();

  function isXConnectorReady(auth = {}) {
    const status = connectorStatusForClient?.(auth, state?.snapshot?.accountSettings || null) || {};
    return Boolean(status.x);
  }

  const deliveryPublishController = createClientDeliveryPublishController({
    api,
    applyDeliveryExecutionSuccess: (...args) => applyDeliveryExecutionSuccess(...args),
    bindDescriptorActions: (...args) => bindDescriptorActions(...args),
    bindDescriptorFields: (...args) => bindDescriptorFields(...args),
    copyTextToClipboard: (...args) => copyTextToClipboard(...args),
    deliveryExecutorPersistTimers,
    escapeHtml,
    flash,
    isGithubLinked,
    loadOrderDraftIntoComposer,
    loadPersistedDeliveryActionDrafts: (...args) => loadPersistedDeliveryActionDrafts(...args),
    mergeProgressJobIntoSnapshot,
    persistDeliveryActionDrafts: (...args) => persistDeliveryActionDrafts(...args),
    renderRunDelivery,
    selectedJob,
    state,
    switchTab,
    updateCliPanels
  });
  const {
    bindDeliveryPublishControls,
    preparePublishOrderFromDelivery,
    renderDeliveryPublishCard
  } = deliveryPublishController;

function loadPersistedDeliveryActionDrafts(force = false) {
  const auth = state.snapshot?.auth || {};
  const scope = String(auth?.login || auth?.user?.login || visitorId()).trim().toLowerCase();
  if (!force && state.deliveryActionDraftsScope === scope && state.deliveryPublishDraftsScope === scope) return;
  state.deliveryPublishDrafts = {};
  state.deliveryActionDrafts = {};
  state.deliveryPublishDraftsScope = scope;
  state.deliveryActionDraftsScope = scope;
}

function persistDeliveryActionDrafts() {
  const auth = state.snapshot?.auth || {};
  const scope = String(auth?.login || auth?.user?.login || visitorId()).trim().toLowerCase();
  state.deliveryPublishDraftsScope = scope;
  state.deliveryActionDraftsScope = scope;
}

async function persistGenericDeliverableDraft(jobId = '', immediate = false) {
  const key = String(jobId || '').trim();
  if (!key) return;
  const draft = state.deliveryActionDrafts?.[key];
  if (!draft || typeof draft !== 'object') return;
  const save = async () => {
    deliveryExecutorPersistTimers.delete(key);
    try {
      const result = await api(`/api/jobs/${encodeURIComponent(key)}/executor-state`, {
        method: 'PATCH',
        body: JSON.stringify(draft)
      });
      if (result?.job) mergeProgressJobIntoSnapshot(result.job);
    } catch {
      // keep local draft; server sync can be retried by later edits or refresh
    }
  };
  if (immediate) {
    const pending = deliveryExecutorPersistTimers.get(key);
    if (pending) window.clearTimeout(pending);
    deliveryExecutorPersistTimers.delete(key);
    await save();
    return;
  }
  const existing = deliveryExecutorPersistTimers.get(key);
  if (existing) window.clearTimeout(existing);
  const timer = window.setTimeout(() => { void save(); }, 350);
  deliveryExecutorPersistTimers.set(key, timer);
}

function deliveryActionMeta(deliverable = null) {
  const provided = resolveDeliveryActionContract(deliverable?.type, deliverable?.actionContract);
  if (provided) return provided;
  const type = String(deliverable?.type || '').trim();
  return deliveryActionContractForType(type);
}

function genericDeliverableDraftForJob(job = {}, deliverable = null) {
  const key = String(job?.id || '').trim();
  if (!key) return null;
  loadPersistedDeliveryActionDrafts();
  const existing = state.deliveryActionDrafts?.[key];
  if (existing) return existing;
  const persisted = job?.executorState && typeof job.executorState === 'object' ? job.executorState : null;
  const report = job?.output?.report && typeof job.output.report === 'object' ? job.output.report : {};
  const type = String(deliverable?.type || '').trim();
  const xPrefs = xExecutorPreferences();
  let draft = deliveryDraftDefaultsForType(type, {
    preferredChannel: xPrefs.channel,
    preferredActionMode: xPrefs.actionMode,
    xConnected: isXConnectorReady(state.snapshot?.auth || {}),
    suggestedPostText: suggestedSocialPostText(deliverable?.content || ''),
    defaultScheduledAt: localDatetimeInputValue(''),
    isPlatformAdmin: Boolean(state.snapshot?.auth?.isPlatformAdmin),
    defaultEmailTarget: state.snapshot?.auth?.isPlatformAdmin ? 'cait_resend' : 'gmail',
    defaultEmailSubject: String(deliverable?.title || 'Email draft').trim(),
    defaultEmailBody: normalizeArticleText(String(deliverable?.content || '')).trim(),
    githubConnected: isGithubLinked(state.snapshot?.auth || {}),
    defaultCodeTarget: isGithubLinked(state.snapshot?.auth || {}) ? 'github_repo' : 'local_terminal',
    preferredRepoFullName: preferredGithubRepoFullName()
  });
  if (deliverable?.draftDefaults && typeof deliverable.draftDefaults === 'object') {
    draft = { ...draft, ...deliverable.draftDefaults };
  }
  const googlePrefs = googleExecutorPreferences();
  draft.googleSearchConsoleSite = String(googlePrefs.searchConsoleSite || '').trim();
  draft.googleGa4Property = String(googlePrefs.ga4Property || '').trim();
  draft.googleDriveFileId = String(googlePrefs.driveFileId || '').trim();
  draft.googleCalendarId = String(googlePrefs.calendarId || '').trim();
  draft.googleGmailLabelId = String(googlePrefs.gmailLabelId || '').trim();
  const authoritySeed = authorityRequestFromReport(report);
  if (authoritySeed) {
    draft.authorityRequired = {
      reason: authoritySeed.reason,
      missingConnectors: authoritySeed.missingConnectors,
      missingConnectorCapabilities: authoritySeed.missingConnectorCapabilities,
      source: authoritySeed.source,
      requestedAt: authoritySeed.requestedAt,
      ownerLabel: authoritySeed.ownerLabel,
      requiredRepositorySelection: authoritySeed.requiredRepositorySelection,
      repoCandidates: authoritySeed.repoCandidates,
      requiredChannelSelection: authoritySeed.requiredChannelSelection,
      channelCandidates: authoritySeed.channelCandidates
    };
    if (authoritySeed.googleIncludeGroups.length) {
      draft.googleIncludeGroups = authoritySeed.googleIncludeGroups.slice();
    }
    if (authoritySeed.requiredRepositorySelection) {
      draft.repoFullName = '';
    }
    if (authoritySeed.requiredChannelSelection) {
      draft.channel = '';
    }
    if (!authoritySeed.requiredRepositorySelection && !String(draft.repoFullName || '').trim() && Array.isArray(authoritySeed.repoCandidates) && authoritySeed.repoCandidates.length) {
      draft.repoFullName = normalizeRepoFullName(String(authoritySeed.repoCandidates[0] || ''));
    }
    if (!authoritySeed.requiredChannelSelection && !String(draft.channel || '').trim() && Array.isArray(authoritySeed.channelCandidates) && authoritySeed.channelCandidates.length) {
      draft.channel = String(authoritySeed.channelCandidates[0] || '').trim();
    }
  }
  if (persisted) draft = { ...draft, ...persisted };
  state.deliveryActionDrafts[key] = draft;
  persistDeliveryActionDrafts();
  return draft;
}

function mergePreparedDeliveryExecutionSeed(jobId = '', seed = null) {
  const key = String(jobId || '').trim();
  if (!key || !seed || typeof seed !== 'object') return;
  const current = state.deliveryActionDrafts?.[key] && typeof state.deliveryActionDrafts[key] === 'object'
    ? state.deliveryActionDrafts[key]
    : {};
  const defaults = seed.draftDefaults && typeof seed.draftDefaults === 'object' ? seed.draftDefaults : {};
  const merged = { ...current };
  for (const [field, value] of Object.entries(defaults)) {
    const currentValue = merged[field];
    if (currentValue === undefined || currentValue === null || currentValue === '') {
      merged[field] = value;
    }
  }
  state.deliveryActionDrafts[key] = merged;
  persistDeliveryActionDrafts();
}

async function prepareGenericDeliverableExecutionSeed(run = null, deliverable = null) {
  const key = String(run?.id || '').trim();
  if (!key || !deliverable?.type) return null;
  const existing = state.deliveryExecutionSeeds?.[key];
  if (existing?.status === 'done') return existing;
  if (existing?.status === 'pending') return null;
  state.deliveryExecutionSeeds[key] = { status: 'pending' };
  try {
    const payload = await api('/api/deliveries/prepare-execution', {
      method: 'POST',
      body: JSON.stringify({
        job_id: key,
        content_type: String(deliverable.type || ''),
        title: String(deliverable.title || ''),
        content: String(deliverable.content || ''),
        file_name: String(deliverable.fileName || ''),
        format: String(deliverable.format || '')
      })
    });
    const seed = {
      status: 'done',
      actionContract: resolveDeliveryActionContract(deliverable.type, payload?.action_contract),
      draftDefaults: payload?.draft_defaults && typeof payload.draft_defaults === 'object' ? payload.draft_defaults : {},
      controlOptions: payload?.control_options && typeof payload.control_options === 'object' ? payload.control_options : {},
      executionAction: payload?.execution_action && typeof payload.execution_action === 'object' ? payload.execution_action : null,
      scheduleAction: payload?.schedule_action && typeof payload.schedule_action === 'object' ? payload.schedule_action : null,
      primaryActions: Array.isArray(payload?.primary_actions) ? payload.primary_actions : [],
      suggestedPrimaryAction: payload?.suggested_primary_action && typeof payload.suggested_primary_action === 'object' ? payload.suggested_primary_action : null,
      authorityHints: payload?.authority_hints && typeof payload.authority_hints === 'object' ? payload.authority_hints : {}
    };
    state.deliveryExecutionSeeds[key] = seed;
    mergePreparedDeliveryExecutionSeed(key, seed);
    if (state.selectedJobId === key) renderRunDelivery(selectedJob());
    return seed;
  } catch (error) {
    state.deliveryExecutionSeeds[key] = { status: 'error', error: String(error?.message || error) };
    return null;
  }
}

function repoOptionsDatalist(id = '') {
  const repos = Array.isArray(state.repos) ? state.repos : [];
  if (!repos.length) return '';
  const safeId = `delivery-repo-options-${String(id || '').replace(/[^a-z0-9_-]/gi, '-')}`;
  const options = repos
    .slice(0, 200)
    .map((repo) => `<option value="${escapeHtml(String(repo.fullName || ''))}"></option>`)
    .join('');
  return `<datalist id="${safeId}">${options}</datalist>`;
}

function suggestedSocialPostText(content = '') {
  const normalized = normalizeArticleText(content);
  if (!normalized) return '';
  const extracted = extractSocialPostTextFromDeliveryContent(normalized, { maxLength: 280 });
  if (extracted) return extracted;
  const blocks = normalized
    .split(/\n\s*\n/)
    .map((part) => part.replace(/^[-*]\s+/gm, '').trim())
    .filter(Boolean);
  const exact = blocks.find((part) => part.length > 0 && part.length <= 280);
  if (exact) return exact;
  const firstLine = normalized.split('\n').map((line) => line.trim()).find(Boolean) || '';
  return compactChatText(firstLine, 280);
}

function updateGenericDeliverableDraft(jobId = '', patch = {}) {
  const key = String(jobId || '').trim();
  if (!key) return;
  loadPersistedDeliveryActionDrafts();
  const current = state.deliveryActionDrafts?.[key] && typeof state.deliveryActionDrafts[key] === 'object'
    ? state.deliveryActionDrafts[key]
    : {};
  state.deliveryActionDrafts[key] = { ...current, ...patch };
  persistDeliveryActionDrafts();
  void persistGenericDeliverableDraft(key, false);
}

const deliveryExecutorPreferences = createClientDeliveryExecutorPreferences({
  api,
  flash,
  mergeProgressJobIntoSnapshot,
  normalizeClientConnectorCapabilityList,
  normalizeClientList,
  normalizeRepoFullName,
  renderRunDelivery,
  selectedJob,
  selectedRepoFromPicker,
  state,
  updateGenericDeliverableDraft
});
const {
  flattenGa4PropertyOptions,
  flattenGoogleCalendarOptions,
  flattenGoogleDriveOptions,
  flattenGoogleGmailLabelOptions,
  googleExecutorPreferences,
  googleIncludeGroupsFromAuthorityRequest,
  loadGoogleSourcesForGenericDeliverable,
  normalizeGoogleIncludeGroup,
  preferredGithubRepoFullName,
  saveGithubExecutorPreferences,
  saveGoogleExecutorPreferences,
  saveXExecutorPreferences,
  xExecutorPreferences
} = deliveryExecutorPreferences;

const deliveryFollowupController = createClientDeliveryFollowupController({
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
});
const {
  directFollowupDraftFromDelivery,
  prepareFollowupOrderFromDelivery,
  sendFollowupToAgentFromDelivery
} = deliveryFollowupController;

function setGenericDeliverableExecutionStopped(jobId = '', stopped = true, reason = 'user_cancelled') {
  const key = String(jobId || '').trim();
  if (!key) return;
  updateGenericDeliverableDraft(key, {
    executionStopped: Boolean(stopped),
    executionStopReason: stopped ? String(reason || 'user_cancelled') : ''
  });
  void persistGenericDeliverableDraft(key, true);
}

function setGenericDeliverableAuthorityRequired(jobId = '', authority = null) {
  const key = String(jobId || '').trim();
  if (!key) return;
  if (!authority || typeof authority !== 'object') {
    updateGenericDeliverableDraft(key, { authorityRequired: null });
    void persistGenericDeliverableDraft(key, true);
    return;
  }
  updateGenericDeliverableDraft(key, {
    authorityRequired: {
      reason: String(authority.reason || authority.error || 'Additional connector access is required before execution can continue.'),
      missingConnectors: normalizeClientList(authority.missingConnectors || authority.missing_connectors, []),
      missingConnectorCapabilities: normalizeClientConnectorCapabilityList(authority.missingConnectorCapabilities || authority.missing_connector_capabilities, []),
      source: String(authority.source || '').trim(),
      requestedAt: new Date().toISOString(),
      ownerLabel: String(authority.ownerLabel || authority.owner_label || '').trim(),
      requiredRepositorySelection: Boolean(authority.requiredRepositorySelection || authority.required_repository_selection),
      repoCandidates: normalizeClientList(authority.repoCandidates || authority.repo_candidates || authority.repositories, []),
      requiredChannelSelection: Boolean(authority.requiredChannelSelection || authority.required_channel_selection),
      channelCandidates: normalizeClientList(authority.channelCandidates || authority.channel_candidates || authority.channels, [])
    }
  });
  if (Array.isArray(authority.googleIncludeGroups) && authority.googleIncludeGroups.length) {
    updateGenericDeliverableDraft(key, {
      googleIncludeGroups: authority.googleIncludeGroups.map(normalizeGoogleIncludeGroup).filter(Boolean)
    });
  }
  void persistGenericDeliverableDraft(key, true);
}

function genericDeliverableAuthorityState(run = null, draft = null) {
  const authority = draft?.authorityRequired && typeof draft.authorityRequired === 'object'
    ? draft.authorityRequired
    : null;
  if (!authority) return null;
  const connectorStatus = connectorStatusForClient(state.snapshot?.auth || {}, state.snapshot?.accountSettings || null);
  const missingConnectors = normalizeClientList(authority.missingConnectors, [])
    .map(normalizeClientConnector)
    .filter((connector) => connector && Object.prototype.hasOwnProperty.call(connectorStatus, connector) && !connectorStatus[connector]);
  const missingConnectorCapabilities = normalizeClientConnectorCapabilityList(authority.missingConnectorCapabilities, []);
  const requiredRepositorySelection = Boolean(authority.requiredRepositorySelection || authority.required_repository_selection);
  const missingRepositorySelection = requiredRepositorySelection && !normalizeRepoFullName(draft?.repoFullName || '');
  const requiredChannelSelection = Boolean(authority.requiredChannelSelection || authority.required_channel_selection);
  const missingChannelSelection = requiredChannelSelection && !String(draft?.channel || '').trim();
  return {
    reason: String(authority.reason || 'Additional connector access is required before execution can continue.'),
    missingConnectors,
    missingConnectorCapabilities,
    resolved: missingConnectors.length === 0 && !missingRepositorySelection && !missingChannelSelection,
    source: String(authority.source || ''),
    requestedAt: String(authority.requestedAt || ''),
    ownerLabel: String(authority.ownerLabel || authority.owner_label || ''),
    requiredRepositorySelection,
    missingRepositorySelection,
    repoCandidates: normalizeClientList(authority.repoCandidates || authority.repo_candidates || authority.repositories, []),
    requiredChannelSelection,
    missingChannelSelection,
    channelCandidates: normalizeClientList(authority.channelCandidates || authority.channel_candidates || authority.channels, [])
  };
}

function authorityRequestFromReport(report = {}) {
  const candidate = report?.authority_request
    || report?.authorityRequest
    || report?.action_required
    || report?.actionRequired
    || report?.executor_request
    || report?.executorRequest
    || (Array.isArray(report?.authority_requests) ? report.authority_requests[0] : null)
    || (Array.isArray(report?.authorityRequests) ? report.authorityRequests[0] : null)
    || null;
  if (!candidate || typeof candidate !== 'object') return null;
  const missingConnectors = normalizeClientList(
    candidate.missingConnectors
      || candidate.missing_connectors
      || candidate.connectors
      || candidate.required_connectors,
    []
  );
  const missingConnectorCapabilities = normalizeClientConnectorCapabilityList(
    candidate.missingConnectorCapabilities
      || candidate.missing_connector_capabilities
      || candidate.requiredConnectorCapabilities
      || candidate.required_connector_capabilities
      || candidate.capabilities,
    []
  );
  const googleIncludeGroups = googleIncludeGroupsFromAuthorityRequest(candidate);
  const requiredRepositorySelection = Boolean(candidate.requiredRepositorySelection || candidate.required_repository_selection || candidate.requireRepositorySelection || candidate.require_repository_selection);
  const requiredChannelSelection = Boolean(candidate.requiredChannelSelection || candidate.required_channel_selection || candidate.requireChannelSelection || candidate.require_channel_selection);
  const reason = String(
    candidate.reason
      || candidate.message
      || candidate.summary
      || report?.nextAction
      || report?.next_action
      || 'Additional connector access is required before execution can continue.'
  ).trim();
  if (!reason && !missingConnectors.length && !missingConnectorCapabilities.length && !googleIncludeGroups.length && !requiredRepositorySelection && !requiredChannelSelection) return null;
  return {
    reason,
    missingConnectors,
    missingConnectorCapabilities,
    googleIncludeGroups,
    source: String(candidate.source || candidate.kind || 'leader_request').trim(),
    ownerLabel: String(candidate.ownerLabel || candidate.owner_label || candidate.requestedBy || candidate.requested_by || candidate.agentName || candidate.agent_name || '').trim(),
    requestedAt: new Date().toISOString(),
    requiredRepositorySelection,
    repoCandidates: normalizeClientList(candidate.repoCandidates || candidate.repo_candidates || candidate.repositories, []),
    requiredChannelSelection,
    channelCandidates: normalizeClientList(candidate.channelCandidates || candidate.channel_candidates || candidate.channels, [])
  };
}

function authorityRequestRequiresClientApproval(authority = null) {
  if (!authority || typeof authority !== 'object') return false;
  const missingConnectors = normalizeClientList(authority.missingConnectors || authority.missing_connectors || authority.connectors, []);
  const missingConnectorCapabilities = normalizeClientConnectorCapabilityList(authority.missingConnectorCapabilities || authority.missing_connector_capabilities || authority.capabilities, []);
  const googleIncludeGroups = normalizeClientList(authority.googleIncludeGroups || authority.requiredGoogleSources || authority.required_google_sources, []);
  const selectionRequired = Boolean(
    authority.requiredRepositorySelection
    || authority.required_repository_selection
    || authority.requiredChannelSelection
    || authority.required_channel_selection
    || authority.requiredAccountSelection
    || authority.required_account_selection
  );
  const reason = String(authority.reason || authority.message || authority.summary || '').trim();
  return Boolean(
    missingConnectors.length
    || missingConnectorCapabilities.length
    || googleIncludeGroups.length
    || selectionRequired
    || /(oauth|approval|approve|authority|connector|required|missing|connect|confirm|publish|send|post|承認|接続|未接続|確認|権限|投稿|送信|必要)/i.test(reason)
  );
}

function agentForRun(run = null) {
  const id = String(run?.assignedAgentId || run?.jobAgentId || '').trim();
  if (!id || !Array.isArray(state.snapshot?.agents)) return null;
  return state.snapshot.agents.find((agent) => String(agent?.id || '').trim() === id) || null;
}

function authorityOwnerLabelForRun(run = null, deliverable = null, authority = null) {
  const agent = agentForRun(run);
  return deliveryAuthorityOwnerLabel(authority, {
    agentName: String(agent?.name || '').trim(),
    deliverableType: String(deliverable?.type || '').trim()
  });
}

function describeAuthorityNeed(capabilities = [], connectors = []) {
  const normalizedCapabilities = normalizeClientConnectorCapabilityList(capabilities, []);
  const normalizedConnectors = normalizeClientList(connectors, []).map(normalizeClientConnector);
  const parts = [];
  if (normalizedCapabilities.includes('github.write_pr')) parts.push('GitHub pull request authority');
  if (normalizedCapabilities.includes('x.post')) parts.push('X posting authority');
  if (normalizedCapabilities.includes('google.read_gsc')) parts.push('a Search Console source');
  if (normalizedCapabilities.includes('google.read_ga4')) parts.push('a GA4 property');
  if (normalizedCapabilities.includes('google.read_drive') || normalizedCapabilities.includes('google.read_docs') || normalizedCapabilities.includes('google.read_sheets') || normalizedCapabilities.includes('google.read_presentations')) parts.push('a Google Drive source');
  if (normalizedCapabilities.includes('google.read_calendar')) parts.push('a Google Calendar source');
  if (normalizedCapabilities.includes('google.write_calendar')) parts.push('Google Calendar write authority');
  if (normalizedCapabilities.includes('google.create_meet')) parts.push('Google Meet creation authority');
  if (normalizedCapabilities.includes('google.read_gmail')) parts.push('a Gmail source');
  if (normalizedCapabilities.includes('google.send_gmail')) parts.push('Gmail send authority');
  if (normalizedCapabilities.includes('zoom.schedule_meeting')) parts.push('Zoom scheduling authority');
  if (normalizedCapabilities.includes('microsoft.create_teams_meeting')) parts.push('Microsoft Teams scheduling authority');
  if (!parts.length && normalizedConnectors.includes('github')) parts.push('a GitHub connection');
  if (!parts.length && normalizedConnectors.includes('google')) parts.push('a Google connection');
  if (!parts.length && normalizedConnectors.includes('zoom')) parts.push('a Zoom connection');
  if (!parts.length && normalizedConnectors.includes('microsoft')) parts.push('a Microsoft Teams connection');
  if (!parts.length && normalizedConnectors.includes('x')) parts.push('an X connection');
  return parts.length ? parts.join(', ') : 'additional authority';
}

function genericDeliverableAuthoritySummary(run = null, deliverable = null, authority = null) {
  return deliveryAuthoritySummary(authority, {
    agentName: String(agentForRun(run)?.name || '').trim(),
    deliverableType: String(deliverable?.type || '').trim()
  });
}

function localDatetimeInputValue(value = '') {
  const parsed = Number.isFinite(Date.parse(value)) ? new Date(value) : new Date(Date.now() + 60 * 60 * 1000);
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function localDatetimeInputToIso(value = '') {
  const text = String(value || '').trim();
  if (!text) return '';
  const ms = Date.parse(text);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : '';
}

function genericDeliverableScheduleLabel(value = '') {
  const iso = localDatetimeInputToIso(value);
  return iso ? scheduledWorkTimeLabel(iso) : 'Select a future time';
}

async function scheduleExactConnectorAction(run = null, deliverable = null, action = {}, options = {}) {
  const scheduledFor = localDatetimeInputToIso(options.scheduleAt || '');
  if (!scheduledFor) {
    flash('Choose a valid future schedule time first.', 'warn');
    return null;
  }
  if (Date.parse(scheduledFor) <= Date.now() + 60_000) {
    flash('Choose a schedule time at least one minute in the future.', 'warn');
    return null;
  }
  const result = await api('/api/recurring-orders', {
    method: 'POST',
    body: JSON.stringify({
      parent_agent_id: run?.parentAgentId || 'cloudcode-main',
      task_type: String(options.taskType || run?.taskType || 'automation'),
      order_strategy: 'single',
      prompt: String(options.prompt || `${deliverable?.title || 'Scheduled action'}\nScheduled for ${scheduledFor}`),
      next_run_at: scheduledFor,
      max_runs: 1,
      schedule: {
        interval: 'daily',
        time: '09:00',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Tokyo'
      },
      input: {
        _broker: {
          exactConnectorAction: {
            ...action,
            scheduledFor,
            previewText: String(options.previewText || '')
          }
        }
      }
    })
  });
  flash(`Scheduled action created. Next run: ${scheduledWorkTimeLabel(result.recurring_order?.nextRunAt || scheduledFor)}`, 'ok');
  await refresh();
  return result;
}

async function prepareGenericDeliverableOrderFromDelivery(job = null, deliverable = null) {
  try {
    if (!job?.id) throw new Error('Select a completed delivery first.');
    if (!deliverable?.content) throw new Error('No deliverable content detected in this delivery.');
    const draft = genericDeliverableDraftForJob(job, deliverable) || {};
    const prepared = await api('/api/deliveries/prepare-followup-order', {
      method: 'POST',
      body: JSON.stringify({
        job_id: String(job.id || ''),
        content_type: String(deliverable.type || ''),
        deliverable: {
          type: String(deliverable.type || ''),
          title: String(deliverable.title || ''),
          fileName: String(deliverable.fileName || ''),
          content: String(deliverable.content || '')
        },
        draft
      })
    });
    loadOrderDraftIntoComposer({
      followupToJobId: String(prepared?.followup_to_job_id || job.id || ''),
      taskType: String(prepared?.task_type || job.taskType || 'research'),
      agentId: String(prepared?.agent_id || ''),
      prompt: String(prepared?.prompt || '').trim(),
      budgetCap: Number(job?.budgetCap ?? 300),
      deadlineSec: Number(job?.deadlineSec ?? 120),
      orderStrategy: String(prepared?.order_strategy || 'auto')
    });
    flash(`${deliverable.title || 'Deliverable'} drafted as the next order. No execution has started. Review it, then SEND ORDER when ready.`, 'ok');
    return prepared;
  } catch (error) {
    flash(String(error?.message || 'Could not prepare next order.'), 'warn');
    return null;
  }
}

function genericDeliverableExecutorCommand(job = null, deliverable = null, draft = {}) {
  if (!job?.id || !deliverable?.content) return '';
  if (deliverable.type !== 'code_handoff') return '';
  const target = String(draft.target || 'local_terminal');
  if (target !== 'local_terminal') return '';
  const base = `npm run cait -- follow-up ${job.id} --watch`;
  const prompt = '"Implement the technical handoff from the previous delivery and continue in local executor mode."';
  return `${base} ${prompt}`;
}

function communitySubmissionUrl(channel = '', text = '') {
  const value = String(channel || '').trim().toLowerCase();
  const body = String(text || '').trim();
  const encoded = encodeURIComponent(body);
  if (value === 'reddit') return `https://www.reddit.com/submit?selftext=true&text=${encoded}`;
  if (value === 'indie_hackers') return `https://www.indiehackers.com/post/new?body=${encoded}`;
  return '';
}

async function openCommunityPostTarget(channel = '', text = '', options = {}) {
  const normalizedChannel = String(channel || '').trim().toLowerCase();
  const exactText = String(text || '').trim();
  if (!exactText) {
    flash('Write the exact community post text first.', 'warn');
    return;
  }
  const url = communitySubmissionUrl(normalizedChannel, exactText);
  if (!url) {
    flash('No community handoff target is configured for this channel yet.', 'warn');
    return;
  }
  const popup = window.open(url, '_blank', 'noopener,noreferrer');
  await copyTextToClipboard(exactText, 'Post text copied.');
  if (!popup) {
    flash('The community page was blocked by the browser. Allow popups and try again.', 'warn');
    return;
  }
  appendOrderChatExchange(exactText, {
    kind: 'assist',
    tone: 'ok',
    body: [
      `Opened ${normalizedChannel === 'reddit' ? 'Reddit' : 'Indie Hackers'} in a new tab with the prepared post text copied.`,
      '',
      'Finish the native community posting flow there. CAIt kept the exact text in this chat.'
    ].join('\n'),
    status: `${normalizedChannel === 'reddit' ? 'Reddit' : 'Indie Hackers'} native handoff opened.`
  }, { nextPrompt: '' });
  void trackConversionEvent('community_native_handoff_opened', {
    source: options.source || 'delivery_card',
    channel: normalizedChannel
  });
}

async function executeCodeHandoffInGithub(job = null, deliverable = null, draft = {}) {
  const auth = state.snapshot?.auth || {};
  const connectorStatus = connectorStatusForClient(auth, state.snapshot?.accountSettings || null);
  const requirement = deliveryAuthorityRequirementForAction('github_pr');
  if (!auth.loggedIn) {
    setGenericDeliverableAuthorityRequired(job?.id, {
      ...requirement,
      reason: 'Sign in and connect GitHub before CAIt can create a PR handoff.'
    });
    if (job?.id && state.selectedJobId === String(job.id)) renderRunDelivery(selectedJob());
    flash('GitHub executor paused. Sign in and connect GitHub, then resume this delivery.', 'warn');
    openGithubSignIn();
    return;
  }
  if (!connectorStatus.github) {
    setGenericDeliverableAuthorityRequired(job?.id, {
      ...requirement
    });
    if (job?.id && state.selectedJobId === String(job.id)) renderRunDelivery(selectedJob());
    flash('GitHub executor paused until GitHub is connected.', 'warn');
    return;
  }
  const repoFullName = normalizeRepoFullName(draft.repoFullName || preferredGithubRepoFullName());
  if (!repoFullName || !repoFullName.includes('/')) {
    flash('Choose the target repository first.', 'warn');
    return;
  }
  const matchedRepo = findLoadedGithubRepo(repoFullName);
  const [owner, repo] = repoFullName.split('/');
  const confirmed = window.confirm(`Create a GitHub PR handoff in ${repoFullName}?\n\nCAIt will create a sandbox branch, add a technical handoff file, and open a pull request.`);
  if (!confirmed) {
    setGenericDeliverableExecutionStopped(job?.id, true, 'user_cancelled');
    if (job?.id && state.selectedJobId === String(job.id)) renderRunDelivery(selectedJob());
    flash('GitHub executor stopped for this delivery. Clear the stop state to retry.', 'info');
    return;
  }
  const payload = await api('/api/github/create-executor-pr', {
    method: 'POST',
    body: JSON.stringify({
      owner,
      repo,
      installation_id: matchedRepo?.installationId || undefined,
      confirm_repo_write: true,
      kind: 'code_handoff',
      source_job_id: job?.id || '',
      source_delivery_title: String(deliverable?.title || ''),
      source_file_name: String(deliverable?.fileName || ''),
      title: String(deliverable?.title || 'Code handoff'),
      content: String(deliverable?.content || ''),
      execution_mode: String(draft.executionMode || 'draft_pr')
    })
  });
  setGenericDeliverableAuthorityRequired(job?.id, null);
  flash(`GitHub PR handoff created: ${payload.pull_request?.html_url || payload.pull_request?.htmlUrl || payload.pull_request?.number || ''}`, 'ok');
  appendOrderChatExchange(String(deliverable?.title || 'Code handoff'), {
    kind: 'assist',
    tone: 'ok',
    body: [
      `Created a GitHub PR handoff for ${repoFullName}.`,
      '',
      payload.pull_request?.html_url || payload.pull_request?.htmlUrl || '',
      payload.branch ? `Branch: ${payload.branch}` : '',
      Array.isArray(payload.files) && payload.files.length
        ? `Files: ${payload.files.map((file) => file.path).join(', ')}`
        : ''
    ].filter(Boolean).join('\n'),
    status: 'GitHub PR handoff created.'
  }, { nextPrompt: '' });
}

async function executeGenericDeliverableViaApi(run = null, deliverable = null, draft = {}, actionKind = '') {
  const normalizedActionKind = String(actionKind || '').trim();
  if (!isDeliveryExecutionActionSupported(normalizedActionKind)) {
    throw new Error(`Unsupported delivery execution action: ${normalizedActionKind || 'unknown'}`);
  }
  const approvalPayload = normalizedActionKind === 'x_post'
    ? xApprovalPayloadForClient(String(draft.postText || ''))
    : {};
  try {
    return await api('/api/deliveries/execute', {
      method: 'POST',
      body: JSON.stringify({
        job_id: String(run?.id || ''),
        action_kind: normalizedActionKind,
        confirm_execute: true,
        ...approvalPayload,
        draft: { ...draft, ...approvalPayload },
        deliverable: {
          title: String(deliverable?.title || ''),
          fileName: String(deliverable?.fileName || ''),
          content: String(deliverable?.content || '')
        }
      })
    });
  } catch (error) {
    const preflight = preflightFromError(error);
    if (preflight?.code === 'connector_required') {
      setGenericDeliverableAuthorityRequired(run?.id, {
        reason: preflight.error || 'Additional connector access is required before this executor can continue.',
        missingConnectors: preflight.missingConnectors || [],
        missingConnectorCapabilities: preflight.missingConnectorCapabilities || [],
        source: 'delivery_execute'
      });
      if (run?.id && state.selectedJobId === String(run.id)) renderRunDelivery(selectedJob());
    }
    throw error;
  }
}

async function scheduleGenericDeliverableViaApi(run = null, deliverable = null, draft = {}, actionKind = '') {
  const normalizedActionKind = String(actionKind || '').trim();
  if (!isDeliveryScheduleActionSupported(normalizedActionKind)) {
    throw new Error(`Unsupported delivery schedule action: ${normalizedActionKind || 'unknown'}`);
  }
  const approvalPayload = normalizedActionKind === 'x_post'
    ? xApprovalPayloadForClient(String(draft.postText || ''))
    : {};
  return api('/api/deliveries/schedule', {
    method: 'POST',
    body: JSON.stringify({
      job_id: String(run?.id || ''),
      action_kind: normalizedActionKind,
      confirm_schedule: true,
      ...approvalPayload,
      draft: { ...draft, ...approvalPayload },
      deliverable: {
        title: String(deliverable?.title || '')
      },
      scheduled_for: localDatetimeInputToIso(draft.scheduledAt || ''),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Tokyo',
      task_type: normalizedActionKind === 'x_post' ? 'x_post' : normalizedActionKind === 'instagram_post' ? 'instagram' : 'email_ops',
      prompt: `${deliverable?.title || 'Scheduled action'}\nScheduled for ${localDatetimeInputToIso(draft.scheduledAt || '')}`,
      preview_text: normalizedActionKind === 'x_post' || normalizedActionKind === 'instagram_post'
        ? String(draft.postText || '')
        : `${String(draft.emailSubject || '')}\n\n${String(draft.emailBody || '')}`
    })
  });
}

function deliveryExecutionEntity(payload = {}) {
  return payload?.entity && typeof payload.entity === 'object' ? payload.entity : {};
}

function deliveryActionTargetLabel(draft = {}, action = {}) {
  const normalizedTarget = String(draft?.target || '').trim();
  if (action?.kind === 'resend_send' || normalizedTarget === 'cait_resend') return 'CAIt Resend';
  if (action?.kind === 'gmail_send' || normalizedTarget === 'gmail') return 'Gmail';
  return '';
}

function applyDeliveryExecutionSuccess(run = null, deliverable = null, draft = {}, action = {}, payload = {}, options = {}) {
  const presentation = deliveryOutcomePresentation(action.kind, payload, {
    repoFullName: normalizeRepoFullName(draft.repoFullName || preferredGithubRepoFullName()),
    targetLabel: deliveryActionTargetLabel(draft, action)
  });
  if (presentation.flash) flash(String(presentation.flash), 'ok');
  if (presentation.body || presentation.status) {
    appendOrderChatExchange(String(options.chatTitle || deliverable?.title || 'Delivery'), {
      kind: 'assist',
      tone: 'ok',
      body: String(presentation.body || '').trim(),
      status: String(presentation.status || '').trim()
    }, { nextPrompt: '' });
  }
}

async function applyDeliveryExecutionOutcomeEffects(run = null, action = {}, payload = {}) {
  const plan = deliveryExecutionSideEffectPlan(action.kind, payload);
  if (plan.clearAuthority) setGenericDeliverableAuthorityRequired(run?.id, null);
  if (plan.refresh) {
    await refresh();
  }
  if (plan.selectReturnedJob && plan.returnedJobId) {
    state.selectedJobId = String(plan.returnedJobId);
    const fresh = selectedJob();
    if (fresh) setDetail(fresh);
  }
}

async function applyDeliveryScheduleOutcomeEffects(action = {}, payload = {}) {
  const plan = deliveryScheduleSideEffectPlan(action.kind, payload);
  if (plan.refresh) await refresh();
}

async function performLocalDeliveryExecutionAction(run = null, deliverable = null, draft = {}, action = {}) {
  const plan = deliveryLocalExecutionPlan(action.kind, deliveryActionPresentationOptions(draft, action));
  if (!plan) return false;
  if (plan.kind === 'open_community') {
    await openCommunityPostTarget(plan.channel, String(draft.postText || ''), { source: plan.source || 'delivery_social_execute' });
    applyDeliveryExecutionSuccess(run, deliverable, draft, action, {
      ok: true,
      action_kind: action.kind,
      outcome_kind: 'handoff',
      message: `Opened ${plan.channel === 'reddit' ? 'Reddit' : 'Indie Hackers'} for posting.`,
      entity: { channel: plan.channel }
    }, { chatTitle: String(draft.postText || '') });
    return true;
  }
  if (plan.kind === 'copy_command') {
    const command = genericDeliverableExecutorCommand(run, deliverable, draft);
    if (command) {
      await copyTextToClipboard(command, plan.copyLabel || 'Copied.');
      applyDeliveryExecutionSuccess(run, deliverable, draft, action, {
        ok: true,
        action_kind: action.kind,
        outcome_kind: 'local_copy',
        message: plan.copyLabel || 'Executor command copied.',
        entity: { command }
      });
    }
    return true;
  }
  return false;
}

function deliveryActionPresentationOptions(draft = {}, action = {}) {
  const channel = String(draft.channel || '').trim();
  const xIdentity = xConnectorIdentityForClient();
  return {
    repoFullName: normalizeRepoFullName(draft.repoFullName || preferredGithubRepoFullName()),
    targetLabel: deliveryActionTargetLabel(draft, action),
    scheduleLabel: genericDeliverableScheduleLabel(draft.scheduledAt || ''),
    postText: String(draft.postText || '').trim(),
    xAccountLabel: xIdentity.label,
    xUsername: xIdentity.username,
    xUserId: xIdentity.userId,
    recipientEmail: String(draft.recipientEmail || '').trim(),
    emailSubject: String(draft.emailSubject || '').trim(),
    nextStep: String(draft.nextStep || '').trim(),
    channelLabel: channel === 'instagram' ? 'Instagram post' : channel === 'x' ? 'X post' : 'social handoff'
  };
}

function applyGenericDeliverableAuthorityRequirement(run = null, payload = {}, fallbackSource = 'delivery_execute') {
  const entity = payload?.entity && typeof payload.entity === 'object' ? payload.entity : {};
  const missingConnectors = Array.isArray(entity.missing_connectors) ? entity.missing_connectors : [];
  const missingConnectorCapabilities = Array.isArray(entity.missing_connector_capabilities) ? entity.missing_connector_capabilities : [];
  setGenericDeliverableAuthorityRequired(run?.id, {
    reason: String(payload?.message || payload?.error || 'Additional connector access is required before this executor can continue.'),
    missingConnectors,
    missingConnectorCapabilities,
    source: String(entity.source || fallbackSource || 'delivery_execute')
  });
  if (run?.id && state.selectedJobId === String(run.id)) renderRunDelivery(selectedJob());
}

function handleGenericDeliverableApiError(run = null, draft = {}, action = {}, error = null, options = {}) {
  const payload = error?.data && typeof error.data === 'object' ? error.data : null;
  const message = String(error?.message || '').trim();
  if (!payload && /^Unsupported delivery (execution|schedule) action:/i.test(message)) {
    flash(message, 'warn');
    return true;
  }
  const preflight = payload?.error_kind === 'authority_required'
    ? {
        code: 'connector_required',
        error: payload.message || payload.error || 'Additional connector access is required before this executor can continue.',
        missingConnectors: Array.isArray(payload?.entity?.missing_connectors) ? payload.entity.missing_connectors : [],
        missingConnectorCapabilities: Array.isArray(payload?.entity?.missing_connector_capabilities) ? payload.entity.missing_connector_capabilities : []
      }
    : preflightFromError(error);
  if (preflight?.code === 'connector_required') {
    applyGenericDeliverableAuthorityRequirement(run, payload || {
      message: preflight.error,
      entity: {
        missing_connectors: preflight.missingConnectors || [],
        missing_connector_capabilities: preflight.missingConnectorCapabilities || [],
        source: options.authoritySource || 'delivery_execute'
      }
    }, options.authoritySource || 'delivery_execute');
  }
  if (payload) {
    const presentation = deliveryErrorPresentation(action.kind, payload, {
      targetLabel: deliveryActionTargetLabel(draft, action)
    });
    if (presentation.flash) flash(String(presentation.flash), presentation.tone || 'warn');
    return true;
  }
  if (preflight?.code === 'connector_required') {
    flash('Execution paused until the required connector is connected. Resume this delivery after connecting it.', 'warn');
    return true;
  }
  return false;
}

async function executePreparedGenericDeliverable(run = null, deliverable = null) {
  let draft = genericDeliverableDraftForJob(run || {}, deliverable) || {};
  if (draft.executionStopped) {
    const stoppedPresentation = deliveryExecutorStatePresentation('', { state: 'stopped' });
    if (stoppedPresentation.flash) flash(String(stoppedPresentation.flash), stoppedPresentation.tone || 'warn');
    return;
  }
  const authority = genericDeliverableAuthorityState(run, draft);
  if (authority && !authority.resolved) {
    const pausedPresentation = deliveryExecutorStatePresentation('', { state: 'paused' });
    if (pausedPresentation.flash) flash(String(pausedPresentation.flash), pausedPresentation.tone || 'warn');
    return;
  }
  const googleRequested = deliveryGoogleSourceFlowPlan(draft, authority).requestedGroups;
  const draftValidation = validateDeliveryExecutionDraft(deliverable?.type, draft, { googleRequested });
  if (!draftValidation.ok) {
    flash(String(draftValidation.error || 'Fill in the required executor fields first.'), 'warn');
    return;
  }
  const action = resolveDeliveryExecutionAction(deliverable?.type, draft);
  flash(`Execution requested: ${String(action.kind || 'delivery')}. Waiting for response...`, 'info');
  try {
    if (action.kind === 'x_post') {
      const prompt = deliveryExecutionPromptPresentation(action.kind, deliveryActionPresentationOptions(draft, action));
      const confirmed = window.confirm(prompt.confirm);
      if (!confirmed) {
        setGenericDeliverableExecutionStopped(run?.id, true, 'user_cancelled');
        if (run?.id && state.selectedJobId === String(run.id)) renderRunDelivery(selectedJob());
        if (prompt.stopped) flash(prompt.stopped, 'info');
        return;
      }
      const result = await executeGenericDeliverableViaApi(run, deliverable, draft, action.kind);
      applyDeliveryExecutionSuccess(run, deliverable, draft, action, result, { chatTitle: String(draft.postText || '') });
      await applyDeliveryExecutionOutcomeEffects(run, action, result);
      return;
    }
    if (action.kind === 'instagram_post') {
      const prompt = deliveryExecutionPromptPresentation(action.kind, deliveryActionPresentationOptions(draft, action));
      const confirmed = window.confirm(prompt.confirm);
      if (!confirmed) {
        setGenericDeliverableExecutionStopped(run?.id, true, 'user_cancelled');
        if (run?.id && state.selectedJobId === String(run.id)) renderRunDelivery(selectedJob());
        if (prompt.stopped) flash(prompt.stopped, 'info');
        return;
      }
      const result = await executeGenericDeliverableViaApi(run, deliverable, draft, action.kind);
      applyDeliveryExecutionSuccess(run, deliverable, draft, action, result, { chatTitle: String(draft.postText || '') });
      await applyDeliveryExecutionOutcomeEffects(run, action, result);
      return;
    }
    if (await performLocalDeliveryExecutionAction(run, deliverable, draft, action)) {
      return;
    }
    if (action.kind === 'resend_send' || action.kind === 'gmail_send') {
      const prompt = deliveryExecutionPromptPresentation(action.kind, deliveryActionPresentationOptions(draft, action));
      const confirmed = window.confirm(prompt.confirm);
      if (!confirmed) {
        setGenericDeliverableExecutionStopped(run?.id, true, 'user_cancelled');
        if (run?.id && state.selectedJobId === String(run.id)) renderRunDelivery(selectedJob());
        if (prompt.stopped) flash(prompt.stopped, 'info');
        return;
      }
      const payload = await executeGenericDeliverableViaApi(run, deliverable, draft, action.kind);
      applyDeliveryExecutionSuccess(run, deliverable, draft, action, payload);
      await applyDeliveryExecutionOutcomeEffects(run, action, payload);
      return;
    }
    if (action.kind === 'github_pr') {
      const prompt = deliveryExecutionPromptPresentation(action.kind, deliveryActionPresentationOptions(draft, action));
      const confirmed = window.confirm(prompt.confirm);
      if (!confirmed) {
        setGenericDeliverableExecutionStopped(run?.id, true, 'user_cancelled');
        if (run?.id && state.selectedJobId === String(run.id)) renderRunDelivery(selectedJob());
        if (prompt.stopped) flash(prompt.stopped, 'info');
        return;
      }
      const payload = await executeGenericDeliverableViaApi(run, deliverable, draft, action.kind);
      applyDeliveryExecutionSuccess(run, deliverable, draft, action, payload);
      await applyDeliveryExecutionOutcomeEffects(run, action, payload);
      return;
    }
    if (action.kind === 'report_next') {
      const nextStep = String(draft.nextStep || 'action_plan');
      if (googleRequested.length && !draft.googleAssets && !draft.googleAssetsLoading) {
        try {
          await loadGoogleSourcesForGenericDeliverable(run, draft, authority);
          draft = genericDeliverableDraftForJob(run || {}, deliverable) || {};
        } catch (error) {
          flash(String(error?.message || 'Google sources could not be loaded.'), 'warn');
          return;
        }
      }
      const reportValidation = validateDeliveryExecutionDraft(deliverable?.type, draft, { googleRequested });
      if (!reportValidation.ok) {
        flash(String(reportValidation.error || 'Fill in the required executor fields first.'), 'warn');
        return;
      }
      const prompt = deliveryExecutionPromptPresentation(action.kind, deliveryActionPresentationOptions(draft, action));
      const confirmed = window.confirm(prompt.confirm);
      if (!confirmed) {
        setGenericDeliverableExecutionStopped(run?.id, true, 'user_cancelled');
        if (run?.id && state.selectedJobId === String(run.id)) renderRunDelivery(selectedJob());
        if (prompt.stopped) flash(prompt.stopped, 'info');
        return;
      }
      const result = await executeGenericDeliverableViaApi(run, deliverable, draft, action.kind);
      const entity = deliveryExecutionEntity(result);
      applyDeliveryExecutionSuccess(run, deliverable, draft, action, {
        ...result,
        message: nextStep === 'publish_followup'
          ? `Publish follow-up order started: ${String(entity.job_id || '').slice(0, 8)}`
          : `Next execution order started: ${String(entity.job_id || '').slice(0, 8)}`
      });
      await applyDeliveryExecutionOutcomeEffects(run, action, result);
      return;
    }
    if (action.kind === 'export_only' || action.kind === 'none') {
      const exportPresentation = deliveryExecutorStatePresentation(action.kind, { state: 'export_only' });
      if (exportPresentation.flash) flash(String(exportPresentation.flash), exportPresentation.tone || 'info');
      return;
    }
    flash(`Unsupported execution action: ${String(action.kind || 'unknown')}`, 'warn');
    return;
  } catch (error) {
    if (handleGenericDeliverableApiError(run, draft, action, error, {
      authoritySource: action.kind === 'report_next' ? 'report_executor' : 'delivery_execute'
    })) return;
    throw error;
  }
}

async function schedulePreparedGenericDeliverable(run = null, deliverable = null) {
  const draft = genericDeliverableDraftForJob(run || {}, deliverable) || {};
  const draftValidation = validateDeliveryExecutionDraft(deliverable?.type, draft);
  if (!draftValidation.ok) {
    flash(String(draftValidation.error || 'Fill in the required executor fields first.'), 'warn');
    return;
  }
  const action = resolveDeliveryScheduleAction(deliverable?.type, draft);
  try {
    if (action.kind === 'x_post' || action.kind === 'instagram_post') {
      const prompt = deliverySchedulePromptPresentation(action.kind, deliveryActionPresentationOptions(draft, action));
      const confirmed = window.confirm(prompt.confirm);
      if (!confirmed) return;
      const result = await scheduleGenericDeliverableViaApi(run, deliverable, draft, action.kind);
      const entity = deliveryExecutionEntity(result);
      const presentation = deliveryOutcomePresentation(action.kind, {
        ...result,
        message: `Scheduled action created. Next run: ${scheduledWorkTimeLabel(entity.next_run_at || localDatetimeInputToIso(draft.scheduledAt || ''))}`
      });
      if (presentation.flash) flash(String(presentation.flash), 'ok');
      await applyDeliveryScheduleOutcomeEffects(action, result);
      return;
    }
    if (action.kind === 'gmail_send' || action.kind === 'resend_send') {
      const target = String(draft.target || 'gmail');
      const prompt = deliverySchedulePromptPresentation(action.kind, deliveryActionPresentationOptions(draft, action));
      const confirmed = window.confirm(prompt.confirm);
      if (!confirmed) return;
      const result = await scheduleGenericDeliverableViaApi(run, deliverable, draft, action.kind);
      const entity = deliveryExecutionEntity(result);
      const presentation = deliveryOutcomePresentation(action.kind, {
        ...result,
        message: `Scheduled action created. Next run: ${scheduledWorkTimeLabel(entity.next_run_at || localDatetimeInputToIso(draft.scheduledAt || ''))}`
      }, { targetLabel: target === 'cait_resend' ? 'CAIt Resend' : 'Gmail' });
      if (presentation.flash) flash(String(presentation.flash), 'ok');
      await applyDeliveryScheduleOutcomeEffects(action, result);
      return;
    }
    flash(`Unsupported schedule action: ${String(action.kind || 'unknown')}`, 'warn');
    return;
  } catch (error) {
    if (handleGenericDeliverableApiError(run, draft, action, error, { authoritySource: 'delivery_schedule' })) return;
    throw error;
  }
}

async function postExactToInstagram(draft = {}, options = {}) {
  const auth = state.snapshot?.auth || {};
  if (!auth.loggedIn) {
    flash('Sign in before CAIt can publish to Instagram.', 'warn');
    openLoginForProtectedAction('instagram_publish', 'work');
    return;
  }
  const accessToken = String(draft.instagramAccessToken || '').trim();
  const instagramUserId = String(draft.instagramUserId || '').trim();
  const mediaUrl = String(draft.instagramMediaUrl || '').trim();
  const caption = String(draft.postText || '').trim();
  if (!accessToken || !instagramUserId || !mediaUrl) {
    flash('Instagram publish requires access token, Instagram user ID, and a public media URL.', 'warn');
    return;
  }
  if (!caption) {
    flash('Write the Instagram caption first.', 'warn');
    return;
  }
  const prompt = deliveryExecutionPromptPresentation('instagram_post', { postText: caption });
  const confirmed = window.confirm(prompt.confirm);
  if (!confirmed) {
    if (options.jobId) {
      setGenericDeliverableExecutionStopped(options.jobId, true, 'user_cancelled');
      if (state.selectedJobId === String(options.jobId)) renderRunDelivery(selectedJob());
    }
    if (prompt.stopped) flash(prompt.stopped, 'info');
    return;
  }
  const result = await api('/api/connectors/instagram/post', {
    method: 'POST',
    body: JSON.stringify({
      accessToken,
      instagramUserId,
      mediaUrl,
      caption,
      confirm_post: true,
      source: options.source || 'delivery_card'
    })
  });
  flash(`Published to Instagram: ${result.media_id || result.creation_id}`, 'ok');
  appendOrderChatExchange(caption, {
    kind: 'assist',
    tone: 'ok',
    body: [
      'Published to Instagram after explicit confirmation.',
      '',
      result.media_id ? `Media ID: ${result.media_id}` : '',
      result.creation_id ? `Creation ID: ${result.creation_id}` : ''
    ].filter(Boolean).join('\n'),
    status: 'Instagram publish completed.'
  }, { nextPrompt: '' });
}

  function renderGenericDeliverableCard(run = null, deliverable = null) {
    if (!run?.id || !deliverable?.content) return '';
    const seed = state.deliveryExecutionSeeds?.[String(run.id || '').trim()] || null;
    if (!seed || seed.status === 'error') {
      void prepareGenericDeliverableExecutionSeed(run, deliverable);
    }
    const context = genericDeliverableRenderContext(run, deliverable);
    if (!context.meta) return '';
    const sections = genericDeliverableSectionDescriptors()
      .map((section) => renderGenericDeliverableSection(section, context))
      .filter(Boolean)
      .join('');
    return `
      <div class="detail-box action-card info compact-card delivery-publish-card">
        ${sections}
      </div>
    `;
  }

function renderGenericDeliverableControlField(run = null, draft = {}, field = {}, options = {}) {
  if (!field || typeof field !== 'object') return '';
  if (field.kind === 'group' && Array.isArray(field.fields)) {
    const inner = field.fields.map((item) => renderGenericDeliverableControlField(run, draft, item, options)).join('');
    return inner ? `<div class="${escapeHtml(String(field.layout || 'publish-grid'))}">${inner}</div>` : '';
  }
  const label = String(field.label || '').trim();
  const dataAttr = String(field.dataAttr || '').trim();
  const key = String(field.key || '').trim();
  if (!label || !dataAttr || !key) return '';
  const value = draft?.[key];
  const helperText = String(field.helperText || '').trim();
  const placeholder = String(field.placeholder || '').trim();
  const extraHtml = String(field.extraHtml || '');
  if (field.type === 'select') {
    const overrideOptions = options?.optionOverrides && typeof options.optionOverrides === 'object'
      ? options.optionOverrides[key]
      : null;
    const selectOptions = Array.isArray(overrideOptions) && overrideOptions.length
      ? overrideOptions
      : (Array.isArray(field.options) ? field.options : []);
    return `
      <label class="form-field">
        <span class="field-label">${escapeHtml(label)}</span>
        <select ${escapeHtml(dataAttr)}="${escapeHtml(run?.id || '')}">
          ${selectOptions.map((option) => `<option value="${escapeHtml(String(option?.value || ''))}"${String(value || '') === String(option?.value || '') ? ' selected' : ''}>${escapeHtml(String(option?.label || option?.value || ''))}</option>`).join('')}
        </select>
        ${helperText ? `<span class="row-muted">${escapeHtml(helperText)}</span>` : ''}
      </label>
    `;
  }
  if (field.type === 'textarea') {
    return `
      <label class="form-field">
        <span class="field-label">${escapeHtml(label)}</span>
        <textarea rows="${Number(field.rows || 4)}" ${escapeHtml(dataAttr)}="${escapeHtml(run?.id || '')}" placeholder="${escapeHtml(placeholder)}">${escapeHtml(String(value || ''))}</textarea>
        ${helperText ? `<span class="row-muted">${escapeHtml(helperText)}</span>` : ''}
      </label>
    `;
  }
  const inputType = field.type === 'datetime-local' ? 'datetime-local' : 'text';
  const listAttr = field.listId ? ` list="${escapeHtml(String(field.listId || ''))}"` : '';
  return `
    <label class="form-field">
      <span class="field-label">${escapeHtml(label)}</span>
      <input type="${escapeHtml(inputType)}" ${escapeHtml(dataAttr)}="${escapeHtml(run?.id || '')}" value="${escapeHtml(String(value || ''))}" placeholder="${escapeHtml(placeholder)}"${listAttr} />
      ${helperText ? `<span class="row-muted">${escapeHtml(helperText)}</span>` : ''}
      ${extraHtml}
    </label>
  `;
}

function renderDeliveryAuthorityCard(run = null, deliverable = null, authority = null) {
  if (!authority) return '';
  const ownerLabel = authorityOwnerLabelForRun(run, deliverable, authority);
  const authorityText = genericDeliverableAuthoritySummary(run, deliverable, authority);
  return `<div class="detail-box compact-card ${authority.resolved ? 'ok' : 'warn'}"><strong>${escapeHtml(`${ownerLabel.toUpperCase()} REQUEST`)}</strong>\n\n${escapeHtml(authorityText)}</div>`;
}

function renderGoogleSourceControls(run = null, draft = {}, authority = null, googleSourcePlan = null, googleOptionsByGroup = {}) {
  const authorityReadyToResume = Boolean(authority && authority.resolved);
  const requestedGroups = Array.isArray(googleSourcePlan?.requestedGroups) ? googleSourcePlan.requestedGroups : [];
  if (!requestedGroups.length || !authorityReadyToResume) return '';
  const authorityOwnerLabel = authorityOwnerLabelForRun(run, { type: 'report_bundle' }, authority);
  const fieldDescriptors = deliveryGoogleSourceFieldDescriptors(requestedGroups);
  return `
      <div class="detail-box compact-card info">
        <div class="field-label">${escapeHtml(deliveryUiText('googleSourcesTitle'))}</div>
        <div class="muted">${escapeHtml(`${authorityOwnerLabel} asked for Google data before continuing.`)}</div>
        <div class="muted">${escapeHtml(String(googleSourcePlan?.summary || deliveryUiText('googleSourcesSummaryFallback')))}</div>
        ${draft.googleAssetsError ? `<div class="detail-box compact-card warn">${escapeHtml(String(draft.googleAssetsError || ''))}</div>` : ''}
        ${fieldDescriptors.map((field) => `
          <label class="form-field">
            <span class="field-label">${escapeHtml(field.label)}</span>
            <select data-generic-delivery-${escapeHtml(field.attr)}="${escapeHtml(run.id)}">
              <option value="">${escapeHtml(field.emptyLabel)}</option>
              ${(googleOptionsByGroup[field.group] || []).map((option) => `<option value="${escapeHtml(String(option.value || ''))}"${String(draft?.[field.key] || '') === String(option.value || '') ? ' selected' : ''}>${escapeHtml(String(option.label || option.value || ''))}</option>`).join('')}
            </select>
          </label>
        `).join('')}
        <div class="helper-row">
          <button class="mini-btn" data-load-generic-google-sources="1">${deliveryGoogleSourceLoadLabel({ loading: draft.googleAssetsLoading })}</button>
        </div>
      </div>
    `;
}

function renderGenericDeliverablePrimaryActionButtons(run = null, descriptors = [], options = {}) {
  if (options.executionStopped || options.authorityBlocked) return '';
  return (Array.isArray(descriptors) ? descriptors : [])
    .filter((descriptor) => !descriptor.requiresConnectReady || options.connectReady)
    .map((descriptor) => descriptor.mode === 'schedule'
      ? `<button class="mini-btn" data-schedule-generic-deliverable="${escapeHtml(String(descriptor.dataAction || ''))}">${escapeHtml(String(descriptor.label || 'RUN'))}</button>`
      : `<button class="mini-btn" data-execute-generic-deliverable="${escapeHtml(String(descriptor.dataAction || ''))}">${escapeHtml(String(descriptor.label || 'RUN'))}</button>`)
    .join('');
}

function renderGenericDeliverableApprovalPreview(context = {}) {
  const draft = context.draft && typeof context.draft === 'object' ? context.draft : {};
  const isXPost = context.deliverable?.type === 'social_post_pack'
    && String(draft.channel || '').trim() === 'x'
    && ['post_ready', 'schedule_ready'].includes(String(draft.actionMode || '').trim());
  if (!isXPost) return '';
  const identity = xConnectorIdentityForClient();
  const postText = String(draft.postText || '').trim();
  const accountLine = context.connectReady && identity.handle
    ? `OAuth account: ${identity.handle}${identity.displayName ? ` (${identity.displayName})` : ''}`
    : 'OAuth account: not connected yet';
  return `
    <div class="detail-box compact-card ${context.connectReady ? 'info' : 'warn'}">
      <strong>X POST APPROVAL PREVIEW</strong>
      <div class="row-muted">${escapeHtml(accountLine)}</div>
      <div class="row-muted">${escapeHtml('CAIt posts only after this account and the exact text are approved.')}</div>
      ${postText ? `<pre class="delivery-preview-text">${escapeHtml(postText)}</pre>` : `<div class="row-muted">${escapeHtml('No exact post text yet.')}</div>`}
    </div>
  `;
}

function renderGenericDeliverableAuxiliaryButtons(run = null, deliverable = null, authority = null, options = {}) {
  const authorityButtons = Boolean(options.authorityBlocked)
    ? (Array.isArray(authority?.missingConnectors) ? authority.missingConnectors : [])
      .slice(0, 3)
      .map((connector) => {
        const action = connectorActionForChat(connector);
        const capabilities = (Array.isArray(authority?.missingConnectorCapabilities) ? authority.missingConnectorCapabilities : [])
          .filter((capability) => String(capability || '').trim().toLowerCase().startsWith(`${String(connector || '').trim().toLowerCase()}.`));
        const capabilityAttr = capabilities.length ? ` data-connector-capabilities="${escapeHtml(capabilities.join(','))}"` : '';
        return `<button class="mini-btn" data-chat-action="${escapeHtml(action.action)}"${capabilityAttr}>${escapeHtml(action.label)}</button>`;
      })
      .join('')
    : '';
  const stopButton = authority && !options.executionStopped
    ? '<button class="mini-btn" data-stop-generic-execution="1">CANCEL EXECUTION</button>'
    : '';
  const retryButton = options.executionStopped
    ? '<button class="mini-btn" data-clear-generic-execution-stop="1">ALLOW EXECUTION AGAIN</button>'
    : '';
  const executorCommandButton = deliverable?.type === 'code_handoff' && options.executorCommand
    ? '<button class="mini-btn" data-copy-executor-command="1">COPY EXECUTOR COMMAND</button>'
    : '';
  let connectCapabilities = '';
  if (options.connectAction === 'connect_google' && deliverable?.type === 'email_pack' && String(options.target || '') === 'gmail') connectCapabilities = 'google.send_gmail';
  if (options.connectAction === 'connect_x') connectCapabilities = 'x.post';
  const connectCapabilityAttr = connectCapabilities ? ` data-connector-capabilities="${escapeHtml(connectCapabilities)}"` : '';
  const connectButton = options.connectAction && !options.connectReady && !authority
    ? `<button class="mini-btn" data-chat-action="${escapeHtml(String(options.connectAction || ''))}"${connectCapabilityAttr}>${escapeHtml(String(options.connectLabel || ''))}</button>`
    : '';
  const cliButton = deliverable?.type === 'code_handoff' && String(options.target || '') === 'local_terminal'
    ? '<button class="mini-btn" data-open-cli-help="1">OPEN CLI HELP</button>'
    : '';
  return [authorityButtons, stopButton, retryButton, executorCommandButton, connectButton, cliButton].filter(Boolean).join('');
}

function renderGenericDeliverableControls(run = null, deliverable = null, draft = {}, options = {}) {
  const fields = deliveryControlFieldsForType(deliverable?.type, draft, options);
  return fields.map((field) => renderGenericDeliverableControlField(run, draft, field, options)).join('');
}

function flattenDeliveryControlFields(fields = []) {
  const flattened = [];
  for (const field of Array.isArray(fields) ? fields : []) {
    if (!field || typeof field !== 'object') continue;
    if (field.kind === 'group' && Array.isArray(field.fields)) {
      flattened.push(...flattenDeliveryControlFields(field.fields));
      continue;
    }
    flattened.push(field);
  }
  return flattened;
}

function bindDataAttrEvent(root = null, dataAttr = '', eventName = 'change', handler = null) {
  const attr = String(dataAttr || '').trim();
  if (!root || !attr || typeof handler !== 'function') return;
  root.querySelectorAll(`[${attr}]`).forEach((input) => {
    input[`on${eventName}`] = () => handler(input);
  });
}

function bindClickAction(root = null, dataAttr = '', handler = null) {
  bindDataAttrEvent(root, dataAttr, 'click', handler);
}

function bindDescriptorFields(root = null, descriptors = [], resolveBinding = null) {
  if (!root || typeof resolveBinding !== 'function') return;
  for (const descriptor of Array.isArray(descriptors) ? descriptors : []) {
    const key = String(descriptor?.key || '').trim();
    const dataAttr = String(descriptor?.dataAttr || '').trim();
    const binding = resolveBinding(key, descriptor);
    if (!dataAttr || !binding || typeof binding.handler !== 'function') continue;
    bindDataAttrEvent(root, dataAttr, binding.event || 'change', binding.handler);
  }
}

function bindDescriptorActions(root = null, descriptors = [], resolveHandler = null) {
  if (!root || typeof resolveHandler !== 'function') return;
  for (const descriptor of Array.isArray(descriptors) ? descriptors : []) {
    const dataAttr = String(descriptor?.dataAttr || '').trim();
    const kind = String(descriptor?.kind || '').trim();
    const handler = resolveHandler(kind, descriptor);
    if (!dataAttr || typeof handler !== 'function') continue;
    bindClickAction(root, dataAttr, handler);
  }
}

function bindGenericDeliverableControlFields(root = null, run = null, deliverable = null, value = null) {
  if (!root || !run?.id || !deliverable?.type) return;
  const getDraft = () => genericDeliverableDraftForJob(run || {}, deliverable) || {};
  const controlFields = flattenDeliveryControlFields(deliveryControlFieldsForType(deliverable.type, getDraft(), {
    isPlatformAdmin: Boolean(state.snapshot?.auth?.isPlatformAdmin),
    scheduleLabel: genericDeliverableScheduleLabel(getDraft().scheduledAt)
  }));
  const fieldBindings = {
    channel: {
      event: 'change',
      handler: (input) => {
        const channel = String(input.value || 'x');
        updateGenericDeliverableDraft(run.id, { channel });
        void saveXExecutorPreferences({ channel });
        renderRunDelivery(value);
      }
    },
    actionMode: {
      event: 'change',
      handler: (input) => {
        const actionMode = String(input.value || 'draft_only');
        const currentDraft = getDraft();
        const patch = { actionMode };
        if (actionMode === 'schedule_ready' && !String(currentDraft.scheduledAt || '').trim()) {
          patch.scheduledAt = localDatetimeInputValue('');
        }
        updateGenericDeliverableDraft(run.id, patch);
        if (deliverable.type === 'social_post_pack') void saveXExecutorPreferences({ actionMode });
        renderRunDelivery(value);
      }
    },
    target: {
      event: 'change',
      handler: (input) => {
        updateGenericDeliverableDraft(run.id, { target: String(input.value || '') });
        renderRunDelivery(value);
      }
    },
    recipientEmail: {
      event: 'input',
      handler: (input) => updateGenericDeliverableDraft(run.id, { recipientEmail: String(input.value || '') })
    },
    senderEmail: {
      event: 'input',
      handler: (input) => updateGenericDeliverableDraft(run.id, { senderEmail: String(input.value || '') })
    },
    replyToEmail: {
      event: 'input',
      handler: (input) => updateGenericDeliverableDraft(run.id, { replyToEmail: String(input.value || '') })
    },
    emailSubject: {
      event: 'input',
      handler: (input) => updateGenericDeliverableDraft(run.id, { emailSubject: String(input.value || '') })
    },
    emailBody: {
      event: 'input',
      handler: (input) => updateGenericDeliverableDraft(run.id, { emailBody: String(input.value || '') })
    },
    executionMode: {
      event: 'change',
      handler: (input) => {
        updateGenericDeliverableDraft(run.id, { executionMode: String(input.value || 'draft_pr') });
        renderRunDelivery(value);
      }
    },
    repoFullName: {
      event: 'change',
      handler: (input) => {
        const repoFullName = normalizeRepoFullName(String(input.value || ''));
        updateGenericDeliverableDraft(run.id, { repoFullName });
        void saveGithubExecutorPreferences({ repoFullName });
        renderRunDelivery(value);
      }
    },
    nextStep: {
      event: 'change',
      handler: (input) => {
        updateGenericDeliverableDraft(run.id, { nextStep: String(input.value || 'action_plan') });
        renderRunDelivery(value);
      }
    },
    postText: {
      event: 'input',
      handler: (input) => {
        const postText = String(input.value || '');
        updateGenericDeliverableDraft(run.id, { postText });
        const note = input.parentElement?.querySelector('.row-muted');
        if (note) {
          const currentDraft = getDraft();
          note.textContent = String(currentDraft.channel || '') === 'x'
            ? `${postText.length}/280 chars for X direct execution`
            : `${postText.length} chars`;
        }
      }
    },
    scheduledAt: {
      event: 'change',
      handler: (input) => {
        updateGenericDeliverableDraft(run.id, { scheduledAt: String(input.value || '') });
        renderRunDelivery(value);
      }
    },
    instagramAccessToken: {
      event: 'input',
      handler: (input) => updateGenericDeliverableDraft(run.id, { instagramAccessToken: String(input.value || '') })
    },
    instagramUserId: {
      event: 'input',
      handler: (input) => updateGenericDeliverableDraft(run.id, { instagramUserId: String(input.value || '') })
    },
    instagramMediaUrl: {
      event: 'input',
      handler: (input) => updateGenericDeliverableDraft(run.id, { instagramMediaUrl: String(input.value || '') })
    }
  };
  for (const field of controlFields) {
    const key = String(field?.key || '').trim();
    const dataAttr = String(field?.dataAttr || '').trim();
    const binding = fieldBindings[key];
    if (!binding || !dataAttr) continue;
    bindDataAttrEvent(root, dataAttr, binding.event, binding.handler);
  }
  const currentDraft = getDraft();
  const authority = genericDeliverableAuthorityState(run, currentDraft);
  const googleSourcePlan = deliveryGoogleSourceFlowPlan(currentDraft, authority);
  const googlePreferenceMap = {
    googleSearchConsoleSite: 'searchConsoleSite',
    googleGa4Property: 'ga4Property',
    googleDriveFileId: 'driveFileId',
    googleCalendarId: 'calendarId',
    googleGmailLabelId: 'gmailLabelId'
  };
  for (const field of deliveryGoogleSourceFieldDescriptors(googleSourcePlan.requestedGroups || [])) {
    bindDataAttrEvent(root, `data-generic-delivery-${field.attr}`, 'change', (input) => {
      const selectedValue = String(input.value || '');
      updateGenericDeliverableDraft(run.id, { [field.key]: selectedValue });
      const preferenceKey = googlePreferenceMap[field.key];
      if (preferenceKey) void saveGoogleExecutorPreferences({ [preferenceKey]: selectedValue });
      renderRunDelivery(value);
    });
  }
}

function bindGenericDeliverableActionButtons(root = null, run = null, deliverable = null, value = null) {
  if (!root || !run?.id || !deliverable) return;
  bindClickAction(root, 'data-copy-generic-deliverable', () => {
    void copyTextToClipboard(String(deliverable?.content || ''), `${deliverable?.title || 'Deliverable'} copied.`);
  });
  bindClickAction(root, 'data-prepare-generic-deliverable', () => {
    void prepareGenericDeliverableOrderFromDelivery(run, deliverable);
  });
  bindClickAction(root, 'data-execute-generic-deliverable', () => {
    void executePreparedGenericDeliverable(run, deliverable);
  });
  bindClickAction(root, 'data-schedule-generic-deliverable', () => {
    void schedulePreparedGenericDeliverable(run, deliverable);
  });
  bindClickAction(root, 'data-clear-generic-execution-stop', () => {
    setGenericDeliverableExecutionStopped(run.id, false, '');
    renderRunDelivery(value);
    flash('Execution stop cleared. You can run this delivery again.', 'ok');
  });
  bindClickAction(root, 'data-stop-generic-execution', () => {
    setGenericDeliverableExecutionStopped(run.id, true, 'user_cancelled');
    setGenericDeliverableAuthorityRequired(run.id, null);
    renderRunDelivery(value);
    flash('Execution stopped for this delivery. Clear the stop state to allow it again.', 'info');
  });
  bindClickAction(root, 'data-copy-executor-command', () => {
    const draft = genericDeliverableDraftForJob(run || {}, deliverable) || {};
    const command = genericDeliverableExecutorCommand(run, deliverable, draft);
    if (command) void copyTextToClipboard(command, 'Executor command copied.');
  });
  bindClickAction(root, 'data-open-cli-help', () => {
    switchTab('connect');
    updateCliPanels(state.snapshot);
    flash('Open CLI help for local terminal handoff details.', 'info');
  });
  bindClickAction(root, 'data-load-generic-google-sources', async () => {
    const draft = genericDeliverableDraftForJob(run || {}, deliverable) || {};
    const authority = genericDeliverableAuthorityState(run, draft);
    try {
      await loadGoogleSourcesForGenericDeliverable(run, draft, authority);
    } catch (error) {
      flash(String(error?.message || 'Google sources could not be loaded.'), 'warn');
    }
  });
}

function bindDeliveryCommonActionButtons(root = null, options = {}) {
  if (!root) return;
  bindClickAction(root, 'data-copy-delivery-summary', () => {
    copyTextToClipboard(String(options.summaryText || ''), 'Summary copied.');
  });
  bindClickAction(root, 'data-download-delivery-summary', () => {
    downloadDeliverySummaryFile(options.run || null, String(options.summaryText || ''));
  });
  bindClickAction(root, 'data-chat-action', (button) => {
    void handleChatActionButton(button.dataset.chatAction || '', {
      capabilities: button.dataset.connectorCapabilities || '',
      googleCapabilities: button.dataset.connectorCapabilities || '',
      xCapabilities: button.dataset.connectorCapabilities || ''
    });
  });
  bindClickAction(root, 'data-open-workflow-parent', () => {
    if (options.workflowParent?.id) openJobDetail(options.workflowParent.id);
  });
  bindClickAction(root, 'data-open-child-run', (button) => {
    openJobDetail(button.dataset.openChildRun || '');
  });
  bindClickAction(root, 'data-copy-delivery-file', (button) => {
    const file = (options.renderedFiles || [])[Number(button.dataset.copyDeliveryFile)];
    copyTextToClipboard(String(file?.content || ''), `${file?.name || 'File'} copied.`);
  });
  bindClickAction(root, 'data-download-delivery-file', (button) => {
    const file = (options.renderedFiles || [])[Number(button.dataset.downloadDeliveryFile)];
    downloadDeliveryFile(file);
  });
  bindClickAction(root, 'data-download-delivery-zip', () => {
    downloadDeliveryZip(options.renderedFiles || [], options.run || null);
  });
}

function renderRunDeliverySections(run = null, options = {}) {
  return [
    renderWorkflowChildNote(options.workflowParent),
    run?.jobKind === 'workflow' ? renderWorkflowTeamSummary(options.workflowChildren || []) : '',
    renderDeliveryPublishCard(run, options.article),
    renderGenericDeliverableCard(run, options.genericDeliverable),
    renderDeliveryFilesPanel(options.files || [], { run })
  ].filter(Boolean).join('');
}

function bindRunDeliveryInteractions(root = null, value = null, options = {}) {
  if (!root) return;
  bindDeliveryPublishControls(root, options.run, options.article, value);
  bindGenericDeliverableControlFields(root, options.run, options.genericDeliverable, value);
  bindGenericDeliverableActionButtons(root, options.run, options.genericDeliverable, value);
  bindDeliveryCommonActionButtons(root, {
    run: options.run,
    workflowParent: options.workflowParent,
    renderedFiles: options.files || [],
    summaryText: options.summaryText
  });
}

function genericDeliverableConnectorContext(deliverable = null, draft = {}) {
  const auth = state.snapshot?.auth || {};
  const connectorStatus = connectorStatusForClient(auth, state.snapshot?.accountSettings || null);
  const connectAction = deliverable?.type === 'social_post_pack' && String(draft.channel || '') === 'x'
    ? 'connect_x'
    : deliverable?.type === 'email_pack' && String(draft.target || '') === 'gmail'
      ? 'connect_google'
    : deliverable?.type === 'code_handoff' && String(draft.target || '') === 'github_repo'
      ? 'connect_github'
      : '';
  const connectLabel = connectorActionLabel(connectAction, '');
  const connectReady = connectAction === 'connect_github'
    ? connectorStatus.github
    : connectAction === 'connect_google'
      ? connectorStatus.google
      : connectAction === 'connect_x'
        ? connectorStatus.x
        : true;
  return {
    connectAction,
    connectLabel,
    connectReady,
    isPlatformAdmin: Boolean(auth.isPlatformAdmin)
  };
}

function genericDeliverableGoogleSourceContext(draft = {}, authority = null, authorityReadyToResume = false) {
  const googleAssets = draft.googleAssets && typeof draft.googleAssets === 'object' ? draft.googleAssets : null;
  const googleSites = Array.isArray(googleAssets?.search_console?.sites) ? googleAssets.search_console.sites : [];
  const googleGa4Options = flattenGa4PropertyOptions(googleAssets?.ga4?.account_summaries || []);
  const googleDriveOptions = flattenGoogleDriveOptions(googleAssets?.drive?.files || []);
  const googleCalendarOptions = flattenGoogleCalendarOptions(googleAssets?.calendar?.calendars || []);
  const googleGmailLabelOptions = flattenGoogleGmailLabelOptions(googleAssets?.gmail?.labels || []);
  const googleSourcePlan = deliveryGoogleSourceFlowPlan(draft, authority, {
    authorityReadyToResume,
    assetCounts: {
      gsc: googleSites.length,
      ga4: googleGa4Options.length,
      drive: googleDriveOptions.length,
      calendar: googleCalendarOptions.length,
      gmail: googleGmailLabelOptions.length
    }
  });
  return {
    googleSourcePlan,
    googleOptionsByGroup: {
      gsc: googleSites.map((site) => ({ value: String(site.siteUrl || ''), label: String(site.siteUrl || '') })),
      ga4: googleGa4Options,
      drive: googleDriveOptions,
      calendar: googleCalendarOptions,
      gmail: googleGmailLabelOptions
    }
  };
}

function genericDeliverableExecutionContext(run = null, deliverable = null, draft = {}, seed = null, authority = null, connectReady = true) {
  const executionStopped = Boolean(draft.executionStopped);
  const authorityBlocked = Boolean(authority && !authority.resolved);
  const authorityReadyToResume = Boolean(authority && authority.resolved);
  const googleSourceState = genericDeliverableGoogleSourceContext(draft, authority, authorityReadyToResume);
  const showReportExecutor = deliverable?.type === 'report_bundle'
    && ['execution_order', 'publish_followup'].includes(String(draft.nextStep || ''));
  const reportNeedsGoogleLoad = Boolean(showReportExecutor && googleSourceState.googleSourcePlan.needsLoad);
  const primaryActionDescriptors = Array.isArray(seed?.primaryActions) && seed.primaryActions.length
    ? seed.primaryActions
    : deliveryPrimaryActionDescriptors(deliverable?.type, draft, {
        authorityReadyToResume,
        reportNeedsGoogleLoad
      });
  return {
    repoDatalistId: `delivery-repo-options-${String(run?.id || '').replace(/[^a-z0-9_-]/gi, '-')}`,
    executorCommand: genericDeliverableExecutorCommand(run, deliverable, draft),
    executionStopped,
    authorityBlocked,
    authorityReadyToResume,
    reportNeedsGoogleLoad,
    primaryActionDescriptors,
    ...googleSourceState
  };
}

  function genericDeliverableRenderContext(run = null, deliverable = null) {
    const seed = state.deliveryExecutionSeeds?.[String(run?.id || '').trim()] || null;
    const meta = deliveryActionMeta(deliverable);
    const draft = genericDeliverableDraftForJob(run, deliverable) || {};
    const authority = genericDeliverableAuthorityState(run, draft);
    const connectorContext = genericDeliverableConnectorContext(deliverable, draft);
    const executionContext = genericDeliverableExecutionContext(
      run,
      deliverable,
      draft,
      seed,
      authority,
      connectorContext.connectReady
    );
    const fileInfo = deliverable?.fileName ? `<span>${escapeHtml(deliverable.fileName)}</span>` : '';
    const confidence = Number.isFinite(deliverable?.confidence) ? `Confidence ${Math.round(deliverable.confidence * 100)}%` : '';
    return {
      run,
      deliverable,
      seed,
      meta,
      draft,
      authority,
      ...connectorContext,
      fileInfo,
      confidence,
      ...executionContext
    };
  }

function renderGenericDeliverableActionRow(context = {}) {
  const approvalPreview = renderGenericDeliverableApprovalPreview(context);
  const primaryActionButtons = renderGenericDeliverablePrimaryActionButtons(context.run, context.primaryActionDescriptors, {
    executionStopped: context.executionStopped,
    authorityBlocked: context.authorityBlocked,
    connectReady: context.connectReady
  });
  const auxiliaryButtons = renderGenericDeliverableAuxiliaryButtons(context.run, context.deliverable, context.authority, {
    authorityBlocked: context.authorityBlocked,
    executionStopped: context.executionStopped,
    executorCommand: context.executorCommand,
    connectAction: context.connectAction,
    connectLabel: context.connectLabel,
    connectReady: context.connectReady,
    target: String(context.draft?.target || '')
  });
  return [
    approvalPreview,
    `<div class="helper-row"><button class="mini-btn" data-copy-generic-deliverable="${escapeHtml(context.run?.id)}">${escapeHtml(context.meta?.copyLabel || 'COPY')}</button><button class="mini-btn" data-prepare-generic-deliverable="${escapeHtml(context.run?.id)}">${escapeHtml(context.meta?.prepareLabel || 'DRAFT NEXT ORDER')}</button>${primaryActionButtons}${auxiliaryButtons}</div>`,
    '<div class="row-muted">Draft buttons only load the next order into CAIt Chat. Execution starts only after Send order.</div>'
  ].join('');
}

  function renderGenericDeliverableSection(section = {}, context = {}) {
    const kind = String(section?.kind || '').trim();
    if (!kind) return '';
    if (kind === 'intro') {
      return [
        `<div class="field-label">${escapeHtml(context.meta?.title || '')}</div>`,
        `<div class="muted">${escapeHtml(context.meta?.description || '')}</div>`,
        `<div class="publish-meta-line"><strong>${escapeHtml(context.deliverable?.title || 'Detected deliverable')}</strong><span>${escapeHtml(context.confidence)}</span>${context.fileInfo}</div>`
      ].join('');
    }
    if (kind === 'controls') {
      return renderGenericDeliverableControls(context.run, context.deliverable, context.draft, {
        isPlatformAdmin: context.isPlatformAdmin,
        scheduleLabel: genericDeliverableScheduleLabel(context.draft?.scheduledAt || ''),
        repoDatalistId: context.repoDatalistId,
        repoDatalistHtml: repoOptionsDatalist(context.run?.id),
        optionOverrides: context.seed?.controlOptions || {}
      });
    }
    if (kind === 'reason') {
      return `<div class="detail-box compact-card publish-preview-box">${escapeHtml(context.deliverable?.reason || deliveryUiText('genericReasonFallback'))}</div>`;
    }
    if (kind === 'authority') {
      return renderDeliveryAuthorityCard(context.run, context.deliverable, context.authority);
    }
    if (kind === 'google_sources') {
      return renderGoogleSourceControls(context.run, context.draft, context.authority, context.googleSourcePlan, context.googleOptionsByGroup);
    }
    if (kind === 'stopped') {
      return context.executionStopped
        ? `<div class="detail-box compact-card warn">${escapeHtml(deliveryUiText('executionStoppedNotice'))}</div>`
        : '';
    }
    if (kind === 'actions') {
      return renderGenericDeliverableActionRow(context);
    }
    return '';
  }

  return {
    authorityOwnerLabelForRun,
    authorityRequestFromReport,
    authorityRequestRequiresClientApproval,
    describeAuthorityNeed,
    directFollowupDraftFromDelivery,
    executePreparedGenericDeliverable,
    genericDeliverableAuthoritySummary,
    genericDeliverableAuthorityState,
    genericDeliverableDraftForJob,
    googleExecutorPreferences,
    googleIncludeGroupsFromAuthorityRequest,
    loadGoogleSourcesForGenericDeliverable,
    loadPersistedDeliveryActionDrafts,
    normalizeGoogleIncludeGroup,
    prepareFollowupOrderFromDelivery,
    prepareGenericDeliverableExecutionSeed,
    prepareGenericDeliverableOrderFromDelivery,
    preparePublishOrderFromDelivery,
    renderDeliveryPublishCard,
    renderGenericDeliverableCard,
    renderGenericDeliverableControls,
    renderRunDeliverySections,
    bindDeliveryCommonActionButtons,
    bindRunDeliveryInteractions,
    saveGithubExecutorPreferences,
    saveGoogleExecutorPreferences,
    saveXExecutorPreferences,
    schedulePreparedGenericDeliverable,
    sendFollowupToAgentFromDelivery,
    setGenericDeliverableAuthorityRequired,
    setGenericDeliverableExecutionStopped,
    suggestedSocialPostText,
    updateGenericDeliverableDraft
  };
}
