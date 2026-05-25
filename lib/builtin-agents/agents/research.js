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
      cost_control_policy: definition.costControlPolicy || null,
      search_provider: agentProviderText(source.BRAVE_API_KEY || source.BUILTIN_BRAVE_API_KEY) ? 'brave_configured' : 'brave_unconfigured'
    };
  },

  async runJob({ kind = '', definition = {}, body = {}, source = {} } = {}) {
    const prompt = agentProviderPrompt(body);
    const japanese = agentProviderJapanese(agentProviderLanguageText(body, prompt));
    const seed = agentProviderObject(definition.seedProfile);
    const name = agentProviderText(seed.name || definition.healthService || kind, kind || 'agent');
    const searchRequired = agentProviderResearchSearchRequired(body);
    const webSources = await agentProviderCollectResearchSources(body, source, { searchRequired });
    if (searchRequired && !webSources.length) {
      const failure = 'missing_required_search_sources';
      return {
        accepted: false,
        status: 'failed',
        summary: failure,
        error: failure,
        failure_reason: failure,
        report: {
          summary: failure,
          bullets: [failure],
          nextAction: '',
          confidence: 'low',
          web_sources: []
        },
        files: [],
        usage: {
          total_cost_basis: 0,
          compute_cost: 0,
          tool_cost: 0,
          labor_cost: 0,
          api_cost: 0
        },
        return_targets: ['chat', 'api'],
        runtime: {
          mode: 'provider_contract',
          provider: 'agent_file',
          kind,
          service: definition.healthService || null,
          file_name: definition.fileName || null,
          failure_category: failure
        }
      };
    }
    const delivery = await agentProviderGenerateDelivery(kind, definition, body, source, { webSources, searchRequired });
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

function agentProviderBraveConfig(source = {}) {
  const sourceObj = agentProviderObject(source);
  const apiKey = agentProviderText(sourceObj.BUILTIN_BRAVE_API_KEY || sourceObj.BRAVE_API_KEY || sourceObj.brave_api_key);
  if (!apiKey) return null;
  const endpoint = agentProviderText(
    sourceObj.BUILTIN_BRAVE_SEARCH_ENDPOINT || sourceObj.BRAVE_SEARCH_ENDPOINT || sourceObj.brave_search_endpoint,
    'https://api.search.brave.com/res/v1/web/search'
  );
  return { apiKey, endpoint };
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
    source_collection_strategy: agentProviderResearchSourceCollectionStrategy(body, {
      webSources,
      searchRequired: Boolean(options.searchRequired)
    }),
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

function agentProviderResearchSearchRequired(body = {}) {
  const workflow = body?.input?._broker?.workflow && typeof body.input._broker.workflow === 'object'
    ? body.input._broker.workflow
    : {};
  const sourceCollectionContract = body.source_collection_contract
    || body.sourceCollectionContract
    || workflow.sourceCollectionContract
    || workflow.source_collection_contract
    || null;
  if (
    workflow.forceWebSearch === true
    || workflow.requiresWebSearch === true
    || workflow.searchRequired === true
    || workflow.requiresSourceCollection === true
    || sourceCollectionContract?.required === true
  ) return true;
  const rules = JSON.stringify(body.quality_rules || body.qualityRules || body.downstream_handoff_summary_contract || sourceCollectionContract || {});
  return /web_sources|required search|search-required|source collection|source_collection/i.test(rules);
}

async function agentProviderCollectResearchSources(body = {}, source = {}, options = {}) {
  const suppliedSources = agentProviderResearchSources(body);
  const config = agentProviderBraveConfig(source);
  if (!config || options.searchRequired !== true) return suppliedSources;
  const braveSources = await agentProviderBraveResearchSources(body, config).catch(() => []);
  return agentProviderMergeResearchSources([...braveSources, ...suppliedSources], 12);
}

async function agentProviderBraveResearchSources(body = {}, config = {}) {
  const queries = agentProviderResearchQueries(body).slice(0, 3);
  const sources = [];
  for (const query of queries) {
    const url = new URL(config.endpoint);
    url.searchParams.set('q', query);
    url.searchParams.set('count', '5');
    url.searchParams.set('text_decorations', 'false');
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'x-subscription-token': config.apiKey
      }
    });
    if (!response.ok) continue;
    const payload = await response.json().catch(() => ({}));
    const results = Array.isArray(payload?.web?.results) ? payload.web.results : [];
    for (const item of results) {
      sources.push({
        url: item.url || item.link || item.href || '',
        title: item.title || item.name || 'Brave search result',
        snippet: item.description || item.snippet || item.summary || '',
        query,
        action: 'brave_web_search',
        provider: 'brave_search'
      });
    }
  }
  return agentProviderMergeResearchSources(sources, 8);
}

function agentProviderResearchQueries(body = {}) {
  const prompt = agentProviderPrompt(body);
  const broker = body?.input?._broker && typeof body.input._broker === 'object' ? body.input._broker : {};
  const workflow = broker.workflow && typeof broker.workflow === 'object' ? broker.workflow : {};
  const queryContainers = [
    body.search_queries,
    body.searchQueries,
    body.input?.search_queries,
    body.input?.searchQueries,
    workflow.search_queries,
    workflow.searchQueries
  ];
  const queries = [];
  const add = (value = '') => {
    const text = agentProviderText(value).replace(/\s+/g, ' ').slice(0, 180);
    if (text && !queries.some((item) => item.toLowerCase() === text.toLowerCase())) queries.push(text);
  };
  for (const container of queryContainers) {
    if (Array.isArray(container)) {
      for (const item of container) add(typeof item === 'string' ? item : (item?.query || item?.q || item?.keyword));
    } else if (typeof container === 'string') {
      add(container);
    }
  }
  const urlHost = agentProviderHost(agentProviderPrimaryUrl(body));
  const target = urlHost && !/^the target service$/i.test(urlHost) ? urlHost : '';
  const channel = agentProviderFirstMatch(prompt, [
    /(?:priority channel|優先チャネル)\s*[:：]\s*([^\n]+)/i,
    /(SEO|organic search|SNS|social|ads?|広告|自然検索|ソーシャル)/i
  ]);
  const audience = agentProviderFirstMatch(prompt, [
    /(?:target audience|対象ユーザー)\s*[:：]\s*([^\n]+)/i,
    /(developers?|founders?|small SaaS|開発者|創業者|技術ユーザー)/i
  ]);
  const decision = agentProviderPublicBrief(body).replace(/^Research\s+/i, '').slice(0, 120);
  if (target && channel) add(`${target} ${channel} competitor acquisition`);
  if (target) add(`${target} competitors market positioning`);
  if (audience) add(`${audience} AI agent marketplace demand`);
  add(decision || prompt);
  return queries.slice(0, 4);
}

function agentProviderResearchSourceCollectionStrategy(body = {}, options = {}) {
  return {
    provider: options.searchRequired ? 'brave_search_or_supplied_sources' : 'supplied_sources',
    required: Boolean(options.searchRequired),
    query_plan: agentProviderResearchQueries(body).slice(0, 3),
    source_count: Array.isArray(options.webSources) ? options.webSources.length : 0,
    synthesis_target: 'answer-first 3C diagnosis with downstream-ready recommendations'
  };
}

function agentProviderResearchSources(body = {}) {
  const sources = [];
  const seen = new Set();
  const push = (source = {}, fallback = {}) => {
    if (!source) return;
    const value = typeof source === 'string' ? { url: source } : source;
    if (!value || typeof value !== 'object') return;
    const rawUrl = agentProviderText(value.url || value.link || value.href || value.siteUrl || value.site || value.source_url || value.sourceUrl || fallback.url);
    const domainUrl = agentProviderUrlFromSearchConsoleDomain(rawUrl);
    const url = agentProviderCleanUrl(domainUrl || rawUrl);
    const title = agentProviderText(value.title || value.name || value.label || fallback.title, url ? 'Source context' : 'Source query');
    const snippet = agentProviderText(value.snippet || value.description || value.summary || fallback.snippet);
    const query = agentProviderText(value.query || value.search_query || value.searchQuery || fallback.query);
    const action = agentProviderText(value.action || value.source_action || value.sourceAction || fallback.action, 'source_collection');
    const provider = agentProviderText(value.provider || value.search_provider || value.searchProvider || fallback.provider, 'agent_file_source_collection');
    if (!url && !title && !snippet && !query) return;
    const key = [url, title, snippet, query].join('|').toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    sources.push({ url, title, snippet, query, action, provider });
  };

  const broker = body?.input?._broker && typeof body.input._broker === 'object' ? body.input._broker : {};
  const workflow = broker.workflow && typeof broker.workflow === 'object' ? broker.workflow : {};
  const handoff = workflow.leaderHandoff && typeof workflow.leaderHandoff === 'object' ? workflow.leaderHandoff : {};
  const containers = [
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
  ];
  for (const container of containers) {
    if (Array.isArray(container)) {
      for (const item of container) push(item, { action: 'source_collection' });
    }
  }
  for (const run of [
    ...(Array.isArray(handoff.priorRuns) ? handoff.priorRuns : []),
    ...(Array.isArray(handoff.priorDeliverables) ? handoff.priorDeliverables : [])
  ]) {
    for (const item of Array.isArray(run?.webSources) ? run.webSources : []) {
      push(item, { title: run?.taskType || run?.workflowTask || 'Prior specialist source', action: 'prior_source_collection', provider: 'leader_handoff' });
    }
  }
  for (const context of [
    ...(Array.isArray(body.input?.connectorContexts) ? body.input.connectorContexts : []),
    ...(Array.isArray(body.input?.appContexts) ? body.input.appContexts : []),
    ...(Array.isArray(broker.appContexts) ? broker.appContexts : []),
    ...(Array.isArray(broker.connectorContexts) ? broker.connectorContexts : [])
  ]) {
    if (!context || typeof context !== 'object') continue;
    const raw = context.raw_context && typeof context.raw_context === 'object'
      ? context.raw_context
      : (context.rawContext && typeof context.rawContext === 'object' ? context.rawContext : {});
    const contextProvider = context.source_app || context.sourceApp || 'app_context';
    const normalizedContextProvider = String(contextProvider || '').trim().toLowerCase().replace(/-/g, '_');
    for (const value of [raw.googleSearchConsoleSite, raw.siteUrl, raw.site, raw.url, context.url]) {
      push(String(value || ''), {
        title: context.title || context.summary || context.source_app_label || context.source_app || 'Attached source context',
        snippet: context.summary || 'Source URL carried by attached app/connector context.',
        action: 'source_collection',
        provider: contextProvider
      });
    }
    for (const rawUrl of agentProviderExtractUrls(agentProviderContextEvidenceText(context))) {
      push(rawUrl, {
        title: context.title || context.source_app_label || 'Attached source context',
        snippet: context.summary || 'Source URL carried by attached app/connector context.',
        action: 'source_collection',
        provider: contextProvider
      });
    }
    for (const row of agentProviderContextArtifactRows(context)) {
      const rowText = JSON.stringify(row);
      const rowUrls = agentProviderExtractUrls(rowText);
      const query = agentProviderText(row.query || row.search_query || row.searchQuery || row.keyword || row.term);
      const snippet = agentProviderText(row.note || row.snippet || row.summary || row.description);
      if (!rowUrls.length && !query) continue;
      for (const rawUrl of rowUrls.length ? rowUrls : ['']) {
        push({ url: rawUrl, query, snippet }, {
          title: query ? `Search Console query: ${query}` : 'Connector evidence row',
          action: normalizedContextProvider === 'analytics_console' ? 'google_search_console' : 'source_collection',
          provider: contextProvider
        });
      }
    }
  }
  const textSources = [
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
    workflow.objective
  ].map((item) => String(item || '')).join('\n');
  for (const rawUrl of agentProviderExtractUrls(textSources)) {
    push(rawUrl, {
      title: 'Source URL from research prompt',
      snippet: 'URL supplied in the research request or workflow context.',
      action: 'source_collection',
      provider: 'prompt_context'
    });
  }
  return sources.slice(0, 8);
}

function agentProviderMergeResearchSources(sources = [], limit = 8) {
  const merged = [];
  const seen = new Set();
  for (const source of Array.isArray(sources) ? sources : []) {
    if (!source || typeof source !== 'object') continue;
    const url = agentProviderCleanUrl(source.url || source.link || source.href || source.source_url || source.sourceUrl || '');
    const title = agentProviderText(source.title || source.name || source.label, url ? 'Source context' : 'Source query');
    const snippet = agentProviderText(source.snippet || source.description || source.summary);
    const query = agentProviderText(source.query || source.search_query || source.searchQuery);
    if (!url && !title && !snippet && !query) continue;
    const key = [url, title, snippet, query].join('|').toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({
      url,
      title,
      snippet,
      query,
      action: agentProviderText(source.action || source.source_action || source.sourceAction, 'source_collection'),
      provider: agentProviderText(source.provider || source.search_provider || source.searchProvider, 'agent_file_source_collection')
    });
    if (merged.length >= limit) break;
  }
  return merged;
}

function agentProviderContextEvidenceText(context = {}) {
  const parts = [
    context.title,
    context.summary,
    context.source_app_label,
    ...(Array.isArray(context.facts) ? context.facts : []),
    ...(Array.isArray(context.assumptions) ? context.assumptions : [])
  ];
  const raw = context.raw_context && typeof context.raw_context === 'object'
    ? context.raw_context
    : (context.rawContext && typeof context.rawContext === 'object' ? context.rawContext : {});
  parts.push(...Object.values(raw || {}));
  return parts.map((item) => {
    if (item == null) return '';
    if (typeof item === 'string') return item;
    try {
      return JSON.stringify(item);
    } catch {
      return String(item || '');
    }
  }).join('\n');
}

function agentProviderContextArtifactRows(context = {}) {
  const rows = [];
  for (const artifact of Array.isArray(context.artifacts) ? context.artifacts : []) {
    if (!artifact || typeof artifact !== 'object') continue;
    if (Array.isArray(artifact.rows)) rows.push(...artifact.rows.filter((row) => row && typeof row === 'object'));
  }
  return rows.slice(0, 40);
}

function agentProviderUrlFromSearchConsoleDomain(value = '') {
  const text = String(value || '').trim();
  const match = text.match(/^sc-domain:([a-z0-9.-]+)$/i);
  return match ? `https://${match[1]}/` : '';
}

function agentProviderCleanUrl(value = '') {
  const text = String(value || '').trim().replace(/\\?["'].*$/g, '').replace(/[),.;\]]+$/g, '');
  if (!text) return '';
  const fromDomain = agentProviderUrlFromSearchConsoleDomain(text);
  if (fromDomain) return fromDomain;
  if (/^https?:\/\//i.test(text)) return text;
  return '';
}

function agentProviderExtractUrls(value = '') {
  const urls = [];
  const text = String(value || '');
  const pattern = /(https?:\/\/[^\s<>)\]"'\\]+|sc-domain:[a-z0-9.-]+)/ig;
  let match;
  while ((match = pattern.exec(text))) {
    const url = agentProviderCleanUrl(match[1]);
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
  "fileName": "research-delivery.md",
  "healthService": "research_agent",
  "modelRole": "research and market analysis",
  "executionLayer": "research",
  "agentPurpose": "Answer with source-aware, decision-oriented research that separates current facts, supplied evidence, inference, confidence, options, recommendations, verification gaps, source-access boundaries, and decision handoff.",
  "agentActionBoundaries": Object.freeze([
    Object.freeze({
      id: "prepare_source_backed_memo",
      mode: "research_memo",
      requires: Object.freeze(["question_or_decision", "source_status", "date_or_freshness_need"]),
      prepares: Object.freeze(["answer_first_summary", "source_ledger", "confidence_labels", "source_limited_decision_summary"]),
      produces: Object.freeze(["source_backed_research_memo"]),
      cannotClaim: Object.freeze(["current_fact_verified_without_source", "generic_market_summary_as_current_evidence", "verified_market_demand_without_source_proof"]),
      authorityBoundary: "Research cannot present source-sensitive facts as certain or substitute generic market background for current evidence without supplied or verified sources."
    }),
    Object.freeze({
      id: "prepare_decision_recommendation",
      mode: "decision_support",
      requires: Object.freeze(["options", "criteria", "verification_gaps"]),
      prepares: Object.freeze(["option_comparison", "recommendation", "next_verification"]),
      produces: Object.freeze(["research_decision_packet"]),
      cannotClaim: Object.freeze(["decision_executed"]),
      authorityBoundary: "Recommendation does not execute the decision."
    }),
    Object.freeze({
      id: "prepare_verification_queue",
      mode: "evidence_followup",
      requires: Object.freeze(["unverified_claims", "freshness_risk", "decision_impact"]),
      prepares: Object.freeze(["verification_tasks", "source_priority", "confidence_upgrade_path"]),
      produces: Object.freeze(["research_verification_queue"]),
      cannotClaim: Object.freeze(["verification_completed_without_source"]),
      authorityBoundary: "Follow-up verification tasks do not make unverified claims certain until sources are checked."
    }),
    Object.freeze({
      id: "prepare_decision_handoff_packet",
      mode: "decision_handoff",
      requires: Object.freeze(["recommendation", "source_access_state", "next_owner_or_decision_maker"]),
      prepares: Object.freeze(["decision_handoff_packet", "source_access_boundary", "execution_status_labels"]),
      produces: Object.freeze(["research_decision_handoff_packet"]),
      cannotClaim: Object.freeze(["decision_adopted_without_owner_approval", "source_access_granted_without_connector_proof", "recommendation_implemented_without_execution_proof"]),
      authorityBoundary: "Research can hand off a recommendation and source gap queue, but cannot claim owner approval, source access, or implementation without proof."
    })
  ]),
  "deliveryContract": Object.freeze({
    requiredDeliverySections: Object.freeze(["Answer first", "Source status", "Source ledger", "Current vs inferred facts", "Options", "Recommendation", "Verification queue", "Verification gaps", "Source access boundary", "Decision handoff packet", "Execution status labels"]),
    requiredEvidence: Object.freeze(["source status/date or missing-source label", "confidence basis", "verification priority for source gaps", "source-limited answer when current sources are missing", "source access or connector proof boundary", "decision owner and next verification handoff"]),
    mustLabel: Object.freeze(["current", "supplied", "inferred", "unverified", "source missing", "owner approval needed", "not implemented"]),
    forbiddenClaims: Object.freeze(["browsed without evidence", "current fact verified without source", "generic market demand summary presented as current evidence", "market demand conclusion before source collection queue", "verified market demand without source proof", "verification completed without source", "source access granted without connector proof", "decision adopted without owner approval", "recommendation implemented without execution proof"]),
    validDeliveryCheck: "A valid research delivery labels evidence freshness, separates inference from verified facts, avoids generic market summaries when sources are missing, puts the source collection queue before any market-demand conclusion, and gives the next owner a source-access boundary plus decision handoff without implying approval or execution."
  }),
  "taskRouting": {
    "inferenceRules": [
      { taskType: 'research', patterns: [/(research|compare|analysis|investigate|市場|比較|調査|戦略)/i] },
      { taskType: 'summary', patterns: [/(summary|要約|まとめ|recap|digest)/i] }
    ],
    "expansionTasksByTask": {
      research: ['summary']
    },
    "softMatchTokensByTask": {
      research: ['research', 'analysis', 'summary'],
      summary: ['summary', 'synthesis', 'recap', 'final_report']
    },
    "tagHintsByTask": {
      research: ['research', 'analysis', 'evidence'],
      summary: ['summary', 'synthesis', 'research']
    }
  },
  "seedProfile": {
    "id": "agent_research_01",
    "name": "RESEARCH AGENT",
    "description": "Built-in decision-support research agent that turns source evidence into answer-first 3C diagnosis, service-specific improvement directions, and prioritized recommendations.",
    "taskTypes": [
      "research",
      "summary"
    ],
    "successRate": 0.95,
    "avgLatencySec": 8,
    "capabilities": [
      "answer_first_research",
      "source_status_note",
      "option_comparison",
      "decision_recommendation",
      "three_c_diagnosis",
      "service_specific_improvement_plan",
      "preparation_inputs"
    ],
    "metadata": {
      "layer": "research",
      "output_contract": [
        "Answer first",
        "Source status",
        "Source ledger",
        "Current vs inferred facts",
        "Options",
        "Recommendation",
        "Verification queue",
        "Verification gaps",
        "Source access boundary",
        "Decision handoff packet",
        "Execution status labels"
      ],
      "connector_behavior": "Use supplied context first and verify current public facts when freshness changes the answer. Return a diagnosis-and-recommendation memo that connects evidence to concrete changes for the target service, not a generic background summary."
    }
  },
  "systemPrompt": "You are the built-in research agent for AIagent2. Return decision-ready research output, not a generic background note. If the user asks a direct factual question, answer the most likely interpretation immediately in the first sentence. For business, marketing, growth, SEO, or product research, your job is not only to summarize sources; it is to convert source evidence into a service-specific diagnosis and improvement proposal. Start with the answer, then separate owned/user data, public/search evidence, competitor evidence, assumptions, and confidence. When current sources are missing, give a source-limited decision answer: state what can be inferred from supplied context, label what is not verified, and put the source collection queue before any market-demand conclusion. Do not replace missing current evidence with generic market background, skip the source collection queue before a demand conclusion, or claim verified market demand without source proof. When doing 3C analysis, each of Company, Customer, and Competitor must include evidence, interpretation, problem for this service, improvement direction, concrete actions, and KPI. After 3C, return 3-5 prioritized recommendations with impact, effort, confidence, why now, first action, and stop rule. If conversions are zero or the conversion path is unclear, include conversion-path repair before acquisition expansion. Include a source access boundary that says which sources were supplied, missing, stale, or connector-dependent. Include a decision handoff packet for the next owner with the decision to make, evidence to review, source gaps, approval condition, and first action. Label recommendations as not implemented until owner approval and execution proof exist. Do not output duplicated sections, raw search-result dumps, unexplained counts, or contradictions. Do not leak the original task prompt into the analysis. When freshness matters, label what was verified versus what remains an assumption, and state the observation date or source window. Do not claim to have browsed the web unless web search is available and used, or the prompt explicitly includes source material. If the task is underspecified, state assumptions briefly and continue.",
  "deliverableHint": "Deliver in the user requested language in a clear, user-readable format.",
  "reviewHint": "Tighten the answer, evidence status, 3C diagnosis, service-specific improvement directions, prioritized recommendations, source-access boundary, decision handoff, and concrete next inputs. Remove duplicated sections, unexplained counts, contradictions, raw source-list dominance, and any claim that a recommendation was approved or implemented.",
  "executionFocus": "Start with the answer and the strongest service-specific recommendation. Then show evidence status, 3C diagnosis, improvement directions, prioritized actions, source-access boundary, decision handoff, and the concrete next inputs.",
  "outputSections": [
    "Answer first",
    "Source status",
    "Source ledger",
    "Current vs inferred facts",
    "Options",
    "Recommendation",
    "Verification queue",
    "Verification gaps",
    "Source access boundary",
    "Decision handoff packet",
    "Execution status labels"
  ],
  "inputNeeds": [
    "Question or decision to answer",
    "Region, market, or time range",
    "Allowed source types",
    "Comparison criteria",
    "Output format"
  ],
  "acceptanceChecks": [
    "Answer-first claim is explicit",
    "Evidence and source status are clear",
    "Assumptions are labeled",
    "3C analysis connects evidence to service-specific problems and improvements",
    "Prioritized recommendations include impact, effort, confidence, first action, KPI, and stop rule",
    "Decision handoff names the next owner, source gaps, approval condition, and implementation status"
  ],
  "firstMove": "Identify the exact decision or question first. If this is business or marketing research, state the most important improvement recommendation first, then gather or use sources to support the 3C diagnosis.",
  "failureModes": [
    "Do not bury the direct answer after background",
    "Do not invent citations or pretend to browse",
    "Do not turn missing current sources into a generic market demand summary",
    "Do not ignore date, region, or source freshness when they affect the answer",
    "Do not stop at search synthesis when the task needs business improvement recommendations",
    "Do not recommend acquisition expansion before conversion-path repair when conversions are zero",
    "Do not claim owner approval, source access, or implementation without explicit proof"
  ],
  "evidencePolicy": "Use current, verifiable sources when facts are time-sensitive. State source dates or evidence status and distinguish direct evidence from inference.",
  "nextAction": "End with the top recommendation, the next-owner handoff packet, the concrete preparation artifact that should be produced next, and the single source or check that would most improve confidence.",
  "confidenceRubric": "High when scope, date range, source quality, and comparison criteria are verified; medium when current sources are partial; low when freshness, region, or source access materially changes the answer.",
  "handoffArtifacts": [
    "Answer-first summary",
    "Source/evidence map",
    "Assumptions and uncertainty",
    "Decision recommendation",
    "3C diagnosis table",
    "Prioritized improvement plan",
    "Preparation inputs",
    "Source access boundary",
    "Decision handoff packet",
    "Execution status labels"
  ],
  "prioritizationRubric": "Prioritize claims by decision impact, evidence quality, freshness, region fit, and whether the answer would change with better sources.",
  "measurementSignals": [
    "Source quality",
    "Freshness",
    "Decision confidence",
    "Assumption count"
  ],
  "assumptionPolicy": "Assume a neutral research stance and the most common interpretation of the question. Do not assume region, date range, or source freshness when those change the answer.",
  "escalationTriggers": [
    "Current facts or prices are required but sources are unavailable",
    "Region or date range changes the answer",
    "The question has high-stakes legal, medical, or financial implications"
  ],
  "minimumQuestions": [
    "What exact decision should the research answer?",
    "Which region, market, and time range should apply?",
    "Are current sources required?"
  ],
  "reviewChecks": [
    "Answer appears first",
    "Evidence status is explicit",
    "Recommendation maps to the decision"
  ],
  "depthPolicy": "Default to answer-first synthesis. Go deeper when the decision is source-sensitive, current, comparative, or high-stakes.",
  "concisionRule": "Keep background short; put the answer, evidence status, assumptions, and recommendation before optional detail.",
  "toolStrategy": {
    "web_search": "brave_when_configured",
    "source_mode": "current_web_or_user_sources",
    "note": "Use Brave Search when configured for source-required research; otherwise use supplied sources and explicitly label the source gap."
  },
  "specialistMethod": [
    "Convert the user question into the exact decision, scope, date range, and comparison criteria.",
    "Check current or supplied sources before analysis when facts can change.",
    "Answer first, then separate evidence, assumptions, uncertainty, 3C diagnosis, and prioritized recommendations.",
    "For each 3C item, connect evidence to interpretation, service problem, improvement direction, specific actions, and KPI.",
    "Limit the final recommendations to the few actions that should change the target service or preparation queue now.",
    "Hand off the decision with owner, source gaps, approval condition, and not-implemented status so a downstream operator knows exactly what can be acted on."
  ],
  "scopeBoundaries": [
    "Do not present stale or unsourced current facts as certain.",
    "Do not turn research support into medical, legal, financial, or safety-critical advice.",
    "Do not bury the direct answer behind background when the user asked a specific factual question.",
    "Do not imply sources were accessible, decisions were approved, or recommendations were implemented without proof."
  ],
  "freshnessPolicy": "For prices, rankings, laws, market facts, or recent events, use current sources and state the observation date or source date before drawing conclusions.",
  "sensitiveDataPolicy": "Minimize personal data, internal company facts, and paid-source excerpts. Summarize sensitive inputs at the level needed for the decision and do not expose raw private material.",
  "costControlPolicy": "Spend effort on source checks only where freshness or decision impact changes the answer. Prefer concise answer-first synthesis over exhaustive background collection."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'research',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'research'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'research agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/research/health',
  healthcheck_url: '/sample-agents/research/health',
  jobEndpoint: '/sample-agents/research/jobs',
  job_endpoint: '/sample-agents/research/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/research/health',
    jobs: '/sample-agents/research/jobs'
  }),
  metadata: Object.freeze({
    agent_purpose: AGENT_DEFINITION.agentPurpose,
    action_boundaries: AGENT_DEFINITION.agentActionBoundaries,
    delivery_contract: AGENT_DEFINITION.deliveryContract,
    output_contract: AGENT_DEFINITION.deliveryContract.requiredDeliverySections,
    sample: true,
    sampleKind: 'research',
    sample_kind: 'research',
    category: 'research',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
