import { subscriptionPlanLabel } from './client-billing-utils.js?v=20260521a';
import { DONATION_ONLY_NOTICE } from './client-payment-removal-ui.js?v=20260527a';
import {
  TEMPORARY_INVOICE_BILLING_ENABLED,
  temporaryInvoiceNoticeLines
} from './client-temporary-invoice-controller.js?v=20260527a';

export function orderApiBaseUrl() {
  return `${window.location.origin}/api/jobs`;
}

export function formatOrderApiCommand(token = '<CAIT_API_KEY>') {
  return [
    `curl.exe -X POST ${orderApiBaseUrl()} ^`,
    '  -H "content-type: application/json" ^',
    `  -H "authorization: Bearer ${token}" ^`,
    '  -d "{\\"parent_agent_id\\":\\"cloudcode-main\\",\\"task_type\\":\\"research\\",\\"prompt\\":\\"Compare support options for used iPhone repairs\\"}"',
    '',
    '# Follow up on a delivery with followup_to_job_id',
    `curl.exe -X POST ${orderApiBaseUrl()} ^`,
    '  -H "content-type: application/json" ^',
    `  -H "authorization: Bearer ${token}" ^`,
    '  -d "{\\"parent_agent_id\\":\\"cloudcode-main\\",\\"task_type\\":\\"research\\",\\"followup_to_job_id\\":\\"<PREVIOUS_JOB_ID>\\",\\"prompt\\":\\"Answers: deliver as Markdown and focus on Japan.\\"}"',
    '',
    '# Vague requests return status=needs_input before billing. Resubmit with answers before billing or dispatch.'
  ].join('\n');
}

export function formatAgentApiCommand(token = '<CAIT_API_KEY>') {
  return [
    `curl.exe -X POST ${window.location.origin}/api/agents/import-manifest ^`,
    '  -H "content-type: application/json" ^',
    `  -H "authorization: Bearer ${token}" ^`,
    '  -d "{\\"manifest\\":{\\"schema_version\\":\\"agent-manifest/v1\\",\\"name\\":\\"my_agent\\",\\"task_types\\":[\\"research\\"],\\"pricing\\":{\\"provider_markup_rate\\":0.1,\\"token_markup_rate\\":0.1,\\"platform_margin_rate\\":0.1},\\"usage_contract\\":{\\"report_input_tokens\\":true,\\"report_output_tokens\\":true,\\"report_model\\":true,\\"report_external_api_cost\\":true},\\"healthcheck_url\\":\\"https://example.com/api/health\\",\\"job_endpoint\\":\\"https://example.com/api/jobs\\"}}"'
  ].join('\n');
}

export function createClientDeveloperSurfaceController(deps = {}) {
  const {
    els = {},
    state = {},
    developerSurfacesStatus = 'Coming soon',
    developerSurfacesNotice = '',
    copyTextToClipboard = async () => {},
    escapeHtml = (value) => String(value || ''),
    flash = () => {},
    formatTime = (value) => String(value || '-'),
    renderConnectFlow = () => {},
    safeText = () => {},
    setElementVisible = () => {}
  } = deps;

  function openPlanModal() {
    if (!els.planModal) return;
    state.planIntentArmed = true;
    const selectedPlan = String(els.billingSubscriptionPlan?.value || '').trim().toLowerCase();
    const nextPlan = selectedPlan && selectedPlan !== 'none' ? selectedPlan : 'starter';
    if (els.planModalPlan) {
      els.planModalPlan.value = nextPlan;
    }
    renderPlanModalSummary();
    setElementVisible(els.planModal, true);
    window.requestAnimationFrame(() => els.planModalPlan?.focus());
  }

  function closePlanModal() {
    state.planIntentArmed = false;
    setElementVisible(els.planModal, false);
  }

  function currentApiKeyRevealToken() {
    return String(els.apiKeyRevealToken?.value || state.lastIssuedOrderApiKey?.token || '').trim();
  }

  function selectApiKeyRevealToken() {
    if (!els.apiKeyRevealToken) return;
    els.apiKeyRevealToken.focus();
    els.apiKeyRevealToken.select();
  }

  function showApiKeyRevealResult(message = '') {
    safeText(els.apiKeyRevealResult, message || 'Copy the key, then paste it into Codex, CLI, or your server secret store.');
  }

  function openApiKeyRevealModal(issued = null) {
    const token = String(issued?.token || '').trim();
    if (!token || !els.apiKeyRevealModal || !els.apiKeyRevealToken) return;
    els.apiKeyRevealToken.value = token;
    showApiKeyRevealResult([
      'Copy this key now.',
      `Label: ${issued.label || '-'}`,
      `Prefix: ${issued.prefix || token.slice(0, 16)}...`,
      '',
      'Close this popup only after the key is saved. CAIt cannot show the raw secret again.'
    ].join('\n'));
    setElementVisible(els.apiKeyRevealModal, true);
    window.requestAnimationFrame(() => selectApiKeyRevealToken());
  }

  function forgetLastIssuedApiKeySecret() {
    if (!state.lastIssuedOrderApiKey?.token) return;
    state.lastIssuedOrderApiKey = {
      ...state.lastIssuedOrderApiKey,
      token: ''
    };
  }

  function closeApiKeyRevealModal() {
    if (els.apiKeyRevealToken) els.apiKeyRevealToken.value = '';
    setElementVisible(els.apiKeyRevealModal, false);
    forgetLastIssuedApiKeySecret();
    renderOrderApiKeys(state.snapshot?.accountSettings, state.snapshot?.auth);
    renderConnectFlow();
  }

  async function copyApiKeyRevealValue(kind = 'token') {
    const token = currentApiKeyRevealToken();
    if (!token) {
      showApiKeyRevealResult('No raw key is available in this popup. Issue a new key if you closed the one-time reveal.');
      flash('No raw key available. Issue a new CAIt API key.', 'error');
      return;
    }
    const text = kind === 'header'
      ? `Authorization: Bearer ${token}`
      : kind === 'curl'
        ? formatOrderApiCommand(token)
        : token;
    const label = kind === 'header'
      ? 'Authorization header copied.'
      : kind === 'curl'
        ? 'CAIt API curl command copied.'
        : 'CAIt API key copied.';
    await copyTextToClipboard(text, label);
    showApiKeyRevealResult([
      label,
      '',
      'Paste it into Codex, CLI, or your server secret store now.',
      'After closing this popup, CAIt will only show the key prefix.'
    ].join('\n'));
    selectApiKeyRevealToken();
  }

  function renderPlanModalSummary() {
    if (!els.planModalSummary) return;
    const plan = String(els.planModalPlan?.value || '').trim().toLowerCase();
    const label = subscriptionPlanLabel(plan);
    if (TEMPORARY_INVOICE_BILLING_ENABLED) {
      safeText(els.planModalSummary, [
        `Selected plan: ${label}`,
        ...temporaryInvoiceNoticeLines('plan'),
        'The plan activation will be handled manually after invoice payment confirmation.'
      ].join('\n'));
      return;
    }
    safeText(els.planModalSummary, [
      `Selected plan: ${label}`,
      DONATION_ONLY_NOTICE,
      'Plan activation is not available while in-app payment processing is removed.',
      'Orders can still show cost context without a saved card or subscription.'
    ].join('\n'));
  }

  function renderOrderApiKeys(account = null) {
    if (!els.apiKeyCreateResult || !els.apiKeyTable) return;
    const apiKeys = account?.apiAccess?.orderKeys || [];
    if (els.apiKeyLabel) els.apiKeyLabel.disabled = true;
    if (els.apiKeyMode) els.apiKeyMode.disabled = true;
    if (els.createApiKeyBtn) els.createApiKeyBtn.disabled = true;
    state.lastIssuedOrderApiKey = null;
    safeText(els.apiKeyCreateResult, [
      `${developerSurfacesStatus}: CAIt API keys`,
      '',
      developerSurfacesNotice,
      '',
      'API key creation, listing for new use, revoke actions, CLI ordering, and MCP are disabled by default.',
      'Use browser-owned CAIt Chat, Apps, Deliveries, and Publisher flows until the external contract is re-enabled.'
    ].join('\n'));
    if (!apiKeys.length) {
      els.apiKeyTable.innerHTML = '<div class="empty">CAIt API keys are coming soon.</div>';
      return;
    }
    els.apiKeyTable.innerHTML = `<div class="table-header runs-grid"><div>KEY</div><div>LAST USED</div><div>STATUS</div></div>${apiKeys.map((key) => `
    <div class="table-row runs-grid">
      <div>${escapeHtml(key.label)}<div class="row-muted">${escapeHtml(`${String(key.mode || 'live').toUpperCase()} · ${key.prefix}… · ${key.scopes.join(', ')}`)}</div></div>
      <div>${escapeHtml(key.lastUsedAt ? formatTime(key.lastUsedAt) : 'never')}<div class="row-muted">${escapeHtml(`${key.lastUsedMethod || '-'} ${key.lastUsedPath || ''}`.trim())}</div></div>
      <div><span class="status-pill warn">${key.active ? 'PAUSED' : 'REVOKED'}</span><div class="row-muted">${key.active ? 'External API disabled' : escapeHtml(formatTime(key.revokedAt))}</div></div>
    </div>`).join('')}`;
  }

  function showDeveloperSurfacePausedResult() {
    safeText(els.apiKeyCreateResult, [
      `${developerSurfacesStatus}: CAIt API keys`,
      '',
      developerSurfacesNotice
    ].join('\n'));
    flash('CAIt API keys are coming soon.', 'warn');
  }

  function bindDeveloperSurfaceInteractions() {
    if (els.apiKeyMode) els.apiKeyMode.onchange = () => renderOrderApiKeys(state.snapshot?.accountSettings, state.snapshot?.auth);
    if (els.createApiKeyBtn) els.createApiKeyBtn.onclick = showDeveloperSurfacePausedResult;
    if (els.apiKeyTable) els.apiKeyTable.onclick = (event) => {
      const button = event.target?.closest?.('[data-api-key-id]');
      if (!button) return;
      showDeveloperSurfacePausedResult();
    };
    if (els.cancelPlanModalBtn) els.cancelPlanModalBtn.onclick = () => closePlanModal();
    if (els.planModal) {
      els.planModal.onclick = (event) => {
        if (event.target === els.planModal) closePlanModal();
      };
    }
    if (els.apiKeyRevealModal) {
      els.apiKeyRevealModal.onclick = (event) => {
        if (event.target !== els.apiKeyRevealModal) return;
        showApiKeyRevealResult('Copy and save the key before closing this one-time popup.');
        selectApiKeyRevealToken();
      };
    }
    if (els.copyApiKeyTokenBtn) els.copyApiKeyTokenBtn.onclick = () => { void copyApiKeyRevealValue('token'); };
    if (els.copyApiKeyHeaderBtn) els.copyApiKeyHeaderBtn.onclick = () => { void copyApiKeyRevealValue('header'); };
    if (els.copyApiKeyCurlBtn) els.copyApiKeyCurlBtn.onclick = () => { void copyApiKeyRevealValue('curl'); };
    if (els.closeApiKeyRevealBtn) els.closeApiKeyRevealBtn.onclick = () => closeApiKeyRevealModal();
    if (els.planModalPlan) {
      els.planModalPlan.oninput = () => renderPlanModalSummary();
      els.planModalPlan.onchange = () => renderPlanModalSummary();
      els.planModalPlan.onkeydown = (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          els.confirmPlanModalBtn?.click();
        }
      };
    }
  }

  return {
    bindDeveloperSurfaceInteractions,
    closeApiKeyRevealModal,
    closePlanModal,
    copyApiKeyRevealValue,
    currentApiKeyRevealToken,
    formatAgentApiCommand,
    formatOrderApiCommand,
    openApiKeyRevealModal,
    openPlanModal,
    renderOrderApiKeys,
    renderPlanModalSummary,
    selectApiKeyRevealToken,
    showApiKeyRevealResult
  };
}
