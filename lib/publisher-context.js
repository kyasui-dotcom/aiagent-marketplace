const PUBLISHER_CONTEXT_SOURCE_EVIDENCE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string' },
    url: { type: 'string' },
    source_type: { type: 'string' },
    snippet: { type: 'string' }
  },
  required: ['title', 'url', 'source_type', 'snippet']
};

const PUBLISHER_CONTEXT_VARIANT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    label: { type: 'string' },
    title: { type: 'string' },
    h1: { type: 'string' },
    body: { type: 'string' },
    cta: { type: 'string' }
  },
  required: ['label', 'title', 'h1', 'body', 'cta']
};

const PUBLISHER_CONTEXT_EEAT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    expertise: { type: 'string' },
    experience: { type: 'string' },
    authoritativeness: { type: 'string' },
    trust: { type: 'string' },
    compliance: { type: 'string' }
  },
  required: ['expertise', 'experience', 'authoritativeness', 'trust', 'compliance']
};

const PUBLISHER_CONTEXT_ARTIFACT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string' },
    type: { type: 'string' },
    channel: { type: 'string', enum: ['owned_site', 'wordpress_site', 'github_pr', 'x', 'reddit', 'indie_hackers', 'instagram', 'social', 'directory', 'email', 'generic'] },
    destination: { type: 'string' },
    connector: { type: 'string' },
    connector_capability: { type: 'string' },
    publish_method: { type: 'string' },
    action_type: { type: 'string' },
    market: { type: 'string' },
    locale: { type: 'string' },
    owner: { type: 'string' },
    title: { type: 'string' },
    slug: { type: 'string' },
    meta: { type: 'string' },
    keywords: { type: 'string' },
    h1: { type: 'string' },
    primary_cta: { type: 'string' },
    secondary_cta: { type: 'string' },
    internal_links: { type: 'string' },
    og_title: { type: 'string' },
    og_description: { type: 'string' },
    source_evidence: { type: 'array', maxItems: 12, items: PUBLISHER_CONTEXT_SOURCE_EVIDENCE_SCHEMA },
    publish_variants: { type: 'array', maxItems: 6, items: PUBLISHER_CONTEXT_VARIANT_SCHEMA },
    eeat_notes: PUBLISHER_CONTEXT_EEAT_SCHEMA,
    body: { type: 'string' },
    status: { type: 'string' },
    target: { type: 'string' },
    risk: { type: 'string' }
  },
  required: [
    'id', 'type', 'channel', 'destination', 'connector', 'connector_capability', 'publish_method', 'action_type',
    'market', 'locale', 'owner', 'title', 'slug', 'meta', 'keywords', 'h1', 'primary_cta', 'secondary_cta',
    'internal_links', 'og_title', 'og_description', 'source_evidence', 'publish_variants', 'eeat_notes',
    'body', 'status', 'target', 'risk'
  ]
};

const PUBLISHER_CONTEXT_APPROVAL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    description: { type: 'string' },
    action_type: { type: 'string' },
    status: { type: 'string' },
    blocker: { type: 'string' },
    risk: { type: 'string' },
    body: { type: 'string' }
  },
  required: ['id', 'title', 'description', 'action_type', 'status', 'blocker', 'risk', 'body']
};

const PUBLISHER_CONTEXT_DELIVERY_FILE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string' },
    type: { type: 'string' },
    content: { type: 'string' }
  },
  required: ['name', 'type', 'content']
};

export const PUBLISHER_CONTEXT_SHAPER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    facts: { type: 'array', maxItems: 20, items: { type: 'string' } },
    assumptions: { type: 'array', maxItems: 12, items: { type: 'string' } },
    recommended_next_actions: { type: 'array', maxItems: 12, items: { type: 'string' } },
    artifacts: { type: 'array', maxItems: 12, items: PUBLISHER_CONTEXT_ARTIFACT_SCHEMA },
    approval_requests: { type: 'array', maxItems: 12, items: PUBLISHER_CONTEXT_APPROVAL_SCHEMA },
    delivery_files: { type: 'array', maxItems: 8, items: PUBLISHER_CONTEXT_DELIVERY_FILE_SCHEMA }
  },
  required: ['title', 'summary', 'facts', 'assumptions', 'recommended_next_actions', 'artifacts', 'approval_requests', 'delivery_files']
};

function envText(source = {}, key = '', fallback = '') {
  return String(source?.[key] ?? fallback).trim();
}

function publisherContextLlmConfig(env = {}) {
  const apiKey = envText(env, 'PUBLISHER_CONTEXT_OPENAI_API_KEY')
    || envText(env, 'OPEN_CHAT_OPENAI_API_KEY')
    || envText(env, 'OPENAI_API_KEY');
  return {
    enabled: !['0', 'false', 'none', 'disabled'].includes(envText(env, 'PUBLISHER_CONTEXT_LLM', apiKey ? 'openai' : 'off').toLowerCase()),
    apiKey,
    baseUrl: (envText(env, 'OPENAI_BASE_URL') || 'https://api.openai.com/v1').replace(/\/+$/, ''),
    model: envText(env, 'PUBLISHER_CONTEXT_OPENAI_MODEL')
      || envText(env, 'OPEN_CHAT_INTENT_MODEL')
      || envText(env, 'OPEN_CHAT_INTENT_OPENAI_MODEL')
      || 'gpt-5.4-nano'
  };
}

function parseJson(content = '') {
  const text = String(content || '').trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return {};
    try {
      return JSON.parse(match[0]);
    } catch {
      return {};
    }
  }
}

function extractResponseText(payload = {}) {
  if (typeof payload.output_text === 'string') return payload.output_text;
  if (Array.isArray(payload.output)) {
    return payload.output
      .flatMap((item) => Array.isArray(item?.content) ? item.content : [])
      .map((item) => item?.text || item?.content || '')
      .filter(Boolean)
      .join('\n');
  }
  return '';
}

export function redactPublisherContextSecrets(value = '') {
  return String(value || '')
    .replace(/sk-proj-[A-Za-z0-9_-]{12,}/g, 'sk-proj-REDACTED')
    .replace(/sk-[A-Za-z0-9_-]{12,}/g, 'sk-REDACTED')
    .replace(/gh[pousr]_[A-Za-z0-9_]{16,}/g, 'github-token-REDACTED')
    .replace(/xox[baprs]-[A-Za-z0-9-]{16,}/g, 'slack-token-REDACTED')
    .replace(/Bearer\s+[A-Za-z0-9._-]{16,}/gi, 'Bearer REDACTED')
    .replace(/client_secret[=:]\s*["']?[^"'\s,]{8,}/gi, 'client_secret=REDACTED')
    .replace(/api[_-]?key[=:]\s*["']?[^"'\s,]{8,}/gi, 'api_key=REDACTED');
}

export function compactPublisherContextForOpenAi(value = null, options = {}, depth = 0) {
  const maxDepth = Number(options.depth || 5);
  const maxArray = Number(options.maxArray || 12);
  const maxText = Number(options.maxText || 3000);
  if (value == null) return value;
  if (depth > maxDepth) return redactPublisherContextSecrets(String(value)).slice(0, 600);
  if (Array.isArray(value)) return value.slice(0, maxArray).map((item) => compactPublisherContextForOpenAi(item, options, depth + 1));
  if (typeof value === 'object') {
    const output = {};
    for (const [key, item] of Object.entries(value)) {
      const safeKey = String(key || '').slice(0, 80);
      if (!safeKey) continue;
      output[safeKey] = /token|secret|password|private[_-]?key|api[_-]?key|bearer/i.test(safeKey)
        ? (item ? '[redacted]' : item)
        : compactPublisherContextForOpenAi(item, options, depth + 1);
    }
    return output;
  }
  if (typeof value === 'string') return redactPublisherContextSecrets(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().slice(0, maxText);
  return value;
}

function stringList(value = [], max = 20) {
  const source = Array.isArray(value) ? value : String(value || '').split(/[\n,]+/);
  return [...new Set(source.map((item) => String(item || '').replace(/\s+/g, ' ').trim()).filter(Boolean))].slice(0, max);
}

function objectList(value = [], max = 20) {
  return (Array.isArray(value) ? value : []).filter((item) => item && typeof item === 'object').slice(0, max);
}

function artifactStableKey(item = {}, index = 0) {
  return [
    item.id,
    item.name,
    item.title,
    item.slug,
    item.path,
    item.url,
    item.target,
    String(item.content || item.body || '').slice(0, 160)
  ].map((value) => String(value || '').trim()).find(Boolean) || `artifact-${index}`;
}

function mergePublisherObjectLists(primary = [], secondary = [], max = 40, keyForItem = artifactStableKey) {
  const output = [];
  const seen = new Set();
  for (const item of [...objectList(primary, max), ...objectList(secondary, max)]) {
    const key = keyForItem(item, output.length);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
    if (output.length >= max) break;
  }
  return output;
}

function artifactText(item = {}) {
  return String(item.body || item.content || item.text || item.markdown || '').trim();
}

function artifactTitleText(item = {}) {
  return String(item.title || item.name || item.slug || item.path || '').trim();
}

function findSourceArtifactForShaped(shaped = {}, originals = [], used = new Set()) {
  const shapedTitle = artifactTitleText(shaped).toLowerCase();
  const shapedBody = artifactText(shaped).toLowerCase();
  return originals.find((original, index) => {
    if (used.has(index)) return false;
    const originalTitle = artifactTitleText(original).toLowerCase();
    const originalBody = artifactText(original).toLowerCase();
    if (shapedTitle && originalBody.includes(shapedTitle)) return true;
    if (originalTitle && shapedTitle && (originalTitle === shapedTitle || originalTitle.includes(shapedTitle) || shapedTitle.includes(originalTitle))) return true;
    if (shapedBody && originalBody && originalBody.includes(shapedBody) && shapedBody.length > 40) return true;
    return originals.length === 1;
  });
}

function mergePublisherArtifacts(originalArtifacts = [], shapedArtifacts = [], max = 40) {
  const originals = objectList(originalArtifacts, max);
  const shaped = objectList(shapedArtifacts, max);
  if (!shaped.length) return originals;
  const usedOriginalIndexes = new Set();
  const merged = shaped.map((artifact) => {
    const source = findSourceArtifactForShaped(artifact, originals, usedOriginalIndexes);
    if (!source) return artifact;
    const sourceIndex = originals.indexOf(source);
    if (sourceIndex >= 0) usedOriginalIndexes.add(sourceIndex);
    const sourceBody = artifactText(source);
    const shapedBody = artifactText(artifact);
    const body = sourceBody || shapedBody;
    return {
      ...source,
      ...artifact,
      ...(source.name && !artifact.name ? { name: source.name } : {}),
      ...(source.content && !artifact.content ? { content: source.content } : {}),
      ...(body ? { body } : {})
    };
  });
  const unusedOriginals = originals.filter((_, index) => !usedOriginalIndexes.has(index));
  return mergePublisherObjectLists(merged, unusedOriginals, max);
}

function publisherContextShaperSystemPrompt() {
  return [
    'You shape inbound payloads for Publisher & Approval Studio.',
    'Convert writer, SEO, landing, social, directory, WordPress, and approval handoff data into Publisher-ready artifacts.',
    'Preserve user-provided copy and claims. Do not invent sources, metrics, URLs, compliance approvals, or external execution results.',
    'Split clearly separate publish targets into separate artifacts.',
    'Use these channels only: owned_site, wordpress_site, github_pr, x, reddit, indie_hackers, instagram, social, directory, email, generic.',
    'For owned-site publishing use connector=publisher, connector_capability=site_publish_packet, publish_method=publisher_review_or_selected_connector, action_type=site_publish_packet.',
    'For external posts, submissions, email, WordPress, GitHub PRs, or SaaS actions, set status to needs approval and include a concrete risk/blocker.',
    'Return compact JSON matching the schema only.'
  ].join('\n');
}

function normalizePublisherShapedContext(rawContext = {}, shaped = {}, shapeStatus = {}) {
  const original = rawContext && typeof rawContext === 'object' ? rawContext : {};
  const shapedObject = shaped && typeof shaped === 'object' ? shaped : {};
  const rawContextMeta = original.raw_context && typeof original.raw_context === 'object' ? original.raw_context : {};
  const originalArtifacts = objectList(original.artifacts, 40);
  const shapedArtifacts = objectList(shapedObject.artifacts, 40);
  const originalApprovals = objectList(original.approval_requests, 40);
  const shapedApprovals = objectList(shapedObject.approval_requests, 40);
  const originalDeliveryFiles = objectList(original.delivery_files, 30);
  const shapedDeliveryFiles = objectList(shapedObject.delivery_files, 30);
  return {
    ...original,
    source_app: 'publisher_approval_studio',
    source_app_label: 'Publisher & Approval Studio',
    title: String(shapedObject.title || original.title || 'Publisher ingest context').trim(),
    summary: String(shapedObject.summary || original.summary || '').trim(),
    facts: stringList(shapedObject.facts?.length ? shapedObject.facts : original.facts, 40),
    assumptions: stringList(shapedObject.assumptions?.length ? shapedObject.assumptions : original.assumptions, 24),
    artifacts: mergePublisherArtifacts(originalArtifacts, shapedArtifacts, 40),
    recommended_next_actions: stringList(shapedObject.recommended_next_actions?.length ? shapedObject.recommended_next_actions : original.recommended_next_actions, 30),
    approval_requests: mergePublisherObjectLists(originalApprovals, shapedApprovals, 40),
    delivery_files: mergePublisherObjectLists(originalDeliveryFiles, shapedDeliveryFiles, 30, (item = {}, index = 0) => [item.name, item.type, String(item.content || '').slice(0, 160)].map((value) => String(value || '').trim()).find(Boolean) || `file-${index}`),
    handoff_targets: stringList([...(Array.isArray(original.handoff_targets) ? original.handoff_targets : []), 'publisher-approval-studio'], 20),
    raw_context: {
      ...rawContextMeta,
      publisher_context_shape_status: shapeStatus,
      publisher_context_shape_source: compactPublisherContextForOpenAi(original, { depth: 4, maxArray: 8, maxText: 900 })
    }
  };
}

export async function shapePublisherContextWithOpenAi(rawContext = {}, env = {}) {
  const config = publisherContextLlmConfig(env);
  if (!config.enabled || !config.apiKey) {
    const shape = { ok: false, source: 'openai', reason: 'OpenAI API key is not configured' };
    return { context: normalizePublisherShapedContext(rawContext, {}, shape), shape };
  }
  try {
    const response = await fetch(`${config.baseUrl}/responses`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: config.model,
        store: false,
        input: [
          { role: 'system', content: publisherContextShaperSystemPrompt() },
          { role: 'user', content: JSON.stringify({ context: compactPublisherContextForOpenAi(rawContext, { depth: 6, maxArray: 18, maxText: 5000 }) }) }
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'cait_publisher_context_shaper',
            strict: true,
            schema: PUBLISHER_CONTEXT_SHAPER_SCHEMA
          }
        },
        max_output_tokens: 6000
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const reason = String(payload?.error?.message || payload.error || `OpenAI request failed (${response.status})`).slice(0, 300);
      const shape = { ok: false, source: 'openai', reason };
      return { context: normalizePublisherShapedContext(rawContext, {}, shape), shape };
    }
    const shape = { ok: true, source: 'openai_responses', model: config.model };
    return { context: normalizePublisherShapedContext(rawContext, parseJson(extractResponseText(payload)), shape), shape };
  } catch (error) {
    const shape = { ok: false, source: 'openai', reason: String(error?.message || error || 'OpenAI request failed').slice(0, 300) };
    return { context: normalizePublisherShapedContext(rawContext, {}, shape), shape };
  }
}
