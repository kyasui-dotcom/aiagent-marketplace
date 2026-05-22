export function renderWorkChatEntryCardElement(elements = {}, auth = {}, options = {}) {
  const setElementVisible = options.setElementVisible;
  const show = Boolean(options.show);
  if (!elements.workChatEntryCard) return;
  if (typeof setElementVisible === 'function') setElementVisible(elements.workChatEntryCard, show);
  if (!show) return;
  const googleAvailable = Boolean(auth?.googleConfigured);
  const githubAvailable = Boolean(auth?.githubConfigured || auth?.githubAppConfigured);
  if (typeof setElementVisible === 'function') {
    setElementVisible(elements.entryGoogleLoginBtn, googleAvailable);
    setElementVisible(elements.entryGithubLoginBtn, githubAvailable);
  }
  if (elements.workChatEntryText) {
    const choices = [
      googleAvailable ? 'Google for ordering and billing' : null,
      githubAvailable ? 'GitHub for agent publishing' : null,
      'guest mode to try chat first'
    ].filter(Boolean);
    elements.workChatEntryText.textContent = `Choose how to start this chat: ${choices.join(', ')}.`;
  }
}
