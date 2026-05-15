import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { basename, extname, join, resolve } from 'node:path';

const root = resolve('oauth-demo');
const sourceDir = join(root, 'source-screenshots');
const workDir = join(root, 'screenshot-video-work');
const outputPath = join(root, 'google-oauth-scope-usage-from-screenshots.mp4');
const captionsPath = join(root, 'google-oauth-screenshot-captions.json');
const durationSeconds = Number(process.env.OAUTH_SCREENSHOT_DURATION_SECONDS || 5);
const width = 1920;
const height = 1080;

const captions = JSON.parse(await readFileText(captionsPath));

async function readFileText(path) {
  const { readFile } = await import('node:fs/promises');
  return readFile(path, 'utf8');
}

function captionFor(fileName) {
  const lower = fileName.toLowerCase();
  const exact = captions.find((item) => item.match !== '*' && lower.includes(String(item.match || '').toLowerCase()));
  return String((exact || captions.find((item) => item.match === '*'))?.caption || '').trim();
}

function wrapCaption(value, maxChars = 92) {
  const words = String(value || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 2).join('\n');
}

function escapeDrawText(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\n/g, '\\n')
    .replace(/%/g, '\\%');
}

if (!existsSync(sourceDir)) mkdirSync(sourceDir, { recursive: true });
const images = readdirSync(sourceDir)
  .filter((name) => /\.(png|jpe?g)$/i.test(name))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  .map((name) => join(sourceDir, name));

if (!images.length) {
  console.error(`No screenshots found in ${sourceDir}`);
  console.error('Save the original screenshots there as 01-home.png, 02-apps.png, etc., then run this script again.');
  process.exit(1);
}

rmSync(workDir, { recursive: true, force: true });
mkdirSync(workDir, { recursive: true });

const font = 'C\\:/Windows/Fonts/arial.ttf';
const concatLines = [];

images.forEach((imagePath, index) => {
  const name = basename(imagePath);
  const segmentPath = join(workDir, `segment-${String(index).padStart(2, '0')}.mp4`);
  const caption = escapeDrawText(wrapCaption(captionFor(name)));
  const filter = [
    `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
    `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=white`,
    'format=yuv420p',
    `drawbox=x=72:y=918:w=1776:h=112:color=black@0.78:t=fill`,
    `drawtext=fontfile='${font}':text='${caption}':fontcolor=white:fontsize=34:line_spacing=8:x=104:y=946:box=0`
  ].join(',');
  execFileSync('ffmpeg', [
    '-y',
    '-loop', '1',
    '-framerate', '30',
    '-t', String(durationSeconds),
    '-i', imagePath,
    '-vf', filter,
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    segmentPath
  ], { stdio: 'inherit' });
  concatLines.push(`file '${segmentPath.replace(/\\/g, '/')}'`);
});

const concatPath = join(workDir, 'segments.txt');
writeFileSync(concatPath, `${concatLines.join('\n')}\n`, 'utf8');

execFileSync('ffmpeg', [
  '-y',
  '-f', 'concat',
  '-safe', '0',
  '-i', concatPath,
  '-c', 'copy',
  '-movflags', '+faststart',
  outputPath
], { stdio: 'inherit' });

console.log(outputPath);
