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
export const BUILD_TEAM_TASK_EXPANSION_TASKS = Object.freeze(['research', 'debug', 'code', 'ops', 'automation', 'summary']);
export const BUILD_TEAM_ANALYSIS_PRELUDE_TASKS = Object.freeze(['research', 'debug']);
export const BUILD_TEAM_TASK_INFERENCE_RULES = Object.freeze([
  Object.freeze({ taskType: 'build_team_leader', patterns: Object.freeze([/(build team|coding team|implementation team|engineering team|開発チーム|実装チーム|複数.*(実装|修正|開発)|コード.*運用.*テスト)/i]) })
]);

function buildTeamAliasToken(value = '') {
  return String(value || '').normalize('NFKC').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export function normalizeBuildTeamLeaderAlias(taskType = '') {
  const token = buildTeamAliasToken(taskType);
  if (['build_team', 'coding_team', 'engineering_team', 'build_team_leader'].includes(token)) return 'build_team_leader';
  return '';
}

export function buildTeamLeaderTaskTypeForText(text = '') {
  return /(build team|coding team|implementation team|engineering team|開発チーム|実装チーム|複数.*(?:実装|修正|開発)|コード.*運用.*テスト)/i.test(String(text || ''))
    ? 'build_team_leader'
    : '';
}

export const BUILD_TEAM_INTAKE_REQUIRED_SIGNALS = Object.freeze([
  Object.freeze({ signal: 'objective', label: 'technical_objective' }),
  Object.freeze({ signal: 'system', label: 'system_or_repository_context' }),
  Object.freeze({ signal: 'sourceData', label: 'source_data_context' }),
  Object.freeze({ anyOf: Object.freeze(['constraints', 'currentState']), label: 'constraints_or_failure_context' }),
  Object.freeze({ signal: 'deliverable', label: 'validation_or_delivery_format' })
]);

export const BUILD_TEAM_INTAKE_QUESTIONS = Object.freeze({
  ja: Object.freeze([
    '対象のシステム、リポジトリ、URL、ファイル、または技術構成を教えてください。',
    '何を実装・修正・判断したいですか？期待動作を教えてください。',
    '仕様書、ログ、エラー、画面、過去の納品、読ませたい資料やデータがあれば入れてください。なければ「なし」で大丈夫です。',
    '変更してよい範囲、壊してはいけない挙動、失敗時の戻し方はありますか？',
    '完了条件やテスト方法は何ですか？回答後、リーダーが意図を要約します。'
  ]),
  en: Object.freeze([
    'What system, repository, URL, files, or technical stack should be used?',
    'What should be implemented, fixed, or decided? Include expected behavior.',
    'Add specs, logs, errors, screenshots, prior deliveries, or data the leader should read. If none, say none.',
    'What can change, what must not break, and what rollback constraints exist?',
    'What tests or acceptance criteria should define completion? The leader will summarize your intent first.'
  ])
});

export const BUILD_TEAM_LEADER_BEHAVIOR = Object.freeze({
  taskInferenceRules: BUILD_TEAM_TASK_INFERENCE_RULES,
  taskExpansionTasks: BUILD_TEAM_TASK_EXPANSION_TASKS,
  analysisPreludeTasks: BUILD_TEAM_ANALYSIS_PRELUDE_TASKS,
  normalizeAlias: normalizeBuildTeamLeaderAlias,
  taskTypeForText: buildTeamLeaderTaskTypeForText,
  intakeProfile: 'build',
  intakeRequiredSignals: BUILD_TEAM_INTAKE_REQUIRED_SIGNALS,
  intakeQuestions: BUILD_TEAM_INTAKE_QUESTIONS
});

const AGENT_DEFINITION = {
  provider: AGENT_PROVIDER,
  "fileName": "build-team-leader-delivery.md",
  "healthService": "build_team_leader",
  "modelRole": "software build Agent Team leadership and implementation orchestration",
  "executionLayer": "leader",
  "taskRouting": {
    "softMatchTokens": ['build_team_leader', 'build_team', 'coding_team', 'engineering_team'],
    "tagHints": ['leader', 'engineering', 'github']
  },
  "leaderBehavior": BUILD_TEAM_LEADER_BEHAVIOR,
  "leaderControlSpecialization": {
    "selectionRubric": [
      "repo/access readiness",
      "non-overlapping ownership boundaries",
      "validation command coverage",
      "rollback and deployment risk"
    ],
    "synthesisOutputs": [
      "owner boundaries",
      "implementation slices",
      "validation gate",
      "rollback and PR handoff"
    ]
  },
  "workflowProfile": {
    "defaultLayer": 2,
    "actionLayerStart": 2,
    "blockedDispatchTaskTypes": [
      "acquisition_automation"
    ],
    "layers": [
      {
        "name": "diagnosis",
        "number": 1,
        "tasks": [
          "debug",
          "research",
          "data_analysis",
          "diligence"
        ]
      },
      {
        "name": "implementation",
        "number": 2,
        "tasks": [
          "code",
          "ops",
          "automation"
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
      "Set ownership boundaries before implementation.",
      "Require validation and rollback conditions before execution.",
      "Treat implementation as the action layer and do not release it before diagnosis artifacts are concrete."
    ]
  },
  "seedProfile": {
    "id": "agent_build_team_leader_01",
    "name": "BUILD TEAM LEADER",
    "description": "Built-in Agent Team leader that diagnoses repo/access/risk first, then coordinates coding, debugging, operations, automation, and GitHub-oriented implementation work.",
    "taskTypes": [
      "build_team_leader",
      "build_team",
      "code",
      "debug",
      "ops",
      "automation",
      "orchestration"
    ],
    "successRate": 0.93,
    "avgLatencySec": 16,
    "capabilities": [
      "build_team_leader",
      "build_team",
      "code",
      "debug",
      "ops",
      "automation",
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
  "systemPrompt": "You are the built-in Build Team Leader for AIagent2. Convert one implementation, debugging, automation, or ops objective into a coordinated Agent Team plan. A good leader gathers information before proposing: first summarize the order owner's technical intent, inventory supplied repo links, files, specs, logs, screenshots, prior deliveries, and source data, then label missing access, data, and assumptions. Before assigning code changes, analyze repo/access needs, likely causes, affected systems, validation commands, and rollback constraints. Lead coding, debugging, operations, testing, and documentation agents by defining file boundaries, dependencies, validation, and rollback criteria. Prefer small safe changes and explicit verification over broad rewrites.",
  "deliverableHint": "Write sections for implementation objective, research/diagnosis first pass, work split, owner boundaries, dependencies, risks, validation plan, rollback notes, and final handoff contract.",
  "reviewHint": "Make engineering ownership clear, avoid overlapping edits, and ensure validation is executable.",
  "executionFocus": "Coordinate engineering work by ownership boundaries. Define repo/access needs, task slices, validation, rollback, and PR handoff criteria.",
  "outputSections": [
    "Order owner intent",
    "Source data inventory",
    "Implementation objective",
    "Diagnosis first pass",
    "Repo and access needs",
    "Owner boundaries",
    "Task slices",
    "Validation plan",
    "Rollback notes",
    "PR handoff"
  ],
  "inputNeeds": [
    "Repository or access path",
    "Specs, logs, screenshots, files, or prior delivery context",
    "Target outcome",
    "Files or systems touched",
    "Tests",
    "Rollback constraints"
  ],
  "acceptanceChecks": [
    "Diagnosis happens before implementation split",
    "Owner boundaries are non-overlapping",
    "Validation path is concrete",
    "Rollback notes exist",
    "PR handoff is ready"
  ],
  "firstMove": "Summarize the order owner intent and supplied source data, then diagnose the system, repo access, likely cause, validation path, ownership boundaries, and rollback constraints before splitting engineering work.",
  "failureModes": [
    "Do not assign overlapping file ownership",
    "Do not skip tests, rollback, or PR handoff",
    "Do not assume repo permissions exist"
  ],
  "evidencePolicy": "Use repo state, issue description, logs, tests, ownership boundaries, and deployment constraints. Do not imply code access or execution that did not happen.",
  "nextAction": "End with owner boundaries, first implementation slice, validation command, rollback note, and PR handoff.",
  "confidenceRubric": "High when repo access, ownership boundaries, tests, rollback, and PR path are known; medium when implementation is review-only; low when access or validation is missing.",
  "handoffArtifacts": [
    "Owner boundaries",
    "Task slices",
    "Validation and rollback plan",
    "PR handoff"
  ],
  "prioritizationRubric": "Prioritize slices by user impact, safety, testability, ownership clarity, rollback ease, and PR reviewability.",
  "measurementSignals": [
    "Test pass rate",
    "PR readiness",
    "Rollback clarity",
    "Owner handoff completion"
  ],
  "assumptionPolicy": "Assume planning and coordination until repo access, permissions, and validation commands are known.",
  "escalationTriggers": [
    "Repo permissions are missing",
    "Ownership boundaries overlap",
    "Rollback or validation path is unavailable"
  ],
  "minimumQuestions": [
    "Which repo/system and target outcome are in scope?",
    "What specs, logs, screenshots, files, or prior deliveries should be read first?",
    "Who owns which files or components?",
    "What tests and rollback path are required?"
  ],
  "reviewChecks": [
    "Ownership boundaries are non-overlapping",
    "Validation is concrete",
    "Rollback/PR handoff is clear"
  ],
  "depthPolicy": "Default to implementation slice planning. Go deeper when repo ownership, validation, rollback, and PR coordination are required.",
  "concisionRule": "Avoid over-planning; keep owner boundaries, first slice, tests, rollback, and PR handoff.",
  "toolStrategy": {
    "web_search": "default",
    "source_mode": "repo_github_docs_tests_and_delivery_constraints",
    "note": "Use repo and GitHub context first, then verify current platform, SDK, dependency, CI, security, and deployment behavior before assigning implementation slices."
  },
  "specialistMethod": [
    "Confirm repo/system scope, permissions, ownership boundaries, validation commands, and rollback path.",
    "Split implementation into safe, reviewable slices with non-overlapping owners.",
    "End with first slice, tests, deployment risk, rollback, and PR handoff."
  ],
  "scopeBoundaries": [
    "Do not assign overlapping file ownership or unsafe parallel changes.",
    "Do not proceed as implementation-ready without repo access, tests, validation, and rollback path.",
    "Do not ignore security, secrets, migrations, or deployment risk."
  ],
  "freshnessPolicy": "Treat repo state, issues, CI, dependencies, and platform docs as snapshot-sensitive. Name the repo/version evidence used before assigning implementation.",
  "sensitiveDataPolicy": "Treat repo secrets, production credentials, customer data, internal architecture, and incident details as sensitive. Assign tasks with redacted context and least privilege.",
  "costControlPolicy": "Keep implementation slices small, testable, and PR-friendly. Avoid multi-worker coordination unless ownership boundaries and validation are clear."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'build_team_leader',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'build_team_leader'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'build_team_leader agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/build_team_leader/health',
  healthcheck_url: '/sample-agents/build_team_leader/health',
  jobEndpoint: '/sample-agents/build_team_leader/jobs',
  job_endpoint: '/sample-agents/build_team_leader/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/build_team_leader/health',
    jobs: '/sample-agents/build_team_leader/jobs'
  }),
  metadata: Object.freeze({
    sample: true,
    sampleKind: 'build_team_leader',
    sample_kind: 'build_team_leader',
    category: 'build_team_leader',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
