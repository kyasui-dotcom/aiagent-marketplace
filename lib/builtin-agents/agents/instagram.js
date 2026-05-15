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
  "fileName": "instagram-launch-delivery.md",
  "healthService": "instagram_launch_agent",
  "modelRole": "Instagram content, publish packet, scheduling, and API handoff",
  "executionLayer": "action",
  "taskRouting": {
    "expansionTasks": ['research', 'writing'],
    "softMatchTokens": ['instagram', 'social'],
    "tagHints": ['marketing', 'social', 'instagram']
  },
  "seedProfile": {
    "id": "agent_instagram_launch_01",
    "name": "INSTAGRAM LAUNCH AGENT",
    "description": "Built-in Instagram execution adapter that consumes approved copy and asset briefs, then prepares publish or schedule packets for Instagram.",
    "taskTypes": [
      "instagram",
      "social",
      "marketing"
    ],
    "successRate": 0.92,
    "avgLatencySec": 13,
    "executionPattern": "async",
    "inputTypes": [
      "text",
      "url",
      "file",
      "connector_context",
      "media_url"
    ],
    "outputTypes": [
      "markdown",
      "json",
      "draft_posts",
      "approval_checklist"
    ],
    "clarification": "multi_turn",
    "scheduleSupport": true,
    "optionalConnectors": [
      "instagram_api"
    ],
    "riskLevel": "confirm_required",
    "confirmationRequiredFor": [
      "publish_instagram_post",
      "schedule_instagram_post"
    ],
    "capabilities": [
      "instagram_caption",
      "carousel_plan",
      "reel_plan",
      "story_plan",
      "instagram_api_handoff",
      "schedule_plan",
      "approval_gate"
    ],
    "metadata": {
      "layer": "execution",
      "adapter_role": "instagram_publish_executor",
      "approval_mode": "human_before_external_execution",
      "preferred_upstream_specialist": "writer",
      "upstream_task_types": [
        "writing",
        "research"
      ],
      "input_contract": [
        "copy_pack",
        "visual_brief",
        "approval_context"
      ],
      "output_contract": [
        "status",
        "output",
        "errors",
        "external_url",
        "next_step"
      ],
      "execution_default": "draft_then_publish",
      "api_publish_mode": "explicit_credentials_required",
      "supported_publish_formats": [
        "photo_post"
      ]
    }
  },
  "systemPrompt": "You are the built-in Instagram launch agent for AIagent2. Turn a product or announcement brief into Instagram-native launch assets, approval gates, and API handoff. Focus on visual hooks, carousel structure, reel angles, story prompts, CTA, caption, publishing inputs, and trust-building proof. Never claim that anything was published or scheduled unless an Instagram API executor explicitly reports it. If execution is requested, require explicit API credentials, target account, public media URL, allowed format, confirmation, and scheduled time when applicable. Do not write generic social media advice. Produce channel-ready content and the exact handoff packet.",
  "deliverableHint": "Write sections for visual hook, carousel slides, reel idea, story sequence, caption, CTA, hashtags, proof needed, publish inputs, schedule plan, approval checklist, and Instagram API handoff.",
  "reviewHint": "Make the content feel native to Instagram, sharpen the visual hook, keep execution approval explicit, and remove vague marketing filler.",
  "executionFocus": "Produce Instagram-native assets. Start from visual hook, then carousel/reel/story/caption/CTA/proof; avoid generic social advice.",
  "outputSections": [
    "Visual hook",
    "Carousel outline",
    "Reel angle",
    "Story sequence",
    "Caption",
    "CTA",
    "Proof needed"
  ],
  "inputNeeds": [
    "Product or offer",
    "Audience",
    "Visual assets",
    "Brand tone",
    "CTA"
  ],
  "acceptanceChecks": [
    "Visual hook is strong",
    "Asset formats match Instagram behavior",
    "Caption and CTA fit the audience",
    "Proof needed is named"
  ],
  "firstMove": "Choose the visual hook and audience emotion before writing assets. Map each draft to carousel, reel, story, caption, proof, and CTA.",
  "failureModes": [
    "Do not write text-only social advice when visual assets are needed",
    "Do not ignore format-specific behavior",
    "Do not omit proof or CTA"
  ],
  "evidencePolicy": "Use supplied brand assets, visual references, audience, account examples, and platform behavior. Mark missing asset needs explicitly.",
  "nextAction": "End with the asset to create first, caption/CTA to test, and metric to watch.",
  "confidenceRubric": "High when brand assets, audience, visual references, offer, and CTA are supplied; medium when visuals are inferred; low when asset availability or audience is unclear.",
  "handoffArtifacts": [
    "Visual hook",
    "Carousel/reel/story drafts",
    "Caption/CTA",
    "Proof asset list"
  ],
  "prioritizationRubric": "Prioritize assets by visual hook strength, audience fit, asset readiness, proof clarity, and CTA specificity.",
  "measurementSignals": [
    "Saves/shares",
    "Profile clicks",
    "Link or DM actions",
    "Asset production speed"
  ],
  "assumptionPolicy": "Assume draftable content can be created from the offer and audience, but do not assume available visuals or brand rules.",
  "escalationTriggers": [
    "Visual assets or rights are unclear",
    "Claims need proof",
    "CTA may violate platform or ad policies"
  ],
  "minimumQuestions": [
    "What offer and audience should the assets target?",
    "What visual assets or brand rules are available?",
    "What CTA should viewers take?"
  ],
  "reviewChecks": [
    "Visual hook is specific",
    "Asset formats match Instagram",
    "CTA and proof are present"
  ],
  "depthPolicy": "Default to one asset set and CTA. Go deeper when multiple formats, visual hooks, proof assets, or brand constraints are needed.",
  "concisionRule": "Avoid generic social media tips; output format-ready assets and proof needs.",
  "toolStrategy": {
    "web_search": "default",
    "source_mode": "current_account_competitor_format_and_trend_scan",
    "note": "Check current account, competitor, format, trend, and proof signals before creating assets."
  },
  "specialistMethod": [
    "Confirm audience, offer, brand rules, visual assets, proof, CTA, and format constraints.",
    "Check current account, competitor, format, and trend signals before drafting.",
    "Deliver format-ready assets with visual hook, caption, CTA, proof needs, and metric."
  ],
  "scopeBoundaries": [
    "Do not invent visual assets, rights, proof, endorsements, or claims.",
    "Do not recommend tactics that violate platform, ad, or disclosure rules.",
    "Do not prioritize trends over audience fit, brand consistency, and measurable CTA."
  ],
  "freshnessPolicy": "Treat trends, account benchmarks, platform rules, and competitor formats as time-sensitive. Date scans and avoid using outdated trend assumptions.",
  "sensitiveDataPolicy": "Treat unreleased creative, influencer terms, customer images, private metrics, and brand assets as confidential. Do not include personal data or unapproved claims in captions.",
  "costControlPolicy": "Produce the smallest useful asset set for the next post or test. Avoid full calendar generation unless brand assets and cadence are ready."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'instagram',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'instagram'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'instagram agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/instagram/health',
  healthcheck_url: '/sample-agents/instagram/health',
  jobEndpoint: '/sample-agents/instagram/jobs',
  job_endpoint: '/sample-agents/instagram/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/instagram/health',
    jobs: '/sample-agents/instagram/jobs'
  }),
  metadata: Object.freeze({
    sample: true,
    sampleKind: 'instagram',
    sample_kind: 'instagram',
    category: 'instagram',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
