import assert from 'node:assert/strict';
import worker from '../worker.js';
import { createD1LikeStorage } from '../lib/storage.js';

const env = {
  APP_VERSION: '0.2.0-test',
  ALLOW_OPEN_WRITE_API: '1',
  ALLOW_GUEST_RUN_READ_API: '1',
  ALLOW_DEV_API: '1',
  EXPOSE_JOB_SECRETS: '1',
  SESSION_SECRET: 'leader-workflow-qa-secret',
  STRIPE_SECRET_KEY: 'sk_test_worker_qa',
  STRIPE_WEBHOOK_SECRET: 'whsec_worker_api_qa',
  STRIPE_DEFAULT_CURRENCY: 'USD',
  BASE_URL: 'https://example.test',
  BRAVE_SEARCH_API_KEY: 'brave-leader-workflows-qa',
  OPENAI_API_KEY: 'sk-test-leader-workflows-qa',
  ALLOW_IN_MEMORY_STORAGE: '1',
  GOOGLE_CLIENT_ID: 'google-worker-api-qa-client-id',
  GOOGLE_CLIENT_SECRET: 'google-worker-api-qa-client-secret',
  MY_BINDING: null,
  ASSETS: {
    async fetch() {
      return new Response('not found', { status: 404 });
    }
  }
};

const originalLeaderWorkflowQaFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input?.url;
  if (String(url || '').startsWith('https://example.test/mock/')) {
    return worker.fetch(new Request(url, init), env, { waitUntil() {} });
  }
  if (String(url || '') === 'https://api.openai.com/v1/responses') {
    const requestBody = JSON.parse(String(init?.body || '{}'));
    const schemaName = String(requestBody?.text?.format?.name || '').trim().toLowerCase();
    if (schemaName === 'cait_leader_workflow_plan') {
      let userPayload = {};
      try {
        const input = Array.isArray(requestBody.input) ? requestBody.input : [];
        const userMessage = input.find((item) => item?.role === 'user');
        const textPart = Array.isArray(userMessage?.content) ? userMessage.content[0]?.text : userMessage?.content;
        userPayload = JSON.parse(String(textPart || '{}'));
      } catch {}
      const deterministic = Array.isArray(userPayload?.deterministic_plan)
        ? userPayload.deterministic_plan.map((item) => String(item || '').trim()).filter(Boolean)
        : [];
      const planned = deterministic.length
        ? deterministic.slice(0, 10)
        : ['cmo_leader', 'research', 'media_planner', 'seo_gap'];
      return new Response(JSON.stringify({
        output_text: JSON.stringify({
          planned_tasks: planned,
          task_tags: planned.map((taskType) => ({ task_type: taskType, tags: ['qa', 'leader-workflow'] })),
          reason: 'QA leader planner preserves the verified deterministic skeleton while exercising OpenAI planning.',
          confidence: 0.86
        }),
        usage: { input_tokens: 120, output_tokens: 80, total_tokens: 200 }
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (schemaName.endsWith('_plan')) {
      return new Response(JSON.stringify({
        output_text: JSON.stringify({
          task_understanding: 'QA leader workflow request understood with available inputs.',
          assumptions: ['QA uses mocked OpenAI output.', 'QA does not perform connector writes.'],
          workstreams: ['Collect evidence', 'Prepare specialist output', 'Synthesize leader delivery'],
          risks: ['Connector data may be unavailable.'],
          success_checks: ['Specific artifact is returned.', 'Sources or data status are explicit.']
        }),
        usage: { input_tokens: 120, output_tokens: 80, total_tokens: 200 }
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    const kind = schemaName.replace(/^aiagent2_/, '').replace(/_(draft|review)$/, '') || 'agent';
    const artifact = kind === 'teardown'
      ? 'Competitor teardown: compare CAIt marketplace positioning, buyer proof, and conversion friction against visible alternatives.'
      : kind === 'data_analysis'
        ? 'Funnel contract: track source, landing page view, primary intent event, purchase, and assisted conversion.'
        : kind === 'validation'
          ? 'Validation packet: test one offer, one audience, one page, and one conversion signal before expanding channels.'
          : kind === 'media_planner'
            ? 'Media-fit analysis and Priority media queue: prioritize owned SEO, X proof posts, and directory listing only after evidence review. Channels to avoid: unfocused paid awareness.'
            : kind === 'directory_submission'
              ? 'Directory submission packet: listing title, one-line pitch, category, destination URL, and review checklist.'
              : kind === 'x_post'
                ? 'Exact X post packet: exact_copy, approved_copy, destination URL, utm_source=x, Reply hooks, metric, and stop rule.'
                : kind === 'acquisition_automation'
                  ? 'Acquisition automation packet: Manual-first flow, state machine, source capture, qualification state, Connector gate, manual approval, follow-up trigger, and stop rule.'
                  : kind === 'list_creator'
                    ? 'Reviewable lead rows: company_name, contact_source_url, public_email_or_contact_path, fit_reason, next_step, and approval_status rows.'
                    : kind === 'writing' || kind === 'writer'
                      ? 'Copy draft: landing-page hero promise, CTA copy, proof block, post-ready hook, metric, stop rule, and approval owner.'
                      : kind === 'seo_gap' || kind === 'seo'
                        ? 'SEO page packet: target query, SERP intent, Meta title, H1, internal link, review checklist, metric, and stop rule.'
                    : kind === 'landing'
                      ? 'Destination page packet: Page structure, hero copy, CTA copy, proof module, objection handling, measurement event, and publish note.'
                      : `Execution packet for ${kind}: owner, objective, artifact, metric, stop rule, and approval owner.`;
    return new Response(JSON.stringify({
      output_text: JSON.stringify({
        summary: `QA ${kind} delivery ready.`,
        report_summary: `QA ${kind} report with source-backed decisions and a concrete next action.`,
        bullets: [
          'Search evidence used: Leader workflow QA source https://example.test/leader-workflow-source',
          'Chosen path is specific to the requested leader workflow.',
          'Connector execution is outside this mocked QA delivery.'
        ],
        next_action: 'Review the delivery and continue with the next workflow step.',
        file_markdown: [
          `# QA ${kind} delivery`,
          '',
          '## Evidence used',
          '- Leader workflow QA source https://example.test/leader-workflow-source',
          '',
          '## Concrete delivery',
          artifact,
          '',
          '## Planned action table',
          '| order | lane | owner | exact artifact |',
          '| --- | --- | --- | --- |',
          '| 1 | X launch | Team Leader | post-ready packet |',
          '',
          '## Next action',
          'Convert this packet into the next executable order.',
          '',
          '## Supporting work products',
          '- Specialist deliverable preview: prior evidence, source URL, artifact, action, approval, and handoff are synthesized here.',
          '- Execution / approval packet: owner, exact artifact, connector state, metric, and stop rule are ready for review.',
          '- Specialist成果物プレビュー: visible delivery summary',
          '- 実行・承認packet: connector state, exact artifact, metric, stop rule.',
          '',
          '| Owner | Objective | Artifact | Metric | Stop rule | Approval owner |',
          '| --- | --- | --- | --- | --- | --- |',
          '| Team Leader | Turn source evidence into one approved action | Approval-ready execution packet | qualified conversion | stop if no qualified signal after 7 days | order owner |',
          '- QA output contains a delivery artifact only.'
        ].join('\n'),
        confidence: 'medium'
      }),
      usage: { input_tokens: 120, output_tokens: 80, total_tokens: 200 }
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (String(url || '').startsWith('https://api.search.brave.com/')) {
    return new Response(JSON.stringify({
      web: {
        results: [
          {
            title: 'Leader workflow QA source',
            url: 'https://example.test/leader-workflow-source',
            description: 'Search-backed evidence for leader workflow QA.',
            extra_snippets: ['Research layer evidence, action layer decision, and final delivery source.']
          }
        ]
      }
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  return originalLeaderWorkflowQaFetch(input, init);
};

const storage = createD1LikeStorage(env.MY_BINDING, { allowInMemory: true, stateCacheTtlMs: 0 });

async function request(path, init = {}) {
  const waitUntilPromises = [];
  const ctx = {
    waitUntil(promise) {
      waitUntilPromises.push(Promise.resolve(promise));
    }
  };
  const res = await worker.fetch(new Request(`https://example.test${path}`, init), env, ctx);
  const text = await res.text();
  let body = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {}
  await Promise.allSettled(waitUntilPromises);
  return { status: res.status, body };
}

const cases = [
  {
    taskType: 'research_team_leader',
    prompt: 'Research team leader: compare the main competitors, identify the decision blockers, and deliver one final evidence-backed recommendation.',
    minChildren: 3
  },
  {
    taskType: 'build_team_leader',
    prompt: 'Build team leader: review a web app architecture problem, plan the implementation/debug path, and deliver a final technical recommendation.',
    minChildren: 3
  },
  {
    taskType: 'cto_leader',
    prompt: 'CTO leader: assess architecture, implementation risk, and operations tradeoffs for an AI marketplace app and deliver the final engineering recommendation.',
    minChildren: 3
  },
  {
    taskType: 'cpo_leader',
    prompt: 'CPO leader: analyze onboarding friction, feature prioritization, and user evidence, then deliver the final product recommendation.',
    minChildren: 3
  },
  {
    taskType: 'cfo_leader',
    prompt: 'CFO leader: analyze pricing, unit economics, billing risk, and revenue tradeoffs for a subscription AI marketplace, then deliver the final finance recommendation.',
    minChildren: 3
  },
  {
    taskType: 'legal_leader',
    prompt: 'Legal leader: analyze privacy policy, terms, and compliance risks for an AI marketplace and deliver the final legal recommendation.',
    minChildren: 3
  },
  {
    taskType: 'cmo_leader',
    prompt: 'CMO leader: analyze channels, competitors, and signup conversion, then plan and do actions by preparing an X post and directory submission after approval.',
    minChildren: 8,
    expectedStatus: 'blocked',
    expectedBlockedCapability: 'x.post',
    injectGlobalSearchFlags: true
  }
];

for (const testCase of cases) {
  const created = await request('/api/jobs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      parent_agent_id: 'qa-runner',
      task_type: testCase.taskType,
      prompt: testCase.prompt,
      order_strategy: 'multi',
      skip_intake: true,
      budget_cap: 500,
      ...(testCase.injectGlobalSearchFlags ? {
        input: {
          _broker: {
            workflow: {
              forceWebSearch: true,
              requiresWebSearch: true,
              searchRequired: true,
              webSearchRequiredReason: 'global_user_quality_flag'
            }
          }
        }
      } : {})
    })
  });
  assert.equal(created.status, 201, `${testCase.taskType} should create successfully`);
  assert.ok(created.body.workflow_job_id, `${testCase.taskType} should return a workflow job id`);

  let latest = null;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    latest = await request(`/api/jobs/${created.body.workflow_job_id}`);
    assert.equal(latest.status, 200, `${testCase.taskType} workflow fetch should succeed`);
    if (['completed', 'failed', 'blocked'].includes(latest.body?.job?.status)) break;
  }

  const job = latest.body?.job || {};
  const childRuns = Array.isArray(job.workflow?.childRuns) ? job.workflow.childRuns : [];
  const expectedStatus = testCase.expectedStatus || 'completed';
  assert.equal(
    job.status,
    expectedStatus,
    `${testCase.taskType} workflow should reach ${expectedStatus}; counts=${JSON.stringify(job.workflow?.statusCounts || null)} childRuns=${JSON.stringify(childRuns.map((run) => ({ taskType: run.taskType, phase: run.sequencePhase, status: run.status, failure: run.failureReason })).slice(0, 20))}`
  );
  assert.ok(childRuns.length >= testCase.minChildren, `${testCase.taskType} should create enough child runs`);
  assert.ok(childRuns.some((run) => run.taskType === testCase.taskType), `${testCase.taskType} should include the leader child run`);
  assert.ok(childRuns.some((run) => run.taskType !== testCase.taskType), `${testCase.taskType} should include at least one specialist child run`);
  if (expectedStatus === 'completed') {
    assert.equal(Number(job.workflow?.statusCounts?.failed || 0), 0, `${testCase.taskType} should not leave failed child runs`);
    assert.equal(Number(job.workflow?.statusCounts?.blocked || 0), 0, `${testCase.taskType} should not leave blocked child runs at completion`);
    assert.equal(Number(job.workflow?.statusCounts?.queued || 0), 0, `${testCase.taskType} should not leave queued child runs at completion`);
    assert.equal(Number(job.workflow?.statusCounts?.running || 0), 0, `${testCase.taskType} should not leave running child runs at completion`);
  } else {
    assert.ok(Number(job.workflow?.statusCounts?.blocked || 0) > 0, `${testCase.taskType} should expose blocked action children`);
    assert.equal(job.output?.report?.authority_request?.missing_connector_capabilities?.includes(testCase.expectedBlockedCapability), true, `${testCase.taskType} should request the expected action authority`);
  }
  assert.ok(String(job.output?.summary || '').trim(), `${testCase.taskType} should produce a final summary`);
  assert.equal(job.workflow?.leaderActionProtocol?.leaderControlContract?.role, 'agent_selection_handoff_review_synthesis', `${testCase.taskType} should carry the programmed leader control contract`);
  assert.equal(job.workflow?.leaderActionProtocol?.leaderControlContract?.handoffOwner, 'leader', `${testCase.taskType} should keep leader-owned handoff in the control contract`);
  assert.equal(job.workflow?.leaderActionProtocol?.leaderControlContract?.orchestrationRole, 'sequence_and_quality_gate_only', `${testCase.taskType} orchestration should only enforce sequence and quality gates`);
  assert.ok(job.workflow?.leaderActionProtocol?.leaderControlContract?.controlLoop?.includes('review'), `${testCase.taskType} leader contract should require review`);

  const rawState = await storage.getState();
  const rawChildren = rawState.jobs.filter((item) => item.workflowParentId === created.body.workflow_job_id);
  const initialLeader = rawChildren.find((item) => item.taskType === testCase.taskType && item.input?._broker?.workflow?.sequencePhase === 'initial');
  assert.ok(initialLeader, `${testCase.taskType} should create an initial leader run`);
  assert.notEqual(initialLeader?.input?._broker?.workflow?.forceWebSearch, true, `${testCase.taskType} initial leader run should not browse`);
  assert.notEqual(initialLeader?.input?._broker?.workflow?.requiresWebSearch, true, `${testCase.taskType} initial leader run should not inherit global search requirements`);
  assert.notEqual(initialLeader?.input?._broker?.workflow?.searchRequired, true, `${testCase.taskType} initial leader run should not inherit global search requirements`);
  assert.equal(initialLeader?.input?._broker?.workflow?.leaderControlContract?.version, 'leader-control/v1', `${testCase.taskType} initial leader input should include leader contract`);
  const finalSummaryLeader = rawChildren.find((item) => item.taskType === testCase.taskType && item.input?._broker?.workflow?.sequencePhase === 'final_summary');
  assert.ok(finalSummaryLeader, `${testCase.taskType} should create a final summary leader run`);
  if (testCase.taskType === 'cpo_leader') {
    const cpoActionLayerChildren = rawChildren.filter((item) => item.taskType !== 'cpo_leader' && item.input?._broker?.workflow?.sequencePhase === 'action');
    assert.ok(
      cpoActionLayerChildren.some((item) => item.taskType === 'writing'),
      'cpo_leader should route the product handoff/specification through an action-layer writing child'
    );
    assert.equal(
      rawChildren.some((item) => item.taskType === 'cpo_leader' && item.input?._broker?.workflow?.requiresUserApprovalBeforeAction === true),
      false,
      'cpo_leader internal product handoff action should not require external-write approval'
    );
    assert.equal(
      rawChildren.some((item) => item.taskType === 'summary' && /teardown|competitor/i.test(String(item.workflowAgentName || item.workflow_agent_name || item.assignedAgentId || item.assigned_agent_id || ''))),
      false,
      'cpo_leader should not route final prompt handoff or summary work to the competitor teardown research agent'
    );
    assert.equal(
      rawChildren.some((item) => item.taskType === 'summary' && item.input?._broker?.workflow?.sequencePhase === 'prompt_handoff'),
      false,
      'cpo_leader prompt handoff should be owned by the CPO final summary leader run, not a separate summary specialist'
    );
  }
  if (expectedStatus === 'completed') {
    assert.equal(finalSummaryLeader?.qualityGate?.type, 'leader_output', `${testCase.taskType} final summary should be checked by the leader result quality gate`);
    assert.equal(finalSummaryLeader?.qualityGate?.passed, true, `${testCase.taskType} final summary should pass leader result quality gate`);
    assert.equal(finalSummaryLeader.status, 'completed', `${testCase.taskType} final summary should complete at workflow completion`);
  }
  const researchLayerChildren = rawChildren.filter((item) => item.taskType !== testCase.taskType && item.input?._broker?.workflow?.forceWebSearch === true);
  assert.ok(
    researchLayerChildren.every((item) => item.input?._broker?.workflow?.forceWebSearch === true),
    `${testCase.taskType} source-collection children should force web search`
  );
  assert.ok(
    researchLayerChildren.every((item) => item.input?._broker?.workflow?.webSearchRequiredReason === 'leader_research_layer'),
    `${testCase.taskType} source-collection children should explain forced search`
  );
  const nonResearchChildren = rawChildren.filter((item) => item.taskType !== testCase.taskType && item.input?._broker?.workflow?.forceWebSearch !== true);
  assert.ok(
    nonResearchChildren.every((item) => item.input?._broker?.workflow?.forceWebSearch !== true),
    `${testCase.taskType} downstream workflow children should not force web search`
  );
  const searchFlagLeaks = rawChildren.filter((item) => {
    const workflow = item.input?._broker?.workflow || {};
    if (
      item.taskType !== testCase.taskType
      && workflow.forceWebSearch === true
      && workflow.webSearchRequiredReason === 'leader_research_layer'
      && workflow.requiresWebSearch !== true
      && workflow.searchRequired !== true
    ) return false;
    return workflow.forceWebSearch === true || workflow.requiresWebSearch === true || workflow.searchRequired === true;
  });
  assert.deepEqual(
    searchFlagLeaks.map((item) => ({ taskType: item.taskType, phase: item.input?._broker?.workflow?.sequencePhase })),
    [],
    `${testCase.taskType} should not leak global search-required flags into leader/planning/preparation/action layers`
  );
  if (testCase.taskType === 'cmo_leader') {
    assert.ok(researchLayerChildren.length >= 1, 'cmo_leader should create search/research-layer specialist children');
    const dataLayerChildren = rawChildren.filter((item) => item.taskType !== testCase.taskType && item.input?._broker?.workflow?.sequencePhase === 'data');
    const planningLayerChildren = rawChildren.filter((item) => item.taskType !== testCase.taskType && item.input?._broker?.workflow?.sequencePhase === 'planning');
    const preparationLayerChildren = rawChildren.filter((item) => item.taskType !== testCase.taskType && item.input?._broker?.workflow?.sequencePhase === 'preparation');
    const actionLayerChildren = rawChildren.filter((item) => item.taskType !== testCase.taskType && item.input?._broker?.workflow?.sequencePhase === 'action');
    const additionalPromptFor = (item) => String(item?.additionalPrompt || item?.additional_prompt || item?.input?._broker?.workflow?.additionalPrompt || '').trim();
    assert.ok(dataLayerChildren.length <= 1, 'cmo_leader should use at most one data-layer specialist');
    assert.ok(dataLayerChildren.every((item) => item.taskType === 'data_analysis'), 'cmo_leader data layer should be reserved for data_analysis');
    assert.ok(planningLayerChildren.some((item) => ['media_planner', 'growth'].includes(item.taskType)), 'cmo_leader should create one planning-layer specialist');
    assert.ok(preparationLayerChildren.some((item) => ['list_creator', 'seo_gap', 'landing', 'writing', 'writer'].includes(item.taskType)), 'cmo_leader should create one preparation-layer specialist');
    assert.ok(planningLayerChildren.length <= 1, 'cmo_leader should keep planning-layer selection to one specialist');
    assert.ok(preparationLayerChildren.length <= 3, 'cmo_leader should keep preparation focused while allowing action-specific writing/support');
    assert.equal(researchLayerChildren.some((item) => item.taskType === 'data_analysis'), false, 'cmo_leader data analysis should not be mixed into the research layer');
    assert.ok(researchLayerChildren.length <= 1, 'cmo_leader should use at most one external research specialist');
    assert.ok(actionLayerChildren.some((item) => ['x_post', 'directory_submission', 'acquisition_automation'].includes(item.taskType)), 'cmo_leader action layer should include final action specialists');
    assert.ok(actionLayerChildren.some((item) => item.status === 'blocked' && item.output?.report?.authority_request?.missing_connector_capabilities?.includes('x.post')), 'cmo_leader should block X posting until x.post authority is approved');
    assert.ok(job.output?.report?.authority_request?.missing_connector_capabilities?.includes('x.post'), 'cmo_leader parent delivery should surface the blocked X approval request');
    assert.equal(job.output?.report?.completion_state, 'blocked_waiting_for_approval', 'cmo_leader parent delivery should keep approval-blocked completion state visible');
    assert.ok(
      job.output?.files?.some((file) => file?.content_type === 'social_post_pack' && file?.execution_candidate === true)
      || actionLayerChildren.some((item) => item.taskType === 'x_post' && item.output?.report?.authority_request?.missing_connector_capabilities?.includes('x.post')),
      'cmo_leader parent delivery should expose the X action packet or the blocked X authority request'
    );
    assert.ok(
      planningLayerChildren.concat(preparationLayerChildren, actionLayerChildren).some((item) => additionalPromptFor(item).includes('CANONICAL USER BRIEF')),
      'cmo_leader downstream specialists should receive the canonical user brief in additional_prompt'
    );
    assert.ok(
      planningLayerChildren.concat(preparationLayerChildren, actionLayerChildren).some((item) => additionalPromptFor(item).includes('STRUCTURED HANDOFF DIGEST')),
      'cmo_leader downstream specialists should receive the lightweight structured handoff digest in additional_prompt'
    );
    assert.ok(
      planningLayerChildren.concat(preparationLayerChildren, actionLayerChildren).some((item) => /Facts:|Sources:|Decisions:|Artifacts:|Blockers:|Next inputs:/.test(additionalPromptFor(item))),
      'cmo_leader structured handoff digest should expose compact facts/sources/decisions/artifacts/blockers/next inputs'
    );
    assert.ok(
      planningLayerChildren.concat(preparationLayerChildren, actionLayerChildren).some((item) => Array.isArray(item.input?._broker?.workflow?.leaderHandoff?.structuredHandoffDigest) && item.input._broker.workflow.leaderHandoff.structuredHandoffDigest.length > 0),
      'cmo_leader leaderHandoff should carry structured digest objects between layers'
    );
    assert.ok(
      planningLayerChildren.concat(preparationLayerChildren, actionLayerChildren).some((item) => item.input?._broker?.workflow?.leaderHandoff?.handoffOwner === 'leader'),
      'cmo_leader downstream leaderHandoff should be explicitly leader-owned'
    );
    assert.ok(
      preparationLayerChildren.concat(actionLayerChildren).some((item) => /Prior deliverable markdown excerpt|```markdown/.test(additionalPromptFor(item))),
      'cmo_leader downstream specialists should receive prior delivery markdown excerpts in additional_prompt'
    );
    const checkpointLeaders = rawChildren.filter((item) => item.taskType === 'cmo_leader' && item.input?._broker?.workflow?.sequencePhase === 'checkpoint');
    assert.ok(checkpointLeaders.length >= 3, 'cmo_leader should bridge research -> planning -> preparation -> action with checkpoint leader runs');
    assert.ok(checkpointLeaders.some((item) => item.input?._broker?.workflow?.requiresUserApprovalBeforeAction === true), 'cmo_leader should require approval before the final action layer');
    assert.ok(rawChildren.some((item) => item.taskType === 'cmo_leader' && item.input?._broker?.workflow?.sequencePhase === 'final_summary'), 'cmo_leader should create a final summary leader run');
    assert.equal(rawChildren.some((item) => item.taskType === 'summary'), false, 'leader workflows should not dispatch a separate summary specialist');
  }
}

const implicitCmoActionCreated = await request('/api/jobs', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    parent_agent_id: 'qa-runner',
    task_type: 'cmo_leader',
    prompt: [
      'caitの集客がしたい',
      '対象サービス: https://aiagent-marketplace.net',
      'Analytics data: GA4 + Search Console connector context attached.',
      '主な目的: 登録・トライアルを増やす',
      '優先チャネル: SNS・ソーシャル',
      '優先チャネル: 自然検索・SEO'
    ].join('\n'),
    order_strategy: 'multi',
    skip_intake: true,
    budget_cap: 500
  })
});
assert.equal(implicitCmoActionCreated.status, 201, 'cmo_leader acquisition workflow should create successfully without explicit post/send wording');
const implicitCmoRuns = Array.isArray(implicitCmoActionCreated.body?.child_runs) ? implicitCmoActionCreated.body.child_runs : [];
const implicitCmoActionRuns = implicitCmoRuns.filter((run) => String(run?.sequence_phase || run?.sequencePhase || '').trim().toLowerCase() === 'action');
assert.equal(implicitCmoActionRuns.length, 0, 'cmo_leader should not infer external action specialists from broad SNS/SEO planning context alone');
assert.equal(
  implicitCmoRuns.some((run) => ['x_post', 'instagram'].includes(String(run?.task_type || run?.taskType || '').trim().toLowerCase())),
  false,
  'cmo_leader broad SNS context should not default to X or Instagram connector work'
);
assert.ok(
  implicitCmoRuns.some((run) => String(run?.task_type || run?.taskType || '').trim().toLowerCase() === 'data_analysis'),
  'cmo_leader should use attached GA4/Search Console context as the single evidence lane for broad acquisition planning'
);
assert.ok(
  implicitCmoRuns.some((run) => String(run?.task_type || run?.taskType || '').trim().toLowerCase() === 'research'),
  'cmo_leader should keep market research separate from the optional data lane'
);

globalThis.fetch = originalLeaderWorkflowQaFetch;

console.log('leader workflows qa passed');

