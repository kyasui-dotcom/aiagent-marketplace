import { chromium } from 'playwright';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { copyFile, mkdir, readdir, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = new Set(process.argv.slice(2));
if (!args.has('--allow-automation')) {
  console.error('Google may block OAuth sign-in from automated browsers as unsafe.');
  console.error('Use the normal-browser desktop recorder instead:');
  console.error('  node scripts/record-google-oauth-live-desktop.mjs --publish');
  process.exit(1);
}
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const baseUrl = process.env.CAIT_DEMO_BASE_URL || 'https://aiagent-marketplace.net';
const startUrl = `${baseUrl.replace(/\/+$/, '')}/chat`;
const profileDir = process.env.CAIT_OAUTH_RECORDING_PROFILE
  || 'C:/Users/PC/Documents/programs/output/playwright/cait-google-oauth-live-profile';
const outputDir = process.env.CAIT_OAUTH_RECORDING_OUTPUT
  || 'C:/Users/PC/Documents/programs/output/playwright/cait-google-oauth-live-demo';
const publicOutput = path.join(repoRoot, 'public/google-oauth-live-demo.mp4');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function latestFile(dir, extension) {
  const entries = await readdir(dir).catch(() => []);
  const files = await Promise.all(entries.map(async (name) => {
    const full = path.join(dir, name);
    const info = await stat(full).catch(() => null);
    return { name, full, mtimeMs: info?.mtimeMs || 0, isFile: Boolean(info?.isFile()) };
  }));
  return files
    .filter((entry) => entry.isFile && entry.name.toLowerCase().endsWith(extension))
    .sort((a, b) => b.mtimeMs - a.mtimeMs)[0]?.full || '';
}

async function clickIfVisible(page, selector, options = {}) {
  const locator = page.locator(selector).first();
  if (!(await locator.count())) return false;
  if (!(await locator.isVisible().catch(() => false))) return false;
  await locator.click(options).catch(() => {});
  return true;
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  const context = await chromium.launchPersistentContext(profileDir, {
    channel: 'chrome',
    headless: false,
    viewport: { width: 1440, height: 900 },
    recordVideo: {
      dir: outputDir,
      size: { width: 1440, height: 900 }
    }
  });
  const page = context.pages()[0] || await context.newPage();
  const rl = createInterface({ input, output });

  console.log(`Recording started: ${outputDir}`);
  console.log(`Opening real app screen: ${startUrl}`);
  await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  await sleep(1800);

  await page.mouse.wheel(0, 500);
  await sleep(800);
  await clickIfVisible(page, '#connectGoogleAllBtn');
  await sleep(2500);

  console.log('');
  console.log('Manual step required: complete the real Google account chooser and OAuth consent in the Chrome window.');
  console.log('Use a test Google account that has access to the GA4 property and/or Search Console site.');
  console.log('After Google redirects back to CAIt Analytics Console, press Enter here.');
  await rl.question('Press Enter after OAuth consent returns to Analytics Console...');

  const pages = context.pages();
  const activePage = pages.find((candidate) => /analytics-console\.html/i.test(candidate.url())) || pages[pages.length - 1] || page;
  await activePage.bringToFront().catch(() => {});
  await activePage.waitForLoadState('domcontentloaded').catch(() => {});
  await activePage.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await sleep(1200);

  await clickIfVisible(activePage, '#refreshGoogleSourcesBtn');
  await sleep(3500);
  await clickIfVisible(activePage, '#loadGoogleReportBtn');
  await sleep(4500);
  await activePage.mouse.wheel(0, 640);
  await sleep(2200);
  await activePage.mouse.wheel(0, 820);
  await sleep(1800);
  await clickIfVisible(activePage, '#sendContextBtn');
  await sleep(3000);

  console.log('');
  console.log('Review the Chrome window. If the video has shown the OAuth consent screen and the app functionality, press Enter to stop recording.');
  await rl.question('Press Enter to stop recording...');
  rl.close();

  await context.close();

  const webm = await latestFile(outputDir, '.webm');
  if (!webm) throw new Error('Playwright did not produce a .webm recording.');
  const mp4 = path.join(outputDir, 'google-oauth-live-demo.mp4');
  execFileSync('ffmpeg', [
    '-y',
    '-i', webm,
    '-vf', 'format=yuv420p',
    '-movflags', '+faststart',
    mp4
  ], { stdio: 'inherit' });

  if (args.has('--publish')) {
    await copyFile(mp4, publicOutput);
    console.log(`Published copy: ${publicOutput}`);
  }
  console.log(`Live demo video: ${mp4}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
