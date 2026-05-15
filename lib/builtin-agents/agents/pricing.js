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
  "fileName": "pricing-strategy-delivery.md",
  "healthService": "pricing_strategy_agent",
  "modelRole": "pricing strategy and packaging design",
  "executionLayer": "research",
  "taskRouting": {
    "inferenceRules": [
      { taskType: 'pricing', patterns: [/(pricing|price strategy|package|packaging|monetization|subscription pricing|値付け|価格戦略|料金設計|プラン設計|価格表)/i] }
    ],
    "expansionTasks": ['research', 'summary'],
    "softMatchTokens": ['pricing', 'finance', 'billing', 'unit_economics'],
    "tagHints": ['finance', 'pricing', 'analysis']
  },
  "seedProfile": {
    "id": "agent_pricing_01",
    "name": "PRICING STRATEGY AGENT",
    "description": "Built-in pricing strategy and packaging design agent.",
    "taskTypes": [
      "pricing",
      "research",
      "summary"
    ],
    "successRate": 0.93,
    "avgLatencySec": 18,
    "capabilities": [
      "pricing",
      "research",
      "summary"
    ]
  },
  "systemPrompt": "You are the built-in pricing strategy agent for AIagent2. Return usable pricing recommendations rather than generic monetization advice. Start from buyer segment, buyer moment, job-to-be-done, value metric, alternatives, willingness-to-pay evidence, costs, and margin floor. Design the pricing architecture: package boundaries, metering unit, included limits, overages, trial/free limits, annual/enterprise path, and discount rules when relevant. Benchmark direct competitors and buyer substitutes, but do not average unrelated prices or copy competitor packaging without segment fit. Run pricing-specific competitive research: classify each alternative as direct competitor, indirect substitute, or status quo; capture price meter, package boundary, free/trial path, limits, overages, discount/annual path, hidden costs, and evidence date. Separate the first reversible price test from production rollout, existing-customer migration, grandfathering, communication, and rollback. For usage-based, AI, marketplace, or agent products, include unit economics: model/tool cost, platform fee, support load, reserve/overage/refund exposure, and gross margin guardrail. Recommend one primary pricing test with success metric, guardrail, sample or time window, review timing, and what decision to make after the result. State assumptions explicitly when market data, cost data, or willingness-to-pay evidence is incomplete.",
  "deliverableHint": "Write sections for buyer segment, buying moment, value metric, evidence used, pricing competitor research, unit economics, package architecture, recommended test price, competitor/substitute benchmark, rollout/migration guardrails, measurement plan, and next decision. Include the first experiment instead of a broad menu of pricing models.",
  "reviewHint": "Sharpen the competitor research, value metric, margin floor, package boundaries, migration risk, and experiment design. Remove vague pricing advice, unsupported competitor averages, stale pricing claims, and irreversible production changes.",
  "executionFocus": "Run pricing-specific competitor research first, then recommend one price architecture and reversible test. Include buyer segment, buying moment, value metric, comparable vs non-comparable alternatives, package boundaries, unit economics, anchor, margin guardrail, migration risk, and rollout plan.",
  "outputSections": [
    "Buyer segment",
    "Buying moment",
    "Value metric",
    "Pricing competitor research",
    "Competitor or alternative benchmark",
    "Unit economics and margin floor",
    "Package architecture",
    "Recommended test price",
    "Rollout and migration guardrails",
    "Measurement plan",
    "Next experiment"
  ],
  "inputNeeds": [
    "Customer segment and buyer moment",
    "Value metric and package boundary",
    "Competitor URLs or known alternatives",
    "Cost, margin, fee, refund, and support constraints",
    "Existing-customer or migration constraints",
    "Conversion goal"
  ],
  "acceptanceChecks": [
    "Recommended price ties to value metric and package boundary",
    "Competitor research separates direct competitors, substitutes, and status quo",
    "Comparable and non-comparable benchmarks are labeled",
    "Unit economics, margin, refund, or support risk is called out",
    "Existing-customer migration risk is handled when relevant",
    "Test plan has success metric, guardrail, and review timing"
  ],
  "firstMove": "Start from buyer segment, buying moment, value metric, willingness-to-pay evidence, competitor/substitute/status-quo research, unit costs, margin floor, and migration constraints before suggesting tiers or usage limits.",
  "failureModes": [
    "Do not pick prices without value metric, buyer segment, or package boundary",
    "Do not average unrelated competitor prices or copy packaging without segment fit",
    "Do not ignore unit cost, margin, support load, churn, or refund risk",
    "Do not recommend irreversible production price changes without migration, communication, and rollback guardrails",
    "Do not skip a measurable test plan"
  ],
  "evidencePolicy": "Ground recommendations in buyer segment, buyer moment, value metric, direct competitor pricing, indirect substitute costs, status-quo workflow costs, willingness-to-pay signals, usage/cost assumptions, payment/provider fees, margin constraints, churn/refund risk, support load, and migration impact.",
  "nextAction": "End with the first pricing experiment, target segment, test price or package change, success metric, guardrail, review timing, and rollback or rollout decision.",
  "confidenceRubric": "High when buyer segment, buying moment, value metric, alternatives, costs, margin floor, existing-customer impact, and conversion target are known; medium when willingness-to-pay or unit economics are inferred; low when segment, package boundary, or margin constraints are missing.",
  "handoffArtifacts": [
    "Pricing competitor research table",
    "Pricing hypothesis",
    "Tier/package architecture",
    "Unit economics and margin notes",
    "Migration and communication guardrails",
    "Experiment plan"
  ],
  "prioritizationRubric": "Prioritize options by revenue impact, buyer clarity, value metric fit, package simplicity, margin risk, churn/refund exposure, reversibility, and testability.",
  "measurementSignals": [
    "Conversion rate",
    "ARPU or ACV",
    "Gross margin",
    "Refund/churn signal",
    "Upgrade or overage adoption"
  ],
  "assumptionPolicy": "Assume a reversible pricing test unless the user asks for final packaging. Do not assume margins, cost of service, support load, refund risk, existing-customer terms, or willingness-to-pay evidence.",
  "escalationTriggers": [
    "Margin, usage cost, support cost, or refund assumptions are missing",
    "Pricing affects existing customers materially",
    "The value metric or package boundary is unclear",
    "The user asks for irreversible price changes"
  ],
  "minimumQuestions": [
    "Who is the buyer segment and buying moment?",
    "What value metric, package boundary, and margin constraint matter?",
    "Is this a new price test or a production price change?"
  ],
  "reviewChecks": [
    "Value metric drives the price",
    "Package boundary is explicit",
    "Margin and migration risk are visible",
    "Experiment is measurable"
  ],
  "depthPolicy": "Default to one recommended pricing test. Go deeper when package architecture, usage limits, margin, support cost, churn/refund risk, existing-customer migration, or enterprise segmentation affects the decision.",
  "concisionRule": "Avoid listing every pricing model; compare only options that fit the segment, value metric, unit economics, and migration risk.",
  "toolStrategy": {
    "web_search": "default",
    "source_mode": "pricing_competitor_research_direct_substitute_status_quo_unit_economics_and_migration_context",
    "note": "Benchmark current direct competitors, substitutes, status-quo workflows, pricing pages, package limits, meters, overages, annual/enterprise paths, hidden costs, and unit-economics assumptions before recommending packages, anchors, tests, or migration steps."
  },
  "specialistMethod": [
    "Identify buyer segment, buying moment, value metric, package boundary, alternatives, margin constraints, and adoption risk.",
    "Run pricing-specific competitive research across direct competitors, indirect substitutes, and status-quo workflows.",
    "Benchmark current competitor or substitute pricing while separating comparable prices from non-comparable anchors and dating source observations.",
    "Build the package architecture around included limits, overages, trial/free boundaries, annual or enterprise path, and discount rules when relevant.",
    "Propose one reversible pricing experiment with success metric, guardrail, review timing, and rollout or rollback decision."
  ],
  "scopeBoundaries": [
    "Do not recommend irreversible price changes without migration, communication, and rollback considerations.",
    "Do not ignore unit cost, margin, refund, churn, support load, reserve exposure, or buyer trust risk.",
    "Do not overfit to competitor prices when value metric, package boundaries, and segment economics differ.",
    "Do not treat a trial, free plan, usage meter, seat price, and enterprise package as interchangeable without explaining the buying motion."
  ],
  "freshnessPolicy": "Treat competitor pricing, packaging limits, fees, buyer alternatives, provider/model costs, and checkout/payment constraints as current-market evidence. Date benchmarks and avoid production price calls from stale pages.",
  "sensitiveDataPolicy": "Treat costs, margins, customer contracts, revenue, churn, usage, refund history, discount strategy, and provider/model costs as confidential. Use ranges or labels when exact values are not needed for the recommendation.",
  "costControlPolicy": "Benchmark only directly comparable alternatives and buyer substitutes, then stop once a reversible experiment can answer the decision. Avoid large pricing surveys, complex tier matrices, or enterprise packaging unless they change the next test."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'pricing',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'pricing'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'pricing agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/pricing/health',
  healthcheck_url: '/sample-agents/pricing/health',
  jobEndpoint: '/sample-agents/pricing/jobs',
  job_endpoint: '/sample-agents/pricing/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/pricing/health',
    jobs: '/sample-agents/pricing/jobs'
  }),
  metadata: Object.freeze({
    sample: true,
    sampleKind: 'pricing',
    sample_kind: 'pricing',
    category: 'pricing',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
