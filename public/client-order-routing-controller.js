import { isRepoBackedCodeIntentText } from './work-intent-resolver.js?v=20260526a';
import {
  inferClientTaskSequence,
  inferPrimaryTaskSequence,
  openChatIntentMatchText
} from './client-intent-routing-utils.js?v=20260522a';
import { renderOrderStrategyControlsElement } from './client-order-strategy-ui.js?v=20260522a';

const AUTO_WORKFLOW_SUPPORT_TASKS = new Set(['research', 'summary', 'debug', 'automation']);

export function createClientOrderRoutingController(deps = {}) {
  const {
    state,
    els,
    productShortName = 'CAIt',
    agentHealth,
    agentRoutingScore,
    agentTaskFit,
    clientTaskMatch,
    currentRoutingTask,
    currentRunTargetAgent,
    currentServerResolvedIntentForPrompt,
    estimateWindowOfAgent,
    flash,
    renderOrderComposer,
    trackConversionEvent,
    yen
  } = deps;

  function safeCurrentRoutingTask() {
    return typeof currentRoutingTask === 'function' ? currentRoutingTask() : 'research';
  }

  function currentPrompt() {
    return String(els?.jobPrompt?.value || '');
  }

  function isAutoWorkflowSpecialtyTask(taskType = '') {
    const task = String(taskType || '').trim().toLowerCase();
    return Boolean(task && !AUTO_WORKFLOW_SUPPORT_TASKS.has(task));
  }

  function requestedOrderStrategy() {
    const configured = String(els?.jobStrategy?.value || 'auto').trim().toLowerCase();
    return configured === 'single' || configured === 'multi' ? configured : 'auto';
  }

  function currentOrderStrategy() {
    const configured = requestedOrderStrategy();
    if (configured === 'single' || configured === 'multi') return configured;
    return orderRoutingDecision().strategy;
  }

  function orderStrategyLabel() {
    const requested = requestedOrderStrategy();
    const resolved = currentOrderStrategy();
    const label = resolved === 'multi' ? 'LEADER' : 'SPECIALIST';
    if (requested === 'auto') return `AUTO (${label})`;
    return label;
  }

  function setOrderStrategyChoice(value = 'auto') {
    const normalized = ['single', 'multi'].includes(String(value || '').trim().toLowerCase())
      ? String(value || '').trim().toLowerCase()
      : 'auto';
    if (els?.jobStrategy) els.jobStrategy.value = normalized;
    if (normalized === 'multi' && els?.jobAgentId?.value) {
      els.jobAgentId.value = '';
      flash?.('Pinned agent cleared. Leader Agent routing needs room to choose or coordinate specialists.', 'info');
    }
    if (els?.executionChoiceMenu) els.executionChoiceMenu.open = false;
    void trackConversionEvent?.('draft_order_created', {
      source: 'execution_choice',
      orderStrategy: normalized,
      resolvedStrategy: orderRoutingDecision(safeCurrentRoutingTask() || 'research', currentPrompt(), normalized).strategy,
      taskType: safeCurrentRoutingTask() || 'research'
    });
    renderOrderComposer?.();
  }

  function estimateForRoutingDecision(decision, taskType = safeCurrentRoutingTask() || 'research') {
    if (!decision || decision.strategy !== 'multi') {
      const agent = currentRunTargetAgent?.()
        || (state?.snapshot?.agents || []).find((item) => agentHealth?.(item).ready && agentTaskFit?.(item, taskType).matches)
        || null;
      const estimate = estimateWindowOfAgent?.(agent, taskType);
      return estimate ? { min: estimate.estimateMinTotal, max: estimate.estimateMaxTotal, agents: agent ? [agent] : [] } : null;
    }
    const picks = decision.plan?.picks || [];
    if (picks.length < 2) return null;
    const total = picks.reduce((acc, item) => {
      const estimate = estimateWindowOfAgent?.(item.agent, item.taskType);
      acc.min += Number(estimate?.estimateMinTotal || 0);
      acc.max += Number(estimate?.estimateMaxTotal || 0);
      acc.agents.push(item.agent);
      return acc;
    }, { min: 0, max: 0, agents: [] });
    return total.max > 0 ? total : null;
  }

  function formatEstimateBrief(estimate) {
    return estimate?.max > 0 ? `${yen?.(estimate.min) || estimate.min} - ${yen?.(estimate.max) || estimate.max}` : 'not enough ready agents';
  }

  function renderOrderStrategyControls() {
    const requested = requestedOrderStrategy();
    const taskType = safeCurrentRoutingTask() || 'research';
    const prompt = currentPrompt().trim();
    const autoDecision = orderRoutingDecision(taskType, prompt, 'auto');
    const singleDecision = orderRoutingDecision(taskType, prompt, 'single');
    const teamDecision = orderRoutingDecision(taskType, prompt, 'multi');
    const activeDecision = orderRoutingDecision(taskType, prompt, requested);
    const singleEstimate = estimateForRoutingDecision(singleDecision, taskType);
    const teamEstimate = estimateForRoutingDecision(teamDecision, taskType);
    const activeLabel = requested === 'multi'
      ? 'Leader Agent'
      : requested === 'single'
      ? 'Specialist Agent'
      : `Auto -> ${autoDecision.strategy === 'multi' ? 'Leader Agent' : 'Specialist Agent'}`;
    renderOrderStrategyControlsElement(els, {
      requested,
      prompt,
      activeLabel,
      activeReason: activeDecision.reason,
      singleEstimateLabel: formatEstimateBrief(singleEstimate),
      teamEstimateLabel: formatEstimateBrief(teamEstimate),
      teamCount: teamDecision.plan?.picks?.length || 0
    });
  }

  function plannedMultiAgents(taskType = safeCurrentRoutingTask(), prompt = currentPrompt(), options = {}) {
    const agents = (state?.snapshot?.agents || []).filter((agent) => agentHealth?.(agent).ready);
    const plannedTasks = options.strategyProbe
      ? inferPrimaryTaskSequence(taskType, prompt)
      : inferClientTaskSequence(taskType, prompt);
    const picks = [];
    const used = new Set();
    for (const plannedTask of plannedTasks) {
      const picked = agents
        .map((agent) => ({ agent, match: clientTaskMatch?.(agent, plannedTask) || {} }))
        .filter((item) => !used.has(item.agent.id) && item.match.matches)
        .sort((left, right) => (
          (agentRoutingScore?.(right.agent, plannedTask) || 0) - (agentRoutingScore?.(left.agent, plannedTask) || 0)
          || Number(right.match.exact) - Number(left.match.exact)
          || Number(right.match.compatibility || 0) - Number(left.match.compatibility || 0)
          || String(left.agent.name || left.agent.id || '').localeCompare(String(right.agent.name || right.agent.id || ''))
        ))[0] || null;
      if (!picked) continue;
      used.add(picked.agent.id);
      picks.push({
        taskType: plannedTask,
        dispatchTaskType: picked.match.taskType || plannedTask,
        agent: picked.agent,
        matchKind: picked.match.matchKind || 'exact'
      });
    }
    return { plannedTasks, picks };
  }

  function isRepoBackedCodeOrderIntent(taskType = '', prompt = '') {
    const task = String(taskType || '').trim().toLowerCase();
    const text = openChatIntentMatchText(prompt);
    const codeTask = ['code', 'debug', 'ops', 'automation'].includes(task);
    const repoIntent = /(\b(?:github|git hub|repo|repository|pull request|pr|branch|commit|diff|issue|bug|debug|fix)\b|修正|直して|デバッグ|リポジトリ|プルリク|ブランチ|コミット|差分)/i.test(text);
    return codeTask && repoIntent;
  }

  function orderRoutingDecision(taskType = safeCurrentRoutingTask(), prompt = currentPrompt(), requested = requestedOrderStrategy()) {
    const strategy = requested === 'single' || requested === 'multi' ? requested : 'auto';
    const plan = plannedMultiAgents(taskType, prompt, { strategyProbe: strategy !== 'multi' });
    const resolvedIntent = currentServerResolvedIntentForPrompt?.(prompt);
    if (strategy === 'single') {
      return { strategy: 'single', requested, plan, reason: 'Single-agent routing was selected.' };
    }
    if (strategy === 'multi') {
      return { strategy: 'multi', requested, plan, reason: 'Multi-agent routing was explicitly selected.' };
    }
    if ((resolvedIntent?.strategyHint === 'single' && resolvedIntent?.routeHint) || isRepoBackedCodeOrderIntent(taskType, prompt) || isRepoBackedCodeIntentText(prompt, taskType)) {
      return {
        strategy: 'single',
        requested,
        plan,
        routeHint: resolvedIntent?.routeHint || 'single_agent_code',
        reason: resolvedIntent?.reason || `${productShortName} keeps repo-backed coding as a single-agent order unless multi-agent routing is explicitly selected.`
      };
    }
    if (resolvedIntent?.strategyHint === 'multi' && resolvedIntent?.routeHint) {
      return {
        strategy: 'multi',
        requested,
        plan,
        routeHint: resolvedIntent.routeHint,
        reason: resolvedIntent.reason || `${productShortName} will use leader/team routing for this request.`
      };
    }
    const plannedSpecialties = new Set(plan.plannedTasks.filter(isAutoWorkflowSpecialtyTask));
    const assignedSpecialties = new Set(plan.picks
      .filter((item) => isAutoWorkflowSpecialtyTask(item.taskType))
      .map((item) => item.taskType));
    const shouldUseMulti = plannedSpecialties.size >= 2 && assignedSpecialties.size >= 2 && plan.picks.length >= 2;
    return {
      strategy: shouldUseMulti ? 'multi' : 'single',
      requested,
      plan,
      plannedSpecialties: [...plannedSpecialties],
      assignedSpecialties: [...assignedSpecialties],
      reason: shouldUseMulti
        ? `${productShortName} detected multiple specialties: ${[...assignedSpecialties].join(', ')}.`
        : `${productShortName} will keep this as a single-agent order unless the request clearly needs multiple specialties.`
    };
  }

  return {
    currentOrderStrategy,
    estimateForRoutingDecision,
    formatEstimateBrief,
    isAutoWorkflowSpecialtyTask,
    isRepoBackedCodeOrderIntent,
    orderRoutingDecision,
    orderStrategyLabel,
    plannedMultiAgents,
    renderOrderStrategyControls,
    requestedOrderStrategy,
    setOrderStrategyChoice
  };
}
