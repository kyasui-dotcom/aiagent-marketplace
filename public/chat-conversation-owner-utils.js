import { isStructuredOrderBriefText } from './chat-intent-guard-utils.js?v=20260529c';

export function taskLabel(taskType = '') {
  const safeTask = String(taskType || '').trim().toLowerCase();
  const labels = {
    research_team_leader: 'Research Team Leader',
    build_team_leader: 'Build Team Leader',
    cmo_leader: 'CMO Leader',
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

const LEADER_TASK_ALIASES = Object.freeze([
  {
    taskType: 'cmo_leader',
    aliases: ['cmo', 'cmo leader', 'cmoリーダー', 'chief marketing officer', 'marketing leader', 'marketing lead', 'マーケ責任者', 'マーケティング責任者', 'マーケリーダー']
  },
  {
    taskType: 'cto_leader',
    aliases: ['cto', 'cto leader', 'ctoリーダー', 'chief technology officer', 'technology leader', 'tech leader', '技術責任者', '開発責任者', '技術リーダー']
  },
  {
    taskType: 'cpo_leader',
    aliases: ['cpo', 'cpo leader', 'cpoリーダー', 'chief product officer', 'product leader', 'product lead', 'プロダクト責任者', 'プロダクトリーダー']
  },
  {
    taskType: 'cfo_leader',
    aliases: ['cfo', 'cfo leader', 'cfoリーダー', 'chief financial officer', 'finance leader', 'financial leader', '財務責任者', '財務リーダー']
  },
  {
    taskType: 'legal_leader',
    aliases: ['legal leader', 'legal lead', 'legal counsel', 'lawyer leader', '法務責任者', '法務リーダー', 'リーガルリーダー']
  },
  {
    taskType: 'secretary_leader',
    aliases: ['secretary leader', 'secretary lead', 'assistant leader', 'chief of staff', '秘書リーダー', '秘書責任者', 'アシスタントリーダー']
  },
  {
    taskType: 'research_team_leader',
    aliases: ['research team leader', 'research leader', 'research lead', '調査リーダー', 'リサーチリーダー']
  },
  {
    taskType: 'build_team_leader',
    aliases: ['build team leader', 'build leader', 'build lead', 'development leader', '構築リーダー', '制作リーダー', '開発リーダー']
  }
]);

function escapeRegExp(value = '') {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeLeaderLookupText(value = '') {
  return String(value || '')
    .normalize('NFKC')
    .replace(/([A-Za-z0-9])([\u3040-\u30ff\u3400-\u9fff])/g, '$1 $2')
    .replace(/([\u3040-\u30ff\u3400-\u9fff])([A-Za-z0-9])/g, '$1 $2')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function leaderAliasMatchesText(normalizedText = '', alias = '') {
  const normalizedAlias = normalizeLeaderLookupText(alias);
  if (!normalizedText || !normalizedAlias) return false;
  if (/^[a-z0-9]+$/.test(normalizedAlias)) {
    return new RegExp(`(^|\\s)${escapeRegExp(normalizedAlias)}(?=\\s|$)`).test(normalizedText);
  }
  return normalizedText === normalizedAlias || normalizedText.includes(normalizedAlias);
}

export function leaderTaskTypeFromNaturalText(value = '') {
  const normalizedText = normalizeLeaderLookupText(value);
  if (!normalizedText) return '';
  const directTaskType = normalizeLeaderTaskType(normalizedText.replace(/\s+/g, '_'));
  if (directTaskType) return directTaskType;
  const match = LEADER_TASK_ALIASES.find((entry) =>
    entry.aliases.some((alias) => leaderAliasMatchesText(normalizedText, alias))
  );
  return match ? match.taskType : '';
}

export function explicitLeaderChangeTaskTypeFromText(value = '') {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const requested = normalizeLeaderTaskType(text)
    || normalizeLeaderTaskType(text.match(/\b[a-z][a-z0-9]*(?:[_-][a-z0-9]+)*[_-]leader\b/i)?.[0] || '')
    || leaderTaskTypeFromNaturalText(text);
  if (!requested) return '';
  const explicitChange = /(?:leader|リーダー|担当|主体|lead|owner|route|routing|use|switch|change|talk|chat|speak|consult|conversation|discuss|相談|会話|話したい|話す|話して|聞きたい|壁打ち|変更|切替|切り替|変え|にして|として|で進め|でお願い|に戻|に固定|固定|指名|選択)/i.test(text)
    || normalizeLeaderTaskType(text) === requested;
  if (!explicitChange) return '';
  return requested;
}

export function leaderConversationTaskTypeFromText(value = '') {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const taskType = explicitLeaderChangeTaskTypeFromText(text) || leaderTaskTypeFromNaturalText(text);
  if (!taskType) return '';
  const wantsConversation = /\b(?:talk|chat|speak|consult|consultation|conversation|discuss|ask)\b/i.test(text)
    || /(?:相談|会話|話したい|話す|話して|聞きたい|壁打ち)/.test(text);
  if (!wantsConversation) return '';
  const wantsExecution = /\b(?:prepare|launch|run|execute|order|create|build|write|draft|publish|post|send|analy[sz]e|research|improve|optimi[sz]e|campaign|checklist|deliverable)\b/i.test(text)
    || /(?:発注|注文|実行|作成|作って|書いて|下書き|投稿|公開|送信|調べ|調査|分析|改善|最適化|施策|計画|キャンペーン|納品|成果物)/.test(text);
  return wantsExecution ? '' : taskType;
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
