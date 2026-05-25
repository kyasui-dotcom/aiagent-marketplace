export const X_CLIENT_OPS_URL = 'https://x.niche-s.com/';

export const CORE_FEATURE_APP_IDS = Object.freeze(new Set(['delivery-manager']));

export const BUILT_IN_APP_MANIFESTS = Object.freeze([
  {
    id: 'analytics-console',
    name: 'Analytics Console',
    kind: 'application_agent',
    description: 'Old-GA-style acquisition, search query, landing page, conversion, country, channel, and post-run measurement console for CAIt leaders.',
    baseUrl: '/analytics-console.html',
    entryUrl: '/analytics-console.html',
    capabilities: ['analytics_context', 'search_console_packet', 'ga4_packet', 'post_run_measurement'],
    requiredConnectors: ['google'],
    requiresApprovalFor: [],
    inputContract: {
      schemaVersion: 'cait-app-context/v1',
      accepts: ['metrics', 'search_queries', 'landing_pages', 'conversion_paths', 'channel_breakdown'],
      returns: ['facts', 'metrics', 'artifacts', 'recommended_next_actions']
    },
    contextContract: {
      sourceApps: ['analytics_console'],
      connectorProviders: ['google'],
      connectorServices: ['ga4', 'gsc', 'search_console', 'analytics'],
      evidence: {
        loadedFlags: ['googleReportLoaded'],
        loadedArtifactTypes: ['google_report_status'],
        summaryFields: ['googleGa4Property', 'googleSearchConsoleSite']
      }
    },
    tags: ['analytics', 'seo', 'growth'],
    directCommandAliases: ['analytics', 'ga4', 'google analytics', 'search console', 'google search console', 'analytics console', 'アナリティクス', 'サーチコンソール'],
    owner: 'cait-managed',
    status: 'active',
    verificationStatus: 'cait_managed',
    mcp: { enabled: true, serverUrl: '/mcp', tools: ['cait.list_apps'], resources: ['cait://apps'] },
    reusePrompt: 'Open Analytics Console, review analytics evidence, then send the context to CAIt for the matching leader or data specialist.'
  },
  {
    id: 'publisher-approval-studio',
    name: 'Publisher & Approval Studio',
    kind: 'application_agent',
    description: 'Content, page, metadata, media-separated publish packets, directory submission, PR draft, and approval queue studio for external action handoffs.',
    baseUrl: '/publisher-approval.html',
    entryUrl: '/publisher-approval.html',
    contextIngestUrl: '/api/publisher/context-ingest',
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
    tags: ['publisher', 'approval', 'seo'],
    directCommandAliases: ['publisher', 'approval studio', 'publisher approval', 'publish app', 'approval app', '公開', '承認'],
    owner: 'cait-managed',
    status: 'active',
    verificationStatus: 'cait_managed',
    mcp: { enabled: true, serverUrl: '/mcp', tools: ['cait.list_apps'], resources: ['cait://apps'] },
    reusePrompt: 'Open Publisher & Approval Studio to edit, approve, or block the next external content/action packet before execution.'
  },
  {
    id: 'lead-ops-console',
    name: 'Lead Ops Console',
    kind: 'application_agent',
    description: 'Lead rows, public source evidence, statuses, owners, next actions, and email draft management before approval.',
    baseUrl: '/lead-ops.html',
    entryUrl: '/lead-ops.html',
    capabilities: ['lead_management', 'email_draft', 'crm_packet', 'outreach_review'],
    requiredConnectors: ['google'],
    requiresApprovalFor: ['email_send', 'crm_write', 'external_send'],
    inputContract: {
      schemaVersion: 'cait-app-context/v1',
      accepts: ['lead_rows', 'evidence_urls', 'email_drafts', 'next_actions'],
      returns: ['artifacts', 'approval_requests', 'recommended_next_actions']
    },
    tags: ['crm', 'lead', 'email'],
    directCommandAliases: ['lead ops', 'lead console', 'crm', 'leads', 'email drafts', 'リード', '営業リスト'],
    owner: 'cait-managed',
    status: 'active',
    verificationStatus: 'cait_managed',
    mcp: { enabled: true, serverUrl: '/mcp', tools: ['cait.list_apps'], resources: ['cait://apps'] },
    reusePrompt: 'Open Lead Ops Console to review lead rows and email drafts, then send a lead packet back to CAIt.'
  },
  {
    id: 'campaign-operations',
    name: 'Campaign Operations',
    kind: 'application_agent',
    description: 'Campaign state, Publisher queues, connector readiness, planned actions, waiting conditions, and measurement loops for stable CAIt campaign runs.',
    baseUrl: '/campaign-operations.html',
    entryUrl: '/campaign-operations.html',
    capabilities: ['campaign_state', 'publisher_queue', 'connector_readiness', 'planned_action_queue', 'measurement_loop', 'next_action_owner'],
    requiredConnectors: [],
    requiresApprovalFor: ['publish_change', 'email_send', 'ads_launch', 'external_send'],
    inputContract: {
      schemaVersion: 'cait-app-context/v1',
      accepts: ['campaign_state', 'campaign_operations_plan', 'delivery_files', 'publisher_queue', 'approval_backlog', 'connector_readiness', 'planned_action_queue', 'now_week_0_1', 'next_week_1_3', 'waiting_conditions', 'measurement_loop', 'next_action_owner'],
      returns: ['artifacts', 'metrics', 'recommended_next_actions']
    },
    contextContract: {
      sourceApps: ['campaign_operations'],
      evidence: {
        loadedArtifactTypes: ['campaign_state', 'campaign_operations_plan', 'publisher_queue', 'connector_readiness', 'planned_action_queue', 'measurement_loop', 'next_action_owner'],
        summaryFields: ['campaign_id', 'campaign_counts']
      }
    },
    tags: ['campaigns', 'operations', 'measurement'],
    directCommandAliases: ['campaign operations', 'campaign ops', 'campaign state', 'marketing operations', 'campaign run', 'キャンペーン運用'],
    owner: 'cait-managed',
    status: 'active',
    verificationStatus: 'cait_managed',
    mcp: { enabled: true, serverUrl: '/mcp', tools: ['cait.list_apps'], resources: ['cait://apps'] },
    reusePrompt: 'Open Campaign Operations to inspect retained campaign state, queues, SaaS readiness, waiting conditions, and measurement loops.'
  },
  {
    id: 'x-client-ops',
    name: 'X Client Ops',
    kind: 'application_agent',
    description: 'X post drafting, strategy context transfer, and approval-ready posting queue for CAIt action handoffs.',
    baseUrl: X_CLIENT_OPS_URL,
    entryUrl: X_CLIENT_OPS_URL,
    capabilities: ['x_post_draft', 'x_post_queue', 'social_action'],
    requiredConnectors: ['x'],
    requiresApprovalFor: ['post_now', 'send_external'],
    inputContract: {
      schemaVersion: 'cait-app-agent-transfer/v1',
      accepts: ['post_text', 'strategy', 'agent_context', 'delivery_summary', 'settings'],
      constraints: {
        text: { minLength: 1, maxLength: 280 }
      },
      settingsKeys: ['brandName', 'serviceLine', 'targetClient', 'defaultCta', 'destinationLink', 'serviceUrl', 'workspaceNotes', 'outputLanguage'],
      requiredApprovalFor: ['post_now'],
      returns: ['approval_requests', 'artifacts']
    },
    handoff: {
      actionKind: 'x_post_handoff',
      createUrl: `${X_CLIENT_OPS_URL.replace(/\/+$/, '')}/api/cait/handoff`,
      method: 'POST',
      openUrlParam: 'cait_handoff',
      dedicatedDelivery: {
        artifactTypes: ['post_text', 'strategy', 'delivery_summary', 'social_copy_packet', 'social_post_pack', 'x_post_packet'],
        preparedTextSource: 'social_post_text',
        requiresPreparedText: true,
        suppressGenericCard: true
      }
    },
    tags: ['social', 'x', 'posting'],
    directCommandAliases: ['x ops', 'x client', 'x posting', 'twitter', 'tweet', 'x post', 'x投稿', 'ツイート'],
    owner: 'cait-managed',
    status: 'active',
    verificationStatus: 'cait_managed',
    mcp: { enabled: true, serverUrl: '/mcp', tools: ['cait.list_apps'], resources: ['cait://apps'] },
    reusePrompt: 'Create an X post, reflect the strategy, and prepare the final handoff to X Client Ops.'
  }
]);
