function normalizeWorkIntentText(prompt = '') {
  return String(prompt || '').trim().toLowerCase();
}

function hasAnyPattern(text = '', patterns = []) {
  return patterns.some((pattern) => pattern.test(text));
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
  return hasAnyPattern(text, [
    /\b(?:github|git hub|repo|repository|pull request|pr|branch|commit|diff|issue|bug|debug|fix)\b/i,
    /(修正|直して|デバッグ|リポジトリ|プルリク|ブランチ|コミット|差分)/i
  ]);
}

function isExplicitCmoLeaderIntentText(prompt = '') {
  const text = normalizeWorkIntentText(prompt);
  if (!text) return false;
  return hasAnyPattern(text, [
    /(?:\bcmo\b|chief marketing officer|chief marketing|marketing leader|マーケ責任者|マーケティング責任者|cmoリーダー|cmoとして)/i
  ]);
}

function explicitLeaderTaskTypeFromText(prompt = '') {
  const text = normalizeWorkIntentText(prompt);
  if (!text) return '';
  if (isExplicitCmoLeaderIntentText(text)) return 'cmo_leader';
  if (hasAnyPattern(text, [/(research team|analysis team|decision team|research leader|調査チーム|分析チーム|調査リーダー|リサーチリーダー)/i])) return 'research_team_leader';
  if (hasAnyPattern(text, [/(build team|coding team|implementation team|engineering team|build leader|開発チーム|実装チーム|ビルドリーダー)/i])) return 'build_team_leader';
  if (hasAnyPattern(text, [/(?:\bcto\b|chief technology|technical leader|ctoリーダー|技術責任者|開発責任者)/i])) return 'cto_leader';
  if (hasAnyPattern(text, [/(?:\bcpo\b|chief product|product leader|cpoリーダー|プロダクト責任者)/i])) return 'cpo_leader';
  if (hasAnyPattern(text, [/(?:\bcfo\b|chief financial|finance leader|cfoリーダー|財務責任者)/i])) return 'cfo_leader';
  if (hasAnyPattern(text, [/(legal leader|legal counsel|compliance leader|法務リーダー|legalリーダー|法務責任者)/i])) return 'legal_leader';
  if (hasAnyPattern(text, [/(secretary leader|executive secretary|executive assistant|assistant ops|秘書リーダー|秘書チーム)/i])) return 'secretary_leader';
  return '';
}

const LEADER_TASK_TYPES = new Set([
  'research_team_leader',
  'build_team_leader',
  'cmo_leader',
  'secretary_leader',
  'cto_leader',
  'cpo_leader',
  'cfo_leader',
  'legal_leader'
]);

const LEADER_TASK_LABELS = {
  research_team_leader: 'Research Team Leader',
  build_team_leader: 'Build Team Leader',
  cmo_leader: 'CMO Leader',
  secretary_leader: 'Secretary Leader',
  cto_leader: 'CTO Leader',
  cpo_leader: 'CPO Leader',
  cfo_leader: 'CFO Leader',
  legal_leader: 'Legal Leader'
};

function routeOwnerForLeader(taskType = '', reason = '') {
  const task = normalizeWorkIntentText(taskType);
  if (!LEADER_TASK_TYPES.has(task)) return null;
  return {
    taskType: task,
    strategyHint: 'multi',
    routeHint: 'leader_handoff',
    ownerType: 'leader',
    activeLeaderTaskType: task,
    activeLeaderName: LEADER_TASK_LABELS[task] || task,
    conversationOwner: {
      type: 'leader',
      taskType: task,
      label: LEADER_TASK_LABELS[task] || task,
      reason: reason || 'CAIt selected a leader because this request needs cross-agent intake, research, planning, approval, or execution coordination.'
    },
    reason: reason || 'CAIt selected a leader because this request needs cross-agent intake, research, planning, approval, or execution coordination.'
  };
}

function routeOwnerForCait(taskType = '', reason = '') {
  const task = normalizeWorkIntentText(taskType) || 'research';
  return {
    taskType: task,
    strategyHint: 'single',
    routeHint: 'cait_specialist_router',
    ownerType: 'cait',
    activeLeaderTaskType: '',
    activeLeaderName: '',
    conversationOwner: {
      type: 'cait',
      label: 'CAIt',
      reason: reason || 'CAIt will choose the best specialist agent because this does not require a leader-led workflow yet.'
    },
    reason: reason || 'CAIt will choose the best specialist agent because this does not require a leader-led workflow yet.'
  };
}

const AGENT_TASK_LABELS = {
  research: 'Research Agent',
  writer: 'Writer Agent',
  writing: 'Writer Agent',
  code: 'Code Agent',
  pricing: 'Pricing Agent',
  teardown: 'Teardown Agent',
  landing: 'Landing Page Critique Agent',
  validation: 'Validation Agent',
  growth: 'Growth Operator Agent',
  media_planner: 'Media Planner Agent',
  list_creator: 'List Creator Agent',
  citation_ops: 'Citation Ops Agent',
  data_analysis: 'Data Analysis Agent',
  seo_specialist: 'SEO Specialist Agent',
  x_post: 'X Ops Connector Agent',
  email_ops: 'Email Ops Agent',
  reddit: 'Reddit Agent',
  indie_hackers: 'Indie Hackers Agent'
};

function routeOwnerForAgent(taskType = '', reason = '') {
  const task = normalizeWorkIntentText(taskType) || 'research';
  if (LEADER_TASK_TYPES.has(task)) return routeOwnerForLeader(task, reason);
  const label = AGENT_TASK_LABELS[task] || task.split(/[_\s-]+/).filter(Boolean).map((part) => (
    part.length <= 3 ? part.toUpperCase() : `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`
  )).join(' ') || 'Agent';
  return {
    taskType: task,
    strategyHint: 'single',
    routeHint: 'agent_chat',
    ownerType: 'agent',
    activeLeaderTaskType: '',
    activeLeaderName: '',
    activeOwnerType: 'agent',
    activeOwnerTaskType: task,
    activeOwnerName: label,
    activeOwnerLocked: true,
    conversationOwner: {
      type: 'agent',
      taskType: task,
      label,
      reason: reason || 'CAIt handed this chat to the matching agent so the user can continue intake, drafting, and revisions with that agent.'
    },
    reason: reason || 'CAIt handed this chat to the matching agent so the user can continue intake, drafting, and revisions with that agent.'
  };
}

export function leaderTaskTypeForInitialWork(taskType = '', prompt = '') {
  const task = normalizeWorkIntentText(taskType);
  const text = normalizeWorkIntentText(prompt);
  if (LEADER_TASK_TYPES.has(task)) return task;
  return explicitLeaderTaskTypeFromText(`${task}\n${text}`);
}

export function inferWorkIntentTaskType(prompt = '') {
  const text = normalizeWorkIntentText(prompt);
  if (!text) return 'research';
  if (isRepoBackedCodeIntentText(prompt, 'code')) return 'code';
  const explicitLeader = explicitLeaderTaskTypeFromText(prompt);
  if (explicitLeader) return explicitLeader;
  if (hasAnyPattern(text, [/(x\.com|\bx post\b|\bx thread\b|twitter|tweet|tweets|ツイート|x投稿|ポスト|スレッド)/i])) return 'x_post';
  if (hasAnyPattern(text, [/(gmail|email|mail|メール|送信メール|営業メール)/i])) return 'email_ops';
  if (hasAnyPattern(text, [/(search console|サーチコンソール|gsc)/i]) && hasAnyPattern(text, [/(seo|query|queries|landing page|landing pages|landing intent|search intent|keyword|keywords|検索意図|キーワード|流入|対応付け|マップ)/i])) {
    return 'seo_specialist';
  }
  if (hasAnyPattern(text, [/(data analysis|analytics|metrics|kpi|dashboard|cohort|funnel analysis|ga4|gsc|search console|データ分析|アクセス解析|指標|計測|ファネル)/i])) return 'data_analysis';
  if (hasAnyPattern(text, [/(landing page|lp copy|hero copy|sales page|ランディングページ|LP|ファーストビュー)/i])) return 'landing';
  if (hasAnyPattern(text, [/(seo|keyword|search intent|content gap|meta|description|title|検索流入|検索意図|キーワード|コンテンツギャップ)/i])) return 'seo_specialist';
  if (hasAnyPattern(text, [/(write|writing|draft|copy|article|blog post|newsletter|rewrite|caption|文章|記事|ブログ|投稿文|コピー|下書き|書いて|リライト)/i])) return 'writing';
  if (hasAnyPattern(text, [/(pricing|price model|unit economics|ltv|cac|margin|financial model|価格|値付け|料金|財務|収支|粗利|利益)/i])) return 'pricing';
  if (hasAnyPattern(text, [/(validate|validation|idea validation|user interview|mvp|仮説検証|アイデア検証|需要検証|ユーザー調査)/i])) return 'validation';
  if (hasAnyPattern(text, [/(summari[sz]e|summary|要約|まとめ)/i])) return 'summary';
  if (hasAnyPattern(text, [/(growth|go[-\s]?to[-\s]?market|gtm|acquisition|aquisition|aquitisition|aquire|activation|retention|signup|signups|more users|new customers?|get customers?|grow customers?|more sales|increase sales|increase revenue|increase purchases?|outreach|community|product hunt|marketing|sales|revenue|集客|登録数|会員登録|ユーザー獲得|顧客獲得|問い合わせ.*増|購入.*増|マーケ|営業|グロース)/i])) return 'growth';
  if (hasAnyPattern(text, [/(fix|bug|debug|実装|修正|直し|直して|コード|バグ|不具合|\bapi\b|server|worker|deploy|billing|\bui\b)/i])) return 'code';
  if (hasAnyPattern(text, [/(research|compare|analysis|investigate|市場|比較|調査|戦略)/i])) return 'research';
  return 'research';
}

export function inferWorkIntentRoute(prompt = '') {
  const inferredTaskType = inferWorkIntentTaskType(prompt);
  const leaderTaskType = leaderTaskTypeForInitialWork(inferredTaskType, prompt);
  if (leaderTaskType) {
    return routeOwnerForLeader(
      leaderTaskType,
      'CAIt handed this chat to the matching leader because the intent is broad enough to need intake, research, planning, approval, and specialist/app orchestration.'
    );
  }
  return routeOwnerForAgent(
    inferredTaskType,
    'CAIt handed this chat to the matching agent so the user can continue intake, drafting, and revisions with that agent.'
  );
}

export function prepareWorkOrderSeed(prompt = '', requestedStrategy = 'auto', options = {}) {
  const explicitTaskType = normalizeWorkIntentText(options.taskType || options.task_type || options.selectedTaskType || '');
  const selectedAgentId = normalizeWorkIntentText(options.selectedAgentId || options.selected_agent_id || '');
  const selectedWorker = Boolean(selectedAgentId && explicitTaskType);
  const selectedWorkerIsLeader = selectedWorker && LEADER_TASK_TYPES.has(explicitTaskType);
  const route = explicitTaskType
    ? (selectedWorker && !selectedWorkerIsLeader
        ? {
            ...routeOwnerForAgent(explicitTaskType, `Selected worker ${selectedAgentId} for task ${explicitTaskType}; preserving that agent route for intake and dispatch.`),
            routeHint: 'selected_worker'
          }
        : (leaderTaskTypeForInitialWork(explicitTaskType, prompt)
            ? {
                ...routeOwnerForLeader(
                  leaderTaskTypeForInitialWork(explicitTaskType, prompt),
                  selectedWorker
                    ? `Selected leader ${selectedAgentId} for task ${explicitTaskType}; handing the chat to that leader for intake and dispatch.`
                    : `Selected task ${explicitTaskType}; CAIt is handing the chat to the matching leader.`
                ),
                routeHint: selectedWorker ? 'selected_leader' : 'leader_handoff'
              }
            : routeOwnerForAgent(explicitTaskType, `Selected task ${explicitTaskType}; CAIt handed this chat to the matching agent.`)))
    : inferWorkIntentRoute(prompt);
  const requested = ['single', 'multi'].includes(String(requestedStrategy || '').trim().toLowerCase())
    ? String(requestedStrategy || '').trim().toLowerCase()
    : 'auto';
  let resolvedOrderStrategy = route.strategyHint || 'single';
  if (requested === 'multi') resolvedOrderStrategy = 'multi';
  if (requested === 'single' && route.ownerType !== 'leader') resolvedOrderStrategy = 'single';
  if (route.ownerType === 'leader') resolvedOrderStrategy = 'multi';
  return {
    taskType: route.taskType,
    requestedOrderStrategy: requested,
    resolvedOrderStrategy,
    routeHint: route.routeHint,
    reason: route.reason,
    ownerType: route.ownerType || 'cait',
    activeLeaderTaskType: route.activeLeaderTaskType || '',
    activeLeaderName: route.activeLeaderName || '',
    activeOwnerType: route.activeOwnerType || route.ownerType || '',
    activeOwnerTaskType: route.activeOwnerTaskType || (route.ownerType === 'leader' ? route.activeLeaderTaskType : ''),
    activeOwnerName: route.activeOwnerName || (route.ownerType === 'leader' ? route.activeLeaderName : ''),
    activeOwnerLocked: route.ownerType === 'agent' || route.ownerType === 'leader',
    conversationOwner: route.conversationOwner || { type: 'cait', label: 'CAIt' }
  };
}
