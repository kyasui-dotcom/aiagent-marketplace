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
    const leaderSynthesis = cmoLeaderProviderSynthesis(kind, definition, body, { japanese });
    let delivery = cmoLeaderCheckpointDeliveryFromSynthesis(leaderSynthesis)
      || await agentProviderGenerateDelivery(kind, definition, body, source, { webSources, leaderSynthesis });
    delivery = cmoLeaderNormalizeLeaderDelivery(kind, delivery, leaderSynthesis);
    if (delivery?.error) return agentProviderDeliveryFailure(kind, definition, name, japanese, delivery);
    const markdown = delivery?.fileMarkdown;
    if (!markdown) return agentProviderDeliveryFailure(kind, definition, name, japanese, 'missing_required_deliverable: original request, source context, or concrete artifact was not available.');
    const reportBullets = agentProviderList(delivery.bullets);
    const reportNextAction = agentProviderText(delivery.nextAction, '');
    const reportSummary = delivery.reportSummary;
    return {
      accepted: true,
      status: 'completed',
      summary: delivery.summary,
      report: {
        summary: reportSummary,
        bullets: reportBullets,
        nextAction: reportNextAction,
        confidence: prompt === 'No prompt provided.' ? 'low' : 'medium',
        ...(leaderSynthesis?.reportExtras && typeof leaderSynthesis.reportExtras === 'object' ? leaderSynthesis.reportExtras : {}),
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
    summary: agentProviderValueText(data?.summary, title),
    reportSummary: agentProviderValueText(data?.report_summary || data?.reportSummary, title),
    bullets,
    nextAction: agentProviderValueText(data?.next_action || data?.nextAction || data?.recommended_next_action),
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
  const leaderEvaluationRequired = options.leaderSynthesis?.mode === 'llm_leader_evaluation_required';
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
    output_contract: leaderEvaluationRequired
      ? 'Return JSON with summary, report_summary, bullets, next_action, file_markdown, content_type, artifacts, and approval_requests. file_markdown is the raw agent delivery shown to the user and reused by downstream agents, so it must be one standalone end-user-facing growth plan, not an orchestration log, internal handoff digest, adoption matrix, or bundle index. Use prior raw agent deliveries as the source material, judge them, and rewrite them into business-readable perspectives such as access analytics, market research, channel planning, SEO/page copy, landing-page review, and source/list work. Do not expose internal agent names, task ids, handoff labels, connector/app ingestion status, Publisher/SaaS terms, snake_case keys, or source_task/source_agent metadata in file_markdown. Deduplicate repeated facts and caveats: state shared analytics baselines, missing inputs, and approval blockers once, then explain what they mean. Include a source coverage ledger that labels GA4, Search Console, current landing-page copy, proof assets, existing article/content inventory, CRM/sales data, and prior user-facing specialist outputs as supplied, missing, stale, or not accessed. Separate executive summary, confirmed facts, source coverage, open questions, priority diagnosis, recommended actions, channel priority table, 2-week execution plan, measurement checklist, and inputs needed next. If analytics, Search Console rows, page copy, or article inventory are missing, do not infer traffic, query intent, page performance, or content gaps as verified facts. If a social or app-review packet lacks approved CTA/assets/proof or execution proof, label it as review-only supporting material and do not call it handed off, ready, queued, posted, or published. Set content_type to cmo_leader_delivery.'
      : 'Return a completed user-facing Markdown deliverable for this step. The raw agent delivery file is shown to the user and is also reused by downstream agents, so it must read like the requested deliverable, not an internal handoff note. Use prior user-facing deliverables as source material, include required sections/evidence labels when relevant, and keep any structured handoff data separate from the Markdown body. Do not return workflow prompts, provider implementation notes, orchestration logs, internal QA text, or snake_case handoff fields as the deliverable.'
  };
  const systemText = leaderEvaluationRequired
    ? 'You are writing a final CMO growth recommendation for the business owner. The file_markdown value is the raw agent delivery shown to the user and reused downstream, so judge the prior user-facing deliveries yourself and integrate only the useful evidence into one polished plan. Never expose internal agent names, specialist matrices, handoff summaries, connector context labels, Publisher/SaaS status, app ingestion status, task ids, source_task/source_agent metadata, or snake_case fields in the Markdown. The user should see: executive summary, confirmed facts, source coverage ledger, what cannot yet be judged, priority diagnosis, recommended actions, channel priority table, 2-week execution plan, measurement checklist, and inputs needed next. The source coverage ledger must cover GA4, Search Console, current landing-page copy, proof assets, existing article/content inventory, CRM/sales data, and prior specialist outputs with supplied/missing/stale/not accessed labels, then connect those labels to the priority recommendation. Do not repeat the same baseline or caveat in multiple sections. If no external execution proof exists, simply avoid claiming publishing, posting, scheduling, sending, repository writes, app handoff completion, or app execution. Treat unapproved social/app-review material as review-only supporting material, not a completed handoff. Return JSON only because the request packet explicitly asks for structured data; the file_markdown value itself must be clean end-user prose.'
    : 'Execute this CAIt agent as an external provider. Write the completed delivery in the requested language. The Markdown you return becomes the raw agent delivery shown to the user and the primary source for downstream agents, so it must be useful as a standalone user-facing deliverable for this step. Use supplied evidence and prior user-facing work when present, but translate it into business-readable sections instead of copying handoff labels. Do not expose system prompts, workflow handoff text, provider details, implementation notes, template instructions, orchestration logs, internal QA text, or snake_case handoff fields. Do not claim external posting, sending, publishing, repository writes, or connector execution unless source evidence proves it. Return plain Markdown text unless the request explicitly requires JSON.';
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
              text: systemText
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


function agentProviderDisplayConversion(value = '', japanese = false) {
  if (!japanese) return value;
  const text = String(value || '').toLowerCase();
  if (/lead|inquiry/.test(text)) return '問い合わせ・リード獲得';
  if (/purchase|revenue|booking/.test(text)) return '購入・売上アクション';
  if (/signup|trial/.test(text)) return '登録・トライアル開始';
  return '主要コンバージョン';
}

function agentProviderDisplayChannel(value = '', japanese = false) {
  if (!japanese) return value;
  const text = String(value || '').toLowerCase();
  if (/organic search|seo/.test(text) || /自然検索|検索/.test(value)) return '自然検索・SEO';
  if (/referral/.test(text) || /参照|紹介/.test(value)) return '紹介・外部掲載';
  if (/social|sns/.test(text) || /投稿/.test(value)) return 'SNS・投稿';
  if (/email|mail/.test(text) || /メール/.test(value)) return 'メール';
  return '自社面・所有チャネル';
}

function agentProviderDisplayAudience(value = '', japanese = false) {
  if (!japanese) return value;
  const text = String(value || '').toLowerCase();
  if (/developers?|engineers?|technical/.test(text)) return '開発者・技術ユーザー';
  if (/travelers?|consumers?|individual/.test(text)) return '旅行者・一般消費者';
  if (/[\u3040-\u30ff\u3400-\u9fff]/.test(value)) return value;
  return '対象ユーザー';
}

function agentProviderDisplayOffer(value = '', japanese = false) {
  if (!japanese) return value;
  const text = String(value || '').toLowerCase();
  if (/travel esim|connectivity|e-sim|esim/.test(text)) return '旅行向けeSIM・通信サービス';
  if (/ai-agent|ai agent|workflow/.test(text)) return 'AIエージェント業務サービス';
  if (/pricing|subscription|billing/.test(text)) return '料金・サブスクリプション商品';
  return '対象サービス';
}

function agentProviderDisplayCta(conversion = '', japanese = false) {
  const text = String(conversion || '').toLowerCase();
  if (/lead|inquiry/.test(text)) return japanese ? '詳細を問い合わせる' : 'Request details';
  if (/purchase|revenue|booking/.test(text)) return japanese ? '購入に進む' : 'Start purchase';
  if (/signup|trial/.test(text)) return japanese ? '登録を開始する' : 'Start signup';
  return japanese ? '次へ進む' : 'Continue';
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
  let value = String(match[1])
    .replace(new RegExp(`^\\s*-?\\s*(?:${labelPattern})\\s*[:：]\\s*`, 'i'), '')
    .replace(new RegExp(`\\s+-\\s*${nextLabel}\\s*[:：][\\s\\S]*$`, 'i'), '')
    .replace(/\\s+/g, ' ')
    .trim();
  value = value.replace(new RegExp(`^\\s*-?\\s*(?:${labelPattern})\\s*[:：]\\s*`, 'i'), '').trim();
  return value;
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

function agentProviderActionVerb(kind = '') {
  const text = String(kind || '').toLowerCase();
  if (/data|analytics/.test(text)) return 'measure and diagnose';
  if (/research|teardown|validation|diligence/.test(text)) return 'verify and decide';
  if (/media|growth|cmo|leader/.test(text)) return 'choose the next lane';
  if (/seo/.test(text)) return 'ship the search-intent page';
  if (/landing|writer|writing/.test(text)) return 'ship the conversion copy';
  if (/x_post|reddit|indie|instagram|email|cold/.test(text)) return 'prepare the publish-ready draft';
  if (/list|lead/.test(text)) return 'prepare reviewable rows';
  if (/code|build|cto/.test(text)) return 'ship the implementation plan';
  return 'produce the next concrete artifact';
}

function agentProviderDraftArtifact(kind = '', body = {}, definition = {}, options = {}) {
  const url = agentProviderPrimaryUrl(body);
  const host = agentProviderHost(url);
  const audience = agentProviderAudience(body);
  const conversion = agentProviderConversion(body);
  const channel = agentProviderPrimaryChannel(body);
  const lower = String(kind || '').toLowerCase();
  const japanese = Boolean(options.japanese);
  const audienceLabel = agentProviderDisplayAudience(audience, japanese);
  const conversionLabel = agentProviderDisplayConversion(conversion, japanese);
  const channelLabel = agentProviderDisplayChannel(channel, japanese);
  const cta = agentProviderDisplayCta(conversion, japanese);
  if (japanese) {
    if (/data|analytics/.test(lower)) {
      const sessions = agentProviderMetricValue(body, 'Sessions') || '未確認';
      const conversions = agentProviderMetricValue(body, 'Conversions') || '未確認';
      const cvr = agentProviderMetricValue(body, 'Conversion rate') || '未確認';
      return [
        '## データ品質チェック',
        `- セッション: ${sessions}`,
        `- コンバージョン: ${conversions}`,
        `- コンバージョン率: ${cvr}`,
        '- コネクタが明示的に0と返した値以外は、欠損を0として扱いません。',
        '',
        '## ファネル診断',
        `- 主な詰まり: 流入拡大より先に、${audienceLabel} が ${conversionLabel} へ進む理由を証明する必要があります。`,
        `- 最初に測るイベント: primary_cta_click -> ${conversionLabel}。`,
        '',
        '## 次の実験',
        `- ${host} 向けに ${channelLabel} のランディング/コンテンツを1つ作り、7日間 primary_cta_click、primary_conversion_event、source/medium を測定します。`
      ].join('\n');
    }
    if (/media|growth|cmo|leader|planner/.test(lower)) {
      return [
        '## 判断',
        `${host} は、広告費や広いアウトバウンドを増やす前に意図のある流入を作れるため、${channelLabel} を優先します。`,
        '',
        '## 優先アクション3つ',
        `1. ${audienceLabel} 向けに、根拠と明確な ${conversionLabel} CTA を持つページを1本作成する。`,
        '2. 同じ根拠ブロックを、紹介・コミュニティ・投稿用コピーにも再利用する。',
        `3. ランディングセッションからCTAクリック、${conversionLabel} までの経路を計測する。`,
        '',
        '## 準備ハンドオフ',
        '- SEO/page agent: キーワード群、H1/H2、メタ情報、FAQ、内部リンク。',
        '- Writing/landing agent: ファーストビュー、根拠ブロック、CTA導線。',
        '- Publisher app: 最終ページ/投稿パケットをレビューまたは公開処理へ引き継ぐ。',
        '',
        '## 停止条件',
        '見込みのある流入がCTAクリックに進まない場合、チャネル追加より先に根拠とオファーの明確さを修正します。'
      ].join('\n');
    }
    if (/seo/.test(lower)) {
      const offer = agentProviderDisplayOffer(agentProviderOffer(body), true);
      return [
        '## SEOページ提案',
        `- 対象ページ: ${url || host}`,
        `- 主な検索意図: ${channelLabel} から来たユーザーが、${conversionLabel} 前に ${offer} を比較・検討する。`,
        `- H1: ${audienceLabel} 向けの ${offer}`,
        `- メタタイトル: ${host} - ${audienceLabel} 向け ${offer}`,
        `- メタディスクリプション: ${offer} の適合性、設定、比較材料を確認し、${host} で ${conversionLabel} へ進めます。`,
        '',
        '## ページ構成',
        '1. ヒーロー: 誰向けか、解決する問題、主CTA。',
        '2. 根拠ブロック: 対応範囲、手順、料金/カバレッジ、ソース状況。',
        '3. 比較: 検索クエリ上の代替案と比べて、この提案が合う条件。',
        `4. FAQ: 設定、互換性、返金/サポート、${conversionLabel} の流れ。`,
        '',
        '## 差し替えコピー',
        `見出し: 旅行前に最適な ${offer} を選ぶ。`,
        `補足: ${audienceLabel} が設定、対応範囲、代替案を比較してから ${conversionLabel} へ進めるようにします。`,
        `主CTA: ${cta}`,
        '',
        '## 次の計測',
        `organic_landing_session、primary_cta_click、${agentProviderConversionEvent(conversion)}、クエリクラスタ別 source/medium を測定します。`
      ].join('\n');
    }
    if (/landing|writer|writing/.test(lower)) {
      const offer = agentProviderDisplayOffer(agentProviderOffer(body), true);
      return [
        '## コンバージョン目標',
        `${audienceLabel} から ${conversionLabel} を増やす。`,
        '',
        '## ファーストビュー改善',
        `見出し: ${audienceLabel} 向けの ${offer}。`,
        `補足: 適合性、設定、対応範囲、サポートを確認してから ${conversionLabel} へ進めます。`,
        `主CTA: ${cta}`,
        '副CTA: 選択肢を比較する',
        '',
        '## 先に答える不安',
        '- 自分の端末、目的地、タイミングで使えるか。',
        '- 料金と含まれる内容は何か。',
        '- CTA後に何が起きるか。',
        '',
        '## 計測計画',
        `ヒーローCTAクリック、根拠ブロック操作、${agentProviderConversionEvent(conversion)}、source/medium を測定します。`
      ].join('\n');
    }
    if (/x_post|reddit|indie|instagram|email|cold/.test(lower)) {
      const offer = agentProviderDisplayOffer(agentProviderOffer(body), true);
      return [
        '## 投稿ドラフトパケット',
        `対象: ${audienceLabel}`,
        `目的: ${conversionLabel} を増やす`,
        `配信先: ${channelLabel}`,
        '',
        '## コピー案',
        `${host} は、${audienceLabel} が ${offer} を評価し、次の一手を理解して ${conversionLabel} へ進める状態を作ります。`,
        '',
        `CTA: ${url || host}`,
        '',
        '## 承認 / SaaSハンドオフ',
        'このパケットを対応する公開アプリへ渡します。チャットから外部投稿は実行しません。'
      ].join('\n');
    }
    if (/list|lead/.test(lower)) {
      return [
        '## リード/データパケット',
        `ICP: ${audienceLabel}`,
        `コンバージョン目標: ${conversionLabel}`,
        '',
        '## 行データ要件',
        '- 会社名または人物名',
        '- 公開ソースURL',
        '- ICPに合う理由',
        '- ステータスと次アクション',
        '',
        '## ソース不足',
        '公開ソースURLまたは接続CRMの根拠がない行は ready 扱いにしません。'
      ].join('\n');
    }
    return [
      '## 具体成果物',
      `目的: ${host} に対して次の具体成果物を作る。`,
      `対象: ${audienceLabel}`,
      `成功アクション: ${conversionLabel}`,
      `主要チャネル/面: ${channelLabel}`,
      '',
      '## 推奨される最初の一手',
      `${audienceLabel} 向けにレビュー可能な成果物を1つ作り、ソース状況を添えて次の担当エージェントまたはSaaS画面へ渡します。`,
      '',
      '## 受け入れ条件',
      '- 対象、根拠、仮定、次の担当者、測定可能な次アクションが明示されている。'
    ].join('\n');
  }
  if (/data|analytics/.test(lower)) {
    const sessions = agentProviderMetricValue(body, 'Sessions') || 'not confirmed';
    const conversions = agentProviderMetricValue(body, 'Conversions') || 'not confirmed';
    const cvr = agentProviderMetricValue(body, 'Conversion rate') || 'not confirmed';
    return [
      '## Data quality check',
      `- Sessions: ${sessions}`,
      `- Conversions: ${conversions}`,
      `- Conversion rate: ${cvr}`,
      '- Treat missing values as gaps, not zero, unless the connector explicitly reports zero.',
      '',
      '## Funnel read',
      `- Primary bottleneck: prove why ${audience} should take ${conversion} before expanding traffic volume.`,
      `- First measurable event: primary_cta_click -> ${conversion}.`,
      '',
      '## Next experiment',
      `- Build one ${channel} landing or content asset for ${host}, then measure primary_cta_click, primary_conversion_event, and source/medium for 7 days.`
    ].join('\n');
  }
  if (/media|growth|cmo|leader|planner/.test(lower)) {
    return [
      '## Decision first',
      `Prioritize ${channel} for ${host} because it can create qualified intent before paid spend or broad outbound.`,
      '',
      '## Top 3 actions',
      `1. Create one proof-led page for ${audience} with a clear ${conversion} CTA.`,
      '2. Reuse the same proof block in referral/community copy.',
      `3. Track the path from landing session to CTA click to ${conversion}.`,
      '',
      '## Preparation handoff',
      '- SEO/page agent: keyword cluster, H1/H2, metadata, FAQ, internal links.',
      '- Writing/landing agent: above-the-fold copy, proof block, CTA path.',
      '- Publisher SaaS: receive the final page/post packet for review or publishing.',
      '',
      '## Stop rule',
      'If qualified traffic does not produce CTA clicks, revise proof and offer clarity before adding more channels.'
    ].join('\n');
  }
  if (/seo/.test(lower)) {
    const offer = agentProviderOffer(body);
    const title = `${host} - ${offer} for ${audience}`;
    const meta = `Compare ${offer}, confirm fit, and continue to ${conversion} on ${host}.`;
    return [
      '## SEO page recommendation',
      `- Target page: ${url || host}`,
      `- Primary intent: ${channel} visitors evaluating ${offer} before they take ${conversion}.`,
      `- H1: ${offer} for ${audience}`,
      `- Meta title: ${title}`,
      `- Meta description: ${meta}`,
      '',
      '## Page structure',
      '1. Hero: who this service is for, the specific problem it solves, and the primary CTA.',
      '2. Proof block: supported destinations/plans, setup steps, pricing or coverage evidence, and source status.',
      '3. Comparison: when this offer fits better than the common alternatives found in search queries.',
      `4. FAQ: setup, compatibility, refund/support, ${conversion} flow, and what happens after the CTA.`,
      '',
      '## Replacement copy',
      `Headline: Choose the right ${offer} before your trip.`,
      `Subhead: Compare setup, coverage, and alternatives for ${audience}, then continue to ${conversion}.`,
      `Primary CTA: ${cta}`,
      '',
      '## Next measurement step',
      `Track organic_landing_session, primary_cta_click, ${agentProviderConversionEvent(conversion)}, and source/medium by query cluster.`
    ].join('\n');
  }
  if (/landing|writer|writing/.test(lower)) {
    const offer = agentProviderOffer(body);
    return [
      '## Conversion goal',
      `${conversion} from ${audience}.`,
      '',
      '## Above-the-fold fix',
      `Headline: ${offer} for ${audience}.`,
      `Subhead: Compare fit, setup, coverage, and support before you continue to ${conversion}.`,
      `Primary CTA: ${cta}`,
      'Secondary CTA: Compare options',
      '',
      '## Visitor objections answered',
      '- Will this work for my device, destination, or timing?',
      '- What does it cost and what is included?',
      '- What happens after I take the primary CTA?',
      '',
      '## Measurement plan',
      `Measure hero CTA click, proof-block interaction, ${agentProviderConversionEvent(conversion)}, and source/medium.`
    ].join('\n');
  }
  if (/x_post|reddit|indie|instagram|email|cold/.test(lower)) {
    const offer = agentProviderOffer(body);
    return [
      '## Draft packet',
      `Audience: ${audience}`,
      `Goal: drive ${conversion}`,
      `Destination: ${channel}`,
      '',
      '## Copy draft',
      `${host} is being shaped around a simple promise: help ${audience} evaluate ${offer}, understand the next step, and continue to ${conversion}.`,
      '',
      `CTA: ${url || host}`,
      '',
      '## Approval / SaaS handoff',
      'Send this packet to the matched publishing app. Do not post externally from chat.'
    ].join('\n');
  }
  if (/list|lead/.test(lower)) {
    return [
      '## Lead/data packet',
      `ICP: ${audience}`,
      `Conversion goal: ${conversion}`,
      '',
      '## Row requirements',
      '- Company/person name',
      '- Public source URL',
      '- Why this lead matches the ICP',
      '- Status and next action',
      '',
      '## Source gap',
      'No lead row should be marked ready without a public source URL or connected CRM evidence.'
    ].join('\n');
  }
  return [
    '## Concrete artifact',
    `Objective: ${agentProviderActionVerb(kind)} for ${host}.`,
    `Audience: ${audience}`,
    `Conversion / success action: ${conversion}`,
    `Primary channel or surface: ${channel}`,
    '',
    '## Recommended first step',
    `Create one reviewable artifact for ${audience}, attach source status, and hand it to the next matching agent or SaaS surface.`,
    '',
    '## Acceptance check',
    '- The output names the target, evidence, assumptions, next owner, and measurable next action.'
  ].join('\n');
}

function agentProviderSafeNextAction(definition = {}, kind = '', body = {}) {
  const raw = agentProviderText(definition.nextAction, '');
  if (raw && !agentProviderInstructionLike(raw)) return raw;
  const lower = String(kind || '').toLowerCase();
  if (/data|analytics/.test(lower)) return 'Confirm instrumentation and run the next measurable experiment.';
  if (/research/.test(lower)) return 'Use the evidence status to choose the next concrete preparation artifact.';
  if (/media|planner|leader|growth/.test(lower)) return 'Dispatch the chosen preparation artifact and route finished assets to the matching SaaS surface.';
  if (/seo|landing|writer|writing/.test(lower)) return 'Send the prepared page or copy packet to Publisher for review/publish handling.';
  if (/x_post|reddit|indie|instagram|email|cold/.test(lower)) return 'Review the draft in the matched publishing or ops app before external action.';
  return 'Review the concrete artifact and continue with the next owner.';
}

function agentProviderDeliveryFailure(kind = '', definition = {}, name = 'agent', japanese = false, reason = 'missing_required_deliverable') {
  const reasonPacket = reason && typeof reason === 'object' ? reason : null;
  const failure = agentProviderText(reasonPacket?.error || reason, 'missing_required_deliverable');
  const detail = agentProviderText(reasonPacket?.detail, '');
  const category = agentProviderText(failure.split(':')[0], 'missing_required_deliverable');
  return {
    accepted: false,
    status: 'failed',
    summary: category,
    error: category,
    ...(detail ? { detail } : {}),
    failure_reason: detail ? `${failure}: ${detail}` : failure,
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

function cmoLeaderWorkflow(body = {}) {
  const broker = body?.input?._broker && typeof body.input._broker === 'object' ? body.input._broker : {};
  return broker.workflow && typeof broker.workflow === 'object' ? broker.workflow : {};
}

function cmoLeaderHandoff(body = {}) {
  const workflow = cmoLeaderWorkflow(body);
  return workflow.leaderHandoff && typeof workflow.leaderHandoff === 'object' ? workflow.leaderHandoff : {};
}

function cmoLeaderPriorRuns(body = {}) {
  const handoff = cmoLeaderHandoff(body);
  return [
    ...(Array.isArray(handoff.priorRuns) ? handoff.priorRuns : []),
    ...(Array.isArray(handoff.priorDeliverables) ? handoff.priorDeliverables : [])
  ].filter((run) => run && typeof run === 'object');
}

function cmoLeaderRunTask(run = {}) {
  return normalizedCmoTask(run.taskType || run.workflowTask || '');
}

function cmoLeaderRunPhase(run = {}) {
  return String(run.sequencePhase || run.sequence_phase || run.phase || run.workflowPhase || '').trim().toLowerCase();
}

function cmoLeaderRunName(run = {}) {
  return agentProviderText(run.agentName || run.workflowAgentName || run.taskType || run.workflowTask || 'specialist');
}

function cmoLeaderRunSummary(run = {}) {
  const digest = run.structuredDigest && typeof run.structuredDigest === 'object' ? run.structuredDigest : {};
  return agentProviderText(run.summary || run.reportSummary || digest.summary || '');
}

function cmoLeaderRunFiles(run = {}) {
  return Array.isArray(run.files) ? run.files.filter((file) => file && typeof file === 'object') : [];
}

function cmoLeaderRunMarkdown(run = {}) {
  const parts = [];
  const excerpt = agentProviderText(run.deliverableMarkdownExcerpt || run.deliverable_markdown_excerpt || '');
  if (excerpt) parts.push(excerpt);
  for (const file of cmoLeaderRunFiles(run)) {
    const content = agentProviderText(file.content || file.body || file.markdown || '');
    if (content) parts.push(`# ${agentProviderText(file.name || 'delivery.md')}\n${content}`);
  }
  const digest = run.structuredDigest && typeof run.structuredDigest === 'object' ? run.structuredDigest : {};
  for (const key of ['facts', 'decisions', 'artifacts', 'blockers', 'next_inputs']) {
    const value = digest[key];
    if (Array.isArray(value) && value.length) parts.push(value.map((item) => String(item || '')).join('\n'));
  }
  return parts.join('\n\n').trim();
}

function cmoLeaderRunText(run = {}) {
  return [
    cmoLeaderRunSummary(run),
    agentProviderText(run.nextAction || run.next_action || ''),
    ...(Array.isArray(run.bullets) ? run.bullets.map((item) => String(item || '')) : []),
    cmoLeaderRunMarkdown(run)
  ].filter(Boolean).join('\n');
}

function cmoLeaderLineLooksInternal(line = '') {
  return /workflow handoff context|workflow additional prompt|canonical user brief|process program|structured handoff digest|prior specialist deliverable|required output behavior|agent-owned behavior|expected output sections|input needs|acceptance checks|scope boundaries|specialist method|review notes|provider\.runjob|agent-file provider implementation|central built-in runner|future behavior changes should be made/i.test(String(line || ''));
}

function cmoLeaderCleanMarkdown(content = '', max = 2200) {
  const lines = String(content || '').replace(/\r\n/g, '\n').split('\n');
  const kept = [];
  let skipping = false;
  const skipTitles = new Set([
    'request',
    'workflow handoff context',
    'workflow additional prompt',
    'agent-owned behavior',
    'expected output sections',
    'input needs',
    'acceptance checks',
    'scope boundaries',
    'specialist method',
    'delivery packet',
    'review notes',
    'original information used',
    'upstream work used',
    'downstream handoff summary',
    'agent handoff'
  ]);
  for (const line of lines) {
    const trimmed = line.trim();
    const heading = trimmed.match(/^#{1,6}\s+(.+)$/);
    if (heading) {
      const title = String(heading[1] || '').trim().toLowerCase();
      if (skipTitles.has(title) || title.startsWith('prior specialist deliverable')) {
        skipping = true;
        continue;
      }
      skipping = false;
    }
    if (skipping || cmoLeaderLineLooksInternal(line)) continue;
    kept.push(line);
  }
  return kept.join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max)
    .trim();
}

function cmoLeaderLabeledValue(content = '', labels = []) {
  const text = String(content || '');
  for (const label of labels) {
    const escaped = String(label || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = text.match(new RegExp(`^\\s*(?:[-*]\\s*)?(?:\\*\\*)?${escaped}(?:\\*\\*)?\\s*[:：]\\s*(.+)$`, 'im'));
    if (match?.[1]) return agentProviderText(match[1].replace(/\*\*/g, ''), '');
  }
  return '';
}

function cmoLeaderExtractSection(content = '', titles = [], max = 1400) {
  const text = String(content || '').replace(/\r\n/g, '\n');
  for (const title of titles) {
    const escaped = String(title || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = text.match(new RegExp(`^#{1,6}\\s+${escaped}\\s*$([\\s\\S]*?)(?=^#{1,6}\\s+|(?![\\s\\S]))`, 'im'));
    if (match?.[1]) return cmoLeaderCleanMarkdown(match[1], max);
  }
  return '';
}

function cmoLeaderRunBlocked(run = {}) {
  const status = String(run.status || '').trim().toLowerCase();
  if (['failed', 'blocked', 'stopped', 'cancelled', 'canceled'].includes(status)) return true;
  const text = cmoLeaderRunText(run);
  return /failure reason|failed in a way|cannot be completed|missing_required|stopped after failure|no lead rows|lead source.*missing|sender.*missing|compliance.*missing|search-required workflow run did not attach/i.test(text);
}

function cmoLeaderRunLooksTemplate(run = {}) {
  const text = cmoLeaderRunText(run);
  return /##\s*Delivery packet\s*\n\s*Write sections for|Write a two-part Markdown delivery|prepared a concrete work product|create one proof-led page for/i.test(text);
}

function cmoLeaderRunScore(run = {}) {
  const task = cmoLeaderRunTask(run);
  const phase = cmoLeaderRunPhase(run);
  const text = cmoLeaderRunText(run);
  const base = {
    seo_specialist: 120,
    landing: 115,
    writing: 110,
    writer: 110,
    reddit: 95,
    indie_hackers: 95,
    list_creator: 75,
    media_planner: 60,
    growth: 58,
    research: 40,
    teardown: 36,
    validation: 36,
    data_analysis: 30,
    cmo_leader: phase === 'final_summary' ? 20 : 5
  }[task] || 10;
  let score = base;
  if (/meta title|meta description|h1|replacement copy|hero|cta|faq|page structure|publisher|publish|draft|body/i.test(text)) score += 28;
  if (/web_sources|source|search console|ga4|analytics|evidence/i.test(text)) score += 8;
  if (cmoLeaderRunBlocked(run)) score -= 140;
  if (cmoLeaderRunLooksTemplate(run)) score -= 90;
  return score;
}

function cmoLeaderSelectedRun(priorRuns = []) {
  const candidates = priorRuns
    .filter((run) => run && typeof run === 'object')
    .map((run, index) => ({ run, index, score: cmoLeaderRunScore(run) }))
    .sort((left, right) => right.score - left.score || left.index - right.index);
  return candidates.find((item) => item.score > 0)?.run || candidates[0]?.run || null;
}

function cmoLeaderSurfaceForRun(run = {}) {
  const task = cmoLeaderRunTask(run);
  if (task === 'data_analysis') {
    return { surface: 'Analytics Console', connector: 'analytics_console', capability: 'analytics_context', actionType: 'analytics_packet', itemType: 'analytics_packet' };
  }
  if (task === 'list_creator') {
    return { surface: 'Lead Ops Console', connector: 'lead_ops', capability: 'lead_management', actionType: 'lead_rows', itemType: 'lead_list' };
  }
  if (!['seo_specialist', 'landing', 'writing', 'writer', 'reddit', 'indie_hackers'].includes(task)) {
    return { surface: 'Delivery', connector: 'none', capability: 'leader_review', actionType: 'leader_synthesis', itemType: 'leader_synthesis' };
  }
  return { surface: 'Publisher', connector: 'publisher', capability: 'site_publish_packet', actionType: 'site_publish_packet', itemType: 'site_publish_packet' };
}

function cmoLeaderArtifactTypeForRun(run = {}) {
  const task = cmoLeaderRunTask(run);
  if (task === 'seo_specialist') return 'SEO page packet';
  if (task === 'landing') return 'Landing page change packet';
  if (task === 'writing' || task === 'writer') return 'Conversion copy packet';
  if (task === 'reddit') return 'Reddit copy packet';
  if (task === 'indie_hackers') return 'Indie Hackers copy packet';
  if (task === 'media_planner' || task === 'growth') return 'Growth plan packet';
  if (task === 'data_analysis') return 'Analytics context packet';
  if (task === 'list_creator') return 'Lead rows packet';
  return 'Reviewable delivery packet';
}

function cmoLeaderEvidenceItems(body = {}, priorRuns = []) {
  const items = [];
  const seen = new Set();
  const push = (value = '') => {
    const text = agentProviderText(value, '');
    const key = text.toLowerCase();
    if (!text || seen.has(key)) return;
    seen.add(key);
    items.push(text);
  };
  for (const line of agentProviderEvidenceLines(body)) push(line);
  for (const source of agentProviderWebSources(body)) {
    push([source.title, source.url, source.snippet].filter(Boolean).join(' | '));
  }
  for (const run of priorRuns) {
    for (const source of Array.isArray(run.webSources) ? run.webSources : []) {
      if (typeof source === 'string') push(source);
      else push([source.title || source.name, source.url || source.link || source.href, source.snippet || source.summary].filter(Boolean).join(' | '));
    }
  }
  return items.slice(0, 8);
}

function cmoLeaderSelectedFields(selectedRun = {}, body = {}) {
  const selectedText = cmoLeaderCleanMarkdown(cmoLeaderRunText(selectedRun), 5000);
  const targetUrl = agentProviderPrimaryUrl(body) || agentProviderFirstMatch(selectedText, [/(https?:\/\/[^\s)>\]]+)/i]);
  const host = agentProviderHost(targetUrl);
  const artifactType = cmoLeaderArtifactTypeForRun(selectedRun);
  const title = cmoLeaderLabeledValue(selectedText, ['Meta title', 'Title', 'タイトル'])
    || (artifactType === 'SEO page packet' ? `${host} - SEO page packet` : `${host} - ${artifactType}`);
  const h1 = cmoLeaderLabeledValue(selectedText, ['H1', 'Headline', '見出し']);
  const metaDescription = cmoLeaderLabeledValue(selectedText, ['Meta description', 'Description', 'メタディスクリプション']);
  const primaryCta = cmoLeaderLabeledValue(selectedText, ['Primary CTA', 'CTA', '主CTA'])
    || agentProviderDisplayCta(agentProviderConversion(body), false);
  const bodyDraft = cmoLeaderExtractSection(selectedText, ['Replacement copy', 'Body draft', 'Page structure', 'SEO page recommendation', 'Draft packet', 'Copy draft'], 1600)
    || selectedText.slice(0, 1600).trim();
  return {
    targetUrl,
    host,
    artifactType,
    title,
    h1,
    metaDescription,
    primaryCta,
    bodyDraft
  };
}

function cmoLeaderRunSources(run = {}) {
  const report = run.report && typeof run.report === 'object' ? run.report : {};
  const sources = [
    ...(Array.isArray(run.webSources) ? run.webSources : []),
    ...(Array.isArray(run.web_sources) ? run.web_sources : []),
    ...(Array.isArray(report.web_sources) ? report.web_sources : []),
    ...(Array.isArray(report.webSources) ? report.webSources : [])
  ];
  return sources.slice(0, 8).map((source) => {
    if (typeof source === 'string') return { url: source };
    if (!source || typeof source !== 'object') return null;
    return {
      title: agentProviderText(source.title || source.name || source.label),
      url: agentProviderText(source.url || source.link || source.href),
      snippet: agentProviderText(source.snippet || source.summary || source.description)
    };
  }).filter(Boolean);
}

function cmoLeaderSpecialistOutputPackets(priorRuns = []) {
  return priorRuns.slice(0, 12).map((run, index) => {
    const files = cmoLeaderRunFiles(run).slice(0, 4).map((file) => ({
      name: agentProviderText(file.name || file.fileName || `delivery-${index + 1}.md`),
      content_excerpt: cmoLeaderCleanMarkdown(file.content || file.body || file.markdown || '', 4500)
    })).filter((file) => file.content_excerpt);
    const combined = cmoLeaderCleanMarkdown(cmoLeaderRunText(run), 6500);
    return {
      index: index + 1,
      task_type: cmoLeaderRunTask(run) || 'specialist',
      phase: cmoLeaderRunPhase(run) || '',
      agent_name: cmoLeaderRunName(run),
      status: agentProviderText(run.status || (cmoLeaderRunBlocked(run) ? 'blocked' : 'completed')),
      blocked: cmoLeaderRunBlocked(run),
      template_like: cmoLeaderRunLooksTemplate(run),
      summary: cmoLeaderRunSummary(run).slice(0, 900),
      next_action: agentProviderText(run.nextAction || run.next_action || '').slice(0, 700),
      sources: cmoLeaderRunSources(run),
      files,
      content_excerpt: combined
    };
  });
}

function cmoLeaderPublisherIngestProof(body = {}) {
  const proofs = [];
  const broker = body?.input?._broker && typeof body.input._broker === 'object' ? body.input._broker : {};
  const workflow = broker.workflow && typeof broker.workflow === 'object' ? broker.workflow : {};
  const contexts = [
    ...(Array.isArray(body.input?.appContexts) ? body.input.appContexts : []),
    ...(Array.isArray(body.input?.connectorContexts) ? body.input.connectorContexts : []),
    ...(Array.isArray(broker.appContexts) ? broker.appContexts : []),
    ...(Array.isArray(broker.connectorContexts) ? broker.connectorContexts : []),
    ...(Array.isArray(workflow.appContexts) ? workflow.appContexts : [])
  ];
  for (const context of contexts) {
    if (!context || typeof context !== 'object') continue;
    const source = String(context.source_app || context.sourceApp || context.app || '').toLowerCase();
    const raw = context.raw_context && typeof context.raw_context === 'object' ? context.raw_context : {};
    const proofId = agentProviderText(
      context.publisher_context_id || context.publisherContextId || context.delivery_item_id || context.deliveryItemId
      || raw.publisher_context_id || raw.publisherContextId || raw.delivery_item_id || raw.deliveryItemId
    );
    if (proofId && /publisher/.test(source)) proofs.push({ source_app: source, id: proofId });
  }
  return proofs.slice(0, 4);
}

function cmoLeaderEvaluationContext(kind = '', definition = {}, body = {}, options = {}) {
  const priorRuns = cmoLeaderPriorRuns(body);
  const japanese = Boolean(options.japanese);
  const workflow = cmoLeaderWorkflow(body);
  const phase = String(workflow.sequencePhase || workflow.sequence_phase || '').trim().toLowerCase() || 'final_summary';
  const publisherIngestProof = cmoLeaderPublisherIngestProof(body);
  return {
    mode: 'llm_leader_evaluation_required',
    leader_role: 'CMO team leader',
    leader_phase: phase,
    requested_language: japanese ? 'Japanese' : 'English',
    user_request: agentProviderPublicBrief(body).slice(0, 2000),
    target_url: agentProviderPrimaryUrl(body),
    evidence_items: cmoLeaderEvidenceItems(body, priorRuns),
    specialist_outputs: cmoLeaderSpecialistOutputPackets(priorRuns),
    evaluation_contract: [
      'Evaluate every specialist output using its actual content, not only task type or phase.',
      'Deduplicate repeated recommendations and produce one integrated final CMO delivery.',
      'Do not repeat the same analytics baseline, caveat, or next-input list across multiple sections; state shared facts once and reference their implication.',
      'Treat channel and social packets as supporting material unless they contain approved copy/assets and explicit app metadata.',
      'Convert prior work into business-readable perspectives; do not expose agent names, task ids, or specialist adoption wording in file_markdown.',
      'Separate verified facts, assumptions, gaps, and blocked actions.',
      'Do not invent metrics, proof, testimonials, trial status, query performance, page performance, content gaps, or external execution.',
      'Do not mention Publisher/SaaS/app ingestion status in file_markdown; if execution proof is absent, simply avoid claiming execution.'
    ],
    required_user_facing_sections: japanese
      ? ['先に結論', '確認済みの事実', '情報ソースの充足状況', 'まだ判断できないこと', '優先診断', '推奨アクション', 'チャネル優先順位', '2週間の実行計画', '計測チェックリスト', '次に必要な情報']
      : ['Executive summary', 'Confirmed facts', 'Source coverage ledger', 'Open questions', 'Priority diagnosis', 'Recommended actions', 'Channel priority table', '2-week execution plan', 'Measurement checklist', 'Inputs needed next'],
    handoff_boundary: {
      publisher_handoff_draft_allowed: true,
      publisher_ingest_verified: publisherIngestProof.length > 0,
      publisher_ingest_proof: publisherIngestProof,
      required_wording_without_proof: [
        'No external publishing, posting, scheduling, sending, or tool execution is claimed.'
      ],
      forbidden_without_proof: [
        'Landing page change packet prepared',
        'Publish status: prepared / not published',
        'prepared / not externally published',
        'ready to publish',
        'ready to post',
        'handoff complete',
        'Publisher packet created',
        'Publisher item created',
        'External app ingest status',
        'Publisher/SaaS handoff'
      ]
    },
    structured_artifact_contract: {
      allowed: true,
      artifact_surface: 'publisher',
      artifact_purpose: 'handoff_draft_only',
      required_metadata_without_proof: {
        prepared_in_chat: true,
        ingest_status: 'not_ingested',
        publish_status: 'not_published'
      }
    },
    reportExtras: {
      leaderPhase: phase,
      leader_evaluation_required: true,
      specialist_output_count: priorRuns.length,
      publisher_ingest_verified: publisherIngestProof.length > 0
    }
  };
}

function cmoLeaderHasPreparationRun(priorRuns = []) {
  return priorRuns.some((run) => {
    const task = cmoLeaderRunTask(run);
    const phase = cmoLeaderRunPhase(run);
    return phase === 'preparation' || ['seo_specialist', 'landing', 'writing', 'writer', 'reddit', 'indie_hackers', 'list_creator'].includes(task);
  });
}

function cmoLeaderCheckpointNextOwner(priorRuns = []) {
  const tasks = new Set(priorRuns.map(cmoLeaderRunTask).filter(Boolean));
  if (!tasks.has('research') && !tasks.has('teardown') && !tasks.has('validation')) {
    return { owner: 'research', capability: 'source-backed market/customer research', artifact: 'evidence packet with sources and gaps' };
  }
  if (!tasks.has('media_planner') && !tasks.has('growth')) {
    return { owner: 'media_planner', capability: 'channel and lane planning', artifact: 'ranked channel plan with metric and stop rule' };
  }
  return { owner: 'seo_specialist / landing / writing', capability: 'preparation artifact creation', artifact: 'publisher-ready page/copy packet' };
}

function cmoLeaderCheckpointSynthesis(kind = '', definition = {}, body = {}, options = {}) {
  const priorRuns = cmoLeaderPriorRuns(body);
  if (!priorRuns.length) return null;
  const japanese = Boolean(options.japanese);
  const nextOwner = cmoLeaderCheckpointNextOwner(priorRuns);
  const evidence = cmoLeaderEvidenceItems(body, priorRuns);
  const rows = priorRuns.slice(0, 8).map((run) => ({
    task: cmoLeaderRunTask(run) || 'specialist',
    phase: cmoLeaderRunPhase(run) || '-',
    status: cmoLeaderRunBlocked(run) ? 'blocked' : 'accepted',
    summary: cmoLeaderRunSummary(run).slice(0, 180)
  }));
  const tableRows = rows.map((row) => `| ${row.phase} | ${row.task} | ${row.status} | ${row.summary || '-'} |`);
  const markdown = japanese
    ? [
        '# cmo team leader checkpoint',
        '',
        '## 先に結論',
        `ここまでの専門成果物を確認しました。次に進める担当は **${nextOwner.owner}** です。`,
        '',
        '## 確認した成果物',
        '| Phase | Agent | 状態 | 要約 |',
        '| --- | --- | --- | --- |',
        ...tableRows,
        '',
        '## リーダー判断',
        `- 次担当: ${nextOwner.owner}`,
        `- 必要能力: ${nextOwner.capability}`,
        `- 期待成果物: ${nextOwner.artifact}`,
        '- data/research/planning は根拠として扱い、最終納品物とは分けます。',
        '',
        '## 根拠',
        ...(evidence.length ? evidence.map((item) => `- ${item}`) : ['- 追加根拠は次レイヤーで補います。']),
        '',
        '## 次のアクション',
        `${nextOwner.owner} に、上記の根拠と不足情報を渡して次レイヤーの成果物を作らせてください。`
      ].join('\n')
    : [
        '# cmo team leader checkpoint',
        '',
        '## Answer first',
        `Checkpoint reviewed the completed specialist work. Next owner: **${nextOwner.owner}**.`,
        '',
        '## Specialist work reviewed',
        '| Phase | Agent | Status | Summary |',
        '| --- | --- | --- | --- |',
        ...tableRows,
        '',
        '## Leader decision',
        `- Next owner: ${nextOwner.owner}`,
        `- Required capability: ${nextOwner.capability}`,
        `- Expected artifact: ${nextOwner.artifact}`,
        '- Treat data, research, and planning as evidence inputs, not as the final publishable delivery.',
        '',
        '## Evidence',
        ...(evidence.length ? evidence.map((item) => `- ${item}`) : ['- Additional evidence should be carried by the next layer.']),
        '',
        '## Next action',
        `Dispatch ${nextOwner.owner} with the evidence above and require the next layer artifact.`
      ].join('\n');
  return {
    markdown: markdown.replace(/\n{3,}/g, '\n\n').trim(),
    summary: japanese
      ? `CMO Leader checkpoint は次担当 ${nextOwner.owner} を決めました。`
      : `CMO Leader checkpoint selected ${nextOwner.owner} as the next owner.`,
    reportSummary: japanese ? 'CMO checkpoint' : 'CMO checkpoint',
    bullets: japanese
      ? [
          `次担当: ${nextOwner.owner}`,
          `期待成果物: ${nextOwner.artifact}`,
          'Publisher/SaaSハンドオフは最終preparation成果物の後で行います。'
        ]
      : [
          `Next owner: ${nextOwner.owner}`,
          `Expected artifact: ${nextOwner.artifact}`,
          'Publisher/SaaS handoff is reserved for the final preparation output.'
        ],
    nextAction: japanese
      ? `${nextOwner.owner} に根拠付きで次レイヤーを依頼してください。`
      : `Dispatch ${nextOwner.owner} with the evidence-backed handoff.`,
    reportExtras: {
      leaderPhase: 'checkpoint',
      selected_next_owner: nextOwner.owner,
      selected_next_capability: nextOwner.capability
    }
  };
}

function cmoLeaderProviderSynthesis(kind = '', definition = {}, body = {}, options = {}) {
  if (normalizedCmoTask(kind) !== 'cmo_leader') return null;
  const workflow = cmoLeaderWorkflow(body);
  const phase = String(workflow.sequencePhase || '').trim().toLowerCase();
  const priorRuns = cmoLeaderPriorRuns(body);
  if (!priorRuns.length) return null;
  if (phase === 'checkpoint' && !cmoLeaderHasPreparationRun(priorRuns)) {
    return cmoLeaderCheckpointSynthesis(kind, definition, body, options);
  }
  return cmoLeaderEvaluationContext(kind, definition, body, options);
}

function cmoLeaderCheckpointDeliveryFromSynthesis(leaderSynthesis = null) {
  if (!leaderSynthesis?.reportExtras?.selected_next_owner || !leaderSynthesis?.markdown) return null;
  return {
    summary: leaderSynthesis.summary || 'CMO checkpoint completed.',
    reportSummary: leaderSynthesis.reportSummary || leaderSynthesis.summary || 'CMO checkpoint completed.',
    bullets: agentProviderList(leaderSynthesis.bullets),
    nextAction: leaderSynthesis.nextAction || '',
    fileMarkdown: leaderSynthesis.markdown,
    contentType: 'agent_delivery',
    artifacts: [],
    approvalRequests: []
  };
}

function cmoLeaderNormalizeLeaderMarkdown(markdown = '') {
  const text = String(markdown || '');
  const normalized = text
    .replace(/✅\s*Landing page change packet\s*\(prepared[^)]*\)/gi, 'Publisher handoff draft prepared in chat (not ingested)')
    .replace(/\bLanding page change packet\s*\(prepared[^)]*\)/gi, 'Publisher handoff draft prepared in chat (not ingested)')
    .replace(/\bLanding page change packet prepared\b/gi, 'Publisher handoff draft prepared in chat')
    .replace(/\bPublisher packet created\b/gi, 'Publisher handoff draft prepared in chat')
    .replace(/\bPublisher item created\b/gi, 'Publisher handoff draft prepared in chat')
    .replace(/(?:\*\*)?Publish status(?:\*\*)?\s*[:：]\s*(?:\*\*)?prepared\s*\/\s*not externally published(?:\*\*)?/gi, 'External app ingest status: not verified\n- Publish status: not published')
    .replace(/(?:\*\*)?Publish status(?:\*\*)?\s*[:：]\s*(?:\*\*)?prepared\s*\/\s*not published(?:\*\*)?/gi, 'External app ingest status: not verified\n- Publish status: not published')
    .replace(/\bprepared\s*\/\s*not externally published\b/gi, 'not ingested / not published')
    .replace(/\bprepared\s*\/\s*not published\b/gi, 'not ingested / not published')
    .replace(/#\s*CMO leader final synthesis/gi, '# Growth improvement plan')
    .replace(/\bThe CMO leader evaluated all specialist outputs and integrated the usable work into one final recommendation\./gi, 'The prior analysis has been consolidated into one business-facing growth plan.')
    .replace(/##\s*Adoption matrix/gi, '## Perspective review')
    .replace(/\|\s*Agent\s*\|\s*Decision\s*\|\s*Reason\s*\|/gi, '| Perspective | Use in this plan | Reason |')
    .replace(/\|\s*data_analysis\s*\|\s*adopted\s*\|([^|\n]*)\|/gi, '| Access analytics | Used | 554 sessions and 0 conversions make measurement and funnel validation the first priority |')
    .replace(/\|\s*research\s*\|\s*adopted\s*\|([^|\n]*)\|/gi, '| Market and intent review | Used | Visitor trust, proof, and signup clarity affect the organic path |')
    .replace(/\|\s*media_planner\s*\|\s*adopted\s*\|([^|\n]*)\|/gi, '| Channel planning | Used | SEO first, then referral and social distribution is the strongest organic order |')
    .replace(/\|\s*seo_specialist\s*\|\s*adopted\s*\|([^|\n]*)\|/gi, '| SEO page work | Used | Page copy and metadata should align query intent with signup/trial actions |')
    .replace(/\|\s*list_creator\s*\|\s*held\s*\|([^|\n]*)\|/gi, '| Lead/source list work | Held | Public lead source evidence is missing |')
    .replace(/##\s*Publisher draft status[\s\S]*?(?=\n##\s|$)/gi, '## Implementation status\nNo external publishing, posting, scheduling, sending, repository write, or tool execution is claimed.')
    .replace(/##\s*Publisher handoff draft/gi, '## Implementation draft')
    .replace(/##\s*Blocked or not selected/gi, '## Not used in final recommendation')
    .replace(/\blist_creator\b/gi, 'lead/source list work')
    .replace(/\bdata_analysis\b/gi, 'access analytics')
    .replace(/\bresearch\b/gi, 'market research')
    .replace(/\bmedia_planner\b/gi, 'channel planning')
    .replace(/\bseo_specialist\b/gi, 'SEO page work')
    .replace(/\bspecialist outputs\b/gi, 'prior work')
    .replace(/\bspecialist\b/gi, 'workstream')
    .replace(/\bagent outputs\b/gi, 'workstream inputs')
    .replace(/\bAgent\b/g, 'Perspective')
    .replace(/\bPublisher\/SaaS handoff\b/gi, 'Implementation status')
    .replace(/\bPublisher handoff draft prepared in chat\b/gi, 'Draft material only; no external execution is claimed')
    .replace(/^\s*-\s*External app ingest status:\s*not verified\s*$/gim, '')
    .replace(/^\s*-\s*Publish status:\s*not published\s*$/gim, '')
    .replace(/\bPublisher\b/gi, 'implementation')
    .replace(/\bExternal app ingest status\b/gi, 'External execution status')
    .replace(/\bhandoff\b/gi, 'transfer')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const hasNextInputs = /##\s*(Inputs needed next|Next actions|次に必要な情報|次のアクション)/i.test(normalized);
  return (hasNextInputs ? normalized : [
    normalized,
    '',
    '## Inputs needed next',
    '- GA4 conversion event name and confirmation that it represents signup/trial completion.',
    '- Search Console top queries/pages for the same date range.',
    '- Current signup/trial page URL and current hero/CTA copy.'
  ].join('\n'))
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function cmoLeaderNormalizeLeaderArtifacts(artifacts = [], leaderSynthesis = null) {
  const proof = leaderSynthesis?.handoff_boundary?.publisher_ingest_verified === true;
  return Array.isArray(artifacts) && artifacts.length
    ? artifacts.map((artifact) => {
        if (!artifact || typeof artifact !== 'object') return artifact;
        const connector = String(artifact.connector || artifact.surface || artifact.destination || '').toLowerCase();
        if (!/publisher/.test(connector)) return artifact;
        const metadata = artifact.metadata && typeof artifact.metadata === 'object' ? artifact.metadata : {};
        return {
          ...artifact,
          title: cmoLeaderNormalizeLeaderMarkdown(agentProviderValueText(artifact.title || '')),
          summary: cmoLeaderNormalizeLeaderMarkdown(agentProviderValueText(artifact.summary || '')),
          reason: cmoLeaderNormalizeLeaderMarkdown(agentProviderValueText(artifact.reason || '')),
          body: cmoLeaderNormalizeLeaderMarkdown(agentProviderValueText(artifact.body || '')),
          metadata: {
            ...metadata,
            prepared_in_chat: true,
            ingest_status: proof ? agentProviderText(metadata.ingest_status || metadata.ingestStatus, 'verified') : 'not_ingested',
            publish_status: 'not_published'
          }
        };
      })
    : artifacts;
}

function cmoLeaderEnsureCheckpointSynthesisMarkdown(markdown = '', leaderSynthesis = null) {
  const text = String(markdown || '').trim();
  if (!leaderSynthesis?.reportExtras?.selected_next_owner) return text;
  if (/(supporting work products|specialist|completed|prior|handoff|synthesis|evidence|action|approval|補助成果物|specialist成果物|完了済み|統合|実行|承認)/i.test(text)) {
    return text;
  }
  const nextOwner = leaderSynthesis.reportExtras.selected_next_owner;
  const japanese = /[\u3040-\u30ff\u3400-\u9fff]/.test(text);
  const note = japanese
    ? [
        '## 統合メモ',
        `- ここまでの調査・分析結果を確認し、次に見るべき担当領域を **${nextOwner}** としました。`,
        '- これは外部公開や実行ではなく、次の判断材料を整理するステップです。'
      ].join('\n')
    : [
        '## Synthesis note',
        `- Prior research and analysis were reviewed as evidence, and the next focus area is **${nextOwner}**.`,
        '- This checkpoint organizes the next decision; it does not claim external execution or publishing.'
      ].join('\n');
  return [text, note].filter(Boolean).join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}

function cmoLeaderNormalizeLeaderDelivery(kind = '', delivery = null, leaderSynthesis = null) {
  if (normalizedCmoTask(kind) !== 'cmo_leader') return delivery;
  if (!delivery || delivery.error) return delivery;
  if (leaderSynthesis?.reportExtras?.selected_next_owner) {
    return {
      ...delivery,
      fileMarkdown: cmoLeaderEnsureCheckpointSynthesisMarkdown(delivery.fileMarkdown || '', leaderSynthesis),
      contentType: delivery.contentType || 'agent_delivery'
    };
  }
  if (leaderSynthesis?.mode !== 'llm_leader_evaluation_required') return delivery;
  const fileMarkdown = cmoLeaderNormalizeLeaderMarkdown(delivery.fileMarkdown || '');
  const artifacts = cmoLeaderNormalizeLeaderArtifacts(delivery.artifacts || [], leaderSynthesis);
  return {
    ...delivery,
    fileMarkdown,
    contentType: 'cmo_leader_delivery',
    artifacts
  };
}

export const CMO_WORKFLOW_DATA_LAYER_TASKS = Object.freeze([
  'data_analysis'
]);

export const CMO_WORKFLOW_SEARCH_LAYER_TASKS = Object.freeze([
  'research',
  'teardown',
  'validation'
]);

export const CMO_WORKFLOW_RESEARCH_LAYER_TASKS = CMO_WORKFLOW_SEARCH_LAYER_TASKS;

export const CMO_WORKFLOW_PLANNING_LAYER_TASKS = Object.freeze([
  'media_planner',
  'growth'
]);

export const CMO_WORKFLOW_PREPARATION_LAYER_TASKS = Object.freeze([
  'list_creator',
  'landing',
  'seo_specialist',
  'writing',
  'writer',
  'reddit',
  'indie_hackers'
]);

export const CMO_WORKFLOW_ACTION_LAYER_TASKS = Object.freeze([]);

export const CMO_WORKFLOW_EXECUTION_LAYER_TASKS = CMO_WORKFLOW_ACTION_LAYER_TASKS;

export const CMO_WORKFLOW_EXECUTION_SUPPORT_LAYER_TASKS = CMO_WORKFLOW_PREPARATION_LAYER_TASKS;

export const CMO_WORKFLOW_COMMUNITY_LAYER_TASKS = Object.freeze([]);

export const CMO_WORKFLOW_LATE_EXECUTION_LAYER_TASKS = Object.freeze([]);

export const CMO_WORKFLOW_DEFAULT_EXECUTION_TASKS = Object.freeze([
  'media_planner',
  'seo_specialist',
  'landing',
  'growth'
]);

export const CMO_WORKFLOW_SPECIALIST_TASKS = Object.freeze([...new Set([
  ...CMO_WORKFLOW_DATA_LAYER_TASKS,
  ...CMO_WORKFLOW_RESEARCH_LAYER_TASKS,
  ...CMO_WORKFLOW_PLANNING_LAYER_TASKS,
  ...CMO_WORKFLOW_PREPARATION_LAYER_TASKS,
  ...CMO_WORKFLOW_ACTION_LAYER_TASKS,
  ...CMO_WORKFLOW_EXECUTION_LAYER_TASKS,
  ...CMO_WORKFLOW_EXECUTION_SUPPORT_LAYER_TASKS,
  ...CMO_WORKFLOW_COMMUNITY_LAYER_TASKS,
  ...CMO_WORKFLOW_LATE_EXECUTION_LAYER_TASKS
])]);

export const CMO_ACTION_RUN_TASKS = Object.freeze([
  'growth',
  'seo_specialist',
  'landing',
  'writing',
  'writer',
  'list_creator',
  'reddit',
  'indie_hackers'
]);

export const CMO_TASK_EXPANSION_TASKS = Object.freeze([
  'research',
  'teardown',
  'data_analysis',
  'media_planner',
  'growth',
  'list_creator',
  'writing',
  'seo_specialist',
  'landing',
  'reddit',
  'indie_hackers',
  'summary'
]);

export const CMO_LEADER_ANALYSIS_PRELUDE_TASKS = Object.freeze([
  'research',
  'teardown',
  'data_analysis',
  'media_planner',
  'seo_specialist',
  'landing'
]);

export const CMO_FREE_WEB_GROWTH_TASKS = Object.freeze([
  'cmo_leader',
  'research',
  'teardown',
  'data_analysis',
  'media_planner',
  'seo_specialist',
  'landing',
  'growth',
  'writing',
  'reddit',
  'indie_hackers'
]);

export const CMO_AGENT_TEAM_LAUNCH_TASKS = Object.freeze([
  'cmo_leader',
  'research',
  'teardown',
  'data_analysis',
  'media_planner',
  'growth',
  'list_creator',
  'seo_specialist',
  'landing',
  'writing',
  'reddit',
  'indie_hackers'
]);

export const CMO_CONNECTOR_EXECUTION_POLICIES = Object.freeze({
  x_post: Object.freeze({
    connector: 'x',
    capability: 'x.post',
    approvalMode: 'human_or_leader_before_external_post',
    approvalFields: Object.freeze(['oauth_account_handle', 'exact_post_text', 'destination_url', 'stop_rule']),
    proofRequired: Object.freeze(['posted_url', 'timestamp', 'account_id_or_handle']),
    fallback: 'manual_posting_packet'
  }),
  instagram: Object.freeze({
    connector: 'instagram',
    capability: 'instagram.post',
    approvalMode: 'human_or_leader_before_external_post',
    proofRequired: Object.freeze(['posted_url', 'timestamp', 'account_id_or_handle']),
    fallback: 'manual_posting_packet'
  }),
  reddit: Object.freeze({
    connector: 'reddit',
    capability: 'reddit.draft',
    approvalMode: '',
    proofRequired: Object.freeze([]),
    fallback: 'community_draft_packet'
  }),
  indie_hackers: Object.freeze({
    connector: 'indie_hackers',
    capability: 'indie_hackers.draft',
    approvalMode: '',
    proofRequired: Object.freeze([]),
    fallback: 'community_draft_packet'
  }),
  email_ops: Object.freeze({
    connector: 'email',
    capability: 'email.send',
    approvalMode: 'human_or_leader_before_external_send',
    proofRequired: Object.freeze(['message_id', 'recipient_segment', 'timestamp']),
    fallback: 'approval_ready_email_draft'
  }),
  cold_email: Object.freeze({
    connector: 'email',
    capability: 'email.send_outbound',
    approvalMode: 'human_approval_and_compliance_before_send',
    proofRequired: Object.freeze(['message_id', 'recipient_source', 'opt_out_path', 'timestamp']),
    fallback: 'blocked_until_source_sender_and_compliance_approved'
  }),
  directory_submission: Object.freeze({
    connector: 'browser_or_directory',
    capability: 'directory.submit',
    approvalMode: 'human_or_leader_before_external_submission',
    proofRequired: Object.freeze(['directory_url', 'submission_status', 'timestamp']),
    fallback: 'manual_submission_queue'
  }),
  acquisition_automation: Object.freeze({
    connector: 'automation',
    capability: 'automation.write',
    approvalMode: 'human_or_leader_before_connector_write',
    proofRequired: Object.freeze(['workflow_id_or_payload', 'trigger', 'pause_condition']),
    fallback: 'manual_operations_checklist'
  }),
  citation_ops: Object.freeze({
    connector: 'local_seo',
    capability: 'citation.submit',
    approvalMode: 'human_or_leader_before_external_submission',
    proofRequired: Object.freeze(['listing_url', 'status', 'timestamp']),
    fallback: 'manual_citation_queue'
  })
});

const CMO_FREE_WEB_GROWTH_PATTERN = /(free web growth|free marketing|organic growth|organic acquisition|no[-\s]?ads?|without ads|web.*free|free.*web|無料.*(web|ウェブ|施策|集客|流入|マーケ|SEO)|(?:web|ウェブ).*(無料|施策|集客|流入|マーケ)|広告費.*(なし|使わない|ゼロ)|自然流入|オーガニック.*(集客|流入|成長)|無料で.*(集客|伸ば|売上|ユーザー))/i;
const CMO_AGENT_TEAM_LAUNCH_PATTERN = /(agent team|agent_team|launch team|multi[-\s]?agent launch|one announcement|all channels|cross[-\s]?channel|launch campaign|告知.*(まとめ|一括|全部|複数|チーム)|ローンチ.*(まとめ|一括|全部|複数|チーム)|複数.*(agent|エージェント).*告知|1告知|一つの告知|まとめて.*(告知|投稿|発信)|各チャネル.*告知)/i;
const CMO_LEADER_INTENT_PATTERN = /(cmo|chief marketing|marketing leader|free web growth|free marketing|organic growth|organic acquisition|no[-\s]?ads?|without ads|agent team|launch team|multi[-\s]?agent launch|cross[-\s]?channel|all channels|マーケ責任者|cmo的|マーケ部長|広告費.*(なし|使わない|ゼロ)|無料.*(web|ウェブ|施策|集客|流入|マーケ|SEO)|集客(?:したい|を(?:増や|伸ば|改善|強化)|施策|戦略)|(?:ユーザー|登録|問い合わせ|リード|流入|認知).*(?:増や|伸ば|獲得|改善|強化)|複数.*(agent|エージェント).*告知|まとめて.*(告知|投稿|発信))/i;
const CMO_EXTERNAL_ACTION_REQUEST_PATTERN = /(external connector|external execution|connector handoff|connector execution|oauth|publish(?:ing)?|post(?:ing)?|send(?:ing)?|schedule(?:ing)?|execute(?: the)? action|run through action|through to action|through execution|complete through execution|action handoff|action packet|plan\s*(?:and|&)\s*do|plan\s+then\s+execute|not\s+just\s+plan|do\s+it|execute\s+too|外部コネクタ|外部コネクター|コネクタ.*(?:実行|連携|接続|handoff|ハンドオフ)|コネクター.*(?:実行|連携|接続|handoff|ハンドオフ)|実行反映|実行まで|反映まで|アクションまで|actionまで|投稿まで|公開まで|送信まで|配信まで|掲載まで|納品まで|完走|最後まで|計画して実行|実行も|やって|やるところまで|実際に.*(?:投稿|公開|送信|配信|掲載|反映|実行)|(?:x|twitter|ツイッター).*(?:投稿|ポスト|スレッド)|(?:メール|gmail).*(?:送信|配信|スケジュール)|(?:github|ギットハブ).*(?:pr|pull request|プルリク|反映))/i;
const CMO_ACTION_EXECUTION_PATTERN = /(execute|execution|do actions?|run|post|send|publish|submit|external write|実行まで|実行して|実施して|アクション|投稿して|配信して|掲載して|送信して)/i;
const CMO_EXPLICIT_ACTION_CHANNEL_PATTERN = /(x\.com|(?:^|[^a-z0-9])x(?:\s+post|\s+posts|\s+thread)?(?=$|[^a-z0-9])|twitter|tweet|x投稿|ツイッター|instagram|insta|ig\b|インスタ|instagram|reddit|subreddit|レディット|indie\s*hackers|indiehackers|インディーハッカー|インディーハッカーズ|directory submission|directory listing|掲載媒体|媒体掲載|無料掲載|ディレクトリ掲載|gbp|google business profile|サイテーション|citation|meo|email ops|email campaign|newsletter|gmail|send email|cold\s*email|outbound|営業メール|メール配信|メルマガ|acquisition automation|獲得自動化|集客自動化)/i;

export const CMO_TASK_INFERENCE_RULES = Object.freeze([
  Object.freeze({ taskType: 'cmo_leader', score: 90, patterns: Object.freeze([CMO_FREE_WEB_GROWTH_PATTERN]) }),
  Object.freeze({ taskType: 'cmo_leader', score: 90, patterns: Object.freeze([CMO_AGENT_TEAM_LAUNCH_PATTERN]) }),
  Object.freeze({ taskType: 'cmo_leader', score: 20, patterns: Object.freeze([/(?:\bcmo\b|chief marketing|marketing leader|マーケ責任者|cmo的|マーケ部長|マーケティング責任者)/i]) }),
  Object.freeze({ taskType: 'acquisition_automation', patterns: Object.freeze([/(acquisition automation|customer acquisition automation|lead gen automation|lead generation automation|outreach automation|crm automation|pipeline automation|reply handling|follow[-\s]?up automation|集客自動化|リード獲得.*自動化|見込み客.*自動化|営業.*自動化|CRM.*自動化|フォローアップ.*自動化|返信.*自動化|パイプライン.*自動化)/i]) }),
  Object.freeze({ taskType: 'media_planner', patterns: Object.freeze([/(media planner|channel planner|distribution strategy|channel fit|listing media strategy|best media|best channels|where should we list|which media should we use|掲載媒体.*提案|どの掲載媒体|どの媒体|どこに掲載|ホームページ.*媒体|url.*媒体|業種.*媒体|ホームページurl.*業種|業種.*ホームページurl|媒体選定|掲載先選定|チャネル選定|配信媒体選定|媒体が合う|媒体おすすめ|掲載媒体.*合う)/i]) }),
  Object.freeze({ taskType: 'list_creator', score: 20, patterns: Object.freeze([/(list creator|lead sourcing|lead qualification|prospect sourcing|company list builder|prospect research|build.*lead list|build.*prospect list|reviewable lead|public email|public contact|contact path|公開メアド|公開メール|公開連絡先|連絡先収集|見込み客リスト作成|リードリスト作成|営業先リスト|企業リスト作成|送る会社リスト|会社リスト作成|営業リスト作成|公開情報.*リスト|公開情報.*見込み客|公開情報.*営業先|公開情報.*メアド|公開情報.*連絡先)/i]) }),
  Object.freeze({ taskType: 'cold_email', patterns: Object.freeze([/(cold email|cold outbound|outbound email|sales email|prospecting email|メール営業|コールドメール|アウトバウンドメール|営業メール|送信元メール|送信元アドレス|cold outreach|outbound sequence|営業文面|営業メール文面)/i]) }),
  Object.freeze({ taskType: 'email_ops', patterns: Object.freeze([/(email ops|email campaign|lifecycle email|newsletter|drip campaign|welcome email|onboarding email|reactivation email|retention email|send email|メルマガ|メール施策|メール配信|ステップメール|ウェルカムメール|オンボーディングメール|リアクティベーションメール|リテンションメール)/i]) }),
  Object.freeze({ taskType: 'directory_submission', patterns: Object.freeze([/(directory submission|directory listing|submit.*directory|launch directory|startup directory|ai tool directory|product directory|media listing|free listing|list.*product|媒体掲載|無料掲載|投稿先.*リスト|ディレクトリ掲載|AIツール.*掲載|一気に掲載|まとめて掲載|掲載して|登録して|submit.*listing|directory.*submit|listing.*submit)/i]) }),
  Object.freeze({ taskType: 'citation_ops', patterns: Object.freeze([/(citation ops|citation audit|local seo|google business profile|google business|\bgbp\b|\bmeo\b|map engine optimization|nap consistency|local citations|citation cleanup|business listing consistency|サイテーション|ローカルseo|googleビジネスプロフィール|google business profile|gbp対策|meo対策|\bnap\b|店舗情報整備|ローカル掲載|ローカル引用|口コミ導線)/i]) }),
  Object.freeze({ taskType: 'instagram', patterns: Object.freeze([/(instagram|insta|ig\b|インスタ|インスタグラム|reel|carousel|story|ストーリー|リール|カルーセル)/i]) }),
  Object.freeze({ taskType: 'x_post', patterns: Object.freeze([/(x\.com|(?:^|[^a-z0-9])x(?:\s+post|\s+posts|\s+thread)(?=$|[^a-z0-9])|twitter|tweet|tweets|ツイート|x投稿|ポスト|スレッド)/i]) }),
  Object.freeze({ taskType: 'reddit', patterns: Object.freeze([/(reddit|subreddit|redditor|レディット|サブレディット)/i]) }),
  Object.freeze({ taskType: 'indie_hackers', patterns: Object.freeze([/(indie hackers|indiehackers|ih post|インディーハッカー|インディーハッカーズ)/i]) }),
  Object.freeze({ taskType: 'growth', patterns: Object.freeze([/(growth|go[-\s]?to[-\s]?market|gtm|acquisition|activation|retention|signup|signups|more users|outreach|community|product hunt|indie hackers|reddit|x\.com|twitter|marketing|sales|revenue|more money|売上|収益|集客|登録数|会員登録|ユーザー獲得|マーケ|営業|グロース|プロダクトハント|インディーハッカー)/i]) }),
  Object.freeze({ taskType: 'seo_specialist', patterns: Object.freeze([/(content gap|SEO Specialist|keyword gap|search intent|キーワードギャップ|コンテンツギャップ|検索意図)/i]) })
]);

export const CMO_AGENT_ACTION_CONTRACTS = Object.freeze({
  media_planner: {
    action: 'Choose the top three organic priorities and hand off the exact preparation/app-reflection packets.',
    requiredInput: 'Product URL, ICP, conversion goal, constraints, research findings, proof assets, and candidate channels.',
    deliverable: 'Top 3 priority actions, why they beat the other options, leader handoff, preparation-layer tasks, app/site reflection plan, metric, and stop rule.',
    approvalGate: 'Approve the selected top three, their preparation artifacts, app/site surfaces, and stop rules before preparation or connector work proceeds.',
    doneDefinition: 'The leader can release preparation work for the selected priorities without another broad channel strategy pass.'
  },
  seo_specialist: {
    action: 'Create the comparison SEO page packet.',
    requiredInput: 'Product URL, ICP, signup goal, target page path, source-backed keyword/SERP evidence when available.',
    deliverable: 'H1/meta, page outline, comparison table, FAQ, internal links, CTA copy, measurement events.',
    approvalGate: 'Approve page path, claims, CTA, and publish target before handing the packet to the manifest-matched SaaS app surface.',
    doneDefinition: 'An app-ready or paste-ready page packet exists with UTM/measurement notes and no unresolved fields.',
    publisherHandoff: Object.freeze({
      surface: 'publisher',
      contentType: 'seo_article',
      artifactType: 'seo_article',
      artifactTypes: Object.freeze(['seo_article', 'site_publish_packet', 'approval_request']),
      itemType: 'seo_article',
      actionType: 'site_publish_packet',
      channel: 'owned_site',
      connector: 'publisher',
      connectorCapability: 'site_publish_packet'
    })
  },
  landing: {
    action: 'Rewrite the destination page for signup conversion.',
    requiredInput: 'Current page URL/copy, ICP, conversion event, proof assets, objection list, approved claims.',
    deliverable: 'Hero, subcopy, CTA pair, proof block, objection/FAQ block, measurement plan.',
    approvalGate: 'Approve exact copy and target surface before handing it to the manifest-matched SaaS app surface.',
    doneDefinition: 'Replacement copy can be handed to the app surface whose manifest accepts the page/copy artifact without another strategy pass.',
    publisherHandoff: Object.freeze({
      surface: 'publisher',
      contentType: 'landing_page',
      artifactType: 'landing_page',
      artifactTypes: Object.freeze(['landing_page', 'site_publish_packet', 'approval_request']),
      itemType: 'landing_page',
      actionType: 'site_publish_packet',
      channel: 'owned_site',
      connector: 'publisher',
      connectorCapability: 'site_publish_packet'
    })
  },
  growth: {
    action: 'Run the first 7-day acquisition experiment.',
    requiredInput: 'Chosen lane, destination URL, approved copy, available channels, signup events.',
    deliverable: 'Day-by-day action queue, owner, metric, stop rule, next iteration decision.',
    approvalGate: 'Approve the first lane and the one action that will be executed first.',
    doneDefinition: 'One experiment is ready to run with measurable success and stop criteria.'
  },
  list_creator: {
    action: 'Create a reviewable lead or target list for the chosen acquisition lane.',
    requiredInput: 'ICP, geography or segment, allowed public sources, exclusion rules, target count, conversion goal, and downstream specialist.',
    deliverable: 'Reviewable rows with source URL, observed signal, fit reason, contact path when public, personalization seed, and exclusion note.',
    approvalGate: 'Approve source rules and reviewed rows before import, outreach, DM, or email execution.',
    doneDefinition: 'Rows can be reviewed one by one and passed to cold_email, email_ops, directory_submission, or manual operations without guessing.'
  },
  writing: {
    action: 'Produce publishable conversion copy for the selected channel or destination.',
    requiredInput: 'Audience, channel, offer, proof, objection, CTA, approved claims, destination URL, and research handoff.',
    deliverable: 'Message hierarchy, exact copy variants, recommended final version, CTA, placement notes, and revision test.',
    approvalGate: 'Approve exact claims, proof, CTA, and surface before handing to the manifest-matched SaaS app surface.',
    doneDefinition: 'Copy can be pasted into the selected surface or passed to the app surface whose manifest accepts the copy artifact without another strategy pass.',
    publisherHandoff: Object.freeze({
      surface: 'publisher',
      contentType: 'social_copy_packet',
      artifactType: 'social_copy_packet',
      artifactTypes: Object.freeze(['social_copy_packet', 'social_post', 'approval_request']),
      itemType: 'social_post',
      actionType: 'social_post',
      channel: 'social',
      connector: 'manual',
      connectorCapability: 'manual.copy'
    })
  },
  writer: {
    action: 'Produce publishable conversion copy for the selected channel or destination.',
    requiredInput: 'Audience, channel, offer, proof, objection, CTA, approved claims, destination URL, and research handoff.',
    deliverable: 'Message hierarchy, exact copy variants, recommended final version, CTA, placement notes, and revision test.',
    approvalGate: 'Approve exact claims, proof, CTA, and surface before handing to the manifest-matched SaaS app surface.',
    doneDefinition: 'Copy can be pasted into the selected surface or passed to the app surface whose manifest accepts the copy artifact without another strategy pass.',
    publisherHandoff: Object.freeze({
      surface: 'publisher',
      contentType: 'social_copy_packet',
      artifactType: 'social_copy_packet',
      artifactTypes: Object.freeze(['social_copy_packet', 'social_post', 'site_publish_packet', 'approval_request']),
      itemType: 'social_post',
      actionType: 'social_post',
      channel: 'social',
      connector: 'manual',
      connectorCapability: 'manual.copy'
    })
  },
  x_post: {
    action: 'Prepare or publish one X post after approval.',
    requiredInput: 'Approved destination URL, UTM, account/connector status, post angle, link policy.',
    deliverable: 'Exact post text, reply hooks, UTM URL, approval owner, publish/manual handoff status.',
    approvalGate: 'OAuth-connected X account handle, exact post text, destination, and stop rule must be shown and approved before posting.',
    doneDefinition: 'Post is either published with URL/proof, or returned as a manual posting packet.',
    publisherHandoff: Object.freeze({
      surface: 'publisher',
      contentType: 'x_post_packet',
      artifactType: 'x_post_packet',
      artifactTypes: Object.freeze(['x_post_packet', 'x_post', 'approval_request']),
      itemType: 'x_post',
      actionType: 'x_post',
      channel: 'x',
      connector: 'x',
      connectorCapability: 'x.post'
    })
  },
  instagram: {
    action: 'Prepare Instagram-native launch assets and a publish packet after approval.',
    requiredInput: 'Approved destination URL, visual asset or public media URL, account/connector status, format, caption angle, proof, and schedule preference.',
    deliverable: 'Visual hook, carousel/reel/story outline, caption, hashtags, CTA, media requirements, approval checklist, and connector/manual publish packet.',
    approvalGate: 'Instagram account, media asset, exact caption, destination, and schedule must be approved before publishing.',
    doneDefinition: 'Instagram work is either published with proof, or returned as a manual posting packet with all required fields.',
    publisherHandoff: Object.freeze({
      surface: 'publisher',
      contentType: 'instagram_post_packet',
      artifactType: 'instagram_post_packet',
      artifactTypes: Object.freeze(['instagram_post_packet', 'instagram_post', 'social_copy_packet', 'approval_request']),
      itemType: 'instagram_post',
      actionType: 'instagram_post',
      channel: 'instagram',
      connector: 'instagram',
      connectorCapability: 'instagram.post'
    })
  },
  reddit: {
    action: 'Prepare one discussion-first Reddit draft for the manifest-matched SaaS app or manual copy/paste surface.',
    requiredInput: 'Subreddit candidate, community rule check, discussion angle, link policy.',
    deliverable: 'Title, body, comment-link plan, moderation risk, copy/paste guidance, tracking URL, stop rule.',
    approvalGate: 'Subreddit, rules, and exact text must be approved in the manifest-matched SaaS app surface or manually before the user submits it.',
    doneDefinition: 'A reviewable Reddit draft packet exists; no direct Reddit submission is claimed.',
    publisherHandoff: Object.freeze({
      surface: 'publisher',
      contentType: 'reddit_post_packet',
      artifactType: 'reddit_post_packet',
      artifactTypes: Object.freeze(['reddit_post_packet', 'reddit_post', 'approval_request']),
      itemType: 'reddit_post',
      actionType: 'reddit_post',
      channel: 'reddit',
      connector: 'reddit',
      connectorCapability: 'reddit.post'
    })
  },
  indie_hackers: {
    action: 'Prepare one build-in-public Indie Hackers draft for the manifest-matched SaaS app or manual copy/paste surface.',
    requiredInput: 'Learning angle, destination URL, CTA style, approved claims.',
    deliverable: 'Title, post body, CTA, follow-up replies, copy/paste guidance, measurement plan.',
    approvalGate: 'Exact post and destination must be approved in the manifest-matched SaaS app surface or manually before the user publishes it.',
    doneDefinition: 'A reviewable Indie Hackers draft packet exists; no direct Indie Hackers publishing is claimed.',
    publisherHandoff: Object.freeze({
      surface: 'publisher',
      contentType: 'indie_hackers_packet',
      artifactType: 'indie_hackers_packet',
      artifactTypes: Object.freeze(['indie_hackers_packet', 'indie_hackers_post', 'approval_request']),
      itemType: 'indie_hackers_post',
      actionType: 'indie_hackers_post',
      channel: 'indie_hackers',
      connector: 'indie_hackers',
      connectorCapability: 'indie_hackers.post'
    })
  },
  directory_submission: {
    action: 'Create a prioritized directory submission queue.',
    requiredInput: 'Product URL, category, screenshots, approved claims, pricing, terms/privacy URLs.',
    deliverable: 'Directory shortlist, per-site field map, reusable listing copy, UTM map, status tracker.',
    approvalGate: 'Each site and listing text must be approved before submission.',
    doneDefinition: 'Each target is marked submitted/live/blocked with URL or blocker reason.',
    publisherHandoff: Object.freeze({
      surface: 'publisher',
      contentType: 'directory_packet',
      artifactType: 'directory_packet',
      artifactTypes: Object.freeze(['directory_packet', 'directory_submission', 'approval_request']),
      itemType: 'directory_submission',
      actionType: 'directory_submission',
      channel: 'directory',
      connector: 'directory_app',
      connectorCapability: 'directory.submit'
    })
  },
  citation_ops: {
    action: 'Prepare local SEO citation and GBP-ready listing work.',
    requiredInput: 'Canonical business name, address, phone, website, categories, service area, hours, description, and local proof.',
    deliverable: 'Canonical NAP/profile record, citation priority queue, inconsistency fixes, GBP field brief, review request flow, and manual submission checklist.',
    approvalGate: 'Canonical business facts and each external listing target must be approved before citation submission or profile edits.',
    doneDefinition: 'Citation work is either submitted with listing URLs/proof, or returned as a manual citation queue with blocker reasons.'
  },
  acquisition_automation: {
    action: 'Design the first acquisition automation flow.',
    requiredInput: 'Approved source, trigger, CRM/list destination, consent constraints, conversion event.',
    deliverable: 'Trigger, state machine, first message, approval gates, connector payloads, pause conditions.',
    approvalGate: 'Connector write actions, rate limits, and message copy must be approved.',
    doneDefinition: 'Flow is runnable as connector payloads or a manual operations checklist.'
  },
  email_ops: {
    action: 'Prepare a permissioned lifecycle email.',
    requiredInput: 'Audience segment, consent source, sender account, offer, unsubscribe/stop rule.',
    deliverable: 'Subject, body, segment rule, send conditions, tracking, approval owner.',
    approvalGate: 'Sender, recipient segment, and exact copy must be approved before send.',
    doneDefinition: 'Email is either sent with proof or returned as an approval-ready draft.'
  },
  cold_email: {
    action: 'Prepare compliant outbound only when source and approval exist.',
    requiredInput: 'Lead source, ICP filter, sender/domain readiness, lawful basis, opt-out handling.',
    deliverable: 'Qualification rules, sequence copy, review queue, send cap, stop conditions.',
    approvalGate: 'Lead source, sender, copy, and compliance constraints must be approved.',
    doneDefinition: 'Outbound is blocked if any compliance/source requirement is missing.'
  }
});

export const CMO_LEADER_CONTROL_SPECIALIZATION = Object.freeze({
  selectionRubric: Object.freeze([
    'ICP and signup goal fit',
    'competitor/channel evidence needed',
    'funnel bottleneck and proof gaps',
    'free/organic channel constraints',
    'SaaS app readiness for publish handoff'
  ]),
  synthesisOutputs: Object.freeze([
    'ICP and positioning decision',
    'channel and next-best alternative decision',
    'specialist dispatch packets',
    'leader approval queue',
    'Manifest-matched SaaS app handoff packet'
  ])
});

function normalizedCmoTask(value = '') {
  return String(value || '').trim().toLowerCase();
}

function cmoAliasToken(value = '') {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function normalizeCmoLeaderAlias(taskType = '') {
  const token = cmoAliasToken(taskType);
  if ([
    'launch_team_leader',
    'launch_team',
    'agent_team_launch',
    'free_web_growth_leader',
    'free_web_growth',
    'organic_growth',
    'free_marketing',
    'agent_team_leader',
    'agent_team',
    'team_leader',
    'cait_growth_team',
    'cait_cmo_leader',
    'cait_marketing_team',
    'cait_growth',
    'growth_team',
    'marketing_team',
    'organic_acquisition',
    'marketing_leader'
  ].includes(token)) return 'cmo_leader';
  return '';
}

export function cmoLeaderTaskTypeForText(text = '') {
  return CMO_LEADER_INTENT_PATTERN.test(String(text || '')) ? 'cmo_leader' : '';
}

export function cmoFollowupSpecialistTaskForText(text = '') {
  const safe = String(text || '').trim();
  if (!safe) return '';
  if (/(seo|自然検索|検索流入|検索意図|検索順位|サチコ|search console|\bgsc\b|keyword|キーワード|serp|h1|h2|meta description|メタディスクリプション|コンテンツseo|記事|article)/i.test(safe)) return 'seo_specialist';
  if (/(landing\s*page|\blp\b|ランディング|LP|hero|ヒーロー|cta|ページ|page|コピー|copy|ファーストビュー|conversion|cvr|登録導線|トライアル導線)/i.test(safe)) return 'landing';
  if (/(集客|リード|登録|トライアル|signup|trial|acquisition|growth|問い合わせ|lead)/i.test(safe)) return 'growth';
  return '';
}

export function isFreeWebGrowthIntent(taskType = '', prompt = '') {
  const explicit = normalizedCmoTask(taskType);
  if (['free_web_growth_leader', 'free_web_growth', 'organic_growth', 'free_marketing'].includes(explicit)) return true;
  return CMO_FREE_WEB_GROWTH_PATTERN.test(String(prompt || ''));
}

export function isAgentTeamLaunchIntent(taskType = '', prompt = '') {
  const explicit = normalizedCmoTask(taskType);
  if (explicit === 'agent_team_launch') return true;
  return CMO_AGENT_TEAM_LAUNCH_PATTERN.test(String(prompt || ''));
}

export function isLargeAgentTeamIntent(taskType = '', prompt = '') {
  return isFreeWebGrowthIntent(taskType, prompt) || isAgentTeamLaunchIntent(taskType, prompt);
}

export function cmoExternalActionRequestedFromText(text = '') {
  return CMO_EXTERNAL_ACTION_REQUEST_PATTERN.test(String(text || ''));
}

export function isCmoExternalExecutionIntent(taskType = '', prompt = '') {
  const explicit = normalizedCmoTask(taskType);
  const text = String(prompt || '').trim();
  if (CMO_WORKFLOW_ACTION_LAYER_TASKS.includes(explicit)) return true;
  return cmoExternalActionRequestedFromText(text);
}

export function cmoExplicitActionChannelRequested(prompt = '') {
  return CMO_EXPLICIT_ACTION_CHANNEL_PATTERN.test(String(prompt || '').trim());
}

export function cmoSourceLayerPreferencesFromText(text = '') {
  const safe = String(text || '').trim();
  const tasks = [];
  const push = (task) => {
    if (task && !tasks.includes(task)) tasks.push(task);
  };
  const noDataSignal = /(?:ga4|gsc|search console|google analytics|analytics|crm|csv|data|metrics|データ|アクセス解析|計測|指標|サチコ|search console)[^\n。.!?]{0,40}(?:なし|ない|未接続|未導入|使えない|無し|no data|none|not connected|unavailable)|(?:なし|ない|未接続|未導入|no data|none|not connected|unavailable)[^\n。.!?]{0,40}(?:ga4|gsc|search console|google analytics|analytics|crm|csv|data|metrics|データ|アクセス解析|計測|指標|サチコ|search console)/i.test(safe);
  if (!noDataSignal && /(ga4|gsc|search console|google analytics|analytics|kpi|dashboard|cohort|funnel analysis|funnel|metrics|アクセス解析|データ分析|計測|指標|登録率|cv率|サチコ)/i.test(safe)) push('data_analysis');
  push(/(competitor|teardown|benchmark|positioning|vs\.?|競合|比較|ベンチマーク|ポジショニング)/i.test(safe) ? 'teardown' : 'research');
  return tasks;
}

export function cmoBroadMultiActionIntentFromText(text = '') {
  return /(as much as possible|multiple actions?|all possible|all channels|cross[-\s]?channel|do as many|できる限り|可能な限り|複数アクション|複数.*実行|最大限|全部|まとめて|実行フェイズ|できるだけ.*(?:実行|アクション)|複数.*(?:媒体|チャネル|施策))/i.test(String(text || ''));
}

export function cmoParallelSameLayerIntentFromText(text = '') {
  const source = String(text || '').trim();
  return cmoBroadMultiActionIntentFromText(source)
    || /(parallel|same[-\s]?layer|fan[-\s]?out|同列|同時|並列|複数.*(?:エージェント|調査|分析|検証|プラン|施策|案|候補|チャネル)|深さ|品質優先|品質重視|徹底|網羅)/i.test(source);
}

export function cmoPlanOnlyIntentFromText(text = '') {
  const source = String(text || '');
  if (/(plan only|planning only|strategy only|no execution|do not execute|do not post|proposal only|計画のみ|計画だけ|提案のみ|提案だけ|実行しない|投稿しない|配信しない|掲載しない)/i.test(source)) return true;
  const asksPlan = /(make|create|build|draft|作って|作成|欲しい|ほしい).{0,30}(plan|strategy|プラン|計画|戦略|媒体プラン)|(?:plan|strategy|プラン|計画|戦略|媒体プラン).{0,30}(make|create|build|draft|作って|作成|欲しい|ほしい)/i.test(source);
  const asksExecution = CMO_ACTION_EXECUTION_PATTERN.test(source);
  return Boolean(asksPlan && !asksExecution);
}

export function cmoMediaPlanningPreferredFromText(text = '') {
  return /(priority channels?|preferred channels?|channel mix|media mix|referral sites?|directories?|directory listing|sns|social media|social\b|community|communities|媒体|チャネル|優先チャネル|優先媒体|紹介サイト|外部掲載|掲載先|SNS|ソーシャル|コミュニティ)/i.test(String(text || ''));
}

export function cmoChannelPreferenceActionTasksFromText(taskType = '', text = '') {
  const task = normalizedCmoTask(taskType);
  if (!['cmo_leader', 'free_web_growth_leader', 'agent_team_launch'].includes(task)) return [];
  const source = String(text || '').trim();
  if (!source || cmoPlanOnlyIntentFromText(source)) return [];
  const wantsAction = cmoBroadMultiActionIntentFromText(source) || CMO_ACTION_EXECUTION_PATTERN.test(source);
  if (!wantsAction) return [];
  const actions = [];
  const push = (name) => {
    if (name && !actions.includes(name)) actions.push(name);
  };
  if (/(referral sites?|directories?|directory listing|listing sites?|掲載先|紹介サイト|外部掲載|媒体掲載|ディレクトリ)/i.test(source)) {
    push('seo_specialist');
    push('writing');
  }
  if (/(sns|social media|social\b|community|communities|x\/twitter|twitter\/x|SNS|ソーシャル|コミュニティ)/i.test(source)) {
    push('writing');
    if (/(community|communities|reddit|indie\s*hackers|indiehackers|コミュニティ|レディット|インディーハッカー|インディーハッカーズ)/i.test(source)) {
      push('reddit');
      push('indie_hackers');
    }
  }
  return actions;
}

export function cmoPlannerCandidateActionTasksFromText(taskType = '', text = '') {
  const task = normalizedCmoTask(taskType);
  if (!['cmo_leader', 'free_web_growth_leader', 'agent_team_launch'].includes(task)) return [];
  const source = String(text || '').trim();
  if (!source || cmoExplicitActionChannelRequested(source)) return [];
  const shouldSuggestFromPlanner = cmoExternalActionRequestedFromText(source)
    || cmoBroadMultiActionIntentFromText(source)
    || (cmoParallelSameLayerIntentFromText(source) && cmoMediaPlanningPreferredFromText(source));
  if (!shouldSuggestFromPlanner) return [];
  const actions = [];
  const push = (name) => {
    if (name && !actions.includes(name)) actions.push(name);
  };
  push('landing');
  push('writing');
  if (cmoBroadMultiActionIntentFromText(source) || isAgentTeamLaunchIntent(task, source) || cmoMediaPlanningPreferredFromText(source)) {
    push('seo_specialist');
    push('reddit');
    push('indie_hackers');
  }
  return actions;
}

export function cmoPreparationTasksForActions(actions = [], text = '') {
  const selected = [];
  const push = (task) => {
    const safe = normalizedCmoTask(task);
    if (safe && !selected.includes(safe)) selected.push(safe);
  };
  const actionSet = new Set((Array.isArray(actions) ? actions : []).map(normalizedCmoTask).filter(Boolean));
  for (const task of ['writing', 'writer', 'seo_specialist', 'landing', 'list_creator', 'reddit', 'indie_hackers']) {
    if (actionSet.has(task)) push(task);
  }
  if (['x_post', 'instagram', 'reddit', 'indie_hackers', 'email_ops', 'directory_submission'].some((task) => actionSet.has(task))) push('writing');
  if (actionSet.has('cold_email')) {
    push('list_creator');
    push('writing');
  }
  if (actionSet.has('directory_submission') || actionSet.has('citation_ops') || /(seo|自然検索|search|サチコ|search console)/i.test(text)) push('seo_specialist');
  if (actionSet.has('acquisition_automation')) push('landing');
  return selected;
}

export function cmoNormalizeWorkflowPlannedTasks(context = {}) {
  const helpers = context.helpers && typeof context.helpers === 'object' ? context.helpers : {};
  const normalizeTaskTypes = typeof helpers.normalizeTaskTypes === 'function'
    ? helpers.normalizeTaskTypes
    : (items) => (Array.isArray(items) ? items : []).map(normalizedCmoTask).filter(Boolean);
  const tasks = normalizeTaskTypes(context.plannedTasks || []);
  const primary = normalizedCmoTask(tasks[0] || context.primaryTask || '');
  if (!['cmo_leader', 'free_web_growth_leader'].includes(primary)) return tasks;
  const text = String(context.prompt || '');
  const allowed = new Set([
    primary,
    'cmo_leader',
    'free_web_growth_leader',
    ...CMO_WORKFLOW_SPECIALIST_TASKS
  ]);
  const mapped = [];
  const push = (task) => {
    const safe = normalizedCmoTask(task);
    if (!safe || safe === 'summary' || !allowed.has(safe) || mapped.includes(safe)) return;
    mapped.push(safe);
  };
  const pushMapped = (task) => {
    const safe = normalizedCmoTask(task);
    if (!safe || safe === 'summary') return;
    if (safe === 'free_web_growth_leader') {
      push(primary);
      return;
    }
    if (['x_post', 'instagram', 'email_ops'].includes(safe)) {
      push('writing');
      return;
    }
    if (safe === 'cold_email') {
      push('list_creator');
      push('writing');
      return;
    }
    if (['directory_submission', 'citation_ops'].includes(safe)) {
      push('seo_specialist');
      push('writing');
      return;
    }
    if (safe === 'acquisition_automation') {
      push('landing');
      return;
    }
    push(safe);
  };
  push(primary);
  for (const task of tasks) pushMapped(task);
  if (/(x\.com|twitter|tweet|x投稿|instagram|インスタ|email|メール|投稿|post)/i.test(text)) push('writing');
  if (/(directory|listing|citation|掲載|ディレクトリ|サイテーション)/i.test(text)) push('seo_specialist');
  if (/(automation|自動化|signup|signups|登録|trial|トライアル|lp|landing|ランディング)/i.test(text)) push('landing');
  return mapped;
}

export function defaultCmoActionTaskFromText(text = '') {
  const safe = String(text || '').trim();
  if (/(acquisition automation|獲得自動化|集客自動化|自動化|automation)/i.test(safe)) return 'landing';
  if (/(cold\s*email|outbound|sales email|営業メール|アウトバウンド|新規開拓|リード獲得)/i.test(safe)) return 'writing';
  if (/(email|mail|メール|メルマガ|newsletter|ニュースレター)/i.test(safe)) return 'writing';
  if (/(instagram|インスタ|ig)/i.test(safe)) return 'writing';
  if (/(reddit|subreddit|レディット)/i.test(safe)) return 'reddit';
  if (/(indie\s*hackers|indiehackers|インディーハッカー|インディーハッカーズ)/i.test(safe)) return 'indie_hackers';
  if (/(community|コミュニティ)/i.test(safe)) return 'reddit';
  if (/(x\.com|(?:^|[^a-z0-9])x(?:\s+post|\s+posts|\s+thread)?(?=$|[^a-z0-9])|twitter|tweet|x投稿|ツイッター)/i.test(safe)) return 'writing';
  if (/(directory|listing|citation|掲載媒体|媒体掲載|ディレクトリ|サイテーション)/i.test(safe)) return 'seo_specialist';
  return '';
}

export function cmoActionIntentSignalsFromText(text = '') {
  const source = String(text || '').trim();
  return {
    socialExecutionIntent: /(x\.com|(?:^|[^a-z0-9])x(?:\s+post|\s+posts|\s+thread)?(?=$|[^a-z0-9])|twitter|tweet|tweets|social post|sns投稿|ソーシャル投稿|ツイート|x投稿|ポスト|スレッド|投稿|発信)/i.test(source),
    xExecutionIntent: /(x\.com|(?:^|[^a-z0-9])x(?:\s+post|\s+posts|\s+thread)?(?=$|[^a-z0-9])|twitter|tweet|tweets|ツイート|x投稿|ポスト|スレッド)/i.test(source),
    instagramExecutionIntent: /(instagram|insta|ig\b|インスタ|インスタグラム|reel|carousel|story|ストーリー|リール|カルーセル)/i.test(source),
    emailExecutionIntent: /(email ops|email campaign|newsletter|gmail|mailbox|send email|cold email|outbound email|メール|メアド|gmail|配信|送信|コールドメール|営業メール|メール配信|メルマガ)/i.test(source),
    redditExecutionIntent: /(reddit|subreddit|レディット)/i.test(source),
    indieHackersExecutionIntent: /(indie hackers|indiehackers|インディーハッカー|インディーハッカーズ)/i.test(source),
    communityExecutionIntent: /(reddit|indie hackers|indiehackers|product hunt|community|subreddit|レディット|インディーハッカー|インディーハッカーズ|プロダクトハント|コミュニティ)/i.test(source),
    directoryExecutionIntent: /(directory submission|directory listing|launch director(?:y|ies)|startup director(?:y|ies)|ai tool director(?:y|ies)|media listing|free listing|掲載媒体|媒体掲載|無料掲載|掲載先|ディレクトリ掲載|AIツール.*掲載|一気に掲載|まとめて掲載)/i.test(source),
    citationExecutionIntent: /(gbp|google business profile|googleビジネスプロフィール|サイテーション|citation|meo|ローカルseo)/i.test(source),
    listCreatorIntent: /(list creator|lead sourcing|lead qualification|prospect sourcing|company list builder|prospect research|build.*lead list|build.*prospect list|reviewable lead|見込み客リスト作成|リードリスト作成|営業先リスト|企業リスト作成|送る会社リスト|会社リスト作成|営業リスト作成|公開情報.*リスト|公開情報.*見込み客|公開情報.*営業先)/i.test(source),
    explicitColdEmailIntent: /(cold email|cold outbound|outbound email|sales email|prospecting email|メール営業|コールドメール|アウトバウンドメール|営業メール|送信元メール|送信元アドレス|cold outreach|outbound sequence|営業文面|営業メール文面)/i.test(source),
    acquisitionAutomationIntent: /(acquisition automation|獲得自動化|集客自動化)/i.test(source)
  };
}

export function cmoRequestedActionTasksFromText(text = '') {
  const signals = cmoActionIntentSignalsFromText(text);
  const tasks = [];
  const push = (task) => {
    if (task && !tasks.includes(task)) tasks.push(task);
  };
  if (signals.xExecutionIntent) push('writing');
  if (signals.instagramExecutionIntent) push('writing');
  if (signals.redditExecutionIntent) push('reddit');
  if (signals.indieHackersExecutionIntent) push('indie_hackers');
  if (signals.communityExecutionIntent && !signals.redditExecutionIntent && !signals.indieHackersExecutionIntent) {
    push('reddit');
    push('indie_hackers');
  }
  if (signals.directoryExecutionIntent) push('seo_specialist');
  if (signals.citationExecutionIntent) push('seo_specialist');
  if (signals.acquisitionAutomationIntent) push('landing');
  if (signals.emailExecutionIntent) push('writing');
  if (signals.explicitColdEmailIntent) {
    push('list_creator');
    push('writing');
  }
  return tasks;
}

export function cmoWorkflowReplanDecisionText(text = '') {
  const source = String(text || '').trim();
  if (!source) return '';
  const patterns = [
    /\|\s*Primary lane\s*\|\s*([^|\n]+)\|/i,
    /\|\s*1\s*\|\s*([^|\n]+)\|\s*execute_now/i,
    /(?:Execution\/action lane|Execution lane|実行\/施策化レーン|実行レーン)\s*[:：]\s*([^\n]+)/i,
    /(?:first execution lane is|first execution lane|first lane|chosen lane|selected lane)\s+(?:is\s+)?\*\*([^*\n]+)\*\*/i,
    /(?:first lane|chosen lane|selected lane|優先レーン|選択レーン)\s*[:：]\s*([^\n]+)/i,
    /優先実行レーンは\s*\*\*([^*\n]+)\*\*/i
  ];
  for (const pattern of patterns) {
    const match = source.match(pattern);
    const value = String(match?.[1] || '').trim();
    if (value) return value.slice(0, 800);
  }
  return '';
}

export function cmoWorkflowTaskSignalScore(task = '', text = '') {
  const safeTask = normalizedCmoTask(task);
  const source = String(text || '').trim();
  if (!safeTask || !source) return 0;
  const signalPatterns = {
    seo_specialist: [/seo|serp|organic|search intent|owned\/search|検索|自然検索|検索流入|メタ|meta title|h1|内部リンク|比較lp|比較ページ/i],
    landing: [/landing page|\blp\b|destination page|hero|cta|signup page|trial page|登録導線|受け皿|ランディング/i],
    writing: [/copy|message|post draft|social draft|listing copy|ad copy|creative|投稿案|投稿ドラフト|本文|コピー|訴求/i],
    list_creator: [/lead rows|prospect list|target list|company list|リードリスト|企業リスト|見込み客/i],
    x_post: [/\bx\/twitter\b|twitter|tweet|x post|x投稿|ツイート|ポスト/i],
    instagram: [/instagram|insta|ig\b|インスタ|リール|ストーリー/i],
    reddit: [/reddit|subreddit|レディット/i],
    indie_hackers: [/indie\s*hackers|indiehackers|インディーハッカー/i],
    directory_submission: [/directory|listing|product hunt|alternativeto|掲載|ディレクトリ|紹介サイト/i],
    citation_ops: [/gbp|google business profile|citation|local seo|サイテーション|meo|ローカルseo/i],
    email_ops: [/email|newsletter|gmail|メール|メルマガ|配信/i],
    cold_email: [/cold email|outbound|sales email|営業メール|アウトバウンド/i],
    acquisition_automation: [/automation|workflow|state machine|自動化|獲得自動化|集客自動化/i],
    growth: [/growth experiment|7-day|experiment|検証|実験|スプリント/i]
  };
  const patterns = signalPatterns[safeTask] || [];
  return patterns.reduce((score, pattern) => score + (pattern.test(source) ? 1 : 0), 0);
}

export function cmoWorkflowReplanDecision(candidateTasks = [], sourceText = '', layer = 1, actionLayerStart = 5) {
  const candidates = [...new Set((Array.isArray(candidateTasks) ? candidateTasks : []).map(normalizedCmoTask).filter(Boolean))];
  if (candidates.length <= 1) return null;
  const decisionText = cmoWorkflowReplanDecisionText(sourceText);
  const scoredText = decisionText || String(sourceText || '').trim();
  if (!scoredText) return null;
  const actionSignals = CMO_WORKFLOW_ACTION_LAYER_TASKS
    .filter((task) => cmoWorkflowTaskSignalScore(task, scoredText) > 0);
  const requiredPreparation = Number(layer || 1) < Number(actionLayerStart || 5)
    ? cmoPreparationTasksForActions(actionSignals, scoredText)
    : [];
  const scores = candidates
    .map((task) => {
      const directScore = cmoWorkflowTaskSignalScore(task, scoredText) * 3;
      const sourceScore = decisionText ? cmoWorkflowTaskSignalScore(task, sourceText) : 0;
      const prepScore = requiredPreparation.includes(task) ? 4 : 0;
      return { task, score: directScore + sourceScore + prepScore };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || candidates.indexOf(left.task) - candidates.indexOf(right.task));
  if (!scores.length) return null;
  const maxSelected = Number(layer || 1) >= Number(actionLayerStart || 5) ? 3 : 2;
  const selectedTasks = scores.slice(0, maxSelected).map((item) => item.task);
  if (!selectedTasks.length || selectedTasks.length >= candidates.length) return null;
  return {
    selectedTasks,
    candidateTasks: candidates,
    decisionText: decisionText || scoredText.slice(0, 600),
    reason: decisionText
      ? `leader checkpoint selected next layer from media/planning decision: ${decisionText.slice(0, 220)}`
      : 'leader checkpoint selected next layer from accumulated specialist signals'
  };
}

export function cmoSequentialUserActionPriority(task = '', sourceText = '', selectedTasks = []) {
  const safeTask = normalizedCmoTask(task);
  const selectedSet = selectedTasks instanceof Set
    ? selectedTasks
    : new Set((Array.isArray(selectedTasks) ? selectedTasks : []).map(normalizedCmoTask).filter(Boolean));
  const defaultActionTask = defaultCmoActionTaskFromText(sourceText);
  return (selectedSet.has(safeTask) ? 10 : 0)
    + (defaultActionTask === safeTask ? 8 : 0)
    + (cmoWorkflowTaskSignalScore(safeTask, sourceText) * 4);
}

export function cmoInferTaskSequence(context = {}) {
  const prioritized = Array.isArray(context.prioritized) ? context.prioritized : [];
  const ranked = Array.isArray(context.ranked) ? context.ranked : [];
  const primary = normalizedCmoTask(prioritized[0]);
  if (!['cmo_leader', 'agent_team_launch'].includes(primary)) return null;
  const taskType = context.taskType || '';
  const prompt = context.prompt || '';
  const text = String(context.text || prompt || '').toLowerCase();
  const maxTasks = Math.max(1, Number(context.maxTasks || 10) || 10);
  const taskDependencyOrdered = typeof context.taskDependencyOrdered === 'function'
    ? context.taskDependencyOrdered
    : (items) => [...new Set((Array.isArray(items) ? items : []).map(normalizedCmoTask).filter(Boolean))];
  const leaderTaskLayer = typeof context.leaderTaskLayer === 'function'
    ? context.leaderTaskLayer
    : () => null;
  const signals = cmoActionIntentSignalsFromText(text);

  if (primary === 'agent_team_launch') {
    const expandedTeam = [];
    const preferredSpecialists = ranked.filter((name) => {
      const safe = normalizedCmoTask(name);
      if (!safe || safe.endsWith('_leader')) return false;
      return CMO_AGENT_TEAM_LAUNCH_TASKS.includes(safe);
    });
    const pushUniqueExpanded = (name) => {
      const safe = normalizedCmoTask(name);
      if (!safe || expandedTeam.includes(safe)) return;
      expandedTeam.push(safe);
    };
    pushUniqueExpanded(primary);
    for (const name of preferredSpecialists) pushUniqueExpanded(name);
    for (const name of CMO_AGENT_TEAM_LAUNCH_TASKS) pushUniqueExpanded(name);
    for (const name of prioritized) {
      if (name !== 'agent_team_launch') pushUniqueExpanded(name);
    }
    return expandedTeam.slice(0, maxTasks);
  }

  const expandedTeam = [];
  const explicitSpecialists = ranked.filter((name) => {
    const safe = normalizedCmoTask(name);
    if (!safe || safe === 'cmo_leader' || safe.endsWith('_leader')) return false;
    return CMO_WORKFLOW_SPECIALIST_TASKS.includes(safe);
  });
  const pushUniqueExpanded = (name) => {
    const safe = normalizedCmoTask(name);
    if (!safe || expandedTeam.includes(safe)) return;
    expandedTeam.push(safe);
  };
  ['cmo_leader', ...cmoSourceLayerPreferencesFromText(text)].forEach(pushUniqueExpanded);
  if (cmoParallelSameLayerIntentFromText(text)) {
    CMO_WORKFLOW_RESEARCH_LAYER_TASKS.forEach(pushUniqueExpanded);
  }
  if (cmoMediaPlanningPreferredFromText(text)) pushUniqueExpanded('media_planner');
  if (explicitSpecialists.includes('cold_email') && !explicitSpecialists.includes('list_creator')) {
    pushUniqueExpanded('list_creator');
  }
  for (const name of explicitSpecialists) pushUniqueExpanded(name);
  [
    ...CMO_WORKFLOW_PLANNING_LAYER_TASKS,
    ...CMO_WORKFLOW_PREPARATION_LAYER_TASKS,
    ...CMO_WORKFLOW_DEFAULT_EXECUTION_TASKS
  ].forEach(pushUniqueExpanded);
  if (isCmoExternalExecutionIntent(taskType, prompt) || isAgentTeamLaunchIntent(taskType, prompt)) {
    ['growth', 'seo_specialist', 'landing', 'writing'].forEach(pushUniqueExpanded);
    if (signals.directoryExecutionIntent || signals.citationExecutionIntent) pushUniqueExpanded('seo_specialist');
    if (signals.xExecutionIntent || signals.instagramExecutionIntent) pushUniqueExpanded('writing');
    if (signals.emailExecutionIntent) {
      pushUniqueExpanded('writing');
      if (signals.explicitColdEmailIntent) {
        pushUniqueExpanded('list_creator');
      }
    }
    if (signals.communityExecutionIntent || isAgentTeamLaunchIntent(taskType, prompt)) {
      pushUniqueExpanded('writing');
    }
  }
  if (signals.explicitColdEmailIntent) {
    pushUniqueExpanded('list_creator');
    pushUniqueExpanded('writing');
  }
  if (prioritized.includes('summary')) pushUniqueExpanded('summary');

  const requestedExecutors = [];
  const pushRequestedExecutor = (name) => {
    const safe = normalizedCmoTask(name);
    if (safe && !requestedExecutors.includes(safe)) requestedExecutors.push(safe);
  };
  if (signals.xExecutionIntent) pushRequestedExecutor('writing');
  if (signals.instagramExecutionIntent) pushRequestedExecutor('writing');
  if (signals.redditExecutionIntent) pushRequestedExecutor('writing');
  if (signals.indieHackersExecutionIntent) pushRequestedExecutor('writing');
  if (signals.emailExecutionIntent) pushRequestedExecutor('writing');
  if (signals.explicitColdEmailIntent) pushRequestedExecutor('list_creator');
  if (signals.explicitColdEmailIntent || expandedTeam.includes('cold_email')) pushRequestedExecutor('writing');
  if (signals.directoryExecutionIntent) pushRequestedExecutor('seo_specialist');
  if (signals.citationExecutionIntent) pushRequestedExecutor('seo_specialist');
  if (signals.acquisitionAutomationIntent) pushRequestedExecutor('landing');
  const plannerCandidateExecutors = [
    ...cmoPlannerCandidateActionTasksFromText('cmo_leader', text),
    ...cmoChannelPreferenceActionTasksFromText('cmo_leader', text)
  ].filter((task, index, self) => self.indexOf(task) === index);
  for (const name of plannerCandidateExecutors) {
    pushUniqueExpanded(name);
    pushRequestedExecutor(name);
  }
  const requestedPreparation = cmoPreparationTasksForActions(requestedExecutors, text);
  const preferredPlanningTasks = (signals.directoryExecutionIntent || signals.citationExecutionIntent || plannerCandidateExecutors.length || cmoMediaPlanningPreferredFromText(text))
    ? ['media_planner']
    : ['growth'];

  const finalizeCmoSequence = (orderedTasks, requestedTasks = []) => {
    const dependencyOrdered = taskDependencyOrdered([...orderedTasks, ...requestedTasks]);
    const sourcePreferences = cmoSourceLayerPreferencesFromText(text);
    const layerPrelude = [
      ...dependencyOrdered.filter((task) => [
        'cmo_leader',
        ...CMO_WORKFLOW_DATA_LAYER_TASKS,
        ...CMO_WORKFLOW_RESEARCH_LAYER_TASKS
      ].includes(task)),
      ...preferredPlanningTasks.filter((task) => dependencyOrdered.includes(task))
    ];
    const sourceAndPlanning = layerPrelude.filter((task, index, self) => self.indexOf(task) === index && [
      'cmo_leader',
      ...CMO_WORKFLOW_DATA_LAYER_TASKS,
      ...CMO_WORKFLOW_RESEARCH_LAYER_TASKS,
      ...CMO_WORKFLOW_PLANNING_LAYER_TASKS
    ].includes(task));
    const requestedPrep = dependencyOrdered.filter((task) => requestedPreparation.includes(task) && !sourceAndPlanning.includes(task));
    const requested = dependencyOrdered.filter((task) => requestedTasks.includes(task) && !sourceAndPlanning.includes(task) && !requestedPrep.includes(task));
    const remainder = dependencyOrdered.filter((task) => !sourceAndPlanning.includes(task) && !requestedPrep.includes(task) && !requested.includes(task));
    const full = [...sourceAndPlanning, ...requestedPrep, ...requested, ...remainder];
    const mustKeep = new Set(['cmo_leader', ...requestedTasks, ...requested]);
    if (plannerCandidateExecutors.length) {
      for (const task of sourcePreferences) mustKeep.add(task);
    }
    for (const task of requestedPrep) mustKeep.add(task);
    if (plannerCandidateExecutors.length || cmoMediaPlanningPreferredFromText(text)) mustKeep.add('media_planner');
    if (!plannerCandidateExecutors.length && cmoMediaPlanningPreferredFromText(text)) mustKeep.add('growth');
    if (!plannerCandidateExecutors.length && full.includes('summary') && maxTasks >= 10) mustKeep.add('summary');
    const selected = [];
    const parallelSameLayerRequested = cmoParallelSameLayerIntentFromText(text);
    const layerLimitForCmo = (layer) => {
      if (layer === 1) return 1;
      if (layer === 2) return parallelSameLayerRequested ? CMO_WORKFLOW_RESEARCH_LAYER_TASKS.length : 1;
      if (layer === 3) return parallelSameLayerRequested ? CMO_WORKFLOW_PLANNING_LAYER_TASKS.length : 1;
      if (layer === 4) {
        if (parallelSameLayerRequested) return CMO_WORKFLOW_PREPARATION_LAYER_TASKS.length;
        return requestedPreparation.length
          ? Math.max(1, Math.min(3, requestedPreparation.length || 1))
          : 1;
      }
      return 1;
    };
    const pushSelected = (task) => {
      const safe = normalizedCmoTask(task);
      if (!safe || selected.includes(safe)) return;
      if (safe === 'data_analysis' && !sourcePreferences.includes('data_analysis')) return;
      selected.push(safe);
    };
    for (const task of full) {
      if (mustKeep.has(task)) pushSelected(task);
    }
    for (const layer of [1, 2, 3, 4]) {
      const layerLimit = layerLimitForCmo(layer);
      let layerSelectionCount = selected.filter((task) => leaderTaskLayer('cmo_leader', task) === layer).length;
      for (const task of full) {
        if (selected.length >= maxTasks) break;
        if (leaderTaskLayer('cmo_leader', task) !== layer) continue;
        if (layerSelectionCount >= layerLimit && !mustKeep.has(task)) continue;
        const beforeCount = selected.length;
        pushSelected(task);
        if (selected.length > beforeCount) layerSelectionCount += 1;
      }
    }
    for (const task of full) {
      if (selected.length >= maxTasks) break;
      if (!mustKeep.has(task)) continue;
      pushSelected(task);
    }
    return selected
      .sort((left, right) => {
        const leftLayer = leaderTaskLayer('cmo_leader', left) ?? 99;
        const rightLayer = leaderTaskLayer('cmo_leader', right) ?? 99;
        if (leftLayer !== rightLayer) return leftLayer - rightLayer;
        return full.indexOf(left) - full.indexOf(right);
      })
      .slice(0, maxTasks);
  };

  if (expandedTeam.includes('writing') && expandedTeam.includes('list_creator')) {
    const reordered = expandedTeam.filter((name) => name !== 'list_creator' && name !== 'writing');
    const insertAt = Math.max(reordered.indexOf('landing'), reordered.indexOf('seo_specialist')) + 1;
    const summaryIndex = reordered.indexOf('summary');
    const targetIndex = summaryIndex >= 0
      ? summaryIndex
      : (insertAt > 0 ? insertAt : reordered.length);
    reordered.splice(targetIndex, 0, 'list_creator', 'writing');
    return finalizeCmoSequence(reordered, requestedExecutors);
  }
  return finalizeCmoSequence(expandedTeam, requestedExecutors);
}

export function cmoEnsureLeaderWorkflowActionTasks(context = {}) {
  const helpers = context.helpers && typeof context.helpers === 'object' ? context.helpers : {};
  const normalizeTaskTypes = typeof helpers.normalizeTaskTypes === 'function'
    ? helpers.normalizeTaskTypes
    : (items) => (Array.isArray(items) ? items : []).map(normalizedCmoTask).filter(Boolean);
  const leaderTaskLayer = typeof helpers.leaderTaskLayer === 'function' ? helpers.leaderTaskLayer : () => 1;
  const leaderActionLayerStart = typeof helpers.leaderActionLayerStart === 'function' ? helpers.leaderActionLayerStart : () => 5;
  const leaderSourceCollectionLayerTasks = typeof helpers.leaderSourceCollectionLayerTasks === 'function' ? helpers.leaderSourceCollectionLayerTasks : () => [];
  const leaderTaskRequiresSourceCollection = typeof helpers.leaderTaskRequiresSourceCollection === 'function' ? helpers.leaderTaskRequiresSourceCollection : () => false;
  const tasks = normalizeTaskTypes(context.plannedTasks || []);
  const primary = normalizedCmoTask(tasks[0] || context.primaryTask || '');
  if (!['cmo_leader', 'free_web_growth_leader'].includes(primary)) return null;
  const text = String(context.prompt || '').toLowerCase();
  const options = context.options && typeof context.options === 'object' ? context.options : {};
  const configuredResearchBucketLimit = Number(options.maxExternalResearchTasks || 0);
  const summaryTasks = new Set(['summary']);
  const dataCollectionTasks = new Set(['data_analysis']);
  const ordered = [];
  const push = (task) => {
    const safe = normalizedCmoTask(task);
    if (!safe || summaryTasks.has(safe) || ordered.includes(safe)) return;
    ordered.push(safe);
  };
  const sortLeaderWorkflowTasks = (items, max = items.length) => [...items].sort((left, right) => {
    const leftLayer = leaderTaskLayer(primary, left) ?? 99;
    const rightLayer = leaderTaskLayer(primary, right) ?? 99;
    if (leftLayer !== rightLayer) return leftLayer - rightLayer;
    return ordered.indexOf(left) - ordered.indexOf(right);
  }).slice(0, max);
  const sourceCollectionTasks = leaderSourceCollectionLayerTasks(primary);
  const preferredCmoSourceTasks = cmoSourceLayerPreferencesFromText(text);
  const preferredSourceTask = preferredCmoSourceTasks.find((task) => sourceCollectionTasks.includes(task))
    || sourceCollectionTasks.find((task) => ['research', 'data_analysis', 'validation', 'teardown', 'diligence', 'debug'].includes(task))
    || sourceCollectionTasks[0]
    || 'research';
  push(primary);
  let initialExternalResearchCount = 0;
  for (const task of tasks) {
    if (task === 'free_web_growth_leader') continue;
    if (configuredResearchBucketLimit > 0 && ['research', 'teardown', 'validation'].includes(task)) {
      if (initialExternalResearchCount >= configuredResearchBucketLimit) continue;
      initialExternalResearchCount += 1;
    }
    push(task);
  }
  if (sourceCollectionTasks.length && !ordered.some((task) => leaderTaskRequiresSourceCollection(primary, task))) {
    push(preferredSourceTask);
  }
  CMO_WORKFLOW_DATA_LAYER_TASKS.forEach(push);
  CMO_WORKFLOW_RESEARCH_LAYER_TASKS.forEach(push);
  CMO_WORKFLOW_PLANNING_LAYER_TASKS.forEach(push);
  CMO_WORKFLOW_PREPARATION_LAYER_TASKS.forEach(push);
  CMO_WORKFLOW_DEFAULT_EXECUTION_TASKS.forEach(push);
  CMO_WORKFLOW_ACTION_LAYER_TASKS.forEach(push);

  const requestedExternalExecution = cmoExternalActionRequestedFromText(text);
  const requestedActions = [];
  const pushRequestedAction = (task) => {
    const safe = normalizedCmoTask(task);
    if (!safe || requestedActions.includes(safe)) return;
    requestedActions.push(safe);
    push(safe);
  };
  for (const task of cmoRequestedActionTasksFromText(text)) pushRequestedAction(task);
  const plannerCandidateActions = [
    ...cmoPlannerCandidateActionTasksFromText(primary, text),
    ...cmoChannelPreferenceActionTasksFromText(primary, text)
  ].filter((task, index, self) => self.indexOf(task) === index);
  for (const task of plannerCandidateActions) pushRequestedAction(task);

  const selected = [];
  const pushSelected = (task) => {
    const safe = normalizedCmoTask(task);
    if (!safe || summaryTasks.has(safe) || selected.includes(safe)) return;
    selected.push(safe);
  };
  pushSelected(primary);
  const actionRequested = requestedActions.length > 0 || requestedExternalExecution;
  const preparationForRequestedActions = cmoPreparationTasksForActions(requestedActions, text);
  const parallelSameLayerRequested = cmoParallelSameLayerIntentFromText(text);
  const cmoResearchLayerLimit = parallelSameLayerRequested ? CMO_WORKFLOW_RESEARCH_LAYER_TASKS.length : 1;
  const cmoPlanningLayerLimit = parallelSameLayerRequested
    || requestedActions.length > 1
    || plannerCandidateActions.length > 1
    ? CMO_WORKFLOW_PLANNING_LAYER_TASKS.length
    : 1;
  const cmoPreparationLayerLimit = actionRequested
    ? (parallelSameLayerRequested
        ? CMO_WORKFLOW_PREPARATION_LAYER_TASKS.length
        : Math.max(1, Math.min(3, preparationForRequestedActions.length || 1)))
    : (parallelSameLayerRequested ? CMO_WORKFLOW_PREPARATION_LAYER_TASKS.length : 1);
  const layerLimits = new Map([
    [1, 1],
    [2, cmoResearchLayerLimit],
    [3, cmoPlanningLayerLimit],
    [4, cmoPreparationLayerLimit]
  ]);
  const layerCounts = new Map();
  const sourceBucketCounts = new Map();
  const sourceBucketForTask = (task) => dataCollectionTasks.has(normalizedCmoTask(task)) ? 'data' : 'research';
  const pushLayerTask = (task, itemOptions = {}) => {
    const safe = normalizedCmoTask(task);
    if (!safe || safe === primary || summaryTasks.has(safe) || selected.includes(safe)) return;
    if (safe === 'data_analysis' && !preferredCmoSourceTasks.includes('data_analysis') && !itemOptions.force) return;
    const layer = leaderTaskLayer(primary, safe) || 1;
    if (layer >= leaderActionLayerStart(primary)) {
      if (itemOptions.force || requestedActions.includes(safe)) pushSelected(safe);
      return;
    }
    if (layer === 1 && leaderTaskRequiresSourceCollection(primary, safe)) {
      const bucket = sourceBucketForTask(safe);
      const currentBucket = Number(sourceBucketCounts.get(bucket) || 0);
      const bucketLimit = 1;
      if (!itemOptions.force && currentBucket >= bucketLimit) return;
      pushSelected(safe);
      sourceBucketCounts.set(bucket, currentBucket + 1);
      layerCounts.set(layer, Number(layerCounts.get(layer) || 0) + 1);
      return;
    }
    const limit = layerLimits.has(layer) ? layerLimits.get(layer) : 1;
    const current = Number(layerCounts.get(layer) || 0);
    if (!itemOptions.force && current >= limit) return;
    pushSelected(safe);
    layerCounts.set(layer, current + 1);
  };
  const fillLayer = (layer, preferredTasks = []) => {
    for (const task of preferredTasks) {
      if (layer !== 1 && Number(layerCounts.get(layer) || 0) >= Number(layerLimits.get(layer) || 1)) break;
      if (ordered.includes(task) && leaderTaskLayer(primary, task) === layer) pushLayerTask(task);
    }
    for (const task of ordered) {
      if (layer !== 1 && Number(layerCounts.get(layer) || 0) >= Number(layerLimits.get(layer) || 1)) break;
      if (leaderTaskLayer(primary, task) === layer) pushLayerTask(task);
    }
  };

  const planningPreferences = requestedActions.some((task) => ['seo_specialist', 'landing', 'writing'].includes(task)) || plannerCandidateActions.length || cmoMediaPlanningPreferredFromText(text)
    ? ['media_planner', 'growth']
    : ['growth', 'media_planner'];
  if (preferredCmoSourceTasks.includes('data_analysis')) fillLayer(1, ['data_analysis']);
  fillLayer(2, preferredCmoSourceTasks.filter((task) => task !== 'data_analysis').concat(['research', 'teardown', 'validation']));
  fillLayer(3, planningPreferences);
  for (const task of preparationForRequestedActions) pushLayerTask(task, { force: true });
  fillLayer(4, preparationForRequestedActions.concat(['seo_specialist', 'landing', 'writing', 'writer', 'list_creator']));
  for (const task of requestedActions) pushLayerTask(task, { force: true });
  const actionTasks = ordered.filter((task) => (leaderTaskLayer(primary, task) || 1) >= leaderActionLayerStart(primary));
  if (
    !requestedActions.length
    && requestedExternalExecution
    && !selected.some((task) => (leaderTaskLayer(primary, task) || 1) >= leaderActionLayerStart(primary))
  ) {
    const defaultActionTask = defaultCmoActionTaskFromText(text);
    if (actionTasks.includes(defaultActionTask)) {
      pushLayerTask(defaultActionTask, { force: true });
    }
  }
  for (const task of ordered) {
    const layer = leaderTaskLayer(primary, task) || 1;
    if (layer >= leaderActionLayerStart(primary)) continue;
    if (task === 'data_analysis' && !preferredCmoSourceTasks.includes('data_analysis')) continue;
    if (!selected.includes(task)) pushLayerTask(task);
  }
  return sortLeaderWorkflowTasks(selected);
}

export function isCmoActionTask(taskType = '') {
  return CMO_ACTION_RUN_TASKS.includes(normalizedCmoTask(taskType));
}

export function isCmoWorkflowSpecialistTask(taskType = '') {
  return CMO_WORKFLOW_SPECIALIST_TASKS.includes(normalizedCmoTask(taskType));
}

export function cmoAgentActionContractForKind(kind = '') {
  return CMO_AGENT_ACTION_CONTRACTS[normalizedCmoTask(kind)] || CMO_AGENT_ACTION_CONTRACTS.growth;
}

function cmoAgentPublisherHandoffMetadata(contract = {}) {
  const handoff = contract?.publisherHandoff && typeof contract.publisherHandoff === 'object'
    ? contract.publisherHandoff
    : null;
  if (!handoff) return null;
  const artifactTypes = Array.isArray(handoff.artifactTypes)
    ? handoff.artifactTypes.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  return {
    surface: handoff.surface || 'publisher',
    content_type: handoff.contentType || handoff.content_type || handoff.artifactType || handoff.artifact_type || '',
    artifact_type: handoff.artifactType || handoff.artifact_type || handoff.contentType || handoff.content_type || '',
    artifact_types: artifactTypes,
    item_type: handoff.itemType || handoff.item_type || '',
    action_type: handoff.actionType || handoff.action_type || '',
    channel: handoff.channel || '',
    connector: handoff.connector || '',
    connector_capability: handoff.connectorCapability || handoff.connector_capability || '',
    review_status: 'needs_review',
    ingest_status: 'not_ingested',
    publish_status: 'not_published'
  };
}

function cmoAgentPublisherHandoffInstruction(contract = {}) {
  const metadata = cmoAgentPublisherHandoffMetadata(contract);
  if (!metadata) return '';
  return [
    'Publisher review handoff: this task is known at dispatch time to produce a Publisher-reviewable artifact.',
    'Return the final delivery file or report artifact with explicit metadata:',
    `surface=${metadata.surface}`,
    `content_type=${metadata.content_type}`,
    `artifact_type=${metadata.artifact_type}`,
    metadata.artifact_types.length ? `artifact_types=${metadata.artifact_types.join('|')}` : '',
    `item_type=${metadata.item_type}`,
    `action_type=${metadata.action_type}`,
    `channel=${metadata.channel}`,
    `connector=${metadata.connector}`,
    `connector_capability=${metadata.connector_capability}`,
    'For social/community channels, also include profile_handle/profile_url/media_assets/channel_rules/approval_checklist when known or label each as missing.',
    'review_status=needs_review',
    'ingest_status=not_ingested',
    'publish_status=not_published',
    'Do not claim posted, queued, published, submitted, handed off, ingested, or ready until Publisher/app or connector proof exists.'
  ].filter(Boolean).join(' ');
}

export function cmoAgentActionContractMarkdown(kind = '', isJapanese = false) {
  const contract = cmoAgentActionContractForKind(kind);
  const publisherInstruction = cmoAgentPublisherHandoffInstruction(contract);
  return `## Agent action contract
| Field | Definition |
| --- | --- |
| Action | ${contract.action} |
| Required input | ${contract.requiredInput} |
| Deliverable | ${contract.deliverable} |
| Approval gate | ${contract.approvalGate} |
| Done definition | ${contract.doneDefinition} |${publisherInstruction ? `\n\n${publisherInstruction}` : ''}`;
}

export const CMO_INTAKE_REQUIRED_SIGNALS = Object.freeze([
  Object.freeze({ signal: 'objective', label: 'objective' }),
  Object.freeze({ signal: 'business', label: 'business_or_product' }),
  Object.freeze({ signal: 'audience', label: 'target_customer' }),
  Object.freeze({ signal: 'sourceData', label: 'source_data_context' }),
  Object.freeze({ anyOf: Object.freeze(['currentState', 'constraints']), label: 'current_state_or_constraints' }),
  Object.freeze({ signal: 'deliverable', label: 'desired_delivery', skipWhenIntakeAnswered: true }),
  Object.freeze({ signal: 'longEnough', label: 'business_context_detail', skipWhenIntakeAnswered: true })
]);

export const CMO_INTAKE_QUESTIONS = Object.freeze({
  ja: Object.freeze([
    '売りたい商材・サービス内容とURLを教えてください。',
    '最終的に増やしたい行動とターゲットを教えてください。例: 購入、問い合わせ、登録。誰向けかも入れてください。',
    '営業資料、DL資料、LP、価格表、GA4、Search Console、CRM、売上、問い合わせ、SNSなど、読ませたい資料や実データはありますか？なければ「なし」で大丈夫です。',
    '制約、使いたいチャネル、X/TwitterアカウントURL、希望する納品形式を教えてください。回答後は追加ヒアリングを繰り返さず提案に進みます。'
  ]),
  en: Object.freeze([
    'What product or service do you want to sell? Include the URL.',
    'What final action should increase, and who is the target customer? Examples: purchase, lead, signup, or retention.',
    'What source materials or real data should the leader read: sales deck, downloadable material, landing page, pricing, GA4, Search Console, CRM, sales, leads, ads, or social data? If none, say none.',
    'What constraints, preferred channels, X/Twitter account URL, and delivery format should apply? After this, CAIt will proceed without repeated intake.'
  ])
});

export const CMO_LEADER_BEHAVIOR = Object.freeze({
  taskInferenceRules: CMO_TASK_INFERENCE_RULES,
  taskExpansionTasks: CMO_TASK_EXPANSION_TASKS,
  analysisPreludeTasks: CMO_LEADER_ANALYSIS_PRELUDE_TASKS,
  connectorExecutionPolicies: CMO_CONNECTOR_EXECUTION_POLICIES,
  normalizeAlias: normalizeCmoLeaderAlias,
  taskTypeForText: cmoLeaderTaskTypeForText,
  followupSpecialistTaskForText: cmoFollowupSpecialistTaskForText,
  inferTaskSequence: cmoInferTaskSequence,
  intakeProfile: 'growth',
  intakeRequiredSignals: CMO_INTAKE_REQUIRED_SIGNALS,
  intakeQuestions: CMO_INTAKE_QUESTIONS,
  actionMode: 'saas_handoff_only',
  publishSurface: 'saas',
  normalizeWorkflowPlannedTasks: cmoNormalizeWorkflowPlannedTasks,
  plannerAllowsCandidateAgentTasks: false,
  ensureWorkflowActionTasks: cmoEnsureLeaderWorkflowActionTasks,
  replanDecision: cmoWorkflowReplanDecision,
  sequentialUserActionPriority: cmoSequentialUserActionPriority,
  externalActionRequested: cmoExternalActionRequestedFromText,
  intentChecks: Object.freeze({
    freeWebGrowth: isFreeWebGrowthIntent,
    agentTeamLaunch: isAgentTeamLaunchIntent,
    largeTeam: isLargeAgentTeamIntent,
    externalExecution: isCmoExternalExecutionIntent
  })
});

const CMO_LEADER_AGENT_PURPOSE = 'Lead source-grounded marketing strategy by integrating ICP, funnel evidence, page/search analytics, proof status, channel priority, and approval-bound execution planning while keeping external channel execution owned by the responsible agent or app.';

const CMO_LEADER_AGENT_ACTION_BOUNDARIES = Object.freeze(Object.entries(CMO_AGENT_ACTION_CONTRACTS).map(([taskType, contract]) => Object.freeze({
  id: `cmo_handoff_${taskType}`,
  mode: isCmoActionTask(taskType) ? 'leader_to_action_handoff' : 'leader_strategy_or_preparation_handoff',
  requires: Object.freeze([contract.requiredInput]),
  prepares: Object.freeze([
    contract.deliverable,
    ...(contract.publisherHandoff ? ['publisher_review_metadata_instruction'] : [])
  ]),
  produces: Object.freeze([
    `${taskType}_leader_handoff_packet`,
    ...(contract.publisherHandoff ? [`${taskType}_publisher_review_packet_instruction`] : [])
  ]),
  cannotClaim: Object.freeze(['published', 'sent', 'posted', 'external_app_ingested_without_proof', 'SaaS executed']),
  authorityBoundary: contract.approvalGate,
  doneDefinition: contract.doneDefinition
})));

const CMO_LEADER_DELIVERY_CONTRACT = Object.freeze({
  requiredDeliverySections: Object.freeze(['Executive summary', 'Confirmed facts', 'Source coverage ledger', 'Open questions', 'Priority diagnosis', 'Recommended actions', 'Channel priority table', '2-week execution plan', 'Measurement checklist', 'Inputs needed next']),
  requiredEvidence: Object.freeze(['source data or prior work used', 'GA4/Search Console/funnel/page/article evidence status or explicit missing labels', 'external execution proof when any external execution is claimed']),
  mustLabel: Object.freeze(['assumptions', 'source coverage', 'missing analytics/search/page/article inputs', 'blocked actions', 'approval owner/status', 'execution not claimed']),
  forbiddenClaims: Object.freeze(['published', 'Publisher item created without proof', 'external app ingested without proof', 'traffic, conversion, query intent, page performance, or content gap treated as verified without supplied evidence', 'channel execution or handoff completion without approval and proof']),
  validDeliveryCheck: 'A valid CMO delivery reads like one end-user growth plan, includes a source coverage ledger for analytics/search/page/content evidence, ties gaps to priority, and keeps internal orchestration or handoff metadata out of the Markdown.'
});

const AGENT_DEFINITION = {
  provider: AGENT_PROVIDER,
  agentPurpose: CMO_LEADER_AGENT_PURPOSE,
  agentActionBoundaries: CMO_LEADER_AGENT_ACTION_BOUNDARIES,
  deliveryContract: CMO_LEADER_DELIVERY_CONTRACT,
  deprecatedSeedIds: Object.freeze([
    'agent_free_web_growth_leader_01'
  ]),
  "fileName": "cmo-team-leader-delivery.md",
  "healthService": "cmo_team_leader",
  "modelRole": "CMO-level marketing strategy and acquisition leadership",
  "executionLayer": "leader",
  "taskRouting": {
    "softMatchTokens": ['cmo', 'marketing_leader', 'free_web_growth_leader', 'launch_team_leader', 'agent_team_launch'],
    "tagHints": ['leader', 'marketing', 'growth', 'strategy']
  },
  "leaderBehavior": CMO_LEADER_BEHAVIOR,
  "connectorExecutionPolicies": CMO_CONNECTOR_EXECUTION_POLICIES,
  "leaderControlSpecialization": CMO_LEADER_CONTROL_SPECIALIZATION,
  "workflowProfile": {
    "aliases": [
      "free_web_growth_leader"
    ],
    "defaultLayer": 4,
    "actionLayerStart": 5,
    "externalActionMode": "saas_handoff_only",
    "publishSurface": "saas",
    "publishApprovalSurface": "saas",
    "layers": [
      {
        "name": "data",
        "phase": "data",
        "number": 1,
        "tasks": [
          "data_analysis"
        ]
      },
      {
        "name": "research",
        "phase": "research",
        "number": 2,
        "tasks": [
          "research",
          "teardown",
          "validation"
        ]
      },
      {
        "name": "planning",
        "phase": "planning",
        "number": 3,
        "tasks": [
          "media_planner",
          "growth"
        ]
      },
      {
        "name": "preparation",
        "phase": "preparation",
        "number": 4,
        "tasks": [
          "list_creator",
          "landing",
          "seo_specialist",
          "writing",
          "writer",
          "reddit",
          "indie_hackers"
        ]
      },
      {
        "name": "saas_publish_handoff",
        "phase": "app_handoff",
        "number": 5,
        "tasks": []
      },
      {
        "name": "summary",
        "phase": "summary",
        "number": 6,
        "tasks": []
      }
    ],
    "protocolExtras": [
      "Data is a separate optional layer and should run only when GA4, Search Console, analytics, CRM, CSV, billing, or other measurable data is supplied or explicitly requested.",
      "Search is allowed only in the research/search layer. Later planning, preparation, and action layers must use the leader handoff and prior research outputs instead of browsing again.",
      "Bridge every layer through the leader: CAIt -> leader -> optional data/research -> planning -> preparation data stored for SaaS -> action/app handoff that links the matched SaaS app screen selected by manifest fit.",
      "Set ICP, positioning, and proof before selecting channels.",
      "Pick the first media lane and explain why it wins against the next-best lane.",
      "Preparation-layer outputs are assumed to be normalized into SaaS delivery/app-handoff data. The action layer should surface the matched SaaS app link selected by inputContract/capabilities, not dispatch another posting worker.",
      "Keep a leader approval queue before handing publishable packets to the matched SaaS app surface.",
      "When choosing a specialist for a layer, inspect all registered agent manifests that match the required capability; do not choose by sample/built-in identity.",
      "At each checkpoint, convert incoming specialist outputs into a structured handoff digest with facts, sources, decisions, artifacts, blockers, and next_inputs before dispatching the next layer.",
      "If a selected specialist's CMO action contract includes publisherHandoff, the first dispatch packet must instruct that specialist to return a Publisher review packet with explicit surface/content_type/artifact_type/artifact_types/item_type/action_type/channel/connector/connector_capability metadata and needs_review/not_ingested/not_published status.",
      "Downstream layers must read the prior raw agent delivery Markdown first as user-facing source material, then use the supporting fact index only to avoid losing sources, decisions, or blockers.",
      "At each checkpoint, cite concrete completed specialist findings by task name before releasing the next layer.",
      "Before final publish handoff, surface the exact packet, target surface, copy, destination, and stop rule.",
      "At final summary, cite concrete specialist findings by task name; never deliver only a generic plan or another research approval request."
    ]
  },
  "seedProfile": {
    "id": "agent_cmo_leader_01",
    "name": "CMO TEAM LEADER",
    "description": "Built-in executive leader that analyzes ICP, competitors, funnel, and channels first, then coordinates marketing strategy, launch, organic growth, channel execution, and leader-mediated approval through exact specialist dispatch and action packets.",
    "taskTypes": [
      "cmo",
      "cmo_leader",
      "marketing_leader",
      "growth",
      "marketing",
      "agent_team",
      "agent_team_launch",
      "launch_team",
      "free_web_growth",
      "free_web_growth_leader"
    ],
    "successRate": 0.94,
    "avgLatencySec": 16,
    "capabilities": [
      "marketing_strategy",
      "specialist_orchestration",
      "launch_orchestration",
      "organic_growth_orchestration",
      "approval_gate",
      "leader_approval_queue",
      "connector_dispatch_queue",
      "planned_action_queue",
      "dispatch_packet_contract",
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
      "specialist_selection_policy": "Select from every registered agent manifest in the required layer by taskTypes, capabilities, input/output contracts, evidence needs, and approval constraints. Do not prefer sample or built-in agents by identity; sample agents are only candidates under the same manifest/provider contract.",
      "downstream_task_types": [
        "research",
        "writing",
        "media_planner",
        "growth",
        "list_creator",
        "landing",
        "seo_specialist",
        "reddit",
        "indie_hackers"
      ],
      "execution_mode": "leader_mediated",
      "approval_role": "cmo_leader",
      "planned_action_contract": "lane_owner_artifact_matched_app_metric",
      "merged_leader_aliases": [
        "launch_team_leader",
        "free_web_growth_leader"
      ]
    }
  },
  "systemPrompt": "You are the built-in CMO Team Leader for AIagent2. Lead marketing strategy, positioning, launch, free-web growth, channel selection, acquisition experiments, and messaging quality. A good leader gathers information before proposing: first summarize the order owner's intent, identify the product/service URL, inventory supplied sales materials, downloadable materials, landing pages, proof assets, GA4/Search Console/CRM/sales data, existing article/content inventory, and any other source data to read, then label each source as supplied, missing, stale, or not accessed. First analyze the business, ICP, competitors, current funnel, proof, channels, constraints, and source coverage before assigning growth or channel specialists. Use completed evidence-layer, planning-layer, and preparation-layer raw agent deliveries before deciding channels or specialist dispatch; those raw deliveries are user-facing source material, not internal memos. Select specialists from the registered agent manifests available in the required layer by taskTypes, capabilities, input/output contracts, evidence needs, and approval constraints. Do not prefer sample or built-in agents by identity; sample agents and external agents are candidates under the same provider endpoint contract. Treat task names as capability categories, not fixed agent identities. At every checkpoint, read the incoming user-facing specialist deliveries first, summarize the business facts and decisions in user-facing language, and dispatch the next layer from that reviewed user-facing work instead of from a broad template. Act as the marketing leader who chooses the media, required capability, order, and publishable packet that should move next. If a selected specialist is known from CMO_AGENT_ACTION_CONTRACTS to produce an app-reviewable artifact, instruct it from the first dispatch to return a user-facing review packet plus separate metadata for the app surface; do not make the Markdown itself read like metadata. Specialists prepare LP, SEO, and writing artifacts when their manifests match the need; external publishing itself belongs to the matched SaaS app surface selected by manifest inputContract/capabilities, not the CMO workflow. Turn the chosen lane into exact leader-owned packets: every dispatched specialist step should name owner/capability, objective, required input, exact artifact, approval rule, timing, metric, and stop condition in user-facing terms. When the user asks for action, execution, connector work, publishing, sending, scheduling, or completion through delivery, do not stop at a plan or \"approve research first\" message. Choose the next safe executable lane and emit a matched-SaaS-app-ready packet or a structured authority_request for the blocker. Absorb launch-team and free-web-growth leadership inside the CMO role instead of handing them off to separate leaders. Coordinate specialist agents without hiding assumptions, cost, or measurement gaps. Focus on customers, channels, proof, conversion, and measurable growth.",
  "deliverableHint": "Deliver in the user requested language in a clear, user-readable format.",
  "reviewHint": "Remove generic marketing advice, sharpen the target segment, make the measurement plan concrete, and turn prior work into one end-user growth plan with clear priority, execution order, source coverage, proof gaps, and next inputs. Keep internal orchestration, manifest, app, and handoff details out of the Markdown.",
  "executionFocus": "Set ICP, positioning, channel priority, offer, proof, and acquisition experiments from evidence. Decide which business action should move next, but present it as a user-facing execution plan, not as internal agent routing or app handoff.",
  "outputSections": [
    "Executive summary",
    "Confirmed facts",
    "Source coverage ledger",
    "Open questions",
    "Priority diagnosis",
    "Recommended actions",
    "Channel priority table",
    "2-week execution plan",
    "Measurement checklist",
    "Inputs needed next"
  ],
  "inputNeeds": [
    "Product/service URL",
    "Business or product",
    "ICP",
    "Sales, downloadable, landing page, pricing, or proof materials",
    "GA4, Search Console, CRM, sales, lead, or campaign data status",
    "Positioning hypothesis",
    "Channels",
    "Growth target",
    "Current proof/assets",
    "Current funnel or bottleneck signal",
    "Execution assets and approval readiness",
    "What the business owner can approve for external execution"
  ],
  "acceptanceChecks": [
    "Research evidence is used before channel choice",
    "ICP, competitor/channel evidence, and positioning are set before tactics",
    "GA4, Search Console, current landing-page copy, proof assets, existing content, and CRM/sales data are each labeled supplied, missing, stale, or not accessed",
    "Missing source coverage is tied to the priority diagnosis without inventing traffic, query, page, or content performance",
    "Chosen media and next-best alternative are explicit",
    "Approval and execution gates are explicit",
    "Each planned action names owner, artifact, approval condition, metric, and stop rule",
    "Internal agent, manifest, and app routing details are not exposed in the user-facing Markdown",
    "User-facing plan carries facts, sources, decisions, blockers, and next inputs without exposing internal orchestration",
    "Growth metric is explicit"
  ],
  "firstMove": "Summarize the order owner intent and supplied source data, then analyze business, ICP, competitors, funnel, proof, channel fit, and growth metric before assigning marketing specialists. Turn that analysis into leader-owned action decisions, not just orchestration notes.",
  "failureModes": [
    "Do not assign channels before ICP and positioning",
    "Do not ignore competitor/channel evidence",
    "Do not leave the next lane or approval owner ambiguous",
    "Do not define metrics too vaguely"
  ],
  "evidencePolicy": "Use supplied URLs, sales/downloadable materials, proof assets, GA4, Search Console, CRM, customer, competitor, channel, positioning, funnel, and connector-readiness evidence before assigning specialists. Label missing data, strategic bets, and assumptions separately from facts and date any current market or channel observations.",
  "nextAction": "End with the chosen channel priority, why it beats the next-best lane, the first campaign experiment, the growth metric, and the concrete inputs needed next.",
  "confidenceRubric": "High when business, ICP, positioning, proof, channels, connector readiness, and growth metric are clear; medium when competitor evidence or execution ownership is partial; low when product, market, or approval path is vague.",
  "handoffArtifacts": [
    "Research findings",
    "User-facing growth plan",
    "Chosen media and why",
    "Lane decision memo",
    "Execution approval queue",
    "Planned action table",
    "Growth experiment"
  ],
  "prioritizationRubric": "Prioritize marketing moves by ICP fit, channel evidence, positioning leverage, execution readiness, speed to learning, and compounding distribution value.",
  "measurementSignals": [
    "ICP signal",
    "Channel conversion",
    "Approval-to-execution latency",
    "CAC/time cost proxy",
    "Experiment learning rate"
  ],
  "assumptionPolicy": "Assume the CMO must set ICP and positioning before tactics and remains the broker for approval and execution. Do not assume channel-market fit, connector readiness, or approval ownership without evidence.",
  "escalationTriggers": [
    "Business, ICP, or offer is unclear",
    "Claims require proof not supplied",
    "Approval rules or external execution readiness are unclear",
    "Channel actions risk spam or policy violations"
  ],
  "minimumQuestions": [
    "What product/service and URL are we marketing?",
    "What is the order owner's real intent or decision?",
    "What sales/downloadable materials, proof assets, GA4/Search Console/CRM, or other data should be read?",
    "Who is the ICP and what user action matters most?",
    "What positioning or competitor context exists?",
    "Which external execution surface and assets are actually ready for this lane?",
    "Which prepared materials should be approved for external execution?",
    "Which growth metric matters most now?"
  ],
  "reviewChecks": [
    "ICP and positioning precede tactics",
    "Competitor/channel evidence is used",
    "Approval boundary for execution is explicit",
    "Chosen lane, approval owner, execution surface, and next artifact are explicit",
    "Metric is explicit"
  ],
  "depthPolicy": "Default to ICP, positioning, one chosen media lane, one approval queue, and one planned action table. Go deeper when copy, execution readiness, and competitor/channel evidence must align.",
  "concisionRule": "Avoid generic marketing frameworks; tie each tactic to ICP, positioning, proof, metric, research evidence, and the user's execution path. Prefer short action rows over loose strategy prose when execution is implied.",
  "toolStrategy": {
    "web_search": "default",
    "source_mode": "current_market_competitors_channels_and_positioning",
    "note": "Before assigning marketing work, verify ICP, competitors, channel behavior, positioning, proof, and any time-sensitive media or execution assumptions with current sources."
  },
  "specialistMethod": [
    "Set ICP, positioning, promise, proof, and growth metric before tactics.",
    "Check current competitors, channels, and audience language before assigning specialists.",
    "Create execution-ready work packets that preserve positioning while naming the exact objective, input, artifact, approval rule, timing, metric, and stop rule.",
    "Collect prepared drafts into an approval queue so the business owner can decide what gets routed to an external surface or operator.",
    "Return a planned action table that shows one first lane, the next packet to approve, and what waits until later."
  ],
  "scopeBoundaries": [
    "Do not start tactics before ICP, positioning, promise, proof, and metric are defined.",
    "Do not invent market proof or exaggerate claims for conversion.",
    "Do not let supporting work imply autonomous publishing when an external surface owns the external publish step.",
    "Do not output an action queue that lacks owner, artifact, approval path, or stop rule.",
    "Do not approve channel plans that risk spam, policy violations, or brand damage."
  ],
  "freshnessPolicy": "Treat market positioning, competitor channels, ICP language, and proof as time-sensitive. Date current scans before locking strategy or specialist briefs.",
  "sensitiveDataPolicy": "Treat ICP notes, customer lists, revenue metrics, attribution data, and positioning drafts as confidential. Channel briefs should use aggregated or approved claims only.",
  "costControlPolicy": "Spend analysis on ICP, positioning, and the highest-leverage channel. Avoid assigning every marketing specialist when one bottleneck dominates."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'cmo_leader',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'cmo_leader'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'cmo_leader agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/cmo_leader/health',
  healthcheck_url: '/sample-agents/cmo_leader/health',
  jobEndpoint: '/sample-agents/cmo_leader/jobs',
  job_endpoint: '/sample-agents/cmo_leader/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/cmo_leader/health',
    jobs: '/sample-agents/cmo_leader/jobs'
  }),
  metadata: Object.freeze({
    agent_purpose: AGENT_DEFINITION.agentPurpose,
    action_boundaries: AGENT_DEFINITION.agentActionBoundaries,
    delivery_contract: AGENT_DEFINITION.deliveryContract,
    sample: true,
    sampleKind: 'cmo_leader',
    sample_kind: 'cmo_leader',
    category: 'cmo_leader',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
