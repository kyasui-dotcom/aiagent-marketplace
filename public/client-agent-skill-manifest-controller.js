export function createClientAgentSkillManifestController(deps = {}) {
  const {
    els,
    productName = 'CAIt',
    productShortName = 'CAIt',
    state,
    api,
    appendOrderChatExchange = () => {},
    flash = () => {},
    looksJapanese = () => false,
    openChatPreviewSteps = () => [],
    renderAgentSetupFlow = () => {},
    renderAgents = () => {},
    setDetail = () => {},
    switchTab = () => {},
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
    looksLikeAgentSkillMarkdown,
    openManualAgentSkillFlow
  };
}
