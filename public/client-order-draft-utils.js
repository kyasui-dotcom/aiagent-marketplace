import { compactClientText as compactChatText } from './client-text-utils.js?v=20260521a';

export function createOrderDraftUtils(options = {}) {
  const canonicalOrderTaskType = typeof options.canonicalOrderTaskType === 'function'
    ? options.canonicalOrderTaskType
    : (taskType = '') => String(taskType || '').trim().toLowerCase();
  const listCreatorEstimateForDraft = typeof options.listCreatorEstimateForDraft === 'function'
    ? options.listCreatorEstimateForDraft
    : () => null;
  const getCurrentOpenChatSessionId = typeof options.getCurrentOpenChatSessionId === 'function'
    ? options.getCurrentOpenChatSessionId
    : () => '';

  function isStructuredOrderBrief(value = '') {
    const text = String(value || '').trim();
    if (!text) return false;
    if (/^Task:\s+/im.test(text) && /(?:^|\n)\s*Goal:\s+/im.test(text) && /(?:^|\n)\s*Deliver:\s+/im.test(text)) {
      return true;
    }
    const compact = text.replace(/\s+/g, ' ').trim();
    return Boolean(/^Task:\s+/i.test(compact) && /(?:^|\s)Goal:\s+/i.test(compact) && /(?:^|\s)Deliver:\s+/i.test(compact));
  }

  function structuredOrderBriefParts(value = '') {
    const text = String(value || '').trim();
    const readLine = (name) => {
      const match = text.match(new RegExp(`^${name}:\\s*([^\\n]+)`, 'im'));
      return match ? match[1].trim() : '';
    };
    return {
      raw: text,
      taskType: readLine('Task') || 'research',
      goal: readLine('Goal'),
      split: readLine('Work split'),
      inputs: readLine('Inputs'),
      requirements: readLine('Requirements'),
      constraints: readLine('Constraints'),
      clarifications: readLine('Clarifications'),
      deliver: readLine('Deliver'),
      outputLanguage: readLine('Output language')
    };
  }

  function extractPreparedBriefFromChatText(value = '') {
    const text = String(value || '');
    if (isStructuredOrderBrief(text)) return text.trim();
    const markers = [
      '整理後の発注文:',
      '更新後の発注文:',
      '回答統合後の発注文:',
      'リサーチ用発注文:',
      'Refined work order:',
      'Updated work order:',
      'Work order with answers:',
      'Research work order:'
    ];
    const marker = markers.find((item) => text.includes(item)) || '';
    if (!marker) return '';
    const after = text.slice(text.indexOf(marker) + marker.length).trim();
    const stop = after.search(/\n(?:不足しがちな確認:|Missing inputs to confirm:|次の動き:|Next:|統合した回答:|Merged answers:)/);
    const brief = (stop >= 0 ? after.slice(0, stop) : after).trim();
    return isStructuredOrderBrief(brief) ? brief : '';
  }

  function rewriteStructuredBriefTaskType(brief = '', taskType = '') {
    const text = String(brief || '').trim();
    const task = canonicalOrderTaskType(taskType, text) || canonicalOrderTaskType(structuredOrderBriefParts(text).taskType, text);
    if (!text || !task) return text;
    if (/^Task:\s*[^\n]+/im.test(text)) return text.replace(/^Task:\s*[^\n]+/im, `Task: ${task}`);
    return `Task: ${task}\n${text}`;
  }

  function apiPayloadFromOrderDraft(draft = {}) {
    const { resolved_order_strategy, route_plan, ...payload } = draft;
    const listCreatorEstimate = listCreatorEstimateForDraft(payload);
    if (listCreatorEstimate && !(Number(payload.estimated_total_cost_basis || 0) > 0 || payload.estimated_cost_basis)) {
      const input = payload.input && typeof payload.input === 'object' && !Array.isArray(payload.input)
        ? payload.input
        : {};
      const broker = input._broker && typeof input._broker === 'object' && !Array.isArray(input._broker)
        ? input._broker
        : {};
      return {
        ...payload,
        estimated_total_cost_basis: listCreatorEstimate.usage.total_cost_basis,
        estimated_cost_basis: {
          compute: listCreatorEstimate.usage.compute_cost,
          tool: listCreatorEstimate.usage.tool_cost,
          labor: listCreatorEstimate.usage.labor_cost,
          api: listCreatorEstimate.usage.api_cost,
          total: listCreatorEstimate.usage.total_cost_basis
        },
        input: {
          ...input,
          _broker: {
            ...broker,
            listCreatorEstimate: {
              requestedCount: listCreatorEstimate.requestedCount,
              batchSize: listCreatorEstimate.batchSize,
              batchCount: listCreatorEstimate.batchCount,
              contactCaptureMode: listCreatorEstimate.contactCaptureMode
            }
          }
        }
      };
    }
    return payload;
  }

  function apiPayloadFromOrderDraftWithChatSession(draft = {}, sessionId = '') {
    const payload = apiPayloadFromOrderDraft(draft);
    const safeSessionId = compactChatText(sessionId || getCurrentOpenChatSessionId() || '', 120);
    if (!safeSessionId) return payload;
    const input = payload.input && typeof payload.input === 'object' && !Array.isArray(payload.input)
      ? payload.input
      : {};
    const broker = input._broker && typeof input._broker === 'object' && !Array.isArray(input._broker)
      ? input._broker
      : {};
    return {
      ...payload,
      session_id: payload.session_id || payload.sessionId || safeSessionId,
      input: {
        ...input,
        ...(input.session_id || input.sessionId ? {} : { session_id: safeSessionId }),
        _broker: {
          ...broker,
          chatSessionId: broker.chatSessionId || safeSessionId
        }
      }
    };
  }

  return {
    isStructuredOrderBrief,
    structuredOrderBriefParts,
    extractPreparedBriefFromChatText,
    rewriteStructuredBriefTaskType,
    apiPayloadFromOrderDraft,
    apiPayloadFromOrderDraftWithChatSession
  };
}
