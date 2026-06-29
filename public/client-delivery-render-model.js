export function createClientDeliveryRenderModel(deps = {}) {
  const {
    visibleDeliveryFiles = (files = []) => (Array.isArray(files) ? files : [])
  } = deps;

  function clarifyingQuestionsFromReport(report = {}) {
    const raw = report?.clarifyingQuestions
      ?? report?.clarifying_questions
      ?? report?.followupQuestions
      ?? report?.follow_up_questions
      ?? report?.questions
      ?? [];
    const values = Array.isArray(raw)
      ? raw
      : String(raw || '').split(/\r?\n|(?:^|\s)\d+\.\s+/);
    return values
      .map((item) => String(item || '').trim().replace(/^[-*]\s+/, ''))
      .filter(Boolean);
  }

  function deliveryStateFromValue(value) {
    const run = value && typeof value === 'object' && !Array.isArray(value) && ('taskType' in value || 'assignedAgentId' in value || 'jobKind' in value || 'createdAt' in value)
      ? value
      : (value?.job && typeof value.job === 'object' ? value.job : null);
    const directDelivery = value?.delivery && typeof value.delivery === 'object' ? value.delivery : null;
    const derivedDelivery = run
      ? {
          report: run.output?.report || null,
          files: visibleDeliveryFiles(run.output?.files),
          returnTargets: run.output?.returnTargets || ['chat', 'api']
        }
      : null;
    return {
      run,
      delivery: directDelivery || derivedDelivery || null
    };
  }

  function deliverySummaryText(report = {}) {
    const lines = [];
    if (report.summary) lines.push(`Summary: ${report.summary}`);
    if (Array.isArray(report.bullets) && report.bullets.length) {
      lines.push('', 'Bullets:');
      report.bullets.forEach((bullet) => lines.push(`- ${bullet}`));
    }
    if (report.nextAction) lines.push('', `Next action: ${report.nextAction}`);
    const questions = clarifyingQuestionsFromReport(report);
    if (questions.length) {
      lines.push('', 'Clarifying questions:');
      questions.forEach((question, index) => lines.push(`${index + 1}. ${question}`));
    }
    return lines.join('\n').trim();
  }

  function workflowChildRunsFromDelivery(run = null, report = {}) {
    const reportChildren = Array.isArray(report?.childRuns) ? report.childRuns : [];
    if (reportChildren.length) return reportChildren;
    const workflowChildren = Array.isArray(run?.workflow?.childRuns) ? run.workflow.childRuns : [];
    return workflowChildren;
  }

  return {
    clarifyingQuestionsFromReport,
    deliveryStateFromValue,
    deliverySummaryText,
    workflowChildRunsFromDelivery
  };
}
