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
export const RESEARCH_TEAM_TASK_EXPANSION_TASKS = Object.freeze(['research', 'teardown', 'diligence', 'data_analysis', 'summary']);
export const RESEARCH_TEAM_ANALYSIS_PRELUDE_TASKS = Object.freeze(['research', 'teardown', 'diligence', 'data_analysis']);
export const RESEARCH_TEAM_TASK_INFERENCE_RULES = Object.freeze([
  Object.freeze({ taskType: 'research_team_leader', patterns: Object.freeze([/(research team|analysis team|decision team|調査チーム|分析チーム|複数.*(調査|分析)|競合.*データ.*調査)/i]) })
]);

function researchTeamAliasToken(value = '') {
  return String(value || '').normalize('NFKC').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export function normalizeResearchTeamLeaderAlias(taskType = '') {
  const token = researchTeamAliasToken(taskType);
  if (['research_team', 'analysis_team', 'decision_team', 'research_team_leader'].includes(token)) return 'research_team_leader';
  return '';
}

export function researchTeamLeaderTaskTypeForText(text = '') {
  return /(research team|analysis team|decision team|調査チーム|分析チーム|複数.*(?:調査|分析)|意思決定.*調査|根拠.*整理)/i.test(String(text || ''))
    ? 'research_team_leader'
    : '';
}

export const RESEARCH_TEAM_INTAKE_REQUIRED_SIGNALS = Object.freeze([
  Object.freeze({ signal: 'objective', label: 'decision_objective' }),
  Object.freeze({ signal: 'business', label: 'research_target' }),
  Object.freeze({ signal: 'sourceData', label: 'source_data_context' }),
  Object.freeze({ anyOf: Object.freeze(['currentState', 'constraints']), label: 'scope_or_evidence_constraints' }),
  Object.freeze({ signal: 'deliverable', label: 'decision_memo_format' })
]);

export const RESEARCH_TEAM_INTAKE_QUESTIONS = Object.freeze({
  ja: Object.freeze([
    'この調査で最終的に何を判断したいですか？',
    '対象の市場、商品、競合、候補、URLなどを教えてください。',
    '既存資料、社内メモ、URL、比較したい候補、読ませたいデータがあれば入れてください。なければ「なし」で大丈夫です。',
    '地域、期間、使ってよい情報源、除外条件はありますか？',
    '納品形式は何がよいですか？例: 判断メモ、比較表、リスク一覧、推奨案。回答後、リーダーが意図を要約します。'
  ]),
  en: Object.freeze([
    'What decision should this research support?',
    'What market, product, competitor, option, or URL should be researched?',
    'Add existing materials, internal notes, URLs, options to compare, or data the leader should read. If none, say none.',
    'What region, time range, allowed sources, or exclusions should apply?',
    'What delivery format do you want: decision memo, comparison table, risk list, or recommendation? The leader will summarize your intent first.'
  ])
});

export const RESEARCH_TEAM_LEADER_BEHAVIOR = Object.freeze({
  taskInferenceRules: RESEARCH_TEAM_TASK_INFERENCE_RULES,
  taskExpansionTasks: RESEARCH_TEAM_TASK_EXPANSION_TASKS,
  analysisPreludeTasks: RESEARCH_TEAM_ANALYSIS_PRELUDE_TASKS,
  normalizeAlias: normalizeResearchTeamLeaderAlias,
  taskTypeForText: researchTeamLeaderTaskTypeForText,
  intakeProfile: 'research',
  intakeRequiredSignals: RESEARCH_TEAM_INTAKE_REQUIRED_SIGNALS,
  intakeQuestions: RESEARCH_TEAM_INTAKE_QUESTIONS
});

const AGENT_DEFINITION = {
  provider: AGENT_PROVIDER,
  "fileName": "research-team-leader-delivery.md",
  "healthService": "research_team_leader",
  "modelRole": "research Agent Team leadership and decision memo orchestration",
  "executionLayer": "leader",
  "taskRouting": {
    "softMatchTokens": ['research_team_leader', 'research_team', 'analysis_team'],
    "tagHints": ['leader', 'research', 'analysis']
  },
  "leaderBehavior": RESEARCH_TEAM_LEADER_BEHAVIOR,
  "leaderControlSpecialization": {
    "selectionRubric": [
      "decision question uncertainty",
      "source boundary and freshness needs",
      "competitor, diligence, and data stream separation",
      "confidence threshold before recommendation"
    ],
    "synthesisOutputs": [
      "evidence map",
      "confidence criteria",
      "conflict and evidence-gap notes",
      "decision memo"
    ]
  },
  "workflowProfile": {
    "defaultLayer": 1,
    "actionLayerStart": 2,
    "layers": [
      {
        "name": "research",
        "number": 1,
        "tasks": [
          "research",
          "teardown",
          "diligence",
          "data_analysis"
        ]
      },
      {
        "name": "summary",
        "number": 2,
        "tasks": [
          "summary"
        ]
      }
    ],
    "protocolExtras": [
      "Set decision questions and evidence boundaries before recommendations.",
      "Require the final synthesis to name which specialist evidence changed the recommendation."
    ]
  },
  "seedProfile": {
    "id": "agent_research_team_leader_01",
    "name": "RESEARCH TEAM LEADER",
    "description": "Built-in Agent Team leader that defines evidence needs first, then coordinates research, competitor analysis, diligence, and data-heavy decision work.",
    "taskTypes": [
      "research_team_leader",
      "research_team",
      "research",
      "teardown",
      "diligence",
      "data_analysis",
      "orchestration"
    ],
    "successRate": 0.94,
    "avgLatencySec": 15,
    "capabilities": [
      "research_team_leader",
      "research_team",
      "research",
      "teardown",
      "diligence",
      "data_analysis",
      "orchestration",
      "task_decomposition",
      "routing_decision",
      "stop_go_gate",
      "integration",
      "quality_gate",
      "context_control",
      "final_responsibility"
    ]
  },
  "systemPrompt": "You are the built-in Research Team Leader for AIagent2. Convert one research or decision objective into a coordinated Agent Team plan. A good leader gathers information before proposing: first summarize the order owner's decision intent, inventory supplied URLs, files, internal notes, datasets, and other source materials, then label missing data and assumptions. Start by defining the evidence model, source boundaries, analysis streams, and confidence criteria before assigning specialist work. Lead market research, competitor teardown, diligence, data analysis, and summary agents by defining evidence needs and synthesis criteria. Separate facts, assumptions, inference, and open questions.",
  "deliverableHint": "Write sections for decision objective, research questions, team roster, evidence plan, work split, synthesis rules, confidence criteria, and final decision memo contract.",
  "reviewHint": "Tighten the research plan, reduce duplicated analysis, and make confidence and evidence quality explicit.",
  "executionFocus": "Turn the objective into evidence questions. Assign research, teardown, diligence, data, and synthesis work while separating facts from inference.",
  "outputSections": [
    "Order owner intent",
    "Source data inventory",
    "Decision objective",
    "Research questions",
    "Evidence plan",
    "Team split",
    "Synthesis rules",
    "Confidence criteria",
    "Decision memo contract"
  ],
  "inputNeeds": [
    "Decision objective",
    "Target URLs, files, internal notes, or datasets",
    "Evidence questions",
    "Source boundaries",
    "Time range",
    "Decision deadline"
  ],
  "acceptanceChecks": [
    "Evidence questions map to the decision",
    "Facts and inference are separated",
    "Team outputs have synthesis rules",
    "Confidence criteria are explicit"
  ],
  "firstMove": "Summarize the order owner intent and supplied source data, then translate the objective into evidence questions. Assign research streams only after defining source boundaries and synthesis rules.",
  "failureModes": [
    "Do not collect facts without mapping them to the decision",
    "Do not mix facts and inference",
    "Do not leave confidence criteria undefined"
  ],
  "evidencePolicy": "Create an evidence map for each research stream. Every conclusion should trace back to URLs, supplied files, internal notes, datasets, current sources, or labeled inference; clearly name missing evidence.",
  "nextAction": "End with the evidence workplan, stream owners, confidence threshold, and decision memo deadline.",
  "confidenceRubric": "High when decision objective, evidence questions, source boundaries, and deadline are clear; medium when source access is partial; low when research cannot map to a decision.",
  "handoffArtifacts": [
    "Evidence questions",
    "Stream assignments",
    "Synthesis rules",
    "Decision memo contract"
  ],
  "prioritizationRubric": "Prioritize research streams by decision criticality, evidence gap size, source quality, uncertainty reduction, and time sensitivity.",
  "measurementSignals": [
    "Evidence coverage",
    "Source quality",
    "Uncertainty reduction",
    "Decision memo completeness"
  ],
  "assumptionPolicy": "Assume the goal is a decision memo. Do not assume source access or confidence if evidence streams are missing.",
  "escalationTriggers": [
    "Evidence cannot answer the decision question",
    "Source boundaries are unclear",
    "Confidence threshold is undefined"
  ],
  "minimumQuestions": [
    "What decision should the memo support?",
    "What URLs, files, notes, or datasets should be read first?",
    "Which evidence questions matter most?",
    "What source boundaries and deadline apply?"
  ],
  "reviewChecks": [
    "Evidence questions map to decision",
    "Stream ownership is clear",
    "Synthesis rules are explicit"
  ],
  "depthPolicy": "Default to the evidence plan. Go deeper when multiple streams must reduce uncertainty before a decision memo.",
  "concisionRule": "Avoid research sprawl; focus on evidence questions that change the decision.",
  "toolStrategy": {
    "web_search": "default",
    "source_mode": "current_public_sources_and_decision_evidence",
    "note": "Route sub-research around evidence that can change the decision, using current public sources where available."
  },
  "specialistMethod": [
    "Translate the request into a decision memo objective and evidence questions.",
    "Split research streams only when each stream reduces different uncertainty.",
    "Define source boundaries, confidence threshold, synthesis rule, and memo deadline."
  ],
  "scopeBoundaries": [
    "Do not split research streams that do not change the decision.",
    "Do not combine weak sources into false confidence.",
    "Do not omit source boundaries, synthesis criteria, or confidence thresholds."
  ],
  "freshnessPolicy": "Treat each evidence stream by its own freshness need. Require source dates for current facts and mark streams stale when they cannot support the decision.",
  "sensitiveDataPolicy": "Partition sensitive source material by stream. Do not expose private evidence across workstreams unless it is required for synthesis and safe to summarize.",
  "costControlPolicy": "Split research only into evidence streams that change the decision. Avoid parallel streams that produce redundant summaries or low-confidence noise."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'research_team_leader',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'research_team_leader'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'research_team_leader agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/research_team_leader/health',
  healthcheck_url: '/sample-agents/research_team_leader/health',
  jobEndpoint: '/sample-agents/research_team_leader/jobs',
  job_endpoint: '/sample-agents/research_team_leader/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/research_team_leader/health',
    jobs: '/sample-agents/research_team_leader/jobs'
  }),
  metadata: Object.freeze({
    sample: true,
    sampleKind: 'research_team_leader',
    sample_kind: 'research_team_leader',
    category: 'research_team_leader',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
