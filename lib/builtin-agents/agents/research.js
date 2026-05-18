const AGENT_PROVIDER = Object.freeze({
  health({ kind = '', definition = {}, source = {} } = {}) {
    const seed = agentProviderObject(definition.seedProfile);
    return {
      ok: true,
      service: agentProviderText(definition.healthService, kind || 'agent'),
      kind,
      mode: 'provider_contract',
      provider: 'agent_file',
      generation_provider: agentProviderText(source.OPENAI_API_KEY || source.BUILTIN_OPENAI_API_KEY) ? 'agent_configured' : 'agent_definition_packet',
      file_name: definition.fileName || null,
      model_role: definition.modelRole || null,
      execution_layer: definition.executionLayer || seed.metadata?.layer || null,
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
    const japanese = agentProviderJapanese([prompt, body.output_language, body.outputLanguage].join('\n'));
    const seed = agentProviderObject(definition.seedProfile);
    const name = agentProviderText(seed.name || definition.healthService || kind, kind || 'agent');
    const webSources = agentProviderResearchSources(body);
    const searchRequired = agentProviderResearchSearchRequired(body);
    if (searchRequired && !webSources.length) {
      const failure = japanese
        ? `${name} は検索必須の研究ジョブを完了できません。web_sources または提供ソースが必要です。`
        : `${name} cannot complete a search-required research job without web_sources or supplied source context.`;
      return {
        accepted: false,
        status: 'failed',
        summary: failure,
        error: 'missing_required_search_sources',
        failure_reason: `missing_required_search_sources: ${failure}`,
        report: {
          summary: failure,
          bullets: [
            japanese ? '検索必須のジョブですが、検索結果または提供ソースがありません。' : 'The job is search-required, but the request did not include search results or supplied source context.',
            japanese ? 'ソースなしのメタ納品を completed として返さないため、この agent が失敗を明示しています。' : 'The agent is explicitly failing instead of returning a meta delivery as completed.',
            japanese ? '検索/ソース収集付きで再実行してください。' : 'Retry this with search/source collection attached.'
          ],
          nextAction: japanese ? '検索結果または提供ソースを添付して再実行してください。' : 'Attach search results or source context, then retry.',
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
          failure_category: 'missing_required_search_sources'
        }
      };
    }
    const markdown = webSources.length
      ? agentProviderResearchMarkdown(kind, definition, body, webSources)
      : agentProviderMarkdown(kind, definition, body, source);
    return {
      accepted: true,
      status: 'completed',
      summary: japanese
        ? `${name} が依頼内容に基づく納品を返しました。`
        : `${name} returned the requested delivery.`,
      report: {
        summary: webSources.length
          ? (japanese ? `${name} source-backed research delivery` : `${name} source-backed research delivery`)
          : (japanese ? `${name} delivery` : `${name} delivery`),
        bullets: webSources.length
          ? [
              japanese ? `利用ソース: ${webSources.length}件。` : `Sources used: ${webSources.length}.`,
              japanese ? '提供ソースを根拠として扱い、web_sources に保持しました。' : 'Supplied source context was preserved as web_sources.',
              japanese ? '外部投稿、送信、公開、PR作成などは実行していません。' : 'No external posting, sending, publishing, or repository write was performed.'
            ]
          : [
              japanese ? '依頼内容、提供データ、担当範囲に基づいて納品物を作成しました。' : 'Prepared the delivery from the supplied request, data, and agent scope.',
          japanese ? '外部投稿、送信、公開、PR作成などは実行していません。' : 'No external posting, sending, publishing, or repository write was performed.',
          japanese ? '納品物を確認し、必要な次工程またはSaaS画面に引き継いでください。' : 'Review the delivery, then pass it to the next owner or SaaS surface if needed.'
            ],
        nextAction: agentProviderSafeNextAction(definition, kind, body),
        confidence: prompt === 'No prompt provided.' ? 'low' : 'medium',
        ...(webSources.length ? { web_sources: webSources } : {})
      },
      files: [{
        name: agentProviderText(definition.fileName, `${kind || 'agent'}-delivery.md`),
        type: 'text/markdown',
        content: markdown,
        source_task_type: kind,
        content_type: 'agent_delivery'
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
        file_name: definition.fileName || null
      }
    };
  }
});

function agentProviderText(value = '', fallback = '') {
  const safe = String(value ?? '').trim();
  return safe || fallback;
}

function agentProviderList(value = []) {
  return Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : [];
}

function agentProviderObject(value = {}) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function agentProviderJapanese(value = '') {
  const text = String(value || '').toLowerCase();
  if (/\b(en|english)\b/.test(text)) return false;
  if (/\b(ja|jp|japanese)\b/.test(text)) return true;
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(text);
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
  return cleaned.slice(0, 1200) || 'Supplied request and available context.';
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
          action: contextProvider === 'analytics_console' ? 'google_search_console' : 'source_collection',
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

function agentProviderDraftArtifact(kind = '', body = {}, definition = {}) {
  const url = agentProviderPrimaryUrl(body);
  const host = agentProviderHost(url);
  const audience = agentProviderAudience(body);
  const conversion = agentProviderConversion(body);
  const channel = agentProviderPrimaryChannel(body);
  const lower = String(kind || '').toLowerCase();
  const cta = /lead|inquiry/i.test(conversion) ? 'Request details' : (/purchase|revenue/i.test(conversion) ? 'Start purchase' : (/signup|trial/i.test(conversion) ? 'Start signup' : 'Continue'));
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

function agentProviderLooksLikeTemplate(content = '') {
  const text = String(content || '').toLowerCase();
  return /##\s*delivery packet/i.test(content)
    || /\bwrite sections for\b/i.test(text)
    || /\bwrite a two-part markdown delivery\b/i.test(text)
    || /agent-owned behavior|workflow handoff context|structured handoff digest|provider\.runjob/i.test(text);
}

function agentProviderMarkdown(kind = '', definition = {}, body = {}, source = {}) {
  const seed = agentProviderObject(definition.seedProfile);
  const brief = agentProviderBriefText(body);
  const japanese = agentProviderJapanese([brief, body.output_language, body.outputLanguage].join('\n'));
  const title = agentProviderText(definition.fileName, `${kind || 'agent'}-delivery.md`).replace(/\.md$/i, '').replace(/-/g, ' ');
  const name = agentProviderText(seed.name || definition.healthService || kind, kind || 'agent');
  const evidence = agentProviderEvidenceLines(body);
  const artifact = agentProviderDraftArtifact(kind, body, definition);
  const nextAction = agentProviderSafeNextAction(definition, kind, body);
  const lines = japanese
    ? [
        `# ${title}`,
        '',
        '## 先に結論',
        `${name} は、今回の入力に基づく具体成果物を返します。対象は ${agentProviderHost(agentProviderPrimaryUrl(body))}、主要アクションは ${agentProviderConversion(body)} です。`,
        '',
        '## 対象・入力',
        brief,
        '',
        '## 根拠・確認済み情報',
        ...(evidence.length ? evidence.map((item) => `- ${item}`) : ['- 明示的な外部ソースまたは接続データは不足しています。仮説として扱います。']),
        '',
        artifact,
        '',
        '## ブロッカー・不足情報',
        '- 未接続のデータ、未確認の外部事実、公開/送信/投稿の承認は完了扱いにしません。',
        '',
        '## 次のアクション',
        nextAction
      ]
    : [
        `# ${title}`,
        '',
        '## Answer first',
        `${name} prepared a concrete work product for this request. Target: ${agentProviderHost(agentProviderPrimaryUrl(body))}. Primary action: ${agentProviderConversion(body)}.`,
        '',
        '## Target and inputs',
        brief,
        '',
        '## Evidence used',
        ...(evidence.length ? evidence.map((item) => `- ${item}`) : ['- No connected data or external source was supplied; recommendations below are labeled as assumptions.']),
        '',
        artifact,
        '',
        '## Blockers and gaps',
        '- Do not treat unconnected data, unverified external facts, or unpublished external actions as completed.',
        '',
        '## Next action',
        nextAction
      ];
  const markdown = lines.filter((line) => line !== '').join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (agentProviderLooksLikeTemplate(markdown)) {
    return `# ${title}\n\n## Answer first\nThe agent could not produce a safe user-facing delivery without leaking its output contract. Retry this agent with stronger input or a live provider.\n\n## Target and inputs\n${brief}\n\n## Next action\n${nextAction}`;
  }
  return markdown;
}

function agentProviderResearchMarkdown(kind = '', definition = {}, body = {}, webSources = []) {
  const prompt = agentProviderPublicBrief(body);
  const japanese = agentProviderJapanese([prompt, body.output_language, body.outputLanguage].join('\n'));
  const title = agentProviderText(definition.fileName, `${kind || 'agent'}-delivery.md`).replace(/\.md$/i, '').replace(/-/g, ' ');
  const sourceLines = webSources.map((source) => `- ${[source.title, source.url, source.snippet].filter(Boolean).join(' | ')}`);
  const nextAction = agentProviderSafeNextAction(definition, kind, body);
  const lines = japanese
    ? [
        `# ${title}`,
        '',
        '## 先に結論',
        'このリサーチは、提供されたソースを根拠として作成しました。追加のライブ検索を実行した場合を除き、未確認の外部事実は断定しません。',
        '',
        '## 対象・入力',
        prompt,
        '',
        '## Evidence status',
        ...sourceLines,
        '',
        '## 3C / research direction',
        '- Company: 添付データ、対象URL、既存文脈を分けて扱う。',
        '- Customer: 検索・比較・導入判断の不安を仮説として整理する。',
        '- Competitor: 追加の公開検索がない場合、競合断定は避け、検証待ちとして渡す。',
        '',
        '## Next action',
        nextAction
      ]
    : [
        `# ${title}`,
        '',
        '## Answer first',
        'This research packet uses the supplied source context. It does not claim unverified live browsing or external facts.',
        '',
        '## Target and inputs',
        prompt,
        '',
        '## Evidence status',
        ...sourceLines,
        '',
        '## 3C / research direction',
        '- Company: separate attached data, target URL, and existing context before making recommendations.',
        '- Customer: frame search, comparison, and adoption objections as hypotheses unless directly supported.',
        '- Competitor: avoid competitor claims without public source evidence; pass missing evidence forward.',
        '',
        '## Next action',
        nextAction
      ];
  return lines.filter((line) => line !== '').join('\n').replace(/\n{3,}/g, '\n\n');
}

const AGENT_DEFINITION = {
  provider: AGENT_PROVIDER,
  "fileName": "research-delivery.md",
  "healthService": "research_agent",
  "modelRole": "research and market analysis",
  "executionLayer": "research",
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
        "findings",
        "sources",
        "confidence",
        "recommended_action",
        "three_c_analysis",
        "prioritized_recommendations",
        "preparation_inputs"
      ],
      "connector_behavior": "Use supplied context first and verify current public facts when freshness changes the answer. Return a diagnosis-and-recommendation memo that connects evidence to concrete changes for the target service, not a generic background summary."
    }
  },
  "systemPrompt": "You are the built-in research agent for AIagent2. Return decision-ready research output, not a generic background note. If the user asks a direct factual question, answer the most likely interpretation immediately in the first sentence. For business, marketing, growth, SEO, or product research, your job is not only to summarize sources; it is to convert source evidence into a service-specific diagnosis and improvement proposal. Start with the answer, then separate owned/user data, public/search evidence, competitor evidence, assumptions, and confidence. When doing 3C analysis, each of Company, Customer, and Competitor must include evidence, interpretation, problem for this service, improvement direction, concrete actions, and KPI. After 3C, return 3-5 prioritized recommendations with impact, effort, confidence, why now, first action, and stop rule. If conversions are zero or the conversion path is unclear, include conversion-path repair before acquisition expansion. Do not output duplicated sections, raw search-result dumps, unexplained counts, or contradictions. Do not leak the original task prompt into the analysis. When freshness matters, label what was verified versus what remains an assumption, and state the observation date or source window. Do not claim to have browsed the web unless web search is available and used, or the prompt explicitly includes source material. If the task is underspecified, state assumptions briefly and continue.",
  "deliverableHint": "Write sections for answer first, evidence summary, 3C diagnosis, service-specific improvement directions, prioritized recommendations, risks/unknowns, and next check. Make the result usable as a diagnosis and execution brief, not a generic source summary.",
  "reviewHint": "Tighten the answer, evidence status, 3C diagnosis, service-specific improvement directions, prioritized recommendations, and concrete next inputs. Remove duplicated sections, unexplained counts, contradictions, and raw source-list dominance.",
  "executionFocus": "Start with the answer and the strongest service-specific recommendation. Then show evidence status, 3C diagnosis, improvement directions, prioritized actions, and the concrete next inputs.",
  "outputSections": [
    "Answer first",
    "Evidence summary",
    "3C diagnosis",
    "Service-specific improvement directions",
    "Prioritized recommendations",
    "Risks and unknowns",
    "Next action"
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
    "Prioritized recommendations include impact, effort, confidence, first action, KPI, and stop rule"
  ],
  "firstMove": "Identify the exact decision or question first. If this is business or marketing research, state the most important improvement recommendation first, then gather or use sources to support the 3C diagnosis.",
  "failureModes": [
    "Do not bury the direct answer after background",
    "Do not invent citations or pretend to browse",
    "Do not ignore date, region, or source freshness when they affect the answer",
    "Do not stop at search synthesis when the task needs business improvement recommendations",
    "Do not recommend acquisition expansion before conversion-path repair when conversions are zero"
  ],
  "evidencePolicy": "Use current, verifiable sources when facts are time-sensitive. State source dates or evidence status and distinguish direct evidence from inference.",
  "nextAction": "End with the top recommendation, the concrete preparation artifact that should be produced next, and the single source or check that would most improve confidence.",
  "confidenceRubric": "High when scope, date range, source quality, and comparison criteria are verified; medium when current sources are partial; low when freshness, region, or source access materially changes the answer.",
  "handoffArtifacts": [
    "Answer-first summary",
    "Source/evidence map",
    "Assumptions and uncertainty",
    "Decision recommendation",
    "3C diagnosis table",
    "Prioritized improvement plan",
    "Preparation inputs"
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
    "web_search": "default",
    "source_mode": "current_web_or_user_sources",
    "note": "Use current web sources for prices, rankings, dates, laws, market claims, and any fact likely to change."
  },
  "specialistMethod": [
    "Convert the user question into the exact decision, scope, date range, and comparison criteria.",
    "Check current or supplied sources before analysis when facts can change.",
    "Answer first, then separate evidence, assumptions, uncertainty, 3C diagnosis, and prioritized recommendations.",
    "For each 3C item, connect evidence to interpretation, service problem, improvement direction, specific actions, and KPI.",
    "Limit the final recommendations to the few actions that should change the target service or preparation queue now."
  ],
  "scopeBoundaries": [
    "Do not present stale or unsourced current facts as certain.",
    "Do not turn research support into medical, legal, financial, or safety-critical advice.",
    "Do not bury the direct answer behind background when the user asked a specific factual question."
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
