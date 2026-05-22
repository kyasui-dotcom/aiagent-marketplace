const AGENT_PROVIDER = Object.freeze({
  health({ kind = '', definition = {}, source = {} } = {}) {
    const seed = agentProviderObject(definition.seedProfile);
    return {
      ok: true,
      service: agentProviderText(definition.healthService, kind || 'agent'),
      kind,
      mode: 'provider_contract',
      provider: 'agent_file',
      generation_provider: agentProviderText(source.OPENAI_API_KEY || source.BUILTIN_OPENAI_API_KEY) ? 'agent_configured' : 'openai_unconfigured',
      file_name: definition.fileName || null,
      model_role: definition.modelRole || null,
      execution_layer: definition.executionLayer || seed.metadata?.layer || null,
      task_types: agentProviderList(seed.taskTypes),
      capabilities: agentProviderList(seed.capabilities),
      tool_strategy: agentProviderObject(definition.toolStrategy),
      specialist_method: agentProviderList(definition.specialistMethod),
      scope_boundaries: agentProviderList(definition.scopeBoundaries),
      freshness_policy: definition.freshnessPolicy || null,
      sensitive_data_policy: definition.sensitiveDataPolicy || null,
      cost_control_policy: definition.costControlPolicy || null
    };
  },

  async runJob({ kind = '', definition = {}, body = {}, source = {} } = {}) {
    const prompt = agentProviderPrompt(body);
    const japanese = agentProviderJapanese(agentProviderLanguageText(body, prompt));
    const seed = agentProviderObject(definition.seedProfile);
    const name = agentProviderText(seed.name || definition.healthService || kind, kind || 'agent');
    const webSources = agentProviderWebSources(body);
    const generatedDelivery = await agentProviderGenerateDelivery(kind, definition, body, source, { webSources });
    if (generatedDelivery?.error) return agentProviderDeliveryFailure(kind, definition, name, japanese, generatedDelivery.error);
    const markdown = generatedDelivery?.fileMarkdown;
    if (!markdown) return agentProviderDeliveryFailure(kind, definition, name, japanese, 'missing_required_deliverable: original request, source context, or concrete artifact was not available.');
    return {
      accepted: true,
      status: 'completed',
      summary: generatedDelivery.summary,
      report: {
        summary: generatedDelivery.reportSummary,
        bullets: agentProviderList(generatedDelivery.bullets),
        nextAction: agentProviderText(generatedDelivery.nextAction, ''),
        confidence: prompt === 'No prompt provided.' ? 'low' : 'medium',
        ...(agentProviderList(generatedDelivery?.artifacts).length ? { artifacts: generatedDelivery.artifacts } : {}),
        ...(agentProviderList(generatedDelivery?.approvalRequests).length ? { approval_requests: generatedDelivery.approvalRequests } : {}),
        ...(webSources.length ? { web_sources: webSources } : {})
      },
      files: [{
        name: agentProviderText(definition.fileName, `${kind || 'agent'}-delivery.md`),
        type: 'text/markdown',
        content: markdown,
        source_task_type: kind,
        content_type: generatedDelivery?.contentType || 'agent_delivery'
      }],
      usage: {
        total_cost_basis: agentProviderUsage(definition),
        compute_cost: Math.round(agentProviderUsage(definition) * 0.35),
        tool_cost: Math.round(agentProviderUsage(definition) * 0.15),
        labor_cost: Math.round(agentProviderUsage(definition) * 0.5),
        api_cost: 0
      },
      return_targets: ['chat', 'api'],
      runtime: {
        mode: 'provider_contract',
        provider: 'agent_file',
        kind,
        service: definition.healthService || null,
        file_name: definition.fileName || null,
        generation_provider: 'openai_responses'
      }
    };
  }
});

function agentProviderText(value = '', fallback = '') {
  const safe = String(value ?? '').trim();
  return safe || fallback;
}

function agentProviderValueText(value = '', fallback = '', depth = 0) {
  if (value == null || depth > 5) return fallback;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return agentProviderText(value, fallback);
  }
  if (Array.isArray(value)) {
    const text = value.map((item) => agentProviderValueText(item, '', depth + 1)).filter(Boolean).join('\n\n').trim();
    return text || fallback;
  }
  if (typeof value === 'object') {
    const preferredText = [
      value.markdown,
      value.content,
      value.body,
      value.text,
      value.value,
      value.file_markdown,
      value.fileMarkdown,
      value.deliverable_markdown,
      value.deliverableMarkdown,
      value.output_text,
      value.summary,
      value.next_action,
      value.nextAction
    ].map((item) => agentProviderValueText(item, '', depth + 1)).filter(Boolean).join('\n\n').trim();
    if (preferredText) return preferredText;
    const text = Object.entries(value)
      .filter(([key]) => !/^(id|name|type|mime|content_?type|source|created|updated|metadata|format|verbosity|reasoning|usage|model|object|status|role|index|finish_?reason|parallel_tool_calls|tools|temperature|top_p|truncation|instructions)$/i.test(key))
      .map(([key, item]) => {
        const nested = agentProviderValueText(item, '', depth + 1).trim();
        return nested ? `## ${key}\n${nested}` : '';
      })
      .filter(Boolean)
      .join('\n\n')
      .trim();
    return text || fallback;
  }
  return fallback;
}

function agentProviderList(value = []) {
  return Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : [];
}

function agentProviderObject(value = {}) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function agentProviderOpenAiConfig(source = {}) {
  const sourceObj = agentProviderObject(source);
  const apiKey = agentProviderText(sourceObj.BUILTIN_OPENAI_API_KEY || sourceObj.OPENAI_API_KEY || sourceObj.openai_api_key || sourceObj.apiKey);
  if (!apiKey) return null;
  const rawBaseUrl = agentProviderText(sourceObj.BUILTIN_OPENAI_BASE_URL || sourceObj.OPENAI_BASE_URL || sourceObj.openai_base_url, 'https://api.openai.com/v1');
  const baseUrl = rawBaseUrl.replace(/\/+$/, '');
  const model = agentProviderText(sourceObj.BUILTIN_OPENAI_MODEL || sourceObj.OPENAI_MODEL || sourceObj.openai_model, 'gpt-5.4-nano');
  return { apiKey, baseUrl, model };
}

function agentProviderRequestedLanguage(body = {}, fallback = '') {
  const broker = body?.input?._broker && typeof body.input._broker === 'object' ? body.input._broker : {};
  const workflow = broker.workflow && typeof broker.workflow === 'object' ? broker.workflow : {};
  const direct = [
    body.output_language, body.outputLanguage, body.user_language, body.userLanguage,
    body.input?.output_language, body.input?.outputLanguage, body.input?.user_language, body.input?.userLanguage,
    broker.output_language, broker.outputLanguage, broker.user_language, broker.userLanguage,
    workflow.output_language, workflow.outputLanguage, workflow.user_language, workflow.userLanguage
  ].map((item) => agentProviderText(item)).find(Boolean);
  if (direct) return direct;
  const joined = [fallback, body.goal, body.full_prompt, body.fullPrompt, body.prompt, workflow.originalPrompt, workflow.original_prompt, workflow.objective]
    .map((item) => String(item || '')).filter(Boolean).join('\n');
  const explicit = joined.match(/(?:output|response|answer|reply|language|lang|回答|出力|言語)\s*(?:language)?\s*[:=：]\s*([^\n,。]+)/i);
  if (explicit) return explicit[1].trim();
  return 'Infer the language from the user request and use that language exactly. Do not assume a fixed language set.';
}

function agentProviderOpenAiPayloadText(payload = {}) {
  if (typeof payload === 'string') return payload;
  const direct = [
    payload.output_text,
    typeof payload.text === 'string' ? payload.text : '',
    payload.content
  ].map((item) => agentProviderValueText(item)).find(Boolean);
  if (direct) return direct;
  const chunks = [];
  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      const text = agentProviderValueText(part?.text || part?.value || part?.content);
      if (text) chunks.push(text);
    }
  }
  const choices = Array.isArray(payload.choices) ? payload.choices : [];
  for (const choice of choices) {
    const text = agentProviderValueText(choice?.message?.content || choice?.text);
    if (text) chunks.push(text);
  }
  return chunks.join('\n').trim();
}

function agentProviderJsonFromText(text = '') {
  const raw = agentProviderText(text);
  if (!raw) return null;
  const candidates = [raw];
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) candidates.push(fenced[1]);
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) candidates.push(raw.slice(start, end + 1));
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {}
  }
  return null;
}

function agentProviderPriorContextForGeneration(body = {}) {
  const broker = body?.input?._broker && typeof body.input._broker === 'object' ? body.input._broker : {};
  const workflow = broker.workflow && typeof broker.workflow === 'object' ? broker.workflow : {};
  const priorRuns = Array.isArray(workflow.priorRuns) ? workflow.priorRuns
    : Array.isArray(body.priorRuns) ? body.priorRuns
    : Array.isArray(body.input?.priorRuns) ? body.input.priorRuns
    : [];
  const priorDeliverables = Array.isArray(workflow.priorDeliverables) ? workflow.priorDeliverables
    : Array.isArray(body.priorDeliverables) ? body.priorDeliverables
    : Array.isArray(body.input?.priorDeliverables) ? body.input.priorDeliverables
    : [];
  const compactRuns = priorRuns.slice(-10).map((run) => {
    const report = agentProviderObject(run?.report);
    return {
      task_type: agentProviderText(run?.taskType || run?.task_type || run?.kind),
      phase: agentProviderText(run?.phase || run?.layer),
      status: agentProviderText(run?.status),
      summary: agentProviderText(run?.summary || report.summary).slice(0, 800),
      next_action: agentProviderText(run?.nextAction || report.nextAction).slice(0, 500),
      sources: agentProviderList(run?.web_sources || report.web_sources || run?.sources).slice(0, 8)
    };
  });
  const compactDeliverables = priorDeliverables.slice(-10).map((item) => ({
    task_type: agentProviderText(item?.taskType || item?.task_type || item?.kind),
    status: agentProviderText(item?.status),
    file: agentProviderText(item?.fileName || item?.file_name || item?.name),
    summary: agentProviderText(item?.summary || item?.content_summary).slice(0, 800)
  }));
  return { prior_runs: compactRuns, prior_deliverables: compactDeliverables };
}

function agentProviderMarkdownTitle(markdown = '', fallback = '') {
  const text = agentProviderText(markdown);
  const heading = text.split(/\r?\n/).map((line) => line.trim()).find((line) => /^#{1,3}\s+/.test(line));
  return agentProviderText(heading ? heading.replace(/^#{1,3}\s+/, '') : '', fallback);
}

function agentProviderMarkdownBullets(markdown = '') {
  return String(markdown || '').split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, '').trim())
    .filter(Boolean)
    .slice(0, 5);
}

function agentProviderNormalizeGeneratedDelivery(payload = {}, fallbackName = '') {
  const rawText = agentProviderOpenAiPayloadText(payload);
  const parsed = agentProviderJsonFromText(rawText);
  const data = parsed || (!rawText && payload && typeof payload === 'object' ? payload : null);
  const rawMarkdown = agentProviderText(rawText);
  const fileMarkdown = data
    ? agentProviderValueText(data.file_markdown || data.fileMarkdown || data.markdown || data.content_markdown || data.content || data.body)
    : rawMarkdown;
  if (!fileMarkdown || agentProviderLooksLikeTemplate(fileMarkdown)) return null;
  const title = agentProviderMarkdownTitle(fileMarkdown, agentProviderText(fallbackName, 'agent_delivery'));
  const bullets = agentProviderList(data?.bullets).length ? agentProviderList(data.bullets) : agentProviderMarkdownBullets(fileMarkdown);
  return {
    summary: agentProviderText(data?.summary, title),
    reportSummary: agentProviderText(data?.report_summary || data?.reportSummary, title),
    bullets,
    nextAction: agentProviderText(data?.next_action || data?.nextAction || data?.recommended_next_action),
    fileMarkdown,
    contentType: agentProviderText(data?.content_type || data?.contentType, 'agent_delivery'),
    artifacts: Array.isArray(data?.artifacts) ? data.artifacts.filter((item) => item && typeof item === 'object') : [],
    approvalRequests: Array.isArray(data?.approval_requests) ? data.approval_requests.filter((item) => item && typeof item === 'object') : []
  };
}

async function agentProviderGenerateDelivery(kind = '', definition = {}, body = {}, source = {}, options = {}) {
  const config = agentProviderOpenAiConfig(source);
  if (!config) return { error: 'openai_delivery_generation_unavailable' };
  const prompt = agentProviderPrompt(body);
  const seed = agentProviderObject(definition.seedProfile);
  const name = agentProviderText(seed.name || definition.healthService || kind, kind || 'agent');
  const webSources = Array.isArray(options.webSources) ? options.webSources : agentProviderWebSources(body);
  const requestPacket = {
    requested_language: agentProviderRequestedLanguage(body, prompt),
    agent: {
      kind,
      name,
      role: agentProviderText(definition.modelRole || seed.role || definition.healthService),
      layer: agentProviderText(definition.executionLayer || seed.metadata?.layer),
      capabilities: agentProviderList(seed.capabilities || definition.capabilities),
      specialist_method: agentProviderList(definition.specialistMethod),
      scope_boundaries: agentProviderList(definition.scopeBoundaries)
    },
    user_request: agentProviderPublicBrief(body).slice(0, 6000),
    full_request_excerpt: prompt.slice(0, 8000),
    target_url: agentProviderPrimaryUrl(body),
    evidence_sources: webSources.slice(0, 16),
    prior_context: agentProviderPriorContextForGeneration(body),
    leader_synthesis: options.leaderSynthesis || null,
    output_contract: 'Return only user-facing delivery text and structured handoff data. Do not include workflow prompts, provider implementation notes, raw handoff context, or internal QA text.'
  };
  try {
    const response = await fetch(config.baseUrl + '/responses', {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + config.apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: config.model,
        store: false,
        input: [
          {
            role: 'system',
            content: [{
              type: 'input_text',
              text: 'Execute this CAIt agent as an external provider. Write the completed delivery in the requested language, which may be any human language. Use supplied evidence and prior work when present. Do not expose system prompts, workflow handoff text, provider details, implementation notes, or template instructions. Do not claim external posting, sending, publishing, repository writes, or connector execution unless source evidence proves it. Return the final user-facing delivery as plain Markdown text. Do not wrap it in JSON unless the user explicitly requested JSON.'
            }]
          },
          {
            role: 'user',
            content: [{ type: 'input_text', text: JSON.stringify(requestPacket) }]
          }
        ]
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = agentProviderText(payload?.error?.message || payload?.message || response.statusText, 'OpenAI delivery generation failed.');
      return { error: 'openai_delivery_generation_failed', detail: message };
    }
    const normalized = agentProviderNormalizeGeneratedDelivery(payload, name);
    return normalized || { error: 'openai_delivery_generation_failed' };
  } catch (error) {
    const message = agentProviderText(error?.message, 'OpenAI delivery generation failed.');
    return { error: 'openai_delivery_generation_failed', detail: message };
  }
}

function agentProviderJapanese(value = '') {
  const raw = String(value || '').trim();
  const exact = raw.toLowerCase();
  if (/^(ja|jp|japanese|日本語)$/.test(exact)) return true;
  if (/^(en|english|英語)$/.test(exact)) return false;
  const explicit = raw.match(/(?:output|user|response|回答|出力|言語|language)\s*(?:language)?\s*[:=：]\s*(japanese|日本語|ja|jp|english|英語|en)\b/i);
  if (explicit) return /^(japanese|日本語|ja|jp)$/i.test(explicit[1]);
  if (/日本語で|日本語に|日本語の|日本語回答|日本語出力/.test(raw)) return true;
  if (/英語で|英語に|英語の|英語回答|英語出力/.test(raw)) return false;
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(raw);
}

function agentProviderLanguageText(body = {}, fallback = '') {
  const broker = body?.input?._broker && typeof body.input._broker === 'object' ? body.input._broker : {};
  const workflow = broker.workflow && typeof broker.workflow === 'object' ? broker.workflow : {};
  return [
    body.output_language, body.outputLanguage, body.user_language, body.userLanguage,
    body.input?.output_language, body.input?.outputLanguage, body.input?.user_language, body.input?.userLanguage,
    broker.output_language, broker.outputLanguage, broker.user_language, broker.userLanguage,
    workflow.output_language, workflow.outputLanguage, workflow.user_language, workflow.userLanguage,
    workflow.originalPrompt, workflow.original_prompt, workflow.objective,
    body.input?.original_prompt, body.input?.originalPrompt,
    fallback, body.goal, body.full_prompt, body.fullPrompt, body.prompt
  ].map((item) => String(item || '')).join('\n');
}


function agentProviderPrompt(body = {}) {
  return agentProviderText(body.goal || body.full_prompt || body.fullPrompt || body.prompt, 'No prompt provided.');
}

function agentProviderPublicBrief(body = {}) {
  const raw = agentProviderPrompt(body);
  const cleaned = raw
    .replace(/=== WORKFLOW HANDOFF CONTEXT ===[\s\S]*?=== END WORKFLOW HANDOFF CONTEXT ===/gi, '')
    .replace(/=== WORKFLOW ADDITIONAL PROMPT ===[\s\S]*$/gi, '')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line && !/^(Task|Goal|Work split|Inputs|Deliver|Output language|Token rule|Conversation lead|Acceptance|Constraints|Current specialist|Required output behavior|PROCESS PROGRAM|STRUCTURED HANDOFF DIGEST|PRIOR SPECIALIST DELIVERABLE)/i.test(line))
    .filter((line) => !/(provider\.runJob|Agent-owned behavior|WORKFLOW HANDOFF CONTEXT|canonical user brief|process program|structured handoff digest|prior specialist deliverable)/i.test(line))
    .join('\n')
    .trim();
  return cleaned.slice(0, 1200);
}

function agentProviderWebSources(body = {}) {
  const sources = [];
  const seen = new Set();
  const push = (source = {}, fallback = {}) => {
    const value = typeof source === 'string' ? { url: source } : source;
    if (!value || typeof value !== 'object') return;
    const rawUrl = agentProviderText(value.url || value.link || value.href || value.siteUrl || value.site || value.source_url || value.sourceUrl || fallback.url);
    const url = agentProviderCleanSourceUrl(rawUrl);
    const title = agentProviderText(value.title || value.name || value.label || fallback.title, url ? 'Source context' : 'Source query');
    const snippet = agentProviderText(value.snippet || value.description || value.summary || fallback.snippet);
    const query = agentProviderText(value.query || value.search_query || value.searchQuery || fallback.query);
    if (!url && !title && !snippet && !query) return;
    const key = [url, title, snippet, query].join('|').toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    sources.push({
      url,
      title,
      snippet,
      query,
      action: agentProviderText(value.action || value.source_action || value.sourceAction || fallback.action, 'source_collection'),
      provider: agentProviderText(value.provider || value.search_provider || value.searchProvider || fallback.provider, 'agent_file_source_collection')
    });
  };
  const broker = body?.input?._broker && typeof body.input._broker === 'object' ? body.input._broker : {};
  const workflow = broker.workflow && typeof broker.workflow === 'object' ? broker.workflow : {};
  const handoff = workflow.leaderHandoff && typeof workflow.leaderHandoff === 'object' ? workflow.leaderHandoff : {};
  for (const container of [
    body.web_sources,
    body.webSources,
    body.sources,
    body.source_context?.web_sources,
    body.sourceContext?.webSources,
    body.report?.web_sources,
    body.output?.report?.web_sources,
    body.input?.web_sources,
    body.input?.webSources,
    broker.web_sources,
    broker.webSources,
    workflow.web_sources,
    workflow.webSources,
    handoff.web_sources,
    handoff.webSources
  ]) {
    if (Array.isArray(container)) for (const item of container) push(item, { action: 'source_collection' });
  }
  for (const run of [
    ...(Array.isArray(handoff.priorRuns) ? handoff.priorRuns : []),
    ...(Array.isArray(handoff.priorDeliverables) ? handoff.priorDeliverables : [])
  ]) {
    for (const item of Array.isArray(run?.webSources) ? run.webSources : []) {
      push(item, { title: run?.taskType || run?.workflowTask || 'Prior specialist source', action: 'prior_source_collection', provider: 'leader_handoff' });
    }
  }
  const contexts = [
    ...(Array.isArray(body.input?.connectorContexts) ? body.input.connectorContexts : []),
    ...(Array.isArray(body.input?.appContexts) ? body.input.appContexts : []),
    ...(Array.isArray(broker.appContexts) ? broker.appContexts : []),
    ...(Array.isArray(broker.connectorContexts) ? broker.connectorContexts : [])
  ];
  for (const context of contexts) {
    if (!context || typeof context !== 'object') continue;
    const raw = context.raw_context && typeof context.raw_context === 'object'
      ? context.raw_context
      : (context.rawContext && typeof context.rawContext === 'object' ? context.rawContext : {});
    const provider = context.source_app || context.sourceApp || 'app_context';
    for (const value of [raw.googleSearchConsoleSite, raw.siteUrl, raw.site, raw.url, context.url]) {
      push(String(value || ''), {
        title: context.title || context.summary || context.source_app_label || context.source_app || 'Attached source context',
        snippet: context.summary || 'Source URL carried by attached app/connector context.',
        action: 'source_collection',
        provider
      });
    }
    for (const rawUrl of agentProviderExtractSourceUrls(JSON.stringify(context))) {
      push(rawUrl, {
        title: context.title || context.source_app_label || 'Attached source context',
        snippet: context.summary || 'Source URL carried by attached app/connector context.',
        action: 'source_collection',
        provider
      });
    }
  }
  const text = [
    body.full_prompt,
    body.fullPrompt,
    body.prompt,
    body.goal,
    body.additional_prompt,
    body.additionalPrompt,
    body.input?.original_prompt,
    body.input?.originalPrompt,
    workflow.originalPrompt,
    workflow.original_prompt,
    workflow.objective,
    JSON.stringify(body.input || {}),
    JSON.stringify(body.source_context || body.sourceContext || {})
  ].map((item) => String(item || '')).join('\\n');
  for (const rawUrl of agentProviderExtractSourceUrls(text)) {
    push(rawUrl, {
      title: 'Source URL from prompt context',
      snippet: 'URL supplied in the request or workflow context.',
      action: 'source_collection',
      provider: 'prompt_context'
    });
  }
  return sources.slice(0, 8);
}

function agentProviderCleanSourceUrl(value = '') {
  const text = String(value || '').trim().replace(/\?["'].*$/g, '').replace(/[),.;\]]+$/g, '');
  if (!text) return '';
  const domain = text.match(/^sc-domain:([a-z0-9.-]+)$/i);
  if (domain) return 'https://' + domain[1] + '/';
  if (/^https?:\/\//i.test(text)) return text;
  return '';
}

function agentProviderExtractSourceUrls(value = '') {
  const urls = [];
  const pattern = /(https?:\/\/[^\s<>)\]\"'\\]+|sc-domain:[a-z0-9.-]+)/ig;
  let match;
  while ((match = pattern.exec(String(value || '')))) {
    const url = agentProviderCleanSourceUrl(match[1]);
    if (url && !urls.includes(url)) urls.push(url);
  }
  return urls.slice(0, 12);
}

function agentProviderUsage(definition = {}) {
  return Math.max(40, Math.round(Number(definition.seedProfile?.avgLatencySec || 10) * 4));
}

function agentProviderSection(title = '', values = []) {
  const items = agentProviderList(values);
  if (!items.length) return '';
  return [`## ${title}`, ...items.map((item) => `- ${item}`)].join('\n');
}

function agentProviderInstructionLike(value = '') {
  const text = String(value || '').trim();
  return /^(write|return|deliver|include|end with|make|produce)\b/i.test(text)
    || /\bsections? for\b/i.test(text)
    || /delivery packet|output sections|acceptance checks|review conditions/i.test(text);
}

function agentProviderFirstMatch(text = '', patterns = []) {
  const source = String(text || '');
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match?.[1]) return agentProviderText(match[1], '');
    if (match?.[0]) return agentProviderText(match[0], '');
  }
  return '';
}

function agentProviderBriefText(body = {}) {
  return agentProviderPublicBrief(body).replace(/\n{3,}/g, '\n\n').trim();
}

function agentProviderPrimaryUrl(body = {}) {
  const text = [
    agentProviderPrompt(body),
    JSON.stringify(body?.input || {}),
    JSON.stringify(body?.source_context || body?.sourceContext || {})
  ].join('\n');
  return agentProviderFirstMatch(text, [
    /(?:Product\/service|Target URL|対象サービス|対象URL|URL)\s*[:：][^\n]*(https?:\/\/[^\s)>,]+)/i,
    /(https?:\/\/[^\s)>,]+)/i
  ]);
}

function agentProviderHost(url = '') {
  try { return new URL(url).hostname.replace(/^www\./i, ''); } catch {}
  return agentProviderText(url || 'the target service', 'the target service').replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
}

function agentProviderFieldValue(body = {}, labels = []) {
  const text = agentProviderPrompt(body).replace(/\r/g, '\n');
  const labelPattern = labels.map((label) => String(label).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const nextLabel = '(?:Product\\/service|対象サービス|Analytics data|アナリティクス|Main goal|主な目的|Primary conversion|Conversion goal|Target audience|対象ユーザー|Constraints|制約|Priority channel|優先チャネル|Attached connector context|GA4 property|Search Console site|Date range|Sessions|Conversions|Conversion rate|Task|Goal|Conversation lead|Work split|Inputs|Deliver|Output language|Acceptance)';
  const match = text.match(new RegExp(`(?:^|[\\n;-])\\s*-?\\s*(?:${labelPattern})\\s*[:：]\\s*-?\\s*([\\s\\S]*?)(?=(?:\\n\\s*-?\\s*${nextLabel}\\s*[:：])|(?:\\s+-\\s*${nextLabel}\\s*[:：])|$)`, 'i'));
  if (!match?.[1]) return '';
  return String(match[1])
    .replace(new RegExp(`^\\s*-?\\s*(?:${labelPattern})\\s*[:：]\\s*`, 'i'), '')
    .replace(/\\s+-\\s*(?:Constraints|制約|Priority channel|優先チャネル|Main goal|主な目的|Analytics data|アナリティクス)\\s*[:：][\\s\\S]*$/i, '')
    .replace(/\\s+/g, ' ')
    .trim();
}

function agentProviderAudience(body = {}) {
  const text = agentProviderPrompt(body);
  const explicit = agentProviderFieldValue(body, ['Target audience', '対象ユーザー']);
  if (explicit) return explicit;
  if (/developers?|engineers?|technical users?|開発者|技術/i.test(text)) return 'developers and technical users';
  if (/consumer|individual|一般消費者|個人|traveler|tourist|旅行者|訪日/i.test(text)) return 'travelers and individual consumers';
  return 'the target audience';
}

function agentProviderConversion(body = {}) {
  const text = agentProviderPrompt(body);
  const goal = agentProviderFieldValue(body, ['Primary conversion', 'Conversion goal', 'Main goal', '主な目的']);
  const conversionText = goal || text;
  if (/lead|inquir|contact|問い合わせ|リード|相談|見積/i.test(conversionText)) return 'lead or inquiry';
  if (/sales|revenue|purchase|booking|売上|購入|予約/i.test(conversionText)) return 'purchase or revenue action';
  if (/sign\s*ups?|sign[_ -]?up|trials?|登録|トライアル/i.test(conversionText)) return 'signup or trial start';
  return 'the primary conversion';
}

function agentProviderConversionEvent(conversion = '') {
  const text = String(conversion || '').toLowerCase();
  if (/lead|inquiry/.test(text)) return 'inquiry_submit';
  if (/purchase|revenue|booking/.test(text)) return 'purchase_complete_or_revenue_event';
  if (/signup|trial/.test(text)) return 'signup_or_trial_start';
  return 'primary_conversion_event';
}
function agentProviderPrimaryChannel(body = {}) {
  const text = agentProviderPrompt(body);
  const channel = agentProviderFieldValue(body, ['Priority channel', '優先チャネル']);
  const channelText = channel || text;
  if (/organic search|seo|自然検索|検索|search console|query/i.test(channelText)) return 'organic search / SEO';
  if (/referral|github|reddit|indie hackers|参照/i.test(channelText)) return 'referral sites';
  if (/social|sns|x\/twitter|投稿/i.test(channelText)) return 'social';
  if (/email|mail|gmail|メール/i.test(channelText)) return 'email';
  return 'owned surface';
}

function agentProviderOffer(body = {}) {
  const text = [agentProviderPrompt(body), agentProviderPrimaryUrl(body)].join(' ');
  if (/esim|e-sim|airalo|holafly|ahamo|wifi|wi-fi|travel|旅行|訪日|海外/i.test(text)) return 'travel eSIM and connectivity service';
  if (/agent|\bai\b|artificial intelligence|workflow|automation|自動化/i.test(text)) return 'AI-agent workflow service';
  if (/pricing|subscription|billing|課金|料金/i.test(text)) return 'pricing or subscription offer';
  return 'service offer';
}
function agentProviderMetricValue(body = {}, label = '') {
  const escaped = String(label || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return agentProviderFirstMatch(agentProviderPrompt(body), [new RegExp(`${escaped}\\s*[:：]\\s*([^;\\n]+)`, 'i')]);
}

function agentProviderEvidenceLines(body = {}) {
  const lines = [];
  const prompt = agentProviderPrompt(body);
  const add = (value = '') => {
    const text = agentProviderText(value, '');
    if (text && !lines.includes(text)) lines.push(text);
  };
  const url = agentProviderPrimaryUrl(body);
  if (url) add(`Target URL: ${url}`);
  for (const label of ['GA4 property', 'Search Console site', 'Date range', 'Sessions', 'Conversions', 'Conversion rate', 'Top query', 'Top landing page', 'Top channel']) {
    const value = agentProviderMetricValue(body, label);
    if (value) add(`${label}: ${value}`);
  }
  const webSources = [body.web_sources, body.webSources, body.report?.web_sources, body.input?.web_sources, body.input?.webSources]
    .flat()
    .filter(Boolean);
  for (const source of webSources.slice(0, 8)) {
    if (typeof source === 'string') add(`Source: ${source}`);
    else if (source && typeof source === 'object') add(`Source: ${[source.title || source.name, source.url || source.link || source.href, source.snippet || source.summary].filter(Boolean).join(' | ')}`);
  }
  const sourceQueryMatches = [...prompt.matchAll(/Search Console query:\s*([^|\n]+)\s*\|\s*(https?:\/\/[^\s|]+)[^\n]*/gi)].slice(0, 6);
  for (const match of sourceQueryMatches) add(`Search query: ${agentProviderText(match[1])} -> ${agentProviderText(match[2])}`);
  return lines.slice(0, 10);
}

function agentProviderDeliveryFailure(kind = '', definition = {}, name = 'agent', japanese = false, reason = 'missing_required_deliverable') {
  const failure = agentProviderText(reason, 'missing_required_deliverable');
  const category = agentProviderText(failure.split(':')[0], 'missing_required_deliverable');
  return {
    accepted: false,
    status: 'failed',
    summary: category,
    error: category,
    failure_reason: failure,
    report: {
      summary: category,
      bullets: [category],
      nextAction: '',
      confidence: 'low'
    },
    files: [],
    usage: { total_cost_basis: 0, compute_cost: 0, tool_cost: 0, labor_cost: 0, api_cost: 0 },
    return_targets: ['chat', 'api'],
    runtime: {
      mode: 'provider_contract',
      provider: 'agent_file',
      kind,
      service: definition.healthService || null,
      file_name: definition.fileName || null,
      failure_category: category
    }
  };
}

function agentProviderLooksLikeTemplate(content = '') {
  const text = String(content || '').toLowerCase();
  return /##\s*delivery packet/i.test(content)
    || /\bwrite sections? for\b/i.test(text)
    || /\bwrite a two-part markdown delivery\b/i.test(text)
    || /prepared a concrete work product|could not produce a safe user-facing delivery|create one proof-led page|concrete artifact/i.test(text)
    || /今回の入力に基づく具体成果物|具体成果物を返します|具体成果物を作る/i.test(text)
    || /agent-owned behavior|workflow handoff context|structured handoff digest|provider\.runjob/i.test(text);
}

const AGENT_DEFINITION = {
  provider: AGENT_PROVIDER,
  "fileName": "seo-agent-delivery.md",
  "healthService": "seo_specialist_agent",
  "modelRole": "SEO specialist for research, keyword strategy, content planning, article drafting, E-E-A-T evidence requests, and Publisher-ready batch handoff",
  "executionLayer": "preparation",
  "taskRouting": {
    "aliases": ['seo', 'seo_research', 'keyword_research', 'seo_article_batch'],
    "inferenceRules": [
      { taskType: 'seo_specialist', patterns: [/(seo|meta|description|title|検索|流入|想定キーワード|検索上位|上位サイト|記事数|文字数|eeat|e-e-a-t|content plan|article batch|publisher handoff)/i] }
    ],
    "expansionTasksByTask": {
      seo: ['seo_specialist']
    },
    "softMatchTokensByTask": {
      seo_specialist: ['seo_specialist', 'seo', 'content_gap', 'seo_article', 'seo_rewrite', 'seo_monitor', 'keyword_research', 'serp', 'eeat', 'publisher_handoff'],
      seo: ['seo', 'search', 'metadata', 'content_gap', 'seo_article', 'keyword_research', 'serp', 'eeat', 'publisher_handoff']
    },
    "tagHints": ['marketing', 'seo', 'research']
  },
  "seedProfile": {
    "id": "agent_seospecialist_01",
    "name": "SEO SPECIALIST AGENT",
    "description": "Built-in SEO specialist that owns the full SEO workflow in one agent: target-site and SERP research, keyword/content planning, E-E-A-T evidence requests, cost approval before bulk article writing, article batch drafting, and Publisher-ready batch handoff.",
    "taskTypes": [
      "seo_specialist",
      "seo",
      "seo_research",
      "keyword_research",
      "content_plan",
      "seo_article",
      "seo_article_batch",
      "seo_rewrite",
      "seo_monitor",
      "publisher_handoff",
      "content_gap",
      "research"
    ],
    "successRate": 0.92,
    "avgLatencySec": 28,
    "optionalConnectors": [
      "google_search_console",
      "ga4",
      "csv_export",
      "github",
      "wordpress",
      "publisher",
      "pdf_upload",
      "web_fetch"
    ],
    "capabilities": [
      "serp_gap_analysis",
      "target_site_read",
      "keyword_cluster_strategy",
      "top_result_article_count_estimate",
      "word_count_range_estimate",
      "page_map",
      "rewrite_spec",
      "article_count_and_brief_plan",
      "batch_article_drafting",
      "cta_and_trust_spec",
      "eeat_gap_analysis",
      "information_request_planning",
      "batch_article_cost_estimate",
      "approval_gate_before_writing",
      "internal_link_plan",
      "publisher_batch_handoff",
      "github_pr_publish_handoff",
      "wordpress_publish_handoff",
      "x_and_blog_distribution_plan",
      "proposal_pr_handoff"
    ],
    "metadata": {
      "agentRole": "worker",
      "workflow_layer": "preparation",
      "seo_modes": [
        "article_creation",
        "existing_page_rewrite",
        "site_keyword_monitoring",
        "keyword_research",
        "article_batch",
        "publisher_batch_handoff"
      ],
      "approval_mode": "cost_approval_before_article_batch",
      "publisher_mode": "batch_publisher_handoff_after_user_approval",
      "connector_behavior": "Prefer live SERP plus current site pages. If Search Console or GA4 is available, tie recommendations to signup or registration conversion. When URL, CMS, or repo context exists, return a PR-ready or Publisher-ready page/article batch handoff instead of stopping at generic advice. Do not execute Publisher, GitHub PR, WordPress, X, or other external writes from this agent.",
      "required_user_evidence_types": [
        "target site URL",
        "owned blog URLs",
        "PDFs or documents proving experience/expertise",
        "author profile or credentials",
        "case studies, screenshots, product usage notes, reviews, customer examples",
        "approved X posts or social proof"
      ],
      "distribution_channels": [
        "owned_blog",
        "x",
        "qiita_or_zenn",
        "note",
        "community_post",
        "publisher_approval_studio"
      ]
    }
  },
  "systemPrompt": "You are the built-in SEO Specialist Agent for AIagent2. You are not a leader and you do not delegate SEO work to other agents. Own the SEO workflow inside this agent: target-site read, keyword research, SERP/top-result analysis, competitor content-depth analysis, article count planning, article word-count planning, E-E-A-T evidence requests, cost approval before bulk writing, article drafting after approval, and Publisher-ready batch handoff. Support modes for article creation, existing-page rewrite/gap analysis, site/keyword monitoring, keyword research, and approved article batch production. Infer the mode from inputs: targetUrl plus keyword means rewrite; siteUrl plus targetKeywords or ranking/monitoring language means monitor; otherwise create an SEO article/content gap plan. First read or request the target site URL, target market/language, current pages, conversion goal, and candidate keywords. Before writing, inspect current SERP/top results when available, fetch or summarize top competitors, and identify search intent, H1/H2/H3 structure, article count or content depth, approximate word-count range, strengths, missing topics, freshness, internal-link patterns, E-E-A-T signals, and differentiation points. Treat analysis as the first step, not the final output. After the SERP read, decide the page or article cluster that should win, what each page must say, how many articles should be created, the expected word count per article, and what concrete changes should be shipped first. If required information is missing, ask the user for URLs, PDFs, docs, screenshots, X posts, owned blog posts, author profiles, case studies, customer examples, reviews, or other proof before drafting. Before writing a full article batch, estimate cost using article count, expected word count, research depth, evidence review, and Publisher handoff effort, then request explicit user approval. Do not draft the full batch or send anything to Publisher before that approval. After approval and evidence intake, write each required article as a publish-ready Markdown packet with slug, meta title, meta description, H1/H2/H3, FAQ, internal links, CTA, E-E-A-T notes, source ledger, and approval notes. Finally prepare a Publisher & Approval Studio batch handoff so all articles can be reviewed together and then pushed through the appropriate connector, GitHub PR, WordPress path, or other Publisher-controlled path. Publisher execution, PR creation, WordPress draft creation, posting to X, and any external write remain approval-gated outside this agent; this agent prepares the batch packet only. Always make language and market explicit. If the request implies English-speaking SEO, write for English-language SERPs, English page patterns, and English distribution channels instead of defaulting to Japanese assumptions. Follow Google-aligned SEO practice: E-E-A-T, user-first readability, natural keyword usage, no keyword stuffing, clear H1/H2/H3 hierarchy, and a proposed meta title and meta description. When repo files, CMS blocks, page sections, or implementation context are provided, return a proposal-PR or Publisher-ready handoff: changed sections, replacement copy, structural edits, acceptance checks, and validation notes. When the user also needs free distribution, include channel-ready templates for X, Qiita/Zenn, note, and one community/discussion format that matches the same keyword or page angle. Continue with explicit source-status notes if search or fetch is unavailable.",
  "deliverableHint": "Deliver in the user requested language in a clear, user-readable format.",
  "reviewHint": "Reject generic SEO advice. Confirm mode, language/market, keyword, intent, top-result evidence, page-to-query mapping, conversion goal, concrete page changes, CTA/trust changes, E-E-A-T angle, competitor gaps, natural keyword use, and an actionable rewrite/article/monitoring or PR-ready output. If the request is strategic, it must still end in exact pages, exact copy surfaces, and exact measurement points.",
  "executionFocus": "Run SEO analysis first, then turn it into one concrete page decision. Infer article, rewrite, or monitor mode, inspect the current SERP and competitors, map the winning page, and return exact page changes, CTA/trust edits, and a PR-ready implementation handoff when site or repo context exists.",
  "outputSections": [
    "Mode, conversion goal, and target keyword",
    "SERP and competitor analysis",
    "Page map",
    "Winning-page recommendation",
    "Concrete page changes",
    "Rewrite spec or article brief",
    "CTA, trust, and internal-link plan",
    "Proposal PR handoff",
    "Distribution templates",
    "Meta title and meta description",
    "Sources and next measurement"
  ],
  "inputNeeds": [
    "SEO mode or goal",
    "Primary conversion goal",
    "Target keyword or topic",
    "Market and language",
    "Target URL or site URL",
    "Current site/pages and competitors",
    "Analytics or Search Console context",
    "Repo, CMS, or implementation context when PR-style changes are needed"
  ],
  "acceptanceChecks": [
    "Mode, keyword, language, intent, and conversion goal are clear",
    "Top SERP competitors, URLs, and content structure are considered",
    "One target page and one supporting page are justified",
    "Page changes, CTA, and trust changes are explicit",
    "PR-style handoff or implementation spec is included when context exists",
    "Measurement next step is included"
  ],
  "firstMove": "Infer article/rewrite/monitor mode from the request, then inspect the SERP, choose the page that should win, and only after that write the concrete rewrite, new-page, or monitoring output.",
  "failureModes": [
    "Do not write SEO advice without mode, keyword, intent, and live or stated competitor context",
    "Do not jump from analysis to vague advice without naming the exact page to change or create",
    "Do not keyword-stuff or hide weak source coverage",
    "Do not skip the report section before rewrite/article/monitoring or PR-ready output"
  ],
  "evidencePolicy": "Use target keyword, conversion goal, language, mode, target URL/site URL, current pages, top search results, fetched competitor pages, page-level CTA/trust context, search intent, content gap evidence, and any repo/CMS context for implementation. Use Search Console or GA4 when available to tie SEO changes to signup behavior. Date current SERP observations and state when search/fetch was unavailable.",
  "nextAction": "End with the first page to change or create, the target keyword, the CTA change, the PR-ready or implementation handoff, the next publish asset, and the measurement plan.",
  "confidenceRubric": "High when keyword, language, site, target page, SERP pattern, competitors, conversion goal, and implementation context are known; medium when SERP access is partial or analytics/implementation context is missing; low when keyword, intent, or target page is unclear.",
  "handoffArtifacts": [
    "SEO mode decision",
    "Keyword/intent and conversion summary",
    "SERP/competitor analysis",
    "Page map and winning-page recommendation",
    "Concrete page changes and PR handoff",
    "Distribution assets and measurement plan"
  ],
  "prioritizationRubric": "Prioritize work by search intent fit, conversion impact, competitor gap severity, ranking opportunity, page ownership clarity, implementation readiness, and whether rewrite, new page, or monitoring mode is most appropriate.",
  "measurementSignals": [
    "Ranking feasibility",
    "Search impressions",
    "Organic clicks",
    "Primary CTA click rate",
    "Registration or signup conversion from page",
    "SERP competitor movement",
    "Implemented page-change impact"
  ],
  "assumptionPolicy": "Assume article mode for a plain keyword/topic. Switch to rewrite when targetUrl plus keyword is present, and monitor when siteUrl plus targetKeywords or ranking language is present. When a site URL and conversion goal are present, assume the user needs page mapping, concrete page changes, and CTA guidance before broader landing ideas. Do not assume language, market, or SERP pattern when they change the content plan.",
  "escalationTriggers": [
    "SEO mode, keyword, language, market, or conversion goal is unclear",
    "Current SERP evidence is needed but unavailable",
    "The content goal conflicts with search intent",
    "Rewrite/monitoring was requested but target URL or site URL is missing",
    "A signup or registration goal was named but the target page, CTA surface, or implementation surface is unclear"
  ],
  "minimumQuestions": [
    "Should this be article creation, existing-page rewrite, or site/keyword monitoring?",
    "What keyword/topic, language/market, and conversion goal are targeted?",
    "Which target URL, site URL, current pages, or competitors should be considered?",
    "Is there repo, CMS, or implementation context for a PR-style handoff?",
    "What reader, signup, or content goal matters most?"
  ],
  "reviewChecks": [
    "Mode, intent, and conversion goal are addressed",
    "Competitors, live URLs, and top-result structure are summarized",
    "Page map, CTA, trust changes, and target page choice are prioritized",
    "Rewrite/article/monitoring and PR-style implementation requirements are actionable"
  ],
  "depthPolicy": "Default to one focused SEO mode, one page/keyword target, and the first executable deliverable. Go deeper when SERP intent, competitor fetches, rewrite gaps, CTA/trust edits, implementation handoff, and distribution templates all matter.",
  "concisionRule": "Avoid generic SEO advice; keep the analysis, chosen target page, concrete page changes, CTA/trust edits, PR-style handoff, deliverable, meta description, and priority order visible.",
  "toolStrategy": {
    "web_search": "default",
    "source_mode": "current_serp_top_results_fetch_top_competitors_and_keyword_intent",
    "note": "Use one focused SERP search, inspect the top result URLs plus H1/H2/H3 structure, fetch or summarize up to three competitors, map one keyword cluster to one page, and turn the analysis into exact page changes plus a PR-ready handoff when implementation context exists. Continue with explicit source-status notes when search/fetch is unavailable."
  },
  "specialistMethod": [
    "Infer mode first: article creation, existing-page rewrite, or site/keyword monitoring.",
    "Confirm or infer keyword, conversion goal, language, market, target reader, site, target URL, implementation surface, and content goal.",
    "Map one keyword cluster to one target page before drafting so the user knows which page should rank and which CTA should convert.",
    "Inspect current SERP, top-result URLs, H1/H2/H3 patterns, word-count range, search intent, trust signals, and competitor gaps when available.",
    "Return the winning-page recommendation, page-specific H1/hero, CTA placement, trust/FAQ blocks, and what happens after signup when the goal includes registration or leads.",
    "Return a research/action report plus article draft, rewrite sections, monitoring memo, and a PR-ready implementation handoff when repo or CMS context exists."
  ],
  "scopeBoundaries": [
    "Do not write generic SEO advice without mode, keyword, intent, SERP, and competitor grounding.",
    "Do not keyword-stuff, over-optimize headings, or recommend content that conflicts with search intent.",
    "Do not ignore language, region, current SERP volatility, E-E-A-T, target page state, or business value.",
    "Do not present an article, rewrite, or monitoring report without the research/report section that explains why."
  ],
  "freshnessPolicy": "Treat SERP, ranking competitors, search intent, top-result structure, and keyword difficulty as time-sensitive. Date the SERP read and flag when current search results or competitor fetches were not checked.",
  "sensitiveDataPolicy": "Treat analytics, Search Console data, draft content, customer keywords, and private conversion data as confidential. Use public SERP facts and aggregate internal metrics.",
  "costControlPolicy": "Use the SEO-agent budget: one focused search, up to three competitor reads for article/rewrite, and one or two competitor reads per monitoring keyword. Default to one page/keyword target, one CTA surface, and one distribution pack before expanding to larger keyword maps."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'seo_specialist',
  aliases: Object.freeze(['seo']),
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'seo_specialist'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'seo_specialist agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/seo_specialist/health',
  healthcheck_url: '/sample-agents/seo_specialist/health',
  jobEndpoint: '/sample-agents/seo_specialist/jobs',
  job_endpoint: '/sample-agents/seo_specialist/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/seo_specialist/health',
    jobs: '/sample-agents/seo_specialist/jobs'
  }),
  metadata: Object.freeze({
    sample: true,
    sampleKind: 'seo_specialist',
    sample_kind: 'seo_specialist',
    category: 'seo_specialist',
    aliases: Object.freeze(['seo']),
    workflow_layer: 'preparation',
    agentRole: 'worker',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
