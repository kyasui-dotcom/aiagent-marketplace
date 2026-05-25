const CAIT_APP_CONTEXT_SCHEMA = 'cait-app-context/v1';
const CAIT_APP_CONTEXT_CHANNEL = 'cait-app-context';
const DEFAULT_CAIt_ORIGIN = 'https://aiagent-marketplace.net';

function uniqueStringList(items = []) {
  return [...new Set(items.map((item) => String(item || '').trim()).filter(Boolean))];
}

const APP_CONTEXT_RAW_PRESERVE_KEYS = Object.freeze(uniqueStringList([
  'metrics',
  'analytics_context',
  'analyticsContext',
  'analytics_packet',
  'analyticsPacket',
  'search_console_packet',
  'searchConsolePacket',
  'gsc_packet',
  'gscPacket',
  'ga4_packet',
  'ga4Packet',
  'google_analytics_packet',
  'googleAnalyticsPacket',
  'analytics_metrics',
  'search_queries',
  'searchQueries',
  'queries',
  'landing_pages',
  'landingPages',
  'pages',
  'channel_mix',
  'channelMix',
  'channel_breakdown',
  'channelBreakdown',
  'channel_breakdowns',
  'channel_landing_pages',
  'channelLandingPages',
  'channel_sources',
  'channelSources',
  'conversion_paths',
  'conversionPaths',
  'country_mix',
  'countryMix',
  'measurement_queue',
  'measurementQueue',
  'post_run_measurement',
  'postRunMeasurement',
  'google_sources',
  'googleSources',
  'google_report_status',
  'googleReportStatus',
  'delivery_package',
  'deliveryPackage',
  'delivery_context',
  'deliveryContext',
  'delivery_packet',
  'deliveryPacket',
  'delivery_artifacts',
  'deliveryArtifacts',
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
  'postText',
  'approved_text',
  'approvedText',
  'exact_copy',
  'exactCopy',
  'strategy',
  'strategy_context',
  'strategyContext',
  'agent_context',
  'agentContext',
  'delivery_summary',
  'deliverySummary',
  'settings',
  'app_settings',
  'appSettings',
  'lead_rows',
  'leadRows',
  'lead_acquisition_request',
  'leadAcquisitionRequest',
  'lead_sourcing_request',
  'leadSourcingRequest',
  'lead_ops_packet',
  'leadOpsPacket',
  'lead_packet',
  'leadPacket',
  'crm_packet',
  'crmPacket',
  'outreach_packet',
  'outreachPacket',
  'evidence_urls',
  'evidenceUrls',
  'email_drafts',
  'emailDrafts',
  'email_draft',
  'emailDraft',
  'outreach_drafts',
  'outreachDrafts',
  'next_actions',
  'nextActions',
  'outreach_plan',
  'outreachPlan',
  'campaign_state',
  'campaignState',
  'publisher_queue',
  'publisherQueue',
  'approval_backlog',
  'approvalBacklog',
  'connector_readiness',
  'connectorReadiness',
  'planned_action_queue',
  'plannedActionQueue',
  'waiting_conditions',
  'waitingConditions',
  'measurement_loop',
  'measurementLoop',
  'next_action_owner',
  'nextActionOwner',
  'campaign_operations_plan',
  'campaignOperationsPlan',
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
  'campaign_structure',
  'campaignStructure',
  'ad_groups',
  'adGroups',
  'campaign_sections',
  'campaignSections',
  'budget_cap_and_cpa_assumption',
  'budgetCapAndCpaAssumption',
  'budget_guardrails',
  'budgetGuardrails',
  'budget_cap',
  'budgetCap',
  'target_cpa',
  'targetCpa',
  'target_cpa_assumptions',
  'targetCpaAssumptions',
  'cpa_assumption',
  'cpaAssumption',
  'pre_launch_measurement_blocker',
  'preLaunchMeasurementBlocker',
  'measurement_blocker',
  'measurementBlocker',
  'measurement_blocker_packet',
  'measurementBlockerPacket',
  'tracking_blocker',
  'trackingBlocker',
  'pre_launch_tracking_blocker',
  'preLaunchTrackingBlocker',
  'stop_rules',
  'stopRules',
  'creative_asset_packet',
  'creativeAssetPacket',
  'approval_ready_ad_asset_packet',
  'approvalReadyAdAssetPacket',
  'ad_asset_packet',
  'adAssetPacket',
  'creative_assets',
  'creativeAssets',
  'ad_creatives',
  'adCreatives',
  'ads_saas_handoff',
  'adsSaasHandoff',
  'ads_saas_handoff_packet',
  'adsSaasHandoffPacket',
  'ads_saas_fields',
  'adsSaasFields',
  'ads_handoff',
  'adsHandoff',
  'approval_and_launch_boundary',
  'approvalAndLaunchBoundary',
  'approval_boundary',
  'approvalBoundary',
  'launch_boundary',
  'launchBoundary',
  'approval_checklist',
  'approvalChecklist',
  'launch_approval_checklist',
  'launchApprovalChecklist',
  'missing_execution_inputs',
  'missingExecutionInputs',
  'launch_approval_handoff',
  'launchApprovalHandoff',
  'launch_approval_handoff_packet',
  'launchApprovalHandoffPacket',
  'launch_handoff_packet',
  'launchHandoffPacket',
  'execution_status_labels',
  'executionStatusLabels',
  'execution_status',
  'executionStatus',
  'status_labels',
  'statusLabels',
  'measurement_plan',
  'measurementPlan',
  'measurement_checks',
  'measurementChecks',
  'conversion_tracking_plan',
  'conversionTrackingPlan',
  'tracking_plan',
  'trackingPlan',
  'post_launch_measurement',
  'postLaunchMeasurement',
  'pricing_decision_packet',
  'pricingDecisionPacket',
  'pricing_packet',
  'pricingPacket',
  'pricing_model_packet',
  'pricingModelPacket',
  'price_change_packet',
  'priceChangePacket',
  'cfo_decision_packet',
  'cfoDecisionPacket',
  'cfo_packet',
  'cfoPacket',
  'finance_decision_packet',
  'financeDecisionPacket',
  'pricing_question',
  'pricingQuestion',
  'decision_question',
  'decisionQuestion',
  'price_question',
  'priceQuestion',
  'value_metric',
  'valueMetric',
  'billing_metric',
  'billingMetric',
  'pricing_metric',
  'pricingMetric',
  'assumptions',
  'assumption_table',
  'assumptionTable',
  'pricing_assumptions',
  'pricingAssumptions',
  'source_to_model_ledger',
  'sourceToModelLedger',
  'source_model_ledger',
  'sourceModelLedger',
  'evidence_ledger',
  'evidenceLedger',
  'formula',
  'formula_model',
  'formulaModel',
  'pricing_formula',
  'pricingFormula',
  'scenario_table',
  'scenarioTable',
  'scenarios',
  'pricing_scenarios',
  'pricingScenarios',
  'sensitivity_table',
  'sensitivityTable',
  'sensitivity',
  'sensitivity_analysis',
  'sensitivityAnalysis',
  'recommendation',
  'recommended_price',
  'recommendedPrice',
  'pricing_recommendation',
  'pricingRecommendation',
  'approval_owner',
  'approvalOwner',
  'decision_owner',
  'decisionOwner',
  'price_change_handoff',
  'priceChangeHandoff',
  'pricing_handoff',
  'pricingHandoff',
  'execution_proof_tracker',
  'executionProofTracker',
  'proof_tracker',
  'proofTracker',
  'execution_status_labels',
  'executionStatusLabels',
  'execution_status',
  'executionStatus',
  'status_labels',
  'statusLabels',
  'decision_trigger',
  'decisionTrigger',
  'decision_rule',
  'decisionRule',
  'trigger',
  'rollback_or_continue_rule',
  'rollbackOrContinueRule',
  'rollback_rule',
  'rollbackRule',
  'continue_rule',
  'continueRule',
  'growth_experiment_packet',
  'growthExperimentPacket',
  'growth_packet',
  'growthPacket',
  'experiment_packet',
  'experimentPacket',
  'growth_plan_packet',
  'growthPlanPacket',
  'growth_asset_handoff_packet',
  'growthAssetHandoffPacket',
  'growth_asset_packet',
  'growthAssetPacket',
  'asset_handoff_packet',
  'assetHandoffPacket',
  'growth_activation_handoff_packet',
  'growthActivationHandoffPacket',
  'growth_activation_packet',
  'growthActivationPacket',
  'activation_handoff_packet',
  'activationHandoffPacket',
  'bottleneck',
  'growth_bottleneck',
  'growthBottleneck',
  'icp_and_offer',
  'icpAndOffer',
  'icp_offer',
  'icpOffer',
  'experiment_hypothesis',
  'experimentHypothesis',
  'hypothesis',
  'exact_artifact_packet',
  'exactArtifactPacket',
  'artifact_packet',
  'artifactPacket',
  'execution_packet',
  'executionPacket',
  'tracking_specification',
  'trackingSpecification',
  'tracking_spec',
  'trackingSpec',
  'metric_threshold',
  'metricThreshold',
  'success_metric',
  'successMetric',
  'kill_rule',
  'killRule',
  'activation_owner',
  'activationOwner',
  'implementation_owner',
  'implementationOwner',
  'measurement_owner',
  'measurementOwner',
  'review_date',
  'reviewDate',
  'article_draft',
  'articleDraft',
  'seo_article',
  'seoArticle',
  'seo_page_artifact',
  'seoPageArtifact',
  'landing_page',
  'landingPage',
  'landing_page_change',
  'landingPageChange',
  'site_publish_packet',
  'sitePublishPacket',
  'owned_site_packet',
  'ownedSitePacket',
  'publisher_packet',
  'publisherPacket',
  'publishing_packet',
  'publishingPacket',
  'publish_packet',
  'publishPacket',
  'content_package',
  'contentPackage',
  'publisher_content_package',
  'publisherContentPackage',
  'wordpress_draft',
  'wordpressDraft',
  'wordpress_draft_packet',
  'wordpressDraftPacket',
  'wp_draft_packet',
  'wpDraftPacket',
  'directory_submission',
  'directorySubmission',
  'directory_packet',
  'directoryPacket',
  'listing_packet',
  'listingPacket',
  'community_post_packet',
  'communityPostPacket',
  'social_copy_packet',
  'socialCopyPacket',
  'social_post',
  'socialPost',
  'social_post_pack',
  'socialPostPack',
  'x_post',
  'xPost',
  'x_post_packet',
  'xPostPacket',
  'reddit_post',
  'redditPost',
  'reddit_post_packet',
  'redditPostPacket',
  'indie_hackers_post',
  'indieHackersPost',
  'indie_hackers_packet',
  'indieHackersPacket',
  'instagram_post',
  'instagramPost',
  'instagram_post_packet',
  'instagramPostPacket',
  'approval_request',
  'approvalRequest'
]));

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
  'pricing_model_packet',
  'pricingModelPacket',
  'price_change_packet',
  'priceChangePacket',
  'cfo_decision_packet',
  'cfoDecisionPacket',
  'cfo_packet',
  'cfoPacket',
  'finance_decision_packet',
  'financeDecisionPacket',
  'price_change_handoff',
  'priceChangeHandoff',
  'pricing_handoff',
  'pricingHandoff',
  'growth_experiment_packet',
  'growthExperimentPacket',
  'growth_packet',
  'growthPacket',
  'growth_asset_handoff_packet',
  'growthAssetHandoffPacket',
  'growth_activation_handoff_packet',
  'growthActivationHandoffPacket',
  'exact_artifact_packet',
  'exactArtifactPacket',
  'execution_packet',
  'executionPacket',
  'tracking_specification',
  'trackingSpecification'
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
  const list = Array.isArray(value) ? value : String(value || '').split(/[,\n]/);
  return [...new Set(list.map((item) => safeText(item, 500)).filter(Boolean))].slice(0, max);
}

function safeObjectList(value = [], max = 24) {
  return (Array.isArray(value) ? value : [])
    .filter((item) => item && typeof item === 'object')
    .map((item) => compactObject(item, { depth: 4, maxText: 6000, maxArray: 12 }))
    .slice(0, max);
}

function safeDeliveryFileObjectList(source = {}, max = 24) {
  const keys = ['delivery_files', 'deliveryFiles', 'files', 'attachments', 'output_files', 'outputFiles', 'result_files', 'resultFiles', 'deliverables'];
  const items = keys.flatMap((key) => (Array.isArray(source[key]) ? source[key] : []));
  return safeObjectList(items, max);
}

function compactObject(value, options = {}, depth = 0) {
  if (value == null || depth > Number(options.depth ?? 5)) return value == null ? value : safeText(value, Number(options.maxText || 1000));
  if (Array.isArray(value)) return value.slice(0, Number(options.maxArray || 12)).map((item) => compactObject(item, options, depth + 1));
  if (typeof value !== 'object') return typeof value === 'string' ? safeText(value, Number(options.maxText || 1000)) : value;
  const output = {};
  for (const [key, item] of Object.entries(value)) {
    if (/token|secret|password|private[_-]?key|api[_-]?key|bearer/i.test(key)) {
      output[key] = item ? '[redacted]' : item;
      continue;
    }
    const safeKey = safeText(key, 80);
    output[safeKey] = typeof item === 'string' && shouldPreserveMultilineValue(key)
      ? safeMultilineText(item, Number(options.maxText || 1000))
      : compactObject(item, options, depth + 1);
  }
  return output;
}

function rawContextWithPreservedContractKeys(raw = {}) {
  const base = raw.raw_context || raw.rawContext || {};
  const rawContext = base && typeof base === 'object' ? { ...base } : {};
  for (const key of APP_CONTEXT_RAW_PRESERVE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(raw, key) && !Object.prototype.hasOwnProperty.call(rawContext, key)) {
      rawContext[key] = raw[key];
    }
  }
  return rawContext;
}

function caitOrigin(options = {}) {
  if (options.caitOrigin) return String(options.caitOrigin || '').replace(/\/+$/, '');
  const host = String(window.location.hostname || '').toLowerCase();
  if (host === 'aiagent-marketplace.net' || host === 'www.aiagent-marketplace.net' || host === '127.0.0.1' || host === 'localhost') {
    return window.location.origin;
  }
  return DEFAULT_CAIt_ORIGIN;
}

function delay(ms = 0) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function retryableStatus(status = 0) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

async function fetchJsonWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  let timeoutId = null;
  if (controller && Number.isFinite(timeoutMs) && timeoutMs > 0) {
    timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  }
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller ? controller.signal : options.signal
    });
    const data = await response.json().catch(() => ({}));
    return { response, data };
  } catch (error) {
    error.retryable = true;
    throw error;
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
}

async function caitCsrfToken(origin = '') {
  if (origin !== window.location.origin) return '';
  try {
    const { response, data } = await fetchJsonWithTimeout(`${origin}/auth/status`, {
      headers: { accept: 'application/json' },
      credentials: 'same-origin'
    }, 5000);
    if (!response.ok) return '';
    return String(data?.csrfToken || '').trim();
  } catch {
    return '';
  }
}

async function createServerAppContext(context = {}, options = {}) {
  if (options.server === false) return null;
  const origin = caitOrigin(options);
  const headers = { 'content-type': 'application/json', accept: 'application/json' };
  const apiKey = safeText(options.apiKey || options.caitApiKey || '', 300);
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;
  const csrfToken = await caitCsrfToken(origin);
  if (csrfToken) headers['x-aiagent2-csrf'] = csrfToken;
  const { response, data } = await fetchJsonWithTimeout(`${origin}/api/app-contexts`, {
    method: 'POST',
    headers,
    credentials: origin === window.location.origin ? 'same-origin' : 'omit',
    body: JSON.stringify({
      app_id: context.source_app,
      context
    })
  }, Number(options.serverTimeoutMs || 12000) || 12000);
  if (!response.ok || !data?.chat_url) {
    const error = new Error(String(data?.error || `app context create failed (${response.status})`));
    error.status = response.status;
    error.retryable = retryableStatus(response.status);
    throw error;
  }
  return {
    ...data,
    chat_url: new URL(data.chat_url, origin).toString()
  };
}

async function createServerAppContextWithRetry(context = {}, options = {}) {
  const attempts = Math.max(1, Math.min(6, Number(options.serverAttempts || 5) || 5));
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await createServerAppContext(context, options);
    } catch (error) {
      lastError = error;
      if (attempt >= attempts) break;
      if (error?.retryable === false || (Number(error?.status || 0) >= 400 && !retryableStatus(Number(error.status)))) break;
      await delay(Math.min(5000, 600 * attempt * attempt));
    }
  }
  throw lastError || new Error('app context create failed');
}

function sameOriginOpener() {
  try {
    if (!window.opener || window.opener.closed) return null;
    return window.opener.location.origin === window.location.origin ? window.opener : null;
  } catch {
    return null;
  }
}

function publishCaitAppContextMessage(message = {}) {
  if (!message || typeof message !== 'object') return;
  const payload = {
    ...message,
    origin: window.location.origin,
    sent_at: nowIso()
  };
  try {
    const channel = new BroadcastChannel(CAIT_APP_CONTEXT_CHANNEL);
    channel.postMessage(payload);
    channel.close();
  } catch {}
}

function localChatReturnUrl(serverContext = {}, context = {}, options = {}) {
  const origin = caitOrigin(options);
  const raw = context?.raw_context && typeof context.raw_context === 'object' ? context.raw_context : {};
  const requested = safeText(options.returnTo || options.chatReturnTo || raw.chat_return_to || raw.chatReturnTo || '', 1000);
  const fallback = serverContext?.chat_url || `${origin}/chat`;
  if (!requested) return new URL(fallback, origin).toString();
  try {
    const url = new URL(requested, origin);
    if (url.origin !== origin || !/^\/chat(?:\.html)?$/.test(url.pathname)) return new URL(fallback, origin).toString();
    if (serverContext?.app_context_id) url.searchParams.set('app_context_id', String(serverContext.app_context_id));
    if (serverContext?.app_context_token) url.searchParams.set('app_context_token', String(serverContext.app_context_token));
    return url.toString();
  } catch {
    return new URL(fallback, origin).toString();
  }
}

export function buildCaitAppContext(raw = {}) {
  const createdAt = safeText(raw.created_at || raw.createdAt || nowIso(), 80) || nowIso();
  const sourceApp = safeId(raw.source_app || raw.sourceApp || raw.app || 'app');
  const title = safeText(raw.title || 'App context', 180);
  const id = safeText(raw.id || `${sourceApp || 'app'}-${Date.now().toString(36)}`, 160);
  return {
    schema: CAIT_APP_CONTEXT_SCHEMA,
    id,
    source_app: sourceApp,
    source_app_label: safeText(raw.source_app_label || raw.sourceAppLabel || raw.app_label || sourceApp || 'App', 120),
    title,
    summary: safeText(raw.summary || '', 1400),
    facts: safeList(raw.facts || [], 30),
    assumptions: safeList(raw.assumptions || [], 20),
    artifacts: safeObjectList(raw.artifacts || [], 24),
    metrics: safeObjectList(raw.metrics || [], 40),
    recommended_next_actions: safeList(raw.recommended_next_actions || raw.recommendedNextActions || [], 24),
    approval_requests: safeObjectList(raw.approval_requests || raw.approvalRequests || [], 24),
    delivery_files: safeDeliveryFileObjectList(raw, 24),
    handoff_targets: safeList(raw.handoff_targets || raw.handoffTargets || [], 16),
    raw_context: compactObject(rawContextWithPreservedContractKeys(raw), { depth: 5, maxText: 1000, maxArray: 12 }),
    created_at: createdAt
  };
}

export function storeCaitAppContext(raw = {}) {
  return buildCaitAppContext(raw);
}

export function caitAppContextChatPrompt(context = {}) {
  const c = buildCaitAppContext(context);
  const raw = c.raw_context && typeof c.raw_context === 'object' ? c.raw_context : {};
  const source = String(c.source_app || '').toLowerCase();
  if (source === 'analytics_console' || raw.googleGa4Property || raw.googleSearchConsoleSite || raw.googleReportLoaded) {
    const services = [
      raw.googleGa4Property ? 'GA4' : '',
      raw.googleSearchConsoleSite ? 'Search Console' : ''
    ].filter(Boolean);
    const metricValue = (name) => {
      const metric = c.metrics.find((item) => String(item?.label || item?.name || '').toLowerCase() === name);
      return metric ? String(metric.value ?? metric.current ?? '').trim() : '';
    };
    const lines = [
      `Attached connector context: ${services.length ? services.join(' + ') : 'Google Analytics/Search Console'}`,
      raw.googleGa4Property ? `- GA4 property: ${raw.googleGa4Property}` : '',
      raw.googleSearchConsoleSite ? `- Search Console site: ${raw.googleSearchConsoleSite}` : '',
      raw.googleReportDateRange?.start_date && raw.googleReportDateRange?.end_date
        ? `- Date range: ${raw.googleReportDateRange.start_date} to ${raw.googleReportDateRange.end_date}`
        : '',
      metricValue('sessions') ? `- Sessions: ${metricValue('sessions')}` : '',
      metricValue('conversions') ? `- Conversions: ${metricValue('conversions')}` : '',
      metricValue('conversion_rate') ? `- Conversion rate: ${metricValue('conversion_rate')}` : '',
      'Use this attached connector data as evidence. Do not ask the user to paste GA4/Search Console rows again.'
    ].filter(Boolean);
    return lines.join('\n');
  }
  if (source === 'lead_ops_console' && raw.lead_acquisition_request && typeof raw.lead_acquisition_request === 'object') {
    const request = raw.lead_acquisition_request;
    const lines = [
      'Create a List Creator order from this Lead Ops sourcing request.',
      '',
      request.target_segment ? `Target customer / ICP: ${request.target_segment}` : '',
      request.source_policy ? `Sources to use: ${request.source_policy}` : '',
      request.target_count ? `Target count: ${request.target_count}` : '',
      request.region_or_language ? `Region / language: ${request.region_or_language}` : '',
      request.offer_or_contact_reason ? `Offer / reason to contact: ${request.offer_or_contact_reason}` : '',
      request.exclusions ? `Do not include: ${request.exclusions}` : '',
      '',
      'Return reviewable lead_rows, evidence_urls, next_actions, and a lead_ops_packet that can reopen in Lead Ops.',
      'Use public-source evidence only. Do not invent personal emails or private contact data.'
    ].filter(Boolean);
    return lines.join('\n');
  }
  const lines = [
    `Use this ${c.source_app_label || c.source_app} context with CAIt.`,
    '',
    `Title: ${c.title}`,
    c.summary ? `Summary: ${c.summary}` : '',
    c.handoff_targets.length ? `Preferred leaders/agents: ${c.handoff_targets.join(', ')}` : '',
    c.recommended_next_actions.length ? 'Recommended next actions:' : '',
    ...c.recommended_next_actions.slice(0, 8).map((item, index) => `${index + 1}. ${item}`),
    '',
    'Create the next order only after checking missing context and approval requirements.'
  ].filter(Boolean);
  return lines.join('\n');
}

export function caitAppContextThreadHtml(context = {}) {
  const c = buildCaitAppContext(context);
  const metrics = c.metrics.slice(0, 5).map((metric) => {
    const label = safeText(metric.label || metric.name || metric.metric || 'metric', 80);
    const value = safeText(metric.value ?? metric.current ?? '', 80);
    return `<li><strong>${escapeHtml(label)}</strong>${value ? `: ${escapeHtml(value)}` : ''}</li>`;
  }).join('');
  return [
    '<div class="app-context-card">',
    `<strong>Context received from ${escapeHtml(c.source_app_label || c.source_app)}</strong>`,
    `<p>${escapeHtml(c.summary || c.title)}</p>`,
    metrics ? `<ul>${metrics}</ul>` : '',
    c.recommended_next_actions.length ? `<p><strong>Next:</strong> ${escapeHtml(c.recommended_next_actions[0])}</p>` : '',
    '</div>'
  ].filter(Boolean).join('');
}

export async function sendContextToCait(raw = {}, options = {}) {
  const context = buildCaitAppContext(raw);
  const opener = options.postToOpener === false ? null : sameOriginOpener();
  const immediateTarget = localChatReturnUrl(null, context, options);
  const immediateMessage = {
    type: 'cait-app-context',
    source: 'cait-app-bridge',
    context,
    app_context_id: '',
    app_context_token: '',
    chat_url: immediateTarget,
    server_record_pending: true
  };
  if (opener) {
    opener.postMessage(immediateMessage, window.location.origin);
  }
  publishCaitAppContextMessage(immediateMessage);
  const serverContextPromise = createServerAppContextWithRetry(context, options).catch((error) => {
    console.warn('CAIt app context server record failed; continuing with browser handoff.', error);
    return null;
  });
  if (opener) {
    const serverContext = await serverContextPromise;
    if (serverContext?.app_context_id) {
      const serverRecordMessage = {
        type: 'cait-app-context-server-record',
        source: 'cait-app-bridge',
        context_id: serverContext.app_context_id,
        app_context_id: serverContext.app_context_id,
        app_context_token: serverContext.app_context_token || '',
        chat_url: localChatReturnUrl(serverContext, context, options)
      };
      opener.postMessage(serverRecordMessage, window.location.origin);
      publishCaitAppContextMessage(serverRecordMessage);
    }
    window.setTimeout(() => {
      try { window.close(); } catch {}
    }, 100);
    return localChatReturnUrl(serverContext, context, options);
  }
  const serverContext = await serverContextPromise;
  const target = localChatReturnUrl(serverContext, context, options);
  if (serverContext?.app_context_id) {
    publishCaitAppContextMessage({
      type: 'cait-app-context-server-record',
      source: 'cait-app-bridge',
      context_id: serverContext.app_context_id,
      app_context_id: serverContext.app_context_id,
      app_context_token: serverContext.app_context_token || '',
      chat_url: target
    });
  }
  if (options.open === false) return target;
  window.location.href = target;
  return target;
}

export function copyContextJson(raw = {}) {
  const context = buildCaitAppContext(raw);
  return navigator.clipboard.writeText(JSON.stringify(context, null, 2));
}

export function downloadContextJson(raw = {}, filename = 'cait-app-context.json') {
  const context = buildCaitAppContext(raw);
  const blob = new Blob([JSON.stringify(context, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function fetchCaitAppContextFromUrl(options = {}) {
  const url = new URL(window.location.href);
  let context = null;
  const serverId = url.searchParams.get('app_context_id') || url.searchParams.get('cait_app_context_id');
  const serverToken = url.searchParams.get('app_context_token') || url.searchParams.get('cait_app_context_token') || url.searchParams.get('token') || '';
  if (serverId) {
    try {
      const origin = caitOrigin(options);
      const fetchUrl = new URL(`/api/app-contexts/${encodeURIComponent(serverId)}`, origin);
      if (serverToken) fetchUrl.searchParams.set('app_context_token', serverToken);
      const response = await fetch(fetchUrl, { credentials: origin === window.location.origin ? 'same-origin' : 'omit' });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data?.app_context?.context) context = buildCaitAppContext(data.app_context.context);
    } catch {}
  }
  if (serverId && options.cleanupUrl !== false) {
    url.searchParams.delete('app_context_id');
    url.searchParams.delete('app_context_token');
    url.searchParams.delete('cait_app_context_id');
    url.searchParams.delete('cait_app_context_token');
    url.searchParams.delete('token');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }
  return context ? buildCaitAppContext(context) : null;
}

export async function consumeCaitAppContextForChat() {
  return fetchCaitAppContextFromUrl();
}

function escapeHtml(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
