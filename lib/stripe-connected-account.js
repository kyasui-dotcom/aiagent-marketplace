export function stripeConnectedAccountIdentityStatus(account = null) {
  const requirements = account?.requirements && typeof account.requirements === 'object' ? account.requirements : {};
  const capabilities = account?.capabilities && typeof account.capabilities === 'object' ? account.capabilities : {};
  const detailsSubmitted = Boolean(account?.details_submitted);
  const chargesEnabled = Boolean(account?.charges_enabled);
  const payoutsEnabled = Boolean(account?.payouts_enabled);
  const transfersCapability = String(capabilities.transfers || '').trim().toLowerCase();
  const currentlyDue = Array.isArray(requirements.currently_due) ? requirements.currently_due.filter(Boolean) : [];
  const pastDue = Array.isArray(requirements.past_due) ? requirements.past_due.filter(Boolean) : [];
  const disabledReason = String(requirements.disabled_reason || '').trim();
  const requirementsClear = currentlyDue.length === 0 && pastDue.length === 0 && !disabledReason;
  const transferReady = transfersCapability === 'active';
  const verified = detailsSubmitted && payoutsEnabled && transferReady && requirementsClear;
  const missing = [];
  if (!detailsSubmitted) missing.push('details_submitted');
  if (!payoutsEnabled) missing.push('payouts_enabled');
  if (!transferReady) missing.push('transfers_capability_active');
  if (!requirementsClear) missing.push('account_requirements_clear');
  return {
    verified,
    status: verified ? 'verified' : 'verification_required',
    detailsSubmitted,
    chargesEnabled,
    payoutsEnabled,
    transfersCapability: transfersCapability || 'missing',
    currentlyDue,
    pastDue,
    disabledReason,
    missing
  };
}

export function stripeConnectedAccountPatch(connectedAccountId, remoteAccount = null, options = {}) {
  const identity = stripeConnectedAccountIdentityStatus(remoteAccount);
  const nowIso = typeof options.nowIso === 'function' ? options.nowIso : (() => new Date().toISOString());
  return {
    connectedAccountId,
    connectedAccountStatus: identity.verified ? 'ready' : 'pending',
    connectOnboardingStatus: identity.detailsSubmitted ? 'completed' : 'pending',
    chargesEnabled: identity.chargesEnabled,
    payoutsEnabled: identity.payoutsEnabled,
    identityVerified: identity.verified,
    identityVerificationStatus: identity.status,
    transferCapabilityStatus: identity.transfersCapability,
    requirementsCurrentDue: identity.currentlyDue,
    requirementsPastDue: identity.pastDue,
    requirementsDisabledReason: identity.disabledReason,
    lastSyncAt: nowIso(),
    mode: 'configured'
  };
}
