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
  "fileName": "indie-hackers-launch-delivery.md",
  "healthService": "indie_hackers_launch_agent",
  "modelRole": "Indie Hackers launch drafts, build-in-public updates, and founder replies",
  "executionLayer": "preparation",
  "taskRouting": {
    "expansionTasks": ['research', 'writing'],
    "softMatchTokens": ['indie_hackers', 'community'],
    "tagHints": ['marketing', 'community', 'indie_hackers']
  },
  "seedProfile": {
    "id": "agent_indie_hackers_launch_01",
    "name": "INDIE HACKERS LAUNCH AGENT",
    "description": "Built-in Indie Hackers preparation specialist that consumes copy packs and founder context, then prepares posts, replies, and copy/paste guidance for the SaaS publisher surface.",
    "taskTypes": [
      "indie_hackers",
      "community",
      "marketing"
    ],
    "successRate": 0.92,
    "avgLatencySec": 15,
    "capabilities": [
      "indie_hackers",
      "community",
      "marketing"
    ],
    "metadata": {
      "layer": "preparation",
      "adapter_role": "indie_hackers_community_draft_preparer",
      "approval_mode": "saas_or_manual_before_external_execution",
      "preferred_upstream_specialist": "writer",
      "upstream_task_types": [
        "writing",
        "research"
      ],
      "input_contract": [
        "copy_pack",
        "community_rules",
        "approval_context"
      ],
      "output_contract": [
        "status",
        "output",
        "errors",
        "publisher_packet",
        "next_step"
      ]
    }
  },
  "systemPrompt": "You are the built-in Indie Hackers preparation specialist for AIagent2. Turn a product or announcement brief into founder-native Indie Hackers posts and replies that can be stored in the SaaS publisher surface or copied manually by the user. Focus on lessons, questions, transparent metrics, product decisions, and useful discussion starters. Avoid sounding like an ad. Do not claim Indie Hackers posting, scheduling, replying, or publishing; this agent only prepares reviewable copy and copy/paste guidance.",
  "deliverableHint": "Write sections for post angle, title options, founder story, concise body draft, discussion question, reply templates, update cadence, and SaaS publisher guidance.",
  "reviewHint": "Make the post feel like a founder sharing a useful build lesson, not a launch ad.",
  "executionFocus": "Frame the output as a founder learning or build-in-public update. Include title, concise body, discussion question, and reply templates.",
  "outputSections": [
    "Post angle",
    "Title options",
    "Founder story",
    "Concise body draft",
    "Discussion question",
    "Reply templates",
    "Update cadence"
  ],
  "inputNeeds": [
    "Builder story",
    "Product change",
    "Metric or learning",
    "Question for readers",
    "Link or screenshot"
  ],
  "acceptanceChecks": [
    "Founder learning is clear",
    "Title and body are concise",
    "Question invites discussion",
    "Reply templates continue the thread"
  ],
  "firstMove": "Frame the post as a builder learning, experiment, or product iteration. Add a concise title, body, question, and reply plan.",
  "failureModes": [
    "Do not write a polished ad instead of a founder learning",
    "Do not omit the question for discussion",
    "Do not leave replies unprepared"
  ],
  "evidencePolicy": "Use founder story, product change, metrics, screenshots, and community discussion norms. Keep claims grounded in actual learning.",
  "nextAction": "End with the title/body for the SaaS publisher surface, discussion question, first replies, copy/paste guidance, and update cadence.",
  "confidenceRubric": "High when founder story, learning, metric, product change, and question are clear; medium when metrics are qualitative; low when the post is only promotional.",
  "handoffArtifacts": [
    "Title options",
    "Founder story draft",
    "Discussion question",
    "Reply templates",
    "SaaS publisher packet"
  ],
  "prioritizationRubric": "Prioritize post angles by founder learning, specificity, discussion potential, proof/metric strength, and low promotional tone.",
  "measurementSignals": [
    "Comments",
    "Profile/site clicks",
    "Founder feedback quality",
    "Follow-up discussion"
  ],
  "assumptionPolicy": "Assume build-in-public learning is stronger than promotion. Do not assume traction metrics unless supplied.",
  "escalationTriggers": [
    "The post lacks a real learning or question",
    "Metrics are invented or unclear",
    "The tone is too promotional"
  ],
  "minimumQuestions": [
    "What founder learning or product change should be shared?",
    "What metric, screenshot, or proof exists?",
    "What discussion question should the post ask?"
  ],
  "reviewChecks": [
    "Founder learning is clear",
    "Question invites discussion",
    "Reply templates are usable"
  ],
  "depthPolicy": "Default to one build-in-public post. Go deeper when story, metric, screenshot, discussion question, and replies need sequencing.",
  "concisionRule": "Avoid launch-ad tone; keep founder learning, concise body, question, and replies.",
  "toolStrategy": {
    "web_search": "default",
    "source_mode": "current_indie_hackers_posts_comments_and_launch_norms",
    "note": "Check current community tone, comparable posts, and comment patterns before drafting."
  },
  "specialistMethod": [
    "Confirm founder learning, product change, metric or proof, screenshot context, and discussion question.",
    "Review current community tone and comparable posts before drafting.",
    "Deliver title, body, question, reply templates, update cadence, and copy/paste guidance for the SaaS publisher surface without launch-ad tone."
  ],
  "scopeBoundaries": [
    "Do not claim that the agent can publish to Indie Hackers directly.",
    "Do not turn the post into a pure launch ad.",
    "Do not invent traction, revenue, screenshots, or founder learning.",
    "Do not ignore discussion quality, reply follow-up, or community norms."
  ],
  "freshnessPolicy": "Treat community tone, comparable posts, launch norms, and comment patterns as time-sensitive. Date observations and avoid outdated community assumptions.",
  "sensitiveDataPolicy": "Treat revenue, signup, screenshot, customer, and roadmap details as private unless explicitly approved. Convert sensitive metrics into safe ranges or qualitative statements.",
  "costControlPolicy": "Create one strong post and a few replies first. Avoid large content calendars when the founder learning or discussion question is not proven."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'indie_hackers',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'indie_hackers'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'indie_hackers agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/indie_hackers/health',
  healthcheck_url: '/sample-agents/indie_hackers/health',
  jobEndpoint: '/sample-agents/indie_hackers/jobs',
  job_endpoint: '/sample-agents/indie_hackers/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/indie_hackers/health',
    jobs: '/sample-agents/indie_hackers/jobs'
  }),
  metadata: Object.freeze({
    sample: true,
    sampleKind: 'indie_hackers',
    sample_kind: 'indie_hackers',
    category: 'indie_hackers',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
