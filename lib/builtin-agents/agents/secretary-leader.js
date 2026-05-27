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

export const SECRETARY_TASK_EXPANSION_TASKS = Object.freeze(['inbox_triage', 'reply_draft', 'schedule_coordination', 'follow_up', 'meeting_prep', 'meeting_notes', 'summary']);
export const SECRETARY_ANALYSIS_PRELUDE_TASKS = Object.freeze(['inbox_triage', 'schedule_coordination']);
export const SECRETARY_TASK_INFERENCE_RULES = Object.freeze([
  Object.freeze({ taskType: 'secretary_leader', score: 90, patterns: Object.freeze([/(executive secretary|executive assistant|secretary team|assistant ops|personal assistant|chief of staff assistant|メール返信.*日程|日程.*メール返信|社長秘書|秘書チーム|秘書業務|秘書.*(メール|日程|会議|予定|返信)|アシスタント.*(メール|日程|会議|予定|返信))/i]) })
]);

function secretaryAliasToken(value = '') {
  return String(value || '').normalize('NFKC').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export function normalizeSecretaryLeaderAlias(taskType = '') {
  const token = secretaryAliasToken(taskType);
  if ([
    'secretary',
    'secretary_leader',
    'executive_secretary',
    'executive_assistant',
    'assistant_ops',
    'personal_assistant',
    'chief_of_staff_assistant',
    'ceo_secretary'
  ].includes(token)) return 'secretary_leader';
  return '';
}

export function secretaryLeaderTaskTypeForText(text = '') {
  return /(secretary|assistant|inbox triage|reply draft|schedule coordination|meeting prep|meeting notes|calendar coordination|follow[-\s]?up workflow|秘書|受信箱.*(分類|整理|仕分け)|返信.*下書き|日程調整.*(まとめ|運用|ワークフロー)|会議準備|議事録|フォローアップ.*運用)/i.test(String(text || ''))
    ? 'secretary_leader'
    : '';
}

export function secretaryLeaderInferTaskSequence(context = {}) {
  const prioritized = Array.isArray(context.prioritized) ? context.prioritized : [];
  if (String(prioritized[0] || '').trim().toLowerCase() !== 'secretary_leader') return null;
  const ranked = Array.isArray(context.ranked) ? context.ranked : [];
  const text = String(context.text || '').trim();
  const maxTasks = Math.max(1, Number(context.maxTasks || 3) || 3);
  const taskDependencyOrdered = typeof context.taskDependencyOrdered === 'function'
    ? context.taskDependencyOrdered
    : (items) => items;
  const inboxIntent = /(inbox triage|mailbox triage|gmail triage|classify.*emails?|sort.*emails?|メール.*(分類|仕分け|優先順位)|受信箱.*(分類|整理|仕分け)|メール確認)/i.test(text);
  const replyDraftIntent = /(reply draft|draft.*reply|email reply|gmail reply|write.*reply|返信文|返信案|メール返信|メール.*返事|返信.*下書き)/i.test(text);
  const scheduleIntent = /(schedule coordination|calendar coordination|meeting schedule|book.*meeting|find.*time|calendar invite|google meet|zoom|microsoft teams|teams meeting|日程調整|予定調整|会議設定|会議予約|予定.*入れ|カレンダー|google meet|zoom|teams)/i.test(text);
  const followUpIntent = /(follow[-\s]?up|reminder|chaser|nudge|催促|リマインド|フォローアップ|未返信|期限確認|追いメール)/i.test(text);
  const meetingPrepIntent = /(meeting prep|meeting brief|agenda|pre[-\s]?read|briefing|会議準備|アジェンダ|議題|事前資料|打ち合わせ準備)/i.test(text);
  const meetingNotesIntent = /(meeting notes|minutes|action items|meeting summary|議事録|会議メモ|決定事項|todo|to-do|アクションアイテム)/i.test(text);
  const expandedTeam = [];
  const pushUnique = (name) => {
    const safe = String(name || '').trim().toLowerCase();
    if (!safe || expandedTeam.includes(safe)) return;
    expandedTeam.push(safe);
  };
  const explicitSpecialists = ranked.filter((name) => {
    const safe = String(name || '').trim().toLowerCase();
    if (!safe || safe === 'secretary_leader' || safe.endsWith('_leader')) return false;
    return SECRETARY_TASK_EXPANSION_TASKS.includes(safe);
  });
  pushUnique('secretary_leader');
  ['inbox_triage', 'schedule_coordination'].forEach(pushUnique);
  if (replyDraftIntent || inboxIntent) pushUnique('reply_draft');
  if (scheduleIntent) pushUnique('schedule_coordination');
  if (followUpIntent) pushUnique('follow_up');
  if (meetingPrepIntent) pushUnique('meeting_prep');
  if (meetingNotesIntent) pushUnique('meeting_notes');
  for (const name of explicitSpecialists) pushUnique(name);
  if (!replyDraftIntent && !scheduleIntent && !followUpIntent && !meetingPrepIntent && !meetingNotesIntent) pushUnique('follow_up');
  if (prioritized.includes('summary')) pushUnique('summary');
  return taskDependencyOrdered(expandedTeam).slice(0, maxTasks);
}

export const SECRETARY_INTAKE_REQUIRED_SIGNALS = Object.freeze([
  Object.freeze({ signal: 'objective', label: 'operations_objective' }),
  Object.freeze({ signal: 'sourceData', label: 'source_data_context' }),
  Object.freeze({ anyOf: Object.freeze(['currentState', 'constraints']), label: 'operational_context_or_constraints' }),
  Object.freeze({ signal: 'deliverable', label: 'operations_output_format' })
]);

export const SECRETARY_INTAKE_QUESTIONS = Object.freeze({
  ja: Object.freeze([
    '今回の運用・調整で達成したいことを教えてください。',
    '関係者、期限、承認者、連絡先、対象ドキュメントやURLを教えてください。',
    'メール、議事録、予定、過去の納品、読ませたい資料やデータがあれば入れてください。なければ「なし」で大丈夫です。',
    '制約、避けたい連絡、確認が必要な条件はありますか？',
    '納品形式は整理メモ、依頼文、確認リスト、スケジュール案のどれがよいですか？回答後、リーダーが意図を要約します。'
  ]),
  en: Object.freeze([
    'What should this operations or coordination work accomplish?',
    'Who is involved, what is the deadline, who approves, and what documents or URLs are in scope?',
    'Add emails, notes, calendar details, prior deliveries, or source data the leader should read. If none, say none.',
    'What constraints, communication boundaries, or approval conditions matter?',
    'Should the delivery be an organized memo, draft request, checklist, or schedule proposal? The leader will summarize your intent first.'
  ])
});

export const SECRETARY_LEADER_BEHAVIOR = Object.freeze({
  taskInferenceRules: SECRETARY_TASK_INFERENCE_RULES,
  taskExpansionTasks: SECRETARY_TASK_EXPANSION_TASKS,
  analysisPreludeTasks: SECRETARY_ANALYSIS_PRELUDE_TASKS,
  normalizeAlias: normalizeSecretaryLeaderAlias,
  taskTypeForText: secretaryLeaderTaskTypeForText,
  inferTaskSequence: secretaryLeaderInferTaskSequence,
  intakeProfile: 'operations',
  intakeRequiredSignals: SECRETARY_INTAKE_REQUIRED_SIGNALS,
  intakeQuestions: SECRETARY_INTAKE_QUESTIONS
});

const AGENT_OWNED_PURPOSE = "Coordinate executive assistant workflows across inbox, calendar, meetings, follow-ups, connector gaps, approval gates, owners, and next actions.";

const AGENT_OWNED_ACTION_BOUNDARIES = Object.freeze([
  Object.freeze({
    id: "coordinate_operations_queue",
    mode: "queue_coordination",
    requires: Object.freeze([
      "items",
      "item_types",
      "owners_or_assignees"
    ]),
    prepares: Object.freeze([
      "operations_queue",
      "priority_order",
      "approval_gates"
    ]),
    produces: Object.freeze([
      "secretary_operations_queue"
    ]),
    cannotClaim: Object.freeze([
      "items_completed"
    ]),
    authorityBoundary: "Queue coordination does not execute inbox, calendar, or sending actions."
  }),
  Object.freeze({
    id: "prepare_connector_handoff",
    mode: "handoff",
    requires: Object.freeze([
      "connector_status",
      "approved_action",
      "next_owner"
    ]),
    prepares: Object.freeze([
      "handoff_packet",
      "missing_permissions",
      "execution_guardrails"
    ]),
    produces: Object.freeze([
      "secretary_connector_handoff"
    ]),
    cannotClaim: Object.freeze([
      "connector_action_completed"
    ]),
    authorityBoundary: "Connector action claims require connector proof."
  }),
  Object.freeze({
    id: "synthesize_secretary_specialist_outputs",
    mode: "leader_synthesis",
    requires: Object.freeze([
      "specialist_outputs",
      "source_data_inventory",
      "principal_approval_gate"
    ]),
    prepares: Object.freeze([
      "single_priority_queue",
      "handoff_conflict_resolution",
      "least_privilege_context_summary"
    ]),
    produces: Object.freeze([
      "secretary_leader_synthesis_packet"
    ]),
    cannotClaim: Object.freeze([
      "specialist_work_executed",
      "private_context_forwarded_without_scope"
    ]),
    authorityBoundary: "Leader synthesis may merge specialist drafts into one approval queue, but it must not approve, execute, or forward more private context than the next owner needs."
  })
]);

const AGENT_OWNED_DELIVERY_CONTRACT = Object.freeze({
  requiredDeliverySections: Object.freeze([
    "Source data inventory",
    "Operations queue",
    "Item type",
    "Owner",
    "Specialist handoff synthesis",
    "Least-privilege context scope",
    "Approval gate",
    "Connector status",
    "Next action",
    "Open gaps"
  ]),
  requiredEvidence: Object.freeze([
    "item source",
    "specialist output or missing label",
    "connector status or missing label"
  ]),
  mustLabel: Object.freeze([
    "needs approval",
    "connector gap",
    "owner missing",
    "context scope",
    "blocked"
  ]),
  forbiddenClaims: Object.freeze([
    "mixed assistant workflows without queue ownership",
    "connector action completed without proof",
    "external action approved by leader without principal or connector proof",
    "unscoped private context copied into handoff"
  ]),
  validDeliveryCheck: "A valid secretary-leader delivery turns assistant work into one owned queue, synthesizes specialist outputs, scopes private context to the next owner, and keeps execution approval-gated."
});

const AGENT_DEFINITION = {
  provider: AGENT_PROVIDER,
  agentPurpose: AGENT_OWNED_PURPOSE,
  agentActionBoundaries: AGENT_OWNED_ACTION_BOUNDARIES,
  deliveryContract: AGENT_OWNED_DELIVERY_CONTRACT,
  "fileName": "executive-secretary-leader-delivery.md",
  "healthService": "executive_secretary_leader",
  "modelRole": "executive secretary operations leadership",
  "executionLayer": "leader",
  "taskRouting": {
    "softMatchTokens": ['secretary_leader', 'executive_secretary', 'executive_assistant', 'secretary', 'assistant_ops'],
    "tagHints": ['leader', 'secretary', 'email', 'calendar']
  },
  "leaderBehavior": SECRETARY_LEADER_BEHAVIOR,
  "leaderControlSpecialization": {
    "selectionRubric": [
      "principal time protection",
      "inbox/calendar context availability",
      "relationship and tone risk",
      "connector approval and scheduling authority"
    ],
    "synthesisOutputs": [
      "priority queue",
      "reply and schedule packets",
      "specialist handoff synthesis",
      "least-privilege context scope",
      "approval gates",
      "connector gaps"
    ]
  },
  "workflowProfile": {
    "defaultLayer": 2,
    "actionLayerStart": 2,
    "layers": [
      {
        "name": "triage",
        "number": 1,
        "tasks": [
          "inbox_triage",
          "meeting_prep",
          "meeting_notes"
        ]
      },
      {
        "name": "execution",
        "number": 2,
        "tasks": [
          "reply_draft",
          "schedule_coordination",
          "follow_up"
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
      "Separate draft work from connector execution and keep the principal approval gate visible.",
      "Only release schedule or outbound communication packets when owner, recipient, time, and wording are explicit."
    ]
  },
  "seedProfile": {
    "id": "agent_secretary_leader_01",
    "name": "EXECUTIVE SECRETARY LEADER",
    "description": "Built-in executive secretary leader that coordinates inbox triage, reply drafts, scheduling, meeting prep, minutes, reminders, and approval-gated connector handoffs.",
    "taskTypes": [
      "secretary_leader",
      "executive_secretary",
      "executive_assistant",
      "secretary",
      "assistant_ops",
      "email_reply",
      "schedule_coordination",
      "meeting_ops",
      "agent_team"
    ],
    "successRate": 0.94,
    "avgLatencySec": 14,
    "executionPattern": "async",
    "inputTypes": [
      "text",
      "connector_context",
      "file"
    ],
    "outputTypes": [
      "markdown",
      "json",
      "draft_emails",
      "calendar_packets",
      "approval_checklist"
    ],
    "clarification": "multi_turn",
    "scheduleSupport": true,
    "optionalConnectors": [
      "gmail",
      "google_calendar",
      "google_meet",
      "zoom",
      "microsoft_teams"
    ],
    "riskLevel": "confirm_required",
    "confirmationRequiredFor": [
      "send_email",
      "schedule_email",
      "create_calendar_event",
      "update_calendar_event",
      "send_invite",
      "create_meeting_link"
    ],
    "capabilities": [
      "inbox_triage",
      "reply_draft",
      "schedule_coordination",
      "meeting_prep",
      "meeting_notes",
      "follow_up_queue",
      "approval_gate",
      "connector_handoff",
      "task_decomposition",
      "routing_decision",
      "stop_go_gate",
      "integration",
      "quality_gate",
      "context_control",
      "final_responsibility"
    ],
    "metadata": {
      "layer": "leader",
      "downstream_task_types": [
        "inbox_triage",
        "reply_draft",
        "schedule_coordination",
        "follow_up",
        "meeting_prep",
        "meeting_notes"
      ],
      "execution_mode": "assistant_leader_mediated",
      "approval_role": "secretary_leader",
      "planned_action_contract": "recipient_context_artifact_connector_approval",
      "connector_targets": [
        "gmail",
        "google_calendar",
        "google_meet",
        "zoom",
        "microsoft_teams"
      ]
    }
  },
  "systemPrompt": "You are the built-in Executive Secretary Leader in AIagent2. Coordinate the user's executive-assistant work such as inbox triage, reply drafting, schedule coordination, meeting prep, meeting notes, reminders, and follow-up. A good leader gathers information before proposing: first summarize the order owner's operations intent, inventory supplied email snippets, calendar details, meeting notes, participant context, prior deliveries, deadlines, approvals, and other source data, then label missing access and assumptions. Behave like a competent executive secretary: prioritize, reduce friction, protect the principal's time, and keep all external actions approval-gated. When specialists return drafts, candidate times, notes, or follow-up packets, synthesize them into one principal-facing queue instead of pasting every detail; include only the context each next owner needs. Never claim an email was sent, a calendar event was created, a Zoom/Meet/Teams link was issued, or an invite was changed unless a connector explicitly reports success. When execution is requested, return exact connector action packets for Gmail, Google Calendar/Meet, Zoom, or Microsoft Teams, with recipient, time, body, guardrails, and required confirmation. Separate draft work from external execution, and surface missing connector access or missing relationship context instead of guessing.",
  "deliverableHint": "Deliver in the user requested language in a clear, user-readable format.",
  "reviewHint": "Make the assistant output operational: exact drafts, candidate times, owners, deadlines, and approval gates. Remove any wording that implies emails, invites, meeting links, or reminders were executed without connector proof.",
  "executionFocus": "Act as an executive secretary. Prioritize inbox, replies, calendar, meeting prep, minutes, and follow-up while keeping every external action approval-gated.",
  "outputSections": [
    "Order owner intent",
    "Source data inventory",
    "Executive request",
    "Priority queue",
    "Specialist handoff synthesis",
    "Least-privilege context scope",
    "Inbox and reply work",
    "Schedule options",
    "Meeting-link connector path",
    "Meeting prep",
    "Follow-up queue",
    "Approval gates",
    "Connector gaps",
    "Next action"
  ],
  "inputNeeds": [
    "Principal or executive context",
    "Email snippets, calendar details, meeting notes, deadlines, approvals, or prior delivery context",
    "Inbox/calendar scope",
    "Allowed connectors",
    "Approval owner",
    "Time zone and urgency rules"
  ],
  "acceptanceChecks": [
    "Inbox, reply, schedule, meeting, and follow-up work are separated by queue.",
    "Every external action has an approval gate and connector proof requirement.",
    "Drafts, candidate times, owners, and deadlines are explicit.",
    "Connector gaps are visible instead of hidden inside generic assistant advice."
  ],
  "firstMove": "Summarize the order owner intent and supplied source data, then classify the executive-assistant request into inbox, reply, scheduling, meeting prep, notes, follow-up, or mixed work before dispatching specialists.",
  "failureModes": [
    "Do not send, schedule, change invites, create links, or assign reminders without approval and connector proof.",
    "Do not invent availability, relationship history, commitments, owners, or deadlines.",
    "Do not bury approval gates."
  ],
  "evidencePolicy": "Use connected Gmail, calendar, meeting materials, supplied messages, and user instructions as the source of truth; label missing snapshots and connector gaps.",
  "nextAction": "Return one prioritized approval queue with exact drafts or event packets and the connector or human step needed next.",
  "confidenceRubric": "High when current inbox/calendar/message context is connected; medium when supplied snippets are enough for drafts; low when live availability or thread context is missing.",
  "handoffArtifacts": [
    "Priority queue",
    "Reply drafts",
    "Calendar event packets",
    "Meeting-link handoff",
    "Meeting prep or notes packet",
    "Follow-up queue",
    "Approval gates"
  ],
  "prioritizationRubric": "principal time impact, deadline urgency, relationship risk, reversibility, connector readiness, context exposure, and approval effort.",
  "measurementSignals": [
    "Items triaged",
    "Drafts approved",
    "Meetings confirmed",
    "Open loops closed",
    "Connector blockers cleared"
  ],
  "assumptionPolicy": "Use safe placeholders for unknown names, times, owners, or commitments; do not assume live calendar or inbox state.",
  "escalationTriggers": [
    "External send/schedule/link creation is requested without connector proof.",
    "Timezone, participants, or availability are ambiguous.",
    "A reply could create legal, financial, or relationship risk."
  ],
  "minimumQuestions": [
    "Which inbox/calendar/thread should be used?",
    "Who approves external actions?",
    "What timezone and deadline apply?"
  ],
  "reviewChecks": [
    "Priorities are ordered",
    "Drafts and calendar packets are exact",
    "Every external action has an approval gate",
    "Connector gaps are explicit"
  ],
  "depthPolicy": "Default to one priority queue with drafts, calendar packets, and approval gates. Go deeper when multiple inbox, scheduling, and meeting workstreams must be coordinated.",
  "concisionRule": "Avoid generic assistant advice; deliver the exact queue, drafts, calendar packets, connector gaps, and approval gates.",
  "toolStrategy": {
    "web_search": "when_current",
    "source_mode": "gmail_calendar_meeting_connectors_and_user_supplied_context",
    "note": "Use supplied email, calendar, meeting, and relationship context first. Browse only when current tool behavior or meeting-platform constraints materially change the handoff."
  },
  "specialistMethod": [
    "Classify the request into inbox, reply, scheduling, meeting prep, meeting notes, follow-up, or mixed executive-assistant work.",
    "Build a priority queue with owner, artifact, connector path, approval owner, and next action for each item.",
    "Route draft work to the right secretary specialist, then merge the result into one approval queue for the principal or operator.",
    "For each queue item, state the minimum private context that should be shown to the next owner and redact unrelated source detail.",
    "Keep every email send, calendar write, invite change, and meeting-link creation behind explicit approval and connector proof."
  ],
  "scopeBoundaries": [
    "Do not send emails, create calendar events, change invites, or create meeting links without connector confirmation and explicit approval.",
    "Do not invent relationship history, availability, commitments, owners, or deadlines.",
    "Do not bury approval gates; every external action must be visibly separated from drafts and planning."
  ],
  "freshnessPolicy": "Treat inbox state, availability, calendar conflicts, meeting links, and follow-up deadlines as live state. Date the snapshot and never assume it is still current.",
  "sensitiveDataPolicy": "Treat emails, calendar events, attendee lists, meeting links, contact history, travel details, and executive priorities as confidential. Redact unrelated private context and expose only what is needed for approval.",
  "costControlPolicy": "Start with today’s highest-priority queue and one approval packet per external action. Avoid broad assistant systems until inbox/calendar scope is clear."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'secretary_leader',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'secretary_leader'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'secretary_leader agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/secretary_leader/health',
  healthcheck_url: '/sample-agents/secretary_leader/health',
  jobEndpoint: '/sample-agents/secretary_leader/jobs',
  job_endpoint: '/sample-agents/secretary_leader/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/secretary_leader/health',
    jobs: '/sample-agents/secretary_leader/jobs'
  }),
  metadata: Object.freeze({
    agent_purpose: AGENT_DEFINITION.agentPurpose,
    action_boundaries: AGENT_DEFINITION.agentActionBoundaries,
    delivery_contract: AGENT_DEFINITION.deliveryContract,
    sample: true,
    sampleKind: 'secretary_leader',
    sample_kind: 'secretary_leader',
    category: 'secretary_leader',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
