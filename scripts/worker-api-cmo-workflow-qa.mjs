import assert from 'node:assert/strict';
import worker from '../worker.js';
import { createD1LikeStorage } from '../lib/storage.js';
import { runWorkerApiAgentTeamOutputQa } from './worker-api-agent-team-output-qa.mjs';
import { runWorkerApiCmoWorkflowRepairQa } from './worker-api-cmo-workflow-repair-qa.mjs';
import {
  completeAsyncWorkflowSpecialists as completeCmoWorkflowSpecialists,
  pollWorkflowWithWaits
} from './worker-api-cmo-workflow-fixtures.mjs';
import { nowIso } from '../lib/shared.js';
import { E2E_DEFAULT_ORDER_PROMPT, assertOrderScenarioQuality, buildOrderScenarioPayload } from './e2e-order-scenario.mjs';
import { env, qaSearchEnv, request, setWorkerApiQaSelfFetchEnv } from './worker-api-qa-harness.mjs';

export async function runWorkerApiCmoWorkflowQa() {
  const asyncWorkflowWaits = [];
  const asyncWorkflow = await request('/api/jobs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(buildOrderScenarioPayload({
      parentAgentId: 'qa-runner',
      clientOrderId: 'qa_worker_cmo_user_order'
    }))
  }, { waitUntilPromises: asyncWorkflowWaits, env: qaSearchEnv });
  assert.equal(asyncWorkflow.status, 201);
  assert.equal(asyncWorkflow.body.mode, 'workflow');
  assert.ok(['running', 'completed'].includes(asyncWorkflow.body.status), 'async Agent Team should start or finish the first sample child immediately');
  assert.ok(asyncWorkflowWaits.length <= 4, 'async Agent Team should enqueue bounded background dispatch waits');
  await Promise.allSettled(asyncWorkflowWaits);

  const asyncWorkflowFirstState = await request(`/api/jobs/${asyncWorkflow.body.workflow_job_id}`, {}, { env: qaSearchEnv });
  assert.equal(asyncWorkflowFirstState.status, 200);
  assert.equal(asyncWorkflowFirstState.body.job.workflow.childRuns[0].taskType, 'cmo_leader', 'CMO leader should remain first in the workflow order');
  assert.equal(asyncWorkflowFirstState.body.job.workflow.childRuns[0].status, 'completed', 'CMO leader should complete before specialists are released');
  const asyncWorkflowTaskOrder = asyncWorkflowFirstState.body.job.workflow.childRuns.map((run) => run.taskType);
  const asyncWorkflowPlannedTasks = asyncWorkflowFirstState.body.job.workflow.plannedTasks || [];
  assert.equal(
    asyncWorkflowFirstState.body.job.workflow.childRuns.length,
    asyncWorkflowFirstState.body.job.workflow.plannedChildRunCount,
    'async Agent Team must persist every planned child/checkpoint job before dispatch starts'
  );
  assert.ok(asyncWorkflowFirstState.body.job.workflow.childRuns.length >= 11, 'CMO workflow should not stop after only the first research children are inserted');
  assert.ok(asyncWorkflowTaskOrder.indexOf('data_analysis') > 0, 'CMO workflow should schedule data analysis when funnel/analytics data is requested');
  const asyncDataRun = asyncWorkflowFirstState.body.job.workflow.childRuns.find((run) => run.taskType === 'data_analysis');
  const asyncResearchRun = asyncWorkflowFirstState.body.job.workflow.childRuns.find((run) => run.sequencePhase === 'research' && ['research', 'teardown', 'validation'].includes(run.taskType));
  const asyncResearchRuns = asyncWorkflowFirstState.body.job.workflow.childRuns.filter((run) => run.sequencePhase === 'research' && ['research', 'teardown', 'validation'].includes(run.taskType));
  const asyncPlanningRuns = asyncWorkflowFirstState.body.job.workflow.childRuns.filter((run) => run.sequencePhase === 'planning');
  const asyncPlanningRun = asyncPlanningRuns[0] || null;
  assert.equal(asyncDataRun?.sequencePhase, 'data', 'CMO data analysis should run in the dedicated data phase');
  assert.equal(asyncDataRun?.status, 'completed', 'attached GA4/Search Console app context should complete the data layer as a source packet');
  const asyncDataJob = await request(`/api/jobs/${asyncDataRun.id}`, {}, { env: qaSearchEnv });
  assert.equal(asyncDataJob.status, 200);
  const asyncDataOutputText = JSON.stringify(asyncDataJob.body.job?.output || {});
  assert.match(asyncDataOutputText, /Funnel contract|GA4|Search Console/i, 'data layer should persist the agent-generated analytics/funnel packet output');
  assert.doesNotMatch(asyncDataOutputText, /attached_data_context_packet|app-context-data-analysis-shortcut/i, 'data layer should not use Worker-side attached-context shortcut output');
  assert.ok(asyncResearchRun, 'CMO workflow should keep one market research phase separate from data');
  assert.ok(asyncPlanningRun && ['media_planner', 'growth'].includes(asyncPlanningRun.taskType), 'CMO workflow should schedule at least one planning specialist');
  assert.ok(asyncResearchRuns.length >= 3, 'depth/quality CMO workflow should keep the full same-layer research fan-out instead of collapsing to one or two specialists');
  assert.ok(asyncWorkflowTaskOrder.includes('validation'), 'depth/quality CMO workflow should include validation as part of full research fan-out');
  assert.ok(
    asyncWorkflowPlannedTasks.includes('media_planner') && asyncWorkflowPlannedTasks.includes('growth'),
    'depth/quality CMO workflow should preserve same-layer planning candidates in the workflow plan'
  );
  assert.ok(asyncWorkflowTaskOrder.indexOf('data_analysis') < asyncWorkflowTaskOrder.indexOf(asyncResearchRun.taskType), 'CMO data layer should precede the research layer');
  assert.ok(asyncWorkflowTaskOrder.indexOf(asyncResearchRun.taskType) < asyncWorkflowTaskOrder.indexOf(asyncPlanningRun.taskType), 'CMO research layer should precede planning');
  assert.ok(asyncWorkflowTaskOrder.includes('teardown'), 'depth/quality CMO workflow should include teardown as part of full research fan-out');
  assert.notEqual(asyncDataRun?.agentName, 'RESEARCH TEAM LEADER', 'data_analysis should use the data specialist instead of a research leader');
  assert.ok(asyncWorkflowFirstState.body.job.workflow.statusCounts.completed >= 2, 'leader handoff should release eligible built-in specialists after the leader completes');

  const singleLeaderAttemptWaits = [];
  const singleLeaderAttempt = await request('/api/jobs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      parent_agent_id: 'qa-runner',
      task_type: 'cmo_leader',
      prompt: 'CMOとして集客したい。まず最初の実行計画を作ってください。',
      order_strategy: 'single',
      async_dispatch: true,
      skip_intake: true,
      budget_cap: 500
    })
  }, { waitUntilPromises: singleLeaderAttemptWaits, env: qaSearchEnv });
  assert.equal(singleLeaderAttempt.status, 201);
  assert.equal(singleLeaderAttempt.body.order_strategy_requested, 'single');
  assert.equal(singleLeaderAttempt.body.order_strategy_resolved, 'multi');
  assert.ok(singleLeaderAttempt.body.workflow_job_id, 'leader tasks must not run as single-agent jobs.');
  await Promise.allSettled(singleLeaderAttemptWaits);

  const leaderSeoFollowup = await request('/api/jobs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      parent_agent_id: 'qa-runner',
      task_type: 'cmo_leader',
      prompt: [
        `Follow-up/change request for running order ${asyncWorkflow.body.workflow_job_id}:`,
        'seo対策したlp提案してもらえますか',
        '',
        'Use the previous order context and return the concrete publisher-ready LP artifact.',
        '',
        'User adjustment:',
        '集客したい'
      ].join('\n'),
      followup_to_job_id: asyncWorkflow.body.workflow_job_id,
      order_strategy: 'single',
      skip_intake: true,
      input: {
        original_prompt: 'seo対策したlp提案してもらえますか',
        _broker: {
          activeLeaderLocked: true,
          activeLeader: { taskType: 'cmo_leader', label: 'CMO Leader' },
          conversationOwner: { type: 'leader', taskType: 'cmo_leader', label: 'CMO Leader' },
          conversation: {
            mode: 'followup',
            followupToJobId: asyncWorkflow.body.workflow_job_id
          }
        }
      }
    })
  }, { env: qaSearchEnv });
  assert.equal(leaderSeoFollowup.status, 201);
  assert.equal(leaderSeoFollowup.body.order_strategy_requested, 'single');
  assert.equal(leaderSeoFollowup.body.order_strategy_resolved, 'multi');
  assert.ok(leaderSeoFollowup.body.workflow_job_id);
  assert.equal(leaderSeoFollowup.body.job_id, undefined);
  assert.ok(leaderSeoFollowup.body.routing_planned_task_types.includes('cmo_leader'));
  assert.ok(leaderSeoFollowup.body.routing_planned_task_types.includes('seo_specialist'));
  const leaderSeoFollowupJob = await request(`/api/jobs/${leaderSeoFollowup.body.workflow_job_id}`, {}, { env: qaSearchEnv });
  assert.equal(leaderSeoFollowupJob.status, 200);
  assert.equal(leaderSeoFollowupJob.body.job.taskType, 'cmo_leader');
  assert.equal(leaderSeoFollowupJob.body.job.input._broker.leaderFollowupSpecialistRouted, true);
  assert.ok(
    (leaderSeoFollowupJob.body.job.workflow?.plannedTasks || []).includes('seo_specialist'),
    'leader SEO follow-up should keep orchestration and include the SEO specialist in the workflow.'
  );

  const leaderSeoFollowupMultiRetry = await request('/api/jobs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      parent_agent_id: 'qa-runner',
      task_type: 'cmo_leader',
      prompt: [
        `Follow-up/change request for running order ${asyncWorkflow.body.workflow_job_id}:`,
        'seo対策したlp提案してもらえますか',
        '',
        'Use the previous order context and return the concrete publisher-ready LP artifact.'
      ].join('\n'),
      followup_to_job_id: asyncWorkflow.body.workflow_job_id,
      order_strategy: 'multi',
      skip_intake: true,
      input: {
        original_prompt: 'seo対策したlp提案してもらえますか',
        _broker: {
          activeLeaderLocked: true,
          activeLeader: { taskType: 'cmo_leader', label: 'CMO Leader' },
          conversationOwner: { type: 'leader', taskType: 'cmo_leader', label: 'CMO Leader' },
          conversation: {
            mode: 'followup',
            followupToJobId: asyncWorkflow.body.workflow_job_id
          }
        }
      }
    })
  }, { env: qaSearchEnv });
  assert.equal(leaderSeoFollowupMultiRetry.status, 201);
  assert.equal(leaderSeoFollowupMultiRetry.body.order_strategy_requested, 'multi');
  assert.equal(leaderSeoFollowupMultiRetry.body.order_strategy_resolved, 'multi');
  assert.ok(leaderSeoFollowupMultiRetry.body.workflow_job_id, 'leader follow-up specialist retry should keep leader orchestration');
  assert.equal(leaderSeoFollowupMultiRetry.body.job_id, undefined);
  assert.ok(leaderSeoFollowupMultiRetry.body.routing_planned_task_types.includes('cmo_leader'));
  assert.ok(leaderSeoFollowupMultiRetry.body.routing_planned_task_types.includes('seo_specialist'));

  const ambiguousWorkflowWaits = [];
  const ambiguousWorkflowPrompt = 'CMOとして、https://aiagent-marketplace.net の集客を実行まで。対象はAIツールを使う開発者と小規模SaaS創業者。目標は30日でGitHubログインとエージェント登録を増やすこと。現状は流入が少なく、広告費なし。GA4やSearch Consoleはなし、営業資料なし。納品は媒体プラン、投稿/掲載コピー、承認パケット。最後の実行フェイズはできる限りの複数アクションをする。';
  const ambiguousWorkflow = await request('/api/jobs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      parent_agent_id: 'qa-runner',
      task_type: 'cmo_leader',
      prompt: ambiguousWorkflowPrompt,
      order_strategy: 'multi',
      async_dispatch: true,
      skip_intake: true,
      budget_cap: 500
    })
  }, { waitUntilPromises: ambiguousWorkflowWaits, env: qaSearchEnv });
  assert.equal(ambiguousWorkflow.status, 201);
  await Promise.allSettled(ambiguousWorkflowWaits);
  const ambiguousWorkflowState = await request(`/api/jobs/${ambiguousWorkflow.body.workflow_job_id}`, {}, { env: qaSearchEnv });
  assert.equal(ambiguousWorkflowState.status, 200);
  const ambiguousWorkflowRuns = ambiguousWorkflowState.body.job.workflow.childRuns;
  const ambiguousWorkflowTaskOrder = ambiguousWorkflowRuns.map((run) => run.taskType);
  const ambiguousWorkflowPublishPrepTasks = ['reddit', 'indie_hackers', 'writing', 'seo_specialist', 'landing']
    .filter((task) => ambiguousWorkflowTaskOrder.includes(task));
  assert.equal(ambiguousWorkflowTaskOrder.includes('data_analysis'), false, 'CMO workflow should skip data layer when GA4/Search Console are explicitly unavailable');
  assert.ok(ambiguousWorkflowTaskOrder.includes('research'), 'ambiguous CMO execution should still collect one research layer');
  assert.ok(ambiguousWorkflowTaskOrder.includes('media_planner'), 'ambiguous CMO execution should run Media Planner before publish preparation');
  assert.ok(ambiguousWorkflowTaskOrder.some((task) => ['writing', 'seo_specialist', 'landing'].includes(task)), 'ambiguous CMO execution should prepare copy/assets before SaaS handoff');
  assert.equal(ambiguousWorkflowTaskOrder.some((task) => ['directory_submission', 'x_post', 'acquisition_automation'].includes(task)), false, 'CMO workflow should not dispatch publish/action workers');
  assert.ok(ambiguousWorkflowPublishPrepTasks.length >= 2, 'ambiguous CMO execution should include multiple publish-preparation candidates');
  assert.ok(
    ambiguousWorkflowTaskOrder.indexOf('media_planner') < Math.min(...ambiguousWorkflowPublishPrepTasks.map((task) => ambiguousWorkflowTaskOrder.indexOf(task))),
    'Media Planner should precede ambiguous publish-preparation candidates'
  );
  assert.ok(
    ambiguousWorkflowRuns.some((run) => run.sequencePhase === 'checkpoint')
    && ambiguousWorkflowRuns.some((run) => run.sequencePhase === 'preparation'),
    'ambiguous CMO execution should include a checkpoint before final preparation/SaaS handoff phase'
  );

  const legacyPlannerWorkflowWaits = [];
  const legacyPlannerWorkflow = await request('/api/jobs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      parent_agent_id: 'qa-runner',
      task_type: 'cmo_leader',
      prompt: 'QA force legacy action planner: ユーザーを増やしたい。SNS、Reddit、Indie Hackers、自動化、ディレクトリまで含めて進めたい。',
      order_strategy: 'multi',
      async_dispatch: true,
      skip_intake: true,
      budget_cap: 500
    })
  }, { waitUntilPromises: legacyPlannerWorkflowWaits, env: qaSearchEnv });
  assert.equal(legacyPlannerWorkflow.status, 201);
  const legacyPlannerTasks = legacyPlannerWorkflow.body.routing_planned_task_types || [];
  assert.equal(
    legacyPlannerTasks.some((task) => ['x_post', 'instagram', 'directory_submission', 'acquisition_automation'].includes(task)),
    false,
    'CMO leader planner output must be normalized so legacy direct-action workers cannot re-enter the workflow'
  );
  assert.ok(legacyPlannerTasks.includes('writing'), 'legacy social/email action tasks should become writing/preparation work');
  assert.ok(
    legacyPlannerTasks.some((task) => ['landing', 'growth', 'writing'].includes(task)),
    'legacy acquisition automation should be retained only as non-action planning/preparation work'
  );
  assert.ok(legacyPlannerTasks.some((task) => ['reddit', 'indie_hackers'].includes(task)), 'community channels should remain preparation-layer copy packets');
  await Promise.allSettled(legacyPlannerWorkflowWaits);

  const preservedRetryTasks = ['cmo_leader', 'research', 'seo_specialist'];
  const preservedRetryWaits = [];
  const preservedRetryWorkflow = await request('/api/jobs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      parent_agent_id: 'qa-runner',
      task_type: 'cmo_leader',
      prompt: 'Retry the previous order exactly. The text mentions X, Reddit, and directory execution, but retry must not create a new plan.',
      order_strategy: 'multi',
      async_dispatch: true,
      skip_intake: true,
      budget_cap: 500,
      workflow_planned_tasks: preservedRetryTasks,
      input: {
        _broker: {
          activeLeaderLocked: true,
          activeLeader: { taskType: 'cmo_leader', label: 'CMO Leader' },
          conversationOwner: { type: 'leader', taskType: 'cmo_leader', label: 'CMO Leader' },
          retry: {
            sourceOrderId: 'qa-prior-workflow',
            preservePrompt: true,
            preservePlan: true,
            plannedTasks: preservedRetryTasks
          }
        }
      }
    })
  }, { waitUntilPromises: preservedRetryWaits, env: qaSearchEnv });
  assert.equal(preservedRetryWorkflow.status, 201);
  assert.deepEqual(
    preservedRetryWorkflow.body.routing_planned_task_types,
    preservedRetryTasks,
    'workflow retry should keep the source order planned tasks instead of expanding from the retry prompt'
  );
  await Promise.allSettled(preservedRetryWaits);
  const preservedRetryState = await request(`/api/jobs/${preservedRetryWorkflow.body.workflow_job_id}`, {}, { env: qaSearchEnv });
  assert.equal(preservedRetryState.status, 200);
  assert.deepEqual(
    preservedRetryState.body.job.workflow.plannedTasks,
    preservedRetryTasks,
    'persisted workflow retry should keep the exact previous plan'
  );
  assert.equal(
    preservedRetryState.body.job.workflow.plannedTasks.some((task) => ['x_post', 'reddit', 'directory_submission'].includes(task)),
    false,
    'workflow retry should not add action agents that were not in the previous plan'
  );

  const heavyReuseMarker = `QA_HEAVY_REUSE_CONTENT_MARKER_${Date.now()}`;
  const heavyReuseContent = `${heavyReuseMarker}\n${'reused artifact body '.repeat(5000)}`;
  const reusedArtifactRetryWorkflow = await request('/api/jobs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      parent_agent_id: 'qa-runner',
      task_type: 'cmo_leader',
      prompt: 'Retry the previous CMO order and reuse the completed research artifact.',
      order_strategy: 'multi',
      async_dispatch: true,
      skip_intake: true,
      budget_cap: 500,
      workflow_planned_tasks: preservedRetryTasks,
      input: {
        _broker: {
          activeLeaderLocked: true,
          activeLeader: { taskType: 'cmo_leader', label: 'CMO Leader' },
          conversationOwner: { type: 'leader', taskType: 'cmo_leader', label: 'CMO Leader' },
          retry: {
            sourceOrderId: 'qa-prior-workflow',
            preservePrompt: true,
            preservePlan: true,
            plannedTasks: preservedRetryTasks,
            reuseArtifacts: [{
              task_type: 'research',
              taskType: 'research',
              source_order_id: 'qa-prior-workflow',
              sourceOrderId: 'qa-prior-workflow',
              source_run_id: 'qa-prior-research-run',
              sourceRunId: 'qa-prior-research-run',
              file_name: 'research-delivery.md',
              fileName: 'research-delivery.md',
              content: heavyReuseContent,
              type: 'text/markdown',
              user_selected: true
            }]
          }
        }
      }
    })
  }, { env: qaSearchEnv });
  assert.equal(reusedArtifactRetryWorkflow.status, 201);
  const reusedArtifactRetryState = await request(`/api/jobs/${reusedArtifactRetryWorkflow.body.workflow_job_id}`, {}, { env: qaSearchEnv });
  assert.equal(reusedArtifactRetryState.status, 200);
  const reusedParentBrokerJson = JSON.stringify(reusedArtifactRetryState.body.job.input?._broker || {});
  assert.equal(
    reusedParentBrokerJson.includes(heavyReuseMarker),
    false,
    'retry reuse artifact body should not be duplicated into workflow parent broker metadata'
  );
  assert.ok(
    reusedParentBrokerJson.includes('content_chars'),
    'retry reuse broker metadata should retain artifact size without storing the full body'
  );
  const reusedResearchRun = (reusedArtifactRetryState.body.job.workflow.childRuns || [])
    .find((run) => run.taskType === 'research' || run.task_type === 'research');
  assert.ok(reusedResearchRun?.id, 'reused research child run should be present');
  const reusedResearchChild = await request(`/api/jobs/${reusedResearchRun.id}`, {}, { env: qaSearchEnv });
  assert.equal(reusedResearchChild.status, 200);
  assert.ok(
    JSON.stringify(reusedResearchChild.body.job.output?.files || []).includes(heavyReuseMarker),
    'the reused child job should keep the selected artifact body as the actual delivery file'
  );
  assert.equal(
    JSON.stringify(reusedResearchChild.body.job.input?._broker || {}).includes(heavyReuseMarker),
    false,
    'retry reuse artifact body should not be duplicated into reused child broker metadata'
  );

  const qaStorage = createD1LikeStorage(env.MY_BINDING, { allowInMemory: true, stateCacheTtlMs: 0 });
  const mergeGuardStorage = createD1LikeStorage(null, { allowInMemory: true, stateCacheTtlMs: 0 });
  const mergeGuardJobId = `qa-completed-merge-guard-${Date.now()}`;
  const mergeGuardStartedAt = nowIso();
  const mergeGuardCompletedAt = new Date(Date.now() + 1000).toISOString();
  await mergeGuardStorage.upsertJobs([{
    id: mergeGuardJobId,
    taskType: 'qa_merge_guard',
    status: 'running',
    createdAt: mergeGuardStartedAt,
    startedAt: mergeGuardStartedAt,
    dispatch: { completionStatus: 'dispatch_scheduled', attempts: 1 },
    logs: ['scheduled before completion']
  }]);
  await mergeGuardStorage.upsertJobs([{
    id: mergeGuardJobId,
    taskType: 'qa_merge_guard',
    status: 'completed',
    createdAt: mergeGuardStartedAt,
    startedAt: mergeGuardStartedAt,
    completedAt: mergeGuardCompletedAt,
    dispatch: { completionStatus: 'completed', attempts: 1 },
    logs: ['completed by endpoint dispatch']
  }]);
  await mergeGuardStorage.upsertJobs([{
    id: mergeGuardJobId,
    taskType: 'qa_merge_guard',
    status: 'running',
    createdAt: mergeGuardStartedAt,
    startedAt: new Date(Date.now() + 2000).toISOString(),
    dispatch: { completionStatus: 'dispatch_scheduled', attempts: 2 },
    logs: ['stale scheduled rewrite after completion']
  }]);
  const mergeGuardJob = await mergeGuardStorage.getJobById(mergeGuardJobId);
  assert.equal(mergeGuardJob.status, 'completed', 'completed endpoint dispatch results must not be overwritten by stale active dispatch rewrites');
  assert.equal(mergeGuardJob.dispatch?.completionStatus, 'completed', 'completed endpoint dispatch status must remain completed after stale rewrites');
  await qaStorage.mutate(async (draft) => {
    draft.jobs.push(
      {
        id: 'qa-workflow-auto-retry-parent',
        jobKind: 'workflow',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        prompt: 'restart required for timed out research child',
        status: 'running',
        createdAt: nowIso(),
        startedAt: nowIso(),
        workflow: {
          plannedTasks: ['cmo_leader', 'research', 'growth'],
          childRuns: []
        },
        logs: []
      },
      {
        id: 'qa-workflow-auto-retry-child',
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'research',
        workflowTask: 'research',
        workflowAgentName: 'Research Agent',
        prompt: 'timed out research child should force full order retry',
        status: 'timed_out',
        assignedAgentId: 'agent_research_01',
        workflowParentId: 'qa-workflow-auto-retry-parent',
        createdAt: nowIso(),
        startedAt: nowIso(),
        timedOutAt: nowIso(),
        failedAt: nowIso(),
        failureCategory: 'deadline_timeout',
        dispatch: { attempts: 0, retryable: true, maxRetries: 2 },
        logs: ['qa timed out workflow child']
      }
    );
  });
  const autoRetrySweep = await request('/api/dev/timeout-sweep', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ retry_limit: 1 })
  }, { env: qaSearchEnv });
  assert.equal(autoRetrySweep.status, 200);
  assert.equal(autoRetrySweep.body.retry.retried_count, 1, 'retryable workflow child failures should be requeued in-place before full-order retry');
  assert.equal(autoRetrySweep.body.retry.restart_required_count, 0, 'retryable workflow child failures should not force full-order retry until retries are exhausted');
  assert.ok(autoRetrySweep.body.retry.job_ids.includes('qa-workflow-auto-retry-child'));
  const autoRetryState = await qaStorage.getState();
  const autoRetriedChild = autoRetryState.jobs.find((job) => job.id === 'qa-workflow-auto-retry-child');
  const autoRetryParent = autoRetryState.jobs.find((job) => job.id === 'qa-workflow-auto-retry-parent');
  assert.equal(autoRetriedChild?.status, 'queued', 'retryable workflow child should be requeued for another provider attempt');
  assert.equal(autoRetriedChild?.failureCategory, null);
  assert.equal(autoRetriedChild?.dispatch?.retryable, false);
  assert.equal(autoRetriedChild?.dispatch?.restartRequired, false);
  assert.equal(autoRetryParent?.status, 'running', 'parent workflow should remain running while a child retry is queued');
  await qaStorage.mutate(async (draft) => {
    draft.jobs = draft.jobs.filter((job) => !['qa-workflow-auto-retry-parent', 'qa-workflow-auto-retry-child'].includes(job.id));
  });

  await qaStorage.mutate(async (draft) => {
    draft.jobs.push(
      {
        id: 'qa-workflow-auto-retry-prep-parent',
        jobKind: 'workflow',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        prompt: 'restart required for failed preparation child',
        status: 'running',
        createdAt: nowIso(),
        startedAt: nowIso(),
        workflow: {
          plannedTasks: ['cmo_leader', 'research', 'media_planner', 'seo_specialist'],
          childRuns: []
        },
        logs: []
      },
      {
        id: 'qa-workflow-auto-retry-prep-child',
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'seo_specialist',
        workflowTask: 'seo_specialist',
        workflowAgentName: 'SEO SPECIALIST',
        prompt: 'retryable preparation timeout should force full order retry',
        status: 'failed',
        assignedAgentId: 'agent_seospecialist_01',
        workflowParentId: 'qa-workflow-auto-retry-prep-parent',
        createdAt: nowIso(),
        startedAt: nowIso(),
        failedAt: nowIso(),
        failureCategory: 'dispatch_timeout',
        failureReason: 'OpenAI request timed out after 45000ms',
        dispatch: { attempts: 0, retryable: true, maxRetries: 2, nextRetryAt: new Date(Date.now() - 1000).toISOString() },
        input: { _broker: { workflow: { sequencePhase: 'preparation' } } },
        logs: ['qa failed preparation workflow child']
      }
    );
  });
  const autoRetryPrepSweep = await request('/api/dev/timeout-sweep', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ retry_limit: 1 })
  }, { env: qaSearchEnv });
  assert.equal(autoRetryPrepSweep.status, 200);
  assert.equal(autoRetryPrepSweep.body.retry.retried_count, 1, 'retryable preparation children should be retried in-place before full-order retry');
  assert.equal(autoRetryPrepSweep.body.retry.restart_required_count, 0, 'retryable dispatch failures should not become full-order retry requirements before retries are exhausted');
  assert.ok(autoRetryPrepSweep.body.retry.job_ids.includes('qa-workflow-auto-retry-prep-child'));
  const autoRetryPrepState = await qaStorage.getState();
  const autoRetriedPrepChild = autoRetryPrepState.jobs.find((job) => job.id === 'qa-workflow-auto-retry-prep-child');
  const autoRetryPrepParent = autoRetryPrepState.jobs.find((job) => job.id === 'qa-workflow-auto-retry-prep-parent');
  assert.equal(autoRetriedPrepChild?.status, 'queued', 'failed preparation child should be requeued while retries remain');
  assert.equal(autoRetriedPrepChild?.failureCategory, null);
  assert.equal(autoRetriedPrepChild?.dispatch?.retryable, false);
  assert.equal(autoRetriedPrepChild?.dispatch?.restartRequired, false);
  assert.equal(autoRetryPrepParent?.status, 'running', 'parent workflow should remain running while a preparation child retry is queued');
  await qaStorage.mutate(async (draft) => {
    draft.jobs = draft.jobs.filter((job) => !['qa-workflow-auto-retry-prep-parent', 'qa-workflow-auto-retry-prep-child'].includes(job.id));
  });

  const asyncRawState = await qaStorage.getState();
  const asyncCheckpointLeader = asyncRawState.jobs.find((job) => (
    job.workflowParentId === asyncWorkflow.body.workflow_job_id
    && job.taskType === 'cmo_leader'
    && job.input?._broker?.workflow?.sequencePhase === 'checkpoint'
  ));
  const asyncFinalSummaryLeader = asyncRawState.jobs.find((job) => (
    job.workflowParentId === asyncWorkflow.body.workflow_job_id
    && job.taskType === 'cmo_leader'
    && job.input?._broker?.workflow?.sequencePhase === 'final_summary'
  ));
  assert.ok(['blocked', 'queued', 'running', 'completed'].includes(String(asyncCheckpointLeader?.status || '')), 'checkpoint leader should remain on the workflow path without failing early');
  assert.ok(['blocked', 'queued', 'running', 'completed'].includes(String(asyncFinalSummaryLeader?.status || '')), 'final summary leader should remain on the workflow path without failing early');
  const asyncSpecialistWithHandoff = asyncRawState.jobs.find((job) => (
    job.workflowParentId === asyncWorkflow.body.workflow_job_id
    && job.taskType !== 'cmo_leader'
    && job.input?._broker?.workflow?.leaderHandoff?.leaderTaskType === 'cmo_leader'
  ));
  assert.ok(asyncSpecialistWithHandoff, 'specialist children should receive the completed CMO leader handoff before dispatch');

  const blockedSearchParentId = 'qa-search-blocked-parent';
  const blockedSearchChildId = 'qa-search-blocked-child';
  await qaStorage.mutate(async (draft) => {
    const at = nowIso();
    draft.jobs.push(
      {
        id: blockedSearchParentId,
        jobKind: 'workflow',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        prompt: 'search-required workflow should block when source connector is unavailable',
        status: 'running',
        createdAt: at,
        startedAt: at,
        workflow: {
          plannedTasks: ['cmo_leader', 'research'],
          childRuns: []
        },
        logs: ['search required qa parent']
      },
      {
        id: blockedSearchChildId,
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'research',
        workflowTask: 'research',
        workflowAgentName: 'Research Agent',
        prompt: 'search-required workflow child',
        status: 'queued',
        assignedAgentId: 'agent_research_01',
        workflowParentId: blockedSearchParentId,
        createdAt: at,
        input: {
          _broker: {
            workflow: {
              primaryTask: 'cmo_leader',
              parentJobId: blockedSearchParentId,
              sequencePhase: 'research',
              forceWebSearch: true,
              webSearchRequiredReason: 'leader_research_layer'
            }
          }
        },
        logs: ['search required qa child']
      }
    );
  });
  const originalWorkerApiFetch = globalThis.fetch;
  let blockedSearchOpenAiCalls = 0;
  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    if (url === 'https://api.openai.com/v1/responses') {
      if (String(init?.body || '').includes(blockedSearchChildId)) blockedSearchOpenAiCalls += 1;
      return new Response(JSON.stringify({
        output_text: JSON.stringify({
          summary: 'Research summary ready',
          report_summary: 'Research delivery',
          bullets: ['No search sources were returned.'],
          next_action: 'Connect search and rerun.',
          file_markdown: '# research delivery\n\nNo web citations were returned.',
          confidence: 0.2,
          authority_request: null
        })
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return originalWorkerApiFetch(input, init);
  };
  try {
    const blockedRetry = await request('/api/dev/dispatch-retry', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ job_id: blockedSearchChildId })
    }, {
      env: {
        ...env,
        OPENAI_API_KEY: 'sk-test-worker-search',
        BUILTIN_WORKFLOW_OPENAI_ENABLED: '1'
      }
    });
    assert.equal(blockedRetry.status, 409);
    assert.equal(blockedRetry.body.restart_required, true);
    assert.equal(blockedSearchOpenAiCalls, 0, 'single-child workflow retry must not hit OpenAI when the whole order should be retried');
  } finally {
    globalThis.fetch = originalWorkerApiFetch;
  }
  const blockedSearchState = await qaStorage.getState();
  const blockedSearchChild = blockedSearchState.jobs.find((job) => job.id === blockedSearchChildId);
  const blockedSearchParent = blockedSearchState.jobs.find((job) => job.id === blockedSearchParentId);
  assert.equal(blockedSearchChild?.status, 'queued', 'single-child retry rejection should not reopen or partially execute the workflow child');
  assert.notEqual(blockedSearchParent?.status, 'completed', 'workflow parent should not advance as completed from source-missing research');
  await qaStorage.mutate(async (draft) => {
    const child = draft.jobs.find((job) => job.id === blockedSearchChildId);
    const parent = draft.jobs.find((job) => job.id === blockedSearchParentId);
    const failedAt = nowIso();
    if (child) {
      child.status = 'failed';
      child.failedAt = failedAt;
      child.failureCategory = 'workflow_restart_required';
      child.failureReason = 'QA cleanup: full order retry required after rejected child retry.';
      child.dispatch = {
        ...(child.dispatch || {}),
        completionStatus: 'workflow_restart_required',
        retryable: false,
        restartRequired: true
      };
    }
    if (parent) {
      parent.status = 'failed';
      parent.failedAt = failedAt;
      parent.failureCategory = 'workflow_restart_required';
      parent.failureReason = 'QA cleanup: full order retry required after rejected child retry.';
    }
  });

  const blockedResearchSequenceParentId = 'qa-blocked-research-sequence-parent';
  const blockedResearchCheckpointId = 'qa-blocked-research-sequence-checkpoint';
  const blockedResearchActionId = 'qa-blocked-research-sequence-action';
  await qaStorage.mutate(async (draft) => {
    const at = nowIso();
    draft.jobs.push(
      {
        id: blockedResearchSequenceParentId,
        jobKind: 'workflow',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        prompt: 'blocked required search should not release checkpoint or action layer',
        status: 'running',
        createdAt: at,
        startedAt: at,
        workflow: {
          plannedTasks: ['cmo_leader', 'research', 'landing'],
          childRuns: [],
          leaderSequence: {
            enabled: true,
            status: 'pending',
            checkpoints: [
              {
                jobId: blockedResearchCheckpointId,
                afterLayer: 2,
                beforeLayer: 3,
                status: 'pending',
                label: 'research_to_planning'
              }
            ],
            finalSummaryJobId: 'qa-blocked-research-sequence-final',
            finalSummaryStatus: 'pending'
          }
        },
        logs: ['blocked research sequence qa parent']
      },
      {
        id: 'qa-blocked-research-sequence-leader',
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        workflowTask: 'cmo_leader',
        workflowAgentName: 'CMO Team Leader',
        prompt: 'initial leader completed',
        status: 'completed',
        assignedAgentId: 'agent_cmo_leader_01',
        workflowParentId: blockedResearchSequenceParentId,
        createdAt: at,
        completedAt: at,
        input: { _broker: { workflow: { sequencePhase: 'initial' } } },
        output: { summary: 'initial leader completed', report: { summary: 'initial leader completed', bullets: [], nextAction: 'run research' }, files: [] },
        logs: []
      },
      {
        id: 'qa-blocked-research-sequence-research',
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'research',
        workflowTask: 'research',
        workflowAgentName: 'Research Agent',
        prompt: 'required search blocked',
        status: 'blocked',
        assignedAgentId: 'agent_research_01',
        workflowParentId: blockedResearchSequenceParentId,
        createdAt: at,
        input: { _broker: { workflow: { sequencePhase: 'research', forceWebSearch: true } } },
        output: { summary: 'Search connector required before this workflow can be completed.', report: { summary: 'Search connector required before this workflow can be completed.', authority_request: { missing_connectors: ['search'] } }, files: [] },
        dispatch: { completionStatus: 'blocked' },
        logs: []
      },
      {
        id: blockedResearchCheckpointId,
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        workflowTask: 'cmo_leader',
        workflowAgentName: 'CMO Team Leader',
        prompt: 'checkpoint should wait',
        status: 'blocked',
        assignedAgentId: 'agent_cmo_leader_01',
        workflowParentId: blockedResearchSequenceParentId,
        createdAt: at,
        input: { _broker: { workflow: { sequencePhase: 'checkpoint' } } },
        dispatch: { completionStatus: 'leader_checkpoint_blocked' },
        logs: []
      },
      {
        id: blockedResearchActionId,
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'landing',
        workflowTask: 'landing',
        workflowAgentName: 'Landing Page Agent',
        prompt: 'action should wait',
        status: 'queued',
        assignedAgentId: 'agent_landing_01',
        workflowParentId: blockedResearchSequenceParentId,
        createdAt: at,
        input: { _broker: { workflow: { sequencePhase: 'action' } } },
        logs: []
      }
    );
  });
  await request(`/api/jobs/${blockedResearchSequenceParentId}`);
  const blockedResearchSequenceState = await qaStorage.getState();
  const blockedResearchCheckpoint = blockedResearchSequenceState.jobs.find((job) => job.id === blockedResearchCheckpointId);
  const blockedResearchAction = blockedResearchSequenceState.jobs.find((job) => job.id === blockedResearchActionId);
  const blockedResearchParent = blockedResearchSequenceState.jobs.find((job) => job.id === blockedResearchSequenceParentId);
  assert.equal(blockedResearchCheckpoint?.status, 'blocked', 'checkpoint leader should not be queued while required research is blocked');
  assert.equal(blockedResearchAction?.status, 'queued', 'action layer should not dispatch while required research is blocked');
  assert.equal(blockedResearchParent?.status, 'blocked', 'parent workflow should surface the required-search block');

  const missingOriginalSearchParentId = 'qa-missing-original-search-parent';
  const missingOriginalSearchCheckpointId = 'qa-missing-original-search-checkpoint';
  await qaStorage.mutate(async (draft) => {
    const at = nowIso();
    draft.jobs.push(
      {
        id: missingOriginalSearchParentId,
        jobKind: 'workflow',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        prompt: 'leader quality gate should require original search information in research output',
        status: 'running',
        createdAt: at,
        startedAt: at,
        workflow: {
          plannedTasks: ['cmo_leader', 'research', 'media_planner'],
          childRuns: [],
          leaderSequence: {
            enabled: true,
            status: 'pending',
            checkpoints: [
              {
                jobId: missingOriginalSearchCheckpointId,
                afterLayer: 2,
                beforeLayer: 3,
                status: 'pending',
                label: 'research_to_planning'
              }
            ]
          }
        },
        logs: ['missing original search qa parent']
      },
      {
        id: 'qa-missing-original-search-leader',
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        workflowTask: 'cmo_leader',
        workflowAgentName: 'CMO Team Leader',
        prompt: 'initial leader completed',
        status: 'completed',
        assignedAgentId: 'agent_cmo_leader_01',
        workflowParentId: missingOriginalSearchParentId,
        createdAt: at,
        completedAt: at,
        input: { _broker: { workflow: { sequencePhase: 'initial' } } },
        output: { summary: 'initial leader completed', report: { summary: 'initial leader completed', nextAction: 'run research' }, files: [] },
        logs: []
      },
      {
        id: 'qa-missing-original-search-research',
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'research',
        workflowTask: 'research',
        workflowAgentName: 'Research Agent',
        prompt: 'research completed without original search material',
        status: 'completed',
        assignedAgentId: 'agent_research_01',
        workflowParentId: missingOriginalSearchParentId,
        createdAt: at,
        completedAt: at,
        input: { _broker: { workflow: { sequencePhase: 'research', forceWebSearch: true } } },
        output: {
          summary: 'Research completed but no search result was carried into the delivery.',
          report: { summary: 'Research completed but no search result was carried into the delivery.', bullets: ['generic market note'], nextAction: 'plan next step' },
          files: [{ name: 'research.md', content: '# research\nNo source URLs or search results are attached here.' }]
        },
        logs: []
      },
      {
        id: missingOriginalSearchCheckpointId,
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        workflowTask: 'cmo_leader',
        workflowAgentName: 'CMO Team Leader',
        prompt: 'checkpoint should stay blocked',
        status: 'blocked',
        assignedAgentId: 'agent_cmo_leader_01',
        workflowParentId: missingOriginalSearchParentId,
        createdAt: at,
        input: { _broker: { workflow: { sequencePhase: 'checkpoint', checkpointLayer: 2, requiredBeforeLayer: 3 } } },
        dispatch: { completionStatus: 'leader_checkpoint_blocked' },
        logs: []
      }
    );
  });
  await request(`/api/jobs/${missingOriginalSearchParentId}`);
  const missingOriginalSearchState = await qaStorage.getState();
  const missingOriginalSearchCheckpoint = missingOriginalSearchState.jobs.find((job) => job.id === missingOriginalSearchCheckpointId);
  const missingOriginalSearchParent = missingOriginalSearchState.jobs.find((job) => job.id === missingOriginalSearchParentId);
  const missingOriginalSearchResearch = missingOriginalSearchState.jobs.find((job) => job.id === 'qa-missing-original-search-research');
  assert.equal(missingOriginalSearchCheckpoint?.status, 'blocked', 'checkpoint should remain blocked when research skipped original search evidence');
  assert.equal(missingOriginalSearchCheckpoint?.failureCategory, 'leader_quality_gate_failed');
  assert.ok(String(missingOriginalSearchCheckpoint?.failureReason || '').includes('missing_search_execution'));
  assert.equal(missingOriginalSearchParent?.status, 'blocked', 'parent workflow should block on original-search quality failure');
  assert.equal(missingOriginalSearchResearch?.qualityGate?.passed, false, 'research child should record the failed original-search quality review');

  const reportSourcesOnlyParentId = 'qa-report-sources-only-parent';
  const reportSourcesOnlyCheckpointId = 'qa-report-sources-only-checkpoint';
  await qaStorage.mutate(async (draft) => {
    const at = nowIso();
    draft.jobs.push(
      {
        id: reportSourcesOnlyParentId,
        jobKind: 'workflow',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        prompt: 'leader quality gate should accept original search sources attached to the report',
        status: 'running',
        createdAt: at,
        startedAt: at,
        workflow: {
          plannedTasks: ['cmo_leader', 'research', 'media_planner'],
          childRuns: [],
          leaderSequence: {
            enabled: true,
            status: 'pending',
            checkpointJobId: reportSourcesOnlyCheckpointId,
            checkpointLayer: 2,
            requiredBeforeLayer: 3,
            lastQualityGate: { scope: 'layer_2', passed: false, summary: 'stale prior rule failure' }
          }
        },
        logs: ['report sources only qa parent']
      },
      {
        id: 'qa-report-sources-only-leader',
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        workflowTask: 'cmo_leader',
        workflowAgentName: 'CMO Team Leader',
        prompt: 'initial leader completed',
        status: 'completed',
        assignedAgentId: 'agent_cmo_leader_01',
        workflowParentId: reportSourcesOnlyParentId,
        createdAt: at,
        completedAt: at,
        input: { _broker: { workflow: { sequencePhase: 'initial' } } },
        output: { summary: 'initial leader completed', report: { summary: 'initial leader completed', nextAction: 'run research' }, files: [] },
        logs: []
      },
      {
        id: 'qa-report-sources-only-research',
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'research',
        workflowTask: 'research',
        workflowAgentName: 'Research Agent',
        prompt: 'research completed with report-level sources',
        status: 'completed',
        assignedAgentId: 'agent_research_01',
        workflowParentId: reportSourcesOnlyParentId,
        createdAt: at,
        completedAt: at,
        input: { _broker: { workflow: { sequencePhase: 'research', forceWebSearch: true } } },
        output: {
          summary: 'Research completed with source attachments.',
          report: {
            summary: 'Research completed with source attachments.',
            bullets: ['source-backed market note'],
            nextAction: 'plan next step',
            web_sources: [{ title: 'CAIt marketplace', url: 'https://aiagent-marketplace.net/', snippet: 'Quality-focused AI agent marketplace.', query: 'quality focused AI agent marketplace', action: 'brave_search' }]
          },
          files: [{ name: 'research.md', content: '# research\nSee attached web_sources for the original source evidence.' }]
        },
        logs: []
      },
      {
        id: reportSourcesOnlyCheckpointId,
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        workflowTask: 'cmo_leader',
        workflowAgentName: 'CMO Team Leader',
        prompt: 'checkpoint should be released',
        status: 'blocked',
        assignedAgentId: 'agent_cmo_leader_01',
        workflowParentId: reportSourcesOnlyParentId,
        createdAt: at,
        input: { _broker: { workflow: { sequencePhase: 'checkpoint', checkpointLayer: 2, requiredBeforeLayer: 3 } } },
        dispatch: { completionStatus: 'leader_checkpoint_blocked' },
        logs: []
      }
    );
  });
  await request(`/api/jobs/${reportSourcesOnlyParentId}`);
  const reportSourcesOnlyState = await qaStorage.getState();
  const reportSourcesOnlyCheckpoint = reportSourcesOnlyState.jobs.find((job) => job.id === reportSourcesOnlyCheckpointId);
  const reportSourcesOnlyParent = reportSourcesOnlyState.jobs.find((job) => job.id === reportSourcesOnlyParentId);
  const reportSourcesOnlyResearch = reportSourcesOnlyState.jobs.find((job) => job.id === 'qa-report-sources-only-research');
  assert.equal(reportSourcesOnlyResearch?.qualityGate?.passed, true, 'report-level web_sources should count as original search evidence in the delivery');
  assert.notEqual(reportSourcesOnlyCheckpoint?.failureCategory, 'leader_quality_gate_failed', 'checkpoint should not preserve a stale quality-gate block after current review passes');
  assert.notEqual(reportSourcesOnlyParent?.workflow?.leaderSequence?.lastQualityGate?.passed, false, 'parent should clear stale failed layer gate when current source review passes');

  const researchStructuredHandoffParentId = 'qa-research-structured-handoff-parent';
  const researchStructuredHandoffPlanningId = 'qa-research-structured-handoff-planning';
  await qaStorage.mutate(async (draft) => {
    const at = nowIso();
    draft.jobs.push(
      {
        id: researchStructuredHandoffParentId,
        jobKind: 'workflow',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        prompt: 'leader should pass research downstream_handoff into the planning layer',
        status: 'running',
        createdAt: at,
        startedAt: at,
        workflow: {
          plannedTasks: ['cmo_leader', 'research', 'media_planner'],
          childRuns: []
        },
        logs: ['research structured handoff qa parent']
      },
      {
        id: 'qa-research-structured-handoff-leader',
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        workflowTask: 'cmo_leader',
        workflowAgentName: 'CMO Team Leader',
        prompt: 'initial leader completed',
        status: 'completed',
        assignedAgentId: 'agent_cmo_leader_01',
        workflowParentId: researchStructuredHandoffParentId,
        createdAt: at,
        completedAt: at,
        input: { _broker: { workflow: { sequencePhase: 'initial' } } },
        output: { summary: 'initial leader completed', report: { summary: 'initial leader completed', nextAction: 'hand research to planning' }, files: [] },
        logs: []
      },
      {
        id: 'qa-research-structured-handoff-research',
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'research',
        workflowTask: 'research',
        workflowAgentName: 'Research Agent',
        prompt: 'research completed with structured downstream handoff',
        status: 'completed',
        assignedAgentId: 'agent_research_01',
        workflowParentId: researchStructuredHandoffParentId,
        createdAt: at,
        completedAt: at,
        input: { _broker: { workflow: { sequencePhase: 'research', forceWebSearch: true } } },
        output: {
          summary: 'Research used the CAIt marketplace source and produced a downstream handoff packet.',
          report: {
            summary: 'Research used the CAIt marketplace source and produced a downstream handoff packet.',
            bullets: ['CAIt marketplace source supports developer signup positioning.'],
            nextAction: 'Planning must use SEO, SNS, paid, and approval requirements.',
            web_sources: [{ title: 'CAIt marketplace source', url: 'https://aiagent-marketplace.net/chat', snippet: 'Developer-facing AI agent marketplace chat.', query: 'CAIt marketplace developer signup', action: 'brave_search' }],
            research_findings: {
              downstream_handoff: {
                source_status: { provider: 'brave', source_count: 1, fetched_page_count: 1, domains: ['aiagent-marketplace.net'] },
                channel_requirements: {
                  planning: { use: 'Use CAIt marketplace source vocabulary before choosing media lanes.' },
                  seo: { use: 'SEO must return a source-backed page plan for developer signup intent.', required_artifacts: ['query cluster', 'H1/H2 pattern'] },
                  social: { use: 'SNS drafts must keep claims source-backed and approval-ready.', evidence_rule: 'Do not invent engagement counts.' },
                  paid: { use: 'Paid ads stay a small validation with one hypothesis and stop rule.' },
                  action: { use: 'External publishing requires an approval packet.', approval_required: true }
                },
                evidence_gaps: [
                  { id: 'social_engagement', severity: 'medium', gap: 'SNS engagement counts missing', next_check: 'Collect post URLs and reaction counts.' }
                ],
                approval_boundary: { use: 'Separate account, URL, exact copy, and stop rule before execution.', approval_required: true }
              },
              evidence_gaps: [
                { id: 'social_engagement', severity: 'medium', gap: 'SNS engagement counts missing', next_check: 'Collect post URLs and reaction counts.' }
              ]
            },
            evidence_gaps: [
              { id: 'social_engagement', severity: 'medium', gap: 'SNS engagement counts missing', next_check: 'Collect post URLs and reaction counts.' }
            ]
          },
          files: [{ name: 'research.md', content: '# research\nCAIt marketplace source https://aiagent-marketplace.net/chat\n\n## Downstream agent handoff packet\nSEO, SNS, paid, and approval requirements are structured in report.research_findings.' }]
        },
        logs: []
      },
      {
        id: researchStructuredHandoffPlanningId,
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'media_planner',
        workflowTask: 'media_planner',
        workflowAgentName: 'Media Planner Agent',
        prompt: 'planning should receive structured research requirements',
        status: 'queued',
        assignedAgentId: 'agent_media_planner_01',
        workflowParentId: researchStructuredHandoffParentId,
        createdAt: at,
        input: { _broker: { workflow: { sequencePhase: 'planning' } } },
        logs: []
      }
    );
  });
  await request(`/api/jobs/${researchStructuredHandoffParentId}`);
  const researchStructuredHandoffState = await qaStorage.getState();
  const researchStructuredHandoffPlanning = researchStructuredHandoffState.jobs.find((job) => job.id === researchStructuredHandoffPlanningId);
  const researchStructuredDigestText = JSON.stringify(researchStructuredHandoffPlanning?.input?._broker?.workflow?.leaderHandoff?.structuredHandoffDigest || []);
  const researchStructuredAdditionalPrompt = String(researchStructuredHandoffPlanning?.additionalPrompt || researchStructuredHandoffPlanning?.input?._broker?.workflow?.additionalPrompt || '');
  assert.ok(researchStructuredDigestText.includes('SEO must return a source-backed page plan'), 'leader handoff digest should preserve Research Agent SEO channel requirements');
  assert.ok(researchStructuredDigestText.includes('SNS engagement counts missing'), 'leader handoff digest should preserve Research Agent evidence gaps');
  assert.ok(researchStructuredAdditionalPrompt.includes('Channel requirements'), 'downstream planning prompt should expose structured channel requirements');
  assert.ok(researchStructuredAdditionalPrompt.includes('Evidence gaps'), 'downstream planning prompt should expose structured evidence gaps');

  const missingHandoffUsageParentId = 'qa-missing-handoff-usage-parent';
  const missingHandoffUsageCheckpointId = 'qa-missing-handoff-usage-checkpoint';
  const missingHandoffUsagePrepId = 'qa-missing-handoff-usage-prep';
  await qaStorage.mutate(async (draft) => {
    const at = nowIso();
    const priorRuns = [
      {
        taskType: 'research',
        summary: 'Research found the strongest comparison angle in the CAIt marketplace result.',
        bullets: ['CAIt AI agent marketplace offers compare-and-discover positioning.'],
        webSources: [
          {
            title: 'CAIt AI agent marketplace',
            url: 'https://aiagent-marketplace.net/',
            snippet: 'Marketplace positioning for AI agents.'
          }
        ],
        files: [{ name: 'research.md', content: 'CAIt AI agent marketplace https://aiagent-marketplace.net/' }]
      }
    ];
    draft.jobs.push(
      {
        id: missingHandoffUsageParentId,
        jobKind: 'workflow',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        prompt: 'downstream specialist should use handed-off original research information',
        status: 'running',
        createdAt: at,
        startedAt: at,
        workflow: {
          plannedTasks: ['cmo_leader', 'research', 'media_planner', 'landing'],
          childRuns: [],
          leaderSequence: {
            enabled: true,
            status: 'pending',
            checkpoints: [
              { jobId: 'qa-missing-handoff-usage-checkpoint-1', afterLayer: 2, beforeLayer: 3, status: 'completed', completedAt: at },
              { jobId: missingHandoffUsageCheckpointId, afterLayer: 3, beforeLayer: 4, status: 'pending' }
            ],
            checkpointJobId: 'qa-missing-handoff-usage-checkpoint-1',
            checkpointLayer: 2,
            requiredBeforeLayer: 3
          }
        },
        logs: ['missing handoff usage qa parent']
      },
      {
        id: 'qa-missing-handoff-usage-leader',
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        workflowTask: 'cmo_leader',
        workflowAgentName: 'CMO Team Leader',
        prompt: 'initial leader completed',
        status: 'completed',
        assignedAgentId: 'agent_cmo_leader_01',
        workflowParentId: missingHandoffUsageParentId,
        createdAt: at,
        completedAt: at,
        input: { _broker: { workflow: { sequencePhase: 'initial' } } },
        output: { summary: 'initial leader completed', report: { summary: 'initial leader completed', nextAction: 'use research in planning' }, files: [] },
        logs: []
      },
      {
        id: 'qa-missing-handoff-usage-research',
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'research',
        workflowTask: 'research',
        workflowAgentName: 'Research Agent',
        prompt: 'research completed with original sources',
        status: 'completed',
        assignedAgentId: 'agent_research_01',
        workflowParentId: missingHandoffUsageParentId,
        createdAt: at,
        completedAt: at,
        input: { _broker: { workflow: { sequencePhase: 'research', forceWebSearch: true } } },
        output: {
          summary: 'Research cites CAIt AI agent marketplace.',
          report: {
            summary: 'Research cites CAIt AI agent marketplace.',
            bullets: ['CAIt AI agent marketplace is the strongest compare-and-discover angle.'],
            nextAction: 'hand off to planning',
            web_sources: priorRuns[0].webSources
          },
          files: [{ name: 'research.md', content: '# research\nCAIt AI agent marketplace https://aiagent-marketplace.net/' }]
        },
        logs: []
      },
      {
        id: 'qa-missing-handoff-usage-checkpoint-1',
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        workflowTask: 'cmo_leader',
        workflowAgentName: 'CMO Team Leader',
        prompt: 'checkpoint 1 completed',
        status: 'completed',
        assignedAgentId: 'agent_cmo_leader_01',
        workflowParentId: missingHandoffUsageParentId,
        createdAt: at,
        completedAt: at,
        input: { _broker: { workflow: { sequencePhase: 'checkpoint', checkpointLayer: 2, requiredBeforeLayer: 3 } } },
        output: { summary: 'checkpoint 1 completed', report: { summary: 'checkpoint 1 completed' }, files: [] },
        logs: []
      },
      {
        id: 'qa-missing-handoff-usage-planning',
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'media_planner',
        workflowTask: 'media_planner',
        workflowAgentName: 'Media Planner Agent',
        prompt: 'planning completed without using research',
        status: 'completed',
        assignedAgentId: 'agent_media_planner_01',
        workflowParentId: missingHandoffUsageParentId,
        createdAt: at,
        completedAt: at,
        input: { _broker: { workflow: { sequencePhase: 'planning', leaderHandoff: { priorRuns } } } },
        output: {
          summary: 'Planning finished with a generic channel list.',
          report: { summary: 'Planning finished with a generic channel list.', bullets: ['Use directories', 'Use social'], nextAction: 'move to landing' },
          files: [{ name: 'planning.md', content: '# planning\nGeneric channels only.' }]
        },
        logs: []
      },
      {
        id: missingHandoffUsageCheckpointId,
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        workflowTask: 'cmo_leader',
        workflowAgentName: 'CMO Team Leader',
        prompt: 'checkpoint 2 should stay blocked',
        status: 'blocked',
        assignedAgentId: 'agent_cmo_leader_01',
        workflowParentId: missingHandoffUsageParentId,
        createdAt: at,
        input: { _broker: { workflow: { sequencePhase: 'checkpoint', checkpointLayer: 3, requiredBeforeLayer: 4 } } },
        dispatch: { completionStatus: 'leader_checkpoint_blocked' },
        logs: []
      },
      {
        id: missingHandoffUsagePrepId,
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'landing',
        workflowTask: 'landing',
        workflowAgentName: 'Landing Agent',
        prompt: 'prep should stay queued',
        status: 'queued',
        assignedAgentId: 'agent_landing_01',
        workflowParentId: missingHandoffUsageParentId,
        createdAt: at,
        input: { _broker: { workflow: { sequencePhase: 'preparation' } } },
        logs: []
      }
    );
  });
  await request(`/api/jobs/${missingHandoffUsageParentId}`);
  const missingHandoffUsageState = await qaStorage.getState();
  const missingHandoffUsageCheckpoint = missingHandoffUsageState.jobs.find((job) => job.id === missingHandoffUsageCheckpointId);
  const missingHandoffUsageParent = missingHandoffUsageState.jobs.find((job) => job.id === missingHandoffUsageParentId);
  const missingHandoffUsagePlanning = missingHandoffUsageState.jobs.find((job) => job.id === 'qa-missing-handoff-usage-planning');
  const missingHandoffUsagePrep = missingHandoffUsageState.jobs.find((job) => job.id === missingHandoffUsagePrepId);
  assert.equal(missingHandoffUsageCheckpoint?.status, 'blocked', 'next checkpoint should remain blocked when downstream output ignores handed-off original info');
  assert.equal(missingHandoffUsageCheckpoint?.failureCategory, 'leader_quality_gate_failed');
  assert.ok(String(missingHandoffUsageCheckpoint?.failureReason || '').includes('missing_handoff_original_info_usage'));
  assert.equal(missingHandoffUsagePlanning?.qualityGate?.passed, false, 'planning child should record the failed handoff-usage review');
  assert.equal(missingHandoffUsagePrep?.status, 'queued', 'next layer should not release when handoff original info is ignored');
  assert.equal(missingHandoffUsageParent?.status, 'blocked', 'parent workflow should block on handoff original-info quality failure');

  const parallelLayerParentId = 'qa-parallel-layer-parent';
  const parallelLayerLeaderId = 'qa-parallel-layer-leader';
  const parallelLayerRunningId = 'qa-parallel-layer-running';
  const parallelLayerQueuedId = 'qa-parallel-layer-queued';
  const parallelLayerNextId = 'qa-parallel-layer-next';
  await qaStorage.mutate(async (draft) => {
    const at = nowIso();
    draft.jobs.push(
      {
        id: parallelLayerParentId,
        jobKind: 'workflow',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        prompt: 'same-layer parallel dispatch qa',
        status: 'running',
        createdAt: at,
        startedAt: at,
        workflow: {
          plannedTasks: ['cmo_leader', 'research', 'teardown', 'growth'],
          childRuns: []
        },
        logs: ['same-layer parallel dispatch qa parent']
      },
      {
        id: parallelLayerLeaderId,
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        workflowTask: 'cmo_leader',
        workflowAgentName: 'CMO Team Leader',
        prompt: 'leader completed for same-layer parallel dispatch qa',
        status: 'completed',
        assignedAgentId: 'agent_cmo_leader_01',
        workflowParentId: parallelLayerParentId,
        createdAt: at,
        startedAt: at,
        completedAt: at,
        input: { _broker: { workflow: { sequencePhase: 'initial' } } },
        output: {
          summary: 'Leader completed',
          report: { summary: 'Leader completed', bullets: ['release layer 1'], nextAction: 'Run layer 1.' },
          files: []
        },
        logs: ['leader completed']
      },
      {
        id: parallelLayerRunningId,
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'research',
        workflowTask: 'research',
        workflowAgentName: 'Research Agent',
        prompt: 'already running layer 1 child',
        status: 'running',
        assignedAgentId: 'agent_research_01',
        workflowParentId: parallelLayerParentId,
        createdAt: at,
        startedAt: at,
        input: { _broker: { workflow: { sequencePhase: 'research' } } },
        dispatch: { completionStatus: 'dispatch_scheduled', dispatchRequestedAt: at },
        logs: ['already running layer 1 child']
      },
      {
        id: parallelLayerQueuedId,
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'teardown',
        workflowTask: 'teardown',
        workflowAgentName: 'Competitor Teardown Agent',
        prompt: 'queued layer 1 child should start despite running sibling',
        status: 'queued',
        assignedAgentId: 'agent_teardown_01',
        workflowParentId: parallelLayerParentId,
        createdAt: at,
        input: { _broker: { workflow: { sequencePhase: 'research' } } },
        logs: ['queued layer 1 child']
      },
      {
        id: parallelLayerNextId,
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'growth',
        workflowTask: 'growth',
        workflowAgentName: 'Growth Operator Agent',
        prompt: 'queued layer 2 child should wait for layer 1',
        status: 'queued',
        assignedAgentId: 'agent_growth_01',
        workflowParentId: parallelLayerParentId,
        createdAt: at,
        input: { _broker: { workflow: { sequencePhase: 'action' } } },
        logs: ['queued layer 2 child']
      }
    );
  });
  const parallelLayerPoll = await request(`/api/jobs/${parallelLayerParentId}`);
  assert.equal(parallelLayerPoll.status, 200);
  const parallelLayerState = await qaStorage.getState();
  const parallelLayerQueued = parallelLayerState.jobs.find((job) => job.id === parallelLayerQueuedId);
  const parallelLayerNext = parallelLayerState.jobs.find((job) => job.id === parallelLayerNextId);
  assert.notEqual(parallelLayerQueued?.status, 'queued', 'queued same-layer child should dispatch even when a sibling is already running');
  assert.equal(parallelLayerNext?.status, 'queued', 'next-layer child should remain queued until earlier layer finishes');

  const sameLayerFanoutParentId = 'qa-same-layer-fanout-parent';
  const sameLayerFanoutResearchId = 'qa-same-layer-fanout-research';
  const sameLayerFanoutTeardownId = 'qa-same-layer-fanout-teardown';
  const sameLayerFanoutValidationId = 'qa-same-layer-fanout-validation';
  await qaStorage.mutate(async (draft) => {
    const at = nowIso();
    draft.jobs.push(
      {
        id: sameLayerFanoutParentId,
        jobKind: 'workflow',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        prompt: 'same-layer fan-out dispatch qa',
        status: 'running',
        createdAt: at,
        startedAt: at,
        workflow: {
          plannedTasks: ['cmo_leader', 'research', 'teardown', 'validation', 'growth'],
          childRuns: []
        },
        logs: ['same-layer fan-out dispatch qa parent']
      },
      {
        id: `${sameLayerFanoutParentId}-leader`,
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        workflowTask: 'cmo_leader',
        workflowAgentName: 'CMO Team Leader',
        prompt: 'leader completed for same-layer fan-out dispatch qa',
        status: 'completed',
        assignedAgentId: 'agent_cmo_leader_01',
        workflowParentId: sameLayerFanoutParentId,
        createdAt: at,
        startedAt: at,
        completedAt: at,
        input: { _broker: { workflow: { sequencePhase: 'initial' } } },
        output: {
          summary: 'Leader completed',
          report: { summary: 'Leader completed', bullets: ['release layer 2 fan-out'], nextAction: 'Run research and teardown.' },
          files: []
        },
        logs: ['leader completed']
      },
      {
        id: sameLayerFanoutResearchId,
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'research',
        workflowTask: 'research',
        workflowAgentName: 'Research Agent',
        prompt: 'queued research layer child should start in the same poll',
        status: 'queued',
        assignedAgentId: 'agent_research_01',
        workflowParentId: sameLayerFanoutParentId,
        createdAt: at,
        input: { _broker: { workflow: { sequencePhase: 'research' } } },
        logs: ['queued research layer child']
      },
      {
        id: sameLayerFanoutTeardownId,
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'teardown',
        workflowTask: 'teardown',
        workflowAgentName: 'Competitor Teardown Agent',
        prompt: 'queued teardown layer child should start in the same poll',
        status: 'queued',
        assignedAgentId: 'agent_teardown_01',
        workflowParentId: sameLayerFanoutParentId,
        createdAt: at,
        input: { _broker: { workflow: { sequencePhase: 'research' } } },
        logs: ['queued teardown layer child']
      },
      {
        id: sameLayerFanoutValidationId,
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'validation',
        workflowTask: 'validation',
        workflowAgentName: 'Validation Agent',
        prompt: 'queued validation layer child should start in the same poll',
        status: 'queued',
        assignedAgentId: 'agent_validation_01',
        workflowParentId: sameLayerFanoutParentId,
        createdAt: at,
        input: { _broker: { workflow: { sequencePhase: 'research' } } },
        logs: ['queued validation layer child']
      }
    );
  });
  const sameLayerFanoutPoll = await request(`/api/jobs/${sameLayerFanoutParentId}`);
  assert.equal(sameLayerFanoutPoll.status, 200);
  const sameLayerFanoutState = await qaStorage.getState();
  const sameLayerFanoutResearch = sameLayerFanoutState.jobs.find((job) => job.id === sameLayerFanoutResearchId);
  const sameLayerFanoutTeardown = sameLayerFanoutState.jobs.find((job) => job.id === sameLayerFanoutTeardownId);
  const sameLayerFanoutValidation = sameLayerFanoutState.jobs.find((job) => job.id === sameLayerFanoutValidationId);
  assert.notEqual(sameLayerFanoutResearch?.status, 'queued', 'first same-layer queued child should dispatch during the same progress poll');
  assert.notEqual(sameLayerFanoutTeardown?.status, 'queued', 'second same-layer queued child should dispatch during the same progress poll');
  assert.notEqual(sameLayerFanoutValidation?.status, 'queued', 'third same-layer queued child should dispatch during the same progress poll');

  const serialUserActionParentId = 'qa-serial-user-action-parent';
  const serialUserActionBlockedId = 'qa-serial-user-action-blocked';
  const serialUserActionQueuedId = 'qa-serial-user-action-queued';
  await qaStorage.mutate(async (draft) => {
    const at = nowIso();
    draft.jobs.push(
      {
        id: serialUserActionParentId,
        jobKind: 'workflow',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        prompt: 'approval and OAuth waits should stay one at a time',
        status: 'running',
        createdAt: at,
        startedAt: at,
        workflow: {
          plannedTasks: ['cmo_leader', 'research', 'media_planner', 'seo_specialist', 'x_post', 'email_ops'],
          childRuns: []
        },
        logs: ['serial user action qa parent']
      },
      {
        id: `${serialUserActionParentId}-leader`,
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        workflowTask: 'cmo_leader',
        workflowAgentName: 'CMO Team Leader',
        prompt: 'leader completed for serial user action qa',
        status: 'completed',
        assignedAgentId: 'agent_cmo_leader_01',
        workflowParentId: serialUserActionParentId,
        createdAt: at,
        startedAt: at,
        completedAt: at,
        input: { _broker: { workflow: { sequencePhase: 'initial' } } },
        output: {
          summary: 'Leader completed',
          report: { summary: 'Leader completed', bullets: ['release action layer'], nextAction: 'Run approval-gated actions.' },
          files: []
        },
        logs: ['leader completed']
      },
      ...['research', 'media_planner', 'seo_specialist'].map((task) => ({
        id: `${serialUserActionParentId}-${task}`,
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: task,
        workflowTask: task,
        workflowAgentName: task,
        prompt: `${task} completed before action`,
        status: 'completed',
        assignedAgentId: task === 'research' ? 'agent_research_01' : (task === 'media_planner' ? 'agent_media_planner_01' : 'agent_seospecialist_01'),
        workflowParentId: serialUserActionParentId,
        createdAt: at,
        startedAt: at,
        completedAt: at,
        input: { _broker: { workflow: { sequencePhase: task === 'research' ? 'research' : (task === 'media_planner' ? 'planning' : 'preparation') } } },
        output: {
          summary: `${task} completed`,
          report: { summary: `${task} completed`, bullets: [`${task} complete`], nextAction: 'Continue.' },
          files: []
        },
        logs: [`${task} completed`]
      })),
      {
        id: serialUserActionBlockedId,
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'x_post',
        workflowTask: 'x_post',
        workflowAgentName: 'X Ops Connector Agent',
        prompt: 'blocked X action lane',
        status: 'blocked',
        assignedAgentId: 'agent_x_launch_01',
        workflowParentId: serialUserActionParentId,
        createdAt: at,
        input: { _broker: { workflow: { sequencePhase: 'action' } } },
        output: {
          summary: 'X OAuth is required.',
          report: {
            summary: 'X OAuth is required.',
            bullets: ['X OAuth required.'],
            nextAction: 'Connect X.',
            authority_request: {
              reason: 'X OAuth is required before posting.',
              missing_connectors: ['x'],
              missing_connector_capabilities: ['x.post'],
              source: 'adaptive_agent_preflight'
            }
          },
          files: []
        },
        failureReason: 'X OAuth is required before posting.',
        failureCategory: 'blocked_waiting_for_approval',
        dispatch: { completionStatus: 'blocked_waiting_for_approval', retryable: false },
        logs: ['blocked waiting for authority approval']
      },
      {
        id: serialUserActionQueuedId,
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'email_ops',
        workflowTask: 'email_ops',
        workflowAgentName: 'Email Ops Agent',
        prompt: 'queued email action lane should not start while X OAuth is waiting',
        status: 'queued',
        assignedAgentId: 'agent_email_ops_01',
        workflowParentId: serialUserActionParentId,
        createdAt: at,
        input: { _broker: { workflow: { sequencePhase: 'action' } } },
        logs: ['queued email action lane']
      }
    );
  });
  const serialUserActionPoll = await request(`/api/jobs/${serialUserActionParentId}`);
  assert.equal(serialUserActionPoll.status, 200);
  const serialUserActionState = await qaStorage.getState();
  const serialUserActionQueued = serialUserActionState.jobs.find((job) => job.id === serialUserActionQueuedId);
  assert.equal(serialUserActionQueued?.status, 'queued', 'a second approval/OAuth lane should stay queued while another user-action wait is active');
  assert.equal(serialUserActionQueued?.dispatch?.completionStatus || '', '', 'queued approval/OAuth lane should not receive a dispatch lock while another wait is active');

  const cronGateParentId = 'qa-cron-gate-parent';
  const cronGateLeaderId = 'qa-cron-gate-leader';
  const cronGateRunningResearchId = 'qa-cron-gate-running-research';
  const cronGateQueuedActionId = 'qa-cron-gate-queued-action';
  await qaStorage.mutate(async (draft) => {
    const early = '1900-01-01T00:00:00.000Z';
    const recent = nowIso();
    draft.jobs.push(
      {
        id: cronGateParentId,
        jobKind: 'workflow',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        prompt: 'cron sweep must respect workflow layer gate',
        status: 'running',
        createdAt: nowIso(),
        startedAt: recent,
        workflow: {
          plannedTasks: ['cmo_leader', 'research', 'growth'],
          childRuns: []
        },
        logs: ['cron workflow gate qa parent']
      },
      {
        id: cronGateLeaderId,
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        workflowTask: 'cmo_leader',
        workflowAgentName: 'CMO Team Leader',
        prompt: 'leader completed for cron workflow gate qa',
        status: 'completed',
        assignedAgentId: 'agent_cmo_leader_01',
        workflowParentId: cronGateParentId,
        createdAt: nowIso(),
        startedAt: recent,
        completedAt: recent,
        input: { _broker: { workflow: { sequencePhase: 'initial' } } },
        output: {
          summary: 'Leader completed',
          report: { summary: 'Leader completed', bullets: ['release research before action'], nextAction: 'Run research first.' },
          files: []
        },
        logs: ['leader completed']
      },
      {
        id: cronGateRunningResearchId,
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'research',
        workflowTask: 'research',
        workflowAgentName: 'Research Agent',
        prompt: 'running layer 1 child blocks later action',
        status: 'running',
        assignedAgentId: 'agent_research_01',
        workflowParentId: cronGateParentId,
        createdAt: early,
        startedAt: recent,
        input: { _broker: { workflow: { sequencePhase: 'research' } } },
        logs: ['running layer 1 child']
      },
      {
        id: cronGateQueuedActionId,
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'growth',
        workflowTask: 'growth',
        workflowAgentName: 'Growth Operator Agent',
        prompt: 'queued layer 2 action must not be cron-dispatched directly',
        status: 'queued',
        assignedAgentId: 'agent_growth_01',
        workflowParentId: cronGateParentId,
        createdAt: early,
        input: { _broker: { workflow: { sequencePhase: 'action' } } },
        logs: ['queued layer 2 action']
      }
    );
  });
  const cronGateWaits = [];
  setWorkerApiQaSelfFetchEnv(qaSearchEnv);
  await worker.scheduled({ cron: '*/15 * * * *', scheduledTime: Date.now() }, qaSearchEnv, {
    waitUntil: (promise) => cronGateWaits.push(Promise.resolve(promise))
  });
  for (let waitIndex = 0; waitIndex < cronGateWaits.length; waitIndex += 1) {
    await cronGateWaits[waitIndex].catch(() => {});
  }
  const cronGateState = await qaStorage.getState();
  const cronGateQueuedAction = cronGateState.jobs.find((job) => job.id === cronGateQueuedActionId);
  assert.equal(cronGateQueuedAction?.status, 'queued', 'cron dispatch sweep must not execute later-layer workflow children directly');
  assert.notEqual(
    String(cronGateQueuedAction?.dispatch?.completionStatus || '').toLowerCase(),
    'dispatch_scheduled',
    'cron dispatch sweep must route workflow children through the parent workflow gate'
  );

  const scheduledRecoveryParentId = 'qa-scheduled-recovery-parent';
  const scheduledRecoveryChildId = 'qa-scheduled-recovery-child';
  await qaStorage.mutate(async (draft) => {
    const early = '1999-01-01T00:00:00.000Z';
    const recent = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    draft.jobs.push(
      {
        id: scheduledRecoveryParentId,
        jobKind: 'workflow',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        prompt: 'scheduled OpenAI workflow recovery parent',
        status: 'running',
        createdAt: recent,
        startedAt: early,
        workflow: {
          plannedTasks: ['cmo_leader'],
          childRuns: []
        },
        logs: ['scheduled recovery qa parent']
      },
      {
        id: scheduledRecoveryChildId,
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        workflowTask: 'cmo_leader',
        workflowAgentName: 'CMO Team Leader',
        prompt: 'scheduled OpenAI workflow recovery child',
        status: 'running',
        assignedAgentId: 'agent_cmo_leader_01',
        workflowParentId: scheduledRecoveryParentId,
        createdAt: recent,
        startedAt: early,
        input: { _broker: { workflow: { sequencePhase: 'initial', primaryTask: 'cmo_leader' } } },
        dispatch: {
          completionStatus: 'dispatch_scheduled',
          firstDispatchRequestedAt: early,
          dispatchRequestedAt: early,
          scheduleAttempts: 1,
          retryable: true,
          maxRetries: 2
        },
        logs: ['stuck scheduled OpenAI child']
      }
    );
  });
  const scheduledRecoveryWaits = [];
  setWorkerApiQaSelfFetchEnv(qaSearchEnv);
  await worker.scheduled({ cron: '*/15 * * * *', scheduledTime: Date.now() }, qaSearchEnv, {
    waitUntil: (promise) => scheduledRecoveryWaits.push(Promise.resolve(promise))
  });
  for (let waitIndex = 0; waitIndex < scheduledRecoveryWaits.length; waitIndex += 1) {
    await scheduledRecoveryWaits[waitIndex].catch(() => {});
  }
  const scheduledRecoveryState = await qaStorage.getState();
  const scheduledRecoveryChild = scheduledRecoveryState.jobs.find((job) => job.id === scheduledRecoveryChildId);
  assert.notEqual(
    scheduledRecoveryChild?.status,
    'running',
    `cron completion sweep should recover a stale dispatch_scheduled workflow child through endpoint dispatch; child=${JSON.stringify({ status: scheduledRecoveryChild?.status, dispatch: scheduledRecoveryChild?.dispatch, failureReason: scheduledRecoveryChild?.failureReason, logs: scheduledRecoveryChild?.logs })}`
  );
  assert.notEqual(
    String(scheduledRecoveryChild?.dispatch?.completionStatus || '').toLowerCase(),
    'dispatch_scheduled',
    'cron completion sweep should move stale scheduled workflow children out of dispatch_scheduled'
  );

  const minuteFallbackParentId = 'qa-minute-fallback-parent';
  const minuteFallbackChildId = 'qa-minute-fallback-child';
  await qaStorage.mutate(async (draft) => {
    const early = '1999-01-01T00:00:00.000Z';
    const recent = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    draft.jobs.push(
      {
        id: minuteFallbackParentId,
        jobKind: 'workflow',
        parentAgentId: 'qa-runner',
        taskType: 'cpo_leader',
        prompt: 'minute cron fallback parent',
        status: 'running',
        createdAt: recent,
        workflow: {
          plannedTasks: ['cpo_leader'],
          childRuns: []
        },
        logs: ['minute fallback qa parent']
      },
      {
        id: minuteFallbackChildId,
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'cpo_leader',
        workflowTask: 'cpo_leader',
        workflowAgentName: 'CPO Team Leader',
        prompt: 'minute cron fallback child',
        status: 'running',
        assignedAgentId: 'agent_cpo_leader_01',
        workflowParentId: minuteFallbackParentId,
        createdAt: recent,
        startedAt: early,
        input: { _broker: { workflow: { sequencePhase: 'initial', primaryTask: 'cpo_leader' } } },
        dispatch: {
          completionStatus: 'dispatch_scheduled',
          firstDispatchRequestedAt: early,
          dispatchRequestedAt: early,
          scheduleAttempts: 1,
          retryable: true,
          maxRetries: 2
        },
        logs: ['minute fallback stale scheduled child']
      }
    );
  });
  const fetchBeforeMinuteFallback = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input?.url;
    if (String(url || '').includes('/api/internal/cron/workflow-completions')) {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'content-type': 'application/json' } });
    }
    return fetchBeforeMinuteFallback(input, init);
  };
  try {
    const minuteFallbackWaits = [];
    const minuteFallbackEnv = {
      ...qaSearchEnv,
      WORKFLOW_COMPLETION_SWEEP_INTERNAL_FETCH_ENABLED: 'true'
    };
    setWorkerApiQaSelfFetchEnv( minuteFallbackEnv);
    await worker.scheduled({ cron: '* * * * *', scheduledTime: Date.now() }, minuteFallbackEnv, {
      waitUntil: (promise) => minuteFallbackWaits.push(Promise.resolve(promise))
    });
    for (let waitIndex = 0; waitIndex < minuteFallbackWaits.length; waitIndex += 1) {
      await minuteFallbackWaits[waitIndex].catch(() => {});
    }
  } finally {
    globalThis.fetch = fetchBeforeMinuteFallback;
  }
  const minuteFallbackState = await qaStorage.getState();
  const minuteFallbackChild = minuteFallbackState.jobs.find((job) => job.id === minuteFallbackChildId);
  assert.notEqual(
    minuteFallbackChild?.status,
    'running',
    'minute cron should recover stale dispatch_scheduled jobs through endpoint dispatch'
  );
  assert.notEqual(
    String(minuteFallbackChild?.dispatch?.completionStatus || '').toLowerCase(),
    'dispatch_scheduled',
    'minute cron endpoint dispatch recovery must move stale scheduled workflow children out of dispatch_scheduled'
  );
  assert.ok(
    (minuteFallbackChild?.logs || []).some((line) => /endpoint dispatch|dispatched to/.test(String(line || ''))),
    'minute cron endpoint recovery should leave an observable child log'
  );

  const queueDispatchChildId = 'qa-queue-dispatch-child';
  const queueDispatchParentId = 'qa-queue-dispatch-parent';
  const queueMessages = [];
  const queueEnv = {
    ...qaSearchEnv,
    SCHEDULED_BUILTIN_COMPLETION_SWEEP_LIMIT: '10',
    WORKFLOW_DISPATCH_QUEUE: {
      async send(body, options) {
        queueMessages.push({ body, options });
      }
    }
  };
  await qaStorage.mutate(async (draft) => {
    const early = '1999-01-01T00:00:00.000Z';
    draft.jobs.push(
      {
        id: queueDispatchParentId,
        jobKind: 'workflow',
        parentAgentId: 'qa-runner',
        taskType: 'research_team_leader',
        prompt: 'queue-backed workflow parent',
        status: 'running',
        createdAt: nowIso(),
        startedAt: nowIso(),
        workflow: {
          plannedTasks: ['research'],
          childRuns: []
        },
        logs: []
      },
      {
        id: queueDispatchChildId,
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'research',
        workflowTask: 'research',
        workflowAgentName: 'Research Agent',
        prompt: 'workflow child should be dispatched to its agent endpoint by cron, not generated by Worker queue code',
        status: 'running',
        assignedAgentId: 'agent_research_01',
        workflowParentId: queueDispatchParentId,
        createdAt: nowIso(),
        startedAt: early,
        input: { _broker: { workflow: { sequencePhase: 'research' } } },
        dispatch: {
          completionStatus: 'dispatch_scheduled',
          firstDispatchRequestedAt: early,
          dispatchRequestedAt: early,
          scheduleAttempts: 1,
          retryable: true,
          maxRetries: 2
        },
        logs: ['queue dispatch child']
      }
    );
  });
  const queueDispatchWaits = [];
  setWorkerApiQaSelfFetchEnv(queueEnv);
  await worker.scheduled({ cron: '* * * * *', scheduledTime: Date.now() }, queueEnv, {
    waitUntil: (promise) => queueDispatchWaits.push(Promise.resolve(promise))
  });
  for (let waitIndex = 0; waitIndex < queueDispatchWaits.length; waitIndex += 1) {
    await queueDispatchWaits[waitIndex];
  }
  const queueDispatchQueuedState = await qaStorage.getState();
  const queueDispatchQueuedChild = queueDispatchQueuedState.jobs.find((job) => job.id === queueDispatchChildId);
  const forbiddenWorkflowCompletionKind = ['built', 'in', 'workflow', 'completion'].join('_');
  assert.equal(queueMessages.filter((message) => String(message?.body?.kind || '') === forbiddenWorkflowCompletionKind).length, 0, 'cron should not enqueue legacy workflow completion messages when endpoint dispatch is available');
  const endpointDispatchMessages = queueMessages.filter((message) => String(message?.body?.kind || '') === 'endpoint_dispatch');
  assert.equal(endpointDispatchMessages.filter((message) => String(message?.body?.jobId || '') === queueDispatchChildId).length, 1, 'cron should enqueue the target child through normal endpoint dispatch exactly once');
  assert.notEqual(
    String(queueDispatchQueuedChild?.dispatch?.completionStatus || ''),
    'completion_queued',
    'workflow dispatch child should not be moved into the legacy completion queue'
  );
  let queueAcked = false;
  const queuedEndpointMessage = endpointDispatchMessages.find((message) => String(message?.body?.jobId || '') === queueDispatchChildId);
  assert.ok(queuedEndpointMessage, 'endpoint dispatch queue message should be available for queue consumer QA');
  await worker.queue({
    messages: [
      {
        body: queuedEndpointMessage.body,
        ack() {
          queueAcked = true;
        }
      }
    ]
  }, queueEnv, { waitUntil() {} });
  assert.equal(queueAcked, true, 'endpoint dispatch queue consumer should ack processed messages');
  const queueDispatchCompletedState = await qaStorage.getState();
  const queueDispatchCompletedChild = queueDispatchCompletedState.jobs.find((job) => job.id === queueDispatchChildId);
  assert.ok(
    (queueDispatchCompletedChild?.logs || []).some((line) => /endpoint dispatch|dispatched to/.test(String(line || ''))),
    `endpoint dispatch should leave an observable child log; logs=${(queueDispatchCompletedChild?.logs || []).join(' | ')}`
  );
  assert.notEqual(
    String(queueDispatchCompletedChild?.dispatch?.completionStatus || ''),
    'completion_queued',
    `endpoint dispatch queue consumer should not put jobs back into completion_queued; events=${queueDispatchCompletedState.events.slice(-10).map((event) => event.message).join(' | ')}`
  );

  const lostQueueChildId = 'qa-lost-queue-child';
  const lostQueueParentId = 'qa-lost-queue-parent';
  await qaStorage.mutate(async (draft) => {
    const early = '1970-01-01T00:00:00.000Z';
    draft.jobs.push(
      {
        id: lostQueueParentId,
        jobKind: 'workflow',
        parentAgentId: 'qa-runner',
        taskType: 'research_team_leader',
        prompt: 'lost queue workflow parent',
        status: 'running',
        createdAt: nowIso(),
        startedAt: nowIso(),
        workflow: {
          plannedTasks: ['research'],
          childRuns: []
        },
        logs: []
      },
      {
        id: lostQueueChildId,
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'research',
        workflowTask: 'research',
        workflowAgentName: 'Research Agent',
        prompt: 'stale completion_queued workflow child should be recovered by cron',
        status: 'running',
        assignedAgentId: 'agent_research_01',
        workflowParentId: lostQueueParentId,
        createdAt: nowIso(),
        startedAt: early,
        input: { _broker: { workflow: { sequencePhase: 'research', forceWebSearch: true, webSearchRequiredReason: 'leader_research_layer' } } },
        dispatch: {
          completionStatus: 'completion_queued',
          firstDispatchRequestedAt: early,
          dispatchRequestedAt: early,
          completionQueueRequestedAt: early,
          completionQueueAttempts: 1,
          scheduleAttempts: 1,
          retryable: false,
          maxRetries: 2
        },
        logs: ['lost queue child']
      }
    );
  });
  const lostQueueWaits = [];
  setWorkerApiQaSelfFetchEnv(queueEnv);
  await worker.scheduled({ cron: '* * * * *', scheduledTime: Date.now() }, queueEnv, {
    waitUntil: (promise) => lostQueueWaits.push(Promise.resolve(promise))
  });
  for (let waitIndex = 0; waitIndex < lostQueueWaits.length; waitIndex += 1) {
    await lostQueueWaits[waitIndex];
  }
  const lostQueueState = await qaStorage.getState();
  const lostQueueChild = lostQueueState.jobs.find((job) => job.id === lostQueueChildId);
  assert.notEqual(
    String(lostQueueChild?.dispatch?.completionStatus || ''),
    'completion_queued',
    `minute cron should recover stale completion_queued workflow children when a queue message is lost or acked without durable completion; child=${JSON.stringify({ status: lostQueueChild?.status, dispatch: lostQueueChild?.dispatch, logs: lostQueueChild?.logs })}; events=${lostQueueState.events.slice(-20).map((event) => event.message).join(' | ')}`
  );
  assert.ok(
    (lostQueueChild?.logs || []).some((line) => /endpoint dispatch|dispatched to/.test(String(line || ''))),
    'stale completion_queued recovery should leave an observable endpoint-dispatch log'
  );

  const exhaustedQueueChildId = 'qa-exhausted-queue-child';
  const exhaustedQueueParentId = 'qa-exhausted-queue-parent';
  await qaStorage.mutate(async (draft) => {
    const early = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    draft.jobs.push(
      {
        id: exhaustedQueueParentId,
        jobKind: 'workflow',
        parentAgentId: 'qa-runner',
        taskType: 'research_team_leader',
        prompt: 'queue attempt exhaustion workflow parent',
        status: 'running',
        createdAt: early,
        startedAt: early,
        workflow: {
          plannedTasks: ['research'],
          childRuns: []
        },
        logs: []
      },
      {
        id: exhaustedQueueChildId,
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'research',
        workflowTask: 'research',
        workflowAgentName: 'Research Agent',
        prompt: 'dispatch_scheduled workflow child should recover directly after repeated queue requests',
        status: 'running',
        assignedAgentId: 'agent_research_01',
        workflowParentId: exhaustedQueueParentId,
        createdAt: early,
        startedAt: early,
        input: { _broker: { workflow: { sequencePhase: 'research', forceWebSearch: true, webSearchRequiredReason: 'leader_research_layer' } } },
        dispatch: {
          completionStatus: 'dispatch_scheduled',
          firstDispatchRequestedAt: early,
          dispatchRequestedAt: early,
          completionQueueRequestedAt: early,
          completionQueueAttempts: 3,
          scheduleAttempts: 3,
          retryable: true,
          maxRetries: 10
        },
        logs: ['queue attempt exhaustion child']
      }
    );
  });
  const exhaustedQueueWaits = [];
  setWorkerApiQaSelfFetchEnv(queueEnv);
  await worker.scheduled({ cron: '* * * * *', scheduledTime: Date.now() }, queueEnv, {
    waitUntil: (promise) => exhaustedQueueWaits.push(Promise.resolve(promise))
  });
  for (let waitIndex = 0; waitIndex < exhaustedQueueWaits.length; waitIndex += 1) {
    await exhaustedQueueWaits[waitIndex];
  }
  const exhaustedQueueState = await qaStorage.getState();
  const exhaustedQueueChild = exhaustedQueueState.jobs.find((job) => job.id === exhaustedQueueChildId);
  assert.notEqual(
    String(exhaustedQueueChild?.dispatch?.completionStatus || ''),
    'completion_queue_exhausted',
    `repeated queue requests should direct-recover instead of exhausting; child=${JSON.stringify({ status: exhaustedQueueChild?.status, dispatch: exhaustedQueueChild?.dispatch, failureReason: exhaustedQueueChild?.failureReason, logs: exhaustedQueueChild?.logs })}`
  );
  assert.equal(
    ['failed', 'timed_out'].includes(String(exhaustedQueueChild?.status || '').toLowerCase()),
    false,
    `repeated queue requests must not fail the child before direct recovery; child=${JSON.stringify({ status: exhaustedQueueChild?.status, dispatch: exhaustedQueueChild?.dispatch, failureReason: exhaustedQueueChild?.failureReason })}`
  );
  assert.ok(
    (exhaustedQueueChild?.logs || []).some((line) => /endpoint dispatch|dispatched to/.test(String(line || ''))),
    `endpoint recovery should leave a durable child log; logs=${(exhaustedQueueChild?.logs || []).join(' | ')}`
  );

  const watchdogReleaseParentId = 'qa-watchdog-release-parent';
  const watchdogReleaseLeaderId = 'qa-watchdog-release-leader';
  const watchdogReleaseResearchId = 'qa-watchdog-release-research';
  const watchdogReleaseCheckpointId = 'qa-watchdog-release-checkpoint';
  const watchdogReleaseActionId = 'qa-watchdog-release-action';
  await qaStorage.mutate(async (draft) => {
    const early = '1999-01-01T00:00:00.000Z';
    draft.jobs.push(
      {
        id: watchdogReleaseParentId,
        jobKind: 'workflow',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        prompt: 'watchdog should release stale checkpoint after research finished',
        status: 'running',
        createdAt: early,
        startedAt: early,
        workflow: {
          plannedTasks: ['cmo_leader', 'research', 'growth'],
          childRuns: [],
          leaderSequence: {
            enabled: true,
            status: 'pending',
            checkpointJobId: watchdogReleaseCheckpointId,
            checkpointLayer: 2,
            requiredBeforeLayer: 3,
            checkpoints: [
              { jobId: watchdogReleaseCheckpointId, afterLayer: 2, beforeLayer: 3, status: 'pending' }
            ]
          }
        },
        logs: ['watchdog release qa parent']
      },
      {
        id: watchdogReleaseLeaderId,
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        workflowTask: 'cmo_leader',
        workflowAgentName: 'CMO Team Leader',
        prompt: 'initial leader completed',
        status: 'completed',
        assignedAgentId: 'agent_cmo_leader_01',
        workflowParentId: watchdogReleaseParentId,
        createdAt: early,
        completedAt: early,
        input: { _broker: { workflow: { sequencePhase: 'initial' } } },
        output: {
          summary: 'Leader completed after research planning',
          report: { summary: 'Leader completed after research planning', bullets: ['research first', 'then growth'], nextAction: 'Run checkpoint.' },
          files: []
        },
        logs: ['watchdog release leader completed']
      },
      {
        id: watchdogReleaseResearchId,
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'research',
        workflowTask: 'research',
        workflowAgentName: 'Research Agent',
        prompt: 'research completed',
        status: 'completed',
        assignedAgentId: 'agent_research_01',
        workflowParentId: watchdogReleaseParentId,
        createdAt: early,
        completedAt: early,
        input: { _broker: { workflow: { sequencePhase: 'research' } } },
        output: {
          summary: 'Research found concrete audience and source evidence.',
          report: {
            summary: 'Research found concrete audience and source evidence.',
            bullets: ['engineers need proof', 'signup path must be clear'],
            web_sources: [{ title: 'Source', url: 'https://example.test/source', snippet: 'signup path must be clear', query: 'signup path source evidence', action: 'brave_search' }]
          },
          files: [{ name: 'research.md', content: 'Research found concrete audience and source evidence for engineers and signups.' }]
        },
        logs: ['watchdog release research completed']
      },
      {
        id: watchdogReleaseCheckpointId,
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        workflowTask: 'cmo_leader',
        workflowAgentName: 'CMO Team Leader',
        prompt: 'checkpoint should be released by watchdog',
        status: 'blocked',
        assignedAgentId: 'agent_cmo_leader_01',
        workflowParentId: watchdogReleaseParentId,
        createdAt: early,
        input: { _broker: { workflow: { sequencePhase: 'checkpoint', checkpointLayer: 2, requiredBeforeLayer: 3 } } },
        dispatch: { completionStatus: 'leader_checkpoint_blocked' },
        logs: ['watchdog release checkpoint blocked']
      },
      {
        id: watchdogReleaseActionId,
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'growth',
        workflowTask: 'growth',
        workflowAgentName: 'Growth Operator Agent',
        prompt: 'action waits for checkpoint',
        status: 'queued',
        assignedAgentId: 'agent_growth_01',
        workflowParentId: watchdogReleaseParentId,
        createdAt: early,
        input: { _broker: { workflow: { sequencePhase: 'planning' } } },
        logs: ['watchdog release action queued']
      }
    );
  });
  const watchdogWaits = [];
  setWorkerApiQaSelfFetchEnv(qaSearchEnv);
  await worker.scheduled({ cron: '*/15 * * * *', scheduledTime: Date.now() }, qaSearchEnv, {
    waitUntil: (promise) => watchdogWaits.push(Promise.resolve(promise))
  });
  for (let waitIndex = 0; waitIndex < watchdogWaits.length; waitIndex += 1) {
    await watchdogWaits[waitIndex].catch(() => {});
  }
  const watchdogReleaseState = await qaStorage.getState();
  const watchdogReleaseCheckpoint = watchdogReleaseState.jobs.find((job) => job.id === watchdogReleaseCheckpointId);
  assert.ok(
    (watchdogReleaseCheckpoint?.logs || []).some((line) => String(line || '').includes('cron orchestration watchdog dispatch')),
    'watchdog should schedule a stale checkpoint after prior research has completed'
  );
  assert.notEqual(
    String(watchdogReleaseCheckpoint?.dispatch?.completionStatus || '').toLowerCase(),
    'leader_checkpoint_blocked',
    'stale checkpoint should not remain in the initial blocked gate after watchdog reconciliation'
  );

  const queuedCheckpointRepairParentId = 'qa-queued-checkpoint-repair-parent';
  const queuedCheckpointRepairLeaderId = 'qa-queued-checkpoint-repair-leader';
  const queuedCheckpointRepairPlanId = 'qa-queued-checkpoint-repair-plan';
  const queuedCheckpointRepairCheckpointId = 'qa-queued-checkpoint-repair-checkpoint';
  const queuedCheckpointRepairPreparationId = 'qa-queued-checkpoint-repair-preparation';
  await qaStorage.mutate(async (draft) => {
    const early = '1999-01-02T00:00:00.000Z';
    draft.jobs.push(
      {
        id: queuedCheckpointRepairParentId,
        jobKind: 'workflow',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        prompt: 'repair checkpoint row that was marked queued in workflow but remained blocked in child row',
        status: 'running',
        createdAt: early,
        startedAt: early,
        workflow: {
          plannedTasks: ['cmo_leader', 'media_planner', 'seo_specialist'],
          childRuns: [],
          leaderSequence: {
            enabled: true,
            status: 'pending',
            checkpointLayer: 3,
            requiredBeforeLayer: 4,
            checkpoints: [
              { jobId: queuedCheckpointRepairCheckpointId, afterLayer: 3, beforeLayer: 4, status: 'queued', queuedAt: early }
            ]
          }
        },
        logs: ['queued checkpoint repair qa parent']
      },
      {
        id: queuedCheckpointRepairLeaderId,
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        workflowTask: 'cmo_leader',
        workflowAgentName: 'CMO Team Leader',
        prompt: 'initial leader completed',
        status: 'completed',
        assignedAgentId: 'agent_cmo_leader_01',
        workflowParentId: queuedCheckpointRepairParentId,
        createdAt: early,
        completedAt: early,
        input: { _broker: { workflow: { sequencePhase: 'initial' } } },
        output: {
          summary: 'Leader has enough context to continue.',
          report: { summary: 'Leader has enough context to continue.', bullets: ['planning complete'], nextAction: 'Run checkpoint.' },
          files: []
        },
        logs: ['queued checkpoint repair leader completed']
      },
      {
        id: queuedCheckpointRepairPlanId,
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'media_planner',
        workflowTask: 'media_planner',
        workflowAgentName: 'Media Planner Agent',
        prompt: 'planning completed',
        status: 'completed',
        assignedAgentId: 'agent_media_planner_01',
        workflowParentId: queuedCheckpointRepairParentId,
        createdAt: early,
        completedAt: early,
        input: { _broker: { workflow: { sequencePhase: 'planning', dispatchLayer: 3 } } },
        output: {
          summary: 'Media planner selected SEO and developer social as primary lanes.',
          report: {
            summary: 'Media planner selected SEO and developer social as primary lanes.',
            bullets: ['SEO lane', 'developer social lane'],
            nextAction: 'Prepare SEO artifacts.',
            web_sources: [{ title: 'Planner source', url: 'https://example.test/planner', snippet: 'developer social lane' }]
          },
          files: [{ name: 'media-plan.md', content: 'SEO and developer social lanes are ready for preparation.' }]
        },
        logs: ['queued checkpoint repair planning completed']
      },
      {
        id: queuedCheckpointRepairCheckpointId,
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        workflowTask: 'cmo_leader',
        workflowAgentName: 'CMO Team Leader',
        prompt: 'checkpoint child row was not persisted as queued',
        status: 'blocked',
        assignedAgentId: 'agent_cmo_leader_01',
        workflowParentId: queuedCheckpointRepairParentId,
        createdAt: early,
        input: { _broker: { workflow: { sequencePhase: 'checkpoint', checkpointLayer: 3, requiredBeforeLayer: 4 } } },
        dispatch: { completionStatus: 'leader_checkpoint_blocked', retryable: false, nextRetryAt: null },
        logs: ['leader checkpoint queued after layer-3 completion before layer-4 from qa-lea']
      },
      {
        id: queuedCheckpointRepairPreparationId,
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'seo_specialist',
        workflowTask: 'seo_specialist',
        workflowAgentName: 'SEO SPECIALIST',
        prompt: 'preparation waits for checkpoint',
        status: 'blocked',
        assignedAgentId: 'agent_seospecialist_01',
        workflowParentId: queuedCheckpointRepairParentId,
        createdAt: early,
        input: { _broker: { workflow: { sequencePhase: 'preparation', adaptivePending: true, adaptivePendingLayer: 4 } } },
        dispatch: { completionStatus: 'leader_adaptive_pending', retryable: false, nextRetryAt: null },
        logs: ['adaptive candidate held until leader checkpoint releases layer-4']
      }
    );
  });
  const queuedCheckpointRepairWaits = [];
  await request(`/api/jobs/${queuedCheckpointRepairParentId}`, {}, { waitUntilPromises: queuedCheckpointRepairWaits, env: qaSearchEnv });
  for (let waitIndex = 0; waitIndex < queuedCheckpointRepairWaits.length; waitIndex += 1) {
    await queuedCheckpointRepairWaits[waitIndex].catch(() => {});
  }
  const queuedCheckpointRepairState = await qaStorage.getState();
  const queuedCheckpointRepairCheckpoint = queuedCheckpointRepairState.jobs.find((job) => job.id === queuedCheckpointRepairCheckpointId);
  assert.notEqual(
    String(queuedCheckpointRepairCheckpoint?.status || '').toLowerCase(),
    'blocked',
    `queued checkpoint repair should move child row out of blocked; child=${JSON.stringify({ status: queuedCheckpointRepairCheckpoint?.status, dispatch: queuedCheckpointRepairCheckpoint?.dispatch, logs: queuedCheckpointRepairCheckpoint?.logs })}`
  );
  assert.notEqual(
    String(queuedCheckpointRepairCheckpoint?.dispatch?.completionStatus || '').toLowerCase(),
    'leader_checkpoint_blocked',
    'queued checkpoint repair should not leave dispatch status at leader_checkpoint_blocked'
  );
  assert.ok(
    (queuedCheckpointRepairCheckpoint?.logs || []).some((line) => /repaired to queued from persisted checkpoint state/.test(String(line || ''))),
    'queued checkpoint repair should leave a durable repair log'
  );

  const asyncWorkflowJobId = asyncWorkflow.body.workflow_job_id;

  async function completeAsyncWorkflowSpecialists(phase, nextAction) {
    return completeCmoWorkflowSpecialists({
      qaStorage,
      workflowJobId: asyncWorkflowJobId,
      phase,
      nextAction
    });
  }

  async function pollAsyncWorkflowWithWaits() {
    return pollWorkflowWithWaits({
      request,
      env: qaSearchEnv,
      qaStorage,
      workflowJobId: asyncWorkflowJobId
    });
  }

  await completeAsyncWorkflowSpecialists('research', 'Use this before planning layer.');
  const asyncAfterResearchState = await pollAsyncWorkflowWithWaits();
  const checkpointLeaderAfterResearch = asyncAfterResearchState.jobs.find((job) => (
    job.workflowParentId === asyncWorkflow.body.workflow_job_id
    && job.taskType === 'cmo_leader'
    && job.input?._broker?.workflow?.sequencePhase === 'checkpoint'
    && Number(job.input?._broker?.workflow?.checkpointLayer || 0) === 2
    && Number(job.input?._broker?.workflow?.requiredBeforeLayer || 0) === 3
  ));
  const asyncParentAfterResearch = asyncAfterResearchState.jobs.find((job) => job.id === asyncWorkflow.body.workflow_job_id);
  assert.equal(checkpointLeaderAfterResearch?.status, 'completed', `research-to-planning checkpoint leader should complete before planning dispatch: ${JSON.stringify({
    status: checkpointLeaderAfterResearch?.status,
    failureCategory: checkpointLeaderAfterResearch?.failureCategory,
    failureReason: checkpointLeaderAfterResearch?.failureReason,
    dispatch: checkpointLeaderAfterResearch?.dispatch,
    logs: (checkpointLeaderAfterResearch?.logs || []).slice(-5),
    checkpoints: asyncParentAfterResearch?.workflow?.leaderSequence?.checkpoints,
    leaderSequenceStatus: asyncParentAfterResearch?.workflow?.leaderSequence?.status,
    childRuns: (asyncParentAfterResearch?.workflow?.childRuns || []).map((run) => ({
      taskType: run.taskType,
      phase: run.sequencePhase,
      layer: run.layer,
      status: run.status
    }))
  })}`);
  const planningWithPriorResearch = asyncAfterResearchState.jobs.find((job) => (
    job.workflowParentId === asyncWorkflow.body.workflow_job_id
    && job.input?._broker?.workflow?.sequencePhase === 'planning'
    && job.taskType !== 'cmo_leader'
    && Array.isArray(job.input?._broker?.workflow?.leaderHandoff?.priorRuns)
    && job.input._broker.workflow.leaderHandoff.priorRuns.some((run) => ['research', 'teardown', 'data_analysis'].includes(run.taskType))
  ));
  assert.ok(planningWithPriorResearch, 'planning-layer children should receive completed research handoff before dispatch');
  assert.equal(
    planningWithPriorResearch.input?._broker?.workflow?.leaderHandoff?.handoffContract?.version,
    'workflow-handoff/v2',
    'planning-layer handoff should carry a versioned contract'
  );
  assert.equal(
    planningWithPriorResearch.input?._broker?.workflow?.leaderHandoff?.handoffOwner,
    'leader',
    'planning-layer handoff should be owned by the leader'
  );
  assert.equal(
    planningWithPriorResearch.input?._broker?.workflow?.leaderHandoff?.handoffContract?.owner,
    'leader',
    'versioned handoff contract should identify leader ownership'
  );
  assert.ok(
    Array.isArray(planningWithPriorResearch.input?._broker?.workflow?.leaderHandoff?.priorDeliverables)
    && planningWithPriorResearch.input._broker.workflow.leaderHandoff.priorDeliverables.length >= 1,
    'planning-layer handoff should expose concrete prior deliverables, not only summaries'
  );
  const planningWithPriorResearchAdditional = String(planningWithPriorResearch.input?._broker?.workflow?.additionalPrompt || '');
  assert.ok(
    !String(planningWithPriorResearch.prompt || '').includes('=== WORKFLOW HANDOFF CONTEXT ==='),
    'planning-layer child base prompt should stay separate from workflow handoff context'
  );
  assert.ok(
    planningWithPriorResearchAdditional.includes('=== WORKFLOW HANDOFF CONTEXT ==='),
    'planning-layer child should store workflow handoff context in additionalPrompt, not only JSON'
  );
  assert.ok(
    planningWithPriorResearchAdditional.includes('USER-FACING PRIOR DELIVERABLE:'),
    'planning-layer child additionalPrompt should name prior user-facing deliverables explicitly'
  );
  assert.ok(
    planningWithPriorResearchAdditional.includes('Required usage signals:'),
    'planning-layer child additionalPrompt should include required usage signals from prior research'
  );
  assert.ok(
    /File reference:\s+[^\n]+\.md/i.test(planningWithPriorResearchAdditional),
    'planning-layer child additionalPrompt should reference prior research files'
  );
  assert.ok(
    /User-facing prior Markdown to reuse as source material:[\s\S]*```markdown[\s\S]*research delivery/i.test(planningWithPriorResearchAdditional),
    'planning-layer child additionalPrompt should pass prior user-facing delivery markdown as source material'
  );
  assert.ok(
    planningWithPriorResearchAdditional.includes('PROCESS PROGRAM'),
    'planning-layer child additionalPrompt should include explicit programmatic process state'
  );
  assert.ok(
    planningWithPriorResearchAdditional.includes('https://aiagent-marketplace.net/')
    || planningWithPriorResearchAdditional.includes('CAIt AI agent marketplace'),
    'planning-layer child additionalPrompt should include prior research source snippets'
  );

  await completeAsyncWorkflowSpecialists('planning', 'Use this before preparation layer.');
  const asyncAfterPlanningState = await pollAsyncWorkflowWithWaits();
  const checkpointLeaderAfterPlanning = asyncAfterPlanningState.jobs.find((job) => (
    job.workflowParentId === asyncWorkflow.body.workflow_job_id
    && job.taskType === 'cmo_leader'
    && job.input?._broker?.workflow?.sequencePhase === 'checkpoint'
    && Number(job.input?._broker?.workflow?.checkpointLayer || 0) === 3
    && Number(job.input?._broker?.workflow?.requiredBeforeLayer || 0) === 4
  ));
  const planningCheckpointChildren = asyncAfterPlanningState.jobs
    .filter((job) => job.workflowParentId === asyncWorkflow.body.workflow_job_id)
    .map((job) => ({
      id: job.id,
      taskType: job.taskType,
      status: job.status,
      phase: job.input?._broker?.workflow?.sequencePhase,
      layer: job.input?._broker?.workflow?.layer,
      dispatchStatus: job.dispatch?.completionStatus
    }));
  assert.equal(checkpointLeaderAfterPlanning?.status, 'completed', `planning-to-preparation checkpoint leader should complete before preparation dispatch: ${JSON.stringify({
    status: checkpointLeaderAfterPlanning?.status,
    failureReason: checkpointLeaderAfterPlanning?.failureReason,
    failureCategory: checkpointLeaderAfterPlanning?.failureCategory,
    dispatch: checkpointLeaderAfterPlanning?.dispatch,
    logs: checkpointLeaderAfterPlanning?.logs,
    children: planningCheckpointChildren
  })}`);
  const preparationWithPriorPlanning = asyncAfterPlanningState.jobs.find((job) => (
    job.workflowParentId === asyncWorkflow.body.workflow_job_id
    && job.input?._broker?.workflow?.sequencePhase === 'preparation'
    && job.taskType !== 'cmo_leader'
    && Array.isArray(job.input?._broker?.workflow?.leaderHandoff?.priorRuns)
    && job.input._broker.workflow.leaderHandoff.priorRuns.some((run) => ['media_planner', 'growth'].includes(run.taskType))
  ));
  assert.ok(preparationWithPriorPlanning, `preparation-layer children should receive completed planning handoff before dispatch: ${JSON.stringify(asyncAfterPlanningState.jobs
    .filter((job) => job.workflowParentId === asyncWorkflow.body.workflow_job_id && job.input?._broker?.workflow?.sequencePhase === 'preparation')
    .map((job) => ({
      taskType: job.taskType,
      status: job.status,
      dispatchStatus: job.dispatch?.completionStatus,
      adaptivePending: job.input?._broker?.workflow?.adaptivePending,
      handoffTasks: Array.isArray(job.input?._broker?.workflow?.leaderHandoff?.priorRuns)
        ? job.input._broker.workflow.leaderHandoff.priorRuns.map((run) => run.taskType)
        : []
    })))}`);
  const preparationWithPriorPlanningAdditional = String(preparationWithPriorPlanning.input?._broker?.workflow?.additionalPrompt || '');
  assert.ok(
    !String(preparationWithPriorPlanning.prompt || '').includes('=== WORKFLOW HANDOFF CONTEXT ==='),
    'preparation-layer child base prompt should stay separate from workflow handoff context'
  );
  assert.ok(
    preparationWithPriorPlanningAdditional.includes('=== WORKFLOW HANDOFF CONTEXT ===')
    && (
      preparationWithPriorPlanningAdditional.includes('Uses handed-off source URL')
      || preparationWithPriorPlanningAdditional.includes('https://aiagent-marketplace.net/')
    ),
    'preparation-layer child additionalPrompt should include prior delivery markdown snippets'
  );

  await completeAsyncWorkflowSpecialists('preparation', 'Use this before final action layer.');
  const asyncAfterPreparationState = await pollAsyncWorkflowWithWaits();
  const checkpointLeaderBeforeAction = asyncAfterPreparationState.jobs.find((job) => (
    job.workflowParentId === asyncWorkflow.body.workflow_job_id
    && job.taskType === 'cmo_leader'
    && job.input?._broker?.workflow?.sequencePhase === 'checkpoint'
    && Number(job.input?._broker?.workflow?.checkpointLayer || 0) === 4
    && Number(job.input?._broker?.workflow?.requiredBeforeLayer || 0) === 5
  ));
  assert.ok(
    !checkpointLeaderBeforeAction || ['completed', 'blocked'].includes(String(checkpointLeaderBeforeAction.status || '')),
    'preparation-to-action checkpoint leader should complete when an action layer exists; CMO SaaS handoff workflows may skip action dispatch entirely'
  );
  if (checkpointLeaderBeforeAction) {
    assert.notEqual(checkpointLeaderBeforeAction.input?._broker?.workflow?.requiresUserApprovalBeforeAction, true, 'agent action layer release should not be blocked by publish approval; SaaS handoff owns publish approval');
  }
  const executionWithPriorAnalysis = asyncAfterPreparationState.jobs.find((job) => (
    job.workflowParentId === asyncWorkflow.body.workflow_job_id
    && job.input?._broker?.workflow?.sequencePhase === 'action'
    && job.taskType !== 'cmo_leader'
    && Array.isArray(job.input?._broker?.workflow?.leaderHandoff?.priorRuns)
    && job.input._broker.workflow.leaderHandoff.priorRuns.some((run) => ['teardown', 'data_analysis', 'media_planner', 'seo_specialist', 'landing'].includes(run.taskType))
  ));
  assert.equal(executionWithPriorAnalysis, undefined, 'CMO action layer should not dispatch posting children; SaaS handoff owns publish/copy-paste execution');

  await completeAsyncWorkflowSpecialists('action', 'Return this to the CMO leader for synthesis.');
  const asyncFinalSummaryWaits = [];
  const asyncFinalSummaryPoll = await request(`/api/jobs/${asyncWorkflow.body.workflow_job_id}`, {}, { waitUntilPromises: asyncFinalSummaryWaits });
  assert.equal(asyncFinalSummaryPoll.status, 200);
  await Promise.allSettled(asyncFinalSummaryWaits);
  const asyncFinalSummaryState = await request(`/api/jobs/${asyncWorkflow.body.workflow_job_id}`);
  assert.equal(asyncFinalSummaryState.status, 200);
  const finalSummaryChildRun = asyncFinalSummaryState.body.job.workflow.childRuns.find((run) => (
    run.taskType === 'cmo_leader'
    && run.sequencePhase === 'final_summary'
  ));
  assert.equal(
    finalSummaryChildRun?.status,
    'completed',
    `final summary leader should complete after specialists finish; qualityGate=${JSON.stringify(finalSummaryChildRun?.qualityGate || null)} failure=${String(finalSummaryChildRun?.failureReason || '')}`
  );
  assert.equal(asyncFinalSummaryState.body.job.output?.report?.leaderPhase, 'final_summary', 'workflow output should promote the final leader summary');
  assert.ok(asyncFinalSummaryState.body.job.output?.files?.[0]?.content_type, 'workflow output should surface an explicit execution candidate file when a specialist packet exists');
  assertOrderScenarioQuality(asyncFinalSummaryState.body.job, {
    prompt: E2E_DEFAULT_ORDER_PROMPT,
    requireCompleted: true,
    minDeliveryChars: 700
  });

  runWorkerApiAgentTeamOutputQa();

  const connectorHandoffWorkflow = await request('/api/jobs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      parent_agent_id: 'qa-runner',
      task_type: 'cmo_leader',
      prompt: 'CMO leader: research the launch, choose the channel, and proceed up to an approval-ready X post connector handoff.',
      order_strategy: 'multi',
      skip_intake: true,
      budget_cap: 500
    })
  }, { env: qaSearchEnv });
  assert.equal(connectorHandoffWorkflow.status, 201);
  assert.equal(connectorHandoffWorkflow.body.mode, 'workflow');
  let connectorHandoffState = await request(`/api/jobs/${connectorHandoffWorkflow.body.workflow_job_id}`, {}, { env: qaSearchEnv });
  assert.equal(connectorHandoffState.status, 200);
  let connectorHandoffRawState = await qaStorage.getState();
  let publisherPrepJob = connectorHandoffRawState.jobs.find((job) => (
    job.workflowParentId === connectorHandoffWorkflow.body.workflow_job_id
    && job.workflowTask === 'writing'
  ));
  for (let attempt = 0; attempt < 6 && !['completed', 'blocked'].includes(String(publisherPrepJob?.status || '')); attempt += 1) {
    const waits = [];
    connectorHandoffState = await request(`/api/jobs/${connectorHandoffWorkflow.body.workflow_job_id}`, {}, { waitUntilPromises: waits, env: qaSearchEnv });
    await Promise.allSettled(waits);
    connectorHandoffRawState = await qaStorage.getState();
    publisherPrepJob = connectorHandoffRawState.jobs.find((job) => (
      job.workflowParentId === connectorHandoffWorkflow.body.workflow_job_id
      && job.workflowTask === 'writing'
    ));
  }
  connectorHandoffState = await request(`/api/jobs/${connectorHandoffWorkflow.body.workflow_job_id}`, {}, { env: qaSearchEnv });
  assert.equal(connectorHandoffState.status, 200);
  const connectorChildRuns = Array.isArray(connectorHandoffState.body.job.workflow?.childRuns)
    ? connectorHandoffState.body.job.workflow.childRuns
    : [];
  assert.equal(connectorChildRuns.some((run) => run.taskType === 'x_post'), false, 'CMO workflow should not dispatch X action specialists; matched SaaS app handoff owns publishing');
  assert.ok(connectorChildRuns.some((run) => run.taskType === 'writing'), 'CMO workflow should keep publishable writing preparation in the plan');
  assert.notEqual(publisherPrepJob?.dispatch?.completionStatus, 'blocked_waiting_for_approval', 'writing preparation should not block chat workflow for publish approval; SaaS owns publish approval');
  assert.notEqual(connectorHandoffState.body.job.status, 'blocked', 'workflow parent should not be blocked by publish approval when SaaS handoff is available');
  assert.notEqual(connectorHandoffState.body.job.dispatch?.completionStatus, 'blocked_waiting_for_approval', 'workflow parent should not persist chat-level publish approval blocking');

  const legacyCmoActionParentId = 'qa-legacy-cmo-action-parent';
  const legacyCmoActionIds = ['qa-legacy-cmo-action-acq', 'qa-legacy-cmo-action-reddit', 'qa-legacy-cmo-action-ih'];
  await qaStorage.mutate(async (draft) => {
    const at = nowIso();
    draft.jobs.unshift(
      {
        id: legacyCmoActionParentId,
        jobKind: 'workflow',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        prompt: 'legacy CMO action layer should hand off to SaaS instead of asking chat approval',
        input: {},
        priority: 'normal',
        status: 'running',
        createdAt: at,
        workflow: {
          strategy: 'multi_agent',
          plannedTasks: ['cmo_leader', 'data_analysis', 'research', 'media_planner', 'writing', 'acquisition_automation', 'reddit', 'indie_hackers'],
          plannedChildRunCount: 3,
          childRuns: []
        },
        logs: ['legacy cmo action parent qa']
      },
      {
        id: legacyCmoActionIds[0],
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'acquisition_automation',
        workflowTask: 'acquisition_automation',
        workflowAgentName: 'Acquisition Automation Agent',
        prompt: 'legacy action child',
        input: { _broker: { workflow: { primaryTask: 'cmo_leader', sequencePhase: 'action', dispatchLayer: 5 } } },
        priority: 'normal',
        status: 'queued',
        assignedAgentId: 'agent_acquisition_automation_01',
        createdAt: at,
        workflowParentId: legacyCmoActionParentId,
        logs: ['legacy cmo action child qa']
      },
      {
        id: legacyCmoActionIds[1],
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'reddit',
        workflowTask: 'reddit',
        workflowAgentName: 'Reddit',
        prompt: 'legacy reddit action child',
        input: { _broker: { workflow: { primaryTask: 'cmo_leader', sequencePhase: 'action', dispatchLayer: 5 } } },
        priority: 'normal',
        status: 'queued',
        assignedAgentId: 'agent_reddit_01',
        createdAt: at,
        workflowParentId: legacyCmoActionParentId,
        logs: ['legacy cmo reddit action child qa']
      },
      {
        id: legacyCmoActionIds[2],
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'indie_hackers',
        workflowTask: 'indie_hackers',
        workflowAgentName: 'Indie Hackers',
        prompt: 'legacy indie hackers action child',
        input: { _broker: { workflow: { primaryTask: 'cmo_leader', sequencePhase: 'action', dispatchLayer: 5 } } },
        priority: 'normal',
        status: 'blocked',
        failureCategory: 'blocked_waiting_for_approval',
        failureReason: 'External posting requires approval.',
        dispatch: { completionStatus: 'blocked_waiting_for_approval', retryable: false, nextRetryAt: null },
        output: {
          summary: 'External posting requires approval.',
          report: {
            summary: 'External posting requires approval.',
            authority_request: {
              reason: 'External posting requires approval before publishing to Indie Hackers.',
              missing_connectors: ['indie_hackers'],
              source: 'agent_delivery'
            }
          },
          files: []
        },
        assignedAgentId: 'agent_indie_hackers_01',
        createdAt: at,
        workflowParentId: legacyCmoActionParentId,
        logs: ['legacy cmo indie action child qa']
      }
    );
  });
  const legacyCmoActionPoll = await request(`/api/jobs/${legacyCmoActionParentId}`, {}, { env: qaSearchEnv });
  assert.equal(legacyCmoActionPoll.status, 200);
  assert.notEqual(legacyCmoActionPoll.body.job.status, 'blocked', 'legacy CMO action-layer children should not create chat approval waits after SaaS handoff policy');
  const legacyCmoActionSecondPoll = await request(`/api/jobs/${legacyCmoActionParentId}`, {}, { env: qaSearchEnv });
  assert.equal(legacyCmoActionSecondPoll.status, 200);
  const legacyCmoActionState = await qaStorage.getState();
  const legacyCmoActionChildren = legacyCmoActionState.jobs.filter((job) => legacyCmoActionIds.includes(job.id));
  assert.equal(
    legacyCmoActionChildren.every((job) => job.status === 'completed' && job.dispatch?.completionStatus === 'saas_handoff_only'),
    true,
    `legacy CMO action-layer children should be completed as SaaS handoff-only steps: ${JSON.stringify(legacyCmoActionChildren.map((job) => ({ id: job.id, taskType: job.taskType, status: job.status, dispatch: job.dispatch?.completionStatus, failure: job.failureReason, report: job.output?.report }))) }`
  );
  assert.equal(
    legacyCmoActionChildren.some((job) => job.output?.report?.authority_request),
    false,
    'SaaS handoff-only action children must not keep chat approval authority requests'
  );

  const manualParentId = 'qa-progress-parent';
  const manualChildAId = 'qa-progress-child-a';
  const manualChildBId = 'qa-progress-child-b';
  await qaStorage.mutate(async (draft) => {
    const at = nowIso();
    draft.jobs.unshift(
      {
        id: manualParentId,
        jobKind: 'workflow',
        parentAgentId: 'qa-runner',
        taskType: 'agent_team_launch',
        prompt: 'manual progress scheduling qa',
        input: {},
        priority: 'normal',
        status: 'queued',
        createdAt: at,
        logs: ['manual qa parent'],
        workflow: {
          strategy: 'multi_agent',
          plannedTasks: ['research', 'growth'],
          childRuns: []
        }
      },
      {
        id: manualChildAId,
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'research',
        prompt: 'manual child a',
        input: {},
        priority: 'normal',
        status: 'queued',
        assignedAgentId: 'agent_research_01',
        createdAt: at,
        workflowParentId: manualParentId,
        logs: ['manual qa child a']
      },
      {
        id: manualChildBId,
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'growth',
        prompt: 'manual child b',
        input: {},
        priority: 'normal',
        status: 'queued',
        assignedAgentId: 'agent_growth_01',
        createdAt: at,
        workflowParentId: manualParentId,
        logs: ['manual qa child b']
      }
    );
  });
  const manualProgressWaits = [];
  const manualProgressPoll = await request(`/api/jobs/${manualParentId}`, {}, { waitUntilPromises: manualProgressWaits, env: qaSearchEnv });
  assert.equal(manualProgressPoll.status, 200);
  assert.equal(manualProgressWaits.length, 1, 'progress polling should schedule queued built-in children as one dispatch batch');
  const manualProgressKickState = await qaStorage.getState();
  const manualProgressKickChild = manualProgressKickState.jobs.find((job) => job.id === manualChildAId);
  assert.equal(
    ['dispatch_scheduled', 'dispatch_in_progress', 'completed'].includes(String(manualProgressKickChild?.dispatch?.completionStatus || '')),
    true,
    'progress polling should synchronously mark a ready child as dispatch_scheduled before returning stale queued state'
  );
  await Promise.allSettled(manualProgressWaits);
  const manualProgressAfter = await request(`/api/jobs/${manualParentId}`, {}, { env: qaSearchEnv });
  assert.equal(manualProgressAfter.status, 200);
  assert.ok(manualProgressAfter.body.job.workflow.statusCounts.completed >= 1, 'poll-triggered dispatch should complete at least one ready built-in child');

  const authorityParentId = 'qa-authority-parent';
  const authorityLeaderId = 'qa-authority-leader';
  const authorityChildId = 'qa-authority-child';
  await qaStorage.mutate(async (draft) => {
    const at = nowIso();
    draft.jobs.unshift(
      {
        id: authorityParentId,
        jobKind: 'workflow',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        prompt: 'manual approval waiting workflow qa',
        input: {},
        priority: 'normal',
        status: 'running',
        createdAt: at,
        logs: ['manual approval qa parent'],
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
              missing_connector_capabilities: ['google.read_ga4', 'google.read_gsc'],
              required_google_sources: ['ga4', 'gsc'],
              source: 'agent_delivery'
            }
          },
          files: []
        }
      },
      {
        id: authorityLeaderId,
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'cmo_leader',
        workflowTask: 'cmo_leader',
        workflowAgentName: 'CMO Team Leader',
        prompt: 'manual approval leader checkpoint',
        input: { _broker: { workflow: { sequencePhase: 'checkpoint', checkpointLayer: 1, requiredBeforeLayer: 2 } } },
        priority: 'normal',
        status: 'completed',
        assignedAgentId: 'agent_cmo_leader_01',
        createdAt: at,
        startedAt: at,
        completedAt: at,
        workflowParentId: authorityParentId,
        output: {
          summary: 'Google analytics context must be approved before retrying source collection.',
          report: {
            summary: 'Google analytics context must be approved before retrying source collection.',
            authority_request: {
              reason: 'Google analytics context must be approved before retrying source collection.',
              missing_connectors: ['google'],
              missing_connector_capabilities: ['google.read_ga4', 'google.read_gsc'],
              required_google_sources: ['ga4', 'gsc'],
              source: 'agent_delivery'
            }
          },
          files: []
        },
        logs: ['manual approval qa leader']
      },
      {
        id: authorityChildId,
        jobKind: 'workflow_child',
        parentAgentId: 'qa-runner',
        taskType: 'research',
        workflowTask: 'research',
        workflowAgentName: 'Research Agent',
        prompt: 'manual approval child',
        input: {},
        priority: 'normal',
        status: 'queued',
        assignedAgentId: 'agent_research_01',
        createdAt: at,
        workflowParentId: authorityParentId,
        logs: ['manual approval qa child']
      }
    );
  });
  const authorityProgressWaits = [];
  const authorityProgressPoll = await request(`/api/jobs/${authorityParentId}`, {}, { waitUntilPromises: authorityProgressWaits, env: qaSearchEnv });
  assert.equal(authorityProgressPoll.status, 200);
  await Promise.allSettled(authorityProgressWaits);
  const authorityProgressAfter = await request(`/api/jobs/${authorityParentId}`, {}, { env: qaSearchEnv });
  assert.equal(authorityProgressAfter.status, 200);
  assert.equal(authorityProgressAfter.body.job.status, 'blocked', 'workflow parent should stop progress dispatch while an authority request is waiting');
  assert.equal(authorityProgressAfter.body.job.dispatch?.completionStatus, 'blocked_waiting_for_approval', 'workflow parent should persist approval wait instead of retrying children');
  assert.equal(authorityProgressAfter.body.job.output?.report?.authority_request?.missing_connector_capabilities?.includes('google.read_ga4'), true, 'approval-blocked parent should keep the Google authority request visible');
  const authorityRawState = await qaStorage.getState();
  const authorityRawChild = authorityRawState.jobs.find((job) => job.id === authorityChildId);
  assert.equal(authorityRawChild?.status, 'queued', 'authority-blocked workflow should leave child ready but unscheduled for later resume');
  assert.notEqual(authorityRawChild?.dispatch?.completionStatus, 'dispatch_scheduled', 'authority-blocked workflow should not retry/schedule child dispatch');

  await runWorkerApiCmoWorkflowRepairQa({ qaStorage, request, qaSearchEnv, nowIso });

}
