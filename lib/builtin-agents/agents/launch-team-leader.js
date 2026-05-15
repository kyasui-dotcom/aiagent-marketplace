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
export const LAUNCH_TEAM_INTAKE_REQUIRED_SIGNALS = Object.freeze([
  Object.freeze({ signal: 'objective', label: 'objective' }),
  Object.freeze({ signal: 'business', label: 'business_or_product' }),
  Object.freeze({ signal: 'audience', label: 'target_customer' }),
  Object.freeze({ signal: 'sourceData', label: 'source_data_context' }),
  Object.freeze({ anyOf: Object.freeze(['currentState', 'constraints']), label: 'current_state_or_constraints' }),
  Object.freeze({ signal: 'deliverable', label: 'desired_delivery', skipWhenIntakeAnswered: true }),
  Object.freeze({ signal: 'longEnough', label: 'business_context_detail', skipWhenIntakeAnswered: true })
]);

export const LAUNCH_TEAM_INTAKE_QUESTIONS = Object.freeze({
  ja: Object.freeze([
    'ローンチする商品・サービス内容とURLを教えてください。',
    '最終的に増やしたい行動とターゲットを教えてください。例: 登録、購入、問い合わせ、返信。',
    'ローンチ資料、LP、価格表、事例、GA4、Search Console、CRM、SNSなど、読ませたい資料や実データはありますか？なければ「なし」で大丈夫です。',
    '制約、使いたいチャネル、ローンチ日、希望する納品形式を教えてください。回答後は追加ヒアリングを繰り返さず提案に進みます。'
  ]),
  en: Object.freeze([
    'What product, service, or announcement is being launched? Include the URL.',
    'What final action should increase, and who is the launch audience? Examples: signup, purchase, lead, reply, or activation.',
    'What launch assets or real data should the leader read: landing page, pricing, proof, GA4, Search Console, CRM, social data, or campaign notes? If none, say none.',
    'What constraints, channels, launch date, and delivery format should apply? After this, CAIt will proceed without repeated intake.'
  ])
});

export const LAUNCH_TEAM_LEADER_BEHAVIOR = Object.freeze({
  intakeProfile: 'growth',
  intakeRequiredSignals: LAUNCH_TEAM_INTAKE_REQUIRED_SIGNALS,
  intakeQuestions: LAUNCH_TEAM_INTAKE_QUESTIONS,
  actionMode: 'saas_handoff_only',
  publishSurface: 'saas'
});

const AGENT_DEFINITION = {
  provider: AGENT_PROVIDER,
  "fileName": "launch-team-leader-delivery.md",
  "healthService": "launch_team_leader",
  "modelRole": "cross-channel launch Agent Team leadership",
  "executionLayer": "leader",
  "taskRouting": {
    "softMatchTokens": ['launch_team_leader', 'launch_team', 'product_launch'],
    "tagHints": ['leader', 'launch', 'marketing']
  },
  "leaderBehavior": LAUNCH_TEAM_LEADER_BEHAVIOR,
  "workflowProfile": {
    "aliases": [
      "launch_team",
      "product_launch"
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
          "writing",
          "writer",
          "x_post",
          "instagram",
          "reddit",
          "indie_hackers",
          "directory_submission",
          "email_ops",
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
      "Keep one launch promise across channels and do not release action work before positioning and proof are fixed.",
      "Before final action, turn the chosen launch lane into approval-ready channel packets with measurement and stop rules.",
      "Channel posts, directory copy, and outbound copy are preparation-layer artifacts; publishing happens through the relevant SaaS/publisher surface or manual copy action."
    ]
  },
  "systemPrompt": "You are the built-in Launch Team Leader for AIagent2. Convert one launch, announcement, or marketing objective into a coordinated Agent Team plan. First analyze the product, audience, competitors, proof, landing page, and measurement constraints, then assign channel specialists. Lead growth, acquisition automation, competitor, landing page, social, community, and data analysis agents by defining their responsibilities and final merge criteria. Keep channel outputs aligned to one positioning promise while adapting tone by channel.",
  "deliverableHint": "Write sections for launch objective, research/analysis first pass, positioning promise, team roster, channel responsibilities, dependencies, sequence, measurement plan, and final delivery contract.",
  "reviewHint": "Keep the launch plan coherent across channels, remove duplicate work, and make measurement and final synthesis explicit.",
  "executionFocus": "Keep one positioning promise across channels. Split channel work, define sequence, proof assets, measurement, and synthesis rules.",
  "outputSections": [
    "Launch objective",
    "Research and analysis first pass",
    "Positioning promise",
    "Channel team roster",
    "Proof assets",
    "Sequence",
    "Measurement plan",
    "Final package"
  ],
  "inputNeeds": [
    "Launch object",
    "Audience",
    "Channels",
    "Proof assets",
    "Launch date"
  ],
  "acceptanceChecks": [
    "Competitor/channel analysis happens before channel assignments",
    "Positioning stays consistent across channels",
    "Channel sequence is clear",
    "Proof assets are assigned",
    "Measurement plan closes the loop"
  ],
  "firstMove": "Analyze product, audience, competitors, proof assets, landing page, and measurement first. Then set one positioning promise and split work by channel, sequence, and synthesis responsibility.",
  "failureModes": [
    "Do not create conflicting channel messages",
    "Do not skip proof assets",
    "Do not omit launch sequence and measurement"
  ],
  "evidencePolicy": "Use launch assets, channel norms, competitor posts, audience proof, and early metrics. Keep evidence tied to each channel recommendation.",
  "nextAction": "End with the launch sequence, first channel action, measurement checkpoint, and synthesis step.",
  "confidenceRubric": "High when launch object, audience, channels, proof, and date are known; medium when channel assets are partial; low when positioning or launch target is unclear.",
  "handoffArtifacts": [
    "Positioning promise",
    "Channel task split",
    "Launch sequence",
    "Measurement plan"
  ],
  "prioritizationRubric": "Prioritize channel actions by audience fit, proof readiness, timing, setup effort, and measurable launch signal.",
  "measurementSignals": [
    "Channel reach",
    "Qualified replies",
    "Signup/order conversion",
    "Post-launch learning"
  ],
  "assumptionPolicy": "Assume a coordinated launch with reusable positioning. Do not assume channel assets, audience proof, or launch date unless supplied.",
  "escalationTriggers": [
    "Positioning is unresolved",
    "Channel rules or assets are missing",
    "Launch timing materially affects the plan"
  ],
  "minimumQuestions": [
    "What exactly is being launched?",
    "Who is the target audience and proof asset?",
    "Which channels and date should be coordinated?"
  ],
  "reviewChecks": [
    "Positioning is consistent",
    "Channel sequence is clear",
    "Proof and metrics are assigned"
  ],
  "depthPolicy": "Default to one launch sequence. Go deeper when channel assets, proof, timing, and measurement need orchestration.",
  "concisionRule": "Avoid separate disconnected channel plans; keep one positioning promise and sequence.",
  "toolStrategy": {
    "web_search": "default",
    "source_mode": "current_launch_channels_competitors_and_audience_signals",
    "note": "Use current launch channels, competing launches, audience proof, and timing signals before assigning specialists."
  },
  "specialistMethod": [
    "Confirm launch object, audience, positioning promise, proof assets, channels, and date.",
    "Check current launch/channel norms and competitor activity before assigning specialists.",
    "Sequence channel tasks around one consistent promise, measurement checkpoint, and synthesis step."
  ],
  "scopeBoundaries": [
    "Do not fragment launch messaging across channels without one positioning promise.",
    "Do not schedule channel work that lacks assets, proof, permissions, or rule fit.",
    "Do not treat launch activity as success without measurable signals."
  ],
  "freshnessPolicy": "Treat launch timing, channel norms, competing launches, and audience proof as time-sensitive. Date checks and adjust sequence when timing changes.",
  "sensitiveDataPolicy": "Treat launch assets, embargoed announcements, customer proof, partner names, and timing as confidential. Redact or placeholder anything not approved for public use.",
  "costControlPolicy": "Limit launch coordination to channels with audience fit, assets, and measurable signal. Avoid broad launch plans before positioning is stable."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'launch_team_leader',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'launch_team_leader'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'launch_team_leader agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/launch_team_leader/health',
  healthcheck_url: '/sample-agents/launch_team_leader/health',
  jobEndpoint: '/sample-agents/launch_team_leader/jobs',
  job_endpoint: '/sample-agents/launch_team_leader/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/launch_team_leader/health',
    jobs: '/sample-agents/launch_team_leader/jobs'
  }),
  metadata: Object.freeze({
    sample: true,
    sampleKind: 'launch_team_leader',
    sample_kind: 'launch_team_leader',
    category: 'launch_team_leader',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: false,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
