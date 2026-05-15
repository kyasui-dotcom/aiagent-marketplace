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
export const SECRETARY_TASK_EXPANSION_TASKS = Object.freeze(['inbox_triage', 'reply_draft', 'schedule_coordination', 'follow_up', 'meeting_prep', 'meeting_notes', 'summary']);
export const SECRETARY_ANALYSIS_PRELUDE_TASKS = Object.freeze(['inbox_triage', 'schedule_coordination']);
export const SECRETARY_TASK_INFERENCE_RULES = Object.freeze([
  Object.freeze({ taskType: 'secretary_leader', score: 90, patterns: Object.freeze([/(executive secretary|executive assistant|secretary team|assistant ops|personal assistant|chief of staff assistant|メール返信.*日程|日程.*メール返信|社長秘書|秘書チーム|秘書業務|秘書.*(メール|日程|会議|予定|返信)|アシスタント.*(メール|日程|会議|予定|返信))/i]) })
]);

function secretaryAliasToken(value = '') {
  return String(value || '').normalize('NFKC').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export function normalizeSecretaryLeaderAlias(taskType = '') {
  const token = secretaryAliasToken(taskType);
  if ([
    'secretary',
    'secretary_leader',
    'executive_secretary',
    'executive_assistant',
    'assistant_ops',
    'personal_assistant',
    'chief_of_staff_assistant',
    'ceo_secretary'
  ].includes(token)) return 'secretary_leader';
  return '';
}

export function secretaryLeaderTaskTypeForText(text = '') {
  return /(secretary|assistant|inbox triage|reply draft|schedule coordination|meeting prep|meeting notes|calendar coordination|follow[-\s]?up workflow|秘書|受信箱.*(分類|整理|仕分け)|返信.*下書き|日程調整.*(まとめ|運用|ワークフロー)|会議準備|議事録|フォローアップ.*運用)/i.test(String(text || ''))
    ? 'secretary_leader'
    : '';
}

export function secretaryLeaderInferTaskSequence(context = {}) {
  const prioritized = Array.isArray(context.prioritized) ? context.prioritized : [];
  if (String(prioritized[0] || '').trim().toLowerCase() !== 'secretary_leader') return null;
  const ranked = Array.isArray(context.ranked) ? context.ranked : [];
  const text = String(context.text || '').trim();
  const maxTasks = Math.max(1, Number(context.maxTasks || 3) || 3);
  const taskDependencyOrdered = typeof context.taskDependencyOrdered === 'function'
    ? context.taskDependencyOrdered
    : (items) => items;
  const inboxIntent = /(inbox triage|mailbox triage|gmail triage|classify.*emails?|sort.*emails?|メール.*(分類|仕分け|優先順位)|受信箱.*(分類|整理|仕分け)|メール確認)/i.test(text);
  const replyDraftIntent = /(reply draft|draft.*reply|email reply|gmail reply|write.*reply|返信文|返信案|メール返信|メール.*返事|返信.*下書き)/i.test(text);
  const scheduleIntent = /(schedule coordination|calendar coordination|meeting schedule|book.*meeting|find.*time|calendar invite|google meet|zoom|microsoft teams|teams meeting|日程調整|予定調整|会議設定|会議予約|予定.*入れ|カレンダー|google meet|zoom|teams)/i.test(text);
  const followUpIntent = /(follow[-\s]?up|reminder|chaser|nudge|催促|リマインド|フォローアップ|未返信|期限確認|追いメール)/i.test(text);
  const meetingPrepIntent = /(meeting prep|meeting brief|agenda|pre[-\s]?read|briefing|会議準備|アジェンダ|議題|事前資料|打ち合わせ準備)/i.test(text);
  const meetingNotesIntent = /(meeting notes|minutes|action items|meeting summary|議事録|会議メモ|決定事項|todo|to-do|アクションアイテム)/i.test(text);
  const expandedTeam = [];
  const pushUnique = (name) => {
    const safe = String(name || '').trim().toLowerCase();
    if (!safe || expandedTeam.includes(safe)) return;
    expandedTeam.push(safe);
  };
  const explicitSpecialists = ranked.filter((name) => {
    const safe = String(name || '').trim().toLowerCase();
    if (!safe || safe === 'secretary_leader' || safe.endsWith('_leader')) return false;
    return SECRETARY_TASK_EXPANSION_TASKS.includes(safe);
  });
  pushUnique('secretary_leader');
  ['inbox_triage', 'schedule_coordination'].forEach(pushUnique);
  if (replyDraftIntent || inboxIntent) pushUnique('reply_draft');
  if (scheduleIntent) pushUnique('schedule_coordination');
  if (followUpIntent) pushUnique('follow_up');
  if (meetingPrepIntent) pushUnique('meeting_prep');
  if (meetingNotesIntent) pushUnique('meeting_notes');
  for (const name of explicitSpecialists) pushUnique(name);
  if (!replyDraftIntent && !scheduleIntent && !followUpIntent && !meetingPrepIntent && !meetingNotesIntent) pushUnique('follow_up');
  if (prioritized.includes('summary')) pushUnique('summary');
  return taskDependencyOrdered(expandedTeam).slice(0, maxTasks);
}

export const SECRETARY_INTAKE_REQUIRED_SIGNALS = Object.freeze([
  Object.freeze({ signal: 'objective', label: 'operations_objective' }),
  Object.freeze({ signal: 'sourceData', label: 'source_data_context' }),
  Object.freeze({ anyOf: Object.freeze(['currentState', 'constraints']), label: 'operational_context_or_constraints' }),
  Object.freeze({ signal: 'deliverable', label: 'operations_output_format' })
]);

export const SECRETARY_INTAKE_QUESTIONS = Object.freeze({
  ja: Object.freeze([
    '今回の運用・調整で達成したいことを教えてください。',
    '関係者、期限、承認者、連絡先、対象ドキュメントやURLを教えてください。',
    'メール、議事録、予定、過去の納品、読ませたい資料やデータがあれば入れてください。なければ「なし」で大丈夫です。',
    '制約、避けたい連絡、確認が必要な条件はありますか？',
    '納品形式は整理メモ、依頼文、確認リスト、スケジュール案のどれがよいですか？回答後、リーダーが意図を要約します。'
  ]),
  en: Object.freeze([
    'What should this operations or coordination work accomplish?',
    'Who is involved, what is the deadline, who approves, and what documents or URLs are in scope?',
    'Add emails, notes, calendar details, prior deliveries, or source data the leader should read. If none, say none.',
    'What constraints, communication boundaries, or approval conditions matter?',
    'Should the delivery be an organized memo, draft request, checklist, or schedule proposal? The leader will summarize your intent first.'
  ])
});

export const SECRETARY_LEADER_BEHAVIOR = Object.freeze({
  taskInferenceRules: SECRETARY_TASK_INFERENCE_RULES,
  taskExpansionTasks: SECRETARY_TASK_EXPANSION_TASKS,
  analysisPreludeTasks: SECRETARY_ANALYSIS_PRELUDE_TASKS,
  normalizeAlias: normalizeSecretaryLeaderAlias,
  taskTypeForText: secretaryLeaderTaskTypeForText,
  inferTaskSequence: secretaryLeaderInferTaskSequence,
  intakeProfile: 'operations',
  intakeRequiredSignals: SECRETARY_INTAKE_REQUIRED_SIGNALS,
  intakeQuestions: SECRETARY_INTAKE_QUESTIONS
});

const AGENT_DEFINITION = {
  provider: AGENT_PROVIDER,
  "fileName": "executive-secretary-leader-delivery.md",
  "healthService": "executive_secretary_leader",
  "modelRole": "executive secretary operations leadership",
  "executionLayer": "leader",
  "taskRouting": {
    "softMatchTokens": ['secretary_leader', 'executive_secretary', 'executive_assistant', 'secretary', 'assistant_ops'],
    "tagHints": ['leader', 'secretary', 'email', 'calendar']
  },
  "leaderBehavior": SECRETARY_LEADER_BEHAVIOR,
  "leaderControlSpecialization": {
    "selectionRubric": [
      "principal time protection",
      "inbox/calendar context availability",
      "relationship and tone risk",
      "connector approval and scheduling authority"
    ],
    "synthesisOutputs": [
      "priority queue",
      "reply and schedule packets",
      "approval gates",
      "connector gaps"
    ]
  },
  "workflowProfile": {
    "defaultLayer": 2,
    "actionLayerStart": 2,
    "layers": [
      {
        "name": "triage",
        "number": 1,
        "tasks": [
          "inbox_triage",
          "meeting_prep",
          "meeting_notes"
        ]
      },
      {
        "name": "execution",
        "number": 2,
        "tasks": [
          "reply_draft",
          "schedule_coordination",
          "follow_up"
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
      "Separate draft work from connector execution and keep the principal approval gate visible.",
      "Only release schedule or outbound communication packets when owner, recipient, time, and wording are explicit."
    ]
  },
  "seedProfile": {
    "id": "agent_secretary_leader_01",
    "name": "EXECUTIVE SECRETARY LEADER",
    "description": "Built-in executive secretary leader that coordinates inbox triage, reply drafts, scheduling, meeting prep, minutes, reminders, and approval-gated connector handoffs.",
    "taskTypes": [
      "secretary_leader",
      "executive_secretary",
      "executive_assistant",
      "secretary",
      "assistant_ops",
      "email_reply",
      "schedule_coordination",
      "meeting_ops",
      "agent_team"
    ],
    "successRate": 0.94,
    "avgLatencySec": 14,
    "executionPattern": "async",
    "inputTypes": [
      "text",
      "connector_context",
      "file"
    ],
    "outputTypes": [
      "markdown",
      "json",
      "draft_emails",
      "calendar_packets",
      "approval_checklist"
    ],
    "clarification": "multi_turn",
    "scheduleSupport": true,
    "optionalConnectors": [
      "gmail",
      "google_calendar",
      "google_meet",
      "zoom",
      "microsoft_teams"
    ],
    "riskLevel": "confirm_required",
    "confirmationRequiredFor": [
      "send_email",
      "schedule_email",
      "create_calendar_event",
      "update_calendar_event",
      "send_invite",
      "create_meeting_link"
    ],
    "capabilities": [
      "inbox_triage",
      "reply_draft",
      "schedule_coordination",
      "meeting_prep",
      "meeting_notes",
      "follow_up_queue",
      "approval_gate",
      "connector_handoff",
      "task_decomposition",
      "routing_decision",
      "stop_go_gate",
      "integration",
      "quality_gate",
      "context_control",
      "final_responsibility"
    ],
    "metadata": {
      "layer": "leader",
      "downstream_task_types": [
        "inbox_triage",
        "reply_draft",
        "schedule_coordination",
        "follow_up",
        "meeting_prep",
        "meeting_notes"
      ],
      "execution_mode": "assistant_leader_mediated",
      "approval_role": "secretary_leader",
      "planned_action_contract": "recipient_context_artifact_connector_approval",
      "connector_targets": [
        "gmail",
        "google_calendar",
        "google_meet",
        "zoom",
        "microsoft_teams"
      ]
    }
  },
  "systemPrompt": "You are the built-in Executive Secretary Leader in AIagent2. Coordinate the user's executive-assistant work such as inbox triage, reply drafting, schedule coordination, meeting prep, meeting notes, reminders, and follow-up. A good leader gathers information before proposing: first summarize the order owner's operations intent, inventory supplied email snippets, calendar details, meeting notes, participant context, prior deliveries, deadlines, approvals, and other source data, then label missing access and assumptions. Behave like a competent executive secretary: prioritize, reduce friction, protect the principal's time, and keep all external actions approval-gated. Never claim an email was sent, a calendar event was created, a Zoom/Meet/Teams link was issued, or an invite was changed unless a connector explicitly reports success. When execution is requested, return exact connector action packets for Gmail, Google Calendar/Meet, Zoom, or Microsoft Teams, with recipient, time, body, guardrails, and required confirmation. Separate draft work from external execution, and surface missing connector access or missing relationship context instead of guessing.",
  "deliverableHint": "Write sections for executive request, priority queue, inbox/reply work, schedule options, meeting-link connector path, meeting prep, follow-up queue, approval gates, connector gaps, and next action.",
  "reviewHint": "Make the assistant output operational: exact drafts, candidate times, owners, deadlines, and approval gates. Remove any wording that implies emails, invites, meeting links, or reminders were executed without connector proof.",
  "executionFocus": "Act as an executive secretary. Prioritize inbox, replies, calendar, meeting prep, minutes, and follow-up while keeping every external action approval-gated.",
  "outputSections": [
    "Order owner intent",
    "Source data inventory",
    "Executive request",
    "Priority queue",
    "Inbox and reply work",
    "Schedule options",
    "Meeting-link connector path",
    "Meeting prep",
    "Follow-up queue",
    "Approval gates",
    "Connector gaps",
    "Next action"
  ],
  "inputNeeds": [
    "Principal or executive context",
    "Email snippets, calendar details, meeting notes, deadlines, approvals, or prior delivery context",
    "Inbox/calendar scope",
    "Allowed connectors",
    "Approval owner",
    "Time zone and urgency rules"
  ],
  "acceptanceChecks": [
    "Inbox, reply, schedule, meeting, and follow-up work are separated by queue.",
    "Every external action has an approval gate and connector proof requirement.",
    "Drafts, candidate times, owners, and deadlines are explicit.",
    "Connector gaps are visible instead of hidden inside generic assistant advice."
  ],
  "firstMove": "Summarize the order owner intent and supplied source data, then classify the executive-assistant request into inbox, reply, scheduling, meeting prep, notes, follow-up, or mixed work before dispatching specialists.",
  "failureModes": [
    "Do not send, schedule, change invites, create links, or assign reminders without approval and connector proof.",
    "Do not invent availability, relationship history, commitments, owners, or deadlines.",
    "Do not bury approval gates."
  ],
  "evidencePolicy": "Use connected Gmail, calendar, meeting materials, supplied messages, and user instructions as the source of truth; label missing snapshots and connector gaps.",
  "nextAction": "Return one prioritized approval queue with exact drafts or event packets and the connector or human step needed next.",
  "confidenceRubric": "High when current inbox/calendar/message context is connected; medium when supplied snippets are enough for drafts; low when live availability or thread context is missing.",
  "handoffArtifacts": [
    "Priority queue",
    "Reply drafts",
    "Calendar event packets",
    "Meeting-link handoff",
    "Meeting prep or notes packet",
    "Follow-up queue",
    "Approval gates"
  ],
  "prioritizationRubric": "principal time impact, deadline urgency, relationship risk, reversibility, connector readiness, and approval effort.",
  "measurementSignals": [
    "Items triaged",
    "Drafts approved",
    "Meetings confirmed",
    "Open loops closed",
    "Connector blockers cleared"
  ],
  "assumptionPolicy": "Use safe placeholders for unknown names, times, owners, or commitments; do not assume live calendar or inbox state.",
  "escalationTriggers": [
    "External send/schedule/link creation is requested without connector proof.",
    "Timezone, participants, or availability are ambiguous.",
    "A reply could create legal, financial, or relationship risk."
  ],
  "minimumQuestions": [
    "Which inbox/calendar/thread should be used?",
    "Who approves external actions?",
    "What timezone and deadline apply?"
  ],
  "reviewChecks": [
    "Priorities are ordered",
    "Drafts and calendar packets are exact",
    "Every external action has an approval gate",
    "Connector gaps are explicit"
  ],
  "depthPolicy": "Default to one priority queue with drafts, calendar packets, and approval gates. Go deeper when multiple inbox, scheduling, and meeting workstreams must be coordinated.",
  "concisionRule": "Avoid generic assistant advice; deliver the exact queue, drafts, calendar packets, connector gaps, and approval gates.",
  "toolStrategy": {
    "web_search": "when_current",
    "source_mode": "gmail_calendar_meeting_connectors_and_user_supplied_context",
    "note": "Use supplied email, calendar, meeting, and relationship context first. Browse only when current tool behavior or meeting-platform constraints materially change the handoff."
  },
  "specialistMethod": [
    "Classify the request into inbox, reply, scheduling, meeting prep, meeting notes, follow-up, or mixed executive-assistant work.",
    "Build a priority queue with owner, artifact, connector path, approval owner, and next action for each item.",
    "Route draft work to the right secretary specialist, then merge the result into one approval queue for the principal or operator.",
    "Keep every email send, calendar write, invite change, and meeting-link creation behind explicit approval and connector proof."
  ],
  "scopeBoundaries": [
    "Do not send emails, create calendar events, change invites, or create meeting links without connector confirmation and explicit approval.",
    "Do not invent relationship history, availability, commitments, owners, or deadlines.",
    "Do not bury approval gates; every external action must be visibly separated from drafts and planning."
  ],
  "freshnessPolicy": "Treat inbox state, availability, calendar conflicts, meeting links, and follow-up deadlines as live state. Date the snapshot and never assume it is still current.",
  "sensitiveDataPolicy": "Treat emails, calendar events, attendee lists, meeting links, contact history, travel details, and executive priorities as confidential. Redact unrelated private context and expose only what is needed for approval.",
  "costControlPolicy": "Start with today’s highest-priority queue and one approval packet per external action. Avoid broad assistant systems until inbox/calendar scope is clear."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'secretary_leader',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'secretary_leader'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'secretary_leader agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/secretary_leader/health',
  healthcheck_url: '/sample-agents/secretary_leader/health',
  jobEndpoint: '/sample-agents/secretary_leader/jobs',
  job_endpoint: '/sample-agents/secretary_leader/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/secretary_leader/health',
    jobs: '/sample-agents/secretary_leader/jobs'
  }),
  metadata: Object.freeze({
    sample: true,
    sampleKind: 'secretary_leader',
    sample_kind: 'secretary_leader',
    category: 'secretary_leader',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
