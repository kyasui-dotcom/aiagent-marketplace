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

function compactSourceRaw(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return compactObject(value);
  const output = {};
  for (const [key, item] of Object.entries(value)) {
    if (/^(body|content|text|markdown|prompt|full_prompt|fullPrompt)$/i.test(key)) continue;
    output[key] = item;
  }
  return compactObject(output);
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

function firstUrl(content = '') {
  const text = String(content || '');
  const preferred = text.match(/(?:Source\/target URLs from user input|Product\/service from user input|Product\/service|Target URL|対象URL)\s*[:：][^\n]*(https?:\/\/[^\s)>\]]+)/i);
  const any = preferred || text.match(/https?:\/\/[^\s)>\]]+/i);
  return any?.[1] || any?.[0] || '';
}

function hostLabel(url = '') {
  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch {
    return safeText(url, 120).replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  }
}

const BRIEF_FIELD_LABELS = [
  'Product/service',
  'Analytics data',
  'Main goal',
  'Target audience',
  'Constraints',
  'Priority channel',
  'Attached connector context',
  'Conversation lead',
  'Work split',
  'Inputs',
  'Deliver',
  'Output language',
  'Acceptance'
];

function briefValues(content = '', label = '') {
  const escaped = String(label || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const nextLabels = BRIEF_FIELD_LABELS.map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const pattern = new RegExp(`${escaped}\\s*[:：]\\s*-?\\s*(?:${escaped}\\s*[:：]\\s*)?([\\s\\S]*?)(?=\\s+-\\s*(?:${nextLabels})\\s*[:：]|\\n|$)`, 'gi');
  const values = [];
  for (const match of String(content || '').matchAll(pattern)) {
    const value = safeText(match[1], 160);
    if (value) values.push(value);
  }
  return values;
}

function audienceFromContent(content = '') {
  const text = String(content || '');
  const audiences = briefValues(text, 'Target audience');
  const lowerAudience = audiences.join(' ').toLowerCase();
  if (/developers?|engineers?|technical users?/i.test(text) && !/developer|engineer|technical/.test(lowerAudience)) audiences.push('developers and technical users');
  if (/general consumers?|individuals?/i.test(text) && !/consumer|individual/.test(lowerAudience)) audiences.push('individual users');
  const seen = new Set();
  return audiences
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 3)
    .join(', ') || 'target visitors';
}

function conversionFromContent(content = '') {
  const text = String(content || '');
  if (/signups?|sign[_ -]?up|trials?|登録|トライアル/i.test(text)) return 'signup or trial start';
  if (/lead|inquir|問い合わせ|リード/i.test(text)) return 'lead or inquiry';
  if (/sales|revenue|purchase|売上|購入/i.test(text)) return 'purchase or revenue action';
  return 'primary conversion';
}

function priorityChannelFromContent(content = '') {
  const text = String(content || '');
  if (/organic search|seo|自然検索/i.test(text)) return 'organic search / SEO';
  if (/referral|github|reddit|indie hackers|参照/i.test(text)) return 'referral sites';
  if (/\bsns\b|social|x\/twitter|投稿/i.test(text)) return 'social';
  return 'owned landing page traffic';
}

function cleanSectionTitle(line = '') {
  return String(line || '')
    .replace(/^#{1,6}\s+/, '')
    .replace(/\s+#*$/, '')
    .trim()
    .toLowerCase();
}

const INTERNAL_MARKERS = [
  '=== workflow handoff context ===',
  '=== workflow additional prompt ===',
  '=== end workflow handoff context ===',
  'canonical user brief',
  'process program',
  'structured handoff digest',
  'prior specialist deliverables',
  'prior specialist deliverable:',
  'required output behavior:',
  'workflow handoff context'
];

const INTERNAL_SECTION_TITLES = new Set([
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
  'prior specialist deliverables (mandatory context): use at least 2 distinct prior work items when available.',
  'original information used',
  'upstream work used',
  '受け渡し情報の利用',
  'braveソース由来の補助分析',
  'agent handoff',
  '下流エージェント用handoff packet',
  '後続エージェントへの制約',
  '信頼性と品質保証',
  '補助成果物',
  'specialist成果物プレビュー',
  '実行ステータス',
  'supporting work products',
  'delivered content summaries',
  'downstream handoff summary'
]);

function deliveryLineLooksInternal(line = '') {
  return /provider\.runjob|agent-file provider implementation|agent_file_provider_delivery|central built-in runner|future behavior changes should be made|共通\s*builtin\s*runner|agent ファイル内の provider|agent ファイルの provider 実装|handoff evidence attached|leader-owned prior work|external posting, sending, ad launch|leader checkpoint|deliveryで表示される要約|trust profile|根拠ゲート|実行ゲート|品質ゲート|受け入れ条件|レビュー条件|未保証|source run\s*:|_file content is available/i.test(String(line || ''));
}

function deliveryContentLooksTemplateOnly(content = '') {
  const text = String(content || '').trim();
  if (!text) return true;
  const nonHeadingLines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !/^#{1,6}\s+/.test(line));
  if (!nonHeadingLines.length) return true;
  return /(^|\n)##\s+Delivery packet\s*\n\s*Write sections for/i.test(text)
    && !/(answer first|evidence used|evidence status|decision first|seo page recommendation|replacement copy|hero copy|body draft|final delivery first|target and inputs|data quality check|measurement plan|next action)/i.test(text);
}

function hasInternalPromptContent(content = '') {
  const lower = String(content || '').toLowerCase();
  return INTERNAL_MARKERS.some((marker) => lower.includes(marker))
    || /^##\s+(Request|Agent-owned behavior|Expected output sections|Input needs|Acceptance checks|Scope boundaries|Specialist method|Delivery packet|Review notes)\b/im.test(content);
}

function stripInternalMarkdownSections(content = '') {
  const lines = String(content || '').replace(/\r\n/g, '\n').split('\n');
  const kept = [];
  let skipping = false;
  let skipFence = false;
  for (const line of lines) {
    const trimmed = line.trim();
    const lower = trimmed.toLowerCase();
    if (lower === '```markdown' && skipping) {
      skipFence = true;
      continue;
    }
    if (skipFence) {
      if (lower === '```') skipFence = false;
      continue;
    }
    if (lower === '=== end workflow handoff context ===') {
      skipping = false;
      continue;
    }
    if (INTERNAL_MARKERS.some((marker) => lower.includes(marker))) {
      skipping = true;
      continue;
    }
    const heading = trimmed.match(/^#{1,6}\s+(.+)$/);
    if (heading) {
      const title = cleanSectionTitle(trimmed);
      if (INTERNAL_SECTION_TITLES.has(title) || title.startsWith('prior specialist deliverable')) {
        skipping = true;
        continue;
      }
      skipping = false;
    }
    if (skipping || deliveryLineLooksInternal(line)) continue;
    kept.push(line);
  }
  const cleaned = kept.join('\n')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return deliveryContentLooksTemplateOnly(cleaned) ? '' : cleaned;
}

function genericDeliveryHeading(title = '') {
  const text = safeText(title, 240).toLowerCase();
  if (!text) return true;
  return /^(landing page critique|SEO SPECIALIST|writer|writing|x ops connector|reddit|indie hackers|instagram|directory submission|.* provider delivery|.* delivery)$/.test(text);
}

function publisherFallback(itemType = '', rawContent = '') {
  const url = firstUrl(rawContent);
  const host = hostLabel(url) || 'the product';
  const audience = audienceFromContent(rawContent);
  const conversion = conversionFromContent(rawContent);
  const channel = priorityChannelFromContent(rawContent);
  const cta = conversion === 'signup or trial start' ? 'Start signup' : 'Continue';
  const productLabel = /ai\s*agents?|agent marketplace|エージェント/i.test(rawContent) ? 'AI agent workflow' : 'product';
  const h1 = itemType === 'seo_article'
    ? `${host}: ${productLabel} guide for ${audience}`
    : `${host} for ${audience}`;
  const title = itemType === 'seo_article'
    ? `${host} - ${productLabel} guide for ${conversion}`
    : `${host} - signup landing page`;
  const meta = itemType === 'seo_article'
    ? `Compare ${host} for ${audience}, see the workflow, and choose the next action for ${conversion}.`
    : `Use ${host} to show the offer, proof, and next step for ${audience}, then continue to ${conversion}.`;
  const body = itemType === 'seo_article'
    ? [
        `# ${h1}`,
        '',
        `For ${audience}, ${host} should answer one question quickly: is this offer clear, credible, and useful enough to turn into ${conversion}?`,
        '',
        '## What the page should prove',
        `- The visitor can start from ${channel} intent and reach a concrete deliverable.`,
        '- The page keeps source status, assumptions, and next actions visible.',
        '- Prepared outputs can be reviewed before any external publish step.',
        '',
        '## Recommended structure',
        '1. Hero with the target use case and primary CTA.',
        '2. Example delivery packet showing the finished output, source status, and next action.',
        '3. Comparison section explaining when this offer fits and when it does not.',
        '4. FAQ covering data connection, approval boundaries, and publish handoff.',
        '',
        `## Primary CTA`,
        cta,
        '',
        '## Measurement',
        'Track primary_cta_click and sign_up from organic/referral landing sessions.'
      ].join('\n')
    : [
        `# ${h1}`,
        '',
        `Hero promise: turn the visitor's intent into a clear next step that ${audience} can evaluate before signing up or acting.`,
        '',
        `Primary CTA: ${cta}`,
        'Secondary CTA: View an example delivery',
        '',
        '## Above the fold',
        '- State the outcome first: the concrete value a visitor gets after signup.',
        `- Match the traffic source: ${channel}.`,
        '- Show that publishing or external action happens only after review.',
        '',
        '## Proof block',
        '- Show a concrete example, source status, and the prepared asset sent to Publisher.',
        '- Label missing proof rather than inventing testimonials or metrics.',
        '',
        '## CTA path',
        `1. Visitor starts a request for ${host}.`,
        '2. The workflow routes the work to the appropriate specialist path.',
        '3. The final deliverable appears in the delivery area and preparation assets appear in matching SaaS surfaces.',
        `4. Visitor continues to ${conversion}.`,
        '',
        '## Measurement',
        'Measure primary_cta_click, sign_up, and delivery_open from this page.'
      ].join('\n');
  return {
    body,
    title,
    metadata: {
      title,
      h1,
      meta_description: meta,
      target_url: url,
      primary_cta: cta,
      traffic_source: channel,
      conversion_goal: conversion,
      audience
    }
  };
}

function publisherContent(rawContent = '', itemType = '') {
  const raw = String(rawContent || '').slice(0, MAX_BODY_CHARS);
  const stripped = stripInternalMarkdownSections(raw);
  const heading = markdownHeading(stripped);
  const useful = stripped
    .replace(/^#\s+.+$/m, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!hasInternalPromptContent(raw) || (useful.length >= 180 && !genericDeliveryHeading(heading))) {
    return {
      body: stripped || raw,
      title: '',
      metadata: {}
    };
  }
  return publisherFallback(itemType, raw);
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

function isLeaderJob(job = {}) {
  const text = [job.workflowTask, job.taskType, job.workflowAgentName, job.assignedAgentId].join(' ').toLowerCase();
  return /\b[a-z]+_leader\b|\bteam leader\b/.test(text);
}

function inferSurface({ taskType = '', fileName = '', content = '', artifact = {} } = {}) {
  const text = [taskType, fileName, artifact?.type, artifact?.item_type, artifact?.content_type, artifact?.action_type, content.slice(0, 1200)].join(' ').toLowerCase();
  if (/\b(leads?|lead_list|lead_rows|list_creator|cold_email|email_draft|outreach|gmail|recipient|prospect)\b|会社別|候補企業|リード/.test(text)) return 'lead';
  if (/seo|article|landing|page|publisher|approval|directory|listing|social|sns|x_post|x ops|post text|tweet|instagram|linkedin|reddit|metadata|meta description|投稿|記事|lp|掲載/.test(text)) return 'publisher';
  if (/analytics|ga4|search console|query|landing_pages|channel_mix|measurement/.test(text)) return 'analytics';
  return 'general';
}

function publisherChannelProfile({ taskType = '', fileName = '', content = '', artifact = {}, itemType = '' } = {}) {
  const taskFile = [
    taskType,
    fileName,
    artifact?.type,
    artifact?.item_type,
    artifact?.itemType,
    artifact?.content_type,
    artifact?.contentType,
    artifact?.action_type,
    artifact?.actionType,
    artifact?.channel_key,
    artifact?.channelKey,
    artifact?.channel,
    artifact?.medium,
    artifact?.connector,
    artifact?.required_connector,
    itemType
  ].join(' ').toLowerCase();
  const text = [
    taskFile,
    artifact?.destination,
    artifact?.target,
    artifact?.platform,
    artifact?.publication,
    artifact?.publisher,
    content.slice(0, 2200)
  ].join(' ').toLowerCase();
  const packet = (profile) => ({
    itemType: profile.itemType,
    metadata: {
      channel_key: profile.channelKey,
      destination: profile.destination,
      connector: profile.connector,
      connector_capability: profile.capability,
      publish_method: profile.method,
      action_type: profile.actionType
    }
  });
  if (/indie[\s_-]?hackers|\bindie_hackers\b|\bih\b/.test(taskFile)) {
    return packet({
      itemType: 'indie_hackers_post',
      channelKey: 'indie_hackers',
      destination: 'Indie Hackers',
      connector: 'indie_hackers',
      capability: 'indie_hackers.post',
      method: 'indie_hackers_connector_or_manual_copy',
      actionType: 'indie_hackers_post'
    });
  }
  if (/\breddit\b|subreddit/.test(taskFile)) {
    return packet({
      itemType: 'reddit_post',
      channelKey: 'reddit',
      destination: 'Reddit',
      connector: 'reddit',
      capability: 'reddit.post',
      method: 'reddit_oauth_or_manual_copy',
      actionType: 'reddit_post'
    });
  }
  if (/\bx[_\s-]?ops\b|\bx[_\s-]?post\b|\btwitter\b|\btweet\b/.test(taskFile)) {
    return packet({
      itemType: 'x_post',
      channelKey: 'x',
      destination: 'X',
      connector: 'x',
      capability: 'x.post',
      method: 'x_oauth_or_x_saas',
      actionType: 'x_post'
    });
  }
  if (/\binstagram\b|\binsta\b|\big\b/.test(taskFile)) {
    return packet({
      itemType: 'instagram_post',
      channelKey: 'instagram',
      destination: 'Instagram',
      connector: 'instagram',
      capability: 'instagram.post',
      method: 'instagram_connector_or_manual_copy',
      actionType: 'instagram_post'
    });
  }
  if (/wordpress|\bwp\b|wp-json/.test(taskFile)) {
    return packet({
      itemType: /landing|page/.test(taskFile) ? 'wordpress_page' : 'wordpress_draft',
      channelKey: 'wordpress_site',
      destination: 'WordPress site',
      connector: 'wordpress',
      capability: 'wordpress.create_draft',
      method: 'wordpress_application_password',
      actionType: 'wordpress_draft'
    });
  }
  if (/directory|listing|submission|掲載/.test(taskFile)) {
    return packet({
      itemType: 'directory_submission',
      channelKey: 'directory',
      destination: 'Directory / listing',
      connector: 'directory_app',
      capability: 'directory.submit',
      method: 'saas_or_manual_submit',
      actionType: 'directory_submission'
    });
  }
  if (/landing|lp|page_critique|page critique|landing_page|landing page/.test(taskFile)) {
    return packet({
      itemType: 'landing_page',
      channelKey: 'owned_site',
      destination: 'Owned site / Publisher',
      connector: 'publisher',
      capability: 'site_publish_packet',
      method: 'publisher_review_or_selected_connector',
      actionType: 'site_publish_packet'
    });
  }
  if (/seo_specialist|seo-agent|seo_article|seo article|\bseo\b|article|blog|記事/.test(taskFile)) {
    return packet({
      itemType: 'seo_article',
      channelKey: 'owned_site',
      destination: 'Owned site / Publisher',
      connector: 'publisher',
      capability: 'site_publish_packet',
      method: 'publisher_review_or_selected_connector',
      actionType: 'site_publish_packet'
    });
  }
  if (/indie[\s_-]?hackers|\bindie_hackers\b|\bih\b/.test(text)) {
    return packet({
      itemType: 'indie_hackers_post',
      channelKey: 'indie_hackers',
      destination: 'Indie Hackers',
      connector: 'indie_hackers',
      capability: 'indie_hackers.post',
      method: 'indie_hackers_connector_or_manual_copy',
      actionType: 'indie_hackers_post'
    });
  }
  if (/\breddit\b|subreddit/.test(text)) {
    return packet({
      itemType: 'reddit_post',
      channelKey: 'reddit',
      destination: 'Reddit',
      connector: 'reddit',
      capability: 'reddit.post',
      method: 'reddit_oauth_or_manual_copy',
      actionType: 'reddit_post'
    });
  }
  if (/\bx[_\s-]?ops\b|\bx[_\s-]?post\b|\btwitter\b|\btweet\b|\bx\.com\b|twitter\.com/.test(text)) {
    return packet({
      itemType: 'x_post',
      channelKey: 'x',
      destination: 'X',
      connector: 'x',
      capability: 'x.post',
      method: 'x_oauth_or_x_saas',
      actionType: 'x_post'
    });
  }
  if (/\binstagram\b|\binsta\b|\big\b|instagram\.com/.test(text)) {
    return packet({
      itemType: 'instagram_post',
      channelKey: 'instagram',
      destination: 'Instagram',
      connector: 'instagram',
      capability: 'instagram.post',
      method: 'instagram_connector_or_manual_copy',
      actionType: 'instagram_post'
    });
  }
  if (/wordpress|\bwp\b|wp-json/.test(text)) {
    return packet({
      itemType: /landing|page/.test(taskFile) ? 'wordpress_page' : 'wordpress_draft',
      channelKey: 'wordpress_site',
      destination: 'WordPress site',
      connector: 'wordpress',
      capability: 'wordpress.create_draft',
      method: 'wordpress_application_password',
      actionType: 'wordpress_draft'
    });
  }
  if (/directory|listing|submission|掲載/.test(text)) {
    return packet({
      itemType: 'directory_submission',
      channelKey: 'directory',
      destination: 'Directory / listing',
      connector: 'directory_app',
      capability: 'directory.submit',
      method: 'saas_or_manual_submit',
      actionType: 'directory_submission'
    });
  }
  if (/landing|lp|page_critique|page critique/.test(taskFile) || /landing_page|landing page/.test(text)) {
    return packet({
      itemType: 'landing_page',
      channelKey: 'owned_site',
      destination: 'Owned site / Publisher',
      connector: 'publisher',
      capability: 'site_publish_packet',
      method: 'publisher_review_or_selected_connector',
      actionType: 'site_publish_packet'
    });
  }
  if (/seo_specialist|seo-agent|seo_article|seo article|\bseo\b|article|blog|記事/.test(taskFile)) {
    return packet({
      itemType: 'seo_article',
      channelKey: 'owned_site',
      destination: 'Owned site / Publisher',
      connector: 'publisher',
      capability: 'site_publish_packet',
      method: 'publisher_review_or_selected_connector',
      actionType: 'site_publish_packet'
    });
  }
  if (/social|sns|post text|approval packet|thread|投稿/.test(text)) {
    return packet({
      itemType: /thread|スレッド/.test(text) ? 'social_thread' : 'social_post',
      channelKey: 'social',
      destination: 'Social copy packet',
      connector: 'manual',
      capability: 'manual.copy',
      method: 'manual_social_copy',
      actionType: 'social_post'
    });
  }
  return null;
}

function inferItemType({ surface = '', taskType = '', fileName = '', content = '', artifact = {} } = {}) {
  const text = [taskType, fileName, artifact?.type, artifact?.item_type, artifact?.content_type, artifact?.action_type, content.slice(0, 1600)].join(' ').toLowerCase();
  if (surface === 'lead') {
    if (/email|gmail|cold_email|subject|件名/.test(text)) return 'email_draft';
    if (/lead_rows|lead row|リード|候補企業|会社別/.test(text)) return 'lead_list';
    return 'lead_asset';
  }
  if (surface === 'publisher') {
    const profile = publisherChannelProfile({ taskType, fileName, content, artifact });
    if (profile?.itemType) return profile.itemType;
    const taskFile = [taskType, fileName, artifact?.type, artifact?.item_type, artifact?.content_type, artifact?.action_type].join(' ').toLowerCase();
    if (/landing|lp|page_critique|page critique/.test(taskFile)) return 'landing_page';
    if (/seo_specialist|seo-agent|seo_article|seo article/.test(taskFile)) return 'seo_article';
    if (/social|sns|x_post|x ops|post text|approval packet|tweet|instagram|linkedin|reddit|thread|投稿/.test(text)) return /thread|スレッド/.test(text) ? 'social_thread' : 'social_post';
    if (/directory|listing|submission|掲載/.test(text)) return 'directory_submission';
    if (/landing|lp|page|hero|h1|meta description/.test(text)) return 'landing_page';
    if (/seo|article|blog|記事/.test(text)) return 'seo_article';
    return 'publish_asset';
  }
  if (surface === 'analytics') return 'analytics_packet';
  return 'delivery_asset';
}

function surfaceForTask(taskType = '', inferredSurface = '', raw = {}) {
  const explicitSurface = safeText(raw.surface || '', 40).toLowerCase();
  if (explicitSurface) return explicitSurface;
  const task = safeText(taskType, 100).toLowerCase();
  if (/data_analysis/.test(task)) return 'analytics';
  if (/research|media_planner/.test(task)) return 'general';
  if (/list_creator|cold_email/.test(task)) return 'lead';
  if (/seo_specialist|writing|writer|landing|landing_page|directory_submission|x_ops|x_post|twitter|social_post|instagram|reddit|indie_hackers/.test(task)) return 'publisher';
  return inferredSurface;
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
  const metadata = { ...base };
  const values = {
    title: labeledValue(content, ['Title', 'タイトル', 'Meta title', 'Meta title候補']),
    h1: labeledValue(content, ['H1候補', 'H1', 'Headline']),
    meta_description: labeledValue(content, ['Meta description候補', 'Meta description', 'Description', 'メタディスクリプション']),
    slug: labeledValue(content, ['Slug', 'Path', 'Target path', '対象URL', 'Target URL']),
    primary_cta: labeledValue(content, ['Primary CTA', '主CTA']),
    secondary_cta: labeledValue(content, ['Secondary CTA', '副CTA']),
    subject: labeledValue(content, ['Subject', '件名', '件名案']),
    contact: labeledValue(content, ['Contact', 'Contact path', 'Recipient', 'To', '送信先']),
    evidence_url: labeledValue(content, ['Evidence URL', 'Source URL', 'ソースURL', '対象URL'])
  };
  for (const [key, value] of Object.entries(values)) {
    if (value) metadata[key] = value;
  }
  return metadata;
}

function normalizeDeliveryItem(raw = {}, job = {}, index = 0) {
  const rawContent = String(raw.body || raw.content || raw.text || raw.markdown || '').slice(0, MAX_BODY_CHARS);
  const taskType = safeText(job.workflowTask || job.taskType || '', 100);
  const fileName = safeText(raw.fileName || raw.name || raw.filename || '', 220);
  const inferredSurface = inferSurface({ taskType, fileName, content: rawContent, artifact: raw });
  const surface = safeText(surfaceForTask(taskType, inferredSurface, raw), 40);
  const explicitItemType = safeText(raw.itemType || raw.item_type || '', 80);
  const inferredItemType = inferItemType({ surface, taskType, fileName, content: rawContent, artifact: raw });
  const channelProfile = surface === 'publisher'
    ? publisherChannelProfile({ surface, taskType, fileName, content: rawContent, artifact: raw, itemType: explicitItemType || inferredItemType })
    : null;
  const itemType = safeText(
    channelProfile?.itemType && (!explicitItemType || /^(?:publish_asset|social_post|social_thread|post|page)$/i.test(explicitItemType))
      ? channelProfile.itemType
      : (explicitItemType || inferredItemType),
    80
  );
  const prepared = surface === 'publisher' ? publisherContent(rawContent, itemType) : { body: rawContent, title: '', metadata: {} };
  const content = String(prepared.body || rawContent).slice(0, MAX_BODY_CHARS);
  const legacyTitle = safeText(
    raw.title
      || metadataFromContent(rawContent).title
      || markdownHeading(rawContent)
      || fileName
      || reportOf(job).summary
      || `Delivery item ${index + 1}`,
    260
  );
  const metadata = {
    ...metadataFromContent(rawContent, {
      file_name: fileName,
      source_kind: raw.source_kind || raw.sourceKind || 'delivery',
      source_index: index,
      source_task_type: taskType,
      source_agent_name: job.workflowAgentName || job.assignedAgentId || ''
    }),
    ...(channelProfile?.metadata && typeof channelProfile.metadata === 'object' ? channelProfile.metadata : {}),
    ...metadataFromContent(content),
    ...(prepared.metadata && typeof prepared.metadata === 'object' ? prepared.metadata : {}),
    ...(raw.metadata && typeof raw.metadata === 'object' ? raw.metadata : {}),
    ...(Array.isArray(raw.source_evidence) ? { source_evidence: compactObject(raw.source_evidence) } : {}),
    ...(Array.isArray(raw.sourceEvidence) ? { source_evidence: compactObject(raw.sourceEvidence) } : {}),
    ...(Array.isArray(raw.publish_variants) ? { publish_variants: compactObject(raw.publish_variants) } : {}),
    ...(Array.isArray(raw.publishVariants) ? { publish_variants: compactObject(raw.publishVariants) } : {}),
    ...(raw.eeat_notes && typeof raw.eeat_notes === 'object' ? { eeat_notes: compactObject(raw.eeat_notes) } : {}),
    ...(raw.eeatNotes && typeof raw.eeatNotes === 'object' ? { eeat_notes: compactObject(raw.eeatNotes) } : {})
  };
  const title = safeText(
    raw.title
      || metadata.title
      || metadata.h1
      || prepared.title
      || markdownHeading(content)
      || fileName
      || reportOf(job).summary
      || `Delivery item ${index + 1}`,
    260
  );
  return {
    id: safeText(raw.id || `${job.id || 'job'}:${surface}:${itemType}:${index}:${stableHash(`${legacyTitle}\n${rawContent.slice(0, 2000)}`)}`, 240),
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
      raw: compactSourceRaw(raw)
    }),
    jobId: safeText(job.id || '', 180),
    workflowParentId: workflowParentId(job),
    workflowTask: taskType,
    workflowAgentName: safeText(job.workflowAgentName || job.assignedAgentId || '', 180),
    createdAt: safeText(job.createdAt || nowIso(), 80),
    updatedAt: safeText(job.completedAt || job.updatedAt || job.createdAt || nowIso(), 80)
  };
}

export function sanitizeDeliveryItemForSurface(item = {}) {
  if (!item || typeof item !== 'object') return item;
  const surface = safeText(item.surface || '', 40).toLowerCase();
  if (surface !== 'publisher') return item;
  const originalItemType = safeText(item.itemType || item.item_type || '', 80).toLowerCase();
  const fileName = safeText(item.source?.file_name || item.metadata?.file_name || '', 220);
  const taskType = safeText(item.workflowTask || item.metadata?.source_task_type || '', 100);
  const channelProfile = publisherChannelProfile({
    taskType,
    fileName,
    content: item.body || item.content || '',
    artifact: {
      ...(item.metadata && typeof item.metadata === 'object' ? item.metadata : {}),
      type: originalItemType,
      item_type: originalItemType
    },
    itemType: originalItemType
  });
  const itemType = safeText(
    channelProfile?.itemType && (!originalItemType || /^(?:publish_asset|social_post|social_thread|post|page)$/i.test(originalItemType))
      ? channelProfile.itemType
      : originalItemType,
    80
  );
  const prepared = publisherContent(item.body || item.content || '', itemType);
  const body = String(prepared.body || item.body || '').slice(0, MAX_BODY_CHARS);
  const metadata = compactObject({
    ...(item.metadata && typeof item.metadata === 'object' ? item.metadata : {}),
    ...(channelProfile?.metadata && typeof channelProfile.metadata === 'object' ? channelProfile.metadata : {}),
    ...metadataFromContent(body),
    ...(prepared.metadata && typeof prepared.metadata === 'object' ? prepared.metadata : {}),
    ...(Array.isArray(item.source_evidence) ? { source_evidence: compactObject(item.source_evidence) } : {}),
    ...(Array.isArray(item.sourceEvidence) ? { source_evidence: compactObject(item.sourceEvidence) } : {}),
    ...(Array.isArray(item.publish_variants) ? { publish_variants: compactObject(item.publish_variants) } : {}),
    ...(Array.isArray(item.publishVariants) ? { publish_variants: compactObject(item.publishVariants) } : {}),
    ...(item.eeat_notes && typeof item.eeat_notes === 'object' ? { eeat_notes: compactObject(item.eeat_notes) } : {}),
    ...(item.eeatNotes && typeof item.eeatNotes === 'object' ? { eeat_notes: compactObject(item.eeatNotes) } : {})
  });
  const title = safeText(
    metadata.title
      || metadata.h1
      || prepared.title
      || (!genericDeliveryHeading(item.title) ? item.title : '')
      || markdownHeading(body)
      || item.title
      || 'Publish asset',
    260
  );
  return {
    ...item,
    itemType,
    title,
    summary: safeText(item.summary && !hasInternalPromptContent(item.summary) ? item.summary : body, MAX_SUMMARY_CHARS),
    body,
    metadata,
    source: item.source && typeof item.source === 'object'
      ? compactObject({ ...item.source, raw: compactSourceRaw(item.source.raw || {}) })
      : {}
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
  if (isLeaderJob(job)) return [];
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
