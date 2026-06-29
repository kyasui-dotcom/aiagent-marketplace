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
      cost_control_policy: definition.costControlPolicy || null,
      search_provider: agentProviderText(source.BRAVE_SEARCH_API_KEY || source.BRAVE_API_KEY || source.BUILTIN_BRAVE_API_KEY) ? 'brave_configured' : 'brave_unconfigured'
    };
  },

  async runJob({ kind = '', definition = {}, body = {}, source = {} } = {}) {
    const prompt = agentProviderPrompt(body);
    const japanese = agentProviderJapanese(agentProviderLanguageText(body, prompt));
    const seed = agentProviderObject(definition.seedProfile);
    const name = agentProviderText(seed.name || definition.healthService || kind, kind || 'agent');
    const webSources = await agentProviderCollectListSources(body, source);
    const generatedDelivery = await agentProviderGenerateDelivery(kind, definition, body, source, {
      webSources,
      sourceCollectionStrategy: agentProviderListSourceCollectionStrategy(body, source, { webSources })
    });
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

function agentProviderBraveConfig(source = {}) {
  const sourceObj = agentProviderObject(source);
  const apiKey = agentProviderText(sourceObj.BUILTIN_BRAVE_API_KEY || sourceObj.BRAVE_SEARCH_API_KEY || sourceObj.BRAVE_API_KEY || sourceObj.brave_search_api_key || sourceObj.brave_api_key);
  if (!apiKey) return null;
  const endpoint = agentProviderText(
    sourceObj.BUILTIN_BRAVE_SEARCH_ENDPOINT || sourceObj.BRAVE_SEARCH_ENDPOINT || sourceObj.BRAVE_API_ENDPOINT || sourceObj.brave_search_endpoint,
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

function agentProviderNormalizeGeneratedDelivery(payload = {}, fallbackName = '', options = {}) {
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
  const artifacts = Array.isArray(data?.artifacts) ? data.artifacts.filter((item) => item && typeof item === 'object') : [];
  const leadOpsArtifacts = agentProviderListCreatorLeadOpsArtifacts(fileMarkdown, options);
  return {
    summary: agentProviderText(data?.summary, title),
    reportSummary: agentProviderText(data?.report_summary || data?.reportSummary, title),
    bullets,
    nextAction: agentProviderText(data?.next_action || data?.nextAction || data?.recommended_next_action),
    fileMarkdown,
    contentType: agentProviderText(data?.content_type || data?.contentType, 'agent_delivery'),
    artifacts: agentProviderMergeGeneratedArtifacts([...artifacts, ...leadOpsArtifacts]),
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
  const leadAcquisitionRequest = agentProviderLeadAcquisitionRequest(body);
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
    lead_acquisition_request: leadAcquisitionRequest || null,
    evidence_sources: webSources.slice(0, 16),
    source_collection_strategy: options.sourceCollectionStrategy || agentProviderListSourceCollectionStrategy(body, source, { webSources }),
    prior_context: agentProviderPriorContextForGeneration(body),
    leader_synthesis: options.leaderSynthesis || null,
    lead_ops_return_contract: {
      app_id: 'lead-ops-console',
      artifact_types: ['lead_rows', 'evidence_urls', 'next_actions'],
      return_packet: 'lead_ops_packet',
      markdown_table_columns: ['company_name', 'website', 'why_fit', 'observed_signal', 'target_role_hypothesis', 'public_email_or_contact_path', 'contact_source_url', 'company_specific_angle', 'review_status', 'next_action'],
      status_boundary: 'Rows are sourced for review only: not approved, not imported, not enriched, not queued, and not contacted.'
    },
    delivery_quality_gate: {
      required_sections: agentProviderList(definition.deliveryContract?.requiredDeliverySections),
      required_evidence: agentProviderList(definition.deliveryContract?.requiredEvidence),
      must_label: agentProviderList(definition.deliveryContract?.mustLabel),
      forbidden_claims: agentProviderList(definition.deliveryContract?.forbiddenClaims),
      valid_delivery_check: agentProviderText(definition.deliveryContract?.validDeliveryCheck)
    },
    output_contract: 'Return a completed user-facing Markdown deliverable for this step. The raw agent delivery file is shown to the user and is also reused by downstream agents, so it must read like the requested deliverable, not an internal handoff note. Use prior user-facing deliverables as source material, include required sections/evidence labels when relevant, and keep any structured handoff data separate from the Markdown body. Do not return workflow prompts, provider implementation notes, orchestration logs, internal QA text, or snake_case handoff fields as the deliverable. For List Creator lead work, include a Reviewable lead rows table using the lead_ops_return_contract columns so Lead Ops can reopen the rows; when machine artifacts are returned, use types lead_rows, evidence_urls, next_actions, and lead_ops_packet.'
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
    const normalized = agentProviderNormalizeGeneratedDelivery(payload, name, { kind, body, webSources, leadAcquisitionRequest });
    return normalized || { error: 'openai_delivery_generation_failed' };
  } catch (error) {
    const message = agentProviderText(error?.message, 'OpenAI delivery generation failed.');
    return { error: 'openai_delivery_generation_failed', detail: message };
  }
}

async function agentProviderCollectListSources(body = {}, source = {}) {
  const suppliedSources = agentProviderWebSources(body);
  const config = agentProviderBraveConfig(source);
  if (!config || agentProviderListSearchDisabled(body)) return suppliedSources;
  const braveSources = await agentProviderBraveListSources(body, config).catch(() => []);
  return agentProviderMergeListSources([...braveSources, ...suppliedSources], 16);
}

async function agentProviderBraveListSources(body = {}, config = {}) {
  const queries = agentProviderListSourceQueries(body).slice(0, 3);
  const sources = [];
  for (const query of queries) {
    const url = new URL(config.endpoint);
    url.searchParams.set('q', query);
    url.searchParams.set('count', '6');
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
        title: item.title || item.name || 'Brave prospect source',
        snippet: item.description || item.snippet || item.summary || '',
        query,
        action: 'brave_lead_source_search',
        provider: 'brave_search'
      });
    }
  }
  return agentProviderMergeListSources(sources, 12);
}

function agentProviderLeadAcquisitionRequest(body = {}) {
  const found = agentProviderFindLeadAcquisitionRequest(body, 0);
  if (!found || typeof found !== 'object' || Array.isArray(found)) return null;
  const targetSegment = agentProviderText(found.target_segment || found.targetSegment || found.icp || found.target_customer || found.targetCustomer);
  const sourcePolicy = agentProviderText(found.source_policy || found.sourcePolicy || found.sources_to_use || found.sourcesToUse || found.allowed_sources || found.allowedSources);
  const offer = agentProviderText(found.offer_or_contact_reason || found.offerOrContactReason || found.offer || found.contact_reason || found.contactReason);
  if (!targetSegment && !sourcePolicy && !offer) return null;
  const targetCount = Number(found.target_count || found.targetCount || found.requested_count || found.requestedCount || found.count || 20);
  return {
    target_segment: targetSegment,
    source_policy: sourcePolicy,
    target_count: Number.isFinite(targetCount) && targetCount > 0 ? Math.min(500, Math.round(targetCount)) : 20,
    region_or_language: agentProviderText(found.region_or_language || found.regionOrLanguage || found.region || found.geography || found.country),
    offer_or_contact_reason: offer,
    exclusions: agentProviderText(found.exclusions || found.exclude || found.exclusion_rules || found.exclusionRules),
    required_fields: agentProviderList(found.required_fields || found.requiredFields),
    output_contract: agentProviderObject(found.output_contract || found.outputContract)
  };
}

function agentProviderFindLeadAcquisitionRequest(value, depth = 0) {
  if (!value || depth > 7) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = agentProviderFindLeadAcquisitionRequest(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof value !== 'object') return null;
  const type = agentProviderText(value.type || value.artifact_type || value.artifactType).toLowerCase();
  if (type === 'lead_acquisition_request') return value;
  for (const key of ['lead_acquisition_request', 'leadAcquisitionRequest', 'lead_sourcing_request', 'leadSourcingRequest', 'lead_generation_request', 'leadGenerationRequest']) {
    if (value[key] && typeof value[key] === 'object') return value[key];
  }
  for (const key of ['raw_context', 'rawContext', 'input', '_broker', 'workflow', 'context', 'received_context', 'receivedContext', 'artifacts', 'appContexts', 'connectorContexts']) {
    const found = agentProviderFindLeadAcquisitionRequest(value[key], depth + 1);
    if (found) return found;
  }
  return null;
}

function agentProviderMergeGeneratedArtifacts(artifacts = []) {
  const merged = [];
  const seen = new Set();
  for (const artifact of artifacts) {
    if (!artifact || typeof artifact !== 'object') continue;
    const typeKey = [
      artifact.type,
      artifact.artifact_type,
      artifact.artifactType,
      artifact.item_type,
      artifact.itemType
    ].map((item) => String(item || '').trim().toLowerCase()).filter(Boolean).join('|');
    const key = /^lead_/.test(typeKey)
      ? typeKey
      : [artifact.id, typeKey].map((item) => String(item || '').trim().toLowerCase()).filter(Boolean).join('|') || JSON.stringify(artifact).slice(0, 200);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(artifact);
  }
  return merged;
}

function agentProviderListCreatorLeadOpsArtifacts(markdown = '', options = {}) {
  const request = options.leadAcquisitionRequest || agentProviderLeadAcquisitionRequest(options.body || {});
  const rows = agentProviderLeadRowsFromMarkdown(markdown, request);
  if (!rows.length && !request) return [];
  const evidenceUrls = rows
    .map((row) => ({
      company: row.company,
      url: row.evidence_url || row.contact_source_url || row.website,
      source_url: row.evidence_url || row.contact_source_url || row.website,
      status: row.evidence_url || row.contact_source_url || row.website ? 'source_attached' : 'source_needed'
    }))
    .filter((item) => item.company || item.url);
  const nextActions = rows.length
    ? rows.map((row) => ({
      company: row.company,
      next_action: row.next_action || 'Review this sourced row in Lead Ops before approval, import, or outreach.',
      status: row.review_status || row.status || 'needs_review'
    }))
    : [{ next_action: 'Collect concrete public source URLs before creating lead rows.', status: 'blocked_missing_source_rows' }];
  const artifacts = [];
  if (rows.length) {
    artifacts.push({
      id: 'list-creator-lead-rows',
      surface: 'lead',
      type: 'lead_rows',
      artifact_type: 'lead_rows',
      item_type: 'lead_rows',
      title: 'Reviewable Lead Rows',
      body: markdown,
      rows,
      metadata: {
        lead_rows_count: rows.length,
        target_segment: request?.target_segment || '',
        review_status: 'needs_review',
        import_status: 'not_imported',
        outreach_status: 'not_contacted'
      }
    });
  }
  artifacts.push({
    id: 'list-creator-lead-ops-packet',
    surface: 'lead',
    type: 'lead_ops_packet',
    artifact_type: 'lead_ops_packet',
    item_type: 'lead_ops_packet',
    title: rows.length ? 'Lead Ops Review Packet' : 'Lead Ops Source Gap Packet',
    body: markdown,
    lead_rows: rows,
    leadRows: rows,
    evidence_urls: evidenceUrls,
    next_actions: nextActions,
    request,
    metadata: {
      target_segment: request?.target_segment || '',
      lead_rows_count: rows.length,
      review_status: rows.length ? 'needs_review' : 'blocked_missing_source_rows',
      approval_status: 'not_approved',
      import_status: 'not_imported',
      enrichment_status: 'not_enriched',
      queue_status: 'not_queued',
      contact_status: 'not_contacted'
    }
  });
  return artifacts;
}

function agentProviderLeadRowsFromMarkdown(markdown = '', request = null) {
  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
  const rows = [];
  for (let index = 0; index < lines.length - 1; index += 1) {
    const headerLine = lines[index] || '';
    const separatorLine = lines[index + 1] || '';
    if (!/^\s*\|/.test(headerLine) || !/^\s*\|?\s*:?-{3,}:?\s*\|/.test(separatorLine)) continue;
    const headers = agentProviderSplitMarkdownRow(headerLine).map(agentProviderNormalizeHeader);
    if (!headers.some((header) => ['company', 'company_name', 'lead', 'name'].includes(header))) continue;
    if (!headers.some((header) => /contact|email|source|evidence|website|url|why_fit|observed_signal/.test(header))) continue;
    for (let rowIndex = index + 2; rowIndex < lines.length; rowIndex += 1) {
      const rowLine = lines[rowIndex] || '';
      if (!/^\s*\|/.test(rowLine)) break;
      const cells = agentProviderSplitMarkdownRow(rowLine);
      if (!cells.length || cells.every((cell) => !cell)) continue;
      const rawRow = {};
      headers.forEach((header, cellIndex) => {
        if (header) rawRow[header] = cells[cellIndex] || '';
      });
      const row = agentProviderNormalizeLeadRow(rawRow, rows.length, request);
      if (row) rows.push(row);
    }
    if (rows.length) break;
  }
  return rows;
}

function agentProviderSplitMarkdownRow(row = '') {
  return String(row || '').trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(agentProviderMarkdownCellText);
}

function agentProviderMarkdownCellText(value = '') {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 $2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function agentProviderNormalizeHeader(value = '') {
  return agentProviderMarkdownCellText(value).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function agentProviderRowValue(row = {}, names = []) {
  for (const name of names) {
    const value = agentProviderText(row[name]);
    if (value) return value;
  }
  return '';
}

function agentProviderNormalizeLeadRow(row = {}, index = 0, request = null) {
  const company = agentProviderRowValue(row, ['company', 'company_name', 'name', 'lead', 'lead_name', 'target']);
  if (!company) return null;
  const website = agentProviderRowValue(row, ['website', 'url', 'company_url', 'domain']);
  const contact = agentProviderRowValue(row, ['public_email_or_contact_path', 'contact', 'email', 'contact_path', 'safe_contact_path']);
  const contactSourceUrl = agentProviderRowValue(row, ['contact_source_url', 'contact_source', 'source_url', 'evidence_url', 'source']);
  const evidenceUrl = agentProviderRowValue(row, ['evidence_url', 'source_url', 'contact_source_url', 'source']) || website;
  const whyFit = agentProviderRowValue(row, ['why_fit', 'fit', 'qualification_reason', 'reason']);
  const observedSignal = agentProviderRowValue(row, ['observed_signal', 'signal', 'evidence']);
  const angle = agentProviderRowValue(row, ['company_specific_angle', 'angle', 'message_angle']);
  const reviewStatus = agentProviderRowValue(row, ['review_status', 'row_approval_state', 'approval_state', 'status']) || 'needs_review';
  const nextAction = agentProviderRowValue(row, ['next_action', 'next_step', 'owner_next_action']) || 'Review source evidence and approval state in Lead Ops.';
  return {
    id: `list-creator-row-${index + 1}`,
    company,
    company_name: company,
    segment: request?.target_segment || agentProviderRowValue(row, ['segment', 'persona', 'icp']) || 'List Creator lead row',
    website,
    contact,
    public_email_or_contact_path: contact || 'contact missing',
    contact_source_url: contactSourceUrl || evidenceUrl,
    evidence_url: evidenceUrl,
    why_fit: whyFit,
    fit: whyFit || observedSignal,
    observed_signal: observedSignal,
    target_role_hypothesis: agentProviderRowValue(row, ['target_role_hypothesis', 'target_role', 'role']),
    company_specific_angle: angle,
    review_status: reviewStatus,
    status: /approved/i.test(reviewStatus) ? 'review' : reviewStatus,
    owner: agentProviderRowValue(row, ['owner', 'approval_owner']) || 'Lead Ops reviewer',
    next_action: nextAction,
    channel: 'email',
    consent: contact && !/missing|needed|none/i.test(contact) ? 'public_business_contact' : 'needs_review',
    send_mode: 'manual_approval'
  };
}

function agentProviderListSearchDisabled(body = {}) {
  const broker = body?.input?._broker && typeof body.input._broker === 'object' ? body.input._broker : {};
  const workflow = broker.workflow && typeof broker.workflow === 'object' ? broker.workflow : {};
  return body.disable_web_search === true
    || body.disableWebSearch === true
    || body.input?.disable_web_search === true
    || body.input?.disableWebSearch === true
    || workflow.disableWebSearch === true
    || workflow.disable_web_search === true;
}

function agentProviderListSourceQueries(body = {}) {
  const prompt = agentProviderPrompt(body);
  const input = body.input && typeof body.input === 'object' ? body.input : {};
  const broker = input._broker && typeof input._broker === 'object' ? input._broker : {};
  const workflow = broker.workflow && typeof broker.workflow === 'object' ? broker.workflow : {};
  const leadRequest = agentProviderLeadAcquisitionRequest(body);
  const queries = [];
  const add = (value = '') => {
    const text = agentProviderText(value).replace(/\s+/g, ' ').slice(0, 180);
    if (text && !queries.some((item) => item.toLowerCase() === text.toLowerCase())) queries.push(text);
  };
  for (const container of [
    body.search_queries,
    body.searchQueries,
    input.search_queries,
    input.searchQueries,
    workflow.search_queries,
    workflow.searchQueries
  ]) {
    if (Array.isArray(container)) {
      for (const item of container) add(typeof item === 'string' ? item : (item?.query || item?.q || item?.keyword));
    } else if (typeof container === 'string') {
      add(container);
    }
  }
  const targetSegment = agentProviderText(input.target_segment || input.targetSegment || leadRequest?.target_segment || agentProviderFirstMatch(prompt, [
    /(?:target segment|ICP|audience|対象|ターゲット)\s*[:：]\s*([^\n]+)/i,
    /(startup founders?|solo founders?|small agencies?|SaaS founders?|AI agencies?|B2B SaaS|スタートアップ|創業者|中小企業|制作会社)/i
  ]), 'target companies');
  const geography = agentProviderText(input.geography || input.region || input.country || leadRequest?.region_or_language || agentProviderFirstMatch(prompt, [
    /(?:geography|region|country|area|地域|国|エリア)\s*[:：]\s*([^\n]+)/i,
    /(Japan|Tokyo|United States|US|UK|日本|東京|米国|アメリカ)/i
  ]));
  const sourcePolicy = agentProviderText(input.source_policy || input.sourcePolicy || leadRequest?.source_policy || 'public company pages directories');
  const offer = agentProviderText(input.offer || input.product || input.service || leadRequest?.offer_or_contact_reason || agentProviderFirstMatch(prompt, [
    /(?:for|selling|offer|product|service|商材|サービス)\s*[:：]\s*([^\n]+)/i,
    /(AI agent setup|AI automation|managed agent|agent marketplace|workflow automation|AI自動化|AIエージェント)/i
  ]), 'the offer');
  add(`${[geography, targetSegment, offer, 'company directory contact'].filter(Boolean).join(' ')}`);
  add(`${[targetSegment, 'public email contact page founder company'].filter(Boolean).join(' ')}`);
  add(`${[targetSegment, sourcePolicy, 'pricing hiring startup'].filter(Boolean).join(' ')}`);
  return queries.slice(0, 4);
}

function agentProviderListSourceCollectionStrategy(body = {}, source = {}, options = {}) {
  const braveConfigured = Boolean(agentProviderBraveConfig(source));
  const disabled = agentProviderListSearchDisabled(body);
  return {
    provider: braveConfigured && !disabled ? 'brave_search_plus_supplied_sources' : 'supplied_sources_only',
    search_enabled: braveConfigured && !disabled,
    query_plan: agentProviderListSourceQueries(body).slice(0, 3),
    source_count: Array.isArray(options.webSources) ? options.webSources.length : 0,
    row_policy: 'Use collected public URLs as candidate companies or directories; produce reviewable rows when sources exist and use source-gap labels only when no row-level public source is available.',
    contact_policy: 'Capture only public business email or safe contact paths; never infer private personal emails.'
  };
}

function agentProviderMergeListSources(sources = [], limit = 16) {
  const merged = [];
  const seen = new Set();
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;
    const url = agentProviderCleanSourceUrl(source.url || source.link || source.href || '');
    const title = agentProviderText(source.title || source.name || source.label, url ? 'Prospect source' : 'Source query');
    const snippet = agentProviderText(source.snippet || source.description || source.summary);
    const query = agentProviderText(source.query || source.search_query || source.searchQuery);
    const key = [url, title, snippet, query].join('|').toLowerCase();
    if ((!url && !title && !snippet && !query) || seen.has(key)) continue;
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

const LIST_CREATOR_AGENT_PURPOSE = 'Prepare source-traceable prospect or target lists with row-level evidence, qualification reasons, field schema, review status, Lead Ops return packets, downstream handoff, and import/outreach proof boundary.';

const LIST_CREATOR_AGENT_ACTION_BOUNDARIES = Object.freeze([
  Object.freeze({
    id: 'prepare_public_source_list_brief',
    mode: 'research_preparation',
    requires: Object.freeze(['target_segment', 'source_policy']),
    prepares: Object.freeze(['source_plan', 'qualification_rules', 'field_schema', 'row_source_ledger']),
    produces: Object.freeze(['prospect_list_brief_packet', 'lead_ops_packet']),
    cannotClaim: Object.freeze(['verified private data', 'approved lead list', 'imported contacts', 'sent outreach']),
    authorityBoundary: 'List entries require cited public sources or explicit supplied data; approval, import, enrichment, and outreach are separate.'
  }),
  Object.freeze({
    id: 'prepare_list_review_handoff',
    mode: 'handoff_only',
    requires: Object.freeze(['reviewed_rows_or_source_plan', 'approval_owner']),
    prepares: Object.freeze(['review_checklist', 'exclusion_reason_log', 'import_boundary', 'outreach_boundary']),
    produces: Object.freeze(['list_review_handoff_packet', 'lead_rows', 'evidence_urls', 'next_actions']),
    cannotClaim: Object.freeze(['lead list approved', 'CRM imported', 'email sent', 'DM sent']),
    authorityBoundary: 'CRM import and outreach require connector proof and compliance approval.'
  }),
  Object.freeze({
    id: 'prepare_crm_or_outreach_import_packet',
    mode: 'proof_handoff_only',
    requires: Object.freeze(['reviewable_rows', 'row_source_ledger', 'approval_owner', 'destination_system']),
    prepares: Object.freeze(['crm_field_map', 'duplicate_or_suppression_review', 'row_approval_state', 'downstream_owner_handoff', 'execution_proof_tracker']),
    produces: Object.freeze(['crm_or_outreach_import_review_packet', 'lead_ops_packet']),
    cannotClaim: Object.freeze(['approved', 'deduplicated', 'enriched', 'CRM imported', 'outreach queued', 'outreach sent']),
    authorityBoundary: 'The import packet is a reviewable handoff for a CRM, cold_email, or manual operator; it is not proof of approval, dedupe completion, enrichment, import, queueing, or contact.'
  })
]);

const LIST_CREATOR_DELIVERY_CONTRACT = Object.freeze({
  requiredDeliverySections: Object.freeze(['Target segment', 'Source policy', 'Qualification rules', 'Field schema', 'Row-level source ledger', 'Exclusion and duplicate review', 'Review status', 'Approval owner', 'Import/outreach boundary', 'Downstream handoff packet', 'Lead Ops return packet', 'Execution proof tracker', 'Next owner']),
  requiredEvidence: Object.freeze(['source policy', 'qualification criteria', 'source URL and source date or explicit gap per row', 'observed fit signal per row', 'public contact source or contact-missing label', 'exclusion or duplicate-risk reason when applicable', 'approval owner before import or outreach', 'Lead Ops fields lead_rows, evidence_urls, next_actions, and lead_ops_packet when returning from a Lead Ops request', 'proof fields for CRM import, enrichment, queueing, or outreach']),
  mustLabel: Object.freeze(['unverified row', 'source needed', 'contact missing', 'duplicate risk', 'approval required', 'not approved', 'not imported', 'not enriched', 'not contacted', 'lead_ops_packet prepared for review', 'connector proof missing']),
  forbiddenClaims: Object.freeze(['private data verified', 'lead list approved', 'row verified', 'duplicate checked without evidence', 'contact enriched', 'CRM imported', 'outreach queued', 'outreach sent', 'ready to import without approval and connector proof']),
  validDeliveryCheck: 'A valid list creator delivery is traceable row by row, reviewable before any import or outreach, and includes approval ownership, Lead Ops-compatible return fields, downstream field mapping, and execution-proof requirements.'
});

const AGENT_DEFINITION = {
  provider: AGENT_PROVIDER,
  agentPurpose: LIST_CREATOR_AGENT_PURPOSE,
  agentActionBoundaries: LIST_CREATOR_AGENT_ACTION_BOUNDARIES,
  deliveryContract: LIST_CREATOR_DELIVERY_CONTRACT,
  "fileName": "list-creator-delivery.md",
  "healthService": "list_creator_agent",
  "modelRole": "public-source lead sourcing, public contact capture, homepage qualification, and reviewable lead-row creation",
  "executionLayer": "preparation",
  "taskRouting": {
    "expansionTasks": ['research', 'data_analysis', 'summary'],
    "softMatchTokens": ['list_creator', 'lead_sourcing', 'lead_qualification', 'company_list_builder', 'prospect_research', 'lead_list', 'prospect_list'],
    "tagHints": ['research', 'lead_generation', 'data']
  },
  "seedProfile": {
    "id": "agent_list_creator_01",
    "name": "LIST CREATOR AGENT",
    "description": "Built-in lead-list creation agent that turns ICP, public sources, and homepage qualification into reviewable company-by-company lead rows, targeting notes, row-level evidence, Lead Ops return packets, and proof-ready handoff packets for outbound specialists.",
    "taskTypes": [
      "list_creator",
      "lead_sourcing",
      "lead_qualification",
      "company_list_builder",
      "prospect_research",
      "marketing",
      "research"
    ],
    "successRate": 0.92,
    "avgLatencySec": 18,
    "optionalConnectors": [
      "csv_export",
      "google_search_console",
      "ga4"
    ],
    "capabilities": [
      "public_source_rule",
      "company_qualification",
      "target_role_notes",
      "public_contact_capture",
      "public_email_capture",
      "contact_source_trace",
      "company_specific_angle",
      "row_source_ledger",
      "approval_owner_handoff",
      "crm_cold_email_field_map",
      "execution_proof_tracker",
      "reviewable_lead_rows",
      "lead_ops_return_contract",
      "lead_ops_packet",
      "import_ready_packet"
    ],
    "metadata": {
      "layer": "research",
      "downstream_task_types": [
        "cold_email"
      ],
      "list_mode": "public_source_review_required",
      "contact_capture_mode": "public_contact_only",
      "estimate_mode": "20_company_batches",
      "default_company_count": 20,
      "max_company_count": 500,
      "baseline_cost_basis_per_batch": {
        "total_cost_basis": 64,
        "compute_cost": 16,
        "tool_cost": 14,
        "labor_cost": 34,
        "api_cost": 0
      },
      "package_estimates": [
        {
          "companies": 20,
          "batches": 1,
          "total_cost_basis": 64
        },
        {
          "companies": 50,
          "batches": 3,
          "total_cost_basis": 192
        },
        {
          "companies": 100,
          "batches": 5,
          "total_cost_basis": 320
        }
      ],
      "output_default": "reviewable_lead_rows"
    }
  },
  "systemPrompt": "You are the built-in List Creator Agent in AIagent2. Turn an ICP and outbound objective into reviewable company-by-company lead rows, not mass scraping advice, for the user's product or service. When lead_acquisition_request is present, treat it as the authoritative Lead Ops sourcing order and return data that can reopen in Lead Ops. Start from ICP, geography, business model, requested company count, 20-company batch estimate, public-source rules, exclusion rules, duplicate-risk checks, approval owner, and the exact conversion point the downstream cold-email specialist will pursue. Use collected evidence_sources, public company pages, category pages, directories, profile pages, pricing pages, docs, hiring pages, list pages, and other allowed public sources to qualify fit. If source_collection_strategy.search_enabled is true, treat Brave Search results in evidence_sources as candidate sourcing material and produce reviewable rows from the concrete public URLs when they contain company, directory, profile, or contact-path evidence. Prefer company-level qualification over guessed personal-email discovery. When a public contact method exists, capture it explicitly: a published work email, contact form URL, team page email, or publicly visible profile contact path. Public LinkedIn profile or company-page contact details are allowed only when visible without login-only scraping or hidden extraction. Return a reviewable list packet: company name, URL, source date or freshness gap, why it fits, what signal was observed, target role hypothesis, public email or safe contact path, contact-source URL, company-specific angle, exclusion or duplicate-risk notes, row approval state, and downstream field map. For Lead Ops return, include a Reviewable lead rows table with company_name, website, why_fit, observed_signal, target_role_hypothesis, public_email_or_contact_path, contact_source_url, company_specific_angle, review_status, and next_action; structured artifacts should use lead_rows, evidence_urls, next_actions, and lead_ops_packet. Never convert search queries, delivery file names, handoff summaries, source documents, or generic category labels into lead rows. If no concrete public URLs are supplied or collected, return BLOCKED_MISSING_SOURCE_ROWS with the exact sourcing gap and source plan instead of fake rows; do not block merely because prior research omitted URLs when evidence_sources now contains search-collected candidate URLs. Do not recommend purchased lists, unsafe scraping, hidden enrichment, personal-email guessing, or pretending a list was approved, deduplicated, enriched, imported, queued, or contacted. Do not extract private, gated, or non-public profile contact data. When this run comes from a leader workflow, send the reviewed lead rows, CRM/cold_email field map, approval owner, Lead Ops return packet, and execution proof tracker back to the leader, Lead Ops, or cold_email specialist for the next step. The proof tracker must name fields needed later, such as row approval id, CRM import id, enrichment source, suppression result, sequence queue id, outreach message id, and reviewer timestamp. Optimize for a small high-fit list that a human can review one company at a time before any send happens.",
  "deliverableHint": "Deliver in the user requested language in a clear, user-readable format.",
  "reviewHint": "Keep this on sourcing, qualification, public contact capture, row-level evidence, and clear 20-company batch estimates. Do not drift into send advice, unsafe enrichment, gated-profile scraping, or fake completion claims. The output should feel like a reviewable lead sheet plus a downstream handoff packet for CRM or cold-email execution.",
  "executionFocus": "Build a small, reviewable lead sheet from public sources. Estimate in 20-company batches, qualify one company at a time, capture public email/contact paths with source URLs when available, label approval/import/contact status, and hand review-ready rows plus proof fields to cold_email or CRM review.",
  "outputSections": [
    "Answer-first list strategy",
    "Estimate and batch plan",
    "ICP and source rules",
    "Company qualification criteria",
    "Public contact capture rules",
    "Target-role notes",
    "Reviewable lead rows",
    "Row-level source ledger",
    "Import-ready field map",
    "Exclusion and duplicate review",
    "Approval owner",
    "Execution proof tracker",
    "Lead Ops return packet",
    "Exclusions and risk controls",
    "Next handoff"
  ],
  "inputNeeds": [
    "Outbound objective and ICP",
    "Requested company count or default 20-company batch",
    "Allowed public sources",
    "Lead Ops lead_acquisition_request when opened from Lead Ops",
    "Allowed public contact surfaces such as website, list pages, or public profiles",
    "Geography and company filters",
    "Target role or buying committee",
    "Exclusion rules",
    "Approval owner for list review, CRM import, enrichment, and outreach handoff",
    "Destination system such as CRM, CSV, cold_email, or manual review",
    "Next owner target such as cold_email or CRM import review"
  ],
  "acceptanceChecks": [
    "ICP, geography, public-source rules, and batch estimate are explicit",
    "Each lead row is reviewable and company-specific",
    "Search queries, delivery titles, and handoff summaries are not used as lead rows",
    "Public email or safe contact path plus source trace are captured when available",
    "Target role and outreach angle are captured per company",
    "Each row includes source date or freshness gap, approval state, exclusion or duplicate-risk note, and next owner",
    "CRM/cold_email field map separates source evidence, row approval, duplicate/suppression review, action request, and proof fields",
    "Lead Ops requests return lead_rows, evidence_urls, next_actions, and a lead_ops_packet or a blocked source-gap packet",
    "Output says not approved, not imported, not enriched, not queued, not contacted unless proof is supplied",
    "Unsafe list tactics are excluded"
  ],
  "firstMove": "Set the outbound objective, ICP, geography, requested company count, batch estimate, allowed public-source rules, allowed public contact surfaces, exclusion filters, approval owner, and destination system before sourcing. Qualify each company with an observed signal, source date or freshness gap, target-role hypothesis, public email or safe contact path, contact-source URL, company-specific angle, duplicate-risk note, and row approval state.",
  "failureModes": [
    "Do not recommend purchased lists, unsafe scraping, or personal-email guessing",
    "Do not extract private, login-gated, or hidden profile contact details",
    "Do not pretend lead rows were approved, imported, deduplicated, enriched, verified, queued, or contacted",
    "Do not turn search queries, internal delivery file names, source titles, or generic categories into company rows",
    "Do not collapse company qualification into generic industry buckets without row-level fit signals"
  ],
  "evidencePolicy": "Use public company pages, directory pages, pricing pages, docs, hiring pages, founder/team pages, list pages, and publicly visible profile/contact surfaces. Each lead row should cite the fit signal, source URL, source date or freshness gap, the public email or contact path if found, exclusion or duplicate-risk note, row approval state, and what remains unverified.",
  "nextAction": "End with the requested companies to review, the batch/count estimate, why each fits, the target role hypothesis, the public email or safe contact path, the contact-source URL, the import-ready field map, Lead Ops return packet status, approval owner, proof fields to capture, not-approved/not-imported/not-enriched/not-contacted labels, and whether the next handoff should go to Lead Ops, cold_email, CRM import review, or manual review.",
  "confidenceRubric": "High when ICP, geography, public source rules, target count, and conversion point are defined and rows include source-backed fit signals; medium when rows are plausible but need review; low when source rules or ICP are missing.",
  "handoffArtifacts": [
    "Reviewable lead rows",
    "Why-fit evidence",
    "Public contact path and source URL",
    "Company-specific angle",
    "Lead Ops lead_rows/evidence_urls/next_actions/lead_ops_packet",
    "Import-ready field map",
    "Exclusion and duplicate-risk notes",
    "Approval owner handoff",
    "Execution proof tracker"
  ],
  "prioritizationRubric": "ICP fit, observed public signal strength, reachable contact path, relevance to the offer, safety/compliance, and ease of human review.",
  "measurementSignals": [
    "Qualified rows produced",
    "Rows approved after review",
    "Public contact coverage",
    "Reply or meeting conversion after downstream outreach",
    "Rejected-row reasons"
  ],
  "assumptionPolicy": "If target count or geography is missing, assume a small 20-company review batch and state the assumed region/source boundary before listing rows.",
  "escalationTriggers": [
    "The user asks for personal-email guessing, unsafe scraping, purchased lists, or gated-profile extraction.",
    "No ICP, geography, or source boundary is available.",
    "A requested source requires login, hidden extraction, or platform-rule violations."
  ],
  "minimumQuestions": [
    "Who is the ICP and target geography?",
    "How many companies should be in the first review batch?",
    "What public sources and contact paths are allowed?"
  ],
  "reviewChecks": [
    "Rows are company-specific rather than industry buckets.",
    "Every contact path has a public source or is marked missing.",
    "No approval, import, enrichment, queueing, send, contact, or verification is claimed without proof.",
    "Cold-email or CRM review fields are present."
  ],
  "depthPolicy": "Go deep enough to make a small reviewable lead sheet useful: define the ICP, source rules, row schema, evidence signal, source date, contact path, angle, exclusion and duplicate notes, approval owner, downstream field map, proof tracker, and handoff. Avoid broad lead-generation theory.",
  "concisionRule": "Use compact row tables and short evidence notes; avoid long sourcing methodology unless it changes approval or compliance.",
  "toolStrategy": {
    "web_search": "default",
    "source_mode": "public_company_pages_directories_profile_pages_pricing_docs_hiring_pages_and_allowed_public_sources",
    "note": "Use current public pages and allowed source lists to qualify companies one by one. Do not scrape gated or hidden personal data, and do not claim rows were imported or contacted."
  },
  "specialistMethod": [
    "Confirm the outbound objective, ICP, geography, requested company count, 20-company batch estimate, allowed public sources, target role, and exclusion rules before sourcing.",
    "When lead_acquisition_request is present, preserve its target segment, source policy, target count, region, offer, exclusions, required fields, and Lead Ops return contract in the final handoff.",
    "Use only concrete public URLs or supplied company/media records as row candidates; if the handoff only contains queries, summaries, or file names, return a source-gap packet instead of rows.",
    "Qualify companies one by one using public signals from company pages, pricing pages, hiring pages, docs, directories, or other allowed sources.",
    "Return reviewable lead rows with why-fit evidence, target-role hypothesis, public email or safe contact path, contact-source URL, source date or freshness gap, company-specific angle, exclusion or duplicate-risk notes, row approval state, and unresolved verification notes.",
    "For Lead Ops requests, return a Reviewable lead rows table and machine handoff fields named lead_rows, evidence_urls, next_actions, and lead_ops_packet whenever structured artifacts are supported.",
    "Package downstream handoff data as a field map with row approval, CRM import, enrichment, suppression, queueing, outreach, and proof fields separated.",
    "Do not imply approval, import, enrichment, queueing, or send authority; hand the reviewable rows to cold_email, CRM import review, or manual review next."
  ],
  "scopeBoundaries": [
    "Do not recommend purchased lists, unsafe scraping, or personal-email guessing.",
    "Do not extract private, login-gated, or hidden profile contact details.",
    "Do not imply that leads were approved, imported, deduplicated, verified, enriched, queued, or contacted when they were only sourced from public information.",
    "Do not collapse row-level qualification into generic industry buckets without company-specific evidence."
  ],
  "freshnessPolicy": "Treat company pages, public contacts, hiring signals, pricing pages, and directory entries as time-sensitive. Date the sourcing pass and mark unverified or stale contact paths.",
  "sensitiveDataPolicy": "Treat prospect lists, contact details, CRM fields, and outreach angles as confidential. Include only public business contact paths needed for review and avoid private or gated personal data.",
  "costControlPolicy": "Start with a small 20-company review batch and a narrow ICP/source boundary. Avoid broad scraping, enrichment, or large list expansion until row quality is approved."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'list_creator',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'list_creator'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'list_creator agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/list_creator/health',
  healthcheck_url: '/sample-agents/list_creator/health',
  jobEndpoint: '/sample-agents/list_creator/jobs',
  job_endpoint: '/sample-agents/list_creator/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/list_creator/health',
    jobs: '/sample-agents/list_creator/jobs'
  }),
  metadata: Object.freeze({
    agent_purpose: AGENT_DEFINITION.agentPurpose,
    action_boundaries: AGENT_DEFINITION.agentActionBoundaries,
    delivery_contract: AGENT_DEFINITION.deliveryContract,
    sample: true,
    sampleKind: 'list_creator',
    sample_kind: 'list_creator',
    category: 'list_creator',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
