import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const localEnvPath = fileURLToPath(new URL('../.env.e2e.local', import.meta.url));
const baseUrl = process.env.E2E_BASE_URL || 'https://aiagent-marketplace.net';
const passthroughArgs = [];
let requireAuth = false;
let split = true;

for (const arg of process.argv.slice(2)) {
  if (arg === '--require-auth') {
    requireAuth = true;
    continue;
  }
  if (arg === '--no-split') {
    split = false;
    continue;
  }
  passthroughArgs.push(arg);
}

function parseLocalEnv(raw = '') {
  const values = {};
  for (const line of String(raw || '').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

const localEnv = existsSync(localEnvPath) ? parseLocalEnv(readFileSync(localEnvPath, 'utf8')) : {};
const env = {
  ...process.env,
  ...localEnv,
  E2E_BASE_URL: baseUrl,
  E2E_WRITE: process.env.E2E_WRITE || localEnv.E2E_WRITE || '0',
  E2E_AUTH_EMAIL: process.env.E2E_AUTH_EMAIL || localEnv.E2E_AUTH_EMAIL || 'e2e@aiagent-marketplace.net'
};

if (requireAuth && !env.E2E_AUTH_SECRET && !env.E2E_EMAIL_AUTH_SECRET) {
  console.error([
    'Production authenticated E2E is not configured.',
    'Set E2E_AUTH_SECRET in .env.e2e.local and as a Cloudflare Worker secret, then rerun:',
    '  npm run qa:e2e:prod -- --require-auth'
  ].join('\n'));
  process.exit(1);
}

const playwrightCli = fileURLToPath(new URL('../node_modules/playwright/cli.js', import.meta.url));
const defaultGroups = [
  ['e2e/api-contract.spec.js'],
  ['e2e/app-local-data.spec.js', 'e2e/app-uiux.spec.js', 'e2e/chat-app-context-continuity.spec.js'],
  ['e2e/chat-workspace.spec.js'],
  ['e2e/chat-leader-handoff.spec.js', 'e2e/leader-matrix.spec.js'],
  ['e2e/mcp.spec.js', 'e2e/production-chat.spec.js']
];

const shouldRunOrderScenario = env.E2E_ORDER_SCENARIO === '1' || Boolean(env.E2E_ORDER_ID);
if (shouldRunOrderScenario) {
  defaultGroups[defaultGroups.length - 1].push('e2e/order-scenario.spec.js');
}

function hasExplicitSpecArgs(args = []) {
  return args.some((arg) => /\.spec\.js$/i.test(String(arg)) || /^e2e[\\/]/i.test(String(arg)));
}

function runPlaywright(args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [playwrightCli, 'test', '-c', 'playwright.config.js', ...args], {
      cwd: root,
      stdio: 'inherit',
      env
    });

    child.on('error', reject);
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

const shouldSplit = split && !hasExplicitSpecArgs(passthroughArgs);
const passthroughWithoutReporter = passthroughArgs.filter((arg) => !String(arg).startsWith('--reporter'));
const reporterArgs = passthroughArgs.filter((arg) => String(arg).startsWith('--reporter'));
const commonArgs = reporterArgs.length ? passthroughWithoutReporter : [...passthroughWithoutReporter, '--reporter=list'];

if (shouldSplit) {
  console.log(`Production E2E target: ${baseUrl}`);
  console.log(`Running ${defaultGroups.length} bounded Playwright groups to avoid one long production timeout.`);
  let index = 0;
  let failedCode = 0;
  for (const group of defaultGroups) {
    index += 1;
    console.log(`\n[prod-e2e ${index}/${defaultGroups.length}] ${group.join(', ')}`);
    const code = await runPlaywright([...group, ...commonArgs]);
    if (code !== 0) {
      failedCode = code;
      break;
    }
  }
  process.exit(failedCode);
}

process.exit(await runPlaywright(passthroughArgs));
