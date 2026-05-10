const MAX_BODY_CHARS = 120000;
const MAX_SUMMARY_CHARS = 2000;

function nowIso() {
  return new Date().toISOString();
}

function safeText(value = '', max = 2000) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function safeId(value = '') {
  return safeText(value, 180).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
}

function stableHash(value = '') {
  let hash = 2166136261;
  const text = String(value || '');
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function compactObject(value, depth = 0) {
  if (value == null) return value;
  if (depth > 5) return safeText(JSON.stringify(value), 1200);
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => compactObject(item, depth + 1));
  if (typeof value !== 'object') return typeof value === 'string' ? safeText(value, 6000) : value;
  const output = {};
  for (const [key, item] of Object.entries(value)) {
    if (/token|secret|password|private[_-]?key|api[_-]?key|bearer/i.test(key)) {
      output[key] = item ? '[redacted]' : item;
      continue;
    }
    output[safeText(key, 100)] = compactObject(item, depth + 1);
  }
  return output;
}

function markdownHeading(content = '') {
  const text = String(content || '');
  const heading = text.match(/^\s*#\s+(.+)$/m);
  if (heading?.[1]) return safeText(heading[1], 240);
  const title = text.match(/^\s*(?:title|headline|件名|タイトル|h1候補)\s*[:：]\s*(.+)$/im);
  return title?.[1] ? safeText(title[1], 240) : '';
}

function labeledValue(content = '', labels = []) {
  const text = String(content || '');
  for (const label of labels) {
    const escaped = String(label).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = text.match(new RegExp(`^\\s*(?:[-*]\\s*)?(?:\\*\\*)?${escaped}(?:\\*\\*)?\\s*[:：]\\s*(.+)$`, 'im'));
    if (match?.[1]) return safeText(match[1].replace(/\*\*/g, ''), 600);
  }
  return '';
}

function requesterLoginFromJob(job = {}) {
  const requester = job?.input?._broker?.requester && typeof job.input._broker.requester === 'object'
    ? job.input._broker.requester
    : {};
  return safeText(requester.login || requester.email || '', 240).toLowerCase();
}

function workflowParentId(job = {}) {
  return safeText(job.workflowParentId || job.workflow_parent_id || job.id || '', 180);
}

function outputOf(job = {}) {
  return job?.output && typeof job.output === 'object' ? job.output : {};
}

function reportOf(job = {}) {
  const output = outputOf(job);
  return output.report && typeof output.report === 'object' ? output.report : {};
}

function inferSurface({ taskType = '', fileName = '', content = '', artifact = {} } = {}) {
  const text = [taskType, fileName, artifact?.type, artifact?.item_type, artifact?.content_type, artifact?.action_type, content.slice(0, 1200)].join(' ').toLowerCase();
  if (/\b(leads?|lead_list|lead_rows|list_creator|cold_email|email_draft|outreach|gmail|recipient|prospect)\b|会社別|候補企業|リード/.test(text)) return 'lead';
  if (/seo|article|landing|page|publisher|approval|directory|listing|social|sns|x_post|tweet|instagram|linkedin|reddit|metadata|meta description|投稿|記事|lp|掲載/.test(text)) return 'publisher';
  if (/analytics|ga4|search console|query|landing_pages|channel_mix|measurement/.test(text)) return 'analytics';
  return 'general';
}

function inferItemType({ surface = '', taskType = '', fileName = '', content = '', artifact = {} } = {}) {
  const text = [taskType, fileName, artifact?.type, artifact?.item_type, artifact?.content_type, artifact?.action_type, content.slice(0, 1600)].join(' ').toLowerCase();
  if (surface === 'lead') {
    if (/email|gmail|cold_email|subject|件名/.test(text)) return 'email_draft';
    if (/lead_rows|lead row|リード|候補企業|会社別/.test(text)) return 'lead_list';
    return 'lead_asset';
  }
  if (surface === 'publisher') {
    if (/social|sns|x_post|tweet|instagram|linkedin|reddit|thread|投稿/.test(text)) return /thread|スレッド/.test(text) ? 'social_thread' : 'social_post';
    if (/directory|listing|submission|掲載/.test(text)) return 'directory_submission';
    if (/seo|article|blog|記事/.test(text)) return 'seo_article';
    if (/landing|lp|page|hero|h1|meta description/.test(text)) return 'landing_page';
    return 'publish_asset';
  }
  if (surface === 'analytics') return 'analytics_packet';
  return 'delivery_asset';
}

function itemStatus(job = {}, source = {}) {
  const explicit = safeText(source.status || source.review_status || '', 80).toLowerCase();
  if (explicit) return explicit;
  const jobStatus = safeText(job.status || '', 80).toLowerCase();
  if (jobStatus === 'blocked') return 'blocked';
  if (jobStatus === 'completed') return 'needs_review';
  return jobStatus || 'needs_review';
}

function metadataFromContent(content = '', base = {}) {
  return {
    ...base,
    title: labeledValue(content, ['Title', 'タイトル', 'H1候補', 'H1', 'Headline']),
    meta_description: labeledValue(content, ['Meta description候補', 'Meta description', 'Description', 'メタディスクリプション']),
    slug: labeledValue(content, ['Slug', 'Path', 'Target path', '対象URL', 'Target URL']),
    primary_cta: labeledValue(content, ['Primary CTA', '主CTA']),
    secondary_cta: labeledValue(content, ['Secondary CTA', '副CTA']),
    subject: labeledValue(content, ['Subject', '件名', '件名案']),
    contact: labeledValue(content, ['Contact', 'Contact path', 'Recipient', 'To', '送信先']),
    evidence_url: labeledValue(content, ['Evidence URL', 'Source URL', 'ソースURL', '対象URL'])
  };
}

function normalizeDeliveryItem(raw = {}, job = {}, index = 0) {
  const content = String(raw.body || raw.content || raw.text || raw.markdown || '').slice(0, MAX_BODY_CHARS);
  const taskType = safeText(job.workflowTask || job.taskType || '', 100);
  const fileName = safeText(raw.fileName || raw.name || raw.filename || '', 220);
  const surface = safeText(raw.surface || inferSurface({ taskType, fileName, content, artifact: raw }), 40);
  const itemType = safeText(raw.itemType || raw.item_type || inferItemType({ surface, taskType, fileName, content, artifact: raw }), 80);
  const title = safeText(raw.title || metadataFromContent(content).title || markdownHeading(content) || fileName || reportOf(job).summary || `Delivery item ${index + 1}`, 260);
  const metadata = {
    ...metadataFromContent(content, {
      file_name: fileName,
      source_kind: raw.source_kind || raw.sourceKind || 'delivery',
      source_index: index,
      source_task_type: taskType,
      source_agent_name: job.workflowAgentName || job.assignedAgentId || ''
    }),
    ...(raw.metadata && typeof raw.metadata === 'object' ? raw.metadata : {})
  };
  return {
    id: safeText(raw.id || `${job.id || 'job'}:${surface}:${itemType}:${index}:${stableHash(`${title}\n${content.slice(0, 2000)}`)}`, 240),
    ownerLogin: requesterLoginFromJob(job),
    surface,
    itemType,
    status: itemStatus(job, raw),
    title,
    summary: safeText(raw.summary || reportOf(job).summary || content, MAX_SUMMARY_CHARS),
    body: content,
    metadata: compactObject(metadata),
    source: compactObject({
      job_id: job.id || '',
      file_name: fileName,
      source_kind: raw.source_kind || raw.sourceKind || 'delivery',
      raw
    }),
    jobId: safeText(job.id || '', 180),
    workflowParentId: workflowParentId(job),
    workflowTask: taskType,
    workflowAgentName: safeText(job.workflowAgentName || job.assignedAgentId || '', 180),
    createdAt: safeText(job.createdAt || nowIso(), 80),
    updatedAt: safeText(job.completedAt || job.updatedAt || job.createdAt || nowIso(), 80)
  };
}

function artifactItems(job = {}) {
  const output = outputOf(job);
  const artifacts = [
    ...(Array.isArray(output.artifacts) ? output.artifacts : []),
    ...(Array.isArray(output.report?.artifacts) ? output.report.artifacts : []),
    ...(Array.isArray(output.report?.approval_requests) ? output.report.approval_requests : []),
    ...(Array.isArray(output.report?.approvalRequests) ? output.report.approvalRequests : [])
  ];
  return artifacts
    .filter((item) => item && typeof item === 'object')
    .map((item, index) => normalizeDeliveryItem({
      ...item,
      body: item.body || item.content || item.text || item.markdown || item.description || item.summary || '',
      source_kind: 'artifact'
    }, job, index));
}

function fileItems(job = {}) {
  const output = outputOf(job);
  const files = Array.isArray(output.files) ? output.files : [];
  return files
    .filter((file) => file && typeof file === 'object')
    .filter((file) => String(file.content || file.body || '').trim())
    .filter((file) => !String(file.name || '').toLowerCase().includes('supporting-specialist-deliverables'))
    .map((file, index) => normalizeDeliveryItem({
      ...file,
      fileName: file.name || file.filename || `delivery-${index + 1}.md`,
      body: file.content || file.body || '',
      metadata: { content_type: file.type || file.mime || 'text/markdown' },
      source_kind: 'file'
    }, job, index));
}

function reportCandidateItems(job = {}) {
  const report = reportOf(job);
  const candidate = report.execution_candidate || report.executionCandidate || null;
  if (!candidate || typeof candidate !== 'object') return [];
  const body = candidate.body || candidate.content || candidate.reason || report.summary || '';
  if (!String(body || '').trim()) return [];
  return [normalizeDeliveryItem({
    ...candidate,
    title: candidate.title || report.summary || 'Execution candidate',
    summary: candidate.reason || report.summary || '',
    body,
    source_kind: 'execution_candidate'
  }, job, 0)];
}

export function deliveryItemsFromJob(job = {}) {
  if (!job?.id) return [];
  const output = outputOf(job);
  if (!output || typeof output !== 'object') return [];
  const items = [
    ...artifactItems(job),
    ...fileItems(job),
    ...reportCandidateItems(job)
  ];
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.id || !item.body && !item.summary) return false;
    if (!['publisher', 'lead', 'analytics'].includes(item.surface)) return false;
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}
