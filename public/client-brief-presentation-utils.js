import { compactClientText as compactChatText } from './client-text-utils.js?v=20260521a';

function defaultLooksJapanese(value = '') {
  return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(String(value || ''));
}

export function stripInternalBriefFromChatBody(body = '', brief = '', replacement = '') {
  let text = String(body || '');
  const internalBrief = String(brief || '').trim();
  if (!text || !internalBrief || !replacement) return text;
  if (text.includes(internalBrief)) {
    text = text.split(internalBrief).join(replacement);
  } else if (/\nTask:\s*/.test(text)) {
    text = text.replace(/\nTask:\s*[\s\S]*?(?=\n(?:発注前|確認|不足|Useful|Clarifying|Missing|Next:|次の動き|$))/i, () => `\n${replacement}\n`);
  }
  return text
    .replace(/^\s*(発注ブリーフ|発注文|整理後の発注文|更新後の発注文|回答統合後の発注文|リサーチ用発注文|正式オーダーに渡す発注ブリーフ|Work order(?: brief)?|Refined work order|Updated work order|Work order with answers|Research work order|Current draft)\s*[:：]\s*$/gmi, '')
    .replace(/入力欄に(?:この|整理後の|更新後の)?発注(?:ブリーフ|文)を入れました。?/g, 'オーダー内容は裏側に保存しました。')
    .replace(/I put (?:this|the|the updated|the refined|the structured)?\s*(?:brief|work order|draft order)? back into the input box\.?/gi, 'I saved the order draft behind the chat.')
    .replace(/The runnable brief is back in the input box\./gi, 'The runnable draft is saved behind the chat.')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function stripStandaloneInternalBriefsFromChatBody(body = '', options = {}) {
  let text = String(body || '');
  if (!text || !/(^|\n)\s*Task:\s*|発注(?:ブリーフ|文)|Work order/i.test(text)) return text;
  const looksJapanese = typeof options.looksJapanese === 'function' ? options.looksJapanese : defaultLooksJapanese;
  const ja = looksJapanese(text);
  const replacement = ja
    ? 'オーダー内容は裏側に保存しています。内容が合っていれば SEND ORDER、直す場合は追加条件をそのまま書いてください。'
    : 'The order draft is saved behind the chat. If it looks right, press SEND ORDER; otherwise write the correction here.';
  text = text.replace(/\n?Task:\s*[\s\S]*?(?:\nAcceptance:[^\n]*)/gi, () => `\n${replacement}`);
  text = text.replace(/^\s*(発注ブリーフ|発注文|整理後の発注文|更新後の発注文|回答統合後の発注文|リサーチ用発注文|正式オーダーに渡す発注ブリーフ|Work order(?: brief)?|Refined work order|Updated work order|Work order with answers|Research work order|Current draft)\s*[:：]\s*$/gmi, '');
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

export function openChatStatusDisplayText(status = '') {
  return String(status || '')
    .replace(/The (?:refined|updated|structured|prepared)?\s*brief is now in the input box\.?/gi, 'The order draft is saved behind the chat.')
    .replace(/The updated brief is now in the input box\.?/gi, 'The order draft is saved behind the chat.')
    .replace(/入力欄に(?:この|整理後の|更新後の)?発注(?:ブリーフ|文)を入れました。?/g, 'オーダー内容は裏側に保存しました。')
    .replace(/Review the structured brief/gi, 'Review the order summary')
    .replace(/structured brief/gi, 'order draft');
}

export function openChatReadiness(taskType = 'research', prompt = '', inputCounts = {}) {
  const task = String(taskType || 'research').toLowerCase();
  const text = String(prompt || '').trim();
  const lower = text.toLowerCase();
  const gaps = [];
  const strengths = [];
  let score = text ? 35 : 0;
  const addStrength = (points, label) => {
    score += points;
    strengths.push(label);
  };
  const addGap = (label) => {
    if (label && !gaps.includes(label)) gaps.push(label);
  };
  if (text.length >= 40) addStrength(12, 'clear goal');
  else addGap('goal is still short');
  if (text.length >= 120) addStrength(8, 'enough context');
  const hasSource = Number(inputCounts.urlCount || 0) > 0 || Number(inputCounts.fileCount || 0) > 0 || /https?:\/\//i.test(text);
  if (hasSource) addStrength(14, 'source material present');
  const hasScope = /(対象|範囲|地域|国|期間|期限|顧客|読者|市場|keyword|キーワード|region|country|audience|market|scope|deadline)/i.test(text);
  if (hasScope) addStrength(12, 'scope or audience present');
  else addGap('scope, audience, region, or time range');
  const hasFormat = /(納品|形式|フォーマット|markdown|マークダウン|表|チェックリスト|箇条書き|deliver|format|table|checklist|bullets)/i.test(text);
  if (hasFormat) addStrength(12, 'delivery format specified');
  else addGap('delivery format');
  const hasConstraints = /(除外|含め|条件|前提|トーン|文体|文字数|constraint|assumption|exclude|include|tone|length)/i.test(text);
  if (hasConstraints) addStrength(8, 'constraints present');
  if (task === 'seo') {
    if (/(url|https?:\/\/|キーワード|keyword)/i.test(text)) addStrength(12, 'SEO target present');
    else addGap('SEO target URL or keyword');
  } else if (task === 'code' || task === 'debug') {
    if (/(repo|repository|file|ファイル|error|エラー|期待動作|test|テスト)/i.test(text)) addStrength(12, 'technical context present');
    else addGap('repo/file/error/expected behavior');
  } else if (task === 'research' || task === 'pricing') {
    if (hasSource || /(競合|比較|市場|相場|competitor|compare|market|source)/i.test(lower)) addStrength(10, 'comparison context present');
    else addGap('sources, competitors, or comparison target');
  } else if (task === 'writing') {
    if (/(誰向け|読者|persona|audience|tone|トーン|文字数|length)/i.test(text)) addStrength(10, 'reader or tone present');
    else addGap('reader, tone, or length');
  }
  score = Math.max(0, Math.min(100, score));
  const label = score >= 80 ? 'ready' : (score >= 60 ? 'draft-ready' : 'needs details');
  return {
    score,
    label,
    gaps: gaps.slice(0, 4),
    strengths: strengths.slice(0, 4)
  };
}

export function openChatReadinessBlock(taskType = 'research', prompt = '', inputCounts = {}, options = {}) {
  const looksJapanese = typeof options.looksJapanese === 'function' ? options.looksJapanese : defaultLooksJapanese;
  const ja = options.ja ?? looksJapanese(prompt);
  const readiness = openChatReadiness(taskType, prompt, inputCounts);
  if (ja) {
    return [
      `Readiness: ${readiness.label} (${readiness.score}/100)`,
      `強い点: ${readiness.strengths.length ? readiness.strengths.join(' / ') : 'まだ少ないです'}`,
      `不足: ${readiness.gaps.length ? readiness.gaps.join(' / ') : '追加必須の不足は見当たりません'}`
    ].join('\n');
  }
  return [
    `Readiness: ${readiness.label} (${readiness.score}/100)`,
    `Strengths: ${readiness.strengths.length ? readiness.strengths.join(' / ') : 'limited so far'}`,
    `Gaps: ${readiness.gaps.length ? readiness.gaps.join(' / ') : 'no required gap detected'}`
  ].join('\n');
}

export function reviseStructuredBriefWithInstruction(brief = '', instruction = '') {
  const original = String(brief || '').trim();
  const addition = compactChatText(String(instruction || '').replace(/\s+/g, ' '), 220);
  if (!original || !addition) return original;
  const lines = original.split('\n');
  const constraintIndex = lines.findIndex((line) => /^Constraints:\s*/i.test(line));
  if (constraintIndex >= 0) {
    const current = lines[constraintIndex].replace(/^Constraints:\s*/i, '').trim();
    lines[constraintIndex] = `Constraints: ${current ? `${current}; ${addition}` : addition}`;
  } else {
    const inputsIndex = lines.findIndex((line) => /^Inputs:\s*/i.test(line));
    const insertAt = inputsIndex >= 0 ? inputsIndex + 1 : Math.min(lines.length, 4);
    lines.splice(insertAt, 0, `Constraints: ${addition}`);
  }
  if (/(英語|english)/i.test(addition)) {
    const languageIndex = lines.findIndex((line) => /^Output language:\s*/i.test(line));
    if (languageIndex >= 0) lines[languageIndex] = 'Output language: English';
  } else if (/(日本語|japanese)/i.test(addition)) {
    const languageIndex = lines.findIndex((line) => /^Output language:\s*/i.test(line));
    if (languageIndex >= 0) lines[languageIndex] = 'Output language: Japanese';
  }
  return lines.join('\n');
}

export function createBriefPresentationUtils(options = {}) {
  const structuredOrderBriefParts = typeof options.structuredOrderBriefParts === 'function'
    ? options.structuredOrderBriefParts
    : () => ({});
  const canonicalOrderTaskType = typeof options.canonicalOrderTaskType === 'function'
    ? options.canonicalOrderTaskType
    : (taskType = '') => String(taskType || '').trim().toLowerCase();
  const deliverableForTask = typeof options.deliverableForTask === 'function'
    ? options.deliverableForTask
    : () => 'clear reusable delivery';
  const looksJapanese = typeof options.looksJapanese === 'function'
    ? options.looksJapanese
    : defaultLooksJapanese;

  function openChatHumanDispatchPreview(brief = '', taskType = 'research', prompt = '', inputCounts = {}) {
    void inputCounts;
    const parts = structuredOrderBriefParts(brief);
    const ja = looksJapanese(prompt) || looksJapanese(brief);
    const task = canonicalOrderTaskType(parts.taskType || taskType, brief) || String(parts.taskType || taskType || '').toLowerCase();
    const route = task || 'matching agent';
    const goal = parts.goal || compactChatText(brief.replace(/\s+/g, ' '), 220);
    const delivery = parts.deliver || deliverableForTask(task);
    const assumptions = ja ? '不足条件は仮定として明記します。' : 'Missing details will be stated as assumptions.';
    return ja
      ? [
        '対応するオーダーに繋げます。まだ実行も課金もしていません。',
        '',
        `接続先: ${route}`,
        `やること: ${goal}`,
        `受け取れるもの: ${delivery}`,
        `補足: ${assumptions}`,
        '',
        'この内容でAgentに繋ぎます。修正があればそのまま書いてください。問題なければ SEND ORDER してください。'
      ].join('\n')
      : [
        'I will connect this to the matching order. Nothing has run or been billed yet.',
        '',
        `Route: ${route}`,
        `Work: ${goal}`,
        `Delivery: ${delivery}`,
        `Note: ${assumptions}`,
        '',
        'I will hand this to the agent. If anything should change, write the correction here. If it is right, press SEND ORDER.'
      ].join('\n');
  }

  return {
    openChatHumanDispatchPreview
  };
}
