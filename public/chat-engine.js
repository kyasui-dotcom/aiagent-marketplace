export const CHAT_ENGINE_DEFAULT_REQUESTED_STRATEGY = 'auto';

export function chatEngineLooksJapanese(value = '') {
  return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(String(value || ''));
}

export function chatEngineIsNeedsInputResponse(response = {}) {
  return response?.needs_input === true
    || String(response?.status || '').trim().toLowerCase() === 'needs_input';
}

export function chatEngineBuildPrepareOrderPayload(prompt = '', options = {}) {
  const selectedAgentId = String(options.selectedAgentId || options.selected_agent_id || '').trim();
  const selectedAgentName = String(options.selectedAgentName || options.selected_agent_name || '').trim();
  const activeLeaderTaskType = String(options.activeLeaderTaskType || options.active_leader_task_type || '').trim();
  const activeLeaderName = String(options.activeLeaderName || options.active_leader_name || '').trim();
  const activeLeaderLocked = options.activeLeaderLocked === true || options.active_leader_locked === true;
  const activeOwnerType = String(options.activeOwnerType || options.active_owner_type || '').trim().toLowerCase();
  const activeOwnerTaskType = String(options.activeOwnerTaskType || options.active_owner_task_type || '').trim();
  const activeOwnerName = String(options.activeOwnerName || options.active_owner_name || '').trim();
  const activeOwnerLocked = options.activeOwnerLocked === true || options.active_owner_locked === true;
  const leaderChangeRequested = options.leaderChangeRequested === true || options.leader_change_requested === true;
  const lockedOwnerTaskType = activeOwnerLocked && activeOwnerType && activeOwnerType !== 'cait' && !leaderChangeRequested
    ? activeOwnerTaskType
    : '';
  const taskType = String(
    options.taskType
    || options.task_type
    || options.selectedTaskType
    || lockedOwnerTaskType
    || (activeLeaderLocked && !leaderChangeRequested ? activeLeaderTaskType : '')
    || ''
  ).trim();
  return {
    prompt: String(prompt || '').trim(),
    requestedStrategy: String(options.requestedStrategy || CHAT_ENGINE_DEFAULT_REQUESTED_STRATEGY).trim() || CHAT_ENGINE_DEFAULT_REQUESTED_STRATEGY,
    ...(taskType ? { task_type: taskType } : {}),
    ...(selectedAgentId ? { selected_agent_id: selectedAgentId } : {}),
    ...(selectedAgentName ? { selected_agent_name: selectedAgentName } : {}),
    ...(activeOwnerType ? { active_owner_type: activeOwnerType } : {}),
    ...(activeOwnerTaskType ? { active_owner_task_type: activeOwnerTaskType } : {}),
    ...(activeOwnerName ? { active_owner_name: activeOwnerName } : {}),
    ...(activeOwnerLocked ? { active_owner_locked: true } : {}),
    ...(activeLeaderTaskType ? { active_leader_task_type: activeLeaderTaskType } : {}),
    ...(activeLeaderName ? { active_leader_name: activeLeaderName } : {}),
    ...(activeLeaderLocked ? { active_leader_locked: true } : {}),
    ...(leaderChangeRequested ? { leader_change_requested: true } : {}),
    ...(options.intakeAnswered === true ? { intake_answered: true } : {}),
    ...(options.skipOpenAiIntent === true || options.skip_openai_intent === true ? { skip_openai_intent: true } : {})
  };
}

function chatEngineConversationOwner(response = {}, options = {}) {
  const owner = response?.conversationOwner || response?.conversation_owner || response?.intake?.conversationOwner || response?.intake?.conversation_owner || {};
  const ownerType = String(owner.type || response.ownerType || response.owner_type || '').trim().toLowerCase();
  const responseOwnerType = String(
    response.activeOwnerType
    || response.active_owner_type
    || response?.intake?.activeOwnerType
    || response?.intake?.active_owner_type
    || ''
  ).trim().toLowerCase();
  const responseOwnerLocked = response.activeOwnerLocked === true
    || response.active_owner_locked === true
    || response?.intake?.activeOwnerLocked === true
    || response?.intake?.active_owner_locked === true;
  const fallbackOwnerType = String(options.activeOwnerType || options.active_owner_type || '').trim().toLowerCase();
  const fallbackOwnerLocked = options.activeOwnerLocked === true || options.active_owner_locked === true;
  const activeOwnerType = ownerType || responseOwnerType || (fallbackOwnerLocked ? fallbackOwnerType : '');
  const responseOwnerTaskType = String(
    response.activeOwnerTaskType
    || response.active_owner_task_type
    || response?.intake?.activeOwnerTaskType
    || response?.intake?.active_owner_task_type
    || ''
  ).trim();
  const responseOwnerName = String(
    response.activeOwnerName
    || response.active_owner_name
    || response?.intake?.activeOwnerName
    || response?.intake?.active_owner_name
    || ''
  ).trim();
  const fallbackOwnerTaskType = activeOwnerType ? (options.activeOwnerTaskType || options.active_owner_task_type || '') : '';
  const fallbackOwnerName = activeOwnerType ? (options.activeOwnerName || options.active_owner_name || '') : '';
  const responseLeaderLocked = response.activeLeaderLocked === true
    || response.active_leader_locked === true
    || response?.intake?.activeLeaderLocked === true
    || response?.intake?.active_leader_locked === true;
  const fallbackLeaderLocked = options.activeLeaderLocked === true || options.active_leader_locked === true;
  const responseLeaderTaskType = String(
    response.activeLeaderTaskType
    || response.active_leader_task_type
    || response?.intake?.activeLeaderTaskType
    || response?.intake?.active_leader_task_type
    || ''
  ).trim();
  const responseLeaderName = String(
    response.activeLeaderName
    || response.active_leader_name
    || response?.intake?.activeLeaderName
    || response?.intake?.active_leader_name
    || ''
  ).trim();
  const fallbackLeaderTaskType = ownerType ? '' : (fallbackLeaderLocked ? options.activeLeaderTaskType || '' : '');
  const fallbackLeaderName = ownerType ? '' : (fallbackLeaderLocked ? options.activeLeaderName || '' : '');
  const activeOwnerTaskType = String(
    owner.taskType
    || owner.task_type
    || (activeOwnerType && activeOwnerType !== 'leader' ? responseOwnerTaskType : '')
    || fallbackOwnerTaskType
    || ''
  ).trim();
  const activeOwnerName = String(
    owner.label
    || (activeOwnerType && activeOwnerType !== 'leader' ? responseOwnerName : '')
    || fallbackOwnerName
    || ''
  ).trim();
  const activeLeaderTaskType = String(
    owner.taskType
    || owner.task_type
    || (ownerType === 'leader' || responseLeaderLocked ? responseLeaderTaskType : '')
    || fallbackLeaderTaskType
    || ''
  ).trim();
  const activeLeaderName = String(
    owner.label
    || (ownerType === 'leader' || responseLeaderLocked ? responseLeaderName : '')
    || fallbackLeaderName
    || ''
  ).trim();
  if ((activeOwnerType === 'leader' || responseLeaderLocked || fallbackLeaderLocked) && activeLeaderTaskType) {
    return {
      type: 'leader',
      taskType: activeLeaderTaskType,
      label: activeLeaderName || activeLeaderTaskType,
      reason: String(owner.reason || response.reason || '').trim()
    };
  }
  if ((activeOwnerType === 'agent' || activeOwnerType === 'specialist') && activeOwnerTaskType) {
    return {
      type: 'agent',
      taskType: activeOwnerTaskType,
      label: activeOwnerName || activeOwnerTaskType,
      reason: String(owner.reason || response.reason || '').trim()
    };
  }
  return {
    type: 'cait',
    label: 'CAIt',
    reason: String(owner.reason || response.reason || '').trim()
  };
}

export function chatEngineBuildIntakeState(response = {}, originalPrompt = '', options = {}) {
  const responseIntake = response?.intake && typeof response.intake === 'object' ? response.intake : {};
  const conversationOwner = chatEngineConversationOwner(response, options);
  const questions = Array.isArray(response.questions)
    ? response.questions.filter(Boolean).slice(0, 4)
    : Array.isArray(responseIntake.questions)
      ? responseIntake.questions.filter(Boolean).slice(0, 4)
      : [];
  const prompt = String(
    responseIntake.originalPrompt
    || responseIntake.original_prompt
    || response.prompt
    || originalPrompt
    || options.originalPrompt
    || ''
  ).trim();
  return {
    ...responseIntake,
    id: String(responseIntake.id || `intake-${Date.now().toString(36)}`),
    originalPrompt: prompt,
    taskType: String(
      responseIntake.taskType
      || responseIntake.task_type
      || response.inferred_task_type
      || response.taskType
      || response.task_type
      || options.taskType
      || 'research'
    ).trim() || 'research',
    selectedAgentId: String(responseIntake.selectedAgentId || responseIntake.selected_agent_id || response.selectedAgentId || response.selected_agent_id || options.selectedAgentId || '').trim(),
    selectedAgentName: String(responseIntake.selectedAgentName || responseIntake.selected_agent_name || response.selectedAgentName || response.selected_agent_name || options.selectedAgentName || '').trim(),
    conversationOwner,
    activeOwnerType: conversationOwner.type,
    activeOwnerTaskType: conversationOwner.type !== 'cait' ? conversationOwner.taskType : '',
    activeOwnerName: conversationOwner.label || '',
    activeOwnerLocked: conversationOwner.type !== 'cait',
    activeLeaderTaskType: conversationOwner.type === 'leader' ? conversationOwner.taskType : '',
    activeLeaderName: conversationOwner.type === 'leader' ? conversationOwner.label : '',
    questions,
    missingFields: Array.isArray(responseIntake.missingFields)
      ? responseIntake.missingFields
      : Array.isArray(response.missing_fields)
        ? response.missing_fields
        : [],
    createdAt: String(responseIntake.createdAt || responseIntake.created_at || new Date().toISOString()),
    answerMode: String(responseIntake.answerMode || responseIntake.answer_mode || 'resubmit_with_answers')
  };
}

export function chatEngineBuildIntakeCombinedPrompt(intake = {}, answer = '', options = {}) {
  const original = String(intake?.originalPrompt || intake?.original_prompt || options.originalPrompt || '').trim();
  const clarification = String(answer || '').trim();
  const connectorContext = String(
    options.connectorContext
    || options.appContextPrompt
    || intake?.connectorContext
    || intake?.appContextPrompt
    || ''
  ).trim();
  const lines = [
    'Original request:',
    original,
    '',
    'User clarification:',
    clarification
  ];
  if (connectorContext) {
    lines.push(
      '',
      'Attached connector context:',
      connectorContext
    );
  }
  if (options.includeInstruction !== false) {
    lines.push(
      '',
      String(options.instruction || 'Use these clarification details and produce the requested delivery. State any remaining assumptions briefly.').trim()
    );
  }
  return lines.join('\n').trim();
}

export function chatEngineDraftBrief(prompt = '', prepared = {}, options = {}) {
  const ja = options.ja ?? chatEngineLooksJapanese(prompt);
  const task = String(prepared.taskType || prepared.task_type || 'research').trim() || 'research';
  const route = String(prepared.resolvedOrderStrategy || prepared.resolved_order_strategy || 'single').trim() || 'single';
  const owner = chatEngineConversationOwner(prepared, options);
  const deliver = options.deliver || (ja
    ? 'チャットに進捗と納品を返す。必要なHTML/ファイルは納品カードとして表示する。'
    : 'Return progress and delivery in chat. Include HTML/files as delivery cards when relevant.');
  return [
    `Task: ${task}`,
    `Goal: ${String(prompt || '').trim()}`,
    owner.type === 'leader'
      ? `Conversation lead: ${owner.label} (${owner.taskType})`
      : owner.type === 'agent'
        ? `Conversation agent: ${owner.label} (${owner.taskType})`
        : 'Conversation lead: CAIt specialist router',
    `Work split: ${route === 'multi' ? 'team workflow' : 'single agent'}`,
    'Inputs: chat request and any URLs or constraints in the message',
    'Constraints: keep the user-facing flow chat-first; do not claim external writes without connector proof',
    `Deliver: ${deliver}`,
    `Output language: ${ja ? 'Japanese' : 'English'}`,
    'Acceptance: concrete delivery, visible waiting states, source/connector status, and next action are all posted back into this chat'
  ].filter(Boolean).join('\n');
}

export function chatEngineBuildOrderDraft(prompt = '', prepared = {}, options = {}) {
  const owner = chatEngineConversationOwner(prepared, options);
  const activeLeaderLocked = options.activeLeaderLocked === true
    || options.active_leader_locked === true
    || prepared.activeLeaderLocked === true
    || prepared.active_leader_locked === true;
  const leaderChangeRequested = options.leaderChangeRequested === true
    || options.leader_change_requested === true
    || prepared.leaderChangeRequested === true
    || prepared.leader_change_requested === true;
  return {
    ...prepared,
    prompt: chatEngineDraftBrief(prompt, prepared, options),
    originalPrompt: options.originalPrompt || prompt,
    intakeAnswered: options.intakeAnswered === true,
    intakeChecked: options.intakeChecked === true,
    selectedAgentId: options.selectedAgentId || prepared.selectedAgentId || prepared.selected_agent_id || '',
    selectedAgentName: options.selectedAgentName || prepared.selectedAgentName || prepared.selected_agent_name || '',
    conversationOwner: owner,
    activeOwnerType: owner.type,
    activeOwnerTaskType: owner.type !== 'cait' ? owner.taskType : '',
    activeOwnerName: owner.label || '',
    activeOwnerLocked: owner.type !== 'cait',
    activeLeaderTaskType: owner.type === 'leader' ? owner.taskType : '',
    activeLeaderName: owner.type === 'leader' ? owner.label : '',
    activeLeaderLocked: activeLeaderLocked && owner.type === 'leader',
    leaderChangeRequested,
    updatedAt: new Date().toISOString()
  };
}

export function chatEngineBuildJobPayload(draft = {}, options = {}) {
  const broker = options.broker && typeof options.broker === 'object' ? options.broker : {};
  const selectedAgentId = draft.selectedAgentId || draft.selected_agent_id || '';
  const selectedAgentName = draft.selectedAgentName || draft.selected_agent_name || '';
  const taskType = draft.taskType || draft.task_type || 'research';
  const owner = chatEngineConversationOwner(draft, options);
  return {
    parent_agent_id: options.parentAgentId || draft.parent_agent_id || draft.parentAgentId || 'cloudcode-main',
    task_type: taskType,
    selected_agent_id: selectedAgentId,
    selected_agent_name: selectedAgentName,
    prompt: String(draft.prompt || '').trim(),
    order_strategy: draft.resolvedOrderStrategy || draft.resolved_order_strategy || draft.order_strategy || 'single',
    ...(
      Array.isArray(draft.workflowPlannedTasks || draft.workflow_planned_tasks)
        ? { workflow_planned_tasks: (draft.workflowPlannedTasks || draft.workflow_planned_tasks).map((item) => String(item || '').trim()).filter(Boolean).slice(0, 12) }
        : {}
    ),
    async_dispatch: options.asyncDispatch !== false,
    skip_intake: options.skipIntake === true || draft.intakeChecked === true || draft.intakeAnswered === true,
    visitor_id: options.visitorId || draft.visitor_id || '',
    budget_cap: Number(options.budgetCap ?? draft.budget_cap ?? 500),
    deadline_sec: Number(options.deadlineSec ?? draft.deadline_sec ?? 300),
    ...(draft.activeLeaderLocked === true && owner.type === 'leader' ? {
      active_leader_task_type: owner.taskType,
      active_leader_name: owner.label,
      active_leader_locked: true
    } : {}),
    ...(draft.activeOwnerLocked === true && owner.type !== 'cait' ? {
      active_owner_type: owner.type,
      active_owner_task_type: owner.taskType,
      active_owner_name: owner.label,
      active_owner_locked: true
    } : {}),
    ...(draft.leaderChangeRequested === true ? { leader_change_requested: true } : {}),
    confirmation: {
      accepted: true,
      source: 'chat_send_order',
      accepted_at: new Date().toISOString(),
      ...(selectedAgentId ? { agent_id: selectedAgentId } : {})
    },
    input: {
      ...(draft.input && typeof draft.input === 'object' ? draft.input : {}),
      source: options.source || draft.input?.source || 'chat',
      original_prompt: draft.originalPrompt || draft.original_prompt || '',
      _broker: {
        ...((draft.input && typeof draft.input === 'object' && draft.input._broker && typeof draft.input._broker === 'object') ? draft.input._broker : {}),
        ...broker,
        conversationOwner: owner,
        ...(draft.activeOwnerLocked === true && owner.type !== 'cait' ? {
          activeOwnerLocked: true,
          activeOwner: {
            type: owner.type,
            taskType: owner.taskType,
            label: owner.label,
            reason: owner.reason || ''
          }
        } : {}),
        ...(draft.activeLeaderLocked === true && owner.type === 'leader' ? { activeLeaderLocked: true } : {}),
        ...(draft.leaderChangeRequested === true ? { leaderChangeRequested: true } : {}),
        ...(owner.type === 'leader' ? {
          activeLeader: {
            taskType: owner.taskType,
            label: owner.label,
            reason: owner.reason || ''
          }
        } : {}),
        ...(selectedAgentId ? {
          selectedWorker: {
            agentId: selectedAgentId,
            agentName: selectedAgentName,
            taskType
          }
        } : {})
      }
    }
  };
}
