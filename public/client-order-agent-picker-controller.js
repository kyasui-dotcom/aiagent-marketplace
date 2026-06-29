export function createClientOrderAgentPickerController(deps = {}) {
  const {
    state,
    els,
    document,
    agentComposition,
    agentCompositionSummary,
    agentHealth,
    agentProductKind,
    agentRequirements,
    agentRequirementSummary,
    agentRoutingScore,
    agentTags,
    agentTaskFit,
    compareAgents,
    currentRoutingTask,
    isAgentSuiteProduct,
    isCompositeAgentProduct,
    parseSearchTokens
  } = deps;

  function readyAgentsForTask(taskType = currentRoutingTask()) {
    const requestedTask = String(taskType || '').trim().toLowerCase();
    return (state.snapshot?.agents || []).filter((agent) => {
      const health = agentHealth(agent);
      if (!health.ready) return false;
      if (!requestedTask) return true;
      return agentTaskFit(agent, requestedTask).matches;
    });
  }

  function bestReadyAgentForTask(taskType = currentRoutingTask()) {
    const candidates = readyAgentsForTask(taskType).slice();
    candidates.sort((a, b) => agentRoutingScore(b, taskType) - agentRoutingScore(a, taskType));
    return candidates[0] || null;
  }

  function agentMatchesOrderSearch(agent, query = '', taskType = currentRoutingTask()) {
    const { tokens, free } = parseSearchTokens(query);
    const health = agentHealth(agent);
    const verification = agent?.verificationDetails && typeof agent.verificationDetails === 'object'
      ? agent.verificationDetails
      : {};
    const fit = agentTaskFit(agent, taskType);
    const composition = agentComposition(agent);
    const requirements = agentRequirements(agent);
    const tags = agentTags(agent);
    const endpointText = health.endpoints.map((entry) => `${entry.label} ${entry.value}`).join(' ');
    const hay = [
      agent.id,
      agent.name,
      agent.owner,
      agent.description,
      (agent.taskTypes || []).join(' '),
      tags.join(' '),
      agent.manifestUrl,
      agent.manifestSource,
      agent.verificationStatus,
      agent.agentReviewStatus,
      health.label,
      health.verifyLabel,
      health.reviewLabel,
      health.reviewReason,
      health.availability,
      health.endpointLabel,
      health.healthLabel,
      health.reason,
      health.endpoint,
      health.healthcheck,
      verification.code,
      verification.reason,
      fit.label,
      fit.reason,
      agentProductKind(agent),
      agentCompositionSummary(agent),
      agentRequirementSummary(agent),
      requirements.map((item) => [item.type, item.label, item.purpose, item.fulfillment, item.instructions].filter(Boolean).join(' ')).join(' '),
      composition.mode,
      composition.components.map((component) => [component.name, component.agentId, component.role, component.taskText, component.description].filter(Boolean).join(' ')).join(' '),
      endpointText
    ].filter(Boolean).join(' ').toLowerCase();
    const matchesSearch = !free.length || free.every((part) => hay.includes(part));
    const matchesToken = tokens.every(({ key, value }) => {
      if (!value) return true;
      if (['status', 'state'].includes(key)) return [health.label, health.availability, health.verifyLabel, health.reviewLabel, agent.verificationStatus, agent.agentReviewStatus].join(' ').toLowerCase().includes(value);
      if (['task', 'cap', 'capability'].includes(key)) return (agent.taskTypes || []).some((task) => String(task).toLowerCase().includes(value));
      if (['tag', 'tags', 'team'].includes(key)) return tags.some((tag) => String(tag).toLowerCase().includes(value));
      if (['kind', 'type', 'product'].includes(key)) return [agentProductKind(agent), agentCompositionSummary(agent)].join(' ').toLowerCase().includes(value);
      if (key === 'owner') return String(agent.owner || '').toLowerCase().includes(value);
      if (['verify', 'verification'].includes(key)) return [agent.verificationStatus, health.verifyLabel, verification.code, verification.reason].join(' ').toLowerCase().includes(value);
      if (['review', 'safety'].includes(key)) return [agent.agentReviewStatus, health.reviewLabel, health.reviewReason].join(' ').toLowerCase().includes(value);
      if (key === 'endpoint') {
        if (value === 'missing') return !health.endpoint;
        if (value === 'present') return Boolean(health.endpoint);
        return [health.endpoint, health.healthcheck, endpointText].join(' ').toLowerCase().includes(value);
      }
      if (['fit', 'route'].includes(key)) {
        if (value === 'match') return fit.matches;
        if (value === 'mismatch') return !fit.matches;
        return [fit.label, fit.reason].join(' ').toLowerCase().includes(value);
      }
      if (['id', 'agent'].includes(key)) return [agent.id, agent.name].join(' ').toLowerCase().includes(value);
      return hay.includes(value);
    });
    return matchesSearch && matchesToken;
  }

  function renderOrderAgentSearchSummary(agents = [], filtered = [], taskType = currentRoutingTask(), query = '', selected = null) {
    if (!els.orderAgentSearchSummary) return;
    const readyMatches = readyAgentsForTask(taskType).length;
    const readyVisible = filtered.filter((agent) => agentHealth(agent).ready).length;
    const activeParts = [];
    if (query) activeParts.push(`search="${query}"`);
    if (taskType) activeParts.push(`task=${taskType}`);
    const lines = [
      `${filtered.length}/${agents.length} agents shown · ${readyVisible} ready in results · ${readyMatches} ready match ${taskType || 'the current task'}`,
      `Selected target: ${selected ? `${selected.name} (${agentHealth(selected).label})` : 'AUTO ROUTE'}`,
      `Active filters: ${activeParts.length ? activeParts.join(' · ') : 'none. Leave order settings closed to keep auto route broad.'}`,
      'Search fields: name, owner, description, task, tag, product type, readiness, verify state, endpoint.',
      'Examples: seo · tag:marketing · owner:kyasui · task:research · status:ready · verify:failed · endpoint:missing · fit:match'
    ];
    if (selected && query && !filtered.some((agent) => agent.id === selected.id)) {
      lines.splice(2, 0, 'Pinned agent note: the selected agent stays pinned even if it does not match the current search.');
    }
    els.orderAgentSearchSummary.textContent = lines.join('\n');
  }

  function renderOrderAgentPicker() {
    if (!els.jobAgentPicker) return;
    const taskType = currentRoutingTask() || 'research';
    const query = String(els.jobAgentSearch?.value || state.jobAgentSearch || '').trim();
    state.jobAgentSearch = query;
    const selectedId = String(els.jobAgentId?.value || '').trim();
    const selected = (state.snapshot?.agents || []).find((agent) => agent.id === selectedId) || null;
    const agents = [...(state.snapshot?.agents || [])];
    const ranked = agents
      .filter((agent) => agentMatchesOrderSearch(agent, query, taskType))
      .sort((left, right) => {
        const leftFit = agentTaskFit(left, taskType).matches ? 1 : 0;
        const rightFit = agentTaskFit(right, taskType).matches ? 1 : 0;
        const leftReady = agentHealth(left).ready ? 1 : 0;
        const rightReady = agentHealth(right).ready ? 1 : 0;
        if (leftFit !== rightFit) return rightFit - leftFit;
        if (leftReady !== rightReady) return rightReady - leftReady;
        return compareAgents(left, right);
      });
    const visible = selected && !ranked.some((agent) => agent.id === selected.id)
      ? [selected, ...ranked]
      : ranked;
    const readyMatches = readyAgentsForTask(taskType).length;
    renderOrderAgentSearchSummary(agents, ranked, taskType, query, selected);

    const ownerDocument = document || els.jobAgentPicker.ownerDocument;
    els.jobAgentPicker.innerHTML = '';
    const autoOption = ownerDocument.createElement('option');
    autoOption.value = '';
    autoOption.textContent = `AUTO ROUTE (${readyMatches} ready match${readyMatches === 1 ? '' : 'es'})`;
    els.jobAgentPicker.appendChild(autoOption);

    for (const agent of visible) {
      const option = ownerDocument.createElement('option');
      const health = agentHealth(agent);
      const fit = agentTaskFit(agent, taskType);
      const status = health.ready ? 'READY' : (health.verified ? 'VERIFIED' : health.verifyLabel);
      option.value = agent.id;
      option.textContent = `[${status}] ${agent.name} · ${agent.owner || '-'} · ${(agent.taskTypes || []).join('/') || '-'}${isAgentSuiteProduct(agent) ? ' · group' : (isCompositeAgentProduct(agent) ? ' · composite' : '')}${fit.matches ? '' : ' · task mismatch'}`;
      els.jobAgentPicker.appendChild(option);
    }

    if (!visible.length) {
      const emptyOption = ownerDocument.createElement('option');
      emptyOption.value = '__no_match__';
      emptyOption.textContent = 'No agent matches the current search';
      emptyOption.disabled = true;
      els.jobAgentPicker.appendChild(emptyOption);
    }

    els.jobAgentPicker.value = selectedId && [...els.jobAgentPicker.options].some((option) => option.value === selectedId)
      ? selectedId
      : '';
  }

  return {
    readyAgentsForTask,
    bestReadyAgentForTask,
    agentMatchesOrderSearch,
    renderOrderAgentSearchSummary,
    renderOrderAgentPicker
  };
}
