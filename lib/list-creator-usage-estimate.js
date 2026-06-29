import { normalizeMoney } from './billing-policy.js';
import { normalizeString } from './account-identity-state.js';

export const LIST_CREATOR_BATCH_SIZE = 20;
export const LIST_CREATOR_MAX_REQUESTED_COMPANIES = 500;
export const LIST_CREATOR_BASE_COST_BASIS = Object.freeze({
  total_cost_basis: 64,
  compute_cost: 16,
  tool_cost: 14,
  labor_cost: 34,
  api_cost: 0
});

function flattenEstimateText(value, parts = [], depth = 0) {
  if (value == null || depth > 4) return parts;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const text = String(value).trim();
    if (text) parts.push(text);
    return parts;
  }
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 40)) flattenEstimateText(item, parts, depth + 1);
    return parts;
  }
  if (typeof value === 'object') {
    for (const item of Object.values(value).slice(0, 80)) flattenEstimateText(item, parts, depth + 1);
  }
  return parts;
}

function scaleListCreatorCostBasis(batchCount = 1) {
  const batches = Math.max(1, Math.ceil(Number(batchCount || 1)));
  return {
    total_cost_basis: normalizeMoney(LIST_CREATOR_BASE_COST_BASIS.total_cost_basis * batches, 0),
    compute_cost: normalizeMoney(LIST_CREATOR_BASE_COST_BASIS.compute_cost * batches, 0),
    tool_cost: normalizeMoney(LIST_CREATOR_BASE_COST_BASIS.tool_cost * batches, 0),
    labor_cost: normalizeMoney(LIST_CREATOR_BASE_COST_BASIS.labor_cost * batches, 0),
    api_cost: normalizeMoney(LIST_CREATOR_BASE_COST_BASIS.api_cost * batches, 0)
  };
}

export function inferListCreatorRequestedCount(value = '', fallback = LIST_CREATOR_BATCH_SIZE) {
  const text = flattenEstimateText(value).join(' ').normalize('NFKC');
  const fallbackCount = Math.max(1, Math.min(LIST_CREATOR_MAX_REQUESTED_COMPANIES, Math.round(Number(fallback || LIST_CREATOR_BATCH_SIZE) || LIST_CREATOR_BATCH_SIZE)));
  const patterns = [
    /(?:top|first|initial|shortlist|list|lead list|prospect list|候補|上位|まず|初回|リスト)\D{0,24}(\d{1,4})\s*(?:companies|company|leads|prospects|rows|社|件)/i,
    /(\d{1,4})\s*(?:companies|company|leads|prospects|lead rows|prospect rows|rows|社|件)\b/i,
    /(\d{1,4})\s*(?:件|社)(?:分|くらい|ほど|程度)?/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const count = Number(match?.[1] || 0);
    if (Number.isFinite(count) && count > 0) {
      return Math.max(1, Math.min(LIST_CREATOR_MAX_REQUESTED_COMPANIES, Math.round(count)));
    }
  }
  return fallbackCount;
}

export function listCreatorUsageEstimateForCount(count = LIST_CREATOR_BATCH_SIZE) {
  const requestedCount = inferListCreatorRequestedCount(String(count), count);
  const batchCount = Math.max(1, Math.ceil(requestedCount / LIST_CREATOR_BATCH_SIZE));
  return {
    requestedCount,
    batchSize: LIST_CREATOR_BATCH_SIZE,
    batchCount,
    usage: scaleListCreatorCostBasis(batchCount),
    baselineUsage: LIST_CREATOR_BASE_COST_BASIS,
    contactCaptureMode: 'public_contact_only'
  };
}

export function listCreatorUsageEstimateForOrder(body = {}, options = {}) {
  const taskType = normalizeString(body.task_type || body.taskType || options.taskType).toLowerCase();
  const agentKind = normalizeString(body.kind || body.agent_kind || body.agentKind || options.kind).toLowerCase();
  if (taskType && taskType !== 'list_creator' && agentKind !== 'list_creator') return null;
  const text = flattenEstimateText([
    body.prompt,
    body.goal,
    body.originalPrompt,
    body.input,
    options.prompt,
    options.input
  ]).join(' ');
  const requestedCount = inferListCreatorRequestedCount(text, options.fallbackCount || LIST_CREATOR_BATCH_SIZE);
  return listCreatorUsageEstimateForCount(requestedCount);
}
