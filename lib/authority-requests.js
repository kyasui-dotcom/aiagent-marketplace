import { nowIso } from './shared.js';

export function sanitizeExecutorStatePatch(body = {}) {
  const input = body && typeof body === 'object' ? body : {};
  const trim = (value, max = 4000) => String(value || '').trim().slice(0, max);
  const bool = (value) => value === true;
  const stringList = (value, maxItems = 12, maxLen = 160) => (
    Array.isArray(value)
      ? value.map((item) => trim(item, maxLen)).filter(Boolean).slice(0, maxItems)
      : []
  );
  const patch = {};
  const scalarKeys = [
    'channel', 'actionMode', 'postText', 'scheduledAt', 'target', 'recipientEmail', 'senderEmail', 'replyToEmail',
    'emailSubject', 'emailBody', 'executionMode', 'repoFullName', 'nextStep', 'googleSearchConsoleSite',
    'googleGa4Property', 'googleDriveFileId', 'googleCalendarId', 'googleGmailLabelId', 'executionStopReason',
    'instagramUserId', 'instagramMediaUrl', 'publishTarget', 'publishPathPrefix', 'publishSlug', 'publishMode'
  ];
  for (const key of scalarKeys) {
    if (!(key in input)) continue;
    patch[key] = trim(input[key], key === 'emailBody' || key === 'postText' ? 12000 : 320);
  }
  if ('executionStopped' in input) patch.executionStopped = bool(input.executionStopped);
  if ('googleIncludeGroups' in input) patch.googleIncludeGroups = stringList(input.googleIncludeGroups, 8, 40);
  if ('authorityRequired' in input) {
    if (!input.authorityRequired || typeof input.authorityRequired !== 'object') patch.authorityRequired = null;
    else {
      const authority = input.authorityRequired;
      patch.authorityRequired = {
        reason: trim(authority.reason, 500),
        missingConnectors: stringList(authority.missingConnectors, 8, 60),
        missingConnectorCapabilities: stringList(authority.missingConnectorCapabilities, 16, 120),
        source: trim(authority.source, 80),
        requestedAt: trim(authority.requestedAt, 80),
        ownerLabel: trim(authority.ownerLabel, 120),
        requiredRepositorySelection: bool(authority.requiredRepositorySelection),
        repoCandidates: stringList(authority.repoCandidates, 20, 120),
        requiredChannelSelection: bool(authority.requiredChannelSelection),
        channelCandidates: stringList(authority.channelCandidates, 12, 60)
      };
    }
  }
  return patch;
}

export function providerAuthorityRequestFromPayload(payload = {}) {
  const body = payload && typeof payload === 'object' ? payload : {};
  const request = body.authority_request
    || body.authorityRequest
    || body.action_required
    || body.actionRequired
    || body.executor_request
    || body.executorRequest
    || (Array.isArray(body.authority_requests) ? body.authority_requests[0] : null)
    || (Array.isArray(body.authorityRequests) ? body.authorityRequests[0] : null)
    || null;
  return request && typeof request === 'object' ? request : null;
}

export function authorityStringList(value, maxItems = 12, maxLen = 160) {
  const raw = Array.isArray(value)
    ? value
    : (typeof value === 'string' ? value.split(/[,\n]/) : []);
  return raw
    .map((item) => String(item || '').trim().slice(0, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

export function authorityBool(value) {
  return value === true || value === 'true' || value === 1;
}

export function authorityRequestFromReport(report = {}) {
  const body = report && typeof report === 'object' ? report : {};
  return body.authority_request
    || body.authorityRequest
    || body.action_required
    || body.actionRequired
    || body.executor_request
    || body.executorRequest
    || (Array.isArray(body.authority_requests) ? body.authority_requests[0] : null)
    || (Array.isArray(body.authorityRequests) ? body.authorityRequests[0] : null)
    || null;
}

export function authorityRequestRequiresApproval(request = null) {
  if (!request || typeof request !== 'object') return false;
  const missingConnectors = authorityStringList(
    request.missing_connectors
      || request.missingConnectors
      || request.required_connectors
      || request.requiredConnectors
      || request.connectors,
    12,
    80
  );
  const missingConnectorCapabilities = authorityStringList(
    request.missing_connector_capabilities
      || request.missingConnectorCapabilities
      || request.required_connector_capabilities
      || request.requiredConnectorCapabilities
      || request.capabilities,
    20,
    120
  );
  const requiredGoogleSources = authorityStringList(
    request.required_google_sources
      || request.requiredGoogleSources
      || request.google_source_types
      || request.googleSourceTypes,
    8,
    60
  );
  const explicitSelectionRequired = authorityBool(
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
  const channelCandidates = authorityStringList(
    request.channel_candidates
      || request.channelCandidates
      || request.channels,
    12,
    60
  );
  const writeCapabilities = missingConnectorCapabilities.filter((item) => (
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
    && !missingConnectorCapabilities.length
    && !requiredGoogleSources.length
    && !explicitSelectionRequired
    && !/(approval|approve|publish|send|post|承認|投稿|送信)/i.test(reason)
  ) {
    return false;
  }
  return Boolean(
    missingConnectors.length
    || missingConnectorCapabilities.length
    || requiredGoogleSources.length
    || explicitSelectionRequired
    || /(oauth|approval|approve|authority|connector|required|missing|connect|confirm|publish|send|post|承認|接続|未接続|確認|権限|投稿|送信|必要)/i.test(reason)
  );
}

export function authorityRequestIsExternalWriteOrPublish(request = null) {
  if (!request || typeof request !== 'object') return false;
  const missingConnectors = authorityStringList(
    request.missing_connectors
      || request.missingConnectors
      || request.required_connectors
      || request.requiredConnectors
      || request.connectors,
    12,
    80
  );
  const missingConnectorCapabilities = authorityStringList(
    request.missing_connector_capabilities
      || request.missingConnectorCapabilities
      || request.required_connector_capabilities
      || request.requiredConnectorCapabilities
      || request.capabilities,
    20,
    120
  );
  const requiredGoogleSources = authorityStringList(
    request.required_google_sources
      || request.requiredGoogleSources
      || request.google_source_types
      || request.googleSourceTypes,
    8,
    60
  );
  const source = String(request.source || request.reason_code || request.reasonCode || '').trim().toLowerCase();
  if (source === 'search_connector_required') return false;
  const writeCapabilities = missingConnectorCapabilities.filter((item) => (
    /(post|publish|send|write|submit|create|update|delete|calendar|gmail|email|x\.post|github\.write|directory|citation)/i.test(String(item || ''))
    && !/^google\.read_/i.test(String(item || ''))
  ));
  const readCapabilities = missingConnectorCapabilities.filter((item) => (
    /^(google|github)\.read_/i.test(String(item || ''))
    || /^read_/i.test(String(item || ''))
  ));
  const writeConnectors = missingConnectors.filter((item) => (
    /(x|twitter|instagram|reddit|indie|gmail|email|calendar|github|repo|repository|drive|directory|citation|automation)/i.test(String(item || ''))
    && !/^(ga4|gsc|search_console|google_analytics|analytics|search|web_search|brave)$/i.test(String(item || ''))
  ));
  const reason = String(request.reason || request.message || request.summary || '').trim();
  const reasonLooksLikeExternalWrite = /(external|publish|publishing|post|posting|send|sending|schedule|write|repo|repository|pull request|connector\/channel|connector action|投稿|公開|送信|配信|掲載|外部|リポジトリ|プルリク|承認済みの文面|アカウント|URL|停止条件)/i.test(reason);
  const readOnly = (readCapabilities.length || requiredGoogleSources.length)
    && !writeCapabilities.length
    && !writeConnectors.length
    && !reasonLooksLikeExternalWrite;
  if (readOnly) return false;
  return Boolean(writeCapabilities.length || writeConnectors.length || reasonLooksLikeExternalWrite);
}

export function authorityBlockReasonFromRequest(request = null, fallback = 'External execution is blocked waiting for connector approval.') {
  const body = request && typeof request === 'object' ? request : {};
  const reason = String(body.reason || body.message || body.summary || fallback).trim() || fallback;
  const capabilities = authorityStringList(body.missing_connector_capabilities || body.missingConnectorCapabilities || body.capabilities, 12, 80);
  const connectors = authorityStringList(body.missing_connectors || body.missingConnectors || body.connectors, 8, 60);
  const details = [...capabilities, ...connectors].filter(Boolean);
  return details.length ? `${reason} Required: ${details.join(', ')}.` : reason;
}

export function normalizeAuthorityRequest(request = null, defaults = {}) {
  if (!request || typeof request !== 'object') return null;
  const missingConnectors = authorityStringList(
    request.missing_connectors
      || request.missingConnectors
      || request.connectors
      || request.required_connectors
      || request.requiredConnectors,
    8,
    60
  ).map((item) => item.toLowerCase());
  const missingConnectorCapabilities = authorityStringList(
    request.missing_connector_capabilities
      || request.missingConnectorCapabilities
      || request.required_connector_capabilities
      || request.requiredConnectorCapabilities
      || request.capabilities,
    16,
    120
  );
  const requiredGoogleSources = authorityStringList(
    request.required_google_sources
      || request.requiredGoogleSources
      || request.google_source_types
      || request.googleSourceTypes,
    8,
    40
  ).map((item) => item.toLowerCase());
  const reason = String(
    request.reason
      || request.message
      || request.summary
      || defaults.reason
      || 'Additional connector authority is required before continuing.'
  ).trim().slice(0, 500);
  const ownerLabel = String(
    request.owner_label
      || request.ownerLabel
      || request.requested_by
      || request.requestedBy
      || request.agent_name
      || request.agentName
      || defaults.ownerLabel
      || 'CAIt'
  ).trim().slice(0, 120);
  const source = String(request.source || request.kind || defaults.source || 'agent_delivery').trim().slice(0, 80);
  const requiredRepositorySelection = authorityBool(
    request.required_repository_selection
      || request.requiredRepositorySelection
      || request.require_repository_selection
      || request.requireRepositorySelection
  );
  const repoCandidates = authorityStringList(
    request.repo_candidates
      || request.repoCandidates
      || request.repositories,
    20,
    120
  );
  const requiredChannelSelection = authorityBool(
    request.required_channel_selection
      || request.requiredChannelSelection
      || request.require_channel_selection
      || request.requireChannelSelection
  );
  const channelCandidates = authorityStringList(
    request.channel_candidates
      || request.channelCandidates
      || request.channels,
    12,
    60
  ).map((item) => item.toLowerCase());
  if (
    !reason
    && !missingConnectors.length
    && !missingConnectorCapabilities.length
    && !requiredGoogleSources.length
    && !requiredRepositorySelection
    && !requiredChannelSelection
  ) {
    return null;
  }
  return {
    reason,
    missing_connectors: missingConnectors,
    missing_connector_capabilities: missingConnectorCapabilities,
    required_google_sources: requiredGoogleSources,
    owner_label: ownerLabel,
    source,
    requested_at: String(request.requested_at || request.requestedAt || defaults.requestedAt || nowIso()).trim().slice(0, 80),
    required_repository_selection: requiredRepositorySelection,
    repo_candidates: repoCandidates,
    required_channel_selection: requiredChannelSelection,
    channel_candidates: channelCandidates
  };
}

export function executorStatePatchFromAuthorityRequest(request = null, existingExecutorState = {}) {
  const normalized = normalizeAuthorityRequest(request, {
    requestedAt: existingExecutorState?.authorityRequired?.requestedAt || nowIso()
  });
  if (!normalized) return null;
  const patch = sanitizeExecutorStatePatch({
    googleIncludeGroups: normalized.required_google_sources,
    authorityRequired: {
      reason: normalized.reason,
      missingConnectors: normalized.missing_connectors,
      missingConnectorCapabilities: normalized.missing_connector_capabilities,
      source: normalized.source,
      requestedAt: normalized.requested_at,
      ownerLabel: normalized.owner_label,
      requiredRepositorySelection: normalized.required_repository_selection,
      repoCandidates: normalized.repo_candidates,
      requiredChannelSelection: normalized.required_channel_selection,
      channelCandidates: normalized.channel_candidates
    }
  });
  return patch.authorityRequired ? patch : null;
}

export function clearJobAuthorityRequest(job = {}) {
  const report = job?.output?.report && typeof job.output.report === 'object'
    ? job.output.report
    : null;
  if (report) {
    delete report.authority_request;
    delete report.authorityRequest;
    delete report.action_required;
    delete report.actionRequired;
    delete report.executor_request;
    delete report.executorRequest;
  }
  const existingExecutorState = job.executorState && typeof job.executorState === 'object'
    ? job.executorState
    : null;
  if (existingExecutorState && Object.prototype.hasOwnProperty.call(existingExecutorState, 'authorityRequired')) {
    const nextExecutorState = { ...existingExecutorState };
    delete nextExecutorState.authorityRequired;
    if (Array.isArray(nextExecutorState.googleIncludeGroups) && !nextExecutorState.googleIncludeGroups.length) {
      delete nextExecutorState.googleIncludeGroups;
    }
    job.executorState = {
      ...nextExecutorState,
      updatedAt: nowIso()
    };
  }
}
