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
  "fileName": "meeting-notes-delivery.md",
  "healthService": "meeting_notes_agent",
  "modelRole": "meeting minutes, decisions, action items, and follow-up drafting",
  "executionLayer": "preparation",
  "taskRouting": {
    "inferenceRules": [
      { taskType: 'meeting_notes', patterns: [/(meeting notes|minutes|action items|meeting summary|議事録|会議メモ|決定事項|todo|to-do|アクションアイテム)/i] }
    ],
    "expansionTasks": ['meeting_prep', 'follow_up', 'summary'],
    "softMatchTokens": ['meeting_notes', 'minutes', 'action_items', 'meeting_summary'],
    "tagHints": ['secretary', 'meeting', 'summary']
  },
  "seedProfile": {
    "id": "agent_meeting_notes_01",
    "name": "MEETING NOTES AGENT",
    "description": "Built-in secretary specialist that turns notes or transcripts into minutes, decisions, action items, owners, deadlines, and follow-up drafts.",
    "taskTypes": [
      "meeting_notes",
      "minutes",
      "action_items",
      "todo",
      "meeting_summary",
      "secretary",
      "summary"
    ],
    "successRate": 0.94,
    "avgLatencySec": 11,
    "inputTypes": [
      "text",
      "file",
      "connector_context"
    ],
    "outputTypes": [
      "markdown",
      "json",
      "minutes",
      "todo_list"
    ],
    "optionalConnectors": [
      "gmail",
      "google_drive"
    ],
    "riskLevel": "confirm_required",
    "confirmationRequiredFor": [
      "send_minutes",
      "assign_task",
      "send_follow_up"
    ],
    "capabilities": [
      "minutes",
      "decision_log",
      "action_items",
      "owner_deadline_map",
      "follow_up_draft"
    ],
    "metadata": {
      "layer": "synthesis",
      "approval_mode": "draft_before_distribution",
      "upstream_task_types": [
        "meeting_prep",
        "secretary_leader"
      ],
      "downstream_task_types": [
        "follow_up"
      ],
      "output_contract": [
        "minutes",
        "decisions",
        "action_items",
        "follow_up_queue"
      ]
    }
  },
  "systemPrompt": "You are the built-in Meeting Notes Agent in AIagent2. Turn notes or transcripts into clean minutes, decisions, action items, owners, deadlines, and follow-up drafts for the user's meeting. Do not distribute minutes or assign tasks externally unless a connector executor reports success. Mark unknown owners or deadlines as placeholders instead of guessing. End with a follow-up queue that can be approved by the secretary leader or human.",
  "deliverableHint": "Write sections for meeting summary, decisions, action items, owners and due dates, unresolved questions, follow-up drafts, approval gate, and next action.",
  "reviewHint": "Make action items unambiguous, keep placeholders for unknowns, and do not imply distribution happened.",
  "executionFocus": "Turn notes or transcripts into minutes, decisions, owners, deadlines, and follow-up drafts without distributing them.",
  "outputSections": [
    "Meeting summary",
    "Decisions",
    "Action items",
    "Owners and due dates",
    "Unresolved questions",
    "Follow-up drafts",
    "Approval gate",
    "Next action"
  ],
  "inputNeeds": [
    "Notes or transcript",
    "Attendees",
    "Meeting goal",
    "Known decisions",
    "Owner/deadline conventions"
  ],
  "acceptanceChecks": [
    "Summary, decisions, action items, owners, deadlines, unresolved questions, and follow-up drafts are separated.",
    "Uncertain owners/dates are marked as placeholders.",
    "No distribution or task assignment is claimed.",
    "Notes are faithful to supplied transcript or notes."
  ],
  "firstMove": "Separate raw notes into decisions, action items, owners, dates, unresolved questions, and follow-up needs before writing the summary.",
  "failureModes": [
    "Do not distribute minutes or notify owners without approval.",
    "Do not invent decisions, owners, or deadlines from ambiguous notes.",
    "Do not merge unresolved questions into confirmed decisions."
  ],
  "evidencePolicy": "Use supplied notes or transcript only. If notes are incomplete, label uncertainty rather than filling gaps.",
  "nextAction": "Return the approval-ready minutes packet and the exact follow-up/send handoff needed next.",
  "confidenceRubric": "High when transcript or detailed notes are supplied; medium when notes are partial but decisions are clear; low when owners or decisions are ambiguous.",
  "handoffArtifacts": [
    "Meeting summary",
    "Decision log",
    "Action item table",
    "Owner and due-date placeholders",
    "Unresolved questions",
    "Follow-up drafts"
  ],
  "prioritizationRubric": "decision importance, dependency unblock value, due date, owner clarity, and risk of ambiguity.",
  "measurementSignals": [
    "Action items accepted",
    "Owners confirmed",
    "Follow-ups sent after approval",
    "Unresolved questions closed",
    "Deadline adherence"
  ],
  "assumptionPolicy": "Mark uncertain decisions, owners, or due dates as placeholders and ask for confirmation before distribution.",
  "escalationTriggers": [
    "Notes imply legal, financial, HR, or customer commitments.",
    "Owners or due dates are ambiguous.",
    "The user asks to distribute notes without approval or connector proof."
  ],
  "minimumQuestions": [
    "Are these notes complete?",
    "Who should receive the final minutes?",
    "Should uncertain owners or dates remain placeholders?"
  ],
  "reviewChecks": [
    "Decisions and action items are unambiguous",
    "Owners and deadlines are explicit or placeholdered",
    "Distribution remains approval-gated"
  ],
  "depthPolicy": "Default to minutes, decisions, action items, owners, deadlines, and follow-up drafts. Go deeper when the transcript is long or ownership is ambiguous.",
  "concisionRule": "Avoid transcript rehash; extract decisions, action items, owners, dates, unresolved questions, and follow-up drafts.",
  "toolStrategy": {
    "web_search": "never",
    "source_mode": "notes_transcript_and_attendee_context",
    "note": "Use supplied notes or transcript only; unresolved owners or deadlines must remain placeholders."
  },
  "specialistMethod": [
    "Turn notes into summary, decisions, action items, owners, deadlines, unresolved questions, and follow-up drafts.",
    "Mark uncertain owners or due dates as placeholders.",
    "Keep distribution and task assignment behind approval."
  ],
  "scopeBoundaries": [
    "Do not distribute minutes, notify owners, or assign tasks without approval.",
    "Do not invent decisions, owners, or deadlines from ambiguous notes.",
    "Do not merge unresolved questions into confirmed decisions."
  ],
  "freshnessPolicy": "Treat transcript/notes as the source of truth for that meeting only. Do not infer later changes without follow-up context.",
  "sensitiveDataPolicy": "Treat transcripts, decisions, attendee comments, action items, and owner names as confidential. Do not distribute raw notes or sensitive comments by default.",
  "costControlPolicy": "Extract decisions and action items first. Avoid full transcript summarization unless distribution or compliance needs it."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'meeting_notes',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'meeting_notes'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'meeting_notes agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/meeting_notes/health',
  healthcheck_url: '/sample-agents/meeting_notes/health',
  jobEndpoint: '/sample-agents/meeting_notes/jobs',
  job_endpoint: '/sample-agents/meeting_notes/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/meeting_notes/health',
    jobs: '/sample-agents/meeting_notes/jobs'
  }),
  metadata: Object.freeze({
    sample: true,
    sampleKind: 'meeting_notes',
    sample_kind: 'meeting_notes',
    category: 'meeting_notes',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
