import { normalizeUsageForBilling } from './usage-accounting.js';

export function createAgentResultPayloadHelpers({
  isBlockedAgentResultStatus,
  providerAuthorityRequestFromPayload
} = {}) {
  function normalizeAgentReportPayload(payload = {}, reportCandidate = null) {
    const report = reportCandidate && typeof reportCandidate === 'object'
      ? { ...reportCandidate }
      : { summary: String(reportCandidate || payload?.summary || 'No report provided.') };
    const authorityRequest = providerAuthorityRequestFromPayload(payload);
    if (
      authorityRequest
      && !report.authority_request
      && !report.authorityRequest
      && !report.action_required
      && !report.actionRequired
      && !report.executor_request
      && !report.executorRequest
    ) {
      report.authority_request = authorityRequest;
    }
    return report;
  }

  function topLevelAgentReportCandidate(body = {}) {
    if (!body || typeof body !== 'object') return { summary: 'No report provided.' };
    if (body.report && typeof body.report === 'object') return body.report;
    if (body.output && typeof body.output === 'object') return body.output;
    const hasReportLikeTopLevel = [
      body.summary,
      body.report_summary,
      body.reportSummary,
      body.answer,
      body.recommendation,
      body.file_markdown,
      body.markdown,
      body.deliverableMarkdown,
      body.deliverable_markdown,
      Array.isArray(body.artifacts) && body.artifacts.length,
      Array.isArray(body.approval_requests) && body.approval_requests.length,
      Array.isArray(body.approvalRequests) && body.approvalRequests.length,
      Array.isArray(body.bullets) && body.bullets.length
    ].some(Boolean);
    return hasReportLikeTopLevel ? body : { summary: body.summary || 'No report provided.' };
  }

  function normalizeCallbackPayload(body = {}) {
    const payload = body && typeof body === 'object' ? body : {};
    const status = String(payload.status || (payload.failure_reason || payload.error ? 'failed' : 'completed')).trim().toLowerCase();
    const normalizedStatus = status === 'failed' ? 'failed' : (isBlockedAgentResultStatus(status) ? 'blocked' : 'completed');
    const reportCandidate = payload.report || payload.output || topLevelAgentReportCandidate({
      ...payload,
      summary: payload.summary || (
        normalizedStatus === 'failed'
          ? 'Agent reported failure'
          : (normalizedStatus === 'blocked' ? 'Agent is blocked pending approval or connector setup' : payload.summary)
      )
    });
    const report = normalizeAgentReportPayload(payload, reportCandidate);
    const providerDetail = String(payload.detail || payload.details || '').trim();
    const providerError = String(payload.error || '').trim();
    const failureReason = payload.failure_reason
      || payload.failureReason
      || (providerError && providerDetail ? `${providerError}: ${providerDetail}` : providerError)
      || (normalizedStatus === 'failed' ? (report.summary || payload.summary || 'Agent reported failure without a detailed reason.') : null);
    return {
      status: normalizedStatus,
      report,
      files: Array.isArray(payload.files) ? payload.files : [],
      usage: normalizeUsageForBilling(payload.usage, 100),
      returnTargets: payload.return_targets || payload.returnTargets || ['chat', 'api', 'webhook'],
      externalJobId: payload.external_job_id || payload.remote_job_id || null,
      failureReason
    };
  }

  return {
    normalizeAgentReportPayload,
    normalizeCallbackPayload,
    topLevelAgentReportCandidate
  };
}
