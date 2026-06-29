import { normalizeCampaignMetric, normalizeCampaignRecord, normalizeCampaignStatus } from '../campaigns.js';

export function createCampaignRouteHandlers(deps = {}) {
  const {
    canViewAdminDashboard,
    catalogPagePayload,
    currentOrderRequesterContext,
    identityLoginsForCurrent,
    nowIso,
    parseBody,
    touchEvent
  } = deps;

  function publicCampaign(campaign = {}) {
    const normalized = normalizeCampaignRecord(campaign);
    return {
      id: normalized.id,
      ownerLogin: normalized.ownerLogin || '',
      title: normalized.title,
      objective: normalized.objective,
      status: normalized.status,
      source: normalized.source,
      cmoPlanJobId: normalized.cmoPlanJobId,
      operationsAgentJobId: normalized.operationsAgentJobId,
      targetUrl: normalized.targetUrl,
      audience: normalized.audience,
      channels: normalized.channels,
      kpis: normalized.kpis,
      plan: normalized.plan,
      tasks: normalized.tasks,
      metrics: normalized.metrics,
      logs: normalized.logs,
      publisher: normalized.publisher,
      integrations: normalized.integrations,
      leadSource: normalized.leadSource,
      ads: normalized.ads,
      metadata: normalized.metadata,
      createdAt: normalized.createdAt,
      updatedAt: normalized.updatedAt
    };
  }

  function campaignVisibleToCurrent(campaign = {}, current = null, env = {}) {
    if (canViewAdminDashboard(current, env)) return true;
    const owner = String(campaign?.ownerLogin || campaign?.owner_login || '').trim().toLowerCase();
    return Boolean(owner && identityLoginsForCurrent(current).includes(owner));
  }

  async function campaignsPayload(storage, request, env) {
    const url = new URL(request.url);
    const current = await currentOrderRequesterContext(storage, request, env, { lightweight: true });
    if (!current?.login) return { error: 'Login required', statusCode: 401 };
    const identityLogins = identityLoginsForCurrent(current);
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') || 50) || 50));
    const campaigns = typeof storage.listCampaigns === 'function'
      ? await storage.listCampaigns({
          admin: canViewAdminDashboard(current, env),
          ownerLogins: identityLogins,
          limit
        })
      : (Array.isArray((await storage.getState())?.campaigns) ? (await storage.getState()).campaigns : []);
    const visible = (Array.isArray(campaigns) ? campaigns : [])
      .filter((campaign) => campaignVisibleToCurrent(campaign, current, env))
      .map(publicCampaign);
    return {
      ...catalogPagePayload(visible, url, 'campaigns'),
      auth: { login: current.login, mode: current.apiKeyStatus === 'valid' ? 'api_key' : current.authProvider || 'session' }
    };
  }

  async function createCampaignPayload(storage, request, env) {
    const current = await currentOrderRequesterContext(storage, request, env, { lightweight: true });
    if (!current?.login) return { error: 'Login required', statusCode: 401 };
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return { error: error.message, statusCode: 400 };
    }
    const now = nowIso();
    const campaign = normalizeCampaignRecord({
      ...(body && typeof body === 'object' ? body : {}),
      ownerLogin: body?.ownerLogin || body?.owner_login || current.login,
      source: body?.source || 'api',
      status: normalizeCampaignStatus(body?.status || 'draft'),
      logs: [
        ...((Array.isArray(body?.logs) ? body.logs : [])),
        { type: 'created', message: 'Campaign created.', actor: current.login, createdAt: now }
      ],
      createdAt: body?.createdAt || now,
      updatedAt: now
    }, { ownerLogin: current.login });
    if (!campaign.title || campaign.title === 'Untitled campaign') return { error: 'Campaign title is required', statusCode: 400 };
    if (campaign.ownerLogin !== String(current.login || '').trim().toLowerCase() && !canViewAdminDashboard(current, env)) {
      return { error: 'Cannot create a campaign for another owner', statusCode: 403 };
    }
    const saved = typeof storage.upsertCampaign === 'function'
      ? await storage.upsertCampaign(campaign)
      : await storage.mutate(async (draft) => {
          draft.campaigns = Array.isArray(draft.campaigns) ? draft.campaigns : [];
          draft.campaigns.unshift(campaign);
          return campaign;
        });
    await touchEvent(storage, 'CAMPAIGN', `${campaign.title} campaign created`, {
      campaignId: campaign.id,
      ownerLogin: campaign.ownerLogin,
      status: campaign.status
    });
    return { ok: true, campaign: publicCampaign(saved || campaign), statusCode: 201 };
  }

  async function campaignDetailPayload(storage, request, env, campaignId = '') {
    const current = await currentOrderRequesterContext(storage, request, env, { lightweight: true });
    if (!current?.login) return { error: 'Login required', statusCode: 401 };
    const campaign = typeof storage.getCampaignById === 'function'
      ? await storage.getCampaignById(campaignId)
      : (Array.isArray((await storage.getState())?.campaigns) ? (await storage.getState()).campaigns.find((item) => String(item?.id || '') === campaignId) : null);
    if (!campaign) return { error: 'Campaign not found', statusCode: 404 };
    if (!campaignVisibleToCurrent(campaign, current, env)) return { error: 'Not authorized for this campaign', statusCode: 403 };
    return { ok: true, campaign: publicCampaign(campaign) };
  }

  async function updateCampaignPayload(storage, request, env, campaignId = '') {
    const current = await currentOrderRequesterContext(storage, request, env, { lightweight: true });
    if (!current?.login) return { error: 'Login required', statusCode: 401 };
    const existing = typeof storage.getCampaignById === 'function'
      ? await storage.getCampaignById(campaignId)
      : (Array.isArray((await storage.getState())?.campaigns) ? (await storage.getState()).campaigns.find((item) => String(item?.id || '') === campaignId) : null);
    if (!existing) return { error: 'Campaign not found', statusCode: 404 };
    if (!campaignVisibleToCurrent(existing, current, env)) return { error: 'Not authorized for this campaign', statusCode: 403 };
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return { error: error.message, statusCode: 400 };
    }
    const now = nowIso();
    const existingLogs = Array.isArray(existing.logs) ? existing.logs : [];
    const patchLogs = Array.isArray(body?.logs) ? body.logs : [];
    const updated = normalizeCampaignRecord({
      ...existing,
      ...(body && typeof body === 'object' ? body : {}),
      id: existing.id,
      ownerLogin: existing.ownerLogin || existing.owner_login || current.login,
      logs: [
        ...existingLogs,
        ...patchLogs,
        { type: 'updated', message: 'Campaign updated.', actor: current.login, createdAt: now }
      ],
      updatedAt: now
    });
    const saved = typeof storage.upsertCampaign === 'function'
      ? await storage.upsertCampaign(updated)
      : await storage.mutate(async (draft) => {
          draft.campaigns = Array.isArray(draft.campaigns) ? draft.campaigns : [];
          const index = draft.campaigns.findIndex((item) => String(item?.id || '') === campaignId);
          if (index >= 0) draft.campaigns[index] = updated;
          else draft.campaigns.unshift(updated);
          return updated;
        });
    await touchEvent(storage, 'CAMPAIGN', `${updated.title} campaign updated`, {
      campaignId: updated.id,
      ownerLogin: updated.ownerLogin,
      status: updated.status
    });
    return { ok: true, campaign: publicCampaign(saved || updated) };
  }

  function normalizePublisherCampaignItem(item = {}, index = 0) {
    const now = nowIso();
    const channel = String(item.channel || item.channel_key || item.destination || item.connector || 'publisher').trim().toLowerCase();
    return {
      id: String(item.id || item.publisherItemId || item.publisher_item_id || `publisher_item_${index + 1}`).trim(),
      channel,
      agentKind: String(item.agentKind || item.agent_kind || item.sourceAgent || item.source_agent || item.task_type || '').trim(),
      title: String(item.title || item.summary || `${channel || 'Publisher'} item ${index + 1}`).trim(),
      brief: String(item.brief || item.body || item.content || item.description || '').trim(),
      status: String(item.status || 'waiting_approval').trim().toLowerCase().replace(/[\s-]+/g, '_'),
      dueAt: String(item.dueAt || item.due_at || item.scheduledAt || item.scheduled_at || '').trim(),
      publisherItemId: String(item.publisherItemId || item.publisher_item_id || item.id || '').trim(),
      sourceJobId: String(item.sourceJobId || item.source_job_id || item.jobId || item.job_id || '').trim(),
      metadata: {
        ...(item.metadata && typeof item.metadata === 'object' ? item.metadata : {}),
        destination: String(item.destination || item.channel || '').trim(),
        connector: String(item.connector || '').trim(),
        action_type: String(item.action_type || item.actionType || '').trim(),
        compliance_owner: 'publisher'
      },
      createdAt: String(item.createdAt || item.created_at || now).trim(),
      updatedAt: now
    };
  }

  async function publisherCampaignIngestPayload(storage, request, env) {
    const current = await currentOrderRequesterContext(storage, request, env, { lightweight: true });
    if (!current?.login) return { error: 'Login required', statusCode: 401 };
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return { error: error.message, statusCode: 400 };
    }
    const campaignId = String(body?.campaign_id || body?.campaignId || '').trim();
    if (!campaignId) return { error: 'campaign_id is required', statusCode: 400 };
    const existing = typeof storage.getCampaignById === 'function' ? await storage.getCampaignById(campaignId) : null;
    if (!existing) return { error: 'Campaign not found', statusCode: 404 };
    if (!campaignVisibleToCurrent(existing, current, env)) return { error: 'Not authorized for this campaign', statusCode: 403 };
    const items = (Array.isArray(body?.items) ? body.items : Array.isArray(body?.publisher_items) ? body.publisher_items : [])
      .map(normalizePublisherCampaignItem)
      .filter((item) => item.title || item.brief);
    if (!items.length) return { error: 'At least one publisher item is required', statusCode: 400 };
    const now = nowIso();
    const existingTasks = Array.isArray(existing.tasks) ? existing.tasks : [];
    const taskByKey = new Map(existingTasks.map((task) => [String(task.id || task.publisherItemId || '').trim(), task]));
    for (const item of items) {
      const key = String(item.id || item.publisherItemId || '').trim();
      taskByKey.set(key, { ...(taskByKey.get(key) || {}), ...item, updatedAt: now });
    }
    const queue = [
      ...((Array.isArray(existing.publisher?.queue) ? existing.publisher.queue : [])),
      ...items.map((item) => ({
        id: item.id,
        channel: item.channel,
        title: item.title,
        status: item.status,
        dueAt: item.dueAt,
        sourceJobId: item.sourceJobId,
        complianceOwner: 'publisher',
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      }))
    ];
    const updated = normalizeCampaignRecord({
      ...existing,
      status: body.status || existing.status || 'waiting_approval',
      tasks: [...taskByKey.values()],
      publisher: {
        ...(existing.publisher && typeof existing.publisher === 'object' ? existing.publisher : {}),
        queue,
        complianceOwner: 'publisher',
        lastIngestedAt: now,
        scheduleMode: body.schedule_mode || body.scheduleMode || existing.publisher?.scheduleMode || 'publisher_controlled'
      },
      logs: [
        ...(Array.isArray(existing.logs) ? existing.logs : []),
        {
          type: 'publisher_ingest',
          message: `Publisher received ${items.length} campaign item(s).`,
          actor: current.login,
          metadata: { item_count: items.length, compliance_owner: 'publisher' },
          createdAt: now
        }
      ],
      updatedAt: now
    });
    const saved = typeof storage.upsertCampaign === 'function' ? await storage.upsertCampaign(updated) : updated;
    await touchEvent(storage, 'CAMPAIGN', `${updated.title} campaign ingested into Publisher`, {
      campaignId: updated.id,
      ownerLogin: updated.ownerLogin,
      itemCount: items.length
    });
    return {
      ok: true,
      campaign: publicCampaign(saved || updated),
      publisher_queue: items,
      statusCode: 201
    };
  }

  function campaignMetricSummary(metrics = []) {
    const totals = {};
    for (const metric of Array.isArray(metrics) ? metrics : []) {
      const name = String(metric?.name || '').trim().toLowerCase();
      if (!name) continue;
      totals[name] = (totals[name] || 0) + Number(metric.value || 0);
    }
    const clicks = totals.clicks || totals.click || 0;
    const impressions = totals.impressions || totals.impression || 0;
    const conversions = totals.conversions || totals.conversion || totals.signups || totals.signup || totals.leads || 0;
    const spend = totals.spend || totals.cost || 0;
    return {
      totals,
      ctr: impressions > 0 ? clicks / impressions : null,
      conversionRate: clicks > 0 ? conversions / clicks : null,
      costPerConversion: spend > 0 && conversions > 0 ? spend / conversions : null,
      metricCount: Array.isArray(metrics) ? metrics.length : 0
    };
  }

  function campaignMetricNextActionHandoff(summary = {}) {
    if (!summary.metricCount) {
      return 'Connect Analytics, Lead SaaS, CRM/MA, or Ads results, then ask Campaign Operations to decide the next campaign action.';
    }
    return 'Send this metric summary to Campaign Operations; channel, Publisher, or Ads SaaS actions must be requested by the responsible owner.';
  }

  async function campaignMetricsPayload(storage, request, env, campaignId = '') {
    const current = await currentOrderRequesterContext(storage, request, env, { lightweight: true });
    if (!current?.login) return { error: 'Login required', statusCode: 401 };
    const existing = typeof storage.getCampaignById === 'function' ? await storage.getCampaignById(campaignId) : null;
    if (!existing) return { error: 'Campaign not found', statusCode: 404 };
    if (!campaignVisibleToCurrent(existing, current, env)) return { error: 'Not authorized for this campaign', statusCode: 403 };
    const summary = campaignMetricSummary(existing.metrics || []);
    return {
      ok: true,
      campaignId: existing.id,
      metrics: existing.metrics || [],
      summary,
      nextAction: campaignMetricNextActionHandoff(summary)
    };
  }

  async function appendCampaignMetricsPayload(storage, request, env, campaignId = '') {
    const current = await currentOrderRequesterContext(storage, request, env, { lightweight: true });
    if (!current?.login) return { error: 'Login required', statusCode: 401 };
    const existing = typeof storage.getCampaignById === 'function' ? await storage.getCampaignById(campaignId) : null;
    if (!existing) return { error: 'Campaign not found', statusCode: 404 };
    if (!campaignVisibleToCurrent(existing, current, env)) return { error: 'Not authorized for this campaign', statusCode: 403 };
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return { error: error.message, statusCode: 400 };
    }
    const now = nowIso();
    const incoming = (Array.isArray(body?.metrics) ? body.metrics : body?.metric ? [body.metric] : [])
      .map((metric, index) => normalizeCampaignMetric({ ...metric, createdAt: metric?.createdAt || now, updatedAt: now }, index))
      .filter((metric) => metric.name);
    if (!incoming.length) return { error: 'At least one metric is required', statusCode: 400 };
    const metrics = [...(Array.isArray(existing.metrics) ? existing.metrics : []), ...incoming];
    const summary = campaignMetricSummary(metrics);
    const nextAction = campaignMetricNextActionHandoff(summary);
    const updated = normalizeCampaignRecord({
      ...existing,
      status: body.status || 'measuring',
      metrics,
      logs: [
        ...(Array.isArray(existing.logs) ? existing.logs : []),
        {
          type: 'measurement',
          message: `Campaign received ${incoming.length} metric(s).`,
          actor: current.login,
          metadata: { metric_count: incoming.length, next_action: nextAction },
          createdAt: now
        }
      ],
      metadata: {
        ...(existing.metadata && typeof existing.metadata === 'object' ? existing.metadata : {}),
        measurementSummary: summary,
        measurementNextAction: nextAction,
        measuredAt: now
      },
      updatedAt: now
    });
    const saved = typeof storage.upsertCampaign === 'function' ? await storage.upsertCampaign(updated) : updated;
    await touchEvent(storage, 'CAMPAIGN', `${updated.title} campaign metrics updated`, {
      campaignId: updated.id,
      ownerLogin: updated.ownerLogin,
      metricCount: incoming.length
    });
    return {
      ok: true,
      campaign: publicCampaign(saved || updated),
      metrics: incoming,
      summary,
      nextAction,
      statusCode: 201
    };
  }

  function normalizeCampaignIntegrationRecord(item = {}, index = 0) {
    const provider = String(item.provider || item.app || item.saas || item.name || '').trim().toLowerCase();
    const category = String(item.category || item.type || 'crm_ma').trim().toLowerCase();
    const status = String(item.status || item.readiness || 'needed').trim().toLowerCase().replace(/[\s-]+/g, '_');
    return {
      id: String(item.id || `${category}_${provider || `integration_${index + 1}`}`).trim(),
      provider: provider || `integration_${index + 1}`,
      category,
      status,
      requiredCapabilities: Array.isArray(item.requiredCapabilities || item.required_capabilities)
        ? (item.requiredCapabilities || item.required_capabilities).map((value) => String(value || '').trim()).filter(Boolean)
        : [],
      connectorKey: String(item.connectorKey || item.connector_key || item.connector || '').trim(),
      authorityRequest: item.authorityRequest || item.authority_request || null,
      notes: String(item.notes || '').trim(),
      metadata: item.metadata && typeof item.metadata === 'object' ? item.metadata : {}
    };
  }

  async function campaignIntegrationsPayload(storage, request, env, campaignId = '') {
    const current = await currentOrderRequesterContext(storage, request, env, { lightweight: true });
    if (!current?.login) return { error: 'Login required', statusCode: 401 };
    const existing = typeof storage.getCampaignById === 'function' ? await storage.getCampaignById(campaignId) : null;
    if (!existing) return { error: 'Campaign not found', statusCode: 404 };
    if (!campaignVisibleToCurrent(existing, current, env)) return { error: 'Not authorized for this campaign', statusCode: 403 };
    return {
      ok: true,
      campaignId: existing.id,
      integrations: existing.integrations || {},
      crmMa: Array.isArray(existing.integrations?.crm_ma) ? existing.integrations.crm_ma : []
    };
  }

  async function updateCampaignIntegrationsPayload(storage, request, env, campaignId = '') {
    const current = await currentOrderRequesterContext(storage, request, env, { lightweight: true });
    if (!current?.login) return { error: 'Login required', statusCode: 401 };
    const existing = typeof storage.getCampaignById === 'function' ? await storage.getCampaignById(campaignId) : null;
    if (!existing) return { error: 'Campaign not found', statusCode: 404 };
    if (!campaignVisibleToCurrent(existing, current, env)) return { error: 'Not authorized for this campaign', statusCode: 403 };
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return { error: error.message, statusCode: 400 };
    }
    const incoming = (Array.isArray(body?.integrations) ? body.integrations : Array.isArray(body?.crm_ma) ? body.crm_ma : [])
      .map(normalizeCampaignIntegrationRecord)
      .filter((item) => item.provider);
    if (!incoming.length) return { error: 'At least one CRM/MA integration is required', statusCode: 400 };
    const existingIntegrations = existing.integrations && typeof existing.integrations === 'object' ? existing.integrations : {};
    const byId = new Map((Array.isArray(existingIntegrations.crm_ma) ? existingIntegrations.crm_ma : []).map((item) => [String(item.id || '').trim(), item]));
    for (const item of incoming) byId.set(item.id, item);
    const now = nowIso();
    const updated = normalizeCampaignRecord({
      ...existing,
      integrations: {
        ...existingIntegrations,
        crm_ma: [...byId.values()],
        updatedAt: now,
        readinessOwner: 'campaign_operations'
      },
      logs: [
        ...(Array.isArray(existing.logs) ? existing.logs : []),
        {
          type: 'integration_readiness',
          message: `CRM/MA readiness updated for ${incoming.length} integration(s).`,
          actor: current.login,
          metadata: { integration_count: incoming.length },
          createdAt: now
        }
      ],
      updatedAt: now
    });
    const saved = typeof storage.upsertCampaign === 'function' ? await storage.upsertCampaign(updated) : updated;
    await touchEvent(storage, 'CAMPAIGN', `${updated.title} CRM/MA readiness updated`, {
      campaignId: updated.id,
      ownerLogin: updated.ownerLogin,
      integrationCount: incoming.length
    });
    return {
      ok: true,
      campaign: publicCampaign(saved || updated),
      integrations: saved?.integrations || updated.integrations,
      statusCode: 201
    };
  }

  const APPROVED_LEAD_SAAS = Object.freeze([
    'hubspot',
    'salesforce',
    'airtable',
    'notion',
    'pipedrive',
    'zoho',
    'customer_io',
    'klaviyo',
    'mailchimp',
    'brevo',
    'convertkit'
  ]);

  function normalizeLeadSaasProvider(value = '') {
    return String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  }

  async function campaignLeadSourcePayload(storage, request, env, campaignId = '') {
    const current = await currentOrderRequesterContext(storage, request, env, { lightweight: true });
    if (!current?.login) return { error: 'Login required', statusCode: 401 };
    const existing = typeof storage.getCampaignById === 'function' ? await storage.getCampaignById(campaignId) : null;
    if (!existing) return { error: 'Campaign not found', statusCode: 404 };
    if (!campaignVisibleToCurrent(existing, current, env)) return { error: 'Not authorized for this campaign', statusCode: 403 };
    return {
      ok: true,
      campaignId: existing.id,
      leadSource: existing.leadSource || {},
      approvedProviders: APPROVED_LEAD_SAAS
    };
  }

  async function updateCampaignLeadSourcePayload(storage, request, env, campaignId = '') {
    const current = await currentOrderRequesterContext(storage, request, env, { lightweight: true });
    if (!current?.login) return { error: 'Login required', statusCode: 401 };
    const existing = typeof storage.getCampaignById === 'function' ? await storage.getCampaignById(campaignId) : null;
    if (!existing) return { error: 'Campaign not found', statusCode: 404 };
    if (!campaignVisibleToCurrent(existing, current, env)) return { error: 'Not authorized for this campaign', statusCode: 403 };
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return { error: error.message, statusCode: 400 };
    }
    const provider = normalizeLeadSaasProvider(body?.provider || body?.saas || body?.leadSaas || body?.lead_saas);
    if (!provider) return { error: 'Lead SaaS provider is required', statusCode: 400 };
    if (!APPROVED_LEAD_SAAS.includes(provider)) {
      return {
        error: 'Lead SaaS provider is not approved for campaign audience storage.',
        code: 'lead_saas_not_approved',
        approvedProviders: APPROVED_LEAD_SAAS,
        statusCode: 400
      };
    }
    const now = nowIso();
    const leadSource = {
      provider,
      status: String(body.status || 'allowed').trim().toLowerCase().replace(/[\s-]+/g, '_'),
      listId: String(body.listId || body.list_id || body.segmentId || body.segment_id || '').trim(),
      consentBasis: String(body.consentBasis || body.consent_basis || '').trim(),
      connectorKey: String(body.connectorKey || body.connector_key || body.connector || '').trim(),
      owner: 'approved_lead_saas',
      notes: String(body.notes || '').trim(),
      metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : {},
      updatedAt: now
    };
    const updated = normalizeCampaignRecord({
      ...existing,
      leadSource,
      logs: [
        ...(Array.isArray(existing.logs) ? existing.logs : []),
        {
          type: 'lead_source',
          message: `Lead source delegated to approved SaaS: ${provider}.`,
          actor: current.login,
          metadata: { provider, owner: 'approved_lead_saas' },
          createdAt: now
        }
      ],
      updatedAt: now
    });
    const saved = typeof storage.upsertCampaign === 'function' ? await storage.upsertCampaign(updated) : updated;
    await touchEvent(storage, 'CAMPAIGN', `${updated.title} lead source delegated to ${provider}`, {
      campaignId: updated.id,
      ownerLogin: updated.ownerLogin,
      provider
    });
    return {
      ok: true,
      campaign: publicCampaign(saved || updated),
      leadSource: saved?.leadSource || updated.leadSource,
      statusCode: 201
    };
  }

  const APPROVED_ADS_SAAS = Object.freeze([
    'google_ads',
    'meta_ads',
    'linkedin_ads',
    'x_ads',
    'tiktok_ads'
  ]);

  async function campaignAdsPayload(storage, request, env, campaignId = '') {
    const current = await currentOrderRequesterContext(storage, request, env, { lightweight: true });
    if (!current?.login) return { error: 'Login required', statusCode: 401 };
    const existing = typeof storage.getCampaignById === 'function' ? await storage.getCampaignById(campaignId) : null;
    if (!existing) return { error: 'Campaign not found', statusCode: 404 };
    if (!campaignVisibleToCurrent(existing, current, env)) return { error: 'Not authorized for this campaign', statusCode: 403 };
    return {
      ok: true,
      campaignId: existing.id,
      ads: existing.ads || {},
      approvedProviders: APPROVED_ADS_SAAS
    };
  }

  async function updateCampaignAdsPayload(storage, request, env, campaignId = '') {
    const current = await currentOrderRequesterContext(storage, request, env, { lightweight: true });
    if (!current?.login) return { error: 'Login required', statusCode: 401 };
    const existing = typeof storage.getCampaignById === 'function' ? await storage.getCampaignById(campaignId) : null;
    if (!existing) return { error: 'Campaign not found', statusCode: 404 };
    if (!campaignVisibleToCurrent(existing, current, env)) return { error: 'Not authorized for this campaign', statusCode: 403 };
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return { error: error.message, statusCode: 400 };
    }
    const provider = String(body?.provider || body?.saas || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (!provider) return { error: 'Ads SaaS provider is required', statusCode: 400 };
    if (!APPROVED_ADS_SAAS.includes(provider)) {
      return { error: 'Ads SaaS provider is not approved.', code: 'ads_saas_not_approved', approvedProviders: APPROVED_ADS_SAAS, statusCode: 400 };
    }
    const now = nowIso();
    const ads = {
      provider,
      status: String(body.status || 'approval_required').trim().toLowerCase().replace(/[\s-]+/g, '_'),
      budgetCap: Number(body.budgetCap ?? body.budget_cap ?? 0) || 0,
      targetCpa: Number(body.targetCpa ?? body.target_cpa ?? 0) || 0,
      stopRules: Array.isArray(body.stopRules || body.stop_rules) ? (body.stopRules || body.stop_rules).map((value) => String(value || '').trim()).filter(Boolean) : [],
      connectorKey: String(body.connectorKey || body.connector_key || body.connector || '').trim(),
      executionOwner: 'ads_saas',
      authorityRequestOwner: 'ads_saas_or_responsible_ads_execution_agent',
      spendRequiresApproval: true,
      metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : {},
      updatedAt: now
    };
    const updated = normalizeCampaignRecord({
      ...existing,
      ads,
      logs: [
        ...(Array.isArray(existing.logs) ? existing.logs : []),
        {
          type: 'ads_readiness',
          message: `Ads SaaS readiness updated for ${provider}.`,
          actor: current.login,
          metadata: { provider, spend_requires_approval: true },
          createdAt: now
        }
      ],
      updatedAt: now
    });
    const saved = typeof storage.upsertCampaign === 'function' ? await storage.upsertCampaign(updated) : updated;
    await touchEvent(storage, 'CAMPAIGN', `${updated.title} ads readiness updated`, {
      campaignId: updated.id,
      ownerLogin: updated.ownerLogin,
      provider
    });
    return { ok: true, campaign: publicCampaign(saved || updated), ads: saved?.ads || updated.ads, statusCode: 201 };
  }

  return {
    campaignsPayload,
    createCampaignPayload,
    campaignDetailPayload,
    updateCampaignPayload,
    publisherCampaignIngestPayload,
    campaignMetricsPayload,
    appendCampaignMetricsPayload,
    campaignIntegrationsPayload,
    updateCampaignIntegrationsPayload,
    campaignLeadSourcePayload,
    updateCampaignLeadSourcePayload,
    campaignAdsPayload,
    updateCampaignAdsPayload
  };
}
