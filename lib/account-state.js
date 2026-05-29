import { createHash, randomUUID } from 'node:crypto';
import { accountHash } from './account-identity.js';
import {
  BILLING_DISPLAY_COUNTRY,
  BILLING_DISPLAY_CURRENCY,
  DEFAULT_MINIMUM_PAYOUT_AMOUNT,
  DEFAULT_OPENAI_MONTHLY_COST_LIMIT,
  DEFAULT_OPENAI_MONTHLY_COST_LIMIT_USD,
  GUEST_TRIAL_CREDIT_LIMIT,
  LEGACY_LEDGER_UNITS_PER_USD,
  WELCOME_CREDITS_ACCOUNT_LIMIT,
  WELCOME_CREDITS_FREE_ALLOWANCE_USD,
  WELCOME_CREDITS_GRANT_AMOUNT,
  billingPeriodId,
  displayCurrencyToLedgerAmount,
  guestTrialLoginForVisitorId,
  guestTrialVisitorHash,
  isGuestTrialAccountLogin,
  ledgerAmountToDisplayCurrency,
  monthWindow,
  normalizeActiveSubscriptionOverageMode,
  normalizeBillingMode,
  normalizeBoolean,
  normalizeCountry,
  normalizeCurrency,
  normalizeEntityType,
  normalizeMinimumPayoutAmount,
  normalizeMoney,
  normalizeOpenAiCostLimit,
  normalizePositiveInt,
  normalizeStatus,
  normalizeGuestTrialRequest,
  normalizeSubscriptionOverageMode,
  normalizeSubscriptionPlan,
  normalizeUiLanguage,
  sanitizeBillingSettingsPatch,
  sanitizePayoutSettingsPatch,
  sanitizeProfileSettingsPatch,
  subscriptionBasePriceForPlan,
  subscriptionBonusRateForPlan,
  subscriptionIncludedCreditsForPlan,
  subscriptionRefillAmountForPlan,
  syncBillingRuntimeFields
} from './billing-policy.js';
import { isManagedSampleAgent, listPriceBreakdown, resolveAgentPricingConfig, usdPriceToLedger } from './agent-pricing.js';
import {
  hideChatMemoryTranscriptForLoginInState as hideChatMemoryTranscriptForLoginInStateWithDeps,
  normalizeChatMemoryPatch
} from './chat-memory-state.js';
import { nowIso } from './events.js';
import { isPrivateNetworkHostname } from './network-hosts.js';
import { normalizeTaskTypes } from './task-type-normalization.js';

export {
  BILLING_DISPLAY_COUNTRY,
  BILLING_DISPLAY_CURRENCY,
  DEFAULT_MINIMUM_PAYOUT_AMOUNT,
  DEFAULT_OPENAI_MONTHLY_COST_LIMIT,
  DEFAULT_OPENAI_MONTHLY_COST_LIMIT_USD,
  GUEST_TRIAL_CREDIT_LIMIT,
  LEGACY_LEDGER_UNITS_PER_USD,
  WELCOME_CREDITS_ACCOUNT_LIMIT,
  WELCOME_CREDITS_FREE_ALLOWANCE_USD,
  WELCOME_CREDITS_GRANT_AMOUNT,
  billingPeriodId,
  displayCurrencyToLedgerAmount,
  guestTrialLoginForVisitorId,
  guestTrialVisitorHash,
  isGuestTrialAccountLogin,
  ledgerAmountToDisplayCurrency,
  normalizeGuestTrialRequest,
  sanitizeBillingSettingsPatch,
  sanitizePayoutSettingsPatch,
  sanitizeProfileSettingsPatch,
  subscriptionBasePriceForPlan,
  subscriptionBonusRateForPlan,
  subscriptionIncludedCreditsForPlan,
  subscriptionRefillAmountForPlan
} from './billing-policy.js';

function normalizeString(value, fallback = '') {
  return String(value ?? fallback).trim();
}

function normalizeTaskTypeAlias(taskType = '') {
  return String(taskType || '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeIdentityProvider(value, fallback = 'guest') {
  const text = normalizeString(value, fallback).toLowerCase();
  return text || fallback;
}

function normalizeEmail(value, fallback = '') {
  return normalizeString(value, fallback).toLowerCase();
}

export function accountIdForLogin(login = '') {
  const safe = String(login || '').trim().toLowerCase();
  return safe ? `acct:${safe}` : 'acct:guest';
}

export function defaultLoginForAuthUser(user = null, authProvider = 'guest') {
  const provider = normalizeIdentityProvider(authProvider, 'guest');
  const login = normalizeString(user?.login).toLowerCase();
  const email = normalizeEmail(user?.email);
  const providerUserId = normalizeString(user?.providerUserId || user?.sub || user?.id).toLowerCase();
  if (provider.startsWith('github')) return login || email || (providerUserId ? `github:${providerUserId}` : '');
  if (provider === 'google-oauth') return email || login || (providerUserId ? `google:${providerUserId}` : '');
  return login || email || '';
}

function normalizeLinkedIdentityRecord(record = {}) {
  const provider = normalizeIdentityProvider(record.provider || record.authProvider, 'guest');
  const providerUserId = normalizeString(record.providerUserId || record.sub || record.id);
  const login = defaultLoginForAuthUser(record, provider);
  return {
    provider,
    providerUserId,
    login,
    email: normalizeEmail(record.email),
    name: normalizeString(record.name || login),
    avatarUrl: normalizeString(record.avatarUrl || record.picture),
    profileUrl: normalizeString(record.profileUrl),
    linkedAt: normalizeString(record.linkedAt, nowIso())
  };
}

function normalizeLinkedIdentities(records = []) {
  const next = [];
  const seen = new Set();
  for (const record of Array.isArray(records) ? records : []) {
    const normalized = normalizeLinkedIdentityRecord(record);
    if (!normalized.provider || (!normalized.providerUserId && !normalized.login && !normalized.email)) continue;
    const key = `${normalized.provider}:${normalized.providerUserId || normalized.login || normalized.email}`;
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(normalized);
  }
  return next;
}

function mergeAliases(...groups) {
  const seen = new Set();
  const next = [];
  for (const group of groups) {
    for (const value of Array.isArray(group) ? group : []) {
      const normalized = normalizeString(value).toLowerCase();
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      next.push(normalized);
    }
  }
  return next;
}

export function linkedIdentitiesForAccount(account = null) {
  return normalizeLinkedIdentities(account?.linkedIdentities || []);
}

export function aliasLoginsForAccount(account = null) {
  return mergeAliases(
    [normalizeString(account?.login).toLowerCase()],
    account?.aliases || [],
    linkedIdentitiesForAccount(account).map((identity) => identity.login)
  );
}

function accountMatchesLogin(account = null, login = '') {
  const safeLogin = normalizeString(login).toLowerCase();
  if (!safeLogin) return false;
  return aliasLoginsForAccount(account).includes(safeLogin);
}

function accountMatchesIdentity(account = null, user = null, authProvider = 'guest') {
  const provider = normalizeIdentityProvider(authProvider, 'guest');
  const login = defaultLoginForAuthUser(user, provider);
  const email = normalizeEmail(user?.email);
  const providerUserId = normalizeString(user?.providerUserId || user?.sub || user?.id);
  if (!provider || provider === 'guest') return false;
  return linkedIdentitiesForAccount(account).some((identity) => {
    if (identity.provider !== provider) return false;
    if (providerUserId && identity.providerUserId === providerUserId) return true;
    if (login && identity.login === login) return true;
    if (email && identity.email === email) return true;
    return false;
  });
}

function findAccountIndexByLogin(state, login = '') {
  return Array.isArray(state?.accounts)
    ? state.accounts.findIndex((item) => accountMatchesLogin(item, login))
    : -1;
}

function findAccountIndexByIdentity(state, user = null, authProvider = 'guest') {
  return Array.isArray(state?.accounts)
    ? state.accounts.findIndex((item) => accountMatchesIdentity(item, user, authProvider))
    : -1;
}

export function accountIdentityForProvider(account = null, providerPrefix = '') {
  const safePrefix = normalizeString(providerPrefix).toLowerCase();
  if (!safePrefix) return null;
  return linkedIdentitiesForAccount(account).find((identity) => String(identity.provider || '').toLowerCase().startsWith(safePrefix)) || null;
}

export const LIST_CREATOR_BATCH_SIZE = 20;
export const LIST_CREATOR_MAX_REQUESTED_COMPANIES = 500;
export const LIST_CREATOR_BASE_COST_BASIS = Object.freeze({
  total_cost_basis: 64,
  compute_cost: 16,
  tool_cost: 14,
  labor_cost: 34,
  api_cost: 0
});

function flattenEstimateText(value, parts = [], depth = 0) {
  if (value == null || depth > 4) return parts;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const text = String(value).trim();
    if (text) parts.push(text);
    return parts;
  }
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 40)) flattenEstimateText(item, parts, depth + 1);
    return parts;
  }
  if (typeof value === 'object') {
    for (const item of Object.values(value).slice(0, 80)) flattenEstimateText(item, parts, depth + 1);
  }
  return parts;
}

function scaleListCreatorCostBasis(batchCount = 1) {
  const batches = Math.max(1, Math.ceil(Number(batchCount || 1)));
  return {
    total_cost_basis: normalizeMoney(LIST_CREATOR_BASE_COST_BASIS.total_cost_basis * batches, 0),
    compute_cost: normalizeMoney(LIST_CREATOR_BASE_COST_BASIS.compute_cost * batches, 0),
    tool_cost: normalizeMoney(LIST_CREATOR_BASE_COST_BASIS.tool_cost * batches, 0),
    labor_cost: normalizeMoney(LIST_CREATOR_BASE_COST_BASIS.labor_cost * batches, 0),
    api_cost: normalizeMoney(LIST_CREATOR_BASE_COST_BASIS.api_cost * batches, 0)
  };
}

export function inferListCreatorRequestedCount(value = '', fallback = LIST_CREATOR_BATCH_SIZE) {
  const text = flattenEstimateText(value).join(' ').normalize('NFKC');
  const fallbackCount = Math.max(1, Math.min(LIST_CREATOR_MAX_REQUESTED_COMPANIES, Math.round(Number(fallback || LIST_CREATOR_BATCH_SIZE) || LIST_CREATOR_BATCH_SIZE)));
  const patterns = [
    /(?:top|first|initial|shortlist|list|lead list|prospect list|候補|上位|まず|初回|リスト)\D{0,24}(\d{1,4})\s*(?:companies|company|leads|prospects|rows|社|件)/i,
    /(\d{1,4})\s*(?:companies|company|leads|prospects|lead rows|prospect rows|rows|社|件)\b/i,
    /(\d{1,4})\s*(?:件|社)(?:分|くらい|ほど|程度)?/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const count = Number(match?.[1] || 0);
    if (Number.isFinite(count) && count > 0) {
      return Math.max(1, Math.min(LIST_CREATOR_MAX_REQUESTED_COMPANIES, Math.round(count)));
    }
  }
  return fallbackCount;
}

export function listCreatorUsageEstimateForCount(count = LIST_CREATOR_BATCH_SIZE) {
  const requestedCount = inferListCreatorRequestedCount(String(count), count);
  const batchCount = Math.max(1, Math.ceil(requestedCount / LIST_CREATOR_BATCH_SIZE));
  return {
    requestedCount,
    batchSize: LIST_CREATOR_BATCH_SIZE,
    batchCount,
    usage: scaleListCreatorCostBasis(batchCount),
    baselineUsage: LIST_CREATOR_BASE_COST_BASIS,
    contactCaptureMode: 'public_contact_only'
  };
}

export function listCreatorUsageEstimateForOrder(body = {}, options = {}) {
  const taskType = normalizeString(body.task_type || body.taskType || options.taskType).toLowerCase();
  const agentKind = normalizeString(body.kind || body.agent_kind || body.agentKind || options.kind).toLowerCase();
  if (taskType && taskType !== 'list_creator' && agentKind !== 'list_creator') return null;
  const text = flattenEstimateText([
    body.prompt,
    body.goal,
    body.originalPrompt,
    body.input,
    options.prompt,
    options.input
  ]).join(' ');
  const requestedCount = inferListCreatorRequestedCount(text, options.fallbackCount || LIST_CREATOR_BATCH_SIZE);
  return listCreatorUsageEstimateForCount(requestedCount);
}

const API_KEY_LABEL_MAX_LENGTH = 80;

function cleanApiKeyLabel(value = '') {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeApiKeyLabel(value, fallback = 'default') {
  const text = cleanApiKeyLabel(value);
  const fallbackText = cleanApiKeyLabel(fallback);
  return (text || fallbackText).slice(0, API_KEY_LABEL_MAX_LENGTH);
}

function requireApiKeyIssueLabel(value) {
  const label = cleanApiKeyLabel(value);
  if (!label) throw new Error('API key title is required.');
  if (label.length > API_KEY_LABEL_MAX_LENGTH) {
    throw new Error(`API key title must be ${API_KEY_LABEL_MAX_LENGTH} characters or fewer.`);
  }
  return label;
}

function normalizeApiKeyMode(value, fallback = 'live') {
  const text = normalizeString(value, fallback).toLowerCase();
  return ['live', 'test'].includes(text) ? text : fallback;
}

function shortText(value, max = 96) {
  const text = normalizeString(value);
  if (!text) return '';
  return text.length > max ? `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…` : text;
}

export function hashSecret(value = '') {
  return createHash('sha256').update(String(value || ''), 'utf8').digest('hex');
}

const CAIT_API_KEY_SCOPES = ['order:create', 'order:read', 'agent:create', 'agent:write', 'agent:read'];

function normalizeCaitApiKeyScopes(scopes = []) {
  const rawScopes = Array.isArray(scopes) ? scopes : [];
  return [...new Set([
    ...rawScopes.map((scope) => normalizeString(scope)).filter(Boolean),
    ...CAIT_API_KEY_SCOPES
  ])];
}

function sanitizeOrderApiKeyRecord(record = {}) {
  return {
    id: normalizeString(record.id),
    label: normalizeApiKeyLabel(record.label),
    mode: normalizeApiKeyMode(record.mode, 'live'),
    prefix: normalizeString(record.prefix),
    scopes: normalizeCaitApiKeyScopes(record.scopes),
    createdAt: normalizeString(record.createdAt, nowIso()),
    lastUsedAt: normalizeString(record.lastUsedAt),
    lastUsedPath: normalizeString(record.lastUsedPath),
    lastUsedMethod: normalizeString(record.lastUsedMethod).toUpperCase(),
    revokedAt: normalizeString(record.revokedAt),
    active: !normalizeString(record.revokedAt)
  };
}

function normalizeOrderApiKeyRecord(record = {}) {
  return {
    ...sanitizeOrderApiKeyRecord(record),
    keyHash: normalizeString(record.keyHash)
  };
}

function normalizeApiAccessPatch(patch = {}, base = {}) {
  const orderKeysSource = Array.isArray(patch.orderKeys) ? patch.orderKeys : Array.isArray(base.orderKeys) ? base.orderKeys : [];
  return {
    orderKeys: orderKeysSource.map(normalizeOrderApiKeyRecord)
  };
}

function sanitizeGithubAppInstallation(record = {}) {
  return {
    id: normalizeString(record.id),
    accountLogin: normalizeString(record.accountLogin || record.account_login),
    targetType: normalizeString(record.targetType || record.target_type),
    repositorySelection: normalizeString(record.repositorySelection || record.repository_selection),
    htmlUrl: normalizeString(record.htmlUrl || record.html_url)
  };
}

function sanitizeGithubAppRepo(record = {}) {
  return {
    id: normalizeString(record.id),
    name: normalizeString(record.name),
    fullName: normalizeString(record.fullName || record.full_name),
    description: normalizeString(record.description),
    homepage: normalizeString(record.homepage),
    private: normalizeBoolean(record.private, false),
    defaultBranch: normalizeString(record.defaultBranch || record.default_branch),
    htmlUrl: normalizeString(record.htmlUrl || record.html_url),
    owner: normalizeString(record.owner),
    installationId: normalizeString(record.installationId || record.installation_id),
    installationAccountLogin: normalizeString(record.installationAccountLogin || record.installation_account_login),
    installationTargetType: normalizeString(record.installationTargetType || record.installation_target_type)
  };
}

function normalizeGithubAppAccessPatch(patch = {}, base = {}) {
  const installationsSource = Array.isArray(patch.installations) ? patch.installations : Array.isArray(base.installations) ? base.installations : [];
  const reposSource = Array.isArray(patch.repos) ? patch.repos : Array.isArray(base.repos) ? base.repos : [];
  return {
    installations: installationsSource.map(sanitizeGithubAppInstallation).filter((item) => item.id),
    repos: reposSource.map(sanitizeGithubAppRepo).filter((item) => item.fullName && item.installationId),
    updatedAt: normalizeString(patch.updatedAt || patch.updated_at || base.updatedAt)
  };
}

export function sanitizeExecutorPreferencesPatch(patch = {}, base = {}) {
  const googlePatch = patch?.google && typeof patch.google === 'object' ? patch.google : {};
  const googleBase = base?.google && typeof base.google === 'object' ? base.google : {};
  const githubPatch = patch?.github && typeof patch.github === 'object' ? patch.github : {};
  const githubBase = base?.github && typeof base.github === 'object' ? base.github : {};
  const xPatch = patch?.x && typeof patch.x === 'object' ? patch.x : {};
  const xBase = base?.x && typeof base.x === 'object' ? base.x : {};
  return {
    google: {
      searchConsoleSite: normalizeString(googlePatch.searchConsoleSite ?? googleBase.searchConsoleSite),
      ga4Property: normalizeString(googlePatch.ga4Property ?? googleBase.ga4Property),
      driveFileId: normalizeString(googlePatch.driveFileId ?? googleBase.driveFileId),
      calendarId: normalizeString(googlePatch.calendarId ?? googleBase.calendarId),
      gmailLabelId: normalizeString(googlePatch.gmailLabelId ?? googleBase.gmailLabelId)
    },
    github: {
      repoFullName: normalizeString(githubPatch.repoFullName ?? githubBase.repoFullName)
    },
    x: {
      channel: normalizeString(xPatch.channel ?? xBase.channel),
      actionMode: normalizeString(xPatch.actionMode ?? xBase.actionMode)
    }
  };
}

export function defaultAccountSettingsForUser(user = null, authProvider = 'guest') {
  const login = defaultLoginForAuthUser(user, authProvider);
  const displayName = normalizeString(user?.name || user?.email || login);
  const email = normalizeEmail(user?.email);
  const linkedIdentities = authProvider && authProvider !== 'guest'
    ? normalizeLinkedIdentities([{
      ...user,
      provider: authProvider,
      providerUserId: user?.providerUserId || user?.sub || user?.id,
      login,
      email
    }])
    : [];
  return {
    id: accountIdForLogin(login),
    login,
    aliases: mergeAliases([login]),
    linkedIdentities,
    authProvider: normalizeString(authProvider, 'guest'),
    profile: {
      displayName,
      legalName: '',
      companyName: '',
      country: 'JP',
      uiLanguage: 'en',
      defaultCurrency: BILLING_DISPLAY_CURRENCY,
      avatarUrl: normalizeString(user?.avatarUrl),
      profileUrl: normalizeString(user?.profileUrl)
    },
    billing: {
      mode: 'monthly_invoice',
      invoiceMode: 'monthly',
      invoiceEnabled: true,
      invoiceApproved: false,
      legalName: '',
      companyName: '',
      billingEmail: email,
      billingPhone: '',
      billingPostalCode: '',
      billingRegion: '',
      billingCity: '',
      billingAddressLine1: '',
      billingAddressLine2: '',
      country: 'JP',
      currency: BILLING_DISPLAY_CURRENCY,
      taxId: '',
      purchaseOrderRef: '',
      invoiceMemo: '',
      dueDays: 14,
      closeMode: 'calendar_month',
      welcomeCreditsBalance: 0,
      welcomeCreditsReserved: 0,
      welcomeCreditsGrantedTotal: 0,
      welcomeCreditsSignupGrantedTotal: 0,
      welcomeCreditsSignupGrantedAt: '',
      signupWelcomeEmailAttemptedAt: '',
      welcomeCreditsAgentGrantedTotal: 0,
      welcomeCreditsAgentGrantedAt: '',
      welcomeCreditsAgentGrantAgentId: '',
      welcomeCreditsConsumedTotal: 0,
      guestTrialVisitorHash: '',
      guestTrialCreditLimit: 0,
      guestTrialSignupVisitorHash: '',
      guestTrialSignupDebitTotal: 0,
      guestTrialSignupDebitedAt: '',
      welcomeCreditsGrantedAt: '',
      welcomeCreditsGrantAgentId: '',
      openAiMonthlyCostLimit: DEFAULT_OPENAI_MONTHLY_COST_LIMIT,
      openAiCostPeriod: billingPeriodId(),
      openAiCostUsed: 0,
      openAiCostReserved: 0,
      depositBalance: 0,
      depositReserved: 0,
      autoTopupEnabled: false,
      autoTopupThreshold: 0,
      autoTopupAmount: 0,
      autoTopupPeriod: billingPeriodId(),
      autoTopupCount: 0,
      autoTopupLastAt: '',
      subscriptionPlan: 'none',
      subscriptionIncludedCredits: 0,
      subscriptionCreditsPeriod: billingPeriodId(),
      subscriptionCreditsUsed: 0,
      subscriptionCreditsReserved: 0,
      subscriptionOverageMode: 'monthly_invoice',
      arrearsTotal: 0
    },
    payout: {
      providerEnabled: false,
      entityType: 'individual',
      legalName: '',
      displayName,
      payoutEmail: email,
      country: 'JP',
      currency: BILLING_DISPLAY_CURRENCY,
      website: '',
      supportEmail: email,
      statementDescriptor: '',
      transferSchedule: 'monthly',
      minimumPayoutAmount: DEFAULT_MINIMUM_PAYOUT_AMOUNT,
      pendingBalance: 0,
      paidOutTotal: 0,
      lastPayoutAt: null,
      lastPayoutAmount: 0,
      lastPayoutTransferId: null,
      payoutRuns: [],
      onboardingStatus: 'not_started',
      externalAccountStatus: 'not_started',
      destinationSummary: 'Stripe onboarding not started',
      notes: '',
      identityVerification: {
        status: 'not_submitted',
        submittedAt: null,
        reviewedAt: null,
        reviewedBy: '',
        rejectionReason: '',
        fields: {},
        photo: {
          submitted: false,
          mimeType: '',
          size: 0,
          name: '',
          dataUrl: '',
          submittedAt: null
        }
      }
    },
    stripe: {
      customerStatus: 'not_started',
      customerId: null,
      defaultPaymentMethodStatus: 'not_started',
      defaultPaymentMethodId: null,
      defaultPaymentMethodBrand: '',
      defaultPaymentMethodLast4: '',
      setupCheckoutStatus: 'not_started',
      setupCheckoutSessionId: null,
      pendingTopupCheckoutSessionId: null,
      processedTopupCheckoutSessionIds: [],
      lastTopupCheckoutSessionId: null,
      lastTopupAmount: 0,
      lastTopupCurrency: BILLING_DISPLAY_CURRENCY,
      lastTopupAt: null,
      topupHistory: [],
      providerMonthlyCharges: [],
      lastProviderMonthlyChargeAt: null,
      lastProviderMonthlyChargeAmount: 0,
      lastProviderMonthlyChargePeriod: null,
      lastProviderMonthlyChargeStatus: 'not_started',
      providerMonthlyRetryPeriod: null,
      providerMonthlyRetryCount: 0,
      providerMonthlyLastAttemptAt: null,
      providerMonthlyLastFailureAt: null,
      providerMonthlyLastFailureMessage: '',
      providerMonthlyLastNotificationAt: null,
      providerMonthlyLastNotificationPeriod: null,
      subscriptionStatus: 'not_started',
      subscriptionId: null,
      subscriptionPriceId: null,
      subscriptionPlan: 'none',
      subscriptionCurrentPeriodEnd: null,
      lastSubscriptionFundingPeriodEnd: null,
      lastSubscriptionFundingAmount: 0,
      lastSubscriptionFundingAt: null,
      connectedAccountStatus: 'not_started',
      connectedAccountId: null,
      connectOnboardingStatus: 'not_started',
      chargesEnabled: false,
      payoutsEnabled: false,
      identityVerified: false,
      identityVerificationStatus: 'not_started',
      transferCapabilityStatus: 'missing',
      requirementsCurrentDue: [],
      requirementsPastDue: [],
      requirementsDisabledReason: '',
      lastSyncAt: null,
      mode: 'not_connected'
    },
    apiAccess: {
      orderKeys: []
    },
    githubAppAccess: {
      installations: [],
      repos: [],
      updatedAt: ''
    },
    executorPreferences: {
      google: {
        searchConsoleSite: '',
        ga4Property: '',
        driveFileId: '',
        calendarId: '',
        gmailLabelId: ''
      },
      github: {
        repoFullName: ''
      },
      x: {
        channel: '',
        actionMode: ''
      }
    },
    chatMemory: {
      hiddenTranscriptIds: []
    },
    connectors: {
      github: {
        provider: 'github-oauth',
        connected: false,
        providerUserId: '',
        login: '',
        name: '',
        email: '',
        profileUrl: '',
        avatarUrl: '',
        scopes: '',
        accessTokenEnc: '',
        connectedAt: '',
        updatedAt: ''
      },
      google: {
        provider: 'google-oauth',
        connected: false,
        providerUserId: '',
        email: '',
        name: '',
        profileUrl: '',
        avatarUrl: '',
        scopes: '',
        accessTokenEnc: '',
        refreshTokenEnc: '',
        tokenExpiresAt: '',
        connectedAt: '',
        updatedAt: ''
      },
      x: {
        provider: 'x-oauth',
        connected: false,
        xUserId: '',
        username: '',
        displayName: '',
        profileImageUrl: '',
        accessTokenEnc: '',
        refreshTokenEnc: '',
        scopes: '',
        tokenExpiresAt: '',
        connectedAt: '',
        updatedAt: '',
        rateLimitResetAt: '',
        lastPostAt: '',
        lastPostedTweetId: '',
        postCount: 0
      }
    },
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
}

export function accountSettingsForLogin(state, login, user = null, authProvider = 'guest') {
  const safeLogin = normalizeString(login).toLowerCase();
  const defaults = defaultAccountSettingsForUser(user ? { ...user, login: safeLogin } : { login: safeLogin }, authProvider);
  const index = findAccountIndexByLogin(state, safeLogin);
  const existing = index === -1 ? null : state.accounts[index];
  if (!existing) return defaults;
  const existingWithoutLegacyPayment = Object.fromEntries(
    Object.entries(existing).filter(([key]) => key.toLowerCase() !== 'pay' + 'jp')
  );
  return {
    ...defaults,
    ...existingWithoutLegacyPayment,
    id: existing.id || defaults.id,
    login: normalizeString(existing.login || safeLogin || defaults.login).toLowerCase(),
    aliases: mergeAliases(existing.aliases, defaults.aliases, [existing.login, safeLogin]),
    linkedIdentities: normalizeLinkedIdentities([...(existing.linkedIdentities || []), ...(defaults.linkedIdentities || [])]),
    authProvider: normalizeString(existing.authProvider || authProvider || defaults.authProvider, defaults.authProvider),
    profile: {
      ...defaults.profile,
      ...(existing.profile || {}),
      uiLanguage: normalizeUiLanguage((existing.profile || {}).uiLanguage ?? (existing.profile || {}).language ?? defaults.profile.uiLanguage, 'en'),
      defaultCurrency: BILLING_DISPLAY_CURRENCY
    },
    billing: normalizeBillingPatch(existing.billing || {}, defaults.billing || {}),
    payout: normalizePayoutPatch(existing.payout || {}, defaults.payout || {}),
    stripe: { ...defaults.stripe, ...(existing.stripe || {}) },
    apiAccess: normalizeApiAccessPatch(existing.apiAccess || {}, defaults.apiAccess || {}),
    githubAppAccess: normalizeGithubAppAccessPatch(existing.githubAppAccess || {}, defaults.githubAppAccess || {}),
    executorPreferences: sanitizeExecutorPreferencesPatch(existing.executorPreferences || {}, defaults.executorPreferences || {}),
    chatMemory: normalizeChatMemoryPatch(existing.chatMemory || {}, defaults.chatMemory || {}),
    connectors: normalizeConnectorsPatch(existing.connectors || {}, defaults.connectors || {}),
    createdAt: existing.createdAt || defaults.createdAt,
    updatedAt: existing.updatedAt || defaults.updatedAt
  };
}

export function accountSettingsForIdentity(state, user = null, authProvider = 'guest') {
  const fallbackLogin = defaultLoginForAuthUser(user, authProvider);
  const index = findAccountIndexByIdentity(state, user, authProvider);
  if (index !== -1) {
    const existing = state.accounts[index];
    return accountSettingsForLogin(state, existing.login, user, authProvider);
  }
  if (fallbackLogin) return accountSettingsForLogin(state, fallbackLogin, user, authProvider);
  return defaultAccountSettingsForUser(user || null, authProvider);
}

function normalizeBillingPatch(patch = {}, base = {}, options = {}) {
  const runtimePeriod = normalizeString(options.period, billingPeriodId());
  const normalizedPlan = normalizeSubscriptionPlan(patch.subscriptionPlan ?? base.subscriptionPlan, 'none');
  const basePlan = normalizeSubscriptionPlan(base.subscriptionPlan, 'none');
  const planDefaultCredits = subscriptionIncludedCreditsForPlan(normalizedPlan);
  const explicitCreditsProvided = Object.prototype.hasOwnProperty.call(patch, 'subscriptionIncludedCredits');
  let subscriptionIncludedCredits = normalizeMoney(patch.subscriptionIncludedCredits ?? base.subscriptionIncludedCredits, 0);
  if (!explicitCreditsProvided && (normalizedPlan !== basePlan || subscriptionIncludedCredits <= 0)) {
    subscriptionIncludedCredits = planDefaultCredits;
  } else if (explicitCreditsProvided && subscriptionIncludedCredits <= 0 && planDefaultCredits > 0) {
    subscriptionIncludedCredits = planDefaultCredits;
  }
  const legacyGrantedTotal = normalizeMoney(patch.welcomeCreditsGrantedTotal ?? base.welcomeCreditsGrantedTotal, 0);
  const legacyGrantAgentId = normalizeString(patch.welcomeCreditsGrantAgentId ?? base.welcomeCreditsGrantAgentId);
  const patchHasSignupGrantTotal = Object.prototype.hasOwnProperty.call(patch, 'welcomeCreditsSignupGrantedTotal');
  const baseHasSignupGrantTotal = Object.prototype.hasOwnProperty.call(base, 'welcomeCreditsSignupGrantedTotal')
    && normalizeMoney(base.welcomeCreditsSignupGrantedTotal, 0) > 0;
  const patchHasAgentGrantTotal = Object.prototype.hasOwnProperty.call(patch, 'welcomeCreditsAgentGrantedTotal');
  const baseHasAgentGrantTotal = Object.prototype.hasOwnProperty.call(base, 'welcomeCreditsAgentGrantedTotal')
    && normalizeMoney(base.welcomeCreditsAgentGrantedTotal, 0) > 0;
  const hasSignupGrantTotal = patchHasSignupGrantTotal || baseHasSignupGrantTotal;
  const hasAgentGrantTotal = patchHasAgentGrantTotal || baseHasAgentGrantTotal;
  const signupGrantedTotal = normalizeMoney(
    hasSignupGrantTotal ? (patch.welcomeCreditsSignupGrantedTotal ?? base.welcomeCreditsSignupGrantedTotal) : 0,
    0
  );
  const agentGrantedTotal = normalizeMoney(
    hasAgentGrantTotal
      ? (patch.welcomeCreditsAgentGrantedTotal ?? base.welcomeCreditsAgentGrantedTotal)
      : (legacyGrantAgentId ? legacyGrantedTotal : 0),
    0
  );
  return syncBillingRuntimeFields({
    mode: normalizeBillingMode(patch.mode ?? base.mode, 'monthly_invoice'),
    invoiceMode: 'monthly',
    invoiceEnabled: normalizeBoolean(patch.invoiceEnabled ?? base.invoiceEnabled, true),
    invoiceApproved: normalizeBoolean(patch.invoiceApproved ?? base.invoiceApproved, false),
    legalName: normalizeString(patch.legalName ?? base.legalName),
    companyName: normalizeString(patch.companyName ?? base.companyName),
    billingEmail: normalizeString(patch.billingEmail ?? base.billingEmail),
    billingPhone: normalizeString(patch.billingPhone ?? base.billingPhone),
    billingPostalCode: normalizeString(patch.billingPostalCode ?? base.billingPostalCode),
    billingRegion: normalizeString(patch.billingRegion ?? base.billingRegion),
    billingCity: normalizeString(patch.billingCity ?? base.billingCity),
    billingAddressLine1: normalizeString(patch.billingAddressLine1 ?? base.billingAddressLine1),
    billingAddressLine2: normalizeString(patch.billingAddressLine2 ?? base.billingAddressLine2),
    country: normalizeCountry(patch.country ?? base.country, 'JP'),
    currency: BILLING_DISPLAY_CURRENCY,
    taxId: normalizeString(patch.taxId ?? base.taxId),
    purchaseOrderRef: normalizeString(patch.purchaseOrderRef ?? base.purchaseOrderRef),
    invoiceMemo: normalizeString(patch.invoiceMemo ?? base.invoiceMemo),
    dueDays: normalizePositiveInt(patch.dueDays ?? base.dueDays, 14),
    closeMode: 'calendar_month',
    welcomeCreditsBalance: normalizeMoney(patch.welcomeCreditsBalance ?? base.welcomeCreditsBalance, 0),
    welcomeCreditsReserved: normalizeMoney(patch.welcomeCreditsReserved ?? base.welcomeCreditsReserved, 0),
    welcomeCreditsGrantedTotal: normalizeMoney(patch.welcomeCreditsGrantedTotal ?? base.welcomeCreditsGrantedTotal, 0),
    welcomeCreditsSignupGrantedTotal: signupGrantedTotal,
    welcomeCreditsSignupGrantedAt: normalizeString(patch.welcomeCreditsSignupGrantedAt ?? base.welcomeCreditsSignupGrantedAt),
    signupWelcomeEmailAttemptedAt: normalizeString(patch.signupWelcomeEmailAttemptedAt ?? base.signupWelcomeEmailAttemptedAt),
    welcomeCreditsAgentGrantedTotal: agentGrantedTotal,
    welcomeCreditsAgentGrantedAt: normalizeString(patch.welcomeCreditsAgentGrantedAt ?? base.welcomeCreditsAgentGrantedAt ?? (agentGrantedTotal > 0 ? (patch.welcomeCreditsGrantedAt ?? base.welcomeCreditsGrantedAt) : '')),
    welcomeCreditsAgentGrantAgentId: normalizeString(patch.welcomeCreditsAgentGrantAgentId ?? base.welcomeCreditsAgentGrantAgentId ?? legacyGrantAgentId),
    welcomeCreditsConsumedTotal: normalizeMoney(patch.welcomeCreditsConsumedTotal ?? base.welcomeCreditsConsumedTotal, 0),
    guestTrialVisitorHash: normalizeString(patch.guestTrialVisitorHash ?? base.guestTrialVisitorHash),
    guestTrialCreditLimit: normalizeMoney(patch.guestTrialCreditLimit ?? base.guestTrialCreditLimit, 0),
    guestTrialSignupVisitorHash: normalizeString(patch.guestTrialSignupVisitorHash ?? base.guestTrialSignupVisitorHash),
    guestTrialSignupDebitTotal: normalizeMoney(patch.guestTrialSignupDebitTotal ?? base.guestTrialSignupDebitTotal, 0),
    guestTrialSignupDebitedAt: normalizeString(patch.guestTrialSignupDebitedAt ?? base.guestTrialSignupDebitedAt),
    welcomeCreditsGrantedAt: normalizeString(patch.welcomeCreditsGrantedAt ?? base.welcomeCreditsGrantedAt),
    welcomeCreditsGrantAgentId: normalizeString(patch.welcomeCreditsGrantAgentId ?? base.welcomeCreditsGrantAgentId),
    openAiMonthlyCostLimit: normalizeOpenAiCostLimit(patch.openAiMonthlyCostLimit ?? base.openAiMonthlyCostLimit, DEFAULT_OPENAI_MONTHLY_COST_LIMIT),
    openAiCostPeriod: normalizeString(patch.openAiCostPeriod ?? base.openAiCostPeriod, billingPeriodId()),
    openAiCostUsed: normalizeMoney(patch.openAiCostUsed ?? base.openAiCostUsed, 0),
    openAiCostReserved: normalizeMoney(patch.openAiCostReserved ?? base.openAiCostReserved, 0),
    depositBalance: normalizeMoney(patch.depositBalance ?? base.depositBalance, 0),
    depositReserved: normalizeMoney(patch.depositReserved ?? base.depositReserved, 0),
    autoTopupEnabled: false,
    autoTopupThreshold: 0,
    autoTopupAmount: 0,
    autoTopupPeriod: normalizeString(patch.autoTopupPeriod ?? base.autoTopupPeriod, billingPeriodId()),
    autoTopupCount: normalizePositiveInt(patch.autoTopupCount ?? base.autoTopupCount, 0),
    autoTopupLastAt: normalizeString(patch.autoTopupLastAt ?? base.autoTopupLastAt),
    subscriptionPlan: normalizedPlan,
    subscriptionIncludedCredits,
    subscriptionCreditsPeriod: normalizeString(patch.subscriptionCreditsPeriod ?? base.subscriptionCreditsPeriod, billingPeriodId()),
    subscriptionCreditsUsed: normalizeMoney(patch.subscriptionCreditsUsed ?? base.subscriptionCreditsUsed, 0),
    subscriptionCreditsReserved: normalizeMoney(patch.subscriptionCreditsReserved ?? base.subscriptionCreditsReserved, 0),
    subscriptionOverageMode: 'monthly_invoice',
    arrearsTotal: normalizeMoney(patch.arrearsTotal ?? base.arrearsTotal, 0)
  }, runtimePeriod);
}

function normalizePayoutPatch(patch = {}, base = {}) {
  return {
    providerEnabled: normalizeBoolean(patch.providerEnabled ?? base.providerEnabled, false),
    entityType: normalizeEntityType(patch.entityType ?? base.entityType, 'individual'),
    legalName: normalizeString(patch.legalName ?? base.legalName),
    displayName: normalizeString(patch.displayName ?? base.displayName),
    payoutEmail: normalizeString(patch.payoutEmail ?? base.payoutEmail),
    country: normalizeCountry(patch.country ?? base.country, 'JP'),
    currency: BILLING_DISPLAY_CURRENCY,
    website: normalizeString(patch.website ?? base.website),
    supportEmail: normalizeString(patch.supportEmail ?? base.supportEmail),
    statementDescriptor: normalizeString(patch.statementDescriptor ?? base.statementDescriptor),
    transferSchedule: 'monthly',
    minimumPayoutAmount: normalizeMinimumPayoutAmount(patch.minimumPayoutAmount ?? base.minimumPayoutAmount),
    pendingBalance: normalizeMoney(patch.pendingBalance ?? base.pendingBalance, 0),
    paidOutTotal: normalizeMoney(patch.paidOutTotal ?? base.paidOutTotal, 0),
    lastPayoutAt: normalizeString(patch.lastPayoutAt ?? base.lastPayoutAt),
    lastPayoutAmount: normalizeMoney(patch.lastPayoutAmount ?? base.lastPayoutAmount, 0),
    lastPayoutTransferId: normalizeString(patch.lastPayoutTransferId ?? base.lastPayoutTransferId),
    payoutRuns: Array.isArray(patch.payoutRuns ?? base.payoutRuns) ? (patch.payoutRuns ?? base.payoutRuns).slice(0, 100) : [],
    onboardingStatus: normalizeStatus(patch.onboardingStatus ?? base.onboardingStatus, 'not_started'),
    externalAccountStatus: normalizeStatus(patch.externalAccountStatus ?? base.externalAccountStatus, 'not_started'),
    destinationSummary: normalizeString(patch.destinationSummary ?? base.destinationSummary ?? 'Stripe onboarding not started'),
    notes: normalizeString(patch.notes ?? base.notes),
    identityVerification: (patch.identityVerification && typeof patch.identityVerification === 'object')
      ? patch.identityVerification
      : ((base.identityVerification && typeof base.identityVerification === 'object') ? base.identityVerification : {})
  };
}

function normalizeGithubConnectorPatch(patch = {}, base = {}) {
  const raw = { ...(base || {}), ...(patch || {}) };
  const connected = normalizeBoolean(raw.connected, false);
  return {
    provider: normalizeString(raw.provider, 'github-oauth'),
    connected: Boolean(connected && (raw.accessTokenEnc || raw.login || raw.providerUserId)),
    providerUserId: normalizeString(raw.providerUserId || raw.provider_user_id),
    login: normalizeString(raw.login),
    name: normalizeString(raw.name),
    email: normalizeString(raw.email),
    profileUrl: normalizeString(raw.profileUrl || raw.profile_url),
    avatarUrl: normalizeString(raw.avatarUrl || raw.avatar_url),
    scopes: normalizeString(raw.scopes),
    accessTokenEnc: normalizeString(raw.accessTokenEnc || raw.access_token_enc),
    connectedAt: normalizeString(raw.connectedAt || raw.connected_at),
    updatedAt: normalizeString(raw.updatedAt || raw.updated_at)
  };
}

function normalizeGoogleConnectorPatch(patch = {}, base = {}) {
  const raw = { ...(base || {}), ...(patch || {}) };
  const connected = normalizeBoolean(raw.connected, false);
  return {
    provider: normalizeString(raw.provider, 'google-oauth'),
    connected: Boolean(connected && (raw.accessTokenEnc || raw.email || raw.providerUserId)),
    providerUserId: normalizeString(raw.providerUserId || raw.provider_user_id),
    email: normalizeString(raw.email),
    name: normalizeString(raw.name),
    profileUrl: normalizeString(raw.profileUrl || raw.profile_url),
    avatarUrl: normalizeString(raw.avatarUrl || raw.avatar_url),
    scopes: normalizeString(raw.scopes),
    accessTokenEnc: normalizeString(raw.accessTokenEnc || raw.access_token_enc),
    refreshTokenEnc: normalizeString(raw.refreshTokenEnc || raw.refresh_token_enc),
    tokenExpiresAt: normalizeString(raw.tokenExpiresAt || raw.token_expires_at),
    connectedAt: normalizeString(raw.connectedAt || raw.connected_at),
    updatedAt: normalizeString(raw.updatedAt || raw.updated_at)
  };
}

function normalizeXConnectorPatch(patch = {}, base = {}) {
  const raw = { ...(base || {}), ...(patch || {}) };
  const connected = normalizeBoolean(raw.connected, false);
  return {
    provider: normalizeString(raw.provider, 'x-oauth'),
    connected: Boolean(connected && (raw.accessTokenEnc || raw.username || raw.xUserId)),
    xUserId: normalizeString(raw.xUserId || raw.x_user_id),
    username: normalizeString(raw.username || raw.xUsername || raw.x_username).replace(/^@/, ''),
    displayName: normalizeString(raw.displayName || raw.display_name),
    profileImageUrl: normalizeString(raw.profileImageUrl || raw.profile_image_url),
    accessTokenEnc: normalizeString(raw.accessTokenEnc || raw.access_token_enc),
    refreshTokenEnc: normalizeString(raw.refreshTokenEnc || raw.refresh_token_enc),
    scopes: normalizeString(raw.scopes || raw.tokenScopes || raw.token_scopes),
    tokenExpiresAt: normalizeString(raw.tokenExpiresAt || raw.token_expires_at),
    connectedAt: normalizeString(raw.connectedAt || raw.connected_at),
    updatedAt: normalizeString(raw.updatedAt || raw.updated_at),
    rateLimitResetAt: normalizeString(raw.rateLimitResetAt || raw.rate_limit_reset_at),
    lastPostAt: normalizeString(raw.lastPostAt || raw.last_post_at),
    lastPostedTweetId: normalizeString(raw.lastPostedTweetId || raw.last_posted_tweet_id),
    postCount: normalizePositiveInt(raw.postCount ?? raw.post_count, 0)
  };
}

function normalizeConnectorsPatch(patch = {}, base = {}) {
  const raw = { ...(base || {}), ...(patch || {}) };
  return {
    github: normalizeGithubConnectorPatch(raw.github || {}, (base || {}).github || {}),
    google: normalizeGoogleConnectorPatch(raw.google || {}, (base || {}).google || {}),
    x: normalizeXConnectorPatch(raw.x || raw.twitter || {}, (base || {}).x || (base || {}).twitter || {})
  };
}

function sanitizeConnectorsForClient(connectors = {}) {
  const normalized = normalizeConnectorsPatch(connectors || {});
  const github = { ...(normalized.github || {}) };
  delete github.accessTokenEnc;
  const google = { ...(normalized.google || {}) };
  delete google.accessTokenEnc;
  delete google.refreshTokenEnc;
  const x = { ...(normalized.x || {}) };
  delete x.accessTokenEnc;
  delete x.refreshTokenEnc;
  return {
    ...normalized,
    github,
    google,
    x
  };
}

function normalizeStripeTopupRecord(record = {}) {
  return {
    id: normalizeString(record.id || record.paymentIntentId || record.checkoutSessionId || record.chargeId || `topup_${randomUUID()}`),
    kind: normalizeString(record.kind || 'deposit_topup').toLowerCase(),
    checkoutSessionId: normalizeString(record.checkoutSessionId),
    paymentIntentId: normalizeString(record.paymentIntentId),
    chargeId: normalizeString(record.chargeId),
    amount: normalizeMoney(record.amount, 0),
    refundedAmount: normalizeMoney(record.refundedAmount, 0),
    currency: normalizeCurrency(record.currency, BILLING_DISPLAY_CURRENCY),
    createdAt: normalizeString(record.createdAt, nowIso()),
    updatedAt: normalizeString(record.updatedAt, nowIso())
  };
}

function normalizeProviderMonthlyChargeLineItem(item = {}) {
  return {
    agentId: normalizeString(item.agentId || item.agent_id),
    agentName: normalizeString(item.agentName || item.agent_name),
    pricingModel: normalizeAgentPricingModel(item.pricingModel || item.pricing_model),
    monthlyPrice: normalizeMoney(item.monthlyPrice ?? item.monthly_price ?? 0, 0),
    marketplaceFee: normalizeMoney(item.marketplaceFee ?? item.marketplace_fee ?? 0, 0),
    providerNet: normalizeMoney(item.providerNet ?? item.provider_net ?? 0, 0)
  };
}

function normalizeProviderMonthlyChargeRecord(record = {}) {
  const lineItems = Array.isArray(record.lineItems || record.line_items)
    ? (record.lineItems || record.line_items).map(normalizeProviderMonthlyChargeLineItem).filter((item) => item.agentId)
    : [];
  const status = normalizeString(record.status || 'succeeded').toLowerCase();
  return {
    id: normalizeString(record.id || record.paymentIntentId || record.payment_intent_id || `provider_monthly_${randomUUID()}`),
    paymentIntentId: normalizeString(record.paymentIntentId || record.payment_intent_id),
    amount: normalizeMoney(record.amount, 0),
    currency: normalizeCurrency(record.currency, BILLING_DISPLAY_CURRENCY),
    period: normalizeString(record.period, billingPeriodId()),
    status: status || 'succeeded',
    lineItems,
    createdAt: normalizeString(record.createdAt, nowIso()),
    updatedAt: normalizeString(record.updatedAt, nowIso())
  };
}

function providerMonthlyChargeHistoryForAccount(account = null) {
  return Array.isArray(account?.stripe?.providerMonthlyCharges)
    ? account.stripe.providerMonthlyCharges.map(normalizeProviderMonthlyChargeRecord).slice(-100)
    : [];
}

function findProviderMonthlyChargeRecordIndex(history = [], ids = {}) {
  const paymentIntentId = normalizeString(ids.paymentIntentId);
  const id = normalizeString(ids.id);
  return history.findIndex((record) => (
    (paymentIntentId && record.paymentIntentId === paymentIntentId) ||
    (id && record.id === id)
  ));
}

export function recordProviderMonthlyChargeInAccount(account = null, entry = {}) {
  const history = providerMonthlyChargeHistoryForAccount(account);
  const nextRecord = normalizeProviderMonthlyChargeRecord({
    ...entry,
    createdAt: entry.createdAt || nowIso(),
    updatedAt: entry.updatedAt || nowIso()
  });
  const index = findProviderMonthlyChargeRecordIndex(history, nextRecord);
  if (index === -1) return [...history, nextRecord].slice(-100);
  history[index] = normalizeProviderMonthlyChargeRecord({
    ...history[index],
    ...nextRecord,
    createdAt: history[index].createdAt || nextRecord.createdAt,
    updatedAt: nextRecord.updatedAt || nowIso()
  });
  return history.slice(-100);
}

function stripeTopupHistoryForAccount(account = null) {
  return Array.isArray(account?.stripe?.topupHistory)
    ? account.stripe.topupHistory.map(normalizeStripeTopupRecord).slice(-50)
    : [];
}

function findStripeTopupRecordIndex(history = [], ids = {}) {
  const checkoutSessionId = normalizeString(ids.checkoutSessionId);
  const paymentIntentId = normalizeString(ids.paymentIntentId);
  const chargeId = normalizeString(ids.chargeId);
  return history.findIndex((record) => (
    (checkoutSessionId && record.checkoutSessionId === checkoutSessionId) ||
    (paymentIntentId && record.paymentIntentId === paymentIntentId) ||
    (chargeId && record.chargeId === chargeId)
  ));
}

export function recordStripeTopupInAccount(account = null, entry = {}) {
  const history = stripeTopupHistoryForAccount(account);
  const nextRecord = normalizeStripeTopupRecord({
    ...entry,
    refundedAmount: entry.refundedAmount ?? 0,
    createdAt: entry.createdAt || nowIso(),
    updatedAt: entry.updatedAt || nowIso()
  });
  const index = findStripeTopupRecordIndex(history, nextRecord);
  if (index === -1) return [...history, nextRecord].slice(-50);
  const current = history[index];
  history[index] = normalizeStripeTopupRecord({
    ...current,
    ...nextRecord,
    refundedAmount: current.refundedAmount,
    createdAt: current.createdAt || nextRecord.createdAt,
    updatedAt: nextRecord.updatedAt || nowIso()
  });
  return history.slice(-50);
}

export function applyStripeRefundToAccount(account = null, refund = {}) {
  const paymentIntentId = normalizeString(refund.paymentIntentId);
  const checkoutSessionId = normalizeString(refund.checkoutSessionId);
  const chargeId = normalizeString(refund.chargeId);
  const amountRefunded = normalizeMoney(refund.amountRefunded, 0);
  if (!(amountRefunded > 0)) {
    return { matched: false, delta: 0, deficit: 0, billingPatch: account?.billing || {}, stripePatch: account?.stripe || {} };
  }
  const history = stripeTopupHistoryForAccount(account);
  const index = findStripeTopupRecordIndex(history, { paymentIntentId, checkoutSessionId, chargeId });
  const fallbackCurrency = normalizeCurrency(refund.currency, account?.billing?.currency || BILLING_DISPLAY_CURRENCY);
  const record = index === -1
    ? normalizeStripeTopupRecord({
      kind: normalizeString(refund.kind || 'deposit_topup').toLowerCase(),
      paymentIntentId,
      checkoutSessionId,
      chargeId,
      amount: normalizeMoney(refund.amount, amountRefunded),
      refundedAmount: 0,
      currency: fallbackCurrency,
      createdAt: refund.createdAt || nowIso(),
      updatedAt: refund.updatedAt || nowIso()
    })
    : history[index];
  const priorRefunded = normalizeMoney(record.refundedAmount, 0);
  const delta = normalizeMoney(amountRefunded - priorRefunded, 0);
  if (!(delta > 0)) {
    return { matched: index !== -1, blocked: false, delta: 0, deficit: 0, availableDeposit: normalizeMoney(account?.billing?.depositBalance, 0), requiredDeposit: 0, billingPatch: account?.billing || {}, stripePatch: account?.stripe || {} };
  }
  const availableDeposit = normalizeMoney(account?.billing?.depositBalance, 0);
  if (availableDeposit < delta) {
    return {
      matched: index !== -1,
      blocked: true,
      delta: 0,
      deficit: 0,
      availableDeposit,
      requiredDeposit: delta,
      billingPatch: account?.billing || {},
      stripePatch: account?.stripe || {}
    };
  }
  if (index === -1) history.push(record);
  const targetIndex = index === -1 ? history.length - 1 : index;
  history[targetIndex] = normalizeStripeTopupRecord({
    ...history[targetIndex],
    kind: normalizeString(refund.kind || history[targetIndex].kind || 'deposit_topup').toLowerCase(),
    paymentIntentId: paymentIntentId || history[targetIndex].paymentIntentId,
    checkoutSessionId: checkoutSessionId || history[targetIndex].checkoutSessionId,
    chargeId: chargeId || history[targetIndex].chargeId,
    amount: normalizeMoney(refund.amount, history[targetIndex].amount),
    refundedAmount: amountRefunded,
    currency: fallbackCurrency || history[targetIndex].currency,
    updatedAt: refund.updatedAt || nowIso()
  });
  const deduction = delta;
  const deficit = 0;
  const billingPatch = {
    ...(account?.billing || {}),
    depositBalance: normalizeMoney(availableDeposit - deduction, 0),
    arrearsTotal: normalizeMoney(account?.billing?.arrearsTotal, 0)
  };
  const stripePatch = {
    ...(account?.stripe || {}),
    topupHistory: history.slice(-50)
  };
  return { matched: true, blocked: false, delta, deficit, availableDeposit, requiredDeposit: delta, billingPatch, stripePatch };
}

export function applySubscriptionRefillToAccount(account = null, refill = {}) {
  const plan = normalizeSubscriptionPlan(refill.plan || account?.stripe?.subscriptionPlan, 'none');
  const amount = normalizeMoney(refill.amount ?? subscriptionRefillAmountForPlan(plan), 0);
  const periodEnd = normalizeString(refill.periodEnd || account?.stripe?.subscriptionCurrentPeriodEnd);
  const previousPeriodEnd = normalizeString(account?.stripe?.lastSubscriptionFundingPeriodEnd);
  if (plan === 'none' || !(amount > 0) || !periodEnd || periodEnd === previousPeriodEnd) {
    return {
      granted: false,
      amount: 0,
      plan,
      periodEnd,
      billingPatch: account?.billing || {},
      stripePatch: account?.stripe || {}
    };
  }
  return {
    granted: true,
    amount,
    plan,
    periodEnd,
    billingPatch: {
      ...(account?.billing || {}),
      depositBalance: normalizeMoney(Number(account?.billing?.depositBalance || 0) + amount, 0)
    },
    stripePatch: {
      ...(account?.stripe || {}),
      subscriptionPlan: plan,
      subscriptionCurrentPeriodEnd: periodEnd,
      lastSubscriptionFundingPeriodEnd: periodEnd,
      lastSubscriptionFundingAmount: amount,
      lastSubscriptionFundingAt: normalizeString(refill.at, nowIso())
    }
  };
}

export function upsertAccountSettingsInState(state, login, user = null, authProvider = 'guest', updates = {}) {
  const safeLogin = normalizeString(login).toLowerCase();
  if (!safeLogin) throw new Error('login required');
  if (!Array.isArray(state.accounts)) state.accounts = [];
  const index = findAccountIndexByLogin(state, safeLogin);
  const base = accountSettingsForLogin(state, safeLogin, user ? { ...user, login: safeLogin } : { login: safeLogin }, authProvider);
  const nextLinkedIdentity = authProvider && authProvider !== 'guest'
    ? normalizeLinkedIdentities([{
      ...user,
      provider: authProvider,
      providerUserId: user?.providerUserId || user?.sub || user?.id,
      login: defaultLoginForAuthUser(user ? { ...user, login: safeLogin } : { login: safeLogin }, authProvider)
    }])
    : [];
  const account = {
    ...base,
    id: base.id || accountIdForLogin(safeLogin),
    login: safeLogin,
    aliases: mergeAliases(base.aliases, [safeLogin], nextLinkedIdentity.map((identity) => identity.login), updates.aliases),
    linkedIdentities: normalizeLinkedIdentities([
      ...(base.linkedIdentities || []),
      ...nextLinkedIdentity,
      ...(updates.linkedIdentities || [])
    ]),
    authProvider: normalizeString(authProvider || base.authProvider, base.authProvider),
    profile: {
      ...base.profile,
      displayName: normalizeString((updates.profile || {}).displayName ?? base.profile.displayName ?? user?.name ?? safeLogin),
      legalName: normalizeString((updates.profile || {}).legalName ?? base.profile.legalName),
      companyName: normalizeString((updates.profile || {}).companyName ?? base.profile.companyName),
      country: normalizeCountry((updates.profile || {}).country ?? base.profile.country, 'JP'),
      uiLanguage: normalizeUiLanguage((updates.profile || {}).uiLanguage ?? (updates.profile || {}).language ?? (updates.profile || {}).preferredLanguage ?? base.profile.uiLanguage, 'en'),
      defaultCurrency: normalizeCurrency((updates.profile || {}).defaultCurrency ?? base.profile.defaultCurrency, BILLING_DISPLAY_CURRENCY),
      avatarUrl: normalizeString(user?.avatarUrl ?? base.profile.avatarUrl),
      profileUrl: normalizeString(user?.profileUrl ?? base.profile.profileUrl)
    },
    billing: normalizeBillingPatch(updates.billing || {}, base.billing || {}),
    payout: normalizePayoutPatch(updates.payout || {}, base.payout || {}),
    stripe: {
      ...base.stripe,
      ...(updates.stripe || {})
    },
    apiAccess: normalizeApiAccessPatch({ ...(base.apiAccess || {}), ...(updates.apiAccess || {}) }, base.apiAccess || {}),
    githubAppAccess: normalizeGithubAppAccessPatch(updates.githubAppAccess || {}, base.githubAppAccess || {}),
    executorPreferences: sanitizeExecutorPreferencesPatch(updates.executorPreferences || {}, base.executorPreferences || {}),
    chatMemory: normalizeChatMemoryPatch(updates.chatMemory || {}, base.chatMemory || {}),
    connectors: normalizeConnectorsPatch(updates.connectors || {}, base.connectors || {}),
    createdAt: base.createdAt || nowIso(),
    updatedAt: nowIso()
  };
  if (index === -1) state.accounts.unshift(account);
  else state.accounts[index] = account;
  return account;
}

export function upsertAccountSettingsForIdentityInState(state, user = null, authProvider = 'guest', updates = {}) {
  const login = defaultLoginForAuthUser(user, authProvider);
  if (!login) throw new Error('identity login required');
  const existing = accountSettingsForIdentity(state, user, authProvider);
  const canonicalLogin = normalizeString(existing?.login || login).toLowerCase();
  return upsertAccountSettingsInState(state, canonicalLogin, user ? { ...user, login: canonicalLogin } : { login: canonicalLogin }, authProvider, updates);
}

export function linkIdentityToAccountInState(state, targetLogin, user = null, authProvider = 'guest') {
  const safeTargetLogin = normalizeString(targetLogin).toLowerCase();
  if (!safeTargetLogin) throw new Error('target login required');
  let targetIndex = findAccountIndexByLogin(state, safeTargetLogin);
  if (targetIndex === -1) {
    upsertAccountSettingsInState(state, safeTargetLogin, { login: safeTargetLogin }, 'guest', {});
    targetIndex = findAccountIndexByLogin(state, safeTargetLogin);
  }
  if (targetIndex === -1) throw new Error('target account not found');
  const linkedIndex = findAccountIndexByIdentity(state, user, authProvider);
  if (linkedIndex !== -1 && linkedIndex !== targetIndex) {
    return {
      ok: false,
      reason: 'identity_already_linked',
      account: accountSettingsForLogin(state, safeTargetLogin),
      linkedAccount: structuredClone(state.accounts[linkedIndex] || null)
    };
  }
  const account = upsertAccountSettingsInState(state, safeTargetLogin, user || { login: safeTargetLogin }, authProvider, {});
  if (user && authProvider && authProvider !== 'guest') {
    const identity = normalizeLinkedIdentityRecord({
      ...user,
      provider: authProvider,
      providerUserId: user?.providerUserId || user?.sub || user?.id
    });
    account.linkedIdentities = normalizeLinkedIdentities([
      identity,
      ...(account.linkedIdentities || [])
    ]);
    account.aliases = mergeAliases(account.aliases, [safeTargetLogin], [identity.login]);
    const accountIndex = findAccountIndexByLogin(state, safeTargetLogin);
    if (accountIndex !== -1) state.accounts[accountIndex] = account;
  }
  return {
    ok: true,
    account
  };
}

function pickPreferredString(primary = '', secondary = '') {
  const first = normalizeString(primary);
  if (first) return first;
  return normalizeString(secondary);
}

function concatUniqueRecords(list = [], keyFn = (item) => JSON.stringify(item || {})) {
  const next = [];
  const seen = new Set();
  for (const item of Array.isArray(list) ? list : []) {
    const key = normalizeString(keyFn(item));
    if (!key || seen.has(key)) continue;
    seen.add(key);
    next.push(item);
  }
  return next;
}

function mergeStripeAccountState(source = {}, target = {}) {
  const processedIds = concatUniqueRecords([
    ...(Array.isArray(target.processedTopupCheckoutSessionIds) ? target.processedTopupCheckoutSessionIds : []),
    ...(Array.isArray(source.processedTopupCheckoutSessionIds) ? source.processedTopupCheckoutSessionIds : [])
  ], (value) => String(value || ''));
  const topupHistory = concatUniqueRecords([
    ...(Array.isArray(target.topupHistory) ? target.topupHistory : []),
    ...(Array.isArray(source.topupHistory) ? source.topupHistory : [])
  ], (item) => String(item?.sessionId || item?.paymentIntentId || item?.id || ''));
  const providerMonthlyCharges = concatUniqueRecords([
    ...(Array.isArray(target.providerMonthlyCharges) ? target.providerMonthlyCharges : []),
    ...(Array.isArray(source.providerMonthlyCharges) ? source.providerMonthlyCharges : [])
  ], (item) => String(item?.paymentIntentId || item?.id || ''));
  return {
    ...source,
    ...target,
    customerStatus: pickPreferredString(target.customerStatus, source.customerStatus) || 'not_started',
    customerId: pickPreferredString(target.customerId, source.customerId) || null,
    defaultPaymentMethodStatus: pickPreferredString(target.defaultPaymentMethodStatus, source.defaultPaymentMethodStatus) || 'not_started',
    defaultPaymentMethodId: pickPreferredString(target.defaultPaymentMethodId, source.defaultPaymentMethodId) || null,
    defaultPaymentMethodBrand: pickPreferredString(target.defaultPaymentMethodBrand, source.defaultPaymentMethodBrand),
    defaultPaymentMethodLast4: pickPreferredString(target.defaultPaymentMethodLast4, source.defaultPaymentMethodLast4),
    setupCheckoutStatus: pickPreferredString(target.setupCheckoutStatus, source.setupCheckoutStatus) || 'not_started',
    setupCheckoutSessionId: pickPreferredString(target.setupCheckoutSessionId, source.setupCheckoutSessionId) || null,
    pendingTopupCheckoutSessionId: pickPreferredString(target.pendingTopupCheckoutSessionId, source.pendingTopupCheckoutSessionId) || null,
    processedTopupCheckoutSessionIds: processedIds,
    lastTopupCheckoutSessionId: pickPreferredString(target.lastTopupCheckoutSessionId, source.lastTopupCheckoutSessionId) || null,
    lastTopupAmount: normalizeMoney(Number(target.lastTopupAmount || 0) || Number(source.lastTopupAmount || 0), 0),
    lastTopupCurrency: pickPreferredString(target.lastTopupCurrency, source.lastTopupCurrency) || BILLING_DISPLAY_CURRENCY,
    lastTopupAt: pickPreferredString(target.lastTopupAt, source.lastTopupAt) || null,
    topupHistory,
    providerMonthlyCharges,
    lastProviderMonthlyChargeAt: pickPreferredString(target.lastProviderMonthlyChargeAt, source.lastProviderMonthlyChargeAt) || null,
    lastProviderMonthlyChargeAmount: normalizeMoney(Number(target.lastProviderMonthlyChargeAmount || 0) || Number(source.lastProviderMonthlyChargeAmount || 0), 0),
    lastProviderMonthlyChargePeriod: pickPreferredString(target.lastProviderMonthlyChargePeriod, source.lastProviderMonthlyChargePeriod) || null,
    lastProviderMonthlyChargeStatus: pickPreferredString(target.lastProviderMonthlyChargeStatus, source.lastProviderMonthlyChargeStatus) || 'not_started',
    providerMonthlyRetryPeriod: pickPreferredString(target.providerMonthlyRetryPeriod, source.providerMonthlyRetryPeriod) || null,
    providerMonthlyRetryCount: normalizePositiveInt(Number(target.providerMonthlyRetryCount || 0) || Number(source.providerMonthlyRetryCount || 0), 0),
    providerMonthlyLastAttemptAt: pickPreferredString(target.providerMonthlyLastAttemptAt, source.providerMonthlyLastAttemptAt) || null,
    providerMonthlyLastFailureAt: pickPreferredString(target.providerMonthlyLastFailureAt, source.providerMonthlyLastFailureAt) || null,
    providerMonthlyLastFailureMessage: pickPreferredString(target.providerMonthlyLastFailureMessage, source.providerMonthlyLastFailureMessage),
    providerMonthlyLastNotificationAt: pickPreferredString(target.providerMonthlyLastNotificationAt, source.providerMonthlyLastNotificationAt) || null,
    providerMonthlyLastNotificationPeriod: pickPreferredString(target.providerMonthlyLastNotificationPeriod, source.providerMonthlyLastNotificationPeriod) || null,
    subscriptionStatus: pickPreferredString(target.subscriptionStatus, source.subscriptionStatus) || 'not_started',
    subscriptionId: pickPreferredString(target.subscriptionId, source.subscriptionId) || null,
    subscriptionPriceId: pickPreferredString(target.subscriptionPriceId, source.subscriptionPriceId) || null,
    subscriptionPlan: pickPreferredString(target.subscriptionPlan, source.subscriptionPlan) || 'none',
    subscriptionCurrentPeriodEnd: pickPreferredString(target.subscriptionCurrentPeriodEnd, source.subscriptionCurrentPeriodEnd) || null,
    lastSubscriptionFundingPeriodEnd: pickPreferredString(target.lastSubscriptionFundingPeriodEnd, source.lastSubscriptionFundingPeriodEnd) || null,
    lastSubscriptionFundingAmount: normalizeMoney(Number(target.lastSubscriptionFundingAmount || 0) || Number(source.lastSubscriptionFundingAmount || 0), 0),
    lastSubscriptionFundingAt: pickPreferredString(target.lastSubscriptionFundingAt, source.lastSubscriptionFundingAt) || null,
    connectedAccountStatus: pickPreferredString(target.connectedAccountStatus, source.connectedAccountStatus) || 'not_started',
    connectedAccountId: pickPreferredString(target.connectedAccountId, source.connectedAccountId) || null,
    connectOnboardingStatus: pickPreferredString(target.connectOnboardingStatus, source.connectOnboardingStatus) || 'not_started',
    chargesEnabled: normalizeBoolean(target.chargesEnabled ?? source.chargesEnabled, false),
    payoutsEnabled: normalizeBoolean(target.payoutsEnabled ?? source.payoutsEnabled, false),
    lastSyncAt: pickPreferredString(target.lastSyncAt, source.lastSyncAt) || null,
    mode: pickPreferredString(target.mode, source.mode) || 'not_connected'
  };
}

export function mergeAccountsInState(state, sourceLogin, targetLogin) {
  const safeSourceLogin = normalizeString(sourceLogin).toLowerCase();
  const safeTargetLogin = normalizeString(targetLogin).toLowerCase();
  if (!safeSourceLogin || !safeTargetLogin) throw new Error('source and target login required');
  if (safeSourceLogin === safeTargetLogin) {
    return { account: accountSettingsForLogin(state, safeTargetLogin), merged: false };
  }
  const sourceIndex = findAccountIndexByLogin(state, safeSourceLogin);
  const targetIndex = findAccountIndexByLogin(state, safeTargetLogin);
  if (sourceIndex === -1) return { account: accountSettingsForLogin(state, safeTargetLogin), merged: false };
  if (targetIndex === -1) throw new Error('target account not found');
  const source = accountSettingsForLogin(state, safeSourceLogin);
  const target = accountSettingsForLogin(state, safeTargetLogin);
  const sourcePayoutRuns = Array.isArray(source?.payout?.payoutRuns) ? source.payout.payoutRuns : [];
  const targetPayoutRuns = Array.isArray(target?.payout?.payoutRuns) ? target.payout.payoutRuns : [];
  const sourceSignupCredits = normalizeMoney(source?.billing?.welcomeCreditsSignupGrantedTotal, 0);
  const targetSignupCredits = normalizeMoney(target?.billing?.welcomeCreditsSignupGrantedTotal, 0);
  const sourceAgentCredits = normalizeMoney(source?.billing?.welcomeCreditsAgentGrantedTotal, 0);
  const targetAgentCredits = normalizeMoney(target?.billing?.welcomeCreditsAgentGrantedTotal, 0);
  const duplicateSignupCredits = sourceSignupCredits > 0 && targetSignupCredits > 0 ? Math.min(sourceSignupCredits, targetSignupCredits) : 0;
  const duplicateAgentCredits = sourceAgentCredits > 0 && targetAgentCredits > 0 ? Math.min(sourceAgentCredits, targetAgentCredits) : 0;
  const duplicateWelcomeCredits = normalizeMoney(duplicateSignupCredits + duplicateAgentCredits, 0);
  const mergedWelcomeCreditsBalance = normalizeMoney(Math.max(
    0,
    Number(target?.billing?.welcomeCreditsBalance || 0) + Number(source?.billing?.welcomeCreditsBalance || 0) - duplicateWelcomeCredits
  ), 0);
  const merged = upsertAccountSettingsInState(state, safeTargetLogin, { login: safeTargetLogin }, target.authProvider || source.authProvider || 'guest', {
    aliases: mergeAliases(target.aliases, source.aliases, [safeTargetLogin, safeSourceLogin]),
    linkedIdentities: normalizeLinkedIdentities([...(target.linkedIdentities || []), ...(source.linkedIdentities || [])]),
    profile: {
      displayName: pickPreferredString(target?.profile?.displayName, source?.profile?.displayName) || safeTargetLogin,
      legalName: pickPreferredString(target?.profile?.legalName, source?.profile?.legalName),
      companyName: pickPreferredString(target?.profile?.companyName, source?.profile?.companyName),
      country: pickPreferredString(target?.profile?.country, source?.profile?.country) || 'JP',
      defaultCurrency: BILLING_DISPLAY_CURRENCY,
      avatarUrl: pickPreferredString(target?.profile?.avatarUrl, source?.profile?.avatarUrl),
      profileUrl: pickPreferredString(target?.profile?.profileUrl, source?.profile?.profileUrl)
    },
    billing: {
      ...source.billing,
      ...target.billing,
      mode: pickPreferredString(target?.billing?.mode, source?.billing?.mode) || 'monthly_invoice',
      legalName: pickPreferredString(target?.billing?.legalName, source?.billing?.legalName),
      companyName: pickPreferredString(target?.billing?.companyName, source?.billing?.companyName),
      billingEmail: pickPreferredString(target?.billing?.billingEmail, source?.billing?.billingEmail),
      country: pickPreferredString(target?.billing?.country, source?.billing?.country) || 'JP',
      currency: BILLING_DISPLAY_CURRENCY,
      taxId: pickPreferredString(target?.billing?.taxId, source?.billing?.taxId),
      purchaseOrderRef: pickPreferredString(target?.billing?.purchaseOrderRef, source?.billing?.purchaseOrderRef),
      invoiceMemo: pickPreferredString(target?.billing?.invoiceMemo, source?.billing?.invoiceMemo),
      dueDays: normalizePositiveInt(target?.billing?.dueDays ?? source?.billing?.dueDays, 14),
      welcomeCreditsBalance: mergedWelcomeCreditsBalance,
      welcomeCreditsReserved: normalizeMoney(Number(target?.billing?.welcomeCreditsReserved || 0) + Number(source?.billing?.welcomeCreditsReserved || 0), 0),
      welcomeCreditsGrantedTotal: normalizeMoney(Math.max(0, Number(target?.billing?.welcomeCreditsGrantedTotal || 0) + Number(source?.billing?.welcomeCreditsGrantedTotal || 0) - duplicateWelcomeCredits), 0),
      welcomeCreditsSignupGrantedTotal: Math.max(targetSignupCredits, sourceSignupCredits),
      welcomeCreditsSignupGrantedAt: pickPreferredString(target?.billing?.welcomeCreditsSignupGrantedAt, source?.billing?.welcomeCreditsSignupGrantedAt),
      signupWelcomeEmailAttemptedAt: pickPreferredString(target?.billing?.signupWelcomeEmailAttemptedAt, source?.billing?.signupWelcomeEmailAttemptedAt),
      welcomeCreditsAgentGrantedTotal: Math.max(targetAgentCredits, sourceAgentCredits),
      welcomeCreditsAgentGrantedAt: pickPreferredString(target?.billing?.welcomeCreditsAgentGrantedAt, source?.billing?.welcomeCreditsAgentGrantedAt),
      welcomeCreditsAgentGrantAgentId: pickPreferredString(target?.billing?.welcomeCreditsAgentGrantAgentId, source?.billing?.welcomeCreditsAgentGrantAgentId),
      welcomeCreditsConsumedTotal: normalizeMoney(Number(target?.billing?.welcomeCreditsConsumedTotal || 0) + Number(source?.billing?.welcomeCreditsConsumedTotal || 0), 0),
      welcomeCreditsGrantedAt: pickPreferredString(target?.billing?.welcomeCreditsGrantedAt, source?.billing?.welcomeCreditsGrantedAt),
      welcomeCreditsGrantAgentId: pickPreferredString(target?.billing?.welcomeCreditsGrantAgentId, source?.billing?.welcomeCreditsGrantAgentId),
      depositBalance: normalizeMoney(Number(target?.billing?.depositBalance || 0) + Number(source?.billing?.depositBalance || 0), 0),
      depositReserved: normalizeMoney(Number(target?.billing?.depositReserved || 0) + Number(source?.billing?.depositReserved || 0), 0),
      autoTopupEnabled: normalizeBoolean(target?.billing?.autoTopupEnabled ?? source?.billing?.autoTopupEnabled, false),
      autoTopupThreshold: normalizeMoney(Number(target?.billing?.autoTopupThreshold || 0) || Number(source?.billing?.autoTopupThreshold || 0), 0),
      autoTopupAmount: normalizeMoney(Number(target?.billing?.autoTopupAmount || 0) || Number(source?.billing?.autoTopupAmount || 0), 0),
      autoTopupPeriod: pickPreferredString(target?.billing?.autoTopupPeriod, source?.billing?.autoTopupPeriod) || billingPeriodId(),
      autoTopupCount: normalizePositiveInt(Number(target?.billing?.autoTopupCount || 0) + Number(source?.billing?.autoTopupCount || 0), 0),
      autoTopupLastAt: pickPreferredString(target?.billing?.autoTopupLastAt, source?.billing?.autoTopupLastAt),
      subscriptionPlan: pickPreferredString(target?.billing?.subscriptionPlan, source?.billing?.subscriptionPlan) || 'none',
      subscriptionIncludedCredits: normalizeMoney(Number(target?.billing?.subscriptionIncludedCredits || 0) + Number(source?.billing?.subscriptionIncludedCredits || 0), 0),
      subscriptionCreditsPeriod: pickPreferredString(target?.billing?.subscriptionCreditsPeriod, source?.billing?.subscriptionCreditsPeriod) || billingPeriodId(),
      subscriptionCreditsUsed: normalizeMoney(Number(target?.billing?.subscriptionCreditsUsed || 0) + Number(source?.billing?.subscriptionCreditsUsed || 0), 0),
      subscriptionCreditsReserved: normalizeMoney(Number(target?.billing?.subscriptionCreditsReserved || 0) + Number(source?.billing?.subscriptionCreditsReserved || 0), 0),
      subscriptionOverageMode: normalizeActiveSubscriptionOverageMode(
        pickPreferredString(target?.billing?.subscriptionOverageMode, source?.billing?.subscriptionOverageMode),
        'monthly_invoice'
      ),
      arrearsTotal: normalizeMoney(Number(target?.billing?.arrearsTotal || 0) + Number(source?.billing?.arrearsTotal || 0), 0)
    },
    payout: {
      ...source.payout,
      ...target.payout,
      providerEnabled: normalizeBoolean(target?.payout?.providerEnabled ?? source?.payout?.providerEnabled, false),
      entityType: pickPreferredString(target?.payout?.entityType, source?.payout?.entityType) || 'individual',
      legalName: pickPreferredString(target?.payout?.legalName, source?.payout?.legalName),
      displayName: pickPreferredString(target?.payout?.displayName, source?.payout?.displayName) || safeTargetLogin,
      payoutEmail: pickPreferredString(target?.payout?.payoutEmail, source?.payout?.payoutEmail),
      country: pickPreferredString(target?.payout?.country, source?.payout?.country) || 'JP',
      currency: BILLING_DISPLAY_CURRENCY,
      website: pickPreferredString(target?.payout?.website, source?.payout?.website),
      supportEmail: pickPreferredString(target?.payout?.supportEmail, source?.payout?.supportEmail),
      statementDescriptor: pickPreferredString(target?.payout?.statementDescriptor, source?.payout?.statementDescriptor),
      transferSchedule: pickPreferredString(target?.payout?.transferSchedule, source?.payout?.transferSchedule) || 'monthly',
      minimumPayoutAmount: normalizeMinimumPayoutAmount(Number(target?.payout?.minimumPayoutAmount || 0) || Number(source?.payout?.minimumPayoutAmount || 0)),
      pendingBalance: normalizeMoney(Number(target?.payout?.pendingBalance || 0) + Number(source?.payout?.pendingBalance || 0), 0),
      paidOutTotal: normalizeMoney(Number(target?.payout?.paidOutTotal || 0) + Number(source?.payout?.paidOutTotal || 0), 0),
      lastPayoutAt: pickPreferredString(target?.payout?.lastPayoutAt, source?.payout?.lastPayoutAt),
      lastPayoutAmount: normalizeMoney(Number(target?.payout?.lastPayoutAmount || 0) || Number(source?.payout?.lastPayoutAmount || 0), 0),
      lastPayoutTransferId: pickPreferredString(target?.payout?.lastPayoutTransferId, source?.payout?.lastPayoutTransferId),
      payoutRuns: concatUniqueRecords([...targetPayoutRuns, ...sourcePayoutRuns], (item) => String(item?.id || item?.transferId || item?.createdAt || '')),
      onboardingStatus: pickPreferredString(target?.payout?.onboardingStatus, source?.payout?.onboardingStatus) || 'not_started',
      externalAccountStatus: pickPreferredString(target?.payout?.externalAccountStatus, source?.payout?.externalAccountStatus) || 'not_started',
      destinationSummary: pickPreferredString(target?.payout?.destinationSummary, source?.payout?.destinationSummary) || 'Stripe onboarding not started',
      notes: pickPreferredString(target?.payout?.notes, source?.payout?.notes)
    },
    stripe: mergeStripeAccountState(source?.stripe || {}, target?.stripe || {}),
    chatMemory: normalizeChatMemoryPatch({
      hiddenTranscriptIds: concatUniqueRecords([
        ...(target?.chatMemory?.hiddenTranscriptIds || target?.chatMemory?.hiddenIds || []),
        ...(source?.chatMemory?.hiddenTranscriptIds || source?.chatMemory?.hiddenIds || [])
      ], (item) => String(item || ''))
    }),
    connectors: normalizeConnectorsPatch(source?.connectors || {}, target?.connectors || {}),
    apiAccess: {
      orderKeys: concatUniqueRecords([...(target?.apiAccess?.orderKeys || []), ...(source?.apiAccess?.orderKeys || [])], (item) => String(item?.id || item?.keyHash || ''))
    },
    githubAppAccess: normalizeGithubAppAccessPatch({
      installations: concatUniqueRecords([...(target?.githubAppAccess?.installations || []), ...(source?.githubAppAccess?.installations || [])], (item) => String(item?.id || '')),
      repos: concatUniqueRecords([...(target?.githubAppAccess?.repos || []), ...(source?.githubAppAccess?.repos || [])], (item) => `${item?.installationId || ''}:${item?.fullName || ''}`),
      updatedAt: pickPreferredString(target?.githubAppAccess?.updatedAt, source?.githubAppAccess?.updatedAt)
    })
  });
  state.accounts = (Array.isArray(state.accounts) ? state.accounts : []).filter((account) => normalizeString(account?.login).toLowerCase() !== safeSourceLogin);
  for (const agent of Array.isArray(state.agents) ? state.agents : []) {
    if (normalizeString(agent?.owner).toLowerCase() === safeSourceLogin) {
      agent.owner = safeTargetLogin;
      agent.updatedAt = nowIso();
    }
  }
  for (const job of Array.isArray(state.jobs) ? state.jobs : []) {
    const requester = job?.input?._broker?.requester;
    if (requester && normalizeString(requester.login).toLowerCase() === safeSourceLogin) {
      requester.login = safeTargetLogin;
      requester.accountId = accountIdForLogin(safeTargetLogin);
    }
  }
  for (const report of Array.isArray(state.feedbackReports) ? state.feedbackReports : []) {
    if (normalizeString(report?.reporterLogin).toLowerCase() === safeSourceLogin) report.reporterLogin = safeTargetLogin;
    if (normalizeString(report?.reviewedBy).toLowerCase() === safeSourceLogin) report.reviewedBy = safeTargetLogin;
  }
  return { account: merged, merged: true, sourceLogin: safeSourceLogin, targetLogin: safeTargetLogin };
}

export function orderApiKeysForAccount(account = null) {
  return (account?.apiAccess?.orderKeys || []).map(sanitizeOrderApiKeyRecord);
}

function sanitizePayoutSettingsForClient(payout = {}) {
  const safe = payout && typeof payout === 'object' ? structuredClone(payout) : {};
  const identity = safe.identityVerification && typeof safe.identityVerification === 'object'
    ? safe.identityVerification
    : null;
  if (identity?.photo && typeof identity.photo === 'object') {
    delete identity.photo.dataUrl;
  }
  return safe;
}

export function sanitizeAccountSettingsForClient(account = null) {
  if (!account) return null;
  const stripe = { ...(account.stripe || {}) };
  const accountWithoutLegacyPayment = Object.fromEntries(
    Object.entries(account).filter(([key]) => key.toLowerCase() !== 'pay' + 'jp')
  );
  delete stripe.pendingTopupCheckoutSessionId;
  delete stripe.processedTopupCheckoutSessionIds;
  delete stripe.topupHistory;
  delete stripe.providerMonthlyCharges;
  return {
    ...accountWithoutLegacyPayment,
    profile: {
      ...(account.profile || {}),
      uiLanguage: normalizeUiLanguage((account.profile || {}).uiLanguage ?? (account.profile || {}).language, 'en')
    },
    payout: sanitizePayoutSettingsForClient(account.payout || {}),
    stripe,
    apiAccess: {
      orderKeys: orderApiKeysForAccount(account)
    },
    githubAppAccess: normalizeGithubAppAccessPatch(account.githubAppAccess || {}),
    chatMemory: {
      hiddenCount: normalizeChatMemoryPatch(account.chatMemory || {}).hiddenTranscriptIds.length
    },
    connectors: sanitizeConnectorsForClient(account.connectors || {})
  };
}

export function hideChatMemoryTranscriptForLoginInState(state, login, transcriptId, user = null, authProvider = 'guest', options = {}) {
  return hideChatMemoryTranscriptForLoginInStateWithDeps(state, login, transcriptId, user, authProvider, options, {
    accountSettingsForLogin,
    upsertAccountSettingsInState
  });
}

export function createOrderApiKeyInState(state, login, user = null, authProvider = 'guest', options = {}) {
  const label = requireApiKeyIssueLabel(options.label);
  const account = upsertAccountSettingsInState(state, login, user, authProvider, {});
  const now = nowIso();
  const mode = normalizeApiKeyMode(options.mode, 'live');
  const tokenPrefix = mode === 'test' ? 'ai2kt_' : 'ai2k_';
  const token = `${tokenPrefix}${randomUUID().replace(/-/g, '')}${randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const record = normalizeOrderApiKeyRecord({
    id: `key_${randomUUID()}`,
    label,
    mode,
    prefix: token.slice(0, 16),
    keyHash: hashSecret(token),
    scopes: CAIT_API_KEY_SCOPES,
    createdAt: now,
    lastUsedAt: '',
    lastUsedPath: '',
    lastUsedMethod: '',
    revokedAt: ''
  });
  const nextKeys = [record, ...(account.apiAccess?.orderKeys || []).map(normalizeOrderApiKeyRecord)];
  account.apiAccess = normalizeApiAccessPatch({ orderKeys: nextKeys }, account.apiAccess || {});
  account.updatedAt = now;
  const index = findAccountIndexByLogin(state, login);
  if (index === -1) state.accounts.unshift(account);
  else state.accounts[index] = account;
  return {
    account,
    apiKey: {
      ...sanitizeOrderApiKeyRecord(record),
      token
    }
  };
}

export function revokeOrderApiKeyInState(state, login, keyId, user = null, authProvider = 'guest') {
  const safeLogin = normalizeString(login);
  const account = accountSettingsForLogin(state, safeLogin, user ? { ...user, login: safeLogin } : { login: safeLogin }, authProvider);
  const nextKeys = (account.apiAccess?.orderKeys || []).map((record) => {
    const normalized = normalizeOrderApiKeyRecord(record);
    if (normalized.id !== keyId) return normalized;
    return {
      ...normalized,
      revokedAt: normalized.revokedAt || nowIso()
    };
  });
  const target = nextKeys.find((record) => record.id === keyId) || null;
  if (!target) return null;
  account.apiAccess = normalizeApiAccessPatch({ orderKeys: nextKeys }, account.apiAccess || {});
  account.updatedAt = nowIso();
  const index = findAccountIndexByLogin(state, safeLogin);
  if (index === -1) state.accounts.unshift(account);
  else state.accounts[index] = account;
  return {
    account,
    apiKey: sanitizeOrderApiKeyRecord(target)
  };
}

export function authenticateOrderApiKey(state, rawKey = '') {
  const token = normalizeString(rawKey);
  if (!token) return null;
  const keyHash = hashSecret(token);
  for (const account of Array.isArray(state?.accounts) ? state.accounts : []) {
    if (account?.deletedAt || account?.deleted_at) continue;
    for (const record of account?.apiAccess?.orderKeys || []) {
      const normalized = normalizeOrderApiKeyRecord(record);
      if (normalized.revokedAt) continue;
      if (normalized.keyHash && normalized.keyHash === keyHash) {
        return {
          account,
          apiKey: sanitizeOrderApiKeyRecord(normalized),
          keyKind: 'cait'
        };
      }
    }
  }
  return null;
}

export function touchOrderApiKeyUsageInState(state, login, keyId, meta = {}) {
  const safeLogin = normalizeString(login);
  const index = findAccountIndexByLogin(state, safeLogin);
  if (index === -1) return null;
  const account = state.accounts[index];
  let matched = null;
  const currentApiAccess = account?.apiAccess && typeof account.apiAccess === 'object' ? account.apiAccess : {};
  const nextKeys = (currentApiAccess.orderKeys || []).map((record) => {
    const normalized = normalizeOrderApiKeyRecord(record);
    if (normalized.id !== keyId || normalized.revokedAt) return normalized;
    const keyHash = normalized.keyHash || normalizeString(record?.keyHash || record?.key_hash);
    matched = {
      ...normalized,
      keyHash,
      lastUsedAt: nowIso(),
      lastUsedPath: normalizeString(meta.lastUsedPath),
      lastUsedMethod: normalizeString(meta.lastUsedMethod).toUpperCase()
    };
    return matched;
  });
  if (!matched) return null;
  account.apiAccess = normalizeApiAccessPatch({ orderKeys: nextKeys }, currentApiAccess);
  account.updatedAt = nowIso();
  state.accounts[index] = account;
  return {
    account,
    apiKey: sanitizeOrderApiKeyRecord(matched)
  };
}

export function requesterContextFromUser(user = null, authProvider = 'guest', options = {}) {
  const login = normalizeString(options?.login || user?.login);
  const accountId = normalizeString(options?.accountId || user?.accountId || accountIdForLogin(login));
  return {
    login,
    name: normalizeString(user?.name || login),
    accountId,
    authProvider: normalizeString(authProvider, 'guest')
  };
}

export function requesterContextFromJob(job) {
  const broker = job?.input?._broker && typeof job.input._broker === 'object' ? job.input._broker : {};
  const requester = broker.requester && typeof broker.requester === 'object' ? broker.requester : {};
  return {
    login: normalizeString(requester.login),
    accountId: normalizeString(requester.accountId),
    authProvider: normalizeString(requester.authProvider)
  };
}

const ACCOUNT_RECOVERY_RESERVED_LOGINS = new Set(['aiagent2', 'system', 'cait-samples', 'sample-agent', 'samurai']);

function accountRecoveryCandidate(map, login = '', authProvider = 'recovered', profile = {}) {
  const safeLogin = normalizeString(login).toLowerCase();
  if (!safeLogin || ACCOUNT_RECOVERY_RESERVED_LOGINS.has(safeLogin)) return;
  const existing = map.get(safeLogin) || {};
  const nextProvider = normalizeString(existing.authProvider || '', '') || normalizeString(authProvider || '', 'recovered');
  map.set(safeLogin, {
    login: safeLogin,
    authProvider: nextProvider || 'recovered',
    name: normalizeString(profile.name || existing.name || safeLogin),
    email: normalizeEmail(profile.email || existing.email || (safeLogin.includes('@') ? safeLogin : ''))
  });
}

export function recoverMissingAccountsInState(state = {}) {
  if (!Array.isArray(state.accounts)) state.accounts = [];
  const candidates = new Map();

  for (const event of Array.isArray(state?.events) ? state.events : []) {
    const meta = event?.meta && typeof event.meta === 'object' ? event.meta : {};
    if (String(event?.type || '').toUpperCase() !== 'TRACK' || meta.kind !== 'conversion') continue;
    accountRecoveryCandidate(candidates, meta.login, meta.authProvider || 'recovered', {
      email: meta.login,
      name: meta.login
    });
  }

  for (const job of Array.isArray(state?.jobs) ? state.jobs : []) {
    const requester = requesterContextFromJob(job);
    accountRecoveryCandidate(candidates, requester.login, requester.authProvider || 'recovered', {
      email: requester.login,
      name: requester.login
    });
  }

  for (const order of Array.isArray(state?.recurringOrders) ? state.recurringOrders : []) {
    accountRecoveryCandidate(candidates, order?.ownerLogin || order?.owner_login, 'recovered', {
      email: order?.ownerLogin || order?.owner_login,
      name: order?.ownerLogin || order?.owner_login
    });
  }

  for (const delivery of Array.isArray(state?.emailDeliveries) ? state.emailDeliveries : []) {
    accountRecoveryCandidate(candidates, delivery?.accountLogin || delivery?.account_login, 'email', {
      email: delivery?.accountLogin || delivery?.account_login,
      name: delivery?.accountLogin || delivery?.account_login
    });
  }

  for (const report of Array.isArray(state?.feedbackReports) ? state.feedbackReports : []) {
    accountRecoveryCandidate(candidates, report?.reporterLogin || report?.reporter_login, 'recovered', {
      email: report?.reporterLogin || report?.reporter_login,
      name: report?.reporterLogin || report?.reporter_login
    });
  }

  for (const agent of Array.isArray(state?.agents) ? state.agents : []) {
    accountRecoveryCandidate(candidates, agent?.owner, 'recovered', {
      email: agent?.owner,
      name: agent?.owner
    });
  }

  const recovered = [];
  for (const candidate of candidates.values()) {
    if (findAccountIndexByLogin(state, candidate.login) !== -1) continue;
    const user = {
      login: candidate.login,
      email: candidate.email || (candidate.login.includes('@') ? candidate.login : ''),
      name: candidate.name || candidate.login
    };
    upsertAccountSettingsInState(state, candidate.login, user, candidate.authProvider || 'recovered', {});
    recovered.push(candidate.login);
  }
  return {
    recovered: recovered.length,
    logins: recovered
  };
}

export function billingModeFromJob(job) {
  const broker = job?.input?._broker && typeof job.input._broker === 'object' ? job.input._broker : {};
  if (normalizeString(broker.billingMode).toLowerCase() === 'test') return 'test';
  return normalizeBillingMode(broker.billingMode, 'monthly_invoice');
}

export function chatSessionIdForJob(job = {}) {
  const input = job?.input && typeof job.input === 'object' ? job.input : {};
  const broker = input?._broker && typeof input._broker === 'object' ? input._broker : {};
  const workflow = broker.workflow && typeof broker.workflow === 'object' ? broker.workflow : {};
  return normalizeString(
    job?.sessionId
    || job?.session_id
    || broker.chatSessionId
    || workflow.chatSessionId
    || input.session_id
    || input.sessionId
  ).slice(0, 160);
}

export function isBillableJob(job) {
  return billingModeFromJob(job) !== 'test';
}

function normalizeLoginKey(value = '') {
  return normalizeString(value).toLowerCase();
}

function visibleLoginKeysForAccount(login = '', account = null) {
  return [...new Set([
    normalizeLoginKey(login),
    ...aliasLoginsForAccount(account).map((item) => normalizeLoginKey(item))
  ].filter(Boolean))];
}

export function isAgentOwnedByLogin(agent, login = '') {
  const safeLogin = normalizeLoginKey(login);
  if (!safeLogin) return false;
  return normalizeLoginKey(agent?.owner) === safeLogin;
}

export function isJobVisibleToLogin(job, agents = [], login = '', account = null) {
  const visibleLogins = visibleLoginKeysForAccount(login, account);
  if (!visibleLogins.length) return false;
  const requester = requesterContextFromJob(job);
  const requesterLogin = normalizeLoginKey(requester.login);
  if (requesterLogin && visibleLogins.includes(requesterLogin)) return true;
  const requesterAccountId = normalizeString(requester.accountId);
  if (requesterAccountId && visibleLogins.some((item) => requesterAccountId === accountIdForLogin(item))) return true;
  const assignedAgent = Array.isArray(agents) ? agents.find((agent) => agent.id === job?.assignedAgentId) : null;
  return visibleLogins.some((item) => isAgentOwnedByLogin(assignedAgent, item));
}

export function jobsVisibleToLogin(state, login = '', options = {}) {
  const jobs = Array.isArray(state?.jobs) ? state.jobs : [];
  const agents = Array.isArray(state?.agents) ? state.agents : [];
  const safeLogin = normalizeLoginKey(login);
  if (!safeLogin) return options.allowGuest === true ? [...jobs] : [];
  return jobs.filter((job) => isJobVisibleToLogin(job, agents, safeLogin, options.account || null));
}

export function billingAuditsForJobIds(events = [], jobIds = []) {
  const allowed = jobIds instanceof Set ? jobIds : new Set(jobIds);
  if (!allowed.size) return [];
  return (Array.isArray(events) ? events : [])
    .filter((event) => event?.type === 'BILLING_AUDIT' && event?.meta?.kind === 'billing_audit' && allowed.has(event.meta.jobId))
    .map((event) => event.meta);
}

function withAccountPersisted(state, account) {
  if (!Array.isArray(state.accounts)) state.accounts = [];
  const index = findAccountIndexByLogin(state, account?.login);
  if (index === -1) state.accounts.unshift(account);
  else state.accounts[index] = account;
  return account;
}

function effectiveBillingMode(account = null, apiKeyMode = '') {
  if (normalizeString(apiKeyMode).toLowerCase() === 'test') return 'test';
  const mode = normalizeBillingMode(account?.billing?.mode, 'monthly_invoice');
  if (mode === 'subscription' && subscriptionStatusAllowsCredits(account?.stripe?.subscriptionStatus)) return 'subscription';
  return 'monthly_invoice';
}

function hasSavedStripePaymentMethod(account = null) {
  return Boolean(
    normalizeString(account?.stripe?.defaultPaymentMethodId)
    || normalizeStatus(account?.stripe?.defaultPaymentMethodStatus, '') === 'ready'
  );
}

function subscriptionStatusAllowsCredits(status = '') {
  const safe = normalizeStatus(status, 'not_started');
  return safe === 'active' || safe === 'trialing';
}

function subscriptionPlanForFunding(account = null, billing = {}) {
  if (!subscriptionStatusAllowsCredits(account?.stripe?.subscriptionStatus)) return 'none';
  return normalizeSubscriptionPlan(account?.stripe?.subscriptionPlan || billing?.subscriptionPlan, 'none');
}

function subscriptionIncludedCreditsForFunding(account = null, billing = {}) {
  const activePlan = subscriptionPlanForFunding(account, billing);
  if (activePlan === 'none') return 0;
  const configuredPlan = normalizeSubscriptionPlan(billing?.subscriptionPlan, 'none');
  if (activePlan === configuredPlan) return normalizeMoney(billing?.subscriptionIncludedCredits, 0);
  return subscriptionIncludedCreditsForPlan(activePlan);
}

function availableSubscriptionCredits(billing = {}) {
  return Math.max(0, normalizeMoney(billing.subscriptionIncludedCredits, 0) - normalizeMoney(billing.subscriptionCreditsUsed, 0) - normalizeMoney(billing.subscriptionCreditsReserved, 0));
}

function availableDepositBalance(billing = {}) {
  return Math.max(0, normalizeMoney(billing.depositBalance, 0) - normalizeMoney(billing.depositReserved, 0));
}

function availableWelcomeCreditsBalance(billing = {}) {
  return Math.max(0, normalizeMoney(billing.welcomeCreditsBalance, 0) - normalizeMoney(billing.welcomeCreditsReserved, 0));
}

function totalFundingBalance(billing = {}) {
  return normalizeMoney(availableWelcomeCreditsBalance(billing), 0);
}

function manifestJobEndpointForAgent(agent = {}) {
  const manifest = agent?.metadata?.manifest && typeof agent.metadata.manifest === 'object' ? agent.metadata.manifest : {};
  const manifestMetadata = manifest.metadata && typeof manifest.metadata === 'object' ? manifest.metadata : {};
  const endpoints = manifest.endpoints && typeof manifest.endpoints === 'object' ? manifest.endpoints : {};
  const candidates = [
    manifest.jobEndpoint,
    manifest.job_endpoint,
    manifest.jobsUrl,
    manifest.jobs_url,
    manifestMetadata.jobEndpoint,
    manifestMetadata.job_endpoint,
    endpoints.jobs,
    endpoints.job,
    endpoints.dispatch,
    endpoints.submit
  ];
  for (const candidate of candidates) {
    const value = normalizeString(candidate);
    if (value) return value;
  }
  return '';
}

function placeholderLikeAgentText(value = '') {
  const text = String(value || '').trim();
  return /\b(sample|example|placeholder|demo|lorem ipsum)\b/i.test(text) || /^(test|tmp|temp)$/i.test(text);
}

export function reviewVerifiedAgentForWelcomeCredits(agent = {}) {
  const manifest = agent?.metadata?.manifest && typeof agent.metadata.manifest === 'object' ? agent.metadata.manifest : {};
  const name = normalizeString(manifest.name || agent?.name);
  const description = normalizeString(manifest.description || agent?.description);
  const taskTypes = normalizeTaskTypes(manifest.taskTypes || manifest.task_types || agent?.taskTypes || []);
  const healthcheckUrl = normalizeString(manifest.healthcheckUrl || manifest.healthcheck_url);
  const jobEndpoint = manifestJobEndpointForAgent(agent);
  const review = {
    eligible: false,
    code: 'unknown',
    reason: '',
    amount: WELCOME_CREDITS_GRANT_AMOUNT,
    details: {
      name,
      descriptionLength: description.length,
      taskTypes,
      healthcheckUrl,
      jobEndpoint
    }
  };
  const combinedText = `${name} ${description}`.trim();
  const sampleAgent = isManagedSampleAgent(agent);
  if (sampleAgent) {
    review.code = 'sample_agent';
    review.reason = 'Managed sample agents do not qualify for welcome credits.';
    return review;
  }
  if (normalizeStatus(agent?.verificationStatus, 'unknown') !== 'verified') {
    review.code = 'not_verified';
    review.reason = 'Only verified agents qualify for welcome credits.';
    return review;
  }
  const issues = [];
  if (!name || name.length < 4) issues.push('Add a clearer agent name.');
  if (!description || description.length < 48) issues.push('Add a more specific description with at least 48 characters.');
  if (placeholderLikeAgentText(combinedText) || /^custom registered agent\.?$/i.test(description)) {
    issues.push('Replace placeholder or demo text with a real agent description.');
  }
  if (!taskTypes.length) issues.push('Declare at least one task type.');
  if (!jobEndpoint) {
    issues.push('Expose a real job endpoint before claiming welcome credits.');
  } else {
    try {
      const parsed = new URL(jobEndpoint, 'https://example.test');
      if (isPrivateNetworkHostname(parsed.hostname)) issues.push('Use a public job endpoint instead of localhost/private network routing.');
    } catch {
      issues.push('Use a valid public job endpoint.');
    }
  }
  if (!healthcheckUrl) issues.push('Keep a public healthcheck configured.');
  if (issues.length) {
    review.code = 'thin_agent_profile';
    review.reason = issues.join(' ');
    return review;
  }
  review.eligible = true;
  review.code = 'eligible';
  review.reason = 'Verified provider agent qualifies for welcome credits.';
  return review;
}

function applyWelcomeCreditReviewToAgent(agent = {}, outcome = {}) {
  const metadata = agent?.metadata && typeof agent.metadata === 'object' ? agent.metadata : {};
  agent.metadata = {
    ...metadata,
    welcomeCredits: {
      amount: normalizeMoney(outcome.amount ?? WELCOME_CREDITS_GRANT_AMOUNT, 0),
      eligible: Boolean(outcome.eligible),
      status: normalizeString(outcome.status || (outcome.eligible ? 'granted' : 'rejected'), outcome.eligible ? 'granted' : 'rejected'),
      code: normalizeString(outcome.code || (outcome.eligible ? 'eligible' : 'rejected')),
      reason: normalizeString(outcome.reason),
      reviewedAt: normalizeString(outcome.reviewedAt, nowIso()),
      grantedAt: normalizeString(outcome.grantedAt),
      grantAgentId: normalizeString(outcome.grantAgentId || agent?.id)
    }
  };
}

export function maybeGrantWelcomeCreditsForSignupInState(state, login = '', user = null, authProvider = 'guest', amount = WELCOME_CREDITS_GRANT_AMOUNT) {
  const safeLogin = normalizeLoginKey(login || defaultLoginForAuthUser(user, authProvider));
  if (!safeLogin) {
    return { status: 'skipped', eligible: false, code: 'missing_login', reason: 'Login is required.', amount: 0, source: 'signup' };
  }
  const account = accountSettingsForLogin(state, safeLogin, user ? { ...user, login: safeLogin } : { login: safeLogin }, authProvider);
  account.billing = syncBillingRuntimeFields(account.billing || {}, billingPeriodId());
  const requestedAmount = normalizeMoney(amount, 0);
  if (!(requestedAmount > 0)) {
    return { status: 'skipped', eligible: false, code: 'disabled', reason: 'Signup welcome credits are disabled.', amount: 0, source: 'signup' };
  }
  const accountGrantedTotal = normalizeMoney(account.billing.welcomeCreditsGrantedTotal, 0);
  const remainingAllowance = normalizeMoney(Math.max(0, WELCOME_CREDITS_ACCOUNT_LIMIT - accountGrantedTotal), 0);
  if (!(remainingAllowance > 0)) {
    return {
      status: 'already_granted',
      eligible: false,
      code: 'account_limit_reached',
      reason: 'This account has already received the full welcome credit allowance.',
      amount: 0,
      source: 'signup',
      grantedAt: normalizeString(account.billing.welcomeCreditsSignupGrantedAt)
    };
  }
  const hadSignupGrant = normalizeMoney(account.billing.welcomeCreditsSignupGrantedTotal, 0) > 0
    || Boolean(normalizeString(account.billing.welcomeCreditsSignupGrantedAt));
  const grantedAmount = normalizeMoney(Math.min(requestedAmount, remainingAllowance), 0);
  const grantedAt = nowIso();
  account.billing = syncBillingRuntimeFields({
    ...(account.billing || {}),
    welcomeCreditsBalance: normalizeMoney(Number(account.billing?.welcomeCreditsBalance || 0) + grantedAmount, 0),
    welcomeCreditsGrantedTotal: normalizeMoney(Number(account.billing?.welcomeCreditsGrantedTotal || 0) + grantedAmount, 0),
    welcomeCreditsSignupGrantedTotal: normalizeMoney(Number(account.billing?.welcomeCreditsSignupGrantedTotal || 0) + grantedAmount, 0),
    welcomeCreditsSignupGrantedAt: grantedAt,
    welcomeCreditsGrantedAt: account.billing?.welcomeCreditsGrantedAt || grantedAt
  }, billingPeriodId());
  account.updatedAt = grantedAt;
  withAccountPersisted(state, account);
  return {
    status: hadSignupGrant ? 'topped_up' : 'granted',
    eligible: true,
    code: hadSignupGrant ? 'signup_welcome_credit_topup' : 'signup_welcome_credit',
    reason: hadSignupGrant
      ? 'Existing signup welcome credits were topped up to the account allowance.'
      : 'New account signup qualifies for welcome credits.',
    amount: grantedAmount,
    source: 'signup',
    grantedAt
  };
}

export function ensureGuestTrialAccountInState(state, visitorId = '') {
  const visitorHash = guestTrialVisitorHash(visitorId);
  const login = guestTrialLoginForVisitorId(visitorId);
  if (!visitorHash || !login) {
    return { ok: false, error: 'visitor_id required for guest trial', code: 'guest_trial_visitor_required' };
  }
  const existing = accountSettingsForLogin(state, login, { login, name: 'Guest Trial' }, 'guest-trial');
  const alreadyUsed = normalizeMoney(existing.billing?.welcomeCreditsConsumedTotal, 0) > 0
    || normalizeMoney(existing.billing?.welcomeCreditsReserved, 0) > 0
    || (Array.isArray(state?.jobs) && state.jobs.some((job) => {
      const requester = requesterContextFromJob(job);
      return normalizeLoginKey(requester.login) === login;
    }));
  if (alreadyUsed) {
    return {
      ok: false,
      error: 'Guest trial already used for this browser. Sign in to continue ordering.',
      code: 'guest_trial_already_used',
      login,
      visitorHash
    };
  }
  const account = upsertAccountSettingsInState(state, login, {
    login,
    name: 'Guest Trial',
    email: ''
  }, 'guest-trial', {
    profile: {
      displayName: 'Guest Trial'
    },
    billing: {
      mode: 'monthly_invoice',
      invoiceApproved: false,
      welcomeCreditsBalance: GUEST_TRIAL_CREDIT_LIMIT,
      welcomeCreditsGrantedTotal: GUEST_TRIAL_CREDIT_LIMIT,
      welcomeCreditsSignupGrantedTotal: 0,
      welcomeCreditsConsumedTotal: 0,
      guestTrialVisitorHash: visitorHash,
      guestTrialCreditLimit: GUEST_TRIAL_CREDIT_LIMIT
    }
  });
  return { ok: true, account, login, visitorHash, limit: GUEST_TRIAL_CREDIT_LIMIT };
}

export function guestTrialUsageForVisitorInState(state, visitorId = '') {
  const visitorHash = guestTrialVisitorHash(visitorId);
  const login = guestTrialLoginForVisitorId(visitorId);
  if (!visitorHash || !login) {
    return { ok: false, code: 'guest_trial_visitor_required', error: 'visitor_id required', visitorHash, login, used: 0 };
  }
  const account = accountSettingsForLogin(state, login, { login, name: 'Guest Trial' }, 'guest-trial');
  const billing = syncBillingRuntimeFields(account.billing || {}, billingPeriodId());
  const jobCount = Array.isArray(state?.jobs)
    ? state.jobs.filter((job) => normalizeLoginKey(requesterContextFromJob(job).login) === login).length
    : 0;
  const consumed = normalizeMoney(billing.welcomeCreditsConsumedTotal, 0);
  const reserved = normalizeMoney(billing.welcomeCreditsReserved, 0);
  const used = Math.min(GUEST_TRIAL_CREDIT_LIMIT, normalizeMoney(consumed + reserved, 0));
  return {
    ok: true,
    code: jobCount || used > 0 ? 'guest_trial_found' : 'guest_trial_unused',
    login,
    visitorHash,
    used,
    consumed,
    reserved,
    jobCount,
    account
  };
}

export function applyGuestTrialSignupDebitInState(state, login = '', user = null, authProvider = 'guest', visitorId = '') {
  const safeLogin = normalizeLoginKey(login || defaultLoginForAuthUser(user, authProvider));
  const usage = guestTrialUsageForVisitorInState(state, visitorId);
  if (!safeLogin) {
    return { ok: false, code: 'missing_login', error: 'Login is required.', used: usage.used || 0, debited: 0 };
  }
  if (!usage.ok || !(usage.used > 0)) {
    return { ok: true, code: usage.code || 'guest_trial_unused', used: 0, debited: 0 };
  }
  const account = accountSettingsForLogin(state, safeLogin, user ? { ...user, login: safeLogin } : { login: safeLogin }, authProvider);
  account.billing = syncBillingRuntimeFields(account.billing || {}, billingPeriodId());
  if (normalizeString(account.billing.guestTrialSignupVisitorHash) === usage.visitorHash) {
    return {
      ok: true,
      code: 'guest_trial_already_claimed',
      used: usage.used,
      debited: 0,
      account
    };
  }
  const debit = Math.min(usage.used, normalizeMoney(account.billing.welcomeCreditsBalance, 0));
  account.billing = syncBillingRuntimeFields({
    ...(account.billing || {}),
    welcomeCreditsBalance: normalizeMoney(Number(account.billing?.welcomeCreditsBalance || 0) - debit, 0),
    welcomeCreditsConsumedTotal: normalizeMoney(Number(account.billing?.welcomeCreditsConsumedTotal || 0) + debit, 0),
    guestTrialSignupVisitorHash: usage.visitorHash,
    guestTrialSignupDebitTotal: normalizeMoney(Number(account.billing?.guestTrialSignupDebitTotal || 0) + debit, 0),
    guestTrialSignupDebitedAt: nowIso()
  }, billingPeriodId());
  account.updatedAt = nowIso();
  withAccountPersisted(state, account);
  return {
    ok: true,
    code: 'guest_trial_claimed',
    used: usage.used,
    debited: debit,
    visitorHash: usage.visitorHash,
    account
  };
}

export function maybeGrantWelcomeCreditsForVerifiedAgentInState(state, login = '', agentId = '', amount = WELCOME_CREDITS_GRANT_AMOUNT) {
  const safeLogin = normalizeLoginKey(login);
  const safeAgentId = normalizeString(agentId);
  if (!safeLogin || !safeAgentId) {
    return { status: 'skipped', eligible: false, code: 'missing_context', reason: 'Login and agent id are required.', amount: 0 };
  }
  const agent = Array.isArray(state?.agents) ? state.agents.find((item) => normalizeString(item?.id) === safeAgentId) : null;
  if (!agent) {
    return { status: 'skipped', eligible: false, code: 'agent_not_found', reason: 'Agent not found.', amount: 0 };
  }
  const account = accountSettingsForLogin(state, safeLogin);
  account.billing = syncBillingRuntimeFields(account.billing || {}, billingPeriodId());
  const reviewedAt = nowIso();
  const review = reviewVerifiedAgentForWelcomeCredits(agent);
  if (!review.eligible) {
    applyWelcomeCreditReviewToAgent(agent, { ...review, reviewedAt, status: 'rejected', grantAgentId: agent.id });
    agent.updatedAt = reviewedAt;
    return { ...review, status: 'rejected', reviewedAt, amount: 0 };
  }
  const requestedAmount = normalizeMoney(amount, 0);
  if (!(requestedAmount > 0)) {
    const outcome = {
      ...review,
      eligible: false,
      status: 'skipped',
      code: 'disabled',
      reason: 'Welcome credits are disabled.',
      reviewedAt,
      amount: 0,
      grantAgentId: agent.id
    };
    applyWelcomeCreditReviewToAgent(agent, outcome);
    agent.updatedAt = reviewedAt;
    return outcome;
  }
  const accountGrantedTotal = normalizeMoney(account.billing.welcomeCreditsGrantedTotal, 0);
  const remainingAllowance = normalizeMoney(Math.max(0, WELCOME_CREDITS_ACCOUNT_LIMIT - accountGrantedTotal), 0);
  if (!(remainingAllowance > 0)) {
    const outcome = {
      ...review,
      eligible: false,
      status: 'already_granted',
      code: 'account_limit_reached',
      reason: 'This account has already received the full welcome credit allowance.',
      reviewedAt,
      amount: 0,
      grantAgentId: normalizeString(account.billing.welcomeCreditsAgentGrantAgentId || account.billing.welcomeCreditsGrantAgentId || agent.id)
    };
    applyWelcomeCreditReviewToAgent(agent, outcome);
    agent.updatedAt = reviewedAt;
    return outcome;
  }
  const hadAgentGrant = normalizeMoney(account.billing.welcomeCreditsAgentGrantedTotal, 0) > 0
    || Boolean(normalizeString(account.billing.welcomeCreditsAgentGrantedAt));
  const grantedAmount = normalizeMoney(Math.min(requestedAmount, remainingAllowance), 0);
  account.billing = syncBillingRuntimeFields({
    ...(account.billing || {}),
    welcomeCreditsBalance: normalizeMoney(Number(account.billing?.welcomeCreditsBalance || 0) + grantedAmount, 0),
    welcomeCreditsGrantedTotal: normalizeMoney(Number(account.billing?.welcomeCreditsGrantedTotal || 0) + grantedAmount, 0),
    welcomeCreditsAgentGrantedTotal: normalizeMoney(Number(account.billing?.welcomeCreditsAgentGrantedTotal || 0) + grantedAmount, 0),
    welcomeCreditsAgentGrantedAt: reviewedAt,
    welcomeCreditsAgentGrantAgentId: agent.id,
    welcomeCreditsGrantedAt: reviewedAt,
    welcomeCreditsGrantAgentId: agent.id
  }, billingPeriodId());
  account.updatedAt = reviewedAt;
  withAccountPersisted(state, account);
  const outcome = {
    ...review,
    eligible: true,
    status: hadAgentGrant ? 'topped_up' : 'granted',
    code: hadAgentGrant ? 'agent_welcome_credit_topup' : review.code,
    reason: hadAgentGrant
      ? 'Existing agent registration welcome credits were topped up to the account allowance.'
      : review.reason,
    reviewedAt,
    grantedAt: reviewedAt,
    amount: grantedAmount,
    grantAgentId: agent.id
  };
  applyWelcomeCreditReviewToAgent(agent, outcome);
  agent.updatedAt = reviewedAt;
  return outcome;
}

export function billingProfileForAccount(account = null, apiKeyMode = '', period = billingPeriodId()) {
  const normalizedBilling = syncBillingRuntimeFields(normalizeBillingPatch(account?.billing || {}, account?.billing || {}, { period }), period);
  const mode = effectiveBillingMode({ ...(account || {}), billing: normalizedBilling }, apiKeyMode);
  const fundedPlan = subscriptionPlanForFunding(account, normalizedBilling);
  const fundedIncludedCredits = subscriptionIncludedCreditsForFunding(account, normalizedBilling);
  const subscriptionBilling = {
    ...normalizedBilling,
    subscriptionIncludedCredits: fundedIncludedCredits
  };
  const availableWelcomeCredits = availableWelcomeCreditsBalance(normalizedBilling);
  const availableDeposit = availableDepositBalance(normalizedBilling);
  const availableSubscription = fundedPlan === 'none' ? 0 : availableSubscriptionCredits(subscriptionBilling);
  return {
    mode,
    invoiceMode: normalizedBilling.invoiceMode || 'monthly',
    welcomeCreditsBalance: normalizeMoney(normalizedBilling.welcomeCreditsBalance, 0),
    welcomeCreditsReserved: normalizeMoney(normalizedBilling.welcomeCreditsReserved, 0),
    welcomeCreditsAvailable: availableWelcomeCredits,
    welcomeCreditsGrantedTotal: normalizeMoney(normalizedBilling.welcomeCreditsGrantedTotal, 0),
    welcomeCreditsSignupGrantedTotal: normalizeMoney(normalizedBilling.welcomeCreditsSignupGrantedTotal, 0),
    welcomeCreditsSignupGrantedAt: normalizeString(normalizedBilling.welcomeCreditsSignupGrantedAt),
    welcomeCreditsAgentGrantedTotal: normalizeMoney(normalizedBilling.welcomeCreditsAgentGrantedTotal, 0),
    welcomeCreditsAgentGrantedAt: normalizeString(normalizedBilling.welcomeCreditsAgentGrantedAt),
    welcomeCreditsAgentGrantAgentId: normalizeString(normalizedBilling.welcomeCreditsAgentGrantAgentId),
    welcomeCreditsConsumedTotal: normalizeMoney(normalizedBilling.welcomeCreditsConsumedTotal, 0),
    welcomeCreditsGrantedAt: normalizeString(normalizedBilling.welcomeCreditsGrantedAt),
    welcomeCreditsGrantAgentId: normalizeString(normalizedBilling.welcomeCreditsGrantAgentId),
    openAiMonthlyCostLimit: normalizeOpenAiCostLimit(normalizedBilling.openAiMonthlyCostLimit, DEFAULT_OPENAI_MONTHLY_COST_LIMIT),
    openAiCostPeriod: normalizeString(normalizedBilling.openAiCostPeriod, period),
    openAiCostUsed: normalizeMoney(normalizedBilling.openAiCostUsed, 0),
    openAiCostReserved: normalizeMoney(normalizedBilling.openAiCostReserved, 0),
    openAiCostAvailable: normalizeMoney(Math.max(0, normalizeOpenAiCostLimit(normalizedBilling.openAiMonthlyCostLimit, DEFAULT_OPENAI_MONTHLY_COST_LIMIT) - normalizeMoney(normalizedBilling.openAiCostUsed, 0) - normalizeMoney(normalizedBilling.openAiCostReserved, 0)), 0),
    depositBalance: normalizeMoney(normalizedBilling.depositBalance, 0),
    depositReserved: normalizeMoney(normalizedBilling.depositReserved, 0),
    depositAvailable: 0,
    fundingAvailable: normalizeMoney(availableWelcomeCredits + availableSubscription, 0),
    subscriptionPlan: fundedPlan,
    subscriptionIncludedCredits: normalizeMoney(fundedIncludedCredits, 0),
    subscriptionRefillAmount: normalizeMoney(fundedIncludedCredits, 0),
    subscriptionCreditsUsed: fundedPlan === 'none' ? 0 : normalizeMoney(normalizedBilling.subscriptionCreditsUsed, 0),
    subscriptionCreditsReserved: fundedPlan === 'none' ? 0 : normalizeMoney(normalizedBilling.subscriptionCreditsReserved, 0),
    subscriptionCreditsAvailable: availableSubscription,
    subscriptionOverageMode: normalizeActiveSubscriptionOverageMode(normalizedBilling.subscriptionOverageMode, 'monthly_invoice'),
    arrearsTotal: normalizeMoney(normalizedBilling.arrearsTotal, 0),
    period
  };
}

export function reserveBillingEstimateInState(state, login, user = null, authProvider = 'guest', estimateTotal = 0, options = {}) {
  const safeLogin = normalizeString(login);
  if (!safeLogin) {
    return {
      ok: false,
      code: 'billing_account_missing',
      error: 'Billing account missing'
    };
  }
  const estimate = Math.max(0, normalizeMoney(estimateTotal, 0));
  const period = normalizeString(options.period, billingPeriodId());
  const apiKeyMode = normalizeString(options.apiKeyMode);
  const paymentProcessingRemoved = options.paymentProcessingRemoved === true || options.costGuardOnly === true;
  const openAiCostEstimate = Math.max(0, normalizeMoney(
    options.openAiCostEstimate
    ?? options.openaiCostEstimate
    ?? options.open_ai_cost_estimate
    ?? estimate,
    0
  ));
  const account = upsertAccountSettingsInState(state, safeLogin, user ? { ...user, login: safeLogin } : { login: safeLogin }, authProvider, {});
  account.billing = syncBillingRuntimeFields(account.billing || {}, period);
  const billing = account.billing;
  const mode = paymentProcessingRemoved ? 'donation_only' : effectiveBillingMode(account, apiKeyMode);
  const fundedPlan = mode === 'subscription' ? subscriptionIncludedCreditsForFunding(account, billing) : 0;
  const subscriptionBillingForGuard = { ...billing, subscriptionIncludedCredits: fundedPlan };
  const cardlessCreditsAvailable = normalizeMoney(
    availableWelcomeCreditsBalance(billing) + (mode === 'subscription' ? availableSubscriptionCredits(subscriptionBillingForGuard) : 0),
    0
  );
  const openAiMonthlyCostLimit = normalizeOpenAiCostLimit(billing.openAiMonthlyCostLimit, DEFAULT_OPENAI_MONTHLY_COST_LIMIT);
  const openAiProjectedCost = normalizeMoney(
    normalizeMoney(billing.openAiCostUsed, 0)
    + normalizeMoney(billing.openAiCostReserved, 0)
    + openAiCostEstimate,
    0
  );
  if (
    normalizeString(apiKeyMode).toLowerCase() !== 'test'
    && openAiCostEstimate > 0
    && openAiProjectedCost > openAiMonthlyCostLimit
  ) {
    withAccountPersisted(state, account);
    return {
      ok: false,
      code: 'openai_cost_limit_reached',
      error: `Monthly OpenAI/API cost limit reached. Current limit is $${ledgerAmountToDisplayCurrency(openAiMonthlyCostLimit).toFixed(2)}.`,
      action: 'Open Account Settings and raise the OpenAI/API monthly cost limit, or wait until the next billing period.',
      account,
      reservation: {
        period,
        mode,
        estimatedTotal: paymentProcessingRemoved ? 0 : estimate,
        reservedWelcomeCredits: 0,
        reservedCredits: 0,
        reservedDeposit: 0,
        autoTopupAdded: 0,
        overageMode: normalizeActiveSubscriptionOverageMode(billing.subscriptionOverageMode, 'monthly_invoice'),
        paymentProcessingRemoved,
        openAiCostEstimate,
        openAiMonthlyCostLimit,
        openAiCostUsed: normalizeMoney(billing.openAiCostUsed, 0),
        openAiCostReserved: normalizeMoney(billing.openAiCostReserved, 0)
      },
      profile: billingProfileForAccount(account, apiKeyMode, period),
      missingAmount: normalizeMoney(openAiProjectedCost - openAiMonthlyCostLimit, 0)
    };
  }
  if (
    normalizeString(apiKeyMode).toLowerCase() !== 'test'
    && !paymentProcessingRemoved
    && (mode === 'monthly_invoice' || (mode === 'subscription' && normalizeActiveSubscriptionOverageMode(billing.subscriptionOverageMode, 'monthly_invoice') === 'monthly_invoice'))
    && !hasSavedStripePaymentMethod(account)
    && estimate > 0
    && cardlessCreditsAvailable < estimate
  ) {
    withAccountPersisted(state, account);
    return {
      ok: false,
      code: 'payment_method_missing',
      error: 'Register a card before sending orders with month-end billing.',
      action: 'Open SETTINGS > PAYMENTS and use REGISTER CARD.',
      account,
      reservation: {
        period,
        mode: 'monthly_invoice',
        estimatedTotal: estimate,
        reservedWelcomeCredits: 0,
        reservedCredits: 0,
        reservedDeposit: 0,
        autoTopupAdded: 0,
        overageMode: normalizeActiveSubscriptionOverageMode(billing.subscriptionOverageMode, 'monthly_invoice')
      },
      profile: billingProfileForAccount(account, apiKeyMode, period),
      missingAmount: estimate
    };
  }
  const reservation = {
    period,
    mode,
    estimatedTotal: estimate,
    reservedWelcomeCredits: 0,
    reservedCredits: 0,
    reservedDeposit: 0,
    autoTopupAdded: 0,
    overageMode: normalizeActiveSubscriptionOverageMode(billing.subscriptionOverageMode, 'monthly_invoice'),
    paymentProcessingRemoved,
    openAiCostEstimate,
    openAiMonthlyCostLimit,
    reservedOpenAiCost: 0
  };

  if (openAiCostEstimate > 0 && normalizeString(apiKeyMode).toLowerCase() !== 'test') {
    billing.openAiCostReserved = normalizeMoney(normalizeMoney(billing.openAiCostReserved, 0) + openAiCostEstimate, 0);
    reservation.reservedOpenAiCost = openAiCostEstimate;
  }

  if (paymentProcessingRemoved) {
    account.updatedAt = nowIso();
    withAccountPersisted(state, account);
    return { ok: true, account, reservation, profile: billingProfileForAccount(account, apiKeyMode, period) };
  }

  if (mode === 'test' || estimate <= 0) {
    withAccountPersisted(state, account);
    return { ok: true, account, reservation, profile: billingProfileForAccount(account, apiKeyMode, period) };
  }

  let remaining = estimate;
  if (remaining > 0) {
    const welcomeApplied = Math.min(remaining, availableWelcomeCreditsBalance(billing));
    if (welcomeApplied > 0) {
      billing.welcomeCreditsReserved = normalizeMoney(billing.welcomeCreditsReserved + welcomeApplied, 0);
      reservation.reservedWelcomeCredits = welcomeApplied;
      remaining = normalizeMoney(remaining - welcomeApplied, 0);
    }
  }

  if (mode === 'monthly_invoice') {
    account.updatedAt = nowIso();
    withAccountPersisted(state, account);
    return {
      ok: true,
      account,
      reservation,
      profile: billingProfileForAccount(account, apiKeyMode, period)
    };
  }

  if (remaining > 0) {
    const planCredits = mode === 'subscription' ? subscriptionIncludedCreditsForFunding(account, billing) : 0;
    const subscriptionBilling = { ...billing, subscriptionIncludedCredits: planCredits };
    const hasCredits = normalizeMoney(totalFundingBalance(billing) + (mode === 'subscription' ? availableSubscriptionCredits(subscriptionBilling) : 0), 0) > 0;
    const canMonthlyOverage = mode === 'subscription'
      && reservation.overageMode === 'monthly_invoice'
      && hasSavedStripePaymentMethod(account);
    if (!hasCredits && !canMonthlyOverage) {
      withAccountPersisted(state, account);
      return {
        ok: false,
        code: 'payment_required',
        error: 'Payment required. Register a card or start a subscription before ordering.',
        action: 'Open SETTINGS and use REGISTER CARD for month-end billing or OPEN PLAN CHECKOUT.',
        account,
        reservation,
        profile: billingProfileForAccount(account, apiKeyMode, period),
        missingAmount: remaining
      };
    }
  }

  if (remaining > 0 && mode === 'subscription') {
    const planCredits = subscriptionIncludedCreditsForFunding(account, billing);
    const subscriptionBilling = { ...billing, subscriptionIncludedCredits: planCredits };
    const creditsApplied = Math.min(remaining, availableSubscriptionCredits(subscriptionBilling));
    if (creditsApplied > 0) {
      billing.subscriptionCreditsReserved = normalizeMoney(billing.subscriptionCreditsReserved + creditsApplied, 0);
      reservation.reservedCredits = creditsApplied;
      remaining = normalizeMoney(remaining - creditsApplied, 0);
    }
    if (remaining > 0 && reservation.overageMode === 'block') {
      withAccountPersisted(state, account);
      return {
        ok: false,
        code: 'subscription_limit_reached',
        error: 'Subscription usage limit reached for this period.',
        action: 'Upgrade plan, wait for the next period, or switch overage mode to month-end billing.',
        account,
        reservation,
        profile: billingProfileForAccount(account, apiKeyMode, period),
        missingAmount: remaining
      };
    }
    if (remaining > 0 && reservation.overageMode === 'monthly_invoice') {
      remaining = 0;
    }
  }

  if (remaining > 0) {
    withAccountPersisted(state, account);
    return {
      ok: false,
      code: 'payment_required',
      error: 'Payment required. Register a card or start a subscription before ordering.',
      action: 'Open SETTINGS and use REGISTER CARD for month-end billing or OPEN PLAN CHECKOUT.',
      account,
      reservation,
      profile: billingProfileForAccount(account, apiKeyMode, period),
      missingAmount: remaining
    };
  }

  account.updatedAt = nowIso();
  withAccountPersisted(state, account);
  return {
    ok: true,
    account,
    reservation,
    profile: billingProfileForAccount(account, apiKeyMode, period)
  };
}

export function releaseBillingReservationInState(state, job) {
  const reservation = job?.billingReservation && typeof job.billingReservation === 'object' ? job.billingReservation : null;
  const requester = requesterContextFromJob(job);
  if (!reservation || !requester.login) return null;
  const account = accountSettingsForLogin(state, requester.login);
  account.billing = syncBillingRuntimeFields(account.billing || {}, reservation.period || billingPeriodId());
  const billing = account.billing;
  if (reservation.reservedWelcomeCredits) {
    billing.welcomeCreditsReserved = normalizeMoney(Math.max(0, billing.welcomeCreditsReserved - normalizeMoney(reservation.reservedWelcomeCredits, 0)), 0);
  }
  if (reservation.reservedCredits) {
    billing.subscriptionCreditsReserved = normalizeMoney(Math.max(0, billing.subscriptionCreditsReserved - normalizeMoney(reservation.reservedCredits, 0)), 0);
  }
  if (reservation.reservedDeposit) {
    billing.depositReserved = normalizeMoney(Math.max(0, billing.depositReserved - normalizeMoney(reservation.reservedDeposit, 0)), 0);
  }
  if (reservation.reservedOpenAiCost) {
    billing.openAiCostReserved = normalizeMoney(Math.max(0, normalizeMoney(billing.openAiCostReserved, 0) - normalizeMoney(reservation.reservedOpenAiCost, 0)), 0);
  }
  job.billingReservation = {
    ...reservation,
    releasedAt: normalizeString(job?.billingReservation?.releasedAt, nowIso())
  };
  account.updatedAt = nowIso();
  withAccountPersisted(state, account);
  return {
    account,
    profile: billingProfileForAccount(account, billingModeFromJob(job), reservation.period || billingPeriodId())
  };
}

export function settleBillingForJobInState(state, job, billingInput = null) {
  const requester = requesterContextFromJob(job);
  if (!requester.login || !billingInput || !isBillableJob(job)) return null;
  if (job?.billingSettlement?.settledAt) return job.billingSettlement;
  const reservation = job?.billingReservation && typeof job.billingReservation === 'object' ? job.billingReservation : null;
  const period = normalizeString(reservation?.period, billingPeriodId(job?.completedAt || job?.failedAt || nowIso()));
  const assignedAgent = Array.isArray(state?.agents)
    ? state.agents.find((agent) => String(agent?.id || '') === String(job.assignedAgentId || ''))
    : null;
  const billingForSettlement = billingInput;
  const account = accountSettingsForLogin(state, requester.login);
  account.billing = syncBillingRuntimeFields(account.billing || {}, period);
  const billing = account.billing;
  const mode = normalizeBillingMode(reservation?.mode || billingModeFromJob(job), effectiveBillingMode(account, ''));
  const actualTotal = Math.max(0, normalizeMoney(billingForSettlement.total, 0));
  let remaining = actualTotal;
  let welcomeCreditsApplied = 0;
  let creditsApplied = 0;
  let depositApplied = 0;
  let invoiceApplied = 0;
  let autoTopupAdded = 0;

  if (reservation?.reservedWelcomeCredits) {
    billing.welcomeCreditsReserved = normalizeMoney(Math.max(0, billing.welcomeCreditsReserved - normalizeMoney(reservation.reservedWelcomeCredits, 0)), 0);
  }
  if (reservation?.reservedCredits) {
    billing.subscriptionCreditsReserved = normalizeMoney(Math.max(0, billing.subscriptionCreditsReserved - normalizeMoney(reservation.reservedCredits, 0)), 0);
  }
  if (reservation?.reservedDeposit) {
    billing.depositReserved = normalizeMoney(Math.max(0, billing.depositReserved - normalizeMoney(reservation.reservedDeposit, 0)), 0);
  }
  if (reservation?.reservedOpenAiCost) {
    billing.openAiCostReserved = normalizeMoney(Math.max(0, normalizeMoney(billing.openAiCostReserved, 0) - normalizeMoney(reservation.reservedOpenAiCost, 0)), 0);
  }

  if (remaining > 0) {
    const reservedWelcome = normalizeMoney(reservation?.reservedWelcomeCredits, 0);
    const welcomeLimit = reservedWelcome > 0
      ? Math.min(reservedWelcome, normalizeMoney(billing.welcomeCreditsBalance, 0))
      : (mode === 'deposit' ? normalizeMoney(billing.welcomeCreditsBalance, 0) : 0);
    welcomeCreditsApplied = Math.min(remaining, welcomeLimit);
    if (welcomeCreditsApplied > 0) {
      billing.welcomeCreditsBalance = normalizeMoney(billing.welcomeCreditsBalance - welcomeCreditsApplied, 0);
      billing.welcomeCreditsConsumedTotal = normalizeMoney(Number(billing.welcomeCreditsConsumedTotal || 0) + welcomeCreditsApplied, 0);
      remaining = normalizeMoney(remaining - welcomeCreditsApplied, 0);
    }
  }

  if (remaining > 0 && mode === 'subscription') {
    const planCredits = subscriptionIncludedCreditsForFunding(account, billing);
    const subscriptionBilling = { ...billing, subscriptionIncludedCredits: planCredits };
    creditsApplied = Math.min(remaining, availableSubscriptionCredits(subscriptionBilling));
    if (creditsApplied > 0) {
      billing.subscriptionCreditsUsed = normalizeMoney(billing.subscriptionCreditsUsed + creditsApplied, 0);
      remaining = normalizeMoney(remaining - creditsApplied, 0);
    }
  }

  if (remaining > 0) {
    invoiceApplied = normalizeMoney(remaining, 0);
    if (invoiceApplied > 0) {
      billing.arrearsTotal = normalizeMoney(billing.arrearsTotal + invoiceApplied, 0);
      remaining = 0;
    }
  }
  const openAiCostSettled = normalizeMoney(
    billingForSettlement.apiCost
    ?? billingForSettlement.api_cost
    ?? billingForSettlement.totalCostBasis
    ?? billingForSettlement.total_cost_basis
    ?? actualTotal,
    0
  );
  if (openAiCostSettled > 0) {
    billing.openAiCostUsed = normalizeMoney(normalizeMoney(billing.openAiCostUsed, 0) + openAiCostSettled, 0);
  }

  const settlement = {
    mode,
    period,
    total: actualTotal,
    openAiCostSettled,
    welcomeCreditsApplied,
    creditsApplied,
    depositApplied,
    invoiceApplied,
    autoTopupAdded,
    settledAt: normalizeString(job?.completedAt || nowIso(), nowIso())
  };
  job.billingSettlement = settlement;
  job.actualBilling = {
    ...(job?.actualBilling && typeof job.actualBilling === 'object' ? job.actualBilling : {}),
    ...(billingForSettlement && typeof billingForSettlement === 'object' ? billingForSettlement : {}),
    funding: settlement
  };

  const providerLogin = normalizeString(assignedAgent?.owner);
  if (providerLogin && providerLogin.toLowerCase() !== 'aiagent2' && settlement.total > 0) {
    const providerAccount = accountSettingsForLogin(state, providerLogin);
    providerAccount.payout = normalizePayoutPatch({
      ...(providerAccount.payout || {}),
      pendingBalance: normalizeMoney(Number(providerAccount.payout?.pendingBalance || 0) + Number(billingForSettlement.agentPayout || 0), 0)
    }, providerAccount.payout || {});
    providerAccount.updatedAt = nowIso();
    withAccountPersisted(state, providerAccount);
  }

  account.updatedAt = nowIso();
  withAccountPersisted(state, account);
  return settlement;
}

export function settleOpenAiCostForJobInState(state, job, billingInput = null) {
  const requester = requesterContextFromJob(job);
  if (!requester.login || !billingInput) return null;
  const reservation = job?.billingReservation && typeof job.billingReservation === 'object' ? job.billingReservation : null;
  const period = normalizeString(reservation?.period, billingPeriodId(job?.completedAt || job?.failedAt || nowIso()));
  const account = accountSettingsForLogin(state, requester.login);
  account.billing = syncBillingRuntimeFields(account.billing || {}, period);
  const billing = account.billing;
  if (reservation?.reservedOpenAiCost) {
    billing.openAiCostReserved = normalizeMoney(Math.max(0, normalizeMoney(billing.openAiCostReserved, 0) - normalizeMoney(reservation.reservedOpenAiCost, 0)), 0);
  }
  const openAiCostSettled = normalizeMoney(
    billingInput.apiCost
    ?? billingInput.api_cost
    ?? billingInput.totalCostBasis
    ?? billingInput.total_cost_basis
    ?? 0,
    0
  );
  if (openAiCostSettled > 0) {
    billing.openAiCostUsed = normalizeMoney(normalizeMoney(billing.openAiCostUsed, 0) + openAiCostSettled, 0);
  }
  account.updatedAt = nowIso();
  withAccountPersisted(state, account);
  return {
    mode: 'donation_only',
    period,
    openAiCostSettled,
    openAiMonthlyCostLimit: normalizeOpenAiCostLimit(billing.openAiMonthlyCostLimit, DEFAULT_OPENAI_MONTHLY_COST_LIMIT),
    paymentProcessingRemoved: true,
    settledAt: normalizeString(job?.completedAt || nowIso(), nowIso())
  };
}

function accountReadiness(account, providerActive = false) {
  const billingMissing = [];
  if (!normalizeString(account?.billing?.billingEmail)) billingMissing.push('billingEmail');
  if (!normalizeString(account?.billing?.billingPhone)) billingMissing.push('billingPhone');
  if (!normalizeString(account?.billing?.billingPostalCode)) billingMissing.push('billingPostalCode');
  if (!normalizeString(account?.billing?.billingRegion)) billingMissing.push('billingRegion');
  if (!normalizeString(account?.billing?.billingCity)) billingMissing.push('billingCity');
  if (!normalizeString(account?.billing?.billingAddressLine1)) billingMissing.push('billingAddressLine1');
  if (!normalizeString(account?.billing?.country)) billingMissing.push('country');
  if (!normalizeString(account?.billing?.currency)) billingMissing.push('currency');
  if (!normalizeString(account?.billing?.legalName) && !normalizeString(account?.billing?.companyName)) billingMissing.push('legalNameOrCompanyName');

  const payoutMissing = [];
  if (providerActive || account?.payout?.providerEnabled) {
    if (!normalizeString(account?.payout?.payoutEmail)) payoutMissing.push('payoutEmail');
    if (!normalizeString(account?.payout?.country)) payoutMissing.push('country');
    if (!normalizeString(account?.payout?.currency)) payoutMissing.push('currency');
    if (!normalizeString(account?.payout?.legalName) && !normalizeString(account?.payout?.displayName)) payoutMissing.push('legalNameOrDisplayName');
    if (!normalizeString(account?.payout?.entityType)) payoutMissing.push('entityType');
    if (normalizeString(account?.payout?.identityVerification?.status || 'not_submitted') !== 'approved') payoutMissing.push('providerIdentityApproved');
  }
  return {
    billingReady: billingMissing.length === 0,
    payoutReady: payoutMissing.length === 0,
    missingBillingFields: billingMissing,
    missingPayoutFields: payoutMissing,
    stripeCustomerStatus: normalizeStatus(account?.stripe?.customerStatus, 'not_started'),
    stripeConnectedAccountStatus: normalizeStatus(account?.stripe?.connectedAccountStatus, 'not_started')
  };
}

function periodMatchesJob(job, period) {
  const source = job?.completedAt || job?.failedAt || job?.createdAt || nowIso();
  return billingPeriodId(source) === period;
}

function successfulProviderPayoutRuns(account = null) {
  const payoutRuns = Array.isArray(account?.payout?.payoutRuns) ? account.payout.payoutRuns : [];
  return payoutRuns.filter((run) => String(run?.status || '').toLowerCase() === 'paid' && Number(run?.amount || 0) > 0);
}

export function providerPayoutLedgerForLogin(state, login, accountInput = null) {
  const safeLogin = normalizeString(login);
  const account = accountInput || accountSettingsForLogin(state, safeLogin);
  const agents = Array.isArray(state?.agents) ? state.agents : [];
  const jobs = Array.isArray(state?.jobs) ? state.jobs : [];
  const providerAgentIds = new Set(
    agents
      .filter((agent) => normalizeString(agent.owner).toLowerCase() === safeLogin.toLowerCase())
      .map((agent) => agent.id)
  );
  const accruedTotal = jobs
    .filter((job) => job?.status === 'completed' && job?.actualBilling && isBillableJob(job) && providerAgentIds.has(job.assignedAgentId || ''))
    .reduce((sum, job) => sum + Number(job.actualBilling?.agentPayout || 0), 0);
  const payoutRuns = Array.isArray(account?.payout?.payoutRuns) ? account.payout.payoutRuns.slice(0, 50) : [];
  const paidOutTotal = successfulProviderPayoutRuns(account).reduce((sum, run) => sum + Number(run.amount || 0), 0);
  return {
    accruedTotal: +accruedTotal.toFixed(1),
    paidOutTotal: +paidOutTotal.toFixed(1),
    pendingBalance: +Math.max(0, accruedTotal - paidOutTotal).toFixed(1),
    payoutRuns,
    ownedAgentCount: providerAgentIds.size
  };
}

export function providerMonthlyBillingLedgerForLogin(state, login, period = billingPeriodId(), accountInput = null) {
  const safeLogin = normalizeString(login);
  const safePeriod = normalizeString(period, billingPeriodId());
  const account = accountInput || accountSettingsForLogin(state, safeLogin);
  const agents = Array.isArray(state?.agents) ? state.agents : [];
  const providerAgentRows = agents
    .filter((agent) => normalizeString(agent.owner).toLowerCase() === safeLogin.toLowerCase())
    .map((agent) => {
      const pricing = resolveAgentPricingConfig(agent);
      const monthlyPrice = usdPriceToLedger(pricing.subscriptionMonthlyPriceUsd);
      const monthlyBreakdown = listPriceBreakdown(monthlyPrice);
      return {
        agentId: agent.id,
        agentName: agent.name || agent.id || '-',
        pricingModel: pricing.pricingModel,
        monthlyPrice,
        marketplaceFee: monthlyBreakdown.platformRevenue,
        providerNet: monthlyBreakdown.agentPayout
      };
    })
    .filter((item) => item.pricingModel === 'subscription_required' || item.pricingModel === 'hybrid');
  const declaredTotals = providerAgentRows.reduce((acc, row) => {
    acc.monthlyPrice += Number(row.monthlyPrice || 0);
    acc.marketplaceFee += Number(row.marketplaceFee || 0);
    acc.providerNet += Number(row.providerNet || 0);
    return acc;
  }, { monthlyPrice: 0, marketplaceFee: 0, providerNet: 0 });
  const chargeRuns = providerMonthlyChargeHistoryForAccount(account)
    .filter((item) => item.period === safePeriod)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  const chargedSucceeded = chargeRuns
    .filter((item) => item.status === 'succeeded')
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const chargedPending = chargeRuns
    .filter((item) => ['pending', 'processing', 'requires_action'].includes(String(item.status || '').toLowerCase()))
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const monthlyPrice = normalizeMoney(declaredTotals.monthlyPrice, 0);
  const chargedAmount = normalizeMoney(chargedSucceeded, 0);
  return {
    period: safePeriod,
    agentCount: providerAgentRows.length,
    agents: providerAgentRows.slice(0, 50),
    monthlyPrice,
    marketplaceFee: normalizeMoney(declaredTotals.marketplaceFee, 0),
    providerNet: normalizeMoney(declaredTotals.providerNet, 0),
    chargedAmount,
    pendingAmount: normalizeMoney(chargedPending, 0),
    dueAmount: normalizeMoney(Math.max(0, monthlyPrice - chargedAmount), 0),
    chargeRuns: chargeRuns.slice(0, 50)
  };
}

export function buildMonthlyAccountSummary(state, login, period = billingPeriodId(), accountInput = null) {
  const safeLogin = normalizeString(login);
  const account = accountInput || accountSettingsForLogin(state, safeLogin);
  const billingProfile = billingProfileForAccount(account, '', period);
  const agents = Array.isArray(state?.agents) ? state.agents : [];
  const jobs = Array.isArray(state?.jobs) ? state.jobs : [];
  const agentById = new Map(agents.map((agent) => [agent.id, agent]));
  const providerAgentIds = new Set(agents.filter((agent) => normalizeString(agent.owner).toLowerCase() === safeLogin.toLowerCase()).map((agent) => agent.id));
  const completedInPeriod = jobs.filter((job) => job?.status === 'completed' && job?.actualBilling && isBillableJob(job) && periodMatchesJob(job, period));
  const customerRuns = completedInPeriod
    .filter((job) => {
      const requester = requesterContextFromJob(job);
      return requester.login.toLowerCase() === safeLogin.toLowerCase() || requester.accountId === account.id;
    })
    .map((job) => ({
      id: job.id,
      taskType: job.taskType,
      agentId: job.assignedAgentId || null,
      agentName: agentById.get(job.assignedAgentId || '')?.name || job.assignedAgentId || '-',
      ts: job.completedAt || job.createdAt,
      totalCostBasis: Number(job.actualBilling?.totalCostBasis || 0),
      creatorFee: Number(job.actualBilling?.creatorFee || 0),
      marketplaceFee: Number(job.actualBilling?.marketplaceFee || 0),
      total: Number(job.actualBilling?.total || 0)
    }))
    .sort((a, b) => String(b.ts || '').localeCompare(String(a.ts || '')));
  const providerRuns = completedInPeriod
    .filter((job) => providerAgentIds.has(job.assignedAgentId || ''))
    .map((job) => ({
      id: job.id,
      taskType: job.taskType,
      agentId: job.assignedAgentId || null,
      agentName: agentById.get(job.assignedAgentId || '')?.name || job.assignedAgentId || '-',
      ts: job.completedAt || job.createdAt,
      totalCostBasis: Number(job.actualBilling?.totalCostBasis || 0),
      agentPayout: Number(job.actualBilling?.agentPayout || 0),
      creatorFee: Number(job.actualBilling?.creatorFee || 0),
      total: Number(job.actualBilling?.total || 0)
    }))
    .sort((a, b) => String(b.ts || '').localeCompare(String(a.ts || '')));
  const providerMonthlyLedger = providerMonthlyBillingLedgerForLogin(state, safeLogin, period, account);

  const customerTotals = customerRuns.reduce((acc, row) => {
    acc.totalCostBasis += row.totalCostBasis;
    acc.creatorFee += row.creatorFee;
    acc.marketplaceFee += row.marketplaceFee;
    acc.total += row.total;
    return acc;
  }, { totalCostBasis: 0, creatorFee: 0, marketplaceFee: 0, total: 0 });
  const providerTotals = providerRuns.reduce((acc, row) => {
    acc.totalCostBasis += row.totalCostBasis;
    acc.agentPayout += row.agentPayout;
    acc.total += row.total;
    return acc;
  }, { totalCostBasis: 0, agentPayout: 0, total: 0 });
  const providerLedger = providerPayoutLedgerForLogin(state, safeLogin, account);

  const readiness = accountReadiness(account, providerAgentIds.size > 0 || account?.payout?.providerEnabled);
  const window = monthWindow(period);
  const invoiceDate = new Date(Date.UTC(window.endExclusive.getUTCFullYear(), window.endExclusive.getUTCMonth(), 1, 0, 0, 0, 0));
  const dueDate = new Date(invoiceDate.getTime() + normalizePositiveInt(account?.billing?.dueDays, 14) * 24 * 60 * 60 * 1000);

  return {
    period,
    window: {
      start: window.start.toISOString(),
      endInclusive: window.endInclusive.toISOString(),
      invoiceAt: invoiceDate.toISOString(),
      dueAt: dueDate.toISOString()
    },
    customer: {
      billingMode: billingProfile.mode,
      invoiceMode: account?.billing?.invoiceMode || 'monthly',
      invoiceEnabled: normalizeBoolean(account?.billing?.invoiceEnabled, true),
      currency: account?.billing?.currency || BILLING_DISPLAY_CURRENCY,
      dueDays: normalizePositiveInt(account?.billing?.dueDays, 14),
      runCount: customerRuns.length,
      totalCostBasis: +customerTotals.totalCostBasis.toFixed(1),
      creatorFee: +customerTotals.creatorFee.toFixed(1),
      marketplaceFee: +customerTotals.marketplaceFee.toFixed(1),
      totalSpent: +customerTotals.total.toFixed(1),
      totalDue: +customerTotals.total.toFixed(1),
      depositBalance: billingProfile.depositBalance,
      depositReserved: billingProfile.depositReserved,
      depositAvailable: billingProfile.depositAvailable,
      welcomeCreditsBalance: billingProfile.welcomeCreditsBalance,
      welcomeCreditsReserved: billingProfile.welcomeCreditsReserved,
      welcomeCreditsAvailable: billingProfile.welcomeCreditsAvailable,
      welcomeCreditsGrantedTotal: billingProfile.welcomeCreditsGrantedTotal,
      welcomeCreditsSignupGrantedTotal: billingProfile.welcomeCreditsSignupGrantedTotal,
      welcomeCreditsAgentGrantedTotal: billingProfile.welcomeCreditsAgentGrantedTotal,
      welcomeCreditsConsumedTotal: billingProfile.welcomeCreditsConsumedTotal,
      openAiMonthlyCostLimit: billingProfile.openAiMonthlyCostLimit,
      openAiCostPeriod: billingProfile.openAiCostPeriod,
      openAiCostUsed: billingProfile.openAiCostUsed,
      openAiCostReserved: billingProfile.openAiCostReserved,
      openAiCostAvailable: billingProfile.openAiCostAvailable,
      fundingAvailable: billingProfile.fundingAvailable,
      subscriptionPlan: billingProfile.subscriptionPlan,
      subscriptionIncludedCredits: billingProfile.subscriptionIncludedCredits,
      subscriptionRefillAmount: billingProfile.subscriptionRefillAmount,
      subscriptionCreditsUsed: billingProfile.subscriptionCreditsUsed,
      subscriptionCreditsReserved: billingProfile.subscriptionCreditsReserved,
      subscriptionCreditsAvailable: billingProfile.subscriptionCreditsAvailable,
      arrearsTotal: billingProfile.arrearsTotal,
      stripeCustomerStatus: readiness.stripeCustomerStatus,
      runs: customerRuns.slice(0, 20)
    },
    provider: {
      providerEnabled: normalizeBoolean(account?.payout?.providerEnabled, false),
      currency: account?.payout?.currency || BILLING_DISPLAY_CURRENCY,
      ownedAgentCount: providerAgentIds.size,
      runCount: providerRuns.length,
      providerSubscriptionAgentCount: providerMonthlyLedger.agentCount,
      providerSubscriptionMonthlyPrice: +providerMonthlyLedger.monthlyPrice.toFixed(1),
      providerSubscriptionMarketplaceFee: +providerMonthlyLedger.marketplaceFee.toFixed(1),
      providerSubscriptionProviderNet: +providerMonthlyLedger.providerNet.toFixed(1),
      providerSubscriptionChargedAmount: +providerMonthlyLedger.chargedAmount.toFixed(1),
      providerSubscriptionPendingAmount: +providerMonthlyLedger.pendingAmount.toFixed(1),
      providerSubscriptionDueAmount: +providerMonthlyLedger.dueAmount.toFixed(1),
      providerSubscriptionRetryPeriod: normalizeString(account?.stripe?.providerMonthlyRetryPeriod),
      providerSubscriptionRetryCount: normalizePositiveInt(account?.stripe?.providerMonthlyRetryCount, 0),
      providerSubscriptionLastAttemptAt: normalizeString(account?.stripe?.providerMonthlyLastAttemptAt),
      providerSubscriptionLastFailureAt: normalizeString(account?.stripe?.providerMonthlyLastFailureAt),
      providerSubscriptionLastFailureMessage: normalizeString(account?.stripe?.providerMonthlyLastFailureMessage),
      providerSubscriptionLastNotificationAt: normalizeString(account?.stripe?.providerMonthlyLastNotificationAt),
      providerSubscriptionLastNotificationPeriod: normalizeString(account?.stripe?.providerMonthlyLastNotificationPeriod),
      grossPayout: +providerTotals.agentPayout.toFixed(1),
      settledByMarketplace: +providerTotals.agentPayout.toFixed(1),
      pendingBalance: providerLedger.pendingBalance,
      paidOutTotal: providerLedger.paidOutTotal,
      minimumPayoutAmount: normalizeMinimumPayoutAmount(account?.payout?.minimumPayoutAmount),
      lastPayoutAt: normalizeString(account?.payout?.lastPayoutAt),
      lastPayoutAmount: normalizeMoney(account?.payout?.lastPayoutAmount, 0),
      lastPayoutTransferId: normalizeString(account?.payout?.lastPayoutTransferId),
      payoutRuns: providerLedger.payoutRuns.slice(0, 20),
      stripeConnectedAccountStatus: readiness.stripeConnectedAccountStatus,
      providerSubscriptionAgents: providerMonthlyLedger.agents.slice(0, 20),
      providerSubscriptionChargeRuns: providerMonthlyLedger.chargeRuns.slice(0, 20),
      runs: providerRuns.slice(0, 20)
    },
    readiness
  };
}

export function providerPayoutProfileForAccount(account = null) {
  const payout = normalizePayoutPatch(account?.payout || {}, defaultAccountSettingsForUser(account ? { login: account.login || '', name: account?.profile?.displayName || account?.login || '' } : { login: '' }).payout);
  return {
    providerEnabled: Boolean(payout.providerEnabled),
    pendingBalance: normalizeMoney(payout.pendingBalance, 0),
    paidOutTotal: normalizeMoney(payout.paidOutTotal, 0),
    minimumPayoutAmount: normalizeMinimumPayoutAmount(payout.minimumPayoutAmount),
    lastPayoutAt: normalizeString(payout.lastPayoutAt),
    lastPayoutAmount: normalizeMoney(payout.lastPayoutAmount, 0),
    lastPayoutTransferId: normalizeString(payout.lastPayoutTransferId),
    payoutRuns: Array.isArray(payout.payoutRuns) ? payout.payoutRuns.slice(0, 20) : []
  };
}
