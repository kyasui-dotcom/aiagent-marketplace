function sanitizeWorkUiLabel(value = '', fallback = '') {
  const raw = String(value || '').replace(/[\r\n\t]/g, ' ').trim();
  if (!raw) return String(fallback || '').trim();
  return raw;
}

function escapeRegex(value = '') {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceCanonicalUiLabel(text = '', canonical = '', nextLabel = '') {
  const source = String(text || '');
  const canonicalText = String(canonical || '');
  const replacement = String(nextLabel || '').trim();
  if (!source || !canonicalText || !replacement || canonicalText === replacement) return source;
  return source.replace(new RegExp(escapeRegex(canonicalText), 'g'), replacement);
}

export function createClientWorkUiTextUtils(options = {}) {
  const appSettingDefaults = options.appSettingDefaults && typeof options.appSettingDefaults === 'object'
    ? options.appSettingDefaults
    : {};
  const getAppSettings = typeof options.getAppSettings === 'function'
    ? options.getAppSettings
    : () => ({});

  function appSettingValue(key = '', fallback = '') {
    const safeKey = String(key || '').trim();
    if (!safeKey) return String(fallback || '');
    const source = getAppSettings() || {};
    const value = source[safeKey];
    if (value === undefined || value === null || value === '') return String(fallback || '');
    return String(value);
  }

  function workOrderUiLabels() {
    return {
      sendOrder: sanitizeWorkUiLabel(
        appSettingValue('work_order_send_label', appSettingDefaults.work_order_send_label),
        appSettingDefaults.work_order_send_label
      ),
      addConstraints: sanitizeWorkUiLabel(
        appSettingValue('work_order_add_constraints_label', appSettingDefaults.work_order_add_constraints_label),
        appSettingDefaults.work_order_add_constraints_label
      ),
      prepareOrder: sanitizeWorkUiLabel(
        appSettingValue('work_order_prepare_label', appSettingDefaults.work_order_prepare_label),
        appSettingDefaults.work_order_prepare_label
      ),
      sendChat: sanitizeWorkUiLabel(
        appSettingValue('work_chat_send_label', appSettingDefaults.work_chat_send_label),
        appSettingDefaults.work_chat_send_label
      ),
      answerFirst: sanitizeWorkUiLabel(
        appSettingValue('work_order_answer_first_label', appSettingDefaults.work_order_answer_first_label),
        appSettingDefaults.work_order_answer_first_label
      ),
      revise: sanitizeWorkUiLabel(
        appSettingValue('work_order_revise_label', appSettingDefaults.work_order_revise_label),
        appSettingDefaults.work_order_revise_label
      ),
      cancel: sanitizeWorkUiLabel(
        appSettingValue('work_order_cancel_label', appSettingDefaults.work_order_cancel_label),
        appSettingDefaults.work_order_cancel_label
      )
    };
  }

  function formatWorkUiText(text = '') {
    const source = String(text || '');
    if (!source) return '';
    const labels = workOrderUiLabels();
    let output = source;
    output = replaceCanonicalUiLabel(output, appSettingDefaults.work_order_send_label, labels.sendOrder);
    output = replaceCanonicalUiLabel(output, appSettingDefaults.work_order_add_constraints_label, labels.addConstraints);
    output = replaceCanonicalUiLabel(output, appSettingDefaults.work_order_prepare_label, labels.prepareOrder);
    output = replaceCanonicalUiLabel(output, appSettingDefaults.work_chat_send_label, labels.sendChat);
    output = replaceCanonicalUiLabel(output, appSettingDefaults.work_order_answer_first_label, labels.answerFirst);
    output = replaceCanonicalUiLabel(output, appSettingDefaults.work_order_revise_label, labels.revise);
    output = replaceCanonicalUiLabel(output, appSettingDefaults.work_order_cancel_label, labels.cancel);
    return output;
  }

  function formatWorkUiTextSafe(text = '') {
    const source = String(text || '');
    if (!source) return '';
    const fencedParts = source.split(/(```[\s\S]*?```)/g);
    return fencedParts
      .map((part) => {
        if (part.startsWith('```')) return part;
        return part
          .split('\n')
          .map((line) => (/^\s*>/.test(line) ? line : formatWorkUiText(line)))
          .join('\n');
      })
      .join('');
  }

  return {
    appSettingValue,
    workOrderUiLabels,
    formatWorkUiText,
    formatWorkUiTextSafe
  };
}
