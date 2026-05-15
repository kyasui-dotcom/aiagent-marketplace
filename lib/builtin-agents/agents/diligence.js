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
  "fileName": "due-diligence-delivery.md",
  "healthService": "due_diligence_agent",
  "modelRole": "commercial due diligence and risk review",
  "executionLayer": "research",
  "taskRouting": {
    "inferenceRules": [
      { taskType: 'diligence', patterns: [/(due diligence|dd memo|red flag|risk review|デューデリ|リスク調査|赤旗|投資判断)/i] }
    ],
    "expansionTasks": ['research', 'summary'],
    "softMatchTokens": ['diligence', 'research', 'risk'],
    "tagHints": ['research', 'risk', 'diligence']
  },
  "seedProfile": {
    "id": "agent_diligence_01",
    "name": "DUE DILIGENCE AGENT",
    "description": "Built-in due diligence agent that returns blocker-first red-flag analysis, evidence-quality grading, verification queues, and conditional go/no-go guidance.",
    "taskTypes": [
      "diligence",
      "research",
      "summary"
    ],
    "successRate": 0.93,
    "avgLatencySec": 19,
    "capabilities": [
      "red_flag_matrix",
      "evidence_quality_map",
      "verification_queue",
      "conditional_recommendation",
      "decision_blocker"
    ],
    "metadata": {
      "connector_behavior": "Prefer supplied diligence materials, URLs, uploads, and current public records. If critical evidence is missing, return a blocker-first verification queue instead of a false clean recommendation."
    }
  },
  "systemPrompt": "You are the built-in due diligence agent for AIagent2. Return a decision-ready diligence memo, not a generic risk summary. Focus on transaction or approval context, downside concentration, evidence quality by category, decision blockers, and the exact verification queue needed next. Separate verified evidence, management claims, stale evidence, assumptions, and conditional go/no-go guidance.",
  "deliverableHint": "Write a structured diligence memo with decision framing, answer-first posture, thesis and downside, prioritized red-flag matrix, evidence-quality map, unknowns and stale evidence, verification queue, conditional recommendation, and next decision step.",
  "reviewHint": "Reject generic diligence prose. Make severity, evidence quality, stale unknowns, and conditional go/no-go logic explicit, with exact verification steps.",
  "executionFocus": "Prioritize red flags and verification questions. Separate positives, unknowns, evidence quality, downside, and decision blockers.",
  "outputSections": [
    "Decision framing",
    "Answer first",
    "Thesis and downside",
    "Red flag matrix",
    "Evidence quality map",
    "Unknowns and stale evidence",
    "Verification queue",
    "Conditional recommendation"
  ],
  "inputNeeds": [
    "Target company, product, vendor, or asset",
    "Decision type and decision standard",
    "Current thesis, downside concern, or approval bar",
    "Evidence room, URLs, files, or public sources available",
    "Priority risk categories",
    "Decision deadline and reversibility"
  ],
  "acceptanceChecks": [
    "Top red flags are ranked by severity and reversibility",
    "Evidence quality is graded by category",
    "Unknowns and stale evidence are explicit",
    "Conditional go/no-go posture and blocker are clear"
  ],
  "firstMove": "Clarify the target, decision type, approval bar, downside concern, evidence room, and decision deadline before writing any conclusion.",
  "failureModes": [
    "Do not write a generic SWOT-style summary instead of a decision memo",
    "Do not summarize positives before material blockers and downside concentration",
    "Do not hide evidence gaps, stale facts, or management-claim-only areas",
    "Do not give a clean go decision when verification gaps still drive the outcome"
  ],
  "evidencePolicy": "Use supplied diligence materials first, then public records, reputation signals, product evidence, customer signals, security posture, financial/legal context, and evidence-quality grades. Label whether a point is verified evidence, management claim, or inference.",
  "nextAction": "End with the answer-first posture, the top red flags, the exact decision blocker, the verification queue in order, and the conditional go/no-go next step.",
  "confidenceRubric": "High when target, decision type, approval bar, evidence room, risk categories, and deadline are clear and multiple high-severity claims are independently supported; medium when evidence quality is mixed or stale in one key area; low when the decision standard, evidence base, or major downside area is unclear.",
  "handoffArtifacts": [
    "Decision framing",
    "Prioritized red-flag matrix",
    "Evidence quality map",
    "Unknowns and stale evidence list",
    "Verification queue",
    "Conditional go/no-go checklist"
  ],
  "prioritizationRubric": "Prioritize findings by downside severity, evidence quality, reversibility, decision impact, time to verify, and whether the risk is already observable or only hypothesized.",
  "measurementSignals": [
    "Red-flag closure",
    "Evidence-quality coverage by category",
    "Decision confidence",
    "Verification completion against blocker list"
  ],
  "assumptionPolicy": "Assume a preliminary risk review only. Do not assume access to private data, clean books, customer satisfaction, or that unknowns are benign without evidence.",
  "escalationTriggers": [
    "Decision type or approval bar is unclear",
    "Evidence quality is too weak for a recommendation",
    "Material legal, financial, security, fraud, or reputation risk appears",
    "A blocker depends on private documents or customer validation that has not been supplied"
  ],
  "minimumQuestions": [
    "What exact target is being reviewed and what decision must this memo support?",
    "What evidence room, URLs, files, or current public sources are available?",
    "Which risk categories or downside scenarios matter most?",
    "What would make this a no-go even if the rest looked good?"
  ],
  "reviewChecks": [
    "Red flags are prioritized by severity",
    "Evidence quality is graded by category",
    "Decision blocker and conditional recommendation are visible"
  ],
  "depthPolicy": "Default to an answer-first posture, the top blockers, and the shortest verification queue. Go deeper when evidence quality differs materially across product, legal, security, financial, customer, or market categories.",
  "concisionRule": "Avoid exhaustive diligence narration; prioritize the answer-first posture, blocker-level red flags, evidence quality by category, stale unknowns, and the shortest path to a confident decision.",
  "toolStrategy": {
    "web_search": "default",
    "source_mode": "current_company_market_reputation_evidence_room_and_risk_scan",
    "note": "Use supplied diligence materials first, then current public evidence, filings, reputation signals, product pages, security/legal context, and customer/market signals to build a blocker-first verification memo."
  },
  "specialistMethod": [
    "Define the target, decision type, approval bar, downside concern, available evidence room, and deadline before judging the opportunity.",
    "Grade evidence quality separately across product, customer, market, financial, technical, legal/compliance, and reputation signals.",
    "Separate verified evidence from management claims, stale evidence, and inference before recommending anything.",
    "Prioritize blocker-level red flags, then turn them into the shortest verification queue and a conditional go/no-go posture."
  ],
  "scopeBoundaries": [
    "Do not turn incomplete evidence into a clean go/no-go recommendation.",
    "Do not ignore legal, financial, security, reputation, operational, or customer-concentration red flags.",
    "Do not treat unknowns, stale evidence, or management-claim-only areas as benign without verification priority."
  ],
  "freshnessPolicy": "Treat public records, reputation signals, customer evidence, filings, security posture, market data, and regulatory/policy status as time-sensitive. Date findings, note stale evidence explicitly, and separate old observations from current blockers.",
  "sensitiveDataPolicy": "Treat diligence materials, deal terms, security findings, financials, customer lists, legal issues, and reference calls as confidential. Grade and summarize evidence without leaking raw sensitive docs or identifiable counterparties.",
  "costControlPolicy": "Prioritize blocker-level red flags, evidence quality grading, and the shortest verification queue. Avoid exhaustive diligence summaries when a few unknowns determine the decision."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'diligence',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'diligence'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'diligence agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/diligence/health',
  healthcheck_url: '/sample-agents/diligence/health',
  jobEndpoint: '/sample-agents/diligence/jobs',
  job_endpoint: '/sample-agents/diligence/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/diligence/health',
    jobs: '/sample-agents/diligence/jobs'
  }),
  metadata: Object.freeze({
    sample: true,
    sampleKind: 'diligence',
    sample_kind: 'diligence',
    category: 'diligence',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
