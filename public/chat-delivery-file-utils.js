const USER_DELIVERY_INTERNAL_MARKERS = [
  '=== workflow handoff context ===',
  '=== workflow additional prompt ===',
  '=== end workflow handoff context ===',
  'canonical user brief',
  'process program',
  'structured handoff digest',
  'prior specialist deliverables',
  'prior specialist deliverable:',
  'required output behavior:'
];

const USER_DELIVERY_INTERNAL_SECTION_TITLES = new Set([
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
  'delivered content summaries'
]);

export function safeFileName(value = '', fallback = 'delivery.md') {
  const raw = String(value || fallback || 'delivery.md').trim() || 'delivery.md';
  const cleaned = raw
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .slice(0, 140)
    .trim();
  return cleaned || fallback || 'delivery.md';
}

export function fileMimeType(name = '', content = '') {
  if (/\.html?$/i.test(name) || /<!doctype html|<html[\s>]/i.test(content)) return 'text/html;charset=utf-8';
  if (/\.(md|markdown|mdx)$/i.test(name)) return 'text/markdown;charset=utf-8';
  if (/\.json$/i.test(name)) return 'application/json;charset=utf-8';
  return 'text/plain;charset=utf-8';
}

function cleanDeliverySectionTitle(line = '') {
  return String(line || '')
    .replace(/^#{1,6}\s+/, '')
    .replace(/\*\*/g, '')
    .replace(/[:：]\s*$/, '')
    .trim()
    .toLowerCase();
}

function deliveryLineLooksInternal(line = '') {
  const text = String(line || '').toLowerCase();
  return /provider\.runjob|agent-file provider implementation|agent_file_provider_delivery|central built-in runner|future behavior changes should be made|共通\s*builtin\s*runner|agent ファイル内の provider|agent ファイルの provider 実装|handoff evidence attached|leader-owned prior work|external posting, sending, ad launch|leader checkpoint|deliveryで表示される要約|trust profile|根拠ゲート|実行ゲート|品質ゲート|受け入れ条件|レビュー条件|未保証|source run\s*:|_file content is available/.test(text);
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

export function sanitizeDeliveryMarkdownForUser(content = '') {
  const raw = String(content || '').replace(/\r\n/g, '\n');
  if (!raw.trim()) return '';
  let text = raw
    .replace(/=== WORKFLOW HANDOFF CONTEXT ===[\s\S]*?=== END WORKFLOW HANDOFF CONTEXT ===/gi, '')
    .replace(/=== WORKFLOW ADDITIONAL PROMPT ===[\s\S]*?(?=\n#{1,6}\s|\n\*\*|$)/gi, '');
  const lines = text.split('\n');
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
    if (USER_DELIVERY_INTERNAL_MARKERS.some((marker) => lower.includes(marker))) {
      skipping = true;
      continue;
    }
    const heading = trimmed.match(/^#{1,6}\s+(.+)$/);
    if (heading) {
      const title = cleanDeliverySectionTitle(trimmed);
      if (USER_DELIVERY_INTERNAL_SECTION_TITLES.has(title) || title.startsWith('prior specialist deliverable')) {
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
  if (!deliveryContentLooksTemplateOnly(cleaned)) return cleaned;
  return '';
}

export function sanitizeDeliveryFileForUser(file = {}, fallbackName = 'delivery.md') {
  const rawContent = String(file?.content || file?.body || '');
  const content = sanitizeDeliveryMarkdownForUser(rawContent);
  const name = safeFileName(file?.name || file?.filename || fallbackName, fallbackName);
  return {
    ...(file && typeof file === 'object' ? file : {}),
    name,
    content,
    type: String(file?.type || fileMimeType(name, content)).trim() || fileMimeType(name, content)
  };
}

function isInternalDeliveryFile(file = {}) {
  const name = String(file?.name || file?.filename || '').trim().toLowerCase();
  const content = String(file?.content || file?.body || '').trim();
  const contentType = String(file?.content_type || file?.contentType || '').trim().toLowerCase();
  const visibility = String(file?.visibility || file?.delivery_visibility || file?.deliveryVisibility || '').trim().toLowerCase();
  if (file?.internal === true || file?.user_visible === false || file?.userVisible === false || file?.delivery_visible === false || file?.deliveryVisible === false) return true;
  if (['internal', 'hidden', 'system'].includes(visibility)) return true;
  if ([
    'supporting_specialist_deliverables',
    'workflow_integrated_delivery',
    'partial_workflow_delivery',
    'all_deliverables_bundle',
    'review_ready_delivery'
  ].includes(contentType)) return true;
  if (name === 'supporting-specialist-deliverables.md') return true;
  if (name === 'integrated-delivery.md' && /#\s+Integrated delivery|##\s+Supporting work products|##\s+Integrated next actions/i.test(content)) return true;
  if (name === 'workflow-partial-delivery.md') return true;
  if (name === 'all-deliverables.md' || /^all-deliverables-[^.]+\.md$/i.test(name)) return true;
  if (name === 'review-ready-delivery.md' || /^review-ready-delivery-[^.]+\.md$/i.test(name)) return true;
  return false;
}

export function visibleDeliveryFiles(files = []) {
  return (Array.isArray(files) ? files : []).filter((file) => file && !isInternalDeliveryFile(file));
}

function explicitDeliveryFilePriority(file = {}) {
  const values = [
    file?.delivery_priority,
    file?.deliveryPriority,
    file?.display_priority,
    file?.displayPriority,
    file?.sort_order,
    file?.sortOrder
  ];
  for (const value of values) {
    if (value == null || value === '') continue;
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

export function deliveryFilePriority(file = {}) {
  const explicit = explicitDeliveryFilePriority(file);
  if (explicit != null) return explicit;
  if (file?.execution_candidate === true || file?.executionCandidate === true) return 0;
  const roleText = [
    file?.delivery_role,
    file?.deliveryRole,
    file?.source_role,
    file?.sourceRole,
    file?.role,
    file?.phase,
    file?.source_phase,
    file?.sourcePhase
  ].map((item) => String(item || '').trim().toLowerCase()).filter(Boolean).join('\n');
  if (/(^|\b)(final|primary|selected|recommended|summary|user[-_\s]?facing)(\b|$)/.test(roleText)) return 10;
  if (/(^|\b)(supporting|appendix|evidence|source|raw|diagnostic|internal)(\b|$)/.test(roleText)) return 80;
  return 60;
}

export function cleanReadableBundleContent(value = '') {
  const lines = String(value || '').replace(/\r\n/g, '\n').split('\n');
  const result = [];
  let skip = false;
  for (const line of lines) {
    if (/^\s*-?\s*Source run\s*:/i.test(line)) continue;
    if (/^\s*This bundle is copied into the parent delivery/i.test(line)) continue;
    if (/^\s*This file contains the completed Markdown deliverables/i.test(line)) continue;
    const heading = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (heading) {
      const level = heading[1].length;
      const title = heading[2].trim();
      const noisy = (
        /^Original information used$/i.test(title)
        || /^Upstream work used$/i.test(title)
        || /^受け渡し情報の利用$/i.test(title)
        || /^Braveソース由来の補助分析$/i.test(title)
        || /^Agent handoff$/i.test(title)
        || /^下流エージェント用handoff packet$/i.test(title)
        || /^Downstream handoff$/i.test(title)
        || /^後続エージェントへの制約$/i.test(title)
      );
      if (noisy) {
        skip = true;
        continue;
      }
      if (skip && level <= 2) skip = false;
    }
    if (skip) continue;
    result.push(line);
  }
  return result.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export async function copyTextToClipboard(text = '') {
  const value = String(text || '');
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

export function downloadTextFile(file = {}) {
  const content = String(file.content || '');
  const name = safeFileName(file.name || 'delivery.md', 'delivery.md');
  const blob = new Blob([content], { type: String(file.type || fileMimeType(name, content)) });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function combinedMarkdownFile(files = []) {
  const sections = (Array.isArray(files) ? files : [])
    .map((file, index) => {
      const sanitized = sanitizeDeliveryFileForUser(file, `delivery-${index + 1}.md`);
      const name = safeFileName(sanitized.name || `delivery-${index + 1}.md`, `delivery-${index + 1}.md`);
      const content = String(sanitized.content || '').trim();
      if (!content) return '';
      const fence = /\.html?$/i.test(name) ? 'html' : (/\.json$/i.test(name) ? 'json' : 'markdown');
      return [`## ${name}`, '', `\`\`\`${fence}`, content, '```'].join('\n');
    })
    .filter(Boolean);
  return {
    name: `delivery-bundle-${new Date().toISOString().slice(0, 10)}.md`,
    type: 'text/markdown;charset=utf-8',
    content: ['# Delivery bundle', '', ...sections].join('\n')
  };
}

export function createChatDeliveryFileUtils(options = {}) {
  const maxStoredFiles = Math.max(1, Number(options.maxStoredFiles || 80) || 80);
  const deliveryFileStore = new Map();

  function clearDeliveryFiles() {
    deliveryFileStore.clear();
  }

  function getDeliveryFile(id = '') {
    return deliveryFileStore.get(String(id || '')) || null;
  }

  function registerDeliveryFile(file = {}, fallbackName = 'delivery.md') {
    const sanitized = sanitizeDeliveryFileForUser(file, fallbackName);
    const name = safeFileName(sanitized.name || fallbackName, fallbackName);
    const content = String(sanitized.content || '');
    const id = `file-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 10)}`;
    deliveryFileStore.set(id, {
      ...(sanitized && typeof sanitized === 'object' ? sanitized : {}),
      name,
      content,
      type: String(sanitized.type || fileMimeType(name, content)).trim() || fileMimeType(name, content)
    });
    while (deliveryFileStore.size > maxStoredFiles) {
      const first = deliveryFileStore.keys().next().value;
      if (!first) break;
      deliveryFileStore.delete(first);
    }
    return { ...(sanitized && typeof sanitized === 'object' ? sanitized : {}), id, name, content };
  }

  return {
    clearDeliveryFiles,
    combinedMarkdownFile,
    copyTextToClipboard,
    deliveryFilePriority,
    downloadTextFile,
    getDeliveryFile,
    registerDeliveryFile,
    sanitizeDeliveryFileForUser,
    sanitizeDeliveryMarkdownForUser,
    cleanReadableBundleContent,
    visibleDeliveryFiles
  };
}
