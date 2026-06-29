export function renderOrderStrategyControlsElement(elements = {}, options = {}) {
  const requested = ['auto', 'single', 'multi'].includes(String(options.requested || ''))
    ? String(options.requested)
    : 'auto';
  const buttons = {
    auto: elements.executionAutoBtn,
    single: elements.executionSingleBtn,
    multi: elements.executionTeamBtn
  };
  if (!buttons.auto && !buttons.single && !buttons.multi && !elements.executionChoiceSummary) return;
  Object.entries(buttons).forEach(([value, button]) => {
    if (!button) return;
    button.classList.toggle('active', requested === value);
    button.setAttribute('aria-pressed', requested === value ? 'true' : 'false');
  });
  if (elements.executionChoiceCurrent) {
    elements.executionChoiceCurrent.textContent = requested === 'multi'
      ? 'LEADER'
      : requested === 'single'
      ? 'SPECIALIST'
      : 'AUTO';
  }
  if (!elements.executionChoiceSummary) return;
  const prompt = String(options.prompt || '').trim();
  if (!prompt) {
    elements.executionChoiceSummary.textContent = [
      'AUTO lets CAIt choose between a Specialist Agent and a Leader Agent before SEND ORDER.',
      'Specialist is usually cheaper. Leader is better when the request spans several specialties. Use /route to override.'
    ].join(' ');
    return;
  }
  const lines = [
    `${options.activeLabel || 'Auto'}. ${options.activeReason || ''}`.trim(),
    `Specialist Agent estimate: ${options.singleEstimateLabel || 'not enough ready agents'}.`,
    `Leader Agent estimate: ${options.teamEstimateLabel || 'not enough ready agents'}${options.teamCount ? ` across ${options.teamCount} agents` : ''}.`,
    'Use a Specialist Agent for lower cost. Use a Leader Agent when coordination across specialties matters.'
  ];
  elements.executionChoiceSummary.textContent = lines.join(' ');
}
