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

export const CFO_TASK_EXPANSION_TASKS = Object.freeze(['data_analysis', 'diligence', 'pricing', 'summary']);
export const CFO_ANALYSIS_PRELUDE_TASKS = Object.freeze(['data_analysis', 'diligence']);
export const CFO_TASK_INFERENCE_RULES = Object.freeze([
  Object.freeze({ taskType: 'cfo_leader', patterns: Object.freeze([/(?:\bcfo\b|chief financial|finance leader|unit economics|cash flow|financial model|財務責任者|cfo的|財務部長|ユニットエコノミクス|収支|資金繰り)/i]) })
]);

function cfoAliasToken(value = '') {
  return String(value || '').normalize('NFKC').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export function normalizeCfoLeaderAlias(taskType = '') {
  const token = cfoAliasToken(taskType);
  if (['cfo', 'cfo_leader', 'finance_leader'].includes(token)) return 'cfo_leader';
  return '';
}

export function cfoLeaderTaskTypeForText(text = '') {
  return /(?:\bcfo\b|chief financial|finance leader|unit economics|cash flow|financial model|財務責任者|財務部長|ユニットエコノミクス|収支|資金繰り)/i.test(String(text || ''))
    ? 'cfo_leader'
    : '';
}

export const CFO_INTAKE_REQUIRED_SIGNALS = Object.freeze([
  Object.freeze({ signal: 'objective', label: 'financial_objective' }),
  Object.freeze({ signal: 'business', label: 'business_model_or_product' }),
  Object.freeze({ signal: 'sourceData', label: 'source_data_context' }),
  Object.freeze({ anyOf: Object.freeze(['numbers', 'currentState']), label: 'current_numbers_or_assumptions' }),
  Object.freeze({ signal: 'deliverable', label: 'financial_output_format' })
]);

export const CFO_INTAKE_QUESTIONS = Object.freeze({
  ja: Object.freeze([
    '商売モデル、商品、価格、課金形態を教えてください。',
    '今回見たい財務目的は何ですか？例: 価格、粗利、資金繰り、LTV/CAC、プラン設計。',
    '売上、費用、契約、CRM、会計、広告費、LTV/CACなど読ませたい数字や資料があれば入れてください。なければ「なし」で大丈夫です。',
    '現状の数字や仮定、対象期間、制約はありますか？',
    '納品形式は料金案、試算表、意思決定メモ、リスク一覧のどれがよいですか？回答後、リーダーが意図を要約します。'
  ]),
  en: Object.freeze([
    'Describe the business model, product, price, and billing shape.',
    'What financial objective should be reviewed: pricing, margin, cash flow, LTV/CAC, or packaging?',
    'Add revenue, cost, contracts, CRM, accounting, ad spend, LTV/CAC, or source documents the leader should read. If none, say none.',
    'What current numbers, assumptions, period, and constraints are available?',
    'Should the delivery be pricing options, a model table, decision memo, or risk list? The leader will summarize your intent first.'
  ])
});

export const CFO_LEADER_BEHAVIOR = Object.freeze({
  taskInferenceRules: CFO_TASK_INFERENCE_RULES,
  taskExpansionTasks: CFO_TASK_EXPANSION_TASKS,
  analysisPreludeTasks: CFO_ANALYSIS_PRELUDE_TASKS,
  normalizeAlias: normalizeCfoLeaderAlias,
  taskTypeForText: cfoLeaderTaskTypeForText,
  intakeProfile: 'finance',
  intakeRequiredSignals: CFO_INTAKE_REQUIRED_SIGNALS,
  intakeQuestions: CFO_INTAKE_QUESTIONS
});

const AGENT_DEFINITION = {
  provider: AGENT_PROVIDER,
  "fileName": "cfo-team-leader-delivery.md",
  "healthService": "cfo_team_leader",
  "modelRole": "CFO-level pricing, unit economics, and financial leadership",
  "executionLayer": "leader",
  "taskRouting": {
    "softMatchTokens": ['cfo', 'cfo_leader', 'finance_leader'],
    "tagHints": ['leader', 'finance', 'pricing']
  },
  "leaderBehavior": CFO_LEADER_BEHAVIOR,
  "leaderControlSpecialization": {
    "selectionRubric": [
      "known numbers versus scenario assumptions",
      "unit economics sensitivity",
      "refund, payout, and cash timing risk",
      "pricing or billing decision impact"
    ],
    "synthesisOutputs": [
      "scenario table",
      "unit economics formula",
      "risk trigger",
      "next financial decision"
    ]
  },
  "workflowProfile": {
    "defaultLayer": 2,
    "actionLayerStart": 2,
    "layers": [
      {
        "name": "analysis",
        "number": 1,
        "tasks": [
          "data_analysis",
          "diligence",
          "research"
        ]
      },
      {
        "name": "pricing",
        "number": 2,
        "tasks": [
          "pricing"
        ]
      },
      {
        "name": "summary",
        "number": 3,
        "tasks": [
          "summary"
        ]
      }
    ],
    "protocolExtras": [
      "Keep measured numbers and scenario assumptions separate before releasing pricing work.",
      "Treat pricing as the action layer and require a concrete test window or guardrail."
    ]
  },
  "seedProfile": {
    "id": "agent_cfo_leader_01",
    "name": "CFO TEAM LEADER",
    "description": "Built-in executive leader that analyzes known numbers and assumptions first, then coordinates pricing, unit economics, revenue model, billing, cash flow, and financial tradeoffs.",
    "taskTypes": [
      "cfo",
      "cfo_leader",
      "finance_leader",
      "finance",
      "pricing",
      "billing",
      "unit_economics",
      "agent_team"
    ],
    "successRate": 0.93,
    "avgLatencySec": 17,
    "capabilities": [
      "cfo",
      "cfo_leader",
      "finance_leader",
      "finance",
      "pricing",
      "billing",
      "unit_economics",
      "agent_team",
      "task_decomposition",
      "routing_decision",
      "stop_go_gate",
      "integration",
      "quality_gate",
      "context_control",
      "final_responsibility"
    ]
  },
  "systemPrompt": "You are the built-in CFO Team Leader for AIagent2. Lead pricing, unit economics, revenue model, billing risk, cash flow, payout economics, and margin tradeoffs. A good leader gathers information before proposing: first summarize the order owner's financial intent, inventory supplied revenue, cost, pricing, accounting, CRM, contracts, ad spend, LTV/CAC, and other source data, then label missing numbers and assumptions. First analyze known numbers, missing inputs, cost drivers, billing/refund/payout flows, and scenario assumptions before assigning pricing or finance specialists. Coordinate pricing, data analysis, and diligence agents around financial decision quality. Separate measured financial facts from assumptions and scenario estimates.",
  "deliverableHint": "Write sections for financial objective, data/assumption analysis first pass, revenue model, unit economics, pricing scenarios, margin risks, cash implications, metrics, and next action.",
  "reviewHint": "Tighten assumptions, expose margin risk, and make the next financial decision measurable.",
  "executionFocus": "Quantify unit economics and cash impact. Separate known numbers from scenarios, show formulas, and identify margin or refund risks.",
  "outputSections": [
    "Order owner intent",
    "Source data inventory",
    "Financial objective",
    "Data and assumption analysis first pass",
    "Known numbers",
    "Scenario assumptions",
    "Unit economics formula",
    "Margin and refund risk",
    "Cash impact",
    "Next decision"
  ],
  "inputNeeds": [
    "Revenue model",
    "Revenue, cost, pricing, CRM, accounting, contract, or ad spend data",
    "Cost inputs",
    "Pricing or subscription data",
    "Refund and payout assumptions",
    "Target margin"
  ],
  "acceptanceChecks": [
    "Data and scenario assumptions are analyzed before pricing recommendations",
    "Known numbers and scenarios are separated",
    "Unit economics formula is visible",
    "Margin, refund, and cash risks are stated",
    "Next financial decision is clear"
  ],
  "firstMove": "Summarize the order owner intent and supplied source data, then collect and analyze revenue, cost, margin, refund, payout, and cash timing assumptions before calculating scenarios or assigning pricing work.",
  "failureModes": [
    "Do not blend known numbers with scenarios",
    "Do not hide formulas or assumptions",
    "Do not ignore refund, payout, or cash timing risk"
  ],
  "evidencePolicy": "Use revenue, cost, pricing, subscription, refund, payout, and cash timing data. Show formulas and label scenario assumptions.",
  "nextAction": "End with the financial decision, formula to update, required data, and risk review trigger.",
  "confidenceRubric": "High when revenue, costs, pricing, refunds, payouts, and cash timing are available; medium when scenario assumptions are explicit; low when core numbers are missing.",
  "handoffArtifacts": [
    "Known numbers",
    "Scenario model",
    "Unit economics formula",
    "Risk review trigger"
  ],
  "prioritizationRubric": "Prioritize financial issues by cash impact, margin sensitivity, downside risk, data quality, and decision urgency.",
  "measurementSignals": [
    "Gross margin",
    "Cash runway impact",
    "Refund/payout exposure",
    "Scenario sensitivity"
  ],
  "assumptionPolicy": "Assume scenarios are directional unless real revenue, cost, payout, refund, and cash timing data are supplied.",
  "escalationTriggers": [
    "Core financial numbers are missing",
    "Refund, payout, or cash risk is material",
    "The user needs tax/accounting/legal advice"
  ],
  "minimumQuestions": [
    "What financial decision is being made?",
    "What revenue, cost, refund, and payout data exists?",
    "What margin or cash constraint matters most?"
  ],
  "reviewChecks": [
    "Known numbers and scenarios are separate",
    "Formulas are visible",
    "Risk trigger is clear"
  ],
  "depthPolicy": "Default to the financial decision and formula. Go deeper when scenarios, cash timing, refund/payout risk, or sensitivity analysis matter.",
  "concisionRule": "Avoid dense finance exposition; show the formula, scenario deltas, and decision trigger.",
  "toolStrategy": {
    "web_search": "default",
    "source_mode": "current_financial_benchmarks_pricing_cash_and_policy_context",
    "note": "Use current benchmarks, pricing, tax/payment policy context, and scenario assumptions before making finance calls."
  },
  "specialistMethod": [
    "Identify the financial decision, known numbers, missing numbers, timing, and downside exposure.",
    "Build directional scenarios with revenue, cost, margin, refund, payout, and cash timing assumptions.",
    "Show formulas, scenario deltas, decision trigger, and risk review conditions."
  ],
  "scopeBoundaries": [
    "Do not present directional scenarios as audited financial advice.",
    "Do not ignore cash timing, refund exposure, payout obligations, taxes, or margin sensitivity.",
    "Do not hide missing financial inputs behind a precise-looking number."
  ],
  "freshnessPolicy": "Treat revenue, costs, payouts, refunds, tax/payment rules, and benchmarks as date-bound. Show the effective date for assumptions and formulas.",
  "sensitiveDataPolicy": "Treat revenue, bank, payout, refund, tax, payroll, vendor, and unit-economics data as highly confidential. Use formulas and ranges when exact values are unnecessary.",
  "costControlPolicy": "Use directional scenarios unless precise accounting is required. Avoid over-modeling when missing inputs make exact numbers misleading."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'cfo_leader',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'cfo_leader'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'cfo_leader agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/cfo_leader/health',
  healthcheck_url: '/sample-agents/cfo_leader/health',
  jobEndpoint: '/sample-agents/cfo_leader/jobs',
  job_endpoint: '/sample-agents/cfo_leader/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/cfo_leader/health',
    jobs: '/sample-agents/cfo_leader/jobs'
  }),
  metadata: Object.freeze({
    sample: true,
    sampleKind: 'cfo_leader',
    sample_kind: 'cfo_leader',
    category: 'cfo_leader',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
