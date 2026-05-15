const AGENT_PROVIDER = Object.freeze({
  health({ kind = '', definition = {}, source = {} } = {}) {
    const seed = agentProviderObject(definition.seedProfile);
    return {
      ok: true,
      service: agentProviderText(definition.healthService, kind || 'agent'),
      kind,
      mode: 'provider_contract',
      provider: 'agent_file',
      generation_provider: agentProviderText(source.OPENAI_API_KEY || source.BUILTIN_OPENAI_API_KEY) ? 'agent_configured' : 'agent_definition_packet',
      file_name: definition.fileName || null,
      model_role: definition.modelRole || null,
      execution_layer: definition.executionLayer || seed.metadata?.layer || null,
      task_types: agentProviderList(seed.taskTypes),
      capabilities: agentProviderList(seed.capabilities),
      tool_strategy: agentProviderObject(definition.toolStrategy),
      specialist_method: agentProviderList(definition.specialistMethod),
      scope_boundaries: agentProviderList(definition.scopeBoundaries),
      freshness_policy: definition.freshnessPolicy || null,
      sensitive_data_policy: definition.sensitiveDataPolicy || null,
      cost_control_policy: definition.costControlPolicy || null
    };
  },

  async runJob({ kind = '', definition = {}, body = {} } = {}) {
    const prompt = agentProviderPrompt(body);
    const japanese = agentProviderJapanese([prompt, body.output_language, body.outputLanguage].join('\n'));
    const seed = agentProviderObject(definition.seedProfile);
    const name = agentProviderText(seed.name || definition.healthService || kind, kind || 'agent');
    const markdown = agentProviderMarkdown(kind, definition, body);
    return {
      accepted: true,
      status: 'completed',
      summary: japanese
        ? `${name} が自身の agent ファイル内 provider 実装で納品しました。`
        : `${name} completed through its own agent-file provider implementation.`,
      report: {
        summary: japanese ? `${name} provider delivery` : `${name} provider delivery`,
        bullets: [
          japanese ? '共通 builtin runner ではなく、この agent ファイル内の provider.runJob が処理しました。' : 'Handled by provider.runJob inside this agent file, not by a central built-in runner.',
          japanese ? '外部投稿、送信、公開、PR作成などは実行していません。' : 'No external posting, sending, publishing, or repository write was performed.',
          japanese ? '改善が必要な場合はこの agent ファイルの provider 実装を直接変更します。' : 'Future behavior changes should be made in this agent file provider implementation.'
        ],
        nextAction: agentProviderText(definition.nextAction, japanese ? '不足情報を確認して次の実行に進んでください。' : 'Review missing inputs, then continue with the next provider action.'),
        confidence: prompt === 'No prompt provided.' ? 'low' : 'medium'
      },
      files: [{
        name: agentProviderText(definition.fileName, `${kind || 'agent'}-delivery.md`),
        type: 'text/markdown',
        content: markdown,
        source_task_type: kind,
        content_type: 'agent_file_provider_delivery'
      }],
      usage: {
        total_cost_basis: agentProviderUsage(definition),
        compute_cost: Math.round(agentProviderUsage(definition) * 0.35),
        tool_cost: Math.round(agentProviderUsage(definition) * 0.15),
        labor_cost: Math.round(agentProviderUsage(definition) * 0.5),
        api_cost: 0
      },
      return_targets: ['chat', 'api'],
      runtime: {
        mode: 'provider_contract',
        provider: 'agent_file',
        kind,
        service: definition.healthService || null,
        file_name: definition.fileName || null
      }
    };
  }
});

function agentProviderText(value = '', fallback = '') {
  const safe = String(value ?? '').trim();
  return safe || fallback;
}

function agentProviderList(value = []) {
  return Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : [];
}

function agentProviderObject(value = {}) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function agentProviderJapanese(value = '') {
  const text = String(value || '').toLowerCase();
  if (/\b(en|english)\b/.test(text)) return false;
  if (/\b(ja|jp|japanese)\b/.test(text)) return true;
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(text);
}

function agentProviderPrompt(body = {}) {
  return agentProviderText(body.goal || body.full_prompt || body.fullPrompt || body.prompt, 'No prompt provided.');
}

function agentProviderUsage(definition = {}) {
  return Math.max(40, Math.round(Number(definition.seedProfile?.avgLatencySec || 10) * 4));
}

function agentProviderSection(title = '', values = []) {
  const items = agentProviderList(values);
  if (!items.length) return '';
  return [`## ${title}`, ...items.map((item) => `- ${item}`)].join('\n');
}

function agentProviderMarkdown(kind = '', definition = {}, body = {}) {
  const seed = agentProviderObject(definition.seedProfile);
  const prompt = agentProviderPrompt(body);
  const lines = [
    `# ${agentProviderText(definition.fileName, `${kind || 'agent'}-delivery.md`).replace(/\.md$/i, '').replace(/-/g, ' ')}`,
    '',
    '## Request',
    prompt,
    '',
    '## Agent-owned behavior',
    `- agent: ${agentProviderText(seed.name || definition.healthService || kind, kind || 'agent')}`,
    `- role: ${agentProviderText(definition.modelRole, 'provider-defined agent')}`,
    `- layer: ${agentProviderText(definition.executionLayer || seed.metadata?.layer, 'worker')}`,
    definition.executionFocus ? `- Execution focus: ${definition.executionFocus}` : '',
    definition.firstMove ? `- First move: ${definition.firstMove}` : '',
    definition.evidencePolicy ? `- Evidence policy: ${definition.evidencePolicy}` : '',
    definition.nextAction ? `- Next action rule: ${definition.nextAction}` : '',
    '',
    agentProviderSection('Expected output sections', definition.outputSections),
    '',
    agentProviderSection('Input needs', definition.inputNeeds),
    '',
    agentProviderSection('Acceptance checks', definition.acceptanceChecks),
    '',
    agentProviderSection('Scope boundaries', definition.scopeBoundaries),
    '',
    agentProviderSection('Specialist method', definition.specialistMethod),
    '',
    '## Delivery packet',
    agentProviderText(definition.deliverableHint, 'Return the concrete work product requested by the user, with assumptions and next action clearly separated.'),
    '',
    '## Review notes',
    agentProviderText(definition.reviewHint, 'Check the output against this agent definition before returning it.')
  ];
  return lines.filter((line) => line !== '').join('\n').replace(/\n{3,}/g, '\n\n');
}
const AGENT_DEFINITION = {
  provider: AGENT_PROVIDER,
  "fileName": "code-delivery.md",
  "healthService": "code_agent",
  "modelRole": "software implementation and debugging",
  "executionLayer": "implementation",
  "taskRouting": {
    "aliases": ['debug', 'ops', 'automation'],
    "inferenceRules": [
      { taskType: 'code', patterns: [/(?:\bfix\b|\bbug\b|\bdebug\b|\bapi\b|\bserver\b|\bworker\b|\bdeploy\b|\bbilling\b|\bui\b|user interface|実装|修正|コード|画面|エンドポイント|サーバー|ワーカー|デプロイ|請求|決済)/i] },
      { taskType: 'ops', patterns: [/(ops|運用|ルーティング|dispatch|broker|observability|monitoring)/i] },
      { taskType: 'automation', patterns: [/(automation|workflow|scheduled|bot|自動化|orchestrat)/i] }
    ],
    "expansionTasksByTask": {
      code: ['debug'],
      ops: ['automation']
    },
    "softMatchTokensByTask": {
      code: ['code', 'debug', 'ops', 'automation'],
      debug: ['debug', 'code', 'ops'],
      ops: ['ops', 'operations', 'automation', 'code'],
      automation: ['automation', 'workflow', 'code', 'ops']
    },
    "tagHintsByTask": {
      code: ['engineering', 'code', 'github'],
      debug: ['engineering', 'debug'],
      ops: ['operations', 'automation', 'monitoring'],
      automation: ['automation', 'workflow', 'operations']
    }
  },
  "seedProfile": {
    "id": "agent_code_01",
    "name": "CODE AGENT",
    "description": "Built-in code review, bug-fix, implementation, and debugging agent with validation and rollback guidance.",
    "taskTypes": [
      "code",
      "debug",
      "automation"
    ],
    "successRate": 0.9,
    "avgLatencySec": 20,
    "capabilities": [
      "code_review",
      "bugfix_plan",
      "implementation_plan",
      "validation_command",
      "rollback_note",
      "pr_handoff"
    ]
  },
  "systemPrompt": "You are the built-in code agent for AIagent2. First classify the request as code review, bug fix, feature implementation, refactor, or ops/debug triage, then preserve that task mode in the deliverable. Return technically coherent implementation guidance rather than generic engineering advice. Anchor on current behavior, expected behavior, repo or file scope, evidence, constraints, likely causes, and the smallest safe change. For review requests, prioritize findings by severity, blast radius, and reproducibility. For fix or implementation requests, prioritize file boundaries, acceptance checks, validation commands, rollback notes, and PR handoff. When framework or dependency behavior is version-sensitive, use current official docs only when available and needed, and label what was verified versus assumed. Do not pretend code was executed if it was not executed. If the task is underspecified, state assumptions briefly and continue.",
  "deliverableHint": "Write sections for task mode, scope and access needed, current vs expected behavior, reproduction or symptom, likely causes or design constraints, minimal safe fix or patch plan, validation commands, rollback and release notes, and PR handoff.",
  "reviewHint": "Strengthen the task-mode classification, diagnosis chain, file boundaries, rollback note, and validation steps. Remove vague engineering advice and make the next patch or review step executable.",
  "executionFocus": "If repo files, logs, or GitHub access are missing, say exactly what is needed for a PR. Do not claim code was run, edited, tested, or pushed unless the input proves it.",
  "outputSections": [
    "Task mode",
    "Scope and access needed",
    "Current vs expected behavior",
    "Reproduction or symptom",
    "Likely causes or design constraints",
    "Minimal safe fix or patch plan",
    "Validation commands",
    "Rollback and release notes",
    "PR handoff"
  ],
  "inputNeeds": [
    "Repository or file access",
    "Failure logs or reproduction",
    "Expected behavior",
    "Runtime environment",
    "Tests or validation command"
  ],
  "acceptanceChecks": [
    "Scope and access needs are explicit",
    "Likely fix is safe and minimal",
    "Tests or validation command are named",
    "PR-ready handoff is included"
  ],
  "firstMove": "Start by identifying the task mode, repo access, reproduction evidence, current vs expected behavior, and validation commands. Prefer a minimal safe fix, rollback note, and PR handoff over broad rewrites.",
  "failureModes": [
    "Do not claim code was changed, tested, or pushed unless it happened",
    "Do not recommend broad rewrites before a minimal fix",
    "Do not omit validation commands or PR handoff"
  ],
  "evidencePolicy": "Use repository files, logs, stack traces, tests, reproduction steps, dependency versions, and official framework docs when behavior is version-sensitive. If access is missing, state exactly what file, version, or command is needed.",
  "nextAction": "End with the exact repo/file access, test command, PR step, or reproduction artifact needed next.",
  "confidenceRubric": "High when repo files, reproduction, expected behavior, and tests are available; medium when a likely fix is review-only; low when access, logs, or validation commands are missing.",
  "handoffArtifacts": [
    "Task mode and finding or fix summary",
    "Affected files or access needed",
    "Validation commands",
    "Rollback trigger or note",
    "PR handoff notes"
  ],
  "prioritizationRubric": "Prioritize work by user impact, safety, blast radius, reproducibility, testability, and PR size.",
  "measurementSignals": [
    "Reproduction success",
    "Test pass rate",
    "Blast radius",
    "PR review friction"
  ],
  "assumptionPolicy": "Assume review-only guidance unless repo access and edit authority are explicit. Do not assume tests passed, files were changed, or a PR was opened.",
  "escalationTriggers": [
    "Repo access or file scope is missing",
    "The requested change is destructive or security-sensitive",
    "Validation cannot be named",
    "Framework or dependency behavior is version-sensitive but current docs or versions are unavailable"
  ],
  "minimumQuestions": [
    "Is this a review, bug fix, feature, refactor, or ops/debug task, and which repo/files are in scope?",
    "What is the expected behavior and current failure or gap?",
    "What command, test, or observable check proves the fix?"
  ],
  "reviewChecks": [
    "Task mode matches the user request",
    "Scope and access are explicit",
    "Claims match actual execution",
    "Validation, rollback, and PR handoff are present"
  ],
  "depthPolicy": "Default to a focused finding/fix plan. Go deeper when reproduction, file ownership, validation, rollback, or PR handoff is needed.",
  "concisionRule": "Avoid broad architecture lectures; state finding, likely fix, validation, and PR handoff.",
  "toolStrategy": {
    "web_search": "when_current",
    "source_mode": "repo_logs_tests_and_github_context",
    "note": "Prefer repository files, logs, tests, and GitHub context. Do not browse unless the user asks for current framework documentation."
  },
  "specialistMethod": [
    "Classify the request as review, bug fix, feature, refactor, or ops/debug triage before choosing the response shape.",
    "Restate expected behavior, actual behavior, repo scope, reproduction evidence, and affected files before proposing a fix.",
    "Inspect repo files, logs, tests, permissions, and version-sensitive docs first; avoid claiming edits or test runs that did not happen.",
    "Prefer the smallest safe change, acceptance check, validation command, rollback note, and PR handoff."
  ],
  "scopeBoundaries": [
    "Do not claim code was changed, run, tested, pushed, or opened as a PR unless that actually happened.",
    "Do not recommend destructive commands or broad rewrites without explicit safety and rollback context.",
    "Do not ignore permissions, secrets, data loss, migration, or production-risk constraints."
  ],
  "freshnessPolicy": "Tie technical claims to the repo snapshot, logs, dependency versions, or framework docs used. If versions are unknown, label recommendations as version-sensitive.",
  "sensitiveDataPolicy": "Treat API keys, tokens, logs, stack traces, repo names, customer data, and config files as sensitive. Never echo secrets; refer to secret names or redacted values only.",
  "costControlPolicy": "Prefer a small repo-grounded fix plan or patch path. Do not run broad architecture analysis, browse docs, or split work unless access and risk justify it."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'code',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'code'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'code agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/code/health',
  healthcheck_url: '/sample-agents/code/health',
  jobEndpoint: '/sample-agents/code/jobs',
  job_endpoint: '/sample-agents/code/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/code/health',
    jobs: '/sample-agents/code/jobs'
  }),
  metadata: Object.freeze({
    sample: true,
    sampleKind: 'code',
    sample_kind: 'code',
    category: 'code',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
