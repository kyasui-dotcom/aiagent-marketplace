export const ORDER_INPUT_MAX_URLS = 20;
export const ORDER_INPUT_MAX_FILES = 5;
export const ORDER_INPUT_MAX_FILE_BYTES = 200 * 1024;
export const ORDER_INPUT_MAX_FILE_CHARS = 12000;
export const ORDER_INPUT_TOTAL_FILE_CHARS = 40000;
export const LONG_PROMPT_GUARD_CHARS = 2200;
export const PROMPT_LIKE_GUARD_CHARS = 700;
export const LONG_PROMPT_SOURCE_CHUNK_CHARS = Math.floor(ORDER_INPUT_TOTAL_FILE_CHARS / ORDER_INPUT_MAX_FILES);

const ORDER_INPUT_TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'json', 'csv', 'tsv', 'js', 'ts', 'py',
  'html', 'htm', 'css', 'scss', 'xml', 'yaml', 'yml', 'log', 'ini',
  'cfg', 'toml', 'sql'
]);

export function formatBytes(value = 0) {
  const size = Number(value || 0);
  if (!Number.isFinite(size) || size <= 0) return '0 B';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function inferTextMimeFromName(name = '') {
  const ext = String(name || '').split('.').pop()?.toLowerCase() || '';
  if (!ext) return 'text/plain';
  if (ext === 'json') return 'application/json';
  if (ext === 'csv') return 'text/csv';
  if (ext === 'tsv') return 'text/tab-separated-values';
  if (ext === 'html' || ext === 'htm') return 'text/html';
  if (ext === 'xml') return 'application/xml';
  if (ext === 'yaml' || ext === 'yml') return 'application/x-yaml';
  if (ext === 'md' || ext === 'markdown') return 'text/markdown';
  return 'text/plain';
}

export function isOrderInputFileSupported(file = {}) {
  const mime = String(file.type || '').toLowerCase();
  if (mime.startsWith('text/')) return true;
  if (mime === 'application/json' || mime === 'application/xml' || mime === 'application/x-yaml') return true;
  const ext = String(file.name || '').split('.').pop()?.toLowerCase() || '';
  return ORDER_INPUT_TEXT_EXTENSIONS.has(ext);
}

export function normalizeOrderInputUrls(raw = '') {
  const lines = String(raw || '')
    .split(/\r?\n/)
    .map((line) => String(line || '').trim())
    .filter(Boolean);
  const unique = [];
  const seen = new Set();
  let omitted = 0;
  for (const line of lines) {
    try {
      const parsed = new URL(line);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        omitted += 1;
        continue;
      }
      const normalized = parsed.toString();
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      if (unique.length < ORDER_INPUT_MAX_URLS) unique.push(normalized);
      else omitted += 1;
    } catch {
      omitted += 1;
    }
  }
  return { urls: unique, omitted };
}

export function normalizeOrderInputFile(file = {}) {
  const name = String(file.name || 'source.txt').trim().slice(0, 140) || 'source.txt';
  const type = String(file.type || inferTextMimeFromName(name)).trim() || 'text/plain';
  const size = Number(file.size || 0);
  let content = String(file.content || '').replace(/\u0000/g, '').trim();
  let truncated = Boolean(file.truncated);
  if (content.length > ORDER_INPUT_MAX_FILE_CHARS) {
    content = `${content.slice(0, ORDER_INPUT_MAX_FILE_CHARS)}\n\n[truncated]`;
    truncated = true;
  }
  return {
    name,
    type,
    size: Number.isFinite(size) ? size : 0,
    content,
    truncated
  };
}

export function orderInputCounts(input = null) {
  const urls = Array.isArray(input?.urls) ? input.urls.filter(Boolean) : [];
  const files = Array.isArray(input?.files) ? input.files.filter((file) => file && file.content) : [];
  const fileChars = files.reduce((sum, file) => sum + String(file.content || '').length, 0);
  return {
    urlCount: urls.length,
    fileCount: files.length,
    fileChars
  };
}

export function fallbackPromptFromOrderInput(input = null) {
  const counts = orderInputCounts(input);
  if (!counts.urlCount && !counts.fileCount) return 'auto task';
  const source = [
    counts.urlCount ? `${counts.urlCount} URL${counts.urlCount === 1 ? '' : 's'}` : null,
    counts.fileCount ? `${counts.fileCount} file${counts.fileCount === 1 ? '' : 's'}` : null
  ].filter(Boolean).join(' + ');
  return `Use the provided sources (${source}) and complete the requested task.`;
}
