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
export const FREE_WEB_GROWTH_INTAKE_REQUIRED_SIGNALS = Object.freeze([
  Object.freeze({ signal: 'objective', label: 'objective' }),
  Object.freeze({ signal: 'business', label: 'business_or_product' }),
  Object.freeze({ signal: 'audience', label: 'target_customer' }),
  Object.freeze({ signal: 'sourceData', label: 'source_data_context' }),
  Object.freeze({ anyOf: Object.freeze(['currentState', 'constraints']), label: 'current_state_or_constraints' }),
  Object.freeze({ signal: 'deliverable', label: 'desired_delivery', skipWhenIntakeAnswered: true }),
  Object.freeze({ signal: 'longEnough', label: 'business_context_detail', skipWhenIntakeAnswered: true })
]);

export const FREE_WEB_GROWTH_INTAKE_QUESTIONS = Object.freeze({
  ja: Object.freeze([
    '売りたい商材・サービス内容とURLを教えてください。',
    '最終的に増やしたい行動とターゲットを教えてください。例: 購入、問い合わせ、登録。誰向けかも入れてください。',
    '営業資料、DL資料、LP、価格表、GA4、Search Console、CRM、売上、問い合わせ、SNSなど、読ませたい資料や実データはありますか？なければ「なし」で大丈夫です。',
    '制約、使いたい無料チャネル、希望する納品形式を教えてください。回答後は追加ヒアリングを繰り返さず提案に進みます。'
  ]),
  en: Object.freeze([
    'What product or service do you want to grow? Include the URL.',
    'What final action should increase, and who is the target customer? Examples: signup, lead, purchase, activation, or retention.',
    'What source materials or real data should the leader read: landing page, pricing, GA4, Search Console, CRM, sales, leads, community, or social data? If none, say none.',
    'What no-paid constraints, preferred free channels, and delivery format should apply? After this, CAIt will proceed without repeated intake.'
  ])
});

export const FREE_WEB_GROWTH_LEADER_BEHAVIOR = Object.freeze({
  intakeProfile: 'growth',
  intakeRequiredSignals: FREE_WEB_GROWTH_INTAKE_REQUIRED_SIGNALS,
  intakeQuestions: FREE_WEB_GROWTH_INTAKE_QUESTIONS,
  actionMode: 'saas_handoff_only',
  publishSurface: 'saas'
});

const AGENT_DEFINITION = {
  provider: AGENT_PROVIDER,
  "fileName": "free-web-growth-team-delivery.md",
  "healthService": "free_web_growth_team",
  "modelRole": "free web growth team leadership",
  "executionLayer": "leader",
  "taskRouting": {
    "softMatchTokens": ['free_web_growth_leader', 'free_web_growth', 'organic_growth', 'growth'],
    "tagHints": ['leader', 'marketing', 'growth', 'organic']
  },
  "leaderBehavior": FREE_WEB_GROWTH_LEADER_BEHAVIOR,
  "workflowProfile": {
    "aliases": [
      "free_web_growth",
      "organic_growth"
    ],
    "defaultLayer": 3,
    "actionLayerStart": 4,
    "externalActionMode": "saas_handoff_only",
    "publishSurface": "saas",
    "publishApprovalSurface": "saas",
    "layers": [
      {
        "name": "research",
        "phase": "research",
        "number": 1,
        "tasks": [
          "research",
          "teardown",
          "data_analysis"
        ]
      },
      {
        "name": "planning",
        "phase": "planning",
        "number": 2,
        "tasks": [
          "media_planner",
          "growth"
        ]
      },
      {
        "name": "preparation",
        "phase": "preparation",
        "number": 3,
        "tasks": [
          "landing",
          "seo_gap",
          "writing",
          "writer",
          "x_post",
          "reddit",
          "indie_hackers",
          "email_ops",
          "directory_submission",
          "citation_ops",
          "acquisition_automation"
        ]
      },
      {
        "name": "saas_publish_handoff",
        "phase": "action",
        "number": 4,
        "tasks": []
      },
      {
        "name": "summary",
        "phase": "summary",
        "number": 5,
        "tasks": [
          "summary"
        ]
      }
    ],
    "protocolExtras": [
      "Keep the action layer limited to free, owned, or low-friction channels.",
      "Do not release paid or sponsorship tactics inside the free-web action layer.",
      "Before final action, convert the chosen lane into one 24-hour packet and one 7-day packet.",
      "Community posts, directory copy, and outbound copy are preparation-layer artifacts; publishing happens through the relevant SaaS/publisher surface or manual copy action."
    ]
  },
  "systemPrompt": "You are the built-in Free Web Growth Team Leader in AIagent2. Plan organic web growth actions for the user's product or business that do not require paid ads or paid sponsorships. Lead SEO content gap, landing page critique, growth, acquisition automation, competitor positioning, X, Reddit, Indie Hackers, directory, local, email, and data analysis agents when they fit the user's objective. Prioritize actions a founder or operator can execute with free channels, owned media, community posts, product pages, directories, technical SEO, and analytics. Separate free actions from paid or account-gated actions, and make the first 24 hours extremely concrete. When a landing diagnosis memo is provided, use it as the operating brief and turn it into a ship order for the landing page, supporting pages, and distribution copy.",
  "deliverableHint": "Write sections for answer-first recommendation, no-paid-ads scope, free web action map, team roster, SEO/actions, community/actions, landing page/actions, analytics checks, 24h plan, 7-day plan, risks, and stop rules.",
  "reviewHint": "Remove paid ad tactics, keep actions executable, separate channels, include concrete copy/content tasks, and define measurable free-growth KPIs.",
  "executionFocus": "Keep the plan no-paid-ads. Assign SEO, community, owned-media, landing, directory, analytics, and copy tasks with a 24-hour starting plan.",
  "outputSections": [
    "No-paid-ads scope",
    "Team roster",
    "SEO tasks",
    "Community tasks",
    "Owned-media tasks",
    "Landing tasks",
    "24-hour plan",
    "7-day plan"
  ],
  "inputNeeds": [
    "Product or site",
    "ICP",
    "Current channels",
    "Existing assets",
    "Analytics access"
  ],
  "acceptanceChecks": [
    "No-paid-ads constraint is preserved",
    "Specialists have non-overlapping tasks",
    "24-hour and 7-day actions are concrete",
    "Measurement loop is defined"
  ],
  "firstMove": "Keep the scope no-paid-ads. Build a coordinated plan across SEO, community, owned media, landing page, directories, analytics, and copy.",
  "failureModes": [
    "Do not drift into paid ads",
    "Do not assign overlapping specialist work",
    "Do not skip analytics and feedback loops"
  ],
  "evidencePolicy": "Use public search/community signals, site assets, analytics when supplied, and no-paid-channel constraints. Each specialist output should name its evidence basis.",
  "nextAction": "End with a 24-hour no-paid-ads action list, specialist owners, and the 7-day measurement loop.",
  "confidenceRubric": "High when site, ICP, assets, channels, and analytics are available; medium when analytics are missing but public signals exist; low when product or target user is unclear.",
  "handoffArtifacts": [
    "Specialist roster",
    "24-hour no-paid plan",
    "7-day measurement loop",
    "Asset/source requests"
  ],
  "prioritizationRubric": "Prioritize no-paid tasks by compounding value, dependency order, asset reuse, measurement quality, and speed to first signal.",
  "measurementSignals": [
    "Organic impressions",
    "Community replies",
    "Owned-media clicks",
    "Activation/order conversion"
  ],
  "assumptionPolicy": "Assume no paid ads and limited assets. Do not assume analytics, content inventory, or community access unless supplied.",
  "escalationTriggers": [
    "Product or ICP is unclear",
    "Tasks require account access not granted",
    "Community/channel rules are unknown"
  ],
  "minimumQuestions": [
    "What site/product and ICP should we grow?",
    "What no-paid assets and channels already exist?",
    "What metric should improve in 7 days?"
  ],
  "reviewChecks": [
    "No-paid constraint is preserved",
    "Specialists do not overlap",
    "Measurement loop is defined"
  ],
  "depthPolicy": "Default to a short no-paid starting plan. Go deeper when SEO, community, owned media, landing, and analytics tasks must be coordinated.",
  "concisionRule": "Avoid dumping every possible free tactic; sequence only the tasks with compounding value.",
  "toolStrategy": {
    "web_search": "default",
    "source_mode": "current_free_channels_serp_social_and_community_scan",
    "note": "Use free, current public channels and competitor evidence before sequencing specialist work."
  },
  "specialistMethod": [
    "Confirm product, ICP, offer, assets, channels, analytics, and no-paid constraint before splitting work.",
    "Scan free public channels and competitors to identify compounding opportunities.",
    "Assign specialist tasks in dependency order and define the 24-hour action list plus 7-day measurement loop."
  ],
  "scopeBoundaries": [
    "Do not introduce paid ads, paid tools, or budget-dependent tactics unless the user explicitly allows them.",
    "Do not assign overlapping specialist work without a merge rule.",
    "Do not recommend community actions that violate rules or look like hidden promotion."
  ],
  "freshnessPolicy": "Treat free channels, SERP opportunities, community rules, and competitor activity as time-sensitive. Date scans before assigning specialist work.",
  "sensitiveDataPolicy": "Treat site analytics, account access, customer lists, community identities, and unpublished content as confidential. Specialist briefs should include only needed context.",
  "costControlPolicy": "Stay within no-paid, high-leverage public channels. Assign only specialist work that can compound within 24 hours and be measured in 7 days."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'free_web_growth_leader',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'free_web_growth_leader'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'free_web_growth_leader agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/free_web_growth_leader/health',
  healthcheck_url: '/sample-agents/free_web_growth_leader/health',
  jobEndpoint: '/sample-agents/free_web_growth_leader/jobs',
  job_endpoint: '/sample-agents/free_web_growth_leader/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/free_web_growth_leader/health',
    jobs: '/sample-agents/free_web_growth_leader/jobs'
  }),
  metadata: Object.freeze({
    sample: true,
    sampleKind: 'free_web_growth_leader',
    sample_kind: 'free_web_growth_leader',
    category: 'free_web_growth_leader',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: false,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
