// Integration route handlers extracted from worker.js.
// This module owns HTTP/account glue for Google, GitHub manifest, email, and scheduled connector actions.

export function createIntegrationRouteHandlers(deps = {}) {
  const {
    accountSettingsForLogin,
    agentSafetyErrorResponse,
    agentSafetyOptionsForRequest,
    appendEmailDelivery,
    applyAgentReviewToAgentRecord,
    assessAgentRegistrationSafety,
    buildDraftManifestFromRepoAnalysisWithAi,
    canUsePlatformResend,
    clearCookie,
    connectorActionLabel,
    connectorScopeSet,
    createAgentFromManifest,
    currentAgentRequesterContext,
    currentAgentRequesterContextWithAccount,
    fetchAllGithubRepos,
    fetchGithubManifestCandidate,
    fetchGithubPublicRepos,
    fetchGithubRepoMeta,
    fetchGithubRepoTree,
    fetchGoogleAuthorizedJson,
    githubAppRepoTokenForRequester,
    githubAppReposForSession,
    githubSessionCanReadPrivateRepos,
    googleAccessTokenForConnector,
    googleAccessTokenForCurrent,
    googleApiErrorPayload,
    googleApiWarning,
    googleConnectorForAccount,
    googleConnectorHasScopeGroup,
    googleOAuthCapabilitiesFromGroups,
    googleScopeGroupForAssetInclude,
    googleScopeGroupLabel,
    hasSendConfirmation,
    json,
    jsonWithCookies,
    loadGithubManifestDraftSignals,
    MANIFEST_CANDIDATE_PATHS,
    missingGoogleScopeGroups,
    nowIso,
    ownerInfoFromRequest,
    parseAndValidateManifest,
    parseBody,
    persistGithubAppAccess,
    postXTweet,
    providerMoneyReadinessForCurrent,
    recordOrderApiKeyUsage,
    resendConfigured,
    runAgentReviewForRequest,
    runtimeStorage,
    sendGoogleGmailMessage,
    sendResendEmail,
    sessionHasGithubApp,
    sessionHasGithubOauth,
    sessionHasGoogleOauth,
    sessionCookieName,
    oauthStateCookieName,
    touchEvent,
    upsertAccountSettingsInState,
    validateEmailAddress,
    validateXPostExecutionApproval,
    validateXPostText,
    adapterNextStepText
  } = deps;

  function clampGoogleReportRange(value = '') {
    const days = Number(value || 28);
    if (!Number.isFinite(days)) return 28;
    return Math.max(1, Math.min(180, Math.round(days)));
  }
  function yyyyMmDd(date) {
    return date.toISOString().slice(0, 10);
  }
  function googleReportDateRange(days = 28) {
    const end = new Date();
    end.setUTCDate(end.getUTCDate() - 1);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - Math.max(0, days - 1));
    return { startDate: yyyyMmDd(start), endDate: yyyyMmDd(end) };
  }
  function numberFromGoogleMetric(value = '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  function googleMetricValue(row = {}, index = 0) {
    return numberFromGoogleMetric(row?.metricValues?.[index]?.value);
  }
  function googleDimensionValue(row = {}, index = 0) {
    return String(row?.dimensionValues?.[index]?.value || '');
  }
  function normalizeGoogleGa4PropertyName(value = '') {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^properties\/[A-Za-z0-9_-]+$/.test(raw)) return raw;
    const digits = raw.match(/\d{4,}/)?.[0] || '';
    return digits ? `properties/${digits}` : raw;
  }
  async function fetchGoogleGa4AccountSummaries(accessToken) {
    const accountSummaries = [];
    let pageToken = '';
    for (let page = 0; page < 10; page += 1) {
      const url = new URL('https://analyticsadmin.googleapis.com/v1beta/accountSummaries');
      url.searchParams.set('pageSize', '200');
      if (pageToken) url.searchParams.set('pageToken', pageToken);
      const payload = await fetchGoogleAuthorizedJson(url.toString(), accessToken);
      accountSummaries.push(...(Array.isArray(payload?.accountSummaries) ? payload.accountSummaries : []));
      pageToken = String(payload?.nextPageToken || '').trim();
      if (!pageToken) break;
    }
    return { accountSummaries };
  }
  async function fetchGoogleSearchConsoleReport(accessToken, siteUrl = '', range = {}) {
    const target = String(siteUrl || '').trim();
    if (!target) return { site_url: '', rows: [], totals: { clicks: 0, impressions: 0 }, skipped: true };
    const payload = await fetchGoogleAuthorizedJson(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(target)}/searchAnalytics/query`,
      accessToken,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          startDate: range.startDate,
          endDate: range.endDate,
          dimensions: ['query', 'page'],
          rowLimit: 50,
          startRow: 0
        })
      }
    );
    const rows = (Array.isArray(payload?.rows) ? payload.rows : []).map((row) => {
      const keys = Array.isArray(row?.keys) ? row.keys : [];
      return {
        query: String(keys[0] || ''),
        page: String(keys[1] || ''),
        clicks: Number(row?.clicks || 0),
        impressions: Number(row?.impressions || 0),
        ctr: Number(row?.ctr || 0),
        position: Number(row?.position || 0)
      };
    });
    return {
      site_url: target,
      rows,
      totals: rows.reduce((acc, row) => ({
        clicks: acc.clicks + Number(row.clicks || 0),
        impressions: acc.impressions + Number(row.impressions || 0)
      }), { clicks: 0, impressions: 0 })
    };
  }
  async function fetchGoogleGa4RunReport(accessToken, property = '', body = {}) {
    const target = normalizeGoogleGa4PropertyName(property);
    if (!/^properties\/[A-Za-z0-9_-]+$/.test(target)) {
      const error = new Error('A valid GA4 property id such as properties/123456789 is required.');
      error.statusCode = 400;
      throw error;
    }
    return fetchGoogleAuthorizedJson(
      `https://analyticsdata.googleapis.com/v1beta/${target}:runReport`,
      accessToken,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      }
    );
  }
  async function fetchGoogleGa4ReportWithMetricFallback(accessToken, property = '', range = {}, dimensions = [], limit = 50) {
    const base = {
      dateRanges: [{ startDate: range.startDate, endDate: range.endDate }],
      dimensions: dimensions.map((name) => ({ name })),
      limit: String(limit)
    };
    if (dimensions.length) base.orderBys = [{ metric: { metricName: 'sessions' }, desc: true }];
    const candidates = ['keyEvents', 'conversions', ''];
    let lastError = null;
    for (const conversionMetric of candidates) {
      try {
        const metrics = [{ name: 'sessions' }];
        if (conversionMetric) metrics.push({ name: conversionMetric });
        const report = await fetchGoogleGa4RunReport(accessToken, property, { ...base, metrics });
        return { report, conversionMetric };
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error('GA4 report request failed');
  }
  function mapGoogleGa4Rows(report = {}, dimensions = []) {
    return (Array.isArray(report?.rows) ? report.rows : []).map((row) => ({
      dimensions: dimensions.map((_, index) => googleDimensionValue(row, index)),
      sessions: googleMetricValue(row, 0),
      conversions: googleMetricValue(row, 1)
    }));
  }
  async function fetchGoogleGa4Report(accessToken, property = '', range = {}) {
    const target = normalizeGoogleGa4PropertyName(property);
    if (!target) return {
      property: '',
      totals: { sessions: 0, conversions: 0 },
      landing_pages: [],
      channels: [],
      channel_landing_pages: [],
      channel_sources: [],
      countries: [],
      warnings: [],
      skipped: true
    };
    const totalsResult = await fetchGoogleGa4ReportWithMetricFallback(accessToken, target, range, [], 1);
    const [landingResult, channelsResult, channelPagesResult, channelSourcesResult, countriesResult] = await Promise.allSettled([
      fetchGoogleGa4ReportWithMetricFallback(accessToken, target, range, ['landingPagePlusQueryString'], 50),
      fetchGoogleGa4ReportWithMetricFallback(accessToken, target, range, ['sessionDefaultChannelGroup'], 25),
      fetchGoogleGa4ReportWithMetricFallback(accessToken, target, range, ['sessionDefaultChannelGroup', 'landingPagePlusQueryString'], 100),
      fetchGoogleGa4ReportWithMetricFallback(accessToken, target, range, ['sessionDefaultChannelGroup', 'sessionSourceMedium'], 100),
      fetchGoogleGa4ReportWithMetricFallback(accessToken, target, range, ['country'], 25)
    ]);
    const totalRow = mapGoogleGa4Rows(totalsResult.report, [])[0] || { sessions: 0, conversions: 0 };
    const landingReport = landingResult.status === 'fulfilled' ? landingResult.value : null;
    const channelsReport = channelsResult.status === 'fulfilled' ? channelsResult.value : null;
    const channelPagesReport = channelPagesResult.status === 'fulfilled' ? channelPagesResult.value : null;
    const channelSourcesReport = channelSourcesResult.status === 'fulfilled' ? channelSourcesResult.value : null;
    const countriesReport = countriesResult.status === 'fulfilled' ? countriesResult.value : null;
    const warnings = [];
    if (landingResult.status === 'rejected') warnings.push(`GA4 landing pages: ${landingResult.reason?.message || landingResult.reason || 'request failed'}`);
    if (channelsResult.status === 'rejected') warnings.push(`GA4 channels: ${channelsResult.reason?.message || channelsResult.reason || 'request failed'}`);
    if (channelPagesResult.status === 'rejected') warnings.push(`GA4 channel landing pages: ${channelPagesResult.reason?.message || channelPagesResult.reason || 'request failed'}`);
    if (channelSourcesResult.status === 'rejected') warnings.push(`GA4 channel sources: ${channelSourcesResult.reason?.message || channelSourcesResult.reason || 'request failed'}`);
    if (countriesResult.status === 'rejected') warnings.push(`GA4 countries: ${countriesResult.reason?.message || countriesResult.reason || 'request failed'}`);
    return {
      property: target,
      conversion_metric: totalsResult.conversionMetric || landingReport?.conversionMetric || channelsReport?.conversionMetric || channelPagesReport?.conversionMetric || channelSourcesReport?.conversionMetric || countriesReport?.conversionMetric || '',
      totals: {
        sessions: Number(totalRow.sessions || 0),
        conversions: Number(totalRow.conversions || 0)
      },
      landing_pages: mapGoogleGa4Rows(landingReport?.report, ['landingPagePlusQueryString']).map((row) => ({
        page: row.dimensions[0] || '(not set)',
        sessions: row.sessions,
        conversions: row.conversions
      })),
      channels: mapGoogleGa4Rows(channelsReport?.report, ['sessionDefaultChannelGroup']).map((row) => ({
        channel: row.dimensions[0] || '(not set)',
        sessions: row.sessions,
        conversions: row.conversions
      })),
      channel_landing_pages: mapGoogleGa4Rows(channelPagesReport?.report, ['sessionDefaultChannelGroup', 'landingPagePlusQueryString']).map((row) => ({
        channel: row.dimensions[0] || '(not set)',
        page: row.dimensions[1] || '(not set)',
        sessions: row.sessions,
        conversions: row.conversions
      })),
      channel_sources: mapGoogleGa4Rows(channelSourcesReport?.report, ['sessionDefaultChannelGroup', 'sessionSourceMedium']).map((row) => ({
        channel: row.dimensions[0] || '(not set)',
        source_medium: row.dimensions[1] || '(not set)',
        sessions: row.sessions,
        conversions: row.conversions
      })),
      countries: mapGoogleGa4Rows(countriesReport?.report, ['country']).map((row) => ({
        country: row.dimensions[0] || '(not set)',
        sessions: row.sessions,
        conversions: row.conversions
      })),
      warnings
    };
  }
  async function handleGoogleAnalyticsReport(request, env) {
    const storage = runtimeStorage(env);
    const current = await currentAgentRequesterContextWithAccount(storage, request, env);
    if (!current?.user && current.apiKeyStatus === 'invalid') return json({ error: 'Invalid API key' }, 401);
    if (!current?.user && current.apiKeyStatus !== 'valid') return json({ error: 'Login or CAIt API key required' }, 401);
    const url = new URL(request.url);
    const gscSite = String(url.searchParams.get('gsc_site') || url.searchParams.get('search_console_site') || '').trim();
    const ga4Property = normalizeGoogleGa4PropertyName(url.searchParams.get('ga4_property') || url.searchParams.get('property') || '');
    if (!gscSite && !ga4Property) {
      return json({ error: 'Select at least one Google source before loading a report.' }, 400);
    }
    const days = clampGoogleReportRange(url.searchParams.get('range') || url.searchParams.get('days') || '28');
    const dateRange = googleReportDateRange(days);
    const account = current.account || null;
    const connector = googleConnectorForAccount(account);
    if ((!connector?.connected || !connector?.accessTokenEnc) && !sessionHasGoogleOauth(current?.session)) {
      return json({
        error: 'Google connection required before CAIt can read GA4 or Search Console reports.',
        missing_connectors: ['google'],
        missing_connector_capabilities: ['google.read_gsc', 'google.read_ga4'],
        action: connectorActionLabel('connect_google')
      }, 409);
    }
    try {
      const tokenInfo = await googleAccessTokenForCurrent(storage, env, current, connector);
      const requestedGroups = [
        gscSite ? 'gsc' : '',
        ga4Property ? 'ga4' : ''
      ].filter(Boolean);
      const missingGroups = missingGoogleScopeGroups(tokenInfo.connector, requestedGroups);
      if (missingGroups.length) {
        return json({
          error: `Google OAuth scope required for ${missingGroups.map(googleScopeGroupLabel).join(' and ')}.`,
          code: 'google_scope_required',
          missing_connectors: ['google'],
          missing_connector_capabilities: googleOAuthCapabilitiesFromGroups(missingGroups),
          missing_google_scope_groups: missingGroups,
          action: connectorActionLabel('connect_google')
        }, 409);
      }
      const [gscResult, ga4Result] = await Promise.allSettled([
        gscSite ? fetchGoogleSearchConsoleReport(tokenInfo.accessToken, gscSite, dateRange) : Promise.resolve(null),
        ga4Property ? fetchGoogleGa4Report(tokenInfo.accessToken, ga4Property, dateRange) : Promise.resolve(null)
      ]);
      const warnings = [];
      if (gscResult.status === 'rejected') warnings.push(googleApiWarning('Search Console report', gscResult.reason));
      if (ga4Result.status === 'rejected') warnings.push(googleApiWarning('GA4 Data report', ga4Result.reason));
      if (ga4Result.status === 'fulfilled' && Array.isArray(ga4Result.value?.warnings)) warnings.push(...ga4Result.value.warnings);
      if (current?.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
      return json({
        ok: true,
        requested: {
          range_days: days,
          start_date: dateRange.startDate,
          end_date: dateRange.endDate,
          gsc_site: gscSite,
          ga4_property: ga4Property
        },
        google: {
          connected: true,
          token_expires_at: String(tokenInfo.connector?.tokenExpiresAt || ''),
          refreshed: tokenInfo.refreshed
        },
        search_console: gscResult.status === 'fulfilled' ? (gscResult.value || null) : null,
        ga4: ga4Result.status === 'fulfilled' ? (ga4Result.value || null) : null,
        warnings
      });
    } catch (error) {
      return json({
        error: error.message || 'Google analytics report fetch failed',
        code: error.code || 'google_analytics_report_failed'
      }, Number(error?.statusCode || 502));
    }
  }
  async function handleGoogleConnectorAssets(request, env) {
    const storage = runtimeStorage(env);
    const current = await currentAgentRequesterContextWithAccount(storage, request, env);
    if (!current?.user && current.apiKeyStatus === 'invalid') return json({ error: 'Invalid API key' }, 401);
    if (!current?.user && current.apiKeyStatus !== 'valid') return json({ error: 'Login or CAIt API key required' }, 401);
    const url = new URL(request.url);
    const requestedGroups = Array.from(new Set(
      url.searchParams
        .getAll('include')
        .flatMap((value) => String(value || '').split(','))
        .map((value) => String(value || '').trim().toLowerCase())
        .filter((value) => ['gsc', 'ga4', 'drive', 'calendar', 'gmail'].includes(value))
    ));
    const includeGroups = requestedGroups.length ? requestedGroups : ['gsc', 'ga4'];
    const requestedCapabilities = Array.from(new Set(includeGroups.flatMap((group) => {
      if (group === 'gsc') return ['google.read_gsc'];
      if (group === 'ga4') return ['google.read_ga4'];
      if (group === 'drive') return ['google.read_drive'];
      if (group === 'calendar') return ['google.read_calendar'];
      if (group === 'gmail') return ['google.read_gmail'];
      return [];
    })));
    const account = current.account || null;
    const connector = googleConnectorForAccount(account);
    if ((!connector?.connected || !connector?.accessTokenEnc) && !sessionHasGoogleOauth(current?.session)) {
      return json({
        error: 'Google connection required before CAIt can read the requested Google sources.',
        missing_connectors: ['google'],
        missing_connector_capabilities: requestedCapabilities,
        action: connectorActionLabel('connect_google')
      }, 409);
    }
    try {
      const tokenInfo = await googleAccessTokenForCurrent(storage, env, current, connector);
      const missingGroups = includeGroups.filter((group) => !googleConnectorHasScopeGroup(tokenInfo.connector, googleScopeGroupForAssetInclude(group)));
      const missingCapabilityGroups = missingGroups.map(googleScopeGroupForAssetInclude);
      const readableGroups = includeGroups.filter((group) => !missingGroups.includes(group));
      const [sitesResult, ga4Result, driveResult, calendarResult, gmailProfileResult, gmailLabelsResult] = await Promise.allSettled([
        readableGroups.includes('gsc')
          ? fetchGoogleAuthorizedJson('https://www.googleapis.com/webmasters/v3/sites', tokenInfo.accessToken)
          : Promise.resolve(null),
        readableGroups.includes('ga4')
          ? fetchGoogleGa4AccountSummaries(tokenInfo.accessToken)
          : Promise.resolve(null),
        readableGroups.includes('drive')
          ? fetchGoogleAuthorizedJson('https://www.googleapis.com/drive/v3/files?pageSize=50&fields=files(id,name,mimeType,webViewLink,modifiedTime)', tokenInfo.accessToken)
          : Promise.resolve(null),
        readableGroups.includes('calendar')
          ? fetchGoogleAuthorizedJson('https://www.googleapis.com/calendar/v3/users/me/calendarList', tokenInfo.accessToken)
          : Promise.resolve(null),
        readableGroups.includes('gmail')
          ? fetchGoogleAuthorizedJson('https://gmail.googleapis.com/gmail/v1/users/me/profile', tokenInfo.accessToken)
          : Promise.resolve(null),
        readableGroups.includes('gmail')
          ? fetchGoogleAuthorizedJson('https://gmail.googleapis.com/gmail/v1/users/me/labels', tokenInfo.accessToken)
          : Promise.resolve(null)
      ]);
      const sites = sitesResult.status === 'fulfilled'
        ? (Array.isArray(sitesResult.value?.siteEntry) ? sitesResult.value.siteEntry : []).map((site) => ({
            siteUrl: String(site?.siteUrl || ''),
            permissionLevel: String(site?.permissionLevel || '')
          }))
        : [];
      const accountSummaries = ga4Result.status === 'fulfilled'
        ? (Array.isArray(ga4Result.value?.accountSummaries) ? ga4Result.value.accountSummaries : []).map((summary) => ({
            name: String(summary?.name || ''),
            displayName: String(summary?.displayName || ''),
            propertySummaries: Array.isArray(summary?.propertySummaries)
              ? summary.propertySummaries.slice(0, 50).map((property) => ({
                  property: String(property?.property || ''),
                  displayName: String(property?.displayName || ''),
                  propertyType: String(property?.propertyType || '')
                }))
              : []
          }))
        : [];
      const driveFiles = driveResult.status === 'fulfilled'
        ? (Array.isArray(driveResult.value?.files) ? driveResult.value.files : []).map((file) => ({
            id: String(file?.id || ''),
            name: String(file?.name || ''),
            mimeType: String(file?.mimeType || ''),
            webViewLink: String(file?.webViewLink || ''),
            modifiedTime: String(file?.modifiedTime || '')
          }))
        : [];
      const calendars = calendarResult.status === 'fulfilled'
        ? (Array.isArray(calendarResult.value?.items) ? calendarResult.value.items : []).map((item) => ({
            id: String(item?.id || ''),
            summary: String(item?.summary || ''),
            primary: item?.primary === true,
            accessRole: String(item?.accessRole || '')
          }))
        : [];
      const gmailProfile = gmailProfileResult.status === 'fulfilled'
        ? {
            emailAddress: String(gmailProfileResult.value?.emailAddress || ''),
            messagesTotal: Number(gmailProfileResult.value?.messagesTotal || 0),
            threadsTotal: Number(gmailProfileResult.value?.threadsTotal || 0)
          }
        : null;
      const gmailLabels = gmailLabelsResult.status === 'fulfilled'
        ? (Array.isArray(gmailLabelsResult.value?.labels) ? gmailLabelsResult.value.labels : []).map((label) => ({
            id: String(label?.id || ''),
            name: String(label?.name || ''),
            type: String(label?.type || '')
          }))
        : [];
      const warnings = [];
      for (const group of missingGroups) {
        warnings.push(`${googleScopeGroupLabel(group)}: OAuth scope is not connected. Use the ${googleScopeGroupLabel(group)} connect button to authorize only this source.`);
      }
      if (includeGroups.includes('gsc') && sitesResult.status === 'rejected') warnings.push(googleApiWarning('Search Console', sitesResult.reason));
      if (includeGroups.includes('ga4') && ga4Result.status === 'rejected') warnings.push(googleApiWarning('GA4 Admin', ga4Result.reason));
      if (includeGroups.includes('drive') && driveResult.status === 'rejected') warnings.push(googleApiWarning('Drive', driveResult.reason));
      if (includeGroups.includes('calendar') && calendarResult.status === 'rejected') warnings.push(googleApiWarning('Calendar', calendarResult.reason));
      if (includeGroups.includes('gmail') && gmailProfileResult.status === 'rejected') warnings.push(googleApiWarning('Gmail profile', gmailProfileResult.reason));
      if (includeGroups.includes('gmail') && gmailLabelsResult.status === 'rejected') warnings.push(googleApiWarning('Gmail labels', gmailLabelsResult.reason));
      if (current?.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
      const payload = {
        ok: true,
        requested: includeGroups,
        google: {
          connected: true,
          scopes: String(tokenInfo.connector?.scopes || ''),
          available_scope_groups: readableGroups,
          missing_scope_groups: missingGroups,
          missing_capabilities: googleOAuthCapabilitiesFromGroups(missingCapabilityGroups),
          token_expires_at: String(tokenInfo.connector?.tokenExpiresAt || ''),
          refreshed: tokenInfo.refreshed,
          api_errors: {
            ...(includeGroups.includes('gsc') && sitesResult.status === 'rejected' ? { search_console: googleApiErrorPayload('Search Console', sitesResult.reason) } : {}),
            ...(includeGroups.includes('ga4') && ga4Result.status === 'rejected' ? { ga4: googleApiErrorPayload('GA4 Admin', ga4Result.reason) } : {})
          }
        },
        warnings
      };
      if (includeGroups.includes('gsc')) payload.search_console = { sites };
      if (includeGroups.includes('ga4')) payload.ga4 = { account_summaries: accountSummaries };
      if (includeGroups.includes('drive')) payload.drive = { files: driveFiles };
      if (includeGroups.includes('calendar')) payload.calendar = { calendars };
      if (includeGroups.includes('gmail')) {
        payload.gmail = {
          profile: gmailProfile,
          labels: gmailLabels
        };
      }
      return json(payload);
    } catch (error) {
      return json({
        error: error.message || 'Google assets fetch failed',
        code: error.code || 'google_assets_failed'
      }, Number(error?.statusCode || 502));
    }
  }
  async function handleGoogleSendGmail(request, env) {
    const storage = runtimeStorage(env);
    const body = await parseBody(request).catch((error) => ({ __error: error.message }));
    if (body.__error) return json({ error: body.__error }, 400);
    if (!hasSendConfirmation(body)) {
      return json({ error: 'Explicit confirmation required before sending email.', required: 'confirm_send=true' }, 428);
    }
    const to = String(body.to || '').trim();
    const subject = String(body.subject || '').trim();
    const text = String(body.text || body.body || '').trim();
    if (!validateEmailAddress(to)) return json({ error: 'Valid recipient email is required.' }, 400);
    if (!subject) return json({ error: 'Email subject is required.' }, 400);
    if (!text) return json({ error: 'Email body is required.' }, 400);
    const state = await storage.getState();
    const current = await currentAgentRequesterContext(storage, request, env);
    if (!current?.user && current.apiKeyStatus === 'invalid') return json({ error: 'Invalid API key' }, 401);
    if (!current?.user && current.apiKeyStatus !== 'valid') return json({ error: 'Login or CAIt API key required' }, 401);
    const account = current.account || accountSettingsForLogin(state, current.login, current.user, current.authProvider);
    const connector = googleConnectorForAccount(account);
    if (!connector?.connected || !connector?.accessTokenEnc) {
      return json({
        error: 'Google connection required before Gmail send.',
        missing_connectors: ['google'],
        missing_connector_capabilities: ['google.send_gmail'],
        action: connectorActionLabel('connect_google')
      }, 409);
    }
    const scopes = connectorScopeSet(connector.scopes);
    const sendReady = scopes.has('https://www.googleapis.com/auth/gmail.send') || scopes.has('https://mail.google.com/');
    if (!sendReady) {
      return json({
        error: 'Google connection must be refreshed with Gmail send scope before CAIt can send email.',
        missing_connectors: ['google'],
        missing_connector_capabilities: ['google.send_gmail'],
        action: connectorActionLabel('connect_google')
      }, 409);
    }
    try {
      const tokenInfo = await googleAccessTokenForConnector(storage, env, current.login, current.user, current.authProvider, connector);
      const sent = await sendGoogleGmailMessage(tokenInfo.accessToken, { to, subject, text });
      await touchEvent(storage, 'GMAIL_SENT', `${current.login} sent Gmail via executor`, {
        login: current.login,
        to,
        subject,
        messageId: String(sent?.id || ''),
        threadId: String(sent?.threadId || ''),
        source: String(body.source || 'web')
      });
      if (current?.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
      return json({
        ok: true,
        id: String(sent?.id || ''),
        thread_id: String(sent?.threadId || ''),
        to,
        subject
      }, 201);
    } catch (error) {
      return json({ error: error.message || 'Gmail send failed' }, Number(error?.statusCode || 502));
    }
  }
  async function handleResendSendEmail(request, env) {
    const storage = runtimeStorage(env);
    const body = await parseBody(request).catch((error) => ({ __error: error.message }));
    if (body.__error) return json({ error: body.__error }, 400);
    if (!hasSendConfirmation(body)) {
      return json({ error: 'Explicit confirmation required before sending email.', required: 'confirm_send=true' }, 428);
    }
    const to = String(body.to || '').trim();
    const from = String(body.from || '').trim();
    const replyTo = String(body.replyTo || body.reply_to || '').trim();
    const subject = String(body.subject || '').trim();
    const text = String(body.text || body.body || '').trim();
    if (!validateEmailAddress(to)) return json({ error: 'Valid recipient email is required.' }, 400);
    if (!validateEmailAddress(from)) return json({ error: 'Valid sender email is required.' }, 400);
    if (replyTo && !validateEmailAddress(replyTo)) return json({ error: 'Reply-to email is invalid.' }, 400);
    if (!subject) return json({ error: 'Email subject is required.' }, 400);
    if (!text) return json({ error: 'Email body is required.' }, 400);
    const current = await currentAgentRequesterContext(storage, request, env);
    if (!current?.user && current.apiKeyStatus === 'invalid') return json({ error: 'Invalid API key' }, 401);
    if (!current?.user && current.apiKeyStatus !== 'valid') return json({ error: 'Login or CAIt API key required' }, 401);
    if (!canUsePlatformResend(current, env)) {
      return json({ error: 'CAIt Resend send is restricted to the platform admin account.' }, 403);
    }
    if (!resendConfigured(env)) {
      return json({ error: 'CAIt Resend is not configured.' }, 503);
    }
    const baseDelivery = {
      id: crypto.randomUUID(),
      accountLogin: String(current.login || '').trim().toLowerCase(),
      recipientEmail: to,
      senderEmail: from,
      subject,
      template: 'manual_executor_v1',
      provider: 'resend',
      status: 'queued',
      providerMessageId: '',
      payload: {
        from,
        replyTo: replyTo || '',
        to,
        subject,
        text,
        source: String(body.source || 'web')
      },
      response: {},
      errorText: '',
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    try {
      const sent = await sendResendEmail(env, {
        from,
        replyTo: replyTo || undefined,
        to,
        subject,
        text
      });
      const delivery = {
        ...baseDelivery,
        status: 'sent',
        providerMessageId: String(sent?.id || ''),
        response: sent,
        updatedAt: nowIso()
      };
      await appendEmailDelivery(storage, delivery);
      await touchEvent(storage, 'EMAIL', `${current.login} sent Resend via executor`, {
        login: current.login,
        to,
        from,
        subject,
        provider: 'resend',
        providerMessageId: delivery.providerMessageId,
        source: String(body.source || 'web')
      });
      if (current?.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
      return json({
        ok: true,
        id: delivery.providerMessageId,
        to,
        from,
        subject,
        provider: 'resend'
      }, 201);
    } catch (error) {
      const failed = {
        ...baseDelivery,
        status: 'failed',
        response: error?.payload || {},
        errorText: String(error?.message || error || 'Resend send failed').slice(0, 500),
        updatedAt: nowIso()
      };
      await appendEmailDelivery(storage, failed);
      await touchEvent(storage, 'FAILED', `${current.login} Resend send failed`, {
        login: current.login,
        to,
        from,
        subject,
        provider: 'resend',
        error: failed.errorText,
        source: String(body.source || 'web')
      });
      return json({ error: failed.errorText }, Number(error?.statusCode || 502));
    }
  }
  function exactConnectorActionFromRecurringOrder(order = {}) {
    const broker = order?.input?._broker;
    if (!broker || typeof broker !== 'object') return null;
    const action = broker.exactConnectorAction || broker.exact_connector_action;
    return action && typeof action === 'object' ? action : null;
  }
  function recurringConnectorError(message, code = 'connector_required', statusCode = 409) {
    return {
      error: String(message || 'Scheduled connector action could not run.'),
      code,
      statusCode
    };
  }
  async function publishInstagramPhotoByApi(action = {}) {
    const accessToken = String(action.accessToken || action.access_token || '').trim();
    const instagramUserId = String(action.instagramUserId || action.instagram_user_id || '').trim();
    const mediaUrl = String(action.mediaUrl || action.media_url || '').trim();
    const caption = String(action.caption || '').trim();
    const graphBase = String(action.graphBaseUrl || action.graph_base_url || 'https://graph.instagram.com').trim().replace(/\/+$/g, '');
    const graphVersion = String(action.graphVersion || action.graph_version || 'v24.0').trim().replace(/^\/+|\/+$/g, '');
    if (!accessToken) throw Object.assign(new Error('Instagram access token is required.'), { statusCode: 400 });
    if (!instagramUserId) throw Object.assign(new Error('Instagram user ID is required.'), { statusCode: 400 });
    if (!mediaUrl) throw Object.assign(new Error('Instagram media URL is required.'), { statusCode: 400 });
    const base = `${graphBase}/${graphVersion}`;
    const createBody = new URLSearchParams({
      image_url: mediaUrl,
      caption,
      access_token: accessToken
    });
    const createResponse = await fetch(`${base}/${encodeURIComponent(instagramUserId)}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: createBody.toString()
    });
    const created = await createResponse.json().catch(() => ({}));
    if (!createResponse.ok || !created?.id) {
      const error = created?.error?.message || created?.message || 'Instagram media container creation failed';
      throw Object.assign(new Error(String(error)), { statusCode: createResponse.status || 502, payload: created });
    }
    const creationId = String(created.id || '');
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const statusResponse = await fetch(`${base}/${encodeURIComponent(creationId)}?fields=status_code&access_token=${encodeURIComponent(accessToken)}`);
      const statusPayload = await statusResponse.json().catch(() => ({}));
      const statusCode = String(statusPayload?.status_code || '').toUpperCase();
      if (!statusResponse.ok) break;
      if (!statusCode || statusCode === 'FINISHED' || statusCode === 'PUBLISHED') break;
      if (statusCode === 'ERROR' || statusCode === 'EXPIRED') {
        throw Object.assign(new Error(`Instagram media processing failed: ${statusCode}`), { statusCode: 502, payload: statusPayload });
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    const publishBody = new URLSearchParams({
      creation_id: creationId,
      access_token: accessToken
    });
    const publishResponse = await fetch(`${base}/${encodeURIComponent(instagramUserId)}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: publishBody.toString()
    });
    const published = await publishResponse.json().catch(() => ({}));
    if (!publishResponse.ok || !published?.id) {
      const error = published?.error?.message || published?.message || 'Instagram publish failed';
      throw Object.assign(new Error(String(error)), { statusCode: publishResponse.status || 502, payload: published });
    }
    return {
      creationId,
      mediaId: String(published.id || '')
    };
  }
  async function executeScheduledExactConnectorAction(storage, env, order = {}, current = {}) {
    const action = exactConnectorActionFromRecurringOrder(order);
    if (!action) return null;
    const kind = String(action.kind || action.type || '').trim().toLowerCase();
    const account = current.account || {};
    if (kind === 'x_post') {
      const validation = validateXPostText(action.text || action.postText || action.post_text || '');
      if (!validation.ok) return recurringConnectorError(validation.error, 'connector_required', 400);
      const connector = account?.connectors?.x || null;
      if (!connector?.connected || !connector?.accessTokenEnc) {
        return recurringConnectorError('X connection required before the scheduled post can run.');
      }
      const approval = validateXPostExecutionApproval(connector, {
        ...action,
        text: validation.text
      });
      if (!approval.ok) {
        return recurringConnectorError(approval.error, approval.code || 'confirmation_required', approval.statusCode || 428);
      }
      try {
        const posted = await postXTweet(env, connector, {
          text: validation.text,
          replyToTweetId: action.replyToTweetId || action.reply_to_tweet_id || ''
        });
        await storage.mutate(async (draft) => {
          const latest = accountSettingsForLogin(draft, current.login, current.user, current.authProvider);
          upsertAccountSettingsInState(draft, current.login, current.user, current.authProvider, {
            connectors: {
              ...(latest.connectors || {}),
              x: posted.connector
            }
          });
        });
        await touchEvent(storage, 'X_POSTED', `${current.login} posted to X from scheduled action`, {
          login: current.login,
          tweetId: posted.tweetId,
          url: posted.url,
          recurringOrderId: String(order.id || ''),
          source: 'scheduled_exact_action'
        });
        return {
          ok: true,
          mode: 'connector_action',
          status: 'posted',
          connector_action: 'x_post',
          connector_action_id: String(posted.tweetId || ''),
          url: posted.url || '',
          account_handle: approval.account?.handle || '',
          account_id: approval.account?.userId || ''
        };
      } catch (error) {
        return recurringConnectorError(error.message || 'Scheduled X post failed', 'connector_required', Number(error?.statusCode || 502));
      }
    }
    if (kind === 'gmail_send') {
      const to = String(action.to || '').trim();
      const subject = String(action.subject || '').trim();
      const text = String(action.text || action.body || '').trim();
      if (!validateEmailAddress(to) || !subject || !text) {
        return recurringConnectorError('Scheduled Gmail send requires recipient, subject, and body.', 'connector_required', 400);
      }
      const connector = googleConnectorForAccount(account);
      if (!connector?.connected || !connector?.accessTokenEnc) {
        return recurringConnectorError('Google connection required before the scheduled Gmail send can run.');
      }
      const scopes = connectorScopeSet(connector.scopes);
      if (!(scopes.has('https://www.googleapis.com/auth/gmail.send') || scopes.has('https://mail.google.com/'))) {
        return recurringConnectorError('Google must be reconnected with Gmail send scope before the scheduled Gmail send can run.');
      }
      try {
        const tokenInfo = await googleAccessTokenForConnector(storage, env, current.login, current.user, current.authProvider, connector);
        const sent = await sendGoogleGmailMessage(tokenInfo.accessToken, { to, subject, text });
        await touchEvent(storage, 'GMAIL_SENT', `${current.login} sent Gmail from scheduled action`, {
          login: current.login,
          to,
          subject,
          messageId: String(sent?.id || ''),
          threadId: String(sent?.threadId || ''),
          recurringOrderId: String(order.id || ''),
          source: 'scheduled_exact_action'
        });
        return {
          ok: true,
          mode: 'connector_action',
          status: 'sent',
          connector_action: 'gmail_send',
          connector_action_id: String(sent?.id || ''),
          thread_id: String(sent?.threadId || '')
        };
      } catch (error) {
        return recurringConnectorError(error.message || 'Scheduled Gmail send failed', 'connector_required', Number(error?.statusCode || 502));
      }
    }
    if (kind === 'resend_send') {
      const to = String(action.to || '').trim();
      const from = String(action.from || '').trim();
      const replyTo = String(action.replyTo || action.reply_to || '').trim();
      const subject = String(action.subject || '').trim();
      const text = String(action.text || action.body || '').trim();
      if (!validateEmailAddress(to) || !validateEmailAddress(from) || !subject || !text) {
        return recurringConnectorError('Scheduled Resend send requires valid to/from, subject, and body.', 'connector_required', 400);
      }
      if (replyTo && !validateEmailAddress(replyTo)) {
        return recurringConnectorError('Scheduled Resend reply-to email is invalid.', 'connector_required', 400);
      }
      if (!canUsePlatformResend(current, env)) {
        return recurringConnectorError('CAIt Resend scheduled sends are restricted to the platform admin account.', 'agent_restricted', 403);
      }
      if (!resendConfigured(env)) {
        return recurringConnectorError('CAIt Resend is not configured.', 'connector_required', 503);
      }
      const baseDelivery = {
        id: crypto.randomUUID(),
        accountLogin: String(current.login || '').trim().toLowerCase(),
        recipientEmail: to,
        senderEmail: from,
        subject,
        template: 'scheduled_executor_v1',
        provider: 'resend',
        status: 'queued',
        providerMessageId: '',
        payload: {
          from,
          replyTo: replyTo || '',
          to,
          subject,
          text,
          source: 'scheduled_exact_action',
          recurringOrderId: String(order.id || '')
        },
        response: {},
        errorText: '',
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      try {
        const sent = await sendResendEmail(env, {
          from,
          replyTo: replyTo || undefined,
          to,
          subject,
          text
        });
        await appendEmailDelivery(storage, {
          ...baseDelivery,
          status: 'sent',
          providerMessageId: String(sent?.id || ''),
          response: sent,
          updatedAt: nowIso()
        });
        await touchEvent(storage, 'EMAIL', `${current.login} sent Resend from scheduled action`, {
          login: current.login,
          to,
          from,
          subject,
          provider: 'resend',
          providerMessageId: String(sent?.id || ''),
          recurringOrderId: String(order.id || ''),
          source: 'scheduled_exact_action'
        });
        return {
          ok: true,
          mode: 'connector_action',
          status: 'sent',
          connector_action: 'resend_send',
          connector_action_id: String(sent?.id || '')
        };
      } catch (error) {
        await appendEmailDelivery(storage, {
          ...baseDelivery,
          status: 'failed',
          response: error?.payload || {},
          errorText: String(error?.message || error || 'Resend send failed').slice(0, 500),
          updatedAt: nowIso()
        });
        return recurringConnectorError(error.message || 'Scheduled Resend send failed', 'connector_required', Number(error?.statusCode || 502));
      }
    }
    if (kind === 'instagram_post') {
      try {
        const published = await publishInstagramPhotoByApi(action);
        await touchEvent(storage, 'INSTAGRAM_POSTED', `${current.login} published Instagram from scheduled action`, {
          login: current.login,
          mediaId: published.mediaId,
          creationId: published.creationId,
          recurringOrderId: String(order.id || ''),
          source: 'scheduled_exact_action'
        });
        return {
          ok: true,
          mode: 'connector_action',
          status: 'posted',
          connector_action: 'instagram_post',
          connector_action_id: String(published.mediaId || '')
        };
      } catch (error) {
        return recurringConnectorError(error.message || 'Scheduled Instagram publish failed', 'connector_required', Number(error?.statusCode || 502));
      }
    }
    return recurringConnectorError('Unsupported scheduled connector action.', 'connector_required', 400);
  }
  async function handleInstagramConnectorPost(request, env) {
    const storage = runtimeStorage(env);
    const body = await parseBody(request).catch((error) => ({ __error: error.message }));
    if (body.__error) return json({ error: body.__error }, 400);
    if (!hasPostConfirmation(body)) {
      return json({
        error: 'Explicit confirmation required before posting to Instagram.',
        required: 'confirm_post=true'
      }, 428);
    }
    const current = await currentAgentRequesterContext(storage, request, env);
    if (!current?.user && current.apiKeyStatus === 'invalid') return json({ error: 'Invalid API key' }, 401);
    if (!current?.user && current.apiKeyStatus !== 'valid') return json({ error: 'Login or CAIt API key required' }, 401);
    try {
      const published = await publishInstagramPhotoByApi(body);
      await touchEvent(storage, 'INSTAGRAM_POSTED', `${current.login} published Instagram via executor`, {
        login: current.login,
        mediaId: published.mediaId,
        creationId: published.creationId,
        source: String(body.source || 'web')
      });
      if (current?.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
      return json({
        ok: true,
        media_id: published.mediaId,
        creation_id: published.creationId
      }, 201);
    } catch (error) {
      return json({ error: error.message || 'Instagram publish failed' }, Number(error?.statusCode || 502));
    }
  }
  async function handleLogout(env) {
    return jsonWithCookies({ ok: true, redirect_to: '/' }, 200, [clearCookie(sessionCookieName), clearCookie(oauthStateCookieName)]);
  }
  async function handleGithubRepos(request, env) {
    const storage = runtimeStorage(env);
    const current = await currentAgentRequesterContext(storage, request, env);
    if (!current.user && current.apiKeyStatus === 'invalid') return json({ error: 'Invalid API key' }, 401);
    if (!current.user && current.apiKeyStatus !== 'valid') return json({ error: 'Login or CAIt API key required' }, 401);
    const session = current.session;
    try {
      if (sessionHasGithubApp(session)) {
        const repos = await githubAppReposForSession(session);
        await persistGithubAppAccess(storage, current.login, session, repos);
        return json({
          auth_provider: 'github-app',
          access_mode: 'installation-selected',
          repos
        });
      }
      if (current.apiKeyStatus === 'valid') {
        if (current.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
        const repos = current.account?.githubAppAccess?.repos || [];
        return json({
          auth_provider: 'github-app',
          access_mode: 'account-stored-installations',
          repos,
          requires_session_refresh: !repos.length
        });
      }
      if (!sessionHasGithubOauth(session)) return json({ error: 'GitHub connection required' }, 403);
      const allowPrivateRepos = githubSessionCanReadPrivateRepos(session, env);
      const repos = allowPrivateRepos
        ? await fetchAllGithubRepos(session.githubAccessToken)
        : await fetchGithubPublicRepos(session.githubIdentity?.login || session.user?.login || '', session.githubAccessToken);
      return json({
        auth_provider: 'github-oauth',
        access_mode: allowPrivateRepos ? 'private-enabled' : 'public-only',
          repos: repos.map((repo) => ({
            id: repo.id,
            name: repo.name,
            fullName: repo.full_name,
            description: repo.description,
            homepage: repo.homepage || '',
            private: repo.private,
          defaultBranch: repo.default_branch,
          htmlUrl: repo.html_url,
          owner: repo.owner?.login
        }))
      });
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }
  async function handleGithubLoadManifest(storage, request, env) {
    const current = await currentAgentRequesterContext(storage, request, env);
    if (!current.user && current.apiKeyStatus === 'invalid') return json({ error: 'Invalid API key' }, 401);
    if (!current.user && current.apiKeyStatus !== 'valid') return json({ error: 'Login or CAIt API key required' }, 401);
    const providerMoneyReadiness = await providerMoneyReadinessForCurrent(storage, current);
    const session = current.session;
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
    if (!body.owner || !body.repo) return json({ error: 'owner and repo required' }, 400);
    try {
      if (sessionHasGithubApp(session) || current.apiKeyStatus === 'valid') {
        const repoAccess = await githubAppRepoTokenForRequester(current, body.owner, body.repo, body.installation_id || '', env);
        if (repoAccess.error) return json({ error: repoAccess.error, use: repoAccess.use, next_step: repoAccess.next_step }, repoAccess.statusCode || 403);
        const { selectedRepo, installationToken } = repoAccess;
        const repoMetaResult = await fetchGithubRepoMeta(body.owner, body.repo, installationToken);
        if (!repoMetaResult.ok) return json({ error: repoMetaResult.error }, repoMetaResult.status === 404 ? 404 : 400);
        const repoMeta = repoMetaResult.repo;
        const attempts = [];
        let manifest = null;
        let selectedCandidate = null;
        for (const candidatePath of MANIFEST_CANDIDATE_PATHS) {
          const loaded = await fetchGithubManifestCandidate(installationToken, body.owner, body.repo, repoMeta.default_branch, candidatePath);
          if (!loaded.ok) {
            attempts.push({ path: candidatePath, status: loaded.status, error: loaded.error || null });
            continue;
          }
          try {
            manifest = parseAndValidateManifest(loaded.text, {
              contentType: loaded.contentType,
              sourceUrl: loaded.manifestUrl
            });
            selectedCandidate = loaded;
            attempts.push({ path: candidatePath, status: 200, parsed: true });
            break;
          } catch (error) {
            attempts.push({ path: candidatePath, status: 422, error: error.message });
          }
        }
        if (!manifest || !selectedCandidate) {
          return json({
            error: 'No valid manifest found in candidate files',
            candidate_paths: MANIFEST_CANDIDATE_PATHS.filter((path) => path.endsWith('.json')),
            attempts
          }, 404);
        }
        const safety = assessAgentRegistrationSafety(manifest, agentSafetyOptionsForRequest(request, env));
        if (!safety.ok) return agentSafetyErrorResponse(safety);
        const ownerInfo = await ownerInfoFromRequest(request, env, current);
        const agent = createAgentFromManifest(manifest, ownerInfo, {
          manifestUrl: selectedCandidate.manifestUrl,
          manifestSource: `github-app:${repoMeta.full_name}:${selectedCandidate.candidatePath}`,
          verificationStatus: 'manifest_loaded',
          importMode: 'github-app-installation'
        });
        const review = await runAgentReviewForRequest(agent, request, env, { source: 'github-app-manifest', safety });
        applyAgentReviewToAgentRecord(agent, review);
        await storage.mutate(async (state) => { state.agents.unshift(agent); });
        await touchEvent(storage, 'REGISTERED', `${agent.name} manifest loaded from ${repoMeta.full_name}/${selectedCandidate.candidatePath} via GitHub App`);
        if (current.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
        return json({
          ok: true,
          auth_provider: 'github-app',
          access_mode: current.apiKeyStatus === 'valid' ? 'account-stored-installation' : 'installation-selected',
          agent,
          repo: { fullName: repoMeta.full_name, private: repoMeta.private },
          installation_id: selectedRepo.installationId,
          manifest_url: selectedCandidate.manifestUrl,
          candidate_path: selectedCandidate.candidatePath,
          candidate_paths_checked: MANIFEST_CANDIDATE_PATHS.filter((path) => path.endsWith('.json')),
          attempts,
          safety,
          review,
          provider_money_readiness: providerMoneyReadiness
        }, 201);
      }
      if (!sessionHasGithubOauth(session)) return json({ error: 'GitHub connection required' }, 403);
      const allowPrivateRepos = githubSessionCanReadPrivateRepos(session, env);
      const repoMetaResult = await fetchGithubRepoMeta(body.owner, body.repo, allowPrivateRepos ? session.githubAccessToken : '');
      if (!repoMetaResult.ok) {
        const suffix = allowPrivateRepos ? '' : ' Safe OAuth mode only supports public repositories.';
        return json({ error: `${repoMetaResult.error}.${suffix}`.trim() }, repoMetaResult.status === 404 ? 404 : 400);
      }
      const repoMeta = repoMetaResult.repo;
      if (repoMeta.private && !allowPrivateRepos) {
        return json({
          error: 'Private repo import is disabled in safe OAuth mode. Keep the manifest in a public repository or switch this integration to a GitHub App for fine-grained private access.'
        }, 403);
      }
      const attempts = [];
      let manifest = null;
      let selectedCandidate = null;
      for (const candidatePath of MANIFEST_CANDIDATE_PATHS) {
        const loaded = await fetchGithubManifestCandidate(
          repoMeta.private && allowPrivateRepos ? session.githubAccessToken : '',
          body.owner,
          body.repo,
          repoMeta.default_branch,
          candidatePath
        );
        if (!loaded.ok) {
          attempts.push({ path: candidatePath, status: loaded.status, error: loaded.error || null });
          continue;
        }
        try {
          manifest = parseAndValidateManifest(loaded.text, {
            contentType: loaded.contentType,
            sourceUrl: loaded.manifestUrl
          });
          selectedCandidate = loaded;
          attempts.push({ path: candidatePath, status: 200, parsed: true });
          break;
        } catch (error) {
          attempts.push({ path: candidatePath, status: 422, error: error.message });
        }
      }
      if (!manifest || !selectedCandidate) {
        return json({
          error: 'No valid manifest found in candidate files',
          candidate_paths: MANIFEST_CANDIDATE_PATHS.filter((path) => path.endsWith('.json')),
          attempts
        }, 404);
      }
      const safety = assessAgentRegistrationSafety(manifest, agentSafetyOptionsForRequest(request, env));
      if (!safety.ok) return agentSafetyErrorResponse(safety);
      const ownerInfo = await ownerInfoFromRequest(request, env, current);
      const agent = createAgentFromManifest(manifest, ownerInfo, {
        manifestUrl: selectedCandidate.manifestUrl,
        manifestSource: `github:${repoMeta.full_name}:${selectedCandidate.candidatePath}`,
        verificationStatus: 'manifest_loaded',
        importMode: 'github-manifest-candidate'
      });
      const review = await runAgentReviewForRequest(agent, request, env, { source: 'github-manifest', safety });
      applyAgentReviewToAgentRecord(agent, review);
      await storage.mutate(async (state) => { state.agents.unshift(agent); });
      await touchEvent(storage, 'REGISTERED', `${agent.name} manifest loaded from ${repoMeta.full_name}/${selectedCandidate.candidatePath}`);
      return json({
        ok: true,
        agent,
        repo: { fullName: repoMeta.full_name, private: repoMeta.private },
        access_mode: repoMeta.private ? 'private-enabled' : 'public-only',
        manifest_url: selectedCandidate.manifestUrl,
        candidate_path: selectedCandidate.candidatePath,
        candidate_paths_checked: MANIFEST_CANDIDATE_PATHS.filter((path) => path.endsWith('.json')),
        attempts,
        safety,
        review,
        provider_money_readiness: providerMoneyReadiness
      }, 201);
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }
  async function handleGithubGenerateManifest(request, env) {
    const storage = runtimeStorage(env);
    const current = await currentAgentRequesterContext(storage, request, env);
    if (!current.user && current.apiKeyStatus === 'invalid') return json({ error: 'Invalid API key' }, 401);
    if (!current.user && current.apiKeyStatus !== 'valid') return json({ error: 'Login or CAIt API key required' }, 401);
    const session = current.session;
    const preferLocalEndpoints = ['localhost', '127.0.0.1'].includes(new URL(request.url).hostname);
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
    if (!body.owner || !body.repo) return json({ error: 'owner and repo required' }, 400);
    try {
      if (sessionHasGithubApp(session) || current.apiKeyStatus === 'valid') {
        const repoAccess = await githubAppRepoTokenForRequester(current, body.owner, body.repo, body.installation_id || '', env);
        if (repoAccess.error) return json({ error: repoAccess.error, use: repoAccess.use, next_step: repoAccess.next_step }, repoAccess.statusCode || 403);
        const { selectedRepo, installationToken } = repoAccess;
        const repoMetaResult = await fetchGithubRepoMeta(body.owner, body.repo, installationToken);
        if (!repoMetaResult.ok) return json({ error: repoMetaResult.error }, repoMetaResult.status === 404 ? 404 : 400);
        const repoMeta = repoMetaResult.repo;
        const treeLoad = await fetchGithubRepoTree(installationToken, body.owner, body.repo, repoMeta.default_branch);
        const signalLoad = await loadGithubManifestDraftSignals(
          installationToken,
          body.owner,
          body.repo,
          repoMeta.default_branch,
          treeLoad.ok ? treeLoad.paths : []
        );
        const draft = await buildDraftManifestFromRepoAnalysisWithAi({
          repoMeta,
          files: signalLoad.files,
          repoTreePaths: treeLoad.ok ? treeLoad.paths : [],
          ownerLogin: current.githubIdentity?.login || current.user?.login || current.login || '',
          preferLocalEndpoints
        }, {
          env,
          fetchImpl: fetch
        });
        if (current.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
        return json({
          ok: true,
          auth_provider: 'github-app',
          access_mode: current.apiKeyStatus === 'valid' ? 'account-stored-installation' : 'installation-selected',
          repo: { fullName: repoMeta.full_name, private: repoMeta.private },
          installation_id: selectedRepo.installationId,
          draft_manifest: draft.draftManifest,
          source_files: draft.analysis.loadedFiles,
          missing_files: draft.analysis.missingFiles,
          runtime_hints: draft.analysis.runtimeHints,
          task_type_scores: draft.analysis.scoredTaskTypes,
          manifest_intelligence: draft.analysis.ai || null,
          endpoint_hints: {
            absolute_health_urls: draft.analysis.absoluteHealthUrls,
            absolute_job_urls: draft.analysis.absoluteJobUrls,
            relative_health_paths: draft.analysis.relativeHealthHints,
            relative_job_paths: draft.analysis.relativeJobHints
          },
          warnings: draft.analysis.warnings,
          signal_attempts: signalLoad.attempts,
          next_step: 'Review the generated JSON, add deployed endpoint URLs if needed, then import the JSON manifest.'
        });
      }
      if (!sessionHasGithubOauth(session)) return json({ error: 'GitHub connection required' }, 403);
      const allowPrivateRepos = githubSessionCanReadPrivateRepos(session, env);
      const repoMetaResult = await fetchGithubRepoMeta(body.owner, body.repo, allowPrivateRepos ? session.githubAccessToken : '');
      if (!repoMetaResult.ok) {
        const suffix = allowPrivateRepos ? '' : ' Safe OAuth mode only supports public repositories.';
        return json({ error: `${repoMetaResult.error}.${suffix}`.trim() }, repoMetaResult.status === 404 ? 404 : 400);
      }
      const repoMeta = repoMetaResult.repo;
      if (repoMeta.private && !allowPrivateRepos) {
        return json({
          error: 'Private repo draft generation is disabled in safe OAuth mode. Keep the repo public or use a GitHub App for fine-grained private access.'
        }, 403);
      }
      const treeLoad = await fetchGithubRepoTree(
        repoMeta.private && allowPrivateRepos ? session.githubAccessToken : '',
        body.owner,
        body.repo,
        repoMeta.default_branch
      );
      const signalLoad = await loadGithubManifestDraftSignals(
        repoMeta.private && allowPrivateRepos ? session.githubAccessToken : '',
        body.owner,
        body.repo,
        repoMeta.default_branch,
        treeLoad.ok ? treeLoad.paths : []
      );
        const draft = await buildDraftManifestFromRepoAnalysisWithAi({
          repoMeta,
          files: signalLoad.files,
          repoTreePaths: treeLoad.ok ? treeLoad.paths : [],
          ownerLogin: current.githubIdentity?.login || current.user?.login || current.login || '',
          preferLocalEndpoints
        }, {
          env,
          fetchImpl: fetch
        });
      return json({
        ok: true,
        auth_provider: 'github-oauth',
        access_mode: repoMeta.private ? 'private-enabled' : 'public-only',
        repo: { fullName: repoMeta.full_name, private: repoMeta.private },
        draft_manifest: draft.draftManifest,
        source_files: draft.analysis.loadedFiles,
        missing_files: draft.analysis.missingFiles,
        runtime_hints: draft.analysis.runtimeHints,
        task_type_scores: draft.analysis.scoredTaskTypes,
        manifest_intelligence: draft.analysis.ai || null,
        endpoint_hints: {
          absolute_health_urls: draft.analysis.absoluteHealthUrls,
          absolute_job_urls: draft.analysis.absoluteJobUrls,
          relative_health_paths: draft.analysis.relativeHealthHints,
          relative_job_paths: draft.analysis.relativeJobHints
        },
        warnings: draft.analysis.warnings,
        signal_attempts: signalLoad.attempts,
        next_step: 'Review the generated JSON, add deployed endpoint URLs if needed, then import the JSON manifest.'
      });
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  async function handleGithubCreateExecutorPr(storage, request, env) {
    const current = await currentAgentRequesterContext(storage, request, env);
    if (!current.user && current.apiKeyStatus === 'invalid') return json({ error: 'Invalid API key' }, 401);
    if (!current.user && current.apiKeyStatus !== 'valid') return json({ error: 'Login or CAIt API key required' }, 401);
    if (!sessionHasGithubApp(current.session) && current.apiKeyStatus !== 'valid') {
      return json({
        error: 'GitHub App login required to create executor PRs.',
        use: '/auth/github'
      }, 403);
    }
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
    if (!body.owner || !body.repo) return json({ error: 'owner and repo required' }, 400);
    if (!String(body.content || '').trim()) return json({ error: 'content required' }, 400);
    if (current.apiKeyStatus === 'valid' && !hasRepoWriteConfirmation(body)) {
      return json({
        error: 'Repository write confirmation required for CAIT_API_KEY executor PR creation.',
        required: 'Set confirm_repo_write=true after showing the target repository, branch, files, and PR action to the user.',
        repo: `${body.owner}/${body.repo}`,
        use: '/chat.html'
      }, 409);
    }
    try {
      const repoAccess = await githubAppRepoTokenForRequester(current, body.owner, body.repo, body.installation_id || '', env);
      if (repoAccess.error) return json({ error: repoAccess.error, use: repoAccess.use, next_step: repoAccess.next_step }, repoAccess.statusCode || 403);
      const { selectedRepo, installationToken } = repoAccess;
      const repoMetaResult = await fetchGithubRepoMeta(body.owner, body.repo, installationToken);
      if (!repoMetaResult.ok) return json({ error: repoMetaResult.error }, repoMetaResult.status === 404 ? 404 : 400);
      const repoMeta = repoMetaResult.repo;
      const plan = githubExecutorPlanFromRequest(body, repoMeta);
      const baseSha = await fetchGithubBranchSha(installationToken, body.owner, body.repo, repoMeta.default_branch);
      if (!baseSha.ok || !baseSha.sha) {
        return json({ error: baseSha.error || `Could not resolve ${repoMeta.default_branch}` }, 400);
      }
      const branchCreated = await createGithubBranch(installationToken, body.owner, body.repo, plan.branchName, baseSha.sha);
      if (!branchCreated.ok) {
        return json(githubPermissionError(branchCreated, 'Could not create executor branch'), branchCreated.status === 422 ? 409 : 400);
      }
      const existing = await fetchGithubTextFile(installationToken, body.owner, body.repo, plan.filePath, repoMeta.default_branch);
      if (existing.ok && existing.text && !existing.text.includes(GITHUB_EXECUTOR_MARKER) && !existing.text.includes(GITHUB_ADAPTER_MARKER)) {
        return json({
          error: `Refusing to overwrite existing non-AIagent2 file at ${plan.filePath}.`,
          path: plan.filePath,
          branch: plan.branchName
        }, 409);
      }
      const write = await upsertGithubTextFile(installationToken, body.owner, body.repo, {
        path: plan.filePath,
        branch: plan.branchName,
        content: plan.fileContent,
        sha: existing.ok ? existing.sha : '',
        message: existing.ok ? `Update ${PRODUCT_SHORT_NAME} executor handoff: ${plan.filePath}` : `Add ${PRODUCT_SHORT_NAME} executor handoff: ${plan.filePath}`
      });
      if (!write.ok) {
        return json(githubPermissionError(write, `Could not write ${plan.filePath}`), write.status === 422 ? 409 : 400);
      }
      const pull = await createGithubPullRequest(installationToken, body.owner, body.repo, {
        title: plan.prTitle,
        body: plan.prBody,
        head: plan.branchName,
        base: repoMeta.default_branch
      });
      if (!pull.ok) {
        return json(githubPermissionError(pull, 'Could not create executor pull request'), pull.status === 422 ? 409 : 400);
      }
      await touchEvent(storage, 'UPDATED', `Executor PR created for ${repoMeta.full_name}: ${pull.pullRequest.htmlUrl}`, {
        repo: repoMeta.full_name,
        branch: plan.branchName,
        pr: pull.pullRequest.htmlUrl,
        kind: plan.kind
      });
      if (current.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
      return json({
        ok: true,
        auth_provider: 'github-app',
        access_mode: current.apiKeyStatus === 'valid' ? 'account-stored-installation' : 'installation-selected',
        repo: { fullName: repoMeta.full_name, private: repoMeta.private },
        installation_id: selectedRepo.installationId,
        executor_kind: plan.kind,
        branch: plan.branchName,
        base_branch: repoMeta.default_branch,
        files: [{ path: plan.filePath, commit_sha: write.commitSha }],
        pull_request: pull.pullRequest,
        next_step: 'Review the PR handoff file in GitHub, then continue implementation in the repository workflow.'
      }, 201);
    } catch (error) {
      return json(githubPermissionError(error), 500);
    }
  }
  async function handleGithubCreateAdapterPr(storage, request, env) {
    const current = await currentAgentRequesterContext(storage, request, env);
    if (!current.user && current.apiKeyStatus === 'invalid') return json({ error: 'Invalid API key' }, 401);
    if (!current.user && current.apiKeyStatus !== 'valid') return json({ error: 'Login or CAIt API key required' }, 401);
    if (!sessionHasGithubApp(current.session) && current.apiKeyStatus !== 'valid') {
      return json({
        error: 'GitHub App login required to create adapter PRs.',
        use: '/auth/github'
      }, 403);
    }
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
    if (!body.owner || !body.repo) return json({ error: 'owner and repo required' }, 400);
    if (current.apiKeyStatus === 'valid' && !hasAdapterPrConfirmation(body) && !hasRepoWriteConfirmation(body)) {
      return json({
        error: 'Repository write confirmation required for CAIT_API_KEY adapter PR creation.',
        required: 'Set confirm_adapter_pr=true after showing the target repository, branch, files, and PR action to the user.',
        repo: `${body.owner}/${body.repo}`,
        use: '/agents.html'
      }, 409);
    }
    try {
      const repoAccess = await githubAppRepoTokenForRequester(current, body.owner, body.repo, body.installation_id || '', env);
      if (repoAccess.error) return json({ error: repoAccess.error, use: repoAccess.use, next_step: repoAccess.next_step }, repoAccess.statusCode || 403);
      const { selectedRepo, installationToken } = repoAccess;
      const repoMetaResult = await fetchGithubRepoMeta(body.owner, body.repo, installationToken);
      if (!repoMetaResult.ok) return json({ error: repoMetaResult.error }, repoMetaResult.status === 404 ? 404 : 400);
      const repoMeta = repoMetaResult.repo;
      const treeLoad = await fetchGithubRepoTree(installationToken, body.owner, body.repo, repoMeta.default_branch);
      const signalLoad = await loadGithubManifestDraftSignals(
        installationToken,
        body.owner,
        body.repo,
        repoMeta.default_branch,
        treeLoad.ok ? treeLoad.paths : []
      );
      const planFiles = { ...(signalLoad.files || {}) };
      const brokerPath = treeLoad.ok ? findKnownBrokerPath(treeLoad.paths) : '';
      if (brokerPath && !planFiles[brokerPath]) {
        const brokerFile = await fetchGithubTextFile(installationToken, body.owner, body.repo, brokerPath, repoMeta.default_branch);
        if (brokerFile.ok && brokerFile.text) planFiles[brokerPath] = brokerFile.text;
      }
      const plan = buildGithubAdapterPlan({
        repoMeta,
        files: planFiles,
        repoTreePaths: treeLoad.ok ? treeLoad.paths : [],
        ownerLogin: current.githubIdentity?.login || current.user?.login || current.login || ''
      });
      if (!plan.supported) {
        return json({
          error: plan.reason,
          runtime_hints: plan.runtimeHints,
          draft_manifest: plan.draftManifest,
          warnings: plan.analysis?.warnings || [],
          supported_frameworks: ['nextjs', 'cloudflare_worker_adapter', 'hono', 'express', 'fastapi']
        }, 422);
      }
      const baseSha = await fetchGithubBranchSha(installationToken, body.owner, body.repo, repoMeta.default_branch);
      if (!baseSha.ok || !baseSha.sha) {
        return json({ error: baseSha.error || `Could not resolve ${repoMeta.default_branch}` }, 400);
      }
      const branchCreated = await createGithubBranch(installationToken, body.owner, body.repo, plan.branchName, baseSha.sha);
      if (!branchCreated.ok) {
        return json(githubPermissionError(branchCreated, 'Could not create adapter branch'), branchCreated.status === 422 ? 409 : 400);
      }
      const committedFiles = [];
      for (const file of plan.filesToWrite) {
        const existing = await fetchGithubTextFile(installationToken, body.owner, body.repo, file.path, repoMeta.default_branch);
        if (existing.ok && existing.text && !existing.text.includes(GITHUB_ADAPTER_MARKER)) {
          return json({
            error: `Refusing to overwrite existing non-AIagent2 file at ${file.path}.`,
            path: file.path,
            branch: plan.branchName
          }, 409);
        }
        const write = await upsertGithubTextFile(installationToken, body.owner, body.repo, {
          path: file.path,
          branch: plan.branchName,
          content: file.content,
          sha: existing.ok ? existing.sha : '',
          message: existing.ok ? `Update AIagent2 hosted adapter: ${file.path}` : `Add AIagent2 hosted adapter: ${file.path}`
        });
        if (!write.ok) {
          return json(githubPermissionError(write, `Could not write ${file.path}`), write.status === 422 ? 409 : 400);
        }
        committedFiles.push({ path: file.path, commit_sha: write.commitSha });
      }
      const pull = await createGithubPullRequest(installationToken, body.owner, body.repo, {
        title: plan.prTitle,
        body: plan.prBody,
        head: plan.branchName,
        base: repoMeta.default_branch
      });
      if (!pull.ok) {
        return json(githubPermissionError(pull, 'Could not create pull request'), pull.status === 422 ? 409 : 400);
      }
      await touchEvent(storage, 'REGISTERED', `Adapter PR created for ${repoMeta.full_name}: ${pull.pullRequest.htmlUrl}`, {
        repo: repoMeta.full_name,
        branch: plan.branchName,
        pr: pull.pullRequest.htmlUrl
      });
      if (current.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
      return json({
        ok: true,
        auth_provider: 'github-app',
        access_mode: current.apiKeyStatus === 'valid' ? 'account-stored-installation' : 'installation-selected',
        repo: { fullName: repoMeta.full_name, private: repoMeta.private },
        installation_id: selectedRepo.installationId,
        framework: plan.framework,
        runtime_hints: plan.runtimeHints,
        branch: plan.branchName,
        base_branch: repoMeta.default_branch,
        files: committedFiles,
        pull_request: pull.pullRequest,
        required_env: plan.requiredEnv,
        optional_env: plan.optionalEnv || [],
        draft_manifest: plan.draftManifest,
        deployment_base_url: plan.deploymentBaseUrl || null,
        suggested_manifest_url: plan.suggestedManifestUrl || null,
        suggested_healthcheck_url: plan.suggestedHealthUrl || null,
        suggested_job_url: plan.suggestedJobUrl || null,
        manifest_route: plan.routes.manifestPath,
        health_route: plan.routes.healthPath,
        job_route: plan.routes.jobPath,
        signal_attempts: signalLoad.attempts,
        tree_truncated: Boolean(treeLoad.truncated),
        tree_warning: treeLoad.ok ? null : treeLoad.error,
        next_step: adapterNextStepText(plan)
      }, 201);
    } catch (error) {
      return json(githubPermissionError(error), 500);
    }
  }

  return {
    handleLogout,
    handleGoogleAnalyticsReport,
    handleGoogleConnectorAssets,
    handleGoogleSendGmail,
    handleResendSendEmail,
    handleInstagramConnectorPost,
    handleGithubRepos,
    handleGithubLoadManifest,
    handleGithubGenerateManifest,
    handleGithubCreateAdapterPr,
    handleGithubCreateExecutorPr,
    executeScheduledExactConnectorAction
  };
}
