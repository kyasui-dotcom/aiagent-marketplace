export function hasLinkedProvider(auth, providerPrefix) {
  const providers = Array.isArray(auth?.linkedProviders) ? auth.linkedProviders : [];
  return providers.some((value) => String(value || '').toLowerCase().startsWith(String(providerPrefix || '').toLowerCase()));
}

export function canOrderFromBrowser(auth) {
  return Boolean(auth?.openWriteApiEnabled || auth?.canOrder || auth?.loggedIn);
}

export function canManagePaymentsFromBrowser(auth) {
  return Boolean(auth?.openWriteApiEnabled || auth?.canManagePayments || auth?.loggedIn);
}

export function canManageAgentsFromBrowser(auth) {
  return Boolean(auth?.openWriteApiEnabled || auth?.canRegisterAgents);
}

export function canUseGithubAgentFlow(auth) {
  return Boolean(auth?.openWriteApiEnabled || auth?.canUseGithubAgentFlow || auth?.githubLinked || hasLinkedProvider(auth, 'github'));
}

export function canManagePayoutsFromBrowser(auth) {
  return Boolean(auth?.openWriteApiEnabled || auth?.canManagePayouts);
}

export function isGithubLinked(auth) {
  return Boolean(auth?.githubLinked || hasLinkedProvider(auth, 'github'));
}

export function isGoogleLinked(auth) {
  return Boolean(auth?.googleLinked || hasLinkedProvider(auth, 'google'));
}

export function isGithubAuthorized(auth) {
  return Boolean(auth?.githubAuthorized || auth?.canUseGithubAgentFlow || auth?.authProvider === 'github-app' || auth?.authProvider === 'github-oauth');
}

export function isGoogleAuthorized(auth) {
  return Boolean(auth?.googleAuthorized || auth?.authProvider === 'google-oauth');
}

export function primarySignInUrl(auth = {}) {
  if (auth?.googleConfigured) return '/auth/google';
  if (auth?.githubConfigured || auth?.githubAppConfigured) return '/auth/github';
  return '/auth/github';
}

export function googleAuthActionUrl(auth = {}, options = {}) {
  if (!auth?.loggedIn) return '/auth/google';
  const capabilities = Array.isArray(options.capabilities)
    ? options.capabilities
    : String(options.capabilities || '').split(/[,\s]+/).filter(Boolean);
  const url = new URL('/auth/google', window.location.origin);
  url.searchParams.set('action', 'analytics_connect');
  url.searchParams.set('return_to', '/chat');
  url.searchParams.set('login_source', 'connect_google');
  const requested = capabilities.length ? capabilities : [];
  if (requested.length) url.searchParams.set('capabilities', requested.join(','));
  return `${url.pathname}${url.search}`;
}

export function githubAuthActionUrl(auth = {}) {
  return auth?.loggedIn ? '/auth/github?mode=link' : '/auth/github';
}

export function linkedProvidersLabel(auth = {}) {
  const providers = [];
  if (hasLinkedProvider(auth, 'google')) providers.push('google');
  if (hasLinkedProvider(auth, 'github-app')) providers.push('github-app');
  else if (hasLinkedProvider(auth, 'github')) providers.push('github');
  return providers.length ? providers.join(', ') : '-';
}

export function isLikelyRestrictedGoogleOAuthBrowser() {
  const ua = String(window.navigator.userAgent || '').toLowerCase();
  if (!ua) return false;
  return [
    ' fban/',
    ' fbav/',
    'instagram',
    'line/',
    'micromessenger',
    '; wv',
    'electron',
    'producthunt',
    'twitter',
    'x-webview'
  ].some((token) => ua.includes(token.trim()));
}

export function googleOAuthBrowserWarning() {
  return 'Google sign-in may be blocked in this in-app browser. If Google shows a security warning, open aiagent-marketplace.net in Chrome, Edge, or Safari and sign in there.';
}

export function canUseDevApi(auth) {
  return Boolean(auth?.developerApiEnabled || auth?.devApiEnabled);
}

export function activeApiKeys(list = []) {
  return (Array.isArray(list) ? list : []).filter((item) => !item?.revokedAt);
}
