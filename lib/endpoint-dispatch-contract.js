function defaultClipText(value = '', max = 12000) {
  const text = String(value || '').trim();
  if (!text || text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trim()}...`;
}

export function createEndpointDispatchContractHelpers({
  downstreamHandoffSummaryContractForTask,
  downstreamHandoffSummaryInstruction,
  workflowAdditionalPromptForDispatch,
  workflowBasePrompt,
  workflowClipText = defaultClipText,
  workflowSequencePhaseForJob,
  workflowSourceCollectionContractForJob,
  workflowSourceCollectionQualityRule,
  workflowTaskName
} = {}) {
  function buildDispatchPayload(job, agent) {
    const prompt = workflowBasePrompt(job);
    const additionalPrompt = workflowAdditionalPromptForDispatch(job);
    const fullPrompt = [
      prompt,
      additionalPrompt
    ].filter(Boolean).join('\n\n').trim();
    const broker = job.input && typeof job.input === 'object' && job.input._broker && typeof job.input._broker === 'object'
      ? job.input._broker
      : {};
    const hasWorkflowContext = Boolean(broker.workflow && typeof broker.workflow === 'object');
    const dispatchInput = hasWorkflowContext
      ? compactWorkflowInputForEndpointDispatch(job)
      : (job.input || {});
    const sourceCollectionRule = workflowSourceCollectionQualityRule(job);
    const qualityRules = [
      ...(Array.isArray(broker.commonQualityRules) ? broker.commonQualityRules : []),
      ...(sourceCollectionRule ? [sourceCollectionRule] : [])
    ];
    return {
      job_id: job.id,
      task_type: job.taskType,
      workflow_task: job.workflowTask || job.taskType,
      workflowTask: job.workflowTask || job.taskType,
      dispatch_task_type: job.taskType,
      prompt,
      additional_prompt: additionalPrompt,
      additionalPrompt,
      full_prompt: fullPrompt || prompt,
      input: dispatchInput,
      quality_rules: qualityRules,
      source_collection_contract: workflowSourceCollectionContractForJob(job),
      parent_agent_id: job.parentAgentId,
      assigned_agent_id: agent.id,
      budget_cap: job.budgetCap,
      deadline_sec: job.deadlineSec,
      priority: job.priority,
      created_at: job.createdAt,
      callback_url: agent?.metadata?.brokerCallbackUrl || null,
      callback_token: job.callbackToken || null,
      return_targets: ['api']
    };
  }

  function compactWorkflowAppContextsForDispatch(appContexts = []) {
    return (Array.isArray(appContexts) ? appContexts : [])
      .filter((context) => context && typeof context === 'object')
      .slice(0, 4)
      .map((context) => ({
        id: workflowClipText(context.id, 160),
        source_app: workflowClipText(context.source_app || context.sourceApp, 120),
        source_app_label: workflowClipText(context.source_app_label || context.sourceAppLabel, 160),
        title: workflowClipText(context.title, 220),
        summary: workflowClipText(context.summary, 1200),
        facts: Array.isArray(context.facts) ? context.facts.slice(0, 20).map((item) => workflowClipText(item, 500)) : [],
        metrics: Array.isArray(context.metrics) ? context.metrics.slice(0, 12).map((item) => (
          typeof item === 'string'
            ? workflowClipText(item, 300)
            : {
                label: workflowClipText(item?.label || item?.name, 160),
                value: workflowClipText(item?.value, 240)
              }
        )) : [],
        artifacts: Array.isArray(context.artifacts) ? context.artifacts.slice(0, 6).map((artifact) => ({
          type: workflowClipText(artifact?.type || artifact?.kind || artifact?.name, 160),
          title: workflowClipText(artifact?.title || artifact?.label || '', 220),
          rows: Array.isArray(artifact?.rows) ? artifact.rows.slice(0, 20).map((row) => (
            row && typeof row === 'object'
              ? Object.fromEntries(Object.entries(row).slice(0, 12).map(([key, value]) => [key, workflowClipText(value, 500)]))
              : workflowClipText(row, 500)
          )) : []
        })) : [],
        raw_context: context.raw_context && typeof context.raw_context === 'object'
          ? Object.fromEntries(Object.entries(context.raw_context).slice(0, 12).map(([key, value]) => [key, workflowClipText(value, 500)]))
          : undefined,
        created_at: workflowClipText(context.created_at || context.createdAt, 80)
      }));
  }

  function compactWorkflowInputForEndpointDispatch(job = {}) {
    const input = job.input && typeof job.input === 'object' ? job.input : {};
    const broker = input._broker && typeof input._broker === 'object' ? input._broker : {};
    const workflow = broker.workflow && typeof broker.workflow === 'object' ? broker.workflow : {};
    const compactWorkflow = {
      ...workflow,
      objective: workflowClipText(workflow.objective, 8000),
      originalPrompt: workflowClipText(workflow.originalPrompt, 8000),
      downstreamHandoffSummaryContract: workflow.downstreamHandoffSummaryContract
        || downstreamHandoffSummaryContractForTask(
          workflow.primaryTask || job.taskType,
          workflowTaskName(job) || job.taskType,
          {
            phase: workflow.sequencePhase || workflowSequencePhaseForJob(job),
            layer: workflow.dispatchLayer
          }
        ),
      leaderHandoff: workflow.leaderHandoff && typeof workflow.leaderHandoff === 'object'
        ? {
            ...workflow.leaderHandoff,
            prompt: workflowClipText(workflow.leaderHandoff.prompt, 6000),
            additionalPrompt: workflowClipText(workflow.leaderHandoff.additionalPrompt, 6000),
            priorRuns: Array.isArray(workflow.leaderHandoff.priorRuns)
              ? workflow.leaderHandoff.priorRuns.slice(0, 6).map((run) => ({
                  ...run,
                  summary: workflowClipText(run?.summary, 1200),
                  bullets: Array.isArray(run?.bullets) ? run.bullets.slice(0, 6).map((item) => workflowClipText(item, 500)) : [],
                  files: Array.isArray(run?.files) ? run.files.slice(0, 3).map((file) => ({ ...file, content: workflowClipText(file?.content, 1800) })) : []
                }))
              : []
          }
        : workflow.leaderHandoff
    };
    const sourceCollectionContract = workflowSourceCollectionContractForJob(job);
    if (sourceCollectionContract) compactWorkflow.sourceCollectionContract = sourceCollectionContract;
    return {
      source: input.source || 'workflow',
      original_prompt: workflowClipText(input.original_prompt || input.originalPrompt || workflow.originalPrompt || job.originalPrompt || job.prompt || '', 8000),
      _broker: {
        commonQualityRules: Array.isArray(broker.commonQualityRules) ? broker.commonQualityRules.slice(0, 8) : [],
        workflow: compactWorkflow,
        appContexts: compactWorkflowAppContextsForDispatch([
          ...(Array.isArray(broker.appContexts) ? broker.appContexts : []),
          ...(Array.isArray(input.appContexts) ? input.appContexts : [])
        ]),
        connectorContexts: compactWorkflowAppContextsForDispatch([
          ...(Array.isArray(broker.connectorContexts) ? broker.connectorContexts : []),
          ...(Array.isArray(input.connectorContexts) ? input.connectorContexts : [])
        ]),
        intake: broker.intake && typeof broker.intake === 'object' ? broker.intake : undefined,
        chatux: broker.chatux && typeof broker.chatux === 'object' ? broker.chatux : undefined
      }
    };
  }

  function buildCompactWorkflowDispatchPayload(job, agent) {
    const prompt = workflowBasePrompt(job);
    const additionalPrompt = workflowClipText(workflowAdditionalPromptForDispatch(job), 12000);
    const workflow = job?.input?._broker?.workflow && typeof job.input._broker.workflow === 'object'
      ? job.input._broker.workflow
      : {};
    const downstreamHandoffSummaryContract = workflow.downstreamHandoffSummaryContract
      || downstreamHandoffSummaryContractForTask(
        workflow.primaryTask || job.taskType,
        workflowTaskName(job) || job.taskType,
        {
          phase: workflow.sequencePhase || workflowSequencePhaseForJob(job),
          layer: workflow.dispatchLayer
        }
      );
    const downstreamRule = downstreamHandoffSummaryContract.required
      ? {
          id: 'downstream_handoff_summary',
          instruction: downstreamHandoffSummaryInstruction(
            downstreamHandoffSummaryContract.primaryTask,
            downstreamHandoffSummaryContract.taskType,
            {
              phase: downstreamHandoffSummaryContract.phase,
              layer: downstreamHandoffSummaryContract.layer
            }
          )
        }
      : null;
    const sourceCollectionRule = workflowSourceCollectionQualityRule(job);
    const qualityRules = [
      ...(Array.isArray(job?.input?._broker?.commonQualityRules) ? job.input._broker.commonQualityRules.slice(0, 8) : []),
      ...(sourceCollectionRule ? [sourceCollectionRule] : []),
      ...(downstreamRule ? [downstreamRule] : [])
    ];
    return {
      job_id: job.id,
      task_type: job.taskType,
      prompt,
      additional_prompt: additionalPrompt,
      additionalPrompt,
      full_prompt: [prompt, additionalPrompt].filter(Boolean).join('\n\n').trim() || prompt,
      input: compactWorkflowInputForEndpointDispatch(job),
      quality_rules: qualityRules,
      downstream_handoff_summary_contract: downstreamHandoffSummaryContract,
      source_collection_contract: workflowSourceCollectionContractForJob(job),
      parent_agent_id: job.parentAgentId,
      assigned_agent_id: agent.id,
      budget_cap: job.budgetCap,
      deadline_sec: job.deadlineSec,
      priority: job.priority,
      created_at: job.createdAt,
      callback_url: agent?.metadata?.brokerCallbackUrl || null,
      callback_token: job.callbackToken || null,
      return_targets: ['api']
    };
  }

  function buildDispatchHeaders(agent) {
    const manifestAuth = agent?.metadata?.manifest?.auth;
    if (!manifestAuth || typeof manifestAuth !== 'object') return {};
    const type = String(manifestAuth.type || 'none').trim().toLowerCase();
    const token = String(manifestAuth.token || '').trim();
    if (!token || type === 'none') return {};
    if (type === 'bearer') {
      const prefix = String(manifestAuth.prefix || 'Bearer').trim() || 'Bearer';
      return { authorization: `${prefix} ${token}` };
    }
    if (type === 'header') {
      const headerName = String(manifestAuth.headerName || manifestAuth.header_name || '').trim();
      if (!headerName) return {};
      const prefix = String(manifestAuth.prefix || '').trim();
      return { [headerName]: prefix ? `${prefix} ${token}` : token };
    }
    return {};
  }

  return {
    buildCompactWorkflowDispatchPayload,
    buildDispatchHeaders,
    buildDispatchPayload,
    compactWorkflowAppContextsForDispatch,
    compactWorkflowInputForEndpointDispatch
  };
}
