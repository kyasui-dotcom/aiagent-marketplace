const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 4 });
const percent = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 0 });

function text(selector, value) {
  const node = document.querySelector(selector);
  if (node) node.textContent = value;
}

function labelForKey(key = '') {
  return String(key || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function renderExternalApiRows(costs = {}) {
  const root = document.querySelector('[data-external-api-costs]');
  if (!root) return;
  const entries = Object.entries(costs)
    .filter(([key]) => key !== 'default_external_api_call')
    .sort(([left], [right]) => left.localeCompare(right));
  root.innerHTML = entries.map(([key, value]) => `
    <div class="table-row pricing-catalog-grid">
      <span><strong>${labelForKey(key)}</strong><small>${key}</small></span>
      <span>${currency.format(Number(value || 0))}</span>
      <span>per call or unit</span>
    </div>
  `).join('');
}

async function loadPricingCatalog() {
  let catalog = null;
  try {
    const response = await fetch('/api/pricing-catalog', { headers: { accept: 'application/json' } });
    if (response.ok) catalog = await response.json();
  } catch {
    catalog = null;
  }
  if (!catalog) return;
  text('[data-catalog-version]', catalog.catalogVersion || '-');
  text('[data-ledger-units]', `${catalog.ledgerUnitsPerUsd || '-'} ledger units = $1`);
  text('[data-llm-input]', currency.format(catalog.llmHighWatermark?.input || 0));
  text('[data-llm-output]', currency.format(catalog.llmHighWatermark?.output || 0));
  text('[data-provider-markup]', `${percent.format(catalog.providerMarkup?.defaultRate || 0)} default / ${percent.format(catalog.providerMarkup?.maxRate || 0)} max`);
  text('[data-platform-margin]', percent.format(catalog.platformMargin?.rate || 0));
  text('[data-default-external-api]', currency.format(catalog.externalApiUnitCosts?.default_external_api_call || 0));
  renderExternalApiRows(catalog.externalApiUnitCosts || {});
}

loadPricingCatalog();
