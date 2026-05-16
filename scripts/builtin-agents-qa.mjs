import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  SAMPLE_AGENT_KINDS,
  sampleAgentDefinitionForKind
} from '../lib/builtin-agents/agents/index.js';
import { leaderReadableAgentSelectionIndex } from '../lib/agent-selection-index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const agentsDir = join(root, 'lib', 'builtin-agents', 'agents');

assert.equal(existsSync(join(root, 'lib', 'builtin-agents.js')), false, 'central builtin-agents.js must not exist');
assert.equal(existsSync(join(root, 'lib', 'sample-agent-provider.js')), false, 'sample agents must not use a central provider runner');
assert.equal(existsSync(join(root, 'lib', 'sample-agent-catalog.js')), false, 'sample agents must not use a central catalog file');
assert.equal(existsSync(join(root, 'lib', 'agent-provider-runtime.js')), false, 'agent provider behavior must not be hidden in a shared runtime');

const agentFiles = readdirSync(agentsDir)
  .filter((name) => name.endsWith('.js') && name !== 'index.js')
  .sort();

assert.ok(agentFiles.length >= SAMPLE_AGENT_KINDS.length, 'agent definition files should cover sample agent kinds');

for (const fileName of agentFiles) {
  const source = readFileSync(join(agentsDir, fileName), 'utf8');
  assert.ok(source.includes('const AGENT_PROVIDER = Object.freeze({'), `${fileName} must define its own provider`);
  assert.ok(source.includes('AGENT_DEFINITION.manifest = Object.freeze({'), `${fileName} must define its own manifest`);
  assert.ok(source.includes('health({'), `${fileName} provider must own health response behavior`);
  assert.ok(source.includes('async runJob({'), `${fileName} provider must own job execution behavior`);
  assert.ok(source.includes('provider: AGENT_PROVIDER'), `${fileName} default export must expose its provider`);
  assert.ok(!source.includes('agent-provider-runtime'), `${fileName} must not import a shared provider runtime`);
  assert.ok(!source.includes('sample-agent-provider'), `${fileName} must not call a central sample provider`);
  assert.ok(!source.includes('sample-agent-catalog'), `${fileName} must not call a central sample catalog`);
}

const workerSource = readFileSync(join(root, 'worker.js'), 'utf8');
assert.ok(workerSource.includes("from './lib/builtin-agents/agents/index.js'"), 'worker must read agent-file manifests through the agent index');
assert.ok(workerSource.includes('sampleAgentDefinitionForKind'), 'worker must resolve routes from agent-file manifests');
assert.ok(!workerSource.includes("sample-agent-catalog.js"), 'worker must not import a central sample catalog');
assert.ok(!workerSource.includes('runBuiltInAgent'), 'worker must not call a built-in special runner');
assert.ok(!workerSource.includes('builtInAgentHealthPayload'), 'worker must not call built-in special health logic');

assert.ok(SAMPLE_AGENT_KINDS.includes('research'), 'research sample agent should remain routable');
assert.equal(SAMPLE_AGENT_KINDS.includes('free_web_growth_leader'), false, 'unroutable agent manifests must stay unroutable');

const research = sampleAgentDefinitionForKind('research');
assert.equal(research.manifest.kind, 'research');
assert.equal(research.manifest.jobEndpoint, '/sample-agents/research/jobs');
assert.equal(research.manifest.metadata.provider, 'agent_file');

const health = research.provider.health({ kind: 'research', definition: research, source: {} });
assert.equal(health.provider, 'agent_file');
assert.equal(health.kind, 'research');

const leakedOutputContractPattern = /##\s*Delivery packet|Write sections for|Write a two-part Markdown delivery|Agent-owned behavior|provider\.runJob|agent-file provider implementation|WORKFLOW HANDOFF CONTEXT|STRUCTURED HANDOFF DIGEST/i;

function assertUserFacingDelivery(result, label, requiredPatterns = []) {
  const content = result.files?.[0]?.content || '';
  assert.equal(result.status, 'completed', `${label} should complete`);
  assert.ok(content.includes('Answer first') || content.includes('先に結論'), `${label} should be answer-first/user-facing`);
  assert.ok(!leakedOutputContractPattern.test(content), `${label} must not expose output contracts or workflow prompt internals`);
  assert.ok(!/provider delivery|agent-file provider implementation/i.test(result.summary || ''), `${label} summary must not expose provider implementation details`);
  for (const pattern of requiredPatterns) {
    assert.match(content, pattern, `${label} should include ${pattern}`);
  }
}

const result = await research.provider.runJob({
  kind: 'research',
  definition: research,
  body: {
    prompt: 'QA sample. Answer in English.',
    output_language: 'en'
  },
  source: {},
  manifest: research.manifest
});
assert.equal(result.status, 'completed');
assert.equal(result.runtime?.provider, 'agent_file');
assertUserFacingDelivery(result, 'research generic delivery');

const deliveryBody = {
  prompt: [
    'Task: cmo_leader',
    'Goal: increase signups for https://aiagent-marketplace.net',
    'Product/service: https://aiagent-marketplace.net',
    'Analytics data: GA4 + Search Console connector context attached.',
    'GA4 property: properties/531290961',
    'Search Console site: sc-domain:aiagent-marketplace.net',
    'Date range: 2026-04-15 to 2026-05-12',
    'Sessions: 554',
    'Conversions: 0',
    'Conversion rate: 0%',
    'Target audience: Developers/technical users',
    'Constraints: No paid ads / organic only',
    'Priority channel: Organic search / SEO'
  ].join('\n'),
  output_language: 'en'
};

for (const [kind, requiredPatterns] of [
  ['data_analysis', [/Data quality check/i, /Sessions:\s*554/i, /Conversion rate:\s*0%/i]],
  ['media_planner', [/Decision first/i, /Top 3 actions/i, /Publisher SaaS/i]],
  ['seo_gap', [/SEO page recommendation/i, /Meta title/i, /Meta description/i]],
  ['landing', [/Conversion goal/i, /Above-the-fold fix/i, /Measurement plan/i]],
  ['cmo_leader', [/Decision first/i, /Top 3 actions/i, /Preparation handoff/i]]
]) {
  const definition = sampleAgentDefinitionForKind(kind);
  const delivery = await definition.provider.runJob({
    kind,
    definition,
    body: deliveryBody,
    source: {},
    manifest: definition.manifest
  });
  assertUserFacingDelivery(delivery, `${kind} delivery`, requiredPatterns);
}

const sourceBackedResearch = await research.provider.runJob({
  kind: 'research',
  definition: research,
  body: {
    prompt: 'Research https://aiagent-marketplace.net for customer acquisition. Answer in English.',
    output_language: 'en',
    input: {
      _broker: {
        workflow: {
          forceWebSearch: true,
          sequencePhase: 'research'
        }
      }
    }
  },
  source: {},
  manifest: research.manifest
});
assert.equal(sourceBackedResearch.status, 'completed');
assert.ok(Array.isArray(sourceBackedResearch.report?.web_sources), 'search-required research must attach report.web_sources when sources are supplied');
assert.ok(sourceBackedResearch.report.web_sources.some((item) => item.url === 'https://aiagent-marketplace.net'), 'research should carry supplied source URLs into web_sources');
assert.ok(sourceBackedResearch.report.web_sources.some((item) => /source_collection/i.test(item.action || '')), 'research web_sources must include source collection proof');
assert.ok(sourceBackedResearch.files?.[0]?.content?.includes('Evidence status'), 'source-backed research should expose evidence status in the artifact');

const sourceContractResearch = await research.provider.runJob({
  kind: 'research',
  definition: research,
  body: {
    prompt: 'Research the attached acquisition source context. Answer in English.',
    output_language: 'en',
    source_collection_contract: {
      required: true,
      required_output_field: 'report.web_sources'
    },
    input: {
      _broker: {
        workflow: {
          sequencePhase: 'research'
        },
        appContexts: [
          {
            source_app: 'analytics-console',
            title: 'GA4 + Search Console',
            summary: 'Attached Search Console context for example.com.',
            raw_context: {
              googleSearchConsoleSite: 'sc-domain:example.com'
            }
          }
        ]
      }
    }
  },
  source: {},
  manifest: research.manifest
});
assert.equal(sourceContractResearch.status, 'completed', 'research should treat source_collection_contract as search-required and use attached connector context');
assert.ok(sourceContractResearch.report.web_sources.some((item) => item.url === 'https://example.com/'), 'research should normalize Search Console sc-domain context into web_sources');

const missingSourceResearch = await research.provider.runJob({
  kind: 'research',
  definition: research,
  body: {
    prompt: 'Research the market. Answer in English.',
    output_language: 'en',
    input: {
      _broker: {
        workflow: {
          forceWebSearch: true,
          sequencePhase: 'research'
        }
      }
    }
  },
  source: {},
  manifest: research.manifest
});
assert.equal(missingSourceResearch.status, 'failed', 'search-required research must fail instead of returning a generic completed delivery without sources');
assert.match(missingSourceResearch.failure_reason, /missing_required_search_sources/);

const selectionIndex = leaderReadableAgentSelectionIndex({
  agents: [
    {
      id: 'external_qa_agent',
      name: 'External QA Agent',
      description: 'External manifest agent for QA selection.',
      online: true,
      verificationStatus: 'verified',
      manifestSource: 'manifest-json',
      taskTypes: ['qa_external'],
      metadata: {
        manifest: {
          kind: 'external_qa',
          name: 'External QA Agent',
          description: 'External manifest agent for QA selection.',
          agent_role: 'worker',
          task_types: ['qa_external'],
          capabilities: ['external_check'],
          jobEndpoint: 'https://example.test/jobs',
          healthcheckUrl: 'https://example.test/health',
          metadata: { tags: ['external', 'qa'] }
        }
      }
    },
    {
      id: 'deleted_qa_agent',
      name: 'Deleted QA Agent',
      online: true,
      verificationStatus: 'verified',
      manifestSource: 'manifest-json',
      taskTypes: ['deleted_qa'],
      metadata: {
        hidden_from_catalog: true,
        deleted_at: '2026-05-14T00:00:00.000Z',
        manifest: {
          kind: 'deleted_qa',
          name: 'Deleted QA Agent',
          task_types: ['deleted_qa'],
          jobEndpoint: 'https://example.test/deleted/jobs',
          healthcheckUrl: 'https://example.test/deleted/health'
        }
      }
    }
  ],
  includeInternal: true
});
assert.ok(selectionIndex.some((item) => item.kind === 'research' && ['internal_agent_file', 'internal_sample'].includes(item.source)), 'selection index should include internal agent-file manifests');
assert.ok(selectionIndex.some((item) => item.kind === 'external_qa' && item.source === 'external_manifest'), 'selection index should include external registered manifests');
assert.equal(selectionIndex.some((item) => item.kind === 'deleted_qa'), false, 'selection index should automatically drop deleted or hidden agents');
assert.ok(selectionIndex.every((item) => item.provider === undefined && item.manifest === undefined), 'selection index must stay a readable summary, not an execution surface');

console.log('builtin-agents-qa passed');
