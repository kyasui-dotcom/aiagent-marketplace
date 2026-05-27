const LEADER_WORKFLOW_PLANNER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    planned_tasks: {
      type: 'array',
      minItems: 1,
      maxItems: 14,
      items: { type: 'string' }
    },
    task_tags: {
      type: 'array',
      maxItems: 14,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          task_type: { type: 'string' },
          tags: {
            type: 'array',
            maxItems: 8,
            items: { type: 'string' }
          }
        },
        required: ['task_type', 'tags']
      }
    },
    reason: { type: 'string' },
    confidence: { type: 'number' }
  },
  required: ['planned_tasks', 'task_tags', 'reason', 'confidence']
};

export function createWorkflowPlanAssemblyHelpers({
  agentWorkflowLayer,
  clientOrderIdFromCreateBody,
  ensureLeaderWorkflowActionTasks,
  estimateRunWindow,
  filterLeaderWorkflowPlannedTasks,
  inferTaskSequence,
  inferTaskType,
  isLargeAgentTeamIntent,
  isManagedSampleAgent,
  isWorkflowLeaderTask,
  leaderBlockedDispatchTaskTypes,
  leaderControlContractForTask,
  leaderPlannerAllowsCandidateAgentTasksFromDefinition,
  leaderPlannerCandidateAgents,
  leaderPlannerManifestCatalog,
  leaderSourceCollectionLayerTasks,
  leaderTaskDispatchAllowlist,
  normalizeAgentTags,
  normalizeLeaderWorkflowPlannedTasks,
  normalizeTaskTypes,
  nowIso,
  openChatIntentEnvValue,
  assignAgentForTask,
  selectedAgentIdFromOrderBody,
  selectedAgentTaskTypeFromOrderBody,
  workflowDispatchLayer,
  workflowLeaderActionProtocol,
  workflowTagHintsForTask
} = {}) {
  function parsePlannerJson(content = '') {
    const text = String(content || '').trim();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return {};
      try {
        return JSON.parse(match[0]);
      } catch {
        return {};
      }
    }
  }

  function extractOpenAiPlannerText(payload = {}) {
    if (typeof payload.output_text === 'string' && payload.output_text.trim()) return payload.output_text.trim();
    const chunks = [];
    for (const output of Array.isArray(payload.output) ? payload.output : []) {
      for (const content of Array.isArray(output?.content) ? output.content : []) {
        if (typeof content?.text === 'string') chunks.push(content.text);
      }
    }
    return chunks.join('\n').trim();
  }

  function planWorkflowAssignments(agents, taskType, prompt, options = {}) {
    const largeTeam = isLargeAgentTeamIntent(taskType, prompt);
    const primaryTask = inferTaskSequence(taskType, prompt, { maxTasks: 1, expand: false })[0] || inferTaskType(taskType, prompt);
    const leaderTeam = isWorkflowLeaderTask(primaryTask);
    const selectedAgentId = String(options.selectedAgentId || '').trim();
    const selectedAgentTaskType = normalizeTaskTypes([options.selectedAgentTaskType || taskType])[0] || '';
    const leaderDownstreamCount = leaderTeam
      ? normalizeTaskTypes(leaderControlContractForTask(primaryTask)?.downstreamTaskTypes || []).length
      : 0;
    const defaultMaxTasks = options.maxTasks || (leaderTeam
      ? Math.min(14, Math.max(10, 1 + leaderDownstreamCount))
      : (largeTeam ? 10 : 3));
    const preservePlannedTasks = options.preservePlannedTasks === true && Array.isArray(options.plannedTasks) && options.plannedTasks.length;
    let plannedTasks = Array.isArray(options.plannedTasks) && options.plannedTasks.length
      ? normalizeTaskTypes(options.plannedTasks)
      : inferTaskSequence(taskType, prompt, {
          maxTasks: defaultMaxTasks,
          expand: options.expand !== false
        });
    plannedTasks = normalizeLeaderWorkflowPlannedTasks(primaryTask, plannedTasks, prompt, options);
    if (!preservePlannedTasks) {
      plannedTasks = ensureLeaderWorkflowActionTasks(plannedTasks, primaryTask, prompt, {
        maxTasks: defaultMaxTasks,
        maxExternalResearchTasks: options.maxExternalResearchTasks
      });
    }
    plannedTasks = filterLeaderWorkflowPlannedTasks(primaryTask, plannedTasks);
    const tagHintsByTask = options.tagHintsByTask && typeof options.tagHintsByTask === 'object' ? options.tagHintsByTask : {};
    const assignments = [];
    const usedAgentIds = new Set();
    for (const plannedTask of plannedTasks) {
      const pinSelectedAgent = Boolean(
        selectedAgentId
        && !usedAgentIds.has(selectedAgentId)
        && (
          plannedTask === selectedAgentTaskType
          || (!selectedAgentTaskType && plannedTask === primaryTask)
          || (isWorkflowLeaderTask(plannedTask) && isWorkflowLeaderTask(selectedAgentTaskType))
        )
      );
      const tagHints = normalizeAgentTags([
        ...workflowTagHintsForTask(plannedTask, { primaryTask: plannedTasks[0] || primaryTask, prompt }),
        ...(Array.isArray(tagHintsByTask[plannedTask]) ? tagHintsByTask[plannedTask] : [])
      ], { max: 16 });
      const picked = assignAgentForTask(agents, plannedTask, options.budgetCap || 0, '', {
        ...(pinSelectedAgent ? { selectedAgentId } : {}),
        excludeAgentIds: [...usedAgentIds],
        requireEndpoint: true,
        allowSoftTaskMatch: true,
        body: { prompt, task_type: plannedTask },
        tagHints,
        scheduled: options.scheduled === true,
        recurring: options.recurring === true
      });
      const finalPicked = pinSelectedAgent
        ? assignAgentForTask(agents, plannedTask, options.budgetCap || 0, selectedAgentId, {
            excludeAgentIds: [...usedAgentIds],
            requireEndpoint: true,
            allowSoftTaskMatch: true,
            body: { prompt, task_type: plannedTask },
            tagHints,
            scheduled: options.scheduled === true,
            recurring: options.recurring === true
          })
        : picked;
      if (!finalPicked?.agent) continue;
      const dispatchTask = String(finalPicked.dispatchTaskType || '').trim().toLowerCase();
      const blockedDispatchTasks = new Set(leaderBlockedDispatchTaskTypes(primaryTask));
      if (blockedDispatchTasks.has(dispatchTask)) {
        continue;
      }
      const taskDispatchAllowlist = leaderTaskDispatchAllowlist(primaryTask, plannedTask);
      if (taskDispatchAllowlist.length && !taskDispatchAllowlist.includes(dispatchTask || plannedTask)) continue;
      usedAgentIds.add(finalPicked.agent.id);
      const workflowTaskType = plannedTask;
      const dispatchTaskType = finalPicked.dispatchTaskType || plannedTask;
      assignments.push({
        taskType: workflowTaskType,
        requestedTaskType: plannedTask,
        dispatchTaskType,
        agent: finalPicked.agent,
        workflowLayer: agentWorkflowLayer(finalPicked.agent, primaryTask, workflowTaskType),
        score: finalPicked.score,
        assignmentMode: finalPicked.assignmentMode,
        tagHints,
        matchKind: finalPicked.matchKind || 'exact',
        compatibility: Number(finalPicked.compatibility || 0),
        exact: finalPicked.exact !== false
      });
    }
    return { plannedTasks, assignments, tagHintsByTask, leaderPlanning: options.leaderPlanning || null };
  }

  function leaderPlannerLlmConfig(source = {}) {
    const apiKey = openChatIntentEnvValue(source, 'LEADER_PLANNER_OPENAI_API_KEY')
      || openChatIntentEnvValue(source, 'OPENAI_API_KEY');
    const configured = openChatIntentEnvValue(source, 'LEADER_PLANNER_LLM').toLowerCase();
    let provider = configured || (apiKey ? 'openai' : 'off');
    if (['0', 'false', 'none', 'disabled', 'off'].includes(provider)) provider = 'off';
    if (!['openai', 'off'].includes(provider)) provider = 'off';
    return {
      enabled: provider !== 'off',
      provider,
      apiKey,
      openAiBaseUrl: (openChatIntentEnvValue(source, 'OPENAI_BASE_URL') || 'https://api.openai.com/v1').replace(/\/+$/, ''),
      openAiModel: openChatIntentEnvValue(source, 'LEADER_PLANNER_OPENAI_MODEL')
        || openChatIntentEnvValue(source, 'OPEN_CHAT_INTENT_MODEL')
        || 'gpt-5.4-nano'
    };
  }

  function workflowLayerForTask(primaryTask = '', taskType = '') {
    return workflowDispatchLayer(
      { workflow: { plannedTasks: [primaryTask] }, taskType: primaryTask },
      { taskType }
    );
  }

  function sanitizeLeaderPlannerResult(raw = {}, fallbackPlan = {}, agents = []) {
    const fallbackTasks = filterLeaderWorkflowPlannedTasks(
      normalizeTaskTypes(fallbackPlan.plannedTasks || [])[0] || '',
      fallbackPlan.plannedTasks || []
    );
    const primaryTask = fallbackTasks[0] || '';
    if (!primaryTask || !isWorkflowLeaderTask(primaryTask)) return null;
    const leaderContract = leaderControlContractForTask(primaryTask);
    const allowedTasks = new Set([
      ...fallbackTasks,
      ...normalizeTaskTypes(leaderContract?.downstreamTaskTypes || [])
    ]);
    if (leaderPlannerAllowsCandidateAgentTasksFromDefinition(primaryTask, true)) {
      for (const agent of agents) {
        if (isManagedSampleAgent(agent)) continue;
        for (const task of Array.isArray(agent?.taskTypes) ? agent.taskTypes : []) {
          const safe = String(task || '').trim().toLowerCase();
          if (safe) allowedTasks.add(safe);
        }
      }
    }
    const requestedTasks = normalizeLeaderWorkflowPlannedTasks(primaryTask, raw.planned_tasks || raw.plannedTasks || [])
      .filter((task) => allowedTasks.has(task));
    const maxPlannerTasks = 14;
    const preludeTasks = fallbackTasks
      .filter((task) => task !== primaryTask && workflowLayerForTask(primaryTask, task) === 1);
    const merged = [];
    const push = (task) => {
      const safe = String(task || '').trim().toLowerCase();
      if (!safe || !allowedTasks.has(safe) || merged.includes(safe)) return;
      merged.push(safe);
    };
    push(primaryTask);
    for (const task of preludeTasks) push(task);
    for (const task of requestedTasks) push(task);
    const targetSize = requestedTasks.length
      ? Math.min(maxPlannerTasks, Math.max(2, 1 + preludeTasks.length + requestedTasks.length))
      : Math.min(maxPlannerTasks, fallbackTasks.length);
    for (const task of fallbackTasks) {
      if (merged.length >= targetSize) break;
      push(task);
    }
    if (merged.length < 2) return null;
    const tagHintsByTask = {};
    for (const item of Array.isArray(raw.task_tags) ? raw.task_tags : []) {
      const task = String(item?.task_type || item?.taskType || '').trim().toLowerCase();
      if (!task || !merged.includes(task)) continue;
      tagHintsByTask[task] = normalizeAgentTags(item.tags || [], { max: 8 });
    }
    return {
      plannedTasks: merged.slice(0, maxPlannerTasks),
      tagHintsByTask,
      leaderPlanning: {
        source: 'openai',
        reason: String(raw.reason || '').replace(/\s+/g, ' ').trim().slice(0, 500),
        confidence: Math.max(0, Math.min(1, Number(raw.confidence || 0.5))),
        checkedAt: nowIso()
      }
    };
  }

  async function planLeaderWorkflowWithOpenAi(agents = [], body = {}, fallbackPlan = {}, env = {}) {
    const config = leaderPlannerLlmConfig(env);
    if (!config.enabled || !config.apiKey) return null;
    const candidates = leaderPlannerCandidateAgents(agents);
    const candidateCatalog = leaderPlannerManifestCatalog(agents);
    if (!candidates.length) {
      return { plannerError: 'Leader planner had no verified candidate agents to choose from.', plannerStatusCode: 503 };
    }
    try {
      const response = await fetch(`${config.openAiBaseUrl}/responses`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${config.apiKey}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: config.openAiModel,
          store: false,
          input: [
            {
              role: 'system',
              content: [
                'You are CAIt Team Leader planner.',
                'Choose which task types and agent tags should be used for a multi-agent order.',
                'Return JSON only. Do not execute work.',
                'Keep the leader task first.',
                'For leader orders, preserve research/analysis before execution or channel posting.',
                'For action-through-delivery orders, do not stop at research only when the deterministic leader plan already contains preparation or action tasks.',
                'Use only task types available in deterministic_plan or candidate_agents.task_types.',
                'Use agent_manifest_catalog as the readable manifest list for both internal sample agents and external registered agents.',
                'Prefer provider agents over managed sample agents when their tags and task types fit.',
                'Use concise English tag tokens such as marketing, research, analysis, seo, social, data, engineering, github, finance, legal, product.'
              ].join('\n')
            },
            {
              role: 'user',
              content: JSON.stringify({
                prompt: String(body.prompt || '').slice(0, 4000),
                requested_task_type: body.task_type || body.taskType || '',
                deterministic_plan: fallbackPlan.plannedTasks || [],
                candidate_agents: candidates,
                agent_manifest_catalog: candidateCatalog
              })
            }
          ],
          text: {
            format: {
              type: 'json_schema',
              name: 'cait_leader_workflow_plan',
              strict: true,
              schema: LEADER_WORKFLOW_PLANNER_SCHEMA
            }
          },
          max_output_tokens: 900
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = payload?.error?.message || payload?.message || `Leader planner failed with status ${response.status}`;
        return { plannerError: String(message).slice(0, 500), plannerStatusCode: response.status };
      }
      const parsed = parsePlannerJson(extractOpenAiPlannerText(payload));
      return sanitizeLeaderPlannerResult(parsed, fallbackPlan, agents)
        || { plannerError: 'Leader planner returned no usable task plan.', plannerStatusCode: 502 };
    } catch (error) {
      return { plannerError: String(error?.message || error || 'Leader planner failed').slice(0, 500), plannerStatusCode: 502 };
    }
  }

  async function maybeRefineWorkflowPlanWithLeaderLlm(agents = [], body = {}, resolved = {}, env = {}, options = {}) {
    if (resolved?.strategy !== 'multi' || !resolved?.plan?.plannedTasks?.length) return resolved;
    if (workflowPlannedTasksFromOrderBody(body).length) {
      return {
        ...resolved,
        reason: `${resolved.reason} Retry preserved the previous workflow plan.`
      };
    }
    const primaryTask = String(resolved.plan.plannedTasks[0] || '').trim().toLowerCase();
    if (!isWorkflowLeaderTask(primaryTask)) return resolved;
    if (options.recurring && String(env?.LEADER_PLANNER_RECURRING_LLM || '').trim().toLowerCase() !== 'true') return resolved;
    const sourceLayerTaskCount = leaderSourceCollectionLayerTasks(primaryTask).length;
    const maxExternalResearchTasks = sourceLayerTaskCount && String(env?.OPENAI_API_KEY || env?.BUILTIN_OPENAI_API_KEY || '').trim()
      ? 1
      : 0;
    const rebuildPlan = (plannedTasks = [], tagHintsByTask = {}, leaderPlanning = null) => planWorkflowAssignments(agents, body.task_type, body.prompt, {
      budgetCap: body.budget_cap || 0,
      plannedTasks,
      preservePlannedTasks: true,
      tagHintsByTask,
      leaderPlanning,
      selectedAgentId: selectedAgentIdFromOrderBody(body),
      selectedAgentTaskType: selectedAgentTaskTypeFromOrderBody(body),
      expand: false,
      maxExternalResearchTasks
    });
    const refined = await planLeaderWorkflowWithOpenAi(agents, body, resolved.plan, env);
    if (refined?.plannerError) {
      return {
        ...resolved,
        planner_error: refined.plannerError,
        plan: {
          ...(resolved.plan || {}),
          leaderPlanning: {
            source: 'openai_failed',
            reason: refined.plannerError,
            confidence: 0,
            checkedAt: nowIso()
          }
        },
        reason: `${resolved.reason} Leader planner failed before order creation, so CAIt kept the deterministic team plan and will let the leader adapt after the order starts.`
      };
    }
    if (!refined?.plannedTasks?.length) {
      if (!maxExternalResearchTasks) return resolved;
      const cappedPlan = rebuildPlan(resolved.plan.plannedTasks, resolved.plan.tagHintsByTask, resolved.plan.leaderPlanning || null);
      return cappedPlan.assignments.length >= 2
        ? { ...resolved, plan: cappedPlan, reason: `${resolved.reason} Leader planner kept deterministic task ordering with capped research fan-out.` }
        : resolved;
    }
    const plan = rebuildPlan(refined.plannedTasks, refined.tagHintsByTask, refined.leaderPlanning);
    if (plan.assignments.length < 2) return resolved;
    return {
      ...resolved,
      plan,
      reason: `${resolved.reason} Leader planner refined task tags and ordering.`
    };
  }

  function workflowPlannedTasksFromOrderBody(body = {}) {
    const brokerRetry = body?.input?._broker?.retry && typeof body.input._broker.retry === 'object'
      ? body.input._broker.retry
      : {};
    const brokerWorkflow = body?.input?._broker?.workflow && typeof body.input._broker.workflow === 'object'
      ? body.input._broker.workflow
      : {};
    const raw = body.workflow_planned_tasks
      || body.workflowPlannedTasks
      || brokerRetry.plannedTasks
      || brokerRetry.planned_tasks
      || [];
    const planned = Array.isArray(raw)
      ? raw.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean)
      : [];
    const preservePlan = body.preserve_workflow_plan === true
      || body.preserveWorkflowPlan === true
      || brokerRetry.preservePlan === true
      || brokerRetry.preserve_plan === true;
    const primaryTask = normalizeTaskTypes([body.task_type || body.taskType])[0] || planned[0] || '';
    if (preservePlan && planned.length) {
      return normalizeLeaderWorkflowPlannedTasks(primaryTask, planned, body.prompt).slice(0, 12);
    }
    const workflowRaw = brokerWorkflow.retryPlannedTasks || brokerWorkflow.retry_planned_tasks || [];
    const workflowPlanned = Array.isArray(workflowRaw)
      ? workflowRaw.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean)
      : [];
    if (!workflowPlanned.length) return [];
    return normalizeLeaderWorkflowPlannedTasks(primaryTask || workflowPlanned[0] || '', workflowPlanned, body.prompt).slice(0, 12);
  }

  function workflowReuseArtifactsFromOrderBody(body = {}) {
    const brokerRetry = body?.input?._broker?.retry && typeof body.input._broker.retry === 'object'
      ? body.input._broker.retry
      : {};
    const brokerWorkflow = body?.input?._broker?.workflow && typeof body.input._broker.workflow === 'object'
      ? body.input._broker.workflow
      : {};
    const raw = [
      ...(Array.isArray(body.retry_reuse_artifacts) ? body.retry_reuse_artifacts : []),
      ...(Array.isArray(body.retryReuseArtifacts) ? body.retryReuseArtifacts : []),
      ...(Array.isArray(brokerRetry.reuseArtifacts) ? brokerRetry.reuseArtifacts : []),
      ...(Array.isArray(brokerRetry.reuse_artifacts) ? brokerRetry.reuse_artifacts : []),
      ...(Array.isArray(brokerWorkflow.reusedArtifacts) ? brokerWorkflow.reusedArtifacts : []),
      ...(Array.isArray(brokerWorkflow.retryReuseArtifacts) ? brokerWorkflow.retryReuseArtifacts : [])
    ];
    const seen = new Set();
    const artifacts = [];
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue;
      if (item.user_selected === false || item.userSelected === false) continue;
      const taskType = normalizeTaskTypes([item.task_type || item.taskType])[0] || '';
      const sourceRunId = String(item.source_run_id || item.sourceRunId || '').trim();
      const content = String(item.content || item.markdown || item.body || '').trim().slice(0, 60000);
      if (!taskType || taskType.endsWith('_leader') || !sourceRunId || !content) continue;
      const key = taskType;
      if (seen.has(key)) continue;
      seen.add(key);
      artifacts.push({
        taskType,
        task_type: taskType,
        sourceOrderId: String(item.source_order_id || item.sourceOrderId || brokerRetry.sourceOrderId || brokerRetry.source_order_id || '').trim(),
        source_order_id: String(item.source_order_id || item.sourceOrderId || brokerRetry.sourceOrderId || brokerRetry.source_order_id || '').trim(),
        sourceRunId,
        source_run_id: sourceRunId,
        fileName: String(item.file_name || item.fileName || `${taskType}-delivery.md`).trim().slice(0, 160) || `${taskType}-delivery.md`,
        file_name: String(item.file_name || item.fileName || `${taskType}-delivery.md`).trim().slice(0, 160) || `${taskType}-delivery.md`,
        type: String(item.type || 'text/markdown').trim() || 'text/markdown',
        content,
        contentType: String(item.content_type || item.contentType || 'reused_agent_delivery').trim() || 'reused_agent_delivery',
        content_type: String(item.content_type || item.contentType || 'reused_agent_delivery').trim() || 'reused_agent_delivery',
        sourceAgentName: String(item.source_agent_name || item.sourceAgentName || '').trim().slice(0, 160),
        source_agent_name: String(item.source_agent_name || item.sourceAgentName || '').trim().slice(0, 160),
        selectedAt: String(item.selected_at || item.selectedAt || '').trim().slice(0, 80),
        selected_at: String(item.selected_at || item.selectedAt || '').trim().slice(0, 80),
        userSelected: true,
        user_selected: true
      });
    }
    return artifacts.slice(0, 8);
  }

  function workflowReuseArtifactsByTaskFromOrderBody(body = {}) {
    return new Map(workflowReuseArtifactsFromOrderBody(body).map((artifact) => [artifact.taskType, artifact]));
  }

  function workflowReuseArtifactStorageMeta(artifact = {}) {
    const taskType = normalizeTaskTypes([artifact.taskType || artifact.task_type])[0] || '';
    const fileName = String(artifact.fileName || artifact.file_name || `${taskType || 'artifact'}-delivery.md`).trim().slice(0, 160) || `${taskType || 'artifact'}-delivery.md`;
    return {
      taskType,
      task_type: taskType,
      sourceOrderId: String(artifact.sourceOrderId || artifact.source_order_id || '').trim(),
      source_order_id: String(artifact.source_order_id || artifact.sourceOrderId || '').trim(),
      sourceRunId: String(artifact.sourceRunId || artifact.source_run_id || '').trim(),
      source_run_id: String(artifact.source_run_id || artifact.sourceRunId || '').trim(),
      fileName,
      file_name: fileName,
      type: String(artifact.type || 'text/markdown').trim() || 'text/markdown',
      contentType: String(artifact.contentType || artifact.content_type || 'reused_agent_delivery').trim() || 'reused_agent_delivery',
      content_type: String(artifact.content_type || artifact.contentType || 'reused_agent_delivery').trim() || 'reused_agent_delivery',
      contentChars: String(artifact.content || '').length,
      content_chars: String(artifact.content || '').length,
      sourceAgentName: String(artifact.sourceAgentName || artifact.source_agent_name || '').trim().slice(0, 160),
      source_agent_name: String(artifact.source_agent_name || artifact.sourceAgentName || '').trim().slice(0, 160),
      selectedAt: String(artifact.selectedAt || artifact.selected_at || '').trim().slice(0, 80),
      selected_at: String(artifact.selected_at || artifact.selectedAt || '').trim().slice(0, 80),
      userSelected: true,
      user_selected: true
    };
  }

  function compactRetryReuseArtifactsForJobStorage(input = {}, selectedReuseArtifacts = []) {
    if (!input || typeof input !== 'object') return input;
    const broker = input._broker && typeof input._broker === 'object' ? input._broker : null;
    if (!broker) return input;
    const metas = (Array.isArray(selectedReuseArtifacts) ? selectedReuseArtifacts : [])
      .map(workflowReuseArtifactStorageMeta)
      .filter((item) => item.taskType && item.sourceRunId)
      .slice(0, 8);
    const retry = broker.retry && typeof broker.retry === 'object' ? { ...broker.retry } : null;
    if (retry) {
      delete retry.reuseArtifacts;
      delete retry.reuse_artifacts;
      if (metas.length) {
        retry.reuseArtifacts = metas;
        retry.reuse_artifacts = metas;
      }
    }
    const workflow = broker.workflow && typeof broker.workflow === 'object' ? { ...broker.workflow } : null;
    if (workflow) {
      delete workflow.reusedArtifacts;
      delete workflow.reuseArtifacts;
      delete workflow.retryReuseArtifacts;
      delete workflow.retry_reuse_artifacts;
      if (metas.length) {
        workflow.reusedArtifacts = metas;
        workflow.retryReuseArtifacts = metas;
      }
    }
    return {
      ...input,
      _broker: {
        ...broker,
        ...(retry ? { retry } : {}),
        ...(workflow ? { workflow } : {})
      }
    };
  }

  function buildWorkflowEstimate(assignments = []) {
    const summary = assignments.reduce((acc, item) => {
      const estimate = estimateRunWindow(item.agent, item.taskType);
      acc.durationMinSec += Number(estimate.durationMinSec || 0);
      acc.durationMaxSec += Number(estimate.durationMaxSec || 0);
      acc.totalMin += Number(estimate.estimateMin?.total || 0);
      acc.totalMax += Number(estimate.estimateMax?.total || 0);
      acc.openAiCostMin += Number(estimate.estimateMin?.apiCost || estimate.estimateMin?.totalCostBasis || estimate.estimateMin?.total || 0);
      acc.openAiCostMax += Number(estimate.estimateMax?.apiCost || estimate.estimateMax?.totalCostBasis || estimate.estimateMax?.total || 0);
      return acc;
    }, { durationMinSec: 0, durationMaxSec: 0, totalMin: 0, totalMax: 0, openAiCostMin: 0, openAiCostMax: 0 });
    return {
      durationMinSec: summary.durationMinSec,
      durationMaxSec: summary.durationMaxSec,
      totalMin: +summary.totalMin.toFixed(1),
      totalMax: +summary.totalMax.toFixed(1),
      openAiCostMin: +summary.openAiCostMin.toFixed(1),
      openAiCostMax: +summary.openAiCostMax.toFixed(1)
    };
  }

  function buildWorkflowParentJob(body, input, plan, options = {}) {
    const estimate = buildWorkflowEstimate(plan.assignments);
    const promptOptimization = options.promptOptimization || null;
    const executionPrompt = promptOptimization?.optimized ? promptOptimization.prompt : body.prompt;
    const originalPrompt = promptOptimization?.optimized ? promptOptimization.originalPrompt : body.prompt;
    const clientOrderId = clientOrderIdFromCreateBody(body);
    const leaderAssignment = Array.isArray(plan.assignments)
      ? plan.assignments.find((assignment) => isWorkflowLeaderTask(assignment?.taskType || ''))
      : null;
    const agentTeamName = String(leaderAssignment?.agent?.name || '').trim() || 'Agent Team';
    return {
      id: clientOrderId || crypto.randomUUID(),
      jobKind: 'workflow',
      parentAgentId: body.parent_agent_id,
      taskType: plan.plannedTasks[0] || inferTaskType(body.task_type, body.prompt),
      prompt: executionPrompt,
      ...(promptOptimization?.optimized ? { originalPrompt, promptOptimization } : {}),
      input,
      budgetCap: body.budget_cap || null,
      deadlineSec: body.deadline_sec || null,
      priority: body.priority || 'normal',
      status: 'queued',
      assignedAgentId: null,
      score: null,
      createdAt: nowIso(),
      callbackToken: null,
      assignmentMode: 'multi',
      billingEstimate: {
        total: estimate.totalMax,
        totalMin: estimate.totalMin,
        totalMax: estimate.totalMax
      },
      estimateWindow: estimate,
      workflow: {
        strategy: 'multi_agent',
        teamName: agentTeamName,
        objective: originalPrompt,
        plannedTasks: plan.plannedTasks,
        leaderPlanning: plan.leaderPlanning || null,
        ...(isWorkflowLeaderTask(plan.plannedTasks[0] || body.task_type) ? { leaderActionProtocol: workflowLeaderActionProtocol({ taskType: plan.plannedTasks[0] || body.task_type, workflow: { plannedTasks: plan.plannedTasks } }) } : {}),
        plannedChildRunCount: plan.assignments.length,
        childJobIds: [],
        childRuns: plan.assignments.map((item) => ({
          taskType: item.taskType,
          dispatchTaskType: item.dispatchTaskType || item.taskType,
          agentId: item.agent.id,
          agentName: item.agent.name,
          status: 'planned',
          score: item.score,
          tagHints: item.tagHints || [],
          matchKind: item.matchKind || 'exact',
          compatibility: Number(item.compatibility || 0)
        }))
      },
      logs: [
        `created by ${body.parent_agent_id}`,
        ...(promptOptimization?.optimized ? [`prompt optimized mode=${promptOptimization.mode} originalChars=${promptOptimization.originalChars} optimizedChars=${promptOptimization.optimizedChars} outputLanguage=${promptOptimization.outputLanguageCode}`] : []),
        ...(plan.leaderPlanning?.source ? [`leader planner=${plan.leaderPlanning.source} confidence=${plan.leaderPlanning.confidence}`] : []),
        `${agentTeamName} planned for ${plan.plannedTasks.join(', ')}`,
        `planned agents=${plan.assignments.map((item) => `${item.agent.name}:${item.taskType}${item.dispatchTaskType && item.dispatchTaskType !== item.taskType ? `->${item.dispatchTaskType}` : ''}`).join(', ')}`,
        `tag hints=${plan.assignments.map((item) => `${item.taskType}[${(item.tagHints || []).join('/')}]`).join(', ')}`
      ]
    };
  }

  return {
    buildWorkflowEstimate,
    buildWorkflowParentJob,
    compactRetryReuseArtifactsForJobStorage,
    maybeRefineWorkflowPlanWithLeaderLlm,
    planWorkflowAssignments,
    workflowPlannedTasksFromOrderBody,
    workflowReuseArtifactsByTaskFromOrderBody,
    workflowReuseArtifactStorageMeta
  };
}
