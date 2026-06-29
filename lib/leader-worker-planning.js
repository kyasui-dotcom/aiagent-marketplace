export function createLeaderWorkerPlanningHelpers({
  ensureLeaderWorkflowActionTasksFromDefinition,
  isWorkflowLeaderTask,
  leaderActionLayerInternalTasks,
  leaderActionLayerStart,
  leaderControlContractForTask,
  leaderSourceCollectionLayerTasks,
  leaderTaskLayer,
  leaderTaskRequiresSourceCollection,
  normalizeLeaderWorkflowPlannedTasksFromDefinition,
  normalizeTaskTypes
} = {}) {
  function workflowHumanActionIntentText(value = '') {
    return String(value || '')
      .split(/\n+/)
      .map((line) => line.trim())
      .filter((line) => line)
      .filter((line) => !/^(Task|Conversation lead|Work split|Inputs|Constraints|Deliver|Output language|Acceptance|Attached connector context|Use this attached connector data|Use these clarification details|State any remaining assumptions|Recommended next actions):/i.test(line))
      .join('\n');
  }

  function filterLeaderWorkflowPlannedTasks(primaryTask = '', plannedTasks = []) {
    const primary = String(primaryTask || '').trim().toLowerCase();
    if (!primary || !isWorkflowLeaderTask(primary)) return normalizeTaskTypes(plannedTasks);
    const allowed = new Set([
      primary,
      'summary',
      ...normalizeTaskTypes(leaderControlContractForTask(primary)?.downstreamTaskTypes || [])
    ]);
    return normalizeTaskTypes(plannedTasks).filter((task) => allowed.has(task));
  }

  function normalizeLeaderWorkflowPlannedTasks(primaryTask = '', plannedTasks = [], prompt = '', options = {}) {
    const tasks = normalizeTaskTypes(plannedTasks);
    const primary = normalizeTaskTypes([primaryTask])[0] || tasks[0] || '';
    if (!isWorkflowLeaderTask(primary)) return tasks;
    const leaderDefinedTasks = normalizeLeaderWorkflowPlannedTasksFromDefinition(tasks, primary, prompt, options, {
      normalizeTaskTypes
    });
    return leaderDefinedTasks
      ? filterLeaderWorkflowPlannedTasks(primary, leaderDefinedTasks)
      : tasks;
  }

  function ensureLeaderWorkflowActionTasks(plannedTasks = [], primaryTask = '', prompt = '', options = {}) {
    const tasks = normalizeLeaderWorkflowPlannedTasks(primaryTask, plannedTasks, prompt, options);
    const primary = String(tasks[0] || primaryTask || '').trim().toLowerCase();
    if (!isWorkflowLeaderTask(primary)) return tasks;
    const text = workflowHumanActionIntentText(prompt).toLowerCase();
    const leaderDefinedTasks = ensureLeaderWorkflowActionTasksFromDefinition(tasks, primary, text, options, {
      normalizeTaskTypes,
      leaderTaskLayer,
      leaderActionLayerStart,
      leaderSourceCollectionLayerTasks,
      leaderTaskRequiresSourceCollection
    });
    if (leaderDefinedTasks) return leaderDefinedTasks;
    const summaryTasks = new Set(['summary']);
    const dataCollectionTasks = new Set(['data_analysis']);
    const ordered = [];
    const push = (task) => {
      const safe = String(task || '').trim().toLowerCase();
      if (!safe || summaryTasks.has(safe) || ordered.includes(safe)) return;
      ordered.push(safe);
    };
    const sortLeaderWorkflowTasks = (items, max = items.length) => [...items].sort((left, right) => {
      const leftLayer = leaderTaskLayer(primary, left) ?? 99;
      const rightLayer = leaderTaskLayer(primary, right) ?? 99;
      if (leftLayer !== rightLayer) return leftLayer - rightLayer;
      return ordered.indexOf(left) - ordered.indexOf(right);
    }).slice(0, max);
    const sourceCollectionTasks = leaderSourceCollectionLayerTasks(primary);
    const preferredSourceTask = sourceCollectionTasks.find((task) => ['research', 'data_analysis', 'validation', 'teardown', 'diligence', 'debug'].includes(task))
      || sourceCollectionTasks[0]
      || 'research';
    push(primary);
    for (const task of tasks) {
      push(task);
    }
    if (sourceCollectionTasks.length && !ordered.some((task) => leaderTaskRequiresSourceCollection(primary, task))) {
      push(preferredSourceTask);
    }
    const selected = [];
    const pushSelected = (task) => {
      const safe = String(task || '').trim().toLowerCase();
      if (!safe || summaryTasks.has(safe) || selected.includes(safe)) return;
      selected.push(safe);
    };
    pushSelected(primary);
    const layerLimits = new Map([
      [2, 1],
      [3, 1]
    ]);
    const layerCounts = new Map();
    const sourceBucketCounts = new Map();
    const sourceBucketForTask = (task) => dataCollectionTasks.has(String(task || '').trim().toLowerCase()) ? 'data' : 'research';
    const internalActionTasks = new Set(leaderActionLayerInternalTasks(primary));
    const pushLayerTask = (task, options = {}) => {
      const safe = String(task || '').trim().toLowerCase();
      if (!safe || safe === primary || summaryTasks.has(safe) || selected.includes(safe)) return;
      const layer = leaderTaskLayer(primary, safe) || 1;
      if (layer >= leaderActionLayerStart(primary)) {
        const internalLeaderAction = internalActionTasks.has(safe);
        if (options.force || internalLeaderAction) pushSelected(safe);
        return;
      }
      if (layer === 1 && leaderTaskRequiresSourceCollection(primary, safe)) {
        const bucket = sourceBucketForTask(safe);
        const currentBucket = Number(sourceBucketCounts.get(bucket) || 0);
        const bucketLimit = 1;
        if (!options.force && currentBucket >= bucketLimit) return;
        pushSelected(safe);
        sourceBucketCounts.set(bucket, currentBucket + 1);
        layerCounts.set(layer, Number(layerCounts.get(layer) || 0) + 1);
        return;
      }
      const limit = layerLimits.has(layer) ? layerLimits.get(layer) : 1;
      const current = Number(layerCounts.get(layer) || 0);
      if (!options.force && current >= limit) return;
      pushSelected(safe);
      layerCounts.set(layer, current + 1);
    };
    const fillLayer = (layer, preferredTasks = []) => {
      for (const task of preferredTasks) {
        if (layer !== 1 && Number(layerCounts.get(layer) || 0) >= Number(layerLimits.get(layer) || 1)) break;
        if (ordered.includes(task) && leaderTaskLayer(primary, task) === layer) pushLayerTask(task);
      }
      for (const task of ordered) {
        if (layer !== 1 && Number(layerCounts.get(layer) || 0) >= Number(layerLimits.get(layer) || 1)) break;
        if (leaderTaskLayer(primary, task) === layer) pushLayerTask(task);
      }
    };
    fillLayer(1, ['data_analysis', 'teardown', 'research', 'validation']);
    fillLayer(2, []);
    fillLayer(3, []);
    for (const task of ordered) {
      const layer = leaderTaskLayer(primary, task) || 1;
      if (layer >= leaderActionLayerStart(primary)) continue;
      if (!selected.includes(task)) {
        pushLayerTask(task);
      }
    }
    return sortLeaderWorkflowTasks(selected);
  }

  return {
    ensureLeaderWorkflowActionTasks,
    filterLeaderWorkflowPlannedTasks,
    normalizeLeaderWorkflowPlannedTasks,
    workflowHumanActionIntentText
  };
}
