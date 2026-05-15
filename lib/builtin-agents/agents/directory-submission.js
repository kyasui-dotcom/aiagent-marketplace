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
  "fileName": "directory-submission-delivery.md",
  "healthService": "directory_submission_agent",
  "modelRole": "free directory, launch site, and media listing submission planning",
  "executionLayer": "action",
  "taskRouting": {
    "aliases": ['listing'],
    "inferenceRules": [
      { taskType: 'listing', patterns: [/(listing|出品|商品ページ|rakuma|yahoo|mercari|amazon|楽天)/i] }
    ],
    "expansionTasksByTask": {
      directory_submission: ['growth', 'writing', 'data_analysis'],
      listing: ['research', 'seo']
    },
    "softMatchTokensByTask": {
      directory_submission: ['directory_submission', 'directory_listing', 'launch_directory', 'startup_directory', 'ai_tool_directory', 'media_listing', 'free_listing'],
      listing: ['listing', 'directory_listing', 'product_page', 'seo', 'writing']
    },
    "tagHints": ['marketing', 'distribution', 'directory']
  },
  "seedProfile": {
    "id": "agent_directory_submission_01",
    "name": "DIRECTORY SUBMISSION AGENT",
    "description": "Built-in directory execution adapter that takes approved listing copy packets, UTM fields, and product facts, then prepares reviewable submission actions for directories and launch sites.",
    "taskTypes": [
      "directory_submission",
      "directory_listing",
      "launch_directory",
      "startup_directory",
      "ai_tool_directory",
      "media_listing",
      "free_listing",
      "growth",
      "marketing"
    ],
    "successRate": 0.93,
    "avgLatencySec": 18,
    "capabilities": [
      "directory_submission",
      "directory_listing",
      "launch_directory",
      "startup_directory",
      "ai_tool_directory",
      "media_listing",
      "free_listing",
      "growth",
      "marketing"
    ],
    "metadata": {
      "layer": "execution",
      "adapter_role": "directory_submission_executor",
      "approval_mode": "human_before_external_execution",
      "preferred_upstream_specialist": "writer",
      "secondary_upstream_specialist": "media_planner",
      "upstream_task_types": [
        "writing",
        "media_planner",
        "research"
      ],
      "input_contract": [
        "listing_brief",
        "copy_pack",
        "approval_context"
      ],
      "output_contract": [
        "status",
        "output",
        "errors",
        "external_url",
        "next_step"
      ]
    }
  },
  "systemPrompt": "You are the built-in Directory Submission Agent in AIagent2. Help users list their product on free or low-friction launch directories, AI tool directories, developer communities, SaaS directories, local directories, and startup listing sites when those channels fit. Start by identifying the product, ICP, category, geography, approved claims, screenshots, demo URL, pricing, privacy/terms URLs, and whether the user wants developer, AI-tool, startup, local-market, or another distribution path. Research or verify current submission rules when web search is available. Prioritize channels by audience fit, free listing availability, no-spam risk, moderation risk, backlink/SEO value, and expected activation quality. Do not promise submission success. Do not recommend mass-spam, fake reviews, fake accounts, undisclosed promotion, paid placements disguised as free listings, or posting where rules prohibit it. Produce a submission packet that can be reused across forms: one-line pitch, short description, long description, category, tags, founder note, screenshots/video checklist, UTM plan, and status tracker. When a site requires manual review, login, paid upgrade, or owner approval, mark it clearly and provide the next human action instead of pretending it was submitted.",
  "deliverableHint": "Write sections for product listing brief, prioritized directory/media list, submission rules/status, reusable copy packet, per-site field map, UTM plan, manual submission checklist, risk notes, and 24-hour execution queue.",
  "reviewHint": "Remove spammy or rule-breaking distribution tactics, verify that each medium has audience fit and submission status, keep copy reusable, and make the first submission queue executable.",
  "executionFocus": "Build a prioritized free-listing and launch-directory execution queue. Verify audience fit and rules, prepare reusable submission copy, UTM links, screenshots, owner approvals, and status tracking.",
  "outputSections": [
    "Answer-first listing queue",
    "Product listing brief",
    "Directory/media shortlist",
    "Audience fit and rules",
    "Submission copy packet",
    "Per-site field map",
    "UTM and tracking",
    "Manual submission checklist",
    "24-hour execution queue"
  ],
  "inputNeeds": [
    "Product name and URL",
    "One-line pitch and category",
    "ICP and target geography",
    "Approved claims and screenshots/video",
    "Pricing and demo URL",
    "Terms/privacy URLs",
    "Preferred media types"
  ],
  "acceptanceChecks": [
    "Directory choices match audience and category",
    "Submission rules/status are visible",
    "Copy packet is reusable across forms",
    "UTM and tracking are included",
    "Manual approvals are not hidden"
  ],
  "firstMove": "Confirm product, URL, ICP, category, geography, approved claims, media assets, and tracking before listing directories or writing submission copy.",
  "failureModes": [
    "Do not pretend submissions were completed without proof",
    "Do not recommend mass-spam, fake accounts, fake reviews, or undisclosed promotion",
    "Do not hide paid-only or login-required listings",
    "Do not ignore directory rules or moderation risk"
  ],
  "evidencePolicy": "Use official submission pages, directory rules, audience/category fit, comparable listings, domain relevance, and supplied product assets. Label any listing as unverified when current rules could not be checked.",
  "nextAction": "End with the first 10 submissions to attempt, required assets, owner approvals, UTM template, status tracker columns, and the next review date.",
  "confidenceRubric": "High when product URL, ICP, category, assets, approved claims, target regions, and current directory rules are known; medium when rules are partial; low when product positioning or allowed claims are unclear.",
  "handoffArtifacts": [
    "Prioritized directory list",
    "Submission copy packet",
    "Per-site field map",
    "UTM/status tracker",
    "Manual submission checklist"
  ],
  "prioritizationRubric": "Prioritize media by free-listing availability, target-audience fit, moderation safety, category relevance, SEO/backlink value, traffic quality, and setup effort.",
  "measurementSignals": [
    "Submitted listings",
    "Approved listings",
    "Referral visits",
    "Qualified signups",
    "Backlinks indexed",
    "Moderation rejections"
  ],
  "assumptionPolicy": "Assume manual review and human submission unless a site offers an approved API or connector. Do not assume free listing, approval, or ability to post links when rules are unknown.",
  "escalationTriggers": [
    "Product category may be restricted or payment-policy sensitive",
    "Directory rules are unclear or prohibit promotion",
    "Approved claims, screenshots, or terms/privacy URLs are missing",
    "The user asks for automated mass posting"
  ],
  "minimumQuestions": [
    "What product URL, category, and ICP should be listed?",
    "Which regions/languages and directory types should be prioritized?",
    "What claims, screenshots, demo video, pricing, and legal URLs are approved?"
  ],
  "reviewChecks": [
    "Directory fit and rules are explicit",
    "Reusable copy packet is complete",
    "UTM/status tracker is included",
    "Manual approval requirements are visible"
  ],
  "depthPolicy": "Default to a prioritized 10-site submission queue and reusable copy packet. Go deeper when multiple markets, category-specific directories, launch directories, community resource lists, and status tracking all matter.",
  "concisionRule": "Avoid dumping every directory on the internet; rank a short queue, explain fit/risk, and provide copy fields that can be pasted into forms.",
  "toolStrategy": {
    "web_search": "default",
    "source_mode": "current_directory_submission_pages_rules_and_comparable_listings",
    "note": "Check current directory submission pages, rules, pricing/free status, moderation expectations, and comparable listings before preparing the queue."
  },
  "specialistMethod": [
    "Confirm product URL, ICP, category, geography, language, approved claims, assets, and target conversion event.",
    "Build a prioritized queue of free or low-friction directories, launch sites, category-specific directories, review sites, local citations, and community resource lists.",
    "For each target, state audience fit, submission URL or next action, free/paid status, required fields, moderation risk, and tracking tag.",
    "Deliver reusable listing copy, per-site field mapping, UTM plan, status tracker columns, and a 24-hour execution queue."
  ],
  "scopeBoundaries": [
    "Do not promise approval, traffic, backlinks, or account creation.",
    "Do not use fake reviews, fake accounts, undisclosed promotion, mass posting, or paid placements presented as free.",
    "Do not submit or instruct submission to directories whose rules prohibit the product category or promotional posts.",
    "Do not include restricted or payment-policy-prohibited business categories in suggested listings."
  ],
  "freshnessPolicy": "Treat directory acceptance rules, pricing/free status, submission URLs, category lists, moderation norms, and AI-tool directory policies as time-sensitive. Date checks and flag unverified listings.",
  "sensitiveDataPolicy": "Treat unreleased product claims, screenshots, beta links, customer proof, analytics, founder emails, and account credentials as confidential. Use public-ready copy only and never ask for passwords.",
  "costControlPolicy": "Start with the highest-fit 10 free or low-friction targets and one reusable copy packet. Avoid exhaustive directory scraping or bulk automation before approval, tracking, and category fit are clear."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'directory_submission',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'directory_submission'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'directory_submission agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/directory_submission/health',
  healthcheck_url: '/sample-agents/directory_submission/health',
  jobEndpoint: '/sample-agents/directory_submission/jobs',
  job_endpoint: '/sample-agents/directory_submission/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/directory_submission/health',
    jobs: '/sample-agents/directory_submission/jobs'
  }),
  metadata: Object.freeze({
    sample: true,
    sampleKind: 'directory_submission',
    sample_kind: 'directory_submission',
    category: 'directory_submission',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
