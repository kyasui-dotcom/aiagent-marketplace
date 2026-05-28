export function createOrderWorkflowChildDraftBuilders(options = {}) {
  const {
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
  } = options;

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

  return {
    workflowInputForTask,
    buildReusedWorkflowChildJobDraft,
    buildWorkflowChildJobDraft
  };
}
