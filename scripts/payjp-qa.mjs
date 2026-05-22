import assert from 'node:assert/strict';
import {
  createPayjpMarketplaceTenant,
  createPayjpPlatformChargeWith3DS,
  createPayjpTenantApplicationUrl,
  finishPayjpThreeDSecureCharge,
  normalizePayjpLocale,
  payjpAmountToMinorUnits,
  payjpConfigFromEnv,
  payjpPublicConfig
} from '../lib/payjp.js';
import { defaultAccountSettingsForUser } from '../lib/shared.js';
import { API_ROUTES } from '../lib/api-routes.js';
import { rateLimitSpecForPath } from '../lib/http-policy.js';

const config = payjpConfigFromEnv({
  PAYJP_SECRET_KEY: 'sk_test_payjp_123',
  PAYJP_PUBLIC_KEY: 'pk_test_payjp_123',
  PAYJP_DEFAULT_CURRENCY: 'jpy',
  PAYJP_PLATFORM_FEE_RATE: '15'
});

assert.deepEqual(payjpPublicConfig(config), {
  configured: true,
  publicKeyPresent: true,
  defaultCurrency: 'JPY',
  platformFeeRate: 15,
  defaultLocale: 'ja',
  payjpJsLocale: 'ja',
  supportedLocales: ['ja', 'en']
});
assert.equal(normalizePayjpLocale('en-US'), 'en');
assert.equal(normalizePayjpLocale('ja-JP'), 'ja');
assert.equal(payjpAmountToMinorUnits(1234, 'JPY'), 1234);
assert.equal(API_ROUTES.PAYJP_TENANT_ONBOARDING, '/api/payjp/platform/tenant/onboarding');
assert.deepEqual(rateLimitSpecForPath(API_ROUTES.PAYJP_PLATFORM_CHARGE, 'POST'), { name: 'payjp-action', limit: 40, windowMs: 60_000 });

const account = defaultAccountSettingsForUser({ login: 'payjp-provider', name: 'PAY.JP Provider', email: 'payjp-provider@example.test' }, 'github');
assert.equal(account.payjp.mode, 'platform_marketplace');
assert.equal(account.payjp.threeDSecureRequired, true);
assert.equal(account.payjp.tenantStatus, 'not_started');
assert.equal(account.payjp.tenantApplicationStatus, 'not_started');

const requests = [];
globalThis.fetch = async (url, init = {}) => {
  requests.push({ url: String(url), init });
  const params = new URLSearchParams(String(init.body || ''));
  assert.ok(String(init.headers.get('authorization') || '').startsWith('Basic '), 'PAY.JP requests must use secret-key basic auth');
  if (url === 'https://api.pay.jp/v1/tenants') {
    assert.equal(params.get('id'), 'cait_payjp-provider');
    assert.equal(params.get('name'), 'PAY.JP Provider');
    assert.equal(params.get('platform_fee_rate'), '15');
    return new Response(JSON.stringify({ id: 'cait_payjp-provider', object: 'tenant', status: 'pending_review' }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (url === 'https://api.pay.jp/v1/tenants/cait_payjp-provider/application_urls') {
    return new Response(JSON.stringify({ id: 'apurl_123', url: 'https://pay.jp/platform/applications/apurl_123' }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (url === 'https://api.pay.jp/v1/charges') {
    assert.equal(params.get('amount'), '10000');
    assert.equal(params.get('currency'), 'jpy');
    assert.equal(params.get('card'), 'tok_payjp_visa_3ds');
    assert.equal(params.get('tenant'), 'cait_payjp-provider');
    assert.equal(params.get('platform_fee'), '1500');
    assert.equal(params.get('three_d_secure'), 'true');
    return new Response(JSON.stringify({ id: 'ch_payjp_3ds', object: 'charge', paid: false, three_d_secure_status: 'unverified', three_d_secure_url: 'https://pay.jp/tds/ch_payjp_3ds' }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (url === 'https://api.pay.jp/v1/charges/ch_payjp_3ds/tds_finish') {
    return new Response(JSON.stringify({ id: 'ch_payjp_3ds', object: 'charge', paid: true, three_d_secure_status: 'verified' }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  throw new Error(`unexpected PAY.JP request ${url}`);
};

const tenant = await createPayjpMarketplaceTenant(config, { account, payout: account.payout });
assert.equal(tenant.id, 'cait_payjp-provider');
const applicationUrl = await createPayjpTenantApplicationUrl(config, { tenantId: tenant.id });
assert.ok(String(applicationUrl.url || '').includes('pay.jp/platform/applications'));
const charge = await createPayjpPlatformChargeWith3DS(config, {
  tenantId: tenant.id,
  amount: 10000,
  cardToken: 'tok_payjp_visa_3ds'
});
assert.equal(charge.id, 'ch_payjp_3ds');
assert.equal(charge.three_d_secure_status, 'unverified');
const finished = await finishPayjpThreeDSecureCharge(config, charge.id);
assert.equal(finished.paid, true);
assert.equal(requests.length, 4);

console.log('payjp qa passed');
