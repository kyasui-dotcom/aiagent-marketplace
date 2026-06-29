import { randomUUID } from 'node:crypto';
import { SAMPLE_AGENT_DEFINITIONS } from './builtin-agents/agents/index.js';
import {
  createFeedbackReport,
  feedbackReportsForClient,
  formatFeedbackReportEmail,
  sanitizeFeedbackReportForClient,
  updateFeedbackReportInState
} from './feedback-reports.js';
import { makeEvent, nowIso, publicEventView } from './events.js';
import {
  hideChatMemoryTranscriptForLoginInState as hideChatMemoryTranscriptForLoginInStateWithDeps,
  ownChatMemoryForClient as ownChatMemoryForClientWithDeps
} from './chat-memory-state.js';
import {
  leaderControlContractForTask,
  leaderTaskLayer
} from './orchestration.js';
import {
  COMMON_ORDER_QUALITY_RULES,
  commonOrderQualityRulesText,
  inputWithCommonOrderQualityRules,
  orderBodyWithCommonQualityRules
} from './order-quality.js';
import { defaultGoogleSourceGroupsForCapabilities } from './connector-authority.js';
import { createPromptOptimizationTools } from './prompt-optimization.js';
import { createTaskRoutingTools } from './task-routing.js';
import { createAgentRoutingProfileTools } from './agent-routing-profile.js';
import {
  accountSettingsForLogin,
  chatSessionIdForJob,
  isJobVisibleToLogin,
  jobsVisibleToLogin,
  upsertAccountSettingsInState
} from './account-state.js';
import { normalizeTaskTypes } from './task-type-normalization.js';

export { accountHash } from './account-identity.js';
export { makeEvent, nowIso, publicEventView } from './events.js';
export {
  createFeedbackReport,
  feedbackReportsForClient,
  formatFeedbackReportEmail,
  sanitizeFeedbackReportForClient,
  updateFeedbackReportInState
} from './feedback-reports.js';
export { isPrivateNetworkHostname } from './network-hosts.js';
export {
  COMMON_ORDER_QUALITY_RULES,
  commonOrderQualityRulesText,
  inputWithCommonOrderQualityRules,
  orderBodyWithCommonQualityRules
} from './order-quality.js';
export {
  computeNextRecurringRunAt,
  createRecurringOrderInState,
  deleteRecurringOrderInState,
  dueRecurringOrders,
  markRecurringOrderRunInState,
  normalizeRecurringSchedule,
  recurringOrderDue,
  recurringOrderToJobPayload,
  recurringOrdersVisibleToLogin,
  sanitizeRecurringOrderForClient,
  updateRecurringOrderInState
} from './recurring-orders-state.js';
export {
  buildConversionAnalytics,
  createConversionEventPayload,
  conversionEventLabel,
  normalizeConversionEventName
} from './conversion-analytics.js';
export {
  chatTrainingExamplesForClient,
  chatTranscriptsForClient,
  createChatTranscript,
  sanitizeChatTranscriptForClient,
  updateChatTranscriptReviewInState
} from './chat-transcripts.js';
export { buildAgentTeamDeliveryOutput } from './agent-team-delivery.js';
export {
  BILLING_DISPLAY_COUNTRY,
  BILLING_DISPLAY_CURRENCY,
  DEFAULT_MINIMUM_PAYOUT_AMOUNT,
  DEFAULT_OPENAI_MONTHLY_COST_LIMIT,
  DEFAULT_OPENAI_MONTHLY_COST_LIMIT_USD,
  GUEST_TRIAL_CREDIT_LIMIT,
  LEGACY_LEDGER_UNITS_PER_USD,
  LIST_CREATOR_BASE_COST_BASIS,
  LIST_CREATOR_BATCH_SIZE,
  LIST_CREATOR_MAX_REQUESTED_COMPANIES,
  WELCOME_CREDITS_ACCOUNT_LIMIT,
  WELCOME_CREDITS_FREE_ALLOWANCE_USD,
  WELCOME_CREDITS_GRANT_AMOUNT,
  accountIdForLogin,
  accountIdentityForProvider,
  accountSettingsForIdentity,
  accountSettingsForLogin,
  aliasLoginsForAccount,
  applyGuestTrialSignupDebitInState,
  applyStripeRefundToAccount,
  applySubscriptionRefillToAccount,
  authenticateOrderApiKey,
  billingAuditsForJobIds,
  billingModeFromJob,
  billingPeriodId,
  billingProfileForAccount,
  buildMonthlyAccountSummary,
  chatSessionIdForJob,
  createOrderApiKeyInState,
  defaultAccountSettingsForUser,
  defaultLoginForAuthUser,
  displayCurrencyToLedgerAmount,
  ensureGuestTrialAccountInState,
  guestTrialLoginForVisitorId,
  guestTrialUsageForVisitorInState,
  guestTrialVisitorHash,
  hashSecret,
  inferListCreatorRequestedCount,
  isAgentOwnedByLogin,
  isBillableJob,
  isGuestTrialAccountLogin,
  isJobVisibleToLogin,
  jobsVisibleToLogin,
  ledgerAmountToDisplayCurrency,
  linkIdentityToAccountInState,
  linkedIdentitiesForAccount,
  listCreatorUsageEstimateForCount,
  listCreatorUsageEstimateForOrder,
  maybeGrantWelcomeCreditsForSignupInState,
  maybeGrantWelcomeCreditsForVerifiedAgentInState,
  mergeAccountsInState,
  normalizeGuestTrialRequest,
  orderApiKeysForAccount,
  providerMonthlyBillingLedgerForLogin,
  providerPayoutLedgerForLogin,
  providerPayoutProfileForAccount,
  recoverMissingAccountsInState,
  recordProviderMonthlyChargeInAccount,
  recordStripeTopupInAccount,
  releaseBillingReservationInState,
  requesterContextFromJob,
  requesterContextFromUser,
  reserveBillingEstimateInState,
  reviewVerifiedAgentForWelcomeCredits,
  revokeOrderApiKeyInState,
  sanitizeAccountSettingsForClient,
  sanitizeBillingSettingsPatch,
  sanitizeExecutorPreferencesPatch,
  sanitizePayoutSettingsPatch,
  sanitizeProfileSettingsPatch,
  settleBillingForJobInState,
  settleOpenAiCostForJobInState,
  subscriptionBasePriceForPlan,
  subscriptionBonusRateForPlan,
  subscriptionIncludedCreditsForPlan,
  subscriptionRefillAmountForPlan,
  touchOrderApiKeyUsageInState,
  upsertAccountSettingsForIdentityInState,
  upsertAccountSettingsInState
} from './account-state.js';
export { normalizeTaskTypes } from './task-type-normalization.js';
export {
  API_COST_CATALOG_VERSION,
  EXTERNAL_API_COST_CATALOG_USD,
  LLM_HIGH_WATERMARK_PRICE_PER_MTOK_USD,
  buildAgentId,
  computeScore,
  deriveCostBasis,
  estimateBilling,
  estimateRunWindow,
  isAgentSubscriptionActiveForAccount,
  isManagedSampleAgent,
  isPlatformManagedAgent,
  listPriceBreakdown,
  resolveAgentPricingConfig,
  resolveCreatorFeeRateFromAgent,
  resolveMarketplaceFeeRateFromAgent,
  resolvePlatformMarginRateFromAgent,
  resolvePricingPolicy,
  resolveProviderMarkupRateFromAgent,
  usdPriceToLedger
} from './agent-pricing.js';
export {
  agentExecutionProfileFromRecord,
  agentPatternFitScore,
  connectorActionLabel,
  connectorAuthorityForOrder,
  connectorOAuthActionInstruction,
  connectorReadinessForOrder,
  orderInputTypesFromBody,
  orderPreflightForAgent
} from './connector-authority.js';

function normalizeString(value, fallback = '') {
  return String(value ?? fallback).trim();
}

export function ownChatMemoryForClient(state = {}, login = '', limit = 20) {
  return ownChatMemoryForClientWithDeps(state, login, limit, {
    accountSettingsForLogin,
    chatSessionIdForJob,
    jobsVisibleToLogin,
    normalizeTaskTypeAlias
  });
}

export function hideChatMemoryTranscriptForLoginInState(state, login, transcriptId, user = null, authProvider = 'guest', options = {}) {
  return hideChatMemoryTranscriptForLoginInStateWithDeps(state, login, transcriptId, user, authProvider, options, {
    accountSettingsForLogin,
    normalizeTaskTypeAlias,
    upsertAccountSettingsInState
  });
}

export function clarifyingQuestionsFromReport(report = {}) {
  const raw = report?.clarifyingQuestions
    ?? report?.clarifying_questions
    ?? report?.followupQuestions
    ?? report?.follow_up_questions
    ?? report?.questions
    ?? [];
  const values = Array.isArray(raw)
    ? raw
    : String(raw || '').split(/\r?\n|(?:^|\s)\d+\.\s+/);
  return values
    .map((item) => normalizeString(item).replace(/^[-*]\s+/, ''))
    .filter(Boolean);
}

export function deliverySummaryFromReport(report = {}) {
  const lines = [];
  if (report?.summary) lines.push(`Summary: ${normalizeString(report.summary)}`);
  if (Array.isArray(report?.bullets) && report.bullets.length) {
    lines.push('', 'Bullets:');
    report.bullets.forEach((bullet) => {
      const text = normalizeString(bullet);
      if (text) lines.push(`- ${text}`);
    });
  }
  const nextAction = normalizeString(report?.nextAction || report?.next_action);
  if (nextAction) lines.push('', `Next action: ${nextAction}`);
  const questions = clarifyingQuestionsFromReport(report);
  if (questions.length) {
    lines.push('', 'Clarifying questions:');
    questions.forEach((question, index) => lines.push(`${index + 1}. ${question}`));
  }
  return lines.join('\n').trim();
}

export function requestedFollowupJobId(body = {}) {
  return normalizeString(
    body?.followup_to_job_id
    || body?.followupToJobId
    || body?.input?._broker?.conversation?.followupToJobId
    || body?.input?._broker?.conversation?.followup_to_job_id
  );
}

function skipIntakeRequested(body = {}) {
  return body?.skip_intake === true
    || body?.skipIntake === true
    || body?.input?._broker?.intake?.skip === true;
}

function orderInputCountsForIntake(body = {}) {
  const input = body?.input && typeof body.input === 'object' ? body.input : {};
  const urls = Array.isArray(input.urls) ? input.urls.filter(Boolean) : [];
  const files = Array.isArray(input.files) ? input.files.filter((file) => file && (file.content || file.name)) : [];
  return { urlCount: urls.length, fileCount: files.length };
}

function isJapaneseText(value = '') {
  return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(String(value || ''));
}

function isDirectFactQuestion(value = '') {
  const text = normalizeString(value).toLowerCase();
  if (!text) return false;
  const hasFactCue = /(いくら|値段|価格|何円|誰|いつ|どこ|何歳|最大|最小|最高|最安|一番|最新|現在|相場|best|highest|lowest|price|cost|when|who|where|which|current|today)/i.test(text);
  const hasSubject = text.length >= 8 && !/^(いくら|誰|いつ|どこ|what|who|when|where)$/i.test(text);
  return Boolean(hasFactCue && hasSubject);
}

function hasIntentionalClarificationTask(taskType = '', prompt = '') {
  const task = normalizeString(taskType).toLowerCase();
  if (task === 'prompt_brushup' || task === 'prompt') return true;
  return /(prompt brush|prompt_brushup|ブラッシュアップ|発注文|依頼文|ヒアリング|clarifying questions|order brief)/i.test(prompt);
}

function hasVaguePlaceholder(value = '') {
  return /(いい感じ|適当|よしなに|なんか|ざっくり|おまかせ|未定|あとで|tbd|todo|something|anything|whatever|roughly|somehow)/i.test(String(value || ''));
}

function isUnderSpecifiedOrder(prompt = '', taskType = '', body = {}) {
  const text = normalizeString(prompt);
  if (!text) return false;
  if (skipIntakeRequested(body) || requestedFollowupJobId(body)) return false;
  if (body?.workflow_parent_id) return false;
  if (hasIntentionalClarificationTask(taskType, text)) return false;
  if (isDirectFactQuestion(text)) return false;
  const counts = orderInputCountsForIntake(body);
  if ((counts.urlCount || counts.fileCount) && text.length >= 20) return false;
  if (hasVaguePlaceholder(text)) return true;
  const ja = isJapaneseText(text);
  if (ja) {
    const compact = text.replace(/\s+/g, '');
    const shortGeneric = compact.length <= 24
      && /(市場調査|競合調査|調査|分析|要約|作成|改善|実装|修正|比較|翻訳|レビュー|チェック|リサーチ|マーケティング|集客|販促|SEO|広告|売上|収益|利益|認知|流入|アクセス|問い合わせ|リード|登録|トライアル|ユーザー|顧客|CVR|コンバージョン|購入|書いて|まとめて|やって|お願い)(?:を|が)?(して|してください|お願いします|したい|したいです|増やしたい|伸ばしたい|上げたい|改善したい|獲得したい)?[。！!]*$/i.test(compact);
    const shortBroadGoal = compact.length <= 28
      && /(売上|収益|利益|認知|流入|アクセス|問い合わせ|リード|登録|トライアル|ユーザー|顧客|CVR|コンバージョン|購入).{0,4}(増や|伸ば|上げ|改善|獲得|したい|欲しい|ほしい)[。！!]*$/i.test(compact)
      && !/(https?:\/\/|www\.|URL|について|に関して|向け|用|のため|を使って|から)/i.test(compact);
    const missingTarget = compact.length <= 32
      && /(調査|分析|作成|改善|実装|修正|比較|要約|レビュー)(?:を|が)?(して|してください|したい|したいです|お願いします)?[。！!]*$/i.test(compact)
      && !/(について|に関して|向け|用|のため|を使って|から|URL|http)/i.test(compact);
    return Boolean(shortGeneric || shortBroadGoal || missingTarget);
  }
  const words = text.split(/\s+/).filter(Boolean);
  const shortGeneric = words.length <= 5
    && /^(research|analyze|summarize|write|fix|improve|compare|translate|review|build|create|check|market|marketing|grow|promote|advertise)(\s+(it|this|please|something|anything))?[.!?]*$/i.test(text);
  const shortBroadGoal = words.length <= 5
    && /\b(increase|grow|boost|get|generate|drive|raise|improve|do|run)\b.{0,24}\b(sales|revenue|profit|customers|users|leads|traffic|awareness|seo|ads?|advertising|marketing|landing\s?page|lp|conversion|cvr|signups?|purchases?)\b[.!?]*$/i.test(text)
    && !/\b(for|about|with|using|in|from|against|to)\b/i.test(text);
  const missingTarget = words.length <= 3
    && /\b(research|analyze|summarize|write|fix|improve|compare|review|build|create)\b/i.test(text)
    && !/\b(for|about|with|using|in|from|against|to)\b/i.test(text);
  return Boolean(shortGeneric || shortBroadGoal || missingTarget);
}

function builtInLeaderTaskTypesForIntake() {
  const tasks = [];
  const push = (value) => {
    const task = normalizeString(value).toLowerCase();
    if (task && !tasks.includes(task)) tasks.push(task);
  };
  for (const [kind, defaults] of Object.entries(SAMPLE_AGENT_DEFINITIONS)) {
    const leader = defaults?.executionLayer === 'leader' || defaults?.leaderBehavior || defaults?.workflowProfile;
    if (!leader) continue;
    push(kind);
    for (const alias of Array.isArray(defaults?.workflowProfile?.aliases) ? defaults.workflowProfile.aliases : []) push(alias);
  }
  return tasks;
}

const LEADER_INTAKE_TASKS = Object.freeze(new Set(builtInLeaderTaskTypesForIntake()));

const taskRoutingTools = createTaskRoutingTools({
  sampleAgentDefinitions: SAMPLE_AGENT_DEFINITIONS,
  normalizeAgentTags,
  inferAgentTagsFromSignals,
  normalizeTaskTypes,
  leaderControlContractForTask,
  leaderTaskLayer,
  leaderIntakeTasks: LEADER_INTAKE_TASKS
});

function leaderIntakeProfile(taskType = '') {
  const task = normalizeString(taskType).toLowerCase();
  const behaviorProfile = leaderBehaviorForTask(task)?.intakeProfile;
  if (typeof behaviorProfile === 'string' && behaviorProfile.trim()) return behaviorProfile.trim().toLowerCase();
  return '';
}

function leaderIntakeHasContextAttachment(body = {}) {
  const counts = orderInputCountsForIntake(body);
  return Boolean(counts.urlCount || counts.fileCount);
}

function leaderIntakeTextSignals(prompt = '', body = {}) {
  const text = normalizeString(prompt);
  const hasAttachment = leaderIntakeHasContextAttachment(body);
  return {
    objective: /(目的|ゴール|目標|KPI|伸ば|増や|獲得|改善|検証|判断|決め|作りたい|したい|購入|販売|売りたい|買って|goal|objective|kpi|increase|grow|improve|validate|decide|launch|convert|revenue|sales|sell|purchase|buy|order|signup|activation|retention)/i.test(text),
    business: hasAttachment || /(https?:\/\/|www\.|[a-z0-9-]+\.[a-z]{2,}|商材|商品|サービス|プロダクト|事業|会社|ブランド|アプリ|サイト|EC|通販|店舗|SaaS|マーケットプレイス|プラットフォーム|ツール|顧客|課金|価格|e-?commerce|shop|store|esim|product|service|business|company|brand|app|site|saas|marketplace|platform|tool|customer|pricing)/i.test(text),
    audience: /(誰向け|対象|顧客|ユーザー|ペルソナ|ICP|業界|開発者|創業者|法人|個人|旅行客|観光客|訪日|海外旅行|audience|target|customer|user|persona|segment|icp|developer|founder|buyer|traveler|traveller|tourist|visitor|b2b|b2c)/i.test(text),
    currentState: /(現状|今|現在|月間|PV|登録|売上|CVR|流入|チャネル|使っている|課題|数字|baseline|current|traffic|signup|revenue|conversion|funnel|channel|metric|analytics)/i.test(text),
    sourceData: hasAttachment || /(資料|営業資料|提案資料|DL資料|ダウンロード資料|ホワイトペーパー|事例|価格表|LP|ランディングページ|GA4|Google Analytics|アナリティクス|Search Console|サーチコンソール|GSC|CRM|商談|問い合わせ|ログ|レポート|データ|ファイル|読み込|読ませ|参照|添付|material|deck|sales deck|download|whitepaper|case study|pricing page|landing page|analytics|search console|crm|pipeline|lead data|sales data|report|source|file|attachment|reference|context data|no analytics|no source data|no files|no materials|資料なし|データなし|ファイルなし)/i.test(text),
    constraints: /(制約|予算|広告費|無料|なし|使わない|期間|地域|日本|英語|NG|避け|X|Twitter|Reddit|Indie Hackers|SEO|Product Hunt|budget|no ads|without ads|free|constraint|region|deadline|channel|avoid)/i.test(text),
    deliverable: /(納品|出力|形式|レポート|表|計画|プラン|施策|アクション|実行|投稿|コピー|KPI|チェックリスト|deliver|output|report|table|plan|copy|asset|checklist|brief|strategy|roadmap|action|execution)/i.test(text),
    automationPreference: /(自動化|自動|自走|ぐるぐる|回す|回したい|定期|毎日|毎週|毎月|毎時|スケジュール|予約|cron|scheduled|schedule|recurring|repeat|loop|automate|automation|autopilot|run automatically|one[-\s]?off|single run|manual|手動|単発|一回だけ|1回だけ|確認してから|止められる|実行フェイズ|実行フェーズ|execution phase|final execution|承認パケット|7日施策|24時間施策|チャネル別投稿案|投稿\/掲載コピー|投稿案|kpi表)/i.test(text),
    system: hasAttachment || /(リポジトリ|repo|GitHub|コード|システム|アプリ|API|DB|データベース|設計|実装|バグ|エラー|テスト|repository|codebase|system|api|database|architecture|bug|error|test|deploy)/i.test(text),
    legalScope: /(規約|プライバシー|特商法|返金|課金|表示|契約|個人情報|同意|免責|法域|日本法|terms|privacy|refund|billing|contract|compliance|jurisdiction|policy|disclaimer)/i.test(text),
    numbers: /(円|ドル|%|％|月額|単価|原価|粗利|利益|売上|費用|LTV|CAC|ARPU|MRR|ARR|churn|margin|cost|price|revenue|profit|unit economics|\d)/i.test(text),
    longEnough: text.length >= 80 || (hasAttachment && text.length >= 35)
  };
}

function missingLeaderIntakeFields(taskType = '', prompt = '', body = {}) {
  const profile = leaderIntakeProfile(taskType);
  if (!profile) return [];
  const signals = leaderIntakeTextSignals(prompt, body);
  const intakeAnswered = body?.intake_answered === true || body?.intakeAnswered === true || body?.input?._broker?.intake?.answered === true;
  const requirements = Array.isArray(leaderBehaviorForTask(taskType)?.intakeRequiredSignals)
    ? leaderBehaviorForTask(taskType).intakeRequiredSignals
    : [];
  return requirements
    .filter((requirement) => !leaderIntakeRequirementSatisfied(requirement, signals, intakeAnswered))
    .map((requirement) => normalizeString(requirement?.label || requirement?.signal || requirement?.key || requirement))
    .filter(Boolean);
}

function leaderIntakeRequirementSatisfied(requirement = {}, signals = {}, intakeAnswered = false) {
  if (requirement?.skipWhenIntakeAnswered && intakeAnswered) return true;
  const anyOf = Array.isArray(requirement?.anyOf) ? requirement.anyOf : [];
  if (anyOf.length) return anyOf.some((key) => Boolean(signals[normalizeString(key)]));
  const signal = normalizeString(requirement?.signal || requirement?.key || requirement);
  if (!signal) return true;
  return Boolean(signals[signal]);
}

function leaderIntakeQuestionsForTask(taskType = '', prompt = '', missing = []) {
  const profile = leaderIntakeProfile(taskType);
  if (!profile) return [];
  const behavior = leaderBehaviorForTask(taskType);
  const language = isJapaneseText(prompt) ? 'ja' : 'en';
  const source = behavior?.intakeQuestions;
  let questions = [];
  if (typeof source === 'function') {
    try {
      questions = source({ taskType, prompt, missing, language });
    } catch {
      questions = [];
    }
  } else if (Array.isArray(source)) {
    questions = source;
  } else if (source && typeof source === 'object') {
    questions = Array.isArray(source[language]) ? source[language] : (Array.isArray(source.en) ? source.en : []);
  }
  const normalized = normalizeDynamicIntakeQuestions(questions, prompt);
  return normalized.length ? normalized : (missing || []).slice(0, 4);
}

function normalizeDynamicIntakeQuestions(value = [], prompt = '') {
  const seen = new Set();
  return (Array.isArray(value) ? value : [])
    .map((item) => normalizeString(item).replace(/\s+/g, ' ').trim())
    .filter((item) => item && item.length >= 12 && item.length <= 260)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .filter((item) => !/(ignore previous|system prompt|hidden prompt|developer message|api key|secret|パスワード|システムプロンプト|隠しプロンプト)/i.test(item))
    .slice(0, 4);
}

function intakeQuestionsForTask(taskType = '', prompt = '') {
  const task = normalizeString(taskType, 'research').toLowerCase();
  const ja = isJapaneseText(prompt);
  const commonJa = [
    '今回の最終ゴールは何ですか？意思決定、比較、実装、文章化など目的を1文で教えてください。',
    '対象範囲、地域、期間、使ってよい情報源、除外条件はありますか？',
    '納品形式は何がよいですか？例: Markdown、表、チェックリスト、実装手順、短い結論。'
  ];
  const commonEn = [
    'What is the final goal of this order? For example: decision support, comparison, implementation, or written output.',
    'What scope, region, time period, allowed sources, or exclusions should the agent use?',
    'What delivery format do you want? Examples: Markdown, table, checklist, implementation steps, or short answer.'
  ];
  const growthJa = [
    '商材・サービス内容を1〜3文で教えてください。URLがあれば添付してください。',
    '誰向けに集客したいですか？ICP、顧客の課題、今一番取りたい行動を教えてください。',
    '今回の目的は何ですか？例: 認知、流入、登録、問い合わせ、購入、継続、ローンチ。',
    '現状の数字・使えるチャネル・制約はありますか？例: 広告費なし、X/Reddit/SEO中心、対象地域、期間。',
    '納品は何がよいですか？例: 24時間施策、7日プラン、投稿文、LP改善、KPI表。'
  ];
  const growthEn = [
    'Describe the product or service in 1-3 sentences. Attach a URL if available.',
    'Who should be acquired? Include ICP, pain, and the user action you want most.',
    'What is the objective: awareness, traffic, signups, leads, purchases, retention, or launch?',
    'What current numbers, channels, and constraints should be used? Examples: no ads, X/Reddit/SEO, region, timeline.',
    'What should the delivery include: 24-hour actions, 7-day plan, channel copy, landing-page fixes, or KPI table?'
  ];
  const xPostJa = [
    '投稿したい商材・URL・CTAを教えてください。',
    '誰に向けたX投稿ですか？ターゲット、言語、避けたい表現を教えてください。',
    '投稿の目的は何ですか？例: 認知、クリック、登録、購入、返信、告知。',
    '単発投稿、スレッド、複数案、承認後の投稿実行のどれが必要ですか？'
  ];
  const xPostEn = [
    'What product, URL, and CTA should the X post promote?',
    'Who is the target reader? Include language, tone, and phrasing to avoid.',
    'What is the objective: awareness, clicks, signups, purchases, replies, or announcement?',
    'Should the delivery be one post, a thread, multiple variants, or approval-gated posting?'
  ];
  const landingJa = [
    '対象URLまたは作りたいLPの内容を教えてください。',
    '誰に何をしてほしいページですか？ターゲットとCVを教えてください。',
    '使える証拠、スクリーンショット、価格、強み、避けたい訴求はありますか？',
    '納品は改善リスト、コピー、HTML案、実装指示のどれが必要ですか？'
  ];
  const landingEn = [
    'What URL or landing page should this worker use?',
    'Who should convert, and what conversion action matters?',
    'What proof, screenshots, pricing, strengths, or blocked claims should be used?',
    'Should the delivery be fixes, copy, an HTML draft, or implementation instructions?'
  ];
  const directoryJa = [
    '掲載したい商品・URL・カテゴリを教えてください。',
    '対象ユーザー、地域、無料掲載・有料NGなどの制約はありますか？',
    '使える紹介文、画像、価格、規約URL、実績はありますか？',
    '納品は掲載先リスト、掲載文、手動提出チェックリスト、実行までのどれが必要ですか？'
  ];
  const directoryEn = [
    'What product, URL, and category should be listed?',
    'What audience, geography, and listing constraints apply, such as free only or no paid placements?',
    'What copy, screenshots, pricing, terms URL, or proof can be used?',
    'Should the delivery be target directories, listing copy, a manual checklist, or execution handoff?'
  ];
  const emailJa = [
    '誰に送るメールですか？対象、関係性、送信目的を教えてください。',
    '商材、URL、CTA、使える証拠を教えてください。',
    '送信してよい範囲、承認者、使うコネクター、NG表現はありますか？',
    '納品は件名/本文案、シーケンス、リスト連携、承認後送信のどれが必要ですか？'
  ];
  const emailEn = [
    'Who is the email for? Include segment, relationship, and send objective.',
    'What product, URL, CTA, and proof should be used?',
    'What send constraints, approval owner, connector, and blocked phrasing apply?',
    'Should the delivery be subject/body copy, a sequence, list handoff, or approval-gated sending?'
  ];
  const listJa = [
    '探したいリードの条件を教えてください。業界、地域、会社規模、役職など。',
    '除外条件、使ってよい情報源、連絡先の扱いの制約はありますか？',
    '何件程度の候補が必要ですか？まず小さく始める場合は上限も教えてください。',
    '納品は表、CSV項目、レビュー用リスト、次のメール担当への引き継ぎのどれが必要ですか？'
  ];
  const listEn = [
    'What lead criteria should be used: industry, geography, company size, role, or signal?',
    'What exclusions, allowed sources, and contact-data rules apply?',
    'How many candidates are needed, and what is the first batch limit?',
    'Should the delivery be a table, CSV fields, review list, or handoff to email/outreach?'
  ];
  const byTaskJa = {
    code: ['対象のリポジトリ、ファイル、エラー内容、期待動作を教えてください。', '変更してよい範囲と、壊してはいけない挙動はありますか？', 'テスト方法や完了条件は何ですか？'],
    writing: ['誰向けの文章で、読後に何をしてほしいですか？', 'トーン、文字量、入れたい要素、避けたい表現はありますか？', '納品形式は記事、LP、メール、SNS投稿、箇条書きのどれがよいですか？'],
    seo: ['対象URL、狙うキーワード、対象地域/言語を教えてください。', '誰向けに何を増やしたいSEOですか？ターゲットとCVを教えてください。', '競合URL、既存コンテンツ、Search Console/GA4など読ませたいデータはありますか？', '制約と納品形式を教えてください。例: 改善リスト、記事案、メタ案、比較表。'],
    seo_specialist: ['対象URL、狙うキーワード、対象地域/言語を教えてください。', '誰向けに何を増やしたいSEOですか？ターゲットとCVを教えてください。', '競合URL、既存コンテンツ、Search Console/GA4など読ませたいデータはありますか？', '制約と納品形式を教えてください。例: 改善リスト、記事案、メタ案、比較表。'],
    pricing: ['対象商品、顧客層、現在価格、競合価格を教えてください。', '重視する指標は利益率、成約率、継続率、初回獲得のどれですか？', '価格案、プラン表、検証計画のどれを納品すべきですか？'],
    x_post: xPostJa,
    instagram: xPostJa,
    reddit: xPostJa,
    indie_hackers: xPostJa,
    landing: landingJa,
    media_planner: growthJa,
    directory_submission: directoryJa,
    acquisition_automation: growthJa,
    email_ops: emailJa,
    cold_email: emailJa,
    list_creator: listJa,
    growth: growthJa,
    marketing: growthJa,
    customer_acquisition: growthJa,
    research: commonJa
  };
  const byTaskEn = {
    code: ['Which repository, files, error, and expected behavior should the agent use?', 'What can be changed, and what behavior must not break?', 'How should the result be tested or accepted?'],
    writing: ['Who is the target reader, and what should they do after reading?', 'What tone, length, required points, or blocked phrasing should be used?', 'Should the delivery be an article, landing page, email, social post, or bullets?'],
    seo: ['What URL, keyword, region, and language should this target?', 'Who is the target audience, and what conversion should SEO increase?', 'What competitor URLs, existing content, Search Console, GA4, or other source data should be used?', 'What constraints and delivery format should apply: improvements, article plan, meta tags, or comparison table?'],
    seo_specialist: ['What URL, keyword, region, and language should this target?', 'Who is the target audience, and what conversion should SEO increase?', 'What competitor URLs, existing content, Search Console, GA4, or other source data should be used?', 'What constraints and delivery format should apply: improvements, article plan, meta tags, or comparison table?'],
    pricing: ['What product, customer segment, current price, and competitor prices should be used?', 'Which metric matters most: margin, conversion, retention, or acquisition?', 'Should the delivery be price recommendations, plan table, or test plan?'],
    x_post: xPostEn,
    instagram: xPostEn,
    reddit: xPostEn,
    indie_hackers: xPostEn,
    landing: landingEn,
    media_planner: growthEn,
    directory_submission: directoryEn,
    acquisition_automation: growthEn,
    email_ops: emailEn,
    cold_email: emailEn,
    list_creator: listEn,
    growth: growthEn,
    marketing: growthEn,
    customer_acquisition: growthEn,
    research: commonEn
  };
  const table = ja ? byTaskJa : byTaskEn;
  return (table[task] || table.research || (ja ? commonJa : commonEn)).slice(0, 6);
}

export function buildIntakeClarification(body = {}, options = {}) {
  const taskType = normalizeString(options.taskType || body.task_type || body.taskType, 'research');
  const prompt = normalizeString(body?.prompt || body?.goal);
  const selectedAgentId = normalizeString(body?.selected_agent_id || body?.selectedAgentId || body?.input?._broker?.selectedWorker?.agentId);
  const selectedAgentName = normalizeString(body?.selected_agent_name || body?.selectedAgentName || body?.input?._broker?.selectedWorker?.agentName);
  if (!prompt) return null;
  if (skipIntakeRequested(body) || requestedFollowupJobId(body) || body?.workflow_parent_id) return null;
  const intakeAnswered = body?.intake_answered === true || body?.intakeAnswered === true || body?.input?._broker?.intake?.answered === true;
  if (intakeAnswered) return null;
  const leaderMissing = missingLeaderIntakeFields(taskType, prompt, body);
  const leaderNeedsInput = leaderMissing.length > 0;
  const selectedWorkerNeedsInput = Boolean(
    selectedAgentId
    && !intakeAnswered
    && /(selected worker|selected agent|agent for the next order|worker for the next order|使う注文確認|エージェント.*使う|worker.*使う)/i.test(prompt)
  );
  if (!leaderNeedsInput && !selectedWorkerNeedsInput && !isUnderSpecifiedOrder(prompt, taskType, body)) return null;
  const dynamicQuestions = leaderNeedsInput ? normalizeDynamicIntakeQuestions(options.dynamicIntakeQuestions, prompt) : [];
  const questions = leaderNeedsInput
    ? (dynamicQuestions.length >= 2 ? dynamicQuestions : leaderIntakeQuestionsForTask(taskType, prompt, leaderMissing))
    : intakeQuestionsForTask(taskType, prompt);
  const visibleQuestions = questions.slice(0, 4);
  return {
    status: 'needs_input',
    needs_input: true,
    reason: leaderNeedsInput ? 'leader_context_required' : (selectedWorkerNeedsInput ? 'selected_worker_context_required' : 'request_under_specified'),
    inferred_task_type: taskType,
    prompt,
    questions: visibleQuestions,
    missing_fields: leaderNeedsInput ? leaderMissing : undefined,
    intake: {
      id: `intake_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      originalPrompt: prompt,
      taskType,
      selectedAgentId,
      selectedAgentName,
      questions: visibleQuestions,
      missingFields: leaderNeedsInput ? leaderMissing : [],
      questionSource: dynamicQuestions.length >= 2 ? 'openai' : 'rules',
      createdAt: nowIso(),
      answerMode: 'resubmit_with_answers'
    },
    message: isJapaneseText(prompt)
      ? (leaderNeedsInput
        ? 'チームリーダーが動くには目的、対象、読ませたい資料や実データ、制約、納品形式の確認が必要です。課金・実行前に確認質問を返しました。'
        : '発注内容がまだ薄いため、課金・実行前に確認質問を返しました。回答後に再送してください。')
      : (leaderNeedsInput
        ? 'A team leader needs the objective, target, source materials or real data, constraints, and desired delivery before billing or dispatch.'
        : 'The order is under-specified, so AIagent2 returned clarification questions before billing or dispatch.'),
    statusCode: 200
  };
}

const promptOptimizationTools = createPromptOptimizationTools({
  hasVaguePlaceholder,
  inferTaskSequence,
  inferTaskType,
  isDirectFactQuestion,
  isJapaneseText,
  normalizeString,
  requestedFollowupJobId
});

export function promptInjectionGuardForPrompt(prompt = '') {
  return promptOptimizationTools.promptInjectionGuardForPrompt(prompt);
}

export function protectedPromptSourceFilesFromOptimization(promptOptimization = {}, options = {}) {
  return promptOptimizationTools.protectedPromptSourceFilesFromOptimization(promptOptimization, options);
}

export function protectedPromptSourceFileFromOptimization(promptOptimization = {}, options = {}) {
  return promptOptimizationTools.protectedPromptSourceFileFromOptimization(promptOptimization, options);
}

export function mergeProtectedPromptSourceIntoInput(input = {}, promptOptimization = {}) {
  return promptOptimizationTools.mergeProtectedPromptSourceIntoInput(input, promptOptimization);
}

export function optimizeOrderPromptForBroker(body = {}, options = {}) {
  return promptOptimizationTools.optimizeOrderPromptForBroker(body, options);
}

function reportFromJob(job = {}) {
  return job?.output?.report && typeof job.output.report === 'object' ? job.output.report : {};
}

function fileNamesFromJob(job = {}) {
  return Array.isArray(job?.output?.files)
    ? job.output.files.map((file) => normalizeString(file?.name)).filter(Boolean)
    : [];
}

export function buildFollowupConversationContext(state = {}, body = {}, options = {}) {
  const followupToJobId = requestedFollowupJobId(body);
  if (!followupToJobId) return null;
  const jobs = Array.isArray(state?.jobs) ? state.jobs : [];
  const previousJob = jobs.find((job) => job?.id === followupToJobId);
  if (!previousJob) {
    return {
      error: 'followup_to_job_id not found',
      code: 'followup_job_not_found',
      statusCode: 404,
      followupToJobId
    };
  }
  const login = normalizeString(options?.login);
  if (login && !isJobVisibleToLogin(previousJob, state?.agents || [], login)) {
    return {
      error: 'followup_to_job_id is not visible to this account',
      code: 'followup_job_not_visible',
      statusCode: 403,
      followupToJobId
    };
  }
  const previousConversation = previousJob?.input?._broker?.conversation || {};
  const report = reportFromJob(previousJob);
  const rootJobId = normalizeString(previousConversation.rootJobId || previousJob.id, previousJob.id);
  const turn = Math.max(2, Number(previousConversation.turn || previousConversation.conversationTurn || 1) + 1);
  return {
    mode: 'followup',
    conversationId: normalizeString(
      body?.conversation_id
      || body?.conversationId
      || previousConversation.conversationId
      || `conv_${rootJobId}`,
      `conv_${rootJobId}`
    ),
    followupToJobId,
    rootJobId,
    turn,
    previousJob: {
      id: previousJob.id,
      taskType: previousJob.taskType,
      prompt: previousJob.prompt,
      status: previousJob.status,
      reportSummary: normalizeString(report.summary),
      summaryText: deliverySummaryFromReport(report),
      clarifyingQuestions: clarifyingQuestionsFromReport(report),
      nextAction: normalizeString(report.nextAction || report.next_action),
      fileNames: fileNamesFromJob(previousJob)
    }
  };
}

const agentRoutingProfileTools = createAgentRoutingProfileTools({
  defaultGoogleSourceGroupsForCapabilities,
  leaderControlContractForTask,
  normalizeTaskTypeAlias,
  normalizeTaskTypes,
  nowIso,
  publicTaskRoutingProfileForKind,
  taskRoutingTokensFromAgentDefinitions
});

export function normalizeAgentTags(value = [], options = {}) {
  return agentRoutingProfileTools.normalizeAgentTags(value, options);
}

export function inferAgentTagsFromSignals(input = {}) {
  return agentRoutingProfileTools.inferAgentTagsFromSignals(input);
}

export function agentTagsFromRecord(agent = {}) {
  return agentRoutingProfileTools.agentTagsFromRecord(agent);
}

export function agentLinksFromRecord(agent = {}, options = {}) {
  return agentRoutingProfileTools.agentLinksFromRecord(agent, options);
}

export function agentRoutingConfirmationAccepted(body = {}) {
  return agentRoutingProfileTools.agentRoutingConfirmationAccepted(body);
}

export function buildAgentRoutingConfirmation(agent = {}, options = {}) {
  return agentRoutingProfileTools.buildAgentRoutingConfirmation(agent, options);
}

export function applyConfirmedAgentRoutingToAgent(agent = {}, options = {}) {
  return agentRoutingProfileTools.applyConfirmedAgentRoutingToAgent(agent, options);
}

export const DEFAULT_AGENT_SEEDS = agentRoutingProfileTools.defaultAgentSeedsFromDefinitions(SAMPLE_AGENT_DEFINITIONS);
export const DEPRECATED_AGENT_SEED_IDS = agentRoutingProfileTools.deprecatedAgentSeedIdsFromDefinitions(SAMPLE_AGENT_DEFINITIONS);

function leaderBehaviorForTask(taskType = '') {
  return taskRoutingTools.leaderBehaviorForTask(taskType);
}

function taskRoutingTokensFromAgentDefinitions(taskType = '', options = {}) {
  return taskRoutingTools.taskRoutingTokensFromAgentDefinitions(taskType, options);
}

function publicTaskRoutingProfileForKind(kind = '') {
  return taskRoutingTools.publicTaskRoutingProfileForKind(kind);
}

export function leaderSpecialistTaskForFollowupFromDefinition(primaryTask = '', text = '') {
  return taskRoutingTools.leaderSpecialistTaskForFollowupFromDefinition(primaryTask, text);
}

export function normalizeLeaderWorkflowPlannedTasksFromDefinition(plannedTasks = [], primaryTask = '', prompt = '', options = {}, helpers = {}) {
  return taskRoutingTools.normalizeLeaderWorkflowPlannedTasksFromDefinition(plannedTasks, primaryTask, prompt, options, helpers);
}

export function leaderPlannerAllowsCandidateAgentTasksFromDefinition(primaryTask = '', defaultValue = true) {
  return taskRoutingTools.leaderPlannerAllowsCandidateAgentTasksFromDefinition(primaryTask, defaultValue);
}

export function ensureLeaderWorkflowActionTasksFromDefinition(plannedTasks = [], primaryTask = '', prompt = '', options = {}, helpers = {}) {
  return taskRoutingTools.ensureLeaderWorkflowActionTasksFromDefinition(plannedTasks, primaryTask, prompt, options, helpers);
}

export function leaderWorkflowReplanDecisionFromDefinition(primaryTask = '', context = {}) {
  return taskRoutingTools.leaderWorkflowReplanDecisionFromDefinition(primaryTask, context);
}

export function leaderSequentialUserActionPriorityFromDefinition(primaryTask = '', context = {}) {
  return taskRoutingTools.leaderSequentialUserActionPriorityFromDefinition(primaryTask, context);
}

export function leaderExternalActionRequestedFromDefinition(primaryTask = '', text = '') {
  return taskRoutingTools.leaderExternalActionRequestedFromDefinition(primaryTask, text);
}

export function workflowTaskSoftMatchTokens(taskType = '', options = {}) {
  return taskRoutingTools.workflowTaskSoftMatchTokens(taskType, options);
}

export function workflowTaskCandidateTokens(taskType = '', options = {}) {
  return taskRoutingTools.workflowTaskCandidateTokens(taskType, options);
}

export function workflowTagHintsForTask(taskType = '', options = {}) {
  return taskRoutingTools.workflowTagHintsForTask(taskType, options);
}

function normalizeTaskTypeAlias(taskType = '', prompt = '') {
  return taskRoutingTools.normalizeTaskTypeAlias(taskType, prompt);
}

export function leaderTaskTypeForInitialWork(taskType = '', prompt = '') {
  return taskRoutingTools.leaderTaskTypeForInitialWork(taskType, prompt);
}

export function isLargeAgentTeamIntent(taskType = '', prompt = '') {
  return taskRoutingTools.isLargeAgentTeamIntent(taskType, prompt);
}

export function inferTaskSequence(taskType, prompt = '', options = {}) {
  return taskRoutingTools.inferTaskSequence(taskType, prompt, options);
}

export function inferTaskType(taskType, prompt = '') {
  return taskRoutingTools.inferTaskType(taskType, prompt);
}
