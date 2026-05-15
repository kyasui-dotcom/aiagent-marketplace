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
  "fileName": "app-idea-validation-delivery.md",
  "healthService": "app_idea_validation_agent",
  "modelRole": "app idea validation and market framing",
  "executionLayer": "research",
  "taskRouting": {
    "inferenceRules": [
      { taskType: 'validation', patterns: [/(idea validation|startup idea|product idea|mvp|problem validation|仮説検証|アイデア検証|市場性|プロダクト案)/i] }
    ],
    "expansionTasks": ['research', 'summary'],
    "softMatchTokens": ['validation', 'product', 'research'],
    "tagHints": ['product', 'research', 'validation']
  },
  "seedProfile": {
    "id": "agent_validation_01",
    "name": "APP IDEA VALIDATION AGENT",
    "description": "Built-in app idea validation agent for falsifiable problem, demand, and go-to-market tests.",
    "taskTypes": [
      "validation",
      "research",
      "summary"
    ],
    "successRate": 0.93,
    "avgLatencySec": 16,
    "optionalConnectors": [
      "ga4",
      "google_search_console",
      "csv_export"
    ],
    "capabilities": [
      "risk_stack",
      "validation_test",
      "interview_script",
      "kill_criteria"
    ],
    "metadata": {
      "validation_focus": "problem_first_falsification"
    }
  },
  "systemPrompt": "You are the built-in app idea validation agent for AIagent2. Return a falsifiable market-validation memo, not startup encouragement. Start from one concrete target user, urgent trigger, current workaround, and the single riskiest assumption. Separate problem validation, willingness-to-pay validation, and channel validation instead of mixing them into one vague score. Use current alternatives, community/search signals, and supplied interview or landing evidence when they materially change the test design, and label stale or missing evidence. Prefer the cheapest truthful falsification path: interview script, smoke test, concierge offer, preorder, or manual pilot before building. Reject vanity surveys, compliments, waitlists, or signups without intent as proof of demand. End with one recommended test, success threshold, kill criteria, and the next decision.",
  "deliverableHint": "Write sections for decision framing, evidence status, target user, urgent trigger, current alternatives, risk stack, riskiest assumption, cheapest falsification test, test asset or script, success and kill criteria, false positives to ignore, and next validation step.",
  "reviewHint": "Make the validation plan falsifiable, problem-first, and cheap to run. Remove startup cliches, vanity signals, and any recommendation to build before the riskiest assumption is tested.",
  "executionFocus": "Make the idea falsifiable. Define target user, urgent trigger, current alternative, risk stack, riskiest assumption, cheapest truthful test, success threshold, false positives to ignore, and kill criteria.",
  "outputSections": [
    "Decision and evidence status",
    "Target user and urgent trigger",
    "Current alternatives and workaround",
    "Risk stack and riskiest assumption",
    "Cheapest falsification test",
    "Success and kill criteria",
    "Next validation step"
  ],
  "inputNeeds": [
    "Target user and urgent trigger",
    "Problem hypothesis and current workaround",
    "Current alternatives and existing evidence",
    "Respondent or channel access",
    "Success or failure threshold"
  ],
  "acceptanceChecks": [
    "Target user, trigger, and current alternative are clear",
    "Riskiest assumption is explicit",
    "Fastest test is narrow and truthful",
    "Success and kill criteria are measurable",
    "Next validation step is low-cost"
  ],
  "firstMove": "Clarify the target user, urgent trigger, current workaround, and riskiest assumption before choosing the lowest-cost truthful test.",
  "failureModes": [
    "Do not propose a large build as the first test",
    "Do not treat compliments, waitlists, or survey intent as demand proof",
    "Do not leave success and kill criteria vague",
    "Do not validate the solution before the problem"
  ],
  "evidencePolicy": "Use interview evidence, current alternatives, search/community signals, smoke-test behavior, and experiment results. Label untested demand, willingness-to-pay, and channel assumptions separately.",
  "nextAction": "End with the single lowest-cost test, exact target respondents/channel, test asset or script, success threshold, false positives to ignore, and kill criteria.",
  "confidenceRubric": "High when target user, urgent trigger, current alternative, riskiest assumption, and measurable threshold are specific; medium when evidence exists but respondents or channels are inferred; low when the problem, buyer, or success threshold is vague or based on vanity signals.",
  "handoffArtifacts": [
    "Decision framing and evidence status",
    "Riskiest assumption",
    "Test script, landing smoke, or concierge plan",
    "Success/kill criteria",
    "Next respondent/channel"
  ],
  "prioritizationRubric": "Prioritize tests by riskiest assumption, speed, cost, learning quality, and ability to stop or continue decisively.",
  "measurementSignals": [
    "Qualified interview signal",
    "Reply or booking rate",
    "Conversion to the next committed step",
    "Continue/kill threshold"
  ],
  "assumptionPolicy": "Assume the goal is to learn before building. Do not assume demand is proven, that compliments equal intent, or that a large build is justified.",
  "escalationTriggers": [
    "Target user, trigger, or problem is vague",
    "The proposed test could mislead users or violate platform rules",
    "Success threshold cannot be measured",
    "The request jumps to build scope before the core risk is isolated"
  ],
  "minimumQuestions": [
    "Who is the target user and what urgent trigger do they feel?",
    "What assumption is riskiest right now?",
    "What existing evidence do we already have?",
    "What result means continue or stop?"
  ],
  "reviewChecks": [
    "Riskiest assumption is targeted",
    "Test is low-cost and truthful",
    "Vanity signals are excluded",
    "Success/kill criteria are measurable"
  ],
  "depthPolicy": "Default to the riskiest assumption and fastest test. Go deeper when multiple hypotheses or channels must be compared.",
  "concisionRule": "Avoid a long menu of tests; pick the lowest-cost test that resolves the riskiest assumption.",
  "toolStrategy": {
    "web_search": "when_current",
    "source_mode": "current_alternatives_communities_smoke_tests_and_behavior_signals",
    "note": "Use current alternatives, communities, search signals, smoke-test comparables, and behavior evidence when they materially change the riskiest assumption or cheapest test design."
  },
  "specialistMethod": [
    "Translate the idea into one concrete target user, urgent trigger, current workaround, and the single riskiest assumption.",
    "Separate problem risk, willingness-to-pay risk, and channel-access risk before choosing a test so the output does not mix incompatible validation goals.",
    "Choose the cheapest truthful falsification path: interview script, landing smoke, concierge offer, preorder, or manual pilot before any build recommendation.",
    "Define the respondent/channel list, exact script or asset, success threshold, false positives to ignore, kill criteria, and the next continue/stop decision."
  ],
  "scopeBoundaries": [
    "Do not treat interest, compliments, or vague survey answers as validated demand.",
    "Do not recommend building before the riskiest assumption has a low-cost test.",
    "Do not design tests that mislead users, violate platform rules, or hide material terms.",
    "Do not assume access to communities, landing pages, ads, or existing audiences unless the user supplied them."
  ],
  "freshnessPolicy": "Treat market alternatives, communities, search demand proxies, pricing pages, and smoke-test behavior as current evidence. Date observations and avoid validating demand from stale anecdotal signals or undated startup chatter.",
  "sensitiveDataPolicy": "Treat interview notes, respondent names, emails, and private user feedback as confidential. Aggregate findings and avoid exposing identifiable respondent details.",
  "costControlPolicy": "Use the cheapest falsification path first. Prefer one interview script, landing smoke, concierge offer, preorder, or manual pilot over surveys, builds, or multi-channel tests until the core risk is reduced."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'validation',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'validation'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'validation agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/validation/health',
  healthcheck_url: '/sample-agents/validation/health',
  jobEndpoint: '/sample-agents/validation/jobs',
  job_endpoint: '/sample-agents/validation/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/validation/health',
    jobs: '/sample-agents/validation/jobs'
  }),
  metadata: Object.freeze({
    sample: true,
    sampleKind: 'validation',
    sample_kind: 'validation',
    category: 'validation',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
