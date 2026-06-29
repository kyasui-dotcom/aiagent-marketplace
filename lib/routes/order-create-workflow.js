import { createOrderWorkflowChildDraftBuilders } from './order-create-workflow-child-drafts.js';

export function createOrderCreateWorkflowHandler(deps = {}) {
  const {
    WORKFLOW_PROGRESS_DISPATCH_MAX_TARGETS,
    accountIdForLogin,
    accountSettingsForLogin,
    authorityBlockReasonFromRequest,
    billingApiKeyModeForRequester,
    billingModeForRequester,
    billingPeriodId,
    buildAgentTeamDeliveryOutput,
    buildFollowupConversationContext,
    buildIntakeClarificationWithAi,
    buildWorkflowEstimate,
    buildWorkflowParentJob,
    callbackTokenForJob,
    clientOrderIdFromCreateBody,
    compactRetryReuseArtifactsForJobStorage,
    downstreamHandoffSummaryContractForTask,
    estimateBilling,
    estimateRunWindow,
    executorStatePatchFromAuthorityRequest,
    inAppPaymentsRemoved,
    inferTaskType,
    isManagedSampleAgent,
    isWorkflowLeaderTask,
    leaderActionLayerStart,
    leaderPlannerCandidateAgents,
    leaderPlannerManifestCatalog,
    leaderTaskRequiresSourceCollection,
    leaderTaskUsesWebSearch,
    listCreatorUsageEstimateForOrder,
    mergeProtectedPromptSourceIntoInput,
    normalizeAgentTags,
    normalizeAuthorityRequest,
    normalizeTaskTypes,
    nowIso,
    optimizeOrderPromptForBroker,
    orderBodyWithCommonQualityRules,
    orderCreateSkipIntake,
    orderPreflightForAgent,
    planWorkflowAssignments,
    reconcileWorkflowParent,
    requesterContextFromUser,
    reserveBillingEstimateInState,
    resolveWorkflowAssignmentFromAgentList,
    scheduleInitialWorkflowDispatchFromChildren,
    scheduleProgressDispatchesForJobId,
    selectedAgentIdFromOrderBody,
    selectedAgentTaskTypeFromOrderBody,
    shouldInjectQaOrderCreateFault,
    taskRequiresConnectorApproval,
    touchEvent,
    workflowAgentRunChildren,
    workflowChildIsAdaptivePending,
    workflowChildIsInternalLeaderSequenceRun,
    workflowDispatchLayer,
    workflowLayerLabel,
    workflowLayerRequiresUserApprovalBeforeRelease,
    workflowLeaderActionProtocol,
    workflowLeaderSequenceNeedsProgress,
    workflowMetaWithoutGlobalSearchFlags,
    workflowReuseArtifactStorageMeta,
    workflowReuseArtifactsByTaskFromOrderBody,
    workflowSequencePhaseForJob,
    workflowSequencePhaseForTask,
    workflowShouldEnableLeaderSequence,
    workflowStatusCounts,
    workflowVisibleAgentRunChildren
  } = deps;

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
    const { buildWorkflowChildJobDraft } = createOrderWorkflowChildDraftBuilders({
      account,
      authorityBlockReasonFromRequest,
      billingMode,
      billingPeriodId,
      body,
      callbackTokenForJob,
      chatSessionId,
      current,
      downstreamHandoffSummaryContractForTask,
      estimateBilling,
      estimateRunWindow,
      executorStatePatchFromAuthorityRequest,
      followupConversation,
      isManagedSampleAgent,
      isWorkflowLeaderTask,
      leaderActionLayerStart,
      leaderTaskRequiresSourceCollection,
      leaderTaskUsesWebSearch,
      listCreatorUsageEstimateForOrder,
      mergeProtectedPromptSourceIntoInput,
      normalizeAgentTags,
      normalizeAuthorityRequest,
      normalizeTaskTypes,
      nowIso,
      optimizeOrderPromptForBroker,
      orderPreflightForAgent,
      parentJob,
      requester,
      reuseArtifactsByTask,
      taskRequiresConnectorApproval,
      workflowDispatchLayer,
      workflowMetaWithoutGlobalSearchFlags,
      workflowPrimary,
      workflowPseudoParent,
      workflowSequencePhaseForJob,
      workflowSequencePhaseForTask,
      workflowSharedMeta,
      workflowStorageInputBase
    });

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

  return {
    handleCreateWorkflowJob
  };
}
