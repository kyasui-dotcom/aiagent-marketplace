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
    const publisherHandoffs = Array.isArray(generatedDelivery?.artifacts) ? generatedDelivery.artifacts : [];
    if (!markdown) return agentProviderDeliveryFailure(kind, definition, name, japanese, 'missing_required_deliverable');
    return {
      accepted: true,
      status: 'completed',
      summary: generatedDelivery.summary,
      report: {
        summary: generatedDelivery.reportSummary,
        bullets: agentProviderList(generatedDelivery.bullets),
        nextAction: agentProviderText(generatedDelivery.nextAction, ''),
        confidence: prompt === 'No prompt provided.' ? 'low' : 'medium',
        ...(publisherHandoffs.length ? { artifacts: publisherHandoffs } : {}),
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

function agentProviderSourceType(value = '') {
  const text = String(value || '').toLowerCase();
  if (/\bx\.com\b|twitter\.com|tweet|ポスト|投稿/.test(text)) return 'x_post_or_account';
  if (/blog|ブログ|note\.com|medium|zenn|qiita/.test(text)) return 'owned_blog_or_article';
  if (/uploaded|file|手記|memo|manuscript|interview|note/.test(text)) return 'original_note_or_file';
  if (/case|testimonial|review|事例|声/.test(text)) return 'case_or_testimonial';
  return 'source_url';
}

function agentProviderOriginalInfoSources(body = {}) {
  const sources = [];
  const seen = new Set();
  const add = (item = {}, fallback = {}) => {
    const value = typeof item === 'string' ? { url: item } : (item && typeof item === 'object' ? item : {});
    const url = agentProviderText(value.url || value.link || value.href || value.source_url || value.sourceUrl || fallback.url);
    const title = agentProviderText(value.title || value.name || value.label || fallback.title, url || 'Original source');
    const snippet = agentProviderText(value.snippet || value.summary || value.description || fallback.snippet);
    const sourceType = agentProviderText(value.source_type || value.sourceType || fallback.sourceType || agentProviderSourceType([url, title, snippet].join(' ')));
    if (!url && !title && !snippet) return;
    const key = [url, title, snippet].join('|').toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    sources.push({
      source_type: sourceType,
      title,
      url,
      snippet,
      usage: agentProviderText(value.usage || fallback.usage, 'Use as first-party/source-backed writing material; do not copy long passages verbatim.')
    });
  };
  for (const source of agentProviderWebSources(body)) add(source);
  const files = [
    ...(Array.isArray(body.files) ? body.files : []),
    ...(Array.isArray(body.input?.files) ? body.input.files : [])
  ];
  for (const file of files) {
    if (!file || typeof file !== 'object') continue;
    add({
      title: file.name || file.fileName || 'Uploaded original note',
      snippet: String(file.content || file.body || '').slice(0, 320),
      source_type: 'uploaded_file'
    }, { usage: 'Use as original note or manuscript material.' });
  }
  const text = [agentProviderPrompt(body), JSON.stringify(body.source_context || body.sourceContext || {})].join('\n');
  for (const label of ['x account', 'xアカウント', 'blog', 'ブログ', 'note', 'original note', '手記']) {
    const value = agentProviderFirstMatch(text, [new RegExp(`${label}\\s*[:：]\\s*([^\\n]+)`, 'i')]);
    if (value) add({ title: value, snippet: `${label} supplied by requester`, source_type: agentProviderSourceType(value) });
  }
  return sources.slice(0, 12);
}

function agentProviderPublisherProfile(kind = '', body = {}) {
  const text = [kind, agentProviderPrompt(body), JSON.stringify(body.source_context || body.sourceContext || {})].join(' ').toLowerCase();
  if (/\bx\b|x\.com|twitter|tweet|ポスト|投稿|sns|social/.test(text)) {
    return {
      itemType: /thread|スレッド/.test(text) ? 'social_thread' : 'x_post',
      channelKey: 'x',
      destination: 'X',
      connector: 'x',
      capability: 'x.post',
      method: 'x_oauth_or_x_saas',
      actionType: 'x_post'
    };
  }
  if (/wordpress|\bwp\b/.test(text)) {
    return {
      itemType: /page|landing|lp/.test(text) ? 'wordpress_page' : 'wordpress_draft',
      channelKey: 'wordpress_site',
      destination: 'WordPress site',
      connector: 'wordpress',
      capability: 'wordpress.create_draft',
      method: 'wordpress_application_password',
      actionType: 'wordpress_draft'
    };
  }
  if (/blog|article|記事|seo|owned site|github|landing|lp|page/.test(text)) {
    return {
      itemType: /landing|lp/.test(text) ? 'landing_page' : 'seo_article',
      channelKey: 'owned_site',
      destination: 'Owned site / GitHub PR',
      connector: 'github',
      capability: 'github.write_pr',
      method: 'github_pr',
      actionType: 'article_publish'
    };
  }
  return {
    itemType: 'publish_asset',
    channelKey: 'social',
    destination: 'Social copy packet',
    connector: 'manual',
    capability: 'manual.copy',
    method: 'manual_social_copy',
    actionType: 'social_post'
  };
}

function agentProviderPublisherProfiles(kind = '', body = {}) {
  const text = [kind, agentProviderPrompt(body), JSON.stringify(body.source_context || body.sourceContext || {})].join(' ').toLowerCase();
  const profiles = [];
  const add = (profile = null) => {
    if (!profile?.channelKey) return;
    const key = `${profile.channelKey}:${profile.itemType}`;
    if (!profiles.some((item) => `${item.channelKey}:${item.itemType}` === key)) profiles.push(profile);
  };
  if (/\bx\b|x\.com|twitter|tweet|ポスト|投稿|sns|social/.test(text)) {
    add({
      itemType: /thread|スレッド/.test(text) ? 'social_thread' : 'x_post',
      channelKey: 'x',
      destination: 'X',
      connector: 'x',
      capability: 'x.post',
      method: 'x_oauth_or_x_saas',
      actionType: 'x_post'
    });
  }
  if (/wordpress|\bwp\b/.test(text)) {
    add({
      itemType: /page|landing|lp/.test(text) ? 'wordpress_page' : 'wordpress_draft',
      channelKey: 'wordpress_site',
      destination: 'WordPress site',
      connector: 'wordpress',
      capability: 'wordpress.create_draft',
      method: 'wordpress_application_password',
      actionType: 'wordpress_draft'
    });
  }
  if (/blog|article|記事|seo|owned site|github|landing|lp|page/.test(text)) {
    add({
      itemType: /landing|lp/.test(text) ? 'landing_page' : 'seo_article',
      channelKey: 'owned_site',
      destination: 'Owned site / GitHub PR',
      connector: 'github',
      capability: 'github.write_pr',
      method: 'github_pr',
      actionType: 'article_publish'
    });
  }
  if (!profiles.length) add(agentProviderPublisherProfile(kind, body));
  return profiles.slice(0, 4);
}

function agentProviderPublisherTitle(body = {}, profile = {}) {
  const host = agentProviderHost(agentProviderPrimaryUrl(body));
  if (profile.channelKey === 'x') return `${host} source-backed X post packet`;
  if (profile.channelKey === 'wordpress_site') return `${host} source-backed WordPress draft`;
  if (profile.itemType === 'landing_page') return `${host} source-backed landing page`;
  return `${host} source-backed article draft`;
}

function agentProviderPublisherVariants(profile = {}, body = {}) {
  const host = agentProviderHost(agentProviderPrimaryUrl(body));
  const url = agentProviderPrimaryUrl(body) || host;
  const audience = agentProviderAudience(body);
  const offer = agentProviderOffer(body);
  const conversion = agentProviderConversion(body);
  const cta = /lead|inquiry/i.test(conversion) ? 'Request details' : (/purchase|revenue/i.test(conversion) ? 'Start purchase' : (/signup|trial/i.test(conversion) ? 'Start signup' : 'Continue'));
  if (profile.channelKey === 'x') {
    return [
      {
        id: 'x-proof-led',
        label: 'Proof-led post',
        title: `${host} proof-led X post`,
        body: `Most ${offer} pages hide the work behind vague claims. ${host} should show the source, the handoff, and the approval boundary before asking ${audience} to ${conversion}.\n\n${url}`,
        cta
      },
      {
        id: 'x-story-led',
        label: 'Story-led post',
        title: `${host} story-led X post`,
        body: `A useful ${offer} draft starts with real material: owner notes, posts, blog context, and what actually happened. Then it becomes a publishable packet, not generic copy.\n\n${url}`,
        cta
      },
      {
        id: 'x-objection-led',
        label: 'Objection-led post',
        title: `${host} objection-led X post`,
        body: `If the copy cannot point to original evidence, it should say so. ${host} should make proof, missing claims, and the next approved action visible before publishing.\n\n${url}`,
        cta
      }
    ];
  }
  if (profile.channelKey === 'wordpress_site') {
    return [
      {
        id: 'wp-experience-draft',
        label: 'Experience-led draft',
        title: `${offer} from firsthand source material`,
        h1: `${offer} for ${audience}`,
        body: `Open with the firsthand note, explain the situation, then show what changed and why ${audience} should take ${conversion}.`,
        cta
      },
      {
        id: 'wp-howto-draft',
        label: 'How-to draft',
        title: `How ${audience} can evaluate ${offer}`,
        h1: `How to evaluate ${offer}`,
        body: `Turn original notes and examples into steps, decision criteria, proof blocks, and the next approved action.`,
        cta
      },
      {
        id: 'wp-comparison-draft',
        label: 'Comparison draft',
        title: `${offer}: fit, limits, and next step`,
        h1: `${offer}: what fits and what does not`,
        body: `Use the source ledger to compare fit, limits, alternatives, and the trust signals needed before ${conversion}.`,
        cta
      }
    ];
  }
  return [
    {
      id: 'owned-experience-article',
      label: 'Experience-led article',
      title: `${host}: ${offer} from original source material`,
      h1: `${offer} for ${audience}`,
      body: `Lead with the original story or operator note, then connect it to the practical outcome: ${conversion}.`,
      cta
    },
    {
      id: 'owned-expertise-guide',
      label: 'Expertise-led guide',
      title: `How to evaluate ${offer}`,
      h1: `How ${audience} should evaluate ${offer}`,
      body: `Structure the article around criteria, process, examples, source evidence, and the approval-safe next step.`,
      cta
    },
    {
      id: 'owned-trust-page',
      label: 'Trust-led page',
      title: `${offer}: evidence, limits, and next action`,
      h1: `${offer}: evidence and limits`,
      body: `Make source evidence, missing proof, assumptions, and approval boundaries visible before asking for ${conversion}.`,
      cta
    }
  ];
}

function agentProviderVariantLines(variants = []) {
  if (!variants.length) return 'No variants prepared.';
  return variants.map((variant, index) => [
    `### Variant ${index + 1}: ${variant.label || variant.id || 'Draft option'}`,
    variant.title ? `Title: ${variant.title}` : '',
    variant.h1 ? `H1: ${variant.h1}` : '',
    variant.body ? `Body: ${variant.body}` : '',
    variant.cta ? `CTA: ${variant.cta}` : ''
  ].filter(Boolean).join('\n')).join('\n\n');
}

function agentProviderPublisherBody(markdown = '', sources = [], profile = {}, body = {}, variants = []) {
  const sourceLines = sources.length
    ? sources.map((source, index) => `${index + 1}. ${source.title}${source.url ? ` - ${source.url}` : ''} (${source.source_type})`).join('\n')
    : 'No original URL, X account/post, blog, or uploaded note was supplied. Request first-party material before final publishing.';
  return [
    markdown,
    '',
    '## Publisher handoff',
    `Destination: ${profile.destination}`,
    `Medium / channel: ${profile.channelKey}`,
    `Publish connector: ${profile.connector}`,
    `Connector capability: ${profile.capability}`,
    `Publish method: ${profile.method}`,
    `Primary CTA: ${agentProviderConversion(body)}`,
    '',
    '## Draft variants',
    agentProviderVariantLines(variants),
    '',
    '## E-E-A-T source ledger',
    sourceLines,
    '',
    '## E-E-A-T usage notes',
    '- Experience: preserve concrete firsthand details, chronology, failures, screenshots, usage notes, and operator comments from supplied sources.',
    '- Expertise: turn source details into process, criteria, comparison axes, and practical judgment.',
    '- Authoritativeness: keep author/account/blog/source identity visible when the user owns or approves it.',
    '- Trust: label missing proof, unverified claims, and approval requirements before Publisher handoff or external posting.',
    '',
    '## Publisher approval rule',
    'Do not publish, post, create a PR, or create a WordPress draft until the Publisher app item is reviewed and approved.'
  ].join('\n');
}

function agentProviderPublisherHandoffArtifact(kind = '', definition = {}, body = {}, markdown = '', profile = null, index = 0) {
  const safeProfile = profile || agentProviderPublisherProfile(kind, body);
  const sources = agentProviderOriginalInfoSources(body);
  const variants = agentProviderPublisherVariants(safeProfile, body);
  const title = agentProviderPublisherTitle(body, safeProfile);
  const url = agentProviderPrimaryUrl(body);
  const h1 = safeProfile.channelKey === 'x' ? '' : `${agentProviderOffer(body)} for ${agentProviderAudience(body)}`;
  return {
    id: index === 0 ? 'writer-publisher-handoff' : `writer-publisher-handoff-${safeProfile.channelKey}-${safeProfile.itemType}`,
    type: safeProfile.itemType,
    item_type: safeProfile.itemType,
    content_type: 'publisher_handoff',
    channel_key: safeProfile.channelKey,
    destination: safeProfile.destination,
    connector: safeProfile.connector,
    connector_capability: safeProfile.capability,
    publish_method: safeProfile.method,
    action_type: safeProfile.actionType,
    owner: 'Publisher & Approval Studio',
    title,
    h1,
    slug: url || '',
    meta: sources.length
      ? `Source-backed draft using ${sources.length} original source item(s); review claims before publishing.`
      : 'Draft needs original source material before final publishing.',
    keywords: agentProviderPrimaryChannel(body),
    primary_cta: agentProviderConversion(body),
    body: agentProviderPublisherBody(markdown, sources, safeProfile, body, variants),
    status: 'needs approval',
    risk: sources.length
      ? 'Review source permissions, claims, attribution, and channel rules before external publishing.'
      : 'Original source material is missing; request a URL, X post/account, blog, or uploaded note before publishing.',
    source_evidence: sources,
    publish_variants: variants,
    eeat_notes: {
      experience: 'Use firsthand details from supplied sources only.',
      expertise: 'Convert source material into practical judgment and publishable structure.',
      authoritativeness: 'Preserve approved author, account, or owned-site identity.',
      trust: 'Keep source URLs, missing-proof labels, and approval gates visible.'
    },
    metadata: {
      generated_by: definition.healthService || 'writing_agent',
      original_source_count: sources.length,
      requires_publisher_approval: true,
      requires_original_source_review: true
    }
  };
}

function agentProviderPublisherHandoffArtifacts(kind = '', definition = {}, body = {}, markdown = '') {
  if (!agentProviderOriginalInfoSources(body).length) return [];
  return agentProviderPublisherProfiles(kind, body)
    .map((profile, index) => agentProviderPublisherHandoffArtifact(kind, definition, body, markdown, profile, index));
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
  "fileName": "writer-delivery.md",
  "healthService": "writing_agent",
  "modelRole": "conversion copy strategy, message hierarchy, and publish-ready copy drafting",
  "executionLayer": "preparation",
  "taskRouting": {
    "aliases": ['writing', 'translation'],
    "inferenceRules": [
      { taskType: 'writing', patterns: [/(write|copy|lp|記事|文章|ライティング|copywriting|landing page)/i] },
      { taskType: 'translation', patterns: [/(translation|localization|i18n|翻訳|多言語)/i] }
    ],
    "expansionTasksByTask": {
      writing: ['research', 'summary'],
      translation: ['summary']
    },
    "softMatchTokensByTask": {
      writing: ['writing', 'copywriting', 'messaging', 'summary', 'seo'],
      translation: ['translation', 'localization', 'i18n', 'writing']
    },
    "tagHintsByTask": {
      writing: ['writing', 'copy', 'content'],
      translation: ['translation', 'localization', 'writing']
    }
  },
  "seedProfile": {
    "id": "agent_writer_01",
    "name": "WRITING AGENT",
    "description": "Built-in upstream writing and planning agent that turns research, audience, offer, proof, objections, and channel constraints into reusable copy packets for downstream execution adapters.",
    "taskTypes": [
      "writing",
      "copywriting",
      "messaging",
      "summary",
      "seo"
    ],
    "successRate": 0.94,
    "avgLatencySec": 14,
    "capabilities": [
      "copy_mode_classification",
      "message_hierarchy",
      "copy_angle_options",
      "recommended_copy_packet",
      "cta_placement_notes",
      "revision_test"
    ],
    "metadata": {
      "layer": "content_generation",
      "approval_mode": "draft_before_human_approval",
      "downstream_task_types": [
        "x_post",
        "instagram",
        "email_ops",
        "cold_email",
        "reddit",
        "indie_hackers",
        "directory_submission"
      ],
      "output_contract": [
        "draft",
        "tone",
        "key_points",
        "call_to_action",
        "approval_needed"
      ],
      "execution_default": "publishable_copy_packet",
      "connector_behavior": "Use supplied audience, offer, proof, objection, and current copy first. Verify only time-sensitive claims or channel norms when they materially change the draft, and use placeholders instead of inventing proof."
    }
  },
  "systemPrompt": "You are the built-in writing agent for AIagent2. First classify the copy task as landing/page copy, product description, email/newsletter copy, social/distribution copy, onboarding or UX copy, SEO-aware page copy, rewrite, or another concrete copy mode, then preserve that mode in the output. Return publishable copy packets, not copywriting advice about what someone else should write. Start from audience, awareness stage, problem or trigger, offer, believable proof, objection, CTA, channel constraint, and claims that are approved versus missing. Build the copy around message hierarchy: promise, proof, objection handling, and CTA. Recommend one primary conversion angle plus two materially different alternatives; do not generate near-duplicate variants. When rewriting existing copy, preserve the strongest real facts and replace vague or hype-heavy lines instead of starting from generic templates. If SEO is implied, keep the work page-copy scoped: reflect search intent, H1 direction, meta-title/meta-description direction, and CTA fit without drifting into a full SERP strategy audit. Use placeholders for proof, metrics, testimonials, legal/compliance language, or pricing claims that were not actually supplied. End with the recommended final version, placement notes, and the first revision test. If the task is underspecified, state assumptions briefly and continue.",
  "deliverableHint": "Deliver in the user requested language in a clear, user-readable format.",
  "reviewHint": "Sharpen the promise, proof, objection handling, and CTA. Remove generic filler, invented proof, and near-duplicate variants. Ensure the recommended version is ready to publish or paste into the named surface.",
  "executionFocus": "Create publishable copy, not advice about copy. Classify the copy mode first, then build one believable promise, proof, objection-handling line, CTA, and revision test for the exact channel.",
  "outputSections": [
    "Copy mode and objective",
    "Audience and awareness stage",
    "Offer, proof, and objections",
    "Message hierarchy",
    "Copy options",
    "Recommended version",
    "CTA and placement notes",
    "Revision test"
  ],
  "inputNeeds": [
    "Audience and awareness stage",
    "Offer or product",
    "Approved proof or claims",
    "Distribution channel or surface",
    "Primary CTA",
    "Current copy or section to rewrite"
  ],
  "acceptanceChecks": [
    "Copy mode and publish surface are explicit",
    "Promise, proof, objection, and CTA line up",
    "Options are strategically different",
    "Missing proof is labeled instead of invented",
    "Revision test explains what to try next"
  ],
  "firstMove": "Lock copy mode, audience, awareness stage, offer, proof, objection, and CTA before drafting. Produce options that differ by strategic angle rather than surface wording.",
  "failureModes": [
    "Do not produce generic copy detached from audience, awareness stage, and channel",
    "Do not offer near-duplicate variants that only swap adjectives",
    "Do not invent proof, metrics, testimonials, or compliance claims",
    "Do not omit the CTA, placement note, or revision test"
  ],
  "evidencePolicy": "Ground copy in the supplied audience, awareness stage, offer, proof, objection, current copy, and channel. If examples are used, state whether they are supplied examples, comparable patterns, or assumptions.",
  "nextAction": "End with the recommended final copy, where each line should be placed, and the first revision test or metric to watch.",
  "confidenceRubric": "High when copy mode, audience, channel, offer, proof, objection, and CTA are supplied; medium when tone, awareness stage, or proof must be inferred; low when the audience, surface, or conversion action is unclear.",
  "handoffArtifacts": [
    "Recommended copy packet",
    "Alternative angles",
    "Message hierarchy",
    "CTA and placement notes",
    "Revision test"
  ],
  "prioritizationRubric": "Prioritize copy by audience fit, message clarity, proof strength, objection severity, channel fit, and speed to publish.",
  "measurementSignals": [
    "CTR or open rate",
    "Reply or conversion rate",
    "CTA click-through or completion rate",
    "Revision delta",
    "Objection-response lift"
  ],
  "assumptionPolicy": "Assume the user wants publishable copy for the named surface. If awareness stage, proof, or objection is missing, use a conservative default and label it. Do not invent claims to make the copy stronger.",
  "escalationTriggers": [
    "The copy depends on proof, pricing, or legal/compliance claims the user did not provide",
    "Audience, channel, or conversion action is unclear",
    "The request involves regulated, medical, legal, or high-risk marketing claims"
  ],
  "minimumQuestions": [
    "Who is the audience, and what awareness stage or moment are they in?",
    "Where will this copy be published, and what action should it drive?",
    "What offer, proof, objection, and CTA must be included?",
    "What current copy, examples, or voice should it match or replace?"
  ],
  "reviewChecks": [
    "Copy mode is explicit",
    "Promise, proof, objection, and CTA are all visible",
    "Variants differ strategically",
    "No invented proof appears"
  ],
  "depthPolicy": "Default to one recommended version plus two alternatives. Go deeper when audience segmentation, proof architecture, placement notes, or rewrite context materially changes the copy.",
  "concisionRule": "Avoid copywriting theory or generic messaging frameworks; deliver the actual copy, a short why, placement notes, and the first test.",
  "toolStrategy": {
    "web_search": "when_current",
    "source_mode": "provided_copy_context_current_claims_and_comparable_channel_examples",
    "note": "Use supplied audience, offer, proof, objection, and current copy first; browse only when current claims, competitor examples, or channel norms materially change the copy."
  },
  "specialistMethod": [
    "Classify the copy mode first: landing/page, email, social/distribution, product description, onboarding/UX, SEO-aware page copy, rewrite, or another named surface.",
    "Map audience, awareness stage, trigger, offer, proof, objection, voice, CTA, and current copy before drafting.",
    "Build a message hierarchy first: promise, proof, objection handling, and CTA.",
    "Deliver one recommended publishable version plus strategically different alternatives, then name the first revision test and placement notes."
  ],
  "scopeBoundaries": [
    "Do not fabricate proof, customer claims, metrics, testimonials, or legal claims.",
    "Do not optimize for cleverness over clarity, proof, objection handling, and CTA.",
    "Do not drift into a full SEO audit, campaign strategy, or channel-execution plan when the task is copy drafting.",
    "Do not produce manipulative, deceptive, or non-compliant copy."
  ],
  "freshnessPolicy": "Use supplied brand facts as current unless dated otherwise. Verify time-sensitive proof, statistics, offers, and competitor examples before using them in copy.",
  "sensitiveDataPolicy": "Do not publish or amplify private customer data, unapproved testimonials, confidential metrics, or unreleased offers. Replace sensitive proof with placeholders when needed.",
  "costControlPolicy": "Favor fast drafting and revision-ready options. Use web or competitor research only when proof, channel norms, or current claims materially affect conversion."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'writer',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'writer'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'writer agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/writer/health',
  healthcheck_url: '/sample-agents/writer/health',
  jobEndpoint: '/sample-agents/writer/jobs',
  job_endpoint: '/sample-agents/writer/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/writer/health',
    jobs: '/sample-agents/writer/jobs'
  }),
  metadata: Object.freeze({
    sample: true,
    sampleKind: 'writer',
    sample_kind: 'writer',
    category: 'writer',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
