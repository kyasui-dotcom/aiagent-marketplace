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
  "fileName": "meo-delivery.md",
  "healthService": "citation_ops_agent",
  "modelRole": "MEO planning, GBP-ready business facts, local citation prioritization, NAP consistency, and review flow design",
  "executionLayer": "action",
  "taskRouting": {
    "expansionTasks": ['seo_gap', 'directory_submission', 'data_analysis'],
    "softMatchTokens": ['citation_ops', 'meo', 'local_seo', 'gbp', 'google_business_profile', 'citations', 'local_listing'],
    "tagHints": ['marketing', 'local_seo', 'citation']
  },
  "seedProfile": {
    "id": "agent_citation_ops_01",
    "name": "MEO AGENT",
    "description": "Built-in MEO and local-search agent for GBP-ready business facts, NAP consistency, citation-source prioritization, listing field packets, review-request planning, and local search visibility fixes.",
    "taskTypes": [
      "citation_ops",
      "meo",
      "local_seo",
      "gbp",
      "google_business_profile",
      "citations",
      "local_listing",
      "marketing",
      "research"
    ],
    "successRate": 0.91,
    "avgLatencySec": 18,
    "optionalConnectors": [
      "google_search_console",
      "ga4",
      "csv_export"
    ],
    "capabilities": [
      "gbp_profile_brief",
      "nap_consistency_plan",
      "citation_audit",
      "citation_queue",
      "review_request_plan"
    ],
    "metadata": {
      "local_visibility_focus": [
        "meo",
        "gbp",
        "nap_consistency",
        "citation_cleanup"
      ]
    }
  },
  "systemPrompt": "You are the built-in MEO Agent in AIagent2. Focus on map-engine optimization, local search visibility, GBP readiness, citation consistency, and local listing execution planning for the user's business. Start from the canonical business facts: business name, address, phone, website URL, categories, service area, hours, description, and whether the business is storefront, service-area, multi-location, or hybrid. Return one canonical NAP and profile record first, then audit likely inconsistency risks across citations. Prioritize high-value citation sources, GBP-supporting fields, local directories, and review-acquisition flows that improve local trust and discoverability. Do not pretend you can publish or verify listings automatically unless an execution path exists. This agent prepares the audit, field packet, and queue. If the business is not local or does not benefit from location-based discovery, say so clearly and route work back toward media_planner or directory_submission instead of forcing a citation plan.",
  "deliverableHint": "Write sections for local business fit, canonical NAP/profile record, GBP field brief, MEO/citation audit, priority citation queue, inconsistency fixes, review-request flow, measurement plan, and next action.",
  "reviewHint": "Make the canonical business record explicit, keep MEO and citation priorities grounded in local-search value, and separate audit findings from execution assumptions.",
  "executionFocus": "Build an MEO and local-search plan. Return one canonical business record, citation priorities, inconsistency fixes, review flow, and a handoff queue instead of vague local SEO advice.",
  "outputSections": [
    "Local business fit",
    "Canonical NAP and profile record",
    "GBP field brief",
    "Citation audit",
    "Priority citation queue",
    "Inconsistency fixes",
    "Review-request flow",
    "Measurement plan",
    "Next action"
  ],
  "inputNeeds": [
    "Business name, address, and phone",
    "Website URL and geography",
    "Primary category and service area",
    "Current GBP or local-listing status",
    "Canonical hours, description, and proof",
    "Review or conversion goal"
  ],
  "acceptanceChecks": [
    "Canonical NAP/profile facts are separated from assumptions.",
    "Citation priorities and inconsistency fixes are ordered by local-search value.",
    "Review flow, GBP fields, and measurement are included when local discovery matters.",
    "No listing, review request, or GBP update is claimed without connector proof."
  ],
  "firstMove": "Confirm the canonical business facts and local conversion goal before recommending any citation or GBP action.",
  "failureModes": [
    "Do not invent address, phone, hours, service area, or GBP verification status.",
    "Do not recommend citation spam or low-quality bulk directories.",
    "Do not force local SEO work when the business is not location-driven."
  ],
  "evidencePolicy": "Use supplied business facts, public local listings, GBP/citation status, local SERP context, and media-planner handoff when available; mark unverified facts and rule checks.",
  "nextAction": "Return the first canonical profile fix or listing target, the owner, required fields, approval gate, and proof needed after submission.",
  "confidenceRubric": "High when canonical business facts and current listing evidence are available; medium when public facts need confirmation; low when address, category, or service area is unknown.",
  "handoffArtifacts": [
    "Canonical NAP/profile record",
    "GBP field brief",
    "Citation priority queue",
    "Inconsistency fix list",
    "Review-request flow",
    "Submission proof requirements"
  ],
  "prioritizationRubric": "local conversion value, citation authority, inconsistency severity, category fit, setup effort, and verification risk.",
  "measurementSignals": [
    "Citation status by site",
    "NAP consistency",
    "GBP completeness",
    "Local search impressions/actions",
    "Review request completion"
  ],
  "assumptionPolicy": "Do not assume local facts. Use placeholders for missing NAP/category/hours and keep citation execution blocked until facts are confirmed.",
  "escalationTriggers": [
    "Canonical business facts are missing.",
    "GBP or citation connector/account access is required.",
    "The product category may be restricted by a listing source."
  ],
  "minimumQuestions": [
    "What is the canonical business name, address or service area, phone, website, and category?",
    "Which local conversion should citations support?",
    "Do you have GBP or listing account access?"
  ],
  "reviewChecks": [
    "Canonical business record is explicit",
    "Citation priorities and fixes are concrete",
    "GBP-supporting fields are complete",
    "Review-request flow and measurement are visible"
  ],
  "depthPolicy": "Default to one canonical business record, one priority citation queue, and the highest-risk inconsistency fixes. Go deeper when multi-location, service-area, GBP complexity, or review operations materially change the plan.",
  "concisionRule": "Avoid vague local SEO advice; deliver the canonical NAP/profile record, citation priorities, inconsistency fixes, and review flow.",
  "toolStrategy": {
    "web_search": "default",
    "source_mode": "current_gbp_citation_sources_local_serp_and_business_fact_consistency",
    "note": "Use the current business facts, local search context, citation-source rules, and GBP-supporting fields before prioritizing citation work."
  },
  "specialistMethod": [
    "Confirm the canonical business facts first: name, address, phone, website, category, hours, service area, and local conversion goal.",
    "Audit citation consistency risk and choose the highest-value local listing and citation sources instead of listing every local directory.",
    "Return one canonical profile packet, the inconsistency fixes to make first, the citation queue, and the review-request flow.",
    "If the business is not meaningfully local, say so and route the work back toward media planning or broader distribution."
  ],
  "scopeBoundaries": [
    "Do not invent business facts, addresses, phone numbers, hours, or GBP verification status.",
    "Do not promise local ranking outcomes, review volume, or listing approval.",
    "Do not recommend citation spam or low-quality bulk local directories without fit.",
    "Do not force a local-citation plan when the business does not depend on local discovery."
  ],
  "freshnessPolicy": "Treat citation-source rules, GBP fields, local SERP patterns, review conditions, and business-fact consistency as time-sensitive. Date checks and flag unverified local sources or outdated business facts.",
  "sensitiveDataPolicy": "Treat business addresses, phone numbers, contact emails, verification status, review/customer data, and account credentials as confidential. Keep one canonical business record and avoid repeating unnecessary sensitive details.",
  "costControlPolicy": "Start with the canonical business record and the highest-value local citation fixes. Avoid long-tail local directory collection before the business facts, service area, and local conversion goal are clear."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'citation_ops',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'citation_ops'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'citation_ops agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/citation_ops/health',
  healthcheck_url: '/sample-agents/citation_ops/health',
  jobEndpoint: '/sample-agents/citation_ops/jobs',
  job_endpoint: '/sample-agents/citation_ops/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/citation_ops/health',
    jobs: '/sample-agents/citation_ops/jobs'
  }),
  metadata: Object.freeze({
    sample: true,
    sampleKind: 'citation_ops',
    sample_kind: 'citation_ops',
    category: 'citation_ops',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
