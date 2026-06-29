import {
  agentOwner,
  conversationOwnerFromPrepared,
  explicitLeaderChangeTaskTypeFromText,
  leaderOwner,
  sameConversationOwner,
  taskLabel,
  withConversationOwner
} from './chat-conversation-owner-utils.js?v=20260628c';

export function createChatConversationOwnerController(deps = {}) {
  const {
    state,
    els,
    escapeHtml,
    isoNow,
    appendMessage,
    appendTextMessage,
    appendOrderConfirmation,
    chatLanguage,
    chatText,
    prepareOrder,
    setBusy,
    updateComposerMode
  } = deps;

  function lockedLeaderOwnerForPrompt(prompt = '', options = {}) {
    if (!state.activeLeaderLocked || !state.activeLeader?.taskType) return null;
    const explicitTaskType = explicitLeaderChangeTaskTypeFromText(prompt);
    if (options.allowLeaderChange === true || options.leaderChangeRequested === true || explicitTaskType) return null;
    return leaderOwner(state.activeLeader.taskType, state.activeLeader.reason || 'Leader already confirmed in this chat.');
  }

  function currentLockedLeaderOwner() {
    if (!state.activeLeaderLocked || !state.activeLeader?.taskType) return null;
    return leaderOwner(state.activeLeader.taskType, state.activeLeader.reason || 'Leader already confirmed in this chat.');
  }

  function lockedAgentOwnerForPrompt(prompt = '', options = {}) {
    if (!state.activeOwnerLocked || state.activeOwner?.type !== 'agent' || !state.activeOwner?.taskType) return null;
    if (options.allowLeaderChange === true || options.leaderChangeRequested === true || explicitLeaderChangeTaskTypeFromText(prompt)) return null;
    return agentOwner(state.activeOwner.taskType, state.activeOwner.label, state.activeOwner.reason || 'Agent already confirmed in this chat.');
  }

  function currentLockedConversationOwner() {
    return currentLockedLeaderOwner() || lockedAgentOwnerForPrompt('', {});
  }

  function leaderChangeProposalHtml(currentOwner = {}, suggestedOwner = {}, sample = '') {
    const ja = chatLanguage(sample) === 'ja';
    const currentLabel = currentOwner.label || taskLabel(currentOwner.taskType);
    const suggestedLabel = suggestedOwner.label || taskLabel(suggestedOwner.taskType);
    return [
      `<strong>${ja ? 'リーダー変更の確認' : 'Leader change check'}</strong>`,
      '',
      ja
        ? `現在のリーダー: ${escapeHtml(currentLabel)} (${escapeHtml(currentOwner.taskType || '')})`
        : `Current lead: ${escapeHtml(currentLabel)} (${escapeHtml(currentOwner.taskType || '')})`,
      ja
        ? `候補: ${escapeHtml(suggestedLabel)} (${escapeHtml(suggestedOwner.taskType || '')})`
        : `Suggested lead: ${escapeHtml(suggestedLabel)} (${escapeHtml(suggestedOwner.taskType || '')})`,
      ja
        ? 'このチャットでは現在のリーダーを維持します。変更する場合だけ選択してください。'
        : 'I will keep the current leader for this chat unless you choose to switch.',
      '<div class="inline-actions">',
      `<button class="primary-btn inline-btn" type="button" data-chat-action="keep-leader">${escapeHtml(ja ? `${currentLabel}のまま進める` : `Keep ${currentLabel}`)}</button>`,
      `<button class="ghost-btn inline-btn" type="button" data-chat-action="switch-leader" data-leader-task="${escapeHtml(suggestedOwner.taskType || '')}">${escapeHtml(ja ? `${suggestedLabel}に変更` : `Switch to ${suggestedLabel}`)}</button>`,
      '</div>'
    ].join('\n');
  }

  function suggestLeaderChangeIfNeeded(candidateTaskType = '', sample = '', source = '', options = {}) {
    if (options.skipLeaderChangeProposal === true) return false;
    const currentOwner = currentLockedLeaderOwner();
    const suggestedOwner = leaderOwner(candidateTaskType, 'Suggested by the latest request wording.');
    if (!currentOwner || !suggestedOwner || currentOwner.taskType === suggestedOwner.taskType) return false;
    const previous = state.pendingLeaderChange;
    state.pendingLeaderChange = {
      fromTaskType: currentOwner.taskType,
      fromLabel: currentOwner.label || taskLabel(currentOwner.taskType),
      toTaskType: suggestedOwner.taskType,
      toLabel: suggestedOwner.label || taskLabel(suggestedOwner.taskType),
      sample: String(sample || '').slice(0, 4000),
      preparedPrompt: String(options.preparedPrompt || sample || '').slice(0, 8000),
      source: String(source || '').slice(0, 80),
      createdAt: isoNow()
    };
    if (previous
      && previous.fromTaskType === state.pendingLeaderChange.fromTaskType
      && previous.toTaskType === state.pendingLeaderChange.toTaskType
      && previous.preparedPrompt === state.pendingLeaderChange.preparedPrompt) {
      updateComposerMode();
      setBusy(state.busy);
      return true;
    }
    appendMessage('assistant', leaderChangeProposalHtml(currentOwner, suggestedOwner, sample), {
      tone: 'info',
      label: chatText('Leader choice', 'リーダー確認', sample)
    });
    updateComposerMode();
    setBusy(state.busy);
    return true;
  }

  async function resolvePendingLeaderChange(accept = false, taskType = '') {
    const pending = state.pendingLeaderChange && typeof state.pendingLeaderChange === 'object' ? state.pendingLeaderChange : null;
    if (!pending) {
      appendTextMessage('assistant', chatText(
        'There is no pending leader change to resolve.',
        '確認中のリーダー変更はありません。',
        state.conversationLanguage
      ), { tone: 'error', label: 'Leader choice' });
      return;
    }
    const currentOwner = leaderOwner(pending.fromTaskType, 'Leader kept by user choice.');
    const suggestedOwner = leaderOwner(taskType || pending.toTaskType, 'User accepted the leader change.');
    const owner = accept ? suggestedOwner : currentOwner;
    if (!owner?.taskType) {
      state.pendingLeaderChange = null;
      appendTextMessage('assistant', chatText(
        'I could not resolve that leader choice. Please name the leader directly if you want to switch.',
        'リーダー選択を解決できませんでした。変更する場合はリーダー名を直接指定してください。',
        pending.sample
      ), { tone: 'error', label: 'Leader choice' });
      return;
    }
    state.pendingLeaderChange = null;
    state.activeOwner = {
      type: 'leader',
      taskType: owner.taskType,
      label: owner.label || taskLabel(owner.taskType),
      reason: owner.reason || ''
    };
    state.activeOwnerLocked = true;
    state.activeLeader = {
      taskType: owner.taskType,
      label: owner.label || taskLabel(owner.taskType),
      reason: owner.reason || ''
    };
    state.activeLeaderLocked = true;
    renderActiveLeaderStatus();
    if (state.pendingIntake) {
      state.pendingIntake.taskType = owner.taskType;
      state.pendingIntake.activeLeaderTaskType = owner.taskType;
      state.pendingIntake.activeLeaderName = owner.label || taskLabel(owner.taskType);
      state.pendingIntake.conversationOwner = owner;
    }
    if (state.draft) {
      state.draft = withConversationOwner(state.draft, owner, {
        leaderChangeRequested: accept,
        leader_change_requested: accept
      });
      appendOrderConfirmation({ updated: true });
      return;
    }
    appendTextMessage('assistant', chatText(
      accept
        ? `${owner.label || taskLabel(owner.taskType)} will lead this chat. I will prepare the order from the same request.`
        : `${owner.label || taskLabel(owner.taskType)} stays as the lead. I will prepare the order from the same request.`,
      accept
        ? `${owner.label || taskLabel(owner.taskType)} に切り替えます。同じ依頼内容で発注準備を続けます。`
        : `${owner.label || taskLabel(owner.taskType)} のまま進めます。同じ依頼内容で発注準備を続けます。`,
      pending.sample
    ), { tone: 'ok', label: chatText('Leader choice', 'リーダー確認', pending.sample) });
    const prompt = String(pending.preparedPrompt || pending.sample || '').trim();
    if (prompt) {
      await prepareOrder(prompt, {
        originalPrompt: pending.sample || prompt,
        taskType: owner.taskType,
        activeLeaderTaskType: owner.taskType,
        activeLeaderName: owner.label || taskLabel(owner.taskType),
        activeLeaderLocked: true,
        leaderChangeRequested: accept,
        skipLeaderChangeProposal: true
      });
    }
  }

  function renderActiveLeaderStatus() {
    if (!els.activeLeaderStatus) return;
    const owner = state.activeOwner || (state.activeLeader ? { type: 'leader', ...state.activeLeader } : null);
    if (owner?.type === 'agent' && owner.taskType) {
      els.activeLeaderStatus.textContent = `Agent: ${owner.label || taskLabel(owner.taskType)}`;
      els.activeLeaderStatus.dataset.owner = 'agent';
      els.activeLeaderStatus.title = owner.reason || 'This agent is gathering details, drafting, and revising in this chat.';
      return;
    }
    const leader = owner?.type === 'leader' ? owner : state.activeLeader;
    if (leader?.taskType) {
      els.activeLeaderStatus.textContent = `Lead: ${leader.label || taskLabel(leader.taskType)}`;
      els.activeLeaderStatus.dataset.owner = 'leader';
      els.activeLeaderStatus.title = leader.reason || 'This leader is gathering details and coordinating the order.';
      return;
    }
    els.activeLeaderStatus.textContent = 'CAIt routing';
    els.activeLeaderStatus.dataset.owner = 'cait';
    els.activeLeaderStatus.title = 'CAIt will route to a specialist directly or hand broad work to a leader.';
  }

  function activateLeaderForChat(taskType = '', sample = '') {
    const owner = leaderOwner(taskType, 'User asked for a leader chat consultation.');
    if (!owner?.taskType) return false;
    state.pendingLeaderChange = null;
    state.pendingIntake = null;
    state.activeOwner = {
      type: 'leader',
      taskType: owner.taskType,
      label: owner.label || taskLabel(owner.taskType),
      reason: owner.reason || ''
    };
    state.activeOwnerLocked = true;
    state.activeLeader = {
      taskType: owner.taskType,
      label: owner.label || taskLabel(owner.taskType),
      reason: owner.reason || ''
    };
    state.activeLeaderLocked = true;
    renderActiveLeaderStatus();
    updateComposerMode();
    const label = owner.label || taskLabel(owner.taskType);
    appendTextMessage('assistant', chatText(
      [
        `${label} is now the conversation lead.`,
        '',
        'Ask the decision, context, channel, constraints, or next move you want to discuss.',
        '',
        'This is chat consultation only. No order or billing happened. If you want CAIt to prepare or run a plan, describe the deliverable or say "prepare an order."'
      ].join('\n'),
      [
        `${label} がこのチャットの会話リーダーになりました。`,
        '',
        '相談したい判断、背景、チャネル、制約、次の打ち手を書いてください。',
        '',
        'これはチャット相談のみです。注文も課金も発生していません。CAIt に計画の作成や実行を依頼する場合は、成果物を書くか「発注準備」と伝えてください。'
      ].join('\n'),
      sample
    ), { tone: 'ok', label: chatText('Leader chat', 'リーダー相談', sample) });
    return true;
  }

  function setConversationOwnerFromPrepared(prepared = {}, options = {}) {
    const previous = state.activeOwner
      ? { ...state.activeOwner }
      : (state.activeLeader ? { type: 'leader', ...state.activeLeader } : { type: 'cait', label: 'CAIt', taskType: '' });
    const lockedStateLeader = state.activeLeaderLocked && state.activeLeader?.taskType
      ? state.activeLeader
      : null;
    const lockedStateOwner = state.activeOwnerLocked && state.activeOwner?.taskType
      ? state.activeOwner
      : null;
    const lockedOwner = lockedLeaderOwnerForPrompt(options.sample || prepared.prompt || '', options)
      || lockedAgentOwnerForPrompt(options.sample || prepared.prompt || '', options);
    const owner = lockedOwner || conversationOwnerFromPrepared(prepared, {
      activeLeaderTaskType: options.activeLeaderTaskType || lockedStateLeader?.taskType || '',
      activeLeaderName: options.activeLeaderName || lockedStateLeader?.label || '',
      activeLeaderLocked: options.activeLeaderLocked === true || Boolean(lockedStateLeader),
      activeOwnerType: options.activeOwnerType || lockedStateOwner?.type || '',
      activeOwnerTaskType: options.activeOwnerTaskType || lockedStateOwner?.taskType || '',
      activeOwnerName: options.activeOwnerName || lockedStateOwner?.label || '',
      activeOwnerLocked: options.activeOwnerLocked === true || Boolean(lockedStateOwner),
      conversationOwner: options.conversationOwner || null
    });
    state.activeOwner = owner.type !== 'cait'
      ? {
          type: owner.type,
          taskType: owner.taskType,
          label: owner.label || taskLabel(owner.taskType),
          reason: owner.reason || ''
        }
      : null;
    state.activeOwnerLocked = Boolean(state.activeOwner?.taskType && (state.activeOwnerLocked || owner.type !== 'cait'));
    state.activeLeader = owner.type === 'leader'
      ? {
          taskType: owner.taskType,
          label: owner.label || taskLabel(owner.taskType),
          reason: owner.reason || ''
        }
      : null;
    state.activeLeaderLocked = Boolean(state.activeLeader?.taskType && (state.activeLeaderLocked || owner.type === 'leader'));
    renderActiveLeaderStatus();
    const current = state.activeOwner || (state.activeLeader ? { type: 'leader', ...state.activeLeader } : { type: 'cait', label: 'CAIt', taskType: '' });
    const changed = !sameConversationOwner(previous, current);
    if (options.announce === true && changed) {
      if (state.activeLeader) {
        const label = state.activeLeader.label || taskLabel(state.activeLeader.taskType);
        appendTextMessage('assistant', chatText(
          `${label} is now leading this order. CAIt will stay as the router, and ${label} will gather missing details, request approvals, and coordinate specialists/apps.`,
          `${label} にチャット主体を切り替えます。CAIt はルーターとして残り、${label} が不足情報の確認、承認ポイント、専門エージェント/アプリ連携を進めます。`,
          options.sample || prepared.prompt || ''
        ), { tone: 'ok', label: 'CAIt' });
      } else if (state.activeOwner?.type === 'agent') {
        const label = state.activeOwner.label || taskLabel(state.activeOwner.taskType);
        appendTextMessage('assistant', chatText(
          `${label} is now handling this chat. CAIt will stay as the router, and ${label} will gather details, draft, revise, and prepare the order.`,
          `${label} がこのチャットを担当します。CAIt はルーターとして残り、${label} が不足情報の確認、作成、修正、発注準備を進めます。`,
          options.sample || prepared.prompt || ''
        ), { tone: 'ok', label: 'CAIt' });
      } else {
        appendTextMessage('assistant', chatText(
          'CAIt will keep this chat and route directly to the best specialist unless the scope becomes leader-level.',
          'この内容は CAIt が会話主体のまま、必要な専門エージェントへ直接ルーティングします。スコープが広がった場合はリーダーへ切り替えます。',
          options.sample || prepared.prompt || ''
        ), { tone: 'ok', label: 'CAIt' });
      }
    }
    return state.activeOwner || state.activeLeader;
  }

  function activeActorLabel(fallback = 'CAIt') {
    return state.activeOwner?.label || state.activeLeader?.label || fallback;
  }

  return {
    activateLeaderForChat,
    activeActorLabel,
    currentLockedConversationOwner,
    currentLockedLeaderOwner,
    lockedAgentOwnerForPrompt,
    lockedLeaderOwnerForPrompt,
    renderActiveLeaderStatus,
    resolvePendingLeaderChange,
    setConversationOwnerFromPrepared,
    suggestLeaderChangeIfNeeded
  };
}
