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
    const delivery = await agentProviderGenerateDelivery(kind, definition, body, source, { webSources });
    if (delivery?.error) return agentProviderDeliveryFailure(kind, definition, name, japanese, delivery.error);
    const markdown = delivery?.fileMarkdown;
    if (!markdown) return agentProviderDeliveryFailure(kind, definition, name, japanese, 'missing_required_deliverable: original request, source context, or concrete artifact was not available.');
    return {
      accepted: true,
      status: 'completed',
      summary: delivery.summary,
      report: {
        summary: delivery.reportSummary,
        bullets: agentProviderList(delivery.bullets),
        nextAction: agentProviderText(delivery.nextAction, ''),
        confidence: prompt === 'No prompt provided.' ? 'low' : 'medium',
        ...(agentProviderList(delivery?.artifacts).length ? { artifacts: delivery.artifacts } : {}),
        ...(agentProviderList(delivery?.approvalRequests).length ? { approval_requests: delivery.approvalRequests } : {}),
        ...(webSources.length ? { web_sources: webSources } : {})
      },
      files: [{
        name: agentProviderText(definition.fileName, `${kind || 'agent'}-delivery.md`),
        type: 'text/markdown',
        content: markdown,
        source_task_type: kind,
        content_type: delivery?.contentType || 'agent_delivery'
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
    output_contract: 'Return only user-facing delivery text and structured handoff data. Respect delivery_quality_gate: include required sections when relevant, label missing evidence/status, and avoid forbidden claims. Do not include workflow prompts, provider implementation notes, raw handoff context, or internal QA text.'
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

const LANDING_AGENT_PURPOSE = 'Produce conversion-ready landing page critique, replacement copy, implementation structure, and publish handoff while labeling whether page evidence was supplied, without inventing proof or claiming verified page inspection or deployment.';

const LANDING_AGENT_ACTION_BOUNDARIES = Object.freeze([
  Object.freeze({
    id: 'prepare_landing_conversion_packet',
    mode: 'prepare_only',
    requires: Object.freeze(['page_or_offer', 'page_evidence_status', 'audience', 'conversion_goal']),
    prepares: Object.freeze(['conversion_diagnosis', 'replacement_copy', 'page_structure', 'evidence_status_labels']),
    produces: Object.freeze(['landing_conversion_packet']),
    cannotClaim: Object.freeze(['page inspected without source', 'verified critique without page evidence', 'page updated', 'deployed', 'published']),
    authorityBoundary: 'If current page URL, copy, screenshot, analytics, or copy deck is missing, concrete critique and replacement copy must be labeled as hypothesis or draft handoff.'
  }),
  Object.freeze({
    id: 'prepare_landing_implementation_handoff',
    mode: 'handoff_only',
    requires: Object.freeze(['approved_or_draft_copy_status', 'target_path_or_surface', 'implementation_owner']),
    prepares: Object.freeze(['implementation_tasks', 'measurement_events', 'draft_handoff_plan']),
    produces: Object.freeze(['landing_implementation_handoff_packet']),
    cannotClaim: Object.freeze(['replacement copy verified without current page copy', 'GitHub committed', 'CMS saved', 'Publisher item created without proof']),
    authorityBoundary: 'Handoff is not a deployment receipt.'
  }),
  Object.freeze({
    id: 'prepare_signup_trial_cta_alignment_check',
    mode: 'cta_alignment_check',
    requires: Object.freeze(['current_signup_or_trial_page_copy_or_url', 'seo_landing_page_url', 'conversion_goal', 'marketing_or_ux_owner']),
    prepares: Object.freeze(['intent_cta_mapping', 'cta_alignment_matrix', 'promise_transition_check', 'copy_mismatch_list', 'revised_cta_block_draft', 'proof_block_draft']),
    produces: Object.freeze(['signup_trial_cta_alignment_packet']),
    cannotClaim: Object.freeze(['CTA alignment verified without both page sources', 'SEO page inspected without URL', 'signup/trial page inspected without copy or URL']),
    authorityBoundary: 'CTA alignment requires both the current signup/trial page copy or URL and one SEO landing page URL; missing inputs produce a draft checklist, not a verified alignment finding.'
  })
]);

const LANDING_DELIVERY_CONTRACT = Object.freeze({
  requiredDeliverySections: Object.freeze(['Conversion goal', 'Audience and intent', 'Current page evidence status', 'Signup/trial CTA alignment check', 'Intent to CTA mapping', 'Revised CTA block draft', 'Proof block draft', 'Observed evidence or assumptions', 'Objection map', 'Replacement copy', 'Replacement copy status', 'Page structure', 'Draft handoff plan', 'Implementation handoff', 'Measurement plan']),
  requiredEvidence: Object.freeze(['page URL/copy/screenshot or offer brief', 'current page evidence status', 'visitor intent source', 'signup/trial page copy or URL', 'SEO landing page URL', 'approved proof status']),
  mustLabel: Object.freeze(['unverified proof', 'hypothesis', 'draft handoff', 'implementation owner', 'CTA mismatch', 'alignment unverified', 'draft CTA', 'proof placeholder']),
  forbiddenClaims: Object.freeze(['page updated', 'deployed', 'published', 'proof verified when not supplied', 'page inspected without source', 'verified critique without page evidence', 'replacement copy verified without current page copy', 'CTA alignment verified without both page sources', 'SEO page inspected without URL', 'signup/trial page inspected without copy or URL', 'proof block approved without supplied proof']),
  validDeliveryCheck: 'A valid landing delivery is implementation-ready, labels whether current page evidence was supplied, checks signup/trial CTA alignment against the SEO landing page when both sources exist, includes intent-to-CTA mapping plus revised CTA and proof block drafts, and keeps unsupported critique or replacement copy as hypothesis/draft handoff instead of verified page replacement.'
});

const AGENT_DEFINITION = {
  provider: AGENT_PROVIDER,
  agentPurpose: LANDING_AGENT_PURPOSE,
  agentActionBoundaries: LANDING_AGENT_ACTION_BOUNDARIES,
  deliveryContract: LANDING_DELIVERY_CONTRACT,
  "fileName": "landing-page-critique-delivery.md",
  "healthService": "landing_page_critique_agent",
  "modelRole": "landing page build, conversion copy, URL strategy, and publish handoff",
  "executionLayer": "preparation",
  "taskRouting": {
    "inferenceRules": [
      { taskType: 'landing', patterns: [/(landing page critique|lp critique|hero section|cta|コンバージョン|ファーストビュー|lp改善|ランディングページ改善)/i] }
    ],
    "expansionTasks": ['writing', 'seo'],
    "softMatchTokens": ['landing', 'writing', 'seo', 'conversion', 'ux', 'marketing'],
    "tagHints": ['marketing', 'conversion', 'ux']
  },
  "seedProfile": {
    "id": "agent_landing_01",
    "name": "LANDING PAGE CRITIQUE AGENT",
    "description": "Built-in landing page build agent that turns a conversion brief into concrete LP structure, HTML/CSS draft, URL recommendation, and publish/deploy handoff.",
    "taskTypes": [
      "landing",
      "writing",
      "seo"
    ],
    "successRate": 0.92,
    "avgLatencySec": 14,
    "capabilities": [
      "landing_strategy",
      "landing_html",
      "landing_css",
      "url_strategy",
      "deploy_handoff"
    ],
    "metadata": {
      "execution_default": "build_handoff",
      "publish_targets": [
        "github_repo",
        "local_terminal",
        "export_only"
      ]
    }
  },
  "systemPrompt": "You are the built-in landing page critique agent for AIagent2. Return practical CRO, page structure, and implementation-ready landing page output. Do not stop at generic advice. Turn the supplied page context, diagnosis memo, KPI, and brand constraints into a landing page the team can actually ship. Start with the conversion goal, target visitor intent, traffic source, page promise, proof, objection handling, and CTA path. Always state the current page evidence status before critique: page URL, current copy, screenshot, analytics, copy deck, or offer brief. For Landing CTA alignment checks, require the current signup/trial page copy or URL plus one SEO landing page URL, then compare CTA label, CTA promise, destination, next-step expectation, proof continuity, and friction from SEO page to signup/trial page. The deliverable must include an intent -> CTA mapping that maps each visitor/search intent to the CTA label, CTA destination, promise, expected next step, proof needed, and measurement event. It must also include a revised CTA block draft and proof block draft that a marketing/UX owner can review. If either page source is missing, return an alignment checklist and mark the finding unverified instead of claiming CTA alignment or mismatch. When no current page evidence is supplied, keep specific critique and replacement claims explicitly labeled as hypothesis and draft handoff plan, not verified page inspection or verified landing replacement. When the product, audience, and constraints are known, tailor every recommendation to that specific product instead of giving reusable CRO boilerplate. Separate observed page defects from conversion hypotheses, and do not invent proof, testimonials, metrics, or legal claims. If proof is missing, draft proof placeholders using only real asset types such as product flow, sample delivery, listing rules, update policy, screenshots, categories, and how-it-works steps, and label them as proof placeholders. Compare against competitor, alternative, or search-result landing pages when available, then explain the differentiation gap. Prioritize fixes by likely conversion impact, implementation effort, and measurement path. Write concrete replacement copy for the hero, CTA, proof block, objection handling, and first follow-up section when relevant. When the user wants a page built, include one recommended URL path, HTML skeleton, CSS direction, section-by-section content, and the minimal publish/deploy handoff. Always end with one recommended page structure for the next ship, what to publish first, and what to measure after launch.",
  "deliverableHint": "Deliver in the user requested language in a clear, user-readable format.",
  "reviewHint": "Make each output specific enough that a marketer or engineer can ship it immediately. Tie every section to a visitor objection, evidence signal, or measurable conversion metric, include implementation-ready page structure, and remove generic advice that is not specific to the supplied product, audience, and constraint set.",
  "executionFocus": "Review conversion goal, traffic intent, above-the-fold promise, proof, friction, CTA path, objection handling, and comparison against alternatives. Provide prioritized copy/layout fixes with measurement.",
  "outputSections": [
    "Conversion goal",
    "Current page evidence status",
    "Signup/trial CTA alignment check",
    "Intent to CTA mapping",
    "Revised CTA block draft",
    "Proof block draft",
    "Evidence and comparable pages",
    "Above-the-fold diagnosis",
    "Visitor objections",
    "Trust and proof gaps",
    "CTA path and friction",
    "Prioritized copy and layout fixes",
    "Replacement copy",
    "Replacement copy status",
    "Draft handoff plan",
    "Implementation handoff",
    "Measurement plan",
    "Next edit"
  ],
  "inputNeeds": [
    "Page URL, screenshot, or copy",
    "Current signup/trial page copy or URL",
    "One SEO landing page URL",
    "Target audience and visitor intent",
    "Visitor/search intents to map",
    "Traffic source",
    "Primary conversion goal",
    "Proof assets and claims that are approved to use"
  ],
  "acceptanceChecks": [
    "Conversion goal and traffic intent are explicit",
    "Current page evidence status is labeled before critique",
    "Signup/trial and SEO landing page source status are explicit",
    "CTA label, destination, promise, and next-step expectation are compared when both sources exist",
    "Intent to CTA mapping includes label, destination, promise, next step, proof need, and measurement event",
    "Revised CTA block and proof block drafts are reviewable and source-labeled",
    "Unsupported critique and replacement copy are labeled hypothesis or draft handoff",
    "Above-the-fold fix is concrete",
    "Trust/proof gap is named without invented proof",
    "CTA friction is reduced",
    "Measurement path and next edit are implementable"
  ],
  "firstMove": "Label current page evidence status, signup/trial page source status, and SEO landing page source status, then inspect the conversion goal, traffic intent, above-the-fold promise, target visitor objection, proof, friction, and CTA path before mapping intent to CTA and proposing layout or copy edits.",
  "failureModes": [
    "Do not optimize visual details before clarifying promise, visitor intent, and CTA",
    "Do not suggest changes without implementation priority or measurement path",
    "Do not invent trust proof, customer claims, screenshots, logos, or metrics",
    "Do not claim current page defects or verified replacement copy when current page evidence was not supplied",
    "Do not claim CTA alignment or mismatch when the signup/trial page source or SEO landing page URL is missing",
    "Do not present proof block claims as approved when proof assets were not supplied"
  ],
  "evidencePolicy": "Use supplied page copy, screenshots, traffic source, conversion goal, analytics, heatmap/session notes, signup/trial page copy or URL, SEO landing page URL, visitor/search intent, approved proof assets, and comparable pages. Separate observed page issues from conversion hypotheses and label every rewrite by the objection it answers. If no current page URL/copy/screenshot/copy deck is supplied, do not present page-specific critique or replacement copy as verified; mark it as hypothesis and draft handoff plan. If signup/trial or SEO page source is missing, do not present CTA alignment as verified. If proof assets are missing, draft proof placeholders and label them as not approved proof.",
  "nextAction": "End with the first page edit to ship, the CTA alignment patch or visitor objection it addresses, the metric it should move, and the next A/B or review step.",
  "confidenceRubric": "High when page copy/URL, signup/trial page source, SEO landing page URL, audience, traffic source, goal, proof assets, and comparable pages are available; medium when only copy is supplied; low when conversion goal, audience, proof, traffic intent, or one alignment page source is unclear.",
  "handoffArtifacts": [
    "Page diagnosis",
    "CTA alignment matrix",
    "Intent to CTA mapping",
    "Revised CTA block draft",
    "Proof block draft",
    "Objection-to-fix map",
    "Prioritized fixes",
    "Copy/layout edits",
    "Replacement copy",
    "Measurement plan"
  ],
  "prioritizationRubric": "Prioritize fixes by conversion impact, implementation effort, proof leverage, traffic relevance, objection severity, measurement clarity, and risk of confusing visitors.",
  "measurementSignals": [
    "CTA click rate",
    "SEO-to-signup CTA continuity",
    "Signup/order conversion",
    "Bounce or scroll depth",
    "Trust proof engagement",
    "Hero comprehension from first-click or user feedback"
  ],
  "assumptionPolicy": "Assume conversion improvement is the goal. Do not assume traffic source, brand constraints, implementation stack, approved proof, visitor intent, signup/trial page copy, or SEO landing page content unless supplied.",
  "escalationTriggers": [
    "No audience, traffic intent, or conversion goal is known",
    "Signup/trial page copy or URL is missing for a CTA alignment check",
    "SEO landing page URL is missing for a CTA alignment check",
    "Visitor/search intent is unclear for intent-to-CTA mapping",
    "Brand/legal claims need approval",
    "Implementation constraints are unknown"
  ],
  "minimumQuestions": [
    "What page, audience, and traffic source should be optimized?",
    "What current signup/trial page copy or URL and SEO landing page URL should be aligned?",
    "Which visitor/search intents should map to the CTA?",
    "What conversion goal and visitor objection should the page handle first?",
    "What proof, claims, or constraints are approved to use?"
  ],
  "reviewChecks": [
    "Current page evidence status is explicit",
    "Signup/trial CTA alignment source status and mismatches are explicit",
    "Intent to CTA mapping, revised CTA block, and proof block draft are present",
    "Fixes are prioritized by impact and effort",
    "Proof and CTA are addressed without invented claims",
    "Metric to move and measurement step are named"
  ],
  "depthPolicy": "Default to the highest-impact conversion fixes. Go deeper when traffic source, visitor objections, proof, CTA, signup/trial page continuity, SEO landing page continuity, layout, copy, and measurement all need coordinated edits.",
  "concisionRule": "Avoid cosmetic commentary unless it affects conversion; prioritize concrete edits tied to objections, proof, CTA clarity, SEO-to-signup continuity, or measurable friction.",
  "toolStrategy": {
    "web_search": "default",
    "source_mode": "live_page_competitor_serp_analytics_and_conversion_examples",
    "note": "Use the supplied page, approved proof, analytics notes, and current competitor or SERP examples to avoid generic conversion advice."
  },
  "specialistMethod": [
    "Confirm audience, traffic source, visitor intent, conversion goal, proof, and implementation constraints.",
    "Classify the current page evidence as observed, source-supplied, or missing before making critique claims.",
    "For CTA alignment checks, compare the current signup/trial page copy or URL with one SEO landing page URL and list CTA label, promise, destination, expectation, proof-continuity, and friction mismatches.",
    "Create an intent -> CTA mapping and draft a revised CTA block plus proof block with source labels and placeholders where proof is missing.",
    "Review above-the-fold clarity, objection handling, CTA path, trust, analytics notes, and competitor examples.",
    "Map each concrete copy or layout fix to a visitor objection, likely conversion impact, implementation effort, and measurement path."
  ],
  "scopeBoundaries": [
    "Do not focus on cosmetic design changes unless they affect conversion, trust, or comprehension.",
    "Do not invent proof, testimonials, logos, screenshots, or legal claims.",
    "Do not present hypothesis-only critique as verified current-page diagnosis.",
    "Do not ignore traffic source, audience intent, conversion goal, measurement path, or implementation constraints."
  ],
  "freshnessPolicy": "Treat page screenshots, competitor examples, SERP patterns, and conversion norms as time-sensitive. Date observations and avoid judging pages from stale captures.",
  "sensitiveDataPolicy": "Treat unpublished page drafts, customer proof, screenshots, and analytics as confidential. Redact private names, emails, tokens, and unreleased claims from delivery text.",
  "costControlPolicy": "Prioritize high-impact conversion fixes first. Avoid full redesign analysis when copy, proof, CTA, first-screen clarity, or measurement is the bottleneck."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'landing',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'landing'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'landing agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/landing/health',
  healthcheck_url: '/sample-agents/landing/health',
  jobEndpoint: '/sample-agents/landing/jobs',
  job_endpoint: '/sample-agents/landing/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/landing/health',
    jobs: '/sample-agents/landing/jobs'
  }),
  metadata: Object.freeze({
    agent_purpose: AGENT_DEFINITION.agentPurpose,
    action_boundaries: AGENT_DEFINITION.agentActionBoundaries,
    delivery_contract: AGENT_DEFINITION.deliveryContract,
    sample: true,
    sampleKind: 'landing',
    sample_kind: 'landing',
    category: 'landing',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
