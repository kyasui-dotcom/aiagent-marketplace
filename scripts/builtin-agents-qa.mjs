import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  SAMPLE_AGENT_KINDS,
  sampleAgentDefinitionForKind
} from '../lib/builtin-agents/agents/index.js';
import { leaderReadableAgentSelectionIndex } from '../lib/agent-selection-index.js';
import { deliveryItemsFromJob } from '../lib/delivery-items.js';

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

function assertMissingConcreteDelivery(result, label) {
  assert.equal(result.status, 'failed', `${label} should fail instead of returning a shared template delivery`);
  assert.match(result.failure_reason || result.error || '', /missing_required_deliverable/, `${label} should name the missing deliverable contract`);
  assert.equal((result.files || []).length, 0, `${label} should not attach fallback files`);
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
assertMissingConcreteDelivery(result, 'research generic delivery');
assert.equal(result.runtime?.provider, 'agent_file');

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

for (const kind of [
  'data_analysis',
  'media_planner',
  'seo_gap',
  'landing',
  'cmo_leader'
]) {
  const definition = sampleAgentDefinitionForKind(kind);
  const delivery = await definition.provider.runJob({
    kind,
    definition,
    body: deliveryBody,
    source: {},
    manifest: definition.manifest
  });
  assertMissingConcreteDelivery(delivery, `${kind} delivery`);
}

const travelEsimBody = {
  prompt: [
    'Task: cmo_leader',
    'Goal: Original request:',
    'acquire leads for https://autowifi-travel.com',
    'User clarification:',
    '- Product/service: - Product/service: https://autowifi-travel.com',
    '- Analytics data: - Analytics data: GA4 + Search Console connector context attached.',
    '- Main goal: - Main goal: 問い合わせ・リード獲得を増やす',
    '- Target audience: - Target audience: 一般消費者',
    '- Constraints: - Constraints: Depth and quality first',
    '- Priority channel: - Priority channel: Organic search / SEO',
    'Attached connector context:',
    'GA4 property: properties/528967599',
    'Search Console site: https://autowifi-travel.com/',
    'Date range: 2026-04-18 to 2026-05-15',
    'Sessions: 74',
    'Conversions: 0',
    'Conversion rate: 0%',
    'Search Console query: add esim to iphone | https://autowifi-travel.com/en/guide/esim-iphone-setup | Landing page: https://autowifi-travel.com/en/guide/esim-iphone-setup',
    'Search Console query: airalo vs holafly | https://autowifi-travel.com/en/guide/airalo-vs-holafly | Landing page: https://autowifi-travel.com/en/guide/airalo-vs-holafly'
  ].join('\n'),
  output_language: 'en'
};

const wrongProductContextPattern = /AI agent workflows|AI-agent request|agent requests|turns agent requests/i;
const malformedAudiencePattern = /対象ユーザー:.*制約|Target audience:.*Constraints/i;

for (const kind of [
  'data_analysis',
  'media_planner',
  'seo_gap',
  'landing',
  'cmo_leader'
]) {
  const definition = sampleAgentDefinitionForKind(kind);
  const delivery = await definition.provider.runJob({
    kind,
    definition,
    body: travelEsimBody,
    source: {},
    manifest: definition.manifest
  });
  const content = delivery.files?.[0]?.content || '';
  assertMissingConcreteDelivery(delivery, `${kind} travel/eSIM delivery`);
  assert.ok(!wrongProductContextPattern.test(content), `${kind} travel/eSIM delivery must not use AI-agent-specific copy`);
  assert.ok(!malformedAudiencePattern.test(content), `${kind} travel/eSIM delivery must not leak adjacent intake labels into the audience`);
  assert.ok(!/signup or trial start/i.test(content), `${kind} travel/eSIM delivery should preserve lead/inquiry conversion intent`);
}

const travelEsimPurchaseBody = {
  ...travelEsimBody,
  prompt: travelEsimBody.prompt
    .replace('acquire leads for https://autowifi-travel.com', 'increase purchases for https://autowifi-travel.com')
    .replace('問い合わせ・リード獲得を増やす', '売上・購入を増やす')
};

for (const kind of [
  'data_analysis',
  'media_planner',
  'seo_gap',
  'landing',
  'cmo_leader'
]) {
  const definition = sampleAgentDefinitionForKind(kind);
  const delivery = await definition.provider.runJob({
    kind,
    definition,
    body: travelEsimPurchaseBody,
    source: {},
    manifest: definition.manifest
  });
  const content = delivery.files?.[0]?.content || '';
  assertMissingConcreteDelivery(delivery, `${kind} travel/eSIM purchase delivery`);
  assert.ok(!wrongProductContextPattern.test(content), `${kind} travel/eSIM purchase delivery must not use AI-agent-specific copy`);
  assert.ok(!malformedAudiencePattern.test(content), `${kind} travel/eSIM purchase delivery must not leak adjacent intake labels into the audience`);
  assert.ok(!/lead or inquiry|signup or trial start|inquiry_submit|signup_or_trial_start/i.test(content), `${kind} travel/eSIM purchase delivery should preserve purchase conversion intent`);
}

const teardown = sampleAgentDefinitionForKind('teardown');
const sourceRequiredTeardown = await teardown.provider.runJob({
  kind: 'teardown',
  definition: teardown,
  body: {
    prompt: 'Teardown https://autowifi-travel.com/en/guide/airalo-vs-holafly using the attached source context. Answer in English.',
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
  manifest: teardown.manifest
});
assertMissingConcreteDelivery(sourceRequiredTeardown, 'source-required non-research teardown');

const writer = sampleAgentDefinitionForKind('writer');
const sourceBackedWriter = await writer.provider.runJob({
  kind: 'writer',
  definition: writer,
  body: {
    prompt: [
      'Write a source-backed X post and blog draft for https://aiagent-marketplace.net.',
      'Target audience: developers and technical users',
      'Main goal: signup or trial start',
      'X account: https://x.com/cait',
      'Blog: https://aiagent-marketplace.net/news/demo-video-provider-flow.html'
    ].join('\n'),
    output_language: 'en',
    input: {
      files: [{
        name: 'founder-note.md',
        content: 'Founder note: CAIt preserves source evidence, specialist handoffs, and approval boundaries before publishing.'
      }]
    }
  },
  source: {},
  manifest: writer.manifest
});
assert.equal(sourceBackedWriter.status, 'completed');
const writerArtifact = sourceBackedWriter.report.artifacts.find((item) => item.id === 'writer-publisher-handoff');
assert.ok(writerArtifact, 'writer should emit a Publisher handoff artifact');
assert.equal(writerArtifact.destination, 'X');
assert.ok(writerArtifact.body.includes('## Publisher handoff'), 'writer Publisher artifact should include a handoff section');
assert.ok(writerArtifact.body.includes('## Draft variants'), 'writer Publisher artifact should include per-medium draft variants');
assert.equal(writerArtifact.publish_variants.length, 3, 'writer should emit three variants for the selected X medium');
assert.ok(writerArtifact.body.includes('## E-E-A-T source ledger'), 'writer Publisher artifact should include an E-E-A-T source ledger');
assert.ok(writerArtifact.source_evidence.some((source) => source.source_type === 'x_post_or_account'), 'writer source evidence should preserve X source/account material');
assert.ok(writerArtifact.source_evidence.some((source) => source.source_type === 'uploaded_file'), 'writer source evidence should preserve uploaded original notes');
const ownedSiteWriterArtifact = sourceBackedWriter.report.artifacts.find((item) => item.channel_key === 'owned_site');
assert.ok(ownedSiteWriterArtifact, 'writer should emit a separate Publisher artifact when a blog/article medium is requested too');
assert.equal(ownedSiteWriterArtifact.publish_variants.length, 3, 'writer should emit three variants for the owned site/blog medium');
const writerDeliveryItems = deliveryItemsFromJob({
  id: 'qa-writer-publisher',
  status: 'completed',
  taskType: 'writer',
  workflowTask: 'writer',
  workflowAgentName: 'WRITING AGENT',
  input: { _broker: { requester: { login: 'qa-writer' } } },
  output: sourceBackedWriter
});
const publisherItem = writerDeliveryItems.find((item) => item.surface === 'publisher' && item.itemType === 'x_post');
assert.ok(publisherItem, 'writer Publisher handoff artifact should become a publisher delivery item');
assert.ok(Array.isArray(publisherItem.metadata.source_evidence), 'publisher delivery item should preserve writer source evidence');
assert.equal(publisherItem.metadata.publish_variants.length, 3, 'publisher delivery item should preserve three publish variants');
assert.ok(publisherItem.metadata.eeat_notes?.trust, 'publisher delivery item should preserve E-E-A-T notes');

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
