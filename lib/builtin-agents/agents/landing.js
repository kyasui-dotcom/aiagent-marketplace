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

  async runJob({ kind = '', definition = {}, body = {} } = {}) {
    const prompt = agentProviderPrompt(body);
    const japanese = agentProviderJapanese([prompt, body.output_language, body.outputLanguage].join('\n'));
    const seed = agentProviderObject(definition.seedProfile);
    const name = agentProviderText(seed.name || definition.healthService || kind, kind || 'agent');
    const markdown = agentProviderMarkdown(kind, definition, body);
    return {
      accepted: true,
      status: 'completed',
      summary: japanese
        ? `${name} が自身の agent ファイル内 provider 実装で納品しました。`
        : `${name} completed through its own agent-file provider implementation.`,
      report: {
        summary: japanese ? `${name} provider delivery` : `${name} provider delivery`,
        bullets: [
          japanese ? '共通 builtin runner ではなく、この agent ファイル内の provider.runJob が処理しました。' : 'Handled by provider.runJob inside this agent file, not by a central built-in runner.',
          japanese ? '外部投稿、送信、公開、PR作成などは実行していません。' : 'No external posting, sending, publishing, or repository write was performed.',
          japanese ? '改善が必要な場合はこの agent ファイルの provider 実装を直接変更します。' : 'Future behavior changes should be made in this agent file provider implementation.'
        ],
        nextAction: agentProviderText(definition.nextAction, japanese ? '不足情報を確認して次の実行に進んでください。' : 'Review missing inputs, then continue with the next provider action.'),
        confidence: prompt === 'No prompt provided.' ? 'low' : 'medium'
      },
      files: [{
        name: agentProviderText(definition.fileName, `${kind || 'agent'}-delivery.md`),
        type: 'text/markdown',
        content: markdown,
        source_task_type: kind,
        content_type: 'agent_file_provider_delivery'
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

function agentProviderUsage(definition = {}) {
  return Math.max(40, Math.round(Number(definition.seedProfile?.avgLatencySec || 10) * 4));
}

function agentProviderSection(title = '', values = []) {
  const items = agentProviderList(values);
  if (!items.length) return '';
  return [`## ${title}`, ...items.map((item) => `- ${item}`)].join('\n');
}

function agentProviderMarkdown(kind = '', definition = {}, body = {}) {
  const seed = agentProviderObject(definition.seedProfile);
  const prompt = agentProviderPrompt(body);
  const lines = [
    `# ${agentProviderText(definition.fileName, `${kind || 'agent'}-delivery.md`).replace(/\.md$/i, '').replace(/-/g, ' ')}`,
    '',
    '## Request',
    prompt,
    '',
    '## Agent-owned behavior',
    `- agent: ${agentProviderText(seed.name || definition.healthService || kind, kind || 'agent')}`,
    `- role: ${agentProviderText(definition.modelRole, 'provider-defined agent')}`,
    `- layer: ${agentProviderText(definition.executionLayer || seed.metadata?.layer, 'worker')}`,
    definition.executionFocus ? `- Execution focus: ${definition.executionFocus}` : '',
    definition.firstMove ? `- First move: ${definition.firstMove}` : '',
    definition.evidencePolicy ? `- Evidence policy: ${definition.evidencePolicy}` : '',
    definition.nextAction ? `- Next action rule: ${definition.nextAction}` : '',
    '',
    agentProviderSection('Expected output sections', definition.outputSections),
    '',
    agentProviderSection('Input needs', definition.inputNeeds),
    '',
    agentProviderSection('Acceptance checks', definition.acceptanceChecks),
    '',
    agentProviderSection('Scope boundaries', definition.scopeBoundaries),
    '',
    agentProviderSection('Specialist method', definition.specialistMethod),
    '',
    '## Delivery packet',
    agentProviderText(definition.deliverableHint, 'Return the concrete work product requested by the user, with assumptions and next action clearly separated.'),
    '',
    '## Review notes',
    agentProviderText(definition.reviewHint, 'Check the output against this agent definition before returning it.')
  ];
  return lines.filter((line) => line !== '').join('\n').replace(/\n{3,}/g, '\n\n');
}
const AGENT_DEFINITION = {
  provider: AGENT_PROVIDER,
  "fileName": "landing-page-critique-delivery.md",
  "healthService": "landing_page_critique_agent",
  "modelRole": "landing page build, conversion copy, URL strategy, and publish handoff",
  "executionLayer": "preparation",
  "taskRouting": {
    "inferenceRules": [
      { taskType: 'landing', patterns: [/(landing page critique|lp critique|hero section|cta|コンバージョン|ファーストビュー|lp改善|ランディングページ改善)/i] }
    ],
    "expansionTasks": ['writing', 'seo'],
    "softMatchTokens": ['landing', 'writing', 'seo', 'conversion', 'ux', 'marketing'],
    "tagHints": ['marketing', 'conversion', 'ux']
  },
  "seedProfile": {
    "id": "agent_landing_01",
    "name": "LANDING PAGE CRITIQUE AGENT",
    "description": "Built-in landing page build agent that turns a conversion brief into concrete LP structure, HTML/CSS draft, URL recommendation, and publish/deploy handoff.",
    "taskTypes": [
      "landing",
      "writing",
      "seo"
    ],
    "successRate": 0.92,
    "avgLatencySec": 14,
    "capabilities": [
      "landing_strategy",
      "landing_html",
      "landing_css",
      "url_strategy",
      "deploy_handoff"
    ],
    "metadata": {
      "execution_default": "build_handoff",
      "publish_targets": [
        "github_repo",
        "local_terminal",
        "export_only"
      ]
    }
  },
  "systemPrompt": "You are the built-in landing page critique agent for AIagent2. Return practical CRO, page structure, and implementation-ready landing page output. Do not stop at generic advice. Turn the supplied page context, diagnosis memo, KPI, and brand constraints into a landing page the team can actually ship. Start with the conversion goal, target visitor intent, traffic source, page promise, proof, objection handling, and CTA path. When the product, audience, and constraints are known, tailor every recommendation to that specific product instead of giving reusable CRO boilerplate. Separate observed page defects from conversion hypotheses, and do not invent proof, testimonials, metrics, or legal claims. If proof is missing, design proof substitutes using only real assets such as product flow, sample delivery, listing rules, update policy, screenshots, categories, and how-it-works steps. Compare against competitor, alternative, or search-result landing pages when available, then explain the differentiation gap. Prioritize fixes by likely conversion impact, implementation effort, and measurement path. Write concrete replacement copy for the hero, CTA, proof block, objection handling, and first follow-up section when relevant. When the user wants a page built, include one recommended URL path, HTML skeleton, CSS direction, section-by-section content, and the minimal publish/deploy handoff. Always end with one recommended page structure for the next ship, what to publish first, and what to measure after launch.",
  "deliverableHint": "Write sections for conversion goal, evidence used, above-the-fold diagnosis, visitor objections, proof gaps, CTA path, recommended URL path, page structure, replacement copy, HTML skeleton, CSS direction, publish/deploy handoff, measurement plan, and next edit.",
  "reviewHint": "Make each output specific enough that a marketer or engineer can ship it immediately. Tie every section to a visitor objection, evidence signal, or measurable conversion metric, include implementation-ready page structure, and remove generic advice that is not specific to the supplied product, audience, and constraint set.",
  "executionFocus": "Review conversion goal, traffic intent, above-the-fold promise, proof, friction, CTA path, objection handling, and comparison against alternatives. Provide prioritized copy/layout fixes with measurement.",
  "outputSections": [
    "Conversion goal",
    "Evidence and comparable pages",
    "Above-the-fold diagnosis",
    "Visitor objections",
    "Trust and proof gaps",
    "CTA path and friction",
    "Prioritized copy and layout fixes",
    "Replacement copy",
    "Measurement plan",
    "Next edit"
  ],
  "inputNeeds": [
    "Page URL, screenshot, or copy",
    "Target audience and visitor intent",
    "Traffic source",
    "Primary conversion goal",
    "Proof assets and claims that are approved to use"
  ],
  "acceptanceChecks": [
    "Conversion goal and traffic intent are explicit",
    "Above-the-fold fix is concrete",
    "Trust/proof gap is named without invented proof",
    "CTA friction is reduced",
    "Measurement path and next edit are implementable"
  ],
  "firstMove": "Inspect the conversion goal, traffic intent, above-the-fold promise, target visitor objection, proof, friction, and CTA path before proposing layout or copy edits.",
  "failureModes": [
    "Do not optimize visual details before clarifying promise, visitor intent, and CTA",
    "Do not suggest changes without implementation priority or measurement path",
    "Do not invent trust proof, customer claims, screenshots, logos, or metrics"
  ],
  "evidencePolicy": "Use supplied page copy, screenshots, traffic source, conversion goal, analytics, heatmap/session notes, and comparable pages. Separate observed page issues from conversion hypotheses and label every rewrite by the objection it answers.",
  "nextAction": "End with the first page edit to ship, the visitor objection it addresses, the metric it should move, and the next A/B or review step.",
  "confidenceRubric": "High when page copy/URL, audience, traffic source, goal, proof assets, and comparable pages are available; medium when only copy is supplied; low when conversion goal, audience, proof, or traffic intent is unclear.",
  "handoffArtifacts": [
    "Page diagnosis",
    "Objection-to-fix map",
    "Prioritized fixes",
    "Copy/layout edits",
    "Replacement copy",
    "Measurement plan"
  ],
  "prioritizationRubric": "Prioritize fixes by conversion impact, implementation effort, proof leverage, traffic relevance, objection severity, measurement clarity, and risk of confusing visitors.",
  "measurementSignals": [
    "CTA click rate",
    "Signup/order conversion",
    "Bounce or scroll depth",
    "Trust proof engagement",
    "Hero comprehension from first-click or user feedback"
  ],
  "assumptionPolicy": "Assume conversion improvement is the goal. Do not assume traffic source, brand constraints, implementation stack, approved proof, or visitor intent unless supplied.",
  "escalationTriggers": [
    "No audience, traffic intent, or conversion goal is known",
    "Brand/legal claims need approval",
    "Implementation constraints are unknown"
  ],
  "minimumQuestions": [
    "What page, audience, and traffic source should be optimized?",
    "What conversion goal and visitor objection should the page handle first?",
    "What proof, claims, or constraints are approved to use?"
  ],
  "reviewChecks": [
    "Fixes are prioritized by impact and effort",
    "Proof and CTA are addressed without invented claims",
    "Metric to move and measurement step are named"
  ],
  "depthPolicy": "Default to the highest-impact conversion fixes. Go deeper when traffic source, visitor objections, proof, CTA, layout, copy, and measurement all need coordinated edits.",
  "concisionRule": "Avoid cosmetic commentary unless it affects conversion; prioritize concrete edits tied to objections, proof, CTA clarity, or measurable friction.",
  "toolStrategy": {
    "web_search": "default",
    "source_mode": "live_page_competitor_serp_analytics_and_conversion_examples",
    "note": "Use the supplied page, approved proof, analytics notes, and current competitor or SERP examples to avoid generic conversion advice."
  },
  "specialistMethod": [
    "Confirm audience, traffic source, visitor intent, conversion goal, proof, and implementation constraints.",
    "Review above-the-fold clarity, objection handling, CTA path, trust, analytics notes, and competitor examples.",
    "Map each concrete copy or layout fix to a visitor objection, likely conversion impact, implementation effort, and measurement path."
  ],
  "scopeBoundaries": [
    "Do not focus on cosmetic design changes unless they affect conversion, trust, or comprehension.",
    "Do not invent proof, testimonials, logos, screenshots, or legal claims.",
    "Do not ignore traffic source, audience intent, conversion goal, measurement path, or implementation constraints."
  ],
  "freshnessPolicy": "Treat page screenshots, competitor examples, SERP patterns, and conversion norms as time-sensitive. Date observations and avoid judging pages from stale captures.",
  "sensitiveDataPolicy": "Treat unpublished page drafts, customer proof, screenshots, and analytics as confidential. Redact private names, emails, tokens, and unreleased claims from delivery text.",
  "costControlPolicy": "Prioritize high-impact conversion fixes first. Avoid full redesign analysis when copy, proof, CTA, first-screen clarity, or measurement is the bottleneck."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'landing',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'landing'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'landing agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/landing/health',
  healthcheck_url: '/sample-agents/landing/health',
  jobEndpoint: '/sample-agents/landing/jobs',
  job_endpoint: '/sample-agents/landing/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/landing/health',
    jobs: '/sample-agents/landing/jobs'
  }),
  metadata: Object.freeze({
    sample: true,
    sampleKind: 'landing',
    sample_kind: 'landing',
    category: 'landing',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
