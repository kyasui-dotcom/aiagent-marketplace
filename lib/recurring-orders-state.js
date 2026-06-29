import { randomUUID } from 'node:crypto';
import { nowIso } from './events.js';

const RECURRING_INTERVALS = new Set(['hourly', 'daily', 'weekly']);
const WEEKDAY_INDEX = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6
};

function normalizeString(value, fallback = '') {
  const text = String(value ?? fallback).trim();
  return text;
}

function normalizeLoginKey(value = '') {
  return normalizeString(value).toLowerCase();
}

function normalizePositiveInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.round(n);
}

function normalizeMoney(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return +Number(fallback || 0).toFixed(2);
  return +n.toFixed(2);
}

function normalizeRecurringInterval(value = '') {
  const raw = normalizeString(value, 'daily').toLowerCase().replace(/[\s-]+/g, '_');
  if (['hour', 'every_hour', 'interval_hourly'].includes(raw)) return 'hourly';
  if (['day', 'every_day', 'interval_daily'].includes(raw)) return 'daily';
  if (['week', 'every_week', 'interval_weekly'].includes(raw)) return 'weekly';
  return RECURRING_INTERVALS.has(raw) ? raw : 'daily';
}

function normalizeRecurringStatus(value = '', fallback = 'active') {
  const raw = normalizeString(value, fallback).toLowerCase();
  if (['paused', 'disabled', 'inactive'].includes(raw)) return 'paused';
  if (['needs_action', 'action_required', 'blocked'].includes(raw)) return 'needs_action';
  if (['cancelled', 'canceled', 'deleted', 'removed'].includes(raw)) return 'cancelled';
  if (['completed', 'done', 'finished'].includes(raw)) return 'completed';
  return 'active';
}

function normalizeRecurringTime(value = '', fallback = '09:00') {
  const raw = normalizeString(value, fallback);
  const match = raw.match(/^(\d{1,2})(?::(\d{1,2}))?$/);
  if (!match) return fallback;
  const hour = Math.max(0, Math.min(23, Number(match[1])));
  const minute = Math.max(0, Math.min(59, Number(match[2] || 0)));
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function normalizeRecurringWeekday(value = '', fallback = 1) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.min(6, Math.round(value)));
  const raw = normalizeString(value, String(fallback)).toLowerCase();
  if (/^[0-6]$/.test(raw)) return Number(raw);
  return WEEKDAY_INDEX[raw] ?? fallback;
}

function normalizeRecurringTimezone(value = '', fallback = 'Asia/Tokyo') {
  const raw = normalizeString(value, fallback) || fallback;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: raw }).format(new Date());
    return raw;
  } catch {
    return fallback;
  }
}

function zonedDateParts(ms, timezone = 'UTC') {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
    hourCycle: 'h23'
  });
  const values = {};
  for (const part of formatter.formatToParts(new Date(ms))) {
    if (part.type !== 'literal') values[part.type] = part.value;
  }
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
    weekday: WEEKDAY_INDEX[String(values.weekday || '').toLowerCase().slice(0, 3)] ?? 0
  };
}

function zonedLocalToUtcMs(parts = {}, timezone = 'UTC') {
  const target = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour || 0),
    Number(parts.minute || 0),
    Number(parts.second || 0),
    0
  );
  let guess = target;
  for (let i = 0; i < 3; i += 1) {
    const actual = zonedDateParts(guess, timezone);
    const actualAsUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second, 0);
    const delta = actualAsUtc - target;
    if (Math.abs(delta) < 1000) return guess;
    guess -= delta;
  }
  return guess;
}

function addLocalDays(parts = {}, days = 0) {
  const ms = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + Number(days || 0), 0, 0, 0, 0);
  const date = new Date(ms);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate()
  };
}

export function normalizeRecurringSchedule(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const interval = normalizeRecurringInterval(source.interval || source.frequency || source.repeat || source.kind);
  const every = interval === 'hourly'
    ? Math.max(1, Math.min(168, normalizePositiveInt(source.every || source.everyHours || source.every_hours || 1, 1)))
    : 1;
  return {
    interval,
    every,
    time: normalizeRecurringTime(source.time || source.localTime || source.local_time || '09:00'),
    weekday: normalizeRecurringWeekday(source.weekday || source.dayOfWeek || source.day_of_week || 1, 1),
    timezone: normalizeRecurringTimezone(source.timezone || source.time_zone || 'Asia/Tokyo')
  };
}

export function computeNextRecurringRunAt(scheduleInput = {}, from = nowIso()) {
  const schedule = normalizeRecurringSchedule(scheduleInput);
  const fromMs = Number.isFinite(Date.parse(from)) ? Date.parse(from) : Date.now();
  if (schedule.interval === 'hourly') {
    return new Date(fromMs + schedule.every * 60 * 60 * 1000).toISOString();
  }

  const [hour, minute] = schedule.time.split(':').map((value) => Number(value));
  const local = zonedDateParts(fromMs, schedule.timezone);
  let dayOffset = 0;
  if (schedule.interval === 'weekly') {
    dayOffset = (schedule.weekday - local.weekday + 7) % 7;
  }
  let localDate = addLocalDays(local, dayOffset);
  let candidateMs = zonedLocalToUtcMs({
    ...localDate,
    hour,
    minute,
    second: 0
  }, schedule.timezone);
  if (candidateMs <= fromMs + 1000) {
    localDate = addLocalDays(localDate, schedule.interval === 'weekly' ? 7 : 1);
    candidateMs = zonedLocalToUtcMs({
      ...localDate,
      hour,
      minute,
      second: 0
    }, schedule.timezone);
  }
  return new Date(candidateMs).toISOString();
}

function normalizeRecurringOrderInputPayload(input = null) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const payload = structuredClone(input);
  if (Array.isArray(payload.urls)) payload.urls = payload.urls.map((value) => normalizeString(value)).filter(Boolean).slice(0, 20);
  if (Array.isArray(payload.files)) {
    payload.files = payload.files
      .map((file) => {
        const source = file && typeof file === 'object' ? file : {};
        return {
          name: normalizeString(source.name, 'source.txt').slice(0, 140),
          type: normalizeString(source.type, 'text/plain').slice(0, 80),
          size: Math.max(0, Math.min(1_000_000, Number(source.size || 0))),
          content: normalizeString(source.content).slice(0, 80_000),
          truncated: Boolean(source.truncated)
        };
      })
      .filter((file) => file.content)
      .slice(0, 8);
  }
  return Object.keys(payload).length ? payload : null;
}

function recurringInputSummary(input = null) {
  const urls = Array.isArray(input?.urls) ? input.urls.filter(Boolean) : [];
  const files = Array.isArray(input?.files) ? input.files.filter((file) => file?.content) : [];
  return {
    urlCount: urls.length,
    fileCount: files.length,
    fileChars: files.reduce((sum, file) => sum + normalizeString(file.content).length, 0)
  };
}

function recurringOrderOwnerMatches(order = {}, login = '') {
  const safeLogin = normalizeLoginKey(login);
  if (!safeLogin) return false;
  return normalizeLoginKey(order.ownerLogin || order.login || order.createdByLogin) === safeLogin;
}

export function sanitizeRecurringOrderForClient(order = {}) {
  const schedule = normalizeRecurringSchedule(order.schedule || {});
  const input = order.input && typeof order.input === 'object' ? order.input : null;
  return {
    id: normalizeString(order.id),
    ownerLogin: normalizeString(order.ownerLogin || order.login || order.createdByLogin),
    status: normalizeRecurringStatus(order.status),
    schedule,
    prompt: normalizeString(order.prompt).slice(0, 1200),
    taskType: normalizeString(order.taskType || order.task_type, 'research'),
    agentId: normalizeString(order.agentId || order.agent_id),
    orderStrategy: normalizeString(order.orderStrategy || order.order_strategy, 'auto'),
    budgetCap: normalizeMoney(order.budgetCap ?? order.budget_cap ?? 300, 300),
    deadlineSec: normalizePositiveInt(order.deadlineSec ?? order.deadline_sec ?? 120, 120),
    inputSummary: recurringInputSummary(input),
    maxRuns: Math.max(0, normalizePositiveInt(order.maxRuns ?? order.max_runs ?? 0, 0)),
    runsAttempted: Math.max(0, normalizePositiveInt(order.runsAttempted ?? order.runs_attempted ?? 0, 0)),
    runsCreated: Math.max(0, normalizePositiveInt(order.runsCreated ?? order.runs_created ?? 0, 0)),
    nextRunAt: normalizeString(order.nextRunAt || order.next_run_at),
    lastRunAt: normalizeString(order.lastRunAt || order.last_run_at),
    lastJobId: normalizeString(order.lastJobId || order.last_job_id),
    lastWorkflowJobId: normalizeString(order.lastWorkflowJobId || order.last_workflow_job_id),
    lastStatus: normalizeString(order.lastStatus || order.last_status),
    lastError: normalizeString(order.lastError || order.last_error).slice(0, 500),
    createdAt: normalizeString(order.createdAt || order.created_at, nowIso()),
    updatedAt: normalizeString(order.updatedAt || order.updated_at, nowIso())
  };
}

export function recurringOrdersVisibleToLogin(state = {}, login = '', options = {}) {
  const orders = Array.isArray(state?.recurringOrders) ? state.recurringOrders : [];
  if (options.allowAll) return orders.map(sanitizeRecurringOrderForClient);
  return orders
    .filter((order) => recurringOrderOwnerMatches(order, login))
    .map(sanitizeRecurringOrderForClient);
}

export function createRecurringOrderInState(state = {}, body = {}, current = {}) {
  const login = normalizeString(current?.login || current?.user?.login);
  if (!login) return { error: 'Login or CAIt API key required for recurring work.', statusCode: 401 };
  const prompt = normalizeString(body.prompt);
  if (!prompt && !body.input) return { error: 'prompt or input required', statusCode: 400 };
  const schedule = normalizeRecurringSchedule(body.schedule || body);
  const now = nowIso();
  const requestedNextRunAt = normalizeString(body.next_run_at || body.nextRunAt || body.start_at || body.startAt);
  const requestedNextMs = Date.parse(requestedNextRunAt);
  const nextRunAt = Number.isFinite(requestedNextMs) && requestedNextMs > Date.now()
    ? new Date(requestedNextMs).toISOString()
    : computeNextRecurringRunAt(schedule, now);
  const order = {
    id: `recurring_${randomUUID()}`,
    ownerLogin: login,
    authProvider: normalizeString(current?.authProvider, 'session'),
    user: current?.user && typeof current.user === 'object' ? {
      login,
      name: normalizeString(current.user.name || login),
      email: normalizeString(current.user.email),
      avatarUrl: normalizeString(current.user.avatarUrl),
      profileUrl: normalizeString(current.user.profileUrl)
    } : { login, name: login },
    status: normalizeRecurringStatus(body.status, 'active'),
    schedule,
    parentAgentId: normalizeString(body.parent_agent_id || body.parentAgentId, 'cloudcode-main'),
    taskType: normalizeString(body.task_type || body.taskType, 'research'),
    agentId: normalizeString(body.agent_id || body.agentId),
    orderStrategy: normalizeString(body.order_strategy || body.orderStrategy || 'auto', 'auto'),
    prompt,
    input: normalizeRecurringOrderInputPayload(body.input || null),
    budgetCap: normalizeMoney(body.budget_cap ?? body.budgetCap ?? 300, 300),
    deadlineSec: normalizePositiveInt(body.deadline_sec ?? body.deadlineSec ?? 120, 120),
    maxRuns: Math.max(0, normalizePositiveInt(body.max_runs ?? body.maxRuns ?? 0, 0)),
    runsAttempted: 0,
    runsCreated: 0,
    nextRunAt,
    lastRunAt: '',
    lastJobId: '',
    lastWorkflowJobId: '',
    lastStatus: '',
    lastError: '',
    createdAt: now,
    updatedAt: now
  };
  if (!Array.isArray(state.recurringOrders)) state.recurringOrders = [];
  state.recurringOrders.unshift(order);
  return { ok: true, recurringOrder: sanitizeRecurringOrderForClient(order), raw: order };
}

export function updateRecurringOrderInState(state = {}, recurringOrderId = '', patch = {}, current = {}) {
  const login = normalizeString(current?.login || current?.user?.login);
  const id = normalizeString(recurringOrderId);
  if (!login) return { error: 'Login or CAIt API key required', statusCode: 401 };
  if (!Array.isArray(state.recurringOrders)) state.recurringOrders = [];
  const order = state.recurringOrders.find((item) => normalizeString(item?.id) === id);
  if (!order) return { error: 'Recurring order not found', statusCode: 404 };
  if (!recurringOrderOwnerMatches(order, login)) return { error: 'Only the schedule owner can update it', statusCode: 403 };
  const now = nowIso();
  if (patch.status !== undefined) order.status = normalizeRecurringStatus(patch.status, order.status);
  if (patch.schedule && typeof patch.schedule === 'object') {
    order.schedule = normalizeRecurringSchedule({ ...(order.schedule || {}), ...patch.schedule });
    order.nextRunAt = computeNextRecurringRunAt(order.schedule, now);
  }
  if (patch.next_run_at || patch.nextRunAt) {
    const ms = Date.parse(patch.next_run_at || patch.nextRunAt);
    if (Number.isFinite(ms)) order.nextRunAt = new Date(ms).toISOString();
  }
  if (patch.prompt !== undefined) order.prompt = normalizeString(patch.prompt);
  if (patch.task_type !== undefined || patch.taskType !== undefined) order.taskType = normalizeString(patch.task_type || patch.taskType, order.taskType || 'research');
  if (patch.agent_id !== undefined || patch.agentId !== undefined) order.agentId = normalizeString(patch.agent_id || patch.agentId);
  if (patch.order_strategy !== undefined || patch.orderStrategy !== undefined) order.orderStrategy = normalizeString(patch.order_strategy || patch.orderStrategy || 'auto', 'auto');
  if (patch.budget_cap !== undefined || patch.budgetCap !== undefined) order.budgetCap = normalizeMoney(patch.budget_cap ?? patch.budgetCap, order.budgetCap || 300);
  if (patch.deadline_sec !== undefined || patch.deadlineSec !== undefined) order.deadlineSec = normalizePositiveInt(patch.deadline_sec ?? patch.deadlineSec, order.deadlineSec || 120);
  if (patch.max_runs !== undefined || patch.maxRuns !== undefined) order.maxRuns = Math.max(0, normalizePositiveInt(patch.max_runs ?? patch.maxRuns, order.maxRuns || 0));
  if (patch.input !== undefined) order.input = normalizeRecurringOrderInputPayload(patch.input || null);
  order.updatedAt = now;
  return { ok: true, recurringOrder: sanitizeRecurringOrderForClient(order), raw: order };
}

export function deleteRecurringOrderInState(state = {}, recurringOrderId = '', current = {}) {
  const login = normalizeString(current?.login || current?.user?.login);
  const id = normalizeString(recurringOrderId);
  if (!login) return { error: 'Login or CAIt API key required', statusCode: 401 };
  if (!Array.isArray(state.recurringOrders)) state.recurringOrders = [];
  const index = state.recurringOrders.findIndex((item) => normalizeString(item?.id) === id);
  if (index === -1) return { error: 'Recurring order not found', statusCode: 404 };
  const order = state.recurringOrders[index];
  if (!recurringOrderOwnerMatches(order, login)) return { error: 'Only the schedule owner can delete it', statusCode: 403 };
  const now = nowIso();
  const updated = {
    ...order,
    status: 'cancelled',
    cancelledAt: order.cancelledAt || now,
    deletedAt: order.deletedAt || now,
    deleteMode: 'soft',
    updatedAt: now
  };
  state.recurringOrders[index] = updated;
  return { ok: true, recurringOrder: sanitizeRecurringOrderForClient(updated), raw: updated };
}

export function recurringOrderDue(order = {}, at = nowIso()) {
  if (normalizeRecurringStatus(order.status) !== 'active') return false;
  const maxRuns = Math.max(0, normalizePositiveInt(order.maxRuns ?? order.max_runs ?? 0, 0));
  const runsCreated = Math.max(0, normalizePositiveInt(order.runsCreated ?? order.runs_created ?? 0, 0));
  if (maxRuns > 0 && runsCreated >= maxRuns) return false;
  const dueMs = Date.parse(order.nextRunAt || order.next_run_at || '');
  const nowMs = Number.isFinite(Date.parse(at)) ? Date.parse(at) : Date.now();
  return Number.isFinite(dueMs) && dueMs <= nowMs;
}

export function dueRecurringOrders(state = {}, at = nowIso(), limit = 10) {
  return (Array.isArray(state?.recurringOrders) ? state.recurringOrders : [])
    .filter((order) => recurringOrderDue(order, at))
    .sort((a, b) => String(a.nextRunAt || '').localeCompare(String(b.nextRunAt || '')))
    .slice(0, Math.max(1, Math.min(50, Number(limit || 10))));
}

export function recurringOrderToJobPayload(order = {}) {
  const input = normalizeRecurringOrderInputPayload(order.input || null) || {};
  const broker = input._broker && typeof input._broker === 'object' ? input._broker : {};
  return {
    parent_agent_id: normalizeString(order.parentAgentId || order.parent_agent_id, 'cloudcode-main'),
    task_type: normalizeString(order.taskType || order.task_type, 'research'),
    agent_id: normalizeString(order.agentId || order.agent_id) || undefined,
    order_strategy: normalizeString(order.orderStrategy || order.order_strategy || 'auto', 'auto'),
    prompt: normalizeString(order.prompt || fallbackPromptFromRecurringInput(input)),
    budget_cap: normalizeMoney(order.budgetCap ?? order.budget_cap ?? 300, 300),
    deadline_sec: normalizePositiveInt(order.deadlineSec ?? order.deadline_sec ?? 120, 120),
    input: {
      ...input,
      _broker: {
        ...broker,
        recurring: {
          ...(broker.recurring && typeof broker.recurring === 'object' ? broker.recurring : {}),
          recurringOrderId: normalizeString(order.id),
          scheduledFor: normalizeString(order.nextRunAt || order.next_run_at),
          schedule: normalizeRecurringSchedule(order.schedule || {})
        }
      }
    }
  };
}

function fallbackPromptFromRecurringInput(input = {}) {
  const summary = recurringInputSummary(input);
  if (!summary.urlCount && !summary.fileCount) return 'scheduled work';
  return `Use the scheduled source material (${summary.urlCount} URL(s), ${summary.fileCount} file(s)) and produce the requested delivery.`;
}

export function markRecurringOrderRunInState(state = {}, recurringOrderId = '', result = {}, options = {}) {
  if (!Array.isArray(state.recurringOrders)) state.recurringOrders = [];
  const order = state.recurringOrders.find((item) => normalizeString(item?.id) === normalizeString(recurringOrderId));
  if (!order) return null;
  const now = normalizeString(options.at || nowIso(), nowIso());
  const createdJobId = normalizeString(result.job_id || result.jobId);
  const createdWorkflowId = normalizeString(result.workflow_job_id || result.workflowJobId);
  const connectorActionId = normalizeString(
    result.connector_action_id
    || result.connectorActionId
    || result.external_id
    || result.externalId
  );
  const error = normalizeString(result.error || result.failure_reason || result.failureReason).slice(0, 500);
  order.runsAttempted = Math.max(0, normalizePositiveInt(order.runsAttempted ?? order.runs_attempted ?? 0, 0)) + 1;
  if (createdJobId || createdWorkflowId || connectorActionId) {
    order.runsCreated = Math.max(0, normalizePositiveInt(order.runsCreated ?? order.runs_created ?? 0, 0)) + 1;
  }
  order.lastRunAt = now;
  order.lastJobId = createdJobId || '';
  order.lastWorkflowJobId = createdWorkflowId || '';
  order.lastStatus = normalizeString(result.status || result.mode || (error ? 'failed' : 'created'));
  order.lastError = error;
  if (['connector_required', 'confirmation_required', 'agent_restricted'].includes(normalizeString(result.code))) {
    order.status = 'needs_action';
    order.nextRunAt = '';
    order.lastStatus = 'needs_action';
    order.lastError = error || 'Scheduled work needs account setup or confirmation before the next run.';
    order.updatedAt = now;
    return sanitizeRecurringOrderForClient(order);
  }
  const maxRuns = Math.max(0, normalizePositiveInt(order.maxRuns ?? order.max_runs ?? 0, 0));
  if (maxRuns > 0 && Math.max(0, normalizePositiveInt(order.runsCreated, 0)) >= maxRuns) {
    order.status = 'completed';
    order.nextRunAt = '';
  } else {
    order.nextRunAt = computeNextRecurringRunAt(order.schedule || {}, now);
  }
  order.updatedAt = now;
  return sanitizeRecurringOrderForClient(order);
}
