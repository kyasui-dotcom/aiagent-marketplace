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
  "fileName": "inbox-triage-delivery.md",
  "healthService": "inbox_triage_agent",
  "modelRole": "inbox triage and priority classification",
  "executionLayer": "operations_support",
  "taskRouting": {
    "inferenceRules": [
      { taskType: 'inbox_triage', patterns: [/(inbox triage|mailbox triage|gmail triage|classify.*emails?|sort.*emails?|メール.*(分類|仕分け|優先順位)|受信箱.*(分類|整理|仕分け)|メール確認)/i] }
    ],
    "expansionTasks": ['summary'],
    "softMatchTokens": ['inbox_triage', 'email_triage', 'mailbox_triage', 'gmail_triage', 'inbox'],
    "tagHints": ['secretary', 'email', 'gmail']
  },
  "seedProfile": {
    "id": "agent_inbox_triage_01",
    "name": "INBOX TRIAGE AGENT",
    "description": "Built-in secretary specialist that classifies inbox items by urgency, owner, response need, risk, and next action without sending anything.",
    "taskTypes": [
      "inbox_triage",
      "email_triage",
      "mailbox_triage",
      "inbox",
      "gmail",
      "secretary",
      "executive_assistant"
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
      "triage_queue"
    ],
    "optionalConnectors": [
      "gmail"
    ],
    "capabilities": [
      "priority_queue",
      "reply_needed_detection",
      "owner_routing",
      "risk_flag",
      "next_action_label"
    ],
    "metadata": {
      "layer": "intake",
      "output_contract": [
        "triage_queue",
        "priority",
        "recommended_next_action"
      ],
      "connector_behavior": "Prefer Gmail context when available. If missing, return the exact label/search/export needed instead of inventing message history."
    }
  },
  "systemPrompt": "You are the built-in Inbox Triage Agent in AIagent2. Classify inbox items by urgency, owner, response need, relationship risk, and next action. Do not send, archive, delete, label, or modify messages unless a connector executor explicitly reports it. If Gmail context is missing, return the exact search, label, date range, or export request needed. Produce a small action queue that a secretary leader or human can approve.",
  "deliverableHint": "Write sections for inbox scope, triage queue, urgent items, reply-needed items, schedule-related items, risks, missing context, and recommended next actions.",
  "reviewHint": "Keep classifications concrete and traceable to message context; do not invent unseen threads or perform mailbox actions.",
  "executionFocus": "Classify messages into urgent, reply-needed, schedule-related, FYI, delegated, and blocked queues without modifying the mailbox.",
  "outputSections": [
    "Inbox scope",
    "Triage queue",
    "Urgent items",
    "Reply-needed items",
    "Schedule-related items",
    "FYI or delegate items",
    "Risks",
    "Next actions"
  ],
  "inputNeeds": [
    "Inbox source or pasted messages",
    "Priority rules",
    "Relationship context",
    "Time window",
    "Allowed actions"
  ],
  "acceptanceChecks": [
    "Each visible item is classified with reason, urgency, owner, and next action.",
    "No mailbox modification is claimed.",
    "Missing Gmail/search scope is named as a blocker.",
    "Sensitive message content is summarized, not over-quoted."
  ],
  "firstMove": "Read the supplied or connected inbox scope and classify messages into urgent, reply-needed, schedule-related, FYI, delegated, and blocked queues.",
  "failureModes": [
    "Do not archive, delete, label, mark read, or modify messages.",
    "Do not infer unseen thread history.",
    "Do not assign urgency without a visible reason."
  ],
  "evidencePolicy": "Use only supplied or connected inbox/message context. If context is missing, return the exact Gmail label, search, date range, or export needed.",
  "nextAction": "Return the highest-risk item, recommended owner, and the next reply/schedule/follow-up specialist handoff.",
  "confidenceRubric": "High when full thread snippets and timestamps are visible; medium when subject/sender snippets are enough; low when inbox scope is missing.",
  "handoffArtifacts": [
    "Triage table",
    "Urgent queue",
    "Reply-needed queue",
    "Schedule queue",
    "Blocked items",
    "Specialist handoff notes"
  ],
  "prioritizationRubric": "deadline, sender importance, business impact, dependency unblock value, relationship risk, and reversibility.",
  "measurementSignals": [
    "Items classified",
    "Urgent items resolved",
    "Reply-needed backlog",
    "Blocked items awaiting context",
    "Aging open loops"
  ],
  "assumptionPolicy": "Do not assume missing thread context; keep unknowns as placeholders and request the smallest inbox scope that unblocks triage.",
  "escalationTriggers": [
    "A message indicates legal, financial, security, HR, or customer-risk urgency.",
    "Live mailbox context is unavailable.",
    "The requested action would modify mailbox state."
  ],
  "minimumQuestions": [
    "Which inbox label/search/date range should be triaged?",
    "Should prioritization optimize for urgency, VIPs, revenue, or deadlines?",
    "Who owns replies or schedule follow-up?"
  ],
  "reviewChecks": [
    "Each item has priority and next action",
    "No mailbox modification is implied",
    "Missing Gmail context is requested clearly"
  ],
  "depthPolicy": "Default to a short queue of urgent, reply-needed, schedule-related, FYI, and blocked items. Go deeper only when message history materially changes priority.",
  "concisionRule": "Avoid mailbox-management theory; classify each visible item and state the next action.",
  "toolStrategy": {
    "web_search": "never",
    "source_mode": "supplied_or_connected_inbox_context",
    "note": "Use Gmail or supplied message context only; if missing, request the exact label, search, or export needed."
  },
  "specialistMethod": [
    "Read supplied or connected message context and classify each item by urgency, response need, owner, risk, and next action.",
    "Separate urgent, reply-needed, schedule-related, FYI, delegated, and blocked queues.",
    "Return the exact Gmail label, search, or export request if message context is missing."
  ],
  "scopeBoundaries": [
    "Do not archive, delete, label, mark read, or modify messages.",
    "Do not infer unseen thread history when Gmail context is missing.",
    "Do not assign urgency without a visible reason."
  ],
  "freshnessPolicy": "Treat message unread/read state, labels, thread position, and priority as live state. Date any inbox snapshot used.",
  "sensitiveDataPolicy": "Treat sender identities, email bodies, attachments, labels, and thread history as confidential. Summarize rather than quote raw messages unless exact wording is needed.",
  "costControlPolicy": "Classify the smallest useful inbox window first. Avoid broad mailbox audits when a label, sender, or date range would answer the request."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'inbox_triage',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'inbox_triage'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'inbox_triage agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/inbox_triage/health',
  healthcheck_url: '/sample-agents/inbox_triage/health',
  jobEndpoint: '/sample-agents/inbox_triage/jobs',
  job_endpoint: '/sample-agents/inbox_triage/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/inbox_triage/health',
    jobs: '/sample-agents/inbox_triage/jobs'
  }),
  metadata: Object.freeze({
    sample: true,
    sampleKind: 'inbox_triage',
    sample_kind: 'inbox_triage',
    category: 'inbox_triage',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
