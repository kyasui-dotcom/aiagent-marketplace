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
    const generatedDelivery = await agentProviderGenerateDelivery(kind, definition, body, source, { webSources });
    if (generatedDelivery?.error) return agentProviderDeliveryFailure(kind, definition, name, japanese, generatedDelivery.error);
    const markdown = generatedDelivery?.fileMarkdown;
    if (!markdown) return agentProviderDeliveryFailure(kind, definition, name, japanese, 'missing_required_deliverable: original request, source context, or concrete artifact was not available.');
    const generatedArtifacts = Array.isArray(generatedDelivery?.artifacts) ? generatedDelivery.artifacts.filter((item) => item && typeof item === 'object') : [];
    const localArtifacts = agentProviderPricingArtifacts(kind, definition, body, markdown);
    const artifacts = agentProviderMergeArtifacts(generatedArtifacts, localArtifacts);
    return {
      accepted: true,
      status: 'completed',
      summary: generatedDelivery.summary,
      report: {
        summary: generatedDelivery.reportSummary,
        bullets: agentProviderList(generatedDelivery.bullets),
        nextAction: agentProviderText(generatedDelivery.nextAction, ''),
        confidence: prompt === 'No prompt provided.' ? 'low' : 'medium',
        ...(artifacts.length ? { artifacts } : {}),
        ...(agentProviderList(generatedDelivery?.approvalRequests).length ? { approval_requests: generatedDelivery.approvalRequests } : {}),
        ...(webSources.length ? { web_sources: webSources } : {})
      },
      files: [{
        name: agentProviderText(definition.fileName, `${kind || 'agent'}-delivery.md`),
        type: 'text/markdown',
        content: markdown,
        source_task_type: kind,
        content_type: generatedDelivery?.contentType || 'agent_delivery'
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

function agentProviderPricingReferenceSource(body = {}) {
  const url = agentProviderInputText(body, ['reference_ir_url', 'referenceIrUrl', 'benchmark_url', 'benchmarkUrl'], agentProviderPrimaryUrl(body));
  return {
    company: agentProviderInputText(body, ['reference_company', 'referenceCompany', 'company'], 'reference company'),
    url,
    source_date: agentProviderInputText(body, ['source_date', 'sourceDate', 'ir_date', 'irDate'], 'source date not supplied'),
    source_status: url ? 'public_or_owner_supplied_ir_reference' : 'reference source missing',
    access_status: url ? 'source URL supplied; pricing agent did not independently audit filings in this local artifact' : 'not supplied'
  };
}

function agentProviderPricingFactFromText(value = '', index = 0, reference = {}) {
  const text = agentProviderText(value, 'value not supplied');
  const metricValue = text.match(/^(.+?)([+\-▲]?\d[\d,.]*\s*(?:%|pt|百万円|億円|日|件|M|円|ヶ月|か月).*)$/i);
  return {
    row_id: `pricing-benchmark-${index + 1}`,
    metric: agentProviderText(metricValue?.[1], text).replace(/[：:、,\s]+$/g, '') || `Benchmark fact ${index + 1}`,
    value: agentProviderText(metricValue?.[2], text),
    source_status: reference.source_status,
    source_date: reference.source_date,
    source_url: reference.url,
    fact_status: 'public_source_fact_or_owner_supplied_extract',
    pricing_use: 'Use as pricing context only; do not treat as proof that the proposed package will win.'
  };
}

function agentProviderPricingBenchmarkLedger(body = {}) {
  const reference = agentProviderPricingReferenceSource(body);
  const facts = agentProviderInputListValue(body, ['ir_fact_extract', 'irFactExtract', 'benchmark_facts', 'benchmarkFacts']);
  return facts.slice(0, 16).map((fact, index) => {
    if (fact && typeof fact === 'object') {
      return {
        row_id: `pricing-benchmark-${index + 1}`,
        metric: agentProviderText(fact.metric || fact.name || fact.label, `Benchmark fact ${index + 1}`),
        value: agentProviderText(fact.value || fact.summary || fact.text || fact.description, 'value not supplied'),
        source_status: agentProviderText(fact.source_status || fact.sourceStatus, reference.source_status),
        source_date: agentProviderText(fact.source_date || fact.sourceDate, reference.source_date),
        source_url: agentProviderText(fact.source_url || fact.sourceUrl || reference.url),
        fact_status: 'public_source_fact_or_owner_supplied_extract',
        pricing_use: agentProviderText(fact.pricing_use || fact.model_use || fact.modelUse, 'Use as pricing context only; do not treat as proof that the proposed package will win.')
      };
    }
    return agentProviderPricingFactFromText(fact, index, reference);
  });
}

function agentProviderPricingAssumptionTable(body = {}) {
  const supplied = agentProviderInputListValue(body, ['assumptions', 'scenario_assumptions', 'scenarioAssumptions']);
  const defaults = [
    {
      input: 'Buyer segment and moment',
      status: 'assumption',
      value: agentProviderInputText(body, ['buyer_segment', 'buyerSegment', 'target_buyer', 'targetBuyer'], 'SMB or founder-led teams evaluating marketing automation before hiring a large service team.'),
      owner: 'founder + pricing owner'
    },
    {
      input: 'Margin floor',
      status: 'missing data',
      value: 'Actual model/tool/support cost and desired gross margin floor are not supplied.',
      owner: 'finance owner'
    },
    {
      input: 'Prepaid risk control',
      status: 'hypothesis',
      value: 'Prepaid starter scope should reduce unpaid delivery risk while keeping initial commitment smaller than multi-unit support contracts.',
      owner: 'pricing + diligence'
    },
    {
      input: 'Activation window',
      status: 'hypothesis',
      value: 'First three months should prove activation, ROI visibility, and upgrade readiness before moving to larger recurring plans.',
      owner: 'data_analysis'
    },
    {
      input: 'Human review capacity',
      status: 'missing data',
      value: 'Human review minutes, rework rate, and support load are missing; expert review must be metered or capped.',
      owner: 'operations owner'
    }
  ];
  if (!supplied.length) return defaults;
  return supplied.slice(0, 10).map((item, index) => {
    if (item && typeof item === 'object') {
      return {
        input: agentProviderText(item.input || item.name || item.metric, `Assumption ${index + 1}`),
        status: agentProviderText(item.status || item.label, 'assumption'),
        value: agentProviderText(item.value || item.summary || item.description, 'value not supplied'),
        owner: agentProviderText(item.owner || item.source_owner || item.sourceOwner, 'pricing owner')
      };
    }
    return {
      input: `Assumption ${index + 1}`,
      status: 'assumption',
      value: agentProviderText(item),
      owner: 'pricing owner'
    };
  });
}

function agentProviderPricingSourceToModelLedger(body = {}) {
  const benchmarkRows = agentProviderPricingBenchmarkLedger(body);
  const assumptionRows = agentProviderPricingAssumptionTable(body);
  return [
    ...benchmarkRows.slice(0, 10).map((row) => ({
      source_or_gap: row.metric,
      status: row.fact_status,
      value_or_gap: row.value,
      model_input: row.pricing_use,
      pricing_decision_use: 'Package, payment, margin, or rollout guardrail context.',
      confidence: row.source_url ? 'medium' : 'low'
    })),
    ...assumptionRows.slice(0, 8).map((row) => ({
      source_or_gap: row.input,
      status: row.status,
      value_or_gap: row.value,
      model_input: 'Pricing assumption requiring owner review before checkout, billing, or contract decisions.',
      pricing_decision_use: 'Scenario design and risk guardrail.',
      confidence: /missing|未/i.test(row.status) ? 'low' : 'medium'
    }))
  ];
}

function agentProviderPricingPackageArchitecture(body = {}) {
  const approvalOwner = agentProviderInputText(body, ['approval_owner', 'approvalOwner', 'owner'], 'founder');
  const suppliedValueMetric = agentProviderInputText(body, ['value_metric', 'valueMetric'], 'approved marketing action packet');
  return [
    {
      package_id: 'prepaid-url-to-action-starter',
      name: 'Prepaid URL-to-action starter',
      buyer_moment: 'A team wants to see useful marketing automation from one service URL before committing to a larger plan.',
      value_metric: suppliedValueMetric,
      included_scope: ['source review', 'campaign/asset queue draft', 'ROI event map', 'one owner review cycle'],
      excluded_or_metered: ['uncapped human consulting', 'ad spend', 'external publishing', 'custom integrations'],
      payment_rule: 'prepaid before delivery starts',
      price_status: 'not_priced',
      execution_status: 'not_implemented_not_started_not_tested',
      approval_owner: approvalOwner,
      blocked_decision: 'Do not publish or bill this package until cost floor, refund rule, and approval workflow are reviewed.'
    },
    {
      package_id: 'three-month-roi-activation',
      name: '3-month ROI activation plan',
      buyer_moment: 'The starter output is approved and the buyer needs repeated execution planning plus measurement visibility.',
      value_metric: 'monthly approved action packets plus ROI dashboard review',
      included_scope: ['monthly planning queue', 'approval-ready copy/assets', 'measurement checklist', 'ROI review'],
      excluded_or_metered: ['expert channel setup beyond cap', 'custom data warehouse work', 'unbounded revisions'],
      payment_rule: 'monthly prepaid or quarterly upfront with cancellation and refund rules defined',
      price_status: 'not_priced',
      execution_status: 'not_implemented_not_started_not_tested',
      approval_owner: approvalOwner,
      blocked_decision: 'Do not upsell until activation, support load, and ROI event definitions are proven.'
    },
    {
      package_id: 'expert-review-meter',
      name: 'Expert review add-on',
      buyer_moment: 'The buyer needs human review for claims, compliance, strategy, or channel-specific execution risk.',
      value_metric: 'review minutes or reviewed artifacts',
      included_scope: ['bounded expert review', 'claim/risk notes', 'approval owner handoff'],
      excluded_or_metered: ['unlimited revisions', 'legal/accounting advice', 'connector execution'],
      payment_rule: 'metered add-on or capped block prepaid',
      price_status: 'not_priced',
      execution_status: 'not_implemented_not_started_not_tested',
      approval_owner: approvalOwner,
      blocked_decision: 'Do not bury uncapped expert labor inside low-priced SaaS plans.'
    }
  ];
}

function agentProviderPricingFormulaModel() {
  return [
    {
      formula_id: 'starter_margin_guardrail',
      formula: '(starter_price - model_cost - tool_cost - review_cost - support_cost - refund_reserve) / starter_price',
      use: 'Reject a starter package if the first delivery cannot clear the margin floor.',
      missing_inputs: ['starter_price', 'model_cost', 'tool_cost', 'review_cost', 'support_cost', 'refund_reserve', 'margin_floor']
    },
    {
      formula_id: 'three_month_payback',
      formula: 'cac / average_monthly_gross_profit_per_account',
      use: 'Check whether the 3-month activation plan can pay back acquisition and onboarding cost fast enough.',
      missing_inputs: ['cac', 'monthly_gross_profit', 'starter_to_activation_upgrade_rate']
    },
    {
      formula_id: 'expert_review_capacity',
      formula: 'review_minutes_per_account * reviewer_cost_per_minute',
      use: 'Keep human review visible as a cost driver instead of hiding it in subscription margin.',
      missing_inputs: ['review_minutes_per_account', 'reviewer_cost_per_minute', 'rework_rate']
    },
    {
      formula_id: 'roi_plan_gate',
      formula: 'accounts_with_verified_roi_event / activated_accounts',
      use: 'Do not sell ROI-led recurring plans as proven until event definitions and account evidence exist.',
      missing_inputs: ['activated_accounts', 'accounts_with_verified_roi_event', 'event_definition_status']
    }
  ];
}

function agentProviderPricingScenarioTable(body = {}) {
  const approvalOwner = agentProviderInputText(body, ['approval_owner', 'approvalOwner', 'owner'], 'founder');
  return [
    {
      scenario: 'low_friction_starter',
      package_shape: 'single prepaid reviewable packet from one URL',
      pricing_logic: 'lower initial commitment than multi-unit service contracts; prove time-to-value first',
      guardrail_metric: 'starter_margin_guardrail and refund_rate',
      decision_use: 'validate willingness-to-pay and delivery cost before subscription',
      execution_status: 'not_implemented_not_started_not_tested',
      approval_owner: approvalOwner
    },
    {
      scenario: 'activation_subscription',
      package_shape: '3-month prepaid or monthly prepaid activation plan',
      pricing_logic: 'turn first value into retention using ROI visibility and approved action cadence',
      guardrail_metric: 'three_month_payback, support_minutes_per_account, activation_to_paid_rate',
      decision_use: 'upgrade only after starter approval and instrumentation readiness',
      execution_status: 'not_implemented_not_started_not_tested',
      approval_owner: approvalOwner
    },
    {
      scenario: 'hybrid_expert_add_on',
      package_shape: 'SaaS base plus metered expert review',
      pricing_logic: 'capture human-value willingness-to-pay without destroying SaaS margin',
      guardrail_metric: 'expert_review_capacity and rework_rate',
      decision_use: 'separate review-heavy customers from self-serve automation economics',
      execution_status: 'not_implemented_not_started_not_tested',
      approval_owner: approvalOwner
    }
  ];
}

function agentProviderPricingSensitivityTable() {
  return [
    {
      driver: 'model/tool/review/support cost',
      downside: 'starter package loses margin before customer proves recurring value',
      upside: 'AI automation creates a visibly cheaper first-value path',
      guardrail_metric: 'starter_margin_guardrail'
    },
    {
      driver: 'starter-to-activation upgrade rate',
      downside: 'prepaid starter becomes one-off services work',
      upside: 'starter becomes a low-risk acquisition path into recurring revenue',
      guardrail_metric: 'starter_to_activation_upgrade_rate'
    },
    {
      driver: 'refund and unpaid work exposure',
      downside: 'cash conversion advantage disappears',
      upside: 'prepaid/capped work avoids Aidma-like start/payment friction',
      guardrail_metric: 'refund_rate and unpaid_start_rate'
    },
    {
      driver: 'ROI event verification',
      downside: 'recurring plan value claim stays unproven',
      upside: 'retention story becomes evidence-backed instead of activity-led',
      guardrail_metric: 'verified_roi_event_rate'
    }
  ];
}

function agentProviderPricingExperimentQueue(body = {}) {
  const approvalOwner = agentProviderInputText(body, ['approval_owner', 'approvalOwner', 'owner'], 'founder');
  return [
    {
      experiment_id: 'starter-wtp-dry-run',
      hypothesis: 'Teams will prepay for one URL-to-action starter if the scope and reviewable output are concrete.',
      test_surface: 'pricing page or founder sales deck',
      proposed_change_status: 'draft_not_live',
      success_metric: 'qualified prepaid intent rate',
      guardrail_metric: 'refund objection rate and estimated gross margin',
      required_inputs: ['starter scope', 'cost floor', 'refund rule', 'approval workflow', 'checkout owner'],
      execution_status: 'not_priced_not_launched_not_tested',
      approval_owner: approvalOwner,
      blocked_decision: 'Do not start checkout, traffic, or sales tests until owner approves the price, audience, and proof capture.'
    },
    {
      experiment_id: 'three-month-activation-upsell',
      hypothesis: 'Approved starter customers will accept a 3-month prepaid activation plan when ROI events are visible.',
      test_surface: 'post-starter proposal template',
      proposed_change_status: 'draft_not_live',
      success_metric: 'starter_to_activation_upgrade_rate',
      guardrail_metric: 'support_minutes_per_account and gross margin',
      required_inputs: ['ROI event definitions', 'support load estimate', 'upgrade threshold', 'proposal owner'],
      execution_status: 'not_priced_not_launched_not_tested',
      approval_owner: approvalOwner,
      blocked_decision: 'Do not claim retention or ROI improvement until cohort evidence exists.'
    },
    {
      experiment_id: 'expert-review-meter-validation',
      hypothesis: 'Review-heavy customers will pay separately for bounded expert review instead of expecting unlimited service in SaaS base plans.',
      test_surface: 'sales qualification and add-on quote',
      proposed_change_status: 'draft_not_live',
      success_metric: 'review_add_on_attach_rate',
      guardrail_metric: 'review_minutes_per_account and rework_rate',
      required_inputs: ['review SLA', 'review-minute cost', 'quality checklist', 'sales owner'],
      execution_status: 'not_priced_not_launched_not_tested',
      approval_owner: approvalOwner,
      blocked_decision: 'Do not include unlimited expert review in base package pricing.'
    }
  ];
}

function agentProviderPricingExecutionProofTracker(body = {}) {
  const approvalOwner = agentProviderInputText(body, ['approval_owner', 'approvalOwner', 'owner'], 'founder');
  return [
    {
      proof_item: 'price/package approved',
      required_evidence: 'owner approval with package scope, price, refund rule, and migration/communication notes',
      current_status: 'not_approved',
      owner: approvalOwner
    },
    {
      proof_item: 'checkout or billing changed',
      required_evidence: 'checkout/billing configuration diff, pricing page diff, or contract template revision',
      current_status: 'not_implemented',
      owner: 'implementation owner'
    },
    {
      proof_item: 'pricing test started',
      required_evidence: 'experiment brief, audience, routed traffic/sales cohort, start timestamp, and measurement event',
      current_status: 'not_started',
      owner: 'pricing owner'
    },
    {
      proof_item: 'pricing result observed',
      required_evidence: 'dated results with denominator, conversion, refund, margin, support load, and confidence caveat',
      current_status: 'not_verified',
      owner: 'data_analysis'
    }
  ];
}

function agentProviderPricingArtifacts(kind = '', definition = {}, body = {}, markdown = '') {
  if (kind !== 'pricing') return [];
  const service = agentProviderInputText(body, ['service_to_build', 'serviceToBuild', 'service_description', 'serviceDescription'], agentProviderOffer(body));
  const approvalOwner = agentProviderInputText(body, ['approval_owner', 'approvalOwner', 'owner'], 'founder');
  const valueMetric = agentProviderInputText(body, ['value_metric', 'valueMetric'], 'approved marketing action packet');
  const reference = agentProviderPricingReferenceSource(body);
  const benchmarkLedger = agentProviderPricingBenchmarkLedger(body);
  const packageArchitecture = agentProviderPricingPackageArchitecture(body);
  return [{
    type: 'pricing_strategy_saas_handoff',
    artifact_type: 'pricing_decision_packet',
    surface: 'pricing_decision_console',
    source_task_type: kind,
    title: `${service} pricing and payment decision packet`,
    pricing_question: agentProviderPrompt(body).slice(0, 1200),
    service_strategy: {
      service_to_build: service,
      target_buyer: agentProviderInputText(body, ['buyer_segment', 'buyerSegment', 'target_buyer', 'targetBuyer'], 'target buyer not supplied'),
      value_metric: valueMetric,
      approval_owner: approvalOwner,
      execution_status: 'pricing_strategy_not_implemented'
    },
    reference_source: reference,
    benchmark_ledger: benchmarkLedger,
    assumption_table: agentProviderPricingAssumptionTable(body),
    source_to_model_ledger: agentProviderPricingSourceToModelLedger(body),
    package_architecture: packageArchitecture,
    formula_model: agentProviderPricingFormulaModel(),
    scenario_table: agentProviderPricingScenarioTable(body),
    sensitivity_table: agentProviderPricingSensitivityTable(body),
    pricing_experiment_queue: agentProviderPricingExperimentQueue(body),
    upstream_handoff_usage: agentProviderPriorRunUsage(body),
    decision_trigger: 'Approve only one reversible starter/activation pricing test after margin floor, refund exposure, support load, and proof-capture owner are confirmed.',
    approval_owner: approvalOwner,
    implementation_surface: agentProviderInputText(body, ['implementation_surface', 'implementationSurface'], 'pricing page, checkout/billing configuration, proposal template, and CRM/package record'),
    execution_proof_tracker: agentProviderPricingExecutionProofTracker(body),
    confidence_labels: {
      benchmark_facts: benchmarkLedger.length ? 'medium_source_extract_supplied' : 'low_no_benchmark_extract',
      price_level: 'low_until_wtp_and_cost_floor_are_supplied',
      package_shape: 'medium_hypothesis_not_validated',
      checkout_or_test_status: 'not_started_not_implemented'
    },
    app_intake_fields: [
      'pricing_question',
      'reference_source',
      'benchmark_ledger',
      'assumption_table',
      'source_to_model_ledger',
      'package_architecture',
      'formula_model',
      'scenario_table',
      'sensitivity_table',
      'pricing_experiment_queue',
      'decision_trigger',
      'approval_owner',
      'implementation_surface',
      'execution_proof_tracker',
      'confidence_labels',
      'execution_status',
      'blocked_decision'
    ],
    execution_status: 'not_priced_not_launched_not_tested',
    blocked_decision: 'Do not claim a price is approved, checkout changed, a test started, or a winner selected until owner approval and dated execution proof exist.',
    execution_boundary: 'Prepared only; no price, checkout, billing, discount, contract, traffic, experiment, measurement, result, or SaaS app ingestion is implied.',
    summary_markdown_title: agentProviderMarkdownTitle(markdown, definition.fileName || kind || 'pricing')
  }];
}

function agentProviderPricingStructuredContextForGeneration(body = {}) {
  const benchmarkLedger = agentProviderPricingBenchmarkLedger(body);
  return {
    reference_source: agentProviderPricingReferenceSource(body),
    service_to_build: agentProviderInputText(body, ['service_to_build', 'serviceToBuild', 'service_description', 'serviceDescription'], agentProviderOffer(body)),
    pricing_question: agentProviderPrompt(body).slice(0, 1200),
    approval_owner: agentProviderInputText(body, ['approval_owner', 'approvalOwner', 'owner'], 'founder'),
    benchmark_ledger: benchmarkLedger.slice(0, 16),
    assumption_table: agentProviderPricingAssumptionTable(body),
    source_to_model_ledger: agentProviderPricingSourceToModelLedger(body).slice(0, 18),
    package_architecture: agentProviderPricingPackageArchitecture(body),
    formula_model: agentProviderPricingFormulaModel(),
    scenario_table: agentProviderPricingScenarioTable(body),
    pricing_experiment_queue: agentProviderPricingExperimentQueue(body),
    generation_instruction: 'Use supplied benchmark_ledger rows as provided facts with source/date/status labels. Do not mark those supplied rows as missing. Keep missing CAC, willingness-to-pay, cost floor, support load, refund, and experiment-result data explicit.'
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
      tool_strategy: agentProviderObject(definition.toolStrategy),
      specialist_method: agentProviderList(definition.specialistMethod),
      scope_boundaries: agentProviderList(definition.scopeBoundaries),
      depth_policy: definition.depthPolicy || null,
      concision_rule: definition.concisionRule || null,
      output_sections: agentProviderList(definition.outputSections),
      acceptance_checks: agentProviderList(definition.acceptanceChecks),
      next_action: agentProviderText(definition.nextAction)
    },
    user_request: agentProviderPublicBrief(body).slice(0, 6000),
    full_request_excerpt: prompt.slice(0, 8000),
    target_url: agentProviderPrimaryUrl(body),
    evidence_sources: webSources.slice(0, 16),
    structured_pricing_context: agentProviderPricingStructuredContextForGeneration(body),
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

const AGENT_OWNED_PURPOSE = "Create pricing strategy and model recommendations with value metric, assumptions, formulas, scenarios, sensitivity, decision trigger, approval owner, and price-change proof boundary.";

const AGENT_OWNED_ACTION_BOUNDARIES = Object.freeze([
  Object.freeze({
    id: "prepare_price_model",
    mode: "pricing_model",
    requires: Object.freeze([
      "value_metric",
      "cost_or_benchmark_assumptions",
      "customer_segment"
    ]),
    prepares: Object.freeze([
      "price_formula",
      "scenario_table",
      "sensitivity_notes"
    ]),
    produces: Object.freeze([
      "price_model_packet"
    ]),
    cannotClaim: Object.freeze([
      "prices_changed"
    ]),
    authorityBoundary: "Pricing model is advisory until price changes are executed elsewhere."
  }),
  Object.freeze({
    id: "prepare_package_decision",
    mode: "packaging",
    requires: Object.freeze([
      "buyer_segment",
      "offer_components",
      "tradeoff_goal"
    ]),
    prepares: Object.freeze([
      "package_options",
      "tradeoffs",
      "recommendation_trigger"
    ]),
    produces: Object.freeze([
      "package_decision_packet"
    ]),
    cannotClaim: Object.freeze([
      "revenue_uplift_guaranteed"
    ]),
    authorityBoundary: "Package decision cannot guarantee buyer behavior."
  }),
  Object.freeze({
    id: "prepare_sensitivity_decision",
    mode: "decision_gate",
    requires: Object.freeze([
      "base_case",
      "upside_case",
      "downside_case",
      "decision_trigger"
    ]),
    prepares: Object.freeze([
      "sensitivity_table",
      "guardrail_metric",
      "continue_or_rollback_rule"
    ]),
    produces: Object.freeze([
      "pricing_sensitivity_decision_packet"
    ]),
    cannotClaim: Object.freeze([
      "price_test_won_without_results"
    ]),
    authorityBoundary: "Sensitivity decision is a test gate until live pricing results are observed."
  }),
  Object.freeze({
    id: "prepare_price_change_handoff",
    mode: "approval_handoff",
    requires: Object.freeze([
      "recommended_price_or_package_change",
      "source_to_model_ledger",
      "approval_owner",
      "implementation_surface"
    ]),
    prepares: Object.freeze([
      "price_change_request_packet",
      "approval_checkpoint",
      "implementation_owner_handoff",
      "execution_proof_tracker"
    ]),
    produces: Object.freeze([
      "pricing_change_handoff_packet"
    ]),
    cannotClaim: Object.freeze([
      "price_change_applied",
      "checkout_updated",
      "billing_plan_updated",
      "price_test_started"
    ]),
    authorityBoundary: "Pricing handoff prepares an owner-ready change packet; it does not update checkout, billing, pricing pages, customer contracts, discounts, or live experiments without approval and execution proof."
  }),
  Object.freeze({
    id: "prepare_pricing_console_handoff",
    mode: "saas_app_handoff",
    requires: Object.freeze([
      "package_architecture",
      "source_to_model_ledger",
      "pricing_experiment_queue",
      "execution_proof_tracker"
    ]),
    prepares: Object.freeze([
      "pricing_decision_console_packet",
      "app_intake_fields",
      "blocked_decision",
      "non_execution_status_labels"
    ]),
    produces: Object.freeze([
      "pricing_strategy_saas_handoff"
    ]),
    cannotClaim: Object.freeze([
      "pricing_decision_console_ingested",
      "pricing_approved",
      "price_test_started"
    ]),
    authorityBoundary: "Pricing Console handoff prepares a structured SaaS/App packet only; it does not ingest, approve, price, launch, route traffic, measure, or select a winner without explicit proof."
  })
]);

const AGENT_OWNED_DELIVERY_CONTRACT = Object.freeze({
  requiredDeliverySections: Object.freeze([
    "Pricing question",
    "Value metric",
    "Assumptions",
    "Source-to-model ledger",
    "Formula",
    "Scenario table",
    "Sensitivity table",
    "Recommendation",
    "Approval owner",
    "Price-change handoff",
    "Pricing Decision Console handoff",
    "Execution proof tracker",
    "Execution status labels",
    "Decision trigger",
    "Rollback or continue rule"
  ]),
  requiredEvidence: Object.freeze([
    "cost or benchmark assumption",
    "scenario delta",
    "guardrail metric",
    "source date and owner for each pricing input",
    "structured Pricing Decision Console packet fields for package rows, formula rows, experiment rows, approval owner, execution status, and blocked decision",
    "approval and implementation owner before any price, checkout, billing, discount, or contract change",
    "proof source required to claim a price test started, checkout changed, billing plan changed, or result observed"
  ]),
  mustLabel: Object.freeze([
    "assumption",
    "estimate",
    "sensitivity",
    "missing data",
    "source date",
    "approval state",
    "not ingested",
    "not implemented",
    "not started",
    "proof missing"
  ]),
  forbiddenClaims: Object.freeze([
    "numeric recommendation without assumptions",
    "guaranteed revenue claim",
    "price test won without results",
    "Pricing Decision Console ingestion or SaaS app handoff completion without artifact proof",
    "price, checkout, billing plan, discount, or contract change applied without execution proof",
    "price test started, traffic routed, conversion measured, or winner selected without dated experiment evidence"
  ]),
  validDeliveryCheck: "A valid pricing delivery shows the model behind the recommendation, names the approval owner, separates advisory pricing from live changes, defines proof required before claiming execution or results, and emits a structured Pricing Decision Console handoff packet without implying app ingestion."
});

const AGENT_DEFINITION = {
  provider: AGENT_PROVIDER,
  agentPurpose: AGENT_OWNED_PURPOSE,
  agentActionBoundaries: AGENT_OWNED_ACTION_BOUNDARIES,
  deliveryContract: AGENT_OWNED_DELIVERY_CONTRACT,
  "fileName": "pricing-strategy-delivery.md",
  "healthService": "pricing_strategy_agent",
  "modelRole": "pricing strategy and packaging design",
  "executionLayer": "research",
  "taskRouting": {
    "inferenceRules": [
      { taskType: 'pricing', patterns: [/(pricing|price strategy|package|packaging|monetization|subscription pricing|値付け|価格戦略|料金設計|プラン設計|価格表)/i] }
    ],
    "expansionTasks": ['research', 'summary'],
    "softMatchTokens": ['pricing', 'finance', 'billing', 'unit_economics'],
    "tagHints": ['finance', 'pricing', 'analysis']
  },
  "seedProfile": {
    "id": "agent_pricing_01",
    "name": "PRICING STRATEGY AGENT",
    "description": "Built-in pricing strategy and packaging design agent.",
    "taskTypes": [
      "pricing",
      "research",
      "summary"
    ],
    "successRate": 0.93,
    "avgLatencySec": 18,
    "capabilities": [
      "pricing",
      "research",
      "summary"
    ]
  },
  "systemPrompt": "You are the built-in pricing strategy agent for AIagent2. Return usable pricing recommendations rather than generic monetization advice. Start from buyer segment, buyer moment, job-to-be-done, value metric, alternatives, willingness-to-pay evidence, costs, and margin floor. Design the pricing architecture: package boundaries, metering unit, included limits, overages, trial/free limits, annual/enterprise path, and discount rules when relevant. Benchmark direct competitors and buyer substitutes, but do not average unrelated prices or copy competitor packaging without segment fit. Run pricing-specific competitive research: classify each alternative as direct competitor, indirect substitute, or status quo; capture price meter, package boundary, free/trial path, limits, overages, discount/annual path, hidden costs, and evidence date. Separate the first reversible price test from production rollout, existing-customer migration, grandfathering, communication, and rollback. For usage-based, AI, marketplace, or agent products, include unit economics: model/tool cost, platform fee, support load, reserve/overage/refund exposure, and gross margin guardrail. For every recommendation, include a source-to-model ledger, name the approval owner, identify the implementation surface, label the change as not implemented until proof exists, and define the execution proof required before claiming checkout, billing, pricing page, discount, contract, experiment, traffic, metric, or winner status. Prepare a Pricing Decision Console handoff with package rows, formula rows, experiment rows, approval owner, execution status, blocked decision, and app intake fields, but label it not ingested unless app-ingest proof exists. Recommend one primary pricing test with success metric, guardrail, sample or time window, review timing, and what decision to make after the result. State assumptions explicitly when market data, cost data, or willingness-to-pay evidence is incomplete. Do not end with an open-ended question or optional-offer sentence; end with the next pricing decision packet, the missing-data request list, and the responsible owner.",
  "deliverableHint": "Deliver in the user requested language in a clear, user-readable format.",
  "reviewHint": "Sharpen the competitor research, value metric, margin floor, package boundaries, migration risk, and experiment design. Remove vague pricing advice, unsupported competitor averages, stale pricing claims, and irreversible production changes.",
  "executionFocus": "Run pricing-specific competitor research first, then recommend one price architecture and reversible test. Include buyer segment, buying moment, value metric, comparable vs non-comparable alternatives, package boundaries, unit economics, anchor, margin guardrail, migration risk, and rollout plan.",
  "outputSections": [
    "Pricing question",
    "Value metric",
    "Assumptions",
    "Source-to-model ledger",
    "Formula",
    "Scenario table",
    "Sensitivity table",
    "Recommendation",
    "Approval owner",
    "Price-change handoff",
    "Pricing Decision Console handoff",
    "Execution proof tracker",
    "Execution status labels",
    "Decision trigger",
    "Rollback or continue rule"
  ],
  "inputNeeds": [
    "Customer segment and buyer moment",
    "Value metric and package boundary",
    "Competitor URLs or known alternatives",
    "Cost, margin, fee, refund, and support constraints",
    "Existing-customer or migration constraints",
    "Conversion goal",
    "Approval owner for price, checkout, billing, discount, contract, or experiment changes",
    "Implementation surface and proof source for any requested price change"
  ],
  "acceptanceChecks": [
    "Recommended price ties to value metric and package boundary",
    "Competitor research separates direct competitors, substitutes, and status quo",
    "Comparable and non-comparable benchmarks are labeled",
    "Unit economics, margin, refund, or support risk is called out",
    "Existing-customer migration risk is handled when relevant",
    "Test plan has success metric, guardrail, and review timing",
    "Each material pricing input traces to a source, dated assumption, or explicit gap",
    "Approval owner and implementation surface are explicit before any live price, checkout, billing, discount, contract, or experiment handoff",
    "Output labels pricing changes as not implemented and tests as not started unless execution proof is supplied",
    "Output emits a structured Pricing Decision Console handoff artifact with package, formula, experiment, approval, status, and blocked-decision fields",
    "The Pricing Decision Console handoff is labeled not ingested unless app execution proof exists",
    "Execution proof tracker defines required evidence for applied changes, routed traffic, measured conversion, and winner selection"
  ],
  "firstMove": "Start from buyer segment, buying moment, value metric, willingness-to-pay evidence, competitor/substitute/status-quo research, unit costs, margin floor, and migration constraints before suggesting tiers or usage limits.",
  "failureModes": [
    "Do not pick prices without value metric, buyer segment, or package boundary",
    "Do not average unrelated competitor prices or copy packaging without segment fit",
    "Do not ignore unit cost, margin, support load, churn, or refund risk",
    "Do not recommend irreversible production price changes without migration, communication, and rollback guardrails",
    "Do not skip a measurable test plan",
    "Do not omit a Pricing Decision Console handoff when package architecture or experiment rows are prepared",
    "Do not imply that checkout, billing, pricing pages, discounts, customer contracts, experiments, traffic routing, measurement, or winner selection changed without approval and dated execution proof"
  ],
  "evidencePolicy": "Ground recommendations in buyer segment, buyer moment, value metric, direct competitor pricing, indirect substitute costs, status-quo workflow costs, willingness-to-pay signals, usage/cost assumptions, payment/provider fees, margin constraints, churn/refund risk, support load, and migration impact.",
  "nextAction": "End with the first pricing experiment, target segment, test price or package change, approval owner, implementation surface, required execution proof, success metric, guardrail, review timing, rollback or rollout decision, exact missing-data request list, and responsible owner. Do not end by asking a broad follow-up question or offering optional additional work.",
  "confidenceRubric": "High when buyer segment, buying moment, value metric, alternatives, costs, margin floor, existing-customer impact, and conversion target are known; medium when willingness-to-pay or unit economics are inferred; low when segment, package boundary, or margin constraints are missing.",
  "handoffArtifacts": [
    "Pricing competitor research table",
    "Pricing hypothesis",
    "Tier/package architecture",
    "Unit economics and margin notes",
    "Migration and communication guardrails",
    "Experiment plan",
    "Pricing Decision Console handoff",
    "Approval owner handoff",
    "Execution proof tracker"
  ],
  "prioritizationRubric": "Prioritize options by revenue impact, buyer clarity, value metric fit, package simplicity, margin risk, churn/refund exposure, reversibility, and testability.",
  "measurementSignals": [
    "Conversion rate",
    "ARPU or ACV",
    "Gross margin",
    "Refund/churn signal",
    "Upgrade or overage adoption"
  ],
  "assumptionPolicy": "Assume a reversible pricing test unless the user asks for final packaging. Do not assume margins, cost of service, support load, refund risk, existing-customer terms, or willingness-to-pay evidence.",
  "escalationTriggers": [
    "Margin, usage cost, support cost, or refund assumptions are missing",
    "Pricing affects existing customers materially",
    "The value metric or package boundary is unclear",
    "The user asks for irreversible price changes",
    "Approval owner, implementation surface, or execution proof source is unclear"
  ],
  "minimumQuestions": [
    "Who is the buyer segment and buying moment?",
    "What value metric, package boundary, and margin constraint matter?",
    "Is this a new price test or a production price change?"
  ],
  "reviewChecks": [
    "Value metric drives the price",
    "Package boundary is explicit",
    "Margin and migration risk are visible",
    "Experiment is measurable"
  ],
  "depthPolicy": "Default to one recommended pricing test. Go deeper when package architecture, usage limits, margin, support cost, churn/refund risk, existing-customer migration, or enterprise segmentation affects the decision.",
  "concisionRule": "Avoid listing every pricing model; compare only options that fit the segment, value metric, unit economics, and migration risk.",
  "toolStrategy": {
    "web_search": "default",
    "source_mode": "pricing_competitor_research_direct_substitute_status_quo_unit_economics_and_migration_context",
    "note": "Benchmark current direct competitors, substitutes, status-quo workflows, pricing pages, package limits, meters, overages, annual/enterprise paths, hidden costs, and unit-economics assumptions before recommending packages, anchors, tests, or migration steps."
  },
  "specialistMethod": [
    "Identify buyer segment, buying moment, value metric, package boundary, alternatives, margin constraints, and adoption risk.",
    "Run pricing-specific competitive research across direct competitors, indirect substitutes, and status-quo workflows.",
    "Benchmark current competitor or substitute pricing while separating comparable prices from non-comparable anchors and dating source observations.",
    "Build the package architecture around included limits, overages, trial/free boundaries, annual or enterprise path, and discount rules when relevant.",
    "Propose one reversible pricing experiment with success metric, guardrail, review timing, and rollout or rollback decision."
  ],
  "scopeBoundaries": [
    "Do not recommend irreversible price changes without migration, communication, and rollback considerations.",
    "Do not ignore unit cost, margin, refund, churn, support load, reserve exposure, or buyer trust risk.",
    "Do not overfit to competitor prices when value metric, package boundaries, and segment economics differ.",
    "Do not treat a trial, free plan, usage meter, seat price, and enterprise package as interchangeable without explaining the buying motion.",
    "Do not treat a Pricing Decision Console handoff as ingested, approved, launched, or tested without app and execution proof.",
    "Do not claim price, checkout, billing, discount, customer-contract, experiment, traffic-routing, measurement, or winner-selection execution without approval and proof from the implementation surface."
  ],
  "freshnessPolicy": "Treat competitor pricing, packaging limits, fees, buyer alternatives, provider/model costs, and checkout/payment constraints as current-market evidence. Date benchmarks and avoid production price calls from stale pages.",
  "sensitiveDataPolicy": "Treat costs, margins, customer contracts, revenue, churn, usage, refund history, discount strategy, and provider/model costs as confidential. Use ranges or labels when exact values are not needed for the recommendation.",
  "costControlPolicy": "Benchmark only directly comparable alternatives and buyer substitutes, then stop once a reversible experiment can answer the decision. Avoid large pricing surveys, complex tier matrices, or enterprise packaging unless they change the next test."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'pricing',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'pricing'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'pricing agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/pricing/health',
  healthcheck_url: '/sample-agents/pricing/health',
  jobEndpoint: '/sample-agents/pricing/jobs',
  job_endpoint: '/sample-agents/pricing/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/pricing/health',
    jobs: '/sample-agents/pricing/jobs'
  }),
  metadata: Object.freeze({
    agent_purpose: AGENT_DEFINITION.agentPurpose,
    action_boundaries: AGENT_DEFINITION.agentActionBoundaries,
    delivery_contract: AGENT_DEFINITION.deliveryContract,
    output_contract: AGENT_DEFINITION.deliveryContract.requiredDeliverySections,
    sample: true,
    sampleKind: 'pricing',
    sample_kind: 'pricing',
    category: 'pricing',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
