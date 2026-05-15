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
