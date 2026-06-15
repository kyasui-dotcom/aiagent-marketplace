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

function tableCell(value = '', fallback = '-') {
  return valueText(value, fallback).replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function markdownTable(headers = [], rows = []) {
  const safeHeaders = headers.map((header) => tableCell(header));
  const safeRows = rows.map((row) => row.map((cell) => tableCell(cell)));
  return [
    `| ${safeHeaders.join(' | ')} |`,
    `| ${safeHeaders.map(() => '---').join(' | ')} |`,
    ...safeRows.map((row) => `| ${row.join(' | ')} |`)
  ].join('\n');
}

function promptFromBody(body = {}) {
  return valueText(body.prompt || body.full_prompt || body.fullPrompt || body.input?.prompt || body.input?.order_prompt, 'No prompt provided.');
}

function languageIsJapanese(text = '') {
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(String(text || ''));
}

function campaignAssetQueueLabel(asset = {}) {
  const status = String(asset.status || '').toLowerCase();
  const measurement = String(asset.measurementStatus || '').toLowerCase();
  if (/blocked|unverified|cannot|stop|conversion tracking/.test(`${status} ${measurement}`)) return 'blocked';
  if (/draft|approval missing|owner approval missing|unapproved|not approved|needs approval/.test(status)) return 'draft-needs-approval';
  if (/measurement[-\s]?waiting|pending result|results pending|first result|data pending|awaiting measurement/.test(measurement)) return 'measurement-waiting';
  if (/approved/.test(status)) return 'approved-ready';
  return 'blocked';
}

function campaignAssetPublisherAction(queueLabel = '', japanese = false) {
  const label = String(queueLabel || '');
  if (japanese) {
    if (label === 'approved-ready') return 'Publisherレビュー候補。外部実行は承認証跡まで未実行。';
    if (label === 'draft-needs-approval') return 'draftとして保持。所有者承認まで入稿・公開扱いにしない。';
    if (label === 'measurement-waiting') return '測定レビューに保持。新規Publisher候補には入れない。';
    return 'ブロック解除までPublisher入稿対象外。';
  }
  if (label === 'approved-ready') return 'Stage for Publisher review; external execution remains blocked until proof.';
  if (label === 'draft-needs-approval') return 'Hold as draft; do not ingest or publish until owner approval proof exists.';
  if (label === 'measurement-waiting') return 'Keep in measurement review; do not treat as a new Publisher candidate.';
  return 'Exclude from Publisher intake until the blocker is resolved.';
}

function campaignAssetNextProof(asset = {}, japanese = false) {
  if (asset.queueLabel === 'approved-ready') {
    return japanese
      ? 'Publisher取り込みID、承認者、日時、外部実行前の最終確認'
      : 'Publisher ingest id, approver, timestamp, and final pre-execution approval';
  }
  if (asset.queueLabel === 'draft-needs-approval') {
    const owner = valueText(asset.approvalOwner || asset.owner, japanese ? '承認者未指定' : 'approval owner missing');
    return japanese
      ? `${owner} の文案/URL/停止条件承認`
      : `${owner} approval for copy, URL, and stop rule`;
  }
  if (asset.queueLabel === 'measurement-waiting') {
    return japanese
      ? '初回配信/公開の実行証跡と測定ソースの結果'
      : 'First execution proof and dated results from the measurement source';
  }
  return valueText(asset.proofStatus || asset.status, japanese ? 'ブロック理由と解除証跡' : 'blocker reason and unblock proof');
}

function campaignAssetContentType(asset = {}) {
  const text = `${asset.channel || ''} ${asset.title || ''}`.toLowerCase();
  if (/seo|article|記事/.test(text)) return 'seo_article';
  if (/landing|homepage|owned site|lp|ホームページ|ページ/.test(text)) return 'landing_page';
  if (/x|linkedin|instagram|reddit|social|sns|投稿/.test(text)) return 'social_copy_packet';
  if (/email|mail|newsletter|メール/.test(text)) return 'email_copy_packet';
  if (/directory|listing|review|掲載|ディレクトリ/.test(text)) return 'directory_listing_packet';
  return 'campaign_asset_packet';
}

function campaignContextFromBody(body = {}) {
  const input = valueObject(body.input);
  const broker = valueObject(input._broker);
  const workflow = valueObject(broker.workflow);
  const campaign = valueObject(body.campaign || input.campaign || broker.campaign || workflow.campaign);
  const plan = valueObject(campaign.plan || body.plan || input.plan || workflow.plan);
  const prompt = promptFromBody(body);
  const channels = valueList(campaign.channels || plan.channels || body.channels || input.channels);
  const approvalOwner = valueText(
    campaign.approval_owner || campaign.approvalOwner || plan.approval_owner || plan.approvalOwner
    || input.approval_owner || input.approvalOwner || broker.approval_owner || broker.approvalOwner,
    'approval owner missing'
  );
  const rawAssets = [
    campaign.assets,
    campaign.channel_assets,
    campaign.channelAssets,
    input.assets,
    input.channel_assets,
    input.channelAssets,
    body.assets
  ].find((items) => Array.isArray(items)) || [];
  const assets = rawAssets
    .map((asset, index) => {
      const item = valueObject(asset);
      const id = valueText(item.id || item.key || item.slug || item.asset_id || item.assetId, `asset-${index + 1}`);
      const title = valueText(item.title || item.name || item.id, `Asset ${index + 1}`);
      const channel = valueText(item.channel || item.surface || item.destination, 'unassigned');
      const status = valueText(item.approval_status || item.approvalStatus || item.status || item.asset_status || item.assetStatus, 'status_missing');
      const measurementStatus = valueText(item.measurement_status || item.measurementStatus || item.metric_status || item.metricStatus);
      const owner = valueText(item.owner || item.asset_owner || item.assetOwner || item.review_owner || item.reviewOwner, 'owner missing');
      const assetApprovalOwner = valueText(item.approval_owner || item.approvalOwner || item.review_owner || item.reviewOwner, approvalOwner);
      const proofStatus = valueText(item.proof_status || item.proofStatus || item.source_status || item.sourceStatus || item.blocker || item.blocker_reason || item.blockerReason);
      const targetSurface = valueText(item.target_surface || item.targetSurface || item.surface || item.destination || channel, channel);
      const queueLabel = campaignAssetQueueLabel({ status, measurementStatus });
      return {
        id,
        title,
        channel,
        status,
        measurementStatus,
        owner,
        approvalOwner: assetApprovalOwner,
        proofStatus,
        targetSurface,
        queueLabel,
        contentType: valueText(item.content_type || item.contentType || item.type, campaignAssetContentType({ channel, title }))
      };
    });
  const kpis = valueList(campaign.kpis || plan.kpis || ['clicks', 'conversions', 'qualified leads']);
  return {
    prompt,
    title: valueText(campaign.title || campaign.name || plan.title, 'Campaign operations plan'),
    objective: valueText(campaign.objective || campaign.goal || plan.objective || plan.goal || prompt),
    audience: valueText(campaign.audience || plan.audience || input.audience),
    targetUrl: valueText(campaign.targetUrl || campaign.target_url || plan.targetUrl || plan.target_url || input.target_url),
    channels: channels.length ? channels : ['publisher', 'analytics'],
    kpis,
    primaryKpi: kpis[0] || 'primary conversion',
    status: valueText(campaign.status || 'planned'),
    approvalOwner,
    connectorStatus: valueText(
      campaign.connector_status || campaign.connectorStatus || plan.connector_status || plan.connectorStatus
      || input.connector_status || input.connectorStatus,
      'Connector execution proof not supplied.'
    ),
    sourceStatus: valueText(
      campaign.source_status || campaign.sourceStatus || plan.source_status || plan.sourceStatus
      || input.source_status || input.sourceStatus,
      'Campaign brief supplied; live app/connector state not verified.'
    ),
    measurementSource: valueText(campaign.measurement_source || campaign.measurementSource || plan.measurement_source || plan.measurementSource, 'Analytics/Search Console/CRM source not verified'),
    measurementCadence: valueText(campaign.measurement_cadence || campaign.measurementCadence || plan.measurement_cadence || plan.measurementCadence, 'weekly review after approved execution'),
    firstReviewDate: valueText(campaign.first_review_date || campaign.firstReviewDate || plan.first_review_date || plan.firstReviewDate, 'set after approval and first execution proof'),
    publicFacts: valueList(campaign.public_facts || campaign.publicFacts || plan.public_facts || plan.publicFacts || input.public_facts || input.publicFacts),
    assets
  };
}

function campaignOperationsSaasPayload(context = {}) {
  const publisherItems = context.assets.map((asset) => ({
    id: asset.id,
    title: asset.title,
    channel: asset.channel,
    content_type: asset.contentType,
    queue_label: asset.queueLabel,
    publisher_action: campaignAssetPublisherAction(asset.queueLabel, false),
    owner: asset.owner,
    approval_owner: asset.approvalOwner || context.approvalOwner,
    target_surface: asset.targetSurface,
    next_proof_required: campaignAssetNextProof(asset, false),
    ingest_status: 'not_ingested',
    external_execution_status: 'not_executed'
  }));
  return {
    campaign_record: {
      title: context.title,
      objective: context.objective,
      audience: context.audience || 'audience missing',
      target_url: context.targetUrl || 'target URL missing',
      status: context.status,
      approval_owner: context.approvalOwner,
      primary_kpi: context.primaryKpi,
      source_status: context.sourceStatus,
      connector_status: context.connectorStatus
    },
    publisher_items: publisherItems,
    measurement_loop: {
      primary_kpi: context.primaryKpi,
      kpis: context.kpis,
      source: context.measurementSource,
      cadence: context.measurementCadence,
      first_review_date: context.firstReviewDate,
      result_rule: 'continue, revise, or stop only after dated execution and measurement proof'
    }
  };
}

function campaignOperationsArtifacts(context = {}) {
  return [{
    type: 'campaign_operations_saas_payload',
    content_type: 'application/json',
    title: `${context.title} operations payload`,
    payload: campaignOperationsSaasPayload(context)
  }];
}

function campaignOperationsMarkdown(context = {}, japanese = false) {
  const publisherRows = context.assets.map((asset) => [
    asset.id,
    asset.channel,
    asset.queueLabel,
    campaignAssetPublisherAction(asset.queueLabel, japanese),
    asset.owner,
    campaignAssetNextProof(asset, japanese)
  ]);
  const assetRows = context.assets.map((asset) => [
    asset.id,
    asset.title,
    asset.status,
    asset.measurementStatus || (japanese ? '未提供' : 'not supplied'),
    asset.proofStatus || (japanese ? '追加証跡未提供' : 'additional proof not supplied')
  ]);
  const approvalRows = context.assets
    .filter((asset) => ['draft-needs-approval', 'approved-ready', 'blocked'].includes(asset.queueLabel))
    .map((asset) => [
      asset.id,
      asset.approvalOwner || context.approvalOwner,
      asset.queueLabel === 'blocked' ? (japanese ? 'ブロック解除判断' : 'unblock decision') : (japanese ? '文案/URL/停止条件承認' : 'copy, URL, and stop-rule approval'),
      campaignAssetNextProof(asset, japanese)
    ]);
  const kpiRows = context.kpis.map((kpi, index) => [
    kpi,
    index === 0 ? (japanese ? '主指標' : 'primary') : (japanese ? '補助指標' : 'secondary'),
    context.measurementSource,
    japanese ? '実行証跡と測定データがそろうまで勝敗判定しない' : 'Do not decide outcome until execution proof and measurement data exist'
  ]);
  const saasPayload = JSON.stringify(campaignOperationsSaasPayload(context), null, 2);
  const publicFactLines = context.publicFacts.length
    ? context.publicFacts.map((item) => `- ${item}`)
    : [japanese ? '- 公開事実はキャンペーン入力に未提供。URLとサービス概要だけを既知情報として扱う。' : '- Public facts were not supplied in the campaign input. Treat only the URL and service brief as known.'];
  if (japanese) {
    return [
      `# ${context.title}`,
      '',
      '## キャンペーン状態',
      `- 目的: ${context.objective}`,
      context.audience ? `- 対象: ${context.audience}` : '- 対象: 未指定。CMO設計またはユーザー確認が必要。',
      context.targetUrl ? `- 対象URL: ${context.targetUrl}` : '- 対象URL: 未指定。',
      `- 状態: ${context.status}`,
      `- 承認者: ${context.approvalOwner}`,
      `- 主指標: ${context.primaryKpi}`,
      '',
      '## Campaign レコード草案',
      markdownTable(
        ['Field', 'Value'],
        [
          ['title', context.title],
          ['objective', context.objective],
          ['audience', context.audience || 'audience missing'],
          ['target_url', context.targetUrl || 'target URL missing'],
          ['status', context.status],
          ['approval_owner', context.approvalOwner],
          ['primary_kpi', context.primaryKpi],
          ['source_status', context.sourceStatus]
        ]
      ),
      '',
      '## ソース / コネクタ台帳',
      context.targetUrl
        ? `- サイト確認: ${context.targetUrl} を今回の対象サービスURLとして扱う。`
        : '- サイト確認: 対象サービスURLが未指定。',
      `- 入力ソース状態: ${context.sourceStatus}`,
      `- コネクタ状態: ${context.connectorStatus}`,
      `- 測定ソース: ${context.measurementSource}`,
      ...publicFactLines,
      '',
      '## Publisher 入稿キュー',
      publisherRows.length
        ? markdownTable(['Item ID', 'Channel', 'Queue', 'Publisher action', 'Owner', 'Proof needed'], publisherRows)
        : '- アセットが未提供。Publisher候補を作る前に、アセットID、チャネル、承認状態、測定状態、担当者を取得する。分類ラベルは approved-ready、draft-needs-approval、measurement-waiting、blocked を使う。',
      '',
      '## アセットステータスキュー',
      assetRows.length
        ? markdownTable(['Item ID', 'Title', 'Approval status', 'Measurement status', 'Proof / blocker'], assetRows)
        : '- アセットが未提供。キュー分類は未実施。必要な分類順は approved-ready -> draft-needs-approval -> measurement-waiting -> blocked。',
      '',
      '## 承認待ち',
      markdownTable(
        ['Item ID', 'Approval owner', 'Decision needed', 'Required proof'],
        [
          ['campaign-record', context.approvalOwner, 'Campaignレコードの目的/対象/KPI確定', '承認者、日時、対象URL、停止条件'],
          ...approvalRows
        ]
      ),
      '',
      '## コネクタ準備状況',
      `- Publisher ingest: not verified。上記キューは入稿候補であり、Publisher item作成済みではない。`,
      `- Analytics/Search Console/CRM/Ads: ${context.connectorStatus}`,
      '- チャネル実行: 該当チャネルエージェントまたはSaaSの実行証跡まで not_executed。',
      '',
      '## 実行予定キュー',
      '- Next now: Campaign レコード草案をSaaSに保存し、draft-needs-approval と approved-ready の候補だけをレビューキューへ並べる。',
      '- Next after approval: 承認済みアイテムだけをPublisher/該当SaaSへ入稿し、入稿IDと日時を記録する。',
      '- Next after measurement: 実行証跡と測定結果があるアイテムだけを継続/修正/停止に分類する。',
      '',
      '## Now (Week 0-1)',
      `- Campaign固定: 「${context.primaryKpi}」を主指標にし、承認者を ${context.approvalOwner} に固定する。`,
      '- Publisher候補: draft-needs-approval はレビュー待ち、approved-ready はレビュー候補、measurement-waiting は結果待ち、blocked は除外。',
      '- 測定準備: UTM、イベント名、初回レビュー日、停止条件をCampaignMetricに保存する。',
      '- 停止条件: 承認者、対象URL、測定ソース、外部実行証跡のどれかが欠けたら公開/送信/広告配信へ進めない。',
      '',
      '## Next (Week 1-3)',
      '- 進行条件: Campaign承認、Publisher/コネクタ準備、測定ソース、初回レビュー日が確認済みであること。',
      '- 反復作業: brand search impressions と qualified site sessions を見て、SEO/owned site/SNSの文案とCTAを小さく修正する。',
      '- 拡張候補: signup/login starts または demo/contact starts が確認できたチャネルだけを次のPublisher候補へ回す。',
      '- Week 1-3 の停止条件: 承認証跡、外部実行証跡、測定データがなければ拡張・勝敗判定・実行済み扱いをしない。',
      '',
      '## 待機条件',
      '- waiting on approval: draft-needs-approval の文案、URL、停止条件。',
      '- waiting on connector: Publisher、Analytics/Search Console/CRM、SNS/ESP/広告の実行証跡。',
      '- waiting on measurement: measurement-waiting の初回結果とレビュー日。',
      '- blocked: ブロック理由が残るアイテムはPublisher入稿対象外。',
      '',
      '## 計測ループ',
      markdownTable(['KPI', 'Role', 'Source', 'Decision rule'], kpiRows),
      `- レビュー頻度: ${context.measurementCadence}`,
      `- 初回レビュー日: ${context.firstReviewDate}`,
      '',
      '## SaaS 入稿データ',
      '```json',
      saasPayload,
      '```',
      '',
      '## 次アクション担当',
      `- ${context.approvalOwner}: Campaignレコードとdraft-needs-approvalの承認。`,
      '- Campaign Operations: SaaS payloadを保存し、Publisher候補・承認待ち・測定待ちを同期する。',
      '- CMO Leader: チャネル優先順位とメッセージ判断を最終確認する。',
      '- 各チャネル担当: 承認後にだけ外部実行し、実行ID/URL/日時を返す。',
      '',
      '## 境界',
      '- 戦略設計はCMO Leaderに残す。',
      '- 投稿、メール、広告などのチャネル固有アクションは該当エージェントJS内で完結する。',
      '- この出力はCampaign/Publisher運用パケットであり、外部公開・送信・広告配信・Publisher item作成完了を主張しない。'
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
    `- Approval owner: ${context.approvalOwner}`,
    `- Primary KPI: ${context.primaryKpi}`,
    '',
    '## Campaign record draft',
    markdownTable(
      ['Field', 'Value'],
      [
        ['title', context.title],
        ['objective', context.objective],
        ['audience', context.audience || 'audience missing'],
        ['target_url', context.targetUrl || 'target URL missing'],
        ['status', context.status],
        ['approval_owner', context.approvalOwner],
        ['primary_kpi', context.primaryKpi],
        ['source_status', context.sourceStatus]
      ]
    ),
    '',
    '## Source / connector ledger',
    context.targetUrl
      ? `- Site check: treat ${context.targetUrl} as the target service URL for this campaign.`
      : '- Site check: target service URL is missing.',
    `- Input source status: ${context.sourceStatus}`,
    `- Connector status: ${context.connectorStatus}`,
    `- Measurement source: ${context.measurementSource}`,
    ...publicFactLines,
    '',
    '## Publisher queue',
    publisherRows.length
      ? markdownTable(['Item ID', 'Channel', 'Queue', 'Publisher action', 'Owner', 'Proof needed'], publisherRows)
      : '- No assets supplied. Collect item id, channel, approval status, measurement status, and owner before Publisher staging. Required classification labels: approved-ready, draft-needs-approval, measurement-waiting, blocked.',
    '',
    '## Asset status queue',
    assetRows.length
      ? markdownTable(['Item ID', 'Title', 'Approval status', 'Measurement status', 'Proof / blocker'], assetRows)
      : '- No assets supplied. Queue classification is not available. Required classification order: approved-ready -> draft-needs-approval -> measurement-waiting -> blocked.',
    '',
    '## Approval backlog',
    markdownTable(
      ['Item ID', 'Approval owner', 'Decision needed', 'Required proof'],
      [
        ['campaign-record', context.approvalOwner, 'Lock campaign objective, audience, KPI, and stop rule', 'approver, timestamp, target URL, stop rule'],
        ...approvalRows
      ]
    ),
    '',
    '## Connector readiness',
    '- Publisher ingest: not verified. Queue rows are candidates, not created Publisher items.',
    `- Analytics/Search Console/CRM/Ads: ${context.connectorStatus}`,
    '- Channel execution: not_executed until the responsible channel agent or SaaS returns execution proof.',
    '',
    '## Planned action queue',
    '- Next now: save the Campaign record draft and stage only draft-needs-approval or approved-ready candidates for review.',
    '- Next after approval: ingest approved items into Publisher/app surfaces and record ingest id plus timestamp.',
    '- Next after measurement: classify each item as continue, revise, or stop only when execution proof and measurement data exist.',
    '',
    '## Now (Week 0-1)',
    `- Campaign record: lock ${context.primaryKpi} as the primary metric and set ${context.approvalOwner} as approval owner.`,
    '- Publisher candidates: draft-needs-approval waits for review, approved-ready can be staged, measurement-waiting stays in results review, and blocked stays out.',
    '- Measurement setup: save UTM fields, event names, first review date, and stop rule in CampaignMetric.',
    '- Week-one stop condition: do not advance external execution while approver, target URL, measurement source, or execution proof is missing.',
    '',
    '## Next (Week 1-3)',
    '- Entry condition: campaign approval, Publisher/connector readiness, measurement source, and first review date are confirmed.',
    '- Iteration work: use brand search impressions and qualified site sessions to adjust SEO, owned-site, and social copy.',
    '- Expansion candidates: only channels with signup/login starts or demo/contact starts move into the next Publisher candidate.',
    '- Week 1-3 stop condition: do not claim expansion, winner/loser decisions, or completed execution without approval proof, external execution proof, and measurement data.',
    '',
    '## Waiting conditions',
    '- waiting on approval: draft-needs-approval copy, URL, and stop rule.',
    '- waiting on connector: Publisher, Analytics/Search Console/CRM, social/ESP/ad execution proof.',
    '- waiting on measurement: first results and review date for measurement-waiting items.',
    '- blocked: items with unresolved blockers stay out of Publisher intake.',
    '',
    '## Measurement loop',
    markdownTable(['KPI', 'Role', 'Source', 'Decision rule'], kpiRows),
    `- Review cadence: ${context.measurementCadence}`,
    `- First review date: ${context.firstReviewDate}`,
    '',
    '## SaaS intake data',
    '```json',
    saasPayload,
    '```',
    '',
    '## Next action owner',
    `- ${context.approvalOwner}: approve the Campaign record and draft-needs-approval items.`,
    '- Campaign Operations: save the SaaS payload and sync Publisher candidates, approval backlog, and measurement waiting states.',
    '- CMO Leader: confirm channel priority and message fit.',
    '- Channel owners: execute externally only after approval and return execution id/URL/timestamp.',
    '',
    '## Boundaries',
    '- Keep strategy design in CMO Leader.',
    '- Keep channel-specific actions inside the responsible channel agent JS.',
    '- This is a Campaign/Publisher operations packet. It does not claim external publishing, sending, ad launch, or Publisher item creation.'
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
    requires: Object.freeze(['approved_assets_or_asset_gaps', 'channel_owner', 'review_owner', 'asset_approval_and_measurement_status']),
    prepares: Object.freeze(['publisher_queue_items', 'asset_status_queue', 'approval_backlog', 'connector_readiness']),
    produces: Object.freeze(['publisher_intake_packet']),
    cannotClaim: Object.freeze(['publisher_item_created', 'external_app_ingested', 'published', 'unapproved asset queued as approved', 'measurement-waiting asset treated as winner']),
    authorityBoundary: 'Publisher/app ingest must be proven by Publisher or connector response; asset queue classification is a planning label, not proof of approval, ingest, publication, or performance.'
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
  requiredDeliverySections: Object.freeze(['Campaign state', 'Campaign record draft', 'Source / connector ledger', 'Publisher queue', 'Asset status queue', 'Approval backlog', 'Connector readiness', 'Planned action queue', 'Now (Week 0-1)', 'Next (Week 1-3)', 'Waiting conditions', 'Measurement loop', 'SaaS intake data', 'Next action owner']),
  requiredEvidence: Object.freeze(['CMO design or campaign brief', 'campaign record fields', 'asset approval status per queue item', 'asset measurement status per measured/waiting item', 'Publisher ingest status', 'metric source status', 'approval status', 'connector readiness status', 'Week 0-1 completion or readiness status']),
  mustLabel: Object.freeze(['approved-ready', 'draft-needs-approval', 'measurement-waiting', 'blocked', 'not_ingested', 'not_executed', 'app ingest not verified', 'connector missing', 'blocked channel owner', 'waiting on approval', 'waiting on measurement', 'Week 1-3 gated', 'measurement-gated expansion']),
  forbiddenClaims: Object.freeze(['published', 'sent', 'launched', 'Publisher item created without proof', 'unapproved asset queued as approved', 'measurement-waiting asset treated as winner', 'blocked asset queued for Publisher ingest', 'blocked item ready', 'waiting item executed', 'week 0 action completed without proof', 'week 1-3 action completed without proof', 'expansion ready without measurement', 'outcome decided without measurement']),
  validDeliveryCheck: 'A valid campaign operations delivery preserves CMO/channel ownership, classifies each asset by approval and measurement status before Publisher intake, separates Week 0-1 actions, Next (Week 1-3) work, and waiting conditions, and names the next owner.'
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
    const deterministicArtifacts = campaignOperationsArtifacts(context);
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
        artifacts: generated?.artifacts?.length ? generated.artifacts : deterministicArtifacts,
        campaign_operations: {
          title: context.title,
          objective: context.objective,
          channels: context.channels,
          kpis: context.kpis,
          status: context.status,
          approval_owner: context.approvalOwner,
          connector_status: context.connectorStatus,
          publisher_item_count: context.assets.length
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
      output_contract: ['campaign_state', 'campaign_record_draft', 'source_connector_ledger', 'publisher_queue', 'asset_status_queue', 'approval_backlog', 'connector_readiness', 'planned_action_queue', 'now_week_0_1', 'next_week_1_3', 'waiting_conditions', 'measurement_loop', 'saas_intake_data', 'next_action_owner'],
      leader_handoff_mode: 'campaign_operations_mediated'
    }
  },
  systemPrompt: 'You are the built-in Campaign Operations Agent in AIagent2. You receive CMO Leader designs and turn them into campaign operations: Campaign state, Campaign record drafts, source/connector ledgers, Publisher intake queues, asset status queues, planned action queues, Week 0-1 action windows, Next (Week 1-3) action windows, waiting conditions, measurement plans, structured SaaS intake data, next actions, and SaaS connector readiness. You are not the CMO strategist and must not overwrite the CMO design unless the user explicitly asks for an operational adjustment. Always separate what happens next from what waits on approval, connector readiness, owner assignment, or measurement. Before Publisher intake, classify each channel asset as approved-ready, draft-needs-approval, measurement-waiting, or blocked using its approval status, measurement status, owner, and proof/source status. Approved-ready can be staged for review; draft-needs-approval needs owner approval; measurement-waiting stays in results review until data exists; blocked stays out of Publisher intake. The Now (Week 0-1) section must name only the immediate setup, staging, approval, and measurement-readiness work that can happen without pretending external execution occurred. The Next (Week 1-3) section must name only follow-on iteration or expansion work that becomes eligible after Week 0-1 approvals, connector readiness, and measurement source are confirmed; do not claim Week 1-3 work is complete or expansion-ready without proof and data. You do not directly publish, send email, run ads, or perform channel-specific actions. Channel-specific requests, authority requests, and execution packets belong inside the responsible channel agent JS. External publishing and compliance gates belong to Publisher. Measurement loops, progress state, structured SaaS payloads, and next-action recommendations belong to you.',
  deliverableHint: 'Deliver in the user requested language in a clear, user-readable format.',
  reviewHint: 'Respect CMO strategy ownership, Publisher compliance ownership, and channel-agent execution ownership.',
  outputSections: [
    'Campaign state',
    'Campaign record draft',
    'Source / connector ledger',
    'Publisher queue',
    'Asset status queue',
    'Approval backlog',
    'Connector readiness',
    'Planned action queue',
    'Now (Week 0-1)',
    'Next (Week 1-3)',
    'Waiting conditions',
    'Measurement loop',
    'SaaS intake data',
    'Next action owner'
  ],
  inputNeeds: [
    'CMO design or campaign brief',
    'Target audience and primary metric',
    'Channel assets or asset gaps',
    'Asset approval, measurement, owner, and proof status',
    'Publisher/compliance status',
    'Connector status for analytics, lead, CRM, ads, or channel apps'
  ],
  acceptanceChecks: [
    'Campaign state is separated from CMO strategy',
    'Campaign record draft includes objective, audience, target URL, status, approval owner, primary KPI, and source status',
    'Publisher queue items name asset owner and approval owner',
    'Asset status queue separates approved-ready, draft-needs-approval, measurement-waiting, and blocked items before Publisher intake',
    'SaaS intake data includes campaign record, publisher item candidates, ingest status, execution status, and measurement loop',
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
    'Classify every supplied asset by approval status, measurement status, owner, and proof/source status before deciding whether it can enter the Publisher queue.',
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
    'Do not treat unapproved, measurement-waiting, or blocked assets as approved Publisher-ready items.',
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
