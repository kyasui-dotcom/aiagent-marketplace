export const APP_MANIFEST_SCHEMA_VERSION = 'app-manifest/v1';

const DEFAULT_X_CLIENT_OPS_URL = 'https://x.niche-s.com/';
const DEFAULT_CAIt_APP_BASE_URL = 'https://aiagent-marketplace.net';
const DEFAULT_PUBLISHER_CONTEXT_INGEST_URL = '/api/publisher/context-ingest';
const DEFAULT_X_CLIENT_OPS_DEDICATED_DELIVERY = Object.freeze({
  artifactTypes: ['post_text', 'strategy', 'delivery_summary', 'social_copy_packet', 'social_post_pack', 'x_post_packet'],
  preparedTextSource: 'social_post_text',
  requiresPreparedText: true,
  suppressGenericCard: true
});
const DEFAULT_ANALYTICS_DIRECT_COMMAND_ALIASES = Object.freeze(['analytics', 'ga4', 'google analytics', 'search console', 'google search console', 'analytics console', 'アナリティクス', 'サーチコンソール']);
const DEFAULT_PUBLISHER_DIRECT_COMMAND_ALIASES = Object.freeze(['publisher', 'approval studio', 'publisher approval', 'publish app', 'approval app', '公開', '承認']);
const DEFAULT_LEAD_OPS_DIRECT_COMMAND_ALIASES = Object.freeze(['lead ops', 'lead console', 'crm', 'leads', 'email drafts', 'リード', '営業リスト']);
const DEFAULT_CAMPAIGN_OPERATIONS_DIRECT_COMMAND_ALIASES = Object.freeze(['campaign operations', 'campaign ops', 'campaign state', 'marketing operations', 'campaign run', 'キャンペーン運用']);
const DEFAULT_X_CLIENT_OPS_DIRECT_COMMAND_ALIASES = Object.freeze(['x ops', 'x client', 'x posting', 'twitter', 'tweet', 'x post', 'x投稿', 'ツイート']);
const DEFAULT_CAIt_MCP = Object.freeze({
  enabled: false,
  serverUrl: `${DEFAULT_CAIt_APP_BASE_URL}/mcp`,
  transport: 'streamable_http',
  auth: 'none',
  tools: ['cait.list_apps', 'cait.list_agents'],
  resources: ['cait://apps', 'cait://agents']
});
const ALLOWED_APP_KINDS = new Set([
  'app',
  'application',
  'application_agent',
  'tool_app',
  'connector_app',
  'workflow_app'
]);
const ALLOWED_APP_VISIBILITY = new Set(['public', 'private', 'unlisted']);
const ALLOWED_APP_STATUS = new Set(['active', 'pending_review', 'verification_failed', 'deprecated']);
export const CORE_FEATURE_APP_IDS = Object.freeze(['delivery-manager']);

export function isCoreFeatureAppId(value = '') {
  return CORE_FEATURE_APP_IDS.includes(String(value ?? '').trim().toLowerCase());
}

export const DEFAULT_APP_SEEDS = Object.freeze([
  {
    id: 'analytics-console',
    name: 'Analytics Console',
    kind: 'application_agent',
    description: 'Old-GA-style acquisition, search query, landing page, conversion, country, channel, and post-run measurement console for CAIt leaders.',
    baseUrl: DEFAULT_CAIt_APP_BASE_URL,
    entryUrl: `${DEFAULT_CAIt_APP_BASE_URL}/analytics-console.html`,
    capabilities: ['analytics_context', 'search_console_packet', 'ga4_packet', 'post_run_measurement'],
    requiredConnectors: ['google'],
    requiresApprovalFor: [],
    inputContract: {
      schemaVersion: 'cait-app-context/v1',
      accepts: ['analytics_context', 'search_console_packet', 'ga4_packet', 'metrics', 'search_queries', 'landing_pages', 'conversion_paths', 'channel_breakdown'],
      returns: ['facts', 'metrics', 'artifacts', 'recommended_next_actions']
    },
    mcp: { ...DEFAULT_CAIt_MCP },
    owner: 'cait-managed',
    visibility: 'public',
    status: 'active',
    verificationStatus: 'cait_managed',
    tags: ['analytics', 'seo', 'growth'],
    directCommandAliases: [...DEFAULT_ANALYTICS_DIRECT_COMMAND_ALIASES],
    metadata: {
      caitManaged: true,
      source: 'default-app-seed',
      manifest: {
        schema_version: APP_MANIFEST_SCHEMA_VERSION,
        kind: 'application_agent',
        name: 'Analytics Console',
        description: 'Acquisition, search, conversion, and post-run measurement context app for CAIt leaders.',
        entry_url: `${DEFAULT_CAIt_APP_BASE_URL}/analytics-console.html`,
        capabilities: ['analytics_context', 'search_console_packet', 'ga4_packet', 'post_run_measurement'],
        required_connectors: ['google'],
        direct_command_aliases: [...DEFAULT_ANALYTICS_DIRECT_COMMAND_ALIASES],
        mcp: { ...DEFAULT_CAIt_MCP }
      }
    },
    createdAt: nowIso(),
    updatedAt: nowIso()
  },
  {
    id: 'publisher-approval-studio',
    name: 'Publisher & Approval Studio',
    kind: 'application_agent',
    description: 'Content, page, metadata, media-separated publish packets, directory submission, PR draft, and approval queue studio for external action handoffs.',
    baseUrl: DEFAULT_CAIt_APP_BASE_URL,
    entryUrl: `${DEFAULT_CAIt_APP_BASE_URL}/publisher-approval.html`,
    contextIngestUrl: DEFAULT_PUBLISHER_CONTEXT_INGEST_URL,
    capabilities: ['content_management', 'approval_queue', 'directory_submission_packet', 'publisher_change_set', 'community_post_packet', 'social_copy_packet', 'x_post_packet', 'reddit_post_packet', 'indie_hackers_packet', 'instagram_post_packet', 'site_publish_packet', 'wordpress_draft_packet'],
    requiredConnectors: [],
    requiresApprovalFor: ['publish_change', 'directory_submit', 'github_pr', 'wordpress_draft', 'x_post', 'reddit_post', 'indie_hackers_post', 'instagram_post', 'external_send'],
    inputContract: {
      schemaVersion: 'cait-app-context/v1',
      accepts: ['article_draft', 'seo_article', 'seo_page_artifact', 'landing_page', 'landing_page_change', 'site_publish_packet', 'wordpress_draft', 'wordpress_draft_packet', 'directory_submission', 'directory_packet', 'community_post_packet', 'social_copy_packet', 'social_post', 'x_post', 'x_post_packet', 'reddit_post', 'reddit_post_packet', 'indie_hackers_post', 'indie_hackers_packet', 'instagram_post', 'instagram_post_packet', 'approval_request'],
      destinationConnectors: {
        owned_site: { connector: 'publisher', capability: 'site_publish_packet', method: 'publisher_review_or_selected_connector' },
        github_pr: { connector: 'github', capability: 'github.write_pr', method: 'github_pr' },
        wordpress_site: { connector: 'wordpress', capability: 'wordpress.create_draft', method: 'wordpress_application_password' },
        directory: { connector: 'directory_app', capability: 'directory.submit', method: 'saas_or_manual_submit' },
        x: { connector: 'x', capability: 'x.post', method: 'x_oauth_or_x_saas' },
        reddit: { connector: 'reddit', capability: 'reddit.post', method: 'reddit_oauth_or_manual_copy' },
        indie_hackers: { connector: 'indie_hackers', capability: 'indie_hackers.post', method: 'indie_hackers_connector_or_manual_copy' },
        instagram: { connector: 'instagram', capability: 'instagram.post', method: 'instagram_connector_or_manual_copy' },
        social: { connector: 'manual', capability: 'manual.copy', method: 'manual_social_copy' }
      },
      returns: ['approval_requests', 'artifacts', 'delivery_files', 'recommended_next_actions']
    },
    mcp: { ...DEFAULT_CAIt_MCP },
    owner: 'cait-managed',
    visibility: 'public',
    status: 'active',
    verificationStatus: 'cait_managed',
    tags: ['publisher', 'approval', 'seo'],
    directCommandAliases: [...DEFAULT_PUBLISHER_DIRECT_COMMAND_ALIASES],
    metadata: {
      caitManaged: true,
      source: 'default-app-seed',
      manifest: {
        schema_version: APP_MANIFEST_SCHEMA_VERSION,
        kind: 'application_agent',
        name: 'Publisher & Approval Studio',
        description: 'Content editing, media-separated approval queue, directory packet, social packet, and PR-ready change-set app.',
        entry_url: `${DEFAULT_CAIt_APP_BASE_URL}/publisher-approval.html`,
        context_ingest_url: DEFAULT_PUBLISHER_CONTEXT_INGEST_URL,
        capabilities: ['content_management', 'approval_queue', 'directory_submission_packet', 'publisher_change_set', 'community_post_packet', 'social_copy_packet', 'x_post_packet', 'reddit_post_packet', 'indie_hackers_packet', 'instagram_post_packet', 'site_publish_packet', 'wordpress_draft_packet'],
        required_connectors: [],
        direct_command_aliases: [...DEFAULT_PUBLISHER_DIRECT_COMMAND_ALIASES],
        destination_connectors: {
          owned_site: { connector: 'publisher', capability: 'site_publish_packet', method: 'publisher_review_or_selected_connector' },
          github_pr: { connector: 'github', capability: 'github.write_pr', method: 'github_pr' },
          wordpress_site: { connector: 'wordpress', capability: 'wordpress.create_draft', method: 'wordpress_application_password' },
          directory: { connector: 'directory_app', capability: 'directory.submit', method: 'saas_or_manual_submit' },
          x: { connector: 'x', capability: 'x.post', method: 'x_oauth_or_x_saas' },
          reddit: { connector: 'reddit', capability: 'reddit.post', method: 'reddit_oauth_or_manual_copy' },
          indie_hackers: { connector: 'indie_hackers', capability: 'indie_hackers.post', method: 'indie_hackers_connector_or_manual_copy' },
          instagram: { connector: 'instagram', capability: 'instagram.post', method: 'instagram_connector_or_manual_copy' },
          social: { connector: 'manual', capability: 'manual.copy', method: 'manual_social_copy' }
        },
        mcp: { ...DEFAULT_CAIt_MCP }
      }
    },
    createdAt: nowIso(),
    updatedAt: nowIso()
  },
  {
    id: 'lead-ops-console',
    name: 'Lead Ops Console',
    kind: 'application_agent',
    description: 'Lead rows, public source evidence, statuses, owners, next actions, and email draft management before approval.',
    baseUrl: DEFAULT_CAIt_APP_BASE_URL,
    entryUrl: `${DEFAULT_CAIt_APP_BASE_URL}/lead-ops.html`,
    capabilities: ['lead_management', 'lead_ops_packet', 'email_draft', 'crm_packet', 'outreach_review'],
    requiredConnectors: ['google'],
    requiresApprovalFor: ['email_send', 'crm_write', 'external_send'],
    inputContract: {
      schemaVersion: 'cait-app-context/v1',
      accepts: ['lead_acquisition_request', 'lead_ops_packet', 'lead_packet', 'crm_packet', 'lead_rows', 'evidence_urls', 'email_draft', 'email_drafts', 'next_actions', 'outreach_plan'],
      returns: ['artifacts', 'approval_requests', 'recommended_next_actions']
    },
    mcp: { ...DEFAULT_CAIt_MCP },
    owner: 'cait-managed',
    visibility: 'public',
    status: 'active',
    verificationStatus: 'cait_managed',
    tags: ['crm', 'lead', 'email'],
    directCommandAliases: [...DEFAULT_LEAD_OPS_DIRECT_COMMAND_ALIASES],
    metadata: {
      caitManaged: true,
      source: 'default-app-seed',
      manifest: {
        schema_version: APP_MANIFEST_SCHEMA_VERSION,
        kind: 'application_agent',
        name: 'Lead Ops Console',
        description: 'Lead and email draft review console that returns CRM and outreach packets to CAIt.',
        entry_url: `${DEFAULT_CAIt_APP_BASE_URL}/lead-ops.html`,
        capabilities: ['lead_management', 'lead_ops_packet', 'email_draft', 'crm_packet', 'outreach_review'],
        required_connectors: ['google'],
        direct_command_aliases: [...DEFAULT_LEAD_OPS_DIRECT_COMMAND_ALIASES],
        mcp: { ...DEFAULT_CAIt_MCP }
      }
    },
    createdAt: nowIso(),
    updatedAt: nowIso()
  },
  {
    id: 'campaign-operations',
    name: 'Campaign Operations',
    kind: 'application_agent',
    description: 'Campaign state, Publisher queues, connector readiness, planned actions, waiting conditions, and measurement loops for stable CAIt campaign runs.',
    baseUrl: DEFAULT_CAIt_APP_BASE_URL,
    entryUrl: `${DEFAULT_CAIt_APP_BASE_URL}/campaign-operations.html`,
    capabilities: ['campaign_state', 'publisher_queue', 'connector_readiness', 'planned_action_queue', 'measurement_loop', 'next_action_owner'],
    requiredConnectors: [],
    requiresApprovalFor: ['publish_change', 'email_send', 'ads_launch', 'external_send'],
    inputContract: {
      schemaVersion: 'cait-app-context/v1',
      accepts: ['campaign_state', 'campaign_operations_plan', 'delivery_files', 'publisher_queue', 'approval_backlog', 'connector_readiness', 'planned_action_queue', 'now_week_0_1', 'next_week_1_3', 'waiting_conditions', 'measurement_loop', 'next_action_owner'],
      returns: ['artifacts', 'metrics', 'recommended_next_actions']
    },
    mcp: { ...DEFAULT_CAIt_MCP },
    owner: 'cait-managed',
    visibility: 'public',
    status: 'active',
    verificationStatus: 'cait_managed',
    tags: ['campaigns', 'operations', 'measurement'],
    directCommandAliases: [...DEFAULT_CAMPAIGN_OPERATIONS_DIRECT_COMMAND_ALIASES],
    metadata: {
      caitManaged: true,
      source: 'default-app-seed',
      manifest: {
        schema_version: APP_MANIFEST_SCHEMA_VERSION,
        kind: 'application_agent',
        name: 'Campaign Operations',
        description: 'Campaign operations console that preserves state, queues, readiness, waiting conditions, and measurement loops for CAIt leaders.',
        entry_url: `${DEFAULT_CAIt_APP_BASE_URL}/campaign-operations.html`,
        capabilities: ['campaign_state', 'publisher_queue', 'connector_readiness', 'planned_action_queue', 'measurement_loop', 'next_action_owner'],
        required_connectors: [],
        direct_command_aliases: [...DEFAULT_CAMPAIGN_OPERATIONS_DIRECT_COMMAND_ALIASES],
        mcp: { ...DEFAULT_CAIt_MCP }
      }
    },
    createdAt: nowIso(),
    updatedAt: nowIso()
  },
  {
    id: 'x-client-ops',
    name: 'X Client Ops',
    kind: 'application_agent',
    description: 'X post drafting, strategy context transfer, and approval-ready posting queue for CAIt action handoffs.',
    baseUrl: DEFAULT_X_CLIENT_OPS_URL,
    entryUrl: DEFAULT_X_CLIENT_OPS_URL,
    capabilities: ['x_post_draft', 'x_post_queue', 'social_action'],
    requiredConnectors: ['x'],
    requiresApprovalFor: ['post_now', 'send_external'],
    inputContract: {
      schemaVersion: 'cait-app-agent-transfer/v1',
      accepts: ['post_text', 'strategy', 'agent_context', 'delivery_summary', 'settings'],
      constraints: {
        text: { minLength: 1, maxLength: 280 }
      },
      settingsKeys: [
        'brandName',
        'serviceLine',
        'targetClient',
        'defaultCta',
        'destinationLink',
        'serviceUrl',
        'workspaceNotes',
        'outputLanguage'
      ],
      requiredApprovalFor: ['post_now'],
      returns: ['approval_requests', 'artifacts']
    },
    handoff: {
      actionKind: 'x_post_handoff',
      createUrl: `${DEFAULT_X_CLIENT_OPS_URL.replace(/\/+$/, '')}/api/cait/handoff`,
      method: 'POST',
      openUrlParam: 'cait_handoff',
      dedicatedDelivery: DEFAULT_X_CLIENT_OPS_DEDICATED_DELIVERY
    },
    mcp: { ...DEFAULT_CAIt_MCP },
    owner: 'cait-managed',
    visibility: 'public',
    status: 'active',
    verificationStatus: 'cait_managed',
    tags: ['social', 'x', 'posting'],
    directCommandAliases: [...DEFAULT_X_CLIENT_OPS_DIRECT_COMMAND_ALIASES],
    metadata: {
      caitManaged: true,
      source: 'default-app-seed',
      manifest: {
        schema_version: APP_MANIFEST_SCHEMA_VERSION,
        kind: 'application_agent',
        name: 'X Client Ops',
        description: 'X post drafting, strategy context transfer, and approval-ready posting queue for CAIt action handoffs.',
        entry_url: DEFAULT_X_CLIENT_OPS_URL,
        capabilities: ['x_post_draft', 'x_post_queue', 'social_action'],
        required_connectors: ['x'],
        direct_command_aliases: [...DEFAULT_X_CLIENT_OPS_DIRECT_COMMAND_ALIASES],
        input_contract: {
          schemaVersion: 'cait-app-agent-transfer/v1',
          accepts: ['post_text', 'strategy', 'agent_context', 'delivery_summary', 'settings'],
          constraints: {
            text: { minLength: 1, maxLength: 280 }
          },
          settingsKeys: [
            'brandName',
            'serviceLine',
            'targetClient',
            'defaultCta',
            'destinationLink',
            'serviceUrl',
            'workspaceNotes',
            'outputLanguage'
          ],
          requiredApprovalFor: ['post_now'],
          returns: ['approval_requests', 'artifacts']
        },
        handoff: {
          actionKind: 'x_post_handoff',
          createUrl: `${DEFAULT_X_CLIENT_OPS_URL.replace(/\/+$/, '')}/api/cait/handoff`,
          method: 'POST',
          openUrlParam: 'cait_handoff',
          dedicatedDelivery: DEFAULT_X_CLIENT_OPS_DEDICATED_DELIVERY
        },
        mcp: { ...DEFAULT_CAIt_MCP }
      }
    },
    createdAt: nowIso(),
    updatedAt: nowIso()
  }
]);

function nowIso() {
  return new Date().toISOString();
}

function usableTimestamp(value = '') {
  const ms = Date.parse(String(value || ''));
  return Number.isFinite(ms) && ms > Date.parse('2020-01-01T00:00:00.000Z');
}

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function safeString(value = '', max = 500) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function stringList(value, max = 24) {
  const raw = Array.isArray(value)
    ? value
    : String(value || '').split(/[,\n]/);
  return [...new Set(raw
    .map((item) => safeString(item, 120))
    .filter(Boolean))]
    .slice(0, max);
}

function objectValue(value, fallback = {}) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback;
}

function redactSecretFields(value, depth = 0) {
  if (value == null || depth > 6) return value;
  if (Array.isArray(value)) return value.map((item) => redactSecretFields(item, depth + 1));
  if (typeof value !== 'object') return value;
  const redacted = {};
  for (const [key, item] of Object.entries(value)) {
    if (/token|secret|password|private[_-]?key|api[_-]?key|bearer/i.test(key)) {
      redacted[key] = item ? '[redacted]' : item;
      continue;
    }
    redacted[key] = redactSecretFields(item, depth + 1);
  }
  return redacted;
}

function slugify(value = '') {
  return safeString(value, 120)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function appIdFromName(name = '') {
  const slug = slugify(name) || 'application';
  return `app_${slug}`;
}

function urlString(value = '') {
  const text = String(value || '').trim();
  if (!text) return '';
  try {
    const parsed = new URL(text);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

function isPrivateNetworkHostname(hostname = '') {
  const host = String(hostname || '').trim().toLowerCase();
  if (!host) return false;
  if (host === 'localhost' || host === '::1' || host.endsWith('.localhost')) return true;
  if (/^127\./.test(host) || /^10\./.test(host) || /^0\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  const private172 = host.match(/^172\.(\d+)\./);
  if (private172) {
    const second = Number(private172[1]);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

function validateUrl(value = '', label = 'url', errors = [], options = {}) {
  const text = String(value || '').trim();
  if (!text) return;
  let parsed;
  try {
    parsed = new URL(text);
  } catch {
    errors.push(`${label} must be a valid URL`);
    return;
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) errors.push(`${label} must use http or https`);
  if (isPrivateNetworkHostname(parsed.hostname) && options.allowLocalEndpoints !== true) {
    errors.push(`${label} cannot use a private or local hostname unless local endpoints are allowed`);
  }
}

function normalizeHandoff(raw = {}, source = {}) {
  const handoff = objectValue(raw, {});
  const endpoints = objectValue(source.endpoints, {});
  const createUrl = urlString(
    handoff.create_url
    || handoff.createUrl
    || handoff.url
    || endpoints.handoff
    || endpoints.transfer
    || source.handoff_url
    || source.handoffUrl
  );
  const method = safeString(handoff.method || 'POST', 12).toUpperCase() || 'POST';
  const openUrlParam = safeString(handoff.open_url_param || handoff.openUrlParam || handoff.param || 'cait_handoff', 80) || 'cait_handoff';
  const normalized = {
    ...(Object.keys(handoff).length ? clone(handoff) : {}),
    createUrl,
    method,
    openUrlParam
  };
  if (!createUrl) delete normalized.createUrl;
  return normalized;
}

function normalizeMcp(raw = {}, source = {}) {
  const mcp = objectValue(raw, {});
  const endpoints = objectValue(source.endpoints, {});
  const serverUrl = urlString(
    mcp.server_url
    || mcp.serverUrl
    || mcp.url
    || endpoints.mcp
    || source.mcp_server_url
    || source.mcpServerUrl
  );
  const tools = stringList(mcp.tools || mcp.tool_names || mcp.toolNames || source.mcp_tools || source.mcpTools || [], 40);
  const resources = stringList(mcp.resources || source.mcp_resources || source.mcpResources || [], 40);
  const scopes = stringList(mcp.scopes || mcp.required_scopes || mcp.requiredScopes || [], 24);
  const explicitlyDisabled = mcp.enabled === false || source.mcp_enabled === false || source.mcpEnabled === false;
  const enabled = explicitlyDisabled ? false : Boolean(serverUrl || tools.length || resources.length || mcp.enabled === true || source.mcp_enabled === true || source.mcpEnabled === true);
  const normalized = {
    ...(Object.keys(mcp).length ? clone(mcp) : {}),
    enabled,
    serverUrl,
    tools,
    resources,
    scopes,
    transport: safeString(mcp.transport || source.mcp_transport || source.mcpTransport || (serverUrl ? 'streamable_http' : ''), 80),
    auth: safeString(mcp.auth || mcp.auth_type || mcp.authType || source.mcp_auth || '', 80)
  };
  if (!serverUrl) delete normalized.serverUrl;
  if (!tools.length) delete normalized.tools;
  if (!resources.length) delete normalized.resources;
  if (!scopes.length) delete normalized.scopes;
  if (!normalized.transport) delete normalized.transport;
  if (!normalized.auth) delete normalized.auth;
  return normalized;
}

export function normalizeAppManifest(raw = {}, options = {}) {
  const source = raw?.manifest && typeof raw.manifest === 'object' ? raw.manifest : raw;
  const metadata = objectValue(source.metadata, {});
  const endpoints = objectValue(source.endpoints, {});
  const schemaVersion = safeString(source.schema_version || source.schemaVersion || APP_MANIFEST_SCHEMA_VERSION, 80) || APP_MANIFEST_SCHEMA_VERSION;
  const kindInput = safeString(source.kind || source.app_kind || source.appKind || 'application', 80).toLowerCase();
  const kind = ALLOWED_APP_KINDS.has(kindInput) ? kindInput : 'application';
  const name = safeString(source.name || source.app_name || source.appName || source.title || 'application', 120);
  const baseUrl = urlString(source.base_url || source.baseUrl || source.homepage || source.url || endpoints.base || endpoints.homepage);
  const entryUrl = urlString(
    source.entry_url
    || source.entryUrl
    || source.launch_url
    || source.launchUrl
    || source.open_url
    || source.openUrl
    || endpoints.entry
    || endpoints.launch
    || endpoints.open
    || baseUrl
  );
  const healthcheckUrl = urlString(
    source.healthcheck_url
    || source.healthcheckUrl
    || source.health_url
    || source.healthUrl
    || endpoints.health
    || endpoints.healthcheck
  );
  const visibilityInput = safeString(source.visibility || metadata.visibility || 'public', 40).toLowerCase();
  const statusInput = safeString(source.status || metadata.status || 'active', 40).toLowerCase();
  const owner = safeString(source.owner || metadata.owner || options.owner || '', 120);
  const tags = stringList(source.tags || source.categories || metadata.tags || [], 24);
  const handoff = normalizeHandoff(source.handoff || source.transfer || {}, source);
  const mcp = normalizeMcp(source.mcp || source.mcp_server || source.mcpServer || {}, source);
  const contextIngestUrl = safeString(source.context_ingest_url || source.contextIngestUrl || source.context_url || source.contextUrl || metadata.contextIngestUrl || '', 500);
  const directCommandAliases = stringList(source.direct_command_aliases || source.directCommandAliases || source.command_aliases || source.commandAliases || metadata.directCommandAliases || [], 24);
  const dedicatedDelivery = clone(objectValue(source.dedicated_delivery || source.dedicatedDelivery || metadata.dedicatedDelivery || {}, {}));
  return {
    id: safeString(source.id || source.app_id || source.appId || metadata.id || appIdFromName(name), 120),
    schemaVersion,
    kind,
    name,
    description: safeString(source.description || source.summary || 'Registered CAIt app.', 1000),
    baseUrl,
    entryUrl,
    healthcheckUrl,
    capabilities: stringList(source.capabilities || source.actions || metadata.capabilities || [], 40),
    requiredConnectors: stringList(source.required_connectors || source.requiredConnectors || source.connectors || metadata.requiredConnectors || [], 24),
    requiresApprovalFor: stringList(source.requires_approval_for || source.requiresApprovalFor || source.confirmation_required_for || source.confirmationRequiredFor || [], 24),
    inputContract: clone(objectValue(source.input_contract || source.inputContract || source.usage_contract || source.usageContract, {})),
    contextIngestUrl,
    directCommandAliases,
    dedicatedDelivery,
    handoff,
    mcp,
    tags,
    owner,
    visibility: ALLOWED_APP_VISIBILITY.has(visibilityInput) ? visibilityInput : 'public',
    status: ALLOWED_APP_STATUS.has(statusInput) ? statusInput : 'active',
    verificationStatus: safeString(source.verification_status || source.verificationStatus || metadata.verificationStatus || 'unverified', 80),
    manifestUrl: safeString(options.manifestUrl || source.manifest_url || source.manifestUrl || source.source_url || source.sourceUrl || '', 500),
    manifestSource: safeString(options.manifestSource || source.manifest_source || source.manifestSource || '', 500),
    metadata: clone(metadata),
    auth: clone(objectValue(source.auth, {})),
    raw: clone(source)
  };
}

export function validateAppManifest(manifest = {}, options = {}) {
  const errors = [];
  if (!safeString(manifest.name, 120)) errors.push('name required');
  if (!safeString(manifest.description, 1000)) errors.push('description required');
  if (!safeString(manifest.entryUrl, 500)) errors.push('entry_url required');
  if (isCoreFeatureAppId(manifest.id)) errors.push(`${manifest.id} is a core CAIt feature and cannot be registered as an app`);
  validateUrl(manifest.baseUrl, 'base_url', errors, options);
  validateUrl(manifest.entryUrl, 'entry_url', errors, options);
  validateUrl(manifest.healthcheckUrl, 'healthcheck_url', errors, options);
  validateUrl(manifest.handoff?.createUrl, 'handoff.create_url', errors, options);
  validateUrl(manifest.mcp?.serverUrl, 'mcp.server_url', errors, options);
  if (manifest.kind && !ALLOWED_APP_KINDS.has(String(manifest.kind).toLowerCase())) errors.push('kind is not a supported app kind');
  return { ok: errors.length === 0, errors };
}

export function createAppFromInput(body = {}, ownerInfo = { owner: '', metadata: {} }, options = {}) {
  const manifest = normalizeAppManifest({
    ...body,
    owner: body.owner || ownerInfo.owner || '',
    metadata: {
      ...(ownerInfo.metadata && typeof ownerInfo.metadata === 'object' ? ownerInfo.metadata : {}),
      ...(body.metadata && typeof body.metadata === 'object' ? body.metadata : {})
    }
  }, options);
  const now = nowIso();
  const ownerMetadata = redactSecretFields(ownerInfo.metadata && typeof ownerInfo.metadata === 'object' ? ownerInfo.metadata : {});
  const manifestMetadata = redactSecretFields(manifest.metadata && typeof manifest.metadata === 'object' ? manifest.metadata : {});
  const storageManifest = redactSecretFields(manifest.raw && typeof manifest.raw === 'object' ? manifest.raw : {});
  return {
    id: manifest.id || appIdFromName(manifest.name),
    name: manifest.name,
    kind: manifest.kind,
    description: manifest.description,
    baseUrl: manifest.baseUrl,
    entryUrl: manifest.entryUrl,
    healthcheckUrl: manifest.healthcheckUrl,
    capabilities: manifest.capabilities,
    requiredConnectors: manifest.requiredConnectors,
    requiresApprovalFor: manifest.requiresApprovalFor,
    inputContract: manifest.inputContract,
    contextIngestUrl: manifest.contextIngestUrl,
    directCommandAliases: manifest.directCommandAliases,
    dedicatedDelivery: manifest.dedicatedDelivery,
    handoff: manifest.handoff,
    mcp: manifest.mcp,
    tags: manifest.tags,
    owner: manifest.owner || ownerInfo.owner || 'samurai',
    visibility: manifest.visibility,
    status: manifest.status,
    verificationStatus: options.verificationStatus || manifest.verificationStatus || 'unverified',
    manifestUrl: options.manifestUrl || manifest.manifestUrl || '',
    manifestSource: options.manifestSource || manifest.manifestSource || '',
    metadata: {
      ...ownerMetadata,
      ...manifestMetadata,
      manifest: {
        ...storageManifest,
        schema_version: manifest.schemaVersion,
        kind: manifest.kind,
        name: manifest.name,
        description: manifest.description,
        base_url: manifest.baseUrl,
        entry_url: manifest.entryUrl,
        healthcheck_url: manifest.healthcheckUrl,
        capabilities: manifest.capabilities,
        required_connectors: manifest.requiredConnectors,
        requires_approval_for: manifest.requiresApprovalFor,
        input_contract: manifest.inputContract,
        context_ingest_url: manifest.contextIngestUrl,
        direct_command_aliases: manifest.directCommandAliases,
        dedicated_delivery: manifest.dedicatedDelivery,
        handoff: manifest.handoff,
        mcp: manifest.mcp,
        tags: manifest.tags
      }
    },
    createdAt: body.created_at || body.createdAt || now,
    updatedAt: now
  };
}

export function createAppFromManifest(manifest = {}, ownerInfo = { owner: '', metadata: {} }, options = {}) {
  return createAppFromInput({
    id: manifest.id,
    name: manifest.name,
    kind: manifest.kind,
    description: manifest.description,
    baseUrl: manifest.baseUrl,
    entryUrl: manifest.entryUrl,
    healthcheckUrl: manifest.healthcheckUrl,
    capabilities: manifest.capabilities,
    requiredConnectors: manifest.requiredConnectors,
    requiresApprovalFor: manifest.requiresApprovalFor,
    inputContract: manifest.inputContract,
    contextIngestUrl: manifest.contextIngestUrl,
    directCommandAliases: manifest.directCommandAliases,
    dedicatedDelivery: manifest.dedicatedDelivery,
    handoff: manifest.handoff,
    mcp: manifest.mcp,
    tags: manifest.tags,
    owner: manifest.owner || ownerInfo.owner,
    visibility: manifest.visibility,
    status: manifest.status,
    verificationStatus: options.verificationStatus || manifest.verificationStatus || 'manifest_loaded',
    manifestUrl: options.manifestUrl || manifest.manifestUrl || manifest.sourceUrl || '',
    manifestSource: options.manifestSource || manifest.manifestSource || 'manifest',
    metadata: {
      ...(manifest.metadata && typeof manifest.metadata === 'object' ? manifest.metadata : {}),
      importMode: options.importMode || 'manifest',
      sourceUrl: options.manifestUrl || manifest.manifestUrl || manifest.sourceUrl || ''
    }
  }, ownerInfo, {
    manifestUrl: options.manifestUrl || manifest.manifestUrl || manifest.sourceUrl || '',
    manifestSource: options.manifestSource || manifest.manifestSource || 'manifest',
    verificationStatus: options.verificationStatus || manifest.verificationStatus || 'manifest_loaded'
  });
}

export function appIsVisible(app = {}) {
  const metadata = app?.metadata && typeof app.metadata === 'object' ? app.metadata : {};
  return Boolean(
    app?.id
    && !isCoreFeatureAppId(app.id)
    && metadata.hidden_from_catalog !== true
    && !metadata.deleted_at
    && !metadata.deletedAt
    && String(app.status || '').toLowerCase() !== 'deprecated'
  );
}

export function mergeSystemApp(existing = {}, seed = {}) {
  const existingMetadata = existing?.metadata && typeof existing.metadata === 'object'
    ? { ...existing.metadata }
    : {};
  delete existingMetadata.hidden_from_catalog;
  delete existingMetadata.deleted_at;
  delete existingMetadata.deletedAt;
  delete existingMetadata.deleted_reason;
  delete existingMetadata.deletedReason;
  return {
    ...existing,
    ...clone(seed),
    createdAt: usableTimestamp(existing?.createdAt) ? existing.createdAt : (seed.createdAt || nowIso()),
    updatedAt: nowIso(),
    owner: seed.owner || existing?.owner || 'cait-managed',
    metadata: {
      ...existingMetadata,
      ...(seed?.metadata && typeof seed.metadata === 'object' ? seed.metadata : {}),
      manifest: clone(seed?.metadata?.manifest || existing?.metadata?.manifest || {})
    },
    status: seed.status || 'active',
    verificationStatus: seed.verificationStatus || existing?.verificationStatus || 'cait_managed',
    verificationCheckedAt: existing?.verificationCheckedAt || seed.verificationCheckedAt || nowIso(),
    verificationError: null,
    verificationDetails: clone(seed.verificationDetails || existing?.verificationDetails || null)
  };
}

export function sanitizeAppForPublic(app = {}) {
  if (!app) return null;
  if (isCoreFeatureAppId(app?.id)) return null;
  const cloned = clone(app);
  delete cloned.auth;
  delete cloned.token;
  delete cloned.secret;
  if (!usableTimestamp(cloned.createdAt)) cloned.createdAt = usableTimestamp(cloned.updatedAt) ? cloned.updatedAt : nowIso();
  if (cloned.metadata?.manifest?.auth) {
    cloned.metadata.manifest.auth = {
      type: cloned.metadata.manifest.auth.type || 'configured',
      redacted: true
    };
  }
  if (cloned.metadata?.auth) {
    cloned.metadata.auth = { configured: true, redacted: true };
  }
  return cloned;
}
