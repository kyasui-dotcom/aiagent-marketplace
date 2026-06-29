import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = new URL('../oauth-demo/', import.meta.url);
const framesDir = new URL('frames/', root);
const html = new URL('google-oauth-video.html', root);
const out = new URL('google-oauth-scope-usage-demo.mp4', root);
const frameCount = 10;
const durationSeconds = 5;

mkdirSync(framesDir, { recursive: true });
const filePath = (url) => fileURLToPath(url);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
for (let i = 0; i < frameCount; i += 1) {
  await page.goto(`${html.href}?slide=${i}`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: filePath(new URL(`frame-${String(i).padStart(2, '0')}.png`, framesDir)) });
}
await browser.close();

let concat = '';
for (let i = 0; i < frameCount; i += 1) {
  const framePath = filePath(new URL(`frame-${String(i).padStart(2, '0')}.png`, framesDir)).replace(/\\/g, '/');
  concat += `file '${framePath}'\n`;
  concat += `duration ${durationSeconds}\n`;
}
concat += `file '${filePath(new URL(`frame-${String(frameCount - 1).padStart(2, '0')}.png`, framesDir)).replace(/\\/g, '/')}'\n`;
const concatPath = new URL('frames.txt', framesDir);
writeFileSync(concatPath, concat, 'utf8');

execFileSync('ffmpeg', [
  '-y',
  '-f', 'concat',
  '-safe', '0',
  '-i', filePath(concatPath),
  '-vf', 'fps=30,format=yuv420p',
  '-movflags', '+faststart',
  filePath(out)
], { stdio: 'inherit' });

console.log(filePath(out));
