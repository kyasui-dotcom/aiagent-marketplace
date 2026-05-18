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
    const japanese = agentProviderJapanese(agentProviderLanguageText(body, prompt));
    const seed = agentProviderObject(definition.seedProfile);
    const name = agentProviderText(seed.name || definition.healthService || kind, kind || 'agent');
    const webSources = agentProviderWebSources(body);
    const markdown = agentProviderMarkdown(kind, definition, body, source);
    if (!markdown) return agentProviderDeliveryFailure(kind, definition, name, japanese, 'missing_required_deliverable: original request, source context, or concrete artifact was not available.');
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
        nextAction: agentProviderSafeNextAction(definition, kind, body, { japanese }),
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
  const message = japanese
    ? `${name} は品質要件を満たす納品を作れないため停止しました。元依頼、ソース、または非テンプレート成果物が不足しています。`
    : `${name} stopped because it could not produce a quality delivery. Original request, source context, or a concrete artifact is missing.`;
  return {
    accepted: false,
    status: 'failed',
    summary: message,
    error: 'missing_required_deliverable',
    failure_reason: reason,
    report: {
      summary: message,
      bullets: japanese
        ? [
            'フォールバックの汎用納品やテンプレート納品は completed として返しません。',
            '元依頼、証拠、担当範囲から具体成果物を作れない場合は停止します。',
            'ソース、ファイル、または十分な注文内容を添えて再実行してください。'
          ]
        : [
            'Shared template deliveries are not returned as completed.',
            'The agent stops when the original request, evidence, and scope are not enough to produce a concrete artifact.',
            'Retry with source context, files, or a sufficiently specific order.'
          ],
      nextAction: japanese ? 'ソース、ファイル、または具体的な元依頼を添えて再実行してください。' : 'Retry with source context, files, or a concrete original request.',
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
      failure_category: 'missing_required_deliverable'
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

function agentProviderMarkdown(kind = '', definition = {}, body = {}, source = {}) {
  const seed = agentProviderObject(definition.seedProfile);
  const brief = agentProviderBriefText(body);
  const japanese = agentProviderJapanese(agentProviderLanguageText(body, brief));
  const title = agentProviderText(definition.fileName, `${kind || 'agent'}-delivery.md`).replace(/\.md$/i, '').replace(/-/g, ' ');
  const name = agentProviderText(seed.name || definition.healthService || kind, kind || 'agent');
  const evidence = agentProviderEvidenceLines(body);
  const artifact = agentProviderDraftArtifact(kind, body, definition, { japanese });
  const nextAction = agentProviderSafeNextAction(definition, kind, body, { japanese });
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
  if (!brief || agentProviderLooksLikeTemplate(markdown)) {
    return '';
  }
  return markdown;
}

const AGENT_DEFINITION = {
  provider: AGENT_PROVIDER,
  "fileName": "seo-agent-delivery.md",
  "healthService": "seo_content_gap_agent",
  "modelRole": "SEO analysis, page recommendation, rewrite specification, and PR-ready handoff",
  "executionLayer": "preparation",
  "taskRouting": {
    "aliases": ['seo'],
    "inferenceRules": [
      { taskType: 'seo', patterns: [/(seo|meta|description|title|検索|流入)/i] }
    ],
    "expansionTasksByTask": {
      seo_gap: ['seo', 'research'],
      seo: ['research', 'writing']
    },
    "softMatchTokensByTask": {
      seo_gap: ['seo_gap', 'seo', 'content_gap', 'seo_article', 'seo_rewrite', 'seo_monitor'],
      seo: ['seo', 'search', 'metadata', 'content_gap', 'seo_article']
    },
    "tagHints": ['marketing', 'seo', 'research']
  },
  "seedProfile": {
    "id": "agent_seogap_01",
    "name": "SEO AGENT",
    "description": "Built-in SEO analysis agent that reads the live SERP first, then turns the findings into a target page plan, concrete existing-page improvements, and PR-ready page-change handoff when implementation context exists.",
    "taskTypes": [
      "seo_gap",
      "seo",
      "seo_article",
      "seo_rewrite",
      "seo_monitor",
      "content_gap",
      "research"
    ],
    "successRate": 0.92,
    "avgLatencySec": 17,
    "optionalConnectors": [
      "google_search_console",
      "ga4",
      "csv_export"
    ],
    "capabilities": [
      "serp_gap_analysis",
      "page_map",
      "rewrite_spec",
      "cta_and_trust_spec",
      "internal_link_plan",
      "proposal_pr_handoff"
    ],
    "metadata": {
      "seo_modes": [
        "article_creation",
        "existing_page_rewrite",
        "site_keyword_monitoring"
      ],
      "connector_behavior": "Prefer live SERP plus current site pages. If Search Console or GA4 is available, tie recommendations to signup or registration conversion. When URL, CMS, or repo context exists, return a PR-ready page-change handoff instead of stopping at generic advice.",
      "distribution_channels": [
        "x",
        "qiita_or_zenn",
        "note",
        "community_post"
      ]
    }
  },
  "systemPrompt": "You are the built-in SEO agent for AIagent2, based on a practical SEO-agent workflow. Support three modes: article creation, rewrite/gap analysis for an existing URL, and monitoring/reporting for a site plus target keywords. Infer the mode from inputs: targetUrl plus keyword means rewrite; siteUrl plus targetKeywords or ranking/monitoring language means monitor; otherwise create an SEO article/content gap plan. Before writing, inspect current SERP/top results when available, fetch or summarize the top competitors, and identify search intent, H1/H2/H3 structure, word-count range, strengths, missing topics, and differentiation points. Treat analysis as the first step, not the final output. After the SERP read, decide the one page that should win, what that page must say, and what concrete changes should be shipped first. When a site URL or conversion goal is provided, map one keyword cluster to one target page, show which page should serve which intent, explain why that page should win, and recommend the next supporting page. Always make language and market explicit. If the request implies English-speaking SEO, write for English-language SERPs, English page patterns, and English distribution channels instead of defaulting to Japanese assumptions. If the goal is signup, registration, lead capture, or another conversion, do not stop at content ideas. Return page-specific H1/hero copy, CTA copy and placement, what happens after signup, trust/FAQ modules, and internal-link recommendations. When the brief is strategic, convert it into a concrete page-production plan: which page to build first, which supporting page to build second, how they link together, and what exact CTA surface should be measured. When repo files, CMS blocks, page sections, or implementation context are provided, return a proposal-PR handoff: changed sections, replacement copy, structural edits, acceptance checks, and validation notes. For growth asks, compare why competing pages are trusted, what proof they show, and what the user's product should say differently to make the target conversion feel worth the effort. Follow Google-aligned SEO practice: E-E-A-T, user-first readability, natural keyword usage, no keyword stuffing, clear H1/H2/H3 hierarchy, and a proposed meta title and meta description. For article mode, produce a report plus a Markdown article draft; for rewrite mode, compare the target page with competitors and produce a rewrite plan plus replacement sections; for monitor mode, summarize rankings, competitor movement, priority fixes, and next checks. When the user also needs free distribution, include channel-ready post templates for X, Qiita/Zenn, note, and one community/discussion format that matches the same keyword or page angle. Control cost by using one focused search, up to three competitor fetches for article/rewrite, and one or two competitor checks per monitoring keyword. Continue with explicit source-status notes if search or fetch is unavailable.",
  "deliverableHint": "Deliver in the user requested language in a clear, user-readable format.",
  "reviewHint": "Reject generic SEO advice. Confirm mode, language/market, keyword, intent, top-result evidence, page-to-query mapping, conversion goal, concrete page changes, CTA/trust changes, E-E-A-T angle, competitor gaps, natural keyword use, and an actionable rewrite/article/monitoring or PR-ready output. If the request is strategic, it must still end in exact pages, exact copy surfaces, and exact measurement points.",
  "executionFocus": "Run SEO analysis first, then turn it into one concrete page decision. Infer article, rewrite, or monitor mode, inspect the current SERP and competitors, map the winning page, and return exact page changes, CTA/trust edits, and a PR-ready implementation handoff when site or repo context exists.",
  "outputSections": [
    "Mode, conversion goal, and target keyword",
    "SERP and competitor analysis",
    "Page map",
    "Winning-page recommendation",
    "Concrete page changes",
    "Rewrite spec or article brief",
    "CTA, trust, and internal-link plan",
    "Proposal PR handoff",
    "Distribution templates",
    "Meta title and meta description",
    "Sources and next measurement"
  ],
  "inputNeeds": [
    "SEO mode or goal",
    "Primary conversion goal",
    "Target keyword or topic",
    "Market and language",
    "Target URL or site URL",
    "Current site/pages and competitors",
    "Analytics or Search Console context",
    "Repo, CMS, or implementation context when PR-style changes are needed"
  ],
  "acceptanceChecks": [
    "Mode, keyword, language, intent, and conversion goal are clear",
    "Top SERP competitors, URLs, and content structure are considered",
    "One target page and one supporting page are justified",
    "Page changes, CTA, and trust changes are explicit",
    "PR-style handoff or implementation spec is included when context exists",
    "Measurement next step is included"
  ],
  "firstMove": "Infer article/rewrite/monitor mode from the request, then inspect the SERP, choose the page that should win, and only after that write the concrete rewrite, new-page, or monitoring output.",
  "failureModes": [
    "Do not write SEO advice without mode, keyword, intent, and live or stated competitor context",
    "Do not jump from analysis to vague advice without naming the exact page to change or create",
    "Do not keyword-stuff or hide weak source coverage",
    "Do not skip the report section before rewrite/article/monitoring or PR-ready output"
  ],
  "evidencePolicy": "Use target keyword, conversion goal, language, mode, target URL/site URL, current pages, top search results, fetched competitor pages, page-level CTA/trust context, search intent, content gap evidence, and any repo/CMS context for implementation. Use Search Console or GA4 when available to tie SEO changes to signup behavior. Date current SERP observations and state when search/fetch was unavailable.",
  "nextAction": "End with the first page to change or create, the target keyword, the CTA change, the PR-ready or implementation handoff, the next publish asset, and the measurement plan.",
  "confidenceRubric": "High when keyword, language, site, target page, SERP pattern, competitors, conversion goal, and implementation context are known; medium when SERP access is partial or analytics/implementation context is missing; low when keyword, intent, or target page is unclear.",
  "handoffArtifacts": [
    "SEO mode decision",
    "Keyword/intent and conversion summary",
    "SERP/competitor analysis",
    "Page map and winning-page recommendation",
    "Concrete page changes and PR handoff",
    "Distribution assets and measurement plan"
  ],
  "prioritizationRubric": "Prioritize work by search intent fit, conversion impact, competitor gap severity, ranking opportunity, page ownership clarity, implementation readiness, and whether rewrite, new page, or monitoring mode is most appropriate.",
  "measurementSignals": [
    "Ranking feasibility",
    "Search impressions",
    "Organic clicks",
    "Primary CTA click rate",
    "Registration or signup conversion from page",
    "SERP competitor movement",
    "Implemented page-change impact"
  ],
  "assumptionPolicy": "Assume article mode for a plain keyword/topic. Switch to rewrite when targetUrl plus keyword is present, and monitor when siteUrl plus targetKeywords or ranking language is present. When a site URL and conversion goal are present, assume the user needs page mapping, concrete page changes, and CTA guidance before broader landing ideas. Do not assume language, market, or SERP pattern when they change the content plan.",
  "escalationTriggers": [
    "SEO mode, keyword, language, market, or conversion goal is unclear",
    "Current SERP evidence is needed but unavailable",
    "The content goal conflicts with search intent",
    "Rewrite/monitoring was requested but target URL or site URL is missing",
    "A signup or registration goal was named but the target page, CTA surface, or implementation surface is unclear"
  ],
  "minimumQuestions": [
    "Should this be article creation, existing-page rewrite, or site/keyword monitoring?",
    "What keyword/topic, language/market, and conversion goal are targeted?",
    "Which target URL, site URL, current pages, or competitors should be considered?",
    "Is there repo, CMS, or implementation context for a PR-style handoff?",
    "What reader, signup, or content goal matters most?"
  ],
  "reviewChecks": [
    "Mode, intent, and conversion goal are addressed",
    "Competitors, live URLs, and top-result structure are summarized",
    "Page map, CTA, trust changes, and target page choice are prioritized",
    "Rewrite/article/monitoring and PR-style implementation requirements are actionable"
  ],
  "depthPolicy": "Default to one focused SEO mode, one page/keyword target, and the first executable deliverable. Go deeper when SERP intent, competitor fetches, rewrite gaps, CTA/trust edits, implementation handoff, and distribution templates all matter.",
  "concisionRule": "Avoid generic SEO advice; keep the analysis, chosen target page, concrete page changes, CTA/trust edits, PR-style handoff, deliverable, meta description, and priority order visible.",
  "toolStrategy": {
    "web_search": "default",
    "source_mode": "current_serp_top_results_fetch_top_competitors_and_keyword_intent",
    "note": "Use one focused SERP search, inspect the top result URLs plus H1/H2/H3 structure, fetch or summarize up to three competitors, map one keyword cluster to one page, and turn the analysis into exact page changes plus a PR-ready handoff when implementation context exists. Continue with explicit source-status notes when search/fetch is unavailable."
  },
  "specialistMethod": [
    "Infer mode first: article creation, existing-page rewrite, or site/keyword monitoring.",
    "Confirm or infer keyword, conversion goal, language, market, target reader, site, target URL, implementation surface, and content goal.",
    "Map one keyword cluster to one target page before drafting so the user knows which page should rank and which CTA should convert.",
    "Inspect current SERP, top-result URLs, H1/H2/H3 patterns, word-count range, search intent, trust signals, and competitor gaps when available.",
    "Return the winning-page recommendation, page-specific H1/hero, CTA placement, trust/FAQ blocks, and what happens after signup when the goal includes registration or leads.",
    "Return a research/action report plus article draft, rewrite sections, monitoring memo, and a PR-ready implementation handoff when repo or CMS context exists."
  ],
  "scopeBoundaries": [
    "Do not write generic SEO advice without mode, keyword, intent, SERP, and competitor grounding.",
    "Do not keyword-stuff, over-optimize headings, or recommend content that conflicts with search intent.",
    "Do not ignore language, region, current SERP volatility, E-E-A-T, target page state, or business value.",
    "Do not present an article, rewrite, or monitoring report without the research/report section that explains why."
  ],
  "freshnessPolicy": "Treat SERP, ranking competitors, search intent, top-result structure, and keyword difficulty as time-sensitive. Date the SERP read and flag when current search results or competitor fetches were not checked.",
  "sensitiveDataPolicy": "Treat analytics, Search Console data, draft content, customer keywords, and private conversion data as confidential. Use public SERP facts and aggregate internal metrics.",
  "costControlPolicy": "Use the SEO-agent budget: one focused search, up to three competitor reads for article/rewrite, and one or two competitor reads per monitoring keyword. Default to one page/keyword target, one CTA surface, and one distribution pack before expanding to larger keyword maps."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'seo_gap',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'seo_gap'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'seo_gap agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/seo_gap/health',
  healthcheck_url: '/sample-agents/seo_gap/health',
  jobEndpoint: '/sample-agents/seo_gap/jobs',
  job_endpoint: '/sample-agents/seo_gap/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/seo_gap/health',
    jobs: '/sample-agents/seo_gap/jobs'
  }),
  metadata: Object.freeze({
    sample: true,
    sampleKind: 'seo_gap',
    sample_kind: 'seo_gap',
    category: 'seo_gap',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
