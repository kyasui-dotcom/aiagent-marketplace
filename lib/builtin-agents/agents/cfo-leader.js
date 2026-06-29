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
    const localArtifacts = agentProviderCfoArtifacts(kind, definition, body, markdown);
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

function agentProviderCfoReferenceSource(body = {}) {
  const input = agentProviderInputRoot(body);
  const url = agentProviderInputText(body, ['reference_ir_url', 'referenceIrUrl', 'benchmark_url', 'benchmarkUrl'], agentProviderPrimaryUrl(body));
  return {
    company: agentProviderInputText(body, ['reference_company', 'referenceCompany', 'company'], 'reference company'),
    url,
    source_date: agentProviderInputText(body, ['source_date', 'sourceDate', 'ir_date', 'irDate'], 'source date not supplied'),
    source_status: url ? 'public_or_owner_supplied_ir_reference' : 'reference source missing',
    access_status: url ? 'source URL supplied; agent did not independently audit filings in this local artifact' : 'not supplied'
  };
}

function agentProviderCfoBenchmarkLedger(body = {}) {
  const reference = agentProviderCfoReferenceSource(body);
  const facts = agentProviderInputListValue(body, ['ir_fact_extract', 'irFactExtract', 'benchmark_facts', 'benchmarkFacts']);
  return facts.slice(0, 16).map((fact, index) => {
    if (fact && typeof fact === 'object') {
      return {
        row_id: `benchmark-${index + 1}`,
        metric: agentProviderText(fact.metric || fact.name || fact.label, `Benchmark fact ${index + 1}`),
        value: agentProviderText(fact.value || fact.summary || fact.text || fact.description, 'value not supplied'),
        source_status: agentProviderText(fact.source_status || fact.sourceStatus, reference.source_status),
        source_date: agentProviderText(fact.source_date || fact.sourceDate, reference.source_date),
        source_url: agentProviderText(fact.source_url || fact.sourceUrl || reference.url),
        fact_status: 'public_source_fact_or_owner_supplied_extract',
        model_use: agentProviderText(fact.model_use || fact.modelUse, 'Use as benchmark context only; do not treat as proof that the new service will win.')
      };
    }
    return {
      row_id: `benchmark-${index + 1}`,
      metric: `Benchmark fact ${index + 1}`,
      value: agentProviderText(fact, 'value not supplied'),
      source_status: reference.source_status,
      source_date: reference.source_date,
      source_url: reference.url,
      fact_status: 'public_source_fact_or_owner_supplied_extract',
      model_use: 'Use as benchmark context only; do not treat as proof that the new service will win.'
    };
  });
}

function agentProviderCfoAssumptionTable(body = {}) {
  const supplied = agentProviderInputListValue(body, ['assumptions', 'scenario_assumptions', 'scenarioAssumptions']);
  const defaults = [
    {
      input: 'AI automation gross-margin guardrail',
      status: 'assumption',
      value: 'Target contribution margin must stay above the founder-set floor after model/tool/support costs.',
      owner: 'founder + finance owner'
    },
    {
      input: 'Customer acquisition cost',
      status: 'missing data',
      value: 'CAC by channel is not supplied; pricing and payback are directional until CAC is measured.',
      owner: 'data_analysis'
    },
    {
      input: 'Activation speed advantage',
      status: 'hypothesis',
      value: 'A URL-to-reviewable-action-packet flow should beat labor-heavy onboarding if first value is visible in days, not months.',
      owner: 'teardown + product owner'
    },
    {
      input: 'Payment and credit risk',
      status: 'hypothesis',
      value: 'Prepaid starter packages and usage caps reduce unpaid work exposure without copying enterprise-heavy contracts.',
      owner: 'pricing + diligence'
    },
    {
      input: 'LTV expansion path',
      status: 'assumption',
      value: 'Early success evidence and ROI reporting should improve retention, but actual renewal/cohort data is missing.',
      owner: 'data_analysis'
    }
  ];
  if (!supplied.length) return defaults;
  return supplied.slice(0, 10).map((item, index) => {
    if (item && typeof item === 'object') {
      return {
        input: agentProviderText(item.input || item.name || item.metric, `Assumption ${index + 1}`),
        status: agentProviderText(item.status || item.label, 'assumption'),
        value: agentProviderText(item.value || item.summary || item.description, 'value not supplied'),
        owner: agentProviderText(item.owner || item.source_owner || item.sourceOwner, 'finance owner')
      };
    }
    return {
      input: `Assumption ${index + 1}`,
      status: 'assumption',
      value: agentProviderText(item),
      owner: 'finance owner'
    };
  });
}

function agentProviderCfoSourceToModelLedger(body = {}) {
  const benchmarkRows = agentProviderCfoBenchmarkLedger(body);
  const assumptionRows = agentProviderCfoAssumptionTable(body);
  return [
    ...benchmarkRows.slice(0, 10).map((row) => ({
      source_or_gap: row.metric,
      status: row.fact_status,
      value_or_gap: row.value,
      model_input: row.model_use,
      confidence: row.source_url ? 'medium' : 'low'
    })),
    ...assumptionRows.slice(0, 8).map((row) => ({
      source_or_gap: row.input,
      status: row.status,
      value_or_gap: row.value,
      model_input: 'Scenario assumption requiring owner review before pricing or investment decisions.',
      confidence: /missing|未/i.test(row.status) ? 'low' : 'medium'
    }))
  ];
}

function agentProviderCfoWinningHypotheses(body = {}) {
  const service = agentProviderInputText(body, ['service_to_build', 'serviceToBuild', 'service_description', 'serviceDescription'], agentProviderOffer(body));
  const approvalOwner = agentProviderInputText(body, ['approval_owner', 'approvalOwner', 'owner'], 'founder');
  return [
    {
      hypothesis_id: 'win-speed-to-first-value',
      lever: 'onboarding and activation speed',
      hypothesis: `${service} can win by turning one URL into a reviewable marketing action packet before a labor-heavy service can finish onboarding.`,
      source_basis: 'IR benchmark highlights service-start lead time and backlog conversion as operating bottlenecks.',
      metric_to_prove: 'time_to_first_reviewable_packet, first_week_activation_rate, first_30_day_paid_conversion',
      owner: 'data_analysis + product owner',
      confidence: 'medium',
      status: 'untested_hypothesis'
    },
    {
      hypothesis_id: 'win-prepaid-small-start',
      lever: 'cash and credit-risk design',
      hypothesis: 'Use prepaid starter packages, usage caps, and credit gates to reduce unpaid work exposure while keeping the initial commitment smaller than multi-unit service contracts.',
      source_basis: 'IR benchmark references prepaid/credit-strengthening actions for support-start risk.',
      metric_to_prove: 'unpaid_start_rate, refund_rate, payback_period, starter_to_recurring_upgrade_rate',
      owner: 'pricing + diligence',
      confidence: 'medium',
      status: 'untested_hypothesis'
    },
    {
      hypothesis_id: 'win-roi-proof-loop',
      lever: 'retention and LTV',
      hypothesis: 'A built-in ROI dashboard and proof ledger can move renewal decisions from activity volume to measurable business outcomes.',
      source_basis: 'IR benchmark links early success and ROI visibility to LTV improvement.',
      metric_to_prove: '90_day_retention, renewal_intent, roi_report_view_rate, approved_action_to_outcome_rate',
      owner: 'data_analysis',
      confidence: 'medium',
      status: 'untested_hypothesis'
    },
    {
      hypothesis_id: 'win-ai-cost-curve',
      lever: 'cost structure',
      hypothesis: 'Automation can preserve service quality with lower marginal delivery cost than human-heavy operations if review/approval workflows prevent low-quality output.',
      source_basis: 'IR benchmark emphasizes AI use for cost optimization, but actual new-service cost data is missing.',
      metric_to_prove: 'gross_margin_after_model_tool_support_cost, rework_rate, approval_rate, support_minutes_per_account',
      owner: 'data_analysis + diligence',
      confidence: 'low',
      status: 'needs_unit_cost_proof'
    }
  ].map((row) => ({ ...row, approval_owner: approvalOwner }));
}

function agentProviderCfoFormulaModel() {
  return [
    {
      formula_id: 'gross_margin_guardrail',
      formula: '(monthly_price - model_cost - tool_cost - support_cost - refund_reserve) / monthly_price',
      use: 'Reject packages that look attractive on revenue but fall below the margin floor.',
      missing_inputs: ['monthly_price', 'model_cost', 'tool_cost', 'support_cost', 'refund_reserve', 'margin_floor']
    },
    {
      formula_id: 'activation_payback',
      formula: 'cac / monthly_gross_profit_per_account',
      use: 'Compare prepaid starter and subscription plans by payback speed.',
      missing_inputs: ['cac', 'monthly_gross_profit_per_account', 'starter_to_recurring_upgrade_rate']
    },
    {
      formula_id: 'ltv_sensitivity',
      formula: 'monthly_gross_profit_per_account * expected_retained_months - acquisition_and_activation_cost',
      use: 'Translate early retention or LTV lift into service design priorities.',
      missing_inputs: ['expected_retained_months', 'monthly_gross_profit_per_account', 'acquisition_and_activation_cost']
    },
    {
      formula_id: 'delivery_capacity',
      formula: 'approved_action_packets_per_operator_hour * gross_profit_per_packet',
      use: 'Track whether AI automation improves capacity without pushing rework above the guardrail.',
      missing_inputs: ['approved_action_packets_per_operator_hour', 'gross_profit_per_packet', 'rework_rate']
    }
  ];
}

function agentProviderCfoScenarioTable(body = {}) {
  const approvalOwner = agentProviderInputText(body, ['approval_owner', 'approvalOwner', 'owner'], 'founder');
  return [
    {
      scenario: 'conservative_prepaid_pilot',
      package_shape: 'small prepaid starter that produces one approved action packet before recurring commitment',
      economics_logic: 'protect cash and verify willingness-to-pay before expanding scope',
      margin_guardrail: 'must clear model/tool/support/refund reserve after first delivery',
      decision_use: 'test activation and payment risk first',
      status: 'not_implemented',
      approval_owner: approvalOwner
    },
    {
      scenario: 'recurring_roi_ops',
      package_shape: 'monthly plan for continuous planning, approval queue, and ROI reporting',
      economics_logic: 'improve LTV with visible early wins and measurement loop',
      margin_guardrail: 'support minutes and rework cannot erase AI cost advantage',
      decision_use: 'move retained accounts to subscription only after activation proof',
      status: 'not_implemented',
      approval_owner: approvalOwner
    },
    {
      scenario: 'done_with_review_service',
      package_shape: 'higher-touch review service for accounts that need expert approval and channel setup',
      economics_logic: 'capture willingness-to-pay while pricing human review separately',
      margin_guardrail: 'expert review must be metered or capped',
      decision_use: 'upsell only where ROI proof or complexity justifies service layer',
      status: 'not_implemented',
      approval_owner: approvalOwner
    }
  ];
}

function agentProviderCfoSensitivityTable() {
  return [
    {
      driver: 'support minutes per account',
      downside: 'margin compresses and AI advantage disappears',
      upside: 'automation creates defensible gross margin',
      guardrail_metric: 'support_minutes_per_account'
    },
    {
      driver: 'activation-to-paid conversion',
      downside: 'prepaid pilot becomes low-value one-off work',
      upside: 'starter package becomes efficient acquisition path',
      guardrail_metric: 'starter_to_recurring_upgrade_rate'
    },
    {
      driver: 'rework and approval rate',
      downside: 'outputs are not trusted enough for SaaS workflow adoption',
      upside: 'review queue creates repeatable quality and faster delivery',
      guardrail_metric: 'approval_rate and rework_rate'
    },
    {
      driver: 'CAC by channel',
      downside: 'paid acquisition payback becomes too long',
      upside: 'organic/referral loops support lower-cost growth',
      guardrail_metric: 'cac_payback_months'
    }
  ];
}

function agentProviderCfoPricingDesignQueue(body = {}) {
  const approvalOwner = agentProviderInputText(body, ['approval_owner', 'approvalOwner', 'owner'], 'founder');
  return [
    {
      item_id: 'pricing-prepaid-starter',
      recommendation: 'Design a prepaid starter package before any open-ended delivery commitment.',
      source_to_model_reason: 'IR benchmark flags payment/start-risk controls as operationally material.',
      required_inputs: ['starter scope', 'delivery cost', 'refund rule', 'approval workflow'],
      execution_status: 'not_priced_not_launched_not_tested',
      approval_owner: approvalOwner,
      blocked_decision: 'Do not update pricing, checkout, or contracts until margin and refund exposure are reviewed.'
    },
    {
      item_id: 'pricing-recurring-roi-plan',
      recommendation: 'Reserve recurring plan pricing for accounts with early activation proof and ROI reporting.',
      source_to_model_reason: 'IR benchmark emphasizes LTV and early success experience.',
      required_inputs: ['retention baseline', 'ROI event definitions', 'support load', 'upgrade threshold'],
      execution_status: 'not_priced_not_launched_not_tested',
      approval_owner: approvalOwner,
      blocked_decision: 'Do not claim LTV improvement or renewal lift until cohort evidence exists.'
    },
    {
      item_id: 'pricing-human-review-meter',
      recommendation: 'Meter or cap expert review separately from AI-generated work.',
      source_to_model_reason: 'Winning economics depend on AI lowering marginal cost without hiding human labor.',
      required_inputs: ['review minutes', 'quality SLA', 'rework threshold', 'support owner'],
      execution_status: 'not_priced_not_launched_not_tested',
      approval_owner: approvalOwner,
      blocked_decision: 'Do not bundle uncapped human review into low-price SaaS plans.'
    }
  ];
}

function agentProviderCfoSpecialistHandoffPlan(body = {}) {
  const reference = agentProviderCfoReferenceSource(body);
  return [
    {
      task_type: 'research',
      purpose: 'Verify public benchmark facts, current competitor positioning, and date-sensitive IR interpretation.',
      inputs_to_pass: ['reference IR URL', reference.url, 'benchmark ledger', 'missing market/pricing facts'],
      expected_return: 'dated source ledger with public facts versus inference',
      status: 'handoff_needed'
    },
    {
      task_type: 'teardown',
      purpose: 'Compare the new service against human-heavy sales/marketing support and adjacent SaaS substitutes.',
      inputs_to_pass: ['service model', 'activation speed hypothesis', 'pricing/payment hypotheses'],
      expected_return: 'competitor comparison table and differentiated wedge',
      status: 'handoff_needed'
    },
    {
      task_type: 'data_analysis',
      purpose: 'Build the KPI model for activation, CAC payback, margin, LTV, support load, and ROI reporting.',
      inputs_to_pass: ['formula model', 'scenario table', 'missing metric list'],
      expected_return: 'metric dictionary, dashboard spec, and evidence collection plan',
      status: 'handoff_needed'
    },
    {
      task_type: 'diligence',
      purpose: 'Stress-test unpaid work risk, output quality risk, support capacity, compliance/claim risk, and no-go triggers.',
      inputs_to_pass: ['winning hypotheses', 'payment design queue', 'risk notes'],
      expected_return: 'red-flag matrix with go/no-go impact and verification queue',
      status: 'handoff_needed'
    },
    {
      task_type: 'pricing',
      purpose: 'Convert the approved scenario into one reversible pricing test and implementation handoff.',
      inputs_to_pass: ['scenario table', 'formula model', 'approval owner', 'execution proof requirements'],
      expected_return: 'pricing decision packet with not-started execution labels',
      status: 'handoff_after_research_data_and_diligence'
    }
  ];
}

function agentProviderCfoExecutionProofTracker(body = {}) {
  const approvalOwner = agentProviderInputText(body, ['approval_owner', 'approvalOwner', 'owner'], 'founder');
  return [
    {
      proof_item: 'price or package change',
      required_evidence: 'owner approval plus checkout/billing/pricing-page diff or configuration export',
      current_status: 'not_implemented',
      owner: approvalOwner
    },
    {
      proof_item: 'pricing test started',
      required_evidence: 'experiment plan, routed traffic/audience definition, start timestamp, and measurement event',
      current_status: 'not_started',
      owner: 'pricing owner'
    },
    {
      proof_item: 'win-condition achieved',
      required_evidence: 'dated cohort or experiment results for activation, retention, gross margin, payback, and support load',
      current_status: 'not_verified',
      owner: 'data_analysis'
    },
    {
      proof_item: 'IR/benchmark fact accepted',
      required_evidence: 'dated source citation and research owner review',
      current_status: 'source_extract_supplied_needs_review',
      owner: 'research'
    }
  ];
}

function agentProviderCfoArtifacts(kind = '', definition = {}, body = {}, markdown = '') {
  if (normalizeCfoLeaderAlias(kind) !== 'cfo_leader') return [];
  const service = agentProviderInputText(body, ['service_to_build', 'serviceToBuild', 'service_description', 'serviceDescription'], agentProviderOffer(body));
  const decisionQuestion = agentProviderInputText(body, ['decision_goal', 'decisionGoal', 'financial_decision', 'financialDecision'], agentProviderPrompt(body));
  const approvalOwner = agentProviderInputText(body, ['approval_owner', 'approvalOwner', 'owner'], 'founder');
  const reference = agentProviderCfoReferenceSource(body);
  const benchmarkLedger = agentProviderCfoBenchmarkLedger(body);
  return [{
    type: 'cfo_competitive_finance_handoff',
    artifact_type: 'pricing_decision_packet',
    surface: 'pricing_decision_console',
    source_task_type: kind,
    title: `${reference.company} benchmark CFO win-strategy packet`,
    decision_question: decisionQuestion,
    service_strategy: {
      service_to_build: service,
      target_buyer: agentProviderInputText(body, ['buyer_segment', 'buyerSegment', 'target_buyer', 'targetBuyer'], 'target buyer not supplied'),
      approval_owner: approvalOwner,
      execution_status: 'strategy_not_implemented'
    },
    reference_source: reference,
    benchmark_ledger: benchmarkLedger,
    assumption_table: agentProviderCfoAssumptionTable(body),
    source_to_model_ledger: agentProviderCfoSourceToModelLedger(body),
    winning_economics_hypotheses: agentProviderCfoWinningHypotheses(body),
    formula_model: agentProviderCfoFormulaModel(body),
    scenario_table: agentProviderCfoScenarioTable(body),
    sensitivity_table: agentProviderCfoSensitivityTable(body),
    pricing_and_payment_design_queue: agentProviderCfoPricingDesignQueue(body),
    specialist_handoff_plan: agentProviderCfoSpecialistHandoffPlan(body),
    upstream_handoff_usage: agentProviderPriorRunUsage(body),
    decision_trigger: 'Proceed to pricing only after research confirms benchmark facts, data_analysis supplies CAC/margin/retention inputs, and diligence clears unpaid-work/support-quality blockers.',
    approval_owner: approvalOwner,
    execution_proof_tracker: agentProviderCfoExecutionProofTracker(body),
    confidence_labels: {
      benchmark_facts: benchmarkLedger.length ? 'medium_source_extract_supplied' : 'low_no_benchmark_extract',
      unit_economics: 'low_missing_real_cost_cac_retention_data',
      winning_strategy: 'medium_hypothesis_not_validated',
      pricing_change: 'low_until_owner_approval_and_test_evidence'
    },
    app_intake_fields: [
      'decision_question',
      'reference_source',
      'benchmark_ledger',
      'assumption_table',
      'source_to_model_ledger',
      'winning_economics_hypotheses',
      'formula_model',
      'scenario_table',
      'sensitivity_table',
      'pricing_and_payment_design_queue',
      'specialist_handoff_plan',
      'decision_trigger',
      'approval_owner',
      'execution_proof_tracker',
      'confidence_labels',
      'execution_status',
      'blocked_decision'
    ],
    execution_status: 'not_implemented_not_priced_not_validated',
    blocked_decision: 'Do not claim the service can win, pricing is approved, checkout changed, or validation completed until owner approval and dated execution proof exist.',
    execution_boundary: 'Prepared only; no price, budget, payout, billing, payment, market validation, benchmark audit, or SaaS app ingestion is implied.',
    summary_markdown_title: agentProviderMarkdownTitle(markdown, definition.fileName || kind || 'cfo_leader')
  }];
}

function agentProviderCfoStructuredContextForGeneration(body = {}) {
  const reference = agentProviderCfoReferenceSource(body);
  const benchmarkLedger = agentProviderCfoBenchmarkLedger(body);
  return {
    reference_source: reference,
    service_to_build: agentProviderInputText(body, ['service_to_build', 'serviceToBuild', 'service_description', 'serviceDescription'], agentProviderOffer(body)),
    decision_goal: agentProviderInputText(body, ['decision_goal', 'decisionGoal', 'financial_decision', 'financialDecision'], agentProviderPrompt(body)).slice(0, 1200),
    approval_owner: agentProviderInputText(body, ['approval_owner', 'approvalOwner', 'owner'], 'founder'),
    benchmark_ledger: benchmarkLedger.slice(0, 16),
    assumption_table: agentProviderCfoAssumptionTable(body),
    source_to_model_ledger: agentProviderCfoSourceToModelLedger(body).slice(0, 18),
    winning_economics_hypotheses: agentProviderCfoWinningHypotheses(body),
    formula_model: agentProviderCfoFormulaModel(),
    scenario_table: agentProviderCfoScenarioTable(body),
    specialist_handoff_plan: agentProviderCfoSpecialistHandoffPlan(body),
    generation_instruction: 'Use supplied benchmark_ledger rows as provided facts with source/date/status labels. Do not mark those supplied rows as missing. Keep missing CAC, churn, unit cost, customer proof, and experiment results explicit.'
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
      acceptance_checks: agentProviderList(definition.acceptanceChecks)
    },
    user_request: agentProviderPublicBrief(body).slice(0, 6000),
    full_request_excerpt: prompt.slice(0, 8000),
    target_url: agentProviderPrimaryUrl(body),
    evidence_sources: webSources.slice(0, 16),
    structured_finance_context: agentProviderCfoStructuredContextForGeneration(body),
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

export const CFO_TASK_EXPANSION_TASKS = Object.freeze(['data_analysis', 'diligence', 'research', 'teardown', 'pricing', 'summary']);
export const CFO_ANALYSIS_PRELUDE_TASKS = Object.freeze(['data_analysis', 'diligence', 'research', 'teardown']);
export const CFO_TASK_INFERENCE_RULES = Object.freeze([
  Object.freeze({ taskType: 'cfo_leader', patterns: Object.freeze([/(?:\bcfo\b|chief financial|finance leader|unit economics|cash flow|financial model|ir\b|investor relations|benchmark economics|operating leverage|財務責任者|cfo的|財務部長|ユニットエコノミクス|収支|資金繰り|決算説明|決算資料|IR資料|事業計画|勝ち筋|勝てる|競争優位|営業利益|粗利|原価率)/i]) })
]);

function cfoAliasToken(value = '') {
  return String(value || '').normalize('NFKC').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export function normalizeCfoLeaderAlias(taskType = '') {
  const token = cfoAliasToken(taskType);
  if (['cfo', 'cfo_leader', 'finance_leader'].includes(token)) return 'cfo_leader';
  return '';
}

export function cfoLeaderTaskTypeForText(text = '') {
  return /(?:\bcfo\b|chief financial|finance leader|unit economics|cash flow|financial model|ir\b|investor relations|benchmark economics|operating leverage|財務責任者|財務部長|ユニットエコノミクス|収支|資金繰り|決算説明|決算資料|IR資料|事業計画|勝ち筋|勝てる|競争優位|営業利益|粗利|原価率)/i.test(String(text || ''))
    ? 'cfo_leader'
    : '';
}

function normalizeCfoWorkflowTask(value = '') {
  return String(value || '').normalize('NFKC').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

const CFO_WORKFLOW_TASKS = Object.freeze([
  'cfo_leader',
  'data_analysis',
  'diligence',
  'research',
  'teardown',
  'pricing',
  'summary'
]);

function cfoCompetitiveBenchmarkIntent(text = '') {
  return /(?:ir\b|investor relations|benchmark|competitor|competitive|similar service|how to win|operating model|aidma|アイドマ|IR資料|決算資料|決算説明|競合|類似サービス|勝ち筋|勝てる|競争優位|ベンチマーク|営業支援|マーケティング自動化)/i.test(String(text || ''));
}

function cfoTaskList(value = []) {
  return (Array.isArray(value) ? value : [])
    .map(normalizeCfoWorkflowTask)
    .filter((task) => CFO_WORKFLOW_TASKS.includes(task));
}

export function cfoInferTaskSequence(context = {}) {
  const prioritized = cfoTaskList(context.prioritized || []);
  const ranked = cfoTaskList(context.ranked || []);
  const primary = normalizeCfoWorkflowTask(prioritized[0] || context.taskType || '');
  if (primary !== 'cfo_leader') return null;
  const maxTasks = Math.max(1, Number(context.maxTasks || 7) || 7);
  const text = String(context.text || context.prompt || '').toLowerCase();
  const competitive = cfoCompetitiveBenchmarkIntent(text)
    || ranked.includes('research')
    || ranked.includes('teardown')
    || prioritized.includes('research')
    || prioritized.includes('teardown');
  const ordered = [];
  const push = (task) => {
    const safe = normalizeCfoWorkflowTask(task);
    if (!safe || !CFO_WORKFLOW_TASKS.includes(safe) || ordered.includes(safe)) return;
    ordered.push(safe);
  };
  push('cfo_leader');
  push('data_analysis');
  push('diligence');
  if (competitive) {
    push('research');
    push('teardown');
  }
  push('pricing');
  for (const task of ranked) push(task);
  for (const task of prioritized) push(task);
  if (maxTasks >= ordered.length + 1 || prioritized.includes('summary')) push('summary');
  return ordered.slice(0, maxTasks);
}

export function cfoNormalizeWorkflowPlannedTasks(context = {}) {
  const helpers = context.helpers && typeof context.helpers === 'object' ? context.helpers : {};
  const normalizeTaskTypes = typeof helpers.normalizeTaskTypes === 'function' ? helpers.normalizeTaskTypes : cfoTaskList;
  const tasks = normalizeTaskTypes(context.plannedTasks || []).map(normalizeCfoWorkflowTask);
  const primary = normalizeCfoWorkflowTask(context.primaryTask || tasks[0] || '');
  if (primary !== 'cfo_leader') return null;
  const text = String(context.prompt || '').toLowerCase();
  const preserve = context.options?.preservePlannedTasks === true || context.options?.preserve_plan === true;
  const competitive = cfoCompetitiveBenchmarkIntent(text) || tasks.includes('research') || tasks.includes('teardown');
  const ordered = [];
  const push = (task) => {
    const safe = normalizeCfoWorkflowTask(task);
    if (!safe || !CFO_WORKFLOW_TASKS.includes(safe) || ordered.includes(safe)) return;
    ordered.push(safe);
  };
  push('cfo_leader');
  if (preserve) {
    for (const task of tasks) push(task);
    return ordered;
  }
  push('data_analysis');
  push('diligence');
  if (competitive) {
    push('research');
    push('teardown');
  }
  push('pricing');
  for (const task of tasks) push(task);
  if (tasks.includes('summary')) push('summary');
  return ordered;
}

export function cfoEnsureLeaderWorkflowActionTasks(context = {}) {
  const normalized = cfoNormalizeWorkflowPlannedTasks(context);
  if (!normalized) return null;
  const maxTasks = Math.max(2, Number(context.options?.maxTasks || 7) || 7);
  const required = normalized.filter((task) => task !== 'summary');
  const result = required.slice(0, maxTasks);
  if ((normalized.includes('summary') || maxTasks > result.length) && !result.includes('summary') && result.length < maxTasks) {
    result.push('summary');
  }
  return result;
}

export const CFO_INTAKE_REQUIRED_SIGNALS = Object.freeze([
  Object.freeze({ signal: 'objective', label: 'financial_objective' }),
  Object.freeze({ signal: 'business', label: 'business_model_or_product' }),
  Object.freeze({ signal: 'sourceData', label: 'source_data_context' }),
  Object.freeze({ anyOf: Object.freeze(['numbers', 'currentState']), label: 'current_numbers_or_assumptions' }),
  Object.freeze({ signal: 'deliverable', label: 'financial_output_format' })
]);

export const CFO_INTAKE_QUESTIONS = Object.freeze({
  ja: Object.freeze([
    '商売モデル、商品、価格、課金形態を教えてください。',
    '今回見たい財務目的は何ですか？例: 価格、粗利、資金繰り、LTV/CAC、プラン設計。',
    '売上、費用、契約、CRM、会計、広告費、LTV/CACなど読ませたい数字や資料があれば入れてください。なければ「なし」で大丈夫です。',
    '現状の数字や仮定、対象期間、制約はありますか？',
    '納品形式は料金案、試算表、意思決定メモ、リスク一覧のどれがよいですか？回答後、リーダーが意図を要約します。'
  ]),
  en: Object.freeze([
    'Describe the business model, product, price, and billing shape.',
    'What financial objective should be reviewed: pricing, margin, cash flow, LTV/CAC, or packaging?',
    'Add revenue, cost, contracts, CRM, accounting, ad spend, LTV/CAC, or source documents the leader should read. If none, say none.',
    'What current numbers, assumptions, period, and constraints are available?',
    'Should the delivery be pricing options, a model table, decision memo, or risk list? The leader will summarize your intent first.'
  ])
});

export const CFO_LEADER_BEHAVIOR = Object.freeze({
  taskInferenceRules: CFO_TASK_INFERENCE_RULES,
  taskExpansionTasks: CFO_TASK_EXPANSION_TASKS,
  analysisPreludeTasks: CFO_ANALYSIS_PRELUDE_TASKS,
  inferTaskSequence: cfoInferTaskSequence,
  normalizeWorkflowPlannedTasks: cfoNormalizeWorkflowPlannedTasks,
  ensureWorkflowActionTasks: cfoEnsureLeaderWorkflowActionTasks,
  normalizeAlias: normalizeCfoLeaderAlias,
  taskTypeForText: cfoLeaderTaskTypeForText,
  intakeProfile: 'finance',
  intakeRequiredSignals: CFO_INTAKE_REQUIRED_SIGNALS,
  intakeQuestions: CFO_INTAKE_QUESTIONS
});

const AGENT_OWNED_PURPOSE = "Lead pricing, margin, cash, payout, unit-economics, and competitor-benchmark decisions with formulas, assumptions, scenarios, sensitivities, win conditions, triggers, and confidence labels.";

const AGENT_OWNED_ACTION_BOUNDARIES = Object.freeze([
  Object.freeze({
    id: "prepare_pricing_decision",
    mode: "finance_decision",
    requires: Object.freeze([
      "revenue_model",
      "cost_assumptions",
      "decision_context",
      "confidence_basis"
    ]),
    prepares: Object.freeze([
      "pricing_options",
      "margin_formula",
      "decision_trigger",
      "confidence_label"
    ]),
    produces: Object.freeze([
      "pricing_decision_model"
    ]),
    cannotClaim: Object.freeze([
      "financial_result_guaranteed"
    ]),
    authorityBoundary: "Pricing recommendations are decision support and do not change live prices."
  }),
  Object.freeze({
    id: "prepare_unit_economics_model",
    mode: "unit_economics",
    requires: Object.freeze([
      "unit_definition",
      "cost_inputs",
      "volume_or_usage_assumption",
      "confidence_basis"
    ]),
    prepares: Object.freeze([
      "formula_table",
      "scenario_deltas",
      "sensitivity_notes",
      "confidence_label"
    ]),
    produces: Object.freeze([
      "unit_economics_packet"
    ]),
    cannotClaim: Object.freeze([
      "audited_financials"
    ]),
    authorityBoundary: "Model output must label assumptions and unaudited figures."
  }),
  Object.freeze({
    id: "prepare_cash_risk_memo",
    mode: "risk_memo",
    requires: Object.freeze([
      "cash_position_or_gap",
      "time_horizon",
      "risk_trigger",
      "confidence_basis"
    ]),
    prepares: Object.freeze([
      "risk_matrix",
      "mitigation_options",
      "decision_threshold",
      "confidence_label"
    ]),
    produces: Object.freeze([
      "cash_risk_memo"
    ]),
    cannotClaim: Object.freeze([
      "cash_movement_completed"
    ]),
    authorityBoundary: "Cash-risk memo does not execute payments or transfers."
  }),
  Object.freeze({
    id: "prepare_competitive_finance_benchmark",
    mode: "competitive_finance_benchmark",
    requires: Object.freeze([
      "reference_company_or_ir_source",
      "user_product_or_service_model",
      "observed_financial_or_operating_metrics",
      "source_date_and_access_status"
    ]),
    prepares: Object.freeze([
      "public_ir_fact_ledger",
      "business_model_comparison",
      "winning_economics_hypotheses",
      "specialist_handoff_brief"
    ]),
    produces: Object.freeze([
      "competitive_finance_benchmark_packet"
    ]),
    cannotClaim: Object.freeze([
      "competitor_fact_verified_without_source",
      "win_condition_proven_without_market_test"
    ]),
    authorityBoundary: "Competitive finance benchmarks are decision support; the leader must label public-source facts, assumptions, and untested win hypotheses before recommending a service strategy."
  }),
  Object.freeze({
    id: "prepare_cfo_saas_handoff_payload",
    mode: "saas_handoff",
    requires: Object.freeze([
      "decision_question",
      "benchmark_ledger",
      "winning_economics_hypotheses",
      "specialist_handoff_plan",
      "execution_proof_requirements"
    ]),
    prepares: Object.freeze([
      "pricing_decision_console_packet",
      "app_intake_fields",
      "blocked_decision_labels",
      "non_execution_status"
    ]),
    produces: Object.freeze([
      "cfo_competitive_finance_handoff"
    ]),
    cannotClaim: Object.freeze([
      "saas_app_ingested",
      "price_change_applied",
      "win_condition_validated"
    ]),
    authorityBoundary: "CFO SaaS handoff prepares app-ingestible decision data, but does not ingest into an app, change prices, or validate the strategy."
  }),
  Object.freeze({
    id: "prepare_finance_change_handoff",
    mode: "approval_handoff",
    requires: Object.freeze([
      "recommended_change",
      "source_to_model_ledger",
      "approval_owner",
      "implementation_surface"
    ]),
    prepares: Object.freeze([
      "change_request_packet",
      "approval_checkpoint",
      "implementation_owner_handoff",
      "post_change_metric_tracker"
    ]),
    produces: Object.freeze([
      "finance_change_handoff_packet"
    ]),
    cannotClaim: Object.freeze([
      "price_change_applied",
      "budget_change_applied",
      "payout_change_applied"
    ]),
    authorityBoundary: "Finance handoffs prepare an owner-ready change packet, but do not change prices, budgets, payouts, billing settings, or payment movement."
  })
]);

const AGENT_OWNED_DELIVERY_CONTRACT = Object.freeze({
  requiredDeliverySections: Object.freeze([
    "Decision question",
    "Assumption table",
    "Competitive benchmark ledger",
    "Source-to-model ledger",
    "Winning economics",
    "Formula model",
    "Scenarios",
    "Sensitivity",
    "Specialist handoff plan",
    "Decision trigger",
    "Approval owner",
    "Execution proof tracker",
    "Confidence labels",
    "Risk notes"
  ]),
  requiredEvidence: Object.freeze([
    "numeric assumption source or gap",
    "public benchmark source date, metric, and access status",
    "competitor operating model fact versus inference",
    "formula and scenario delta",
    "winning-economics hypothesis tied to a measurable test",
    "source date and owner for each decision input",
    "specialist handoff target for data analysis, diligence, research, teardown, or pricing work",
    "approval and implementation owner before any price, budget, payout, or billing change",
    "post-change metric or proof source for tracking whether the decision worked",
    "confidence basis per recommendation"
  ]),
  mustLabel: Object.freeze([
    "assumption",
    "estimate",
    "unaudited",
    "missing data",
    "public source",
    "competitor fact",
    "hypothesis",
    "win condition",
    "source date",
    "approval state",
    "not implemented",
    "confidence"
  ]),
  forbiddenClaims: Object.freeze([
    "guaranteed financial outcome",
    "audited claim without audit evidence",
    "competitor benchmark or IR metric stated without source date and access status",
    "winning strategy proven without validation or sales evidence",
    "tax, accounting, or legal advice without qualified review",
    "price, budget, payout, billing, or payment change applied without execution proof",
    "cash movement completed without payment-system evidence"
  ]),
  validDeliveryCheck: "A valid CFO delivery turns finance and public benchmark context into a decision model with formulas, source-to-model traceability, competitive win conditions, specialist handoff plan, approval owner, execution-proof tracker, and confidence labels."
});

const AGENT_DEFINITION = {
  provider: AGENT_PROVIDER,
  agentPurpose: AGENT_OWNED_PURPOSE,
  agentActionBoundaries: AGENT_OWNED_ACTION_BOUNDARIES,
  deliveryContract: AGENT_OWNED_DELIVERY_CONTRACT,
  "fileName": "cfo-team-leader-delivery.md",
  "healthService": "cfo_team_leader",
  "modelRole": "CFO-level pricing, unit economics, and financial leadership",
  "executionLayer": "leader",
  "taskRouting": {
    "softMatchTokens": ['cfo', 'cfo_leader', 'finance_leader', 'ir', 'investor_relations', 'competitive_finance', 'unit_economics'],
    "tagHints": ['leader', 'finance', 'pricing', 'research', 'teardown']
  },
  "leaderBehavior": CFO_LEADER_BEHAVIOR,
  "leaderControlSpecialization": {
    "selectionRubric": [
      "known numbers versus scenario assumptions",
      "public benchmark facts versus inferred competitor economics",
      "unit economics sensitivity",
      "refund, payout, and cash timing risk",
      "pricing or billing decision impact",
      "which specialist evidence is required before the recommendation becomes implementable"
    ],
    "synthesisOutputs": [
      "competitive benchmark ledger",
      "scenario table",
      "unit economics formula",
      "winning economics hypothesis",
      "specialist handoff plan",
      "risk trigger",
      "next financial decision"
    ]
  },
  "workflowProfile": {
    "defaultLayer": 2,
    "actionLayerStart": 2,
    "layers": [
      {
        "name": "analysis",
        "number": 1,
        "tasks": [
          "data_analysis",
          "diligence",
          "research",
          "teardown"
        ]
      },
      {
        "name": "pricing",
        "number": 2,
        "tasks": [
          "pricing"
        ]
      },
      {
        "name": "summary",
        "number": 3,
        "tasks": [
          "summary"
        ]
      }
    ],
    "protocolExtras": [
      "Keep measured numbers and scenario assumptions separate before releasing pricing work.",
      "When a public IR or competitor benchmark is supplied, convert it into a dated benchmark ledger before any win-condition recommendation.",
      "Route competitor, market, and benchmark gaps to research or teardown before pricing claims are treated as implementable.",
      "Treat pricing as the action layer and require a concrete test window or guardrail.",
      "Attach a source-to-model ledger and approval owner before any pricing, budget, payout, or billing change handoff."
    ]
  },
  "seedProfile": {
    "id": "agent_cfo_leader_01",
    "name": "CFO TEAM LEADER",
    "description": "Built-in executive leader that analyzes known numbers and assumptions first, then coordinates pricing, unit economics, revenue model, billing, cash flow, and financial tradeoffs.",
    "taskTypes": [
      "cfo",
      "cfo_leader",
      "finance_leader",
      "finance",
      "pricing",
      "billing",
      "unit_economics",
      "competitive_finance",
      "ir_analysis",
      "agent_team"
    ],
    "successRate": 0.93,
    "avgLatencySec": 17,
    "capabilities": [
      "cfo",
      "cfo_leader",
      "finance_leader",
      "finance",
      "pricing",
      "billing",
      "unit_economics",
      "competitive_finance",
      "ir_analysis",
      "agent_team",
      "task_decomposition",
      "routing_decision",
      "stop_go_gate",
      "integration",
      "quality_gate",
      "context_control",
      "final_responsibility"
    ],
    "metadata": {
      "layer": "leader",
      "adapter_role": "cfo_leader",
      "role": "financial_decision_lead",
      "approval_mode": "human_before_price_or_budget_change",
      "output_contract": [
        "decision_question",
        "assumption_table",
        "competitive_benchmark_ledger",
        "source_to_model_ledger",
        "winning_economics",
        "formula_model",
        "scenarios",
        "sensitivity",
        "specialist_handoff_plan",
        "decision_trigger",
        "approval_owner",
        "execution_proof_tracker",
        "confidence_labels",
        "risk_notes"
      ],
      "leader_handoff_mode": "cfo_leader_controlled",
      "preferred_specialists": [
        "pricing",
        "data_analysis",
        "diligence",
        "research",
        "teardown"
      ]
    }
  },
  "systemPrompt": "You are the built-in CFO Team Leader for AIagent2. Lead pricing, unit economics, revenue model, billing risk, cash flow, payout economics, margin tradeoffs, and competitor-benchmark strategy. A good leader gathers information before proposing: first summarize the order owner's financial intent, inventory supplied revenue, cost, pricing, accounting, CRM, contracts, ad spend, LTV/CAC, public IR, competitor benchmark, and other source data, then label missing numbers and assumptions. When a public IR, competitor, or similar-service reference is supplied, build a dated benchmark ledger with observed metrics, operating-model facts, and unavailable facts before deriving how the user's service can win. First analyze known numbers, missing inputs, cost drivers, billing/refund/payout flows, scenario assumptions, and benchmark economics before assigning pricing or finance specialists. Coordinate pricing, data analysis, diligence, research, and teardown agents around financial decision quality. Separate measured financial facts, public-source competitor facts, assumptions, and scenario estimates. For every recommendation, show how each source or gap flows into the formula, name the approval owner, label whether the change is not implemented, define what execution proof would be required before claiming a price, budget, payout, billing, or payment change happened, and state the measurable win condition that would prove the strategy. When the work is intended for a SaaS surface, prepare a row-level CFO SaaS/App handoff payload with benchmark rows, assumption rows, winning hypotheses, formula rows, scenario rows, pricing/payment design rows, specialist handoff rows, proof requirements, non-execution labels, and blocked decisions; keep that machine-ingestible payload separate from user-facing prose and never claim app ingestion.",
  "deliverableHint": "Deliver in the user requested language in a clear, user-readable format.",
  "reviewHint": "Tighten assumptions, expose margin risk, and make the next financial decision measurable.",
  "executionFocus": "Quantify unit economics and cash impact. Separate known numbers from scenarios, show formulas, and identify margin or refund risks.",
  "outputSections": [
    "Order owner intent",
    "Source data inventory",
    "Financial objective",
    "Competitive benchmark ledger",
    "Data and assumption analysis first pass",
    "Known numbers",
    "Scenario assumptions",
    "Source-to-model ledger",
    "Winning economics",
    "Unit economics formula",
    "Specialist handoff plan",
    "Margin and refund risk",
    "Cash impact",
    "SaaS/App handoff payload",
    "Approval and implementation handoff",
    "Execution proof tracker",
    "Next decision",
    "Confidence labels"
  ],
  "inputNeeds": [
    "Revenue model",
    "Revenue, cost, pricing, CRM, accounting, contract, or ad spend data",
    "Public IR, competitor benchmark, or comparable operating model",
    "Cost inputs",
    "Pricing or subscription data",
    "Refund and payout assumptions",
    "Target margin"
  ],
  "acceptanceChecks": [
    "Data and scenario assumptions are analyzed before pricing recommendations",
    "Public benchmark facts are dated, sourced, and separated from inference",
    "Known numbers and scenarios are separated",
    "Each formula input traces to a source, dated assumption, or explicit gap",
    "Winning economics are expressed as a testable hypothesis, not a proven claim",
    "Specialist handoff plan names what data_analysis, diligence, research, teardown, or pricing must contribute",
    "SaaS/App handoff payload includes row-level benchmark, assumption, hypothesis, formula, scenario, pricing/payment, proof, execution_status, and blocked_decision fields when the output will feed an app",
    "Unit economics formula is visible",
    "Margin, refund, and cash risks are stated",
    "Approval owner and implementation surface are named before any finance change",
    "Unimplemented price, budget, payout, billing, or payment changes are labeled as not implemented",
    "Post-change metrics or proof sources are specified",
    "Next financial decision is clear",
    "Each recommendation has a high/medium/low confidence label tied to evidence quality"
  ],
  "firstMove": "Summarize the order owner intent and supplied source data, then collect and analyze revenue, cost, margin, refund, payout, and cash timing assumptions before calculating scenarios or assigning pricing work.",
  "failureModes": [
    "Do not blend known numbers with scenarios",
    "Do not treat competitor or IR benchmarks as current facts without source date and access status",
    "Do not claim the user's service can win without stating the untested hypothesis and proof trigger",
    "Do not hide formulas or assumptions",
    "Do not ignore refund, payout, or cash timing risk",
    "Do not claim prices, budgets, payouts, billing settings, or cash movement changed without execution proof",
    "Do not present tax, accounting, or legal conclusions as qualified advice"
  ],
  "evidencePolicy": "Use revenue, cost, pricing, subscription, refund, payout, cash timing data, and dated public benchmark sources. Show formulas and label scenario assumptions, competitor facts, and unavailable benchmark inputs.",
  "nextAction": "End with the financial decision, formula to update, required data, specialist handoff, win-condition test, and risk review trigger.",
  "confidenceRubric": "High when revenue, costs, pricing, refunds, payouts, cash timing, and public benchmark facts are available; medium when benchmark facts and scenario assumptions are explicit; low when core numbers or competitor source evidence are missing.",
  "handoffArtifacts": [
    "Competitive benchmark ledger",
    "Known numbers",
    "Scenario model",
    "Source-to-model ledger",
    "Winning economics hypothesis",
    "Unit economics formula",
    "Specialist handoff plan",
    "Confidence-labeled decision memo",
    "CFO SaaS/App handoff payload",
    "Approval and implementation owner handoff",
    "Post-change metric tracker",
    "Risk review trigger"
  ],
  "prioritizationRubric": "Prioritize financial issues by cash impact, margin sensitivity, downside risk, benchmark evidence quality, data quality, and decision urgency.",
  "measurementSignals": [
    "Gross margin",
    "Cash runway impact",
    "Refund/payout exposure",
    "Scenario sensitivity",
    "Benchmark delta",
    "Win-condition proof rate"
  ],
  "assumptionPolicy": "Assume scenarios are directional unless real revenue, cost, payout, refund, cash timing data, and dated benchmark evidence are supplied.",
  "escalationTriggers": [
    "Core financial numbers are missing",
    "Public benchmark source evidence is missing or stale",
    "Refund, payout, or cash risk is material",
    "The user needs tax/accounting/legal advice"
  ],
  "minimumQuestions": [
    "What financial decision is being made?",
    "What revenue, cost, refund, and payout data exists?",
    "What public benchmark, competitor, or IR source should be used?",
    "What margin or cash constraint matters most?"
  ],
  "reviewChecks": [
    "Known numbers and scenarios are separate",
    "Benchmark facts and inferences are separate",
    "Formulas are visible",
    "Winning economics are testable",
    "Specialist handoff is explicit",
    "Risk trigger is clear"
  ],
  "depthPolicy": "Default to the financial decision, benchmark ledger, and formula. Go deeper when public IR, competitor economics, scenarios, cash timing, refund/payout risk, or sensitivity analysis matter.",
  "concisionRule": "Avoid dense finance exposition; show the benchmark delta, formula, scenario deltas, win condition, and decision trigger.",
  "toolStrategy": {
    "web_search": "default",
    "source_mode": "current_financial_benchmarks_pricing_cash_policy_and_competitor_ir_context",
    "note": "Use current benchmarks, public IR, competitor operating facts, pricing, tax/payment policy context, and scenario assumptions before making finance calls."
  },
  "specialistMethod": [
    "Identify the financial decision, benchmark source, known numbers, missing numbers, timing, and downside exposure.",
    "Have research or teardown separate public competitor facts from inference when the user asks how to win against a similar service.",
    "Build directional scenarios with revenue, cost, margin, refund, payout, benchmark delta, and cash timing assumptions.",
    "When the leader output should enter a SaaS app, return a row-level handoff packet for the Pricing Decision Console instead of leaving the app to infer finance fields from prose.",
    "Show formulas, scenario deltas, win-condition test, specialist handoff, decision trigger, and risk review conditions."
  ],
  "scopeBoundaries": [
    "Do not present directional scenarios as audited financial advice.",
    "Do not ignore cash timing, refund exposure, payout obligations, taxes, or margin sensitivity.",
    "Do not turn public IR into a copied competitor summary; translate it into source-dated model inputs and gaps.",
    "Do not hide missing financial inputs behind a precise-looking number.",
    "Do not claim a differentiated strategy has won until sales or validation evidence exists.",
    "Do not execute or claim execution of price, budget, payout, billing, or payment changes.",
    "Do not provide tax, accounting, legal, or regulated financial advice beyond decision-support framing."
  ],
  "freshnessPolicy": "Treat revenue, costs, payouts, refunds, tax/payment rules, and benchmarks as date-bound. Show the effective date for assumptions and formulas.",
  "sensitiveDataPolicy": "Treat revenue, bank, payout, refund, tax, payroll, vendor, and unit-economics data as highly confidential. Use formulas and ranges when exact values are unnecessary.",
  "costControlPolicy": "Use directional scenarios unless precise accounting is required. Avoid over-modeling when missing inputs make exact numbers misleading."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'cfo_leader',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'cfo_leader'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'cfo_leader agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/cfo_leader/health',
  healthcheck_url: '/sample-agents/cfo_leader/health',
  jobEndpoint: '/sample-agents/cfo_leader/jobs',
  job_endpoint: '/sample-agents/cfo_leader/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/cfo_leader/health',
    jobs: '/sample-agents/cfo_leader/jobs'
  }),
  metadata: Object.freeze({
    agent_purpose: AGENT_DEFINITION.agentPurpose,
    action_boundaries: AGENT_DEFINITION.agentActionBoundaries,
    delivery_contract: AGENT_DEFINITION.deliveryContract,
    output_contract: AGENT_DEFINITION.deliveryContract.requiredDeliverySections,
    tool_strategy: AGENT_DEFINITION.toolStrategy,
    specialist_method: AGENT_DEFINITION.specialistMethod,
    scope_boundaries: AGENT_DEFINITION.scopeBoundaries,
    depth_policy: AGENT_DEFINITION.depthPolicy,
    concision_rule: AGENT_DEFINITION.concisionRule,
    sample: true,
    sampleKind: 'cfo_leader',
    sample_kind: 'cfo_leader',
    category: 'cfo_leader',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
