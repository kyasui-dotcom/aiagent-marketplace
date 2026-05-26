export const CAIT_APP_CONTEXT_SCHEMA = 'cait-app-context/v1';
export const APP_CONTEXT_TTL_MS = 24 * 60 * 60 * 1000;

function uniqueStringList(items = []) {
  return [...new Set(items.map((item) => String(item || '').trim()).filter(Boolean))];
}

const APP_CONTEXT_RAW_CONTRACT_KEYS = Object.freeze(uniqueStringList([
  'metrics',
  'analytics_context',
  'search_console_packet',
  'ga4_packet',
  'analytics_metrics',
  'search_queries',
  'landing_pages',
  'channel_mix',
  'channel_breakdown',
  'channel_landing_pages',
  'channel_sources',
  'conversion_paths',
  'country_mix',
  'measurement_queue',
  'post_run_measurement',
  'google_sources',
  'google_report_status',
  'delivery_package',
  'delivery_packet',
  'delivery_artifacts',
  'delivery_files',
  'deliveryFiles',
  'files',
  'attachments',
  'output_files',
  'outputFiles',
  'result_files',
  'resultFiles',
  'deliverables',
  'post_text',
  'strategy',
  'agent_context',
  'delivery_summary',
  'settings',
  'lead_rows',
  'lead_acquisition_request',
  'lead_ops_packet',
  'crm_packet',
  'outreach_packet',
  'evidence_urls',
  'email_drafts',
  'email_draft',
  'next_actions',
  'outreach_plan',
  'campaign_state',
  'publisher_queue',
  'approval_backlog',
  'connector_readiness',
  'planned_action_queue',
  'now_week_0_1',
  'next_week_1_3',
  'waiting_conditions',
  'measurement_loop',
  'next_action_owner',
  'campaign_operations_plan',
  'ads_plan',
  'ads_plan_packet',
  'paid_ads_plan',
  'campaign_structure',
  'budget_cap_and_cpa_assumption',
  'budget_guardrails',
  'pre_launch_measurement_blocker',
  'stop_rules',
  'creative_asset_packet',
  'ads_saas_handoff',
  'ads_saas_handoff_packet',
  'approval_and_launch_boundary',
  'launch_approval_handoff',
  'execution_status_labels',
  'measurement_plan',
  'pricing_decision_packet',
  'cfo_decision_packet',
  'pricing_question',
  'value_metric',
  'assumptions',
  'source_to_model_ledger',
  'formula',
  'scenario_table',
  'sensitivity_table',
  'recommendation',
  'approval_owner',
  'price_change_handoff',
  'execution_proof_tracker',
  'decision_trigger',
  'rollback_or_continue_rule',
  'growth_experiment_packet',
  'no_paid_growth_plan_packet',
  'organic_specialist_handoff_packet',
  'growth_asset_handoff_packet',
  'growth_activation_handoff_packet',
  'bottleneck',
  'icp_and_offer',
  'experiment_hypothesis',
  'exact_artifact_packet',
  'page_or_channel_artifact',
  'execution_packet',
  'seven_day_experiment',
  'experiment_plan',
  'tracking_specification',
  'metric_threshold',
  'kill_rule',
  'activation_owner',
  'owner_responsibility_map',
  'measurement_owner',
  'measurement_surface',
  'proof_source',
  'review_date',
  'next_decision',
  'article_draft',
  'seo_article',
  'seo_page_artifact',
  'landing_page',
  'landing_page_change',
  'site_publish_packet',
  'publisher_packet',
  'publishing_packet',
  'publish_packet',
  'content_package',
  'publisher_content_package',
  'wordpress_draft',
  'wordpress_draft_packet',
  'directory_submission',
  'directory_packet',
  'community_post_packet',
  'social_copy_packet',
  'social_post',
  'x_post',
  'x_post_packet',
  'reddit_post',
  'reddit_post_packet',
  'indie_hackers_post',
  'indie_hackers_packet',
  'instagram_post',
  'instagram_post_packet',
  'approval_request'
]));
const APP_CONTEXT_RAW_CONTRACT_ALIASES = Object.freeze({
  analytics_context: ['analyticsContext', 'analytics_packet', 'analyticsPacket', 'analytics_payload', 'analyticsPayload'],
  search_console_packet: ['searchConsolePacket', 'gsc_packet', 'gscPacket', 'search_console_context', 'searchConsoleContext'],
  ga4_packet: ['ga4Packet', 'google_analytics_packet', 'googleAnalyticsPacket', 'ga4_context', 'ga4Context'],
  analytics_metrics: ['analyticsMetrics'],
  search_queries: ['searchQueries', 'queries', 'query_rows', 'queryRows', 'search_query_rows', 'searchQueryRows', 'searchConsoleRows', 'search_console_rows'],
  landing_pages: ['landingPages', 'pages', 'page_rows', 'pageRows', 'landing_page_rows', 'landingPageRows'],
  channel_mix: ['channelMix', 'channels', 'channel_rows', 'channelRows'],
  channel_breakdown: ['channelBreakdown', 'channel_breakdowns', 'channelBreakdowns', 'channels', 'channel_rows', 'channelRows'],
  channel_landing_pages: ['channelLandingPages', 'channel_pages', 'channelPages'],
  channel_sources: ['channelSources', 'source_medium_rows', 'sourceMediumRows', 'referral_sources', 'referralSources'],
  conversion_paths: ['conversionPaths', 'conversion_path', 'conversionPath', 'paths'],
  country_mix: ['countryMix', 'countries', 'country_rows', 'countryRows'],
  measurement_queue: ['measurementQueue', 'measurement', 'post_run_checks', 'postRunChecks'],
  post_run_measurement: ['postRunMeasurement', 'post_run_checks', 'postRunChecks', 'measurement'],
  google_sources: ['googleSources', 'sources'],
  google_report_status: ['googleReportStatus', 'report_status', 'reportStatus'],
  delivery_package: ['deliveryPackage', 'delivery_context', 'deliveryContext', 'delivery'],
  delivery_packet: ['deliveryPacket', 'delivery_payload', 'deliveryPayload'],
  delivery_artifacts: ['deliveryArtifacts', 'deliveryFiles', 'delivery_files', 'files', 'attachments', 'output_files', 'outputFiles', 'result_files', 'resultFiles', 'deliverables'],
  post_text: ['postText', 'approved_text', 'approvedText', 'exact_copy', 'exactCopy', 'tweet'],
  strategy: ['strategyContext', 'strategy_context'],
  agent_context: ['agentContext'],
  delivery_summary: ['deliverySummary'],
  settings: ['appSettings', 'app_settings'],
  lead_rows: ['leadRows'],
  lead_acquisition_request: ['leadAcquisitionRequest', 'lead_sourcing_request', 'leadSourcingRequest', 'lead_generation_request', 'leadGenerationRequest'],
  lead_ops_packet: ['leadOpsPacket', 'lead_packet', 'leadPacket'],
  crm_packet: ['crmPacket'],
  outreach_packet: ['outreachPacket'],
  evidence_urls: ['evidenceUrls'],
  email_drafts: ['emailDrafts', 'outreach_drafts', 'outreachDrafts'],
  email_draft: ['emailDraft', 'outreach_draft', 'outreachDraft'],
  next_actions: ['nextActions'],
  outreach_plan: ['outreachPlan', 'outreach_plans', 'outreachPlans'],
  campaign_state: ['campaignState'],
  publisher_queue: ['publisherQueue'],
  approval_backlog: ['approvalBacklog', 'approvalRequests', 'approval_requests'],
  connector_readiness: ['connectorReadiness'],
  planned_action_queue: ['plannedActionQueue', 'action_queue', 'actionQueue', 'plannedActions'],
  now_week_0_1: ['nowWeek01', 'nowWeekZeroOne', 'week_0_1', 'weekZeroOne', 'week0_1', 'week0One'],
  next_week_1_3: ['nextWeek13', 'nextWeekOneThree', 'week_1_3', 'weekOneThree', 'week1_3', 'week1Three'],
  waiting_conditions: ['waitingConditions', 'waiting_on', 'waitingOn', 'blockers'],
  measurement_loop: ['measurementLoop', 'measurementChecks'],
  next_action_owner: ['nextActionOwner', 'nextActionOwners', 'next_owner', 'nextOwner', 'owner_map', 'ownerMap'],
  campaign_operations_plan: ['campaignOperationsPlan', 'campaignOpsPlan', 'campaignPlan', 'campaign_markdown', 'campaignMarkdown'],
  ads_plan: ['adsPlan', 'ads_plan_packet', 'adsPlanPacket', 'paid_ads_plan', 'paidAdsPlan', 'ad_plan', 'adPlan', 'ad_campaign_plan', 'adCampaignPlan', 'paid_acquisition_plan', 'paidAcquisitionPlan'],
  ads_plan_packet: ['adsPlanPacket', 'ads_plan', 'adsPlan', 'paid_ads_plan', 'paidAdsPlan', 'ad_plan', 'adPlan', 'ad_campaign_plan', 'adCampaignPlan', 'paid_acquisition_plan', 'paidAcquisitionPlan'],
  paid_ads_plan: ['paidAdsPlan', 'ads_plan', 'adsPlan', 'ads_plan_packet', 'adsPlanPacket', 'ad_plan', 'adPlan', 'ad_campaign_plan', 'adCampaignPlan', 'paid_acquisition_plan', 'paidAcquisitionPlan'],
  campaign_structure: ['campaignStructure', 'ad_groups', 'adGroups', 'campaign_sections', 'campaignSections'],
  budget_cap_and_cpa_assumption: ['budgetCapAndCpaAssumption', 'budget_guardrails', 'budgetGuardrails', 'budgetCap', 'budget_cap', 'targetCpa', 'target_cpa', 'target_cpa_assumptions', 'targetCpaAssumptions', 'cpa_assumption', 'cpaAssumption'],
  budget_guardrails: ['budgetGuardrails', 'budget_cap_and_cpa_assumption', 'budgetCapAndCpaAssumption', 'budget_cap', 'budgetCap', 'target_cpa_assumptions', 'targetCpaAssumptions'],
  pre_launch_measurement_blocker: ['preLaunchMeasurementBlocker', 'measurement_blocker', 'measurementBlocker', 'measurement_blocker_packet', 'measurementBlockerPacket', 'tracking_blocker', 'trackingBlocker', 'pre_launch_tracking_blocker', 'preLaunchTrackingBlocker'],
  stop_rules: ['stopRules'],
  creative_asset_packet: ['creativeAssetPacket', 'approval_ready_ad_asset_packet', 'approvalReadyAdAssetPacket', 'ad_asset_packet', 'adAssetPacket', 'creative_assets', 'creativeAssets', 'ad_creatives', 'adCreatives'],
  ads_saas_handoff: ['adsSaasHandoff', 'ads_saas_handoff_packet', 'adsSaasHandoffPacket', 'ads_saas_fields', 'adsSaasFields', 'ads_handoff', 'adsHandoff'],
  ads_saas_handoff_packet: ['adsSaasHandoffPacket', 'ads_saas_handoff', 'adsSaasHandoff', 'ads_saas_fields', 'adsSaasFields', 'ads_handoff', 'adsHandoff'],
  approval_and_launch_boundary: ['approvalAndLaunchBoundary', 'approval_boundary', 'approvalBoundary', 'launch_boundary', 'launchBoundary', 'approval_checklist', 'approvalChecklist', 'launch_approval_checklist', 'launchApprovalChecklist', 'missing_execution_inputs', 'missingExecutionInputs'],
  launch_approval_handoff: ['launchApprovalHandoff', 'launch_approval_handoff_packet', 'launchApprovalHandoffPacket', 'launch_handoff_packet', 'launchHandoffPacket'],
  execution_status_labels: ['executionStatusLabels', 'execution_status', 'executionStatus', 'status_labels', 'statusLabels'],
  measurement_plan: ['measurementPlan', 'measurement_checks', 'measurementChecks', 'conversion_tracking_plan', 'conversionTrackingPlan', 'tracking_plan', 'trackingPlan', 'post_launch_measurement', 'postLaunchMeasurement'],
  pricing_decision_packet: ['pricingDecisionPacket', 'pricing_packet', 'pricingPacket', 'pricing_model_packet', 'pricingModelPacket', 'price_change_packet', 'priceChangePacket'],
  cfo_decision_packet: ['cfoDecisionPacket', 'cfo_packet', 'cfoPacket', 'finance_decision_packet', 'financeDecisionPacket'],
  pricing_question: ['pricingQuestion', 'decision_question', 'decisionQuestion', 'price_question', 'priceQuestion'],
  value_metric: ['valueMetric', 'billing_metric', 'billingMetric', 'pricing_metric', 'pricingMetric'],
  assumptions: ['assumption_table', 'assumptionTable', 'pricing_assumptions', 'pricingAssumptions'],
  source_to_model_ledger: ['sourceToModelLedger', 'source_model_ledger', 'sourceModelLedger', 'evidence_ledger', 'evidenceLedger'],
  formula: ['formula_model', 'formulaModel', 'pricing_formula', 'pricingFormula'],
  scenario_table: ['scenarioTable', 'scenarios', 'pricing_scenarios', 'pricingScenarios'],
  sensitivity_table: ['sensitivityTable', 'sensitivity', 'sensitivity_analysis', 'sensitivityAnalysis'],
  recommendation: ['recommended_price', 'recommendedPrice', 'pricing_recommendation', 'pricingRecommendation'],
  approval_owner: ['approvalOwner', 'decision_owner', 'decisionOwner'],
  price_change_handoff: ['priceChangeHandoff', 'price_change_packet', 'priceChangePacket', 'pricing_handoff', 'pricingHandoff'],
  execution_proof_tracker: ['executionProofTracker', 'proof_tracker', 'proofTracker'],
  decision_trigger: ['decisionTrigger', 'trigger', 'decision_rule', 'decisionRule'],
  rollback_or_continue_rule: ['rollbackOrContinueRule', 'rollback_rule', 'rollbackRule', 'continue_rule', 'continueRule'],
  growth_experiment_packet: ['growthExperimentPacket', 'growth_packet', 'growthPacket', 'experiment_packet', 'experimentPacket', 'growth_plan_packet', 'growthPlanPacket', 'no_paid_growth_plan_packet', 'noPaidGrowthPlanPacket', 'organic_growth_plan_packet', 'organicGrowthPlanPacket'],
  no_paid_growth_plan_packet: ['noPaidGrowthPlanPacket', 'organic_growth_plan_packet', 'organicGrowthPlanPacket', 'growth_experiment_packet', 'growthExperimentPacket'],
  organic_specialist_handoff_packet: ['organicSpecialistHandoffPacket', 'specialist_handoff_packet', 'specialistHandoffPacket', 'growth_asset_handoff_packet', 'growthAssetHandoffPacket', 'growth_activation_handoff_packet', 'growthActivationHandoffPacket'],
  growth_asset_handoff_packet: ['growthAssetHandoffPacket', 'growth_asset_packet', 'growthAssetPacket', 'asset_handoff_packet', 'assetHandoffPacket', 'organic_specialist_handoff_packet', 'organicSpecialistHandoffPacket'],
  growth_activation_handoff_packet: ['growthActivationHandoffPacket', 'growth_activation_packet', 'growthActivationPacket', 'activation_handoff_packet', 'activationHandoffPacket', 'organic_specialist_handoff_packet', 'organicSpecialistHandoffPacket'],
  bottleneck: ['growth_bottleneck', 'growthBottleneck'],
  icp_and_offer: ['icpAndOffer', 'icp_offer', 'icpOffer', 'target_segment_offer', 'targetSegmentOffer'],
  experiment_hypothesis: ['experimentHypothesis', 'hypothesis', 'growth_hypothesis', 'growthHypothesis'],
  exact_artifact_packet: ['exactArtifactPacket', 'artifact_packet', 'artifactPacket', 'exact_copy_or_page_or_channel_artifact', 'exactCopyOrPageOrChannelArtifact'],
  page_or_channel_artifact: ['pageOrChannelArtifact', 'page_channel_artifact', 'pageChannelArtifact', 'artifact_surface', 'artifactSurface'],
  execution_packet: ['executionPacket', 'activation_packet', 'activationPacket', '7_day_experiment', '7DayExperiment', 'seven_day_experiment', 'sevenDayExperiment', 'experiment_plan', 'experimentPlan'],
  seven_day_experiment: ['sevenDayExperiment', 'seven_day_test', 'sevenDayTest', 'experiment_plan', 'experimentPlan', 'growth_experiment_packet', 'growthExperimentPacket'],
  experiment_plan: ['experimentPlan', 'seven_day_experiment', 'sevenDayExperiment', 'growth_experiment_packet', 'growthExperimentPacket'],
  tracking_specification: ['trackingSpecification', 'tracking_spec', 'trackingSpec', 'measurement_spec', 'measurementSpec', 'measurement_surface', 'measurementSurface', 'tracking_plan', 'trackingPlan'],
  metric_threshold: ['metricThreshold', 'success_metric', 'successMetric', 'threshold', 'success_criteria', 'successCriteria'],
  kill_rule: ['killRule', 'stop_rule', 'stopRule', 'stop_rules', 'stopRules'],
  activation_owner: ['activationOwner', 'implementation_owner', 'implementationOwner'],
  owner_responsibility_map: ['ownerResponsibilityMap', 'owner_map', 'ownerMap', 'responsibility_map', 'responsibilityMap'],
  measurement_owner: ['measurementOwner'],
  measurement_surface: ['measurementSurface', 'analytics_surface', 'analyticsSurface', 'proof_surface', 'proofSurface'],
  proof_source: ['proofSource', 'execution_proof_source', 'executionProofSource', 'launch_proof', 'launchProof', 'conversion_proof', 'conversionProof'],
  review_date: ['reviewDate', 'next_review_date', 'nextReviewDate'],
  next_decision: ['nextDecision', 'decision_rule', 'decisionRule', 'continue_or_stop_rule', 'continueOrStopRule'],
  article_draft: ['articleDraft'],
  seo_article: ['seoArticle'],
  seo_page_artifact: ['seoPageArtifact', 'seoPage'],
  landing_page: ['landingPage'],
  landing_page_change: ['landingPageChange'],
  site_publish_packet: ['sitePublishPacket', 'owned_site_packet', 'ownedSitePacket', 'publisher_packet', 'publisherPacket', 'publishing_packet', 'publishingPacket', 'publish_packet', 'publishPacket', 'content_package', 'contentPackage', 'publisher_content_package', 'publisherContentPackage'],
  publisher_packet: ['publisherPacket', 'site_publish_packet', 'sitePublishPacket'],
  publishing_packet: ['publishingPacket', 'publish_packet', 'publishPacket', 'site_publish_packet', 'sitePublishPacket'],
  publish_packet: ['publishPacket', 'publishing_packet', 'publishingPacket', 'site_publish_packet', 'sitePublishPacket'],
  content_package: ['contentPackage', 'publisher_content_package', 'publisherContentPackage', 'site_publish_packet', 'sitePublishPacket'],
  publisher_content_package: ['publisherContentPackage', 'content_package', 'contentPackage', 'site_publish_packet', 'sitePublishPacket'],
  wordpress_draft: ['wordpressDraft'],
  wordpress_draft_packet: ['wordpressDraftPacket', 'wpDraftPacket'],
  directory_submission: ['directorySubmission'],
  directory_packet: ['directoryPacket'],
  community_post_packet: ['communityPostPacket'],
  social_copy_packet: ['socialCopyPacket', 'socialPostPack'],
  social_post: ['socialPost'],
  x_post: ['xPost', 'tweet'],
  x_post_packet: ['xPostPacket', 'twitterPostPacket'],
  reddit_post: ['redditPost'],
  reddit_post_packet: ['redditPostPacket'],
  indie_hackers_post: ['indieHackersPost', 'indieHackers'],
  indie_hackers_packet: ['indieHackersPacket'],
  instagram_post: ['instagramPost'],
  instagram_post_packet: ['instagramPostPacket'],
  approval_request: ['approvalRequest']
});

const APP_CONTEXT_MULTILINE_PRESERVE_KEYS = Object.freeze(uniqueStringList([
  'content',
  'content_preview',
  'contentPreview',
  'body',
  'text',
  'markdown',
  'html',
  'raw_markdown',
  'rawMarkdown',
  'campaign_operations_plan',
  'campaignOperationsPlan',
  'campaignOpsPlan',
  'campaignPlan',
  'campaign_markdown',
  'campaignMarkdown',
  'ads_plan',
  'adsPlan',
  'ads_plan_packet',
  'adsPlanPacket',
  'paid_ads_plan',
  'paidAdsPlan',
  'ad_plan',
  'adPlan',
  'ad_campaign_plan',
  'adCampaignPlan',
  'paid_acquisition_plan',
  'paidAcquisitionPlan',
  'pricing_decision_packet',
  'pricingDecisionPacket',
  'pricing_packet',
  'pricingPacket',
  'cfo_decision_packet',
  'cfoDecisionPacket',
  'price_change_handoff',
  'priceChangeHandoff',
  'growth_experiment_packet',
  'growthExperimentPacket',
  'growth_packet',
  'growthPacket',
  'no_paid_growth_plan_packet',
  'noPaidGrowthPlanPacket',
  'organic_growth_plan_packet',
  'organicGrowthPlanPacket',
  'organic_specialist_handoff_packet',
  'organicSpecialistHandoffPacket',
  'growth_asset_handoff_packet',
  'growthAssetHandoffPacket',
  'growth_activation_handoff_packet',
  'growthActivationHandoffPacket',
  '7_day_experiment',
  '7DayExperiment',
  'seven_day_experiment',
  'sevenDayExperiment',
  'experiment_plan',
  'experimentPlan',
  'exact_artifact_packet',
  'exactArtifactPacket',
  'page_or_channel_artifact',
  'pageOrChannelArtifact',
  'execution_packet',
  'executionPacket',
  'tracking_specification',
  'trackingSpecification',
  'measurement_surface',
  'measurementSurface',
  'proof_source',
  'proofSource',
  'owner_responsibility_map',
  'ownerResponsibilityMap',
  'next_decision',
  'nextDecision'
]));
const APP_CONTEXT_MULTILINE_PRESERVE_KEY_SET = new Set(APP_CONTEXT_MULTILINE_PRESERVE_KEYS.map((key) => key.toLowerCase()));

function nowIso() {
  return new Date().toISOString();
}

function safeText(value = '', max = 2000) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function safeMultilineText(value = '', max = 2000) {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
    .slice(0, max);
}

function shouldPreserveMultilineValue(key = '') {
  return APP_CONTEXT_MULTILINE_PRESERVE_KEY_SET.has(String(key || '').trim().toLowerCase());
}

function safeId(value = '') {
  return safeText(value, 120).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
}

function safeList(value = [], max = 24) {
  const source = Array.isArray(value) ? value : String(value || '').split(/[,\n]/);
  return [...new Set(source.map((item) => safeText(item, 500)).filter(Boolean))].slice(0, max);
}

function compactObject(value, options = {}, depth = 0) {
  if (value == null || depth > Number(options.depth ?? 5)) return value == null ? value : safeText(value, Number(options.maxText || 1000));
  if (Array.isArray(value)) return value.slice(0, Number(options.maxArray || 16)).map((item) => compactObject(item, options, depth + 1));
  if (typeof value !== 'object') return typeof value === 'string' ? safeText(value, Number(options.maxText || 1000)) : value;
  const output = {};
  for (const [key, item] of Object.entries(value)) {
    if (/token|secret|password|private[_-]?key|api[_-]?key|bearer/i.test(key)) {
      output[safeText(key, 80)] = item ? '[redacted]' : item;
      continue;
    }
    const safeKey = safeText(key, 80);
    output[safeKey] = typeof item === 'string' && shouldPreserveMultilineValue(key)
      ? safeMultilineText(item, Number(options.maxText || 1000))
      : compactObject(item, options, depth + 1);
  }
  return output;
}

function objectList(value = [], max = 24) {
  return (Array.isArray(value) ? value : [])
    .filter((item) => item && typeof item === 'object')
    .map((item) => compactObject(item, { depth: 5, maxText: 6000, maxArray: 24 }))
    .slice(0, max);
}

function deliveryFileObjectList(source = {}, max = 30) {
  const keys = ['delivery_files', 'deliveryFiles', 'files', 'attachments', 'output_files', 'outputFiles', 'result_files', 'resultFiles', 'deliverables'];
  const items = keys.flatMap((key) => (Array.isArray(source[key]) ? source[key] : []));
  return objectList(items, max);
}

function metricList(value = [], max = 60) {
  if (Array.isArray(value)) return objectList(value, max);
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value)
    .map(([key, item]) => ({
      label: safeText(key, 120),
      value: typeof item === 'string' ? safeText(item, 500) : item
    }))
    .filter((item) => item.label)
    .slice(0, max);
}

function camelKey(value = '') {
  return String(value || '').replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase());
}

function hasContractValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string' || typeof value === 'number') return safeText(value, 1000).length > 0;
  return value && typeof value === 'object' && Object.keys(value).length > 0;
}

function compactContractFieldValue(value, key = '') {
  return typeof value === 'string' && shouldPreserveMultilineValue(key)
    ? safeMultilineText(value, 1400)
    : compactObject(value, { depth: 5, maxText: 1400, maxArray: 16 });
}

function rawContextWithContractFields(source = {}) {
  const raw = compactObject(source.raw_context || source.rawContext || {}, { depth: 5, maxText: 1400, maxArray: 16 });
  const output = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  for (const key of APP_CONTEXT_RAW_CONTRACT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(output, key)) continue;
    const aliases = [key, camelKey(key), ...(APP_CONTEXT_RAW_CONTRACT_ALIASES[key] || [])];
    const value = aliases.map((alias) => source[alias]).find(hasContractValue);
    if (!hasContractValue(value)) continue;
    output[key] = compactContractFieldValue(value, key);
  }
  return output;
}

export function normalizeCaitAppContext(raw = {}) {
  const source = raw?.context && typeof raw.context === 'object' ? raw.context : raw;
  const createdAt = safeText(source.created_at || source.createdAt || nowIso(), 80) || nowIso();
  const sourceApp = safeId(source.source_app || source.sourceApp || source.app_id || source.appId || source.app || 'app');
  const title = safeText(source.title || 'App context', 180);
  const id = safeText(source.id || `${sourceApp || 'app'}-${Date.now().toString(36)}`, 160);
  return {
    schema: CAIT_APP_CONTEXT_SCHEMA,
    id,
    source_app: sourceApp,
    source_app_label: safeText(source.source_app_label || source.sourceAppLabel || source.app_label || source.appLabel || sourceApp || 'App', 120),
    title,
    summary: safeText(source.summary || '', 1600),
    facts: safeList(source.facts || [], 40),
    assumptions: safeList(source.assumptions || [], 24),
    artifacts: objectList(source.artifacts || [], 40),
    metrics: metricList(source.metrics || source.analytics_metrics || source.analyticsMetrics || [], 60),
    recommended_next_actions: safeList(source.recommended_next_actions || source.recommendedNextActions || [], 30),
    approval_requests: objectList(source.approval_requests || source.approvalRequests || [], 40),
    delivery_files: deliveryFileObjectList(source, 30),
    handoff_targets: safeList(source.handoff_targets || source.handoffTargets || [], 20),
    raw_context: rawContextWithContractFields(source),
    created_at: createdAt
  };
}

export function createAppContextRecord(raw = {}, ownerInfo = {}, options = {}) {
  const payload = normalizeCaitAppContext(raw);
  const now = nowIso();
  const id = safeText(options.id || payload.id || `ctx-${Date.now().toString(36)}`, 160);
  const expiresAt = safeText(options.expiresAt || new Date(Date.now() + APP_CONTEXT_TTL_MS).toISOString(), 80);
  return {
    id,
    ownerLogin: safeText(ownerInfo.login || ownerInfo.owner || ownerInfo.email || '', 200).toLowerCase(),
    sourceApp: safeId(payload.source_app),
    sourceAppLabel: safeText(payload.source_app_label || payload.source_app, 120),
    title: safeText(payload.title || 'App context', 180),
    summary: safeText(payload.summary || '', 1600),
    payload: { ...payload, id },
    accessToken: safeText(options.accessToken || '', 200),
    status: safeText(options.status || 'ready', 40) || 'ready',
    expiresAt,
    createdAt: safeText(options.createdAt || now, 80),
    updatedAt: safeText(options.updatedAt || now, 80)
  };
}

function countList(value = []) {
  return Array.isArray(value) ? value.length : 0;
}

function appContextOperationalSummary(payload = {}) {
  const summary = {
    facts: countList(payload.facts),
    assumptions: countList(payload.assumptions),
    artifacts: countList(payload.artifacts),
    metrics: countList(payload.metrics),
    approval_requests: countList(payload.approval_requests),
    delivery_files: countList(payload.delivery_files),
    recommended_next_actions: countList(payload.recommended_next_actions),
    handoff_targets: countList(payload.handoff_targets)
  };
  return {
    ...summary,
    anchors_total: Object.values(summary).reduce((total, count) => total + count, 0)
  };
}

export function publicAppContext(record = {}, options = {}) {
  if (!record?.id) return null;
  const payload = normalizeCaitAppContext(record.payload || {});
  const base = {
    id: record.id,
    source_app: safeId(record.sourceApp || payload.source_app),
    source_app_label: safeText(record.sourceAppLabel || payload.source_app_label, 120),
    title: safeText(record.title || payload.title, 180),
    summary: safeText(record.summary || payload.summary, 1600),
    status: safeText(record.status || 'ready', 40),
    expires_at: safeText(record.expiresAt || '', 80),
    created_at: safeText(record.createdAt || '', 80),
    updated_at: safeText(record.updatedAt || '', 80),
    operational_summary: appContextOperationalSummary(payload)
  };
  if (options.includePayload !== false) base.context = { ...payload, id: record.id };
  return base;
}

export function appContextIsExpired(record = {}, at = Date.now()) {
  const expires = Date.parse(String(record?.expiresAt || record?.expires_at || ''));
  return Number.isFinite(expires) && expires <= at;
}
