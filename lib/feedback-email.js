import { formatFeedbackReportEmail } from './shared.js';

function feedbackEmailAddress(value = '', fallback = 'support@aiagent-marketplace.net') {
  const text = String(value || '').trim();
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(text) ? text : fallback;
}

export async function forwardFeedbackReportEmail(report, env) {
  const binding = env?.FEEDBACK_EMAIL || env?.SEND_FEEDBACK_EMAIL || env?.SEND_EMAIL || null;
  if (!binding || typeof binding.send !== 'function') {
    return { ok: false, skipped: true, status: 'not_configured' };
  }
  const email = formatFeedbackReportEmail(report, {
    to: feedbackEmailAddress(env?.FEEDBACK_EMAIL_TO),
    from: feedbackEmailAddress(env?.FEEDBACK_EMAIL_FROM)
  });
  const deliveryTo = feedbackEmailAddress(env?.FEEDBACK_EMAIL_DELIVERY_TO || 'yasuikunihiro@gmail.com');
  try {
    const { EmailMessage } = await import('cloudflare:email');
    await binding.send(new EmailMessage(email.from, deliveryTo, email.raw));
    return { ok: true, status: 'sent', to: email.to, deliveryTo, subject: email.subject };
  } catch (error) {
    return {
      ok: false,
      status: 'failed',
      error: String(error?.message || error || 'email send failed').slice(0, 240)
    };
  }
}
