import assert from 'node:assert/strict';
import { buildAgentTeamDeliveryOutput, nowIso } from '../lib/shared.js';

export function runWorkerApiAgentTeamOutputQa() {
  const checkpointOnlyAgentTeamOutput = buildAgentTeamDeliveryOutput({
    workflow: {
      objective: 'Checkpoint-only QA',
      leaderSequence: {
        enabled: true,
        checkpointJobId: 'leader-checkpoint',
        finalSummaryJobId: 'leader-final-pending',
        finalSummaryStatus: 'pending'
      }
    },
    prompt: 'Checkpoint-only QA'
  }, [
    {
      id: 'leader-checkpoint',
      taskType: 'cmo_leader',
      workflowTask: 'cmo_leader',
      workflowAgentName: 'CMO Team Leader',
      status: 'completed',
      createdAt: nowIso(),
      completedAt: nowIso(),
      input: { _broker: { workflow: { sequencePhase: 'checkpoint' } } },
      output: {
        summary: 'Checkpoint summary is not final',
        report: { summary: 'Checkpoint summary is not final', bullets: ['release action layer'], nextAction: 'Run execution layer.' },
        files: [{ name: 'checkpoint.md', type: 'text/markdown', content: '# checkpoint\n\nThis is not final.' }]
      }
    }
  ]);
  assert.notEqual(checkpointOnlyAgentTeamOutput.summary, 'Checkpoint summary is not final', 'checkpoint leader output should not be promoted as the parent final delivery');
  assert.notEqual(checkpointOnlyAgentTeamOutput.report?.leaderPhase, 'checkpoint', 'parent output should wait for final_summary before exposing a leader-phase final delivery');

  const syntheticAgentTeamOutput = buildAgentTeamDeliveryOutput({
    workflow: { objective: 'Launch synthetic QA' },
    prompt: 'Launch synthetic QA'
  }, [
    {
      id: 'leader-checkpoint-before-final',
      taskType: 'cmo_leader',
      workflowTask: 'cmo_leader',
      workflowAgentName: 'CMO Team Leader',
      status: 'completed',
      createdAt: nowIso(),
      completedAt: nowIso(),
      input: { _broker: { workflow: { sequencePhase: 'checkpoint' } } },
      output: {
        summary: 'Intermediate checkpoint summary',
        report: {
          summary: 'Intermediate checkpoint summary',
          bullets: ['not the final delivery'],
          nextAction: 'Continue to preparation.'
        },
        files: [
          {
            name: 'leader-checkpoint.md',
            type: 'text/markdown',
            content: '# Leader checkpoint\n\nThis intermediate checkpoint should not be shown as a final delivery file.'
          }
        ]
      }
    },
    {
      id: 'leader-final',
      taskType: 'cmo_leader',
      workflowTask: 'cmo_leader',
      workflowAgentName: 'CMO Team Leader',
      status: 'completed',
      createdAt: nowIso(),
      completedAt: nowIso(),
      input: { _broker: { workflow: { sequencePhase: 'final_summary' } } },
      output: {
        summary: 'Leader final summary',
        report: {
          summary: 'Leader final summary',
          bullets: ['lane chosen'],
          nextAction: 'Execute the first packet.'
        },
        files: [
          {
            name: 'leader-summary.md',
            type: 'text/markdown',
            content: '# Leader summary\n\nExecute the approved lane.'
          }
        ]
      }
    },
    {
      id: 'data-specialist',
      taskType: 'data_analysis',
      workflowTask: 'data_analysis',
      workflowAgentName: 'Data Analysis Agent',
      status: 'completed',
      createdAt: nowIso(),
      completedAt: nowIso(),
      input: { _broker: { workflow: { sequencePhase: 'data' } } },
      output: {
        summary: 'Prepared analytics memo',
        report: {
          summary: 'Prepared analytics memo',
          bullets: ['same baseline repeated'],
          nextAction: 'Use the final leader summary.'
        },
        files: [
          {
            name: 'data-analysis-delivery.md',
            type: 'text/markdown',
            content: '# Analytics memo\n\n554 sessions and 0 conversions. This supporting memo should not be duplicated in the final delivery bundle.'
          }
        ]
      }
    },
    {
      id: 'x-specialist',
      taskType: 'x_post',
      workflowTask: 'x_post',
      workflowAgentName: 'X Connector Agent',
      status: 'completed',
      createdAt: nowIso(),
      completedAt: nowIso(),
      input: { _broker: { workflow: { sequencePhase: 'action' } } },
      output: {
        summary: 'Prepared X packet',
        report: {
          summary: 'Prepared X packet',
          bullets: ['exact post ready'],
          nextAction: 'Approve and publish.',
          authority_request: {
            reason: 'Connect X before publishing.',
            missing_connectors: ['x'],
            missing_connector_capabilities: ['x.post'],
            required_google_sources: [],
            owner_label: 'CMO Leader',
            source: 'built_in_preflight'
          }
        },
        files: [
          {
            name: 'x-post-pack.md',
            type: 'text/markdown',
            content_type: 'x_post_packet',
            artifact_type: 'x_post_packet',
            artifact_types: ['x_post_packet', 'x_post', 'approval_request'],
            surface: 'publisher',
            item_type: 'x_post',
            action_type: 'x_post',
            connector: 'x',
            connector_capability: 'x.post',
            content: '# X post pack\n\nPost text:\nLaunching now.'
          }
        ]
      }
    }
  ]);
  assert.ok(
    syntheticAgentTeamOutput.files?.every((file) => file.raw_agent_delivery === true),
    'agent team output should expose raw child-agent delivery files'
  );
  assert.ok(
    syntheticAgentTeamOutput.files?.every((file) => file.user_facing_delivery === true && file.userFacingDelivery === true),
    'raw child-agent delivery files should be explicitly marked as user-facing deliverables'
  );
  assert.ok(
    syntheticAgentTeamOutput.files?.some((file) => file.name === 'x-post-pack.md' && file.source_task_type === 'x_post'),
    'explicit approval-blocked action packet should remain visible as the raw specialist file'
  );
  assert.equal(
    syntheticAgentTeamOutput.files?.some((file) => file.name === 'data-analysis-delivery.md'),
    false,
    'generic supporting specialist memos should not duplicate the final leader delivery bundle'
  );
  assert.ok(
    syntheticAgentTeamOutput.files?.every((file) => file.source_agent_name && file.source_task_type && file.source_run_id && file.display_title),
    'raw agent delivery files should carry review labels: agent name, task type, source run id, and display title'
  );
  assert.ok(
    syntheticAgentTeamOutput.files?.every((file) => !/(^|\n)#{1,6}\s*(facts_verified|assumptions_used|evidence_gaps|artifact_for_next_agent|recommended_next_owner|structured handoff digest|supporting fact index|downstream handoff(?: summary| packet)?|採用判断表|publisher下書き状態|external app ingest status)\b/i.test(String(file.content || ''))),
    'raw agent delivery markdown should not expose internal handoff headings'
  );
  assert.ok(
    syntheticAgentTeamOutput.report?.delivery_provenance_map?.some((item) => item.file === 'x-post-pack.md' && item.agentName === 'X Connector Agent' && item.taskType === 'x_post'),
    'parent report should expose agent-to-file provenance without creating leader-owned evaluation metadata'
  );
  assert.equal(
    syntheticAgentTeamOutput.report?.delivery_file_map,
    undefined,
    'orchestration must not expose provenance as delivery_file_map because that reads like leader-owned evaluation metadata'
  );
  assert.ok(
    syntheticAgentTeamOutput.files?.some((file) => file.name === 'leader-summary.md' && String(file.content || '').includes('Leader summary')),
    'agent team output should still include the final leader summary file'
  );
  assert.equal(syntheticAgentTeamOutput.report?.authority_request?.missing_connectors?.[0], 'x', 'agent team output should preserve specialist authority requests for execution gating');
  assert.equal(syntheticAgentTeamOutput.report?.completion_state, 'blocked_waiting_for_approval', 'agent team output should not present approval-blocked execution as final completion');
  assert.equal(syntheticAgentTeamOutput.summary, 'Leader final summary', 'leader-authored summary should remain the default integrated summary when available');
  assert.equal(syntheticAgentTeamOutput.report?.execution_candidate?.source_task_type, 'cmo_leader', 'final leader delivery should remain the selected execution candidate instead of a child action packet');
  assert.equal(syntheticAgentTeamOutput.report?.childRuns?.length, 4, 'integrated output should keep supporting work product summaries attached to the merged report');
  assert.equal(
    syntheticAgentTeamOutput.report?.specialist_output_ledger?.length,
    4,
    'integrated output should expose a work-product ledger for every visible child run'
  );
  assert.ok(
    syntheticAgentTeamOutput.report?.specialist_output_ledger?.some((item) => item.runId === 'data-specialist' && item.artifactState === 'available_in_child_run' && item.returnedFiles?.includes('data-analysis-delivery.md')),
    'supporting specialist files omitted from the final bundle should remain reviewable in the work-product ledger'
  );
  assert.ok(
    syntheticAgentTeamOutput.report?.specialist_output_ledger?.some((item) => item.runId === 'x-specialist' && item.hasAttachedDeliveryArtifact === true && item.attachedDeliveryFiles?.includes('x-post-pack.md')),
    'explicit app-review packets should be marked as attached delivery artifacts in the work-product ledger'
  );
  assert.ok(
    syntheticAgentTeamOutput.report?.bullets?.some((item) => String(item || '').includes('要点') && String(item || '').includes('Prepared X packet')),
    'parent report bullets should summarize the actual content produced by each specialist'
  );
  assert.ok(
    syntheticAgentTeamOutput.files?.some((file) => String(file.content || '').includes('Launching now')),
    'raw specialist delivery file should preserve the concrete execution artifact body'
  );
  assert.ok(
    !/Agent:\s+|Task:\s+/i.test(String(syntheticAgentTeamOutput.report?.final_delivery_digest || '')),
    'leader digest should stay user-facing and keep agent/task provenance out of markdown'
  );
  const objectContentAgentTeamOutput = buildAgentTeamDeliveryOutput({
    workflow: { objective: 'Object content serialization QA' },
    prompt: 'Object content serialization QA'
  }, [
    {
      id: 'object-content-child',
      taskType: 'writing',
      workflowTask: 'writing',
      workflowAgentName: 'Writer Agent',
      status: 'completed',
      createdAt: nowIso(),
      completedAt: nowIso(),
      input: { _broker: { workflow: { sequencePhase: 'preparation' } } },
      output: {
        summary: 'Writer completed a concrete delivery.',
        report: {
          summary: 'Writer completed a concrete delivery.',
          bullets: ['Concrete Japanese copy was returned.'],
          nextAction: 'Review the copy.'
        },
        files: [
          {
            name: 'writer-delivery.md',
            type: 'text/markdown',
            content: {
              markdown: '# Writer delivery\n\nCAItの品質チェックに使える具体的な紹介文です。\n\n## 次のアクション\nこの文面をレビューしてください。'
            }
          }
        ]
      }
    }
  ]);
  assert.ok(
    objectContentAgentTeamOutput.files?.some((file) => file.name === 'writer-delivery.md' && String(file.content || '').includes('CAItの品質チェック')),
    'object-shaped delivery file content should be normalized into markdown text'
  );
  assert.ok(
    !JSON.stringify(objectContentAgentTeamOutput).includes('[object Object]'),
    'agent team delivery output must not serialize object-shaped file content as [object Object]'
  );
  const internalHeadingAgentTeamOutput = buildAgentTeamDeliveryOutput({
    workflow: { objective: 'Internal heading sanitization QA' },
    prompt: 'Internal heading sanitization QA'
  }, [
    {
      id: 'internal-heading-child',
      taskType: 'research',
      workflowTask: 'research',
      workflowAgentName: 'Research Agent',
      status: 'completed',
      createdAt: nowIso(),
      completedAt: nowIso(),
      input: { _broker: { workflow: { sequencePhase: 'research' } } },
      output: {
        summary: 'Research completed.',
        report: { summary: 'Research completed.' },
        files: [
          {
            name: 'research-delivery.md',
            type: 'text/markdown',
            content: '# Research delivery\n\n## facts_verified\n- Search Console was not supplied.\n\n## assumptions_used\n- The recommendation assumes no paid media budget.\n\n## evidence_gaps\n- Current query data is missing.\n\n## 採用判断表\n| data_analysis | adopted |\n| --- | --- |\n\n## Next steps\n- Supply Search Console export.'
          }
        ]
      }
    }
  ]);
  const internalHeadingContent = String(internalHeadingAgentTeamOutput.files?.[0]?.content || '');
  assert.match(internalHeadingContent, /## 確認できたこと[\s\S]*Search Console was not supplied/, 'raw delivery sanitizer should rewrite useful snake_case evidence headings into user-facing headings');
  assert.match(internalHeadingContent, /## 前提[\s\S]*no paid media budget/, 'raw delivery sanitizer should rewrite assumptions into user-facing headings');
  assert.match(internalHeadingContent, /## 未確認事項[\s\S]*query data is missing/, 'raw delivery sanitizer should rewrite evidence gaps into user-facing headings');
  assert.doesNotMatch(internalHeadingContent, /facts_verified|assumptions_used|evidence_gaps|採用判断表|data_analysis/, 'raw delivery sanitizer should remove internal headings and agent adoption tables');
  assert.ok(
    !syntheticAgentTeamOutput.files?.some((file) => ['all-deliverables.md', 'review-ready-delivery.md', 'supporting-specialist-deliverables.md'].includes(file.name)),
    'agent team output must not expose generated delivery bundles as user-facing delivery files'
  );
  assert.equal(
    syntheticAgentTeamOutput.files?.filter((file) => file.source_task_type === 'cmo_leader').length,
    1,
    'agent team output should expose only the final leader file, not repeated checkpoint leader files'
  );

  const fallbackIntegratedFile = checkpointOnlyAgentTeamOutput.files?.find((file) => file.name === 'integrated-delivery.md');
  assert.equal(fallbackIntegratedFile, undefined, 'generated integrated status markdown should not be attached as a delivery file');
  const checkpointReviewReadyFile = checkpointOnlyAgentTeamOutput.files?.find((file) => file.name === 'review-ready-delivery.md');
  assert.equal(checkpointReviewReadyFile, undefined, 'checkpoint-only workflow output should not attach a generated review-ready delivery file');
  const checkpointAllDeliverablesFile = checkpointOnlyAgentTeamOutput.files?.find((file) => file.name === 'all-deliverables.md');
  assert.equal(checkpointAllDeliverablesFile, undefined, 'checkpoint-only workflow output should not attach generated all-deliverables bundles');
  const checkpointPartialDeliveryFile = checkpointOnlyAgentTeamOutput.files?.find((file) => file.name === 'workflow-partial-delivery.md');
  assert.equal(checkpointPartialDeliveryFile, undefined, 'checkpoint-only workflow output should not attach generated partial delivery markdown');
  assert.ok(
    checkpointOnlyAgentTeamOutput.files?.some((file) => file.name === 'checkpoint.md' && file.raw_agent_delivery === true && file.user_facing_delivery === true && String(file.content || '').includes('# checkpoint')),
    'checkpoint-only workflow output should expose the raw checkpoint leader file only'
  );

  const syntheticLeaderOnlyOutput = buildAgentTeamDeliveryOutput({
    workflow: { objective: 'Launch synthetic QA through action' },
    prompt: 'Launch synthetic QA through action'
  }, [
    {
      id: 'leader-only-final',
      taskType: 'cmo_leader',
      workflowTask: 'cmo_leader',
      workflowAgentName: 'CMO Team Leader',
      status: 'completed',
      createdAt: nowIso(),
      completedAt: nowIso(),
      input: { _broker: { workflow: { sequencePhase: 'final_summary' } } },
      output: {
        summary: 'Leader-only final summary',
        report: {
          summary: 'Leader-only final summary',
          bullets: ['execution lane chosen'],
          nextAction: 'Convert this packet into the next executable order.'
        },
        files: [
          {
            name: 'cmo-team-leader-delivery.md',
            type: 'text/markdown',
            content: '# CMO leader final\n\n## Planned action table\n| order | lane | owner | exact artifact |\n| --- | --- | --- | --- |\n| 1 | X launch | CMO leader | post-ready packet |\n\n## Next action\nConvert this packet into the next executable order.'
          }
        ]
      }
    }
  ]);
  assert.equal(syntheticLeaderOnlyOutput.files?.[0]?.raw_agent_delivery, true, 'leader-only final output should keep the raw leader file as the delivery file');
  assert.equal(syntheticLeaderOnlyOutput.files?.[0]?.user_facing_delivery, true, 'leader-only final raw delivery file should be marked user-facing');
  assert.equal(syntheticLeaderOnlyOutput.report?.execution_candidate?.type, 'report_bundle');
  assert.ok(
    !String(syntheticLeaderOnlyOutput.files?.[0]?.content || '').includes('## Delivered content summaries'),
    'raw leader delivery file must not be prefixed with generated delivered-content summaries'
  );

  const syntheticVagueLeaderApprovalOutput = buildAgentTeamDeliveryOutput({
    workflow: { objective: 'Use analytics, then choose the next action' },
    prompt: 'Use analytics, then choose the next action'
  }, [
    {
      id: 'leader-vague-approval',
      taskType: 'cmo_leader',
      workflowTask: 'cmo_leader',
      workflowAgentName: 'CMO Team Leader',
      status: 'completed',
      createdAt: nowIso(),
      completedAt: nowIso(),
      input: { _broker: { workflow: { sequencePhase: 'final_summary' } } },
      output: {
        summary: 'Need analytics context before choosing a concrete action.',
        report: {
          summary: 'Need analytics context before choosing a concrete action.',
          authority_request: {
            reason: 'Team Leader paused external execution until the exact connector/channel action is approved.',
            missing_connectors: ['google'],
            missing_connector_capabilities: ['google.read_gsc', 'google.read_ga4'],
            source: 'leader_execution_approval',
            required_channel_selection: true,
            channel_candidates: []
          }
        },
        files: [
          {
            name: 'leader-vague.md',
            type: 'text/markdown',
            content: '# Leader note\n\nGather analytics context, then choose the next concrete execution packet.'
          }
        ]
      }
    }
  ]);
  assert.equal(syntheticVagueLeaderApprovalOutput.report?.authority_request, undefined, 'vague leader-level external execution approvals without a concrete channel/action must not surface as chat approvals');
  assert.notEqual(syntheticVagueLeaderApprovalOutput.report?.completion_state, 'blocked_waiting_for_approval', 'vague leader approvals must not block the parent workflow as an approval wait');
}
