import { BUILT_IN_KINDS, builtInAgentHealthPayload, runBuiltInAgent } from './builtin-agents.js';
import { sampleKindFromAgent } from './verify.js';

export function localAgentEndpointMatch(pathname = '') {
  const path = String(pathname || '').trim();
  const match = path.match(/^\/mock\/([^/]+)\/(health|jobs)$/);
  const kind = String(match?.[1] || '').trim().toLowerCase();
  const route = String(match?.[2] || '').trim().toLowerCase();
  if (!BUILT_IN_KINDS.includes(kind)) return null;
  return { kind, route, path };
}

function localAgentKindFromAgent(agent = {}) {
  const sampleKind = sampleKindFromAgent(agent);
  if (sampleKind) return sampleKind;
  const manifestUrl = String(agent?.manifestUrl || agent?.manifest_url || agent?.metadata?.manifestUrl || agent?.metadata?.manifest_url || '').trim().toLowerCase();
  if (!manifestUrl.startsWith('built-in://')) return '';
  const kind = manifestUrl.slice('built-in://'.length).split(/[?#]/)[0].trim();
  return BUILT_IN_KINDS.includes(kind) ? kind : '';
}

export function agentCanInvokeLocalEndpoint(agent = {}, pathname = '') {
  const match = localAgentEndpointMatch(pathname);
  if (!match || match.route !== 'jobs') return false;
  return localAgentKindFromAgent(agent) === match.kind;
}

export function localAgentHealthPayload(kind = '', env = {}) {
  const normalized = String(kind || '').trim().toLowerCase();
  if (!BUILT_IN_KINDS.includes(normalized)) return null;
  return builtInAgentHealthPayload(normalized, env);
}

export async function runLocalAgentJobEndpoint(kind = '', body = {}, env = {}) {
  const normalized = String(kind || '').trim().toLowerCase();
  if (!BUILT_IN_KINDS.includes(normalized)) {
    const error = new Error('Unknown local agent endpoint');
    error.statusCode = 404;
    throw error;
  }
  return runBuiltInAgent(normalized, body, env);
}

export async function invokeLocalAgentJobEndpoint(pathname = '', payload = {}, env = {}, agent = {}) {
  const match = localAgentEndpointMatch(pathname);
  if (!match || match.route !== 'jobs') return null;
  if (!agentCanInvokeLocalEndpoint(agent, pathname)) return null;
  return {
    body: await runLocalAgentJobEndpoint(match.kind, payload, env),
    kind: match.kind,
    endpoint: match.path
  };
}
