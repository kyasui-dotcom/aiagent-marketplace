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
    const markdown = agentProviderEnsureTeardownMarkdown(generatedDelivery?.fileMarkdown, body);
    if (!markdown) return agentProviderDeliveryFailure(kind, definition, name, japanese, 'missing_required_deliverable: original request, source context, or concrete artifact was not available.');
    const generatedArtifacts = Array.isArray(generatedDelivery?.artifacts) ? generatedDelivery.artifacts.filter((item) => item && typeof item === 'object') : [];
    const localArtifacts = agentProviderTeardownArtifacts(kind, definition, body, markdown);
    const artifacts = agentProviderMergeArtifacts(generatedArtifacts, localArtifacts);
    const generatedWebSources = Array.isArray(generatedDelivery?.webSources)
      ? generatedDelivery.webSources.filter(Boolean).slice(0, 8)
      : [];
    return {
      accepted: true,
      status: 'completed',
      summary: generatedDelivery.summary,
      report: {
        summary: generatedDelivery.reportSummary,
        bullets: agentProviderList(generatedDelivery.bullets),
        nextAction: agentProviderText(generatedDelivery.nextAction, ''),
        confidence: prompt === 'No prompt provided.' ? 'low' : 'medium',
        ...(artifacts.length ? { artifacts } : {}),
        ...(agentProviderList(generatedDelivery?.approvalRequests).length ? { approval_requests: generatedDelivery.approvalRequests } : {}),
        ...(generatedWebSources.length ? { web_sources: generatedWebSources } : (webSources.length ? { web_sources: webSources } : {}))
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
  const structuredMarkdown = data
    ? agentProviderValueText(data.file_markdown || data.fileMarkdown || data.markdown || data.content_markdown || data.content || data.body)
    : '';
  const fileMarkdown = structuredMarkdown || rawMarkdown;
  if (!fileMarkdown || agentProviderLooksLikeTemplate(fileMarkdown)) return null;
  const title = agentProviderMarkdownTitle(fileMarkdown, agentProviderText(fallbackName, 'agent_delivery'));
  const bullets = agentProviderList(data?.bullets).length ? agentProviderList(data.bullets) : agentProviderMarkdownBullets(fileMarkdown);
  const webSources = [
    data?.web_sources,
    data?.webSources,
    data?.report?.web_sources,
    data?.report?.webSources,
    data?.sources
  ].find((items) => Array.isArray(items)) || [];
  return {
    summary: agentProviderText(data?.summary, title),
    reportSummary: agentProviderText(data?.report_summary || data?.reportSummary, title),
    bullets,
    nextAction: agentProviderText(data?.next_action || data?.nextAction || data?.recommended_next_action),
    fileMarkdown,
    contentType: agentProviderText(data?.content_type || data?.contentType, 'agent_delivery'),
    artifacts: Array.isArray(data?.artifacts) ? data.artifacts.filter((item) => item && typeof item === 'object') : [],
    approvalRequests: Array.isArray(data?.approval_requests) ? data.approval_requests.filter((item) => item && typeof item === 'object') : [],
    webSources: webSources.filter(Boolean).slice(0, 8)
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
    structured_teardown_context: agentProviderTeardownStructuredContextForGeneration(body),
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

function agentProviderInputRoot(body = {}) {
  return body?.input && typeof body.input === 'object' && !Array.isArray(body.input) ? body.input : {};
}

function agentProviderInputValue(body = {}, keys = []) {
  const input = agentProviderInputRoot(body);
  for (const key of keys) {
    if (Object.hasOwn(input, key) && input[key] != null) return input[key];
    if (Object.hasOwn(body, key) && body[key] != null) return body[key];
  }
  return undefined;
}

function agentProviderInputText(body = {}, keys = [], fallback = '') {
  const value = agentProviderInputValue(body, keys);
  if (value == null) return agentProviderText(fallback);
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return agentProviderText(value, fallback);
  return agentProviderText(agentProviderValueText(value), fallback);
}

function agentProviderInputListValue(body = {}, keys = []) {
  const value = agentProviderInputValue(body, keys);
  if (Array.isArray(value)) return value.filter((item) => item != null);
  if (value && typeof value === 'object') return Object.values(value).filter((item) => item != null);
  if (agentProviderText(value)) return [agentProviderText(value)];
  return [];
}

function agentProviderWorkflow(body = {}) {
  const broker = body?.input?._broker && typeof body.input._broker === 'object' ? body.input._broker : {};
  return broker.workflow && typeof broker.workflow === 'object' ? broker.workflow : {};
}

function agentProviderPriorRunUsage(body = {}) {
  const priorRuns = Array.isArray(agentProviderWorkflow(body).priorRuns) ? agentProviderWorkflow(body).priorRuns : [];
  return priorRuns.slice(-8).map((run) => ({
    task_type: agentProviderText(run?.taskType || run?.task_type || run?.kind, 'specialist'),
    status: agentProviderText(run?.status, 'unknown'),
    reused_detail: agentProviderText(run?.summary || run?.report?.summary, '').slice(0, 650),
    required_next_action: agentProviderText(run?.nextAction || run?.next_action || run?.report?.nextAction, '').slice(0, 350)
  })).filter((item) => item.reused_detail || item.required_next_action);
}

function agentProviderTeardownReferenceSource(body = {}) {
  const input = agentProviderInputRoot(body);
  const reference = input.reference_source && typeof input.reference_source === 'object'
    ? input.reference_source
    : body.reference_source && typeof body.reference_source === 'object'
      ? body.reference_source
      : {};
  const url = agentProviderText(
    reference.url
    || reference.href
    || reference.link
    || agentProviderInputText(body, ['competitor_url', 'competitorUrl', 'reference_ir_url', 'referenceIrUrl', 'benchmark_url', 'benchmarkUrl'], agentProviderPrimaryUrl(body))
  );
  return {
    company: agentProviderText(reference.company || reference.name || agentProviderInputText(body, ['competitor_name', 'competitorName', 'reference_company', 'referenceCompany', 'company'], 'reference competitor')),
    url,
    source_date: agentProviderText(reference.document_date || reference.source_date || reference.sourceDate || agentProviderInputText(body, ['source_date', 'sourceDate', 'ir_date', 'irDate'], 'source date not supplied')),
    source_status: agentProviderText(reference.source_status || reference.sourceStatus || agentProviderInputText(body, ['source_access_status', 'sourceAccessStatus'], ''), url ? 'public_or_owner_supplied_competitive_reference' : 'reference source missing'),
    access_status: agentProviderText(reference.access_status || reference.accessStatus, url ? 'source URL supplied; teardown agent did not independently audit all competitor pages in this local artifact' : 'not supplied')
  };
}

function agentProviderTeardownFactFromText(value = '', index = 0, reference = {}) {
  const text = agentProviderText(value, 'value not supplied');
  const colonMatch = text.match(/^(.+?)\s*[:：]\s*(.+)$/);
  const metricValue = !colonMatch ? text.match(/^(.+?)([+\-▲]?\d[\d,.]*\s*(?:%|pt|bps|百万円|億円|日|件|M|yen|months?|か月|ヶ月).*)$/i) : null;
  return {
    row_id: `teardown-benchmark-${index + 1}`,
    metric: agentProviderText(colonMatch?.[1] || metricValue?.[1], text).replace(/[：:、,\s]+$/g, '') || `Benchmark fact ${index + 1}`,
    value: agentProviderText(colonMatch?.[2] || metricValue?.[2], text),
    source_status: reference.source_status,
    source_date: reference.source_date,
    source_url: reference.url,
    fact_status: 'public_source_fact_or_owner_supplied_extract',
    competitive_use: 'Use as benchmark context for positioning, wedge, verification, and SaaS console rows; do not treat as proof that the new SaaS wins.'
  };
}

function agentProviderTeardownBenchmarkLedger(body = {}) {
  const reference = agentProviderTeardownReferenceSource(body);
  const facts = agentProviderInputListValue(body, ['ir_fact_extract', 'irFactExtract', 'benchmark_facts', 'benchmarkFacts', 'benchmark_rows', 'benchmarkRows']);
  return facts.slice(0, 18).map((fact, index) => {
    if (fact && typeof fact === 'object') {
      return {
        row_id: `teardown-benchmark-${index + 1}`,
        metric: agentProviderText(fact.metric || fact.name || fact.label, `Benchmark fact ${index + 1}`),
        value: agentProviderText(fact.value || fact.summary || fact.text || fact.description, 'value not supplied'),
        source_status: agentProviderText(fact.source_status || fact.sourceStatus, reference.source_status),
        source_date: agentProviderText(fact.source_date || fact.sourceDate, reference.source_date),
        source_url: agentProviderText(fact.source_url || fact.sourceUrl || reference.url),
        fact_status: agentProviderText(fact.fact_status || fact.factStatus, 'public_source_fact_or_owner_supplied_extract'),
        competitive_use: agentProviderText(fact.competitive_use || fact.analysis_use || fact.model_use || fact.modelUse, 'Use as benchmark context for positioning, wedge, verification, and SaaS console rows; do not treat as proof that the new SaaS wins.')
      };
    }
    return agentProviderTeardownFactFromText(fact, index, reference);
  });
}

function agentProviderTeardownService(body = {}) {
  return agentProviderInputText(
    body,
    ['service_to_build', 'serviceToBuild', 'service_description', 'serviceDescription', 'user_product', 'userProduct', 'product', 'offer'],
    agentProviderOffer(body)
  );
}

function agentProviderTeardownBuyer(body = {}) {
  return agentProviderInputText(body, ['target_customer', 'targetCustomer', 'buyer_segment', 'buyerSegment', 'target_buyer', 'targetBuyer', 'audience'], agentProviderAudience(body));
}

function agentProviderTeardownObservedUnavailable() {
  return [
    {
      item_id: 'competitor-customer-churn-reasons',
      missing_observation: 'customer-level churn, support burden, and failed rollout reasons',
      decision_impact: 'Needed before claiming the wedge solves retention better than service-led competitors.',
      current_status: 'not_observed'
    },
    {
      item_id: 'competitor-unit-economics-by-package',
      missing_observation: 'package-level gross margin, review cost, support time, refund, and credit loss',
      decision_impact: 'Needed before pricing a low-friction package without margin leakage.',
      current_status: 'not_observed'
    },
    {
      item_id: 'buyer-switching-friction',
      missing_observation: 'why current buyers would switch from outsourcing, internal staff, CRM/MA tools, or spreadsheets',
      decision_impact: 'Needed before treating time-to-value or prepaid workflow as enough to switch.',
      current_status: 'not_observed'
    }
  ];
}

function agentProviderTeardownComparisonGrid(body = {}) {
  const competitor = agentProviderTeardownReferenceSource(body).company;
  const service = agentProviderTeardownService(body);
  return [
    {
      dimension_id: 'time_to_first_value',
      dimension: 'Time to first usable value',
      reference_observation: `${competitor} IR highlights long service-start lead times and backlog-to-revenue conversion pressure when contracts become complex.`,
      winning_move: `${service} should counter-position around URL-to-owner-approved action packets with a materially shorter first-value SLA.`,
      proof_required: 'timestamped intake, first packet, owner approval, and support/review cost rows',
      execution_status: 'analysis_prepared_not_verified'
    },
    {
      dimension_id: 'cash_before_work',
      dimension: 'Cash and start control',
      reference_observation: `${competitor} disclosed same-month start, upfront lump-sum payment, staged starts, and credit/prepayment controls as operating countermeasures.`,
      winning_move: 'Make prepaid starter or authorized-payment gates a product workflow, not an after-the-fact finance policy.',
      proof_required: 'billing export, prepaid flag, start timestamp, refund status, and qualified-intent label',
      execution_status: 'analysis_prepared_not_verified'
    },
    {
      dimension_id: 'margin_guardrail',
      dimension: 'Margin-protected automation',
      reference_observation: `${competitor} keeps profitability relevant while investing in AI cost optimization.`,
      winning_move: 'Package AI-generated work with human review thresholds, cost floors, and automatic stop rules before service complexity destroys margin.',
      proof_required: 'model/tool cost, review minutes, support minutes, refund reserve, revenue, and gross margin formula',
      execution_status: 'analysis_prepared_not_verified'
    },
    {
      dimension_id: 'roi_proof',
      dimension: 'ROI proof and retention',
      reference_observation: `${competitor} emphasizes support quality, LTV maximization, and ROI visibility themes.`,
      winning_move: 'Ship a customer-visible ROI evidence loop tied to approved actions instead of claiming generic marketing automation outcomes.',
      proof_required: 'reviewed ROI event definition, cohort retention/upgrade rows, and owner-approved customer proof',
      execution_status: 'analysis_prepared_not_verified'
    }
  ];
}

function agentProviderTeardownWedgeHypotheses(body = {}) {
  const service = agentProviderTeardownService(body);
  const approvalOwner = agentProviderInputText(body, ['approval_owner', 'approvalOwner', 'owner', 'decision_owner', 'decisionOwner'], 'founder');
  return [
    {
      wedge_id: 'speed-to-approved-action',
      wedge: `${service} wins by turning a single service URL into an owner-approved action packet faster than service-led onboarding can start.`,
      upstream_signal_used: 'CFO/Data handoffs: backlog-to-revenue conversion and first-value timing are the economic bottleneck.',
      first_test: 'Run a 10-account concierge pilot and measure median first_value_time_days plus approval rate.',
      approval_owner: approvalOwner,
      execution_status: 'not_tested_not_validated'
    },
    {
      wedge_id: 'cash-before-work-product',
      wedge: 'The product makes prepaid/authorized start controls feel like a normal activation flow rather than a finance restriction.',
      upstream_signal_used: 'Pricing/Diligence handoffs: payment friction must be tested without launching unapproved billing changes.',
      first_test: 'Offer a reversible prepaid starter with explicit refund/stop terms to qualified prospects.',
      approval_owner: approvalOwner,
      execution_status: 'not_tested_not_validated'
    },
    {
      wedge_id: 'roi-evidence-loop',
      wedge: 'The service competes on verified ROI evidence per approved action, not on broad AI productivity promises.',
      upstream_signal_used: 'Data/Diligence handoffs: ROI claims and retention hypotheses require dated proof before use in sales copy.',
      first_test: 'Show a reviewable ROI event mock to prospects and collect commitment-quality reactions.',
      approval_owner: approvalOwner,
      execution_status: 'not_tested_not_validated'
    }
  ];
}

function agentProviderTeardownFirstTestQueue(body = {}) {
  const buyer = agentProviderTeardownBuyer(body);
  return [
    {
      test_id: 'seven-day-first-value-pilot',
      target_buyer: buyer,
      hypothesis: 'Buyers will switch from service-led or manual workflows if first reviewable value appears within 7 days.',
      asset_to_prepare: 'URL intake form, approved-action packet template, first-value dashboard mock, and review checklist',
      success_threshold: 'median first_value_time_days <= 7 with owner-approved threshold for approval rate and support load',
      guardrail: 'gross_margin_guardrail and not overpromising ROI',
      execution_status: 'not_launched_not_measured_not_validated',
      blocked_decision: 'Do not claim lead-time advantage until timestamped pilot rows exist.'
    },
    {
      test_id: 'prepaid-starter-offer',
      target_buyer: buyer,
      hypothesis: 'A prepaid starter can reduce unpaid/unstarted work risk without collapsing qualified demand.',
      asset_to_prepare: 'starter package page, payment/authorization copy, cancellation terms, and objection script',
      success_threshold: 'qualified prepaid intent clears owner-approved floor without refund-risk spike',
      guardrail: 'payment-friction objections and refund requests',
      execution_status: 'not_launched_not_measured_not_validated',
      blocked_decision: 'Do not change billing or claim cash-risk reduction without owner approval and billing proof.'
    },
    {
      test_id: 'roi-evidence-demo',
      target_buyer: buyer,
      hypothesis: 'A visible ROI evidence loop increases trust enough to justify recurring use.',
      asset_to_prepare: 'ROI event mock, sample action-to-outcome ledger, claim review policy, and customer proof capture form',
      success_threshold: 'prospects request pilot or paid next step based on reviewed ROI evidence, not compliments',
      guardrail: 'reject vague interest, unsupported outcome claims, and unreviewed testimonials',
      execution_status: 'not_launched_not_measured_not_validated',
      blocked_decision: 'Do not claim ROI or retention lift until cohort evidence and reviewed proof exist.'
    }
  ];
}

function agentProviderTeardownVerificationQueue(body = {}) {
  const reference = agentProviderTeardownReferenceSource(body);
  return [
    {
      verification_id: 'reference-source-audit',
      task: `Re-check ${reference.company} source rows used for benchmark values and date them in the console.`,
      required_evidence: 'PDF/page, line/page reference or owner-supplied extract, metric, value, source date, and access timestamp',
      decision_unblocked: 'Whether the benchmark row can be used in positioning and comparison copy.',
      status: 'not_verified'
    },
    {
      verification_id: 'competitor-pricing-and-onboarding',
      task: 'Collect current pricing/package/onboarding screenshots or readable pages for direct and adjacent alternatives.',
      required_evidence: 'URL, captured date, package price, onboarding step count, proof/trust claims, and page text/screenshot',
      decision_unblocked: 'Whether the SaaS should position against service-led onboarding, CRM/MA tools, or manual workflows first.',
      status: 'not_verified'
    },
    {
      verification_id: 'buyer-switch-interviews',
      task: 'Interview target buyers about current workaround, switch trigger, payment friction, ROI evidence, and first-value expectations.',
      required_evidence: 'interview notes, role, current workaround, commitment signal, objection, and permission status',
      decision_unblocked: 'Whether the wedge is specific enough to drive paid pilot commitment.',
      status: 'not_verified'
    },
    {
      verification_id: 'pilot-data-proof',
      task: 'Instrument first-value, approval, cash-before-work, cost, ROI, and retention/upgrade events before any market claim.',
      required_evidence: 'event schema, export rows, formulas, owner review, and result date',
      decision_unblocked: 'Whether the service can claim faster time-to-value, lower delivery risk, or ROI-led retention.',
      status: 'not_verified'
    }
  ];
}

function agentProviderTeardownArtifacts(kind = '', definition = {}, body = {}, markdown = '') {
  if (kind !== 'teardown') return [];
  const benchmarkLedger = agentProviderTeardownBenchmarkLedger(body);
  const referenceSource = agentProviderTeardownReferenceSource(body);
  const service = agentProviderTeardownService(body);
  const approvalOwner = agentProviderInputText(body, ['approval_owner', 'approvalOwner', 'owner', 'decision_owner', 'decisionOwner'], 'founder');
  return [{
    type: 'competitive_teardown_saas_handoff',
    artifact_type: 'competitive_strategy_decision_packet',
    surface: 'competitive_strategy_console',
    source_task_type: kind,
    title: `${service} competitive wedge and verification packet`,
    decision_context: {
      service_to_build: service,
      reference_competitor: referenceSource.company,
      target_buyer: agentProviderTeardownBuyer(body),
      decision_goal: agentProviderInputText(body, ['decision_goal', 'decisionGoal', 'decision', 'decision_question', 'decisionQuestion'], agentProviderPrompt(body)).slice(0, 1200),
      approval_owner: approvalOwner,
      execution_status: 'strategy_packet_not_ingested'
    },
    reference_source: referenceSource,
    benchmark_ledger: benchmarkLedger,
    upstream_handoff_usage: agentProviderPriorRunUsage(body),
    observed_unavailable: agentProviderTeardownObservedUnavailable(),
    comparison_grid: agentProviderTeardownComparisonGrid(body),
    wedge_hypotheses: agentProviderTeardownWedgeHypotheses(body),
    first_test_queue: agentProviderTeardownFirstTestQueue(body),
    verification_queue: agentProviderTeardownVerificationQueue(body),
    confidence_labels: {
      benchmark_facts: benchmarkLedger.length ? 'medium_source_extract_supplied' : 'low_no_benchmark_extract',
      upstream_handoffs: agentProviderPriorRunUsage(body).length ? 'medium_prior_specialist_summary_supplied' : 'low_no_prior_specialist_summary',
      competitor_pages: 'low_until_current_pages_or_screenshots_are_collected',
      winning_wedge: 'hypothesis_not_validated'
    },
    app_intake_fields: [
      'decision_context',
      'reference_source',
      'benchmark_ledger',
      'upstream_handoff_usage',
      'observed_unavailable',
      'comparison_grid',
      'wedge_hypotheses',
      'first_test_queue',
      'verification_queue',
      'confidence_labels',
      'execution_status',
      'blocked_decision'
    ],
    execution_status: 'not_ingested_not_tested_not_verified',
    blocked_decision: 'Do not claim the SaaS can beat the reference competitor, launch a positioning claim, publish comparison copy, ingest this packet into an app, or validate the wedge until owner approval and dated proof exist.',
    execution_boundary: 'Prepared only; no competitive claim approval, launch, publishing, connector execution, pilot execution, measurement result, source audit completion, or SaaS app ingestion is implied.',
    summary_markdown_title: agentProviderMarkdownTitle(markdown, definition.fileName || kind || 'teardown')
  }];
}

function agentProviderTableCell(value = '') {
  return agentProviderText(value, '-').replace(/\|/g, '/').replace(/\r?\n/g, ' ').trim() || '-';
}

function agentProviderTeardownBenchmarkLedgerMarkdown(body = {}) {
  const rows = agentProviderTeardownBenchmarkLedger(body).slice(0, 12);
  if (!rows.length) return '';
  const japanese = agentProviderJapanese(agentProviderLanguageText(body, agentProviderPrompt(body)));
  const heading = japanese ? '## ベンチマーク証拠台帳' : '## Benchmark evidence ledger';
  const intro = japanese
    ? '以下は今回の競合分析で使ったIR/ベンチマーク行です。新SaaSの実績値ではないため、勝ちを証明する数値としては扱いません。'
    : 'These are the supplied IR/benchmark rows used in this teardown. They are not product performance proof for the new SaaS.';
  const headers = japanese
    ? '| 指標 | 値 | ソース状態 | 競合分析での使い方 |'
    : '| Metric | Value | Source status | Competitive use |';
  const tableRows = rows.map((row) => [
    agentProviderTableCell(row.metric),
    agentProviderTableCell(row.value),
    agentProviderTableCell(row.fact_status || row.source_status),
    agentProviderTableCell(row.competitive_use)
  ]);
  return [
    heading,
    intro,
    '',
    headers,
    '| --- | --- | --- | --- |',
    ...tableRows.map((row) => `| ${row.join(' | ')} |`)
  ].join('\n');
}

function agentProviderTeardownSaasHandoffMarkdown(body = {}) {
  const japanese = agentProviderJapanese(agentProviderLanguageText(body, agentProviderPrompt(body)));
  const wedgeRows = agentProviderTeardownWedgeHypotheses(body).slice(0, 3);
  const testRows = agentProviderTeardownFirstTestQueue(body).slice(0, 3);
  const heading = japanese ? '## SaaS投入用ハンドオフ要約' : '## SaaS handoff summary';
  const wedgeHeader = japanese
    ? '| 勝ち筋仮説 | 上流成果物の使い方 | 最初の検証 | 状態 |'
    : '| Wedge hypothesis | Upstream use | First test | Status |';
  const testHeader = japanese
    ? '| テスト | 成功条件 | ガードレール | 未実行境界 |'
    : '| Test | Success threshold | Guardrail | Non-execution boundary |';
  return [
    heading,
    japanese
      ? 'この分析をSaaS側で扱う場合は、以下を競合戦略コンソールの未検証レコードとして取り込みます。比較公開、広告、価格変更、パイロット実行はまだ行っていません。'
      : 'If ingested by the SaaS surface, use these as unverified Competitive Strategy Console rows. No comparison copy, ads, pricing change, or pilot has been executed.',
    '',
    wedgeHeader,
    '| --- | --- | --- | --- |',
    ...wedgeRows.map((row) => `| ${[
      agentProviderTableCell(row.wedge),
      agentProviderTableCell(row.upstream_signal_used),
      agentProviderTableCell(row.first_test),
      agentProviderTableCell(row.execution_status)
    ].join(' | ')} |`),
    '',
    testHeader,
    '| --- | --- | --- | --- |',
    ...testRows.map((row) => `| ${[
      agentProviderTableCell(row.test_id),
      agentProviderTableCell(row.success_threshold),
      agentProviderTableCell(row.guardrail),
      agentProviderTableCell(row.execution_status)
    ].join(' | ')} |`)
  ].join('\n');
}

function agentProviderInsertAfterSection(markdown = '', sectionPattern = /## Source access status/i, insertion = '') {
  const text = String(markdown || '').trim();
  if (!text || !insertion) return text;
  const lines = text.split(/\r?\n/);
  const sectionIndex = lines.findIndex((line) => sectionPattern.test(line.trim()));
  if (sectionIndex < 0) return `${text}\n\n${insertion}`;
  let nextHeadingIndex = -1;
  for (let index = sectionIndex + 1; index < lines.length; index += 1) {
    if (/^##\s+/.test(lines[index].trim())) {
      nextHeadingIndex = index;
      break;
    }
  }
  if (nextHeadingIndex < 0) return `${text}\n\n${insertion}`;
  return [
    ...lines.slice(0, nextHeadingIndex),
    '',
    insertion,
    '',
    ...lines.slice(nextHeadingIndex)
  ].join('\n').trim();
}

function agentProviderEnsureTeardownMarkdown(markdown = '', body = {}) {
  let next = agentProviderText(markdown);
  if (!next) return next;
  const benchmarkSection = agentProviderTeardownBenchmarkLedgerMarkdown(body);
  if (benchmarkSection && !/Benchmark evidence ledger|ベンチマーク証拠台帳/i.test(next)) {
    next = agentProviderInsertAfterSection(next, /##\s*(Source access status|ソースアクセス|ソース|情報源|1\.\s*ソース)/i, benchmarkSection);
  }
  const handoffSection = agentProviderTeardownSaasHandoffMarkdown(body);
  if (handoffSection && !/SaaS handoff summary|SaaS投入用ハンドオフ要約/i.test(next)) {
    next = `${next.trim()}\n\n${handoffSection}`;
  }
  return next;
}

function agentProviderMergeArtifacts(generatedArtifacts = [], localArtifacts = []) {
  const artifacts = [];
  const seen = new Set();
  for (const item of [...generatedArtifacts, ...localArtifacts]) {
    if (!item || typeof item !== 'object') continue;
    const key = [item.type, item.artifact_type, item.title, item.item_id].map((value) => String(value || '')).join('|').toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    artifacts.push(item);
  }
  return artifacts;
}

function agentProviderTeardownStructuredContextForGeneration(body = {}) {
  const benchmarkLedger = agentProviderTeardownBenchmarkLedger(body);
  return {
    reference_source: agentProviderTeardownReferenceSource(body),
    service_to_build: agentProviderTeardownService(body),
    target_buyer: agentProviderTeardownBuyer(body),
    decision_goal: agentProviderInputText(body, ['decision_goal', 'decisionGoal', 'decision', 'decision_question', 'decisionQuestion'], agentProviderPrompt(body)).slice(0, 1200),
    benchmark_ledger: benchmarkLedger.slice(0, 18),
    upstream_handoff_usage: agentProviderPriorRunUsage(body),
    observed_unavailable: agentProviderTeardownObservedUnavailable(),
    comparison_grid: agentProviderTeardownComparisonGrid(body),
    wedge_hypotheses: agentProviderTeardownWedgeHypotheses(body),
    first_test_queue: agentProviderTeardownFirstTestQueue(body),
    verification_queue: agentProviderTeardownVerificationQueue(body),
    generation_instruction: 'Use supplied benchmark_ledger rows as observed benchmark facts with source/date/status labels. Use upstream_handoff_usage from CFO/Pricing/Data/Diligence as the reason the teardown is better than a single-agent answer. Treat the named reference competitor as the primary benchmark; do not broaden into generic competitor names unless supplied. Keep current competitor page claims as unobserved unless readable source, screenshot, or excerpt is supplied. Do not claim competitive win, launch, publishing, pilot execution, source audit completion, measurement result, or SaaS app ingestion.'
  };
}

const AGENT_OWNED_PURPOSE = "Produce competitive analysis that changes positioning or product decisions by separating source access status, observed facts, unavailable observations, dated evidence, inference, wedge, and first test.";

const AGENT_OWNED_ACTION_BOUNDARIES = Object.freeze([
  Object.freeze({
    id: "prepare_competitor_comparison",
    mode: "competitive_analysis",
    requires: Object.freeze([
      "competitors_or_category",
      "source_access_status",
      "evidence_status",
      "decision_goal"
    ]),
    prepares: Object.freeze([
      "comparison_table",
      "observed_unavailable_notes",
      "observed_vs_inferred_split",
      "positioning_wedge"
    ]),
    produces: Object.freeze([
      "competitor_comparison_packet"
    ]),
    cannotClaim: Object.freeze([
      "current_market_fact_verified_without_source",
      "landing_page_observed_when_source_unread"
    ]),
    authorityBoundary: "Competitive claims must be dated and source-labeled; a URL alone is not observed page evidence unless readable source text, screenshots, or fetched content is supplied."
  }),
  Object.freeze({
    id: "prepare_differentiated_move",
    mode: "positioning_decision",
    requires: Object.freeze([
      "comparison_findings",
      "target_customer",
      "test_channel"
    ]),
    prepares: Object.freeze([
      "wedge",
      "first_test",
      "risk_notes"
    ]),
    produces: Object.freeze([
      "differentiated_move_packet"
    ]),
    cannotClaim: Object.freeze([
      "market_response_proven"
    ]),
    authorityBoundary: "Positioning move remains a hypothesis until tested."
  }),
  Object.freeze({
    id: "prepare_verification_queue",
    mode: "evidence_verification",
    requires: Object.freeze([
      "uncertain_claims",
      "source_gaps",
      "unread_urls_or_missing_page_content",
      "decision_impact"
    ]),
    prepares: Object.freeze([
      "verification_tasks",
      "claim_confidence_labels",
      "content_fetch_or_manual_review_handoff",
      "blocker_severity"
    ]),
    produces: Object.freeze([
      "competitive_verification_queue"
    ]),
    cannotClaim: Object.freeze([
      "unverified competitor claim resolved"
    ]),
    authorityBoundary: "Verification queue names what to check next; it does not resolve source gaps by itself."
  }),
  Object.freeze({
    id: "prepare_competitive_strategy_console_handoff",
    mode: "saas_handoff",
    requires: Object.freeze([
      "reference_source",
      "benchmark_ledger",
      "upstream_specialist_context",
      "wedge_hypotheses",
      "first_test_queue"
    ]),
    prepares: Object.freeze([
      "competitive_strategy_console_payload",
      "row_level_benchmark_ledger",
      "upstream_handoff_usage",
      "blocked_decisions",
      "non_execution_boundary"
    ]),
    produces: Object.freeze([
      "competitive_teardown_saas_handoff"
    ]),
    cannotClaim: Object.freeze([
      "saas_app_ingested",
      "competitive_claim_approved",
      "wedge_validated",
      "pilot_launched",
      "source_audit_completed"
    ]),
    authorityBoundary: "Competitive Strategy Console handoff prepares structured SaaS/App rows only; it does not ingest, approve claims, publish comparison copy, launch pilots, complete source audits, or validate the wedge without explicit proof."
  })
]);

const AGENT_OWNED_DELIVERY_CONTRACT = Object.freeze({
  requiredDeliverySections: Object.freeze([
    "Source access status",
    "Competitor classification",
    "Observed facts",
    "Observed unavailable",
    "Inferences",
    "Comparison table",
    "Wedge",
    "First test",
    "Verification queue",
    "Evidence gaps",
    "SaaS/App intake payload"
  ]),
  requiredEvidence: Object.freeze([
    "dated evidence or missing-source label",
    "readable page content, screenshot, fetched source, or explicit observed-unavailable label",
    "observed-vs-inferred split",
    "verification need for source gaps",
    "decision impact of each missing observation"
  ]),
  mustLabel: Object.freeze([
    "source access",
    "observed",
    "not observed",
    "inferred",
    "dated",
    "unverified"
  ]),
  forbiddenClaims: Object.freeze([
    "SWOT filler without decision impact",
    "current claim without dated evidence",
    "landing page observed without readable source or screenshot",
    "unverified competitor claim resolved",
    "SaaS app ingested",
    "competitive win proven without validation"
  ]),
  validDeliveryCheck: "A valid teardown delivery produces a differentiated move grounded in observed evidence, preserves supplied benchmark rows, labels unavailable observations, and returns a SaaS/App intake payload with non-execution boundaries."
});

const AGENT_DEFINITION = {
  provider: AGENT_PROVIDER,
  agentPurpose: AGENT_OWNED_PURPOSE,
  agentActionBoundaries: AGENT_OWNED_ACTION_BOUNDARIES,
  deliveryContract: AGENT_OWNED_DELIVERY_CONTRACT,
  "fileName": "competitor-teardown-delivery.md",
  "healthService": "competitor_teardown_agent",
  "modelRole": "competitor teardown and positioning analysis",
  "executionLayer": "research",
  "taskRouting": {
    "inferenceRules": [
      { taskType: 'teardown', patterns: [/(competitor|teardown|benchmark|positioning|vs\.?|競合分析|競合比較|ベンチマーク|ポジショニング)/i] }
    ],
    "expansionTasks": ['research', 'summary'],
    "softMatchTokens": ['teardown', 'research', 'analysis', 'competitor', 'benchmark'],
    "tagHints": ['research', 'analysis', 'competitor']
  },
  "seedProfile": {
    "id": "agent_teardown_01",
    "name": "COMPETITOR TEARDOWN AGENT",
    "description": "Built-in competitor teardown and positioning analysis agent.",
    "taskTypes": [
      "teardown",
      "research",
      "summary"
    ],
    "successRate": 0.94,
    "avgLatencySec": 18,
    "capabilities": [
      "teardown",
      "research",
      "summary"
    ]
  },
  "systemPrompt": "You are the built-in competitor teardown agent for AIagent2. Return concrete competitive analysis with product, pricing, positioning, onboarding, proof, and go-to-market differences. Start from the user product, buyer segment, buying trigger, decision this teardown should support, and source access status before comparing alternatives. When structured_teardown_context is supplied, treat its benchmark_ledger rows as observed benchmark facts with source labels, use upstream_handoff_usage to explain how CFO/Pricing/Data/Diligence shaped the wedge, and keep the named reference competitor as the primary benchmark unless the user supplied additional competitors. Classify each alternative as a direct competitor, adjacent substitute, or status-quo/manual workflow when relevant. Compare product promise, target buyer, pricing/package, onboarding friction, proof/trust, switching cost, and distribution motion with current evidence. Separate observed facts from inference, date time-sensitive competitor observations, and label missing evidence instead of guessing. If the user only supplies a URL and no readable page content, screenshot, fetched source, or search result excerpt, mark page-specific observations as not observed and move them to the verification queue instead of writing them as facts. Include a SaaS/App intake payload section that names benchmark rows, upstream handoff usage, wedge hypotheses, first tests, blocked decisions, and not-ingested/not-tested/not-verified status. End with the differentiated wedge, counter-positioning message, the first product or GTM move, and one fast competitive test.",
  "deliverableHint": "Deliver in the user requested language in a clear, user-readable format.",
  "reviewHint": "Tighten the buyer context, competitor classification, switching friction, proof gaps, and differentiated wedge. Remove generic SWOT filler, undated competitor claims, and copycat recommendations without a reason to win.",
  "executionFocus": "Compare product, positioning, pricing, GTM, onboarding, trust, and weakness. End with a differentiated wedge the user can act on.",
  "outputSections": [
    "Source access status",
    "Competitor classification",
    "Observed facts",
    "Observed unavailable",
    "Inferences",
    "Comparison table",
    "Wedge",
    "First test",
    "Verification queue",
    "Evidence gaps",
    "SaaS/App intake payload"
  ],
  "inputNeeds": [
    "Competitors or alternatives",
    "Readable competitor evidence or source access status",
    "User product or baseline",
    "Market or segment",
    "Comparison dimensions",
    "Decision to support"
  ],
  "acceptanceChecks": [
    "Source access status is explicit before page-specific claims",
    "Comparison uses consistent dimensions",
    "URL-only inputs do not become observed landing page facts",
    "Differentiated wedge is explicit",
    "SaaS/App intake payload preserves benchmark rows and upstream handoff usage",
    "Threats and opportunities are separated",
    "Next move is actionable"
  ],
  "firstMove": "Define the competitors, comparison dimensions, and user decision before producing the grid. Then identify the wedge that can change behavior.",
  "failureModes": [
    "Do not compare on inconsistent dimensions",
    "Do not turn the teardown into generic praise/criticism",
    "Do not claim landing page content was observed from a URL-only input",
    "Do not omit the user’s differentiated move"
  ],
  "evidencePolicy": "Use direct and indirect competitors with consistent comparison dimensions. Treat URL-only input as a source pointer, not observed evidence. When readable page content, screenshots, fetched source, excerpts, or examples are unavailable, label page-specific claims as not observed and keep the comparison as hypothesis.",
  "nextAction": "End with the differentiated move the user should execute and what competitor signal to monitor next.",
  "confidenceRubric": "High when named competitors and dimensions are available; medium when alternatives are inferred; low when the user product, decision, or segment is unclear.",
  "handoffArtifacts": [
    "Comparison grid",
    "Source access and observed-unavailable ledger",
    "Positioning gap",
    "Differentiated wedge",
    "Next move",
    "Competitive Strategy Console handoff"
  ],
  "prioritizationRubric": "Prioritize gaps that change buyer behavior, create differentiation, are defensible, and can be tested quickly.",
  "measurementSignals": [
    "Differentiation clarity",
    "Competitor gap severity",
    "Test speed",
    "User behavior signal"
  ],
  "assumptionPolicy": "Assume public-facing competitive analysis. Do not assume internal strategy, private metrics, or a final strategic choice without user context.",
  "escalationTriggers": [
    "Competitors or user product are not identified",
    "Only URLs are supplied but page contents are unavailable",
    "Private competitor claims are needed",
    "The decision the teardown supports is unclear"
  ],
  "minimumQuestions": [
    "Which competitors or alternatives should be compared?",
    "What user product or decision is this supporting?",
    "Which dimensions matter most?"
  ],
  "reviewChecks": [
    "Dimensions are consistent",
    "Wedge is differentiated",
    "Next move is actionable"
  ],
  "depthPolicy": "Default to the comparison that changes the user decision. Go deeper when multiple competitors, dimensions, or wedges need sorting.",
  "concisionRule": "Avoid generic SWOT filler; keep only comparisons that reveal a differentiated move.",
  "toolStrategy": {
    "web_search": "default",
    "source_mode": "live_product_competitor_and_positioning_scan",
    "note": "Inspect current product pages, positioning, pricing, onboarding, and competitor claims when available."
  },
  "specialistMethod": [
    "Define the user product, buyer segment, buying trigger, competitor set, and decision the teardown should support.",
    "State source access status for each competitor and mark page-specific facts as observed only when readable content, screenshots, fetched source, or source excerpts are available.",
    "Classify the comparison set into direct competitors, adjacent substitutes, and status-quo/manual workflows when relevant.",
    "Compare promise, product depth, pricing/package, onboarding friction, proof/trust, switching cost, and distribution motion with current evidence.",
    "Separate what buyers choose today from the weakest moment where they would switch.",
    "End with the differentiated wedge, counter-positioning message, the next move that can be tested fastest, and a structured SaaS/App intake payload with non-execution labels."
  ],
  "scopeBoundaries": [
    "Do not provide generic SWOT filler without a decision or competitive implication.",
    "Do not assume competitors are equivalent when segment, pricing, or buyer context differs.",
    "Do not recommend copying competitors without a differentiated reason."
  ],
  "freshnessPolicy": "Treat product pages, pricing, positioning, and onboarding as live-market observations. Date scans and distinguish current evidence from durable strategic inference.",
  "sensitiveDataPolicy": "Treat private product plans, customer lists, analytics, and internal positioning as confidential. Do not leak private strategy while comparing public competitors.",
  "costControlPolicy": "Compare the few competitors or dimensions that change the wedge. Avoid exhaustive market maps unless the user asks for category strategy."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'teardown',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'teardown'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'teardown agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/teardown/health',
  healthcheck_url: '/sample-agents/teardown/health',
  jobEndpoint: '/sample-agents/teardown/jobs',
  job_endpoint: '/sample-agents/teardown/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/teardown/health',
    jobs: '/sample-agents/teardown/jobs'
  }),
  metadata: Object.freeze({
    agent_purpose: AGENT_DEFINITION.agentPurpose,
    action_boundaries: AGENT_DEFINITION.agentActionBoundaries,
    delivery_contract: AGENT_DEFINITION.deliveryContract,
    output_contract: AGENT_DEFINITION.deliveryContract.requiredDeliverySections,
    sample: true,
    sampleKind: 'teardown',
    sample_kind: 'teardown',
    category: 'teardown',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
