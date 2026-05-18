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
    const webSources = agentProviderWebSources(body);
    const markdown = agentProviderMarkdown(kind, definition, body, source);
    const publisherHandoffs = agentProviderPublisherHandoffArtifacts(kind, definition, body, markdown);
    return {
      accepted: true,
      status: 'completed',
      summary: japanese
        ? `${name} が依頼内容に基づく納品を返しました。`
        : `${name} returned the requested delivery.`,
      report: {
        summary: japanese ? `${name} delivery` : `${name} delivery`,
        bullets: [
          japanese ? '依頼内容、提供データ、担当範囲に基づいて納品物を作成しました。' : 'Prepared the delivery from the supplied request, data, and agent scope.',
          japanese ? '外部投稿、送信、公開、PR作成などは実行していません。' : 'No external posting, sending, publishing, or repository write was performed.',
          japanese ? '納品物を確認し、必要な次工程またはSaaS画面に引き継いでください。' : 'Review the delivery, then pass it to the next owner or SaaS surface if needed.'
        ],
        nextAction: agentProviderSafeNextAction(definition, kind, body),
        confidence: prompt === 'No prompt provided.' ? 'low' : 'medium',
        artifacts: publisherHandoffs,
        approval_requests: [{
          id: 'writer-publisher-approval',
          action_type: 'publisher_review',
          title: 'Review source-backed writing packet in Publisher',
          status: 'needs approval',
          target: 'Publisher & Approval Studio',
          blocker: 'External publishing is blocked until source evidence, E-E-A-T notes, claims, destination, and connector are approved.'
        }],
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

function agentProviderSourceType(value = '') {
  const text = String(value || '').toLowerCase();
  if (/\bx\.com\b|twitter\.com|tweet|ポスト|投稿/.test(text)) return 'x_post_or_account';
  if (/blog|ブログ|note\.com|medium|zenn|qiita/.test(text)) return 'owned_blog_or_article';
  if (/uploaded|file|手記|memo|manuscript|interview|note/.test(text)) return 'original_note_or_file';
  if (/case|testimonial|review|事例|声/.test(text)) return 'case_or_testimonial';
  return 'source_url';
}

function agentProviderOriginalInfoSources(body = {}) {
  const sources = [];
  const seen = new Set();
  const add = (item = {}, fallback = {}) => {
    const value = typeof item === 'string' ? { url: item } : (item && typeof item === 'object' ? item : {});
    const url = agentProviderText(value.url || value.link || value.href || value.source_url || value.sourceUrl || fallback.url);
    const title = agentProviderText(value.title || value.name || value.label || fallback.title, url || 'Original source');
    const snippet = agentProviderText(value.snippet || value.summary || value.description || fallback.snippet);
    const sourceType = agentProviderText(value.source_type || value.sourceType || fallback.sourceType || agentProviderSourceType([url, title, snippet].join(' ')));
    if (!url && !title && !snippet) return;
    const key = [url, title, snippet].join('|').toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    sources.push({
      source_type: sourceType,
      title,
      url,
      snippet,
      usage: agentProviderText(value.usage || fallback.usage, 'Use as first-party/source-backed writing material; do not copy long passages verbatim.')
    });
  };
  for (const source of agentProviderWebSources(body)) add(source);
  const files = [
    ...(Array.isArray(body.files) ? body.files : []),
    ...(Array.isArray(body.input?.files) ? body.input.files : [])
  ];
  for (const file of files) {
    if (!file || typeof file !== 'object') continue;
    add({
      title: file.name || file.fileName || 'Uploaded original note',
      snippet: String(file.content || file.body || '').slice(0, 320),
      source_type: 'uploaded_file'
    }, { usage: 'Use as original note or manuscript material.' });
  }
  const text = [agentProviderPrompt(body), JSON.stringify(body.source_context || body.sourceContext || {})].join('\n');
  for (const label of ['x account', 'xアカウント', 'blog', 'ブログ', 'note', 'original note', '手記']) {
    const value = agentProviderFirstMatch(text, [new RegExp(`${label}\\s*[:：]\\s*([^\\n]+)`, 'i')]);
    if (value) add({ title: value, snippet: `${label} supplied by requester`, source_type: agentProviderSourceType(value) });
  }
  return sources.slice(0, 12);
}

function agentProviderPublisherProfile(kind = '', body = {}) {
  const text = [kind, agentProviderPrompt(body), JSON.stringify(body.source_context || body.sourceContext || {})].join(' ').toLowerCase();
  if (/\bx\b|x\.com|twitter|tweet|ポスト|投稿|sns|social/.test(text)) {
    return {
      itemType: /thread|スレッド/.test(text) ? 'social_thread' : 'x_post',
      channelKey: 'x',
      destination: 'X',
      connector: 'x',
      capability: 'x.post',
      method: 'x_oauth_or_x_saas',
      actionType: 'x_post'
    };
  }
  if (/wordpress|\bwp\b/.test(text)) {
    return {
      itemType: /page|landing|lp/.test(text) ? 'wordpress_page' : 'wordpress_draft',
      channelKey: 'wordpress_site',
      destination: 'WordPress site',
      connector: 'wordpress',
      capability: 'wordpress.create_draft',
      method: 'wordpress_application_password',
      actionType: 'wordpress_draft'
    };
  }
  if (/blog|article|記事|seo|owned site|github|landing|lp|page/.test(text)) {
    return {
      itemType: /landing|lp/.test(text) ? 'landing_page' : 'seo_article',
      channelKey: 'owned_site',
      destination: 'Owned site / GitHub PR',
      connector: 'github',
      capability: 'github.write_pr',
      method: 'github_pr',
      actionType: 'article_publish'
    };
  }
  return {
    itemType: 'publish_asset',
    channelKey: 'social',
    destination: 'Social copy packet',
    connector: 'manual',
    capability: 'manual.copy',
    method: 'manual_social_copy',
    actionType: 'social_post'
  };
}

function agentProviderPublisherProfiles(kind = '', body = {}) {
  const text = [kind, agentProviderPrompt(body), JSON.stringify(body.source_context || body.sourceContext || {})].join(' ').toLowerCase();
  const profiles = [];
  const add = (profile = null) => {
    if (!profile?.channelKey) return;
    const key = `${profile.channelKey}:${profile.itemType}`;
    if (!profiles.some((item) => `${item.channelKey}:${item.itemType}` === key)) profiles.push(profile);
  };
  if (/\bx\b|x\.com|twitter|tweet|ポスト|投稿|sns|social/.test(text)) {
    add({
      itemType: /thread|スレッド/.test(text) ? 'social_thread' : 'x_post',
      channelKey: 'x',
      destination: 'X',
      connector: 'x',
      capability: 'x.post',
      method: 'x_oauth_or_x_saas',
      actionType: 'x_post'
    });
  }
  if (/wordpress|\bwp\b/.test(text)) {
    add({
      itemType: /page|landing|lp/.test(text) ? 'wordpress_page' : 'wordpress_draft',
      channelKey: 'wordpress_site',
      destination: 'WordPress site',
      connector: 'wordpress',
      capability: 'wordpress.create_draft',
      method: 'wordpress_application_password',
      actionType: 'wordpress_draft'
    });
  }
  if (/blog|article|記事|seo|owned site|github|landing|lp|page/.test(text)) {
    add({
      itemType: /landing|lp/.test(text) ? 'landing_page' : 'seo_article',
      channelKey: 'owned_site',
      destination: 'Owned site / GitHub PR',
      connector: 'github',
      capability: 'github.write_pr',
      method: 'github_pr',
      actionType: 'article_publish'
    });
  }
  if (!profiles.length) add(agentProviderPublisherProfile(kind, body));
  return profiles.slice(0, 4);
}

function agentProviderPublisherTitle(body = {}, profile = {}) {
  const host = agentProviderHost(agentProviderPrimaryUrl(body));
  if (profile.channelKey === 'x') return `${host} source-backed X post packet`;
  if (profile.channelKey === 'wordpress_site') return `${host} source-backed WordPress draft`;
  if (profile.itemType === 'landing_page') return `${host} source-backed landing page`;
  return `${host} source-backed article draft`;
}

function agentProviderPublisherVariants(profile = {}, body = {}) {
  const host = agentProviderHost(agentProviderPrimaryUrl(body));
  const url = agentProviderPrimaryUrl(body) || host;
  const audience = agentProviderAudience(body);
  const offer = agentProviderOffer(body);
  const conversion = agentProviderConversion(body);
  const cta = /lead|inquiry/i.test(conversion) ? 'Request details' : (/purchase|revenue/i.test(conversion) ? 'Start purchase' : (/signup|trial/i.test(conversion) ? 'Start signup' : 'Continue'));
  if (profile.channelKey === 'x') {
    return [
      {
        id: 'x-proof-led',
        label: 'Proof-led post',
        title: `${host} proof-led X post`,
        body: `Most ${offer} pages hide the work behind vague claims. ${host} should show the source, the handoff, and the approval boundary before asking ${audience} to ${conversion}.\n\n${url}`,
        cta
      },
      {
        id: 'x-story-led',
        label: 'Story-led post',
        title: `${host} story-led X post`,
        body: `A useful ${offer} draft starts with real material: owner notes, posts, blog context, and what actually happened. Then it becomes a publishable packet, not generic copy.\n\n${url}`,
        cta
      },
      {
        id: 'x-objection-led',
        label: 'Objection-led post',
        title: `${host} objection-led X post`,
        body: `If the copy cannot point to original evidence, it should say so. ${host} should make proof, missing claims, and the next approved action visible before publishing.\n\n${url}`,
        cta
      }
    ];
  }
  if (profile.channelKey === 'wordpress_site') {
    return [
      {
        id: 'wp-experience-draft',
        label: 'Experience-led draft',
        title: `${offer} from firsthand source material`,
        h1: `${offer} for ${audience}`,
        body: `Open with the firsthand note, explain the situation, then show what changed and why ${audience} should take ${conversion}.`,
        cta
      },
      {
        id: 'wp-howto-draft',
        label: 'How-to draft',
        title: `How ${audience} can evaluate ${offer}`,
        h1: `How to evaluate ${offer}`,
        body: `Turn original notes and examples into steps, decision criteria, proof blocks, and the next approved action.`,
        cta
      },
      {
        id: 'wp-comparison-draft',
        label: 'Comparison draft',
        title: `${offer}: fit, limits, and next step`,
        h1: `${offer}: what fits and what does not`,
        body: `Use the source ledger to compare fit, limits, alternatives, and the trust signals needed before ${conversion}.`,
        cta
      }
    ];
  }
  return [
    {
      id: 'owned-experience-article',
      label: 'Experience-led article',
      title: `${host}: ${offer} from original source material`,
      h1: `${offer} for ${audience}`,
      body: `Lead with the original story or operator note, then connect it to the practical outcome: ${conversion}.`,
      cta
    },
    {
      id: 'owned-expertise-guide',
      label: 'Expertise-led guide',
      title: `How to evaluate ${offer}`,
      h1: `How ${audience} should evaluate ${offer}`,
      body: `Structure the article around criteria, process, examples, source evidence, and the approval-safe next step.`,
      cta
    },
    {
      id: 'owned-trust-page',
      label: 'Trust-led page',
      title: `${offer}: evidence, limits, and next action`,
      h1: `${offer}: evidence and limits`,
      body: `Make source evidence, missing proof, assumptions, and approval boundaries visible before asking for ${conversion}.`,
      cta
    }
  ];
}

function agentProviderVariantLines(variants = []) {
  if (!variants.length) return 'No variants prepared.';
  return variants.map((variant, index) => [
    `### Variant ${index + 1}: ${variant.label || variant.id || 'Draft option'}`,
    variant.title ? `Title: ${variant.title}` : '',
    variant.h1 ? `H1: ${variant.h1}` : '',
    variant.body ? `Body: ${variant.body}` : '',
    variant.cta ? `CTA: ${variant.cta}` : ''
  ].filter(Boolean).join('\n')).join('\n\n');
}

function agentProviderPublisherBody(markdown = '', sources = [], profile = {}, body = {}, variants = []) {
  const sourceLines = sources.length
    ? sources.map((source, index) => `${index + 1}. ${source.title}${source.url ? ` - ${source.url}` : ''} (${source.source_type})`).join('\n')
    : 'No original URL, X account/post, blog, or uploaded note was supplied. Request first-party material before final publishing.';
  return [
    markdown,
    '',
    '## Publisher handoff',
    `Destination: ${profile.destination}`,
    `Medium / channel: ${profile.channelKey}`,
    `Publish connector: ${profile.connector}`,
    `Connector capability: ${profile.capability}`,
    `Publish method: ${profile.method}`,
    `Primary CTA: ${agentProviderConversion(body)}`,
    '',
    '## Draft variants',
    agentProviderVariantLines(variants),
    '',
    '## E-E-A-T source ledger',
    sourceLines,
    '',
    '## E-E-A-T usage notes',
    '- Experience: preserve concrete firsthand details, chronology, failures, screenshots, usage notes, and operator comments from supplied sources.',
    '- Expertise: turn source details into process, criteria, comparison axes, and practical judgment.',
    '- Authoritativeness: keep author/account/blog/source identity visible when the user owns or approves it.',
    '- Trust: label missing proof, unverified claims, and approval requirements before Publisher handoff or external posting.',
    '',
    '## Publisher approval rule',
    'Do not publish, post, create a PR, or create a WordPress draft until the Publisher app item is reviewed and approved.'
  ].join('\n');
}

function agentProviderPublisherHandoffArtifact(kind = '', definition = {}, body = {}, markdown = '', profile = null, index = 0) {
  const safeProfile = profile || agentProviderPublisherProfile(kind, body);
  const sources = agentProviderOriginalInfoSources(body);
  const variants = agentProviderPublisherVariants(safeProfile, body);
  const title = agentProviderPublisherTitle(body, safeProfile);
  const url = agentProviderPrimaryUrl(body);
  const h1 = safeProfile.channelKey === 'x' ? '' : `${agentProviderOffer(body)} for ${agentProviderAudience(body)}`;
  return {
    id: index === 0 ? 'writer-publisher-handoff' : `writer-publisher-handoff-${safeProfile.channelKey}-${safeProfile.itemType}`,
    type: safeProfile.itemType,
    item_type: safeProfile.itemType,
    content_type: 'publisher_handoff',
    channel_key: safeProfile.channelKey,
    destination: safeProfile.destination,
    connector: safeProfile.connector,
    connector_capability: safeProfile.capability,
    publish_method: safeProfile.method,
    action_type: safeProfile.actionType,
    owner: 'Publisher & Approval Studio',
    title,
    h1,
    slug: url || '',
    meta: sources.length
      ? `Source-backed draft using ${sources.length} original source item(s); review claims before publishing.`
      : 'Draft needs original source material before final publishing.',
    keywords: agentProviderPrimaryChannel(body),
    primary_cta: agentProviderConversion(body),
    body: agentProviderPublisherBody(markdown, sources, safeProfile, body, variants),
    status: 'needs approval',
    risk: sources.length
      ? 'Review source permissions, claims, attribution, and channel rules before external publishing.'
      : 'Original source material is missing; request a URL, X post/account, blog, or uploaded note before publishing.',
    source_evidence: sources,
    publish_variants: variants,
    eeat_notes: {
      experience: 'Use firsthand details from supplied sources only.',
      expertise: 'Convert source material into practical judgment and publishable structure.',
      authoritativeness: 'Preserve approved author, account, or owned-site identity.',
      trust: 'Keep source URLs, missing-proof labels, and approval gates visible.'
    },
    metadata: {
      generated_by: definition.healthService || 'writing_agent',
      original_source_count: sources.length,
      requires_publisher_approval: true,
      requires_original_source_review: true
    }
  };
}

function agentProviderPublisherHandoffArtifacts(kind = '', definition = {}, body = {}, markdown = '') {
  return agentProviderPublisherProfiles(kind, body)
    .map((profile, index) => agentProviderPublisherHandoffArtifact(kind, definition, body, markdown, profile, index));
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

const AGENT_DEFINITION = {
  provider: AGENT_PROVIDER,
  "fileName": "writer-delivery.md",
  "healthService": "writing_agent",
  "modelRole": "conversion copy strategy, message hierarchy, and publish-ready copy drafting",
  "executionLayer": "preparation",
  "taskRouting": {
    "aliases": ['writing', 'translation'],
    "inferenceRules": [
      { taskType: 'writing', patterns: [/(write|copy|lp|記事|文章|ライティング|copywriting|landing page)/i] },
      { taskType: 'translation', patterns: [/(translation|localization|i18n|翻訳|多言語)/i] }
    ],
    "expansionTasksByTask": {
      writing: ['research', 'summary'],
      translation: ['summary']
    },
    "softMatchTokensByTask": {
      writing: ['writing', 'copywriting', 'messaging', 'summary', 'seo'],
      translation: ['translation', 'localization', 'i18n', 'writing']
    },
    "tagHintsByTask": {
      writing: ['writing', 'copy', 'content'],
      translation: ['translation', 'localization', 'writing']
    }
  },
  "seedProfile": {
    "id": "agent_writer_01",
    "name": "WRITING AGENT",
    "description": "Built-in upstream writing and planning agent that turns research, audience, offer, proof, objections, and channel constraints into reusable copy packets for downstream execution adapters.",
    "taskTypes": [
      "writing",
      "copywriting",
      "messaging",
      "summary",
      "seo"
    ],
    "successRate": 0.94,
    "avgLatencySec": 14,
    "capabilities": [
      "copy_mode_classification",
      "message_hierarchy",
      "copy_angle_options",
      "recommended_copy_packet",
      "cta_placement_notes",
      "revision_test"
    ],
    "metadata": {
      "layer": "content_generation",
      "approval_mode": "draft_before_human_approval",
      "downstream_task_types": [
        "x_post",
        "instagram",
        "email_ops",
        "cold_email",
        "reddit",
        "indie_hackers",
        "directory_submission"
      ],
      "output_contract": [
        "draft",
        "tone",
        "key_points",
        "call_to_action",
        "approval_needed"
      ],
      "execution_default": "publishable_copy_packet",
      "connector_behavior": "Use supplied audience, offer, proof, objection, and current copy first. Verify only time-sensitive claims or channel norms when they materially change the draft, and use placeholders instead of inventing proof."
    }
  },
  "systemPrompt": "You are the built-in writing agent for AIagent2. First classify the copy task as landing/page copy, product description, email/newsletter copy, social/distribution copy, onboarding or UX copy, SEO-aware page copy, rewrite, or another concrete copy mode, then preserve that mode in the output. Return publishable copy packets, not copywriting advice about what someone else should write. Start from audience, awareness stage, problem or trigger, offer, believable proof, objection, CTA, channel constraint, and claims that are approved versus missing. Build the copy around message hierarchy: promise, proof, objection handling, and CTA. Recommend one primary conversion angle plus two materially different alternatives; do not generate near-duplicate variants. When rewriting existing copy, preserve the strongest real facts and replace vague or hype-heavy lines instead of starting from generic templates. If SEO is implied, keep the work page-copy scoped: reflect search intent, H1 direction, meta-title/meta-description direction, and CTA fit without drifting into a full SERP strategy audit. Use placeholders for proof, metrics, testimonials, legal/compliance language, or pricing claims that were not actually supplied. End with the recommended final version, placement notes, and the first revision test. If the task is underspecified, state assumptions briefly and continue.",
  "deliverableHint": "Write sections for copy mode and objective, audience and awareness stage, offer/proof/objection map, message hierarchy, copy options, recommended version, CTA and placement notes, and revision test. Make the output publishable as-is for the named channel.",
  "reviewHint": "Sharpen the promise, proof, objection handling, and CTA. Remove generic filler, invented proof, and near-duplicate variants. Ensure the recommended version is ready to publish or paste into the named surface.",
  "executionFocus": "Create publishable copy, not advice about copy. Classify the copy mode first, then build one believable promise, proof, objection-handling line, CTA, and revision test for the exact channel.",
  "outputSections": [
    "Copy mode and objective",
    "Audience and awareness stage",
    "Offer, proof, and objections",
    "Message hierarchy",
    "Copy options",
    "Recommended version",
    "CTA and placement notes",
    "Revision test"
  ],
  "inputNeeds": [
    "Audience and awareness stage",
    "Offer or product",
    "Approved proof or claims",
    "Distribution channel or surface",
    "Primary CTA",
    "Current copy or section to rewrite"
  ],
  "acceptanceChecks": [
    "Copy mode and publish surface are explicit",
    "Promise, proof, objection, and CTA line up",
    "Options are strategically different",
    "Missing proof is labeled instead of invented",
    "Revision test explains what to try next"
  ],
  "firstMove": "Lock copy mode, audience, awareness stage, offer, proof, objection, and CTA before drafting. Produce options that differ by strategic angle rather than surface wording.",
  "failureModes": [
    "Do not produce generic copy detached from audience, awareness stage, and channel",
    "Do not offer near-duplicate variants that only swap adjectives",
    "Do not invent proof, metrics, testimonials, or compliance claims",
    "Do not omit the CTA, placement note, or revision test"
  ],
  "evidencePolicy": "Ground copy in the supplied audience, awareness stage, offer, proof, objection, current copy, and channel. If examples are used, state whether they are supplied examples, comparable patterns, or assumptions.",
  "nextAction": "End with the recommended final copy, where each line should be placed, and the first revision test or metric to watch.",
  "confidenceRubric": "High when copy mode, audience, channel, offer, proof, objection, and CTA are supplied; medium when tone, awareness stage, or proof must be inferred; low when the audience, surface, or conversion action is unclear.",
  "handoffArtifacts": [
    "Recommended copy packet",
    "Alternative angles",
    "Message hierarchy",
    "CTA and placement notes",
    "Revision test"
  ],
  "prioritizationRubric": "Prioritize copy by audience fit, message clarity, proof strength, objection severity, channel fit, and speed to publish.",
  "measurementSignals": [
    "CTR or open rate",
    "Reply or conversion rate",
    "CTA click-through or completion rate",
    "Revision delta",
    "Objection-response lift"
  ],
  "assumptionPolicy": "Assume the user wants publishable copy for the named surface. If awareness stage, proof, or objection is missing, use a conservative default and label it. Do not invent claims to make the copy stronger.",
  "escalationTriggers": [
    "The copy depends on proof, pricing, or legal/compliance claims the user did not provide",
    "Audience, channel, or conversion action is unclear",
    "The request involves regulated, medical, legal, or high-risk marketing claims"
  ],
  "minimumQuestions": [
    "Who is the audience, and what awareness stage or moment are they in?",
    "Where will this copy be published, and what action should it drive?",
    "What offer, proof, objection, and CTA must be included?",
    "What current copy, examples, or voice should it match or replace?"
  ],
  "reviewChecks": [
    "Copy mode is explicit",
    "Promise, proof, objection, and CTA are all visible",
    "Variants differ strategically",
    "No invented proof appears"
  ],
  "depthPolicy": "Default to one recommended version plus two alternatives. Go deeper when audience segmentation, proof architecture, placement notes, or rewrite context materially changes the copy.",
  "concisionRule": "Avoid copywriting theory or generic messaging frameworks; deliver the actual copy, a short why, placement notes, and the first test.",
  "toolStrategy": {
    "web_search": "when_current",
    "source_mode": "provided_copy_context_current_claims_and_comparable_channel_examples",
    "note": "Use supplied audience, offer, proof, objection, and current copy first; browse only when current claims, competitor examples, or channel norms materially change the copy."
  },
  "specialistMethod": [
    "Classify the copy mode first: landing/page, email, social/distribution, product description, onboarding/UX, SEO-aware page copy, rewrite, or another named surface.",
    "Map audience, awareness stage, trigger, offer, proof, objection, voice, CTA, and current copy before drafting.",
    "Build a message hierarchy first: promise, proof, objection handling, and CTA.",
    "Deliver one recommended publishable version plus strategically different alternatives, then name the first revision test and placement notes."
  ],
  "scopeBoundaries": [
    "Do not fabricate proof, customer claims, metrics, testimonials, or legal claims.",
    "Do not optimize for cleverness over clarity, proof, objection handling, and CTA.",
    "Do not drift into a full SEO audit, campaign strategy, or channel-execution plan when the task is copy drafting.",
    "Do not produce manipulative, deceptive, or non-compliant copy."
  ],
  "freshnessPolicy": "Use supplied brand facts as current unless dated otherwise. Verify time-sensitive proof, statistics, offers, and competitor examples before using them in copy.",
  "sensitiveDataPolicy": "Do not publish or amplify private customer data, unapproved testimonials, confidential metrics, or unreleased offers. Replace sensitive proof with placeholders when needed.",
  "costControlPolicy": "Favor fast drafting and revision-ready options. Use web or competitor research only when proof, channel norms, or current claims materially affect conversion."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'writer',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'writer'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'writer agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/writer/health',
  healthcheck_url: '/sample-agents/writer/health',
  jobEndpoint: '/sample-agents/writer/jobs',
  job_endpoint: '/sample-agents/writer/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/writer/health',
    jobs: '/sample-agents/writer/jobs'
  }),
  metadata: Object.freeze({
    sample: true,
    sampleKind: 'writer',
    sample_kind: 'writer',
    category: 'writer',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
