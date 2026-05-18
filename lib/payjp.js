const ZERO_DECIMAL_CURRENCIES = new Set(['JPY']);

function normalizeString(value, fallback = '') {
  return String(value ?? fallback).trim();
}

function normalizeCurrency(value, fallback = 'JPY') {
  return normalizeString(value, fallback).toUpperCase() || fallback;
}

function normalizeAmount(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return +n.toFixed(2);
}

function minorUnitDivisor(currency = 'JPY') {
  return ZERO_DECIMAL_CURRENCIES.has(normalizeCurrency(currency)) ? 1 : 100;
}

export function payjpAmountToMinorUnits(amount, currency = 'JPY') {
  return Math.max(0, Math.round(normalizeAmount(amount, 0) * minorUnitDivisor(currency)));
}

function flattenFormEntries(input, prefix = '') {
  const entries = [];
  if (input == null) return entries;
  if (Array.isArray(input)) {
    input.forEach((value, index) => {
      const key = prefix ? `${prefix}[${index}]` : String(index);
      entries.push(...flattenFormEntries(value, key));
    });
    return entries;
  }
  if (typeof input === 'object') {
    for (const [key, value] of Object.entries(input)) {
      if (value == null) continue;
      const nextKey = prefix ? `${prefix}[${key}]` : key;
      entries.push(...flattenFormEntries(value, nextKey));
    }
    return entries;
  }
  entries.push([prefix, String(input)]);
  return entries;
}

function basicAuthValue(secretKey = '') {
  const raw = `${normalizeString(secretKey)}:`;
  if (typeof btoa === 'function') return btoa(raw);
  return Buffer.from(raw, 'utf8').toString('base64');
}

function payjpApiError(message, status = 500, details = null) {
  const error = new Error(message);
  error.statusCode = status;
  error.details = details;
  return error;
}

export function payjpConfigFromEnv(source = {}) {
  return {
    secretKey: normalizeString(source.PAYJP_SECRET_KEY),
    publicKey: normalizeString(source.PAYJP_PUBLIC_KEY),
    defaultCurrency: normalizeCurrency(source.PAYJP_DEFAULT_CURRENCY, 'JPY'),
    platformFeeRate: Math.max(0, Math.min(95, Number(source.PAYJP_PLATFORM_FEE_RATE || 10) || 10))
  };
}

export function payjpConfigured(config = null) {
  return Boolean(config?.secretKey);
}

export function payjpPublicConfig(config = null) {
  return {
    configured: payjpConfigured(config),
    publicKeyPresent: Boolean(config?.publicKey),
    defaultCurrency: config?.defaultCurrency || 'JPY',
    platformFeeRate: Number(config?.platformFeeRate || 0)
  };
}

export async function payjpRequest(config, { method = 'POST', path = '/', form = null, body = null, headers = {} } = {}) {
  if (!payjpConfigured(config)) throw payjpApiError('PAY.JP is not configured', 503);
  const requestHeaders = new Headers(headers);
  requestHeaders.set('Authorization', `Basic ${basicAuthValue(config.secretKey)}`);
  let payload = body;
  if (form) {
    const params = new URLSearchParams();
    for (const [key, value] of flattenFormEntries(form)) params.append(key, value);
    payload = params.toString();
    requestHeaders.set('Content-Type', 'application/x-www-form-urlencoded');
  } else if (body && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
    payload = JSON.stringify(body);
  }
  const res = await fetch(`https://api.pay.jp${path}`, { method, headers: requestHeaders, body: payload });
  const text = await res.text();
  let json = {};
  if (text) {
    try { json = JSON.parse(text); } catch { json = { raw: text }; }
  }
  if (!res.ok) {
    const message = json?.error?.message || json?.error || `PAY.JP API request failed (${res.status})`;
    throw payjpApiError(message, res.status, json);
  }
  return json;
}

export function payjpTenantIdForLogin(login = '') {
  return `cait_${normalizeString(login).toLowerCase().replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'provider'}`;
}

export async function createPayjpMarketplaceTenant(config, { account, payout = {}, tenantId = '' } = {}) {
  const id = normalizeString(tenantId || account?.payjp?.tenantId || payjpTenantIdForLogin(account?.login));
  const name = normalizeString(payout.displayName || account?.payout?.displayName || account?.profile?.displayName || account?.login);
  if (!id) throw payjpApiError('PAY.JP tenant id is required', 400);
  if (!name) throw payjpApiError('PAY.JP tenant name is required', 400);
  const form = {
    id,
    name,
    platform_fee_rate: String(Number(config.platformFeeRate || 10)),
    minimum_transfer_amount: String(Math.max(1000, Number(payout.minimumTransferAmount || payout.minimumPayoutAmount || account?.payout?.minimumPayoutAmount || 1000) || 1000))
  };
  for (const [target, source] of [
    ['bank_account_holder_name', payout.bankAccountHolderName || payout.bank_account_holder_name],
    ['bank_code', payout.bankCode || payout.bank_code],
    ['bank_branch_code', payout.bankBranchCode || payout.bank_branch_code],
    ['bank_account_type', payout.bankAccountType || payout.bank_account_type],
    ['bank_account_number', payout.bankAccountNumber || payout.bank_account_number]
  ]) {
    const value = normalizeString(source);
    if (value) form[target] = value;
  }
  return payjpRequest(config, { path: '/v1/tenants', form });
}

export async function createPayjpTenantApplicationUrl(config, { tenantId }) {
  const safeTenantId = normalizeString(tenantId);
  if (!safeTenantId) throw payjpApiError('PAY.JP tenant id is required', 400);
  return payjpRequest(config, {
    path: `/v1/tenants/${encodeURIComponent(safeTenantId)}/application_urls`,
    form: {}
  });
}

export async function createPayjpPlatformChargeWith3DS(config, { tenantId, amount, cardToken, platformFee = null, currency = 'JPY', metadata = {} } = {}) {
  const safeTenantId = normalizeString(tenantId);
  const safeCardToken = normalizeString(cardToken);
  const safeCurrency = normalizeCurrency(currency, config.defaultCurrency || 'JPY');
  const amountMinor = payjpAmountToMinorUnits(amount, safeCurrency);
  if (!safeTenantId) throw payjpApiError('PAY.JP tenant id is required', 400);
  if (!safeCardToken) throw payjpApiError('PAY.JP card token is required', 400);
  if (amountMinor <= 0) throw payjpApiError('PAY.JP charge amount must be greater than zero', 400);
  const feeMinor = platformFee == null
    ? Math.max(0, Math.round(amountMinor * (Number(config.platformFeeRate || 0) / 100)))
    : payjpAmountToMinorUnits(platformFee, safeCurrency);
  return payjpRequest(config, {
    path: '/v1/charges',
    form: {
      amount: amountMinor,
      currency: safeCurrency.toLowerCase(),
      card: safeCardToken,
      tenant: safeTenantId,
      platform_fee: feeMinor,
      three_d_secure: 'true',
      metadata
    }
  });
}

export async function finishPayjpThreeDSecureCharge(config, chargeId = '') {
  const safeChargeId = normalizeString(chargeId);
  if (!safeChargeId) throw payjpApiError('PAY.JP charge id is required', 400);
  return payjpRequest(config, {
    path: `/v1/charges/${encodeURIComponent(safeChargeId)}/tds_finish`,
    form: {}
  });
}
