export function createAuthHelpers(deps = {}) {
  const {
    baseUrl,
    fetchStaticAsset,
    getSession,
    maybeRefreshSessionCookie,
    redirect,
    redirectWithCookies,
    responseWithCookies
  } = deps;

  function hasOAuthBaseSession(session = null) {
    return Boolean(session?.accountLogin || session?.user?.login);
  }

  function normalizeLocalRedirectPath(request, env, value = '', fallback = '/') {
    const raw = String(value || '').trim();
    if (!raw) return fallback;
    try {
      const parsed = raw.startsWith('/') && !raw.startsWith('//')
        ? new URL(raw, baseUrl(request, env))
        : new URL(raw, baseUrl(request, env));
      const expectedOrigin = new URL(baseUrl(request, env)).origin;
      if (parsed.origin !== expectedOrigin) return fallback;
      if (parsed.pathname === '/' && String(parsed.searchParams.get('tab') || '').toLowerCase() === 'work') {
        return '/chat';
      }
      if (parsed.pathname === '/chat.html') return `/chat${parsed.search}${parsed.hash}`;
      if (parsed.pathname === '/login.html') return `/login${parsed.search}${parsed.hash}`;
      if (parsed.pathname === '/admin.html') return `/admin${parsed.search}${parsed.hash}`;
      return `${parsed.pathname}${parsed.search}${parsed.hash}` || fallback;
    } catch {
      return fallback;
    }
  }

  function normalizeOAuthLoginSource(value = '') {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40);
  }

  function normalizeOAuthVisitorId(value = '') {
    return String(value || '')
      .trim()
      .replace(/[^a-zA-Z0-9:_-]+/g, '')
      .slice(0, 80);
  }

  function shouldLinkOAuthCallback(cookieState = null, existingSession = null) {
    const action = String(cookieState?.action || '').trim().toLowerCase();
    return ['link', 'connect'].includes(action) || (action === 'analytics_connect' && hasOAuthBaseSession(existingSession));
  }

  function authSuccessRedirectPath(request, env, cookieState = null) {
    return normalizeLocalRedirectPath(request, env, cookieState?.returnTo || '', '/');
  }

  function isLoginPagePath(pathname = '') {
    return pathname === '/login' || pathname === '/login.html';
  }

  function loginPageRedirectPath(request, env) {
    const url = new URL(request.url);
    const target = normalizeLocalRedirectPath(request, env, url.searchParams.get('next') || '', '/chat');
    try {
      const parsed = new URL(target, baseUrl(request, env));
      if (isLoginPagePath(parsed.pathname)) return '/chat';
      return `${parsed.pathname}${parsed.search}${parsed.hash}` || '/chat';
    } catch {
      return '/chat';
    }
  }

  function isChatPagePath(pathname = '') {
    return pathname === '/chat' || pathname === '/chat.html';
  }

  function chatLoginRedirectPath(request, env) {
    const loginUrl = new URL('/login', baseUrl(request, env));
    const current = new URL(request.url);
    const nextPath = current.pathname === '/chat.html' ? '/chat' : current.pathname;
    loginUrl.searchParams.set('next', `${nextPath}${current.search}${current.hash}`);
    loginUrl.searchParams.set('source', 'gate_chat');
    return `${loginUrl.pathname}${loginUrl.search}`;
  }

  function isAdminPagePath(pathname = '') {
    return pathname === '/admin' || pathname === '/admin.html';
  }

  function adminLoginRedirectPath(request, env) {
    const loginUrl = new URL('/login', baseUrl(request, env));
    loginUrl.searchParams.set('next', '/admin');
    loginUrl.searchParams.set('source', 'gate_admin');
    return `${loginUrl.pathname}${loginUrl.search}`;
  }

  async function fetchStaticAssetPath(request, env, pathname, cookies = [], headers = {}) {
    if (!env.ASSETS) return null;
    const assetUrl = new URL(request.url);
    assetUrl.pathname = pathname;
    const response = await fetchStaticAsset(new Request(assetUrl.toString(), request), env);
    if (response.status === 404) return null;
    return responseWithCookies(response, cookies, headers);
  }

  async function handleChatPageRequest(request, env) {
    const session = await getSession(request, env);
    if (!hasOAuthBaseSession(session)) {
      return redirect(chatLoginRedirectPath(request, env), { 'cache-control': 'no-store' });
    }
    const refreshedCookie = await maybeRefreshSessionCookie(session, env);
    const cookies = refreshedCookie ? [refreshedCookie] : [];
    return fetchStaticAssetPath(request, env, '/chat', cookies, { 'cache-control': 'no-store' });
  }

  async function handleAdminPageRequest(request, env) {
    const session = await getSession(request, env);
    const refreshedCookie = await maybeRefreshSessionCookie(session, env);
    const cookies = refreshedCookie ? [refreshedCookie] : [];
    return fetchStaticAssetPath(request, env, '/admin', cookies, { 'cache-control': 'no-store' });
  }

  async function handleLoginPageRequest(request, env) {
    const session = await getSession(request, env);
    if (!hasOAuthBaseSession(session)) {
      return fetchStaticAssetPath(request, env, '/login', [], { 'cache-control': 'no-store' });
    }
    const refreshedCookie = await maybeRefreshSessionCookie(session, env);
    const headers = { 'cache-control': 'no-store' };
    return refreshedCookie
      ? redirectWithCookies(loginPageRedirectPath(request, env), [refreshedCookie], headers)
      : redirect(loginPageRedirectPath(request, env), headers);
  }

  function authFailureRedirectPath(request, env, code = 'auth_failed', cookieState = null) {
    const safeCode = String(code || 'auth_failed').trim() || 'auth_failed';
    if (cookieState?.returnTo && ['link', 'connect', 'analytics_connect'].includes(String(cookieState?.action || '').trim().toLowerCase())) {
      const returnUrl = new URL(authSuccessRedirectPath(request, env, cookieState), baseUrl(request, env));
      returnUrl.searchParams.set('auth_error', safeCode);
      return `${returnUrl.pathname}${returnUrl.search}${returnUrl.hash}`;
    }
    if (cookieState?.action === 'login' && cookieState?.loginSource) {
      const loginUrl = new URL('/login', baseUrl(request, env));
      loginUrl.searchParams.set('auth_error', safeCode);
      loginUrl.searchParams.set('source', cookieState.loginSource);
      if (cookieState.returnTo) loginUrl.searchParams.set('next', authSuccessRedirectPath(request, env, cookieState));
      if (cookieState.visitorId) loginUrl.searchParams.set('visitor_id', cookieState.visitorId);
      return `${loginUrl.pathname}${loginUrl.search}`;
    }
    return `/?auth_error=${encodeURIComponent(safeCode)}`;
  }

  return {
    adminLoginRedirectPath,
    authFailureRedirectPath,
    authSuccessRedirectPath,
    chatLoginRedirectPath,
    fetchStaticAssetPath,
    handleAdminPageRequest,
    handleChatPageRequest,
    handleLoginPageRequest,
    hasOAuthBaseSession,
    isAdminPagePath,
    isChatPagePath,
    isLoginPagePath,
    loginPageRedirectPath,
    normalizeLocalRedirectPath,
    normalizeOAuthLoginSource,
    normalizeOAuthVisitorId,
    shouldLinkOAuthCallback
  };
}
