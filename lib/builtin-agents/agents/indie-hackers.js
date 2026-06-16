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
      agent_purpose: definition.agentPurpose || null,
      action_boundaries: Array.isArray(definition.agentActionBoundaries) ? definition.agentActionBoundaries : [],
      delivery_contract: agentProviderObject(definition.deliveryContract),
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
    const generatedArtifacts = Array.isArray(generatedDelivery?.artifacts) ? generatedDelivery.artifacts.filter((item) => item && typeof item === 'object') : [];
    const localArtifacts = agentProviderIndieHackersArtifacts(kind, definition, body, markdown);
    const artifacts = agentProviderMergeArtifacts(generatedArtifacts, localArtifacts);
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
      purpose: definition.agentPurpose || null,
      action_boundaries: Array.isArray(definition.agentActionBoundaries) ? definition.agentActionBoundaries : [],
      delivery_contract: agentProviderObject(definition.deliveryContract),
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
  const raw = String(value || '').trim();
  const leadingUrl = raw.match(/^(https?:\/\/[^\s<>)\]\"'\\\u3001\u3002\uff0c\uff0e\uff09\u300d\u300f\u3011]+)/i);
  const text = (leadingUrl ? leadingUrl[1] : raw)
    .replace(/\?["'].*$/g, '')
    .replace(/[),.;\]\u3001\u3002\uff0c\uff0e\uff09\u300d\u300f\u3011]+$/g, '');
  if (!text) return '';
  const domain = text.match(/^sc-domain:([a-z0-9.-]+)$/i);
  if (domain) return 'https://' + domain[1] + '/';
  if (/^https?:\/\//i.test(text)) return text;
  return '';
}

function agentProviderExtractSourceUrls(value = '') {
  const urls = [];
  const pattern = /(https?:\/\/[^\s<>)\]\"'\\\u3001\u3002\uff0c\uff0e\uff09\u300d\u300f\u3011]+|sc-domain:[a-z0-9.-]+)/ig;
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
  if (/marketing|marketers?|growth|go[- ]?to[- ]?market|マーケティング|認知|集客|獲得/i.test(text)) return 'founders, marketers, and growth operators';
  return 'the target audience';
}

function agentProviderConversion(body = {}) {
  const text = agentProviderPrompt(body);
  const goal = agentProviderFieldValue(body, ['Primary conversion', 'Conversion goal', 'Main goal', '主な目的']);
  const conversionText = goal || text;
  if (/awareness|brand|認知|知名度|指名検索|想起/i.test(conversionText)) return 'awareness referral signal';
  if (/lead|inquir|contact|問い合わせ|リード|相談|見積/i.test(conversionText)) return 'lead or inquiry';
  if (/sales|revenue|purchase|booking|売上|購入|予約/i.test(conversionText)) return 'purchase or revenue action';
  if (/sign\s*ups?|sign[_ -]?up|trials?|登録|トライアル/i.test(conversionText)) return 'signup or trial start';
  return 'the primary conversion';
}

function agentProviderConversionEvent(conversion = '') {
  const text = String(conversion || '').toLowerCase();
  if (/awareness|brand|referral|認知|知名度|指名検索|想起/i.test(conversion)) return 'awareness_referral_signal';
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

function agentProviderInput(body = {}) {
  return body?.input && typeof body.input === 'object' && !Array.isArray(body.input) ? body.input : {};
}

function agentProviderWorkflow(body = {}) {
  const broker = agentProviderInput(body)._broker && typeof agentProviderInput(body)._broker === 'object' ? agentProviderInput(body)._broker : {};
  return broker.workflow && typeof broker.workflow === 'object' ? broker.workflow : {};
}

function agentProviderInputText(body = {}, keys = [], fallback = '') {
  const input = agentProviderInput(body);
  for (const key of keys) {
    const value = input[key];
    if (value == null) continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      const text = agentProviderText(value);
      if (text) return text;
    }
  }
  return agentProviderText(fallback);
}

function agentProviderInputListValue(body = {}, keys = []) {
  const input = agentProviderInput(body);
  const values = [];
  for (const key of keys) {
    const value = input[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string') values.push(item);
        else if (item && typeof item === 'object') values.push(agentProviderText(item.name || item.title || item.asset || item.field || item.value || item.summary));
      }
    } else if (typeof value === 'string') {
      values.push(value);
    }
  }
  return values.map((item) => agentProviderText(item)).filter(Boolean);
}

function agentProviderUtmTemplate(targetUrl = '') {
  const url = agentProviderText(targetUrl);
  if (!url) return 'utm_source=indie_hackers&utm_medium=community&utm_campaign=founder_awareness';
  const joiner = url.includes('?') ? '&' : '?';
  return `${url}${joiner}utm_source=indie_hackers&utm_medium=community&utm_campaign=founder_awareness`;
}

function agentProviderSourceStatus(body = {}) {
  const input = agentProviderInput(body);
  const rawSource = input.source_status || input.sourceStatus;
  const source = rawSource && typeof rawSource === 'object' && !Array.isArray(rawSource) ? rawSource : {};
  const sourceText = typeof rawSource === 'string' ? rawSource : '';
  return {
    target_url: agentProviderPrimaryUrl(body) ? 'supplied' : 'missing',
    public_page_readability: agentProviderText(source.static_page_read || source.staticPageRead || source.page_readability || source.pageReadability || sourceText, 'not supplied'),
    community_source_status: agentProviderText(source.community_source_status || source.communitySourceStatus, 'needs_current_indie_hackers_tone_and_rule_check'),
    proof_status: agentProviderText(input.proof_status || input.proofStatus || source.proof_status || source.proofStatus, 'proof not supplied'),
    connector_execution: agentProviderText(input.connector_status || input.connectorStatus || source.connector_execution || source.connectorExecution, 'no Indie Hackers, Publisher, or analytics connector proof supplied')
  };
}

function agentProviderPriorRunUsage(body = {}) {
  const workflow = agentProviderWorkflow(body);
  const priorRuns = Array.isArray(workflow.priorRuns) ? workflow.priorRuns : [];
  return priorRuns.slice(-8).map((run) => ({
    task_type: agentProviderText(run?.taskType || run?.task_type || run?.kind, 'prior_specialist'),
    status: agentProviderText(run?.status, 'unknown'),
    reused_detail: agentProviderText(run?.summary || run?.report?.summary, '').slice(0, 500),
    required_next_action: agentProviderText(run?.nextAction || run?.next_action || run?.report?.nextAction, '').slice(0, 300)
  })).filter((item) => item.reused_detail || item.required_next_action);
}

function agentProviderMissingProofQueue(body = {}) {
  const supplied = agentProviderInputListValue(body, ['missing_proof', 'missingProof', 'missing_assets', 'missingAssets', 'missing_fields', 'missingFields']);
  const defaults = [
    'crawlable product explanation and CTA',
    'approved founder story or build-in-public learning',
    'approved screenshot or demo media',
    'customer proof, case study, or metric with source',
    'Indie Hackers account owner and disclosure language',
    'UTM link and analytics event'
  ];
  const items = supplied.length ? supplied : defaults;
  return items.map((item) => ({
    item,
    status: 'missing_or_unapproved',
    owner: 'service owner',
    blocked_decision: 'Do not mark the Indie Hackers packet publish-ready until this proof is supplied, replaced, or explicitly waived.'
  }));
}

function agentProviderIndieHackersPostRows(body = {}) {
  const targetUrl = agentProviderPrimaryUrl(body);
  const productName = agentProviderInputText(body, ['product_name', 'productName', 'name'], agentProviderHost(targetUrl));
  const audience = agentProviderInputText(body, ['target_audience', 'targetAudience', 'icp', 'audience'], agentProviderAudience(body));
  const goal = agentProviderInputText(body, ['goal', 'objective', 'conversion_goal', 'conversionGoal'], agentProviderConversion(body));
  const approvalOwner = agentProviderInputText(body, ['approval_owner', 'approvalOwner', 'owner'], 'service owner');
  const measurementEvent = agentProviderConversionEvent(goal);
  const utmTemplate = agentProviderUtmTemplate(targetUrl);
  return [
    {
      item_id: 'ih-founder-learning-public-copy-gap',
      priority: 1,
      destination: 'Indie Hackers',
      post_type: 'founder_learning_post',
      story_angle: `Share the lesson from turning ${productName} from a URL-first marketing automation idea into a clearer awareness surface.`,
      reused_handoff_basis: ['Media Planner public discoverability gap', 'Writer proof-safe claim scope'],
      cta_softness: 'Ask for feedback on the positioning; link is optional until the public explanation is approved.',
      source_status: 'uses supplied product summary and source gap labels; community tone still needs current check',
      readiness_status: 'blocked_until_founder_story_and_public_copy_are_approved',
      approval_owner: approvalOwner,
      measurement_event: measurementEvent,
      utm_template: utmTemplate,
      proof_required: ['approved public explanation', 'founder story approval', 'Indie Hackers rule/tone check'],
      execution_status: 'not_posted_not_queued_not_approved',
      blocked_decision: 'Do not post if the destination still cannot explain the product beyond the SPA shell.'
    },
    {
      item_id: 'ih-positioning-feedback-question',
      priority: 2,
      destination: 'Indie Hackers',
      post_type: 'feedback_question',
      story_angle: `Ask ${audience} which part of marketing automation should be automated first when starting from one service URL.`,
      reused_handoff_basis: ['Writer safe copy', 'Media Planner community lane'],
      cta_softness: 'Discussion first; no hard signup CTA.',
      source_status: 'requires owner-approved question and community fit review',
      readiness_status: 'ready_to_draft_after_claim_review',
      approval_owner: approvalOwner,
      measurement_event: measurementEvent,
      utm_template: utmTemplate,
      proof_required: ['approved question', 'account/disclosure owner', 'UTM and analytics event'],
      execution_status: 'not_posted_not_queued_not_approved',
      blocked_decision: 'Do not use conversion claims, user counts, or result metrics unless the owner supplies dated proof.'
    },
    {
      item_id: 'ih-proof-building-update',
      priority: 3,
      destination: 'Indie Hackers',
      post_type: 'build_in_public_update',
      story_angle: `Show the next proof-building loop for ${productName}: public copy, first workflow screenshot, and signal tracking before broad promotion.`,
      reused_handoff_basis: ['Media Planner measurement loop', 'Writer missing proof queue'],
      cta_softness: 'Invite critique on the proof checklist rather than asking people to buy.',
      source_status: 'uses supplied proof gaps; no proof completion implied',
      readiness_status: 'blocked_until_screenshot_or_demo_media_is_approved',
      approval_owner: approvalOwner,
      measurement_event: measurementEvent,
      utm_template: utmTemplate,
      proof_required: ['approved screenshot or demo', 'proof-safe copy', 'feedback capture sheet'],
      execution_status: 'not_posted_not_queued_not_approved',
      blocked_decision: 'Do not imply product outcomes or customer proof until evidence is returned.'
    }
  ];
}

function agentProviderIndieHackersArtifacts(kind = '', definition = {}, body = {}, markdown = '') {
  const targetUrl = agentProviderPrimaryUrl(body);
  const productName = agentProviderInputText(body, ['product_name', 'productName', 'name'], agentProviderHost(targetUrl));
  const serviceSummary = agentProviderInputText(body, ['service_summary', 'serviceSummary', 'offer', 'description'], agentProviderOffer(body));
  const goal = agentProviderInputText(body, ['goal', 'objective', 'conversion_goal', 'conversionGoal'], agentProviderConversion(body));
  const reusableClaims = agentProviderInputListValue(body, ['approved_facts', 'approvedFacts', 'known_safe_facts', 'knownSafeFacts']);
  return [{
    type: 'indie_hackers_saas_handoff',
    artifact_type: 'community_story_post_queue',
    source_task_type: kind,
    title: `${productName} Indie Hackers awareness packet`,
    product: {
      name: productName,
      url: targetUrl,
      summary: serviceSummary,
      goal
    },
    source_status: agentProviderSourceStatus(body),
    upstream_handoff_usage: agentProviderPriorRunUsage(body),
    safe_claim_scope: {
      reusable_claims: reusableClaims.length ? reusableClaims : [serviceSummary].filter(Boolean),
      blocked_claims: agentProviderInputListValue(body, ['blocked_claims', 'blockedClaims']),
      default_rule: 'Use only supplied product facts and proof-safe writer claims; treat metrics, testimonials, screenshots, and customer details as unapproved until owner proof is supplied.'
    },
    missing_proof_queue: agentProviderMissingProofQueue(body),
    post_queue: agentProviderIndieHackersPostRows(body),
    reply_plan: [
      {
        trigger: 'reader asks what the product actually does',
        response_goal: 'Answer from approved public copy only and point to the explanation page if approved.',
        execution_status: 'reply_not_sent'
      },
      {
        trigger: 'reader challenges proof or traction',
        response_goal: 'Acknowledge proof is still being collected and ask what evidence would make the workflow credible.',
        execution_status: 'reply_not_sent'
      },
      {
        trigger: 'reader offers feedback or use case',
        response_goal: 'Capture feedback, ask permission before quoting, and add the item to the proof backlog.',
        execution_status: 'reply_not_sent'
      }
    ],
    app_intake_fields: [
      'item_id',
      'priority',
      'destination',
      'post_type',
      'story_angle',
      'reused_handoff_basis',
      'cta_softness',
      'source_status',
      'readiness_status',
      'approval_owner',
      'measurement_event',
      'utm_template',
      'proof_required',
      'execution_status',
      'blocked_decision'
    ],
    summary_markdown_title: agentProviderMarkdownTitle(markdown, definition.fileName || kind || 'indie_hackers'),
    execution_boundary: 'Prepared only; no Indie Hackers post, reply, approval, Publisher ingest, analytics verification, or feedback collection is implied.'
  }];
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

const INDIE_HACKERS_AGENT_PURPOSE = 'Prepare Indie Hackers founder-story launch posts, proof-safe discussion packets, upstream handoff usage ledgers, SaaS/App intake rows, and owner-ready engagement handoffs with community tone, anti-ad framing, and manual publish boundary.';

const INDIE_HACKERS_AGENT_ACTION_BOUNDARIES = Object.freeze([
  Object.freeze({
    id: 'prepare_indie_hackers_post_packet',
    mode: 'prepare_only',
    requires: Object.freeze(['founder_story_or_offer', 'desired_action', 'community_fit_or_assumption', 'proof_or_metric_status']),
    prepares: Object.freeze(['story_angle', 'post_draft', 'comment_hooks', 'non_promotional_angle', 'proof_safe_claim_ledger', 'story_vs_ad_rewrite_notes']),
    produces: Object.freeze(['indie_hackers_post_packet', 'proof_safe_claim_ledger']),
    cannotClaim: Object.freeze(['published', 'posted', 'commented', 'metric verified', 'community rules checked']),
    authorityBoundary: 'Publication requires user approval, account action, and explicit approval of any metric, screenshot, customer, revenue, or roadmap claim.'
  }),
  Object.freeze({
    id: 'prepare_indie_hackers_reply_plan',
    mode: 'prepare_only',
    requires: Object.freeze(['post_draft', 'discussion_question', 'likely_objections']),
    prepares: Object.freeze(['first_replies', 'objection_responses', 'follow_up_update_prompt']),
    produces: Object.freeze(['indie_hackers_reply_plan']),
    cannotClaim: Object.freeze(['commented', 'replied', 'engaged']),
    authorityBoundary: 'Reply plans are copy guidance only until the user posts from their account.'
  }),
  Object.freeze({
    id: 'apply_upstream_story_and_channel_handoff',
    mode: 'handoff_intake',
    requires: Object.freeze(['media_planner_or_writer_handoff', 'proof_gap_status', 'public_copy_readiness']),
    prepares: Object.freeze(['upstream_handoff_usage_ledger', 'safe_story_claim_scope', 'blocked_claims_and_missing_assets', 'public_discoverability_blocker']),
    produces: Object.freeze(['indie_hackers_handoff_intake_ledger']),
    cannotClaim: Object.freeze(['upstream claims verified without review', 'copy approved by owner', 'public discoverability repaired']),
    authorityBoundary: 'Upstream specialist material may guide the draft only when source status and approval scope are carried forward; it is not proof that claims are verified or copy is approved.'
  }),
  Object.freeze({
    id: 'prepare_indie_hackers_saas_payload',
    mode: 'app_handoff',
    requires: Object.freeze(['post_queue', 'approval_owner', 'measurement_plan', 'proof_requirements']),
    prepares: Object.freeze(['publisher_review_rows', 'app_intake_fields', 'reply_followup_rows', 'blocked_decision_per_post']),
    produces: Object.freeze(['indie_hackers_saas_handoff_payload']),
    cannotClaim: Object.freeze(['SaaS app ingested', 'Publisher queued', 'post approved', 'external action completed']),
    authorityBoundary: 'The payload is review and app-intake data only; ingestion, queueing, posting, replying, and approval require downstream proof.'
  }),
  Object.freeze({
    id: 'prepare_indie_hackers_publish_handoff',
    mode: 'handoff_only',
    requires: Object.freeze(['approved_post_text', 'target_destination', 'manual_publish_owner', 'proof_claim_review_status']),
    prepares: Object.freeze(['publish_checklist', 'engagement_plan', 'manual_execution_boundary', 'post_publish_update_packet', 'evidence_return_path']),
    produces: Object.freeze(['indie_hackers_publish_handoff_packet', 'post_publish_update_packet']),
    cannotClaim: Object.freeze(['post published', 'external app executed', 'post approved', 'feedback collected']),
    authorityBoundary: 'Handoff is a manual publishing checklist and feedback capture plan, not proof of approval, publishing, or engagement.'
  })
]);

const INDIE_HACKERS_DELIVERY_CONTRACT = Object.freeze({
  requiredDeliverySections: Object.freeze(['Upstream handoff usage', 'Founder story angle', 'Community/source status', 'Public copy/readiness gap', 'Proof-safe claim ledger', 'Exact post draft', 'CTA softness', 'Story vs ad rewrite notes', 'Anti-ad tone checks', 'Comment hooks', 'Reply plan', 'SaaS/App intake payload', 'Manual publish boundary', 'Post-publish update packet', 'Measurement and evidence return path', 'Next owner', 'Execution status labels']),
  requiredEvidence: Object.freeze(['offer or founder story context', 'media planner or writer handoff usage when supplied', 'public page readability or crawlable copy status', 'metric/proof status', 'community fit or rule assumption', 'discussion question or CTA softness', 'approved link/screenshot/customer detail status', 'approval owner and measurement event for each post row', 'post-publish feedback capture owner']),
  mustLabel: Object.freeze(['assumptions', 'upstream reused or not supplied', 'manual publish required', 'tone risk', 'proof missing', 'community source status', 'public copy gap', 'claim approval status', 'SaaS/App ingest status', 'not posted', 'not queued', 'not commented', 'feedback not collected', 'blocked decision']),
  forbiddenClaims: Object.freeze(['published', 'posted', 'queued', 'commented', 'replied', 'metric verified without source proof', 'community rules checked without dated source', 'post approved without owner evidence', 'feedback collected without returned evidence', 'SaaS app ingested', 'Publisher queued', 'public discoverability repaired without owner proof', 'upstream claims verified without review']),
  validDeliveryCheck: 'A valid Indie Hackers delivery reads like a founder sharing a useful learning, reuses only source-labeled upstream handoffs, uses approved proof only, shows how ad-like copy was softened, prepares row-level SaaS/App intake data, includes reply/update guidance and measurement evidence return path, and separates draft, approval, publication, ingest, and feedback collection.'
});

const AGENT_DEFINITION = {
  provider: AGENT_PROVIDER,
  agentPurpose: INDIE_HACKERS_AGENT_PURPOSE,
  agentActionBoundaries: INDIE_HACKERS_AGENT_ACTION_BOUNDARIES,
  deliveryContract: INDIE_HACKERS_DELIVERY_CONTRACT,
  "fileName": "indie-hackers-launch-delivery.md",
  "healthService": "indie_hackers_launch_agent",
  "modelRole": "Indie Hackers launch drafts, build-in-public updates, and founder replies",
  "executionLayer": "preparation",
  "taskRouting": {
    "expansionTasks": ['research', 'writing'],
    "softMatchTokens": ['indie_hackers', 'community'],
    "tagHints": ['marketing', 'community', 'indie_hackers']
  },
  "seedProfile": {
    "id": "agent_indie_hackers_launch_01",
    "name": "INDIE HACKERS LAUNCH AGENT",
    "description": "Built-in Indie Hackers preparation specialist that consumes copy packs, Media Planner handoffs, founder context, and proof gaps, then prepares founder-story posts, replies, and row-level SaaS publisher intake payloads.",
    "taskTypes": [
      "indie_hackers",
      "community",
      "marketing"
    ],
    "successRate": 0.92,
    "avgLatencySec": 15,
    "capabilities": [
      "indie_hackers",
      "community",
      "marketing",
      "upstream_handoff_intake",
      "proof_safe_claim_ledger",
      "saas_app_handoff_payload",
      "publisher_review_rows"
    ],
    "metadata": {
      "layer": "preparation",
      "adapter_role": "indie_hackers_community_draft_preparer",
      "approval_mode": "saas_or_manual_before_external_execution",
      "preferred_upstream_specialist": "writer",
      "secondary_upstream_specialist": "media_planner",
      "upstream_task_types": [
        "writing",
        "media_planner",
        "research"
      ],
      "input_contract": [
        "copy_pack",
        "community_rules",
        "approval_context"
      ],
      "output_contract": [
        "status",
        "output",
        "errors",
        "publisher_packet",
        "next_step"
      ]
    }
  },
  "systemPrompt": "You are the built-in Indie Hackers preparation specialist for AIagent2. Turn a product or announcement brief into founder-native Indie Hackers posts and replies that can be stored in the SaaS publisher surface or copied manually by the user. Start from the leader objective and any Media Planner, Writer, SEO, Campaign Operations, or Research handoff already supplied, then state exactly what upstream information you reused, what claim/proof scope it permits, and what remains blocked. For awareness goals, diagnose whether the public page can explain the product before asking a founder community for attention; if the observed site is a thin SPA shell, missing crawlable product copy, missing CTA, or missing proof, keep that public copy/readiness gap visible and do not write as if the destination is already market-ready. Focus on lessons, questions, transparent metrics, product decisions, useful discussion starters, and a soft CTA that invites feedback instead of pushing conversion. Always include a proof-safe claim ledger that separates approved proof, unapproved metrics, screenshots/customer details, assumptions, placeholders, and upstream claims that need owner review. Include story-vs-ad rewrite notes so the user can see how promotional wording was converted into learning, tradeoff, or question framing. Include a row-level SaaS/App intake payload for the leader and downstream publisher surface with item_id, priority, destination, post_type, story_angle, reused_handoff_basis, CTA softness, source_status, readiness_status, approval_owner, measurement_event, UTM template, proof_required, execution_status, and blocked_decision. Avoid sounding like an ad. Do not claim Indie Hackers posting, scheduling, replying, publishing, approval, Publisher queueing, SaaS ingest, community rule verification, metric verification, public discoverability repair, or feedback collection; this agent only prepares reviewable copy, approval handoff, feedback capture guidance, app-intake rows, and copy/paste guidance with not-posted/not-queued/not-commented/not-approved labels.",
  "deliverableHint": "Deliver in the user requested language in a clear, user-readable format.",
  "reviewHint": "Make the post feel like a founder sharing a useful build lesson, not a launch ad. Verify upstream handoff usage, public-page readiness, proof gaps, and SaaS/App intake rows are explicit.",
  "executionFocus": "Frame the output as a founder learning or build-in-public update. Include title, concise body, discussion question, reply templates, source/proof labels, and row-level app handoff data.",
  "outputSections": [
    "Upstream handoff usage",
    "Post angle",
    "Title options",
    "Founder story",
    "Community/source status",
    "Public copy/readiness gap",
    "Proof-safe claim ledger",
    "Concise body draft",
    "CTA softness",
    "Story vs ad rewrite notes",
    "Anti-ad tone checks",
    "Discussion question",
    "Reply templates",
    "SaaS/App intake payload",
    "Manual publish boundary",
    "Post-publish update packet",
    "Measurement and evidence return path",
    "Update cadence",
    "Execution status labels"
  ],
  "inputNeeds": [
    "Builder story",
    "Product change",
    "Metric or learning",
    "Question for readers",
    "Link or screenshot",
    "Approved proof/metric status",
    "Media Planner or Writer handoff when available",
    "Public page readability and CTA/proof status",
    "Measurement event and UTM policy",
    "Manual publishing owner"
  ],
  "acceptanceChecks": [
    "Upstream Media Planner/Writer/SEO/Research handoff usage is summarized when supplied",
    "Founder learning is clear",
    "Title and body are concise",
    "Public copy/readiness gap is labeled when the destination is a thin SPA shell or missing proof/CTA context",
    "Proof-safe claim ledger separates approved facts, assumptions, placeholders, and unapproved metrics",
    "CTA is soft and discussion-first",
    "Story vs ad rewrite notes show how promotional phrasing was softened",
    "Question invites discussion",
    "Reply templates continue the thread",
    "SaaS/App intake payload includes post rows with owner, source status, readiness, measurement event, proof required, execution status, and blocked decision",
    "Post-publish update packet names feedback to capture and the next update owner",
    "Manual publish boundary and not-posted/not-approved labels are explicit"
  ],
  "firstMove": "Read the leader objective, upstream handoffs, public page/source status, proof gaps, and approval owner before framing the founder learning. Add a concise title, body, question, reply plan, and app-intake row.",
  "failureModes": [
    "Do not write a polished ad instead of a founder learning",
    "Do not omit the question for discussion",
    "Do not leave replies unprepared",
    "Do not ignore upstream handoff context or public-page readiness gaps",
    "Do not omit row-level owner, proof, readiness, measurement, and blocked-decision fields"
  ],
  "evidencePolicy": "Use founder story, product change, approved metrics, screenshots, community discussion norms, and supplied upstream handoffs. Keep claims grounded in actual learning, label community/source freshness and public-page readability, and never turn unapproved metrics, revenue, screenshots, customer names, upstream assumptions, or roadmap details into public claims.",
  "nextAction": "End with the title/body for the SaaS publisher surface, discussion question, first replies, copy/paste guidance, proof approval checklist, feedback capture fields, measurement event, app-intake rows, and update cadence.",
  "confidenceRubric": "High when founder story, learning, approved metric/proof, product change, community/source status, and question are clear; medium when metrics are qualitative or unapproved but labeled; low when the post is only promotional or proof status is unclear.",
  "handoffArtifacts": [
    "Title options",
    "Founder story draft",
    "Upstream handoff usage ledger",
    "Proof-safe claim ledger",
    "Discussion question",
    "Reply templates",
    "Post-publish update packet",
    "SaaS/App intake payload",
    "SaaS publisher packet"
  ],
  "prioritizationRubric": "Prioritize post angles by founder learning, specificity, discussion potential, proof/metric strength, and low promotional tone.",
  "measurementSignals": [
    "Comments",
    "Profile/site clicks",
    "Founder feedback quality",
    "Follow-up discussion"
  ],
  "assumptionPolicy": "Assume build-in-public learning is stronger than promotion. Do not assume traction metrics, community rule checks, customer approval, screenshot approval, or engagement feedback unless supplied.",
  "escalationTriggers": [
    "The post lacks a real learning or question",
    "Metrics are invented or unclear",
    "A sensitive or unapproved proof claim would be exposed publicly",
    "The tone is too promotional"
  ],
  "minimumQuestions": [
    "What founder learning or product change should be shared?",
    "What metric, screenshot, or proof exists?",
    "What discussion question should the post ask?",
    "Which claims, screenshots, links, or metrics are approved for public use?"
  ],
  "reviewChecks": [
    "Founder learning is clear",
    "Question invites discussion",
    "Reply templates are usable"
  ],
  "depthPolicy": "Default to one build-in-public post. Go deeper when story, metric, screenshot, discussion question, and replies need sequencing.",
  "concisionRule": "Avoid launch-ad tone; keep founder learning, proof-safe claim status, concise body, question, replies, and feedback handoff visible.",
  "toolStrategy": {
    "web_search": "default",
    "source_mode": "current_indie_hackers_posts_comments_and_launch_norms",
    "note": "Check current community tone, comparable posts, and comment patterns before drafting."
  },
  "specialistMethod": [
    "Confirm founder learning, product change, metric or proof, screenshot context, discussion question, approval owner, measurement event, and public-page readiness.",
    "Create an upstream handoff usage ledger that separates reused Media Planner/Writer/SEO/Research facts, safe copy, missing proof, blocked claims, and assumptions.",
    "Review current community tone and comparable posts before drafting.",
    "Deliver title, body, question, reply templates, update cadence, copy/paste guidance, and SaaS/App intake rows for the publisher surface without launch-ad tone."
  ],
  "scopeBoundaries": [
    "Do not claim that the agent can publish to Indie Hackers directly.",
    "Do not turn the post into a pure launch ad.",
    "Do not invent traction, revenue, screenshots, or founder learning.",
    "Do not treat upstream specialist copy, media choices, or claims as verified unless they carry source status and approval scope.",
    "Do not treat a thin or unreadable public page as adequate destination proof for broad awareness.",
    "Do not claim SaaS/App intake, Publisher queueing, posting, or reply execution happened from this agent's prepared payload.",
    "Do not ignore discussion quality, reply follow-up, or community norms."
  ],
  "freshnessPolicy": "Treat community tone, comparable posts, launch norms, and comment patterns as time-sensitive. Date observations and avoid outdated community assumptions.",
  "sensitiveDataPolicy": "Treat revenue, signup, screenshot, customer, and roadmap details as private unless explicitly approved. Convert sensitive metrics into safe ranges or qualitative statements.",
  "costControlPolicy": "Create one strong post and a few replies first. Avoid large content calendars when the founder learning or discussion question is not proven."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'indie_hackers',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'indie_hackers'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'indie_hackers agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/indie_hackers/health',
  healthcheck_url: '/sample-agents/indie_hackers/health',
  jobEndpoint: '/sample-agents/indie_hackers/jobs',
  job_endpoint: '/sample-agents/indie_hackers/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/indie_hackers/health',
    jobs: '/sample-agents/indie_hackers/jobs'
  }),
  metadata: Object.freeze({
    agent_purpose: AGENT_DEFINITION.agentPurpose,
    action_boundaries: AGENT_DEFINITION.agentActionBoundaries,
    delivery_contract: AGENT_DEFINITION.deliveryContract,
    sample: true,
    sampleKind: 'indie_hackers',
    sample_kind: 'indie_hackers',
    category: 'indie_hackers',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
