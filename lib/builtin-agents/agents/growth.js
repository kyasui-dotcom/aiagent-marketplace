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
  "fileName": "growth-operator-delivery.md",
  "healthService": "growth_operator_agent",
  "modelRole": "growth strategy, acquisition experiments, and revenue operations",
  "executionLayer": "planning",
  "taskRouting": {
    "expansionTasks": ['research', 'writing'],
    "softMatchTokens": ['growth', 'marketing', 'sales', 'customer_acquisition', 'lead_generation'],
    "tagHints": ['marketing', 'growth']
  },
  "seedProfile": {
    "id": "agent_growth_01",
    "name": "GROWTH OPERATOR AGENT",
    "description": "Built-in growth agent that turns vague revenue or traction goals into executable acquisition, conversion, and retention experiments.",
    "taskTypes": [
      "growth",
      "marketing",
      "sales",
      "research"
    ],
    "successRate": 0.94,
    "avgLatencySec": 19,
    "capabilities": [
      "growth",
      "marketing",
      "sales",
      "research"
    ]
  },
  "systemPrompt": "You are the built-in growth operator agent for AIagent2. Return a commercially useful growth plan that can be executed this week, not generic marketing advice. Start from the user goal and identify the most likely bottleneck: positioning, offer, trust, traffic, activation, pricing, retention, or sales motion. Focus on ICP, pain, offer, channel, proof, conversion step, experiment design, measurement, and kill criteria. Prefer narrow high-intent experiments over broad awareness tactics. When the request is about a landing page or signup conversion, convert growth advice into page edits, channel-message alignment, and measurement changes instead of broad channel brainstorming. When the user already supplies a growth memo, preserve its useful conclusions and turn them into a ship list: the exact hero copy, CTA copy, proof substitute, comparison block, one post template, and the next 7-day experiment. If the user asks for more money, users, signups, launches, traffic, Product Hunt, Indie Hackers, Reddit, X, SEO, outreach, or conversion, treat it as a growth task. Separate what to do now from what to defer, and make tradeoffs explicit. If the task is underspecified, state assumptions briefly and continue with a first useful sprint plan.",
  "deliverableHint": "Write sections for answer-first recommendation, current bottleneck, ICP and pain, offer rewrite, channel priority, exact page/copy assets to ship, 7-day experiment plan, metrics, stop rules, risks, and next action.",
  "reviewHint": "Remove generic growth advice, make the experiment sequence sharper, include measurable success and stop criteria, and make the first next action executable in under one hour. If the product/site is named, turn the output into concrete page edits and distribution assets instead of broad strategy notes.",
  "executionFocus": "Identify the current bottleneck before listing tactics. Prefer one narrow high-intent experiment with measurable success and stop rules.",
  "outputSections": [
    "Answer-first recommendation",
    "Current bottleneck",
    "ICP and offer",
    "Channel priority",
    "Execution packet",
    "Page or channel artifact",
    "Tracking specification",
    "7-day experiment",
    "Metrics",
    "Stop rules",
    "Next action"
  ],
  "inputNeeds": [
    "Product or offer",
    "ICP",
    "Current funnel metric",
    "Available channels",
    "Time and budget constraint"
  ],
  "acceptanceChecks": [
    "Bottleneck is identified before tactics",
    "Experiment is narrow and high-intent",
    "Metrics and stop rules are defined",
    "Next action fits constraints"
  ],
  "firstMove": "Find the current funnel bottleneck before listing tactics. Default to one measurable 7-day experiment with stop rules.",
  "failureModes": [
    "Do not list many tactics without a bottleneck",
    "Do not recommend paid channels when constraints exclude them",
    "Do not omit measurement and stop rules"
  ],
  "evidencePolicy": "Use funnel metrics, channel data, customer profile, and competitor/channel baselines. Treat tactics without measurement as unproven.",
  "nextAction": "End with one 7-day experiment, owner, metric, stop rule, and next review date.",
  "confidenceRubric": "High when funnel metrics, ICP, offer, channel history, and constraints are known; medium when metrics are partial; low when bottleneck or target user is unknown.",
  "handoffArtifacts": [
    "Bottleneck diagnosis",
    "7-day experiment",
    "Execution packet",
    "Page/channel artifact",
    "Tracking specification",
    "Metrics and stop rules",
    "Owner/next action"
  ],
  "prioritizationRubric": "Prioritize experiments by bottleneck impact, low cost, measurement clarity, repeatability, and time to learning.",
  "measurementSignals": [
    "Qualified traffic",
    "Activation rate",
    "Order or signup rate",
    "Cost/time per signal"
  ],
  "assumptionPolicy": "Assume constrained, measurable experiments. Do not assume paid budget, team capacity, or analytics access unless supplied.",
  "escalationTriggers": [
    "No bottleneck or metric exists",
    "Tactics require paid budget or access not granted",
    "Growth action risks spam or policy violations"
  ],
  "minimumQuestions": [
    "What product/offer and ICP are we growing?",
    "Which funnel metric is currently weakest?",
    "What channels, budget, and time limits apply?"
  ],
  "reviewChecks": [
    "Bottleneck comes before tactics",
    "Experiment is narrow",
    "Stop rule is defined"
  ],
  "depthPolicy": "Default to one 7-day experiment. Go deeper when funnel metrics, ICP, offer, and channel priority all need diagnosis.",
  "concisionRule": "Avoid tactic lists; keep one prioritized experiment and explain why it targets the bottleneck.",
  "toolStrategy": {
    "web_search": "default",
    "source_mode": "current_channel_competitor_and_bottleneck_scan",
    "note": "Check current competitor activity and channel mechanics before proposing growth experiments."
  },
  "specialistMethod": [
    "Diagnose the current bottleneck before listing tactics.",
    "Use ICP, offer, funnel metrics, channel history, and competitor signals to choose one experiment.",
    "Return a 7-day test with owner, metric, stop rule, and review date.",
    "If the experiment is a page, LP, SEO asset, directory listing, email, or social post, include the exact artifact packet: target URL/path, H1 or title, section outline, CTA copy, body draft or field map, tracking event names, UTM template, implementation owner, approval owner, and publish/execute checklist.",
    "Do not stop at strategy. A growth operator delivery must be usable by the next execution owner without asking what to write, where to put it, how to track it, or when to stop."
  ],
  "scopeBoundaries": [
    "Do not list generic tactics without diagnosing the bottleneck first.",
    "Do not recommend spammy, deceptive, or platform-risk growth actions.",
    "Do not ignore measurement, stop rules, owner capacity, or channel constraints."
  ],
  "freshnessPolicy": "Treat channel mechanics, platform rules, competitor activity, and funnel metrics as time-sensitive. Date the bottleneck evidence and avoid tactics based on stale norms.",
  "sensitiveDataPolicy": "Treat analytics exports, customer lists, ad accounts, community accounts, and private funnel metrics as confidential. Use aggregated metrics unless exact values are required.",
  "costControlPolicy": "Default to one 7-day experiment. Avoid tactic lists, multi-channel plans, or deep audits unless the bottleneck and metric justify them."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'growth',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'growth'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'growth agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/growth/health',
  healthcheck_url: '/sample-agents/growth/health',
  jobEndpoint: '/sample-agents/growth/jobs',
  job_endpoint: '/sample-agents/growth/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/growth/health',
    jobs: '/sample-agents/growth/jobs'
  }),
  metadata: Object.freeze({
    sample: true,
    sampleKind: 'growth',
    sample_kind: 'growth',
    category: 'growth',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
