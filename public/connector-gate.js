const DEFAULT_RETURN_PATH = '/chat';
const DEFAULT_CONNECT_WAIT_MS = 60 * 60 * 1000;
const DEFAULT_CONNECT_CHECK_INTERVAL_MS = 1500;

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function listValues(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function authGrantedGoogleCapabilities(auth = {}) {
  return new Set(listValues(auth?.googleGrantedCapabilities || auth?.google_granted_capabilities)
    .map((item) => String(item || '').trim().toLowerCase()));
}

export function connectorGateAuthorityRequestFromJob(job = {}) {
  const output = job.output && typeof job.output === 'object' ? job.output : {};
  const report = output.report && typeof output.report === 'object' ? output.report : {};
  const delivery = output.delivery && typeof output.delivery === 'object' ? output.delivery : {};
  const deliveryReport = delivery.report && typeof delivery.report === 'object' ? delivery.report : {};
  const executorState = job.executorState && typeof job.executorState === 'object' ? job.executorState : {};
  const request = report.authority_request
    || report.authorityRequest
    || report.action_required
    || report.actionRequired
    || report.executor_request
    || report.executorRequest
    || output.authority_request
    || output.authorityRequest
    || output.action_required
    || output.actionRequired
    || deliveryReport.authority_request
    || deliveryReport.authorityRequest
    || deliveryReport.action_required
    || deliveryReport.actionRequired
    || executorState.authorityRequired
    || executorState.authority_required
    || null;
  return request && typeof request === 'object' ? request : null;
}

export function connectorGateGoogleIncludeGroupsFromAuthority(request = null) {
  if (!request || typeof request !== 'object') return [];
  const explicit = listValues(
    request.required_google_sources
      || request.requiredGoogleSources
      || request.google_source_types
      || request.googleSourceTypes
      || request.googleIncludeGroups
  ).map((item) => {
    const normalized = String(item || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (['gsc', 'search_console', 'google_search_console', 'webmasters'].includes(normalized)) return 'gsc';
    if (['ga4', 'analytics', 'google_analytics', 'google_analytics_4'].includes(normalized)) return 'ga4';
    if (['gmail_send', 'gmail', 'send_gmail', 'google_gmail'].includes(normalized)) return 'gmail_send';
    return '';
  }).filter(Boolean);
  if (explicit.length) return [...new Set(explicit)];
  const capabilities = listValues(request.missing_connector_capabilities || request.missingConnectorCapabilities || request.capabilities);
  const groups = [];
  if (capabilities.some((item) => /^google\.read_ga4$/i.test(String(item || '')))) groups.push('ga4');
  if (capabilities.some((item) => /^google\.read_gsc$/i.test(String(item || '')))) groups.push('gsc');
  if (capabilities.some((item) => /^google\.send_gmail$/i.test(String(item || '')))) groups.push('gmail_send');
  return [...new Set(groups)];
}

export function connectorGateGoogleAuthorityConnectGroups(request = null, preferredGroup = '') {
  const groups = [];
  const add = (group) => {
    const normalized = String(group || '').trim().toLowerCase();
    const safe = normalized === 'gsc' ? 'gsc' : (normalized === 'ga4' ? 'ga4' : (normalized === 'gmail_send' ? 'gmail_send' : ''));
    if (safe && !groups.includes(safe)) groups.push(safe);
  };
  for (const group of connectorGateGoogleIncludeGroupsFromAuthority(request)) add(group);
  const capabilities = listValues(request?.missing_connector_capabilities || request?.missingConnectorCapabilities || request?.capabilities);
  if (capabilities.some((item) => /^google\.read_ga4$/i.test(String(item || '')))) add('ga4');
  if (capabilities.some((item) => /^google\.read_gsc$/i.test(String(item || '')))) add('gsc');
  if (capabilities.some((item) => /^google\.send_gmail$/i.test(String(item || '')))) add('gmail_send');
  if (!groups.length) add(preferredGroup);
  if (!groups.length) add('ga4');
  return ['ga4', 'gsc', 'gmail_send'].filter((group) => groups.includes(group));
}

export function connectorGateGoogleCapabilitiesForGroups(groups = []) {
  const normalized = Array.isArray(groups) ? groups : [];
  const capabilities = [];
  if (normalized.includes('ga4')) capabilities.push('google.read_ga4');
  if (normalized.includes('gsc')) capabilities.push('google.read_gsc');
  if (normalized.includes('gmail_send')) capabilities.push('google.send_gmail');
  return capabilities;
}

export function connectorGateGoogleAuthorityMissingGroups(request = null, preferredGroup = '', auth = {}) {
  const capabilities = authGrantedGoogleCapabilities(auth);
  const alreadyGranted = (group = '') => {
    const normalized = String(group || '').trim().toLowerCase();
    if (normalized === 'ga4') return capabilities.has('google.read_ga4');
    if (normalized === 'gsc') return capabilities.has('google.read_gsc');
    if (normalized === 'gmail_send') return capabilities.has('google.send_gmail');
    return false;
  };
  return connectorGateGoogleAuthorityConnectGroups(request, preferredGroup)
    .filter((group) => !alreadyGranted(group));
}

export function connectorGateGoogleConnectLabel(groups = []) {
  const normalized = Array.isArray(groups) ? groups : [];
  if (normalized.includes('gmail_send')) return 'Connect Gmail send';
  if (normalized.includes('ga4') && normalized.includes('gsc')) return 'Connect GA4 + Search Console';
  if (normalized.includes('gsc')) return 'Connect Search Console';
  return 'Connect GA4';
}

export function connectorGateAuthorityNeedsApproval(request = null) {
  if (!request || typeof request !== 'object') return false;
  const missingConnectors = listValues(request.missing_connectors || request.missingConnectors || request.connectors);
  const missingCapabilities = listValues(request.missing_connector_capabilities || request.missingConnectorCapabilities || request.capabilities);
  const googleSources = listValues(request.required_google_sources || request.requiredGoogleSources || request.google_source_types || request.googleSourceTypes);
  const reason = String(request.reason || request.message || request.summary || '').trim();
  const source = String(request.source || request.reason_code || request.reasonCode || '').trim().toLowerCase();
  if (source === 'leader_execution_approval') return false;
  const requiredChannelSelection = Boolean(request.required_channel_selection || request.requiredChannelSelection);
  const channelCandidates = listValues(request.channel_candidates || request.channelCandidates || request.channels);
  const writeCapabilities = missingCapabilities.filter((item) => (
    /(post|publish|send|write|submit|create|update|delete|calendar|gmail|email|x\.post|github\.write)/i.test(String(item || ''))
    && !/^google\.read_/i.test(String(item || ''))
  ));
  if (
    source === 'leader_execution_approval'
    && requiredChannelSelection
    && !channelCandidates.length
    && !writeCapabilities.length
  ) {
    return false;
  }
  return Boolean(
    missingConnectors.length
    || missingCapabilities.length
    || googleSources.length
    || requiredChannelSelection
    || /(approval|approve|connector|required|missing|connect|confirm|publish|send|post|承認|接続|未接続|確認|投稿|送信|必要)/i.test(reason)
  );
}

export function connectorGateAuthorityHandledBySaasHandoff(request = null) {
  if (!request || typeof request !== 'object') return false;
  const missingConnectors = listValues(request.missing_connectors || request.missingConnectors || request.connectors)
    .map((item) => String(item || '').trim().toLowerCase())
    .filter(Boolean);
  const missingCapabilities = listValues(request.missing_connector_capabilities || request.missingConnectorCapabilities || request.capabilities)
    .map((item) => String(item || '').trim().toLowerCase())
    .filter(Boolean);
  const googleSources = connectorGateGoogleIncludeGroupsFromAuthority(request);
  const nonXConnectors = missingConnectors.filter((item) => !/^(x|twitter)$/.test(item));
  const nonXCapabilities = missingCapabilities.filter((item) => !/^(x\.post|x\.write|twitter\.post|social\.post)$/.test(item));
  const mentionsXPublish = [...missingConnectors, ...missingCapabilities, request.reason, request.summary, request.message]
    .some((item) => /(^x$|x\.post|twitter|tweet)/i.test(String(item || '')));
  return Boolean(mentionsXPublish && !googleSources.length && !nonXConnectors.length && !nonXCapabilities.length);
}

export function connectorGateAuthorityIsActionable(job = {}, request = null) {
  if (!connectorGateAuthorityNeedsApproval(request)) return false;
  if (connectorGateAuthorityHandledBySaasHandoff(request)) return false;
  const source = String(request?.source || request?.reason_code || request?.reasonCode || '').trim().toLowerCase();
  const status = String(job?.status || '').trim().toLowerCase();
  const failureCategory = String(job?.failureCategory || job?.failure_category || '').trim().toLowerCase();
  const completionStatus = String(job?.dispatch?.completionStatus || job?.dispatch?.completion_status || '').trim().toLowerCase();
  if (
    failureCategory === 'leader_quality_gate_failed'
    || completionStatus === 'leader_quality_gate_failed'
    || /leader quality gate/i.test(String(job?.failureReason || job?.failure_reason || ''))
  ) return false;
  const approvalWaitingStatuses = new Set(['blocked', 'waiting', 'action_required', 'needs_action', 'approval_required', 'connector_required', 'blocked_waiting_for_approval']);
  if (source === 'leader_execution_approval' && status && !approvalWaitingStatuses.has(status)) return false;
  return true;
}

export function connectorGateAuthorityNoticeKey(job = {}) {
  const request = connectorGateAuthorityRequestFromJob(job);
  if (!connectorGateAuthorityIsActionable(job, request)) return '';
  const missingConnectors = listValues(request.missing_connectors || request.missingConnectors || request.connectors);
  const missingCapabilities = listValues(request.missing_connector_capabilities || request.missingConnectorCapabilities || request.capabilities);
  const googleSources = connectorGateGoogleIncludeGroupsFromAuthority(request);
  return [
    String(job.id || '').trim(),
    String(request.reason || request.message || request.summary || '').trim().slice(0, 180),
    missingConnectors.join(','),
    missingCapabilities.join(','),
    googleSources.join(',')
  ].join('|');
}

export function connectorGateApprovalAnchor(job = {}, fallbackOrderId = '') {
  const safeJobId = String(job?.id || fallbackOrderId || '').trim();
  return safeJobId ? `approval-${safeJobId.replace(/[^a-z0-9_-]/gi, '')}` : 'chatThread';
}

export function connectorGateGithubAuthHrefForApproval(options = {}) {
  const origin = options.origin || window.location.origin;
  const url = new URL('/auth/github', origin);
  url.searchParams.set('mode', 'link');
  url.searchParams.set('return_to', options.returnPath || DEFAULT_RETURN_PATH);
  url.searchParams.set('login_source', options.loginSource || 'chatux_github_approval');
  if (options.visitorId) url.searchParams.set('visitor_id', options.visitorId);
  return `${url.pathname}${url.search}`;
}

export function connectorGateGoogleAuthHrefForAuthority(request = null, group = '', options = {}) {
  const origin = options.origin || window.location.origin;
  const groups = connectorGateGoogleAuthorityConnectGroups(request, group);
  const groupKey = groups.join('_') || 'ga4';
  const capabilities = connectorGateGoogleCapabilitiesForGroups(groups);
  const url = new URL('/auth/google', origin);
  url.searchParams.set('action', 'analytics_connect');
  url.searchParams.set('return_to', options.returnPath || DEFAULT_RETURN_PATH);
  url.searchParams.set('login_source', options.loginSource || `chatux_${groupKey}_approval`);
  if (options.visitorId) url.searchParams.set('visitor_id', options.visitorId);
  url.searchParams.set('scope_group', groups.join(','));
  url.searchParams.set('capabilities', capabilities.join(','));
  return `${url.pathname}${url.search}`;
}

export function connectorGateRenderAuthorityRequest(job = {}, options = {}) {
  if (['failed', 'timed_out'].includes(String(job.status || '').trim().toLowerCase())) return '';
  const authority = options.authorityRequest || connectorGateAuthorityRequestFromJob(job);
  if (!connectorGateAuthorityIsActionable(job, authority)) return '';
  const auth = options.auth || {};
  const missingConnectors = listValues(authority.missing_connectors || authority.missingConnectors || authority.connectors);
  const missingCapabilities = listValues(authority.missing_connector_capabilities || authority.missingConnectorCapabilities || authority.capabilities);
  const googleSources = connectorGateGoogleIncludeGroupsFromAuthority(authority);
  const required = [...missingCapabilities, ...missingConnectors].filter(Boolean);
  const reason = String(authority.reason || authority.message || authority.summary || job.failureReason || 'External action requires approval before execution.').trim();
  const googleNeeded = required.some((item) => /^google\.|^google$/i.test(item)) || googleSources.length > 0;
  const githubNeeded = required.some((item) => /^github(?:\.|$)|github\.write_pr|git hub/i.test(item));
  const safeJobId = String(job.id || options.orderId || '').trim();
  const approvalAnchor = connectorGateApprovalAnchor(job, options.orderId || '');
  const actionLinks = [];
  const returnPathForProvider = (provider) => options.returnPathForProvider?.(provider) || options.returnPath || DEFAULT_RETURN_PATH;
  if (googleNeeded && !auth?.loggedIn) {
    actionLinks.push(`<a class="primary-btn inline-btn file-action" href="${escapeHtml(options.loginHref?.('google') || '/auth/google')}">Sign in with Google</a>`);
  } else if (googleNeeded) {
    const nextGoogleGroup = missingCapabilities.includes('google.send_gmail')
      ? 'gmail_send'
      : (googleSources.includes('ga4') ? 'ga4' : (googleSources.includes('gsc') ? 'gsc' : (missingCapabilities.includes('google.read_gsc') ? 'gsc' : 'ga4')));
    const googleGroups = connectorGateGoogleAuthorityMissingGroups(authority, nextGoogleGroup, auth);
    if (googleGroups.length) {
      const googleAuthority = {
        ...(authority || {}),
        required_google_sources: googleGroups,
        missing_connector_capabilities: connectorGateGoogleCapabilitiesForGroups(googleGroups)
      };
      options.saveOAuthState?.(`google_${(googleGroups.join('_') || 'ga4')}_approval`);
      actionLinks.push(`<a class="primary-btn inline-btn file-action" data-chat-oauth-popup="google" href="${escapeHtml(connectorGateGoogleAuthHrefForAuthority(googleAuthority, googleGroups[0], {
        returnPath: returnPathForProvider('google'),
        visitorId: options.visitorId,
        origin: options.origin
      }))}">${escapeHtml(connectorGateGoogleConnectLabel(googleGroups))}</a>`);
    }
  }
  if (githubNeeded && !auth?.loggedIn) {
    actionLinks.push(`<a class="primary-btn inline-btn file-action" href="${escapeHtml(options.loginHref?.('github') || '/auth/github')}">Sign in with GitHub</a>`);
  } else if (githubNeeded && !auth?.githubAuthorized && !auth?.githubLinked) {
    options.saveOAuthState?.('github_approval');
    actionLinks.push(`<a class="primary-btn inline-btn file-action" data-chat-oauth-popup="github" href="${escapeHtml(connectorGateGithubAuthHrefForApproval({
      returnPath: returnPathForProvider('github'),
      visitorId: options.visitorId,
      origin: options.origin
    }))}">Connect GitHub</a>`);
  } else if (githubNeeded && !auth?.githubAuthorized) {
    options.saveOAuthState?.('github_approval');
    actionLinks.push(`<a class="primary-btn inline-btn file-action" data-chat-oauth-popup="github" href="${escapeHtml(connectorGateGithubAuthHrefForApproval({
      returnPath: returnPathForProvider('github'),
      visitorId: options.visitorId,
      origin: options.origin
    }))}">Refresh GitHub access</a>`);
  }
  if (safeJobId) {
    const approvalLabel = actionLinks.length
      ? 'I connected it. Resume order'
      : 'Approve and resume order';
    const style = actionLinks.length ? 'ghost' : 'primary';
    actionLinks.push(`<button class="${style}-btn inline-btn file-action" type="button" data-chat-order-approve="${escapeHtml(safeJobId)}">${escapeHtml(approvalLabel)}</button>`);
  }
  return [
    `<div class="approval-card" id="${escapeHtml(approvalAnchor)}">`,
    '<strong>Step 1: 承認が必要です / Action approval required</strong>',
    `<div>Reason: ${escapeHtml(reason)}</div>`,
    required.length ? `<div>Required: ${escapeHtml(required.join(', '))}</div>` : '',
    googleSources.length ? `<div>Google sources: ${escapeHtml(googleSources.join(', '))}</div>` : '',
    '<div>Status: CAIt has not posted, sent, or published externally yet.</div>',
    actionLinks.length ? `<div class="inline-actions">${actionLinks.join('')}</div>` : '',
    '<span class="chat-hint">Connect or approve only the requested source. CAIt will keep the order in this chat and continue from the same order context.</span>',
    '</div>'
  ].filter(Boolean).join('\n');
}

export function connectorGateOAuthProviderLabel(provider = '') {
  const normalized = String(provider || '').trim().toLowerCase();
  if (normalized === 'github') return 'GitHub';
  if (normalized === 'x' || normalized === 'twitter') return 'X';
  if (normalized === 'google') return 'Google';
  return 'Connector';
}

export function connectorGateOAuthPopupFeatures() {
  const width = 560;
  const height = 760;
  const left = Math.max(0, Math.round((window.screen?.width || width) / 2 - width / 2));
  const top = Math.max(0, Math.round((window.screen?.height || height) / 2 - height / 2));
  return [
    'popup=yes',
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    'resizable=yes',
    'scrollbars=yes'
  ].join(',');
}

export function connectorGateStartOAuthPopupMonitor(popup = null, options = {}) {
  if (!popup) return null;
  const waitMs = Number(options.waitMs || DEFAULT_CONNECT_WAIT_MS);
  const intervalMs = Number(options.intervalMs || DEFAULT_CONNECT_CHECK_INTERVAL_MS);
  const maxChecks = Math.max(1, Math.ceil(waitMs / intervalMs));
  let checks = 0;
  return window.setInterval(() => {
    checks += 1;
    if (popup.closed || checks > maxChecks) {
      options.onClosedOrTimedOut?.();
    }
  }, intervalMs);
}

export function connectorGateOpenOAuthPopup(href = '', options = {}) {
  const target = String(href || '').trim();
  if (!target) return null;
  const popup = window.open(target, options.windowName || 'cait_oauth_connect', connectorGateOAuthPopupFeatures());
  if (!popup) return null;
  try {
    popup.focus();
  } catch {}
  options.onOpened?.(popup);
  return popup;
}

export async function connectorGateHandleOAuthPopupReturnMessage(data = {}, options = {}) {
  const status = String(data.status || '').trim().toLowerCase();
  const provider = String(data.provider || '').trim().toLowerCase();
  const connectorLabel = connectorGateOAuthProviderLabel(provider);
  if (status === 'error') {
    options.onError?.({ connectorLabel, error: data.error || 'auth_failed', data });
    return false;
  }
  options.onSuccess?.({ connectorLabel, data });
  await options.refreshAuth?.();
  await options.afterRefresh?.({ connectorLabel, data });
  return true;
}

export function connectorGateHandleOAuthPopupReturn(options = {}) {
  let url = null;
  try {
    url = new URL(window.location.href);
  } catch {
    return false;
  }
  if (url.searchParams.get('cait_oauth_popup') !== '1') return false;
  const error = String(url.searchParams.get('auth_error') || '').trim();
  const provider = String(url.searchParams.get('cait_oauth_provider') || 'google').trim().toLowerCase();
  const connectorLabel = connectorGateOAuthProviderLabel(provider);
  try {
    window.opener?.postMessage({
      type: 'cait-oauth-return',
      provider,
      status: error ? 'error' : 'ok',
      error,
      sessionId: String(url.searchParams.get('cait_chat_session_id') || '').trim(),
      orderId: String(url.searchParams.get('cait_order_id') || '').trim()
    }, window.location.origin);
  } catch {}
  document.body.innerHTML = [
    `<main class="chatux-shell" aria-label="${escapeHtml(connectorLabel)} connection complete">`,
    '<section class="chatux-panel">',
    '<div class="chatux-thread">',
    '<article class="message system">',
    '<div class="message-meta">Connector</div>',
    `<div class="message-body">${escapeHtml(error ? `${connectorLabel} connection failed: ${error}` : `${connectorLabel} connection completed. Return to the original chat window.`)}</div>`,
    '</article>',
    '</div>',
    '</section>',
    '</main>'
  ].join('');
  window.setTimeout(() => {
    try {
      window.close();
    } catch {}
  }, error ? (options.errorCloseDelayMs || 1800) : (options.successCloseDelayMs || 600));
  return true;
}

export function connectorGateHandleOAuthLinkClick(event, options = {}) {
  const oauthLink = event.target?.closest?.('a[href^="/auth/google"], a[href^="/auth/github"]');
  if (!oauthLink) return false;
  options.saveOAuthState?.('oauth_link_click');
  if (oauthLink.dataset.chatOauthPopup) {
    event.preventDefault();
    const label = String(oauthLink.textContent || 'Connector connection').trim() || 'Connector connection';
    const href = oauthLink.href || oauthLink.getAttribute('href') || '';
    if (!options.openOAuthPopup?.(href, label)) {
      window.location.href = href || options.fallbackReturnPath || DEFAULT_RETURN_PATH;
    }
  }
  return true;
}
