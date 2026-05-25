import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from '@playwright/test';
import { appContextFromTransferPayload } from '../public/app-handoff-transfer.js';

async function resolveQaPort() {
  const requested = Number(process.env.APP_CONTEXT_QA_PORT || 0);
  if (Number.isInteger(requested) && requested > 0) return requested;
  return await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.unref();
    probe.on('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      const port = typeof address === 'object' && address ? Number(address.port || 0) : 0;
      probe.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }
        if (!port) {
          reject(new Error('failed to resolve app-context QA port'));
          return;
        }
        resolve(port);
      });
    });
  });
}

const port = await resolveQaPort();
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['server.js'], {
  cwd: new URL('..', import.meta.url),
  env: {
    ...process.env,
    PORT: String(port),
    HOST: '127.0.0.1',
    NODE_ENV: process.env.NODE_ENV || 'test',
    ALLOW_IN_MEMORY_STORAGE: '1'
  },
  stdio: ['ignore', 'pipe', 'pipe']
});

let serverLog = '';
let browser = null;
server.stdout.on('data', (chunk) => { serverLog += chunk.toString(); });
server.stderr.on('data', (chunk) => { serverLog += chunk.toString(); });

async function waitForHealth() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const response = await fetch(`${base}/api/health`);
      if (response.ok) return;
    } catch {}
    await delay(250);
  }
  throw new Error(`server did not start\n${serverLog}`);
}

async function createContext(context) {
  const response = await fetch(`${base}/api/app-contexts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ app_id: context.source_app, context })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(JSON.stringify(data));
  return data;
}

async function openAppWithContext(page, path, context) {
  const record = await createContext(context);
  const url = new URL(path, base);
  url.searchParams.set('cait_app_context_id', record.app_context_id);
  url.searchParams.set('cait_app_context_token', record.app_context_token);
  await page.goto(url.toString());
  return record;
}

try {
  await waitForHealth();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${base}/analytics-console.html`);
  await page.waitForSelector('#primaryTable');
  if (!(await page.textContent('#primaryTable')).includes('No server-side app context is loaded yet.')) throw new Error('analytics empty state was not rendered');
  await page.goto(`${base}/analytics-console.html?chat_return_to=${encodeURIComponent('/chat?thread=analytics')}&chat_handoff_id=analytics-handoff-empty`);
  await page.waitForSelector('#analyticsHandoffNotice:not([hidden])');
  if (!(await page.textContent('#analyticsHandoffNotice')).includes('no server analytics packet is loaded yet')) throw new Error('analytics chat-return-only warning was not rendered');
  if (!(await page.textContent('#analyticsReadinessList')).includes('Send to CAIt will create the server-side analytics packet')) throw new Error('analytics chat-return-only readiness overclaimed server context');

  await page.goto(`${base}/publisher-approval.html`);
  await page.waitForSelector('#contentList');
  if (!(await page.textContent('#contentList')).includes('No items match this destination view')) throw new Error('publisher empty state was not rendered');
  await page.goto(`${base}/publisher-approval.html?chat_return_to=${encodeURIComponent('/chat?thread=qa')}&chat_handoff_id=qa-handoff`);
  await page.waitForSelector('#handoffSessionNotice:not([hidden])');
  if (!(await page.textContent('#handoffSessionNotice')).includes('no server packet is loaded yet')) throw new Error('publisher chat-return-only warning was not rendered');
  if (!(await page.textContent('#opsReadinessList')).includes('Send to CAIt will create the server-side packet reference')) throw new Error('publisher chat-return-only readiness overclaimed server context');

  await page.goto(`${base}/lead-ops.html`);
  await page.waitForSelector('#leadTable');
  if (!(await page.textContent('#leadTable')).includes('No lead rows loaded.')) throw new Error('lead empty state was not rendered');
  await page.goto(`${base}/lead-ops.html?chat_return_to=${encodeURIComponent('/chat?thread=lead')}&chat_handoff_id=lead-handoff-empty`);
  await page.waitForSelector('#leadHandoffSessionNotice:not([hidden])');
  if (!(await page.textContent('#leadHandoffSessionNotice')).includes('no server lead packet is loaded yet')) throw new Error('lead chat-return-only warning was not rendered');
  if (!(await page.textContent('#leadOpsReadinessList')).includes('Send to CAIt will create the server-side lead packet reference')) throw new Error('lead chat-return-only readiness overclaimed server context');
  await page.fill('#leadSourcingIcpInput', 'B2B SaaS teams that need stable AI agent operations');
  await page.fill('#leadSourcingSourceInput', 'Public SaaS directories and company sites with operations or automation pages');
  await page.fill('#leadSourcingOfferInput', 'Show how CAIt keeps AIAGENT output as retained app context before outreach');
  await page.waitForFunction(() => document.querySelector('#leadSourcingPill')?.textContent?.includes('Ready to request'));
  const leadSourcingPreview = JSON.parse(await page.textContent('#leadContextPreview'));
  if (!JSON.stringify(leadSourcingPreview.artifacts || []).includes('lead_acquisition_request')) throw new Error('lead sourcing request was not added to the app context preview');
  if (!JSON.stringify(leadSourcingPreview.handoff_targets || []).includes('list_creator')) throw new Error('lead sourcing request did not target List Creator first');

  await page.goto(`${base}/campaign-operations.html`);
  await page.waitForSelector('#campaignList');
  if (!(await page.textContent('#campaignList')).includes('Login required')) throw new Error('campaign operations empty auth state was not rendered');
  await page.goto(`${base}/campaign-operations.html?chat_return_to=${encodeURIComponent('/chat?thread=campaign')}&chat_handoff_id=campaign-handoff-empty`);
  await page.waitForSelector('#campaignHandoffNotice:not([hidden])');
  if (!(await page.textContent('#campaignHandoffNotice')).includes('no server campaign packet is loaded yet')) throw new Error('campaign chat-return-only warning was not rendered');
  if (!(await page.textContent('#campaignReadinessList')).includes('Send to CAIt will create the server-side campaign packet')) throw new Error('campaign chat-return-only readiness overclaimed server context');
  if (!(await page.textContent('#campaignHandoffAuditList')).includes('Missing campaign_state')) throw new Error('campaign handoff audit did not show missing campaign state');

  await page.goto(`${base}/delivery-manager.html`);
  await page.waitForSelector('#deliveryList');
  if (!(await page.textContent('#deliveryList')).includes('No matching delivery')) throw new Error('delivery empty state was not rendered');
  await page.goto(`${base}/delivery-manager.html?chat_return_to=${encodeURIComponent('/chat?thread=delivery')}&chat_handoff_id=delivery-handoff-empty`);
  await page.waitForSelector('#deliveryHandoffNotice:not([hidden])');
  if (!(await page.textContent('#deliveryHandoffNotice')).includes('no server package is loaded yet')) throw new Error('delivery chat-return-only warning was not rendered');

  await openAppWithContext(page, `/analytics-console.html?chat_return_to=${encodeURIComponent('/chat?thread=analytics')}&chat_handoff_id=analytics-handoff`, {
    schema: 'cait-app-context/v1',
    source_app: 'qa_analytics',
    source_app_label: 'QA Analytics',
    title: 'Imported analytics packet',
    summary: 'Imported analytics summary',
    metrics: [{ label: 'organic_sessions', value: 321 }],
    artifacts: [
      {
        type: 'search_queries',
        rows: [{ query: 'imported japan esim', clicks: 88, position: 3.2, conversions: 4, note: 'imported note' }]
      },
      {
        type: 'channel_breakdown',
        rows: [{ channel: 'Referral', sessions: 40, conversions: 2, share: 12.5, cvr: 5 }]
      },
      {
        type: 'conversion_paths',
        rows: [{ channel: 'Referral', path: 'Partner review -> pricing', sessions: 18, conversions: 2, cvr: 11.1, note: 'Imported conversion path' }]
      },
      {
        type: 'google_sources',
        rows: [{ source: 'ga4', value: 'properties/123456789' }]
      },
      {
        type: 'google_report_status',
        rows: [{ loaded: true, start_date: '2026-05-01', end_date: '2026-05-24', range_days: '24', gsc: true, warnings: '' }]
      },
      {
        type: 'measurement_queue',
        rows: [{ action: 'Imported 7d check', window: '7d', status: 'scheduled', note: 'Compare query clicks after execution.' }]
      }
    ],
    handoff_targets: ['seo_specialist'],
    raw_context: {
      googleSearchConsoleSite: 'https://example.com/',
      googleReportLoaded: true,
      googleReportSources: { gsc: true }
    }
  });
  await page.waitForSelector('#primaryTable');
  await page.click('[data-section="queries"]');
  if (!(await page.textContent('#primaryTable')).includes('imported japan esim')) throw new Error('analytics context was not rendered');
  if (!(await page.textContent('#sessionsMetric')).includes('321')) throw new Error('analytics metric was not rendered');
  if (!(await page.textContent('#analyticsRunReadinessStatus')).includes('Ready')) throw new Error('analytics readiness did not preserve imported packet state');
  if (!(await page.textContent('#analyticsHandoffNotice')).includes('CAIt analytics handoff session is attached')) throw new Error('analytics server context notice was not rendered');
  await page.click('[data-section="dashboard"]');
  if (!(await page.textContent('#primaryTable')).includes('Referral')) throw new Error('analytics channel_breakdown artifact was not rendered');
  if (!(await page.textContent('#channelChart')).includes('Partner review -> pricing')) throw new Error('analytics conversion_paths artifact was not rendered');
  await page.click('[data-section="measurement"]');
  if (!(await page.textContent('#primaryTable')).includes('Imported 7d check')) throw new Error('analytics measurement queue was not imported');
  const analyticsPacket = JSON.parse(await page.textContent('#contextPreview'));
  if (analyticsPacket.raw_context?.chat_handoff_id !== 'analytics-handoff') throw new Error('analytics chat handoff id was not preserved in packet');
  if (analyticsPacket.raw_context?.chat_return_to !== '/chat?thread=analytics') throw new Error('analytics chat return path was not preserved in packet');
  if (!JSON.stringify(analyticsPacket.artifacts || []).includes('channel_breakdown')) throw new Error('analytics packet did not return channel_breakdown for app contract reuse');
  if (!JSON.stringify(analyticsPacket.artifacts || []).includes('conversion_paths')) throw new Error('analytics packet did not return conversion_paths for app contract reuse');

  await openAppWithContext(page, `/analytics-console.html?chat_return_to=${encodeURIComponent('/chat?thread=analytics-direct')}&chat_handoff_id=analytics-direct-handoff`, {
    schema: 'cait-app-context/v1',
    source_app: 'qa_growth_agent',
    source_app_label: 'QA Growth Agent',
    title: 'Direct analytics contract packet',
    summary: 'AIAGENT returned analytics contract keys outside artifacts rows.',
    metrics: { sessions: 987, search_clicks: 66, conversions: 12, conversion_rate: '1.2%' },
    search_queries: [{ query: 'stable aiagent operations', clicks: 66, impressions: 1200, position: 2.8, note: 'Top-level query row' }],
    landing_pages: [{ page: '/stable-aiagent-ops', sessions: 987, conversions: 12, note: 'Top-level landing page row' }],
    channel_breakdown: [{ channel: 'Organic Search', sessions: 700, conversions: 8, share: 70.9, cvr: 1.1 }],
    artifacts: [{
      type: 'analytics_context',
      content: JSON.stringify({
        conversion_paths: [{ channel: 'Organic Search', path: 'Query -> stable ops page -> signup', sessions: 77, conversions: 4, cvr: 5.2, note: 'JSON artifact conversion path' }],
        measurement_queue: [{ action: 'Top-level contract 24h check', window: '24h', status: 'scheduled', note: 'Confirm restored analytics packet survives CAIt handoff.' }],
        google_sources: [{ source: 'search_console', value: 'https://direct.example/' }],
        google_report_status: { loaded: true, start_date: '2026-05-10', end_date: '2026-05-24', range_days: '14', gsc: true, ga4: true }
      })
    }],
    raw_context: {
      googleGa4Property: 'properties/222333444'
    }
  });
  await page.waitForSelector('#primaryTable');
  if (!(await page.textContent('#sessionsMetric')).includes('987')) throw new Error('analytics direct metrics object was not restored');
  await page.click('[data-section="queries"]');
  if (!(await page.textContent('#primaryTable')).includes('stable aiagent operations')) throw new Error('analytics top-level search_queries were not rendered');
  await page.click('[data-section="pages"]');
  if (!(await page.textContent('#primaryTable')).includes('/stable-aiagent-ops')) throw new Error('analytics top-level landing_pages were not rendered');
  await page.click('[data-section="dashboard"]');
  if (!(await page.textContent('#primaryTable')).includes('Organic Search')) throw new Error('analytics top-level channel_breakdown was not rendered');
  if (!(await page.textContent('#channelChart')).includes('Query -> stable ops page -> signup')) throw new Error('analytics JSON artifact conversion_paths were not rendered');
  await page.click('[data-section="measurement"]');
  if (!(await page.textContent('#primaryTable')).includes('Top-level contract 24h check')) throw new Error('analytics JSON artifact measurement queue was not imported');
  const directAnalyticsPacket = JSON.parse(await page.textContent('#contextPreview'));
  if (directAnalyticsPacket.raw_context?.chat_handoff_id !== 'analytics-direct-handoff') throw new Error('analytics direct handoff id was not preserved');
  if (!JSON.stringify(directAnalyticsPacket.artifacts || []).includes('stable aiagent operations')) throw new Error('analytics direct contract rows were not returned for reuse');
  if (!JSON.stringify(directAnalyticsPacket.artifacts || []).includes('Top-level contract 24h check')) throw new Error('analytics JSON artifact measurement was not returned for reuse');

  await openAppWithContext(page, `/analytics-console.html?chat_return_to=${encodeURIComponent('/chat?thread=analytics-packet')}&chat_handoff_id=analytics-packet-handoff`, {
    schema: 'cait-app-context/v1',
    source_app: 'qa_growth_packet_agent',
    source_app_label: 'QA Growth Packet Agent',
    title: 'Nested analytics packet',
    summary: 'AIAGENT returned analytics_context, search_console_packet, and ga4_packet as first-class contract fields.',
    analytics_context: {
      metrics: { sessions: 654, search_clicks: 91, conversions: 19, conversion_rate: '2.9%' },
      measurement_queue: [{ action: 'Packet 7d retention check', window: '7d', status: 'scheduled', note: 'Confirm nested packet survives stable SaaS handoff.' }],
      google_sources: [
        { source: 'ga4', value: 'properties/999888777' },
        { source: 'search_console', value: 'https://packet.example/' }
      ],
      google_report_status: { loaded: true, start_date: '2026-05-12', end_date: '2026-05-25', range_days: '13', gsc: true, ga4: true }
    },
    search_console_packet: {
      search_queries: [{ query: 'aiagent stable analytics handoff', clicks: 91, impressions: 1600, position: 2.1, note: 'Nested Search Console packet query' }]
    },
    ga4_packet: {
      landing_pages: [{ page: '/stable-analytics-handoff', sessions: 654, conversions: 19, note: 'Nested GA4 packet page' }],
      channel_breakdown: [{ channel: 'Referral', sessions: 180, conversions: 9, share: 27.5, cvr: 5 }],
      conversion_paths: [{ channel: 'Referral', path: 'Partner packet -> analytics page -> signup', sessions: 44, conversions: 3, cvr: 6.8, note: 'Nested GA4 path' }]
    }
  });
  await page.waitForSelector('#primaryTable');
  if (!(await page.textContent('#sessionsMetric')).includes('654')) throw new Error('analytics nested packet metrics were not restored');
  await page.click('[data-section="queries"]');
  if (!(await page.textContent('#primaryTable')).includes('aiagent stable analytics handoff')) throw new Error('analytics nested search_console_packet queries were not rendered');
  await page.click('[data-section="pages"]');
  if (!(await page.textContent('#primaryTable')).includes('/stable-analytics-handoff')) throw new Error('analytics nested ga4_packet landing pages were not rendered');
  await page.click('[data-section="dashboard"]');
  if (!(await page.textContent('#channelChart')).includes('Partner packet -> analytics page -> signup')) throw new Error('analytics nested ga4_packet conversion paths were not rendered');
  await page.click('[data-section="measurement"]');
  if (!(await page.textContent('#primaryTable')).includes('Packet 7d retention check')) throw new Error('analytics nested analytics_context measurement was not imported');
  const nestedAnalyticsPacket = JSON.parse(await page.textContent('#contextPreview'));
  if (nestedAnalyticsPacket.raw_context?.chat_handoff_id !== 'analytics-packet-handoff') throw new Error('analytics nested packet handoff id was not preserved');
  if (!JSON.stringify(nestedAnalyticsPacket.raw_context?.received_context || {}).includes('analytics_context')) throw new Error('analytics nested packet source was not preserved in server raw_context');
  if (!JSON.stringify(nestedAnalyticsPacket.artifacts || []).includes('aiagent stable analytics handoff')) throw new Error('analytics nested packet rows were not returned for reuse');

  await openAppWithContext(page, `/analytics-console.html?chat_return_to=${encodeURIComponent('/chat?thread=analytics-markdown')}&chat_handoff_id=analytics-markdown-handoff`, {
    schema: 'cait-app-context/v1',
    source_app: 'qa_markdown_growth_agent',
    source_app_label: 'QA Markdown Growth Agent',
    title: 'Markdown analytics delivery',
    summary: 'AIAGENT returned analytics rows as Markdown report tables instead of structured JSON.',
    artifacts: [{
      type: 'file',
      name: 'analytics-report.md',
      contentPreview: [
        '## Search queries',
        '| Query | Clicks | Position | Impressions | Note |',
        '| --- | ---: | ---: | ---: | --- |',
        '| markdown stable ops | 144 | 1.8 | 2400 | Markdown query row should become retained analytics evidence. |',
        '',
        '## Landing pages',
        '| Page | Sessions | Conversions | Note |',
        '| --- | ---: | ---: | --- |',
        '| /markdown-stable-ops | 730 | 23 | Markdown landing page row should survive handoff. |',
        '',
        '## Channel breakdown',
        '| Channel | Sessions | Conversions | Share | CVR |',
        '| --- | ---: | ---: | ---: | ---: |',
        '| Organic Search | 730 | 23 | 82 | 3.2% |',
        '',
        '## Conversion paths',
        '| Channel | Path | Sessions | Conversions | CVR | Note |',
        '| --- | --- | ---: | ---: | ---: | --- |',
        '| Organic Search | Markdown report -> retained SaaS packet -> signup | 118 | 7 | 5.9% | Confirm Markdown tables are reusable. |',
        '',
        '## Measurement queue',
        '| Action | Window | Status | Note |',
        '| --- | --- | --- | --- |',
        '| Markdown report 7d follow-up | 7d | scheduled | Compare retained query clicks after execution. |'
      ].join('\n')
    }]
  });
  await page.waitForSelector('#primaryTable');
  await page.click('[data-section="queries"]');
  await page.waitForFunction(() => document.querySelector('#primaryTable')?.textContent?.includes('markdown stable ops'));
  if (!(await page.textContent('#primaryTable')).includes('markdown stable ops')) throw new Error('analytics Markdown search query table was not imported');
  if (!(await page.textContent('#primaryTable')).includes('2,400')) throw new Error('analytics Markdown search query impressions were not preserved');
  await page.click('[data-section="pages"]');
  await page.waitForFunction(() => document.querySelector('#primaryTable')?.textContent?.includes('/markdown-stable-ops'));
  if (!(await page.textContent('#primaryTable')).includes('/markdown-stable-ops')) throw new Error('analytics Markdown landing page table was not imported');
  await page.click('[data-section="dashboard"]');
  await page.waitForFunction(() => document.querySelector('#channelChart')?.textContent?.includes('Markdown report -> retained SaaS packet -> signup'));
  if (!(await page.textContent('#channelChart')).includes('Markdown report -> retained SaaS packet -> signup')) throw new Error('analytics Markdown conversion path table was not imported');
  await page.click('[data-section="measurement"]');
  await page.waitForFunction(() => document.querySelector('#primaryTable')?.textContent?.includes('Markdown report 7d follow-up'));
  if (!(await page.textContent('#primaryTable')).includes('Markdown report 7d follow-up')) throw new Error('analytics Markdown measurement queue table was not imported');
  const markdownAnalyticsPacket = JSON.parse(await page.textContent('#contextPreview'));
  if (markdownAnalyticsPacket.raw_context?.chat_handoff_id !== 'analytics-markdown-handoff') throw new Error('analytics Markdown handoff id was not preserved');
  if (!JSON.stringify(markdownAnalyticsPacket.artifacts || []).includes('markdown stable ops')) throw new Error('analytics Markdown rows were not returned for app contract reuse');

  await openAppWithContext(page, `/publisher-approval.html?chat_return_to=${encodeURIComponent('/chat?thread=publisher')}&chat_handoff_id=publisher-handoff`, {
    schema: 'cait-app-context/v1',
    source_app: 'qa_publisher',
    source_app_label: 'QA Publisher',
    title: 'Imported publisher packet',
    summary: 'Imported publisher summary',
    artifacts: [
      {
        type: 'page',
        title: 'Imported landing update',
        slug: '/imported-page',
        meta: 'Imported meta',
        body: 'Imported body',
        status: 'needs approval'
      }
    ],
    approval_requests: [{ id: 'approval-1', title: 'Imported approval request', action_type: 'publish_change', status: 'needs approval' }],
    sitePublishPacket: {
      id: 'site-contract-1',
      title: 'Raw contract landing update',
      slug: '/raw-contract-page',
      meta: 'Raw contract meta',
      h1: 'Raw contract H1',
      primary_cta: 'Start from retained approval state',
      body: 'Raw contract body',
      status: 'needs approval'
    },
    socialCopyPacket: [{
      id: 'social-contract-1',
      title: 'Raw social approval post',
      channel_key: 'social',
      body: 'Approved text should stay staged in Publisher before external posting.',
      status: 'needs approval'
    }]
  });
  await page.waitForSelector('#contentList');
  await page.waitForFunction(() => document.querySelector('#contentList')?.textContent?.includes('Imported landing update'));
  if (!(await page.textContent('#contentList')).includes('Imported landing update')) throw new Error('publisher context was not rendered');
  if (!(await page.textContent('#contentList')).includes('Raw contract landing update')) throw new Error('publisher top-level sitePublishPacket contract was not rendered');
  if (!(await page.textContent('#contentList')).includes('Raw social approval post')) throw new Error('publisher top-level socialCopyPacket contract was not rendered');
  await page.waitForFunction(() => document.querySelector('#handoffSessionNotice')?.textContent?.includes('CAIt handoff session is attached'));
  if (!(await page.textContent('#handoffSessionNotice')).includes('CAIt handoff session is attached')) throw new Error('publisher server context notice was not rendered');
  await page.waitForFunction(() => document.querySelector('#opsReadinessPill')?.textContent?.includes('2/4 ops checks ready'));
  if (!(await page.textContent('#opsReadinessPill')).includes('2/4 ops checks ready')) throw new Error('publisher readiness did not separate approval, execution, and server context state');
  const publisherPacket = JSON.parse(await page.textContent('#packetPreview'));
  if (publisherPacket.raw_context?.chat_handoff_id !== 'publisher-handoff') throw new Error('publisher chat handoff id was not preserved in packet');
  if (publisherPacket.raw_context?.chat_return_to !== '/chat?thread=publisher') throw new Error('publisher chat return path was not preserved in packet');
  if (!JSON.stringify(publisherPacket.artifacts || []).includes('site_publish_packet')) throw new Error('publisher packet did not return site_publish_packet for app contract reuse');
  if (publisherPacket.raw_context?.selected_publisher_contract_type !== 'site_publish_packet') throw new Error('publisher selected contract type was not preserved in raw_context');

  await openAppWithContext(page, `/publisher-approval.html?chat_return_to=${encodeURIComponent('/chat?thread=publisher-direct')}&chat_handoff_id=publisher-direct-handoff`, {
    schema: 'cait-app-context/v1',
    source_app: 'qa_writer_agent',
    source_app_label: 'QA Writer Agent',
    title: 'Agent landing-page delivery for Publisher',
    summary: 'A writer agent returned a markdown delivery file that should become a direct Publisher packet.',
    artifacts: [
      {
        type: 'file',
        name: 'agent-landing-delivery.md',
        artifact_type: 'landing_page_change',
        artifact_types: ['landing_page_change'],
        content_type: 'landing_page_change',
        content: [
          '# Agent landing page delivery',
          '',
          '## H1 and metadata',
          '- Meta title: Direct Publisher Transfer Title',
          '- Meta description: Direct Publisher Transfer Description.',
          '- Keywords: direct publisher handoff, stable SaaS ops',
          '- H1: Direct Publisher Transfer H1',
          '- Primary CTA: Start stable operation',
          '- Secondary CTA: Review handoff proof',
          '- Internal links: /apps.html, /publisher-approval.html',
          '',
          '## Body draft',
          'Unique direct publisher transfer body from an agent delivery file.'
        ].join('\n')
      }
    ]
  });
  await page.waitForSelector('#contentList');
  await page.waitForFunction(() => document.querySelector('#titleInput')?.value?.includes('Direct Publisher Transfer Title'));
  if ((await page.inputValue('#destinationInput')) !== 'Owned site / Publisher') throw new Error('publisher direct agent handoff did not select owned-site destination');
  if ((await page.inputValue('#connectorInput')) !== 'publisher') throw new Error('publisher direct agent handoff did not select publisher connector');
  if ((await page.inputValue('#connectorCapabilityInput')) !== 'site_publish_packet') throw new Error('publisher direct agent handoff did not select site_publish_packet capability');
  if ((await page.inputValue('#publishMethodInput')) !== 'publisher_review_or_selected_connector') throw new Error('publisher direct agent handoff did not select direct publisher review method');
  if ((await page.inputValue('#metaInput')) !== 'Direct Publisher Transfer Description.') throw new Error('publisher direct agent handoff did not extract meta description from markdown');
  if (!(await page.inputValue('#bodyInput')).includes('Unique direct publisher transfer body')) throw new Error('publisher direct agent handoff did not preserve agent body text');
  const directPublisherPacket = JSON.parse(await page.textContent('#packetPreview'));
  if (directPublisherPacket.raw_context?.selected_publisher_contract_type !== 'site_publish_packet') throw new Error('publisher direct agent handoff did not return site_publish_packet as the selected contract');
  if (!JSON.stringify(directPublisherPacket.artifacts || []).includes('site_publish_packet')) throw new Error('publisher direct agent handoff packet did not return site_publish_packet for execution reuse');

  await openAppWithContext(page, `/lead-ops.html?chat_return_to=${encodeURIComponent('/chat?thread=lead')}&chat_handoff_id=lead-handoff`, {
    schema: 'cait-app-context/v1',
    source_app: 'qa_leads',
    source_app_label: 'QA Leads',
    title: 'Imported lead packet',
    artifacts: [
      {
        type: 'lead_rows',
        rows: [
          {
            id: 'lead-x',
            company: 'Imported Travel Partner',
            segment: 'Travel media',
            status: 'review',
            nextAction: 'Review imported row'
          }
        ]
      },
      {
        type: 'evidence_urls',
        rows: [
          {
            lead_id: 'lead-x',
            contact_path: 'partner@example.com',
            evidence_url: 'https://example.com/source',
            consent_basis: 'public_business_contact'
          }
        ]
      },
      {
        type: 'next_actions',
        rows: [
          {
            lead_id: 'lead-x',
            next_action: 'Review imported supplemental action',
            owner: 'CMO Leader'
          }
        ]
      },
      {
        type: 'email_drafts',
        drafts: [
          {
            lead_id: 'lead-x',
            subject: 'Imported subject',
            body: 'Imported body',
            status: 'draft'
          }
        ]
      }
    ]
  });
  await page.waitForSelector('#leadTable');
  if (!(await page.textContent('#leadTable')).includes('Imported Travel Partner')) throw new Error('lead context was not rendered');
  if (!(await page.inputValue('#leadSourceInput')).includes('https://example.com/source')) throw new Error('lead evidence_urls artifact was not merged into the selected row');
  if (!(await page.inputValue('#emailSubjectInput')).includes('Imported subject')) throw new Error('lead email draft was not rendered');
  await page.waitForFunction(() => document.querySelector('#leadHandoffSessionNotice')?.textContent?.includes('CAIt lead handoff session is attached'));
  if (!(await page.textContent('#leadHandoffSessionNotice')).includes('CAIt lead handoff session is attached')) throw new Error('lead server context notice was not rendered');
  await page.waitForFunction(() => document.querySelector('#leadOpsReadinessPill')?.textContent?.includes('3/4 ops checks ready'));
  if (!(await page.textContent('#leadOpsReadinessPill')).includes('3/4 ops checks ready')) throw new Error('lead readiness did not separate evidence, approval, execution, and server context state');
  const leadPacket = JSON.parse(await page.textContent('#leadContextPreview'));
  if (leadPacket.raw_context?.chat_handoff_id !== 'lead-handoff') throw new Error('lead chat handoff id was not preserved in packet');
  if (leadPacket.raw_context?.chat_return_to !== '/chat?thread=lead') throw new Error('lead chat return path was not preserved in packet');
  if (leadPacket.raw_context?.selected_lead_id !== 'lead-x') throw new Error('lead selected lead id was not preserved in packet');
  if (!JSON.stringify(leadPacket.artifacts || []).includes('email_drafts')) throw new Error('lead packet did not return plural email_drafts for app contract reuse');
  if (!JSON.stringify(leadPacket.artifacts || []).includes('Review imported supplemental action')) throw new Error('lead next_actions artifact was not preserved in the returned packet');

  await openAppWithContext(page, `/lead-ops.html?chat_return_to=${encodeURIComponent('/chat?thread=lead-packet')}&chat_handoff_id=lead-packet-handoff`, {
    schema: 'cait-app-context/v1',
    source_app: 'qa_lead_packet_agent',
    source_app_label: 'QA Lead Packet Agent',
    title: 'Nested Lead Ops packet',
    summary: 'AIAGENT returned leadOpsPacket and outreachPlan as first-class contract fields.',
    leadOpsPacket: {
      leadRows: [{
        id: 'lead-packet',
        company: 'Packet Lead Co',
        website: 'https://packet-lead.example',
        contact: 'owner@packet-lead.example',
        evidence_url: 'https://packet-lead.example/source',
        consent_basis: 'public_business_contact',
        status: 'review',
        next_action: 'Review packet lead row'
      }],
      emailDrafts: [{
        lead_id: 'lead-packet',
        sender_email: 'sales@example.com',
        subject: 'Packet subject',
        body: 'Packet body',
        status: 'draft'
      }],
      nextActions: [{
        lead_id: 'lead-packet',
        next_action: 'Packet next action survives raw context',
        owner: 'Email Ops'
      }]
    },
    outreachPlan: {
      steps: [{
        lead_id: 'lead-packet',
        channel: 'email',
        send_mode: 'scheduled',
        schedule_at: '2026-05-26T09:30',
        subject: 'Scheduled packet subject',
        body: 'Scheduled packet body',
        status: 'draft'
      }]
    }
  });
  await page.waitForSelector('#leadTable');
  if (!(await page.textContent('#leadTable')).includes('Packet Lead Co')) throw new Error('lead_ops_packet lead row was not rendered');
  if (!(await page.inputValue('#leadSourceInput')).includes('https://packet-lead.example/source')) throw new Error('lead_ops_packet evidence URL was not restored');
  if (!(await page.inputValue('#emailSubjectInput')).includes('Scheduled packet subject')) throw new Error('lead outreachPlan did not override the draft subject');
  if ((await page.inputValue('#scheduleAtInput')) !== '2026-05-26T09:30') throw new Error('lead outreachPlan schedule was not restored');
  const packetLeadContext = JSON.parse(await page.textContent('#leadContextPreview'));
  if (packetLeadContext.raw_context?.chat_handoff_id !== 'lead-packet-handoff') throw new Error('lead packet handoff id was not preserved');
  if (!JSON.stringify(packetLeadContext.raw_context?.received_context || {}).includes('lead_ops_packet')) throw new Error('lead_ops_packet source was not preserved in server raw_context');
  if (!JSON.stringify(packetLeadContext.artifacts || []).includes('Packet next action survives raw context')) throw new Error('lead_ops_packet next action was not returned for app contract reuse');

  await openAppWithContext(page, `/campaign-operations.html?chat_return_to=${encodeURIComponent('/chat?thread=campaign')}&chat_handoff_id=campaign-handoff`, {
    schema: 'cait-app-context/v1',
    source_app: 'qa_campaign_operations',
    source_app_label: 'QA Campaign Operations',
    title: 'Imported campaign packet',
    summary: 'Imported campaign summary',
    campaignState: { id: 'camp-imported', title: 'Imported Growth Campaign', objective: 'Increase qualified demos', status: 'waiting_approval', channels: ['seo', 'x'] },
    publisherQueue: [{ id: 'pub-1', channel: 'seo', title: 'Approve landing page update', status: 'waiting_approval' }],
    approvalBacklog: [{ id: 'approval-1', channel: 'x', title: 'CMO owner must approve launch copy', status: 'waiting_approval', window: 'Before publish' }],
    connectorReadiness: [{ kind: 'Analytics', provider: 'GA4', status: 'ready' }, { kind: 'CRM/MA', provider: 'HubSpot', status: 'pending' }],
    plannedActionQueue: [{ id: 'act-1', channel: 'cmo', title: 'Review Week 0-1 actions', brief: 'Confirm owner before channel execution.', status: 'planned', window: 'Week 0-1' }],
    nowWeekZeroOne: [{ id: 'now-1', channel: 'publisher', title: 'Stage landing page copy', brief: 'Keep draft in Publisher before approval.', status: 'waiting_approval' }],
    nextWeekOneThree: [{ id: 'next-1', channel: 'analytics', title: 'Compare landing conversion', brief: 'Use analytics context after the first campaign actions run.', status: 'scheduled' }],
    waitingConditions: [{ id: 'wait-1', owner: 'CRM owner', condition: 'HubSpot field mapping must be confirmed before lead sync.', status: 'blocked', window: 'Before send' }],
    measurementLoop: [{ name: '24h analytics check', value: 0, unit: 'scheduled' }],
    nextActionOwner: [{ owner: 'Campaign Ops Owner', responsibility: 'Route the next CAIt run after approvals and measurement checks.', status: 'pending', window: 'After approval' }],
    raw_context: {
      campaign_id: 'camp-imported'
    }
  });
  await page.waitForSelector('#campaignList');
  await page.waitForFunction(() => document.querySelector('#campaignList')?.textContent?.includes('Imported Growth Campaign'));
  if (!(await page.textContent('#campaignList')).includes('Imported Growth Campaign')) throw new Error('campaign context was not rendered');
  if (!(await page.textContent('#campaignDetail')).includes('Approve landing page update')) throw new Error('campaign publisher queue was not rendered');
  if (!(await page.textContent('#campaignDetail')).includes('CMO owner must approve launch copy')) throw new Error('campaign approval_backlog artifact was not rendered');
  if (!(await page.textContent('#campaignDetail')).includes('HubSpot')) throw new Error('campaign connector readiness was not rendered');
  if (!(await page.textContent('#actionQueueTable')).includes('Review Week 0-1 actions')) throw new Error('campaign action queue was not rendered');
  if (!(await page.textContent('#actionQueueTable')).includes('Stage landing page copy')) throw new Error('campaign now_week_0_1 artifact was not rendered in the action queue');
  if (!(await page.textContent('#actionQueueTable')).includes('Compare landing conversion')) throw new Error('campaign next_week_1_3 artifact was not rendered in the action queue');
  if (!(await page.textContent('#campaignDetail')).includes('HubSpot field mapping must be confirmed')) throw new Error('campaign waiting_conditions artifact was not rendered');
  if (!(await page.textContent('#campaignDetail')).includes('Campaign Ops Owner')) throw new Error('campaign next_action_owner artifact was not rendered');
  await page.waitForFunction(() => document.querySelector('#campaignHandoffNotice')?.textContent?.includes('CAIt campaign handoff session is attached'));
  if (!(await page.textContent('#campaignHandoffNotice')).includes('CAIt campaign handoff session is attached')) throw new Error('campaign server context notice was not rendered');
  await page.waitForFunction(() => document.querySelector('#campaignReadinessPill')?.textContent?.includes('6/6 ops checks ready'));
  if (!(await page.textContent('#campaignReadinessPill')).includes('6/6 ops checks ready')) throw new Error('campaign readiness did not preserve imported campaign state');
  await page.waitForFunction(() => document.querySelector('#campaignHandoffAuditSummary')?.textContent?.includes('All campaign operations anchors are present'));
  if (!(await page.textContent('#campaignHandoffAuditPill')).includes('7/7 anchors present')) throw new Error('campaign handoff audit did not mark all anchors present');
  const campaignPacket = JSON.parse(await page.textContent('#campaignContextPreview'));
  if (campaignPacket.raw_context?.chat_handoff_id !== 'campaign-handoff') throw new Error('campaign chat handoff id was not preserved in packet');
  if (campaignPacket.raw_context?.chat_return_to !== '/chat?thread=campaign') throw new Error('campaign chat return path was not preserved in packet');
  if (campaignPacket.raw_context?.campaign_id !== 'camp-imported') throw new Error('campaign id was not preserved in packet');
  if (campaignPacket.raw_context?.campaign_handoff_audit?.missing?.length !== 0) throw new Error('campaign handoff audit should have no missing anchors for complete packet');
  const receivedCampaignContext = JSON.stringify(campaignPacket.raw_context?.received_context || {});
  if (!receivedCampaignContext.includes('publisher_queue')) throw new Error('campaign top-level camelCase contract fields were not normalized into server raw_context');
  if (!receivedCampaignContext.includes('now_week_0_1')) throw new Error('campaign camelCase week 0-1 field was not normalized into server raw_context');
  if (!JSON.stringify(campaignPacket.artifacts || []).includes('publisher_queue')) throw new Error('campaign packet did not return publisher_queue for app contract reuse');
  if (!JSON.stringify(campaignPacket.artifacts || []).includes('approval_backlog')) throw new Error('campaign packet did not return approval_backlog for app contract reuse');
  if (!JSON.stringify(campaignPacket.artifacts || []).includes('now_week_0_1')) throw new Error('campaign packet did not return now_week_0_1 for app contract reuse');
  if (!JSON.stringify(campaignPacket.artifacts || []).includes('next_week_1_3')) throw new Error('campaign packet did not return next_week_1_3 for app contract reuse');
  if (!JSON.stringify(campaignPacket.artifacts || []).includes('waiting_conditions')) throw new Error('campaign packet did not return waiting_conditions for app contract reuse');
  if (!JSON.stringify(campaignPacket.artifacts || []).includes('measurement_loop')) throw new Error('campaign packet did not return measurement_loop for app contract reuse');
  if (!JSON.stringify(campaignPacket.artifacts || []).includes('next_action_owner')) throw new Error('campaign packet did not return next_action_owner for app contract reuse');
  if (!JSON.stringify(campaignPacket.artifacts || []).includes('handoff_audit')) throw new Error('campaign packet did not return handoff_audit for app contract debugging');

  await openAppWithContext(page, '/campaign-operations.html', {
    schema: 'cait-app-context/v1',
    source_app: 'qa_campaign_markdown_delivery',
    source_app_label: 'QA Campaign Markdown Delivery',
    title: 'Markdown campaign handoff',
    summary: 'Campaign Operations Agent returned a markdown delivery file.',
    artifacts: [{
      type: 'file',
      name: 'campaign-operations-delivery.md',
      artifact_type: 'campaign_operations_plan',
      artifact_types: ['campaign_operations_plan'],
      content_type: 'campaign_operations_plan',
      content: [
        '# Markdown Campaign Ops',
        '',
        '## Campaign state',
        '- Objective: Convert trial users into qualified demos',
        '- Audience: SaaS operators evaluating AI agents',
        '- Target URL: https://example.com/demo',
        '- Status: waiting approval',
        '',
        '## Publisher queue',
        '- seo: Stage demo landing page update in Publisher before approval.',
        '',
        '## Approval backlog',
        '- Launch owner approval is required before any external send.',
        '',
        '## Connector readiness',
        '- Analytics: not verified until GA4 context is attached.',
        '- CRM/MA: pending HubSpot field mapping.',
        '',
        '## Planned action queue',
        '- campaign owner: Confirm owner before channel execution.',
        '',
        '## Now (Week 0-1)',
        '- Publisher candidate: keep the demo page draft staged but not live.',
        '',
        '## Next (Week 1-3)',
        '- Analytics: compare demo conversion after approved actions run.',
        '',
        '## Waiting conditions',
        '- CRM owner: HubSpot mapping must be confirmed before lead sync.',
        '',
        '## Measurement loop',
        '- 24h demo conversion check',
        '- 7d qualified demo review',
        '',
        '## Next action owner',
        '- Campaign Ops Owner: assign the next CAIt follow-up after approval.'
      ].join('\n')
    }]
  });
  await page.waitForSelector('#campaignList');
  await page.waitForFunction(() => document.querySelector('#campaignList')?.textContent?.includes('Markdown Campaign Ops'));
  if (!(await page.textContent('#campaignDetail')).includes('Stage demo landing page update')) throw new Error('campaign markdown Publisher queue was not imported');
  if (!(await page.textContent('#campaignDetail')).includes('Launch owner approval')) throw new Error('campaign markdown approval backlog was not imported');
  if (!(await page.textContent('#campaignDetail')).includes('HubSpot')) throw new Error('campaign markdown connector readiness was not imported');
  if (!(await page.textContent('#actionQueueTable')).includes('keep the demo page draft staged')) throw new Error('campaign markdown Week 0-1 action was not imported');
  if (!(await page.textContent('#actionQueueTable')).includes('compare demo conversion')) throw new Error('campaign markdown Week 1-3 action was not imported');
  if (!(await page.textContent('#campaignDetail')).includes('HubSpot mapping must be confirmed')) throw new Error('campaign markdown waiting condition was not imported');
  if (!(await page.textContent('#campaignDetail')).includes('24h demo conversion check')) throw new Error('campaign markdown measurement loop was not imported');
  if (!(await page.textContent('#campaignDetail')).includes('Campaign Ops Owner')) throw new Error('campaign markdown next action owner was not imported');
  const markdownCampaignPacket = JSON.parse(await page.textContent('#campaignContextPreview'));
  if (!JSON.stringify(markdownCampaignPacket.raw_context?.received_context || {}).includes('campaign_operations_plan')) throw new Error('campaign markdown source artifact was not preserved in server raw_context');
  if (!JSON.stringify(markdownCampaignPacket.artifacts || []).includes('Stage demo landing page update')) throw new Error('campaign markdown Publisher queue was not returned for app contract reuse');
  if (!JSON.stringify(markdownCampaignPacket.artifacts || []).includes('next_action_owner')) throw new Error('campaign markdown next_action_owner was not returned for app contract reuse');

  await openAppWithContext(page, '/campaign-operations.html', {
    schema: 'cait-app-context/v1',
    source_app: 'qa_campaign_top_level_plan',
    source_app_label: 'QA Campaign Top-Level Plan',
    title: 'Top-level campaign plan handoff',
    summary: 'Campaign Operations Agent returned campaignOperationsPlan as a top-level contract field.',
    campaignOperationsPlan: [
      '# Top-Level Contract Campaign Ops',
      '',
      '## Campaign state',
      '- Objective: Preserve campaign plan fields even when AIAGENT does not wrap them as files',
      '- Audience: SaaS operators who need stable retained operations',
      '- Status: waiting approval',
      '',
      '## Publisher queue',
      '- publisher: Keep top-level plan copy staged for approval.',
      '',
      '## Connector readiness',
      '- Analytics: ready after imported app context is attached.',
      '',
      '## Waiting conditions',
      '- campaign owner: Approve top-level plan before execution.',
      '',
      '## Measurement loop',
      '- 24h top-level plan import check',
      '',
      '## Next action owner',
      '- Campaign Ops Owner: send the retained packet back to CAIt.'
    ].join('\n')
  });
  await page.waitForSelector('#campaignList');
  await page.waitForFunction(() => document.querySelector('#campaignList')?.textContent?.includes('Top-Level Contract Campaign Ops'));
  if (!(await page.textContent('#campaignDetail')).includes('top-level plan copy staged')) throw new Error('campaign top-level campaignOperationsPlan was not imported as Publisher queue');
  if (!(await page.textContent('#campaignDetail')).includes('Approve top-level plan')) throw new Error('campaign top-level campaignOperationsPlan waiting condition was not imported');
  const topLevelPlanPacket = JSON.parse(await page.textContent('#campaignContextPreview'));
  if (!JSON.stringify(topLevelPlanPacket.raw_context?.received_context || {}).includes('campaign_operations_plan')) throw new Error('campaign top-level plan was not normalized into server raw_context');
  if (!JSON.stringify(topLevelPlanPacket.artifacts || []).includes('top-level plan copy staged')) throw new Error('campaign top-level plan Publisher queue was not returned for app contract reuse');

  await openAppWithContext(page, '/campaign-operations.html', {
    schema: 'cait-app-context/v1',
    source_app: 'qa_campaign_untyped_delivery',
    source_app_label: 'QA Campaign Untyped Delivery',
    title: 'Untyped campaign delivery handoff',
    summary: 'Campaign Operations Agent returned a plain markdown delivery file without artifact typing.',
    delivery_files: [{
      type: 'markdown',
      name: 'campaign-operations-delivery.md',
      content: [
        '# Untyped Campaign Ops',
        '',
        '## Campaign state',
        '- Objective: Make the retained operations board visible to skeptical AIAGENT users',
        '- Audience: Operators who need durable campaign state',
        '- Status: waiting approval',
        '',
        '## Publisher queue',
        '- publisher: Retain board positioning draft before approval.',
        '',
        '## Connector readiness',
        '- Analytics: ready for 24h follow-up.',
        '',
        '## Waiting conditions',
        '- campaign owner: Approve the stable operations copy before publish.',
        '',
        '## Measurement loop',
        '- 24h retained-state check'
      ].join('\n')
    }]
  });
  await page.waitForSelector('#campaignList');
  await page.waitForFunction(() => document.querySelector('#campaignList')?.textContent?.includes('Untyped Campaign Ops'));
  if (!(await page.textContent('#campaignDetail')).includes('Retain board positioning draft')) throw new Error('campaign untyped markdown delivery was not recognized as a campaign plan');
  if (!(await page.textContent('#campaignDetail')).includes('Approve the stable operations copy')) throw new Error('campaign untyped markdown waiting condition was not imported');
  const untypedCampaignPacket = JSON.parse(await page.textContent('#campaignContextPreview'));
  if (!JSON.stringify(untypedCampaignPacket.raw_context?.received_context || {}).includes('campaign-operations-delivery.md')) throw new Error('campaign untyped markdown source file was not preserved in server raw_context');
  if (!JSON.stringify(untypedCampaignPacket.artifacts || []).includes('Retain board positioning draft')) throw new Error('campaign untyped markdown Publisher queue was not returned for app contract reuse');

  await openAppWithContext(page, '/campaign-operations.html', {
    schema: 'cait-app-context/v1',
    source_app: 'qa_campaign_agent_files',
    source_app_label: 'QA Campaign Agent Files',
    title: 'Agent files campaign handoff',
    summary: 'Campaign Operations Agent returned its native files array instead of delivery_files.',
    files: [{
      name: 'campaign-operations-delivery.md',
      type: 'text/markdown',
      source_task_type: 'campaign_operations',
      content_type: 'campaign_operations_plan',
      content: [
        '# Native Files Campaign Ops',
        '',
        '## Campaign state',
        '- Objective: Prove native AIAGENT files still become retained SaaS operations',
        '- Audience: SaaS operators who distrust one-off agent output',
        '- Status: waiting approval',
        '',
        '## Publisher queue',
        '- publisher: Keep the native files handoff draft staged for approval.',
        '',
        '## Connector readiness',
        '- Analytics: blocked until app context evidence is attached.',
        '',
        '## Planned action queue',
        '- campaign owner: Confirm native files import before the next CAIt run.',
        '',
        '## Measurement loop',
        '- 24h native files import check',
        '',
        '## Next action owner',
        '- Campaign Ops Owner: route the restored packet back to CAIt.'
      ].join('\n')
    }]
  });
  await page.waitForSelector('#campaignList');
  await page.waitForFunction(() => document.querySelector('#campaignList')?.textContent?.includes('Native Files Campaign Ops'));
  if (!(await page.textContent('#campaignDetail')).includes('native files handoff draft')) throw new Error('campaign native files array was not imported as Publisher queue');
  if (!(await page.textContent('#campaignDetail')).includes('Analytics')) throw new Error('campaign native files connector readiness was not imported');
  if (!(await page.textContent('#actionQueueTable')).includes('Confirm native files import')) throw new Error('campaign native files planned action was not imported');
  const nativeFilesCampaignPacket = JSON.parse(await page.textContent('#campaignContextPreview'));
  if (!JSON.stringify(nativeFilesCampaignPacket.raw_context?.received_context || {}).includes('delivery_files')) throw new Error('campaign native files source was not normalized into server raw_context');
  if (!JSON.stringify(nativeFilesCampaignPacket.artifacts || []).includes('native files handoff draft')) throw new Error('campaign native files Publisher queue was not returned for app contract reuse');

  const genericTransferCampaignContext = appContextFromTransferPayload('campaign-operations', {
    transfer_id: 'transfer-campaign-generic',
    title: 'Generic transfer campaign handoff',
    summary: 'Generic app handoff should preserve delivery artifacts as reusable app context files.',
    delivery: {
      summary: 'Campaign Operations Agent returned a transfer delivery artifact.',
      artifacts: [{
        name: 'generic-transfer-campaign-ops.md',
        artifactType: 'campaign_operations_plan',
        artifactTypes: ['campaign_operations_plan'],
        contentType: 'campaign_operations_plan',
        contentPreview: [
          '# Generic Transfer Campaign Ops',
          '',
          '## Campaign state',
          '- Objective: Keep generic app handoff files available as retained campaign operations',
          '- Audience: Operators who need stable SaaS state after AIAGENT output',
          '- Status: waiting approval',
          '',
          '## Publisher queue',
          '- publisher: Stage generic transfer copy before approval.',
          '',
          '## Connector readiness',
          '- Analytics: pending retained evidence.',
          '',
          '## Planned action queue',
          '- campaign owner: Confirm generic transfer import before the next CAIt run.',
          '',
          '## Measurement loop',
          '- 24h generic transfer import check',
          '',
          '## Next action owner',
          '- Campaign Ops Owner: route the generic transfer packet back to CAIt.'
        ].join('\n')
      }]
    }
  }, {
    manifestById: () => ({
      id: 'campaign-operations',
      name: 'Campaign Operations',
      inputContract: { schemaVersion: 'cait-app-context/v1', accepts: ['campaign_operations_plan', 'delivery_files'] }
    })
  });
  if (!JSON.stringify(genericTransferCampaignContext.delivery_files || []).includes('generic-transfer-campaign-ops.md')) throw new Error('generic transfer context did not promote delivery artifacts to delivery_files');
  if (!JSON.stringify(genericTransferCampaignContext.artifacts || []).includes('campaign_operations_plan')) throw new Error('generic transfer context did not preserve delivery artifact type in artifacts');
  await openAppWithContext(page, '/campaign-operations.html', genericTransferCampaignContext);
  await page.waitForSelector('#campaignList');
  await page.waitForFunction(() => document.querySelector('#campaignList')?.textContent?.includes('Generic Transfer Campaign Ops'));
  if (!(await page.textContent('#campaignDetail')).includes('generic transfer copy')) throw new Error('campaign generic transfer delivery artifact was not imported as Publisher queue');
  if (!(await page.textContent('#actionQueueTable')).includes('Confirm generic transfer import')) throw new Error('campaign generic transfer delivery artifact was not imported as planned action');
  const genericTransferCampaignPacket = JSON.parse(await page.textContent('#campaignContextPreview'));
  if (!JSON.stringify(genericTransferCampaignPacket.raw_context?.received_context || {}).includes('generic-transfer-campaign-ops.md')) throw new Error('campaign generic transfer source file was not preserved in server raw_context');
  if (!JSON.stringify(genericTransferCampaignPacket.artifacts || []).includes('generic transfer copy')) throw new Error('campaign generic transfer Publisher queue was not returned for app contract reuse');

  const xClientFallbackContext = appContextFromTransferPayload('x-client-ops', {
    transfer_id: 'transfer-x-client-fallback',
    title: 'X Client Ops fallback handoff',
    text: 'CAIt keeps final social actions stable by handing approved copy to a SaaS queue before posting.',
    source: 'x-post-delivery.md',
    strategy: 'Audience: skeptical operators. Goal: prove app-backed approval and retention before X posting.',
    source_agent: { name: 'X Ops Connector Agent', taskType: 'x_post', status: 'completed' },
    agents: [{ name: 'CMO Leader', taskType: 'cmo_leader', status: 'completed' }],
    settings: {
      brandName: 'CAIt',
      targetClient: 'SaaS operators',
      defaultCta: 'Review the retained approval packet',
      destinationLink: 'https://aiagent-marketplace.net/apps.html',
      outputLanguage: 'en'
    },
    delivery: {
      summary: 'Prepared X post and strategy context for external app handoff.',
      artifacts: [{
        name: 'x-post-delivery.md',
        artifactType: 'x_post_packet',
        artifactTypes: ['x_post_packet', 'post_text'],
        contentPreview: 'Final post text and approval context.'
      }]
    },
    action: {
      kind: 'x_post_handoff',
      text: 'CAIt keeps final social actions stable by handing approved copy to a SaaS queue before posting.',
      source: 'x-post-delivery.md',
      requiresApproval: true
    }
  }, {
    manifestById: () => ({
      id: 'x-client-ops',
      name: 'X Client Ops',
      inputContract: {
        schemaVersion: 'cait-app-agent-transfer/v1',
        accepts: ['post_text', 'strategy', 'agent_context', 'delivery_summary', 'settings']
      }
    })
  });
  const xArtifactsJson = JSON.stringify(xClientFallbackContext.artifacts || []);
  if (!xArtifactsJson.includes('"artifact_type":"post_text"')) throw new Error('X Client Ops fallback context did not preserve post_text artifact');
  if (!xArtifactsJson.includes('"artifact_type":"strategy"')) throw new Error('X Client Ops fallback context did not preserve strategy artifact');
  if (!xArtifactsJson.includes('"artifact_type":"settings"')) throw new Error('X Client Ops fallback context did not preserve settings artifact');
  if (!xArtifactsJson.includes('"artifact_type":"delivery_summary"')) throw new Error('X Client Ops fallback context did not preserve delivery_summary artifact type');
  if (xClientFallbackContext.raw_context?.post_text !== 'CAIt keeps final social actions stable by handing approved copy to a SaaS queue before posting.') throw new Error('X Client Ops fallback raw_context did not preserve exact post text');
  if (!String(xClientFallbackContext.raw_context?.strategy || '').includes('skeptical operators')) throw new Error('X Client Ops fallback raw_context did not preserve strategy');
  if (xClientFallbackContext.raw_context?.settings?.brandName !== 'CAIt') throw new Error('X Client Ops fallback raw_context did not preserve settings');

  await openAppWithContext(page, '/lead-ops.html', {
    schema: 'cait-app-context/v1',
    source_app: 'qa_list_creator',
    source_app_label: 'QA List Creator',
    title: 'Imported Markdown lead packet',
    artifacts: [
      {
        type: 'file',
        name: 'list-creator-delivery.md',
        content: [
          '# List Creator delivery',
          '',
          '## Reviewable lead rows',
          '| # | company_name | website | why_fit | observed_signal | target_role_hypothesis | public_email_or_contact_path | contact_source_url | company_specific_angle | review_note |',
          '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
          '| 1 | Markdown Lead Co | https://markdown-lead.example | Uses public AI agent workflows | Public docs mention workflow automation | Growth owner | contact@markdown-lead.example | https://markdown-lead.example/contact | Reference workflow reliability | Review before outreach |'
        ].join('\n')
      }
    ]
  });
  await page.waitForSelector('#leadTable');
  if (!(await page.textContent('#leadTable')).includes('Markdown Lead Co')) throw new Error('Markdown lead table was not rendered');
  if (!(await page.inputValue('#leadContactInput')).includes('contact@markdown-lead.example')) throw new Error('Markdown lead contact was not imported');

  await openAppWithContext(page, `/delivery-manager.html?chat_return_to=${encodeURIComponent('/chat?thread=delivery')}&chat_handoff_id=delivery-handoff`, {
    schema: 'cait-app-context/v1',
    source_app: 'qa_delivery',
    source_app_label: 'QA Delivery',
    title: 'Imported delivery packet',
    summary: 'Imported delivery summary',
    delivery_files: [{ name: 'imported-delivery.md', type: 'markdown', content: '# Imported delivery' }],
    deliveryPackage: {
      summary: 'Package-shaped AIAGENT delivery summary',
      files: [{
        name: 'package-shaped-delivery.md',
        content_type: 'markdown',
        content: '# Package-shaped delivery\n\nRecovered from top-level deliveryPackage.'
      }]
    },
    raw_context: {
      delivery: {
        artifacts: [{
          name: 'generic-transfer-delivery.md',
          contentType: 'markdown',
          contentPreview: '# Generic transfer delivery\n\nRecovered from contentPreview.'
        }]
      }
    }
  });
  await page.waitForSelector('#deliveryList');
  if (!(await page.textContent('#deliveryList')).includes('Imported delivery packet')) throw new Error('delivery context was not rendered');
  if (!(await page.textContent('#fileTable')).includes('imported-delivery.md')) throw new Error('delivery file was not rendered');
  if (!(await page.textContent('#fileTable')).includes('package-shaped-delivery.md')) throw new Error('deliveryPackage file was not rendered');
  if (!(await page.textContent('#fileTable')).includes('generic-transfer-delivery.md')) throw new Error('delivery raw transfer artifact was not recovered');
  await page.waitForFunction(() => document.querySelector('#deliveryHandoffNotice')?.textContent?.includes('Stable delivery handoff loaded'));
  if (!(await page.textContent('#deliveryHandoffAuditPill')).includes('6 / 6 anchors')) throw new Error('delivery handoff audit did not mark all anchors present');
  const deliveryPacket = JSON.parse(await page.textContent('#deliveryContextPreview'));
  if (deliveryPacket.raw_context?.chat_handoff_id !== 'delivery-handoff') throw new Error('delivery chat handoff id was not preserved in packet');
  if (deliveryPacket.raw_context?.chat_return_to !== '/chat?thread=delivery') throw new Error('delivery chat return path was not preserved in packet');
  if (!JSON.stringify(deliveryPacket.artifacts || []).includes('handoff_audit')) throw new Error('delivery packet did not return handoff_audit for app contract debugging');
  if (!JSON.stringify(deliveryPacket.delivery_files || []).includes('Recovered from contentPreview')) throw new Error('delivery packet did not return recovered contentPreview file');
  if (!JSON.stringify(deliveryPacket.delivery_files || []).includes('Recovered from top-level deliveryPackage')) throw new Error('delivery packet did not return deliveryPackage files for reuse');
  if (!JSON.stringify(deliveryPacket.raw_context?.received_context || {}).includes('delivery_package')) throw new Error('deliveryPackage source was not preserved in server raw_context');

  await browser.close();
  console.log('app context handoff browser qa passed');
} finally {
  if (browser) await browser.close().catch(() => {});
  server.kill('SIGTERM');
}
