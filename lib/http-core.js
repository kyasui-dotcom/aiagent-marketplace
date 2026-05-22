export const SECURITY_HEADERS = {
  'content-security-policy': [
    "default-src 'self'",
    "script-src 'self' https://www.googletagmanager.com https://www.google-analytics.com https://static.cloudflareinsights.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://analytics.google.com https://www.google.com https://cloudflareinsights.com",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self' https://aiagent-marketplace.net https://www.aiagent-marketplace.net https://github.com https://accounts.google.com https://twitter.com https://x.com https://checkout.stripe.com https://connect.stripe.com",
    'upgrade-insecure-requests'
  ].join('; '),
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()'
};

export function securityHeaders(headers = {}) {
  return { ...SECURITY_HEADERS, ...headers };
}

export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: securityHeaders({ 'content-type': 'application/json; charset=utf-8', ...headers })
  });
}

export function redirect(location, headers = {}) {
  return new Response(null, {
    status: 302,
    headers: securityHeaders({ location, ...headers })
  });
}

export function responseWithCookies(response, cookies = [], extraHeaders = {}) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(key)) headers.set(key, value);
  }
  for (const [key, value] of Object.entries(extraHeaders)) {
    headers.set(key, value);
  }
  if (!cookies.length) {
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
  for (const cookie of cookies) headers.append('Set-Cookie', cookie);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export function redirectWithCookies(location, cookies = [], headers = {}) {
  return responseWithCookies(redirect(location, headers), cookies);
}

export function jsonWithCookies(body, status = 200, cookies = [], headers = {}) {
  return responseWithCookies(json(body, status, headers), cookies);
}

export function parseCookies(request) {
  const raw = String(request.headers.get('cookie') || '');
  return Object.fromEntries(
    raw
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf('=');
        return index === -1
          ? [part, '']
          : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

export function buildCookie(name, value, options = {}) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Secure'
  ];
  if (options.maxAge != null) parts.push(`Max-Age=${options.maxAge}`);
  return parts.join('; ');
}

export function buildReadableCookie(name, value, options = {}) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'SameSite=Lax'
  ];
  if (options.secure !== false) parts.push('Secure');
  if (options.maxAge != null) parts.push(`Max-Age=${options.maxAge}`);
  return parts.join('; ');
}

export function clearCookie(name) {
  return `${name}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`;
}

export function normalizeBaseUrl(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}

export function requestOrigin(request) {
  try {
    return new URL(request.url).origin.replace(/\/$/, '');
  } catch {
    return '';
  }
}

export function configuredBaseUrls(request, env) {
  const urls = new Set();
  const primary = normalizeBaseUrl(env?.PRIMARY_BASE_URL);
  const legacy = normalizeBaseUrl(env?.BASE_URL);
  const current = requestOrigin(request);
  if (primary) urls.add(primary);
  if (legacy) urls.add(legacy);
  for (const part of String(env?.ALLOWED_BASE_URLS || '').split(/[,\s]+/)) {
    const normalized = normalizeBaseUrl(part);
    if (normalized) urls.add(normalized);
  }
  if (current) urls.add(current);
  return urls;
}

export function baseUrl(request, env) {
  return normalizeBaseUrl(env?.PRIMARY_BASE_URL)
    || normalizeBaseUrl(env?.BASE_URL)
    || requestOrigin(request);
}

export function baseUrlFromEnv(env) {
  return normalizeBaseUrl(env?.PRIMARY_BASE_URL)
    || normalizeBaseUrl(env?.BASE_URL)
    || 'https://aiagent-marketplace.net';
}

export function canonicalBrowserRedirect(request, env) {
  if (!['GET', 'HEAD'].includes(String(request.method || '').toUpperCase())) return null;
  const primary = normalizeBaseUrl(env?.PRIMARY_BASE_URL || env?.BASE_URL);
  if (!primary) return null;
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/mock/')) return null;
  const currentOrigin = url.origin.replace(/\/$/, '');
  const primaryOrigin = new URL(primary).origin.replace(/\/$/, '');
  if (currentOrigin === primaryOrigin) return null;
  const allowedOrigins = new Set([...configuredBaseUrls(request, env)].map((item) => new URL(item).origin.replace(/\/$/, '')));
  if (!allowedOrigins.has(currentOrigin)) return null;
  const target = new URL(url.toString());
  const primaryUrl = new URL(primary);
  target.protocol = primaryUrl.protocol;
  target.host = primaryUrl.host;
  return new Response(null, {
    status: 308,
    headers: securityHeaders({ location: target.toString() })
  });
}

export function legacyLegalNoticeRedirect(request) {
  if (!['GET', 'HEAD'].includes(String(request.method || '').toUpperCase())) return null;
  const url = new URL(request.url);
  if (url.pathname !== '/tokushoho' && url.pathname !== '/tokushoho.html') return null;
  url.pathname = '/legal-notice.html';
  return new Response(null, {
    status: 301,
    headers: securityHeaders({ location: `${url.pathname}${url.search}${url.hash}` })
  });
}
