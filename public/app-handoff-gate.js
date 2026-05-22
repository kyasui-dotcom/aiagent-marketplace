function asSet(values = [], normalize = (value) => String(value || '')) {
  return new Set((Array.isArray(values) ? values : [])
    .map(normalize)
    .filter(Boolean));
}

export function appHandoffArtifactLabel(artifactType = '', options = {}) {
  const normalizeUsageId = options.normalizeUsageId || ((value) => String(value || '').trim());
  const normalized = normalizeUsageId(artifactType);
  return options.labels?.[normalized] || normalized.replace(/_/g, ' ');
}

export function appHandoffEntryMatchesArtifact(entry = {}, artifactType = '', options = {}) {
  const normalizeUsageId = options.normalizeUsageId || ((value) => String(value || '').trim());
  const listValues = options.listValues || ((value) => Array.isArray(value) ? value : []);
  const normalizedType = normalizeUsageId(artifactType);
  if (!normalizedType) return false;
  const accepts = asSet(listValues(entry.inputContract?.accepts), normalizeUsageId);
  const capabilities = asSet(listValues(entry.capabilities), normalizeUsageId);
  if (accepts.has(normalizedType) || capabilities.has(normalizedType)) return true;
  return (options.aliases?.[normalizedType] || [])
    .map(normalizeUsageId)
    .some((alias) => accepts.has(alias) || capabilities.has(alias));
}

export function appHandoffConnectorNotes(entry = {}, artifactType = '', options = {}) {
  const normalizeUsageId = options.normalizeUsageId || ((value) => String(value || '').trim());
  const listValues = options.listValues || ((value) => Array.isArray(value) ? value : []);
  const normalizedType = normalizeUsageId(artifactType);
  const destinationConnectors = entry.inputContract?.destinationConnectors && typeof entry.inputContract.destinationConnectors === 'object'
    ? entry.inputContract.destinationConnectors
    : null;
  if (destinationConnectors) {
    const keys = (options.destinationHints?.[normalizedType] || Object.keys(destinationConnectors))
      .filter((key, index, array) => key && array.indexOf(key) === index);
    return keys
      .map((key) => {
        const destination = destinationConnectors[key];
        if (!destination || typeof destination !== 'object') return '';
        const connector = String(destination.connector || '').trim();
        const capability = String(destination.capability || '').trim();
        const method = String(destination.method || '').trim();
        const detail = [connector, capability, method].filter(Boolean).join(' / ');
        return detail ? `${key.replace(/_/g, ' ')}: ${detail}` : '';
      })
      .filter(Boolean)
      .slice(0, 3);
  }

  const accepts = asSet(listValues(entry.inputContract?.accepts), normalizeUsageId);
  const capabilities = asSet(listValues(entry.capabilities), normalizeUsageId);
  const matchedCapabilities = [
    normalizedType,
    ...(options.aliases?.[normalizedType] || []).map(normalizeUsageId)
  ].filter((item, index, array) => item && array.indexOf(item) === index)
    .filter((item) => capabilities.has(item) || accepts.has(item))
    .slice(0, 3);
  if (matchedCapabilities.length) return [`capability: ${matchedCapabilities.join(' / ')}`];

  const requiredConnectors = listValues(entry.requiredConnectors).map(String).filter(Boolean).slice(0, 3);
  if (requiredConnectors.length) return [`connector: ${requiredConnectors.join(' / ')}`];
  return [];
}

export function renderAppHandoffTree(job = {}, entries = [], options = {}) {
  const escapeHtml = options.escapeHtml || ((value) => String(value || ''));
  const artifactTypes = Array.from(options.deliveryHandoffArtifactTypes?.(job) || []);
  const branches = artifactTypes
    .map((artifactType) => {
      const apps = entries
        .filter((entry) => appHandoffEntryMatchesArtifact(entry, artifactType, options))
        .map((entry) => ({
          name: entry.name || entry.id || 'Registered app',
          notes: appHandoffConnectorNotes(entry, artifactType, options)
        }));
      return apps.length ? { artifactType, apps } : null;
    })
    .filter(Boolean);
  if (!branches.length) return '';

  const branchHtml = branches.map((branch) => {
    const appHtml = branch.apps.map((app) => {
      const notes = app.notes.map((note) => `<span class="app-tree-connector">${escapeHtml(note)}</span>`).join('');
      return `<li><span class="app-tree-app">${escapeHtml(app.name)}</span>${notes}</li>`;
    }).join('');
    return [
      '<li>',
      `<span class="app-tree-artifact">${escapeHtml(appHandoffArtifactLabel(branch.artifactType, options))}</span>`,
      `<ul>${appHtml}</ul>`,
      '</li>'
    ].join('');
  }).join('');

  return [
    '<div class="app-handoff-tree" aria-label="Preparation data app routing tree">',
    '<strong>Preparation data routing</strong>',
    '<div class="chat-hint">This shows which preparation artifact type will be sent to each matching app. Final publish/send actions still happen inside the app or connector.</div>',
    `<ul>${branchHtml}</ul>`,
    '</div>'
  ].join('\n');
}
