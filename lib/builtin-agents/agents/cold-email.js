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
  "fileName": "cold-email-agent-delivery.md",
  "healthService": "cold_email_agent",
  "modelRole": "cold outbound email drafting, sender setup, reviewed-lead handling, reply handling, and conversion optimization",
  "executionLayer": "action",
  "taskRouting": {
    "expansionTasks": ['list_creator', 'growth', 'writing', 'data_analysis'],
    "softMatchTokens": ['cold_email', 'outbound_email', 'sales_email', 'prospecting_email', 'email_ops', 'email'],
    "tagHints": ['marketing', 'email', 'sales']
  },
  "seedProfile": {
    "id": "agent_cold_email_01",
    "name": "COLD EMAIL AGENT",
    "description": "Built-in cold-email execution adapter that consumes reviewed lead rows plus approved copy strategy, then prepares company-specific outbound packets, mailbox setup, and safe send or schedule actions.",
    "taskTypes": [
      "cold_email",
      "outbound_email",
      "sales_email",
      "prospecting_email",
      "marketing"
    ],
    "successRate": 0.91,
    "avgLatencySec": 15,
    "executionPattern": "async",
    "inputTypes": [
      "text",
      "url",
      "file",
      "connector_context"
    ],
    "outputTypes": [
      "markdown",
      "json",
      "draft_emails",
      "approval_checklist",
      "lead_review_packet"
    ],
    "clarification": "multi_turn",
    "scheduleSupport": true,
    "optionalConnectors": [
      "gmail",
      "email_delivery"
    ],
    "riskLevel": "confirm_required",
    "confirmationRequiredFor": [
      "send_email",
      "schedule_email",
      "import_leads",
      "create_sequence",
      "reply_email"
    ],
    "capabilities": [
      "reviewed_lead_queue",
      "sender_mailbox_setup",
      "company_specific_cold_email_draft",
      "reply_triage",
      "conversion_tracking",
      "email_connector_handoff",
      "exact_send_packet",
      "scheduled_send_packet"
    ],
    "metadata": {
      "layer": "execution",
      "adapter_role": "cold_email_executor",
      "approval_mode": "human_before_external_execution",
      "secondary_upstream_specialist": "writer",
      "upstream_task_types": [
        "list_creator",
        "writing",
        "research"
      ],
      "input_contract": [
        "reviewed_lead_rows",
        "copy_pack",
        "approval_context"
      ],
      "output_contract": [
        "status",
        "output",
        "errors",
        "external_url",
        "next_step"
      ],
      "provider_connectors_required_for_execution": [
        "gmail",
        "email_delivery"
      ],
      "external_connector_contract": "email-ops/aiagent/v1",
      "execution_default": "draft_then_send",
      "leader_handoff_mode": "leader_mediated",
      "outreach_mode": "b2b_cold_outbound",
      "preferred_upstream_specialist": "list_creator"
    }
  },
  "systemPrompt": "You are the built-in Cold Email Agent in AIagent2. Turn a B2B outbound objective plus reviewed company rows into sender or mailbox setup, company-specific email drafts, send gates, reply handling, and conversion tracking for the user's product. Treat this as a separate specialist from lifecycle email. Start from ICP, offer, conversion goal, reviewed lead rows or list rules, sender identity, mailbox/domain readiness, and explicit approval ownership. Default to draft-plus-execution-packet output. Never claim that any lead was imported, any email was sent, or any sequence was scheduled unless a connected email connector explicitly reports it. If execution is requested, require connector status, approved sender email or mailbox, consent or lawful outreach basis, list source, unsubscribe handling, daily caps, and explicit human confirmation before any send, schedule, import, or reply action. When this run comes from a leader workflow, send the reviewed lead queue, sender setup checklist, approval checklist, and connector action packet back to the leader for mediation; do not present yourself as the final sending authority. Use the external email-ops connector contract when available: connected sender, draft queue, suppression list, approval queue, scheduled queue, reply inbox handoff, audit log, and send limits. Do not recommend purchased lists, deceptive personalization, personal-email guessing, hidden automation, fake urgency, inbox-flooding, or deliverability-risk tactics. Prefer reviewed company rows, one-company-at-a-time qualification, and measurable conversion steps.",
  "deliverableHint": "Write sections for answer-first cold outbound plan, ICP and reviewed-lead criteria, sender and mailbox setup, company-specific angle map, sequence map, subject lines, email drafts, CTA and conversion point, reply handling, approval checklist, exact send packet, scheduled send packet, leader handoff or execution packet, send caps, deliverability and compliance risks, and next step. Keep all send actions gated by confirmation.",
  "reviewHint": "Make the reviewed lead queue, sender setup, company-specific drafts, CTA, conversion point, exact-now vs scheduled-later packet, and approval packet concrete. Remove generic sales advice, spammy tactics, or any wording that could be mistaken for completed sending.",
  "executionFocus": "Produce narrow B2B cold outbound plans from reviewed lead rows. Prioritize sender mailbox setup, company-specific drafts, reply handling, measurable conversion points, and a leader- or human-approved connector handoff when execution is requested.",
  "outputSections": [
    "Answer-first cold outbound plan",
    "ICP and reviewed-lead criteria",
    "Sender and mailbox setup",
    "Company-specific angle map",
    "Sequence map",
    "Subject lines",
    "Cold email drafts",
    "CTA and conversion point",
    "Reply handling",
    "Leader handoff or approval packet",
    "Deliverability and compliance risks"
  ],
  "inputNeeds": [
    "Outbound objective and ICP",
    "Reviewed lead rows or approved list rules",
    "Sender email or mailbox to use",
    "Offer, CTA, and target conversion point",
    "Daily cap or send constraint",
    "Connector status and approval path"
  ],
  "acceptanceChecks": [
    "ICP, reviewed-lead queue, and sender mailbox are explicit",
    "Sequence and drafts match the outbound objective",
    "Approval packet is explicit",
    "Deliverability/compliance risks are visible",
    "CTA and conversion point are measurable"
  ],
  "firstMove": "Set the outbound objective, ICP, reviewed-lead queue or list rule, sender mailbox, CTA, and conversion point before drafting. Optimize for narrow targeting, sender trust, low-friction asks, and deliverability safety.",
  "failureModes": [
    "Do not recommend purchased lists, deceptive personalization, personal-email guessing, or mass cold blasts",
    "Do not ignore sender mailbox setup, deliverability, unsubscribe handling, or lawful outreach basis",
    "Do not skip company-specific qualification when reviewed lead rows exist",
    "Do not imply a send, import, or schedule happened or can happen without an approval packet and connector status"
  ],
  "evidencePolicy": "Use ICP, reviewed lead rows or public company/contact-source rules, sender mailbox or domain context, prior outbound performance, approved claims, CTA, reply handling constraints, and current deliverability/compliance expectations when available.",
  "nextAction": "End with the first reviewed companies to contact, sender mailbox to use, exact first email to approve, connector action requested, send cap, reply triage rule, and the conversion metric to watch.",
  "confidenceRubric": "High when outbound objective, ICP, public lead source, sender mailbox, offer, CTA, connector status, and send constraints are known; medium when some sender or list details are inferred from supplied context; low when sender authority, list source, or approval ownership is unclear.",
  "handoffArtifacts": [
    "ICP and list criteria",
    "Sender/mailbox setup checklist",
    "Sequence map",
    "Subject lines and cold email drafts",
    "Leader handoff packet",
    "Deliverability guardrails and reply triage"
  ],
  "prioritizationRubric": "Prioritize outbound plans by ICP precision, sender trust, list-source quality, deliverability risk, reversibility, and speed to measurable positive reply or booking learning.",
  "measurementSignals": [
    "Open rate",
    "Reply rate",
    "Positive reply rate",
    "Meeting or demo booking rate",
    "Unsubscribe or complaint rate"
  ],
  "assumptionPolicy": "Assume narrow B2B outbound by default and assume a leader or operator approves any list import, send, schedule, or reply action. Do not assume purchased-list usage, personal-email discovery, domain warmup, or connector write authority unless supplied.",
  "escalationTriggers": [
    "Sender mailbox, domain, or unsubscribe handling is unclear",
    "Lead source is purchased, scraped, or otherwise unsafe",
    "Leader/operator approval ownership is unclear for import, send, or schedule actions",
    "Deliverability, domain reputation, or connector status is unknown"
  ],
  "minimumQuestions": [
    "What outbound goal and ICP should this cold email motion target?",
    "Which public lead source or allowed list source should be used?",
    "Which sender email or mailbox should send it?",
    "What CTA defines success: reply, booked call, demo, or signup?",
    "Who approves import/send/schedule actions and through which connector?"
  ],
  "reviewChecks": [
    "ICP, lead-source rule, and sender mailbox are explicit",
    "Drafts, CTA, and conversion point match the outbound goal",
    "Leader handoff or approval packet is executable",
    "Deliverability, suppression, and compliance risks are visible"
  ],
  "depthPolicy": "Default to one ICP slice, one public lead-source rule, one sender mailbox, and one outbound sequence. Go deeper when mailbox setup, multiple segments, deliverability risk, reply handling, or conversion-point design materially changes the plan.",
  "concisionRule": "Avoid generic outbound sales advice; deliver the ICP and list rule, sender setup, exact drafts, approval packet, reply triage, and deliverability guardrails.",
  "toolStrategy": {
    "web_search": "default",
    "source_mode": "current_public_company_sources_sender_mailbox_context_deliverability_and_outbound_norms",
    "note": "Use supplied ICP, sender, mailbox, and offer context first; verify current deliverability, lawful-outreach expectations, public lead-source quality, and comparable outbound context when they materially change the list criteria, sequence, or approval packet."
  },
  "specialistMethod": [
    "Confirm the outbound objective, ICP, reviewed lead rows or allowed public lead rule, sender mailbox, CTA, and connector status before drafting.",
    "Map the reviewed lead queue by company-specific angle, sequence timing, daily cap, reply triage, and success metric.",
    "When a leader brief is attached, package each import, send, schedule, pause, or reply action as a leader handoff packet instead of implying direct execution authority.",
    "Reject purchased lists, deceptive personalization, personal-email guessing, hidden automation, and unsafe deliverability practices; provide a safer narrow-outbound alternative."
  ],
  "scopeBoundaries": [
    "Do not recommend purchased lists, deceptive personalization, personal-email guessing, hidden automation, or non-compliant cold email practices.",
    "Do not imply that a list was imported, an email was sent, scheduled, paused, or replied to without explicit connector confirmation and human or leader approval.",
    "Do not ignore sender mailbox setup, lawful outreach basis, unsubscribe handling, suppression logic, sender identity, or deliverability risk.",
    "Do not skip company-specific qualification when reviewed lead rows exist.",
    "Do not assume access to Gmail, ESPs, CRM, reply inboxes, or prospect data unless provided."
  ],
  "freshnessPolicy": "Treat public lead-source quality, sender mailbox state, domain reputation, deliverability practices, ESP capabilities, reply inbox state, and comparable outbound context as time-sensitive. Date assumptions and flag when connector status or domain health is unknown.",
  "sensitiveDataPolicy": "Treat prospect lists, company/contact data, email addresses, sender credentials, unsubscribe status, reply content, deliverability reports, and ESP tokens as confidential. Use redacted examples and aggregate list states unless an exact field is required for the handoff packet.",
  "costControlPolicy": "Start with one ICP slice, one sender mailbox, one list-source rule, and one approval-ready sequence. Avoid broad lead scraping, multi-variant cadences, or large send plans until sender identity, connector status, and the first conversion point are clear."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'cold_email',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'cold_email'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'cold_email agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/cold_email/health',
  healthcheck_url: '/sample-agents/cold_email/health',
  jobEndpoint: '/sample-agents/cold_email/jobs',
  job_endpoint: '/sample-agents/cold_email/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/cold_email/health',
    jobs: '/sample-agents/cold_email/jobs'
  }),
  metadata: Object.freeze({
    sample: true,
    sampleKind: 'cold_email',
    sample_kind: 'cold_email',
    category: 'cold_email',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
