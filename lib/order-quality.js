import { nowIso } from './events.js';

function normalizeString(value, fallback = '') {
  return String(value ?? fallback).trim();
}

export const COMMON_ORDER_QUALITY_RULES = Object.freeze([
  Object.freeze({
    id: 'source_backed_research_first',
    label: 'Source-backed research first',
    instruction: 'If current facts, market data, competitor claims, or external facts matter, use source-backed research before analysis and include source status in delivery.'
  }),
  Object.freeze({
    id: 'pass_research_into_child_agents',
    label: 'Pass research into child agents',
    instruction: 'For team workflows, pass research findings, sources, assumptions, blockers, and decisions into downstream child agents before they draft or execute.'
  }),
  Object.freeze({
    id: 'show_blockers_before_claiming_execution',
    label: 'Show blockers before claiming execution',
    instruction: 'If connector, source, payment, approval, or permission access is missing, show the blocker first and do not claim execution, publishing, sending, or external writes.'
  })
]);

export function commonOrderQualityRulesText() {
  return [
    'COMMON ORDER QUALITY RULES',
    ...COMMON_ORDER_QUALITY_RULES.map((rule) => `- ${rule.label}: ${rule.instruction}`)
  ].join('\n');
}

export function inputWithCommonOrderQualityRules(input = {}) {
  const base = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const broker = base._broker && typeof base._broker === 'object' && !Array.isArray(base._broker) ? base._broker : {};
  return {
    ...base,
    _broker: {
      ...broker,
      commonQualityRules: COMMON_ORDER_QUALITY_RULES.map((rule) => ({
        id: rule.id,
        instruction: rule.instruction
      }))
    }
  };
}

function chatPreparedOrderConfirmation(body = {}) {
  const input = body?.input && typeof body.input === 'object' && !Array.isArray(body.input) ? body.input : {};
  const broker = input._broker && typeof input._broker === 'object' && !Array.isArray(input._broker) ? input._broker : {};
  const intake = broker.intake && typeof broker.intake === 'object' && !Array.isArray(broker.intake) ? broker.intake : {};
  const chatux = broker.chatux && typeof broker.chatux === 'object' && !Array.isArray(broker.chatux) ? broker.chatux : {};
  const preparedInChat = intake.prepared_in_chat === true || intake.preparedInChat === true;
  const chatSource = normalizeString(body.parent_agent_id || body.parentAgentId).toLowerCase() === 'chatux'
    || normalizeString(input.source || body.source).toLowerCase() === 'chatux'
    || normalizeString(input.source || body.source).toLowerCase() === 'chat'
    || normalizeString(chatux.delivery_channel || chatux.deliveryChannel).toLowerCase() === 'chat'
    || Boolean(chatux.return_path || chatux.returnPath);
  if (!preparedInChat || !chatSource) return null;
  const selectedWorker = broker.selectedWorker && typeof broker.selectedWorker === 'object' && !Array.isArray(broker.selectedWorker)
    ? broker.selectedWorker
    : {};
  const agentId = normalizeString(
    body.agent_id
    || body.agentId
    || body.selected_agent_id
    || body.selectedAgentId
    || selectedWorker.agentId
    || selectedWorker.agent_id
  );
  return {
    accepted: true,
    source: 'chat_send_order',
    accepted_at: normalizeString(intake.checked_at || intake.checkedAt, nowIso()),
    ...(agentId ? { agent_id: agentId } : {})
  };
}

export function orderBodyWithCommonQualityRules(body = {}) {
  const base = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const existingConfirmation = base.confirmation && typeof base.confirmation === 'object' && !Array.isArray(base.confirmation)
    ? base.confirmation
    : null;
  const chatConfirmation = existingConfirmation ? null : chatPreparedOrderConfirmation(base);
  return {
    ...base,
    ...(chatConfirmation ? { confirmation: chatConfirmation } : {}),
    input: inputWithCommonOrderQualityRules(base.input)
  };
}
