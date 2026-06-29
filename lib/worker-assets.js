const NO_CACHE_ASSET_PATHS = new Set([
  '/',
  '/index.html',
  '/admin',
  '/admin.html',
  '/admin.css',
  '/admin.js',
  '/provider-identity.html',
  '/provider-identity.js',
  '/chat.html',
  '/home.css',
  '/chat.css',
  '/chat.js',
  '/apps.html',
  '/apps.js',
  '/analytics-console.html',
  '/analytics-console.js',
  '/publisher-approval.html',
  '/publisher-approval.js',
  '/lead-ops.html',
  '/lead-ops.js',
  '/campaign-operations.html',
  '/campaign-operations.js',
  '/ads-ops.html',
  '/ads-ops.js',
  '/growth-ops.html',
  '/growth-ops.js',
  '/pricing-ops.html',
  '/pricing-ops.js',
  '/delivery-manager.html',
  '/delivery-manager.js',
  '/app-console.css',
  '/cait-app-bridge.js',
  '/app-manifest-registry.js',
  '/login',
  '/login.html',
  '/styles.css',
  '/client.js',
  '/client-agent-profile-utils.js',
  '/chat-engine.js',
  '/login.js',
  '/analytics-loader.js',
  '/delivery-action-contract.js',
  '/work-action-registry.js',
  '/work-intent-resolver.js'
]);
const CLIENT_MODULE_PATH_PATTERN = /^\/client-[^/]+\.js$/;

export async function fetchWorkerAsset(request, env, options = {}) {
  if (!env?.ASSETS) return null;
  const responseWithCookies = options.responseWithCookies;
  if (typeof responseWithCookies !== 'function') {
    throw new TypeError('responseWithCookies option is required');
  }
  const assetUrl = new URL(request.url);
  const isNoCacheAsset = request.method === 'GET'
    && (NO_CACHE_ASSET_PATHS.has(assetUrl.pathname) || CLIENT_MODULE_PATH_PATTERN.test(assetUrl.pathname));
  const response = await env.ASSETS.fetch(request);
  if (response.status === 404) return null;
  return responseWithCookies(
    response,
    [],
    isNoCacheAsset ? { 'cache-control': 'no-cache, max-age=0, must-revalidate' } : {}
  );
}
