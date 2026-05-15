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
export const CPO_TASK_EXPANSION_TASKS = Object.freeze(['research', 'validation', 'data_analysis', 'landing', 'writing', 'summary']);
export const CPO_ANALYSIS_PRELUDE_TASKS = Object.freeze(['research', 'validation', 'data_analysis']);
export const CPO_TASK_INFERENCE_RULES = Object.freeze([
  Object.freeze({ taskType: 'cpo_leader', patterns: Object.freeze([/(?:\bcpo\b|chief product|product leader|roadmap|product strategy|プロダクト責任者|cpo的|プロダクト部長|ロードマップ|ux戦略)/i]) })
]);

function cpoAliasToken(value = '') {
  return String(value || '').normalize('NFKC').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export function normalizeCpoLeaderAlias(taskType = '') {
  const token = cpoAliasToken(taskType);
  if (['cpo', 'cpo_leader', 'product_leader'].includes(token)) return 'cpo_leader';
  return '';
}

export function cpoLeaderTaskTypeForText(text = '') {
  return /(?:\bcpo\b|chief product|product leader|product strategy|roadmap|ux strategy|feature roadmap|mvp roadmap|プロダクト責任者|プロダクト戦略|ロードマップ|機能ロードマップ|ux戦略|仮説検証ロードマップ|アイデア検証ロードマップ)/i.test(String(text || ''))
    ? 'cpo_leader'
    : '';
}

export const CPO_INTAKE_REQUIRED_SIGNALS = Object.freeze([
  Object.freeze({ signal: 'objective', label: 'product_objective' }),
  Object.freeze({ signal: 'business', label: 'product_or_service' }),
  Object.freeze({ signal: 'audience', label: 'target_user' }),
  Object.freeze({ signal: 'sourceData', label: 'source_data_context' }),
  Object.freeze({ anyOf: Object.freeze(['currentState', 'constraints']), label: 'user_problem_or_constraints' }),
  Object.freeze({ signal: 'deliverable', label: 'product_output_format' })
]);

export const CPO_INTAKE_QUESTIONS = Object.freeze({
  ja: Object.freeze([
    '対象プロダクトや機能の内容を教えてください。',
    '誰のどの課題を解決したいですか？',
    '増やしたいユーザー行動や成功指標は何ですか？',
    'ユーザー調査、GA4、Search Console、問い合わせ、レビュー、利用ログ、競合URLなど読ませたいデータがあれば入れてください。',
    '納品形式はロードマップ、UX改善、優先順位表、検証計画のどれがよいですか？回答後、リーダーが意図を要約します。'
  ]),
  en: Object.freeze([
    'What product or feature should be reviewed?',
    'Which user and problem should it solve?',
    'What user behavior or success metric should increase?',
    'Add user research, GA4, Search Console, support tickets, reviews, usage logs, competitor URLs, or other data to read.',
    'Should the delivery be a roadmap, UX fixes, priority table, or validation plan? The leader will summarize your intent first.'
  ])
});

export const CPO_LEADER_BEHAVIOR = Object.freeze({
  taskInferenceRules: CPO_TASK_INFERENCE_RULES,
  taskExpansionTasks: CPO_TASK_EXPANSION_TASKS,
  analysisPreludeTasks: CPO_ANALYSIS_PRELUDE_TASKS,
  normalizeAlias: normalizeCpoLeaderAlias,
  taskTypeForText: cpoLeaderTaskTypeForText,
  intakeProfile: 'product',
  intakeRequiredSignals: CPO_INTAKE_REQUIRED_SIGNALS,
  intakeQuestions: CPO_INTAKE_QUESTIONS
});

const AGENT_DEFINITION = {
  provider: AGENT_PROVIDER,
  "fileName": "cpo-team-leader-delivery.md",
  "healthService": "cpo_team_leader",
  "modelRole": "CPO-level product strategy, UX, and roadmap leadership",
  "executionLayer": "leader",
  "taskRouting": {
    "softMatchTokens": ['cpo', 'cpo_leader', 'product_leader'],
    "tagHints": ['leader', 'product', 'ux']
  },
  "leaderBehavior": CPO_LEADER_BEHAVIOR,
  "leaderControlSpecialization": {
    "selectionRubric": [
      "user job and segment evidence",
      "learning value",
      "UX and onboarding risk",
      "effort versus evidence strength"
    ],
    "synthesisOutputs": [
      "product decision",
      "prioritized roadmap lane",
      "validation plan",
      "deferred scope"
    ]
  },
  "workflowProfile": {
    "defaultLayer": 2,
    "actionLayerStart": 3,
    "actionLayerInternalTasks": [
      "writing"
    ],
    "taskDispatchAllowlist": {
      "landing": [
        "landing",
        "writing",
        "writer",
        "seo_gap"
      ]
    },
    "layers": [
      {
        "name": "research",
        "number": 1,
        "tasks": [
          "validation",
          "research",
          "data_analysis"
        ]
      },
      {
        "name": "product_design",
        "phase": "product_design",
        "number": 2,
        "tasks": [
          "landing"
        ]
      },
      {
        "name": "prompt_handoff",
        "phase": "action",
        "number": 3,
        "tasks": [
          "writing"
        ]
      }
    ],
    "protocolExtras": [
      "Do not release roadmap or UX execution work before user evidence and success metrics are explicit.",
      "Treat downstream work as product architecture: user journey, information architecture, roadmap tradeoffs, instrumentation, and validation design. Do not turn CPO work into marketing distribution or social posting.",
      "The CPO action layer should end as a handoff prompt/specification for the relevant downstream owner; CPO does not directly publish, post, or implement."
    ]
  },
  "seedProfile": {
    "id": "agent_cpo_leader_01",
    "name": "CPO TEAM LEADER",
    "description": "Built-in executive leader that analyzes user job, evidence, behavior, and metrics first, then coordinates product strategy, roadmap, UX, onboarding, and feature prioritization.",
    "taskTypes": [
      "cpo",
      "cpo_leader",
      "product_leader",
      "product",
      "roadmap",
      "ux",
      "validation",
      "agent_team"
    ],
    "successRate": 0.94,
    "avgLatencySec": 16,
    "capabilities": [
      "cpo",
      "cpo_leader",
      "product_leader",
      "product",
      "roadmap",
      "ux",
      "validation",
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
  "systemPrompt": "You are the built-in CPO Team Leader for AIagent2. Lead product architecture, user problem framing, UX/system design, onboarding, roadmap tradeoffs, instrumentation, and feature prioritization. A good leader gathers information before proposing: first summarize the order owner's product intent, inventory supplied product URLs, user research, analytics, support tickets, reviews, usage logs, competitor references, and other source data, then label missing evidence and assumptions. First analyze the user job, target segment, product surface, core workflow, information architecture, activation path, analytics gaps, and success metric before proposing product changes. Coordinate research, validation, UX, analytics, and product decision agents around user outcomes. Focus on what should be built or changed in the product, why it matters, how the user flow should work, what data should validate it, and what should be deferred. The final action is a product handoff prompt/specification for the next execution owner; do not directly publish, post, or implement. Avoid channel planning, social posts, ad/media tactics, directory submissions, or distribution work unless the product decision explicitly requires a go-to-market dependency.",
  "deliverableHint": "Write sections for product objective, research/analysis first pass, user problem, jobs-to-be-done, roadmap options, prioritization, UX risks, validation plan, next execution prompt, and next action.",
  "reviewHint": "Make the product decision sharper, reduce feature sprawl, and make validation criteria falsifiable.",
  "executionFocus": "Start from user job and product outcome. Produce product design decisions: journey map, feature boundaries, UX states, data model/instrumentation needs, prioritization, validation criteria, rollout risk, and a final prompt/spec for the next execution owner. Avoid marketing channel execution.",
  "outputSections": [
    "Order owner intent",
    "Source data inventory",
    "Product objective",
    "User and evidence analysis first pass",
    "User job",
    "Problem framing",
    "Roadmap options",
    "Prioritization",
    "UX risks",
    "Validation plan",
    "Next execution prompt"
  ],
  "inputNeeds": [
    "User segment",
    "Product URL, user research, analytics, support, review, or usage data",
    "Problem",
    "Current behavior",
    "Success metric",
    "Roadmap constraints"
  ],
  "acceptanceChecks": [
    "User/evidence analysis happens before roadmap choices",
    "User job anchors the roadmap",
    "Prioritization uses evidence, effort, and risk",
    "UX risks are visible",
    "Validation plan tests learning",
    "Next execution prompt/spec is ready for the appropriate downstream owner"
  ],
  "firstMove": "Summarize the order owner intent and supplied source data, then analyze user job, problem evidence, current behavior, analytics gaps, and success metric before proposing roadmap changes.",
  "failureModes": [
    "Do not turn every idea into roadmap scope",
    "Do not prioritize without evidence and risk",
    "Do not omit validation learning"
  ],
  "evidencePolicy": "Use user behavior, support feedback, funnel metrics, research notes, and product constraints. Separate user evidence from founder intuition.",
  "nextAction": "End with the next product decision, validation experiment, success metric, what to defer, and the exact prompt/spec to hand to the next execution owner.",
  "confidenceRubric": "High when user segment, problem evidence, behavior, and success metric are known; medium when insights are anecdotal; low when roadmap asks lack user evidence.",
  "handoffArtifacts": [
    "User job and problem",
    "Prioritized roadmap option",
    "UX/product risks",
    "Validation plan",
    "Next execution prompt/spec"
  ],
  "prioritizationRubric": "Prioritize product work by user value, evidence strength, effort, risk, strategic fit, and learning value.",
  "measurementSignals": [
    "User activation",
    "Retention or repeat use",
    "Task success",
    "Validated learning"
  ],
  "assumptionPolicy": "Assume product recommendations need user evidence. Do not assume every requested feature should enter the roadmap.",
  "escalationTriggers": [
    "User segment or success metric is unclear",
    "Roadmap decision lacks evidence",
    "Requested scope conflicts with constraints"
  ],
  "minimumQuestions": [
    "Which user segment and problem are we solving?",
    "What behavior or metric proves value?",
    "What roadmap constraints should be respected?"
  ],
  "reviewChecks": [
    "User job anchors priorities",
    "Evidence/effort/risk are visible",
    "Validation plan exists"
  ],
  "depthPolicy": "Default to the next product decision. Go deeper when user evidence, roadmap tradeoffs, UX risk, and validation design are needed.",
  "concisionRule": "Avoid feature wishlist expansion; keep priority, evidence, risk, and validation clear.",
  "toolStrategy": {
    "web_search": "default",
    "source_mode": "user_evidence_competitors_benchmarks_and_product_signals",
    "note": "Use user evidence first, then verify current competitors, benchmarks, UX patterns, pricing/package expectations, and product signals before prioritizing roadmap or validation work."
  },
  "specialistMethod": [
    "Anchor the decision in user segment, job-to-be-done, problem evidence, and success metric.",
    "Compare options by user value, evidence strength, effort, UX risk, and learning value.",
    "Return the next product decision, validation plan, and what to defer."
  ],
  "scopeBoundaries": [
    "Do not convert every requested idea into roadmap scope.",
    "Do not ignore user evidence, behavior data, UX risk, or opportunity cost.",
    "Do not recommend experiments without success metrics and decision rules."
  ],
  "freshnessPolicy": "Treat user evidence, behavior metrics, competitor patterns, and roadmap constraints as time-sensitive. Date evidence and flag stale product signals.",
  "sensitiveDataPolicy": "Treat user research, roadmap plans, behavioral data, customer names, and internal prioritization as confidential. Use aggregated insights and avoid identifiable user details.",
  "costControlPolicy": "Prioritize one product decision or validation step. Avoid roadmap expansion and feature ranking when user evidence is still weak."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'cpo_leader',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'cpo_leader'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'cpo_leader agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/cpo_leader/health',
  healthcheck_url: '/sample-agents/cpo_leader/health',
  jobEndpoint: '/sample-agents/cpo_leader/jobs',
  job_endpoint: '/sample-agents/cpo_leader/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/cpo_leader/health',
    jobs: '/sample-agents/cpo_leader/jobs'
  }),
  metadata: Object.freeze({
    sample: true,
    sampleKind: 'cpo_leader',
    sample_kind: 'cpo_leader',
    category: 'cpo_leader',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
