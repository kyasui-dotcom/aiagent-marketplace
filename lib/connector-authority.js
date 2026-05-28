function normalizeString(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function normalizeAgentProfileList(value, fallback = []) {
  const raw = Array.isArray(value)
    ? value
    : (typeof value === 'string' ? value.split(/[,\n]/) : fallback);
  return [...new Set((raw || [])
    .map((item) => normalizeString(item).toLowerCase().replace(/[\s-]+/g, '_'))
    .filter(Boolean))];
}

const CONNECTOR_CAPABILITY_ALIASES = new Map([
  ['github.read_repo', 'github.read_repo'],
  ['read_repo', 'github.read_repo'],
  ['github.read_private_repo', 'github.read_private_repo'],
  ['read_private_repo', 'github.read_private_repo'],
  ['github.write_pr', 'github.write_pr'],
  ['write_pr', 'github.write_pr'],
  ['create_pull_request', 'github.write_pr'],
  ['github.create_pull_request', 'github.write_pr'],
  ['github.write_repo', 'github.write_repo'],
  ['write_repo', 'github.write_repo'],
  ['google.read_drive', 'google.read_drive'],
  ['read_drive', 'google.read_drive'],
  ['google.read_docs', 'google.read_docs'],
  ['read_docs', 'google.read_docs'],
  ['google.read_sheets', 'google.read_sheets'],
  ['read_sheets', 'google.read_sheets'],
  ['google.read_presentations', 'google.read_presentations'],
  ['read_presentations', 'google.read_presentations'],
  ['google.read_gmail', 'google.read_gmail'],
  ['read_gmail', 'google.read_gmail'],
  ['google.send_gmail', 'google.send_gmail'],
  ['send_gmail', 'google.send_gmail'],
  ['gmail.send', 'google.send_gmail'],
  ['email.send', 'google.send_gmail'],
  ['email_delivery.send', 'google.send_gmail'],
  ['google.read_calendar', 'google.read_calendar'],
  ['read_calendar', 'google.read_calendar'],
  ['google.write_calendar', 'google.write_calendar'],
  ['write_calendar', 'google.write_calendar'],
  ['calendar.write', 'google.write_calendar'],
  ['google.create_meet', 'google.create_meet'],
  ['create_meet', 'google.create_meet'],
  ['google_meet.create', 'google.create_meet'],
  ['zoom.schedule_meeting', 'zoom.schedule_meeting'],
  ['schedule_zoom', 'zoom.schedule_meeting'],
  ['zoom.create_meeting', 'zoom.schedule_meeting'],
  ['microsoft.create_teams_meeting', 'microsoft.create_teams_meeting'],
  ['teams.create_meeting', 'microsoft.create_teams_meeting'],
  ['microsoft_teams.create_meeting', 'microsoft.create_teams_meeting'],
  ['google.read_gsc', 'google.read_gsc'],
  ['read_gsc', 'google.read_gsc'],
  ['google.read_ga4', 'google.read_ga4'],
  ['read_ga4', 'google.read_ga4'],
  ['x.post', 'x.post'],
  ['post_tweet', 'x.post'],
  ['x.schedule_post', 'x.schedule_post'],
  ['schedule_post', 'x.schedule_post'],
  ['x.read_profile', 'x.read_profile'],
  ['read_profile', 'x.read_profile'],
  ['stripe.manage_billing', 'stripe.manage_billing'],
  ['manage_billing', 'stripe.manage_billing'],
  ['stripe.read_customer', 'stripe.read_customer'],
  ['read_customer', 'stripe.read_customer']
]);

const CONNECTOR_ACTION_LABELS = Object.freeze({
  connect_x: 'CONNECT X',
  connect_google: 'CONNECT GOOGLE',
  connect_github: 'CONNECT GITHUB'
});

function normalizeConnectorCapability(value = '') {
  const key = normalizeString(value).toLowerCase().replace(/[\s-]+/g, '_');
  if (!key) return '';
  return CONNECTOR_CAPABILITY_ALIASES.get(key) || key;
}

export function connectorActionLabel(action = '', fallback = '') {
  const normalized = normalizeString(action).toLowerCase();
  if (!normalized) return String(fallback || '');
  return String(CONNECTOR_ACTION_LABELS[normalized] || fallback || '');
}

export function connectorOAuthActionInstruction(action = '', fallback = '') {
  const normalized = normalizeString(action).toLowerCase();
  const label = connectorActionLabel(normalized);
  if (!label) return String(fallback || '');
  if (normalized === 'connect_x') return `Open ${label} and approve X OAuth.`;
  if (normalized === 'connect_google') return `Open ${label} and approve Google OAuth.`;
  if (normalized === 'connect_github') return `Open ${label} and approve GitHub OAuth.`;
  return String(fallback || `Open ${label}.`);
}

function connectorKeyForCapability(value = '') {
  const capability = normalizeConnectorCapability(value);
  const [provider] = capability.split('.');
  return normalizeConnectorKey(provider);
}

function normalizeConnectorCapabilityList(value, fallback = []) {
  const raw = Array.isArray(value)
    ? value
    : (typeof value === 'string' ? value.split(/[,\n]/) : fallback);
  return [...new Set((raw || []).map(normalizeConnectorCapability).filter(Boolean))];
}

function defaultConnectorCapabilitiesForProviders(connectors = []) {
  const output = new Set();
  for (const connector of connectors.map(normalizeConnectorKey)) {
    if (connector === 'github') output.add('github.read_repo');
    if (connector === 'google') output.add('google.read_drive');
    if (connector === 'x') output.add('x.post');
    if (connector === 'stripe') output.add('stripe.manage_billing');
    if (connector === 'zoom') output.add('zoom.schedule_meeting');
    if (connector === 'microsoft') output.add('microsoft.create_teams_meeting');
  }
  return [...output];
}

export function defaultGoogleSourceGroupsForCapabilities(capabilities = []) {
  const output = new Set();
  const values = Array.isArray(capabilities) ? capabilities : [capabilities];
  for (const value of values) {
    const capability = String(value || '').trim().toLowerCase();
    if (!capability) continue;
    if (capability === 'google.read_gsc') output.add('gsc');
    if (capability === 'google.read_ga4') output.add('ga4');
    if (['google.read_drive', 'google.read_docs', 'google.read_sheets', 'google.read_presentations'].includes(capability)) output.add('drive');
    if (capability === 'google.read_calendar') output.add('calendar');
    if (capability === 'google.write_calendar') output.add('calendar');
    if (capability === 'google.create_meet') output.add('calendar');
    if (capability === 'google.read_gmail') output.add('gmail');
    if (capability === 'google.send_gmail') output.add('gmail');
  }
  return [...output];
}

function agentManifestForProfile(agent = {}) {
  return agent?.metadata?.manifest && typeof agent.metadata.manifest === 'object' ? agent.metadata.manifest : {};
}

function normalizeConnectorKey(value = '') {
  const text = normalizeString(value).toLowerCase().replace(/[\s-]+/g, '_');
  if (!text) return '';
  if (['github', 'github_app', 'github_oauth', 'repo', 'repository', 'pull_request', 'pr'].includes(text)) return 'github';
  if (['google', 'google_oauth', 'google_drive', 'drive', 'gmail', 'docs', 'sheets', 'calendar', 'google_calendar', 'google_meet', 'meet'].includes(text)) return 'google';
  if (['zoom', 'zoom_oauth', 'zoom_meeting'].includes(text)) return 'zoom';
  if (['microsoft', 'microsoft_oauth', 'microsoft_teams', 'teams', 'teams_meeting', 'office365', 'office_365'].includes(text)) return 'microsoft';
  if (['x', 'x_oauth', 'twitter', 'twitter_oauth', 'tweet', 'tweets', 'x_post', 'social_x'].includes(text)) return 'x';
  if (['stripe', 'payment', 'payments', 'billing', 'checkout', 'card'].includes(text)) return 'stripe';
  if (['slack', 'discord', 'notion', 'linear', 'jira', 'vercel', 'cloudflare'].includes(text)) return text;
  return text;
}

export function agentExecutionProfileFromRecord(agent = {}) {
  const manifest = agentManifestForProfile(agent);
  const metadata = agent?.metadata && typeof agent.metadata === 'object' ? agent.metadata : {};
  const connectors = normalizeAgentProfileList(
    manifest.required_connectors
    || manifest.requiredConnectors
    || manifest.connectors
    || metadata.required_connectors
    || metadata.requiredConnectors
    || metadata.connectors,
    []
  ).map(normalizeConnectorKey).filter(Boolean);
  const requiredConnectorCapabilities = normalizeConnectorCapabilityList(
    manifest.required_connector_capabilities
    || manifest.requiredConnectorCapabilities
    || metadata.required_connector_capabilities
    || metadata.requiredConnectorCapabilities
    || metadata.connector_capabilities_required_for_execution
    || metadata.connectorCapabilitiesRequiredForExecution,
    defaultConnectorCapabilitiesForProviders(connectors)
  );
  const requiredGoogleSources = normalizeAgentProfileList(
    manifest.required_google_sources
    || manifest.requiredGoogleSources
    || metadata.required_google_sources
    || metadata.requiredGoogleSources,
    defaultGoogleSourceGroupsForCapabilities(requiredConnectorCapabilities)
  );
  return {
    executionPattern: normalizeString(manifest.execution_pattern || manifest.executionPattern || metadata.execution_pattern || metadata.executionPattern, 'async').toLowerCase().replace(/[\s-]+/g, '_'),
    inputTypes: normalizeAgentProfileList(manifest.input_types || manifest.inputTypes || metadata.input_types || metadata.inputTypes, ['text']),
    outputTypes: normalizeAgentProfileList(manifest.output_types || manifest.outputTypes || metadata.output_types || metadata.outputTypes, ['report', 'file']),
    clarification: normalizeString(manifest.clarification || manifest.clarification_mode || manifest.clarificationMode || metadata.clarification, 'optional_clarification').toLowerCase().replace(/[\s-]+/g, '_'),
    scheduleSupport: Boolean(manifest.schedule_support ?? manifest.scheduleSupport ?? metadata.schedule_support ?? metadata.scheduleSupport),
    requiredConnectors: [...new Set(connectors)],
    requiredConnectorCapabilities,
    requiredGoogleSources,
    riskLevel: normalizeString(manifest.risk_level || manifest.riskLevel || metadata.risk_level || metadata.riskLevel, 'safe').toLowerCase().replace(/[\s-]+/g, '_'),
    confirmationRequiredFor: normalizeAgentProfileList(manifest.confirmation_required_for || manifest.confirmationRequiredFor || metadata.confirmation_required_for || metadata.confirmationRequiredFor, []),
    capabilities: normalizeAgentProfileList(manifest.capabilities || metadata.capabilities, agent?.taskTypes || [])
  };
}

export function orderInputTypesFromBody(body = {}) {
  const input = body?.input && typeof body.input === 'object' ? body.input : {};
  const text = normalizeString(body?.prompt || body?.goal);
  const types = new Set();
  if (text) types.add('text');
  const urls = Array.isArray(input.urls) ? input.urls : [];
  const files = Array.isArray(input.files) ? input.files : [];
  if (urls.length || /https?:\/\//i.test(text)) types.add('url');
  if (files.length) types.add('file');
  if (normalizeString(input.repo || input.repository || input.github_repo || input.githubRepo) || /\b(github|repo|repository|pull request|pr)\b/i.test(text)) types.add('repo');
  if (input.payload || input.api_payload || /\b(api|webhook|json payload)\b/i.test(text)) types.add('api_payload');
  if (input.connector || input.oauth || /\b(oauth|gmail|google drive|google calendar|google meet|zoom|teams|microsoft teams|slack|discord|notion|linear|jira)\b/i.test(text)) types.add('oauth_resource');
  if (!types.size) types.add('text');
  return [...types];
}

export function agentPatternFitScore(agent = {}, context = {}) {
  const profile = agentExecutionProfileFromRecord(agent);
  const inputTypes = orderInputTypesFromBody(context.body || context);
  const requestedExecution = normalizeString(context.executionPattern || context.execution_pattern);
  const scheduled = Boolean(context.scheduled || context.recurring);
  let score = 0;
  for (const inputType of inputTypes) {
    if (profile.inputTypes.includes(inputType)) score += 0.04;
  }
  if (scheduled) {
    if (profile.scheduleSupport || ['scheduled', 'monitoring'].includes(profile.executionPattern)) score += 0.08;
    else score -= 0.04;
  }
  if (requestedExecution && requestedExecution === profile.executionPattern) score += 0.05;
  if (profile.clarification === 'required_intake' || profile.clarification === 'multi_turn') score += 0.02;
  if (profile.riskLevel === 'restricted') score -= 1;
  if (profile.riskLevel === 'confirm_required') score -= 0.02;
  return +score.toFixed(3);
}

export function connectorReadinessForOrder(current = {}, account = null) {
  const stripe = account?.stripe && typeof account.stripe === 'object' ? account.stripe : {};
  const githubConnector = account?.connectors?.github && typeof account.connectors.github === 'object' ? account.connectors.github : {};
  const googleConnector = account?.connectors?.google && typeof account.connectors.google === 'object' ? account.connectors.google : {};
  const xConnector = account?.connectors?.x && typeof account.connectors.x === 'object' ? account.connectors.x : {};
  return {
    github: Boolean(current?.githubAuthorized || current?.githubLinked || current?.authProvider === 'github-app' || current?.authProvider === 'github-oauth' || (githubConnector.connected && (githubConnector.accessTokenEnc || githubConnector.login))),
    google: Boolean(current?.googleAuthorized || current?.googleLinked || current?.authProvider === 'google-oauth' || (googleConnector.connected && (googleConnector.accessTokenEnc || googleConnector.email))),
    x: Boolean(current?.xAuthorized || current?.xLinked || (xConnector.connected && xConnector.accessTokenEnc)),
    stripe: Boolean(stripe.customerId || stripe.customerStatus === 'ready' || stripe.defaultPaymentMethodId),
    slack: false,
    discord: false,
    notion: false,
    linear: false,
    jira: false,
    zoom: false,
    microsoft: false,
    vercel: false,
    cloudflare: false
  };
}

function connectorScopeSet(value = '') {
  return new Set(String(value || '').split(/\s+/).map((part) => normalizeString(part).toLowerCase()).filter(Boolean));
}

function googleConnectorCapabilityStatus(current = {}, account = null) {
  const googleConnector = account?.connectors?.google && typeof account.connectors.google === 'object' ? account.connectors.google : {};
  const scopes = connectorScopeSet([
    googleConnector.scopes,
    current?.googleScopes,
    current?.session?.googleScopes
  ].filter(Boolean).join(' '));
  const providerReady = Boolean(
    current?.googleAuthorized
    || current?.googleLinked
    || current?.authProvider === 'google-oauth'
    || (googleConnector.connected && (googleConnector.accessTokenEnc || googleConnector.email))
  );
  const hasAny = (...required) => required.some((scope) => scopes.has(String(scope || '').toLowerCase()));
  return {
    providerReady,
    'google.read_drive': providerReady && hasAny(
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/drive.metadata.readonly'
    ),
    'google.read_docs': providerReady && hasAny(
      'https://www.googleapis.com/auth/documents.readonly',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive'
    ),
    'google.read_sheets': providerReady && hasAny(
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive'
    ),
    'google.read_presentations': providerReady && hasAny(
      'https://www.googleapis.com/auth/presentations.readonly',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive'
    ),
    'google.read_gmail': providerReady && hasAny(
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://mail.google.com/'
    ),
    'google.send_gmail': providerReady && hasAny(
      'https://www.googleapis.com/auth/gmail.send',
      'https://mail.google.com/'
    ),
    'google.read_calendar': providerReady && hasAny(
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar'
    ),
    'google.write_calendar': providerReady && hasAny(
      'https://www.googleapis.com/auth/calendar'
    ),
    'google.create_meet': providerReady && hasAny(
      'https://www.googleapis.com/auth/calendar'
    ),
    'google.read_gsc': providerReady && hasAny(
      'https://www.googleapis.com/auth/webmasters.readonly',
      'https://www.googleapis.com/auth/webmasters'
    ),
    'google.read_ga4': providerReady && hasAny(
      'https://www.googleapis.com/auth/analytics.readonly',
      'https://www.googleapis.com/auth/analytics'
    )
  };
}

function loadedGoogleReportArtifact(context = {}) {
  const artifacts = Array.isArray(context?.artifacts) ? context.artifacts : [];
  const statusArtifact = artifacts.find((artifact) => normalizeString(artifact?.type).toLowerCase() === 'google_report_status');
  const rows = Array.isArray(statusArtifact?.rows) ? statusArtifact.rows : [];
  return rows.some((row) => row?.loaded === true || normalizeString(row?.loaded).toLowerCase() === 'true');
}

function analyticsContextGoogleSources(context = {}, raw = {}) {
  const sources = raw?.googleReportSources && typeof raw.googleReportSources === 'object' ? raw.googleReportSources : {};
  const artifacts = Array.isArray(context?.artifacts) ? context.artifacts : [];
  const sourceRows = artifacts
    .filter((artifact) => normalizeString(artifact?.type).toLowerCase() === 'google_sources')
    .flatMap((artifact) => Array.isArray(artifact?.rows) ? artifact.rows : []);
  const hasArtifactSource = (pattern) => sourceRows.some((row) => pattern.test(normalizeString(row?.source || row?.type || row?.label).toLowerCase()) && normalizeString(row?.value || row?.id || row?.site));
  return {
    ga4: sources.ga4 === true || normalizeString(sources.ga4).toLowerCase() === 'true' || Boolean(normalizeString(raw?.googleGa4Property)) || hasArtifactSource(/\bga4\b|analytics/),
    gsc: sources.gsc === true || normalizeString(sources.gsc).toLowerCase() === 'true' || Boolean(normalizeString(raw?.googleSearchConsoleSite)) || hasArtifactSource(/search[_\s-]?console|\bgsc\b/)
  };
}

function analyticsContextHasLoadedEvidence(context = {}, raw = {}) {
  return raw?.googleReportLoaded === true
    || normalizeString(raw?.googleReportLoaded).toLowerCase() === 'true'
    || loadedGoogleReportArtifact(context);
}

function googleReadCapabilitiesSatisfiedByOrderContext(body = {}) {
  const capabilities = new Set();
  const seen = new Set();
  const visit = (value, depth = 0) => {
    if (value == null || depth > 6) return;
    if (Array.isArray(value)) {
      for (const item of value) visit(item, depth + 1);
      return;
    }
    if (typeof value !== 'object') return;
    if (seen.has(value)) return;
    seen.add(value);

    const context = value?.context && typeof value.context === 'object' ? value.context : value;
    const raw = context?.raw_context && typeof context.raw_context === 'object'
      ? context.raw_context
      : (value?.raw_context && typeof value.raw_context === 'object' ? value.raw_context : {});
    const sourceApp = normalizeString(context?.source_app || context?.sourceApp || value?.app_id || value?.appId).toLowerCase();
    const provider = normalizeString(raw?.connector_provider || raw?.provider).toLowerCase();
    const connectorType = normalizeString(raw?.connector_type || raw?.connectorType).toLowerCase();
    const services = Array.isArray(raw?.connector_services) ? raw.connector_services.map((item) => normalizeString(item).toLowerCase()) : [];
    const looksLikeAnalyticsContext = sourceApp === 'analytics_console'
      || provider === 'google'
      || /analytics_console|google_analytics|search_console|ga4|\bgsc\b/.test(connectorType)
      || services.some((item) => /ga4|search_console|\bgsc\b/.test(item))
      || Boolean(raw?.googleGa4Property || raw?.googleSearchConsoleSite || raw?.googleReportLoaded);
    if (looksLikeAnalyticsContext && analyticsContextHasLoadedEvidence(context, raw)) {
      const sources = analyticsContextGoogleSources(context, raw);
      if (sources.ga4) capabilities.add('google.read_ga4');
      if (sources.gsc) capabilities.add('google.read_gsc');
    }

    visit(value?.app_context, depth + 1);
    visit(value?.appContext, depth + 1);
    visit(value?.connector_context, depth + 1);
    visit(value?.connectorContext, depth + 1);
    visit(value?.appContexts, depth + 1);
    visit(value?.connectorContexts, depth + 1);
  };

  visit(body?.input?._broker?.appContexts);
  visit(body?.input?._broker?.connectorContexts);
  visit(body?.input?._broker?.appContext);
  visit(body?.input?._broker?.connectorContext);
  visit(body?.input?.appContexts);
  visit(body?.input?.connectorContexts);
  visit(body?.appContexts);
  visit(body?.connectorContexts);
  visit(body?.app_context);
  visit(body?.appContext);
  return capabilities;
}

export function connectorAuthorityForOrder(current = {}, account = null) {
  const providers = connectorReadinessForOrder(current, account);
  const stripe = account?.stripe && typeof account.stripe === 'object' ? account.stripe : {};
  const googleCapabilities = googleConnectorCapabilityStatus(current, account);
  const capabilities = {
    'github.read_repo': providers.github,
    'github.read_private_repo': providers.github,
    'github.write_pr': providers.github,
    'github.write_repo': providers.github,
    'google.read_drive': googleCapabilities['google.read_drive'],
    'google.read_docs': googleCapabilities['google.read_docs'],
    'google.read_sheets': googleCapabilities['google.read_sheets'],
    'google.read_presentations': googleCapabilities['google.read_presentations'],
    'google.read_gmail': googleCapabilities['google.read_gmail'],
    'google.read_calendar': googleCapabilities['google.read_calendar'],
    'google.write_calendar': googleCapabilities['google.write_calendar'],
    'google.create_meet': googleCapabilities['google.create_meet'],
    'google.read_gsc': googleCapabilities['google.read_gsc'],
    'google.read_ga4': googleCapabilities['google.read_ga4'],
    'zoom.schedule_meeting': providers.zoom,
    'microsoft.create_teams_meeting': providers.microsoft,
    'x.read_profile': providers.x,
    'x.post': providers.x,
    'x.schedule_post': providers.x,
    'stripe.read_customer': providers.stripe,
    'stripe.manage_billing': providers.stripe,
    'stripe.payouts': Boolean(stripe.payoutsEnabled)
  };
  return {
    providers,
    capabilities,
    connectedProviders: Object.keys(providers).filter((key) => providers[key])
  };
}

export function orderPreflightForAgent(agent = {}, current = {}, account = null, body = {}, options = {}) {
  const profile = agentExecutionProfileFromRecord(agent);
  if (profile.riskLevel === 'restricted') {
    return {
      ok: false,
      code: 'agent_restricted',
      statusCode: 403,
      error: 'This agent is restricted and cannot receive orders.',
      agent_id: agent?.id || '',
      risk_level: profile.riskLevel
    };
  }

  const authority = connectorAuthorityForOrder(current, account);
  const contextGrantedCapabilities = googleReadCapabilitiesSatisfiedByOrderContext(body);
  const connectorStatus = authority.providers;
  const promptText = normalizeString(body?.prompt || '', '');
  const taskType = normalizeString(options.taskType || body?.task_type || body?.taskType || '', '').toLowerCase();
  if (['x_post', 'x_ops', 'twitter', 'tweet', 'x'].includes(taskType) && !authority.capabilities['x.post']) {
    return {
      ok: false,
      code: 'connector_required',
      statusCode: 409,
      error: 'X connection and post approval are required before X/Twitter posting can run.',
      needs_connector: true,
      authority_status: 'action_required',
      agent_id: agent?.id || '',
      agent_name: agent?.name || '',
      missing_connectors: ['x'],
      required_connector_capabilities: ['x.post'],
      granted_connector_capabilities: authority.capabilities['x.post'] ? ['x.post'] : [],
      missing_connector_capabilities: authority.capabilities['x.post'] ? [] : ['x.post'],
      connector_status: connectorStatus,
      required_connectors: ['x']
    };
  }
  const repoBackedCodeIntent = ['code', 'debug', 'ops', 'automation'].includes(taskType)
    && /(\b(?:github|git hub|repo|repository|pull request|pr|branch|commit|diff)\b|リポジトリ|プルリク|ブランチ|コミット|差分)/i.test(promptText);
  if (repoBackedCodeIntent && (!authority.providers.github || !authority.capabilities['github.write_pr'])) {
    return {
      ok: false,
      code: 'connector_required',
      statusCode: 409,
      error: 'GitHub connection is required before repo-backed coding can run.',
      needs_connector: true,
      authority_status: 'action_required',
      agent_id: agent?.id || '',
      agent_name: agent?.name || '',
      missing_connectors: ['github'],
      required_connector_capabilities: ['github.write_pr'],
      granted_connector_capabilities: authority.capabilities['github.write_pr'] ? ['github.write_pr'] : [],
      missing_connector_capabilities: authority.capabilities['github.write_pr'] ? [] : ['github.write_pr'],
      connector_status: connectorStatus,
      required_connectors: ['github']
    };
  }
  const missingConnectors = profile.requiredConnectors
    .map(normalizeConnectorKey)
    .filter((connector) => connector && Object.prototype.hasOwnProperty.call(connectorStatus, connector) && !connectorStatus[connector]);
  const requiredConnectorCapabilities = profile.requiredConnectorCapabilities.map(normalizeConnectorCapability).filter(Boolean);
  const hasConnectorCapability = (capability) => Boolean(authority.capabilities[capability] || contextGrantedCapabilities.has(capability));
  const grantedConnectorCapabilities = requiredConnectorCapabilities.filter(hasConnectorCapability);
  const contextGrantedConnectorCapabilities = requiredConnectorCapabilities.filter((capability) => contextGrantedCapabilities.has(capability) && !authority.capabilities[capability]);
  const missingConnectorCapabilities = requiredConnectorCapabilities.filter((capability) => !hasConnectorCapability(capability));
  const missingProvidersFromCapabilities = missingConnectorCapabilities
    .map(connectorKeyForCapability)
    .filter((connector) => connector && Object.prototype.hasOwnProperty.call(connectorStatus, connector) && !connectorStatus[connector]);
  const allMissingConnectors = [...new Set([...missingConnectors, ...missingProvidersFromCapabilities])];
  if (allMissingConnectors.length || missingConnectorCapabilities.length) {
    return {
      ok: false,
      code: 'connector_required',
      statusCode: 409,
      error: 'Connector setup is required before this agent can run.',
      needs_connector: true,
      authority_status: grantedConnectorCapabilities.length ? 'partially_ready' : 'action_required',
      agent_id: agent?.id || '',
      agent_name: agent?.name || '',
      missing_connectors: allMissingConnectors,
      required_connector_capabilities: requiredConnectorCapabilities,
      granted_connector_capabilities: grantedConnectorCapabilities,
      context_granted_connector_capabilities: contextGrantedConnectorCapabilities,
      missing_connector_capabilities: missingConnectorCapabilities,
      connector_status: connectorStatus,
      required_connectors: profile.requiredConnectors
    };
  }

  const confirmationRequired = profile.riskLevel === 'confirm_required' || profile.confirmationRequiredFor.length > 0;
  const confirmation = body?.confirmation && typeof body.confirmation === 'object' ? body.confirmation : {};
  const accepted = confirmation.accepted === true
    && (!confirmation.agent_id || normalizeString(confirmation.agent_id) === normalizeString(agent?.id))
    && (!confirmation.prompt_hash || normalizeString(confirmation.prompt_hash) === normalizeString(options.promptHash));
  if (confirmationRequired && !accepted) {
    return {
      ok: false,
      code: 'confirmation_required',
      statusCode: 428,
      error: 'Explicit confirmation is required before this agent can run.',
      needs_confirmation: true,
      agent_id: agent?.id || '',
      agent_name: agent?.name || '',
      risk_level: profile.riskLevel,
      confirmation_required_for: profile.confirmationRequiredFor
    };
  }

  if (options.scheduled && !(profile.scheduleSupport || ['scheduled', 'monitoring'].includes(profile.executionPattern))) {
    return {
      ok: true,
      warning: 'Agent does not declare scheduled work support.',
      code: 'schedule_support_not_declared',
      agent_id: agent?.id || ''
    };
  }

  return {
    ok: true,
    agent_id: agent?.id || '',
    profile,
    authority_status: 'ready',
    connector_status: connectorStatus,
    connector_capability_status: authority.capabilities,
    granted_connector_capabilities: grantedConnectorCapabilities,
    context_granted_connector_capabilities: contextGrantedConnectorCapabilities,
    required_connector_capabilities: requiredConnectorCapabilities
  };
}
