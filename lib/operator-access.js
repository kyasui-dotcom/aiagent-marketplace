export function boolFlag(raw, fallback = false) {
  const value = String(raw ?? '').trim().toLowerCase();
  if (!value) return fallback;
  if (['1', 'true', 'yes', 'on'].includes(value)) return true;
  if (['0', 'false', 'no', 'off'].includes(value)) return false;
  return fallback;
}

export function runtimePolicy(env) {
  const openWriteApiEnabled = boolFlag(env?.ALLOW_OPEN_WRITE_API, false);
  const guestRunReadEnabled = boolFlag(env?.ALLOW_GUEST_RUN_READ_API, openWriteApiEnabled);
  const devApiEnabled = boolFlag(env?.ALLOW_DEV_API, false);
  const exposeJobSecrets = boolFlag(env?.EXPOSE_JOB_SECRETS, openWriteApiEnabled || devApiEnabled);
  const configuredStage = String(env?.RELEASE_STAGE || '').trim();
  const billingActivationEnabled = boolFlag(env?.BILLING_ACTIVATION_ENABLED ?? env?.BILLING_ACTIVATED, false);
  const betaBillingPaused = boolFlag(env?.BETA_BILLING_PAUSED ?? env?.BILLING_PAUSED, !billingActivationEnabled);
  return {
    releaseStage: configuredStage || ((openWriteApiEnabled || devApiEnabled) ? 'development' : 'public'),
    openWriteApiEnabled,
    guestRunReadEnabled,
    devApiEnabled,
    exposeJobSecrets,
    billingActivationEnabled,
    billingPaused: betaBillingPaused
  };
}

export function normalizedLoginList(raw = '') {
  return [...new Set(String(raw || '')
    .split(',')
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean))];
}

export function feedbackReviewerLogins(env) {
  return normalizedLoginList(env?.FEEDBACK_REVIEWER_LOGINS || env?.ADMIN_LOGINS || '');
}

export function agentReviewerLogins(env) {
  return normalizedLoginList(env?.AGENT_REVIEWER_LOGINS || env?.FEEDBACK_REVIEWER_LOGINS || env?.ADMIN_LOGINS || '');
}

export function platformAdminLogins(env) {
  return normalizedLoginList(env?.ADMIN_DASHBOARD_LOGINS || 'yasuikunihiro@gmail.com');
}

export function createOperatorAccessHelpers(deps = {}) {
  const {
    agentReviewerLogins: agentReviewerLoginsForEnv = agentReviewerLogins,
    feedbackReviewerLogins: feedbackReviewerLoginsForEnv = feedbackReviewerLogins,
    identityLoginsForCurrent,
    platformAdminLogins: platformAdminLoginsForEnv = platformAdminLogins,
    runtimePolicy: runtimePolicyForEnv = runtimePolicy,
    WORK_ORDER_UI_LABELS
  } = deps;

  function canViewAdminDashboard(current, env) {
    if (!current?.user) return false;
    const admins = platformAdminLoginsForEnv(env);
    return identityLoginsForCurrent(current).some((login) => admins.includes(login));
  }

  function orderUiLabelsFromAppSettings(settings = {}) {
    return {
      sendOrder: String(settings?.work_order_send_label || WORK_ORDER_UI_LABELS.sendOrder).trim() || WORK_ORDER_UI_LABELS.sendOrder,
      addConstraints: String(settings?.work_order_add_constraints_label || WORK_ORDER_UI_LABELS.addConstraints).trim() || WORK_ORDER_UI_LABELS.addConstraints,
      prepareOrder: String(settings?.work_order_prepare_label || WORK_ORDER_UI_LABELS.prepareOrder).trim() || WORK_ORDER_UI_LABELS.prepareOrder,
      sendChat: String(settings?.work_chat_send_label || WORK_ORDER_UI_LABELS.sendChat).trim() || WORK_ORDER_UI_LABELS.sendChat,
      answerFirst: String(settings?.work_order_answer_first_label || WORK_ORDER_UI_LABELS.answerFirst).trim() || WORK_ORDER_UI_LABELS.answerFirst,
      revise: String(settings?.work_order_revise_label || WORK_ORDER_UI_LABELS.revise).trim() || WORK_ORDER_UI_LABELS.revise,
      cancel: String(settings?.work_order_cancel_label || WORK_ORDER_UI_LABELS.cancel).trim() || WORK_ORDER_UI_LABELS.cancel
    };
  }

  function canUsePlatformResend(current, env) {
    const admins = platformAdminLoginsForEnv(env);
    return identityLoginsForCurrent(current).some((login) => admins.includes(login));
  }

  function canReviewFeedbackReports(current, env) {
    if (!current?.login) return false;
    const reviewers = feedbackReviewerLoginsForEnv(env);
    if (canViewAdminDashboard(current, env)) return true;
    if (!reviewers.length) return runtimePolicyForEnv(env).releaseStage !== 'public';
    return reviewers.includes(String(current.login).toLowerCase());
  }

  function canReviewAgents(current, env) {
    if (!current?.login) return false;
    const reviewers = agentReviewerLoginsForEnv(env);
    if (canViewAdminDashboard(current, env)) return true;
    if (!reviewers.length) return runtimePolicyForEnv(env).releaseStage !== 'public';
    return reviewers.includes(String(current.login).toLowerCase());
  }

  function canUseProductionDebugRoute(current, env) {
    const policy = runtimePolicyForEnv(env);
    return policy.devApiEnabled || policy.releaseStage !== 'public' || canReviewFeedbackReports(current, env);
  }

  return {
    canReviewAgents,
    canReviewFeedbackReports,
    canUsePlatformResend,
    canUseProductionDebugRoute,
    canViewAdminDashboard,
    orderUiLabelsFromAppSettings
  };
}
