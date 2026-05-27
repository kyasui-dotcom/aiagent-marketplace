import { normalizeUsageForBilling } from './usage-accounting.js';

export function createDispatchResponseNormalizer({
  computeNextRetryAt,
  isBlockedAgentResultStatus,
  maxDispatchRetriesForJob,
  normalizeAgentReportPayload,
  topLevelAgentReportCandidate,
  workflowConcreteArtifactFailureReason,
  workflowTaskName
} = {}) {
  function workflowClipText(value = '', max = 12000) {
    const text = String(value || '').trim();
    if (!text || text.length <= max) return text;
    return `${text.slice(0, Math.max(0, max - 1)).trim()}...`;
  }

  function deliveryPayloadValueToText(value, depth = 0) {
    if (value == null || depth > 5) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) {
      return value
        .map((item) => deliveryPayloadValueToText(item, depth + 1))
        .map((item) => item.trim())
        .filter(Boolean)
        .join('\n\n');
    }
    if (typeof value !== 'object') return String(value || '').trim();
    const preferredText = [
      value.markdown,
      value.content,
      value.body,
      value.text,
      value.file_markdown,
      value.fileMarkdown,
      value.deliverable_markdown,
      value.deliverableMarkdown,
      value.summary,
      value.nextAction,
      value.next_action
    ]
      .map((item) => deliveryPayloadValueToText(item, depth + 1))
      .map((item) => item.trim())
      .filter(Boolean)
      .join('\n\n');
    if (preferredText) return preferredText;
    return Object.entries(value)
      .filter(([key]) => !/^(id|name|type|mime|content_?type|source|created|updated|metadata)$/i.test(key))
      .map(([key, item]) => {
        const text = deliveryPayloadValueToText(item, depth + 1).trim();
        return text ? `## ${key}\n${text}` : '';
      })
      .filter(Boolean)
      .join('\n\n');
  }

  function normalizeDeliveryPayloadFiles(files = [], fallbackTask = 'delivery') {
    return (Array.isArray(files) ? files : [])
      .map((file, index) => {
        if (typeof file === 'string') {
          const content = file.trim();
          return content ? { name: `${String(fallbackTask || 'delivery').slice(0, 80)}-${index + 1}.md`, content } : null;
        }
        if (!file || typeof file !== 'object') return null;
        const content = deliveryPayloadValueToText(
          file.content
          ?? file.markdown
          ?? file.body
          ?? file.text
          ?? file.file_markdown
          ?? file.fileMarkdown
          ?? file.deliverable_markdown
          ?? file.deliverableMarkdown
        ).trim();
        const safeContent = content === '[object Object]' ? '' : content;
        const name = String(file.name || file.filename || `${String(fallbackTask || 'delivery').slice(0, 80)}-${index + 1}.md`).trim();
        if (!safeContent) return null;
        return {
          ...file,
          name: name || `${String(fallbackTask || 'delivery').slice(0, 80)}-${index + 1}.md`,
          content: safeContent
        };
      })
      .filter((file) => file && (String(file.name || '').trim() || String(file.content || '').trim()));
  }

  function normalizeDispatchResponse(responseBody = {}) {
    const body = responseBody && typeof responseBody === 'object' ? responseBody : {};
    const status = String(body.status || '').trim().toLowerCase();
    const report = normalizeAgentReportPayload(body, topLevelAgentReportCandidate(body));
    const synthesizedFileMarkdown = deliveryPayloadValueToText(
      body.file_markdown
      || body.markdown
      || body.deliverableMarkdown
      || body.deliverable_markdown
      || report.file_markdown
      || report.markdown
      || report.deliverableMarkdown
      || report.deliverable_markdown
      || ''
    ).trim();
    const fallbackTask = String(body.task_type || body.taskType || 'delivery').slice(0, 80);
    const files = Array.isArray(body.files)
      ? normalizeDeliveryPayloadFiles(body.files, fallbackTask)
      : (synthesizedFileMarkdown ? [{ name: `${String(body.task_type || body.taskType || 'delivery').slice(0, 80)}.md`, content: synthesizedFileMarkdown }] : []);
    const blocked = isBlockedAgentResultStatus(status);
    const failed = status === 'failed' || Boolean(body.error || body.failure_reason || body.failureReason);
    const providerDetail = String(body.detail || body.details || '').trim();
    const providerError = String(body.error || '').trim();
    const failureReason = body.failure_reason
      || body.failureReason
      || (providerError && providerDetail ? `${providerError}: ${providerDetail}` : providerError)
      || (failed ? (report.summary || body.summary || 'Agent failed without a detailed reason.') : null);
    const hasArtifacts = Boolean(body.report || body.output || synthesizedFileMarkdown || files.length);
    const accepted = !failed && (body.accepted === true || blocked || status === 'accepted' || status === 'queued' || status === 'running' || status === 'dispatched');
    const completed = !failed && !blocked && (status === 'completed' || ((!status || status === 'ok' || status === 'success') && hasArtifacts));
    return {
      accepted,
      failed,
      blocked,
      completed,
      status: failed ? 'failed' : (blocked ? 'blocked' : (completed ? 'completed' : (status || (accepted ? 'accepted' : 'unknown')))),
      report,
      files,
      returnTargets: body.return_targets || body.returnTargets || ['api'],
      usage: normalizeUsageForBilling(body.usage, 100),
      failureReason,
      externalJobId: body.external_job_id || body.remote_job_id || body.job_id || null,
      raw: body
    };
  }

  function classifyDispatchFailure(statusCode, errorMessage = '') {
    const msg = String(errorMessage || '').toLowerCase();
    if (msg.includes('missing_required_deliverable') || msg.includes('missing required deliverable')) {
      return { category: 'missing_required_deliverable', retryable: true };
    }
    if (msg.includes('quality gate') || msg.includes('originality/source quality') || msg.includes('generic_template_left')) {
      return { category: 'agent_quality_gate_failed', retryable: true };
    }
    if (msg.includes('source-required') || msg.includes('source required') || msg.includes('source urls were available before generation') || msg.includes('missing_required_search_sources')) {
      return { category: 'missing_required_sources', retryable: true };
    }
    if (msg.includes('malformed') || msg.includes('json')) return { category: 'dispatch_malformed_response', retryable: true };
    if (msg.includes('endpoint')) return { category: 'dispatch_misconfigured_endpoint', retryable: false };
    if (statusCode === 408) return { category: 'dispatch_http_timeout', retryable: true };
    if ([502, 504, 520, 522, 524].includes(Number(statusCode))) return { category: 'dispatch_http_gateway_timeout', retryable: true };
    if (statusCode >= 500) return { category: 'dispatch_http_5xx', retryable: true };
    if (statusCode >= 400) return { category: 'dispatch_http_4xx', retryable: false };
    if (/dispatch timed out after|provider timed out|agent timed out/.test(msg)) return { category: 'dispatch_provider_timeout', retryable: true };
    if (/deadline|timeout window|exceeded timeout/.test(msg)) return { category: 'dispatch_deadline_timeout', retryable: true };
    if (/network.*timeout|aborterror|econnreset|etimedout|fetch failed/.test(msg)) return { category: 'dispatch_network_timeout', retryable: true };
    if (msg.includes('timed out') || msg.includes('timeout')) return { category: 'dispatch_timeout', retryable: true };
    return { category: 'dispatch_error', retryable: true };
  }

  function buildDispatchFailureMeta(job, statusCode, errorMessage = '') {
    const classified = classifyDispatchFailure(statusCode, errorMessage);
    const attempts = Number(job?.dispatch?.attempts || 0) + 1;
    const retryable = classified.retryable && attempts < maxDispatchRetriesForJob(job);
    return {
      category: classified.category,
      retryable,
      attempts,
      nextRetryAt: retryable ? computeNextRetryAt(attempts) : null
    };
  }

  function agentReturnedDeliveryArtifactText(output = {}) {
    if (!output || typeof output !== 'object') return '';
    const report = output.report && typeof output.report === 'object' ? output.report : {};
    const artifactCandidates = [
      ...(Array.isArray(output.artifacts) ? output.artifacts : []),
      ...(Array.isArray(report.artifacts) ? report.artifacts : []),
      ...(Array.isArray(report.approval_requests) ? report.approval_requests : []),
      ...(Array.isArray(report.approvalRequests) ? report.approvalRequests : [])
    ];
    const executionCandidate = report.execution_candidate || report.executionCandidate || null;
    const markdownText = [
      output.file_markdown,
      output.markdown,
      output.deliverableMarkdown,
      output.deliverable_markdown,
      report.file_markdown,
      report.markdown,
      report.deliverableMarkdown,
      report.deliverable_markdown
    ].map((item) => String(item || '').trim()).filter(Boolean);
    const fileText = (Array.isArray(output.files) ? output.files : [])
      .map((file) => String(file?.content || file?.body || '').trim())
      .filter(Boolean);
    const artifactText = artifactCandidates
      .map((item) => String(item?.body || item?.content || item?.text || item?.markdown || '').trim())
      .filter(Boolean);
    const executionText = executionCandidate && typeof executionCandidate === 'object'
      ? String(executionCandidate.body || executionCandidate.content || executionCandidate.markdown || executionCandidate.text || '').trim()
      : '';
    return [...fileText, ...artifactText, executionText, ...markdownText].filter(Boolean).join('\n\n');
  }

  function agentResultHasReturnedDeliveryArtifact(output = {}) {
    return agentReturnedDeliveryArtifactText(output).trim().length > 0;
  }

  function agentCompletionFailureReason(job = {}) {
    const concreteFailure = workflowConcreteArtifactFailureReason(job);
    if (concreteFailure) return concreteFailure;
    if (!agentResultHasReturnedDeliveryArtifact(job?.output || {})) {
      const task = workflowTaskName(job) || job?.taskType || 'agent';
      return `${task} did not return a user-facing delivery artifact.`;
    }
    return '';
  }

  return {
    agentCompletionFailureReason,
    agentResultHasReturnedDeliveryArtifact,
    agentReturnedDeliveryArtifactText,
    buildDispatchFailureMeta,
    classifyDispatchFailure,
    deliveryPayloadValueToText,
    normalizeDeliveryPayloadFiles,
    normalizeDispatchResponse,
    workflowClipText
  };
}
