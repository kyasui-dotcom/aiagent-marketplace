export function createBrokerAgentAssignmentHelpers({
  agentLinksFromRecord,
  agentPatternFitScore,
  agentTagsFromRecord,
  computeScore,
  isAgentVerified,
  isManagedSampleAgent,
  isWorkflowLeaderTask,
  leaderReadableAgentCatalogIndex,
  leaderTaskLayer,
  leaderTaskPhase,
  normalizeAgentTags,
  normalizeTaskTypes,
  resolveAgentJobEndpoint,
  workflowTagHintsForTask,
  workflowTaskCandidateTokens,
  workflowTaskSoftMatchTokens
} = {}) {
  function metadataTaskScoresForAgent(agent = {}) {
    const sources = [
      agent?.metadata?.task_type_scores,
      agent?.metadata?.taskTypeScores,
      agent?.metadata?.manifest?.task_type_scores,
      agent?.metadata?.manifest?.taskTypeScores,
      agent?.metadata?.manifest?.metadata?.task_type_scores,
      agent?.metadata?.manifest?.metadata?.taskTypeScores
    ];
    const scored = new Map();
    const record = (taskType, score) => {
      const safeTask = String(taskType || '').trim().toLowerCase();
      const safeScore = Math.max(0, Math.min(1, Number(score || 0)));
      if (!safeTask || !Number.isFinite(safeScore)) return;
      scored.set(safeTask, Math.max(safeScore, scored.get(safeTask) || 0));
    };
    for (const source of sources) {
      if (!source) continue;
      if (Array.isArray(source)) {
        for (const item of source) {
          if (typeof item === 'string') {
            record(item, 1);
            continue;
          }
          if (!item || typeof item !== 'object') continue;
          record(item.task_type || item.taskType || item.name || item.id, item.score ?? item.confidence ?? item.weight ?? item.value ?? item.fit ?? 0);
        }
        continue;
      }
      if (typeof source !== 'object') continue;
      for (const [taskType, score] of Object.entries(source)) record(taskType, score);
    }
    return scored;
  }

  function taskMatchForAgent(agent = {}, taskType = '', options = {}) {
    const requestedTask = String(taskType || '').trim().toLowerCase();
    const declaredTasks = Array.isArray(agent?.taskTypes)
      ? agent.taskTypes.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean)
      : [];
    if (!requestedTask) {
      return {
        matches: true,
        exact: false,
        dispatchTaskType: '',
        compatibility: 1,
        matchKind: 'none'
      };
    }
    if (declaredTasks.includes(requestedTask)) {
      return {
        matches: true,
        exact: true,
        dispatchTaskType: requestedTask,
        compatibility: 1,
        matchKind: 'exact'
      };
    }
    if (options.allowSoftTaskMatch !== true) {
      return {
        matches: false,
        exact: false,
        dispatchTaskType: '',
        compatibility: 0,
        matchKind: 'none'
      };
    }
    const desiredTokens = workflowTaskSoftMatchTokens(requestedTask, options);
    if (!desiredTokens.length) {
      return {
        matches: false,
        exact: false,
        dispatchTaskType: '',
        compatibility: 0,
        matchKind: 'none'
      };
    }
    const desiredSet = new Set(desiredTokens);
    const agentTags = new Set(agentTagsFromRecord(agent));
    const agentOverlap = desiredTokens.filter((token) => agentTags.has(token)).length;
    const metadataScores = metadataTaskScoresForAgent(agent);
    const metadataBoost = Math.max(...desiredTokens.map((token) => Number(metadataScores.get(token) || 0)), 0);
    let best = null;
    for (const candidateTask of declaredTasks) {
      const candidateTokens = workflowTaskCandidateTokens(candidateTask, { prompt: candidateTask, max: 16 });
      const overlap = candidateTokens.filter((token) => desiredSet.has(token)).length;
      const directAlias = desiredSet.has(candidateTask) ? 1 : 0;
      const overlapScore = desiredTokens.length ? overlap / desiredTokens.length : 0;
      const agentScore = desiredTokens.length ? agentOverlap / desiredTokens.length : 0;
      const compatibility = Math.max(
        directAlias ? 0.82 : 0,
        Math.min(0.92, +(overlapScore * 0.65 + agentScore * 0.25 + metadataBoost * 0.3).toFixed(3))
      );
      const acceptable = directAlias || overlap >= 2 || ((directAlias || overlap >= 1) && metadataBoost >= 0.55) || (overlap >= 1 && agentOverlap >= 2);
      if (!acceptable || compatibility < 0.32) continue;
      const candidate = {
        matches: true,
        exact: false,
        dispatchTaskType: candidateTask,
        compatibility,
        matchKind: 'soft'
      };
      if (!best || candidate.compatibility > best.compatibility || (candidate.compatibility === best.compatibility && candidateTask.localeCompare(best.dispatchTaskType) < 0)) {
        best = candidate;
      }
    }
    return best || {
      matches: false,
      exact: false,
      dispatchTaskType: '',
      compatibility: 0,
      matchKind: 'none'
    };
  }

  function agentTagFitScore(agent = {}, tagHints = []) {
    const hints = normalizeAgentTags(tagHints);
    if (!hints.length) return 0;
    const agentTags = new Set(agentTagsFromRecord(agent));
    if (!agentTags.size) return 0;
    const matches = hints.filter((tag) => agentTags.has(tag));
    if (!matches.length) return 0;
    return +(Math.min(0.14, (matches.length / hints.length) * 0.14)).toFixed(3);
  }

  function selectedAgentIdFromOrderBody(body = {}) {
    return String(
      body?.selected_agent_id
      || body?.selectedAgentId
      || body?.input?._broker?.selectedWorker?.agentId
      || ''
    ).trim();
  }

  function selectedAgentNameFromOrderBody(body = {}) {
    return String(
      body?.selected_agent_name
      || body?.selectedAgentName
      || body?.input?._broker?.selectedWorker?.agentName
      || ''
    ).trim();
  }

  function selectedAgentTaskTypeFromOrderBody(body = {}) {
    return normalizeTaskTypes([
      body?.selected_agent_task_type
      || body?.selectedAgentTaskType
      || body?.input?._broker?.selectedWorker?.taskType
      || body?.task_type
      || body?.taskType
    ])[0] || '';
  }

  function selectedAgentIsLeader(agents = [], body = {}) {
    const selectedTask = selectedAgentTaskTypeFromOrderBody(body);
    if (selectedTask && isWorkflowLeaderTask(selectedTask)) return true;
    const selectedAgentId = selectedAgentIdFromOrderBody(body);
    const selected = selectedAgentId ? agents.find((agent) => String(agent?.id || '') === selectedAgentId) : null;
    const tasks = normalizeTaskTypes(selected?.taskTypes || selected?.task_types || []);
    return tasks.some((task) => isWorkflowLeaderTask(task));
  }

  function agentRecordIsWorkflowLeader(agent = {}) {
    const tasks = normalizeTaskTypes(agent?.taskTypes || agent?.task_types || []);
    const metadata = agent?.metadata && typeof agent.metadata === 'object' ? agent.metadata : {};
    const kind = normalizeTaskTypes([agent?.kind || metadata.kind || metadata.category || ''])[0] || '';
    return tasks.some((task) => isWorkflowLeaderTask(task)) || isWorkflowLeaderTask(kind);
  }

  function workflowLayerNumberFromName(value = '') {
    const layer = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (['leader', 'orchestrator', 'orchestration'].includes(layer)) return 0;
    if (['data', 'analytics', 'data_analysis', 'research', 'analysis', 'evidence', 'source_collection'].includes(layer)) return 1;
    if (['planning', 'planner', 'strategy', 'media_planning', 'plan'].includes(layer)) return 2;
    if (['preparation', 'prepare', 'prep', 'writing', 'writer', 'copy', 'content_generation', 'landing', 'seo'].includes(layer)) return 3;
    if (['action', 'execution', 'connector', 'publish', 'distribution', 'external_action'].includes(layer)) return 4;
    return null;
  }

  function agentWorkflowLayer(agent = {}, primaryTask = '', taskType = '') {
    const definedPhase = leaderTaskPhase(primaryTask, taskType);
    const definedLayer = leaderTaskLayer(primaryTask, taskType);
    if (definedPhase && definedLayer) return definedLayer;
    const manifest = agent?.metadata?.manifest && typeof agent.metadata.manifest === 'object' ? agent.metadata.manifest : {};
    const manifestMetadata = manifest.metadata && typeof manifest.metadata === 'object' ? manifest.metadata : {};
    const routing = manifest.task_routing || manifest.taskRouting || manifestMetadata.task_routing || manifestMetadata.taskRouting || agent?.metadata?.task_routing || agent?.metadata?.taskRouting || {};
    const explicitLayer = workflowLayerNumberFromName(
      routing.layer
      || routing.workflow_layer
      || routing.workflowLayer
      || manifest.workflow_layer
      || manifest.agent_layer
      || manifestMetadata.workflow_layer
      || manifestMetadata.agent_layer
      || agent?.metadata?.workflow_layer
      || agent?.metadata?.agent_layer
    );
    if (explicitLayer !== null) return explicitLayer;
    if (definedLayer) return definedLayer;
    return workflowLayerNumberFromName(agentLinksFromRecord(agent).layer) || 1;
  }

  function agentManifestKind(agent = {}) {
    const manifest = agent?.metadata?.manifest && typeof agent.metadata.manifest === 'object' ? agent.metadata.manifest : {};
    const raw = String(manifest.kind || agent?.metadata?.kind || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (['group', 'agent_group', 'suite', 'agent_suite', 'agent_bundle', 'agent_pack'].includes(raw)) return 'agent_group';
    if (['composite', 'composite_agent', 'composite_agent_product', 'multi_agent', 'multi_agent_product'].includes(raw)) return 'composite_agent';
    return 'agent';
  }

  function isAgentGroupRecord(agent = {}) {
    return agentManifestKind(agent) === 'agent_group';
  }

  function assignAgentForTask(agents, taskType, budgetCap = 0, requestedAgentId = '', options = {}) {
    const excluded = new Set(Array.isArray(options.excludeAgentIds) ? options.excludeAgentIds : []);
    const requireEndpoint = options.requireEndpoint === true;
    const verified = agents.filter((a) => a.online && isAgentVerified(a) && !isAgentGroupRecord(a) && !excluded.has(a.id) && (!requireEndpoint || resolveAgentJobEndpoint(a)));
    const requestedTask = normalizeTaskTypes([taskType])[0] || String(taskType || '').trim().toLowerCase();
    const requestedIsLeader = isWorkflowLeaderTask(requestedTask);
    const specialistCandidateExists = !requestedIsLeader && verified.some((agent) => (
      !agentRecordIsWorkflowLeader(agent)
      && taskMatchForAgent(agent, taskType, options).matches
    ));
    const scoreAgent = (agent, match) => +(computeScore(agent, match?.dispatchTaskType || taskType, budgetCap) + agentTagFitScore(agent, options.tagHints || []) + agentPatternFitScore(agent, {
      body: options.body || {},
      scheduled: options.scheduled === true,
      recurring: options.recurring === true
    }) + (match?.exact ? 0.12 : Number(match?.compatibility || 0) * 0.1)).toFixed(3);
    if (requestedAgentId) {
      const requested = verified.find((a) => a.id === requestedAgentId);
      if (!requested) return { error: 'Requested agent is unavailable or not verified' };
      const requestedMatch = taskMatchForAgent(requested, taskType, options);
      if (!requestedMatch.matches) return { error: 'Requested agent does not support this task type' };
      return { agent: requested, score: scoreAgent(requested, requestedMatch), assignmentMode: 'manual', ...requestedMatch };
    }
    const ranked = verified
      .map((agent) => {
        if (!requestedIsLeader && specialistCandidateExists && agentRecordIsWorkflowLeader(agent)) return null;
        const match = taskMatchForAgent(agent, taskType, options);
        if (!match.matches) return null;
        return {
          agent,
          score: scoreAgent(agent, match),
          assignmentMode: 'auto',
          readyForAuto: Boolean(resolveAgentJobEndpoint(agent)),
          dispatchTaskType: match.dispatchTaskType || taskType,
          exact: match.exact,
          compatibility: Number(match.compatibility || 0),
          matchKind: match.matchKind || 'exact'
        };
      })
      .filter(Boolean)
      .sort((a, b) => (
        (Number(b.readyForAuto) - Number(a.readyForAuto))
        || (b.score - a.score)
        || (Number(b.exact) - Number(a.exact))
        || (b.compatibility - a.compatibility)
        || (Number(isManagedSampleAgent(a.agent)) - Number(isManagedSampleAgent(b.agent)))
        || String(a.agent.name || a.agent.id || '').localeCompare(String(b.agent.name || b.agent.id || ''))
      ));
    return ranked[0] || null;
  }

  function resolveWorkflowAssignmentFromAgentList(agents = [], assignment = {}, primaryTask = '', prompt = '', options = {}) {
    const requestedTask = normalizeTaskTypes([assignment.taskType || assignment.requestedTaskType || assignment.dispatchTaskType])[0] || '';
    const dispatchTask = normalizeTaskTypes([assignment.dispatchTaskType || requestedTask])[0] || requestedTask;
    const originalAgentId = String(assignment?.agent?.id || '').trim();
    const tagHints = normalizeAgentTags([
      ...workflowTagHintsForTask(requestedTask || dispatchTask, { primaryTask, prompt }),
      ...(Array.isArray(assignment.tagHints) ? assignment.tagHints : [])
    ], { max: 16 });
    const candidateOptions = {
      requireEndpoint: true,
      allowSoftTaskMatch: true,
      body: { prompt, task_type: requestedTask || dispatchTask },
      tagHints,
      scheduled: options.scheduled === true,
      recurring: options.recurring === true
    };
    const currentAgent = originalAgentId
      ? agents.find((agent) => String(agent?.id || '').trim() === originalAgentId) || null
      : null;
    const currentMatch = currentAgent && currentAgent.online && isAgentVerified(currentAgent) && resolveAgentJobEndpoint(currentAgent)
      ? taskMatchForAgent(currentAgent, requestedTask || dispatchTask, candidateOptions)
      : null;
    if (currentAgent && currentMatch?.matches) {
      return {
        ...assignment,
        agent: currentAgent,
        dispatchTaskType: currentMatch.dispatchTaskType || dispatchTask || requestedTask,
        score: +(Number(assignment.score || 0) || computeScore(currentAgent, currentMatch.dispatchTaskType || requestedTask || dispatchTask, options.budgetCap || 0)).toFixed(3),
        assignmentMode: assignment.assignmentMode || 'auto',
        tagHints,
        matchKind: currentMatch.matchKind || assignment.matchKind || 'exact',
        compatibility: Number(currentMatch.compatibility || assignment.compatibility || 0),
        exact: currentMatch.exact !== false
      };
    }
    const picked = assignAgentForTask(agents, requestedTask || dispatchTask, options.budgetCap || 0, '', candidateOptions);
    if (!picked?.agent) return null;
    return {
      ...assignment,
      taskType: requestedTask || assignment.taskType || picked.dispatchTaskType,
      requestedTaskType: requestedTask || assignment.requestedTaskType || picked.dispatchTaskType,
      dispatchTaskType: picked.dispatchTaskType || dispatchTask || requestedTask,
      agent: picked.agent,
      workflowLayer: assignment.workflowLayer || agentWorkflowLayer(picked.agent, primaryTask, requestedTask || picked.dispatchTaskType),
      score: picked.score,
      assignmentMode: picked.assignmentMode,
      tagHints,
      matchKind: picked.matchKind || 'exact',
      compatibility: Number(picked.compatibility || 0),
      exact: picked.exact !== false,
      listResolvedFromAgentId: originalAgentId && originalAgentId !== picked.agent.id ? originalAgentId : null
    };
  }

  function leaderPlannerCandidateAgents(agents = []) {
    return agents
      .filter((agent) => agent?.online && isAgentVerified(agent) && !isAgentGroupRecord(agent) && resolveAgentJobEndpoint(agent))
      .slice(0, 80)
      .map((agent) => {
        const links = agentLinksFromRecord(agent, { catalog: agents });
        return {
          id: agent.id,
          name: agent.name,
          role: agentTagsFromRecord(agent).includes('leader') ? 'leader' : 'worker',
          task_types: Array.isArray(agent.taskTypes) ? agent.taskTypes.slice(0, 12) : [],
          tags: agentTagsFromRecord(agent).slice(0, 12),
          workflow_layer: links.layer || 'worker',
          layer_number: agentWorkflowLayer(agent, '', Array.isArray(agent.taskTypes) ? agent.taskTypes[0] : ''),
          source: isManagedSampleAgent(agent) ? 'sample_agent' : 'provider'
        };
      });
  }

  function leaderPlannerManifestCatalog(agents = []) {
    return leaderReadableAgentCatalogIndex({ agents, includeInternal: true })
      .filter((item) => item.routable !== false)
      .slice(0, 120);
  }

  return {
    agentManifestKind,
    agentRecordIsWorkflowLeader,
    agentTagFitScore,
    agentWorkflowLayer,
    isAgentGroupRecord,
    leaderPlannerCandidateAgents,
    leaderPlannerManifestCatalog,
    metadataTaskScoresForAgent,
    assignAgentForTask,
    resolveWorkflowAssignmentFromAgentList,
    selectedAgentIdFromOrderBody,
    selectedAgentIsLeader,
    selectedAgentNameFromOrderBody,
    selectedAgentTaskTypeFromOrderBody,
    taskMatchForAgent,
    workflowLayerNumberFromName
  };
}
