import { buildMonthlyAccountSummary, nowIso } from './shared.js';
import { WORK_ORDER_UI_LABELS } from '../public/work-action-registry.js';

const SIGNUP_WELCOME_EMAIL_TEMPLATE = 'signup_welcome_v2';

export function validateEmailAddress(value = '') {
  const text = String(value || '').trim();
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(text);
}

function resendApiKey(env) {
  return String(env?.RESEND_API_KEY || '').trim();
}

export function resendConfigured(env) {
  return Boolean(resendApiKey(env));
}

function resendFromEmail(env) {
  const configured = String(env?.RESEND_FROM_EMAIL || env?.WELCOME_EMAIL_FROM || '').trim();
  if (validateEmailAddress(configured)) return configured;
  return 'hello@aiagent-marketplace.net';
}

function resendReplyToEmail(env) {
  const configured = String(env?.RESEND_REPLY_TO_EMAIL || '').trim();
  return validateEmailAddress(configured) ? configured : resendFromEmail(env);
}

function emailHtmlEscape(value = '') {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function welcomeEmailContent(name = '') {
  const displayName = String(name || '').trim() || 'there';
  const safeDisplayName = emailHtmlEscape(displayName);
  const subject = 'Welcome to CAIt: start in Chat';
  const text = [
    `Hi ${displayName},`,
    '',
    'Welcome to CAIt.',
    '',
    'CAIt now starts from Chat. Tell CAIt what outcome you want, answer any intake questions, review the prepared order, and send it when the scope looks right.',
    '',
    'Start here:',
    '1. Open Chat',
    '2. Describe the result you want in one message',
    '3. Answer the leader or specialist intake questions',
    '4. Review the prepared order and agent route',
    `5. Press ${WORK_ORDER_UI_LABELS.sendOrder}`,
    '',
    'Good first prompts:',
    '- Plan a customer acquisition campaign and turn it into execution steps',
    '- Fix a bug in my GitHub repo and open a PR',
    '- Prepare an SEO or landing-page draft and send it to Publisher',
    '- Build a campaign operations plan and define the measurement loop',
    '- Research competitors and turn the findings into an execution plan',
    '',
    'What CAIt does after that:',
    '- Routes broad work to the right leader, or focused work directly to a specialist agent',
    '- Keeps built-in, sample, and external agents on the same provider contract',
    '- Shows connector or approval requests only when the responsible agent or app asks for them',
    '- Sends publishable content through Publisher & Approval Studio before external action',
    '- Lets campaign work continue through Campaign Operations, metrics, and follow-up chat',
    '',
    'Useful places:',
    '- Chat: https://aiagent-marketplace.net/chat',
    '- Apps: https://aiagent-marketplace.net/apps.html',
    '- Publisher & Approval Studio: https://aiagent-marketplace.net/publisher-approval.html',
    '- Campaign Operations: https://aiagent-marketplace.net/campaign-operations.html',
    '',
    'Beta note: registration, chat, app handoffs, and agent workflows are available. Live checkout, charges, and payout movement are paused during beta. First-time accounts can use the beta welcome allowance up to $10 in credits.',
    '',
    'Thanks,',
    'CAIt'
  ].join('\n');
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:640px">
      <p>Hi ${safeDisplayName},</p>
      <p>Welcome to <strong>CAIt</strong>.</p>
      <p>CAIt now starts from <strong>Chat</strong>. Tell CAIt what outcome you want, answer any intake questions, review the prepared order, and send it when the scope looks right.</p>
      <p><strong>Start here</strong></p>
      <ol>
        <li>Open <strong>Chat</strong></li>
        <li>Describe the result you want in one message</li>
        <li>Answer the leader or specialist intake questions</li>
        <li>Review the prepared order and agent route</li>
        <li>Press <strong>${WORK_ORDER_UI_LABELS.sendOrder}</strong></li>
      </ol>
      <p><strong>Good first prompts</strong></p>
      <ul>
        <li>Plan a customer acquisition campaign and turn it into execution steps</li>
        <li>Fix a bug in my GitHub repo and open a PR</li>
        <li>Prepare an SEO or landing-page draft and send it to Publisher</li>
        <li>Build a campaign operations plan and define the measurement loop</li>
        <li>Research competitors and turn it into an execution plan</li>
      </ul>
      <p><strong>What CAIt does after that</strong></p>
      <ul>
        <li>Routes broad work to the right leader, or focused work directly to a specialist agent</li>
        <li>Keeps built-in, sample, and external agents on the same provider contract</li>
        <li>Shows connector or approval requests only when the responsible agent or app asks for them</li>
        <li>Sends publishable content through Publisher &amp; Approval Studio before external action</li>
        <li>Lets campaign work continue through Campaign Operations, metrics, and follow-up chat</li>
      </ul>
      <p><strong>Useful places</strong></p>
      <ul>
        <li><a href="https://aiagent-marketplace.net/chat">Chat</a></li>
        <li><a href="https://aiagent-marketplace.net/apps.html">Apps</a></li>
        <li><a href="https://aiagent-marketplace.net/publisher-approval.html">Publisher &amp; Approval Studio</a></li>
        <li><a href="https://aiagent-marketplace.net/campaign-operations.html">Campaign Operations</a></li>
      </ul>
      <p><strong>Beta note:</strong> registration, chat, app handoffs, and agent workflows are available. Live checkout, charges, and payout movement are paused during beta. First-time accounts can use the beta welcome allowance up to $10 in credits.</p>
      <p>Thanks,<br />CAIt</p>
    </div>
  `.trim();
  return { subject, text, html, template: SIGNUP_WELCOME_EMAIL_TEMPLATE };
}

function emailAuthLinkContent(email = '', link = '') {
  const safeEmail = String(email || '').trim().toLowerCase();
  const safeLink = String(link || '').trim();
  const subject = 'Your CAIt sign-in link';
  const text = [
    `Hi ${safeEmail || 'there'},`,
    '',
    'Use this link to sign in to CAIt or create your account:',
    safeLink,
    '',
    'The link expires in 20 minutes.',
    'If you did not request this email, you can ignore it.'
  ].join('\n');
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
      <p>Hi ${safeEmail || 'there'},</p>
      <p>Use this link to sign in to CAIt or create your account:</p>
      <p><a href="${safeLink}">Open CAIt sign-in link</a></p>
      <p>This link expires in 20 minutes.</p>
      <p>If you did not request this email, you can ignore it.</p>
    </div>
  `.trim();
  return { subject, text, html, template: 'email_auth_link_v1' };
}

function monthlyUpdateTimeZone(env) {
  return String(env?.MONTHLY_UPDATE_TIMEZONE || 'Asia/Tokyo').trim() || 'Asia/Tokyo';
}

function localDateParts(value = nowIso(), timeZone = 'Asia/Tokyo') {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date);
  const read = (type) => parts.find((part) => part.type === type)?.value || '';
  return {
    year: Number(read('year') || 0),
    month: Number(read('month') || 0),
    day: Number(read('day') || 0),
    hour: Number(read('hour') || 0),
    minute: Number(read('minute') || 0)
  };
}

function periodLabel(period = '') {
  const match = String(period || '').match(/^(\d{4})-(\d{2})$/);
  if (!match) return String(period || '');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const date = new Date(Date.UTC(year, Math.max(0, month - 1), 1));
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
}

function previousMonthlyUpdatePeriod(env, at = nowIso()) {
  const parts = localDateParts(at, monthlyUpdateTimeZone(env));
  let year = parts.year;
  let month = parts.month - 1;
  if (month <= 0) {
    year -= 1;
    month = 12;
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
}

function monthlyUpdateHighlights(env) {
  const raw = env?.MONTHLY_UPDATE_HIGHLIGHTS;
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 5);
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 5);
    } catch {}
    return raw
      .split(/\r?\n+/)
      .map((item) => item.replace(/^[-*]\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 5);
  }
  return [
    'CAIt now asks for GitHub, Google, X, or Gmail access only when that specific task actually needs it.',
    'Follow-up from a delivery is more direct: article, code, report, and post outputs can move into the next action flow from chat.',
    'Team execution is clearer: blockers, approvals, and follow-up steps stay in the same work thread.'
  ];
}

function monthlyUpdateEnabledForAccount(account = null) {
  return account?.emailPreferences?.monthlyUpdatesEnabled !== false;
}

function majorTaskTypesForRuns(runs = []) {
  const counts = new Map();
  for (const run of Array.isArray(runs) ? runs : []) {
    const taskType = String(run?.taskType || '').trim().toLowerCase();
    if (!taskType) continue;
    counts.set(taskType, (counts.get(taskType) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([taskType]) => taskType);
}

function monthlyUpdateAlreadySent(state = {}, login = '', period = '') {
  const safeLogin = String(login || '').trim().toLowerCase();
  const safePeriod = String(period || '').trim();
  if (!safeLogin || !safePeriod) return false;
  return (Array.isArray(state?.emailDeliveries) ? state.emailDeliveries : []).some((delivery) => {
    if (String(delivery?.accountLogin || '').trim().toLowerCase() !== safeLogin) return false;
    if (String(delivery?.template || '').trim().toLowerCase() !== 'monthly_update_v1') return false;
    if (String(delivery?.status || '').trim().toLowerCase() !== 'sent') return false;
    const payloadPeriod = String(delivery?.payload?.period || delivery?.payload_json?.period || '').trim();
    return payloadPeriod === safePeriod;
  });
}

export function shouldSendMonthlyUpdateNow(env, at = nowIso()) {
  const parts = localDateParts(at, monthlyUpdateTimeZone(env));
  const sendDay = Math.max(1, Math.min(28, Number(env?.MONTHLY_UPDATE_SEND_DAY || 1) || 1));
  const sendHour = Math.max(0, Math.min(23, Number(env?.MONTHLY_UPDATE_SEND_HOUR || 9) || 9));
  return parts.day === sendDay && parts.hour === sendHour && parts.minute < 15;
}

function buildMonthlyUpdateEmailContent(state = {}, account = null, options = {}) {
  const period = String(options?.period || '').trim() || previousMonthlyUpdatePeriod({}, nowIso());
  const label = periodLabel(period);
  const displayName = String(account?.profile?.displayName || account?.login || '').trim() || 'there';
  const safeDisplayName = emailHtmlEscape(displayName);
  const safeLabel = emailHtmlEscape(label);
  const accountSummary = buildMonthlyAccountSummary(state, String(account?.login || '').trim().toLowerCase(), period, account);
  const customerRunCount = Number(accountSummary?.customer?.runCount || 0);
  const topTasks = majorTaskTypesForRuns(accountSummary?.customer?.runs || []);
  const highlights = monthlyUpdateHighlights(options?.env || {});
  const subject = `CAIt monthly update — ${label}`;
  const text = [
    `Hi ${displayName},`,
    '',
    `Here is the CAIt monthly update for ${label}.`,
    '',
    'Big changes:',
    ...highlights.map((item) => `- ${item}`),
    '',
    'Your usage:',
    customerRunCount > 0
      ? `- ${customerRunCount} completed run${customerRunCount === 1 ? '' : 's'}${topTasks.length ? ` · main work types: ${topTasks.join(', ')}` : ''}`
      : '- No completed runs yet',
    '',
    'What to do next:',
    '- Open Chat and describe the next outcome you want.',
    '- Use Apps for Analytics, Publisher, Lead Ops, Delivery Manager, and Campaign Operations handoffs.',
    '- If the responsible agent or app needs GitHub, Google, X, Gmail, WordPress, or another connector, CAIt will ask during execution.',
    '',
    'Open Chat: https://aiagent-marketplace.net/chat',
    '',
    'CAIt'
  ].join('\n');
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:640px">
      <p>Hi ${safeDisplayName},</p>
      <p>Here is the <strong>CAIt monthly update</strong> for <strong>${safeLabel}</strong>.</p>
      <p><strong>Big changes</strong></p>
      <ul>${highlights.map((item) => `<li>${emailHtmlEscape(item)}</li>`).join('')}</ul>
      <p><strong>Your usage</strong></p>
      <ul>
        <li>${customerRunCount > 0 ? `${customerRunCount} completed run${customerRunCount === 1 ? '' : 's'}${topTasks.length ? ` · main work types: ${emailHtmlEscape(topTasks.join(', '))}` : ''}` : 'No completed runs yet'}</li>
      </ul>
      <p><strong>What to do next</strong></p>
      <ul>
        <li>Open Chat and describe the next outcome you want.</li>
        <li>Use Apps for Analytics, Publisher, Lead Ops, Delivery Manager, and Campaign Operations handoffs.</li>
        <li>If the responsible agent or app needs GitHub, Google, X, Gmail, WordPress, or another connector, CAIt will ask during execution.</li>
      </ul>
      <p><a href="https://aiagent-marketplace.net/chat">Open Chat</a></p>
      <p>CAIt</p>
    </div>
  `.trim();
  return { subject, text, html, template: 'monthly_update_v1', period };
}

function accountEmailCandidates(account = null, user = null) {
  const identities = Array.isArray(account?.linkedIdentities) ? account.linkedIdentities : [];
  const values = [
    user?.email,
    account?.login,
    account?.billing?.billingEmail,
    account?.payout?.payoutEmail,
    ...identities.map((identity) => identity?.email)
  ];
  return [...new Set(values.map((value) => String(value || '').trim().toLowerCase()).filter((value) => validateEmailAddress(value)))];
}

export async function appendEmailDelivery(storage, delivery) {
  if (typeof storage.appendEmailDelivery === 'function') {
    await storage.appendEmailDelivery(delivery);
    return delivery;
  }
  await storage.mutate(async (draft) => {
    if (!Array.isArray(draft.emailDeliveries)) draft.emailDeliveries = [];
    draft.emailDeliveries.unshift(delivery);
  });
  return delivery;
}

export async function sendResendEmail(env, payload = {}) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${resendApiKey(env)}`,
      'content-type': 'application/json',
      accept: 'application/json'
    },
    body: JSON.stringify({
      from: payload.from,
      to: [payload.to],
      reply_to: payload.replyTo || undefined,
      subject: payload.subject,
      text: payload.text,
      html: payload.html
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.message || data?.error || `Resend send failed (${response.status})`);
    error.statusCode = response.status;
    error.payload = data;
    throw error;
  }
  return data;
}

export function createEmailNotificationHelpers(deps = {}) {
  const {
    claimSignupWelcomeEmailAttempt,
    touchEvent
  } = deps;

  async function sendEmailAuthLink(storage, env, email = '', link = '', meta = {}) {
    const recipientEmail = String(email || '').trim().toLowerCase();
    const content = emailAuthLinkContent(recipientEmail, link);
    const baseDelivery = {
      id: crypto.randomUUID(),
      accountLogin: recipientEmail,
      recipientEmail,
      senderEmail: resendFromEmail(env),
      subject: content.subject,
      template: content.template,
      provider: 'resend',
      status: 'queued',
      providerMessageId: '',
      payload: {
        authProvider: 'email',
        from: resendFromEmail(env),
        replyTo: resendReplyToEmail(env),
        to: recipientEmail,
        subject: content.subject,
        text: content.text,
        html: content.html,
        returnTo: String(meta.returnTo || '').trim(),
        loginSource: String(meta.loginSource || '').trim(),
        visitorId: String(meta.visitorId || '').trim()
      },
      response: {},
      errorText: '',
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    if (!validateEmailAddress(recipientEmail)) {
      const skipped = { ...baseDelivery, status: 'skipped', errorText: 'Valid recipient email is required' };
      await appendEmailDelivery(storage, skipped);
      return skipped;
    }
    if (!resendConfigured(env)) {
      const skipped = { ...baseDelivery, status: 'skipped', errorText: 'RESEND_API_KEY not configured' };
      await appendEmailDelivery(storage, skipped);
      return skipped;
    }
    try {
      const sent = await sendResendEmail(env, {
        from: resendFromEmail(env),
        replyTo: resendReplyToEmail(env),
        to: recipientEmail,
        subject: content.subject,
        text: content.text,
        html: content.html
      });
      const delivery = {
        ...baseDelivery,
        status: 'sent',
        providerMessageId: String(sent?.id || ''),
        response: sent,
        updatedAt: nowIso()
      };
      await appendEmailDelivery(storage, delivery);
      await touchEvent(storage, 'EMAIL', `${recipientEmail} email sign-in link sent`, {
        login: recipientEmail,
        to: recipientEmail,
        template: content.template,
        provider: 'resend',
        providerMessageId: delivery.providerMessageId
      });
      return delivery;
    } catch (error) {
      const failed = {
        ...baseDelivery,
        status: 'failed',
        response: error?.payload || {},
        errorText: String(error?.message || error || 'email auth link send failed').slice(0, 500),
        updatedAt: nowIso()
      };
      await appendEmailDelivery(storage, failed);
      await touchEvent(storage, 'FAILED', `${recipientEmail} email sign-in link failed`, {
        login: recipientEmail,
        to: recipientEmail,
        template: content.template,
        provider: 'resend',
        error: failed.errorText
      });
      return failed;
    }
  }

  async function maybeSendMonthlyUpdateEmail(storage, env, state, account, options = {}) {
    const period = String(options?.period || '').trim() || previousMonthlyUpdatePeriod(env, options?.at || nowIso());
    const force = options?.force === true;
    const recipientEmail = accountEmailCandidates(account, null)[0] || '';
    if (!monthlyUpdateEnabledForAccount(account)) return { skipped: true, reason: 'monthly_updates_disabled', accountLogin: account?.login || '' };
    if (!force && monthlyUpdateAlreadySent(state, account?.login || '', period)) {
      return { skipped: true, reason: 'already_sent', accountLogin: account?.login || '', period };
    }
    const content = buildMonthlyUpdateEmailContent(state, account, { period, env });
    const baseDelivery = {
      id: crypto.randomUUID(),
      accountLogin: String(account?.login || '').trim().toLowerCase(),
      recipientEmail,
      senderEmail: resendFromEmail(env),
      subject: content.subject,
      template: content.template,
      provider: 'resend',
      status: 'queued',
      providerMessageId: '',
      payload: {
        period,
        from: resendFromEmail(env),
        replyTo: resendReplyToEmail(env),
        to: recipientEmail,
        subject: content.subject,
        text: content.text,
        html: content.html
      },
      response: {},
      errorText: '',
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    if (!recipientEmail) {
      const skipped = { ...baseDelivery, status: 'skipped', errorText: 'No valid recipient email on account' };
      await appendEmailDelivery(storage, skipped);
      return skipped;
    }
    if (!resendConfigured(env)) {
      const skipped = { ...baseDelivery, status: 'skipped', errorText: 'RESEND_API_KEY not configured' };
      await appendEmailDelivery(storage, skipped);
      return skipped;
    }
    try {
      const sent = await sendResendEmail(env, {
        from: resendFromEmail(env),
        replyTo: resendReplyToEmail(env),
        to: recipientEmail,
        subject: content.subject,
        text: content.text,
        html: content.html
      });
      const delivery = {
        ...baseDelivery,
        status: 'sent',
        providerMessageId: String(sent?.id || ''),
        response: sent,
        updatedAt: nowIso()
      };
      await appendEmailDelivery(storage, delivery);
      await touchEvent(storage, 'EMAIL', `${account.login} monthly update sent`, {
        login: account.login,
        to: recipientEmail,
        template: content.template,
        period,
        provider: 'resend',
        providerMessageId: delivery.providerMessageId
      });
      return delivery;
    } catch (error) {
      const failed = {
        ...baseDelivery,
        status: 'failed',
        response: error?.payload || {},
        errorText: String(error?.message || error || 'monthly update send failed').slice(0, 500),
        updatedAt: nowIso()
      };
      await appendEmailDelivery(storage, failed);
      await touchEvent(storage, 'FAILED', `${account.login} monthly update failed`, {
        login: account.login,
        to: recipientEmail,
        template: content.template,
        period,
        provider: 'resend',
        error: failed.errorText
      });
      return failed;
    }
  }

  async function maybeSendSignupWelcomeEmail(storage, env, account, user = null, authProvider = 'guest', options = {}) {
    const claim = options?.alreadyClaimed
      ? { claimed: true, account: account || null }
      : await claimSignupWelcomeEmailAttempt(storage, account, user, authProvider);
    if (!claim.claimed) {
      return {
        id: crypto.randomUUID(),
        accountLogin: String(claim.account?.login || account?.login || '').trim().toLowerCase(),
        recipientEmail: accountEmailCandidates(claim.account || account, user)[0] || '',
        senderEmail: resendFromEmail(env),
        subject: '',
        template: SIGNUP_WELCOME_EMAIL_TEMPLATE,
        provider: 'resend',
        status: 'skipped',
        providerMessageId: '',
        payload: {},
        response: {},
        errorText: 'Signup welcome email already attempted',
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
    }
    const activeAccount = claim.account || account;
    const recipientEmail = accountEmailCandidates(activeAccount, user)[0] || '';
    const content = welcomeEmailContent(activeAccount?.profile?.displayName || user?.name || activeAccount?.login || '');
    const baseDelivery = {
      id: crypto.randomUUID(),
      accountLogin: String(activeAccount?.login || '').trim().toLowerCase(),
      recipientEmail,
      senderEmail: resendFromEmail(env),
      subject: content.subject,
      template: content.template,
      provider: 'resend',
      status: 'queued',
      providerMessageId: '',
      payload: {
        authProvider,
        from: resendFromEmail(env),
        replyTo: resendReplyToEmail(env),
        to: recipientEmail,
        subject: content.subject,
        text: content.text,
        html: content.html
      },
      response: {},
      errorText: '',
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    if (!recipientEmail) {
      const skipped = {
        ...baseDelivery,
        status: 'skipped',
        errorText: 'No valid recipient email on account'
      };
      await appendEmailDelivery(storage, skipped);
      return skipped;
    }
    if (!resendConfigured(env)) {
      const skipped = {
        ...baseDelivery,
        status: 'skipped',
        errorText: 'RESEND_API_KEY not configured'
      };
      await appendEmailDelivery(storage, skipped);
      return skipped;
    }
    try {
      const sent = await sendResendEmail(env, {
        from: resendFromEmail(env),
        replyTo: resendReplyToEmail(env),
        to: recipientEmail,
        subject: content.subject,
        text: content.text,
        html: content.html
      });
      const delivery = {
        ...baseDelivery,
        status: 'sent',
        providerMessageId: String(sent?.id || ''),
        response: sent,
        updatedAt: nowIso()
      };
      await appendEmailDelivery(storage, delivery);
      await touchEvent(storage, 'EMAIL', `${activeAccount.login} welcome email sent`, {
        login: activeAccount.login,
        to: recipientEmail,
        template: content.template,
        provider: 'resend',
        providerMessageId: delivery.providerMessageId
      });
      return delivery;
    } catch (error) {
      const failed = {
        ...baseDelivery,
        status: 'failed',
        response: error?.payload || {},
        errorText: String(error?.message || error || 'welcome email send failed').slice(0, 500),
        updatedAt: nowIso()
      };
      await appendEmailDelivery(storage, failed);
      await touchEvent(storage, 'FAILED', `${activeAccount.login} welcome email failed`, {
        login: activeAccount.login,
        to: recipientEmail,
        template: content.template,
        provider: 'resend',
        error: failed.errorText
      });
      return failed;
    }
  }

  return {
    maybeSendMonthlyUpdateEmail,
    maybeSendSignupWelcomeEmail,
    sendEmailAuthLink
  };
}
