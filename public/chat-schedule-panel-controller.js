export function createChatSchedulePanelController(options = {}) {
  const state = options.state && typeof options.state === 'object' ? options.state : {};
  const api = typeof options.api === 'function' ? options.api : (() => Promise.reject(new Error('api helper is required.')));
  const escapeHtml = typeof options.escapeHtml === 'function' ? options.escapeHtml : ((value = '') => String(value || ''));
  const compact = typeof options.compact === 'function' ? options.compact : ((value = '', max = 280) => String(value || '').slice(0, max));
  const taskLabel = typeof options.taskLabel === 'function' ? options.taskLabel : ((value = '') => String(value || 'work'));
  const shortDateTime = typeof options.shortDateTime === 'function' ? options.shortDateTime : (() => '');
  const utilityEmptyHtml = typeof options.utilityEmptyHtml === 'function' ? options.utilityEmptyHtml : ((message = 'Nothing to show yet.') => `<div class="utility-empty">${escapeHtml(message)}</div>`);
  const orderErrorMessage = typeof options.orderErrorMessage === 'function' ? options.orderErrorMessage : ((error) => String(error?.message || error || 'Request failed.'));
  const appendTextMessage = typeof options.appendTextMessage === 'function' ? options.appendTextMessage : (() => null);
  const openUtilityModal = typeof options.openUtilityModal === 'function' ? options.openUtilityModal : (() => {});
  const utilityModalIsOpen = typeof options.utilityModalIsOpen === 'function' ? options.utilityModalIsOpen : (() => false);
  const refreshRecentJobs = typeof options.refreshRecentJobs === 'function' ? options.refreshRecentJobs : (() => Promise.resolve([]));
  const refreshRecurringOrders = typeof options.refreshRecurringOrders === 'function' ? options.refreshRecurringOrders : (() => Promise.resolve([]));
  const getVisitorId = typeof options.getVisitorId === 'function' ? options.getVisitorId : (() => state.visitorId);

  function localTimezone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Tokyo';
    } catch {
      return 'Asia/Tokyo';
    }
  }

  function scheduleableCompletedOrders() {
    return (Array.isArray(state.recentJobs) ? state.recentJobs : [])
      .filter((job) => job?.id && String(job.status || '').trim().toLowerCase() === 'completed' && String(job.prompt || '').trim())
      .slice(0, 20);
  }

  function completedOrderById(id = '') {
    const safeId = String(id || '').trim();
    if (!safeId) return null;
    return scheduleableCompletedOrders().find((job) => String(job.id || '') === safeId) || null;
  }

  function scheduleFormHtml() {
    const completedOrders = scheduleableCompletedOrders();
    const hasCompletedOrders = completedOrders.length > 0;
    const orderOptions = completedOrders.map((job) => {
      const label = [
        taskLabel(job.taskType || job.workflowTask || 'work'),
        shortDateTime(job.completedAt || job.updatedAt || job.createdAt),
        compact(job.prompt || '', 88)
      ].filter(Boolean).join(' / ');
      return `<option value="${escapeHtml(job.id)}">${escapeHtml(label)}</option>`;
    }).join('');
    return [
      '<form class="utility-form schedule-form" data-schedule-create>',
      '<label class="utility-field"><span>Completed order to rerun</span>',
      hasCompletedOrders
        ? `<select name="source_job_id">${orderOptions}</select>`
        : '<select name="source_job_id" disabled><option>Run an order to completion first</option></select>',
      '</label>',
      '<div class="utility-grid">',
      '<label class="utility-field"><span>Repeat</span><select name="interval"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="hourly">Hourly</option></select></label>',
      '<label class="utility-field"><span>Time</span><input name="time" type="time" value="09:00" /></label>',
      '<label class="utility-field"><span>Weekday</span><select name="weekday"><option value="1">Mon</option><option value="2">Tue</option><option value="3">Wed</option><option value="4">Thu</option><option value="5">Fri</option><option value="6">Sat</option><option value="0">Sun</option></select></label>',
      `<label class="utility-field"><span>Timezone</span><input name="timezone" value="${escapeHtml(localTimezone())}" /></label>`,
      '<label class="utility-field"><span>Max runs</span><input name="max_runs" type="number" min="0" max="365" value="0" /></label>',
      '</div>',
      '<div class="utility-actions schedule-submit-row">',
      `<button class="primary-btn file-action" type="submit"${hasCompletedOrders ? '' : ' disabled'}>Schedule completed order</button>`,
      '</div>',
      '<span class="chat-hint">Schedules rerun a completed order. This avoids turning an unclear request into recurring work before CAIt has asked questions, routed it, and delivered it once. The chat does not need to stay open.</span>',
      '</form>'
    ].join('\n');
  }

  function weekdayLabel(value = 1) {
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][Math.max(0, Math.min(6, Number(value || 0)))] || 'Mon';
  }

  function scheduleIntervalLabel(schedule = {}) {
    const interval = String(schedule.interval || 'daily');
    if (interval === 'hourly') return `Every ${Math.max(1, Number(schedule.every || 1))} hour(s)`;
    if (interval === 'weekly') return `Weekly ${schedule.time || '09:00'} ${weekdayLabel(schedule.weekday)}`;
    return `Daily ${schedule.time || '09:00'}`;
  }

  function recurringOrderRows(orders = []) {
    const rows = (Array.isArray(orders) ? orders : []).filter((order) => order?.id).slice(0, 40).map((order) => {
      const status = String(order.status || 'active');
      const schedule = order.schedule || {};
      const meta = [
        status,
        scheduleIntervalLabel(schedule),
        schedule.timezone || '',
        order.nextRunAt ? `next ${shortDateTime(order.nextRunAt)}` : '',
        order.lastStatus ? `last ${order.lastStatus}` : ''
      ].filter(Boolean).join(' / ');
      const canPause = status === 'active';
      const canResume = status === 'paused' || status === 'needs_action';
      return [
        '<div class="utility-row">',
        '<div class="utility-main">',
        `<strong>${escapeHtml(taskLabel(order.taskType || 'work'))}</strong>`,
        `<span class="utility-meta">${escapeHtml(meta)}</span>`,
        `<span>${escapeHtml(compact(order.prompt || order.lastError || '', 190))}</span>`,
        '</div>',
        '<div class="utility-actions">',
        order.lastJobId ? `<button class="ghost-btn file-action" type="button" data-utility-open-job="${escapeHtml(order.lastJobId)}">Last run</button>` : '',
        canPause ? `<button class="ghost-btn file-action" type="button" data-recurring-status="${escapeHtml(order.id)}" data-status="paused">Pause</button>` : '',
        canResume ? `<button class="ghost-btn file-action" type="button" data-recurring-status="${escapeHtml(order.id)}" data-status="active">Resume</button>` : '',
        status !== 'cancelled' && status !== 'completed' ? `<button class="ghost-btn file-action" type="button" data-recurring-cancel="${escapeHtml(order.id)}">Cancel</button>` : '',
        '</div>',
        '</div>'
      ].filter(Boolean).join('\n');
    });
    return rows.length ? `<div class="utility-list">${rows.join('\n')}</div>` : utilityEmptyHtml('No scheduled work is active yet.');
  }

  function schedulePanelHtml(status = '') {
    return [
      status ? `<div class="chat-hint">${escapeHtml(status)}</div>` : '',
      scheduleFormHtml(),
      '<h3 class="utility-section-title">Scheduled work</h3>',
      recurringOrderRows(state.recurringOrders)
    ].filter(Boolean).join('\n');
  }

  async function showSchedulePanel() {
    openUtilityModal('Schedules', schedulePanelHtml('Loading scheduled work...'));
    try {
      await Promise.all([
        refreshRecurringOrders({ force: true }),
        refreshRecentJobs({ force: true, limit: 40 })
      ]);
      if (utilityModalIsOpen('Schedules')) openUtilityModal('Schedules', schedulePanelHtml());
    } catch (error) {
      if (utilityModalIsOpen('Schedules')) openUtilityModal('Schedules', schedulePanelHtml(orderErrorMessage(error)));
    }
  }

  function scheduleFromForm(form) {
    const data = new FormData(form);
    const interval = String(data.get('interval') || 'daily').trim();
    return {
      schedule: {
        interval,
        time: String(data.get('time') || '09:00').trim() || '09:00',
        weekday: Number(data.get('weekday') || 1),
        timezone: String(data.get('timezone') || localTimezone()).trim() || 'Asia/Tokyo'
      },
      maxRuns: Math.max(0, Math.min(365, Number(data.get('max_runs') || 0) || 0)),
      sourceJobId: String(data.get('source_job_id') || '').trim()
    };
  }

  function buildScheduledJobPayloadFromCompletedOrder(job = {}) {
    if (!job?.id || String(job.status || '').trim().toLowerCase() !== 'completed') {
      throw new Error('Choose a completed order before scheduling recurring work.');
    }
    const taskType = String(job.taskType || job.task_type || job.workflowTask || 'research').trim() || 'research';
    const previousInput = job.input && typeof job.input === 'object' ? job.input : {};
    const previousBroker = previousInput._broker && typeof previousInput._broker === 'object' ? previousInput._broker : {};
    const orderStrategy = String(job.orderStrategy || job.order_strategy || (job.workflow ? 'multi' : 'single') || 'single').trim() || 'single';
    return {
      parent_agent_id: 'chatux',
      task_type: taskType,
      selected_agent_id: String(job.selectedAgentId || job.selected_agent_id || job.assignedAgentId || '').trim(),
      selected_agent_name: String(job.selectedAgentName || job.selected_agent_name || '').trim(),
      prompt: String(job.prompt || '').trim(),
      order_strategy: orderStrategy,
      async_dispatch: true,
      skip_intake: true,
      visitor_id: getVisitorId(),
      budget_cap: Number(job.budgetCap ?? job.budget_cap ?? 500),
      deadline_sec: Number(job.deadlineSec ?? job.deadline_sec ?? 300),
      confirmation: {
        accepted: true,
        source: 'chat_schedule_completed_order',
        accepted_at: new Date().toISOString(),
        source_job_id: String(job.id || '')
      },
      input: {
        ...previousInput,
        source: 'chatux_completed_order_schedule',
        original_prompt: previousInput.original_prompt || previousInput.originalPrompt || String(job.prompt || '').trim(),
        _broker: {
          ...previousBroker,
          recurring: {
            ...(previousBroker.recurring && typeof previousBroker.recurring === 'object' ? previousBroker.recurring : {}),
            created_from: 'completed_order_schedule_panel',
            sourceJobId: String(job.id || ''),
            sourceJobStatus: 'completed',
            chat_required: false
          },
          intake: {
            ...(previousBroker.intake && typeof previousBroker.intake === 'object' ? previousBroker.intake : {}),
            reused_completed_order: true,
            source_job_id: String(job.id || ''),
            checked_at: new Date().toISOString()
          }
        }
      }
    };
  }

  async function createScheduleFromForm(form) {
    const config = scheduleFromForm(form);
    const sourceJob = completedOrderById(config.sourceJobId);
    if (!sourceJob) throw new Error('Run an order to completion first, then choose it here for scheduling.');
    const payload = buildScheduledJobPayloadFromCompletedOrder(sourceJob);
    const body = {
      ...payload,
      schedule: config.schedule,
      max_runs: config.maxRuns,
      status: 'active',
      input: {
        ...(payload.input || {}),
        _broker: {
          ...(payload.input?._broker || {}),
          recurring: {
            ...(payload.input?._broker?.recurring || {}),
            schedule: config.schedule,
            maxRuns: config.maxRuns,
            sourceJobId: sourceJob.id
          }
        }
      }
    };
    const result = await api('/api/recurring-orders', {
      method: 'POST',
      body: JSON.stringify(body)
    });
    state.recurringOrdersFetchedAt = 0;
    await refreshRecurringOrders({ force: true });
    openUtilityModal('Schedules', schedulePanelHtml('Scheduled from a completed order. CAIt will rerun it in the background even if this chat is closed.'));
    appendTextMessage('system', [
      'Scheduled completed order.',
      `Schedule ID: ${result.recurring_order?.id || '-'}`,
      `Source order: ${sourceJob.id.slice(0, 8)}`,
      result.recurring_order?.nextRunAt ? `Next run: ${shortDateTime(result.recurring_order.nextRunAt)}` : ''
    ].filter(Boolean).join('\n'), { label: 'Schedules' });
  }

  async function updateRecurringOrderStatus(id = '', status = 'paused') {
    if (!id) return;
    await api(`/api/recurring-orders/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    state.recurringOrdersFetchedAt = 0;
    await refreshRecurringOrders({ force: true });
    if (utilityModalIsOpen('Schedules')) openUtilityModal('Schedules', schedulePanelHtml(status === 'active' ? 'Schedule resumed.' : 'Schedule paused.'));
  }

  async function cancelRecurringOrder(id = '') {
    if (!id) return;
    await api(`/api/recurring-orders/${encodeURIComponent(id)}`, { method: 'DELETE' });
    state.recurringOrdersFetchedAt = 0;
    await refreshRecurringOrders({ force: true });
    if (utilityModalIsOpen('Schedules')) openUtilityModal('Schedules', schedulePanelHtml('Schedule cancelled.'));
  }

  return {
    cancelRecurringOrder,
    createScheduleFromForm,
    schedulePanelHtml,
    showSchedulePanel,
    updateRecurringOrderStatus
  };
}
