import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from '@playwright/test';

const port = Number(process.env.APP_CONTEXT_QA_PORT || 4335);
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

  await openAppWithContext(page, '/delivery-manager.html', {
    schema: 'cait-app-context/v1',
    source_app: 'qa_delivery',
    source_app_label: 'QA Delivery',
    title: 'Imported delivery packet',
    summary: 'Imported delivery summary',
    delivery_files: [{ name: 'imported-delivery.md', type: 'markdown', content: '# Imported delivery' }]
  });
  await page.waitForSelector('#deliveryList');
  if (!(await page.textContent('#deliveryList')).includes('Imported delivery packet')) throw new Error('delivery context was not rendered');
  if (!(await page.textContent('#fileTable')).includes('imported-delivery.md')) throw new Error('delivery file was not rendered');

  await browser.close();
  console.log('app context handoff browser qa passed');
} finally {
  if (browser) await browser.close().catch(() => {});
  server.kill('SIGTERM');
}
