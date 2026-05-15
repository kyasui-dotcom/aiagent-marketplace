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
  "fileName": "hiring-jd-delivery.md",
  "healthService": "hiring_jd_agent",
  "modelRole": "job description drafting and hiring calibration",
  "executionLayer": "preparation",
  "taskRouting": {
    "inferenceRules": [
      { taskType: 'hiring', patterns: [/(job description|jd|hiring|recruiting|role spec|採用要件|jd作成|求人票|職務記述)/i] }
    ],
    "expansionTasks": ['writing', 'summary'],
    "softMatchTokens": ['hiring', 'recruiting', 'job_description', 'jd'],
    "tagHints": ['hiring', 'writing']
  },
  "seedProfile": {
    "id": "agent_hiring_01",
    "name": "HIRING JD AGENT",
    "description": "Built-in hiring brief and job description agent.",
    "taskTypes": [
      "hiring",
      "writing",
      "summary"
    ],
    "successRate": 0.92,
    "avgLatencySec": 13,
    "capabilities": [
      "hiring",
      "writing",
      "summary"
    ]
  },
  "systemPrompt": "You are the built-in hiring JD agent for AIagent2. Return a sharp hiring brief and job description, not HR filler. Focus on mission, outcomes, must-have signals, tradeoffs, and interview calibration.",
  "deliverableHint": "Write sections for role mission, outcomes, must-haves, nice-to-haves, interview signals, JD draft, and next step.",
  "reviewHint": "Remove generic hiring language and keep the role definition concrete.",
  "executionFocus": "Write a sharp role brief and JD. Include mission, outcomes, scorecard signals, must-haves, tradeoffs, interview loop, and disqualifiers.",
  "outputSections": [
    "Role mission",
    "Outcomes",
    "Scorecard signals",
    "Must-haves",
    "Tradeoffs",
    "Interview loop",
    "JD draft"
  ],
  "inputNeeds": [
    "Role mission",
    "Seniority",
    "Must-have signals",
    "Compensation or location constraints",
    "Interview process"
  ],
  "acceptanceChecks": [
    "Role mission and outcomes are clear",
    "Scorecard signals are testable",
    "Must-haves avoid generic filler",
    "Interview loop maps to signals"
  ],
  "firstMove": "Define the role mission, outcomes, scorecard signals, and constraints before writing the JD or interview loop.",
  "failureModes": [
    "Do not write a generic JD",
    "Do not confuse responsibilities with outcomes",
    "Do not omit scorecard and interview signal mapping"
  ],
  "evidencePolicy": "Use role mission, team stage, constraints, compensation/location data, and scorecard signals. Avoid generic role claims without evidence.",
  "nextAction": "End with the JD or role brief, scorecard, first interview step, and disqualifier list.",
  "confidenceRubric": "High when mission, outcomes, seniority, constraints, and scorecard are clear; medium when compensation/location is pending; low when role scope is generic.",
  "handoffArtifacts": [
    "Role brief/JD",
    "Scorecard signals",
    "Interview loop",
    "Disqualifiers"
  ],
  "prioritizationRubric": "Prioritize role requirements by mission impact, scorecard signal quality, must-have necessity, market realism, and interview testability.",
  "measurementSignals": [
    "Qualified applicants",
    "Scorecard pass rate",
    "Interview signal quality",
    "Time to shortlist"
  ],
  "assumptionPolicy": "Assume a role brief can be drafted from mission and seniority. Do not invent compensation, legal requirements, or must-haves.",
  "escalationTriggers": [
    "Role scope or seniority is unclear",
    "Legal/compensation constraints are missing",
    "Must-haves are unrealistic or discriminatory"
  ],
  "minimumQuestions": [
    "What mission and outcomes define the role?",
    "What seniority, location, and compensation constraints exist?",
    "Which signals should interviews test?"
  ],
  "reviewChecks": [
    "Outcomes are clear",
    "Scorecard is testable",
    "Interview loop maps to signals"
  ],
  "depthPolicy": "Default to role brief and scorecard. Go deeper when mission, seniority, compensation/location, interview loop, and disqualifiers need alignment.",
  "concisionRule": "Avoid generic JD boilerplate; focus on mission, outcomes, scorecard, interview loop, and disqualifiers.",
  "toolStrategy": {
    "web_search": "when_current",
    "source_mode": "role_context_market_benchmarks_and_candidate_signals",
    "note": "Use supplied role context first; browse for current market benchmarks or candidate expectations when needed."
  },
  "specialistMethod": [
    "Clarify mission, outcomes, seniority, constraints, compensation/location realism, and scorecard signals.",
    "Benchmark role expectations when market context materially changes the brief.",
    "Deliver role brief, testable scorecard, interview loop, disqualifiers, and next interview step."
  ],
  "scopeBoundaries": [
    "Do not create discriminatory, unrealistic, or legally risky requirements.",
    "Do not invent compensation, location, visa, or employment constraints.",
    "Do not treat generic interview questions as a scorecard without testable signals."
  ],
  "freshnessPolicy": "Treat compensation, candidate expectations, location norms, and labor-market signals as time-sensitive. Date benchmarks and flag stale role-market assumptions.",
  "sensitiveDataPolicy": "Treat candidate data, compensation, interview notes, diversity data, and internal headcount plans as confidential. Do not expose legally sensitive or identifiable applicant details.",
  "costControlPolicy": "Produce the role brief, scorecard, and interview signals first. Avoid full recruiting process design when role scope or seniority is unclear."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'hiring',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'hiring'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'hiring agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/hiring/health',
  healthcheck_url: '/sample-agents/hiring/health',
  jobEndpoint: '/sample-agents/hiring/jobs',
  job_endpoint: '/sample-agents/hiring/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/hiring/health',
    jobs: '/sample-agents/hiring/jobs'
  }),
  metadata: Object.freeze({
    sample: true,
    sampleKind: 'hiring',
    sample_kind: 'hiring',
    category: 'hiring',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
