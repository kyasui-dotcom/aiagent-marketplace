export function createClientWorkChatThreadController(deps = {}) {
  const {
    els,
    productShortName = 'CAIt',
    state,
    appSettingDefaults = {},
    appSettingValue = () => '',
    formatWorkUiText = (value) => String(value ?? ''),
    handleChatActionButton = async () => {},
    looksJapanese = () => false,
    renderChatMessage = () => '',
    runAction = (_button, action) => action?.()
  } = deps;

  function shouldStickWorkChatScrollToBottom(el = els?.workChatThread) {
    if (!el) return true;
    const distanceFromBottom = Number(el.scrollHeight || 0) - Number(el.scrollTop || 0) - Number(el.clientHeight || 0);
    return distanceFromBottom <= 96;
  }

  function renderWorkChatThread(options = {}) {
    if (!els?.workChatThread) return;
    const previousBottomOffset = Math.max(0, Number(els.workChatThread.scrollHeight || 0) - Number(els.workChatThread.scrollTop || 0));
    const stickToBottom = options.forceScroll === true || shouldStickWorkChatScrollToBottom(els.workChatThread);
    const messages = [];
    const introTitle = formatWorkUiText(appSettingValue('work_chat_intro_title', appSettingDefaults.work_chat_intro_title));
    const introBody = formatWorkUiText(appSettingValue('work_chat_intro_body', appSettingDefaults.work_chat_intro_body));

    messages.push(renderChatMessage(
      'agent',
      productShortName,
      [
        introTitle,
        '',
        introBody
      ].join('\n'),
      'intro'
    ));

    (state?.orderChatMessages || []).forEach((message) => {
      messages.push(renderChatMessage(message.role, message.label, message.body, message.tone || '', message.steps || [], {
        typing: Boolean(message.typing),
        thinking: Boolean(message.thinking),
        discussionTurns: message.discussionTurns || [],
        actions: message.actions || [],
        progressMeta: message.progressMeta || null,
        deliveryCard: message.deliveryCard || null,
        ja: looksJapanese(message.body || '')
      }));
    });

    els.workChatThread.innerHTML = messages.join('');
    els.workChatThread.querySelectorAll('[data-chat-action]').forEach((button) => {
      button.onclick = () => runAction(button, async () => {
        await handleChatActionButton(button.dataset.chatAction || '', {
          agentId: button.dataset.chatAgentId || '',
          connector: button.dataset.chatConnector || '',
          orderId: button.dataset.chatOrderId || '',
          capabilities: button.dataset.connectorCapabilities || '',
          googleCapabilities: button.dataset.connectorCapabilities || '',
          xCapabilities: button.dataset.connectorCapabilities || ''
        });
      });
    });
    if (stickToBottom) {
      els.workChatThread.scrollTop = els.workChatThread.scrollHeight;
    } else {
      els.workChatThread.scrollTop = Math.max(0, Number(els.workChatThread.scrollHeight || 0) - previousBottomOffset);
    }
  }

  return {
    renderWorkChatThread,
    shouldStickWorkChatScrollToBottom
  };
}
