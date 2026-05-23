import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const agentsDir = join(root, 'lib', 'builtin-agents', 'agents');
const defaultCasesPath = join(__dirname, 'fixtures', 'agent-output-cases.json');

function parseArgs(argv = process.argv.slice(2)) {
  const args = { command: argv[0] || 'snapshot' };
  for (let index = 1; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      index += 1;
    }
  }
  return args;
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function assertUnique(values = [], label = 'values') {
  const seen = new Set();
  for (const value of values) {
    if (!value) throw new Error(`${label} must not contain empty values`);
    if (seen.has(value)) throw new Error(`${label} must not contain duplicates: ${value}`);
    seen.add(value);
  }
}

function assertNoAgentContractKeys(value, label = 'fixture') {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if ([
      'agentPurpose',
      'agentActionBoundaries',
      'deliveryContract',
      'action_boundaries',
      'delivery_contract',
      'requiredDeliverySections',
      'forbiddenClaims',
      'authorityBoundary'
    ].includes(key)) {
      throw new Error(`${label} must not define agent contracts; keep purpose/action/delivery policy in the agent JS file`);
    }
    assertNoAgentContractKeys(child, `${label}.${key}`);
  }
}

function validateFixtures(fixtures = {}) {
  const cases = Array.isArray(fixtures.cases) ? fixtures.cases : [];
  assertUnique(cases.map((item) => item.id), 'agent output fixture ids');
  const caseIds = new Set(cases.map((item) => item.id));
  for (const item of cases) {
    if (!item.file || !item.kind || !item.prompt) throw new Error(`Agent output fixture ${item.id || '<missing id>'} must include file, kind, and prompt`);
    assertNoAgentContractKeys(item, `agent output fixture ${item.id}`);
  }
  for (const [groupName, ids] of Object.entries(fixtures.groups || {})) {
    assertUnique(ids || [], `agent output fixture group ${groupName}`);
    for (const id of ids || []) {
      if (!caseIds.has(id)) throw new Error(`Agent output fixture group ${groupName} references missing case ${id}`);
    }
  }
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function timestampSlug() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function hashText(value = '') {
  return createHash('sha256').update(String(value || '')).digest('hex').slice(0, 16);
}

function normalizeText(value = '') {
  return String(value || '').replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').trim();
}

function compactBody(body = {}) {
  return JSON.parse(JSON.stringify(body || {}));
}

function caseBody(testCase = {}) {
  return {
    prompt: testCase.prompt || '',
    ...(testCase.body && typeof testCase.body === 'object' ? testCase.body : {})
  };
}

function selectedCases(fixtures, args) {
  const ids = new Set();
  if (args.case) {
    for (const id of String(args.case).split(',').map((item) => item.trim()).filter(Boolean)) ids.add(id);
  }
  if (args.group) {
    if (args.group === 'all') {
      for (const item of fixtures.cases || []) ids.add(item.id);
    } else {
      const group = fixtures.groups?.[args.group] || [];
      for (const id of group) ids.add(id);
    }
  }
  if (args.agent) {
    const agents = new Set(String(args.agent).split(',').map((item) => item.trim()).filter(Boolean));
    return fixtures.cases.filter((item) => agents.has(item.file) || agents.has(item.kind) || agents.has(item.id));
  }
  if (!ids.size) return fixtures.cases;
  return fixtures.cases.filter((item) => ids.has(item.id));
}

function installMockOpenAiFetch() {
  globalThis.fetch = async (_url, options = {}) => {
    const body = JSON.parse(String(options.body || '{}'));
    const inputText = (Array.isArray(body.input) ? body.input : [])
      .flatMap((item) => Array.isArray(item?.content) ? item.content : [])
      .map((part) => String(part?.text || part?.value || part?.content || ''))
      .filter(Boolean)
      .at(-1) || '{}';
    let packet = {};
    try {
      packet = JSON.parse(inputText);
    } catch {
      packet = { user_request: inputText };
    }
    const agent = packet.agent && typeof packet.agent === 'object' ? packet.agent : {};
    const actionBoundaries = Array.isArray(agent.action_boundaries)
      ? agent.action_boundaries
      : (Array.isArray(packet.action_boundaries) ? packet.action_boundaries : []);
    const deliveryContract = agent.delivery_contract && typeof agent.delivery_contract === 'object'
      ? agent.delivery_contract
      : (packet.delivery_contract && typeof packet.delivery_contract === 'object' ? packet.delivery_contract : {});
    const purpose = String(agent.purpose || packet.purpose || '').trim();
    const contractSections = Array.isArray(deliveryContract.requiredDeliverySections)
      ? deliveryContract.requiredDeliverySections
      : (Array.isArray(deliveryContract.required_sections) ? deliveryContract.required_sections : []);
    const forbiddenClaims = Array.isArray(deliveryContract.forbiddenClaims)
      ? deliveryContract.forbiddenClaims
      : (Array.isArray(deliveryContract.forbidden_claims) ? deliveryContract.forbidden_claims : []);
    const actionLines = actionBoundaries.length
      ? actionBoundaries.map((action, index) => {
          const label = action?.id || action?.label || `action_${index + 1}`;
          const mode = action?.mode || action?.kind || 'agent_owned';
          const produces = Array.isArray(action?.produces) ? action.produces.join(', ') : String(action?.produces || '');
          const boundary = action?.authorityBoundary || action?.authority || action?.boundary || '';
          return `- ${label} (${mode})${produces ? ` -> ${produces}` : ''}${boundary ? `; boundary: ${boundary}` : ''}`;
        })
      : ['- Not provided by this agent definition.'];
    const markdown = [
      `# ${agent.name || packet.kind || 'Agent'} test delivery`,
      '',
      '## Purpose',
      purpose || 'Not provided by this agent definition.',
      '',
      '## Agent-owned actions',
      ...actionLines,
      '',
      '## Delivery contract',
      contractSections.length ? contractSections.map((item) => `- ${item}`).join('\n') : '- Not provided by this agent definition.',
      '',
      '## Forbidden claims',
      forbiddenClaims.length ? forbiddenClaims.map((item) => `- ${item}`).join('\n') : '- Not provided by this agent definition.',
      '',
      '## User request',
      String(packet.user_request || packet.full_request_excerpt || '').slice(0, 1200) || 'No request provided.',
      '',
      '## Source status',
      Array.isArray(packet.evidence_sources) && packet.evidence_sources.length
        ? `Evidence sources supplied: ${packet.evidence_sources.length}`
        : 'No external evidence sources supplied in this fixture.',
      '',
      '## Next action',
      'Review this packet against the agent-owned purpose, actions, and delivery contract.'
    ].join('\n');
    const payload = {
      summary: `${agent.name || 'Agent'} test delivery prepared.`,
      report_summary: 'Mock OpenAI output generated from the exact provider request packet.',
      bullets: [
        purpose ? 'Purpose supplied' : 'Purpose missing',
        actionBoundaries.length ? `${actionBoundaries.length} action boundary item(s) supplied` : 'Action boundaries missing',
        contractSections.length ? `${contractSections.length} delivery section(s) supplied` : 'Delivery contract sections missing'
      ],
      next_action: 'Compare this output with a later run after agent changes.',
      file_markdown: markdown,
      content_type: 'agent_output_regression_mock',
      artifacts: [{
        type: 'test_request_packet_summary',
        action_boundary_count: actionBoundaries.length,
        delivery_contract_section_count: contractSections.length,
        has_purpose: Boolean(purpose)
      }]
    };
    return {
      ok: true,
      status: 200,
      json: async () => ({ output_text: JSON.stringify(payload) })
    };
  };
}

async function loadAgentDefinition(fileName) {
  const filePath = join(agentsDir, fileName);
  if (!existsSync(filePath)) throw new Error(`Agent file not found: ${fileName}`);
  const mod = await import(`${pathToFileURL(filePath).href}?t=${Date.now()}`);
  return mod.default || {};
}

function summarizeResult(testCase, definition, result) {
  const files = Array.isArray(result?.files) ? result.files : [];
  const primaryFile = files[0] || {};
  const markdown = normalizeText(primaryFile.content || '');
  return {
    id: testCase.id,
    file: testCase.file,
    kind: testCase.kind || definition.manifest?.kind || '',
    agentName: definition.seedProfile?.name || definition.healthService || '',
    status: result?.status || '',
    accepted: result?.accepted ?? null,
    summary: result?.summary || '',
    reportSummary: result?.report?.summary || '',
    nextAction: result?.report?.nextAction || '',
    fileCount: files.length,
    primaryFileName: primaryFile.name || '',
    primaryContentType: primaryFile.content_type || primaryFile.type || '',
    markdownHash: hashText(markdown),
    markdownLength: markdown.length,
    markdown,
    report: result?.report || {},
    runtime: result?.runtime || {},
    body: compactBody(caseBody(testCase))
  };
}

async function runCase(testCase, args) {
  const definition = await loadAgentDefinition(testCase.file);
  const source = args.live
    ? {
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
        BUILTIN_OPENAI_API_KEY: process.env.BUILTIN_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '',
        OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || '',
        BUILTIN_OPENAI_BASE_URL: process.env.BUILTIN_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || '',
        OPENAI_MODEL: process.env.OPENAI_MODEL || '',
        BUILTIN_OPENAI_MODEL: process.env.BUILTIN_OPENAI_MODEL || process.env.OPENAI_MODEL || ''
      }
    : {
        OPENAI_API_KEY: 'mock-agent-output-regression-key',
        BUILTIN_OPENAI_API_KEY: 'mock-agent-output-regression-key',
        OPENAI_MODEL: 'mock-agent-output-regression-model',
        BUILTIN_OPENAI_MODEL: 'mock-agent-output-regression-model'
      };
  const result = await definition.provider.runJob({
    kind: testCase.kind || definition.manifest?.kind || '',
    definition,
    body: caseBody(testCase),
    source
  });
  return summarizeResult(testCase, definition, result);
}

function markdownDiffSummary(before = {}, after = {}) {
  const beforeLines = normalizeText(before.markdown || '').split('\n').filter(Boolean);
  const afterLines = normalizeText(after.markdown || '').split('\n').filter(Boolean);
  const beforeSet = new Set(beforeLines);
  const afterSet = new Set(afterLines);
  const added = afterLines.filter((line) => !beforeSet.has(line)).slice(0, 12);
  const removed = beforeLines.filter((line) => !afterSet.has(line)).slice(0, 12);
  return { added, removed };
}

function compareRuns(baseline, current) {
  const beforeById = new Map((baseline.results || []).map((item) => [item.id, item]));
  return (current.results || []).map((after) => {
    const before = beforeById.get(after.id) || {};
    const changed = before.markdownHash !== after.markdownHash
      || before.status !== after.status
      || before.summary !== after.summary
      || before.primaryContentType !== after.primaryContentType;
    return {
      id: after.id,
      file: after.file,
      kind: after.kind,
      changed,
      before: {
        status: before.status || '',
        hash: before.markdownHash || '',
        length: before.markdownLength || 0,
        summary: before.summary || ''
      },
      after: {
        status: after.status || '',
        hash: after.markdownHash || '',
        length: after.markdownLength || 0,
        summary: after.summary || ''
      },
      diff: markdownDiffSummary(before, after)
    };
  });
}

function comparisonMarkdown(comparison) {
  const rows = comparison.map((item) => [
    `## ${item.id}`,
    '',
    `- File: \`${item.file}\``,
    `- Changed: ${item.changed ? 'yes' : 'no'}`,
    `- Before: ${item.before.status || '-'} / ${item.before.hash || '-'} / ${item.before.length} chars`,
    `- After: ${item.after.status || '-'} / ${item.after.hash || '-'} / ${item.after.length} chars`,
    '',
    'Added lines:',
    ...(item.diff.added.length ? item.diff.added.map((line) => `+ ${line}`) : ['+ none']),
    '',
    'Removed lines:',
    ...(item.diff.removed.length ? item.diff.removed.map((line) => `- ${line}`) : ['- none'])
  ].join('\n'));
  return ['# Agent Output Regression Comparison', '', ...rows].join('\n\n');
}

async function runSnapshot(args) {
  const fixtures = readJson(resolve(args.cases || defaultCasesPath));
  validateFixtures(fixtures);
  const cases = selectedCases(fixtures, args);
  if (!cases.length) throw new Error('No agent output cases selected.');
  if (!args.live) installMockOpenAiFetch();
  const outDir = resolve(args.out || join(root, 'tmp', `agent-output-${args.command}-${timestampSlug()}`));
  mkdirSync(outDir, { recursive: true });
  const results = [];
  for (const testCase of cases) {
    results.push(await runCase(testCase, args));
  }
  const snapshot = {
    schema: 'agent-output-regression/v1',
    generatedAt: new Date().toISOString(),
    mode: args.live ? 'live-openai' : 'mock-openai',
    casesPath: resolve(args.cases || defaultCasesPath),
    results
  };
  writeJson(join(outDir, 'snapshot.json'), snapshot);
  for (const result of results) {
    writeFileSync(join(outDir, `${result.id}.md`), `${result.markdown}\n`);
  }
  return { outDir, snapshot };
}

async function main() {
  const args = parseArgs();
  if (!['snapshot', 'compare'].includes(args.command)) {
    throw new Error('Usage: node scripts/agent-output-regression.mjs <snapshot|compare> [--group marketing] [--baseline tmp/before/snapshot.json] [--out tmp/after] [--live]');
  }
  if (args.command === 'snapshot') {
    const { outDir, snapshot } = await runSnapshot(args);
    console.log(`agent output snapshot written: ${outDir}`);
    console.log(`cases: ${snapshot.results.length}`);
    return;
  }
  if (!args.baseline) throw new Error('--baseline is required for compare');
  const baselinePath = resolve(args.baseline);
  const baseline = readJson(baselinePath);
  const { outDir, snapshot } = await runSnapshot({ ...args, command: 'compare' });
  const comparison = compareRuns(baseline, snapshot);
  writeJson(join(outDir, 'comparison.json'), comparison);
  writeFileSync(join(outDir, 'comparison.md'), `${comparisonMarkdown(comparison)}\n`);
  const changed = comparison.filter((item) => item.changed).length;
  console.log(`agent output comparison written: ${outDir}`);
  console.log(`cases: ${comparison.length}`);
  console.log(`changed: ${changed}`);
  if (args['fail-on-change'] && changed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});
