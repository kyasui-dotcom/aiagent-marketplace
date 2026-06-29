import { accountHash } from './account-identity.js';
import { buildConversionAnalytics, countRecentActuals } from './conversion-analytics.js';
import { nowIso } from './events.js';
import {
  orderChatMemoryCompressedAnswer,
  orderChatMemoryConversationPrompt,
  orderChatMemoryStatusLabel
} from './chat-order-memory.js';
import { sanitizeFeedbackReportForClient } from './feedback-reports.js';
import {
  billingModeFromJob,
  chatSessionIdForJob,
  requesterContextFromJob,
  sanitizeAccountSettingsForClient,
  sanitizeChatTranscriptForClient
} from './shared.js';

const CHAT_TRANSCRIPT_PROMPT_MAX_CHARS = 1200;

function normalizeString(value, fallback = '') {
  return String(value ?? fallback).trim();
}

function shortText(value, max = 96) {
  const text = normalizeString(value);
  if (!text) return '';
  return text.length > max ? `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…` : text;
}

function sortItemsByLatest(items = [], field = 'createdAt') {
  return (Array.isArray(items) ? [...items] : [])
    .sort((left, right) => String(right?.[field] || right?.updatedAt || right?.createdAt || right?.created_at || right?.ts || '').localeCompare(String(left?.[field] || left?.updatedAt || left?.createdAt || left?.created_at || left?.ts || '')));
}

function adminAccountView(account = {}) {
  const safe = sanitizeAccountSettingsForClient(account) || {};
  const linkedProviders = Array.isArray(safe.linkedIdentities)
    ? [...new Set(safe.linkedIdentities.map((item) => normalizeString(item.provider)).filter(Boolean))]
    : [];
  const activeApiKeys = (safe.apiAccess?.orderKeys || []).filter((key) => key.active).length;
  return {
    id: normalizeString(safe.id),
    login: normalizeString(safe.login),
    displayName: normalizeString(safe.profile?.displayName || safe.login),
    email: normalizeString(safe.billing?.billingEmail || safe.payout?.payoutEmail),
    authProvider: normalizeString(safe.authProvider),
    linkedProviders,
    aliases: Array.isArray(safe.aliases) ? safe.aliases.map((item) => normalizeString(item)).filter(Boolean) : [],
    createdAt: normalizeString(safe.createdAt),
    updatedAt: normalizeString(safe.updatedAt),
    depositBalance: Number(safe.billing?.depositBalance || 0),
    depositReserved: Number(safe.billing?.depositReserved || 0),
    welcomeCreditsBalance: Number(safe.billing?.welcomeCreditsBalance || 0),
    subscriptionPlan: normalizeString(safe.billing?.subscriptionPlan || 'none'),
    stripeCustomerStatus: normalizeString(safe.stripe?.customerStatus || 'not_started'),
    stripeConnectStatus: normalizeString(safe.stripe?.connectedAccountStatus || 'not_started'),
    providerMonthlyRetryPeriod: normalizeString(safe.stripe?.providerMonthlyRetryPeriod),
    providerMonthlyRetryCount: Number(safe.stripe?.providerMonthlyRetryCount || 0),
    providerMonthlyLastFailureAt: normalizeString(safe.stripe?.providerMonthlyLastFailureAt),
    providerMonthlyLastFailureMessage: shortText(safe.stripe?.providerMonthlyLastFailureMessage || '', 120),
    providerMonthlyLastNotificationAt: normalizeString(safe.stripe?.providerMonthlyLastNotificationAt),
    providerMonthlyLastNotificationPeriod: normalizeString(safe.stripe?.providerMonthlyLastNotificationPeriod),
    providerMonthlyLastChargeStatus: normalizeString(safe.stripe?.lastProviderMonthlyChargeStatus || 'not_started'),
    payoutsEnabled: Boolean(safe.stripe?.payoutsEnabled),
    providerEnabled: Boolean(safe.payout?.providerEnabled),
    providerIdentityStatus: normalizeString(safe.payout?.identityVerification?.status || 'not_submitted'),
    providerIdentitySubmittedAt: normalizeString(safe.payout?.identityVerification?.submittedAt),
    providerIdentityReviewedAt: normalizeString(safe.payout?.identityVerification?.reviewedAt),
    providerIdentityReviewedBy: normalizeString(safe.payout?.identityVerification?.reviewedBy),
    providerIdentityPhotoSubmitted: Boolean(safe.payout?.identityVerification?.photo?.submitted),
    pendingProviderBalance: Number(safe.payout?.pendingBalance || 0),
    paidOutTotal: Number(safe.payout?.paidOutTotal || 0),
    apiKeys: {
      active: activeApiKeys,
      total: (safe.apiAccess?.orderKeys || []).length
    },
    githubRepos: (safe.githubAppAccess?.repos || []).length
  };
}

function adminAgentView(agent = {}) {
  const metadata = agent.metadata && typeof agent.metadata === 'object' ? agent.metadata : {};
  const manifest = metadata.manifest && typeof metadata.manifest === 'object' ? metadata.manifest : {};
  return {
    id: normalizeString(agent.id),
    name: normalizeString(agent.name),
    owner: normalizeString(agent.owner),
    description: shortText(agent.description, 180),
    taskTypes: Array.isArray(agent.taskTypes) ? agent.taskTypes.map((item) => normalizeString(item)).filter(Boolean) : [],
    online: Boolean(agent.online),
    ready: Boolean(agent.online && (agent.verificationStatus === 'verified' || agent.verification_status === 'verified')),
    verificationStatus: normalizeString(agent.verificationStatus || agent.verification_status || 'legacy_unverified'),
    agentReviewStatus: normalizeString(agent.agentReviewStatus || agent.agent_review_status || 'pending'),
    manifestUrl: normalizeString(agent.manifestUrl || agent.manifest_url),
    endpoint: normalizeString(manifest.endpoints?.jobs || manifest.endpoint || metadata.jobEndpoint || metadata.endpoint),
    productKind: normalizeString(manifest.kind || metadata.productKind || 'agent'),
    providerMarkupRate: Number(agent.providerMarkupRate ?? agent.tokenMarkupRate ?? agent.premiumRate ?? 0),
    platformMarginRate: Number(agent.platformMarginRate ?? agent.basicRate ?? 0.1),
    successRate: Number(agent.successRate || 0),
    avgLatencySec: Number(agent.avgLatencySec || 0),
    earnings: Number(agent.earnings || 0),
    createdAt: normalizeString(agent.createdAt || agent.created_at),
    updatedAt: normalizeString(agent.updatedAt || agent.updated_at)
  };
}

function adminOrderView(job = {}) {
  const requester = requesterContextFromJob(job);
  const output = job.output && typeof job.output === 'object' ? job.output : {};
  const report = output.report && typeof output.report === 'object' ? output.report : {};
  const billing = job.actualBilling || null;
  const estimate = job.billingEstimate || job.billing_estimate_json || null;
  return {
    id: normalizeString(job.id),
    status: normalizeString(job.status),
    taskType: normalizeString(job.taskType || job.task_type),
    prompt: shortText(job.prompt, 600),
    requesterLogin: normalizeString(requester.login),
    requesterAuthProvider: normalizeString(requester.authProvider),
    parentAgentId: normalizeString(job.parentAgentId || job.parent_agent_id),
    assignedAgentId: normalizeString(job.assignedAgentId || job.assigned_agent_id),
    billingMode: billingModeFromJob(job),
    budgetCap: Number(job.budgetCap || job.budget_cap || 0),
    priority: normalizeString(job.priority),
    score: Number(job.score || 0),
    createdAt: normalizeString(job.createdAt || job.created_at),
    claimedAt: normalizeString(job.claimedAt || job.claimed_at),
    dispatchedAt: normalizeString(job.dispatchedAt || job.dispatched_at),
    completedAt: normalizeString(job.completedAt || job.completed_at),
    failedAt: normalizeString(job.failedAt || job.failed_at),
    timedOutAt: normalizeString(job.timedOutAt || job.timed_out_at),
    failureReason: shortText(job.failureReason || job.failure_reason, 300),
    failureCategory: normalizeString(job.failureCategory || job.failure_category),
    deliverySummary: shortText(report.summary || output.summary || output.text, 300),
    actualBilling: billing ? {
      total: Number(billing.total || 0),
      apiCost: Number(billing.apiCost || 0),
      platformRevenue: Number(billing.platformRevenue || 0),
      providerEarnings: Number(billing.providerEarnings || 0)
    } : null,
    billingEstimate: estimate ? {
      min: Number(estimate.min ?? estimate.minTotal ?? 0),
      max: Number(estimate.max ?? estimate.maxTotal ?? 0)
    } : null
  };
}

function adminEventView(event = {}) {
  return {
    id: normalizeString(event.id),
    type: normalizeString(event.type),
    message: shortText(event.message, 240),
    createdAt: normalizeString(event.ts || event.createdAt || event.created_at),
    meta: event.meta && typeof event.meta === 'object' ? structuredClone(event.meta) : {}
  };
}

const ADMIN_CHAT_SEGMENT_LABELS = {
  mine: 'My logged-in chat',
  other_account: 'Other logged-in user',
  guest_unknown: 'Guest / unknown'
};

const ADMIN_CHAT_HANDLING_LABELS = {
  injection_blocked: 'Prompt injection blocked',
  greeting_answered: 'Greeting answered',
  order_brief_prepared: 'Order brief prepared',
  clarified: 'Clarification asked',
  faq_answered: 'FAQ / guidance answered',
  needs_review: 'Needs review'
};

function collectOperatorAccountHashes(state = {}, operator = '') {
  const hashes = new Set();
  const add = (value = '') => {
    const hash = accountHash(value);
    if (hash) hashes.add(hash);
  };
  const operatorLogin = normalizeString(operator).toLowerCase();
  add(operatorLogin);
  for (const account of Array.isArray(state.accounts) ? state.accounts : []) {
    const safe = sanitizeAccountSettingsForClient(account) || {};
    const candidates = [
      safe.login,
      safe.email,
      safe.billing?.billingEmail,
      safe.payout?.payoutEmail,
      ...(Array.isArray(safe.aliases) ? safe.aliases : []),
      ...(Array.isArray(safe.linkedIdentities)
        ? safe.linkedIdentities.flatMap((identity) => [identity.login, identity.email, identity.name])
        : [])
    ].map((item) => normalizeString(item).toLowerCase()).filter(Boolean);
    if (!operatorLogin || !candidates.includes(operatorLogin)) continue;
    candidates.forEach(add);
  }
  return hashes;
}

function classifyAdminChatSegment(chat = {}, operatorHashes = new Set()) {
  const hash = normalizeString(chat.accountHash || chat.account_hash);
  if (hash && operatorHashes.has(hash)) return 'mine';
  if (Boolean(chat.loggedIn || chat.logged_in)) return 'other_account';
  return 'guest_unknown';
}

function classifyAdminChatHandling(chat = {}) {
  const prompt = normalizeString(chat.prompt || '').toLowerCase();
  const answer = normalizeString(chat.answer || '').toLowerCase();
  const combined = `${prompt}\n${answer}`;
  if (/(ignore previous|reveal the system prompt|prompt injection|system prompt|developer message|previous instructions)/i.test(combined)) {
    return 'injection_blocked';
  }
  if (/^(hi|hello|hey|こんにちは|こんばんは|おはよう|やあ|hello world|hi cait|hey cait)[!.。\s]*$/i.test(prompt)) {
    return 'greeting_answered';
  }
  if (/(task:|goal:|deliver:|acceptance:|current draft|structured request|order brief|work split|発注|下書き|実行前|見積)/i.test(answer)) {
    return 'order_brief_prepared';
  }
  if (/(clarifying question|which|choose|select|confirm|確認|質問|選んで|絞り|どちら|必要な情報|教えてください)/i.test(answer)) {
    return 'clarified';
  }
  if (/(pricing|price|deposit|payment|billing|github|login|api key|料金|支払い|ログイン|できること|何ができます|使い方|ヘルプ)/i.test(combined)) {
    return 'faq_answered';
  }
  return 'needs_review';
}

function countBy(items = [], mapper = () => '') {
  return (Array.isArray(items) ? items : []).reduce((acc, item) => {
    const key = normalizeString(mapper(item) || 'unknown');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function buildAdminChatSessions(chatsAll = [], operatorHashes = new Set()) {
  const groups = new Map();
  for (const transcript of Array.isArray(chatsAll) ? chatsAll : []) {
    const chat = sanitizeChatTranscriptForClient(transcript);
    if (!chat.id) continue;
    const fallbackKey = `chat:${chat.id}`;
    const groupKey = normalizeString(chat.sessionId || '').trim() || fallbackKey;
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey).push(chat);
  }
  return [...groups.values()]
    .map((turns) => turns.sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || ''))))
    .map((turns) => {
      const latestTurn = turns[turns.length - 1] || {};
      const firstTurn = turns[0] || latestTurn;
      const latestSegment = classifyAdminChatSegment(latestTurn, operatorHashes);
      const allStatuses = turns.map((turn) => classifyAdminChatHandling(turn));
      const handlingStatus = allStatuses.includes('needs_review')
        ? 'needs_review'
        : (allStatuses[allStatuses.length - 1] || classifyAdminChatHandling(latestTurn));
      const lastPrompts = turns
        .map((turn) => normalizeString(turn.prompt))
        .filter(Boolean)
        .slice(-3);
      return {
        ...latestTurn,
        id: normalizeString(latestTurn.sessionId || firstTurn.sessionId || latestTurn.id || firstTurn.id),
        sessionId: normalizeString(latestTurn.sessionId || firstTurn.sessionId || ''),
        startedAt: firstTurn.createdAt || latestTurn.createdAt || '',
        createdAt: latestTurn.createdAt || firstTurn.createdAt || '',
        updatedAt: latestTurn.updatedAt || latestTurn.createdAt || firstTurn.updatedAt || firstTurn.createdAt || '',
        turnCount: turns.length,
        latestTurnId: normalizeString(latestTurn.id),
        latestReviewStatus: normalizeString(latestTurn.reviewStatus || 'new'),
        latestTaskType: normalizeString(latestTurn.taskType || ''),
        adminSegment: latestSegment,
        adminSegmentLabel: ADMIN_CHAT_SEGMENT_LABELS[latestSegment] || latestSegment,
        handlingStatus,
        handlingLabel: ADMIN_CHAT_HANDLING_LABELS[handlingStatus] || handlingStatus,
        handlingNeedsReview: handlingStatus === 'needs_review',
        recentPrompts: lastPrompts,
        recentPromptPreview: lastPrompts.join(' | '),
        turns
      };
    })
    .sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')));
}

function buildAdminActiveWorkSessions(state = {}, chats = [], operatorHashes = new Set()) {
  const openStatuses = new Set(['queued', 'claimed', 'running', 'dispatched', 'accepted', 'blocked', 'action_required', 'needs_action', 'approval_required', 'connector_required', 'blocked_waiting_for_approval', 'needs_input']);
  const terminalStatuses = new Set(['completed', 'failed', 'timed_out']);
  const existingBySession = new Map();
  const existingByOrder = new Map();
  const existingByPrompt = new Map();
  const promptKey = (value = '') => normalizeString(value).replace(/\s+/g, ' ').trim().slice(0, 1000);
  for (const chat of Array.isArray(chats) ? chats : []) {
    const sessionKey = normalizeString(chat?.sessionId || chat?.id);
    const orderKey = normalizeString(chat?.linkedOrderId);
    const chatPromptKey = promptKey(chat?.prompt || chat?.recentPromptPreview || (Array.isArray(chat?.recentPrompts) ? chat.recentPrompts[0] : ''));
    if (sessionKey && !existingBySession.has(sessionKey)) existingBySession.set(sessionKey, chat);
    if (orderKey && !existingByOrder.has(orderKey)) existingByOrder.set(orderKey, chat);
    if (chatPromptKey && !existingByPrompt.has(chatPromptKey)) existingByPrompt.set(chatPromptKey, chat);
  }
  const activeJobs = (Array.isArray(state?.jobs) ? state.jobs : [])
    .filter((job) => normalizeString(job?.jobKind || 'job').toLowerCase() !== 'workflow_child')
    .sort((left, right) => {
      const leftTs = normalizeString(left?.lastCallbackAt || left?.startedAt || left?.dispatchedAt || left?.createdAt);
      const rightTs = normalizeString(right?.lastCallbackAt || right?.startedAt || right?.dispatchedAt || right?.createdAt);
      const diff = rightTs.localeCompare(leftTs);
      if (diff !== 0) return diff;
      return normalizeString(right?.id).localeCompare(normalizeString(left?.id));
    });
  const appended = [];
  for (const job of activeJobs) {
    const jobId = normalizeString(job?.id).slice(0, 160);
    if (!jobId) continue;
    const explicitSessionId = chatSessionIdForJob(job);
    const sessionId = explicitSessionId || `job_${jobId}`;
    const jobPrompt = normalizeString(job?.prompt).slice(0, CHAT_TRANSCRIPT_PROMPT_MAX_CHARS);
    const displayJobPrompt = orderChatMemoryConversationPrompt(job) || jobPrompt;
    const existing = existingBySession.get(sessionId)
      || existingByOrder.get(jobId)
      || (!explicitSessionId ? existingByPrompt.get(promptKey(displayJobPrompt)) : null)
      || null;
    if (existing) {
      const status = normalizeString(job?.status).toLowerCase();
      existing.activeWork = Boolean(existing.activeWork || !terminalStatuses.has(status));
      existing.linkedOrderId = existing.linkedOrderId || jobId;
      existing.relatedOrderIds = [...new Set([
        ...(Array.isArray(existing.relatedOrderIds) ? existing.relatedOrderIds.map((item) => normalizeString(item)).filter(Boolean) : []),
        existing.linkedOrderId || '',
        jobId
      ].filter(Boolean))];
      if (openStatuses.has(status)) {
        existing.activeJobIds = [...new Set([
          ...(Array.isArray(existing.activeJobIds) ? existing.activeJobIds.map((item) => normalizeString(item)).filter(Boolean) : []),
          jobId
        ])];
      }
      continue;
    }
    const requester = requesterContextFromJob(job);
    const login = normalizeString(requester.login).toLowerCase();
    const authProvider = normalizeString(requester.authProvider || 'guest', 'guest');
    const updatedAt = normalizeString(job?.lastCallbackAt || job?.startedAt || job?.dispatchedAt || job?.createdAt, nowIso());
    const createdAt = normalizeString(job?.createdAt, updatedAt);
    const status = normalizeString(job?.status, 'running').toLowerCase() || 'running';
    const statusLabel = orderChatMemoryStatusLabel(status);
    const synthetic = {
      id: sessionId,
      sessionId: explicitSessionId || '',
      prompt: displayJobPrompt,
      answer: orderChatMemoryCompressedAnswer(job, statusLabel),
      answerKind: 'order',
      status,
      taskType: normalizeString(job?.taskType),
      latestTaskType: normalizeString(job?.taskType),
      redacted: false,
      createdAt,
      updatedAt,
      startedAt: createdAt,
      turnCount: 1,
      latestTurnId: '',
      latestReviewStatus: 'new',
      loggedIn: Boolean(login),
      authProvider,
      accountHash: accountHash(login),
      adminSegment: classifyAdminChatSegment({ loggedIn: Boolean(login), accountHash: accountHash(login) }, operatorHashes),
      adminSegmentLabel: '',
      handlingStatus: 'order_brief_prepared',
      handlingLabel: ADMIN_CHAT_HANDLING_LABELS.order_brief_prepared,
      handlingNeedsReview: false,
      recentPrompts: [displayJobPrompt].filter(Boolean),
      recentPromptPreview: displayJobPrompt.slice(0, 160),
      turns: [],
      activeWork: !terminalStatuses.has(status),
      activeJobIds: openStatuses.has(status) ? [jobId] : [],
      relatedOrderIds: [jobId],
      linkedOrderId: jobId
    };
    synthetic.adminSegmentLabel = ADMIN_CHAT_SEGMENT_LABELS[synthetic.adminSegment] || synthetic.adminSegment;
    appended.push(synthetic);
  }
  return [...(Array.isArray(chats) ? chats : []), ...appended]
    .sort((left, right) => String(right.updatedAt || right.createdAt || '').localeCompare(String(left.updatedAt || left.createdAt || '')));
}

export function buildAdminDashboard(state = {}, options = {}) {
  const nowMs = Date.now();
  const compactMode = Boolean(options.compact);
  const limitList = (items = [], key = '', fallback = Infinity) => {
    const raw = Number(options?.limits?.[key] ?? fallback);
    const limit = Number.isFinite(raw) ? Math.max(0, raw) : Infinity;
    return limit === Infinity ? items : items.slice(0, limit);
  };
  const compactChatSession = (chat = {}) => {
    if (!compactMode) return chat;
    const { turns, ...rest } = chat || {};
    return {
      ...rest,
      turnPreviewCount: Array.isArray(turns) ? turns.length : Number(chat?.turnCount || 0)
    };
  };
  const rawChatTranscripts = Array.isArray(state?.chatTranscripts) ? state.chatTranscripts : [];
  const accountsAll = sortItemsByLatest((Array.isArray(state?.accounts) ? state.accounts : []).map(adminAccountView), 'updatedAt');
  const accounts = limitList(accountsAll, 'accounts');
  const agentsAll = sortItemsByLatest((Array.isArray(state?.agents) ? state.agents : []).map(adminAgentView), 'updatedAt');
  const agents = limitList(agentsAll, 'agents');
  const ordersAll = sortItemsByLatest((Array.isArray(state?.jobs) ? state.jobs : []).map(adminOrderView), 'createdAt');
  const orders = limitList(ordersAll, 'orders');
  const reportsAll = sortItemsByLatest((Array.isArray(state?.feedbackReports) ? state.feedbackReports : [])
    .map((report) => sanitizeFeedbackReportForClient(report))
  , 'createdAt');
  const reports = limitList(reportsAll, 'reports');
  const operatorHashes = collectOperatorAccountHashes(state, options.operator || '');
  const compactChatLimit = Number(options?.limits?.chats || 120);
  const compactTranscriptLimit = Math.max(200, compactChatLimit * 5);
  const chatTurnsSource = compactMode
    ? []
    : rawChatTranscripts;
  const chatTurnsAll = chatTurnsSource
    .map((chat) => sanitizeChatTranscriptForClient(chat))
    .filter((chat) => chat.id)
    .sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')));
  const chatsAll = buildAdminActiveWorkSessions(state, buildAdminChatSessions(chatTurnsAll, operatorHashes), operatorHashes);
  const chats = limitList(chatsAll, 'chats').map(compactChatSession);
  const chatSummaryTotal = compactMode ? Math.max(rawChatTranscripts.length, chatsAll.length) : chatsAll.length;
  const chatTurnsTotal = compactMode ? rawChatTranscripts.length : chatTurnsAll.length;
  const chatLast24h = compactMode ? 0 : countRecentActuals(chatsAll, 1, nowMs);
  const chatLast7d = compactMode ? 0 : countRecentActuals(chatsAll, 7, nowMs);
  const eventsAll = sortItemsByLatest((Array.isArray(state?.events) ? state.events : []).map(adminEventView), 'ts');
  const events = limitList(eventsAll, 'events');
  const userAgents = agentsAll.filter((agent) => agent.owner && !['aiagent2', 'system', 'cait-samples', 'sample-agent'].includes(agent.owner.toLowerCase()));
  const activeOrders = ordersAll.filter((job) => ['queued', 'claimed', 'running', 'dispatched'].includes(job.status)).length;
  const failedOrders = ordersAll.filter((job) => ['failed', 'timed_out'].includes(job.status)).length;
  const completedOrders = ordersAll.filter((job) => job.status === 'completed').length;
  const providerBillingAccounts = accountsAll.filter((account) => account.providerEnabled || account.providerMonthlyRetryCount > 0 || account.pendingProviderBalance > 0);
  const providerBillingRetrying = providerBillingAccounts.filter((account) => account.providerMonthlyRetryCount > 0).length;
  const providerBillingNotified = providerBillingAccounts.filter((account) => account.providerMonthlyLastNotificationPeriod).length;
  const chatSegments = {
    mine: chatsAll.filter((chat) => chat.adminSegment === 'mine').length,
    otherLoggedIn: chatsAll.filter((chat) => chat.adminSegment === 'other_account').length,
    guestUnknown: chatsAll.filter((chat) => chat.adminSegment === 'guest_unknown').length
  };
  chatSegments.nonMine = chatSegments.otherLoggedIn + chatSegments.guestUnknown;
  const nonMineChats = chatsAll.filter((chat) => chat.adminSegment !== 'mine');
  const handlingByStatus = countBy(nonMineChats, (chat) => chat.handlingStatus);
  const handledNonMine = nonMineChats.length - (handlingByStatus.needs_review || 0);
  return {
    generatedAt: nowIso(),
    operator: normalizeString(options.operator || ''),
    summary: {
      accounts: {
        total: accountsAll.length,
        last24h: countRecentActuals(accountsAll, 1, nowMs),
        last7d: countRecentActuals(accountsAll, 7, nowMs)
      },
      chats: {
        total: chatSummaryTotal,
        last24h: chatLast24h,
        last7d: chatLast7d,
        turnsTotal: chatTurnsTotal,
        mine: chatSegments.mine,
        otherLoggedIn: chatSegments.otherLoggedIn,
        guestUnknown: chatSegments.guestUnknown,
        nonMine: chatSegments.nonMine,
        handledNonMine,
        needsReviewNonMine: handlingByStatus.needs_review || 0
      },
      agents: {
        total: agentsAll.length,
        userAgents: userAgents.length,
        ready: agentsAll.filter((agent) => agent.ready).length,
        last24h: countRecentActuals(agentsAll, 1, nowMs),
        last7d: countRecentActuals(agentsAll, 7, nowMs)
      },
      orders: {
        total: ordersAll.length,
        active: activeOrders,
        completed: completedOrders,
        failed: failedOrders,
        last24h: countRecentActuals(ordersAll, 1, nowMs),
        last7d: countRecentActuals(ordersAll, 7, nowMs)
      },
      reports: {
        total: reportsAll.length,
        open: reportsAll.filter((report) => report.status === 'open').length,
        reviewing: reportsAll.filter((report) => report.status === 'reviewing').length,
        resolved: reportsAll.filter((report) => report.status === 'resolved').length,
        last24h: countRecentActuals(reportsAll, 1, nowMs),
        last7d: countRecentActuals(reportsAll, 7, nowMs)
      },
      providerBilling: {
        accounts: providerBillingAccounts.length,
        retrying: providerBillingRetrying,
        notified: providerBillingNotified
      }
    },
    accounts,
    chats,
    chatSegments,
    chatHandling: {
      nonMineTotal: nonMineChats.length,
      handledNonMine,
      needsReviewNonMine: handlingByStatus.needs_review || 0,
      byStatus: handlingByStatus
    },
    agents,
    orders,
    reports,
    events,
    conversionAnalytics: options.includeConversionAnalytics === false ? null : buildConversionAnalytics(state)
  };
}
