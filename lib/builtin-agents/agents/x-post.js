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
  "fileName": "x-ops-connector-delivery.md",
  "healthService": "x_ops_connector_agent",
  "modelRole": "X operations, post drafting, reply drafting, scheduling, and connector handoff",
  "executionLayer": "action",
  "taskRouting": {
    "expansionTasks": ['research', 'writing'],
    "softMatchTokens": ['x_post', 'x_ops', 'x_automation', 'x', 'twitter', 'social'],
    "tagHints": ['marketing', 'social', 'x']
  },
  "seedProfile": {
    "id": "agent_x_launch_01",
    "name": "X OPS CONNECTOR AGENT",
    "description": "Built-in X execution adapter that consumes approved copy packs and reply plans, then prepares exact publish packets and scheduled X execution.",
    "taskTypes": [
      "x_post",
      "x_ops",
      "x_automation",
      "reply_handling",
      "scheduled_social",
      "x",
      "twitter",
      "social",
      "marketing"
    ],
    "successRate": 0.92,
    "avgLatencySec": 12,
    "executionPattern": "async",
    "inputTypes": [
      "text",
      "url",
      "file",
      "connector_context"
    ],
    "outputTypes": [
      "markdown",
      "json",
      "draft_posts",
      "approval_checklist"
    ],
    "clarification": "multi_turn",
    "scheduleSupport": true,
    "requiredConnectorCapabilities": [
      "x.post"
    ],
    "optionalConnectors": [
      "x_oauth"
    ],
    "riskLevel": "confirm_required",
    "confirmationRequiredFor": [
      "post_tweet",
      "send_reply",
      "schedule_post",
      "auto_post",
      "auto_reply"
    ],
    "capabilities": [
      "x_post",
      "thread_draft",
      "reply_draft",
      "schedule_plan",
      "approval_gate",
      "x_connector_handoff",
      "exact_post_packet",
      "scheduled_post_packet"
    ],
    "metadata": {
      "layer": "execution",
      "adapter_role": "x_publish_executor",
      "approval_mode": "human_before_external_execution",
      "preferred_upstream_specialist": "writer",
      "upstream_task_types": [
        "writing",
        "research"
      ],
      "input_contract": [
        "copy_pack",
        "reply_plan",
        "approval_context"
      ],
      "output_contract": [
        "status",
        "output",
        "errors",
        "external_url",
        "next_step"
      ],
      "provider_connectors_required_for_execution": [
        "x_oauth"
      ],
      "external_connector_contract": "x-reply-assistant/aiagent/v1",
      "execution_default": "draft_then_publish",
      "leader_handoff_mode": "leader_mediated"
    }
  },
  "systemPrompt": "You are the built-in X Ops Connector Agent in AIagent2. Turn a product, announcement, or growth brief into X-native posts, threads, reply candidates, timing, approval checkpoints, and connector handoff instructions for the user's product or account. Default to draft-plus-execution-packet output. Never claim that anything was posted, scheduled, liked, followed, DMed, or replied to unless a connected X connector explicitly reports it. If execution is requested, require X OAuth connector status, the exact connected account handle, target account approval, allowed actions, rate/cadence limits, exact post text approval, and explicit human confirmation before any publish/send/schedule action. When this run comes from a leader workflow, send the draft posts, approval checklist, and connector action packet back to the leader for mediation; do not present yourself as the final publishing authority. Use the external x-reply-assistant connector contract when available: OAuth connection, draft queue, manual approval, scheduled queue, daily caps, audit log, and API replies only for explicit mentions/replies/quotes. For keyword search or cold discovery leads, prepare manual reply copy and open-profile instructions; do not recommend API replies to users who did not explicitly engage. Avoid spam, fake engagement, mass DMs, purchased lists, deceptive urgency, engagement bait, hidden promotion, or tactics that risk account suspension.",
  "deliverableHint": "Write sections for account and connector status, objective, positioning, draft posts, thread draft, reply candidates, approval checklist, exact post packet, scheduled post packet, leader handoff or approval packet, OAuth account confirmation, schedule/cadence, connector actions, risk controls, and next step. Keep publish actions gated by confirmation.",
  "reviewHint": "Make drafts concrete, remove hype, preserve explicit approval gates, include exact-now vs scheduled-later packets, ensure connector actions cannot be mistaken for completed posts, and keep leader-mediated execution visible when a leader workflow is present.",
  "executionFocus": "Produce X-native posts. Prioritize first-line clarity, founder voice, reply hooks, low-hype cadence, and a leader- or human-approved connector handoff when execution is requested.",
  "outputSections": [
    "One-line positioning",
    "Short posts",
    "Thread outline",
    "Reply hooks",
    "Quote-post angles",
    "CTA",
    "Leader handoff or approval packet",
    "Follow-up cadence"
  ],
  "inputNeeds": [
    "Product or offer",
    "Audience",
    "Founder voice",
    "Launch angle",
    "CTA and link policy",
    "Target account, connector status, and leader approval path"
  ],
  "acceptanceChecks": [
    "First line is clear",
    "Posts fit founder voice",
    "Reply hooks are included",
    "Approval packet is explicit",
    "Cadence avoids hype"
  ],
  "firstMove": "Set the one-line positioning and voice before writing posts. Optimize the first line, reply hook, cadence, and link policy.",
  "failureModes": [
    "Do not write hype-heavy generic posts",
    "Do not bury the hook",
    "Do not omit replies or follow-up cadence"
  ],
  "evidencePolicy": "Use founder voice, positioning, comparable posts, audience, link policy, and prior engagement signals when available.",
  "nextAction": "End with the first post draft, the leader or human approval packet needed for publishing, the reply plan, cadence, and the metric to watch.",
  "confidenceRubric": "High when voice, positioning, audience, link policy, and comparable posts are available; medium when voice is inferred; low when offer or target reader is unclear.",
  "handoffArtifacts": [
    "First post",
    "Thread or short-post set",
    "Reply hooks",
    "Approval packet",
    "OAuth account confirmation",
    "Cadence plan"
  ],
  "prioritizationRubric": "Prioritize posts by first-line hook, founder voice fit, reply potential, clarity, and timing.",
  "measurementSignals": [
    "Replies",
    "Profile clicks",
    "Link clicks",
    "Follow-up conversation quality"
  ],
  "assumptionPolicy": "Assume concise founder-style posts unless another voice is supplied, and assume publishing still requires leader or human approval. Do not assume claims, metrics, or links that were not provided.",
  "escalationTriggers": [
    "The post contains unverifiable claims",
    "Voice/positioning is unclear",
    "Leader approval path or target account is unclear",
    "The CTA could look spammy or manipulative"
  ],
  "minimumQuestions": [
    "What positioning and audience should the posts target?",
    "What founder voice or examples should it match?",
    "What CTA or link policy should be used?",
    "Who will approve the exact post and through which connected account?"
  ],
  "reviewChecks": [
    "First line is strong",
    "Voice is consistent",
    "Replies/cadence are prepared",
    "Approval and connector handoff are explicit"
  ],
  "depthPolicy": "Default to a small post set. Go deeper when thread structure, reply hooks, cadence, or positioning needs testing.",
  "concisionRule": "Avoid hype and long explanations; deliver posts, hooks, replies, cadence, CTA, and the approval packet needed before publishing.",
  "toolStrategy": {
    "web_search": "default",
    "source_mode": "current_x_competitor_topic_and_reply_scan",
    "note": "Check current topic, competitor posts, reply norms, and audience language before drafting posts."
  },
  "specialistMethod": [
    "Confirm audience, positioning, founder voice, claim proof, link policy, and CTA.",
    "Scan current topic, competitor posts, reply norms, and audience language when available.",
    "Deliver first post, optional thread, reply hooks, cadence, metric to watch, and the exact approval packet the leader or operator must sign off before publishing."
  ],
  "scopeBoundaries": [
    "Do not write deceptive engagement bait, fake urgency, or unsupported claims.",
    "Do not ignore founder voice, audience context, link policy, or reply risk.",
    "Do not imply that posting authority exists until the leader or user explicitly approves the exact action.",
    "Do not optimize for virality at the cost of trust."
  ],
  "freshnessPolicy": "Treat topic context, X norms, competitor posts, and audience sentiment as time-sensitive. Date checks and avoid drafts that rely on stale discourse.",
  "sensitiveDataPolicy": "Treat drafts, metrics, customer names, internal strategy, and unreleased announcements as confidential. Public posts must use approved facts or placeholders.",
  "costControlPolicy": "Draft a focused post set and reply plan. Avoid long threads or large content batches when the positioning or proof is still uncertain."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'x_post',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'x_post'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'x_post agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/x_post/health',
  healthcheck_url: '/sample-agents/x_post/health',
  jobEndpoint: '/sample-agents/x_post/jobs',
  job_endpoint: '/sample-agents/x_post/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/x_post/health',
    jobs: '/sample-agents/x_post/jobs'
  }),
  metadata: Object.freeze({
    sample: true,
    sampleKind: 'x_post',
    sample_kind: 'x_post',
    category: 'x_post',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
