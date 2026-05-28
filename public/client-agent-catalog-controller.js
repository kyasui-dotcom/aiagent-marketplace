export function createClientAgentCatalogController(deps = {}) {
  const {
    state,
    els,
    DEVELOPER_SURFACES_STATUS,
    DEVELOPER_SURFACES_NOTICE,
    activeApiKeys,
    agentComposition,
    agentCompositionSummary,
    agentHealth,
    agentNextAction,
    agentProductKind,
    agentRequirementSummary,
    agentRole,
    agentTags,
    agentTaskFit,
    agentTrustProfile,
    agentVerification,
    agentVerifyAction,
    agentVerifyFailureSummary,
    api,
    applyAgentToRunForm,
    canDeleteAgent,
    canOrderFromBrowser,
    canUseDevApi,
    clipText,
    compareAgents,
    currentRoutingTask,
    deleteAgentRecord,
    escapeHtml,
    estimateWindowOfAgent,
    flash,
    formatPercent,
    formatSecRange,
    isAgentSuiteProduct,
    isCompositeAgentProduct,
    isManagedSampleAgent,
    maybeAutoCheckSelectedAgent,
    parseSearchTokens,
    pricingModelLabel,
    refresh,
    renderOrderComposer,
    runAction,
    safeCssToken,
    safeText,
    selectedAgent,
    selectedJob,
    setAgentDetail,
    shortUrl,
    trackConversionEvent,
    yen
  } = deps;

  function renderAgentTaskFilter(agents = []) {
    if (!els.agentTaskFilter) return;
    const previous = state.agentTaskFilter || '';
    const taskTypes = [...new Set(agents.flatMap((agent) => agent.taskTypes || []))].sort();
    els.agentTaskFilter.innerHTML = '';
    const allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = 'all capabilities';
    els.agentTaskFilter.appendChild(allOption);
    taskTypes.forEach((taskType) => {
      const option = document.createElement('option');
      option.value = String(taskType || '');
      option.textContent = String(taskType || '');
      els.agentTaskFilter.appendChild(option);
    });
    els.agentTaskFilter.value = taskTypes.includes(previous) ? previous : '';
    state.agentTaskFilter = els.agentTaskFilter.value || '';
  }

  function applyAgentQuickFilter(mode) {
    if (!els.agentSearch || !els.agentStatusFilter || !els.agentAvailabilityFilter || !els.agentActionFilter || !els.agentTaskFilter) return;
    const routingTask = currentRoutingTask();
    if (mode === 'ready') {
      els.agentSearch.value = routingTask ? `fit:match task:${routingTask}` : '';
      els.agentStatusFilter.value = 'ready';
      els.agentAvailabilityFilter.value = 'online';
      els.agentActionFilter.value = 'dispatch';
      els.agentTaskFilter.value = routingTask || '';
    } else if (mode === 'verify-failures') {
      els.agentSearch.value = 'verify:failed';
      els.agentStatusFilter.value = 'unverified';
      els.agentAvailabilityFilter.value = '';
      els.agentActionFilter.value = 'verify';
      els.agentTaskFilter.value = '';
    } else if (mode === 'missing-endpoint') {
      els.agentSearch.value = 'endpoint:missing';
      els.agentStatusFilter.value = 'verified';
      els.agentAvailabilityFilter.value = '';
      els.agentActionFilter.value = 'endpoint';
      els.agentTaskFilter.value = '';
    } else if (mode === 'task-mismatch') {
      els.agentSearch.value = routingTask ? `fit:mismatch task:${routingTask}` : 'fit:mismatch';
      els.agentStatusFilter.value = 'ready';
      els.agentAvailabilityFilter.value = 'online';
      els.agentActionFilter.value = '';
      els.agentTaskFilter.value = '';
    }
    state.agentSearch = els.agentSearch.value || '';
    if (state.snapshot) renderAgents(state.snapshot.agents || []);
  }

  function renderAgentOps(agents = []) {
    const verified = agents.filter((agent) => agentHealth(agent).verified);
    const ready = agents.filter((agent) => agentHealth(agent).ready);
    const verifyFailed = agents.filter((agent) => agentHealth(agent).label === 'VERIFY FAIL');
    const degraded = agents.filter((agent) => agentHealth(agent).tone !== 'ok');
    const offline = agents.filter((agent) => !agent.online);
    const noEndpoint = agents.filter((agent) => agentHealth(agent).verified && !agentHealth(agent).endpoint);
    const capabilityCoverage = new Set(agents.flatMap((agent) => agent.taskTypes || [])).size;
    const routingTask = currentRoutingTask();
    const taskReady = ready.filter((agent) => agentTaskFit(agent, routingTask).matches);
    safeText(els.verifiedAgents, verified.length);
    safeText(els.readyAgents, ready.length);
    safeText(els.verifyFailedAgents, verifyFailed.length);
    safeText(els.missingEndpointAgents, noEndpoint.length);
    safeText(els.offlineAgents, offline.length);
    safeText(els.agentCoverage, capabilityCoverage);
    if (els.agentRoutingCoverage) {
      els.agentRoutingCoverage.textContent = `${agents.length} agents total · ${ready.length} ready · ${taskReady.length} match the current task`;
    }
    if (!els.agentOpsBoard) return;
    const list = taskReady.slice(0, 4).map((agent) => `${agent.name} · ${(agent.taskTypes || []).join('/')} · ${yen(estimateWindowOfAgent(agent, routingTask || agent.taskTypes?.[0])?.typicalTotal || 0)}`).join('\n') || '-';
    const mismatchList = ready.filter((agent) => !agentTaskFit(agent, routingTask).matches).slice(0, 4).map((agent) => `${agent.name}: ${(agent.taskTypes || []).join('/') || 'no declared capability'}`).join('\n') || '-';
    els.agentOpsBoard.textContent = [
      `connected_agents: ${agents.length}`,
      `verified: ${verified.length}`,
      `ready_now: ${ready.length}`,
      `needs_attention: ${degraded.length}`,
      `offline: ${offline.length}`,
      `routing_task: ${routingTask || '-'}`,
      '',
      'best current dispatch candidates:',
      list,
      '',
      'task_mismatch_examples:',
      mismatchList
    ].join('\n');
  }

  function renderAgentFilterSummary(agents = []) {
    if (!els.agentFilterSummary) return;
    const filtered = agents.filter(agentMatchesFilters);
    const selected = selectedAgent();
    const readyVisible = filtered.filter((agent) => agentHealth(agent).ready).length;
    const parts = [];
    if (state.agentSearch) parts.push(`search="${state.agentSearch}"`);
    if (state.agentStatusFilter) parts.push(`status=${state.agentStatusFilter}`);
    const currentTask = currentRoutingTask();
    const lines = [
      `${filtered.length}/${agents.length} agents shown · ${readyVisible} ready in results${selected ? ` · selected=${selected.name}` : ''}`,
      `Active filters: ${parts.length ? parts.join(' · ') : 'none'}.${currentTask ? ` Current order task: ${currentTask}.` : ''}`,
      'Search fields: name, owner, description, task, tag, product type, readiness, verify state, verify code, endpoint, next action.',
      'Examples: seo · tag:marketing · owner:kyasui · task:seo · status:ready · verify:failed · endpoint:missing · fit:match'
    ];
    els.agentFilterSummary.textContent = lines.join('\n');
  }

  function agentActionKey(agent) {
    const action = agentNextAction(agent);
    if (action.title.includes('READY FOR DISPATCH')) return 'dispatch';
    if (action.title.includes('VERIFY AGENT')) return 'verify';
    if (action.title.includes('RESTORE AVAILABILITY')) return 'restore';
    if (action.title.includes('ADD JOB ENDPOINT')) return 'endpoint';
    return 'verify';
  }

  function agentMatchesFilters(agent) {
    const { tokens, free } = parseSearchTokens(state.agentSearch);
    const statusFilter = state.agentStatusFilter.trim().toLowerCase();
    const availabilityFilter = state.agentAvailabilityFilter.trim().toLowerCase();
    const actionFilter = state.agentActionFilter.trim().toLowerCase();
    const taskFilter = state.agentTaskFilter.trim().toLowerCase();
    const health = agentHealth(agent);
    const nextAction = agentNextAction(agent);
    const verification = agentVerification(agent);
    const fit = agentTaskFit(agent);
    const verifyAction = agentVerifyAction(agent);
    const composition = agentComposition(agent);
    const tags = agentTags(agent);
    const endpointText = health.endpoints.map((entry) => `${entry.label} ${entry.value}`).join(' ');
    const hay = [
      agent.name,
      agent.description,
      agent.owner,
      (agent.taskTypes || []).join(' '),
      tags.join(' '),
      agent.verificationStatus,
      agent.agentReviewStatus,
      health.verifyLabel,
      health.label,
      health.reviewLabel,
      health.reviewReason,
      health.availability,
      health.endpoint,
      health.healthcheck,
      health.reason,
      verification.category,
      verification.code,
      verification.reason,
      nextAction.title,
      nextAction.body,
      fit.label,
      fit.reason,
      verifyAction.title,
      verifyAction.body,
      agentProductKind(agent),
      agentCompositionSummary(agent),
      composition.mode,
      composition.components.map((component) => [component.name, component.agentId, component.role, component.taskText, component.description].filter(Boolean).join(' ')).join(' '),
      agent.manifestUrl,
      agent.manifestSource,
      endpointText
    ].filter(Boolean).join(' ').toLowerCase();
    const matchesSearch = !free.length || free.every((part) => hay.includes(part));
    const matchesToken = tokens.every(({ key, value }) => {
      if (!value) return true;
      if (['status', 'state'].includes(key)) return [health.label, health.availability, health.verifyLabel, health.reviewLabel, agent.verificationStatus, agent.agentReviewStatus].join(' ').toLowerCase().includes(value);
      if (['availability', 'avail'].includes(key)) return [health.availability, agent.online ? 'online' : 'offline'].join(' ').toLowerCase().includes(value);
      if (['task', 'cap', 'capability'].includes(key)) return (agent.taskTypes || []).some((task) => String(task).toLowerCase().includes(value));
      if (['tag', 'tags', 'team'].includes(key)) return tags.some((tag) => String(tag).toLowerCase().includes(value));
      if (['kind', 'type', 'product'].includes(key)) return [agentProductKind(agent), agentCompositionSummary(agent)].join(' ').toLowerCase().includes(value);
      if (key === 'owner') return String(agent.owner || '').toLowerCase().includes(value);
      if (key === 'verify') return [agent.verificationStatus, health.verifyLabel, verification.category, verification.code, verification.reason].join(' ').toLowerCase().includes(value);
      if (['review', 'safety'].includes(key)) return [agent.agentReviewStatus, health.reviewLabel, health.reviewReason].join(' ').toLowerCase().includes(value);
      if (['action', 'next'].includes(key)) return [nextAction.title, nextAction.body].join(' ').toLowerCase().includes(value);
      if (['fit', 'route'].includes(key)) {
        if (value === 'match') return fit.matches;
        if (value === 'mismatch') return !fit.matches;
        return [fit.label, fit.reason].join(' ').toLowerCase().includes(value);
      }
      if (key === 'endpoint') {
        if (value === 'missing') return !health.endpoint;
        if (value === 'present') return Boolean(health.endpoint);
        return [health.endpoint, health.healthcheck, endpointText].join(' ').toLowerCase().includes(value);
      }
      return hay.includes(value);
    });
    const matchesTask = !taskFilter || (agent.taskTypes || []).includes(taskFilter);
    const degraded = health.tone !== 'ok';
    const matchesStatus = !statusFilter || (statusFilter === 'ready' && health.ready) || (statusFilter === 'verified' && health.verified) || (statusFilter === 'unverified' && !health.verified) || (statusFilter === 'review' && !health.reviewApproved) || (statusFilter === 'offline' && !agent.online) || (statusFilter === 'degraded' && degraded);
    const matchesAvailability = !availabilityFilter || (availabilityFilter === 'online' && agent.online) || (availabilityFilter === 'offline' && !agent.online);
    const matchesAction = !actionFilter || agentActionKey(agent) === actionFilter;
    return matchesSearch && matchesToken && matchesTask && matchesStatus && matchesAvailability && matchesAction;
  }

  function refreshRoutingViews() {
    renderOrderComposer();
    if (state.snapshot) {
      renderAgentOps(state.snapshot.agents || []);
      renderAgents(state.snapshot.agents || []);
      updateCliPanels(state.snapshot);
    }
    const agent = selectedAgent();
    if (agent) setAgentDetail(agent);
  }

  function updateCliPanels(snapshot) {
    const cliAgents = snapshot?.agents || [];
    const cliJobs = snapshot?.jobs || [];
    const cliAccount = snapshot?.accountSettings || {};
    const cliAuth = snapshot?.auth || {};
    const cliCanWrite = canOrderFromBrowser(cliAuth);
    const cliVerified = cliAgents.filter((agent) => agentHealth(agent).verified);
    const cliReady = cliAgents.filter((agent) => agentHealth(agent).ready);
    const cliPrimaryAgent = selectedAgent() || cliReady[0] || cliVerified[0] || cliAgents[0] || null;
    const cliRecentRun = selectedJob() || cliJobs[0] || null;
    const cliEstimate = cliPrimaryAgent ? estimateWindowOfAgent(cliPrimaryAgent, cliPrimaryAgent.taskTypes?.[0] || 'research') : null;
    const cliOrderKeys = activeApiKeys(cliAccount?.apiAccess?.orderKeys || []);
    if (els.cliStatus) {
      els.cliStatus.textContent = [
        `Status: ${DEVELOPER_SURFACES_STATUS}`,
        DEVELOPER_SURFACES_NOTICE,
        `Base URL: ${window.location.origin}`,
        'Public order endpoint: paused',
        'CLI: paused',
        'MCP: paused',
        `Login: ${cliAuth?.loggedIn ? `connected as ${cliAuth?.user?.login || '-'}` : 'not connected'}`,
        `Browser order access: ${cliCanWrite ? 'enabled' : 'login required'}`,
        `Previous CAIt API keys: ${cliOrderKeys.length} active`,
        `Ready agents: ${cliReady.length}`,
        `Verified agents: ${cliVerified.length}`,
        `Last run: ${cliRecentRun?.id || '-'}`,
        `Estimate: ${cliEstimate ? `${yen(cliEstimate.estimateMinTotal)} – ${yen(cliEstimate.estimateMaxTotal)} · ${formatSecRange(cliEstimate.durationMinSec, cliEstimate.durationMaxSec)}` : 'unavailable'}`
      ].join('\n');
    }
    if (els.cliQuickstart) {
      els.cliQuickstart.textContent = [
        '# Coming soon',
        '# CLI and external API-key ordering are temporarily paused.',
        '# Use the browser Chat / Apps / Deliveries / Publisher flows for now.',
        '',
        '# Planned return path:',
        '# 1. stabilize the app handoff + delivery contract',
        '# 2. re-enable CAIT_DEVELOPER_API_ENABLED and CAIT_CLI_ENABLED',
        '# 3. publish updated curl / CLI examples',
        '',
        '# Current public API response:',
        '# 403 developer_api_disabled',
        '',
        '# Current MCP response:',
        '# 503 mcp_disabled'
      ].join('\n');
    }
    if (els.apiExamples) {
      els.apiExamples.textContent = [
        '# Coming soon',
        '# External agent/app API operations are temporarily paused.',
        '# Provider setup should be managed from the browser until the external contract is stable.',
        '',
        '# Planned API surfaces:',
        '# - order creation and delivery reads',
        '# - manifest import and verification',
        '# - app context handoff endpoints',
        '# - MCP discovery and JSON-RPC',
        '',
        '# Current public API response:',
        '# 403 developer_api_disabled'
      ].join('\n');
    }
  }

  function renderAgents(agents = []) {
    if (!els.agentsTable) return;
    const myLogin = state.snapshot?.auth?.user?.login;
    const filtered = [...agents].filter(agentMatchesFilters).sort(compareAgents);
    renderAgentFilterSummary(agents);
    if (!filtered.length) {
      state.selectedAgentId = null;
      setAgentDetail(null);
      els.agentsTable.innerHTML = '<div class="empty">No agents match the current filter.</div>';
      return;
    }
    if (!filtered.some((agent) => agent.id === state.selectedAgentId)) {
      state.selectedAgentId = filtered[0]?.id || null;
    }
    const renderAgentRow = (agent) => {
      const health = agentHealth(agent);
      const nextAction = agentNextAction(agent);
      const verification = agentVerification(agent);
      const fit = agentTaskFit(agent);
      const trust = agentTrustProfile(agent);
      const providerMarkupLabel = pricingModelLabel(agent);
      const sampleLabel = isManagedSampleAgent(agent) ? ' <span class="highlight">[SAMPLE]</span>' : '';
      const roleLabel = agentRole(agent) === 'leader'
        ? ' <span class="highlight">[LEADER]</span>'
        : ' <span class="row-muted">[WORKER]</span>';
      const productLabel = isAgentSuiteProduct(agent)
        ? ' <span class="highlight">[GROUP]</span>'
        : (isCompositeAgentProduct(agent) ? ' <span class="highlight">[COMPOSITE]</span>' : '');
      const ownerLabel = myLogin && agent.owner === myLogin ? ' <span class="highlight">[MY AGENT]</span>' : '';
      const tags = agentTags(agent);
      const tagLabel = tags.length ? `Tags: ${tags.slice(0, 6).join(' / ')}${tags.length > 6 ? ` +${tags.length - 6}` : ''}` : 'Tags: -';
      const compositionLabel = agentCompositionSummary(agent);
      const requirementLabel = agentRequirementSummary(agent);
      const safeHealthTone = safeCssToken(health.tone, 'info');
      const safeTrustTone = safeCssToken(trust.tone, 'info');
      const safeNextTone = safeCssToken(nextAction.tone, 'info');
      const rowActions = [
        health.ready
          ? `<button class="mini-btn try-agent-row-btn" data-try-agent="${escapeHtml(agent.id)}" style="margin-top:6px">USE IN CAIT CHAT</button>`
          : '',
        agent.verificationStatus === 'verified' || isManagedSampleAgent(agent)
          ? ''
          : `<button class="mini-btn verify-agent-btn" data-verify-agent="${escapeHtml(agent.id)}" style="margin-top:6px">VERIFY HEALTH</button>`,
        canDeleteAgent(agent)
          ? `<button class="mini-btn delete-agent-row-btn" data-delete-agent="${escapeHtml(agent.id)}" style="margin-top:6px">DELETE</button>`
          : ''
      ].filter(Boolean).join('');
      return `
    <div class="table-row agents-grid ${state.selectedAgentId === agent.id ? 'selected-row' : ''} ${agent.online ? 'agent-row-online' : 'agent-row-offline'}" data-agent-id="${escapeHtml(agent.id)}">
      <div>${escapeHtml(agent.name)}${sampleLabel}${roleLabel}${productLabel}${ownerLabel}<div class="row-muted">${escapeHtml(agent.owner || '-')}</div><div class="row-muted">${escapeHtml(clipText(agent.description || 'No description provided.', 92))}</div></div>
      <div>${escapeHtml((agent.taskTypes || []).join(', ') || 'no declared capability')}<div class="row-muted">${escapeHtml(tagLabel)}</div><div class="row-muted">${escapeHtml(providerMarkupLabel)} · platform 10%</div>${compositionLabel ? `<div class="row-muted">${escapeHtml(compositionLabel)}</div>` : ''}${requirementLabel ? `<div class="row-muted">${escapeHtml(requirementLabel)}</div>` : ''}<div class="row-muted">${escapeHtml(shortUrl(health.endpoint) || 'no job endpoint')}</div><div class="row-muted">${escapeHtml(clipText(health.reason, 92))}</div></div>
      <div><span class="status-pill ${safeTrustTone}">${escapeHtml(`TRUST ${trust.score}/100`)}</span><div class="row-muted">${escapeHtml(trust.label)}</div><div class="row-muted">${escapeHtml(clipText(trust.summary, 104))}</div></div>
      <div><span class="status-pill ${safeHealthTone}">${escapeHtml(health.label)}</span><div class="row-muted">${escapeHtml(`${health.verifyLabel} · ${agent.online ? 'online' : 'offline'}`)}</div><div class="row-muted">${escapeHtml(`${verification.code || 'no verify code'} · success ${formatPercent(agent.successRate)} · ${agent.avgLatencySec || '-'}s avg`)}</div></div>
      <div><span class="status-pill ${safeNextTone}">${escapeHtml(nextAction.title.replace('ACTION: ', ''))}</span><div class="row-muted">${escapeHtml(fit.label)}</div><div class="row-muted">${escapeHtml(clipText(nextAction.body, 96))}</div><div class="helper-row">${rowActions}</div></div>
    </div>`;
    };
    const leaderAgents = filtered.filter((agent) => agentRole(agent) === 'leader');
    const specialistAgents = filtered.filter((agent) => agentRole(agent) !== 'leader');
    const renderAgentSection = (title, summary, list, emptyText) => `
    <section class="agent-role-section">
      <div class="agent-role-heading">
        <div>
          <div class="section-title">${escapeHtml(title)}</div>
          <div class="agent-role-summary">${escapeHtml(summary)}</div>
        </div>
        <span class="status-pill info">${escapeHtml(`${list.length} shown`)}</span>
      </div>
      ${list.length
        ? `<div class="table-header agents-grid"><div>AGENT</div><div>CAPABILITY</div><div>TRUST</div><div>STATUS</div><div>NEXT STEP</div></div>${list.map(renderAgentRow).join('')}`
        : `<div class="agent-role-empty">${escapeHtml(emptyText)}</div>`}
    </section>
  `;
    els.agentsTable.innerHTML = [
      renderAgentSection(
        'LEADER AGENTS',
        'Plan and coordinate multi-agent work. A leader gathers context, selects or describes specialist agents, sets acceptance criteria, and merges delivery.',
        leaderAgents,
        'No leader agents match the current filters.'
      ),
      renderAgentSection(
        'SPECIALIST AGENTS',
        'Execute one focused capability such as SEO, code, research, writing, X posting, or data analysis.',
        specialistAgents,
        'No specialist agents match the current filters.'
      )
    ].join('');

    [...els.agentsTable.querySelectorAll('[data-agent-id]')].forEach((row) => {
      row.onclick = () => {
        const agent = agents.find((item) => item.id === row.dataset.agentId);
        state.selectedAgentId = agent?.id || null;
        setAgentDetail(agent);
        maybeAutoCheckSelectedAgent(agent);
        if (els.claimAgentId && agent?.id) els.claimAgentId.value = agent.id;
        renderAgents(state.snapshot?.agents || []);
        updateCliPanels(state.snapshot);
      };
    });

    [...els.agentsTable.querySelectorAll('[data-verify-agent]')].forEach((btn) => {
      btn.onclick = async (event) => {
        event.stopPropagation();
        await runAction(btn, async () => {
          const id = btn.dataset.verifyAgent;
          const result = await api(`/api/agents/${id}/verify`, { method: 'POST' });
          delete state.agentOnboarding[id];
          state.selectedAgentId = id;
          setAgentDetail(result.agent);
          renderOrderComposer();
          const verifyFailure = agentVerifyFailureSummary(result.agent);
          void trackConversionEvent('agent_verified', {
            source: 'agent_table',
            status: result.verification?.ok ? 'verified' : 'failed',
            agentId: id
          });
          flash(result.verification?.ok ? `Agent ${id.slice(0, 8)} verified.` : `Agent ${id.slice(0, 8)} verification failed: ${verifyFailure.cause} Next: ${verifyFailure.next}`, result.verification?.ok ? 'ok' : 'error');
          await refresh();
        });
      };
    });

    [...els.agentsTable.querySelectorAll('[data-try-agent]')].forEach((btn) => {
      btn.onclick = (event) => {
        event.stopPropagation();
        const agent = state.snapshot?.agents?.find((item) => item.id === btn.dataset.tryAgent) || null;
        if (!agent) return;
        state.selectedAgentId = agent.id;
        applyAgentToRunForm(agent, {
          switchToRuns: true,
          announce: true,
          message: `CAIt Chat is pinned to ${agent.name}. Ask what to do or prepare the request before sending a funded order.`
        });
      };
    });

    [...els.agentsTable.querySelectorAll('[data-delete-agent]')].forEach((btn) => {
      btn.onclick = async (event) => {
        event.stopPropagation();
        await runAction(btn, async () => {
          const id = btn.dataset.deleteAgent;
          const agent = state.snapshot?.agents?.find((item) => item.id === id) || null;
          await deleteAgentRecord(agent);
        });
      };
    });

    const selected = filtered.find((agent) => agent.id === state.selectedAgentId) || null;
    setAgentDetail(selected);
  }

  return {
    renderAgentTaskFilter,
    applyAgentQuickFilter,
    renderAgentOps,
    renderAgentFilterSummary,
    agentActionKey,
    agentMatchesFilters,
    refreshRoutingViews,
    updateCliPanels,
    renderAgents
  };
}
