import {
  deliveryAuthorityOwnerLabel,
  deliveryAuthoritySummary
} from './delivery-action-contract.js';

export function createClientDeliveryAuthorityController(deps = {}) {
  const {
    connectorStatusForClient,
    googleIncludeGroupsFromAuthorityRequest,
    normalizeClientConnector,
    normalizeClientConnectorCapabilityList,
    normalizeClientList,
    normalizeGoogleIncludeGroup,
    normalizeRepoFullName,
    persistGenericDeliverableDraft,
    state,
    updateGenericDeliverableDraft
  } = deps;

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

  return {
    authorityOwnerLabelForRun,
    authorityRequestFromReport,
    authorityRequestRequiresClientApproval,
    describeAuthorityNeed,
    genericDeliverableAuthorityState,
    genericDeliverableAuthoritySummary,
    setGenericDeliverableAuthorityRequired
  };
}
