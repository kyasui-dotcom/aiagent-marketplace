import {
  connectorGateApprovalAnchor,
  connectorGateAuthorityHandledBySaasHandoff,
  connectorGateAuthorityIsActionable,
  connectorGateAuthorityNoticeKey,
  connectorGateAuthorityRequestFromJob
} from './connector-gate.js?v=20260519a';
import {
  appHandoffArtifactLabel as appHandoffGateArtifactLabel,
  appHandoffConnectorNotes as appHandoffGateConnectorNotes,
  appHandoffDedicatedTextSourceKind as appHandoffGateDedicatedTextSourceKind,
  appHandoffEntryMatchesArtifact as appHandoffGateEntryMatchesArtifact,
  appHandoffHasDedicatedDelivery as appHandoffGateHasDedicatedDelivery,
  appHandoffRankEntries as appHandoffGateRankEntries,
  genericSuppressedAppHandoffIds as appHandoffGateGenericSuppressedAppHandoffIds,
  explicitHandoffArtifactTypesFromAuthorityRequest as appHandoffGateExplicitArtifactTypesFromAuthorityRequest,
  explicitHandoffArtifactTypesFromFile as appHandoffGateExplicitArtifactTypesFromFile,
  renderAppHandoffTree as appHandoffGateRenderTree
} from './app-handoff-gate.js?v=20260526c';
import {
  appContextFromTransferPayload,
  appHandoffBaseTransferPacket,
  appHandoffContractTextLimit,
  appHandoffPayloadContractError,
  appHandoffSocialPostDraftFromDeliveryFiles,
  appTransferPayloadWithEditedText
} from './app-handoff-transfer.js?v=20260526h';

function fallbackNormalizeUsageId(value = '') {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_:-]+/g, '_').replace(/^_+|_+$/g, '');
}

function fallbackEscapeHtml(value = '') {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char] || char));
}

function fallbackCompact(value = '', max = 280) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trim()}…`;
}

export function createChatAppHandoffController(options = {}) {
  const {
    appAgentManifests = [],
    returnPath = '/chat',
    getActiveOrderId = () => '',
    appManifestById = () => null,
    appManifestSources = () => [],
    appAgentLaunchUrl = () => '',
    normalizeUsageId = fallbackNormalizeUsageId,
    listValues = (value) => (Array.isArray(value) ? value : []),
    compactTransferText = fallbackCompact,
    compactTransferObject = (value) => value,
    chatLanguage = () => 'en',
    isoNow = () => new Date().toISOString(),
    statusLabel = (job = {}) => String(job?.status || '').trim(),
    taskLabel = (value = '') => String(value || '').trim(),
    visibleWorkflowChildRuns = () => [],
    deliveryText = () => '',
    deliveryFiles = () => [],
    fileMimeType = () => '',
    escapeHtml = fallbackEscapeHtml,
    usageBadge = () => '',
    compact = fallbackCompact,
    api = async () => ({}),
    apiWithRetry = async (...args) => api(...args),
    rememberAppAgentUsage = () => {}
  } = options;

  const appTransferStore = new Map();

  function appAgentSourceAgentsFromJob(job = {}) {
    const agents = [];
    const primaryTask = String((Array.isArray(job.workflow?.plannedTasks) ? job.workflow.plannedTasks[0] : '') || job.taskType || '').trim().toLowerCase();
    if (primaryTask) {
      agents.push({
        role: 'primary',
        name: taskLabel(primaryTask),
        taskType: primaryTask,
        status: String(job.status || '').trim(),
        orderId: String(job.id || '').trim()
      });
    }
    const childRuns = visibleWorkflowChildRuns(job.workflow?.childRuns);
    for (const child of childRuns) {
      const taskType = String(child.taskType || child.dispatchTaskType || '').trim().toLowerCase();
      if (!taskType) continue;
      agents.push({
        role: child.sequencePhase || 'workflow_child',
        name: String(child.agentName || taskLabel(taskType)).trim(),
        agentId: String(child.agentId || '').trim(),
        taskType,
        dispatchTaskType: String(child.dispatchTaskType || '').trim(),
        status: String(child.status || '').trim(),
        orderId: String(child.id || '').trim()
      });
    }
    return agents.slice(0, 18);
  }

  function appHandoffTransferOptions(extraOptions = {}) {
    return {
      manifestById: appManifestById,
      normalizeUsageId,
      listValues,
      compactTransferText,
      compactTransferObject,
      chatLanguage,
      isoNow,
      statusLabel,
      appAgentSourceAgentsFromJob,
      deliveryText,
      deliveryFiles,
      explicitHandoffArtifactTypesFromFile,
      fileMimeType,
      returnPath,
      ...extraOptions
    };
  }

  function registerAppTransferPayload(payload = {}) {
    const id = String(payload.transfer_id || payload.transferId || `transfer-${Date.now().toString(36)}`).trim();
    if (!id) return '';
    appTransferStore.set(id, payload);
    while (appTransferStore.size > 40) {
      const first = appTransferStore.keys().next().value;
      appTransferStore.delete(first);
    }
    return id;
  }

  function clearAppTransferPayloads() {
    appTransferStore.clear();
  }

  function authorityRequestFromJob(job = {}) {
    return connectorGateAuthorityRequestFromJob(job);
  }

  function authorityRequestHandledBySaasHandoffInChat(request = null) {
    return connectorGateAuthorityHandledBySaasHandoff(request);
  }

  function jobBlockedForSaasHandoff(job = {}) {
    const status = String(job?.status || '').trim().toLowerCase();
    if (!['blocked', 'waiting'].includes(status)) return false;
    return authorityRequestHandledBySaasHandoffInChat(authorityRequestFromJob(job));
  }

  function authorityRequestIsActionableForJob(job = {}, request = null) {
    return connectorGateAuthorityIsActionable(job, request);
  }

  function approvalAnchorForJob(job = {}) {
    return connectorGateApprovalAnchor(job, getActiveOrderId());
  }

  function authorityNoticeKey(job = {}) {
    return connectorGateAuthorityNoticeKey(job);
  }

  function explicitHandoffArtifactTypesFromFile(file = {}) {
    return appHandoffGateExplicitArtifactTypesFromFile(file, { normalizeUsageId, listValues });
  }

  function explicitHandoffArtifactTypesFromAuthorityRequest(request = null) {
    return appHandoffGateExplicitArtifactTypesFromAuthorityRequest(request, { normalizeUsageId, listValues });
  }

  function socialPostDraftFromJob(job = {}) {
    const files = deliveryFiles(job);
    const orderedFiles = files.filter((file) => {
      const explicitTypes = explicitHandoffArtifactTypesFromFile(file);
      return ['post_text', 'social_post_pack', 'social_copy_packet', 'social_post', 'x_post', 'x_post_packet'].some((type) => explicitTypes.has(type));
    });
    return appHandoffSocialPostDraftFromDeliveryFiles(orderedFiles, { maxLength: 1200 });
  }

  function compactStrategyText(value = '', max = 1500) {
    const text = String(value || '')
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    if (text.length <= max) return text;
    return `${text.slice(0, Math.max(0, max - 1)).trim()}…`;
  }

  function firstStructuredText(...values) {
    for (const value of values) {
      const text = compactStrategyText(value || '', 1200);
      if (text) return text;
    }
    return '';
  }

  function firstStructuredUrl(...values) {
    for (const value of values) {
      const text = String(value || '').trim();
      if (/^https?:\/\/[^\s"'<>`]+$/i.test(text)) return text;
    }
    return '';
  }

  function structuredHandoffContextsFromJob(job = {}) {
    const input = job.input && typeof job.input === 'object' ? job.input : {};
    const broker = input._broker && typeof input._broker === 'object' ? input._broker : {};
    const workflow = job.workflow && typeof job.workflow === 'object' ? job.workflow : {};
    const output = job.output && typeof job.output === 'object' ? job.output : {};
    const result = job.result && typeof job.result === 'object' ? job.result : {};
    const candidates = [
      job.appHandoffContext,
      job.app_handoff_context,
      job.handoffContext,
      job.handoff_context,
      job.strategyContext,
      job.strategy_context,
      workflow.appHandoffContext,
      workflow.app_handoff_context,
      workflow.handoffContext,
      workflow.handoff_context,
      workflow.strategyContext,
      workflow.strategy_context,
      broker.appHandoffContext,
      broker.app_handoff_context,
      broker.handoffContext,
      broker.handoff_context,
      broker.strategyContext,
      broker.strategy_context,
      output.appHandoffContext,
      output.app_handoff_context,
      output.handoffContext,
      output.handoff_context,
      output.strategyContext,
      output.strategy_context,
      result.appHandoffContext,
      result.app_handoff_context,
      result.handoffContext,
      result.handoff_context,
      result.strategyContext,
      result.strategy_context,
      ...deliveryFiles(job).flatMap((file) => [
        file?.appHandoffContext,
        file?.app_handoff_context,
        file?.handoffContext,
        file?.handoff_context,
        file?.strategyContext,
        file?.strategy_context
      ])
    ];
    return candidates.filter((item) => item && typeof item === 'object');
  }

  function actionStrategyContextFromJob(job = {}) {
    const contexts = structuredHandoffContextsFromJob(job);
    const pick = (...keys) => {
      for (const context of contexts) {
        const value = firstStructuredText(...keys.map((key) => context?.[key]));
        if (value) return value;
      }
      return '';
    };
    const pickUrl = (...keys) => {
      for (const context of contexts) {
        const value = firstStructuredUrl(...keys.map((key) => context?.[key]));
        if (value) return value;
      }
      return '';
    };
    return {
      strategy: pick('strategy', 'strategyText', 'strategy_text', 'brief', 'notes', 'summary'),
      product: pick('product', 'brandName', 'brand_name', 'serviceLine', 'service_line'),
      audience: pick('audience', 'targetClient', 'target_client', 'primaryAudience', 'primary_audience', 'icp'),
      goal: pick('goal', 'defaultCta', 'default_cta', 'objective', 'conversion'),
      channel: pick('channel', 'primaryChannel', 'primary_channel', 'medium'),
      url: pickUrl('url', 'destinationLink', 'destination_link', 'serviceUrl', 'service_url', 'targetUrl', 'target_url')
    };
  }

  function appAgentContextOpenUrl(appId = '', appContextResult = {}, payload = {}) {
    const manifest = appManifestById(appId) || {};
    const href = appAgentLaunchUrl(manifest);
    if (!href) return '';
    const url = new URL(href, window.location.origin);
    url.searchParams.set('cait_source', 'CAIt');
    url.searchParams.set('cait_context_schema', 'cait-app-context/v1');
    if (appContextResult?.app_context_id) url.searchParams.set('cait_app_context_id', String(appContextResult.app_context_id));
    if (appContextResult?.app_context_token) url.searchParams.set('cait_app_context_token', String(appContextResult.app_context_token));
    if (payload?.order?.id) url.searchParams.set('cait_job', String(payload.order.id).trim());
    return url.toString();
  }

  async function createAppAgentContextOpenUrl(appId = '', payload = {}, extraOptions = {}) {
    const safeAppId = normalizeUsageId(appId || '');
    const manifest = appManifestById(safeAppId) || {};
    const contextPath = extraOptions.contextPath || manifest.contextIngestUrl || manifest.context_ingest_url || '/api/app-contexts';
    const result = await apiWithRetry(contextPath, {
      method: 'POST',
      body: JSON.stringify({
        app_id: appId,
        context: appContextFromTransferPayload(appId, payload, appHandoffTransferOptions())
      })
    }, {
      maxAttempts: 3,
      statuses: [408, 425, 429, 500, 502, 503, 504],
      baseDelayMs: 700,
      maxDelayMs: 4000
    });
    const openUrl = appAgentContextOpenUrl(appId, result, payload);
    if (!openUrl) throw new Error(`${appManifestById(appId)?.name || 'App'} does not have an entry URL for context handoff.`);
    return openUrl;
  }

  async function createAppAgentHandoffUrl(appId = '', payload = {}) {
    const manifest = appManifestById(appId);
    const createUrl = manifest?.handoff?.createUrl ? `/api/apps/${encodeURIComponent(manifest.id || appId)}/handoff` : '';
    if (!createUrl) return createAppAgentContextOpenUrl(appId, payload);
    const data = await api(createUrl, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const handoffUrl = data?.handoff_url || data?.handoffUrl || data?.open_url || data?.openUrl || data?.url || '';
    if (!handoffUrl) throw new Error(String(data?.error || `${manifest?.name || 'App agent'} handoff response did not include a URL.`));
    return String(handoffUrl || manifest?.entryUrl || manifest?.baseUrl || '');
  }

  function preparedTextForDedicatedDelivery(entry = {}, job = {}) {
    const sourceKind = appHandoffGateDedicatedTextSourceKind(entry, { normalizeUsageId, listValues });
    if (sourceKind === 'social_post_text') return socialPostDraftFromJob(job)?.text || '';
    return deliveryText(job);
  }

  function appHandoffDedicatedTextSource(entry = {}, job = {}) {
    const sourceKind = appHandoffGateDedicatedTextSourceKind(entry, { normalizeUsageId, listValues });
    if (sourceKind === 'social_post_text') {
      const draft = socialPostDraftFromJob(job);
      if (draft?.text) return draft;
    }
    const text = deliveryText(job);
    return text ? { text, source: 'CAIt delivery' } : null;
  }

  function dedicatedAppHandoffTitle(entry = {}) {
    return `CAIt final ${entry?.name || 'app'} handoff`;
  }

  function dedicatedAppTransferPayload(entry = {}, job = {}, draft = {}, strategy = {}) {
    const appId = normalizeUsageId(entry.id || '');
    const transfer = appHandoffBaseTransferPacket(appId, job, appHandoffTransferOptions({ draft, strategy, actionKind: 'dedicated_app_handoff' }));
    const sourceKind = appHandoffGateDedicatedTextSourceKind(entry, { normalizeUsageId, listValues });
    const postText = sourceKind === 'social_post_text' ? String(draft?.text || '').trim() : '';
    return {
      schema_version: entry?.inputContract?.schemaVersion || 'cait-app-agent-transfer/v1',
      transfer_id: transfer.transfer_id,
      text: String(draft?.text || '').trim(),
      ...(postText ? { post_text: postText } : {}),
      source: String(draft?.source || 'CAIt delivery').trim(),
      title: dedicatedAppHandoffTitle(entry),
      jobId: String(job?.id || '').trim(),
      strategy: strategy.strategy || '',
      product: strategy.product || '',
      audience: strategy.audience || '',
      goal: strategy.goal || '',
      channel: strategy.channel || '',
      url: strategy.url || '',
      source_agent: transfer.agents[0] || null,
      agents: transfer.agents,
      context: {
        platform: transfer.platform,
        app: transfer.app,
        order: transfer.order,
        delivery: transfer.delivery
      },
      settings: transfer.settings,
      transfer
    };
  }

  function renderDedicatedAppDeliveryTools(job = {}) {
    const jobId = String(job?.id || '').trim();
    const cards = [];
    for (const entry of appAgentHandoffCandidates(job)) {
      if (!appHandoffGateHasDedicatedDelivery(entry, job, {
        normalizeUsageId,
        listValues,
        deliveryHandoffArtifactTypes,
        preparedTextForDedicatedDelivery
      })) continue;
      const draft = appHandoffDedicatedTextSource(entry, job);
      if (!draft?.text) continue;
      const strategy = actionStrategyContextFromJob(job);
      const transferPayload = dedicatedAppTransferPayload(entry, job, draft, strategy);
      const transferId = registerAppTransferPayload(transferPayload);
      const appUrl = appAgentLaunchUrl(entry) || '/apps.html';
      const title = dedicatedAppHandoffTitle(entry);
      const textLimit = appHandoffContractTextLimit(entry);
      const countLabel = textLimit ? `${String(draft.text).length}/${textLimit}` : `${String(draft.text).length} chars`;
      rememberAppAgentUsage(entry.id, {
        title,
        lastHandoffUrl: appUrl,
        lastOrderId: jobId,
        source: draft.source,
        product: strategy.product,
        audience: strategy.audience,
        goal: strategy.goal,
        channel: strategy.channel,
        lastContext: {
          title,
          source: draft.source,
          product: strategy.product,
          audience: strategy.audience,
          goal: strategy.goal,
          channel: strategy.channel
        },
        lastTransfer: compactTransferObject(transferPayload, { depth: 4, maxText: 700, maxArray: 8 })
      }, { increment: false });
      cards.push([
        '<div class="app-dedicated-handoff-card" data-app-transfer-edit-root="1">',
        `<strong>Final action: ${escapeHtml(entry.name || 'App handoff')}</strong>`,
        `<div class="chat-hint">CAIt has attached the prepared handoff text and strategy context declared by the app manifest. Open ${escapeHtml(entry.name || 'the app')} to continue the final action outside chat.</div>`,
        `<label class="app-dedicated-handoff-label" for="app-handoff-${escapeHtml(normalizeUsageId(entry.id || 'app'))}-${escapeHtml(jobId || 'draft')}">Handoff text (${escapeHtml(countLabel)})</label>`,
        `<textarea class="app-dedicated-handoff-editor" id="app-handoff-${escapeHtml(normalizeUsageId(entry.id || 'app'))}-${escapeHtml(jobId || 'draft')}" data-app-transfer-editable="text" data-app-transfer-source="${escapeHtml(draft.source)}" data-app-transfer-title="${escapeHtml(title)}" data-app-transfer-id="${escapeHtml(transferId)}" rows="5">${escapeHtml(draft.text)}</textarea>`,
        `<div class="chat-hint">Source: ${escapeHtml(draft.source)}${strategy.strategy ? ' / Strategy attached' : ''} / Agent-app transfer attached</div>`,
        '<div class="inline-actions">',
        `<button class="primary-btn inline-btn file-action" type="button" data-app-agent-handoff="${escapeHtml(entry.id)}" data-app-transfer-id="${escapeHtml(transferId)}">Open ${escapeHtml(entry.name || 'app')}</button>`,
        `<button class="ghost-btn inline-btn file-action" type="button" data-app-transfer-copy="${escapeHtml(transferId)}">Copy handoff text</button>`,
        `<span class="chat-hint">${escapeHtml(entry.name || 'The app')} handles account connection and final external action outside chat.</span>`,
        '</div>',
        '<span class="chat-hint">CAIt will not post, publish, or send automatically from a summary alone. Use the SaaS surface or copy the prepared text into the target service for the final user action.</span>',
        '</div>'
      ].filter(Boolean).join('\n'));
    }
    return cards.join('\n');
  }

  function appAgentHandoffTitle(job = {}) {
    const text = deliveryText(job);
    const first = String(text || '').split('\n').map((line) => line.trim()).find(Boolean) || '';
    return compact(first.replace(/^#+\s*/, ''), 140) || `CAIt delivery ${String(job?.id || '').slice(0, 8)}`;
  }

  function appAgentGenericTransferPayload(appId = '', job = {}) {
    const text = deliveryText(job);
    return {
      ...appHandoffBaseTransferPacket(appId, job, appHandoffTransferOptions({
        actionKind: 'app_handoff',
        action: {
          source: 'CAIt delivery',
          text,
          title: appAgentHandoffTitle(job)
        }
      })),
      title: appAgentHandoffTitle(job),
      source: 'CAIt delivery',
      summary: compactTransferText(text, 1800),
      files: deliveryFiles(job)
    };
  }

  function appHandoffRememberDetails(appId = '', payload = {}, handoffUrl = '', source = 'generic_app_handoff') {
    const settings = payload.settings && typeof payload.settings === 'object' ? payload.settings : {};
    const order = payload.order && typeof payload.order === 'object' ? payload.order : {};
    return rememberAppAgentUsage(appId, {
      title: payload.title || payload.action?.title || 'CAIt app handoff',
      lastHandoffUrl: handoffUrl,
      lastOrderId: order.id || '',
      source,
      product: settings.serviceLine || settings.brandName || '',
      audience: settings.targetClient || '',
      goal: settings.defaultCta || '',
      channel: settings.channel || '',
      lastContext: payload,
      lastTransfer: compactTransferObject(payload, { depth: 4, maxText: 700, maxArray: 8 })
    });
  }

  function deliveryHandoffArtifactTypes(job = {}) {
    const types = new Set();
    const add = (...items) => {
      items.map(normalizeUsageId).filter(Boolean).forEach((item) => types.add(item));
    };
    const files = deliveryFiles(job);

    const authorityRequest = authorityRequestFromJob(job);
    if (authorityRequestHandledBySaasHandoffInChat(authorityRequest)) {
      for (const artifactType of explicitHandoffArtifactTypesFromAuthorityRequest(authorityRequest)) add(artifactType);
    }

    for (const file of files) {
      for (const artifactType of explicitHandoffArtifactTypesFromFile(file)) add(artifactType);
    }

    return types;
  }

  function appHandoffArtifactLabel(artifactType = '') {
    return appHandoffGateArtifactLabel(artifactType, { normalizeUsageId });
  }

  function appHandoffEntryMatchesArtifact(entry = {}, artifactType = '') {
    return appHandoffGateEntryMatchesArtifact(entry, artifactType, { normalizeUsageId, listValues });
  }

  function appHandoffConnectorNotes(entry = {}, artifactType = '') {
    return appHandoffGateConnectorNotes(entry, artifactType, { normalizeUsageId, listValues });
  }

  function renderAppHandoffTree(job = {}, entries = []) {
    return appHandoffGateRenderTree(job, entries, {
      escapeHtml,
      normalizeUsageId,
      listValues,
      deliveryHandoffArtifactTypes
    });
  }

  function renderAppHandoffRoutingPreview(job = {}) {
    const entries = appAgentHandoffCandidates(job);
    if (!entries.length) return '';
    const tree = renderAppHandoffTree(job, entries);
    if (!tree) return '';
    const appLinks = entries
      .map((entry) => {
        const directUrl = String(entry.entryUrl || entry.baseUrl || '').trim();
        if (!directUrl) return '';
        return `<a class="ghost-btn inline-btn file-action" href="${escapeHtml(directUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(entry.name || 'Open app')}</a>`;
      })
      .filter(Boolean)
      .join('');
    return [
      '<div class="app-handoff-preview">',
      tree,
      appLinks ? `<div class="inline-actions">${appLinks}</div>` : '',
      '</div>'
    ].filter(Boolean).join('\n');
  }

  function genericSuppressedAppHandoffIds(job = {}) {
    return appHandoffGateGenericSuppressedAppHandoffIds(appAgentHandoffCandidates(job), job, {
      normalizeUsageId,
      listValues,
      deliveryHandoffArtifactTypes,
      preparedTextForDedicatedDelivery
    });
  }

  function appAgentHandoffCandidates(job = {}) {
    return appHandoffGateRankEntries(appManifestSources(), job, {
      normalizeUsageId,
      listValues,
      deliveryHandoffArtifactTypes,
      caitManagedAppIds: appAgentManifests.map((item) => item.id)
    });
  }

  function renderAppHandoffTools(job = {}) {
    const status = String(job.status || '').trim().toLowerCase();
    const hasPreparationData = deliveryFiles(job).length > 0
      || visibleWorkflowChildRuns(job.workflow?.childRuns).some((child) => ['completed', 'failed', 'blocked', 'waiting'].includes(String(child.status || '').trim().toLowerCase()));
    if (!['completed', 'failed', 'blocked', 'waiting'].includes(status) || !hasPreparationData) return '';
    const suppressedIds = genericSuppressedAppHandoffIds(job);
    const entries = appAgentHandoffCandidates(job)
      .filter((entry) => !suppressedIds.has(normalizeUsageId(entry.id || '')));
    if (!entries.length) return '';
    const rows = entries.map((entry) => {
      const payload = appAgentGenericTransferPayload(entry.id, job);
      const transferId = registerAppTransferPayload(payload);
      const hasPostHandoff = Boolean(entry.handoff?.createUrl);
      const directUrl = String(entry.entryUrl || entry.baseUrl || '').trim();
      const capabilities = Array.isArray(entry.capabilities) ? entry.capabilities.slice(0, 3).map(usageBadge).join('') : '';
      return [
        '<div class="app-handoff-row">',
        '<div class="app-handoff-main">',
        `<strong>${escapeHtml(entry.name || 'Registered app')}</strong>`,
        `<span>${escapeHtml(entry.description || 'Receive this CAIt delivery as structured app context.')}</span>`,
        entry.handoffReason ? `<span class="chat-hint">Matched: ${escapeHtml(entry.handoffReason)}</span>` : '',
        capabilities ? `<div class="usage-badges">${capabilities}</div>` : '',
        '</div>',
        '<div class="app-handoff-actions">',
        `<button class="primary-btn inline-btn file-action" type="button" data-app-agent-handoff="${escapeHtml(entry.id)}" data-app-transfer-id="${escapeHtml(transferId)}">${hasPostHandoff ? 'Send context' : 'Open with context'}</button>`,
        directUrl ? `<a class="ghost-btn inline-btn file-action" href="${escapeHtml(directUrl)}" target="_blank" rel="noopener noreferrer">Open app</a>` : '',
        '</div>',
        '</div>'
      ].filter(Boolean).join('\n');
    }).join('\n');
    return [
      '<div class="app-handoff-card">',
      '<strong>App handoff</strong>',
      '<div class="chat-hint">Preparation-layer delivery data is already available to matching SaaS apps. Open the relevant app to publish, create an approval packet, or copy the prepared text into the target service.</div>',
      renderAppHandoffTree(job, entries),
      rows,
      '</div>'
    ].join('\n');
  }

  function prepareAppHandoffPayload(appId = '', transferId = '', button = null) {
    const manifest = appManifestById(appId);
    let payload = appTransferStore.get(String(transferId || '').trim()) || null;
    if (!manifest || !payload) {
      return {
        manifest,
        payload: null,
        contractError: '',
        missing: true
      };
    }
    payload = appTransferPayloadWithEditedText(payload, button, { compactTransferText });
    return {
      manifest,
      payload,
      contractError: appHandoffPayloadContractError(manifest, payload),
      missing: false
    };
  }

  return {
    appAgentSourceAgentsFromJob,
    authorityRequestFromJob,
    authorityRequestHandledBySaasHandoffInChat,
    jobBlockedForSaasHandoff,
    authorityRequestIsActionableForJob,
    approvalAnchorForJob,
    authorityNoticeKey,
    createAppAgentContextOpenUrl,
    createAppAgentHandoffUrl,
    appHandoffRememberDetails,
    renderDedicatedAppDeliveryTools,
    renderAppHandoffRoutingPreview,
    renderAppHandoffTools,
    prepareAppHandoffPayload,
    clearAppTransferPayloads,
    appHandoffArtifactLabel,
    appHandoffEntryMatchesArtifact,
    appHandoffConnectorNotes
  };
}
