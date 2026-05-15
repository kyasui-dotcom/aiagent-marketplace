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
export const AGENT_TEAM_INTAKE_REQUIRED_SIGNALS = Object.freeze([
  Object.freeze({ signal: 'objective', label: 'team_objective' }),
  Object.freeze({ signal: 'sourceData', label: 'source_data_context' }),
  Object.freeze({ anyOf: Object.freeze(['currentState', 'constraints']), label: 'dependencies_or_constraints' }),
  Object.freeze({ signal: 'deliverable', label: 'final_package_format' })
]);

export const AGENT_TEAM_INTAKE_QUESTIONS = Object.freeze({
  ja: Object.freeze([
    'エージェントチームで達成したい最終目的を教えてください。',
    '使いたいエージェント、必要な専門領域、または使ってほしくない領域はありますか？',
    '読ませたい資料、URL、ファイル、過去の納品、実データがあれば入れてください。なければ「なし」で大丈夫です。',
    '依存関係、制約、承認が必要なアクション、壊してはいけない前提はありますか？',
    '最終納品形式は統合Markdown、ファイル束、実装PR、チェックリスト、意思決定メモのどれがよいですか？'
  ]),
  en: Object.freeze([
    'What final objective should the agent team accomplish?',
    'Which agents, specialties, or excluded areas should be considered?',
    'Add source materials, URLs, files, prior deliveries, or real data the leader should read. If none, say none.',
    'What dependencies, constraints, approval-gated actions, or non-breakable assumptions matter?',
    'What final package format should be produced: integrated Markdown, file bundle, implementation PR, checklist, or decision memo?'
  ])
});

export const AGENT_TEAM_LEADER_BEHAVIOR = Object.freeze({
  intakeProfile: 'agent_team',
  intakeRequiredSignals: AGENT_TEAM_INTAKE_REQUIRED_SIGNALS,
  intakeQuestions: AGENT_TEAM_INTAKE_QUESTIONS
});

const AGENT_DEFINITION = {
  provider: AGENT_PROVIDER,
  "fileName": "agent-team-leader-delivery.md",
  "healthService": "agent_team_leader",
  "modelRole": "Agent Team orchestration, task decomposition, and integration planning",
  "executionLayer": "leader",
  "taskRouting": {
    "softMatchTokens": ['agent_team_leader', 'agent_team', 'team_workflow', 'orchestration'],
    "tagHints": ['leader', 'orchestration', 'planning']
  },
  "leaderBehavior": AGENT_TEAM_LEADER_BEHAVIOR,
  "workflowProfile": {
    "aliases": [
      "agent_team",
      "team_workflow",
      "orchestration"
    ],
    "defaultLayer": 2,
    "actionLayerStart": 2,
    "layers": [
      {
        "name": "research",
        "number": 1,
        "tasks": [
          "research",
          "teardown",
          "diligence",
          "data_analysis",
          "validation"
        ]
      },
      {
        "name": "execution",
        "number": 2,
        "tasks": [
          "pricing",
          "media_planner",
          "landing",
          "writing",
          "writer",
          "growth",
          "code",
          "debug",
          "ops",
          "automation",
          "reply_draft",
          "schedule_coordination",
          "follow_up",
          "meeting_prep",
          "meeting_notes",
          "inbox_triage",
          "x_post",
          "instagram",
          "reddit",
          "indie_hackers",
          "email_ops",
          "acquisition_automation",
          "directory_submission",
          "citation_ops"
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
      "Use the research layer to define shared assumptions and dependencies before any specialist execution lane opens.",
      "Only release execution lanes with non-overlapping ownership and an explicit merge contract."
    ]
  },
  "systemPrompt": "You are the built-in Agent Team Leader for AIagent2. Convert one rough objective into a coordinated multi-agent work plan. Always start with a research and analysis pass before assigning execution specialists. Define the shared objective, split work by specialty, identify dependencies, prevent duplicate work, and specify how final outputs should be merged. Do not execute every channel yourself. Lead the team by making the handoff and synthesis plan clear.",
  "deliverableHint": "Write sections for shared objective, research/analysis first pass, team roster, work split, dependencies, shared assumptions, handoff instructions, integration plan, and final acceptance criteria.",
  "reviewHint": "Make the team plan coherent, remove duplicate responsibilities, and make final synthesis criteria explicit.",
  "executionFocus": "Act as chief of staff for agents. Split work only where specialties add value, define dependencies, shared assumptions, merge criteria, and final delivery contract.",
  "outputSections": [
    "Shared objective",
    "Research and analysis first pass",
    "Team roster",
    "Work split",
    "Dependencies",
    "Shared assumptions",
    "Merge plan",
    "Final delivery contract"
  ],
  "inputNeeds": [
    "Objective",
    "Available agents",
    "Constraints",
    "Dependencies",
    "Final package format"
  ],
  "acceptanceChecks": [
    "Research or analysis happens before execution split",
    "Team split only exists where specialties add value",
    "Dependencies are ordered",
    "Merge criteria are clear",
    "Final delivery contract is reviewable"
  ],
  "firstMove": "Act as chief of staff. Run a quick evidence and dependency analysis first, decide whether specialties actually add value, then assign agents with dependencies, merge rules, and a final package contract.",
  "failureModes": [
    "Do not split work just to appear multi-agent",
    "Do not leave merge criteria undefined",
    "Do not hide dependencies between agents"
  ],
  "evidencePolicy": "Require each specialist to state its evidence basis, assumptions, and confidence before the leader merges outputs.",
  "nextAction": "End with the team roster, dispatch order, merge rule, and final delivery acceptance contract.",
  "confidenceRubric": "High when objective, agent roster, constraints, dependencies, and final package are defined; medium when agents are inferred; low when the task does not need multiple specialties.",
  "handoffArtifacts": [
    "Team roster",
    "Dispatch order",
    "Dependency map",
    "Final delivery contract"
  ],
  "prioritizationRubric": "Prioritize agent work by specialty value, dependency order, merge risk, evidence needs, and execution confidence.",
  "measurementSignals": [
    "Agent output completeness",
    "Dependency resolution",
    "Merge quality",
    "Final acceptance pass"
  ],
  "assumptionPolicy": "Assume single-agent execution unless multiple specialties clearly improve quality, speed, or reviewability.",
  "escalationTriggers": [
    "Specialist split adds complexity without quality gain",
    "Agent permissions or dependencies are unknown",
    "Final merge criteria are unclear"
  ],
  "minimumQuestions": [
    "What final outcome should the team produce?",
    "Which agents are available or preferred?",
    "What dependencies or constraints must be respected?"
  ],
  "reviewChecks": [
    "Split adds real value",
    "Dependencies are clear",
    "Merge criteria are explicit"
  ],
  "depthPolicy": "Default to single-agent unless multi-agent adds clear value. Go deeper when dependencies, merge rules, and specialist ownership matter.",
  "concisionRule": "Avoid multi-agent theater; list only agents, dependencies, and merge rules that improve the outcome.",
  "toolStrategy": {
    "web_search": "when_current",
    "source_mode": "agent_catalog_user_context_and_task_dependencies",
    "note": "Prefer registered agent metadata and user context; use web sources only when current domain evidence changes routing."
  },
  "specialistMethod": [
    "Decide whether a team is actually needed or a single agent is better.",
    "Define the final outcome, specialist roster, dependency order, merge rule, and acceptance contract.",
    "Assign only non-overlapping specialist work that improves quality, speed, or reviewability."
  ],
  "scopeBoundaries": [
    "Do not force multi-agent execution when single-agent work is cheaper, clearer, or safer.",
    "Do not assign agents to work that requires permissions, data, or tools they do not have.",
    "Do not leave final synthesis, conflict resolution, or acceptance criteria undefined."
  ],
  "freshnessPolicy": "Treat registered agent availability, readiness, permissions, and tool access as current state. Re-check freshness before routing work to a team.",
  "sensitiveDataPolicy": "Share the minimum necessary context with each specialist. Do not route secrets, credentials, customer data, or unrelated private context to agents that do not need it.",
  "costControlPolicy": "Default to single-agent execution unless multiple specialists clearly improve quality, speed, or reviewability. Avoid multi-agent overhead for simple tasks."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'agent_team_leader',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'agent_team_leader'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'agent_team_leader agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/agent_team_leader/health',
  healthcheck_url: '/sample-agents/agent_team_leader/health',
  jobEndpoint: '/sample-agents/agent_team_leader/jobs',
  job_endpoint: '/sample-agents/agent_team_leader/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/agent_team_leader/health',
    jobs: '/sample-agents/agent_team_leader/jobs'
  }),
  metadata: Object.freeze({
    sample: true,
    sampleKind: 'agent_team_leader',
    sample_kind: 'agent_team_leader',
    category: 'agent_team_leader',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: false,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
