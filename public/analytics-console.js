import { buildCaitAppContext, copyContextJson, downloadContextJson, fetchCaitAppContextFromUrl, sendContextToCait } from './cait-app-bridge.js?v=20260508c';

const GOOGLE_SOURCE_CACHE_COOKIE = 'cait_analytics_sources';

const data = {
  metrics: {
    sessions: 0,
    clicks: 0,
    conversions: 0,
    rate: '-'
  },
  queries: [],
  pages: [],
  countries: [],
  channels: [],
  channelPages: [],
  channelSources: [],
  measurement: []
};

const state = {
  section: 'dashboard',
  range: '28',
  target: 'cmo_leader',
  googleConnected: false,
  googleWarnings: [],
  googleReportLoaded: false,
  googleReportSources: { ga4: false, gsc: false },
  googleReportWarnings: [],
  googleReportDateRange: null,
  gscSite: '',
  ga4Property: '',
  selectedChannel: '',
  gscSites: [],
  ga4Properties: []
};

let importedContext = null;
let analyticsReturnSearch = window.location.search || '';

function analyticsUrlParams() {
  return new URL(window.location.href).searchParams;
}

function chatReturnTo() {
  const value = String(analyticsUrlParams().get('chat_return_to') || '').trim();
  if (!value) return '';
  try {
    const url = new URL(value, window.location.origin);
    return url.origin === window.location.origin && /^\/chat(?:\.html)?$/.test(url.pathname)
      ? `${url.pathname}${url.search}${url.hash}`
      : '';
  } catch {
    return '';
  }
}

function chatHandoffId() {
  return String(analyticsUrlParams().get('chat_handoff_id') || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 120);
}

const els = {
  sectionButtons: [...document.querySelectorAll('[data-section]')],
  rangeSelect: document.getElementById('rangeSelect'),
  targetSelect: document.getElementById('targetSelect'),
  primaryTableTitle: document.getElementById('primaryTableTitle'),
  primaryTable: document.getElementById('primaryTable'),
  channelChart: document.getElementById('channelChart'),
  measurementTable: document.getElementById('measurementTable'),
  contextPreview: document.getElementById('contextPreview'),
  connectGoogleBtn: document.getElementById('connectGoogleBtn'),
  connectSearchConsoleBtn: document.getElementById('connectSearchConsoleBtn'),
  refreshGoogleSourcesBtn: document.getElementById('refreshGoogleSourcesBtn'),
  loadGoogleReportBtn: document.getElementById('loadGoogleReportBtn'),
  googleConnectLinks: [...document.querySelectorAll('[data-google-connect-link]')],
  googleSourceStatus: document.getElementById('googleSourceStatus'),
  googleSourceNote: document.getElementById('googleSourceNote'),
  gscSiteSelect: document.getElementById('gscSiteSelect'),
  ga4PropertySelect: document.getElementById('ga4PropertySelect'),
  ga4PropertyInput: document.getElementById('ga4PropertyInput'),
  sendContextBtn: document.getElementById('sendContextBtn'),
  copyContextBtn: document.getElementById('copyContextBtn'),
  sessionsMetric: document.getElementById('sessionsMetric'),
  sessionsDelta: document.getElementById('sessionsDelta'),
  clicksMetric: document.getElementById('clicksMetric'),
  clicksDelta: document.getElementById('clicksDelta'),
  conversionsMetric: document.getElementById('conversionsMetric'),
  conversionsDelta: document.getElementById('conversionsDelta'),
  rateMetric: document.getElementById('rateMetric'),
  rateDelta: document.getElementById('rateDelta'),
  analyticsDashboardCount: document.getElementById('analyticsDashboardCount'),
  analyticsQueriesCount: document.getElementById('analyticsQueriesCount'),
  analyticsPagesCount: document.getElementById('analyticsPagesCount'),
  analyticsChannelsCount: document.getElementById('analyticsChannelsCount'),
  analyticsMeasurementCount: document.getElementById('analyticsMeasurementCount'),
  analyticsStepSources: document.getElementById('analyticsStepSources'),
  analyticsStepReport: document.getElementById('analyticsStepReport'),
  analyticsStepHandoff: document.getElementById('analyticsStepHandoff')
};

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-US');
}

function formatPercent(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return '0';
  return number.toFixed(number >= 10 ? 0 : 1).replace(/\.0$/, '');
}

function shareOf(value, total) {
  const denominator = Number(total || 0);
  if (!denominator) return 0;
  return Math.round((Number(value || 0) / denominator) * 1000) / 10;
}

function rateOf(numerator, denominator) {
  const base = Number(denominator || 0);
  if (!base) return 0;
  return Math.round((Number(numerator || 0) / base) * 1000) / 10;
}

function channelKey(value = '') {
  return String(value || '').trim().toLowerCase();
}

function selectedChannelName() {
  const selected = String(state.selectedChannel || '');
  if (selected && data.channels.some(([channel]) => channelKey(channel) === channelKey(selected))) return selected;
  return data.channels[0]?.[0] || selected;
}

function selectedChannelRows(rows = [], channelName = selectedChannelName()) {
  const selected = channelKey(channelName);
  return selected ? rows.filter((row) => channelKey(row[0]) === selected) : rows;
}

function channelDecisionNote(channel = '', sessions = 0, conversions = 0, cvr = 0) {
  const label = String(channel || '').toLowerCase();
  if (/referral/.test(label)) return 'Inspect referral sites, partner fit, and pages that convert.';
  if (/organic/.test(label)) return 'Deep-dive queries, landing pages, and content gaps.';
  if (/paid|cpc|ppc/.test(label)) return 'Check campaign intent, landing page match, and spend efficiency.';
  if (/direct/.test(label)) return 'Separate brand demand, returning users, and untagged campaigns.';
  if (Number(sessions || 0) && !Number(conversions || 0)) return 'Traffic exists but no conversion signal; inspect page intent and offer.';
  if (Number(cvr || 0) > 0) return 'Preserve this channel and look for scalable pages or sources.';
  return 'Use channel source and landing page detail before assigning action.';
}

function statusClass(value = '') {
  const safe = String(value || '').toLowerCase();
  if (/approved|ready|scheduled/.test(safe)) return 'approved';
  if (/block|missing/.test(safe)) return 'blocked';
  return 'pending';
}

function currentAnalyticsReturnPath() {
  const path = window.location.pathname || '/analytics-console.html';
  const safePath = path.startsWith('/') && /\/analytics-console\.html$/.test(path) ? path : '/analytics-console.html';
  return `${safePath}${analyticsReturnSearch || window.location.search || ''}${window.location.hash || ''}`;
}

function caitAuthOrigin() {
  const host = String(window.location.hostname || '').toLowerCase();
  if (host === 'aiagent-marketplace.net' || host === 'www.aiagent-marketplace.net') return window.location.origin;
  return 'https://aiagent-marketplace.net';
}

function googleConnectHref(loginSource = 'analytics_console', sourceKind = 'ga4') {
  const kind = String(sourceKind || '').trim().toLowerCase() === 'gsc' ? 'gsc' : 'ga4';
  const url = new URL('/auth/google', caitAuthOrigin());
  url.searchParams.set('action', 'analytics_connect');
  url.searchParams.set('return_to', currentAnalyticsReturnPath());
  url.searchParams.set('login_source', loginSource);
  url.searchParams.set('scope_group', kind);
  url.searchParams.set('capabilities', kind === 'gsc' ? 'google.read_gsc' : 'google.read_ga4');
  return url.toString();
}

function updateGoogleConnectLinks() {
  for (const link of els.googleConnectLinks || []) {
    const kind = String(link.dataset.googleConnectLink || '').trim();
    const source = kind === 'gsc' ? 'analytics_console_gsc' : 'analytics_console_ga4';
    link.href = googleConnectHref(source, kind);
    link.target = '_top';
  }
}

function readAuthErrorFromUrl() {
  const url = new URL(window.location.href);
  const error = String(url.searchParams.get('auth_error') || '').trim();
  if (!error) return '';
  url.searchParams.delete('auth_error');
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  return `Google OAuth failed: ${error}`;
}

function optionHtml(value = '', label = '') {
  return `<option value="${escapeHtml(value)}">${escapeHtml(label || value || '-')}</option>`;
}

function readCookie(name = '') {
  const target = `${encodeURIComponent(name)}=`;
  const match = document.cookie
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(target));
  if (!match) return '';
  return decodeURIComponent(match.slice(target.length));
}

function writeCookie(name = '', value = '', maxAgeSeconds = 15552000) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax${secure}`;
}

function cachedGoogleSources() {
  try {
    const parsed = JSON.parse(readCookie(GOOGLE_SOURCE_CACHE_COOKIE) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function applyCachedGoogleSources() {
  const cached = cachedGoogleSources();
  const cachedGscSite = String(cached.gscSite || cached.searchConsoleSite || '').trim();
  const cachedGa4Property = normalizeGa4Property(cached.ga4Property || cached.googleGa4Property || '');
  if (!state.gscSite && cachedGscSite) state.gscSite = cachedGscSite;
  if (!state.ga4Property && cachedGa4Property) state.ga4Property = cachedGa4Property;
}

function saveCachedGoogleSources(options = {}) {
  const cached = cachedGoogleSources();
  const saveGsc = options.gsc !== false;
  const saveGa4 = options.ga4 !== false;
  const payload = {
    gscSite: saveGsc ? String(state.gscSite || '').trim() : String(cached.gscSite || '').trim(),
    ga4Property: saveGa4 ? normalizeGa4Property(state.ga4Property || '') : normalizeGa4Property(cached.ga4Property || ''),
    savedAt: new Date().toISOString()
  };
  writeCookie(GOOGLE_SOURCE_CACHE_COOKIE, JSON.stringify(payload));
}

function normalizeGa4Property(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const digits = raw.match(/\d{4,}/)?.[0] || '';
  if (/^properties\/[A-Za-z0-9_-]+$/.test(raw)) return raw;
  if (digits) return `properties/${digits}`;
  return raw;
}

function flattenGa4Properties(accountSummaries = []) {
  return accountSummaries.flatMap((account) => (Array.isArray(account?.propertySummaries) ? account.propertySummaries : [])
    .map((property) => ({
      value: String(property?.property || ''),
      label: [property?.displayName, property?.property].filter(Boolean).join(' - ')
    })))
    .filter((item) => item.value);
}

function renderGoogleSourceControls() {
  const sites = state.gscSites || [];
  const ga4 = state.ga4Properties || [];
  const selectedGa4 = normalizeGa4Property(state.ga4Property);
  const selectedGa4InList = selectedGa4 && ga4.some((property) => property.value === selectedGa4);
  els.gscSiteSelect.innerHTML = [
    optionHtml('', sites.length ? 'Select Search Console site' : 'No Search Console sites loaded'),
    ...sites.map((site) => optionHtml(site.siteUrl, site.siteUrl))
  ].join('');
  els.ga4PropertySelect.innerHTML = [
    optionHtml('', ga4.length ? 'Select GA4 property' : 'No GA4 properties loaded'),
    selectedGa4 && !selectedGa4InList ? optionHtml(selectedGa4, `${selectedGa4} (manual)`) : '',
    ...ga4.map((property) => optionHtml(property.value, property.label))
  ].join('');
  els.gscSiteSelect.value = sites.some((site) => site.siteUrl === state.gscSite) ? state.gscSite : '';
  els.ga4PropertySelect.value = selectedGa4InList || selectedGa4 ? selectedGa4 : '';
  if (els.ga4PropertyInput) els.ga4PropertyInput.value = selectedGa4.replace(/^properties\//, '');
  const connected = Boolean(state.googleConnected);
  els.googleSourceStatus.textContent = connected ? 'Google connected' : 'Google not connected';
  els.googleSourceStatus.className = `status-pill ${connected ? 'approved' : 'pending'}`;
  if (!connected && Array.isArray(state.googleWarnings) && state.googleWarnings.length) {
    els.googleSourceStatus.textContent = 'Google connection failed';
    els.googleSourceStatus.className = 'status-pill blocked';
    els.googleSourceNote.textContent = `${state.googleWarnings.join(' / ')}. Use the matching Connect GA4 or Connect Search Console button to authorize only the missing source, then Refresh sources.`;
    return;
  }
  if (state.googleReportLoaded && state.googleReportDateRange) {
    const warnings = Array.isArray(state.googleReportWarnings) ? state.googleReportWarnings.filter(Boolean) : [];
    const ga4Missing = Boolean(state.ga4Property && !state.googleReportSources.ga4);
    const gscMissing = Boolean(state.gscSite && !state.googleReportSources.gsc);
    els.googleSourceStatus.textContent = warnings.length || ga4Missing || gscMissing ? 'Report loaded with warnings' : 'Report loaded';
    els.googleSourceStatus.className = `status-pill ${warnings.length || ga4Missing || gscMissing ? 'blocked' : 'approved'}`;
    els.googleSourceNote.textContent = warnings.length
      ? `Report loaded for ${state.googleReportDateRange.start_date} to ${state.googleReportDateRange.end_date}, but some Google data could not load: ${warnings.join(' / ')}`
      : `Report loaded for ${state.googleReportDateRange.start_date} to ${state.googleReportDateRange.end_date}. Send this evidence packet to CAIt when ready.`;
    return;
  }
  els.googleSourceNote.textContent = connected
    ? `Loaded ${sites.length} Search Console site(s) and ${ga4.length} GA4 propert${ga4.length === 1 ? 'y' : 'ies'}. Select sources, then use Load report to fetch performance rows.`
    : 'Use Connect GA4 or Connect Search Console to grant Google read access, then refresh sources.';
}

function setWorkflowStep(element, status = '', detail = '') {
  if (!element) return;
  element.className = `workflow-step ${status}`.trim();
  const detailNode = element.querySelector('span:last-child span:last-child');
  if (detailNode && detail) detailNode.textContent = detail;
}

function renderWorkflowState() {
  const hasSource = Boolean(state.gscSite || state.ga4Property);
  const connected = Boolean(state.googleConnected);
  const loaded = Boolean(state.googleReportLoaded);
  setWorkflowStep(
    els.analyticsStepSources,
    connected && hasSource ? 'done' : (state.googleWarnings.length ? 'blocked' : 'current'),
    connected
      ? (hasSource ? 'Source selected and ready for report loading.' : 'Connected. Choose one source before loading.')
      : 'Connect GA4 or Search Console before loading evidence.'
  );
  setWorkflowStep(
    els.analyticsStepReport,
    loaded ? 'done' : (connected && hasSource ? 'current' : ''),
    loaded ? 'Report rows are loaded into the packet.' : 'Use Load report after selecting sources.'
  );
  setWorkflowStep(
    els.analyticsStepHandoff,
    loaded ? 'current' : '',
    loaded ? 'Send the structured evidence packet to CAIt.' : 'Handoff becomes useful after report loading.'
  );
  if (els.sendContextBtn) {
    els.sendContextBtn.textContent = 'Send to CAIt';
  }
}

async function refreshGoogleSources(options = {}) {
  if (!options.silent) els.refreshGoogleSourcesBtn.textContent = 'Refreshing';
  try {
    const response = await fetch('/api/connectors/google/assets?include=gsc,ga4', {
      headers: { accept: 'application/json' },
      credentials: 'same-origin'
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload?.error || `Google sources failed (${response.status})`);
      error.status = response.status;
      error.data = payload;
      throw error;
    }
    state.googleConnected = Boolean(payload?.google?.connected);
    state.googleWarnings = Array.isArray(payload?.warnings) ? payload.warnings : [];
    state.gscSites = Array.isArray(payload?.search_console?.sites) ? payload.search_console.sites : [];
    state.ga4Properties = flattenGa4Properties(payload?.ga4?.account_summaries || []);
    applyCachedGoogleSources();
    if (!state.gscSite && state.gscSites[0]?.siteUrl) state.gscSite = state.gscSites[0].siteUrl;
    state.ga4Property = normalizeGa4Property(state.ga4Property);
    if (!state.ga4Property && state.ga4Properties[0]?.value) state.ga4Property = state.ga4Properties[0].value;
  } catch (error) {
    state.googleConnected = false;
    const detail = error?.data && typeof error.data === 'object'
      ? [
          error.data.error,
          error.data.code ? `code=${error.data.code}` : '',
          Array.isArray(error.data.missing_connector_capabilities) ? `missing=${error.data.missing_connector_capabilities.join(', ')}` : '',
          error.data.action ? `next=${error.data.action}` : ''
        ].filter(Boolean).join(' / ')
      : '';
    state.googleWarnings = [detail || String(error?.message || error || 'Google sources are not connected.')];
    state.gscSites = [];
    state.ga4Properties = [];
  } finally {
    renderGoogleSourceControls();
    renderWorkflowState();
    els.contextPreview.textContent = JSON.stringify(buildContext(), null, 2);
    if (!options.silent) els.refreshGoogleSourcesBtn.textContent = 'Refresh sources';
  }
}

function resetReportData() {
  data.metrics = { sessions: 0, clicks: 0, conversions: 0, rate: '-' };
  data.queries = [];
  data.pages = [];
  data.countries = [];
  data.channels = [];
  data.channelPages = [];
  data.channelSources = [];
  data.measurement = [];
}

function reportWarningText(payload = {}) {
  const warnings = [
    ...(Array.isArray(payload?.warnings) ? payload.warnings : []),
    ...(Array.isArray(state.googleWarnings) ? state.googleWarnings : [])
  ].filter(Boolean);
  return warnings.length ? warnings.join(' / ') : 'No connector warnings returned.';
}

function applyGoogleReport(payload = {}) {
  resetReportData();
  const ga4 = payload?.ga4 && typeof payload.ga4 === 'object' ? payload.ga4 : null;
  const gsc = payload?.search_console && typeof payload.search_console === 'object' ? payload.search_console : null;
  const requested = payload?.requested && typeof payload.requested === 'object' ? payload.requested : {};
  if (requested.ga4_property) state.ga4Property = normalizeGa4Property(requested.ga4_property);
  state.googleReportSources = { ga4: Boolean(ga4), gsc: Boolean(gsc) };
  const warnings = Array.isArray(payload?.warnings) ? payload.warnings : [];
  const ga4Warning = warnings.find((warning) => /^GA4\b|^GA4 /i.test(String(warning || '')));
  const ga4MissingCheck = requested.ga4_property
    ? `Requested ${requested.ga4_property}. ${ga4Warning || 'GA4 Data API did not return a report. Check property access and Data API enablement.'}`
    : 'Select a GA4 property or enter the property ID, then reload.';
  const sessions = Number(ga4?.totals?.sessions || 0);
  const conversions = Number(ga4?.totals?.conversions || 0);
  const clicks = Number(gsc?.totals?.clicks || 0);
  data.metrics.sessions = sessions;
  data.metrics.clicks = clicks;
  data.metrics.conversions = conversions;
  data.metrics.rate = sessions ? `${formatPercent((conversions / sessions) * 100)}%` : '-';
  data.queries = (Array.isArray(gsc?.rows) ? gsc.rows : []).map((row) => [
    row.query || '(not provided)',
    Number(row.clicks || 0),
    row.position ? Number(row.position).toFixed(1) : '-',
    Number(row.impressions || 0),
    row.page ? `Landing page: ${row.page}` : 'Search Console row'
  ]);
  data.pages = (Array.isArray(ga4?.landing_pages) ? ga4.landing_pages : []).map((row) => [
    row.page || '(not set)',
    Number(row.sessions || 0),
    Number(row.conversions || 0),
    `GA4 ${ga4?.conversion_metric || 'conversion'} metric`
  ]);
  data.channels = (Array.isArray(ga4?.channels) ? ga4.channels : []).map((row) => {
    const rowSessions = Number(row.sessions || 0);
    const rowConversions = Number(row.conversions || 0);
    return [
      row.channel || '(not set)',
      rowSessions,
      rowConversions,
      shareOf(rowSessions, sessions),
      rateOf(rowConversions, rowSessions)
    ];
  });
  data.channelPages = (Array.isArray(ga4?.channel_landing_pages) ? ga4.channel_landing_pages : []).map((row) => {
    const rowSessions = Number(row.sessions || 0);
    const rowConversions = Number(row.conversions || 0);
    return [
      row.channel || '(not set)',
      row.page || '(not set)',
      rowSessions,
      rowConversions,
      rateOf(rowConversions, rowSessions)
    ];
  });
  data.channelSources = (Array.isArray(ga4?.channel_sources) ? ga4.channel_sources : []).map((row) => {
    const rowSessions = Number(row.sessions || 0);
    const rowConversions = Number(row.conversions || 0);
    return [
      row.channel || '(not set)',
      row.source_medium || '(not set)',
      rowSessions,
      rowConversions,
      rateOf(rowConversions, rowSessions)
    ];
  });
  if (!state.selectedChannel && data.channels[0]?.[0]) state.selectedChannel = data.channels[0][0];
  data.countries = (Array.isArray(ga4?.countries) ? ga4.countries : []).map((row) => [
    row.country || '(not set)',
    shareOf(row.sessions, sessions),
    Number(row.conversions || 0)
  ]);
  data.measurement = [
    ['GA4 baseline loaded', `${requested.range_days || state.range}d`, ga4 ? 'ready' : 'missing', ga4 ? `${sessions} sessions / ${conversions} conversions` : ga4MissingCheck],
    ['Search Console baseline loaded', `${requested.range_days || state.range}d`, gsc ? 'ready' : 'missing', gsc ? `${clicks} clicks / ${Number(gsc?.totals?.impressions || 0)} impressions` : 'Select a Search Console site and reload.'],
    ['Leader follow-up window', '24h and 7d', 'scheduled', 'After an approved action, reload this app and send the updated packet to CAIt.']
  ];
  state.googleReportLoaded = true;
  state.googleReportWarnings = warnings;
  state.googleReportDateRange = {
    start_date: requested.start_date || '',
    end_date: requested.end_date || '',
    range_days: requested.range_days || state.range
  };
  saveCachedGoogleSources({ ga4: Boolean(ga4), gsc: Boolean(gsc) });
}

async function loadGoogleReport() {
  if (!state.ga4Property && !state.ga4Properties.length) {
    await refreshGoogleSources({ silent: true });
  }
  state.gscSite = String(els.gscSiteSelect?.value || state.gscSite || '');
  state.ga4Property = normalizeGa4Property(els.ga4PropertySelect?.value || els.ga4PropertyInput?.value || state.ga4Property || '');
  if (!state.gscSite && !state.ga4Property) {
    window.alert('Select at least one Search Console site or GA4 property first.');
    return;
  }
  els.loadGoogleReportBtn.textContent = 'Loading';
  try {
    const url = new URL('/api/connectors/google/analytics-report', window.location.origin);
    url.searchParams.set('range', state.range);
    if (state.gscSite) url.searchParams.set('gsc_site', state.gscSite);
    if (state.ga4Property) url.searchParams.set('ga4_property', state.ga4Property);
    const response = await fetch(url.toString(), {
      headers: { accept: 'application/json' },
      credentials: 'same-origin'
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error || `Google report failed (${response.status})`);
    applyGoogleReport(payload);
    if (state.googleReportWarnings.length) {
      els.googleSourceStatus.textContent = 'Report loaded with warnings';
      els.googleSourceStatus.className = 'status-pill blocked';
    }
    renderGoogleSourceControls();
    render();
  } catch (error) {
    state.googleReportLoaded = false;
    state.googleReportSources = { ga4: false, gsc: false };
    state.googleReportWarnings = [String(error?.message || error || 'Google report failed.')];
    els.googleSourceStatus.textContent = 'Report waiting';
    els.googleSourceStatus.className = 'status-pill blocked';
    els.googleSourceNote.textContent = `Report could not load: ${state.googleReportWarnings[0]}`;
    render();
  } finally {
    els.loadGoogleReportBtn.textContent = 'Load report';
  }
}

function artifactRows(context = {}, type = '') {
  const match = (Array.isArray(context.artifacts) ? context.artifacts : [])
    .find((artifact) => String(artifact?.type || '').toLowerCase() === String(type || '').toLowerCase());
  return Array.isArray(match?.rows) ? match.rows : [];
}

function metricByLabel(context = {}, label = '') {
  const target = String(label || '').toLowerCase();
  const metric = (Array.isArray(context.metrics) ? context.metrics : [])
    .find((item) => String(item?.label || item?.name || item?.metric || '').toLowerCase() === target);
  return metric?.value ?? metric?.current ?? '';
}

function applyInboundContext(context = null) {
  if (!context) return;
  importedContext = context;
  const sessions = Number(metricByLabel(context, 'organic_sessions') || metricByLabel(context, 'sessions') || 0);
  const clicks = Number(metricByLabel(context, 'search_clicks') || metricByLabel(context, 'clicks') || 0);
  const conversions = Number(metricByLabel(context, 'conversions') || metricByLabel(context, 'purchases') || 0);
  const rate = metricByLabel(context, 'conversion_rate') || metricByLabel(context, 'cvr') || '';
  if (sessions) data.metrics.sessions = sessions;
  if (clicks) data.metrics.clicks = clicks;
  if (conversions) data.metrics.conversions = conversions;
  if (rate) data.metrics.rate = String(rate);

  const queryRows = artifactRows(context, 'search_queries');
  if (queryRows.length) {
    data.queries = queryRows.map((row) => [
      row.query || row.keyword || row.name || 'unknown query',
      Number(row.clicks || row.sessions || 0),
      row.position || row.avg_position || '-',
      Number(row.conversions || row.cv || row.purchases || 0),
      row.note || row.decision_note || row.intent || context.summary || ''
    ]);
  }

  const pageRows = artifactRows(context, 'landing_pages');
  if (pageRows.length) {
    data.pages = pageRows.map((row) => [
      row.page || row.path || row.url || 'unknown page',
      Number(row.sessions || row.views || 0),
      Number(row.conversions || row.cv || row.purchases || 0),
      row.note || row.decision_note || ''
    ]);
  }

  const channelRows = artifactRows(context, 'channel_mix');
  if (channelRows.length) {
    data.channels = channelRows.map((row) => [
      row.channel || row.source || 'unknown channel',
      Number(row.sessions || 0),
      Number(row.conversions || row.cv || 0),
      Number(row.share || row.percent || row.value || 0),
      Number(row.cvr || row.conversion_rate || 0)
    ]);
    if (!state.selectedChannel && data.channels[0]?.[0]) state.selectedChannel = data.channels[0][0];
  }

  const channelPageRows = artifactRows(context, 'channel_landing_pages');
  if (channelPageRows.length) {
    data.channelPages = channelPageRows.map((row) => [
      row.channel || 'unknown channel',
      row.page || row.path || row.url || 'unknown page',
      Number(row.sessions || 0),
      Number(row.conversions || row.cv || 0),
      Number(row.cvr || row.conversion_rate || 0)
    ]);
  }

  const channelSourceRows = artifactRows(context, 'channel_sources');
  if (channelSourceRows.length) {
    data.channelSources = channelSourceRows.map((row) => [
      row.channel || 'unknown channel',
      row.source_medium || row.sourceMedium || row.referrer || row.source || 'unknown source',
      Number(row.sessions || 0),
      Number(row.conversions || row.cv || 0),
      Number(row.cvr || row.conversion_rate || 0)
    ]);
  }

  const countryRows = artifactRows(context, 'country_mix');
  if (countryRows.length) {
    data.countries = countryRows.map((row) => [
      row.country || row.region || 'unknown country',
      Number(row.share || row.percent || 0),
      Number(row.conversions || row.cv || 0)
    ]);
  }

  const target = (Array.isArray(context.handoff_targets) ? context.handoff_targets : []).find(Boolean);
  if (target) {
    state.target = String(target);
    if ([...els.targetSelect.options].some((option) => option.value === state.target)) els.targetSelect.value = state.target;
  }
  const raw = context.raw_context && typeof context.raw_context === 'object' ? context.raw_context : {};
  if (String(raw.googleSearchConsoleSite || raw.searchConsoleSite || '').trim()) state.gscSite = String(raw.googleSearchConsoleSite || raw.searchConsoleSite || '').trim();
  if (String(raw.googleGa4Property || raw.ga4Property || '').trim()) state.ga4Property = String(raw.googleGa4Property || raw.ga4Property || '').trim();
}

function tableHtml(headers = [], rows = []) {
  if (!rows.length) {
    return [
      '<thead><tr>',
      ...headers.map((header) => `<th>${escapeHtml(header)}</th>`),
      '</tr></thead><tbody>',
      `<tr><td colspan="${Math.max(headers.length, 1)}">No server-side app context is loaded yet.</td></tr>`,
      '</tbody>'
    ].join('');
  }
  return [
    '<thead><tr>',
    ...headers.map((header) => `<th>${escapeHtml(header)}</th>`),
    '</tr></thead><tbody>',
    ...rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`),
    '</tbody>'
  ].join('');
}

function primaryRows() {
  if (state.section === 'measurement') {
    els.primaryTableTitle.textContent = 'Measurement packet';
    return {
      headers: ['Action', 'Window', 'Status', 'Check'],
      rows: data.measurement.map(([action, windowLabel, status, note]) => [
        escapeHtml(action),
        escapeHtml(windowLabel),
        `<span class="status-pill ${statusClass(status)}">${escapeHtml(status)}</span>`,
        escapeHtml(note)
      ])
    };
  }
  if (state.section === 'pages') {
    els.primaryTableTitle.textContent = 'SEO landing page report';
    return {
      headers: ['Page', 'Sessions', 'CV', 'Decision note'],
      rows: data.pages.map(([page, sessions, cv, note]) => [
        `<strong>${escapeHtml(page)}</strong>`,
        formatNumber(sessions),
        formatNumber(cv),
        escapeHtml(note || 'Pair this page with Search Console queries before content changes.')
      ])
    };
  }
  if (state.section === 'queries') {
    els.primaryTableTitle.textContent = 'Search query report';
    return {
      headers: ['Query', 'Clicks', 'Position', 'Impr.', 'Leader note'],
      rows: data.queries.map(([query, clicks, position, value, note]) => [
        `<strong>${escapeHtml(query)}</strong>`,
        formatNumber(clicks),
        String(position),
        formatNumber(value),
        escapeHtml(note)
      ])
    };
  }
  els.primaryTableTitle.textContent = 'Channel acquisition';
  return {
    headers: ['Channel', 'Sessions', 'Share', 'CV', 'CVR'],
    rows: data.channels.map(([channel, sessions, conversions, share, cvr]) => [
      `<button class="channel-drilldown-btn ${channelKey(channel) === channelKey(selectedChannelName()) ? 'active' : ''}" type="button" data-channel="${escapeHtml(channel)}"><strong>${escapeHtml(channel)}</strong><span>${escapeHtml(channelDecisionNote(channel, sessions, conversions, cvr))}</span></button>`,
      formatNumber(sessions),
      `${formatPercent(share)}%`,
      formatNumber(conversions),
      `${formatPercent(cvr)}%`
    ])
  };
}

function buildContext() {
  const target = String(state.target || 'cmo_leader');
  const importedFacts = importedContext ? [`Imported context: ${importedContext.title || importedContext.id || 'CAIt app context'}`] : [];
  const topQuery = data.queries[0]?.[0] || '';
  const topPage = data.pages[0]?.[0] || '';
  const topChannel = data.channels[0]?.[0] || '';
  const referralSources = data.channelSources
    .filter(([channel]) => /referral/i.test(channel))
    .slice(0, 5)
    .map(([, source, sessions, conversions, cvr]) => `${source}: ${formatNumber(sessions)} sessions / ${formatNumber(conversions)} CV / ${formatPercent(cvr)}% CVR`);
  const reportWindow = state.googleReportDateRange?.start_date && state.googleReportDateRange?.end_date
    ? `${state.googleReportDateRange.start_date} to ${state.googleReportDateRange.end_date}`
    : `last ${state.range} days`;
  return buildCaitAppContext({
    source_app: 'analytics_console',
    source_app_label: state.ga4Property
      ? (state.gscSite ? 'GA4 + Search Console Connector' : 'GA4 Connector')
      : (state.gscSite ? 'Search Console Connector' : 'Analytics Console'),
    title: `Acquisition analytics summary - ${reportWindow}`,
    summary: state.googleReportLoaded
      ? `GA4 and/or Search Console data was loaded for ${reportWindow}. Use this evidence before choosing the next SEO, CMO, or growth action.`
      : (importedContext?.summary || 'No analytics report is loaded yet. Connect Google, select a GA4 property or Search Console site, and load a report before asking a leader to make evidence-based decisions.'),
    facts: [
      ...importedFacts,
      state.googleReportLoaded ? `Google report loaded: ${reportWindow}` : '',
      state.gscSite ? `Search Console site: ${state.gscSite}` : '',
      state.ga4Property ? `GA4 property: ${state.ga4Property}` : '',
      `Sessions: ${formatNumber(data.metrics.sessions)}`,
      `Search clicks: ${formatNumber(data.metrics.clicks)}`,
      `Conversions: ${formatNumber(data.metrics.conversions)}`,
      `Conversion rate: ${data.metrics.rate}`,
      state.selectedChannel ? `Selected channel drilldown: ${state.selectedChannel}` : '',
      topChannel ? `Top channel: ${topChannel}` : '',
      referralSources.length ? `Referral source detail: ${referralSources.join(' / ')}` : '',
      topQuery ? `Top query: ${topQuery}` : '',
      topPage ? `Top landing page: ${topPage}` : '',
      state.googleReportWarnings.length ? `Google report warnings: ${state.googleReportWarnings.join(' / ')}` : ''
    ].filter(Boolean),
    assumptions: [
      importedContext ? 'This console is using a server-side CAIt app context received by id/token.' : 'No built-in demo analytics data is used.',
      state.googleConnected ? 'Google OAuth is connected for source selection.' : 'Google OAuth is not connected in this browser session.',
      state.googleReportLoaded ? 'The visible rows came from the connected Google APIs.' : 'The visible rows are empty until the connected Google report is loaded.',
      'External source-sensitive claims should be refreshed through connected APIs before final strategy.'
    ],
    metrics: [
      { label: 'sessions', value: data.metrics.sessions, window: `${state.range}d` },
      { label: 'search_clicks', value: data.metrics.clicks, window: `${state.range}d` },
      { label: 'conversions', value: data.metrics.conversions, window: `${state.range}d` },
      { label: 'conversion_rate', value: data.metrics.rate, window: `${state.range}d` }
    ],
    artifacts: [
      { type: 'search_queries', rows: data.queries.map(([query, clicks, position, impressions, note]) => ({ query, clicks, position, impressions, note })) },
      { type: 'landing_pages', rows: data.pages.map(([page, sessions, conversions, note]) => ({ page, sessions, conversions, note })) },
      { type: 'channel_mix', rows: data.channels.map(([channel, sessions, conversions, share, cvr]) => ({ channel, sessions, conversions, share, cvr })) },
      { type: 'channel_landing_pages', rows: data.channelPages.map(([channel, page, sessions, conversions, cvr]) => ({ channel, page, sessions, conversions, cvr })) },
      { type: 'channel_sources', rows: data.channelSources.map(([channel, sourceMedium, sessions, conversions, cvr]) => ({ channel, source_medium: sourceMedium, sessions, conversions, cvr })) },
      { type: 'country_mix', rows: data.countries.map(([country, share, conversions]) => ({ country, share, conversions })) },
      { type: 'google_sources', rows: [
        state.gscSite ? { source: 'search_console', value: state.gscSite } : null,
        state.ga4Property ? { source: 'ga4', value: state.ga4Property } : null
      ].filter(Boolean) },
      { type: 'google_report_status', rows: [
        {
          loaded: state.googleReportLoaded,
          range: reportWindow,
          warnings: reportWarningText()
        }
      ] }
    ],
    recommended_next_actions: [
      (state.gscSite || state.ga4Property || importedContext) ? 'Ask the selected leader to prioritize one evidence-backed next action.' : 'Connect Google and select Search Console / GA4 sources first.',
      'Use Publisher & Approval Studio for page/meta changes before external publishing.',
      'Run a 24h and 7d post-run measurement after the approved action is executed.'
    ],
    handoff_targets: [target, 'seo_gap', 'growth'],
    raw_context: {
      ...(importedContext ? { received_context: importedContext } : {}),
      connector_type: state.ga4Property
        ? (state.gscSite ? 'google_analytics_and_search_console' : 'google_analytics_4')
        : (state.gscSite ? 'google_search_console' : 'analytics_console'),
      connector_provider: 'google',
      connector_services: [
        state.ga4Property ? 'ga4' : '',
        state.gscSite ? 'search_console' : ''
      ].filter(Boolean),
      chat_handoff_id: chatHandoffId(),
      chat_return_to: chatReturnTo(),
      googleSearchConsoleSite: state.gscSite,
      googleGa4Property: state.ga4Property,
      googleReportLoaded: state.googleReportLoaded,
      googleReportSources: {
        ga4: Boolean(state.googleReportSources.ga4),
        gsc: Boolean(state.googleReportSources.gsc)
      },
      googleReportDateRange: state.googleReportDateRange,
      analyticsSelectedChannel: state.selectedChannel,
      googleWarnings: state.googleWarnings,
      googleReportWarnings: state.googleReportWarnings
    }
  });
}

function miniTableHtml(headers = [], rows = []) {
  if (!rows.length) return '<p class="muted">No detail rows loaded for this channel.</p>';
  return [
    '<table class="data-table compact-table"><thead><tr>',
    ...headers.map((header) => `<th>${escapeHtml(header)}</th>`),
    '</tr></thead><tbody>',
    ...rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`),
    '</tbody></table>'
  ].join('');
}

function channelDetailHtml() {
  const selected = selectedChannelName();
  const channel = data.channels.find(([name]) => channelKey(name) === channelKey(selected)) || data.channels[0] || null;
  if (!channel) return '<p class="muted">Load GA4 to see channel detail.</p>';
  const [name, sessions, conversions, share, cvr] = channel;
  const sourceRows = selectedChannelRows(data.channelSources, name).slice(0, 8);
  const pageRows = selectedChannelRows(data.channelPages, name).slice(0, 8);
  const sourceTitle = /referral/i.test(name) ? 'Referral sites' : 'Sources';
  return [
    '<div class="channel-detail-head">',
    `<strong>${escapeHtml(name)}</strong>`,
    `<span>${formatNumber(sessions)} sessions / ${formatPercent(share)}% share / ${formatNumber(conversions)} CV / ${formatPercent(cvr)}% CVR</span>`,
    '</div>',
    '<div class="detail-block">',
    `<h3>${sourceTitle}</h3>`,
    miniTableHtml(['Source / medium', 'Sessions', 'CV', 'CVR'], sourceRows.map(([, source, rowSessions, rowConversions, rowCvr]) => [
      `<strong>${escapeHtml(source)}</strong>`,
      formatNumber(rowSessions),
      formatNumber(rowConversions),
      `${formatPercent(rowCvr)}%`
    ])),
    '</div>',
    '<div class="detail-block">',
    '<h3>Landing pages</h3>',
    miniTableHtml(['Page', 'Sessions', 'CV', 'CVR'], pageRows.map(([, page, rowSessions, rowConversions, rowCvr]) => [
      `<strong>${escapeHtml(page)}</strong>`,
      formatNumber(rowSessions),
      formatNumber(rowConversions),
      `${formatPercent(rowCvr)}%`
    ])),
    '</div>'
  ].join('');
}

function renderCounts() {
  els.analyticsDashboardCount.textContent = importedContext ? '1' : '0';
  els.analyticsQueriesCount.textContent = String(data.queries.length);
  els.analyticsPagesCount.textContent = String(data.pages.length);
  els.analyticsChannelsCount.textContent = String(data.channels.length);
  els.analyticsMeasurementCount.textContent = String(data.measurement.length);
}

function render() {
  renderWorkflowState();
  renderCounts();
  const m = data.metrics;
  els.sessionsMetric.textContent = formatNumber(m.sessions);
  els.sessionsDelta.textContent = state.googleReportLoaded
    ? (state.googleReportSources.ga4 ? 'Loaded from GA4' : 'GA4 not loaded')
    : (importedContext ? `Loaded from ${importedContext.source_app_label || importedContext.source_app || 'CAIt context'}` : 'No report loaded');
  els.clicksMetric.textContent = formatNumber(m.clicks);
  els.clicksDelta.textContent = state.googleReportLoaded
    ? (state.googleReportSources.gsc ? 'Loaded from Search Console' : 'Search Console not loaded')
    : (importedContext ? 'Search data available' : 'Waiting for report');
  els.conversionsMetric.textContent = formatNumber(m.conversions);
  els.conversionsDelta.textContent = state.googleReportLoaded
    ? (state.googleReportSources.ga4 ? 'Loaded from GA4' : 'GA4 not loaded')
    : (importedContext ? 'Conversion data available' : 'Waiting for report');
  els.rateMetric.textContent = m.rate;
  els.rateDelta.textContent = state.googleReportLoaded
    ? (state.googleReportSources.ga4 ? 'Derived from sessions and conversions' : 'GA4 not loaded')
    : (importedContext ? 'Needs page-level split' : 'No rate loaded');

  const primary = primaryRows();
  els.primaryTable.innerHTML = tableHtml(primary.headers, primary.rows);
  els.channelChart.innerHTML = channelDetailHtml();
  els.measurementTable.innerHTML = tableHtml(
    ['Action', 'Window', 'Status', 'Check'],
    data.measurement.map(([action, windowLabel, status, note]) => [
      escapeHtml(action),
      escapeHtml(windowLabel),
      `<span class="status-pill ${statusClass(status)}">${escapeHtml(status)}</span>`,
      escapeHtml(note)
    ])
  );
  els.contextPreview.textContent = JSON.stringify(buildContext(), null, 2);
}

els.sectionButtons.forEach((button) => {
  button.addEventListener('click', () => {
    state.section = String(button.dataset.section || 'dashboard');
    els.sectionButtons.forEach((item) => item.classList.toggle('active', item === button));
    render();
  });
});

els.primaryTable.addEventListener('click', (event) => {
  const button = event.target.closest('[data-channel]');
  if (!button) return;
  state.selectedChannel = String(button.dataset.channel || '');
  state.section = 'channels';
  els.sectionButtons.forEach((item) => item.classList.toggle('active', item.dataset.section === 'channels'));
  render();
});

els.rangeSelect.addEventListener('change', () => {
  state.range = String(els.rangeSelect.value || '28');
  state.googleReportLoaded = false;
  renderGoogleSourceControls();
  render();
});

els.targetSelect.addEventListener('change', () => {
  state.target = String(els.targetSelect.value || 'cmo_leader');
  render();
});

els.googleConnectLinks.forEach((link) => {
  link.addEventListener('click', () => {
    updateGoogleConnectLinks();
  });
});

els.refreshGoogleSourcesBtn.addEventListener('click', () => {
  void refreshGoogleSources();
});

els.loadGoogleReportBtn.addEventListener('click', () => {
  void loadGoogleReport();
});

els.gscSiteSelect.addEventListener('change', () => {
  state.gscSite = String(els.gscSiteSelect.value || '');
  state.googleReportLoaded = false;
  renderGoogleSourceControls();
  els.contextPreview.textContent = JSON.stringify(buildContext(), null, 2);
});

els.ga4PropertySelect.addEventListener('change', () => {
  state.ga4Property = normalizeGa4Property(els.ga4PropertySelect.value || '');
  state.googleReportLoaded = false;
  renderGoogleSourceControls();
  els.contextPreview.textContent = JSON.stringify(buildContext(), null, 2);
});

els.ga4PropertyInput.addEventListener('change', () => {
  state.ga4Property = normalizeGa4Property(els.ga4PropertyInput.value || '');
  state.googleReportLoaded = false;
  renderGoogleSourceControls();
  els.contextPreview.textContent = JSON.stringify(buildContext(), null, 2);
});

els.sendContextBtn.addEventListener('click', () => {
  const returnTo = chatReturnTo();
  void sendContextToCait(buildContext(), { returnTo }).catch((error) => {
    window.alert(`CAIt context handoff failed: ${error.message}`);
  });
});

els.copyContextBtn.addEventListener('click', async () => {
  await copyContextJson(buildContext());
  els.copyContextBtn.textContent = 'Copied';
  window.setTimeout(() => { els.copyContextBtn.textContent = 'Copy context'; }, 1200);
});

document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    downloadContextJson(buildContext(), 'analytics-console-context.json');
  }
});

async function bootstrap() {
  applyCachedGoogleSources();
  const authError = readAuthErrorFromUrl();
  if (authError) state.googleWarnings = [authError];
  applyInboundContext(await fetchCaitAppContextFromUrl());
  analyticsReturnSearch = analyticsReturnSearch || window.location.search || '';
  updateGoogleConnectLinks();
  render();
  void refreshGoogleSources({ silent: true });
}

void bootstrap();

function escapeHtml(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
