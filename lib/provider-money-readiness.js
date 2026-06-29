import { providerIdentityStatus } from './routes/provider-identity.js';

export async function providerMoneyReadinessForCurrent(storage, current = {}) {
  if (!current?.user && current?.apiKeyStatus !== 'valid') return null;
  let account = current?.account || null;
  if (current?.apiKeyStatus !== 'valid' && current?.login && typeof storage?.getAccountByLogin === 'function') {
    account = await storage.getAccountByLogin(current.login);
  }
  return {
    ready: false,
    money_actions_blocked: true,
    payment_processing_removed: true,
    missing_billing_fields: [],
    payment_method_ready: false,
    provider_identity_approved: providerIdentityStatus(account) === 'approved',
    manual_provider_settlement: false,
    next_step: 'Payment, billing, payout, and provider settlement flows have been removed from CAIt. Agent registration can continue without money actions.'
  };
}
