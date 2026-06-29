export function recentJobsApiPath(options = {}) {
  const url = new URL('/api/jobs', options.origin || window.location.origin);
  url.searchParams.set('limit', String(Math.max(1, Math.min(50, Number(options.limit || 30) || 30))));
  if (options.visitorId) url.searchParams.set('visitor_id', options.visitorId);
  return `${url.pathname}${url.search}`;
}

export function visibleJobApiPath(jobId = '', options = {}) {
  const safeId = String(jobId || '').trim();
  const query = new URLSearchParams({
    visitor_id: String(options.visitorId || '')
  });
  if (options.progress === false || options.inspectOnly === true) {
    query.set('progress', '0');
    query.set('inspect_only', '1');
  }
  return `/api/jobs/${encodeURIComponent(safeId)}?${query.toString()}`;
}

export function orderRuntimeCachedJob(recentJobs = [], jobId = '') {
  const safeId = String(jobId || '').trim();
  return (Array.isArray(recentJobs) ? recentJobs : [])
    .find((job) => String(job?.id || '').trim() === safeId) || null;
}

export function orderRuntimeUpsertRecentJob(recentJobs = [], job = {}, maxItems = 50) {
  if (!job?.id) return Array.isArray(recentJobs) ? recentJobs : [];
  return [
    job,
    ...(Array.isArray(recentJobs) ? recentJobs.filter((item) => String(item?.id || '') !== String(job.id)) : [])
  ].slice(0, maxItems);
}

export function orderRuntimeApprovalPayload(visitorId = '', source = 'chat_approval_card') {
  return {
    confirm_approval: true,
    visitor_id: String(visitorId || ''),
    source
  };
}

export function orderRuntimeShouldPauseForApproval(job = {}, approvalWaiting = false) {
  return Boolean(approvalWaiting && String(job.status || '').trim().toLowerCase() === 'blocked');
}

export function orderRuntimePollingContextIsCurrent(options = {}) {
  const state = options.state || {};
  const viewRevision = Number(options.viewRevision || 0) || 0;
  const orderId = String(options.orderId || '').trim();
  return (
    (!viewRevision || Number(state.chatViewRevision || 0) === viewRevision)
    && String(state.orderId || '').trim() === orderId
  );
}
