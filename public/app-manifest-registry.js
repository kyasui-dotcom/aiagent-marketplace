export const X_CLIENT_OPS_URL = 'https://x.niche-s.com/';

export const CORE_FEATURE_APP_IDS = Object.freeze(new Set(['delivery-manager']));

export const APP_STANDALONE_HIDDEN_APP_IDS = Object.freeze(new Set(['x-client-ops']));

export const APP_WORKSPACE_GROUPS = Object.freeze([
  {
    id: 'growth-publisher-workspace',
    name: 'Growth & Publisher Workspace',
    primaryId: 'growth-experiment-console',
    entryId: 'growth-experiment-console',
    memberIds: ['growth-experiment-console', 'publisher-approval-studio'],
    description: 'Retain Growth experiments, measurement guardrails, Publisher packets, social copy, and approval state in one launch workflow.',
    tags: ['growth', 'publisher', 'approval'],
    reusePrompt: 'Use the Growth & Publisher workspace to retain the experiment, prepare the publish packet, and review approvals before launch.'
  },
  {
    id: 'campaign-control-workspace',
    name: 'Campaign Control Workspace',
    primaryId: 'campaign-operations',
    entryId: 'campaign-operations',
    memberIds: ['campaign-operations', 'ads-launch-console', 'lead-ops-console'],
    description: 'Manage campaign state, paid launch gates, lead review, waiting conditions, owners, and measurement loops as one operations workspace.',
    tags: ['campaigns', 'ads', 'leads'],
    reusePrompt: 'Use the Campaign Control workspace to retain campaign state, lead or ads handoffs, owners, approvals, and measurement loops.'
  },
  {
    id: 'analytics-measurement-workspace',
    name: 'Analytics & Measurement Workspace',
    primaryId: 'analytics-console',
    entryId: 'analytics-console',
    memberIds: ['analytics-console'],
    description: 'Keep acquisition, search, landing page, conversion, and post-run evidence available before ordering the next agent task.',
    tags: ['analytics', 'seo', 'measurement'],
    reusePrompt: 'Use Analytics & Measurement to load evidence before asking the next agent for recommendations.'
  },
  {
    id: 'pricing-decision-workspace',
    name: 'Pricing Decision Workspace',
    primaryId: 'pricing-decision-console',
    entryId: 'pricing-decision-console',
    memberIds: ['pricing-decision-console'],
    description: 'Review pricing assumptions, scenarios, approval owner, proof tracker, decision trigger, and rollback rule before price changes.',
    tags: ['pricing', 'finance', 'approval'],
    reusePrompt: 'Use Pricing Decision to review pricing assumptions, approval state, proof, and rollback rules before a price change.'
  }
]);

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
      accepts: ['analytics_context', 'search_console_packet', 'ga4_packet', 'metrics', 'search_queries', 'landing_pages', 'conversion_paths', 'channel_breakdown'],
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
    mcp: { enabled: false, serverUrl: '/mcp', tools: ['cait.list_apps'], resources: ['cait://apps'], status: 'paused' },
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
    capabilities: ['content_management', 'approval_queue', 'directory_submission_packet', 'publisher_change_set', 'community_post_packet', 'social_copy_packet', 'x_post_packet', 'reddit_post_packet', 'indie_hackers_packet', 'instagram_post_packet', 'visual_asset_readiness_matrix', 'site_publish_packet', 'wordpress_draft_packet'],
    requiredConnectors: [],
    requiresApprovalFor: ['publish_change', 'directory_submit', 'github_pr', 'wordpress_draft', 'x_post', 'reddit_post', 'indie_hackers_post', 'instagram_post', 'external_send'],
    inputContract: {
      schemaVersion: 'cait-app-context/v1',
      accepts: ['article_draft', 'seo_article', 'seo_page_artifact', 'landing_page', 'landing_page_change', 'site_publish_packet', 'publisher_packet', 'publishing_packet', 'publish_packet', 'content_package', 'publisher_content_package', 'wordpress_draft', 'wordpress_draft_packet', 'directory_submission', 'directory_packet', 'community_post_packet', 'social_copy_packet', 'social_post', 'x_post', 'x_post_packet', 'reddit_post', 'reddit_post_packet', 'indie_hackers_post', 'indie_hackers_packet', 'instagram_post', 'instagram_post_packet', 'visual_asset_readiness_matrix', 'visual_asset_rights_status', 'visual_asset_gap', 'media_assets', 'approval_checklist', 'approval_request'],
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
    mcp: { enabled: false, serverUrl: '/mcp', tools: ['cait.list_apps'], resources: ['cait://apps'], status: 'paused' },
    reusePrompt: 'Open Publisher & Approval Studio to edit, approve, or block the next external content/action packet before execution.'
  },
  {
    id: 'lead-ops-console',
    name: 'Lead Ops Console',
    kind: 'application_agent',
    description: 'Lead rows, public source evidence, statuses, owners, next actions, and email draft management before approval.',
    baseUrl: '/lead-ops.html',
    entryUrl: '/lead-ops.html',
    capabilities: ['lead_management', 'lead_ops_packet', 'email_draft', 'crm_packet', 'outreach_review'],
    requiredConnectors: ['google'],
    requiresApprovalFor: ['email_send', 'crm_write', 'external_send'],
    inputContract: {
      schemaVersion: 'cait-app-context/v1',
      accepts: ['lead_acquisition_request', 'lead_ops_packet', 'lead_packet', 'crm_packet', 'lead_rows', 'evidence_urls', 'email_draft', 'email_drafts', 'next_actions', 'outreach_plan'],
      returns: ['artifacts', 'approval_requests', 'recommended_next_actions']
    },
    tags: ['crm', 'lead', 'email'],
    directCommandAliases: ['lead ops', 'lead console', 'crm', 'leads', 'email drafts', 'リード', '営業リスト'],
    owner: 'cait-managed',
    status: 'active',
    verificationStatus: 'cait_managed',
    mcp: { enabled: false, serverUrl: '/mcp', tools: ['cait.list_apps'], resources: ['cait://apps'], status: 'paused' },
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
    mcp: { enabled: false, serverUrl: '/mcp', tools: ['cait.list_apps'], resources: ['cait://apps'], status: 'paused' },
    reusePrompt: 'Open Campaign Operations to inspect retained campaign state, queues, SaaS readiness, waiting conditions, and measurement loops.'
  },
  {
    id: 'ads-launch-console',
    name: 'Ads Launch Console',
    kind: 'application_agent',
    description: 'Paid acquisition launch gate for Ads Planner output: budget caps, stop rules, creative drafts, Ads SaaS handoff fields, approvals, execution labels, and measurement checks before spend.',
    baseUrl: '/ads-ops.html',
    entryUrl: '/ads-ops.html',
    capabilities: ['ads_plan', 'budget_guardrails', 'pre_launch_measurement_blocker', 'stop_rules', 'creative_asset_packet', 'ads_saas_handoff', 'launch_approval_handoff', 'measurement_plan'],
    requiredConnectors: ['ads_saas'],
    requiresApprovalFor: ['ads_launch', 'budget_spend', 'bid_change', 'external_send'],
    inputContract: {
      schemaVersion: 'cait-app-context/v1',
      accepts: ['ads_plan', 'ads_plan_packet', 'paid_ads_plan', 'ad_plan', 'ad_campaign_plan', 'paid_acquisition_plan', 'delivery_files', 'campaign_structure', 'budget_cap_and_cpa_assumption', 'budget_guardrails', 'target_cpa_assumptions', 'pre_launch_measurement_blocker', 'measurement_blocker', 'measurement_blocker_packet', 'tracking_blocker', 'stop_rules', 'creative_asset_packet', 'approval_ready_ad_asset_packet', 'ad_asset_packet', 'creative_assets', 'ads_saas_handoff', 'ads_saas_handoff_packet', 'ads_saas_fields', 'approval_and_launch_boundary', 'approval_checklist', 'missing_execution_inputs', 'launch_approval_handoff', 'launch_approval_handoff_packet', 'execution_status_labels', 'measurement_plan', 'measurement_checks', 'conversion_tracking_plan'],
      returns: ['artifacts', 'approval_requests', 'metrics', 'recommended_next_actions']
    },
    contextContract: {
      sourceApps: ['ads_launch_console'],
      evidence: {
        loadedArtifactTypes: ['ads_plan', 'ads_saas_handoff', 'pre_launch_measurement_blocker', 'stop_rules', 'creative_asset_packet', 'execution_status_labels', 'measurement_plan'],
        summaryFields: ['ads_handoff_audit']
      }
    },
    tags: ['ads', 'paid-acquisition', 'approval'],
    directCommandAliases: ['ads ops', 'ads launch', 'ads console', 'ads planner handoff', 'google ads', 'meta ads', '広告運用', '広告出稿'],
    owner: 'cait-managed',
    status: 'active',
    verificationStatus: 'cait_managed',
    mcp: { enabled: false, serverUrl: '/mcp', tools: ['cait.list_apps'], resources: ['cait://apps'], status: 'paused' },
    reusePrompt: 'Open Ads Launch Console to review budget, stop rules, creative drafts, launch approval, Ads SaaS readiness, and measurement before any spend.'
  },
  {
    id: 'growth-experiment-console',
    name: 'Growth Experiment Console',
    kind: 'application_agent',
    description: 'Growth experiment console that retains no-paid growth plan, specialist handoff, bottleneck, ICP/offer, hypothesis, exact artifact packet, owner map, measurement surface, proof source, threshold, kill rule, review date, next decision, and status labels before launch.',
    baseUrl: '/growth-ops.html',
    entryUrl: '/growth-ops.html',
    capabilities: ['growth_experiment_packet', 'no_paid_growth_plan_packet', 'organic_specialist_handoff_packet', 'growth_asset_handoff_packet', 'growth_activation_handoff_packet', 'growth_publisher_handoff_packet', 'publisher_activation_packet', 'tracking_specification', 'metric_threshold', 'kill_rule', 'measurement_surface', 'proof_source', 'execution_proof_tracker', 'next_decision'],
    requiredConnectors: [],
    requiresApprovalFor: ['growth_activation', 'publish_change', 'external_send'],
    inputContract: {
      schemaVersion: 'cait-app-context/v1',
      accepts: ['growth_experiment_packet', 'no_paid_growth_plan_packet', 'organic_specialist_handoff_packet', 'growth_asset_handoff_packet', 'growth_activation_handoff_packet', 'growth_publisher_handoff_packet', 'growth_launch_packet', 'publisher_activation_packet', 'growth_to_publisher_packet', 'growth_packet', 'experiment_packet', 'bottleneck', 'icp_and_offer', 'experiment_hypothesis', 'exact_artifact_packet', 'page_or_channel_artifact', 'execution_packet', '7_day_experiment', 'seven_day_experiment', 'experiment_plan', 'tracking_specification', 'metric_threshold', 'success_criteria', 'kill_rule', 'stop_rules', 'activation_owner', 'approval_owner', 'owner_responsibility_map', 'measurement_owner', 'measurement_surface', 'proof_source', 'review_date', 'execution_proof_tracker', 'execution_status_labels', 'measurement_plan', 'next_decision', 'delivery_files'],
      returns: ['artifacts', 'approval_requests', 'metrics', 'recommended_next_actions']
    },
    contextContract: {
      sourceApps: ['growth_experiment_console'],
      evidence: {
        loadedArtifactTypes: ['growth_experiment_packet', 'no_paid_growth_plan_packet', 'organic_specialist_handoff_packet', 'growth_asset_handoff_packet', 'growth_activation_handoff_packet', 'growth_publisher_handoff_packet', 'publisher_activation_packet', 'tracking_specification', 'metric_threshold', 'kill_rule', 'measurement_surface', 'proof_source', 'execution_proof_tracker', 'next_decision'],
        summaryFields: ['growth_handoff_audit']
      }
    },
    tags: ['growth', 'experiments', 'measurement'],
    directCommandAliases: ['growth ops', 'growth experiment', 'growth console', 'growth sprint', 'experiment ops', 'activation handoff', 'グロース実験', '成長施策'],
    owner: 'cait-managed',
    status: 'active',
    verificationStatus: 'cait_managed',
    mcp: { enabled: false, serverUrl: '/mcp', tools: ['cait.list_apps'], resources: ['cait://apps'], status: 'paused' },
    reusePrompt: 'Open Growth Experiment Console to review the retained experiment, exact artifact, activation handoff, measurement owner, proof tracker, and kill rule before launching.'
  },
  {
    id: 'pricing-decision-console',
    name: 'Pricing Decision Console',
    kind: 'application_agent',
    description: 'Pricing and CFO decision console that retains value metrics, assumptions, source-to-model ledger, scenarios, approval owner, decision trigger, and rollback rules before price changes.',
    baseUrl: '/pricing-ops.html',
    entryUrl: '/pricing-ops.html',
    capabilities: ['pricing_decision_packet', 'cfo_decision_packet', 'value_metric', 'scenario_table', 'sensitivity_table', 'price_change_handoff', 'execution_proof_tracker'],
    requiredConnectors: [],
    requiresApprovalFor: ['price_change', 'billing_change', 'external_send'],
    inputContract: {
      schemaVersion: 'cait-app-context/v1',
      accepts: ['pricing_decision_packet', 'cfo_decision_packet', 'pricing_question', 'value_metric', 'assumptions', 'source_to_model_ledger', 'formula', 'scenario_table', 'sensitivity_table', 'recommendation', 'approval_owner', 'price_change_handoff', 'execution_proof_tracker', 'execution_status_labels', 'decision_trigger', 'rollback_or_continue_rule', 'delivery_files'],
      returns: ['artifacts', 'approval_requests', 'metrics', 'recommended_next_actions']
    },
    contextContract: {
      sourceApps: ['pricing_decision_console'],
      evidence: {
        loadedArtifactTypes: ['pricing_decision_packet', 'cfo_decision_packet', 'scenario_table', 'sensitivity_table', 'price_change_handoff', 'execution_proof_tracker'],
        summaryFields: ['pricing_handoff_audit']
      }
    },
    tags: ['pricing', 'finance', 'approval'],
    directCommandAliases: ['pricing ops', 'pricing decision', 'price change', 'cfo decision', 'unit economics', 'pricing console', '価格決定', '料金改定'],
    owner: 'cait-managed',
    status: 'active',
    verificationStatus: 'cait_managed',
    mcp: { enabled: false, serverUrl: '/mcp', tools: ['cait.list_apps'], resources: ['cait://apps'], status: 'paused' },
    reusePrompt: 'Open Pricing Decision Console to review value metric, assumptions, scenarios, approval owner, trigger, proof tracker, and rollback rule before any price change.'
  },
  {
    id: 'x-client-ops',
    name: 'X Client Ops',
    kind: 'application_agent',
    description: 'X post drafting, account/reply target retention, strategy context transfer, proof source, schedule window, and approval-ready posting queue for CAIt action handoffs.',
    baseUrl: X_CLIENT_OPS_URL,
    entryUrl: X_CLIENT_OPS_URL,
    capabilities: ['x_post_draft', 'x_post_queue', 'social_action', 'reply_target', 'posting_window', 'proof_source'],
    requiredConnectors: ['x'],
    requiresApprovalFor: ['post_now', 'send_external'],
    inputContract: {
      schemaVersion: 'cait-app-agent-transfer/v1',
      accepts: ['post_text', 'strategy', 'agent_context', 'delivery_summary', 'settings', 'x_post_packet', 'social_copy_packet', 'x_account', 'reply_target', 'thread_context', 'posting_window', 'approval_owner', 'proof_source', 'execution_status_labels'],
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
        artifactTypes: ['post_text', 'strategy', 'delivery_summary', 'social_copy_packet', 'social_post_pack', 'x_post_packet', 'reply_target', 'posting_window', 'proof_source'],
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
    mcp: { enabled: false, serverUrl: '/mcp', tools: ['cait.list_apps'], resources: ['cait://apps'], status: 'paused' },
    reusePrompt: 'Create an X post, reflect the strategy, and prepare the final handoff to X Client Ops.'
  }
]);
