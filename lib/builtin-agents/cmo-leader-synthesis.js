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

function cmoLeaderTextContainsGap(value = '') {
  return /not supplied|missing|not available|unavailable|not verified|unverified|no\s+(?:ga4|search console|sessions|conversions|queries|testimonials|proof|case studies|source)|未提供|不足|未確認|未検証|欠損|ない|取れていない/i.test(String(value || ''));
}

function cmoLeaderTableCell(value = '', max = 220) {
  return agentProviderText(value, '-')
    .replace(/\s+/g, ' ')
    .replace(/\|/g, '/')
    .slice(0, max)
    .trim() || '-';
}

function cmoLeaderTaskPerspectiveLabel(task = '', japanese = false) {
  const normalized = normalizedCmoTask(task);
  const english = {
    data_analysis: 'Access analytics',
    research: 'Market and intent review',
    teardown: 'Competitor/page review',
    validation: 'Assumption validation',
    media_planner: 'Channel planning',
    growth: 'Growth experiment design',
    seo_specialist: 'SEO page work',
    landing: 'Landing page review',
    writing: 'Conversion copy work',
    writer: 'Conversion copy work',
    reddit: 'Community post work',
    indie_hackers: 'Founder-community post work',
    list_creator: 'Lead/source list work'
  };
  const ja = {
    data_analysis: 'アクセス解析',
    research: '市場・検索意図レビュー',
    teardown: '競合・ページレビュー',
    validation: '仮説検証',
    media_planner: 'チャネル設計',
    growth: '成長実験設計',
    seo_specialist: 'SEOページ作成',
    landing: 'ランディングページ改善',
    writing: '訴求コピー作成',
    writer: '訴求コピー作成',
    reddit: 'コミュニティ投稿案',
    indie_hackers: '創業者コミュニティ投稿案',
    list_creator: 'リード/掲載先リスト'
  };
  return (japanese ? ja[normalized] : english[normalized]) || (japanese ? '補助作業' : 'Supporting work');
}

function cmoLeaderRunPerspectiveReason(run = {}) {
  const summary = cmoLeaderRunSummary(run) || cmoLeaderCleanMarkdown(cmoLeaderRunText(run), 260);
  if (cmoLeaderRunTask(run) !== 'data_analysis') return summary;
  const sessions = String(summary || '').match(/\bsessions?\s+([\d,.]+)/i) || String(summary || '').match(/\b([\d,.]+)\s+sessions?\b/i);
  const conversions = String(summary || '').match(/\bconversions?\s+([\d,.]+)/i) || String(summary || '').match(/\b([\d,.]+)\s+conversions?\b/i);
  if (!sessions?.[1]) return summary;
  return [
    `${sessions[1]} sessions`,
    conversions?.[1] ? `${conversions[1]} conversions` : ''
  ].filter(Boolean).join(' and ') + '.';
}

function cmoLeaderPerspectiveRowsFromRuns(priorRuns = [], japanese = false) {
  return priorRuns.slice(0, 10).map((run) => {
    const blocked = cmoLeaderRunBlocked(run);
    const templateLike = cmoLeaderRunLooksTemplate(run);
    const summary = cmoLeaderRunPerspectiveReason(run);
    return {
      perspective: cmoLeaderTaskPerspectiveLabel(cmoLeaderRunTask(run), japanese),
      use: blocked
        ? (japanese ? '保留' : 'Held')
        : (templateLike ? (japanese ? '要レビュー' : 'Review only') : (japanese ? '採用' : 'Used')),
      reason: summary || (japanese ? '要約なし。元成果物の確認が必要。' : 'No summary was supplied; review the source delivery before use.')
    };
  });
}

function cmoLeaderPerspectiveRowsFromSynthesis(leaderSynthesis = null, japanese = false) {
  if (Array.isArray(leaderSynthesis?.perspective_review_rows) && leaderSynthesis.perspective_review_rows.length) {
    return leaderSynthesis.perspective_review_rows;
  }
  const outputs = Array.isArray(leaderSynthesis?.specialist_outputs) ? leaderSynthesis.specialist_outputs : [];
  return outputs.slice(0, 10).map((item) => ({
    perspective: cmoLeaderTaskPerspectiveLabel(item.task_type, japanese),
    use: item.blocked ? (japanese ? '保留' : 'Held') : (item.template_like ? (japanese ? '要レビュー' : 'Review only') : (japanese ? '採用' : 'Used')),
    reason: item.summary || item.content_excerpt || (japanese ? '要約なし。元成果物の確認が必要。' : 'No summary was supplied; review the source delivery before use.')
  }));
}

function cmoLeaderPerspectiveReviewMarkdown(leaderSynthesis = null, japanese = false) {
  const rows = cmoLeaderPerspectiveRowsFromSynthesis(leaderSynthesis, japanese);
  if (!rows.length) return '';
  return [
    japanese ? '## 観点別レビュー' : '## Perspective review',
    japanese ? '| 観点 | この計画での扱い | 理由 |' : '| Perspective | Use in this plan | Reason |',
    '| --- | --- | --- |',
    ...rows.map((row) => `| ${cmoLeaderTableCell(row.perspective, 80)} | ${cmoLeaderTableCell(row.use, 60)} | ${cmoLeaderTableCell(row.reason, 260)} |`)
  ].join('\n');
}

function cmoLeaderSourceStatus(summary = '') {
  const text = String(summary || '');
  if (!text.trim()) return 'not_accessed';
  return cmoLeaderTextContainsGap(text) ? 'missing_or_partial' : 'supplied';
}

function cmoLeaderSourceCoverageRows(body = {}, priorRuns = [], japanese = false) {
  const rows = [];
  const add = (source, status, implication) => {
    const key = String(source || '').toLowerCase();
    if (!source || rows.some((row) => String(row.source || '').toLowerCase() === key)) return;
    rows.push({ source, status, implication });
  };
  const targetUrl = agentProviderPrimaryUrl(body);
  if (targetUrl) {
    add(
      japanese ? '対象URL' : 'Target URL',
      japanese ? '提供あり' : 'supplied',
      targetUrl
    );
  }
  const dataRun = priorRuns.find((run) => cmoLeaderRunTask(run) === 'data_analysis');
  const dataSummary = dataRun ? cmoLeaderRunSummary(dataRun) : '';
  add(
    'GA4 / analytics',
    dataRun ? (cmoLeaderSourceStatus(dataSummary) === 'missing_or_partial' ? (japanese ? '未提供/部分的' : 'missing or partial') : (japanese ? '提供あり' : 'supplied')) : (japanese ? '未アクセス' : 'not accessed'),
    dataSummary || (japanese ? 'セッション、CV、CVRは確認できません。' : 'Sessions, conversions, and CVR cannot be claimed.')
  );
  add(
    'Search Console',
    /search console/i.test(dataSummary) && !cmoLeaderTextContainsGap(dataSummary) ? (japanese ? '提供あり' : 'supplied') : (japanese ? '未提供/部分的' : 'missing or partial'),
    /search console/i.test(dataSummary) ? dataSummary : (japanese ? 'クエリ、ページ、クリック、掲載順位は未確認です。' : 'Queries, pages, clicks, and position are not confirmed.')
  );
  const researchRun = priorRuns.find((run) => ['research', 'teardown', 'validation'].includes(cmoLeaderRunTask(run)));
  add(
    japanese ? '現在のサイト/市場ソース' : 'Current site/market source',
    researchRun ? (cmoLeaderTextContainsGap(cmoLeaderRunSummary(researchRun)) ? (japanese ? '部分的' : 'partial') : (japanese ? '提供あり' : 'supplied')) : (japanese ? '未アクセス' : 'not accessed'),
    researchRun ? cmoLeaderRunSummary(researchRun) : (japanese ? 'サイト本文や市場ソースは確認できていません。' : 'Readable site copy or market sources were not supplied.')
  );
  const text = [agentProviderPublicBrief(body), ...priorRuns.map(cmoLeaderRunText)].join('\n');
  add(
    japanese ? '実績・証拠アセット' : 'Proof assets',
    /testimonial|case stud|proof|導入事例|実績|証拠/i.test(text) && !cmoLeaderTextContainsGap(text) ? (japanese ? '提供あり' : 'supplied') : (japanese ? '未提供/部分的' : 'missing or partial'),
    cmoLeaderTextContainsGap(text) ? (japanese ? '導入事例、顧客の声、成果数値は主張に使えません。' : 'Testimonials, case studies, and outcome metrics cannot be used as claims.') : (japanese ? '主張に使う前に承認済み表現へ限定します。' : 'Use only approved proof claims.')
  );
  const prepRuns = priorRuns.filter((run) => cmoLeaderHasPreparationRun([run]) && !cmoLeaderRunBlocked(run));
  if (prepRuns.length) {
    add(
      japanese ? '作成済みページ/コピー案' : 'Prepared page/copy work',
      japanese ? 'レビュー用に提供あり' : 'supplied for review',
      prepRuns.map((run) => `${cmoLeaderTaskPerspectiveLabel(cmoLeaderRunTask(run), japanese)}: ${cmoLeaderRunSummary(run)}`).join(' / ')
    );
  }
  return rows.slice(0, 7);
}

function cmoLeaderSourceCoverageMarkdown(leaderSynthesis = null, japanese = false) {
  const rows = Array.isArray(leaderSynthesis?.source_coverage_rows) ? leaderSynthesis.source_coverage_rows : [];
  if (!rows.length) return '';
  return [
    japanese ? '## 情報ソースの充足状況' : '## Source coverage ledger',
    japanese ? '| ソース | 状態 | 判断への影響 |' : '| Source | Status | Implication |',
    '| --- | --- | --- |',
    ...rows.map((row) => `| ${cmoLeaderTableCell(row.source, 90)} | ${cmoLeaderTableCell(row.status, 80)} | ${cmoLeaderTableCell(row.implication, 260)} |`)
  ].join('\n');
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
  const selectedRun = cmoLeaderSelectedRun(priorRuns);
  const selectedFields = selectedRun ? cmoLeaderSelectedFields(selectedRun, body) : null;
  const selectedSurface = selectedRun ? cmoLeaderSurfaceForRun(selectedRun) : null;
  return {
    mode: 'llm_leader_evaluation_required',
    leader_role: 'CMO team leader',
    leader_phase: phase,
    requested_language: japanese ? 'Japanese' : 'English',
    user_request: agentProviderPublicBrief(body).slice(0, 2000),
    target_url: agentProviderPrimaryUrl(body),
    evidence_items: cmoLeaderEvidenceItems(body, priorRuns),
    source_coverage_rows: cmoLeaderSourceCoverageRows(body, priorRuns, japanese),
    perspective_review_rows: cmoLeaderPerspectiveRowsFromRuns(priorRuns, japanese),
    selected_review_packet: selectedRun ? {
      task_type: cmoLeaderRunTask(selectedRun),
      perspective: cmoLeaderTaskPerspectiveLabel(cmoLeaderRunTask(selectedRun), japanese),
      blocked: cmoLeaderRunBlocked(selectedRun),
      summary: cmoLeaderRunSummary(selectedRun),
      surface: selectedSurface,
      fields: selectedFields
    } : null,
    specialist_outputs: cmoLeaderSpecialistOutputPackets(priorRuns),
    evaluation_contract: [
      'Evaluate every specialist output using its actual content, not only task type or phase.',
      'Deduplicate repeated recommendations and produce one integrated final CMO delivery.',
      'Do not repeat the same analytics baseline, caveat, or next-input list across multiple sections; state shared facts once and reference their implication.',
      'Treat channel and social packets as supporting material unless they contain approved copy/assets and explicit app metadata.',
      'Convert prior work into business-readable perspectives; do not expose agent names, task ids, or specialist adoption wording in file_markdown.',
      'Separate verified facts, assumptions, gaps, and blocked actions.',
      'Use the supplied perspective_review_rows and source_coverage_rows as the minimum factual scaffold; do not replace them with generic channel advice.',
      'Choose exactly one selected_review_packet as the primary item to approve next, while keeping any machine-ingest data in report artifacts only.',
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
      publisher_ingest_verified: publisherIngestProof.length > 0,
      selected_review_packet: selectedRun ? {
        task_type: cmoLeaderRunTask(selectedRun),
        perspective: cmoLeaderTaskPerspectiveLabel(cmoLeaderRunTask(selectedRun), japanese),
        surface: selectedSurface,
        fields: selectedFields
      } : null
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

function cmoLeaderSynthesisIsJapanese(leaderSynthesis = null, markdown = '') {
  const requested = String(leaderSynthesis?.requested_language || '').toLowerCase();
  if (/japanese|日本語|ja|jp/.test(requested)) return true;
  if (/english|英語|en/.test(requested)) return false;
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(String(markdown || ''));
}

function cmoLeaderHasSection(markdown = '', titles = []) {
  return titles.some((title) => {
    const escaped = String(title || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^##\\s+${escaped}\\s*$`, 'im').test(markdown);
  });
}

function cmoLeaderReplaceOrPrependSection(markdown = '', sectionMarkdown = '', titles = []) {
  if (!sectionMarkdown) return markdown;
  const titleAlternation = titles.map((title) => String(title || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const pattern = new RegExp(`(^|\\n)##\\s+(?:${titleAlternation})\\s*\\n[\\s\\S]*?(?=\\n##\\s+|$)`, 'i');
  if (pattern.test(markdown)) return markdown.replace(pattern, (_match, prefix = '') => `${prefix}${sectionMarkdown}`);
  const lines = markdown.split('\n');
  const insertAt = lines.findIndex((line, index) => index > 0 && /^##\s+/.test(line));
  if (insertAt > 0) {
    return [...lines.slice(0, insertAt), '', sectionMarkdown, '', ...lines.slice(insertAt)].join('\n');
  }
  return [markdown, '', sectionMarkdown].filter(Boolean).join('\n');
}

function cmoLeaderAppendSectionIfMissing(markdown = '', sectionMarkdown = '', titles = []) {
  if (!sectionMarkdown || cmoLeaderHasSection(markdown, titles)) return markdown;
  return [markdown, '', sectionMarkdown].filter(Boolean).join('\n');
}

function cmoLeaderInsertSectionAfter(markdown = '', sectionMarkdown = '', afterTitles = [], titles = []) {
  if (!sectionMarkdown || cmoLeaderHasSection(markdown, titles)) return markdown;
  const lines = String(markdown || '').split('\n');
  const normalizedAfterTitles = new Set(afterTitles.map((title) => String(title || '').trim().toLowerCase()).filter(Boolean));
  const headingMatches = (line = '') => {
    const match = String(line || '').trim().match(/^#{1,6}\s+(.+)$/);
    if (!match?.[1]) return false;
    return normalizedAfterTitles.has(String(match[1]).trim().toLowerCase());
  };
  const headingIndex = lines.findIndex(headingMatches);
  if (headingIndex < 0) return cmoLeaderAppendSectionIfMissing(markdown, sectionMarkdown, titles);
  let insertAt = lines.length;
  for (let index = headingIndex + 1; index < lines.length; index += 1) {
    if (/^#{1,6}\s+/.test(String(lines[index] || '').trim())) {
      insertAt = index;
      break;
    }
  }
  return [
    ...lines.slice(0, insertAt),
    '',
    sectionMarkdown,
    '',
    ...lines.slice(insertAt)
  ].join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function cmoLeaderSynthesisRequestField(leaderSynthesis = null, labels = []) {
  const text = String(leaderSynthesis?.user_request || '');
  return cmoLeaderLabeledValue(text, labels);
}

function cmoLeaderConfirmedFactsMarkdown(leaderSynthesis = null, japanese = false) {
  const packet = leaderSynthesis?.selected_review_packet || {};
  const fields = packet.fields && typeof packet.fields === 'object' ? packet.fields : {};
  const perspectiveRows = Array.isArray(leaderSynthesis?.perspective_review_rows)
    ? leaderSynthesis.perspective_review_rows
    : [];
  const product = cmoLeaderSynthesisRequestField(leaderSynthesis, ['Product/service', 'Product', 'Service', 'Business', 'サービス', '商品']);
  const goal = cmoLeaderSynthesisRequestField(leaderSynthesis, ['Goal', 'Main goal', 'Objective', '目的']);
  const target = fields.targetUrl || leaderSynthesis?.target_url || '';
  const selectedTitle = fields.title || fields.h1 || packet.summary || packet.perspective || '';
  const lines = [];
  if (target) lines.push(japanese ? `- 対象URL: ${target}` : `- Target URL: ${target}`);
  if (product) lines.push(japanese ? `- サービス/商品: ${product}` : `- Product/service: ${product}`);
  if (goal) lines.push(japanese ? `- 目的: ${goal}` : `- Goal: ${goal}`);
  if (perspectiveRows.length) {
    lines.push(japanese
      ? `- 確認済みの専門成果物: ${perspectiveRows.length}件を統合対象としてレビュー。`
      : `- Reviewed workstreams: ${perspectiveRows.length} prior specialist output(s).`);
  }
  if (selectedTitle) {
    lines.push(japanese
      ? `- 最初の承認候補: ${packet.perspective || 'レビュー用成果物'} / ${selectedTitle}`
      : `- First approval candidate: ${packet.perspective || 'review item'} / ${selectedTitle}`);
  }
  if (!lines.length) return '';
  return [
    japanese ? '## 確認済みの事実' : '## Confirmed facts',
    ...lines
  ].join('\n');
}

function cmoLeaderCoverageRowsWithGaps(leaderSynthesis = null) {
  return (Array.isArray(leaderSynthesis?.source_coverage_rows) ? leaderSynthesis.source_coverage_rows : [])
    .filter((row) => {
      const source = String(row.source || '');
      const status = String(row.status || '');
      if (/prepared page|prepared copy|作成済みページ|コピー案/i.test(source) && /supplied|提供|レビュー用/i.test(status)) {
        return false;
      }
      return /missing|partial|not accessed|unknown|unverified|未提供|部分|未アクセス|未確認|未検証|不足/i.test(`${status} ${row.implication || ''}`);
    })
    .slice(0, 6);
}

function cmoLeaderOpenQuestionsMarkdown(leaderSynthesis = null, japanese = false) {
  const rows = cmoLeaderCoverageRowsWithGaps(leaderSynthesis);
  const heldRows = (Array.isArray(leaderSynthesis?.perspective_review_rows) ? leaderSynthesis.perspective_review_rows : [])
    .filter((row) => /held|review only|保留|要レビュー/i.test(`${row.use || ''}`))
    .slice(0, 4);
  const lines = [];
  for (const row of rows) {
    lines.push(japanese
      ? `- ${row.source}: ${row.implication || row.status}`
      : `- ${row.source}: ${row.implication || row.status}`);
  }
  for (const row of heldRows) {
    lines.push(japanese
      ? `- ${row.perspective}: ${row.reason || '承認または追加ソースが必要。'}`
      : `- ${row.perspective}: ${row.reason || 'Needs approval or more source evidence.'}`);
  }
  if (!lines.length) {
    lines.push(japanese
      ? '- 未確認の数値、証拠、承認条件は実行前にオーナー確認が必要。'
      : '- Unverified numbers, proof, and approval conditions still need owner confirmation before execution.');
  }
  return [
    japanese ? '## まだ判断できないこと' : '## Open questions',
    ...lines
  ].join('\n');
}

function cmoLeaderPriorityDiagnosisMarkdown(leaderSynthesis = null, japanese = false) {
  const packet = leaderSynthesis?.selected_review_packet || {};
  const fields = packet.fields && typeof packet.fields === 'object' ? packet.fields : {};
  const selected = packet.perspective || fields.title || (japanese ? '最初の承認候補' : 'the first approval item');
  const gapRows = cmoLeaderCoverageRowsWithGaps(leaderSynthesis);
  const hasMeasurementGap = gapRows.some((row) => /ga4|analytics|search console|計測|検索/i.test(`${row.source || ''} ${row.implication || ''}`));
  const hasProofGap = gapRows.some((row) => /proof|testimonial|case|実績|証拠|導入/i.test(`${row.source || ''} ${row.implication || ''}`));
  const reason = japanese
    ? [
        `${selected} を最初に承認対象にします。`,
        hasMeasurementGap ? '計測/検索データが不足しているため、チャネル拡大より前にイベント名と取得期間を固定します。' : '計測前提は大きく崩れていないため、承認済み素材の配布へ進めます。',
        hasProofGap ? '実績・成果主張は未確認なので、認知拡大では「何を自動化するか」と「次に何をすればよいか」を先に明確化します。' : '使える証拠は承認済み表現に限定して配布素材へ反映します。'
      ].join(' ')
    : [
        `Make ${selected} the first approval item.`,
        hasMeasurementGap ? 'Because measurement/search data is incomplete, fix event names and the reporting window before scaling channels.' : 'Measurement prerequisites do not block reuse of approved material.',
        hasProofGap ? 'Because proof is incomplete, awareness work should lead with what is automated and the next action instead of outcome claims.' : 'Use proof only in approved language.'
      ].join(' ');
  return [
    japanese ? '## 優先診断' : '## Priority diagnosis',
    reason
  ].join('\n');
}

function cmoLeaderChannelPriorityRows(leaderSynthesis = null, japanese = false) {
  const packet = leaderSynthesis?.selected_review_packet || {};
  const taskType = normalizedCmoTask(packet.task_type || '');
  const perspectiveRows = Array.isArray(leaderSynthesis?.perspective_review_rows) ? leaderSynthesis.perspective_review_rows : [];
  const hasCommunity = perspectiveRows.some((row) => /community|reddit|indie|コミュニティ/i.test(`${row.perspective || ''} ${row.reason || ''}`));
  const hasLeadGap = perspectiveRows.some((row) => /lead|list|リード|掲載先/i.test(`${row.perspective || ''} ${row.reason || ''}`));
  const primaryLane = /seo/.test(taskType)
    ? (japanese ? 'SEO/自社ページ' : 'SEO / owned page')
    : (/landing|writing|writer/.test(taskType)
      ? (japanese ? 'LP/訴求コピー' : 'Landing page / conversion copy')
      : (japanese ? '自社面の認知導線' : 'Owned awareness surface'));
  const selectedTitle = packet.fields?.title || packet.fields?.h1 || packet.perspective || '-';
  const rows = [{
    rank: 1,
    channel: primaryLane,
    why: japanese
      ? `${packet.perspective || '承認候補'}に具体ドラフトがあり、外部実行なしでレビューに進められる。`
      : `${packet.perspective || 'review item'} has a concrete draft and can move to review without claiming external execution.`,
    asset: selectedTitle,
    metric: japanese ? '表示回数、CTAクリック、CV開始' : 'impressions, CTA clicks, conversion starts',
    stop: japanese ? 'クリックが出なければ訴求/証拠を修正' : 'revise proof/offer if clicks do not follow traffic'
  }];
  if (hasCommunity) {
    rows.push({
      rank: 2,
      channel: japanese ? '創業者/実務者コミュニティ配布' : 'Founder/operator community distribution',
      why: japanese ? '宣伝ではなく課題共有として認知を広げられる。' : 'Can extend awareness through problem-led distribution instead of direct promotion.',
      asset: japanese ? 'コミュニティ投稿案' : 'community post packet',
      metric: japanese ? '参照流入、保存/返信、CTAクリック' : 'referrals, saves/replies, CTA clicks',
      stop: japanese ? '反応が薄ければ投稿角度を変更' : 'change angle if engagement is weak'
    });
  }
  rows.push({
    rank: rows.length + 1,
    channel: hasLeadGap ? (japanese ? 'リード/アウトバウンド' : 'Lead sourcing / outbound') : (japanese ? '有料広告/広域配信' : 'Paid or broad distribution'),
    why: hasLeadGap
      ? (japanese ? '公開ソース条件や対象リストが未確定なので後回し。' : 'Hold until source rules and reviewed targets exist.')
      : (japanese ? '計測と訴求が固まるまで学習効率が低い。' : 'Less efficient until measurement and messaging are validated.'),
    asset: japanese ? '保留キュー' : 'held queue',
    metric: japanese ? '承認済み行数、返信率、CV' : 'approved rows, reply rate, conversions',
    stop: japanese ? '根拠/承認なしでは実行しない' : 'do not execute without evidence and approval'
  });
  return rows;
}

function cmoLeaderChannelPriorityMarkdown(leaderSynthesis = null, japanese = false) {
  const rows = cmoLeaderChannelPriorityRows(leaderSynthesis, japanese);
  return [
    japanese ? '## チャネル優先順位' : '## Channel priority table',
    japanese ? '| 優先 | チャネル | 理由 | 使う成果物 | 指標 | 停止条件 |' : '| Priority | Channel | Why now | Asset | Metric | Stop rule |',
    '| --- | --- | --- | --- | --- | --- |',
    ...rows.map((row) => `| ${row.rank} | ${cmoLeaderTableCell(row.channel, 90)} | ${cmoLeaderTableCell(row.why, 220)} | ${cmoLeaderTableCell(row.asset, 160)} | ${cmoLeaderTableCell(row.metric, 120)} | ${cmoLeaderTableCell(row.stop, 160)} |`)
  ].join('\n');
}

function cmoLeaderPrimaryReviewMarkdown(leaderSynthesis = null, japanese = false) {
  const packet = leaderSynthesis?.selected_review_packet;
  if (!packet || packet.blocked) return '';
  const fields = packet.fields && typeof packet.fields === 'object' ? packet.fields : {};
  const surface = packet.surface && typeof packet.surface === 'object' ? packet.surface : {};
  const title = fields.title || fields.h1 || `${packet.perspective || 'Review item'} for ${fields.host || leaderSynthesis?.target_url || 'target'}`;
  const cta = fields.primaryCta || '';
  const bodyDraft = cmoLeaderCleanMarkdown(fields.bodyDraft || '', 520);
  const reviewSurface = surface.connector === 'publisher'
    ? (japanese ? '公開レビュー画面' : 'publishing review surface')
    : (surface.surface || (japanese ? 'レビュー画面' : 'review surface'));
  return japanese
    ? [
        '## 最初に承認する成果物',
        `- 対象: ${cmoLeaderTableCell(packet.perspective || 'レビュー用成果物', 120)}`,
        `- タイトル: ${cmoLeaderTableCell(title, 180)}`,
        fields.h1 ? `- H1/見出し: ${cmoLeaderTableCell(fields.h1, 180)}` : '',
        cta ? `- 主CTA: ${cmoLeaderTableCell(cta, 120)}` : '',
        `- レビュー面: ${cmoLeaderTableCell(reviewSurface, 120)}`,
        '- 状態: チャット内のドラフトです。外部公開、投稿、送信、登録は実行していません。',
        bodyDraft ? `- 本文抜粋: ${cmoLeaderTableCell(bodyDraft, 260)}` : ''
      ].filter(Boolean).join('\n')
    : [
        '## First approval item',
        `- Item: ${cmoLeaderTableCell(packet.perspective || 'Review item', 120)}`,
        `- Title: ${cmoLeaderTableCell(title, 180)}`,
        fields.h1 ? `- H1/headline: ${cmoLeaderTableCell(fields.h1, 180)}` : '',
        cta ? `- Primary CTA: ${cmoLeaderTableCell(cta, 120)}` : '',
        `- Review surface: ${cmoLeaderTableCell(reviewSurface, 120)}`,
        '- Status: draft material only; no external publishing, posting, sending, or submission is claimed.',
        bodyDraft ? `- Body excerpt: ${cmoLeaderTableCell(bodyDraft, 260)}` : ''
      ].filter(Boolean).join('\n');
}

function cmoLeaderTwoWeekPlanMarkdown(leaderSynthesis = null, japanese = false) {
  const packet = leaderSynthesis?.selected_review_packet || {};
  const perspective = packet.perspective || (japanese ? '最優先成果物' : 'primary review item');
  return japanese
    ? [
        '## 2週間の実行計画',
        '| 期間 | アクション | 成果物 | 承認/停止条件 |',
        '| --- | --- | --- | --- |',
        `| 1-2日目 | ${cmoLeaderTableCell(perspective, 80)}をオーナーが確認し、主張・CTA・公開面を決める | 修正版ドラフト | 証拠のない成果主張は削除 |`,
        '| 3-5日目 | 計測イベントとUTMを決め、公開前チェックリストを埋める | 計測仕様と公開チェック | CVイベント未確認なら公開より先に計測設定 |',
        '| 6-10日目 | 承認済みコピーを自社面と1つの配布チャネルへ展開する | 公開/投稿候補の承認キュー | 外部実行証跡が出るまで実行済み扱いにしない |',
        '| 11-14日目 | 流入、CTAクリック、登録開始を見て次の改善を決める | 学習メモと次回実験案 | 有効流入がCTAへ進まなければ訴求/証拠を先に修正 |'
      ].join('\n')
    : [
        '## 2-week execution plan',
        '| Window | Action | Output | Approval / stop rule |',
        '| --- | --- | --- | --- |',
        `| Days 1-2 | Owner reviews the ${cmoLeaderTableCell(perspective, 80)} and approves claims, CTA, and surface | Revised draft | Remove unsupported proof or outcome claims |`,
        '| Days 3-5 | Define measurement events and UTMs before publication | Measurement spec and launch checklist | If conversion tracking is unknown, instrument before publishing |',
        '| Days 6-10 | Reuse approved copy on the owned surface and one distribution channel | Review queue for publish/post candidates | Do not mark anything executed without proof |',
        '| Days 11-14 | Review traffic, CTA clicks, and conversion starts | Learning memo and next experiment | If qualified traffic does not click, revise proof and offer clarity first |'
      ].join('\n');
}

function cmoLeaderMeasurementMarkdown(japanese = false) {
  return japanese
    ? [
        '## 計測チェックリスト',
        '- 対象URLへのセッション、参照元、UTMを同じ期間で確認する。',
        '- primary_cta_click と account_create_start または lead_submit のイベント名を固定する。',
        '- Search Console はクエリ、ページ、クリック、表示回数、平均掲載順位を同じ期間で出す。',
        '- 公開/投稿/送信は、URL、時刻、担当者、証跡が揃うまで実行済みと書かない。',
        '- 7日後に「流入あり/クリックなし」「クリックあり/登録なし」「登録あり」の3パターンで次アクションを分ける。'
      ].join('\n')
    : [
        '## Measurement checklist',
        '- Track sessions, referrer/source, and UTM values for the target URL over one date range.',
        '- Fix event names for primary_cta_click and account_create_start or lead_submit.',
        '- Export Search Console query, page, clicks, impressions, and average position for the same window.',
        '- Do not mark publishing, posting, or sending complete until URL, timestamp, owner, and proof exist.',
        '- After 7 days, split the next decision into traffic/no click, click/no conversion, or conversion observed.'
      ].join('\n');
}

function cmoLeaderNextInputsMarkdown(japanese = false) {
  return japanese
    ? [
        '## 次に必要な情報',
        '- GA4または同等の計測で、登録開始/問い合わせ/購入など主要CVイベント名と直近期間の数値。',
        '- Search Console のクエリ、ページ、クリック、表示回数、平均掲載順位。',
        '- 現在のファーストビュー、CTA、料金/導入手順、公開済み記事一覧。',
        '- 使ってよい実績、導入事例、顧客の声、画面キャプチャの承認可否。',
        '- 外部公開や投稿を実行してよい担当者、承認条件、停止条件。'
      ].join('\n')
    : [
        '## Inputs needed next',
        '- GA4 or equivalent primary conversion event name and recent metrics.',
        '- Search Console queries, pages, clicks, impressions, and average position.',
        '- Current hero, CTA, pricing/setup copy, and published content inventory.',
        '- Approved proof assets: testimonials, case studies, screenshots, or outcome metrics.',
        '- Owner, approval condition, and stop rule for any external publication or posting.'
      ].join('\n');
}

function cmoLeaderNormalizeMarkdownLanguage(markdown = '', japanese = false) {
  if (!japanese) return markdown;
  return markdown
    .replace(/^#\s*Growth improvement plan\b/im, '# 認知拡大プラン')
    .replace(/^##\s*Direct answer\b/im, '## 先に結論')
    .replace(/^##\s*Integrated final recommendation\b/im, '## 推奨アクション')
    .replace(/^##\s*Implementation status\b/im, '## 実行ステータス')
    .replace(/^##\s*Implementation draft\b/im, '## 実装ドラフト')
    .replace(/^##\s*Not used in final recommendation\b/im, '## 今回使わないもの')
    .replace(/^##\s*Inputs needed next\b/im, '## 次に必要な情報')
    .replace(/\bThe prior analysis has been consolidated into one business-facing growth plan\./gi, '専門作業の結果を統合し、一般認知を増やすための実行案にまとめました。')
    .replace(/\bUse the landing\/SEO copy where substantiated, keep analytics tracking validation as the first required action, and hold blocked lead\/list work\./gi, 'まず自社ページの説明とSEO向けコピーを承認対象にし、同時に計測イベントを確定します。リード/掲載先リストはソース方針が出るまで保留します。')
    .replace(/\bNo external publishing, posting, scheduling, sending, repository write, or tool execution is claimed\./gi, '外部公開、投稿、予約、送信、リポジトリ書き込み、ツール実行は主張していません。')
    .replace(/^Title:\s*/gim, 'タイトル: ')
    .replace(/^Primary CTA:\s*/gim, '主CTA: ');
}

function cmoLeaderNormalizeLeaderMarkdown(markdown = '', leaderSynthesis = null) {
  const text = String(markdown || '');
  const japanese = cmoLeaderSynthesisIsJapanese(leaderSynthesis, text);
  const perspective = cmoLeaderPerspectiveReviewMarkdown(leaderSynthesis, japanese);
  const coverage = cmoLeaderSourceCoverageMarkdown(leaderSynthesis, japanese);
  const confirmedFacts = cmoLeaderConfirmedFactsMarkdown(leaderSynthesis, japanese);
  const openQuestions = cmoLeaderOpenQuestionsMarkdown(leaderSynthesis, japanese);
  const priorityDiagnosis = cmoLeaderPriorityDiagnosisMarkdown(leaderSynthesis, japanese);
  const channelPriority = cmoLeaderChannelPriorityMarkdown(leaderSynthesis, japanese);
  const primaryReview = cmoLeaderPrimaryReviewMarkdown(leaderSynthesis, japanese);
  let normalized = text
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
    .replace(/\bThe CMO leader evaluated all specialist outputs and integrated the usable work into one final recommendation\./gi, 'The prior analysis has been consolidated into one business-facing growth plan.');
  normalized = cmoLeaderReplaceOrPrependSection(normalized, perspective, ['Adoption matrix', 'Perspective review', '採用判断表', '観点別レビュー']);
  normalized = cmoLeaderInsertSectionAfter(normalized, confirmedFacts, ['Direct answer', 'Executive summary', '先に結論'], ['Confirmed facts', '確認済みの事実']);
  normalized = cmoLeaderInsertSectionAfter(normalized, coverage, ['Confirmed facts', '確認済みの事実', 'Perspective review', '観点別レビュー'], ['Source coverage ledger', '情報ソースの充足状況']);
  normalized = cmoLeaderInsertSectionAfter(normalized, openQuestions, ['Source coverage ledger', '情報ソースの充足状況'], ['Open questions', 'まだ判断できないこと']);
  normalized = cmoLeaderInsertSectionAfter(normalized, priorityDiagnosis, ['Open questions', 'まだ判断できないこと'], ['Priority diagnosis', '優先診断']);
  normalized = cmoLeaderInsertSectionAfter(normalized, channelPriority, ['Priority diagnosis', '優先診断'], ['Channel priority table', 'チャネル優先順位']);
  normalized = cmoLeaderAppendSectionIfMissing(normalized, primaryReview, ['First approval item', '最初に承認する成果物']);
  normalized = cmoLeaderAppendSectionIfMissing(normalized, cmoLeaderTwoWeekPlanMarkdown(leaderSynthesis, japanese), ['2-week execution plan', '2週間の実行計画']);
  normalized = cmoLeaderAppendSectionIfMissing(normalized, cmoLeaderMeasurementMarkdown(japanese), ['Measurement checklist', '計測チェックリスト']);
  normalized = normalized
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
  normalized = cmoLeaderNormalizeMarkdownLanguage(normalized, japanese);
  normalized = cmoLeaderAppendSectionIfMissing(normalized, cmoLeaderNextInputsMarkdown(japanese), ['Inputs needed next', 'Next actions', '次に必要な情報', '次のアクション']);
  return normalized
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function cmoLeaderNormalizeArtifactText(value = '') {
  return agentProviderValueText(value || '')
    .replace(/✅\s*Landing page change packet\s*\(prepared[^)]*\)/gi, 'Review draft prepared in chat (not ingested)')
    .replace(/\bLanding page change packet\s*\(prepared[^)]*\)/gi, 'Review draft prepared in chat (not ingested)')
    .replace(/\bLanding page change packet prepared\b/gi, 'Review draft prepared in chat')
    .replace(/\bPublisher packet created\b/gi, 'Review draft prepared in chat')
    .replace(/\bPublisher item created\b/gi, 'Review draft prepared in chat')
    .replace(/(?:\*\*)?Publish status(?:\*\*)?\s*[:：]\s*(?:\*\*)?prepared\s*\/\s*not externally published(?:\*\*)?/gi, 'Publish status: not published')
    .replace(/(?:\*\*)?Publish status(?:\*\*)?\s*[:：]\s*(?:\*\*)?prepared\s*\/\s*not published(?:\*\*)?/gi, 'Publish status: not published')
    .replace(/\bprepared\s*\/\s*not externally published\b/gi, 'not ingested / not published')
    .replace(/\bprepared\s*\/\s*not published\b/gi, 'not ingested / not published')
    .replace(/\bPublisher handoff draft prepared in chat\b/gi, 'Draft material only; no external execution is claimed')
    .replace(/^\s*-\s*External app ingest status:\s*not verified\s*$/gim, '')
    .replace(/^\s*-\s*Publish status:\s*not published\s*$/gim, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function cmoLeaderReviewPacketArtifactBody(leaderSynthesis = null) {
  const packet = leaderSynthesis?.selected_review_packet;
  if (!packet || packet.blocked) return '';
  const fields = packet.fields && typeof packet.fields === 'object' ? packet.fields : {};
  return [
    fields.title ? `Title: ${fields.title}` : '',
    fields.h1 ? `H1: ${fields.h1}` : '',
    fields.metaDescription ? `Meta description: ${fields.metaDescription}` : '',
    fields.primaryCta ? `Primary CTA: ${fields.primaryCta}` : '',
    fields.bodyDraft ? `Body draft:\n${fields.bodyDraft}` : '',
    fields.targetUrl ? `Target URL: ${fields.targetUrl}` : (leaderSynthesis?.target_url ? `Target URL: ${leaderSynthesis.target_url}` : ''),
    'Execution status: draft material only; not ingested and not published without proof.'
  ].filter(Boolean).join('\n');
}

function cmoLeaderMergeArtifactBody(currentBody = '', packetBody = '') {
  const current = cmoLeaderNormalizeArtifactText(currentBody || '');
  const packet = cmoLeaderNormalizeArtifactText(packetBody || '');
  if (!packet) return current;
  if (!current) return packet;
  const additions = [];
  const packetLower = packet.toLowerCase();
  const currentBlocks = current.split(/\n(?=(?:Title|H1|Meta description|Primary CTA|Body draft|Target URL|Execution status):)/i);
  for (const block of currentBlocks) {
    const text = block.trim();
    if (!text) continue;
    const label = String(text.split(':', 1)[0] || '').trim().toLowerCase();
    if (label && packetLower.includes(`${label}:`)) continue;
    if (packetLower.includes(text.toLowerCase())) continue;
    additions.push(text);
  }
  return [packet, ...additions].filter(Boolean).join('\n');
}

function cmoLeaderDefaultArtifactsFromSynthesis(leaderSynthesis = null) {
  const packet = leaderSynthesis?.selected_review_packet;
  if (!packet || packet.blocked) return [];
  const surface = packet.surface && typeof packet.surface === 'object' ? packet.surface : {};
  if (!surface.connector || surface.connector === 'none') return [];
  const fields = packet.fields && typeof packet.fields === 'object' ? packet.fields : {};
  const body = [
    fields.title ? `Title: ${fields.title}` : '',
    fields.h1 ? `H1: ${fields.h1}` : '',
    fields.metaDescription ? `Meta description: ${fields.metaDescription}` : '',
    fields.primaryCta ? `Primary CTA: ${fields.primaryCta}` : '',
    fields.bodyDraft ? `\n${fields.bodyDraft}` : ''
  ].filter(Boolean).join('\n');
  return [{
    id: 'cmo-leader-selected-review-packet',
    surface: surface.connector === 'publisher' ? 'publisher' : surface.surface,
    destination: surface.surface,
    connector: surface.connector,
    action_type: surface.actionType,
    content_type: surface.actionType,
    item_type: surface.itemType,
    title: fields.title || `${packet.perspective || 'Review packet'} for ${fields.host || leaderSynthesis?.target_url || 'target'}`,
    summary: packet.summary || '',
    body,
    metadata: {
      prepared_in_chat: true,
      ingest_status: 'not_ingested',
      publish_status: 'not_published',
      selected_perspective: packet.perspective || '',
      target_url: fields.targetUrl || leaderSynthesis?.target_url || ''
    }
  }];
}

function cmoLeaderNormalizeLeaderArtifacts(artifacts = [], leaderSynthesis = null) {
  const proof = leaderSynthesis?.handoff_boundary?.publisher_ingest_verified === true;
  const packet = leaderSynthesis?.selected_review_packet;
  const fields = packet?.fields && typeof packet.fields === 'object' ? packet.fields : {};
  const packetBody = cmoLeaderReviewPacketArtifactBody(leaderSynthesis);
  const sourceArtifacts = Array.isArray(artifacts) && artifacts.length
    ? artifacts
    : cmoLeaderDefaultArtifactsFromSynthesis(leaderSynthesis);
  return sourceArtifacts.length
    ? sourceArtifacts.map((artifact) => {
        if (!artifact || typeof artifact !== 'object') return artifact;
        const connector = String(artifact.connector || artifact.surface || artifact.destination || '').toLowerCase();
        if (!/publisher/.test(connector)) return artifact;
        const metadata = artifact.metadata && typeof artifact.metadata === 'object' ? artifact.metadata : {};
        const mergedBody = cmoLeaderMergeArtifactBody(artifact.body || '', packetBody);
        return {
          ...artifact,
          title: cmoLeaderNormalizeArtifactText(artifact.title || fields.title || fields.h1 || ''),
          summary: cmoLeaderNormalizeArtifactText(artifact.summary || packet?.summary || packet?.perspective || ''),
          reason: cmoLeaderNormalizeArtifactText(artifact.reason || ''),
          body: mergedBody,
          metadata: {
            ...metadata,
            prepared_in_chat: true,
            ingest_status: proof ? agentProviderText(metadata.ingest_status || metadata.ingestStatus, 'verified') : 'not_ingested',
            publish_status: 'not_published',
            selected_perspective: agentProviderText(metadata.selected_perspective || packet?.perspective || ''),
            target_url: agentProviderText(metadata.target_url || fields.targetUrl || leaderSynthesis?.target_url || '')
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
  const fileMarkdown = cmoLeaderNormalizeLeaderMarkdown(delivery.fileMarkdown || '', leaderSynthesis);
  const artifacts = cmoLeaderNormalizeLeaderArtifacts(delivery.artifacts || [], leaderSynthesis);
  return {
    ...delivery,
    fileMarkdown,
    contentType: 'cmo_leader_delivery',
    artifacts
  };
}
