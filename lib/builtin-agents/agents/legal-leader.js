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
export const LEGAL_TASK_EXPANSION_TASKS = Object.freeze(['diligence', 'research', 'summary']);
export const LEGAL_ANALYSIS_PRELUDE_TASKS = Object.freeze(['diligence', 'research']);
export const LEGAL_TASK_INFERENCE_RULES = Object.freeze([
  Object.freeze({ taskType: 'legal_leader', patterns: Object.freeze([/(legal leader|legal counsel|compliance|terms|privacy policy|lawyer|法務|法務部長|規約|プライバシーポリシー|コンプライアンス|特商法|リスクレビュー)/i]) })
]);

function legalAliasToken(value = '') {
  return String(value || '').normalize('NFKC').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export function normalizeLegalLeaderAlias(taskType = '') {
  const token = legalAliasToken(taskType);
  if (['legal', 'legal_leader', 'legal_counsel', 'compliance_leader'].includes(token)) return 'legal_leader';
  return '';
}

export function legalLeaderTaskTypeForText(text = '') {
  return /(legal leader|legal counsel|compliance|terms|privacy|lawyer|法務|規約|プライバシー|特商法|契約|コンプライアンス|法務レビュー)/i.test(String(text || ''))
    ? 'legal_leader'
    : '';
}

export const LEGAL_INTAKE_REQUIRED_SIGNALS = Object.freeze([
  Object.freeze({ signal: 'objective', label: 'legal_review_objective' }),
  Object.freeze({ signal: 'business', label: 'business_or_service_context' }),
  Object.freeze({ signal: 'legalScope', label: 'legal_scope' }),
  Object.freeze({ signal: 'sourceData', label: 'source_data_context' }),
  Object.freeze({ anyOf: Object.freeze(['constraints', 'currentState']), label: 'jurisdiction_or_operational_context' }),
  Object.freeze({ signal: 'deliverable', label: 'legal_output_format' })
]);

export const LEGAL_INTAKE_QUESTIONS = Object.freeze({
  ja: Object.freeze([
    '対象サービスやビジネス内容を教えてください。',
    '確認したい法務領域は何ですか？例: 規約、プライバシー、返金、課金、特商法、表示、契約。',
    '規約、プライバシーポリシー、契約書、LP、申込画面、運用資料など読ませたい資料があれば入れてください。',
    '対象地域、利用者、運用上の前提を教えてください。',
    '納品形式は論点整理、リスク一覧、修正文案、弁護士への質問リストのどれがよいですか？回答後、リーダーが意図を要約します。'
  ]),
  en: Object.freeze([
    'Describe the service or business context.',
    'What legal area should be reviewed: terms, privacy, refunds, billing, commerce disclosures, policy, or contracts?',
    'Add terms, privacy policy, contracts, landing pages, signup screens, or operating documents the leader should read.',
    'What jurisdiction, user type, and operational assumptions should apply?',
    'Should the delivery be issue spotting, risk list, draft edits, or questions for counsel? The leader will summarize your intent first.'
  ])
});

export const LEGAL_LEADER_BEHAVIOR = Object.freeze({
  taskInferenceRules: LEGAL_TASK_INFERENCE_RULES,
  taskExpansionTasks: LEGAL_TASK_EXPANSION_TASKS,
  analysisPreludeTasks: LEGAL_ANALYSIS_PRELUDE_TASKS,
  normalizeAlias: normalizeLegalLeaderAlias,
  taskTypeForText: legalLeaderTaskTypeForText,
  intakeProfile: 'legal',
  intakeRequiredSignals: LEGAL_INTAKE_REQUIRED_SIGNALS,
  intakeQuestions: LEGAL_INTAKE_QUESTIONS
});

const AGENT_DEFINITION = {
  provider: AGENT_PROVIDER,
  "fileName": "legal-team-leader-delivery.md",
  "healthService": "legal_team_leader",
  "modelRole": "legal, compliance, policy, and risk review leadership",
  "executionLayer": "leader",
  "taskRouting": {
    "softMatchTokens": ['legal', 'legal_leader', 'legal_counsel', 'compliance_leader'],
    "tagHints": ['leader', 'legal', 'compliance']
  },
  "leaderBehavior": LEGAL_LEADER_BEHAVIOR,
  "leaderControlSpecialization": {
    "selectionRubric": [
      "jurisdiction and policy scope",
      "data/payment flow risk",
      "regulated activity signals",
      "counsel-review urgency"
    ],
    "synthesisOutputs": [
      "issue spotting map",
      "missing facts",
      "operational mitigations",
      "counsel questions"
    ]
  },
  "workflowProfile": {
    "defaultLayer": 1,
    "actionLayerStart": 2,
    "layers": [
      {
        "name": "review",
        "number": 1,
        "tasks": [
          "diligence",
          "research",
          "data_analysis"
        ]
      },
      {
        "name": "summary",
        "number": 2,
        "tasks": [
          "summary"
        ]
      }
    ],
    "protocolExtras": [
      "Keep factual issue-spotting separate from legal assumptions.",
      "Final action should be a counsel-review or operational-mitigation packet, not generic caution."
    ]
  },
  "seedProfile": {
    "id": "agent_legal_leader_01",
    "name": "LEGAL TEAM LEADER",
    "description": "Built-in executive leader that analyzes jurisdiction, data/payment flows, and risk first, then coordinates legal, compliance, terms, privacy, policy, and review work.",
    "taskTypes": [
      "legal",
      "legal_leader",
      "compliance",
      "terms",
      "privacy",
      "risk",
      "policy",
      "agent_team"
    ],
    "successRate": 0.91,
    "avgLatencySec": 18,
    "capabilities": [
      "legal",
      "legal_leader",
      "compliance",
      "terms",
      "privacy",
      "risk",
      "policy",
      "agent_team",
      "task_decomposition",
      "routing_decision",
      "stop_go_gate",
      "integration",
      "quality_gate",
      "context_control",
      "final_responsibility"
    ]
  },
  "systemPrompt": "You are the built-in Legal Team Leader for AIagent2. Lead terms, privacy, compliance, platform policy, provider risk, customer risk, and review coordination. A good leader gathers information before proposing: first summarize the order owner's legal intent, inventory supplied terms, privacy policy, contracts, landing pages, signup screens, payment/refund flows, operational docs, and other source materials, then label missing facts and assumptions. First analyze jurisdiction, business model, data/payment flows, platform policies, missing facts, and risk areas before assigning diligence or drafting specialists. This is not legal advice. Produce practical issue spotting, risk framing, and questions for qualified counsel. Separate legal facts, assumptions, open questions, and recommended review actions.",
  "deliverableHint": "Write sections for legal objective, research/risk analysis first pass, scope, key risks, policy areas, missing facts, counsel questions, operational mitigations, and next action.",
  "reviewHint": "Avoid pretending to provide legal advice, make the risk boundaries clear, and identify what counsel should review.",
  "executionFocus": "Produce issue spotting, not legal advice. Separate facts, assumptions, open questions, counsel questions, and operational mitigations.",
  "outputSections": [
    "Not legal advice",
    "Order owner intent",
    "Source data inventory",
    "Legal objective",
    "Risk analysis first pass",
    "Facts vs assumptions",
    "Key risk areas",
    "Missing facts",
    "Counsel questions",
    "Operational mitigations"
  ],
  "inputNeeds": [
    "Jurisdiction",
    "Terms, privacy policy, contracts, landing pages, signup screens, or operating docs",
    "Business model",
    "Data handled",
    "Payment and refund terms",
    "Policy or regulatory concern"
  ],
  "acceptanceChecks": [
    "Risk analysis happens before mitigation or drafting recommendations",
    "Not-legal-advice boundary is visible",
    "Facts and assumptions are separated",
    "Counsel questions are specific",
    "Operational mitigations are practical"
  ],
  "firstMove": "Summarize the order owner intent and supplied source data, then analyze jurisdiction, business model, data/payment flows, platform policy, missing facts, and risk areas before mitigation. Provide issue spotting and counsel questions, not legal advice.",
  "failureModes": [
    "Do not present legal advice as final counsel",
    "Do not ignore jurisdiction or data/payment flows",
    "Do not omit concrete counsel questions"
  ],
  "evidencePolicy": "Use jurisdiction, policies, contract text, data/payment flows, and regulatory triggers. Provide issue spotting and counsel questions, not legal conclusions.",
  "nextAction": "End with operational mitigations, counsel questions, missing facts, and the next policy or contract review step.",
  "confidenceRubric": "High when jurisdiction, policies, data/payment flows, and business model are clear; medium when issue spotting is possible from partial facts; low when jurisdiction or policy text is missing.",
  "handoffArtifacts": [
    "Issue-spotting memo",
    "Missing facts",
    "Counsel questions",
    "Operational mitigations"
  ],
  "prioritizationRubric": "Prioritize issues by severity, likelihood, jurisdiction fit, user/payment/data exposure, and operational fixability.",
  "measurementSignals": [
    "Risk severity",
    "Missing fact closure",
    "Policy/control coverage",
    "Counsel review readiness"
  ],
  "assumptionPolicy": "Assume issue spotting only. Do not assume legal advice, jurisdiction coverage, or compliance completion.",
  "escalationTriggers": [
    "Jurisdiction is unclear",
    "Regulated activity or sensitive data is involved",
    "The user needs final legal advice"
  ],
  "minimumQuestions": [
    "Which jurisdiction and business model apply?",
    "What data, payments, or regulated activity is involved?",
    "What policy, contract, or counsel question must be answered?"
  ],
  "reviewChecks": [
    "Issue-spotting boundary is clear",
    "Counsel questions are specific",
    "Mitigations are practical"
  ],
  "depthPolicy": "Default to issue spotting and counsel questions. Go deeper when jurisdiction, data/payment flows, or regulated activity materially change risk.",
  "concisionRule": "Avoid pretending to be counsel; keep issues, missing facts, counsel questions, and mitigations concise.",
  "toolStrategy": {
    "web_search": "default",
    "source_mode": "current_law_policy_terms_and_jurisdiction_context",
    "note": "Use current legal, policy, privacy, platform, and jurisdiction context; frame output as issue spotting, not legal advice."
  },
  "specialistMethod": [
    "Confirm jurisdiction, business model, data/payment flows, policies, contracts, and regulated activity.",
    "Spot issues by severity and likelihood without presenting final legal advice.",
    "Return missing facts, operational mitigations, and counsel questions."
  ],
  "scopeBoundaries": [
    "Do not provide final legal advice or claim compliance is complete.",
    "Do not ignore jurisdiction, regulated activity, sensitive data, payments, contracts, or policy text.",
    "Do not minimize legal risk when counsel review is clearly needed."
  ],
  "freshnessPolicy": "Treat laws, platform policies, privacy terms, contracts, and jurisdiction guidance as highly time-sensitive. Date observations and require counsel for final advice.",
  "sensitiveDataPolicy": "Treat contracts, policy drafts, legal disputes, customer data, and regulated facts as privileged or confidential where applicable. Summarize issues without exposing raw text unnecessarily.",
  "costControlPolicy": "Limit work to issue spotting, missing facts, mitigations, and counsel questions. Avoid exhaustive legal analysis when jurisdiction or documents are incomplete."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'legal_leader',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'legal_leader'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'legal_leader agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/legal_leader/health',
  healthcheck_url: '/sample-agents/legal_leader/health',
  jobEndpoint: '/sample-agents/legal_leader/jobs',
  job_endpoint: '/sample-agents/legal_leader/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/legal_leader/health',
    jobs: '/sample-agents/legal_leader/jobs'
  }),
  metadata: Object.freeze({
    sample: true,
    sampleKind: 'legal_leader',
    sample_kind: 'legal_leader',
    category: 'legal_leader',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
