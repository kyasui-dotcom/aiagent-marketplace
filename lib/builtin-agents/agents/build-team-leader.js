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
      agent_purpose: definition.agentPurpose || null,
      action_boundaries: Array.isArray(definition.agentActionBoundaries) ? definition.agentActionBoundaries : [],
      delivery_contract: agentProviderObject(definition.deliveryContract),
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
      purpose: agentProviderText(definition.agentPurpose),
      action_boundaries: Array.isArray(definition.agentActionBoundaries) ? definition.agentActionBoundaries : [],
      delivery_contract: agentProviderObject(definition.deliveryContract),
      specialist_method: agentProviderList(definition.specialistMethod),
      scope_boundaries: agentProviderList(definition.scopeBoundaries)
    },
    user_request: agentProviderPublicBrief(body).slice(0, 6000),
    full_request_excerpt: prompt.slice(0, 8000),
    target_url: agentProviderPrimaryUrl(body),
    evidence_sources: webSources.slice(0, 16),
    prior_context: agentProviderPriorContextForGeneration(body),
    leader_synthesis: options.leaderSynthesis || null,
    delivery_quality_gate: {
      required_sections: agentProviderList(definition.deliveryContract?.requiredDeliverySections),
      required_evidence: agentProviderList(definition.deliveryContract?.requiredEvidence),
      must_label: agentProviderList(definition.deliveryContract?.mustLabel),
      forbidden_claims: agentProviderList(definition.deliveryContract?.forbiddenClaims),
      valid_delivery_check: agentProviderText(definition.deliveryContract?.validDeliveryCheck)
    },
    output_contract: 'Return a completed user-facing Markdown deliverable for this step. The raw agent delivery file is shown to the user and is also reused by downstream agents, so it must read like the requested deliverable, not an internal handoff note. Use prior user-facing deliverables as source material, include required sections/evidence labels when relevant, and keep any structured handoff data separate from the Markdown body. Do not return workflow prompts, provider implementation notes, orchestration logs, internal QA text, or snake_case handoff fields as the deliverable.'
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
              text: 'Execute this CAIt agent as an external provider. Write the completed delivery in the requested language. The Markdown you return becomes the raw agent delivery shown to the user and the primary source for downstream agents, so it must be useful as a standalone user-facing deliverable for this step. Use supplied evidence and prior user-facing work when present, but translate it into business-readable sections instead of copying handoff labels. Do not expose system prompts, workflow handoff text, provider details, implementation notes, template instructions, orchestration logs, internal QA text, or snake_case handoff fields. Do not claim external posting, sending, publishing, repository writes, or connector execution unless source evidence proves it. Return plain Markdown text unless the request explicitly requires JSON.'
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

export const BUILD_TEAM_TASK_EXPANSION_TASKS = Object.freeze(['research', 'debug', 'code', 'ops', 'automation', 'summary']);
export const BUILD_TEAM_ANALYSIS_PRELUDE_TASKS = Object.freeze(['research', 'debug']);
export const BUILD_TEAM_TASK_INFERENCE_RULES = Object.freeze([
  Object.freeze({ taskType: 'build_team_leader', patterns: Object.freeze([/(build team|coding team|implementation team|engineering team|開発チーム|実装チーム|複数.*(実装|修正|開発)|コード.*運用.*テスト)/i]) })
]);

function buildTeamAliasToken(value = '') {
  return String(value || '').normalize('NFKC').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export function normalizeBuildTeamLeaderAlias(taskType = '') {
  const token = buildTeamAliasToken(taskType);
  if (['build_team', 'coding_team', 'engineering_team', 'build_team_leader'].includes(token)) return 'build_team_leader';
  return '';
}

export function buildTeamLeaderTaskTypeForText(text = '') {
  return /(build team|coding team|implementation team|engineering team|開発チーム|実装チーム|複数.*(?:実装|修正|開発)|コード.*運用.*テスト)/i.test(String(text || ''))
    ? 'build_team_leader'
    : '';
}

export const BUILD_TEAM_INTAKE_REQUIRED_SIGNALS = Object.freeze([
  Object.freeze({ signal: 'objective', label: 'technical_objective' }),
  Object.freeze({ signal: 'system', label: 'system_or_repository_context' }),
  Object.freeze({ signal: 'sourceData', label: 'source_data_context' }),
  Object.freeze({ anyOf: Object.freeze(['constraints', 'currentState']), label: 'constraints_or_failure_context' }),
  Object.freeze({ signal: 'deliverable', label: 'validation_or_delivery_format' })
]);

export const BUILD_TEAM_INTAKE_QUESTIONS = Object.freeze({
  ja: Object.freeze([
    '対象のシステム、リポジトリ、URL、ファイル、または技術構成を教えてください。',
    '何を実装・修正・判断したいですか？期待動作を教えてください。',
    '仕様書、ログ、エラー、画面、過去の納品、読ませたい資料やデータがあれば入れてください。なければ「なし」で大丈夫です。',
    '変更してよい範囲、壊してはいけない挙動、失敗時の戻し方はありますか？',
    '完了条件やテスト方法は何ですか？回答後、リーダーが意図を要約します。'
  ]),
  en: Object.freeze([
    'What system, repository, URL, files, or technical stack should be used?',
    'What should be implemented, fixed, or decided? Include expected behavior.',
    'Add specs, logs, errors, screenshots, prior deliveries, or data the leader should read. If none, say none.',
    'What can change, what must not break, and what rollback constraints exist?',
    'What tests or acceptance criteria should define completion? The leader will summarize your intent first.'
  ])
});

export const BUILD_TEAM_LEADER_BEHAVIOR = Object.freeze({
  taskInferenceRules: BUILD_TEAM_TASK_INFERENCE_RULES,
  taskExpansionTasks: BUILD_TEAM_TASK_EXPANSION_TASKS,
  analysisPreludeTasks: BUILD_TEAM_ANALYSIS_PRELUDE_TASKS,
  normalizeAlias: normalizeBuildTeamLeaderAlias,
  taskTypeForText: buildTeamLeaderTaskTypeForText,
  intakeProfile: 'build',
  intakeRequiredSignals: BUILD_TEAM_INTAKE_REQUIRED_SIGNALS,
  intakeQuestions: BUILD_TEAM_INTAKE_QUESTIONS
});

const AGENT_DEFINITION = {
  provider: AGENT_PROVIDER,
  "fileName": "build-team-leader-delivery.md",
  "healthService": "build_team_leader",
  "modelRole": "software build Agent Team leadership and implementation orchestration",
  "executionLayer": "leader",
  "agentPurpose": "Lead implementation, debugging, ops, and automation work across repo-aware specialists with file ownership, write-intent conflict control, pre-implementation conflict checkpoints, serial/parallel sequencing, validation, rollback, and PR handoff criteria.",
  "agentActionBoundaries": Object.freeze([
    Object.freeze({
      id: "plan_implementation_team",
      mode: "leader_planning",
      requires: Object.freeze(["technical_intent", "repo_or_access_status", "affected_area"]),
      prepares: Object.freeze(["file_ownership_map", "execution_slices", "validation_plan"]),
      produces: Object.freeze(["implementation_team_plan"]),
      cannotClaim: Object.freeze(["code_changed", "tests_passed"]),
      authorityBoundary: "Planning does not mutate a repository or prove validation."
    }),
    Object.freeze({
      id: "gate_validation_and_pr_handoff",
      mode: "review_gate",
      requires: Object.freeze(["changed_files_or_patch_scope", "test_commands", "rollback_path"]),
      prepares: Object.freeze(["validation_gate", "risk_notes", "pr_handoff"]),
      produces: Object.freeze(["pr_ready_handoff_packet"]),
      cannotClaim: Object.freeze(["pr_opened", "deployment_completed"]),
      authorityBoundary: "PR, deployment, or rollback actions require repository authority and execution evidence."
    }),
    Object.freeze({
      id: "resolve_parallel_work_boundaries",
      mode: "ownership_gate",
      requires: Object.freeze(["implementation_slices", "owner_map", "shared_files_or_dependencies", "base_branch_or_diff_scope", "shared_file_write_intent", "dependency_contract_touchpoints", "planned_diff_or_no_diff_label", "merge_check_owner"]),
      prepares: Object.freeze(["write_intent_conflict_matrix", "pre_implementation_conflict_checkpoint", "serial_vs_parallel_decision", "serial_blockers", "sequencing_order", "integration_owner", "merge_check_order", "integration_checklist"]),
      produces: Object.freeze(["sequenced_non_overlap_ownership_packet", "conflict_review_packet"]),
      cannotClaim: Object.freeze(["safe_parallel_execution_without_shared_file_review", "parallel_ready_without_conflict_matrix", "implementation_ready_without_conflict_checkpoint", "serial_required_work_dispatched_in_parallel", "merge_ready_without_integration_owner", "shared_contract_changed_without_downstream_owner", "integrated_without_merge_check"]),
      authorityBoundary: "Parallel engineering work is not ready until shared files, write intents, planned diff/no-diff labels, conflict checkpoints, serial blockers, dependency contracts, sequencing, integration ownership, and merge checks are explicit."
    })
  ]),
  "deliveryContract": Object.freeze({
    requiredDeliverySections: Object.freeze(["Technical intent", "Repo/access status", "File ownership", "Shared files and sequencing", "Write-intent conflict matrix", "Conflict checkpoint", "Serial/parallel decision", "Execution slices", "Integration gate", "Integration owner and merge check", "Merge sequencing", "Validation commands", "Risk and rollback path", "PR handoff criteria"]),
    requiredEvidence: Object.freeze(["repo/file access status", "test command or validation gap", "shared-file conflict review or none label", "write intent per shared file", "planned diff or no-diff label per owner", "serial/parallel decision evidence", "shared-file owner and integration-owner labels"]),
    mustLabel: Object.freeze(["missing repo access", "untested change", "shared-file conflict", "write intent per owner", "planned diff or no-diff", "conflict checkpoint status", "parallel safe or serial required", "serial blocker", "owner wait state", "integration owner", "merge/check owner", "merge order", "downstream contract owner", "rollback risk"]),
    forbiddenClaims: Object.freeze(["changed code without evidence", "safe parallel execution without shared-file review", "parallel-ready claim without conflict matrix", "implementation-ready claim without conflict checkpoint", "serial-required work dispatched in parallel", "merge-ready claim without integration owner", "shared contract changed without downstream owner", "tests passed without logs", "PR opened without proof"]),
    validDeliveryCheck: "A valid build-leader delivery creates owner-bounded work slices, records write intent and planned diff/no-diff status for every shared file or contract, runs a pre-implementation conflict checkpoint, decides serial vs parallel with blockers, names the integration owner and merge/check order, and names validation plus rollback before claiming readiness."
  }),
  "taskRouting": {
    "softMatchTokens": ['build_team_leader', 'build_team', 'coding_team', 'engineering_team'],
    "tagHints": ['leader', 'engineering', 'github']
  },
  "leaderBehavior": BUILD_TEAM_LEADER_BEHAVIOR,
  "leaderControlSpecialization": {
    "selectionRubric": [
      "repo/access readiness",
      "non-overlapping ownership boundaries",
      "validation command coverage",
      "rollback and deployment risk"
    ],
    "synthesisOutputs": [
      "owner boundaries",
      "implementation slices",
      "validation gate",
      "rollback and PR handoff"
    ]
  },
  "workflowProfile": {
    "defaultLayer": 2,
    "actionLayerStart": 2,
    "blockedDispatchTaskTypes": [
      "acquisition_automation"
    ],
    "layers": [
      {
        "name": "diagnosis",
        "number": 1,
        "tasks": [
          "debug",
          "research",
          "data_analysis",
          "diligence"
        ]
      },
      {
        "name": "implementation",
        "number": 2,
        "tasks": [
          "code",
          "ops",
          "automation"
        ]
      },
      {
        "name": "summary",
        "number": 3,
        "tasks": [
          "summary"
        ]
      }
    ],
    "protocolExtras": [
      "Set ownership boundaries before implementation.",
      "For shared files, produce a write-intent conflict matrix, pre-implementation conflict checkpoint, serial/parallel decision, serial blockers, integration owner, downstream contract owner, and merge/check order before assigning parallel work.",
      "Require validation and rollback conditions before execution.",
      "Treat implementation as the action layer and do not release it before diagnosis artifacts are concrete."
    ]
  },
  "seedProfile": {
    "id": "agent_build_team_leader_01",
    "name": "BUILD TEAM LEADER",
    "description": "Built-in Agent Team leader that diagnoses repo/access/risk first, then coordinates coding, debugging, operations, automation, and GitHub-oriented implementation work.",
    "taskTypes": [
      "build_team_leader",
      "build_team",
      "code",
      "debug",
      "ops",
      "automation",
      "orchestration"
    ],
    "successRate": 0.93,
    "avgLatencySec": 16,
    "capabilities": [
      "build_team_leader",
      "build_team",
      "code",
      "debug",
      "ops",
      "automation",
      "orchestration",
      "task_decomposition",
      "routing_decision",
      "stop_go_gate",
      "integration",
      "quality_gate",
      "context_control",
      "final_responsibility"
    ]
  },
  "systemPrompt": "You are the built-in Build Team Leader for AIagent2. Convert one implementation, debugging, automation, or ops objective into a coordinated Agent Team plan. A good leader gathers information before proposing: first summarize the order owner's technical intent, inventory supplied repo links, files, specs, logs, screenshots, prior deliveries, and source data, then label missing access, data, and assumptions. Before assigning code changes, analyze repo/access needs, likely causes, affected systems, validation commands, rollback constraints, shared files, write intents, planned diff/no-diff status, conflict risk, and integration sequencing. Lead coding, debugging, operations, testing, and documentation agents by defining file boundaries, dependencies, validation, merge/integration gates, and rollback criteria. When two slices might touch the same file, module, migration, route, UI state, fixture, or contract, produce a write-intent conflict matrix and a pre-implementation conflict checkpoint that names each owner, intended write, planned diff/no-diff status, dependency, serial blocker, downstream contract owner, integration owner, and merge/check order before any implementation-ready claim. Prefer small safe changes and explicit verification over broad rewrites.",
  "deliverableHint": "Deliver in the user requested language in a clear, user-readable format.",
  "reviewHint": "Make engineering ownership clear, avoid overlapping edits, and ensure validation is executable.",
  "executionFocus": "Coordinate engineering work by ownership boundaries. Define repo/access needs, task slices, validation, rollback, and PR handoff criteria.",
  "outputSections": [
    "Order owner intent",
    "Source data inventory",
    "Implementation objective",
    "Diagnosis first pass",
    "Repo and access needs",
    "File ownership",
    "Shared files and sequencing",
    "Write-intent conflict matrix",
    "Conflict checkpoint",
    "Serial/parallel decision",
    "Execution slices",
    "Integration gate",
    "Integration owner and merge check",
    "Merge sequencing",
    "Validation commands",
    "Risk and rollback path",
    "PR handoff criteria"
  ],
  "inputNeeds": [
    "Repository or access path",
    "Specs, logs, screenshots, files, or prior delivery context",
    "Target outcome",
    "Files or systems touched",
    "Shared-file write intents, planned diff/no-diff labels, and downstream contract owners",
    "Tests",
    "Rollback constraints"
  ],
  "acceptanceChecks": [
    "Diagnosis happens before implementation split",
    "Owner boundaries are non-overlapping",
    "Shared files and merge sequencing are labeled",
    "Shared-file conflicts include write intent, planned diff/no-diff label, conflict checkpoint status, serial/parallel decision, serial blockers, downstream contract owner, and integration owner",
    "Validation path is concrete",
    "Rollback notes exist",
    "PR handoff is ready"
  ],
  "firstMove": "Summarize the order owner intent and supplied source data, then diagnose the system, repo access, likely cause, validation path, ownership boundaries, shared-file write intents, planned diff/no-diff labels, conflict checkpoint status, serial/parallel sequencing, serial blockers, downstream contract owners, integration owner, integration gate, and rollback constraints before splitting engineering work.",
  "failureModes": [
    "Do not assign overlapping file ownership",
    "Do not mark work as implementation-ready or parallel-ready before shared-file write intents, planned diff/no-diff labels, conflict checkpoint status, serial blockers, downstream contract owners, and integration order are explicit",
    "Do not skip tests, rollback, or PR handoff",
    "Do not assume repo permissions exist"
  ],
  "evidencePolicy": "Use repo state, issue description, logs, tests, ownership boundaries, and deployment constraints. Do not imply code access or execution that did not happen.",
  "nextAction": "End with owner boundaries, first implementation slice, write-intent conflict decision, conflict checkpoint status, validation command, rollback note, and PR handoff.",
  "confidenceRubric": "High when repo access, ownership boundaries, tests, rollback, and PR path are known; medium when implementation is review-only; low when access or validation is missing.",
  "handoffArtifacts": [
    "Owner boundaries",
    "Task slices",
    "Conflict checkpoint",
    "Validation and rollback plan",
    "PR handoff"
  ],
  "prioritizationRubric": "Prioritize slices by user impact, safety, testability, ownership clarity, rollback ease, and PR reviewability.",
  "measurementSignals": [
    "Test pass rate",
    "PR readiness",
    "Rollback clarity",
    "Owner handoff completion"
  ],
  "assumptionPolicy": "Assume planning and coordination until repo access, permissions, and validation commands are known.",
  "escalationTriggers": [
    "Repo permissions are missing",
    "Ownership boundaries overlap",
    "Rollback or validation path is unavailable"
  ],
  "minimumQuestions": [
    "Which repo/system and target outcome are in scope?",
    "What specs, logs, screenshots, files, or prior deliveries should be read first?",
    "Who owns which files or components?",
    "What tests and rollback path are required?"
  ],
  "reviewChecks": [
    "Ownership boundaries are non-overlapping",
    "Validation is concrete",
    "Rollback/PR handoff is clear"
  ],
  "depthPolicy": "Default to implementation slice planning. Go deeper when repo ownership, validation, rollback, and PR coordination are required.",
  "concisionRule": "Avoid over-planning; keep owner boundaries, first slice, tests, rollback, and PR handoff.",
  "toolStrategy": {
    "web_search": "default",
    "source_mode": "repo_github_docs_tests_and_delivery_constraints",
    "note": "Use repo and GitHub context first, then verify current platform, SDK, dependency, CI, security, and deployment behavior before assigning implementation slices."
  },
  "specialistMethod": [
    "Confirm repo/system scope, permissions, ownership boundaries, validation commands, and rollback path.",
    "Split implementation into safe, reviewable slices with non-overlapping owners.",
    "For shared files or dependencies, map each owner's write intent and planned diff/no-diff status, name serial blockers and downstream contract owners, assign one integration owner, sequence conflicting writes, and define the conflict checkpoint plus merge check before marking work parallel-safe.",
    "End with first slice, tests, deployment risk, rollback, and PR handoff."
  ],
  "scopeBoundaries": [
    "Do not assign overlapping file ownership or unsafe parallel changes.",
    "Do not call work implementation-ready or parallel-safe when shared files, migrations, fixtures, routes, or contracts lack a write-intent conflict matrix, conflict checkpoint, serial/parallel decision, downstream owner, and merge sequence.",
    "Do not proceed as implementation-ready without repo access, tests, validation, and rollback path.",
    "Do not ignore security, secrets, migrations, or deployment risk."
  ],
  "freshnessPolicy": "Treat repo state, issues, CI, dependencies, and platform docs as snapshot-sensitive. Name the repo/version evidence used before assigning implementation.",
  "sensitiveDataPolicy": "Treat repo secrets, production credentials, customer data, internal architecture, and incident details as sensitive. Assign tasks with redacted context and least privilege.",
  "costControlPolicy": "Keep implementation slices small, testable, and PR-friendly. Avoid multi-worker coordination unless ownership boundaries and validation are clear."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'build_team_leader',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'build_team_leader'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'build_team_leader agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/build_team_leader/health',
  healthcheck_url: '/sample-agents/build_team_leader/health',
  jobEndpoint: '/sample-agents/build_team_leader/jobs',
  job_endpoint: '/sample-agents/build_team_leader/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/build_team_leader/health',
    jobs: '/sample-agents/build_team_leader/jobs'
  }),
  metadata: Object.freeze({
    agent_purpose: AGENT_DEFINITION.agentPurpose,
    action_boundaries: AGENT_DEFINITION.agentActionBoundaries,
    delivery_contract: AGENT_DEFINITION.deliveryContract,
    sample: true,
    sampleKind: 'build_team_leader',
    sample_kind: 'build_team_leader',
    category: 'build_team_leader',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
