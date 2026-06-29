function normalizeGateString(value) {
  return String(value || '').trim();
}

function deliveryTextFromJob(job = {}) {
  const output = job?.output && typeof job.output === 'object' ? job.output : {};
  const report = output.report && typeof output.report === 'object' ? output.report : {};
  const files = Array.isArray(output.files) ? output.files : [];
  return [
    output.summary,
    report.summary,
    report.answer,
    report.recommendation,
    report.sources,
    ...files.map((file) => `${file?.name || ''}\n${file?.content || ''}`)
  ].map((value) => typeof value === 'string' ? value : JSON.stringify(value || '')).join('\n');
}

export function deliveryCompletionEvidenceScoreForJob(job = {}) {
  const output = job?.output && typeof job.output === 'object' ? job.output : {};
  const report = output.report && typeof output.report === 'object' ? output.report : {};
  const files = Array.isArray(output.files) ? output.files : [];
  const text = deliveryTextFromJob(job);
  const disallowedFinalDeliveryMarkers = /(^|\n)\s*(?:[-*]\s*)?(?:TBD|not attached|not connected|not the final delivery|最終納品ではありません)\s*($|\n)|\|\s*(?:TBD|not attached|not connected)\s*\|/i;
  let score = 0;
  if (normalizeGateString(output.summary || report.summary || report.answer)) score += 25;
  if (files.length) score += 15;
  if (/source|citation|https?:\/\/|根拠|出典/i.test(text)) score += 20;
  if (/assumption|前提|risk|リスク|confidence|信頼/i.test(text)) score += 15;
  if (/recommend|next action|次の|提案|結論/i.test(text)) score += 15;
  if (job?.actualBilling || job?.billingSettlement || job?.billingEstimate) score += 10;
  if (disallowedFinalDeliveryMarkers.test(text)) score = Math.min(score, 20);
  return Math.max(0, Math.min(100, score));
}

export function deliveryCompletionGateForJob(job = {}, checkedAt = '', extra = {}) {
  const existing = job?.deliveryCompletionGate && typeof job.deliveryCompletionGate === 'object'
    ? job.deliveryCompletionGate
    : {};
  return {
    ...existing,
    ...extra,
    score: Number.isFinite(Number(extra.score))
      ? Number(extra.score)
      : (Number.isFinite(Number(existing.score)) ? Number(existing.score) : deliveryCompletionEvidenceScoreForJob(job)),
    version: extra.version || existing.version || 'delivery-completion-gate/v1',
    checkedAt: extra.checkedAt || existing.checkedAt || checkedAt || new Date().toISOString()
  };
}

export function setDeliveryCompletionGate(job = {}, checkedAt = '', extra = {}) {
  if (!job || typeof job !== 'object') return null;
  job.deliveryCompletionGate = deliveryCompletionGateForJob(job, checkedAt, extra);
  delete job['delivery' + 'Quality'];
  return job.deliveryCompletionGate;
}

export function clearDeliveryCompletionGate(job = {}) {
  if (!job || typeof job !== 'object') return;
  job.deliveryCompletionGate = null;
  delete job['delivery' + 'Quality'];
}
