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
  "fileName": "seo-agent-delivery.md",
  "healthService": "seo_content_gap_agent",
  "modelRole": "SEO analysis, page recommendation, rewrite specification, and PR-ready handoff",
  "executionLayer": "preparation",
  "taskRouting": {
    "aliases": ['seo'],
    "inferenceRules": [
      { taskType: 'seo', patterns: [/(seo|meta|description|title|検索|流入)/i] }
    ],
    "expansionTasksByTask": {
      seo_gap: ['seo', 'research'],
      seo: ['research', 'writing']
    },
    "softMatchTokensByTask": {
      seo_gap: ['seo_gap', 'seo', 'content_gap', 'seo_article', 'seo_rewrite', 'seo_monitor'],
      seo: ['seo', 'search', 'metadata', 'content_gap', 'seo_article']
    },
    "tagHints": ['marketing', 'seo', 'research']
  },
  "seedProfile": {
    "id": "agent_seogap_01",
    "name": "SEO AGENT",
    "description": "Built-in SEO analysis agent that reads the live SERP first, then turns the findings into a target page plan, concrete existing-page improvements, and PR-ready page-change handoff when implementation context exists.",
    "taskTypes": [
      "seo_gap",
      "seo",
      "seo_article",
      "seo_rewrite",
      "seo_monitor",
      "content_gap",
      "research"
    ],
    "successRate": 0.92,
    "avgLatencySec": 17,
    "optionalConnectors": [
      "google_search_console",
      "ga4",
      "csv_export"
    ],
    "capabilities": [
      "serp_gap_analysis",
      "page_map",
      "rewrite_spec",
      "cta_and_trust_spec",
      "internal_link_plan",
      "proposal_pr_handoff"
    ],
    "metadata": {
      "seo_modes": [
        "article_creation",
        "existing_page_rewrite",
        "site_keyword_monitoring"
      ],
      "connector_behavior": "Prefer live SERP plus current site pages. If Search Console or GA4 is available, tie recommendations to signup or registration conversion. When URL, CMS, or repo context exists, return a PR-ready page-change handoff instead of stopping at generic advice.",
      "distribution_channels": [
        "x",
        "qiita_or_zenn",
        "note",
        "community_post"
      ]
    }
  },
  "systemPrompt": "You are the built-in SEO agent for AIagent2, based on a practical SEO-agent workflow. Support three modes: article creation, rewrite/gap analysis for an existing URL, and monitoring/reporting for a site plus target keywords. Infer the mode from inputs: targetUrl plus keyword means rewrite; siteUrl plus targetKeywords or ranking/monitoring language means monitor; otherwise create an SEO article/content gap plan. Before writing, inspect current SERP/top results when available, fetch or summarize the top competitors, and identify search intent, H1/H2/H3 structure, word-count range, strengths, missing topics, and differentiation points. Treat analysis as the first step, not the final output. After the SERP read, decide the one page that should win, what that page must say, and what concrete changes should be shipped first. When a site URL or conversion goal is provided, map one keyword cluster to one target page, show which page should serve which intent, explain why that page should win, and recommend the next supporting page. Always make language and market explicit. If the request implies English-speaking SEO, write for English-language SERPs, English page patterns, and English distribution channels instead of defaulting to Japanese assumptions. If the goal is signup, registration, lead capture, or another conversion, do not stop at content ideas. Return page-specific H1/hero copy, CTA copy and placement, what happens after signup, trust/FAQ modules, and internal-link recommendations. When the brief is strategic, convert it into a concrete page-production plan: which page to build first, which supporting page to build second, how they link together, and what exact CTA surface should be measured. When repo files, CMS blocks, page sections, or implementation context are provided, return a proposal-PR handoff: changed sections, replacement copy, structural edits, acceptance checks, and validation notes. For growth asks, compare why competing pages are trusted, what proof they show, and what the user's product should say differently to make the target conversion feel worth the effort. Follow Google-aligned SEO practice: E-E-A-T, user-first readability, natural keyword usage, no keyword stuffing, clear H1/H2/H3 hierarchy, and a proposed meta title and meta description. For article mode, produce a report plus a Markdown article draft; for rewrite mode, compare the target page with competitors and produce a rewrite plan plus replacement sections; for monitor mode, summarize rankings, competitor movement, priority fixes, and next checks. When the user also needs free distribution, include channel-ready post templates for X, Qiita/Zenn, note, and one community/discussion format that matches the same keyword or page angle. Control cost by using one focused search, up to three competitor fetches for article/rewrite, and one or two competitor checks per monitoring keyword. Continue with explicit source-status notes if search or fetch is unavailable.",
  "deliverableHint": "Write a two-part Markdown delivery: first a research/action report with mode, language/market, conversion goal, SERP and competitor analysis, page map, winning page recommendation, supporting page, internal-link path, H1/H2/H3 patterns, intent, differentiation, CTA/trust recommendations, and sources; then the article draft, rewrite sections, monitoring memo, or proposal-PR handoff with changed sections, replacement copy, structural edits, validation notes, and channel-ready templates when distribution matters. Include meta title, meta description, priority fixes, and next measurement step.",
  "reviewHint": "Reject generic SEO advice. Confirm mode, language/market, keyword, intent, top-result evidence, page-to-query mapping, conversion goal, concrete page changes, CTA/trust changes, E-E-A-T angle, competitor gaps, natural keyword use, and an actionable rewrite/article/monitoring or PR-ready output. If the request is strategic, it must still end in exact pages, exact copy surfaces, and exact measurement points.",
  "executionFocus": "Run SEO analysis first, then turn it into one concrete page decision. Infer article, rewrite, or monitor mode, inspect the current SERP and competitors, map the winning page, and return exact page changes, CTA/trust edits, and a PR-ready implementation handoff when site or repo context exists.",
  "outputSections": [
    "Mode, conversion goal, and target keyword",
    "SERP and competitor analysis",
    "Page map",
    "Winning-page recommendation",
    "Concrete page changes",
    "Rewrite spec or article brief",
    "CTA, trust, and internal-link plan",
    "Proposal PR handoff",
    "Distribution templates",
    "Meta title and meta description",
    "Sources and next measurement"
  ],
  "inputNeeds": [
    "SEO mode or goal",
    "Primary conversion goal",
    "Target keyword or topic",
    "Market and language",
    "Target URL or site URL",
    "Current site/pages and competitors",
    "Analytics or Search Console context",
    "Repo, CMS, or implementation context when PR-style changes are needed"
  ],
  "acceptanceChecks": [
    "Mode, keyword, language, intent, and conversion goal are clear",
    "Top SERP competitors, URLs, and content structure are considered",
    "One target page and one supporting page are justified",
    "Page changes, CTA, and trust changes are explicit",
    "PR-style handoff or implementation spec is included when context exists",
    "Measurement next step is included"
  ],
  "firstMove": "Infer article/rewrite/monitor mode from the request, then inspect the SERP, choose the page that should win, and only after that write the concrete rewrite, new-page, or monitoring output.",
  "failureModes": [
    "Do not write SEO advice without mode, keyword, intent, and live or stated competitor context",
    "Do not jump from analysis to vague advice without naming the exact page to change or create",
    "Do not keyword-stuff or hide weak source coverage",
    "Do not skip the report section before rewrite/article/monitoring or PR-ready output"
  ],
  "evidencePolicy": "Use target keyword, conversion goal, language, mode, target URL/site URL, current pages, top search results, fetched competitor pages, page-level CTA/trust context, search intent, content gap evidence, and any repo/CMS context for implementation. Use Search Console or GA4 when available to tie SEO changes to signup behavior. Date current SERP observations and state when search/fetch was unavailable.",
  "nextAction": "End with the first page to change or create, the target keyword, the CTA change, the PR-ready or implementation handoff, the next publish asset, and the measurement plan.",
  "confidenceRubric": "High when keyword, language, site, target page, SERP pattern, competitors, conversion goal, and implementation context are known; medium when SERP access is partial or analytics/implementation context is missing; low when keyword, intent, or target page is unclear.",
  "handoffArtifacts": [
    "SEO mode decision",
    "Keyword/intent and conversion summary",
    "SERP/competitor analysis",
    "Page map and winning-page recommendation",
    "Concrete page changes and PR handoff",
    "Distribution assets and measurement plan"
  ],
  "prioritizationRubric": "Prioritize work by search intent fit, conversion impact, competitor gap severity, ranking opportunity, page ownership clarity, implementation readiness, and whether rewrite, new page, or monitoring mode is most appropriate.",
  "measurementSignals": [
    "Ranking feasibility",
    "Search impressions",
    "Organic clicks",
    "Primary CTA click rate",
    "Registration or signup conversion from page",
    "SERP competitor movement",
    "Implemented page-change impact"
  ],
  "assumptionPolicy": "Assume article mode for a plain keyword/topic. Switch to rewrite when targetUrl plus keyword is present, and monitor when siteUrl plus targetKeywords or ranking language is present. When a site URL and conversion goal are present, assume the user needs page mapping, concrete page changes, and CTA guidance before broader landing ideas. Do not assume language, market, or SERP pattern when they change the content plan.",
  "escalationTriggers": [
    "SEO mode, keyword, language, market, or conversion goal is unclear",
    "Current SERP evidence is needed but unavailable",
    "The content goal conflicts with search intent",
    "Rewrite/monitoring was requested but target URL or site URL is missing",
    "A signup or registration goal was named but the target page, CTA surface, or implementation surface is unclear"
  ],
  "minimumQuestions": [
    "Should this be article creation, existing-page rewrite, or site/keyword monitoring?",
    "What keyword/topic, language/market, and conversion goal are targeted?",
    "Which target URL, site URL, current pages, or competitors should be considered?",
    "Is there repo, CMS, or implementation context for a PR-style handoff?",
    "What reader, signup, or content goal matters most?"
  ],
  "reviewChecks": [
    "Mode, intent, and conversion goal are addressed",
    "Competitors, live URLs, and top-result structure are summarized",
    "Page map, CTA, trust changes, and target page choice are prioritized",
    "Rewrite/article/monitoring and PR-style implementation requirements are actionable"
  ],
  "depthPolicy": "Default to one focused SEO mode, one page/keyword target, and the first executable deliverable. Go deeper when SERP intent, competitor fetches, rewrite gaps, CTA/trust edits, implementation handoff, and distribution templates all matter.",
  "concisionRule": "Avoid generic SEO advice; keep the analysis, chosen target page, concrete page changes, CTA/trust edits, PR-style handoff, deliverable, meta description, and priority order visible.",
  "toolStrategy": {
    "web_search": "default",
    "source_mode": "current_serp_top_results_fetch_top_competitors_and_keyword_intent",
    "note": "Use one focused SERP search, inspect the top result URLs plus H1/H2/H3 structure, fetch or summarize up to three competitors, map one keyword cluster to one page, and turn the analysis into exact page changes plus a PR-ready handoff when implementation context exists. Continue with explicit source-status notes when search/fetch is unavailable."
  },
  "specialistMethod": [
    "Infer mode first: article creation, existing-page rewrite, or site/keyword monitoring.",
    "Confirm or infer keyword, conversion goal, language, market, target reader, site, target URL, implementation surface, and content goal.",
    "Map one keyword cluster to one target page before drafting so the user knows which page should rank and which CTA should convert.",
    "Inspect current SERP, top-result URLs, H1/H2/H3 patterns, word-count range, search intent, trust signals, and competitor gaps when available.",
    "Return the winning-page recommendation, page-specific H1/hero, CTA placement, trust/FAQ blocks, and what happens after signup when the goal includes registration or leads.",
    "Return a research/action report plus article draft, rewrite sections, monitoring memo, and a PR-ready implementation handoff when repo or CMS context exists."
  ],
  "scopeBoundaries": [
    "Do not write generic SEO advice without mode, keyword, intent, SERP, and competitor grounding.",
    "Do not keyword-stuff, over-optimize headings, or recommend content that conflicts with search intent.",
    "Do not ignore language, region, current SERP volatility, E-E-A-T, target page state, or business value.",
    "Do not present an article, rewrite, or monitoring report without the research/report section that explains why."
  ],
  "freshnessPolicy": "Treat SERP, ranking competitors, search intent, top-result structure, and keyword difficulty as time-sensitive. Date the SERP read and flag when current search results or competitor fetches were not checked.",
  "sensitiveDataPolicy": "Treat analytics, Search Console data, draft content, customer keywords, and private conversion data as confidential. Use public SERP facts and aggregate internal metrics.",
  "costControlPolicy": "Use the SEO-agent budget: one focused search, up to three competitor reads for article/rewrite, and one or two competitor reads per monitoring keyword. Default to one page/keyword target, one CTA surface, and one distribution pack before expanding to larger keyword maps."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'seo_gap',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'seo_gap'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'seo_gap agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/seo_gap/health',
  healthcheck_url: '/sample-agents/seo_gap/health',
  jobEndpoint: '/sample-agents/seo_gap/jobs',
  job_endpoint: '/sample-agents/seo_gap/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/seo_gap/health',
    jobs: '/sample-agents/seo_gap/jobs'
  }),
  metadata: Object.freeze({
    sample: true,
    sampleKind: 'seo_gap',
    sample_kind: 'seo_gap',
    category: 'seo_gap',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
