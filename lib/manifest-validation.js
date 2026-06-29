import {
  MANIFEST_AGENT_ROLES,
  MANIFEST_AUTH_TYPES,
  MANIFEST_CLARIFICATION_MODES,
  MANIFEST_EXECUTION_PATTERNS,
  MANIFEST_GOOGLE_SOURCE_TYPES,
  MANIFEST_KINDS,
  MANIFEST_RISK_LEVELS
} from './manifest-contract-constants.js';

export function validateManifest(manifest) {
  const errors = [];
  if (!manifest?.schemaVersion) errors.push('manifest.schema_version is required');
  if (manifest?.schemaVersion !== 'agent-manifest/v1') errors.push('manifest.schema_version must be agent-manifest/v1');
  if (!MANIFEST_KINDS.has(String(manifest?.kind || ''))) errors.push('manifest.kind must be one of: agent, composite_agent, agent_group');
  if (!MANIFEST_AGENT_ROLES.has(String(manifest?.agentRole || 'worker'))) errors.push('manifest.agent_role must be one of: worker, leader');
  if (!manifest?.name) errors.push('manifest.name is required');
  if (!Array.isArray(manifest?.taskTypes) || !manifest.taskTypes.length) errors.push('manifest.task_types must include at least one task type');
  if (!Number.isFinite(manifest?.providerMarkupRate) || manifest.providerMarkupRate < 0 || manifest.providerMarkupRate > 1) {
    errors.push('manifest provider_markup_rate must be a number between 0 and 1');
  }
  if (!Number.isFinite(manifest?.platformMarginRate) || manifest.platformMarginRate < 0 || manifest.platformMarginRate >= 1) errors.push('manifest platform_margin_rate must be a number between 0 and 1');
  if (!['usage_based', 'fixed_per_run', 'subscription_required', 'hybrid'].includes(String(manifest?.pricingModel || 'usage_based'))) {
    errors.push('manifest pricing_model must be one of: usage_based, fixed_per_run, subscription_required, hybrid');
  }
  if (!Number.isFinite(manifest?.fixedRunPriceUsd) || manifest.fixedRunPriceUsd < 0) errors.push('manifest fixed_run_price_usd must be a non-negative number');
  if (!Number.isFinite(manifest?.subscriptionMonthlyPriceUsd) || manifest.subscriptionMonthlyPriceUsd < 0) errors.push('manifest subscription_monthly_price_usd must be a non-negative number');
  if (!['included', 'usage_based', 'fixed_per_run'].includes(String(manifest?.overageMode || 'included'))) {
    errors.push('manifest overage_mode must be one of: included, usage_based, fixed_per_run');
  }
  if (!Number.isFinite(manifest?.overageFixedRunPriceUsd) || manifest.overageFixedRunPriceUsd < 0) errors.push('manifest overage_fixed_run_price_usd must be a non-negative number');
  if (manifest?.pricingModel === 'fixed_per_run' && manifest.fixedRunPriceUsd <= 0) {
    errors.push('manifest fixed_run_price_usd is required when pricing_model=fixed_per_run');
  }
  if ((manifest?.pricingModel === 'subscription_required' || manifest?.pricingModel === 'hybrid') && manifest.subscriptionMonthlyPriceUsd <= 0) {
    errors.push('manifest subscription_monthly_price_usd is required when pricing_model=subscription_required or hybrid');
  }
  if (manifest?.pricingModel === 'hybrid' && manifest.overageMode === 'fixed_per_run' && manifest.overageFixedRunPriceUsd <= 0) {
    errors.push('manifest overage_fixed_run_price_usd is required when pricing_model=hybrid and overage_mode=fixed_per_run');
  }
  if (!Number.isFinite(manifest?.successRate) || manifest.successRate < 0 || manifest.successRate > 1) errors.push('manifest success_rate must be between 0 and 1');
  if (!Number.isFinite(manifest?.avgLatencySec) || manifest.avgLatencySec < 0) errors.push('manifest avg_latency_sec must be a non-negative number');
  if (!MANIFEST_EXECUTION_PATTERNS.has(String(manifest?.executionPattern || ''))) errors.push('manifest.execution_pattern must be one of: instant, async, long_running, scheduled, monitoring');
  if (!Array.isArray(manifest?.inputTypes) || !manifest.inputTypes.length) errors.push('manifest.input_types must include at least one input type');
  if (!Array.isArray(manifest?.outputTypes) || !manifest.outputTypes.length) errors.push('manifest.output_types must include at least one output type');
  if (!MANIFEST_CLARIFICATION_MODES.has(String(manifest?.clarification || ''))) errors.push('manifest.clarification must be one of: no_clarification, optional_clarification, required_intake, multi_turn');
  if (!Array.isArray(manifest?.requiredGoogleSources)) errors.push('manifest.required_google_sources must be an array when provided');
  for (const source of Array.isArray(manifest?.requiredGoogleSources) ? manifest.requiredGoogleSources : []) {
    if (!MANIFEST_GOOGLE_SOURCE_TYPES.has(String(source || ''))) errors.push('manifest.required_google_sources entries must be one of: gsc, ga4, drive, calendar, gmail');
  }
  if (!MANIFEST_RISK_LEVELS.has(String(manifest?.riskLevel || ''))) errors.push('manifest.risk_level must be one of: safe, review_required, confirm_required, restricted');
  if (manifest?.verification?.challengeToken && !manifest?.verification?.challengePath && !manifest?.verification?.challengeUrl) {
    errors.push('manifest.verification challenge requires challenge_path or challenge_url');
  }
  if (!MANIFEST_AUTH_TYPES.has(String(manifest?.auth?.type || 'none'))) {
    errors.push('manifest.auth.type must be one of: none, bearer, header');
  }
  if (['bearer', 'header'].includes(manifest?.auth?.type) && !manifest?.auth?.token) {
    errors.push(`manifest.auth.${manifest?.auth?.type === 'bearer' ? 'token' : 'token'} is required when auth.type=${manifest?.auth?.type}`);
  }
  if (manifest?.auth?.type === 'header' && !manifest?.auth?.headerName) {
    errors.push('manifest.auth.header_name is required when auth.type=header');
  }
  if (manifest?.kind === 'composite_agent') {
    const components = Array.isArray(manifest?.composition?.components) ? manifest.composition.components : [];
    const mode = String(manifest?.composition?.mode || '').trim();
    if (components.length < 2) errors.push('manifest.composition.components must include at least two internal agents when kind=composite_agent');
    if (mode !== 'provider_orchestrated') errors.push('manifest.composition.mode must be provider_orchestrated for composite agents in the current CAIt runtime');
  }
  if (manifest?.kind === 'agent_group' || manifest?.kind === 'agent_suite') {
    const components = Array.isArray(manifest?.composition?.components) ? manifest.composition.components : [];
    const mode = String(manifest?.composition?.mode || '').trim();
    if (components.length < 2) errors.push('manifest.composition.components must include at least two grouped agents when kind=agent_group');
    if (mode !== 'platform_orchestrated') errors.push('manifest.composition.mode must be platform_orchestrated when kind=agent_group; use kind=composite_agent for a provider-orchestrated single endpoint');
  }
  return { ok: errors.length === 0, errors };
}
