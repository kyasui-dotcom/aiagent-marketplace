import {
  DEFAULT_MINIMUM_PAYOUT_AMOUNT,
  moneyInputValueFromLedger,
  yen
} from './client-billing-utils.js?v=20260521a';
import {
  DONATION_ONLY_NOTICE,
  IN_APP_PAYMENTS_REMOVED,
  disableRemovedPaymentSettingsControls,
  renderRemovedProviderBillingLanesCard
} from './client-payment-removal-ui.js?v=20260527a';

export function createClientSettingsBillingController(deps = {}) {
  const {
    els = {},
    state = {},
    currentMonthPeriod = () => '',
    developerSurfacesStatus = 'Runtime gated',
    escapeHtml = (value) => String(value ?? ''),
    formatTime = (value) => String(value || '-'),
    fundingBreakdownCompact = () => '',
    orderProgressStatusLabel = (status) => String(status || ''),
    renderOrderApiKeys = () => {},
    requireStartLoginGate = () => {},
    safeCssToken = (value, fallback = 'info') => String(value || fallback),
    safeText = () => {},
    setDetail = () => {},
    setElementVisible = () => {},
    setInputValue = () => {},
    switchTab = () => {},
    syncRouteState = () => {}
  } = deps;

  function renderSummaryRows(el, rows = []) {
    if (!el) return;
    el.innerHTML = rows.map((row) => `
    <div class="summary-row">
      <span class="summary-label">${escapeHtml(row.label)}</span>
      <strong class="summary-value">${escapeHtml(row.value)}</strong>
    </div>
  `).join('');
  }

  function renderBilling(jobs = []) {
    if (!els.billingTable) return;
    const billed = jobs.filter((job) => job.actualBilling);
    if (!billed.length) {
      els.billingTable.innerHTML = '<div class="empty">No billed orders yet.</div>';
      return;
    }
    els.billingTable.innerHTML = `<div class="table-header billing-grid"><div>ORDER</div><div>STATUS</div><div>BASIS</div><div>PAYOUT</div><div>PLATFORM</div><div>TOTAL</div></div>${billed.map((job) => `
    <div class="table-row billing-grid" data-bill-id="${escapeHtml(job.id)}">
      <div>${escapeHtml(job.id.slice(0, 8))}</div>
      <div class="${safeCssToken(job.status, 'info')}">${escapeHtml(orderProgressStatusLabel(job.status).toUpperCase())}</div>
      <div>${escapeHtml(yen(job.actualBilling.totalCostBasis ?? job.actualBilling.apiCost))}</div>
      <div>${escapeHtml(yen(job.actualBilling.agentPayout))}</div>
      <div>${escapeHtml(yen(job.actualBilling.platformRevenue))}</div>
      <div>${escapeHtml(yen(job.actualBilling.total))}<div class="row-muted">${escapeHtml(fundingBreakdownCompact(job) || '-')}</div></div>
    </div>`).join('')}`;
    [...els.billingTable.querySelectorAll('[data-bill-id]')].forEach((row) => {
      row.onclick = () => {
        const job = jobs.find((item) => item.id === row.dataset.billId);
        setDetail(job);
      };
    });
  }

  function renderBillingAudits(audits = []) {
    if (!els.billingAuditTable) return;
    if (!audits.length) {
      els.billingAuditTable.innerHTML = '<div class="empty">No billing audits yet.</div>';
      return;
    }
    els.billingAuditTable.innerHTML = `<div class="table-header billing-grid"><div>ORDER</div><div>SOURCE</div><div>BASIS</div><div>PAYOUT</div><div>PLATFORM</div><div>TOTAL</div></div>${audits.map((audit) => `
    <div class="table-row billing-grid" data-audit-id="${escapeHtml(audit.id)}">
      <div>${escapeHtml(audit.jobId.slice(0, 8))}</div>
      <div>${escapeHtml(audit.source)}</div>
      <div>${escapeHtml(yen(audit.billable.totalCostBasis))}</div>
      <div>${escapeHtml(yen(audit.settlement.agentPayout))}</div>
      <div>${escapeHtml(yen(audit.settlement.platformRevenue))}</div>
      <div>${escapeHtml(yen(audit.settlement.total))}<div class="row-muted">${escapeHtml(fundingBreakdownCompact(audit) || '-')}</div></div>
    </div>`).join('')}`;
    [...els.billingAuditTable.querySelectorAll('[data-audit-id]')].forEach((row) => {
      row.onclick = () => {
        const audit = audits.find((item) => item.id === row.dataset.auditId);
        setDetail(audit);
      };
    });
  }

  function toggleSettingsInputs(disabled) {
    [
      els.settingsPeriod,
      els.refreshSettingsBtn,
      els.apiKeyMode,
      els.apiKeyLabel,
      els.createApiKeyBtn,
      els.createStripeSetupSessionBtn,
      els.createStripeSubscriptionSessionBtn,
      els.createStripeConnectOnboardingBtn,
      els.runStripeProviderPayoutBtn,
      els.payoutWithdrawAmount,
      els.billingMode,
      els.billingLegalName,
      els.billingCompanyName,
      els.billingEmail,
      els.billingPhone,
      els.billingPostalCode,
      els.billingRegion,
      els.billingCity,
      els.billingAddressLine1,
      els.billingAddressLine2,
      els.billingCountry,
      els.billingCurrency,
      els.billingSubscriptionPlan,
      els.billingSubscriptionOverageMode,
      els.billingTaxId,
      els.billingPurchaseOrderRef,
      els.billingInvoiceMemo,
      els.billingDueDays,
      els.saveBillingSettingsBtn,
      els.payoutProviderEnabled,
      els.payoutEntityType,
      els.payoutLegalName,
      els.payoutDisplayName,
      els.payoutEmail,
      els.payoutCountry,
      els.payoutCurrency,
      els.payoutSupportEmail,
      els.payoutMinimumAmount,
      els.payoutWebsite,
      els.payoutStatementDescriptor,
      els.payoutNotes,
      els.savePayoutSettingsBtn
    ].forEach((el) => {
      if (el) el.disabled = disabled;
    });
  }

  function renderMonthlyCustomerRuns(runs = []) {
    if (!els.monthlyCustomerTable) return;
    if (!runs.length) {
      els.monthlyCustomerTable.innerHTML = '<div class="empty">No customer orders in this month.</div>';
      return;
    }
    els.monthlyCustomerTable.innerHTML = `<div class="table-header ledger-grid"><div>ORDER</div><div>TYPE</div><div>AGENT</div><div>TIME</div><div>TOTAL</div></div>${runs.map((run) => `
    <div class="table-row ledger-grid" data-customer-run-id="${escapeHtml(run.id)}">
      <div>${escapeHtml(run.id.slice(0, 8))}</div>
      <div>${escapeHtml(run.taskType)}</div>
      <div>${escapeHtml(run.agentName)}</div>
      <div>${escapeHtml(formatTime(run.ts))}</div>
      <div>${escapeHtml(yen(run.total))}</div>
    </div>`).join('')}`;
    [...els.monthlyCustomerTable.querySelectorAll('[data-customer-run-id]')].forEach((row) => {
      row.onclick = () => {
        const run = runs.find((item) => item.id === row.dataset.customerRunId);
        if (run) setDetail(run);
      };
    });
  }

  function renderMonthlyProviderRuns(runs = []) {
    if (!els.monthlyProviderTable) return;
    if (!runs.length) {
      els.monthlyProviderTable.innerHTML = '<div class="empty">No provider withdrawals in this month.</div>';
      return;
    }
    els.monthlyProviderTable.innerHTML = `<div class="table-header ledger-grid"><div>ORDER</div><div>TYPE</div><div>AGENT</div><div>TIME</div><div>PAYOUT</div></div>${runs.map((run) => `
    <div class="table-row ledger-grid" data-provider-run-id="${escapeHtml(run.id)}">
      <div>${escapeHtml(run.id.slice(0, 8))}</div>
      <div>${escapeHtml(run.taskType)}</div>
      <div>${escapeHtml(run.agentName)}</div>
      <div>${escapeHtml(formatTime(run.ts))}</div>
      <div>${escapeHtml(yen(run.agentPayout))}</div>
    </div>`).join('')}`;
    [...els.monthlyProviderTable.querySelectorAll('[data-provider-run-id]')].forEach((row) => {
      row.onclick = () => {
        const run = runs.find((item) => item.id === row.dataset.providerRunId);
        if (run) setDetail(run);
      };
    });
  }

  function renderProviderBillingLanesCard(providerSummary = {}) {
    if (!els.providerBillingLanesCard) return;
    if (IN_APP_PAYMENTS_REMOVED) {
      renderRemovedProviderBillingLanesCard(els, { safeText });
      return;
    }
    const subscriptionCount = Number(providerSummary.providerSubscriptionAgentCount || 0);
    const lines = [
      'Parallel billing lanes',
      '',
      `1. End-user order lane: ${yen(providerSummary.grossPayout || 0)} gross provider payout from completed paid orders`,
      `2. Provider monthly lane: ${yen(providerSummary.providerSubscriptionMonthlyPrice || 0)} declared monthly SaaS fees across ${subscriptionCount} agent${subscriptionCount === 1 ? '' : 's'}`,
      `3. Provider monthly lane charged this period: ${yen(providerSummary.providerSubscriptionChargedAmount || 0)} / due now ${yen(providerSummary.providerSubscriptionDueAmount || 0)}`,
      `4. CAIt monthly take: ${yen(providerSummary.providerSubscriptionMarketplaceFee || 0)} from provider monthly SaaS fees`,
      `5. Provider net after CAIt monthly take: ${yen(providerSummary.providerSubscriptionProviderNet || 0)}`,
      `6. Auto retry: ${providerSummary.providerSubscriptionRetryPeriod ? `${providerSummary.providerSubscriptionRetryPeriod} · ${Number(providerSummary.providerSubscriptionRetryCount || 0)} active attempt(s)` : 'clear'}`,
      `7. Last failure notice: ${providerSummary.providerSubscriptionLastNotificationPeriod ? `${providerSummary.providerSubscriptionLastNotificationPeriod} (${formatTime(providerSummary.providerSubscriptionLastNotificationAt)})` : 'not sent'}`,
      '',
      'End-user order charges and provider monthly SaaS billing run in parallel. They are not added together in one order estimate.'
    ];
    safeText(els.providerBillingLanesCard, lines.join('\n'));
  }

  function renderStripeTools(account = null, auth = null) {
    if (!els.stripeCustomerStatus || !els.stripeProviderStatus || !els.stripeCustomerActionResult || !els.stripeProviderActionResult) return;
    [
      els.createStripeSetupSessionBtn,
      els.createStripeSubscriptionSessionBtn,
      els.createStripeConnectOnboardingBtn,
      els.runStripeProviderMonthlyChargeBtn,
      els.runStripeProviderPayoutBtn,
      els.payoutWithdrawAmount
    ].forEach((el) => setElementVisible(el, false));
    safeText(els.stripeCustomerStatus, [
      'Payment mode: no in-app payments',
      '',
      'CAIt no longer collects cards, opens checkout, runs subscriptions, invoices customers, or stores payment methods.',
      'Agent orders and scheduled work can run without payment setup. Optional support, if offered, must happen outside CAIt.'
    ].join('\n'));
    safeText(els.stripeCustomerActionResult, DONATION_ONLY_NOTICE);
    safeText(els.stripeProviderStatus, [
      'Provider money movement: removed',
      '',
      'CAIt does not collect bank accounts, onboard payout providers, run withdrawals, or split revenue in-app.',
      'Provider identity can still be used for trust and agent review, not for payout movement.'
    ].join('\n'));
    safeText(els.stripeProviderActionResult, 'No payment or payout action is available in CAIt.');
  }

  function renderSettings(account, monthlySummary, auth) {
    if (!els.settingsAccessCard) return;
    const loggedIn = Boolean(auth?.loggedIn && auth?.user?.login);
    const canReviewReports = Boolean(auth?.canReviewFeedbackReports);
    state.settingsPeriod = state.settingsPeriod || currentMonthPeriod();
    setInputValue(els.settingsPeriod, state.settingsPeriod);
    if (!loggedIn) {
      state.lastIssuedOrderApiKey = null;
      toggleSettingsInputs(true);
      if (els.settingsAccessCard) {
        els.settingsAccessCard.textContent = [
          'Sign in to manage account actions.',
          '',
          'Google login: order work, account settings, and API keys when developer access is active.',
          'GitHub login: publish agents, receive provider payouts, and authorize repo PR actions.',
          '',
          'Use the tabs below to see each setup area. Sign in before changing settings.'
        ].join('\n');
      }
      renderSummaryRows(els.settingsStatus, [
        { label: 'Status', value: 'Login required' },
        { label: 'What this page does', value: 'Support/donation policy, provider info, and runtime-gated developer surfaces' }
      ]);
      renderSummaryRows(els.monthlySummaryCard, [
        { label: 'Monthly summary', value: 'Unavailable while logged out' }
      ]);
      renderSummaryRows(els.billingSnapshotCard, []);
      renderSummaryRows(els.billingSummaryCard, []);
      safeText(els.providerBillingLanesCard, 'Login required.\n\nIn-app payments and payouts are removed.');
      renderOrderApiKeys(null, auth);
      renderStripeTools(null, auth);
      renderMonthlyCustomerRuns([]);
      renderMonthlyProviderRuns([]);
      return;
    }
    toggleSettingsInputs(false);
    const billing = account?.billing || {};
    const payout = account?.payout || {};
    const providerSummary = monthlySummary?.provider || {};
    setInputValue(els.billingLegalName, billing.legalName);
    setInputValue(els.billingCompanyName, billing.companyName);
    setInputValue(els.billingEmail, billing.billingEmail);
    setInputValue(els.billingPhone, billing.billingPhone);
    setInputValue(els.billingPostalCode, billing.billingPostalCode);
    setInputValue(els.billingRegion, billing.billingRegion);
    setInputValue(els.billingCity, billing.billingCity);
    setInputValue(els.billingAddressLine1, billing.billingAddressLine1);
    setInputValue(els.billingAddressLine2, billing.billingAddressLine2);
    setInputValue(els.billingCountry, billing.country || 'JP');
    setInputValue(els.billingCurrency, billing.currency || 'USD');
    setInputValue(els.billingMode, billing.mode || 'monthly_invoice');
    setInputValue(els.billingSubscriptionPlan, billing.subscriptionPlan || 'none');
    setInputValue(els.billingSubscriptionOverageMode, billing.subscriptionOverageMode || 'monthly_invoice');
    setInputValue(els.billingTaxId, billing.taxId);
    setInputValue(els.billingPurchaseOrderRef, billing.purchaseOrderRef);
    setInputValue(els.billingInvoiceMemo, billing.invoiceMemo);
    setInputValue(els.billingDueDays, billing.dueDays || 14);
    setInputValue(els.payoutProviderEnabled, String(Boolean(payout.providerEnabled)));
    setInputValue(els.payoutEntityType, payout.entityType || 'individual');
    setInputValue(els.payoutLegalName, payout.legalName);
    setInputValue(els.payoutDisplayName, payout.displayName);
    setInputValue(els.payoutEmail, payout.payoutEmail);
    setInputValue(els.payoutCountry, payout.country || 'JP');
    setInputValue(els.payoutCurrency, payout.currency || 'USD');
    setInputValue(els.payoutSupportEmail, payout.supportEmail);
    setInputValue(els.payoutMinimumAmount, moneyInputValueFromLedger(payout.minimumPayoutAmount || DEFAULT_MINIMUM_PAYOUT_AMOUNT));
    setInputValue(els.payoutWebsite, payout.website);
    setInputValue(els.payoutStatementDescriptor, payout.statementDescriptor);
    setInputValue(els.payoutNotes, payout.notes);
    if (IN_APP_PAYMENTS_REMOVED) {
      disableRemovedPaymentSettingsControls(els);
    }

    if (els.settingsAccessCard) {
      const reviewText = canReviewReports ? ', FUNNEL to check conversion, or REPORTS to review feedback.' : '.';
      els.settingsAccessCard.textContent = `Signed in as ${account?.login || auth.user.login}. CAIt no longer collects payment or payout setup in-app; PAYMENTS only shows donation/support policy. GitHub link is required for adapter PRs and PROVIDER actions${reviewText}`;
    }
    renderSummaryRows(els.billingSnapshotCard, [
      { label: 'Payment mode', value: 'Donation-only outside CAIt' },
      { label: 'Checkout', value: 'removed' },
      { label: 'Saved cards', value: 'not collected' },
      { label: 'Subscriptions', value: 'removed' },
      { label: 'In-app charges', value: 'removed' }
    ]);
    renderSummaryRows(els.billingSummaryCard, [
      { label: 'Support model', value: 'Optional external donation' },
      { label: 'CAIt payment forms', value: 'none' },
      { label: 'Customer billing', value: 'removed' },
      { label: 'Provider payout movement', value: 'removed' }
    ]);
    renderSummaryRows(els.settingsStatus, [
      { label: 'Account', value: account?.login || auth.user.login },
      { label: 'Orders pay from', value: 'No in-app payment setup' },
      { label: 'Provider profile', value: Boolean(payout.providerEnabled) ? 'enabled' : 'disabled' },
      { label: 'CAIt API keys', value: auth?.developerApiEnabled ? 'Active' : developerSurfacesStatus },
      { label: 'Live/test keys', value: auth?.developerApiEnabled ? 'Live keys available; public test keys are blocked' : 'Disabled by current runtime policy' }
    ]);
    renderSummaryRows(els.monthlySummaryCard, [
      { label: 'Period', value: monthlySummary?.period || state.settingsPeriod },
      { label: 'In-app payment status', value: 'removed' },
      { label: 'Donation status', value: 'external optional support only' },
      { label: 'Customer billing', value: 'not collected in CAIt' },
      { label: 'Provider payouts', value: 'not moved in CAIt' }
    ]);
    renderProviderBillingLanesCard(providerSummary);
    renderOrderApiKeys(account, auth);
    renderStripeTools(account, auth);
  }

  function renderSettingsFlow(account, monthlySummary, auth = state.snapshot?.auth || {}) {
    const loggedIn = Boolean(auth?.loggedIn && auth?.user?.login);
    const canReviewReports = Boolean(auth?.canReviewFeedbackReports);
    const allowedSections = ['payments', 'provider', 'keys', ...(canReviewReports ? ['funnel', 'reports'] : [])];
    const activeSection = allowedSections.includes(state.settingsSection)
      ? state.settingsSection
      : 'payments';
    const tabs = [
      ['payments', els.settingsPaymentsTabBtn, els.settingsPaymentsSection],
      ['provider', els.settingsProviderTabBtn, els.settingsProviderSection],
      ['keys', els.settingsKeysTabBtn, els.settingsKeysSection],
      ['funnel', els.settingsFunnelTabBtn, els.settingsFunnelSection],
      ['reports', els.settingsReportsTabBtn, els.settingsReportsSection]
    ];
    tabs.forEach(([section, button, panel]) => {
      const allowed = !['funnel', 'reports'].includes(section) || canReviewReports;
      const active = allowed && section === activeSection;
      if (button) {
        setElementVisible(button, allowed);
        button.classList.toggle('active', active);
        button.disabled = !allowed;
      }
      setElementVisible(panel, allowed && active);
    });
    setElementVisible(els.billingProfilePanel, loggedIn && state.billingProfileExpanded && activeSection === 'payments');
    setElementVisible(els.providerProfilePanel, loggedIn && state.providerProfileExpanded && activeSection === 'provider');
    if (els.toggleBillingProfileBtn) {
      els.toggleBillingProfileBtn.textContent = state.billingProfileExpanded ? 'HIDE BILLING PROFILE' : 'SHOW BILLING PROFILE';
      els.toggleBillingProfileBtn.disabled = !loggedIn;
    }
    if (els.toggleProviderProfileBtn) {
      els.toggleProviderProfileBtn.textContent = state.providerProfileExpanded ? 'HIDE PROVIDER PROFILE' : 'SHOW PROVIDER PROFILE';
      els.toggleProviderProfileBtn.disabled = !loggedIn;
    }
  }

  function focusSettingsSection(section = state.settingsSection) {
    const target =
      (section === 'payments' && els.settingsPaymentsSection) ||
      (section === 'provider' && els.settingsProviderSection) ||
      (section === 'keys' && els.settingsKeysSection) ||
      (section === 'funnel' && els.settingsFunnelSection) ||
      (section === 'reports' && els.settingsReportsSection) ||
      els.settingsAccessCard;
    if (!target?.scrollIntoView) return;
    window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function openSettingsSection(section) {
    const auth = state.snapshot?.auth || {};
    const canReviewReports = Boolean(auth?.canReviewFeedbackReports);
    const allowedSections = ['payments', 'provider', 'keys', ...(canReviewReports ? ['funnel', 'reports'] : [])];
    state.settingsSection = allowedSections.includes(section)
      ? section
      : 'payments';
    if (!auth?.loggedIn) {
      requireStartLoginGate('settings', 'Login required. SETTINGS actions are private.');
      return;
    }
    switchTab('settings');
    renderSettingsFlow(state.snapshot?.accountSettings, state.snapshot?.monthlySummary, auth);
    focusSettingsSection(state.settingsSection);
    syncRouteState();
  }

  return {
    renderBilling,
    renderBillingAudits,
    renderSettings,
    renderSettingsFlow,
    openSettingsSection
  };
}
