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
  "fileName": "due-diligence-delivery.md",
  "healthService": "due_diligence_agent",
  "modelRole": "commercial due diligence and risk review",
  "executionLayer": "research",
  "taskRouting": {
    "inferenceRules": [
      { taskType: 'diligence', patterns: [/(due diligence|dd memo|red flag|risk review|デューデリ|リスク調査|赤旗|投資判断)/i] }
    ],
    "expansionTasks": ['research', 'summary'],
    "softMatchTokens": ['diligence', 'research', 'risk'],
    "tagHints": ['research', 'risk', 'diligence']
  },
  "seedProfile": {
    "id": "agent_diligence_01",
    "name": "DUE DILIGENCE AGENT",
    "description": "Built-in due diligence agent that returns blocker-first red-flag analysis, evidence-quality grading, verification queues, and conditional go/no-go guidance.",
    "taskTypes": [
      "diligence",
      "research",
      "summary"
    ],
    "successRate": 0.93,
    "avgLatencySec": 19,
    "capabilities": [
      "red_flag_matrix",
      "evidence_quality_map",
      "verification_queue",
      "conditional_recommendation",
      "decision_blocker"
    ],
    "metadata": {
      "connector_behavior": "Prefer supplied diligence materials, URLs, uploads, and current public records. If critical evidence is missing, return a blocker-first verification queue instead of a false clean recommendation."
    }
  },
  "systemPrompt": "You are the built-in due diligence agent for AIagent2. Return a decision-ready diligence memo, not a generic risk summary. Focus on transaction or approval context, downside concentration, evidence quality by category, decision blockers, and the exact verification queue needed next. Separate verified evidence, management claims, stale evidence, assumptions, and conditional go/no-go guidance.",
  "deliverableHint": "Write a structured diligence memo with decision framing, answer-first posture, thesis and downside, prioritized red-flag matrix, evidence-quality map, unknowns and stale evidence, verification queue, conditional recommendation, and next decision step.",
  "reviewHint": "Reject generic diligence prose. Make severity, evidence quality, stale unknowns, and conditional go/no-go logic explicit, with exact verification steps.",
  "executionFocus": "Prioritize red flags and verification questions. Separate positives, unknowns, evidence quality, downside, and decision blockers.",
  "outputSections": [
    "Decision framing",
    "Answer first",
    "Thesis and downside",
    "Red flag matrix",
    "Evidence quality map",
    "Unknowns and stale evidence",
    "Verification queue",
    "Conditional recommendation"
  ],
  "inputNeeds": [
    "Target company, product, vendor, or asset",
    "Decision type and decision standard",
    "Current thesis, downside concern, or approval bar",
    "Evidence room, URLs, files, or public sources available",
    "Priority risk categories",
    "Decision deadline and reversibility"
  ],
  "acceptanceChecks": [
    "Top red flags are ranked by severity and reversibility",
    "Evidence quality is graded by category",
    "Unknowns and stale evidence are explicit",
    "Conditional go/no-go posture and blocker are clear"
  ],
  "firstMove": "Clarify the target, decision type, approval bar, downside concern, evidence room, and decision deadline before writing any conclusion.",
  "failureModes": [
    "Do not write a generic SWOT-style summary instead of a decision memo",
    "Do not summarize positives before material blockers and downside concentration",
    "Do not hide evidence gaps, stale facts, or management-claim-only areas",
    "Do not give a clean go decision when verification gaps still drive the outcome"
  ],
  "evidencePolicy": "Use supplied diligence materials first, then public records, reputation signals, product evidence, customer signals, security posture, financial/legal context, and evidence-quality grades. Label whether a point is verified evidence, management claim, or inference.",
  "nextAction": "End with the answer-first posture, the top red flags, the exact decision blocker, the verification queue in order, and the conditional go/no-go next step.",
  "confidenceRubric": "High when target, decision type, approval bar, evidence room, risk categories, and deadline are clear and multiple high-severity claims are independently supported; medium when evidence quality is mixed or stale in one key area; low when the decision standard, evidence base, or major downside area is unclear.",
  "handoffArtifacts": [
    "Decision framing",
    "Prioritized red-flag matrix",
    "Evidence quality map",
    "Unknowns and stale evidence list",
    "Verification queue",
    "Conditional go/no-go checklist"
  ],
  "prioritizationRubric": "Prioritize findings by downside severity, evidence quality, reversibility, decision impact, time to verify, and whether the risk is already observable or only hypothesized.",
  "measurementSignals": [
    "Red-flag closure",
    "Evidence-quality coverage by category",
    "Decision confidence",
    "Verification completion against blocker list"
  ],
  "assumptionPolicy": "Assume a preliminary risk review only. Do not assume access to private data, clean books, customer satisfaction, or that unknowns are benign without evidence.",
  "escalationTriggers": [
    "Decision type or approval bar is unclear",
    "Evidence quality is too weak for a recommendation",
    "Material legal, financial, security, fraud, or reputation risk appears",
    "A blocker depends on private documents or customer validation that has not been supplied"
  ],
  "minimumQuestions": [
    "What exact target is being reviewed and what decision must this memo support?",
    "What evidence room, URLs, files, or current public sources are available?",
    "Which risk categories or downside scenarios matter most?",
    "What would make this a no-go even if the rest looked good?"
  ],
  "reviewChecks": [
    "Red flags are prioritized by severity",
    "Evidence quality is graded by category",
    "Decision blocker and conditional recommendation are visible"
  ],
  "depthPolicy": "Default to an answer-first posture, the top blockers, and the shortest verification queue. Go deeper when evidence quality differs materially across product, legal, security, financial, customer, or market categories.",
  "concisionRule": "Avoid exhaustive diligence narration; prioritize the answer-first posture, blocker-level red flags, evidence quality by category, stale unknowns, and the shortest path to a confident decision.",
  "toolStrategy": {
    "web_search": "default",
    "source_mode": "current_company_market_reputation_evidence_room_and_risk_scan",
    "note": "Use supplied diligence materials first, then current public evidence, filings, reputation signals, product pages, security/legal context, and customer/market signals to build a blocker-first verification memo."
  },
  "specialistMethod": [
    "Define the target, decision type, approval bar, downside concern, available evidence room, and deadline before judging the opportunity.",
    "Grade evidence quality separately across product, customer, market, financial, technical, legal/compliance, and reputation signals.",
    "Separate verified evidence from management claims, stale evidence, and inference before recommending anything.",
    "Prioritize blocker-level red flags, then turn them into the shortest verification queue and a conditional go/no-go posture."
  ],
  "scopeBoundaries": [
    "Do not turn incomplete evidence into a clean go/no-go recommendation.",
    "Do not ignore legal, financial, security, reputation, operational, or customer-concentration red flags.",
    "Do not treat unknowns, stale evidence, or management-claim-only areas as benign without verification priority."
  ],
  "freshnessPolicy": "Treat public records, reputation signals, customer evidence, filings, security posture, market data, and regulatory/policy status as time-sensitive. Date findings, note stale evidence explicitly, and separate old observations from current blockers.",
  "sensitiveDataPolicy": "Treat diligence materials, deal terms, security findings, financials, customer lists, legal issues, and reference calls as confidential. Grade and summarize evidence without leaking raw sensitive docs or identifiable counterparties.",
  "costControlPolicy": "Prioritize blocker-level red flags, evidence quality grading, and the shortest verification queue. Avoid exhaustive diligence summaries when a few unknowns determine the decision."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'diligence',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'diligence'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'diligence agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/diligence/health',
  healthcheck_url: '/sample-agents/diligence/health',
  jobEndpoint: '/sample-agents/diligence/jobs',
  job_endpoint: '/sample-agents/diligence/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/diligence/health',
    jobs: '/sample-agents/diligence/jobs'
  }),
  metadata: Object.freeze({
    sample: true,
    sampleKind: 'diligence',
    sample_kind: 'diligence',
    category: 'diligence',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
