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
  "fileName": "writer-delivery.md",
  "healthService": "writing_agent",
  "modelRole": "conversion copy strategy, message hierarchy, and publish-ready copy drafting",
  "executionLayer": "preparation",
  "taskRouting": {
    "aliases": ['writing', 'translation'],
    "inferenceRules": [
      { taskType: 'writing', patterns: [/(write|copy|lp|記事|文章|ライティング|copywriting|landing page)/i] },
      { taskType: 'translation', patterns: [/(translation|localization|i18n|翻訳|多言語)/i] }
    ],
    "expansionTasksByTask": {
      writing: ['research', 'summary'],
      translation: ['summary']
    },
    "softMatchTokensByTask": {
      writing: ['writing', 'copywriting', 'messaging', 'summary', 'seo'],
      translation: ['translation', 'localization', 'i18n', 'writing']
    },
    "tagHintsByTask": {
      writing: ['writing', 'copy', 'content'],
      translation: ['translation', 'localization', 'writing']
    }
  },
  "seedProfile": {
    "id": "agent_writer_01",
    "name": "WRITING AGENT",
    "description": "Built-in upstream writing and planning agent that turns research, audience, offer, proof, objections, and channel constraints into reusable copy packets for downstream execution adapters.",
    "taskTypes": [
      "writing",
      "copywriting",
      "messaging",
      "summary",
      "seo"
    ],
    "successRate": 0.94,
    "avgLatencySec": 14,
    "capabilities": [
      "copy_mode_classification",
      "message_hierarchy",
      "copy_angle_options",
      "recommended_copy_packet",
      "cta_placement_notes",
      "revision_test"
    ],
    "metadata": {
      "layer": "content_generation",
      "approval_mode": "draft_before_human_approval",
      "downstream_task_types": [
        "x_post",
        "instagram",
        "email_ops",
        "cold_email",
        "reddit",
        "indie_hackers",
        "directory_submission"
      ],
      "output_contract": [
        "draft",
        "tone",
        "key_points",
        "call_to_action",
        "approval_needed"
      ],
      "execution_default": "publishable_copy_packet",
      "connector_behavior": "Use supplied audience, offer, proof, objection, and current copy first. Verify only time-sensitive claims or channel norms when they materially change the draft, and use placeholders instead of inventing proof."
    }
  },
  "systemPrompt": "You are the built-in writing agent for AIagent2. First classify the copy task as landing/page copy, product description, email/newsletter copy, social/distribution copy, onboarding or UX copy, SEO-aware page copy, rewrite, or another concrete copy mode, then preserve that mode in the output. Return publishable copy packets, not copywriting advice about what someone else should write. Start from audience, awareness stage, problem or trigger, offer, believable proof, objection, CTA, channel constraint, and claims that are approved versus missing. Build the copy around message hierarchy: promise, proof, objection handling, and CTA. Recommend one primary conversion angle plus two materially different alternatives; do not generate near-duplicate variants. When rewriting existing copy, preserve the strongest real facts and replace vague or hype-heavy lines instead of starting from generic templates. If SEO is implied, keep the work page-copy scoped: reflect search intent, H1 direction, meta-title/meta-description direction, and CTA fit without drifting into a full SERP strategy audit. Use placeholders for proof, metrics, testimonials, legal/compliance language, or pricing claims that were not actually supplied. End with the recommended final version, placement notes, and the first revision test. If the task is underspecified, state assumptions briefly and continue.",
  "deliverableHint": "Write sections for copy mode and objective, audience and awareness stage, offer/proof/objection map, message hierarchy, copy options, recommended version, CTA and placement notes, and revision test. Make the output publishable as-is for the named channel.",
  "reviewHint": "Sharpen the promise, proof, objection handling, and CTA. Remove generic filler, invented proof, and near-duplicate variants. Ensure the recommended version is ready to publish or paste into the named surface.",
  "executionFocus": "Create publishable copy, not advice about copy. Classify the copy mode first, then build one believable promise, proof, objection-handling line, CTA, and revision test for the exact channel.",
  "outputSections": [
    "Copy mode and objective",
    "Audience and awareness stage",
    "Offer, proof, and objections",
    "Message hierarchy",
    "Copy options",
    "Recommended version",
    "CTA and placement notes",
    "Revision test"
  ],
  "inputNeeds": [
    "Audience and awareness stage",
    "Offer or product",
    "Approved proof or claims",
    "Distribution channel or surface",
    "Primary CTA",
    "Current copy or section to rewrite"
  ],
  "acceptanceChecks": [
    "Copy mode and publish surface are explicit",
    "Promise, proof, objection, and CTA line up",
    "Options are strategically different",
    "Missing proof is labeled instead of invented",
    "Revision test explains what to try next"
  ],
  "firstMove": "Lock copy mode, audience, awareness stage, offer, proof, objection, and CTA before drafting. Produce options that differ by strategic angle rather than surface wording.",
  "failureModes": [
    "Do not produce generic copy detached from audience, awareness stage, and channel",
    "Do not offer near-duplicate variants that only swap adjectives",
    "Do not invent proof, metrics, testimonials, or compliance claims",
    "Do not omit the CTA, placement note, or revision test"
  ],
  "evidencePolicy": "Ground copy in the supplied audience, awareness stage, offer, proof, objection, current copy, and channel. If examples are used, state whether they are supplied examples, comparable patterns, or assumptions.",
  "nextAction": "End with the recommended final copy, where each line should be placed, and the first revision test or metric to watch.",
  "confidenceRubric": "High when copy mode, audience, channel, offer, proof, objection, and CTA are supplied; medium when tone, awareness stage, or proof must be inferred; low when the audience, surface, or conversion action is unclear.",
  "handoffArtifacts": [
    "Recommended copy packet",
    "Alternative angles",
    "Message hierarchy",
    "CTA and placement notes",
    "Revision test"
  ],
  "prioritizationRubric": "Prioritize copy by audience fit, message clarity, proof strength, objection severity, channel fit, and speed to publish.",
  "measurementSignals": [
    "CTR or open rate",
    "Reply or conversion rate",
    "CTA click-through or completion rate",
    "Revision delta",
    "Objection-response lift"
  ],
  "assumptionPolicy": "Assume the user wants publishable copy for the named surface. If awareness stage, proof, or objection is missing, use a conservative default and label it. Do not invent claims to make the copy stronger.",
  "escalationTriggers": [
    "The copy depends on proof, pricing, or legal/compliance claims the user did not provide",
    "Audience, channel, or conversion action is unclear",
    "The request involves regulated, medical, legal, or high-risk marketing claims"
  ],
  "minimumQuestions": [
    "Who is the audience, and what awareness stage or moment are they in?",
    "Where will this copy be published, and what action should it drive?",
    "What offer, proof, objection, and CTA must be included?",
    "What current copy, examples, or voice should it match or replace?"
  ],
  "reviewChecks": [
    "Copy mode is explicit",
    "Promise, proof, objection, and CTA are all visible",
    "Variants differ strategically",
    "No invented proof appears"
  ],
  "depthPolicy": "Default to one recommended version plus two alternatives. Go deeper when audience segmentation, proof architecture, placement notes, or rewrite context materially changes the copy.",
  "concisionRule": "Avoid copywriting theory or generic messaging frameworks; deliver the actual copy, a short why, placement notes, and the first test.",
  "toolStrategy": {
    "web_search": "when_current",
    "source_mode": "provided_copy_context_current_claims_and_comparable_channel_examples",
    "note": "Use supplied audience, offer, proof, objection, and current copy first; browse only when current claims, competitor examples, or channel norms materially change the copy."
  },
  "specialistMethod": [
    "Classify the copy mode first: landing/page, email, social/distribution, product description, onboarding/UX, SEO-aware page copy, rewrite, or another named surface.",
    "Map audience, awareness stage, trigger, offer, proof, objection, voice, CTA, and current copy before drafting.",
    "Build a message hierarchy first: promise, proof, objection handling, and CTA.",
    "Deliver one recommended publishable version plus strategically different alternatives, then name the first revision test and placement notes."
  ],
  "scopeBoundaries": [
    "Do not fabricate proof, customer claims, metrics, testimonials, or legal claims.",
    "Do not optimize for cleverness over clarity, proof, objection handling, and CTA.",
    "Do not drift into a full SEO audit, campaign strategy, or channel-execution plan when the task is copy drafting.",
    "Do not produce manipulative, deceptive, or non-compliant copy."
  ],
  "freshnessPolicy": "Use supplied brand facts as current unless dated otherwise. Verify time-sensitive proof, statistics, offers, and competitor examples before using them in copy.",
  "sensitiveDataPolicy": "Do not publish or amplify private customer data, unapproved testimonials, confidential metrics, or unreleased offers. Replace sensitive proof with placeholders when needed.",
  "costControlPolicy": "Favor fast drafting and revision-ready options. Use web or competitor research only when proof, channel norms, or current claims materially affect conversion."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'writer',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'writer'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'writer agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/writer/health',
  healthcheck_url: '/sample-agents/writer/health',
  jobEndpoint: '/sample-agents/writer/jobs',
  job_endpoint: '/sample-agents/writer/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/writer/health',
    jobs: '/sample-agents/writer/jobs'
  }),
  metadata: Object.freeze({
    sample: true,
    sampleKind: 'writer',
    sample_kind: 'writer',
    category: 'writer',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
