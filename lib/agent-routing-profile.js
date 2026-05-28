export function createAgentRoutingProfileTools(dependencies = {}) {
  const {
    defaultGoogleSourceGroupsForCapabilities = () => [],
    leaderControlContractForTask = () => null,
    normalizeTaskTypeAlias = (value = '') => String(value || '').trim().toLowerCase(),
    normalizeTaskTypes = (value = []) => (Array.isArray(value) ? value : String(value || '').split(',')).map((item) => String(item || '').trim().toLowerCase()).filter(Boolean),
    nowIso = () => new Date().toISOString(),
    publicTaskRoutingProfileForKind = () => null,
    taskRoutingTokensFromAgentDefinitions = () => []
  } = dependencies;

const AGENT_TAG_ALIASES = Object.freeze({
  market: 'marketing',
  marketing_agent: 'marketing',
  marketer: 'marketing',
  growth_hack: 'growth',
  growth_hacking: 'growth',
  acquisition: 'growth',
  customer_acquisition: 'growth',
  leadgen: 'sales',
  lead_generation: 'sales',
  bizdev: 'sales',
  social_media: 'social',
  twitter: 'x',
  x_post: 'x',
  x_ops: 'x',
  content_marketing: 'content',
  copywriting: 'writing',
  copy: 'writing',
  search: 'research',
  analysis: 'analysis',
  analytics: 'data',
  data_analysis: 'data',
  competitor: 'competitor',
  competitive: 'competitor',
  teardown: 'competitor',
  coding: 'engineering',
  code: 'engineering',
  debug: 'engineering',
  dev: 'engineering',
  development: 'engineering',
  software: 'engineering',
  github: 'github',
  pr: 'github',
  pull_request: 'github',
  ops: 'operations',
  operation: 'operations',
  automation: 'automation',
  finance: 'finance',
  pricing: 'pricing',
  legal: 'legal',
  compliance: 'legal',
  privacy: 'legal',
  product_management: 'product',
  ux: 'product',
  validation: 'product',
  cto: 'engineering',
  cpo: 'product',
  cfo: 'finance'
});

function normalizeAgentTagToken(value = '') {
  const raw = String(value || '').normalize('NFKC').trim().toLowerCase();
  if (!raw) return '';
  if (/マーケ|集客|広告|販促|グロース/.test(raw)) return 'marketing';
  if (/調査|リサーチ|分析|比較|競合/.test(raw)) return raw.includes('競合') ? 'competitor' : (raw.includes('分析') ? 'analysis' : 'research');
  if (/開発|実装|修正|バグ|コード|github|プルリク/.test(raw)) return raw.includes('github') || raw.includes('プルリク') ? 'github' : 'engineering';
  if (/秘書|アシスタント|メール|返信|日程|予定|会議|議事録|リマインド|催促/.test(raw)) {
    if (/日程|予定|会議/.test(raw)) return 'calendar';
    if (/メール|返信/.test(raw)) return 'email';
    return 'secretary';
  }
  if (/財務|価格|料金|請求/.test(raw)) return raw.includes('価格') || raw.includes('料金') ? 'pricing' : 'finance';
  if (/法務|規約|プライバシ|コンプラ/.test(raw)) return 'legal';
  if (/プロダクト|ux|ロードマップ|検証/.test(raw)) return 'product';
  const compact = raw
    .replace(/&/g, ' and ')
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!compact) return '';
  return AGENT_TAG_ALIASES[compact] || compact;
}

function normalizeAgentTags(value = [], options = {}) {
  const max = Math.max(1, Math.min(40, Number(options.max || 18)));
  const raw = Array.isArray(value)
    ? value
    : String(value || '').split(/[,\n]/);
  const tags = [];
  for (const item of raw) {
    const tag = normalizeAgentTagToken(item);
    if (tag && !tags.includes(tag)) tags.push(tag);
    if (tags.length >= max) break;
  }
  return tags;
}

function pushAgentTags(target, values = []) {
  for (const tag of normalizeAgentTags(values, { max: 40 })) {
    if (tag && !target.includes(tag)) target.push(tag);
  }
}

function agentTextTagHints(text = '') {
  const raw = String(text || '').toLowerCase();
  const tags = [];
  const add = (tag) => pushAgentTags(tags, [tag]);
  if (/(marketing|growth|acquisition|signup|launch|distribution|product hunt|indie hackers|reddit|x\.com|twitter|seo|sales|revenue|集客|会員登録|売上|マーケ|広告費|無料施策|ローンチ)/i.test(raw)) add('marketing');
  if (/(growth|acquisition|signup|lead|customer|グロース|ユーザー獲得|リード)/i.test(raw)) add('growth');
  if (/(research|analysis|compare|competitor|benchmark|teardown|diligence|調査|分析|比較|競合)/i.test(raw)) add('research');
  if (/(competitor|benchmark|teardown|競合|ベンチマーク)/i.test(raw)) add('competitor');
  if (/(seo|keyword|search intent|content gap|検索|キーワード)/i.test(raw)) add('seo');
  if (/(write|copy|content|blog|article|post|thread|文章|投稿|記事|ライティング)/i.test(raw)) add('writing');
  if (/(instagram|reddit|indie hackers|x\.com|twitter|tweet|social|community|インスタ|レディット|ツイート|コミュニティ)/i.test(raw)) add('social');
  if (/(data|analytics|metric|kpi|dashboard|funnel|cohort|計測|データ|指標|ファネル|kpi)/i.test(raw)) add('data');
  if (/(code|debug|github|repo|pull request|api|worker|deploy|ops|automation|開発|実装|修正|バグ|プルリク|デプロイ)/i.test(raw)) add('engineering');
  if (/(automation|workflow|bot|scheduled|自動化|ワークフロー|定期)/i.test(raw)) add('automation');
  if (/(secretary|executive assistant|assistant|inbox|email reply|reply draft|calendar|schedule|meeting|minutes|follow[-\s]?up|reminder|zoom|google meet|teams|秘書|アシスタント|メール返信|受信箱|日程調整|スケジュール|予定調整|会議|議事録|リマインド|催促)/i.test(raw)) add('secretary');
  if (/(inbox|email|gmail|mailbox|reply|メール|受信箱|返信)/i.test(raw)) add('email');
  if (/(calendar|schedule|meeting|zoom|google meet|teams|日程|予定|会議|スケジュール)/i.test(raw)) add('calendar');
  if (/(pricing|billing|finance|unit economics|cash flow|価格|料金|請求|財務|収支)/i.test(raw)) add('finance');
  if (/(legal|compliance|terms|privacy|policy|risk|法務|規約|プライバシ|コンプラ|リスク)/i.test(raw)) add('legal');
  if (/(product|roadmap|ux|validation|onboarding|feature|プロダクト|ロードマップ|ux|検証|オンボーディング)/i.test(raw)) add('product');
  return tags;
}

function inferAgentTagsFromSignals(input = {}) {
  const metadata = input.metadata && typeof input.metadata === 'object' ? input.metadata : {};
  const manifest = metadata.manifest && typeof metadata.manifest === 'object' ? metadata.manifest : {};
  const manifestMetadata = manifest.metadata && typeof manifest.metadata === 'object' ? manifest.metadata : {};
  const explicit = [
    input.tags,
    input.teamTags,
    input.team_tags,
    metadata.tags,
    metadata.teamTags,
    metadata.team_tags,
    metadata.agent_tags,
    manifest.tags,
    manifest.teamTags,
    manifest.team_tags,
    manifestMetadata.tags,
    manifestMetadata.teamTags,
    manifestMetadata.team_tags,
    manifestMetadata.agent_tags
  ];
  const taskTypes = normalizeTaskTypes(input.taskTypes || input.task_types || manifest.task_types || manifest.taskTypes || []);
  const tags = [];
  for (const source of explicit) pushAgentTags(tags, source);
  for (const taskType of taskTypes) {
    pushAgentTags(tags, [taskType]);
    pushAgentTags(tags, taskRoutingTokensFromAgentDefinitions(taskType, { field: 'tag' }));
  }
  const agentRole = normalizeAgentTagToken(input.agentRole || input.agent_role || metadata.agentRole || metadata.agent_role || manifest.agent_role || manifest.agentRole || '');
  if (agentRole === 'leader' || taskTypes.some((task) => String(task || '').endsWith('_leader'))) pushAgentTags(tags, ['leader', 'orchestration']);
  const kind = normalizeAgentTagToken(input.kind || metadata.category || metadata.kind || manifest.kind || manifest.category || '');
  if (kind) {
    pushAgentTags(tags, [kind]);
    pushAgentTags(tags, taskRoutingTokensFromAgentDefinitions(kind, { field: 'tag' }));
  }
  pushAgentTags(tags, agentTextTagHints([
    input.name,
    input.description,
    input.text,
    metadata.description,
    manifest.description,
    JSON.stringify(metadata.task_type_scores || manifestMetadata.task_type_scores || [])
  ].filter(Boolean).join('\n')));
  return tags.slice(0, Math.max(1, Math.min(40, Number(input.maxTags || 18))));
}

function agentTagsFromRecord(agent = {}) {
  const metadata = agent?.metadata && typeof agent.metadata === 'object' ? agent.metadata : {};
  const manifest = metadata.manifest && typeof metadata.manifest === 'object' ? metadata.manifest : {};
  return inferAgentTagsFromSignals({
    tags: agent.tags || agent.agentTags || agent.agent_tags,
    taskTypes: agent.taskTypes || manifest.task_types || manifest.taskTypes || [],
    name: agent.name || manifest.name,
    description: agent.description || manifest.description,
    kind: metadata.category || manifest.category || manifest.kind,
    agentRole: metadata.agentRole || metadata.agent_role || manifest.agent_role || manifest.agentRole,
    metadata
  });
}

function normalizeAgentLinkNames(value = []) {
  const raw = Array.isArray(value)
    ? value
    : (typeof value === 'string' ? value.split(/[,\n]/) : []);
  const names = [];
  for (const item of raw) {
    const safe = String(item || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (safe && !names.includes(safe)) names.push(safe);
  }
  return names;
}

function normalizeAgentLinkTaskTypes(value = []) {
  return normalizeAgentLinkNames(value)
    .map((item) => normalizeTaskTypeAlias(item))
    .filter(Boolean);
}

function pushUniqueStrings(target = [], values = []) {
  for (const value of values) {
    const safe = String(value || '').trim();
    if (safe && !target.includes(safe)) target.push(safe);
  }
}

function agentBlueprintForRecord(agent = {}) {
  return fallbackAgentLinkBlueprintForRecord(agent);
}

function fallbackAgentLinkBlueprintForRecord(agent = {}) {
  const metadata = agent?.metadata && typeof agent.metadata === 'object' ? agent.metadata : {};
  const manifest = metadata.manifest && typeof metadata.manifest === 'object' ? metadata.manifest : {};
  const taskTypes = normalizeTaskTypes(agent.taskTypes || manifest.task_types || manifest.taskTypes || []);
  const tags = agentTagsFromRecord(agent);
  const tokens = new Set(normalizeAgentTags([
    agent.id,
    agent.name,
    agent.description,
    metadata.category,
    metadata.kind,
    metadata.agentRole,
    metadata.agent_role,
    manifest.kind,
    manifest.agent_role,
    ...taskTypes,
    ...tags
  ], { max: 48 }));
  const has = (...values) => values.some((value) => tokens.has(value));
  const taskTypeSet = new Set(taskTypes.map((task) => normalizeTaskTypeAlias(task)).filter(Boolean));
  const hasTask = (...values) => values.some((value) => taskTypeSet.has(normalizeTaskTypeAlias(value)));
  const text = [...tokens].join(' ');
  if (has('leader', 'orchestration', 'planning') || taskTypes.some((task) => String(task || '').endsWith('_leader'))) {
    return {
      layer: 'leader',
      role: 'planner_orchestrator',
      approvalMode: 'human_or_leader_before_external_execution',
      inputContract: ['task_brief', 'constraints', 'approval_policy'],
      outputContract: ['dispatch_plan', 'leader_summary'],
      downstreamTaskTypes: ['research', 'writing'],
      downstreamTags: ['research', 'writing', 'execution']
    };
  }
  if (
    !has('execution', 'automation', 'operations', 'connector', 'social', 'email', 'distribution')
    && (hasTask('writing', 'copywriting', 'content', 'seo', 'translation') || (!hasTask('research', 'analysis', 'data_analysis', 'teardown') && has('writing', 'content', 'copywriting', 'summary', 'messaging', 'translation')))
  ) {
    return {
      layer: 'content_generation',
      role: 'writer_planner',
      approvalMode: 'draft_before_human_approval',
      inputContract: ['message_brief', 'research_findings', 'channel_constraints'],
      outputContract: ['draft', 'tone', 'key_points', 'call_to_action', 'approval_needed'],
      upstreamTaskTypes: ['research'],
      downstreamTags: ['execution', 'distribution', 'social', 'email']
    };
  }
  if (hasTask('list_creator', 'lead_sourcing', 'lead_qualification', 'company_list_builder', 'prospect_research')) {
    return {
      layer: 'research',
      role: 'lead_list_builder',
      inputContract: ['lead_acquisition_request', 'target_segment', 'source_policy', 'qualification_rules', 'destination_system'],
      outputContract: ['lead_rows', 'evidence_urls', 'next_actions', 'lead_ops_packet', 'target_segment', 'source_policy', 'qualification_rules', 'field_schema', 'row_level_source_ledger', 'exclusion_and_duplicate_review', 'review_status', 'approval_owner', 'import_outreach_boundary', 'downstream_handoff_packet', 'execution_proof_tracker', 'next_owner'],
      downstreamTaskTypes: ['cold_email'],
      downstreamTags: ['cold_email', 'email', 'crm', 'execution']
    };
  }
  if (has('research', 'analysis', 'evidence', 'competitor', 'data')) {
    return {
      layer: 'research',
      role: 'evidence_builder',
      inputContract: ['question_brief', 'source_scope'],
      outputContract: ['findings', 'sources', 'confidence', 'recommended_action'],
      downstreamTaskTypes: ['writing'],
      downstreamTags: ['writing', 'content']
    };
  }
  if (has('execution', 'automation', 'operations', 'connector', 'social', 'email', 'distribution') || /(publish|post|send|submit|dispatch|connector|oauth|tweet|mail)/i.test(text)) {
    return {
      layer: 'execution',
      role: 'channel_adapter',
      approvalMode: 'human_before_external_execution',
      inputContract: ['approved_work_packet', 'approval_context'],
      outputContract: ['status', 'output', 'errors', 'external_url', 'next_step'],
      upstreamTaskTypes: ['writing', 'research'],
      upstreamTags: ['writing', 'content', 'research']
    };
  }
  return {
    layer: 'worker',
    role: 'general_specialist',
    inputContract: ['task_brief'],
    outputContract: ['result', 'next_step'],
    upstreamTaskTypes: ['research'],
    downstreamTaskTypes: []
  };
}

function explicitAgentLinkMetadata(agent = {}) {
  const metadata = agent?.metadata && typeof agent.metadata === 'object' ? agent.metadata : {};
  const manifest = metadata.manifest && typeof metadata.manifest === 'object' ? metadata.manifest : {};
  const manifestMetadata = manifest.metadata && typeof manifest.metadata === 'object' ? manifest.metadata : {};
  return { ...manifestMetadata, ...metadata };
}

function normalizedAgentIdentityTokens(agent = {}) {
  const metadata = agent?.metadata && typeof agent.metadata === 'object' ? agent.metadata : {};
  const manifest = metadata.manifest && typeof metadata.manifest === 'object' ? metadata.manifest : {};
  return normalizeAgentTags([
    agent.id,
    agent.name,
    metadata.category,
    metadata.kind,
    manifest.kind,
    ...(agent.taskTypes || []),
    ...(manifest.task_types || manifest.taskTypes || [])
  ], { max: 20 });
}

function resolveLinkedAgents(catalog = [], currentAgent = {}, taskTypes = [], tags = [], names = []) {
  if (!Array.isArray(catalog) || !catalog.length) return [];
  const requestedTasks = new Set(normalizeAgentLinkTaskTypes(taskTypes));
  const requestedTags = new Set(normalizeAgentTags(tags, { max: 24 }));
  const requestedNames = new Set(normalizeAgentLinkNames(names));
  const currentId = String(currentAgent?.id || '').trim();
  const resolved = [];
  for (const agent of catalog) {
    if (!agent || typeof agent !== 'object') continue;
    const candidateMetadata = agent.metadata && typeof agent.metadata === 'object' ? agent.metadata : {};
    if (
      candidateMetadata.hidden_from_catalog
      || candidateMetadata.not_routable
      || candidateMetadata.deleted_at
      || candidateMetadata.deletedAt
      || String(agent?.verificationStatus || '').toLowerCase() === 'deprecated'
    ) continue;
    if (currentId && String(agent.id || '').trim() === currentId) continue;
    const candidateTasks = new Set(normalizeTaskTypes(agent.taskTypes || agent.task_types || []));
    const candidateTags = new Set(agentTagsFromRecord(agent));
    const candidateNames = new Set(normalizedAgentIdentityTokens(agent));
    const taskMatches = [...requestedTasks].filter((task) => candidateTasks.has(task));
    const tagMatches = [...requestedTags].filter((tag) => candidateTags.has(tag));
    const nameMatches = [...requestedNames].filter((name) => candidateNames.has(name));
    if (!taskMatches.length && !tagMatches.length && !nameMatches.length) continue;
    resolved.push({
      id: agent.id,
      name: agent.name,
      taskTypes: normalizeTaskTypes(agent.taskTypes || agent.task_types || []).slice(0, 6),
      tags: agentTagsFromRecord(agent).slice(0, 8),
      matched_on: {
        task_types: taskMatches,
        tags: tagMatches,
        names: nameMatches
      }
    });
  }
  return resolved
    .sort((left, right) => {
      const leftScore = left.matched_on.task_types.length * 3 + left.matched_on.names.length * 2 + left.matched_on.tags.length;
      const rightScore = right.matched_on.task_types.length * 3 + right.matched_on.names.length * 2 + right.matched_on.tags.length;
      return rightScore - leftScore || String(left.name || '').localeCompare(String(right.name || ''));
    })
    .slice(0, 8);
}

function buildLinkDirection(agent = {}, catalog = [], blueprint = {}, metadata = {}, direction = 'upstream') {
  const prefix = direction === 'downstream' ? 'downstream' : 'upstream';
  const explicitAgents = normalizeAgentLinkNames([
    metadata[`${prefix}_agents`],
    metadata[`${prefix}Agents`],
    metadata[`${prefix}_specialists`],
    metadata[`${prefix}Specialists`],
    metadata[direction === 'upstream' ? 'preferred_upstream_specialist' : 'preferred_downstream_specialist'],
    metadata[direction === 'upstream' ? 'secondary_upstream_specialist' : 'secondary_downstream_specialist']
  ].flat().filter(Boolean));
  const explicitTaskTypeInputs = [
    metadata[`${prefix}_task_types`],
    metadata[`${prefix}TaskTypes`]
  ].flat().filter(Boolean);
  const taskTypes = normalizeAgentLinkTaskTypes([
    ...explicitTaskTypeInputs,
    ...(explicitTaskTypeInputs.length ? [] : [blueprint[`${prefix}TaskTypes`]])
  ].flat().filter(Boolean));
  const explicitTagInputs = [
    metadata[`${prefix}_tags`],
    metadata[`${prefix}Tags`]
  ].flat().filter(Boolean);
  const tags = normalizeAgentTags([
    ...explicitTagInputs,
    ...(explicitTagInputs.length ? [] : [blueprint[`${prefix}Tags`]])
  ].flat().filter(Boolean), { max: 24 });
  return {
    agents: explicitAgents,
    task_types: taskTypes,
    tags,
    resolved: resolveLinkedAgents(catalog, agent, taskTypes, tags, explicitAgents)
  };
}

function agentLinksFromRecord(agent = {}, options = {}) {
  const catalog = Array.isArray(options.catalog) ? options.catalog : [];
  const metadata = explicitAgentLinkMetadata(agent);
  const blueprint = agentBlueprintForRecord(agent) || {};
  const layer = String(metadata.agent_layer || metadata.layer || blueprint.layer || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  const role = String(metadata.adapter_role || metadata.role || blueprint.role || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  const approvalMode = String(metadata.approval_mode || metadata.approvalMode || blueprint.approvalMode || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  const explicitInputContract = [
    metadata.input_contract,
    metadata.inputContract
  ].flat().filter(Boolean);
  const inputContract = normalizeAgentLinkNames([
    ...explicitInputContract,
    ...(explicitInputContract.length ? [] : [blueprint.inputContract])
  ].flat().filter(Boolean));
  const explicitOutputContract = [
    metadata.output_contract,
    metadata.outputContract,
    metadata.execution_default
  ].flat().filter(Boolean);
  const outputContract = normalizeAgentLinkNames([
    ...explicitOutputContract,
    ...(explicitOutputContract.length ? [] : [blueprint.outputContract])
  ].flat().filter(Boolean));
  const externalContract = String(metadata.external_connector_contract || metadata.connector_contract || '').trim() || null;
  return {
    layer: layer || null,
    role: role || null,
    approval_mode: approvalMode || null,
    input_contract: inputContract,
    output_contract: outputContract,
    external_connector_contract: externalContract,
    upstream: buildLinkDirection(agent, catalog, blueprint, metadata, 'upstream'),
    downstream: buildLinkDirection(agent, catalog, blueprint, metadata, 'downstream')
  };
}

function agentRoutingConfirmationAccepted(body = {}) {
  return Boolean(
    body?.confirm_routing === true
    || body?.confirmRouting === true
    || body?.confirm_agent_routing === true
    || body?.confirmAgentRouting === true
    || body?.routing_confirmation?.confirmed === true
    || body?.routingConfirmation?.confirmed === true
  );
}

function buildAgentRoutingConfirmation(agent = {}, options = {}) {
  const catalog = Array.isArray(options.catalog) ? options.catalog : [];
  const links = agentLinksFromRecord(agent, { catalog });
  const taskTypes = normalizeTaskTypes(agent.taskTypes || agent.task_types || []);
  const tags = agentTagsFromRecord(agent);
  const layer = links.layer || 'worker';
  const role = links.role || 'general_specialist';
  const warnings = [];
  if (layer === 'execution' && !links.approval_mode) warnings.push('Execution agents should require human approval before external actions.');
  if (layer === 'execution' && !links.upstream.task_types.includes('writing')) warnings.push('Execution agents should normally receive a writing/copy pack before action.');
  if (layer === 'leader' && !links.downstream.task_types.length && !links.downstream.tags.length) warnings.push('Leader agents should declare downstream specialists or tags.');
  if (layer === 'worker') warnings.push('No specific layer was declared; CAIt inferred a general worker role.');
  return {
    required: true,
    code: 'routing_confirmation_required',
    confirm_field: 'confirm_routing',
    summary: `CAIt inferred ${layer}/${role} routing for ${agent.name || agent.id || 'this agent'}.`,
    inferred: {
      layer,
      role,
      approval_mode: links.approval_mode || null,
      task_types: taskTypes,
      tags,
      upstream: links.upstream,
      downstream: links.downstream,
      input_contract: links.input_contract,
      output_contract: links.output_contract,
      external_connector_contract: links.external_connector_contract || null
    },
    proposed_settings: {
      metadata: {
        agent_layer: layer,
        role,
        approval_mode: links.approval_mode || null,
        upstream_task_types: links.upstream.task_types,
        upstream_tags: links.upstream.tags,
        downstream_task_types: links.downstream.task_types,
        downstream_tags: links.downstream.tags,
        input_contract: links.input_contract,
        output_contract: links.output_contract
      }
    },
    warnings,
    next_step: 'Show this inferred routing to the user. If it is correct, retry the registration with confirm_routing=true.'
  };
}

function applyConfirmedAgentRoutingToAgent(agent = {}, options = {}) {
  const confirmation = buildAgentRoutingConfirmation(agent, options);
  const inferred = confirmation.inferred || {};
  const confirmedAt = options.confirmedAt || nowIso();
  const confirmedBy = String(options.confirmedBy || '').trim();
  const routingConfirmation = {
    confirmed: true,
    status: 'confirmed',
    source: options.source || 'inferred_then_user_confirmed',
    confirmed_at: confirmedAt,
    confirmed_by: confirmedBy || null,
    layer: inferred.layer || 'worker',
    role: inferred.role || 'general_specialist',
    approval_mode: inferred.approval_mode || null,
    upstream_task_types: inferred.upstream?.task_types || [],
    upstream_tags: inferred.upstream?.tags || [],
    downstream_task_types: inferred.downstream?.task_types || [],
    downstream_tags: inferred.downstream?.tags || [],
    input_contract: inferred.input_contract || [],
    output_contract: inferred.output_contract || []
  };
  const metadata = agent.metadata && typeof agent.metadata === 'object' ? agent.metadata : {};
  const manifest = metadata.manifest && typeof metadata.manifest === 'object' ? metadata.manifest : null;
  const manifestMetadata = manifest?.metadata && typeof manifest.metadata === 'object' ? manifest.metadata : {};
  const routingMetadata = {
    agent_layer: routingConfirmation.layer,
    layer: routingConfirmation.layer,
    role: routingConfirmation.role,
    approval_mode: routingConfirmation.approval_mode,
    upstream_task_types: routingConfirmation.upstream_task_types,
    upstream_tags: routingConfirmation.upstream_tags,
    downstream_task_types: routingConfirmation.downstream_task_types,
    downstream_tags: routingConfirmation.downstream_tags,
    input_contract: routingConfirmation.input_contract,
    output_contract: routingConfirmation.output_contract,
    routing_confirmation: routingConfirmation
  };
  agent.metadata = {
    ...metadata,
    ...routingMetadata,
    ...(manifest ? {
      manifest: {
        ...manifest,
        metadata: {
          ...manifestMetadata,
          ...routingMetadata
        }
      }
    } : {})
  };
  agent.updatedAt = confirmedAt;
  return { agent, routing_confirmation: confirmation, confirmed_settings: routingMetadata };
}

function compactTrustList(items = [], limit = 4) {
  const values = Array.isArray(items) ? items : (typeof items === 'string' ? items.split(/[,\n]/) : []);
  return [...new Set(values
    .map((item) => String(item || '').trim())
    .filter(Boolean))]
    .slice(0, limit);
}

function sampleAgentTrustProfileForSeed({
  kind = '',
  agentRole = 'worker',
  riskLevel = 'safe',
  requiredConnectors = [],
  requiredConnectorCapabilities = [],
  optionalConnectors = [],
  confirmationRequiredFor = [],
  capabilities = [],
  taskTypes = [],
  metadata = {}
} = {}) {
  const normalizedKind = String(kind || '').trim().toLowerCase();
  const normalizedRole = String(agentRole || '').trim().toLowerCase() || 'worker';
  const allSignals = [
    normalizedKind,
    normalizedRole,
    ...compactTrustList(taskTypes, 12),
    ...compactTrustList(capabilities, 12),
    ...compactTrustList(requiredConnectorCapabilities, 12),
    ...compactTrustList(requiredConnectors, 12)
  ].join(' ').toLowerCase();
  const connectorCaps = compactTrustList(requiredConnectorCapabilities, 8);
  const connectors = compactTrustList(requiredConnectors, 8);
  const optional = compactTrustList(optionalConnectors, 8);
  const confirmations = compactTrustList(confirmationRequiredFor, 8);
  const actionGated = connectorCaps.some((capability) => /(post|send|publish|write|create|update|delete|schedule|submit)/i.test(capability))
    || connectors.length > 0
    || confirmations.length > 0
    || !['safe', 'low'].includes(String(riskLevel || '').trim().toLowerCase());
  const sourceSensitive = /(research|search|source|seo|teardown|diligence|data|analysis|pricing|validation|citation|directory|list)/i.test(allSignals);
  const leader = normalizedRole === 'leader' || /_leader$/.test(normalizedKind);
  const level = actionGated
      ? 'approval_gated'
    : (sourceSensitive ? 'source_bound' : (leader ? 'orchestration_reviewed' : 'sample_verified'));
  const score = actionGated ? 86 : (sourceSensitive ? 88 : (leader ? 87 : 90));
  const levelLabel = {
    approval_gated: 'Approval-gated sample agent',
    source_bound: 'Source-bound sample agent',
    orchestration_reviewed: 'Orchestration-reviewed sample agent',
    sample_verified: 'Verified sample agent'
  }[level] || 'Verified sample agent';
  const sourcePolicy = sourceSensitive
    ? 'Source-sensitive work must expose the sources used, observation date, or missing-source blocker.'
    : 'Uses supplied context and must label assumptions when external evidence is not used.';
  const actionPolicy = actionGated
    ? 'External writes, posting, sending, publishing, account selection, or connector actions require connector proof and explicit approval before execution.'
    : 'No external write authority is implied by this agent profile.';
  const metadataLayer = String(metadata.layer || metadata.agent_layer || '').trim();
  const executionLayer = metadataLayer || (leader ? 'leader' : (actionGated ? 'action_or_connector' : (sourceSensitive ? 'research_or_analysis' : 'specialist')));
  return {
    version: 'agent-trust/v1',
    level,
    label: levelLabel,
    score,
    summary: `${levelLabel}: provider endpoint contract, structured delivery contract, explicit evidence/assumption separation, and QA gates for ${executionLayer} work.`,
    execution_layer: executionLayer,
    source_policy: sourcePolicy,
    action_policy: actionPolicy,
    guarantees: [
      'Sample agent entries run through the endpoint declared by their own manifest before dispatch.',
      'Delivery must include acceptance checks, evidence status, assumptions, and next action.',
      sourceSensitive ? 'Source-sensitive claims must be traceable to supplied or searched evidence.' : 'Unsupported claims must be labeled as assumptions or inference.',
      actionGated ? 'Connector actions are blocked until the required authority is present.' : 'No external action is claimed without a concrete execution path.'
    ],
    quality_checks: [
      'Evidence status is explicit and does not invent missing sources.',
      'User facts, assumptions, and inference remain separated.',
      'Acceptance checks are satisfied before final delivery is marked complete.',
      'Execution or connector results are not claimed without proof.'
    ],
    evidence_requirements: [
      'User-provided prompt, files, URLs, and selected sources.',
      sourceSensitive ? 'Search/source URLs or a clear missing-source blocker for current facts.' : 'Relevant supplied context and labeled assumptions.',
      leader ? 'Specialist handoff artifacts and leader synthesis trace.' : 'Agent-specific output contract and review checks.',
      actionGated ? 'Connector identity, target account/source, explicit approval, and action result proof.' : 'Reviewable final artifact or decision record.'
    ],
    limitations: [
      'Trust score is a workflow assurance score, not a guarantee that every recommendation is correct.',
      'External systems, accounts, and publishing surfaces are not trusted until connected and approved.',
      'Time-sensitive facts may become stale and require fresh source verification.'
    ],
    required_connectors: connectors,
    required_connector_capabilities: connectorCaps,
    optional_connectors: optional,
    approval_required_for: confirmations,
    review_required: actionGated || sourceSensitive || leader
  };
}

function makeSampleAgentSeed({
  id,
  name,
  description,
  taskTypes,
  successRate,
  avgLatencySec,
  kind,
  executionPattern = 'instant',
  inputTypes = ['text'],
  outputTypes = ['markdown', 'json'],
  clarification = 'optional_clarification',
  scheduleSupport = false,
  requiredConnectors = [],
  requiredConnectorCapabilities = [],
  optionalConnectors = [],
  riskLevel = 'safe',
  confirmationRequiredFor = [],
  capabilities = null,
  tags = [],
  metadata = {},
  manifest = {}
}) {
  const createdAt = nowIso();
  const taskRoutingProfile = publicTaskRoutingProfileForKind(kind);
  const agentRole = /leader/i.test(String(name || '')) || (taskTypes || []).some((task) => /(^|_)(leader|orchestration|planning)(_|$)/i.test(String(task || '')) || String(task || '').trim().toLowerCase().endsWith('_leader'))
    ? 'leader'
    : 'worker';
  const resolvedCapabilities = Array.isArray(capabilities) && capabilities.length ? [...capabilities] : [...taskTypes];
  if (agentRole === 'leader') {
    for (const capability of [
      'task_decomposition',
      'routing_decision',
      'stop_go_gate',
      'integration',
      'quality_gate',
      'context_control',
      'final_responsibility'
    ]) {
      if (!resolvedCapabilities.includes(capability)) resolvedCapabilities.push(capability);
    }
  }
  const leaderControlContract = agentRole === 'leader'
    ? leaderControlContractForTask(kind || taskTypes?.[0] || '')
    : null;
  const inferredTags = inferAgentTagsFromSignals({ tags, taskTypes, name, description, kind, agentRole, metadata });
  const trustProfile = sampleAgentTrustProfileForSeed({
    kind,
    agentRole,
    riskLevel,
    requiredConnectors,
    requiredConnectorCapabilities,
    optionalConnectors,
    confirmationRequiredFor,
    capabilities: resolvedCapabilities,
    taskTypes,
    metadata
  });
  const agentFileManifest = manifest && typeof manifest === 'object' ? manifest : {};
  const agentFileManifestMetadata = agentFileManifest.metadata && typeof agentFileManifest.metadata === 'object'
    ? agentFileManifest.metadata
    : {};
  const manifestEndpoints = agentFileManifest.endpoints && typeof agentFileManifest.endpoints === 'object'
    ? agentFileManifest.endpoints
    : {};
  const sampleManifest = {
    ...agentFileManifest,
    schema_version: agentFileManifest.schema_version || 'agent-manifest/v1',
    kind: agentFileManifest.kind || kind,
    agent_role: agentFileManifest.agent_role || agentRole,
    name: agentFileManifest.name || name,
    description: agentFileManifest.description || description,
    ...(taskRoutingProfile ? { task_routing: agentFileManifest.task_routing || taskRoutingProfile } : {}),
    tags: agentFileManifest.tags || inferredTags,
    team_tags: agentFileManifest.team_tags || inferredTags,
    task_types: agentFileManifest.task_types || taskTypes,
    execution_pattern: agentFileManifest.execution_pattern || executionPattern,
    input_types: agentFileManifest.input_types || inputTypes,
    output_types: agentFileManifest.output_types || outputTypes,
    clarification: agentFileManifest.clarification || clarification,
    schedule_support: Boolean(agentFileManifest.schedule_support ?? scheduleSupport),
    required_connectors: agentFileManifest.required_connectors || requiredConnectors,
    required_connector_capabilities: agentFileManifest.required_connector_capabilities || requiredConnectorCapabilities,
    required_google_sources: agentFileManifest.required_google_sources || defaultGoogleSourceGroupsForCapabilities(requiredConnectorCapabilities),
    risk_level: agentFileManifest.risk_level || riskLevel,
    confirmation_required_for: agentFileManifest.confirmation_required_for || confirmationRequiredFor,
    capabilities: agentFileManifest.capabilities || resolvedCapabilities,
    trust: agentFileManifest.trust || trustProfile,
    endpoints: {
      ...manifestEndpoints
    },
    metadata: {
      sample: true,
      sampleKind: kind,
      sample_kind: kind,
      category: kind,
      agentRole,
      ...(taskRoutingProfile ? { task_routing: taskRoutingProfile, taskRouting: taskRoutingProfile } : {}),
      tags: inferredTags,
      team_tags: inferredTags,
      execution_scope: 'agent_file_manifest',
      source: 'agent_file_manifest',
      externalProviderRequired: false,
      external_provider_required: false,
      trust: trustProfile,
      ...(leaderControlContract ? { leader_control_contract: leaderControlContract } : {}),
      optional_connectors: optionalConnectors,
      ...metadata,
      ...agentFileManifestMetadata
    },
    pricing: {
      provider_markup_rate: 0.1,
      token_markup_rate: 0.1,
      platform_margin_rate: 0.1,
      creator_fee_rate: 0.1,
      marketplace_fee_rate: 0.1,
      ...(agentFileManifest.pricing && typeof agentFileManifest.pricing === 'object' ? agentFileManifest.pricing : {})
    }
  };
  return {
    id,
    name,
    description,
    taskTypes,
    providerMarkupRate: 0.1,
    tokenMarkupRate: 0.1,
    platformMarginRate: 0.1,
    creatorFeeRate: 0.1,
    marketplaceFeeRate: 0.1,
    premiumRate: 0.1,
    basicRate: 0.1,
    successRate,
    avgLatencySec,
    online: false,
    trust: trustProfile,
    token: null,
    earnings: 0,
    owner: 'cait-samples',
    manifestUrl: `sample-agent://manifest/${kind}`,
    manifestSource: 'agent-file-manifest',
    metadata: {
      sample: true,
      sampleKind: kind,
      sample_kind: kind,
      category: kind,
      source: 'agent_file_manifest',
      externalProviderRequired: false,
      external_provider_required: false,
      agentRole,
      ...(taskRoutingProfile ? { taskRouting: taskRoutingProfile, task_routing: taskRoutingProfile } : {}),
      trust: trustProfile,
      tags: inferredTags,
      teamTags: inferredTags,
      manifest: sampleManifest
    },
    verificationStatus: 'manifest_loaded',
    verificationCheckedAt: createdAt,
    verificationError: 'Agent-file manifest is loaded and will be verified through its manifest endpoints.',
    verificationDetails: {
      category: 'manifest_configuration',
      code: 'agent_file_manifest_loaded',
      reason: 'Sample agent contract is defined by the individual agent manifest.',
      details: {
        verificationMode: 'provider_endpoint_required',
        service: null,
        statusCode: null,
        trust: trustProfile
      }
    },
    createdAt,
    updatedAt: createdAt
  };
}

  function defaultAgentSeedsFromDefinitions(sampleAgentDefinitions = {}) {
    return Object.freeze(Object.entries(sampleAgentDefinitions)
      .filter(([, defaults]) => defaults?.seedProfile && defaults.seedProfile.enabled !== false)
      .map(([kind, defaults]) => makeSampleAgentSeed({
        kind,
        manifest: defaults.manifest,
        ...defaults.seedProfile
      })));
  }

  function deprecatedAgentSeedIdsFromDefinitions(sampleAgentDefinitions = {}) {
    const agentOwnedDeprecatedSeedIds = Object.freeze(Object.values(sampleAgentDefinitions)
      .flatMap((definition) => Array.isArray(definition?.deprecatedSeedIds) ? definition.deprecatedSeedIds : [])
      .map((id) => String(id || '').trim())
      .filter(Boolean));
    return Object.freeze([
      'agent_equity_01',
      // Tombstone only: keeps old production rows hidden/not routable after the agent was removed.
      'agent_bloodstock_01',
      'agent_resale_01',
      'agent_raceform_01',
      'agent_earnings_01',
      'agent_company_team_leader_01',
      'agent_okara_company_leader_01',
      'agent_team_leader_01',
      'agent_launch_team_leader_01',
      ...agentOwnedDeprecatedSeedIds
    ]);
  }

  return {
    normalizeAgentTags,
    inferAgentTagsFromSignals,
    agentTagsFromRecord,
    agentLinksFromRecord,
    agentRoutingConfirmationAccepted,
    buildAgentRoutingConfirmation,
    applyConfirmedAgentRoutingToAgent,
    makeSampleAgentSeed,
    defaultAgentSeedsFromDefinitions,
    deprecatedAgentSeedIdsFromDefinitions
  };
}