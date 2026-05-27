export function createOrderCreateHandlers(deps = {}) {
  const {
    _broker,
    access,
    account,
    accountId,
    accountIdForLogin,
    accounts,
    accountSettingsForLogin,
    actionHandoffOnly,
    actionHandoffPreflight,
    actionHandoffReason,
    actionProtocolVersion,
    actionSaasHandoffTask,
    actionStartLayer,
    activations,
    actualBilling,
    adaptive_layer,
    adaptive_pending,
    adaptiveCandidateRunCount,
    adaptiveCandidateAssignments,
    adaptiveExecution,
    adaptiveHoldReason,
    adaptiveInitialLayer,
    adaptiveLayer,
    adaptivePending,
    adaptivePendingLayer,
    adaptivePlan,
    adaptiveWorkflowEnabled,
    afterLayer,
    agent_id,
    agent_manifest_catalog,
    agent_name,
    agentChildJobs,
    agentId,
    agentName,
    agentPreflight,
    agents,
    agentStatusCounts,
    api_cost,
    apiKeyMode,
    appContexts,
    applyActiveConversationOwnerLockToOrderBody,
    apps,
    appSettings,
    artifact,
    assignedAgentId,
    async_dispatch,
    asyncDispatch,
    at,
    authority_request,
    authorityBlockedDraft,
    authorityBlockedForDraft,
    authorityBlockReasonFromRequest,
    authorityExecutorPatch,
    authorityRequestForBlockedDraft,
    authorityStatus,
    autoTopupAdded,
    awaitDispatch,
    batchCount,
    batchSize,
    beforeLayer,
    billing_profile,
    billingDraft,
    billingEstimate,
    billingApiKeyModeForRequester,
    billingPeriodId,
    billingMode,
    billingModeForRequester,
    billingReservation,
    blocked,
    blockedCompletionStatus,
    blockedLog,
    body,
    broker,
    brokerBase,
    budgetCap,
    buildAgentTeamDeliveryOutput,
    buildFollowupConversationContext,
    buildIntakeClarificationWithAi,
    buildReusedWorkflowChildJobDraft,
    buildWorkflowChildJobDraft,
    buildWorkflowEstimate,
    buildWorkflowParentJob,
    bullets,
    callbackToken,
    callbackTokenForJob,
    candidate_agents,
    candidateAgents,
    channel_candidates,
    chargeableAssignments,
    chatSessionId,
    chatTranscripts,
    checkedAt,
    checkpoint,
    checkpoint_layer,
    checkpointAt,
    checkpointJobId,
    checkpointLabel,
    checkpointLayer,
    checkpointRecords,
    checkpoints,
    checkpointSpec,
    child,
    child_runs,
    childBody,
    childBrokerBase,
    childExecutionPrompt,
    childInputBase,
    childInputRaw,
    childInputSourceBase,
    childIsActionPhase,
    childJobIds,
    childJobs,
    childLayer,
    childOptions,
    childPreflight,
    childPromptOptimization,
    childPromptOptimizationMeta,
    childRuns,
    childSequencePhase,
    childTaskType,
    childWorkflowBase,
    client_order_id,
    clientOrderId,
    clientOrderIdFromCreateBody,
    clientOrderJob,
    clientOrderMatches,
    code,
    compactRetryReuseArtifactsForJobStorage,
    completed,
    completedAt,
    completionStatus,
    confidence,
    connectorStatus,
    contactCaptureMode,
    content,
    content_type,
    conversation,
    cost_basis,
    createdAt,
    createdChildJobIds,
    createdMs,
    createJobResponseFromPersistedJob,
    ctx,
    current,
    currentOrderRequesterContext,
    deadlineSec,
    diagnostic,
    dispatch,
    dispatch_status,
    dispatch_task_type,
    dispatchExistingJobToAssignedAgent,
    dispatchLayer,
    dispatchPromise,
    dispatchTaskType,
    downstreamHandoffSummaryContract,
    downstreamHandoffSummaryContractForTask,
    draft,
    durationMaxSec,
    durationMinSec,
    effectiveRequestedStrategy,
    emailDeliveries,
    enabled,
    enableLeaderSequence,
    env,
    error,
    estimateBilling,
    estimateRunWindow,
    estimated_cost,
    estimatedBilling,
    estimatedTotal,
    estimatedUsage,
    estimateMax,
    estimateMin,
    estimateWindow,
    events,
    exactMatchActions,
    executionPrompt,
    executorState,
    executorStatePatchFromAuthorityRequest,
    existingClientOrder,
    expand,
    externalActionMode,
    failed,
    failedAgentRuns,
    failedAt,
    failedByPreflight,
    failedJob,
    failure_reason,
    failureCategory,
    failureReason,
    fallbackPlan,
    feedbackReports,
    fileName,
    files,
    final,
    finalParent,
    finalSummary,
    finalSummaryAt,
    finalSummaryCreatedAt,
    finalSummaryJobId,
    finalSummaryStatus,
    firstFailure,
    followup_to_job_id,
    followupConversation,
    followupJob,
    followupJobId,
    forceWebSearch,
    freshState,
    funding,
    fundingPreflight,
    fundingPreflightState,
    grantedConnectorCapabilities,
    guestLimitExceeded,
    guestPrepared,
    handoffOnly,
    id,
    idempotent,
    index,
    inferred_task_type,
    inferTaskType,
    inAppPaymentsRemoved = () => false,
    initialLayer,
    initialPhase,
    initialState,
    initialStatus,
    input,
    input_tokens,
    inputBase,
    inputSourceBase,
    intakeClarification,
    internalCheckpointRunCount,
    internalChildJobs,
    internalStatusCounts,
    isManagedSampleAgent,
    isWorkflowLeaderTask,
    item,
    job,
    job_id,
    job_ids,
    jobId,
    jobKind,
    jobPromptMatchesCreateBody,
    jobRequesterMatchesCurrent,
    jobs,
    jobSessionMatchesCreateBody,
    json,
    kind,
    label,
    latestParent,
    layer,
    leaderActionLayerStart,
    leaderActionProtocol,
    leaderControlContract,
    leaderPlannerCandidateAgents,
    leaderPlannerManifestCatalog,
    leaderPlanning,
    leaderAssignment,
    leaderSequence,
    leaderTaskRequiresSourceCollection,
    leaderTaskUsesWebSearch,
    left,
    lightweight,
    limit,
    listCreatorEstimate,
    listCreatorUsageEstimateForOrder,
    login,
    logs,
    matched_agent_id,
    matched_agent_ids,
    max,
    maxAgeMs,
    maxTargets,
    maybeRefineWorkflowPlanWithLeaderLlm,
    mergeProtectedPromptSourceIntoInput,
    message,
    meta,
    missing_amount,
    missing_connector_capabilities,
    missing_connectors,
    missingConnectorCapabilities,
    missingConnectors,
    mode,
    name,
    needsLeaderSequenceProgress,
    nextAccount,
    nextAction,
    nextRetryAt,
    normalizeAuthorityRequest,
    normalizeOrderStrategy,
    normalizeTaskTypes,
    nowIso,
    nowMs,
    objective,
    optimizationLog,
    optimizeOrderPromptForBroker,
    options,
    orderBodyWithCommonQualityRules,
    orderBodyWithLeaderFollowupSpecialistRouting,
    orderCreateBodyIsSameContentNewOrderRetry,
    orderCreateSkipIntake,
    orderCreateSkipPrePersistencePlanning,
    orderPreflightForAgent,
    orderStrategy,
    orderStrategyWithFollowupContext,
    originalPlannedTasks,
    originalPrompt,
    originalReadyAgentCount,
    output,
    output_language,
    output_tokens,
    overageMode,
    owner_label,
    parentAgentId,
    parentBroker,
    parentDraft,
    parentInput,
    parentJob,
    parentJobId,
    parentWorkflow,
    parseBody,
    pendingChildJobIds,
    pendingLayers,
    pendingTasks,
    period,
    persistedJobForClientOrderId,
    phase,
    assignAgentForTask,
    picked,
    plan,
    planned,
    planned_task_types,
    plannedAgentRunCount,
    plannedCandidateAgentRunCount,
    plannedChildRunCount,
    plannedTasks,
    planner_error,
    planWorkflowAssignments,
    predicate,
    preferWorkflow,
    preflight,
    prepareGuestTrialOrderContext,
    preservePlannedTasks,
    primaryTask,
    priority,
    promise,
    prompt,
    promptInjection,
    promptInjectionGuardForPrompt,
    promptMatches,
    promptOptimization,
    promptOptimizationMeta,
    promptPolicyBlockPayload,
    publishApprovalSurface,
    publishSurface,
    queued,
    ready_agent_count,
    reason,
    reconcileWorkflowParent,
    recordOrderApiKeyUsage,
    recovered,
    recoveredJob,
    recoveredJobId,
    recovery,
    recurring,
    recurringOrders,
    refreshParentWorkflowSnapshot,
    report,
    request,
    requested_agent_id,
    requestedAgentId,
    requestedClientOrderId,
    requestedCount,
    requestedFollowupJobIdFromCreateBody,
    requestedLeaderSingle,
    requestedParent,
    requestedSessionId,
    requestedStrategy,
    requestedTaskForRouting,
    requestedWorkflowParent,
    requester,
    requesterContextFromUser,
    requesterLogin,
    required_before_layer,
    required_channel_selection,
    required_google_sources,
    requiredBeforeLayer,
    requiredConnectorCapabilities,
    requiredConnectors,
    requireOrderWriteAccess,
    requiresResearchSearch,
    requiresSourceCollection,
    requiresUserApprovalBeforeAction,
    reserveAndInsert,
    reserveBillingEstimateInState,
    reservedCredits,
    reservedDeposit,
    resolveAgentJobEndpoint,
    resolved,
    resolveOrderStrategy,
    resolveWorkflowAssignmentFromAgentList,
    result,
    retry_safe,
    retryable,
    returnTargets,
    reuseArtifact,
    reuseArtifactsByTask,
    reused_agent_delivery,
    reused_artifact,
    reusedArtifact,
    reusedArtifacts,
    right,
    riskLevel,
    routing_planned_task_types,
    routing_reason,
    rule,
    run,
    running,
    safeLogin,
    safeTask,
    sameContentRetryAsNewOrder,
    scheduled,
    scheduleInitialWorkflowDispatchFromChildren,
    scheduleProgressDispatchesForJobId,
    score,
    selectedAgentId,
    selectedAgentIdFromOrderBody,
    selectedAgentTaskType,
    selectedAgentTaskTypeFromOrderBody,
    selectedAt,
    selectedReuseArtifactMetas,
    selectedReuseArtifacts,
    assignment,
    selection_mode,
    assignmentMode,
    sequence_phase,
    sequencePhase,
    session_id,
    sessionMatches,
    shouldInjectQaOrderCreateFault,
    skipIntake,
    source,
    source_agent_name,
    source_order_id,
    source_run_id,
    source_task_type,
    sourceCollectionRequiredReason,
    sourceLeaderTask,
    sourceOrderId,
    sourceRunId,
    startedAt,
    state,
    status,
    statusCode,
    statusCounts,
    storage,
    stripe_auto_topup,
    stripeFunding,
    summary,
    suppliedPlan,
    suppliedAssignments,
    tagHints,
    tagHintsByTask,
    task,
    task_type,
    taskRequiresConnectorApproval,
    taskType,
    timedOutAt,
    total,
    total_cost_basis,
    total_tokens,
    totalMax,
    totalMin,
    touchEvent,
    touchUsage,
    type,
    updatedAt,
    usage,
    user_selected_reuse,
    userSelected,
    version,
    visibleAgentChildJobs,
    waitUntil,
    warning,
    webSearchRequiredReason,
    WORKFLOW_PROGRESS_DISPATCH_MAX_TARGETS,
    workflow,
    workflow_job_id,
    workflow_parent_id,
    workflow_tag_hints,
    workflow_task,
    workflowAgentName,
    workflowAgentRunChildren,
    workflowBase,
    workflowBaseForSharedMeta,
    workflowCheckpointSpecs,
    workflowChildIsAdaptivePending,
    workflowChildIsInternalLeaderSequenceRun,
    workflowDiff,
    workflowDispatchLayer,
    workflowEstimate,
    workflowInputForTask,
    workflowJobId,
    workflowLayer,
    workflowLayerNumbers,
    workflowLeaderActionProtocol,
    workflowLeaderProtocol,
    workflowLeaderSequenceNeedsProgress,
    workflowLayerLabel,
    workflowLayerRequiresUserApprovalBeforeRelease,
    workflowMetaWithoutGlobalSearchFlags,
    workflowObjective,
    workflowParentId,
    workflowPlan,
    workflowPlanHasLayer,
    workflowPrimary,
    workflowPseudoParent,
    workflowReuseArtifactsByTaskFromOrderBody,
    workflowReuseArtifactStorageMeta,
    workflowSequencePhaseForJob,
    workflowSequencePhaseForTask,
    workflowSharedMeta,
    workflowShouldEnableLeaderSequence,
    workflowStorageInputBase,
    workflowStatusCounts,
    workflowTagHints,
    workflowTagHintsForTask,
    workflowTask,
    workflowVisibleAgentRunChildren
  } = deps;

  async function performSingleJobCreate(storage, env, current, body, options = {}) {
    body = orderBodyWithCommonQualityRules(body);
    const touchUsage = options.touchUsage || (async () => {});
    const request = options.request;
    const skipIntake = options.skipIntake === true || orderCreateSkipIntake(body);
    const requester = requesterContextFromUser(current.user, current.authProvider, {
      login: current.login,
      accountId: accountIdForLogin(current.login)
    });
    const taskType = normalizeTaskTypes([body.task_type])[0] || inferTaskType(body.task_type, body.prompt);
    const state = options.initialState || await loadSingleOrderCreateState(storage, current, body);
    const account = current?.login ? accountSettingsForLogin(state, current.login, current.user, current.authProvider) : null;
    const billingMode = billingModeForRequester(current, account, env);
    const paymentsRemoved = inAppPaymentsRemoved(env);
    if (!skipIntake) {
      const intakeClarification = await buildIntakeClarificationWithAi(body, { taskType }, env);
      if (intakeClarification) {
        await touchUsage();
        return intakeClarification;
      }
    }
    const followupConversation = buildFollowupConversationContext(state, body, { login: current?.login || '' });
    if (followupConversation?.error) {
      return {
        error: followupConversation.error,
        code: followupConversation.code,
        followup_to_job_id: followupConversation.followupToJobId,
        statusCode: followupConversation.statusCode || 400
      };
    }
    const promptOptimization = optimizeOrderPromptForBroker(body, { taskType });
    const executionPrompt = promptOptimization.optimized ? promptOptimization.prompt : body.prompt;
    const inputBase = body.input && typeof body.input === 'object' ? body.input : {};
    const inputSourceBase = mergeProtectedPromptSourceIntoInput(inputBase, promptOptimization);
    const chatSessionId = String(body.session_id || body.sessionId || inputSourceBase.session_id || inputSourceBase.sessionId || '').trim().slice(0, 160);
    const promptOptimizationMeta = promptOptimization.optimized ? promptOptimization.metadata : null;
    const optimizationLog = promptOptimization.optimized
      ? `prompt optimized mode=${promptOptimization.mode} originalChars=${promptOptimization.originalChars} optimizedChars=${promptOptimization.optimizedChars} outputLanguage=${promptOptimization.outputLanguageCode}`
      : null;
    const clientOrderId = body.workflow_parent_id ? '' : clientOrderIdFromCreateBody(body);
    const input = {
      ...inputSourceBase,
      ...(chatSessionId && !inputSourceBase.session_id && !inputSourceBase.sessionId ? { session_id: chatSessionId } : {}),
      ...(clientOrderId && !inputSourceBase.client_order_id && !inputSourceBase.clientOrderId ? { client_order_id: clientOrderId } : {}),
      ...(promptOptimizationMeta && !inputSourceBase.output_language && !inputSourceBase.outputLanguage
        ? { output_language: promptOptimization.outputLanguageCode }
        : {}),
      _broker: {
        ...((inputSourceBase && inputSourceBase._broker) || {}),
        requester,
        billingMode,
        ...(chatSessionId ? { chatSessionId } : {}),
        ...(clientOrderId ? { clientOrderId } : {}),
        ...(body.workflow_tag_hints || body.workflowTagHints ? { workflowTagHints: normalizeAgentTags(body.workflow_tag_hints || body.workflowTagHints, { max: 16 }) } : {}),
        ...(promptOptimizationMeta ? { promptOptimization: promptOptimizationMeta } : {}),
        ...(followupConversation ? { conversation: followupConversation } : {})
      }
    };
    await touchEvent(storage, 'JOB', `parent ${body.parent_agent_id} requested ${taskType}`);
    const requestedAgentId = String(body.agent_id || selectedAgentIdFromOrderBody(body) || '').trim();
    const picked = assignAgentForTask(state.agents, taskType, body.budget_cap || 0, requestedAgentId, {
      body,
      tagHints: body.workflow_tag_hints || body.workflowTagHints || workflowTagHintsForTask(taskType, { primaryTask: taskType, prompt: body.prompt }),
      scheduled: Boolean(body?.input?._broker?.recurring),
      recurring: Boolean(body?.input?._broker?.recurring)
    });
    if (picked?.error) {
      return { error: picked.error, requested_agent_id: requestedAgentId, inferred_task_type: taskType, statusCode: 400 };
    }
    if (!picked) {
      const failedJob = {
        id: clientOrderId || crypto.randomUUID(),
        jobKind: body.workflow_parent_id ? 'workflow_child' : 'job',
        parentAgentId: body.parent_agent_id,
        taskType,
        prompt: executionPrompt,
        ...(promptOptimization.optimized ? { originalPrompt: promptOptimization.originalPrompt, promptOptimization } : {}),
        input,
        budgetCap: body.budget_cap || null,
        deadlineSec: body.deadline_sec || null,
        priority: body.priority || 'normal',
        status: 'failed',
        assignedAgentId: null,
        score: null,
        createdAt: nowIso(),
        failedAt: nowIso(),
        failureReason: 'No verified agent available',
        workflowParentId: body.workflow_parent_id || null,
        workflowTask: body.workflow_task || taskType,
        workflowAgentName: null,
        logs: [
          `created by ${body.parent_agent_id}`,
          ...(followupConversation ? [`follow-up to ${followupConversation.followupToJobId} turn=${followupConversation.turn}`] : []),
          ...(optimizationLog ? [optimizationLog] : []),
          'matching failed: no verified agent available'
        ]
      };
      if (typeof storage.upsertJobs === 'function') {
        await storage.upsertJobs([failedJob]);
      } else {
        await storage.mutate(async (draft) => { draft.jobs.unshift(failedJob); });
      }
      await touchEvent(storage, 'FAILED', `${taskType}/${failedJob.id.slice(0, 6)} no verified agent available`);
      if (failedJob.workflowParentId) await reconcileWorkflowParent(storage, failedJob.workflowParentId);
      await touchUsage();
      return { job_id: failedJob.id, status: 'failed', failure_reason: failedJob.failureReason, inferred_task_type: taskType, workflow_parent_id: failedJob.workflowParentId, statusCode: 201 };
    }

    const preflight = orderPreflightForAgent(picked.agent, current, account, body, {
      scheduled: Boolean(body?.input?._broker?.recurring)
    });
    const authorityBlockedDraft = !preflight.ok
      && options.allowAuthorityBlockedDraft === true
      && Boolean(body.workflow_parent_id)
      && ['connector_required', 'confirmation_required'].includes(String(preflight.code || '').trim());
    if (!preflight.ok && !authorityBlockedDraft) {
      await touchUsage();
      return {
        ...preflight,
        inferred_task_type: taskType,
        requested_agent_id: requestedAgentId,
        statusCode: preflight.statusCode || 400
      };
    }
    input._broker.agentPreflight = {
      agentId: picked.agent.id,
      riskLevel: preflight.profile?.riskLevel || preflight.risk_level || 'safe',
      requiredConnectors: preflight.profile?.requiredConnectors || preflight.required_connectors || [],
      requiredConnectorCapabilities: preflight.profile?.requiredConnectorCapabilities || preflight.required_connector_capabilities || [],
      authorityStatus: preflight.authority_status || (authorityBlockedDraft ? 'action_required' : 'ready'),
      connectorStatus: preflight.connector_status || {},
      grantedConnectorCapabilities: preflight.granted_connector_capabilities || [],
      missingConnectors: preflight.missing_connectors || [],
      missingConnectorCapabilities: preflight.missing_connector_capabilities || [],
      warning: preflight.warning || (authorityBlockedDraft ? preflight.error || preflight.code || 'authority required before external execution' : '')
    };

    const listCreatorEstimate = listCreatorUsageEstimateForOrder({
      ...body,
      task_type: taskType,
      prompt: executionPrompt,
      input
    });
    if (listCreatorEstimate) {
      input._broker.listCreatorEstimate = {
        requestedCount: listCreatorEstimate.requestedCount,
        batchSize: listCreatorEstimate.batchSize,
        batchCount: listCreatorEstimate.batchCount,
        contactCaptureMode: listCreatorEstimate.contactCaptureMode
      };
    }
    const estimatedUsage = listCreatorEstimate && !(Number(body.estimated_total_cost_basis || 0) > 0 || body.estimated_cost_basis)
      ? listCreatorEstimate.usage
      : {
          api_cost: Number(body.estimated_api_cost || 100),
          total_cost_basis: Number(body.estimated_total_cost_basis || 0) || undefined,
          cost_basis: body.estimated_cost_basis || undefined
        };
    const estimatedBilling = estimateBilling(picked.agent, estimatedUsage);
    const job = {
      id: clientOrderId || crypto.randomUUID(),
      jobKind: body.workflow_parent_id ? 'workflow_child' : 'job',
      parentAgentId: body.parent_agent_id,
      taskType,
      prompt: executionPrompt,
      ...(promptOptimization.optimized ? { originalPrompt: promptOptimization.originalPrompt, promptOptimization } : {}),
      input,
      budgetCap: body.budget_cap || null,
      deadlineSec: body.deadline_sec || null,
      priority: body.priority || 'normal',
      status: 'queued',
      assignedAgentId: picked.agent.id,
      score: picked.score,
      createdAt: nowIso(),
      callbackToken: callbackTokenForJob(),
      workflowParentId: body.workflow_parent_id || null,
      workflowTask: body.workflow_task || taskType,
      workflowAgentName: picked.agent.name,
      billingEstimate: estimatedBilling,
      estimateWindow: estimateRunWindow(picked.agent, taskType),
      logs: [
        `created by ${body.parent_agent_id}`,
        ...(followupConversation ? [`follow-up to ${followupConversation.followupToJobId} turn=${followupConversation.turn}`] : []),
        ...(optimizationLog ? [optimizationLog] : []),
        preflight.warning ? `preflight warning: ${preflight.warning}` : 'preflight ok',
        authorityBlockedDraft ? `authority blocker captured for draft handoff: ${preflight.code || 'authority_required'}` : null,
        `${picked.assignmentMode === 'manual' ? 'manually assigned' : 'matched to'} ${picked.agent.id} score=${picked.score} source=${isManagedSampleAgent(picked.agent) ? 'sample-agent' : 'provider'}`,
        `inferred taskType=${taskType}`
      ].filter(Boolean),
      assignmentMode: picked.assignmentMode
    };
    let funding = null;
    const reserveAndInsert = async () => {
      funding = null;
      const billingDraft = { accounts: account ? [structuredClone(account)] : [] };
      if (current?.login) {
        funding = reserveBillingEstimateInState(billingDraft, current.login, current.user, current.authProvider, estimatedBilling.total, {
          apiKeyMode: billingApiKeyModeForRequester(current, env),
          openAiCostEstimate: estimatedBilling.apiCost || estimatedBilling.totalCostBasis || estimatedBilling.total,
          paymentProcessingRemoved: paymentsRemoved,
          period: billingPeriodId(),
          at: job.createdAt
        });
        if (!funding?.ok) return;
      }
      job.billingReservation = funding?.reservation || {
        period: billingPeriodId(job.createdAt),
        mode: paymentsRemoved ? 'donation_only' : billingMode,
        estimatedTotal: paymentsRemoved ? 0 : estimatedBilling.total,
        reservedCredits: 0,
        reservedDeposit: 0,
        autoTopupAdded: 0,
        overageMode: null,
        paymentProcessingRemoved: paymentsRemoved,
        openAiCostEstimate: estimatedBilling.apiCost || estimatedBilling.totalCostBasis || estimatedBilling.total,
        reservedOpenAiCost: 0
      };
      if (job.billingReservation.autoTopupAdded > 0) {
        job.logs.push(`legacy auto billing added ${job.billingReservation.autoTopupAdded}`);
      }
      if (typeof storage.upsertJobs === 'function') {
        await storage.upsertJobs([job]);
      } else {
        await storage.mutate(async (draft) => {
          draft.jobs.unshift(job);
        });
      }
      if (current?.login && billingDraft.accounts.length && typeof storage.mutateAccount === 'function') {
        const safeLogin = String(current.login || '').trim().toLowerCase();
        const nextAccount = billingDraft.accounts.find((item) => String(item?.login || '').trim().toLowerCase() === safeLogin) || billingDraft.accounts[0] || null;
        if (nextAccount) {
          await storage.mutateAccount(current.login, async (draft) => {
            draft.accounts = [nextAccount];
          });
        }
      }
    };
    await reserveAndInsert();
    if (shouldInjectQaOrderCreateFault(env, 'after_single_job_insert')) {
      throw new Error('qa injected order create fault after single job insert');
    }
    let stripeFunding = null;
    if (current?.login && funding && !funding.ok) {
      await touchUsage();
      const guestLimitExceeded = current?.guestTrial && String(funding.code || '') === 'payment_required';
      return {
        error: guestLimitExceeded
          ? `Guest trial covers one order up to $${ledgerAmountToDisplayCurrency(current.guestTrial.limit || WELCOME_CREDITS_GRANT_AMOUNT).toFixed(2)}. Sign in to continue with this larger order.`
          : (stripeFunding?.error || funding.error),
        code: guestLimitExceeded ? 'guest_trial_limit_exceeded' : (stripeFunding?.code || funding.code),
        inferred_task_type: taskType,
        requested_agent_id: requestedAgentId,
        estimated_cost: estimatedBilling,
        billing_profile: funding.profile || null,
        missing_amount: funding.missingAmount || 0,
        stripe_auto_topup: stripeFunding || null,
        statusCode: 402
      };
    }
    await touchEvent(storage, 'MATCHED', `${job.taskType}/${job.id.slice(0, 6)} -> ${picked.agent.name}`);
    if (job.workflowParentId) await reconcileWorkflowParent(storage, job.workflowParentId);
    if (!resolveAgentJobEndpoint(picked.agent)) {
      await touchUsage();
      return { job_id: job.id, matched_agent_id: job.assignedAgentId, selection_mode: picked.assignmentMode, inferred_task_type: taskType, status: 'queued', workflow_parent_id: job.workflowParentId, statusCode: 201 };
    }

    if (options.deferDispatch) {
      await touchUsage();
      return {
        job_id: job.id,
        matched_agent_id: job.assignedAgentId,
        selection_mode: picked.assignmentMode,
        inferred_task_type: taskType,
        status: 'queued',
        mode: 'queued',
        dispatch_status: 'deferred',
        workflow_parent_id: job.workflowParentId,
        statusCode: 201
      };
    }

    if (options.asyncDispatch) {
      const dispatchPromise = dispatchExistingJobToAssignedAgent(storage, env, job.id, picked.agent.id)
        .catch((error) => touchEvent(storage, 'FAILED', `${job.taskType}/${job.id.slice(0, 6)} async dispatch exception ${String(error?.message || error).slice(0, 120)}`));
      if (typeof options.waitUntil === 'function') {
        options.waitUntil(dispatchPromise);
      } else {
        void dispatchPromise;
      }
      await touchUsage();
      return {
        job_id: job.id,
        matched_agent_id: job.assignedAgentId,
        selection_mode: picked.assignmentMode,
        inferred_task_type: taskType,
        status: 'queued',
        mode: 'queued',
        async_dispatch: true,
        dispatch_status: 'scheduled',
        workflow_parent_id: job.workflowParentId,
        statusCode: 201
      };
    }

    const final = await dispatchExistingJobToAssignedAgent(storage, env, job.id, picked.agent.id);
    if (final.error && !final.job) return { error: final.error, statusCode: final.statusCode || 500 };
    await touchUsage();
    return {
      job_id: job.id,
      matched_agent_id: job.assignedAgentId,
      selection_mode: picked.assignmentMode,
      inferred_task_type: taskType,
      status: final.mode || final.job?.status || 'queued',
      mode: final.mode || final.job?.status || 'queued',
      failure_reason: final.error || final.job?.failureReason || null,
      workflow_parent_id: job.workflowParentId,
      statusCode: 201
    };
  }

  function recentPersistedJobForCreateBody(state = {}, current = {}, body = {}, options = {}) {
    const maxAgeMs = Number(options.maxAgeMs || 5 * 60 * 1000);
    const nowMs = Date.now();
    const requestedParent = String(body?.parent_agent_id || '').trim();
    const requestedWorkflowParent = String(body?.workflow_parent_id || body?.workflowParentId || '').trim();
    const requestedStrategy = normalizeOrderStrategy(body?.order_strategy || body?.orderStrategy || body?.execution_mode || body?.executionMode);
    const requestedSessionId = String(body?.session_id || body?.sessionId || body?.input?.session_id || body?.input?.sessionId || body?.input?._broker?.chatSessionId || body?.input?._broker?.workflow?.chatSessionId || '').trim();
    const requestedClientOrderId = clientOrderIdFromCreateBody(body);
    const sameContentRetryAsNewOrder = orderCreateBodyIsSameContentNewOrderRetry(body);
    const preferWorkflow = !requestedWorkflowParent && requestedStrategy !== 'single';
    const jobs = Array.isArray(state?.jobs) ? state.jobs : [];
    return jobs
      .filter((job) => {
        if (!job?.id) return false;
        if (requestedParent && String(job.parentAgentId || '') !== requestedParent) return false;
        if (requestedWorkflowParent && String(job.workflowParentId || '') !== requestedWorkflowParent) return false;
        if (preferWorkflow && requestedStrategy === 'multi' && job.jobKind !== 'workflow') return false;
        if (!jobRequesterMatchesCurrent(job, current)) return false;
        const clientOrderMatches = requestedClientOrderId && String(job.id || '').trim() === requestedClientOrderId;
        if (sameContentRetryAsNewOrder && !clientOrderMatches) return false;
        const promptMatches = jobPromptMatchesCreateBody(job, body);
        const sessionMatches = jobSessionMatchesCreateBody(job, body);
        if (!clientOrderMatches && !promptMatches && !(requestedSessionId && sessionMatches)) return false;
        const createdMs = Date.parse(job.createdAt || job.created_at || '');
        if (!Number.isFinite(createdMs) || nowMs - createdMs > maxAgeMs) return false;
        return true;
      })
      .sort((left, right) => {
        if (preferWorkflow) {
          const workflowDiff = (right.jobKind === 'workflow' ? 1 : 0) - (left.jobKind === 'workflow' ? 1 : 0);
          if (workflowDiff) return workflowDiff;
        }
        return String(right.createdAt || '').localeCompare(String(left.createdAt || ''));
      })[0] || null;
  }

  async function loadOrderCreatePlanningState(storage, current = {}, body = {}) {
    if (typeof storage.listAgents !== 'function' || typeof storage.getAccountByLogin !== 'function' || typeof storage.getJobById !== 'function') {
      return storage.getState();
    }
    const clientOrderId = clientOrderIdFromCreateBody(body);
    const followupJobId = requestedFollowupJobIdFromCreateBody(body);
    const [agents, account, clientOrderJob, followupJob] = await Promise.all([
      storage.listAgents({ limit: 500 }),
      current?.login ? storage.getAccountByLogin(current.login) : Promise.resolve(null),
      clientOrderId ? storage.getJobById(clientOrderId) : Promise.resolve(null),
      followupJobId && followupJobId !== clientOrderId ? storage.getJobById(followupJobId) : Promise.resolve(null)
    ]);
    const jobs = [];
    for (const job of [clientOrderJob, followupJob]) {
      if (job?.id && !jobs.some((item) => item.id === job.id)) jobs.push(job);
    }
    return {
      agents: Array.isArray(agents) ? agents : [],
      accounts: account ? [account] : [],
      jobs,
      apps: [],
      events: [],
      feedbackReports: [],
      chatTranscripts: [],
      appContexts: [],
      recurringOrders: [],
      emailDeliveries: [],
      exactMatchActions: [],
      appSettings: []
    };
  }

  async function loadSingleOrderCreateState(storage, current = {}, body = {}) {
    if (typeof storage.listAgents !== 'function' || typeof storage.getAccountByLogin !== 'function' || typeof storage.getJobById !== 'function') {
      return storage.getState();
    }
    const clientOrderId = clientOrderIdFromCreateBody(body);
    const followupJobId = requestedFollowupJobIdFromCreateBody(body);
    const [agents, account, clientOrderJob, followupJob] = await Promise.all([
      storage.listAgents({ limit: 500 }),
      current?.login ? storage.getAccountByLogin(current.login) : Promise.resolve(null),
      clientOrderId ? storage.getJobById(clientOrderId) : Promise.resolve(null),
      followupJobId && followupJobId !== clientOrderId ? storage.getJobById(followupJobId) : Promise.resolve(null)
    ]);
    const jobs = [];
    for (const job of [clientOrderJob, followupJob]) {
      if (job?.id && !jobs.some((item) => item.id === job.id)) jobs.push(job);
    }
    return {
      agents: Array.isArray(agents) ? agents : [],
      accounts: account ? [account] : [],
      jobs,
      apps: [],
      events: [],
      feedbackReports: [],
      chatTranscripts: [],
      appContexts: [],
      recurringOrders: [],
      emailDeliveries: [],
      exactMatchActions: [],
      appSettings: []
    };
  }

  async function recoverCreateJobException(storage, current, body, error) {
    let recoveredJob = null;
    const clientOrderId = clientOrderIdFromCreateBody(body);
    if (clientOrderId && typeof storage.getJobById === 'function') {
      try {
        recoveredJob = await storage.getJobById(clientOrderId);
      } catch {}
    }
    if (!recoveredJob?.id) {
      try {
        const state = await loadOrderCreatePlanningState(storage, current, body);
        recoveredJob = recentPersistedJobForCreateBody(state, current, body);
      } catch {}
    }
    if (!recoveredJob?.id && storage?.kind !== 'd1') {
      try {
        const state = await storage.getState();
        recoveredJob = recentPersistedJobForCreateBody(state, current, body);
      } catch {}
    }
    if (!recoveredJob?.id && typeof storage.getFreshState === 'function' && typeof storage.getJobById !== 'function') {
      try {
        const freshState = await storage.getFreshState();
        recoveredJob = recentPersistedJobForCreateBody(freshState, current, body);
      } catch {}
    }
    const message = String(error?.message || error || 'Unknown order create error').slice(0, 500);
    const meta = {
      kind: 'order_create_exception',
      recovered: Boolean(recoveredJob?.id),
      recoveredJobId: recoveredJob?.id || null,
      jobKind: recoveredJob?.jobKind || null,
      taskType: body?.task_type || body?.taskType || null,
      orderStrategy: body?.order_strategy || body?.orderStrategy || null,
      requesterLogin: current?.login || null,
      message
    };
    try {
      await touchEvent(storage, 'FAILED', recoveredJob?.id
        ? `order create exception recovered ${recoveredJob.id.slice(0, 6)}`
        : 'order create exception before recovery', meta);
    } catch {}
    if (recoveredJob?.id) {
      return json(createJobResponseFromPersistedJob(recoveredJob, {
        recovered: true,
        code: 'order_create_recovered',
        warning: 'Order was accepted, but the create response failed after persistence. CAIt recovered the persisted order instead of asking you to resubmit.'
      }), 202);
    }
    return json({
      error: 'Order create failed before dispatch.',
      code: 'order_create_failed',
      retry_safe: true
    }, 500);
  }

  async function handleCreateWorkflowJob(storage, request, env, current, body, options = {}) {
    body = orderBodyWithCommonQualityRules(body);
    if (String(body.agent_id || '').trim()) {
      return { error: 'Multi-agent objective does not support a single pinned agent. Clear the pin and retry.', statusCode: 400 };
    }
    const taskType = normalizeTaskTypes([body.task_type])[0] || inferTaskType(body.task_type, body.prompt);
    const skipIntake = options.skipIntake === true || orderCreateSkipIntake(body);
    if (!skipIntake) {
      const intakeClarification = await buildIntakeClarificationWithAi(body, { taskType }, env);
      if (intakeClarification) {
        await (options.touchUsage || (async () => {}))();
        return intakeClarification;
      }
    }
    const state = options.initialState || await storage.getState();
    const suppliedPlan = options.workflowPlan && typeof options.workflowPlan === 'object' ? options.workflowPlan : null;
    const suppliedAssignments = Array.isArray(suppliedPlan?.assignments)
      ? suppliedPlan.assignments
      : (Array.isArray(suppliedPlan?.['selection' + 's']) ? suppliedPlan['selection' + 's'] : []);
    let plan = suppliedAssignments.length
      ? { ...suppliedPlan, assignments: suppliedAssignments }
      : planWorkflowAssignments(state.agents, body.task_type, body.prompt, {
          selectedAgentId: selectedAgentIdFromOrderBody(body),
          selectedAgentTaskType: selectedAgentTaskTypeFromOrderBody(body),
          budgetCap: body.budget_cap || 0,
          ...(Array.isArray(suppliedPlan?.plannedTasks) && suppliedPlan.plannedTasks.length ? {
            plannedTasks: suppliedPlan.plannedTasks,
            preservePlannedTasks: true,
            expand: false
          } : {}),
          ...(suppliedPlan?.tagHintsByTask ? { tagHintsByTask: suppliedPlan.tagHintsByTask } : {}),
          ...(suppliedPlan?.leaderPlanning ? { leaderPlanning: suppliedPlan.leaderPlanning } : {})
        });
    if (plan.assignments.length < 2) {
      const fallbackPlan = planWorkflowAssignments(state.agents, body.task_type, body.prompt, {
        selectedAgentId: selectedAgentIdFromOrderBody(body),
        selectedAgentTaskType: selectedAgentTaskTypeFromOrderBody(body),
        budgetCap: body.budget_cap || 0,
        expand: true,
        preservePlannedTasks: false,
        ...(suppliedPlan?.tagHintsByTask ? { tagHintsByTask: suppliedPlan.tagHintsByTask } : {}),
        ...(suppliedPlan?.leaderPlanning ? { leaderPlanning: suppliedPlan.leaderPlanning } : {})
      });
      if (fallbackPlan.assignments.length > plan.assignments.length) {
        plan = {
          ...fallbackPlan,
          recovery: {
            reason: 'initial_plan_had_too_few_ready_agents',
            originalPlannedTasks: plan.plannedTasks || [],
            originalReadyAgentCount: plan.assignments.length
          }
        };
      }
    }
    plan = {
      ...plan,
      assignments: plan.assignments
        .map((assignment) => resolveWorkflowAssignmentFromAgentList(state.agents, assignment, plan.plannedTasks?.[0] || taskType, body.prompt, {
          budgetCap: body.budget_cap || 0,
          scheduled: Boolean(body?.input?._broker?.recurring),
          recurring: Boolean(body?.input?._broker?.recurring)
        }))
        .filter(Boolean)
    };
    if (plan.assignments.length < 2) {
      const candidateAgents = leaderPlannerCandidateAgents(state.agents).slice(0, 24);
      return {
        error: 'Need at least 2 ready agents for an Agent Team objective. Register or verify more agents first.',
        statusCode: 400,
        planned_task_types: plan.plannedTasks,
        ready_agent_count: plan.assignments.length,
        candidate_agents: candidateAgents,
        agent_manifest_catalog: leaderPlannerManifestCatalog(state.agents).slice(0, 24),
        diagnostic: candidateAgents.length
          ? 'Planner could not select enough ready agents from the available manifest index. Check planned task names, layer tags, and verification status.'
          : 'No verified endpoint-capable agents are available for this account/environment.'
      };
    }
    const reuseArtifactsByTask = workflowReuseArtifactsByTaskFromOrderBody(body);
    const selectedReuseArtifacts = [...reuseArtifactsByTask.values()]
      .filter((artifact) => plan.assignments.some((assignment) => String(assignment.taskType || '').trim().toLowerCase() === artifact.taskType))
      .slice(0, 8);
    const selectedReuseArtifactMetas = selectedReuseArtifacts.map(workflowReuseArtifactStorageMeta);
    const chargeableAssignments = plan.assignments.filter((assignment) => !reuseArtifactsByTask.has(String(assignment.taskType || '').trim().toLowerCase()));
    const requester = requesterContextFromUser(current.user, current.authProvider, {
      login: current.login,
      accountId: accountIdForLogin(current.login)
    });
    const account = current?.login ? accountSettingsForLogin(state, current.login, current.user, current.authProvider) : null;
    const billingMode = billingModeForRequester(current, account, env);
    const paymentsRemoved = inAppPaymentsRemoved(env);
    const followupConversation = buildFollowupConversationContext(state, body, { login: current?.login || '' });
    if (followupConversation?.error) {
      return {
        error: followupConversation.error,
        code: followupConversation.code,
        followup_to_job_id: followupConversation.followupToJobId,
        statusCode: followupConversation.statusCode || 400
      };
    }
    const workflowEstimate = buildWorkflowEstimate(chargeableAssignments);
    if (current?.login) {
      const fundingPreflightState = { accounts: account ? [structuredClone(account)] : [] };
      const fundingPreflight = reserveBillingEstimateInState(
        fundingPreflightState,
        current.login,
        current.user,
        current.authProvider,
        workflowEstimate.totalMax,
        {
          apiKeyMode: billingApiKeyModeForRequester(current, env),
          openAiCostEstimate: workflowEstimate.openAiCostMax,
          paymentProcessingRemoved: paymentsRemoved,
          period: billingPeriodId(),
          at: nowIso()
        }
      );
      if (!fundingPreflight?.ok) {
        await (options.touchUsage || (async () => {}))();
        return {
          error: fundingPreflight?.error || 'Payment required before sending this Agent Team order.',
          code: fundingPreflight?.code || 'payment_required',
          planned_task_types: plan.plannedTasks,
          estimated_cost: {
            total: workflowEstimate.totalMax,
            totalMin: workflowEstimate.totalMin,
            totalMax: workflowEstimate.totalMax
          },
          billing_profile: fundingPreflight?.profile || null,
          missing_amount: fundingPreflight?.missingAmount || workflowEstimate.totalMax,
          statusCode: 402
        };
      }
    }
    const promptOptimization = optimizeOrderPromptForBroker(body, { taskType });
    const inputBase = body.input && typeof body.input === 'object' ? body.input : {};
    const inputSourceBase = mergeProtectedPromptSourceIntoInput(inputBase, promptOptimization);
    const workflowStorageInputBase = compactRetryReuseArtifactsForJobStorage(inputSourceBase, selectedReuseArtifacts);
    const chatSessionId = String(body.session_id || body.sessionId || workflowStorageInputBase.session_id || workflowStorageInputBase.sessionId || '').trim().slice(0, 160);
    const clientOrderId = clientOrderIdFromCreateBody(body);
    const promptOptimizationMeta = promptOptimization.optimized ? promptOptimization.metadata : null;
    const workflowPrimary = String(plan.plannedTasks?.[0] || taskType || '').trim().toLowerCase();
    const workflowPseudoParent = {
      taskType: workflowPrimary,
      workflow: {
        plannedTasks: Array.isArray(plan.plannedTasks) && plan.plannedTasks.length ? plan.plannedTasks : [workflowPrimary]
      }
    };
    const workflowLeaderProtocol = workflowLeaderActionProtocol(workflowPseudoParent);
    const brokerBase = (workflowStorageInputBase && workflowStorageInputBase._broker && typeof workflowStorageInputBase._broker === 'object')
      ? workflowStorageInputBase._broker
      : {};
    const workflowBase = brokerBase.workflow && typeof brokerBase.workflow === 'object'
      ? brokerBase.workflow
      : {};
    const workflowBaseForSharedMeta = workflowMetaWithoutGlobalSearchFlags(workflowBase);
    const workflowObjective = String(promptOptimization?.originalPrompt || body.prompt || '').trim();
    const workflowSharedMeta = {
      ...workflowBaseForSharedMeta,
      primaryTask: workflowPrimary,
      ...(workflowObjective ? { objective: workflowObjective, originalPrompt: workflowObjective } : {}),
      plannedTasks: Array.isArray(plan.plannedTasks) ? plan.plannedTasks.slice(0, 12) : [workflowPrimary],
      ...(selectedReuseArtifactMetas.length ? { reusedArtifacts: selectedReuseArtifactMetas } : {}),
      ...(chatSessionId ? { chatSessionId } : {}),
      ...(workflowLeaderProtocol ? { leaderActionProtocol: workflowLeaderProtocol } : {}),
      ...(workflowLeaderProtocol?.leaderControlContract ? { leaderControlContract: workflowLeaderProtocol.leaderControlContract } : {})
    };
    const parentInput = {
      ...workflowStorageInputBase,
      ...(chatSessionId && !workflowStorageInputBase.session_id && !workflowStorageInputBase.sessionId ? { session_id: chatSessionId } : {}),
      ...(clientOrderId && !workflowStorageInputBase.client_order_id && !workflowStorageInputBase.clientOrderId ? { client_order_id: clientOrderId } : {}),
      ...(promptOptimizationMeta && !workflowStorageInputBase.output_language && !workflowStorageInputBase.outputLanguage
        ? { output_language: promptOptimization.outputLanguageCode }
        : {}),
      _broker: {
        ...brokerBase,
        requester,
        billingMode,
        ...(chatSessionId ? { chatSessionId } : {}),
        ...(clientOrderId ? { clientOrderId } : {}),
        workflow: {
          ...workflowSharedMeta,
          sequencePhase: 'initial'
        },
        ...(body.workflow_tag_hints || body.workflowTagHints ? { workflowTagHints: normalizeAgentTags(body.workflow_tag_hints || body.workflowTagHints, { max: 16 }) } : {}),
        ...(promptOptimizationMeta ? { promptOptimization: promptOptimizationMeta } : {}),
        ...(followupConversation ? { conversation: followupConversation } : {})
      }
    };
    const parentJob = buildWorkflowParentJob(body, parentInput, plan, { promptOptimization });
    if (selectedReuseArtifacts.length) {
      parentJob.billingEstimate = {
        total: workflowEstimate.totalMax,
        totalMin: workflowEstimate.totalMin,
        totalMax: workflowEstimate.totalMax
      };
      parentJob.estimateWindow = workflowEstimate;
      parentJob.workflow = {
        ...(parentJob.workflow || {}),
        reusedArtifacts: selectedReuseArtifacts.map((artifact) => ({
          taskType: artifact.taskType,
          sourceOrderId: artifact.sourceOrderId,
          sourceRunId: artifact.sourceRunId,
          fileName: artifact.fileName
        }))
      };
      parentJob.logs = [
        ...(parentJob.logs || []),
        `user-selected artifact reuse=${selectedReuseArtifacts.map((artifact) => `${artifact.taskType}:${artifact.sourceRunId.slice(0, 8)}`).join(', ')}`
      ];
    }
    const childRuns = [];
    const childJobs = [];
    const workflowInputForTask = (task, options = {}) => {
      const safeTask = String(task || '').trim().toLowerCase();
      const layer = Number(options.workflowLayer || 0) || workflowDispatchLayer(workflowPseudoParent, { workflowTask: safeTask, taskType: safeTask });
      let phase = String(options.sequencePhase || '').trim().toLowerCase()
        || workflowSequencePhaseForTask(workflowPrimary, safeTask, layer);
      const requiresSourceCollection = leaderTaskRequiresSourceCollection(workflowPrimary, safeTask);
      const requiresResearchSearch = requiresSourceCollection
        && leaderTaskUsesWebSearch(workflowPrimary, safeTask);
      const childInputBase = workflowStorageInputBase && typeof workflowStorageInputBase === 'object' ? workflowStorageInputBase : {};
      const childBrokerBase = childInputBase._broker && typeof childInputBase._broker === 'object'
        ? childInputBase._broker
        : {};
      const childWorkflowBase = childBrokerBase.workflow && typeof childBrokerBase.workflow === 'object'
        ? workflowMetaWithoutGlobalSearchFlags(childBrokerBase.workflow)
        : {};
      return {
        ...childInputBase,
        _broker: {
          ...childBrokerBase,
          workflow: {
            ...childWorkflowBase,
            ...workflowSharedMeta,
            parentJobId: parentJob.id,
            dispatchLayer: layer,
            sequencePhase: phase,
            downstreamHandoffSummaryContract: downstreamHandoffSummaryContractForTask(workflowPrimary, safeTask, { phase, layer }),
            ...(options.checkpointLayer ? { checkpointLayer: Number(options.checkpointLayer) } : {}),
            ...(options.requiredBeforeLayer ? { requiredBeforeLayer: Number(options.requiredBeforeLayer) } : {}),
            ...(options.checkpointLabel ? { checkpointLabel: String(options.checkpointLabel).slice(0, 80) } : {}),
            ...(options.requiresUserApprovalBeforeAction ? { requiresUserApprovalBeforeAction: true } : {}),
            ...(options.adaptivePending ? {
              adaptivePending: true,
              adaptivePendingLayer: Number(options.adaptivePendingLayer || layer || 0) || layer,
              adaptiveHoldReason: String(options.adaptiveHoldReason || 'waiting_for_leader_checkpoint').slice(0, 120)
            } : {}),
            ...(requiresResearchSearch ? {
              forceWebSearch: true,
              webSearchRequiredReason: 'leader_research_layer'
            } : {}),
            ...(requiresSourceCollection ? {
              requiresSourceCollection: true,
              sourceCollectionRequiredReason: 'leader_evidence_layer'
            } : {})
          }
        }
      };
    };
    const buildReusedWorkflowChildJobDraft = (assignment, childTaskType, childInputRaw, artifact) => {
      const createdAt = nowIso();
      const task = String(assignment.taskType || childTaskType || artifact.taskType || '').trim().toLowerCase();
      const sourceOrderId = String(artifact.sourceOrderId || artifact.source_order_id || '').trim();
      const sourceRunId = String(artifact.sourceRunId || artifact.source_run_id || '').trim();
      const fileName = String(artifact.fileName || artifact.file_name || `${task || 'reused'}-delivery.md`).trim().slice(0, 160) || `${task || 'reused'}-delivery.md`;
      const broker = childInputRaw?._broker && typeof childInputRaw._broker === 'object'
        ? { ...childInputRaw._broker }
        : {};
      const input = {
        ...childInputRaw,
        ...(chatSessionId && !childInputRaw.session_id && !childInputRaw.sessionId ? { session_id: chatSessionId } : {}),
        _broker: {
          ...broker,
          requester,
          billingMode,
          reusedArtifact: {
            taskType: task,
            sourceOrderId,
            sourceRunId,
            fileName,
            selectedAt: artifact.selectedAt || artifact.selected_at || createdAt,
            userSelected: true
          },
          agentPreflight: {
            agentId: assignment.agent.id,
            riskLevel: 'safe',
            requiredConnectors: [],
            requiredConnectorCapabilities: [],
            authorityStatus: 'reused_completed_artifact',
            connectorStatus: {},
            grantedConnectorCapabilities: [],
            missingConnectors: [],
            missingConnectorCapabilities: [],
            warning: ''
          }
        }
      };
      const summary = `Reused completed ${task || childTaskType} artifact from order ${sourceOrderId ? `#${sourceOrderId.slice(0, 8)}` : 'a previous order'}.`;
      const job = {
        id: crypto.randomUUID(),
        jobKind: 'workflow_child',
        parentAgentId: body.parent_agent_id,
        taskType: childTaskType,
        prompt: `Reuse completed artifact for ${task || childTaskType}.`,
        originalPrompt: body.prompt,
        input,
        budgetCap: body.budget_cap || null,
        deadlineSec: body.deadline_sec || null,
        priority: body.priority || 'normal',
        status: 'completed',
        assignedAgentId: assignment.agent.id,
        score: assignment.score,
        createdAt,
        startedAt: createdAt,
        completedAt: createdAt,
        failedAt: null,
        timedOutAt: null,
        failureReason: null,
        failureCategory: null,
        callbackToken: callbackTokenForJob(),
        workflowParentId: parentJob.id,
        workflowTask: assignment.taskType,
        workflowAgentName: assignment.agent.name,
        billingEstimate: { total: 0, totalMin: 0, totalMax: 0 },
        billingReservation: {
          period: billingPeriodId(createdAt),
          mode: billingMode,
          estimatedTotal: 0,
          reservedCredits: 0,
          reservedDeposit: 0,
          autoTopupAdded: 0,
          overageMode: null
        },
        estimateWindow: {
          durationMinSec: 0,
          durationMaxSec: 0,
          estimateMin: { total: 0 },
          estimateMax: { total: 0 }
        },
        output: {
          summary,
          report: {
            summary,
            bullets: [
              'User selected this completed prior artifact for reuse before retry.',
              'The assigned agent was not dispatched for this step in the new order.',
              'Downstream workflow steps should treat this file as completed prior work.'
            ],
            nextAction: 'Continue the workflow from the reused artifact and rerun only missing or failed downstream steps.',
            reused_artifact: true,
            source_order_id: sourceOrderId,
            source_run_id: sourceRunId,
            source_task_type: task,
            confidence: 'user_reviewed'
          },
          files: [{
            name: fileName,
            type: String(artifact.type || 'text/markdown').trim() || 'text/markdown',
            content: String(artifact.content || '').trim(),
            source_task_type: task,
            source_run_id: sourceRunId,
            source_order_id: sourceOrderId,
            source_agent_name: artifact.sourceAgentName || artifact.source_agent_name || '',
            content_type: 'reused_agent_delivery',
            reused_agent_delivery: true,
            user_selected_reuse: true
          }],
          returnTargets: ['chat', 'api']
        },
        usage: {
          api_cost: 0,
          total_cost_basis: 0,
          input_tokens: 0,
          output_tokens: 0,
          total_tokens: 0
        },
        actualBilling: null,
        deliveryCompletionGate: {
          score: 100,
          version: 'delivery-completion-gate/v1',
          checkedAt: createdAt
        },
        dispatch: {
          completionStatus: 'reused_completed_artifact',
          retryable: false,
          nextRetryAt: null,
          completedAt: createdAt,
          reusedArtifact: true
        },
        logs: [
          `created by ${body.parent_agent_id}`,
          `user-selected reuse from order=${sourceOrderId || 'unknown'} run=${sourceRunId}`,
          `${assignment.assignmentMode === 'manual' ? 'manually assigned' : 'matched to'} ${assignment.agent.id} but dispatch skipped because prior artifact was reused`,
          `inferred taskType=${childTaskType}`
        ],
        assignmentMode: assignment.assignmentMode
      };
      const run = {
        job_id: job.id,
        task_type: assignment.taskType,
        dispatch_task_type: childTaskType,
        agent_id: assignment.agent.id,
        agent_name: assignment.agent.name,
        layer: Number(assignment.workflowLayer || 0) || workflowDispatchLayer(workflowPseudoParent, { workflowTask: assignment.taskType, taskType: assignment.taskType }),
        sequence_phase: workflowSequencePhaseForJob(job) || null,
        status: 'completed',
        failure_reason: null,
        reused_artifact: true,
        source_order_id: sourceOrderId,
        source_run_id: sourceRunId
      };
      return { job, run };
    };
    const buildWorkflowChildJobDraft = (assignment, childOptions = {}) => {
      const childTaskType = normalizeTaskTypes([
        assignment.dispatchTaskType || assignment.taskType
      ])[0] || assignment.taskType;
      const childInputRaw = workflowInputForTask(assignment.taskType, {
        ...childOptions,
        workflowLayer: assignment.workflowLayer
      });
      const reuseArtifact = reuseArtifactsByTask.get(String(assignment.taskType || '').trim().toLowerCase())
        || reuseArtifactsByTask.get(String(childTaskType || '').trim().toLowerCase());
      if (reuseArtifact && !isWorkflowLeaderTask(assignment.taskType)) {
        return buildReusedWorkflowChildJobDraft(assignment, childTaskType, childInputRaw, reuseArtifact);
      }
      const childBody = {
        ...body,
        input: childInputRaw,
        task_type: childTaskType,
        agent_id: assignment.agent.id,
        workflow_parent_id: parentJob.id,
        workflow_task: assignment.taskType,
        workflow_tag_hints: assignment.tagHints || []
      };
      const childPromptOptimization = optimizeOrderPromptForBroker(childBody, { taskType: childTaskType });
      const childExecutionPrompt = childPromptOptimization.optimized ? childPromptOptimization.prompt : body.prompt;
      const childInputSourceBase = mergeProtectedPromptSourceIntoInput(childInputRaw, childPromptOptimization);
      const childPromptOptimizationMeta = childPromptOptimization.optimized ? childPromptOptimization.metadata : null;
      const broker = childInputSourceBase._broker && typeof childInputSourceBase._broker === 'object'
        ? { ...childInputSourceBase._broker }
        : {};
      const childPreflight = orderPreflightForAgent(assignment.agent, current, account, childBody, {
        scheduled: Boolean(childInputRaw?._broker?.recurring)
      });
      const childLayer = Number(assignment.workflowLayer || childInputRaw?._broker?.workflow?.dispatchLayer || 0)
        || workflowDispatchLayer(workflowPseudoParent, { workflowTask: assignment.taskType, taskType: assignment.taskType });
      const childSequencePhase = String(childInputRaw?._broker?.workflow?.sequencePhase || '').trim().toLowerCase();
      const childIsActionPhase = childSequencePhase === 'action'
        || childLayer >= leaderActionLayerStart(workflowPrimary)
        || normalizeTaskTypes([assignment.taskType, childTaskType]).some((task) => taskRequiresConnectorApproval(task));
      const actionSaasHandoffTask = childIsActionPhase
        && normalizeTaskTypes([assignment.taskType, childTaskType]).some((task) => taskRequiresConnectorApproval(task));
      const actionHandoffPreflight = actionSaasHandoffTask
        && ['connector_required', 'confirmation_required'].includes(String(childPreflight.code || '').trim())
        && normalizeTaskTypes([assignment.taskType, childTaskType]).some((task) => taskRequiresConnectorApproval(task));
      const authorityBlockedDraft = !childPreflight.ok
        && !actionHandoffPreflight
        && ['connector_required', 'confirmation_required'].includes(String(childPreflight.code || '').trim());
      const authorityBlockedForDraft = authorityBlockedDraft && childOptions.adaptivePending !== true;
      const listCreatorEstimate = listCreatorUsageEstimateForOrder({
        ...childBody,
        task_type: childTaskType,
        prompt: childExecutionPrompt,
        input: childInputRaw
      });
      const estimatedUsage = listCreatorEstimate && !(Number(body.estimated_total_cost_basis || 0) > 0 || body.estimated_cost_basis)
        ? listCreatorEstimate.usage
        : {
            api_cost: Number(body.estimated_api_cost || 100),
            total_cost_basis: Number(body.estimated_total_cost_basis || 0) || undefined,
            cost_basis: body.estimated_cost_basis || undefined
          };
      const estimatedBilling = estimateBilling(assignment.agent, estimatedUsage);
      const failedByPreflight = !childPreflight.ok && !authorityBlockedDraft && !actionHandoffPreflight;
      const initialStatus = String(childOptions.initialStatus || '').trim().toLowerCase();
      const status = initialStatus || (authorityBlockedForDraft ? 'blocked' : (failedByPreflight ? 'failed' : 'queued'));
      const createdAt = nowIso();
      const input = {
        ...childInputSourceBase,
        ...(chatSessionId && !childInputSourceBase.session_id && !childInputSourceBase.sessionId ? { session_id: chatSessionId } : {}),
        ...(childPromptOptimizationMeta && !childInputSourceBase.output_language && !childInputSourceBase.outputLanguage
          ? { output_language: childPromptOptimization.outputLanguageCode }
          : {}),
        _broker: {
          ...broker,
          requester,
          billingMode,
          ...(chatSessionId ? { chatSessionId } : {}),
          ...(body.workflow_tag_hints || body.workflowTagHints ? { workflowTagHints: normalizeAgentTags(body.workflow_tag_hints || body.workflowTagHints, { max: 16 }) } : {}),
          ...(listCreatorEstimate ? {
            listCreatorEstimate: {
              requestedCount: listCreatorEstimate.requestedCount,
              batchSize: listCreatorEstimate.batchSize,
              batchCount: listCreatorEstimate.batchCount,
              contactCaptureMode: listCreatorEstimate.contactCaptureMode
            }
          } : {}),
          ...(childPromptOptimizationMeta ? { promptOptimization: childPromptOptimizationMeta } : {}),
          ...(followupConversation ? { conversation: followupConversation } : {}),
          agentPreflight: {
            agentId: assignment.agent.id,
            riskLevel: childPreflight.profile?.riskLevel || childPreflight.risk_level || 'safe',
            requiredConnectors: childPreflight.profile?.requiredConnectors || childPreflight.required_connectors || [],
            requiredConnectorCapabilities: childPreflight.profile?.requiredConnectorCapabilities || childPreflight.required_connector_capabilities || [],
            authorityStatus: childPreflight.authority_status || (authorityBlockedDraft ? 'action_required' : 'ready'),
            connectorStatus: childPreflight.connector_status || {},
            grantedConnectorCapabilities: childPreflight.granted_connector_capabilities || [],
            missingConnectors: childPreflight.missing_connectors || [],
            missingConnectorCapabilities: childPreflight.missing_connector_capabilities || [],
            warning: childPreflight.warning || (authorityBlockedDraft ? childPreflight.error || childPreflight.code || 'authority required before external execution' : '')
          }
        }
      };
      if (authorityBlockedForDraft && input._broker?.workflow && typeof input._broker.workflow === 'object') {
        input._broker.workflow = {
          ...input._broker.workflow,
          adaptivePending: false,
          adaptiveHoldReason: 'approval_required_before_external_action'
        };
        delete input._broker.workflow.adaptivePendingLayer;
      }
      if (actionSaasHandoffTask && input._broker?.workflow && typeof input._broker.workflow === 'object') {
        input._broker.workflow = {
          ...input._broker.workflow,
          actionHandoffOnly: true,
          externalActionMode: 'saas_handoff_only',
          publishSurface: 'saas',
          publishApprovalSurface: 'saas',
          actionHandoffReason: childPreflight.warning || childPreflight.error || childPreflight.code || 'saas_publish_handoff'
        };
        input._broker.agentPreflight = {
          ...(input._broker.agentPreflight || {}),
          authorityStatus: 'handoff_only',
          handoffOnly: true,
          publishSurface: 'saas'
        };
      }
      const authorityRequestForBlockedDraft = authorityBlockedForDraft
        ? normalizeAuthorityRequest({
            reason: childPreflight.error || childPreflight.warning || childPreflight.code || 'Connector approval is required before external execution.',
            missing_connectors: childPreflight.missing_connectors || [],
            missing_connector_capabilities: childPreflight.missing_connector_capabilities || childPreflight.required_connector_capabilities || [],
            required_google_sources: [],
            owner_label: assignment.agent.name || assignment.taskType || 'CAIt',
            source: 'agent_preflight',
            required_channel_selection: ['x_post', 'instagram', 'reddit', 'indie_hackers'].includes(assignment.taskType),
            channel_candidates: assignment.taskType === 'x_post' ? ['x'] : []
          })
        : null;
      const authorityExecutorPatch = authorityRequestForBlockedDraft
        ? executorStatePatchFromAuthorityRequest(authorityRequestForBlockedDraft, {})
        : null;
      const dispatch = status === 'blocked'
        ? {
            completionStatus: authorityBlockedForDraft ? 'blocked_waiting_for_approval' : (childOptions.blockedCompletionStatus || 'leader_checkpoint_blocked'),
            retryable: false,
            nextRetryAt: null
          }
        : (status === 'failed'
            ? {
                completionStatus: childPreflight.code || 'preflight_failed',
                retryable: false,
                nextRetryAt: null
              }
            : null);
      const job = {
        id: crypto.randomUUID(),
        jobKind: 'workflow_child',
        parentAgentId: body.parent_agent_id,
        taskType: childTaskType,
        prompt: childExecutionPrompt,
        ...(childPromptOptimization.optimized ? { originalPrompt: childPromptOptimization.originalPrompt, promptOptimization: childPromptOptimization } : {}),
        input,
        budgetCap: body.budget_cap || null,
        deadlineSec: body.deadline_sec || null,
        priority: body.priority || 'normal',
        status,
        assignedAgentId: assignment.agent.id,
        score: assignment.score,
        createdAt,
        failedAt: status === 'failed' ? createdAt : null,
        failureReason: status === 'failed'
          ? (childPreflight.error || childPreflight.code || 'Preflight failed before workflow dispatch.')
          : (authorityBlockedForDraft ? authorityBlockReasonFromRequest(authorityRequestForBlockedDraft, 'Connector approval is required before external execution.') : null),
        failureCategory: status === 'failed'
          ? (childPreflight.code || 'preflight_failed')
          : (authorityBlockedForDraft ? 'blocked_waiting_for_approval' : null),
        ...(authorityRequestForBlockedDraft ? {
          output: {
            summary: authorityBlockReasonFromRequest(authorityRequestForBlockedDraft, 'Connector approval is required before external execution.'),
            report: {
              summary: authorityBlockReasonFromRequest(authorityRequestForBlockedDraft, 'Connector approval is required before external execution.'),
              bullets: ['External connector execution is paused until approval or OAuth setup is complete.'],
              nextAction: 'Approve/connect the required external capability, then resume this action lane.',
              authority_request: authorityRequestForBlockedDraft
            },
            files: []
          },
          ...(authorityExecutorPatch ? { executorState: { ...authorityExecutorPatch, updatedAt: createdAt } } : {})
        } : {}),
        callbackToken: callbackTokenForJob(),
        workflowParentId: parentJob.id,
        workflowTask: assignment.taskType,
        workflowAgentName: assignment.agent.name,
        billingEstimate: estimatedBilling,
        billingReservation: {
          period: billingPeriodId(createdAt),
          mode: billingMode,
          estimatedTotal: estimatedBilling.total,
          reservedCredits: 0,
          reservedDeposit: 0,
          autoTopupAdded: 0,
          overageMode: null
        },
        estimateWindow: estimateRunWindow(assignment.agent, childTaskType),
        dispatch,
        logs: [
          `created by ${body.parent_agent_id}`,
          ...(followupConversation ? [`follow-up to ${followupConversation.followupToJobId} turn=${followupConversation.turn}`] : []),
          ...(childPromptOptimization.optimized ? [`prompt optimized mode=${childPromptOptimization.mode} originalChars=${childPromptOptimization.originalChars} optimizedChars=${childPromptOptimization.optimizedChars} outputLanguage=${childPromptOptimization.outputLanguageCode}`] : []),
          childPreflight.warning ? `preflight warning: ${childPreflight.warning}` : 'preflight ok',
          authorityBlockedForDraft ? `authority blocker captured for draft handoff: ${childPreflight.code || 'authority_required'}` : null,
          authorityBlockedDraft && childOptions.adaptivePending === true ? `authority blocker deferred behind adaptive leader gate: ${childPreflight.code || 'authority_required'}` : null,
          `${assignment.assignmentMode === 'manual' ? 'manually assigned' : 'matched to'} ${assignment.agent.id} score=${assignment.score} source=${isManagedSampleAgent(assignment.agent) ? 'sample-agent' : 'provider'}`,
          `inferred taskType=${childTaskType}`,
          childOptions.blockedLog || null
        ].filter(Boolean),
        assignmentMode: assignment.assignmentMode
      };
      const run = {
        job_id: job.id,
        task_type: assignment.taskType,
        dispatch_task_type: childTaskType,
        agent_id: assignment.agent.id,
        agent_name: assignment.agent.name,
        layer: Number(assignment.workflowLayer || 0) || workflowDispatchLayer(workflowPseudoParent, { workflowTask: assignment.taskType, taskType: assignment.taskType }),
        sequence_phase: workflowSequencePhaseForJob(job) || null,
        ...(childOptions.checkpointLayer ? { checkpoint_layer: Number(childOptions.checkpointLayer) } : {}),
        ...(childOptions.requiredBeforeLayer ? { required_before_layer: Number(childOptions.requiredBeforeLayer) } : {}),
        ...(childOptions.adaptivePending && !authorityBlockedForDraft ? {
          adaptive_pending: true,
          adaptive_layer: Number(childOptions.adaptivePendingLayer || assignment.workflowLayer || workflowDispatchLayer(workflowPseudoParent, { workflowTask: assignment.taskType, taskType: assignment.taskType }) || 0) || null
        } : {}),
        status,
        failure_reason: job.failureReason || null
      };
      return { job, run };
    };
    const workflowPlanHasLayer = (predicate) => (Array.isArray(plan.plannedTasks) ? plan.plannedTasks : [])
      .map((task) => String(task || '').trim().toLowerCase())
      .filter((task) => task && !isWorkflowLeaderTask(task))
      .some((task) => predicate(workflowDispatchLayer(workflowPseudoParent, { workflowTask: task, taskType: task })));
    const enableLeaderSequence = workflowShouldEnableLeaderSequence(plan, body.task_type || taskType)
      || (
        isWorkflowLeaderTask(workflowPrimary)
        && workflowPlanHasLayer((layer) => layer >= 1)
      );
    const leaderAssignment = enableLeaderSequence
      ? plan.assignments.find((assignment) => isWorkflowLeaderTask(assignment.taskType)) || null
      : null;
    const workflowLayerNumbers = [...new Set(plan.assignments
      .filter((assignment) => {
        const task = String(assignment?.taskType || '').trim().toLowerCase();
        return task && !isWorkflowLeaderTask(task);
      })
      .map((assignment) => Number(assignment.workflowLayer || 0) || workflowDispatchLayer(workflowPseudoParent, { workflowTask: assignment.taskType, taskType: assignment.taskType }))
      .filter((layer) => Number(layer) > 0))]
      .sort((left, right) => left - right);
    const actionStartLayer = leaderActionLayerStart(workflowPrimary);
    const workflowCheckpointSpecs = [];
    for (let index = 1; index < workflowLayerNumbers.length; index += 1) {
      const afterLayer = workflowLayerNumbers[index - 1];
      const beforeLayer = workflowLayerNumbers[index];
      workflowCheckpointSpecs.push({
        afterLayer,
        beforeLayer,
        label: `${workflowLayerLabel(workflowPrimary, afterLayer)}_to_${workflowLayerLabel(workflowPrimary, beforeLayer)}`,
        requiresUserApprovalBeforeAction: workflowLayerRequiresUserApprovalBeforeRelease(workflowPrimary, beforeLayer, plan.assignments)
      });
    }
    const adaptiveWorkflowEnabled = enableLeaderSequence
      && isWorkflowLeaderTask(workflowPrimary)
      && workflowLayerNumbers.length > 1
      && workflowCheckpointSpecs.length > 0;
    const adaptiveInitialLayer = adaptiveWorkflowEnabled ? workflowLayerNumbers[0] : null;
    const adaptiveCandidateAssignments = adaptiveWorkflowEnabled
      ? plan.assignments.filter((assignment) => {
          const task = String(assignment?.taskType || '').trim().toLowerCase();
          if (!task || isWorkflowLeaderTask(task)) return false;
          const layer = Number(assignment.workflowLayer || 0) || workflowDispatchLayer(workflowPseudoParent, { workflowTask: task, taskType: task });
          return layer > adaptiveInitialLayer;
        })
      : [];
    if (adaptiveWorkflowEnabled) {
      const adaptiveExecution = {
        enabled: true,
        mode: 'leader_checkpoint_release',
        initialLayer: adaptiveInitialLayer,
        initialPhase: workflowLayerLabel(workflowPrimary, adaptiveInitialLayer),
        pendingTasks: adaptiveCandidateAssignments.map((assignment) => assignment.taskType),
        pendingLayers: [...new Set(adaptiveCandidateAssignments.map((assignment) => (
          Number(assignment.workflowLayer || 0)
          || workflowDispatchLayer(workflowPseudoParent, { workflowTask: assignment.taskType, taskType: assignment.taskType })
        )))]
          .sort((left, right) => left - right),
        rule: 'Only the leader and the first specialist layer start immediately. Later layers stay held until a leader checkpoint reviews the previous layer.'
      };
      workflowSharedMeta.adaptiveExecution = adaptiveExecution;
      const parentBroker = parentJob.input?._broker && typeof parentJob.input._broker === 'object' ? parentJob.input._broker : {};
      const parentWorkflow = parentBroker.workflow && typeof parentBroker.workflow === 'object' ? parentBroker.workflow : {};
      parentJob.input = {
        ...(parentJob.input || {}),
        _broker: {
          ...parentBroker,
          workflow: {
            ...parentWorkflow,
            adaptiveExecution
          }
        }
      };
      parentJob.workflow = {
        ...(parentJob.workflow || {}),
        adaptivePlan: {
          enabled: true,
          mode: 'leader_checkpoint_release',
          initialLayer: adaptiveInitialLayer,
          initialPhase: workflowLayerLabel(workflowPrimary, adaptiveInitialLayer),
          pendingTasks: adaptiveExecution.pendingTasks,
          pendingLayers: adaptiveExecution.pendingLayers,
          pendingChildJobIds: [],
          activations: []
        }
      };
    }
    for (const assignment of plan.assignments) {
      const task = String(assignment?.taskType || '').trim().toLowerCase();
      const layer = Number(assignment.workflowLayer || 0) || workflowDispatchLayer(workflowPseudoParent, { workflowTask: task, taskType: task });
      const adaptivePending = adaptiveWorkflowEnabled
        && task
        && !isWorkflowLeaderTask(task)
        && layer > adaptiveInitialLayer;
      const child = buildWorkflowChildJobDraft(assignment, adaptivePending ? {
        initialStatus: 'blocked',
        blockedCompletionStatus: 'leader_adaptive_pending',
        blockedLog: `adaptive candidate held until leader checkpoint releases layer-${layer}`,
        adaptivePending: true,
        adaptivePendingLayer: layer,
        adaptiveHoldReason: `waiting_for_layer_${layer - 1}_leader_checkpoint`
      } : {});
      childJobs.push(child.job);
      childRuns.push(child.run);
    }
    if (adaptiveWorkflowEnabled && parentJob.workflow?.adaptivePlan) {
      parentJob.workflow.adaptivePlan.pendingChildJobIds = childJobs
        .filter((job) => workflowChildIsAdaptivePending(job))
        .map((job) => job.id);
    }
    if (enableLeaderSequence && leaderAssignment) {
      const checkpointRecords = [];
      for (const [index, checkpointSpec] of workflowCheckpointSpecs.entries()) {
        const checkpointAt = nowIso();
        const checkpoint = buildWorkflowChildJobDraft(leaderAssignment, {
          sequencePhase: 'checkpoint',
          checkpointLayer: checkpointSpec.afterLayer,
          requiredBeforeLayer: checkpointSpec.beforeLayer,
          checkpointLabel: checkpointSpec.label,
          requiresUserApprovalBeforeAction: checkpointSpec.requiresUserApprovalBeforeAction,
          initialStatus: 'blocked',
          blockedCompletionStatus: 'leader_checkpoint_blocked',
          blockedLog: `leader checkpoint run created and blocked until layer-${checkpointSpec.afterLayer} completes before layer-${checkpointSpec.beforeLayer} (${checkpointAt})`
        });
        childJobs.push(checkpoint.job);
        childRuns.push(checkpoint.run);
        checkpointRecords.push({
          jobId: checkpoint.job.id,
          afterLayer: checkpointSpec.afterLayer,
          beforeLayer: checkpointSpec.beforeLayer,
          label: checkpointSpec.label,
          status: 'pending',
          requiresUserApprovalBeforeAction: checkpointSpec.requiresUserApprovalBeforeAction,
          createdAt: checkpointAt
        });
        if (index === 0) {
          parentJob.workflow = {
            ...(parentJob.workflow || {}),
            ...(workflowLeaderProtocol ? { leaderActionProtocol: workflowLeaderProtocol } : {}),
            leaderSequence: {
              enabled: true,
              status: 'pending',
              checkpointJobId: checkpoint.job.id,
              checkpointLayer: checkpointSpec.afterLayer,
              requiredBeforeLayer: checkpointSpec.beforeLayer,
              sourceLeaderTask: leaderAssignment.taskType,
              actionProtocolVersion: workflowLeaderProtocol?.version || null,
              checkpoints: checkpointRecords,
              createdAt: checkpointAt
            }
          };
        }
      }
      if (!workflowCheckpointSpecs.length) {
        parentJob.workflow = {
          ...(parentJob.workflow || {}),
          ...(workflowLeaderProtocol ? { leaderActionProtocol: workflowLeaderProtocol } : {}),
          leaderSequence: {
            enabled: true,
            status: 'completed',
            completedAt: nowIso(),
            sourceLeaderTask: leaderAssignment.taskType,
            actionProtocolVersion: workflowLeaderProtocol?.version || null,
            checkpoints: [],
            createdAt: nowIso()
          }
        };
      }
      if (parentJob.workflow?.leaderSequence) {
        parentJob.workflow.leaderSequence.checkpoints = checkpointRecords;
      }
      const finalSummaryAt = nowIso();
      const finalSummary = buildWorkflowChildJobDraft(leaderAssignment, {
        sequencePhase: 'final_summary',
        initialStatus: 'blocked',
        blockedCompletionStatus: 'leader_final_summary_blocked',
        blockedLog: `leader final summary created and blocked until specialist execution completes (${finalSummaryAt})`
      });
      childJobs.push(finalSummary.job);
      childRuns.push(finalSummary.run);
      parentJob.workflow = {
        ...(parentJob.workflow || {}),
        ...(workflowLeaderProtocol ? { leaderActionProtocol: workflowLeaderProtocol } : {}),
        leaderSequence: {
          ...(parentJob.workflow?.leaderSequence || {}),
          enabled: true,
          finalSummaryJobId: finalSummary.job.id,
          finalSummaryStatus: 'pending',
          finalSummaryCreatedAt: finalSummaryAt
        }
      };
    }
    const refreshParentWorkflowSnapshot = () => {
      const agentChildJobs = workflowAgentRunChildren(childJobs);
      const visibleAgentChildJobs = workflowVisibleAgentRunChildren(childJobs);
      const internalChildJobs = childJobs.filter((job) => workflowChildIsInternalLeaderSequenceRun(job));
      parentJob.workflow = {
        ...(parentJob.workflow || {}),
        childJobIds: childJobs.map((job) => job.id),
        childRuns: childRuns.map((item) => ({
          id: item.job_id || null,
          taskType: item.task_type,
          dispatchTaskType: item.dispatch_task_type,
          agentId: item.agent_id,
          agentName: item.agent_name,
          sequencePhase: item.sequence_phase || null,
          status: item.status || 'queued',
          failureReason: item.failure_reason || null,
          adaptivePending: item.adaptive_pending === true,
          adaptiveLayer: item.adaptive_layer || null
        })),
        plannedChildRunCount: childJobs.length,
        plannedAgentRunCount: visibleAgentChildJobs.length,
        plannedCandidateAgentRunCount: agentChildJobs.length,
        adaptiveCandidateRunCount: agentChildJobs.length - visibleAgentChildJobs.length,
        internalCheckpointRunCount: internalChildJobs.length,
        agentStatusCounts: workflowStatusCounts(visibleAgentChildJobs),
        internalStatusCounts: workflowStatusCounts(internalChildJobs),
        statusCounts: workflowStatusCounts(childJobs)
      };
    };
    const billingDraft = { accounts: account ? [structuredClone(account)] : [] };
    for (const job of childJobs) {
      if (current?.login && job.status !== 'failed') {
        const funding = reserveBillingEstimateInState(billingDraft, current.login, current.user, current.authProvider, job.billingEstimate?.total || 0, {
          apiKeyMode: billingApiKeyModeForRequester(current, env),
          openAiCostEstimate: job.billingEstimate?.apiCost || job.billingEstimate?.totalCostBasis || job.billingEstimate?.total || 0,
          paymentProcessingRemoved: paymentsRemoved,
          period: billingPeriodId(),
          at: job.createdAt
        });
        if (funding?.ok) {
          job.billingReservation = funding.reservation;
        } else {
          job.status = 'failed';
          job.failedAt = nowIso();
          job.failureReason = funding?.error || 'Payment required before workflow child dispatch.';
          job.failureCategory = funding?.code || 'payment_required';
          job.dispatch = {
            ...(job.dispatch || {}),
            completionStatus: job.failureCategory,
            retryable: false,
            nextRetryAt: null
          };
          job.logs = [...(job.logs || []), `billing reservation failed: ${job.failureReason}`];
          const run = childRuns.find((item) => item.job_id === job.id);
          if (run) {
            run.status = 'failed';
            run.failure_reason = job.failureReason;
          }
        }
      }
    }
    refreshParentWorkflowSnapshot();
    if (typeof storage.upsertJobs === 'function') {
      await storage.upsertJobs([parentJob, ...childJobs]);
    } else {
      await storage.mutate(async (draft) => {
        draft.jobs.unshift(parentJob, ...childJobs);
      });
    }
    if (current?.login && billingDraft.accounts.length && typeof storage.mutateAccount === 'function') {
      const safeLogin = String(current.login || '').trim().toLowerCase();
      const nextAccount = billingDraft.accounts.find((item) => String(item?.login || '').trim().toLowerCase() === safeLogin) || billingDraft.accounts[0] || null;
      if (nextAccount) {
        await storage.mutateAccount(current.login, async (draft) => {
          draft.accounts = [nextAccount];
        });
      }
    }
    if (shouldInjectQaOrderCreateFault(env, 'after_workflow_parent_insert')) {
      throw new Error('qa injected order create fault after workflow parent insert');
    }
    await touchEvent(storage, 'JOB', `parent ${body.parent_agent_id} requested Agent Team objective ${parentJob.id.slice(0, 6)}`);
    const createdChildJobIds = childRuns.map((item) => String(item?.job_id || '').trim()).filter(Boolean);
    if (!createdChildJobIds.length) {
      const firstFailure = childRuns.find((item) => String(item?.failure_reason || '').trim())?.failure_reason || 'All child runs were blocked before creation.';
      const failedAt = nowIso();
      await storage.mutate(async (draft) => {
        const parentDraft = draft.jobs.find((job) => job.id === parentJob.id && job.jobKind === 'workflow');
        if (!parentDraft) return;
        parentDraft.status = 'failed';
        parentDraft.completedAt = null;
        parentDraft.failedAt = failedAt;
        parentDraft.failureReason = `No agent runs created: ${String(firstFailure || '').slice(0, 280)}`;
        const failedAgentRuns = childRuns.filter((item) => !workflowChildIsInternalLeaderSequenceRun({
          workflowTask: item.task_type,
          taskType: item.task_type,
          input: { _broker: { workflow: { sequencePhase: item.sequence_phase } } }
        }));
        parentDraft.workflow = {
          ...(parentDraft.workflow || {}),
          childRuns: childRuns.map((item) => ({
            taskType: item.task_type,
            agentId: item.agent_id,
            agentName: item.agent_name,
            status: item.status || 'failed',
            failureReason: item.failure_reason || null
          })),
          statusCounts: {
            total: childRuns.length,
            planned: childRuns.length,
            completed: 0,
            failed: childRuns.length,
            queued: 0,
            running: 0
          },
          agentStatusCounts: {
            total: failedAgentRuns.length,
            planned: failedAgentRuns.length,
            completed: 0,
            failed: failedAgentRuns.length,
            blocked: 0,
            queued: 0,
            running: 0
          },
          plannedAgentRunCount: failedAgentRuns.length,
          internalCheckpointRunCount: childRuns.length - failedAgentRuns.length
        };
        parentDraft.logs = [
          ...(parentDraft.logs || []),
          `workflow child creation failed before dispatch: ${String(firstFailure || '').slice(0, 280)}`
        ];
        parentDraft.output = buildAgentTeamDeliveryOutput(parentDraft, []);
      });
      await touchEvent(storage, 'FAILED', `workflow ${parentJob.id.slice(0, 6)} child creation blocked`);
      return {
        workflow_job_id: parentJob.id,
        job_ids: [],
        child_runs: childRuns,
        planned_task_types: plan.plannedTasks,
        matched_agent_ids: [],
        status: 'failed',
        mode: 'workflow',
        selection_mode: 'multi',
        async_dispatch: Boolean(options.asyncDispatch),
        dispatch_status: 'blocked',
        failure_reason: String(firstFailure || ''),
        statusCode: 201
      };
    }
    const finalParent = await reconcileWorkflowParent(storage, parentJob.id);
    const needsLeaderSequenceProgress = workflowLeaderSequenceNeedsProgress(finalParent || {});
    let scheduled = null;
    if (options.asyncDispatch) {
      scheduled = await scheduleInitialWorkflowDispatchFromChildren(storage, env, options.waitUntil, parentJob, childJobs, 'async workflow create').catch(async (error) => {
        try {
          await touchEvent(storage, 'FAILED', `workflow ${parentJob.id.slice(0, 6)} async dispatch scheduling failed`, {
            workflowJobId: parentJob.id,
            message: String(error?.message || error || '').slice(0, 500)
          });
        } catch {}
        return { scheduled: false, error: String(error?.message || error || '') };
      });
      if (!scheduled?.scheduled && typeof options.waitUntil === 'function') {
        options.waitUntil(scheduleProgressDispatchesForJobId(storage, env, options.waitUntil, parentJob.id, 'async workflow create fallback', {
          maxTargets: WORKFLOW_PROGRESS_DISPATCH_MAX_TARGETS,
          awaitDispatch: false
        }).catch(async (error) => {
          try {
            await touchEvent(storage, 'FAILED', `workflow ${parentJob.id.slice(0, 6)} async dispatch fallback failed`, {
              workflowJobId: parentJob.id,
              message: String(error?.message || error || '').slice(0, 500)
            });
          } catch {}
        }));
      }
      scheduled = { ...(scheduled || {}), async: true };
    } else if (needsLeaderSequenceProgress) {
      scheduled = await scheduleProgressDispatchesForJobId(storage, env, options.waitUntil, parentJob.id, 'leader sequence workflow create', {
        maxTargets: WORKFLOW_PROGRESS_DISPATCH_MAX_TARGETS,
        awaitDispatch: true
      });
    }
    const latestParent = (!options.asyncDispatch && scheduled?.scheduled)
      ? await reconcileWorkflowParent(storage, parentJob.id)
      : finalParent;
    await touchEvent(storage, 'MATCHED', `workflow ${parentJob.id.slice(0, 6)} planned ${childRuns.length} child runs`);
    return {
      workflow_job_id: parentJob.id,
      job_ids: childRuns.map((item) => item.job_id).filter(Boolean),
      child_runs: childRuns,
      planned_task_types: plan.plannedTasks,
      matched_agent_ids: childRuns.map((item) => item.agent_id),
      status: latestParent?.status || finalParent?.status || 'queued',
      mode: 'workflow',
      selection_mode: 'multi',
      async_dispatch: Boolean(options.asyncDispatch),
      dispatch_status: options.asyncDispatch ? (scheduled?.scheduled ? 'scheduled' : 'queued') : undefined,
      statusCode: 201
    };
  }

  async function handleCreateJob(storage, request, env, ctx = null) {
    let current = null;
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
    body = applyActiveConversationOwnerLockToOrderBody(body);
    try {
      current = await currentOrderRequesterContext(storage, request, env, { lightweight: true });
      const touchUsage = async () => {
        if (current.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
      };
      if (!body.parent_agent_id || !body.prompt) {
        return json({ error: 'parent_agent_id and prompt required' }, 400);
      }
      const promptInjection = promptInjectionGuardForPrompt(body.prompt);
      if (promptInjection.blocked) {
        await touchUsage();
        return json(promptPolicyBlockPayload(promptInjection), 400);
      }
      const requestedStrategy = normalizeOrderStrategy(body.order_strategy || body.orderStrategy || body.execution_mode || body.executionMode);
      const asyncDispatch = body.async_dispatch === true || body.asyncDispatch === true || body.respond_async === true || body.respondAsync === true;
      const clientOrderId = clientOrderIdFromCreateBody(body);
      const requestedTaskForRouting = normalizeTaskTypes([body.task_type])[0] || inferTaskType(body.task_type, body.prompt);
      const requestedLeaderSingle = requestedStrategy === 'single' && isWorkflowLeaderTask(requestedTaskForRouting);
      const state = requestedStrategy !== 'single' || clientOrderId || requestedFollowupJobIdFromCreateBody(body) || requestedLeaderSingle
        ? await loadOrderCreatePlanningState(storage, current, body)
        : null;
      if (clientOrderId && state) {
        const existingClientOrder = persistedJobForClientOrderId(state, body);
        if (existingClientOrder?.id) {
          if (!jobRequesterMatchesCurrent(existingClientOrder, current)) {
            await touchUsage();
            return json({
              error: 'Client order id is already used by another requester.',
              code: 'client_order_id_conflict'
            }, 409);
          }
          await touchUsage();
          return json(createJobResponseFromPersistedJob(existingClientOrder, {
            idempotent: true,
            code: 'order_create_idempotent'
          }), 202);
        }
      }
      body = orderBodyWithLeaderFollowupSpecialistRouting(state || {}, body);
      const effectiveRequestedStrategy = orderStrategyWithFollowupContext(requestedStrategy, state || {}, body);
      let resolved = resolveOrderStrategy(state?.agents || [], body, effectiveRequestedStrategy);
      if (!orderCreateSkipPrePersistencePlanning(body)) {
        resolved = await maybeRefineWorkflowPlanWithLeaderLlm(state?.agents || [], body, resolved, env);
      }
      if (resolved?.error) {
        await touchUsage();
        return json({
          error: resolved.error,
          code: resolved.code || 'leader_planner_unavailable',
          planner_error: resolved.planner_error || null,
          routing_reason: resolved.reason,
          routing_planned_task_types: resolved.plan?.plannedTasks || []
        }, resolved.statusCode || 503);
      }
      const guestPrepared = await prepareGuestTrialOrderContext(storage, current, body, resolved);
      if (guestPrepared.error) return json(guestPrepared, guestPrepared.statusCode || 400);
      current = guestPrepared.current;
      body = guestPrepared.body;
      const access = requireOrderWriteAccess(current, env);
      if (access.error) return json({ error: access.error }, access.statusCode || 400);
      const waitUntil = ctx && typeof ctx.waitUntil === 'function'
        ? (promise) => ctx.waitUntil(promise)
        : null;
      const result = resolved.strategy === 'multi'
        ? await handleCreateWorkflowJob(storage, request, env, current, body, { touchUsage, workflowPlan: resolved.plan, asyncDispatch, waitUntil, initialState: state, skipIntake: orderCreateSkipIntake(body) })
        : await performSingleJobCreate(storage, env, current, body, { touchUsage, request, asyncDispatch, waitUntil, initialState: state, skipIntake: orderCreateSkipIntake(body) });
      if (result?.error) return json(result, result.statusCode || 400);
      result.order_strategy_requested = requestedStrategy;
      result.order_strategy_resolved = resolved.strategy;
      result.routing_reason = resolved.reason;
      if (resolved.plan?.plannedTasks) result.routing_planned_task_types = resolved.plan.plannedTasks;
      return json(result, result.statusCode || 201);
    } catch (error) {
      return recoverCreateJobException(storage, current || {}, body, error);
    }
  }

  return {
    handleCreateJob,
    handleCreateWorkflowJob,
    performSingleJobCreate
  };
}
