import {
  WORK_ACTION_IDS,
  isKnownWorkUiAction
} from './work-action-registry.js?v=20260430b';

export function createClientWorkChatActionController(deps = {}) {
  const {
    state,
    els,
    acceptPreparedOpenChatOrderForDispatch,
    addFlexibleToolInstruction,
    appendOrderChatExchange,
    buildOpenChatLeaderChoiceFollowupAnswer,
    buildOpenChatTimelinePlanClarifyAnswer,
    composeOpenChatPreorderCancelResponse,
    connectXAccount,
    createAndOptionallyRunJob,
    currentVisibleOrderPrompt,
    dispatchOpenChatConfirmedChoice,
    downloadableDeliveryFilesForJob,
    downloadDeliveryZip,
    donationOnlyNotice = '',
    enterOpenChatRevisionChoice,
    flash,
    focusWorkResults,
    jobById,
    loadJobForChatAction,
    looksJapanese,
    openAgentCatalog,
    openAgentListingFlow,
    openChatPreviousAgentMessageBody,
    openChatPreviousUserMessageBody,
    openFeedbackForm,
    openGithubSignIn,
    openJobDetail,
    openMarketingTimelineModal,
    openPrimaryGoogleSignIn,
    openSettingsSection,
    orderInputCounts,
    orderInputFromComposer,
    renderOpenChatChoiceBar,
    safeText,
    switchTab,
    updateCliPanels
  } = deps;

  async function handleOpenChatChoiceCommand(command = '') {
    const normalized = String(command || '').trim();
    if (normalized === WORK_ACTION_IDS.OPEN_MARKETING_TIMELINE) {
      const ja = looksJapanese(openChatPreviousUserMessageBody());
      state.openChatClarifyOptions = [];
      renderOpenChatChoiceBar();
      openMarketingTimelineModal();
      appendOrderChatExchange(ja ? '履歴を見る' : 'open saved schedule timeline', {
        kind: 'command',
        tone: 'info',
        patternId: 'pattern_timeline_opened',
        clearClarifyOptions: true,
        body: ja
          ? 'CHAT TIMELINE ポップアップを開きました。保存済みの run、draft、今後の scheduled action をここで確認できます。'
          : 'Opened the CHAT TIMELINE popup. You can inspect stored runs, drafts, and upcoming scheduled actions here.',
        status: 'Saved schedule timeline opened.\n\nNo order was created and no billing occurred.'
      });
      return;
    }
    if (normalized === 'clarify_timeline_plan') {
      const prompt = String(openChatPreviousUserMessageBody() || 'timeline').trim();
      state.openChatClarifyOptions = [];
      renderOpenChatChoiceBar();
      appendOrderChatExchange(looksJapanese(prompt) ? 'タイムラインを計画したい' : 'plan a new timeline', buildOpenChatTimelinePlanClarifyAnswer(prompt));
      return;
    }
    if (/^select_leader:/i.test(normalized)) {
      const answer = buildOpenChatLeaderChoiceFollowupAnswer(normalized, orderInputCounts(orderInputFromComposer()));
      if (!answer) {
        flash('Leader choice is no longer active.', 'warn');
        state.openChatClarifyOptions = [];
        renderOpenChatChoiceBar();
        return;
      }
      const taskType = String(normalized.split(':')[1] || '').trim();
      const candidates = Array.isArray(state.openChatLeaderChoiceCandidates) ? state.openChatLeaderChoiceCandidates : [];
      const selected = candidates.find((candidate) => String(candidate?.taskType || '').trim() === taskType) || null;
      const ja = looksJapanese(openChatPreviousUserMessageBody()) || looksJapanese(answer?.body || '');
      const label = (ja ? selected?.labelJa : selected?.labelEn) || selected?.labelEn || selected?.labelJa || taskType || 'leader';
      appendOrderChatExchange(label, answer);
      return;
    }
    if (normalized === 'confirm_preorder_order') {
      await dispatchOpenChatConfirmedChoice();
      return;
    }
    if (normalized === 'revise_preorder_order') {
      enterOpenChatRevisionChoice();
      return;
    }
    if (normalized === 'cancel_preorder_order') {
      state.openChatDecisionSuppressed = true;
      state.openChatClarifyOptions = [];
      renderOpenChatChoiceBar();
      await handleChatActionButton('cancel_order');
    }
  }

  async function handleChatActionButton(action = '', detail = {}) {
    const kind = String(action || '').trim();
    if (!isKnownWorkUiAction(kind)) return;
    const handlers = {
      confirm_order: async () => {
        const accepted = acceptPreparedOpenChatOrderForDispatch();
        const inputCounts = orderInputCounts(orderInputFromComposer());
        if (accepted && detail.agentId) {
          state.pendingOrderConfirmation.agentId = String(detail.agentId || '').trim();
        } else if (!accepted && !currentVisibleOrderPrompt() && !inputCounts.urlCount && !inputCounts.fileCount) {
          await dispatchOpenChatConfirmedChoice();
          return;
        } else {
          state.pendingOrderConfirmation = {
            accepted: true,
            agentId: String(detail.agentId || '').trim(),
            acceptedAt: new Date().toISOString()
          };
        }
        flash('Confirmation accepted. Sending the order now.', 'ok');
        await createAndOptionallyRunJob();
      },
      revise_order: async () => { enterOpenChatRevisionChoice(); },
      cancel_order: async () => {
        const ja = looksJapanese(openChatPreviousAgentMessageBody());
        appendOrderChatExchange(ja ? 'キャンセル' : 'cancel', composeOpenChatPreorderCancelResponse(ja));
      },
      connect_github: async () => { openGithubSignIn(); },
      connect_google: async () => { openPrimaryGoogleSignIn({ capabilities: detail.googleCapabilities || detail.capabilities || '' }); },
      connect_x: async () => { connectXAccount({ capabilities: detail.xCapabilities || detail.capabilities || '' }); },
      download_delivery_zip: async () => {
        const orderId = String(detail.orderId || state.selectedJobId || '').trim();
        const job = await loadJobForChatAction(orderId);
        const files = downloadableDeliveryFilesForJob(job || {});
        if (!job?.id || !files.length) {
          flash('No downloadable delivery ZIP is available for this order yet.', 'warn');
          return;
        }
        downloadDeliveryZip(files, job);
      },
      register_card: async () => {
        openSettingsSection('payments');
        safeText(els.stripeCustomerActionResult, donationOnlyNotice);
        flash('In-app payment setup has been removed. External donation support requires review first.', 'warn');
      },
      open_payments: async () => { openSettingsSection('payments'); },
      open_provider: async () => { openSettingsSection('provider'); },
      open_api_keys: async () => { openSettingsSection('keys'); },
      open_cli_tab: async () => { switchTab('connect'); updateCliPanels(state.snapshot); },
      open_settings: async () => { switchTab('settings'); },
      open_feedback_tab: async () => { openFeedbackForm(); },
      open_work_tab: async () => {
        switchTab('work');
        const orderId = String(detail.orderId || '').trim();
        if (orderId) {
          const job = jobById(orderId) || await loadJobForChatAction(orderId);
          if (job?.id) openJobDetail(job.id);
        }
        focusWorkResults();
      },
      browse_agents: async () => { openAgentCatalog(); },
      list_agent: async () => { openAgentListingFlow(); },
      use_agent_team: async () => {
        addFlexibleToolInstruction('Routing preference: use an Agent Team with a Team Leader if multiple specialties or channels improve quality/cost.');
        flash('Added Agent Team routing preference to the composer.', 'ok');
      }
    };
    const handler = handlers[kind];
    if (handler) await handler();
  }

  return {
    handleOpenChatChoiceCommand,
    handleChatActionButton
  };
}
