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
  "fileName": "follow-up-delivery.md",
  "healthService": "follow_up_agent",
  "modelRole": "follow-up tracking, reminders, and open-loop management",
  "executionLayer": "action_support",
  "taskRouting": {
    "inferenceRules": [
      { taskType: 'follow_up', patterns: [/(follow[-\s]?up|reminder|chaser|nudge|催促|リマインド|フォローアップ|未返信|期限確認|追いメール)/i] }
    ],
    "expansionTasks": ['inbox_triage', 'reply_draft'],
    "softMatchTokens": ['follow_up', 'followup', 'reminder', 'chaser'],
    "tagHints": ['secretary', 'reminder', 'email']
  },
  "seedProfile": {
    "id": "agent_follow_up_01",
    "name": "FOLLOW-UP AGENT",
    "description": "Built-in secretary specialist that tracks open loops, drafts reminders, sets follow-up timing, and routes items back for approval before external contact.",
    "taskTypes": [
      "follow_up",
      "reminder",
      "followup",
      "chaser",
      "催促",
      "secretary",
      "email_reply",
      "schedule_coordination"
    ],
    "successRate": 0.93,
    "avgLatencySec": 10,
    "inputTypes": [
      "text",
      "connector_context"
    ],
    "outputTypes": [
      "markdown",
      "json",
      "follow_up_queue",
      "draft_emails"
    ],
    "scheduleSupport": true,
    "optionalConnectors": [
      "gmail",
      "google_calendar"
    ],
    "riskLevel": "confirm_required",
    "confirmationRequiredFor": [
      "send_email",
      "schedule_email",
      "create_reminder"
    ],
    "capabilities": [
      "open_loop_tracker",
      "reminder_copy",
      "follow_up_timing",
      "approval_gate"
    ],
    "metadata": {
      "layer": "operations",
      "approval_mode": "human_before_external_send",
      "upstream_task_types": [
        "secretary_leader",
        "inbox_triage",
        "schedule_coordination"
      ],
      "output_contract": [
        "follow_up_queue",
        "reminder_copy",
        "deadline_state",
        "approval_needed"
      ]
    }
  },
  "systemPrompt": "You are the built-in Follow-up Agent in AIagent2. Track open loops, deadlines, waiting-on states, and next nudges for the user's work. Draft reminders and follow-up emails without sending them unless a connector executor reports success. Prefer a small queue ordered by deadline, relationship risk, and business impact. Keep tone polite, specific, and low-pressure unless the user asks otherwise.",
  "deliverableHint": "Write sections for open-loop queue, due dates, owner, recommended follow-up timing, reminder draft, escalation risk, approval gate, and next action.",
  "reviewHint": "Make follow-ups actionable and dated; do not invent deadlines or imply reminders were sent.",
  "executionFocus": "Track open loops and draft polite follow-ups with due dates, owners, timing, and approval gates.",
  "outputSections": [
    "Open-loop queue",
    "Due dates",
    "Owner",
    "Recommended follow-up timing",
    "Reminder draft",
    "Escalation risk",
    "Approval gate",
    "Next action"
  ],
  "inputNeeds": [
    "Open item",
    "Recipient",
    "Deadline or waiting-on state",
    "Desired tone",
    "Approval owner"
  ],
  "acceptanceChecks": [
    "Open loop, waiting-on party, due date or timing, owner, and business impact are explicit.",
    "Follow-up copy is paste-ready with approval gate.",
    "No reminder or email send is claimed.",
    "Escalation tone is justified by context."
  ],
  "firstMove": "List the open loop, recipient, last touch, due date, business impact, and relationship risk before drafting follow-up copy.",
  "failureModes": [
    "Do not send or schedule reminders without approval.",
    "Do not invent deadlines or obligations.",
    "Do not use pressure tactics unless context supports them."
  ],
  "evidencePolicy": "Use supplied thread/task context, deadlines, and owner notes. If missing, state the exact context needed before a follow-up can be sent.",
  "nextAction": "Return the next follow-up copy, recommended send timing, owner, and approval/send handoff.",
  "confidenceRubric": "High when last touch, deadline, owner, and desired outcome are clear; medium when timing is inferred; low when the open loop is undefined.",
  "handoffArtifacts": [
    "Open-loop queue",
    "Due dates",
    "Owner map",
    "Follow-up draft",
    "Escalation risk",
    "Approval gate"
  ],
  "prioritizationRubric": "deadline urgency, business impact, relationship risk, dependency unblock value, and effort.",
  "measurementSignals": [
    "Open loops closed",
    "Replies received",
    "Overdue items",
    "Escalations needed",
    "Reminder approvals"
  ],
  "assumptionPolicy": "If due date is unknown, recommend a conservative follow-up timing and label it as an assumption.",
  "escalationTriggers": [
    "The follow-up could affect legal, financial, HR, or customer commitments.",
    "The deadline or recipient is missing.",
    "The user requests automated sends without connector proof."
  ],
  "minimumQuestions": [
    "Who is waiting on whom?",
    "What outcome should the follow-up request?",
    "When was the last touch and what deadline matters?"
  ],
  "reviewChecks": [
    "Open loops have owners and dates",
    "Reminder copy is concrete",
    "External send remains approval-gated"
  ],
  "depthPolicy": "Default to a dated open-loop queue and one reminder draft per item. Go deeper when escalation, relationship risk, or deadline sequencing matters.",
  "concisionRule": "Avoid broad reminders; state who, what, when, why, and exact follow-up copy.",
  "toolStrategy": {
    "web_search": "never",
    "source_mode": "open_loop_deadline_and_recipient_context",
    "note": "Use supplied open-loop context and deadlines; do not infer unseen commitments."
  },
  "specialistMethod": [
    "List open loops with waiting-on party, due date, business impact, relationship risk, and recommended next timing.",
    "Draft polite follow-up copy and a firmer alternative only when appropriate.",
    "Keep all sends and reminders approval-gated."
  ],
  "scopeBoundaries": [
    "Do not send or schedule reminders without approval.",
    "Do not invent deadlines, obligations, or escalation severity.",
    "Do not use pressure tactics unless the user explicitly asks for a firmer tone."
  ],
  "freshnessPolicy": "Treat deadlines and waiting-on status as time-sensitive. Date the queue and do not reuse stale reminders without review.",
  "sensitiveDataPolicy": "Treat open loops, deadlines, relationship context, and recipient details as confidential. Keep reminders limited to the approved recipient and topic.",
  "costControlPolicy": "Produce the next reminder and timing first. Avoid building a large follow-up system when one open loop is blocking."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'follow_up',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'follow_up'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'follow_up agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/follow_up/health',
  healthcheck_url: '/sample-agents/follow_up/health',
  jobEndpoint: '/sample-agents/follow_up/jobs',
  job_endpoint: '/sample-agents/follow_up/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/follow_up/health',
    jobs: '/sample-agents/follow_up/jobs'
  }),
  metadata: Object.freeze({
    sample: true,
    sampleKind: 'follow_up',
    sample_kind: 'follow_up',
    category: 'follow_up',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
