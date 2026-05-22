import {
  WORK_ACTION_IDS,
  matchSlashWorkAction
} from './work-action-registry.js?v=20260430b';
import {
  normalizeOpenChatIntentText,
  openChatIntentMatchText
} from './client-intent-routing-utils.js?v=20260522a';

function looksJapaneseText(value = '') {
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(String(value || ''));
}

export function openChatIntentCatalog() {
  return [
    {
      command: 'open_order_settings',
      labelJa: 'URL/ファイル/ソースを追加する',
      labelEn: 'Add URLs, files, or sources',
      terms: ['url', 'urls', 'file', 'files', 'ファイル', 'ふぁいる', 'ソース', 'source', 'sources', '添付', 'てんぷ', 'アップロード', 'upload', '資料', 'しりょう', '追加']
    },
    {
      command: 'open_delivery_history',
      labelJa: '注文履歴/納品を見る',
      labelEn: 'Open order history or delivery',
      terms: ['納品', 'のうひん', 'delivery', 'deliveries', '注文履歴', '履歴', 'りれき', 'history', '結果', 'けっか', 'order history', '完了', 'かんりょう']
    },
    {
      command: 'open_google_login',
      labelJa: 'Googleでログインする',
      labelEn: 'Sign in with Google',
      terms: ['google', 'ぐーぐる', 'ログイン', 'ろぐいん', 'sign in', 'signin', 'login', 'サインイン', '続ける']
    },
    {
      command: 'open_github_login',
      labelJa: 'GitHubでログイン/連携する',
      labelEn: 'Sign in or link GitHub',
      terms: ['github', 'git hub', 'ぎっとはぶ', 'ギットハブ', 'ログイン', 'ろぐいん', 'sign in', 'signin', 'login', 'connect', '連携', 'れんけい', '認証']
    },
    {
      command: 'open_parallel_tools',
      labelJa: '複数/並列ワークを設定する',
      labelEn: 'Set up parallel work',
      terms: ['並列', 'へいれつ', '複数', 'ふくすう', 'parallel', 'multi', 'まとめて', '一括', 'batch', '同時']
    }
  ];
}

export function openChatIntentScore(text = '', item = {}) {
  const normalized = openChatIntentMatchText(text);
  if (!normalized) return 0;
  return (item.terms || []).reduce((score, term) => {
    const t = openChatIntentMatchText(term);
    if (!t) return score;
    if (normalized === t) return score + 4;
    if (normalized.includes(t)) return score + Math.min(3, Math.max(1, t.length / 4));
    return score;
  }, 0);
}

export function openChatFuzzyIntent(prompt = '') {
  const normalized = normalizeOpenChatIntentText(prompt);
  if (normalized.length < 3) return null;
  const candidates = openChatIntentCatalog()
    .map((item) => ({ ...item, score: openChatIntentScore(normalized, item) }))
    .filter((item) => item.score >= 2)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);
  if (!candidates.length) return null;
  const [first, second] = candidates;
  if (!second || first.score >= second.score + 1.4 || first.score >= 5) {
    return { command: first.command, candidates };
  }
  return { clarify: true, candidates };
}

export function buildOpenChatIntentClarification(prompt = '', candidates = [], options = {}) {
  const ja = options.ja ?? looksJapaneseText(prompt);
  const top = candidates.slice(0, 3);
  if (!top.length) return null;
  return {
    kind: 'clarify',
    tone: 'warn',
    options: top.map((item) => ({
      command: item.command,
      labelJa: item.labelJa,
      labelEn: item.labelEn,
      terms: item.terms
    })),
    body: ja
      ? [
        '意図が少し曖昧です。近い候補を出しました。どれを進めますか？',
        '',
        ...top.map((item, index) => `${index + 1}. ${item.labelJa}`),
        '',
        '番号、または「支払い」「エージェント登録」「APIキー」のように短く返してください。まだ注文も課金も発生しません。'
      ].join('\n')
      : [
        'I am not fully sure what you want to do. Which path should I open?',
        '',
        ...top.map((item, index) => `${index + 1}. ${item.labelEn}`),
        '',
        'Reply with the number, or a short phrase like “payments”, “list my agent”, or “API keys”. No order or billing happens yet.'
      ].join('\n'),
    status: 'Clarification needed.\n\nNo order was created and no billing occurred.'
  };
}

export function slashCommandMode(prompt = '') {
  return matchSlashWorkAction(prompt);
}

export function openChatCommandHelpText(ja = false) {
  const lines = ja
    ? [
      '使える / コマンド:',
      '',
      '/help - コマンド一覧',
      '/plan - PLAN mode。質問と整理だけ。注文しない',
      '/order - ORDER mode。準備済みブリーフを実行確認できる',
      '/route auto - CAItが通常/リーダーを自動判定',
      '/route specialist - 通常エージェント優先',
      '/route leader - リーダーエージェント優先',
      '/sources - URL/ファイル/詳細設定',
      '/parallel - 並列ワーク設定',
      '/queue-parallel - 準備済みブリーフを並列キューへ',
      '/restore - 保存済みブリーフを入力欄へ戻す',
      '/history - 注文履歴/納品',
      '/github - GitHub連携',
      '/login - Googleログイン',
      '/reset - チャットと下書きをリセット'
    ]
    : [
      'Available / commands:',
      '',
      '/help - command list',
      '/plan - PLAN mode: ask and refine without ordering',
      '/order - ORDER mode: confirm and dispatch prepared work',
      '/route auto - let CAIt choose Specialist vs Leader',
      '/route specialist - prefer a Specialist Agent',
      '/route leader - prefer a Leader Agent',
      '/sources - open URL/file/order settings',
      '/parallel - open parallel work tools',
      '/queue-parallel - queue prepared brief as parallel drafts',
      '/restore - restore the saved work brief',
      '/history - order history and delivery',
      '/github - connect GitHub',
      '/login - Google sign-in',
      '/reset - reset chat and draft'
    ];
  return lines.join('\n');
}

export function isOpenChatEscapeCommand(command = '') {
  return [
    WORK_ACTION_IDS.RESET_CHAT,
    WORK_ACTION_IDS.OPEN_GOOGLE_LOGIN,
    WORK_ACTION_IDS.OPEN_GITHUB_LOGIN,
    WORK_ACTION_IDS.OPEN_DELIVERY_HISTORY,
    'cancel_preorder_order'
  ].includes(String(command || '').trim());
}

export function openChatMixedCommandNote(prompt = '', command = '', ja = false) {
  const text = String(prompt || '').replace(/\s+/g, ' ').trim();
  if (!text || !command || text.length < 28) return '';
  const hasConnector = /(?:、|,|，|そして|それから|そのまま|ついで|あと|さらに|でも|\band\b|\bthen\b|\balso\b|\bafter that\b)/i.test(text);
  if (!hasConnector) return '';
  const nonNavigationAction = /(調査|比較|分析|要約|レビュー|改善|作って|書いて|見て|発注|注文|実行|市場|売れる|稼げる|research|compare|analy[sz]e|summari[sz]e|review|improve|build|write|order|dispatch|execute|market|sell|revenue)/i.test(text);
  const secondCommandAction = /(支払い|デポジット|残高|出金|受け取り|api key|apiキー|github|google|ログイン|agent|エージェント|settings|設定|payment|deposit|balance|payout|provider|login|api keys?)/i.test(text);
  if (!nonNavigationAction && !secondCommandAction) return '';
  return ja
    ? '入力に別の依頼や操作も混ざっているようです。今回は最初に検出した画面操作/モード変更だけ実行します。画面が開いた後、残りの依頼をもう一度送ると、発注ブリーフまたは次の操作として整理します。'
    : 'This message appears to mix a command with another request. I will only run the first navigation/mode command here. After the screen opens, send the remaining request again and I will turn it into a work brief or the next action.';
}
