export function createWorkflowPriorRunHelpers(dependencies = {}) {
  const {
    WORKFLOW_HANDOFF_CONTEXT_START,
    isWorkflowLeaderTask,
    sortWorkflowChildren,
    workflowChildIsLeaderReplanDeferred,
    workflowDispatchLayer,
    workflowFlattenTextParts,
    workflowHandoffOriginalSignals,
    workflowOutputText,
    workflowResearchHandoffFromReport,
    workflowSearchSourcesFromReport,
    workflowSequencePhaseForJob,
    workflowSourceSignalStrings,
    workflowStoredAdditionalPrompt,
    workflowStructuredHandoffDigestFromRun,
    workflowTaskName
  } = dependencies;

  function workflowCompletedRunHandoff(parent = {}, child = {}) {
    const output = child.output && typeof child.output === 'object' ? child.output : {};
    const report = output.report && typeof output.report === 'object' ? output.report : {};
    const files = Array.isArray(output.files)
      ? output.files
        .map((item) => ({
          name: String(item?.name || '').slice(0, 160),
          content: String(item?.content || '').slice(0, 8000)
        }))
        .filter((item) => item.name || item.content)
        .slice(0, 2)
      : [];
    const webSources = workflowSearchSourcesFromReport(report);
    const structuredResearchHandoff = workflowResearchHandoffFromReport(report);
    const deliverableMarkdown = files
      .map((file) => [`# ${file.name || 'delivery.md'}`, file.content].filter(Boolean).join('\n'))
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 18000);
    const handoffRun = {
      jobId: child.id || null,
      taskType: workflowTaskName(child),
      agentId: child.assignedAgentId || null,
      agentName: child.workflowAgentName || null,
      sequencePhase: workflowSequencePhaseForJob(child) || null,
      layer: workflowDispatchLayer(parent, child),
      completedAt: child.completedAt || null,
      summary: String(output.summary || report.summary || '').slice(0, 1600),
      bullets: Array.isArray(report.bullets)
        ? report.bullets.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 6)
        : [],
      nextAction: String(report.nextAction || report.next_action || '').slice(0, 1000),
      webSources,
      sourceBundle: {
        webSources,
        sourceSignals: workflowSourceSignalStrings(webSources),
        sourceCount: webSources.length
      },
      structuredResearchHandoff,
      qualityGate: child.qualityGate || null,
      files,
      deliverableMarkdown,
      requiredUsageSignals: workflowHandoffOriginalSignals([{ summary: output.summary || report.summary || '', bullets: report.bullets || [], webSources, files }]),
      promptContextAttached: Boolean(
        workflowStoredAdditionalPrompt(child)
        || String(child.prompt || '').includes(WORKFLOW_HANDOFF_CONTEXT_START)
      )
    };
    handoffRun.structuredDigest = workflowStructuredHandoffDigestFromRun(handoffRun);
    return handoffRun;
  }
  
  function workflowPriorCompletedRuns(parent = {}, children = [], targetLayer = 1) {
    return sortWorkflowChildren(parent, children)
      .filter((child) => child.status === 'completed')
      .filter((child) => !isWorkflowLeaderTask(workflowTaskName(child)))
      .filter((child) => !workflowChildIsLeaderReplanDeferred(child))
      .filter((child) => !workflowOptionalUnavailablePriorRun(parent, child, targetLayer))
      .filter((child) => workflowDispatchLayer(parent, child) < targetLayer)
      .map((child) => workflowCompletedRunHandoff(parent, child))
      .slice(0, 10);
  }
  
  function workflowDataUnavailableOutput(child = {}) {
    if (workflowTaskName(child) !== 'data_analysis') return false;
    const output = child.output && typeof child.output === 'object' ? child.output : {};
    const runtime = output.runtime && typeof output.runtime === 'object' ? output.runtime : {};
    const report = output.report && typeof output.report === 'object' ? output.report : {};
    const text = workflowOutputText(child);
    return String(runtime.workflow || '').trim().toLowerCase() === 'workflow_data_unavailable_packet'
      || String(runtime.mode || '').trim().toLowerCase() === 'data_unavailable_packet'
      || /data layer skipped|no analytics\/data context|no ga4|分析コンテキストが未接続|データ層をスキップ/i.test([
        output.summary,
        report.summary,
        report.nextAction,
        text
      ].filter(Boolean).join(' '));
  }
  
  function workflowUnavailablePriorRunIsOptional(run = {}) {
    const reason = String(run.reason || run.unavailableReason || run.status || '').trim().toLowerCase();
    return run.optional === true
      || reason === 'no_analytics_context'
      || reason === 'data_unavailable'
      || reason === 'data_timeout_no_analytics_context'
      || reason === 'skipped_no_data_context';
  }
  
  function workflowJobHasAttachedDataContext(job = {}) {
    const broker = job?.input?._broker && typeof job.input._broker === 'object' ? job.input._broker : {};
    const contexts = [
      ...(Array.isArray(broker.appContexts) ? broker.appContexts : []),
      ...(Array.isArray(broker.connectorContexts) ? broker.connectorContexts : [])
    ].filter((context) => context && typeof context === 'object');
    if (!contexts.length) return false;
    return contexts.some((context) => {
      if (Array.isArray(context.metrics) && context.metrics.length) return true;
      const raw = context.raw_context && typeof context.raw_context === 'object'
        ? context.raw_context
        : (context.rawContext && typeof context.rawContext === 'object' ? context.rawContext : {});
      const text = workflowFlattenTextParts([
        context.source_app,
        context.sourceApp,
        context.title,
        context.summary,
        raw.connector_provider,
        raw.provider,
        raw.connector_type,
        raw.connectorType,
        raw.connector_services,
        raw.connectorServices,
        raw.googleGa4Property,
        raw.googleSearchConsoleSite,
        raw.googleReportSources,
        raw.googleReportLoaded
      ]).join(' ').toLowerCase();
      return /(analytics|google analytics|ga4|search console|\bgsc\b|conversion|funnel|cohort|acquisition|traffic|query|event|billing|orders?|stripe|dataset|spreadsheet|sheet|csv|metric)/i.test(text);
    });
  }
  
  function workflowOptionalUnavailablePriorRun(parent = {}, child = {}, targetLayer = 1) {
    if (!child || isWorkflowLeaderTask(workflowTaskName(child))) return null;
    const taskType = workflowTaskName(child);
    const status = String(child.status || '').trim().toLowerCase();
    const layer = workflowDispatchLayer(parent, child);
    if (layer >= Math.max(1, Number(targetLayer || 1) || 1)) return null;
    const completedDataUnavailable = status === 'completed' && workflowDataUnavailableOutput(child);
    const timedOutDataWithoutContext = taskType === 'data_analysis'
      && ['failed', 'timed_out'].includes(status)
      && !workflowJobHasAttachedDataContext(child);
    if (!completedDataUnavailable && !timedOutDataWithoutContext) return null;
    const output = child.output && typeof child.output === 'object' ? child.output : {};
    const report = output.report && typeof output.report === 'object' ? output.report : {};
    const reason = timedOutDataWithoutContext ? 'data_timeout_no_analytics_context' : 'no_analytics_context';
    return {
      jobId: child.id || null,
      taskType,
      agentId: child.assignedAgentId || null,
      agentName: child.workflowAgentName || null,
      sequencePhase: workflowSequencePhaseForJob(child) || null,
      layer,
      status: 'skipped',
      optional: true,
      reason,
      summary: String(output.summary || report.summary || child.failureReason || 'Data context was not attached; data layer skipped.').slice(0, 1000),
      nextAction: String(report.nextAction || report.next_action || '').slice(0, 1000),
      completedAt: child.completedAt || null,
      failedAt: child.failedAt || child.timedOutAt || null
    };
  }
  
  function workflowPriorUnavailableRuns(parent = {}, children = [], targetLayer = 1) {
    return sortWorkflowChildren(parent, children)
      .map((child) => workflowOptionalUnavailablePriorRun(parent, child, targetLayer))
      .filter(Boolean)
      .slice(0, 6);
  }
  
  function workflowLeaderPriorLayerUnavailable(parent = {}, leaderJob = {}) {
    if (workflowLeaderPriorLayerOptionalOnly(parent, leaderJob)) return false;
    const phase = workflowSequencePhaseForJob(leaderJob);
    if (phase !== 'checkpoint') return false;
    const workflow = leaderJob?.input?._broker?.workflow && typeof leaderJob.input._broker.workflow === 'object'
      ? leaderJob.input._broker.workflow
      : {};
    const checkpointLayer = Math.max(1, Number(workflow.checkpointLayer || workflow.afterLayer || 1) || 1);
    const childRuns = Array.isArray(parent?.workflow?.childRuns) ? parent.workflow.childRuns : [];
    const priorLayerRuns = childRuns
      .filter((child) => !isWorkflowLeaderTask(workflowTaskName(child)))
      .filter((child) => workflowDispatchLayer(parent, child) <= checkpointLayer);
    if (!priorLayerRuns.length) return false;
    const completedPrior = priorLayerRuns.some((child) => String(child.status || '').trim().toLowerCase() === 'completed');
    if (completedPrior) return false;
    return true;
  }
  
  function workflowLeaderPriorLayerOptionalOnly(parent = {}, leaderJob = {}) {
    const phase = workflowSequencePhaseForJob(leaderJob);
    if (phase !== 'checkpoint') return false;
    const workflow = leaderJob?.input?._broker?.workflow && typeof leaderJob.input._broker.workflow === 'object'
      ? leaderJob.input._broker.workflow
      : {};
    const checkpointLayer = Math.max(1, Number(workflow.checkpointLayer || workflow.afterLayer || 1) || 1);
    const childRuns = Array.isArray(parent?.workflow?.childRuns) ? parent.workflow.childRuns : [];
    const priorLayerRuns = childRuns
      .filter((child) => !isWorkflowLeaderTask(workflowTaskName(child)))
      .filter((child) => workflowDispatchLayer(parent, child) <= checkpointLayer);
    if (!priorLayerRuns.length) return false;
    if (priorLayerRuns.some((child) => String(child.status || '').trim().toLowerCase() === 'completed')) return false;
    const optionalUnavailablePrior = priorLayerRuns
      .map((child) => workflowOptionalUnavailablePriorRun(parent, child, checkpointLayer + 1))
      .filter(Boolean);
    return optionalUnavailablePrior.length > 0 && optionalUnavailablePrior.length === priorLayerRuns.length;
  }

  return {
    workflowCompletedRunHandoff,
    workflowPriorCompletedRuns,
    workflowDataUnavailableOutput,
    workflowUnavailablePriorRunIsOptional,
    workflowJobHasAttachedDataContext,
    workflowOptionalUnavailablePriorRun,
    workflowPriorUnavailableRuns,
    workflowLeaderPriorLayerUnavailable,
    workflowLeaderPriorLayerOptionalOnly
  };
}
