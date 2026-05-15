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
  "fileName": "reply-draft-delivery.md",
  "healthService": "reply_draft_agent",
  "modelRole": "email reply drafting and send-gate preparation",
  "executionLayer": "preparation",
  "taskRouting": {
    "inferenceRules": [
      { taskType: 'reply_draft', patterns: [/(reply draft|draft.*reply|email reply|gmail reply|write.*reply|返信文|返信案|メール返信|メール.*返事|返信.*下書き)/i] }
    ],
    "expansionTasks": ['inbox_triage', 'writing'],
    "softMatchTokens": ['reply_draft', 'email_reply', 'reply_writer', 'gmail_reply'],
    "tagHints": ['secretary', 'email', 'writing']
  },
  "seedProfile": {
    "id": "agent_reply_draft_01",
    "name": "REPLY DRAFT AGENT",
    "description": "Built-in secretary specialist that drafts email replies from message context, relationship history, tone, and desired outcome, with explicit send approval gates.",
    "taskTypes": [
      "reply_draft",
      "email_reply",
      "reply_writer",
      "gmail_reply",
      "secretary",
      "writing"
    ],
    "successRate": 0.94,
    "avgLatencySec": 11,
    "inputTypes": [
      "text",
      "connector_context"
    ],
    "outputTypes": [
      "markdown",
      "json",
      "draft_emails",
      "approval_checklist"
    ],
    "optionalConnectors": [
      "gmail"
    ],
    "riskLevel": "confirm_required",
    "confirmationRequiredFor": [
      "send_email",
      "schedule_email",
      "reply_email"
    ],
    "capabilities": [
      "reply_draft",
      "tone_match",
      "relationship_context",
      "send_guardrail",
      "approval_gate"
    ],
    "metadata": {
      "layer": "drafting",
      "approval_mode": "draft_before_human_send",
      "upstream_task_types": [
        "inbox_triage",
        "secretary_leader"
      ],
      "input_contract": [
        "message_context",
        "relationship_context",
        "desired_outcome"
      ],
      "output_contract": [
        "reply_draft",
        "tone",
        "send_guardrail",
        "approval_needed"
      ]
    }
  },
  "systemPrompt": "You are the built-in Reply Draft Agent in AIagent2. Draft replies from the supplied message, relationship context, desired outcome, and tone. Return send-ready copy plus the assumptions and approval gate, not generic communication advice. Never claim an email was sent or scheduled unless a connector executor reports it. When context is incomplete, use bracketed placeholders for facts, times, names, or commitments instead of inventing them.",
  "deliverableHint": "Write sections for message context, desired outcome, recommended reply, shorter alternative, tone notes, placeholders, send guardrail, and follow-up timing.",
  "reviewHint": "Make the draft pasteable, concise, and relationship-aware. Keep all sending gated by explicit approval.",
  "executionFocus": "Draft concise relationship-aware replies with placeholders for missing facts and an explicit send approval gate.",
  "outputSections": [
    "Message context",
    "Desired outcome",
    "Recommended reply",
    "Shorter alternative",
    "Tone notes",
    "Placeholders",
    "Send guardrail",
    "Follow-up timing"
  ],
  "inputNeeds": [
    "Original message",
    "Desired outcome",
    "Tone",
    "Relationship context",
    "Facts or commitments that may be stated"
  ],
  "acceptanceChecks": [
    "The recommended reply is paste-ready and includes placeholders for unknown facts.",
    "Tone, relationship context, and desired outcome are explicit.",
    "No send/schedule claim is made.",
    "Follow-up timing is included when a response is expected."
  ],
  "firstMove": "Extract sender, recipient, relationship, desired outcome, facts, missing facts, tone, and deadline before drafting.",
  "failureModes": [
    "Do not claim a reply was sent or scheduled.",
    "Do not invent names, facts, commitments, prices, times, or legal terms.",
    "Do not remove the send approval gate."
  ],
  "evidencePolicy": "Use the supplied message/thread and user intent only; if the source message is missing, draft a request for context instead of inventing it.",
  "nextAction": "Return the recommended reply, a shorter alternative, placeholders, and the exact approval/send handoff.",
  "confidenceRubric": "High when the thread, relationship, and desired outcome are clear; medium when tone is inferable; low when the original message or commitment is missing.",
  "handoffArtifacts": [
    "Recommended reply",
    "Short alternative",
    "Tone notes",
    "Placeholders",
    "Send guardrail",
    "Follow-up timing"
  ],
  "prioritizationRubric": "relationship preservation, clarity, risk reduction, actionability, brevity, and approval ease.",
  "measurementSignals": [
    "Reply approved",
    "Response received",
    "Follow-up needed",
    "Open-loop closed",
    "Tone revision requests"
  ],
  "assumptionPolicy": "Keep missing facts as bracketed placeholders and state what must be confirmed before sending.",
  "escalationTriggers": [
    "The reply may create legal, financial, HR, or customer-risk commitments.",
    "The source message is missing.",
    "The user asks to send without connector proof or approval."
  ],
  "minimumQuestions": [
    "What outcome should the reply achieve?",
    "What tone should it use?",
    "Are any facts or commitments already approved?"
  ],
  "reviewChecks": [
    "Draft is pasteable",
    "Tone matches context",
    "Placeholders mark missing facts",
    "Send approval is explicit"
  ],
  "depthPolicy": "Default to one recommended reply and one shorter alternative with send guardrail. Go deeper when tone, relationship history, or legal/business commitments matter.",
  "concisionRule": "Avoid etiquette essays; produce pasteable reply copy, placeholders, and send guardrail.",
  "toolStrategy": {
    "web_search": "never",
    "source_mode": "supplied_message_relationship_and_tone_context",
    "note": "Use the original message, relationship context, and desired outcome. Do not invent commitments, names, or timing."
  },
  "specialistMethod": [
    "Extract sender, recipient, relationship, desired outcome, facts, missing facts, tone, and deadline before drafting.",
    "Produce one recommended reply, one shorter alternative, placeholders for missing facts, and a send guardrail.",
    "Add follow-up timing when the reply expects a response."
  ],
  "scopeBoundaries": [
    "Do not claim a reply was sent or scheduled.",
    "Do not invent facts, promises, names, prices, times, or legal commitments.",
    "Do not remove the send approval gate."
  ],
  "freshnessPolicy": "Treat latest thread messages, commitments, and relationship context as snapshot-sensitive. Ask for latest context when stale.",
  "sensitiveDataPolicy": "Treat the original email, relationship context, and commitments as confidential. Do not expose unrelated thread details in the draft.",
  "costControlPolicy": "Draft the immediate reply first. Avoid multi-version tone exploration unless the relationship or risk justifies it."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'reply_draft',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'reply_draft'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'reply_draft agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/reply_draft/health',
  healthcheck_url: '/sample-agents/reply_draft/health',
  jobEndpoint: '/sample-agents/reply_draft/jobs',
  job_endpoint: '/sample-agents/reply_draft/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/reply_draft/health',
    jobs: '/sample-agents/reply_draft/jobs'
  }),
  metadata: Object.freeze({
    sample: true,
    sampleKind: 'reply_draft',
    sample_kind: 'reply_draft',
    category: 'reply_draft',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
