const LEGACY_LEDGER_UNITS_PER_USD = 150;

function nowIso() {
  return new Date().toISOString();
}

function normalizeString(value, fallback = '') {
  return String(value ?? fallback).trim();
}

function normalizeMoney(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return +Number(fallback || 0).toFixed(2);
  return +n.toFixed(2);
}

function billingPeriodId(value = nowIso()) {
  const date = new Date(value || nowIso());
  if (Number.isNaN(date.getTime())) return billingPeriodId(nowIso());
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function displayCurrencyToLedgerAmount(value = 0) {
  return normalizeMoney(Number(value || 0) * LEGACY_LEDGER_UNITS_PER_USD, 0);
}

function asCostNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function roundCostBasis(value, digits = 4) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return +n.toFixed(digits);
}

export const API_COST_CATALOG_VERSION = '2026-05-14-high-watermark-v1';
export const LLM_HIGH_WATERMARK_PRICE_PER_MTOK_USD = Object.freeze({
  input: 25,
  output: 200,
  source: 'openai-gpt-5.2-pro-plus-buffer'
});
export const EXTERNAL_API_COST_CATALOG_USD = Object.freeze({
  web_search: 0.05,
  brave_web_search: 0.05,
  openai_web_search: 0.05,
  google_search_grounding: 0.05,
  google_maps_grounding: 0.05,
  tavily_basic_search: 0.05,
  tavily_advanced_search: 0.10,
  tavily_extract: 0.02,
  tavily_map: 0.02,
  tavily_crawl_page: 0.02,
  exa_search: 0.05,
  exa_deep_search: 0.10,
  exa_deep_reasoning_search: 0.15,
  exa_contents_page: 0.02,
  serpapi_search: 0.05,
  firecrawl_scrape: 0.02,
  firecrawl_extract: 0.02,
  firecrawl_crawl_page: 0.02,
  page_fetch: 0.02,
  http_fetch: 0.01,
  browser_render_fetch: 0.10,
  browser_screenshot: 0.10,
  email_send: 0.01,
  sms_send: 0.10,
  github_read: 0,
  github_write: 0,
  google_ga4_read: 0,
  google_gsc_read: 0,
  google_drive_read: 0,
  google_drive_write: 0,
  gmail_read: 0,
  gmail_send: 0,
  stripe_read: 0,
  stripe_write: 0,
  x_publish: 0,
  reddit_publish: 0,
  indie_hackers_publish: 0,
  default_external_api_call: 0.10
});

function parseCostBasisObject(costBasisRaw) {
  if (!costBasisRaw || typeof costBasisRaw !== 'object') return null;
  const compute = asCostNumber(costBasisRaw.compute ?? costBasisRaw.compute_cost ?? costBasisRaw.computeCost) ?? 0;
  const tool = asCostNumber(costBasisRaw.tool ?? costBasisRaw.tool_cost ?? costBasisRaw.toolCost) ?? 0;
  const labor = asCostNumber(costBasisRaw.labor ?? costBasisRaw.labor_cost ?? costBasisRaw.laborCost) ?? 0;
  const api = asCostNumber(costBasisRaw.api ?? costBasisRaw.api_cost ?? costBasisRaw.apiCost) ?? 0;
  const total = asCostNumber(costBasisRaw.total ?? costBasisRaw.total_cost_basis ?? costBasisRaw.totalCostBasis);
  const rolledUp = roundCostBasis(compute + tool + labor + api);
  const finalTotal = total == null ? rolledUp : total;
  return { total: roundCostBasis(finalTotal), compute: roundCostBasis(compute), tool: roundCostBasis(tool), labor: roundCostBasis(labor), api: roundCostBasis(api) };
}

function firstCostNumber(...values) {
  for (const value of values) {
    const parsed = asCostNumber(value);
    if (parsed != null) return parsed;
  }
  return null;
}

function hasCostValue(source, keys = []) {
  if (!source || typeof source !== 'object') return false;
  return keys.some((key) => (
    Object.prototype.hasOwnProperty.call(source, key)
    && asCostNumber(source[key]) != null
  ));
}

function normalizeCostCatalogKey(...values) {
  const raw = values.flat().map((value) => String(value || '').trim()).filter(Boolean).join('_').toLowerCase();
  const key = raw.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (!key) return '';
  if (/brave.*search|search.*brave/.test(key)) return 'brave_web_search';
  if (/openai.*web.*search|web.*search.*openai/.test(key)) return 'openai_web_search';
  if (/google.*search.*ground|ground.*google.*search|gemini.*ground.*search/.test(key)) return 'google_search_grounding';
  if (/google.*maps?.*ground|maps?.*ground/.test(key)) return 'google_maps_grounding';
  if (/tavily.*advanced.*search/.test(key)) return 'tavily_advanced_search';
  if (/tavily.*basic.*search|tavily.*search/.test(key)) return 'tavily_basic_search';
  if (/tavily.*extract/.test(key)) return 'tavily_extract';
  if (/tavily.*map/.test(key)) return 'tavily_map';
  if (/tavily.*crawl/.test(key)) return 'tavily_crawl_page';
  if (/exa.*deep.*reason/.test(key)) return 'exa_deep_reasoning_search';
  if (/exa.*deep/.test(key)) return 'exa_deep_search';
  if (/exa.*content/.test(key)) return 'exa_contents_page';
  if (/exa.*search/.test(key)) return 'exa_search';
  if (/serpapi|serp_api|serp.*search/.test(key)) return 'serpapi_search';
  if (/firecrawl.*crawl/.test(key)) return 'firecrawl_crawl_page';
  if (/firecrawl.*extract/.test(key)) return 'firecrawl_extract';
  if (/firecrawl|scrape/.test(key)) return 'firecrawl_scrape';
  if (/browser.*screenshot|screenshot/.test(key)) return 'browser_screenshot';
  if (/browser.*render|render.*fetch|playwright|chrome/.test(key)) return 'browser_render_fetch';
  if (/page.*fetch|fetch.*page|url.*extract/.test(key)) return 'page_fetch';
  if (/http.*fetch|fetch/.test(key)) return 'http_fetch';
  if (/github.*write|github.*pr|github.*commit/.test(key)) return 'github_write';
  if (/github/.test(key)) return 'github_read';
  if (/ga4|google_analytics/.test(key)) return 'google_ga4_read';
  if (/gsc|search_console/.test(key)) return 'google_gsc_read';
  if (/google.*drive.*write|drive.*write/.test(key)) return 'google_drive_write';
  if (/google.*drive|drive/.test(key)) return 'google_drive_read';
  if (/gmail.*send|send.*gmail/.test(key)) return 'gmail_send';
  if (/gmail|email.*read|mail.*read/.test(key)) return 'gmail_read';
  if (/stripe.*write|stripe.*create|stripe.*update/.test(key)) return 'stripe_write';
  if (/stripe/.test(key)) return 'stripe_read';
  if (/sms|twilio/.test(key)) return 'sms_send';
  if (/email.*send|send.*email|resend|sendgrid/.test(key)) return 'email_send';
  if (/x.*publish|twitter.*publish|x.*post|twitter.*post/.test(key)) return 'x_publish';
  if (/reddit.*publish|reddit.*post/.test(key)) return 'reddit_publish';
  if (/indie.*hackers.*publish|indie.*hackers.*post/.test(key)) return 'indie_hackers_publish';
  if (/web_search|search/.test(key)) return 'web_search';
  return key;
}

function isLikelyLlmUsage(usage = {}) {
  const pricing = usage.pricing && typeof usage.pricing === 'object' ? usage.pricing : {};
  const apiRates = usage.api_rates && typeof usage.api_rates === 'object'
    ? usage.api_rates
    : (usage.apiRates && typeof usage.apiRates === 'object' ? usage.apiRates : {});
  const provider = firstString(usage.api_provider, usage.apiProvider, usage.provider, pricing.provider, apiRates.provider).toLowerCase();
  const model = firstString(usage.model, usage.model_name, usage.modelName, pricing.model, apiRates.model).toLowerCase();
  if (/^(openai|anthropic|google|gemini|xai|mistral|cohere|groq|openrouter|custom-openai-compatible|bedrock|vertex)$/.test(provider)) return true;
  if (/^(deterministic|leader-owned|brave-search|attached-data|data-availability)/.test(model)) return false;
  return /(gpt|claude|sonnet|opus|haiku|gemini|grok|mistral|llama|deepseek|qwen|command|mixtral|o\d)/.test(model);
}

function firstString(...values) {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text) return text;
  }
  return '';
}

function normalizeCostCurrency(value = '') {
  const raw = normalizeString(value).trim().toLowerCase();
  if (['usd', 'us_dollar', 'us-dollar', 'dollar', 'dollars', '$'].includes(raw)) return 'usd';
  if (['ledger', 'point', 'points', 'credit', 'credits', 'internal'].includes(raw)) return 'ledger';
  return raw;
}

function usageCostCurrency(usage = {}) {
  const pricing = usage.pricing && typeof usage.pricing === 'object' ? usage.pricing : {};
  const apiRates = usage.api_rates && typeof usage.api_rates === 'object'
    ? usage.api_rates
    : (usage.apiRates && typeof usage.apiRates === 'object' ? usage.apiRates : {});
  const explicit = normalizeCostCurrency(firstString(
    usage.cost_currency,
    usage.costCurrency,
    usage.api_cost_currency,
    usage.apiCostCurrency,
    pricing.currency,
    pricing.cost_currency,
    pricing.costCurrency,
    apiRates.currency,
    apiRates.cost_currency,
    apiRates.costCurrency
  ));
  if (explicit) return explicit;
  const hasModelPriceFields = firstCostNumber(
    usage.input_price_per_mtok,
    usage.inputPricePerMTok,
    usage.output_price_per_mtok,
    usage.outputPricePerMTok,
    pricing.input_price_per_mtok,
    pricing.inputPricePerMTok,
    pricing.output_price_per_mtok,
    pricing.outputPricePerMTok,
    apiRates.input_price_per_mtok,
    apiRates.inputPricePerMTok,
    apiRates.output_price_per_mtok,
    apiRates.outputPricePerMTok
  ) != null;
  return hasModelPriceFields ? 'usd' : 'ledger';
}

function costAmountToLedger(value, currency = 'ledger') {
  const n = asCostNumber(value);
  if (n == null) return null;
  return normalizeCostCurrency(currency) === 'usd'
    ? displayCurrencyToLedgerAmount(n)
    : n;
}

function parseTokenCostEstimate(usage = {}) {
  const pricing = usage.pricing && typeof usage.pricing === 'object' ? usage.pricing : {};
  const apiRates = usage.api_rates && typeof usage.api_rates === 'object'
    ? usage.api_rates
    : (usage.apiRates && typeof usage.apiRates === 'object' ? usage.apiRates : {});
  const inputTokens = firstCostNumber(usage.input_tokens, usage.inputTokens, usage.prompt_tokens, usage.promptTokens) ?? 0;
  const outputTokens = firstCostNumber(usage.output_tokens, usage.outputTokens, usage.completion_tokens, usage.completionTokens) ?? 0;
  const totalTokens = firstCostNumber(usage.total_tokens, usage.totalTokens) ?? (inputTokens + outputTokens);
  const explicitInputPricePerMTok = firstCostNumber(
    usage.input_price_per_mtok,
    usage.inputPricePerMTok,
    usage.input_cost_per_mtok,
    usage.inputCostPerMTok,
    pricing.input_price_per_mtok,
    pricing.inputPricePerMTok,
    pricing.input_cost_per_mtok,
    pricing.inputCostPerMTok,
    apiRates.input_price_per_mtok,
    apiRates.inputPricePerMTok,
    apiRates.input_cost_per_mtok,
    apiRates.inputCostPerMTok
  );
  const explicitOutputPricePerMTok = firstCostNumber(
    usage.output_price_per_mtok,
    usage.outputPricePerMTok,
    usage.output_cost_per_mtok,
    usage.outputCostPerMTok,
    pricing.output_price_per_mtok,
    pricing.outputPricePerMTok,
    pricing.output_cost_per_mtok,
    pricing.outputCostPerMTok,
    apiRates.output_price_per_mtok,
    apiRates.outputPricePerMTok,
    apiRates.output_cost_per_mtok,
    apiRates.outputCostPerMTok
  );
  const positiveReportedCost = (firstCostNumber(
    usage.api_cost,
    usage.apiCost,
    usage.total_cost_basis,
    usage.totalCostBasis
  ) ?? 0) > 0;
  const likelyLlm = isLikelyLlmUsage(usage);
  const useHighWatermark = likelyLlm && !positiveReportedCost;
  const inputPricePerMTok = useHighWatermark
    ? LLM_HIGH_WATERMARK_PRICE_PER_MTOK_USD.input
    : explicitInputPricePerMTok;
  const outputPricePerMTok = useHighWatermark
    ? LLM_HIGH_WATERMARK_PRICE_PER_MTOK_USD.output
    : explicitOutputPricePerMTok;
  const inputCost = inputPricePerMTok == null ? 0 : (inputTokens / 1_000_000) * inputPricePerMTok;
  const outputCost = outputPricePerMTok == null ? 0 : (outputTokens / 1_000_000) * outputPricePerMTok;
  const apiCostUsd = +(inputCost + outputCost).toFixed(4);
  const apiCost = displayCurrencyToLedgerAmount(apiCostUsd);
  if (!totalTokens && !apiCost) return null;
  return {
    apiCost,
    apiCostUsd,
    inputTokens: +inputTokens.toFixed(0),
    outputTokens: +outputTokens.toFixed(0),
    totalTokens: +totalTokens.toFixed(0),
    inputPricePerMTok: inputPricePerMTok == null ? null : +inputPricePerMTok.toFixed(6),
    outputPricePerMTok: outputPricePerMTok == null ? null : +outputPricePerMTok.toFixed(6),
    provider: firstString(usage.api_provider, usage.apiProvider, usage.provider, pricing.provider, apiRates.provider),
    model: firstString(usage.model, usage.model_name, usage.modelName, pricing.model, apiRates.model),
    pricingSource: useHighWatermark ? 'catalog_high_watermark' : (explicitInputPricePerMTok != null || explicitOutputPricePerMTok != null ? 'reported_rates' : 'none'),
    catalogVersion: useHighWatermark ? API_COST_CATALOG_VERSION : null
  };
}

function pushToolUsage(entries, keyInput = '', countInput = 1, meta = {}) {
  const key = normalizeCostCatalogKey(keyInput);
  const count = asCostNumber(countInput) ?? 0;
  if (!key || count <= 0) return;
  const unitCostUsd = firstCostNumber(meta.unit_cost_usd, meta.unitCostUsd, meta.cost_per_call_usd, meta.costPerCallUsd);
  const totalCostUsd = firstCostNumber(meta.cost_usd, meta.costUsd, meta.total_cost_usd, meta.totalCostUsd);
  const catalogUnitUsd = unitCostUsd ?? EXTERNAL_API_COST_CATALOG_USD[key] ?? EXTERNAL_API_COST_CATALOG_USD.default_external_api_call;
  const costUsd = totalCostUsd ?? +(count * catalogUnitUsd).toFixed(6);
  entries.push({
    key,
    count,
    unitCostUsd: +catalogUnitUsd.toFixed(6),
    costUsd: +costUsd.toFixed(6),
    source: unitCostUsd != null || totalCostUsd != null ? 'reported_tool_rate' : (Object.prototype.hasOwnProperty.call(EXTERNAL_API_COST_CATALOG_USD, key) ? 'catalog' : 'catalog_default')
  });
}

function parseToolCostEstimate(usage = {}) {
  const entries = [];
  const rawCalls = usage.tool_calls ?? usage.toolCalls ?? usage.external_api_calls ?? usage.externalApiCalls ?? usage.api_calls ?? usage.apiCalls;
  if (Array.isArray(rawCalls)) {
    for (const item of rawCalls) {
      if (typeof item === 'string') pushToolUsage(entries, item, 1);
      else if (item && typeof item === 'object') {
        const key = firstString(
          item.cost_catalog_key,
          item.costCatalogKey,
          item.key,
          item.tool,
          item.action,
          item.name,
          item.type,
          [item.provider, item.endpoint || item.operation || item.method].filter(Boolean).join('_')
        );
        pushToolUsage(entries, key, firstCostNumber(item.count, item.calls, item.requests, item.units, item.quantity) ?? 1, item);
      }
    }
  } else if (rawCalls && typeof rawCalls === 'object') {
    for (const [key, value] of Object.entries(rawCalls)) {
      if (value && typeof value === 'object') pushToolUsage(entries, key, firstCostNumber(value.count, value.calls, value.requests, value.units, value.quantity) ?? 1, value);
      else pushToolUsage(entries, key, value);
    }
  }
  const directCounters = [
    ['web_search_calls', 'web_search'],
    ['webSearchCalls', 'web_search'],
    ['search_calls', 'web_search'],
    ['searchCalls', 'web_search'],
    ['brave_search_calls', 'brave_web_search'],
    ['braveSearchCalls', 'brave_web_search'],
    ['openai_web_search_calls', 'openai_web_search'],
    ['openAiWebSearchCalls', 'openai_web_search'],
    ['google_search_grounding_calls', 'google_search_grounding'],
    ['googleSearchGroundingCalls', 'google_search_grounding'],
    ['serpapi_search_calls', 'serpapi_search'],
    ['serpApiSearchCalls', 'serpapi_search'],
    ['tavily_search_calls', 'tavily_basic_search'],
    ['tavilySearchCalls', 'tavily_basic_search'],
    ['exa_search_calls', 'exa_search'],
    ['exaSearchCalls', 'exa_search'],
    ['page_fetches', 'page_fetch'],
    ['pageFetches', 'page_fetch'],
    ['page_fetch_count', 'page_fetch'],
    ['pageFetchCount', 'page_fetch'],
    ['browser_render_fetches', 'browser_render_fetch'],
    ['browserRenderFetches', 'browser_render_fetch'],
    ['email_sends', 'email_send'],
    ['emailSends', 'email_send'],
    ['sms_sends', 'sms_send'],
    ['smsSends', 'sms_send']
  ];
  for (const [field, key] of directCounters) {
    if (Object.prototype.hasOwnProperty.call(usage, field)) pushToolUsage(entries, key, usage[field]);
  }
  const searchProvider = firstString(usage.search_provider, usage.searchProvider);
  const searchCallCount = firstCostNumber(usage.search_count, usage.searchCount, usage.source_search_count, usage.sourceSearchCount);
  if (searchProvider && searchCallCount != null) pushToolUsage(entries, `${searchProvider}_search`, searchCallCount);
  if (!entries.length) return null;
  const toolCostUsd = +entries.reduce((sum, item) => sum + item.costUsd, 0).toFixed(6);
  return {
    toolCost: displayCurrencyToLedgerAmount(toolCostUsd),
    toolCostUsd,
    catalogVersion: API_COST_CATALOG_VERSION,
    calls: entries
  };
}

export function deriveCostBasis(usageInput, fallbackApiCost = 100) {
  if (typeof usageInput === 'number') {
    const n = asCostNumber(usageInput) ?? 0;
    return {
      totalCostBasis: roundCostBasis(n),
      apiCost: roundCostBasis(n),
      costBasis: { api: roundCostBasis(n), compute: 0, tool: 0, labor: 0 },
      tokenUsage: null,
      costTelemetry: {
        source: 'numeric_usage_estimate',
        confidence: 'estimated',
        reportedCostBasis: false,
        reportedTokenUsage: false,
        fallbackApiCost: roundCostBasis(n)
      }
    };
  }
  const usage = usageInput && typeof usageInput === 'object' ? usageInput : {};
  const costCurrency = usageCostCurrency(usage);
  const hasTopLevelApi = hasCostValue(usage, ['api_cost', 'apiCost']);
  const hasTopLevelCompute = hasCostValue(usage, ['compute_cost', 'computeCost']);
  const hasTopLevelTool = hasCostValue(usage, ['tool_cost', 'toolCost']);
  const hasTopLevelLabor = hasCostValue(usage, ['labor_cost', 'laborCost']);
  const hasTopLevelTotal = hasCostValue(usage, ['total_cost_basis', 'totalCostBasis']);
  const topLevelApi = costAmountToLedger(usage.api_cost ?? usage.apiCost, costCurrency);
  const totalCostBasis = costAmountToLedger(usage.total_cost_basis ?? usage.totalCostBasis, costCurrency);
  const directCosts = parseCostBasisObject({
    api: costAmountToLedger(usage.api_cost ?? usage.apiCost, costCurrency),
    compute: costAmountToLedger(usage.compute_cost ?? usage.computeCost, costCurrency),
    tool: costAmountToLedger(usage.tool_cost ?? usage.toolCost, costCurrency),
    labor: costAmountToLedger(usage.labor_cost ?? usage.laborCost, costCurrency),
    total: costAmountToLedger(usage.total_cost_basis ?? usage.totalCostBasis, costCurrency)
  });
  const rawBasisObject = usage.cost_basis && typeof usage.cost_basis === 'object'
    ? usage.cost_basis
    : (usage.costBasis && typeof usage.costBasis === 'object' ? usage.costBasis : null);
  const hasBasisApi = hasCostValue(rawBasisObject, ['api', 'api_cost', 'apiCost']);
  const hasBasisCompute = hasCostValue(rawBasisObject, ['compute', 'compute_cost', 'computeCost']);
  const hasBasisTool = hasCostValue(rawBasisObject, ['tool', 'tool_cost', 'toolCost']);
  const hasBasisLabor = hasCostValue(rawBasisObject, ['labor', 'labor_cost', 'laborCost']);
  const hasBasisTotal = hasCostValue(rawBasisObject, ['total', 'total_cost_basis', 'totalCostBasis']);
  const basisObject = rawBasisObject ? parseCostBasisObject({
    api: costAmountToLedger(rawBasisObject.api ?? rawBasisObject.api_cost ?? rawBasisObject.apiCost, costCurrency),
    compute: costAmountToLedger(rawBasisObject.compute ?? rawBasisObject.compute_cost ?? rawBasisObject.computeCost, costCurrency),
    tool: costAmountToLedger(rawBasisObject.tool ?? rawBasisObject.tool_cost ?? rawBasisObject.toolCost, costCurrency),
    labor: costAmountToLedger(rawBasisObject.labor ?? rawBasisObject.labor_cost ?? rawBasisObject.laborCost, costCurrency),
    total: costAmountToLedger(rawBasisObject.total ?? rawBasisObject.total_cost_basis ?? rawBasisObject.totalCostBasis, costCurrency)
  }) : null;
  const tokenEstimate = parseTokenCostEstimate(usage);
  const toolEstimate = parseToolCostEstimate(usage);
  const overrideExplicitZeroApiWithCatalog = Boolean(
    tokenEstimate?.apiCost > 0
    && tokenEstimate?.pricingSource === 'catalog_high_watermark'
    && topLevelApi === 0
    && (hasTopLevelApi || hasTopLevelTotal)
  );
  const merged = {
    api: (hasTopLevelApi && !overrideExplicitZeroApiWithCatalog ? topLevelApi : null) ?? (hasBasisApi ? basisObject?.api : null) ?? (tokenEstimate?.apiCost && tokenEstimate.apiCost > 0 ? tokenEstimate.apiCost : null) ?? 0,
    compute: (hasBasisCompute ? basisObject?.compute : null) ?? (hasTopLevelCompute ? directCosts?.compute : null) ?? 0,
    tool: (hasBasisTool ? basisObject?.tool : null) ?? (hasTopLevelTool ? directCosts?.tool : null) ?? (toolEstimate?.toolCost ?? 0),
    labor: (hasBasisLabor ? basisObject?.labor : null) ?? (hasTopLevelLabor ? directCosts?.labor : null) ?? 0
  };
  const rolledUpRaw = merged.api + merged.compute + merged.tool + merged.labor;
  const rolledUp = roundCostBasis(rolledUpRaw);
  const reportedCostBasisRaw = Boolean(
    hasTopLevelTotal
    || hasTopLevelApi
    || hasTopLevelCompute
    || hasTopLevelTool
    || hasTopLevelLabor
    || hasBasisTotal
    || hasBasisApi
    || hasBasisCompute
    || hasBasisTool
    || hasBasisLabor
  );
  const reportedTokenUsage = Boolean(tokenEstimate?.totalTokens || tokenEstimate?.inputTokens || tokenEstimate?.outputTokens);
  const catalogCostEstimated = Boolean(tokenEstimate?.pricingSource === 'catalog_high_watermark' || toolEstimate?.toolCost > 0);
  const overrideExplicitZeroCostWithCatalog = Boolean(
    catalogCostEstimated
    && rolledUpRaw > 0
    && totalCostBasis === 0
    && (hasTopLevelTotal || hasTopLevelApi)
  );
  const reportedCostBasis = reportedCostBasisRaw && !overrideExplicitZeroCostWithCatalog;
  const finalTotal =
    (hasTopLevelTotal && !overrideExplicitZeroCostWithCatalog ? totalCostBasis : null)
    ?? (hasBasisTotal ? basisObject?.total : null)
    ?? (reportedCostBasis ? rolledUpRaw : null)
    ?? (rolledUpRaw > 0 ? rolledUpRaw : asCostNumber(fallbackApiCost) ?? 100);
  const source = reportedCostBasis
    ? 'reported_cost_basis'
    : (catalogCostEstimated ? 'catalog_cost_estimate' : (tokenEstimate?.apiCost && tokenEstimate.apiCost > 0 ? 'token_price_estimate' : 'fallback_estimate'));
  const confidence = reportedCostBasis
    ? 'reported'
    : (catalogCostEstimated ? 'catalog_estimated' : (reportedTokenUsage ? 'token_estimated' : 'fallback'));
  return {
    totalCostBasis: roundCostBasis(finalTotal),
    apiCost: roundCostBasis(merged.api),
    costBasis: { api: roundCostBasis(merged.api), compute: roundCostBasis(merged.compute), tool: roundCostBasis(merged.tool), labor: roundCostBasis(merged.labor) },
    tokenUsage: tokenEstimate,
    toolUsage: toolEstimate,
    costTelemetry: {
      source,
      confidence,
      reportedCostBasis,
      reportedTokenUsage,
      provider: tokenEstimate?.provider || firstString(usage.api_provider, usage.apiProvider, usage.provider),
      model: tokenEstimate?.model || firstString(usage.model, usage.model_name, usage.modelName),
      costCurrency,
      apiCostUsd: tokenEstimate?.apiCostUsd ?? (costCurrency === 'usd' ? asCostNumber(usage.api_cost ?? usage.apiCost) : null),
      toolCostUsd: toolEstimate?.toolCostUsd ?? (costCurrency === 'usd' ? asCostNumber(usage.tool_cost ?? usage.toolCost) : null),
      costCatalogVersion: catalogCostEstimated ? API_COST_CATALOG_VERSION : null,
      fallbackApiCost: roundCostBasis(asCostNumber(fallbackApiCost) ?? 100)
    }
  };
}

export function resolveProviderMarkupRateFromAgent(agent = {}) {
  const manifestPricing = agent?.metadata?.manifest?.pricing && typeof agent.metadata.manifest.pricing === 'object'
    ? agent.metadata.manifest.pricing
    : {};
  const explicit = Number(
    agent.providerMarkupRate
    ?? agent.provider_markup_rate
    ?? agent.tokenMarkupRate
    ?? agent.token_markup_rate
    ?? manifestPricing.provider_markup_rate
    ?? manifestPricing.providerMarkupRate
    ?? manifestPricing.token_markup_rate
    ?? manifestPricing.tokenMarkupRate
    ?? agent.creatorFeeRate
    ?? agent.creator_fee_rate
    ?? manifestPricing.creator_fee_rate
    ?? manifestPricing.creatorFeeRate
  );
  if (Number.isFinite(explicit) && explicit >= 0) return explicit;
  const legacy = Number(agent.premiumRate ?? agent.premium_rate ?? manifestPricing.premium_rate ?? manifestPricing.premiumRate);
  if (Number.isFinite(legacy) && legacy >= 0) return legacy;
  return 0.1;
}

export function resolveCreatorFeeRateFromAgent(agent = {}) {
  return resolveProviderMarkupRateFromAgent(agent);
}

export function normalizeAgentPricingModel(value = '') {
  const raw = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!raw) return 'usage_based';
  if (['usage', 'usage_pricing', 'usage_only', 'metered'].includes(raw)) return 'usage_based';
  if (['fixed', 'fixed_run', 'per_run', 'one_time', 'fixed_price'].includes(raw)) return 'fixed_per_run';
  if (['subscription', 'monthly', 'monthly_subscription', 'subscription_only'].includes(raw)) return 'subscription_required';
  if (['hybrid_subscription', 'subscription_plus_usage', 'subscription_plus_overage'].includes(raw)) return 'hybrid';
  return ['usage_based', 'fixed_per_run', 'subscription_required', 'hybrid'].includes(raw) ? raw : 'usage_based';
}

function normalizeAgentOverageMode(value = '', fallback = 'usage_based') {
  const raw = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!raw) return fallback;
  if (['included', 'none', 'plan_included', 'subscription_included'].includes(raw)) return 'included';
  if (['usage', 'usage_pricing', 'metered'].includes(raw)) return 'usage_based';
  if (['fixed', 'fixed_run', 'per_run', 'fixed_price'].includes(raw)) return 'fixed_per_run';
  return ['included', 'usage_based', 'fixed_per_run'].includes(raw) ? raw : fallback;
}

export function usdPriceToLedger(value = 0) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return normalizeMoney(displayCurrencyToLedgerAmount(amount), 0);
}

export function listPriceBreakdown(total = 0) {
  const listTotal = Math.max(0, normalizeMoney(total, 0));
  const platformMarginRate = resolvePlatformMarginRateFromAgent();
  const platformRevenue = normalizeMoney(listTotal * platformMarginRate, 0);
  const agentPayout = normalizeMoney(Math.max(0, listTotal - platformRevenue), 0);
  return { total: listTotal, platformRevenue, agentPayout, platformMarginRate };
}

export function resolveAgentPricingConfig(agent = {}) {
  const manifestPricing = agent?.metadata?.manifest?.pricing && typeof agent.metadata.manifest.pricing === 'object'
    ? agent.metadata.manifest.pricing
    : {};
  const pricingModel = normalizeAgentPricingModel(
    agent?.pricingModel
    ?? agent?.pricing_model
    ?? manifestPricing.pricing_model
    ?? manifestPricing.pricingModel
  );
  const fixedRunPriceUsd = Number(
    agent?.fixedRunPriceUsd
    ?? agent?.fixed_run_price_usd
    ?? agent?.runPriceUsd
    ?? agent?.run_price_usd
    ?? manifestPricing.fixed_run_price_usd
    ?? manifestPricing.fixedRunPriceUsd
    ?? manifestPricing.run_price_usd
    ?? manifestPricing.runPriceUsd
    ?? 0
  );
  const subscriptionMonthlyPriceUsd = Number(
    agent?.subscriptionMonthlyPriceUsd
    ?? agent?.subscription_monthly_price_usd
    ?? agent?.monthlyPriceUsd
    ?? agent?.monthly_price_usd
    ?? manifestPricing.subscription_monthly_price_usd
    ?? manifestPricing.subscriptionMonthlyPriceUsd
    ?? manifestPricing.monthly_price_usd
    ?? manifestPricing.monthlyPriceUsd
    ?? 0
  );
  const overageMode = normalizeAgentOverageMode(
    agent?.overageMode
    ?? agent?.overage_mode
    ?? manifestPricing.overage_mode
    ?? manifestPricing.overageMode,
    pricingModel === 'hybrid' ? 'usage_based' : 'included'
  );
  const overageFixedRunPriceUsd = Number(
    agent?.overageFixedRunPriceUsd
    ?? agent?.overage_fixed_run_price_usd
    ?? manifestPricing.overage_fixed_run_price_usd
    ?? manifestPricing.overageFixedRunPriceUsd
    ?? 0
  );
  return {
    pricingModel,
    fixedRunPriceUsd: Number.isFinite(fixedRunPriceUsd) && fixedRunPriceUsd > 0 ? +fixedRunPriceUsd.toFixed(2) : 0,
    subscriptionMonthlyPriceUsd: Number.isFinite(subscriptionMonthlyPriceUsd) && subscriptionMonthlyPriceUsd > 0 ? +subscriptionMonthlyPriceUsd.toFixed(2) : 0,
    overageMode,
    overageFixedRunPriceUsd: Number.isFinite(overageFixedRunPriceUsd) && overageFixedRunPriceUsd > 0 ? +overageFixedRunPriceUsd.toFixed(2) : 0
  };
}

function normalizeAgentSubscriptionRecord(record = {}) {
  return {
    agentId: normalizeString(record.agentId || record.agent_id),
    period: normalizeString(record.period, billingPeriodId()),
    pricingModel: normalizeAgentPricingModel(record.pricingModel || record.pricing_model),
    monthlyPrice: normalizeMoney(record.monthlyPrice ?? record.monthly_price ?? 0, 0),
    chargedAt: normalizeString(record.chargedAt || record.charged_at),
    orderId: normalizeString(record.orderId || record.order_id)
  };
}

function agentSubscriptionRecordsForBilling(billing = {}) {
  return Array.isArray(billing?.agentSubscriptions)
    ? billing.agentSubscriptions.map(normalizeAgentSubscriptionRecord).filter((item) => item.agentId)
    : [];
}

export function isAgentSubscriptionActiveForAccount(account = null, agentId = '', period = billingPeriodId()) {
  const safeAgentId = normalizeString(agentId);
  if (!safeAgentId) return false;
  const safePeriod = normalizeString(period, billingPeriodId());
  return agentSubscriptionRecordsForBilling(account?.billing || {}).some((item) => item.agentId === safeAgentId && item.period === safePeriod);
}

function markAgentSubscriptionCharged(account = null, agent = null, period = billingPeriodId(), payload = {}) {
  if (!account?.billing || !agent?.id) return;
  const records = agentSubscriptionRecordsForBilling(account.billing);
  const next = normalizeAgentSubscriptionRecord({
    agentId: agent.id,
    period,
    pricingModel: resolveAgentPricingConfig(agent).pricingModel,
    monthlyPrice: payload.monthlyPrice ?? 0,
    chargedAt: payload.chargedAt || nowIso(),
    orderId: payload.orderId || ''
  });
  const existingIndex = records.findIndex((item) => item.agentId === next.agentId && item.period === next.period);
  if (existingIndex >= 0) records[existingIndex] = { ...records[existingIndex], ...next };
  else records.unshift(next);
  account.billing.agentSubscriptions = records.slice(0, 200);
}

export function resolvePlatformMarginRateFromAgent(_agent = {}) {
  // Provider manifests cannot change the platform margin. It is applied to the final order total.
  return 0.1;
}

export function resolveMarketplaceFeeRateFromAgent(agent = {}) {
  return resolvePlatformMarginRateFromAgent(agent);
}

export function resolvePricingPolicy(agent, usageInput = 100, options = {}) {
  const basis = deriveCostBasis(usageInput, 100);
  const billableBasis = basis.totalCostBasis;
  const providerMarkupRate = resolveProviderMarkupRateFromAgent(agent);
  const platformMarginRate = resolvePlatformMarginRateFromAgent(agent);
  const pricing = resolveAgentPricingConfig(agent);
  const subscriptionActive = Boolean(options.subscriptionActive);
  return {
    policyVersion: 'billing-policy/v4-multi-model-pricing',
    billableBasis,
    costBasis: basis.costBasis,
    tokenUsage: basis.tokenUsage,
    toolUsage: basis.toolUsage,
    costTelemetry: basis.costTelemetry,
    apiCost: basis.apiCost,
    pricing,
    subscriptionActive,
    rates: {
      providerMarkupRate: +providerMarkupRate.toFixed(4),
      tokenMarkupRate: +providerMarkupRate.toFixed(4),
      platformMarginRate: +platformMarginRate.toFixed(4),
      creatorFeeRate: +providerMarkupRate.toFixed(4),
      marketplaceFeeRate: +platformMarginRate.toFixed(4),
      premiumRate: +providerMarkupRate.toFixed(4),
      basicRate: +platformMarginRate.toFixed(4)
    }
  };
}

export function estimateBilling(agent, usageInput = 100, options = {}) {
  const policy = resolvePricingPolicy(agent, usageInput, options);
  const platformMarginRate = Math.min(0.99, Math.max(0, Number(policy.rates.platformMarginRate || 0.1)));
  const usageBasedBilling = (() => {
    const providerMarkup = roundCostBasis(policy.billableBasis * policy.rates.providerMarkupRate);
    const subtotalBeforePlatform = roundCostBasis(policy.billableBasis + providerMarkup);
    const total = platformMarginRate >= 1
      ? subtotalBeforePlatform
      : normalizeMoney(subtotalBeforePlatform / (1 - platformMarginRate), 0);
    const marketplaceFee = roundCostBasis(total - subtotalBeforePlatform);
    const agentPayout = providerMarkup;
    const platformRevenue = marketplaceFee;
    return {
      providerMarkup,
      subtotalBeforePlatform,
      total,
      marketplaceFee,
      agentPayout,
      platformRevenue
    };
  })();
  let total = usageBasedBilling.total;
  let providerMarkup = usageBasedBilling.providerMarkup;
  let marketplaceFee = usageBasedBilling.marketplaceFee;
  let agentPayout = usageBasedBilling.agentPayout;
  let platformRevenue = usageBasedBilling.platformRevenue;
  let totalCostBasis = policy.billableBasis;
  let pricingSummary = 'usage based';
  let providerSubscriptionMonthlyPrice = 0;
  let providerSubscriptionPlatformFee = 0;
  let providerSubscriptionProviderNet = 0;
  let overageMode = policy.pricing.overageMode;
  let overageCharge = usageBasedBilling.total;
  if (policy.pricing.pricingModel === 'fixed_per_run') {
    const fixedTotal = usdPriceToLedger(policy.pricing.fixedRunPriceUsd);
    const fixedBreakdown = listPriceBreakdown(fixedTotal);
    total = fixedBreakdown.total;
    providerMarkup = 0;
    marketplaceFee = fixedBreakdown.platformRevenue;
    agentPayout = fixedBreakdown.agentPayout;
    platformRevenue = fixedBreakdown.platformRevenue;
    totalCostBasis = fixedBreakdown.total;
    overageCharge = fixedBreakdown.total;
    pricingSummary = `fixed per run ${policy.pricing.fixedRunPriceUsd.toFixed(2)} USD`;
  } else if (policy.pricing.pricingModel === 'subscription_required' || policy.pricing.pricingModel === 'hybrid') {
    providerSubscriptionMonthlyPrice = usdPriceToLedger(policy.pricing.subscriptionMonthlyPriceUsd);
    const monthlyBreakdown = listPriceBreakdown(providerSubscriptionMonthlyPrice);
    providerSubscriptionPlatformFee = monthlyBreakdown.platformRevenue;
    providerSubscriptionProviderNet = monthlyBreakdown.agentPayout;
    if (policy.pricing.pricingModel === 'subscription_required') {
      total = 0;
      providerMarkup = 0;
      marketplaceFee = 0;
      agentPayout = 0;
      platformRevenue = 0;
      totalCostBasis = 0;
      overageMode = 'included';
      overageCharge = 0;
      pricingSummary = `provider subscription ${policy.pricing.subscriptionMonthlyPriceUsd.toFixed(2)} USD/month`;
    } else {
      if (overageMode === 'included') {
        total = 0;
        providerMarkup = 0;
        marketplaceFee = 0;
        agentPayout = 0;
        platformRevenue = 0;
        totalCostBasis = 0;
        overageCharge = 0;
        pricingSummary = `provider subscription ${policy.pricing.subscriptionMonthlyPriceUsd.toFixed(2)} USD/month + included usage`;
      } else if (overageMode === 'fixed_per_run') {
        const overageTotal = usdPriceToLedger(policy.pricing.overageFixedRunPriceUsd);
        const overageBreakdown = listPriceBreakdown(overageTotal);
        total = overageBreakdown.total;
        providerMarkup = 0;
        marketplaceFee = overageBreakdown.platformRevenue;
        agentPayout = overageBreakdown.agentPayout;
        platformRevenue = overageBreakdown.platformRevenue;
        totalCostBasis = overageBreakdown.total;
        overageCharge = overageBreakdown.total;
        pricingSummary = `provider subscription ${policy.pricing.subscriptionMonthlyPriceUsd.toFixed(2)} USD/month + ${policy.pricing.overageFixedRunPriceUsd.toFixed(2)} USD/run`;
      } else {
        total = usageBasedBilling.total;
        providerMarkup = usageBasedBilling.providerMarkup;
        marketplaceFee = usageBasedBilling.marketplaceFee;
        agentPayout = usageBasedBilling.agentPayout;
        platformRevenue = usageBasedBilling.marketplaceFee;
        totalCostBasis = policy.billableBasis;
        overageCharge = usageBasedBilling.total;
        pricingSummary = `provider subscription ${policy.pricing.subscriptionMonthlyPriceUsd.toFixed(2)} USD/month + usage overage`;
      }
    }
  }
  return {
    policyVersion: policy.policyVersion,
    pricingModel: policy.pricing.pricingModel,
    pricing: policy.pricing,
    apiCost: policy.apiCost,
    totalCostBasis,
    costBasis: policy.costBasis,
    tokenUsage: policy.tokenUsage,
    toolUsage: policy.toolUsage,
    costTelemetry: policy.costTelemetry,
    rates: policy.rates,
    providerMarkup,
    tokenMarkup: providerMarkup,
    creatorFee: providerMarkup,
    marketplaceFee,
    baseFee: 0,
    platformFee: marketplaceFee,
    platformMargin: marketplaceFee,
    premiumFee: providerMarkup,
    agentPayout,
    platformRevenue,
    total,
    providerSubscriptionMonthlyPrice,
    providerSubscriptionPlatformFee,
    providerSubscriptionProviderNet,
    overageMode,
    overageCharge,
    pricingSummary
  };
}

export function estimateRunWindow(agent, taskType = 'research', options = {}) {
  const baseLatency = Math.max(15, Number(agent?.avgLatencySec || 30));
  const taskBuckets = {
    research: { minFactor: 1.4, maxFactor: 4.2, apiMin: 2, apiMax: 10 },
    pricing: { minFactor: 1.5, maxFactor: 4.4, apiMin: 3, apiMax: 12 },
    teardown: { minFactor: 1.6, maxFactor: 4.6, apiMin: 4, apiMax: 16 },
    landing: { minFactor: 1.2, maxFactor: 3.1, apiMin: 2, apiMax: 9 },
    validation: { minFactor: 1.4, maxFactor: 4.1, apiMin: 3, apiMax: 12 },
    acquisition_automation: { minFactor: 1.4, maxFactor: 4.2, apiMin: 3, apiMax: 14 },
    directory_submission: { minFactor: 1.4, maxFactor: 4.3, apiMin: 3, apiMax: 12 },
    seo_specialist: { minFactor: 1.4, maxFactor: 4.1, apiMin: 3, apiMax: 14 },
    hiring: { minFactor: 1.1, maxFactor: 2.9, apiMin: 2, apiMax: 8 },
    diligence: { minFactor: 1.7, maxFactor: 4.9, apiMin: 5, apiMax: 20 },
    prompt_brushup: { minFactor: 1.0, maxFactor: 2.6, apiMin: 1, apiMax: 4 },
    summary: { minFactor: 0.9, maxFactor: 2.4, apiMin: 1, apiMax: 4 },
    writing: { minFactor: 1.2, maxFactor: 3.4, apiMin: 2, apiMax: 10 },
    seo: { minFactor: 1.1, maxFactor: 3.1, apiMin: 3, apiMax: 12 },
    code: { minFactor: 1.8, maxFactor: 6.2, apiMin: 6, apiMax: 30 },
    debug: { minFactor: 1.9, maxFactor: 5.8, apiMin: 6, apiMax: 28 },
    automation: { minFactor: 1.7, maxFactor: 5.4, apiMin: 5, apiMax: 24 },
    ops: { minFactor: 1.3, maxFactor: 3.8, apiMin: 3, apiMax: 14 },
    listing: { minFactor: 1.0, maxFactor: 2.8, apiMin: 2, apiMax: 8 }
  };
  const bucket = taskBuckets[String(taskType || '').toLowerCase()] || taskBuckets.research;
  const durationMinSec = Math.max(20, Math.round(baseLatency * bucket.minFactor));
  const durationMaxSec = Math.max(durationMinSec + 20, Math.round(baseLatency * bucket.maxFactor));
  const estimateMin = estimateBilling(agent, { api_cost: bucket.apiMin }, options);
  const estimateMax = estimateBilling(agent, { api_cost: bucket.apiMax }, options);
  const confidence = agent?.verificationStatus === 'verified' ? 'high' : 'medium';
  return {
    taskType: String(taskType || '').toLowerCase() || 'research',
    confidence,
    durationMinSec,
    durationMaxSec,
    estimateMin,
    estimateMax,
    typical: estimateBilling(agent, { api_cost: Math.round((bucket.apiMin + bucket.apiMax) / 2) }, options)
  };
}

function sampleKindFromAgentRecord(agent = {}) {
  const manifest = agent?.metadata?.manifest && typeof agent.metadata.manifest === 'object'
    ? agent.metadata.manifest
    : {};
  const manifestMetadata = manifest.metadata && typeof manifest.metadata === 'object'
    ? manifest.metadata
    : {};
  const taggedSample = Boolean(
    agent?.metadata?.sample === true
    || manifestMetadata.sample === true
    || manifest.sample === true
  );
  if (!taggedSample) return '';
  const explicitKind = String(
    agent?.metadata?.sampleKind
    || agent?.metadata?.sample_kind
    || agent?.metadata?.category
    || manifestMetadata.sampleKind
    || manifestMetadata.sample_kind
    || manifestMetadata.category
    || manifest.category
    || ''
  ).trim().toLowerCase();
  if (explicitKind) return explicitKind;
  const endpointText = [
    manifest.healthcheckUrl,
    manifest.healthcheck_url,
    manifest.jobEndpoint,
    manifest.job_endpoint,
    manifest?.endpoints?.health,
    manifest?.endpoints?.jobs
  ].filter(Boolean).join('\n');
  const endpointMatch = endpointText.match(/\/mock\/([^/]+)\/(?:health|jobs)/i);
  return String(endpointMatch?.[1] || '').trim().toLowerCase();
}

export function isManagedSampleAgent(agent = {}) {
  return Boolean(sampleKindFromAgentRecord(agent));
}

export function isPlatformManagedAgent(agent = {}) {
  return Boolean(
    isManagedSampleAgent(agent)
    || agent?.metadata?.platformManaged === true
    || agent?.metadata?.platform_managed === true
  );
}

function taskSpecificityScore(agent = {}, taskType = '') {
  const requestedTask = String(taskType || '').trim().toLowerCase();
  const tasks = Array.isArray(agent?.taskTypes) ? agent.taskTypes.map((item) => String(item || '').toLowerCase()) : [];
  const index = tasks.indexOf(requestedTask);
  if (index < 0) return 0;
  const primaryFit = index === 0 ? 1 : 0.85;
  const breadthFit = Math.max(0.65, 1 - Math.max(0, tasks.length - 1) * 0.08);
  return +(primaryFit * breadthFit).toFixed(3);
}

function budgetFitScore(agent = {}, taskType = '', budgetCap = 0) {
  const budget = Number(budgetCap || 0);
  if (!Number.isFinite(budget) || budget <= 0) return 1;
  const estimate = estimateRunWindow(agent, taskType);
  const typical = Number(estimate?.typical?.total || estimate?.estimateMax?.total || 0);
  if (!Number.isFinite(typical) || typical <= 0) return 0.8;
  if (typical <= budget) return 1;
  if (typical <= budget * 1.5) return 0.75;
  if (typical <= budget * 2) return 0.55;
  return 0.35;
}

export function computeScore(agent, taskType, budgetCap = 0) {
  const tasks = Array.isArray(agent?.taskTypes) ? agent.taskTypes : [];
  const skillMatch = tasks.includes(taskType) ? 1 : 0;
  const specificity = taskSpecificityScore(agent, taskType);
  const quality = Number(agent.successRate || 0);
  const speed = Math.max(0, 1 - Number(agent.avgLatencySec || 20) / 120);
  const reliability = agent.online ? 1 : 0;
  const priceFit = budgetFitScore(agent, taskType, budgetCap);
  const providerPriority = isManagedSampleAgent(agent) ? 0 : 1;
  return +(
    skillMatch * 0.28
    + specificity * 0.16
    + quality * 0.22
    + providerPriority * 0.16
    + priceFit * 0.1
    + speed * 0.05
    + reliability * 0.03
  ).toFixed(3);
}

export function buildAgentId(name = 'agent') {
  return `agent_${String(name).toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Math.random().toString(16).slice(2, 6)}`;
}
