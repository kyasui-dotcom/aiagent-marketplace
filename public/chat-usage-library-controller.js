export function createChatUsageLibraryController(options = {}) {
  const state = options.state && typeof options.state === 'object' ? options.state : {};
  const appAgentManifests = Array.isArray(options.appAgentManifests) ? options.appAgentManifests : [];
  const appWorkspaceGroups = Array.isArray(options.appWorkspaceGroups) ? options.appWorkspaceGroups : [];
  const appStandaloneHiddenAppIds = options.appStandaloneHiddenAppIds instanceof Set ? options.appStandaloneHiddenAppIds : new Set();
  const coreFeatureAppIds = options.coreFeatureAppIds instanceof Set ? options.coreFeatureAppIds : new Set();
  const compact = typeof options.compact === 'function' ? options.compact : ((value = '', max = 280) => String(value || '').slice(0, max));
  const escapeHtml = typeof options.escapeHtml === 'function' ? options.escapeHtml : ((value = '') => String(value || ''));
  const chatText = typeof options.chatText === 'function' ? options.chatText : ((en) => en);
  const taskLabel = typeof options.taskLabel === 'function' ? options.taskLabel : ((value = '') => String(value || 'AI Agent'));

  function listValues(value) {
    if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
    if (typeof value === 'string') return value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
    return [];
  }

  function isoNow() {
    return new Date().toISOString();
  }

  function normalizeUsageId(value = '') {
    return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_.:-]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function isCoreFeatureAppId(value = '') {
    return coreFeatureAppIds.has(normalizeUsageId(value));
  }

  function compactUsageText(value = '', max = 420) {
    return compact(String(value || '').replace(/\r\n/g, '\n'), max);
  }

  function compactTransferText(value = '', max = 1200) {
    const text = String(value || '')
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    if (text.length <= max) return text;
    return `${text.slice(0, Math.max(0, max - 1)).trim()}…`;
  }

  function compactTransferObject(value = null, transferOptions = {}) {
    const maxText = Math.max(120, Number(transferOptions.maxText || 900));
    const maxArray = Math.max(1, Number(transferOptions.maxArray || 12));
    const depth = Math.max(0, Number(transferOptions.depth || 0));
    if (value == null) return value;
    if (typeof value === 'string') return compactTransferText(value, maxText);
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (Array.isArray(value)) {
      return value.slice(0, maxArray).map((item) => compactTransferObject(item, { maxText, maxArray, depth: depth - 1 }));
    }
    if (typeof value === 'object') {
      if (depth <= 0) return {};
      const result = {};
      for (const [key, item] of Object.entries(value).slice(0, 28)) {
        if (/token|secret|password|cookie|authorization|csrf/i.test(key)) continue;
        result[key] = compactTransferObject(item, { maxText, maxArray, depth: depth - 1 });
      }
      return result;
    }
    return String(value || '');
  }

  function usageDisplayDate(value = '') {
    const time = Date.parse(value || '');
    if (!Number.isFinite(time)) return '';
    try {
      return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(time));
    } catch {
      return new Date(time).toLocaleString();
    }
  }

  function mergeUsageEntry(list = [], entry = {}, mergeOptions = {}) {
    const id = normalizeUsageId(entry.id || entry.key || entry.name);
    if (!id) return Array.isArray(list) ? list : [];
    const now = isoNow();
    const limit = Math.max(1, Number(mergeOptions.limit || 40));
    const existing = (Array.isArray(list) ? list : []).find((item) => normalizeUsageId(item.id || item.key || item.name) === id) || {};
    const merged = {
      ...existing,
      ...entry,
      id,
      firstUsedAt: existing.firstUsedAt || entry.firstUsedAt || now,
      lastUsedAt: entry.lastUsedAt || now,
      useCount: Number(existing.useCount || 0) + (mergeOptions.increment === false ? 0 : 1)
    };
    return [
      merged,
      ...(Array.isArray(list) ? list : []).filter((item) => normalizeUsageId(item.id || item.key || item.name) !== id)
    ].slice(0, limit);
  }

  function normalizeAppAgentManifest(app = {}) {
    const manifest = app?.metadata?.manifest && typeof app.metadata.manifest === 'object' ? app.metadata.manifest : {};
    const id = normalizeUsageId(app.id || app.name || manifest.id || manifest.name);
    if (!id || isCoreFeatureAppId(id)) return null;
    const baseUrl = String(app.baseUrl || app.base_url || manifest.baseUrl || manifest.base_url || app.url || manifest.url || '').trim();
    const entryUrl = String(app.entryUrl || app.entry_url || app.launchUrl || app.launch_url || manifest.entryUrl || manifest.entry_url || manifest.launchUrl || manifest.launch_url || baseUrl).trim();
    return {
      id,
      name: String(app.name || manifest.name || 'Application').trim(),
      kind: String(app.kind || manifest.kind || 'application').trim(),
      description: String(app.description || manifest.description || '').trim(),
      baseUrl,
      entryUrl,
      capabilities: listValues(app.capabilities || app.actions || manifest.capabilities || manifest.actions || []),
      requiredConnectors: listValues(app.requiredConnectors || app.required_connectors || app.connectors || manifest.requiredConnectors || manifest.required_connectors || manifest.connectors || []),
      requiresApprovalFor: listValues(app.requiresApprovalFor || app.requires_approval_for || manifest.requiresApprovalFor || manifest.requires_approval_for || []),
      inputContract: app.inputContract || app.input_contract || manifest.inputContract || manifest.input_contract || null,
      contextContract: app.contextContract || app.context_contract || manifest.contextContract || manifest.context_contract || null,
      contextIngestUrl: String(app.contextIngestUrl || app.context_ingest_url || manifest.contextIngestUrl || manifest.context_ingest_url || '').trim(),
      handoff: app.handoff || manifest.handoff || null,
      dedicatedDelivery: app.dedicatedDelivery || app.dedicated_delivery || manifest.dedicatedDelivery || manifest.dedicated_delivery || null,
      tags: listValues(app.tags || manifest.tags || []),
      directCommandAliases: listValues(app.directCommandAliases || app.direct_command_aliases || app.commandAliases || app.command_aliases || manifest.directCommandAliases || manifest.direct_command_aliases || manifest.commandAliases || manifest.command_aliases || []),
      owner: String(app.owner || manifest.owner || '').trim(),
      status: String(app.status || manifest.status || '').trim(),
      verificationStatus: String(app.verificationStatus || app.verification_status || manifest.verificationStatus || manifest.verification_status || '').trim(),
      reusePrompt: String(app.reusePrompt || app.reuse_prompt || manifest.reusePrompt || manifest.reuse_prompt || `Use ${app.name || manifest.name || 'this app'} as the final action app when it fits the order.`).trim()
    };
  }

  function appManifestSources() {
    const byId = new Map();
    for (const item of [...appAgentManifests, ...(Array.isArray(state.registeredApps) ? state.registeredApps : [])]) {
      const normalized = normalizeAppAgentManifest(item);
      if (!normalized) continue;
      const existing = byId.get(normalized.id) || {};
      byId.set(normalized.id, {
        ...existing,
        ...normalized,
        inputContract: { ...(existing.inputContract || {}), ...(normalized.inputContract || {}) },
        contextContract: { ...(existing.contextContract || {}), ...(normalized.contextContract || {}) },
        handoff: { ...(existing.handoff || {}), ...(normalized.handoff || {}) },
        dedicatedDelivery: normalized.dedicatedDelivery || existing.dedicatedDelivery || null
      });
    }
    return [...byId.values()];
  }

  function appManifestById(id = '') {
    const safeId = normalizeUsageId(id);
    return appManifestSources().find((manifest) => normalizeUsageId(manifest.id) === safeId) || null;
  }

  function appAgentLaunchUrl(manifestOrEntry = {}, hrefOverride = '') {
    const href = String(hrefOverride || manifestOrEntry.entryUrl || manifestOrEntry.baseUrl || '').trim();
    if (!href) return '';
    try {
      const url = new URL(href, window.location.origin);
      const id = normalizeUsageId(manifestOrEntry.id || '');
      const sameOriginManifest = appAgentManifests.some((item) => normalizeUsageId(item.id) === id);
      if (sameOriginManifest && /^(?:www\.)?aiagent-marketplace\.net$/i.test(url.hostname)) {
        return new URL(`${url.pathname}${url.search}${url.hash}`, window.location.origin).toString();
      }
      return url.toString();
    } catch {
      return href;
    }
  }

  function rememberAppAgentUsage(id = '', details = {}, rememberOptions = {}) {
    const manifest = appManifestById(id);
    if (!manifest) return null;
    const entry = {
      id: manifest.id,
      name: manifest.name,
      kind: manifest.kind,
      description: manifest.description,
      baseUrl: manifest.baseUrl,
      entryUrl: manifest.entryUrl || manifest.baseUrl,
      capabilities: manifest.capabilities || [],
      requiresApprovalFor: manifest.requiresApprovalFor || [],
      inputContract: manifest.inputContract || null,
      contextIngestUrl: manifest.contextIngestUrl || '',
      handoff: manifest.handoff || null,
      dedicatedDelivery: manifest.dedicatedDelivery || null,
      reusePrompt: manifest.reusePrompt || '',
      ...details,
      lastContext: {
        ...(details.lastContext && typeof details.lastContext === 'object' ? details.lastContext : {}),
        title: compactUsageText(details.lastContext?.title || details.title || '', 140),
        product: compactUsageText(details.lastContext?.product || details.product || '', 140),
        audience: compactUsageText(details.lastContext?.audience || details.audience || '', 180),
        goal: compactUsageText(details.lastContext?.goal || details.goal || '', 140),
        channel: compactUsageText(details.lastContext?.channel || details.channel || '', 140),
        source: compactUsageText(details.lastContext?.source || details.source || '', 140)
      }
    };
    state.appAgentHistory = mergeUsageEntry(state.appAgentHistory, entry, { limit: 24, increment: rememberOptions.increment !== false });
    return state.appAgentHistory[0] || null;
  }

  function agentUsageKey(entry = {}) {
    return normalizeUsageId(entry.agentId || `${entry.taskType || 'agent'}-${entry.name || ''}`);
  }

  function rememberAiAgentUsage(entry = {}, rememberOptions = {}) {
    const taskType = String(entry.taskType || entry.task_type || '').trim().toLowerCase();
    const name = String(entry.name || entry.agentName || taskLabel(taskType)).trim() || 'AI Agent';
    const id = agentUsageKey({ ...entry, taskType, name });
    if (!id) return null;
    const safeEntry = {
      id,
      name,
      agentId: String(entry.agentId || '').trim(),
      taskType,
      route: String(entry.route || '').trim(),
      status: String(entry.status || '').trim(),
      source: String(entry.source || '').trim() || 'chatux',
      originalPrompt: compactUsageText(entry.originalPrompt || entry.prompt || '', 900),
      reusePrompt: compactUsageText(entry.reusePrompt || entry.originalPrompt || entry.prompt || '', 900),
      lastOrderId: String(entry.lastOrderId || entry.orderId || '').trim(),
      summary: compactUsageText(entry.summary || '', 260)
    };
    state.aiAgentHistory = mergeUsageEntry(state.aiAgentHistory, safeEntry, { limit: 48, increment: rememberOptions.increment !== false });
    return state.aiAgentHistory[0] || null;
  }

  function recentAppAgentEntries() {
    const historyById = new Map(state.appAgentHistory.map((entry) => [normalizeUsageId(entry.id || entry.name), entry]));
    const entries = appManifestSources().map((manifest) => {
      const history = historyById.get(normalizeUsageId(manifest.id)) || {};
      return {
        ...manifest,
        ...history,
        id: manifest.id,
        name: manifest.name,
        description: history.description || manifest.description,
        baseUrl: history.baseUrl || manifest.baseUrl,
        entryUrl: history.entryUrl || manifest.entryUrl || manifest.baseUrl,
        capabilities: history.capabilities || manifest.capabilities || [],
        requiredConnectors: history.requiredConnectors || manifest.requiredConnectors || [],
        requiresApprovalFor: history.requiresApprovalFor || manifest.requiresApprovalFor || [],
        handoff: history.handoff || manifest.handoff || null,
        reusePrompt: history.reusePrompt || manifest.reusePrompt || ''
      };
    });
    return entries.sort((left, right) => {
      const leftUsed = Date.parse(left.lastUsedAt || '') || 0;
      const rightUsed = Date.parse(right.lastUsedAt || '') || 0;
      return rightUsed - leftUsed;
    });
  }

  function groupedAppPanelEntries(entries = []) {
    const byId = new Map(entries.map((entry) => [normalizeUsageId(entry.id), entry]));
    const groupedIds = new Set();
    const groups = appWorkspaceGroups.map((group) => {
      const members = group.memberIds.map((id) => byId.get(normalizeUsageId(id))).filter(Boolean);
      if (!members.length) return null;
      members.forEach((member) => groupedIds.add(normalizeUsageId(member.id)));
      const primary = byId.get(normalizeUsageId(group.primaryId)) || members[0];
      const latestUsedAt = members
        .map((member) => Date.parse(member.lastUsedAt || '') || 0)
        .sort((left, right) => right - left)[0] || 0;
      return {
        ...primary,
        id: primary.id,
        name: group.name,
        description: group.description,
        capabilities: [...new Set(members.flatMap((member) => Array.isArray(member.capabilities) ? member.capabilities : []))],
        requiredConnectors: [...new Set(members.flatMap((member) => Array.isArray(member.requiredConnectors) ? member.requiredConnectors : []))],
        requiresApprovalFor: [...new Set(members.flatMap((member) => Array.isArray(member.requiresApprovalFor) ? member.requiresApprovalFor : []))],
        lastUsedAt: latestUsedAt ? new Date(latestUsedAt).toISOString() : primary.lastUsedAt,
        lastContext: members.find((member) => member.lastContext)?.lastContext || primary.lastContext,
        lastHandoffUrl: primary.lastHandoffUrl,
        reusePrompt: group.reusePrompt || primary.reusePrompt,
        workspaceMembers: members.map((member) => member.name || member.id)
      };
    }).filter(Boolean);
    const singletons = entries.filter((entry) => {
      const id = normalizeUsageId(entry.id);
      return !groupedIds.has(id) && !appStandaloneHiddenAppIds.has(id);
    });
    return [...groups, ...singletons];
  }

  function usageBadge(text = '') {
    const safe = String(text || '').trim();
    return safe ? `<span class="usage-badge">${escapeHtml(safe)}</span>` : '';
  }

  function appAgentRowsHtml(entries = []) {
    if (!entries.length) {
      return '<div class="chat-hint">No app usage yet. Open a workspace from a delivery or the Apps panel to add it here.</div>';
    }
    return entries.map((entry) => {
      const used = entry.lastUsedAt ? `Last used ${usageDisplayDate(entry.lastUsedAt)}` : 'Available';
      const context = entry.lastContext && typeof entry.lastContext === 'object' ? entry.lastContext : {};
      const meta = [
        used,
        Array.isArray(entry.workspaceMembers) && entry.workspaceMembers.length ? `${entry.workspaceMembers.length} lanes` : '',
        context.product ? `Product: ${context.product}` : '',
        context.goal ? `Goal: ${context.goal}` : '',
        context.channel ? `Channel: ${context.channel}` : ''
      ].filter(Boolean).join(' / ');
      const capabilities = Array.isArray(entry.capabilities) ? entry.capabilities.slice(0, 4).map(usageBadge).join('') : '';
      return [
        '<div class="usage-row">',
        '<div class="usage-main">',
        `<strong>${escapeHtml(entry.name || 'Application')}</strong>`,
        `<span>${escapeHtml(entry.description || '')}</span>`,
        `<span class="usage-meta">${escapeHtml(meta)}</span>`,
        capabilities ? `<div class="usage-badges">${capabilities}</div>` : '',
        '</div>',
        '<div class="usage-actions">',
        `<button class="ghost-btn inline-btn file-action" type="button" data-app-agent-open="${escapeHtml(entry.id)}">Open</button>`,
        `<button class="primary-btn inline-btn file-action" type="button" data-app-agent-reuse="${escapeHtml(entry.id)}">Use again</button>`,
        '</div>',
        '</div>'
      ].filter(Boolean).join('\n');
    }).join('\n');
  }

  function normalizeAppContextRecord(record = {}) {
    const context = record.context && typeof record.context === 'object' ? record.context : {};
    const id = String(record.id || context.id || '').trim();
    if (!id) return null;
    return {
      id,
      sourceApp: String(record.source_app || context.source_app || '').trim(),
      sourceAppLabel: String(record.source_app_label || context.source_app_label || record.source_app || context.source_app || 'App').trim(),
      title: String(record.title || context.title || 'App context').trim(),
      summary: String(record.summary || context.summary || '').trim(),
      status: String(record.status || 'ready').trim(),
      createdAt: String(record.created_at || context.created_at || '').trim(),
      updatedAt: String(record.updated_at || '').trim(),
      expiresAt: String(record.expires_at || '').trim(),
      context: Object.keys(context).length ? context : null
    };
  }

  function appContextRowsHtml(entries = []) {
    const contexts = (Array.isArray(entries) ? entries : []).map(normalizeAppContextRecord).filter(Boolean);
    if (!contexts.length) {
      return '<div class="chat-hint">No server-side app contexts yet. Use Send to CAIt inside an app to save a reusable context packet here.</div>';
    }
    return contexts.slice(0, 12).map((entry) => {
      const meta = [
        entry.sourceAppLabel,
        entry.status ? `Status: ${entry.status}` : '',
        entry.createdAt ? `Created ${usageDisplayDate(entry.createdAt)}` : ''
      ].filter(Boolean).join(' / ');
      return [
        '<div class="usage-row app-context-history-row">',
        '<div class="usage-main">',
        `<strong>${escapeHtml(entry.title || 'App context')}</strong>`,
        `<span class="usage-meta">${escapeHtml(meta)}</span>`,
        entry.summary ? `<span>${escapeHtml(compactUsageText(entry.summary, 220))}</span>` : '',
        '</div>',
        '<div class="usage-actions">',
        `<button class="primary-btn inline-btn file-action" type="button" data-app-context-load="${escapeHtml(entry.id)}">Load into chat</button>`,
        `<a class="ghost-btn inline-btn file-action" href="/chat?app_context_id=${encodeURIComponent(entry.id)}">Open</a>`,
        '</div>',
        '</div>'
      ].filter(Boolean).join('\n');
    }).join('\n');
  }

  function aiAgentRowsHtml(entries = []) {
    if (!entries.length) {
      return `<div class="chat-hint">${escapeHtml(chatText(
        'No AI agent usage yet. Leaders and child agents used in orders or deliveries will appear here.',
        'まだAIエージェント利用履歴はありません。発注または納品取得後に、使ったリーダー・子エージェントがここに追加されます。'
      ))}</div>`;
    }
    return entries.slice(0, 12).map((entry) => {
      const used = entry.lastUsedAt ? `Last used ${usageDisplayDate(entry.lastUsedAt)}` : 'Available';
      const task = entry.taskType ? `Task: ${entry.taskType}` : '';
      const route = entry.route ? `Route: ${entry.route}` : '';
      const meta = [used, task, route, entry.status ? `Status: ${entry.status}` : ''].filter(Boolean).join(' / ');
      return [
        '<div class="usage-row">',
        '<div class="usage-main">',
        `<strong>${escapeHtml(entry.name || taskLabel(entry.taskType))}</strong>`,
        `<span class="usage-meta">${escapeHtml(meta)}</span>`,
        entry.summary ? `<span>${escapeHtml(entry.summary)}</span>` : '',
        entry.originalPrompt ? `<span class="usage-preview">${escapeHtml(compactUsageText(entry.originalPrompt, 180))}</span>` : '',
        '</div>',
        '<div class="usage-actions">',
        `<button class="primary-btn inline-btn file-action" type="button" data-ai-agent-reuse="${escapeHtml(entry.id)}">Use again</button>`,
        '</div>',
        '</div>'
      ].filter(Boolean).join('\n');
    }).join('\n');
  }

  function usageLibraryHtml(scope = 'all') {
    const showApps = scope === 'all' || scope === 'apps';
    const showAgents = scope === 'all' || scope === 'agents';
    const showContexts = scope === 'all' || scope === 'apps' || scope === 'contexts';
    return [
      '<div class="usage-panel">',
      `<strong>${escapeHtml(chatText('Usage History', '利用履歴'))}</strong>`,
      `<div class="chat-hint">${escapeHtml(chatText(
        'Reuse past apps and AI agents from chat. Apps are for final actions; AI agents can restart similar orders from previous conditions.',
        'チャットから過去に使ったアプリとAIエージェントを呼び出せます。アプリは最終アクション、AIエージェントは前回条件の再発注に使います。'
      ))}</div>`,
      showContexts ? '<h3>Server App Contexts</h3>' : '',
      showContexts ? appContextRowsHtml(state.appContexts) : '',
      showApps ? '<h3>Workspaces</h3>' : '',
      showApps ? appAgentRowsHtml(groupedAppPanelEntries(recentAppAgentEntries())) : '',
      showAgents ? '<h3>AI Agents</h3>' : '',
      showAgents ? aiAgentRowsHtml(state.aiAgentHistory) : '',
      '<div class="chat-hint">Commands: /apps, /agents, /history</div>',
      '</div>'
    ].filter(Boolean).join('\n');
  }

  function libraryCommandScope(prompt = '') {
    const text = String(prompt || '').trim();
    const lower = text.toLowerCase();
    if (/^\/(?:history|tools|library)\b/.test(lower)) return 'all';
    if (/^\/(?:contexts|app-contexts|context)\b/.test(lower)) return 'contexts';
    if (/(最近|過去|使った|利用した).*(アプリ).*(ai\s*agent|aiagent|エージェント).*(一覧|履歴|呼び出|見せて|表示)/i.test(text)) return 'all';
    if (/(最近|過去|使った|利用した).*(ai\s*agent|aiagent|エージェント).*(アプリ).*(一覧|履歴|呼び出|見せて|表示)/i.test(text)) return 'all';
    if (/^\/apps\b/.test(lower) || /^(最近|過去|使った|利用した)?.*(アプリ).*(一覧|履歴|呼び出|見せて|表示)/.test(text)) return 'apps';
    if (/^\/agents\b/.test(lower) || /^\/aiagents\b/.test(lower) || /^(最近|過去|使った|利用した)?.*(ai\s*agent|aiagent|エージェント).*(一覧|履歴|呼び出|見せて|表示)/i.test(text)) return 'agents';
    if (/(最近|過去|使った|利用した).*(アプリ|ai\s*agent|aiagent|エージェント).*(一覧|履歴|呼び出|見せて|表示)/i.test(text)) return 'all';
    return '';
  }

  function directAppCommandTextTokens(value = '') {
    const raw = String(value || '').trim().toLowerCase();
    const normalized = normalizeUsageId(raw);
    return [
      raw,
      raw.replace(/[\s　_-]+/g, ''),
      normalized,
      normalized.replace(/[_-]+/g, '')
    ].filter((item, index, array) => item && array.indexOf(item) === index);
  }

  function directAppCommandId(prompt = '') {
    const text = String(prompt || '').trim();
    if (!/(open|launch|use|show|開|起動|呼び出|使|表示)/i.test(text)) return '';
    const promptTokens = directAppCommandTextTokens(text);
    for (const app of appManifestSources()) {
      const aliases = [
        app.id,
        app.name,
        ...(Array.isArray(app.directCommandAliases) ? app.directCommandAliases : [])
      ]
        .flatMap(directAppCommandTextTokens)
        .filter((item) => item && item.length >= 2)
        .filter((item, index, array) => array.indexOf(item) === index);
      const matched = aliases.some((alias) => promptTokens.some((token) => token.includes(alias)));
      if (matched) return app.id;
    }
    return '';
  }

  return {
    appAgentLaunchUrl,
    appManifestById,
    appManifestSources,
    compactTransferObject,
    compactTransferText,
    compactUsageText,
    directAppCommandId,
    groupedAppPanelEntries,
    isoNow,
    isCoreFeatureAppId,
    libraryCommandScope,
    listValues,
    normalizeUsageId,
    recentAppAgentEntries,
    rememberAiAgentUsage,
    rememberAppAgentUsage,
    usageBadge,
    usageLibraryHtml
  };
}
