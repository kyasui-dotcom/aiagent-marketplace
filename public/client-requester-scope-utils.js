export function createClientRequesterScopeUtils(deps = {}) {
  const {
    getState = () => ({})
  } = deps;

  function normalizeRequesterKey(value = '') {
    return String(value || '').trim().toLowerCase();
  }

  function uniqueRequesterKeys(values = []) {
    return [...new Set(values.map((value) => normalizeRequesterKey(value)).filter(Boolean))];
  }

  function requesterContextOfJob(job = {}) {
    const broker = job?.input?._broker && typeof job.input._broker === 'object' ? job.input._broker : {};
    const requester = broker.requester && typeof broker.requester === 'object' ? broker.requester : {};
    return {
      login: normalizeRequesterKey(
        requester.login
        || requester.email
        || job.requesterLogin
        || job.ownerLogin
        || job.login
        || ''
      ),
      accountId: normalizeRequesterKey(
        requester.accountId
        || requester.account_id
        || job.requesterAccountId
        || job.accountId
        || ''
      )
    };
  }

  function requesterLoginOf(job = {}) {
    return requesterContextOfJob(job).login;
  }

  function requesterAccountIdOf(job = {}) {
    return requesterContextOfJob(job).accountId;
  }

  function requesterIdentityKeys(auth = {}) {
    return uniqueRequesterKeys([
      auth.login,
      auth.accountLogin,
      auth.user?.login,
      auth.user?.email,
      auth.githubIdentity?.login,
      auth.githubIdentity?.email,
      auth.googleIdentity?.login,
      auth.googleIdentity?.email,
      ...(Array.isArray(auth.identityLogins) ? auth.identityLogins : [])
    ]);
  }

  function requesterAccountKeys(auth = {}) {
    return uniqueRequesterKeys([
      auth.accountId,
      auth.account?.id,
      auth.user?.accountId,
      auth.githubIdentity?.accountId,
      auth.googleIdentity?.accountId
    ]);
  }

  function requesterScopeForClient(auth = getState()?.snapshot?.auth || {}) {
    const filter = auth?.isPlatformAdmin
      ? normalizeRequesterKey(getState()?.runRequesterFilter || 'all') || 'all'
      : 'mine';
    return {
      filter,
      identityKeys: requesterIdentityKeys(auth),
      accountKeys: requesterAccountKeys(auth),
      isPlatformAdmin: Boolean(auth?.isPlatformAdmin)
    };
  }

  function requesterMatchesScope(login = '', accountId = '', scope = {}) {
    const safeLogin = normalizeRequesterKey(login);
    const safeAccountId = normalizeRequesterKey(accountId);
    const filter = normalizeRequesterKey(scope.filter || 'mine') || 'mine';
    if (filter === 'all' && scope.isPlatformAdmin) return true;
    if (filter && filter !== 'mine') return safeLogin === filter;
    const identityKeys = new Set(scope.identityKeys || []);
    const accountKeys = new Set(scope.accountKeys || []);
    if (safeLogin && identityKeys.has(safeLogin)) return true;
    if (safeAccountId && accountKeys.has(safeAccountId)) return true;
    return !safeLogin && !safeAccountId && !identityKeys.size && !accountKeys.size;
  }

  function runMatchesRequesterScope(job = {}, scope = requesterScopeForClient()) {
    return requesterMatchesScope(requesterLoginOf(job), requesterAccountIdOf(job), scope);
  }

  function recurringOrderMatchesRequesterScope(order = {}, scope = requesterScopeForClient()) {
    const login = normalizeRequesterKey(order.ownerLogin || order.login || order.createdByLogin || '');
    return requesterMatchesScope(login, '', scope);
  }

  return {
    recurringOrderMatchesRequesterScope,
    requesterAccountIdOf,
    requesterIdentityKeys,
    requesterLoginOf,
    requesterMatchesScope,
    requesterScopeForClient,
    runMatchesRequesterScope
  };
}
