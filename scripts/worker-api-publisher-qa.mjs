import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { publisherRecordsFromContext } from '../lib/publisher-items.js';
import { nowIso } from '../lib/shared.js';

const appRoutesSource = readFileSync(new URL('../lib/routes/apps.js', import.meta.url), 'utf8');

export async function runWorkerApiPublisherQa({ request, samuraiSession }) {
  const untypedPublisherRecords = publisherRecordsFromContext({
    title: 'Untyped delivery',
    summary: 'Plain markdown mentions X, Publisher, and WordPress, but no agent-owned artifact metadata exists.',
    delivery_files: [{
      name: 'plain-delivery.md',
      type: 'markdown',
      content: '# Plain delivery\n\nPost this on X and WordPress.'
    }]
  }, { ownerLogin: 'samurai', appContextId: 'ctx-untyped', nowIso: nowIso() });
  assert.equal(
    untypedPublisherRecords.items.length,
    0,
    'Publisher item persistence must not recover missing app intent from untyped delivery body text.'
  );

  const connectorOnlyPublisherRecords = publisherRecordsFromContext({
    title: 'Connector-only delivery',
    artifacts: [{
      type: 'file',
      name: 'connector-only.md',
      connector: 'wordpress',
      channel: 'wordpress_site',
      body: 'This has destination hints but no explicit Publisher artifact contract.'
    }]
  }, { ownerLogin: 'samurai', appContextId: 'ctx-connector-only', nowIso: nowIso() });
  assert.equal(
    connectorOnlyPublisherRecords.items.length,
    0,
    'Publisher item persistence must not treat connector or destination hints as app intent without an explicit artifact contract.'
  );

  const explicitPublisherRecords = publisherRecordsFromContext({
    title: 'Explicit X packet',
    artifacts: [{
      type: 'file',
      name: 'x-post.md',
      content_type: 'x_post_packet',
      artifact_type: 'x_post_packet',
      artifact_types: ['x_post_packet'],
      channel: 'x',
      connector: 'x',
      connector_capability: 'x.post',
      title: 'Exact X post',
      body: 'Approved exact post text.'
    }]
  }, { ownerLogin: 'samurai', appContextId: 'ctx-explicit', nowIso: nowIso() });
  assert.equal(explicitPublisherRecords.items.length, 1, 'Publisher item persistence should keep explicit app-review packets.');
  assert.equal(explicitPublisherRecords.items[0].channel, 'x', 'Publisher item persistence should preserve explicit channel metadata.');

  const explicitInstagramPublisherRecords = publisherRecordsFromContext({
    title: 'Explicit Instagram packet',
    artifacts: [{
      type: 'file',
      name: 'instagram-launch.md',
      content_type: 'instagram_post_packet',
      artifact_type: 'instagram_post_packet',
      artifact_types: ['instagram_post_packet', 'instagram_post'],
      channel: 'instagram',
      connector: 'instagram',
      connector_capability: 'instagram.post',
      profile_handle: '@aiagentmarketplace',
      profile_url: 'https://instagram.com/aiagentmarketplace',
      media_assets: 'Carousel screenshots and reel b-roll are attached.',
      channel_rules: 'Use approved caption, destination URL, alt text, and no unsupported proof claims.',
      approval_checklist: 'Profile, caption, destination, assets, proof, schedule, and connector status checked.',
      title: 'Instagram launch post',
      body: 'Approved Instagram caption draft.'
    }]
  }, { ownerLogin: 'samurai', appContextId: 'ctx-instagram-explicit', nowIso: nowIso() });
  assert.equal(explicitInstagramPublisherRecords.items.length, 1, 'Publisher item persistence should keep explicit Instagram app-review packets.');
  assert.equal(explicitInstagramPublisherRecords.items[0].channel, 'instagram', 'Publisher item persistence should preserve Instagram channel metadata.');
  assert.equal(explicitInstagramPublisherRecords.items[0].payload.profile_handle, '@aiagentmarketplace', 'Publisher item persistence should preserve Instagram profile metadata.');
  assert.equal(explicitInstagramPublisherRecords.items[0].payload.media_assets, 'Carousel screenshots and reel b-roll are attached.', 'Publisher item persistence should preserve Instagram media asset metadata.');
  assert.ok(
    explicitInstagramPublisherRecords.items[0].validation.checks.some((check) => check.key === 'instagram_profile' && check.ok),
    'Publisher validation should check Instagram profile readiness.'
  );
  assert.ok(
    explicitInstagramPublisherRecords.items[0].validation.checks.some((check) => check.key === 'instagram_media' && check.ok),
    'Publisher validation should check Instagram media asset readiness.'
  );

  const publisherContextShape = await request('/api/publisher/context-ingest', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      app_id: 'publisher-approval-studio',
      context: {
        source_app: 'publisher-approval-studio',
        source_app_label: 'Publisher & Approval Studio',
        title: 'Raw writer handoff',
        summary: 'Writer produced a raw markdown handoff that needs Publisher shaping.',
        handoff_targets: ['publisher-approval-studio'],
        artifacts: [
          {
            type: 'file',
            name: 'writer-output.md',
            content: '# Raw article\n\nMeta title: Raw writer title\n\nDraft body for the owned site.'
          }
        ],
        delivery_files: [
          {
            name: 'writer-output.md',
            type: 'markdown',
            content: '# Raw article\n\nMeta title: Raw writer title\n\nDraft body for the owned site.'
          }
        ]
      }
    })
  }, { sessionCookie: samuraiSession });
  assert.equal(publisherContextShape.status, 201, 'Publisher context ingest should accept writer handoff payloads');
  assert.equal(publisherContextShape.body.app_context_shape?.ok, true, 'Publisher context ingest should run the OpenAI shaping pass before DB persistence');
  assert.ok(Array.isArray(publisherContextShape.body.publisher_items) && publisherContextShape.body.publisher_items.length >= 1, 'Publisher context ingest should persist normalized Publisher item records.');
  assert.equal(publisherContextShape.body.publisher_items?.[0]?.version, 1, 'First Publisher item persistence should create version 1.');
  assert.equal(
    publisherContextShape.body.app_context?.context?.raw_context?.publisher_context_shape_status?.ok,
    true,
    'Publisher ingest should persist the shaping status in raw_context'
  );
  assert.equal(
    publisherContextShape.body.app_context?.context?.artifacts?.[0]?.channel,
    'owned_site',
    'Publisher shaped contexts should expose Publisher-ready channel fields'
  );
  assert.equal(
    publisherContextShape.body.app_context?.context?.artifacts?.[0]?.connector_capability,
    'site_publish_packet',
    'Publisher shaped contexts should expose Publisher-ready connector capability fields'
  );
  assert.match(
    String(publisherContextShape.body.app_context?.context?.artifacts?.[0]?.body || publisherContextShape.body.app_context?.context?.artifacts?.[0]?.content || ''),
    /Draft body for the owned site\./,
    'Publisher shaping must preserve original agent artifact body text'
  );

  const publisherItems = await request('/api/publisher/items?limit=10', {}, { sessionCookie: samuraiSession });
  assert.equal(publisherItems.status, 200, 'Publisher item history should be readable by the owner.');
  assert.ok(
    (publisherItems.body.items || []).some((item) => String(item.appContextId || '') === String(publisherContextShape.body.app_context_id || '')),
    'Publisher item history should include the just-ingested app context item.'
  );
  assert.ok(
    appRoutesSource.includes('canViewAdminDashboard(current, env)'),
    'Publisher item history must use platform admin visibility, not open-write mode, for cross-owner reads.'
  );
  assert.ok(
    !appRoutesSource.includes('admin: policy.openWriteApiEnabled'),
    'App context and Publisher item list routes must not treat open-write mode as cross-owner admin visibility.'
  );
}
