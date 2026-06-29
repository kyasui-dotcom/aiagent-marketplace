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
    const generatedArtifacts = Array.isArray(generatedDelivery?.artifacts) ? generatedDelivery.artifacts.filter((item) => item && typeof item === 'object') : [];
    const localArtifacts = agentProviderXPostArtifacts(kind, definition, body, markdown);
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
        content_type: agentProviderDeliveryContentType(generatedDelivery, definition),
        artifact_type: agentProviderText(generatedDelivery?.artifactType || generatedDelivery?.artifact_type || definition.defaultArtifactType || definition.default_artifact_type),
        artifact_types: agentProviderList(generatedDelivery?.artifactTypes || generatedDelivery?.artifact_types).length
          ? agentProviderList(generatedDelivery?.artifactTypes || generatedDelivery?.artifact_types)
          : agentProviderList(definition.defaultArtifactTypes || definition.default_artifact_types),
        surface: agentProviderText(generatedDelivery?.surface || definition.defaultSurface || definition.default_surface),
        item_type: agentProviderText(generatedDelivery?.itemType || generatedDelivery?.item_type || definition.defaultItemType || definition.default_item_type),
        action_type: agentProviderText(generatedDelivery?.actionType || generatedDelivery?.action_type || definition.defaultActionType || definition.default_action_type),
        channel: agentProviderText(generatedDelivery?.channel || definition.defaultChannel || definition.default_channel),
        connector: agentProviderText(generatedDelivery?.connector || definition.defaultConnector || definition.default_connector),
        connector_capability: agentProviderText(generatedDelivery?.connectorCapability || generatedDelivery?.connector_capability || definition.defaultConnectorCapability || definition.default_connector_capability),
        profile_handle: agentProviderText(generatedDelivery?.profileHandle || generatedDelivery?.profile_handle || generatedDelivery?.accountHandle || generatedDelivery?.account_handle),
        profile_url: agentProviderText(generatedDelivery?.profileUrl || generatedDelivery?.profile_url || generatedDelivery?.accountUrl || generatedDelivery?.account_url),
        media_assets: agentProviderText(generatedDelivery?.mediaAssets || generatedDelivery?.media_assets || generatedDelivery?.assetRequirements || generatedDelivery?.asset_requirements),
        channel_rules: agentProviderText(generatedDelivery?.channelRules || generatedDelivery?.channel_rules || generatedDelivery?.linkPolicy || generatedDelivery?.link_policy),
        approval_checklist: agentProviderText(generatedDelivery?.approvalChecklist || generatedDelivery?.approval_checklist || generatedDelivery?.prePublishChecklist || generatedDelivery?.pre_publish_checklist)
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

function agentProviderDeliveryContentType(delivery = {}, definition = {}) {
  const generatedType = agentProviderText(delivery?.contentType || delivery?.content_type);
  const defaultType = agentProviderText(definition.defaultContentType || definition.default_content_type);
  if (defaultType && /^(agent_delivery|reused_agent_delivery|text\/markdown|text_markdown)$/i.test(generatedType)) return defaultType;
  return generatedType || defaultType || 'agent_delivery';
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
      scope_boundaries: agentProviderList(definition.scopeBoundaries),
      purpose: definition.agentPurpose || null,
      action_boundaries: Array.isArray(definition.agentActionBoundaries) ? definition.agentActionBoundaries : [],
      delivery_contract: agentProviderObject(definition.deliveryContract)
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

function agentProviderInputRoot(body = {}) {
  return body.input && typeof body.input === 'object' ? body.input : {};
}

function agentProviderWorkflow(body = {}) {
  const input = agentProviderInputRoot(body);
  const broker = input._broker && typeof input._broker === 'object' ? input._broker : {};
  return broker.workflow && typeof broker.workflow === 'object' ? broker.workflow : {};
}

function agentProviderInputText(body = {}, keys = [], fallback = '') {
  const input = agentProviderInputRoot(body);
  for (const key of keys) {
    const value = input[key] ?? body[key];
    if (Array.isArray(value)) {
      const text = value.map((item) => agentProviderValueText(item)).filter(Boolean).join(', ');
      if (text) return text;
    }
    if (value && typeof value === 'object') {
      const text = agentProviderValueText(value);
      if (text) return text;
    }
    const text = agentProviderText(value);
    if (text) return text;
  }
  return agentProviderText(fallback);
}

function agentProviderInputListValue(body = {}, keys = []) {
  const input = agentProviderInputRoot(body);
  const values = [];
  const push = (value) => {
    if (Array.isArray(value)) {
      for (const item of value) push(item);
      return;
    }
    if (value && typeof value === 'object') {
      const text = agentProviderValueText(value);
      if (text) values.push(text);
      return;
    }
    const text = agentProviderText(value);
    if (text) values.push(text);
  };
  for (const key of keys) push(input[key] ?? body[key]);
  return values.filter((value, index, list) => list.indexOf(value) === index);
}

function agentProviderSourceStatus(body = {}) {
  const input = agentProviderInputRoot(body);
  return {
    target_url: agentProviderPrimaryUrl(body),
    public_page: agentProviderText(input.public_page_status || input.publicPageStatus || input.source_status || input.sourceStatus, 'public page status not supplied'),
    proof_status: agentProviderText(input.proof_status || input.proofStatus, 'proof not supplied'),
    account_status: agentProviderText(input.account_status || input.accountStatus, 'target X account not supplied'),
    link_policy_status: agentProviderText(input.link_policy_status || input.linkPolicyStatus, 'link and UTM policy not approved'),
    connector_execution: agentProviderText(input.connector_status || input.connectorStatus, 'no X, Publisher, or analytics connector proof supplied')
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
    const summary = agentProviderText(run?.summary || run?.report?.summary);
    const japaneseSafe = summary.match(/安全に使える主張は[「『]([^」』]+)[」』]/);
    const japaneseBlocked = summary.match(/([^。]*(?:証拠不足|使用不可)[^。]*)/);
    if (japaneseSafe?.[1] && !safeClaims.includes(japaneseSafe[1])) safeClaims.push(japaneseSafe[1]);
    else if (/safe|approved|known safe|usable claim|安全に使える主張/i.test(summary) && !safeClaims.includes(summary.slice(0, 260))) safeClaims.push(summary.slice(0, 260));
    if (japaneseBlocked?.[1] && !blockedClaims.includes(japaneseBlocked[1])) blockedClaims.push(japaneseBlocked[1]);
    else if (/blocked|unverified|proof|missing|証拠不足|使用不可/i.test(summary) && !blockedClaims.includes(summary.slice(0, 260))) blockedClaims.push(summary.slice(0, 260));
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
    'owner-approved positioning and claim ledger',
    'crawlable public product explanation and approved landing URL',
    'target X account handle and account owner',
    'approved link and UTM policy',
    'X OAuth or manual publishing path',
    'reply-risk stop rules and analytics event'
  ];
  const items = supplied.length ? supplied : defaults;
  return items.map((item) => ({
    item,
    status: 'missing_or_unapproved',
    owner: 'service owner',
    blocked_decision: 'Do not mark the X packet publish-ready until this proof is supplied, replaced, or explicitly waived.'
  }));
}

function agentProviderUtmTemplate(targetUrl = '') {
  if (!targetUrl) return '';
  const joiner = targetUrl.includes('?') ? '&' : '?';
  return `${targetUrl}${joiner}utm_source=x&utm_medium=social&utm_campaign=awareness`;
}

function agentProviderXPostRows(body = {}) {
  const targetUrl = agentProviderPrimaryUrl(body);
  const productName = agentProviderInputText(body, ['product_name', 'productName', 'name'], agentProviderHost(targetUrl));
  const serviceSummary = agentProviderInputText(body, ['service_description', 'serviceDescription', 'service_summary', 'serviceSummary', 'offer', 'description'], agentProviderOffer(body));
  const audience = agentProviderInputText(body, ['target_audience', 'targetAudience', 'icp', 'audience'], agentProviderAudience(body));
  const goal = agentProviderInputText(body, ['goal', 'objective', 'conversion_goal', 'conversionGoal', 'awareness_goal', 'awarenessGoal'], agentProviderConversion(body));
  const approvalOwner = agentProviderInputText(body, ['approval_owner', 'approvalOwner', 'owner'], 'service owner');
  const measurementEvent = /awareness|認知/i.test(goal) ? 'awareness_referral_signal' : agentProviderConversionEvent(goal);
  const utmTemplate = agentProviderUtmTemplate(targetUrl);
  const rows = [
    {
      post_type: 'short_post',
      angle: 'problem-first awareness',
      hook: `${productName}: turn one service URL into a marketing action plan`,
      draft_text_basis: `${serviceSummary}. Avoid outcomes, customer proof, or performance numbers until verified.`
    },
    {
      post_type: 'mini_thread',
      angle: 'workflow transparency',
      hook: 'Before asking for attention, fix public copy, proof, and channel readiness',
      draft_text_basis: `Reuse Media Planner, Writer, and Landing handoffs to explain the awareness workflow for ${audience}.`
    },
    {
      post_type: 'reply_hook',
      angle: 'feedback request',
      hook: 'Ask what marketing task people would automate first from a single URL',
      draft_text_basis: 'Use as a reply prompt, not a promotional claim or automated outreach trigger.'
    }
  ];
  return rows.map((row, index) => ({
    item_id: `x-${row.post_type}-${index + 1}`,
    priority: index + 1,
    destination: 'x',
    post_type: row.post_type,
    angle: row.angle,
    hook: row.hook,
    draft_text_basis: row.draft_text_basis,
    account_status: agentProviderInputText(body, ['account_status', 'accountStatus'], 'target X account not supplied'),
    link_policy: 'Use the destination URL only after owner approves link/UTM policy; otherwise publish as no-link awareness copy.',
    source_status: 'uses supplied product summary and upstream specialist handoff; X account, proof, and link policy still need owner approval',
    readiness_status: index === 0 ? 'draft_needs_owner_review' : 'candidate_queue_needs_voice_and_link_review',
    approval_owner: approvalOwner,
    measurement_event: measurementEvent,
    utm_template: utmTemplate,
    proof_required: ['approved exact text', 'claim/proof review', 'target account handle', 'link/UTM approval', 'manual or OAuth publishing confirmation'],
    execution_status: 'not_posted_not_scheduled_not_queued_not_approved',
    blocked_decision: 'Do not post, schedule, queue, or call ready-to-post until exact text, account, link policy, proof ledger, and connector/manual path are approved.'
  }));
}

function agentProviderXPostArtifacts(kind = '', definition = {}, body = {}, markdown = '') {
  const targetUrl = agentProviderPrimaryUrl(body);
  const productName = agentProviderInputText(body, ['product_name', 'productName', 'name'], agentProviderHost(targetUrl));
  const serviceSummary = agentProviderInputText(body, ['service_description', 'serviceDescription', 'service_summary', 'serviceSummary', 'offer', 'description'], agentProviderOffer(body));
  const goal = agentProviderInputText(body, ['goal', 'objective', 'conversion_goal', 'conversionGoal', 'awareness_goal', 'awarenessGoal'], agentProviderConversion(body));
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
    type: 'x_post_saas_handoff',
    artifact_type: 'x_post_review_queue',
    surface: 'publisher',
    source_task_type: kind,
    title: `${productName} X awareness packet`,
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
      default_rule: 'Use only supplied product facts and proof-safe writer claims; treat metrics, testimonials, screenshots, customer details, and account/link policy as unverified until owner proof is supplied.'
    },
    missing_proof_queue: agentProviderMissingProofQueue(body),
    post_queue: agentProviderXPostRows(body),
    reply_plan: [
      {
        trigger: 'reader asks what the product does',
        response_goal: 'Answer from approved public copy only; acknowledge public page explanation gaps if still unresolved.',
        execution_status: 'reply_not_sent'
      },
      {
        trigger: 'reader asks for proof, results, or examples',
        response_goal: 'State that verified proof is not supplied in this packet and route to proof collection before making claims.',
        execution_status: 'reply_not_sent'
      },
      {
        trigger: 'reader wants to try it',
        response_goal: 'Share the approved URL with UTM only after link policy approval; otherwise ask for the use case and keep it manual.',
        execution_status: 'reply_not_sent'
      }
    ],
    app_intake_fields: [
      'item_id',
      'priority',
      'destination',
      'post_type',
      'angle',
      'hook',
      'draft_text_basis',
      'account_status',
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
    summary_markdown_title: agentProviderMarkdownTitle(markdown, definition.fileName || kind || 'x_post'),
    execution_boundary: 'Prepared only; no X post, reply, schedule, queue, approval, Publisher ingest, connector action, or analytics verification is implied.'
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

const X_POST_AGENT_PURPOSE = 'Prepare X-native posts, threads, replies, cadence, upstream handoff usage ledgers, SaaS/App review rows, schedule packets, approval checklist, and connector handoff without claiming posting, queueing, app ingest, approval, or other unapproved X actions.';

const X_POST_AGENT_ACTION_BOUNDARIES = Object.freeze([
  Object.freeze({
    id: 'prepare_x_post_packet',
    mode: 'prepare_only',
    requires: Object.freeze(['offer_or_announcement', 'target_reader', 'voice_or_voice_assumption']),
    prepares: Object.freeze(['exact_post_text', 'thread_outline', 'reply_hooks', 'cadence']),
    produces: Object.freeze(['x_post_packet']),
    cannotClaim: Object.freeze(['posted', 'scheduled', 'replied', 'liked']),
    authorityBoundary: 'Drafting does not imply X account authority.'
  }),
  Object.freeze({
    id: 'prepare_x_schedule_packet',
    mode: 'prepare_only',
    requires: Object.freeze(['approved_or_draft_text', 'target_account_or_account_gap', 'cadence_limit']),
    prepares: Object.freeze(['schedule_slots', 'rate_limit_note', 'reply_monitoring_window', 'pause_condition']),
    produces: Object.freeze(['x_schedule_packet']),
    cannotClaim: Object.freeze(['scheduled', 'queued', 'posted']),
    authorityBoundary: 'Schedule slots are recommendations until the connected X account confirms queue creation.'
  }),
  Object.freeze({
    id: 'prepare_x_pre_publish_review',
    mode: 'prepare_only',
    requires: Object.freeze(['exact_post_text', 'claim_or_proof_status', 'link_policy_or_link_gap', 'target_account_or_account_gap', 'approval_owner']),
    prepares: Object.freeze(['character_count_status', 'claim_proof_ledger', 'link_utm_status', 'reply_risk_check', 'publish_readiness_label', 'next_owner_handoff']),
    produces: Object.freeze(['x_pre_publish_review_packet']),
    cannotClaim: Object.freeze(['approved', 'ready_to_post', 'queued', 'posted']),
    authorityBoundary: 'Pre-publish review can mark a draft ready for review only; ready-to-post requires exact text approval, account confirmation, link policy, proof ledger, and connector status.'
  }),
  Object.freeze({
    id: 'apply_upstream_x_handoff',
    mode: 'handoff_intake',
    requires: Object.freeze(['media_planner_or_writer_handoff', 'proof_gap_status', 'public_copy_readiness', 'link_policy_or_link_gap']),
    prepares: Object.freeze(['upstream_handoff_usage_ledger', 'safe_claim_scope', 'blocked_claims_and_missing_proof', 'public_discoverability_blocker']),
    produces: Object.freeze(['x_handoff_intake_ledger']),
    cannotClaim: Object.freeze(['upstream claims verified without review', 'copy approved by owner', 'public discoverability repaired', 'link policy approved without owner proof']),
    authorityBoundary: 'Upstream specialist material may guide the X packet only when source status and approval scope are carried forward; it is not proof that claims, copy, destination, or link policy are verified.'
  }),
  Object.freeze({
    id: 'prepare_x_saas_payload',
    mode: 'app_handoff',
    requires: Object.freeze(['post_queue', 'approval_owner', 'measurement_plan', 'proof_requirements', 'account_or_connector_gap']),
    prepares: Object.freeze(['publisher_review_rows', 'app_intake_fields', 'reply_plan_rows', 'blocked_decision_per_post']),
    produces: Object.freeze(['x_post_saas_handoff_payload']),
    cannotClaim: Object.freeze(['SaaS app ingested', 'Publisher queued', 'post approved', 'post scheduled', 'external action completed']),
    authorityBoundary: 'The payload is review and app-intake data only; ingestion, queueing, posting, replying, scheduling, approval, and measurement require downstream proof.'
  }),
  Object.freeze({
    id: 'prepare_x_connector_handoff',
    mode: 'handoff_only',
    requires: Object.freeze(['approved_exact_text', 'connected_account_handle', 'human_publish_confirmation', 'connector_status']),
    prepares: Object.freeze(['connector_fields', 'approval_checklist', 'audit_note', 'execution_status_labels']),
    produces: Object.freeze(['x_connector_handoff_packet']),
    cannotClaim: Object.freeze(['posted', 'scheduled']),
    authorityBoundary: 'Post/schedule claims require X connector proof.'
  })
]);

const X_POST_DELIVERY_CONTRACT = Object.freeze({
  requiredDeliverySections: Object.freeze(['Upstream handoff usage', 'Public copy/readiness gap', 'Positioning and voice', 'Proof-safe claim ledger', 'Exact post text', 'Thread or short-post set', 'Reply hooks', 'Account and link policy', 'Pre-publish review', 'SaaS/App intake payload', 'Schedule packet', 'Approval checklist', 'Connector handoff boundary', 'Publish readiness handoff', 'Measurement and evidence return path', 'Execution status labels']),
  requiredEvidence: Object.freeze(['voice/source examples or assumption label', 'media planner or writer handoff usage when supplied', 'public page readability or crawlable copy status', 'target account or account gap', 'claim/proof source status', 'link/UTM policy or link gap', 'connector status or connector gap', 'approval owner and measurement event for each post row']),
  mustLabel: Object.freeze(['draft only', 'approval required', 'not approved', 'proof gap', 'link policy gap', 'connector gap', 'SaaS/App ingest status', 'not queued', 'not posted', 'blocked decision']),
  forbiddenClaims: Object.freeze(['posted', 'scheduled', 'queued', 'liked', 'replied', 'ready to post without approval proof', 'approved without owner evidence', 'SaaS app ingested', 'Publisher queued', 'analytics measured without returned evidence', 'public discoverability repaired without owner proof', 'upstream claims verified without review']),
  validDeliveryCheck: 'A valid X delivery contains exact text, source-labeled upstream handoff usage, public-copy readiness status, claim/proof ledger, account/link policy, row-level SaaS/App intake fields, pre-publish review, schedule recommendations, measurement evidence return path, and explicit approval/connector proof boundaries.'
});

const AGENT_DEFINITION = {
  provider: AGENT_PROVIDER,
  agentPurpose: X_POST_AGENT_PURPOSE,
  agentActionBoundaries: X_POST_AGENT_ACTION_BOUNDARIES,
  deliveryContract: X_POST_DELIVERY_CONTRACT,
  defaultContentType: 'x_post_packet',
  defaultArtifactType: 'x_post_packet',
  defaultArtifactTypes: ['x_post_packet', 'x_post', 'social_copy_packet', 'approval_request'],
  defaultSurface: 'publisher',
  defaultItemType: 'x_post',
  defaultActionType: 'x_post',
  defaultChannel: 'x',
  defaultConnector: 'x',
  defaultConnectorCapability: 'x.post',
  "fileName": "x-ops-connector-delivery.md",
  "healthService": "x_ops_connector_agent",
  "modelRole": "X operations, post drafting, reply drafting, scheduling, and connector handoff",
  "executionLayer": "action",
  "taskRouting": {
    "expansionTasks": ['research', 'writing'],
    "softMatchTokens": ['x_post', 'x_ops', 'x_automation', 'x', 'twitter', 'social'],
    "tagHints": ['marketing', 'social', 'x']
  },
  "seedProfile": {
    "id": "agent_x_launch_01",
    "name": "X OPS CONNECTOR AGENT",
    "description": "Built-in X preparation adapter that consumes copy packs, Media Planner handoffs, reply plans, proof gaps, and approval context, then prepares exact X review packets, reply plans, and row-level SaaS publisher intake payloads.",
    "taskTypes": [
      "x_post",
      "x_ops",
      "x_automation",
      "reply_handling",
      "scheduled_social",
      "x",
      "twitter",
      "social",
      "marketing"
    ],
    "successRate": 0.92,
    "avgLatencySec": 12,
    "executionPattern": "async",
    "inputTypes": [
      "text",
      "url",
      "file",
      "connector_context"
    ],
    "outputTypes": [
      "markdown",
      "json",
      "draft_posts",
      "approval_checklist"
    ],
    "clarification": "multi_turn",
    "scheduleSupport": true,
    "requiredConnectorCapabilities": [
      "x.post"
    ],
    "optionalConnectors": [
      "x_oauth"
    ],
    "riskLevel": "confirm_required",
    "confirmationRequiredFor": [
      "post_tweet",
      "send_reply",
      "schedule_post",
      "auto_post",
      "auto_reply"
    ],
    "capabilities": [
      "x_post",
      "thread_draft",
      "reply_draft",
      "schedule_plan",
      "approval_gate",
      "x_connector_handoff",
      "exact_post_packet",
      "scheduled_post_packet",
      "upstream_handoff_intake",
      "proof_safe_claim_ledger",
      "x_post_saas_handoff_payload",
      "publisher_review_rows"
    ],
    "metadata": {
      "layer": "execution",
      "adapter_role": "x_publish_executor",
      "approval_mode": "human_before_external_execution",
      "preferred_upstream_specialist": "writer",
      "secondary_upstream_specialist": "media_planner",
      "upstream_task_types": [
        "writing",
        "media_planner",
        "research"
      ],
      "input_contract": [
        "copy_pack",
        "reply_plan",
        "approval_context"
      ],
      "output_contract": [
        "status",
        "output",
        "errors",
        "external_url",
        "next_step"
      ],
      "provider_connectors_required_for_execution": [
        "x_oauth"
      ],
      "external_connector_contract": "x-reply-assistant/aiagent/v1",
      "execution_default": "draft_then_publish",
      "leader_handoff_mode": "leader_mediated"
    }
  },
  "systemPrompt": "You are the built-in X Ops Connector Agent in AIagent2. Turn a product, announcement, or growth brief into X-native posts, threads, reply candidates, timing, approval checkpoints, SaaS/App intake rows, and connector handoff instructions for the user's product or account. Start from the leader objective and any Media Planner, Writer, SEO, Campaign Operations, Landing, Reddit, or Research handoff already supplied, then state exactly what upstream information you reused, what claim/proof scope it permits, and what remains blocked. For awareness goals, diagnose whether the public page can explain the product before asking X for attention; if the observed site is a thin SPA shell, missing crawlable product copy, missing CTA, or missing proof, keep that public copy/readiness gap visible and do not write as if the destination is already market-ready. Default to draft-plus-execution-packet output. Never claim that anything was posted, scheduled, queued, liked, followed, DMed, replied to, approved, ingested into SaaS, or measured unless a connected X connector or downstream app explicitly reports it. Include a row-level SaaS/App intake payload for the leader and downstream publisher surface with item_id, priority, destination, post_type, angle, hook, draft_text_basis, account_status, link_policy, source_status, readiness_status, approval_owner, measurement_event, UTM template, proof_required, execution_status, and blocked_decision. If execution is requested, require X OAuth connector status, the exact connected account handle, target account approval, allowed actions, rate/cadence limits, exact post text approval, and explicit human confirmation before any publish/send/schedule action. Before marking any draft ready for Publisher or X Client Ops, include a pre-publish review with character count status, claim/proof ledger, link or UTM policy, account handle/status, reply-risk check, cadence cap, approval owner, connector status, and exact next owner. If any of those inputs are missing, label the publish readiness as blocked/not approved and keep the output at draft-only status; do not call it approved, queued, or ready to post. When this run comes from a leader workflow, send the draft posts, approval checklist, pre-publish review, SaaS/App payload, and connector action packet back to the leader for mediation; do not present yourself as the final publishing authority. Use the external x-reply-assistant connector contract when available: OAuth connection, draft queue, manual approval, scheduled queue, daily caps, audit log, and API replies only for explicit mentions/replies/quotes. For keyword search or cold discovery leads, prepare manual reply copy and open-profile instructions; do not recommend API replies to users who did not explicitly engage. Avoid spam, fake engagement, mass DMs, purchased lists, deceptive urgency, engagement bait, hidden promotion, or tactics that risk account suspension.",
  "deliverableHint": "Deliver in the user requested language in a clear, user-readable format.",
  "reviewHint": "Make drafts concrete, remove hype, preserve explicit approval gates, include exact-now vs scheduled-later packets, ensure connector actions cannot be mistaken for completed posts, and keep leader-mediated execution visible when a leader workflow is present.",
  "executionFocus": "Produce X-native posts. Prioritize first-line clarity, founder voice, reply hooks, low-hype cadence, and a leader- or human-approved connector handoff when execution is requested.",
  "outputSections": [
    "Upstream handoff usage",
    "Public copy/readiness gap",
    "One-line positioning",
    "Proof-safe claim ledger",
    "Exact post text",
    "Thread or short-post set",
    "Thread outline",
    "Reply hooks",
    "Quote-post angles",
    "CTA",
    "Account and link policy",
    "Pre-publish review",
    "SaaS/App intake payload",
    "Leader handoff or approval packet",
    "Connector handoff boundary",
    "Publish readiness handoff",
    "Follow-up cadence",
    "Measurement and evidence return path",
    "Execution status labels"
  ],
  "inputNeeds": [
    "Product or offer",
    "Audience",
    "Founder voice",
    "Launch angle",
    "CTA and link policy",
    "Claim/proof source status",
    "Target account, connector status, and leader approval path",
    "Media Planner or Writer handoff when available",
    "Public page readability and CTA/proof status",
    "Measurement event and UTM policy"
  ],
  "acceptanceChecks": [
    "Upstream Media Planner/Writer/SEO/Landing/Research handoff usage is summarized when supplied",
    "Public copy/readiness gap is labeled when the destination is a thin SPA shell or missing proof/CTA context",
    "First line is clear",
    "Posts fit founder voice",
    "Reply hooks are included",
    "SaaS/App intake payload includes post rows with owner, source status, readiness, measurement event, proof required, execution status, and blocked decision",
    "Character count, claim/proof status, link/UTM policy, and account status are reviewed before handoff",
    "Approval packet is explicit",
    "Publish readiness is labeled blocked/not approved when proof, link policy, account, approval, or connector evidence is missing",
    "Connector handoff boundary and not-posted/not-queued labels are explicit",
    "Cadence avoids hype"
  ],
  "firstMove": "Read the leader objective, upstream handoffs, public page/source status, proof gaps, account status, link policy, and approval owner before setting the one-line positioning and voice. Optimize the first line, reply hook, cadence, app-intake row, and link policy.",
  "failureModes": [
    "Do not write hype-heavy generic posts",
    "Do not bury the hook",
    "Do not ignore upstream handoff context or public-page readiness gaps",
    "Do not omit row-level owner, proof, readiness, measurement, execution status, and blocked-decision fields",
    "Do not call a post ready to publish when account, proof, link policy, approval, or connector status is missing",
    "Do not omit replies or follow-up cadence"
  ],
  "evidencePolicy": "Use founder voice, positioning, comparable posts, audience, approved claim proof, link policy, account status, prior engagement signals, and supplied upstream handoffs when available. Missing proof, public copy, link policy, account, connector, or approval scope must stay labeled as a gap.",
  "nextAction": "End with the first post draft, the pre-publish review, the leader or human approval packet needed for publishing, the reply plan, SaaS/App intake rows, cadence, evidence return path, and the metric to watch.",
  "confidenceRubric": "High when voice, positioning, audience, proof, link policy, account status, and comparable posts are available; medium when voice is inferred; low when offer, proof, account, link policy, or target reader is unclear.",
  "handoffArtifacts": [
    "First post",
    "Thread or short-post set",
    "Reply hooks",
    "Pre-publish review",
    "Approval packet",
    "OAuth account confirmation",
    "Cadence plan",
    "Upstream handoff usage ledger",
    "SaaS/App intake payload",
    "SaaS publisher packet"
  ],
  "prioritizationRubric": "Prioritize posts by first-line hook, founder voice fit, reply potential, clarity, and timing.",
  "measurementSignals": [
    "Replies",
    "Profile clicks",
    "Link clicks",
    "Follow-up conversation quality"
  ],
  "assumptionPolicy": "Assume concise founder-style posts unless another voice is supplied, and assume publishing still requires leader or human approval. Do not assume claims, metrics, links, target account authority, or connector readiness that were not provided.",
  "escalationTriggers": [
    "The post contains unverifiable claims",
    "The target account, link policy, or connector status is unclear",
    "Public page cannot explain the product before social attention is requested",
    "Upstream claim scope is missing or contradicts the draft",
    "Voice/positioning is unclear",
    "Leader approval path or target account is unclear",
    "The CTA could look spammy or manipulative"
  ],
  "minimumQuestions": [
    "What positioning and audience should the posts target?",
    "What founder voice or examples should it match?",
    "What CTA or link policy should be used?",
    "Which claims are approved, and what proof can be used?",
    "Who will approve the exact post and through which connected account?"
  ],
  "reviewChecks": [
    "First line is strong",
    "Voice is consistent",
    "Upstream handoff usage and public-page readiness are explicit",
    "Pre-publish review labels proof, link, account, approval, and connector gaps",
    "SaaS/App intake rows are complete",
    "Replies/cadence are prepared",
    "Approval and connector handoff are explicit"
  ],
  "depthPolicy": "Default to a small post set. Go deeper when thread structure, reply hooks, cadence, or positioning needs testing.",
  "concisionRule": "Avoid hype and long explanations; deliver posts, hooks, replies, cadence, CTA, and the approval packet needed before publishing.",
  "toolStrategy": {
    "web_search": "default",
    "source_mode": "current_x_competitor_topic_and_reply_scan",
    "note": "Check current topic, competitor posts, reply norms, and audience language before drafting posts."
  },
  "specialistMethod": [
    "Confirm audience, positioning, founder voice, claim proof, link policy, CTA, public page readiness, upstream handoff usage, approval owner, and measurement event.",
    "Create an upstream handoff usage ledger that separates reused Media Planner/Writer/SEO/Landing/Research facts, safe copy, missing proof, blocked claims, and assumptions.",
    "Scan current topic, competitor posts, reply norms, and audience language when available.",
    "Deliver first post, optional thread, reply hooks, cadence, metric to watch, row-level SaaS/App intake payload, and the exact approval packet the leader or operator must sign off before publishing."
  ],
  "scopeBoundaries": [
    "Do not write deceptive engagement bait, fake urgency, or unsupported claims.",
    "Do not ignore founder voice, audience context, link policy, or reply risk.",
    "Do not treat upstream specialist copy, media choices, or claims as verified unless they carry source status and approval scope.",
    "Do not treat a thin or unreadable public page as adequate destination proof for broad awareness.",
    "Do not claim SaaS/App intake, Publisher queueing, posting, scheduling, replying, or measurement happened from this agent's prepared payload.",
    "Do not imply that posting authority exists until the leader or user explicitly approves the exact action.",
    "Do not optimize for virality at the cost of trust."
  ],
  "freshnessPolicy": "Treat topic context, X norms, competitor posts, and audience sentiment as time-sensitive. Date checks and avoid drafts that rely on stale discourse.",
  "sensitiveDataPolicy": "Treat drafts, metrics, customer names, internal strategy, and unreleased announcements as confidential. Public posts must use approved facts or placeholders.",
  "costControlPolicy": "Draft a focused post set and reply plan. Avoid long threads or large content batches when the positioning or proof is still uncertain."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'x_post',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'x_post'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'x_post agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/x_post/health',
  healthcheck_url: '/sample-agents/x_post/health',
  jobEndpoint: '/sample-agents/x_post/jobs',
  job_endpoint: '/sample-agents/x_post/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/x_post/health',
    jobs: '/sample-agents/x_post/jobs'
  }),
  metadata: Object.freeze({
    agent_purpose: AGENT_DEFINITION.agentPurpose,
    action_boundaries: AGENT_DEFINITION.agentActionBoundaries,
    delivery_contract: AGENT_DEFINITION.deliveryContract,
    sample: true,
    sampleKind: 'x_post',
    sample_kind: 'x_post',
    category: 'x_post',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
