import { readFileSync, writeFileSync } from 'node:fs';
import { renderChatPagesNav, renderHomeHeader } from '../lib/site-header.js';

function replaceBlock(source, startMarker, endMarker, replacement) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker);
  if (start < 0 || end < 0 || end <= start) {
    throw new Error(`Missing shared header markers: ${startMarker}`);
  }
  return [
    source.slice(0, start + startMarker.length),
    '\n',
    replacement,
    '\n',
    source.slice(end)
  ].join('');
}

function syncFile(path, replacements) {
  let source = readFileSync(path, 'utf8');
  for (const replacement of replacements) {
    source = replaceBlock(source, replacement.start, replacement.end, replacement.html);
  }
  writeFileSync(path, source, 'utf8');
}

syncFile(new URL('../public/index.html', import.meta.url), [
  {
    start: '<!-- CAIT_SHARED_HEADER:home:start -->',
    end: '<!-- CAIT_SHARED_HEADER:home:end -->',
    html: renderHomeHeader()
  }
]);

syncFile(new URL('../public/chat.html', import.meta.url), [
  {
    start: '<!-- CAIT_SHARED_HEADER:chat-pages:start -->',
    end: '<!-- CAIT_SHARED_HEADER:chat-pages:end -->',
    html: renderChatPagesNav()
  }
]);

console.log('shared headers synced');
