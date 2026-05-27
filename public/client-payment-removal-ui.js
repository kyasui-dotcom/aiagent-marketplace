export const DONATION_ONLY_NOTICE = 'CAIt no longer processes cards, checkout, subscriptions, invoices, donations, or payouts in-app. A Stripe Payment Link for external donation support is only a future option after compliance review.';
export const IN_APP_PAYMENTS_REMOVED = true;
export const PAYMENT_PROVIDER_UI_VISIBLE = false;

const REMOVED_PAYMENT_CONTROL_KEYS = [
  'openStripeCheckoutBtn',
  'openStripeSubscriptionBtn',
  'runStripeMonthlyInvoiceBtn',
  'runStripeProviderMonthlyBtn',
  'runStripeProviderPayoutBtn',
  'stripeConnectLinkBtn',
  'saveBillingBtn',
  'saveProviderPayoutBtn',
  'saveProviderSupportBtn',
  'saveProviderPricingBtn',
  'saveProviderIdentityBtn',
  'saveProviderProfileBtn',
  'billingName',
  'billingEmail',
  'billingCompany',
  'billingTaxId',
  'billingAddressLine1',
  'billingAddressLine2',
  'billingCity',
  'billingRegion',
  'billingPostalCode',
  'billingCountry',
  'payoutDisplayName',
  'payoutCountry',
  'payoutCurrency',
  'payoutSupportEmail',
  'payoutMinimumAmount',
  'payoutWebsite',
  'payoutStatementDescriptor',
  'payoutNotes'
];

export function disableRemovedPaymentSettingsControls(els = {}) {
  for (const key of REMOVED_PAYMENT_CONTROL_KEYS) {
    const control = els[key];
    if (!control || typeof control !== 'object') continue;
    if ('disabled' in control) control.disabled = true;
    if ('title' in control && !control.title) {
      control.title = 'In-app payment setup has been removed from CAIt.';
    }
  }
}

export function renderRemovedProviderBillingLanesCard(els = {}, { safeText } = {}) {
  if (!els?.providerBillingLanesCard || typeof safeText !== 'function') return;
  safeText(
    els.providerBillingLanesCard,
    [
      'Parallel billing lanes',
      '',
      'CAIt no longer runs checkout, subscriptions, invoices, or payouts in-app.',
      'Orders and scheduled work can continue without payment setup.',
      'Optional support must stay outside CAIt as donation-only.'
    ].join('\n')
  );
}

export function renderRemovedPaymentProviderTools(els = {}, { safeText } = {}) {
  if (typeof safeText !== 'function') return;
  if (els?.stripeCustomerStatus) safeText(els.stripeCustomerStatus, 'In-app billing disabled');
  if (els?.stripeProviderStatus) safeText(els.stripeProviderStatus, 'In-app payouts disabled');
  if (els?.stripeCustomerActionResult) safeText(els.stripeCustomerActionResult, DONATION_ONLY_NOTICE);
  if (els?.stripeProviderActionResult) safeText(els.stripeProviderActionResult, 'No provider payout action is available inside CAIt.');
}

export function attachRemovedPaymentActionHandlers(els = {}, { closePlanModal, flash, safeText } = {}) {
  const warn = () => {
    if (typeof closePlanModal === 'function') closePlanModal();
    if (typeof safeText === 'function' && els?.stripeCustomerActionResult) {
      safeText(els.stripeCustomerActionResult, DONATION_ONLY_NOTICE);
    }
    if (typeof flash === 'function') {
      flash('In-app payment setup has been removed. External donation support requires review first.', 'warn');
    }
  };
  for (const key of [
    'openStripeCheckoutBtn',
    'openStripeSubscriptionBtn',
    'runStripeMonthlyInvoiceBtn',
    'runStripeProviderMonthlyBtn',
    'runStripeProviderPayoutBtn',
    'stripeConnectLinkBtn'
  ]) {
    const control = els[key];
    if (control && typeof control === 'object' && 'onclick' in control) control.onclick = warn;
  }
}
