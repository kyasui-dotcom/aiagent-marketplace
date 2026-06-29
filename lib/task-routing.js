export function createTaskRoutingTools(deps = {}) {
  const sampleAgentDefinitions = deps.sampleAgentDefinitions && typeof deps.sampleAgentDefinitions === 'object'
    ? deps.sampleAgentDefinitions
    : {};
  const normalizeAgentTags = typeof deps.normalizeAgentTags === 'function'
    ? deps.normalizeAgentTags
    : ((value = []) => (Array.isArray(value) ? value : String(value || '').split(/[,\n]/)).map((item) => String(item || '').trim().toLowerCase()).filter(Boolean));
  const inferAgentTagsFromSignals = typeof deps.inferAgentTagsFromSignals === 'function'
    ? deps.inferAgentTagsFromSignals
    : (() => []);
  const normalizeTaskTypes = typeof deps.normalizeTaskTypes === 'function'
    ? deps.normalizeTaskTypes
    : ((value = []) => (Array.isArray(value) ? value : String(value || '').split(',')).map((item) => String(item || '').trim().toLowerCase()).filter(Boolean));
  const leaderControlContractForTask = typeof deps.leaderControlContractForTask === 'function'
    ? deps.leaderControlContractForTask
    : (() => null);
  const leaderTaskLayer = typeof deps.leaderTaskLayer === 'function'
    ? deps.leaderTaskLayer
    : (() => 1);
  const leaderIntakeTaskSet = deps.leaderIntakeTasks instanceof Set
    ? deps.leaderIntakeTasks
    : new Set(Array.isArray(deps.leaderIntakeTasks) ? deps.leaderIntakeTasks : []);

  function normalizedLeaderBehaviorTask(value = '') {
    return String(value || '').trim().toLowerCase();
  }

  function leaderBehaviorForTask(taskType = '') {
    const primary = normalizedLeaderBehaviorTask(taskType);
    const direct = sampleAgentDefinitions[primary]?.leaderBehavior || null;
    if (direct) return direct;
    for (const defaults of Object.values(sampleAgentDefinitions)) {
      const aliases = Array.isArray(defaults?.workflowProfile?.aliases)
        ? defaults.workflowProfile.aliases.map(normalizedLeaderBehaviorTask)
        : [];
      if (aliases.includes(primary) && defaults?.leaderBehavior) return defaults.leaderBehavior;
    }
    return null;
  }

  function leaderBehaviorTaskInferenceRules() {
    return Object.values(sampleAgentDefinitions)
      .flatMap((defaults) => Array.isArray(defaults?.leaderBehavior?.taskInferenceRules)
        ? defaults.leaderBehavior.taskInferenceRules
        : [])
      .filter(Boolean);
  }

  function leaderBehaviorTaskExpansion(primaryTask = '') {
    const expansion = leaderBehaviorForTask(primaryTask)?.taskExpansionTasks;
    return Array.isArray(expansion) ? expansion : [];
  }

  function leaderBehaviorAnalysisPrelude(primaryTask = '') {
    const prelude = leaderBehaviorForTask(primaryTask)?.analysisPreludeTasks;
    return Array.isArray(prelude) ? prelude : [];
  }

  function normalizeLeaderBehaviorAlias(token = '', prompt = '') {
    for (const defaults of Object.values(sampleAgentDefinitions)) {
      const normalizeAlias = defaults?.leaderBehavior?.normalizeAlias;
      if (typeof normalizeAlias !== 'function') continue;
      const resolved = normalizeAlias(token, prompt);
      if (resolved) return String(resolved || '').trim().toLowerCase();
    }
    return '';
  }

  function leaderBehaviorTaskTypeForText(text = '') {
    for (const defaults of Object.values(sampleAgentDefinitions)) {
      const taskTypeForText = defaults?.leaderBehavior?.taskTypeForText;
      if (typeof taskTypeForText !== 'function') continue;
      const resolved = taskTypeForText(text);
      if (resolved) return String(resolved || '').trim().toLowerCase();
    }
    return '';
  }

  function leaderSpecialistTaskForFollowupFromDefinition(primaryTask = '', text = '') {
    const primary = normalizeTaskTypeAlias(primaryTask, text);
    if (!primary || !primary.endsWith('_leader')) return '';
    const behavior = leaderBehaviorForTask(primary);
    const resolver = behavior?.followupSpecialistTaskForText || behavior?.taskTypeForText;
    if (typeof resolver !== 'function') return '';
    const resolved = resolver(`${primary}\n${text}`, { primaryTask: primary, prompt: text });
    const task = normalizeTaskTypeAlias(resolved, text);
    if (!task || task === primary || task.endsWith('_leader')) return '';
    return task;
  }

  function leaderBehaviorIntentCheck(checkName = '', taskType = '', prompt = '') {
    for (const defaults of Object.values(sampleAgentDefinitions)) {
      const check = defaults?.leaderBehavior?.intentChecks?.[checkName];
      if (typeof check !== 'function') continue;
      if (check(taskType, prompt)) return true;
    }
    return false;
  }

  function inferLeaderBehaviorTaskSequence(primaryTask = '', context = {}) {
    const inferTaskSequenceForLeader = leaderBehaviorForTask(primaryTask)?.inferTaskSequence;
    if (typeof inferTaskSequenceForLeader !== 'function') return null;
    const sequence = inferTaskSequenceForLeader(context);
    return Array.isArray(sequence) && sequence.length ? sequence : null;
  }

  function normalizeLeaderWorkflowPlannedTasksFromDefinition(plannedTasks = [], primaryTask = '', prompt = '', options = {}, helpers = {}) {
    const normalizeTasks = leaderBehaviorForTask(primaryTask)?.normalizeWorkflowPlannedTasks;
    if (typeof normalizeTasks !== 'function') return null;
    const sequence = normalizeTasks({ plannedTasks, primaryTask, prompt, options, helpers });
    return Array.isArray(sequence) && sequence.length ? sequence : null;
  }

  function leaderPlannerAllowsCandidateAgentTasksFromDefinition(primaryTask = '', defaultValue = true) {
    const value = leaderBehaviorForTask(primaryTask)?.plannerAllowsCandidateAgentTasks;
    return typeof value === 'boolean' ? value : defaultValue;
  }

  function ensureLeaderWorkflowActionTasksFromDefinition(plannedTasks = [], primaryTask = '', prompt = '', options = {}, helpers = {}) {
    const ensureTasks = leaderBehaviorForTask(primaryTask)?.ensureWorkflowActionTasks;
    if (typeof ensureTasks !== 'function') return null;
    const sequence = ensureTasks({ plannedTasks, primaryTask, prompt, options, helpers });
    return Array.isArray(sequence) && sequence.length ? sequence : null;
  }

  function leaderWorkflowReplanDecisionFromDefinition(primaryTask = '', context = {}) {
    const replanDecision = leaderBehaviorForTask(primaryTask)?.replanDecision;
    if (typeof replanDecision !== 'function') return null;
    return replanDecision(context.candidateTasks || [], context.sourceText || '', context.layer || 1, context.actionLayerStart || 2);
  }

  function leaderSequentialUserActionPriorityFromDefinition(primaryTask = '', context = {}) {
    const priority = leaderBehaviorForTask(primaryTask)?.sequentialUserActionPriority;
    if (typeof priority !== 'function') return 0;
    return priority(context.task || '', context.sourceText || '', context.selectedTasks || []);
  }

  function leaderExternalActionRequestedFromDefinition(primaryTask = '', text = '') {
    const requested = leaderBehaviorForTask(primaryTask)?.externalActionRequested;
    if (typeof requested !== 'function') return false;
    return Boolean(requested(text));
  }

  function taskRoutingArray(value = []) {
    return Array.isArray(value)
      ? value.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean)
      : [];
  }

  function taskRoutingObject(value = {}) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }

  function taskRoutingForDefinition(defaults = {}) {
    return taskRoutingObject(defaults?.taskRouting || defaults?.task_routing);
  }

  function taskRoutingAliasesForDefinition(defaultTaskType = '', routing = {}) {
    return [...new Set([
      String(defaultTaskType || '').trim().toLowerCase(),
      ...taskRoutingArray(routing.aliases)
    ].filter(Boolean))];
  }

  function taskRoutingOwnsTask(defaultTaskType = '', routing = {}, taskType = '') {
    const task = String(taskType || '').trim().toLowerCase();
    if (!task) return false;
    if (taskRoutingAliasesForDefinition(defaultTaskType, routing).includes(task)) return true;
    for (const field of [
      'expansionTasksByTask',
      'expansion_tasks_by_task',
      'softMatchTokensByTask',
      'soft_match_tokens_by_task',
      'tagHintsByTask',
      'tag_hints_by_task'
    ]) {
      const byTask = taskRoutingObject(routing[field]);
      if (Object.prototype.hasOwnProperty.call(byTask, task)) return true;
    }
    return false;
  }

  function taskRoutingByTaskValues(routing = {}, taskType = '', camelField = '', snakeField = '') {
    const task = String(taskType || '').trim().toLowerCase();
    if (!task) return [];
    const byTask = {
      ...taskRoutingObject(routing[camelField]),
      ...taskRoutingObject(routing[snakeField])
    };
    return taskRoutingArray(byTask[task]);
  }

  function taskRoutingRulesFromAgentDefinitions() {
    const rules = [];
    for (const [kind, defaults] of Object.entries(sampleAgentDefinitions)) {
      const routing = taskRoutingForDefinition(defaults);
      for (const rule of Array.isArray(routing.inferenceRules) ? routing.inferenceRules : []) {
        if (!rule || typeof rule !== 'object') continue;
        const taskType = String(rule.taskType || rule.task_type || kind || '').trim().toLowerCase();
        const patterns = Array.isArray(rule.patterns) ? rule.patterns.filter(Boolean) : [];
        if (taskType && patterns.length) rules.push({ taskType, patterns, score: rule.score });
      }
      const patterns = Array.isArray(routing.inferencePatterns) ? routing.inferencePatterns.filter(Boolean) : [];
      if (patterns.length) {
        const taskType = String(routing.taskType || routing.task_type || kind || '').trim().toLowerCase();
        if (taskType) rules.push({ taskType, patterns, score: routing.inferenceScore || routing.inference_score });
      }
    }
    return [
      ...rules,
      ...leaderBehaviorTaskInferenceRules()
    ];
  }

  function taskExpansionFromAgentDefinitions(taskType = '') {
    const task = String(taskType || '').trim().toLowerCase();
    if (!task) return [];
    const expanded = [];
    const push = (items = []) => {
      for (const item of taskRoutingArray(items)) {
        if (!expanded.includes(item)) expanded.push(item);
      }
    };
    for (const [kind, defaults] of Object.entries(sampleAgentDefinitions)) {
      const routing = taskRoutingForDefinition(defaults);
      push(taskRoutingByTaskValues(routing, task, 'expansionTasksByTask', 'expansion_tasks_by_task'));
      if (taskRoutingOwnsTask(kind, routing, task)) push(routing.expansionTasks || routing.expansion_tasks);
    }
    return expanded;
  }

  function taskRoutingTokensFromAgentDefinitions(taskType = '', options = {}) {
    const task = String(taskType || '').trim().toLowerCase();
    if (!task) return [];
    const field = options.field || 'soft';
    const values = [];
    const push = (items = []) => {
      for (const item of taskRoutingArray(items)) {
        if (!values.includes(item)) values.push(item);
      }
    };
    const byTaskCamel = field === 'tag' ? 'tagHintsByTask' : 'softMatchTokensByTask';
    const byTaskSnake = field === 'tag' ? 'tag_hints_by_task' : 'soft_match_tokens_by_task';
    const directCamel = field === 'tag' ? 'tagHints' : 'softMatchTokens';
    const directSnake = field === 'tag' ? 'tag_hints' : 'soft_match_tokens';
    for (const [kind, defaults] of Object.entries(sampleAgentDefinitions)) {
      const routing = taskRoutingForDefinition(defaults);
      push(taskRoutingByTaskValues(routing, task, byTaskCamel, byTaskSnake));
      if (taskRoutingOwnsTask(kind, routing, task)) push(routing[directCamel] || routing[directSnake]);
    }
    return values;
  }

  function workflowTaskSoftMatchTokens(taskType = '', options = {}) {
    const task = String(taskType || '').trim().toLowerCase();
    if (!task) return [];
    return normalizeAgentTags([
      task,
      ...taskRoutingTokensFromAgentDefinitions(task, { ...options, field: 'soft' })
    ], { max: Number(options.max || 24) || 24 });
  }

  function workflowTaskCandidateTokens(taskType = '', options = {}) {
    const task = String(taskType || '').trim().toLowerCase();
    if (!task) return [];
    return normalizeAgentTags([
      task,
      ...taskRoutingTokensFromAgentDefinitions(task, { ...options, field: 'soft' }),
      ...inferAgentTagsFromSignals({
        taskTypes: [task],
        name: task,
        description: options.prompt || task,
        maxTags: 12
      })
    ], { max: Number(options.max || 16) || 16 });
  }

  function workflowTagHintsForTask(taskType = '', options = {}) {
    const task = String(taskType || '').trim().toLowerCase();
    const primary = String(options.primaryTask || '').trim().toLowerCase();
    const prompt = String(options.prompt || '');
    const tags = [
      ...inferAgentTagsFromSignals({ taskTypes: [task], name: task, description: prompt, maxTags: 12 }),
      ...taskRoutingTokensFromAgentDefinitions(task, { field: 'tag' })
    ];
    if (primary && primary !== task) tags.push(...taskRoutingTokensFromAgentDefinitions(primary, { field: 'tag' }));
    if (task.endsWith('_leader') || leaderControlContractForTask(task)) tags.push('leader', 'orchestration', 'planning');
    return normalizeAgentTags(tags, { max: Number(options.max || 14) || 14 });
  }

  function publicTaskRoutingByTaskProfile(value = {}) {
    const source = taskRoutingObject(value);
    const result = {};
    for (const [taskType, items] of Object.entries(source)) {
      const task = String(taskType || '').trim().toLowerCase();
      const list = taskRoutingArray(items);
      if (task && list.length) result[task] = list;
    }
    return result;
  }

  function publicTaskRoutingProfileForKind(kind = '') {
    const defaults = sampleAgentDefinitions[String(kind || '').trim().toLowerCase()];
    const routing = taskRoutingForDefinition(defaults);
    const profile = {};
    const setList = (key, value) => {
      const list = taskRoutingArray(value);
      if (list.length) profile[key] = list;
    };
    const setByTask = (key, value) => {
      const mapped = publicTaskRoutingByTaskProfile(value);
      if (Object.keys(mapped).length) profile[key] = mapped;
    };
    setList('aliases', routing.aliases);
    setList('expansion_tasks', routing.expansionTasks || routing.expansion_tasks);
    setList('soft_match_tokens', routing.softMatchTokens || routing.soft_match_tokens);
    setList('tag_hints', routing.tagHints || routing.tag_hints);
    setByTask('expansion_tasks_by_task', routing.expansionTasksByTask || routing.expansion_tasks_by_task);
    setByTask('soft_match_tokens_by_task', routing.softMatchTokensByTask || routing.soft_match_tokens_by_task);
    setByTask('tag_hints_by_task', routing.tagHintsByTask || routing.tag_hints_by_task);
    return Object.keys(profile).length ? profile : null;
  }

  const LEADER_ANALYSIS_PRELUDE_MAP = Object.freeze({
  });

  function taskExpansionForTask(taskType = '') {
    const leaderExpansion = leaderBehaviorTaskExpansion(taskType);
    if (leaderExpansion.length) return leaderExpansion;
    return taskExpansionFromAgentDefinitions(taskType);
  }

  function taskAliasToken(value = '') {
    return String(value || '')
      .normalize('NFKC')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  function normalizeTaskTypeAlias(taskType = '', prompt = '') {
    const token = taskAliasToken(taskType);
    const text = `${taskType}\n${prompt}`;
    const leaderAlias = normalizeLeaderBehaviorAlias(token, prompt);
    if (leaderAlias) return leaderAlias;
    if ([
      'media_planner',
      'channel_planner',
      'distribution_strategy',
      'channel_fit',
      'listing_media_strategy'
    ].includes(token)) return 'media_planner';
    if ([
      'list_creator',
      'lead_sourcing',
      'lead_qualification',
      'company_list_builder',
      'prospect_research',
      'lead_list_building',
      'prospect_list',
      'lead_list'
    ].includes(token)) return 'list_creator';
    if ([
      'citation_ops',
      'meo',
      'local_seo',
      'gbp',
      'google_business_profile',
      'citations',
      'local_listing'
    ].includes(token)) return 'citation_ops';
    if ([
      'seo',
      'seo_specialist',
      'seo_research',
      'keyword_research',
      'seo_article',
      'seo_article_batch',
      'seo_rewrite',
      'seo_monitor',
      'content_gap'
    ].includes(token)) return 'seo_specialist';
    if ([
      'cold_email',
      'cold_outbound',
      'outbound_email',
      'sales_email',
      'prospecting_email'
    ].includes(token)) return 'cold_email';
    if ([
      'email',
      'email_ops',
      'email_campaign',
      'lifecycle_email',
      'newsletter',
      'onboarding_email',
      'reactivation_email',
      'mail_campaign'
    ].includes(token)) return 'email_ops';
    if ([
      'x_post',
      'x',
      'twitter',
      'x_ops',
      'x_automation',
      'reply_handling',
      'scheduled_social'
    ].includes(token)) return 'x_post';
    if ([
      'instagram',
      'insta'
    ].includes(token)) return 'instagram';
    if ([
      'reddit',
      'subreddit'
    ].includes(token)) return 'reddit';
    if ([
      'indie_hackers',
      'indiehackers'
    ].includes(token)) return 'indie_hackers';
    if ([
      'inbox_triage',
      'email_triage',
      'mailbox_triage',
      'gmail_triage',
      'inbox'
    ].includes(token)) return 'inbox_triage';
    if ([
      'reply_draft',
      'email_reply',
      'reply_writer',
      'gmail_reply'
    ].includes(token)) return 'reply_draft';
    if ([
      'schedule_coordination',
      'calendar_coordination',
      'meeting_schedule',
      'calendar',
      'scheduling',
      'google_meet',
      'zoom',
      'microsoft_teams',
      'teams_meeting'
    ].includes(token)) return 'schedule_coordination';
    if ([
      'follow_up',
      'followup',
      'reminder',
      'chaser'
    ].includes(token)) return 'follow_up';
    if ([
      'meeting_prep',
      'meeting_brief',
      'agenda',
      'briefing',
      'pre_read'
    ].includes(token)) return 'meeting_prep';
    if ([
      'meeting_notes',
      'minutes',
      'action_items',
      'meeting_summary'
    ].includes(token)) return 'meeting_notes';
    if (token && token.endsWith('_leader')) return token;
    const behaviorAlias = normalizeLeaderBehaviorAlias(token, text);
    if (!token && behaviorAlias) return behaviorAlias;
    return token;
  }

  function leaderTaskTypeForInitialWork(taskType = '', prompt = '') {
    const task = normalizeTaskTypeAlias(taskType, prompt);
    const source = `${task}\n${prompt}`;
    if (leaderIntakeTaskSet.has(task) || task.endsWith('_leader')) return task;
    const behaviorLeaderTask = leaderBehaviorTaskTypeForText(source);
    if (behaviorLeaderTask) return behaviorLeaderTask;
    return '';
  }

  function isLargeAgentTeamIntent(taskType = '', prompt = '') {
    return leaderBehaviorIntentCheck('largeTeam', taskType, prompt);
  }

  function prioritizeLeaderAnalysisTasks(tasks = []) {
    const ordered = [];
    const pushUnique = (name) => {
      const safe = String(name || '').trim().toLowerCase();
      if (!safe || ordered.includes(safe)) return;
      ordered.push(safe);
    };
    const primary = String(tasks[0] || '').trim().toLowerCase();
    const behaviorPrelude = leaderBehaviorAnalysisPrelude(primary);
    const prelude = behaviorPrelude.length ? behaviorPrelude : LEADER_ANALYSIS_PRELUDE_MAP[primary];
    if (!prelude) return tasks;
    pushUnique(primary);
    for (const task of prelude) pushUnique(task);
    for (const task of tasks.slice(1)) pushUnique(task);
    return ordered;
  }

  function taskDependencyOrdered(tasks = []) {
    const requested = normalizeTaskTypes(tasks);
    const includeSummary = requested.includes('summary');
    const remaining = requested.filter((task) => task !== 'summary');
    const ordered = [];
    const visited = new Set();
    const visiting = new Set();
    const visit = (task) => {
      const safe = String(task || '').trim().toLowerCase();
      if (!safe || visited.has(safe)) return;
      if (visiting.has(safe)) return;
      visiting.add(safe);
      for (const dependency of taskExpansionForTask(safe)) {
        if (!remaining.includes(dependency)) continue;
        visit(dependency);
      }
      visiting.delete(safe);
      visited.add(safe);
      ordered.push(safe);
    };
    const anchor = String(remaining[0] || '').trim().toLowerCase();
    if (anchor) {
      visited.add(anchor);
      ordered.push(anchor);
    }
    for (const task of remaining) visit(task);
    if (includeSummary && !ordered.includes('summary')) ordered.push('summary');
    return ordered;
  }

  function inferTaskSequence(taskType, prompt = '', options = {}) {
    const maxTasks = Math.max(1, Number(options.maxTasks || 3));
    const expand = options.expand !== false;
    const baseExplicit = normalizeTaskTypeAlias(taskType, prompt);
    const explicit = options.initialLeader === true
      ? leaderTaskTypeForInitialWork(baseExplicit, prompt)
      : baseExplicit;
    const text = String(prompt || '').toLowerCase();
    const scored = new Map();
    const explicitLeader = Boolean(explicit && explicit.endsWith('_leader'));
    const pushScore = (name, amount) => {
      if (!name) return;
      scored.set(name, Number(scored.get(name) || 0) + amount);
    };

    if (explicit) pushScore(explicit, 100);
    for (const rule of taskRoutingRulesFromAgentDefinitions()) {
      for (const pattern of rule.patterns) {
        if (pattern.test(text)) pushScore(rule.taskType, Number(rule.score || 10) || 10);
      }
    }
    if (!scored.size) pushScore('research', 1);

    const ranked = [...scored.entries()]
      .filter(([name]) => !explicitLeader || name === explicit || !String(name || '').trim().toLowerCase().endsWith('_leader'))
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([name]) => name);

    const ordered = [];
    const pushUnique = (name) => {
      const safe = String(name || '').trim().toLowerCase();
      if (!safe || ordered.includes(safe)) return;
      ordered.push(safe);
    };

    if (explicit) pushUnique(explicit);
    for (const name of ranked) pushUnique(name);
    if (expand) {
      const primary = ordered[0] || 'research';
      for (const extra of taskExpansionForTask(primary)) pushUnique(extra);
      if (ordered.includes('research')) pushUnique('summary');
      if (ordered.includes('seo')) pushUnique('writing');
      if (ordered.includes('listing')) pushUnique('seo');
    }

    let prioritized = prioritizeLeaderAnalysisTasks(ordered);
    const primary = prioritized[0] || '';
    if (primary && primary.endsWith('_leader')) {
      const preferredSpecialists = ranked.filter((name) => {
        const safe = String(name || '').trim().toLowerCase();
        if (!safe || safe === primary || safe.endsWith('_leader')) return false;
        return taskExpansionForTask(primary).includes(safe);
      });
      if (preferredSpecialists.length) {
        const promoted = [];
        const pushUniquePromoted = (name) => {
          const safe = String(name || '').trim().toLowerCase();
          if (!safe || promoted.includes(safe)) return;
          promoted.push(safe);
        };
        pushUniquePromoted(primary);
        for (const name of preferredSpecialists) pushUniquePromoted(name);
        for (const name of prioritized.slice(1)) pushUniquePromoted(name);
        prioritized = promoted;
      }
    }

    const explicitExecutionDependencies = {
      x_post: ['research', 'writing', 'x_post'],
      instagram: ['research', 'writing', 'instagram'],
      reddit: ['research', 'writing', 'reddit'],
      indie_hackers: ['research', 'writing', 'indie_hackers'],
      directory_submission: ['research', 'writing', 'directory_submission'],
      email_ops: ['research', 'writing', 'email_ops'],
      cold_email: ['research', 'list_creator', 'writing', 'cold_email']
    };
    if (maxTasks === 1) {
      return [prioritized[0] || 'research'];
    }

    if (expand && explicit && explicitExecutionDependencies[explicit]) {
      const sequence = [];
      const pushUniqueSequence = (name) => {
        const safe = String(name || '').trim().toLowerCase();
        if (!safe || sequence.includes(safe)) return;
        sequence.push(safe);
      };
      for (const name of explicitExecutionDependencies[explicit]) pushUniqueSequence(name);
      for (const name of prioritized) pushUniqueSequence(name);
      if (sequence.includes('research')) pushUniqueSequence('summary');
      return taskDependencyOrdered(sequence).slice(0, maxTasks);
    }

    const leaderBehaviorSequence = inferLeaderBehaviorTaskSequence(prioritized[0], {
      prioritized,
      ranked,
      taskType,
      prompt,
      text,
      maxTasks,
      taskDependencyOrdered,
      leaderTaskLayer
    });
    if (leaderBehaviorSequence) return leaderBehaviorSequence;

    return taskDependencyOrdered(prioritized).slice(0, maxTasks);
  }

  function inferTaskType(taskType, prompt = '') {
    const explicit = normalizeTaskTypeAlias(taskType, prompt);
    const direct = inferTaskSequence(taskType, prompt, {
      maxTasks: 1,
      initialLeader: false
    })[0] || 'research';
    if (explicit || direct.endsWith('_leader')) return direct;
    const text = String(prompt || '').trim();
    const initialLeader = leaderTaskTypeForInitialWork('', text);
    if (
      direct === 'research'
      && initialLeader === 'research_team_leader'
      && /^(競合調査|市場調査|調査|リサーチ)(したい|して|をお願い|お願いします)?[。.!！?？]*$/i.test(text)
    ) {
      return 'research_team_leader';
    }
    if (
      (direct === 'code' || direct === 'research')
      && initialLeader === 'build_team_leader'
      && /^(バグを直したい|不具合を直したい|コードを直したい|fix\s+(?:a\s+)?bug|debug\s+this|fix\s+the\s+code)[。.!！?？]*$/i.test(text)
    ) {
      return 'build_team_leader';
    }
    return direct;
  }

  return {
    leaderBehaviorForTask,
    taskRoutingTokensFromAgentDefinitions,
    publicTaskRoutingProfileForKind,
    leaderSpecialistTaskForFollowupFromDefinition,
    normalizeLeaderWorkflowPlannedTasksFromDefinition,
    leaderPlannerAllowsCandidateAgentTasksFromDefinition,
    ensureLeaderWorkflowActionTasksFromDefinition,
    leaderWorkflowReplanDecisionFromDefinition,
    leaderSequentialUserActionPriorityFromDefinition,
    leaderExternalActionRequestedFromDefinition,
    workflowTaskSoftMatchTokens,
    workflowTaskCandidateTokens,
    workflowTagHintsForTask,
    normalizeTaskTypeAlias,
    leaderTaskTypeForInitialWork,
    isLargeAgentTeamIntent,
    inferTaskSequence,
    inferTaskType
  };
}
