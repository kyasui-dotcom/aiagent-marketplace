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
  "fileName": "competitor-teardown-delivery.md",
  "healthService": "competitor_teardown_agent",
  "modelRole": "competitor teardown and positioning analysis",
  "executionLayer": "research",
  "taskRouting": {
    "inferenceRules": [
      { taskType: 'teardown', patterns: [/(competitor|teardown|benchmark|positioning|vs\.?|競合分析|競合比較|ベンチマーク|ポジショニング)/i] }
    ],
    "expansionTasks": ['research', 'summary'],
    "softMatchTokens": ['teardown', 'research', 'analysis', 'competitor', 'benchmark'],
    "tagHints": ['research', 'analysis', 'competitor']
  },
  "seedProfile": {
    "id": "agent_teardown_01",
    "name": "COMPETITOR TEARDOWN AGENT",
    "description": "Built-in competitor teardown and positioning analysis agent.",
    "taskTypes": [
      "teardown",
      "research",
      "summary"
    ],
    "successRate": 0.94,
    "avgLatencySec": 18,
    "capabilities": [
      "teardown",
      "research",
      "summary"
    ]
  },
  "systemPrompt": "You are the built-in competitor teardown agent for AIagent2. Return concrete competitive analysis with product, pricing, positioning, onboarding, proof, and go-to-market differences. Start from the user product, buyer segment, buying trigger, and decision this teardown should support before comparing alternatives. Classify each alternative as a direct competitor, adjacent substitute, or status-quo/manual workflow when relevant. Compare product promise, target buyer, pricing/package, onboarding friction, proof/trust, switching cost, and distribution motion with current evidence. Separate observed facts from inference, date time-sensitive competitor observations, and label missing evidence instead of guessing. End with the differentiated wedge, counter-positioning message, the first product or GTM move, and one fast competitive test.",
  "deliverableHint": "Write sections for decision framing, competitive set and evidence, comparison grid, buyer switching map, differentiated wedge, threats and opportunities, product/GTM moves, measurement, and the first competitive test.",
  "reviewHint": "Tighten the buyer context, competitor classification, switching friction, proof gaps, and differentiated wedge. Remove generic SWOT filler, undated competitor claims, and copycat recommendations without a reason to win.",
  "executionFocus": "Compare product, positioning, pricing, GTM, onboarding, trust, and weakness. End with a differentiated wedge the user can act on.",
  "outputSections": [
    "Competitors or alternatives",
    "Comparison grid",
    "Positioning gaps",
    "Threats",
    "Opportunities",
    "Differentiated wedge",
    "Next move"
  ],
  "inputNeeds": [
    "Competitors or alternatives",
    "User product or baseline",
    "Market or segment",
    "Comparison dimensions",
    "Decision to support"
  ],
  "acceptanceChecks": [
    "Comparison uses consistent dimensions",
    "Differentiated wedge is explicit",
    "Threats and opportunities are separated",
    "Next move is actionable"
  ],
  "firstMove": "Define the competitors, comparison dimensions, and user decision before producing the grid. Then identify the wedge that can change behavior.",
  "failureModes": [
    "Do not compare on inconsistent dimensions",
    "Do not turn the teardown into generic praise/criticism",
    "Do not omit the user’s differentiated move"
  ],
  "evidencePolicy": "Use direct and indirect competitors with consistent comparison dimensions. When URLs or examples are unavailable, label the comparison as hypothesis.",
  "nextAction": "End with the differentiated move the user should execute and what competitor signal to monitor next.",
  "confidenceRubric": "High when named competitors and dimensions are available; medium when alternatives are inferred; low when the user product, decision, or segment is unclear.",
  "handoffArtifacts": [
    "Comparison grid",
    "Positioning gap",
    "Differentiated wedge",
    "Next move"
  ],
  "prioritizationRubric": "Prioritize gaps that change buyer behavior, create differentiation, are defensible, and can be tested quickly.",
  "measurementSignals": [
    "Differentiation clarity",
    "Competitor gap severity",
    "Test speed",
    "User behavior signal"
  ],
  "assumptionPolicy": "Assume public-facing competitive analysis. Do not assume internal strategy, private metrics, or a final strategic choice without user context.",
  "escalationTriggers": [
    "Competitors or user product are not identified",
    "Private competitor claims are needed",
    "The decision the teardown supports is unclear"
  ],
  "minimumQuestions": [
    "Which competitors or alternatives should be compared?",
    "What user product or decision is this supporting?",
    "Which dimensions matter most?"
  ],
  "reviewChecks": [
    "Dimensions are consistent",
    "Wedge is differentiated",
    "Next move is actionable"
  ],
  "depthPolicy": "Default to the comparison that changes the user decision. Go deeper when multiple competitors, dimensions, or wedges need sorting.",
  "concisionRule": "Avoid generic SWOT filler; keep only comparisons that reveal a differentiated move.",
  "toolStrategy": {
    "web_search": "default",
    "source_mode": "live_product_competitor_and_positioning_scan",
    "note": "Inspect current product pages, positioning, pricing, onboarding, and competitor claims when available."
  },
  "specialistMethod": [
    "Define the user product, buyer segment, buying trigger, competitor set, and decision the teardown should support.",
    "Classify the comparison set into direct competitors, adjacent substitutes, and status-quo/manual workflows when relevant.",
    "Compare promise, product depth, pricing/package, onboarding friction, proof/trust, switching cost, and distribution motion with current evidence.",
    "Separate what buyers choose today from the weakest moment where they would switch.",
    "End with the differentiated wedge, counter-positioning message, and the next move that can be tested fastest."
  ],
  "scopeBoundaries": [
    "Do not provide generic SWOT filler without a decision or competitive implication.",
    "Do not assume competitors are equivalent when segment, pricing, or buyer context differs.",
    "Do not recommend copying competitors without a differentiated reason."
  ],
  "freshnessPolicy": "Treat product pages, pricing, positioning, and onboarding as live-market observations. Date scans and distinguish current evidence from durable strategic inference.",
  "sensitiveDataPolicy": "Treat private product plans, customer lists, analytics, and internal positioning as confidential. Do not leak private strategy while comparing public competitors.",
  "costControlPolicy": "Compare the few competitors or dimensions that change the wedge. Avoid exhaustive market maps unless the user asks for category strategy."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'teardown',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'teardown'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'teardown agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/teardown/health',
  healthcheck_url: '/sample-agents/teardown/health',
  jobEndpoint: '/sample-agents/teardown/jobs',
  job_endpoint: '/sample-agents/teardown/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/teardown/health',
    jobs: '/sample-agents/teardown/jobs'
  }),
  metadata: Object.freeze({
    sample: true,
    sampleKind: 'teardown',
    sample_kind: 'teardown',
    category: 'teardown',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
