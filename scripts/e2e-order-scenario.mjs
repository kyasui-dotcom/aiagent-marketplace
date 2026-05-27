import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const E2E_DEFAULT_ORDER_PROMPT = `Task: cmo_leader
Goal: Original request:
集客

User clarification:
- アナリティクス: GA4/Search Consoleを使う
- 主な目的: 問い合わせ・リード獲得を増やす
- 優先チャネル: 自然検索・SEO
- 優先チャネル: SNS・ソーシャル
- 優先チャネル: 広告
- 対象サービス: https://aiagent-marketplace.net/chat
- 主な目的: 登録・トライアルを増やす
- 対象ユーザー: 開発者・技術ユーザー
- 制約: 深さ・品質優先

Use these clarification details and produce the requested delivery. State any remaining assumptions briefly.
Conversation lead: CMO Leader (cmo_leader)
Work split: team workflow
Inputs: chat request and any URLs or constraints in the message
Constraints: keep the user-facing flow chat-first; do not claim external writes without connector proof
Deliver: チャットに進捗と納品を返す。必要なHTML/ファイルは納品カードとして表示する。
Output language: Japanese
Acceptance: concrete delivery, visible waiting states, source/connector status, and next action are all posted back into this chat`;

const INTERNAL_DELIVERY_FILE_NAMES = new Set([
  'integrated-delivery.md',
  'supporting-specialist-deliverables.md'
]);

function envValue(source = {}, key = '') {
  return String(source?.[key] || '').trim();
}

export function loadOrderScenarioPromptFromEnv(source = process.env) {
  const promptFile = envValue(source, 'E2E_ORDER_PROMPT_FILE');
  if (promptFile) return readFileSync(resolve(promptFile), 'utf8').trim();
  return envValue(source, 'E2E_ORDER_PROMPT') || E2E_DEFAULT_ORDER_PROMPT;
}

export function buildDefaultOrderScenarioAppContexts() {
  return [
    {
      id: `e2e-analytics-context-${Date.now().toString(36)}`,
      source_app: 'analytics_console',
      source_app_label: 'E2E Analytics Context',
      title: 'E2E GA4/Search Console context for CAIt growth QA',
      summary: [
        'Server-side E2E fixture representing attached GA4 and Search Console context.',
        'Use this as measurement context only; do not claim a live external write.',
        'The target service is https://aiagent-marketplace.net/chat and the goal is developer signups/trials.'
      ].join(' '),
      facts: [
        'Primary conversion: signup/trial intent from developer and technical users.',
        'Priority channels: organic search/SEO, SNS/social, and paid ads.',
        'External publishing or ad launch still requires explicit approval.'
      ],
      metrics: [
        { label: 'GA4 active users baseline', value: 'E2E fixture: low-volume baseline, validate trend after launch' },
        { label: 'Search Console query coverage', value: 'E2E fixture: AI agent marketplace and developer automation queries' },
        { label: 'Primary conversion event', value: 'signup_or_trial_start' }
      ],
      raw_context: {
        connector_provider: 'google',
        connector_type: 'analytics_context',
        connector_services: ['ga4', 'gsc'],
        googleGa4Property: 'properties/e2e-fixture',
        googleSearchConsoleSite: 'https://aiagent-marketplace.net/',
        googleReportLoaded: true,
        googleReportSources: ['ga4', 'search_console'],
        fixture: true
      },
      created_at: new Date().toISOString()
    }
  ];
}

export function loadOrderScenarioAppContextsFromEnv(source = process.env) {
  const contextFile = envValue(source, 'E2E_ORDER_CONTEXT_FILE');
  if (!contextFile) return buildDefaultOrderScenarioAppContexts();
  const parsed = JSON.parse(readFileSync(resolve(contextFile), 'utf8'));
  return Array.isArray(parsed) ? parsed : [parsed];
}

export function buildOrderScenarioPayload(options = {}) {
  const prompt = String(options.prompt || E2E_DEFAULT_ORDER_PROMPT).trim();
  const taskType = String(options.taskType || options.task_type || 'cmo_leader').trim() || 'cmo_leader';
  const clientOrderId = String(options.clientOrderId || options.client_order_id || `e2e_order_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`)
    .replace(/[^A-Za-z0-9_-]/g, '_')
    .slice(0, 96);
  const appContexts = options.appContexts === false
    ? []
    : (Array.isArray(options.appContexts) ? options.appContexts : buildDefaultOrderScenarioAppContexts());
  const broker = {
    commonQualityRules: [
      'Use source-backed evidence; do not use placeholder or fallback-thin delivery.',
      'Keep external posting, sending, repository writes, and ad launch approval-gated.',
      'Return visible chat delivery with source/connector status, concrete next action, metric, and stop rule.'
    ],
    activeLeaderLocked: true,
    activeLeader: { taskType, label: taskType === 'cmo_leader' ? 'CMO Leader' : taskType },
    conversationOwner: { type: 'leader', taskType, label: taskType === 'cmo_leader' ? 'CMO Leader' : taskType },
    intake: {
      confirmed: true,
      answered: true,
      prepared_in_chat: true,
      checked_at: new Date().toISOString()
    },
    chatux: {
      delivery_channel: 'chat',
      return_path: '/chat',
      e2e_order_scenario: true
    },
    chatSessionId: `e2e-order-${clientOrderId}`,
    appContexts,
    connectorContexts: appContexts,
    e2e: {
      scenario: 'order-scenario',
      quality_required: true,
      exact_prompt: prompt === E2E_DEFAULT_ORDER_PROMPT
    }
  };

  return {
    parent_agent_id: String(options.parentAgentId || options.parent_agent_id || 'playwright-e2e-order').trim(),
    task_type: taskType,
    prompt,
    order_strategy: 'multi',
    async_dispatch: true,
    skip_intake: true,
    budget_cap: Number(options.budgetCap || options.budget_cap || 500) || 500,
    deadline_sec: Number(options.deadlineSec || options.deadline_sec || 300) || 300,
    client_order_id: clientOrderId,
    clientOrderId: clientOrderId,
    session_id: broker.chatSessionId,
    input: {
      source: 'e2e_order_scenario',
      original_prompt: prompt,
      output_language: /Output language:\s*Japanese|日本語|Japanese/i.test(prompt) ? 'ja' : '',
      appContexts,
      connectorContexts: appContexts,
      _broker: broker
    }
  };
}

export function jobFromOrderResponse(body = {}) {
  return body?.job && typeof body.job === 'object' ? body.job : body;
}

export function visibleDeliveryFiles(files = []) {
  return (Array.isArray(files) ? files : []).filter((file) => {
    if (!file || typeof file !== 'object') return false;
    const name = String(file.name || file.filename || '').trim().toLowerCase();
    const visibility = String(file.visibility || file.delivery_visibility || file.deliveryVisibility || '').trim().toLowerCase();
    if (INTERNAL_DELIVERY_FILE_NAMES.has(name)) return false;
    if (file.delivery_visible === false || file.deliveryVisible === false || file.user_visible === false || file.userVisible === false || file.visible === false || file.internal === true || file.internal_only === true) return false;
    if (['internal', 'hidden', 'system'].includes(visibility)) return false;
    return true;
  });
}

function normalizeDeliverySection(value = '') {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function appendUniqueDeliverySection(sections, value) {
  const section = normalizeDeliverySection(value);
  if (!section) return;
  const replacementIndex = sections.findIndex((existing) => section.length > existing.length + 80 && section.includes(existing));
  if (replacementIndex >= 0) {
    sections.splice(replacementIndex, 1, section);
    return;
  }
  const duplicate = sections.some((existing) => existing === section || existing.includes(section));
  if (!duplicate) sections.push(section);
}

function deliveryNeedsApprovalBoundary(job = {}, text = '') {
  const source = [
    job?.prompt,
    job?.originalPrompt,
    job?.input?.prompt,
    text
  ].map((item) => String(item || '')).join('\n');
  if (!/(SNS|ソーシャル|広告|ads?|paid|publish|posting|post|send|external|投稿|送信|公開|掲載|配信|外部実行)/i.test(source)) return false;
  return !/(承認|approval|approve|外部実行)/i.test(text);
}

function approvalBoundarySection() {
  return [
    '## 実行に進む前に',
    '- 投稿・送信・広告配信・公開・外部サービスへの適用は、対象アカウント、文案、URL、予算、停止条件を確認し、承認してから実行してください。',
    '- この納品は実行前の計画・改善案です。外部への反映や配信完了を意味しません。'
  ].join('\n');
}

export function collectOrderDeliveryText(job = {}) {
  const output = job?.output && typeof job.output === 'object' ? job.output : {};
  const report = output.report && typeof output.report === 'object' ? output.report : {};
  const visibleFiles = visibleDeliveryFiles(output.files || []);
  const sections = [];
  for (const file of visibleFiles) {
    appendUniqueDeliverySection(sections, [file.content, file.markdown, file.summary].filter(Boolean).join('\n\n'));
  }
  if (!sections.length) {
    appendUniqueDeliverySection(sections, output.summary);
    appendUniqueDeliverySection(sections, output.nextAction || output.next_action);
    appendUniqueDeliverySection(sections, [report.summary, report.nextAction, report.next_action].filter(Boolean).join('\n\n'));
  }
  if (deliveryNeedsApprovalBoundary(job, sections.join('\n\n'))) appendUniqueDeliverySection(sections, approvalBoundarySection());
  return sections.join('\n\n').trim();
}

export function summarizeOrderStatus(job = {}) {
  const workflow = job?.workflow && typeof job.workflow === 'object' ? job.workflow : {};
  const runs = Array.isArray(workflow.childRuns) ? workflow.childRuns : [];
  const counts = workflow.statusCounts || {};
  const active = runs.find((run) => ['running', 'queued', 'blocked', 'waiting'].includes(String(run?.status || '').toLowerCase())) || runs.at(-1) || null;
  return [
    `status=${String(job?.status || 'unknown')}`,
    `runs=${Number(counts.completed || 0)}/${runs.length || Number(workflow.plannedChildRunCount || 0) || 0}`,
    counts.failed ? `failed=${counts.failed}` : '',
    active ? `active=${active.sequencePhase || active.phase || ''}/${active.taskType || ''}/${active.status || ''}` : ''
  ].filter(Boolean).join(' ');
}

function assertTextIncludesAny(text, alternatives, message) {
  const haystack = String(text || '').toLowerCase();
  assert.ok(alternatives.some((term) => haystack.includes(String(term).toLowerCase())), message);
}

function assertTextMatchesAny(text, patterns, message) {
  const haystack = String(text || '');
  assert.ok(patterns.some((pattern) => pattern.test(haystack)), message);
}

function promptHas(prompt, pattern) {
  return pattern.test(String(prompt || ''));
}

function urlsFromPrompt(prompt = '') {
  return [...String(prompt || '').matchAll(/https?:\/\/[^\s)]+/g)].map((match) => match[0].replace(/[.,。]+$/, ''));
}

export function orderHasExplicitApprovalWait(job = {}) {
  const output = job?.output && typeof job.output === 'object' ? job.output : {};
  const report = output.report && typeof output.report === 'object' ? output.report : {};
  const workflow = job?.workflow && typeof job.workflow === 'object' ? job.workflow : {};
  const runs = Array.isArray(workflow.childRuns) ? workflow.childRuns : [];
  const text = JSON.stringify([
    job.failureCategory,
    job.failureReason,
    job.dispatch,
    workflow.requiresUserApprovalBeforeAction,
    report.authority_request,
    report.authorityRequest,
    output.authority_request,
    output.nextAction,
    output.next_action,
    runs
  ]);
  return /blocked_waiting_for_approval|authority_request|missing_connectors|missing_connector_capabilities|approval|approve|承認|未承認|書き込み権限|requiresUserApprovalBeforeAction/i.test(text);
}

export function assertOrderScenarioWorkflowShape(job = {}, options = {}) {
  const prompt = String(options.prompt || job.prompt || '');
  const workflow = job?.workflow && typeof job.workflow === 'object' ? job.workflow : {};
  const runs = Array.isArray(workflow.childRuns) ? workflow.childRuns : [];
  if (!runs.length) return;
  const taskTypes = runs.map((run) => String(run?.taskType || run?.task_type || '').trim()).filter(Boolean);
  const phases = runs.map((run) => String(run?.sequencePhase || run?.phase || '').trim()).filter(Boolean);
  const isCmo = /Task:\s*cmo_leader|CMO Leader|cmo_leader/i.test(prompt) || String(job.taskType || '') === 'cmo_leader';
  if (!isCmo) return;

  assert.ok(taskTypes.includes('cmo_leader'), 'CMO scenario must keep CMO Leader in the workflow');
  assert.equal(taskTypes.includes('cto_leader'), false, 'CMO scenario must not switch to CTO Leader');
  assert.equal(taskTypes.includes('cpo_leader'), false, 'CMO scenario must not switch to CPO Leader');
  if (promptHas(prompt, /GA4|Search Console|アナリティクス|analytics|gsc/i)) {
    assert.ok(taskTypes.includes('data_analysis'), `CMO analytics scenario must include a data layer; tasks=${taskTypes.join(',')}`);
  }
  assert.ok(taskTypes.includes('research'), `CMO acquisition scenario must include one research layer; tasks=${taskTypes.join(',')}`);
  assert.ok(taskTypes.includes('media_planner') || taskTypes.includes('growth'), `CMO channel scenario must include planning; tasks=${taskTypes.join(',')}`);
  assert.ok(taskTypes.some((task) => ['seo_specialist', 'writing', 'landing'].includes(task)), `CMO channel scenario must include preparation work; tasks=${taskTypes.join(',')}`);
  assert.ok(
    taskTypes.some((task) => ['directory_submission', 'x_post', 'reddit', 'indie_hackers', 'acquisition_automation', 'instagram'].includes(task))
    || phases.includes('action')
    || workflow.requiresUserApprovalBeforeAction === true,
    `CMO scenario must reach or explicitly gate action planning; tasks=${taskTypes.join(',')} phases=${phases.join(',')}`
  );
  if (!promptHas(prompt, /competitor|競合|teardown|parallel|same[-\s]?layer|fan[-\s]?out|同列|同時|並列|深さ|品質優先|品質重視|徹底|網羅/i)) {
    assert.equal(taskTypes.includes('teardown'), false, 'CMO scenario should not add competitor teardown unless requested');
  }
  const dataCount = taskTypes.filter((task) => task === 'data_analysis').length;
  assert.ok(dataCount <= 1, `CMO scenario should not over-select the data layer; count=${dataCount}`);
}

function hasUnsafePlaceholderText(value = '') {
  const text = String(value || '');
  const pattern = /\b(TBD|TODO|lorem ipsum|placeholder|dummy output)\b/ig;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const term = String(match[0] || '').toLowerCase();
    const before = text.slice(Math.max(0, match.index - 24), match.index).toLowerCase();
    const after = text.slice(match.index + term.length, match.index + term.length + 32).toLowerCase();
    if (term === 'placeholder' && /\b(no|without|exclude|excluding|exclusions:\s*no)\s+$/.test(before)) continue;
    if (term === 'todo' && /^(\s|-|:|：)*(list|items?|tasks?|優先度|リスト|一覧)/i.test(after)) continue;
    if (term === 'todo' && /^(\s|\)|）|、|。)*(?:\r?\n|$)/.test(after)) continue;
    return true;
  }
  return false;
}

export function assertOrderScenarioQuality(job = {}, options = {}) {
  const prompt = String(options.prompt || job.prompt || E2E_DEFAULT_ORDER_PROMPT);
  const status = String(job?.status || '').toLowerCase();
  const terminalFailure = ['failed', 'timed_out'].includes(status);
  assert.equal(terminalFailure, false, `order failed before usable delivery: ${summarizeOrderStatus(job)} reason=${String(job?.failureReason || '')}`);
  assertOrderScenarioWorkflowShape(job, { prompt });

  const workflow = job?.workflow && typeof job.workflow === 'object' ? job.workflow : {};
  const runs = Array.isArray(workflow.childRuns) ? workflow.childRuns : [];
  const failedRuns = runs.filter((run) => ['failed', 'timed_out'].includes(String(run?.status || '').toLowerCase()));
  assert.equal(
    failedRuns.length,
    0,
    `workflow child runs must not fail or time out: ${failedRuns.map((run) => `${run.taskType}/${run.sequencePhase || ''}/${run.status}/${run.failureReason || ''}`).join(' | ')}`
  );
  assert.ok(
    !/completion_queue_exhausted|Built-in workflow dispatch queue was requested repeatedly/i.test(JSON.stringify(job)),
    'workflow dispatch queue exhaustion must be recovered before delivery'
  );

  const output = job?.output && typeof job.output === 'object' ? job.output : {};
  const files = Array.isArray(output.files) ? output.files : [];
  const leakedInternalFiles = files.filter((file) => INTERNAL_DELIVERY_FILE_NAMES.has(String(file?.name || '').trim().toLowerCase())
    && !(file.delivery_visible === false || file.visible === false || file.internal === true || file.internal_only === true));
  assert.equal(leakedInternalFiles.length, 0, `internal workflow markdown must not be visible delivery: ${leakedInternalFiles.map((file) => file.name).join(', ')}`);

  const allowWaiting = options.allowWaiting === true;
  const explicitApprovalWait = allowWaiting && status === 'blocked' && orderHasExplicitApprovalWait(job);
  if (options.requireCompleted !== false) {
    assert.ok(
      status === 'completed' || explicitApprovalWait,
      `order should complete or explicitly wait for approval before delivery QA; ${summarizeOrderStatus(job)}`
    );
  }

  const deliveryText = collectOrderDeliveryText(job);
  const minDeliveryChars = Number(options.minDeliveryChars || 900) || 900;
  assert.ok(deliveryText.length >= minDeliveryChars, `delivery is too thin (${deliveryText.length} chars); status=${summarizeOrderStatus(job)}`);
  assert.ok(!hasUnsafePlaceholderText(deliveryText), 'delivery must not contain placeholder text');
  assert.ok(!/\[object Object\]/.test(deliveryText), 'delivery files must not serialize object payloads as [object Object]');
  assert.ok(!/Integrated summary will appear here once the leader merge is ready/i.test(deliveryText), 'delivery must not expose unfinished leader merge placeholder text');
  assert.ok(!/Open the raw per-agent delivery files to inspect what each agent actually produced/i.test(deliveryText), 'delivery must include the actual work product instead of telling the user to inspect raw files');
  const visibleFiles = visibleDeliveryFiles(files);
  const rawAgentFiles = visibleFiles.filter((file) => file.raw_agent_delivery === true || file.rawAgentDelivery === true);
  assert.ok(
    rawAgentFiles.every((file) => String(file.content || file.markdown || '').trim().length >= 250),
    `raw agent delivery files must include substantial returned content: ${rawAgentFiles.map((file) => `${file.name}:${String(file.content || file.markdown || '').trim().length}`).join(', ')}`
  );
  assert.ok(
    rawAgentFiles.every((file) => file.user_facing_delivery === true || file.userFacingDelivery === true),
    `raw agent delivery files must be explicitly user-facing: ${rawAgentFiles.map((file) => file.name).join(', ')}`
  );
  assert.ok(
    rawAgentFiles.every((file) => !/^##\s*verbosity\s+medium\s*$/i.test(String(file.content || file.markdown || '').trim())),
    'raw agent delivery files must not expose Responses API text.verbosity metadata as the delivery'
  );
  assert.ok(
    rawAgentFiles.every((file) => !/(^|\n)#{1,6}\s*(facts_verified|assumptions_used|evidence_gaps|artifact_for_next_agent|recommended_next_owner|structured handoff digest|supporting fact index|downstream handoff(?: summary| packet)?|採用判断表|publisher下書き状態|external app ingest status)\b/i.test(String(file.content || file.markdown || ''))),
    `raw agent delivery files must read as user-facing markdown, not internal handoff structure: ${rawAgentFiles.map((file) => file.name).join(', ')}`
  );
  assert.ok(
    !/(^|\n)\s*(?:[-*]\s*)?(source_task_type|source_agent_name|source_run_id|artifact_for_next_agent|recommended_next_owner)\s*[:：]/i.test(deliveryText),
    'delivery must not expose internal source or handoff metadata inside markdown'
  );
  assert.ok(
    !/(^|\n)\s*(?:medium|final_summary|cmo_growth_recommendation_plan|source_collection|analytics_console|brave_web_search|brave_search)\s*(?=\n|$)/i.test(deliveryText),
    'delivery must not expose standalone internal enum/provider fields inside markdown'
  );
  assert.ok(
    !/(Task:\s*[a-z_]+|CMO checkpoint|次担当:\s*[a-z_]+|期待成果物:)/i.test(deliveryText),
    'delivery must not expose orchestration task labels or checkpoint handoff text inside markdown'
  );
  assert.ok(
    rawAgentFiles.every((file) => String(file.source_agent_name || file.sourceAgentName || '').trim() && String(file.source_task_type || file.sourceTaskType || '').trim() && String(file.source_run_id || file.sourceRunId || '').trim()),
    `raw agent delivery files must carry source agent/task/run labels for review: ${rawAgentFiles.map((file) => file.name).join(', ')}`
  );
  if (rawAgentFiles.length > 1) {
    const digest = String(output.report?.final_delivery_digest || output.report?.finalDeliveryDigest || '');
    assert.ok(!/Agent:\s+|Task:\s+/i.test(digest), 'leader digest must stay user-facing and keep agent/task provenance out of markdown');
  }
  if (promptHas(prompt, /Output language:\s*Japanese|日本語|集客|問い合わせ|登録|トライアル/iu)) {
    assert.ok(/[\u3040-\u30ff\u3400-\u9fff]/u.test(deliveryText), 'Japanese scenario must produce Japanese-visible delivery');
  }
  const promptUrls = urlsFromPrompt(prompt);
  if (promptUrls.length) {
    const first = new URL(promptUrls[0]);
    assert.ok(
      deliveryText.includes(promptUrls[0]) || deliveryText.includes(first.origin) || deliveryText.includes(first.hostname),
      `delivery must reference the requested target URL/host: ${promptUrls[0]}`
    );
  }
  if (promptHas(prompt, /GA4|Google Analytics|アナリティクス/i)) {
    assertTextIncludesAny(deliveryText, ['GA4', 'Google Analytics', 'アナリティクス'], 'delivery must state GA4/analytics source status or use');
  }
  if (promptHas(prompt, /Search Console|サーチコンソール|GSC/i)) {
    assertTextIncludesAny(deliveryText, ['Search Console', 'GSC', 'サーチコンソール'], 'delivery must state Search Console/GSC source status or use');
  }
  const completedTaskTypes = new Set(runs
    .filter((run) => String(run?.status || '').toLowerCase() === 'completed')
    .map((run) => String(run?.taskType || run?.task_type || '').trim())
    .filter(Boolean));
  const completedPhases = new Set(runs
    .filter((run) => String(run?.status || '').toLowerCase() === 'completed')
    .map((run) => String(run?.sequencePhase || run?.phase || '').trim().toLowerCase())
    .filter(Boolean));
  const completedDownstreamWork = ['planning', 'preparation', 'action', 'checkpoint', 'final_summary']
    .some((phase) => completedPhases.has(phase));
  if (completedTaskTypes.has('data_analysis') && completedDownstreamWork) {
    assertTextMatchesAny(
      deliveryText,
      [/データソース|接続データ|実測|指標|測定|コンテキスト/u, /\bdata source\b|\bsource status\b|\bmeasured\b|\bmetrics?\b|\bdata context\b/i],
      'delivery must show that downstream work used the upstream data_analysis packet'
    );
    assertTextMatchesAny(
      deliveryText,
      [/未確認|仮定|不足|実測値がない/u, /\bunverified\b|\bassumption\b|\bmissing metric\b|\bnot measured\b/i],
      'delivery must separate measured data from assumptions when using upstream analytics context'
    );
  }
  if (completedTaskTypes.has('research') && completedDownstreamWork) {
    assertTextMatchesAny(
      deliveryText,
      [/リサーチ|調査|出典|根拠|公開情報/u, /\bresearch\b|\bevidence\b|\bsource\b|\bpublic\b/i],
      'delivery must show that downstream work used upstream research evidence'
    );
  }
  if (promptHas(prompt, /SEO|自然検索|organic/i)) {
    assertTextIncludesAny(deliveryText, ['SEO', '自然検索', 'organic'], 'delivery must include concrete SEO/organic search work');
  }
  if (promptHas(prompt, /SNS|ソーシャル|social/i)) {
    assertTextIncludesAny(deliveryText, ['SNS', 'ソーシャル', 'social', 'X', 'LinkedIn', 'Reddit'], 'delivery must include concrete SNS/social work');
  }
  if (promptHas(prompt, /広告|ads?|paid|advertising/i)) {
    assertTextIncludesAny(deliveryText, ['広告', 'ads', 'paid', 'PPC', 'キャンペーン'], 'delivery must include concrete paid advertising work');
  }
  if (promptHas(prompt, /external writes?|投稿|送信|広告|SNS|publish|approval|承認/i)) {
    assertTextIncludesAny(deliveryText, ['承認', 'approval', 'approve', '外部実行'], 'delivery must keep external execution approval-gated');
  }
  assertTextIncludesAny(deliveryText, ['次', 'next', 'action', '実行', '承認'], 'delivery must include a next action');
  return { deliveryText, visibleFiles };
}
