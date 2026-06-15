import {
  chatSessionMemoryResponseMeta,
  persistApiChatSessionTurn,
  prepareApiChatSessionBody
} from '../api-chat-session-context.js';

export function createOpenChatRouteHandlers(deps = {}) {
  const {
    authorizeOpenChatIntentLlm,
    buildOpenChatRuntimeContextMarkdown,
    classifyOpenChatIntent,
    lazyAppSettingsMap,
    lazyOpenChatRuntimeState,
    orderUiLabelsFromAppSettings,
    parseBody,
    promptInjectionGuardForPrompt,
    promptPolicyBlockPayload
  } = deps;

  async function handleOpenChatIntent(storage, request, env) {
    let body = await parseBody(request).catch((error) => ({ __error: error.message }));
    if (body.__error) return { payload: { error: body.__error }, statusCode: 400 };
    const promptInjection = promptInjectionGuardForPrompt(body.prompt || '');
    if (promptInjection.blocked) {
      return {
        payload: {
          ok: false,
          available: false,
          source: 'guardrail',
          ...promptPolicyBlockPayload(promptInjection)
        },
        statusCode: 400
      };
    }
    const authorization = await authorizeOpenChatIntentLlm(storage, request, env);
    if (!authorization.ok) {
      return {
        payload: {
          ok: false,
          available: false,
          source: authorization.source || 'none',
          error: authorization.error
        },
        statusCode: authorization.statusCode || 403
      };
    }
    const chatSessionPrepared = await prepareApiChatSessionBody(storage, authorization.current || null, body, { mode: 'open-chat-intent' });
    body = chatSessionPrepared.body;
    const state = await lazyOpenChatRuntimeState(storage, authorization.current || {}, env);
    const settings = await lazyAppSettingsMap(storage);
    const uiLabels = orderUiLabelsFromAppSettings(settings);
    const contextMarkdown = buildOpenChatRuntimeContextMarkdown(state, authorization.current || {}, body, uiLabels);
    const result = await classifyOpenChatIntent(body, env, {
      allowOpenAiApiKeyFallback: authorization.allowOpenAiApiKeyFallback,
      allowPlatformOpenAiApiKeyFallback: authorization.allowPlatformOpenAiApiKeyFallback,
      contextMarkdown,
      uiLabels
    });
    const persistedSession = await persistApiChatSessionTurn(storage, authorization.current || null, body, result, chatSessionPrepared.context, { mode: 'open-chat-intent' });
    const chatSessionMeta = chatSessionMemoryResponseMeta(chatSessionPrepared.context || {}, persistedSession);
    if (chatSessionMeta) result.chat_session_memory = chatSessionMeta;
    return { payload: result, statusCode: result.ok ? 200 : 503 };
  }

  return {
    handleOpenChatIntent
  };
}
