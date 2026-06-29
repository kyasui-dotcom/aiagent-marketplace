import { deriveManifestSignalPaths, parseAndValidateManifest } from './manifest.js';
import { isPrivateNetworkHostname } from './shared.js';

export function githubHeaders(token = '') {
  const headers = { accept: 'application/vnd.github+json', 'user-agent': 'aiagent2' };
  if (token) headers.authorization = `Bearer ${token}`;
  return headers;
}

function parseGithubScopesHeader(value) {
  return [...new Set(String(value || '').split(',').map((part) => part.trim()).filter(Boolean))];
}

async function fetchGithubJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error_description || data.error || `Request failed (${response.status})`);
  return data;
}

export async function fetchGithubUserProfile(token) {
  const response = await fetch('https://api.github.com/user', { headers: githubHeaders(token) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error_description || data.error || `Request failed (${response.status})`);
  return { user: data, scopes: parseGithubScopesHeader(response.headers.get('x-oauth-scopes')) };
}

export async function fetchAllGithubRepos(token) {
  const headers = githubHeaders(token);
  const collected = [];
  for (let page = 1; page <= 5; page += 1) {
    const url = `https://api.github.com/user/repos?per_page=100&page=${page}&sort=updated&visibility=all&affiliation=owner,collaborator,organization_member`;
    const repos = await fetchGithubJson(url, { headers });
    if (!Array.isArray(repos) || !repos.length) break;
    collected.push(...repos);
    if (repos.length < 100) break;
  }
  const seen = new Set();
  return collected.filter((repo) => {
    if (!repo?.full_name || seen.has(repo.full_name)) return false;
    seen.add(repo.full_name);
    return true;
  });
}

export async function fetchGithubPublicRepos(userLogin, token = '') {
  const headers = githubHeaders(token);
  const collected = [];
  if (token) {
    try {
      for (let page = 1; page <= 5; page += 1) {
        const url = `https://api.github.com/user/repos?per_page=100&page=${page}&sort=updated&visibility=public&affiliation=owner,collaborator,organization_member`;
        const repos = await fetchGithubJson(url, { headers });
        if (!Array.isArray(repos) || !repos.length) break;
        collected.push(...repos);
        if (repos.length < 100) break;
      }
    } catch {}
  }
  if (!collected.length && userLogin) {
    for (let page = 1; page <= 5; page += 1) {
      const url = `https://api.github.com/users/${encodeURIComponent(userLogin)}/repos?per_page=100&page=${page}&sort=updated&type=owner`;
      const repos = await fetchGithubJson(url, { headers: githubHeaders() });
      if (!Array.isArray(repos) || !repos.length) break;
      collected.push(...repos);
      if (repos.length < 100) break;
    }
  }
  const seen = new Set();
  return collected.filter((repo) => {
    if (!repo?.full_name || repo.private || seen.has(repo.full_name)) return false;
    seen.add(repo.full_name);
    return true;
  });
}

export function githubPrivateRepoImportEnabled(env) {
  return String(env?.GITHUB_ALLOW_PRIVATE_REPO_IMPORT || '').trim() === '1';
}

export function githubGrantedScopes(session) {
  return Array.isArray(session?.githubScopes) ? session.githubScopes : [];
}

export function githubSessionCanReadPrivateRepos(session, env) {
  return githubPrivateRepoImportEnabled(env) && githubGrantedScopes(session).includes('repo');
}

export async function fetchGithubManifestCandidate(sessionToken, owner, repo, branch, candidatePath) {
  const encodedPath = String(candidatePath).split('/').map((part) => encodeURIComponent(part)).join('/');
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`;
  const headers = githubHeaders(sessionToken);
  const response = await fetch(url, {
    headers
  });
  if (response.status === 404) return { ok: false, status: 404, candidatePath };
  if (!response.ok) return { ok: false, status: response.status, candidatePath, error: `GitHub API returned ${response.status}` };
  const payload = await response.json().catch(() => ({}));
  const decoded = payload?.content ? Buffer.from(String(payload.content).replace(/\n/g, ''), 'base64').toString('utf8') : '';
  if (!decoded) return { ok: false, status: 422, candidatePath, error: 'Manifest candidate file is empty' };
  return {
    ok: true,
    candidatePath,
    manifestUrl: `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${candidatePath}`,
    contentType: candidatePath.endsWith('.json') ? 'application/json' : candidatePath.endsWith('.yaml') ? 'application/yaml' : '',
    text: decoded
  };
}

export async function fetchGithubRepoTextFile(sessionToken, owner, repo, branch, filePath) {
  const encodedPath = String(filePath).split('/').map((part) => encodeURIComponent(part)).join('/');
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`;
  const response = await fetch(url, { headers: githubHeaders(sessionToken) });
  if (response.status === 404) return { ok: false, status: 404, path: filePath };
  if (!response.ok) return { ok: false, status: response.status, path: filePath, error: `GitHub API returned ${response.status}` };
  const payload = await response.json().catch(() => ({}));
  const decoded = payload?.content ? Buffer.from(String(payload.content).replace(/\n/g, ''), 'base64').toString('utf8') : '';
  if (!decoded) return { ok: false, status: 422, path: filePath, error: 'Repository file is empty' };
  return {
    ok: true,
    path: filePath,
    text: decoded,
    htmlUrl: payload?.html_url || `https://github.com/${owner}/${repo}/blob/${branch}/${filePath}`
  };
}

export async function loadGithubManifestDraftSignals(sessionToken, owner, repo, branch, repoTreePaths = []) {
  const files = {};
  const attempts = [];
  for (const filePath of deriveManifestSignalPaths(repoTreePaths)) {
    const loaded = await fetchGithubRepoTextFile(sessionToken, owner, repo, branch, filePath);
    attempts.push({ path: filePath, status: loaded.ok ? 200 : loaded.status, error: loaded.error || null });
    if (loaded.ok) files[filePath] = loaded.text;
  }
  return { files, attempts };
}

export async function fetchGithubRepoMeta(owner, repo, sessionToken = '') {
  const url = `https://api.github.com/repos/${owner}/${repo}`;
  const response = await fetch(url, { headers: githubHeaders(sessionToken) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: payload?.message || `GitHub API returned ${response.status}`
    };
  }
  return { ok: true, repo: payload };
}

function githubAppWritePermissionHint() {
  return {
    required_permissions: {
      contents: 'read and write',
      pull_requests: 'read and write',
      metadata: 'read only'
    },
    action: 'Update the CAIt GitHub App permissions, accept the permission change on the installation, then retry adapter PR creation.'
  };
}

export function githubPermissionError(error, fallback = 'GitHub App write access failed') {
  const message = String(error?.message || error?.error || fallback).trim() || fallback;
  const lower = message.toLowerCase();
  const needsPermissionHint = lower.includes('resource not accessible')
    || lower.includes('must have')
    || lower.includes('forbidden')
    || lower.includes('pull request')
    || lower.includes('contents')
    || lower.includes('refusing to allow');
  return {
    error: message,
    ...(needsPermissionHint ? githubAppWritePermissionHint() : {})
  };
}

export function validateManifestUrlInput(manifestUrl, env) {
  let parsed;
  try {
    parsed = new URL(String(manifestUrl || ''));
  } catch {
    throw new Error('manifest_url must be a valid URL');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('manifest_url must use http or https');
  const allowLocal = String(env?.ALLOW_LOCAL_MANIFEST_URLS || '') === '1';
  if (isPrivateNetworkHostname(parsed.hostname) && !allowLocal) {
    throw new Error('Private or local manifest URLs are disabled unless ALLOW_LOCAL_MANIFEST_URLS=1');
  }
  return parsed.toString();
}

export async function loadManifestFromUrl(manifestUrl, env) {
  const safeUrl = validateManifestUrlInput(manifestUrl, env);
  const response = await fetch(safeUrl, {
    headers: { accept: 'application/json, application/yaml;q=0.9, text/plain;q=0.8' }
  });
  if (!response.ok) throw new Error(`Manifest fetch failed (${response.status})`);
  const text = await response.text();
  return parseAndValidateManifest(text, {
    contentType: response.headers.get('content-type') || '',
    sourceUrl: safeUrl
  });
}
