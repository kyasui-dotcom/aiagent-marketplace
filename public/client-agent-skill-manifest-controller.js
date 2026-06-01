export function createClientAgentSkillManifestController(deps = {}) {
  const {
    els,
    productName = 'CAIt',
    productShortName = 'CAIt',
    state,
    api,
    appendOrderChatExchange = () => {},
    agentVerifyFailureSummary = () => ({ cause: 'unknown', next: 'Check the manifest and endpoint, then retry verification.' }),
    completeAgentSetup = () => {},
    flash = () => {},
    loadAgentOnboarding = async () => {},
    looksJapanese = () => false,
    openChatPreviewSteps = () => [],
    refresh = async () => {},
    renderAgentSetupFlow = () => {},
    renderAgents = () => {},
    setDetail = () => {},
    switchTab = () => {},
    trackConversionEvent = () => {},
    window: browserWindow = globalThis.window
  } = deps;

  function looksLikeAgentSkillMarkdown(text = '') {
    const source = String(text || '').trim();
    if (!source || source.length < 40) return false;
    const hasFrontmatter = /^---\s*[\s\S]*?\b(name|description)\s*:\s*.+?[\s\S]*?---/i.test(source);
    const hasHeading = /^#{1,2}\s+\S.+$/m.test(source);
    const hasSkillCue = /\b(SKILL\.md|agent skill|use this skill|when to use|skills? compatibility)\b/i.test(source);
    const hasInstructionCue = /\b(use this skill when|instructions?|workflow|steps?|scripts?|tools?)\b/i.test(source);
    return (hasFrontmatter && (hasHeading || hasInstructionCue)) || (hasSkillCue && hasHeading && hasInstructionCue);
  }

  async function draftAgentSkillManifestFromText(skillMd = '') {
    const source = String(skillMd || '').trim();
    if (!source) throw new Error('Paste SKILL.md first.');
    const res = await api('/api/agents/draft-skill-manifest', {
      method: 'POST',
      body: JSON.stringify({ skill_md: source })
    });
    if (els?.agentSkillMd) els.agentSkillMd.value = source;
    if (els?.manifestJson) els.manifestJson.value = JSON.stringify(res.draft_manifest, null, 2);
    setDetail(res);
    return res;
  }

  function loadManifestExample() {
    if (!els?.manifestJson) return;
    els.manifestJson.value = JSON.stringify({
      schema_version: 'agent-manifest/v1',
      name: 'codex_worker',
      description: 'Handles code changes and debugging tickets.',
      task_types: ['code', 'debug'],
      pricing: { provider_markup_rate: 0.1, token_markup_rate: 0.1, platform_margin_rate: 0.1 },
      requirements: [
        {
          type: 'github_repo',
          label: 'GitHub repository access',
          fulfillment: 'native_ui',
          launch_label: 'Open GitHub app or repository settings',
          completion_signal: 'manual_confirm',
          purpose: 'Code changes should run in a sandbox branch and be delivered as a pull request.'
        }
      ],
      usage_contract: {
        report_input_tokens: true,
        report_output_tokens: true,
        report_model: true,
        report_external_api_cost: true
      },
      success_rate: 0.92,
      avg_latency_sec: 45,
      owner: 'Kuni',
      healthcheck_url: 'https://example.com/api/health',
      verification: {
        challenge_path: '/.well-known/agent-challenge.txt',
        challenge_token: 'replace-me'
      }
    }, null, 2);
  }

  async function importManifestUrlAndVerify(manifestUrl, label = 'Manifest') {
    const imported = await api('/api/agents/import-url', {
      method: 'POST',
      body: JSON.stringify({ manifest_url: manifestUrl })
    });
    const importedAgentId = imported.agent?.id || '';
    if (!importedAgentId) throw new Error(`${label} import did not return an agent id.`);
    const verification = await api(`/api/agents/${importedAgentId}/verify`, { method: 'POST' });
    const selectedId = verification.agent?.id || importedAgentId;
    state.selectedAgentId = selectedId;
    delete state.agentOnboarding[selectedId];
    setDetail({ input: manifestUrl, import: imported, verification });
    await refresh();
    if (selectedId) await loadAgentOnboarding(selectedId, { force: true, silent: true });
    completeAgentSetup(selectedId);
    renderAgentSetupFlow(state.snapshot?.auth);
    const verifiedAgent = verification.agent || imported.agent || null;
    const verifyFailure = agentVerifyFailureSummary(verifiedAgent);
    void trackConversionEvent('agent_imported', {
      source: 'manifest_url',
      status: imported.agent?.id ? 'imported' : 'unknown',
      agentId: selectedId
    });
    void trackConversionEvent('agent_verified', {
      source: 'manifest_url',
      status: verification.verification?.ok ? 'verified' : 'failed',
      agentId: selectedId
    });
    flash(
      verification.verification?.ok
        ? `${label} imported and verified for ${verifiedAgent?.name || selectedId}.`
        : `${label} imported, but verify failed: ${verifyFailure.cause} Next: ${verifyFailure.next}`,
      verification.verification?.ok ? 'ok' : 'error'
    );
    return { imported, verification };
  }

  function openManualAgentSkillFlow() {
    state.agentSetupStarted = true;
    state.agentSetupMode = 'manual';
    state.agentSetupCompletedId = null;
    state.showAgentList = true;
    switchTab('agents');
    renderAgentSetupFlow(state.snapshot?.auth || {});
    renderAgents(state.snapshot?.agents || []);
    if (els?.agentManualPanel?.scrollIntoView) {
      browserWindow.requestAnimationFrame(() => {
        els.agentManualPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  async function handleAgentSkillMarkdownFromChat(skillMd = '', options = {}) {
    const res = await draftAgentSkillManifestFromText(skillMd);
    const skillName = res.skill?.name || res.draft_manifest?.name || 'Agent Skill';
    const warning = Array.isArray(res.warnings) && res.warnings.length ? `\n\nWarning: ${res.warnings[0]}` : '';
    const ja = looksJapanese(skillMd);
    const body = ja
      ? [
        `${skillName} を${productName}のmanifest draftに変換しました。これは注文ではなく、課金も発生しません。`,
        '',
        'AGENTS -> PASTE MANIFEST を開きました。',
        '',
        '次の動き:',
        '1. MANIFEST JSONを確認',
        '2. GitHub連携済みなら IMPORT JSON',
        '3. endpointまたはadapterを用意してverify',
        '',
        '注意: SKILL.md由来のagentは、そのまま任意スクリプト実行しません。公開ルーティングにはhosted endpointまたはadapterの検証が必要です。',
        warning
      ].filter(Boolean).join('\n')
      : [
        `${skillName} was converted into a ${productName} manifest draft. This is not an order and no billing occurred.`,
        '',
        'I opened AGENTS -> PASTE MANIFEST.',
        '',
        'Next:',
        '1. Review MANIFEST JSON',
        '2. Press IMPORT JSON after GitHub is linked',
        '3. Add a hosted endpoint or adapter, then verify',
        '',
        `${productShortName} does not execute arbitrary SKILL.md scripts directly. Public routing still requires a verified hosted endpoint or adapter.`,
        warning
      ].filter(Boolean).join('\n');
    appendOrderChatExchange(skillMd, {
      kind: 'assist',
      body,
      status: 'Agent Skill manifest draft created.\n\nNo order was created and no billing occurred. Review the JSON in AGENTS before importing.'
    }, {
      tone: 'ok',
      steps: openChatPreviewSteps('skill', skillMd),
      nextPrompt: '',
      transcriptId: options.transcriptId || ''
    });
    openManualAgentSkillFlow();
    flash(`Agent Skill draft JSON created from ${skillName}. Review MANIFEST JSON, then import when ready.`, 'ok');
    return res;
  }

  return {
    draftAgentSkillManifestFromText,
    handleAgentSkillMarkdownFromChat,
    importManifestUrlAndVerify,
    loadManifestExample,
    looksLikeAgentSkillMarkdown,
    openManualAgentSkillFlow
  };
}
