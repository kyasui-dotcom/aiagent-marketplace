export function createChatUtilityModalController(options = {}) {
  const {
    state,
    els,
    escapeHtml,
    compact,
    taskLabel,
    statusLabel,
    normalizeChatSession,
    chatSessionTimeLabel,
    groupedAppPanelEntries,
    recentAppAgentEntries,
    usageLibraryHtml,
    refreshWorkerAgents,
    refreshRegisteredApps,
    refreshAppContexts,
    fetchAppContext,
    appendMessage,
    caitAppContextThreadHtml,
    caitAppContextChatPrompt,
    orderErrorMessage,
    loginHref,
    chatUiLanguage,
    chatUiText
  } = options;

  function utilityEmptyHtml(message = 'Nothing to show yet.') {
    return `<div class="utility-empty">${escapeHtml(message)}</div>`;
  }

  function shortDateTime(value = '') {
    const ms = Date.parse(String(value || ''));
    if (!Number.isFinite(ms)) return '';
    return new Date(ms).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function openUtilityModal(title = 'Panel', body = '') {
    if (!els.utilityModal || !els.utilityModalTitle || !els.utilityModalBody) return;
    els.utilityModalTitle.textContent = title;
    els.utilityModalBody.innerHTML = body || utilityEmptyHtml();
    els.utilityModal.hidden = false;
  }

  function utilityModalIsOpen(title = '') {
    return Boolean(els.utilityModal && !els.utilityModal.hidden && els.utilityModalTitle?.textContent === title);
  }

  function closeUtilityModal() {
    if (!els.utilityModal) return;
    els.utilityModal.hidden = true;
  }

  function jobUtilityRows(jobs = []) {
    const rows = (Array.isArray(jobs) ? jobs : []).filter((job) => job?.id).slice(0, 30).map((job) => {
      const task = taskLabel(job.taskType || job.workflowTask || 'work');
      const meta = [
        statusLabel(job),
        shortDateTime(job.createdAt || job.updatedAt || job.completedAt),
        job.id ? `#${String(job.id).slice(0, 8)}` : ''
      ].filter(Boolean).join(' / ');
      const summary = compact(job.output?.summary || job.output?.report?.summary || job.failureReason || job.prompt || '', 180);
      return [
        '<div class="utility-row">',
        '<div class="utility-main">',
        `<strong>${escapeHtml(task)}</strong>`,
        `<span class="utility-meta">${escapeHtml(meta)}</span>`,
        summary ? `<span>${escapeHtml(summary)}</span>` : '',
        '</div>',
        '<div class="utility-actions">',
        `<button class="ghost-btn file-action" type="button" data-utility-open-job="${escapeHtml(job.id)}">Open</button>`,
        '</div>',
        '</div>'
      ].filter(Boolean).join('\n');
    });
    return rows.length ? `<div class="utility-list">${rows.join('\n')}</div>` : utilityEmptyHtml('No chat orders are visible yet.');
  }

  function chatSessionUtilityRows(sessions = []) {
    const rows = (Array.isArray(sessions) ? sessions : [])
      .map(normalizeChatSession)
      .filter(Boolean)
      .sort((left, right) => String(right.updatedAt || '').localeCompare(String(left.updatedAt || '')))
      .slice(0, 80)
      .map((session) => {
        const messageCount = Array.isArray(session.messages) ? session.messages.length : 0;
        const orderCount = new Set([
          session.linkedOrderId,
          ...(Array.isArray(session.relatedOrderIds) ? session.relatedOrderIds : []),
          ...(Array.isArray(session.activeJobIds) ? session.activeJobIds : [])
        ].map((item) => String(item || '').trim()).filter(Boolean)).size;
        const meta = [
          chatSessionTimeLabel(session.updatedAt || session.createdAt),
          messageCount ? `${messageCount} message${messageCount === 1 ? '' : 's'}` : '',
          orderCount ? `${orderCount} related order${orderCount === 1 ? '' : 's'}` : '',
          session.activeWork ? 'live order' : ''
        ].filter(Boolean).join(' / ');
        const preview = compact((Array.isArray(session.messages) ? session.messages.find((message) => message.role === 'assistant')?.body : '') || session.messages?.[0]?.body || '', 180);
        return [
          '<div class="utility-row">',
          '<div class="utility-main">',
          `<strong>${escapeHtml(session.title || 'Chat')}</strong>`,
          meta ? `<span class="utility-meta">${escapeHtml(meta)}</span>` : '',
          preview ? `<span>${escapeHtml(preview)}</span>` : '',
          '</div>',
          '<div class="utility-actions">',
          `<button class="ghost-btn file-action" type="button" data-utility-chat-session-open="${escapeHtml(session.id)}">Open</button>`,
          '</div>',
          '</div>'
        ].filter(Boolean).join('\n');
      });
    return rows.length ? `<div class="utility-list">${rows.join('\n')}</div>` : utilityEmptyHtml('No chat sessions are visible yet.');
  }

  function agentUtilityRows(agents = []) {
    const rows = (Array.isArray(agents) ? agents : []).filter((agent) => agent?.id).slice(0, 60).map((agent) => {
      const taskTypes = Array.isArray(agent.taskTypes) ? agent.taskTypes : (Array.isArray(agent.task_types) ? agent.task_types : []);
      const primaryTask = String(taskTypes[0] || agent.taskType || '').trim();
      const meta = [
        agent.id,
        taskTypes.slice(0, 4).join(', '),
        agent.status || agent.verificationStatus || ''
      ].filter(Boolean).join(' / ');
      return [
        '<div class="utility-row">',
        '<div class="utility-main">',
        `<strong>${escapeHtml(agent.name || taskLabel(primaryTask) || agent.id)}</strong>`,
        `<span class="utility-meta">${escapeHtml(meta)}</span>`,
        agent.description ? `<span>${escapeHtml(compact(agent.description, 190))}</span>` : '',
        '</div>',
        '<div class="utility-actions">',
        primaryTask ? `<button class="ghost-btn file-action" type="button" data-utility-agent-task="${escapeHtml(primaryTask)}" data-utility-agent-id="${escapeHtml(agent.id)}" data-utility-agent-name="${escapeHtml(agent.name || taskLabel(primaryTask) || agent.id)}">Use</button>` : '',
        '</div>',
        '</div>'
      ].filter(Boolean).join('\n');
    });
    return rows.length ? `<div class="utility-list">${rows.join('\n')}</div>` : utilityEmptyHtml('No workers are visible for this account yet.');
  }

  function catalogLoadMoreHtml(kind = '', loaded = 0, total = 0, hasMore = false) {
    const safeLoaded = Math.max(0, Number(loaded || 0));
    const safeTotal = Math.max(safeLoaded, Number(total || 0));
    const count = safeTotal > 0 ? `Showing ${safeLoaded} of ${safeTotal}` : `Showing ${safeLoaded}`;
    if (!hasMore) return safeLoaded ? `<div class="utility-more"><span class="utility-meta">${escapeHtml(count)}</span></div>` : '';
    return [
      '<div class="utility-more">',
      `<span class="utility-meta">${escapeHtml(count)}</span>`,
      `<button class="ghost-btn inline-btn file-action" type="button" data-utility-load-more="${escapeHtml(kind)}">Load more</button>`,
      '</div>'
    ].join('\n');
  }

  function workersPanelHtml(status = '') {
    return [
      '<div class="chat-hint">Use opens a chat order draft with that worker role. Execution still follows normal intake and approval gates.</div>',
      status ? `<div class="chat-hint">${escapeHtml(status)}</div>` : '',
      agentUtilityRows(state.workerAgents),
      catalogLoadMoreHtml('workers', state.workerAgents.length, state.workerAgentsTotal, state.workerAgentsHasMore)
    ].filter(Boolean).join('\n');
  }

  function appPanelHtml(status = '') {
    const appCount = groupedAppPanelEntries(recentAppAgentEntries()).length;
    const total = appCount;
    return [
      status ? `<div class="chat-hint">${escapeHtml(status)}</div>` : '',
      usageLibraryHtml('apps'),
      catalogLoadMoreHtml('apps', appCount, total, false)
    ].filter(Boolean).join('\n');
  }

  async function showWorkerListPanel() {
    openUtilityModal('Workers', state.workerAgents.length ? workersPanelHtml('Refreshing worker list...') : utilityEmptyHtml('Loading first 10 workers...'));
    try {
      await refreshWorkerAgents();
      if (utilityModalIsOpen('Workers')) openUtilityModal('Workers', workersPanelHtml());
    } catch (error) {
      if (utilityModalIsOpen('Workers')) {
        openUtilityModal('Workers', state.workerAgents.length ? workersPanelHtml(orderErrorMessage(error)) : utilityEmptyHtml(orderErrorMessage(error)));
      }
    }
  }

  async function showAppListPanel() {
    openUtilityModal('Apps', appPanelHtml('Loading first 10 registered apps and recent app contexts...'));
    try {
      await Promise.all([
        refreshRegisteredApps(),
        refreshAppContexts()
      ]);
      if (utilityModalIsOpen('Apps')) openUtilityModal('Apps', appPanelHtml());
    } catch (error) {
      if (utilityModalIsOpen('Apps')) {
        openUtilityModal('Apps', appPanelHtml(`Registered apps could not be refreshed. ${orderErrorMessage(error)}`));
      }
    }
  }

  async function loadAppContextIntoChat(contextId = '') {
    const context = await fetchAppContext(contextId);
    appendMessage('assistant', caitAppContextThreadHtml(context), { label: 'App context', tone: 'ok' });
    els.promptInput.value = caitAppContextChatPrompt(context);
    els.promptInput.focus();
    closeUtilityModal();
  }

  async function loadMoreUtilityCatalog(kind = '') {
    if (kind === 'workers') {
      openUtilityModal('Workers', workersPanelHtml('Loading more workers...'));
      try {
        await refreshWorkerAgents({ offset: state.workerAgents.length, append: true, force: true });
        if (utilityModalIsOpen('Workers')) openUtilityModal('Workers', workersPanelHtml());
      } catch (error) {
        if (utilityModalIsOpen('Workers')) openUtilityModal('Workers', workersPanelHtml(orderErrorMessage(error)));
      }
    } else if (kind === 'apps') {
      openUtilityModal('Apps', appPanelHtml('Loading more apps...'));
      try {
        await refreshRegisteredApps({ offset: state.registeredApps.length, append: true, force: true });
        if (utilityModalIsOpen('Apps')) openUtilityModal('Apps', appPanelHtml());
      } catch (error) {
        if (utilityModalIsOpen('Apps')) openUtilityModal('Apps', appPanelHtml(orderErrorMessage(error)));
      }
    }
  }

  function showInfoPanel(statusMessage = '') {
    const auth = state.auth || {};
    const login = auth.login || auth.user?.login || auth.user?.email || '';
    const adminAction = auth.isPlatformAdmin || auth.admin ? '<a class="ghost-btn file-action" href="/admin">Admin</a>' : '';
    const uiLanguage = chatUiLanguage();
    const languageStatus = statusMessage
      ? `<span class="utility-meta" data-ui-language-status>${escapeHtml(statusMessage)}</span>`
      : `<span class="utility-meta" data-ui-language-status>${escapeHtml(chatUiText('English is the default. Change this only when you want CAIt UI text in another language.', '既定は英語です。CAItのUI表示を別の言語にしたい場合だけ変更してください。'))}</span>`;
    openUtilityModal('Info', [
      '<div class="utility-list">',
      '<div class="utility-row"><div class="utility-main">',
      `<strong>${escapeHtml(chatUiText('Account', 'アカウント'))}</strong>`,
      `<span class="utility-meta">${escapeHtml(login || 'Not signed in')}</span>`,
      '</div><div class="utility-actions">',
      auth.loggedIn || login ? `${adminAction}<a class="ghost-btn file-action" href="/account-settings.html">${escapeHtml(chatUiText('Account settings', 'アカウント設定'))}</a><button class="ghost-btn file-action" type="button" data-chat-logout>${escapeHtml(chatUiText('Sign out', 'サインアウト'))}</button>` : `<a class="ghost-btn file-action" href="${escapeHtml(loginHref('google'))}">${escapeHtml(chatUiText('Sign in', 'サインイン'))}</a>`,
      '</div></div>',
      '<div class="utility-row"><div class="utility-main">',
      `<strong>${escapeHtml(chatUiText('Language', '言語'))}</strong>`,
      `<label class="utility-field" for="chatUiLanguageSelect"><span>${escapeHtml(chatUiText('Interface language', '表示言語'))}</span><select id="chatUiLanguageSelect" data-chat-ui-language><option value="en"${uiLanguage === 'en' ? ' selected' : ''}>English</option><option value="ja"${uiLanguage === 'ja' ? ' selected' : ''}>Japanese</option></select></label>`,
      languageStatus,
      '</div><div class="utility-actions">',
      `<a class="ghost-btn file-action" href="/account-settings.html">${escapeHtml(chatUiText('Open settings', '設定を開く'))}</a>`,
      '</div></div>',
      `<div class="utility-row"><div class="utility-main"><strong>${escapeHtml(chatUiText('Resources', 'リソース'))}</strong><span class="utility-meta">${escapeHtml(chatUiText('Docs, terms, privacy, and help.', 'ドキュメント、利用規約、プライバシー、ヘルプです。'))}</span></div><div class="utility-actions"><a class="ghost-btn file-action" href="/help.html">${escapeHtml(chatUiText('Help', 'ヘルプ'))}</a><a class="ghost-btn file-action" href="/resources.html">${escapeHtml(chatUiText('Resources', 'リソース'))}</a></div></div>`,
      '</div>'
    ].join('\n'));
  }

  return {
    utilityEmptyHtml,
    shortDateTime,
    openUtilityModal,
    utilityModalIsOpen,
    closeUtilityModal,
    jobUtilityRows,
    chatSessionUtilityRows,
    showWorkerListPanel,
    showAppListPanel,
    loadAppContextIntoChat,
    loadMoreUtilityCatalog,
    showInfoPanel
  };
}
