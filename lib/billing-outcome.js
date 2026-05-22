export function createBillingOutcomeHelpers(deps = {}) {
  const {
    billingModeFromJob,
    billingPeriodId,
    billingProfileForAccount,
    canViewAdminDashboard,
    isBillableJob,
    nowIso,
    settleBillingForJobInState,
    touchEvent
  } = deps;

  async function appendBillingAudit(storage, job, billing, meta = {}) {
    const funding = meta.funding || billing?.funding || job?.billingSettlement || null;
    const audit = {
      id: crypto.randomUUID(),
      kind: 'billing_audit',
      ts: nowIso(),
      jobId: job.id,
      agentId: job.assignedAgentId || meta.agentId || null,
      status: job.status,
      policyVersion: billing.policyVersion || 'billing-policy/v3-provider-markup-platform-margin',
      source: meta.source || 'unknown',
      billable: {
        totalCostBasis: billing.totalCostBasis,
        apiCost: billing.apiCost,
        costBasis: billing.costBasis,
        rates: billing.rates
      },
      settlement: {
        creatorFee: billing.creatorFee,
        marketplaceFee: billing.marketplaceFee,
        baseFee: billing.baseFee,
        premiumFee: billing.premiumFee,
        platformFee: billing.platformFee,
        agentPayout: billing.agentPayout,
        platformRevenue: billing.platformRevenue,
        total: billing.total
      }
    };
    if (funding) {
      audit.funding = {
        mode: funding.mode || null,
        welcomeCreditsApplied: funding.welcomeCreditsApplied || 0,
        creditsApplied: funding.creditsApplied || 0,
        depositApplied: funding.depositApplied || 0,
        invoiceApplied: funding.invoiceApplied || 0,
        autoTopupAdded: funding.autoTopupAdded || 0,
        settledAt: funding.settledAt || null
      };
    }
    await touchEvent(storage, 'BILLING_AUDIT', `audit ${job.id.slice(0, 6)} total=${billing.total}`, audit);
  }

  function billingModeForRequester(current, account = null, env = null) {
    if (canViewAdminDashboard(current, env)) return 'test';
    const profile = billingProfileForAccount(account, current?.apiKey?.mode || '', billingPeriodId());
    return profile.mode || 'monthly_invoice';
  }

  function billingApiKeyModeForRequester(current, env = null) {
    return canViewAdminDashboard(current, env) ? 'test' : (current?.apiKey?.mode || '');
  }

  function billingLogLine(job, billing) {
    return isBillableJob(job)
      ? `billed total=${billing.total}`
      : `test mode total=${billing.total} (excluded from monthly settlement)`;
  }

  function settleAgentEarnings(job, agent, billing) {
    if (!job || !agent || !billing || !isBillableJob(job)) return false;
    agent.earnings = +(Number(agent.earnings || 0) + billing.agentPayout).toFixed(1);
    return true;
  }

  async function recordBillingOutcome(storage, job, billing, source) {
    if (!job || !billing) return;
    if (!isBillableJob(job)) {
      await touchEvent(storage, 'BILLED_TEST', `test mode api=${billing.apiCost} total=${billing.total}`, {
        jobId: job.id,
        source,
        billingMode: billingModeFromJob(job)
      });
      return;
    }
    let settlement = null;
    await storage.mutate(async (draft) => {
      const draftJob = draft.jobs.find((item) => item.id === job.id);
      if (!draftJob) return;
      settlement = settleBillingForJobInState(draft, draftJob, billing);
    });
    if (settlement) {
      job.billingSettlement = settlement;
      job.actualBilling = {
        ...(job.actualBilling && typeof job.actualBilling === 'object' ? job.actualBilling : {}),
        ...(billing && typeof billing === 'object' ? billing : {}),
        funding: settlement
      };
    }
    await touchEvent(storage, 'BILLED', `api=${billing.apiCost} total=${billing.total}`);
    await appendBillingAudit(storage, job, job.actualBilling || billing, { source, funding: settlement });
  }

  return {
    appendBillingAudit,
    billingApiKeyModeForRequester,
    billingLogLine,
    billingModeForRequester,
    recordBillingOutcome,
    settleAgentEarnings
  };
}
