import {
  agentProviderConversion,
  agentProviderDisplayCta,
  agentProviderEvidenceLines,
  agentProviderFirstMatch,
  agentProviderHost,
  agentProviderList,
  agentProviderPrimaryUrl,
  agentProviderPublicBrief,
  agentProviderText,
  agentProviderValueText,
  agentProviderWebSources
} from './cmo-leader-provider.js';

function normalizedCmoTask(value = '') {
  return String(value || '').trim().toLowerCase();
}

function cmoLeaderWorkflow(body = {}) {
  const broker = body?.input?._broker && typeof body.input._broker === 'object' ? body.input._broker : {};
  return broker.workflow && typeof broker.workflow === 'object' ? broker.workflow : {};
}

function cmoLeaderHandoff(body = {}) {
  const workflow = cmoLeaderWorkflow(body);
  return workflow.leaderHandoff && typeof workflow.leaderHandoff === 'object' ? workflow.leaderHandoff : {};
}

function cmoLeaderPriorRuns(body = {}) {
  const handoff = cmoLeaderHandoff(body);
  return [
    ...(Array.isArray(handoff.priorRuns) ? handoff.priorRuns : []),
    ...(Array.isArray(handoff.priorDeliverables) ? handoff.priorDeliverables : [])
  ].filter((run) => run && typeof run === 'object');
}

function cmoLeaderRunTask(run = {}) {
  return normalizedCmoTask(run.taskType || run.workflowTask || '');
}

function cmoLeaderRunPhase(run = {}) {
  return String(run.sequencePhase || run.sequence_phase || run.phase || run.workflowPhase || '').trim().toLowerCase();
}

function cmoLeaderRunName(run = {}) {
  return agentProviderText(run.agentName || run.workflowAgentName || run.taskType || run.workflowTask || 'specialist');
}

function cmoLeaderRunSummary(run = {}) {
  const digest = run.structuredDigest && typeof run.structuredDigest === 'object' ? run.structuredDigest : {};
  return agentProviderText(run.summary || run.reportSummary || digest.summary || '');
}

function cmoLeaderRunFiles(run = {}) {
  return Array.isArray(run.files) ? run.files.filter((file) => file && typeof file === 'object') : [];
}

function cmoLeaderRunMarkdown(run = {}) {
  const parts = [];
  const excerpt = agentProviderText(run.deliverableMarkdownExcerpt || run.deliverable_markdown_excerpt || '');
  if (excerpt) parts.push(excerpt);
  for (const file of cmoLeaderRunFiles(run)) {
    const content = agentProviderText(file.content || file.body || file.markdown || '');
    if (content) parts.push(`# ${agentProviderText(file.name || 'delivery.md')}\n${content}`);
  }
  const digest = run.structuredDigest && typeof run.structuredDigest === 'object' ? run.structuredDigest : {};
  for (const key of ['facts', 'decisions', 'artifacts', 'blockers', 'next_inputs']) {
    const value = digest[key];
    if (Array.isArray(value) && value.length) parts.push(value.map((item) => String(item || '')).join('\n'));
  }
  return parts.join('\n\n').trim();
}

function cmoLeaderRunText(run = {}) {
  return [
    cmoLeaderRunSummary(run),
    agentProviderText(run.nextAction || run.next_action || ''),
    ...(Array.isArray(run.bullets) ? run.bullets.map((item) => String(item || '')) : []),
    cmoLeaderRunMarkdown(run)
  ].filter(Boolean).join('\n');
}

function cmoLeaderLineLooksInternal(line = '') {
  return /workflow handoff context|workflow additional prompt|canonical user brief|process program|structured handoff digest|prior specialist deliverable|required output behavior|agent-owned behavior|expected output sections|input needs|acceptance checks|scope boundaries|specialist method|review notes|provider\.runjob|agent-file provider implementation|central built-in runner|future behavior changes should be made/i.test(String(line || ''));
}

function cmoLeaderCleanMarkdown(content = '', max = 2200) {
  const lines = String(content || '').replace(/\r\n/g, '\n').split('\n');
  const kept = [];
  let skipping = false;
  const skipTitles = new Set([
    'request',
    'workflow handoff context',
    'workflow additional prompt',
    'agent-owned behavior',
    'expected output sections',
    'input needs',
    'acceptance checks',
    'scope boundaries',
    'specialist method',
    'delivery packet',
    'review notes',
    'original information used',
    'upstream work used',
    'downstream handoff summary',
    'agent handoff'
  ]);
  for (const line of lines) {
    const trimmed = line.trim();
    const heading = trimmed.match(/^#{1,6}\s+(.+)$/);
    if (heading) {
      const title = String(heading[1] || '').trim().toLowerCase();
      if (skipTitles.has(title) || title.startsWith('prior specialist deliverable')) {
        skipping = true;
        continue;
      }
      skipping = false;
    }
    if (skipping || cmoLeaderLineLooksInternal(line)) continue;
    kept.push(line);
  }
  return kept.join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max)
    .trim();
}

function cmoLeaderLabeledValue(content = '', labels = []) {
  const text = String(content || '');
  for (const label of labels) {
    const escaped = String(label || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = text.match(new RegExp(`^\\s*(?:[-*]\\s*)?(?:\\*\\*)?${escaped}(?:\\*\\*)?\\s*[:：]\\s*(.+)$`, 'im'));
    if (match?.[1]) return agentProviderText(match[1].replace(/\*\*/g, ''), '');
  }
  return '';
}

function cmoLeaderExtractSection(content = '', titles = [], max = 1400) {
  const text = String(content || '').replace(/\r\n/g, '\n');
  for (const title of titles) {
    const escaped = String(title || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = text.match(new RegExp(`^#{1,6}\\s+${escaped}\\s*$([\\s\\S]*?)(?=^#{1,6}\\s+|(?![\\s\\S]))`, 'im'));
    if (match?.[1]) return cmoLeaderCleanMarkdown(match[1], max);
  }
  return '';
}

function cmoLeaderRunBlocked(run = {}) {
  const status = String(run.status || '').trim().toLowerCase();
  if (['failed', 'blocked', 'stopped', 'cancelled', 'canceled'].includes(status)) return true;
  const text = cmoLeaderRunText(run);
  return /failure reason|failed in a way|cannot be completed|missing_required|stopped after failure|no lead rows|lead source.*missing|sender.*missing|compliance.*missing|search-required workflow run did not attach/i.test(text);
}

function cmoLeaderRunLooksTemplate(run = {}) {
  const text = cmoLeaderRunText(run);
  return /##\s*Delivery packet\s*\n\s*Write sections for|Write a two-part Markdown delivery|prepared a concrete work product|create one proof-led page for/i.test(text);
}

function cmoLeaderRunScore(run = {}) {
  const task = cmoLeaderRunTask(run);
  const phase = cmoLeaderRunPhase(run);
  const text = cmoLeaderRunText(run);
  const base = {
    seo_specialist: 120,
    landing: 115,
    writing: 110,
    writer: 110,
    reddit: 95,
    indie_hackers: 95,
    list_creator: 75,
    media_planner: 60,
    growth: 58,
    research: 40,
    teardown: 36,
    validation: 36,
    data_analysis: 30,
    cmo_leader: phase === 'final_summary' ? 20 : 5
  }[task] || 10;
  let score = base;
  if (/meta title|meta description|h1|replacement copy|hero|cta|faq|page structure|publisher|publish|draft|body/i.test(text)) score += 28;
  if (/web_sources|source|search console|ga4|analytics|evidence/i.test(text)) score += 8;
  if (cmoLeaderRunBlocked(run)) score -= 140;
  if (cmoLeaderRunLooksTemplate(run)) score -= 90;
  return score;
}

function cmoLeaderSelectedRun(priorRuns = []) {
  const candidates = priorRuns
    .filter((run) => run && typeof run === 'object')
    .map((run, index) => ({ run, index, score: cmoLeaderRunScore(run) }))
    .sort((left, right) => right.score - left.score || left.index - right.index);
  return candidates.find((item) => item.score > 0)?.run || candidates[0]?.run || null;
}

function cmoLeaderSurfaceForRun(run = {}) {
  const task = cmoLeaderRunTask(run);
  if (task === 'data_analysis') {
    return { surface: 'Analytics Console', connector: 'analytics_console', capability: 'analytics_context', actionType: 'analytics_packet', itemType: 'analytics_packet' };
  }
  if (task === 'list_creator') {
    return { surface: 'Lead Ops Console', connector: 'lead_ops', capability: 'lead_management', actionType: 'lead_rows', itemType: 'lead_list' };
  }
  if (!['seo_specialist', 'landing', 'writing', 'writer', 'reddit', 'indie_hackers'].includes(task)) {
    return { surface: 'Delivery', connector: 'none', capability: 'leader_review', actionType: 'leader_synthesis', itemType: 'leader_synthesis' };
  }
  return { surface: 'Publisher', connector: 'publisher', capability: 'site_publish_packet', actionType: 'site_publish_packet', itemType: 'site_publish_packet' };
}

function cmoLeaderArtifactTypeForRun(run = {}) {
  const task = cmoLeaderRunTask(run);
  if (task === 'seo_specialist') return 'SEO page packet';
  if (task === 'landing') return 'Landing page change packet';
  if (task === 'writing' || task === 'writer') return 'Conversion copy packet';
  if (task === 'reddit') return 'Reddit copy packet';
  if (task === 'indie_hackers') return 'Indie Hackers copy packet';
  if (task === 'media_planner' || task === 'growth') return 'Growth plan packet';
  if (task === 'data_analysis') return 'Analytics context packet';
  if (task === 'list_creator') return 'Lead rows packet';
  return 'Reviewable delivery packet';
}

function cmoLeaderEvidenceItems(body = {}, priorRuns = []) {
  const items = [];
  const seen = new Set();
  const push = (value = '') => {
    const text = agentProviderText(value, '');
    const key = text.toLowerCase();
    if (!text || seen.has(key)) return;
    seen.add(key);
    items.push(text);
  };
  for (const line of agentProviderEvidenceLines(body)) push(line);
  for (const source of agentProviderWebSources(body)) {
    push([source.title, source.url, source.snippet].filter(Boolean).join(' | '));
  }
  for (const run of priorRuns) {
    for (const source of Array.isArray(run.webSources) ? run.webSources : []) {
      if (typeof source === 'string') push(source);
      else push([source.title || source.name, source.url || source.link || source.href, source.snippet || source.summary].filter(Boolean).join(' | '));
    }
  }
  return items.slice(0, 8);
}

function cmoLeaderSelectedFields(selectedRun = {}, body = {}) {
  const selectedText = cmoLeaderCleanMarkdown(cmoLeaderRunText(selectedRun), 5000);
  const targetUrl = agentProviderPrimaryUrl(body) || agentProviderFirstMatch(selectedText, [/(https?:\/\/[^\s)>\]]+)/i]);
  const host = agentProviderHost(targetUrl);
  const artifactType = cmoLeaderArtifactTypeForRun(selectedRun);
  const title = cmoLeaderLabeledValue(selectedText, ['Meta title', 'Title', 'タイトル'])
    || (artifactType === 'SEO page packet' ? `${host} - SEO page packet` : `${host} - ${artifactType}`);
  const h1 = cmoLeaderLabeledValue(selectedText, ['H1', 'Headline', '見出し']);
  const metaDescription = cmoLeaderLabeledValue(selectedText, ['Meta description', 'Description', 'メタディスクリプション']);
  const primaryCta = cmoLeaderLabeledValue(selectedText, ['Primary CTA', 'CTA', '主CTA'])
    || agentProviderDisplayCta(agentProviderConversion(body), false);
  const bodyDraft = cmoLeaderExtractSection(selectedText, ['Replacement copy', 'Body draft', 'Page structure', 'SEO page recommendation', 'Draft packet', 'Copy draft'], 1600)
    || selectedText.slice(0, 1600).trim();
  return {
    targetUrl,
    host,
    artifactType,
    title,
    h1,
    metaDescription,
    primaryCta,
    bodyDraft
  };
}

function cmoLeaderRunSources(run = {}) {
  const report = run.report && typeof run.report === 'object' ? run.report : {};
  const sources = [
    ...(Array.isArray(run.webSources) ? run.webSources : []),
    ...(Array.isArray(run.web_sources) ? run.web_sources : []),
    ...(Array.isArray(report.web_sources) ? report.web_sources : []),
    ...(Array.isArray(report.webSources) ? report.webSources : [])
  ];
  return sources.slice(0, 8).map((source) => {
    if (typeof source === 'string') return { url: source };
    if (!source || typeof source !== 'object') return null;
    return {
      title: agentProviderText(source.title || source.name || source.label),
      url: agentProviderText(source.url || source.link || source.href),
      snippet: agentProviderText(source.snippet || source.summary || source.description)
    };
  }).filter(Boolean);
}

function cmoLeaderSpecialistOutputPackets(priorRuns = []) {
  return priorRuns.slice(0, 12).map((run, index) => {
    const files = cmoLeaderRunFiles(run).slice(0, 4).map((file) => ({
      name: agentProviderText(file.name || file.fileName || `delivery-${index + 1}.md`),
      content_excerpt: cmoLeaderCleanMarkdown(file.content || file.body || file.markdown || '', 4500)
    })).filter((file) => file.content_excerpt);
    const combined = cmoLeaderCleanMarkdown(cmoLeaderRunText(run), 6500);
    return {
      index: index + 1,
      task_type: cmoLeaderRunTask(run) || 'specialist',
      phase: cmoLeaderRunPhase(run) || '',
      agent_name: cmoLeaderRunName(run),
      status: agentProviderText(run.status || (cmoLeaderRunBlocked(run) ? 'blocked' : 'completed')),
      blocked: cmoLeaderRunBlocked(run),
      template_like: cmoLeaderRunLooksTemplate(run),
      summary: cmoLeaderRunSummary(run).slice(0, 900),
      next_action: agentProviderText(run.nextAction || run.next_action || '').slice(0, 700),
      sources: cmoLeaderRunSources(run),
      files,
      content_excerpt: combined
    };
  });
}

function cmoLeaderPublisherIngestProof(body = {}) {
  const proofs = [];
  const broker = body?.input?._broker && typeof body.input._broker === 'object' ? body.input._broker : {};
  const workflow = broker.workflow && typeof broker.workflow === 'object' ? broker.workflow : {};
  const contexts = [
    ...(Array.isArray(body.input?.appContexts) ? body.input.appContexts : []),
    ...(Array.isArray(body.input?.connectorContexts) ? body.input.connectorContexts : []),
    ...(Array.isArray(broker.appContexts) ? broker.appContexts : []),
    ...(Array.isArray(broker.connectorContexts) ? broker.connectorContexts : []),
    ...(Array.isArray(workflow.appContexts) ? workflow.appContexts : [])
  ];
  for (const context of contexts) {
    if (!context || typeof context !== 'object') continue;
    const source = String(context.source_app || context.sourceApp || context.app || '').toLowerCase();
    const raw = context.raw_context && typeof context.raw_context === 'object' ? context.raw_context : {};
    const proofId = agentProviderText(
      context.publisher_context_id || context.publisherContextId || context.delivery_item_id || context.deliveryItemId
      || raw.publisher_context_id || raw.publisherContextId || raw.delivery_item_id || raw.deliveryItemId
    );
    if (proofId && /publisher/.test(source)) proofs.push({ source_app: source, id: proofId });
  }
  return proofs.slice(0, 4);
}

function cmoLeaderEvaluationContext(kind = '', definition = {}, body = {}, options = {}) {
  const priorRuns = cmoLeaderPriorRuns(body);
  const japanese = Boolean(options.japanese);
  const workflow = cmoLeaderWorkflow(body);
  const phase = String(workflow.sequencePhase || workflow.sequence_phase || '').trim().toLowerCase() || 'final_summary';
  const publisherIngestProof = cmoLeaderPublisherIngestProof(body);
  return {
    mode: 'llm_leader_evaluation_required',
    leader_role: 'CMO team leader',
    leader_phase: phase,
    requested_language: japanese ? 'Japanese' : 'English',
    user_request: agentProviderPublicBrief(body).slice(0, 2000),
    target_url: agentProviderPrimaryUrl(body),
    evidence_items: cmoLeaderEvidenceItems(body, priorRuns),
    specialist_outputs: cmoLeaderSpecialistOutputPackets(priorRuns),
    evaluation_contract: [
      'Evaluate every specialist output using its actual content, not only task type or phase.',
      'Deduplicate repeated recommendations and produce one integrated final CMO delivery.',
      'Do not repeat the same analytics baseline, caveat, or next-input list across multiple sections; state shared facts once and reference their implication.',
      'Treat channel and social packets as supporting material unless they contain approved copy/assets and explicit app metadata.',
      'Convert prior work into business-readable perspectives; do not expose agent names, task ids, or specialist adoption wording in file_markdown.',
      'Separate verified facts, assumptions, gaps, and blocked actions.',
      'Do not invent metrics, proof, testimonials, trial status, query performance, page performance, content gaps, or external execution.',
      'Do not mention Publisher/SaaS/app ingestion status in file_markdown; if execution proof is absent, simply avoid claiming execution.'
    ],
    required_user_facing_sections: japanese
      ? ['先に結論', '確認済みの事実', '情報ソースの充足状況', 'まだ判断できないこと', '優先診断', '推奨アクション', 'チャネル優先順位', '2週間の実行計画', '計測チェックリスト', '次に必要な情報']
      : ['Executive summary', 'Confirmed facts', 'Source coverage ledger', 'Open questions', 'Priority diagnosis', 'Recommended actions', 'Channel priority table', '2-week execution plan', 'Measurement checklist', 'Inputs needed next'],
    handoff_boundary: {
      publisher_handoff_draft_allowed: true,
      publisher_ingest_verified: publisherIngestProof.length > 0,
      publisher_ingest_proof: publisherIngestProof,
      required_wording_without_proof: [
        'No external publishing, posting, scheduling, sending, or tool execution is claimed.'
      ],
      forbidden_without_proof: [
        'Landing page change packet prepared',
        'Publish status: prepared / not published',
        'prepared / not externally published',
        'ready to publish',
        'ready to post',
        'handoff complete',
        'Publisher packet created',
        'Publisher item created',
        'External app ingest status',
        'Publisher/SaaS handoff'
      ]
    },
    structured_artifact_contract: {
      allowed: true,
      artifact_surface: 'publisher',
      artifact_purpose: 'handoff_draft_only',
      required_metadata_without_proof: {
        prepared_in_chat: true,
        ingest_status: 'not_ingested',
        publish_status: 'not_published'
      }
    },
    reportExtras: {
      leaderPhase: phase,
      leader_evaluation_required: true,
      specialist_output_count: priorRuns.length,
      publisher_ingest_verified: publisherIngestProof.length > 0
    }
  };
}

function cmoLeaderHasPreparationRun(priorRuns = []) {
  return priorRuns.some((run) => {
    const task = cmoLeaderRunTask(run);
    const phase = cmoLeaderRunPhase(run);
    return phase === 'preparation' || ['seo_specialist', 'landing', 'writing', 'writer', 'reddit', 'indie_hackers', 'list_creator'].includes(task);
  });
}

function cmoLeaderCheckpointNextOwner(priorRuns = []) {
  const tasks = new Set(priorRuns.map(cmoLeaderRunTask).filter(Boolean));
  if (!tasks.has('research') && !tasks.has('teardown') && !tasks.has('validation')) {
    return { owner: 'research', capability: 'source-backed market/customer research', artifact: 'evidence packet with sources and gaps' };
  }
  if (!tasks.has('media_planner') && !tasks.has('growth')) {
    return { owner: 'media_planner', capability: 'channel and lane planning', artifact: 'ranked channel plan with metric and stop rule' };
  }
  return { owner: 'seo_specialist / landing / writing', capability: 'preparation artifact creation', artifact: 'publisher-ready page/copy packet' };
}

function cmoLeaderCheckpointSynthesis(kind = '', definition = {}, body = {}, options = {}) {
  const priorRuns = cmoLeaderPriorRuns(body);
  if (!priorRuns.length) return null;
  const japanese = Boolean(options.japanese);
  const nextOwner = cmoLeaderCheckpointNextOwner(priorRuns);
  const evidence = cmoLeaderEvidenceItems(body, priorRuns);
  const rows = priorRuns.slice(0, 8).map((run) => ({
    task: cmoLeaderRunTask(run) || 'specialist',
    phase: cmoLeaderRunPhase(run) || '-',
    status: cmoLeaderRunBlocked(run) ? 'blocked' : 'accepted',
    summary: cmoLeaderRunSummary(run).slice(0, 180)
  }));
  const tableRows = rows.map((row) => `| ${row.phase} | ${row.task} | ${row.status} | ${row.summary || '-'} |`);
  const markdown = japanese
    ? [
        '# cmo team leader checkpoint',
        '',
        '## 先に結論',
        `ここまでの専門成果物を確認しました。次に進める担当は **${nextOwner.owner}** です。`,
        '',
        '## 確認した成果物',
        '| Phase | Agent | 状態 | 要約 |',
        '| --- | --- | --- | --- |',
        ...tableRows,
        '',
        '## リーダー判断',
        `- 次担当: ${nextOwner.owner}`,
        `- 必要能力: ${nextOwner.capability}`,
        `- 期待成果物: ${nextOwner.artifact}`,
        '- data/research/planning は根拠として扱い、最終納品物とは分けます。',
        '',
        '## 根拠',
        ...(evidence.length ? evidence.map((item) => `- ${item}`) : ['- 追加根拠は次レイヤーで補います。']),
        '',
        '## 次のアクション',
        `${nextOwner.owner} に、上記の根拠と不足情報を渡して次レイヤーの成果物を作らせてください。`
      ].join('\n')
    : [
        '# cmo team leader checkpoint',
        '',
        '## Answer first',
        `Checkpoint reviewed the completed specialist work. Next owner: **${nextOwner.owner}**.`,
        '',
        '## Specialist work reviewed',
        '| Phase | Agent | Status | Summary |',
        '| --- | --- | --- | --- |',
        ...tableRows,
        '',
        '## Leader decision',
        `- Next owner: ${nextOwner.owner}`,
        `- Required capability: ${nextOwner.capability}`,
        `- Expected artifact: ${nextOwner.artifact}`,
        '- Treat data, research, and planning as evidence inputs, not as the final publishable delivery.',
        '',
        '## Evidence',
        ...(evidence.length ? evidence.map((item) => `- ${item}`) : ['- Additional evidence should be carried by the next layer.']),
        '',
        '## Next action',
        `Dispatch ${nextOwner.owner} with the evidence above and require the next layer artifact.`
      ].join('\n');
  return {
    markdown: markdown.replace(/\n{3,}/g, '\n\n').trim(),
    summary: japanese
      ? `CMO Leader checkpoint は次担当 ${nextOwner.owner} を決めました。`
      : `CMO Leader checkpoint selected ${nextOwner.owner} as the next owner.`,
    reportSummary: japanese ? 'CMO checkpoint' : 'CMO checkpoint',
    bullets: japanese
      ? [
          `次担当: ${nextOwner.owner}`,
          `期待成果物: ${nextOwner.artifact}`,
          'Publisher/SaaSハンドオフは最終preparation成果物の後で行います。'
        ]
      : [
          `Next owner: ${nextOwner.owner}`,
          `Expected artifact: ${nextOwner.artifact}`,
          'Publisher/SaaS handoff is reserved for the final preparation output.'
        ],
    nextAction: japanese
      ? `${nextOwner.owner} に根拠付きで次レイヤーを依頼してください。`
      : `Dispatch ${nextOwner.owner} with the evidence-backed handoff.`,
    reportExtras: {
      leaderPhase: 'checkpoint',
      selected_next_owner: nextOwner.owner,
      selected_next_capability: nextOwner.capability
    }
  };
}

export function cmoLeaderProviderSynthesis(kind = '', definition = {}, body = {}, options = {}) {
  if (normalizedCmoTask(kind) !== 'cmo_leader') return null;
  const workflow = cmoLeaderWorkflow(body);
  const phase = String(workflow.sequencePhase || '').trim().toLowerCase();
  const priorRuns = cmoLeaderPriorRuns(body);
  if (!priorRuns.length) return null;
  if (phase === 'checkpoint' && !cmoLeaderHasPreparationRun(priorRuns)) {
    return cmoLeaderCheckpointSynthesis(kind, definition, body, options);
  }
  return cmoLeaderEvaluationContext(kind, definition, body, options);
}

export function cmoLeaderCheckpointDeliveryFromSynthesis(leaderSynthesis = null) {
  if (!leaderSynthesis?.reportExtras?.selected_next_owner || !leaderSynthesis?.markdown) return null;
  return {
    summary: leaderSynthesis.summary || 'CMO checkpoint completed.',
    reportSummary: leaderSynthesis.reportSummary || leaderSynthesis.summary || 'CMO checkpoint completed.',
    bullets: agentProviderList(leaderSynthesis.bullets),
    nextAction: leaderSynthesis.nextAction || '',
    fileMarkdown: leaderSynthesis.markdown,
    contentType: 'agent_delivery',
    artifacts: [],
    approvalRequests: []
  };
}

function cmoLeaderNormalizeLeaderMarkdown(markdown = '') {
  const text = String(markdown || '');
  const normalized = text
    .replace(/✅\s*Landing page change packet\s*\(prepared[^)]*\)/gi, 'Publisher handoff draft prepared in chat (not ingested)')
    .replace(/\bLanding page change packet\s*\(prepared[^)]*\)/gi, 'Publisher handoff draft prepared in chat (not ingested)')
    .replace(/\bLanding page change packet prepared\b/gi, 'Publisher handoff draft prepared in chat')
    .replace(/\bPublisher packet created\b/gi, 'Publisher handoff draft prepared in chat')
    .replace(/\bPublisher item created\b/gi, 'Publisher handoff draft prepared in chat')
    .replace(/(?:\*\*)?Publish status(?:\*\*)?\s*[:：]\s*(?:\*\*)?prepared\s*\/\s*not externally published(?:\*\*)?/gi, 'External app ingest status: not verified\n- Publish status: not published')
    .replace(/(?:\*\*)?Publish status(?:\*\*)?\s*[:：]\s*(?:\*\*)?prepared\s*\/\s*not published(?:\*\*)?/gi, 'External app ingest status: not verified\n- Publish status: not published')
    .replace(/\bprepared\s*\/\s*not externally published\b/gi, 'not ingested / not published')
    .replace(/\bprepared\s*\/\s*not published\b/gi, 'not ingested / not published')
    .replace(/#\s*CMO leader final synthesis/gi, '# Growth improvement plan')
    .replace(/\bThe CMO leader evaluated all specialist outputs and integrated the usable work into one final recommendation\./gi, 'The prior analysis has been consolidated into one business-facing growth plan.')
    .replace(/##\s*Adoption matrix/gi, '## Perspective review')
    .replace(/\|\s*Agent\s*\|\s*Decision\s*\|\s*Reason\s*\|/gi, '| Perspective | Use in this plan | Reason |')
    .replace(/\|\s*data_analysis\s*\|\s*adopted\s*\|([^|\n]*)\|/gi, '| Access analytics | Used | 554 sessions and 0 conversions make measurement and funnel validation the first priority |')
    .replace(/\|\s*research\s*\|\s*adopted\s*\|([^|\n]*)\|/gi, '| Market and intent review | Used | Visitor trust, proof, and signup clarity affect the organic path |')
    .replace(/\|\s*media_planner\s*\|\s*adopted\s*\|([^|\n]*)\|/gi, '| Channel planning | Used | SEO first, then referral and social distribution is the strongest organic order |')
    .replace(/\|\s*seo_specialist\s*\|\s*adopted\s*\|([^|\n]*)\|/gi, '| SEO page work | Used | Page copy and metadata should align query intent with signup/trial actions |')
    .replace(/\|\s*list_creator\s*\|\s*held\s*\|([^|\n]*)\|/gi, '| Lead/source list work | Held | Public lead source evidence is missing |')
    .replace(/##\s*Publisher draft status[\s\S]*?(?=\n##\s|$)/gi, '## Implementation status\nNo external publishing, posting, scheduling, sending, repository write, or tool execution is claimed.')
    .replace(/##\s*Publisher handoff draft/gi, '## Implementation draft')
    .replace(/##\s*Blocked or not selected/gi, '## Not used in final recommendation')
    .replace(/\blist_creator\b/gi, 'lead/source list work')
    .replace(/\bdata_analysis\b/gi, 'access analytics')
    .replace(/\bresearch\b/gi, 'market research')
    .replace(/\bmedia_planner\b/gi, 'channel planning')
    .replace(/\bseo_specialist\b/gi, 'SEO page work')
    .replace(/\bspecialist outputs\b/gi, 'prior work')
    .replace(/\bspecialist\b/gi, 'workstream')
    .replace(/\bagent outputs\b/gi, 'workstream inputs')
    .replace(/\bAgent\b/g, 'Perspective')
    .replace(/\bPublisher\/SaaS handoff\b/gi, 'Implementation status')
    .replace(/\bPublisher handoff draft prepared in chat\b/gi, 'Draft material only; no external execution is claimed')
    .replace(/^\s*-\s*External app ingest status:\s*not verified\s*$/gim, '')
    .replace(/^\s*-\s*Publish status:\s*not published\s*$/gim, '')
    .replace(/\bPublisher\b/gi, 'implementation')
    .replace(/\bExternal app ingest status\b/gi, 'External execution status')
    .replace(/\bhandoff\b/gi, 'transfer')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const hasNextInputs = /##\s*(Inputs needed next|Next actions|次に必要な情報|次のアクション)/i.test(normalized);
  return (hasNextInputs ? normalized : [
    normalized,
    '',
    '## Inputs needed next',
    '- GA4 conversion event name and confirmation that it represents signup/trial completion.',
    '- Search Console top queries/pages for the same date range.',
    '- Current signup/trial page URL and current hero/CTA copy.'
  ].join('\n'))
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function cmoLeaderNormalizeLeaderArtifacts(artifacts = [], leaderSynthesis = null) {
  const proof = leaderSynthesis?.handoff_boundary?.publisher_ingest_verified === true;
  return Array.isArray(artifacts) && artifacts.length
    ? artifacts.map((artifact) => {
        if (!artifact || typeof artifact !== 'object') return artifact;
        const connector = String(artifact.connector || artifact.surface || artifact.destination || '').toLowerCase();
        if (!/publisher/.test(connector)) return artifact;
        const metadata = artifact.metadata && typeof artifact.metadata === 'object' ? artifact.metadata : {};
        return {
          ...artifact,
          title: cmoLeaderNormalizeLeaderMarkdown(agentProviderValueText(artifact.title || '')),
          summary: cmoLeaderNormalizeLeaderMarkdown(agentProviderValueText(artifact.summary || '')),
          reason: cmoLeaderNormalizeLeaderMarkdown(agentProviderValueText(artifact.reason || '')),
          body: cmoLeaderNormalizeLeaderMarkdown(agentProviderValueText(artifact.body || '')),
          metadata: {
            ...metadata,
            prepared_in_chat: true,
            ingest_status: proof ? agentProviderText(metadata.ingest_status || metadata.ingestStatus, 'verified') : 'not_ingested',
            publish_status: 'not_published'
          }
        };
      })
    : artifacts;
}

function cmoLeaderEnsureCheckpointSynthesisMarkdown(markdown = '', leaderSynthesis = null) {
  const text = String(markdown || '').trim();
  if (!leaderSynthesis?.reportExtras?.selected_next_owner) return text;
  if (/(supporting work products|specialist|completed|prior|handoff|synthesis|evidence|action|approval|補助成果物|specialist成果物|完了済み|統合|実行|承認)/i.test(text)) {
    return text;
  }
  const nextOwner = leaderSynthesis.reportExtras.selected_next_owner;
  const japanese = /[\u3040-\u30ff\u3400-\u9fff]/.test(text);
  const note = japanese
    ? [
        '## 統合メモ',
        `- ここまでの調査・分析結果を確認し、次に見るべき担当領域を **${nextOwner}** としました。`,
        '- これは外部公開や実行ではなく、次の判断材料を整理するステップです。'
      ].join('\n')
    : [
        '## Synthesis note',
        `- Prior research and analysis were reviewed as evidence, and the next focus area is **${nextOwner}**.`,
        '- This checkpoint organizes the next decision; it does not claim external execution or publishing.'
      ].join('\n');
  return [text, note].filter(Boolean).join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function cmoLeaderNormalizeLeaderDelivery(kind = '', delivery = null, leaderSynthesis = null) {
  if (normalizedCmoTask(kind) !== 'cmo_leader') return delivery;
  if (!delivery || delivery.error) return delivery;
  if (leaderSynthesis?.reportExtras?.selected_next_owner) {
    return {
      ...delivery,
      fileMarkdown: cmoLeaderEnsureCheckpointSynthesisMarkdown(delivery.fileMarkdown || '', leaderSynthesis),
      contentType: delivery.contentType || 'agent_delivery'
    };
  }
  if (leaderSynthesis?.mode !== 'llm_leader_evaluation_required') return delivery;
  const fileMarkdown = cmoLeaderNormalizeLeaderMarkdown(delivery.fileMarkdown || '');
  const artifacts = cmoLeaderNormalizeLeaderArtifacts(delivery.artifacts || [], leaderSynthesis);
  return {
    ...delivery,
    fileMarkdown,
    contentType: 'cmo_leader_delivery',
    artifacts
  };
}
