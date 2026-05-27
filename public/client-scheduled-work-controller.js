import { updateScheduledWorkControls } from './client-composer-ui.js?v=20260522a';
import { renderScheduledWorkListElement } from './client-scheduled-work-ui.js?v=20260522a';

function missingDependency(name) {
  return () => {
    throw new Error(`Scheduled work controller missing dependency: ${name}`);
  };
}

export function createClientScheduledWorkController(deps = {}) {
  const {
    els = {},
    state = {},
    api = missingDependency('api'),
    apiPayloadFromOrderDraft = missingDependency('apiPayloadFromOrderDraft'),
    appendOrderChatExchange = missingDependency('appendOrderChatExchange'),
    buildOpenChatImplicitOrderPrepAnswer = missingDependency('buildOpenChatImplicitOrderPrepAnswer'),
    canOrderFromBrowser = () => false,
    currentOrderDraft = () => ({}),
    fallbackPromptFromOrderInput = () => '',
    flash = () => {},
    handleOrderPreflightPrompt = () => false,
    orderInputCounts = () => ({}),
    refresh = missingDependency('refresh'),
    runAction = (_button, fn) => (typeof fn === 'function' ? fn() : undefined),
    shouldPrepareOrderBeforeDispatch = () => false,
    summarizeOrderDraftForAnalytics = () => ({}),
    trackConversionEvent = () => {},
    validateOrderDraft = missingDependency('validateOrderDraft')
  } = deps;

  function scheduledWorkTimeLabel(value = '') {
    if (!Number.isFinite(Date.parse(value))) return 'not scheduled';
    return new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function scheduledWorkScheduleLabel(schedule = {}) {
    const interval = String(schedule?.interval || 'daily').toLowerCase();
    if (interval === 'hourly') {
      const every = Math.max(1, Number(schedule?.every || 1));
      return every === 1 ? 'Hourly' : `Every ${every} hours`;
    }
    if (interval === 'weekly') {
      const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][Number(schedule?.weekday || 1)] || 'Mon';
      return `Weekly ${weekday} ${schedule?.time || '09:00'}`;
    }
    return `Daily ${schedule?.time || '09:00'}`;
  }

  function selectedScheduledWorkOptions() {
    const interval = String(els.scheduledWorkInterval?.value || 'daily').trim() || 'daily';
    return {
      interval,
      time: String(els.scheduledWorkTime?.value || '09:00').trim() || '09:00',
      weekday: Number(els.scheduledWorkWeekday?.value || 1),
      every: Math.max(1, Math.min(168, Number(els.scheduledWorkEvery?.value || 1) || 1)),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Tokyo'
    };
  }

  function renderScheduledWorkControls() {
    updateScheduledWorkControls(els, els.scheduledWorkInterval?.value || 'daily');
  }

  function renderScheduledWorkList(recurringOrders = []) {
    renderScheduledWorkControls();
    const auth = state.snapshot?.auth || {};
    renderScheduledWorkListElement(els, recurringOrders, {
      canOrder: canOrderFromBrowser(auth),
      scheduleLabel: (schedule) => scheduledWorkScheduleLabel(schedule),
      timeLabel: (value) => scheduledWorkTimeLabel(value),
      onToggle: (button, id) => runAction(button, async () => {
        await toggleScheduledWork(id);
      }),
      onDelete: (button, id) => runAction(button, async () => {
        await deleteScheduledWork(id);
      })
    });
  }

  function scheduledWorkById(id = '') {
    return (state.snapshot?.recurringOrders || []).find((order) => String(order.id || '') === String(id || '')) || null;
  }

  async function scheduleCurrentOrderDraft() {
    const draft = currentOrderDraft();
    const inputCounts = orderInputCounts(draft.input || null);
    if (shouldPrepareOrderBeforeDispatch(draft)) {
      const prepPrompt = draft.prompt || fallbackPromptFromOrderInput(draft.input || null);
      const prepAnswer = buildOpenChatImplicitOrderPrepAnswer(prepPrompt, inputCounts, {
        sourceOnly: !String(draft.prompt || '').trim()
      });
      appendOrderChatExchange(prepPrompt, {
        ...prepAnswer,
        status: 'Draft prepared for scheduling.\n\nReview the brief, then press SCHEDULE DRAFT. No order was created and no billing occurred.'
      });
      flash('Draft prepared. Review it, then schedule it from the left panel.', 'info');
      return;
    }
    try {
      validateOrderDraft(draft, { checkAccess: true, checkFunding: false, allowGuestTrial: false });
    } catch (error) {
      if (handleOrderPreflightPrompt(error, draft, { analytics: summarizeOrderDraftForAnalytics(draft, 'scheduled_work_validation') })) return;
      throw error;
    }
    const maxRuns = Math.max(0, Number(els.scheduledWorkMaxRuns?.value || 0) || 0);
    const payload = {
      ...apiPayloadFromOrderDraft(draft),
      agent_id: draft.agent_id || undefined,
      prompt: draft.prompt || fallbackPromptFromOrderInput(draft.input),
      schedule: selectedScheduledWorkOptions(),
      max_runs: maxRuns
    };
    let result;
    try {
      result = await api('/api/recurring-orders', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    } catch (error) {
      if (handleOrderPreflightPrompt(error, draft, { analytics: summarizeOrderDraftForAnalytics(draft, 'scheduled_work_api') })) return;
      throw error;
    }
    void trackConversionEvent('recurring_order_created', {
      ...summarizeOrderDraftForAnalytics(draft, 'scheduled_work'),
      status: result.recurring_order?.status || 'active'
    });
    flash(`Scheduled work created. Next run: ${scheduledWorkTimeLabel(result.recurring_order?.nextRunAt)}`, 'ok');
    await refresh();
  }

  async function toggleScheduledWork(id = '') {
    const order = scheduledWorkById(id);
    if (!order) throw new Error('Scheduled work not found.');
    const status = String(order.status || '').toLowerCase();
    const paused = status === 'paused' || status === 'needs_action';
    const body = paused
      ? { status: 'active', schedule: order.schedule || {} }
      : { status: 'paused' };
    await api(`/api/recurring-orders/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });
    flash(paused ? 'Scheduled work resumed. It will retry on the next scheduled run.' : 'Scheduled work paused.', 'ok');
    await refresh();
  }

  async function deleteScheduledWork(id = '') {
    if (!id) throw new Error('Scheduled work not found.');
    await api(`/api/recurring-orders/${encodeURIComponent(id)}`, { method: 'DELETE' });
    flash('Scheduled work deleted.', 'ok');
    await refresh();
  }

  return {
    deleteScheduledWork,
    renderScheduledWorkControls,
    renderScheduledWorkList,
    scheduleCurrentOrderDraft,
    scheduledWorkById,
    scheduledWorkScheduleLabel,
    scheduledWorkTimeLabel,
    selectedScheduledWorkOptions,
    toggleScheduledWork
  };
}
