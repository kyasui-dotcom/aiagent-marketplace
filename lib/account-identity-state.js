import { nowIso } from './events.js';

export function normalizeString(value, fallback = '') {
  return String(value ?? fallback).trim();
}

export function normalizeIdentityProvider(value, fallback = 'guest') {
  const text = normalizeString(value, fallback).toLowerCase();
  return text || fallback;
}

export function normalizeEmail(value, fallback = '') {
  return normalizeString(value, fallback).toLowerCase();
}

export function accountIdForLogin(login = '') {
  const safe = String(login || '').trim().toLowerCase();
  return safe ? `acct:${safe}` : 'acct:guest';
}

export function defaultLoginForAuthUser(user = null, authProvider = 'guest') {
  const provider = normalizeIdentityProvider(authProvider, 'guest');
  const login = normalizeString(user?.login).toLowerCase();
  const email = normalizeEmail(user?.email);
  const providerUserId = normalizeString(user?.providerUserId || user?.sub || user?.id).toLowerCase();
  if (provider.startsWith('github')) return login || email || (providerUserId ? `github:${providerUserId}` : '');
  if (provider === 'google-oauth') return email || login || (providerUserId ? `google:${providerUserId}` : '');
  return login || email || '';
}

export function normalizeLinkedIdentityRecord(record = {}) {
  const provider = normalizeIdentityProvider(record.provider || record.authProvider, 'guest');
  const providerUserId = normalizeString(record.providerUserId || record.sub || record.id);
  const login = defaultLoginForAuthUser(record, provider);
  return {
    provider,
    providerUserId,
    login,
    email: normalizeEmail(record.email),
    name: normalizeString(record.name || login),
    avatarUrl: normalizeString(record.avatarUrl || record.picture),
    profileUrl: normalizeString(record.profileUrl),
    linkedAt: normalizeString(record.linkedAt, nowIso())
  };
}

export function normalizeLinkedIdentities(records = []) {
  const next = [];
  const seen = new Set();
  for (const record of Array.isArray(records) ? records : []) {
    const normalized = normalizeLinkedIdentityRecord(record);
    if (!normalized.provider || (!normalized.providerUserId && !normalized.login && !normalized.email)) continue;
    const key = `${normalized.provider}:${normalized.providerUserId || normalized.login || normalized.email}`;
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(normalized);
  }
  return next;
}

export function mergeAliases(...groups) {
  const seen = new Set();
  const next = [];
  for (const group of groups) {
    for (const value of Array.isArray(group) ? group : []) {
      const normalized = normalizeString(value).toLowerCase();
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      next.push(normalized);
    }
  }
  return next;
}

export function linkedIdentitiesForAccount(account = null) {
  return normalizeLinkedIdentities(account?.linkedIdentities || []);
}

export function aliasLoginsForAccount(account = null) {
  return mergeAliases(
    [normalizeString(account?.login).toLowerCase()],
    account?.aliases || [],
    linkedIdentitiesForAccount(account).map((identity) => identity.login)
  );
}

export function accountMatchesLogin(account = null, login = '') {
  const safeLogin = normalizeString(login).toLowerCase();
  if (!safeLogin) return false;
  return aliasLoginsForAccount(account).includes(safeLogin);
}

export function accountMatchesIdentity(account = null, user = null, authProvider = 'guest') {
  const provider = normalizeIdentityProvider(authProvider, 'guest');
  const login = defaultLoginForAuthUser(user, provider);
  const email = normalizeEmail(user?.email);
  const providerUserId = normalizeString(user?.providerUserId || user?.sub || user?.id);
  if (!provider || provider === 'guest') return false;
  return linkedIdentitiesForAccount(account).some((identity) => {
    if (identity.provider !== provider) return false;
    if (providerUserId && identity.providerUserId === providerUserId) return true;
    if (login && identity.login === login) return true;
    if (email && identity.email === email) return true;
    return false;
  });
}

export function findAccountIndexByLogin(state, login = '') {
  return Array.isArray(state?.accounts)
    ? state.accounts.findIndex((item) => accountMatchesLogin(item, login))
    : -1;
}

export function findAccountIndexByIdentity(state, user = null, authProvider = 'guest') {
  return Array.isArray(state?.accounts)
    ? state.accounts.findIndex((item) => accountMatchesIdentity(item, user, authProvider))
    : -1;
}

export function accountIdentityForProvider(account = null, providerPrefix = '') {
  const safePrefix = normalizeString(providerPrefix).toLowerCase();
  if (!safePrefix) return null;
  return linkedIdentitiesForAccount(account).find((identity) => String(identity.provider || '').toLowerCase().startsWith(safePrefix)) || null;
}
