export const TEMPORARY_INVOICE_BILLING_ENABLED = false;

const TEMPORARY_INVOICE_SUPPORT_EMAIL = 'support@aiagent-marketplace.net';

function missingDependency(name) {
  return () => {
    throw new Error(`Temporary invoice controller missing dependency: ${name}`);
  };
}

export function temporaryInvoiceNoticeLines(kind = 'payment') {
  const target = String(kind || 'payment').trim().toLowerCase();
  const label = target === 'plan' ? 'plan invoice' : (target === 'payout' ? 'manual payout' : 'billing invoice');
  return [
    `Temporary ${label} notice: hosted payment checkout is paused.`,
    `For now, request ${label === 'manual payout' ? 'manual payout handling' : 'an invoice/manual payment'}.`,
    label === 'manual payout'
      ? `Support will confirm provider payout details at ${TEMPORARY_INVOICE_SUPPORT_EMAIL}.`
      : 'CAIt will confirm billing manually after payment confirmation.',
    `Support: ${TEMPORARY_INVOICE_SUPPORT_EMAIL}`
  ];
}

export function createTemporaryInvoiceRequestController(deps = {}) {
  const {
    els = {},
    state = {},
    productName = 'CAIt',
    api = missingDependency('api'),
    flash = () => {},
    formatDisplayCurrency = (value) => String(value || 0),
    safeText = () => {},
    trackConversionEvent = () => {}
  } = deps;

  function temporaryInvoiceRequestEmail() {
    return String(
      els.billingEmail?.value
      || state.snapshot?.auth?.user?.email
      || state.snapshot?.accountSettings?.billing?.billingEmail
      || ''
    ).trim();
  }

  function temporaryInvoiceAccountLabel() {
    const auth = state.snapshot?.auth || {};
    return String(
      auth.accountLogin
      || auth.user?.login
      || auth.user?.email
      || 'unknown account'
    ).trim();
  }

  async function submitTemporaryInvoiceRequest(options = {}) {
    const kind = String(options.kind || 'payment').trim().toLowerCase();
    const plan = String(options.plan || '').trim().toLowerCase();
    const context = String(options.context || state.currentTab || 'settings').trim().toLowerCase();
    const amount = Number(options.amount || 0);
    const amountLine = amount > 0 ? formatDisplayCurrency(amount) : '-';
    const email = temporaryInvoiceRequestEmail();
    const title = `${productName} temporary ${kind === 'payout' ? 'manual payout' : (kind === 'plan' ? 'plan invoice' : 'invoice')} request`;
    const message = [
      title,
      '',
      `Account: ${temporaryInvoiceAccountLabel()}`,
      email ? `Billing email: ${email}` : 'Billing email: not provided',
      `Kind: ${kind || 'payment'}`,
      plan ? `Plan: ${plan}` : '',
      `Amount: ${amountLine}`,
      `Context: ${context || '-'}`,
      `Page: ${window.location.pathname || '/'}`,
      '',
      kind === 'payout'
        ? 'Automated provider payouts are temporarily paused. Please review provider earnings and arrange manual payout follow-up.'
        : 'Hosted checkout is temporarily paused. Please issue/manual-confirm the invoice and add credits after payment confirmation.'
    ].filter(Boolean).join('\n');
    const result = await api('/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        type: 'question',
        email,
        title,
        message,
        page_path: window.location.pathname || '/',
        current_tab: state.currentTab || '',
        source: 'temporary_invoice_billing',
        context: {
          extra: {
            kind,
            plan,
            amount_usd: amount > 0 ? amount : 0,
            billing_context: context
          }
        }
      })
    });
    const lines = [
      kind === 'payout' ? 'Manual payout request saved.' : 'Invoice request saved.',
      `Kind: ${kind || 'payment'}`,
      plan ? `Plan: ${plan}` : '',
      amount > 0 ? `Amount: ${amountLine}` : '',
      `Email: ${result.email_forwarded ? `forwarded to ${TEMPORARY_INVOICE_SUPPORT_EMAIL}` : `not forwarded (${result.email_status || 'not_configured'})`}`,
      kind === 'payout'
        ? 'This is a temporary manual payout flow while automated payouts are paused.'
        : 'This is a temporary manual billing flow while hosted checkout is paused.',
      kind === 'payout'
        ? 'Support will follow up about payout handling.'
        : 'Billing is confirmed manually after payment confirmation.'
    ].filter(Boolean);
    safeText(kind === 'payout' ? els.stripeProviderActionResult : els.stripeCustomerActionResult, lines.join('\n'));
    flash(kind === 'payout' ? 'Manual payout request saved. Support will follow up.' : 'Invoice request saved. Support will follow up manually.', 'ok');
    void trackConversionEvent('invoice_request_submitted', {
      source: context || 'settings',
      status: result.report?.status || 'open',
      mode: kind || 'payment',
      promptChars: message.length
    });
    return result;
  }

  return {
    submitTemporaryInvoiceRequest,
    temporaryInvoiceAccountLabel,
    temporaryInvoiceRequestEmail
  };
}
