import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const htmlPath = new URL('../public/index.html', import.meta.url);
const chatHtmlPath = new URL('../public/chat.html', import.meta.url);
const accountSettingsHtmlPath = new URL('../public/account-settings.html', import.meta.url);
const loginHtmlPath = new URL('../public/login.html', import.meta.url);
const adminHtmlPath = new URL('../public/admin.html', import.meta.url);
const appsHtmlPath = new URL('../public/apps.html', import.meta.url);
const appsJsPath = new URL('../public/apps.js', import.meta.url);
const analyticsHtmlPath = new URL('../public/analytics-console.html', import.meta.url);
const publisherHtmlPath = new URL('../public/publisher-approval.html', import.meta.url);
const leadOpsHtmlPath = new URL('../public/lead-ops.html', import.meta.url);
const campaignOperationsHtmlPath = new URL('../public/campaign-operations.html', import.meta.url);
const adsOpsHtmlPath = new URL('../public/ads-ops.html', import.meta.url);
const growthOpsHtmlPath = new URL('../public/growth-ops.html', import.meta.url);
const pricingOpsHtmlPath = new URL('../public/pricing-ops.html', import.meta.url);
const deliveryManagerHtmlPath = new URL('../public/delivery-manager.html', import.meta.url);
const legalNoticeHtmlPath = new URL('../public/legal-notice.html', import.meta.url);
const tokushohoRedirectHtmlPath = new URL('../public/tokushoho.html', import.meta.url);
const siteMapHtmlPath = new URL('../public/site-map.html', import.meta.url);
const homeCssPath = new URL('../public/home.css', import.meta.url);
const appConsoleCssPath = new URL('../public/app-console.css', import.meta.url);
const adminCssPath = new URL('../public/admin.css', import.meta.url);
const adminJsPath = new URL('../public/admin.js', import.meta.url);
const clientJsPath = new URL('../public/client.js', import.meta.url);
const clientAuthAccessUtilsPath = new URL('../public/client-auth-access-utils.js', import.meta.url);
const clientPaymentRemovalUiPath = new URL('../public/client-payment-removal-ui.js', import.meta.url);
const clientFlexibleToolUtilsPath = new URL('../public/client-flexible-tool-utils.js', import.meta.url);
const clientOpenChatHistoryUtilsPath = new URL('../public/client-open-chat-history-utils.js', import.meta.url);
const clientOpenChatOrderProgressUtilsPath = new URL('../public/client-open-chat-order-progress-utils.js', import.meta.url);
const clientOpenChatPatternGuardUtilsPath = new URL('../public/open-chat-pattern-guard-utils.js', import.meta.url);
const analyticsLoaderPath = new URL('../public/analytics-loader.js', import.meta.url);
const chatJsPath = new URL('../public/chat.js', import.meta.url);
const accountSettingsJsPath = new URL('../public/account-settings.js', import.meta.url);
const connectorGateJsPath = new URL('../public/connector-gate.js', import.meta.url);
const chatSessionStateJsPath = new URL('../public/chat-session-state.js', import.meta.url);
const orderRuntimeJsPath = new URL('../public/order-runtime.js', import.meta.url);
const deliveryRendererJsPath = new URL('../public/delivery-renderer.js', import.meta.url);
const appHandoffGateJsPath = new URL('../public/app-handoff-gate.js', import.meta.url);
const appHandoffTransferJsPath = new URL('../public/app-handoff-transfer.js', import.meta.url);
const appContextGateJsPath = new URL('../public/app-context-gate.js', import.meta.url);
const measurementEvidenceGateJsPath = new URL('../public/measurement-evidence-gate.js', import.meta.url);
const agentProgressViewJsPath = new URL('../public/agent-progress-view.js', import.meta.url);
const appManifestRegistryPath = new URL('../public/app-manifest-registry.js', import.meta.url);
const analyticsJsPath = new URL('../public/analytics-console.js', import.meta.url);
const publisherJsPath = new URL('../public/publisher-approval.js', import.meta.url);
const leadOpsJsPath = new URL('../public/lead-ops.js', import.meta.url);
const campaignOperationsJsPath = new URL('../public/campaign-operations.js', import.meta.url);
const adsOpsJsPath = new URL('../public/ads-ops.js', import.meta.url);
const growthOpsJsPath = new URL('../public/growth-ops.js', import.meta.url);
const pricingOpsJsPath = new URL('../public/pricing-ops.js', import.meta.url);
const deliveryManagerJsPath = new URL('../public/delivery-manager.js', import.meta.url);
const caitAppBridgePath = new URL('../public/cait-app-bridge.js', import.meta.url);
const clientAnalyticsUtilsPath = new URL('../public/client-analytics-utils.js', import.meta.url);
const loginJsPath = new URL('../public/login.js', import.meta.url);
const fastAuthJsPath = new URL('../public/fast-auth.js', import.meta.url);
const chatCssPath = new URL('../public/chat.css', import.meta.url);
const stylesCssPath = new URL('../public/styles.css', import.meta.url);
const chatEnginePath = new URL('../public/chat-engine.js', import.meta.url);
const deliveryActionContractPath = new URL('../public/delivery-action-contract.js', import.meta.url);
const appsDomainPath = new URL('../lib/apps.js', import.meta.url);
const appContextDomainPath = new URL('../lib/app-context.js', import.meta.url);
const workActionRegistryPath = new URL('../public/work-action-registry.js', import.meta.url);
const workIntentResolverPath = new URL('../public/work-intent-resolver.js', import.meta.url);
const workerPath = new URL('../worker.js', import.meta.url);
const httpCorePath = new URL('../lib/http-core.js', import.meta.url);
const authHelpersPath = new URL('../lib/auth-helpers.js', import.meta.url);
const authRoutesPath = new URL('../lib/routes/auth.js', import.meta.url);
const authStatusRoutesPath = new URL('../lib/routes/auth-status.js', import.meta.url);
const accountSessionPath = new URL('../lib/account-session.js', import.meta.url);
const accountEventsPath = new URL('../lib/account-events.js', import.meta.url);
const googleIntegrationPath = new URL('../lib/google-integration.js', import.meta.url);
const emailNotificationsPath = new URL('../lib/email-notifications.js', import.meta.url);
const workflowReconcileStatePath = new URL('../lib/workflow-reconcile-state.js', import.meta.url);
const workflowPlanAssemblyPath = new URL('../lib/workflow-plan-assembly.js', import.meta.url);
const connectorRoutesPath = new URL('../lib/routes/connectors.js', import.meta.url);
const integrationRoutesPath = new URL('../lib/routes/integrations.js', import.meta.url);
const appRoutesPath = new URL('../lib/routes/apps.js', import.meta.url);
const mcpRoutesPath = new URL('../lib/routes/mcp.js', import.meta.url);
const providerIdentityRoutesPath = new URL('../lib/routes/provider-identity.js', import.meta.url);
const feedbackChatRoutesPath = new URL('../lib/routes/feedback-chat.js', import.meta.url);
const chatMemoryRoutesPath = new URL('../lib/routes/chat-memory.js', import.meta.url);
const catalogRoutesPath = new URL('../lib/routes/catalog.js', import.meta.url);
const workOrderRoutesPath = new URL('../lib/routes/work-order.js', import.meta.url);
const orderCreateRoutesPath = new URL('../lib/routes/order-create.js', import.meta.url);
const deliveryRoutesPath = new URL('../lib/routes/deliveries.js', import.meta.url);
const cmoLeaderPath = new URL('../lib/builtin-agents/agents/cmo-leader.js', import.meta.url);
const serverPath = new URL('../server.js', import.meta.url);
const mcpPath = new URL('../lib/mcp.js', import.meta.url);
const httpPolicyPath = new URL('../lib/http-policy.js', import.meta.url);
const publisherContextPath = new URL('../lib/publisher-context.js', import.meta.url);
const wranglerPath = new URL('../wrangler.jsonc', import.meta.url);
const publicHeadersPath = new URL('../public/_headers', import.meta.url);
const agentOrchestrationDisciplinePath = new URL('../docs/AGENT_ORCHESTRATION_DISCIPLINE.md', import.meta.url);
const onboardingPath = new URL('../lib/onboarding.js', import.meta.url);
const seoPagesPath = new URL('../lib/seo-pages.js', import.meta.url);
const naturalLanguageNewsPath = new URL('../public/news/order-natural-language-request.html', import.meta.url);
const feedXmlPath = new URL('../public/feed.xml', import.meta.url);

execFileSync(process.execPath, ['--check', fileURLToPath(chatJsPath)], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', fileURLToPath(connectorGateJsPath)], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', fileURLToPath(chatSessionStateJsPath)], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', fileURLToPath(orderRuntimeJsPath)], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', fileURLToPath(deliveryRendererJsPath)], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', fileURLToPath(appHandoffGateJsPath)], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', fileURLToPath(appHandoffTransferJsPath)], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', fileURLToPath(appContextGateJsPath)], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', fileURLToPath(measurementEvidenceGateJsPath)], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', fileURLToPath(agentProgressViewJsPath)], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', fileURLToPath(appManifestRegistryPath)], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', fileURLToPath(appsJsPath)], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', fileURLToPath(loginJsPath)], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', fileURLToPath(fastAuthJsPath)], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', fileURLToPath(adminJsPath)], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', fileURLToPath(clientJsPath)], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', fileURLToPath(clientFlexibleToolUtilsPath)], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', fileURLToPath(clientOpenChatHistoryUtilsPath)], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', fileURLToPath(clientOpenChatPatternGuardUtilsPath)], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', fileURLToPath(analyticsLoaderPath)], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', fileURLToPath(analyticsJsPath)], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', fileURLToPath(publisherJsPath)], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', fileURLToPath(leadOpsJsPath)], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', fileURLToPath(campaignOperationsJsPath)], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', fileURLToPath(adsOpsJsPath)], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', fileURLToPath(growthOpsJsPath)], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', fileURLToPath(pricingOpsJsPath)], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', fileURLToPath(deliveryManagerJsPath)], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', fileURLToPath(caitAppBridgePath)], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', fileURLToPath(chatEnginePath)], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', fileURLToPath(deliveryActionContractPath)], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', fileURLToPath(appContextDomainPath)], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', fileURLToPath(workActionRegistryPath)], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', fileURLToPath(workIntentResolverPath)], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', fileURLToPath(onboardingPath)], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', fileURLToPath(seoPagesPath)], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', fileURLToPath(mcpPath)], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', fileURLToPath(httpPolicyPath)], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', fileURLToPath(httpCorePath)], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', fileURLToPath(publisherContextPath)], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', fileURLToPath(appRoutesPath)], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', fileURLToPath(accountSettingsJsPath)], { stdio: 'pipe' });

const html = readFileSync(htmlPath, 'utf8');
const chatHtml = readFileSync(chatHtmlPath, 'utf8');
const accountSettingsHtml = readFileSync(accountSettingsHtmlPath, 'utf8');
const loginHtml = readFileSync(loginHtmlPath, 'utf8');
const adminHtml = readFileSync(adminHtmlPath, 'utf8');
const appsHtml = readFileSync(appsHtmlPath, 'utf8');
const appsJs = readFileSync(appsJsPath, 'utf8');
const analyticsHtml = readFileSync(analyticsHtmlPath, 'utf8');
const publisherHtml = readFileSync(publisherHtmlPath, 'utf8');
const leadOpsHtml = readFileSync(leadOpsHtmlPath, 'utf8');
const campaignOperationsHtml = readFileSync(campaignOperationsHtmlPath, 'utf8');
const adsOpsHtml = readFileSync(adsOpsHtmlPath, 'utf8');
const growthOpsHtml = readFileSync(growthOpsHtmlPath, 'utf8');
const pricingOpsHtml = readFileSync(pricingOpsHtmlPath, 'utf8');
const deliveryManagerHtml = readFileSync(deliveryManagerHtmlPath, 'utf8');
const legalNoticeHtml = readFileSync(legalNoticeHtmlPath, 'utf8');
const tokushohoRedirectHtml = readFileSync(tokushohoRedirectHtmlPath, 'utf8');
const siteMapHtml = readFileSync(siteMapHtmlPath, 'utf8');
const homeCss = readFileSync(homeCssPath, 'utf8');
const appConsoleCss = readFileSync(appConsoleCssPath, 'utf8');
const adminCss = readFileSync(adminCssPath, 'utf8');
const adminJs = readFileSync(adminJsPath, 'utf8');
const clientJs = readFileSync(clientJsPath, 'utf8');
const clientAuthAccessUtilsJs = readFileSync(clientAuthAccessUtilsPath, 'utf8');
const clientPaymentRemovalUiJs = readFileSync(clientPaymentRemovalUiPath, 'utf8');
const clientFlexibleToolUtilsJs = readFileSync(clientFlexibleToolUtilsPath, 'utf8');
const clientOpenChatPreorderIntentJs = readFileSync(new URL('../public/client-open-chat-preorder-intent-utils.js', import.meta.url), 'utf8');
const clientOpenChatQuickAnswerJs = readFileSync(new URL('../public/client-open-chat-quick-answer-utils.js', import.meta.url), 'utf8');
const clientOpenChatOrderProgressUtilsJs = readFileSync(clientOpenChatOrderProgressUtilsPath, 'utf8');
const clientOpenChatPatternGuardUtilsJs = readFileSync(clientOpenChatPatternGuardUtilsPath, 'utf8');
const clientAnalyticsUtilsJs = readFileSync(clientAnalyticsUtilsPath, 'utf8');
const analyticsLoaderJs = readFileSync(analyticsLoaderPath, 'utf8');
const chatJs = readFileSync(chatJsPath, 'utf8');
const accountSettingsJs = readFileSync(accountSettingsJsPath, 'utf8');
const connectorGateJs = readFileSync(connectorGateJsPath, 'utf8');
const chatSessionStateJs = readFileSync(chatSessionStateJsPath, 'utf8');
const orderRuntimeJs = readFileSync(orderRuntimeJsPath, 'utf8');
const deliveryRendererJs = readFileSync(deliveryRendererJsPath, 'utf8');
const appHandoffGateJs = readFileSync(appHandoffGateJsPath, 'utf8');
const appHandoffTransferJs = readFileSync(appHandoffTransferJsPath, 'utf8');
const appContextGateJs = readFileSync(appContextGateJsPath, 'utf8');
const measurementEvidenceGateJs = readFileSync(measurementEvidenceGateJsPath, 'utf8');
const agentProgressViewJs = readFileSync(agentProgressViewJsPath, 'utf8');
const appManifestRegistryJs = readFileSync(appManifestRegistryPath, 'utf8');
const appsDomainJs = readFileSync(appsDomainPath, 'utf8');
const appContextDomainJs = readFileSync(appContextDomainPath, 'utf8');
const analyticsJs = readFileSync(analyticsJsPath, 'utf8');
const publisherJs = readFileSync(publisherJsPath, 'utf8');
const leadOpsJs = readFileSync(leadOpsJsPath, 'utf8');
const campaignOperationsJs = readFileSync(campaignOperationsJsPath, 'utf8');
const adsOpsJs = readFileSync(adsOpsJsPath, 'utf8');
const growthOpsJs = readFileSync(growthOpsJsPath, 'utf8');
const pricingOpsJs = readFileSync(pricingOpsJsPath, 'utf8');
const deliveryManagerJs = readFileSync(deliveryManagerJsPath, 'utf8');
const caitAppBridge = readFileSync(caitAppBridgePath, 'utf8');
const loginJs = readFileSync(loginJsPath, 'utf8');
const fastAuthJs = readFileSync(fastAuthJsPath, 'utf8');
const chatEngine = readFileSync(chatEnginePath, 'utf8');
const workActionRegistry = readFileSync(workActionRegistryPath, 'utf8');
const workIntentResolver = readFileSync(workIntentResolverPath, 'utf8');
const chatCss = readFileSync(chatCssPath, 'utf8');
const stylesCss = readFileSync(stylesCssPath, 'utf8');
const worker = readFileSync(workerPath, 'utf8');
const httpCore = readFileSync(httpCorePath, 'utf8');
const authHelpers = readFileSync(authHelpersPath, 'utf8');
const authRoutes = readFileSync(authRoutesPath, 'utf8');
const authStatusRoutes = readFileSync(authStatusRoutesPath, 'utf8');
const accountSession = readFileSync(accountSessionPath, 'utf8');
const accountEvents = readFileSync(accountEventsPath, 'utf8');
const googleIntegration = readFileSync(googleIntegrationPath, 'utf8');
const emailNotifications = readFileSync(emailNotificationsPath, 'utf8');
const workflowReconcileState = readFileSync(workflowReconcileStatePath, 'utf8');
const workflowPlanAssembly = readFileSync(workflowPlanAssemblyPath, 'utf8');
const connectorRoutes = readFileSync(connectorRoutesPath, 'utf8');
const integrationRoutes = readFileSync(integrationRoutesPath, 'utf8');
const mcpRoutes = readFileSync(mcpRoutesPath, 'utf8');
const appRoutes = readFileSync(appRoutesPath, 'utf8');
const providerIdentityRoutes = readFileSync(providerIdentityRoutesPath, 'utf8');
const feedbackChatRoutes = readFileSync(feedbackChatRoutesPath, 'utf8');
const chatMemoryRoutes = readFileSync(chatMemoryRoutesPath, 'utf8');
const catalogRoutes = readFileSync(catalogRoutesPath, 'utf8');
const workOrderRoutes = readFileSync(workOrderRoutesPath, 'utf8');
const orderCreateRoutes = readFileSync(orderCreateRoutesPath, 'utf8');
const deliveryRoutes = readFileSync(deliveryRoutesPath, 'utf8');
const workerAndIntegrationRoutes = `${worker}\n${integrationRoutes}`;
const workerIntegrationDeliveryRoutes = `${worker}\n${integrationRoutes}\n${deliveryRoutes}`;
const workerAndConnectorRoutes = `${worker}\n${connectorRoutes}\n${integrationRoutes}`;
const cmoLeader = readFileSync(cmoLeaderPath, 'utf8');
const server = readFileSync(serverPath, 'utf8');
const mcp = readFileSync(mcpPath, 'utf8');
const httpPolicy = readFileSync(httpPolicyPath, 'utf8');
const publisherContext = readFileSync(publisherContextPath, 'utf8');
const wrangler = readFileSync(wranglerPath, 'utf8');
const publicHeaders = readFileSync(publicHeadersPath, 'utf8');
const agentOrchestrationDiscipline = readFileSync(agentOrchestrationDisciplinePath, 'utf8');
const onboardingJs = readFileSync(onboardingPath, 'utf8');
const seoPages = readFileSync(seoPagesPath, 'utf8');
const naturalLanguageNewsHtml = readFileSync(naturalLanguageNewsPath, 'utf8');
const feedXml = readFileSync(feedXmlPath, 'utf8');
const {
  createClientOpenChatHistoryUtils
} = await import(clientOpenChatHistoryUtilsPath.href);
const {
  connectorGateAuthorityHandledBySaasHandoff,
  connectorGateAuthorityIsActionable,
  connectorGateAuthorityNeedsApproval
} = await import(connectorGateJsPath.href);
const {
  appContextMatchesManifest,
  appContextStatusForDraft
} = await import(appContextGateJsPath.href);
const {
  explicitHandoffArtifactTypesFromAuthorityRequest
} = await import(appHandoffGateJsPath.href);
const {
  appContextFromTransferPayload
} = await import(appHandoffTransferJsPath.href);
const {
  normalizeCaitAppContext
} = await import(appContextDomainPath.href);
const appSurfaceSources = [
  appsHtml,
  appsJs,
  analyticsHtml,
  analyticsJs,
  publisherHtml,
  publisherJs,
  leadOpsHtml,
  leadOpsJs,
  campaignOperationsHtml,
  campaignOperationsJs,
  adsOpsHtml,
  adsOpsJs,
  growthOpsHtml,
  growthOpsJs,
  pricingOpsHtml,
  pricingOpsJs,
  deliveryManagerHtml,
  deliveryManagerJs,
  caitAppBridge
].join('\n');

assert.equal(existsSync(fileURLToPath(new URL('../public/chatux/', import.meta.url))), false, '/chatux static directory should be removed');

assert.ok(html.includes('<main class="home-shell" aria-label="CAIt landing page">'), 'Root page should be the public landing page.');
assert.ok(html.includes('Anyone can create high-quality AI agent output'), 'Root should lead with anyone-can-create-high-quality-output positioning.');
assert.ok(html.includes('Beta access is free'), 'English root should disclose the beta free-access state in English.');
assert.ok(html.includes('CAIt no longer collects cards, checkout, billing, subscriptions, donations, or payouts in-app'), 'English root should disclose in-app payment removal.');
assert.ok(html.includes('an external Stripe donation link is only a future option after compliance review'), 'English root should disclose reviewed external donation posture.');
assert.ok(!html.includes('β版は無料開放中'), 'English root beta banner should not render Japanese-only copy.');
assert.ok(emailNotifications.includes("const SIGNUP_WELCOME_EMAIL_TEMPLATE = 'signup_welcome_v2'"), 'signup welcome email should use the current template version.');
assert.ok(emailNotifications.includes('Welcome to CAIt: start in Chat'), 'signup welcome email should point new users to Chat, not the old Work entry.');
assert.ok(emailNotifications.includes('https://aiagent-marketplace.net/chat'), 'signup welcome email should link to Chat.');
assert.ok(emailNotifications.includes('Publisher & Approval Studio'), 'signup welcome email should mention Publisher for approval-gated publishing.');
assert.ok(emailNotifications.includes('Campaign Operations'), 'signup welcome email should mention the current campaign operations surface.');
assert.ok(emailNotifications.includes('Live checkout, charges, and payout movement are paused during beta'), 'signup welcome email should disclose beta billing pause.');
assert.ok(!emailNotifications.includes('Open <strong>WORK</strong>'), 'signup welcome email should not reference the old WORK-first flow.');
assert.ok(!emailNotifications.includes('https://aiagent-marketplace.net/work'), 'signup welcome email should not link to the old work route.');
assert.ok(workActionRegistry.includes('Use Chat history and Deliveries for order history and delivery review.'), 'work command copy should point order history to Chat history and Deliveries.');
assert.ok(workActionRegistry.includes('Opening saved schedules and campaign operations context.'), 'marketing timeline copy should mention current schedule/campaign operations surfaces.');
assert.ok(!workActionRegistry.includes('Go to the WORK tab for order history and delivery.'), 'work command copy should not send users to the old WORK tab.');
assert.ok(onboardingJs.includes('Open Chat and describe the first outcome'), 'agent onboarding next action should point first runs to Chat.');
assert.ok(!onboardingJs.includes('Open WORK and create a run'), 'agent onboarding should not reference the old WORK run flow.');
assert.ok(seoPages.includes('Open Chat, write the desired outcome'), 'generated news source should use the current Chat-first ordering copy.');
assert.ok(naturalLanguageNewsHtml.includes('Open Chat, write the desired outcome'), 'published news article should use the current Chat-first ordering copy.');
assert.ok(feedXml.includes('Open Chat, write the desired outcome'), 'public feed should use the current Chat-first ordering copy.');
assert.ok(clientJs.includes('Saved schedule timeline'), 'client timeline copy should use the current saved schedule wording.');
assert.ok(!clientJs.includes('Open the stored Work timeline'), 'client timeline copy should not use the old Work timeline phrase.');
assert.ok(!clientJs.includes('reopen them from Work'), 'client timeline copy should not send users back to the old Work surface.');
assert.ok(html.includes('scheduled work continue in the background'), 'Root should mention background scheduled work as supporting value, not the primary headline.');
assert.ok(html.includes('/home.css?v=20260504b'), 'Root should load the home landing CSS.');
assert.ok(html.includes('<p class="hero-read">'), 'Root hero should include a short read line between the catch and START.');
assert.ok(html.includes('href="/login?next=%2Fchat&amp;source=start"'), 'Root START should send users to the dedicated login screen.');
assert.ok(!html.includes('/auth/google?return_to=%2Fchat.html'), 'Root should not embed provider login buttons or OAuth links.');
assert.ok(html.includes('class="primary-action start-action"'), 'Root should expose one prominent START action.');
assert.equal((html.match(/class="primary-action/g) || []).length, 1, 'Root should only have one prominent primary action.');
assert.ok(!html.includes('href="/chat.html"'), 'Root should not link directly to chat; START should go through the dedicated login screen.');
assert.ok(html.includes('<nav class="home-links" aria-label="CAIt pages">'), 'Root should expose the common public navigation in the landing header.');
assert.ok(html.includes('href="/login?next=%2Fchat&amp;source=nav"'), 'Root header Chat link should route through login.');
assert.ok(html.includes('href="/apps.html"'), 'Root should expose the new CAIt app hub.');
assert.ok(html.includes('href="/delivery-manager.html"'), 'Root header should expose the built-in Deliveries feature.');
assert.ok(html.includes('href="/legal-notice.html"'), 'Root footer should link to the legal notice disclosure.');
assert.ok(html.includes('Legal Notice (SCTA)'), 'Root footer should use a concise global legal notice label.');
assert.ok(!html.includes('href="/tokushoho.html"'), 'Root footer should not use the Japanese romanized legal notice URL.');
assert.ok(legalNoticeHtml.includes('株式会社ビジネスラボ'), 'Legal notice disclosure should show the legal seller name.');
assert.ok(legalNoticeHtml.includes('6120901008074'), 'Legal notice disclosure should show the corporate number.');
assert.ok(legalNoticeHtml.includes('東京都中央区銀座1丁目12番4号'), 'Legal notice disclosure should show the registered address.');
assert.ok(legalNoticeHtml.includes('Act on Specified Commercial Transactions'), 'Legal notice disclosure should include the official English act name.');
assert.ok(legalNoticeHtml.includes('Business Labo Co., Ltd.'), 'Legal notice disclosure should include English seller context.');
assert.ok(legalNoticeHtml.includes('Cancellation and Refunds'), 'Legal notice disclosure should include English field labels.');
assert.ok(legalNoticeHtml.includes('https://aiagent-marketplace.net/legal-notice.html'), 'Legal notice should canonicalize to the English URL.');
assert.ok(tokushohoRedirectHtml.includes('/legal-notice.html'), 'Old tokushoho URL should redirect to the English legal notice URL.');
assert.ok(siteMapHtml.includes('https://aiagent-marketplace.net/legal-notice.html'), 'Site map structured data should use the English legal notice URL.');
assert.ok(siteMapHtml.includes('href="/legal-notice.html"'), 'Site map HTML should use the English legal notice URL.');
assert.ok(!html.includes('id="promptInput"'), 'Root should not render the chat composer.');
assert.ok(!html.includes('type="module" src="/chat.js'), 'Root should not load chat JS.');
assert.ok(chatHtml.includes('<main class="chatux-shell" aria-label="CAIt chat">'), 'Chat page should render the chat-first CAIt UI.');
assert.ok(chatHtml.includes('/analytics-loader.js?v=20260514a'), 'Chat page should load the shared GA4 analytics loader before chat interactions.');
assert.ok(/\/chat\.css\?v=202605[0-9]{2}[a-z0-9]+/.test(chatHtml), 'Chat page should load root chat CSS, not /chatux assets.');
assert.ok(/type="module"\s+src="\/chat\.js\?v=202605[0-9]{2}[a-z0-9]+"/.test(chatHtml), 'Chat page should load root chat JS, not /chatux assets.');
assert.ok(chatHtml.includes('What do you want done?'), 'Chat should open with a short English prompt instead of a long routing explanation.');
assert.ok(!chatHtml.includes('何がしたいですか？'), 'Chat should not default to Japanese copy.');
assert.ok(!chatHtml.includes('CAIt will route simple work'), 'Chat should not lead with routing mechanics.');
assert.ok(chatHtml.includes('id="chatThread"'));
assert.ok(chatHtml.includes('id="promptInput"'));
assert.ok(chatHtml.includes('id="chatSessionSidebar"'), 'Chat should render a left chat session sidebar.');
assert.ok(chatHtml.includes('id="chatSessionList"'), 'Chat should render a restorable chat session list.');
assert.ok(chatHtml.includes('id="newChatBtn"'), 'Chat should expose a New chat action in the session sidebar.');
assert.ok(chatHtml.includes('id="openScheduleBtn"'), 'Chat should expose a compact schedule button.');
assert.ok(chatHtml.includes('id="openScheduleComposerBtn"'), 'Chat should expose scheduled work next to the chat composer.');
assert.ok(chatHtml.includes('chatux-nav'), 'Chat should expose links to existing pages.');
assert.ok(chatHtml.includes('href="/delivery-manager.html"'), 'Chat header should link to the built-in Deliveries feature.');
assert.ok(chatHtml.includes('href="/admin" id="adminNavLink" hidden'), 'Chat should expose an admin link only when admin auth reveals it.');
assert.ok(chatJs.includes('appendThinkingMessage'), 'Chat should show a transient thinking state while OpenAI intent classification is running.');
assert.ok(chatJs.includes('Thinking...'), 'Chat thinking state should use English copy on the English chat page.');
assert.ok(chatJs.includes('removeMessage(thinkingMessage)'), 'Chat should remove the transient thinking state after OpenAI returns or fails.');
assert.ok(!chatJs.includes('prepareAccumulatedOrderIfReady'), 'Chat must not synthesize accumulated work-order prompts from client-side conversation heuristics.');
assert.ok(!chatJs.includes('accumulatedWorkOrderReadiness'), 'OpenAI intent and server prepare-order contracts should own readiness, not chat regexes.');
assert.ok(!chatJs.includes('Conversation-derived work request:'), 'Chat must not create client-owned work request briefs from previous turns.');
assert.ok(!chatJs.includes('prepareObviousStepIntakeIfNeeded'), 'Chat must not short-circuit specialist intake with client-side domain heuristics.');
assert.ok(!chatJs.includes('obviousStepIntakeSpecialistTaskType'), 'Chat must let OpenAI intent and server prepare-order contracts own short executable request routing.');
assert.ok(!chatJs.includes('bestCatalogLeaderTaskTypeForSpecialistTask') && !chatJs.includes('leaderDownstreamTaskTypesFromAgent'), 'Short intake should let server prepare-order choose the route instead of client catalog branching.');
assert.ok(!chatJs.includes("return 'cmo_leader'"), 'Chat should not hardcode a CMO leader for acquisition intake.');
assert.ok(!chatJs.includes('Do not ask another pre-order intake question just because the CTA is weak.'), 'Client chat must not inject agent planning assumptions into generated order briefs.');
assert.ok(!chatJs.includes('Use the assigned agent contract for the concrete delivery shape'), 'Client chat must not generate accumulated-context order instructions.');
assert.ok(!chatJs.includes('Produce concrete next actions and any approval-ready drafts or SaaS handoff artifacts'), 'Accumulated-context order prep must leave delivery and approval packet shape to the assigned agent contract.');
assert.ok(!chatJs.includes('function leaderTaskTypeFromIntentResult'), 'Chat must not re-parse user text or LLM prose to invent leader routing.');
assert.ok(!chatJs.includes('automaticLeaderTaskType'), 'Chat leader routing should come from explicit selection, locked owner, or server-returned contracts.');
assert.ok(chatJs.includes('taskTypeFromOpenChatIntent'), 'Open chat natural intents should enter normal server-owned order intake instead of freeform clarification loops.');
assert.ok(chatJs.includes('openChatIntentShouldUseStepIntake'), 'Executable OpenAI clarification intents should hand off to step-by-step intake.');
const chatIntentWithLlmSource = chatJs.slice(chatJs.indexOf('async function handleChatIntentWithLlm'), chatJs.indexOf('function addChatAdjustmentToDraft'));
assert.ok(chatIntentWithLlmSource.includes('preserveAgentOwnedLeaderIntake'), 'OpenAI intake results for leaders should preserve agent-owned intake questions.');
assert.ok(chatIntentWithLlmSource.includes('await prepareOrder(prompt') && !chatIntentWithLlmSource.includes("questionSource: 'openai'"), 'Chat must let server/agent-owned leader intake render questions instead of storing OpenAI questions directly.');
const clientPreorderIntentBoundarySource = [
  clientJs,
  clientOpenChatPreorderIntentJs
].join('\n');
assert.ok(clientPreorderIntentBoundarySource.includes('openChatServerLeaderIntakeGuardAnswer') && clientPreorderIntentBoundarySource.includes('prepareWorkOrderViaApi'), 'Legacy Open Chat LLM leader intake must delegate to server/agent-owned prepare-order contracts.');
assert.ok(!clientPreorderIntentBoundarySource.includes('dynamicIntakeQuestions: dynamicQuestions'), 'Legacy Open Chat must not render OpenAI-provided leader intake questions directly.');
const prepareOrderSource = chatJs.slice(chatJs.indexOf('async function prepareOrder'), chatJs.indexOf('async function sendOrder'));
assert.ok(prepareOrderSource.includes('Server-owned order intake questions could not be loaded'), 'Prepare-order failures should stop instead of falling back to client-generated intake questions.');
assert.ok(!chatJs.includes('clientPrepareOrderIntakeFallback'), 'Chat must not synthesize fallback intake contracts when prepare-order fails.');
assert.ok(!chatJs.includes("questionSource: 'client_fallback'"), 'Chat must not label client-generated intake as a fallback contract.');
assert.ok(!chatJs.includes("if (intent === 'natural_business_growth' || intent === 'natural_marketing_launch') return 'growth';"), 'Business-growth intent should not map to a task type in chat; prepare-order owns routing.');
assert.ok(chatJs.includes('intakeGroupOrder'), 'Step-by-step intake should use a stable question order instead of incidental regex insertion order.');
assert.ok(chatJs.indexOf("['goal', 3]") < chatJs.indexOf("['audience', 4]"), 'Growth intake should ask goal/conversion before target audience.');
assert.ok(chatJs.indexOf("['constraints', 5]") < chatJs.indexOf("['deliverable', 7]"), 'Growth intake should ask constraints/channels before output format.');
assert.ok(chatJs.includes('conversationLanguage'), 'Chat should remember the language of the first user input for the conversation.');
assert.ok(chatJs.includes('rememberConversationLanguage(prompt)'), 'Chat should set the conversation language from the first submitted prompt.');
assert.ok(chatJs.includes('PROMPT_PLACEHOLDERS'), 'Chat composer placeholders should be able to follow the selected UI language.');
assert.ok(chatJs.includes('CHATUX_UI_LANGUAGE_STORAGE_KEY'), 'Chat should persist the explicit UI language setting.');
assert.ok(chatJs.includes("api('/api/settings/profile'"), 'Chat language setting should save to the account profile API.');
assert.ok(chatJs.includes('will ask one item at a time before dispatch'), 'Leader intake should ask one item at a time instead of dumping all questions at once.');
const clientOpenChatTaskLabelSource = [
  clientJs,
  clientOpenChatPatternGuardUtilsJs
].join('\n');
assert.equal((clientOpenChatTaskLabelSource.match(/seo_specialist:\s*'SEO Specialist'/g) || []).length, 1, 'Open chat task labels should not keep duplicate seo_specialist entries.');
const clientMarketingAgentListAnswer = [
  clientJs.slice(
    clientJs.indexOf('function buildOpenChatMarketingAgentListAnswer'),
    clientJs.indexOf('function buildOpenChatLeaderCatalogAnswer')
  ),
  clientOpenChatQuickAnswerJs
].join('\n');
assert.ok(clientMarketingAgentListAnswer.includes('registered agent manifests'), 'Marketing agent list chat answer should point at registered manifests.');
assert.ok(!/(Launch Team Leader|GROWTH OPERATOR AGENT|DIRECTORY SUBMISSION AGENT|ACQUISITION AUTOMATION AGENT|INSTAGRAM LAUNCH AGENT|X OPS CONNECTOR AGENT)/.test(clientMarketingAgentListAnswer), 'Client marketing agent list must not define sample-agent names or capabilities.');
assert.ok(!/OAuth連携後は確認付きで投稿する|can post after X OAuth plus explicit confirmation/.test(clientMarketingAgentListAnswer), 'Client marketing agent list must not claim agent-specific external execution behavior.');
const clientReusableToolsAnswer = clientJs.slice(
  clientJs.indexOf('function buildOpenChatReusableToolsAnswer'),
  clientJs.indexOf('function openChatLooksShortPromptSource')
);
assert.ok(!/action:\s*'connect_x'|CONNECT X|X連携/.test(clientReusableToolsAnswer), 'Reusable chat tools must not expose X OAuth from chat.');
const clientFlexibleToolCandidates = clientFlexibleToolUtilsJs.slice(
  clientFlexibleToolUtilsJs.indexOf('function flexibleToolCandidates'),
  clientFlexibleToolUtilsJs.indexOf('function activeFlexibleTool')
);
assert.ok(clientFlexibleToolCandidates.includes('Social publishing handoff'), 'Social publishing hints should point to SaaS/app handoff.');
assert.ok(!/title:\s*'X Ops Connector'|action:\s*'connect_x'|action:\s*'post_current_to_x'|POST EXACT TEXT|DRAFT ONLY|connected X account|Connect your X account with OAuth first/.test(clientFlexibleToolCandidates), 'Flexible social publishing tools must not expose direct X OAuth or posting actions.');
assert.ok(clientJs.includes("from './client-delivery-files.js?v=20260526b'"), 'Legacy client should load the explicit-contract delivery file parser cache key.');
assert.ok(!clientJs.includes('function postCurrentComposerToX'), 'Client chat must not post composer text directly to X.');
assert.ok(!clientJs.includes("'/api/connectors/x/post'"), 'Client chat must not call the X posting endpoint directly.');
assert.ok(!workActionRegistry.includes("post_current_to_x: { kind: 'executor' }"), 'Work action registry must not expose direct chat-to-X execution.');
assert.ok(chatJs.includes('growthLeaderNeedsDataHint'), 'Growth leader intake should point users toward connectors or source URLs instead of asking repeated data questions.');
assert.ok(chatJs.includes('Connected Google analytics can be attached'), 'Growth order checks should surface connected Google analytics instead of silently skipping it.');
assert.ok(chatJs.includes('Analytics was skipped for this prepared order'), 'Growth order checks should allow an explicit analytics skip only when the user chooses it.');
assert.equal(existsSync(new URL('../lib/billing-helpers.js', import.meta.url)), false, 'Billing helpers should be removed with in-app payment processing.');
assert.equal(existsSync(new URL('../lib/routes/billing.js', import.meta.url)), false, 'Billing routes should be removed with in-app payment processing.');
assert.equal(existsSync(new URL('../public/in-app-payments-policy.js', import.meta.url)), false, 'Client payment policy shim should be removed with in-app payment processing.');
assert.ok(clientPaymentRemovalUiJs.includes('IN_APP_PAYMENTS_REMOVED = true'), 'Client payment handling should keep a hard payment-removal flag.');
assert.ok(clientPaymentRemovalUiJs.includes('PAYMENT_PROVIDER_UI_VISIBLE = false'), 'Client payment handling should hide payment-provider controls.');
assert.ok(clientJs.includes('DONATION_ONLY_NOTICE'), 'Settings UI should explain donation-only support outside CAIt.');
assert.equal(clientJs.includes('/api/stripe/'), false, 'Client UI must not call removed Stripe routes.');
assert.equal(clientJs.includes('/api/settings/billing'), false, 'Client UI must not call removed billing settings route.');
assert.equal(clientJs.includes('/api/settings/payout'), false, 'Client UI must not call removed payout settings route.');
assert.equal(clientJs.includes('PAY' + '.JP'), false, 'Client UI should not mention the removed payment provider.');
assert.ok(clientAuthAccessUtilsJs.includes("if (requested.length) url.searchParams.set('capabilities', requested.join(','))"), 'Chat Google connector should pass exact required Google capabilities into OAuth without adding broad defaults.');
assert.ok(clientJs.includes("data-connector-capabilities"), 'Connector action buttons should carry the exact capability requested by the blocked action.');
assert.ok(chatJs.includes("from './connector-gate.js"), 'Chat connector approvals should be delegated to the connector gate module.');
assert.ok(connectorGateJs.includes('connectorGateGoogleAuthorityConnectGroups'), 'Chat Google approval should connect every requested Google source in one OAuth popup.');
assert.ok(connectorGateJs.includes('Connect GA4 + Search Console'), 'Chat Google approval should label combined GA4/Search Console requests clearly.');
assert.ok(chatJs.includes('function authorityRequestHandledBySaasHandoffInChat'), 'Chat should treat X/social publishing authority requests as SaaS handoffs, not chat approvals.');
assert.ok(connectorGateJs.includes('explicitSaasHandoffSignals'), 'SaaS handoff waits should be detected from structured authority_request fields.');
assert.ok(!connectorGateJs.includes('request.reason, request.summary, request.message'), 'SaaS handoff waits must not be inferred from free-text authority_request reason copy.');
assert.ok(!connectorGateJs.includes('/(approval|approve|connector|required|missing|connect|confirm|publish|send|post|承認|接続|未接続|確認|投稿|送信|必要)/i.test(reason)'), 'Connector approval cards must not be inferred from authority_request reason copy.');
assert.equal(
  connectorGateAuthorityNeedsApproval({ reason: 'Connect GitHub before publishing this post.' }),
  false,
  'Reason-only authority_request objects must not become approval waits.'
);
assert.equal(
  connectorGateAuthorityIsActionable({ status: 'blocked' }, { reason: '承認が必要です。' }),
  false,
  'Reason-only authority_request objects must not render chat approval cards.'
);
assert.equal(
  connectorGateAuthorityNeedsApproval({ missing_connectors: ['github'], reason: 'Connect GitHub before publishing.' }),
  true,
  'Structured missing connector authority_request objects should still become approval waits.'
);
assert.equal(
  connectorGateAuthorityHandledBySaasHandoff({ missing_connectors: ['x'], missing_connector_capabilities: ['x.post'], reason: 'Connect X.' }),
  true,
  'Structured X authority_request objects should still route to the SaaS handoff path.'
);
assert.ok(chatJs.includes('jobBlockedForSaasHandoff(job)'), 'SaaS handoff blockers should render as delivery/app-handoff states.');
assert.ok(chatJs.includes('function sanitizeDeliveryMarkdownForUser'), 'Chat delivery rendering should sanitize internal workflow prompt text before display or download.');
assert.ok(chatJs.includes('sanitizeDeliveryFileForUser(file'), 'Chat delivery file cards should register sanitized files, not raw provider markdown.');
assert.ok(!chatJs.includes('sanitizeDeliveryMarkdownForUser(cleanReadableBundleContent'), 'Chat delivery must not generate readable delivery bundles from internal handoff files.');
assert.ok(chatJs.includes('USER_DELIVERY_INTERNAL_MARKERS'), 'Chat delivery sanitization should cover workflow handoff and prior specialist markers.');
assert.ok(chatJs.includes('deliveryLineLooksInternal'), 'Chat delivery sanitization should remove provider implementation self-reporting lines.');
assert.ok(appHandoffTransferJs.includes('export function appHandoffSocialPostDraftFromDeliveryFiles'), 'App handoff transfer should own social post draft extraction for dedicated handoff cards.');
assert.ok(chatJs.includes('appHandoffSocialPostDraftFromDeliveryFiles(orderedFiles, { maxLength: 1200 })'), 'Chat should route explicit X/social post packs into X Client Ops through the app handoff transfer module.');
assert.ok(appManifestRegistryJs.includes('x_post_packet') && appManifestRegistryJs.includes('reddit_post_packet') && appManifestRegistryJs.includes('indie_hackers_packet') && appManifestRegistryJs.includes('instagram_post_packet'), 'Publisher app handoff should accept media-separated site and social post packets as external-app content.');
assert.ok(appManifestRegistryJs.includes('publisher_packet') && appManifestRegistryJs.includes('content_package'), 'Publisher app handoff should accept AIAGENT publisher packet aliases.');
assert.ok(appHandoffGateJs.includes("publisher_packet: ['site_publish_packet'") && appHandoffGateJs.includes("content_package: ['site_publish_packet'"), 'Publisher packet aliases should route into the Publisher handoff candidate.');
assert.ok(!chatJs.includes("normalizeUsageId(entry.id) === 'x-client-ops' && hasXPostTool"), 'X Client Ops must remain visible as an app handoff when a post draft exists.');
assert.ok(!chatJs.includes('Resume X approval'), 'Chat must not expose the old X approval resume action.');
assert.ok(!chatJs.includes('href="${escapeHtml(openWorkHref)}"'), 'Open chat approval must not be a no-op anchor back to the same card.');
assert.ok(connectorGateJs.includes('approvalWaitingStatuses') && connectorGateJs.includes("approvalWaitingStatuses.has(status)"), 'Future leader execution approval hints should only render as active chat approvals for blocked/waiting approval states.');
assert.ok(connectorGateJs.includes("leader_quality_gate_failed") && connectorGateJs.includes("return false;"), 'Leader quality gate blockers must not render as connector approval cards.');
assert.ok(chatJs.includes('function jobHasDeliveryResult') && chatJs.includes('jobBlockedByLeaderQualityGate(job)'), 'Leader quality gate blockers should render as failed delivery/retry states, not active waiting states.');
assert.ok(chatJs.includes('nextProgressPollAt = Date.now() + retryDelayMs'), 'Chat polling should retry transient 503-style failures without stopping the order.');
assert.ok(!chatJs.includes('Progress check temporarily failed'), 'Transient progress errors should not be posted into chat as worker-log noise.');
assert.ok(chatJs.includes('measurementEvidenceAnswerSaysAvailable as answerSaysAnalyticsAvailable'), 'Chat intake should delegate GA4/Search Console availability detection to the measurement evidence gate.');
assert.ok(chatJs.includes("from './app-context-gate.js"), 'Chat app-context matching should be delegated to the app context gate module.');
assert.ok(chatJs.includes("from './measurement-evidence-gate.js"), 'Chat measurement evidence routing should be delegated to the measurement evidence gate module.');
assert.ok(appContextGateJs.includes('appContextMatchesManifest'), 'App context gate should own manifest-based app context matching.');
assert.ok(appContextGateJs.includes('appContextStatusForDraft'), 'App context gate should own draft app-context status extraction.');
assert.ok(measurementEvidenceGateJs.includes('export function measurementEvidenceAppManifest'), 'Measurement evidence gate should own manifest-based app selection.');
assert.ok(measurementEvidenceGateJs.includes('export function measurementEvidenceContractRequired'), 'Measurement evidence gate should own explicit context requirement detection.');
assert.ok(measurementEvidenceGateJs.includes('export function measurementEvidenceTextExplicitlyRequests'), 'Measurement evidence gate should own explicit user GA4/Search Console request detection.');
assert.ok(appManifestRegistryJs.includes('contextContract'), 'Measurement evidence app matching should be declared in the app manifest.');
assert.ok(chatJs.includes('contextContract: app.contextContract || app.context_contract || manifest.contextContract || manifest.context_contract || null'), 'Chat app manifest normalization should preserve app context contracts.');
assert.ok(chatJs.includes('contextContract: { ...(existing.contextContract || {}), ...(normalized.contextContract || {}) }'), 'Chat app manifest merging should not drop app context contracts.');
assert.ok(measurementEvidenceGateJs.includes('export function measurementEvidenceContractRequired'), 'Chat should gate measurement evidence app prompts on explicit draft/server contracts.');
assert.ok(measurementEvidenceGateJs.includes('export function measurementEvidenceTextExplicitlyRequests'), 'Chat should allow explicit GA4/Search Console user requests without broad task inference.');
assert.ok(!chatJs.includes('function orderNeedsMeasurementEvidence'), 'Chat must not infer measurement app needs from task/prompt tokens.');
assert.ok(!chatJs.includes('function intakeShouldOfferMeasurementEvidenceChoice'), 'Chat must not offer analytics app choices from broad growth/SEO intent.');
assert.ok(!measurementEvidenceGateJs.includes('seo|cvr|conversion'), 'Measurement evidence routing must not use SEO/CVR/conversion prompt heuristics.');
assert.ok(!measurementEvidenceGateJs.includes('inferWorkIntentTaskType(prompt)'), 'Measurement evidence routing must not use chat task inference to show app surfaces.');
const analyticsContextManifest = {
  id: 'analytics-console',
  name: 'Analytics Console',
  capabilities: ['analytics_context'],
  requiredConnectors: ['google'],
  inputContract: { accepts: ['metrics', 'search_queries'] },
  contextContract: {
    sourceApps: ['analytics_console'],
    connectorProviders: ['google'],
    connectorServices: ['ga4', 'gsc'],
    evidence: {
      loadedFlags: ['googleReportLoaded'],
      loadedArtifactTypes: ['google_report_status']
    }
  }
};
assert.equal(
  appContextMatchesManifest({
    source_app: 'publisher_approval_studio',
    artifacts: [{ type: 'metrics', loaded: true }]
  }, analyticsContextManifest),
  false,
  'App context matching must not downgrade contextContract apps to generic metrics token matching.'
);
assert.equal(
  appContextStatusForDraft({
    input: {
      _broker: {
        appContexts: [{
          source_app: 'analytics_console',
          raw_context: { googleReportLoaded: true, connector_provider: 'google', connector_services: ['ga4'] },
          artifacts: [{ type: 'google_report_status', rows: [{ loaded: true }] }]
        }]
      }
    }
  }, analyticsContextManifest).loaded,
  true,
  'App context gate should mark manifest-matched loaded evidence as loaded.'
);
assert.equal(
  appContextMatchesManifest({
    source_app: 'qa_publisher_packet_agent',
    raw_context: {
      publisher_packet: { title: 'Retained Publisher packet' }
    }
  }, {
    id: 'publisher-approval-studio',
    name: 'Publisher & Approval Studio',
    capabilities: ['content_management'],
    inputContract: { accepts: ['publisher_packet', 'site_publish_packet'] }
  }),
  true,
  'App context matching should include raw contract keys such as publisher_packet.'
);
assert.ok(chatJs.includes('openMeasurementEvidenceAppForIntake'), 'Chat intake should open the manifest-matched evidence app before dispatch when analytics data is available.');
assert.ok(chatJs.includes('openMeasurementEvidenceAppForDraft'), 'Chat order checks should open the manifest-matched evidence app and attach returned context to the prepared draft.');
assert.ok(chatJs.includes('attachAppContextToDraft'), 'Returned app context should attach to the current draft instead of only filling the composer.');
assert.ok(chatJs.includes('choose the GA4 property and Search Console site'), 'Chat should instruct users to identify the exact analytics account, property, and site.');
assert.ok(chatJs.includes('intakeHasMeasurementEvidenceQuestion(intake)') && chatJs.includes("action: 'app-context-use'"), 'Chat intake should render measurement evidence choices from the generic intake choice group path.');
assert.ok(chatJs.includes('data-chat-action="app-context-use"'), 'Chat intake should include a manifest-neutral button to use GA4/Search Console.');
assert.ok(chatJs.includes('data-chat-action="app-context-skip"'), 'Chat intake should include a manifest-neutral button to skip GA4/Search Console.');
assert.ok(!chatJs.includes("new URL('/analytics-console.html'"), 'Chat should not hard-code the Analytics Console fallback URL; use the app manifest launch URL.');
assert.ok(!chatJs.includes("appManifestById('analytics-console')"), 'Measurement evidence app selection must not fall back to a privileged hard-coded app id.');
assert.ok(!chatJs.includes("|| 'Analytics Console'"), 'Measurement evidence app copy should come from the selected app manifest.');
const intakeChoiceHandlerSource = chatJs.slice(chatJs.indexOf("const intakeChoiceButton = event.target.closest('[data-intake-choice]');"), chatJs.indexOf("const button = event.target.closest('[data-chat-action]');"));
assert.ok(
  intakeChoiceHandlerSource.indexOf('appendIntakeChoiceToComposer(group, label);') < intakeChoiceHandlerSource.indexOf("if (action === 'app-context-use')"),
  'Analytics intake choices should fill the answer composer before opening Analytics Console.'
);
assert.ok(chatJs.includes('singleChoice: config.singleChoice === true'), 'Intake groups should be able to declare mutually exclusive answers.');
assert.ok(chatJs.includes("{ singleChoice: true }"), 'Analytics availability intake should be a single-choice group.');
assert.ok(chatJs.includes("data-choice-mode=\"${group.singleChoice ? 'single' : 'multiple'}\""), 'Intake cards should expose whether a group is single- or multi-choice.');
assert.ok(chatJs.includes('function resetIntakeChoiceGroup'), 'Single-choice intake groups should clear stale composer and confirmed answers.');
assert.ok(
  intakeChoiceHandlerSource.indexOf("if (groupElement?.dataset.choiceMode === 'single') resetIntakeChoiceGroup(groupElement, group);") < intakeChoiceHandlerSource.indexOf('appendIntakeChoiceToComposer(group, label);'),
  'Single-choice intake selection should clear conflicting answers before writing the new answer.'
);
assert.ok(chatJs.includes('function findIntakeChoiceGroupElement'), 'Returned app context should locate the active intake group before updating composer state.');
const inboundAppContextSource = chatJs.slice(chatJs.indexOf('async function handleInboundAppContext'), chatJs.indexOf('function handleInboundAppContextServerRecord'));
assert.ok(
  inboundAppContextSource.indexOf('resetIntakeChoiceGroup(contextGroupElement, contextGroupName);') < inboundAppContextSource.indexOf('appendIntakeChoiceToComposer(contextGroupName, contextChoice);'),
  'Returned Analytics Console context should replace stale analytics intake choices before writing the concrete context answer.'
);
assert.ok(
  inboundAppContextSource.includes('setIntakeConfirmedChoice(contextGroupElement, contextGroupName, contextChoice);'),
  'Returned Analytics Console context should also refresh the confirmed intake choice UI.'
);
assert.ok(chatJs.includes('intakeChoiceGroups'), 'Chat intake should use generic concrete choice groups, not one-off question cards.');
assert.ok(chatJs.includes('data-intake-choice'), 'Chat intake choices should be clickable buttons that fill the answer composer.');
assert.ok(chatJs.includes('data-intake-other-input'), 'Chat intake should allow free-text Other answers inside each choice group.');
assert.ok(chatJs.includes('data-intake-other-add'), 'Chat intake should add free-text Other answers to the composer.');
assert.ok(chatJs.includes('data-intake-confirmed-list'), 'Chat intake should show confirmed answers below each choice group.');
assert.ok(chatJs.includes('data-intake-confirmed-edit'), 'Chat intake confirmed answers should be editable.');
assert.ok(chatJs.includes('data-intake-confirmed-remove'), 'Chat intake confirmed answers should be removable.');
assert.ok(chatJs.includes('removeIntakeChoiceFromComposer'), 'Removing a confirmed intake answer should remove it from the composer.');
assert.ok(chatJs.includes('Click one or more choices'), 'Chat intake should tell users that multiple choices can be selected.');
assert.ok(chatJs.includes('currentLines.some((line) => line.trim() === nextLine)'), 'Chat intake should append multiple choices without duplicating the same composer line.');
assert.ok(chatJs.includes('Product/service'), 'Chat intake should include a product/service input group when the leader asks what service to sell.');
assert.ok(chatJs.includes('Service name, website/LP URL, or product notes'), 'Chat intake should provide a direct product/service URL free-text field.');
assert.ok(chatJs.includes('No paid ads / organic only'), 'Chat intake should offer concrete constraint choices when the question needs specificity.');
assert.ok(chatJs.includes('Strategy report'), 'Chat intake should offer concrete output format choices when delivery format is unclear.');
assert.ok(chatJs.includes('/api/recurring-orders'), 'Chat should create and manage recurring orders from the schedule panel.');
assert.ok(chatJs.includes('showSchedulePanel'), 'Chat should render a scheduled-work utility panel.');
assert.ok(chatJs.includes('openScheduleComposerBtn'), 'Chat composer schedule button should open the scheduled-work panel.');
assert.ok(chatJs.includes('Completed order to rerun'), 'Chat schedules should be based on completed orders, not unconfirmed free-text requests.');
assert.ok(chatJs.includes('buildScheduledJobPayloadFromCompletedOrder'), 'Chat should build schedules from a completed order payload.');
assert.ok(chatJs.includes('reused_completed_order'), 'Scheduled reruns should preserve that intake already happened on the source order.');
assert.ok(chatJs.includes('createScheduleFromForm'), 'Chat should schedule a selected completed order from the clock panel.');
assert.ok(chatJs.includes('requestSubmit()'), 'Chat should submit with Ctrl+Enter/Cmd+Enter from the composer.');
assert.ok(chatJs.includes('chat_required: false'), 'Scheduled chat work should be marked as background work that does not require the chat to stay open.');
assert.ok(chatJs.includes('renderChatSessionSidebar'), 'Chat should render a ChatGPT-style session sidebar.');
assert.ok(chatJs.includes('refreshChatSessionHistory'), 'Chat should restore signed-in chat history from the server.');
assert.ok(chatJs.includes('chatViewRevision'), 'Chat should track the active chat view so stale async order restores cannot repopulate a new blank chat.');
assert.ok(chatJs.includes('restoredSessionOrderContextIsCurrent'), 'Restored order context should be ignored when the user has switched to a different/new chat.');
const loadChatSessionSource = chatJs.slice(chatJs.indexOf('function loadChatSession'), chatJs.indexOf('function deleteChatSession'));
assert.ok(loadChatSessionSource.includes('resumeActiveWork: options.resumeActiveWork === true'), 'Manual chat-session loads should not auto-render live progress unless an OAuth/runtime restore explicitly asks to resume active work.');
assert.ok(!loadChatSessionSource.includes('startPolling(state.orderId)'), 'Manual chat-session loads must not show the progress narrator just because the session has a linked order.');
const restoredSessionOrderContextSource = chatJs.slice(chatJs.indexOf('async function renderRestoredSessionOrderContext'), chatJs.indexOf('async function showChatListPanel'));
assert.ok(restoredSessionOrderContextSource.includes('options.resumeActiveWork === true'), 'Restored order context should only resume polling for explicit active-work restores.');
assert.ok(chatJs.includes('clearQueuedChatSessionSnapshot'), 'Starting a new chat should drop queued snapshots from the previous chat.');
assert.ok(chatJs.includes('clearChatRestoreParamsFromUrl();'), 'Starting a new chat should remove URL restore params so reloads stay blank.');
assert.ok(chatJs.includes('function applyAuthState'), 'Chat memory should hydrate lightweight auth without waiting for /auth/status.');
assert.ok(chatJs.includes('authAccountKey'), 'Chat local restore state should be scoped to the signed-in account.');
assert.ok(chatJs.includes('purgeChatStateForAccountBoundary'), 'Chat should purge local sessions when the signed-in account changes.');
assert.ok(chatJs.includes('pendingChatRestoreSnapshot'), 'Chat should defer local session restore until auth identifies the current account.');
assert.ok(chatJs.includes('state.chatSessions = currentSession ? [currentSession] : []'), 'Chat history refresh should replace account-scoped session rows instead of merging stale local rows.');
assert.ok(feedbackChatRoutes.includes('stale_chat_session_account'), 'Server chat-session snapshots should reject stale account-bound client state.');
assert.ok(chatJs.indexOf('void refreshChatSessionHistory({ force: true });') < chatJs.indexOf('void refreshAuth();'), 'Chat should start loading the session list before the full auth status request.');
assert.ok(chatJs.includes("return '/api/chat-memory"), 'Chat session history should use the lightweight chat-memory API instead of the full snapshot.');
assert.ok(!chatJs.includes("return '/api/snapshot'"), 'Chat session history should not fetch the full snapshot for the sidebar.');
assert.ok(chatJs.includes('Promise.allSettled(ids.map((id) => fetchVisibleJob(id)))'), 'Restored order context should fetch related orders in parallel.');
assert.ok(chatJs.includes('/api/analytics/chat-transcripts'), 'Chat should persist chat turns to the server transcript API.');
assert.ok(analyticsLoaderJs.includes('window.caitTrackGa4Event'), 'Shared analytics loader should expose a safe GA4 event bridge for product flows.');
assert.ok(analyticsLoaderJs.includes('primary_cta_click'), 'Shared analytics loader should track primary CTA clicks as GA4 events.');
assert.ok(analyticsLoaderJs.includes('cait_ga4_auth_event'), 'Shared analytics loader should consume server auth completion cookies for GA4 login/sign_up events.');
assert.ok(analyticsLoaderJs.includes("traffic_type: 'internal'"), 'Shared analytics loader should mark Playwright/E2E/smoke traffic as GA4 internal traffic.');
assert.ok(analyticsLoaderJs.includes("trafic_type: 'internal'"), 'Shared analytics loader should preserve the misspelled internal traffic parameter for existing tests.');
assert.ok(analyticsLoaderJs.includes('window.navigator?.webdriver'), 'Shared analytics loader should recognize Playwright browser traffic as internal.');
assert.ok(clientAnalyticsUtilsJs.includes("traffic_type: 'internal'"), 'Legacy client analytics should mark test traffic as internal.');
assert.ok(loginJs.includes("traffic_type: 'internal'"), 'Login analytics events should mark test traffic as internal.');
assert.ok(chatJs.includes('trackChatIntakeStarted') && chatJs.includes('chat_intake_started'), 'Chat should emit GA4 chat_intake_started when an order/intake flow starts.');
assert.ok(chatJs.includes('order_submitted') && chatJs.includes('trackChatGa4Once(`order_submitted:'), 'Chat should emit GA4 order_submitted when an order is accepted.');
assert.ok(worker.includes('GA4_AUTH_EVENT_COOKIE') && worker.includes('ga4AuthEventCookieForAccount'), 'Auth callbacks should hand browser-readable login/sign_up GA4 events to the next page.');
assert.ok(clientAnalyticsUtilsJs.includes('CLIENT_GA4_EVENT_NAME_MAP') && clientAnalyticsUtilsJs.includes('purchase'), 'Legacy client analytics should map order, lead, checkout, and purchase events into GA4 names.');
assert.ok(chatJs.includes('/api/settings/chat-memory/'), 'Chat sidebar delete should hide server chat memory, not just remove DOM rows.');
assert.ok(chatJs.includes('session_id: chatSessionId'), 'Orders dispatched from chat should carry the active chat session id.');
assert.ok(chatJs.includes('/api/chat-sessions'), 'Chat should persist recoverable chat sessions through the server.');
assert.ok(chatCss.includes('.chat-session-sidebar'), 'Chat CSS should style the left session sidebar.');
assert.ok(chatCss.includes('.chat-session-row.active'), 'Chat CSS should visibly mark the active chat session.');
assert.ok(chatCss.includes('.message.thinking .message-body'), 'Chat should style the OpenAI thinking state as a visible assistant message.');
assert.ok(chatCss.includes('.utility-form'), 'Chat should style the schedule form inside the utility modal.');
assert.ok(chatCss.includes('.schedule-composer-btn'), 'Chat should keep the composer schedule button stable and visible.');
assert.ok(wrangler.includes('"* * * * *"') && wrangler.includes('"*/15 * * * *"'), 'Cloudflare cron triggers should remain configured for background scheduled work.');
assert.ok(wrangler.includes('"QUEUED_DISPATCH_SWEEP_LIMIT": "12"'), 'Queued dispatch sweep should process enough jobs each minute.');
assert.ok(wrangler.includes('"WORKFLOW_ORCHESTRATION_STALE_MS": "60000"'), 'Workflow watchdog should retry stale queued workflows quickly.');
assert.ok(wrangler.includes('"WORKFLOW_ORCHESTRATION_BLOCKED_MS": "600000"'), 'Workflow watchdog should surface a visible blocker instead of leaving queued forever.');
assert.ok(cmoLeader.includes('const layerLimits = new Map'), 'CMO leader task selection should cap upstream work per layer instead of using one global task limit.');
assert.ok(
  cmoLeader.includes('[1, 1]')
  && cmoLeader.includes('[2, cmoResearchLayerLimit]')
  && cmoLeader.includes('[3, cmoPlanningLayerLimit]')
  && cmoLeader.includes('[4, cmoPreparationLayerLimit]')
  && cmoLeader.includes('sourceBucketForTask')
  && cmoLeader.includes("preferredCmoSourceTasks.includes('data_analysis')")
  && cmoLeader.includes('maxExternalResearchTasks'),
  'Leader upstream layers should keep data/research/planning capped while expanding action-specific preparation.'
);
assert.ok(worker.includes('DISPATCH_SCHEDULE_TIMEOUT_MS'), 'Scheduled dispatch attempts should have a timeout instead of refreshing forever.');
assert.ok(worker.includes('firstDispatchRequestedAt'), 'Dispatch scheduling should preserve the first requested timestamp for stalled-run diagnosis.');
assert.ok(worker.includes('scheduleAttempts'), 'Dispatch scheduling should count scheduling retries separately from agent dispatch attempts.');
assert.ok(loginHtml.includes('CAIt | Sign in or sign up'), 'Login page should be an explicit sign-in/sign-up screen.');
assert.ok(loginHtml.includes('id="loginGoogleBtn"'), 'Login page should offer Google.');
assert.ok(loginHtml.includes('id="loginGithubBtn"'), 'Login page should offer GitHub.');
assert.ok(loginHtml.includes('id="loginEmailInput"'), 'Login page should offer email magic link sign in.');
assert.ok(loginHtml.includes('id="loginTrustNotice"'), 'Login page should show an official sign-in trust notice.');
assert.ok(loginHtml.includes('/home.css?v=20260505b'), 'Login page should use the current light product styling.');
assert.ok(loginHtml.includes('type="module" src="/login.js?v=20260505b"'), 'Login page should load the current login controller.');
assert.ok(loginJs.includes('auth-flash'), 'Login flash should use auth page styling.');
assert.ok(loginJs.includes('CAIT_TRUSTED_AUTH_ORIGIN'), 'Login should know the official CAIt auth origin for local preview users.');
assert.ok(loginJs.includes('runtimeAuthBaseUrl'), 'Login provider links should be able to use the trusted auth origin.');
assert.ok(loginJs.includes('runtimeUsesExternalAuth'), 'Login should keep local-preview provider buttons enabled when official auth is external.');
assert.ok(loginJs.includes('const LOGIN_ACTION_WAIT_MS = 60 * 60 * 1000'), 'Login action waits should count from the user-started login attempt.');
assert.ok(loginJs.includes('recordLoginAttemptStarted'), 'Login should record when the user actually starts a provider/email login attempt.');
assert.ok(!loginJs.includes('controller.abort(), AUTH_STATUS_TIMEOUT_MS'), 'Opening the login page should not start the 60-minute login action countdown.');
assert.ok(loginJs.includes('AUTH_STATUS_SOFT_REVEAL_MS'), 'Login should reveal provider options while a long auth check continues in the background.');
assert.ok(fastAuthJs.includes('FAST_AUTH_STATUS_TIMEOUT_MS = 60 * 60 * 1000'), 'Fast auth gate should not redirect logged-in users to login just because auth/status is slow.');
assert.ok(clientJs.includes('fetchFastAuthStatus(timeoutMs = 60 * 60 * 1000)'), 'Client auth-check tab should use the long auth wait budget.');
assert.ok(loginJs.includes('buildOfficialLoginUrl'), 'Email login from local preview should route to official CAIt sign-in.');
assert.ok(loginJs.includes('status?.authBaseUrl'), 'Login should use the server-provided canonical auth base URL.');
assert.ok(loginJs.includes("url.searchParams.set('return_to', postLoginPath(route.next));"), 'Login providers should return to the requested page.');
assert.ok(loginJs.includes("parsed.pathname === '/chat.html'"), 'Login should normalize /chat.html to /chat to avoid asset canonical redirect loops.');
assert.ok(loginJs.includes("parsed.pathname === '/admin.html'"), 'Login should normalize /admin.html to /admin.');
assert.ok(adminHtml.includes('<main class="admin-shell" aria-label="CAIt admin dashboard">'), 'Admin should render a dedicated dashboard shell.');
assert.ok(adminHtml.includes('CAIt Admin'), 'Admin page should be branded as CAIt Admin.');
assert.ok(adminHtml.includes('/admin.css?v=20260515a'), 'Admin should load the current dashboard stylesheet.');
assert.ok(adminHtml.includes('type="module" src="/admin.js?v=20260515a"'), 'Admin should load the dashboard controller.');
assert.ok(adminHtml.includes('id="adminRegistrationsMetric"'), 'Admin should show member registration counts.');
assert.ok(adminHtml.includes('id="accountsTable"'), 'Admin should include a user/account table.');
assert.ok(adminHtml.includes('id="downloadAccountsBtn"'), 'Admin should provide account CSV download.');
assert.ok(adminHtml.includes('href="/delivery-manager.html"'), 'Admin header should link to the CAIt Deliveries feature.');
assert.ok(appsHtml.includes('CAIt Apps'), 'Apps hub should list CAIt app consoles.');
assert.ok(appsHtml.includes('href="/delivery-manager.html"'), 'Apps hub header should link to the CAIt Deliveries feature.');
assert.ok(appsHtml.includes('Deliveries feature, not in the app registry'), 'Apps hub should state Deliveries is a CAIt feature, not an app.');
assert.ok(!appsHtml.includes('Register your own app'), 'Apps hub should not imply self-service user app registration is open.');
assert.ok(appsHtml.includes('Self-service app registration is not open yet'), 'Apps hub should set the short-term app registration boundary.');
assert.ok(appsHtml.includes('data-featured-app-list'), 'Apps hub should render featured workflows from the app registry.');
assert.ok(appsHtml.includes('Operational workspaces') && appsHtml.includes('merges related app lanes'), 'Apps hub should present merged workspaces instead of exposing every internal SaaS lane.');
assert.ok(appsJs.includes('sameOriginAppUrl'), 'Apps hub should normalize CAIt-managed app URLs to the current origin.');
assert.ok(appsJs.includes("from './app-manifest-registry.js?v=20260526k'"), 'Apps hub should reuse the shared app manifest registry.');
assert.ok(appManifestRegistryJs.includes('export const APP_WORKSPACE_GROUPS = Object.freeze(['), 'Shared app registry should own related app-lane workspace grouping.');
assert.ok(appManifestRegistryJs.includes('Growth & Publisher Workspace') && appManifestRegistryJs.includes('Campaign Control Workspace'), 'Shared app registry should merge Growth/Publisher and Campaign/Ads/Lead lanes in the UI.');
assert.ok(appsJs.includes('workspaceGroupsFromApps') && appsJs.includes('APP_STANDALONE_HIDDEN_APP_IDS'), 'Apps hub should render merged workspaces and avoid showing hidden standalone lanes as top-level SaaS.');
assert.ok(!appsJs.includes('const featureCopy = new Map'), 'Apps hub featured copy should come from shared app manifests, not duplicate app descriptions.');
assert.ok(!appsJs.includes("'/analytics-console.html',"), 'Apps hub same-origin URL handling should not duplicate a hard-coded built-in app path list.');
assert.ok(chatJs.includes("from './app-manifest-registry.js?v=20260526k'"), 'Chat should reuse the shared app manifest registry.');
assert.ok(appManifestRegistryJs.includes("owner: 'cait-managed'"), 'CAIt-managed app surfaces should not be labeled as built-in apps.');
assert.ok(appManifestRegistryJs.includes("verificationStatus: 'cait_managed'"), 'CAIt-managed app surfaces should have explicit verification status.');
assert.ok(appManifestRegistryJs.includes('analytics-console'), 'Shared app registry should include Analytics Console.');
assert.ok(appManifestRegistryJs.includes('publisher-approval-studio'), 'Shared app registry should include Publisher and Approval Studio.');
assert.ok(appManifestRegistryJs.includes('lead-ops-console'), 'Shared app registry should include Lead Ops.');
assert.ok(appManifestRegistryJs.includes('campaign-operations'), 'Shared app registry should include Campaign Operations.');
assert.ok(appManifestRegistryJs.includes('ads-launch-console'), 'Shared app registry should include Ads Launch Console.');
assert.ok(appManifestRegistryJs.includes('growth-experiment-console'), 'Shared app registry should include Growth Experiment Console.');
assert.ok(appManifestRegistryJs.includes('pricing-decision-console'), 'Shared app registry should include Pricing Decision Console.');
assert.ok(appsJs.includes('CORE_FEATURE_APP_IDS'), 'Apps hub should filter core CAIt features out of app registry rendering.');
assert.ok(!appsJs.includes("['delivery-manager', { tag: 'Follow-up'"), 'Apps hub should not feature Deliveries as a registered app.');
assert.ok(appsHtml.includes('cait-app-context/v1'), 'Apps hub should explain the shared context contract.');
assert.ok(analyticsHtml.includes('Analytics Console'), 'Analytics Console should be a first-class app page.');
assert.ok(analyticsHtml.includes('href="/apps.html"'), 'Analytics Console should link back to the apps hub.');
assert.ok(analyticsHtml.includes('id="sendContextBtn"'), 'Analytics Console should send context to CAIt.');
assert.ok(analyticsHtml.includes('/analytics-console.js?v=20260525c'), 'Analytics Console should load the app-context receiving controller.');
assert.ok(analyticsHtml.includes('id="analyticsHandoffNotice"'), 'Analytics Console should disclose chat-return-only versus server-side context handoffs.');
assert.ok(analyticsHtml.includes('/app-console.css?v=20260507a'), 'Analytics Console should load the current shared app console CSS.');
assert.ok(analyticsHtml.includes('id="analyticsStepSources"'), 'Analytics Console should show a compact workflow state strip.');
assert.ok(analyticsHtml.includes('id="connectGoogleBtn"'), 'Analytics Console should expose a Google OAuth connection button.');
assert.ok(analyticsHtml.includes('id="connectGoogleAllBtn"'), 'Analytics Console should expose a combined GA4 and Search Console OAuth connection button.');
assert.ok(analyticsHtml.includes('href="https://aiagent-marketplace.net/auth/google?action=analytics_connect'), 'Analytics Console connect controls should use real OAuth links, not depend on JS-only click handling.');
assert.ok(analyticsHtml.includes('data-google-connect-link="analytics"'), 'Analytics Console combined connect should be a standard link that requests analytics scopes.');
assert.ok(analyticsHtml.includes('data-google-connect-link="ga4"'), 'Analytics Console GA4 connect should be a standard link that works inside app surfaces.');
assert.ok(analyticsHtml.includes('scope_group=ga4,gsc'), 'Analytics Console combined connect should request GA4 and Search Console together.');
assert.ok(analyticsHtml.includes('scope_group=ga4'), 'Analytics Console GA4 connect should request only the GA4 scope group.');
assert.ok(analyticsHtml.includes('scope_group=gsc'), 'Analytics Console Search Console connect should request only the Search Console scope group.');
assert.ok(analyticsHtml.includes('target="_top"'), 'Analytics Console OAuth links should leave embedded app surfaces and open Google consent in the top page.');
assert.ok(analyticsHtml.includes('id="refreshGoogleSourcesBtn"'), 'Analytics Console should expose a Google source refresh button.');
assert.ok(analyticsHtml.includes('id="loadGoogleReportBtn"'), 'Analytics Console should expose a Google report load button.');
assert.ok(analyticsHtml.includes('id="gscSiteSelect"'), 'Analytics Console should expose a Search Console source selector.');
assert.ok(analyticsHtml.includes('id="ga4PropertySelect"'), 'Analytics Console should expose a GA4 property selector.');
assert.ok(analyticsHtml.includes('id="ga4PropertyInput"'), 'Analytics Console should allow manual GA4 property ID entry when source listing fails.');
assert.ok(analyticsHtml.includes('Channel detail'), 'Analytics Console should keep channel drilldown visible on the same screen.');
assert.ok(!analyticsHtml.includes('id="reportTemplateSelect"'), 'Analytics Console should not require a separate report format selector for channel drilldown.');
assert.ok(!analyticsHtml.includes('id="channelFilterSelect"'), 'Analytics Console should not require a separate channel filter selector for channel drilldown.');
assert.ok(analyticsHtml.includes('id="analyticsQueriesCount"'), 'Analytics Console side navigation counts should come from runtime data.');
assert.ok(publisherHtml.includes('Publisher & Approval'), 'Publisher and Approval Studio should be a first-class app page.');
assert.ok(publisherHtml.includes('href="/apps.html"'), 'Publisher Studio should link back to the apps hub.');
assert.ok(publisherHtml.includes('id="approvalTable"'), 'Publisher Studio should include an approval queue.');
assert.ok(publisherHtml.includes('/publisher-approval.js?v=20260526b'), 'Publisher Studio should load the app-context receiving controller.');
assert.ok(publisherHtml.includes('id="publisherStepApproval"'), 'Publisher Studio should show approval progress before handoff.');
assert.ok(publisherHtml.includes('id="channelSelect"'), 'Publisher Studio should expose media/channel separation.');
assert.ok(publisherHtml.includes('id="connectorInput"'), 'Publisher Studio should expose the publish connector per channel.');
assert.ok(publisherHtml.includes('id="connectorCapabilityInput"'), 'Publisher Studio should expose the publish connector capability per channel.');
assert.ok(publisherHtml.includes('id="publishMethodInput"'), 'Publisher Studio should expose the publish method per channel.');
assert.ok(publisherHtml.includes('id="profileHandleInput"'), 'Publisher Studio should expose the destination account/profile per channel.');
assert.ok(publisherHtml.includes('id="profileUrlInput"'), 'Publisher Studio should expose the destination profile URL per channel.');
assert.ok(publisherHtml.includes('id="mediaAssetsInput"'), 'Publisher Studio should expose media asset requirements per channel.');
assert.ok(publisherHtml.includes('id="visualAssetReadinessInput"'), 'Publisher Studio should expose Instagram visual asset readiness before approval.');
assert.ok(publisherHtml.includes('id="channelRulesInput"'), 'Publisher Studio should expose channel rules per destination profile.');
assert.ok(publisherHtml.includes('id="approvalChecklistInput"'), 'Publisher Studio should expose a channel approval checklist.');
assert.ok(publisherHtml.includes('id="dataCheckList"'), 'Publisher Studio should show media-specific data checks before publishing.');
assert.ok(publisherHtml.includes('id="reshapeSelectedBtn"'), 'Publisher Studio should allow selected media to be re-shaped and saved.');
assert.ok(publisherJs.includes('publisher_manual_media_override'), 'Publisher reshape save should preserve the human-selected medium override.');
assert.ok(publisherJs.includes('/api/publisher/context-ingest'), 'Publisher reshape save should reuse the Publisher ingest route for DB persistence.');
assert.ok(publisherJs.includes('/api/publisher/items?limit=100'), 'Publisher Studio should reload dedicated Publisher DB items.');
assert.ok(publisherHtml.includes('id="connectGithubBtn"'), 'Publisher Studio should expose GitHub connection.');
assert.ok(publisherHtml.includes('id="repoSelect"'), 'Publisher Studio should expose repository selection.');
assert.ok(publisherHtml.includes('id="createPrBtn"'), 'Publisher Studio should expose PR handoff creation.');
assert.ok(publisherHtml.includes('id="connectWordpressBtn"'), 'Publisher Studio should expose WordPress Application Password connection.');
assert.ok(publisherHtml.includes('id="createWordpressDraftBtn"'), 'Publisher Studio should expose WordPress draft creation.');
assert.ok(publisherHtml.includes('id="wordpressPostTypeSelect"'), 'Publisher Studio should separate WordPress post/page draft handoff.');
assert.ok(publisherHtml.includes('id="publishNowBtn"'), 'Publisher Studio should expose approved-item publish now execution.');
assert.ok(publisherHtml.includes('id="schedulePostBtn"'), 'Publisher Studio should expose scheduled post execution.');
assert.ok(publisherHtml.includes('id="bulkPublishBtn"'), 'Publisher Studio should expose bulk publishing for approved packets.');
assert.ok(publisherHtml.includes('id="connectXBtn"'), 'Publisher Studio should expose X connection for one-click posting.');
assert.ok(publisherHtml.includes('id="publisherLoginLink"') && publisherHtml.includes('CAIt usage'), 'Publisher Studio should present Publisher login with CAIt usage billing as the SaaS model.');
assert.ok(publisherHtml.includes('id="launchDeliveryFormatSelect"'), 'Publisher Studio should let users choose the CAIt delivery shape before planning.');
assert.ok(publisherHtml.includes('id="publisherDestinationCount"'), 'Publisher Studio side navigation counts should come from runtime data.');
assert.ok(leadOpsHtml.includes('Lead Ops'), 'Lead Ops should be a first-class app page.');
assert.ok(leadOpsHtml.includes('href="/apps.html"'), 'Lead Ops should link back to the apps hub.');
assert.ok(leadOpsHtml.includes('id="sendLeadContextBtn"'), 'Lead Ops should send context to CAIt.');
assert.ok(/\/lead-ops\.js\?v=202605\d+[a-z]/.test(leadOpsHtml), 'Lead Ops should load the app-context receiving controller.');
assert.ok(leadOpsHtml.includes('id="approveLeadBtn"'), 'Lead Ops should provide a direct approval action.');
assert.ok(leadOpsHtml.includes('id="scheduleLeadBtn"'), 'Lead Ops should provide scheduled outreach planning.');
assert.ok(leadOpsHtml.includes('id="triggerLeadBtn"'), 'Lead Ops should provide event-triggered outreach planning.');
assert.ok(leadOpsHtml.includes('id="outreachChannelSelect"'), 'Lead Ops should let users choose email, SMS, or other outreach channels.');
assert.ok(leadOpsHtml.includes('id="sendResendBtn"'), 'Lead Ops should execute approved email through CAIt Resend.');
assert.ok(leadOpsHtml.includes('id="scheduleResendBtn"'), 'Lead Ops should schedule approved email through CAIt Resend.');
assert.ok(leadOpsHtml.includes('id="requestLeadSourcingBtn"'), 'Lead Ops should let users request first lead sourcing from List Creator.');
assert.ok(leadOpsHtml.includes('id="leadSourcingIcpInput"'), 'Lead Ops should capture target customer input for lead sourcing.');
assert.ok(leadOpsHtml.includes('id="leadAllNavCount"'), 'Lead Ops side navigation counts should come from runtime data.');
assert.ok(leadOpsHtml.includes('Send to CAIt') && leadOpsJs.includes('Return checked lead to chat'), 'Lead Ops should use plain English CAIt handoff labels by default.');
assert.ok(leadOpsHtml.includes('Viewing this screen will not send email by itself.'), 'Lead Ops should reassure cautious users before outreach actions in English.');
assert.ok(campaignOperationsHtml.includes('Campaign Operations'), 'Campaign Operations should be a first-class app page.');
assert.ok(campaignOperationsHtml.includes('href="/apps.html"'), 'Campaign Operations should link back to the apps hub.');
assert.ok(campaignOperationsHtml.includes('id="sendCampaignContextBtn"'), 'Campaign Operations should send context to CAIt.');
assert.ok(campaignOperationsHtml.includes('/campaign-operations.js?v=20260525b'), 'Campaign Operations should load the app-context receiving controller.');
assert.ok(campaignOperationsHtml.includes('id="campaignReadinessList"'), 'Campaign Operations should show operational readiness.');
assert.ok(campaignOperationsHtml.includes('id="campaignHandoffNotice"'), 'Campaign Operations should show CAIt handoff session state.');
assert.ok(campaignOperationsHtml.includes('id="campaignHandoffAuditList"'), 'Campaign Operations should show AIAGENT handoff audit gaps.');
assert.ok(campaignOperationsHtml.includes('id="campaignContextPreview"'), 'Campaign Operations should preview the CAIt packet.');
assert.ok(campaignOperationsHtml.includes('AIAGENT chat output'), 'Campaign Operations should explain the before state for one-off AIAGENT chat output.');
assert.ok(adsOpsHtml.includes('Ads Launch Console'), 'Ads Launch Console should be a first-class app page.');
assert.ok(adsOpsHtml.includes('href="/apps.html"'), 'Ads Launch Console should link back to the apps hub.');
assert.ok(adsOpsHtml.includes('id="sendAdsContextBtn"'), 'Ads Launch Console should send context to CAIt.');
assert.ok(adsOpsHtml.includes('/ads-ops.js?v=20260526c'), 'Ads Launch Console should load the app-context receiving controller.');
assert.ok(adsOpsHtml.includes('id="adsReadinessList"'), 'Ads Launch Console should show operational readiness.');
assert.ok(adsOpsHtml.includes('id="adsHandoffNotice"'), 'Ads Launch Console should show CAIt handoff session state.');
assert.ok(adsOpsHtml.includes('id="adsHandoffAuditList"'), 'Ads Launch Console should show AIAGENT handoff audit gaps.');
assert.ok(adsOpsHtml.includes('id="adsContextPreview"'), 'Ads Launch Console should preview the CAIt packet.');
assert.ok(adsOpsHtml.includes('AIAGENT ads plan'), 'Ads Launch Console should explain the before state for one-off AIAGENT ads output.');
assert.ok(deliveryManagerHtml.includes('Deliveries'), 'Deliveries should be a first-class CAIt feature page.');
assert.ok(deliveryManagerHtml.includes('href="/chat"'), 'Deliveries should link back to chat.');
assert.ok(deliveryManagerHtml.includes('id="downloadSelectedBtn"'), 'Delivery Manager should expose downloadable delivery files.');
assert.ok(deliveryManagerHtml.includes('/delivery-manager.js?v=20260526a'), 'Delivery Manager should load the app-context receiving controller.');
assert.ok(deliveryManagerHtml.includes('id="deliverySearchInput"'), 'Delivery Manager should expose delivery search.');
assert.ok(deliveryManagerHtml.includes('id="deliverySortSelect"'), 'Delivery Manager should expose delivery sorting.');
assert.ok(deliveryManagerHtml.includes('data-tab="files"'), 'Delivery Manager should expose file and context tabs.');
assert.ok(deliveryManagerHtml.includes('id="readinessList"'), 'Delivery Manager should show follow-up context readiness.');
assert.ok(deliveryManagerHtml.includes('id="approvalChecklist"'), 'Delivery Manager should expose approval gate checkpoints.');
assert.ok(deliveryManagerHtml.includes('id="approveDeliveryBtn"'), 'Delivery Manager should expose approval resume action.');
assert.ok(deliveryManagerHtml.includes('id="deliveryHandoffNotice"'), 'Delivery Manager should disclose chat-only versus server-side delivery handoffs.');
assert.ok(deliveryManagerHtml.includes('id="deliveryHandoffAuditList"'), 'Delivery Manager should show AIAGENT delivery handoff audit anchors.');
assert.ok(deliveryManagerJs.includes('requestedDeliveryIdFromUrl'), 'Delivery Manager should support direct order/job/deep-linked delivery loading.');
assert.ok(deliveryManagerJs.includes('/api/jobs/${encodeURIComponent(safeId)}'), 'Delivery Manager should fetch a deep-linked delivery by job id when it is outside the latest list.');
assert.ok(deliveryManagerJs.includes('contentPreview'), 'Delivery Manager should recover generic transfer artifact contentPreview as delivery files.');
assert.ok(appContextDomainJs.includes("'content_preview'") && appContextDomainJs.includes("'contentPreview'"), 'Server app-context normalization should preserve multiline artifact contentPreview tables.');
assert.ok(caitAppBridge.includes("'content_preview'") && caitAppBridge.includes("'contentPreview'"), 'Client app-context bridge should preserve multiline artifact contentPreview tables.');
assert.ok(deliveryManagerJs.includes('raw_transfer_delivery_artifacts'), 'Delivery Manager should normalize raw transfer delivery artifacts.');
assert.ok(deliveryManagerJs.includes('delivery_package') && deliveryManagerJs.includes('raw_delivery_package_files'), 'Delivery Manager should restore package-shaped AIAGENT delivery contracts.');
assert.ok(deliveryManagerJs.includes('delivery_manager_handoff_audit'), 'Delivery Manager should include handoff audit state in reusable app context.');

const caitManagedSurfaceEntries = [
  {
    name: 'Analytics Console',
    html: analyticsHtml,
    ownScript: '/analytics-console.js',
    forbiddenScripts: ['/publisher-approval.js', '/lead-ops.js', '/campaign-operations.js', '/ads-ops.js', '/delivery-manager.js', '/client.js', '/chat.js']
  },
  {
    name: 'Publisher and Approval Studio',
    html: publisherHtml,
    ownScript: '/publisher-approval.js',
    forbiddenScripts: ['/analytics-console.js', '/lead-ops.js', '/campaign-operations.js', '/ads-ops.js', '/delivery-manager.js', '/client.js', '/chat.js']
  },
  {
    name: 'Lead Ops Console',
    html: leadOpsHtml,
    ownScript: '/lead-ops.js',
    forbiddenScripts: ['/analytics-console.js', '/publisher-approval.js', '/campaign-operations.js', '/ads-ops.js', '/delivery-manager.js', '/client.js', '/chat.js']
  },
  {
    name: 'Campaign Operations',
    html: campaignOperationsHtml,
    ownScript: '/campaign-operations.js',
    forbiddenScripts: ['/analytics-console.js', '/publisher-approval.js', '/lead-ops.js', '/ads-ops.js', '/delivery-manager.js', '/client.js', '/chat.js']
  },
  {
    name: 'Ads Launch Console',
    html: adsOpsHtml,
    ownScript: '/ads-ops.js',
    forbiddenScripts: ['/analytics-console.js', '/publisher-approval.js', '/lead-ops.js', '/campaign-operations.js', '/delivery-manager.js', '/client.js', '/chat.js']
  },
  {
    name: 'Delivery Manager',
    html: deliveryManagerHtml,
    ownScript: '/delivery-manager.js',
    forbiddenScripts: ['/analytics-console.js', '/publisher-approval.js', '/lead-ops.js', '/campaign-operations.js', '/ads-ops.js', '/client.js', '/chat.js']
  }
];

for (const app of caitManagedSurfaceEntries) {
  assert.ok(app.html.includes(`type="module" src="${app.ownScript}`), `${app.name} should load its own dedicated app controller.`);
  for (const forbiddenScript of app.forbiddenScripts) {
    assert.ok(!app.html.includes(`src="${forbiddenScript}`), `${app.name} should not load ${forbiddenScript}; CAIt-managed app controllers must stay split by app.`);
  }
}

assert.ok(analyticsJs.includes("source_app: 'analytics_console'"), 'Analytics app logic should stay in analytics-console.js.');
assert.ok(analyticsJs.includes("cait-app-bridge.js?v=20260526i"), 'Analytics Console should load the latest CAIt app bridge.');
assert.ok(caitAppBridge.includes("`${origin}/auth/status`"), 'CAIt app bridge should read auth status before same-origin context handoff.');
assert.ok(caitAppBridge.includes("headers['x-aiagent2-csrf'] = csrfToken"), 'CAIt app bridge should attach CSRF token to same-origin context handoff writes.');
assert.ok(caitAppBridge.includes('createServerAppContextWithRetry'), 'CAIt app bridge should retry server-side app context writes.');
assert.ok(caitAppBridge.includes('fetchJsonWithTimeout'), 'CAIt app bridge should bound app context network waits.');
assert.ok(!analyticsJs.includes("source_app: 'publisher_approval_studio'"), 'Analytics Console JS should not contain Publisher app logic.');
assert.ok(!analyticsJs.includes("source_app: 'lead_ops_console'"), 'Analytics Console JS should not contain Lead Ops app logic.');
assert.ok(!analyticsJs.includes("source_app: 'delivery_manager'"), 'Analytics Console JS should not contain Delivery Manager app logic.');
assert.ok(publisherJs.includes("source_app: 'publisher_approval_studio'"), 'Publisher app logic should stay in publisher-approval.js.');
assert.ok(publisherJs.includes('/api/delivery-items?surface=publisher'), 'Publisher should load normalized publisher delivery items from the SaaS DB.');
assert.ok(!publisherJs.includes("source_app: 'analytics_console'"), 'Publisher JS should not contain Analytics app logic.');
assert.ok(!publisherJs.includes("source_app: 'lead_ops_console'"), 'Publisher JS should not contain Lead Ops app logic.');
assert.ok(!publisherJs.includes("source_app: 'delivery_manager'"), 'Publisher JS should not contain Delivery Manager app logic.');
assert.ok(leadOpsJs.includes("source_app: 'lead_ops_console'"), 'Lead Ops app logic should stay in lead-ops.js.');
assert.ok(leadOpsJs.includes('/api/delivery-items?surface=lead'), 'Lead Ops should load normalized lead/email delivery items from the SaaS DB.');
assert.ok(!leadOpsJs.includes("source_app: 'analytics_console'"), 'Lead Ops JS should not contain Analytics app logic.');
assert.ok(!leadOpsJs.includes("source_app: 'publisher_approval_studio'"), 'Lead Ops JS should not contain Publisher app logic.');
assert.ok(!leadOpsJs.includes("source_app: 'campaign_operations'"), 'Lead Ops JS should not contain Campaign Operations app logic.');
assert.ok(!leadOpsJs.includes("source_app: 'delivery_manager'"), 'Lead Ops JS should not contain Delivery Manager app logic.');
assert.ok(campaignOperationsJs.includes("source_app: 'campaign_operations'"), 'Campaign Operations app logic should stay in campaign-operations.js.');
assert.ok(campaignOperationsJs.includes("fetchCaitAppContextFromUrl"), 'Campaign Operations should receive CAIt app contexts.');
assert.ok(campaignOperationsJs.includes("type: 'campaign_state'"), 'Campaign Operations should return campaign_state artifacts.');
assert.ok(campaignOperationsJs.includes("type: 'publisher_queue'"), 'Campaign Operations should return publisher_queue artifacts.');
assert.ok(campaignOperationsJs.includes("type: 'approval_backlog'"), 'Campaign Operations should preserve approval_backlog artifacts from the app input contract.');
assert.ok(campaignOperationsJs.includes("type: 'connector_readiness'"), 'Campaign Operations should return connector_readiness artifacts.');
assert.ok(campaignOperationsJs.includes("type: 'now_week_0_1'"), 'Campaign Operations should return now_week_0_1 artifacts.');
assert.ok(campaignOperationsJs.includes("type: 'next_week_1_3'"), 'Campaign Operations should return next_week_1_3 artifacts.');
assert.ok(campaignOperationsJs.includes("type: 'waiting_conditions'"), 'Campaign Operations should return waiting_conditions artifacts.');
assert.ok(campaignOperationsJs.includes("type: 'measurement_loop'"), 'Campaign Operations should return measurement_loop artifacts.');
assert.ok(campaignOperationsJs.includes("type: 'next_action_owner'"), 'Campaign Operations should return next_action_owner artifacts.');
assert.ok(campaignOperationsJs.includes("type: 'handoff_audit'"), 'Campaign Operations should return handoff_audit artifacts for app contract debugging.');
assert.ok(campaignOperationsJs.includes('campaign_handoff_audit'), 'Campaign Operations should include handoff audit details in raw_context.');
assert.ok(campaignOperationsJs.includes('campaignNextActionOwnerRows'), 'Campaign Operations should render retained next action owners.');
assert.ok(campaignOperationsJs.includes('nowWeekZeroOne'), 'Campaign Operations should accept camelCase week 0-1 campaign handoff aliases.');
assert.ok(campaignOperationsJs.includes('nextWeekOneThree'), 'Campaign Operations should accept camelCase week 1-3 campaign handoff aliases.');
assert.ok(campaignOperationsJs.includes('publisherQueue'), 'Campaign Operations should accept top-level camelCase Publisher queue handoff fields.');
assert.ok(campaignOperationsJs.includes('nextActionOwner'), 'Campaign Operations should accept top-level camelCase next action owner handoff fields.');
assert.ok(campaignOperationsJs.includes('campaignOperationsPlan'), 'Campaign Operations should accept top-level camelCase campaign operations plan handoff fields.');
assert.ok(campaignOperationsJs.includes('campaignPlanArtifactsFromTransferDelivery'), 'Campaign Operations should recover generic transfer delivery artifacts from raw_context.delivery.');
assert.ok(appContextDomainJs.includes('campaign_operations_plan'), 'Server-side app context should preserve campaign operations plan contract fields in raw_context.');
assert.ok(adsOpsJs.includes("source_app: 'ads_launch_console'"), 'Ads Launch Console app logic should stay in ads-ops.js.');
assert.ok(adsOpsJs.includes("fetchCaitAppContextFromUrl"), 'Ads Launch Console should receive CAIt app contexts.');
assert.ok(adsOpsJs.includes("type: 'ads_plan'"), 'Ads Launch Console should return ads_plan artifacts.');
assert.ok(adsOpsJs.includes("type: 'budget_cap_and_cpa_assumption'"), 'Ads Launch Console should return budget/CPA artifacts.');
assert.ok(adsOpsJs.includes("type: 'pre_launch_measurement_blocker'"), 'Ads Launch Console should return pre-launch measurement blocker artifacts.');
assert.ok(adsOpsJs.includes("type: 'stop_rules'"), 'Ads Launch Console should return stop_rules artifacts.');
assert.ok(adsOpsJs.includes("type: 'creative_asset_packet'"), 'Ads Launch Console should return creative_asset_packet artifacts.');
assert.ok(adsOpsJs.includes("type: 'ads_saas_handoff'"), 'Ads Launch Console should return ads_saas_handoff artifacts.');
assert.ok(adsOpsJs.includes("type: 'approval_and_launch_boundary'"), 'Ads Launch Console should return approval boundary artifacts.');
assert.ok(adsOpsJs.includes("type: 'execution_status_labels'"), 'Ads Launch Console should return execution status label artifacts.');
assert.ok(adsOpsJs.includes("type: 'measurement_plan'"), 'Ads Launch Console should return measurement_plan artifacts.');
assert.ok(adsOpsJs.includes('ads_handoff_audit'), 'Ads Launch Console should include handoff audit details in raw_context.');
assert.ok(appContextDomainJs.includes('ads_saas_handoff'), 'Server-side app context should preserve Ads SaaS handoff contract fields in raw_context.');
assert.ok(appContextDomainJs.includes('pre_launch_measurement_blocker'), 'Server-side app context should preserve Ads pre-launch measurement blocker fields in raw_context.');
assert.ok(caitAppBridge.includes('ads_saas_handoff'), 'Client app-context bridge should preserve Ads SaaS handoff contract fields.');
assert.ok(caitAppBridge.includes('measurementBlockerPacket'), 'Client app-context bridge should preserve Ads measurement blocker aliases.');
assert.ok(appContextDomainJs.includes('approval_ready_ad_asset_packet') && appHandoffTransferJs.includes('APP_HANDOFF_ADS_CONTRACT_ALIASES'), 'Ads Launch handoff should canonicalize Ads Planner action-boundary aliases.');
assert.ok(adsOpsJs.includes('launch_approval_handoff_packet') && caitAppBridge.includes('conversion_tracking_plan'), 'Ads Launch Console should recover launch approval and measurement alias packets.');
assert.ok(appManifestRegistryJs.includes("'pre_launch_measurement_blocker'"), 'Ads Launch app manifest should declare pre-launch measurement blocker handoff contracts.');
assert.ok(adsOpsJs.includes('const ADS_MARKDOWN_ARTIFACT_TYPES = Object.freeze(['), 'Ads Launch Console should gate Markdown parsing on explicit Ads artifact contracts.');
assert.ok(adsOpsJs.includes('const adsFiles = files.filter((file) => artifactMatches(file, ADS_MARKDOWN_ARTIFACT_TYPES));'), 'Ads Launch Console must not choose Ads Planner files from body text keywords.');
assert.ok(!adsOpsJs.includes('/ads saas|advertis|広告|campaign structure|budget cap|stop rules/i.test(content)'), 'Ads Launch Console must not infer Ads handoff intent from delivery body text.');
assert.ok(!adsOpsJs.includes("source_app: 'analytics_console'"), 'Ads Launch Console JS should not contain Analytics app logic.');
assert.ok(!adsOpsJs.includes("source_app: 'publisher_approval_studio'"), 'Ads Launch Console JS should not contain Publisher app logic.');
assert.ok(!adsOpsJs.includes("source_app: 'lead_ops_console'"), 'Ads Launch Console JS should not contain Lead Ops app logic.');
assert.ok(!adsOpsJs.includes("source_app: 'campaign_operations'"), 'Ads Launch Console JS should not contain Campaign Operations app logic.');
assert.ok(!adsOpsJs.includes("source_app: 'delivery_manager'"), 'Ads Launch Console JS should not contain Delivery Manager app logic.');
assert.ok(growthOpsJs.includes("source_app: 'growth_experiment_console'"), 'Growth Experiment Console app logic should stay in growth-ops.js.');
assert.ok(growthOpsJs.includes("fetchCaitAppContextFromUrl"), 'Growth Experiment Console should receive CAIt app contexts.');
assert.ok(growthOpsHtml.includes('/growth-ops.js?v=20260526h'), 'Growth Experiment Console should bump the script cache key for competitor-style workspace UX changes.');
assert.ok(growthOpsHtml.includes('Growth & Publisher Workspace') && growthOpsHtml.includes('Experiment scorecard') && growthOpsHtml.includes('Publisher activation lane') && growthOpsHtml.includes('openGrowthPublisherBtn'), 'Growth Experiment Console should expose a familiar scorecard and Publisher approval workspace.');
assert.ok(growthOpsJs.includes("type: 'growth_experiment_packet'"), 'Growth Experiment Console should return growth_experiment_packet artifacts.');
assert.ok(growthOpsJs.includes("type: 'no_paid_growth_plan_packet'"), 'Growth Experiment Console should return no_paid_growth_plan_packet artifacts for Free Web Growth Leader reuse.');
assert.ok(growthOpsJs.includes("type: 'organic_specialist_handoff_packet'"), 'Growth Experiment Console should return organic_specialist_handoff_packet artifacts for specialist handoff reuse.');
assert.ok(growthOpsJs.includes("type: 'site_publish_packet'") && growthOpsJs.includes("type: 'social_copy_packet'"), 'Growth Experiment Console should generate Publisher-ready launch packets.');
assert.ok(growthOpsJs.includes('createPublisherServerContext') && growthOpsJs.includes("app_id: 'publisher-approval-studio'"), 'Growth Experiment Console should open Publisher through a server-side app context.');
assert.ok(growthOpsJs.includes('source_growth_packet'), 'Growth-to-Publisher packets should retain the source Growth packet for audit and follow-up measurement.');
assert.ok(growthOpsJs.includes('growth_publisher_handoff_packet') && growthOpsJs.includes('publisher_activation_packet'), 'Growth Experiment Console should accept agent-produced Growth-to-Publisher handoff packets.');
assert.ok(growthOpsJs.includes('agent_growth_publisher_handoff_packet') && growthOpsJs.includes('Agent Publisher handoff'), 'Growth-to-Publisher packets should keep agent handoff rows through Publisher activation.');
assert.ok(growthOpsJs.includes('function buildPublisherLaunchBlockerPacket') && growthOpsJs.includes('Growth Experiment Console will not synthesize Publisher delivery artifacts until the required Growth contracts are explicit.'), 'Growth Experiment Console must not synthesize Publisher artifacts from partial Growth context.');
assert.ok(growthOpsJs.includes('Complete missing Growth anchors before Publisher can open; no publish packet is synthesized from partial context.'), 'Growth Publisher lane should block incomplete packets instead of opening with review gaps.');
assert.ok(growthOpsJs.includes("type: 'growth_asset_handoff_packet'"), 'Growth Experiment Console should return growth_asset_handoff_packet artifacts.');
assert.ok(growthOpsJs.includes("type: 'growth_activation_handoff_packet'"), 'Growth Experiment Console should return growth_activation_handoff_packet artifacts.');
assert.ok(growthOpsJs.includes("type: 'tracking_specification'"), 'Growth Experiment Console should return tracking_specification artifacts.');
assert.ok(growthOpsJs.includes("type: 'execution_proof_tracker'"), 'Growth Experiment Console should return execution_proof_tracker artifacts.');
assert.ok(growthOpsJs.includes('growth_handoff_audit'), 'Growth Experiment Console should include handoff audit details in raw_context.');
assert.ok(appContextDomainJs.includes('growth_experiment_packet'), 'Server-side app context should preserve growth experiment packet contract fields in raw_context.');
assert.ok(appContextDomainJs.includes('no_paid_growth_plan_packet') && appContextDomainJs.includes('organic_specialist_handoff_packet'), 'Server-side app context should preserve Free Web Growth Leader packet contracts.');
assert.ok(appContextDomainJs.includes('growth_activation_handoff_packet'), 'Server-side app context should preserve growth activation handoff contract fields in raw_context.');
assert.ok(appContextDomainJs.includes('growth_publisher_handoff_packet') && appContextDomainJs.includes('publisherActivationPacket'), 'Server-side app context should preserve agent Growth-to-Publisher handoff contract fields.');
assert.ok(caitAppBridge.includes('growth_experiment_packet'), 'Client app-context bridge should preserve growth experiment packet contract fields.');
assert.ok(caitAppBridge.includes('noPaidGrowthPlanPacket') && caitAppBridge.includes('organicSpecialistHandoffPacket'), 'Client app-context bridge should preserve Free Web Growth Leader aliases.');
assert.ok(caitAppBridge.includes('growthActivationHandoffPacket'), 'Client app-context bridge should preserve growth activation aliases.');
assert.ok(caitAppBridge.includes('growthPublisherHandoffPacket') && caitAppBridge.includes('publisherActivationPacket'), 'Client app-context bridge should preserve agent Growth-to-Publisher aliases.');
assert.ok(caitAppBridge.includes('measurementSurface') && caitAppBridge.includes('proofSource') && caitAppBridge.includes('nextDecision'), 'Client app-context bridge should preserve Growth measurement surface, proof source, and next decision aliases.');
assert.ok(appContextDomainJs.includes('visual_asset_readiness_matrix') && caitAppBridge.includes('visualAssetReadinessMatrix'), 'App context should preserve Instagram visual asset readiness contract aliases.');
assert.ok(appHandoffTransferJs.includes('APP_HANDOFF_GROWTH_CONTRACT_FIELDS'), 'Generic app handoff transfer should preserve Growth contract fields.');
assert.ok(appHandoffTransferJs.includes('growth_publisher_handoff_packet') && appHandoffTransferJs.includes('growthPublisherHandoffPacket'), 'Generic app handoff transfer should canonicalize agent Growth-to-Publisher packet aliases.');
assert.ok(appHandoffTransferJs.includes('APP_HANDOFF_PUBLISHER_CONTRACT_FIELDS') && appHandoffTransferJs.includes('visualAssetReadinessMatrix'), 'Generic app handoff transfer should canonicalize Publisher visual asset readiness aliases.');
assert.ok(appHandoffGateJs.includes('growth_publisher_handoff_packet') && appHandoffGateJs.includes('publisher_activation_packet'), 'Generic app handoff routing should recognize agent Growth-to-Publisher packet types.');
assert.ok(appHandoffGateJs.includes('visual_asset_readiness_matrix') && appManifestRegistryJs.includes('visual_asset_readiness_matrix'), 'Publisher app routing and manifest should recognize visual asset readiness packets.');
assert.ok(appManifestRegistryJs.includes("'growth_experiment_packet'") && appManifestRegistryJs.includes("'no_paid_growth_plan_packet'") && appManifestRegistryJs.includes("'organic_specialist_handoff_packet'") && appManifestRegistryJs.includes("'growth_publisher_handoff_packet'") && appManifestRegistryJs.includes("'kill_rule'") && appManifestRegistryJs.includes("'next_decision'"), 'Growth Experiment app manifest should declare retained growth handoff contracts.');
assert.ok(growthOpsJs.includes('const GROWTH_MARKDOWN_ARTIFACT_TYPES = Object.freeze(['), 'Growth Experiment Console should gate Markdown parsing on explicit Growth artifact contracts.');
assert.ok(growthOpsJs.includes("'7_day_experiment'") && growthOpsJs.includes("'no_paid_growth_plan_packet'") && growthOpsJs.includes("'organic_specialist_handoff_packet'") && growthOpsJs.includes("'owner_responsibility_map'") && growthOpsJs.includes("'proof_source'"), 'Growth Experiment Console should recover Growth agent and Free Web Growth Leader section headings as retained rows.');
assert.ok(growthOpsJs.includes('const growthFiles = deliveryFiles(context).filter((file) => artifactMatches(file, GROWTH_MARKDOWN_ARTIFACT_TYPES));'), 'Growth Experiment Console must not choose Growth files from body text keywords.');
assert.ok(growthOpsJs.includes('approval_requests: explicitApprovalRequestsFromContext()'), 'Growth Experiment Console should pass through explicit approval requests only.');
assert.ok(!growthOpsJs.includes("approval_requests: growthRecord.activationRows.some"), 'Growth Experiment Console must not synthesize approval requests from activation row text.');
assert.ok(!growthOpsJs.includes('/growth|experiment|施策/i.test(content)'), 'Growth Experiment Console must not infer growth handoff intent from delivery body text.');
assert.ok(!growthOpsJs.includes("source_app: 'analytics_console'"), 'Growth Experiment Console JS should not contain Analytics app logic.');
assert.ok(!growthOpsJs.includes("source_app: 'publisher_approval_studio'"), 'Growth Experiment Console JS should not contain Publisher app logic.');
assert.ok(!growthOpsJs.includes("source_app: 'lead_ops_console'"), 'Growth Experiment Console JS should not contain Lead Ops app logic.');
assert.ok(!growthOpsJs.includes("source_app: 'campaign_operations'"), 'Growth Experiment Console JS should not contain Campaign Operations app logic.');
assert.ok(!growthOpsJs.includes("source_app: 'ads_launch_console'"), 'Growth Experiment Console JS should not contain Ads Launch Console app logic.');
assert.ok(!growthOpsJs.includes("source_app: 'pricing_decision_console'"), 'Growth Experiment Console JS should not contain Pricing Decision Console app logic.');
assert.ok(!growthOpsJs.includes("source_app: 'delivery_manager'"), 'Growth Experiment Console JS should not contain Delivery Manager app logic.');
assert.ok(pricingOpsJs.includes("source_app: 'pricing_decision_console'"), 'Pricing Decision Console app logic should stay in pricing-ops.js.');
assert.ok(pricingOpsJs.includes("fetchCaitAppContextFromUrl"), 'Pricing Decision Console should receive CAIt app contexts.');
assert.ok(pricingOpsHtml.includes('/pricing-ops.js?v=20260527a'), 'Pricing Decision Console should bump the script cache key for the beginner-friendly pricing review refresh.');
assert.ok(pricingOpsJs.includes("type: 'pricing_decision_packet'"), 'Pricing Decision Console should return pricing_decision_packet artifacts.');
assert.ok(pricingOpsJs.includes("type: 'scenario_table'"), 'Pricing Decision Console should return scenario_table artifacts.');
assert.ok(pricingOpsJs.includes("type: 'sensitivity_table'"), 'Pricing Decision Console should return sensitivity_table artifacts.');
assert.ok(pricingOpsJs.includes("type: 'price_change_handoff'"), 'Pricing Decision Console should return price_change_handoff artifacts.');
assert.ok(pricingOpsJs.includes("type: 'execution_proof_tracker'"), 'Pricing Decision Console should return execution_proof_tracker artifacts.');
assert.ok(pricingOpsJs.includes('pricing_handoff_audit'), 'Pricing Decision Console should include handoff audit details in raw_context.');
assert.ok(pricingOpsJs.includes('receivedRaw') && pricingOpsJs.includes('receivedContractFields'), 'Pricing Decision Console should restore aliases nested under received_context.raw_context.');
assert.ok(pricingOpsJs.includes('Array.isArray(value) && !value.length'), 'Pricing Decision Console should not let empty canonical arrays mask populated alias fields.');
assert.ok(appContextDomainJs.includes('pricing_decision_packet'), 'Server-side app context should preserve pricing decision packet contract fields in raw_context.');
assert.ok(appContextDomainJs.includes('price_change_handoff'), 'Server-side app context should preserve price change handoff contract fields in raw_context.');
assert.ok(caitAppBridge.includes('pricing_decision_packet'), 'Client app-context bridge should preserve pricing decision packet contract fields.');
assert.ok(caitAppBridge.includes('priceChangeHandoff'), 'Client app-context bridge should preserve price change handoff aliases.');
assert.ok(caitAppBridge.includes('priceChangePacket') && caitAppBridge.includes('proofTracker') && caitAppBridge.includes('rollbackRule'), 'Client app-context bridge should preserve common Pricing/CFO alias packet keys.');
assert.ok(appHandoffTransferJs.includes('APP_HANDOFF_PRICING_CONTRACT_FIELDS'), 'Generic app handoff transfer should preserve Pricing/CFO contract fields.');
assert.ok(appManifestRegistryJs.includes("'pricing_decision_packet'") && appManifestRegistryJs.includes("'rollback_or_continue_rule'"), 'Pricing Decision app manifest should declare retained pricing handoff contracts.');
assert.ok(pricingOpsJs.includes('const PRICING_MARKDOWN_ARTIFACT_TYPES = Object.freeze(['), 'Pricing Decision Console should gate Markdown parsing on explicit Pricing/CFO artifact contracts.');
assert.ok(pricingOpsJs.includes('approval_requests: explicitApprovalRequestsFromContext()'), 'Pricing Decision Console should pass through explicit approval requests only.');
assert.ok(!pricingOpsJs.includes("approval_requests: pricingRecord.riskRows.some"), 'Pricing Decision Console must not synthesize approval requests from risk row text.');
assert.ok(!pricingOpsJs.includes('/pricing|価格|price/i.test(content)'), 'Pricing Decision Console must not infer pricing handoff intent from delivery body text.');
assert.ok(!pricingOpsJs.includes("source_app: 'analytics_console'"), 'Pricing Decision Console JS should not contain Analytics app logic.');
assert.ok(!pricingOpsJs.includes("source_app: 'publisher_approval_studio'"), 'Pricing Decision Console JS should not contain Publisher app logic.');
assert.ok(!pricingOpsJs.includes("source_app: 'lead_ops_console'"), 'Pricing Decision Console JS should not contain Lead Ops app logic.');
assert.ok(!pricingOpsJs.includes("source_app: 'campaign_operations'"), 'Pricing Decision Console JS should not contain Campaign Operations app logic.');
assert.ok(!pricingOpsJs.includes("source_app: 'ads_launch_console'"), 'Pricing Decision Console JS should not contain Ads Launch Console app logic.');
assert.ok(!pricingOpsJs.includes("source_app: 'delivery_manager'"), 'Pricing Decision Console JS should not contain Delivery Manager app logic.');
assert.ok(!campaignOperationsJs.includes("source_app: 'analytics_console'"), 'Campaign Operations JS should not contain Analytics app logic.');
assert.ok(!campaignOperationsJs.includes("source_app: 'publisher_approval_studio'"), 'Campaign Operations JS should not contain Publisher app logic.');
assert.ok(!campaignOperationsJs.includes("source_app: 'lead_ops_console'"), 'Campaign Operations JS should not contain Lead Ops app logic.');
assert.ok(!campaignOperationsJs.includes("source_app: 'delivery_manager'"), 'Campaign Operations JS should not contain Delivery Manager app logic.');
assert.ok(deliveryManagerJs.includes("source_app: 'delivery_manager'"), 'Deliveries feature logic should stay in delivery-manager.js.');
assert.ok(!deliveryManagerJs.includes("source_app: 'analytics_console'"), 'Delivery Manager JS should not contain Analytics app logic.');
assert.ok(!deliveryManagerJs.includes("source_app: 'publisher_approval_studio'"), 'Delivery Manager JS should not contain Publisher app logic.');
assert.ok(!deliveryManagerJs.includes("source_app: 'lead_ops_console'"), 'Delivery Manager JS should not contain Lead Ops app logic.');
assert.ok(deliveryManagerJs.includes('explicitDeliveryContractTokens'), 'Delivery Manager should use explicit artifact/action metadata for review labels.');
assert.ok(deliveryManagerJs.includes('explicitApprovalWaiting'), 'Delivery Manager should use explicit authority/status fields for approval state.');
assert.ok(!deliveryManagerJs.includes('function deliveryCombinedText'), 'Delivery Manager must not classify delivery package intent from body text.');
assert.ok(!deliveryManagerJs.includes('/publish now|post now|send now|schedule|投稿|送信|公開|配信/.test(text)'), 'Delivery Manager must not infer external action requests from delivery body text.');
assert.ok(html.includes('href="/agents.html"'));
assert.ok(html.includes('href="/publish-ai-agents.html"'));
assert.ok(html.includes('href="/ai-agent-api.html"'));
assert.ok(html.includes('Coming soon for external clients'), 'Home API/CLI card should not imply external developer surfaces are live.');
assert.ok(html.includes('href="/resources.html"'));
assert.ok(chatHtml.includes('href="/ai-agent-api.html"') && chatHtml.includes('API / CLI / MCP'), 'Chat should expose one API/CLI/MCP tab.');
assert.ok(!chatHtml.includes('href="/cli-help.html"'), 'Chat should not expose a separate CLI tab.');
assert.ok(chatHtml.includes('href="/apps.html"'));
assert.ok(chatHtml.includes('href="/help.html"'));
assert.ok(chatHtml.includes('href="/news.html"'));
assert.ok(chatHtml.includes('id="openChatListBtn"'));
assert.ok(chatHtml.includes('id="openWorkerListBtn"'));
assert.ok(chatHtml.includes('id="openAppListBtn"'));
assert.ok(chatHtml.includes('id="openInfoBtn"'));
assert.ok(chatHtml.includes('id="activeLeaderStatus"'), 'Chat should show the current CAIt/leader conversation owner.');
assert.ok(chatHtml.includes('id="utilityModal"'));
assert.ok(chatHtml.includes('/chat.css?v=20260526f'), 'Chat page should load the current compact chat header and composer styles.');
assert.ok(chatHtml.includes('/chat.js?v=20260527a'), 'Chat page should load the current compact chat header and composer controller.');
assert.ok(chatHtml.includes('id="chatHeaderMenu"') && chatHtml.includes('☰ Menu'), 'Chat header should collapse secondary actions into a menu.');
assert.ok(chatHtml.includes('Chat history') && chatHtml.includes('Schedules') && chatHtml.includes('Agents and workers'), 'Chat menu should use specific workspace action labels.');
assert.ok(chatHtml.includes('App tools') && chatHtml.includes('Apps hub'), 'Chat menu should distinguish app tools from the Apps hub page.');
assert.ok(chatHtml.includes('id="composerModeHint"'), 'Chat composer should show a visible mode hint near the answer box.');
assert.ok(chatHtml.includes('id="composerControlsHint"') && chatHtml.includes('Output sets the result format. Schedule runs it later.'), 'Chat composer should explain the Output selector beside Schedule.');
assert.ok(chatHtml.includes('Preferred output format') && !chatHtml.includes('Delivery shape'), 'Chat output selector should not look like a delivery destination control.');
assert.ok(chatHtml.includes('data-label-en="Summary"') && chatHtml.includes('data-label-ja="要約"'), 'Chat output selector should keep compact language-aware option labels.');
assert.ok(chatJs.includes('function chatUiText') && chatJs.includes('function chatUiLanguage'), 'Fixed chat controls should use UI language, not the inferred conversation language.');
assert.ok(chatJs.includes('data-chat-ui-language'), 'Info panel should expose the UI language selector.');
assert.ok(chatJs.includes('return chatUiLanguage();'), 'Chat response language should follow the explicit UI language setting by default.');
assert.ok(chatJs.includes("chatUiText('Send answer', '回答を送信'"), 'Chat intake mode should rename the submit button from generic chat sending to answer sending.');
assert.ok(chatJs.includes("chatUiText('Send chat', 'チャット送信'"), 'Chat submit label should follow the UI language setting.');
assert.ok(!chatJs.includes("chatText('Send chat', 'チャット送信'"), 'Chat submit label must not switch based on Japanese conversation text.');
assert.ok(chatJs.includes('Answer the intake item here, then press Send answer'), 'Chat intake mode should explicitly tell users to press Send answer.');
assert.ok(chatCss.includes('.composer[data-mode="intake"] .composer-mode-hint'), 'Chat intake mode should visually distinguish the composer hint.');
assert.ok(chatCss.includes('.composer-controls-hint'), 'Chat CSS should style the output-vs-schedule hint near composer controls.');
assert.ok(/\/apps\.js\?v=202605\d+[a-z]/.test(appsHtml), 'Apps page should load the current workspace-grouped app hub controller.');
assert.ok(worker.includes("'/pricing-ops.html'") && worker.includes("'/pricing-ops.js'"), 'Worker should no-cache Pricing Decision Console assets after deploy.');
assert.ok(appsHtml.includes('data-app-registry-list'), 'Apps page should expose the live app registry list.');
assert.ok(appsHtml.includes('One API / CLI / MCP developer surface') && appsHtml.includes('Disabled by default'), 'Apps page should describe API/CLI/MCP as one disabled-by-default developer surface.');
assert.ok(!appsHtml.includes('href="#mcp"'), 'Apps page should not expose a separate MCP side tab.');
assert.ok(appsHtml.includes('Recent app contexts'), 'Apps page should expose server-side app context history.');
assert.ok(appsHtml.includes("server-side context API"), 'Apps page should explain the server-side app context API.');
assert.ok(appsHtml.includes('retained anchors without exposing the packet body'), 'Apps page should explain safe retained-anchor visibility.');
assert.ok(appsJs.includes('/api/apps?limit=100'), 'Apps JS should load registered apps from the app catalog API.');
assert.ok(appsJs.includes('MCP ready') && appsJs.includes('mcp.enabled === false ? false'), 'Apps JS should label MCP-ready app manifests only when they are not explicitly paused.');
assert.ok(chatJs.includes('APP_WORKSPACE_GROUPS') && chatJs.includes('groupedAppPanelEntries'), 'Chat Apps panel should show merged app workspaces from the shared app registry instead of every internal lane.');
assert.ok(clientJs.includes('DEVELOPER_SURFACES_NOTICE'), 'Legacy CONNECT and SETTINGS tab content should share the external developer surface coming-soon notice.');
assert.ok(clientJs.includes('CAIt API keys are coming soon'), 'Settings API-key actions should show a coming-soon state.');
assert.ok(workActionRegistry.includes('API keys are currently coming soon'), 'Work action copy should not direct users to issue live API keys.');
assert.ok(appsJs.includes('/api/app-contexts?limit=10'), 'Apps JS should load recent contexts from CAIt, not local browser storage.');
assert.ok(appsJs.includes('operational_summary'), 'Apps JS should render safe retained context summary counts.');
assert.ok(appsJs.includes('contextAnchorChips'), 'Apps JS should render retained context anchors in the app hub.');
assert.ok(!appsJs.includes('localStorage'), 'Apps JS should not use localStorage for context history.');
assert.ok(!appsHtml.includes('localStorage'), 'Apps page copy should not describe localStorage-based context transfer.');
assert.ok(!/\b(?:localStorage|sessionStorage|indexedDB)\b|(?:^|[^\w])caches\./.test(appSurfaceSources), 'CAIt app surfaces should not use browser persistence APIs.');
assert.ok(!analyticsLoaderJs.includes('localStorage'), 'Analytics loader should not use browser localStorage for opt-out state.');
assert.ok(!clientJs.includes('localStorage'), 'Legacy client shell should not use browser localStorage for analytics opt-out state.');
assert.ok(analyticsLoaderJs.includes('cait_disable_ga4'), 'Analytics opt-out should use the shared cookie name.');
assert.ok(clientAnalyticsUtilsJs.includes('cait_disable_ga4'), 'Legacy client shell should use the shared analytics opt-out cookie name.');
assert.ok(!html.includes('/chatux/'), 'Root HTML must not reference /chatux.');
assert.ok(!chatHtml.includes('/chatux/'), 'Chat HTML must not reference /chatux.');
assert.ok(!html.includes('?tab=work'));
assert.ok(!html.includes('?tab=agents'));
assert.ok(!chatHtml.includes('?tab=work'));
assert.ok(!chatHtml.includes('?tab=agents'));
assert.ok(!html.includes('window.location.replace'), 'Root must render landing content directly instead of redirecting to /chatux.');
assert.ok(!html.includes('id="reviewPanel"'));
assert.ok(!html.includes('id="draftPanel"'));
assert.ok(!html.includes('Source-backed research first'));
assert.ok(!html.includes('Pass research into child agents'));
assert.ok(!html.includes('Show blockers before claiming execution'));
assert.ok(homeCss.includes('.home-hero'), 'Home CSS should style the landing hero.');
assert.ok(homeCss.includes('.builder-doc-section'), 'Home CSS should style the builder LP.');
assert.ok(appConsoleCss.includes('.app-console-shell'), 'App Console CSS should style the new CAIt app shell.');
assert.ok(appConsoleCss.includes('.side-nav'), 'App Console CSS should include old-GA-style side navigation.');
assert.ok(!appConsoleCss.includes('radial-gradient'), 'App Console CSS should avoid decorative gradient blobs.');

assert.ok(caitAppBridge.includes('cait-app-context/v1'), 'Shared app bridge should enforce the CAIt app context schema.');
assert.ok(caitAppBridge.includes('sendContextToCait'), 'Shared app bridge should expose Send to CAIt.');
assert.ok(caitAppBridge.includes('fetchCaitAppContextFromUrl'), 'Shared app bridge should let apps receive server-side CAIt contexts by id/token.');
assert.ok(caitAppBridge.includes('consumeCaitAppContextForChat'), 'Shared app bridge should let chat consume returned app context.');
assert.ok(caitAppBridge.includes('/api/app-contexts'), 'Shared app bridge should use the generic server-side app context API when possible.');
assert.ok(caitAppBridge.includes('BroadcastChannel'), 'Shared app bridge should notify an already-open chat without browser persistence.');
assert.ok(caitAppBridge.includes('app_context_id'), 'Shared app bridge should support server-side app context ids.');
assert.ok(caitAppBridge.includes('cait_app_context_id'), 'Shared app bridge should support CAIt app handoff context ids.');
assert.ok(!caitAppBridge.includes('localStorage'), 'Shared app bridge should not use browser localStorage for app context transfer.');
assert.ok(!caitAppBridge.includes('cait_context'), 'Shared app bridge should not embed app context payloads into URLs.');

assert.ok(analyticsJs.includes('source_app: \'analytics_console\''), 'Analytics Console should create analytics app context.');
assert.ok(analyticsJs.includes('search_queries'), 'Analytics Console should include search query artifacts.');
assert.ok(analyticsJs.includes('fetchCaitAppContextFromUrl'), 'Analytics Console should receive CAIt contexts through the server context API.');
assert.ok(analyticsJs.includes('applyInboundContext'), 'Analytics Console should map inbound context into the visible console state.');
assert.ok(analyticsJs.includes('/api/connectors/google/assets?include=gsc,ga4'), 'Analytics Console should fetch connected GA4 and Search Console assets.');
assert.ok(analyticsJs.includes('/api/connectors/google/analytics-report'), 'Analytics Console should fetch GA4 and Search Console reports after source selection.');
assert.ok(analyticsJs.includes('googleReportSources'), 'Analytics Console should track whether GA4 and Search Console loaded separately.');
assert.ok(analyticsJs.includes('googleReportSources: {'), 'Analytics Console context should carry loaded GA4/Search Console source flags.');
assert.ok(analyticsJs.includes('Report loaded with warnings'), 'Analytics Console should surface partial Google report failures.');
assert.ok(analyticsJs.includes('Google connected, no sources returned'), 'Analytics Console should separate connected-empty Google accounts from OAuth failures.');
assert.ok(analyticsJs.includes('googleApiErrors'), 'Analytics Console context should carry structured Google API failures for diagnosis.');
assert.ok(analyticsJs.includes('GA4 not loaded'), 'Analytics Console should not label missing GA4 data as loaded.');
assert.ok(analyticsJs.includes('function normalizeGa4Property'), 'Analytics Console should normalize manual GA4 property IDs.');
assert.ok(analyticsJs.includes('els.ga4PropertyInput?.value'), 'Analytics Console should read the manual GA4 property ID before loading reports.');
assert.ok(analyticsJs.includes('Requested ${requested.ga4_property}'), 'Analytics Console should show which GA4 property was sent when GA4 loading fails.');
assert.ok(analyticsJs.includes('channel_landing_pages'), 'Analytics Console should carry channel-by-landing-page drilldowns.');
assert.ok(analyticsJs.includes('channel_sources'), 'Analytics Console should carry referral/source-medium drilldowns.');
assert.ok(analyticsJs.includes('channel_breakdown'), 'Analytics Console should accept and return manifest-declared channel_breakdown artifacts.');
assert.ok(analyticsJs.includes('conversion_paths'), 'Analytics Console should accept and return manifest-declared conversion_paths artifacts.');
assert.ok(analyticsJs.includes('analyticsHandoffNotice'), 'Analytics Console should render handoff state without relying on pasted URL payloads.');
assert.ok(analyticsJs.includes('channel-drilldown-btn'), 'Analytics Console should make channel rows directly clickable.');
assert.ok(analyticsJs.includes('data-channel'), 'Analytics Console should attach channel drilldown state to each channel row.');
assert.ok(analyticsJs.includes('Referral sites'), 'Analytics Console should give Referral a site/source drilldown view.');
assert.ok(analyticsJs.includes('cait_analytics_sources'), 'Analytics Console should remember the last loaded Google sources.');
assert.ok(analyticsJs.includes('applyCachedGoogleSources()'), 'Analytics Console should restore the last loaded GA4/Search Console selection on startup.');
assert.ok(analyticsJs.includes('saveCachedGoogleSources({ ga4: Boolean(ga4), gsc: Boolean(gsc) })'), 'Analytics Console should save only successfully loaded Google source choices.');
assert.ok(analyticsJs.includes("url.searchParams.set('action', 'analytics_connect')"), 'Analytics Console Google connect should always use the narrow analytics connector action.');
assert.ok(analyticsJs.includes("url.searchParams.set('scope_group', kind === 'analytics' ? 'ga4,gsc' : kind)"), 'Analytics Console Google connect should pass the selected source scope group.');
assert.ok(analyticsJs.includes("kind === 'analytics' ? 'google.read_ga4,google.read_gsc'"), 'Analytics Console combined Google connect should pass both analytics capabilities.');
assert.ok(analyticsJs.includes("kind === 'gsc' ? 'google.read_gsc' : 'google.read_ga4'"), 'Analytics Console source-specific Google connect should pass one selected Google capability.');
assert.ok(!analyticsJs.includes('/auth/status'), 'Analytics Console connect buttons should not be blocked by a preflight request before OAuth redirect.');
assert.ok(analyticsJs.includes('updateGoogleConnectLinks'), 'Analytics Console should keep real OAuth links updated with the current app context return path.');
assert.ok(analyticsJs.includes('caitAuthOrigin'), 'Analytics Console should submit OAuth to the official CAIt auth origin even from preview origins.');
assert.ok(analyticsJs.includes('currentAnalyticsReturnPath()'), 'Analytics Console Google connect should preserve the current app-context URL.');
assert.ok(analyticsJs.includes('analyticsReturnSearch'), 'Analytics Console should keep the order app-context query available across Google OAuth redirects.');
assert.ok(analyticsJs.includes("url.searchParams.set('return_to', currentAnalyticsReturnPath())"), 'Analytics Console Google connect should return users to the active app context.');
assert.ok(analyticsJs.includes('Google connection failed'), 'Analytics Console should show the exact Google connector failure instead of a generic disconnected state.');
assert.ok(analyticsJs.includes('readAuthErrorFromUrl'), 'Analytics Console should show OAuth callback errors after returning to the app.');
assert.ok(analyticsHtml.includes('id="connectSearchConsoleBtn"'), 'Analytics Console should expose a Search Console connect button.');
assert.ok(analyticsJs.includes('googleSearchConsoleSite'), 'Analytics Console context should carry selected Search Console site.');
assert.ok(analyticsJs.includes('googleGa4Property'), 'Analytics Console context should carry selected GA4 property.');
assert.ok(analyticsJs.includes('googleReportLoaded'), 'Analytics Console context should indicate whether live Google report rows were loaded.');
assert.ok(analyticsJs.includes('country_mix'), 'Analytics Console should carry country performance rows for leaders.');
assert.ok(analyticsJs.includes('analyticsQueriesCount'), 'Analytics Console should update side navigation counts from runtime data.');
assert.ok(analyticsJs.includes('No server-side app context is loaded yet.'), 'Analytics Console should render an explicit empty state before server context is loaded.');
assert.ok(!/japan esim|best esim|tokyo esim|starter data/i.test(analyticsJs), 'Analytics Console should not ship built-in sample analytics rows.');
assert.ok(publisherJs.includes('source_app: \'publisher_approval_studio\''), 'Publisher Studio should create publisher approval context.');
assert.ok(publisherJs.includes('approval_requests'), 'Publisher Studio should include approval requests.');
assert.ok(publisherJs.includes('PUBLISH_DESTINATION_PROFILES'), 'Publisher Studio should normalize media destinations before connector handoff.');
assert.ok(publisherJs.includes("key: 'github_pr'") && publisherJs.includes("capability: 'site_publish_packet'"), 'Publisher Studio should separate generic owned-site publish packets from explicit GitHub PR handoffs.');
assert.ok(publisherJs.includes('connectorCapability'), 'Publisher Studio should carry per-media connector capabilities.');
assert.ok(publisherJs.includes('publishMethod'), 'Publisher Studio should carry per-media publish methods.');
assert.ok(publisherJs.includes("key: 'x'"), 'Publisher Studio should keep X as its own publish destination.');
assert.ok(publisherJs.includes("key: 'reddit'"), 'Publisher Studio should keep Reddit as its own publish destination.');
assert.ok(publisherJs.includes("key: 'indie_hackers'"), 'Publisher Studio should keep Indie Hackers as its own publish destination.');
assert.ok(publisherJs.includes("key: 'instagram'"), 'Publisher Studio should keep Instagram as its own publish destination.');
assert.ok(publisherJs.includes('itemProfileHandle'), 'Publisher Studio should carry account/profile metadata through editable packets.');
assert.ok(publisherJs.includes('itemMediaAssets'), 'Publisher Studio should carry media asset metadata through editable packets.');
assert.ok(publisherJs.includes('itemVisualAssetReadiness') && publisherJs.includes('visual_asset_readiness_matrix'), 'Publisher Studio should carry Instagram visual asset readiness through editable packets.');
assert.ok(publisherJs.includes('Instagram profile is identified'), 'Publisher Studio should run Instagram-specific profile readiness checks.');
assert.ok(publisherJs.includes('Instagram media assets are attached'), 'Publisher Studio should run Instagram-specific media readiness checks.');
assert.ok(publisherJs.includes('Instagram asset readiness matrix is retained'), 'Publisher Studio should show Instagram asset-readiness retention before posting.');
assert.ok(publisherJs.includes('manual_social_copy'), 'Publisher Studio should keep generic social copy out of GitHub PR fallback.');
assert.ok(publisherJs.includes('Generic publishing packet'), 'Publisher Studio should not default ambiguous packets to GitHub PR.');
assert.ok(publisherJs.includes('wordpress_application_password'), 'Publisher Studio should expose WordPress as an external-app style publish connector.');
assert.ok(publisherJs.includes('sourceEvidence'), 'Publisher Studio should preserve source evidence from writing-agent handoff artifacts.');
assert.ok(publisherJs.includes('publishVariants'), 'Publisher Studio should preserve three publish variants from writing-agent handoff artifacts.');
assert.ok(publisherJs.includes('## Publish variants'), 'Publisher Studio should include publish variants in approval handoff Markdown.');
assert.ok(publisherJs.includes('E-E-A-T notes'), 'Publisher Studio should include E-E-A-T notes in approval handoff Markdown.');
assert.ok(publisherJs.includes('/api/connectors/wordpress/create-draft'), 'Publisher Studio should create WordPress drafts through the connector API.');
assert.ok(publisherJs.includes('/api/connectors/x/status'), 'Publisher Studio should check X connector status before one-click X posting.');
assert.ok(publisherJs.includes('/api/deliveries/schedule'), 'Publisher Studio should schedule approved X posts through the delivery schedule API.');
assert.ok(publisherJs.includes('bulkPublishApproved'), 'Publisher Studio should support bulk publishing approved packets from the selected scope.');
assert.ok(publisherJs.includes('approved_text: text'), 'Publisher Studio should pass exact text approval for X posting.');
assert.ok(publisherJs.includes('fetchCaitAppContextFromUrl'), 'Publisher Studio should receive CAIt contexts through the server context API.');
assert.ok(publisherJs.includes('applyInboundContext'), 'Publisher Studio should map inbound context into editable approval packets.');
assert.ok(!publisherJs.includes('localStorage') && publisherJs.includes('server-side CAIt packet'), 'Publisher Studio should put planning inputs into server-side CAIt packets, not browser storage.');
assert.ok(publisherJs.includes('publisher_launch_axis_request') && publisherJs.includes('publisher_asset_draft_request'), 'Publisher Studio should call CAIt for planning axes and selected-axis asset drafting.');
assert.ok(publisherJs.includes('delivery_format_preference'), 'Publisher Studio should pass selected delivery shape into CAIt planning requests.');
assert.ok(publisherJs.includes('publisherSaasBillingModel') && publisherJs.includes('cait_usage'), 'Publisher Studio should preserve Publisher-login plus CAIt-usage billing context in packets.');
assert.ok(publisherJs.includes('/api/github/repos'), 'Publisher Studio should load GitHub repositories from the server.');
assert.ok(publisherJs.includes('/api/deliveries/execute'), 'Publisher Studio should use the delivery execution API for PR handoff.');
assert.ok(publisherJs.includes('confirm_execute'), 'Publisher Studio should explicitly confirm approval-gated PR handoff execution.');
assert.ok(publisherJs.includes('article_publish'), 'Publisher Studio should mark publish handoffs separately from generic code handoffs.');
assert.ok(publisherJs.includes('renderCounts'), 'Publisher Studio should update side navigation counts from runtime packets.');
assert.ok(publisherJs.includes('No publisher packet is loaded yet'), 'Publisher Studio should render an explicit empty state before server context is loaded.');
assert.ok(appContextDomainJs.includes('site_publish_packet') && appContextDomainJs.includes('social_copy_packet'), 'Server-side app context should preserve Publisher contract fields in raw_context.');
assert.ok(publisherJs.includes('publisherContractArtifactsFromContext'), 'Publisher Studio should import top-level Publisher contract fields from server raw_context.');
assert.ok(publisherJs.includes('PUBLISHER_CONTRACT_ALIASES') && publisherJs.includes('publisher_packet') && publisherJs.includes('content_package'), 'Publisher Studio should import AIAGENT publisher packet aliases from server raw_context.');
assert.ok(publisherJs.includes('selected_publisher_contract_type'), 'Publisher Studio should return the selected Publisher contract type for app-contract reuse.');
assert.ok(!/Japan eSIM|7-day Japan|directory-ai-agent-listing|post-japan-esim/i.test(publisherJs), 'Publisher Studio should not ship built-in sample publisher packets.');
assert.ok(leadOpsJs.includes('source_app: \'lead_ops_console\''), 'Lead Ops should create lead app context.');
assert.ok(leadOpsJs.includes('email_draft'), 'Lead Ops should include email draft artifacts.');
assert.ok(leadOpsJs.includes('email_drafts'), 'Lead Ops should preserve plural email_drafts from the app input contract.');
assert.ok(leadOpsJs.includes('LEAD_CONTEXT_PACKET_KEYS') && leadOpsJs.includes('lead_ops_packet'), 'Lead Ops should restore nested lead_ops_packet / crm_packet contract handoffs.');
assert.ok(leadOpsJs.includes('buildLeadSourcingContext') && leadOpsJs.includes('lead_acquisition_request'), 'Lead Ops should create a List Creator lead acquisition request when no rows exist.');
assert.ok(leadOpsJs.includes("handoff_targets: ['list_creator', 'cmo_leader', 'email_ops']"), 'Lead Ops sourcing requests should route to List Creator first.');
assert.ok(leadOpsJs.includes('contractRows(context, \'lead_rows\')'), 'Lead Ops should restore top-level raw_context lead rows after server app-context normalization.');
assert.ok(leadOpsJs.includes('leadOutreachPlanArtifacts'), 'Lead Ops should restore outreach_plan contract data from AIAGENT handoffs.');
assert.ok(leadOpsJs.includes('evidence_urls'), 'Lead Ops should merge evidence_urls artifacts into imported lead rows.');
assert.ok(leadOpsJs.includes('next_actions'), 'Lead Ops should merge next_actions artifacts into imported lead rows.');
assert.ok(leadOpsJs.includes('outreach_plan'), 'Lead Ops should include channel, schedule, and trigger outreach plans.');
assert.ok(leadOpsJs.includes('event_triggered_outreach'), 'Lead Ops should represent event-triggered outreach approval requests.');
assert.ok(leadOpsJs.includes('scheduled_outreach'), 'Lead Ops should represent scheduled outreach approval requests.');
assert.ok(leadOpsJs.includes('/api/deliveries/execute'), 'Lead Ops should use the shared delivery executor for Resend sends.');
assert.ok(leadOpsJs.includes('/api/deliveries/schedule'), 'Lead Ops should use the shared delivery scheduler for Resend sends.');
assert.ok(leadOpsJs.includes("action_kind: 'resend_send'"), 'Lead Ops should route email sends through CAIt Resend.');
assert.ok(leadOpsJs.includes('fetchCaitAppContextFromUrl'), 'Lead Ops should receive CAIt contexts through the server context API.');
assert.ok(leadOpsJs.includes('applyInboundContext'), 'Lead Ops should map inbound context into reviewable lead rows.');
assert.ok(leadOpsJs.includes('parseLeadRowsFromMarkdown'), 'Lead Ops should parse List Creator Markdown tables into lead rows.');
assert.ok(leadOpsJs.includes('Reviewable lead rows') || leadOpsJs.includes('company_name'), 'Lead Ops should recognize reviewable lead-row tables from agent deliveries.');
assert.ok(leadOpsJs.includes('leadAllNavCount'), 'Lead Ops should update side navigation counts from runtime rows.');
assert.ok(leadOpsJs.includes('No lead rows are loaded yet.') || leadOpsJs.includes('まだ営業先がありません。'), 'Lead Ops should render an explicit empty state before server context is loaded.');
assert.ok(!/Travel Creator|Remote Japan|Airport Arrival|example\.com\/japan-travel/i.test(leadOpsJs), 'Lead Ops should not ship built-in sample lead rows.');
assert.ok(deliveryManagerJs.includes('source_app: \'delivery_manager\''), 'Deliveries should create reusable delivery context.');
assert.ok(deliveryManagerJs.includes('delivery_files'), 'Delivery Manager should include delivery files.');
assert.ok(deliveryManagerJs.includes('fetchCaitAppContextFromUrl'), 'Delivery Manager should receive CAIt contexts through the server context API.');
assert.ok(deliveryManagerJs.includes('applyInboundContext'), 'Delivery Manager should map inbound context into delivery packages.');
assert.ok(deliveryManagerJs.includes('groupedDeliveries'), 'Delivery Manager should group runs by work item.');
assert.ok(deliveryManagerJs.includes('isLeaderDelivery'), 'Delivery Manager should put leader runs first inside each work item.');
assert.ok(deliveryManagerJs.includes('delivery-work-group'), 'Delivery Manager should render work items as dropdown groups.');
assert.ok(deliveryManagerJs.includes('approvalGateForDelivery'), 'Delivery Manager should derive human approval checkpoints from each delivery.');
assert.ok(!deliveryManagerJs.includes("handoff_targets: ['cmo_leader', 'seo_specialist', 'build_team_leader']"), 'Delivery Manager contexts must not hardcode follow-up agent targets.');
assert.ok(!deliveryManagerJs.includes("source: 'delivery_status'"), 'Delivery Manager must not synthesize authority_request objects from delivery status text.');
assert.ok(deliveryManagerJs.includes('/approve'), 'Delivery Manager approval gate should call the server approval resume endpoint.');
assert.ok(deliveryManagerJs.includes('approval_gate'), 'Delivery Manager should include approval gate state in reusable app context.');
assert.ok(appConsoleCss.includes('.delivery-approval-gate'), 'Delivery Manager approval gate should have app-console styling.');
assert.ok(!deliveryManagerJs.includes('local delivery samples'), 'Delivery Manager should not depend on local delivery sample payloads.');

assert.ok(chatJs.includes("from './chat-engine.js?v=20260526l'"), 'Chat JS should use root-relative shared chat engine import.');
assert.ok(!appHandoffTransferJs.includes("from './delivery-action-contract.js?v=20260501a'"), 'App handoff transfer must not parse delivery body text for legacy social-post extraction.');
assert.ok(!appHandoffTransferJs.includes('extractSocialPostTextFromDeliveryContent'), 'Dedicated app handoff text should come from explicit artifact metadata only.');
assert.ok(!chatJs.includes("from './delivery-action-contract.js?v=20260501a'"), 'Chat JS should not import delivery action parsing helpers directly.');
assert.ok(chatJs.includes("from './cait-app-bridge.js?v=20260526i'"), 'Chat JS should receive app contexts through the shared CAIt app bridge.');
assert.ok(chatJs.includes('hydrateAppContextFromUrl'), 'Chat should hydrate app context handoffs on explicit app return.');
assert.ok(chatJs.includes('await consumeCaitAppContextForChat()'), 'Chat should await server-side app context retrieval before filling the composer.');
assert.ok(chatJs.includes('refreshAppContexts'), 'Chat Apps panel should load reusable app contexts from the server.');
assert.ok(chatJs.includes('/api/app-contexts'), 'Chat should read app context history through the server API.');
assert.ok(chatJs.includes('BroadcastChannel'), 'Chat should receive app context handoffs from a separate same-origin app window.');
assert.ok(chatJs.includes('data-app-context-load'), 'Chat should let users load a server-side app context back into the composer.');
assert.ok(chatJs.includes('refreshRecentJobs'), 'Chat history should be derived from the server job API.');
assert.ok(chatJs.includes('compactChatRuntimeSnapshot'), 'Chat should compact runtime restore snapshots instead of using localStorage as order state.');
assert.ok(appManifestRegistryJs.includes('analytics-console'), 'Chat app catalog should include Analytics Console.');
assert.ok(appManifestRegistryJs.includes('publisher-approval-studio'), 'Chat app catalog should include Publisher and Approval Studio.');
assert.ok(appManifestRegistryJs.includes('lead-ops-console'), 'Chat app catalog should include Lead Ops Console.');
assert.ok(appManifestRegistryJs.includes('campaign-operations'), 'Chat app catalog should include Campaign Operations.');
assert.ok(appManifestRegistryJs.includes('pricing-decision-console'), 'Chat app catalog should include Pricing Decision Console.');
assert.ok(chatJs.includes('CORE_FEATURE_APP_IDS'), 'Chat should filter core CAIt features out of app manifests.');
assert.ok(!chatJs.includes("id: 'delivery-manager'"), 'Chat app catalog should not include Deliveries as an app.');
assert.ok(chatJs.includes("const CHATUX_RETURN_PATH = '/chat'"), 'OAuth and delivery return path should use the canonical chat route, not /chatux or /chat.html.');
assert.ok(chatJs.includes('CHATUX_OAUTH_RETURN_STATE_KEY'), 'Chat should keep a short-lived OAuth return snapshot for in-progress order recovery.');
assert.ok(chatJs.includes("url.searchParams.set('return_to', currentChatReturnPath());"), 'OAuth links should carry the active chat return path with restore identifiers.');
assert.ok(chatJs.includes("url.searchParams.set('cait_restore_chat', '1')"), 'Chat OAuth return paths should request active chat restoration.');
assert.ok(chatJs.includes("url.searchParams.set('cait_chat_session_id', sessionId)"), 'Chat OAuth return paths should include the active chat session id.');
assert.ok(chatJs.includes("url.searchParams.set('cait_order_id', orderId)"), 'Chat OAuth return paths should include the active order id.');
assert.ok(chatJs.includes("url.searchParams.set('cait_oauth_popup', '1')"), 'Chat Google connector return paths should mark popup OAuth returns.');
assert.ok(connectorGateJs.includes('data-chat-oauth-popup="google"'), 'Chat Google connector approval links should open OAuth outside the active chat tab.');
assert.ok(chatJs.includes('function openChatOAuthPopup'), 'Chat should keep the active thread open while Google OAuth runs in a separate window.');
assert.ok(chatJs.includes('function ensureAuthRefreshProgress') && chatJs.includes('window.setTimeout(ensureAuthRefreshProgress, 8000)'), 'Chat should retry auth refresh if startup remains stuck at Checking session.');
assert.ok(connectorGateJs.includes("type: 'cait-oauth-return'"), 'OAuth popup returns should notify the original chat window.');
assert.ok(chatJs.includes('handleOAuthPopupReturnMessage'), 'Original chat should refresh connector/order state after popup OAuth completes.');
assert.ok(chatJs.includes('restoreChatOAuthReturnStateFromUrl'), 'Chat should restore the active thread immediately after Google OAuth returns.');
assert.ok(chatJs.includes('restoreRequestedChatSessionFromHistory'), 'Chat should fall back to server chat memory when the OAuth snapshot is unavailable.');
assert.ok(connectorGateJs.includes("saveOAuthState?.('oauth_link_click')"), 'Chat should save the latest runtime state immediately before OAuth navigation.');
assert.ok(!chatJs.includes('/auth/x'), 'Chat must not expose X OAuth; X auth/publish belongs to the SaaS handoff surface.');
assert.ok(!chatJs.includes('data-chat-oauth-popup="x"'), 'Chat must not open X OAuth popups.');
assert.ok(!chatJs.includes('Connect X'), 'Chat must not show Connect X actions.');
assert.ok(chatJs.includes('maybeRenderAuthorityNotice(job'), 'Chat should render approval or connector requests while an order is still running.');
assert.ok(connectorGateJs.includes("['failed', 'timed_out'].includes(String(job.status || '').trim().toLowerCase())"), 'Chat should not show stale connector approval cards on failed or timed-out orders.');
assert.ok(connectorGateJs.includes('connectorGateGoogleAuthHrefForAuthority'), 'Chat approval cards should link directly to the required Google connector scope.');
assert.ok(connectorGateJs.includes("Connect Search Console") && connectorGateJs.includes("Connect GA4"), 'Chat approval cards should label GA4 and Search Console connector actions separately.');
assert.ok(!chatJs.includes('/chatux/'), 'Chat JS must not navigate users to /chatux.');
assert.ok(chatJs.includes('function showChatListPanel'), 'Chat should expose recent chat/order list modal.');
assert.ok(chatJs.includes('function showWorkerListPanel'), 'Chat should expose worker/agent list modal.');
assert.ok(chatJs.includes('function notifyOrderMilestone'), 'Chat should project Order state through a centralized milestone notifier.');
assert.ok(chatJs.includes('function orderMilestoneState'), 'Chat milestone state should be derived from the fetched Order object.');
assert.ok(chatJs.includes('orderMilestoneNoticeKeys'), 'Chat milestone notifications should be idempotent per order state.');
assert.ok(chatJs.includes('orderMilestoneChatExists'), 'Reloaded chats should not duplicate already-rendered milestone messages.');
assert.ok(!chatJs.includes('Sending order. I will keep polling and post progress here.'), 'Chat should not post worker-log style send/progress noise.');
assert.ok(chatJs.includes('function renderInitialAgentMap'), 'Chat should render the initial Agent map immediately after order creation.');
assert.ok(chatHtml.includes('deliveryFormatSelect') && chatJs.includes('selectedDeliveryFormat'), 'Chat orders should let users choose delivery shape before dispatch.');
assert.ok(chatEngine.includes('delivery_format_preference') && chatEngine.includes('delivery_format'), 'Chat order payloads should preserve the selected delivery shape.');
assert.ok(chatJs.includes('renderInitialAgentMap(created'), 'Send order should attach the initial Agent map to accepted/recovered workflow orders.');
assert.ok(chatJs.includes('showWorkflowProgressMap(job);'), 'Polling/backfill should keep the Agent map progress tree updated in chat.');
assert.ok(chatJs.includes('data-agent-run-open'), 'Agent map nodes should open a per-agent status and intermediate-deliverable detail panel.');
assert.ok(chatJs.includes('function openAgentRunDetail'), 'Agent map clicks should fetch and render the selected child run detail.');
assert.ok(chatJs.includes('function renderAgentRunDetailHtml'), 'Agent map run details should render status, logs, text, and files from the child job.');
assert.ok(chatCss.includes('.agent-run-detail-panel'), 'Chat CSS should style the Agent map run detail panel.');
assert.ok(chatJs.includes('notifyOrderMilestone(job)'), 'Polling/backfill should notify chat only through Order milestones.');
assert.ok(!chatJs.includes('function authorityRequestFromText') && !connectorGateJs.includes('delivery_text_approval'), 'Chat connector approval controls should come from structured agent authority requests, not text inference.');
assert.ok(connectorGateJs.includes('executorState.authorityRequired'), 'Chat should render approval controls from executorState authority requests.');
assert.ok(chatJs.includes('data-chat-order-approve'), 'Chat approval cards should use a dedicated approval action instead of a status-only refresh.');
assert.ok(chatJs.includes('/approve'), 'Chat approval action should call the server approval resume endpoint.');
assert.ok(chatJs.includes("fetchVisibleJob(orderId, { force: true })"), 'Explicit Check status clicks should bypass cached jobs and fetch fresh order state.');
assert.ok(chatJs.includes('appendOrderStatusCheck(job)'), 'Explicit Check status clicks should visibly report the refreshed order state.');
assert.ok(chatCss.includes('.message-meta') && chatCss.includes('text-transform: none'), 'Chat message labels should preserve CAIt casing instead of rendering CAIT.');
assert.ok(chatJs.includes('function threadIsNearBottom'), 'Chat should only auto-scroll progress updates when the reader is already near the latest message.');
assert.ok(chatJs.includes('includeAdaptivePending: true'), 'Agent maps should show adaptive planned later layers instead of hiding all future action work.');
assert.ok(chatJs.includes('function explicitLeaderChangeTaskTypeFromText'), 'Chat intake routing should use a narrow explicit-leader helper instead of broad role-specific fallbacks.');
assert.ok(!chatJs.includes('function leaderTextHasCmoSignal'), 'Chat client must not keep broad CMO intent routing outside the CMO leader definition.');
assert.ok(!workIntentResolver.includes('isBroadMarketingGrowthIntentText'), 'Shared client intent resolver must not route broad growth/marketing prompts directly to CMO.');
assert.ok(!clientJs.includes('pushCmoGrowthTasks'), 'Open Chat client must not duplicate CMO workflow task expansion.');
assert.ok(!clientJs.includes('pushAgentTeamLaunchTasks'), 'Open Chat client must not duplicate CMO launch-team task expansion.');
assert.ok(!chatJs.includes('function leaderTextHasSpecificCpoSignal'), 'Chat client must not keep broad CPO product-strategy routing outside the CPO leader definition.');
assert.ok(!chatJs.includes('function leaderTextHasSpecificCtoSignal'), 'Chat client must not keep broad CTO architecture routing outside the CTO leader definition.');
assert.ok(!chatJs.includes('function leaderTextHasSpecificBuildSignal'), 'Chat client must not keep broad Build leader routing outside the Build leader definition.');
assert.ok(chatJs.includes('activeLeaderLocked: false'), 'Chat should track when a leader has been confirmed and locked.');
assert.ok(chatJs.includes('function lockedLeaderOwnerForPrompt'), 'Chat should preserve a confirmed leader unless the user explicitly asks to change it.');
assert.ok(!chatJs.includes('function leaderFollowupSpecialistTaskForText'), 'Chat must not own leader follow-up specialist routing; server/leader definitions decide specialist follow-ups.');
assert.ok(chatJs.includes('suppressLeaderLock'), 'Server/leader-routed specialist follow-up drafts should not be rewritten back to the locked leader on SEND ORDER.');
assert.ok(chatJs.includes('function explicitActiveOrderFollowupRequestText'), 'Active-order follow-ups must require explicit continuation wording.');
assert.ok(chatJs.includes('return explicitActiveOrderFollowupRequestText(compact);'), 'Generic messages in an active order chat should start new intake/order work instead of becoming follow-ups.');
assert.ok(chatJs.includes('function draftIsExplicitFollowupContinuation'), 'Send order should only preserve followup_to_job_id for explicitly requested continuations.');
assert.ok(chatJs.includes('userExplicitContinuation: true'), 'Explicit follow-up drafts should carry an auditable continuation flag.');
assert.ok(chatJs.includes('Start a new request'), 'Active-order composer copy should say new requests start fresh by default.');
assert.ok(chatJs.includes('function suggestLeaderChangeIfNeeded'), 'Chat should ask before changing away from a confirmed leader.');
assert.ok(chatJs.includes('data-chat-action="keep-leader"'), 'Chat should offer a keep-current-leader action when a different leader is suggested.');
assert.ok(chatJs.includes('data-chat-action="switch-leader"'), 'Chat should offer an explicit switch-leader action instead of automatically changing the leader.');
assert.ok(chatJs.includes('leaderChangeRequested'), 'Chat should mark explicit user leader-change requests separately from automatic reclassification.');
assert.ok(chatJs.includes("chat-engine.js?v=20260526l"), 'Chat should cache-bust the chat engine when retry payload fields change.');
assert.ok(chatJs.includes("delivery-renderer.js?v=20260526a"), 'Chat should cache-bust the delivery renderer when agent work-product ledger rendering changes.');
assert.ok(deliveryRendererJs.includes('Agent work products') && deliveryRendererJs.includes('specialist_output_ledger'), 'Delivery renderer should expose the per-agent work-product ledger in completed chat deliveries.');
assert.ok(chatCss.includes('.agent-work-products') && chatCss.includes('.agent-work-product-row'), 'Chat CSS should style the per-agent work-product ledger.');
assert.ok(chatJs.includes('function retryDraftFromJob'), 'Chat should prepare retries from the previous persisted order.');
assert.ok(chatJs.includes("fetchVisibleJob(safeId, { force: true, progress: false, inspectOnly: true })"), 'Prepare retry should inspect the saved order without triggering progress side effects.');
assert.ok(chatJs.includes('function handleRetryCommand'), 'Chat should treat typed retry commands as explicit retry preparation instead of a new order.');
assert.ok(chatJs.includes('retryCommandText(compact)'), 'Chat should prevent typed retry commands from becoming running-order followups.');
assert.ok(chatJs.indexOf('await handleRetryCommand(prompt)') < chatJs.indexOf('activeOrderFollowupAllowedText(prompt)'), 'Typed retry should be handled before active-order followup routing.');
assert.ok(chatJs.includes('Retry as new order'), 'Retry actions should clearly say they create a new order, not continue the selected order.');
assert.ok(chatJs.includes('CHATUX_RETRY_MODE_NEW_ORDER'), 'Retry drafts should carry an explicit new-order retry mode.');
assert.ok(chatJs.includes('draftIsSameContentNewOrderRetry'), 'Send order should distinguish same-content new-order retries from follow-up requests.');
assert.ok(chatJs.includes('sameContentRetryAsNewOrder') && chatJs.includes('delete payload.followup_to_job_id'), 'Same-content retries must strip follow-up ids before dispatch.');
assert.ok(chatJs.includes('既存オーダー') && chatJs.includes('続きではありません'), 'Japanese retry confirmation should explicitly say the retry is not a continuation.');
assert.ok(chatJs.includes('preservePrompt: true'), 'Retry drafts should preserve the previous order prompt instead of redrafting from the retry message.');
assert.ok(chatJs.includes('preservePlan: plannedTasks.length > 0'), 'Retry drafts should mark previous workflow plans for preservation.');
assert.ok(chatJs.includes('workflowPlannedTasks: plannedTasks'), 'Retry drafts should carry previous workflow planned tasks.');
assert.ok(chatJs.includes('function renderRetryReuseControls'), 'Failed deliveries should expose optional user-selected artifact reuse controls.');
assert.ok(chatJs.includes('data-retry-reuse-artifact'), 'Retry reuse must require an explicit checkbox selection per completed artifact.');
assert.ok(chatJs.includes('selectedRetryReuseArtifactsForOrder'), 'Retry preparation should carry only the selected completed artifacts.');
assert.ok(chatJs.includes('retryReuseArtifacts'), 'Retry drafts should preserve selected artifacts for the new order payload.');
assert.ok(chatEngine.includes('active_leader_locked'), 'Chat engine should send active leader lock state in prepare and job payloads.');
assert.ok(chatEngine.includes('fallbackLeaderLocked'), 'Chat engine should ignore unlocked active leader fallbacks when deriving the conversation owner.');
assert.ok(chatEngine.includes('workflow_planned_tasks'), 'Chat engine should send preserved workflow planned tasks when retrying a workflow order.');
assert.ok(workOrderRoutes.includes('function applyActiveLeaderLockToOrderBody'), 'Work order routes should enforce locked chat leader routing server-side.');
assert.ok(workflowPlanAssembly.includes('function workflowPlannedTasksFromOrderBody'), 'Workflow plan assembly should read preserved workflow plans from retry order payloads.');
assert.ok(workflowPlanAssembly.includes('preservePlannedTasks'), 'Workflow plan assembly should bypass workflow plan expansion when retrying with a preserved plan.');
assert.ok(workflowPlanAssembly.includes('function workflowReuseArtifactsFromOrderBody'), 'Workflow plan assembly should read user-selected retry reuse artifacts from the order payload.');
assert.ok(orderCreateRoutes.includes('reused_completed_artifact'), 'Order create routes should mark selected retry artifacts as completed reused child runs instead of dispatching the agent again.');
assert.ok(orderCreateRoutes.includes('The assigned agent was not dispatched for this step in the new order.'), 'Reused child outputs should clearly state that the agent step was skipped.');
assert.ok(chatJs.includes('function showAppListPanel'), 'Chat should expose app list modal.');
assert.ok(chatJs.includes('registeredApps: []'), 'Chat should keep registered marketplace apps in state.');
assert.ok(chatJs.includes('const CHATUX_CATALOG_PAGE_SIZE = 10'), 'Workers and apps should initially load only ten catalog rows.');
assert.ok(chatJs.includes("api(catalogApiPath('/api/apps', options)"), 'Chat app list should refresh registered apps from the paged app registry API.');
assert.ok(chatJs.includes("api(catalogApiPath('/api/agents', options)"), 'Chat worker list should refresh workers from the paged agent registry API.');
assert.ok(chatJs.includes('data-utility-load-more'), 'Worker and app panels should lazy-load additional rows on demand.');
assert.ok(chatJs.includes('function warmUtilityCatalogs'), 'Chat should prefetch the first catalog page after auth.');
assert.ok(!chatJs.includes("api('/api/snapshot', { method: 'GET' })"), 'Worker/app panels should not fetch the full snapshot just to list workers.');
assert.ok(chatJs.includes('function showInfoPanel'), 'Chat should expose account/info modal.');
assert.ok(chatJs.includes("adminNavLink: $('adminNavLink')"), 'Chat should wire the admin nav link.');
assert.ok(chatJs.includes('activeLeader: null'), 'Chat should track whether CAIt or a leader owns the current conversation.');
assert.ok(chatJs.includes('activeOwner: null'), 'Chat should track generic agent and leader conversation owners.');
assert.ok(chatJs.includes('function lockedAgentOwnerForPrompt'), 'Chat should preserve a confirmed agent across follow-up turns.');
assert.ok(chatJs.includes('Agent:'), 'Chat should show when an individual agent owns the conversation.');
assert.ok(chatEngine.includes('active_owner_locked'), 'Chat engine should send active agent/leader owner lock state in prepare and job payloads.');
assert.ok(workOrderRoutes.includes('function applyActiveConversationOwnerLockToOrderBody'), 'Work order routes should enforce locked agent and leader conversation routing server-side.');
assert.ok(chatJs.includes('function setConversationOwnerFromPrepared'), 'Chat should switch the visible conversation owner from prepare-order responses.');
assert.ok(chatJs.includes('CAIt specialist router'), 'Chat drafts should make direct specialist routing explicit.');
assert.ok(chatJs.includes('function intakeInitialAnswerSuggestions'), 'Intake choices should extract usable answers from the initial chat prompt.');
assert.ok(chatJs.includes('function intakeSuggestionLooksLikeQuestion'), 'Intake initial choices should reject question text as a confirmed answer.');
assert.ok(chatJs.includes('intake.originalPrompt') && !/function intakeSourceText[\s\S]{0,220}intake\.questions/.test(chatJs), 'Intake initial choice extraction should not treat generated intake questions as already selected answers.');
assert.ok(chatJs.includes('function seedIntakeInitialChoices'), 'Initial prompt-derived intake answers should be added to the editable composer.');
assert.ok(chatJs.includes('From initial request'), 'Initial prompt-derived intake answers should be visibly marked as confirmed candidates.');
assert.ok(
  chatJs.includes("els.adminNavLink.hidden = !(auth.isPlatformAdmin || auth.admin)")
    || chatJs.includes("els.adminNavLink.hidden = !(auth?.isPlatformAdmin || auth?.admin)"),
  'Chat should reveal admin only for platform admins.'
);
assert.ok(chatJs.includes('href="/admin">Admin</a>'), 'Info panel should include an admin shortcut for platform admins.');
assert.ok(chatHtml.includes('href="/account-settings.html"'), 'Chat header should link to account settings.');
assert.ok(chatJs.includes('Account settings'), 'Info panel should link to account settings.');
assert.ok(accountSettingsHtml.includes('uiLanguageSelect'), 'Account settings should render the language selector.');
assert.ok(accountSettingsJs.includes("api('/api/settings/profile'"), 'Account settings should save the UI language through the profile settings API.');
assert.ok(accountSettingsJs.includes('cait.uiLanguage.v1'), 'Account settings should mirror the UI language locally for immediate chat use.');
assert.ok(accountSettingsHtml.includes('deleteConfirmInput'), 'Account settings page should render delete confirmation input.');
assert.ok(accountSettingsHtml.includes('deleteAccountBtn'), 'Account settings page should render delete account button.');
assert.ok(accountSettingsJs.includes("api('/api/settings/account'"), 'Account settings should call the account deletion API.');
assert.ok(accountSettingsJs.includes("body: { confirm: 'DELETE' }"), 'Account deletion UI should send explicit typed confirmation.');
assert.ok(accountSettingsJs.includes("headers.set('x-aiagent2-csrf', state.auth.csrfToken)"), 'Account deletion UI should attach CSRF for unsafe writes.');
assert.ok(chatJs.includes('function signOut'), 'Chat should expose sign out.');
assert.ok(chatJs.includes("await api('/auth/logout'"), 'Chat sign out should call the logout API.');
assert.ok(chatJs.includes("purgeChatStateForAccountBoundary('sign_out')"), 'Chat sign out should clear account-scoped local chat state before redirecting.');
assert.ok(chatJs.includes('safeSessionStorageRemove(CHATUX_OAUTH_RETURN_STATE_KEY)'), 'Chat sign out/account boundary should remove OAuth return state.');
assert.ok(chatJs.includes('data-chat-logout'), 'Chat should render logout controls.');
assert.ok(chatJs.includes("new URL('/login', window.location.origin)"), 'Chat should client-gate unauthenticated static asset access.');
assert.ok(chatJs.includes("loginUrl.searchParams.set('next', nextPath || CHATUX_RETURN_PATH)"), 'Chat login gate should preserve the current chat path and context query.');
assert.ok(chatJs.includes('const CHATUX_CONNECT_WAIT_MS = 60 * 60 * 1000'), 'Chat auth and connector checks should wait up to 60 minutes before aborting user-action flows.');
assert.ok(chatJs.includes('timeoutMs: CHATUX_CONNECT_WAIT_MS'), 'Chat auth checks should use the long connector wait budget.');
assert.ok(chatJs.includes('connectorGateStartOAuthPopupMonitor') && connectorGateJs.includes('Math.ceil(waitMs / intervalMs)'), 'Chat OAuth popup monitoring should keep waiting for the full connector window.');
assert.ok(chatJs.includes('function csrfRequiredApiError'), 'Chat API helper should detect CSRF write failures.');
assert.ok(chatJs.includes('await refreshAuthForUnsafeWrite'), 'Chat API helper should refresh auth before/retry browser writes that need CSRF.');
assert.ok(chatJs.includes("headers.set('x-aiagent2-csrf', state.auth.csrfToken)"), 'Chat API helper should attach refreshed CSRF tokens to unsafe same-origin writes.');
assert.ok(chatJs.includes("await apiWithRetry('/api/work/prepare-order'"), 'Chat should retry transient prepare-order failures before surfacing an error.');
assert.ok(chatJs.includes('maxAttempts: 5'), 'Chat prepare-order retry should wait through short production 5xx/429 bursts.');
assert.ok(chatJs.includes('intake.taskType || intake.task_type'), 'Intake answers should preserve the originally selected leader task.');
assert.ok(chatJs.includes('taskType: task'), 'Worker list choices should pass the chosen task type into prepare-order.');
assert.ok(chatJs.includes('data-utility-agent-id'), 'Worker Use buttons should carry the selected agent id, not only the task type.');
assert.ok(chatJs.includes('selectedAgentId: agentId'), 'Worker Use should pin the selected agent in the order draft.');
assert.ok(chatJs.includes('function chatText'), 'Chat user-facing status text should go through a language helper.');
assert.ok(chatJs.includes('function chatUiText'), 'Chat fixed controls should have a separate UI-language helper.');
assert.ok(chatJs.includes('I will prepare an order in chat using'), 'Worker Use status should have an English UI copy path.');
assert.ok(chatJs.includes('prepared_in_chat: true'), 'Approved chat orders should mark the intake/preparation gate as already completed.');
assert.ok(chatJs.includes("await api('/api/jobs'"));
assert.ok(!chatJs.includes("await api('/api/connectors/x/post'"), 'Chat should hand publishable X drafts to the SaaS surface instead of posting directly.');
assert.ok(!chatJs.includes('data-x-post-submit'), 'Chat should not render direct X post buttons; publishing belongs to the SaaS surface.');
assert.ok(!chatJs.includes('confirm_post: true'), 'Chat should not send direct X connector confirmation payloads.');
assert.ok(!chatJs.includes('approved_x_username'), 'Chat should not collect connector posting account fields for direct X posting.');
assert.ok(!chatJs.includes('approved_text'), 'Chat should not send direct X connector approved_text payloads.');
assert.ok(!chatJs.includes("xConnectLinkHtml('Connect X', 'primary')"), 'X authority cards must not request X OAuth in chat; publish auth belongs to SaaS.');
assert.ok(chatJs.includes('function renderDedicatedAppDeliveryTools'), 'Dedicated app delivery cards should render from manifest-declared app contracts.');
assert.ok(chatJs.includes('Final action: ${escapeHtml(entry.name'), 'Dedicated delivery card headings should use the manifest app name instead of a hardcoded app id.');
assert.ok(chatJs.includes('CAIt has attached the prepared handoff text and strategy context declared by the app manifest.'), 'Dedicated delivery card explanation should describe manifest-declared handoff context.');
assert.ok(appHandoffTransferJs.includes('export function appTransferPayloadWithEditedText'), 'Editable SaaS handoff transfer updates should live in the app handoff transfer module.');
assert.ok(chatJs.includes('appTransferPayloadWithEditedText(payload, appHandoffButton, { compactTransferText })'), 'Chat should delegate edited SaaS handoff transfer updates to the shared transfer module.');
assert.ok(chatJs.includes('data-app-transfer-editable="text"'), 'X draft edits should be carried through the generic app handoff path.');
assert.ok(appHandoffTransferJs.includes("`Current edited handoff text:\\n${text || '[empty]'}`"), 'Editable SaaS handoff cards should preserve an intentionally emptied text field instead of falling back to stale payload text.');
assert.ok(!chatJs.includes('if (!text) return payload;'), 'Editable SaaS handoff cards must not ignore cleared handoff text.');
assert.ok(appHandoffTransferJs.includes('export function appHandoffContractTextMinimum'), 'Generic app handoff text minimum validation should live in the transfer module.');
assert.ok(appHandoffTransferJs.includes('export function appHandoffPayloadContractError'), 'Generic app handoffs should validate manifest-declared input constraints before opening the app.');
assert.ok(appHandoffTransferJs.includes('explicitMetadataText(file, [') && appHandoffTransferJs.includes("'post_text'"), 'Dedicated social handoff text should prefer explicit file metadata before legacy content extraction.');
assert.ok(appHandoffTransferJs.includes('function appHandoffTransferPostText') && appHandoffTransferJs.includes('payload.x_post_packet'), 'X Client Ops handoff should recover post_text from packet-shaped AIAGENT output.');
assert.ok(appHandoffTransferJs.includes("appHandoffTransferManifestAccepts(manifest, 'post_text')"), 'Generic app context fallback must only create post_text artifacts when the target app manifest explicitly accepts post_text.');
assert.ok(appHandoffTransferJs.includes('x_post_packet: payload.x_post_packet || payload.xPostPacket || null'), 'X Client Ops transfer should preserve the source x_post_packet in raw_context.');
assert.ok(appHandoffTransferJs.includes('APP_HANDOFF_X_CONTRACT_FIELDS') && appHandoffTransferJs.includes('replyToTweetId') && appHandoffTransferJs.includes('postingWindow'), 'X Client Ops transfer should canonicalize account, reply target, posting window, and proof-source anchors.');
assert.ok(appManifestRegistryJs.includes('reply_target') && appManifestRegistryJs.includes('posting_window') && appManifestRegistryJs.includes('proof_source'), 'X Client Ops manifest should declare operational anchors beyond post text.');
assert.ok(appManifestRegistryJs.includes('constraints:') && appManifestRegistryJs.includes('minLength: 1, maxLength: 280'), 'X Client Ops text length should be declared in its app manifest contract.');
assert.ok(appHandoffTransferJs.includes('requires handoff text before opening the app'), 'Required app handoff text should block empty SaaS handoffs before opening an external action app.');
assert.ok(!chatJs.includes('function appHandoffPayloadContractError'), 'Chat must not duplicate manifest text constraint validation.');
assert.ok(!chatJs.includes('data-x-client-ops-link'), 'X Client Ops must not keep a privileged chat-only handoff click path.');
assert.ok(!chatJs.includes('createXClientOpsHandoffUrl'), 'X Client Ops handoff should use the generic manifest-declared app handoff proxy.');
assert.ok(appManifestRegistryJs.includes('dedicatedDelivery'), 'Apps with a dedicated delivery card should declare that display contract in the app manifest.');
assert.ok(appManifestRegistryJs.includes("preparedTextSource: 'social_post_text'"), 'Dedicated delivery cards should declare the prepared text source in the app manifest.');
assert.ok(appsDomainJs.includes('DEFAULT_X_CLIENT_OPS_DEDICATED_DELIVERY'), 'Server-side app seeds should share the same dedicated delivery contract instead of relying only on browser static manifests.');
assert.ok(appsDomainJs.includes("contextIngestUrl: DEFAULT_PUBLISHER_CONTEXT_INGEST_URL"), 'Server-side Publisher app seed should expose its context ingest route.');
assert.ok(chatJs.includes('const manifest = app?.metadata?.manifest'), 'Chat app manifest normalization should read server-persisted manifest metadata.');
assert.ok(chatJs.includes('dedicatedDelivery: normalized.dedicatedDelivery || existing.dedicatedDelivery'), 'Chat app catalog merging should not let refreshed registered app rows erase static dedicated handoff contracts.');
assert.ok(appHandoffGateJs.includes('export function appHandoffSuppressesGenericCard'), 'Generic app handoff suppression should be owned by the app handoff gate.');
assert.ok(chatJs.includes('function genericSuppressedAppHandoffIds'), 'Chat should suppress generic app rows when a manifest-declared dedicated handoff card opts into suppression.');
assert.ok(chatJs.includes('appHandoffGateGenericSuppressedAppHandoffIds'), 'Chat should delegate duplicate generic handoff suppression to the app handoff gate.');
assert.ok(appHandoffGateJs.includes('config.suppressGenericCard !== false && config.suppress_generic_card !== false'), 'Dedicated delivery cards should suppress duplicate generic cards by default while allowing manifest opt-out.');
assert.ok(appHandoffGateJs.includes('export function appHandoffDedicatedTextSourceKind'), 'App handoff gate should resolve dedicated prepared text source contracts.');
assert.ok(!chatJs.includes("ids.add('x-client-ops')"), 'Generic app handoff suppression must not hard-code a CAIt-managed app id.');
assert.ok(!chatJs.includes("appManifestById('x-client-ops')"), 'Dedicated delivery rendering must not look up a CAIt-managed app by hardcoded id.');
assert.ok(!chatJs.includes("appAgentBaseTransferPacket('x-client-ops'"), 'Dedicated delivery transfer packets must use the manifest app id.');
assert.ok(chatJs.includes('appHandoffBaseTransferPacket(appId, job, appHandoffTransferOptions('), 'Chat should delegate app transfer packet assembly to the app handoff transfer module.');
assert.ok(chatJs.includes(".filter((entry) => !suppressedIds.has(normalizeUsageId(entry.id || '')))"), 'Generic app handoff cards should not duplicate a dedicated final-action app card.');
assert.ok(chatJs.includes('authorityRequestHandledBySaasHandoffInChat(authorityRequestFromJob(job))'), 'Explicit X handoff authority waits should be eligible for SaaS app handoff instead of chat approval dead-ends.');
assert.ok(appHandoffGateJs.includes('x_post_approval'), 'Explicit X approval artifact metadata should still route to X Client Ops app handoff.');
assert.equal(
  explicitHandoffArtifactTypesFromAuthorityRequest({
    missing_connectors: ['x'],
    missing_connector_capabilities: ['x.post'],
    reason: 'X connector approval is required.'
  }).size,
  0,
  'Connector-only authority requests must not synthesize app handoff artifact types.'
);
assert.equal(
  explicitHandoffArtifactTypesFromAuthorityRequest({
    action_kinds: ['x_post_approval']
  }).has('x_post_packet'),
  true,
  'Explicit authority request action metadata should still route X app handoff artifacts.'
);
assert.ok(chatJs.includes('function renderAppHandoffTools'), 'Chat deliveries should expose generic app handoff cards.');
assert.ok(chatJs.includes('function renderAppHandoffTree'), 'Chat deliveries should render the preparation artifact to app routing tree.');
assert.ok(chatJs.includes('function renderAppHandoffRoutingPreview'), 'Agent map progress should preview SaaS routing before final delivery.');
assert.ok(chatJs.includes('handoffHtml: renderAppHandoffRoutingPreview(job)'), 'Workflow progress maps should include the preparation artifact to SaaS app route.');
assert.ok(appHandoffTransferJs.includes("content_type: artifactTypes[0] || file?.content_type || file?.contentType || file?.artifact_type || file?.artifactType || file?.type || ''"), 'App context handoff should preserve explicit delivery artifact type contracts before MIME fallbacks.');
assert.ok(appHandoffTransferJs.includes('export function appContextFromTransferPayload'), 'Generic app handoff fallback context conversion should live in the transfer module.');
assert.ok(appHandoffTransferJs.includes('delivery_files: [...transferDeliveryFiles, ...fileArtifacts]'), 'Generic app handoff fallback should promote transfer delivery artifacts to server-side delivery_files.');
assert.ok(appHandoffTransferJs.includes('contentPreview'), 'Generic app handoff fallback should preserve compact delivery artifact previews as app context content.');
assert.ok(appHandoffGateJs.includes('Preparation data routing'), 'App handoff cards should label the preparation data routing tree.');
assert.ok(chatJs.includes('appHandoffEntryMatchesArtifact'), 'App handoff routing tree should use the same contract matching as the app handoff cards.');
assert.ok(appHandoffGateJs.includes('destinationConnectors'), 'App handoff routing tree should show destination connector/capability hints from app manifests.');
assert.ok(appManifestRegistryJs.includes("owned_site: { connector: 'publisher', capability: 'site_publish_packet', method: 'publisher_review_or_selected_connector' }"), 'Owned-site Publisher handoff should not default to GitHub PR authority.');
assert.ok(chatJs.includes("['completed', 'failed', 'blocked', 'waiting'].includes(status)"), 'Chat app handoffs should render when preparation data exists for completed or partial deliveries.');
assert.ok(appHandoffGateJs.includes('export function appHandoffRelevanceScore'), 'Generic app handoff cards should score relevance in the handoff gate module.');
assert.ok(appHandoffGateJs.includes('export function appHandoffSpecificityScore'), 'Generic app handoff cards should rank specialized apps in the handoff gate module.');
assert.ok(appHandoffGateJs.includes('export function appHandoffRankEntries'), 'App handoff candidate ranking should live with the handoff gate contract matching.');
assert.ok(chatJs.includes('appHandoffGateRankEntries'), 'Chat should delegate app handoff candidate ranking to the handoff gate module.');
assert.ok(!chatJs.includes('function appHandoffRelevanceScore'), 'Chat must not duplicate app handoff relevance scoring.');
assert.ok(!chatJs.includes('function appHandoffSpecificityScore'), 'Chat must not duplicate app handoff specificity scoring.');
assert.ok(appHandoffGateJs.includes('handoffSpecificityScore'), 'Generic app handoff candidates should carry a specificity score.');
assert.ok(appHandoffGateJs.includes('export function appHandoffIsCaitManagedSurface'), 'App handoff ranking should distinguish CAIt-managed surfaces from future external apps in the handoff gate.');
assert.ok(!chatJs.includes('function appHandoffIsCaitManagedSurface'), 'Chat must not duplicate CAIt-managed app ranking policy.');
assert.ok(appHandoffGateJs.includes('broadContractPenalty'), 'App handoff ranking should avoid letting broad generic apps outrank specialized apps by accepting everything.');
assert.ok(chatJs.includes('function deliveryHandoffArtifactTypes'), 'App handoff scoring should derive explicit artifact types from the delivery.');
assert.ok(appHandoffGateJs.includes('function addExplicitHandoffArtifactType'), 'App handoff gate should own explicit delivery file artifact metadata normalization.');
assert.ok(appHandoffGateJs.includes('function isGenericNonHandoffType'), 'App handoff gate should drop generic MIME/content types before app routing.');
assert.ok(appHandoffGateJs.includes('text_markdown|text_md|text_html|application_json'), 'App handoff gate should not treat normalized MIME types as handoff artifacts.');
assert.ok(appHandoffGateJs.includes('export function explicitHandoffArtifactTypesFromFile'), 'App handoff gate should expose explicit delivery file artifact metadata extraction.');
assert.ok(appHandoffGateJs.includes('export function explicitHandoffArtifactTypesFromAuthorityRequest'), 'App handoff gate should expose structured authority_request artifact metadata extraction.');
assert.ok(chatJs.includes('appHandoffGateExplicitArtifactTypesFromFile'), 'Chat app handoff scoring should consume explicit artifact metadata through the handoff gate.');
assert.ok(chatJs.includes('appHandoffGateExplicitArtifactTypesFromAuthorityRequest'), 'Chat app handoff scoring should consume authority_request metadata through the handoff gate.');
assert.ok(appHandoffGateJs.includes('DEFAULT_HANDOFF_ARTIFACT_CAPABILITY_ALIASES'), 'App handoff gate should own artifact capability aliases.');
assert.ok(appHandoffGateJs.includes('DEFAULT_HANDOFF_ARTIFACT_LABELS'), 'App handoff gate should own artifact labels.');
assert.ok(appHandoffGateJs.includes('DEFAULT_HANDOFF_ARTIFACT_DESTINATION_HINTS'), 'App handoff gate should own destination hints.');
assert.ok(appHandoffGateJs.includes("campaign_operations_plan: ['campaign_state'"), 'Campaign Operations delivery files should route into campaign app context handoff candidates.');
assert.ok(appHandoffGateJs.includes('approval_backlog: Object.freeze'), 'Campaign approval backlog should be a first-class app handoff artifact.');
assert.ok(!chatJs.includes('function addExplicitHandoffArtifactType'), 'Chat must not duplicate explicit app handoff artifact metadata normalization.');
assert.ok(!chatJs.includes('const HANDOFF_ARTIFACT_CAPABILITY_ALIASES'), 'Chat must not own app handoff alias policy.');
assert.ok(!chatJs.includes('const HANDOFF_ARTIFACT_LABELS'), 'Chat must not own app handoff labels.');
assert.ok(!chatJs.includes('const HANDOFF_ARTIFACT_DESTINATION_HINTS'), 'Chat must not own app handoff destination hints.');
assert.ok(!chatJs.includes('function appHandoffFileSignalText'), 'App handoff scoring must not build body-token signal text from delivery content.');
assert.ok(!chatJs.includes('reviewable lead rows|lead_rows|company_name'), 'Lead Ops handoff must not be inferred from delivery body keywords.');
assert.ok(!chatJs.includes('sourceText'), 'App handoff scoring must not route apps from delivery body text tokens.');
assert.ok(appHandoffGateJs.includes('entry.inputContract?.accepts'), 'External app handoff matching should use app input contracts.');
assert.ok(appHandoffGateJs.includes('Number(entry.handoffRelevanceScore || 0) < threshold'), 'App handoff matching should require a strong contract/capability match.');
assert.ok(!chatJs.includes('appTokens') && !chatJs.includes('jobTokens'), 'App handoff matching must not display apps based on loose token overlap.');
assert.ok(appHandoffGateJs.includes('handoffRelevanceScore'), 'Generic app handoff candidates should carry a relevance score.');
assert.ok(!chatJs.includes("id === 'delivery-manager'"), 'Generic app handoffs should not score Deliveries as an app handoff candidate.');
assert.ok(chatJs.includes('Preparation-layer delivery data is already available to matching SaaS apps'), 'App handoff copy should explain SaaS publish/copy-paste action.');
assert.ok(!chatJs.includes('return appManifestSources()\\n    .filter((entry) => {\\n      if (!entry?.id || (!entry.entryUrl && !entry.baseUrl && !entry.handoff?.createUrl)) return false;'), 'App handoff should not display the raw app catalog for every delivery.');
assert.ok(chatJs.includes('data-app-agent-handoff'), 'Generic app handoff cards should be actionable from delivery chat.');
assert.ok(chatJs.includes('cait-app-agent-transfer/v1'), 'Generic app handoffs should use the CAIt transfer payload contract.');
assert.ok(chatJs.includes('handoff?.createUrl'), 'Generic app handoffs should call manifest-declared handoff endpoints.');
assert.ok(chatJs.includes("`/api/apps/${encodeURIComponent(manifest.id || appId)}/handoff`"), 'Generic app handoffs should use the CAIt same-origin handoff proxy.');
assert.ok(chatJs.includes('const data = await api(createUrl'), 'Generic app handoff proxy calls should use the chat API helper so CSRF/auth headers are attached.');
assert.ok(/function directAppCommandId[\s\S]{0,900}for \(const app of appManifestSources\(\)\)/.test(chatJs), 'Direct app chat commands should resolve app names from the manifest registry.');
assert.ok(chatJs.includes('directCommandAliases'), 'Direct app chat commands should use manifest-declared command aliases.');
assert.ok(!chatJs.includes('...(Array.isArray(app.tags) ? app.tags : [])'), 'Direct app chat commands must not match broad app tags such as growth or seo.');
assert.ok(!/function directAppCommandId[\s\S]{0,220}x\\s\*client\\s\*ops/.test(chatJs), 'Direct app chat commands must not special-case a CAIt-managed app by hardcoded name.');
assert.ok(chatJs.includes('appContextFromTransferPayload'), 'Generic app handoff fallback should convert transfer packets into server-side app contexts.');
assert.ok(chatJs.includes('createAppAgentContextOpenUrl'), 'Generic app handoff fallback should create a server-side context open URL.');
assert.ok(chatJs.includes('cait_app_context_id'), 'Generic app handoff fallback should pass only context identifiers in the app URL.');
assert.ok(chatJs.includes('/api/app-contexts'), 'Generic app handoff fallback should use the server-side app context API.');
assert.ok(!chatJs.includes('function appHandoffQueryFallbackUrl'), 'Chat must not keep app-specific URL payload fallbacks for handoff content.');
assert.ok(!chatJs.includes('cait_x_post'), 'X Client Ops fallback must not place edited draft text in the app URL.');
assert.ok(!chatJs.includes('generic_app_query_fallback'), 'Generic app handoff fallback should use server-side app contexts, not query payloads.');
assert.ok(appManifestRegistryJs.includes("actionKind: 'x_post_handoff'"), 'X Client Ops handoff action kind should be manifest-declared instead of inferred from capabilities in chat.');
assert.ok(appHandoffTransferJs.includes('artifact_type: artifactTypes[0]') && appHandoffTransferJs.includes('artifact_types: artifactTypes'), 'App context handoff should preserve explicit delivery artifact type contracts for downstream apps.');
assert.ok(appHandoffTransferJs.includes('contentType: String(artifactTypes[0]'), 'Agent-app transfer delivery artifacts should prefer explicit artifact types over MIME fallbacks.');
assert.ok(analyticsJs.includes('ANALYTICS_CONTEXT_PACKET_KEYS') && analyticsJs.includes('analyticsPacketPayloads'), 'Analytics Console should restore nested analytics_context, search_console_packet, and ga4_packet payloads from AIAGENT handoffs.');
assert.ok(analyticsJs.includes('ANALYTICS_CONTEXT_KEY_ALIASES') && analyticsJs.includes('rowsFromStructuredPayload'), 'Analytics Console should restore top-level app-contract keys and structured JSON artifact content from AIAGENT handoffs.');
assert.ok(caitAppBridge.includes('APP_CONTEXT_RAW_PRESERVE_KEYS') && caitAppBridge.includes('rawContextWithPreservedContractKeys'), 'CAIt app context bridge should not drop top-level app-contract keys before apps can restore them.');
assert.ok(caitAppBridge.includes('uniqueStringList') && appContextDomainJs.includes('uniqueStringList'), 'CAIt app context contract key lists should be de-duplicated at construction.');
assert.ok(appHandoffTransferJs.includes('APP_HANDOFF_CONTRACT_FIELDS') && appHandoffTransferJs.includes('appHandoffTransferUniqueStrings'), 'App handoff contract fields should merge specialized app contracts without duplicate keys.');
assert.ok(caitAppBridge.includes("'deliveryPackage'") && appContextDomainJs.includes("'delivery_package'"), 'CAIt app context normalization should preserve package-shaped delivery contracts for Delivery Manager.');
assert.ok(caitAppBridge.includes("'attachments'") && appContextDomainJs.includes("'output_files'") && deliveryManagerJs.includes("'raw_result_files'"), 'CAIt app context normalization should preserve attachment-shaped delivery contracts for Delivery Manager.');
assert.ok(appContextDomainJs.includes("'post_text'") && caitAppBridge.includes("'post_text'"), 'CAIt app context normalization should preserve X Client Ops post_text contract fields.');
assert.ok(appContextDomainJs.includes("'reply_target'") && caitAppBridge.includes("'posting_window'"), 'CAIt app context normalization should preserve X Client Ops reply and scheduling fields.');
assert.ok(appContextDomainJs.includes("'agent_context'") && caitAppBridge.includes("'agent_context'"), 'CAIt app context normalization should preserve app-agent transfer strategy context fields.');
const growthNormalizedContext = normalizeCaitAppContext({
  source_app: 'growth_experiment_console',
  title: 'Growth packet',
  noPaidGrowthPlanPacket: 'Line one\nLine two',
  organicSpecialistHandoffPacket: [{ label: 'Organic specialist handoff', detail: 'SEO specialist owns no-paid launch proof' }],
  growthActivationHandoffPacket: [{ label: 'Activation owner', detail: 'Growth owner approves launch' }],
  growthPublisherHandoffPacket: [{ label: 'Agent Publisher activation', detail: 'Agent output is ready to hand to Publisher after Growth approval' }],
  measurementSurface: [{ label: 'Measurement surface', detail: 'Analytics Console retained context report' }],
  nextDecision: [{ label: 'Next decision', detail: 'Continue after proof review' }]
});
assert.ok(
  String(growthNormalizedContext.raw_context?.no_paid_growth_plan_packet || '').includes('Line one\nLine two'),
  'Server app context normalization should preserve multiline no-paid growth plan packets from explicit top-level aliases.'
);
assert.ok(
  JSON.stringify(growthNormalizedContext.raw_context?.organic_specialist_handoff_packet || []).includes('SEO specialist owns no-paid launch proof'),
  'Server app context normalization should preserve organic specialist handoff packets.'
);
assert.ok(
  JSON.stringify(growthNormalizedContext.raw_context?.growth_activation_handoff_packet || []).includes('Growth owner approves launch'),
  'Server app context normalization should preserve explicit growth activation handoff packets.'
);
assert.ok(
  JSON.stringify(growthNormalizedContext.raw_context?.growth_publisher_handoff_packet || []).includes('ready to hand to Publisher'),
  'Server app context normalization should preserve agent Growth-to-Publisher handoff packets.'
);
assert.ok(
  JSON.stringify(growthNormalizedContext.raw_context?.measurement_surface || []).includes('Analytics Console retained context report')
    && JSON.stringify(growthNormalizedContext.raw_context?.next_decision || []).includes('Continue after proof review'),
  'Server app context normalization should preserve growth measurement surface and next decision aliases.'
);
const growthTransferContext = appContextFromTransferPayload('growth-experiment-console', {
  transfer_id: 'growth-transfer-qa',
  title: 'Growth experiment handoff',
  noPaidGrowthPlanPacket: { hypothesis: 'Retained app context raises activation trust without paid ads', status: 'review_required' },
  organicSpecialistHandoffPacket: { owner: 'SEO specialist', action: 'publish organic landing page test after approval' },
  growthActivationHandoffPacket: { owner: 'growth owner', action: 'publish landing page test after approval' },
  growthPublisherHandoffPacket: { owner: 'growth owner', action: 'send retained activation packet to Publisher after approval' },
  killRule: [{ label: 'Kill rule', detail: 'Stop if qualified signup rate stays below threshold' }],
  measurementSurface: [{ label: 'Measurement surface', detail: 'Analytics Console retained context report' }],
  proofSource: [{ label: 'Proof source', detail: 'Attach app_context_id screenshot before claiming launch' }],
  nextDecision: [{ label: 'Next decision', detail: 'Continue only after proof review' }]
}, {
  manifestById: () => ({
    id: 'growth-experiment-console',
    name: 'Growth Experiment Console',
    inputContract: {
      accepts: ['growth_experiment_packet', 'no_paid_growth_plan_packet', 'organic_specialist_handoff_packet', 'growth_activation_handoff_packet', 'growth_publisher_handoff_packet', 'kill_rule', 'measurement_surface', 'proof_source', 'next_decision']
    }
  })
});
assert.ok(
  JSON.stringify(growthTransferContext.raw_context?.contract_fields || {}).includes('without paid ads'),
  'Growth app handoff transfer should canonicalize explicit no-paid growth packet aliases into contract_fields.'
);
assert.ok(
  JSON.stringify(growthTransferContext.raw_context?.contract_fields?.no_paid_growth_plan_packet || {}).includes('without paid ads'),
  'Growth app handoff transfer should keep explicit no-paid growth packet aliases under the no_paid_growth_plan_packet key.'
);
assert.ok(
  JSON.stringify(growthTransferContext.raw_context?.contract_fields || {}).includes('SEO specialist'),
  'Growth app handoff transfer should canonicalize organic specialist handoff aliases into contract_fields.'
);
assert.ok(
  JSON.stringify(growthTransferContext.raw_context?.contract_fields?.organic_specialist_handoff_packet || {}).includes('SEO specialist'),
  'Growth app handoff transfer should keep organic specialist handoff aliases under the organic_specialist_handoff_packet key.'
);
assert.ok(
  JSON.stringify(growthTransferContext.raw_context?.contract_fields?.growth_publisher_handoff_packet || {}).includes('Publisher after approval'),
  'Growth app handoff transfer should keep agent Growth-to-Publisher packets under the growth_publisher_handoff_packet key.'
);
assert.ok(
  JSON.stringify(growthTransferContext.artifacts || []).includes('kill rule'),
  'Growth app handoff transfer should create review artifacts only from manifest-accepted explicit fields.'
);
assert.ok(
  JSON.stringify(growthTransferContext.raw_context?.contract_fields || {}).includes('app_context_id screenshot')
    && JSON.stringify(growthTransferContext.raw_context?.contract_fields || {}).includes('Continue only after proof review'),
  'Growth app handoff transfer should canonicalize proof source and next decision aliases.'
);
const pricingNormalizedContext = normalizeCaitAppContext({
  source_app: 'pricing_decision_console',
  title: 'Pricing packet',
  pricingDecisionPacket: 'Line one\nLine two',
  executionStatusLabels: [{ label: 'price_changed', detail: 'false' }]
});
assert.ok(
  String(pricingNormalizedContext.raw_context?.pricing_decision_packet || '').includes('Line one\nLine two'),
  'Server app context normalization should preserve multiline pricing decision packets from explicit top-level aliases.'
);
assert.ok(
  JSON.stringify(pricingNormalizedContext.raw_context?.execution_status_labels || []).includes('price_changed'),
  'Server app context normalization should preserve explicit pricing execution status labels.'
);
const pricingTransferContext = appContextFromTransferPayload('pricing-decision-console', {
  transfer_id: 'pricing-transfer-qa',
  title: 'Pricing handoff',
  pricingDecisionPacket: { decision: 'Raise pro plan', status: 'review_required' },
  priceChangePacket: { target_plan: 'pro', approval_owner: 'pricing owner' },
  executionStatusLabels: [{ label: 'price_changed', detail: 'false' }]
}, {
  manifestById: () => ({
    id: 'pricing-decision-console',
    name: 'Pricing Decision Console',
    inputContract: {
      accepts: ['pricing_decision_packet', 'price_change_handoff', 'execution_status_labels']
    }
  })
});
assert.ok(
  JSON.stringify(pricingTransferContext.raw_context?.contract_fields || {}).includes('Raise pro plan'),
  'Pricing app handoff transfer should canonicalize explicit pricing packet aliases into contract_fields.'
);
assert.ok(
  JSON.stringify(pricingTransferContext.artifacts || []).includes('price change handoff'),
  'Pricing app handoff transfer should create review artifacts only from manifest-accepted explicit fields.'
);
assert.ok(caitAppBridge.includes('Create a List Creator order from this Lead Ops sourcing request.'), 'Lead Ops sourcing requests should produce a direct List Creator chat prompt.');
assert.ok(appManifestRegistryJs.includes("'analytics_context', 'search_console_packet', 'ga4_packet'"), 'Analytics Console manifest should declare packet-shaped app input contracts.');
assert.ok(appContextDomainJs.includes("'analytics_context'") && appContextDomainJs.includes("'search_console_packet'") && appContextDomainJs.includes("'ga4_packet'") && appContextDomainJs.includes("'google_report_status'"), 'Server app context normalization should preserve Analytics Console packet and top-level contract keys.');
assert.ok(appManifestRegistryJs.includes("'lead_acquisition_request', 'lead_ops_packet', 'lead_packet', 'crm_packet'"), 'Lead Ops manifest should declare lead acquisition and packet-shaped handoff contracts.');
assert.ok(appContextDomainJs.includes("'lead_acquisition_request'") && appContextDomainJs.includes("'lead_ops_packet'") && appContextDomainJs.includes("'outreach_plan'"), 'Server app context normalization should preserve Lead Ops acquisition, packet, and outreach plan keys.');
assert.ok(!chatJs.includes("{ contextPath: '/api/app-contexts' }"), 'Publisher handoff fallback should preserve app-specific context ingest routes instead of forcing the generic app-context endpoint.');
assert.ok(appManifestRegistryJs.includes("contextIngestUrl: '/api/publisher/context-ingest'"), 'Publisher-specific context ingest should be declared in the app manifest.');
assert.ok(chatJs.includes("manifest.contextIngestUrl || manifest.context_ingest_url || '/api/app-contexts'"), 'Chat should resolve app context ingest endpoints from the app manifest contract.');
assert.ok(!chatJs.includes("safeAppId === 'publisher-approval-studio'"), 'Chat should not special-case Publisher context ingest by app id.');
assert.ok(
  /apiWithRetry\(contextPath[\s\S]{0,500}statuses:\s*\[408,\s*425,\s*429,\s*500,\s*502,\s*503,\s*504\]/.test(chatJs),
  'Chat app-context handoff should retry transient server failures before falling back to a context-less app open.'
);
assert.ok(chatJs.includes("message.role === 'system' ? 'system' : 'ok'"), 'Chat transcript tracking should not send empty status for system handoff messages.');
assert.ok(!chatJs.includes('appAgentFallbackHandoffUrl'), 'Generic app handoffs should not keep the legacy URL payload fallback helper.');
assert.ok(!chatJs.includes('cait_transfer'), 'Generic app handoffs should not embed serialized transfer payloads in URLs.');
assert.ok(!chatJs.includes('data-app-agent-open-transfer'), 'Generic app handoff cards should not expose transfer-payload fallback links.');
assert.ok(agentOrchestrationDiscipline.includes('`Deliveries` and `delivery-manager` are CAIt core features, not apps.'), 'Agent discipline should define Deliveries as a CAIt feature, not an app.');
assert.ok(agentOrchestrationDiscipline.includes('are app surfaces even when CAIt ships and manages them'), 'Agent discipline should treat CAIt-managed app surfaces as app surfaces, not internal privileges.');
assert.ok(agentOrchestrationDiscipline.includes('`inputContract.accepts` and `capabilities`'), 'Agent discipline should require contract-based app matching.');
assert.ok(agentOrchestrationDiscipline.includes('a specialized matching app should be shown first'), 'Agent discipline should prefer specialized external app candidates over generic CAIt-managed apps.');
assert.ok(agentOrchestrationDiscipline.includes('price, free CAIt-managed option, specialization, fees, or revenue share'), 'Agent discipline should preserve future paid-app selection and revenue-share requirements.');
assert.ok(agentOrchestrationDiscipline.includes('must not receive the CAIt session cookie directly'), 'Agent discipline should require scoped auth delegation for future external apps.');
assert.ok(!chatJs.includes('最終アクション: X Client Ops'), 'X Client Ops delivery card should not show Japanese heading copy.');
assert.ok(!chatJs.includes('過程で作成されたX投稿案'), 'X Client Ops delivery card should not show Japanese description copy.');
assert.ok(chatJs.includes('URL.createObjectURL'));
assert.ok(chatJs.includes('navigator.clipboard'));
assert.ok(chatJs.includes('state.trackedOrderIds:') || chatJs.includes('trackedOrderIds: new Set()'), 'Tracked orders should be in-memory only for the active chat session.');
assert.ok(chatJs.includes('function clearActiveOrderMemory'), 'Chat should have a single helper for clearing active order-only runtime state.');
assert.ok(chatJs.includes('state.trackedOrderIds.clear();'), 'Reset/new chat should clear tracked orders so old order history cannot attach to a blank chat.');
assert.ok(chatJs.includes('state.pendingRecoveryPayloads = [];'), 'Reset/new chat should clear create-recovery candidates before a new blank chat starts.');
const resetChatSource = chatJs.slice(chatJs.indexOf('function resetChat()'), chatJs.indexOf('async function handleInboundAppContext'));
assert.ok(resetChatSource.includes('startNewChatSession();'), 'Reset should still create a blank chat surface.');
assert.ok(!resetChatSource.includes('startDeliveryBackfillLoop'), 'Reset should not immediately backfill old order history into the blank chat.');
assert.ok(chatJs.includes('renderRestoredSessionOrderContext'), 'Restored chat sessions should render related order status/results inside the chat.');
assert.ok(chatJs.includes('if (jobHasDeliveryResult(job)) renderDeliveryOnce(job);'), 'Restored completed order sessions should render the actual delivery card, not only a status summary.');
const chatSessionOrderIdsSource = chatJs.slice(chatJs.indexOf('function chatSessionOrderIds'), chatJs.indexOf('function restoredSessionOrderCardHtml'));
assert.ok(chatSessionOrderIdsSource.includes('const max = options.includeRelatedHistory === true ? 8 : 1'), 'Restored chat startup should not dump every historical related order into the thread.');
const restoredSessionOrderCardSource = chatJs.slice(chatJs.indexOf('function restoredSessionOrderCardHtml'), chatJs.indexOf('function restoredSessionOrderContextIsCurrent'));
assert.ok(!restoredSessionOrderCardSource.includes('deliveryText(job)'), 'Restored order history cards should not duplicate completed delivery bodies; render the delivery card instead.');
assert.ok(chatJs.includes('data-chat-order-retry'), 'Restored order cards should offer an explicit retry confirmation path.');
assert.ok(chatJs.includes('deliveryOrderActionsHtml'), 'Terminal delivery updates should keep status/retry actions visible after connector returns.');
assert.ok(chatJs.includes("return ['completed', 'failed', 'timed_out'].includes"), 'Blocked approval waits should stay progress states, not terminal deliveries.');
assert.ok(!chatJs.includes('restored-order-progress'), 'Restored order cards should not dump worker progress details into chat.');
const backfillChatDeliveriesSource = chatJs.slice(chatJs.indexOf('async function backfillChatDeliveries'), chatJs.indexOf('function startDeliveryBackfillLoop'));
assert.ok(backfillChatDeliveriesSource.indexOf('if (jobHasDeliveryResult(job))') < backfillChatDeliveriesSource.indexOf('showWorkflowProgressMap(job);'), 'Delivery backfill should not show progress maps for terminal restored history before deciding whether to render a delivery.');
assert.ok(chatCss.includes('.restored-order-card'), 'Chat CSS should style restored order history cards.');
assert.ok(chatJs.includes('recentJobsApiPath'), 'Recent chat/order history should come from the server job API.');
assert.ok(chatJs.includes('CHATUX_PROGRESS_MAX_POLLS'), 'Chat polling should have an explicit long-running order limit.');
assert.ok(!chatJs.includes('Live progress polling reached its limit'), 'Polling limits should switch to background checks without posting progress noise.');
assert.ok(chatJs.includes('pollCount >= CHATUX_PROGRESS_MAX_POLLS'), 'Chat polling should still have an explicit long-running order limit.');
assert.ok(agentProgressViewJs.includes('progress-narrator-bar') && agentProgressViewJs.includes('role="progressbar"'), 'Live order progress should render a visible progress bar.');
assert.ok(chatJs.includes('showProgressNarrator(progressNarratorTextForJob(job), progressNarratorOptionsForJob(job))'), 'Polling should update the live progress bar from job progress.');
assert.ok(chatJs.includes('function workflowRunWaitStatus'), 'Chat progress should describe long-running provider/agent waits instead of looking stuck.');
assert.ok(chatJs.includes('dispatchInProgressAt') && chatJs.includes('dispatchTimeoutMs'), 'Chat progress should show elapsed generation time and the configured wait window.');
assert.ok(chatJs.includes('Waiting for the generation provider response'), 'Long generation waits should be visible in the live progress narrator.');
assert.ok(workflowReconcileState.includes('dispatchCompletionStatus') && workflowReconcileState.includes('dispatchTimeoutMs'), 'Workflow child snapshots should expose generic dispatch wait state to chat progress.');
assert.ok(chatCss.includes('.progress-narrator.ok .progress-narrator-caret'), 'Chat CSS should stop the narrator caret animation when progress is done or paused.');
assert.ok(chatCss.includes('.progress-narrator-bar') && chatCss.includes('--progress-value'), 'Chat CSS should style the live order progress bar.');
assert.ok(chatJs.includes('isNonOrderConversationIntentText'), 'Chat should keep pause/status/help messages out of order dispatch.');
assert.ok(workIntentResolver.includes('isDeliveryHistoryQuestionIntentText'), 'Shared intent resolver should keep delivery/history display requests out of order dispatch.');
assert.ok(workIntentResolver.includes('completedの納品物') || workOrderRoutes.includes('completedの納品物を見せてください'), 'OpenAI intent prompt should treat completed delivery display as chat, not intake.');
assert.ok(workActionRegistry.includes('completed delivery') && workActionRegistry.includes('納品物'), 'Static work commands should recognize completed delivery display requests.');
assert.ok(chatJs.includes('showDeliveryHistoryForPrompt') && chatJs.includes('await showDeliveryHistoryForPrompt(prompt)'), 'Chat should display existing completed deliveries before OpenAI intake/order routing.');
const submitHandlerSource = chatJs.slice(chatJs.indexOf("els.composer.addEventListener('submit'"), chatJs.indexOf("els.chatThread.addEventListener"));
assert.ok(submitHandlerSource.indexOf('await showDeliveryHistoryForPrompt(prompt)') < submitHandlerSource.indexOf('handleNonOrderConversation(prompt)'), 'Completed delivery display requests must be handled before generic non-order chat.');
assert.ok(submitHandlerSource.indexOf('handleNonOrderConversation(prompt)') < submitHandlerSource.indexOf('state.pendingIntake)'), 'Explicit pause/cancel chat controls must still work while intake is open.');
assert.ok(chatJs.includes('const matchesTracked = state.trackedOrderIds.has(safeId)'), 'Chat backfill should only auto-deliver explicitly tracked orders or active recovery candidates.');
assert.ok(chatJs.includes('if (!matchesTracked && !matchesRecovery) continue;'), 'Chat backfill should not dump every historical chatux job into a new chat.');
assert.ok(chatJs.includes('_caitRecoveryStartedAt'), 'Chat recovery matching should ignore older same-session jobs from before the current send attempt.');
assert.ok(chatJs.includes('client_order_id'), 'Chat order create should include a client order id for idempotent recovery.');
assert.ok(chatJs.includes('orderCreateRequestBody(payload)'), 'Chat order create should strip local recovery markers before POSTing.');
assert.ok(chatJs.includes('payload._caitRecoveryRetried = true'), 'Chat recovery should safely retry the same idempotent create request once without chat noise.');
assert.ok(clientOpenChatOrderProgressUtilsJs.includes('client_order_id'), 'Open Chat order create should include a client order id for idempotent recovery.');
assert.ok(clientOpenChatOrderProgressUtilsJs.includes('orderCreateRequestBody(payload)'), 'Open Chat order create should strip local recovery markers before POSTing.');
assert.ok(clientOpenChatOrderProgressUtilsJs.includes('same idempotent order request once'), 'Open Chat recovery should safely retry the same idempotent create request once.');
{
  const state = {
    snapshot: { auth: { loggedIn: false } },
    currentOpenChatSessionId: 'session_existing',
    orderChatMessages: [{ body: 'hello' }],
    openChatProgressOrderId: 'job_123',
    openChatProgressLastKey: 'k',
    openChatProgressPollCount: 3,
    openChatPendingDispatchMessageId: 'msg_1',
    openChatHistoryOpen: true,
    openChatEntryDismissed: true,
    openChatPausedByTabLeave: true,
    openChatMode: 'order',
    openChatDecisionSuppressedBriefKey: 'brief_1',
    openChatDecisionSuppressed: true,
    orderInputFiles: [{ name: 'brief.txt' }],
    orderInputFileWarnings: ['large'],
    followupToJobId: 'job_followup',
    followupSourceTaskType: 'seo',
    followupSourceAgentId: 'agent_1',
    pendingIntake: { question: 'Need target audience?' },
    intakeConfirmed: true,
    intakeAnswer: 'B2B SaaS',
    pendingOrderConfirmation: { ready: true },
    openChatPreparedBrief: 'prepared',
    openChatParallelPlan: ['step'],
    openChatClarifyOptions: ['option'],
    openChatVagueChoicePrompt: 'vague',
    openChatNaturalChoiceIntent: 'intent',
    openChatIntentShiftPrompt: 'shift',
    openChatIdeaBacklogPrompt: 'backlog',
    openChatLeaderIntakePrompt: 'leader',
    openChatLeaderIntakeTask: 'task',
    openChatPendingQuestionPrompt: 'question',
    openChatPendingQuestionTask: 'task',
    openChatPendingQuestionPattern: 'pattern',
    serverResolvedIntent: { task: 'seo' },
    serverPreparedOrder: { id: 'order_1' },
    openChatLastStatus: 'status',
    openChatLastStatusTone: 'warn'
  };
  const els = {
    jobPrompt: { value: 'Prompt' },
    jobUrls: { value: 'https://example.com' },
    jobFiles: { value: 'selected-file' },
    intakeAnswer: { value: 'answer' },
    jobType: { value: 'seo' }
  };
  const historyUtils = createClientOpenChatHistoryUtils({
    getState: () => state,
    getEls: () => els,
    clearOpenChatDispatchDraftState: ({ clearComposer } = {}) => {
      state.openChatPreparedBrief = '';
      state.openChatParallelPlan = [];
      state.openChatClarifyOptions = [];
      if (clearComposer) {
        els.jobPrompt.value = '';
        els.jobType.value = '';
      }
    }
  });
  historyUtils.startNewOpenChatSession({ silent: true });
  assert.equal(els.jobPrompt.value, '', 'New chat should clear the draft prompt.');
  assert.equal(els.jobUrls.value, '', 'New chat should clear saved source URLs.');
  assert.equal(els.jobFiles.value, '', 'New chat should clear file input selection.');
  assert.equal(els.intakeAnswer.value, '', 'New chat should clear the intake answer field.');
  assert.equal(state.followupToJobId, '', 'New chat should drop follow-up linkage.');
  assert.deepEqual(state.orderInputFiles, [], 'New chat should clear staged order input files.');
  assert.deepEqual(state.orderInputFileWarnings, [], 'New chat should clear staged file warnings.');
}
assert.ok(chatJs.includes('visibleDeliveryFiles(candidates)'), 'Chat delivery should hide internal workflow markdown bundles from user-facing files.');
assert.ok(!chatJs.includes('internalAllDeliverablesFallbackFile'), 'Chat delivery must not synthesize readable bundles from internal workflow files.');
assert.ok(!chatJs.includes('agent-deliverables-${id}.md'), 'Chat delivery must expose only agent-returned files, not generated readable bundles.');
assert.ok(!chatJs.includes('review-ready-delivery-${id}.md'), 'Chat delivery must not expose generated review-ready files for old internal specialist bundles.');
assert.ok(!chatJs.includes('delivery-summary-${id}.md'), 'Chat delivery must not synthesize downloadable summary markdown when no real agent file exists.');
assert.ok(clientJs.includes('visibleDeliveryFiles(run.output?.files)'), 'Open Chat delivery should hide internal workflow markdown bundles from user-facing files.');
assert.ok(deliveryManagerJs.includes('visibleDeliveryFiles(output.files)'), 'Delivery Manager should hide internal workflow markdown bundles from user-facing files.');
assert.ok(chatJs.includes('includeHistoricalTracked'), 'Chat backfill should ignore historical tracked orders while a current order is attached.');
assert.ok(chatJs.includes('renderTerminalDeliveries: false'), 'Chat startup should not render historical terminal deliveries automatically.');
assert.ok(chatJs.includes('notifyMilestones: false'), 'Chat startup backfill should not post stale completed-order milestone notices for restored history.');
assert.ok(!chatJs.includes("String(job?.parentAgentId || '').trim() === 'chatux'"), 'Chat startup recovery should not match all historical chatux parent jobs.');

assert.ok(chatCss.includes('.chatux-panel'));
assert.ok(chatCss.includes('grid-template-columns: minmax(240px, 300px) minmax(0, 1440px)'), 'Chat panel should keep a wide desktop workspace beside the session sidebar.');
assert.ok(chatCss.includes('.chatux-header-tools'));
assert.ok(chatCss.includes('.chatux-nav'));
assert.ok(chatCss.includes('.tool-icon-btn'));
assert.ok(chatCss.includes('.leader-status-pill'), 'Chat CSS should style the active leader status pill.');
assert.ok(chatCss.includes('.utility-modal'));
assert.ok(chatCss.includes('.progress-narrator-stream'), 'Chat CSS should style the live progress text stream.');
assert.ok(chatCss.includes('.utility-dialog'));
assert.ok(chatCss.includes('.utility-row'));
assert.ok(chatCss.includes('.app-dedicated-handoff-card'));
assert.ok(chatCss.includes('.app-handoff-card'));
assert.ok(chatCss.includes('.app-context-card'), 'Chat should style context returned by CAIt apps.');
assert.ok(chatCss.includes('.app-handoff-row'));
assert.ok(chatCss.includes('.app-handoff-tree'), 'Chat CSS should style the preparation artifact to app routing tree.');
assert.ok(chatCss.includes('.usage-panel'));
assert.ok(chatCss.includes('.file-actions'));
assert.ok(!chatCss.includes('radial-gradient'));
assert.ok(adminCss.includes('.admin-shell'), 'Admin CSS should style the dashboard shell.');
assert.ok(adminCss.includes('.metric-grid'), 'Admin CSS should style member-count metrics.');
assert.ok(adminCss.includes('.admin-accounts-grid'), 'Admin CSS should style the accounts table.');
assert.ok(adminCss.includes('.admin-identity-grid'), 'Admin CSS should style provider identity review rows.');
assert.ok(adminCss.includes('.identity-photo-wrap'), 'Admin CSS should style submitted identity photos.');
assert.ok(adminCss.includes('.admin-gate[hidden]'), 'Admin CSS should hide gate panels when the hidden attribute is set.');
assert.ok(adminCss.includes('.admin-order-group'), 'Admin CSS should support grouped order rows.');
assert.ok(!adminCss.includes('radial-gradient'));

assert.ok(adminJs.includes("await api('/api/admin/dashboard'"), 'Admin should use the dedicated lightweight dashboard payload.');
assert.ok(adminJs.includes('const auth = snapshot.auth || {}'), 'Admin should read auth from the dashboard payload.');
assert.ok(adminJs.includes('function groupedOrders'), 'Admin should group order runs by work order.');
assert.ok(adminJs.includes('auth.isPlatformAdmin'), 'Admin should require platform admin access.');
assert.ok(adminJs.includes('function downloadAccountsCsv'), 'Admin should support downloading member account data.');
assert.ok(adminJs.includes('function renderIdentityReviews'), 'Admin should render provider identity review rows.');
assert.ok(adminJs.includes('/api/admin/provider-identities/'), 'Admin should fetch provider identity details through the admin API.');
assert.ok(adminJs.includes('adminRegistrationsMetric'), 'Admin JS should render registration metrics.');
assert.ok(adminJs.includes("const ADMIN_LOCALE = 'en-US'"), 'Admin should force English locale formatting.');
assert.ok(adminJs.includes('new Intl.DateTimeFormat(ADMIN_LOCALE'), 'Admin dates should not inherit the browser locale.');
assert.ok(adminJs.includes('new Intl.RelativeTimeFormat(ADMIN_LOCALE'), 'Admin relative dates should not inherit the browser locale.');

assert.ok(stylesCss.includes('Chat visual refresh'), 'Shared public pages should use the chat-style visual refresh overrides.');
assert.ok(stylesCss.includes('--bg: #f6f7f5'), 'Shared public pages should use the chat background palette.');
assert.ok(stylesCss.includes('font-family: Inter, ui-sans-serif'), 'Shared public pages should use the root chat typography stack.');
assert.ok(stylesCss.includes('.topbar.box'), 'Shared public pages should style the common header shell.');
assert.ok(stylesCss.includes('.topbar .logo-link::before'), 'Shared public pages should show the CAIt icon in the common header.');
assert.ok(stylesCss.includes('.topbar .doc-nav .mini-btn'), 'Shared public pages should style doc navigation like the chat header.');

assert.ok(chatEngine.includes('task_type: taskType'), 'Prepare-order payload should carry an explicit selected task type.');
assert.ok(chatEngine.includes('selected_agent_id: selectedAgentId'), 'Prepare-order payload should carry the selected worker id.');
assert.ok(chatEngine.includes('skip_intake:'), 'Prepared chat dispatch should not be blocked by a duplicate intake pass.');
assert.ok(chatEngine.includes("source: 'chat_send_order'"), 'Chat dispatch should confirm the user approved running the selected worker.');

assert.ok(server.includes("import worker from './worker.js'"), 'Local server should import the Worker as the single API implementation.');
assert.ok(server.includes('worker.fetch('), 'Local server should delegate HTTP handling to worker.fetch.');
assert.ok(server.includes('createStaticAssetsBinding'), 'Local server should provide a Cloudflare Assets-compatible binding.');
assert.ok(server.includes('assetPathCandidates'), 'Local assets should support extensionless Worker asset requests.');
assert.ok(server.includes('BOOTSTRAP_STATE_JSON'), 'Local server should keep E2E bootstrap support.');
assert.ok(server.includes('WORKFLOW_DISPATCH_QUEUE'), 'Local server should provide a local queue binding for Worker workflow dispatch.');
assert.ok(server.includes('handleLocalEvents'), 'Local server may keep only the SSE development bridge outside Worker routes.');
assert.ok(!server.includes('function handleChatPageRequest'), 'Local server should not duplicate chat route gating; Worker owns it.');
assert.ok(!server.includes('function handleAdminPageRequest'), 'Local server should not duplicate admin route handling; Worker owns it.');
assert.ok(!server.includes('async function handleCreateWorkflowJob'), 'Local server should not duplicate job creation flow; Worker owns it.');
assert.ok(!server.includes('async function handleGoogleAuthStart'), 'Local server should not duplicate auth flow; Worker owns it.');
assert.ok(!server.includes('async function handleXConnectorPost'), 'Local server should not duplicate connector write routes; Worker owns them.');
assert.ok(!server.includes('async function handleStripeWebhook'), 'Local server should not duplicate billing/webhook flow; Worker owns it.');
assert.ok(publicHeaders.includes("form-action 'self' https://aiagent-marketplace.net"), 'Static asset CSP headers should allow the Analytics Console OAuth form to submit to the official CAIt auth origin.');
assert.ok(!server.includes("'/chatux'"));
assert.ok(!server.includes('/chatux/index.html'));
assert.ok(!server.includes('/chatux/chatux.css'));
assert.ok(worker.includes("'/chat.css'"));
assert.ok(worker.includes('/api/chat-memory'), 'Worker should expose a lightweight chat memory endpoint.');
assert.ok(chatMemoryRoutes.includes('auth: await chatMemoryAuthStatus'), 'Chat memory route should return lightweight auth for faster chat first paint.');
assert.ok(authHelpers.includes('async function handleChatPageRequest'), 'Auth helper module should gate chat HTML behind login.');
assert.ok(authHelpers.includes('async function handleAdminPageRequest'), 'Auth helper module should serve the admin shell.');
assert.ok(httpCore.includes('function legacyLegalNoticeRedirect') && httpCore.includes("url.pathname !== '/tokushoho'"), 'HTTP core should redirect the old tokushoho URL to the English legal notice URL before assets extension handling.');
assert.ok(authHelpers.includes("return fetchStaticAssetPath(request, env, '/admin'"), 'Auth helper admin route should request the extensionless asset and let the API enforce admin data access.');
assert.ok(!authHelpers.includes('return redirect(adminLoginRedirectPath(request, env)'), 'Auth helper admin route should not create a server-side login redirect loop.');
assert.ok(authHelpers.includes("loginUrl.searchParams.set('source', 'gate_chat')"), 'Auth helper chat gate should send users to the login screen with a gate source.');
assert.ok(worker.includes('authBaseUrl: baseUrl(request, env)'), 'Worker auth status should expose the canonical auth base URL.');
assert.ok(googleIntegration.includes('GOOGLE_OAUTH_SCOPE_GROUPS'), 'Google integration should use explicit scope groups.');
assert.ok(googleIntegration.includes('googleOAuthScopeGroupsFromUrl'), 'Google OAuth should derive scopes from requested capabilities.');
assert.ok(googleIntegration.includes('googleScopedOAuthScope'), 'Google connector links should build the smallest requested scope set.');
assert.ok(authStatusRoutes.includes('googleGrantedCapabilities'), 'Auth status should expose granted Google capabilities for OAuth prompt suppression.');
assert.ok(connectorGateJs.includes('connectorGateGoogleAuthorityMissingGroups'), 'Chat approval UI should request only Google scope groups that are still missing.');
assert.ok(authRoutes.includes("googleAccessToken: persistentGoogleConnector ? '' : token.access_token"), 'Auth routes should keep Google access tokens out of browser session cookies when a persistent connector is available.');
assert.ok(accountSession.includes("githubOAuthScope(env, action = 'login', capabilities = [])"), 'GitHub OAuth should only request repo scope when a repo capability is requested.');
assert.ok(/async function handleGoogleAuthStart[\s\S]{0,600}existingSession\?\.user && action === 'login'/.test(authRoutes), 'Google analytics connect should still start OAuth when an existing chat session needs connector scopes.');
assert.ok(authHelpers.includes("['link', 'connect'].includes(action)"), 'Auth helper should link both link and connect OAuth actions.');
assert.ok(googleIntegration.includes("error?.code === 'connector_reauth_required' && sessionHasGoogleOauth(session)"), 'Google connector reads should fall back to a fresh Google session token when a stored connector lacks a refresh token.');
assert.ok(authHelpers.includes("returnUrl.searchParams.set('auth_error', safeCode)"), 'Auth helper OAuth failures should return to the app with an auth_error instead of dumping users at the home page.');
assert.ok(httpCore.includes("form-action 'self' https://aiagent-marketplace.net"), 'HTTP core CSP should allow the Analytics Console OAuth form to submit to the official CAIt auth origin.');
assert.ok(worker.includes("'/admin.html'"));
assert.ok(worker.includes("'/admin.css'"));
assert.ok(worker.includes("'/admin.js'"));
assert.ok(worker.includes("'/provider-identity.html'"));
assert.ok(worker.includes("'/provider-identity.js'"));
assert.ok(worker.includes('submitProviderIdentityVerification'), 'Worker should accept provider identity submissions.');
assert.ok(worker.includes('reviewAdminProviderIdentityVerification'), 'Worker should let admins approve or reject provider identity submissions.');
assert.ok(providerIdentityRoutes.includes('billingPostalCode: existing.billing?.billingPostalCode || identityVerification.fields.postalCode'), 'Provider identity submission should preserve address data for account records.');
assert.ok(worker.includes('payment_processing_removed: true'), 'Agent registration money readiness should report removed payment processing.');
assert.ok(worker.includes('money_actions_blocked: true'), 'Agent registration should report blocked money actions without blocking registration.');
assert.ok(/Listing can proceed, but CAIt no longer processes payments, billing, donations, or payouts/.test(clientJs), 'Agent registration UI copy should allow listing while warning that money actions are removed.');
assert.ok(clientJs.includes('A Stripe Payment Link for external donation support is only a future option after review'), 'Agent registration UI copy should name reviewed external donation support.');
for (const field of ['billingPhone', 'billingPostalCode', 'billingRegion', 'billingCity', 'billingAddressLine1', 'billingAddressLine2']) {
  assert.ok(clientJs.includes(field), `Settings UI should save provider registration billing field ${field}.`);
}
assert.ok(worker.includes("'/chat.js'"));
assert.ok(worker.includes("'/chat.html'"));
assert.ok(worker.includes("'/home.css'"));
assert.ok(worker.includes("'/apps.html'"));
assert.ok(worker.includes("'/apps.js'"));
assert.ok(worker.includes("'/analytics-console.html'"));
assert.ok(worker.includes("'/publisher-approval.html'"));
assert.ok(worker.includes("'/lead-ops.html'"));
assert.ok(worker.includes("'/campaign-operations.html'"));
assert.ok(worker.includes("'/ads-ops.html'"));
assert.ok(worker.includes("'/ads-ops.js'"));
assert.ok(worker.includes("'/delivery-manager.html'"));
assert.ok(worker.includes("'/cait-app-bridge.js'"));
assert.ok(worker.includes("'/app-manifest-registry.js'"));
assert.ok(catalogRoutes.includes('async function agentsCatalogPayload'), 'Catalog route should serve paged agent catalog payloads without building the full snapshot.');
assert.ok(catalogRoutes.includes('async function appsCatalogPayload'), 'Catalog route should serve paged app catalog payloads without building the full snapshot.');
assert.ok(worker.includes('return json(await agentsCatalogPayload(storage, request));'), 'Worker /api/agents should use the paged catalog endpoint.');
assert.ok(worker.includes('return json(await appsCatalogPayload(storage, request));'), 'Worker /api/apps should use the paged catalog endpoint.');
assert.ok(worker.includes('/.well-known/mcp.json') && mcpRoutes.includes('mcpDisabledPayload'), 'Worker should keep MCP discovery behind a disabled-by-default route gate.');
assert.ok(worker.includes("url.pathname === '/mcp'") && mcpRoutes.includes('async function handleMcpRequest'), 'Worker should route MCP JSON-RPC through the gated MCP route module.');
assert.ok(mcpRoutes.includes('runtimePolicy(env).mcpEnabled'), 'MCP should require an explicit runtime flag before returning protocol payloads.');
assert.ok(appRoutes.includes('async function handleAppHandoff'), 'App routes should proxy generic app handoff requests.');
assert.ok(worker.includes('/api\\/apps\\/[^/]+\\/handoff'), 'Worker should expose /api/apps/:id/handoff.');
assert.ok(appRoutes.includes('async function handleCreateAppContext'), 'App routes should accept generic app context payloads.');
assert.ok(appRoutes.includes('async function handlePublisherContextIngest'), 'App routes should expose a Publisher-owned context ingest handler.');
assert.ok(worker.includes('PUBLISHER_CONTEXT_INGEST'), 'Worker should route Publisher context ingest separately from generic app contexts.');
assert.ok(appManifestRegistryJs.includes('/api/publisher/context-ingest'), 'Publisher handoffs should declare the Publisher ingest endpoint in the app manifest.');
assert.ok(!chatJs.includes("id !== 'x-client-ops'"), 'Same-origin built-in app URL handling should not need an app-id exception.');
assert.ok(!chatJs.includes("createAppAgentContextOpenUrl(appId, payload, { contextPath: '/api/app-contexts' })"), 'Chat handoff fallback must preserve app-specific context ingest routes instead of forcing the generic app-context endpoint.');
assert.ok(publisherContext.includes('shapePublisherContextWithOpenAi'), 'Publisher context shaping should be owned by the Publisher context module.');
assert.ok(publisherContext.includes('cait_publisher_context_shaper'), 'Publisher context shaping should use a dedicated structured-output schema.');
assert.ok(publisherContext.includes('publisher_context_shape_status'), 'Publisher context shaping should persist a status marker for QA and debugging.');
assert.ok(
  worker.includes('/api/app-contexts') || worker.includes('API_ROUTES.APP_CONTEXTS') || worker.includes("apiRouteMatches(url.pathname, request.method, 'APP_CONTEXTS'"),
  'Worker should expose /api/app-contexts.'
);
assert.ok(worker.includes('/api/connectors/google/analytics-report'), 'Worker should expose the Google analytics report endpoint.');
assert.ok(workerAndIntegrationRoutes.includes('analyticsdata.googleapis.com/v1beta'), 'Worker should call the GA4 Data API for report rows.');
assert.ok(workerAndIntegrationRoutes.includes('analyticsadmin.googleapis.com/v1beta/accountSummaries'), 'Worker should call the current GA4 Admin account summaries endpoint.');
assert.ok(!workerAndIntegrationRoutes.includes('analyticsadmin.googleapis.com/v1alpha/accountSummaries'), 'Worker should not use the old GA4 Admin account summaries endpoint.');
assert.ok(googleIntegration.includes('googleApiRecoveryHint'), 'Google integration should return actionable Google API failure hints for source loading.');
assert.ok(workerAndIntegrationRoutes.includes('Promise.allSettled(['), 'Worker GA4 detail rows should not make the whole GA4 report fail when one breakdown fails.');
assert.ok(workerAndIntegrationRoutes.includes('function normalizeGoogleGa4PropertyName'), 'Worker should accept numeric GA4 property IDs and normalize them.');
assert.ok(workerAndIntegrationRoutes.includes("'sessionDefaultChannelGroup', 'sessionSourceMedium'"), 'Worker should fetch channel source/referral detail from GA4.');
assert.ok(worker.includes('Math.min(20, Number(options.limit || 12)'), 'Worker queued sweep should allow a larger per-minute dispatch batch.');
assert.ok(workerAndIntegrationRoutes.includes('/searchAnalytics/query'), 'Worker should call the Search Console Search Analytics API.');
assert.ok(workerIntegrationDeliveryRoutes.includes("repo_path: String(body.repo_path || body.repoPath || draft.repoPath"), 'Delivery routes should pass Publisher PR handoff paths into GitHub executor PR creation.');
assert.ok(accountEvents.includes('async function mutateAccountByLogin'), 'OAuth callbacks should have an account-scoped storage mutation helper.');
assert.ok(authRoutes.includes('await mutateAccountByLogin(storage, account.login'), 'OAuth connector persistence should avoid full-state D1 rewrites during login.');
assert.ok(mcp.includes('tools/list'), 'MCP helper should support tool discovery.');
assert.ok(mcp.includes('resources/read'), 'MCP helper should support resource reads.');
assert.ok(mcp.includes('resources/templates/list'), 'MCP helper should support resource template discovery.');
assert.ok(mcp.includes('prompts/get'), 'MCP helper should expose prompt templates.');
assert.ok(mcp.includes('structuredContent'), 'MCP tool calls should return structured content for capable clients.');
assert.ok(!server.includes("from './lib/http-policy.js'"), 'Local server should not duplicate HTTP policy imports; Worker owns policy enforcement.');
assert.ok(worker.includes("from './lib/http-policy.js'"), 'Worker should use shared HTTP policy helpers.');
assert.ok(httpPolicy.includes("pathname === '/mcp' && verb === 'POST'"), 'Shared HTTP policy should rate-limit MCP POST traffic explicitly.');
assert.ok(accountEvents.includes('storage.mutateAccount(safeLogin, mutator)'), 'OAuth account persistence should avoid full-state D1 rewrites during login.');
assert.ok(!worker.includes("'/chatux'"));
assert.ok(!worker.includes('/chatux/index.html'));
assert.ok(workerAndConnectorRoutes.includes('xAuthSuccessRedirectPath'), 'X OAuth callback should preserve the requested return path.');

console.log('ui qa passed');
