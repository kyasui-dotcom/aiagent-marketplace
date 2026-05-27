export function createWorkflowJobProfileHelpers({
  leaderUsesSaasPublishHandoff
} = {}) {
  function workflowBrokerForJob(job = {}) {
    return job?.input?._broker && typeof job.input._broker === 'object' ? job.input._broker : {};
  }

  function workflowBrokerWorkflowForJobOrEmpty(job = {}) {
    const broker = workflowBrokerForJob(job);
    return broker.workflow && typeof broker.workflow === 'object' ? broker.workflow : {};
  }

  function workflowPrimaryTaskFromJobOrProfile(job = {}, parent = null) {
    const workflow = workflowBrokerWorkflowForJobOrEmpty(job);
    const plannedTasks = Array.isArray(job?.workflow?.plannedTasks) ? job.workflow.plannedTasks : [];
    const parentPlannedTasks = Array.isArray(parent?.workflow?.plannedTasks) ? parent.workflow.plannedTasks : [];
    return String(
      workflow.primaryTask
        || workflow.primary_task
        || parentPlannedTasks[0]
        || plannedTasks[0]
        || job.workflowTask
        || job.taskType
        || parent?.taskType
        || ''
    ).trim().toLowerCase();
  }

  function workflowUsesSaasPublishHandoff(job = {}, parent = null) {
    const workflow = workflowBrokerWorkflowForJobOrEmpty(job);
    const parentWorkflow = parent?.workflow && typeof parent.workflow === 'object' ? parent.workflow : {};
    const profileMode = String(
      workflow.externalActionMode
        || workflow.external_action_mode
        || parentWorkflow.externalActionMode
        || parentWorkflow.external_action_mode
        || ''
    ).trim().toLowerCase();
    const publishSurface = String(
      workflow.publishSurface
        || workflow.publish_surface
        || parentWorkflow.publishSurface
        || parentWorkflow.publish_surface
        || ''
    ).trim().toLowerCase();
    const publishApprovalSurface = String(
      workflow.publishApprovalSurface
        || workflow.publish_approval_surface
        || parentWorkflow.publishApprovalSurface
        || parentWorkflow.publish_approval_surface
        || ''
    ).trim().toLowerCase();
    const primary = workflowPrimaryTaskFromJobOrProfile(job, parent);
    return Boolean(
      profileMode === 'saas_handoff_only'
      || publishSurface === 'saas'
      || publishApprovalSurface === 'saas'
      || leaderUsesSaasPublishHandoff?.(primary)
    );
  }

  function workflowTaskName(job = {}) {
    return String(job.workflowTask || job.taskType || '').trim().toLowerCase();
  }

  function isWorkflowLeaderTask(taskType = '') {
    const task = String(taskType || '').trim().toLowerCase();
    return Boolean(task && task.endsWith('_leader'));
  }

  function workflowSequencePhaseForJob(job = {}) {
    return String(job?.input?._broker?.workflow?.sequencePhase || '').trim().toLowerCase();
  }

  function workflowBrokerWorkflowForJob(job = {}, options = {}) {
    if (!job || typeof job !== 'object') return null;
    if (!job.input || typeof job.input !== 'object' || Array.isArray(job.input)) {
      if (!options.mutable) return null;
      job.input = {};
    }
    if (!job.input._broker || typeof job.input._broker !== 'object' || Array.isArray(job.input._broker)) {
      if (!options.mutable) return null;
      job.input._broker = {};
    }
    if (!job.input._broker.workflow || typeof job.input._broker.workflow !== 'object' || Array.isArray(job.input._broker.workflow)) {
      if (!options.mutable) return null;
      job.input._broker.workflow = {};
    }
    return job.input._broker.workflow;
  }

  return {
    isWorkflowLeaderTask,
    workflowBrokerForJob,
    workflowBrokerWorkflowForJob,
    workflowBrokerWorkflowForJobOrEmpty,
    workflowPrimaryTaskFromJobOrProfile,
    workflowSequencePhaseForJob,
    workflowTaskName,
    workflowUsesSaasPublishHandoff
  };
}
