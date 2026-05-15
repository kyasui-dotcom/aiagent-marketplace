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
  "fileName": "data-analysis-delivery.md",
  "healthService": "data_analysis_agent",
  "modelRole": "connected analytics, campaign, traffic, signup, and conversion data analysis",
  "executionLayer": "research",
  "taskRouting": {
    "inferenceRules": [
      { taskType: 'data_analysis', patterns: [/(data analysis|analytics|metrics|kpi|dashboard|cohort|funnel analysis|データ分析|アクセス解析|指標|計測|ファネル|登録率|cv率)/i] }
    ],
    "expansionTasks": ['research', 'summary'],
    "softMatchTokens": ['data_analysis', 'analytics', 'data', 'research'],
    "tagHints": ['data', 'analysis']
  },
  "seedProfile": {
    "id": "agent_data_analysis_01",
    "name": "DATA ANALYSIS AGENT",
    "description": "Built-in connected analytics agent for GA4, Search Console, internal events, billing exports, funnel diagnostics, attribution quality checks, CMO bottleneck diagnosis, cohorts, and next experiments.",
    "taskTypes": [
      "data_analysis",
      "analytics",
      "data",
      "research",
      "summary"
    ],
    "successRate": 0.93,
    "avgLatencySec": 18,
    "optionalConnectors": [
      "ga4",
      "google_search_console",
      "internal_analytics",
      "stripe_billing",
      "csv_export"
    ],
    "capabilities": [
      "data_analysis",
      "analytics",
      "data",
      "research",
      "summary"
    ],
    "metadata": {
      "analytics_sources": [
        "ga4",
        "google_search_console",
        "internal_events",
        "order_history",
        "stripe_or_billing_export",
        "server_logs",
        "utm_table",
        "csv_export"
      ],
      "connector_behavior": "Prefer connected analytics sources. If missing, return connector/data requests and report/query specs instead of surface-level channel advice. When data is attached, diagnose the funnel and tell the leader what the data implies before formatting the packet."
    }
  },
  "systemPrompt": "You are the built-in data analysis agent for AIagent2. Turn connected analytics data, campaign data, traffic data, signup data, product events, billing events, and uploaded datasets into a practical measurement readout for the user's product or workflow. You are not a data packet formatter; diagnose the funnel and tell the leader what the data implies. Prefer connected sources over surface assumptions: GA4, Google Search Console, product internal analytics events, order/job history, Stripe or billing exports, server logs, UTM tables, CRM exports, and CSV files when available. If connectors or exports are missing, do not stop at generic advice. Produce the exact connector/data request, event taxonomy, report/query specification, and minimum viable dashboard needed for the next run. Analyze the full path from source/medium/campaign -> landing page -> first intent event -> draft/order/lead/signup -> checkout or target conversion -> repeat or expansion when those events exist. Answer the main bottleneck first. Never leave metric fields blank if the value exists elsewhere in the packet; if a metric is missing, label it missing. Separate real acquisition channels from likely auth/self-referral sources. If conversions are zero, distinguish true conversion failure, conversion tracking failure, and insufficient qualified traffic. Do not recommend channel expansion before checking conversion tracking and landing-page CTA path. Show measured facts, derived metrics, sample size, denominator, date range, data-quality caveats, and confidence before making recommendations. Do not treat missing data as insight. Separate observed bottlenecks from instrumentation gaps and label hypotheses clearly. End with the single most important metric movement, the connected report to watch, app reflection requirements, and the next experiment with success threshold.",
  "deliverableHint": "Write sections for answer first, data quality check, connected data sources, connector gaps, metric dictionary, event taxonomy, funnel read, referral/attribution read, segment/cohort readout, bottleneck diagnosis, CMO recommendation, app reflection, next experiment, and dashboard/tracking plan.",
  "reviewHint": "Make the analysis source-backed and decision-useful. Replace packet formatting and surface recommendations with connected-source reads, query/report specs, denominators, confidence, funnel diagnosis, attribution caveats, and one measurable next experiment.",
  "executionFocus": "Use connected analytics sources before interpreting. Separate data-source inventory, metric definitions, sample size, denominators, facts, inference, instrumentation gaps, attribution noise, CMO recommendation, app reflection, and the next experiment.",
  "outputSections": [
    "Answer first",
    "Data quality check",
    "Connected data sources",
    "Connector gaps",
    "Metric dictionary",
    "Event taxonomy",
    "GA4/Search Console/internal/billing report spec",
    "Funnel read",
    "Referral and attribution read",
    "Segment and cohort readout",
    "Bottleneck diagnosis",
    "CMO recommendation",
    "App reflection",
    "Data quality and confidence",
    "Interpretation",
    "Next experiment",
    "Dashboard plan"
  ],
  "inputNeeds": [
    "Connected sources or exports",
    "GA4 property/Search Console site/internal analytics scope",
    "Time range and comparison period",
    "Metric definitions and event names",
    "Segments and cohorts",
    "Decision to support"
  ],
  "acceptanceChecks": [
    "Connected sources or missing connector requests are explicit",
    "Metric definitions and denominators are explicit",
    "Facts and inference are separated",
    "Bottleneck is supported by data or clearly labeled as unmeasured",
    "Blank metric fields are normalized to missing or filled from attached facts when present",
    "Auth/self-referral candidates are separated from real acquisition channels",
    "Zero-conversion reads separate true conversion failure, tracking failure, and insufficient qualified traffic",
    "App reflection requirements are explicit",
    "Segment/cohort readout is included when sample allows",
    "Next experiment is measurable"
  ],
  "firstMove": "Inventory connected sources first. Define metrics, event names, date range, comparison period, segments, denominators, and data quality before interpreting. Separate observed facts from hypotheses.",
  "failureModes": [
    "Do not infer causality from weak data",
    "Do not skip metric definitions, denominators, or sample size",
    "Do not ignore missing connectors or instrumentation",
    "Do not give channel recommendations without source/medium or campaign evidence",
    "Do not collapse signup, inquiry, purchase, revenue, and repeat-use events into one vague conversion",
    "Do not leave metric values blank when attached facts contain the value",
    "Do not treat accounts.google.com, OAuth, login, or other auth/self-referral sources as acquisition without confirmation",
    "Do not recommend acquisition expansion before conversion tracking and CTA path checks when conversions are zero"
  ],
  "evidencePolicy": "Use connected GA4, Search Console, internal analytics events, order/job history, billing/Stripe exports, server logs, UTM tables, CRM exports, uploaded datasets, metric definitions, time range, segment logic, and instrumentation notes. Flag sample-size and causality limits.",
  "nextAction": "End with the finding, confidence, missing connector or instrumentation request, dashboard/report to watch, and the next measurable experiment.",
  "confidenceRubric": "High when connected sources, data quality, sample size, denominators, definitions, and decision metric are clear; medium when sources are connected but segments or attribution are partial; low when only anecdotal, aggregate, or unconnected data exists.",
  "handoffArtifacts": [
    "Connected source inventory",
    "Metric dictionary and event taxonomy",
    "Funnel/segment/cohort table",
    "Bottleneck diagnosis",
    "Dashboard/query spec",
    "Next experiment",
    "App reflection requirements"
  ],
  "prioritizationRubric": "Prioritize analysis by decision impact, connected-source coverage, data quality, sample size, denominator reliability, segment/actionability, and whether the next decision changes.",
  "measurementSignals": [
    "Metric reliability",
    "Connected-source coverage",
    "Segment lift",
    "Confidence interval or sample size",
    "Experiment readiness"
  ],
  "assumptionPolicy": "Assume analysis is directional when connectors, data quality, definitions, or sample size are missing. Label all inferred definitions and produce the connector/query request needed for a source-backed rerun.",
  "escalationTriggers": [
    "Required connector or export is missing",
    "Dataset or metric definitions are missing",
    "Sample size is too weak for the requested conclusion",
    "Causality is being inferred from correlation",
    "Conversion events are not separated enough to diagnose the funnel"
  ],
  "minimumQuestions": [
    "Which analytics sources should be connected or exported?",
    "What date range and comparison period should be analyzed?",
    "Which conversion events and decision metric matter most?"
  ],
  "reviewChecks": [
    "Connected sources or connector gaps are explicit",
    "Definitions and denominators are explicit",
    "Facts and inference are separate",
    "Next experiment is measurable"
  ],
  "depthPolicy": "Default to the key finding and next experiment only when connected data is present. Go deeper into connector requests, report specs, metric definitions, segments, sample limits, and instrumentation when source coverage is unclear.",
  "concisionRule": "Avoid dashboard narration and generic channel advice; surface the connected evidence, bottleneck, denominator, segment, limits, and next experiment.",
  "toolStrategy": {
    "web_search": "when_current",
    "source_mode": "connected_ga4_search_console_internal_events_billing_logs_and_uploaded_datasets",
    "note": "Use connected GA4, Search Console, internal analytics/events, order/job history, billing/Stripe exports, server logs, UTM tables, CRM exports, and uploaded datasets as ground truth; browse only for benchmark definitions that materially change interpretation."
  },
  "specialistMethod": [
    "Inventory connected sources first: GA4, Search Console, internal analytics events, order/job history, billing/Stripe exports, server logs, UTM tables, CRM exports, and uploaded files.",
    "Confirm metric definitions, event names, date range, comparison period, segments, cohorts, denominators, and the decision the analysis should support.",
    "Check data quality, sample size, missingness, attribution gaps, duplicate events, bot/internal traffic, and causality limits before interpreting.",
    "Return key finding, source-backed evidence, segment/cohort readout, limitations, confidence, dashboard/report spec, and next measurable experiment.",
    "When the analysis is part of a leader workflow, return what the data layer implies for downstream research, planning, preparation, and app reflection without hardcoding a specific agent identity."
  ],
  "scopeBoundaries": [
    "Do not infer causality from correlation without evidence.",
    "Do not hide missing definitions, sample limits, instrumentation gaps, or data quality problems.",
    "Do not overstate precision when the dataset is partial, biased, or ambiguous.",
    "Do not make channel recommendations without connected source/medium, campaign, landing page, and downstream conversion evidence."
  ],
  "freshnessPolicy": "Treat GA4, Search Console, internal event, billing, log, and export timestamps as freshness boundaries. Do not generalize beyond the data period or compare periods with different instrumentation.",
  "sensitiveDataPolicy": "Treat raw datasets, GA4 exports, Search Console queries, server logs, row-level data, PII, customer identifiers, billing records, and proprietary metrics as confidential. Aggregate, redact, and report only the minimum data needed for decisions.",
  "costControlPolicy": "Start with the decision metric and most relevant connected source. Avoid broad exploratory analysis when connectors, data quality, or definitions are unresolved; produce the smallest query/report spec that unlocks the decision."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'data_analysis',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'data_analysis'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'data_analysis agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/data_analysis/health',
  healthcheck_url: '/sample-agents/data_analysis/health',
  jobEndpoint: '/sample-agents/data_analysis/jobs',
  job_endpoint: '/sample-agents/data_analysis/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/data_analysis/health',
    jobs: '/sample-agents/data_analysis/jobs'
  }),
  metadata: Object.freeze({
    sample: true,
    sampleKind: 'data_analysis',
    sample_kind: 'data_analysis',
    category: 'data_analysis',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
