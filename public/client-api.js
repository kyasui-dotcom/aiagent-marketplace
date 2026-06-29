export function waitForNetworkRetry(ms = 0) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, Math.max(0, Number(ms || 0))));
}

export function isRetriableFetchError(error = null) {
  const message = String(error?.message || error || '').toLowerCase();
  return /failed to fetch|networkerror|load failed|network request failed/.test(message);
}

export async function fetchWithNetworkRetry(url, options = {}) {
  const { retryAttempts, ...fetchOptions } = options || {};
  const attempts = Math.max(1, Number(retryAttempts || 1) || 1);
  let lastError = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fetch(url, fetchOptions);
    } catch (error) {
      lastError = error;
      if (!isRetriableFetchError(error) || attempt >= attempts - 1) break;
      await waitForNetworkRetry(450);
    }
  }
  throw lastError;
}

export function createClientApiClient(hooks = {}) {
  const {
    getCsrfToken = () => '',
    isLoggedIn = () => false,
    onSessionExpired = () => {},
    onUnauthorized = () => {},
    githubConnectionLabel = () => 'CONNECT GITHUB'
  } = hooks || {};

  return async function api(url, options = {}) {
    const { preserveAuthOn401 = false, ...requestOptions } = options || {};
    const method = String(requestOptions.method || 'GET').toUpperCase();
    const headers = new Headers(requestOptions.headers || {});
    if (!headers.has('content-type')) headers.set('content-type', 'application/json');
    const csrfToken = String(getCsrfToken() || '');
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && csrfToken && !headers.has('x-aiagent2-csrf')) {
      headers.set('x-aiagent2-csrf', csrfToken);
    }
    let response = null;
    try {
      response = await fetchWithNetworkRetry(url, {
        ...requestOptions,
        method,
        headers,
        retryAttempts: ['GET', 'HEAD', 'OPTIONS'].includes(method) ? 2 : 1
      });
    } catch (error) {
      const networkError = new Error('Network request failed after retry. Reload the page once, then retry the action. If this continues, the API path or browser session needs inspection.');
      networkError.cause = error;
      throw networkError;
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) {
        const message = String(data?.error || '').trim() || 'Session expired.';
        const githubLinkRequired = message === 'GitHub connection required' && Boolean(isLoggedIn());
        if (!preserveAuthOn401 && !githubLinkRequired) {
          onSessionExpired();
        }
        if (!preserveAuthOn401) {
          onUnauthorized();
        }
        if (githubLinkRequired) {
          throw new Error(`GitHub connection required.\n\nUse ${githubConnectionLabel()} and complete the GitHub link, then retry.`);
        }
        throw new Error(`${message}\n\nIf you already logged in, open LOGOUT and sign in again.`);
      }
      const details = [];
      if (data?.error) details.push(String(data.error).trim());
      if (data?.action) details.push(String(data.action).trim());
      if (data?.required_permissions && typeof data.required_permissions === 'object') {
        const permissions = Object.entries(data.required_permissions)
          .map(([key, value]) => `${key}=${value}`)
          .join(', ');
        if (permissions) details.push(`Required GitHub App permissions: ${permissions}`);
      }
      if (Array.isArray(data?.supported_frameworks) && data.supported_frameworks.length) {
        details.push(`Supported frameworks right now: ${data.supported_frameworks.join(', ')}`);
      }
      if (data?.path) details.push(`Blocking file: ${data.path}`);
      const error = new Error(details.filter(Boolean).join('\n') || `Request failed (${response.status})`);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  };
}
