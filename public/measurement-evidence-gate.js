function normalizeUsageId(value = '') {
  return String(value || '').trim().toLowerCase().replace(/[\s./:]+/g, '_').replace(/[^a-z0-9_-]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
}

function listValues(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  const text = String(value || '').trim();
  return text ? [text] : [];
}

export function measurementEvidenceAppManifest(apps = []) {
  return (Array.isArray(apps) ? apps : []).find((entry) => {
    const contract = entry?.contextContract && typeof entry.contextContract === 'object' ? entry.contextContract : {};
    const evidence = contract.evidence && typeof contract.evidence === 'object' ? contract.evidence : {};
    const capabilities = listValues(entry?.capabilities).map(normalizeUsageId);
    const connectors = listValues(entry?.requiredConnectors || entry?.required_connectors).map(normalizeUsageId);
    const sourceApps = listValues(contract.sourceApps || contract.source_apps).map(normalizeUsageId);
    const loadedFlags = listValues(evidence.loadedFlags || evidence.loaded_flags);
    const loadedArtifactTypes = listValues(evidence.loadedArtifactTypes || evidence.loaded_artifact_types);
    return capabilities.includes('analytics_context')
      && connectors.includes('google')
      && (sourceApps.length || loadedFlags.length || loadedArtifactTypes.length);
  }) || null;
}

export function measurementEvidenceAppId(apps = []) {
  return normalizeUsageId(measurementEvidenceAppManifest(apps)?.id || '');
}

export function measurementEvidenceAppName(apps = []) {
  return measurementEvidenceAppManifest(apps)?.name || 'measurement evidence app';
}

export function measurementEvidenceContractRequired(source = {}) {
  if (!source || typeof source !== 'object') return false;
  const input = source.input && typeof source.input === 'object' ? source.input : {};
  const broker = input._broker && typeof input._broker === 'object' ? input._broker : {};
  const intake = source.intake && typeof source.intake === 'object' ? source.intake : {};
  const objects = [source, input, broker, intake].filter((item) => item && typeof item === 'object');
  const explicitRequiredKeys = [
    'measurementEvidenceRequired',
    'measurement_evidence_required',
    'analyticsContextRequired',
    'analytics_context_required',
    'requiresMeasurementEvidence',
    'requires_measurement_evidence'
  ];
  if (objects.some((object) => explicitRequiredKeys.some((key) => object[key] === true))) return true;
  const requiredContextValues = objects
    .flatMap((object) => [
      object.requiredAppContexts,
      object.required_app_contexts,
      object.appContextRequirements,
      object.app_context_requirements,
      object.connectorContextRequirements,
      object.connector_context_requirements
    ])
    .flatMap((value) => Array.isArray(value) ? value : (value ? [value] : []))
    .flatMap((value) => {
      if (value && typeof value === 'object') {
        return [
          value.type,
          value.kind,
          value.id,
          value.capability,
          value.artifact_type,
          value.artifactType,
          value.context_type,
          value.contextType
        ];
      }
      return [value];
    })
    .map(normalizeUsageId)
    .filter(Boolean);
  return requiredContextValues.some((value) => (
    value === 'analytics_context'
    || value === 'measurement_evidence'
    || value === 'ga4_packet'
    || value === 'search_console_packet'
  ));
}

export function measurementEvidenceTextExplicitlyRequests(value = '') {
  const text = String(value || '').trim();
  if (!/(ga4|google analytics|search console|サーチコンソール|アナリティクス)/i.test(text)) return false;
  if (/(skip analytics|without analytics|no analytics|アナリティクスをスキップ)/i.test(text)) return false;
  if (/(ga4|google analytics|search console|サーチコンソール|アナリティクス).{0,32}(使わない|なし|無し|ありません|不要|skip|without|no)/i.test(text)) return false;
  if (/(使わない|なし|無し|ありません|不要|skip|without|no).{0,32}(ga4|google analytics|search console|サーチコンソール|アナリティクス)/i.test(text)) return false;
  return /(使う|使いたい|接続済み|あります|ある|available|connected|use|with|利用)/i.test(text);
}

export function measurementEvidenceDraftExplicitlyRequests(draft = null) {
  if (measurementEvidenceContractRequired(draft || {})) return true;
  const text = [
    draft?.prompt,
    draft?.originalPrompt,
    draft?.input?.original_prompt,
    draft?.input?.originalPrompt
  ].map((item) => String(item || '')).join('\n');
  return measurementEvidenceTextExplicitlyRequests(text);
}

export function measurementEvidenceIntakeHasQuestion(intake = {}) {
  if (measurementEvidenceContractRequired(intake)) return true;
  if (measurementEvidenceTextExplicitlyRequests(intake.originalPrompt || intake.original_prompt || '')) return true;
  const serverOwnedQuestionText = [
    ...(Array.isArray(intake.questions) ? intake.questions : []),
    ...(Array.isArray(intake.missingFields) ? intake.missingFields : []),
    ...(Array.isArray(intake.missing_fields) ? intake.missing_fields : [])
  ].join('\n');
  return /(ga4|google analytics|search console|サーチコンソール|アナリティクス|analytics data|analytics context)/i.test(serverOwnedQuestionText);
}

export function measurementEvidenceAnswerSaysAvailable(answer = '') {
  const text = String(answer || '').trim();
  if (!text) return false;
  const mentionsAnalytics = /(ga4|google analytics|search console|サーチコンソール|アナリティクス|analytics)/i.test(text);
  const affirmative = /(持って(?:い)?る|あります|ある|使えます|使える|接続済み|見れます|見られます|はい|yes|yeah|yep|have|available|connected)/i.test(text);
  const negative = /(持って(?:い)?ない|ありません|ないです|無し|なし|未接続|見れない|見られない|no|not|don't|do not|without|unavailable)/i.test(text);
  return !negative && (mentionsAnalytics ? affirmative || /あり/i.test(text) : affirmative);
}
