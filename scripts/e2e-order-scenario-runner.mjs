import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const localEnvPath = fileURLToPath(new URL('../.env.e2e.local', import.meta.url));
const playwrightCli = fileURLToPath(new URL('../node_modules/playwright/cli.js', import.meta.url));

function parseLocalEnv(raw = '') {
  const values = {};
  for (const line of String(raw || '').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[match[1]] = value;
  }
  return values;
}

const localEnv = existsSync(localEnvPath) ? parseLocalEnv(readFileSync(localEnvPath, 'utf8')) : {};
const passthroughArgs = [];
const cliEnv = {};
let localMode = false;

for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (arg === '--local') {
    localMode = true;
    continue;
  }
  if (arg === '--base-url') {
    cliEnv.E2E_BASE_URL = process.argv[++index] || '';
    continue;
  }
  if (arg === '--order-id') {
    cliEnv.E2E_ORDER_ID = process.argv[++index] || '';
    continue;
  }
  if (arg === '--prompt-file') {
    cliEnv.E2E_ORDER_PROMPT_FILE = process.argv[++index] || '';
    continue;
  }
  if (arg === '--prompt') {
    cliEnv.E2E_ORDER_PROMPT = process.argv[++index] || '';
    continue;
  }
  if (arg === '--email') {
    cliEnv.E2E_AUTH_EMAIL = process.argv[++index] || '';
    continue;
  }
  if (arg === '--accept-waiting') {
    cliEnv.E2E_ORDER_ACCEPT_WAITING = '1';
    continue;
  }
  passthroughArgs.push(arg);
}

const env = {
  ...process.env,
  ...localEnv,
  ...cliEnv,
  E2E_ORDER_SCENARIO: '1',
  E2E_WRITE: process.env.E2E_WRITE || localEnv.E2E_WRITE || cliEnv.E2E_WRITE || '1',
  E2E_ORDER_ACCEPT_WAITING: process.env.E2E_ORDER_ACCEPT_WAITING || localEnv.E2E_ORDER_ACCEPT_WAITING || cliEnv.E2E_ORDER_ACCEPT_WAITING || '1',
  E2E_AUTH_EMAIL: process.env.E2E_AUTH_EMAIL || localEnv.E2E_AUTH_EMAIL || 'e2e@aiagent-marketplace.net'
};

if (!localMode) {
  env.E2E_BASE_URL = env.E2E_BASE_URL || 'https://aiagent-marketplace.net';
} else {
  delete env.E2E_BASE_URL;
}

const liveMode = Boolean(env.E2E_BASE_URL) && !/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::|\/|$)/i.test(env.E2E_BASE_URL);
if (liveMode && !env.E2E_AUTH_SECRET && !env.E2E_EMAIL_AUTH_SECRET) {
  console.error([
    'Order scenario E2E needs authenticated production access.',
    'Set E2E_AUTH_SECRET or E2E_EMAIL_AUTH_SECRET in .env.e2e.local, then rerun:',
    '  npm run qa:e2e:order',
    '',
    'To observe an existing manual order instead of creating a new one:',
    '  npm run qa:e2e:order -- --order-id <order-id>'
  ].join('\n'));
  process.exit(1);
}

console.log(`Order scenario E2E target: ${env.E2E_BASE_URL || 'managed local server'}`);
if (env.E2E_ORDER_ID) console.log(`Observing existing order: ${env.E2E_ORDER_ID}`);
else console.log('Creating a new order from E2E_ORDER_PROMPT/E2E_ORDER_PROMPT_FILE or the default CMO scenario.');
console.log(`Authenticated E2E email: ${env.E2E_AUTH_EMAIL}`);

const child = spawn(process.execPath, [
  playwrightCli,
  'test',
  '-c',
  'playwright.config.js',
  'e2e/order-scenario.spec.js',
  '--reporter=list',
  ...passthroughArgs
], {
  cwd: root,
  stdio: 'inherit',
  env
});

child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});
child.on('exit', (code) => {
  process.exit(code ?? 1);
});
