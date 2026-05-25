function normalizeWorkIntentText(prompt = '') {
  return String(prompt || '').trim().toLowerCase();
}

export function isNonOrderConversationIntentText(prompt = '') {
  const text = normalizeWorkIntentText(prompt)
    .replace(/[?？!！。.,、\s]+$/g, '')
    .trim();
  if (!text) return false;
  if (isDeliveryHistoryQuestionIntentText(text)) return true;
  if (isLeaderCatalogQuestionIntentText(text)) return true;
  if (/^(pause|hold|stop|later|not now|cancel|status|help|what now|where are we|continue chatting)$/i.test(text)) return true;
  if (/^(一旦保留|いったん保留|保留|あとで|後で|また後で|ストップ|止めて|中断|キャンセル|やめる|やっぱやめる|今はやめる|状況|現状|今どこ|何待ち|ヘルプ|相談だけ)$/i.test(text)) return true;
  if (/^(pause|hold|stop|later|not now|cancel)\s*(please|pls)?$/i.test(text)) return true;
  if (/^(いや|いえ|no|nope|nah)[、。,.!\s-]*(pause|hold|stop|later|not now|cancel|保留|あとで|後で|やめる|中断)$/i.test(text)) return true;
  return false;
}

export function isDeliveryHistoryQuestionIntentText(prompt = '') {
  const raw = String(prompt || '').replace(/\s+/g, ' ').trim();
  const text = normalizeWorkIntentText(raw)
    .replace(/[?？!！。.,、\s]+$/g, '')
    .trim();
  if (!text) return false;
  if (/(納品形式|納品は|納品を(?:リスク|シナリオ|優先|検証|計画|メモ|表|一覧のどれがよい))/i.test(raw)) return false;
  const target = /(?:\b(?:orders?|order history|deliver(?:y|ies|able|ables)|results?|completed|complete|done|finished)\b|注文|注文履歴|納品|納品物|成果物|履歴|結果|完了|完了済)/i.test(text);
  const viewAction = /(?:見る|見たい|見せ|表示|出して|確認|開く|開いて|一覧|リスト|探|show|view|open|list|display|inspect|review)/i.test(raw);
  const creationAction = /(?:作って|作成|生成|改善|書いて|発注|注文して|実行|調べて|分析して|\b(?:create|build|write|draft|prepare|run|execute|research|analy[sz]e|improve)\b)/i.test(raw);
  return target && viewAction && !creationAction;
}

export function isLeaderCatalogQuestionIntentText(prompt = '') {
  const raw = String(prompt || '').replace(/\s+/g, ' ').trim();
  const text = normalizeWorkIntentText(raw)
    .replace(/[?？!！。.,、\s]+$/g, '')
    .trim();
  if (!text) return false;
  const asksCatalog = /(?:what|which|who|list|show|tell|explain|available|kind|kinds|types|どんな|どの|何|なに|誰|だれ|一覧|種類|教えて|見せて|ありますか|いる|いますか|使える|選べる)/i.test(raw);
  const leaderContext = /\b(?:leaders?|team leaders?|leader agents?|cmo|cto|cpo|cfo)\b/i.test(text)
    || /(リーダー|チームリーダー|責任者|CMO|CTO|CPO|CFO|法務|秘書|調査チーム|開発チーム)/i.test(raw);
  const executionAsk = /(作って|調べて|分析して|改善して|実装して|送信|投稿|発注|注文|実行|run|create|build|research|analy[sz]e|improve|send|post|order|dispatch)/i.test(raw);
  return asksCatalog && leaderContext && !executionAsk;
}

export function isRepoBackedCodeIntentText(prompt = '', taskType = '') {
  const text = normalizeWorkIntentText(prompt);
  const task = normalizeWorkIntentText(taskType);
  const codeLike = !task || ['code', 'debug', 'ops', 'automation', 'build_team_leader', 'cto_leader'].includes(task);
  if (!codeLike) return false;
  return [
    /\b(?:github|git hub|repo|repository|pull request|pr|branch|commit|diff|issue|bug|debug|fix)\b/i,
    /(修正|直して|デバッグ|リポジトリ|プルリク|ブランチ|コミット|差分)/i
  ].some((pattern) => pattern.test(text));
}
