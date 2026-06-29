import assert from 'node:assert/strict';
import { nowIso } from '../lib/shared.js';

function cmoWorkflowSpecialistArtifact(job, phase) {
  if (job.taskType === 'seo_specialist') {
    return [
      '## SEO page packet',
      'Target keyword cluster: AI agent marketplace for engineering teams.',
      'H1: AI agents that finish engineering and growth work from one chat.',
      'Meta title: CAIt - Order-ready AI agents for engineering teams',
      'Meta description: Compare, brief, and run AI agents for SEO, growth, writing, and software workflows with approval-gated delivery.',
      'Search intent: users want a trusted agent marketplace that can execute work, not only list tools.',
      'FAQ: What agents can run? How are approvals handled? How do teams reuse deliverables?',
      'Internal links: /chat for ordering, /delivery-manager.html for reuse, /agents for agent discovery.',
      'Draft section: explain the order flow, show proof from completed deliveries, then route users to the chat CTA.',
      'Measurement: signup_start, order_created, delivery_opened, approval_clicked.'
    ].join('\n');
  }
  if (['writing', 'writer', 'landing'].includes(job.taskType)) {
    return [
      '## Copy draft',
      'Hero headline: Turn one messy growth request into coordinated AI-agent work.',
      'Subhead: CAIt keeps the brief, research, specialist handoffs, approvals, and final delivery in one chat so technical teams can move from idea to usable output.',
      'Primary CTA: Start an order',
      'Proof block: Delivery packets show source status, agent chain, approval boundary, and reusable files.',
      'Objection handling: Nothing posts, sends, or writes externally until the exact action and connector account are approved.',
      'Body draft: Describe the problem, show the ordered workflow, explain how research feeds planning and preparation, then invite the user to run a small test order.',
      'Revision test: compare signup clicks from proof-first hero versus speed-first hero for seven days.'
    ].join('\n');
  }
  if (job.taskType === 'list_creator') {
    return [
      '## Reviewable lead rows',
      '| Company/source | URL | Why relevant | Next action |',
      '| CAIt | https://aiagent-marketplace.net/ | AI agent marketplace reference source from prior research | Review positioning and directory fit |',
      '| CAIt chat | https://aiagent-marketplace.net/chat | Conversion surface for order-ready agent work | Use as CTA destination in outreach |',
      'Exclusions: no placeholder rows, no query-only rows, no sources without public URLs.',
      'Approval boundary: do not send outreach until the exact recipient list and copy are approved.'
    ].join('\n');
  }
  if (['x_post', 'reddit', 'indie_hackers', 'cold_email', 'directory_submission', 'acquisition_automation'].includes(job.taskType)) {
    return [
      '## Exact approval-ready action draft',
      'Exact post draft: Most AI-agent marketplaces stop at discovery. CAIt is built around the order: clarify the brief, route to specialists, preserve research handoff, and return a reusable delivery packet before any external action is approved.',
      'Destination URL: https://aiagent-marketplace.net/chat',
      'CTA: Try one focused growth or engineering order and inspect the delivery chain.',
      'Stop rule: pause if there is no qualified signup or reply signal after seven days.',
      'Approval owner: user must approve the exact text, account, destination URL, and timing before posting or sending.'
    ].join('\n');
  }
  return [
    `## ${job.taskType} planning packet`,
    'Channel decision: prioritize SEO and technical-community validation before paid tests.',
    'Audience: developers and technical operators who need execution-ready AI-agent workflows.',
    'Evidence used: prior research source https://aiagent-marketplace.net/ and the leader handoff.',
    'Primary action: prepare page copy, SEO sections, and a social proof loop before external execution.',
    'Metric: qualified intent event and purchase.',
    'Stop rule: stop if no qualified signal after 7 days.'
  ].join('\n');
}

function cmoWorkflowSpecialistFileContent(job, phase) {
  const priorRuns = Array.isArray(job.input?._broker?.workflow?.leaderHandoff?.priorRuns)
    ? job.input._broker.workflow.leaderHandoff.priorRuns
    : [];
  const firstPriorSource = priorRuns
    .flatMap((run) => Array.isArray(run?.webSources) ? run.webSources : [])
    .find((source) => source?.url || source?.title)
    || null;
  const firstPriorSummary = String(priorRuns.find((run) => run?.summary)?.summary || '').trim();
  if (phase === 'research') {
    return [
      `# ${job.taskType} delivery`,
      '## Web sources used',
      '- CAIt AI agent marketplace https://aiagent-marketplace.net/',
      '- Observation date: 2026-04-29'
    ].join('\n');
  }
  return [
    `# qa ${phase} for ${job.taskType}`,
    firstPriorSource?.title ? `Uses handed-off source title: ${firstPriorSource.title}` : '',
    firstPriorSource?.url ? `Uses handed-off source URL: ${firstPriorSource.url}` : '',
    !firstPriorSource?.url && firstPriorSummary ? `Uses handed-off summary: ${firstPriorSummary}` : '',
    cmoWorkflowSpecialistArtifact(job, phase),
    `Artifact: ${job.taskType} ${phase} draft using CAIt AI agent marketplace https://aiagent-marketplace.net/ and the prior planning handoff.`,
    'Metric: qualified intent event and purchase.',
    'Stop rule: stop if no qualified signal after 7 days.'
  ].filter(Boolean).join('\n');
}

function cmoWorkflowJobPhase(job = {}) {
  return String(
    job.input?._broker?.workflow?.sequencePhase
    || job.workflow?.sequencePhase
    || job.sequencePhase
    || job.phase
    || ''
  ).trim().toLowerCase();
}

export async function completeAsyncWorkflowSpecialists({
  qaStorage,
  workflowJobId,
  phase,
  nextAction
} = {}) {
  const normalizedPhase = String(phase || '').trim().toLowerCase();
  await qaStorage.mutate(async (draft) => {
    for (const job of draft.jobs) {
      if (
        job.workflowParentId === workflowJobId
        && job.taskType !== 'cmo_leader'
        && cmoWorkflowJobPhase(job) === normalizedPhase
      ) {
        job.status = 'completed';
        job.completedAt = job.completedAt || nowIso();
        job.failedAt = null;
        job.timedOutAt = null;
        job.failureReason = null;
        job.failureCategory = null;
        job.output = {
          report: {
            summary: `qa ${phase} completed for ${job.taskType} with an action packet artifact using https://aiagent-marketplace.net/`,
            bullets: [
              `${job.taskType} ${phase} evidence from CAIt AI agent marketplace https://aiagent-marketplace.net/`,
              `Action packet artifact for ${job.taskType} uses the prior handoff and includes metric plus stop rule.`
            ],
            nextAction,
            ...(phase === 'research'
              ? {
                  web_sources: [
                    {
                      title: 'CAIt AI agent marketplace',
                      url: 'https://aiagent-marketplace.net/',
                      snippet: 'QA search result used for workflow progression tests.',
                      query: 'CAIt AI agent marketplace acquisition',
                      action: 'brave_search'
                    }
                  ]
                }
              : {})
          },
          files: [{ name: `${job.taskType}-${phase}.md`, content: cmoWorkflowSpecialistFileContent(job, phase) }]
        };
        job.dispatch = { ...(job.dispatch || {}), completionStatus: 'completed' };
      }
    }
  });
}

export async function pollWorkflowWithWaits({
  request,
  env,
  qaStorage,
  workflowJobId
} = {}) {
  await request(`/api/jobs/${workflowJobId}`, {}, { env });
  const waits = [];
  const poll = await request(`/api/jobs/${workflowJobId}`, {}, { waitUntilPromises: waits, env });
  assert.equal(poll.status, 200);
  for (let i = 0; i < 4; i += 1) {
    const seen = waits.length;
    await Promise.allSettled(waits);
    await new Promise((resolve) => setTimeout(resolve, 0));
    if (waits.length === seen) break;
  }
  return qaStorage.getState();
}
