import { copyFile, mkdir } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = new Set(process.argv.slice(2));
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const baseUrl = process.env.CAIT_DEMO_BASE_URL || 'https://aiagent-marketplace.net';
const startUrl = `${baseUrl.replace(/\/+$/, '')}/chat`;
const outputDir = process.env.CAIT_OAUTH_RECORDING_OUTPUT
  || 'C:/Users/PC/Documents/programs/output/playwright/cait-google-oauth-live-demo';
const mp4 = path.join(outputDir, 'google-oauth-live-demo.mp4');
const publicOutput = path.join(repoRoot, 'public/google-oauth-live-demo.mp4');

function ensureFfmpeg() {
  const result = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  if (result.error || result.status !== 0) {
    throw new Error('ffmpeg is required for desktop recording, but it was not found on PATH.');
  }
}

function openDefaultBrowser(url) {
  const child = spawn('cmd', ['/c', 'start', '', url], {
    detached: true,
    stdio: 'ignore'
  });
  child.unref();
}

function waitForExit(child) {
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });
}

async function main() {
  ensureFfmpeg();
  await mkdir(outputDir, { recursive: true });

  console.log('Starting desktop recording. Use a normal browser window, not an automated browser.');
  console.log(`Output: ${mp4}`);
  const ffmpeg = spawn('ffmpeg', [
    '-y',
    '-f', 'gdigrab',
    '-framerate', '15',
    '-draw_mouse', '1',
    '-i', 'desktop',
    '-vf', 'scale=1440:-2',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    mp4
  ], {
    stdio: ['pipe', 'inherit', 'inherit']
  });

  const rl = createInterface({ input, output });
  openDefaultBrowser(startUrl);

  console.log('');
  console.log('A normal browser should now be open on CAIt Chat. Start the request there, then open Analytics Console from the chat flow.');
  console.log('Show the Google account chooser/consent screen, load GA4/Search Console data, then press Send to CAIt and return to the chat/order flow.');
  console.log('Avoid showing passwords, recovery prompts, unrelated tabs, or private account pages in the recording.');
  await rl.question('Press Enter here only after the OAuth and app-functionality demo is complete...');
  rl.close();

  ffmpeg.stdin.write('q');
  await waitForExit(ffmpeg);

  if (args.has('--publish')) {
    await copyFile(mp4, publicOutput);
    console.log(`Published copy: ${publicOutput}`);
  }
  console.log(`Live desktop demo video: ${mp4}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
