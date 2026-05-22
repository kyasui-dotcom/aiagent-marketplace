export function createGoogleIntegrationHelpers(deps = {}) {
  const {
    accountSettingsForLogin,
    decryptConnectorSecret,
    fetchJson,
    googleConnectorFromOAuthToken,
    mutateAccountByLogin,
    sessionHasGoogleOauth,
    upsertAccountSettingsInState
  } = deps;

  async function fetchGoogleUserProfile(token) {
    const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/json'
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error_description || data.error || `Request failed (${response.status})`);
    return data;
  }

  function googleConnectorTokenExpired(connector = null, skewMs = 120_000) {
    const expiresAt = String(connector?.tokenExpiresAt || '').trim();
    if (!expiresAt) return false;
    const timestamp = Date.parse(expiresAt);
    if (!Number.isFinite(timestamp)) return false;
    return timestamp <= (Date.now() + skewMs);
  }

  async function googleAccessTokenForConnector(storage, env, login = '', user = null, authProvider = '', connector = null) {
    if (!connector?.connected || !connector?.accessTokenEnc) {
      const error = new Error('Google connection required before CAIt can read analytics sources.');
      error.statusCode = 409;
      error.code = 'connector_required';
      throw error;
    }
    if (!googleConnectorTokenExpired(connector)) {
      return {
        accessToken: await decryptConnectorSecret(env, connector.accessTokenEnc),
        connector,
        refreshed: false
      };
    }
    if (!connector.refreshTokenEnc) {
      const error = new Error('Google connection needs to be refreshed before CAIt can read analytics sources.');
      error.statusCode = 409;
      error.code = 'connector_reauth_required';
      throw error;
    }
    const refreshToken = await decryptConnectorSecret(env, connector.refreshTokenEnc);
    const token = await fetchJson('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: new URLSearchParams({
        client_id: googleClientId(env),
        client_secret: googleClientSecret(env),
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      }).toString()
    });
    const mergedToken = {
      ...token,
      refresh_token: refreshToken,
      scope: token.scope || connector.scopes || googleScopeForOAuthAction(env, 'analytics_connect')
    };
    let updatedConnector = connector;
    await mutateAccountByLogin(storage, login, async (draft) => {
      const latest = accountSettingsForLogin(draft, login, user, authProvider);
      updatedConnector = await googleConnectorFromOAuthToken(env, {
        providerUserId: connector.providerUserId,
        email: connector.email,
        name: connector.name,
        profileUrl: connector.profileUrl,
        avatarUrl: connector.avatarUrl
      }, mergedToken, latest?.connectors?.google || connector);
      upsertAccountSettingsInState(draft, login, user, authProvider, {
        connectors: {
          ...(latest?.connectors || {}),
          google: updatedConnector
        }
      });
    });
    return {
      accessToken: await decryptConnectorSecret(env, updatedConnector.accessTokenEnc),
      connector: updatedConnector,
      refreshed: true
    };
  }

  async function googleAccessTokenForCurrent(storage, env, current = {}, connector = null) {
    const session = current?.session || null;
    if (connector?.connected && connector?.accessTokenEnc) {
      try {
        return await googleAccessTokenForConnector(storage, env, current.login, current.user, current.authProvider, connector);
      } catch (error) {
        if (!(error?.code === 'connector_reauth_required' && sessionHasGoogleOauth(session) && String(session?.googleAccessToken || '').trim())) {
          throw error;
        }
      }
    }
    if (sessionHasGoogleOauth(session) && String(session?.googleAccessToken || '').trim()) {
      return {
        accessToken: String(session.googleAccessToken || ''),
        connector: {
          connected: true,
          scopes: String(session?.googleScopes || connector?.scopes || googleScopeForOAuthAction(env, 'analytics_connect')),
          tokenExpiresAt: '',
          email: String(current?.googleIdentity?.email || session?.googleIdentity?.email || ''),
          providerUserId: String(current?.googleIdentity?.providerUserId || session?.googleIdentity?.providerUserId || '')
        },
        refreshed: false,
        sessionOnly: true
      };
    }
    const error = new Error('Google connection required before CAIt can read analytics sources.');
    error.statusCode = 409;
    error.code = 'connector_required';
    throw error;
  }

  async function fetchGoogleAuthorizedJson(url, accessToken, init = {}) {
    const response = await fetch(url, {
      ...init,
      headers: {
        authorization: `Bearer ${accessToken}`,
        accept: 'application/json',
        ...(init.headers || {})
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data?.error?.message || data?.error_description || data?.error || `Google API request failed (${response.status})`);
      error.statusCode = response.status;
      error.googleStatus = String(data?.error?.status || '');
      error.googleCode = String(data?.error?.code || response.status || '');
      error.googleReason = googleApiErrorReason(data);
      error.payload = data;
      throw error;
    }
    return data;
  }

  function googleApiErrorReason(data = {}) {
    const details = Array.isArray(data?.error?.details) ? data.error.details : [];
    const detailReason = details
      .map((detail) => String(detail?.reason || detail?.metadata?.reason || '').trim())
      .find(Boolean);
    if (detailReason) return detailReason;
    const errors = Array.isArray(data?.error?.errors) ? data.error.errors : [];
    const legacyReason = errors.map((item) => String(item?.reason || '').trim()).find(Boolean);
    return legacyReason || '';
  }

  function googleApiRecoveryHint(label = 'Google', error = {}) {
    const text = [
      error?.message,
      error?.googleStatus,
      error?.googleReason,
      error?.payload?.error?.message
    ].map((item) => String(item || '')).join(' ');
    if (/SERVICE_DISABLED|accessNotConfigured|has not been used|disabled/i.test(text)) {
      return `${label} API is not enabled for the Google Cloud OAuth project. Enable the API, then reconnect Google.`;
    }
    if (/ACCESS_TOKEN_SCOPE_INSUFFICIENT|insufficient authentication scopes|insufficientPermissions/i.test(text)) {
      return `Reconnect Google with the ${label} scope.`;
    }
    if (/PERMISSION_DENIED|permission|sufficient permissions|User does not have/i.test(text)) {
      return `Use a Google account that has access to the ${label} resource.`;
    }
    if (/UNAUTHENTICATED|invalid_grant|invalid credentials|Login Required/i.test(text)) {
      return 'Reconnect Google and refresh sources again.';
    }
    return '';
  }

  function googleApiWarning(label = 'Google', error = {}) {
    const message = String(error?.message || error || 'request failed');
    const hint = googleApiRecoveryHint(label, error);
    return hint ? `${label}: ${message}. ${hint}` : `${label}: ${message}`;
  }

  function googleApiErrorPayload(label = 'Google', error = {}) {
    const hint = googleApiRecoveryHint(label, error);
    return {
      label,
      message: String(error?.message || error || 'request failed'),
      status_code: Number(error?.statusCode || 0),
      google_status: String(error?.googleStatus || ''),
      google_code: String(error?.googleCode || ''),
      google_reason: String(error?.googleReason || ''),
      action: hint
    };
  }

  function encodeBase64UrlUtf8(value = '') {
    const text = String(value || '');
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(text, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    }
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function buildPlainTextEmailRaw({ to = '', subject = '', text = '' } = {}) {
    const safeTo = String(to || '').trim();
    const safeSubject = String(subject || '').replace(/[\r\n]+/g, ' ').trim();
    const safeText = String(text || '').replace(/\r\n/g, '\n');
    return [
      `To: ${safeTo}`,
      `Subject: ${safeSubject}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'MIME-Version: 1.0',
      '',
      safeText
    ].join('\r\n');
  }

  async function sendGoogleGmailMessage(accessToken, payload = {}) {
    const raw = encodeBase64UrlUtf8(buildPlainTextEmailRaw(payload));
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        accept: 'application/json',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ raw })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data?.error?.message || data?.error_description || data?.error || `Gmail send failed (${response.status})`);
      error.statusCode = response.status;
      error.payload = data;
      throw error;
    }
    return data;
  }

  const GOOGLE_OAUTH_SCOPE_GROUPS = Object.freeze({
    gsc: ['https://www.googleapis.com/auth/webmasters.readonly'],
    ga4: ['https://www.googleapis.com/auth/analytics.readonly'],
    drive: ['https://www.googleapis.com/auth/drive.readonly'],
    docs: ['https://www.googleapis.com/auth/documents.readonly'],
    sheets: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    presentations: ['https://www.googleapis.com/auth/presentations.readonly'],
    calendar_read: ['https://www.googleapis.com/auth/calendar.readonly'],
    calendar_write: ['https://www.googleapis.com/auth/calendar'],
    gmail_read: ['https://www.googleapis.com/auth/gmail.readonly'],
    gmail_send: ['https://www.googleapis.com/auth/gmail.send']
  });

  function googleClientId(env) {
    return String(env?.GOOGLE_CLIENT_ID || env?.GOOGLE_OAUTH_CLIENT_ID || '').trim();
  }

  function googleClientSecret(env) {
    return String(env?.GOOGLE_CLIENT_SECRET || env?.GOOGLE_OAUTH_CLIENT_SECRET || '').trim();
  }

  function googleConfigured(env) {
    return Boolean(googleClientId(env) && googleClientSecret(env));
  }

  function googleOAuthScope(env) {
    return googleLoginScope(env);
  }

  function googleLoginScope(env) {
    const configured = String(env?.GOOGLE_LOGIN_SCOPE || '').trim();
    return configured || ['openid', 'email', 'profile'].join(' ');
  }

  function googleAnalyticsScope(env) {
    const configured = String(env?.GOOGLE_ANALYTICS_OAUTH_SCOPE || '').trim();
    return configured || [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/analytics.readonly',
      'https://www.googleapis.com/auth/webmasters.readonly'
    ].join(' ');
  }

  function googleScopeGroupsForCapability(value = '') {
    const normalized = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (normalized === 'google.read_gsc' || normalized === 'read_gsc' || normalized === 'gsc') return ['gsc'];
    if (normalized === 'google.read_ga4' || normalized === 'read_ga4' || normalized === 'ga4') return ['ga4'];
    if (normalized === 'google.read_drive' || normalized === 'read_drive' || normalized === 'drive') return ['drive'];
    if (normalized === 'google.read_docs' || normalized === 'read_docs' || normalized === 'docs') return ['docs'];
    if (normalized === 'google.read_sheets' || normalized === 'read_sheets' || normalized === 'sheets') return ['sheets'];
    if (normalized === 'google.read_presentations' || normalized === 'read_presentations' || normalized === 'presentations' || normalized === 'slides') return ['presentations'];
    if (normalized === 'google.read_calendar' || normalized === 'read_calendar' || normalized === 'calendar') return ['calendar_read'];
    if (normalized === 'google.write_calendar' || normalized === 'google.create_meet' || normalized === 'write_calendar' || normalized === 'create_meet') return ['calendar_write'];
    if (normalized === 'google.read_gmail' || normalized === 'read_gmail' || normalized === 'gmail') return ['gmail_read'];
    if (normalized === 'google.send_gmail' || normalized === 'send_gmail' || normalized === 'gmail_send') return ['gmail_send'];
    if (normalized === 'analytics' || normalized === 'analytics_connect') return ['gsc', 'ga4'];
    return [];
  }

  function googleScopeGroupLabel(group = '') {
    const normalized = String(group || '').trim().toLowerCase();
    if (normalized === 'gsc') return 'Search Console';
    if (normalized === 'ga4') return 'GA4';
    if (normalized === 'drive') return 'Google Drive';
    if (normalized === 'docs') return 'Google Docs';
    if (normalized === 'sheets') return 'Google Sheets';
    if (normalized === 'presentations') return 'Google Slides';
    if (normalized === 'calendar' || normalized === 'calendar_read') return 'Google Calendar';
    if (normalized === 'calendar_write') return 'Google Calendar write';
    if (normalized === 'gmail' || normalized === 'gmail_read') return 'Gmail';
    if (normalized === 'gmail_send') return 'Gmail send';
    return normalized || 'Google';
  }

  function googleOAuthScopeGroupsFromUrl(url = null) {
    const groups = new Set();
    if (!url) return groups;
    const values = [
      ...url.searchParams.getAll('include'),
      ...url.searchParams.getAll('includes'),
      ...url.searchParams.getAll('google_scope'),
      ...url.searchParams.getAll('google_scopes'),
      ...url.searchParams.getAll('scope_group'),
      ...url.searchParams.getAll('scope_groups'),
      ...url.searchParams.getAll('capability'),
      ...url.searchParams.getAll('capabilities'),
      ...url.searchParams.getAll('required_capability'),
      ...url.searchParams.getAll('required_capabilities')
    ];
    for (const value of values) {
      for (const part of String(value || '').split(/[,\s]+/)) {
        for (const group of googleScopeGroupsForCapability(part)) groups.add(group);
      }
    }
    return groups;
  }

  function googleOAuthCapabilitiesFromGroups(groups = []) {
    const capabilities = [];
    for (const group of groups) {
      if (group === 'gsc') capabilities.push('google.read_gsc');
      else if (group === 'ga4') capabilities.push('google.read_ga4');
      else if (group === 'drive') capabilities.push('google.read_drive');
      else if (group === 'docs') capabilities.push('google.read_docs');
      else if (group === 'sheets') capabilities.push('google.read_sheets');
      else if (group === 'presentations') capabilities.push('google.read_presentations');
      else if (group === 'calendar_read') capabilities.push('google.read_calendar');
      else if (group === 'calendar_write') capabilities.push('google.write_calendar');
      else if (group === 'gmail_read') capabilities.push('google.read_gmail');
      else if (group === 'gmail_send') capabilities.push('google.send_gmail');
    }
    return [...new Set(capabilities)];
  }

  function googleScopedOAuthScope(env, groups = []) {
    const scopes = new Set(['openid', 'email', 'profile']);
    for (const group of groups) {
      for (const scope of GOOGLE_OAUTH_SCOPE_GROUPS[group] || []) scopes.add(scope);
    }
    return [...scopes].join(' ');
  }

  function googleScopeString(...values) {
    return [...new Set(values
      .flatMap((value) => String(value || '').split(/\s+/))
      .map((scope) => String(scope || '').trim())
      .filter(Boolean))]
      .join(' ');
  }

  function googleConnectorScopeSet(connector = null) {
    return new Set(String(connector?.scopes || '')
      .split(/\s+/)
      .map((scope) => String(scope || '').trim().toLowerCase())
      .filter(Boolean));
  }

  function googleConnectorHasScopeGroup(connector = null, group = '') {
    const normalized = String(group || '').trim().toLowerCase();
    const required = GOOGLE_OAUTH_SCOPE_GROUPS[normalized] || [];
    if (!required.length) return true;
    const scopes = googleConnectorScopeSet(connector);
    if (!scopes.size) return false;
    return required.some((scope) => scopes.has(String(scope || '').toLowerCase()));
  }

  function missingGoogleScopeGroups(connector = null, groups = []) {
    return [...new Set((groups || []).map((group) => String(group || '').trim().toLowerCase()).filter(Boolean))]
      .filter((group) => !googleConnectorHasScopeGroup(connector, group));
  }

  function googleScopeGroupForAssetInclude(group = '') {
    const normalized = String(group || '').trim().toLowerCase();
    if (normalized === 'calendar') return 'calendar_read';
    if (normalized === 'gmail') return 'gmail_read';
    return normalized;
  }

  function googleScopeForOAuthAction(env, action = 'login', url = null) {
    const normalized = String(action || '').trim().toLowerCase();
    if (normalized === 'login') return googleLoginScope(env);
    const groups = googleOAuthScopeGroupsFromUrl(url);
    if (normalized === 'analytics_connect' && !groups.size) {
      return googleAnalyticsScope(env);
    }
    if (['link', 'connect'].includes(normalized) && !groups.size) {
      return googleAnalyticsScope(env);
    }
    return googleScopedOAuthScope(env, groups);
  }

  function googleRequestedScopeForOAuthState(env, cookieState = null) {
    const explicitScope = googleScopeString(cookieState?.requestedScope || cookieState?.requested_scope || '');
    if (explicitScope) return explicitScope;
    const groups = Array.isArray(cookieState?.googleScopeGroups)
      ? cookieState.googleScopeGroups.map((group) => String(group || '').trim()).filter(Boolean)
      : [];
    if (groups.length) return googleScopedOAuthScope(env, groups);
    return googleScopeForOAuthAction(env, cookieState?.action || 'analytics_connect');
  }

  function googlePromptForOAuthAction(action = 'login') {
    const normalized = String(action || '').trim().toLowerCase();
    return ['link', 'connect', 'analytics_connect'].includes(normalized)
      ? 'select_account consent'
      : 'select_account';
  }

  function googleScopeList(env) {
    return googleScopeForOAuthAction(env, 'analytics_connect').split(/\s+/).map((item) => String(item || '').trim()).filter(Boolean);
  }

  return {
    fetchGoogleUserProfile,
    googleConnectorTokenExpired,
    googleAccessTokenForConnector,
    googleAccessTokenForCurrent,
    fetchGoogleAuthorizedJson,
    googleApiErrorReason,
    googleApiRecoveryHint,
    googleApiWarning,
    googleApiErrorPayload,
    encodeBase64UrlUtf8,
    buildPlainTextEmailRaw,
    sendGoogleGmailMessage,
    googleClientId,
    googleClientSecret,
    googleConfigured,
    googleOAuthScope,
    googleLoginScope,
    googleAnalyticsScope,
    googleScopeGroupsForCapability,
    googleScopeGroupLabel,
    googleOAuthScopeGroupsFromUrl,
    googleOAuthCapabilitiesFromGroups,
    googleScopedOAuthScope,
    googleScopeString,
    googleConnectorScopeSet,
    googleConnectorHasScopeGroup,
    missingGoogleScopeGroups,
    googleScopeGroupForAssetInclude,
    googleScopeForOAuthAction,
    googleRequestedScopeForOAuthState,
    googlePromptForOAuthAction,
    googleScopeList
  };
}
