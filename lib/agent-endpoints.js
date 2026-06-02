export function createAgentEndpointHelpers({
  baseUrlFromEnv,
  isAgentReviewApproved
} = {}) {
  function sampleAgentSelfDispatchBaseUrl(env = {}) {
    const raw = String(env?.SAMPLE_AGENT_SELF_DISPATCH_BASE_URL || env?.SAMPLE_AGENT_INTERNAL_BASE_URL || '').trim();
    if (!raw) return '';
    try {
      const parsed = new URL(raw);
      return parsed.toString().replace(/\/+$/, '');
    } catch {
      return '';
    }
  }

  function sampleAgentSelfDispatchUrl(value = '', env = {}) {
    const base = sampleAgentSelfDispatchBaseUrl(env);
    if (!base) return '';
    let parsed;
    try {
      parsed = new URL(value);
    } catch {
      return '';
    }
    const match = parsed.pathname.match(/^\/sample-agents\/(.+)$/);
    if (!match) return '';
    return `${base}/${match[1]}${parsed.search}`;
  }

  function isAgentVerified(agent) {
    return agent?.verificationStatus === 'verified' && isAgentReviewApproved(agent);
  }

  function resolveAgentJobEndpoint(agent) {
    const manifest = agent?.metadata?.manifest || {};
    const rootMetadata = agent?.metadata && typeof agent.metadata === 'object' ? agent.metadata : {};
    const manifestMetadata = manifest.metadata && typeof manifest.metadata === 'object' ? manifest.metadata : {};
    const endpoints = manifest.endpoints && typeof manifest.endpoints === 'object' ? manifest.endpoints : {};
    const metadataEndpoints = rootMetadata.endpoints && typeof rootMetadata.endpoints === 'object' ? rootMetadata.endpoints : {};
    const candidates = [
      manifest.jobEndpoint,
      manifest.job_endpoint,
      manifest.jobsUrl,
      manifest.jobs_url,
      manifestMetadata.job_endpoint,
      manifestMetadata.jobEndpoint,
      endpoints.jobs,
      endpoints.job,
      endpoints.dispatch,
      endpoints.submit,
      rootMetadata.job_endpoint,
      rootMetadata.jobEndpoint,
      metadataEndpoints.jobs,
      metadataEndpoints.job,
      metadataEndpoints.dispatch,
      metadataEndpoints.submit
    ];
    for (const candidate of candidates) {
      const value = String(candidate || '').trim();
      if (value) return value;
    }
    return '';
  }

  function resolveDispatchEndpointUrl(endpoint = '', env = {}) {
    const value = String(endpoint || '').trim();
    if (!value) return '';
    try {
      return sampleAgentSelfDispatchUrl(value, env) || new URL(value).toString();
    } catch {}
    if (value.startsWith('/')) return `${baseUrlFromEnv(env)}${value}`;
    return value;
  }

  function callbackTokenForJob() {
    return crypto.randomUUID().replace(/-/g, '');
  }

  function extractCallbackToken(request, body = {}) {
    const auth = String(request.headers.get('authorization') || '').trim();
    if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
    const headerToken = String(request.headers.get('x-callback-token') || '').trim();
    if (headerToken) return headerToken;
    return String(body.callback_token || '').trim();
  }

  return {
    callbackTokenForJob,
    extractCallbackToken,
    isAgentVerified,
    resolveAgentJobEndpoint,
    resolveDispatchEndpointUrl
  };
}
