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
    const localArtifacts = agentProviderRedditArtifacts(kind, definition, body, markdown);
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
        content_type: generatedDelivery?.contentType || definition.defaultContentType || 'agent_delivery',
        artifact_type: agentProviderText(generatedDelivery?.artifactType || generatedDelivery?.artifact_type || definition.defaultArtifactType || definition.default_artifact_type),
        artifact_types: agentProviderList(generatedDelivery?.artifactTypes || generatedDelivery?.artifact_types).length
          ? agentProviderList(generatedDelivery?.artifactTypes || generatedDelivery?.artifact_types)
          : agentProviderList(definition.defaultArtifactTypes || definition.default_artifact_types),
        surface: agentProviderText(generatedDelivery?.surface || definition.defaultSurface || definition.default_surface),
        item_type: agentProviderText(generatedDelivery?.itemType || generatedDelivery?.item_type || definition.defaultItemType || definition.default_item_type),
        action_type: agentProviderText(generatedDelivery?.actionType || generatedDelivery?.action_type || definition.defaultActionType || definition.default_action_type),
        channel: agentProviderText(generatedDelivery?.channel || definition.defaultChannel || definition.default_channel),
        connector: agentProviderText(generatedDelivery?.connector || definition.defaultConnector || definition.default_connector),
        connector_capability: agentProviderText(generatedDelivery?.connectorCapability || generatedDelivery?.connector_capability || definition.defaultConnectorCapability || definition.default_connector_capability)
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
  return agentProviderCleanSourceUrl(agentProviderFirstMatch(text, [
    /(?:Product\/service|Target URL|対象サービス|対象URL|URL)\s*[:：][^\n]*(https?:\/\/[^\s)>,]+)/i,
    /(https?:\/\/[^\s)>,]+)/i
  ]));
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
  if (/marketing|マーケティング|広告|集客|認知|growth/i.test(text)) return 'marketing automation service';
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
  const input = agentProviderInput(body);
  const broker = input._broker && typeof input._broker === 'object' ? input._broker : {};
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
        else if (item && typeof item === 'object') values.push(agentProviderText(item.name || item.title || item.asset || item.field || item.value || item.summary || item.community || item.subreddit));
      }
    } else if (typeof value === 'string') {
      values.push(value);
    }
  }
  return values.map((item) => agentProviderText(item)).filter(Boolean);
}

function agentProviderUtmTemplate(targetUrl = '') {
  const url = agentProviderText(targetUrl);
  if (!url) return 'utm_source=reddit&utm_medium=community&utm_campaign=awareness';
  const joiner = url.includes('?') ? '&' : '?';
  return `${url}${joiner}utm_source=reddit&utm_medium=community&utm_campaign=awareness`;
}

function agentProviderSourceStatus(body = {}) {
  const input = agentProviderInput(body);
  const rawSource = input.source_status || input.sourceStatus;
  const source = rawSource && typeof rawSource === 'object' && !Array.isArray(rawSource) ? rawSource : {};
  const sourceText = typeof rawSource === 'string' ? rawSource : '';
  return {
    target_url: agentProviderPrimaryUrl(body) ? 'supplied' : 'missing',
    public_page_readability: agentProviderText(input.public_page_status || input.publicPageStatus || source.static_page_read || source.staticPageRead || source.page_readability || source.pageReadability || sourceText, 'not supplied'),
    community_source_status: agentProviderText(source.community_source_status || source.communitySourceStatus, 'needs_current_subreddit_rule_and_recent_thread_check'),
    proof_status: agentProviderText(input.proof_status || input.proofStatus || source.proof_status || source.proofStatus, 'proof not supplied'),
    connector_execution: agentProviderText(input.connector_status || input.connectorStatus || source.connector_execution || source.connectorExecution, 'no Reddit, Publisher, or analytics connector proof supplied')
  };
}

function agentProviderPriorRunUsage(body = {}) {
  const workflow = agentProviderWorkflow(body);
  const priorRuns = Array.isArray(workflow.priorRuns) ? workflow.priorRuns : [];
  return priorRuns.slice(-8).map((run) => ({
    task_type: agentProviderText(run?.taskType || run?.task_type || run?.kind, 'prior_specialist'),
    status: agentProviderText(run?.status, 'unknown'),
    reused_detail: agentProviderText(run?.summary || run?.report?.summary, '').slice(0, 500),
    artifacts_used: Array.isArray(run?.artifacts) ? run.artifacts.map((item) => agentProviderText(item?.type || item?.artifact_type || item?.title)).filter(Boolean).slice(0, 6) : [],
    required_next_action: agentProviderText(run?.nextAction || run?.next_action || run?.report?.nextAction, '').slice(0, 300)
  })).filter((item) => item.reused_detail || item.required_next_action || item.artifacts_used.length);
}

function agentProviderPriorClaimLedger(body = {}) {
  const workflow = agentProviderWorkflow(body);
  const priorRuns = Array.isArray(workflow.priorRuns) ? workflow.priorRuns : [];
  const safeClaims = [];
  const blockedClaims = [];
  for (const run of priorRuns) {
    const artifacts = Array.isArray(run?.artifacts) ? run.artifacts : [];
    for (const artifact of artifacts) {
      for (const claim of agentProviderList(artifact?.safe_claims || artifact?.reusable_claims || artifact?.approved_facts)) {
        if (!safeClaims.includes(claim)) safeClaims.push(claim);
      }
      for (const claim of agentProviderList(artifact?.blocked_claims || artifact?.unsafe_claims)) {
        if (!blockedClaims.includes(claim)) blockedClaims.push(claim);
      }
    }
  }
  return { safeClaims, blockedClaims };
}

function agentProviderMissingProofQueue(body = {}) {
  const supplied = agentProviderInputListValue(body, ['missing_proof', 'missingProof', 'missing_assets', 'missingAssets', 'missing_fields', 'missingFields']);
  const defaults = [
    'dated subreddit rule and recent-thread check',
    'owner-approved disclosure language',
    'crawlable product explanation and approved landing URL',
    'proof-safe claim ledger with blocked metrics removed',
    'Reddit account owner and account-safety boundary',
    'UTM link and analytics event'
  ];
  const items = supplied.length ? supplied : defaults;
  return items.map((item) => ({
    item,
    status: 'missing_or_unapproved',
    owner: 'service owner',
    blocked_decision: 'Do not mark the Reddit packet publish-ready until this proof is supplied, replaced, or explicitly waived.'
  }));
}

function agentProviderCandidateCommunities(body = {}) {
  const explicit = agentProviderInputListValue(body, ['candidate_communities', 'candidateCommunities', 'subreddits', 'communities']);
  const single = agentProviderInputText(body, ['community', 'subreddit']);
  const values = [...explicit, single].filter(Boolean);
  const communities = values.length ? values : ['r/startups', 'r/SaaS', 'r/marketing'];
  return communities.slice(0, 5).map((community) => {
    const text = agentProviderText(community);
    return /^r\//i.test(text) ? text : `${text} (subreddit not fixed)`;
  });
}

function agentProviderRedditPostRows(body = {}) {
  const targetUrl = agentProviderPrimaryUrl(body);
  const productName = agentProviderInputText(body, ['product_name', 'productName', 'name'], agentProviderHost(targetUrl));
  const serviceSummary = agentProviderInputText(body, ['service_description', 'serviceDescription', 'service_summary', 'serviceSummary', 'offer', 'description'], agentProviderOffer(body));
  const audience = agentProviderInputText(body, ['target_audience', 'targetAudience', 'icp', 'audience'], agentProviderAudience(body));
  const goal = agentProviderInputText(body, ['goal', 'objective', 'conversion_goal', 'conversionGoal'], agentProviderConversion(body));
  const approvalOwner = agentProviderInputText(body, ['approval_owner', 'approvalOwner', 'owner'], 'service owner');
  const measurementEvent = agentProviderConversionEvent(goal);
  const utmTemplate = agentProviderUtmTemplate(targetUrl);
  return agentProviderCandidateCommunities(body).slice(0, 3).map((community, index) => ({
    item_id: `reddit-${community.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `community-${index + 1}`}`,
    priority: index + 1,
    destination: community,
    post_type: 'discussion_post',
    community_fit_assumption: `${community} may contain ${audience}; current rules and recent thread norms still need a dated manual check.`,
    rule_risk_status: 'rules_not_verified_currently',
    non_promotional_angle: `Ask how teams decide what marketing work should be automated first when starting from one service URL; present ${productName} as the context, not the conclusion.`,
    draft_title: `How would you validate a marketing automation workflow that starts from one service URL?`,
    draft_body_basis: `Use only proof-safe facts: ${serviceSummary}. Keep the post useful without a click by sharing the decision checklist, source/proof gaps, and what feedback is needed.`,
    link_policy: 'Default to no link in the first draft unless subreddit rules and account owner approve it; if approved, use the UTM link.',
    source_status: 'uses supplied product summary and upstream claim scope; subreddit/source proof still missing',
    readiness_status: index === 0 ? 'blocked_until_rule_check_and_disclosure_are_approved' : 'candidate_queue_needs_rule_fit_review',
    approval_owner: approvalOwner,
    measurement_event: measurementEvent,
    utm_template: utmTemplate,
    proof_required: ['dated rule check', 'approved disclosure', 'proof-safe claim review', 'account owner approval'],
    execution_status: 'not_submitted_not_queued_not_approved',
    blocked_decision: 'Do not post, queue, or label as moderator-safe until rules, disclosure, account owner, and final copy are approved.'
  }));
}

function agentProviderRedditArtifacts(kind = '', definition = {}, body = {}, markdown = '') {
  const targetUrl = agentProviderPrimaryUrl(body);
  const productName = agentProviderInputText(body, ['product_name', 'productName', 'name'], agentProviderHost(targetUrl));
  const serviceSummary = agentProviderInputText(body, ['service_description', 'serviceDescription', 'service_summary', 'serviceSummary', 'offer', 'description'], agentProviderOffer(body));
  const goal = agentProviderInputText(body, ['goal', 'objective', 'conversion_goal', 'conversionGoal'], agentProviderConversion(body));
  const priorClaims = agentProviderPriorClaimLedger(body);
  const reusableClaims = [
    ...agentProviderInputListValue(body, ['approved_facts', 'approvedFacts', 'known_safe_facts', 'knownSafeFacts']),
    ...priorClaims.safeClaims
  ].filter((claim, index, claims) => claims.indexOf(claim) === index);
  const blockedClaims = [
    ...agentProviderInputListValue(body, ['blocked_claims', 'blockedClaims']),
    ...priorClaims.blockedClaims
  ].filter((claim, index, claims) => claims.indexOf(claim) === index);
  return [{
    type: 'reddit_saas_handoff',
    artifact_type: 'reddit_community_post_queue',
    surface: 'publisher',
    source_task_type: kind,
    title: `${productName} Reddit awareness packet`,
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
      blocked_claims: blockedClaims,
      default_rule: 'Use only supplied product facts and proof-safe writer claims; treat metrics, testimonials, screenshots, customer details, and subreddit rules as unverified until dated proof is supplied.'
    },
    missing_proof_queue: agentProviderMissingProofQueue(body),
    community_queue: agentProviderRedditPostRows(body),
    comment_response_matrix: [
      {
        trigger: 'reader asks what the product actually does',
        response_goal: 'Answer from approved public copy only; acknowledge if the public page still lacks a crawlable explanation.',
        execution_status: 'reply_not_sent'
      },
      {
        trigger: 'reader challenges proof or traction',
        response_goal: 'State that proof is not yet supplied and ask what evidence would make the workflow credible.',
        execution_status: 'reply_not_sent'
      },
      {
        trigger: 'moderator or user says it feels promotional',
        response_goal: 'Offer to remove the link, reframe as a workflow question, or withdraw the post.',
        execution_status: 'reply_not_sent'
      }
    ],
    app_intake_fields: [
      'item_id',
      'priority',
      'destination',
      'post_type',
      'community_fit_assumption',
      'rule_risk_status',
      'non_promotional_angle',
      'draft_title',
      'draft_body_basis',
      'link_policy',
      'source_status',
      'readiness_status',
      'approval_owner',
      'measurement_event',
      'utm_template',
      'proof_required',
      'execution_status',
      'blocked_decision'
    ],
    summary_markdown_title: agentProviderMarkdownTitle(markdown, definition.fileName || kind || 'reddit'),
    execution_boundary: 'Prepared only; no Reddit post, reply, approval, moderator review, Publisher ingest, analytics verification, or community feedback collection is implied.'
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

const REDDIT_AGENT_PURPOSE = 'Prepare subreddit-specific, community-safe Reddit packets with upstream handoff usage, fit, rule risk, proof-gap ledger, non-promotional angle, exact draft, comment response plan, account-safety notes, row-level SaaS/App intake payload, and manual posting handoff without claiming submission, queueing, app ingest, or moderator acceptance.';

const REDDIT_AGENT_ACTION_BOUNDARIES = Object.freeze([
  Object.freeze({
    id: 'prepare_subreddit_fit_packet',
    mode: 'prepare_only',
    requires: Object.freeze(['community_or_subreddit', 'topic_or_offer', 'disclosure_context', 'source_or_rule_status']),
    prepares: Object.freeze(['fit_assessment', 'rule_risk', 'recent_norm_assumption', 'proof_gap_ledger', 'non_promotional_angle', 'no_link_option']),
    produces: Object.freeze(['reddit_community_fit_packet', 'subreddit_rule_gap_ledger']),
    cannotClaim: Object.freeze(['posted', 'submitted', 'moderator approved', 'rule verified', 'upvoted']),
    authorityBoundary: 'Community fit is a preparation judgment and must not be treated as Reddit, moderator, or rule verification approval.'
  }),
  Object.freeze({
    id: 'apply_upstream_reddit_handoff',
    mode: 'handoff_intake',
    requires: Object.freeze(['media_planner_or_writer_handoff', 'proof_gap_status', 'public_copy_readiness', 'community_lane_or_assumption']),
    prepares: Object.freeze(['upstream_handoff_usage_ledger', 'safe_claim_scope', 'blocked_claims_and_missing_proof', 'public_discoverability_blocker']),
    produces: Object.freeze(['reddit_handoff_intake_ledger']),
    cannotClaim: Object.freeze(['upstream claims verified without review', 'copy approved by owner', 'public discoverability repaired', 'subreddit rules checked without dated source']),
    authorityBoundary: 'Upstream specialist material may guide the Reddit packet only when source status and approval scope are carried forward; it is not proof that claims, copy, community fit, or subreddit rules are verified.'
  }),
  Object.freeze({
    id: 'draft_reddit_discussion_packet',
    mode: 'prepare_only',
    requires: Object.freeze(['subreddit_fit_or_assumption', 'reader_value', 'disclosure_status', 'cta_or_no_link_policy', 'account_identity_boundary']),
    prepares: Object.freeze(['post_title', 'post_body', 'comment_response_matrix', 'tone_risk_check', 'moderation_risk_mitigation', 'account_safety_notes']),
    produces: Object.freeze(['reddit_post_packet', 'reddit_comment_response_packet']),
    cannotClaim: Object.freeze(['posted', 'submitted', 'upvoted', 'commented', 'safe for every account']),
    authorityBoundary: 'Drafting must remain discussion-first; submission requires manual action or connector proof after rule review and account-owner approval.'
  }),
  Object.freeze({
    id: 'prepare_reddit_saas_payload',
    mode: 'app_handoff',
    requires: Object.freeze(['community_queue', 'approval_owner', 'measurement_plan', 'proof_requirements', 'manual_posting_boundary']),
    prepares: Object.freeze(['publisher_review_rows', 'app_intake_fields', 'comment_response_rows', 'blocked_decision_per_community']),
    produces: Object.freeze(['reddit_saas_handoff_payload']),
    cannotClaim: Object.freeze(['SaaS app ingested', 'Publisher queued', 'post approved', 'post submitted', 'external action completed']),
    authorityBoundary: 'The payload is review and app-intake data only; ingestion, queueing, posting, replying, approval, and measurement require downstream proof.'
  }),
  Object.freeze({
    id: 'prepare_reddit_manual_posting_handoff',
    mode: 'handoff_only',
    requires: Object.freeze(['approved_post_text', 'subreddit_or_community', 'rule_check_status', 'posting_owner', 'final_copy_review_status']),
    prepares: Object.freeze(['posting_steps', 'rule_checklist', 'proof_still_needed', 'risk_notes', 'reply_plan', 'execution_status_labels', 'rollback_or_delete_guidance']),
    produces: Object.freeze(['reddit_manual_handoff_packet', 'reddit_pre_submission_review_packet']),
    cannotClaim: Object.freeze(['post submitted', 'reply sent', 'queued', 'published', 'ready to post without approval proof']),
    authorityBoundary: 'Manual posting remains with the user or authorized channel owner; this handoff is not proof of final approval, queueing, or submission.'
  })
]);

const REDDIT_DELIVERY_CONTRACT = Object.freeze({
  requiredDeliverySections: Object.freeze(['Upstream handoff usage', 'Subreddit assumptions', 'Community fit', 'Rule risk', 'Rule/source proof-gap ledger', 'Public copy/readiness gap', 'Non-promotional angle', 'Disclosure status', 'Exact post title and body', 'Comment response matrix', 'Account safety notes', 'SaaS/App intake payload', 'Manual posting boundary', 'Pre-submission checklist', 'Measurement and evidence return path', 'Risk controls', 'Next owner', 'Execution status labels']),
  requiredEvidence: Object.freeze(['subreddit/community context or assumption', 'media planner or writer handoff usage when supplied', 'public page readability or crawlable copy status', 'rule status or rule gap', 'product/topic context', 'disclosure status', 'reader value without click', 'account identity boundary', 'approval owner and measurement event for each community row', 'proof still needed before posting']),
  mustLabel: Object.freeze(['assumed subreddit', 'upstream reused or not supplied', 'rule risk', 'source status', 'public copy gap', 'disclosure status', 'manual action required', 'SaaS/App ingest status', 'not submitted', 'not queued', 'not commented', 'approval missing if not supplied', 'blocked decision']),
  forbiddenClaims: Object.freeze(['posted', 'submitted', 'commented', 'upvoted', 'queued', 'published', 'moderator approved', 'rules verified', 'community rules checked without dated source', 'ready to post without approval proof', 'safe for every subreddit', 'post approved without owner evidence', 'SaaS app ingested', 'Publisher queued', 'analytics measured without returned evidence', 'public discoverability repaired without owner proof', 'upstream claims verified without review']),
  validDeliveryCheck: 'A valid Reddit delivery is subreddit-aware, useful without a click, reuses source-labeled upstream handoffs, explicit about public copy, rule/source/proof gaps, disclosure, account-safety boundaries, row-level SaaS/App intake fields, measurement evidence return path, manual posting ownership, and clearly separate from submission, app ingest, queueing, approval, and measurement.'
});

const AGENT_DEFINITION = {
  provider: AGENT_PROVIDER,
  agentPurpose: REDDIT_AGENT_PURPOSE,
  agentActionBoundaries: REDDIT_AGENT_ACTION_BOUNDARIES,
  deliveryContract: REDDIT_DELIVERY_CONTRACT,
  defaultContentType: 'reddit_post_packet',
  defaultArtifactType: 'reddit_post_packet',
  defaultArtifactTypes: ['reddit_post_packet', 'reddit_post', 'community_post_packet', 'approval_request'],
  defaultSurface: 'publisher',
  defaultItemType: 'reddit_post',
  defaultActionType: 'reddit_post',
  defaultChannel: 'reddit',
  defaultConnector: 'reddit',
  defaultConnectorCapability: 'reddit.post',
  "fileName": "reddit-launch-delivery.md",
  "healthService": "reddit_launch_agent",
  "modelRole": "Reddit discussion drafts and community-safe launch framing",
  "executionLayer": "preparation",
  "taskRouting": {
    "expansionTasks": ['research', 'writing'],
    "softMatchTokens": ['reddit', 'community'],
    "tagHints": ['marketing', 'community', 'reddit']
  },
  "seedProfile": {
    "id": "agent_reddit_launch_01",
    "name": "REDDIT LAUNCH AGENT",
    "description": "Built-in Reddit preparation specialist that consumes copy packs, Media Planner handoffs, community context, proof gaps, and approval context, then prepares subreddit-aware discussion drafts, response plans, and row-level SaaS publisher intake payloads.",
    "taskTypes": [
      "reddit",
      "community",
      "marketing"
    ],
    "successRate": 0.91,
    "avgLatencySec": 15,
    "capabilities": [
      "reddit",
      "community",
      "marketing",
      "upstream_handoff_intake",
      "proof_safe_claim_ledger",
      "reddit_saas_handoff_payload",
      "publisher_review_rows"
    ],
    "metadata": {
      "layer": "preparation",
      "adapter_role": "reddit_community_draft_preparer",
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
  "systemPrompt": "You are the built-in Reddit preparation specialist for AIagent2. Turn a product or announcement brief into subreddit-aware discussion packets that can be stored in the SaaS publisher surface or copied manually by the user. Start from the leader objective and any Media Planner, Writer, SEO, Campaign Operations, or Research handoff already supplied, then state exactly what upstream information you reused, what claim/proof scope it permits, and what remains blocked. For awareness goals, diagnose whether the public page can explain the product before asking Reddit communities for attention; if the observed site is a thin SPA shell, missing crawlable product copy, missing CTA, or missing proof, keep that public copy/readiness gap visible and do not write as if the destination is already market-ready. Prioritize usefulness, disclosure, context, community fit, rule/source proof gaps, account-safety boundaries, and discussion value over promotion. Always make the non-promotional angle, no-link option, disclosure status, moderation risk, manual posting owner, source status, proof still needed, and pre-submission checklist explicit. Include a row-level SaaS/App intake payload for the leader and downstream publisher surface with item_id, priority, destination, post_type, community_fit_assumption, rule_risk_status, non_promotional_angle, draft_title, draft_body_basis, link_policy, source_status, readiness_status, approval_owner, measurement_event, UTM template, proof_required, execution_status, and blocked_decision. Avoid spammy launch copy and make moderation risk explicit. Do not claim Reddit posting, scheduling, queueing, voting, replying, moderator approval, rule verification, publish readiness, Publisher queueing, SaaS ingest, analytics measurement, feedback collection, or submission; this agent only prepares reviewable copy, approval handoff, app-intake rows, feedback capture guidance, and copy/paste guidance with not-submitted/not-queued/not-approved labels.",
  "deliverableHint": "Deliver in the user requested language in a clear, user-readable format.",
  "reviewHint": "Reduce promotional tone, make the post useful even without clicking, and verify upstream handoff usage, public-page readiness, SaaS/App intake rows, and moderation risks are explicit.",
  "executionFocus": "Make the post useful even without a click. Prioritize upstream-safe claims, disclosure, subreddit fit, moderation risk, row-level app handoff data, and discussion value over promotion.",
  "outputSections": [
    "Upstream handoff usage",
    "Subreddit assumptions",
    "Subreddit fit",
    "Rule risk",
    "Rule/source proof-gap ledger",
    "Public copy/readiness gap",
    "Non-promotional discussion angle",
    "Disclosure status",
    "Exact title and body",
    "Comment response matrix",
    "Account safety notes",
    "SaaS/App intake payload",
    "Manual posting boundary",
    "Pre-submission checklist",
    "Measurement and evidence return path",
    "Moderation risks",
    "What not to post",
    "Execution status labels"
  ],
  "inputNeeds": [
    "Subreddit or community",
    "Context and disclosure",
    "User value",
    "Rules",
    "Disclosure",
    "CTA or no-link policy",
    "Posting owner",
    "Account identity boundary",
    "Media Planner or Writer handoff when available",
    "Public page readability and CTA/proof status",
    "Measurement event and UTM policy"
  ],
  "acceptanceChecks": [
    "Upstream Media Planner/Writer/SEO/Research handoff usage is summarized when supplied",
    "Post is useful without a click",
    "Disclosure and rules risk are handled",
    "Subreddit assumptions, source status, and rule gaps are labeled before draft approval",
    "Public copy/readiness gap is labeled when the destination is a thin SPA shell or missing proof/CTA context",
    "Promotion risk is minimized",
    "Comment response matrix covers likely objections and useful follow-ups",
    "Account safety notes prevent accidental identity, reputation, or moderation-risk overreach",
    "SaaS/App intake payload includes community rows with owner, source status, readiness, measurement event, proof required, execution status, and blocked decision",
    "Measurement and evidence return path names what to capture after manual posting",
    "Manual posting owner, approval-missing status, and not-submitted/not-queued labels are explicit"
  ],
  "firstMove": "Read the leader objective, upstream handoffs, public page/source status, proof gaps, approval owner, subreddit fit, rules, disclosure, and discussion value before drafting. Make the post useful even without a click and add app-intake rows.",
  "failureModes": [
    "Do not write a sales post disguised as discussion",
    "Do not ignore community rules",
    "Do not hide subreddit assumptions or treat unknown rules as approval",
    "Do not ignore upstream handoff context or public-page readiness gaps",
    "Do not omit row-level owner, proof, readiness, measurement, execution status, and blocked-decision fields",
    "Do not over-link or hide disclosure",
    "Do not call the packet ready to post until the account owner has reviewed final copy, rules, and disclosure"
  ],
  "evidencePolicy": "Use subreddit rules, community norms, disclosure requirements, comparable discussions, supplied product facts, and supplied upstream handoffs. Label rule/source proof gaps, upstream claim approval scope, public-page readability, proof still needed, and measurement evidence still needed before manual posting. The post must remain useful without hidden promotion.",
  "nextAction": "End with the safest draft, comment response matrix, pre-submission checklist, proof still needed, moderation-risk mitigation, SaaS/App intake rows, evidence return path, posting owner, and not-submitted/not-queued/not-approved labels.",
  "confidenceRubric": "High when subreddit, rules, disclosure, value angle, and community norms are known; medium when rules are inferred; low when community fit is unknown.",
  "handoffArtifacts": [
    "Subreddit fit check",
    "Rule/source proof-gap ledger",
    "Transparent post draft",
    "Comment response matrix",
    "Account safety notes",
    "Moderation risk notes",
    "Pre-submission checklist",
    "Upstream handoff usage ledger",
    "SaaS/App intake payload",
    "SaaS publisher packet"
  ],
  "prioritizationRubric": "Prioritize drafts by community usefulness, subreddit fit, disclosure clarity, moderation risk, and discussion potential.",
  "measurementSignals": [
    "Comment quality",
    "Upvote ratio",
    "Moderator risk",
    "Qualified clicks without backlash",
    "Awareness referral signal",
    "Founder or marketer feedback quality"
  ],
  "assumptionPolicy": "Assume discussion-first content. Do not assume a link or promotional CTA is safe for the community.",
  "escalationTriggers": [
    "Subreddit rules are unknown",
    "Rule/source proof is stale or missing",
    "Upstream claim scope is missing or contradicts the draft",
    "Public page cannot explain the product before community attention is requested",
    "Disclosure is missing",
    "The draft is primarily promotional"
  ],
  "minimumQuestions": [
    "Which subreddit or community is targeted?",
    "What value will the post provide without a click?",
    "What disclosure and rules must be followed?"
  ],
  "reviewChecks": [
    "Community value is real",
    "Disclosure/rules are handled",
    "Rule/source proof gaps are labeled",
    "Promotion risk is minimized",
    "SaaS/App intake rows are complete",
    "Account safety and manual posting ownership are clear"
  ],
  "depthPolicy": "Default to a safe discussion draft plus pre-submission checklist. Go deeper when subreddit fit, disclosure, rule risk, account safety, and comment responses need balancing.",
  "concisionRule": "Avoid promotional language; keep community value, source/rule status, disclosure, draft, handoff, and moderation risk visible.",
  "toolStrategy": {
    "web_search": "default",
    "source_mode": "current_subreddit_rules_threads_and_community_norms",
    "note": "Check current subreddit rules, recent threads, moderation norms, and disclosure expectations before drafting."
  },
  "specialistMethod": [
    "Confirm subreddit, rules, disclosure, value angle, upstream handoff usage, public page readiness, proof gaps, approval owner, measurement event, and whether a link is safe.",
    "Create an upstream handoff usage ledger that separates reused Media Planner/Writer/SEO/Research facts, safe copy, missing proof, blocked claims, and assumptions.",
    "Review current threads and community norms before drafting, or label the exact rule/source proof gaps if sources are not supplied.",
    "Deliver a discussion-first draft, comment response matrix, account-safety notes, moderation-risk mitigation, proof-needed checklist, row-level SaaS/App intake payload, evidence return path, and copy/paste guidance for the SaaS publisher surface."
  ],
  "scopeBoundaries": [
    "Do not claim that the agent can publish to Reddit directly.",
    "Do not hide promotion or push a link where community rules discourage it.",
    "Do not ignore subreddit rules, disclosure norms, or moderation risk.",
    "Do not post a draft that lacks standalone community value.",
    "Do not treat upstream specialist copy, media choices, or claims as verified unless they carry source status and approval scope.",
    "Do not treat a thin or unreadable public page as adequate destination proof for broad awareness.",
    "Do not claim SaaS/App intake, Publisher queueing, posting, replying, rule verification, or measurement happened from this agent's prepared payload.",
    "Do not label a draft ready to post without owner approval, account context, and final rule review evidence."
  ],
  "freshnessPolicy": "Treat subreddit rules, moderation norms, recent threads, and community sentiment as time-sensitive. Date observations before recommending a post.",
  "sensitiveDataPolicy": "Treat account identity, moderation history, customer examples, and private product data as sensitive. Do not write posts that accidentally deanonymize the user or customers.",
  "costControlPolicy": "Spend effort on rule fit and community value before drafting. Avoid multiple subreddit plans when one safe discussion draft is the next decision."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'reddit',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'reddit'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'reddit agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/reddit/health',
  healthcheck_url: '/sample-agents/reddit/health',
  jobEndpoint: '/sample-agents/reddit/jobs',
  job_endpoint: '/sample-agents/reddit/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/reddit/health',
    jobs: '/sample-agents/reddit/jobs'
  }),
  metadata: Object.freeze({
    agent_purpose: AGENT_DEFINITION.agentPurpose,
    action_boundaries: AGENT_DEFINITION.agentActionBoundaries,
    delivery_contract: AGENT_DEFINITION.deliveryContract,
    sample: true,
    sampleKind: 'reddit',
    sample_kind: 'reddit',
    category: 'reddit',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
