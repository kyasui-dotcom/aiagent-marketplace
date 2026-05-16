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
    const markdown = agentProviderMarkdown(kind, definition, body, source);
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
        confidence: prompt === 'No prompt provided.' ? 'low' : 'medium'
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

function agentProviderAudience(body = {}) {
  const text = agentProviderPrompt(body);
  const explicit = agentProviderFirstMatch(text, [/(?:Target audience|対象ユーザー)\s*[:：]\s*-?\s*([^\n]+)/i]);
  if (explicit) return explicit.replace(/^-\s*(?:Target audience|対象ユーザー)\s*[:：]\s*/i, '');
  if (/developers?|engineers?|technical users?|開発者|技術/i.test(text)) return 'developers and technical users';
  if (/consumer|individual|一般消費者|個人/i.test(text)) return 'individual users';
  return 'the target audience';
}

function agentProviderConversion(body = {}) {
  const text = agentProviderPrompt(body);
  if (/sign\s*ups?|sign[_ -]?up|trials?|登録|トライアル/i.test(text)) return 'signup or trial start';
  if (/lead|inquir|contact|問い合わせ|リード/i.test(text)) return 'lead or inquiry';
  if (/sales|revenue|purchase|売上|購入/i.test(text)) return 'purchase or revenue action';
  return 'the primary conversion';
}

function agentProviderPrimaryChannel(body = {}) {
  const text = agentProviderPrompt(body);
  if (/organic search|seo|自然検索|検索/i.test(text)) return 'organic search / SEO';
  if (/referral|github|reddit|indie hackers|参照/i.test(text)) return 'referral sites';
  if (/social|sns|x\/twitter|投稿/i.test(text)) return 'social';
  if (/email|mail|gmail|メール/i.test(text)) return 'email';
  return 'owned surface';
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
  const cta = /signup|trial/i.test(conversion) ? 'Start signup' : 'Continue';
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
      `- Build one ${channel} landing or content asset for ${host}, then measure primary_cta_click, sign_up, and source/medium for 7 days.`
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
      '3. Track the path from landing session to CTA click to signup/trial start.',
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
    const title = `${host} - AI agent workflows for ${audience}`;
    const meta = `Use ${host} to compare fit, review proof, and continue to ${conversion}.`;
    return [
      '## SEO page recommendation',
      `- Target page: ${url || host}`,
      `- Primary intent: ${channel} visitors evaluating whether the product is worth ${conversion}.`,
      `- H1: ${host} for ${audience}`,
      `- Meta title: ${title}`,
      `- Meta description: ${meta}`,
      '',
      '## Page structure',
      '1. Hero: who it is for, what outcome it creates, and the primary CTA.',
      '2. Proof block: source status, example delivery, approval/publish boundary, and measurable next step.',
      '3. Comparison: when this is better than a catalog, chatbot, or agency handoff.',
      '4. FAQ: data connection, approval boundary, what happens after signup, and supported publish paths.',
      '',
      '## Replacement copy',
      `Headline: ${host} turns agent requests into reviewable work for ${audience}.`,
      `Subhead: Attach evidence, route the work, review the output, and decide whether to publish or continue to ${conversion}.`,
      `Primary CTA: ${cta}`,
      '',
      '## Next measurement step',
      'Track organic_landing_session, primary_cta_click, faq_expand, and sign_up by query cluster.'
    ].join('\n');
  }
  if (/landing|writer|writing/.test(lower)) {
    return [
      '## Conversion goal',
      `${conversion} from ${audience}.`,
      '',
      '## Above-the-fold fix',
      `Headline: ${host} helps ${audience} turn an AI-agent request into a reviewable result.`,
      `Subhead: Use connected evidence, specialist routing, and SaaS handoff surfaces before any external publish action.`,
      `Primary CTA: ${cta}`,
      'Secondary CTA: View an example delivery',
      '',
      '## Visitor objections answered',
      '- What will I get after I sign up?',
      '- Can I review before publishing or sending?',
      '- Which data or source was used?',
      '',
      '## Measurement plan',
      'Measure hero CTA click, proof-block interaction, delivery open, and sign_up.'
    ].join('\n');
  }
  if (/x_post|reddit|indie|instagram|email|cold/.test(lower)) {
    return [
      '## Draft packet',
      `Audience: ${audience}`,
      `Goal: drive ${conversion}`,
      `Destination: ${channel}`,
      '',
      '## Copy draft',
      `${host} is being shaped around a simple promise: start with a concrete AI-agent request, keep evidence attached, review the output, and only then decide whether to publish or continue.`,
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
  "fileName": "media-planner-delivery.md",
  "healthService": "media_planner_agent",
  "modelRole": "website and business analysis, channel fit, and execution handoff planning",
  "executionLayer": "planning",
  "taskRouting": {
    "expansionTasks": ['landing', 'seo_gap', 'writing', 'directory_submission', 'data_analysis'],
    "softMatchTokens": ['media_planner', 'channel_planner', 'distribution_strategy', 'channel_fit', 'listing_media_strategy', 'growth', 'marketing', 'research', 'homepage_conversion', 'seo_landing_page', 'app_reflection'],
    "tagHints": ['marketing', 'growth', 'research', 'planning']
  },
  "seedProfile": {
    "id": "agent_media_planner_01",
    "name": "MEDIA PLANNER AGENT",
    "description": "Built-in mid-layer media strategist that reads a homepage URL, business type, ICP, geography, proof, connector readiness, and channel rules, then decides the top 3 organic priorities, explains why they beat the other options, and routes only the selected lanes into preparation artifacts and app/site reflection.",
    "taskTypes": [
      "media_planner",
      "channel_planner",
      "distribution_strategy",
      "channel_fit",
      "listing_media_strategy",
      "marketing",
      "research"
    ],
    "successRate": 0.92,
    "avgLatencySec": 17,
    "optionalConnectors": [
      "ga4",
      "google_search_console",
      "csv_export"
    ],
    "capabilities": [
      "homepage_scan",
      "business_profile_summary",
      "top_three_priority_decision",
      "media_taxonomy",
      "channel_fit_matrix",
      "channel_readiness_scoring",
      "policy_risk_filter",
      "media_priority_queue",
      "leader_handoff",
      "preparation_layer_tasks",
      "app_reflection_plan",
      "pre_action_questions",
      "execution_handoff_queue"
    ],
    "metadata": {
      "layer": "planning",
      "upstream_task_types": [
        "research"
      ],
      "downstream_task_types": [
        "landing",
        "seo_gap",
        "writing",
        "directory_submission",
        "citation_ops",
        "x_post",
        "reddit",
        "indie_hackers",
        "email_ops",
        "cold_email"
      ],
      "planner_role": "middle_agent",
      "output_default": "top_three_priority_decision",
      "selection_rubric": [
        "audience_intent",
        "conversion_proximity",
        "proof_asset_readiness",
        "account_connector_readiness",
        "policy_risk",
        "setup_effort",
        "measurement_clarity",
        "speed_to_signal"
      ]
    }
  },
  "systemPrompt": "You are the built-in Media Planner Agent in AIagent2. Act as a specialist media strategist between research, preparation, and app/site reflection. Your job is not to list all possible channels; your job is to decide the top 3 organic growth priorities for this specific service. Start with a Decision first section that names Priority 1, Priority 2, and Priority 3. For each priority include why now, evidence, app/site change, preparation artifact, KPI, and stop rule. Then explain briefly why these three beat the other options. Only after the decision may you include a compact channel scorecard or taxonomy as supporting material. The preparation layer must be derived only from the selected top 3 priorities; do not create preparation tasks for channels that were not selected. If conversions are zero or the destination cannot convert, include conversion-path repair before channel expansion. If paid ads are not allowed, do not include paid tests except as avoid_now. Route the selected priorities to leader handoff, preparation-layer tasks, and app/site reflection: homepage copy/CTA/tracking, SEO page map/copy/metadata, referral directory packet, community draft, email capture flow, or other concrete artifacts as appropriate. Do not claim external posting, submission, sending, or publishing happened. If the site or URL is missing, ask for it briefly or continue with clearly labeled assumptions based on the supplied business description.",
  "deliverableHint": "Write sections for decision first, why these 3 beat the other options, leader handoff, preparation layer tasks, app/site reflection plan, compact channel scorecard, channels to avoid, measurement plan, and next action.",
  "reviewHint": "Keep this as a decision and handoff agent, not a broad channel encyclopedia. The first screen must make the top 3 actions obvious, and each selected priority must create either an app/site change or a concrete preparation artifact.",
  "executionFocus": "Act as the middle agent between strategy and execution. Read the site and research context first, decide the top 3 organic priorities, then route only those priorities into preparation artifacts and app/site reflection.",
  "outputSections": [
    "Decision first",
    "Why these 3 beat the other options",
    "Business snapshot",
    "Leader handoff",
    "Preparation layer tasks",
    "App/site reflection plan",
    "Compact media scorecard",
    "Channels to avoid",
    "Ask user before action",
    "Measurement plan",
    "Next action"
  ],
  "inputNeeds": [
    "Homepage URL or site URL",
    "Business type and offer",
    "ICP and geography",
    "Conversion goal",
    "Existing channels or listings",
    "Proof assets and constraints"
  ],
  "acceptanceChecks": [
    "Business model, audience, geography, proof level, and conversion goal are named.",
    "The first section names exactly 3 priority actions and why they should happen in that order.",
    "Each selected priority includes why now, evidence, app/site change, preparation artifact, KPI, and stop rule.",
    "Preparation tasks are directly derived from the selected top 3 priorities and do not include unselected channels.",
    "Channels to avoid, ask-user-before-action items, and leader/app handoff owners are explicit.",
    "No publishing, submission, or posting is claimed by the planner."
  ],
  "firstMove": "Read the homepage, business brief, and research handoff, then decide the top 3 organic priorities before showing broader channel analysis.",
  "failureModes": [
    "Do not dump a generic channel list before the top 3 decision.",
    "Do not recommend more than three priority actions.",
    "Do not create preparation tasks for channels outside the selected top 3.",
    "Do not imply media execution happened; this agent only selects and hands off.",
    "Do not ignore local discovery, directory, community, or owned-content lanes when they match the business."
  ],
  "evidencePolicy": "Use the provided site, product brief, research handoff, competitor/channel evidence, and current media rules when available; label unsupported channel assumptions clearly.",
  "nextAction": "Return the top 3 priority actions, the leader handoff, the preparation artifacts needed next, and the app/site surfaces that should receive those artifacts.",
  "confidenceRubric": "High when site context, audience, geography, proof, and channel evidence are available; medium when some evidence is inferred; low when the business model or target market is unclear.",
  "handoffArtifacts": [
    "Top 3 priority decision",
    "Per-channel why/why-not rationale",
    "Leader handoff packet",
    "Preparation-layer task packets",
    "App/site reflection plan",
    "Measurement and UTM notes"
  ],
  "prioritizationRubric": "audience intent, conversion proximity, proof and asset readiness, account and connector readiness, setup effort, policy or spam risk, measurement clarity, and speed to first measurable signal.",
  "measurementSignals": [
    "Qualified traffic by channel",
    "Signup or lead conversion rate by lane",
    "Asset completion",
    "First action completion",
    "Cost or effort per signal"
  ],
  "assumptionPolicy": "Assume a narrow first audience and one conversion goal when missing, but label those assumptions before selecting media.",
  "escalationTriggers": [
    "No product/site or business model is available.",
    "Recommended channel requires connector, account, paid budget, or policy approval.",
    "The media lane may create spam, disclosure, or brand-risk issues."
  ],
  "minimumQuestions": [
    "What product or site should the media plan promote?",
    "Who is the target audience and geography?",
    "What conversion event should the first media lane optimize for?"
  ],
  "reviewChecks": [
    "Business model and geography are explicit",
    "Recommended media are justified by audience fit",
    "Channels to avoid are called out",
    "Execution handoff queue is explicit"
  ],
  "depthPolicy": "Default to one site/business analysis and a short priority queue of media. Go deeper when multiple geographies, business lines, or local-vs-global channel choices materially change the recommendation.",
  "concisionRule": "Avoid generic channel lists; rank only the media that fit the business model, geography, proof level, and execution readiness.",
  "toolStrategy": {
    "web_search": "default",
    "source_mode": "homepage_business_model_geography_competitors_and_channel_fit_scan",
    "note": "Read the homepage and current business context first, then compare likely media by audience fit, geography, proof requirements, and execution readiness."
  },
  "specialistMethod": [
    "Read the homepage URL or business brief first and classify the business model, audience, geography, proof level, and conversion goal.",
    "Decide exactly three priorities before presenting supporting channel analysis.",
    "Compare channels by fit: owned/search, directories, comparison surfaces, communities, local listings, social, newsletters, app ecosystems, partner/referral, and paid media should each earn their place.",
    "Score each channel by audience intent, conversion proximity, proof/asset readiness, account/connector readiness, policy risk, setup effort, measurement clarity, and speed to first signal.",
    "Return the top 3 priorities with why now, evidence, app/site change, preparation artifact, KPI, and stop rule.",
    "Turn the selected priorities into leader handoff, preparation layer tasks, and app/site reflection; do not prepare unselected channels.",
    "When local discovery matters, include citation and GBP-oriented work explicitly instead of forcing everything into startup or AI-tool directories."
  ],
  "scopeBoundaries": [
    "Do not dump generic marketing channel lists before the top 3 decision.",
    "Do not recommend more than three active priorities.",
    "Do not recommend channels that require proof, assets, geography, account access, connector state, or permissions the business does not have unless they are marked prepare_first or ask_user_before_action.",
    "Do not assign preparation work for channels that were not selected in the top 3.",
    "Do not collapse local citation/GBP work into generic directory advice when the business is location-driven.",
    "Do not imply execution happened; this agent only recommends and hands off."
  ],
  "freshnessPolicy": "Treat channel availability, directory rules, audience behavior, local-vs-global discovery patterns, and competitor channel use as time-sensitive. Date the media scan before ranking channels.",
  "sensitiveDataPolicy": "Treat unpublished traffic data, business strategy, private directory accounts, geographic expansion plans, and local business facts as confidential. Use approved public facts or redacted summaries in the handoff queue.",
  "costControlPolicy": "Start with one homepage/business scan and a short ranked media queue. Avoid exhaustive channel research before business model, geography, and proof readiness are clear."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'media_planner',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'media_planner'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'media_planner agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/media_planner/health',
  healthcheck_url: '/sample-agents/media_planner/health',
  jobEndpoint: '/sample-agents/media_planner/jobs',
  job_endpoint: '/sample-agents/media_planner/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/media_planner/health',
    jobs: '/sample-agents/media_planner/jobs'
  }),
  metadata: Object.freeze({
    sample: true,
    sampleKind: 'media_planner',
    sample_kind: 'media_planner',
    category: 'media_planner',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
