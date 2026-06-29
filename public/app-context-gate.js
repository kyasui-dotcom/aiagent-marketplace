function normalizeUsageId(value = '') {
  return String(value || '').trim().toLowerCase().replace(/[\s./:]+/g, '_').replace(/[^a-z0-9_-]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
}

function listValues(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  const text = String(value || '').trim();
  return text ? [text] : [];
}

export function appContextRawContext(context = {}) {
  return context?.raw_context && typeof context.raw_context === 'object'
    ? context.raw_context
    : (context?.rawContext && typeof context.rawContext === 'object' ? context.rawContext : {});
}

export function appContextManifestSourceIds(manifest = {}) {
  const contract = manifest.contextContract && typeof manifest.contextContract === 'object' ? manifest.contextContract : {};
  return [
    manifest.id,
    ...(Array.isArray(contract.sourceApps) ? contract.sourceApps : []),
    ...(Array.isArray(contract.source_apps) ? contract.source_apps : [])
  ].map(normalizeUsageId).filter(Boolean);
}

function manifestContextContractSignals(contract = {}) {
  const evidence = contract.evidence && typeof contract.evidence === 'object' ? contract.evidence : {};
  return [
    ...listValues(contract.sourceApps || contract.source_apps),
    ...listValues(contract.connectorProviders || contract.connector_providers),
    ...listValues(contract.connectorServices || contract.connector_services),
    ...listValues(evidence.loadedFlags || evidence.loaded_flags),
    ...listValues(evidence.loadedArtifactTypes || evidence.loaded_artifact_types)
  ].map(normalizeUsageId).filter(Boolean);
}

export function appContextMatchesManifest(context = {}, manifest = {}) {
  if (!context || typeof context !== 'object' || !manifest || typeof manifest !== 'object') return false;
  const contract = manifest.contextContract && typeof manifest.contextContract === 'object' ? manifest.contextContract : {};
  const contractSignals = manifestContextContractSignals(contract);
  const raw = appContextRawContext(context);
  const sourceIds = appContextManifestSourceIds(manifest);
  const contextSourceIds = [
    context.source_app,
    context.sourceApp,
    context.app_id,
    context.appId,
    raw.source_app,
    raw.sourceApp,
    raw.app_id,
    raw.appId
  ].map(normalizeUsageId).filter(Boolean);
  if (sourceIds.length && contextSourceIds.some((item) => sourceIds.includes(item))) return true;

  const requiredConnectors = listValues(manifest.requiredConnectors || manifest.required_connectors)
    .concat(listValues(contract.connectorProviders || contract.connector_providers))
    .map(normalizeUsageId);
  const connectorSignals = [
    raw.connector_provider,
    raw.provider,
    raw.connector_type,
    raw.connectorType,
    ...(Array.isArray(raw.connector_services) ? raw.connector_services : []),
    ...(Array.isArray(raw.connectorServices) ? raw.connectorServices : [])
  ].map(normalizeUsageId).filter(Boolean);
  if (requiredConnectors.length && connectorSignals.some((item) => requiredConnectors.includes(item))) {
    const serviceHints = listValues(contract.connectorServices || contract.connector_services).map(normalizeUsageId);
    if (!serviceHints.length || connectorSignals.some((item) => serviceHints.includes(item))) return true;
  }

  const evidence = contract.evidence && typeof contract.evidence === 'object' ? contract.evidence : {};
  const loadedArtifactTypes = listValues(evidence.loadedArtifactTypes || evidence.loaded_artifact_types).map(normalizeUsageId);
  if (loadedArtifactTypes.length) {
    const artifactTypes = (Array.isArray(context.artifacts) ? context.artifacts : [])
      .map((artifact) => normalizeUsageId(artifact?.type || artifact?.artifact_type || artifact?.artifactType || ''))
      .filter(Boolean);
    if (artifactTypes.some((item) => loadedArtifactTypes.includes(item))) return true;
  }

  if (contractSignals.length) return false;

  const accepts = listValues(manifest.inputContract?.accepts).map(normalizeUsageId);
  const capabilities = listValues(manifest.capabilities).map(normalizeUsageId);
  const contextTypes = [
    ...(Array.isArray(context.artifacts) ? context.artifacts.map((artifact) => artifact?.type || artifact?.artifact_type || artifact?.artifactType) : []),
    ...(Array.isArray(context.capabilities) ? context.capabilities : []),
    ...(Array.isArray(raw.capabilities) ? raw.capabilities : []),
    ...Object.keys(raw)
  ].map(normalizeUsageId).filter(Boolean);
  return contextTypes.some((item) => accepts.includes(item) || capabilities.includes(item));
}

export function appContextHasLoadedEvidence(context = {}, manifest = {}) {
  if (!appContextMatchesManifest(context, manifest)) return false;
  const contract = manifest.contextContract && typeof manifest.contextContract === 'object' ? manifest.contextContract : {};
  const evidence = contract.evidence && typeof contract.evidence === 'object' ? contract.evidence : {};
  const raw = appContextRawContext(context);
  for (const field of listValues(evidence.loadedFlags || evidence.loaded_flags)) {
    const value = raw[field] ?? context[field];
    if (value === true || String(value || '').toLowerCase() === 'true') return true;
  }
  const loadedArtifactTypes = listValues(evidence.loadedArtifactTypes || evidence.loaded_artifact_types).map(normalizeUsageId);
  const artifacts = Array.isArray(context.artifacts) ? context.artifacts : [];
  return artifacts.some((artifact) => {
    const type = normalizeUsageId(artifact?.type || artifact?.artifact_type || artifact?.artifactType || '');
    if (loadedArtifactTypes.length && !loadedArtifactTypes.includes(type)) return false;
    if (artifact?.loaded === true || String(artifact?.loaded || '').toLowerCase() === 'true') return true;
    return (Array.isArray(artifact?.rows) ? artifact.rows : []).some((row) => (
      row?.loaded === true || String(row?.loaded || '').toLowerCase() === 'true'
    ));
  });
}

export function appContextStatusForDraft(draft = null, manifest = {}) {
  const input = draft?.input && typeof draft.input === 'object' ? draft.input : {};
  const broker = input._broker && typeof input._broker === 'object' ? input._broker : {};
  const contexts = [
    ...(Array.isArray(broker.appContexts) ? broker.appContexts : []),
    ...(Array.isArray(broker.connectorContexts) ? broker.connectorContexts : []),
    ...(Array.isArray(input.appContexts) ? input.appContexts : []),
    ...(Array.isArray(input.connectorContexts) ? input.connectorContexts : [])
  ].filter((context) => appContextMatchesManifest(context, manifest));
  return {
    attached: contexts.length > 0,
    loaded: contexts.some((context) => appContextHasLoadedEvidence(context, manifest)),
    skipped: broker.measurementEvidenceSkipped === true
      || broker.measurement_evidence_skipped === true
      || broker.analyticsContextSkipped === true
      || broker.analytics_context_skipped === true,
    contexts
  };
}

export function appContextAnswerLine(context = {}, manifest = {}) {
  const raw = appContextRawContext(context);
  const evidence = manifest.contextContract?.evidence && typeof manifest.contextContract.evidence === 'object'
    ? manifest.contextContract.evidence
    : {};
  const summaryFields = listValues(evidence.summaryFields || evidence.summary_fields);
  const summary = summaryFields
    .map((field) => raw[field] || context[field])
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(' + ');
  if (summary) return `${manifest.name || 'App'} context attached: ${summary}.`;
  const prompt = String(context?.prompt || context?.summary || context?.title || '').split('\n').map((line) => line.trim()).filter(Boolean)[0];
  return prompt || `Attached context from ${context?.source_app_label || context?.source_app || manifest.name || 'app'}.`;
}
