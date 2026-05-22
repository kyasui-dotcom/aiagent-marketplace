import { createConversionEventPayload } from '../shared.js';

export function createAnalyticsRouteHandlers(deps = {}) {
  const {
    currentUserContext,
    parseBody,
    touchEvent
  } = deps;

  async function recordAnalyticsEvent(storage, request, env) {
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return { error: error.message, statusCode: 400 };
    }
    const current = await currentUserContext(request, env);
    const payload = createConversionEventPayload(body || {}, {
      loggedIn: Boolean(current?.user),
      authProvider: current?.authProvider || 'guest',
      login: current?.login || ''
    });
    if (payload.error) return payload;
    const event = await touchEvent(storage, 'TRACK', payload.message, payload.meta);
    return { ok: true, event: { id: event.id, ts: event.ts, type: event.type } };
  }

  return {
    recordAnalyticsEvent
  };
}
