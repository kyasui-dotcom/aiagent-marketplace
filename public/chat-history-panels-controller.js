export function createChatHistoryPanelsController(options = {}) {
  const {
    state,
    escapeHtml,
    isDeliveryHistoryQuestionIntentText,
    chatLanguage,
    chatText,
    refreshChatSessionHistory,
    refreshRecentJobs,
    fetchVisibleJob,
    jobHasDeliveryResult,
    jobUtilityRows,
    chatSessionUtilityRows,
    utilityEmptyHtml,
    openUtilityModal,
    orderErrorMessage,
    appendTextMessage,
    rememberTrackedOrder,
    statusDisplayLabel,
    renderDeliveryOnce
  } = options;

  async function showChatListPanel() {
    openUtilityModal('Chats', utilityEmptyHtml('Loading chat sessions...'));
    try {
      const sessions = await refreshChatSessionHistory({ force: true });
      openUtilityModal('Chats', [
        '<div class="chat-hint">Chats show conversation and related orders. Live status is loaded from Order state.</div>',
        chatSessionUtilityRows(sessions)
      ].join('\n'));
    } catch (error) {
      openUtilityModal('Chats', utilityEmptyHtml(orderErrorMessage(error)));
    }
  }

  async function showDeliveryHistoryForPrompt(prompt = '') {
    if (!isDeliveryHistoryQuestionIntentText(prompt)) return false;
    const ja = chatLanguage(prompt) === 'ja';
    openUtilityModal('Deliveries', utilityEmptyHtml(ja ? '完了済みの納品を読み込み中です...' : 'Loading completed deliveries...'));
    try {
      const directJob = state.orderId ? await fetchVisibleJob(state.orderId, { force: true }).catch(() => null) : null;
      const jobs = await refreshRecentJobs({ force: true, limit: 50 });
      const merged = [
        ...(directJob?.id ? [directJob] : []),
        ...(Array.isArray(jobs) ? jobs : [])
      ].filter((job, index, all) => job?.id && all.findIndex((item) => String(item?.id || '') === String(job.id || '')) === index);
      const completed = merged.filter((job) => String(job.status || '').trim().toLowerCase() === 'completed' && jobHasDeliveryResult(job));
      const terminal = completed.length ? completed : merged.filter((job) => jobHasDeliveryResult(job));
      const primary = (state.orderId ? terminal.find((job) => String(job.id || '') === String(state.orderId)) : null) || terminal[0] || null;
      openUtilityModal('Deliveries', [
        `<div class="chat-hint">${escapeHtml(ja
          ? '完了済みまたは納品結果のあるオーダーだけを表示しています。Open でチャットに再表示できます。'
          : 'Showing completed orders or orders with delivery results. Use Open to restore one into the chat.')}</div>`,
        jobUtilityRows(terminal)
      ].join('\n'));
      if (!primary?.id) {
        appendTextMessage('assistant', chatText(
          'I could not find a completed delivery visible to this chat. No order was created.',
          'このチャットから見える完了済み納品物は見つかりませんでした。新しいオーダーは作成していません。',
          prompt
        ), { tone: 'warn', label: 'Delivery history' });
        return true;
      }
      rememberTrackedOrder(primary.id);
      state.orderId = primary.id;
      appendTextMessage('system', chatText(
        `Showing the latest completed delivery I can access: Order #${primary.id.slice(0, 8)} (${statusDisplayLabel(primary.status || 'completed')}). No new order was created.`,
        `表示できる最新の完了済み納品物を開きます: Order #${primary.id.slice(0, 8)} (${statusDisplayLabel(primary.status || 'completed')})。新しいオーダーは作成していません。`,
        prompt
      ), { label: 'Delivery history', record: false });
      renderDeliveryOnce(primary, { force: true });
      return true;
    } catch (error) {
      openUtilityModal('Deliveries', utilityEmptyHtml(orderErrorMessage(error)));
      appendTextMessage('assistant', orderErrorMessage(error), { tone: 'error', label: 'Delivery history' });
      return true;
    }
  }

  return {
    showChatListPanel,
    showDeliveryHistoryForPrompt
  };
}
