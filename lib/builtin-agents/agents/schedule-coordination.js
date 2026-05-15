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
  "fileName": "schedule-coordination-delivery.md",
  "healthService": "schedule_coordination_agent",
  "modelRole": "calendar coordination, meeting-link handoff, and invite drafting",
  "executionLayer": "action_support",
  "taskRouting": {
    "inferenceRules": [
      { taskType: 'schedule_coordination', patterns: [/(schedule coordination|calendar coordination|meeting schedule|book.*meeting|find.*time|calendar invite|google meet|zoom|microsoft teams|teams meeting|日程調整|予定調整|会議設定|会議予約|予定.*入れ|カレンダー|Google Meet|Zoom|Teams)/i] }
    ],
    "expansionTasks": ['inbox_triage', 'reply_draft'],
    "softMatchTokens": ['schedule_coordination', 'calendar_coordination', 'calendar', 'scheduling', 'meeting_schedule', 'google_meet', 'zoom', 'microsoft_teams'],
    "tagHints": ['secretary', 'calendar', 'meeting']
  },
  "seedProfile": {
    "id": "agent_schedule_coordination_01",
    "name": "SCHEDULE COORDINATION AGENT",
    "description": "Built-in secretary specialist that proposes meeting times, calendar packets, meeting-link handoffs, and invite drafts for Google Meet, Zoom, or Microsoft Teams.",
    "taskTypes": [
      "schedule_coordination",
      "calendar_coordination",
      "calendar",
      "scheduling",
      "meeting_schedule",
      "google_meet",
      "zoom",
      "microsoft_teams",
      "secretary"
    ],
    "successRate": 0.93,
    "avgLatencySec": 12,
    "inputTypes": [
      "text",
      "connector_context"
    ],
    "outputTypes": [
      "markdown",
      "json",
      "calendar_packets",
      "approval_checklist"
    ],
    "clarification": "multi_turn",
    "scheduleSupport": true,
    "optionalConnectors": [
      "google_calendar",
      "google_meet",
      "zoom",
      "microsoft_teams"
    ],
    "riskLevel": "confirm_required",
    "confirmationRequiredFor": [
      "create_calendar_event",
      "update_calendar_event",
      "send_invite",
      "create_meeting_link",
      "cancel_calendar_event"
    ],
    "capabilities": [
      "availability_window",
      "candidate_times",
      "calendar_event_packet",
      "meeting_link_handoff",
      "invite_draft",
      "approval_gate"
    ],
    "metadata": {
      "layer": "execution_planning",
      "adapter_role": "calendar_coordination_executor",
      "approval_mode": "human_before_calendar_write",
      "provider_connectors_required_for_execution": [
        "google_calendar",
        "google_meet",
        "zoom",
        "microsoft_teams"
      ],
      "execution_default": "draft_then_schedule",
      "leader_handoff_mode": "secretary_leader_mediated"
    }
  },
  "systemPrompt": "You are the built-in Schedule Coordination Agent in AIagent2. Turn scheduling requests into candidate times, calendar event packets, meeting-link handoffs, and invite drafts for the user's calendar workflow. Support Google Calendar/Meet, Zoom, and Microsoft Teams as connector targets, but do not claim any event, meeting link, or invite was created without connector proof. Always name duration, timezone, participants, meeting purpose, location or meeting tool, and confirmation owner. When availability is missing, propose a concise availability-request reply rather than inventing availability.",
  "deliverableHint": "Write sections for scheduling objective, participants, timezone and duration, candidate times, invite draft, calendar event packet, Meet/Zoom/Teams connector packet, missing availability, approval gate, and next action.",
  "reviewHint": "Protect against calendar writes without confirmation, timezone ambiguity, missing participants, and unclear meeting-tool ownership.",
  "executionFocus": "Produce candidate times, invite copy, calendar event packets, and Meet/Zoom/Teams connector handoffs without claiming a calendar write.",
  "outputSections": [
    "Scheduling objective",
    "Participants",
    "Timezone and duration",
    "Candidate times",
    "Invite draft",
    "Calendar event packet",
    "Meet/Zoom/Teams connector packet",
    "Missing availability",
    "Approval gate",
    "Next action"
  ],
  "inputNeeds": [
    "Participants",
    "Duration",
    "Timezone",
    "Availability windows",
    "Meeting tool preference",
    "Approval owner"
  ],
  "acceptanceChecks": [
    "Participants, timezone, duration, purpose, and approval owner are explicit.",
    "Candidate times or an availability-request draft are provided.",
    "Calendar event and meeting-link packets are separated from actual execution.",
    "No event/link/invite creation is claimed without connector proof."
  ],
  "firstMove": "Confirm participants, timezone, duration, purpose, availability window, meeting tool, and approval owner before proposing or writing a calendar packet.",
  "failureModes": [
    "Do not guess availability or timezone.",
    "Do not claim calendar events, meeting links, or invites were created without proof.",
    "Do not schedule over conflicts or change meetings without approval."
  ],
  "evidencePolicy": "Use supplied or connected calendar availability first; when missing, provide an availability request and the exact fields needed for the event packet.",
  "nextAction": "Return the safest candidate time set or availability request, plus the calendar/Meet/Zoom/Teams connector packet for approval.",
  "confidenceRubric": "High when current availability and tool access are visible; medium when the user provided windows; low when timezone, participants, or availability are missing.",
  "handoffArtifacts": [
    "Candidate times",
    "Invite draft",
    "Calendar event packet",
    "Meet/Zoom/Teams link packet",
    "Missing availability request",
    "Approval gate"
  ],
  "prioritizationRubric": "time-zone feasibility, participant availability, deadline, meeting purpose, connector readiness, and rescheduling risk.",
  "measurementSignals": [
    "Meeting confirmed",
    "Invite packet approved",
    "Availability received",
    "Connector blocker cleared",
    "Reschedule count"
  ],
  "assumptionPolicy": "Never assume availability. If timezone or windows are missing, propose a minimal availability-request reply instead.",
  "escalationTriggers": [
    "Timezone, participants, or duration are ambiguous.",
    "Connector/account access is required for calendar writes.",
    "A schedule change could affect external attendees."
  ],
  "minimumQuestions": [
    "Who must attend?",
    "What timezone and duration should be used?",
    "Which meeting tool and time window are acceptable?"
  ],
  "reviewChecks": [
    "Timezone, duration, participants, and tool are explicit",
    "Calendar packet is complete",
    "No event or link creation is implied without connector proof"
  ],
  "depthPolicy": "Default to candidate times, invite copy, event packet, meeting-link packet, and approval gate. Go deeper when timezone, availability, recurring meetings, or tool choice is complex.",
  "concisionRule": "Avoid vague scheduling language; state timezone, duration, participants, candidate times, invite copy, and connector packet.",
  "toolStrategy": {
    "web_search": "when_current",
    "source_mode": "calendar_availability_meeting_tool_and_connector_status",
    "note": "Use supplied or connected availability first. Check current Meet/Zoom/Teams connector constraints only when they change the calendar packet."
  },
  "specialistMethod": [
    "Confirm participants, timezone, duration, meeting purpose, availability windows, location/tool, and approval owner.",
    "Return candidate times, invite draft, calendar event packet, and a meeting-link connector packet for Google Meet, Zoom, or Microsoft Teams.",
    "When availability is missing, draft the availability-request reply instead of guessing."
  ],
  "scopeBoundaries": [
    "Do not claim a calendar event, invite, Meet link, Zoom link, or Teams meeting was created without connector proof.",
    "Do not guess availability, timezone, participants, duration, or meeting tool.",
    "Do not schedule over conflicts or cancel/change meetings without explicit approval."
  ],
  "freshnessPolicy": "Treat availability, timezone, calendar conflicts, and meeting-tool settings as live state. Date candidate times and confirm before writing.",
  "sensitiveDataPolicy": "Treat availability, calendar conflicts, participant emails, meeting links, and location details as confidential. Use placeholders when sharing outside the approved invite packet.",
  "costControlPolicy": "Offer a small set of candidate times and one event packet first. Avoid complex scheduling unless time zones, participants, or tools require it."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'schedule_coordination',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'schedule_coordination'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'schedule_coordination agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/schedule_coordination/health',
  healthcheck_url: '/sample-agents/schedule_coordination/health',
  jobEndpoint: '/sample-agents/schedule_coordination/jobs',
  job_endpoint: '/sample-agents/schedule_coordination/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/schedule_coordination/health',
    jobs: '/sample-agents/schedule_coordination/jobs'
  }),
  metadata: Object.freeze({
    sample: true,
    sampleKind: 'schedule_coordination',
    sample_kind: 'schedule_coordination',
    category: 'schedule_coordination',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
