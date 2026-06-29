export function createClientAgentAccessController(deps = {}) {
  const {
    state,
    els,
    window,
    productName = 'CAIt',
    productShortName = 'CAIt',
    selectedAgent,
    agentHealth,
    agentVerification,
    agentGithubRepo,
    canAutomateAgentSetup,
    adapterAutomationAlreadyPrepared,
    clipText,
    formatTime,
    flash
  } = deps;

  function agentShareUrl(agent = selectedAgent?.()) {
    if (!agent?.id) return '';
    const url = new URL('/', window.location.origin);
    url.searchParams.set('tab', 'agents');
    url.searchParams.set('agent', agent.id);
    return url.toString();
  }

  function agentSharePost(agent = selectedAgent?.()) {
    if (!agent) return '';
    const tasks = (agent.taskTypes || []).slice(0, 3).join(' / ') || 'general';
    const status = agentHealth(agent).ready ? 'ready to order' : agentVerification(agent).label.toLowerCase();
    const description = clipText(agent.description || '', 110);
    return [
      `I published ${agent.name} on ${productName} beta.`,
      description !== '-' ? description : '',
      `Tasks: ${tasks}.`,
      `Status: ${status}.`,
      `Try it: ${agentShareUrl(agent)}`
    ].filter(Boolean).join(' ');
  }

  function shareAgentOnX(agent = selectedAgent?.()) {
    if (!agent) {
      flash('Select an agent first.', 'error');
      return;
    }
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(agentSharePost(agent))}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    flash('Opened X share composer.', 'ok');
  }

  function currentRunTargetAgent() {
    const agentId = String(els.jobAgentId?.value || '').trim();
    if (!agentId) return null;
    return state.snapshot?.agents?.find((agent) => agent.id === agentId) || null;
  }

  function currentAgentOnboarding(agentId) {
    return agentId ? state.agentOnboarding?.[agentId] || null : null;
  }

  function onboardingFreshEnough(record, ttlMs = 2 * 60 * 1000) {
    const checkedAt = record?.onboarding?.checkedAt || record?.checkedAt || null;
    if (!checkedAt) return false;
    const ts = new Date(checkedAt).getTime();
    return Number.isFinite(ts) && (Date.now() - ts) < ttlMs;
  }

  function authIdentityLogins(auth = {}) {
    const values = [
      auth?.accountLogin,
      auth?.login,
      auth?.user?.login,
      auth?.githubIdentity?.login,
      auth?.googleIdentity?.login,
      ...(Array.isArray(auth?.identityLogins) ? auth.identityLogins : [])
    ];
    return [...new Set(values.map((value) => String(value || '').trim().toLowerCase()).filter(Boolean))];
  }

  function authOwnsAgent(agent, auth = {}) {
    const owner = String(agent?.owner || '').trim().toLowerCase();
    if (!owner) return false;
    return authIdentityLogins(auth).includes(owner);
  }

  function canCheckAgentOnboarding(agent) {
    const auth = state.snapshot?.auth || {};
    return Boolean(agent && (auth.openWriteApiEnabled || authOwnsAgent(agent, auth)));
  }

  function canDeleteAgent(agent) {
    return canCheckAgentOnboarding(agent);
  }

  function canEditAgentPricing(agent) {
    return canCheckAgentOnboarding(agent);
  }

  function onboardingAction(onboarding) {
    if (!onboarding) return null;
    if (onboarding.status === 'ready') {
      return {
        title: 'READY FOR DISPATCH',
        body: onboarding.summary || 'The onboarding check passed.',
        tone: 'ok'
      };
    }
    const title = String(onboarding.nextAction?.title || 'REVIEW ONBOARDING').trim();
    return {
      title: `ACTION: ${title.toUpperCase()}`,
      body: onboarding.nextAction?.body || onboarding.summary || 'Review the onboarding checks for the next required step.',
      tone: onboarding.nextAction?.tone || onboarding.tone || 'warn'
    };
  }

  function renderAgentOnboarding(agent) {
    if (!els.agentOnboarding) return;
    if (!agent) {
      els.agentOnboarding.textContent = 'Select an agent row.';
      return;
    }
    if (state.onboardingLoading?.[agent.id]) {
      els.agentOnboarding.textContent = 'Running onboarding check...';
      return;
    }
    if (!canCheckAgentOnboarding(agent)) {
      els.agentOnboarding.textContent = 'Onboarding check is available to the agent owner after login.';
      return;
    }
    const record = currentAgentOnboarding(agent.id);
    if (!record) {
      els.agentOnboarding.textContent = 'No onboarding result loaded yet. Use CHECK.';
      return;
    }
    if (record.error) {
      els.agentOnboarding.textContent = `Onboarding check failed.\n\nerror: ${record.error}`;
      return;
    }
    const onboarding = record.onboarding || {};
    const repoInfo = agentGithubRepo(agent);
    const automationReady = canAutomateAgentSetup(agent, record);
    const automationPrepared = adapterAutomationAlreadyPrepared(repoInfo);
    const failedChecks = (onboarding.checks || []).filter((item) => String(item?.status || '').toLowerCase() !== 'pass');
    const lines = [
      `Status: ${onboarding.status || '-'}`,
      `Checked: ${formatTime(onboarding.checkedAt)}`,
      `Summary: ${onboarding.summary || '-'}`,
      `Next step: ${onboarding.nextAction?.title || '-'}`,
      ''
    ];
    if (failedChecks.length) {
      lines.push('Blocking checks:');
      failedChecks.slice(0, 4).forEach((item) => {
        lines.push(`- ${item.title}: ${item.detail}`);
        if (item.fix) lines.push(`  Fix: ${item.fix}`);
      });
    } else {
      lines.push('Blocking checks: none');
    }
    if (automationReady) {
      lines.push(
        '',
        'Automation:',
        `GitHub automation is available for ${repoInfo.fullName}.`,
        `Run CHECK and confirm the adapter PR prompt if you want ${productShortName} to prepare the hosted routes.`
      );
    } else if (automationPrepared) {
      lines.push(
        '',
        'Automation:',
        `Adapter PR already prepared for ${repoInfo.fullName}.`,
        'Merge the PR, deploy the app, then import the hosted manifest and rerun CHECK.'
      );
    } else if (repoInfo.fullName && !repoInfo.installationId) {
      lines.push(
        '',
        'Automation:',
        `Repo detected (${repoInfo.fullName}) but GitHub App install access is not available in this session.`,
        'Use INSTALL APP for that repo, then rerun CHECK to allow automatic adapter PR creation.'
      );
    }
    els.agentOnboarding.textContent = lines.join('\n');
  }

  return {
    agentShareUrl,
    agentSharePost,
    shareAgentOnX,
    currentRunTargetAgent,
    currentAgentOnboarding,
    onboardingFreshEnough,
    canCheckAgentOnboarding,
    canDeleteAgent,
    canEditAgentPricing,
    authIdentityLogins,
    authOwnsAgent,
    onboardingAction,
    renderAgentOnboarding
  };
}
