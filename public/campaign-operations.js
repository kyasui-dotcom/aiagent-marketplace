const listEl = document.getElementById('campaignList');
const detailEl = document.getElementById('campaignDetail');
const formEl = document.getElementById('campaignForm');
const refreshEl = document.getElementById('refreshCampaigns');

let campaigns = [];
let selectedId = '';

function escapeHtml(value = '') {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) {
    throw new Error(payload.error || `Request failed: ${response.status}`);
  }
  return payload;
}

function metricSummaryHtml(campaign = {}) {
  const summary = campaign.metadata?.measurementSummary || {};
  const totals = summary.totals || {};
  const rows = Object.entries(totals).slice(0, 8).map(([name, value]) => `
    <tr><td>${escapeHtml(name)}</td><td>${escapeHtml(value)}</td></tr>
  `).join('');
  return rows || '<tr><td colspan="2">No metrics yet.</td></tr>';
}

function queueHtml(campaign = {}) {
  const queue = Array.isArray(campaign.publisher?.queue) ? campaign.publisher.queue : [];
  return queue.slice(-12).reverse().map((item) => `
    <tr>
      <td>${escapeHtml(item.channel || '')}</td>
      <td>${escapeHtml(item.title || '')}</td>
      <td>${escapeHtml(item.status || '')}</td>
    </tr>
  `).join('') || '<tr><td colspan="3">No Publisher queue items.</td></tr>';
}

function readinessHtml(campaign = {}) {
  const crm = Array.isArray(campaign.integrations?.crm_ma) ? campaign.integrations.crm_ma : [];
  const lead = campaign.leadSource || {};
  const ads = campaign.ads || {};
  const rows = [
    ...crm.map((item) => ['CRM/MA', item.provider, item.status]),
    lead.provider ? ['Lead SaaS', lead.provider, lead.status] : null,
    ads.provider ? ['Ads SaaS', ads.provider, ads.status] : null
  ].filter(Boolean);
  return rows.map(([kind, provider, status]) => `
    <tr><td>${escapeHtml(kind)}</td><td>${escapeHtml(provider)}</td><td>${escapeHtml(status)}</td></tr>
  `).join('') || '<tr><td colspan="3">No SaaS readiness recorded.</td></tr>';
}

function renderList() {
  listEl.innerHTML = campaigns.map((campaign) => `
    <button class="campaign-item" type="button" data-id="${escapeHtml(campaign.id)}" aria-selected="${campaign.id === selectedId ? 'true' : 'false'}">
      <strong>${escapeHtml(campaign.title)}</strong>
      <span class="campaign-meta">${escapeHtml(campaign.status)} · ${escapeHtml((campaign.channels || []).join(', ') || 'no channels')}</span>
    </button>
  `).join('') || '<div class="campaign-status">No campaigns yet.</div>';
}

function renderDetail() {
  const campaign = campaigns.find((item) => item.id === selectedId);
  if (!campaign) {
    detailEl.innerHTML = '<div class="campaign-status">Select a campaign.</div>';
    return;
  }
  detailEl.innerHTML = `
    <section>
      <h2>${escapeHtml(campaign.title)}</h2>
      <p>${escapeHtml(campaign.objective || '')}</p>
      <div class="campaign-meta">Status: ${escapeHtml(campaign.status)} · Updated: ${escapeHtml(campaign.updatedAt || '')}</div>
    </section>
    <section class="campaign-band">
      <h3>Publisher Queue</h3>
      <table class="campaign-table"><thead><tr><th>Channel</th><th>Title</th><th>Status</th></tr></thead><tbody>${queueHtml(campaign)}</tbody></table>
    </section>
    <section class="campaign-band">
      <h3>Measurement</h3>
      <table class="campaign-table"><thead><tr><th>Metric</th><th>Total</th></tr></thead><tbody>${metricSummaryHtml(campaign)}</tbody></table>
      <p class="campaign-meta">${escapeHtml(campaign.metadata?.measurementNextAction || 'No next action yet.')}</p>
    </section>
    <section class="campaign-band">
      <h3>SaaS Readiness</h3>
      <table class="campaign-table"><thead><tr><th>Type</th><th>Provider</th><th>Status</th></tr></thead><tbody>${readinessHtml(campaign)}</tbody></table>
    </section>
  `;
}

async function loadCampaigns() {
  detailEl.innerHTML = '<div class="campaign-status">Loading campaigns...</div>';
  try {
    const payload = await api('/api/campaigns?limit=100');
    campaigns = Array.isArray(payload.campaigns) ? payload.campaigns : [];
    if (!selectedId && campaigns[0]) selectedId = campaigns[0].id;
    renderList();
    renderDetail();
  } catch (error) {
    listEl.innerHTML = '';
    detailEl.innerHTML = `<div class="campaign-status">${escapeHtml(error.message)}</div>`;
  }
}

formEl?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(formEl);
  const channels = String(formData.get('channels') || '').split(',').map((item) => item.trim()).filter(Boolean);
  try {
    const payload = await api('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify({
        title: formData.get('title'),
        objective: formData.get('objective'),
        channels,
        source: 'operations_dashboard'
      })
    });
    selectedId = payload.campaign?.id || '';
    formEl.reset();
    await loadCampaigns();
  } catch (error) {
    detailEl.innerHTML = `<div class="campaign-status">${escapeHtml(error.message)}</div>`;
  }
});

listEl?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-id]');
  if (!button) return;
  selectedId = button.getAttribute('data-id') || '';
  renderList();
  renderDetail();
});

refreshEl?.addEventListener('click', loadCampaigns);

loadCampaigns();
