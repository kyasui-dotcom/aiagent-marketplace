function adsText(value = '', fallback = '') {
  const safe = String(value ?? '').trim();
  return safe || fallback;
}

function adsValueText(value = '', fallback = '', depth = 0) {
  if (value == null || depth > 5) return fallback;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return adsText(value, fallback);
  if (Array.isArray(value)) {
    const text = value.map((item) => adsValueText(item, '', depth + 1)).filter(Boolean).join('\n\n').trim();
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
      value.output_text
    ].map((item) => adsValueText(item, '', depth + 1)).filter(Boolean).join('\n\n').trim();
    return preferredText || fallback;
  }
  return fallback;
}

function adsList(value = []) {
  return Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : [];
}

function adsObject(value = {}) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function adsPrompt(body = {}) {
  return adsText(body.prompt || body.full_prompt || body.input?.prompt || body.input?.order_prompt, 'No prompt provided.');
}

function adsJapanese(text = '') {
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(String(text || ''));
}

function adsContext(body = {}) {
  const input = adsObject(body.input);
  const campaign = adsObject(body.campaign || input.campaign || input._broker?.campaign);
  const ads = adsObject(campaign.ads || body.ads || input.ads);
  const prompt = adsPrompt(body);
  return {
    prompt,
    objective: adsText(campaign.objective || ads.objective || prompt),
    audience: adsText(campaign.audience || ads.audience || input.audience),
    provider: adsText(ads.provider || body.provider || input.provider, 'google_ads'),
    budgetCap: Number(ads.budgetCap ?? ads.budget_cap ?? body.budgetCap ?? 0) || 0,
    targetCpa: Number(ads.targetCpa ?? ads.target_cpa ?? body.targetCpa ?? 0) || 0,
    targetUrl: adsText(campaign.targetUrl || campaign.target_url || ads.targetUrl || ads.target_url || input.target_url),
    stopRules: adsList(ads.stopRules || ads.stop_rules)
  };
}

function adsJsonFromText(text = '') {
  const raw = adsText(text);
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  for (const candidate of [raw, start >= 0 && end > start ? raw.slice(start, end + 1) : '']) {
    if (!candidate) continue;
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {}
  }
  return null;
}

function adsOpenAiText(payload = {}) {
  if (typeof payload === 'string') return payload;
  const direct = [
    payload.output_text,
    typeof payload.text === 'string' ? payload.text : '',
    payload.content
  ].map((item) => adsValueText(item)).find(Boolean);
  if (direct) return direct;
  return (Array.isArray(payload.output) ? payload.output : []).flatMap((item) => Array.isArray(item?.content) ? item.content : [])
    .map((part) => adsValueText(part?.text || part?.value || part?.content))
    .filter(Boolean)
    .join('\n');
}

async function adsOpenAiDelivery(kind = '', definition = {}, body = {}, source = {}, context = {}) {
  const apiKey = adsText(source.OPENAI_API_KEY || source.BUILTIN_OPENAI_API_KEY);
  if (!apiKey || typeof fetch !== 'function') return null;
  const baseUrl = adsText(source.OPENAI_BASE_URL || source.BUILTIN_OPENAI_BASE_URL, 'https://api.openai.com/v1').replace(/\/+$/, '');
  const packet = {
    requested_language: body.output_language || body.outputLanguage || 'Infer from user request.',
    agent: {
      kind,
      name: definition.seedProfile?.name || 'Ads Planner Agent',
      role: definition.modelRole || 'ads planning',
      purpose: definition.agentPurpose || '',
      action_boundaries: Array.isArray(definition.agentActionBoundaries) ? definition.agentActionBoundaries : [],
      delivery_contract: definition.deliveryContract || {}
    },
    user_request: adsPrompt(body),
    target_url: context.targetUrl || '',
    ads: context,
    delivery_quality_gate: {
      required_sections: adsList(definition.deliveryContract?.requiredDeliverySections),
      required_evidence: adsList(definition.deliveryContract?.requiredEvidence),
      must_label: adsList(definition.deliveryContract?.mustLabel),
      forbidden_claims: adsList(definition.deliveryContract?.forbiddenClaims),
      valid_delivery_check: adsText(definition.deliveryContract?.validDeliveryCheck)
    },
    instruction: 'Return JSON with summary, report_summary, bullets, next_action, file_markdown, content_type, and artifacts. Respect delivery_quality_gate: include required sections when relevant, label missing evidence/status, and avoid forbidden claims. Describe approval boundaries in the markdown only; the Ads SaaS or responsible execution agent must create its own authority request before external action.'
  };
  const response = await fetch(`${baseUrl}/responses`, {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: adsText(source.OPENAI_MODEL || source.BUILTIN_OPENAI_MODEL, 'gpt-5.4-nano'),
      input: [
        { role: 'system', content: [{ type: 'input_text', text: definition.systemPrompt || '' }] },
        { role: 'user', content: [{ type: 'input_text', text: JSON.stringify(packet) }] }
      ]
    })
  });
  if (!response?.ok) return null;
  const generated = adsJsonFromText(adsOpenAiText(await response.json().catch(() => null) || {}));
  if (!generated?.file_markdown && !generated?.fileMarkdown) return null;
  return {
    summary: adsText(generated.summary, 'Ads plan prepared.'),
    reportSummary: adsText(generated.report_summary || generated.reportSummary, generated.summary || 'Ads plan prepared.'),
    bullets: adsList(generated.bullets),
    nextAction: adsText(generated.next_action || generated.nextAction),
    fileMarkdown: adsValueText(generated.file_markdown || generated.fileMarkdown),
    contentType: adsText(generated.content_type || generated.contentType, 'ads_plan'),
    artifacts: Array.isArray(generated.artifacts) ? generated.artifacts.filter((item) => item && typeof item === 'object') : []
  };
}

function adsFallbackMarkdown(context = {}, japanese = false) {
  const stopRules = context.stopRules.length ? context.stopRules.map((rule) => `- ${rule}`).join('\n') : '- Stop if spend, CPA, or compliance risk exceeds the approved cap.';
  if (japanese) {
    return [
      '# Ads plan',
      '',
      `目的: ${context.objective}`,
      `媒体: ${context.provider}`,
      context.audience ? `対象: ${context.audience}` : '対象: 未指定。',
      context.targetUrl ? `URL: ${context.targetUrl}` : 'URL: 未指定。',
      `予算上限: ${context.budgetCap || '未承認'}`,
      `目標CPA: ${context.targetCpa || '未設定'}`,
      '',
      '## 停止ルール',
      stopRules,
      '',
      '## 境界',
      '- 広告費を使う前にSaaS接続、予算、停止条件、承認が必要。',
      '- 実際の広告作成/入札/配信はAds SaaSと明示承認を通す。'
    ].join('\n');
  }
  return [
    '# Ads plan',
    '',
    `Objective: ${context.objective}`,
    `Provider: ${context.provider}`,
    context.audience ? `Audience: ${context.audience}` : 'Audience: not specified.',
    context.targetUrl ? `URL: ${context.targetUrl}` : 'URL: not specified.',
    `Budget cap: ${context.budgetCap || 'not approved'}`,
    `Target CPA: ${context.targetCpa || 'not set'}`,
    '',
    '## Stop rules',
    stopRules,
    '',
    '## Boundaries',
    '- SaaS connection, budget, stop rules, and approval are required before spend.',
    '- Actual ad creation, bidding, or delivery must go through Ads SaaS and explicit approval.'
  ].join('\n');
}

const ADS_PLANNER_AGENT_PURPOSE = 'Prepare paid acquisition plans, budget guardrails, stop rules, and Ads SaaS handoff without launching, bidding, spending, pausing, or editing ads.';

const ADS_PLANNER_AGENT_ACTION_BOUNDARIES = Object.freeze([
  Object.freeze({
    id: 'prepare_ads_plan',
    mode: 'planning_only',
    requires: Object.freeze(['campaign_objective', 'audience', 'provider_or_provider_gap', 'budget_status']),
    prepares: Object.freeze(['campaign_structure', 'budget_guardrails', 'target_cpa_assumptions', 'stop_rules']),
    produces: Object.freeze(['ads_plan_packet']),
    cannotClaim: Object.freeze(['ads_launched', 'budget_spent', 'bids_changed']),
    authorityBoundary: 'Any spend or Ads SaaS write requires Ads SaaS authority, approved budget, exact assets, and launch confirmation.'
  }),
  Object.freeze({
    id: 'prepare_ads_saas_handoff',
    mode: 'handoff_only',
    requires: Object.freeze(['approved_plan', 'provider', 'budget_cap', 'stop_rules']),
    prepares: Object.freeze(['ads_saas_fields', 'approval_checklist']),
    produces: Object.freeze(['ads_saas_handoff_packet']),
    cannotClaim: Object.freeze(['campaign_created', 'campaign_submitted']),
    authorityBoundary: 'The handoff is not an execution receipt.'
  })
]);

const ADS_PLANNER_DELIVERY_CONTRACT = Object.freeze({
  requiredDeliverySections: Object.freeze(['Objective', 'Audience', 'Provider', 'Campaign structure', 'Budget cap and CPA assumption', 'Stop rules', 'Ads SaaS handoff', 'Measurement plan']),
  requiredEvidence: Object.freeze(['target URL or missing URL label', 'budget approval status']),
  mustLabel: Object.freeze(['unapproved budget', 'missing provider', 'connector gap']),
  forbiddenClaims: Object.freeze(['created ads', 'launched ads', 'spent budget', 'changed bids']),
  validDeliveryCheck: 'A valid ads delivery is approval-gated and cannot read as an executed campaign.'
});

const AGENT_PROVIDER = Object.freeze({
  health({ kind = '', definition = {}, source = {} } = {}) {
    return {
      ok: true,
      service: 'ads_planner_agent',
      kind,
      mode: 'provider_contract',
      provider: 'agent_file',
      generation_provider: adsText(source.OPENAI_API_KEY || source.BUILTIN_OPENAI_API_KEY) ? 'agent_configured' : 'openai_unconfigured',
      file_name: definition.fileName || null,
      model_role: definition.modelRole || null,
      execution_layer: definition.executionLayer || null,
      task_types: adsList(definition.seedProfile?.taskTypes),
      capabilities: adsList(definition.seedProfile?.capabilities),
      agent_purpose: definition.agentPurpose || null,
      action_boundaries: Array.isArray(definition.agentActionBoundaries) ? definition.agentActionBoundaries : [],
      delivery_contract: definition.deliveryContract || {}
    };
  },

  async runJob({ kind = 'ads_planner', definition = {}, body = {}, source = {} } = {}) {
    const context = adsContext(body);
    if (context.prompt === 'No prompt provided.') {
      return { accepted: true, status: 'failed', error: 'missing_required_deliverable: ads planning requires a campaign brief or ads objective.', failure_category: 'missing_required_deliverable' };
    }
    const generated = await adsOpenAiDelivery(kind, definition, body, source, context);
    const japanese = adsJapanese(context.prompt);
    return {
      accepted: true,
      status: 'completed',
      summary: generated?.summary || (japanese ? '広告計画を作成しました。' : 'Ads plan prepared.'),
      report: {
        summary: generated?.reportSummary || 'Prepared an approval-gated ads plan.',
        bullets: generated?.bullets?.length ? generated.bullets : ['Spend requires approval.', 'Ads SaaS owns execution.', 'Campaign Operations owns measurement.'],
        nextAction: generated?.nextAction || 'Confirm provider, budget cap, target CPA, stop rules, and connector status before any spend.',
        ...(generated?.artifacts?.length ? { artifacts: generated.artifacts } : {})
      },
      files: [{ name: definition.fileName || 'ads-planner-delivery.md', type: 'text/markdown', content: generated?.fileMarkdown || adsFallbackMarkdown(context, japanese), source_task_type: kind, content_type: generated?.contentType || 'ads_plan' }],
      usage: { total_cost_basis: 7, compute_cost: 2, tool_cost: 1, labor_cost: 4, api_cost: 0 },
      return_targets: ['chat', 'api'],
      runtime: { mode: 'provider_contract', provider: 'agent_file', kind, service: 'ads_planner_agent', file_name: definition.fileName || null, generation_provider: 'openai_responses' }
    };
  }
});

const AGENT_DEFINITION = {
  provider: AGENT_PROVIDER,
  agentPurpose: ADS_PLANNER_AGENT_PURPOSE,
  agentActionBoundaries: ADS_PLANNER_AGENT_ACTION_BOUNDARIES,
  deliveryContract: ADS_PLANNER_DELIVERY_CONTRACT,
  fileName: 'ads-planner-delivery.md',
  healthService: 'ads_planner_agent',
  modelRole: 'paid acquisition planning, budget guardrails, stop rules, and Ads SaaS handoff',
  executionLayer: 'planning',
  taskRouting: {
    expansionTasks: ['research', 'writer', 'landing', 'data_analysis'],
    softMatchTokens: ['ads_planner', 'paid_ads', 'google_ads', 'meta_ads', 'advertising', 'paid_acquisition'],
    inferencePatterns: [/google ads/i, /meta ads/i, /paid ads/i, /advertising/i, /広告運用/, /広告出稿/, /広告配信/],
    inferenceScore: 25,
    tagHints: ['marketing', 'ads', 'paid_acquisition']
  },
  seedProfile: {
    id: 'agent_ads_planner_01',
    name: 'ADS PLANNER AGENT',
    description: 'Built-in ads planning agent that prepares approval-gated paid acquisition plans, budget caps, stop rules, and Ads SaaS handoff packets without directly spending or publishing.',
    taskTypes: ['ads_planner', 'paid_ads', 'google_ads', 'meta_ads', 'advertising', 'paid_acquisition', 'marketing'],
    successRate: 0.9,
    avgLatencySec: 14,
    executionPattern: 'async',
    inputTypes: ['text', 'url', 'campaign', 'connector_context'],
    outputTypes: ['markdown', 'json', 'ads_plan'],
    clarification: 'multi_turn',
    capabilities: ['ads_plan', 'budget_guardrails', 'stop_rules', 'ads_saas_handoff', 'measurement_plan'],
    metadata: { layer: 'planning', adapter_role: 'ads_planner', approval_mode: 'human_before_spend', provider_connectors_required_for_execution: ['ads_saas'] }
  },
  systemPrompt: 'You are the built-in Ads Planner Agent in AIagent2. Prepare paid acquisition plans, campaign structure, budget caps, target CPA, stop rules, approval boundaries, and Ads SaaS handoff requirements. Never claim that ads were created, submitted, budgeted, bid, launched, paused, or edited unless a connected Ads SaaS explicitly reports it. Do not spend money or request broad authority for another agent. The Ads SaaS or the responsible ads execution agent must request its own authority before external action.',
  deliverableHint: 'Deliver in the user requested language in a clear, user-readable format.',
  scopeBoundaries: [
    'Do not spend money, create ads, change bids, or launch campaigns directly.',
    'Do not bypass budget, stop-rule, account, or compliance approval.',
    'Do not make unsupported claims in ads copy.'
  ]
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'ads_planner',
  aliases: ['paid_ads', 'google_ads', 'meta_ads', 'advertising', 'paid_acquisition'],
  name: AGENT_DEFINITION.seedProfile.name,
  description: AGENT_DEFINITION.seedProfile.description,
  agent_role: 'worker',
  task_types: AGENT_DEFINITION.seedProfile.taskTypes,
  capabilities: AGENT_DEFINITION.seedProfile.capabilities,
  healthcheckUrl: '/sample-agents/ads_planner/health',
  healthcheck_url: '/sample-agents/ads_planner/health',
  jobEndpoint: '/sample-agents/ads_planner/jobs',
  job_endpoint: '/sample-agents/ads_planner/jobs',
  endpoints: Object.freeze({ health: '/sample-agents/ads_planner/health', jobs: '/sample-agents/ads_planner/jobs' }),
  metadata: Object.freeze({
    agent_purpose: AGENT_DEFINITION.agentPurpose,
    action_boundaries: AGENT_DEFINITION.agentActionBoundaries,
    delivery_contract: AGENT_DEFINITION.deliveryContract,
    sample: true,
    sampleKind: 'ads_planner',
    sample_kind: 'ads_planner',
    category: 'ads_planner',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    workflow_layer: 'planning',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
