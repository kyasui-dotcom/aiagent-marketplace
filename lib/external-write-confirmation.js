function hasBooleanConfirmation(body = {}, snakeKey = '', camelKey = '') {
  if (!body || typeof body !== 'object') return false;
  if (snakeKey && body[snakeKey] === true) return true;
  if (camelKey && body[camelKey] === true) return true;
  return false;
}

export function hasPostConfirmation(body = {}) {
  return hasBooleanConfirmation(body, 'confirm_post', 'confirmPost');
}

export function hasSendConfirmation(body = {}) {
  return hasBooleanConfirmation(body, 'confirm_send', 'confirmSend');
}

export function hasRepoWriteConfirmation(body = {}) {
  return hasBooleanConfirmation(body, 'confirm_repo_write', 'confirmRepoWrite');
}

export function hasAdapterPrConfirmation(body = {}) {
  return hasBooleanConfirmation(body, 'confirm_adapter_pr', 'confirmAdapterPr');
}
