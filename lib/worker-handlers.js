export function createWorkerHandlers(deps = {}) {
  const {
    agentCatalogIndexPayload,
    agentSafetyErrorResponse,
    agentsCatalogPayload,
    API_COST_CATALOG_VERSION,
    API_ROUTES,
    apiRouteMatches,
    appendCampaignMetricsPayload,
    appsCatalogPayload,
    authorizeOpenChatIntentLlm,
    authStatus,
    baseUrl,
    BILLING_DISPLAY_CURRENCY,
    buildDraftManifestFromAgentSkill,
    campaignAdsPayload,
    campaignDetailPayload,
    campaignIntegrationsPayload,
    campaignLeadSourcePayload,
    campaignMetricsPayload,
    campaignsPayload,
    canonicalBrowserRedirect,
    canUseProductionDebugRoute,
    chatMemoryPayload,
    classifyDeliveryArtifactWithOpenAi,
    clearCookie,
    connectorRoutes,
    createAdminOrderApiKey,
    createCampaignPayload,
    createOrderApiKey,
    currentOrderRequesterContext,
    currentUserContext,
    deleteAppSetting,
    deleteCurrentAccount,
    deleteExactMatchAction,
    displayCurrencyToLedgerAmount,
    enforceBrowserWriteProtection,
    executeDeliveryActionRequest,
    EXTERNAL_API_COST_CATALOG_USD,
    fetchWorkerAsset,
    getAdminProviderIdentityVerification,
    getAppSettings,
    getExactMatchActions,
    getMcpDiscoveryPayload,
    getSession,
    getSettingsPayload,
    githubAppClientId,
    githubAppClientSecret,
    githubAppConfigured,
    githubAppId,
    githubAppPrivateKey,
    githubAppRecommendedSettings,
    githubAppSlug,
    githubClientId,
    githubClientSecret,
    githubOAuthScope,
    githubPrivateRepoImportEnabled,
    googleClientId,
    googleClientSecret,
    googleConfigured,
    googleLoginScope,
    googleScopedOAuthScope,
    googleScopeForOAuthAction,
    handleAdminDashboardApi,
    handleAdminPageRequest,
    handleAgentCallback,
    handleAgentOnboardingCheck,
    handleAppHandoff,
    handleApproveJobAuthority,
    handleAuthCallback,
    handleAuthStart,
    handleChatPageRequest,
    handleClaimJob,
    handleCreateAppContext,
    handleCreateJob,
    handleCreateRecurringOrder,
    handleDeleteAgent,
    handleDeleteApp,
    handleDeleteRecurringOrder,
    handleE2eAuthVerify,
    handleEmailAuthRequest,
    handleEmailAuthVerify,
    handleGetAppContext,
    handleGetJob,
    handleGithubAppCallback,
    handleGithubAppConnectStart,
    handleGithubAppInstallStart,
    handleGithubAppSetup,
    handleGoogleAuthCallback,
    handleGoogleAuthStart,
    handleGuestTrialClaim,
    handleImportAppManifest,
    handleImportAppUrl,
    handleImportManifest,
    handleImportUrl,
    handleInternalWorkflowCompletionSweep,
    handleListAppContexts,
    handleListPublisherItems,
    handleListRecurringOrders,
    handleLoginPageRequest,
    handleMcpRequest,
    handleOpenChatIntent,
    handlePublisherContextIngest,
    handleRecurringSweep,
    handleRegisterAgent,
    handleRegisterApp,
    handleResolveJob,
    handleRetryDispatch,
    handleReviewAgent,
    handleSampleAgentManifestRequest,
    handleSeed,
    handleSubmitResult,
    handleTimeoutSweep,
    handleUpdateAgentPricing,
    handleUpdateRecurringOrder,
    handleVerifyAgent,
    handleVerifyApp,
    hideOwnChatMemory,
    integrationRoutes,
    isAdminPagePath,
    isChatPagePath,
    isLoginPagePath,
    json,
    jsonWithCookies,
    legacyLegalNoticeRedirect,
    listChatTrainingData,
    listFeedbackReports,
    listOrderApiKeys,
    LLM_HIGH_WATERMARK_PRICE_PER_MTOK_USD,
    MAX_PROVIDER_MARKUP_RATE,
    maybeRefreshSessionCookie,
    maybeSendSignupWelcomeEmail,
    normalizeDeliveryExecuteFailureResponse,
    normalizeDeliveryScheduleFailureResponse,
    nowIso,
    OAUTH_STATE_COOKIE,
    parseBody,
    preflightWorkOrderRequest,
    prepareDeliveryExecutionRequest,
    prepareDeliveryFollowupOrderRequest,
    prepareDeliveryPublishOrderRequest,
    prepareDeliveryPublishRequest,
    prepareWorkOrderRequest,
    publisherCampaignIngestPayload,
    rateLimitResponseForRequest,
    recordAnalyticsEvent,
    recordChatSessionSnapshot,
    recordChatTranscript,
    recordOrderApiKeyUsage,
    requestOrigin,
    resolveWorkActionRequest,
    resolveWorkIntentRequest,
    responseWithCookies,
    reviewAdminProviderIdentityVerification,
    revokeOrderApiKey,
    runtimePolicy,
    runtimeStorage,
    sampleAgentManifestRoute,
    saveAppSetting,
    saveExactMatchAction,
    saveSettingsSection,
    scheduleDeliveryActionRequest,
    SESSION_COOKIE,
    snapshot,
    submitFeedbackReport,
    submitProviderIdentityVerification,
    updateCampaignAdsPayload,
    updateCampaignIntegrationsPayload,
    updateCampaignLeadSourcePayload,
    updateCampaignPayload,
    updateChatTranscriptReview,
    updateFeedbackReport,
    updateJobExecutorState,
    visibleDeliveryItemsForRequestFast,
    visibleJobsForRequestFast,
    workerLifecycleHandlers,
    xOAuthConfigured,
    xOAuthScopeLabel,
    xTokenEncryptionConfigured
  } = deps;

  function xCallbackUrl(request, env) {
    return String(env?.X_CALLBACK_URL || '').trim() || `${baseUrl(request, env)}/auth/x/callback`;
  }

  async function handleTestWelcomeEmailRequest(context) {
    const { request, env, storage } = context;
    const current = await currentUserContext(request, env);
    if (!canUseProductionDebugRoute(current, env)) return json({ error: 'Not found' }, 404);
    let body = {};
    try {
      body = await parseBody(request);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
    const recipientEmail = String(body.email || body.recipient_email || current?.user?.email || '').trim().toLowerCase();
    const displayName = String(body.name || body.display_name || current?.user?.name || '').trim();
    const account = recipientEmail
      ? {
        ...(current.account || {}),
        login: recipientEmail,
        profile: { ...(current.account?.profile || {}), displayName },
        billing: { ...(current.account?.billing || {}), billingEmail: recipientEmail }
      }
      : current.account;
    if (!account?.login) return json({ error: 'email or signed-in account required' }, 400);
    const delivery = await maybeSendSignupWelcomeEmail(
      storage,
      env,
      account,
      { ...(current.user || {}), email: recipientEmail || current?.user?.email || '', name: displayName, login: account.login },
      current.authProvider || 'debug',
      { alreadyClaimed: true }
    );
    return json({ ok: delivery.status !== 'failed', delivery }, delivery.status === 'failed' ? 502 : 200);
  }

  async function handleAuthRoutes(context) {
    const { request, env, url, storage } = context;
    if (url.pathname === '/auth/status' && request.method === 'GET') {
      const status = await authStatus(request, env);
      const session = await getSession(request, env);
      const refreshedCookie = await maybeRefreshSessionCookie(session, env);
      return refreshedCookie ? jsonWithCookies(status, 200, [refreshedCookie]) : json(status);
    }
    if (url.pathname === '/api/internal/cron/workflow-completions' && request.method === 'POST') {
      return handleInternalWorkflowCompletionSweep(request, env);
    }
    if (request.method === 'GET' && isLoginPagePath(url.pathname)) {
      const loginRedirect = await handleLoginPageRequest(request, env);
      if (loginRedirect) return loginRedirect;
    }
    if (request.method === 'GET' && isChatPagePath(url.pathname)) {
      const chatRedirect = await handleChatPageRequest(request, env);
      if (chatRedirect) return chatRedirect;
    }
    if (request.method === 'GET' && isAdminPagePath(url.pathname)) {
      const adminResponse = await handleAdminPageRequest(request, env);
      if (adminResponse) return adminResponse;
    }
    if (url.pathname === '/auth/debug' && request.method === 'GET') {
      const current = await currentUserContext(request, env);
      if (!canUseProductionDebugRoute(current, env)) return json({ error: 'Not found' }, 404);
      const callback = `${baseUrl(request, env)}/auth/github/callback`;
      const googleCallback = `${baseUrl(request, env)}/auth/google/callback`;
      const xCallback = xCallbackUrl(request, env);
      const githubAppSetup = githubAppRecommendedSettings(request, env);
      const policy = runtimePolicy(env);
      return json({
        githubConfigured: Boolean(githubClientId(env) && githubClientSecret(env)),
        googleConfigured: googleConfigured(env),
        authBaseUrl: baseUrl(request, env),
        currentOrigin: requestOrigin(request),
        xConfigured: xOAuthConfigured(env),
        xTokenEncryptionConfigured: xTokenEncryptionConfigured(env),
        githubAppConfigured: githubAppConfigured(env),
        clientIdPresent: Boolean(githubClientId(env)),
        clientSecretPresent: Boolean(githubClientSecret(env)),
        googleClientIdPresent: Boolean(googleClientId(env)),
        googleClientSecretPresent: Boolean(googleClientSecret(env)),
        requestedScope: githubOAuthScope(env),
        googleRequestedScope: googleScopeForOAuthAction(env, 'analytics_connect'),
        googleScopeProfiles: {
          login: googleLoginScope(env),
          analytics: googleScopeForOAuthAction(env, 'analytics_connect'),
          drive: googleScopedOAuthScope(env, ['drive']),
          calendarRead: googleScopedOAuthScope(env, ['calendar_read']),
          gmailRead: googleScopedOAuthScope(env, ['gmail_read']),
          gmailSend: googleScopedOAuthScope(env, ['gmail_send'])
        },
        xRequestedScope: xOAuthScopeLabel(),
        privateRepoImportEnabled: githubPrivateRepoImportEnabled(env),
        releaseStage: policy.releaseStage,
        openWriteApiEnabled: policy.openWriteApiEnabled,
        guestRunReadEnabled: policy.guestRunReadEnabled,
        devApiEnabled: policy.devApiEnabled,
        developerApiEnabled: policy.developerApiEnabled,
        cliEnabled: policy.cliEnabled,
        mcpEnabled: policy.mcpEnabled,
        developerSurfacesPaused: policy.developerSurfacesPaused,
        exposeJobSecrets: policy.exposeJobSecrets,
        callback,
        googleCallback,
        xCallback,
        githubApp: {
          appIdPresent: Boolean(githubAppId(env)),
          clientIdPresent: Boolean(githubAppClientId(env)),
          clientSecretPresent: Boolean(githubAppClientSecret(env)),
          privateKeyPresent: Boolean(githubAppPrivateKey(env)),
          slug: githubAppSlug(env) || null,
          recommendedSettings: githubAppSetup
        }
      });
    }
    if (url.pathname === '/auth/github-app/install' && request.method === 'GET') {
      return handleGithubAppInstallStart(request, env);
    }
    if (url.pathname === '/auth/github-app/connect' && request.method === 'GET') {
      return handleGithubAppConnectStart(request, env);
    }
    if (url.pathname === '/auth/github-app/callback' && request.method === 'GET') {
      return handleGithubAppCallback(request, env);
    }
    if (url.pathname === '/auth/github-app/setup' && request.method === 'GET') {
      return handleGithubAppSetup(request, env);
    }
    if (url.pathname === '/auth/github' && request.method === 'GET') {
      return handleAuthStart(request, env);
    }
    if (url.pathname === '/auth/github/callback' && request.method === 'GET') {
      return handleAuthCallback(request, env);
    }
    if (url.pathname === '/auth/google' && request.method === 'GET') {
      return handleGoogleAuthStart(request, env);
    }
    if (url.pathname === '/auth/google/callback' && request.method === 'GET') {
      return handleGoogleAuthCallback(request, env);
    }
    if (url.pathname === '/auth/email/request' && request.method === 'POST') {
      return handleEmailAuthRequest(request, env);
    }
    if (url.pathname === '/auth/email/verify' && request.method === 'GET') {
      return handleEmailAuthVerify(request, env);
    }
    if (url.pathname === '/auth/e2e/verify' && request.method === 'GET') {
      return handleE2eAuthVerify(request, env);
    }
    if (url.pathname === '/auth/x' && request.method === 'GET') {
      return connectorRoutes.handleXAuthStart(request, env);
    }
    if (url.pathname === '/auth/x/callback' && request.method === 'GET') {
      return connectorRoutes.handleXAuthCallback(request, env);
    }
    if (url.pathname === '/auth/logout' && request.method === 'POST') {
      return integrationRoutes.handleLogout(env);
    }
    return null;
  }

  async function handleConnectorAndGithubRoutes(context) {
    const { request, env, url, storage } = context;
    if (apiRouteMatches(url.pathname, request.method, 'CONNECTORS_X_STATUS', 'GET')) {
      return connectorRoutes.handleXConnectorStatus(request, env);
    }
    if (apiRouteMatches(url.pathname, request.method, 'CONNECTORS_WORDPRESS_STATUS', 'GET')) {
      return connectorRoutes.handleWordPressConnectorStatus(request, env);
    }
    if (url.pathname === '/api/connectors/google/assets' && request.method === 'GET') {
      return integrationRoutes.handleGoogleConnectorAssets(request, env);
    }
    if (url.pathname === '/api/connectors/google/analytics-report' && request.method === 'GET') {
      return integrationRoutes.handleGoogleAnalyticsReport(request, env);
    }
    if (apiRouteMatches(url.pathname, request.method, 'CONNECTORS_INSTAGRAM_POST', 'POST')) {
      return integrationRoutes.handleInstagramConnectorPost(request, env);
    }
    if (apiRouteMatches(url.pathname, request.method, 'CONNECTORS_GOOGLE_SEND_GMAIL', 'POST')) {
      return integrationRoutes.handleGoogleSendGmail(request, env);
    }
    if (apiRouteMatches(url.pathname, request.method, 'CONNECTORS_RESEND_SEND_EMAIL', 'POST')) {
      return integrationRoutes.handleResendSendEmail(request, env);
    }
    if (url.pathname === '/api/internal/test-welcome-email' && request.method === 'POST') {
      return handleTestWelcomeEmailRequest(context);
    }
    if (apiRouteMatches(url.pathname, request.method, 'CONNECTORS_X_POST', 'POST')) {
      return connectorRoutes.handleXConnectorPost(request, env);
    }
    if (apiRouteMatches(url.pathname, request.method, 'CONNECTORS_WORDPRESS_CONNECT', 'POST')) {
      return connectorRoutes.handleWordPressConnectorConnect(request, env);
    }
    if (apiRouteMatches(url.pathname, request.method, 'CONNECTORS_WORDPRESS_CREATE_DRAFT', 'POST')) {
      return connectorRoutes.handleWordPressConnectorCreateDraft(request, env);
    }
    if (url.pathname === '/api/github/repos' && request.method === 'GET') {
      return integrationRoutes.handleGithubRepos(request, env);
    }
    if (url.pathname === '/api/github/app-setup' && request.method === 'GET') {
      return json({
        githubAppConfigured: githubAppConfigured(env),
        recommended: githubAppRecommendedSettings(request, env)
      });
    }
    if (url.pathname === '/api/github/load-manifest' && request.method === 'POST') {
      return integrationRoutes.handleGithubLoadManifest(storage, request, env);
    }
    if (url.pathname === '/api/github/generate-manifest' && request.method === 'POST') {
      return integrationRoutes.handleGithubGenerateManifest(request, env);
    }
    if (apiRouteMatches(url.pathname, request.method, 'GITHUB_CREATE_ADAPTER_PR', 'POST')) {
      return integrationRoutes.handleGithubCreateAdapterPr(storage, request, env);
    }
    if (apiRouteMatches(url.pathname, request.method, 'GITHUB_CREATE_EXECUTOR_PR', 'POST')) {
      return integrationRoutes.handleGithubCreateExecutorPr(storage, request, env);
    }
    if (url.pathname === '/api/github/import-repo' && request.method === 'POST') {
      return json({
        error: 'Deprecated endpoint. Repository analysis import is disabled.',
        use: '/api/github/load-manifest'
      }, 410);
    }
    return null;
  }

  async function handleRuntimeInfoRoutes(context) {
    const { request, env, url, storage, version, deployTarget } = context;
    if (url.pathname === '/api/health') {
      return json({ ok: true, service: 'aiagent2', version, deploy_target: deployTarget, time: nowIso() });
    }
    if (url.pathname === '/api/ready') {
      return json({ ok: true, ready: true, storage: { kind: storage.kind, supportsPersistence: storage.supportsPersistence }, version, deploy_target: deployTarget, time: nowIso() });
    }
    if (url.pathname === '/api/version') {
      return json({ ok: true, version, deploy_target: deployTarget, runtime: 'workerd', time: nowIso() });
    }
    if (url.pathname === '/api/metrics') {
      const snap = await snapshot(storage, request, env);
      return json({
        ok: true,
        version,
        deploy_target: deployTarget,
        stats: snap.stats,
        storage: snap.storage,
        billing_audit_count: (snap.billingAudits || []).length,
        event_count: (snap.events || []).length,
        time: nowIso()
      });
    }
    if (apiRouteMatches(url.pathname, request.method, 'PRICING_CATALOG', 'GET')) {
      return json({
        ok: true,
        catalogVersion: API_COST_CATALOG_VERSION,
        currency: 'USD',
        displayCurrency: BILLING_DISPLAY_CURRENCY,
        ledgerUnitsPerUsd: displayCurrencyToLedgerAmount(1),
        providerMarkup: {
          defaultRate: 0.1,
          maxRate: MAX_PROVIDER_MARKUP_RATE,
          configurableByProvider: true
        },
        platformMargin: {
          rate: 0.1,
          basis: 'final_order_total'
        },
        llmHighWatermark: LLM_HIGH_WATERMARK_PRICE_PER_MTOK_USD,
        externalApiUnitCosts: EXTERNAL_API_COST_CATALOG_USD,
        formula: {
          usageBasedOrder: 'billable_cost_basis * (1 + provider_markup_rate) / (1 - platform_margin_rate)',
          fixedRunOrder: 'fixed_run_price_usd',
          providerMonthlyPlan: 'provider_monthly_price_usd, with CAIt retaining 10% of the monthly fee',
          notes: [
            'LLM estimates use the high-watermark catalog unless the completed run reports a positive actual cost.',
            'Non-LLM API calls use catalog per-call units unless the completed run reports explicit tool cost.',
            'Provider markup can be set from 0% to 100%; CAIt platform margin remains fixed at 10%.'
          ]
        },
        monthlyPlans: {
          status: 'not_finalized',
          note: 'Monthly plans will be considered after more real usage is measured; usage-based billing remains the first model.'
        }
      });
    }
    if (url.pathname === '/api/schema') {
      return json({ schema: storage.schemaSql });
    }
    return null;
  }

  async function handleCoreApiRoutes(context) {
    const { request, env, url, storage } = context;
    if (url.pathname === '/api/admin/dashboard' && request.method === 'GET') {
      return handleAdminDashboardApi(request, env);
    }
    if (apiRouteMatches(url.pathname, request.method, 'ADMIN_PROVIDER_IDENTITY', 'GET')) {
      const result = await getAdminProviderIdentityVerification(storage, request, env, url.pathname.split('/')[4] || '');
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result);
    }
    if (apiRouteMatches(url.pathname, request.method, 'ADMIN_PROVIDER_IDENTITY', 'POST')) {
      const result = await reviewAdminProviderIdentityVerification(storage, request, env, url.pathname.split('/')[4] || '');
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result);
    }
    if (url.pathname === '/api/snapshot') {
      const payload = await snapshot(storage, request, env);
      const session = await getSession(request, env);
      const refreshedCookie = await maybeRefreshSessionCookie(session, env);
      return refreshedCookie ? jsonWithCookies(payload, 200, [refreshedCookie]) : json(payload);
    }
    if (url.pathname === '/api/chat-memory' && request.method === 'GET') {
      const session = await getSession(request, env);
      const payload = await chatMemoryPayload(storage, request, env, { session });
      const refreshedCookie = await maybeRefreshSessionCookie(session, env);
      return refreshedCookie ? jsonWithCookies(payload, 200, [refreshedCookie]) : json(payload);
    }
    if (url.pathname === '/api/guest-trial/claim' && request.method === 'POST') {
      const result = await handleGuestTrialClaim(storage, request, env);
      if (result.error) return json({ error: result.error, code: result.code }, result.statusCode || 400);
      return json(result);
    }
    if (url.pathname === '/api/analytics/events' && request.method === 'POST') {
      const result = await recordAnalyticsEvent(storage, request, env);
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result, 201);
    }
    if (url.pathname === '/api/analytics/chat-transcripts' && request.method === 'POST') {
      const result = await recordChatTranscript(storage, request, env);
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result, 201);
    }
    if (url.pathname === '/api/chat-sessions' && request.method === 'POST') {
      const result = await recordChatSessionSnapshot(storage, request, env);
      if (result.error) return json({ error: result.error, code: result.code || result.error }, result.statusCode || 400);
      return json(result, result.saved === false ? 200 : 201);
    }
    if (url.pathname === '/api/open-chat/intent' && request.method === 'POST') {
      const result = await handleOpenChatIntent(storage, request, env);
      return json(result.payload, result.statusCode || 200);
    }
    if (url.pathname === '/api/work/resolve-action' && request.method === 'POST') {
      const result = await resolveWorkActionRequest(storage, request);
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result);
    }
    if (url.pathname === '/api/work/resolve-intent' && request.method === 'POST') {
      const result = await resolveWorkIntentRequest(storage, request);
      if (result.error) return json(result, result.statusCode || 400);
      return json(result);
    }
    if (url.pathname === '/api/work/prepare-order' && request.method === 'POST') {
      const result = await prepareWorkOrderRequest(storage, request, env);
      if (result.error) return json(result, result.statusCode || 400);
      return json(result);
    }
    if (url.pathname === '/api/work/preflight-order' && request.method === 'POST') {
      const result = await preflightWorkOrderRequest(storage, request, env);
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result, result.ok ? 200 : (result.statusCode || 400));
    }
    if (/^\/api\/jobs\/[^/]+\/executor-state$/.test(url.pathname) && request.method === 'PATCH') {
      const jobId = url.pathname.split('/')[3] || '';
      const result = await updateJobExecutorState(storage, request, env, jobId);
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result);
    }
    if (url.pathname === '/api/deliveries/classify' && request.method === 'POST') {
      const body = await parseBody(request).catch((error) => ({ __error: error.message }));
      if (body.__error) return json({ error: body.__error }, 400);
      const authorization = await authorizeOpenChatIntentLlm(storage, request, env);
      if (!authorization.ok) {
        return json({
          ok: false,
          available: false,
          source: authorization.source || 'none',
          error: authorization.error
        }, authorization.statusCode || 403);
      }
      const result = await classifyDeliveryArtifactWithOpenAi(body, env, {
        allowOpenAiApiKeyFallback: authorization.allowOpenAiApiKeyFallback,
        allowPlatformOpenAiApiKeyFallback: authorization.allowPlatformOpenAiApiKeyFallback
      });
      return json(result, result.ok ? 200 : 503);
    }
    if (url.pathname === '/api/deliveries/prepare-publish' && request.method === 'POST') {
      const result = await prepareDeliveryPublishRequest(storage, request, env);
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result);
    }
    if (url.pathname === '/api/deliveries/prepare-publish-order' && request.method === 'POST') {
      const result = await prepareDeliveryPublishOrderRequest(storage, request, env);
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result);
    }
    if (url.pathname === API_ROUTES.DELIVERIES_PREPARE_FOLLOWUP_ORDER && request.method === 'POST') {
      const result = await prepareDeliveryFollowupOrderRequest(storage, request, env);
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result);
    }
    if (url.pathname === '/api/deliveries/prepare-execution' && request.method === 'POST') {
      const result = await prepareDeliveryExecutionRequest(storage, request, env);
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result);
    }
    if (apiRouteMatches(url.pathname, request.method, 'DELIVERIES_EXECUTE', 'POST')) {
      const result = await executeDeliveryActionRequest(storage, request, env);
      if (result.error) return json(normalizeDeliveryExecuteFailureResponse(result), result.statusCode || 400);
      return json(result, result.statusCode || 200);
    }
    if (apiRouteMatches(url.pathname, request.method, 'DELIVERIES_SCHEDULE', 'POST')) {
      const result = await scheduleDeliveryActionRequest(storage, request, env);
      if (result.error) return json(normalizeDeliveryScheduleFailureResponse(result), result.statusCode || 400);
      return json(result, result.statusCode || 200);
    }
    if (url.pathname === '/api/stats') {
      return json((await snapshot(storage, request, env)).stats);
    }
    if (url.pathname === '/.well-known/mcp.json' && request.method === 'GET') {
      const payload = getMcpDiscoveryPayload(request, env);
      return json(payload, payload?.disabled ? 503 : 200);
    }
    if (url.pathname === '/mcp' && request.method === 'POST') {
      const result = await handleMcpRequest(storage, request, env);
      if (result.error) return json(result.payload || { error: result.error, code: result.code }, result.statusCode || 400);
      return json(result.payload);
    }
    return null;
  }

  async function handleAgentAndAppRoutes(context) {
    const { request, env, ctx, url, storage } = context;
    if (url.pathname === '/api/agents') {
      if (request.method === 'POST') return handleRegisterAgent(storage, request, env);
      if (request.method === 'GET') return json(await agentsCatalogPayload(storage, request));
    }
    if (
      apiRouteMatches(url.pathname, request.method, 'AGENT_CATALOG_INDEX', 'GET')
      || apiRouteMatches(url.pathname, request.method, 'AGENT_SELECTION_INDEX', 'GET')
    ) {
      return json(await agentCatalogIndexPayload(storage, request));
    }
    if (apiRouteMatches(url.pathname, request.method, 'CAMPAIGNS', 'GET')) {
      const result = await campaignsPayload(storage, request, env);
      return json(result, result.statusCode || 200);
    }
    if (apiRouteMatches(url.pathname, request.method, 'CAMPAIGNS', 'POST')) {
      const result = await createCampaignPayload(storage, request, env);
      return json(result, result.statusCode || 200);
    }
    if (apiRouteMatches(url.pathname, request.method, 'CAMPAIGN_METRICS')) {
      const campaignId = decodeURIComponent(url.pathname.split('/')[3] || '');
      const result = request.method === 'POST'
        ? await appendCampaignMetricsPayload(storage, request, env, campaignId)
        : await campaignMetricsPayload(storage, request, env, campaignId);
      return json(result, result.statusCode || 200);
    }
    if (apiRouteMatches(url.pathname, request.method, 'CAMPAIGN_INTEGRATIONS')) {
      const campaignId = decodeURIComponent(url.pathname.split('/')[3] || '');
      const result = request.method === 'POST'
        ? await updateCampaignIntegrationsPayload(storage, request, env, campaignId)
        : await campaignIntegrationsPayload(storage, request, env, campaignId);
      return json(result, result.statusCode || 200);
    }
    if (apiRouteMatches(url.pathname, request.method, 'CAMPAIGN_LEAD_SOURCE')) {
      const campaignId = decodeURIComponent(url.pathname.split('/')[3] || '');
      const result = request.method === 'POST'
        ? await updateCampaignLeadSourcePayload(storage, request, env, campaignId)
        : await campaignLeadSourcePayload(storage, request, env, campaignId);
      return json(result, result.statusCode || 200);
    }
    if (apiRouteMatches(url.pathname, request.method, 'CAMPAIGN_ADS')) {
      const campaignId = decodeURIComponent(url.pathname.split('/')[3] || '');
      const result = request.method === 'POST'
        ? await updateCampaignAdsPayload(storage, request, env, campaignId)
        : await campaignAdsPayload(storage, request, env, campaignId);
      return json(result, result.statusCode || 200);
    }
    if (apiRouteMatches(url.pathname, request.method, 'CAMPAIGN_DETAIL')) {
      const campaignId = decodeURIComponent(url.pathname.split('/')[3] || '');
      const result = request.method === 'POST'
        ? await updateCampaignPayload(storage, request, env, campaignId)
        : await campaignDetailPayload(storage, request, env, campaignId);
      return json(result, result.statusCode || 200);
    }
    if (url.pathname === '/api/apps') {
      if (request.method === 'POST') return handleRegisterApp(storage, request, env);
      if (request.method === 'GET') return json(await appsCatalogPayload(storage, request));
    }
    if (url.pathname === '/api/apps/import-manifest' && request.method === 'POST') {
      return handleImportAppManifest(storage, request, env);
    }
    if (url.pathname === '/api/apps/import-url' && request.method === 'POST') {
      return handleImportAppUrl(storage, request, env);
    }
    if (/^\/api\/apps\/[^/]+\/handoff$/.test(url.pathname) && request.method === 'POST') {
      return handleAppHandoff(storage, request, env, decodeURIComponent(url.pathname.split('/')[3] || ''));
    }
    if (apiRouteMatches(url.pathname, request.method, 'APP_CONTEXTS', 'GET')) {
      return handleListAppContexts(storage, request, env);
    }
    if (apiRouteMatches(url.pathname, request.method, 'APP_CONTEXTS', 'POST')) {
      return handleCreateAppContext(storage, request, env);
    }
    if (apiRouteMatches(url.pathname, request.method, 'PUBLISHER_CAMPAIGN_INGEST', 'POST')) {
      const result = await publisherCampaignIngestPayload(storage, request, env);
      return json(result, result.statusCode || 200);
    }
    if (apiRouteMatches(url.pathname, request.method, 'PUBLISHER_CONTEXT_INGEST', 'POST')) {
      return handlePublisherContextIngest(storage, request, env);
    }
    if (apiRouteMatches(url.pathname, request.method, 'PUBLISHER_ITEMS', 'GET')) {
      return handleListPublisherItems(storage, request, env);
    }
    if (apiRouteMatches(url.pathname, request.method, 'APP_CONTEXT_DETAIL', 'GET')) {
      return handleGetAppContext(storage, request, env, decodeURIComponent(url.pathname.split('/')[3] || ''));
    }
    if (apiRouteMatches(url.pathname, request.method, 'DELIVERY_ITEMS', 'GET')) {
      const current = await currentOrderRequesterContext(storage, request, env, { lightweight: true });
      if (!current.user && current.apiKeyStatus === 'invalid') return json({ error: 'Invalid API key' }, 401);
      if (!current.user && current.apiKeyStatus === 'disabled') return json({ error: 'CAIt developer API and API key access are temporarily disabled.', code: 'developer_api_disabled' }, 403);
      const result = await visibleDeliveryItemsForRequestFast(storage, current, env, request);
      if (current.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
      return json({ ok: true, items: result.items, pagination: result.pagination });
    }
    if (/^\/api\/apps\/[^/]+\/verify$/.test(url.pathname) && request.method === 'POST') {
      return handleVerifyApp(storage, request, env, url.pathname.split('/')[3] || '');
    }
    if (/^\/api\/apps\/[^/]+$/.test(url.pathname) && request.method === 'DELETE') {
      return handleDeleteApp(storage, request, env, url.pathname.split('/')[3] || '');
    }
    if (url.pathname === '/api/agent-callbacks/jobs' && request.method === 'POST') {
      return handleAgentCallback(storage, request, env);
    }
    if (url.pathname === '/api/agents/import-manifest' && request.method === 'POST') {
      return handleImportManifest(storage, request, env);
    }
    if (url.pathname === '/api/agents/draft-skill-manifest' && request.method === 'POST') {
      let body;
      try {
        body = await parseBody(request);
      } catch (error) {
        return json({ error: error.message }, 400);
      }
      const skillMd = body.skill_md || body.skillMd || body.skill || body.text || '';
      if (!String(skillMd || '').trim()) return json({ error: 'skill_md required' }, 400);
      try {
        const session = await getSession(request, env);
        const draft = buildDraftManifestFromAgentSkill({
          skillMd,
          sourceUrl: body.source_url || body.sourceUrl || '',
          filePath: body.file_path || body.filePath || 'SKILL.md',
          ownerLogin: session?.user?.login || ''
        });
        if (!draft.safety.ok) return agentSafetyErrorResponse(draft.safety);
        return json({
          ok: true,
          standard: 'agent-skills',
          draft_manifest: draft.draftManifest,
          safety: draft.safety,
          skill: {
            name: draft.skill.name,
            description: draft.skill.description,
            file_path: draft.skill.filePath,
            source_url: draft.skill.sourceUrl || null,
            frontmatter: draft.skill.frontmatter || {}
          },
          source_files: draft.analysis.loadedFiles,
          runtime_hints: draft.analysis.runtimeHints,
          task_type_scores: draft.analysis.scoredTaskTypes,
          warnings: draft.analysis.warnings,
          next_step: 'Review the generated JSON, add deployed endpoint URLs if needed, then import the JSON manifest.'
        });
      } catch (error) {
        return json({ error: error.message }, 400);
      }
    }
    if (url.pathname === '/api/agents/import-url' && request.method === 'POST') {
      return handleImportUrl(storage, request, env);
    }
    if (/^\/api\/agents\/[^/]+\/onboarding-check$/.test(url.pathname) && request.method === 'GET') {
      return handleAgentOnboardingCheck(storage, request, env, url.pathname.split('/')[3] || '');
    }
    if (/^\/api\/agents\/[^/]+$/.test(url.pathname) && request.method === 'DELETE') {
      return handleDeleteAgent(storage, request, env, url.pathname.split('/')[3] || '');
    }
    if (/^\/api\/agents\/[^/]+\/pricing$/.test(url.pathname) && request.method === 'PATCH') {
      return handleUpdateAgentPricing(storage, request, env, url.pathname.split('/')[3] || '');
    }
    if (/^\/api\/agents\/[^/]+\/review$/.test(url.pathname) && request.method === 'POST') {
      return handleReviewAgent(storage, request, env, url.pathname.split('/')[3] || '');
    }
    if (/^\/api\/agents\/[^/]+\/verify$/.test(url.pathname) && request.method === 'POST') {
      return handleVerifyAgent(storage, request, env, url.pathname.split('/')[3] || '');
    }
    return null;
  }

  async function handleJobAndOrderRoutes(context) {
    const { request, env, ctx, url, storage } = context;
    if (url.pathname === '/api/jobs') {
      if (request.method === 'GET') {
        const current = await currentOrderRequesterContext(storage, request, env, { lightweight: true });
        if (!current.user && current.apiKeyStatus === 'invalid') return json({ error: 'Invalid API key' }, 401);
        if (!current.user && current.apiKeyStatus === 'disabled') return json({ error: 'CAIt developer API and API key access are temporarily disabled.', code: 'developer_api_disabled' }, 403);
        const result = await visibleJobsForRequestFast(storage, current, env, request);
        if (current.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
        return json({ jobs: result.jobs, pagination: result.pagination });
      }
      if (request.method === 'POST') return handleCreateJob(storage, request, env, ctx);
    }
    if (url.pathname === '/api/recurring-orders') {
      if (request.method === 'GET') return handleListRecurringOrders(storage, request, env);
      if (request.method === 'POST') return handleCreateRecurringOrder(storage, request, env);
    }
    if (/^\/api\/recurring-orders\/[^/]+$/.test(url.pathname)) {
      const recurringOrderId = url.pathname.split('/')[3] || '';
      if (request.method === 'PATCH') return handleUpdateRecurringOrder(storage, request, env, recurringOrderId);
      if (request.method === 'DELETE') return handleDeleteRecurringOrder(storage, request, env, recurringOrderId);
    }
    if (url.pathname.startsWith('/api/jobs/')) {
      const [, , , jobId = '', action = ''] = url.pathname.split('/');
      if (request.method === 'GET' && jobId) return handleGetJob(storage, request, env, jobId, ctx);
      if (request.method === 'POST' && action === 'approve' && jobId) {
        const result = await handleApproveJobAuthority(storage, request, env, jobId, ctx);
        if (result.error) return json(result, result.statusCode || 400);
        return json(result);
      }
      if (request.method === 'POST' && action === 'claim' && jobId) return handleClaimJob(storage, request, env, jobId);
      if (request.method === 'POST' && action === 'result' && jobId) return handleSubmitResult(storage, request, env, jobId);
    }
    return null;
  }

  async function handleSettingsAndFeedbackRoutes(context) {
    const { request, env, url, storage } = context;
    if (url.pathname === '/api/billing-audits') {
      return json({ billing_audits: (await snapshot(storage, request, env)).billingAudits });
    }
    if (url.pathname === '/api/feedback' && request.method === 'POST') {
      const result = await submitFeedbackReport(storage, request, env);
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result, 201);
    }
    if (url.pathname === '/api/settings' && request.method === 'GET') {
      const result = await getSettingsPayload(storage, request, env);
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json({ account: result.account, monthly_summary: result.monthlySummary });
    }
    if (apiRouteMatches(url.pathname, request.method, 'SETTINGS_ACCOUNT', 'DELETE')) {
      const result = await deleteCurrentAccount(storage, request, env);
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return jsonWithCookies({
        ok: true,
        deleted: result.deleted,
        redirect_to: result.redirect_to || '/'
      }, 200, [clearCookie(SESSION_COOKIE), clearCookie(OAUTH_STATE_COOKIE)]);
    }
    if (url.pathname === '/api/settings/feedback-reports' && request.method === 'GET') {
      const result = await listFeedbackReports(storage, request, env);
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json({ feedback_reports: result.feedbackReports });
    }
    if (/^\/api\/settings\/feedback-reports\/[^/]+$/.test(url.pathname) && request.method === 'POST') {
      const result = await updateFeedbackReport(storage, request, env, url.pathname.split('/')[4] || '');
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result);
    }
    if (/^\/api\/settings\/chat-transcripts\/[^/]+$/.test(url.pathname) && request.method === 'POST') {
      const result = await updateChatTranscriptReview(storage, request, env, url.pathname.split('/')[4] || '');
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result);
    }
    if (/^\/api\/settings\/chat-memory\/[^/]+$/.test(url.pathname) && request.method === 'DELETE') {
      const result = await hideOwnChatMemory(storage, request, env, url.pathname.split('/')[4] || '');
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result);
    }
    if (url.pathname === '/api/settings/chat-training-data' && request.method === 'GET') {
      const result = await listChatTrainingData(storage, request, env);
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result);
    }
    if (url.pathname === '/api/settings/api-keys' && request.method === 'GET') {
      const result = await listOrderApiKeys(storage, request, env);
      if (result.error) return json({ error: result.error, code: result.code }, result.statusCode || 400);
      return json({ api_keys: result.apiKeys });
    }
    if (url.pathname === '/api/settings/api-keys' && request.method === 'POST') {
      const result = await createOrderApiKey(storage, request, env);
      if (result.error) return json({ error: result.error, code: result.code }, result.statusCode || 400);
      return json({ ok: true, api_key: result.apiKey, account: result.account }, 201);
    }
    if (apiRouteMatches(url.pathname, request.method, 'ADMIN_API_KEYS', 'POST')) {
      const result = await createAdminOrderApiKey(storage, request, env);
      if (result.error) return json({ error: result.error, code: result.code }, result.statusCode || 400);
      return json({ ok: true, api_key: result.apiKey, account: result.account, issued_by: result.issuedBy, auth_mode: result.authMode }, 201);
    }
    if (/^\/api\/settings\/api-keys\/[^/]+$/.test(url.pathname) && request.method === 'DELETE') {
      const result = await revokeOrderApiKey(storage, request, env, url.pathname.split('/')[4] || '');
      if (result.error) return json({ error: result.error, code: result.code }, result.statusCode || 400);
      return json({ ok: true, api_key: result.apiKey, account: result.account });
    }
    if (apiRouteMatches(url.pathname, request.method, 'SETTINGS_PROVIDER_IDENTITY', 'POST')) {
      const result = await submitProviderIdentityVerification(storage, request, env);
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result, 201);
    }
    if (url.pathname === '/api/settings/executor-preferences' && request.method === 'POST') {
      const result = await saveSettingsSection(storage, request, env, 'executorPreferences');
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json({ ok: true, account: result.account, monthly_summary: result.monthlySummary, section: 'executorPreferences' });
    }
    if (apiRouteMatches(url.pathname, request.method, 'SETTINGS_COST_LIMITS', 'POST')) {
      const result = await saveSettingsSection(storage, request, env, 'costLimits');
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json({ ok: true, account: result.account, monthly_summary: result.monthlySummary, section: 'costLimits' });
    }
    if (apiRouteMatches(url.pathname, request.method, 'SETTINGS_PROFILE', 'POST')) {
      const result = await saveSettingsSection(storage, request, env, 'profile');
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json({ ok: true, account: result.account, monthly_summary: result.monthlySummary, section: 'profile' });
    }
    if (apiRouteMatches(url.pathname, request.method, 'SETTINGS_EXACT_ACTIONS', 'GET')) {
      const result = await getExactMatchActions(storage, request, env);
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result);
    }
    if (apiRouteMatches(url.pathname, request.method, 'SETTINGS_EXACT_ACTIONS', 'POST')) {
      const result = await saveExactMatchAction(storage, request, env);
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result);
    }
    if (/^\/api\/settings\/exact-actions\/[^/]+$/.test(url.pathname) && request.method === 'DELETE') {
      const result = await deleteExactMatchAction(storage, request, env, decodeURIComponent(url.pathname.split('/')[4] || ''));
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result);
    }
    if (url.pathname === '/api/settings/app-settings' && request.method === 'GET') {
      const result = await getAppSettings(storage, request, env);
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result);
    }
    if (url.pathname === '/api/settings/app-settings' && request.method === 'POST') {
      const result = await saveAppSetting(storage, request, env);
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result);
    }
    if (/^\/api\/settings\/app-settings\/[^/]+$/.test(url.pathname) && request.method === 'DELETE') {
      const result = await deleteAppSetting(storage, request, env, decodeURIComponent(url.pathname.split('/')[4] || ''));
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result);
    }
    return null;
  }

  async function handleDevRoutes(context) {
    const { request, env, url, storage } = context;
    if (url.pathname === '/api/dev/resolve-job' && request.method === 'POST') {
      return handleResolveJob(storage, request, env);
    }
    if (url.pathname === '/api/dev/dispatch-retry' && request.method === 'POST') {
      return handleRetryDispatch(storage, request, env);
    }
    if (url.pathname === '/api/dev/timeout-sweep' && request.method === 'POST') {
      return handleTimeoutSweep(storage, request, env);
    }
    if (url.pathname === '/api/dev/recurring-sweep' && request.method === 'POST') {
      return handleRecurringSweep(storage, request, env);
    }
    if (url.pathname === '/api/seed' && request.method === 'POST') {
      return handleSeed(storage, request, env);
    }
    return null;
  }

  const requestRouteHandlers = [
    handleAuthRoutes,
    handleConnectorAndGithubRoutes,
    handleRuntimeInfoRoutes,
    handleCoreApiRoutes,
    handleAgentAndAppRoutes,
    handleJobAndOrderRoutes,
    handleSettingsAndFeedbackRoutes,
    handleDevRoutes
  ];

  return {
    async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const storage = runtimeStorage(env);
    const version = env.APP_VERSION || '0.2.0';
    const deployTarget = 'cloudflare-worker';

    const canonicalRedirect = canonicalBrowserRedirect(request, env);
    if (canonicalRedirect) return canonicalRedirect;
    const legalNoticeRedirect = legacyLegalNoticeRedirect(request);
    if (legalNoticeRedirect) return legalNoticeRedirect;

    const rateLimited = rateLimitResponseForRequest(request);
    if (rateLimited) return rateLimited;
    const browserWriteBlocked = await enforceBrowserWriteProtection(request, env);
    if (browserWriteBlocked) return browserWriteBlocked;

    const sampleProviderRoute = sampleAgentManifestRoute(url.pathname);
    if (sampleProviderRoute) {
      return handleSampleAgentManifestRequest(request, env, sampleProviderRoute);
    }

    const routeContext = { request, env, ctx, url, storage, version, deployTarget };
    for (const handleRoute of requestRouteHandlers) {
      const response = await handleRoute(routeContext);
      if (response) return response;
    }

    const assetResponse = await fetchWorkerAsset(request, env, { responseWithCookies });
    if (assetResponse) return assetResponse;

    return json({ error: 'Not found' }, 404);
    },
    async queue(batch, env, ctx) {
    return workerLifecycleHandlers.queue(batch, env, ctx);
    },
    async scheduled(controller, env, ctx) {
    return workerLifecycleHandlers.scheduled(controller, env, ctx);
    }
  };
}
