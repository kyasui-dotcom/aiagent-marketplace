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
    const markdown = agentProviderEnsureDiligenceMarkdown(generatedDelivery?.fileMarkdown, body);
    if (!markdown) return agentProviderDeliveryFailure(kind, definition, name, japanese, 'missing_required_deliverable: original request, source context, or concrete artifact was not available.');
    const artifacts = agentProviderMergeArtifacts(
      generatedDelivery?.artifacts,
      agentProviderDiligenceArtifacts(kind, definition, body, markdown)
    );
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

function agentProviderInputRoot(body = {}) {
  return body?.input && typeof body.input === 'object' && !Array.isArray(body.input) ? body.input : {};
}

function agentProviderInputText(body = {}, keys = [], fallback = '') {
  const input = agentProviderInputRoot(body);
  for (const key of keys) {
    const direct = agentProviderText(input?.[key] ?? body?.[key]);
    if (direct) return direct;
  }
  return agentProviderText(fallback, '');
}

function agentProviderInputListValue(body = {}, keys = []) {
  const input = agentProviderInputRoot(body);
  const values = [];
  for (const key of keys) {
    const candidate = input?.[key] ?? body?.[key];
    if (Array.isArray(candidate)) values.push(...candidate);
    else if (candidate && typeof candidate === 'object') values.push(candidate);
    else if (agentProviderText(candidate)) values.push(agentProviderText(candidate));
  }
  return values;
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
    reused_detail: agentProviderText(run?.summary || run?.report?.summary, '').slice(0, 500),
    required_next_action: agentProviderText(run?.nextAction || run?.next_action || run?.report?.nextAction, '').slice(0, 300)
  })).filter((item) => item.reused_detail || item.required_next_action);
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
    structured_diligence_context: agentProviderDiligenceStructuredContextForGeneration(body),
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

function agentProviderDiligenceReferenceSource(body = {}) {
  const input = agentProviderInputRoot(body);
  const supplied = input.reference_source && typeof input.reference_source === 'object' ? input.reference_source : {};
  const url = agentProviderText(
    supplied.url || supplied.source_url || input.reference_ir_url || input.referenceIrUrl || input.benchmark_url || input.benchmarkUrl,
    agentProviderPrimaryUrl(body)
  );
  return {
    company: agentProviderText(supplied.company || supplied.name || input.reference_company || input.referenceCompany, 'reference company not supplied'),
    url,
    source_date: agentProviderText(supplied.document_date || supplied.source_date || supplied.sourceDate || input.source_date || input.sourceDate, 'source date not supplied'),
    source_status: agentProviderText(supplied.source_status || supplied.sourceStatus, url ? 'public_or_owner_supplied_reference' : 'reference source missing'),
    access_status: url ? 'source URL supplied; diligence agent did not independently complete external filing audit in this local artifact' : 'not supplied'
  };
}

function agentProviderDiligenceFactFromText(value = '', index = 0, reference = {}) {
  const text = agentProviderText(value, 'value not supplied');
  const metricValue = text.match(/^(.+?)([+\-▲]?\d[\d,.]*\s*(?:%|pt|百万円|億円|日|件|M|円|ヶ月|か月).*)$/i);
  return {
    row_id: `diligence-benchmark-${index + 1}`,
    metric: agentProviderText(metricValue?.[1], text).replace(/[：:、,\s]+$/g, '') || `Benchmark fact ${index + 1}`,
    value: agentProviderText(metricValue?.[2], text),
    source_status: reference.source_status,
    source_date: reference.source_date,
    source_url: reference.url,
    fact_status: 'public_source_fact_or_owner_supplied_extract',
    risk_use: 'Use as risk and verification context only; do not treat as proof that the proposed SaaS can win.'
  };
}

function agentProviderDiligenceBenchmarkLedger(body = {}) {
  const reference = agentProviderDiligenceReferenceSource(body);
  const facts = agentProviderInputListValue(body, ['ir_fact_extract', 'irFactExtract', 'benchmark_facts', 'benchmarkFacts']);
  return facts.slice(0, 16).map((fact, index) => {
    if (fact && typeof fact === 'object') {
      return {
        row_id: `diligence-benchmark-${index + 1}`,
        metric: agentProviderText(fact.metric || fact.name || fact.label, `Benchmark fact ${index + 1}`),
        value: agentProviderText(fact.value || fact.summary || fact.text || fact.description, 'value not supplied'),
        source_status: agentProviderText(fact.source_status || fact.sourceStatus, reference.source_status),
        source_date: agentProviderText(fact.source_date || fact.sourceDate, reference.source_date),
        source_url: agentProviderText(fact.source_url || fact.sourceUrl || reference.url),
        fact_status: 'public_source_fact_or_owner_supplied_extract',
        risk_use: agentProviderText(fact.risk_use || fact.model_use || fact.modelUse, 'Use as risk and verification context only; do not treat as proof that the proposed SaaS can win.')
      };
    }
    return agentProviderDiligenceFactFromText(fact, index, reference);
  });
}

function agentProviderDiligenceFactText(body = {}) {
  return agentProviderDiligenceBenchmarkLedger(body)
    .map((row) => [row.metric, row.value].filter(Boolean).join(' '))
    .join('\n');
}

function agentProviderDiligenceMatchedFact(body = {}, pattern = /./) {
  return agentProviderDiligenceBenchmarkLedger(body)
    .map((row) => [row.metric, row.value].filter(Boolean).join(' ').trim())
    .find((line) => pattern.test(line)) || '';
}

function agentProviderDiligenceEvidenceMap(body = {}) {
  const benchmarkRows = agentProviderDiligenceBenchmarkLedger(body);
  const reference = agentProviderDiligenceReferenceSource(body);
  const priorUsage = agentProviderPriorRunUsage(body);
  return [
    {
      category: 'benchmark_ir_facts',
      evidence_strength: benchmarkRows.length ? 'medium_owner_supplied_public_extract' : 'low_no_benchmark_extract',
      evidence_basis: benchmarkRows.length ? `${benchmarkRows.length} benchmark row(s) supplied` : 'No IR or benchmark fact rows supplied',
      verification_gap: reference.url ? 'Dated source extraction and interpretation still need reviewer confirmation' : 'Reference source URL missing',
      owner: 'research'
    },
    {
      category: 'finance_pricing_handoff',
      evidence_strength: priorUsage.length ? 'medium_prior_specialist_summaries_supplied' : 'low_no_prior_specialist_handoff',
      evidence_basis: priorUsage.map((row) => row.task_type).join(', ') || 'No CFO/Pricing prior run summaries supplied',
      verification_gap: 'Diligence must turn finance/pricing hypotheses into risk gates before go/no-go approval',
      owner: 'diligence'
    },
    {
      category: 'product_unit_economics',
      evidence_strength: 'low_missing_product_rows',
      evidence_basis: 'No CAC, cost floor, review minutes, support load, refund, retention, or cohort rows are supplied',
      verification_gap: 'Unit-cost and support-capacity proof required before claiming a durable SaaS advantage',
      owner: 'data_analysis + finance'
    },
    {
      category: 'approval_claim_and_compliance',
      evidence_strength: 'low_until_review_policy_supplied',
      evidence_basis: 'No approved claim policy, legal/compliance reviewer, connector permission, or customer proof packet is supplied',
      verification_gap: 'Claim review and approval evidence required before any external marketing execution',
      owner: 'founder + compliance reviewer'
    }
  ];
}

function agentProviderDiligenceRedFlagMatrix(body = {}) {
  const text = agentProviderDiligenceFactText(body);
  const approvalOwner = agentProviderInputText(body, ['approval_owner', 'approvalOwner', 'decision_owner', 'decisionOwner', 'owner'], 'founder');
  const leadTimeFact = agentProviderDiligenceMatchedFact(body, /リードタイム|lead\s*time|145\.5|189\.1/i);
  const paymentFact = agentProviderDiligenceMatchedFact(body, /前受け|与信|未着手|payment|credit|prepaid/i);
  const marginFact = agentProviderDiligenceMatchedFact(body, /粗利|営業利益率|原価|販管費|margin|profit|70\.6|19\.4/i);
  const orderFact = agentProviderDiligenceMatchedFact(body, /受注|orders?|件|unit/i);
  const hasAidma = /アイドマ|Aidma|リードタイム|前受け|与信|粗利|営業利益/i.test(text);
  return [
    {
      red_flag_id: 'time_to_value_advantage_unproven',
      severity: leadTimeFact ? 'blocker_until_timestamp_proof' : 'major_unverified',
      evidence_strength: leadTimeFact ? 'medium_benchmark_extract_supplied' : 'low_no_lead_time_benchmark',
      fact_vs_inference: leadTimeFact ? `fact_context: ${leadTimeFact}` : 'inference: faster SaaS value is assumed but not proven',
      risk: 'The SaaS only wins if it reliably produces first reviewable value faster than a human-heavy service start.',
      go_no_go_impact: 'No-go for claiming lead-time differentiation until product timestamps prove first-value speed.',
      next_verification: 'Instrument intake_created, first_packet_ready, owner_approved, and first_external_ready timestamps; test median first_value_time_days.',
      verification_owner: 'product analytics owner',
      proof_required: 'dated event export with account/project IDs, timestamp definitions, denominator, and owner-reviewed threshold',
      status: 'open_not_verified',
      execution_status: 'not_cleared_not_approved_not_verified'
    },
    {
      red_flag_id: 'payment_and_unstarted_work_exposure',
      severity: paymentFact ? 'blocker' : 'major_unverified',
      evidence_strength: paymentFact ? 'medium_benchmark_extract_supplied' : 'low_no_payment_risk_source',
      fact_vs_inference: paymentFact ? `fact_context: ${paymentFact}` : 'inference: prepaid control is needed but billing proof is missing',
      risk: 'A low-friction SaaS can recreate unpaid or unstarted work risk if scope begins before payment, credit, and refund rules are enforced.',
      go_no_go_impact: 'No-go for open-ended delivery or external execution until prepaid/credit/refund gates are owner-approved.',
      next_verification: 'Review checkout, invoice, refund, credit-check, and start-gate workflow before accepting paid delivery promises.',
      verification_owner: 'finance owner + founder',
      proof_required: 'owner approval plus billing/checkout configuration export, refund rule, credit policy, and start-gate evidence',
      status: 'open_not_verified',
      execution_status: 'not_cleared_not_approved_not_verified'
    },
    {
      red_flag_id: 'ai_margin_advantage_unproven',
      severity: marginFact ? 'blocker_until_cost_floor' : 'major_unverified',
      evidence_strength: marginFact ? 'medium_benchmark_extract_supplied' : 'low_no_margin_benchmark',
      fact_vs_inference: marginFact ? `fact_context: ${marginFact}` : 'inference: AI lowers cost but model/tool/review/support rows are missing',
      risk: 'AI automation can look attractive while human review, rework, support, and refund reserve erase gross-margin advantage.',
      go_no_go_impact: 'No-go for price approval until every package clears a cost floor and support-load guardrail.',
      next_verification: 'Build cost-floor rows for model cost, tool cost, review minutes, support minutes, rework, and refund reserve by package.',
      verification_owner: 'finance + operations owner',
      proof_required: 'cost export or reviewed estimate table with package scope, margin floor, assumptions, and owner sign-off',
      status: 'open_not_verified',
      execution_status: 'not_cleared_not_approved_not_verified'
    },
    {
      red_flag_id: 'output_quality_and_claim_risk',
      severity: 'blocker',
      evidence_strength: 'low_missing_review_policy_and_customer_proof',
      fact_vs_inference: 'fact: no approved claim policy, customer proof, or legal/compliance review evidence is supplied',
      risk: 'Marketing automation outputs may contain unsupported claims, unsuitable channels, or actions that customers will not approve for real use.',
      go_no_go_impact: 'No-go for publishing, connector execution, or ROI claims until output review and proof-safe claim policy exist.',
      next_verification: 'Define claim ledger, reviewer role, approval checklist, source requirements, and blocked-claim taxonomy per channel.',
      verification_owner: 'founder + compliance reviewer',
      proof_required: 'reviewed claim policy, sample approved/rejected packets, approval timestamps, and proof links for any outcome claim',
      status: 'open_not_verified',
      execution_status: 'not_cleared_not_approved_not_verified'
    },
    {
      red_flag_id: 'demand_and_retention_not_validated',
      severity: orderFact ? 'major' : 'major_unverified',
      evidence_strength: orderFact ? 'medium_benchmark_extract_only' : 'low_no_market_or_customer_rows',
      fact_vs_inference: orderFact ? `fact_context: ${orderFact}` : 'inference: target buyers will adopt the SaaS but cohort evidence is missing',
      risk: 'The product can produce useful packets but still fail if buyers do not pay, repeat, upgrade, or connect ROI to retained value.',
      go_no_go_impact: 'No-go for winner claims until qualified demand, conversion, retention, and ROI-event evidence exists.',
      next_verification: 'Run a reversible pilot with qualified-intent, prepaid conversion, activation, ROI event, retention, support load, and refund metrics.',
      verification_owner: 'data_analysis + growth owner',
      proof_required: 'dated cohort table with denominator, conversions, activation, retention/upgrade, ROI event status, and caveats',
      status: 'open_not_verified',
      execution_status: 'not_cleared_not_approved_not_verified'
    },
    {
      red_flag_id: 'benchmark_source_overreach',
      severity: hasAidma ? 'major' : 'major_unverified',
      evidence_strength: hasAidma ? 'medium_benchmark_extract_supplied' : 'low_no_named_benchmark',
      fact_vs_inference: hasAidma ? 'fact_context: Aidma-like benchmark extracts are supplied, but competitor interpretation remains a review task' : 'inference: benchmark relevance is assumed',
      risk: 'IR facts can frame risk, but a new SaaS cannot claim it beats an incumbent without current source review and product-side proof.',
      go_no_go_impact: 'No-go for competitive superiority claims until research confirms source facts and data proves the wedge.',
      next_verification: 'Create a dated source ledger for the IR facts, competitor alternatives, current positioning, and unavailable facts.',
      verification_owner: 'research',
      proof_required: 'dated source ledger with source URL, page/section, fact, interpretation limit, and reviewer approval',
      status: 'open_not_verified',
      execution_status: 'not_cleared_not_approved_not_verified'
    }
  ];
}

function agentProviderDiligenceVerificationQueue(body = {}) {
  const approvalOwner = agentProviderInputText(body, ['approval_owner', 'approvalOwner', 'decision_owner', 'decisionOwner', 'owner'], 'founder');
  return [
    {
      order: 1,
      verification_id: 'source-ledger-confirmation',
      target: 'Confirm supplied benchmark facts and interpretation limits.',
      owner: 'research',
      required_evidence: 'dated source ledger with source URL/page, extracted metric, interpretation note, and reviewer approval',
      decision_unblocked: 'Benchmark facts can be used as risk context, not as proof of a win.',
      status: 'not_verified'
    },
    {
      order: 2,
      verification_id: 'first-value-time-proof',
      target: 'Prove first reviewable output speed from intake to approval.',
      owner: 'product analytics owner',
      required_evidence: 'event export for intake_created, first_packet_ready, owner_approved, and first_external_ready',
      decision_unblocked: 'Whether lead-time wedge is credible enough for a pilot.',
      status: 'not_verified'
    },
    {
      order: 3,
      verification_id: 'prepaid-credit-start-gate',
      target: 'Prevent unpaid work and unstarted delivery exposure.',
      owner: 'finance owner',
      required_evidence: 'billing/checkout config, credit rule, refund policy, start-gate state, and owner approval',
      decision_unblocked: 'Whether any paid workflow can start safely.',
      status: 'not_verified'
    },
    {
      order: 4,
      verification_id: 'margin-and-support-floor',
      target: 'Confirm AI/service margin after human review and support load.',
      owner: 'finance + operations owner',
      required_evidence: 'cost floor table by package with model/tool/review/support/rework/refund reserve rows',
      decision_unblocked: 'Whether package or price approval is safe.',
      status: 'not_verified'
    },
    {
      order: 5,
      verification_id: 'claim-quality-approval-policy',
      target: 'Confirm marketing packets are proof-safe and approval-ready.',
      owner: 'founder + compliance reviewer',
      required_evidence: 'claim ledger, reviewer checklist, approved/rejected sample packets, and blocked-claim rules',
      decision_unblocked: 'Whether output can move to publisher/connector preparation.',
      status: 'not_verified'
    },
    {
      order: 6,
      verification_id: 'pilot-demand-retention-roi',
      target: 'Validate demand, activation, retention, and ROI-event evidence.',
      owner: approvalOwner,
      required_evidence: 'pilot cohort table with qualified intent, prepaid conversion, activation, retention/upgrade, ROI event, refunds, and support load',
      decision_unblocked: 'Whether the service can claim a validated winning wedge.',
      status: 'not_verified'
    }
  ];
}

function agentProviderDiligenceProofTracker(body = {}) {
  const approvalOwner = agentProviderInputText(body, ['approval_owner', 'approvalOwner', 'decision_owner', 'decisionOwner', 'owner'], 'founder');
  return [
    {
      proof_item: 'go/no-go decision adopted',
      required_evidence: 'decision owner approval with selected condition, date, and unresolved blockers',
      current_status: 'not_approved',
      owner: approvalOwner
    },
    {
      proof_item: 'blocker resolved',
      required_evidence: 'dated verification artifact tied to the red_flag_id and reviewer sign-off',
      current_status: 'not_resolved',
      owner: 'diligence owner'
    },
    {
      proof_item: 'pilot launched',
      required_evidence: 'approved pilot plan, audience, start timestamp, instrumentation, and rollback/kill criteria',
      current_status: 'not_launched',
      owner: approvalOwner
    },
    {
      proof_item: 'SaaS app ingested handoff',
      required_evidence: 'app ingestion log, record ID, schema version, and owner-visible state',
      current_status: 'not_ingested',
      owner: 'implementation owner'
    }
  ];
}

function agentProviderDiligenceArtifacts(kind = '', definition = {}, body = {}, markdown = '') {
  if (kind !== 'diligence') return [];
  const service = agentProviderInputText(body, ['service_to_build', 'serviceToBuild', 'service_description', 'serviceDescription'], agentProviderOffer(body));
  const approvalOwner = agentProviderInputText(body, ['approval_owner', 'approvalOwner', 'decision_owner', 'decisionOwner', 'owner'], 'founder');
  const benchmarkLedger = agentProviderDiligenceBenchmarkLedger(body);
  const redFlagMatrix = agentProviderDiligenceRedFlagMatrix(body);
  return [{
    type: 'diligence_saas_handoff',
    artifact_type: 'risk_verification_decision_packet',
    surface: 'risk_verification_console',
    source_task_type: kind,
    title: `${service} risk verification and go/no-go packet`,
    decision_context: {
      service_to_build: service,
      target_buyer: agentProviderInputText(body, ['buyer_segment', 'buyerSegment', 'target_buyer', 'targetBuyer'], 'target buyer not supplied'),
      decision_goal: agentProviderInputText(body, ['decision_goal', 'decisionGoal', 'decision_question', 'decisionQuestion'], agentProviderPrompt(body)).slice(0, 1200),
      decision_owner: approvalOwner,
      execution_status: 'risk_review_not_approved'
    },
    reference_source: agentProviderDiligenceReferenceSource(body),
    benchmark_ledger: benchmarkLedger,
    upstream_handoff_usage: agentProviderPriorRunUsage(body),
    evidence_map: agentProviderDiligenceEvidenceMap(body),
    red_flag_matrix: redFlagMatrix,
    verification_queue: agentProviderDiligenceVerificationQueue(body),
    decision_owner_handoff: {
      owner: approvalOwner,
      recommendation_status: 'conditional_no_go_until_blockers_verified',
      next_decision: 'Approve only a reversible pilot after source ledger, first-value timing, prepaid/start gate, cost floor, claim policy, and measurement plan are verified.',
      approval_status: 'not_approved',
      proof_required: 'owner approval plus dated evidence for every blocker closed'
    },
    verification_proof_tracker: agentProviderDiligenceProofTracker(body),
    blocked_decisions: redFlagMatrix.map((row) => ({
      red_flag_id: row.red_flag_id,
      blocked_decision: row.go_no_go_impact,
      current_status: row.status,
      required_next_verification: row.next_verification
    })),
    confidence_labels: {
      benchmark_facts: benchmarkLedger.length ? 'medium_source_extract_supplied' : 'low_no_benchmark_extract',
      upstream_handoffs: agentProviderPriorRunUsage(body).length ? 'medium_prior_specialist_summary_supplied' : 'low_no_prior_specialist_summary',
      product_metrics: 'low_missing_product_rows',
      final_go_no_go: 'not_adopted_owner_approval_required'
    },
    app_intake_fields: [
      'decision_context',
      'reference_source',
      'benchmark_ledger',
      'upstream_handoff_usage',
      'evidence_map',
      'red_flag_matrix',
      'verification_queue',
      'decision_owner_handoff',
      'verification_proof_tracker',
      'blocked_decisions',
      'confidence_labels',
      'execution_status',
      'blocked_decision'
    ],
    execution_status: 'not_approved_not_launched_not_verified',
    blocked_decision: 'Do not claim the service can win, launch, publish, execute connectors, approve go/no-go, close blockers, or complete verification until owner approval and dated proof exist.',
    execution_boundary: 'Prepared only; no launch, go/no-go approval, blocker closure, completed verification, connector execution, pricing change, pilot launch, or SaaS app ingestion is implied.',
    summary_markdown_title: agentProviderMarkdownTitle(markdown, definition.fileName || kind || 'diligence')
  }];
}

function agentProviderDiligenceStructuredContextForGeneration(body = {}) {
  const benchmarkLedger = agentProviderDiligenceBenchmarkLedger(body);
  return {
    reference_source: agentProviderDiligenceReferenceSource(body),
    service_to_build: agentProviderInputText(body, ['service_to_build', 'serviceToBuild', 'service_description', 'serviceDescription'], agentProviderOffer(body)),
    decision_goal: agentProviderInputText(body, ['decision_goal', 'decisionGoal', 'decision_question', 'decisionQuestion'], agentProviderPrompt(body)).slice(0, 1200),
    approval_owner: agentProviderInputText(body, ['approval_owner', 'approvalOwner', 'decision_owner', 'decisionOwner', 'owner'], 'founder'),
    benchmark_ledger: benchmarkLedger.slice(0, 16),
    upstream_handoff_usage: agentProviderPriorRunUsage(body),
    evidence_map: agentProviderDiligenceEvidenceMap(body),
    red_flag_matrix: agentProviderDiligenceRedFlagMatrix(body),
    verification_queue: agentProviderDiligenceVerificationQueue(body),
    generation_instruction: 'Use supplied benchmark_ledger rows as provided facts with source/date/status labels. Convert CFO/Pricing prior summaries into risk gates and verification order. Do not claim go/no-go approval, launch, pricing execution, blocker closure, completed verification, or SaaS ingestion.'
  };
}

function agentProviderTableCell(value = '') {
  return agentProviderText(value, '-').replace(/\|/g, '/').replace(/\r?\n/g, ' ').trim() || '-';
}

function agentProviderDiligenceBenchmarkLedgerMarkdown(body = {}) {
  const rows = agentProviderDiligenceBenchmarkLedger(body).slice(0, 12);
  if (!rows.length) return '';
  const japanese = agentProviderJapanese(agentProviderLanguageText(body, agentProviderPrompt(body)));
  const heading = japanese ? '## ベンチマーク証拠台帳' : '## Benchmark evidence ledger';
  const intro = japanese
    ? '以下はリスク判断と検証順を決めるために使ったIR/ベンチマーク行です。新SaaSの実績や勝利証明ではありません。'
    : 'These are the supplied IR/benchmark rows used to design the risk and verification sequence. They are not proof that the new SaaS will win.';
  const headers = japanese
    ? '| 指標 | 値 | ソース状態 | リスク判断での使い方 |'
    : '| Metric | Value | Source status | Risk use |';
  const tableRows = rows.map((row) => [
    agentProviderTableCell(row.metric),
    agentProviderTableCell(row.value),
    agentProviderTableCell(row.fact_status || row.source_status),
    agentProviderTableCell(japanese ? 'リスク判断と検証順の材料。新SaaSの勝利証明としては扱わない。' : row.risk_use)
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

function agentProviderDiligenceLocalizedRedFlag(row = {}, japanese = false) {
  if (!japanese) {
    return {
      id: row.red_flag_id,
      severity: row.severity,
      impact: row.go_no_go_impact,
      verification: row.next_verification,
      status: row.execution_status
    };
  }
  const labels = {
    time_to_value_advantage_unproven: {
      id: '初回価値の速さが未証明',
      severity: 'タイムスタンプ証跡までブロッカー',
      impact: '初回価値の速さを証明するまで、リードタイム優位は訴求不可。',
      verification: '受付、初回パケット、承認、外部実行準備の時刻を計測し、中央値を検証する。'
    },
    payment_and_unstarted_work_exposure: {
      id: '未回収・未着手リスク',
      severity: 'ブロッカー',
      impact: '前受け、与信、返金、開始条件が承認されるまで外部実行や無制限納品は不可。',
      verification: '請求、決済、返金、与信、開始ゲートの運用証跡を確認する。'
    },
    ai_margin_advantage_unproven: {
      id: 'AI原価優位が未証明',
      severity: '原価床の確認までブロッカー',
      impact: 'パッケージ別の原価床と支援負荷を確認するまで価格承認は不可。',
      verification: 'モデル、ツール、レビュー、サポート、手戻り、返金引当をパッケージ別に出す。'
    },
    output_quality_and_claim_risk: {
      id: '出力品質・訴求リスク',
      severity: 'ブロッカー',
      impact: '証拠安全な訴求ルールとレビュー体制ができるまで公開・連携実行・ROI訴求は不可。',
      verification: '訴求台帳、レビュアー、承認チェック、出典要件、禁止訴求を定義する。'
    },
    demand_and_retention_not_validated: {
      id: '需要・継続が未検証',
      severity: '重大',
      impact: '有望リード、前払い転換、継続、ROIイベントの証跡が出るまで勝利主張は不可。',
      verification: '有望リード、前払い、活性化、ROIイベント、継続、支援負荷、返金をパイロットで測る。'
    },
    benchmark_source_overreach: {
      id: 'ベンチマーク解釈の過大化',
      severity: '重大',
      impact: 'ソース確認と自社データで差別化が証明されるまで競争優位の断定は不可。',
      verification: 'IR事実、競合代替、現時点のポジション、不明点を日付付きソース台帳にする。'
    }
  };
  const localized = labels[row.red_flag_id] || {};
  return {
    id: localized.id || row.red_flag_id,
    severity: localized.severity || row.severity,
    impact: localized.impact || row.go_no_go_impact,
    verification: localized.verification || row.next_verification,
    status: '未承認・未検証・未解消'
  };
}

function agentProviderDiligenceHandoffMarkdown(body = {}) {
  const artifact = agentProviderDiligenceArtifacts('diligence', {}, body, '')[0];
  if (!artifact) return '';
  const japanese = agentProviderJapanese(agentProviderLanguageText(body, agentProviderPrompt(body)));
  const heading = japanese ? '## SaaS/Appリスク検証ハンドオフ' : '## SaaS/App Risk Verification Handoff';
  const lead = japanese
    ? 'リーダーとSaaS画面に渡すべき未承認の検証キューです。ここにある項目は外部実行済みではありません。'
    : 'This is the unapproved verification queue for the leader and SaaS surface. These items have not been externally executed.';
  const headers = japanese
    ? '| 赤旗 | 重大度 | Go/No-Go影響 | 次の検証 | 状態 |'
    : '| Red flag | Severity | Go/no-go impact | Next verification | Status |';
  const rows = artifact.red_flag_matrix.slice(0, 6).map((row) => {
    const visible = agentProviderDiligenceLocalizedRedFlag(row, japanese);
    return [
      agentProviderTableCell(visible.id),
      agentProviderTableCell(visible.severity),
      agentProviderTableCell(visible.impact),
      agentProviderTableCell(visible.verification),
      agentProviderTableCell(visible.status)
    ];
  });
  return [
    heading,
    lead,
    '',
    headers,
    '| --- | --- | --- | --- | --- |',
    ...rows.map((row) => `| ${row.join(' | ')} |`),
    '',
    japanese
      ? '実行境界: 準備のみ。ローンチ、Go/No-Go承認、ブロッカー解消、検証完了、外部連携実行、価格変更、パイロット開始、SaaS取り込みは含みません。'
      : `Execution boundary: ${artifact.execution_boundary}`
  ].join('\n');
}

function agentProviderEnsureDiligenceMarkdown(markdown = '', body = {}) {
  let next = agentProviderText(markdown);
  if (!next) return next;
  const benchmarkSection = agentProviderDiligenceBenchmarkLedgerMarkdown(body);
  if (benchmarkSection && !/Benchmark evidence ledger|ベンチマーク証拠台帳/i.test(next)) {
    next = `${next}\n\n${benchmarkSection}`.trim();
  }
  const handoffSection = agentProviderDiligenceHandoffMarkdown(body);
  if (handoffSection && !/Risk Verification Handoff|リスク検証ハンドオフ/i.test(next)) {
    next = `${next}\n\n${handoffSection}`.trim();
  }
  return next;
}

function agentProviderMergeArtifacts(generatedArtifacts = [], localArtifacts = []) {
  const artifacts = [];
  const seen = new Set();
  for (const item of [...(Array.isArray(generatedArtifacts) ? generatedArtifacts : []), ...(Array.isArray(localArtifacts) ? localArtifacts : [])]) {
    if (!item || typeof item !== 'object') continue;
    const key = [item.type, item.artifact_type, item.title, item.item_id].map((value) => String(value || '')).join('|').toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    artifacts.push(item);
  }
  return artifacts;
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

const AGENT_OWNED_PURPOSE = "Find decision blockers and evidence quality issues with red flags, go/no-go impact, evidence maps, next verification steps, severity, and conditional recommendations.";

const AGENT_OWNED_ACTION_BOUNDARIES = Object.freeze([
  Object.freeze({
    id: "prepare_red_flag_review",
    mode: "diligence_review",
    requires: Object.freeze([
      "decision_context",
      "evidence_set",
      "risk_categories"
    ]),
    prepares: Object.freeze([
      "red_flag_matrix",
      "severity_labels",
      "go_no_go_impact_by_flag",
      "next_verification_by_flag",
      "conditional_recommendation"
    ]),
    produces: Object.freeze([
      "red_flag_review"
    ]),
    cannotClaim: Object.freeze([
      "risk_cleared"
    ]),
    authorityBoundary: "Diligence review identifies risk; it does not certify safety."
  }),
  Object.freeze({
    id: "prepare_verification_queue",
    mode: "verification_planning",
    requires: Object.freeze([
      "uncertain_claims",
      "evidence_gaps",
      "decision_deadline"
    ]),
    prepares: Object.freeze([
      "verification_tasks",
      "source_targets",
      "blocker_order"
    ]),
    produces: Object.freeze([
      "verification_queue"
    ]),
    cannotClaim: Object.freeze([
      "claims_verified"
    ]),
    authorityBoundary: "Verification queue cannot mark facts verified until evidence is supplied."
  }),
  Object.freeze({
    id: "prepare_decision_handoff",
    mode: "decision_handoff",
    requires: Object.freeze([
      "conditional_recommendation",
      "decision_owner",
      "open_blockers",
      "verification_proof_source"
    ]),
    prepares: Object.freeze([
      "decision_owner_handoff",
      "approval_checkpoint",
      "verification_proof_tracker",
      "execution_status_labels"
    ]),
    produces: Object.freeze([
      "diligence_decision_handoff_packet"
    ]),
    cannotClaim: Object.freeze([
      "launch_approved",
      "go_decision_adopted",
      "blockers_resolved",
      "verification_completed"
    ]),
    authorityBoundary: "Diligence handoff prepares a decision-owner packet; it cannot approve launch, adopt a go/no-go decision, close blockers, or claim verification without owner approval and dated proof."
  }),
  Object.freeze({
    id: "prepare_risk_verification_console_handoff",
    mode: "saas_handoff",
    requires: Object.freeze([
      "red_flag_matrix",
      "benchmark_or_source_ledger",
      "upstream_finance_or_pricing_handoff",
      "open_verification_queue"
    ]),
    prepares: Object.freeze([
      "risk_verification_console_payload",
      "blocked_decision_rows",
      "proof_requirements_by_red_flag",
      "non_execution_boundary"
    ]),
    produces: Object.freeze([
      "diligence_saas_handoff"
    ]),
    cannotClaim: Object.freeze([
      "saas_app_ingested",
      "pilot_launched",
      "pricing_changed",
      "risk_verified",
      "blockers_closed"
    ]),
    authorityBoundary: "Risk-console handoff prepares row-level verification work for the SaaS surface; it cannot claim ingestion, launch, pricing execution, blocker closure, or verification completion."
  })
]);

const AGENT_OWNED_DELIVERY_CONTRACT = Object.freeze({
  requiredDeliverySections: Object.freeze([
    "Decision context",
    "Evidence map",
    "Red flag matrix",
    "Fact vs inference",
    "Verification queue",
    "Blocker severity",
    "Go/no-go impact",
    "Next verification per red flag",
    "Decision owner handoff",
    "Verification proof tracker",
    "Approval/execution status labels",
    "Conditional recommendation",
    "Upstream finance/pricing usage",
    "Benchmark/source-to-risk ledger",
    "Risk Verification Console handoff"
  ]),
  requiredEvidence: Object.freeze([
    "evidence strength per claim",
    "verification target for gaps",
    "go/no-go impact per red flag",
    "next verification source or owner per blocker",
    "upstream CFO, pricing, data, or research handoff used or explicitly missing",
    "benchmark source rows mapped to risk implications when benchmark facts are supplied",
    "SaaS/App handoff rows with owner, proof requirement, blocked decision, and non-execution status",
    "decision owner approval before a launch, go, no-go, or mitigation decision is treated as adopted",
    "dated proof source required before calling any blocker resolved or verification completed"
  ]),
  mustLabel: Object.freeze([
    "fact",
    "inference",
    "unverified",
    "blocker",
    "go impact",
    "no-go risk",
    "verification owner needed",
    "owner approval required",
    "not approved",
    "not launched",
    "not ingested",
    "proof missing"
  ]),
  forbiddenClaims: Object.freeze([
    "risk cleared without evidence",
    "generic risk list without severity",
    "clean go recommendation while blocker verification is open",
    "no-go impact omitted for material red flags",
    "SaaS app ingested or risk console updated without execution proof",
    "pricing, pilot, connector, launch, or external execution changed without proof",
    "launch approved or go/no-go decision adopted without decision-owner proof",
    "blocker resolved or verification completed without dated evidence"
  ]),
  validDeliveryCheck: "A valid diligence delivery separates evidence strength from inference, prioritizes blockers, gives each material red flag its go/no-go impact plus next verification step, and ends with owner approval and verification proof boundaries before any launch or decision claim."
});

const AGENT_DEFINITION = {
  provider: AGENT_PROVIDER,
  agentPurpose: AGENT_OWNED_PURPOSE,
  agentActionBoundaries: AGENT_OWNED_ACTION_BOUNDARIES,
  deliveryContract: AGENT_OWNED_DELIVERY_CONTRACT,
  "fileName": "due-diligence-delivery.md",
  "healthService": "due_diligence_agent",
  "modelRole": "commercial due diligence and risk review",
  "executionLayer": "research",
  "taskRouting": {
    "inferenceRules": [
      { taskType: 'diligence', patterns: [/(due diligence|dd memo|red flag|risk review|デューデリ|リスク調査|赤旗|投資判断)/i] }
    ],
    "expansionTasks": ['research', 'summary'],
    "softMatchTokens": ['diligence', 'research', 'risk'],
    "tagHints": ['research', 'risk', 'diligence']
  },
  "seedProfile": {
    "id": "agent_diligence_01",
    "name": "DUE DILIGENCE AGENT",
    "description": "Built-in due diligence agent that returns blocker-first red-flag analysis, evidence-quality grading, verification queues, and conditional go/no-go guidance.",
    "taskTypes": [
      "diligence",
      "research",
      "summary"
    ],
    "successRate": 0.93,
    "avgLatencySec": 19,
    "capabilities": [
      "red_flag_matrix",
      "evidence_quality_map",
      "verification_queue",
      "conditional_recommendation",
      "decision_blocker",
      "risk_verification_console_handoff"
    ],
    "metadata": {
      "connector_behavior": "Prefer supplied diligence materials, URLs, uploads, and current public records. If critical evidence is missing, return a blocker-first verification queue instead of a false clean recommendation."
    }
  },
  "systemPrompt": "You are the built-in due diligence agent for AIagent2. Return a decision-ready diligence memo, not a generic risk summary. Focus on transaction or approval context, downside concentration, evidence quality by category, decision blockers, each red flag's go/no-go impact, and the exact verification queue needed next. When CFO, pricing, data, research, or benchmark context is supplied, reuse it explicitly and convert it into risk gates, verification order, blocked decisions, and SaaS/App handoff rows. Separate verified evidence, management claims, stale evidence, assumptions, and conditional go/no-go guidance. Treat launch approval, adopted go/no-go decisions, blocker closure, app ingestion, pilot launch, pricing changes, and completed verification as external outcomes that require decision-owner approval and dated proof; otherwise label them not approved, not launched, not ingested, unresolved, or proof missing.",
  "deliverableHint": "Deliver in the user requested language in a clear, user-readable format.",
  "reviewHint": "Reject generic diligence prose. Make severity, evidence quality, stale unknowns, red-flag-level go/no-go impact, and conditional go/no-go logic explicit, with exact verification steps.",
  "executionFocus": "Prioritize red flags and verification questions. Separate positives, unknowns, evidence quality, downside, and decision blockers.",
  "outputSections": [
    "Decision context",
    "Evidence map",
    "Fact vs inference",
    "Blocker severity",
    "Go/no-go impact",
    "Next verification per red flag",
    "Decision owner handoff",
    "Verification proof tracker",
    "Approval/execution status labels",
    "Decision framing",
    "Answer first",
    "Thesis and downside",
    "Red flag matrix",
    "Evidence quality map",
    "Unknowns and stale evidence",
    "Verification queue",
    "Conditional recommendation",
    "Upstream finance/pricing usage",
    "Benchmark/source-to-risk ledger",
    "SaaS/App risk verification handoff"
  ],
  "inputNeeds": [
    "Target company, product, vendor, or asset",
    "Decision type and decision standard",
    "Current thesis, downside concern, or approval bar",
    "Evidence room, URLs, files, or public sources available",
    "Priority risk categories",
    "Decision deadline and reversibility"
  ],
  "acceptanceChecks": [
    "Top red flags are ranked by severity and reversibility",
    "Each material red flag states go/no-go impact and next verification",
    "Evidence quality is graded by category",
    "Supplied CFO, Pricing, Data Analysis, Research, or benchmark context is reused or explicitly marked missing",
    "Benchmark facts are mapped to red flags and verification tasks when supplied",
    "SaaS/App handoff rows include proof requirement, owner, blocked decision, and non-execution status",
    "Unknowns and stale evidence are explicit",
    "Decision owner approval and verification proof are required before any launch, adopted decision, resolved blocker, app ingestion, pilot launch, pricing change, or completed verification claim",
    "Conditional go/no-go posture and blocker are clear"
  ],
  "firstMove": "Clarify the target, decision type, approval bar, downside concern, evidence room, and decision deadline before writing any conclusion.",
  "failureModes": [
    "Do not write a generic SWOT-style summary instead of a decision memo",
    "Do not summarize positives before material blockers and downside concentration",
    "Do not hide evidence gaps, stale facts, or management-claim-only areas",
    "Do not give a clean go decision when verification gaps still drive the outcome",
    "Do not list material red flags without the decision impact and the next verification step",
    "Do not drop supplied CFO, pricing, data, research, or benchmark handoffs when they determine the risk review",
    "Do not claim SaaS app ingestion, launch approval, adopted go/no-go decision, blocker closure, pricing execution, pilot launch, or completed verification without decision-owner proof and dated evidence"
  ],
  "evidencePolicy": "Use supplied diligence materials first, then public records, reputation signals, product evidence, customer signals, security posture, financial/legal context, and evidence-quality grades. Label whether a point is verified evidence, management claim, or inference.",
  "nextAction": "End with the answer-first posture, the top red flags, the exact decision blocker, each blocker-level red flag's go/no-go impact, the verification queue in order, the decision owner handoff, proof tracker, Risk Verification Console handoff status, and the conditional go/no-go next step.",
  "confidenceRubric": "High when target, decision type, approval bar, evidence room, risk categories, and deadline are clear and multiple high-severity claims are independently supported; medium when evidence quality is mixed or stale in one key area; low when the decision standard, evidence base, or major downside area is unclear.",
  "handoffArtifacts": [
    "Decision framing",
    "Prioritized red-flag matrix",
    "Go/no-go impact map",
    "Evidence quality map",
    "Unknowns and stale evidence list",
    "Verification queue",
    "Decision owner handoff",
    "Verification proof tracker",
    "Conditional go/no-go checklist",
    "Risk Verification Console handoff"
  ],
  "prioritizationRubric": "Prioritize findings by downside severity, evidence quality, reversibility, decision impact, time to verify, and whether the risk is already observable or only hypothesized.",
  "measurementSignals": [
    "Red-flag closure",
    "Evidence-quality coverage by category",
    "Decision confidence",
    "Verification completion against blocker list"
  ],
  "assumptionPolicy": "Assume a preliminary risk review only. Do not assume access to private data, clean books, customer satisfaction, or that unknowns are benign without evidence.",
  "escalationTriggers": [
    "Decision type or approval bar is unclear",
    "Evidence quality is too weak for a recommendation",
    "Material legal, financial, security, fraud, or reputation risk appears",
    "A blocker depends on private documents or customer validation that has not been supplied"
  ],
  "minimumQuestions": [
    "What exact target is being reviewed and what decision must this memo support?",
    "What evidence room, URLs, files, or current public sources are available?",
    "Which risk categories or downside scenarios matter most?",
    "What would make this a no-go even if the rest looked good?"
  ],
  "reviewChecks": [
    "Red flags are prioritized by severity",
    "Evidence quality is graded by category",
    "Decision blocker and conditional recommendation are visible"
  ],
  "depthPolicy": "Default to an answer-first posture, the top blockers, and the shortest verification queue. Go deeper when evidence quality differs materially across product, legal, security, financial, customer, or market categories.",
  "concisionRule": "Avoid exhaustive diligence narration; prioritize the answer-first posture, blocker-level red flags, evidence quality by category, stale unknowns, and the shortest path to a confident decision.",
  "toolStrategy": {
    "web_search": "default",
    "source_mode": "current_company_market_reputation_evidence_room_and_risk_scan",
    "note": "Use supplied diligence materials first, then current public evidence, filings, reputation signals, product pages, security/legal context, and customer/market signals to build a blocker-first verification memo."
  },
  "specialistMethod": [
    "Define the target, decision type, approval bar, downside concern, available evidence room, and deadline before judging the opportunity.",
    "Grade evidence quality separately across product, customer, market, financial, technical, legal/compliance, and reputation signals.",
    "Reuse CFO, pricing, data, research, and benchmark handoffs as inputs, then translate them into risk gates rather than repeating their recommendations.",
    "Separate verified evidence from management claims, stale evidence, and inference before recommending anything.",
    "Prioritize blocker-level red flags, state the go/no-go impact for each material flag, then turn them into the shortest verification queue and a conditional go/no-go posture.",
    "Close with decision-owner approval status, Risk Verification Console handoff rows, and proof requirements before any launch, adopted decision, resolved blocker, app ingestion, pilot launch, pricing change, or completed verification claim can be made."
  ],
  "scopeBoundaries": [
    "Do not turn incomplete evidence into a clean go/no-go recommendation.",
    "Do not ignore legal, financial, security, reputation, operational, or customer-concentration red flags.",
    "Do not treat unknowns, stale evidence, or management-claim-only areas as benign without verification priority.",
    "Do not claim launch approval, decision adoption, blocker resolution, SaaS app ingestion, pilot launch, pricing execution, or completed verification without owner approval and dated proof."
  ],
  "freshnessPolicy": "Treat public records, reputation signals, customer evidence, filings, security posture, market data, and regulatory/policy status as time-sensitive. Date findings, note stale evidence explicitly, and separate old observations from current blockers.",
  "sensitiveDataPolicy": "Treat diligence materials, deal terms, security findings, financials, customer lists, legal issues, and reference calls as confidential. Grade and summarize evidence without leaking raw sensitive docs or identifiable counterparties.",
  "costControlPolicy": "Prioritize blocker-level red flags, evidence quality grading, and the shortest verification queue. Avoid exhaustive diligence summaries when a few unknowns determine the decision."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'diligence',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'diligence'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'diligence agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/diligence/health',
  healthcheck_url: '/sample-agents/diligence/health',
  jobEndpoint: '/sample-agents/diligence/jobs',
  job_endpoint: '/sample-agents/diligence/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/diligence/health',
    jobs: '/sample-agents/diligence/jobs'
  }),
  metadata: Object.freeze({
    agent_purpose: AGENT_DEFINITION.agentPurpose,
    action_boundaries: AGENT_DEFINITION.agentActionBoundaries,
    delivery_contract: AGENT_DEFINITION.deliveryContract,
    output_contract: AGENT_DEFINITION.deliveryContract.requiredDeliverySections,
    sample: true,
    sampleKind: 'diligence',
    sample_kind: 'diligence',
    category: 'diligence',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
