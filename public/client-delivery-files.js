import { resolveDeliveryActionContract } from './delivery-action-contract.js';
import { compactClientText } from './client-text-utils.js?v=20260521a';

let deliveryZipCrcTable = null;

function deliveryZipUtf8Bytes(value = '') {
  return new TextEncoder().encode(String(value || ''));
}

function deliveryZipCrc32(bytes = new Uint8Array()) {
  if (!deliveryZipCrcTable) {
    deliveryZipCrcTable = new Uint32Array(256);
    for (let index = 0; index < 256; index += 1) {
      let value = index;
      for (let bit = 0; bit < 8; bit += 1) {
        value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
      }
      deliveryZipCrcTable[index] = value >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = deliveryZipCrcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function deliveryZipSafeName(value = '', index = 0) {
  const raw = String(value || `delivery-${index + 1}.txt`).trim();
  const safe = raw
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/[\x00-\x1f]+/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 160)
    .trim();
  return safe || `delivery-${index + 1}.txt`;
}

function deliveryZipUniqueName(name = '', seen = new Set()) {
  const safeName = deliveryZipSafeName(name, seen.size);
  const lower = safeName.toLowerCase();
  if (!seen.has(lower)) {
    seen.add(lower);
    return safeName;
  }
  const dot = safeName.lastIndexOf('.');
  const base = dot > 0 ? safeName.slice(0, dot) : safeName;
  const ext = dot > 0 ? safeName.slice(dot) : '';
  let counter = 2;
  while (counter < 1000) {
    const candidate = `${base}-${counter}${ext}`;
    const candidateLower = candidate.toLowerCase();
    if (!seen.has(candidateLower)) {
      seen.add(candidateLower);
      return candidate;
    }
    counter += 1;
  }
  const fallback = `${base}-${Date.now()}${ext}`;
  seen.add(fallback.toLowerCase());
  return fallback;
}

function deliveryZipDosDateTime(date = new Date()) {
  const year = Math.max(1980, Math.min(2107, date.getFullYear()));
  return {
    time: ((date.getHours() & 31) << 11) | ((date.getMinutes() & 63) << 5) | ((Math.floor(date.getSeconds() / 2)) & 31),
    date: (((year - 1980) & 127) << 9) | (((date.getMonth() + 1) & 15) << 5) | (date.getDate() & 31)
  };
}

function deliveryZipHeader(size) {
  const bytes = new Uint8Array(size);
  return { bytes, view: new DataView(bytes.buffer) };
}

function deliveryZipLocalHeader(record) {
  const header = deliveryZipHeader(30 + record.nameBytes.length);
  header.view.setUint32(0, 0x04034b50, true);
  header.view.setUint16(4, 20, true);
  header.view.setUint16(6, 0x0800, true);
  header.view.setUint16(8, 0, true);
  header.view.setUint16(10, record.time, true);
  header.view.setUint16(12, record.date, true);
  header.view.setUint32(14, record.crc, true);
  header.view.setUint32(18, record.size, true);
  header.view.setUint32(22, record.size, true);
  header.view.setUint16(26, record.nameBytes.length, true);
  header.view.setUint16(28, 0, true);
  header.bytes.set(record.nameBytes, 30);
  return header.bytes;
}

function deliveryZipCentralHeader(record) {
  const header = deliveryZipHeader(46 + record.nameBytes.length);
  header.view.setUint32(0, 0x02014b50, true);
  header.view.setUint16(4, 20, true);
  header.view.setUint16(6, 20, true);
  header.view.setUint16(8, 0x0800, true);
  header.view.setUint16(10, 0, true);
  header.view.setUint16(12, record.time, true);
  header.view.setUint16(14, record.date, true);
  header.view.setUint32(16, record.crc, true);
  header.view.setUint32(20, record.size, true);
  header.view.setUint32(24, record.size, true);
  header.view.setUint16(28, record.nameBytes.length, true);
  header.view.setUint16(30, 0, true);
  header.view.setUint16(32, 0, true);
  header.view.setUint16(34, 0, true);
  header.view.setUint16(36, 0, true);
  header.view.setUint32(38, 0, true);
  header.view.setUint32(42, record.offset, true);
  header.bytes.set(record.nameBytes, 46);
  return header.bytes;
}

export function buildDeliveryZipBlob(files = []) {
  const inputFiles = (Array.isArray(files) ? files : [])
    .map((file, index) => ({
      name: file?.name || `delivery-${index + 1}.txt`,
      content: String(file?.content || '')
    }))
    .filter((file) => file.content);
  if (!inputFiles.length) return null;

  const seen = new Set();
  const timestamp = deliveryZipDosDateTime(new Date());
  const records = [];
  const localChunks = [];
  let offset = 0;

  inputFiles.forEach((file) => {
    const name = deliveryZipUniqueName(file.name, seen);
    const nameBytes = deliveryZipUtf8Bytes(name);
    const dataBytes = deliveryZipUtf8Bytes(file.content);
    const record = {
      nameBytes,
      dataBytes,
      crc: deliveryZipCrc32(dataBytes),
      size: dataBytes.length,
      offset,
      time: timestamp.time,
      date: timestamp.date
    };
    const localHeader = deliveryZipLocalHeader(record);
    records.push(record);
    localChunks.push(localHeader, dataBytes);
    offset += localHeader.length + dataBytes.length;
  });

  const centralOffset = offset;
  const centralChunks = records.map((record) => deliveryZipCentralHeader(record));
  const centralSize = centralChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const end = deliveryZipHeader(22);
  end.view.setUint32(0, 0x06054b50, true);
  end.view.setUint16(4, 0, true);
  end.view.setUint16(6, 0, true);
  end.view.setUint16(8, records.length, true);
  end.view.setUint16(10, records.length, true);
  end.view.setUint32(12, centralSize, true);
  end.view.setUint32(16, centralOffset, true);
  end.view.setUint16(20, 0, true);

  return new Blob([...localChunks, ...centralChunks, end.bytes], { type: 'application/zip' });
}

export function normalizeArticleText(value = '') {
  return String(value || '').replace(/\r\n/g, '\n').trim();
}

function rawDeliveryText(value = '') {
  return value === undefined || value === null ? '' : String(value);
}

function firstRawReportText(report = {}) {
  const candidates = [report?.article, report?.content, report?.draft, report?.answer, report?.summary];
  const found = candidates.find((value) => normalizeArticleText(value || ''));
  return rawDeliveryText(found);
}

function inferArticleTitleFromText(text = '') {
  const normalized = normalizeArticleText(text);
  if (!normalized) return '';
  const markdownTitle = normalized.match(/^#\s+(.+)$/m)?.[1] || '';
  if (markdownTitle) return compactClientText(markdownTitle, 140);
  const firstLine = normalized.split('\n').map((line) => line.trim()).find(Boolean) || '';
  return compactClientText(firstLine.replace(/^title:\s*/i, ''), 140);
}

function slugifyArticleTitle(value = '') {
  const base = String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 96);
  return base || `article-${new Date().toISOString().slice(0, 10)}`;
}

function textLooksLikeArticle(text = '') {
  const normalized = normalizeArticleText(text);
  if (!normalized) return false;
  const hasHeadings = /^#\s+.+$/m.test(normalized) || /\n##\s+.+/m.test(normalized);
  const paragraphs = normalized.split(/\n\s*\n/).filter((part) => part.trim().length > 80);
  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  return Boolean(
    normalized.length >= 800
    && wordCount >= 140
    && (hasHeadings || paragraphs.length >= 3)
  );
}

export function deliveryClassificationInput(report = {}, files = []) {
  const safeFiles = Array.isArray(files) ? files : [];
  const preferredFile = safeFiles.find((file) => {
    const name = String(file?.name || '').toLowerCase();
    const type = String(file?.type || '').toLowerCase();
    const content = normalizeArticleText(file?.content || '');
    return Boolean(
      content
      && (
        /\.(md|mdx|markdown|html|txt)$/.test(name)
        || /(article|blog|post|seo|landing)/.test(name)
        || /(markdown|html|text)/.test(type)
      )
    );
  }) || null;
  const fileText = rawDeliveryText(preferredFile?.content);
  const reportText = firstRawReportText(report);
  const content = fileText || reportText;
  if (!normalizeArticleText(content)) return null;
  return {
    content,
    fileName: preferredFile?.name || '',
    format: preferredFile?.type || (preferredFile?.name && preferredFile.name.toLowerCase().endsWith('.html') ? 'text/html' : 'text/markdown'),
    title: compactClientText(String(report?.title || report?.headline || inferArticleTitleFromText(content) || ''), 140)
  };
}

export function articleCandidateFromDelivery(run = null, report = {}, files = []) {
  const deliveryInput = deliveryClassificationInput(report, files);
  if (!deliveryInput) return null;
  const { content, fileName, format, title: hintedTitle } = deliveryInput;
  if (!textLooksLikeArticle(content) && !fileName) return null;
  const title = compactClientText(
    String(report?.title || report?.headline || hintedTitle || `${run?.taskType || 'article'} draft`),
    140
  );
  const suggestedSlug = slugifyArticleTitle(title);
  return {
    type: 'article_draft',
    title,
    content,
    fileName: fileName || `${suggestedSlug}.md`,
    format,
    suggestedSlug,
    source: fileName ? 'file' : 'report'
  };
}

export function articleCandidateFromClassification(run = null, cached = null) {
  if (!run?.id || !cached || cached.status !== 'done' || cached.contentType !== 'article_draft' || !cached.content) return null;
  const title = compactClientText(String(cached.title || inferArticleTitleFromText(cached.content) || `${run?.taskType || 'article'} draft`), 140);
  const suggestedSlug = slugifyArticleTitle(String(cached.suggestedSlug || title));
  return {
    type: 'article_draft',
    title,
    content: rawDeliveryText(cached.content),
    fileName: String(cached.fileName || `${suggestedSlug}.md`),
    format: String(cached.format || 'text/markdown'),
    suggestedSlug,
    source: 'openai'
  };
}

export function genericDeliverableFromClassification(run = null, cached = null) {
  if (!run?.id || !cached || cached.status !== 'done' || !cached.content || !cached.contentType || cached.contentType === 'other' || cached.contentType === 'article_draft') return null;
  return {
    type: String(cached.contentType || 'other'),
    title: compactClientText(String(cached.title || `${run?.taskType || 'delivery'} output`), 140),
    content: rawDeliveryText(cached.content),
    fileName: String(cached.fileName || ''),
    format: String(cached.format || 'text/markdown'),
    confidence: Number(cached.confidence || 0),
    reason: String(cached.reason || ''),
    actionContract: resolveDeliveryActionContract(cached.contentType, cached.actionContract)
  };
}

export function genericDeliverableFromExplicitFiles(report = {}, files = []) {
  const safeFiles = Array.isArray(files) ? files : [];
  const explicit = safeFiles.find((file) => {
    const type = String(file?.content_type || file?.contentType || '').trim();
    return Boolean(
      String(file?.content || '').trim()
      && ['social_post_pack', 'email_pack', 'code_handoff', 'report_bundle'].includes(type)
      && (file?.execution_candidate === true || file?.executionCandidate === true)
    );
  }) || null;
  if (!explicit) {
    const reportCandidate = report?.execution_candidate && typeof report.execution_candidate === 'object'
      ? report.execution_candidate
      : report?.executionCandidate && typeof report.executionCandidate === 'object'
        ? report.executionCandidate
        : null;
    if (!reportCandidate?.type || !String(reportCandidate?.content || '').trim()) return null;
    return {
      type: String(reportCandidate.type || '').trim(),
      title: compactClientText(String(reportCandidate.title || 'Execution candidate'), 140),
      content: rawDeliveryText(reportCandidate.content),
      fileName: String(reportCandidate.file_name || reportCandidate.fileName || ''),
      format: String(reportCandidate.format || 'text/markdown'),
      confidence: 1,
      reason: String(reportCandidate.reason || ''),
      actionContract: resolveDeliveryActionContract(String(reportCandidate.type || '').trim(), reportCandidate.action_contract || reportCandidate.actionContract),
      draftDefaults: reportCandidate.draft_defaults && typeof reportCandidate.draft_defaults === 'object' ? reportCandidate.draft_defaults : {}
    };
  }
  const normalizedType = String(explicit.content_type || explicit.contentType || '').trim();
  return {
    type: normalizedType,
    title: compactClientText(String(explicit.title || explicit.name || 'Execution candidate'), 140),
    content: rawDeliveryText(explicit.content),
    fileName: String(explicit.name || ''),
    format: String(explicit.type || 'text/markdown'),
    confidence: 1,
    reason: String(explicit.reason || ''),
    actionContract: resolveDeliveryActionContract(normalizedType, explicit.action_contract || explicit.actionContract),
    draftDefaults: explicit.draft_defaults && typeof explicit.draft_defaults === 'object' ? explicit.draft_defaults : {}
  };
}

export function shouldClassifyDeliveryCandidate(run = null, report = {}, files = [], article = null, cached = null) {
  if (!run?.id || article) return false;
  if (String(run.status || '') !== 'completed') return false;
  if (cached && ['pending', 'done', 'error'].includes(String(cached.status || ''))) return false;
  const input = deliveryClassificationInput(report, files);
  if (!input?.content) return false;
  const normalized = normalizeArticleText(input.content);
  if (normalized.length < 500) return false;
  return Boolean(
    /^#\s+.+$/m.test(normalized)
    || /\n##\s+.+/m.test(normalized)
    || /\.(md|mdx|markdown|html|txt)$/i.test(String(input.fileName || ''))
    || /(markdown|html|text)/i.test(String(input.format || ''))
  );
}
