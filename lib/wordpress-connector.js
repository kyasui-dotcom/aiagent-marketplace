import { connectorTokenEncryptionConfigured, decryptConnectorSecret } from './connector-secrets.js';

const WORDPRESS_CAPABILITIES = Object.freeze(['wordpress.create_draft']);

function normalizeString(value = '', fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function base64Utf8(value = '') {
  const bytes = new TextEncoder().encode(String(value || ''));
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function escapeHtml(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function markdownishToHtml(markdown = '') {
  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let paragraph = [];
  let list = [];
  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push(`<p>${escapeHtml(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (!list.length) return;
    blocks.push(`<ul>${list.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`);
    list = [];
  };
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }
    const heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = Math.min(4, heading[1].length);
      blocks.push(`<h${level}>${escapeHtml(heading[2])}</h${level}>`);
      continue;
    }
    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      list.push(bullet[1]);
      continue;
    }
    flushList();
    paragraph.push(trimmed);
  }
  flushParagraph();
  flushList();
  return blocks.join('\n') || '<p></p>';
}

export function normalizeWordPressSiteUrl(value = '') {
  const raw = normalizeString(value).replace(/\/+$/, '');
  if (!raw) throw new Error('WordPress site URL is required.');
  const url = new URL(raw);
  if (url.protocol !== 'https:') throw new Error('WordPress Application Password connections require an HTTPS site URL.');
  url.pathname = '';
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/+$/, '');
}

export function publicWordPressConnectorStatus(connector = null, env = {}) {
  const wp = connector && typeof connector === 'object' ? connector : {};
  return {
    configured: true,
    encryptionConfigured: connectorTokenEncryptionConfigured(env),
    connected: Boolean(wp.connected && wp.siteUrl && wp.username && wp.applicationPasswordEnc),
    provider: normalizeString(wp.provider),
    siteUrl: normalizeString(wp.siteUrl),
    username: normalizeString(wp.username),
    displayName: normalizeString(wp.displayName),
    capabilities: Array.isArray(wp.capabilities) ? wp.capabilities : WORDPRESS_CAPABILITIES,
    connectedAt: normalizeString(wp.connectedAt),
    updatedAt: normalizeString(wp.updatedAt),
    lastCheckedAt: normalizeString(wp.lastCheckedAt),
    lastDraftAt: normalizeString(wp.lastDraftAt),
    lastDraftId: normalizeString(wp.lastDraftId),
    lastDraftUrl: normalizeString(wp.lastDraftUrl)
  };
}

export function wordpressConnectorFromApplicationPassword({
  siteUrl = '',
  username = '',
  applicationPasswordEnc = '',
  displayName = '',
  existing = {}
} = {}) {
  const now = new Date().toISOString();
  return {
    ...(existing || {}),
    provider: 'wordpress-application-password',
    connected: true,
    siteUrl: normalizeWordPressSiteUrl(siteUrl),
    username: normalizeString(username),
    displayName: normalizeString(displayName || existing?.displayName || username),
    applicationPasswordEnc: normalizeString(applicationPasswordEnc || existing?.applicationPasswordEnc),
    capabilities: WORDPRESS_CAPABILITIES,
    connectedAt: normalizeString(existing?.connectedAt, now),
    updatedAt: now,
    lastCheckedAt: now
  };
}

function wordpressRestUrl(siteUrl = '', path = '') {
  const base = normalizeWordPressSiteUrl(siteUrl);
  const suffix = String(path || '').replace(/^\/+/, '');
  return `${base}/wp-json/${suffix}`;
}

async function fetchWordPressJson(url = '', { username = '', applicationPassword = '', method = 'GET', body = null } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      authorization: `Basic ${base64Utf8(`${username}:${applicationPassword}`)}`,
      accept: 'application/json',
      ...(body ? { 'content-type': 'application/json' } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.message || payload?.error || payload?.code || `WordPress request failed (${response.status})`;
    const error = new Error(message);
    error.statusCode = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

export async function testWordPressApplicationPassword({ siteUrl = '', username = '', applicationPassword = '' } = {}) {
  const safeSiteUrl = normalizeWordPressSiteUrl(siteUrl);
  const safeUsername = normalizeString(username);
  const safePassword = normalizeString(applicationPassword);
  if (!safeUsername) throw new Error('WordPress username is required.');
  if (!safePassword) throw new Error('WordPress Application Password is required.');
  const payload = await fetchWordPressJson(wordpressRestUrl(safeSiteUrl, 'wp/v2/users/me?context=edit'), {
    username: safeUsername,
    applicationPassword: safePassword
  });
  return {
    siteUrl: safeSiteUrl,
    username: safeUsername,
    displayName: normalizeString(payload?.name || payload?.slug || safeUsername),
    user: payload
  };
}

export async function createWordPressDraft(env = {}, connector = {}, draft = {}) {
  if (!connector?.connected || !connector?.applicationPasswordEnc || !connector?.siteUrl || !connector?.username) {
    const error = new Error('WordPress connection required before creating a draft.');
    error.statusCode = 409;
    throw error;
  }
  const postType = /^pages?$/i.test(String(draft.postType || draft.post_type || 'posts')) ? 'pages' : 'posts';
  const status = normalizeString(draft.status, 'draft').toLowerCase();
  if (status !== 'draft') {
    const error = new Error('Publisher WordPress connector only creates drafts. Publish from WordPress after review.');
    error.statusCode = 428;
    throw error;
  }
  const title = normalizeString(draft.title, 'CAIt publisher draft');
  const markdown = normalizeString(draft.content || draft.body || draft.markdown);
  const html = normalizeString(draft.contentHtml || draft.content_html) || markdownishToHtml(markdown || title);
  const applicationPassword = await decryptConnectorSecret(env, connector.applicationPasswordEnc);
  const payload = await fetchWordPressJson(wordpressRestUrl(connector.siteUrl, `wp/v2/${postType}`), {
    username: connector.username,
    applicationPassword,
    method: 'POST',
    body: {
      title,
      content: html,
      status: 'draft',
      ...(normalizeString(draft.slug) ? { slug: normalizeString(draft.slug).replace(/^\/+/, '') } : {}),
      ...(normalizeString(draft.excerpt) ? { excerpt: normalizeString(draft.excerpt) } : {})
    }
  });
  const id = normalizeString(payload?.id);
  const link = normalizeString(payload?.link || payload?.guid?.rendered);
  const editUrl = id ? `${normalizeWordPressSiteUrl(connector.siteUrl)}/wp-admin/post.php?post=${encodeURIComponent(id)}&action=edit` : '';
  return {
    id,
    link,
    editUrl,
    status: normalizeString(payload?.status, 'draft'),
    postType,
    raw: payload
  };
}
