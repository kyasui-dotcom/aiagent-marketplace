export function createOrderSingleJobCreateHandlers(deps = {}) {
  const {
    WELCOME_CREDITS_GRANT_AMOUNT,
    accountIdForLogin,
    accountSettingsForLogin,
    assignAgentForTask,
    billingApiKeyModeForRequester,
    billingModeForRequester,
    billingPeriodId,
    buildFollowupConversationContext,
    buildIntakeClarificationWithAi,
    callbackTokenForJob,
    clientOrderIdFromCreateBody,
    createJobResponseFromPersistedJob,
    dispatchExistingJobToAssignedAgent,
    estimateBilling,
    estimateRunWindow,
    inAppPaymentsRemoved,
    inferTaskType,
    isManagedSampleAgent,
    jobPromptMatchesCreateBody,
    jobRequesterMatchesCurrent,
    jobSessionMatchesCreateBody,
    json,
    ledgerAmountToDisplayCurrency,
    listCreatorUsageEstimateForOrder,
    mergeProtectedPromptSourceIntoInput,
    normalizeAgentTags,
    normalizeOrderStrategy,
    normalizeTaskTypes,
    nowIso,
    optimizeOrderPromptForBroker,
    orderBodyWithCommonQualityRules,
    orderCreateBodyIsSameContentNewOrderRetry,
    orderCreateSkipIntake,
    orderPreflightForAgent,
    reconcileWorkflowParent,
    requesterContextFromUser,
    requestedFollowupJobIdFromCreateBody,
    reserveBillingEstimateInState,
    resolveAgentJobEndpoint,
    selectedAgentIdFromOrderBody,
    shouldInjectQaOrderCreateFault,
    touchEvent,
    workflowTagHintsForTask
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

  return {
    performSingleJobCreate,
    recentPersistedJobForCreateBody,
    loadOrderCreatePlanningState,
    loadSingleOrderCreateState,
    recoverCreateJobException
  };
}
