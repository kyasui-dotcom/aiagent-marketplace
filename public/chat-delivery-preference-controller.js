const DELIVERY_FORMAT_LABELS = Object.freeze({
  chat_summary: 'Chat summary',
  files: 'Files',
  review_packets: 'Review packets',
  planning_options: 'Planning options',
  approval_queue: 'Approval queue'
});

export function createChatDeliveryPreferenceController(options = {}) {
  const getValue = typeof options.getValue === 'function' ? options.getValue : (() => '');

  function selectedDeliveryFormat() {
    return String(getValue() || 'chat_summary').trim() || 'chat_summary';
  }

  function selectedDeliveryFormatLabel(format = selectedDeliveryFormat()) {
    return DELIVERY_FORMAT_LABELS[String(format || '').trim()] || DELIVERY_FORMAT_LABELS.chat_summary;
  }

  return {
    selectedDeliveryFormat,
    selectedDeliveryFormatLabel
  };
}
