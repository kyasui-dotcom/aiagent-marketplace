export function createPublicReadModelHelpers(deps = {}) {
  const {
    agentLinksFromRecord,
    agentTagsFromRecord,
    isCoreFeatureAppId,
    sanitizeAppForPublic,
    sanitizeManifestForPublic
  } = deps;

  function billingAuditEvents(events = []) {
    return events
      .filter((event) => event.type === 'BILLING_AUDIT' && event.meta?.kind === 'billing_audit')
      .map((event) => ({ id: event.id, ...event.meta, message: event.message }));
  }

  function statsOf(state) {
    const completed = state.jobs.filter((j) => j.actualBilling);
    const grossVolume = completed.reduce((n, j) => n + (j.actualBilling?.total || 0), 0);
    const api = completed.reduce((n, j) => n + (j.actualBilling?.apiCost || 0), 0);
    const rev = completed.reduce((n, j) => n + (j.actualBilling?.platformRevenue || 0), 0);
    const retryableRuns = state.jobs.filter((j) => j.dispatch?.retryable === true).length;
    const timedOutRuns = state.jobs.filter((j) => j.status === 'timed_out').length;
    const terminalRuns = state.jobs.filter((j) => ['completed', 'failed', 'timed_out'].includes(j.status)).length;
    const nextRetryAt = state.jobs
      .map((j) => j.dispatch?.nextRetryAt || null)
      .filter(Boolean)
      .sort()[0] || null;
    return {
      activeJobs: state.jobs.filter((j) => ['queued', 'claimed', 'running', 'dispatched'].includes(j.status)).length,
      onlineAgents: state.agents.filter((a) => a.online).length,
      registeredApps: Array.isArray(state.apps)
        ? state.apps.filter((app) => app?.id && !isCoreFeatureAppId(app.id) && String(app?.status || '').toLowerCase() !== 'deprecated').length
        : 0,
      grossVolume: +grossVolume.toFixed(1),
      todayCost: +api.toFixed(1),
      platformRevenue: +rev.toFixed(1),
      failedJobs: state.jobs.filter((j) => j.status === 'failed').length,
      retryableRuns,
      timedOutRuns,
      terminalRuns,
      nextRetryAt,
      totalJobs: state.jobs.length
    };
  }

  function publicAgent(agent, catalog = []) {
    const metadata = agent?.metadata && typeof agent.metadata === 'object' ? agent.metadata : {};
    if (
      metadata.hidden_from_catalog
      || metadata.not_routable
      || metadata.deleted_at
      || metadata.deletedAt
      || String(agent?.verificationStatus || '').toLowerCase() === 'deprecated'
    ) return null;
    const { token, ...rest } = agent;
    const cloned = structuredClone(rest);
    const tags = agentTagsFromRecord(cloned);
    if (tags.length) cloned.tags = tags;
    if (cloned.metadata?.manifest) cloned.metadata.manifest = sanitizeManifestForPublic(cloned.metadata.manifest);
    if (!cloned.trust && cloned.metadata?.trust && typeof cloned.metadata.trust === 'object') {
      cloned.trust = structuredClone(cloned.metadata.trust);
    }
    cloned.links = agentLinksFromRecord(cloned, { catalog });
    return cloned;
  }

  function publicApp(app) {
    const metadata = app?.metadata && typeof app.metadata === 'object' ? app.metadata : {};
    if (
      isCoreFeatureAppId(app?.id)
      || !app?.id
      || metadata.hidden_from_catalog
      || metadata.deleted_at
      || metadata.deletedAt
      || String(app?.status || '').toLowerCase() === 'deprecated'
    ) return null;
    return sanitizeAppForPublic(app);
  }

  function cloneJob(job) {
    return job ? structuredClone(job) : null;
  }

  return {
    billingAuditEvents,
    statsOf,
    publicAgent,
    publicApp,
    cloneJob
  };
}
