export function createGithubIntegrationRouteHandlers(deps = {}) {
  const {
    GITHUB_ADAPTER_MARKER,
    MANIFEST_CANDIDATE_PATHS,
    adapterNextStepText,
    applyAgentReviewToAgentRecord,
    assessAgentRegistrationSafety,
    buildDraftManifestFromRepoAnalysisWithAi,
    buildGithubAdapterPlan,
    createAgentFromManifest,
    createGithubBranch,
    createGithubPullRequest,
    currentAgentRequesterContext,
    currentAgentRequesterContextWithAccount,
    fetchGithubBranchSha,
    fetchGithubManifestCandidate,
    fetchGithubPublicRepos,
    fetchGithubRepoMeta,
    fetchGithubRepoTree,
    fetchGithubTextFile,
    findKnownBrokerPath,
    githubAppRepoTokenForRequester,
    githubAppReposForSession,
    githubPermissionError,
    githubSessionCanReadPrivateRepos,
    hasAdapterPrConfirmation,
    hasRepoWriteConfirmation,
    json,
    loadGithubManifestDraftSignals,
    parseAndValidateManifest,
    parseBody,
    persistGithubAppAccess,
    recordOrderApiKeyUsage,
    runAgentReviewForRequest,
    runtimeStorage,
    sessionHasGithubApp,
    sessionHasGithubOauth,
    touchEvent,
    upsertGithubTextFile
  } = deps;

  async function handleGithubRepos(request, env) {
    const storage = runtimeStorage(env);
    const current = await currentAgentRequesterContext(storage, request, env);
    if (!current.user && current.apiKeyStatus === 'invalid') return json({ error: 'Invalid API key' }, 401);
    if (!current.user && current.apiKeyStatus !== 'valid') return json({ error: 'Login or CAIt API key required' }, 401);
    const session = current.session;
    try {
      if (sessionHasGithubApp(session)) {
        const repos = await githubAppReposForSession(session);
        await persistGithubAppAccess(storage, current.login, session, repos);
        return json({
          auth_provider: 'github-app',
          access_mode: 'installation-selected',
          repos
        });
      }
      if (current.apiKeyStatus === 'valid') {
        if (current.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
        const repos = current.account?.githubAppAccess?.repos || [];
        return json({
          auth_provider: 'github-app',
          access_mode: 'account-stored-installations',
          repos,
          requires_session_refresh: !repos.length
        });
      }
      if (!sessionHasGithubOauth(session)) return json({ error: 'GitHub connection required' }, 403);
      const allowPrivateRepos = githubSessionCanReadPrivateRepos(session, env);
      const repos = allowPrivateRepos
        ? await fetchAllGithubRepos(session.githubAccessToken)
        : await fetchGithubPublicRepos(session.githubIdentity?.login || session.user?.login || '', session.githubAccessToken);
      return json({
        auth_provider: 'github-oauth',
        access_mode: allowPrivateRepos ? 'private-enabled' : 'public-only',
          repos: repos.map((repo) => ({
            id: repo.id,
            name: repo.name,
            fullName: repo.full_name,
            description: repo.description,
            homepage: repo.homepage || '',
            private: repo.private,
          defaultBranch: repo.default_branch,
          htmlUrl: repo.html_url,
          owner: repo.owner?.login
        }))
      });
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }
  async function handleGithubLoadManifest(storage, request, env) {
    const current = await currentAgentRequesterContext(storage, request, env);
    if (!current.user && current.apiKeyStatus === 'invalid') return json({ error: 'Invalid API key' }, 401);
    if (!current.user && current.apiKeyStatus !== 'valid') return json({ error: 'Login or CAIt API key required' }, 401);
    const providerMoneyReadiness = await providerMoneyReadinessForCurrent(storage, current);
    const session = current.session;
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
    if (!body.owner || !body.repo) return json({ error: 'owner and repo required' }, 400);
    try {
      if (sessionHasGithubApp(session) || current.apiKeyStatus === 'valid') {
        const repoAccess = await githubAppRepoTokenForRequester(current, body.owner, body.repo, body.installation_id || '', env);
        if (repoAccess.error) return json({ error: repoAccess.error, use: repoAccess.use, next_step: repoAccess.next_step }, repoAccess.statusCode || 403);
        const { selectedRepo, installationToken } = repoAccess;
        const repoMetaResult = await fetchGithubRepoMeta(body.owner, body.repo, installationToken);
        if (!repoMetaResult.ok) return json({ error: repoMetaResult.error }, repoMetaResult.status === 404 ? 404 : 400);
        const repoMeta = repoMetaResult.repo;
        const attempts = [];
        let manifest = null;
        let selectedCandidate = null;
        for (const candidatePath of MANIFEST_CANDIDATE_PATHS) {
          const loaded = await fetchGithubManifestCandidate(installationToken, body.owner, body.repo, repoMeta.default_branch, candidatePath);
          if (!loaded.ok) {
            attempts.push({ path: candidatePath, status: loaded.status, error: loaded.error || null });
            continue;
          }
          try {
            manifest = parseAndValidateManifest(loaded.text, {
              contentType: loaded.contentType,
              sourceUrl: loaded.manifestUrl
            });
            selectedCandidate = loaded;
            attempts.push({ path: candidatePath, status: 200, parsed: true });
            break;
          } catch (error) {
            attempts.push({ path: candidatePath, status: 422, error: error.message });
          }
        }
        if (!manifest || !selectedCandidate) {
          return json({
            error: 'No valid manifest found in candidate files',
            candidate_paths: MANIFEST_CANDIDATE_PATHS.filter((path) => path.endsWith('.json')),
            attempts
          }, 404);
        }
        const safety = assessAgentRegistrationSafety(manifest, agentSafetyOptionsForRequest(request, env));
        if (!safety.ok) return agentSafetyErrorResponse(safety);
        const ownerInfo = await ownerInfoFromRequest(request, env, current);
        const agent = createAgentFromManifest(manifest, ownerInfo, {
          manifestUrl: selectedCandidate.manifestUrl,
          manifestSource: `github-app:${repoMeta.full_name}:${selectedCandidate.candidatePath}`,
          verificationStatus: 'manifest_loaded',
          importMode: 'github-app-installation'
        });
        const review = await runAgentReviewForRequest(agent, request, env, { source: 'github-app-manifest', safety });
        applyAgentReviewToAgentRecord(agent, review);
        await storage.mutate(async (state) => { state.agents.unshift(agent); });
        await touchEvent(storage, 'REGISTERED', `${agent.name} manifest loaded from ${repoMeta.full_name}/${selectedCandidate.candidatePath} via GitHub App`);
        if (current.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
        return json({
          ok: true,
          auth_provider: 'github-app',
          access_mode: current.apiKeyStatus === 'valid' ? 'account-stored-installation' : 'installation-selected',
          agent,
          repo: { fullName: repoMeta.full_name, private: repoMeta.private },
          installation_id: selectedRepo.installationId,
          manifest_url: selectedCandidate.manifestUrl,
          candidate_path: selectedCandidate.candidatePath,
          candidate_paths_checked: MANIFEST_CANDIDATE_PATHS.filter((path) => path.endsWith('.json')),
          attempts,
          safety,
          review,
          provider_money_readiness: providerMoneyReadiness
        }, 201);
      }
      if (!sessionHasGithubOauth(session)) return json({ error: 'GitHub connection required' }, 403);
      const allowPrivateRepos = githubSessionCanReadPrivateRepos(session, env);
      const repoMetaResult = await fetchGithubRepoMeta(body.owner, body.repo, allowPrivateRepos ? session.githubAccessToken : '');
      if (!repoMetaResult.ok) {
        const suffix = allowPrivateRepos ? '' : ' Safe OAuth mode only supports public repositories.';
        return json({ error: `${repoMetaResult.error}.${suffix}`.trim() }, repoMetaResult.status === 404 ? 404 : 400);
      }
      const repoMeta = repoMetaResult.repo;
      if (repoMeta.private && !allowPrivateRepos) {
        return json({
          error: 'Private repo import is disabled in safe OAuth mode. Keep the manifest in a public repository or switch this integration to a GitHub App for fine-grained private access.'
        }, 403);
      }
      const attempts = [];
      let manifest = null;
      let selectedCandidate = null;
      for (const candidatePath of MANIFEST_CANDIDATE_PATHS) {
        const loaded = await fetchGithubManifestCandidate(
          repoMeta.private && allowPrivateRepos ? session.githubAccessToken : '',
          body.owner,
          body.repo,
          repoMeta.default_branch,
          candidatePath
        );
        if (!loaded.ok) {
          attempts.push({ path: candidatePath, status: loaded.status, error: loaded.error || null });
          continue;
        }
        try {
          manifest = parseAndValidateManifest(loaded.text, {
            contentType: loaded.contentType,
            sourceUrl: loaded.manifestUrl
          });
          selectedCandidate = loaded;
          attempts.push({ path: candidatePath, status: 200, parsed: true });
          break;
        } catch (error) {
          attempts.push({ path: candidatePath, status: 422, error: error.message });
        }
      }
      if (!manifest || !selectedCandidate) {
        return json({
          error: 'No valid manifest found in candidate files',
          candidate_paths: MANIFEST_CANDIDATE_PATHS.filter((path) => path.endsWith('.json')),
          attempts
        }, 404);
      }
      const safety = assessAgentRegistrationSafety(manifest, agentSafetyOptionsForRequest(request, env));
      if (!safety.ok) return agentSafetyErrorResponse(safety);
      const ownerInfo = await ownerInfoFromRequest(request, env, current);
      const agent = createAgentFromManifest(manifest, ownerInfo, {
        manifestUrl: selectedCandidate.manifestUrl,
        manifestSource: `github:${repoMeta.full_name}:${selectedCandidate.candidatePath}`,
        verificationStatus: 'manifest_loaded',
        importMode: 'github-manifest-candidate'
      });
      const review = await runAgentReviewForRequest(agent, request, env, { source: 'github-manifest', safety });
      applyAgentReviewToAgentRecord(agent, review);
      await storage.mutate(async (state) => { state.agents.unshift(agent); });
      await touchEvent(storage, 'REGISTERED', `${agent.name} manifest loaded from ${repoMeta.full_name}/${selectedCandidate.candidatePath}`);
      return json({
        ok: true,
        agent,
        repo: { fullName: repoMeta.full_name, private: repoMeta.private },
        access_mode: repoMeta.private ? 'private-enabled' : 'public-only',
        manifest_url: selectedCandidate.manifestUrl,
        candidate_path: selectedCandidate.candidatePath,
        candidate_paths_checked: MANIFEST_CANDIDATE_PATHS.filter((path) => path.endsWith('.json')),
        attempts,
        safety,
        review,
        provider_money_readiness: providerMoneyReadiness
      }, 201);
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }
  async function handleGithubGenerateManifest(request, env) {
    const storage = runtimeStorage(env);
    const current = await currentAgentRequesterContext(storage, request, env);
    if (!current.user && current.apiKeyStatus === 'invalid') return json({ error: 'Invalid API key' }, 401);
    if (!current.user && current.apiKeyStatus !== 'valid') return json({ error: 'Login or CAIt API key required' }, 401);
    const session = current.session;
    const preferLocalEndpoints = ['localhost', '127.0.0.1'].includes(new URL(request.url).hostname);
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
    if (!body.owner || !body.repo) return json({ error: 'owner and repo required' }, 400);
    try {
      if (sessionHasGithubApp(session) || current.apiKeyStatus === 'valid') {
        const repoAccess = await githubAppRepoTokenForRequester(current, body.owner, body.repo, body.installation_id || '', env);
        if (repoAccess.error) return json({ error: repoAccess.error, use: repoAccess.use, next_step: repoAccess.next_step }, repoAccess.statusCode || 403);
        const { selectedRepo, installationToken } = repoAccess;
        const repoMetaResult = await fetchGithubRepoMeta(body.owner, body.repo, installationToken);
        if (!repoMetaResult.ok) return json({ error: repoMetaResult.error }, repoMetaResult.status === 404 ? 404 : 400);
        const repoMeta = repoMetaResult.repo;
        const treeLoad = await fetchGithubRepoTree(installationToken, body.owner, body.repo, repoMeta.default_branch);
        const signalLoad = await loadGithubManifestDraftSignals(
          installationToken,
          body.owner,
          body.repo,
          repoMeta.default_branch,
          treeLoad.ok ? treeLoad.paths : []
        );
        const draft = await buildDraftManifestFromRepoAnalysisWithAi({
          repoMeta,
          files: signalLoad.files,
          repoTreePaths: treeLoad.ok ? treeLoad.paths : [],
          ownerLogin: current.githubIdentity?.login || current.user?.login || current.login || '',
          preferLocalEndpoints
        }, {
          env,
          fetchImpl: fetch
        });
        if (current.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
        return json({
          ok: true,
          auth_provider: 'github-app',
          access_mode: current.apiKeyStatus === 'valid' ? 'account-stored-installation' : 'installation-selected',
          repo: { fullName: repoMeta.full_name, private: repoMeta.private },
          installation_id: selectedRepo.installationId,
          draft_manifest: draft.draftManifest,
          source_files: draft.analysis.loadedFiles,
          missing_files: draft.analysis.missingFiles,
          runtime_hints: draft.analysis.runtimeHints,
          task_type_scores: draft.analysis.scoredTaskTypes,
          manifest_intelligence: draft.analysis.ai || null,
          endpoint_hints: {
            absolute_health_urls: draft.analysis.absoluteHealthUrls,
            absolute_job_urls: draft.analysis.absoluteJobUrls,
            relative_health_paths: draft.analysis.relativeHealthHints,
            relative_job_paths: draft.analysis.relativeJobHints
          },
          warnings: draft.analysis.warnings,
          signal_attempts: signalLoad.attempts,
          next_step: 'Review the generated JSON, add deployed endpoint URLs if needed, then import the JSON manifest.'
        });
      }
      if (!sessionHasGithubOauth(session)) return json({ error: 'GitHub connection required' }, 403);
      const allowPrivateRepos = githubSessionCanReadPrivateRepos(session, env);
      const repoMetaResult = await fetchGithubRepoMeta(body.owner, body.repo, allowPrivateRepos ? session.githubAccessToken : '');
      if (!repoMetaResult.ok) {
        const suffix = allowPrivateRepos ? '' : ' Safe OAuth mode only supports public repositories.';
        return json({ error: `${repoMetaResult.error}.${suffix}`.trim() }, repoMetaResult.status === 404 ? 404 : 400);
      }
      const repoMeta = repoMetaResult.repo;
      if (repoMeta.private && !allowPrivateRepos) {
        return json({
          error: 'Private repo draft generation is disabled in safe OAuth mode. Keep the repo public or use a GitHub App for fine-grained private access.'
        }, 403);
      }
      const treeLoad = await fetchGithubRepoTree(
        repoMeta.private && allowPrivateRepos ? session.githubAccessToken : '',
        body.owner,
        body.repo,
        repoMeta.default_branch
      );
      const signalLoad = await loadGithubManifestDraftSignals(
        repoMeta.private && allowPrivateRepos ? session.githubAccessToken : '',
        body.owner,
        body.repo,
        repoMeta.default_branch,
        treeLoad.ok ? treeLoad.paths : []
      );
        const draft = await buildDraftManifestFromRepoAnalysisWithAi({
          repoMeta,
          files: signalLoad.files,
          repoTreePaths: treeLoad.ok ? treeLoad.paths : [],
          ownerLogin: current.githubIdentity?.login || current.user?.login || current.login || '',
          preferLocalEndpoints
        }, {
          env,
          fetchImpl: fetch
        });
      return json({
        ok: true,
        auth_provider: 'github-oauth',
        access_mode: repoMeta.private ? 'private-enabled' : 'public-only',
        repo: { fullName: repoMeta.full_name, private: repoMeta.private },
        draft_manifest: draft.draftManifest,
        source_files: draft.analysis.loadedFiles,
        missing_files: draft.analysis.missingFiles,
        runtime_hints: draft.analysis.runtimeHints,
        task_type_scores: draft.analysis.scoredTaskTypes,
        manifest_intelligence: draft.analysis.ai || null,
        endpoint_hints: {
          absolute_health_urls: draft.analysis.absoluteHealthUrls,
          absolute_job_urls: draft.analysis.absoluteJobUrls,
          relative_health_paths: draft.analysis.relativeHealthHints,
          relative_job_paths: draft.analysis.relativeJobHints
        },
        warnings: draft.analysis.warnings,
        signal_attempts: signalLoad.attempts,
        next_step: 'Review the generated JSON, add deployed endpoint URLs if needed, then import the JSON manifest.'
      });
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  async function handleGithubCreateExecutorPr(storage, request, env) {
    const current = await currentAgentRequesterContext(storage, request, env);
    if (!current.user && current.apiKeyStatus === 'invalid') return json({ error: 'Invalid API key' }, 401);
    if (!current.user && current.apiKeyStatus !== 'valid') return json({ error: 'Login or CAIt API key required' }, 401);
    if (!sessionHasGithubApp(current.session) && current.apiKeyStatus !== 'valid') {
      return json({
        error: 'GitHub App login required to create executor PRs.',
        use: '/auth/github'
      }, 403);
    }
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
    if (!body.owner || !body.repo) return json({ error: 'owner and repo required' }, 400);
    if (!String(body.content || '').trim()) return json({ error: 'content required' }, 400);
    if (current.apiKeyStatus === 'valid' && !hasRepoWriteConfirmation(body)) {
      return json({
        error: 'Repository write confirmation required for CAIT_API_KEY executor PR creation.',
        required: 'Set confirm_repo_write=true after showing the target repository, branch, files, and PR action to the user.',
        repo: `${body.owner}/${body.repo}`,
        use: '/chat.html'
      }, 409);
    }
    try {
      const repoAccess = await githubAppRepoTokenForRequester(current, body.owner, body.repo, body.installation_id || '', env);
      if (repoAccess.error) return json({ error: repoAccess.error, use: repoAccess.use, next_step: repoAccess.next_step }, repoAccess.statusCode || 403);
      const { selectedRepo, installationToken } = repoAccess;
      const repoMetaResult = await fetchGithubRepoMeta(body.owner, body.repo, installationToken);
      if (!repoMetaResult.ok) return json({ error: repoMetaResult.error }, repoMetaResult.status === 404 ? 404 : 400);
      const repoMeta = repoMetaResult.repo;
      const plan = githubExecutorPlanFromRequest(body, repoMeta);
      const baseSha = await fetchGithubBranchSha(installationToken, body.owner, body.repo, repoMeta.default_branch);
      if (!baseSha.ok || !baseSha.sha) {
        return json({ error: baseSha.error || `Could not resolve ${repoMeta.default_branch}` }, 400);
      }
      const branchCreated = await createGithubBranch(installationToken, body.owner, body.repo, plan.branchName, baseSha.sha);
      if (!branchCreated.ok) {
        return json(githubPermissionError(branchCreated, 'Could not create executor branch'), branchCreated.status === 422 ? 409 : 400);
      }
      const existing = await fetchGithubTextFile(installationToken, body.owner, body.repo, plan.filePath, repoMeta.default_branch);
      if (existing.ok && existing.text && !existing.text.includes(GITHUB_EXECUTOR_MARKER) && !existing.text.includes(GITHUB_ADAPTER_MARKER)) {
        return json({
          error: `Refusing to overwrite existing non-AIagent2 file at ${plan.filePath}.`,
          path: plan.filePath,
          branch: plan.branchName
        }, 409);
      }
      const write = await upsertGithubTextFile(installationToken, body.owner, body.repo, {
        path: plan.filePath,
        branch: plan.branchName,
        content: plan.fileContent,
        sha: existing.ok ? existing.sha : '',
        message: existing.ok ? `Update ${PRODUCT_SHORT_NAME} executor handoff: ${plan.filePath}` : `Add ${PRODUCT_SHORT_NAME} executor handoff: ${plan.filePath}`
      });
      if (!write.ok) {
        return json(githubPermissionError(write, `Could not write ${plan.filePath}`), write.status === 422 ? 409 : 400);
      }
      const pull = await createGithubPullRequest(installationToken, body.owner, body.repo, {
        title: plan.prTitle,
        body: plan.prBody,
        head: plan.branchName,
        base: repoMeta.default_branch
      });
      if (!pull.ok) {
        return json(githubPermissionError(pull, 'Could not create executor pull request'), pull.status === 422 ? 409 : 400);
      }
      await touchEvent(storage, 'UPDATED', `Executor PR created for ${repoMeta.full_name}: ${pull.pullRequest.htmlUrl}`, {
        repo: repoMeta.full_name,
        branch: plan.branchName,
        pr: pull.pullRequest.htmlUrl,
        kind: plan.kind
      });
      if (current.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
      return json({
        ok: true,
        auth_provider: 'github-app',
        access_mode: current.apiKeyStatus === 'valid' ? 'account-stored-installation' : 'installation-selected',
        repo: { fullName: repoMeta.full_name, private: repoMeta.private },
        installation_id: selectedRepo.installationId,
        executor_kind: plan.kind,
        branch: plan.branchName,
        base_branch: repoMeta.default_branch,
        files: [{ path: plan.filePath, commit_sha: write.commitSha }],
        pull_request: pull.pullRequest,
        next_step: 'Review the PR handoff file in GitHub, then continue implementation in the repository workflow.'
      }, 201);
    } catch (error) {
      return json(githubPermissionError(error), 500);
    }
  }
  async function handleGithubCreateAdapterPr(storage, request, env) {
    const current = await currentAgentRequesterContext(storage, request, env);
    if (!current.user && current.apiKeyStatus === 'invalid') return json({ error: 'Invalid API key' }, 401);
    if (!current.user && current.apiKeyStatus !== 'valid') return json({ error: 'Login or CAIt API key required' }, 401);
    if (!sessionHasGithubApp(current.session) && current.apiKeyStatus !== 'valid') {
      return json({
        error: 'GitHub App login required to create adapter PRs.',
        use: '/auth/github'
      }, 403);
    }
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
    if (!body.owner || !body.repo) return json({ error: 'owner and repo required' }, 400);
    if (current.apiKeyStatus === 'valid' && !hasAdapterPrConfirmation(body) && !hasRepoWriteConfirmation(body)) {
      return json({
        error: 'Repository write confirmation required for CAIT_API_KEY adapter PR creation.',
        required: 'Set confirm_adapter_pr=true after showing the target repository, branch, files, and PR action to the user.',
        repo: `${body.owner}/${body.repo}`,
        use: '/agents.html'
      }, 409);
    }
    try {
      const repoAccess = await githubAppRepoTokenForRequester(current, body.owner, body.repo, body.installation_id || '', env);
      if (repoAccess.error) return json({ error: repoAccess.error, use: repoAccess.use, next_step: repoAccess.next_step }, repoAccess.statusCode || 403);
      const { selectedRepo, installationToken } = repoAccess;
      const repoMetaResult = await fetchGithubRepoMeta(body.owner, body.repo, installationToken);
      if (!repoMetaResult.ok) return json({ error: repoMetaResult.error }, repoMetaResult.status === 404 ? 404 : 400);
      const repoMeta = repoMetaResult.repo;
      const treeLoad = await fetchGithubRepoTree(installationToken, body.owner, body.repo, repoMeta.default_branch);
      const signalLoad = await loadGithubManifestDraftSignals(
        installationToken,
        body.owner,
        body.repo,
        repoMeta.default_branch,
        treeLoad.ok ? treeLoad.paths : []
      );
      const planFiles = { ...(signalLoad.files || {}) };
      const brokerPath = treeLoad.ok ? findKnownBrokerPath(treeLoad.paths) : '';
      if (brokerPath && !planFiles[brokerPath]) {
        const brokerFile = await fetchGithubTextFile(installationToken, body.owner, body.repo, brokerPath, repoMeta.default_branch);
        if (brokerFile.ok && brokerFile.text) planFiles[brokerPath] = brokerFile.text;
      }
      const plan = buildGithubAdapterPlan({
        repoMeta,
        files: planFiles,
        repoTreePaths: treeLoad.ok ? treeLoad.paths : [],
        ownerLogin: current.githubIdentity?.login || current.user?.login || current.login || ''
      });
      if (!plan.supported) {
        return json({
          error: plan.reason,
          runtime_hints: plan.runtimeHints,
          draft_manifest: plan.draftManifest,
          warnings: plan.analysis?.warnings || [],
          supported_frameworks: ['nextjs', 'cloudflare_worker_adapter', 'hono', 'express', 'fastapi']
        }, 422);
      }
      const baseSha = await fetchGithubBranchSha(installationToken, body.owner, body.repo, repoMeta.default_branch);
      if (!baseSha.ok || !baseSha.sha) {
        return json({ error: baseSha.error || `Could not resolve ${repoMeta.default_branch}` }, 400);
      }
      const branchCreated = await createGithubBranch(installationToken, body.owner, body.repo, plan.branchName, baseSha.sha);
      if (!branchCreated.ok) {
        return json(githubPermissionError(branchCreated, 'Could not create adapter branch'), branchCreated.status === 422 ? 409 : 400);
      }
      const committedFiles = [];
      for (const file of plan.filesToWrite) {
        const existing = await fetchGithubTextFile(installationToken, body.owner, body.repo, file.path, repoMeta.default_branch);
        if (existing.ok && existing.text && !existing.text.includes(GITHUB_ADAPTER_MARKER)) {
          return json({
            error: `Refusing to overwrite existing non-AIagent2 file at ${file.path}.`,
            path: file.path,
            branch: plan.branchName
          }, 409);
        }
        const write = await upsertGithubTextFile(installationToken, body.owner, body.repo, {
          path: file.path,
          branch: plan.branchName,
          content: file.content,
          sha: existing.ok ? existing.sha : '',
          message: existing.ok ? `Update AIagent2 hosted adapter: ${file.path}` : `Add AIagent2 hosted adapter: ${file.path}`
        });
        if (!write.ok) {
          return json(githubPermissionError(write, `Could not write ${file.path}`), write.status === 422 ? 409 : 400);
        }
        committedFiles.push({ path: file.path, commit_sha: write.commitSha });
      }
      const pull = await createGithubPullRequest(installationToken, body.owner, body.repo, {
        title: plan.prTitle,
        body: plan.prBody,
        head: plan.branchName,
        base: repoMeta.default_branch
      });
      if (!pull.ok) {
        return json(githubPermissionError(pull, 'Could not create pull request'), pull.status === 422 ? 409 : 400);
      }
      await touchEvent(storage, 'REGISTERED', `Adapter PR created for ${repoMeta.full_name}: ${pull.pullRequest.htmlUrl}`, {
        repo: repoMeta.full_name,
        branch: plan.branchName,
        pr: pull.pullRequest.htmlUrl
      });
      if (current.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
      return json({
        ok: true,
        auth_provider: 'github-app',
        access_mode: current.apiKeyStatus === 'valid' ? 'account-stored-installation' : 'installation-selected',
        repo: { fullName: repoMeta.full_name, private: repoMeta.private },
        installation_id: selectedRepo.installationId,
        framework: plan.framework,
        runtime_hints: plan.runtimeHints,
        branch: plan.branchName,
        base_branch: repoMeta.default_branch,
        files: committedFiles,
        pull_request: pull.pullRequest,
        required_env: plan.requiredEnv,
        optional_env: plan.optionalEnv || [],
        draft_manifest: plan.draftManifest,
        deployment_base_url: plan.deploymentBaseUrl || null,
        suggested_manifest_url: plan.suggestedManifestUrl || null,
        suggested_healthcheck_url: plan.suggestedHealthUrl || null,
        suggested_job_url: plan.suggestedJobUrl || null,
        manifest_route: plan.routes.manifestPath,
        health_route: plan.routes.healthPath,
        job_route: plan.routes.jobPath,
        signal_attempts: signalLoad.attempts,
        tree_truncated: Boolean(treeLoad.truncated),
        tree_warning: treeLoad.ok ? null : treeLoad.error,
        next_step: adapterNextStepText(plan)
      }, 201);
    } catch (error) {
      return json(githubPermissionError(error), 500);
    }
  }

  return {
    handleGithubRepos,
    handleGithubLoadManifest,
    handleGithubGenerateManifest,
    handleGithubCreateExecutorPr,
    handleGithubCreateAdapterPr
  };
}
