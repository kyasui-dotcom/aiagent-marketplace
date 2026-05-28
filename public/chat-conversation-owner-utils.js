import { isStructuredOrderBriefText } from './chat-intent-guard-utils.js?v=20260529c';

export function taskLabel(taskType = '') {
  const safeTask = String(taskType || '').trim().toLowerCase();
  const labels = {
    research_team_leader: 'Research Team Leader',
    build_team_leader: 'Build Team Leader',
    cto_leader: 'CTO Leader',
    cpo_leader: 'CPO Leader',
    cfo_leader: 'CFO Leader',
    legal_leader: 'Legal Leader',
    secretary_leader: 'Secretary Leader',
    research: 'Research Agent',
    teardown: 'Competitor Teardown Agent',
    data_analysis: 'Data Analysis Agent',
    growth: 'Growth Operator Agent',
    media_planner: 'Media Planner Agent',
    writing: 'Writing Agent',
    list_creator: 'List Creator Agent',
    landing: 'Landing Agent',
    seo_specialist: 'SEO Specialist',
    acquisition_automation: 'Acquisition Automation Agent',
    directory_submission: 'Directory Submission Agent',
    x_post: 'X Ops Connector Agent'
  };
  if (labels[safeTask]) return labels[safeTask];
  return safeTask
    ? safeTask.split(/[_\s-]+/).filter(Boolean).map((part) => {
        const segment = String(part || '').trim();
        return segment.length > 0 && segment.length <= 3
          ? segment.toUpperCase()
          : `${segment.slice(0, 1).toUpperCase()}${segment.slice(1)}`;
      }).join(' ')
    : 'AI Agent';
}

export function conversationOwnerFromPrepared(value = {}, fallback = {}) {
  const source = value && typeof value === 'object' ? value : {};
  const intake = source.intake && typeof source.intake === 'object' ? source.intake : {};
  const owner = source.conversationOwner
    || source.conversation_owner
    || intake.conversationOwner
    || intake.conversation_owner
    || fallback.conversationOwner
    || {};
  const ownerType = String(owner.type || source.ownerType || source.owner_type || fallback.ownerType || '').trim().toLowerCase();
  const sourceOwnerType = String(
    source.activeOwnerType
    || source.active_owner_type
    || intake.activeOwnerType
    || intake.active_owner_type
    || fallback.activeOwnerType
    || fallback.active_owner_type
    || ''
  ).trim().toLowerCase();
  const effectiveOwnerType = ownerType || sourceOwnerType;
  const sourceOwnerLocked = source.activeOwnerLocked === true
    || source.active_owner_locked === true
    || intake.activeOwnerLocked === true
    || intake.active_owner_locked === true;
  const fallbackOwnerLocked = fallback.activeOwnerLocked === true || fallback.active_owner_locked === true;
  const sourceOwnerTaskType = String(
    source.activeOwnerTaskType
    || source.active_owner_task_type
    || intake.activeOwnerTaskType
    || intake.active_owner_task_type
    || ''
  ).trim().toLowerCase();
  const sourceOwnerName = String(
    source.activeOwnerName
    || source.active_owner_name
    || intake.activeOwnerName
    || intake.active_owner_name
    || ''
  ).trim();
  const sourceLeaderLocked = source.activeLeaderLocked === true
    || source.active_leader_locked === true
    || intake.activeLeaderLocked === true
    || intake.active_leader_locked === true;
  const fallbackLeaderLocked = fallback.activeLeaderLocked === true || fallback.active_leader_locked === true;
  const sourceLeaderTaskType = String(
    source.activeLeaderTaskType
    || source.active_leader_task_type
    || intake.activeLeaderTaskType
    || intake.active_leader_task_type
    || ''
  ).trim().toLowerCase();
  const sourceLeaderName = String(
    source.activeLeaderName
    || source.active_leader_name
    || intake.activeLeaderName
    || intake.active_leader_name
    || ''
  ).trim();
  const fallbackLeaderTaskType = ownerType ? '' : (fallbackLeaderLocked ? fallback.activeLeaderTaskType || '' : '');
  const fallbackLeaderName = ownerType ? '' : (fallbackLeaderLocked ? fallback.activeLeaderName || '' : '');
  const fallbackOwnerTaskType = effectiveOwnerType ? String(fallback.activeOwnerTaskType || fallback.active_owner_task_type || '').trim().toLowerCase() : '';
  const fallbackOwnerName = effectiveOwnerType ? String(fallback.activeOwnerName || fallback.active_owner_name || '').trim() : '';
  const taskType = String(
    owner.taskType
    || owner.task_type
    || (effectiveOwnerType && effectiveOwnerType !== 'leader' ? sourceOwnerTaskType : '')
    || (effectiveOwnerType === 'leader' || sourceLeaderLocked ? sourceLeaderTaskType : '')
    || fallbackOwnerTaskType
    || fallbackLeaderTaskType
    || ''
  ).trim().toLowerCase();
  const label = String(
    owner.label
    || (effectiveOwnerType && effectiveOwnerType !== 'leader' ? sourceOwnerName : '')
    || (effectiveOwnerType === 'leader' || sourceLeaderLocked ? sourceLeaderName : '')
    || fallbackOwnerName
    || fallbackLeaderName
    || (taskType ? taskLabel(taskType) : 'CAIt')
  ).trim();
  const reason = String(owner.reason || source.reason || fallback.reason || '').trim();
  if ((effectiveOwnerType === 'leader' || sourceLeaderLocked || fallbackLeaderLocked) && taskType) {
    return {
      type: 'leader',
      taskType,
      label: label || taskLabel(taskType),
      reason
    };
  }
  if ((effectiveOwnerType === 'agent' || effectiveOwnerType === 'specialist' || sourceOwnerLocked || fallbackOwnerLocked) && taskType) {
    return {
      type: 'agent',
      taskType,
      label: label || taskLabel(taskType),
      reason
    };
  }
  return {
    type: 'cait',
    taskType: '',
    label: 'CAIt',
    reason
  };
}

export function normalizeLeaderTaskType(value = '') {
  const token = String(value || '').trim().toLowerCase().replace(/[-]+/g, '_');
  return /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*_leader$/.test(token) ? token : '';
}

export function isLeaderTaskType(value = '') {
  return Boolean(normalizeLeaderTaskType(value));
}

export function explicitLeaderChangeTaskTypeFromText(value = '') {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const requested = normalizeLeaderTaskType(text)
    || normalizeLeaderTaskType(text.match(/\b[a-z][a-z0-9]*(?:[_-][a-z0-9]+)*[_-]leader\b/i)?.[0] || '');
  if (!requested) return '';
  const explicitChange = /(?:leader|リーダー|担当|主体|lead|owner|route|routing|use|switch|change|変更|切替|切り替|変え|にして|で進め|でお願い|に戻|に固定|固定|指名|選択)/i.test(text)
    || normalizeLeaderTaskType(text) === requested;
  if (!explicitChange) return '';
  return requested;
}

export function leaderOwner(taskType = '', reason = '') {
  const safeTaskType = normalizeLeaderTaskType(taskType);
  if (!safeTaskType) return null;
  return {
    type: 'leader',
    taskType: safeTaskType,
    label: taskLabel(safeTaskType),
    reason: String(reason || '').trim()
  };
}

export function rewriteStructuredBriefLeader(value = '', owner = null) {
  const text = String(value || '');
  if (!owner?.taskType || !text || !isStructuredOrderBriefText(text)) return text;
  let next = text.replace(/^Task:\s*.*$/im, `Task: ${owner.taskType}`);
  if (/^Conversation lead:\s*.*$/im.test(next)) {
    next = next.replace(/^Conversation lead:\s*.*$/im, `Conversation lead: ${owner.label || taskLabel(owner.taskType)} (${owner.taskType})`);
  } else {
    next = next.replace(/^Goal:\s*.*$/im, (line) => `${line}\nConversation lead: ${owner.label || taskLabel(owner.taskType)} (${owner.taskType})`);
  }
  return next;
}

export function withLeaderOwner(value = {}, owner = null, extras = {}) {
  if (!owner?.taskType) return value;
  const source = value && typeof value === 'object' ? value : {};
  return {
    ...source,
    ...extras,
    taskType: owner.taskType,
    task_type: owner.taskType,
    ...(source.prompt ? { prompt: rewriteStructuredBriefLeader(source.prompt, owner) } : {}),
    conversationOwner: owner,
    activeOwnerType: 'leader',
    active_owner_type: 'leader',
    activeOwnerTaskType: owner.taskType,
    active_owner_task_type: owner.taskType,
    activeOwnerName: owner.label || taskLabel(owner.taskType),
    active_owner_name: owner.label || taskLabel(owner.taskType),
    activeOwnerLocked: true,
    active_owner_locked: true,
    activeLeaderTaskType: owner.taskType,
    active_leader_task_type: owner.taskType,
    activeLeaderName: owner.label || taskLabel(owner.taskType),
    active_leader_name: owner.label || taskLabel(owner.taskType),
    activeLeaderLocked: true,
    active_leader_locked: true
  };
}

export function agentOwner(taskType = '', label = '', reason = '') {
  const safeTaskType = String(taskType || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!safeTaskType || isLeaderTaskType(safeTaskType)) return null;
  return {
    type: 'agent',
    taskType: safeTaskType,
    label: String(label || taskLabel(safeTaskType)).trim() || taskLabel(safeTaskType),
    reason: String(reason || '').trim()
  };
}

export function withConversationOwner(value = {}, owner = null, extras = {}) {
  if (!owner?.taskType) return value;
  if (owner.type === 'leader') return withLeaderOwner(value, owner, extras);
  const source = value && typeof value === 'object' ? value : {};
  const label = owner.label || taskLabel(owner.taskType);
  return {
    ...source,
    ...extras,
    taskType: owner.taskType,
    task_type: owner.taskType,
    conversationOwner: owner,
    activeOwnerType: 'agent',
    active_owner_type: 'agent',
    activeOwnerTaskType: owner.taskType,
    active_owner_task_type: owner.taskType,
    activeOwnerName: label,
    active_owner_name: label,
    activeOwnerLocked: true,
    active_owner_locked: true,
    activeLeaderTaskType: '',
    active_leader_task_type: '',
    activeLeaderName: '',
    active_leader_name: '',
    activeLeaderLocked: false,
    active_leader_locked: false
  };
}

export function sameConversationOwner(left = {}, right = {}) {
  return String(left?.type || '') === String(right?.type || '')
    && String(left?.taskType || '') === String(right?.taskType || '')
    && String(left?.label || '') === String(right?.label || '');
}
