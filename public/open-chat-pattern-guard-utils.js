import { compactClientText as compactChatText } from './client-text-utils.js?v=20260521a';
import {
  LONG_PROMPT_GUARD_CHARS,
  LONG_PROMPT_SOURCE_CHUNK_CHARS,
  ORDER_INPUT_MAX_FILES,
  ORDER_INPUT_MAX_FILE_CHARS,
  ORDER_INPUT_TOTAL_FILE_CHARS,
  PROMPT_LIKE_GUARD_CHARS
} from './client-order-input-utils.js?v=20260521a';

export function createOpenChatPatternGuardUtils(options = {}) {
  const getState = typeof options.getState === 'function' ? options.getState : () => ({});
  const looksJapanese = typeof options.looksJapanese === 'function' ? options.looksJapanese : () => false;
  const isStructuredOrderBrief = typeof options.isStructuredOrderBrief === 'function' ? options.isStructuredOrderBrief : () => false;
  const inferClientTaskSequence = typeof options.inferClientTaskSequence === 'function' ? options.inferClientTaskSequence : () => [];
  const currentRoutingTask = typeof options.currentRoutingTask === 'function' ? options.currentRoutingTask : () => '';
  const isGithubLinked = typeof options.isGithubLinked === 'function' ? options.isGithubLinked : () => false;
  const isGithubAuthorized = typeof options.isGithubAuthorized === 'function' ? options.isGithubAuthorized : () => false;
  const lastOpenChatPreparedBrief = typeof options.lastOpenChatPreparedBrief === 'function' ? options.lastOpenChatPreparedBrief : () => '';
  const buildOpenChatProtectedSourceBrief = typeof options.buildOpenChatProtectedSourceBrief === 'function'
    ? options.buildOpenChatProtectedSourceBrief
    : (value) => String(value || '');
  const openChatLongPromptSourceSummaryFallback = typeof options.openChatLongPromptSourceSummary === 'function'
    ? options.openChatLongPromptSourceSummary
    : null;
  const buildOpenChatRequirementHubAnswer = typeof options.buildOpenChatRequirementHubAnswer === 'function'
    ? options.buildOpenChatRequirementHubAnswer
    : () => null;

  function openChatPatternAnswer(patternId = '', kind = 'clarify', tone = 'info', ja = false, jaLines = [], enLines = [], extra = {}) {
    return {
      kind,
      tone,
      patternId,
      body: (ja ? jaLines : enLines).join('\n'),
      status: extra.status || 'Handled in chat.\n\nNo order was created and no billing occurred.',
      ...extra
    };
  }

  function openChatLooksSensitiveSecret(prompt = '') {
    const text = String(prompt || '');
    if (!text) return false;
    if (/(?:sk-(?:proj-)?[A-Za-z0-9_-]{16,}|GOCSPX-[A-Za-z0-9_-]{12,}|github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----)/.test(text)) return true;
    return /(?:api[_ -]?key|secret|client secret|password|passwd|token|bearer|秘密鍵|シークレット|パスワード|APIキー|apiキー)\s*[:=：]\s*\S{8,}/i.test(text);
  }

  function openChatLooksUnsafeRequest(prompt = '') {
    const text = String(prompt || '');
    return /(phishing|credential theft|steal (?:password|token|secret|cookie)|malware|ransomware|keylogger|botnet|ddos|doxx|bypass paywall|hack (?:an? )?(?:account|wallet|server)|exploit.+without permission|不正アクセス|フィッシング|認証情報.*盗|パスワード.*盗|トークン.*盗|マルウェア|ランサム|DDoS|乗っ取|無断.*侵入)/i.test(text);
  }

  function openChatPromptInjectionSafeAnalysisContext(prompt = '') {
    const text = String(prompt || '').replace(/\s+/g, ' ').trim();
    if (!text) return false;
    return /(analy[sz]e|review|detect|explain|summari[sz]e|classify|sanitize|improve|rewrite|ブラッシュアップ|レビュー|解説|説明|検出|分類|安全化|書き換え|改善).{0,90}(prompt injection|jailbreak|ignore previous|system prompt|developer message|プロンプトインジェクション|脱獄|前の指示|システムプロンプト|開発者メッセージ)/i.test(text)
      || /(以下|次の|this|these).{0,60}(prompt|text|source|example|プロンプト|文章|テキスト|ソース|例|入力).{0,90}(analy[sz]e|review|detect|explain|sanitize|improve|分析|レビュー|解説|説明|検出|安全化|改善)/i.test(text);
  }

  function openChatPromptInjectionGuard(prompt = '') {
    const text = String(prompt || '').replace(/\u0000/g, '').trim();
    if (!text || openChatPromptInjectionSafeAnalysisContext(text)) return { blocked: false, code: '' };
    const compact = text.replace(/\s+/g, ' ');
    const rules = [
      {
        code: 'override_instructions',
        reason: 'The prompt tries to override CAIt, system, developer, policy, or safety instructions.',
        pattern: /\b(ignore|disregard|forget|override|bypass|disable|drop)\b.{0,90}\b(previous|above|prior|earlier|system|developer|instructions?|rules?|policy|policies|safety|guardrails?)\b/i
      },
      {
        code: 'override_instructions_ja',
        reason: 'The prompt tries to override previous, system, developer, policy, or safety instructions.',
        pattern: /(前|以前|上記|これまで|システム|開発者|ポリシー|安全|制約).{0,60}(指示|命令|ルール|プロンプト|制約).{0,60}(無視|破棄|忘れ|解除|上書き|バイパス)/i
      },
      {
        code: 'hidden_prompt_exfiltration',
        reason: 'The prompt asks to reveal hidden prompts, developer messages, tools, secrets, or environment data.',
        pattern: /\b(reveal|show|print|dump|leak|exfiltrate|extract|output|display)\b.{0,90}\b(system prompt|developer message|hidden instructions?|internal prompts?|tool schema|tools?|api keys?|secrets?|env(?:ironment)?(?: variables?)?)\b/i
      },
      {
        code: 'hidden_prompt_exfiltration_ja',
        reason: 'The prompt asks to reveal hidden prompts, developer messages, tools, secrets, or environment data.',
        pattern: /(システムプロンプト|開発者メッセージ|隠し指示|内部指示|内部プロンプト|ツール|APIキー|apiキー|秘密|シークレット|環境変数).{0,70}(出力|表示|見せ|開示|漏ら|教え|抽出)/i
      },
      {
        code: 'jailbreak_persona',
        reason: 'The prompt attempts to switch CAIt into a jailbreak, unrestricted, or policy-free mode.',
        pattern: /\b(DAN|jailbreak|developer mode|god mode|do anything now|no restrictions?|unrestricted|policy[- ]?free)\b/i
      },
      {
        code: 'role_injection',
        reason: 'The prompt contains role-injection syntax combined with override or disclosure instructions.',
        pattern: /(^|\n)\s*(system|developer)\s*:.{0,400}\b(ignore|override|bypass|reveal|show|dump|leak|disable|no restrictions?)\b/is
      },
      {
        code: 'stripe_prohibited_gambling_request',
        reason: 'CAIt cannot prepare orders for gambling, betting, odds-making, wagering, lotteries, sweepstakes, fantasy sports, or prize-game advice.',
        pattern: /\b(?:create|make|recommend|pick|predict|forecast|optimi[sz]e|build|write|generate|automate|advise|tell me)\b.{0,140}\b(?:betting tips?|bets?|wagers?|staking plan|odds[-\s]?making|casino|lotter(?:y|ies)|sweepstakes|fantasy sports|prize game|bookmaker)\b|(?:馬券|競馬予想|オッズ|賭け|ギャンブル|カジノ).{0,80}(?:予想|推奨|買い目|攻略|稼|勝)/i
      },
      {
        code: 'stripe_prohibited_financial_profit_request',
        reason: 'CAIt cannot prepare orders for trading/investment/crypto profit signals, guaranteed returns, or regulated financial-service activity.',
        pattern: /\b(?:create|make|recommend|build|write|generate|automate|advise|tell me)\b.{0,140}\b(?:trading signals?|buy\/sell signals?|guaranteed returns?|crypto staking|crypto mining|ico|nft marketplace|money transmission|remittance|escrow|credit repair|debt relief|loan repayment)\b|(?:投資助言|売買シグナル|利益保証|暗号資産|仮想通貨|ステーキング|送金業|資金移動|信用修復|債務整理).{0,80}(?:作|推奨|自動化|稼|儲)/i
      },
      {
        code: 'stripe_prohibited_japan_resale_profit_request',
        reason: 'CAIt cannot prepare orders for Japan-facing resale, dropshipping, trading, investment, or crypto profit advice/tools.',
        pattern: /\b(?:create|make|recommend|build|write|generate|automate|advise|tell me)\b.{0,140}\b(?:resale profit|retail arbitrage|dropshipping profit|drop shipping profit|flipping strategy|scalping strategy)\b|(?:転売|せどり|ドロップシッピング|投資|トレード|暗号資産|仮想通貨).{0,90}(?:利益|稼|儲|攻略|推奨|自動化|シグナル|助言)/i
      },
      {
        code: 'stripe_prohibited_adult_or_illegal_business_request',
        reason: 'CAIt cannot prepare orders for adult sexual services/content, illegal drugs, weapons, counterfeit goods, fake engagement, fake IDs, or other payment-provider prohibited businesses.',
        pattern: /\b(?:create|make|sell|source|ship|distribute|market|build|generate|automate)\b.{0,140}\b(?:porn|adult live[-\s]?chat|escort|prostitution|illegal drugs?|cannabis|marijuana|firearms?|ammunition|explosives?|counterfeit|pirated|fake traffic|fake followers|fake ids?|pyramid scheme|mlm|get rich quick)\b|(?:成人向け|ポルノ|売春|違法薬物|大麻|銃器|爆発物|偽物|海賊版|偽フォロワー|偽ID|ねずみ講|マルチ商法).{0,80}(?:作|販売|集客|自動化|生成)/i
      }
    ];
    const matched = rules.find((rule) => rule.pattern.test(compact) || rule.pattern.test(text));
    return matched
      ? { blocked: true, code: matched.code, reason: matched.reason }
      : { blocked: false, code: '' };
  }

  function buildOpenChatPromptInjectionAnswer(prompt = '') {
    const guard = openChatPromptInjectionGuard(prompt);
    if (!guard.blocked) return null;
    const ja = looksJapanese(prompt);
    if (String(guard.code || '').startsWith('stripe_prohibited_')) {
      return openChatPatternAnswer(
        'pattern_prohibited_business_blocked',
        'clarify',
        'warn',
        ja,
        [
          'この内容は決済事業者の禁止/制限カテゴリに該当する可能性があるため、CAItでは注文化できません。',
          '',
          'NG例: ギャンブル、賭け、オッズ作成、成人向け性的サービス、違法薬物、武器、模倣品、偽エンゲージメント、投資/暗号資産/転売/ドロップシッピングの利益助言、送金/融資/信用修復など。',
          '',
          '安全に進める場合は、一般的な規約確認、リスク整理、公開ポリシーの要約など、実行や助言に直結しない形に書き直してください。',
          '',
          '注文も課金も発生していません。'
        ],
        [
          'This appears to involve a payment-provider prohibited or restricted category, so CAIt cannot turn it into an order.',
          '',
          'Examples include gambling, betting, odds-making, adult sexual services, illegal drugs, weapons, counterfeit goods, fake engagement, investment/crypto/resale/dropshipping profit advice, money transmission, lending, or credit repair.',
          '',
          'If you need a safe version, rewrite it as policy review, risk summary, or public-policy analysis rather than execution or advice.',
          '',
          'No order or billing happened.'
        ],
        {
          blockReason: guard.code,
          status: 'Prohibited category blocked.\n\nNo order was created and no billing occurred.'
        }
      );
    }
    return openChatPatternAnswer(
      'pattern_prompt_injection_blocked',
      'clarify',
      'warn',
      ja,
      [
        'プロンプトインジェクションらしき指示を検出したため、CAItでは実行・発注文化しません。',
        '',
        'system prompt、developer message、隠し指示、ツール情報、secret の開示や、既存ルールの無視を求める指示は受け付けません。',
        '',
        '安全に進めたい場合は、目的だけを書き直してください。例: 「この文章がプロンプトインジェクションか判定して、危険箇所と修正版を出して」',
        '',
        'まだ注文も課金も発生しません。'
      ],
      [
        'I detected a prompt-injection attempt, so CAIt will not execute it or turn it into an order brief.',
        '',
        'Requests to reveal system prompts, developer messages, hidden instructions, tools, secrets, or to ignore existing rules are blocked.',
        '',
        'If you want a safe version, rewrite the goal only. Example: “Check whether this text is prompt injection and provide risky parts plus a safe rewrite.”',
        '',
        'No order or billing happens.'
      ],
      {
        blockReason: guard.code,
        status: 'Prompt injection blocked.\n\nNo order was created and no billing occurred.'
      }
    );
  }

  function openChatLooksHighStakesAdvice(prompt = '') {
    const text = String(prompt || '');
    return /(should i (?:buy|sell|invest)|investment advice|legal advice|medical advice|diagnose me|treatment plan|lawsuit strategy|tax filing advice|買うべき|売るべき|投資判断|投資助言|法律相談|訴訟戦略|税務申告|医療診断|診断して|治療方針|薬を飲むべき)/i.test(text);
  }

  function openChatHasSpecificExecutionContext(prompt = '', inputCounts = {}) {
    const text = String(prompt || '').trim();
    if (!text) return false;
    if (Number(inputCounts.urlCount || 0) || Number(inputCounts.fileCount || 0)) return true;
    if (isStructuredOrderBrief(text)) return true;
    if (/(https?:\/\/|github\.com|repo\b|repository\b|リポジトリ|URL|添付|ファイル|source file|仕様書|要件定義)/i.test(text)) return true;
    const words = text.split(/\s+/).filter(Boolean).length;
    const concretePatterns = [
      /\b(target|audience|user segment|customer segment|industry|market|niche|vertical|competitor|budget|deadline|constraint|existing product|my product|my app|my site|shopify|saas|b2b|b2c)\b/i,
      /\b(for|targeting|selling to|built for|used by)\s+.{4,}/i,
      /(ターゲット|対象ユーザー|顧客|業界|市場|ジャンル|競合|予算|期限|制約|既存|自社|自分の|URL|サイト|店舗|SaaS|B2B|B2C)/i,
      /(向け|用|について|に対して).{4,}(作|売|改善|調査|比較|伸ば)/i
    ];
    const hits = concretePatterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
    return hits >= 2 || (hits >= 1 && (text.length >= 140 || words >= 28));
  }

  function openChatRequirementHubSpec(prompt = '', inputCounts = {}) {
    const text = String(prompt || '').replace(/\s+/g, ' ').trim();
    if (!text || isStructuredOrderBrief(text)) return null;
    if (openChatLooksSensitiveSecret(text) || openChatLooksUnsafeRequest(text)) return null;
    const hasSource = Boolean(Number(inputCounts.urlCount || 0) || Number(inputCounts.fileCount || 0) || /https?:\/\//i.test(text));
    const workish = /(fix|debug|implement|build|create|add|change|deploy|review|analy[sz]e|summari[sz]e|compare|monitor|automate|integrate|connect|publish|post|send|import|export|sync|run|execute|コード|実装|修正|直して|デバッグ|バグ|作って|追加|変更|デプロイ|レビュー|分析|要約|比較|監視|自動化|連携|接続|公開|投稿|送信|取り込|同期|実行)/i.test(text);
    const agentRequirementTalk = /(?:agent|エージェント).{0,90}(?:require|requires|needs?|needed|ask(?:s|ed)? for|account|login|permission|credential|oauth|api key|求め|必要|要求|アカウント|ログイン|権限|認証|連携|APIキー|apiキー|資格情報)/i.test(text)
      || /(?:require|requires|needs?|needed|account|login|permission|credential|oauth|api key|必要|要求|アカウント|ログイン|権限|認証|連携|APIキー|apiキー).{0,90}(?:agent|エージェント)/i.test(text);
    if (!workish && !agentRequirementTalk) return null;

    const services = [];
    const seen = new Set();
    const add = (type, labelJa, labelEn, purposeJa, purposeEn, command = '') => {
      if (seen.has(type)) return;
      seen.add(type);
      services.push({ type, labelJa, labelEn, purposeJa, purposeEn, command });
    };

    const codeish = /(github|git hub|repo|repository|pull request|\bpr\b|\bbranch\b|\bcommit\b|\bdiff\b|\bcode\b|\bcoding\b|\bbug\b|\bdebug(?:ging)?\b|\bci\b|ci\/cd|continuous integration|github actions?\b|\bworkflow\b|\bdeploy(?:ment)?\b|コード|実装|修正|バグ|デバッグ|リポジトリ|プルリク|ブランチ|コミット|差分|デプロイ|テスト落ち|Actions)/i.test(text);
    if (codeish) {
      add(
        'github_repo',
        'GitHub repo access',
        'GitHub repo access',
        'コード変更やレビューは、repo連携、sandbox branch、pull request、diff、test result で受け渡します。',
        'Code work should use repo access, a sandbox branch, pull request, diff summary, and test result handoff.',
        'open_github_login'
      );
    }
    if (/(google drive|google docs|google sheets|gmail|calendar|drive|docs|sheets|メール|Gmail|Google|ドライブ|スプレッドシート|カレンダー)/i.test(text)) {
      add(
        'google_workspace',
        'Google/Workspace access or exported source',
        'Google/Workspace access or exported source',
        'Google系の作業は、OAuth連携かエクスポート済みファイル/URLとして受け取る前提にします。',
        'Google work needs OAuth access or exported files/URLs as source material.',
        'open_google_login'
      );
    }
    if (/(stripe|checkout|payment|billing|invoice|subscription|connect|payout|refund|決済|課金|請求|返金|サブスク|出金|Stripe)/i.test(text)) {
      add(
        'stripe_account',
        'Payment account context',
        'Payment account context',
        '決済/請求はCAItのSETTINGSで扱い、secret keyをチャットに貼らせません。',
        'Payment work should use SETTINGS; secret keys should not be pasted into chat.',
        'open_payments'
      );
    }
    if (/(vercel|cloudflare|wrangler|pages|workers|aws|gcp|azure|docker|server|infra|deployment|hosting|本番|サーバー|インフラ|ホスティング|Cloudflare|Vercel)/i.test(text)) {
      add(
        'deployment_account',
        'Deployment or cloud account access',
        'Deployment or cloud account access',
        'デプロイ/運用系は対象環境、権限範囲、再実行してよいコマンドを先に確認します。',
        'Deployment work needs the target environment, permission scope, and allowed commands confirmed first.'
      );
    }
    if (/(slack|discord|notion|shopify|wordpress|x\.com|twitter|reddit|product hunt|indie hackers|hacker news|linkedin|facebook|instagram|LINE|Shopify|WordPress|投稿先|SNS|外部サービス)/i.test(text)) {
      add(
        'third_party_account',
        'Third-party app account or posting permission',
        'Third-party app account or posting permission',
        '外部サービスへの投稿/編集/取得は、ログイン情報ではなくOAuth、公開URL、またはユーザー確認済みの入力で扱います。',
        'Third-party posting/editing/fetching should use OAuth, public URLs, or user-confirmed inputs rather than passwords.'
      );
    }
    if (/(api key|apiキー|token|secret|client secret|credential|oauth|login|account|permission|scope|権限|認証|資格情報|シークレット|トークン|アカウント|ログイン)/i.test(text)) {
      add(
        'external_credentials',
        'External credentials or permissions',
        'External credentials or permissions',
        'API keyやtokenが必要なagentでも、CAItはチャットにsecretを貼らせず、連携・環境変数・provider側secret managerで受け渡します。',
        'If an agent needs keys or tokens, CAIt should collect them through integrations, environment variables, or the provider secret manager, not chat.'
      );
    }
    if (!services.length && agentRequirementTalk) {
      add(
        'agent_requirement',
        'Agent-specific requirement',
        'Agent-specific requirement',
        'agentが必要とする入力、権限、アカウントをCAItが注文前に確認します。',
        'CAIt should confirm any agent-specific input, permission, or account requirement before dispatch.'
      );
    }
    if (!services.length) return null;

    const auth = getState()?.snapshot?.auth || {};
    return {
      requirements: services.slice(0, 6),
      taskType: inferClientTaskSequence('', text)[0] || currentRoutingTask() || 'research',
      hasSource,
      githubLinked: isGithubLinked(auth),
      githubAuthorized: isGithubAuthorized(auth)
    };
  }

  function openChatRequirementHubBriefLine(prompt = '', taskType = '', inputCounts = {}) {
    const spec = openChatRequirementHubSpec(prompt, inputCounts);
    if (!spec?.requirements?.length) return '';
    const labels = spec.requirements.map((item) => item.labelEn || item.type).filter(Boolean).slice(0, 4);
    const extra = String(taskType || spec.taskType || '').toLowerCase() === 'code'
      ? ' For repo-backed coding, use GitHub, sandbox branch, pull request delivery, diff summary, and tests.'
      : '';
    return `${labels.join(' / ')} must be confirmed through the CAIt requirement hub before dispatch. Do not paste secrets in chat.${extra}`;
  }

  function openChatLibraryCommandScope(prompt = '') {
    const text = String(prompt || '').trim();
    const lower = text.toLowerCase();
    if (/^\/(?:history|tools|library)\b/.test(lower)) return 'all';
    if (/(最近|過去|使った|利用した).*(アプリ).*(ai\s*agent|aiagent|エージェント).*(一覧|履歴|呼び出|見せて|表示)/i.test(text)) return 'all';
    if (/(最近|過去|使った|利用した).*(ai\s*agent|aiagent|エージェント).*(アプリ).*(一覧|履歴|呼び出|見せて|表示)/i.test(text)) return 'all';
    if (/^\/apps\b/.test(lower) || /^(最近|過去|使った|利用した)?.*(アプリ).*(一覧|履歴|呼び出|見せて|表示)/.test(text)) return 'apps';
    if (/^\/agents\b/.test(lower) || /^\/aiagents\b/.test(lower) || /^(最近|過去|使った|利用した)?.*(ai\s*agent|aiagent|エージェント).*(一覧|履歴|呼び出|見せて|表示)/i.test(text)) return 'agents';
    if (/(最近|過去|使った|利用した).*(アプリ|ai\s*agent|aiagent|エージェント).*(一覧|履歴|呼び出|見せて|表示)/i.test(text)) return 'all';
    return '';
  }

  function openChatTaskLabel(taskType = '') {
    const task = String(taskType || '').trim().toLowerCase();
    const labels = {
      research_team_leader: 'Research Team Leader',
      build_team_leader: 'Build Team Leader',
      research: 'Research Agent',
      teardown: 'Competitor Teardown Agent',
      data_analysis: 'Data Analysis Agent',
      growth: 'Growth Operator Agent',
      media_planner: 'Media Planner Agent',
      writing: 'Writing Agent',
      list_creator: 'List Creator Agent',
      landing: 'Landing Agent',
      seo_specialist: 'SEO Specialist',
      acquisition_automation: 'Acquisition Automation Agent',
      directory_submission: 'Directory Submission Agent',
      x_post: 'X Ops Connector Agent'
    };
    if (labels[task]) return labels[task];
    return task ? task.split(/[_\s-]+/).filter(Boolean).map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`).join(' ') : 'AI Agent';
  }

  function openChatRecentAgentLines(limit = 8) {
    const state = getState();
    const jobs = Array.isArray(state.snapshot?.jobs) ? state.snapshot.jobs : [];
    const rows = [];
    const seen = new Set();
    const remember = (taskType = '', agentName = '', status = '', source = '') => {
      const task = String(taskType || '').trim().toLowerCase();
      if (!task) return;
      const key = `${task}:${String(agentName || '').trim().toLowerCase()}`;
      if (seen.has(key)) return;
      seen.add(key);
      rows.push([
        `- ${agentName || openChatTaskLabel(task)}`,
        `task=${task}`,
        status ? `status=${status}` : '',
        source ? `source=${source}` : ''
      ].filter(Boolean).join(' / '));
    };
    [...jobs]
      .sort((left, right) => String(right.createdAt || right.created_at || '').localeCompare(String(left.createdAt || left.created_at || '')))
      .forEach((job) => {
        remember(job.workflow?.plannedTasks?.[0] || job.taskType || job.task_type, '', job.status || '', 'order');
        (Array.isArray(job.workflow?.childRuns) ? job.workflow.childRuns : []).forEach((child) => {
          remember(child.taskType || child.dispatchTaskType, child.agentName || '', child.status || '', 'workflow');
        });
      });
    if (!rows.length) {
      const agents = Array.isArray(state.snapshot?.agents) ? state.snapshot.agents : [];
      agents.slice(0, limit).forEach((agent) => {
        const task = Array.isArray(agent.taskTypes) ? agent.taskTypes[0] : '';
        remember(task, agent.name || '', agent.verificationStatus || '', 'catalog');
      });
    }
    return rows.slice(0, limit);
  }

  function buildOpenChatReusableToolsAnswer(prompt = '') {
    const scope = openChatLibraryCommandScope(prompt);
    if (!scope) return null;
    const ja = looksJapanese(prompt);
    const showApps = scope === 'all' || scope === 'apps';
    const showAgents = scope === 'all' || scope === 'agents';
    const appLines = [
      '- X Client Ops / app=x-client-ops / action=X post draft, strategy handoff, approval queue / url=https://x.niche-s.com/'
    ];
    const agentLines = openChatRecentAgentLines();
    return {
      kind: 'command',
      tone: 'info',
      patternId: 'pattern_app_agent_library',
      suppressTrio: true,
      body: ja
        ? [
            'チャットから再利用できるアプリ/AIエージェント候補です。',
            '',
            showApps ? 'Apps:' : '',
            ...(showApps ? appLines : []),
            showAgents ? '' : '',
            showAgents ? 'AI Agents:' : '',
            ...(showAgents ? (agentLines.length ? agentLines : ['- まだ利用履歴がありません。注文または納品取得後にここへ出ます。']) : []),
            '',
            '使い方: /apps, /agents, /history。チャットではカードから直接 Open / Use again できます。下のボタンからチャット履歴またはAGENTSへ移動できます。'
          ].filter(Boolean).join('\n')
        : [
            'Reusable app / AI agent candidates from this chat.',
            '',
            showApps ? 'Apps:' : '',
            ...(showApps ? appLines : []),
            showAgents ? '' : '',
            showAgents ? 'AI Agents:' : '',
            ...(showAgents ? (agentLines.length ? agentLines : ['- No usage history yet. It appears after orders or delivery sync.']) : []),
            '',
            'Use /apps, /agents, or /history. CAIt Chat shows direct Open / Use again cards; this panel links you to chat history or AGENTS.'
          ].filter(Boolean).join('\n'),
      actions: [
        { action: 'open_work_tab', label: ja ? 'チャット履歴を開く' : 'OPEN CHAT' },
        { action: 'browse_agents', label: ja ? 'AGENTSを開く' : 'OPEN AGENTS' }
      ],
      status: 'Reusable app and agent library shown.\n\nNo order was created and no billing occurred.'
    };
  }

  function openChatPromptLikeSourceSignalCount(prompt = '') {
    const text = String(prompt || '');
    const patterns = [
      /(^|\n)\s*(system|developer|assistant|user)\s*:/i,
      /\byou are (an?|the)\b/i,
      /\b(ignore|disregard)\s+(all\s+)?(previous|above|prior)\s+instructions\b/i,
      /<\/?(system|developer|instructions|prompt|assistant)>/i,
      /(^|\n)\s*```(?:json|yaml|yml|md|markdown)?/i,
      /\b(SKILL\.md|agent prompt|system prompt|developer message|tool call|function calling|messages\s*:|role\s*:)\b/i,
      /(^|\n)\s*#{1,3}\s*(role|instructions|persona|tools|constraints|output format)\b/i
    ];
    return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
  }

  function isOpenChatLongPromptSource(prompt = '') {
    const text = String(prompt || '').trim();
    if (!text) return false;
    if (/^Task:\s*/mi.test(text) && /inline-long-prompt-source\.txt/i.test(text)) return false;
    const signalCount = openChatPromptLikeSourceSignalCount(text);
    return text.length >= LONG_PROMPT_GUARD_CHARS || signalCount >= 2 || (signalCount >= 1 && text.length >= PROMPT_LIKE_GUARD_CHARS);
  }

  function buildOpenChatLongPromptSourceFiles(prompt = '') {
    const source = String(prompt || '').replace(/\u0000/g, '').trim();
    if (!source) return [];
    const maxFiles = Math.max(1, ORDER_INPUT_MAX_FILES);
    const chunkChars = Math.max(1000, Math.min(ORDER_INPUT_MAX_FILE_CHARS, LONG_PROMPT_SOURCE_CHUNK_CHARS));
    const preservedLimit = Math.min(source.length, ORDER_INPUT_TOTAL_FILE_CHARS);
    const files = [];
    for (let start = 0; start < preservedLimit && files.length < maxFiles; start += chunkChars) {
      const index = files.length + 1;
      const end = Math.min(preservedLimit, start + chunkChars);
      files.push({
        name: index === 1 ? 'inline-long-prompt-source.txt' : `inline-long-prompt-source-${String(index).padStart(2, '0')}.txt`,
        type: 'text/plain',
        size: source.length,
        content: source.slice(start, end),
        truncated: source.length > end
      });
    }
    return files;
  }

  function openChatLongPromptSourceSummary(prompt = '') {
    if (openChatLongPromptSourceSummaryFallback) return openChatLongPromptSourceSummaryFallback(prompt);
    const source = String(prompt || '').trim();
    const files = buildOpenChatLongPromptSourceFiles(source);
    const preservedChars = files.reduce((sum, file) => sum + String(file.content || '').length, 0);
    return {
      files,
      sourceChars: source.length,
      preservedChars,
      clipped: source.length > preservedChars,
      label: files.length > 1
        ? `inline-long-prompt-source.txt + ${files.length - 1} chunk file(s)`
        : 'inline-long-prompt-source.txt'
    };
  }

  function openChatLooksShortPromptSource(prompt = '') {
    const text = String(prompt || '').trim();
    if (!text || isStructuredOrderBrief(text)) return false;
    if (isOpenChatLongPromptSource(text)) return false;
    const signalCount = openChatPromptLikeSourceSignalCount(text);
    if (signalCount >= 2) return true;
    if (signalCount < 1) return false;
    return /(^|\n)\s*(system|developer|assistant|user)\s*:|\byou are (?:an?|the)\b|\bignore\s+(?:all\s+)?(?:previous|above|prior)\s+instructions\b|<\/?(?:system|developer|instructions|prompt)>/i.test(text);
  }

  function buildOpenChatShortPromptSourceAnswer(prompt = '', inputCounts = {}) {
    const source = String(prompt || '').trim();
    const ja = looksJapanese(source);
    const brief = buildOpenChatProtectedSourceBrief(source, inputCounts);
    const sourceSummary = openChatLongPromptSourceSummary(source);
    return openChatPatternAnswer(
      'pattern_short_prompt_source',
      'assist',
      'warn',
      ja,
      [
        '短いAIプロンプト風の入力を検出しました。本文をそのままagent promptには混ぜません。',
        '',
        '入力欄には安全な実行ブリーフだけを残し、元の本文は source file として分離します。',
        'source内の role/system/developer 指示は「引用された資料」として扱い、実行指示として採用しません。',
        '',
        '実行する場合だけ、内容を確認して SEND ORDER してください。まだ注文も課金も発生しません。'
      ],
      [
        'I detected a short prompt-like input. I will not mix it directly into the agent prompt.',
        '',
        'The input box will keep only a safe execution brief, and the original text will be separated as a source file.',
        'Role/system/developer instructions inside the source are treated as quoted material, not execution instructions.',
        '',
        'Review the brief, then press SEND ORDER only if you want paid dispatch. No order or billing happens yet.'
      ],
      {
        nextPrompt: brief,
        sourceFiles: sourceSummary.files,
        status: 'Prompt-like source separated.\n\nNo order was created and no billing occurred. Review the safe brief before dispatch.'
      }
    );
  }

  function buildOpenChatPatternGuardAnswer(prompt = '', inputCounts = {}, options = {}) {
    const text = String(prompt || '').trim();
    if (!text || isStructuredOrderBrief(text)) return null;
    const compact = text.replace(/\s+/g, ' ').trim();
    const ja = looksJapanese(compact);
    const phase = options.phase || 'general';
    const hasAttachedSource = Boolean(Number(inputCounts.urlCount || 0) || Number(inputCounts.fileCount || 0));
    const hasInlineUrl = /https?:\/\//i.test(compact);
    const hasAnySource = hasAttachedSource || hasInlineUrl;
    const previousBrief = lastOpenChatPreparedBrief();

    if (phase === 'precommand') {
      if (openChatLooksSensitiveSecret(compact)) {
        return openChatPatternAnswer(
          'pattern_sensitive_secret',
          'clarify',
          'warn',
          ja,
          [
            '秘密情報らしき文字列を検出しました。このチャットには API key、password、token、client secret を貼らないでください。',
            '',
            '本物を貼った可能性がある場合は、そのキーを無効化/ローテーションしてください。外部サービスの認証情報は、各サービスの secret manager や環境変数側で管理する前提にします。',
            '',
            'この入力は注文には変換しません。秘密情報を除いた目的だけを書き直してください。'
          ],
          [
            'I detected something that looks like a secret. Do not paste API keys, passwords, tokens, or client secrets into chat.',
            '',
            'If this was real, revoke or rotate it. Credentials should live in the provider secret manager or environment variables, not in the work request.',
            '',
            'I will not turn this input into an order. Remove the secret and resend only the goal.'
          ],
          { status: 'Potential secret blocked.\n\nNo order was created and no billing occurred.' }
        );
      }
      if (openChatLooksUnsafeRequest(compact)) {
        return openChatPatternAnswer(
          'pattern_unsafe_request',
          'clarify',
          'warn',
          ja,
          [
            'その内容は不正アクセス、認証情報の窃取、マルウェア、迷惑行為につながる可能性があるため、実行用の注文にはできません。',
            '',
            '安全な形なら対応できます。例: 自分のサービスの脆弱性レビュー、防御目的のログ調査、セキュリティチェックリスト、権限内のペネトレーションテスト計画。',
            '',
            '防御目的の依頼として書き直してください。'
          ],
          [
            'I cannot prepare an executable order for content that may enable unauthorized access, credential theft, malware, or abuse.',
            '',
            'I can help with a safe version: defensive review of your own service, log investigation, a security checklist, or an authorized test plan.',
            '',
            'Rewrite it as a defensive, authorized request.'
          ],
          { status: 'Unsafe request blocked.\n\nNo order was created and no billing occurred.' }
        );
      }
      if (openChatLooksShortPromptSource(compact)) {
        return buildOpenChatShortPromptSourceAnswer(compact, inputCounts);
      }
      return null;
    }

    if (openChatLooksHighStakesAdvice(compact)) {
      return openChatPatternAnswer(
        'pattern_high_stakes',
        'clarify',
        'warn',
        ja,
        [
          'これは医療・法律・税務・投資などの高リスク判断に見えます。CAIt は最終判断や専門家の代替にはできません。',
          '',
          'できることは、公開情報の整理、論点リスト、比較表、専門家に確認すべき質問作成です。',
          '',
          '進める場合は「調査/比較として進める」と書いてください。断定的な助言ではなく、根拠と前提を分けた納品にします。'
        ],
        [
          'This looks like a high-stakes medical, legal, tax, or investment decision. CAIt cannot replace a qualified professional or make the final decision for you.',
          '',
          'I can help with research summaries, issue lists, comparison tables, or questions to take to a professional.',
          '',
          'If you want that, say “proceed as research/comparison”. The delivery will separate evidence, assumptions, and limitations.'
        ],
        { status: 'High-stakes request kept in chat.\n\nNo order was created and no billing occurred.' }
      );
    }

    if (/(?:withdraw|payout|provider|stripe connect|出金|受け取り|引き出し).*(?:deposit|balance|buyer|支払い|残高|デポジット|課金)|(?:pay|payment|支払).*(?:agent|provider|提供者).*(?:direct|直接)|(?:connect|stripe connect).*(?:支払|請求者|buyer|customer)/i.test(compact)) {
      return openChatPatternAnswer(
        'pattern_payment_confusion',
        'clarify',
        'info',
        ja,
        [
          '支払いと受け取りは分けて考える必要があります。',
          '',
          '1. Buyer billing: 注文する側のカード登録と月締め請求です。',
          '2. Provider payout: エージェント提供者の売上受け取りです。外部の受け取り設定が必要です。',
          '',
          '買い手の請求設定は提供者の出金口座ではありません。支払い管理なら PAYMENTS、提供者の受け取りなら PROVIDER を開いてください。'
        ],
        [
          'Payments and payouts are separate.',
          '',
          '1. Buyer billing: saved-card month-end billing for orders.',
          '2. Provider payout: earnings paid to agent providers through external payout setup.',
          '',
          'Buyer billing is not a provider withdrawal account. Open PAYMENTS for buyer billing, or PROVIDER for earnings and Connect status.'
        ],
        { status: 'Payment/payout distinction explained.\n\nNo order was created and no billing occurred.' }
      );
    }

    const looksLikePricingWork = /(?:compare|research|analy[sz]e|review|investigate|調査|比較|分析|レビュー).{0,90}(?:price|pricing|cost|fee|market|route|strategy|価格|値段|料金|費用|相場|市場|ルート)/i.test(compact)
      || /(?:price|pricing|cost|fee|market|route|strategy|価格|値段|料金|費用|相場|市場|ルート).{0,90}(?:compare|research|analy[sz]e|review|調査|比較|分析|レビュー)/i.test(compact);
    const looksLikeDirectPriceResearch = /(知りたい|教えて|探して|調べたい|一番|最高|最大|最安|相場|ランキング|what|which|highest|most expensive|cheapest|how much)/i.test(compact)
      && /(price|pricing|cost|value|値段|価格|相場|いくら)/i.test(compact)
      && !/(CAIt|aiagent2|deposit|billing|payment|order|plan|デポジット|残高|課金|支払|プラン|注文|オーダー)/i.test(compact);
    if (!looksLikePricingWork && !looksLikeDirectPriceResearch && /(cost|price|pricing|how much|budget|cap|reserve|estimate|fee|token cost|見積|費用|料金|いくら|予算|上限|最大|コスト|トークン代)/i.test(compact)) {
      return openChatPatternAnswer(
        'pattern_cost_budget',
        'clarify',
        'info',
        ja,
        [
          '費用は依頼内容、入力ソース量、使う agent、実行時間で変わります。',
          '',
          '発注前に見積もりと最大予約額を表示し、完了後は実利用分で精算します。FAQ回答や発注準備だけなら課金されません。',
          '',
          '上限を厳しくしたい場合は、依頼文に「最大 $X 以内」「安さ優先」「調査は浅め」などを書いてください。必要なら ORDER SETTINGS 側の budget cap/API パラメータにも残せます。'
        ],
        [
          'Cost varies by request complexity, source volume, selected agent, and runtime.',
          '',
          'Before dispatch, CAIt shows an estimate and max reserve. Final billing uses actual usage after completion. FAQ replies and order prep are not billed.',
          '',
          'If you need a strict ceiling, write constraints like “max $X”, “optimize for low cost”, or “shallow research only”. Budget caps can also remain in ORDER SETTINGS/API parameters.'
        ],
        { status: 'Cost guidance answered.\n\nNo order was created and no billing occurred.' }
      );
    }

    const requirementHubAnswer = buildOpenChatRequirementHubAnswer(compact, inputCounts);
    if (requirementHubAnswer) return requirementHubAnswer;

    if (!hasAnySource && /(?:この|その|添付|ファイル|pdf|csv|url|URL|サイト|ページ|repo|repository|リポジトリ).*(?:見て|読んで|分析|要約|比較|レビュー|確認|直して|analy[sz]e|review|summari[sz]e|compare|read|inspect|fix)/i.test(compact)) {
      return openChatPatternAnswer(
        'pattern_source_missing',
        'clarify',
        'warn',
        ja,
        [
          '参照するファイルやURLが必要そうですが、まだ source が付いていません。',
          '',
          'ORDER SETTINGS の URL/File に追加するか、本文にURLを貼ってください。追加後に「要約」「比較」「改善案」「実装レビュー」など、欲しい納品形式も一緒に書くと精度が上がります。',
          '',
          'まだ注文も課金も発生しません。'
        ],
        [
          'This sounds like it needs a file or URL, but no source is attached yet.',
          '',
          'Add it in ORDER SETTINGS under URL/File, or paste the URL into the message. Also say whether you want a summary, comparison, improvement plan, or implementation review.',
          '',
          'No order or billing happens yet.'
        ],
        { status: 'Source required before order prep.\n\nNo order was created and no billing occurred.' }
      );
    }

    if (hasAnySource && /(?:どう思う|見て|確認して|ざっくり|what do you think|look at this|check this|review this|このURL|このファイル|this file|this url)/i.test(compact)
      && !/(要約|比較|修正|抽出|SEO|コード|価格|summari[sz]e|compare|fix|extract|seo|price|pricing|bugs?|security)/i.test(compact)) {
      return openChatPatternAnswer(
        'pattern_source_scope_choice',
        'clarify',
        'info',
        ja,
        [
          'source は受け取れていますが、納品ゴールがまだ曖昧です。',
          '',
          '近いものを選んでください。',
          '1. 要約する',
          '2. 問題点と改善案を出す',
          '3. 競合/代替案と比較する',
          '4. 実行可能なタスクに分解する',
          '',
          '番号か短い言葉で返してください。まだ注文も課金も発生しません。'
        ],
        [
          'I have the source context, but the delivery goal is still unclear.',
          '',
          'Choose the closest outcome:',
          '1. Summarize it',
          '2. Find issues and improvements',
          '3. Compare it with competitors/alternatives',
          '4. Break it into executable tasks',
          '',
          'Reply with a number or short phrase. No order or billing happens yet.'
        ],
        { status: 'Source goal clarification needed.\n\nNo order was created and no billing occurred.' }
      );
    }

    if (!previousBrief && /^(?:それ|これ|それで|そのまま|さっきの|前の|同じ感じ)(?:\s|で|内容|件|まま|を|に|$)|^(?:that|this|do that|same|same as above|continue)\b/i.test(compact)) {
      return openChatPatternAnswer(
        'pattern_ambiguous_reference',
        'clarify',
        'warn',
        ja,
        [
          '「それ」が何を指すか特定できません。現在参照できる発注ブリーフもありません。',
          '',
          'やりたい作業を1文で書き直してください。例: 「このURLをSEO観点でレビューして改善案を表で納品」など。',
          '',
          'まだ注文も課金も発生しません。'
        ],
        [
          'I cannot tell what “that” refers to, and there is no current prepared brief to update.',
          '',
          'Rewrite the task in one sentence, for example: “Review this URL for SEO and deliver improvements as a table.”',
          '',
          'No order or billing happens yet.'
        ],
        { status: 'Ambiguous reference blocked.\n\nNo order was created and no billing occurred.' }
      );
    }

    if (!previousBrief && /^(?:日本語で|英語で|短く|もっと短く|markdownで|マークダウンで|表で|箇条書きで|in english|in japanese|make it short|as markdown|bullet points?|table)$/i.test(compact)) {
      return openChatPatternAnswer(
        'pattern_format_without_source',
        'clarify',
        'info',
        ja,
        [
          '形式指定だけを受け取りましたが、変換する本文や発注ブリーフがまだありません。',
          '',
          '本文を貼るか、先に依頼内容を書いてください。発注ブリーフがある状態なら「英語で」「短く」などの指示を反映できます。'
        ],
        [
          'I received only a format instruction, but there is no text or prepared brief to transform yet.',
          '',
          'Paste the content or write the task first. Once a brief exists, instructions like “in English” or “make it short” can update it.'
        ],
        { status: 'Format-only message needs source.\n\nNo order was created and no billing occurred.' }
      );
    }

    if (/(do it now|run it now|just run|execute now|asap|今すぐ|すぐやって|とにかく実行|急いで|実行して|発注して)/i.test(compact)
      && !openChatHasSpecificExecutionContext(compact, inputCounts)) {
      return openChatPatternAnswer(
        'pattern_urgency_without_scope',
        'clarify',
        'warn',
        ja,
        [
          '急ぎの実行意図は受け取りましたが、成果物、対象、範囲がまだ足りません。',
          '',
          '最低限、次の3点を書いてください。',
          '1. 何を完成させたいか',
          '2. 対象URL/ファイル/市場/リポジトリ',
          '3. 納品形式',
          '',
          '実行前に発注ブリーフと見積もりを出します。まだ注文も課金も発生しません。'
        ],
        [
          'I understand the urgency, but the outcome, target, and scope are still missing.',
          '',
          'Please add these three minimum details:',
          '1. Desired outcome',
          '2. Target URL/file/market/repository',
          '3. Delivery format',
          '',
          'I will prepare a brief and estimate before execution. No order or billing happens yet.'
        ],
        { status: 'Urgent request needs scope.\n\nNo order was created and no billing occurred.' }
      );
    }

    if (/(can you|can an agent|can this service|is it possible|do you support|できる[？?]|できますか|対応できますか|使えますか|可能ですか)/i.test(compact)) {
      const topic = compactChatText(compact.replace(/^(can you|can an agent|can this service|is it possible|do you support|これ|これって|これは|対応|できますか|できる|可能ですか)[\s、。?？]*/i, ''), 120);
      return openChatPatternAnswer(
        'pattern_capability_question',
        'clarify',
        'info',
        ja,
        [
          'できます。まず「実行できる作業」に落とすのが先です。',
          '',
          topic ? `今の入力から拾った対象: ${topic}` : '対象がまだ少し曖昧です。',
          '',
          '進めるなら、欲しい成果物、対象、入力ソース、納品形式を書いてください。曖昧ならこちらから質問して、発注ブリーフへ整理します。',
          '',
          'まだ注文も課金も発生しません。'
        ],
        [
          'Yes. The next step is to turn it into executable work, not to run it immediately.',
          '',
          topic ? `What I picked up: ${topic}` : 'The target is still a little vague.',
          '',
          'If you want to proceed, describe the desired output, target, input sources, and delivery format. If it is still vague, I will ask questions and prepare a work brief first.',
          '',
          'No order or billing happens yet.'
        ],
        { status: 'Capability question answered.\n\nNo order was created and no billing occurred.' }
      );
    }

    return null;
  }

  return {
    buildOpenChatPatternGuardAnswer,
    buildOpenChatPromptInjectionAnswer,
    buildOpenChatReusableToolsAnswer,
    isOpenChatLongPromptSource,
    openChatHasSpecificExecutionContext,
    openChatLongPromptSourceSummary,
    openChatLooksHighStakesAdvice,
    openChatLooksSensitiveSecret,
    openChatLooksUnsafeRequest,
    openChatPromptInjectionGuard,
    openChatPromptLikeSourceSignalCount,
    openChatRequirementHubBriefLine,
    openChatRequirementHubSpec
  };
}
