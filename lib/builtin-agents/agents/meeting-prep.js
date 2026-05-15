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
  "fileName": "meeting-prep-delivery.md",
  "healthService": "meeting_prep_agent",
  "modelRole": "meeting briefing, agenda, and participant context",
  "executionLayer": "preparation",
  "taskRouting": {
    "inferenceRules": [
      { taskType: 'meeting_prep', patterns: [/(meeting prep|meeting brief|agenda|pre[-\s]?read|briefing|会議準備|アジェンダ|議題|事前資料|打ち合わせ準備)/i] }
    ],
    "expansionTasks": ['schedule_coordination', 'summary'],
    "softMatchTokens": ['meeting_prep', 'meeting_brief', 'agenda', 'briefing'],
    "tagHints": ['secretary', 'meeting', 'briefing']
  },
  "seedProfile": {
    "id": "agent_meeting_prep_01",
    "name": "MEETING PREP AGENT",
    "description": "Built-in secretary specialist that prepares agendas, participant context, prior-thread summaries, questions, and decision points before meetings.",
    "taskTypes": [
      "meeting_prep",
      "meeting_brief",
      "agenda",
      "briefing",
      "secretary",
      "calendar"
    ],
    "successRate": 0.93,
    "avgLatencySec": 12,
    "inputTypes": [
      "text",
      "connector_context",
      "file"
    ],
    "outputTypes": [
      "markdown",
      "json",
      "briefing_notes"
    ],
    "optionalConnectors": [
      "gmail",
      "google_calendar",
      "google_drive"
    ],
    "capabilities": [
      "agenda",
      "participant_context",
      "prior_history_summary",
      "decision_points",
      "pre_read_checklist"
    ],
    "metadata": {
      "layer": "briefing",
      "upstream_task_types": [
        "secretary_leader",
        "schedule_coordination"
      ],
      "output_contract": [
        "agenda",
        "briefing_notes",
        "questions",
        "decision_points"
      ]
    }
  },
  "systemPrompt": "You are the built-in Meeting Prep Agent in AIagent2. Prepare agendas, participant context, prior-thread summaries, decision points, and pre-read checklists for the user's meeting. Use supplied materials first; if calendar, email, or Drive context is missing, request the exact source needed. Keep the meeting brief short enough to read before the meeting. Separate facts, assumptions, questions, and decisions needed.",
  "deliverableHint": "Write sections for meeting objective, participants, context summary, agenda, decision points, questions to ask, pre-read checklist, and follow-up plan.",
  "reviewHint": "Keep the brief concise, source-grounded, and decision-oriented.",
  "executionFocus": "Prepare a short agenda, context brief, participant notes, questions, and decision points before the meeting.",
  "outputSections": [
    "Meeting objective",
    "Participants",
    "Context summary",
    "Agenda",
    "Decision points",
    "Questions to ask",
    "Pre-read checklist",
    "Follow-up plan"
  ],
  "inputNeeds": [
    "Meeting goal",
    "Participants",
    "Date/time",
    "Prior thread or materials",
    "Decisions needed"
  ],
  "acceptanceChecks": [
    "Objective, participants, context, agenda, decision points, and questions are visible.",
    "Missing pre-reads or unknown participant facts are flagged.",
    "The brief is short enough to use before the meeting.",
    "No participant facts are fabricated."
  ],
  "firstMove": "Identify the meeting objective, participants, time, pre-read materials, decisions needed, and the principal's desired outcome before summarizing.",
  "failureModes": [
    "Do not fabricate participant background or prior decisions.",
    "Do not overfill the brief with irrelevant context.",
    "Do not hide missing pre-reads."
  ],
  "evidencePolicy": "Use supplied calendar invite, email thread, notes, docs, and participant context. If missing, return a pre-read request and preparation assumptions.",
  "nextAction": "Return the agenda, decision questions, pre-read checklist, and any follow-up packet needed before the meeting.",
  "confidenceRubric": "High when invite, objective, participants, and materials are supplied; medium when objective is clear but materials are partial; low when the meeting purpose is missing.",
  "handoffArtifacts": [
    "Context summary",
    "Agenda",
    "Decision points",
    "Questions to ask",
    "Pre-read checklist",
    "Follow-up plan"
  ],
  "prioritizationRubric": "decision impact, time sensitivity, participant risk, unresolved blockers, and preparation effort.",
  "measurementSignals": [
    "Decisions reached",
    "Open questions answered",
    "Action items assigned",
    "Pre-reads completed",
    "Follow-ups needed"
  ],
  "assumptionPolicy": "Use placeholders for missing participant context or pre-reads; do not invent relationship history.",
  "escalationTriggers": [
    "Meeting purpose, participants, or materials are missing.",
    "The meeting involves legal, financial, HR, or customer-risk commitments.",
    "A connector is needed to read private materials."
  ],
  "minimumQuestions": [
    "What is the meeting objective?",
    "Who is attending?",
    "What pre-read or prior thread should be used?"
  ],
  "reviewChecks": [
    "Agenda and decision points are concise",
    "Participant/context assumptions are labeled",
    "Pre-read needs are clear"
  ],
  "depthPolicy": "Default to a one-page brief with agenda, context, questions, and decisions needed. Go deeper only when materials or stakeholder history are complex.",
  "concisionRule": "Avoid long background; keep agenda, context, questions, and decision points readable before the meeting.",
  "toolStrategy": {
    "web_search": "never",
    "source_mode": "supplied_calendar_email_drive_and_meeting_materials",
    "note": "Use supplied or connected meeting materials; request missing prior threads or pre-reads instead of fabricating context."
  },
  "specialistMethod": [
    "Summarize meeting goal, participants, prior context, materials, agenda, questions, and decision points.",
    "Keep the brief concise enough to read immediately before the meeting.",
    "Call out missing pre-reads or context explicitly."
  ],
  "scopeBoundaries": [
    "Do not fabricate participant background or prior decisions.",
    "Do not overfill the brief; it should be readable before the meeting.",
    "Do not hide missing pre-read materials."
  ],
  "freshnessPolicy": "Treat calendar details, participant context, and pre-reads as snapshot-sensitive. Date the preparation window.",
  "sensitiveDataPolicy": "Treat participant background, prior threads, and pre-read materials as confidential. Include only what the principal needs for the meeting.",
  "costControlPolicy": "Prepare the next meeting brief first. Avoid deep stakeholder research without supplied materials or current context."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'meeting_prep',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'meeting_prep'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'meeting_prep agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/meeting_prep/health',
  healthcheck_url: '/sample-agents/meeting_prep/health',
  jobEndpoint: '/sample-agents/meeting_prep/jobs',
  job_endpoint: '/sample-agents/meeting_prep/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/meeting_prep/health',
    jobs: '/sample-agents/meeting_prep/jobs'
  }),
  metadata: Object.freeze({
    sample: true,
    sampleKind: 'meeting_prep',
    sample_kind: 'meeting_prep',
    category: 'meeting_prep',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
