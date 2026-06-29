import { createHash, randomUUID } from 'node:crypto';
import { normalizeBoolean } from './billing-policy.js';
import { nowIso } from './events.js';
import { normalizeString } from './account-identity-state.js';

const API_KEY_LABEL_MAX_LENGTH = 80;
const CAIT_API_KEY_SCOPES = ['order:create', 'order:read', 'agent:create', 'agent:write', 'agent:read'];

function cleanApiKeyLabel(value = '') {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeApiKeyLabel(value, fallback = 'default') {
  const text = cleanApiKeyLabel(value);
  const fallbackText = cleanApiKeyLabel(fallback);
  return (text || fallbackText).slice(0, API_KEY_LABEL_MAX_LENGTH);
}

function requireApiKeyIssueLabel(value) {
  const label = cleanApiKeyLabel(value);
  if (!label) throw new Error('API key title is required.');
  if (label.length > API_KEY_LABEL_MAX_LENGTH) {
    throw new Error(`API key title must be ${API_KEY_LABEL_MAX_LENGTH} characters or fewer.`);
  }
  return label;
}

function normalizeApiKeyMode(value, fallback = 'live') {
  const text = normalizeString(value, fallback).toLowerCase();
  return ['live', 'test'].includes(text) ? text : fallback;
}

export function hashSecret(value = '') {
  return createHash('sha256').update(String(value || ''), 'utf8').digest('hex');
}

function normalizeCaitApiKeyScopes(scopes = []) {
  const rawScopes = Array.isArray(scopes) ? scopes : [];
  return [...new Set([
    ...rawScopes.map((scope) => normalizeString(scope)).filter(Boolean),
    ...CAIT_API_KEY_SCOPES
  ])];
}

export function sanitizeOrderApiKeyRecord(record = {}) {
  return {
    id: normalizeString(record.id),
    label: normalizeApiKeyLabel(record.label),
    mode: normalizeApiKeyMode(record.mode, 'live'),
    prefix: normalizeString(record.prefix),
    scopes: normalizeCaitApiKeyScopes(record.scopes),
    createdAt: normalizeString(record.createdAt, nowIso()),
    lastUsedAt: normalizeString(record.lastUsedAt),
    lastUsedPath: normalizeString(record.lastUsedPath),
    lastUsedMethod: normalizeString(record.lastUsedMethod).toUpperCase(),
    revokedAt: normalizeString(record.revokedAt),
    active: !normalizeString(record.revokedAt)
  };
}

export function normalizeOrderApiKeyRecord(record = {}) {
  return {
    ...sanitizeOrderApiKeyRecord(record),
    keyHash: normalizeString(record.keyHash)
  };
}

export function normalizeApiAccessPatch(patch = {}, base = {}) {
  const orderKeysSource = Array.isArray(patch.orderKeys) ? patch.orderKeys : Array.isArray(base.orderKeys) ? base.orderKeys : [];
  return {
    orderKeys: orderKeysSource.map(normalizeOrderApiKeyRecord)
  };
}

function sanitizeGithubAppInstallation(record = {}) {
  return {
    id: normalizeString(record.id),
    accountLogin: normalizeString(record.accountLogin || record.account_login),
    targetType: normalizeString(record.targetType || record.target_type),
    repositorySelection: normalizeString(record.repositorySelection || record.repository_selection),
    htmlUrl: normalizeString(record.htmlUrl || record.html_url)
  };
}

function sanitizeGithubAppRepo(record = {}) {
  return {
    id: normalizeString(record.id),
    name: normalizeString(record.name),
    fullName: normalizeString(record.fullName || record.full_name),
    description: normalizeString(record.description),
    homepage: normalizeString(record.homepage),
    private: normalizeBoolean(record.private, false),
    defaultBranch: normalizeString(record.defaultBranch || record.default_branch),
    htmlUrl: normalizeString(record.htmlUrl || record.html_url),
    owner: normalizeString(record.owner),
    installationId: normalizeString(record.installationId || record.installation_id),
    installationAccountLogin: normalizeString(record.installationAccountLogin || record.installation_account_login),
    installationTargetType: normalizeString(record.installationTargetType || record.installation_target_type)
  };
}

export function normalizeGithubAppAccessPatch(patch = {}, base = {}) {
  const installationsSource = Array.isArray(patch.installations) ? patch.installations : Array.isArray(base.installations) ? base.installations : [];
  const reposSource = Array.isArray(patch.repos) ? patch.repos : Array.isArray(base.repos) ? base.repos : [];
  return {
    installations: installationsSource.map(sanitizeGithubAppInstallation).filter((item) => item.id),
    repos: reposSource.map(sanitizeGithubAppRepo).filter((item) => item.fullName && item.installationId),
    updatedAt: normalizeString(patch.updatedAt || patch.updated_at || base.updatedAt)
  };
}

export function sanitizeExecutorPreferencesPatch(patch = {}, base = {}) {
  const googlePatch = patch?.google && typeof patch.google === 'object' ? patch.google : {};
  const googleBase = base?.google && typeof base.google === 'object' ? base.google : {};
  const githubPatch = patch?.github && typeof patch.github === 'object' ? patch.github : {};
  const githubBase = base?.github && typeof base.github === 'object' ? base.github : {};
  const xPatch = patch?.x && typeof patch.x === 'object' ? patch.x : {};
  const xBase = base?.x && typeof base.x === 'object' ? base.x : {};
  return {
    google: {
      searchConsoleSite: normalizeString(googlePatch.searchConsoleSite ?? googleBase.searchConsoleSite),
      ga4Property: normalizeString(googlePatch.ga4Property ?? googleBase.ga4Property),
      driveFileId: normalizeString(googlePatch.driveFileId ?? googleBase.driveFileId),
      calendarId: normalizeString(googlePatch.calendarId ?? googleBase.calendarId),
      gmailLabelId: normalizeString(googlePatch.gmailLabelId ?? googleBase.gmailLabelId)
    },
    github: {
      repoFullName: normalizeString(githubPatch.repoFullName ?? githubBase.repoFullName)
    },
    x: {
      channel: normalizeString(xPatch.channel ?? xBase.channel),
      actionMode: normalizeString(xPatch.actionMode ?? xBase.actionMode)
    }
  };
}

export function orderApiKeysForAccount(account = null) {
  return (account?.apiAccess?.orderKeys || []).map(sanitizeOrderApiKeyRecord);
}

export function createOrderApiKeyInStateWithDeps(state, login, user = null, authProvider = 'guest', options = {}, deps = {}) {
  const label = requireApiKeyIssueLabel(options.label);
  const account = deps.upsertAccountSettingsInState(state, login, user, authProvider, {});
  const now = nowIso();
  const mode = normalizeApiKeyMode(options.mode, 'live');
  const tokenPrefix = mode === 'test' ? 'ai2kt_' : 'ai2k_';
  const token = `${tokenPrefix}${randomUUID().replace(/-/g, '')}${randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const record = normalizeOrderApiKeyRecord({
    id: `key_${randomUUID()}`,
    label,
    mode,
    prefix: token.slice(0, 16),
    keyHash: hashSecret(token),
    scopes: CAIT_API_KEY_SCOPES,
    createdAt: now,
    lastUsedAt: '',
    lastUsedPath: '',
    lastUsedMethod: '',
    revokedAt: ''
  });
  const nextKeys = [record, ...(account.apiAccess?.orderKeys || []).map(normalizeOrderApiKeyRecord)];
  account.apiAccess = normalizeApiAccessPatch({ orderKeys: nextKeys }, account.apiAccess || {});
  account.updatedAt = now;
  const index = deps.findAccountIndexByLogin(state, login);
  if (index === -1) state.accounts.unshift(account);
  else state.accounts[index] = account;
  return {
    account,
    apiKey: {
      ...sanitizeOrderApiKeyRecord(record),
      token
    }
  };
}

export function revokeOrderApiKeyInStateWithDeps(state, login, keyId, user = null, authProvider = 'guest', deps = {}) {
  const safeLogin = normalizeString(login);
  const account = deps.accountSettingsForLogin(state, safeLogin, user ? { ...user, login: safeLogin } : { login: safeLogin }, authProvider);
  const nextKeys = (account.apiAccess?.orderKeys || []).map((record) => {
    const normalized = normalizeOrderApiKeyRecord(record);
    if (normalized.id !== keyId) return normalized;
    return {
      ...normalized,
      revokedAt: normalized.revokedAt || nowIso()
    };
  });
  const target = nextKeys.find((record) => record.id === keyId) || null;
  if (!target) return null;
  account.apiAccess = normalizeApiAccessPatch({ orderKeys: nextKeys }, account.apiAccess || {});
  account.updatedAt = nowIso();
  const index = deps.findAccountIndexByLogin(state, safeLogin);
  if (index === -1) state.accounts.unshift(account);
  else state.accounts[index] = account;
  return {
    account,
    apiKey: sanitizeOrderApiKeyRecord(target)
  };
}

export function authenticateOrderApiKey(state, rawKey = '') {
  const token = normalizeString(rawKey);
  if (!token) return null;
  const keyHash = hashSecret(token);
  for (const account of Array.isArray(state?.accounts) ? state.accounts : []) {
    if (account?.deletedAt || account?.deleted_at) continue;
    for (const record of account?.apiAccess?.orderKeys || []) {
      const normalized = normalizeOrderApiKeyRecord(record);
      if (normalized.revokedAt) continue;
      if (normalized.keyHash && normalized.keyHash === keyHash) {
        return {
          account,
          apiKey: sanitizeOrderApiKeyRecord(normalized),
          keyKind: 'cait'
        };
      }
    }
  }
  return null;
}

export function touchOrderApiKeyUsageInStateWithDeps(state, login, keyId, meta = {}, deps = {}) {
  const safeLogin = normalizeString(login);
  const index = deps.findAccountIndexByLogin(state, safeLogin);
  if (index === -1) return null;
  const account = state.accounts[index];
  let matched = null;
  const currentApiAccess = account?.apiAccess && typeof account.apiAccess === 'object' ? account.apiAccess : {};
  const nextKeys = (currentApiAccess.orderKeys || []).map((record) => {
    const normalized = normalizeOrderApiKeyRecord(record);
    if (normalized.id !== keyId || normalized.revokedAt) return normalized;
    const keyHash = normalized.keyHash || normalizeString(record?.keyHash || record?.key_hash);
    matched = {
      ...normalized,
      keyHash,
      lastUsedAt: nowIso(),
      lastUsedPath: normalizeString(meta.lastUsedPath),
      lastUsedMethod: normalizeString(meta.lastUsedMethod).toUpperCase()
    };
    return matched;
  });
  if (!matched) return null;
  account.apiAccess = normalizeApiAccessPatch({ orderKeys: nextKeys }, currentApiAccess);
  account.updatedAt = nowIso();
  state.accounts[index] = account;
  return {
    account,
    apiKey: sanitizeOrderApiKeyRecord(matched)
  };
}
