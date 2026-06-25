const AGENT_PROVIDER = Object.freeze({
  health({ kind = '', definition = {}, source = {} } = {}) {
    const seed = agentProviderObject(definition.seedProfile);
    return {
      ok: true,
      service: agentProviderText(definition.healthService, kind || 'agent'),
      kind,
      mode: 'provider_contract',
      provider: 'agent_file',
      generation_provider: agentProviderText(source.OPENAI_API_KEY || source.BUILTIN_OPENAI_API_KEY) ? 'agent_configured' : 'openai_unconfigured',
      file_name: definition.fileName || null,
      model_role: definition.modelRole || null,
      execution_layer: definition.executionLayer || seed.metadata?.layer || null,
      task_types: agentProviderList(seed.taskTypes),
      capabilities: agentProviderList(seed.capabilities),
      agent_purpose: definition.agentPurpose || null,
      action_boundaries: Array.isArray(definition.agentActionBoundaries) ? definition.agentActionBoundaries : [],
      delivery_contract: agentProviderObject(definition.deliveryContract),
      tool_strategy: agentProviderObject(definition.toolStrategy),
      specialist_method: agentProviderList(definition.specialistMethod),
      scope_boundaries: agentProviderList(definition.scopeBoundaries),
      freshness_policy: definition.freshnessPolicy || null,
      sensitive_data_policy: definition.sensitiveDataPolicy || null,
      cost_control_policy: definition.costControlPolicy || null
    };
  },

  async runJob({ kind = '', definition = {}, body = {}, source = {} } = {}) {
    const prompt = agentProviderPrompt(body);
    const japanese = agentProviderJapanese(agentProviderLanguageText(body, prompt));
    const seed = agentProviderObject(definition.seedProfile);
    const name = agentProviderText(seed.name || definition.healthService || kind, kind || 'agent');
    const webSources = agentProviderWebSources(body);
    const delivery = await agentProviderGenerateDelivery(kind, definition, body, source, { webSources });
    if (delivery?.error) return agentProviderDeliveryFailure(kind, definition, name, japanese, delivery.error);
    const baseMarkdown = delivery?.fileMarkdown;
    if (!baseMarkdown) return agentProviderDeliveryFailure(kind, definition, name, japanese, 'missing_required_deliverable: original request, source context, or concrete artifact was not available.');
    const markdown = agentProviderEnsureDataAnalysisMarkdown(baseMarkdown, body);
    const generatedArtifacts = Array.isArray(delivery?.artifacts) ? delivery.artifacts.filter((item) => item && typeof item === 'object') : [];
    const localArtifacts = agentProviderDataAnalysisArtifacts(kind, definition, body, markdown);
    const artifacts = agentProviderMergeArtifacts(generatedArtifacts, localArtifacts);
    return {
      accepted: true,
      status: 'completed',
      summary: delivery.summary,
      report: {
        summary: delivery.reportSummary,
        bullets: agentProviderList(delivery.bullets),
        nextAction: agentProviderText(delivery.nextAction, ''),
        confidence: prompt === 'No prompt provided.' ? 'low' : 'medium',
        ...(artifacts.length ? { artifacts } : {}),
        ...(agentProviderList(delivery?.approvalRequests).length ? { approval_requests: delivery.approvalRequests } : {}),
        ...(webSources.length ? { web_sources: webSources } : {})
      },
      files: [{
        name: agentProviderText(definition.fileName, `${kind || 'agent'}-delivery.md`),
        type: 'text/markdown',
        content: markdown,
        source_task_type: kind,
        content_type: delivery?.contentType || 'agent_delivery'
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
        file_name: definition.fileName || null,
        generation_provider: 'openai_responses'
      }
    };
  }
});

function agentProviderText(value = '', fallback = '') {
  const safe = String(value ?? '').trim();
  return safe || fallback;
}

function agentProviderValueText(value = '', fallback = '', depth = 0) {
  if (value == null || depth > 5) return fallback;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return agentProviderText(value, fallback);
  }
  if (Array.isArray(value)) {
    const text = value.map((item) => agentProviderValueText(item, '', depth + 1)).filter(Boolean).join('\n\n').trim();
    return text || fallback;
  }
  if (typeof value === 'object') {
    const preferredText = [
      value.markdown,
      value.content,
      value.body,
      value.text,
      value.value,
      value.file_markdown,
      value.fileMarkdown,
      value.deliverable_markdown,
      value.deliverableMarkdown,
      value.output_text,
      value.summary,
      value.next_action,
      value.nextAction
    ].map((item) => agentProviderValueText(item, '', depth + 1)).filter(Boolean).join('\n\n').trim();
    if (preferredText) return preferredText;
    const text = Object.entries(value)
      .filter(([key]) => !/^(id|name|type|mime|content_?type|source|created|updated|metadata|format|verbosity|reasoning|usage|model|object|status|role|index|finish_?reason|parallel_tool_calls|tools|temperature|top_p|truncation|instructions)$/i.test(key))
      .map(([key, item]) => {
        const nested = agentProviderValueText(item, '', depth + 1).trim();
        return nested ? `## ${key}\n${nested}` : '';
      })
      .filter(Boolean)
      .join('\n\n')
      .trim();
    return text || fallback;
  }
  return fallback;
}

function agentProviderList(value = []) {
  return Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : [];
}

function agentProviderInputRoot(body = {}) {
  return body?.input && typeof body.input === 'object' && !Array.isArray(body.input) ? body.input : {};
}

function agentProviderInputText(body = {}, keys = [], fallback = '') {
  const input = agentProviderInputRoot(body);
  for (const key of keys) {
    const direct = agentProviderText(input?.[key] ?? body?.[key]);
    if (direct) return direct;
  }
  return agentProviderText(fallback, '');
}

function agentProviderInputListValue(body = {}, keys = []) {
  const input = agentProviderInputRoot(body);
  const values = [];
  for (const key of keys) {
    const candidate = input?.[key] ?? body?.[key];
    if (Array.isArray(candidate)) values.push(...candidate);
    else if (candidate && typeof candidate === 'object') values.push(candidate);
    else if (agentProviderText(candidate)) values.push(agentProviderText(candidate));
  }
  return values;
}

function agentProviderWorkflow(body = {}) {
  const broker = body?.input?._broker && typeof body.input._broker === 'object' ? body.input._broker : {};
  return broker.workflow && typeof broker.workflow === 'object' ? broker.workflow : {};
}

function agentProviderPriorRunUsage(body = {}) {
  const priorRuns = Array.isArray(agentProviderWorkflow(body).priorRuns) ? agentProviderWorkflow(body).priorRuns : [];
  return priorRuns.slice(-8).map((run) => ({
    task_type: agentProviderText(run?.taskType || run?.task_type || run?.kind, 'specialist'),
    status: agentProviderText(run?.status, 'unknown'),
    reused_detail: agentProviderText(run?.summary || run?.report?.summary, '').slice(0, 500),
    required_next_action: agentProviderText(run?.nextAction || run?.next_action || run?.report?.nextAction, '').slice(0, 300)
  })).filter((item) => item.reused_detail || item.required_next_action);
}

function agentProviderDataReferenceSource(body = {}) {
  const input = agentProviderInputRoot(body);
  const reference = input.reference_source && typeof input.reference_source === 'object'
    ? input.reference_source
    : body.reference_source && typeof body.reference_source === 'object'
      ? body.reference_source
      : {};
  const url = agentProviderText(
    reference.url || reference.href || reference.link || agentProviderInputText(body, ['reference_ir_url', 'referenceIrUrl', 'benchmark_url', 'benchmarkUrl'], agentProviderPrimaryUrl(body))
  );
  return {
    company: agentProviderText(reference.company || reference.name || agentProviderInputText(body, ['reference_company', 'referenceCompany', 'company'], 'reference company')),
    url,
    source_date: agentProviderText(reference.document_date || reference.source_date || reference.sourceDate || agentProviderInputText(body, ['source_date', 'sourceDate', 'ir_date', 'irDate'], 'source date not supplied')),
    source_status: agentProviderText(reference.source_status || reference.sourceStatus, url ? 'public_or_owner_supplied_ir_reference' : 'reference source missing'),
    access_status: agentProviderText(reference.access_status || reference.accessStatus, url ? 'source URL supplied; data analysis agent did not independently audit filings in this local artifact' : 'not supplied')
  };
}

function agentProviderDataFactFromText(value = '', index = 0, reference = {}) {
  const text = agentProviderText(value, 'value not supplied');
  const metricValue = text.match(/^(.+?)([+\-▲]?\d[\d,.]*\s*(?:%|pt|bps|百万円|億円|日|件|M|yen|months?|か月|ヶ月).*)$/i);
  return {
    row_id: `data-benchmark-${index + 1}`,
    metric: agentProviderText(metricValue?.[1], text).replace(/[：:、,\s]+$/g, '') || `Benchmark fact ${index + 1}`,
    value: agentProviderText(metricValue?.[2], text),
    source_status: reference.source_status,
    source_date: reference.source_date,
    source_url: reference.url,
    fact_status: 'public_source_fact_or_owner_supplied_extract',
    analysis_use: 'Use as benchmark context only; do not treat as product performance or validation proof.'
  };
}

function agentProviderDataBenchmarkLedger(body = {}) {
  const reference = agentProviderDataReferenceSource(body);
  const facts = agentProviderInputListValue(body, ['ir_fact_extract', 'irFactExtract', 'benchmark_facts', 'benchmarkFacts', 'benchmark_rows', 'benchmarkRows']);
  return facts.slice(0, 18).map((fact, index) => {
    if (fact && typeof fact === 'object') {
      return {
        row_id: `data-benchmark-${index + 1}`,
        metric: agentProviderText(fact.metric || fact.name || fact.label, `Benchmark fact ${index + 1}`),
        value: agentProviderText(fact.value || fact.summary || fact.text || fact.description, 'value not supplied'),
        source_status: agentProviderText(fact.source_status || fact.sourceStatus, reference.source_status),
        source_date: agentProviderText(fact.source_date || fact.sourceDate, reference.source_date),
        source_url: agentProviderText(fact.source_url || fact.sourceUrl || reference.url),
        fact_status: agentProviderText(fact.fact_status || fact.factStatus, 'public_source_fact_or_owner_supplied_extract'),
        analysis_use: agentProviderText(fact.analysis_use || fact.model_use || fact.modelUse, 'Use as benchmark context only; do not treat as product performance or validation proof.')
      };
    }
    return agentProviderDataFactFromText(fact, index, reference);
  });
}

function agentProviderDataDatasetStatus(body = {}) {
  return {
    benchmark_extract_status: agentProviderDataBenchmarkLedger(body).length ? 'benchmark_extract_supplied_needs_review' : 'benchmark_extract_missing',
    product_analytics_status: agentProviderInputText(body, ['available_dataset_status', 'dataset_status', 'datasetStatus'], 'missing: no product GA4, Search Console, internal event, billing, CAC, retention, support-load, or cohort rows supplied'),
    source_scope: 'IR benchmark rows can define comparison and measurement design; they cannot prove the new SaaS wins.',
    row_level_coverage: agentProviderInputListValue(body, ['rows', 'sample_rows', 'sampleRows']).length ? 'sample_rows_supplied_needs_audit' : 'no_product_sample_rows_supplied',
    confidence_basis: 'low_until_product_events_billing_cost_support_and_retention_data_are_connected'
  };
}

function agentProviderDataInstrumentationStatus(body = {}) {
  const owner = agentProviderInputText(body, ['analytics_owner', 'analyticsOwner', 'measurement_owner', 'measurementOwner'], 'analytics or implementation owner');
  return [
    {
      surface: 'GA4 or product analytics',
      required_proof: 'property/app scope, admin or trusted export evidence, event names, date range, and active conversion marking',
      current_status: 'admin_or_export_evidence_missing',
      owner
    },
    {
      surface: 'Search Console or acquisition source table',
      required_proof: 'site/property proof, query/page export, date range, and source/medium mapping',
      current_status: 'admin_or_export_evidence_missing',
      owner
    },
    {
      surface: 'Billing and cash collection',
      required_proof: 'plan, invoice/payment status, refund, prepaid flag, contract start, and cohort date',
      current_status: 'billing_export_missing',
      owner: 'finance owner'
    },
    {
      surface: 'Support/review cost ledger',
      required_proof: 'review minutes, support minutes, model/tool cost, rework, escalation, and refund reserve by account',
      current_status: 'cost_rows_missing',
      owner: 'operations owner'
    }
  ];
}

function agentProviderDataMetricDictionary(body = {}) {
  const valueMetric = agentProviderInputText(body, ['value_metric', 'valueMetric'], 'approved marketing action packet');
  return [
    {
      metric_id: 'first_value_time_days',
      display_name: 'First value time',
      definition: 'days from account or URL submission to first owner-approved action packet',
      numerator: 'approved_action_packet_timestamp - intake_timestamp',
      denominator: 'account or project',
      source_needed: 'product event log with intake and approval timestamps',
      benchmark_link: 'Measures the wedge against long lead time and start-delay benchmarks.',
      current_status: 'missing_product_rows'
    },
    {
      metric_id: 'approved_action_activation_rate',
      display_name: 'Approved action activation rate',
      definition: `accounts with at least one owner-approved ${valueMetric} divided by onboarded accounts`,
      numerator: 'accounts_with_first_approved_action_packet',
      denominator: 'onboarded_accounts',
      source_needed: 'app events and approval status table',
      benchmark_link: 'Proves whether automation creates usable work, not just activity.',
      current_status: 'missing_product_rows'
    },
    {
      metric_id: 'cash_before_work_rate',
      display_name: 'Cash-before-work rate',
      definition: 'activated accounts with prepaid or authorized payment before delivery starts divided by activated accounts',
      numerator: 'prepaid_or_authorized_accounts_before_start',
      denominator: 'activated_accounts',
      source_needed: 'billing export plus project start timestamp',
      benchmark_link: 'Tests the prepaid/credit-control advantage against unpaid or unstarted work risk.',
      current_status: 'missing_billing_rows'
    },
    {
      metric_id: 'gross_margin_guardrail',
      display_name: 'Gross margin guardrail',
      definition: 'revenue less model/tool/review/support/refund costs divided by revenue',
      numerator: 'revenue - model_cost - tool_cost - review_cost - support_cost - refund_reserve',
      denominator: 'revenue',
      source_needed: 'billing, model/tool logs, review/support time, refund reserve',
      benchmark_link: 'Keeps AI automation positioned against high gross-margin service economics.',
      current_status: 'missing_cost_rows'
    },
    {
      metric_id: 'verified_roi_event_rate',
      display_name: 'Verified ROI event rate',
      definition: 'active accounts with a reviewed ROI event divided by active accounts',
      numerator: 'accounts_with_verified_roi_event',
      denominator: 'active_accounts',
      source_needed: 'customer outcome evidence, analytics event, owner review status',
      benchmark_link: 'Turns ROI visibility into retention evidence instead of a sales claim.',
      current_status: 'missing_outcome_rows'
    },
    {
      metric_id: 'starter_to_activation_upgrade_rate',
      display_name: 'Starter to activation upgrade rate',
      definition: 'starter customers that move to a recurring activation plan divided by starter customers eligible for upgrade',
      numerator: 'starter_customers_upgraded_to_activation_plan',
      denominator: 'starter_customers_eligible_for_upgrade',
      source_needed: 'billing cohort and lifecycle status table',
      benchmark_link: 'Shows whether the low-friction starter becomes recurring SaaS revenue.',
      current_status: 'missing_billing_rows'
    }
  ];
}

function agentProviderDataFormulaModel() {
  return [
    {
      formula_id: 'lead_time_compression',
      formula: '(benchmark_start_lead_time_days - first_value_time_days) / benchmark_start_lead_time_days',
      decision_use: 'Prove the SaaS wedge is faster time-to-usable-output, not cheaper consulting.',
      missing_inputs: ['benchmark_start_lead_time_days', 'first_value_time_days']
    },
    {
      formula_id: 'cash_before_work_rate',
      formula: 'prepaid_or_authorized_accounts_before_start / activated_accounts',
      decision_use: 'Check whether prepaid or authorized workflow reduces unpaid delivery exposure.',
      missing_inputs: ['prepaid_or_authorized_accounts_before_start', 'activated_accounts']
    },
    {
      formula_id: 'approved_action_activation_rate',
      formula: 'accounts_with_first_approved_action_packet / onboarded_accounts',
      decision_use: 'Check whether users reach a reviewable marketing action, not just account creation.',
      missing_inputs: ['accounts_with_first_approved_action_packet', 'onboarded_accounts']
    },
    {
      formula_id: 'gross_margin_guardrail',
      formula: '(revenue - model_cost - tool_cost - review_cost - support_cost - refund_reserve) / revenue',
      decision_use: 'Reject packages that win demand but lose the automation margin advantage.',
      missing_inputs: ['revenue', 'model_cost', 'tool_cost', 'review_cost', 'support_cost', 'refund_reserve']
    },
    {
      formula_id: 'verified_roi_event_rate',
      formula: 'accounts_with_verified_roi_event / active_accounts',
      decision_use: 'Require evidence before claiming ROI-led retention or upgrade potential.',
      missing_inputs: ['accounts_with_verified_roi_event', 'active_accounts']
    }
  ];
}

function agentProviderDataDashboardSpec(body = {}) {
  const service = agentProviderInputText(body, ['service_to_build', 'serviceToBuild', 'service_description', 'serviceDescription'], agentProviderOffer(body));
  return {
    dashboard_id: 'competitive_measurement_console',
    title: `${service} competitive KPI console`,
    surface: 'measurement_console',
    primary_decision: agentProviderInputText(body, ['analysis_question', 'decision_goal', 'decisionGoal'], agentProviderPrompt(body)).slice(0, 600),
    default_filters: ['cohort_start_date', 'buyer_segment', 'package_id', 'traffic_source', 'approval_status', 'prepaid_status'],
    cards: [
      { card_id: 'lead_time_wedge', metric_id: 'first_value_time_days', chart: 'trend_by_week', decision_use: 'Is time-to-value materially shorter than benchmark lead-time pain?' },
      { card_id: 'activation_quality', metric_id: 'approved_action_activation_rate', chart: 'funnel', decision_use: 'Are users reaching an owner-approved output?' },
      { card_id: 'cash_control', metric_id: 'cash_before_work_rate', chart: 'stacked_bar_by_package', decision_use: 'Is delivery protected from unpaid or delayed-start exposure?' },
      { card_id: 'margin_guardrail', metric_id: 'gross_margin_guardrail', chart: 'cohort_table', decision_use: 'Does automation preserve gross margin after human review and support?' },
      { card_id: 'roi_evidence', metric_id: 'verified_roi_event_rate', chart: 'line_or_cohort', decision_use: 'Can the service prove ROI enough to support retention/upgrade?' },
      { card_id: 'upgrade_path', metric_id: 'starter_to_activation_upgrade_rate', chart: 'cohort_conversion', decision_use: 'Does the starter package become recurring revenue?' }
    ],
    refresh_status: 'spec_prepared_not_connected',
    app_intake_status: 'not_ingested'
  };
}

function agentProviderDataExperimentQueue(body = {}) {
  const approvalOwner = agentProviderInputText(body, ['approval_owner', 'approvalOwner', 'owner'], 'founder');
  return [
    {
      experiment_id: 'first-value-under-7-days',
      hypothesis: 'A URL-to-approved-action workflow can create first reviewable value within 7 days, contrasting with long service start lead times.',
      required_metric: 'first_value_time_days',
      success_threshold: 'median first_value_time_days <= 7 and approved_action_activation_rate >= owner-approved target',
      guardrail_metric: 'gross_margin_guardrail and support_minutes_per_account',
      required_data: ['intake timestamp', 'first approved packet timestamp', 'support/review minutes', 'cost rows'],
      execution_status: 'not_launched_not_measured_not_validated',
      approval_owner: approvalOwner,
      blocked_decision: 'Do not claim lead-time advantage until timestamped product rows exist.'
    },
    {
      experiment_id: 'prepaid-starter-cash-control',
      hypothesis: 'A prepaid starter can reduce unpaid or unstarted work exposure while preserving qualified demand.',
      required_metric: 'cash_before_work_rate',
      success_threshold: 'cash_before_work_rate >= owner-approved floor without refund or qualified-intent deterioration',
      guardrail_metric: 'refund_rate, qualified_prepaid_intent_rate, gross_margin_guardrail',
      required_data: ['payment authorization timestamp', 'project start timestamp', 'refund status', 'qualified intent label'],
      execution_status: 'not_launched_not_measured_not_validated',
      approval_owner: approvalOwner,
      blocked_decision: 'Do not change billing or claim payment-risk reduction without owner approval and billing export proof.'
    },
    {
      experiment_id: 'roi-dashboard-retention',
      hypothesis: 'Accounts that see verified ROI events will retain or upgrade more reliably than accounts receiving activity reports only.',
      required_metric: 'verified_roi_event_rate',
      success_threshold: 'verified_roi_event_rate and starter_to_activation_upgrade_rate clear owner-approved thresholds',
      guardrail_metric: 'churn, support load, claim review status',
      required_data: ['ROI event definition', 'owner review status', 'retention/upgrade cohort', 'support load'],
      execution_status: 'not_launched_not_measured_not_validated',
      approval_owner: approvalOwner,
      blocked_decision: 'Do not claim ROI or retention lift until cohort evidence and event definitions are reviewed.'
    }
  ];
}

function agentProviderDataRequiredDataQueue() {
  return [
    {
      data_request: 'product event export',
      required_fields: ['account_id', 'project_id', 'intake_timestamp', 'first_packet_timestamp', 'approval_timestamp', 'approval_status', 'package_id'],
      owner: 'product analytics owner',
      status: 'not_supplied'
    },
    {
      data_request: 'billing and payment export',
      required_fields: ['account_id', 'invoice_id', 'plan_id', 'amount', 'payment_status', 'prepaid_flag', 'refund_status', 'payment_timestamp'],
      owner: 'finance owner',
      status: 'not_supplied'
    },
    {
      data_request: 'cost and support export',
      required_fields: ['account_id', 'model_cost', 'tool_cost', 'review_minutes', 'support_minutes', 'rework_count', 'refund_reserve'],
      owner: 'operations owner',
      status: 'not_supplied'
    },
    {
      data_request: 'acquisition and query export',
      required_fields: ['account_id', 'source', 'medium', 'campaign', 'landing_page', 'query', 'clicks', 'sessions', 'qualified_intent_label'],
      owner: 'growth or analytics owner',
      status: 'not_supplied'
    },
    {
      data_request: 'ROI event evidence',
      required_fields: ['account_id', 'roi_event_name', 'event_definition', 'proof_url_or_note', 'owner_review_status', 'event_timestamp'],
      owner: 'customer success or analytics owner',
      status: 'not_supplied'
    }
  ];
}

function agentProviderDataAnalysisArtifacts(kind = '', definition = {}, body = {}, markdown = '') {
  if (kind !== 'data_analysis') return [];
  const service = agentProviderInputText(body, ['service_to_build', 'serviceToBuild', 'service_description', 'serviceDescription'], agentProviderOffer(body));
  const approvalOwner = agentProviderInputText(body, ['approval_owner', 'approvalOwner', 'owner'], 'founder');
  const benchmarkLedger = agentProviderDataBenchmarkLedger(body);
  return [{
    type: 'data_analysis_saas_handoff',
    artifact_type: 'measurement_decision_packet',
    surface: 'measurement_console',
    source_task_type: kind,
    title: `${service} KPI and experiment decision packet`,
    analysis_question: agentProviderInputText(body, ['analysis_question', 'decision_goal', 'decisionGoal'], agentProviderPrompt(body)).slice(0, 1200),
    service_strategy: {
      service_to_build: service,
      target_buyer: agentProviderInputText(body, ['buyer_segment', 'buyerSegment', 'target_buyer', 'targetBuyer'], 'target buyer not supplied'),
      approval_owner: approvalOwner,
      execution_status: 'measurement_design_not_connected'
    },
    reference_source: agentProviderDataReferenceSource(body),
    benchmark_ledger: benchmarkLedger,
    upstream_handoff_usage: agentProviderPriorRunUsage(body),
    dataset_status: agentProviderDataDatasetStatus(body),
    instrumentation_status: agentProviderDataInstrumentationStatus(body),
    metric_dictionary: agentProviderDataMetricDictionary(body),
    formula_model: agentProviderDataFormulaModel(),
    dashboard_spec: agentProviderDataDashboardSpec(body),
    experiment_queue: agentProviderDataExperimentQueue(body),
    required_data_queue: agentProviderDataRequiredDataQueue(),
    confidence_labels: {
      benchmark_facts: benchmarkLedger.length ? 'medium_source_extract_supplied' : 'low_no_benchmark_extract',
      product_metrics: 'low_no_connected_product_rows',
      instrumentation: 'low_admin_and_tag_proof_missing',
      experiment_results: 'not_started_not_measured'
    },
    app_intake_fields: [
      'analysis_question',
      'reference_source',
      'benchmark_ledger',
      'upstream_handoff_usage',
      'dataset_status',
      'instrumentation_status',
      'metric_dictionary',
      'formula_model',
      'dashboard_spec',
      'experiment_queue',
      'required_data_queue',
      'confidence_labels',
      'execution_status',
      'blocked_decision'
    ],
    execution_status: 'not_connected_not_measured_not_validated',
    blocked_decision: 'Do not claim the SaaS wins, a dashboard is live, events are connected, experiments launched, metrics verified, or ROI/retention proven until owner approval and dated data proof exist.',
    execution_boundary: 'Prepared only; no GA4, Search Console, internal analytics, billing, event instrumentation, dashboard ingestion, experiment launch, measurement result, validation, or SaaS app ingestion is implied.',
    summary_markdown_title: agentProviderMarkdownTitle(markdown, definition.fileName || kind || 'data_analysis')
  }];
}

function agentProviderTableCell(value = '') {
  return agentProviderText(value, '-').replace(/\|/g, '/').replace(/\r?\n/g, ' ').trim() || '-';
}

function agentProviderDataBenchmarkLedgerMarkdown(body = {}) {
  const rows = agentProviderDataBenchmarkLedger(body).slice(0, 12);
  if (!rows.length) return '';
  const japanese = agentProviderJapanese(agentProviderLanguageText(body, agentProviderPrompt(body)));
  const heading = japanese ? '## ベンチマーク証拠台帳' : '## Benchmark evidence ledger';
  const intro = japanese
    ? '以下は今回の分析で「勝ち筋の測り方」を決めるために使ったIR/ベンチマーク行です。新SaaSの実績値ではないため、検証済み成果としては扱いません。'
    : 'These are the supplied IR/benchmark rows used to design the winning measurement model. They are not product performance proof for the new SaaS.';
  const headers = japanese
    ? '| 指標 | 値 | ソース状態 | 分析での使い方 |'
    : '| Metric | Value | Source status | Analysis use |';
  const tableRows = rows.map((row) => [
    agentProviderTableCell(row.metric),
    agentProviderTableCell(row.value),
    agentProviderTableCell(row.fact_status || row.source_status),
    agentProviderTableCell(row.analysis_use)
  ]);
  return [
    heading,
    intro,
    '',
    headers,
    '| --- | --- | --- | --- |',
    ...tableRows.map((row) => `| ${row.join(' | ')} |`)
  ].join('\n');
}

function agentProviderInsertAfterSection(markdown = '', sectionPattern = /## Dataset status/i, insertion = '') {
  const text = String(markdown || '').trim();
  if (!text || !insertion) return text;
  const lines = text.split(/\r?\n/);
  const sectionIndex = lines.findIndex((line) => sectionPattern.test(line.trim()));
  if (sectionIndex < 0) return `${text}\n\n${insertion}`;
  let nextHeadingIndex = -1;
  for (let index = sectionIndex + 1; index < lines.length; index += 1) {
    if (/^##\s+/.test(lines[index].trim())) {
      nextHeadingIndex = index;
      break;
    }
  }
  if (nextHeadingIndex < 0) return `${text}\n\n${insertion}`;
  return [
    ...lines.slice(0, nextHeadingIndex),
    '',
    insertion,
    '',
    ...lines.slice(nextHeadingIndex)
  ].join('\n').trim();
}

function agentProviderEnsureDataAnalysisMarkdown(markdown = '', body = {}) {
  let next = agentProviderText(markdown);
  if (!next) return next;
  const benchmarkSection = agentProviderDataBenchmarkLedgerMarkdown(body);
  if (benchmarkSection && !/Benchmark evidence ledger|ベンチマーク証拠台帳/i.test(next)) {
    next = agentProviderInsertAfterSection(next, /##\s*(Dataset status|データセット|データ状況)/i, benchmarkSection);
  }
  return next;
}

function agentProviderDataStructuredContextForGeneration(body = {}) {
  const benchmarkLedger = agentProviderDataBenchmarkLedger(body);
  return {
    reference_source: agentProviderDataReferenceSource(body),
    service_to_build: agentProviderInputText(body, ['service_to_build', 'serviceToBuild', 'service_description', 'serviceDescription'], agentProviderOffer(body)),
    analysis_question: agentProviderInputText(body, ['analysis_question', 'decision_goal', 'decisionGoal'], agentProviderPrompt(body)).slice(0, 1200),
    dataset_status: agentProviderDataDatasetStatus(body),
    benchmark_ledger: benchmarkLedger.slice(0, 18),
    upstream_handoff_usage: agentProviderPriorRunUsage(body),
    instrumentation_status: agentProviderDataInstrumentationStatus(body),
    metric_dictionary: agentProviderDataMetricDictionary(body),
    formula_model: agentProviderDataFormulaModel(),
    dashboard_spec: agentProviderDataDashboardSpec(body),
    experiment_queue: agentProviderDataExperimentQueue(body),
    required_data_queue: agentProviderDataRequiredDataQueue(),
    generation_instruction: 'Use supplied benchmark_ledger and upstream_handoff_usage as source context. In the Markdown, include the important benchmark metric/value rows with source status before interpreting them. Do not mark supplied benchmark rows as missing, but do label product analytics, billing, event instrumentation, experiment results, and ROI proof as missing until rows/proof are supplied. The Markdown should be user-facing; keep machine-ingest details in artifacts.'
  };
}

function agentProviderMergeArtifacts(generatedArtifacts = [], localArtifacts = []) {
  const artifacts = [];
  const seen = new Set();
  for (const item of [...generatedArtifacts, ...localArtifacts]) {
    if (!item || typeof item !== 'object') continue;
    const key = [item.type, item.artifact_type, item.title, item.item_id].map((value) => String(value || '')).join('|').toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    artifacts.push(item);
  }
  return artifacts;
}

function agentProviderObject(value = {}) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function agentProviderOpenAiConfig(source = {}) {
  const sourceObj = agentProviderObject(source);
  const apiKey = agentProviderText(sourceObj.BUILTIN_OPENAI_API_KEY || sourceObj.OPENAI_API_KEY || sourceObj.openai_api_key || sourceObj.apiKey);
  if (!apiKey) return null;
  const rawBaseUrl = agentProviderText(sourceObj.BUILTIN_OPENAI_BASE_URL || sourceObj.OPENAI_BASE_URL || sourceObj.openai_base_url, 'https://api.openai.com/v1');
  const baseUrl = rawBaseUrl.replace(/\/+$/, '');
  const model = agentProviderText(sourceObj.BUILTIN_OPENAI_MODEL || sourceObj.OPENAI_MODEL || sourceObj.openai_model, 'gpt-5.4-nano');
  return { apiKey, baseUrl, model };
}

function agentProviderRequestedLanguage(body = {}, fallback = '') {
  const broker = body?.input?._broker && typeof body.input._broker === 'object' ? body.input._broker : {};
  const workflow = broker.workflow && typeof broker.workflow === 'object' ? broker.workflow : {};
  const direct = [
    body.output_language, body.outputLanguage, body.user_language, body.userLanguage,
    body.input?.output_language, body.input?.outputLanguage, body.input?.user_language, body.input?.userLanguage,
    broker.output_language, broker.outputLanguage, broker.user_language, broker.userLanguage,
    workflow.output_language, workflow.outputLanguage, workflow.user_language, workflow.userLanguage
  ].map((item) => agentProviderText(item)).find(Boolean);
  if (direct) return direct;
  const joined = [fallback, body.goal, body.full_prompt, body.fullPrompt, body.prompt, workflow.originalPrompt, workflow.original_prompt, workflow.objective]
    .map((item) => String(item || '')).filter(Boolean).join('\n');
  const explicit = joined.match(/(?:output|response|answer|reply|language|lang|回答|出力|言語)\s*(?:language)?\s*[:=：]\s*([^\n,。]+)/i);
  if (explicit) return explicit[1].trim();
  return 'Infer the language from the user request and use that language exactly. Do not assume a fixed language set.';
}

function agentProviderOpenAiPayloadText(payload = {}) {
  if (typeof payload === 'string') return payload;
  const direct = [
    payload.output_text,
    typeof payload.text === 'string' ? payload.text : '',
    payload.content
  ].map((item) => agentProviderValueText(item)).find(Boolean);
  if (direct) return direct;
  const chunks = [];
  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      const text = agentProviderValueText(part?.text || part?.value || part?.content);
      if (text) chunks.push(text);
    }
  }
  const choices = Array.isArray(payload.choices) ? payload.choices : [];
  for (const choice of choices) {
    const text = agentProviderValueText(choice?.message?.content || choice?.text);
    if (text) chunks.push(text);
  }
  return chunks.join('\n').trim();
}

function agentProviderJsonFromText(text = '') {
  const raw = agentProviderText(text);
  if (!raw) return null;
  const candidates = [raw];
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) candidates.push(fenced[1]);
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) candidates.push(raw.slice(start, end + 1));
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {}
  }
  return null;
}

function agentProviderPriorContextForGeneration(body = {}) {
  const broker = body?.input?._broker && typeof body.input._broker === 'object' ? body.input._broker : {};
  const workflow = broker.workflow && typeof broker.workflow === 'object' ? broker.workflow : {};
  const priorRuns = Array.isArray(workflow.priorRuns) ? workflow.priorRuns
    : Array.isArray(body.priorRuns) ? body.priorRuns
    : Array.isArray(body.input?.priorRuns) ? body.input.priorRuns
    : [];
  const priorDeliverables = Array.isArray(workflow.priorDeliverables) ? workflow.priorDeliverables
    : Array.isArray(body.priorDeliverables) ? body.priorDeliverables
    : Array.isArray(body.input?.priorDeliverables) ? body.input.priorDeliverables
    : [];
  const compactRuns = priorRuns.slice(-10).map((run) => {
    const report = agentProviderObject(run?.report);
    return {
      task_type: agentProviderText(run?.taskType || run?.task_type || run?.kind),
      phase: agentProviderText(run?.phase || run?.layer),
      status: agentProviderText(run?.status),
      summary: agentProviderText(run?.summary || report.summary).slice(0, 800),
      next_action: agentProviderText(run?.nextAction || report.nextAction).slice(0, 500),
      sources: agentProviderList(run?.web_sources || report.web_sources || run?.sources).slice(0, 8)
    };
  });
  const compactDeliverables = priorDeliverables.slice(-10).map((item) => ({
    task_type: agentProviderText(item?.taskType || item?.task_type || item?.kind),
    status: agentProviderText(item?.status),
    file: agentProviderText(item?.fileName || item?.file_name || item?.name),
    summary: agentProviderText(item?.summary || item?.content_summary).slice(0, 800)
  }));
  return { prior_runs: compactRuns, prior_deliverables: compactDeliverables };
}

function agentProviderMarkdownTitle(markdown = '', fallback = '') {
  const text = agentProviderText(markdown);
  const heading = text.split(/\r?\n/).map((line) => line.trim()).find((line) => /^#{1,3}\s+/.test(line));
  return agentProviderText(heading ? heading.replace(/^#{1,3}\s+/, '') : '', fallback);
}

function agentProviderMarkdownBullets(markdown = '') {
  return String(markdown || '').split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, '').trim())
    .filter(Boolean)
    .slice(0, 5);
}

function agentProviderNormalizeGeneratedDelivery(payload = {}, fallbackName = '') {
  const rawText = agentProviderOpenAiPayloadText(payload);
  const parsed = agentProviderJsonFromText(rawText);
  const data = parsed || (!rawText && payload && typeof payload === 'object' ? payload : null);
  const rawMarkdown = agentProviderText(rawText);
  const fileMarkdown = data
    ? agentProviderValueText(data.file_markdown || data.fileMarkdown || data.markdown || data.content_markdown || data.content || data.body)
    : rawMarkdown;
  if (!fileMarkdown || agentProviderLooksLikeTemplate(fileMarkdown)) return null;
  const title = agentProviderMarkdownTitle(fileMarkdown, agentProviderText(fallbackName, 'agent_delivery'));
  const bullets = agentProviderList(data?.bullets).length ? agentProviderList(data.bullets) : agentProviderMarkdownBullets(fileMarkdown);
  return {
    summary: agentProviderText(data?.summary, title),
    reportSummary: agentProviderText(data?.report_summary || data?.reportSummary, title),
    bullets,
    nextAction: agentProviderText(data?.next_action || data?.nextAction || data?.recommended_next_action),
    fileMarkdown,
    contentType: agentProviderText(data?.content_type || data?.contentType, 'agent_delivery'),
    artifacts: Array.isArray(data?.artifacts) ? data.artifacts.filter((item) => item && typeof item === 'object') : [],
    approvalRequests: Array.isArray(data?.approval_requests) ? data.approval_requests.filter((item) => item && typeof item === 'object') : []
  };
}

async function agentProviderGenerateDelivery(kind = '', definition = {}, body = {}, source = {}, options = {}) {
  const config = agentProviderOpenAiConfig(source);
  if (!config) return { error: 'openai_delivery_generation_unavailable' };
  const prompt = agentProviderPrompt(body);
  const seed = agentProviderObject(definition.seedProfile);
  const name = agentProviderText(seed.name || definition.healthService || kind, kind || 'agent');
  const webSources = Array.isArray(options.webSources) ? options.webSources : agentProviderWebSources(body);
  const requestPacket = {
    requested_language: agentProviderRequestedLanguage(body, prompt),
    agent: {
      kind,
      name,
      role: agentProviderText(definition.modelRole || seed.role || definition.healthService),
      layer: agentProviderText(definition.executionLayer || seed.metadata?.layer),
      capabilities: agentProviderList(seed.capabilities || definition.capabilities),
      purpose: agentProviderText(definition.agentPurpose),
      action_boundaries: Array.isArray(definition.agentActionBoundaries) ? definition.agentActionBoundaries : [],
      delivery_contract: agentProviderObject(definition.deliveryContract),
      specialist_method: agentProviderList(definition.specialistMethod),
      scope_boundaries: agentProviderList(definition.scopeBoundaries)
    },
    user_request: agentProviderPublicBrief(body).slice(0, 6000),
    full_request_excerpt: prompt.slice(0, 8000),
    target_url: agentProviderPrimaryUrl(body),
    evidence_sources: webSources.slice(0, 16),
    structured_analysis_context: agentProviderDataStructuredContextForGeneration(body),
    prior_context: agentProviderPriorContextForGeneration(body),
    leader_synthesis: options.leaderSynthesis || null,
    delivery_quality_gate: {
      required_sections: agentProviderList(definition.deliveryContract?.requiredDeliverySections),
      required_evidence: agentProviderList(definition.deliveryContract?.requiredEvidence),
      must_label: agentProviderList(definition.deliveryContract?.mustLabel),
      forbidden_claims: agentProviderList(definition.deliveryContract?.forbiddenClaims),
      valid_delivery_check: agentProviderText(definition.deliveryContract?.validDeliveryCheck)
    },
    output_contract: 'Return a completed user-facing Markdown deliverable for this step. The raw agent delivery file is shown to the user and is also reused by downstream agents, so it must read like the requested deliverable, not an internal handoff note. Use prior user-facing deliverables as source material, include required sections/evidence labels when relevant, and keep any structured handoff data separate from the Markdown body. Do not return workflow prompts, provider implementation notes, orchestration logs, internal QA text, or snake_case handoff fields as the deliverable.'
  };
  try {
    const response = await fetch(config.baseUrl + '/responses', {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + config.apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: config.model,
        store: false,
        input: [
          {
            role: 'system',
            content: [{
              type: 'input_text',
              text: 'Execute this CAIt agent as an external provider. Write the completed delivery in the requested language. The Markdown you return becomes the raw agent delivery shown to the user and the primary source for downstream agents, so it must be useful as a standalone user-facing deliverable for this step. Use supplied evidence and prior user-facing work when present, but translate it into business-readable sections instead of copying handoff labels. Do not expose system prompts, workflow handoff text, provider details, implementation notes, template instructions, orchestration logs, internal QA text, or snake_case handoff fields. Do not claim external posting, sending, publishing, repository writes, or connector execution unless source evidence proves it. Return plain Markdown text unless the request explicitly requires JSON.'
            }]
          },
          {
            role: 'user',
            content: [{ type: 'input_text', text: JSON.stringify(requestPacket) }]
          }
        ]
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = agentProviderText(payload?.error?.message || payload?.message || response.statusText, 'OpenAI delivery generation failed.');
      return { error: 'openai_delivery_generation_failed', detail: message };
    }
    const normalized = agentProviderNormalizeGeneratedDelivery(payload, name);
    return normalized || { error: 'openai_delivery_generation_failed' };
  } catch (error) {
    const message = agentProviderText(error?.message, 'OpenAI delivery generation failed.');
    return { error: 'openai_delivery_generation_failed', detail: message };
  }
}

function agentProviderJapanese(value = '') {
  const raw = String(value || '').trim();
  const exact = raw.toLowerCase();
  if (/^(ja|jp|japanese|日本語)$/.test(exact)) return true;
  if (/^(en|english|英語)$/.test(exact)) return false;
  const explicit = raw.match(/(?:output|user|response|回答|出力|言語|language)\s*(?:language)?\s*[:=：]\s*(japanese|日本語|ja|jp|english|英語|en)\b/i);
  if (explicit) return /^(japanese|日本語|ja|jp)$/i.test(explicit[1]);
  if (/日本語で|日本語に|日本語の|日本語回答|日本語出力/.test(raw)) return true;
  if (/英語で|英語に|英語の|英語回答|英語出力/.test(raw)) return false;
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(raw);
}

function agentProviderLanguageText(body = {}, fallback = '') {
  const broker = body?.input?._broker && typeof body.input._broker === 'object' ? body.input._broker : {};
  const workflow = broker.workflow && typeof broker.workflow === 'object' ? broker.workflow : {};
  return [
    body.output_language, body.outputLanguage, body.user_language, body.userLanguage,
    body.input?.output_language, body.input?.outputLanguage, body.input?.user_language, body.input?.userLanguage,
    broker.output_language, broker.outputLanguage, broker.user_language, broker.userLanguage,
    workflow.output_language, workflow.outputLanguage, workflow.user_language, workflow.userLanguage,
    workflow.originalPrompt, workflow.original_prompt, workflow.objective,
    body.input?.original_prompt, body.input?.originalPrompt,
    fallback, body.goal, body.full_prompt, body.fullPrompt, body.prompt
  ].map((item) => String(item || '')).join('\n');
}


function agentProviderPrompt(body = {}) {
  return agentProviderText(body.goal || body.full_prompt || body.fullPrompt || body.prompt, 'No prompt provided.');
}

function agentProviderPublicBrief(body = {}) {
  const raw = agentProviderPrompt(body);
  const cleaned = raw
    .replace(/=== WORKFLOW HANDOFF CONTEXT ===[\s\S]*?=== END WORKFLOW HANDOFF CONTEXT ===/gi, '')
    .replace(/=== WORKFLOW ADDITIONAL PROMPT ===[\s\S]*$/gi, '')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line && !/^(Task|Goal|Work split|Inputs|Deliver|Output language|Token rule|Conversation lead|Acceptance|Constraints|Current specialist|Required output behavior|PROCESS PROGRAM|STRUCTURED HANDOFF DIGEST|PRIOR SPECIALIST DELIVERABLE)/i.test(line))
    .filter((line) => !/(provider\.runJob|Agent-owned behavior|WORKFLOW HANDOFF CONTEXT|canonical user brief|process program|structured handoff digest|prior specialist deliverable)/i.test(line))
    .join('\n')
    .trim();
  return cleaned.slice(0, 1200);
}

function agentProviderWebSources(body = {}) {
  const sources = [];
  const seen = new Set();
  const push = (source = {}, fallback = {}) => {
    const value = typeof source === 'string' ? { url: source } : source;
    if (!value || typeof value !== 'object') return;
    const rawUrl = agentProviderText(value.url || value.link || value.href || value.siteUrl || value.site || value.source_url || value.sourceUrl || fallback.url);
    const url = agentProviderCleanSourceUrl(rawUrl);
    const title = agentProviderText(value.title || value.name || value.label || fallback.title, url ? 'Source context' : 'Source query');
    const snippet = agentProviderText(value.snippet || value.description || value.summary || fallback.snippet);
    const query = agentProviderText(value.query || value.search_query || value.searchQuery || fallback.query);
    if (!url && !title && !snippet && !query) return;
    const key = [url, title, snippet, query].join('|').toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    sources.push({
      url,
      title,
      snippet,
      query,
      action: agentProviderText(value.action || value.source_action || value.sourceAction || fallback.action, 'source_collection'),
      provider: agentProviderText(value.provider || value.search_provider || value.searchProvider || fallback.provider, 'agent_file_source_collection')
    });
  };
  const broker = body?.input?._broker && typeof body.input._broker === 'object' ? body.input._broker : {};
  const workflow = broker.workflow && typeof broker.workflow === 'object' ? broker.workflow : {};
  const handoff = workflow.leaderHandoff && typeof workflow.leaderHandoff === 'object' ? workflow.leaderHandoff : {};
  for (const container of [
    body.web_sources,
    body.webSources,
    body.sources,
    body.source_context?.web_sources,
    body.sourceContext?.webSources,
    body.report?.web_sources,
    body.output?.report?.web_sources,
    body.input?.web_sources,
    body.input?.webSources,
    broker.web_sources,
    broker.webSources,
    workflow.web_sources,
    workflow.webSources,
    handoff.web_sources,
    handoff.webSources
  ]) {
    if (Array.isArray(container)) for (const item of container) push(item, { action: 'source_collection' });
  }
  for (const run of [
    ...(Array.isArray(handoff.priorRuns) ? handoff.priorRuns : []),
    ...(Array.isArray(handoff.priorDeliverables) ? handoff.priorDeliverables : [])
  ]) {
    for (const item of Array.isArray(run?.webSources) ? run.webSources : []) {
      push(item, { title: run?.taskType || run?.workflowTask || 'Prior specialist source', action: 'prior_source_collection', provider: 'leader_handoff' });
    }
  }
  const contexts = [
    ...(Array.isArray(body.input?.connectorContexts) ? body.input.connectorContexts : []),
    ...(Array.isArray(body.input?.appContexts) ? body.input.appContexts : []),
    ...(Array.isArray(broker.appContexts) ? broker.appContexts : []),
    ...(Array.isArray(broker.connectorContexts) ? broker.connectorContexts : [])
  ];
  for (const context of contexts) {
    if (!context || typeof context !== 'object') continue;
    const raw = context.raw_context && typeof context.raw_context === 'object'
      ? context.raw_context
      : (context.rawContext && typeof context.rawContext === 'object' ? context.rawContext : {});
    const provider = context.source_app || context.sourceApp || 'app_context';
    for (const value of [raw.googleSearchConsoleSite, raw.siteUrl, raw.site, raw.url, context.url]) {
      push(String(value || ''), {
        title: context.title || context.summary || context.source_app_label || context.source_app || 'Attached source context',
        snippet: context.summary || 'Source URL carried by attached app/connector context.',
        action: 'source_collection',
        provider
      });
    }
    for (const rawUrl of agentProviderExtractSourceUrls(JSON.stringify(context))) {
      push(rawUrl, {
        title: context.title || context.source_app_label || 'Attached source context',
        snippet: context.summary || 'Source URL carried by attached app/connector context.',
        action: 'source_collection',
        provider
      });
    }
  }
  const text = [
    body.full_prompt,
    body.fullPrompt,
    body.prompt,
    body.goal,
    body.additional_prompt,
    body.additionalPrompt,
    body.input?.original_prompt,
    body.input?.originalPrompt,
    workflow.originalPrompt,
    workflow.original_prompt,
    workflow.objective,
    JSON.stringify(body.input || {}),
    JSON.stringify(body.source_context || body.sourceContext || {})
  ].map((item) => String(item || '')).join('\\n');
  for (const rawUrl of agentProviderExtractSourceUrls(text)) {
    push(rawUrl, {
      title: 'Source URL from prompt context',
      snippet: 'URL supplied in the request or workflow context.',
      action: 'source_collection',
      provider: 'prompt_context'
    });
  }
  return sources.slice(0, 8);
}

function agentProviderCleanSourceUrl(value = '') {
  const text = String(value || '').trim().replace(/\?["'].*$/g, '').replace(/[),.;\]]+$/g, '');
  if (!text) return '';
  const domain = text.match(/^sc-domain:([a-z0-9.-]+)$/i);
  if (domain) return 'https://' + domain[1] + '/';
  if (/^https?:\/\//i.test(text)) return text;
  return '';
}

function agentProviderExtractSourceUrls(value = '') {
  const urls = [];
  const pattern = /(https?:\/\/[^\s<>)\]\"'\\]+|sc-domain:[a-z0-9.-]+)/ig;
  let match;
  while ((match = pattern.exec(String(value || '')))) {
    const url = agentProviderCleanSourceUrl(match[1]);
    if (url && !urls.includes(url)) urls.push(url);
  }
  return urls.slice(0, 12);
}

function agentProviderUsage(definition = {}) {
  return Math.max(40, Math.round(Number(definition.seedProfile?.avgLatencySec || 10) * 4));
}

function agentProviderSection(title = '', values = []) {
  const items = agentProviderList(values);
  if (!items.length) return '';
  return [`## ${title}`, ...items.map((item) => `- ${item}`)].join('\n');
}

function agentProviderInstructionLike(value = '') {
  const text = String(value || '').trim();
  return /^(write|return|deliver|include|end with|make|produce)\b/i.test(text)
    || /\bsections? for\b/i.test(text)
    || /delivery packet|output sections|acceptance checks|review conditions/i.test(text);
}

function agentProviderFirstMatch(text = '', patterns = []) {
  const source = String(text || '');
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match?.[1]) return agentProviderText(match[1], '');
    if (match?.[0]) return agentProviderText(match[0], '');
  }
  return '';
}

function agentProviderBriefText(body = {}) {
  return agentProviderPublicBrief(body).replace(/\n{3,}/g, '\n\n').trim();
}

function agentProviderPrimaryUrl(body = {}) {
  const text = [
    agentProviderPrompt(body),
    JSON.stringify(body?.input || {}),
    JSON.stringify(body?.source_context || body?.sourceContext || {})
  ].join('\n');
  return agentProviderFirstMatch(text, [
    /(?:Product\/service|Target URL|対象サービス|対象URL|URL)\s*[:：][^\n]*(https?:\/\/[^\s)>,]+)/i,
    /(https?:\/\/[^\s)>,]+)/i
  ]);
}

function agentProviderHost(url = '') {
  try { return new URL(url).hostname.replace(/^www\./i, ''); } catch {}
  return agentProviderText(url || 'the target service', 'the target service').replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
}

function agentProviderFieldValue(body = {}, labels = []) {
  const text = agentProviderPrompt(body).replace(/\r/g, '\n');
  const labelPattern = labels.map((label) => String(label).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const nextLabel = '(?:Product\\/service|対象サービス|Analytics data|アナリティクス|Main goal|主な目的|Primary conversion|Conversion goal|Target audience|対象ユーザー|Constraints|制約|Priority channel|優先チャネル|Attached connector context|GA4 property|Search Console site|Date range|Sessions|Conversions|Conversion rate|Task|Goal|Conversation lead|Work split|Inputs|Deliver|Output language|Acceptance)';
  const match = text.match(new RegExp(`(?:^|[\\n;-])\\s*-?\\s*(?:${labelPattern})\\s*[:：]\\s*-?\\s*([\\s\\S]*?)(?=(?:\\n\\s*-?\\s*${nextLabel}\\s*[:：])|(?:\\s+-\\s*${nextLabel}\\s*[:：])|$)`, 'i'));
  if (!match?.[1]) return '';
  return String(match[1])
    .replace(new RegExp(`^\\s*-?\\s*(?:${labelPattern})\\s*[:：]\\s*`, 'i'), '')
    .replace(/\\s+-\\s*(?:Constraints|制約|Priority channel|優先チャネル|Main goal|主な目的|Analytics data|アナリティクス)\\s*[:：][\\s\\S]*$/i, '')
    .replace(/\\s+/g, ' ')
    .trim();
}

function agentProviderAudience(body = {}) {
  const text = agentProviderPrompt(body);
  const explicit = agentProviderFieldValue(body, ['Target audience', '対象ユーザー']);
  if (explicit) return explicit;
  if (/developers?|engineers?|technical users?|開発者|技術/i.test(text)) return 'developers and technical users';
  if (/consumer|individual|一般消費者|個人|traveler|tourist|旅行者|訪日/i.test(text)) return 'travelers and individual consumers';
  return 'the target audience';
}

function agentProviderConversion(body = {}) {
  const text = agentProviderPrompt(body);
  const goal = agentProviderFieldValue(body, ['Primary conversion', 'Conversion goal', 'Main goal', '主な目的']);
  const conversionText = goal || text;
  if (/lead|inquir|contact|問い合わせ|リード|相談|見積/i.test(conversionText)) return 'lead or inquiry';
  if (/sales|revenue|purchase|booking|売上|購入|予約/i.test(conversionText)) return 'purchase or revenue action';
  if (/sign\s*ups?|sign[_ -]?up|trials?|登録|トライアル/i.test(conversionText)) return 'signup or trial start';
  return 'the primary conversion';
}

function agentProviderConversionEvent(conversion = '') {
  const text = String(conversion || '').toLowerCase();
  if (/lead|inquiry/.test(text)) return 'inquiry_submit';
  if (/purchase|revenue|booking/.test(text)) return 'purchase_complete_or_revenue_event';
  if (/signup|trial/.test(text)) return 'signup_or_trial_start';
  return 'primary_conversion_event';
}
function agentProviderPrimaryChannel(body = {}) {
  const text = agentProviderPrompt(body);
  const channel = agentProviderFieldValue(body, ['Priority channel', '優先チャネル']);
  const channelText = channel || text;
  if (/organic search|seo|自然検索|検索|search console|query/i.test(channelText)) return 'organic search / SEO';
  if (/referral|github|reddit|indie hackers|参照/i.test(channelText)) return 'referral sites';
  if (/social|sns|x\/twitter|投稿/i.test(channelText)) return 'social';
  if (/email|mail|gmail|メール/i.test(channelText)) return 'email';
  return 'owned surface';
}

function agentProviderOffer(body = {}) {
  const text = [agentProviderPrompt(body), agentProviderPrimaryUrl(body)].join(' ');
  if (/esim|e-sim|airalo|holafly|ahamo|wifi|wi-fi|travel|旅行|訪日|海外/i.test(text)) return 'travel eSIM and connectivity service';
  if (/agent|\bai\b|artificial intelligence|workflow|automation|自動化/i.test(text)) return 'AI-agent workflow service';
  if (/pricing|subscription|billing|課金|料金/i.test(text)) return 'pricing or subscription offer';
  return 'service offer';
}
function agentProviderMetricValue(body = {}, label = '') {
  const escaped = String(label || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return agentProviderFirstMatch(agentProviderPrompt(body), [new RegExp(`${escaped}\\s*[:：]\\s*([^;\\n]+)`, 'i')]);
}

function agentProviderEvidenceLines(body = {}) {
  const lines = [];
  const prompt = agentProviderPrompt(body);
  const add = (value = '') => {
    const text = agentProviderText(value, '');
    if (text && !lines.includes(text)) lines.push(text);
  };
  const url = agentProviderPrimaryUrl(body);
  if (url) add(`Target URL: ${url}`);
  for (const label of ['GA4 property', 'Search Console site', 'Date range', 'Sessions', 'Conversions', 'Conversion rate', 'Top query', 'Top landing page', 'Top channel']) {
    const value = agentProviderMetricValue(body, label);
    if (value) add(`${label}: ${value}`);
  }
  const webSources = [body.web_sources, body.webSources, body.report?.web_sources, body.input?.web_sources, body.input?.webSources]
    .flat()
    .filter(Boolean);
  for (const source of webSources.slice(0, 8)) {
    if (typeof source === 'string') add(`Source: ${source}`);
    else if (source && typeof source === 'object') add(`Source: ${[source.title || source.name, source.url || source.link || source.href, source.snippet || source.summary].filter(Boolean).join(' | ')}`);
  }
  const sourceQueryMatches = [...prompt.matchAll(/Search Console query:\s*([^|\n]+)\s*\|\s*(https?:\/\/[^\s|]+)[^\n]*/gi)].slice(0, 6);
  for (const match of sourceQueryMatches) add(`Search query: ${agentProviderText(match[1])} -> ${agentProviderText(match[2])}`);
  return lines.slice(0, 10);
}

function agentProviderDeliveryFailure(kind = '', definition = {}, name = 'agent', japanese = false, reason = 'missing_required_deliverable') {
  const failure = agentProviderText(reason, 'missing_required_deliverable');
  const category = agentProviderText(failure.split(':')[0], 'missing_required_deliverable');
  return {
    accepted: false,
    status: 'failed',
    summary: category,
    error: category,
    failure_reason: failure,
    report: {
      summary: category,
      bullets: [category],
      nextAction: '',
      confidence: 'low'
    },
    files: [],
    usage: { total_cost_basis: 0, compute_cost: 0, tool_cost: 0, labor_cost: 0, api_cost: 0 },
    return_targets: ['chat', 'api'],
    runtime: {
      mode: 'provider_contract',
      provider: 'agent_file',
      kind,
      service: definition.healthService || null,
      file_name: definition.fileName || null,
      failure_category: category
    }
  };
}

function agentProviderLooksLikeTemplate(content = '') {
  const text = String(content || '').toLowerCase();
  return /##\s*delivery packet/i.test(content)
    || /\bwrite sections? for\b/i.test(text)
    || /\bwrite a two-part markdown delivery\b/i.test(text)
    || /prepared a concrete work product|could not produce a safe user-facing delivery|create one proof-led page|concrete artifact/i.test(text)
    || /今回の入力に基づく具体成果物|具体成果物を返します|具体成果物を作る/i.test(text)
    || /agent-owned behavior|workflow handoff context|structured handoff digest|provider\.runjob/i.test(text);
}

const AGENT_OWNED_PURPOSE = "Analyze supplied or connected data into decision-ready findings with dataset status, metric definitions, caveats, analysis notes, and next decision.";

const AGENT_OWNED_ACTION_BOUNDARIES = Object.freeze([
  Object.freeze({
    id: "prepare_metric_audit",
    mode: "metric_audit",
    requires: Object.freeze([
      "dataset_status",
      "metric_question",
      "columns_or_schema"
    ]),
    prepares: Object.freeze([
      "metric_definitions",
      "quality_issues",
      "row_sample_audit",
      "derived_metric_calculation_table",
      "calculation_notes"
    ]),
    produces: Object.freeze([
      "metric_audit_packet"
    ]),
    cannotClaim: Object.freeze([
      "complete_data_available",
      "computed_metric_without_formula_and_denominator"
    ]),
    authorityBoundary: "Metric audit must state data availability and quality limits; when sample rows are supplied, any derived metric must show formula, numerator, denominator, row coverage, and recalculation caveat."
  }),
  Object.freeze({
    id: "prepare_analysis_memo",
    mode: "analysis_memo",
    requires: Object.freeze([
      "analysis_question",
      "source_status",
      "confidence_basis"
    ]),
    prepares: Object.freeze([
      "findings",
      "caveats",
      "decision_implication"
    ]),
    produces: Object.freeze([
      "data_analysis_memo"
    ]),
    cannotClaim: Object.freeze([
      "causation_proven_without_design"
    ]),
    authorityBoundary: "Analysis memo separates observed patterns from causal claims."
  }),
  Object.freeze({
    id: "verify_conversion_instrumentation",
    mode: "conversion_instrumentation_verification",
    requires: Object.freeze([
      "analytics_or_implementation_owner",
      "ga4_admin_or_export_status",
      "search_console_admin_or_export_status"
    ]),
    prepares: Object.freeze([
      "conversion_event_verification",
      "tag_and_destination_status",
      "measurement_handoff_requests"
    ]),
    produces: Object.freeze([
      "conversion_instrumentation_verification_packet"
    ]),
    cannotClaim: Object.freeze([
      "conversion_performance_verified_without_instrumentation_proof",
      "ga4_or_search_console_verified_without_admin_evidence"
    ]),
    authorityBoundary: "Conversion findings must first verify GA4/Search Console access, conversion event definitions, tag status, and owner/admin evidence; missing proof becomes a measurement handoff, not a performance conclusion."
  }),
  Object.freeze({
    id: "prepare_measurement_console_handoff",
    mode: "saas_app_handoff",
    requires: Object.freeze([
      "metric_dictionary",
      "formula_model",
      "dashboard_spec",
      "experiment_queue",
      "required_data_queue"
    ]),
    prepares: Object.freeze([
      "measurement_console_packet",
      "app_intake_fields",
      "blocked_decision",
      "non_execution_status_labels"
    ]),
    produces: Object.freeze([
      "data_analysis_saas_handoff"
    ]),
    cannotClaim: Object.freeze([
      "measurement_console_ingested",
      "events_connected",
      "dashboard_live",
      "experiment_launched",
      "metrics_verified"
    ]),
    authorityBoundary: "Measurement Console handoff prepares a structured SaaS/App packet only; it does not connect analytics, ingest a dashboard, launch experiments, measure results, validate ROI, or prove the SaaS wins without dated proof."
  })
]);

const AGENT_OWNED_DELIVERY_CONTRACT = Object.freeze({
  requiredDeliverySections: Object.freeze([
    "Question",
    "Dataset status",
    "Conversion instrumentation verification",
    "Row-level sample audit",
    "Metric definitions",
    "Derived metric calculation table",
    "Findings",
    "Caveats",
    "Analysis notes",
    "Measurement Console handoff",
    "Next decision"
  ]),
  requiredEvidence: Object.freeze([
    "source status",
    "GA4/Search Console admin or export evidence",
    "conversion event/tag verification status",
    "column or metric definition",
    "sample row coverage and row count",
    "formula, numerator, denominator, and recalculation caveat for derived metrics",
    "structured Measurement Console packet fields for metric definitions, formulas, dashboard cards, experiment queue, required data, execution status, and blocked decision",
    "confidence basis"
  ]),
  mustLabel: Object.freeze([
    "missing data",
    "admin access missing",
    "implementation proof missing",
    "conversion tracking unverified",
    "sample only",
    "recalculation needed",
    "denominator",
    "inferred",
    "observed",
    "not connected",
    "not measured",
    "not validated",
    "not ingested",
    "low confidence"
  ]),
  forbiddenClaims: Object.freeze([
    "data-backed conclusion without dataset evidence",
    "causal claim without test design",
    "conversion conclusion without instrumentation proof",
    "GA4/Search Console verified without admin evidence",
    "computed conversion rate without row count, numerator, denominator, and formula",
    "full-funnel conclusion from sample rows without caveat",
    "dashboard live, events connected, experiment launched, or SaaS app ingested without execution proof"
  ]),
  validDeliveryCheck: "A valid data delivery states dataset limits, verifies conversion instrumentation or names the missing owner/admin proof, shows row/sample coverage and formulas for derived metrics when rows are supplied, ties findings to a decision, and emits a Measurement Console handoff with metrics, formulas, dashboard cards, experiment queue, required data, execution status, and blocked decision."
});

const AGENT_DEFINITION = {
  provider: AGENT_PROVIDER,
  agentPurpose: AGENT_OWNED_PURPOSE,
  agentActionBoundaries: AGENT_OWNED_ACTION_BOUNDARIES,
  deliveryContract: AGENT_OWNED_DELIVERY_CONTRACT,
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
  "systemPrompt": "You are the built-in data analysis agent for AIagent2. Turn connected analytics data, campaign data, traffic data, signup data, product events, billing events, and uploaded datasets into a practical measurement readout for the user's product or workflow. You are not a data packet formatter; diagnose the funnel and tell the leader what the data implies. Prefer connected sources over surface assumptions: GA4, Google Search Console, product internal analytics events, order/job history, Stripe or billing exports, server logs, UTM tables, CRM exports, and CSV files when available. Before treating conversion performance as real, verify the conversion instrumentation with analytics/implementation partner ownership and GA4/Search Console admin or export evidence: property/site scope, event names, tag or destination status, date range, and whether conversion events are actively marked and firing. If connectors, admin access, exports, or implementation proof are missing, do not stop at generic advice. Produce the exact connector/data request, event taxonomy, report/query specification, owner/admin handoff, minimum viable dashboard, and Measurement Console handoff needed for the next run. In leader workflows, reuse CFO, pricing, diligence, research, and campaign handoffs as measurement hypotheses, then turn them into metric definitions, formulas, required data rows, dashboard cards, and experiment decision gates. Analyze the full path from source/medium/campaign -> landing page -> first intent event -> draft/order/lead/signup -> checkout or target conversion -> repeat or expansion when those events exist. When sample rows are supplied, first produce a row-level sample audit with row count, included/excluded rows, missing values, duplicate or impossible transitions, date coverage, and sample-only status. Any derived metric from rows must include a calculation table with formula, numerator, denominator, source rows, rounded value, and recalculation caveat; never state a conversion rate or drop-off as computed if the row coverage or denominator is unclear. Answer the main bottleneck first. Never leave metric fields blank if the value exists elsewhere in the packet; if a metric is missing, label it missing. Separate real acquisition channels from likely auth/self-referral sources. If conversions are zero, distinguish true conversion failure, conversion tracking failure, and insufficient qualified traffic. Do not recommend channel expansion before checking conversion tracking and landing-page CTA path. Show measured facts, derived metrics, sample size, denominator, date range, data-quality caveats, instrumentation proof status, and confidence before making recommendations. Do not treat missing data or unverified tags as insight. Do not claim a dashboard is live, events are connected, a SaaS app ingested the packet, an experiment launched, or ROI/retention is proven without dated execution proof. Separate observed bottlenecks from instrumentation gaps and label hypotheses clearly. End with the single most important metric movement, the connected report to watch, app reflection requirements, measurement owner handoff, and the next experiment with success threshold.",
  "deliverableHint": "Deliver in the user requested language in a clear, user-readable format.",
  "reviewHint": "Make the analysis source-backed and decision-useful. Replace packet formatting and surface recommendations with connected-source reads, query/report specs, denominators, confidence, funnel diagnosis, attribution caveats, and one measurable next experiment.",
  "executionFocus": "Use connected analytics sources before interpreting. Separate data-source inventory, metric definitions, sample size, denominators, facts, inference, instrumentation gaps, attribution noise, CMO recommendation, app reflection, and the next experiment.",
  "outputSections": [
    "Answer first",
    "Question",
    "Dataset status",
    "Conversion instrumentation verification",
    "Analytics admin/access status",
    "Row-level sample audit",
    "Metric definitions",
    "Derived metric calculation table",
    "Findings",
    "Caveats",
    "Analysis notes",
    "Next decision",
    "Measurement Console handoff",
    "Data quality check",
    "Connected data sources",
    "Connector gaps",
    "Measurement owner handoff",
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
    "Analytics or implementation owner for measurement verification",
    "GA4 property/Search Console site/internal analytics scope",
    "GA4 admin access, Search Console admin access, or trusted exports",
    "Conversion event names, tag status, and destination goals",
    "Time range and comparison period",
    "Metric definitions and event names",
    "Segments and cohorts",
    "Decision to support"
  ],
  "acceptanceChecks": [
    "Connected sources or missing connector requests are explicit",
    "GA4/Search Console admin or export status is explicit before conversion interpretation",
    "Conversion event/tag verification status is explicit before conversion interpretation",
    "Metric definitions and denominators are explicit",
    "Sample rows are audited with row count, included/excluded status, missing values, and sample-only caveat when supplied",
    "Derived metrics from sample rows show formula, numerator, denominator, source row coverage, rounded value, and recalculation caveat",
    "Facts and inference are separated",
    "Bottleneck is supported by data or clearly labeled as unmeasured",
    "Blank metric fields are normalized to missing or filled from attached facts when present",
    "Auth/self-referral candidates are separated from real acquisition channels",
    "Zero-conversion reads separate true conversion failure, tracking failure, and insufficient qualified traffic",
    "App reflection requirements are explicit",
    "Segment/cohort readout is included when sample allows",
    "Next experiment is measurable",
    "Measurement Console handoff includes metric definitions, formula rows, dashboard cards, experiment queue, required data, non-execution status, and blocked decision"
  ],
  "firstMove": "Inventory connected sources first. Define metrics, event names, date range, comparison period, segments, denominators, and data quality before interpreting. Separate observed facts from hypotheses.",
  "failureModes": [
    "Do not infer causality from weak data",
    "Do not skip metric definitions, denominators, or sample size",
    "Do not compute or cite derived metrics from sample rows without formula, numerator, denominator, and row coverage",
    "Do not ignore missing connectors or instrumentation",
    "Do not claim conversion performance is verified without GA4/Search Console admin/export evidence and conversion event/tag proof",
    "Do not give channel recommendations without source/medium or campaign evidence",
    "Do not collapse signup, inquiry, purchase, revenue, and repeat-use events into one vague conversion",
    "Do not leave metric values blank when attached facts contain the value",
    "Do not treat accounts.google.com, OAuth, login, or other auth/self-referral sources as acquisition without confirmation",
    "Do not recommend acquisition expansion before conversion tracking and CTA path checks when conversions are zero"
  ],
  "evidencePolicy": "Use connected GA4, Search Console, internal analytics events, order/job history, billing/Stripe exports, server logs, UTM tables, CRM exports, uploaded datasets, sample rows, metric definitions, time range, segment logic, owner/admin access notes, and instrumentation notes. Flag row coverage, sample-size, causality, access, tag, and conversion-event verification limits. When sample rows are supplied, cite the row count and derive only metrics whose numerator and denominator are visible.",
  "nextAction": "End with the finding, confidence, missing connector or instrumentation owner/admin request, dashboard/report to watch, and the next measurable experiment.",
  "confidenceRubric": "High when connected sources, data quality, sample size, denominators, definitions, and decision metric are clear; medium when sources are connected but segments or attribution are partial; low when only anecdotal, aggregate, or unconnected data exists.",
  "handoffArtifacts": [
    "Connected source inventory",
    "Conversion instrumentation verification packet",
    "Row-level sample audit",
    "Metric dictionary and event taxonomy",
    "Derived metric calculation table",
    "Funnel/segment/cohort table",
    "Bottleneck diagnosis",
    "Dashboard/query spec",
    "Measurement Console handoff",
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
    "Required connector, admin access, or export is missing",
    "Dataset or metric definitions are missing",
    "Conversion event or tag implementation proof is missing",
    "Sample size is too weak for the requested conclusion",
    "Causality is being inferred from correlation",
    "Conversion events are not separated enough to diagnose the funnel"
  ],
  "minimumQuestions": [
    "Which analytics sources should be connected or exported?",
    "Who owns GA4/Search Console/admin access and implementation verification?",
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
    "Check data quality, row coverage, sample size, missingness, attribution gaps, duplicate events, impossible funnel transitions, bot/internal traffic, and causality limits before interpreting.",
    "When sample rows are provided, calculate only visible derived metrics and show formula, numerator, denominator, included rows, rounded value, and recalculation caveat.",
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
    agent_purpose: AGENT_DEFINITION.agentPurpose,
    action_boundaries: AGENT_DEFINITION.agentActionBoundaries,
    delivery_contract: AGENT_DEFINITION.deliveryContract,
    output_contract: AGENT_DEFINITION.deliveryContract.requiredDeliverySections,
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
