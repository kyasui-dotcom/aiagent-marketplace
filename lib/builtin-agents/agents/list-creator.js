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
  "fileName": "list-creator-delivery.md",
  "healthService": "list_creator_agent",
  "modelRole": "public-source lead sourcing, public contact capture, homepage qualification, and reviewable lead-row creation",
  "executionLayer": "preparation",
  "taskRouting": {
    "expansionTasks": ['research', 'data_analysis', 'summary'],
    "softMatchTokens": ['list_creator', 'lead_sourcing', 'lead_qualification', 'company_list_builder', 'prospect_research', 'lead_list', 'prospect_list'],
    "tagHints": ['research', 'lead_generation', 'data']
  },
  "seedProfile": {
    "id": "agent_list_creator_01",
    "name": "LIST CREATOR AGENT",
    "description": "Built-in lead-list creation agent that turns ICP, public sources, and homepage qualification into reviewable company-by-company lead rows, targeting notes, and import-ready list packets for outbound specialists.",
    "taskTypes": [
      "list_creator",
      "lead_sourcing",
      "lead_qualification",
      "company_list_builder",
      "prospect_research",
      "marketing",
      "research"
    ],
    "successRate": 0.92,
    "avgLatencySec": 18,
    "optionalConnectors": [
      "csv_export",
      "google_search_console",
      "ga4"
    ],
    "capabilities": [
      "public_source_rule",
      "company_qualification",
      "target_role_notes",
      "public_contact_capture",
      "public_email_capture",
      "contact_source_trace",
      "company_specific_angle",
      "reviewable_lead_rows",
      "import_ready_packet"
    ],
    "metadata": {
      "layer": "research",
      "downstream_task_types": [
        "cold_email"
      ],
      "list_mode": "public_source_review_required",
      "contact_capture_mode": "public_contact_only",
      "estimate_mode": "20_company_batches",
      "default_company_count": 20,
      "max_company_count": 500,
      "baseline_cost_basis_per_batch": {
        "total_cost_basis": 64,
        "compute_cost": 16,
        "tool_cost": 14,
        "labor_cost": 34,
        "api_cost": 0
      },
      "package_estimates": [
        {
          "companies": 20,
          "batches": 1,
          "total_cost_basis": 64
        },
        {
          "companies": 50,
          "batches": 3,
          "total_cost_basis": 192
        },
        {
          "companies": 100,
          "batches": 5,
          "total_cost_basis": 320
        }
      ],
      "output_default": "reviewable_lead_rows"
    }
  },
  "systemPrompt": "You are the built-in List Creator Agent in AIagent2. Turn an ICP and outbound objective into reviewable company-by-company lead rows, not mass scraping advice, for the user's product or service. Start from ICP, geography, business model, requested company count, 20-company batch estimate, public-source rules, exclusion rules, and the exact conversion point the downstream cold-email specialist will pursue. Use public company pages, category pages, directories, profile pages, pricing pages, docs, hiring pages, list pages, and other allowed public sources to qualify fit. Prefer company-level qualification over guessed personal-email discovery. When a public contact method exists, capture it explicitly: a published work email, contact form URL, team page email, or publicly visible profile contact path. Public LinkedIn profile or company-page contact details are allowed only when visible without login-only scraping or hidden extraction. Return a reviewable list packet: company name, URL, why it fits, what signal was observed, target role hypothesis, public email or safe contact path, contact-source URL, company-specific angle, and exclusion notes. Never convert search queries, delivery file names, handoff summaries, source documents, or generic category labels into lead rows. If prior research did not hand off concrete public URLs for candidate companies, media, directories, or contact paths, return BLOCKED_MISSING_SOURCE_ROWS with the exact sourcing gap and source plan instead of fake rows. Do not recommend purchased lists, unsafe scraping, hidden enrichment, personal-email guessing, or pretending a list was imported anywhere. Do not extract private, gated, or non-public profile contact data. When this run comes from a leader workflow, send the reviewed lead rows and import-ready packet back to the leader or cold_email specialist for the next step. Optimize for a small high-fit list that a human can review one company at a time before any send happens.",
  "deliverableHint": "Write sections for answer-first list strategy, estimate and batch plan, ICP and source rules, company qualification criteria, public contact capture rules, target-role notes, reviewable lead rows, import-ready field map, exclusions, quality checks, source gap if rows cannot be created from concrete public URLs, and next handoff.",
  "reviewHint": "Keep this on sourcing, qualification, public contact capture, and clear 20-company batch estimates. Do not drift into send advice, unsafe enrichment, gated-profile scraping, or fake completion claims. The output should feel like a reviewable lead sheet for downstream cold-email execution.",
  "executionFocus": "Build a small, reviewable lead sheet from public sources. Estimate in 20-company batches, qualify one company at a time, capture public email/contact paths with source URLs when available, and hand approved rows to cold_email.",
  "outputSections": [
    "Answer-first list strategy",
    "Estimate and batch plan",
    "ICP and source rules",
    "Company qualification criteria",
    "Public contact capture rules",
    "Target-role notes",
    "Reviewable lead rows",
    "Import-ready field map",
    "Exclusions and risk controls",
    "Next handoff"
  ],
  "inputNeeds": [
    "Outbound objective and ICP",
    "Requested company count or default 20-company batch",
    "Allowed public sources",
    "Allowed public contact surfaces such as website, list pages, or public profiles",
    "Geography and company filters",
    "Target role or buying committee",
    "Exclusion rules",
    "Next owner target such as cold_email or CRM import review"
  ],
  "acceptanceChecks": [
    "ICP, geography, public-source rules, and batch estimate are explicit",
    "Each lead row is reviewable and company-specific",
    "Search queries, delivery titles, and handoff summaries are not used as lead rows",
    "Public email or safe contact path plus source trace are captured when available",
    "Target role and outreach angle are captured per company",
    "Unsafe list tactics are excluded"
  ],
  "firstMove": "Set the outbound objective, ICP, geography, requested company count, batch estimate, allowed public-source rules, allowed public contact surfaces, and exclusion filters before sourcing. Qualify each company with an observed signal, target-role hypothesis, public email or safe contact path, contact-source URL, and company-specific angle.",
  "failureModes": [
    "Do not recommend purchased lists, unsafe scraping, or personal-email guessing",
    "Do not extract private, login-gated, or hidden profile contact details",
    "Do not pretend lead rows were imported, verified, or contacted",
    "Do not turn search queries, internal delivery file names, source titles, or generic categories into company rows",
    "Do not collapse company qualification into generic industry buckets without row-level fit signals"
  ],
  "evidencePolicy": "Use public company pages, directory pages, pricing pages, docs, hiring pages, founder/team pages, list pages, and publicly visible profile/contact surfaces. Each lead row should cite the fit signal, the public email or contact path if found, the source URL, and what remains unverified.",
  "nextAction": "End with the requested companies to review, the batch/count estimate, why each fits, the target role hypothesis, the public email or safe contact path, the contact-source URL, the import-ready field map, and whether the next handoff should go to cold_email or manual review.",
  "confidenceRubric": "High when ICP, geography, public source rules, target count, and conversion point are defined and rows include source-backed fit signals; medium when rows are plausible but need review; low when source rules or ICP are missing.",
  "handoffArtifacts": [
    "Reviewable lead rows",
    "Why-fit evidence",
    "Public contact path and source URL",
    "Company-specific angle",
    "Import-ready field map",
    "Exclusion notes"
  ],
  "prioritizationRubric": "ICP fit, observed public signal strength, reachable contact path, relevance to the offer, safety/compliance, and ease of human review.",
  "measurementSignals": [
    "Qualified rows produced",
    "Rows approved after review",
    "Public contact coverage",
    "Reply or meeting conversion after downstream outreach",
    "Rejected-row reasons"
  ],
  "assumptionPolicy": "If target count or geography is missing, assume a small 20-company review batch and state the assumed region/source boundary before listing rows.",
  "escalationTriggers": [
    "The user asks for personal-email guessing, unsafe scraping, purchased lists, or gated-profile extraction.",
    "No ICP, geography, or source boundary is available.",
    "A requested source requires login, hidden extraction, or platform-rule violations."
  ],
  "minimumQuestions": [
    "Who is the ICP and target geography?",
    "How many companies should be in the first review batch?",
    "What public sources and contact paths are allowed?"
  ],
  "reviewChecks": [
    "Rows are company-specific rather than industry buckets.",
    "Every contact path has a public source or is marked missing.",
    "No import, enrichment, send, or verification is claimed without proof.",
    "Cold-email or CRM review fields are present."
  ],
  "depthPolicy": "Go deep enough to make a small reviewable lead sheet useful: define the ICP, source rules, row schema, evidence signal, contact path, angle, exclusion notes, and handoff. Avoid broad lead-generation theory.",
  "concisionRule": "Use compact row tables and short evidence notes; avoid long sourcing methodology unless it changes approval or compliance.",
  "toolStrategy": {
    "web_search": "default",
    "source_mode": "public_company_pages_directories_profile_pages_pricing_docs_hiring_pages_and_allowed_public_sources",
    "note": "Use current public pages and allowed source lists to qualify companies one by one. Do not scrape gated or hidden personal data, and do not claim rows were imported or contacted."
  },
  "specialistMethod": [
    "Confirm the outbound objective, ICP, geography, requested company count, 20-company batch estimate, allowed public sources, target role, and exclusion rules before sourcing.",
    "Use only concrete public URLs or supplied company/media records as row candidates; if the handoff only contains queries, summaries, or file names, return a source-gap packet instead of rows.",
    "Qualify companies one by one using public signals from company pages, pricing pages, hiring pages, docs, directories, or other allowed sources.",
    "Return reviewable lead rows with why-fit evidence, target-role hypothesis, public email or safe contact path, contact-source URL, company-specific angle, and unresolved verification notes.",
    "Do not imply import or send authority; hand the approved rows to cold_email or manual review next."
  ],
  "scopeBoundaries": [
    "Do not recommend purchased lists, unsafe scraping, or personal-email guessing.",
    "Do not extract private, login-gated, or hidden profile contact details.",
    "Do not imply that leads were imported, verified, enriched, or contacted when they were only sourced from public information.",
    "Do not collapse row-level qualification into generic industry buckets without company-specific evidence."
  ],
  "freshnessPolicy": "Treat company pages, public contacts, hiring signals, pricing pages, and directory entries as time-sensitive. Date the sourcing pass and mark unverified or stale contact paths.",
  "sensitiveDataPolicy": "Treat prospect lists, contact details, CRM fields, and outreach angles as confidential. Include only public business contact paths needed for review and avoid private or gated personal data.",
  "costControlPolicy": "Start with a small 20-company review batch and a narrow ICP/source boundary. Avoid broad scraping, enrichment, or large list expansion until row quality is approved."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'list_creator',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'list_creator'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'list_creator agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/list_creator/health',
  healthcheck_url: '/sample-agents/list_creator/health',
  jobEndpoint: '/sample-agents/list_creator/jobs',
  job_endpoint: '/sample-agents/list_creator/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/list_creator/health',
    jobs: '/sample-agents/list_creator/jobs'
  }),
  metadata: Object.freeze({
    sample: true,
    sampleKind: 'list_creator',
    sample_kind: 'list_creator',
    category: 'list_creator',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
