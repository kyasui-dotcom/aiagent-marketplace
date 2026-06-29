export function createWorkflowSourceRequirementHelpers(dependencies = {}) {
  const {
    leaderTaskUsesWebSearch,
    workflowTaskName
  } = dependencies;

  function braveSearchConfiguredForWorkflow(env = {}) {
    return Boolean(String(env?.BRAVE_SEARCH_API_KEY || env?.BRAVE_API_KEY || '').trim());
  }
  
  function workflowJobRequiresSearch(job = {}) {
    const workflow = job?.input?._broker?.workflow && typeof job.input._broker.workflow === 'object'
      ? job.input._broker.workflow
      : {};
    const explicit = workflow.forceWebSearch === true || workflow.requiresWebSearch === true || workflow.searchRequired === true;
    if (!explicit) return false;
    const task = workflowTaskName(job) || workflowPrimaryTaskForJob(job);
    const primaryTask = workflowPrimaryTaskForJob(job);
    const phase = String(workflow.sequencePhase || '').trim().toLowerCase();
    return workflow.forceWebSearch === true
      || phase === 'research'
      || leaderTaskUsesWebSearch(primaryTask, task);
  }
  
  function workflowSourceCollectionContractForJob(job = {}) {
    if (!workflowJobRequiresSearch(job)) return null;
    const workflow = job?.input?._broker?.workflow && typeof job.input._broker.workflow === 'object'
      ? job.input._broker.workflow
      : {};
    const task = workflowTaskName(job) || job.taskType || 'agent';
    return {
      required: true,
      task_type: task,
      reason: workflow.webSearchRequiredReason || workflow.sourceCollectionRequiredReason || 'This workflow task requires source-backed research.',
      required_output_field: 'report.web_sources',
      instruction: 'Run search/source collection or use supplied source context before completing. Return report.web_sources as an array with url, title/snippet, provider, action, and query where available. If no source can be collected, return failed with category missing_required_search_sources instead of a completed generic delivery.'
    };
  }
  
  function workflowSourceCollectionQualityRule(job = {}) {
    const contract = workflowSourceCollectionContractForJob(job);
    if (!contract?.required) return null;
    return {
      id: 'source_collection_required',
      instruction: contract.instruction
    };
  }
  
  function workflowPrimaryTaskForJob(job = {}) {
    const workflow = job?.input?._broker?.workflow && typeof job.input._broker.workflow === 'object'
      ? job.input._broker.workflow
      : {};
    return String(workflow.primaryTask || job.taskType || '').trim().toLowerCase();
  }
  
  function workflowMetaWithoutGlobalSearchFlags(workflow = {}) {
    const clean = workflow && typeof workflow === 'object' ? { ...workflow } : {};
    delete clean.forceWebSearch;
    delete clean.requiresWebSearch;
    delete clean.searchRequired;
    delete clean.webSearchRequiredReason;
    delete clean.requiresSourceCollection;
    delete clean.sourceCollectionRequiredReason;
    return clean;
  }

  return {
    braveSearchConfiguredForWorkflow,
    workflowJobRequiresSearch,
    workflowSourceCollectionContractForJob,
    workflowSourceCollectionQualityRule,
    workflowPrimaryTaskForJob,
    workflowMetaWithoutGlobalSearchFlags
  };
}
