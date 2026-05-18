import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function assertNotIncludes(source, needles, label) {
  for (const needle of needles) {
    assert.equal(
      source.includes(needle),
      false,
      `${label} must not include ${needle}`
    );
  }
}

const workerSource = read('worker.js');
const orchestrationSource = read('lib/orchestration.js');
const sharedSource = read('lib/shared.js');
const chatSource = read('public/chat.js');
const disciplineDoc = read('docs/AGENT_ORCHESTRATION_DISCIPLINE.md');

// Regression target:
// AGENT_ORCHESTRATION_DISCIPLINE.md is a shared, agent-agnostic discipline file.
// Do not add named single-agent boundary sections or agent module paths here.
// Agent-specific rules belong in that agent's JS module.
assert.ok(
  disciplineDoc.includes('This discipline applies to all languages, locales, UI copy, and operator workflows.'),
  'development discipline must be documented as language-agnostic'
);
assert.ok(
  disciplineDoc.includes('Do not put leader-specific or agent-specific work definitions in `worker`, `orchestration`, or `client` code.'),
  'development discipline must document file responsibility boundaries'
);
assert.ok(
  disciplineDoc.includes('Sample agents must be treated as HTTP provider endpoints like external agents.'),
  'development discipline must document that internal/sample agents are not special-cased'
);
assert.ok(
  disciplineDoc.includes('Agent-specific boundaries must be documented in the relevant agent definition file'),
  'development discipline must keep agent-specific boundary details in agent files'
);
const sharedDisciplineSpecificAgentBoundaryPattern =
  /##\s+(?!Agent Definition Boundaries\b)[^\n]*(?:Leader|Agent)\s+Boundary\b|single-agent boundary|specific definitions belong in `?(?:lib[\\/])builtin-agents[\\/]agents[\\/][^`\s]+\.js`?|(?:lib[\\/])builtin-agents[\\/]agents[\\/][^`\s]+\.js/i;
assert.equal(
  sharedDisciplineSpecificAgentBoundaryPattern.test(disciplineDoc),
  false,
  'shared discipline doc must stay agent-agnostic; single-agent boundaries belong in that agent JS module'
);

const agentSpecificBoundaryPattern = /\b(?:cmo|cmo_leader|cait_cmo|marketing_leader|free_web_growth|agent_team_launch)\b|CMO|マーケ責任者|マーケティング責任者/;
for (const [fileName, source] of [
  ['worker.js', workerSource],
  ['lib/orchestration.js', orchestrationSource],
  ['public/chat.js', chatSource],
  ['lib/shared.js', sharedSource.replace(/['"]agent_free_web_growth_leader_01['"]/g, '')]
]) {
  assert.equal(
    agentSpecificBoundaryPattern.test(source),
    false,
    `${fileName} must not contain leader/agent-specific business routing; put it in the relevant agent file`
  );
}

assertNotIncludes(workerSource, [
  "from './lib/local-agent-endpoints.js'",
  "from './lib/builtin-agents.js'",
  "sample-agent-catalog.js",
  "sample-agent-provider.js",
  'function runBuiltInAgent',
  'runBuiltInAgent(',
  'builtInAgentHealthPayload',
  'function invokeSameWorkerAgentEndpoint',
  'invokeLocalAgentJobEndpoint',
  'acceptBuiltInEndpointDispatchForProviderQueue',
  'enqueueBuiltInAgentProviderRun',
  'compactWorkflowInputForBuiltInDispatch',
  "kind: 'built_in_agent_run'",
  'app-context-data-analysis-shortcut',
  'app-context-research-shortcut',
  'function workflowSourceCollectionSourcesForDispatch',
  'sourceCollectionAttachedBy',
  'raw_context: workflowSourceRawContextForDispatch(context)',
  'const searchConsoleDomain = text.match'
], 'worker.js');

assertNotIncludes(orchestrationSource, [
  "from './lib/builtin-agents.js'",
  'runBuiltInAgent',
  'builtInAgentHealthPayload',
  'compactWorkflowInputForBuiltInDispatch',
  "kind: 'built_in_agent_run'"
], 'lib/orchestration.js');

assert.ok(
  workerSource.includes('resolveDispatchEndpointUrl(endpoint, env)'),
  'worker dispatch must use provider endpoint URLs instead of local built-in execution'
);
assert.ok(
  workerSource.includes('leaderTaskLayer(primary, task)'),
  'worker must ask orchestration/leader contracts for layers instead of hardcoding role logic'
);
assert.ok(
  orchestrationSource.includes('DOWNSTREAM_HANDOFF_SUMMARY_CONTRACT_VERSION'),
  'orchestration should own generic handoff contracts, not agent-specific business logic'
);

const forbiddenCentralFiles = [
  'lib/builtin-agents.js',
  'lib/sample-agent-provider.js',
  'lib/sample-agent-catalog.js',
  'lib/agent-provider-runtime.js'
];
for (const filePath of forbiddenCentralFiles) {
  assert.equal(
    existsSync(join(root, filePath)),
    false,
    `${filePath} must not exist; internal/sample agent behavior belongs in each agent file`
  );
}

const agentsDir = join(root, 'lib', 'builtin-agents', 'agents');
const agentFiles = readdirSync(agentsDir)
  .filter((name) => name.endsWith('.js') && name !== 'index.js')
  .sort();

assert.ok(agentFiles.length > 0, 'agent files must exist');
for (const fileName of agentFiles) {
  const source = readFileSync(join(agentsDir, fileName), 'utf8');
  assert.ok(source.includes('const AGENT_PROVIDER = Object.freeze({'), `${fileName} must own its provider behavior`);
  assert.ok(source.includes('AGENT_DEFINITION.manifest = Object.freeze({'), `${fileName} must own its manifest`);
  assert.ok(source.includes('health({'), `${fileName} must expose health behavior`);
  assert.ok(source.includes('async runJob({'), `${fileName} must expose jobs behavior`);
  assert.ok(source.includes('provider: AGENT_PROVIDER'), `${fileName} must export the provider`);
  assertNotIncludes(source, [
    'agent-provider-runtime',
    'sample-agent-provider',
    'sample-agent-catalog',
    "from '../builtin-agents.js'",
    "from './builtin-agents.js'"
  ], fileName);
}

console.log('discipline qa passed');
