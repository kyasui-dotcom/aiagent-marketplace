export function deliveryPublishTargetInstruction(target = '') {
  const normalizedTarget = String(target || '').trim();
  if (normalizedTarget === 'github_repo') {
    return 'Use GitHub-connected publishing. Create a branch or pull request that adds this article to the site repository at the requested URL path.';
  }
  if (normalizedTarget === 'local_terminal') {
    return 'Prepare a local terminal handoff. Return the exact file path, file content, and the minimal CAIt CLI run-local command plan needed to place the article safely.';
  }
  return 'Return a publish-ready export package and the next action needed to publish externally.';
}

export function buildReportNextOrderBody(job = null, deliverable = null, draft = {}) {
  const nextStep = String(draft.nextStep || 'action_plan').trim();
  const sourceLines = [];
  if (String(draft.googleSearchConsoleSite || '').trim()) sourceLines.push(`Use Search Console site: ${String(draft.googleSearchConsoleSite || '').trim()}`);
  if (String(draft.googleGa4Property || '').trim()) sourceLines.push(`Use GA4 property: ${String(draft.googleGa4Property || '').trim()}`);
  if (String(draft.googleDriveFileId || '').trim()) sourceLines.push(`Use Google Drive file: ${String(draft.googleDriveFileId || '').trim()}`);
  if (String(draft.googleCalendarId || '').trim()) sourceLines.push(`Use Google Calendar: ${String(draft.googleCalendarId || '').trim()}`);
  if (String(draft.googleGmailLabelId || '').trim()) sourceLines.push(`Use Gmail label: ${String(draft.googleGmailLabelId || '').trim()}`);
  const taskType = nextStep === 'publish_followup'
    ? 'writing'
    : (nextStep === 'execution_order' ? (job?.taskType || 'research') : 'research');
  return {
    parent_agent_id: String(job?.parentAgentId || 'cloudcode-main'),
    order_strategy: nextStep !== 'execution_order' ? 'auto' : 'single',
    task_type: taskType,
    prompt: [
      `Continue from the report delivered in previous order ${job?.id || ''}.`,
      '',
      `Detected delivery: ${String(deliverable?.title || '')}`,
      `Next step: ${nextStep}`,
      ...sourceLines,
      nextStep === 'publish_followup'
        ? 'Convert the report into a publishable follow-up order and ask only for the minimum publishing metadata.'
        : nextStep === 'execution_order'
          ? 'Convert the report into the next executable work order directly.'
          : 'Turn the report into a concise action plan with the next best recommended step.',
      'If another clarification is required, ask only one blocking question.'
    ].filter(Boolean).join('\n'),
    budget_cap: Number(job?.budgetCap || 300) || 300,
    deadline_sec: Number(job?.deadlineSec || 120) || 120,
    followup_to_job_id: String(job?.id || ''),
    async_dispatch: true,
    input: {}
  };
}

export function buildDeliveryPublishOrderBody(job = null, body = {}) {
  const draft = body?.draft && typeof body.draft === 'object' ? body.draft : {};
  const articleTitle = String(body?.title || '').trim();
  const target = String(draft.target || 'github_repo').trim() || 'github_repo';
  const pathPrefix = String(draft.pathPrefix || '/blog').trim() || '/blog';
  const slug = String(draft.slug || '').trim();
  const publishMode = String(draft.publishMode || 'draft_pr').trim() || 'draft_pr';
  const normalizedPrefix = `/${pathPrefix.replace(/^\/+|\/+$/g, '')}`.replace(/\/{2,}/g, '/');
  const normalizedSlug = slug.replace(/^\/+|\/+$/g, '');
  const urlPath = normalizedSlug ? `${normalizedPrefix}/${normalizedSlug}`.replace(/\/{2,}/g, '/') : normalizedPrefix;
  const taskType = target === 'github_repo' || target === 'local_terminal' ? 'code' : (job?.taskType || 'writing');
  const prompt = [
    `Publish the article draft from previous order ${job?.id || ''}.`,
    '',
    `Article title: ${articleTitle}`,
    `Requested URL path: ${urlPath}`,
    `Publish target: ${target}`,
    `Publish mode: ${publishMode}`,
    '',
    deliveryPublishTargetInstruction(target),
    'Use the previous delivery as the source article. Do not restart discovery or rewrite the article unless missing publishing metadata blocks the task.',
    'If authority or repository details are missing, ask only for the minimum missing publish detail.'
  ].filter(Boolean).join('\n');
  return {
    ok: true,
    followup_to_job_id: String(job?.id || ''),
    task_type: taskType,
    order_strategy: target === 'github_repo' || target === 'local_terminal' ? 'single' : 'auto',
    prompt,
    path_preview: urlPath
  };
}
