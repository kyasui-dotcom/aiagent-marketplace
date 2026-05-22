const AUTO_WORKFLOW_SUPPORT_TASKS = new Set(['research', 'summary', 'debug', 'automation']);

export function createOrderStrategyHelpers({
  inferTaskType,
  isWorkflowLeaderTask,
  leaderSpecialistTaskForFollowupFromDefinition,
  normalizeTaskTypes,
  planWorkflowAssignments,
  selectedAgentIdFromOrderBody,
  selectedAgentIsLeader,
  selectedAgentTaskTypeFromOrderBody,
  workflowPlannedTasksFromOrderBody
} = {}) {
  function normalizeOrderStrategy(value = '') {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'single') return 'single';
    if (normalized === 'multi' || normalized === 'multi_agent' || normalized === 'goal') return 'multi';
    return 'auto';
  }

  function isAutoWorkflowSpecialtyTask(taskType = '') {
    const task = String(taskType || '').trim().toLowerCase();
    return Boolean(task && !AUTO_WORKFLOW_SUPPORT_TASKS.has(task));
  }

  function requestedFollowupJobIdFromCreateBody(body = {}) {
    const brokerConversation = body?.input?._broker?.conversation && typeof body.input._broker.conversation === 'object'
      ? body.input._broker.conversation
      : {};
    return String(
      body?.followup_to_job_id
      || body?.followupToJobId
      || brokerConversation.followupToJobId
      || brokerConversation.followup_to_job_id
      || ''
    ).trim();
  }

  function previousFollowupJobFromCreateState(state = {}, body = {}) {
    const followupJobId = requestedFollowupJobIdFromCreateBody(body);
    if (!followupJobId) return null;
    return (Array.isArray(state?.jobs) ? state.jobs : [])
      .find((job) => String(job?.id || '').trim() === followupJobId) || null;
  }

  function primaryTaskForOrderJob(job = {}) {
    const planned = Array.isArray(job?.workflow?.plannedTasks) ? job.workflow.plannedTasks : [];
    return String(planned[0] || job.taskType || job.workflowTask || '').trim().toLowerCase();
  }

  function orderCreateFollowupText(body = {}) {
    const input = body?.input && typeof body.input === 'object' ? body.input : {};
    return [
      body.prompt,
      body.goal,
      body.user_adjustment,
      body.userAdjustment,
      input.original_prompt,
      input.originalPrompt,
      input.user_adjustment,
      input.userAdjustment
    ].map((item) => String(item || '').trim()).filter(Boolean).join('\n');
  }

  function orderCreateLeaderTaskType(state = {}, body = {}) {
    const previousPrimary = primaryTaskForOrderJob(previousFollowupJobFromCreateState(state, body) || {});
    const requestedTask = normalizeTaskTypes([body.task_type])[0] || inferTaskType(body.task_type, body.prompt);
    const leaderTask = previousPrimary || requestedTask;
    return isWorkflowLeaderTask(leaderTask) ? leaderTask : '';
  }

  function orderCreateSpecialistTaskForLeaderText(leaderTask = '', text = '') {
    const safe = String(text || '').trim();
    if (!safe) return '';
    return leaderSpecialistTaskForFollowupFromDefinition(leaderTask, safe);
  }

  function orderCreateLeaderFollowupSpecialistTask(state = {}, body = {}) {
    const previousJob = previousFollowupJobFromCreateState(state, body);
    if (!previousJob?.id) return '';
    const leaderTask = orderCreateLeaderTaskType(state, body);
    if (!leaderTask) return '';
    const text = orderCreateFollowupText(body);
    return orderCreateSpecialistTaskForLeaderText(leaderTask, text);
  }

  function orderBodyWithLeaderFollowupSpecialistRouting(state = {}, body = {}) {
    const specialistTask = orderCreateLeaderFollowupSpecialistTask(state, body);
    if (!specialistTask) return body;
    const leaderTask = orderCreateLeaderTaskType(state, body);
    if (!leaderTask) return body;
    const input = body?.input && typeof body.input === 'object' ? body.input : {};
    const broker = input._broker && typeof input._broker === 'object' ? input._broker : {};
    const priorLeader = broker.activeLeader || broker.conversationOwner || {};
    const retry = broker.retry && typeof broker.retry === 'object' ? broker.retry : {};
    const workflow = broker.workflow && typeof broker.workflow === 'object' ? broker.workflow : {};
    return {
      ...body,
      task_type: leaderTask,
      taskType: leaderTask,
      workflow_planned_tasks: [leaderTask, specialistTask],
      workflowPlannedTasks: [leaderTask, specialistTask],
      preserve_workflow_plan: true,
      preserveWorkflowPlan: true,
      active_leader_locked: true,
      activeLeaderLocked: true,
      active_leader_task_type: leaderTask,
      activeLeaderTaskType: leaderTask,
      input: {
        ...input,
        _broker: {
          ...broker,
          activeLeaderLocked: true,
          leaderFollowupSpecialistRouted: true,
          leaderFollowupSpecialistTask: specialistTask,
          activeLeader: { ...(priorLeader && typeof priorLeader === 'object' ? priorLeader : {}), type: 'leader', taskType: leaderTask },
          conversationOwner: { type: 'leader', taskType: leaderTask, label: priorLeader?.label || leaderTask },
          previousLeader: priorLeader && typeof priorLeader === 'object' ? priorLeader : {},
          retry: {
            ...retry,
            plannedTasks: [leaderTask, specialistTask],
            preservePlan: true
          },
          workflow: {
            ...workflow,
            retryPlannedTasks: [leaderTask, specialistTask],
            leaderFollowupSpecialistTask: specialistTask
          }
        }
      }
    };
  }

  function orderStrategyWithFollowupContext(requestedStrategy = 'auto', state = {}, body = {}) {
    const strategy = normalizeOrderStrategy(requestedStrategy);
    const broker = body?.input?._broker && typeof body.input._broker === 'object' ? body.input._broker : {};
    if (broker.leaderFollowupSpecialistRouted === true) return 'multi';
    if (strategy === 'single' && orderCreateLeaderTaskType(state, body)) return 'multi';
    if (strategy !== 'auto') return strategy;
    const previousJob = previousFollowupJobFromCreateState(state, body);
    if (!previousJob?.id) return strategy;
    return previousJob.jobKind === 'workflow' || Boolean(previousJob.workflow) ? 'multi' : 'single';
  }

  function resolveOrderStrategy(agents, body = {}, strategy = 'auto') {
    const taskType = normalizeTaskTypes([body.task_type])[0] || inferTaskType(body.task_type, body.prompt);
    const selectedAgentId = selectedAgentIdFromOrderBody(body);
    const selectedAgentTaskType = selectedAgentTaskTypeFromOrderBody({ ...body, task_type: taskType });
    const selectedIsLeader = selectedAgentId && selectedAgentIsLeader(agents, { ...body, task_type: selectedAgentTaskType || taskType });
    const preservedPlannedTasks = workflowPlannedTasksFromOrderBody(body);
    const workflowAssignmentOptions = {
      budgetCap: body.budget_cap || 0,
      selectedAgentId,
      selectedAgentTaskType: selectedAgentTaskType || taskType,
      ...(preservedPlannedTasks.length ? { plannedTasks: preservedPlannedTasks, preservePlannedTasks: true, expand: true } : {})
    };
    const repoBackedCodeIntent = ['code', 'debug', 'ops', 'automation'].includes(String(taskType || '').trim().toLowerCase())
      && /(\b(?:github|git hub|repo|repository|pull request|pr|branch|commit|diff|issue|bug|debug|fix)\b|修正|直して|デバッグ|リポジトリ|プルリク|ブランチ|コミット|差分)/i.test(String(body.prompt || ''));
    if (strategy === 'single') {
      return { strategy: 'single', reason: 'Single-agent routing was selected.' };
    }
    if (strategy === 'multi') {
      const plan = planWorkflowAssignments(agents, body.task_type, body.prompt, workflowAssignmentOptions);
      return {
        strategy: 'multi',
        plan,
        reason: 'Multi-agent routing was explicitly selected.'
      };
    }
    if (String(body.agent_id || '').trim()) {
      return { strategy: 'single', reason: 'A target agent was pinned, so the order stays single-agent.' };
    }
    if (selectedAgentId && selectedIsLeader) {
      const plan = planWorkflowAssignments(agents, body.task_type, body.prompt, workflowAssignmentOptions);
      return {
        strategy: 'multi',
        plan,
        reason: 'A selected leader worker was pinned, so CAIt keeps the leader workflow and assigns that leader first.'
      };
    }
    if (selectedAgentId) {
      return { strategy: 'single', reason: 'A selected worker was pinned, so the order stays with that agent.' };
    }
    if (repoBackedCodeIntent) {
      const plan = planWorkflowAssignments(agents, body.task_type, body.prompt, { ...workflowAssignmentOptions, expand: false });
      return {
        strategy: 'single',
        plan,
        reason: 'CAIt kept repo-backed coding as single-agent unless multi-agent routing is explicitly selected.'
      };
    }
    const plan = planWorkflowAssignments(agents, body.task_type, body.prompt, { ...workflowAssignmentOptions, expand: false });
    const plannedSpecialties = new Set(plan.plannedTasks.filter(isAutoWorkflowSpecialtyTask));
    const assignedSpecialties = new Set(plan.assignments
      .filter((assignment) => isAutoWorkflowSpecialtyTask(assignment.taskType))
      .map((assignment) => assignment.taskType));
    if (plannedSpecialties.size >= 2 && assignedSpecialties.size >= 2 && plan.assignments.length >= 2) {
      return {
        strategy: 'multi',
        plan,
        reason: `CAIt detected multiple specialties ready: ${[...assignedSpecialties].join(', ')}.`
      };
    }
    return {
      strategy: 'single',
      plan,
      reason: 'CAIt kept this as single-agent because the request did not require multiple ready specialties.'
    };
  }

  return {
    isAutoWorkflowSpecialtyTask,
    normalizeOrderStrategy,
    orderBodyWithLeaderFollowupSpecialistRouting,
    orderStrategyWithFollowupContext,
    requestedFollowupJobIdFromCreateBody,
    resolveOrderStrategy
  };
}
