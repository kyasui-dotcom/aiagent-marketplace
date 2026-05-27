const CHAT_TRANSCRIPT_PROMPT_MAX_CHARS = 1200;

function normalizeString(value, fallback = '') {
  return String(value ?? fallback).trim();
}

export function orderChatMemoryStatusLabel(status = '') {
  const safeStatus = normalizeString(status, 'running').toLowerCase() || 'running';
  if (safeStatus === 'completed') return 'Order completed.';
  if (safeStatus === 'failed') return 'Order failed.';
  if (safeStatus === 'timed_out') return 'Order timed out.';
  if (['blocked', 'action_required', 'needs_action', 'approval_required', 'connector_required', 'blocked_waiting_for_approval'].includes(safeStatus)) return 'Order is waiting for approval or connector setup.';
  if (safeStatus === 'queued') return 'Order accepted and queued.';
  if (safeStatus === 'claimed') return 'Order claimed and preparing execution.';
  if (safeStatus === 'dispatched') return 'Order dispatched to the agent.';
  return 'Order is running.';
}

export function orderChatMemoryCompressedAnswer(job = {}, statusLabel = '') {
  const summary = normalizeString(
    job?.output?.summary
    || job?.output?.report?.summary
    || job?.failureReason
    || ''
  ).slice(0, 900);
  return [statusLabel, summary].filter(Boolean).join('\n\n') || statusLabel || 'Order history is available.';
}

function cleanupOrderPromptForChatMemory(value = '') {
  let text = normalizeString(value).replace(/\r/g, '').trim();
  if (!text) return '';
  const originalRequest = text.match(/(?:^|\n)\s*Original request\s*:\s*([\s\S]*?)(?:\n\s*\n|\n\s*User clarification\s*:|\n\s*Attached connector context\s*:|\n\s*Conversation lead\s*:|$)/i);
  if (originalRequest?.[1]) text = normalizeString(originalRequest[1]).trim();
  const goalOriginal = text.match(/(?:^|\n)\s*Goal\s*:\s*Original request\s*:\s*([\s\S]*?)(?:\n\s*\n|\n\s*User clarification\s*:|$)/i);
  if (goalOriginal?.[1]) text = normalizeString(goalOriginal[1]).trim();
  text = text
    .replace(/^\s*Task\s*:\s*[^\n]+\n\s*/i, '')
    .replace(/^\s*Goal\s*:\s*/i, '')
    .replace(/\n\s*(User clarification|Attached connector context|Conversation lead|Work split|Inputs|Constraints|Deliver|Output language|Acceptance)\s*:[\s\S]*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, CHAT_TRANSCRIPT_PROMPT_MAX_CHARS);
}

export function orderChatMemoryConversationPrompt(job = {}) {
  const input = job?.input && typeof job.input === 'object' ? job.input : {};
  const broker = input?._broker && typeof input._broker === 'object' ? input._broker : {};
  const workflow = broker.workflow && typeof broker.workflow === 'object' ? broker.workflow : {};
  const candidates = [
    input.original_prompt,
    input.originalPrompt,
    broker.originalPrompt,
    broker.prompt,
    workflow.originalPrompt,
    workflow.objective,
    job?.originalPrompt,
    job?.prompt
  ];
  for (const candidate of candidates) {
    const cleaned = cleanupOrderPromptForChatMemory(candidate);
    if (cleaned && !/^Task\s*:/i.test(cleaned)) return cleaned;
  }
  return cleanupOrderPromptForChatMemory(job?.prompt) || normalizeString(job?.prompt).slice(0, CHAT_TRANSCRIPT_PROMPT_MAX_CHARS);
}
