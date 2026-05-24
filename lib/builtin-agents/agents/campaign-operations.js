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
      '## 実行予定キュー',
      '- 次に進める: Campaign レコードを作成/更新し、承認済みまたは草案ラベル付きのチャネル成果物を Publisher 入稿候補に並べる。',
      '- 承認後に進める: Publisher 承認、コンプライアンス確認、チャネル別エージェントの実行パケット。',
      '- 測定後に進める: 初回結果を CampaignMetric に集約し、継続・修正・停止を判定する。',
      '',
      '## Now (Week 0-1)',
      '- Campaign レコード: 目的、対象、チャネル、KPI、承認者、未解決項目を固定する。',
      '- Publisher 候補: 承認済み/草案ラベル付きアセットだけを入稿候補に置く。外部公開済み扱いにはしない。',
      '- 測定準備: 主要KPI、測定ソース、初回レビュー日、停止条件を設定する。',
      '- 週内の停止条件: 承認者、コネクタ、KPI、チャネル担当のいずれかが未確定なら外部実行へ進めない。',
      '',
      '## Next (Week 1-3)',
      '- 進行条件: Week 0-1 の承認、Publisher/コネクタ準備、測定ソース、初回レビュー日が確認済みであること。',
      '- 反復作業: 初回結果に基づき、承認済みチャネルのCTA、クリエイティブ、配信枠、入稿順を小さく修正する。',
      '- 拡張候補: 測定済みで勝ち筋があるチャネルだけを次のPublisher候補または担当エージェントの実行パケットへ回す。',
      '- Week 1-3 の停止条件: 承認証跡、外部実行証跡、測定データがなければ拡張・勝ち負け判定・実行済み扱いをしない。',
      '',
      '## 待機条件',
      '- 待つ: 未承認アセット、未確認コネクタ、未設定KPI、未確定チャネル担当。',
      '- 待つ: Publisher 取り込み証跡または外部実行証跡がない公開/送信/配信開始。',
      '- 待つ: 測定ソースがない成果判断や勝ち負け判定。',
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
    '## Planned action queue',
    '- Next now: create or update the Campaign record and stage approved or draft-labeled channel artifacts for Publisher intake.',
    '- Next after approval: Publisher approval, compliance review, and channel-specific execution packets from the responsible agents.',
    '- Next after measurement: collect first results into CampaignMetric and decide continue, revise, or stop.',
    '',
    '## Now (Week 0-1)',
    '- Campaign record: lock objective, audience, channels, KPIs, approval owner, and unresolved gaps.',
    '- Publisher candidates: stage only approved or draft-labeled assets; do not treat them as live.',
    '- Measurement setup: define primary KPI, source, first review date, and stop condition.',
    '- Week-one stop condition: do not advance external execution while approver, connector, KPI, or channel owner is unresolved.',
    '',
    '## Next (Week 1-3)',
    '- Entry condition: Week 0-1 approval, Publisher/connector readiness, measurement source, and first review date are confirmed.',
    '- Iteration work: use first results to make small changes to approved-channel CTA, creative, schedule slots, or Publisher order.',
    '- Expansion candidates: only measured winning lanes move into the next Publisher candidate or responsible-agent execution packet.',
    '- Week 1-3 stop condition: do not claim expansion, winner/loser decisions, or completed execution without approval proof, external execution proof, and measurement data.',
    '',
    '## Waiting conditions',
    '- Wait on: unapproved assets, unverified connectors, unset KPIs, or unassigned channel owners.',
    '- Wait on: publishing, sending, or launching when Publisher ingest proof or external execution proof is missing.',
    '- Wait on: outcome or winner claims until a measurement source is attached.',
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
    id: 'prepare_planned_action_queue',
    mode: 'queue_planning_only',
    requires: Object.freeze(['campaign_state', 'approval_status', 'connector_status', 'measurement_status']),
    prepares: Object.freeze(['week_0_1_items', 'week_1_3_items', 'next_now_items', 'next_after_approval_items', 'waiting_conditions', 'blocked_action_labels']),
    produces: Object.freeze(['planned_action_queue_packet']),
    cannotClaim: Object.freeze(['blocked item ready', 'waiting item executed', 'approval dependency resolved', 'week 0 action completed without proof', 'week 1-3 action completed without proof', 'expansion ready without measurement']),
    authorityBoundary: 'The planned action queue separates the Week 0-1 actions, Next (Week 1-3) window, and what waits; it is not proof that blocked, approval-gated, or measurement-gated actions ran.'
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
  requiredDeliverySections: Object.freeze(['Campaign state', 'Publisher queue', 'Approval backlog', 'Connector readiness', 'Planned action queue', 'Now (Week 0-1)', 'Next (Week 1-3)', 'Waiting conditions', 'Measurement loop', 'Next action owner']),
  requiredEvidence: Object.freeze(['CMO design or campaign brief', 'metric source status', 'approval status', 'connector readiness status', 'Week 0-1 completion or readiness status']),
  mustLabel: Object.freeze(['app ingest not verified', 'connector missing', 'blocked channel owner', 'waiting on approval', 'waiting on measurement', 'Week 1-3 gated', 'measurement-gated expansion']),
  forbiddenClaims: Object.freeze(['published', 'sent', 'launched', 'Publisher item created without proof', 'blocked item ready', 'waiting item executed', 'week 0 action completed without proof', 'week 1-3 action completed without proof', 'expansion ready without measurement', 'outcome decided without measurement']),
  validDeliveryCheck: 'A valid campaign operations delivery preserves CMO/channel ownership, separates Week 0-1 actions, Next (Week 1-3) work, and waiting conditions, and names the next owner.'
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
      output_sections: valueList(definition.outputSections),
      acceptance_checks: valueList(definition.acceptanceChecks),
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
      output_contract: ['campaign_state', 'publisher_queue', 'approval_backlog', 'connector_readiness', 'planned_action_queue', 'now_week_0_1', 'next_week_1_3', 'waiting_conditions', 'measurement_loop', 'next_action_owner'],
      leader_handoff_mode: 'campaign_operations_mediated'
    }
  },
  systemPrompt: 'You are the built-in Campaign Operations Agent in AIagent2. You receive CMO Leader designs and turn them into campaign operations: Campaign state, Publisher intake queues, planned action queues, Week 0-1 action windows, Next (Week 1-3) action windows, waiting conditions, measurement plans, next actions, and SaaS connector readiness. You are not the CMO strategist and must not overwrite the CMO design unless the user explicitly asks for an operational adjustment. Always separate what happens next from what waits on approval, connector readiness, owner assignment, or measurement. The Now (Week 0-1) section must name only the immediate setup, staging, approval, and measurement-readiness work that can happen without pretending external execution occurred. The Next (Week 1-3) section must name only follow-on iteration or expansion work that becomes eligible after Week 0-1 approvals, connector readiness, and measurement source are confirmed; do not claim Week 1-3 work is complete or expansion-ready without proof and data. You do not directly publish, send email, run ads, or perform channel-specific actions. Channel-specific requests, authority requests, and execution packets belong inside the responsible channel agent JS. External publishing and compliance gates belong to Publisher. Measurement loops, progress state, and next-action recommendations belong to you.',
  deliverableHint: 'Deliver in the user requested language in a clear, user-readable format.',
  reviewHint: 'Respect CMO strategy ownership, Publisher compliance ownership, and channel-agent execution ownership.',
  outputSections: [
    'Campaign state',
    'Publisher queue',
    'Approval backlog',
    'Connector readiness',
    'Planned action queue',
    'Now (Week 0-1)',
    'Next (Week 1-3)',
    'Waiting conditions',
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
    'Now (Week 0-1) contains only immediate setup/staging/approval/measurement-readiness work',
    'Next (Week 1-3) contains only gated iteration or expansion work after approval, readiness, and measurement',
    'Planned action queue separates next-now work from waiting conditions',
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
    'Define the Week 0-1 work that can happen now without claiming external execution.',
    'Define the Next (Week 1-3) work that waits for Week 0-1 readiness, approval proof, connector proof, and first measurement data.',
    'Separate next-now actions from items waiting on approval, connector proof, owner assignment, or measurement.',
    'Keep each external action with its channel agent or app; Campaign Operations owns coordination and measurement only.',
    'End with the next owner, connector gap, and continue/revise/stop rule for the measurement loop.'
  ],
  scopeBoundaries: [
    'Do not become a CMO strategy leader.',
    'Do not publish, email, run ads, or call channel actions directly.',
    'Do not mark Week 0-1 setup, staging, or approval work complete without proof.',
    'Do not mark Week 1-3 iteration, expansion, or execution work complete without approval, execution, and measurement proof.',
    'Do not present waiting or blocked items as ready to execute.',
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
