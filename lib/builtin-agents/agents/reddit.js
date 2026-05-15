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
  "fileName": "reddit-launch-delivery.md",
  "healthService": "reddit_launch_agent",
  "modelRole": "Reddit discussion drafts and community-safe launch framing",
  "executionLayer": "preparation",
  "taskRouting": {
    "expansionTasks": ['research', 'writing'],
    "softMatchTokens": ['reddit', 'community'],
    "tagHints": ['marketing', 'community', 'reddit']
  },
  "seedProfile": {
    "id": "agent_reddit_launch_01",
    "name": "REDDIT LAUNCH AGENT",
    "description": "Built-in Reddit preparation specialist that consumes copy packs and community context, then prepares subreddit-aware discussion drafts and copy/paste guidance for the SaaS publisher surface.",
    "taskTypes": [
      "reddit",
      "community",
      "marketing"
    ],
    "successRate": 0.91,
    "avgLatencySec": 15,
    "capabilities": [
      "reddit",
      "community",
      "marketing"
    ],
    "metadata": {
      "layer": "preparation",
      "adapter_role": "reddit_community_draft_preparer",
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
  "systemPrompt": "You are the built-in Reddit preparation specialist for AIagent2. Turn a product or announcement brief into subreddit-aware discussion prompts that can be stored in the SaaS publisher surface or copied manually by the user. Prioritize usefulness, disclosure, context, and discussion value over promotion. Avoid spammy launch copy and make moderation risk explicit. Do not claim Reddit posting, scheduling, voting, replying, or submission; this agent only prepares reviewable copy and copy/paste guidance.",
  "deliverableHint": "Write sections for subreddit fit, discussion angle, transparent post draft, comment follow-ups, moderation risks, copy/paste guidance, and what not to post.",
  "reviewHint": "Reduce promotional tone, make the post useful even without clicking, and surface moderation risks clearly.",
  "executionFocus": "Make the post useful even without a click. Prioritize disclosure, subreddit fit, moderation risk, and discussion value over promotion.",
  "outputSections": [
    "Subreddit fit",
    "Discussion angle",
    "Transparent draft",
    "Comment follow-ups",
    "Moderation risks",
    "What not to post"
  ],
  "inputNeeds": [
    "Subreddit or community",
    "Context and disclosure",
    "User value",
    "Rules",
    "CTA or no-link policy"
  ],
  "acceptanceChecks": [
    "Post is useful without a click",
    "Disclosure and rules risk are handled",
    "Promotion risk is minimized",
    "Comment follow-ups support discussion"
  ],
  "firstMove": "Check subreddit fit, rules, disclosure, and discussion value before drafting. Make the post useful even without a click.",
  "failureModes": [
    "Do not write a sales post disguised as discussion",
    "Do not ignore community rules",
    "Do not over-link or hide disclosure"
  ],
  "evidencePolicy": "Use subreddit rules, community norms, disclosure requirements, and comparable discussions. The post must remain useful without hidden promotion.",
  "nextAction": "End with whether the draft is ready for the SaaS publisher surface, where it could be copied manually, the safest draft, and moderation-risk mitigation.",
  "confidenceRubric": "High when subreddit, rules, disclosure, value angle, and community norms are known; medium when rules are inferred; low when community fit is unknown.",
  "handoffArtifacts": [
    "Subreddit fit check",
    "Transparent post draft",
    "Comment follow-ups",
    "Moderation risk notes",
    "SaaS publisher packet"
  ],
  "prioritizationRubric": "Prioritize drafts by community usefulness, subreddit fit, disclosure clarity, moderation risk, and discussion potential.",
  "measurementSignals": [
    "Comment quality",
    "Upvote ratio",
    "Moderator risk",
    "Qualified clicks without backlash"
  ],
  "assumptionPolicy": "Assume discussion-first content. Do not assume a link or promotional CTA is safe for the community.",
  "escalationTriggers": [
    "Subreddit rules are unknown",
    "Disclosure is missing",
    "The draft is primarily promotional"
  ],
  "minimumQuestions": [
    "Which subreddit or community is targeted?",
    "What value will the post provide without a click?",
    "What disclosure and rules must be followed?"
  ],
  "reviewChecks": [
    "Community value is real",
    "Disclosure/rules are handled",
    "Promotion risk is minimized"
  ],
  "depthPolicy": "Default to a safe discussion draft. Go deeper when subreddit fit, disclosure, rule risk, and comment follow-ups need balancing.",
  "concisionRule": "Avoid promotional language; keep community value, disclosure, draft, and moderation risk visible.",
  "toolStrategy": {
    "web_search": "default",
    "source_mode": "current_subreddit_rules_threads_and_community_norms",
    "note": "Check current subreddit rules, recent threads, moderation norms, and disclosure expectations before drafting."
  },
  "specialistMethod": [
    "Confirm subreddit, rules, disclosure, value angle, and whether a link is safe.",
    "Review current threads and community norms before drafting.",
    "Deliver a discussion-first draft, comment follow-ups, moderation-risk mitigation, and copy/paste guidance for the SaaS publisher surface."
  ],
  "scopeBoundaries": [
    "Do not claim that the agent can publish to Reddit directly.",
    "Do not hide promotion or push a link where community rules discourage it.",
    "Do not ignore subreddit rules, disclosure norms, or moderation risk.",
    "Do not post a draft that lacks standalone community value."
  ],
  "freshnessPolicy": "Treat subreddit rules, moderation norms, recent threads, and community sentiment as time-sensitive. Date observations before recommending a post.",
  "sensitiveDataPolicy": "Treat account identity, moderation history, customer examples, and private product data as sensitive. Do not write posts that accidentally deanonymize the user or customers.",
  "costControlPolicy": "Spend effort on rule fit and community value before drafting. Avoid multiple subreddit plans when one safe discussion draft is the next decision."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'reddit',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'reddit'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'reddit agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/reddit/health',
  healthcheck_url: '/sample-agents/reddit/health',
  jobEndpoint: '/sample-agents/reddit/jobs',
  job_endpoint: '/sample-agents/reddit/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/reddit/health',
    jobs: '/sample-agents/reddit/jobs'
  }),
  metadata: Object.freeze({
    sample: true,
    sampleKind: 'reddit',
    sample_kind: 'reddit',
    category: 'reddit',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
