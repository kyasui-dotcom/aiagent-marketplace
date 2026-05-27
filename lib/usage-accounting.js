export function normalizeUsageForBilling(rawUsage, fallbackApiCost = 100) {
  if (rawUsage && typeof rawUsage === 'object') {
    return {
      ...rawUsage,
      api_cost: rawUsage.api_cost ?? rawUsage.apiCost,
      total_cost_basis: rawUsage.total_cost_basis ?? rawUsage.totalCostBasis,
      cost_basis: rawUsage.cost_basis ?? rawUsage.costBasis
    };
  }
  return { api_cost: Number(fallbackApiCost || 100) };
}

export function approxTokenCount(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value || '');
  return Math.max(0, Math.ceil(String(text || '').length / 4));
}

export function usageWithObservedJobTokens(job, usage = {}, report = null) {
  const normalized = normalizeUsageForBilling(usage, 100);
  const observedInputTokens = approxTokenCount({ prompt: job?.prompt || '', input: job?.input || {} });
  const observedOutputTokens = approxTokenCount(report || {});
  const inputTokens = Number(normalized.input_tokens ?? normalized.inputTokens ?? 0) || observedInputTokens;
  const outputTokens = Number(normalized.output_tokens ?? normalized.outputTokens ?? 0) || observedOutputTokens;
  return {
    ...normalized,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: Number(normalized.total_tokens ?? normalized.totalTokens ?? 0) || (inputTokens + outputTokens),
    observed_input_tokens: observedInputTokens,
    observed_output_tokens: observedOutputTokens
  };
}
