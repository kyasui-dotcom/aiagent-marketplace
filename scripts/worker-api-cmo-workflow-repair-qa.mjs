import assert from 'node:assert/strict';

export async function runWorkerApiCmoWorkflowRepairQa(options = {}) {
  const qaStorage = options.qaStorage;
  const request = options.request;
  const qaSearchEnv = options.qaSearchEnv;
  const nowIso = options.nowIso;
  if (!qaStorage || typeof qaStorage.mutate !== 'function') throw new Error('qaStorage is required.');
  if (typeof request !== 'function') throw new Error('request helper is required.');
  if (typeof nowIso !== 'function') throw new Error('nowIso helper is required.');

  const authorityRetryParentId = 'qa-authority-retry-parent';
  const authorityRetryChildId = 'qa-authority-retry-child';
  await qaStorage.mutate(async (draft) => {
    const at = nowIso();
    draft.jobs.unshift(
      {
        id: authorityRetryParentId,
        jobKind: 'workflow',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        prompt: 'approval waiting retry sweep qa',
        input: {},
        priority: 'normal',
        status: 'running',
        createdAt: at,
        failureCategory: null,
        failureReason: null,
        dispatch: { completionStatus: 'accepted', retryable: false, nextRetryAt: null },
        workflow: {
          strategy: 'multi_agent',
          plannedTasks: ['cmo_leader', 'research'],
          childRuns: []
        },
        output: {
          summary: 'Approval required before retrying research.',
          report: {
            summary: 'Approval required before retrying research.',
            authority_request: {
              reason: 'Google analytics context must be approved before retrying source collection.',
              missing_connectors: ['google'],
              missing_connector_capabilities: ['google.read_ga4'],
              required_google_sources: ['ga4'],
              source: 'agent_delivery'
            }
          },
          files: []
        },
        logs: ['approval retry qa parent']
      },
      {
        id: authorityRetryChildId,
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'research',
        workflowTask: 'research',
        workflowAgentName: 'Research Agent',
        prompt: 'retryable failed child should pause while parent waits for approval',
        input: {},
        priority: 'normal',
        status: 'failed',
        assignedAgentId: 'agent_research_01',
        createdAt: at,
        failedAt: at,
        workflowParentId: authorityRetryParentId,
        failureCategory: 'dispatch_timeout',
        failureReason: 'Run exceeded timeout window',
        dispatch: { completionStatus: 'failed', retryable: true, nextRetryAt: new Date(Date.now() - 1000).toISOString(), attempts: 1, maxRetries: 3 },
        logs: ['approval retry qa child']
      }
    );
  });
  const authorityRetrySweep = await request('/api/dev/timeout-sweep', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ retry_limit: 3 })
  }, { env: qaSearchEnv });
  assert.equal(authorityRetrySweep.status, 200);
  assert.equal(
    authorityRetrySweep.body.retry.restart_required_job_ids.includes(authorityRetryChildId),
    false,
    'retry sweep must not convert approval-waiting workflow children into full-order retry requirements'
  );
  const authorityRetryState = await qaStorage.getState();
  const authorityRetryChild = authorityRetryState.jobs.find((job) => job.id === authorityRetryChildId);
  const authorityRetryParent = authorityRetryState.jobs.find((job) => job.id === authorityRetryParentId);
  assert.equal(authorityRetryChild?.dispatch?.completionStatus, 'approval_waiting_retry_paused', 'retryable terminal child should pause while parent waits for approval');
  assert.equal(authorityRetryChild?.dispatch?.retryable, false, 'paused approval retry should not remain retryable');
  assert.equal(authorityRetryParent?.status, 'blocked', 'approval-waiting parent should remain blocked instead of failing during retry sweep');

  const staleWorkflowParentId = 'qa-stale-workflow-parent';
  const staleWorkflowChildId = 'qa-stale-workflow-child';
  await qaStorage.mutate(async (draft) => {
    const at = nowIso();
    draft.jobs.unshift(
      {
        id: staleWorkflowParentId,
        jobKind: 'workflow',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        prompt: 'stale planned workflow qa',
        input: {},
        priority: 'normal',
        status: 'running',
        createdAt: at,
        logs: ['stale planned workflow qa parent'],
        workflow: {
          strategy: 'multi_agent',
          plannedTasks: ['cmo_leader', 'teardown', 'seo_specialist'],
          childJobIds: [staleWorkflowChildId, 'missing-stale-child'],
          childRuns: [
            { id: staleWorkflowChildId, taskType: 'cmo_leader', agentId: 'agent_cmo_leader_01', status: 'completed' },
            { id: 'missing-stale-child', taskType: 'seo_specialist', agentId: 'agent_seospecialist_01', status: 'running' }
          ],
          statusCounts: { total: 2, completed: 1, running: 1, queued: 0, failed: 0 }
        }
      },
      {
        id: staleWorkflowChildId,
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        prompt: 'completed real child',
        input: {},
        priority: 'normal',
        status: 'completed',
        assignedAgentId: 'agent_cmo_leader_01',
        createdAt: at,
        completedAt: at,
        workflowParentId: staleWorkflowParentId,
        output: { report: { summary: 'real child completed' }, files: [] },
        logs: ['stale planned workflow qa child']
      }
    );
  });
  const staleWorkflowAfter = await request(`/api/jobs/${staleWorkflowParentId}`);
  assert.equal(staleWorkflowAfter.status, 200);
  assert.equal(staleWorkflowAfter.body.job.status, 'completed', 'workflow parent should not wait forever on stale planned childRuns without persisted child jobs');
  assert.equal(staleWorkflowAfter.body.job.workflow.statusCounts.total, 1, 'workflow total should reflect persisted child jobs');
  assert.equal(staleWorkflowAfter.body.job.workflow.statusCounts.planned, 2, 'workflow should preserve prior planned count for diagnostics');

  const missingCheckpointParentId = 'qa-missing-checkpoint-parent';
  await qaStorage.mutate(async (draft) => {
    const at = nowIso();
    draft.jobs.unshift(
      {
        id: missingCheckpointParentId,
        jobKind: 'workflow',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        prompt: 'missing checkpoint workflow qa',
        input: {},
        priority: 'normal',
        status: 'running',
        createdAt: at,
        logs: ['missing checkpoint workflow qa parent'],
        workflow: {
          strategy: 'multi_agent',
          plannedTasks: ['cmo_leader', 'research', 'growth'],
          childJobIds: ['qa-missing-checkpoint-leader', 'qa-missing-checkpoint-research'],
          childRuns: [
            { id: 'qa-missing-checkpoint-leader', taskType: 'cmo_leader', agentId: 'agent_cmo_leader_01', status: 'completed' },
            { id: 'qa-missing-checkpoint', taskType: 'cmo_leader', agentId: 'agent_cmo_leader_01', sequencePhase: 'checkpoint', status: 'blocked' },
            { id: 'qa-missing-checkpoint-research', taskType: 'research', agentId: 'agent_research_01', status: 'completed' }
          ],
          leaderSequence: {
            enabled: true,
            status: 'pending',
            checkpointJobId: 'qa-missing-checkpoint',
            checkpointLayer: 1,
            requiredBeforeLayer: 2,
            checkpoints: [
              { jobId: 'qa-missing-checkpoint', afterLayer: 1, beforeLayer: 2, status: 'pending' }
            ],
            finalSummaryJobId: 'qa-missing-final-summary',
            finalSummaryStatus: 'pending'
          },
          statusCounts: { total: 3, completed: 2, running: 0, queued: 0, failed: 0, blocked: 1 }
        }
      },
      {
        id: 'qa-missing-checkpoint-leader',
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        prompt: 'completed leader child',
        input: { _broker: { workflow: { sequencePhase: 'initial' } } },
        priority: 'normal',
        status: 'completed',
        assignedAgentId: 'agent_cmo_leader_01',
        createdAt: at,
        completedAt: at,
        workflowParentId: missingCheckpointParentId,
        workflowTask: 'cmo_leader',
        output: { report: { summary: 'leader completed' }, files: [] },
        logs: ['missing checkpoint workflow qa leader child']
      },
      {
        id: 'qa-missing-checkpoint-research',
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'research',
        prompt: 'completed research child',
        input: { _broker: { workflow: { sequencePhase: 'research' } } },
        priority: 'normal',
        status: 'completed',
        assignedAgentId: 'agent_research_01',
        createdAt: at,
        completedAt: at,
        workflowParentId: missingCheckpointParentId,
        workflowTask: 'research',
        output: { report: { summary: 'research completed' }, files: [] },
        logs: ['missing checkpoint workflow qa research child']
      }
    );
  });
  const missingCheckpointAfter = await request(`/api/jobs/${missingCheckpointParentId}`);
  assert.equal(missingCheckpointAfter.status, 200);
  assert.notEqual(
    missingCheckpointAfter.body.job.failureCategory,
    'workflow_orchestration_incomplete',
    'workflow parent should repair missing leader checkpoint rows instead of becoming unrecoverable'
  );
  const missingCheckpointRepairedState = await qaStorage.getState();
  const missingCheckpointRepairedChildren = missingCheckpointRepairedState.jobs.filter((job) => job.workflowParentId === missingCheckpointParentId);
  assert.ok(
    missingCheckpointRepairedChildren.some((job) => job.id === 'qa-missing-checkpoint' && job.input?._broker?.workflow?.sequencePhase === 'checkpoint'),
    'missing checkpoint child row should be restored'
  );
  assert.ok(
    missingCheckpointRepairedChildren.some((job) => job.id === 'qa-missing-final-summary' && job.input?._broker?.workflow?.sequencePhase === 'final_summary'),
    'missing final summary child row should be restored'
  );
  assert.deepEqual(
    (missingCheckpointAfter.body.job.workflow.leaderSequence.repairedMissingChildJobIds || []).sort(),
    ['qa-missing-checkpoint', 'qa-missing-final-summary'].sort()
  );

  const queuedBlockedFinalParentId = 'qa-queued-blocked-final-parent';
  const queuedBlockedFinalId = 'qa-queued-blocked-final-summary';
  await qaStorage.mutate(async (draft) => {
    const at = nowIso();
    draft.jobs.unshift(
      {
        id: queuedBlockedFinalParentId,
        jobKind: 'workflow',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        prompt: 'queued final summary child persisted as blocked should be repaired',
        input: {},
        priority: 'normal',
        status: 'running',
        createdAt: at,
        failureReason: 'Workflow is blocked before final leader summary can complete.',
        workflow: {
          strategy: 'multi_agent',
          plannedTasks: ['cmo_leader', 'research'],
          childJobIds: ['qa-queued-blocked-final-leader', 'qa-queued-blocked-final-research', queuedBlockedFinalId],
          childRuns: [
            { id: 'qa-queued-blocked-final-leader', taskType: 'cmo_leader', agentId: 'agent_cmo_leader_01', sequencePhase: 'initial', status: 'completed' },
            { id: 'qa-queued-blocked-final-research', taskType: 'research', agentId: 'agent_research_01', sequencePhase: 'research', status: 'completed' },
            { id: queuedBlockedFinalId, taskType: 'cmo_leader', agentId: 'agent_cmo_leader_01', sequencePhase: 'final_summary', status: 'blocked' }
          ],
          leaderSequence: {
            enabled: true,
            status: 'completed',
            checkpoints: [],
            finalSummaryJobId: queuedBlockedFinalId,
            finalSummaryStatus: 'queued',
            finalSummaryQueuedAt: at
          },
          statusCounts: { total: 3, completed: 2, running: 1, queued: 0, failed: 0, blocked: 1 }
        },
        logs: ['queued blocked final summary qa parent']
      },
      {
        id: 'qa-queued-blocked-final-leader',
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        workflowTask: 'cmo_leader',
        workflowAgentName: 'CMO Team Leader',
        prompt: 'completed leader child',
        input: { _broker: { workflow: { sequencePhase: 'initial' } } },
        priority: 'normal',
        status: 'completed',
        assignedAgentId: 'agent_cmo_leader_01',
        createdAt: at,
        completedAt: at,
        workflowParentId: queuedBlockedFinalParentId,
        output: { summary: 'leader completed', report: { summary: 'leader completed', bullets: ['run research'], nextAction: 'summarize' }, files: [] },
        logs: []
      },
      {
        id: 'qa-queued-blocked-final-research',
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'research',
        workflowTask: 'research',
        workflowAgentName: 'Research Agent',
        prompt: 'completed source-backed research child',
        input: { _broker: { workflow: { sequencePhase: 'research', forceWebSearch: true } } },
        priority: 'normal',
        status: 'completed',
        assignedAgentId: 'agent_research_01',
        createdAt: at,
        completedAt: at,
        workflowParentId: queuedBlockedFinalParentId,
        output: {
          summary: 'qa research completed for final summary repair',
          report: { summary: 'qa research completed', web_sources: [{ title: 'CAIt', url: 'https://aiagent-marketplace.net/' }] },
          files: [{ name: 'research-delivery.md', content: '# Research\n\nSource: https://aiagent-marketplace.net/' }]
        },
        logs: []
      },
      {
        id: queuedBlockedFinalId,
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        workflowTask: 'cmo_leader',
        workflowAgentName: 'CMO Team Leader',
        prompt: 'final leader summary blocked row',
        input: { _broker: { workflow: { sequencePhase: 'final_summary' } } },
        priority: 'normal',
        status: 'blocked',
        assignedAgentId: 'agent_cmo_leader_01',
        createdAt: at,
        workflowParentId: queuedBlockedFinalParentId,
        dispatch: { completionStatus: 'leader_final_summary_blocked', retryable: true },
        logs: ['leader final summary queued after specialist completion from qa-queued-blocked-final-leader']
      }
    );
  });
  const queuedBlockedFinalWaits = [];
  const queuedBlockedFinalPoll = await request(`/api/jobs/${queuedBlockedFinalParentId}`, {}, { waitUntilPromises: queuedBlockedFinalWaits });
  assert.equal(queuedBlockedFinalPoll.status, 200);
  await Promise.allSettled(queuedBlockedFinalWaits);
  const queuedBlockedFinalAfter = await request(`/api/jobs/${queuedBlockedFinalParentId}`);
  assert.equal(queuedBlockedFinalAfter.status, 200);
  const queuedBlockedFinalRun = queuedBlockedFinalAfter.body.job.workflow.childRuns.find((run) => run.id === queuedBlockedFinalId);
  assert.equal(queuedBlockedFinalRun?.status, 'completed', 'queued final summary persisted as blocked should be repaired and dispatched');
  assert.equal(queuedBlockedFinalAfter.body.job.status, 'completed', 'workflow parent should complete after repaired final summary dispatch');
}
