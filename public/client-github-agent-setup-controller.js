export function createClientGithubAgentSetupController(deps = {}) {
  const {
    state,
    els,
    productName = 'CAIt',
    productShortName = 'CAIt',
    api,
    isGithubAuthorized,
    isGithubLinked,
    renderAgentSetupFlow,
    flash,
    trackConversionEvent,
    canCheckAgentOnboarding,
    currentAgentOnboarding,
    onboardingFreshEnough,
    setAgentDetail,
    renderAgentOnboarding,
    renderAgents,
    setDetail,
    selectGithubRepoInPicker,
    canAutomateAgentSetup,
    agentGithubRepo,
    escapeHtml,
    refresh,
    completeAgentSetup,
    switchTab,
    ensureGithubLinkedAccess,
    importManifestUrlAndVerify,
    runAction
  } = deps;

  function applyRepoFilter() {
    const q = (els.repoSearch?.value || '').trim().toLowerCase();
    state.filteredRepos = !q ? [...state.repos] : state.repos.filter((repo) => `${repo.fullName} ${repo.description || ''}`.toLowerCase().includes(q));
    state.repoPage = 0;
    renderRepoPicker();
  }

  function renderRepoPicker() {
    if (!els.repoPicker) return;
    const start = state.repoPage * state.repoPageSize;
    const items = state.filteredRepos.slice(start, start + state.repoPageSize);
    els.repoPicker.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = items.length ? 'Select GitHub repo...' : 'No repos found';
    els.repoPicker.appendChild(placeholder);
    if (items.length) {
      items.forEach((repo) => {
        const option = document.createElement('option');
        option.value = String(repo.fullName || '');
        option.textContent = `${repo.fullName}${repo.private ? ' 🔒' : ''}`;
        els.repoPicker.appendChild(option);
      });
    }
    els.repoPicker.value = items.some((repo) => String(repo.fullName || '') === state.selectedRepoFullName)
      ? state.selectedRepoFullName
      : '';
    const totalPages = Math.max(1, Math.ceil(state.filteredRepos.length / state.repoPageSize));
    if (els.repoPagerStatus) els.repoPagerStatus.textContent = `${state.filteredRepos.length} repos / page ${state.repoPage + 1} of ${totalPages}`;
    if (els.repoPrevBtn) els.repoPrevBtn.disabled = state.repoPage <= 0;
    if (els.repoNextBtn) els.repoNextBtn.disabled = state.repoPage >= totalPages - 1;
  }

  function resetRepoPicker(message = 'Login first, then load repos.') {
    state.repos = [];
    state.filteredRepos = [];
    state.repoPage = 0;
    state.selectedRepoFullName = '';
    renderRepoPicker();
    if (els.repoPreview) els.repoPreview.textContent = message;
  }

  async function loadGithubRepos(options = {}) {
    const { silent = false, previewMessage = '' } = options;
    const res = await api('/api/github/repos');
    state.repos = res.repos || [];
    state.filteredRepos = [...state.repos];
    state.repoPage = 0;
    renderRepoPicker();
    renderAgentSetupFlow(state.snapshot?.auth);
    if (els.repoPreview) {
      const defaultMessage = state.repos.length
        ? `Repos loaded via ${res.auth_provider || 'github-oauth'} (${res.access_mode || 'public-only'}). Select one.`
        : 'No repos found. Open INSTALL OR CONFIGURE APP, add the repo in GitHub, save, then return and click LOAD MY REPOS.';
      els.repoPreview.textContent = previewMessage || defaultMessage;
    }
    if (!silent) flash(
      state.repos.length
        ? `Loaded ${state.repos.length} repos via ${res.auth_provider || 'github-oauth'} (${res.access_mode || 'public-only'}).`
        : 'GitHub connected, but no installation repos are available yet. Open INSTALL OR CONFIGURE APP, add the repo, save, then load repos again.',
      state.repos.length ? 'ok' : 'info'
    );
    void trackConversionEvent('github_repos_loaded', {
      source: silent ? 'auto' : 'button',
      status: state.repos.length ? 'loaded' : 'empty',
      successCount: state.repos.length,
      silent
    });
    return state.repos;
  }

  async function maybeAutoLoadRepos(auth) {
    const login = auth?.user?.login || '';
    if (!auth?.loggedIn || !login) {
      state.repoAutoLoadedFor = '';
      if (!state.repoAutoLoading) resetRepoPicker();
      return;
    }
    if (!isGithubAuthorized(auth)) {
      state.repoAutoLoadedFor = '';
      if (!state.repoAutoLoading) resetRepoPicker(isGithubLinked(auth)
        ? 'GitHub is linked, but this browser session needs REFRESH GITHUB ACCESS before repo loading.'
        : 'Connect GitHub to load repos.');
      return;
    }
    if (state.repoAutoLoadedFor === login || state.repoAutoLoading) return;
    state.repoAutoLoading = true;
    try {
      const providerLabel = auth?.authProvider === 'github-app' ? 'GitHub App' : 'GitHub OAuth';
      await loadGithubRepos({
        silent: true,
        previewMessage: `${providerLabel} connected. Repos loaded automatically. If none appear, use INSTALL APP and reload.`
      });
      state.repoAutoLoadedFor = login;
      flash(`${providerLabel} active for ${login}. Repos are ready to import.`, 'ok');
    } catch (error) {
      state.repoAutoLoadedFor = '';
      if (els.repoPreview) els.repoPreview.textContent = 'GitHub login succeeded, but repo loading failed. Use LOAD MY REPOS to retry.';
      flash(error.message, 'error');
    } finally {
      state.repoAutoLoading = false;
    }
  }

  async function loadAgentOnboarding(agentId, options = {}) {
    const agent = state.snapshot?.agents?.find((item) => item.id === agentId) || null;
    if (!agent || !canCheckAgentOnboarding(agent)) return null;
    const cached = currentAgentOnboarding(agentId);
    if (!options.force && cached && onboardingFreshEnough(cached)) return cached;
    if (state.onboardingLoading?.[agentId]) return cached || null;
    state.onboardingLoading[agentId] = true;
    if (state.selectedAgentId === agentId) {
      setAgentDetail(agent);
      renderAgentOnboarding(agent);
    }
    try {
      const result = await api(`/api/agents/${agentId}/onboarding-check`);
      state.agentOnboarding[agentId] = result;
      return result;
    } catch (error) {
      const failed = { error: error.message, checkedAt: new Date().toISOString() };
      state.agentOnboarding[agentId] = failed;
      if (!options.silent) flash(error.message, 'error');
      return failed;
    } finally {
      delete state.onboardingLoading[agentId];
      if (state.snapshot) renderAgents(state.snapshot.agents || []);
      const selected = state.snapshot?.agents?.find((item) => item.id === state.selectedAgentId) || null;
      if (selected) {
        setAgentDetail(selected);
        renderAgentOnboarding(selected);
      }
    }
  }

  function maybeAutoCheckSelectedAgent(agent) {
    if (!agent || !canCheckAgentOnboarding(agent)) return;
    const cached = currentAgentOnboarding(agent.id);
    if (state.onboardingLoading?.[agent.id]) return;
    if (cached && onboardingFreshEnough(cached)) return;
    void loadAgentOnboarding(agent.id, { force: true, silent: true });
  }

  function showSelectedRepo() {
    if (!els.repoPicker || !els.repoPreview) return;
    const repo = selectedRepoFromPicker();
    if (!repo) {
      state.selectedRepoFullName = '';
      els.repoPreview.textContent = 'Select a repo to preview manifest load target.';
      renderAgentSetupFlow(state.snapshot?.auth);
      return;
    }
    state.selectedRepoFullName = String(repo.fullName || '');
    const hint = repoAdapterHint(repo);
    const lines = [
      `Repo: ${repo.fullName}`,
      `Default branch: ${repo.defaultBranch || '-'}`,
      `Visibility: ${repo.private ? 'private' : 'public'}`,
      `Homepage: ${repo.homepage || '-'}`,
      hint.manifestUrl ? `Hosted manifest URL: ${hint.manifestUrl}` : 'Hosted manifest URL: set the repo homepage to your deployed app URL, then create the adapter PR.',
      hint.healthUrl ? `Hosted health URL: ${hint.healthUrl}` : '',
      hint.jobUrl ? `Hosted job URL: ${hint.jobUrl}` : ''
    ].filter(Boolean);
    els.repoPreview.textContent = lines.join('\n');
    renderAgentSetupFlow(state.snapshot?.auth);
  }

  function selectedRepoFromPicker() {
    const fullName = String(els.repoPicker?.value || '').trim();
    if (!fullName) return null;
    return state.repos.find((repo) => String(repo.fullName || '') === fullName) || null;
  }

  function normalizePublicBaseUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    try {
      const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
      if (!/^https?:$/i.test(parsed.protocol)) return '';
      return parsed.toString().replace(/\/$/, '');
    } catch {
      return '';
    }
  }

  function repoAdapterHint(repo = null) {
    if (!repo) return { baseUrl: '', manifestUrl: '', healthUrl: '', jobUrl: '' };
    const cacheKey = `${repo.installationId || 'none'}:${repo.fullName || ''}`;
    const cached = state.repoAdapterHints[cacheKey] || {};
    const baseUrl = normalizePublicBaseUrl(cached.baseUrl || repo.homepage || '');
    return {
      baseUrl,
      manifestUrl: cached.manifestUrl || (baseUrl ? `${baseUrl}/api/aiagent2/manifest` : ''),
      healthUrl: cached.healthUrl || (baseUrl ? `${baseUrl}/api/aiagent2/health` : ''),
      jobUrl: cached.jobUrl || (baseUrl ? `${baseUrl}/api/aiagent2/jobs` : '')
    };
  }

  function adapterPrPreview(res = {}) {
    const lines = [
      `PR: ${res.pull_request?.htmlUrl || res.pull_request?.html_url || ''}`.trim(),
      `Branch: ${res.branch || ''}`.trim(),
      `Framework: ${res.framework || ''}`.trim(),
      res.deployment_base_url ? `Deploy base URL: ${res.deployment_base_url}` : 'Deploy base URL: set the GitHub repo homepage to your deployed app URL for auto-import.',
      '',
      'Hosted routes after deploy:',
      `${res.manifest_route || '/api/aiagent2/manifest'}`,
      `${res.health_route || '/api/aiagent2/health'}`,
      `${res.job_route || '/api/aiagent2/jobs'}`,
      '',
      res.suggested_manifest_url ? `Suggested manifest URL: ${res.suggested_manifest_url}` : 'Suggested manifest URL: unavailable until the repo homepage points at the deployed app.',
      '',
      `Required env: ${(res.required_env || []).join(', ') || 'OPENAI_API_KEY'}`,
      (res.optional_env || []).length ? `Optional env: ${(res.optional_env || []).join(', ')}` : '',
      '',
      res.next_step || ''
    ].filter(Boolean);
    return lines.join('\n');
  }

  function setRepoActionPreview(message = '') {
    if (!els.repoPreview) return;
    els.repoPreview.textContent = String(message || '').trim();
  }

  function setOpenAdapterPr(url = '') {
    const safe = String(url || '').trim();
    if (!els.openAdapterPrBtn) return;
    els.openAdapterPrBtn.hidden = !safe;
    if (safe) els.openAdapterPrBtn.dataset.url = safe;
    else delete els.openAdapterPrBtn.dataset.url;
  }

  function writeAdapterPrPopup(popup, title, lines = []) {
    if (!popup || popup.closed) return;
    const safeTitle = escapeHtml(String(title || ''));
    const safeBody = lines.map((line) => escapeHtml(String(line || ''))).join('\n');
    popup.document.open();
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${safeTitle}</title></head><body style="margin:0;background:#09111f;color:#edf3ff;font:16px 'IBM Plex Sans','IBM Plex Mono','Courier New',monospace;"><pre style="margin:0;padding:24px;white-space:pre-wrap">${safeTitle}\n\n${safeBody}</pre></body></html>`);
    popup.document.close();
  }

  async function createAdapterPrForRepo(repo, options = {}) {
    if (!repo) throw new Error('Select a repo first.');
    const popupWindow = options.popupWindow || null;
    let res;
    try {
      res = await api('/api/github/create-adapter-pr', {
        method: 'POST',
        body: JSON.stringify({
          owner: repo.owner,
          repo: repo.name,
          installation_id: repo.installationId || undefined,
          confirm_adapter_pr: true
        })
      });
    } catch (error) {
      setOpenAdapterPr('');
      writeAdapterPrPopup(popupWindow, 'Adapter PR creation failed', [
        `Repo: ${repo.fullName}`,
        '',
        String(error.message || error || 'Unknown error'),
        '',
        `Return to ${productName} and retry.`
      ]);
      setRepoActionPreview([
        `Adapter PR creation failed for ${repo.fullName}.`,
        '',
        String(error.message || error || 'Unknown error'),
        '',
        'Checks:',
        '- GitHub App permissions must be Contents=read/write and Pull requests=read/write.',
        '- Accept the updated permissions on the installation after changing them.',
        '- CREATE ADAPTER PR supports direct Next.js routes and standalone Worker adapters for other repos.',
        `- ${productShortName} refuses to overwrite existing non-marketplace adapter files.`
      ].join('\n'));
      throw error;
    }
    const cacheKey = `${repo.installationId || 'none'}:${repo.fullName || ''}`;
    state.repoAdapterHints[cacheKey] = {
      baseUrl: res.deployment_base_url || repo.homepage || '',
      manifestUrl: res.suggested_manifest_url || '',
      healthUrl: res.suggested_healthcheck_url || '',
      jobUrl: res.suggested_job_url || '',
      pullRequestUrl: res.pull_request?.htmlUrl || res.pull_request?.html_url || ''
    };
    if (els.manifestUrl && res.suggested_manifest_url) els.manifestUrl.value = res.suggested_manifest_url;
    setDetail(res);
    if (options.updateRepoSelection !== false) selectGithubRepoInPicker(repo);
    const pullRequestUrl = res.pull_request?.htmlUrl || res.pull_request?.html_url || '';
    setOpenAdapterPr(pullRequestUrl);
    setRepoActionPreview(adapterPrPreview(res));
    if (pullRequestUrl && popupWindow && !popupWindow.closed) {
      popupWindow.location.replace(pullRequestUrl);
    }
    flash(`Adapter PR created for ${repo.fullName}. The PR was opened in a new tab. Review and merge it before verify.`, 'ok');
    void trackConversionEvent('adapter_pr_created', {
      source: 'github_adapter',
      status: 'created',
      agentSource: repo.private ? 'private_repo' : 'public_repo'
    });
    return res;
  }

  async function maybeOfferAutomatedAgentSetup(agent, record) {
    if (!canAutomateAgentSetup(agent, record)) return false;
    const repoInfo = agentGithubRepo(agent);
    const confirmed = window.confirm([
      `${agent.name} still needs hosted setup before public dispatch is ready.`,
      '',
      `${productShortName} can automate this by creating a GitHub PR for ${repoInfo.fullName}.`,
      'The PR adds hosted /api/aiagent2/health, /api/aiagent2/jobs, and /api/aiagent2/manifest routes.',
      '',
      'Create the adapter PR now?'
    ].join('\n'));
    if (!confirmed) return false;
    await createAdapterPrForRepo({
      owner: repoInfo.owner,
      name: repoInfo.name,
      fullName: repoInfo.fullName,
      installationId: repoInfo.installationId,
      homepage: repoInfo.homepage,
      private: repoInfo.private
    });
    return true;
  }

  function bindGithubAgentSetupInteractions() {
    if (els.loadReposBtn) els.loadReposBtn.onclick = () => runAction(els.loadReposBtn, async () => {
      if (!ensureGithubLinkedAccess({ section: 'agents', requireGithubFlow: true, message: 'Connect GitHub before loading repos.', reconnectMessage: 'GitHub is already linked. Refresh GitHub access before loading repos.' })) return;
      await loadGithubRepos();
    });
    if (els.repoPicker) els.repoPicker.onchange = showSelectedRepo;
    if (els.repoSearch) els.repoSearch.oninput = applyRepoFilter;
    if (els.repoPrevBtn) els.repoPrevBtn.onclick = () => { if (state.repoPage > 0) { state.repoPage -= 1; renderRepoPicker(); } };
    if (els.repoNextBtn) els.repoNextBtn.onclick = () => {
      const totalPages = Math.max(1, Math.ceil(state.filteredRepos.length / state.repoPageSize));
      if (state.repoPage < totalPages - 1) {
        state.repoPage += 1;
        renderRepoPicker();
      }
    };
    if (els.openAdapterPrBtn) els.openAdapterPrBtn.onclick = () => {
      const url = String(els.openAdapterPrBtn.dataset.url || '').trim();
      if (!url) return flash('No PR URL is available yet.', 'error');
      window.open(url, '_blank', 'noopener,noreferrer');
    };
    if (els.generateRepoManifestBtn) els.generateRepoManifestBtn.onclick = () => runAction(els.generateRepoManifestBtn, async () => {
      if (!ensureGithubLinkedAccess({ section: 'agents', requireGithubFlow: true, message: 'Connect GitHub before generating a repo draft.', reconnectMessage: 'GitHub is already linked. Refresh GitHub access before generating a repo draft.' })) return;
      const repo = selectedRepoFromPicker();
      if (!repo) throw new Error('Select a repo first.');
      state.agentSetupStarted = true;
      state.agentSetupMode = 'github';
      state.agentSetupCompletedId = null;
      const res = await api('/api/github/generate-manifest', {
        method: 'POST',
        body: JSON.stringify({
          owner: repo.owner,
          repo: repo.name,
          installation_id: repo.installationId || undefined
        })
      });
      if (els.manifestJson) els.manifestJson.value = JSON.stringify(res.draft_manifest, null, 2);
      switchTab('agents');
      renderAgentSetupFlow(state.snapshot?.auth);
      setDetail(res);
      const warning = Array.isArray(res.warnings) && res.warnings.length ? ` ${res.warnings[0]}` : '';
      void trackConversionEvent('manifest_generated', {
        source: 'github_repo',
        status: 'generated',
        agentSource: repo.private ? 'private_repo' : 'public_repo'
      });
      flash(`Draft manifest loaded from ${repo.fullName}. Review before import.${warning}`, 'ok');
    });
    if (els.importSelectedRepoBtn) els.importSelectedRepoBtn.onclick = () => runAction(els.importSelectedRepoBtn, async () => {
      if (!ensureGithubLinkedAccess({ section: 'agents', requireGithubFlow: true, message: 'Connect GitHub before importing a repo manifest.', reconnectMessage: 'GitHub is already linked. Refresh GitHub access before importing a repo manifest.' })) return;
      const repo = selectedRepoFromPicker();
      if (!repo) throw new Error('Select a repo first.');
      const res = await api('/api/github/load-manifest', {
        method: 'POST',
        body: JSON.stringify({
          owner: repo.owner,
          repo: repo.name,
          installation_id: repo.installationId || undefined
        })
      });
      setDetail(res);
      state.selectedAgentId = res.agent?.id || null;
      delete state.agentOnboarding[state.selectedAgentId];
      void trackConversionEvent('agent_imported', {
        source: 'github_repo',
        status: 'imported',
        agentId: state.selectedAgentId || ''
      });
      flash(`Loaded manifest-backed agent from ${repo.fullName} via ${res.auth_provider || 'github'}. Verify before dispatch.`, 'ok');
      await refresh();
      if (state.selectedAgentId) await loadAgentOnboarding(state.selectedAgentId, { force: true, silent: true });
      completeAgentSetup(state.selectedAgentId);
      renderAgentSetupFlow(state.snapshot?.auth);
    });
    if (els.createAdapterPrBtn) els.createAdapterPrBtn.onclick = () => runAction(els.createAdapterPrBtn, async () => {
      if (!ensureGithubLinkedAccess({ section: 'agents', requireGithubFlow: true, message: 'Connect GitHub before creating an adapter PR.', reconnectMessage: 'GitHub is already linked. Refresh GitHub access before creating an adapter PR.' })) return;
      const repo = selectedRepoFromPicker();
      if (!repo) throw new Error('Select a repo first.');
      const popup = window.open('', '_blank');
      writeAdapterPrPopup(popup, 'Creating adapter PR', [
        `Repo: ${repo.fullName}`,
        '',
        `${productShortName} is creating the pull request now.`
      ]);
      await createAdapterPrForRepo(repo, { popupWindow: popup });
    });
    if (els.importDeployedAdapterBtn) els.importDeployedAdapterBtn.onclick = () => runAction(els.importDeployedAdapterBtn, async () => {
      if (!ensureGithubLinkedAccess({ section: 'agents', requireGithubFlow: true, message: 'Connect GitHub before importing a deployed manifest.', reconnectMessage: 'GitHub is already linked. Refresh GitHub access before importing a deployed manifest.' })) return;
      const repo = selectedRepoFromPicker();
      if (!repo) throw new Error('Select a repo first.');
      const hint = repoAdapterHint(repo);
      const manifestUrl = hint.manifestUrl || (els.manifestUrl?.value || '').trim();
      if (!manifestUrl) {
        throw new Error('No deployed manifest URL is known yet. Set the repo homepage to the deployed app URL or paste the manifest URL manually.');
      }
      await importManifestUrlAndVerify(manifestUrl, 'Hosted manifest');
    });
  }

  return {
    applyRepoFilter,
    renderRepoPicker,
    resetRepoPicker,
    loadGithubRepos,
    maybeAutoLoadRepos,
    loadAgentOnboarding,
    maybeAutoCheckSelectedAgent,
    showSelectedRepo,
    selectedRepoFromPicker,
    normalizePublicBaseUrl,
    repoAdapterHint,
    adapterPrPreview,
    setRepoActionPreview,
    setOpenAdapterPr,
    writeAdapterPrPopup,
    createAdapterPrForRepo,
    maybeOfferAutomatedAgentSetup,
    bindGithubAgentSetupInteractions
  };
}
