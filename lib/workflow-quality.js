import { createWorkflowQualityHandoffHelpers } from './workflow-quality-handoff.js';

export function createWorkflowQualityHelpers({
  deliveryCompletionEvidenceScoreForJob,
  isWorkflowLeaderTask,
  leaderActionLayerStart,
  leaderTaskUsesWebSearch,
  nowIso,
  setDeliveryCompletionGate,
  sortWorkflowChildren,
  workflowChildIsLeaderReplanDeferred,
  workflowDispatchLayer,
  workflowJobRequiresSearch,
  workflowLayerLabel,
  workflowLeaderPriorLayerOptionalOnly,
  workflowLeaderPriorLayerUnavailable,
  workflowPrimaryTask,
  workflowSequencePhaseForJob,
  workflowTaskName,
  workflowUnavailablePriorRunIsOptional
} = {}) {
  function workflowSearchSourcesFromReport(report = {}) {
    const raw = Array.isArray(report?.web_sources)
      ? report.web_sources
      : (Array.isArray(report?.sources) ? report.sources : []);
    return raw
      .map((item) => {
        if (!item) return null;
        if (typeof item === 'string') return { url: item, title: '', snippet: '' };
        return {
          url: String(item.url || item.link || '').trim(),
          title: String(item.title || item.name || '').trim(),
          snippet: String(item.snippet || item.description || item.summary || '').trim(),
          query: String(item.query || item.search_query || item.searchQuery || '').trim(),
          action: String(item.action || item.source_action || item.sourceAction || '').trim(),
          provider: String(item.provider || item.search_provider || item.searchProvider || item.source || '').trim()
        };
      })
      .filter((item) => item && (item.url || item.title || item.snippet || item.query))
      .slice(0, 8);
  }
  
  function workflowSearchSourceHasExecutionProof(source = {}) {
    if (!source || typeof source !== 'object') return false;
    const query = String(source.query || '').trim();
    if (query) return true;
    const action = String(source.action || '').trim().toLowerCase();
    if (/(search|brave|web_search|serp|source_collection)/i.test(action)) return true;
    const provider = String(source.provider || '').trim().toLowerCase();
    return /(brave|openai_web_search|web_search|search|serp)/i.test(provider);
  }
  
  function workflowSearchSourcesHaveExecutionProof(sources = []) {
    return (Array.isArray(sources) ? sources : []).some((source) => workflowSearchSourceHasExecutionProof(source));
  }
  
  function workflowSearchCompletionFailureReason(job = {}, report = {}) {
    if (!workflowJobRequiresSearch(job)) return '';
    const sources = workflowSearchSourcesFromReport(report);
    if (!sources.length) return 'Search-required workflow run did not attach any web_sources, so it cannot be completed.';
    if (!workflowSearchSourcesHaveExecutionProof(sources)) {
      return 'Search-required workflow run attached source URLs without search execution proof. Include the search query, search action, or search provider from the source collection step.';
    }
    return '';
  }
  
  function workflowConcreteDeliverableContractForJob(job = {}) {
    const broker = job?.input?._broker && typeof job.input._broker === 'object' ? job.input._broker : {};
    const workflow = broker.workflow && typeof broker.workflow === 'object' ? broker.workflow : {};
    const candidates = [
      workflow.concreteDeliverableContract,
      workflow.concrete_deliverable_contract,
      workflow.deliverableQualityContract,
      workflow.deliverable_quality_contract,
      broker.concreteDeliverableContract,
      broker.concrete_deliverable_contract,
      broker.deliverableQualityContract,
      broker.deliverable_quality_contract,
      broker.agentContract?.deliverableQuality,
      broker.agentContract?.deliverable_quality,
      broker.agentPreflight?.deliverableQuality,
      broker.agentPreflight?.deliverable_quality
    ];
    for (const candidate of candidates) {
      if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) continue;
      const required = candidate.required === true
        || candidate.requires_concrete_deliverable === true
        || candidate.requiresConcreteDeliverable === true;
      if (required) return candidate;
    }
    return null;
  }
  
  function workflowTaskRequiresConcreteSpecialistArtifact(job = {}) {
    if (!job || typeof job !== 'object' || Array.isArray(job)) return false;
    return Boolean(workflowConcreteDeliverableContractForJob(job));
  }
  
  function workflowConcreteArtifactText(job = {}) {
    const output = job?.output && typeof job.output === 'object' ? job.output : {};
    const report = output.report && typeof output.report === 'object' ? output.report : {};
    const files = Array.isArray(output.files) ? output.files : [];
    return [
      output.summary,
      output.file_markdown,
      output.deliverableMarkdown,
      output.deliverable_markdown,
      report.summary,
      report.answer,
      report.recommendation,
      report.file_markdown,
      report.markdown,
      report.deliverableMarkdown,
      report.deliverable_markdown,
      ...(Array.isArray(report.bullets) ? report.bullets : []),
      report.nextAction || report.next_action,
      ...files.map((file) => `${file?.name || ''}\n${file?.content || ''}`)
    ].map((value) => typeof value === 'string' ? value : JSON.stringify(value || '')).join('\n');
  }
  
  function workflowConcreteArtifactFailureReason(job = {}) {
    const task = workflowTaskName(job);
    const contract = workflowConcreteDeliverableContractForJob(job);
    if (!contract) return '';
    const output = job?.output && typeof job.output === 'object' ? job.output : {};
    const files = Array.isArray(output.files) ? output.files : [];
    const report = output.report && typeof output.report === 'object' ? output.report : {};
    const markdownText = [
      output.file_markdown,
      output.deliverableMarkdown,
      output.deliverable_markdown,
      report.file_markdown,
      report.markdown,
      report.deliverableMarkdown,
      report.deliverable_markdown
    ].filter((value) => typeof value === 'string' && value.trim()).join('\n\n');
    const text = workflowConcreteArtifactText(job);
    const fileText = [
      markdownText,
      ...files.map((file) => String(file?.content || ''))
    ].join('\n\n');
    if (/prior_handoff_specialist_packet|prior handoff packet|handoff packet|durable packet|Generation exceeded the retry budget|生成が長引いた|上流handoffの事実/i.test(text)) {
      return `${task} returned only a generic handoff packet, not the concrete deliverable required for this specialist.`;
    }
    if (workflowDeliveryLooksInternalFacing(fileText || text)) {
      return `${task} returned internal-facing handoff or orchestration markdown instead of a user-facing deliverable.`;
    }
    const minChars = Math.max(0, Math.min(5000, Number(contract.min_chars || contract.minChars || 300) || 300));
    const requiresFile = contract.requires_file !== false && contract.requiresFile !== false;
    if (requiresFile && (!files.length || fileText.trim().length < minChars)) {
      return `${task} did not attach a substantial deliverable file.`;
    }
    const requiredTerms = Array.isArray(contract.required_terms || contract.requiredTerms)
      ? (contract.required_terms || contract.requiredTerms).map((item) => String(item || '').trim()).filter(Boolean).slice(0, 12)
      : [];
    const missingTerms = requiredTerms.filter((term) => !text.toLowerCase().includes(term.toLowerCase()));
    if (missingTerms.length) {
      return `${task} missing required deliverable contract terms: ${missingTerms.slice(0, 4).join(', ')}.`;
    }
    const requiredPatterns = Array.isArray(contract.required_patterns || contract.requiredPatterns)
      ? (contract.required_patterns || contract.requiredPatterns).map((item) => String(item || '').trim()).filter(Boolean).slice(0, 12)
      : [];
    for (const patternText of requiredPatterns) {
      try {
        if (!new RegExp(patternText, 'i').test(text)) {
          return `${task} missing required deliverable contract pattern: ${patternText}.`;
        }
      } catch {
        if (!text.toLowerCase().includes(patternText.toLowerCase())) {
          return `${task} missing required deliverable contract text: ${patternText}.`;
        }
      }
    }
    return '';
  }
  
  function workflowDeliveryLooksInternalFacing(text = '') {
    const value = String(text || '');
    if (!value.trim()) return false;
    const headingPattern = /^#{1,6}\s*(?:facts_verified|assumptions_used|evidence_gaps|artifact_for_next_agent|recommended_next_owner|structured handoff digest|supporting fact index|downstream handoff(?: summary| packet)?|採用判断表|publisher下書き状態|external app ingest status)\b/gim;
    if (headingPattern.test(value)) return true;
    const internalLinePattern = /(?:^|\n)\s*(?:[-*]\s*)?(?:source_task_type|source_agent_name|source_run_id|artifact_for_next_agent|recommended_next_owner|Publisher下書き状態|External app ingest status)\s*[:：]/i;
    if (internalLinePattern.test(value)) return true;
    const agentMatrixPattern = /(?:^|\n)\s*\|\s*(?:data_analysis|research|teardown|media_planner|growth|seo_specialist|list_creator)\s*\|/i;
    return agentMatrixPattern.test(value);
  }
  
  function recordWorkflowConcreteArtifactWarning(job = {}, reason = '', checkedAt = nowIso()) {
    const text = String(reason || '').trim();
    if (!job || !text) return false;
    const existing = job.deliveryCompletionGate && typeof job.deliveryCompletionGate === 'object'
      ? job.deliveryCompletionGate
      : {};
    const existingIssues = Array.isArray(existing.issues) ? existing.issues.map((item) => String(item || '').trim()).filter(Boolean) : [];
    const issues = existingIssues.includes(text) ? existingIssues : [...existingIssues, text];
    setDeliveryCompletionGate(job, checkedAt, {
      score: Number.isFinite(Number(existing.score)) ? Number(existing.score) : deliveryCompletionEvidenceScoreForJob(job),
      version: existing.version || 'delivery-completion-gate/v1',
      checkedAt: existing.checkedAt || checkedAt,
      issues,
      completionBlocking: true
    });
    const warningLine = `quality failure: missing required concrete deliverable (${checkedAt})`;
    job.logs = Array.isArray(job.logs) && job.logs.includes(warningLine)
      ? job.logs
      : [...(Array.isArray(job.logs) ? job.logs : []), text, warningLine];
    return true;
  }
  
  const {
    workflowSourceSignalStrings,
    workflowMinimumPriorUseForPhase,
    workflowHandoffPriorDeliverables,
    workflowSlimPriorRunForHandoff,
    workflowExecutionProgram,
    workflowOutputText,
    workflowOutputTextForQuality,
    workflowHandoffClip,
    workflowHandoffBlockClip,
    workflowFlattenTextParts,
    workflowNormalizeCandidateUrl,
    workflowExtractSourceUrls,
    workflowCanonicalBriefFromJob,
    workflowCanonicalBriefPromptLines,
    workflowDigestPushUnique,
    workflowDigestLinesFromText,
    workflowDigestClassifyLines,
    workflowResearchHandoffFromReport,
    workflowStructuredHandoffDigestFromRun,
    workflowStructuredDigestPromptLines,
    workflowStructuredDigestPromptBlock,
    workflowHandoffPromptDataFromRun,
    workflowHandoffOriginalSignals,
    workflowAppContextOriginalSignals,
    workflowTextUsesSignals,
    workflowResearchHandoffRuns,
    workflowExecutionNeedsMultipleInputs,
    workflowCreativeOrActionArtifactPresent
  } = createWorkflowQualityHandoffHelpers({
    leaderActionLayerStart,
    workflowLayerLabel,
    workflowPrimaryTask,
    workflowSearchSourcesFromReport
  });

  function workflowOriginalInfoQualityReview(parent = {}, child = {}) {
    const taskType = workflowTaskName(child);
    if (!taskType || isWorkflowLeaderTask(taskType)) {
      return { applicable: false, passed: true, scope: 'not_applicable', issues: [] };
    }
    const primaryTask = workflowPrimaryTask(parent);
    const phase = workflowSequencePhaseForJob(child);
    const report = child?.output?.report && typeof child.output.report === 'object' ? child.output.report : {};
    const outputText = workflowOutputTextForQuality(child);
    const searchSources = workflowSearchSourcesFromReport(report);
    const searchSignals = workflowSourceSignalStrings(searchSources);
    const searchSignalMatch = workflowTextUsesSignals(outputText, searchSignals);
    const priorRuns = Array.isArray(child?.input?._broker?.workflow?.leaderHandoff?.priorRuns)
      ? child.input._broker.workflow.leaderHandoff.priorRuns
      : [];
    const handoffSignals = workflowHandoffOriginalSignals(priorRuns);
    const handoffSignalMatch = workflowTextUsesSignals(outputText, handoffSignals);
    const researchPriorRuns = workflowResearchHandoffRuns(priorRuns);
    const researchHandoffSignals = workflowHandoffOriginalSignals(researchPriorRuns);
    const researchHandoffSignalMatch = workflowTextUsesSignals(outputText, researchHandoffSignals);
    const requiresSearchEvidence = child?.input?._broker?.workflow?.forceWebSearch === true
      || (phase === 'research' && leaderTaskUsesWebSearch(primaryTask, taskType));
    const issues = [];
    if (requiresSearchEvidence) {
      if (!searchSources.length) issues.push('missing_search_execution');
      if (searchSources.length && !workflowSearchSourcesHaveExecutionProof(searchSources)) issues.push('missing_search_execution');
      if (searchSources.length && workflowSearchSourcesHaveExecutionProof(searchSources) && !searchSignalMatch.used) issues.push('missing_search_content_in_output');
      return {
        applicable: true,
        passed: issues.length === 0,
        scope: 'research_original_info',
        taskType,
        phase,
        searched: workflowSearchSourcesHaveExecutionProof(searchSources),
        usedOriginalInfo: searchSignalMatch.used,
        matchedSignals: searchSignalMatch.matches,
        sourceCount: searchSources.length,
        issues
      };
    }
    if (phase === 'planning') {
      if (!researchPriorRuns.length || !researchHandoffSignals.length) issues.push('missing_research_handoff_for_planning');
      if (researchHandoffSignals.length && !researchHandoffSignalMatch.used) {
        issues.push('planning_ignored_research_handoff');
        issues.push('missing_handoff_original_info_usage');
      }
      return {
        applicable: true,
        passed: issues.length === 0,
        scope: 'planning_research_handoff',
        taskType,
        phase,
        searched: null,
        usedOriginalInfo: researchHandoffSignalMatch.used,
        matchedSignals: researchHandoffSignalMatch.matches,
        sourceCount: researchHandoffSignals.length,
        issues
      };
    }
    if (workflowExecutionNeedsMultipleInputs(phase)) {
      const distinctMatches = handoffSignalMatch.matches.length;
      if (priorRuns.length < 2 || handoffSignals.length < 2) issues.push('missing_multiple_handoff_inputs_for_execution');
      if (handoffSignals.length >= 2 && distinctMatches < 2) {
        issues.push('execution_output_not_based_on_multiple_inputs');
        if (distinctMatches === 0) issues.push('missing_handoff_original_info_usage');
      }
      if (!workflowCreativeOrActionArtifactPresent(outputText)) issues.push('missing_execution_artifact');
      return {
        applicable: true,
        passed: issues.length === 0,
        scope: 'execution_multi_source_handoff',
        taskType,
        phase,
        searched: null,
        usedOriginalInfo: distinctMatches >= 2,
        matchedSignals: handoffSignalMatch.matches,
        sourceCount: handoffSignals.length,
        issues
      };
    }
    if (priorRuns.length && handoffSignals.length) {
      if (!handoffSignalMatch.used) issues.push('missing_handoff_original_info_usage');
      return {
        applicable: true,
        passed: issues.length === 0,
        scope: 'handoff_original_info',
        taskType,
        phase,
        searched: null,
        usedOriginalInfo: handoffSignalMatch.used,
        matchedSignals: handoffSignalMatch.matches,
        sourceCount: handoffSignals.length,
        issues
      };
    }
    return {
      applicable: false,
      passed: true,
      scope: 'not_applicable',
      taskType,
      phase,
      issues: []
    };
  }
  
  function workflowLeaderOutputQualityReview(parent = {}, leaderJob = {}) {
    const taskType = workflowTaskName(leaderJob);
    const phase = workflowSequencePhaseForJob(leaderJob);
    if (!taskType || !isWorkflowLeaderTask(taskType) || !['checkpoint', 'final_summary'].includes(phase)) {
      return { applicable: false, passed: true, scope: 'not_applicable', issues: [] };
    }
    const workflow = leaderJob?.input?._broker?.workflow && typeof leaderJob.input._broker.workflow === 'object'
      ? leaderJob.input._broker.workflow
      : {};
    const hasLeaderHandoff = Boolean(workflow.leaderHandoff && typeof workflow.leaderHandoff === 'object');
    const priorRuns = Array.isArray(workflow.leaderHandoff?.priorRuns)
      ? workflow.leaderHandoff.priorRuns
      : [];
    const unavailablePriorRuns = Array.isArray(workflow.leaderHandoff?.unavailablePriorRuns)
      ? workflow.leaderHandoff.unavailablePriorRuns
      : [];
    if (!hasLeaderHandoff && !priorRuns.length) {
      return { applicable: false, passed: true, scope: 'not_applicable', issues: [] };
    }
    if (!priorRuns.length && unavailablePriorRuns.length && unavailablePriorRuns.every(workflowUnavailablePriorRunIsOptional)) {
      return {
        applicable: true,
        passed: true,
        scope: 'leader_handoff_usage',
        taskType,
        phase,
        usedOriginalInfo: true,
        matchedSignals: [],
        sourceCount: 0,
        priorRunCount: 0,
        unavailablePriorRunCount: unavailablePriorRuns.length,
        skippedUnavailablePriorLayer: true,
        issues: []
      };
    }
    if (!priorRuns.length && workflowLeaderPriorLayerOptionalOnly(parent, leaderJob)) {
      return {
        applicable: true,
        passed: true,
        scope: 'leader_handoff_usage',
        taskType,
        phase,
        usedOriginalInfo: true,
        matchedSignals: [],
        sourceCount: 0,
        priorRunCount: 0,
        unavailablePriorRunCount: 1,
        skippedUnavailablePriorLayer: true,
        issues: []
      };
    }
    if (!priorRuns.length && (unavailablePriorRuns.length || workflowLeaderPriorLayerUnavailable(parent, leaderJob))) {
      return {
        applicable: true,
        passed: false,
        scope: 'leader_handoff_usage',
        taskType,
        phase,
        usedOriginalInfo: false,
        matchedSignals: [],
        sourceCount: 0,
        priorRunCount: 0,
        unavailablePriorRunCount: unavailablePriorRuns.length || 1,
        skippedUnavailablePriorLayer: false,
        issues: ['prior_layer_unavailable']
      };
    }
    const handoffSignals = workflowHandoffOriginalSignals(priorRuns);
    const outputText = workflowOutputText(leaderJob);
    const appContextSignals = workflowAppContextOriginalSignals(leaderJob);
    const appContextSignalMatch = workflowTextUsesSignals(outputText, appContextSignals);
    const signalMatch = workflowTextUsesSignals(outputText, handoffSignals);
    const issues = [];
    if (!priorRuns.length && appContextSignalMatch.used) {
      return {
        applicable: true,
        passed: true,
        scope: 'leader_handoff_usage',
        taskType,
        phase,
        usedOriginalInfo: true,
        matchedSignals: appContextSignalMatch.matches,
        sourceCount: appContextSignals.length,
        priorRunCount: 0,
        appContextSourceCount: appContextSignals.length,
        unavailablePriorRunCount: unavailablePriorRuns.length,
        issues: []
      };
    }
    if (!priorRuns.length) issues.push('missing_leader_handoff_prior_runs');
    if (handoffSignals.length && !signalMatch.used) issues.push('leader_ignored_handoff_prior_runs');
    if (
      priorRuns.length
      && !/(supporting work products|specialist|completed|prior|handoff|synthesis|evidence|action|approval|補助成果物|specialist成果物|完了済み|統合|実行|承認)/i.test(outputText)
    ) {
      issues.push('missing_leader_synthesis_summary');
    }
    return {
      applicable: true,
      passed: issues.length === 0,
      scope: 'leader_handoff_usage',
      taskType,
      phase,
      usedOriginalInfo: signalMatch.used,
      matchedSignals: signalMatch.matches,
      sourceCount: handoffSignals.length,
      priorRunCount: priorRuns.length,
      issues
    };
  }
  
  function workflowApplyQualityReviewToChild(child = {}, review = null) {
    if (!child || !review || typeof review !== 'object') return;
    child.qualityGate = {
      applicable: review.applicable === true,
      passed: review.passed !== false,
      scope: review.scope || 'not_applicable',
      issues: Array.isArray(review.issues) ? review.issues.slice(0, 6) : [],
      matchedSignals: Array.isArray(review.matchedSignals) ? review.matchedSignals.slice(0, 6) : [],
      sourceCount: Number(review.sourceCount || 0) || 0,
      checkedAt: nowIso()
    };
  }
  
  function workflowApplyQualityReviewToLeader(leaderJob = {}, review = null) {
    if (!leaderJob || !review || typeof review !== 'object') return;
    const previousGate = leaderJob.qualityGate && typeof leaderJob.qualityGate === 'object'
      ? leaderJob.qualityGate
      : null;
    const layerReview = previousGate
      ? (previousGate.type === 'leader_output'
        ? (previousGate.layerReview && typeof previousGate.layerReview === 'object' ? previousGate.layerReview : null)
        : {
            applicableCount: Number(previousGate.applicableCount || 0) || 0,
            failedCount: Number(previousGate.failedCount || 0) || 0,
            passed: previousGate.passed !== false,
            summary: String(previousGate.summary || '').slice(0, 500),
            reviews: Array.isArray(previousGate.reviews) ? previousGate.reviews.slice(0, 12) : []
          })
      : null;
    leaderJob.qualityGate = {
      applicable: review.applicable === true,
      passed: review.passed !== false,
      scope: review.scope || 'not_applicable',
      type: 'leader_output',
      issues: Array.isArray(review.issues) ? review.issues.slice(0, 6) : [],
      matchedSignals: Array.isArray(review.matchedSignals) ? review.matchedSignals.slice(0, 6) : [],
      sourceCount: Number(review.sourceCount || 0) || 0,
      priorRunCount: Number(review.priorRunCount || 0) || 0,
      checkedAt: nowIso(),
      ...(layerReview ? { layerReview } : {})
    };
  }
  
  function workflowLeaderQualityGateFailed(parent = {}, leaderJob = {}, scope = 'leader_checkpoint') {
    const review = workflowLeaderOutputQualityReview(parent, leaderJob);
    if (review?.applicable) workflowApplyQualityReviewToLeader(leaderJob, review);
    return review?.applicable && review.passed === false ? review : null;
  }
  
  function workflowLayerQualityGate(parent = {}, children = [], options = {}) {
    const includeAllCompleted = options.includeAllCompleted === true;
    const layer = includeAllCompleted ? null : Math.max(1, Number(options.layer || 1) || 1);
    const candidates = sortWorkflowChildren(parent, children)
      .filter((child) => child.status === 'completed')
      .filter((child) => !isWorkflowLeaderTask(workflowTaskName(child)))
      .filter((child) => !workflowChildIsLeaderReplanDeferred(child))
      .filter((child) => includeAllCompleted || workflowDispatchLayer(parent, child) === layer);
    const reviews = candidates.map((child) => ({
      child,
      review: workflowOriginalInfoQualityReview(parent, child)
    }));
    for (const item of reviews) workflowApplyQualityReviewToChild(item.child, item.review);
    const applicable = reviews.filter((item) => item.review?.applicable);
    const failed = applicable.filter((item) => item.review?.passed === false);
    const summary = failed.length
      ? failed.map((item) => `${workflowTaskName(item.child)}:${(item.review.issues || []).join('+')}`).join(', ')
      : '';
    return {
      applicableCount: applicable.length,
      failedCount: failed.length,
      passed: failed.length === 0,
      summary,
      reviews: applicable.map((item) => ({
        jobId: item.child.id,
        taskType: workflowTaskName(item.child),
        ...item.review
      }))
    };
  }
  
  function appendWorkflowOriginalInfoUsage(job = {}) {
    return;
  }

  return {
    workflowSearchSourcesFromReport,
    workflowSearchSourceHasExecutionProof,
    workflowSearchSourcesHaveExecutionProof,
    workflowSearchCompletionFailureReason,
    workflowConcreteDeliverableContractForJob,
    workflowTaskRequiresConcreteSpecialistArtifact,
    workflowConcreteArtifactText,
    workflowConcreteArtifactFailureReason,
    workflowDeliveryLooksInternalFacing,
    recordWorkflowConcreteArtifactWarning,
    workflowSourceSignalStrings,
    workflowMinimumPriorUseForPhase,
    workflowHandoffPriorDeliverables,
    workflowSlimPriorRunForHandoff,
    workflowExecutionProgram,
    workflowOutputText,
    workflowOutputTextForQuality,
    workflowHandoffClip,
    workflowHandoffBlockClip,
    workflowFlattenTextParts,
    workflowNormalizeCandidateUrl,
    workflowExtractSourceUrls,
    workflowCanonicalBriefFromJob,
    workflowCanonicalBriefPromptLines,
    workflowDigestPushUnique,
    workflowDigestLinesFromText,
    workflowDigestClassifyLines,
    workflowResearchHandoffFromReport,
    workflowStructuredHandoffDigestFromRun,
    workflowStructuredDigestPromptLines,
    workflowStructuredDigestPromptBlock,
    workflowHandoffPromptDataFromRun,
    workflowHandoffOriginalSignals,
    workflowAppContextOriginalSignals,
    workflowTextUsesSignals,
    workflowResearchHandoffRuns,
    workflowExecutionNeedsMultipleInputs,
    workflowCreativeOrActionArtifactPresent,
    workflowOriginalInfoQualityReview,
    workflowLeaderOutputQualityReview,
    workflowApplyQualityReviewToChild,
    workflowApplyQualityReviewToLeader,
    workflowLeaderQualityGateFailed,
    workflowLayerQualityGate,
    appendWorkflowOriginalInfoUsage
  };
}
