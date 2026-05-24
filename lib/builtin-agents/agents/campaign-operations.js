function valueText(value = '', fallback = '') {
  const safe = String(value ?? '').trim();
  return safe || fallback;
}

function deliveryValueText(value = '', fallback = '', depth = 0) {
  if (value == null || depth > 5) return fallback;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return valueText(value, fallback);
  if (Array.isArray(value)) {
    const text = value.map((item) => deliveryValueText(item, '', depth + 1)).filter(Boolean).join('\n\n').trim();
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
    ].map((item) => deliveryValueText(item, '', depth + 1)).filter(Boolean).join('\n\n').trim();
    return preferredText || fallback;
  }
  return fallback;
}

function valueList(value = []) {
  return Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : [];
}

function valueObject(value = {}) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function promptFromBody(body = {}) {
  return valueText(body.prompt || body.full_prompt || body.fullPrompt || body.input?.prompt || body.input?.order_prompt, 'No prompt provided.');
}

function languageIsJapanese(text = '') {
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(String(text || ''));
}

function campaignContextFromBody(body = {}) {
  const input = valueObject(body.input);
  const broker = valueObject(input._broker);
  const workflow = valueObject(broker.workflow);
  const campaign = valueObject(body.campaign || input.campaign || broker.campaign || workflow.campaign);
  const plan = valueObject(campaign.plan || body.plan || input.plan || workflow.plan);
  const prompt = promptFromBody(body);
  const channels = valueList(campaign.channels || plan.channels || body.channels || input.channels);
  return {
    prompt,
    title: valueText(campaign.title || campaign.name || plan.title, 'Campaign operations plan'),
    objective: valueText(campaign.objective || campaign.goal || plan.objective || plan.goal || prompt),
    audience: valueText(campaign.audience || plan.audience || input.audience),
    targetUrl: valueText(campaign.targetUrl || campaign.target_url || plan.targetUrl || plan.target_url || input.target_url),
    channels: channels.length ? channels : ['publisher', 'analytics'],
    kpis: valueList(campaign.kpis || plan.kpis || ['clicks', 'conversions', 'qualified leads']),
    status: valueText(campaign.status || 'planned')
  };
}

function campaignOperationsMarkdown(context = {}, japanese = false) {
  const channelLines = context.channels.map((channel) => `- ${channel}: prepare channel-specific assets, send to Publisher scheduling, and wait for approval before external execution.`).join('\n');
  const kpiLines = context.kpis.map((kpi) => `- ${kpi}`).join('\n');
  if (japanese) {
    return [
      `# ${context.title}`,
      '',
      '## キャンペーン状態',
      `- 目的: ${context.objective}`,
      context.audience ? `- 対象: ${context.audience}` : '- 対象: 未指定。CMO設計またはユーザー確認が必要。',
      context.targetUrl ? `- 対象URL: ${context.targetUrl}` : '- 対象URL: 未指定。',
      `- 状態: ${context.status}`,
      '',
      '## Publisher 入稿キュー',
      channelLines,
      '',
      '## 承認待ち',
      '- Campaign レコード承認: チャネル作業を確定扱いにする前に必須。',
      '- アセット承認: Publisher またはコネクタ投入前に各チャネルで必須。',
      '- 外部実行承認: 公開、送信、配信開始前に必須。',
      '',
      '## コネクタ準備状況',
      '- Publisher 取り込み: 未確認。',
      '- Analytics / Lead / CRM / Ads ソース: コネクタ証跡がない限り未確認。',
      '- チャネル実行: 担当チャネルエージェントまたは SaaS の準備完了報告までブロック。',
      '',
      '## 計測ループ',
      kpiLines,
      '- 承認済みチャネル施策ごとに結果を確認し、継続・修正・停止を判断する。',
      '',
      '## 次アクション担当',
      '- CMO Leaderの設計結果をCampaignに固定する。',
      '- 各チャネルエージェントへ成果物作成を依頼し、Publisherへ入稿する。',
      '- Publisherの承認/コンプライアンス状態を確認して配信スケジュールを進める。',
      '- 配信後にAnalytics/Lead/CRM/Adsの結果をCampaignMetricへ集約し、次アクションを提案する。',
      '',
      '## 境界',
      '- 戦略設計はCMO Leaderに残す。',
      '- 投稿、メール、広告などのチャネル固有アクションは該当エージェントJS内で完結する。',
      '- 外部公開や送信はPublisherと承認ゲートを通す。'
    ].join('\n');
  }
  return [
    `# ${context.title}`,
    '',
    '## Campaign state',
    `- Objective: ${context.objective}`,
    context.audience ? `- Audience: ${context.audience}` : '- Audience: not specified; request CMO plan or user confirmation.',
    context.targetUrl ? `- Target URL: ${context.targetUrl}` : '- Target URL: not specified.',
    `- Status: ${context.status}`,
    '',
    '## Publisher queue',
    channelLines,
    '',
    '## Approval backlog',
    '- Campaign record approval: required before channel work is treated as locked.',
    '- Asset approval: required per channel before Publisher or connector ingest.',
    '- External execution approval: required before publishing, sending, or launching.',
    '',
    '## Connector readiness',
    '- Publisher ingest: not verified.',
    '- Analytics/Lead/CRM/Ads sources: not verified unless connector evidence is attached.',
    '- Channel execution: blocked until the responsible channel agent or SaaS reports readiness.',
    '',
    '## Measurement loop',
    kpiLines,
    '- Review results after each approved channel action and choose continue, revise, or stop.',
    '',
    '## Next action owner',
    '- Lock the CMO Leader design into a Campaign record.',
    '- Ask each channel agent for assets and submit them to Publisher.',
    '- Check Publisher approval/compliance state before scheduled execution.',
    '- After delivery, collect Analytics/Lead/CRM/Ads results into CampaignMetric and recommend the next action.',
    '',
    '## Boundaries',
    '- Keep strategy design in CMO Leader.',
    '- Keep channel-specific actions inside the responsible channel agent JS.',
    '- Route external publishing or sending through Publisher and explicit approval gates.'
  ].join('\n');
}

export function campaignOperationsNextActionFromMetrics(summary = {}, campaign = {}) {
  const targetCpa = Number(campaign?.ads?.targetCpa || campaign?.ads?.target_cpa || 0);
  if (!summary?.metricCount) {
    return 'Campaign Operations should request Analytics, Lead SaaS, CRM/MA, or Ads results before deciding the next campaign action.';
  }
  if (summary.ctr !== null && summary.ctr < 0.01) {
    return 'Campaign Operations should ask the responsible channel agent to improve the hook or creative before increasing schedule volume.';
  }
  if (summary.conversionRate !== null && summary.conversionRate < 0.03) {
    return 'Campaign Operations should keep the traffic source stable and request landing or offer improvements from the responsible agent.';
  }
  if (summary.costPerConversion !== null && targetCpa > 0 && summary.costPerConversion > targetCpa) {
    return 'Campaign Operations should ask the Ads SaaS or responsible ads execution agent to reduce or pause spend under the approved stop rules.';
  }
  return 'Campaign Operations should continue the current campaign lane and prepare the next Publisher item for approval.';
}

const CAMPAIGN_OPERATIONS_AGENT_PURPOSE = 'Operate campaign state from a CMO or marketing design by preparing Campaign records, Publisher intake queues, approval backlog, connector readiness, measurement loops, and next owner decisions.';

const CAMPAIGN_OPERATIONS_AGENT_ACTION_BOUNDARIES = Object.freeze([
  Object.freeze({
    id: 'prepare_campaign_record',
    mode: 'operations_state',
    requires: Object.freeze(['campaign_objective_or_cmo_design', 'target_audience', 'primary_metric']),
    prepares: Object.freeze(['campaign_state', 'owner_map', 'status_backlog']),
    produces: Object.freeze(['campaign_record_packet']),
    cannotClaim: Object.freeze(['published', 'emailed', 'ads_launched']),
    authorityBoundary: 'Campaign state is operational planning, not channel execution.'
  }),
  Object.freeze({
    id: 'prepare_publisher_queue',
    mode: 'handoff_only',
    requires: Object.freeze(['approved_assets_or_asset_gaps', 'channel_owner', 'review_owner']),
    prepares: Object.freeze(['publisher_queue_items', 'approval_backlog', 'connector_readiness']),
    produces: Object.freeze(['publisher_intake_packet']),
    cannotClaim: Object.freeze(['publisher_item_created', 'external_app_ingested', 'published']),
    authorityBoundary: 'Publisher/app ingest must be proven by Publisher or connector response.'
  }),
  Object.freeze({
    id: 'prepare_measurement_loop',
    mode: 'measurement_only',
    requires: Object.freeze(['primary_metric', 'data_source_or_gap']),
    prepares: Object.freeze(['metric_capture_plan', 'review_cadence', 'next_action_rule']),
    produces: Object.freeze(['measurement_loop_packet']),
    cannotClaim: Object.freeze(['metric_improved']),
    authorityBoundary: 'Recommendations are operational next actions, not proof of results.'
  })
]);

const CAMPAIGN_OPERATIONS_DELIVERY_CONTRACT = Object.freeze({
  requiredDeliverySections: Object.freeze(['Campaign state', 'Publisher queue', 'Approval backlog', 'Connector readiness', 'Measurement loop', 'Next action owner']),
  requiredEvidence: Object.freeze(['CMO design or campaign brief', 'metric source status']),
  mustLabel: Object.freeze(['app ingest not verified', 'connector missing', 'blocked channel owner']),
  forbiddenClaims: Object.freeze(['published', 'sent', 'launched', 'Publisher item created without proof']),
  validDeliveryCheck: 'A valid campaign operations delivery preserves CMO/channel ownership and names the next owner.'
});

function openAiTextFromPayload(payload = {}) {
  if (typeof payload === 'string') return payload;
  const direct = [
    payload.output_text,
    typeof payload.text === 'string' ? payload.text : '',
    payload.content
  ].map((item) => deliveryValueText(item)).find(Boolean);
  if (direct) return direct;
  const output = Array.isArray(payload.output) ? payload.output : [];
  return output.flatMap((item) => Array.isArray(item?.content) ? item.content : [])
    .map((part) => deliveryValueText(part?.text || part?.value || part?.content))
    .filter(Boolean)
    .join('\n');
}

function jsonFromText(text = '') {
  const raw = valueText(text);
  if (!raw) return null;
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

async function generateOpenAiDelivery(kind = '', definition = {}, body = {}, source = {}, context = {}) {
  const apiKey = valueText(source.OPENAI_API_KEY || source.BUILTIN_OPENAI_API_KEY);
  if (!apiKey || typeof fetch !== 'function') return null;
  const baseUrl = valueText(source.OPENAI_BASE_URL || source.BUILTIN_OPENAI_BASE_URL, 'https://api.openai.com/v1').replace(/\/+$/, '');
  const model = valueText(source.OPENAI_MODEL || source.BUILTIN_OPENAI_MODEL, 'gpt-5.4-nano');
  const packet = {
    requested_language: body.output_language || body.outputLanguage || 'Infer from user request.',
    agent: {
      kind,
      name: definition.seedProfile?.name || 'Campaign Operations Agent',
      role: definition.modelRole || 'campaign operations',
      purpose: definition.agentPurpose || '',
      action_boundaries: Array.isArray(definition.agentActionBoundaries) ? definition.agentActionBoundaries : [],
      delivery_contract: definition.deliveryContract || {},
      tool_strategy: valueObject(definition.toolStrategy),
      specialist_method: valueList(definition.specialistMethod),
      scope_boundaries: valueList(definition.scopeBoundaries),
      depth_policy: definition.depthPolicy || null,
      concision_rule: definition.concisionRule || null
    },
    user_request: promptFromBody(body),
    target_url: context.targetUrl || '',
    campaign: context,
    delivery_quality_gate: {
      required_sections: valueList(definition.deliveryContract?.requiredDeliverySections),
      required_evidence: valueList(definition.deliveryContract?.requiredEvidence),
      must_label: valueList(definition.deliveryContract?.mustLabel),
      forbidden_claims: valueList(definition.deliveryContract?.forbiddenClaims),
      valid_delivery_check: valueText(definition.deliveryContract?.validDeliveryCheck)
    },
    instruction: 'Return JSON with summary, report_summary, bullets, next_action, file_markdown, content_type, and artifacts. Respect delivery_quality_gate: include required sections when relevant, label missing evidence/status, and avoid forbidden claims. Describe approval boundaries in the markdown only; do not create approval request objects for another agent.'
  };
  const response = await fetch(`${baseUrl}/responses`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model,
      input: [
        { role: 'system', content: [{ type: 'input_text', text: definition.systemPrompt || '' }] },
        { role: 'user', content: [{ type: 'input_text', text: JSON.stringify(packet) }] }
      ]
    })
  });
  if (!response?.ok) return null;
  const payload = await response.json().catch(() => null);
  const generated = jsonFromText(openAiTextFromPayload(payload || {}));
  if (!generated?.file_markdown && !generated?.fileMarkdown) return null;
  return {
    summary: valueText(generated.summary, 'Campaign operations delivery prepared.'),
    reportSummary: valueText(generated.report_summary || generated.reportSummary, generated.summary || 'Campaign operations delivery prepared.'),
    bullets: valueList(generated.bullets),
    nextAction: valueText(generated.next_action || generated.nextAction),
    fileMarkdown: deliveryValueText(generated.file_markdown || generated.fileMarkdown),
    contentType: valueText(generated.content_type || generated.contentType, 'campaign_operations_plan'),
    artifacts: Array.isArray(generated.artifacts) ? generated.artifacts.filter((item) => item && typeof item === 'object') : []
  };
}

const AGENT_PROVIDER = Object.freeze({
  health({ kind = '', definition = {}, source = {} } = {}) {
    return {
      ok: true,
      service: 'campaign_operations_agent',
      kind,
      mode: 'provider_contract',
      provider: 'agent_file',
      generation_provider: valueText(source.OPENAI_API_KEY || source.BUILTIN_OPENAI_API_KEY) ? 'agent_configured' : 'openai_unconfigured',
      file_name: definition.fileName || null,
      model_role: definition.modelRole || null,
      execution_layer: definition.executionLayer || null,
      task_types: valueList(definition.seedProfile?.taskTypes),
      capabilities: valueList(definition.seedProfile?.capabilities),
      agent_purpose: definition.agentPurpose || null,
      action_boundaries: Array.isArray(definition.agentActionBoundaries) ? definition.agentActionBoundaries : [],
      delivery_contract: definition.deliveryContract || {},
      tool_strategy: valueObject(definition.toolStrategy),
      specialist_method: valueList(definition.specialistMethod),
      scope_boundaries: valueList(definition.scopeBoundaries),
      depth_policy: definition.depthPolicy || null,
      concision_rule: definition.concisionRule || null
    };
  },

  async runJob({ kind = 'campaign_operations', definition = {}, body = {}, source = {} } = {}) {
    const context = campaignContextFromBody(body);
    if (context.prompt === 'No prompt provided.') {
      return {
        accepted: true,
        status: 'failed',
        error: 'missing_required_deliverable: campaign operations requires a CMO design, Campaign record, or user operation brief.',
        failure_category: 'missing_required_deliverable'
      };
    }
    const japanese = languageIsJapanese(context.prompt);
    const generated = await generateOpenAiDelivery(kind, definition, body, source, context);
    const markdown = generated?.fileMarkdown || campaignOperationsMarkdown(context, japanese);
    return {
      accepted: true,
      status: 'completed',
      summary: generated?.summary || (japanese ? 'キャンペーン運用計画を作成しました。' : 'Campaign operations plan prepared.'),
      report: {
        summary: generated?.reportSummary || (japanese ? 'CMO設計をCampaign運用へ移すためのPublisher入稿、承認、測定ループを整理しました。' : 'Prepared the Publisher intake, approval, and measurement loop needed to operate the campaign from a CMO design.'),
        bullets: generated?.bullets?.length ? generated.bullets : [
          'Campaign Operations owns progress, Publisher intake, measurement, and next-action recommendations.',
          'CMO Leader remains the strategy/design owner.',
          'Publisher remains the compliance-gated publishing surface.',
          'Channel-specific actions remain inside each channel agent.'
        ],
        nextAction: generated?.nextAction || 'Create or update the Campaign record, then submit approved channel assets to Publisher.',
        ...(generated?.artifacts?.length ? { artifacts: generated.artifacts } : {}),
        campaign_operations: {
          title: context.title,
          objective: context.objective,
          channels: context.channels,
          kpis: context.kpis,
          status: context.status
        }
      },
      files: [{
        name: valueText(definition.fileName, 'campaign-operations-delivery.md'),
        type: 'text/markdown',
        content: markdown,
        source_task_type: kind,
        content_type: generated?.contentType || 'campaign_operations_plan'
      }],
      usage: {
        total_cost_basis: 6,
        compute_cost: 2,
        tool_cost: 1,
        labor_cost: 3,
        api_cost: 0
      },
      return_targets: ['chat', 'api'],
      runtime: {
        mode: 'provider_contract',
        provider: 'agent_file',
        kind,
        service: 'campaign_operations_agent',
        file_name: definition.fileName || null,
        generation_provider: 'openai_responses'
      }
    };
  }
});

const AGENT_DEFINITION = {
  provider: AGENT_PROVIDER,
  agentPurpose: CAMPAIGN_OPERATIONS_AGENT_PURPOSE,
  agentActionBoundaries: CAMPAIGN_OPERATIONS_AGENT_ACTION_BOUNDARIES,
  deliveryContract: CAMPAIGN_OPERATIONS_DELIVERY_CONTRACT,
  fileName: 'campaign-operations-delivery.md',
  healthService: 'campaign_operations_agent',
  modelRole: 'campaign operations, Publisher intake, measurement loop, and marketing operations coordination',
  executionLayer: 'operations',
  taskRouting: {
    expansionTasks: ['media_planner', 'writer', 'seo_specialist', 'data_analysis'],
    softMatchTokens: ['campaign_operations', 'campaign_operator', 'marketing_operations', 'campaign_ops', 'campaign_run', 'campaign_management'],
    inferencePatterns: [
      /campaign operations/i,
      /campaign operator/i,
      /campaign management/i,
      /marketing operations/i,
      /campaign run/i,
      /campaign dashboard/i,
      /キャンペーン運用/,
      /運用君/,
      /マーケ運用/,
      /効果測定ループ/
    ],
    inferenceScore: 27,
    tagHints: ['marketing', 'operations', 'campaign']
  },
  seedProfile: {
    id: 'agent_campaign_operations_01',
    name: 'CAMPAIGN OPERATIONS AGENT',
    description: 'Built-in campaign operations agent that turns CMO designs into Campaign records, Publisher intake queues, measurement loops, and next-action recommendations without owning channel-specific execution.',
    taskTypes: [
      'campaign_operations',
      'campaign_operator',
      'marketing_operations',
      'campaign_ops',
      'campaign_run',
      'campaign_management',
      'marketing'
    ],
    successRate: 0.91,
    avgLatencySec: 12,
    executionPattern: 'async',
    inputTypes: ['text', 'json', 'connector_context', 'campaign'],
    outputTypes: ['markdown', 'json', 'campaign_operations_plan'],
    clarification: 'multi_turn',
    capabilities: [
      'campaign_state_management',
      'publisher_intake_queue',
      'measurement_loop',
      'next_action_recommendation',
      'approval_backlog_coordination',
      'saas_connector_readiness'
    ],
    metadata: {
      layer: 'operations',
      adapter_role: 'campaign_operator',
      approval_mode: 'publisher_before_external_execution',
      preferred_upstream_specialist: 'cmo_leader',
      output_contract: ['campaign', 'publisher_queue', 'measurement_plan', 'next_actions'],
      leader_handoff_mode: 'campaign_operations_mediated'
    }
  },
  systemPrompt: 'You are the built-in Campaign Operations Agent in AIagent2. You receive CMO Leader designs and turn them into campaign operations: Campaign state, Publisher intake queues, measurement plans, next actions, and SaaS connector readiness. You are not the CMO strategist and must not overwrite the CMO design unless the user explicitly asks for an operational adjustment. You do not directly publish, send email, run ads, or perform channel-specific actions. Channel-specific requests, authority requests, and execution packets belong inside the responsible channel agent JS. External publishing and compliance gates belong to Publisher. Measurement loops, progress state, and next-action recommendations belong to you.',
  deliverableHint: 'Deliver in the user requested language in a clear, user-readable format.',
  reviewHint: 'Respect CMO strategy ownership, Publisher compliance ownership, and channel-agent execution ownership.',
  outputSections: [
    'Campaign state',
    'Publisher queue',
    'Approval backlog',
    'Connector readiness',
    'Measurement loop',
    'Next action owner'
  ],
  inputNeeds: [
    'CMO design or campaign brief',
    'Target audience and primary metric',
    'Channel assets or asset gaps',
    'Publisher/compliance status',
    'Connector status for analytics, lead, CRM, ads, or channel apps'
  ],
  acceptanceChecks: [
    'Campaign state is separated from CMO strategy',
    'Publisher queue items name asset owner and approval owner',
    'Connector readiness is labeled as proven, missing, or blocked',
    'Measurement loop names metric source, cadence, and next-action rule',
    'No channel execution is claimed without the responsible agent or app proof'
  ],
  toolStrategy: {
    web_search: 'not_default',
    source_mode: 'cmo_design_campaign_record_publisher_queue_and_connector_status',
    note: 'Use campaign/app state first. If Publisher or connector state is missing, label the operational gap and route execution back to the responsible app or channel agent.'
  },
  specialistMethod: [
    'Translate the approved strategy into one Campaign record with objective, audience, status, and primary metric.',
    'Prepare Publisher queue items only from approved or clearly labeled draft assets.',
    'Keep each external action with its channel agent or app; Campaign Operations owns coordination and measurement only.',
    'End with the next owner, connector gap, and continue/revise/stop rule for the measurement loop.'
  ],
  scopeBoundaries: [
    'Do not become a CMO strategy leader.',
    'Do not publish, email, run ads, or call channel actions directly.',
    'Do not generate broad approval requests for another agent; ask the relevant agent or Publisher to request its own authority.',
    'Do not bypass Publisher compliance gates.'
  ],
  depthPolicy: 'Default to one campaign record, one Publisher queue, and one measurement loop. Go deeper only when the user provides multiple approved campaign lanes or asks for portfolio operations.',
  concisionRule: 'Avoid strategy rewrites; state campaign state, queue, blocked connectors, measurement rule, and next owner.',
  freshnessPolicy: 'Treat campaign metrics, connector status, audience data, ad spend, and Publisher queue state as time-sensitive.',
  sensitiveDataPolicy: 'Treat campaign plans, audience data, CRM records, lead sources, ad spend, and unpublished copy as confidential.',
  costControlPolicy: 'Start with the smallest campaign run: one campaign, a focused channel set, Publisher intake, and a measurement loop.'
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'campaign_operations',
  aliases: ['campaign_operator', 'marketing_operations', 'campaign_ops', 'campaign_run', 'campaign_management'],
  name: AGENT_DEFINITION.seedProfile.name,
  description: AGENT_DEFINITION.seedProfile.description,
  agent_role: 'worker',
  task_types: AGENT_DEFINITION.seedProfile.taskTypes,
  capabilities: AGENT_DEFINITION.seedProfile.capabilities,
  healthcheckUrl: '/sample-agents/campaign_operations/health',
  healthcheck_url: '/sample-agents/campaign_operations/health',
  jobEndpoint: '/sample-agents/campaign_operations/jobs',
  job_endpoint: '/sample-agents/campaign_operations/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/campaign_operations/health',
    jobs: '/sample-agents/campaign_operations/jobs'
  }),
  metadata: Object.freeze({
    agent_purpose: AGENT_DEFINITION.agentPurpose,
    action_boundaries: AGENT_DEFINITION.agentActionBoundaries,
    delivery_contract: AGENT_DEFINITION.deliveryContract,
    tool_strategy: AGENT_DEFINITION.toolStrategy,
    specialist_method: AGENT_DEFINITION.specialistMethod,
    scope_boundaries: AGENT_DEFINITION.scopeBoundaries,
    depth_policy: AGENT_DEFINITION.depthPolicy,
    concision_rule: AGENT_DEFINITION.concisionRule,
    sample: true,
    sampleKind: 'campaign_operations',
    sample_kind: 'campaign_operations',
    category: 'campaign_operations',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    workflow_layer: 'operations',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
