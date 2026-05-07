import { EXACT_MATCH_ALLOWED_WORK_ACTIONS } from '../public/work-action-registry.js';

export function normalizeExactActionPhrase(value = '') {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

const EXACT_MATCH_ALLOWED_ACTIONS = new Set(EXACT_MATCH_ALLOWED_WORK_ACTIONS);

export function sanitizeExactMatchActionsForClient(actions = []) {
  return (Array.isArray(actions) ? actions : [])
    .map((action) => ({
      id: String(action?.id || '').trim(),
      phrase: String(action?.phrase || '').trim(),
      normalizedPhrase: normalizeExactActionPhrase(action?.normalizedPhrase || action?.phrase || ''),
      action: String(action?.action || '').trim(),
      enabled: action?.enabled !== false,
      source: String(action?.source || '').trim(),
      notes: String(action?.notes || '').trim()
    }))
    .filter((action) => action.id && action.phrase && action.action && action.enabled);
}

export function sanitizeExactMatchActionPatch(body = {}) {
  const phrase = String(body?.phrase || '').trim().replace(/\s+/g, ' ');
  const action = String(body?.action || '').trim();
  const normalizedPhrase = normalizeExactActionPhrase(body?.normalizedPhrase || phrase);
  const source = String(body?.source || 'manual').trim().slice(0, 40) || 'manual';
  const notes = String(body?.notes || '').trim().slice(0, 500);
  const requestedId = String(body?.id || '').trim();
  if (!phrase) return { error: 'Phrase is required.' };
  if (phrase.length > 120) return { error: 'Phrase must be 120 characters or fewer.' };
  if (!action) return { error: 'Action is required.' };
  if (!EXACT_MATCH_ALLOWED_ACTIONS.has(action)) return { error: 'Action is not allowed.' };
  const safeStem = normalizedPhrase.replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/gi, '_').replace(/^_+|_+$/g, '') || 'rule';
  return {
    id: requestedId || `exact_${safeStem}`,
    phrase,
    normalizedPhrase,
    action,
    enabled: body?.enabled !== false,
    source,
    notes
  };
}
