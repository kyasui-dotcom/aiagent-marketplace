import { attachRemovedPaymentActionHandlers } from './client-payment-removal-ui.js?v=20260527a';

export function createClientPrimaryEventBindingsController(deps = {}) {
  const {
    state,
    els,
    productName = 'CAIt',
    productShortName = 'CAIt',
    inAppPaymentsRemoved = false,
    api,
    window,
    setTimeout,
    bindDeveloperSurfaceInteractions,
    bindGithubAgentSetupInteractions,
    canEditAgentPricing,
    closePlanModal,
    closeOrderSettings,
    completeAgentSetup,
    continueOpenChatAsGuest,
    copyTextToClipboard,
    currentMonthPeriod,
    draftAgentSkillManifestFromText,
    ensureGithubLinkedAccess,
    ensureSettingsLogin,
    exportChatTrainingData,
    flash,
    formatAgentApiCommand,
    formatOrderApiCommand,
    hideMarketingTimelineModal,
    loadAgentOnboarding,
    loadGithubRepos,
    openAgentsGithubFlow,
    openDedicatedLoginPage,
    openGithubSignIn,
    openOrderTab,
    openPrimaryGoogleSignIn,
    openSettingsSection,
    refresh,
    render,
    renderAgentSetupFlow,
    renderConnectFlow,
    renderOrderSettingsDrawer,
    renderParallelTools,
    renderSettingsFlow,
    renderWorkFlow,
    resetAgentSetupFlow,
    runAction,
    safeText,
    selectApiKeyRevealToken,
    setDetail,
    showApiKeyRevealResult,
    submitFeedback,
    switchTab,
    syncAgentPricingEditorVisibility,
    trackConversionEvent,
    updateSelectedChatTranscriptReview,
    updateSelectedFeedbackStatus,
    setAdminChatFilter,
    activeFlexibleTool,
    renderFlexibleToolPanel
  } = deps;

  function agentRoutingConfirmationPrompt(payload = {}) {
    const routing = payload.routing_confirmation || {};
    const inferred = routing.inferred || {};
    const upstream = inferred.upstream || {};
    const downstream = inferred.downstream || {};
    const lines = [
      'Confirm inferred agent routing before registration.',
      '',
      `Layer: ${inferred.layer || '-'}`,
      `Role: ${inferred.role || '-'}`,
      `Approval: ${inferred.approval_mode || '-'}`,
      `Task types: ${(inferred.task_types || []).join(', ') || '-'}`,
      `Upstream: ${(upstream.task_types || []).join(', ') || '-'}`,
      `Downstream: ${(downstream.task_types || []).join(', ') || '-'}`,
      '',
      'Register with these settings?'
    ];
    const warnings = Array.isArray(routing.warnings) ? routing.warnings.filter(Boolean) : [];
    if (warnings.length) lines.splice(lines.length - 2, 0, `Warnings: ${warnings.join(' / ')}`);
    return lines.join('\n');
  }

  async function submitAgentRegistrationWithRoutingConfirmation(url, payload) {
    try {
      return await api(url, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    } catch (error) {
      const data = error?.data || {};
      if (error?.status !== 428 || data.code !== 'routing_confirmation_required') throw error;
      setDetail(data);
      const confirmed = window.confirm(agentRoutingConfirmationPrompt(data));
      if (!confirmed) throw new Error('Agent routing confirmation canceled.');
      return api(url, {
        method: 'POST',
        body: JSON.stringify({ ...payload, confirm_routing: true })
      });
    }
  }

  function bindAccountAndConnectHandlers() {
    bindGithubAgentSetupInteractions();
    if (els.googleLoginBtn) els.googleLoginBtn.onclick = openPrimaryGoogleSignIn;
    if (els.githubLoginBtn) els.githubLoginBtn.onclick = () => {
      openGithubSignIn();
    };
    if (els.installGithubAppBtn) els.installGithubAppBtn.onclick = () => {
      const popup = window.open('/auth/github-app/install', '_blank', 'noopener');
      if (!popup) {
        flash(`Open GitHub App install, choose Configure if ${productName} is already installed, add the repo, save, then return and click LOAD MY REPOS.`, 'info');
        window.location.href = '/auth/github-app/install';
        return;
      }
      if (els.repoPreview) {
        els.repoPreview.textContent = [
          'GitHub App setup opened in a new tab.',
          `If ${productName} is already installed, choose Configure.`,
          `Add the repo you want ${productShortName} to access, save, then return here and click LOAD MY REPOS.`
        ].join('\n');
      }
      flash('In GitHub, choose Configure if needed, add the repo, save, then return and click LOAD MY REPOS.', 'info');
    };
    if (els.clearRepoSelectionBtn) els.clearRepoSelectionBtn.onclick = () => {
      state.selectedRepoFullName = '';
      if (els.repoPicker) els.repoPicker.value = '';
      if (els.repoPreview) {
        els.repoPreview.textContent = 'Repo selection cleared. Pick another repo from the list below.';
      }
      renderAgentSetupFlow(state.snapshot?.auth);
      if (els.repoPicker?.scrollIntoView) {
        setTimeout(() => els.repoPicker.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
      }
    };
    if (els.connectHubGithubBtn) els.connectHubGithubBtn.onclick = () => {
      openGithubSignIn();
    };
    if (els.connectHubInstallBtn) els.connectHubInstallBtn.onclick = () => { window.location.href = '/auth/github-app/install'; };
    if (els.connectHubLoadReposBtn) els.connectHubLoadReposBtn.onclick = () => runAction(els.connectHubLoadReposBtn, async () => {
      if (!ensureGithubLinkedAccess({ section: 'agents', requireGithubFlow: true, message: 'Connect GitHub before loading repos.', reconnectMessage: 'GitHub is already linked. Refresh GitHub access before loading repos.' })) return;
      await loadGithubRepos();
    });
    if (els.connectHubOpenAgentsBtn) els.connectHubOpenAgentsBtn.onclick = () => openAgentsGithubFlow();
    if (els.connectHubOpenSettingsOrderBtn) els.connectHubOpenSettingsOrderBtn.onclick = () => {
      window.location.href = '/ai-agent-api.html#api-keys';
    };
    if (els.connectHubCopyOrderBtn) els.connectHubCopyOrderBtn.onclick = () => {
      const token = state.lastIssuedOrderApiKey?.token || '<CAIT_API_KEY>';
      void copyTextToClipboard(formatOrderApiCommand(token), 'Order API example copied.');
    };
    if (els.connectHubOpenAgentsPublishBtn) els.connectHubOpenAgentsPublishBtn.onclick = () => openAgentsGithubFlow();
    if (els.connectHubOpenSettingsAgentBtn) els.connectHubOpenSettingsAgentBtn.onclick = () => {
      window.location.href = '/ai-agent-api.html#api-keys';
    };
    if (els.connectHubCopyAgentBtn) els.connectHubCopyAgentBtn.onclick = () => {
      const token = state.lastIssuedOrderApiKey?.token || '<CAIT_API_KEY>';
      void copyTextToClipboard(formatAgentApiCommand(token), 'CAIt agent API example copied.');
    };
  }

  function bindSettingsAndFeedbackHandlers() {
    if (els.settingsPaymentsTabBtn) els.settingsPaymentsTabBtn.onclick = () => openSettingsSection('payments');
    if (els.settingsProviderTabBtn) els.settingsProviderTabBtn.onclick = () => openSettingsSection('provider');
    if (els.settingsKeysTabBtn) els.settingsKeysTabBtn.onclick = () => openSettingsSection('keys');
    if (els.settingsFunnelTabBtn) els.settingsFunnelTabBtn.onclick = () => openSettingsSection('funnel');
    if (els.settingsReportsTabBtn) els.settingsReportsTabBtn.onclick = () => openSettingsSection('reports');
    if (els.toggleBillingProfileBtn) els.toggleBillingProfileBtn.onclick = () => {
      if (!ensureSettingsLogin()) return;
      state.billingProfileExpanded = !state.billingProfileExpanded;
      renderSettingsFlow(state.snapshot?.accountSettings, state.snapshot?.monthlySummary, state.snapshot?.auth);
    };
    if (els.toggleProviderProfileBtn) els.toggleProviderProfileBtn.onclick = () => {
      if (!ensureSettingsLogin()) return;
      state.providerProfileExpanded = !state.providerProfileExpanded;
      renderSettingsFlow(state.snapshot?.accountSettings, state.snapshot?.monthlySummary, state.snapshot?.auth);
    };
    if (els.refreshSettingsBtn) els.refreshSettingsBtn.onclick = () => {
      if (!ensureSettingsLogin()) return;
      runAction(els.refreshSettingsBtn, async () => {
        state.settingsPeriod = (els.settingsPeriod?.value || currentMonthPeriod()).trim() || currentMonthPeriod();
        switchTab('settings');
        await refresh();
      });
    };
    if (els.submitFeedbackBtn) els.submitFeedbackBtn.onclick = () => runAction(els.submitFeedbackBtn, submitFeedback);
    if (els.feedbackReviewingBtn) els.feedbackReviewingBtn.onclick = () => {
      if (!ensureSettingsLogin()) return;
      runAction(els.feedbackReviewingBtn, async () => {
        await updateSelectedFeedbackStatus('reviewing');
      });
    };
    if (els.feedbackResolvedBtn) els.feedbackResolvedBtn.onclick = () => {
      if (!ensureSettingsLogin()) return;
      runAction(els.feedbackResolvedBtn, async () => {
        await updateSelectedFeedbackStatus('resolved');
      });
    };
    if (els.feedbackReopenBtn) els.feedbackReopenBtn.onclick = () => {
      if (!ensureSettingsLogin()) return;
      runAction(els.feedbackReopenBtn, async () => {
        await updateSelectedFeedbackStatus('open');
      });
    };
    if (els.chatTranscriptReviewingBtn) els.chatTranscriptReviewingBtn.onclick = () => {
      if (!ensureSettingsLogin()) return;
      runAction(els.chatTranscriptReviewingBtn, async () => {
        await updateSelectedChatTranscriptReview('reviewing');
      });
    };
    if (els.chatTranscriptFixedBtn) els.chatTranscriptFixedBtn.onclick = () => {
      if (!ensureSettingsLogin()) return;
      runAction(els.chatTranscriptFixedBtn, async () => {
        await updateSelectedChatTranscriptReview('fixed');
      });
    };
    if (els.chatTranscriptIgnoreBtn) els.chatTranscriptIgnoreBtn.onclick = () => {
      if (!ensureSettingsLogin()) return;
      runAction(els.chatTranscriptIgnoreBtn, async () => {
        await updateSelectedChatTranscriptReview('ignored');
      });
    };
    if (els.chatTrainingExportBtn) els.chatTrainingExportBtn.onclick = () => {
      if (!ensureSettingsLogin()) return;
      runAction(els.chatTrainingExportBtn, async () => {
        await exportChatTrainingData();
      });
    };
    [
      [els.adminChatFilterNeedsReviewBtn, 'needsReview'],
      [els.adminChatFilterHandledBtn, 'handled'],
      [els.adminChatFilterNonMineBtn, 'nonMine'],
      [els.adminChatFilterGuestBtn, 'guest'],
      [els.adminChatFilterOtherBtn, 'other'],
      [els.adminChatFilterMineBtn, 'mine'],
      [els.adminChatFilterAllBtn, 'all']
    ].forEach(([button, filter]) => {
      if (button) button.onclick = () => setAdminChatFilter(filter);
    });
    if (inAppPaymentsRemoved) {
      attachRemovedPaymentActionHandlers(els, { closePlanModal, flash, runAction, safeText });
    }
  }

  function bindLandingAndNavigationHandlers() {
    if (els.logoutBtn) els.logoutBtn.onclick = () => runAction(els.logoutBtn, async () => {
      const result = await api('/auth/logout', { method: 'POST' });
      const redirectTo = String(result?.redirect_to || '/').trim() || '/';
      window.location.href = redirectTo;
    });
    if (els.seedBtn) els.seedBtn.onclick = () => runAction(els.seedBtn, async () => {
      const seeded = await api('/api/seed', { method: 'POST' });
      setDetail(seeded);
      flash(`Seeded ${seeded.job_ids.length} demo runs.`, 'ok');
      await refresh();
    });
    if (els.heroTryBtn) els.heroTryBtn.onclick = openOrderTab;
    if (els.heroSeedBtn) els.heroSeedBtn.onclick = () => els.seedBtn?.click();
    if (els.heroCliBtn) els.heroCliBtn.onclick = () => switchTab('connect');
    if (els.topOpenChatBtn) els.topOpenChatBtn.onclick = openOrderTab;
    if (els.startSignupBtn) els.startSignupBtn.onclick = () => {
      if (state.snapshot?.auth?.loggedIn) {
        openOrderTab();
        return;
      }
      openDedicatedLoginPage({
        source: 'start_cta',
        nextTab: 'work'
      });
    };
    if (els.entryGoogleLoginBtn) els.entryGoogleLoginBtn.onclick = openPrimaryGoogleSignIn;
    if (els.entryGithubLoginBtn) els.entryGithubLoginBtn.onclick = () => {
      openGithubSignIn();
    };
    if (els.entryGuestContinueBtn) els.entryGuestContinueBtn.onclick = continueOpenChatAsGuest;
    if (els.toggleOrderSettingsBtn) els.toggleOrderSettingsBtn.onclick = () => {
      state.orderSettingsExpanded = !state.orderSettingsExpanded;
      renderOrderSettingsDrawer();
    };
    if (els.closeOrderSettingsBtn) els.closeOrderSettingsBtn.onclick = closeOrderSettings;
    if (els.orderSettingsDrawer) els.orderSettingsDrawer.onclick = (event) => {
      if (event.target === els.orderSettingsDrawer) closeOrderSettings();
    };
    if (els.toggleParallelToolsBtn) els.toggleParallelToolsBtn.onclick = () => {
      state.parallelToolsExpanded = !state.parallelToolsExpanded;
      if (state.parallelToolsExpanded) state.orderSettingsExpanded = true;
      renderOrderSettingsDrawer();
      renderParallelTools();
    };
    if (els.startWorkFlowBtn) els.startWorkFlowBtn.onclick = () => {
      state.workFlowMode = 'create';
      state.workFlowShowList = false;
      state.workFlowLastCreatedJobId = null;
      renderWorkFlow(state.snapshot);
    };
    if (els.checkWorkListBtn) els.checkWorkListBtn.onclick = () => {
      state.workFlowMode = '';
      state.workFlowShowList = true;
      if (state.workFlowLastCreatedJobId) state.selectedJobId = state.workFlowLastCreatedJobId;
      render(state.snapshot);
    };
    if (els.backWorkFlowBtn) els.backWorkFlowBtn.onclick = () => {
      if (state.workFlowShowList) state.workFlowShowList = false;
      else if (state.workFlowMode === 'create') state.workFlowMode = '';
      else state.workFlowLastCreatedJobId = null;
      renderWorkFlow(state.snapshot);
    };
    if (els.openConnectQuickstartBtn) els.openConnectQuickstartBtn.onclick = () => {
      state.connectFlowMode = 'quickstart';
      renderConnectFlow();
    };
    if (els.openConnectDocsBtn) els.openConnectDocsBtn.onclick = () => {
      state.connectFlowMode = 'docs';
      renderConnectFlow();
    };
    if (els.backConnectFlowBtn) els.backConnectFlowBtn.onclick = () => {
      state.connectFlowMode = '';
      renderConnectFlow();
    };
  }

  function bindAgentRegistrationHandlers() {
    if (els.draftAgentSkillBtn) els.draftAgentSkillBtn.onclick = () => runAction(els.draftAgentSkillBtn, async () => {
      const skillMd = String(els.agentSkillMd?.value || '').trim();
      const res = await draftAgentSkillManifestFromText(skillMd);
      const warning = Array.isArray(res.warnings) && res.warnings.length ? ` ${res.warnings[0]}` : '';
      flash(`Agent Skill draft JSON created from ${res.skill?.name || 'SKILL.md'}. Review before import.${warning}`, 'ok');
    });
    if (els.startAgentOnboardingBtn) els.startAgentOnboardingBtn.onclick = () => {
      state.agentSetupStarted = true;
      state.agentSetupMode = '';
      state.agentSetupCompletedId = null;
      state.showAgentList = true;
      void trackConversionEvent('agent_publish_started', { source: 'agents_button' });
      renderAgentSetupFlow(state.snapshot?.auth);
    };
    if (els.useGithubOnboardingBtn) els.useGithubOnboardingBtn.onclick = () => {
      state.agentSetupMode = 'github';
      void trackConversionEvent('agent_publish_started', { source: 'github_flow' });
      renderAgentSetupFlow(state.snapshot?.auth);
    };
    if (els.useManualOnboardingBtn) els.useManualOnboardingBtn.onclick = () => {
      state.agentSetupMode = 'manual';
      void trackConversionEvent('agent_publish_started', { source: 'manual_flow' });
      renderAgentSetupFlow(state.snapshot?.auth);
    };
    if (els.resetAgentOnboardingBtn) els.resetAgentOnboardingBtn.onclick = () => {
      if (state.agentSetupMode) {
        state.agentSetupMode = '';
      } else {
        resetAgentSetupFlow();
      }
      renderAgentSetupFlow(state.snapshot?.auth);
    };
    if (els.addAnotherAgentBtn) els.addAnotherAgentBtn.onclick = () => {
      resetAgentSetupFlow({ clearManifest: true, clearSelection: true });
      state.agentSetupStarted = true;
      state.showAgentList = true;
      renderAgentSetupFlow(state.snapshot?.auth);
    };
    if (els.checkAgentListBtn) els.checkAgentListBtn.onclick = () => {
      state.showAgentList = true;
      if (state.agentSetupCompletedId) state.selectedAgentId = state.agentSetupCompletedId;
      renderAgentSetupFlow(state.snapshot?.auth);
      if (state.snapshot) render(state.snapshot);
    };
    if (els.agentFlowGithubLoginBtn) els.agentFlowGithubLoginBtn.onclick = () => {
      openGithubSignIn();
    };
    if (els.registerAgentBtn) els.registerAgentBtn.onclick = () => runAction(els.registerAgentBtn, async () => {
      if (!ensureGithubLinkedAccess({ section: 'agents', message: 'Connect GitHub before registering an agent.' })) return;
      const res = await submitAgentRegistrationWithRoutingConfirmation('/api/agents', {
        name: els.agentName?.value,
        description: els.agentDesc?.value,
        task_types: els.agentTasks?.value,
        provider_markup_rate: Number(els.agentPremium?.value || 0.1),
        token_markup_rate: Number(els.agentPremium?.value || 0.1),
        platform_margin_rate: 0.1
      });
      setDetail(res);
      state.selectedAgentId = res.agent?.id || null;
      delete state.agentOnboarding[state.selectedAgentId];
      void trackConversionEvent('agent_imported', {
        source: 'manual_form',
        status: 'registered',
        agentId: state.selectedAgentId || ''
      });
      flash(`Registered ${res.agent.name}. Token shown in detail panel only once.`, 'ok');
      await refresh();
      if (state.selectedAgentId) await loadAgentOnboarding(state.selectedAgentId, { force: true, silent: true });
      completeAgentSetup(state.selectedAgentId);
      renderAgentSetupFlow(state.snapshot?.auth);
    });
    if (els.importManifestBtn) els.importManifestBtn.onclick = () => runAction(els.importManifestBtn, async () => {
      if (!ensureGithubLinkedAccess({ section: 'agents', message: 'Connect GitHub before importing an agent manifest.' })) return;
      const res = await submitAgentRegistrationWithRoutingConfirmation('/api/agents/import-manifest', { manifest: JSON.parse(els.manifestJson?.value || '{}') });
      setDetail(res);
      state.selectedAgentId = res.agent?.id || null;
      delete state.agentOnboarding[state.selectedAgentId];
      void trackConversionEvent('agent_imported', {
        source: 'manifest_json',
        status: 'imported',
        agentId: state.selectedAgentId || ''
      });
      flash(`Imported manifest for ${res.agent.name}.`, 'ok');
      await refresh();
      if (state.selectedAgentId) await loadAgentOnboarding(state.selectedAgentId, { force: true, silent: true });
      completeAgentSetup(state.selectedAgentId);
      renderAgentSetupFlow(state.snapshot?.auth);
    });
    if (els.importUrlBtn) els.importUrlBtn.onclick = () => runAction(els.importUrlBtn, async () => {
      if (!ensureGithubLinkedAccess({ section: 'agents', message: 'Connect GitHub before importing an agent manifest URL.' })) return;
      const value = (els.manifestUrl?.value || '').trim();
      const res = await submitAgentRegistrationWithRoutingConfirmation('/api/agents/import-url', { manifest_url: value });
      setDetail({ input: value, response: res });
      state.selectedAgentId = res.agent?.id || null;
      delete state.agentOnboarding[state.selectedAgentId];
      void trackConversionEvent('agent_imported', {
        source: 'manifest_url',
        status: 'imported',
        agentId: state.selectedAgentId || ''
      });
      flash(`Manifest URL imported for ${res.agent.name}. Verify before dispatch.`, 'ok');
      await refresh();
      if (state.selectedAgentId) await loadAgentOnboarding(state.selectedAgentId, { force: true, silent: true });
      completeAgentSetup(state.selectedAgentId);
      renderAgentSetupFlow(state.snapshot?.auth);
    });
  }

  function bindGlobalModalHandlers() {
    bindDeveloperSurfaceInteractions();
    if (els.closeMarketingTimelineModalBtn) els.closeMarketingTimelineModalBtn.onclick = () => hideMarketingTimelineModal();
    if (els.marketingTimelineModal) {
      els.marketingTimelineModal.onclick = (event) => {
        if (event.target === els.marketingTimelineModal) hideMarketingTimelineModal();
      };
    }
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && els.apiKeyRevealModal && !els.apiKeyRevealModal.hidden) {
        showApiKeyRevealResult('Use COPY KEY, then press I SAVED IT when the key is stored. Escape does not close this one-time reveal.');
        selectApiKeyRevealToken();
        return;
      }
      if (event.key === 'Escape' && els.planModal && !els.planModal.hidden) {
        closePlanModal();
      }
      if (event.key === 'Escape' && els.marketingTimelineModal && !els.marketingTimelineModal.hidden) {
        hideMarketingTimelineModal();
      }
      if (event.key === 'Escape' && els.flexToolPanel && !els.flexToolPanel.hidden) {
        const tool = activeFlexibleTool();
        state.flexToolDismissedKey = tool?.id || '';
        renderFlexibleToolPanel();
      }
    });
  }

  function bindPrimaryEventHandlers() {
    bindAccountAndConnectHandlers();
    bindSettingsAndFeedbackHandlers();
    bindLandingAndNavigationHandlers();
    bindAgentRegistrationHandlers();
    bindGlobalModalHandlers();
  }

  return {
    bindPrimaryEventHandlers,
    agentRoutingConfirmationPrompt,
    submitAgentRegistrationWithRoutingConfirmation
  };
}
