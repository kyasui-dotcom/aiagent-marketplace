export function deliveryFileProvenance(file = {}) {
  return {
    taskType: String(file.source_task_type || file.sourceTaskType || '').trim(),
    agentName: String(file.source_agent_name || file.sourceAgentName || '').trim(),
    sourceStatus: String(file.source_status || file.sourceStatus || '').trim(),
    sourcePhase: String(file.source_phase || file.sourcePhase || '').trim(),
    sourceRunId: String(file.source_run_id || file.sourceRunId || '').trim(),
    displayTitle: String(file.display_title || file.displayTitle || file.name || '').trim()
  };
}

export function deliveryFileDisplayTitle(file = {}, fallback = 'delivery.md') {
  return deliveryFileProvenance(file).displayTitle || String(file.name || fallback || 'delivery.md').trim();
}

export function deliveryFileProvenanceParts(file = {}, options = {}) {
  const {
    taskLabel = (value) => String(value || ''),
    includeRun = true
  } = options;
  const provenance = deliveryFileProvenance(file);
  return [
    provenance.agentName ? `Agent: ${provenance.agentName}` : '',
    provenance.taskType ? `Task: ${taskLabel(provenance.taskType)}` : '',
    provenance.sourcePhase ? `Phase: ${provenance.sourcePhase}` : '',
    provenance.sourceStatus ? `Status: ${provenance.sourceStatus}` : '',
    includeRun && provenance.sourceRunId ? `Run: ${provenance.sourceRunId.slice(0, 8)}` : ''
  ].filter(Boolean);
}
