import {
  createCmoLeaderAgentProvider,
  agentProviderList,
  agentProviderText
} from '../cmo-leader-provider.js';
import {
  cmoLeaderCheckpointDeliveryFromSynthesis,
  cmoLeaderNormalizeLeaderDelivery,
  cmoLeaderProviderSynthesis
} from '../cmo-leader-synthesis.js';

const AGENT_PROVIDER = createCmoLeaderAgentProvider({
  providerSynthesis: cmoLeaderProviderSynthesis,
  checkpointDeliveryFromSynthesis: cmoLeaderCheckpointDeliveryFromSynthesis,
  normalizeLeaderDelivery: cmoLeaderNormalizeLeaderDelivery
});

export const CMO_WORKFLOW_DATA_LAYER_TASKS = Object.freeze([
  'data_analysis'
]);

export const CMO_WORKFLOW_SEARCH_LAYER_TASKS = Object.freeze([
  'research',
  'teardown',
  'validation'
]);

export const CMO_WORKFLOW_RESEARCH_LAYER_TASKS = CMO_WORKFLOW_SEARCH_LAYER_TASKS;

export const CMO_WORKFLOW_PLANNING_LAYER_TASKS = Object.freeze([
  'media_planner',
  'growth'
]);

export const CMO_WORKFLOW_PREPARATION_LAYER_TASKS = Object.freeze([
  'list_creator',
  'landing',
  'seo_specialist',
  'writing',
  'writer',
  'reddit',
  'indie_hackers'
]);

export const CMO_WORKFLOW_ACTION_LAYER_TASKS = Object.freeze([]);

export const CMO_WORKFLOW_EXECUTION_LAYER_TASKS = CMO_WORKFLOW_ACTION_LAYER_TASKS;

export const CMO_WORKFLOW_EXECUTION_SUPPORT_LAYER_TASKS = CMO_WORKFLOW_PREPARATION_LAYER_TASKS;

export const CMO_WORKFLOW_COMMUNITY_LAYER_TASKS = Object.freeze([]);

export const CMO_WORKFLOW_LATE_EXECUTION_LAYER_TASKS = Object.freeze([]);

export const CMO_WORKFLOW_DEFAULT_EXECUTION_TASKS = Object.freeze([
  'media_planner',
  'seo_specialist',
  'landing',
  'growth'
]);

export const CMO_WORKFLOW_SPECIALIST_TASKS = Object.freeze([...new Set([
  ...CMO_WORKFLOW_DATA_LAYER_TASKS,
  ...CMO_WORKFLOW_RESEARCH_LAYER_TASKS,
  ...CMO_WORKFLOW_PLANNING_LAYER_TASKS,
  ...CMO_WORKFLOW_PREPARATION_LAYER_TASKS,
  ...CMO_WORKFLOW_ACTION_LAYER_TASKS,
  ...CMO_WORKFLOW_EXECUTION_LAYER_TASKS,
  ...CMO_WORKFLOW_EXECUTION_SUPPORT_LAYER_TASKS,
  ...CMO_WORKFLOW_COMMUNITY_LAYER_TASKS,
  ...CMO_WORKFLOW_LATE_EXECUTION_LAYER_TASKS
])]);

export const CMO_ACTION_RUN_TASKS = Object.freeze([
  'growth',
  'seo_specialist',
  'landing',
  'writing',
  'writer',
  'list_creator',
  'reddit',
  'indie_hackers'
]);

export const CMO_TASK_EXPANSION_TASKS = Object.freeze([
  'research',
  'teardown',
  'data_analysis',
  'media_planner',
  'growth',
  'list_creator',
  'writing',
  'seo_specialist',
  'landing',
  'reddit',
  'indie_hackers',
  'summary'
]);

export const CMO_LEADER_ANALYSIS_PRELUDE_TASKS = Object.freeze([
  'research',
  'teardown',
  'data_analysis',
  'media_planner',
  'seo_specialist',
  'landing'
]);

export const CMO_FREE_WEB_GROWTH_TASKS = Object.freeze([
  'cmo_leader',
  'research',
  'teardown',
  'data_analysis',
  'media_planner',
  'seo_specialist',
  'landing',
  'growth',
  'writing',
  'reddit',
  'indie_hackers'
]);

export const CMO_AGENT_TEAM_LAUNCH_TASKS = Object.freeze([
  'cmo_leader',
  'research',
  'teardown',
  'data_analysis',
  'media_planner',
  'growth',
  'list_creator',
  'seo_specialist',
  'landing',
  'writing',
  'reddit',
  'indie_hackers'
]);

export const CMO_CONNECTOR_EXECUTION_POLICIES = Object.freeze({
  x_post: Object.freeze({
    connector: 'x',
    capability: 'x.post',
    approvalMode: 'human_or_leader_before_external_post',
    approvalFields: Object.freeze(['oauth_account_handle', 'exact_post_text', 'destination_url', 'stop_rule']),
    proofRequired: Object.freeze(['posted_url', 'timestamp', 'account_id_or_handle']),
    fallback: 'manual_posting_packet'
  }),
  instagram: Object.freeze({
    connector: 'instagram',
    capability: 'instagram.post',
    approvalMode: 'human_or_leader_before_external_post',
    proofRequired: Object.freeze(['posted_url', 'timestamp', 'account_id_or_handle']),
    fallback: 'manual_posting_packet'
  }),
  reddit: Object.freeze({
    connector: 'reddit',
    capability: 'reddit.draft',
    approvalMode: '',
    proofRequired: Object.freeze([]),
    fallback: 'community_draft_packet'
  }),
  indie_hackers: Object.freeze({
    connector: 'indie_hackers',
    capability: 'indie_hackers.draft',
    approvalMode: '',
    proofRequired: Object.freeze([]),
    fallback: 'community_draft_packet'
  }),
  email_ops: Object.freeze({
    connector: 'email',
    capability: 'email.send',
    approvalMode: 'human_or_leader_before_external_send',
    proofRequired: Object.freeze(['message_id', 'recipient_segment', 'timestamp']),
    fallback: 'approval_ready_email_draft'
  }),
  cold_email: Object.freeze({
    connector: 'email',
    capability: 'email.send_outbound',
    approvalMode: 'human_approval_and_compliance_before_send',
    proofRequired: Object.freeze(['message_id', 'recipient_source', 'opt_out_path', 'timestamp']),
    fallback: 'blocked_until_source_sender_and_compliance_approved'
  }),
  directory_submission: Object.freeze({
    connector: 'browser_or_directory',
    capability: 'directory.submit',
    approvalMode: 'human_or_leader_before_external_submission',
    proofRequired: Object.freeze(['directory_url', 'submission_status', 'timestamp']),
    fallback: 'manual_submission_queue'
  }),
  acquisition_automation: Object.freeze({
    connector: 'automation',
    capability: 'automation.write',
    approvalMode: 'human_or_leader_before_connector_write',
    proofRequired: Object.freeze(['workflow_id_or_payload', 'trigger', 'pause_condition']),
    fallback: 'manual_operations_checklist'
  }),
  citation_ops: Object.freeze({
    connector: 'local_seo',
    capability: 'citation.submit',
    approvalMode: 'human_or_leader_before_external_submission',
    proofRequired: Object.freeze(['listing_url', 'status', 'timestamp']),
    fallback: 'manual_citation_queue'
  })
});

const CMO_FREE_WEB_GROWTH_PATTERN = /(free web growth|free marketing|organic growth|organic acquisition|no[-\s]?ads?|without ads|web.*free|free.*web|無料.*(web|ウェブ|施策|集客|流入|マーケ|SEO)|(?:web|ウェブ).*(無料|施策|集客|流入|マーケ)|広告費.*(なし|使わない|ゼロ)|自然流入|オーガニック.*(集客|流入|成長)|無料で.*(集客|伸ば|売上|ユーザー))/i;
const CMO_AGENT_TEAM_LAUNCH_PATTERN = /(agent team|agent_team|launch team|multi[-\s]?agent launch|one announcement|all channels|cross[-\s]?channel|launch campaign|告知.*(まとめ|一括|全部|複数|チーム)|ローンチ.*(まとめ|一括|全部|複数|チーム)|複数.*(agent|エージェント).*告知|1告知|一つの告知|まとめて.*(告知|投稿|発信)|各チャネル.*告知)/i;
const CMO_LEADER_INTENT_PATTERN = /(cmo|chief marketing|marketing leader|free web growth|free marketing|organic growth|organic acquisition|no[-\s]?ads?|without ads|agent team|launch team|multi[-\s]?agent launch|cross[-\s]?channel|all channels|マーケ責任者|cmo的|マーケ部長|広告費.*(なし|使わない|ゼロ)|無料.*(web|ウェブ|施策|集客|流入|マーケ|SEO)|集客(?:したい|を(?:増や|伸ば|改善|強化)|施策|戦略)|(?:ユーザー|登録|問い合わせ|リード|流入|認知).*(?:増や|伸ば|獲得|改善|強化)|複数.*(agent|エージェント).*告知|まとめて.*(告知|投稿|発信))/i;
const CMO_EXTERNAL_ACTION_REQUEST_PATTERN = /(external connector|external execution|connector handoff|connector execution|oauth|publish(?:ing)?|post(?:ing)?|send(?:ing)?|schedule(?:ing)?|execute(?: the)? action|run through action|through to action|through execution|complete through execution|action handoff|action packet|plan\s*(?:and|&)\s*do|plan\s+then\s+execute|not\s+just\s+plan|do\s+it|execute\s+too|外部コネクタ|外部コネクター|コネクタ.*(?:実行|連携|接続|handoff|ハンドオフ)|コネクター.*(?:実行|連携|接続|handoff|ハンドオフ)|実行反映|実行まで|反映まで|アクションまで|actionまで|投稿まで|公開まで|送信まで|配信まで|掲載まで|納品まで|完走|最後まで|計画して実行|実行も|やって|やるところまで|実際に.*(?:投稿|公開|送信|配信|掲載|反映|実行)|(?:x|twitter|ツイッター).*(?:投稿|ポスト|スレッド)|(?:メール|gmail).*(?:送信|配信|スケジュール)|(?:github|ギットハブ).*(?:pr|pull request|プルリク|反映))/i;
const CMO_ACTION_EXECUTION_PATTERN = /(execute|execution|do actions?|run|post|send|publish|submit|external write|実行まで|実行して|実施して|アクション|投稿して|配信して|掲載して|送信して)/i;
const CMO_EXPLICIT_ACTION_CHANNEL_PATTERN = /(x\.com|(?:^|[^a-z0-9])x(?:\s+post|\s+posts|\s+thread)?(?=$|[^a-z0-9])|twitter|tweet|x投稿|ツイッター|instagram|insta|ig\b|インスタ|instagram|reddit|subreddit|レディット|indie\s*hackers|indiehackers|インディーハッカー|インディーハッカーズ|directory submission|directory listing|掲載媒体|媒体掲載|無料掲載|ディレクトリ掲載|gbp|google business profile|サイテーション|citation|meo|email ops|email campaign|newsletter|gmail|send email|cold\s*email|outbound|営業メール|メール配信|メルマガ|acquisition automation|獲得自動化|集客自動化)/i;

export const CMO_TASK_INFERENCE_RULES = Object.freeze([
  Object.freeze({ taskType: 'cmo_leader', score: 90, patterns: Object.freeze([CMO_FREE_WEB_GROWTH_PATTERN]) }),
  Object.freeze({ taskType: 'cmo_leader', score: 90, patterns: Object.freeze([CMO_AGENT_TEAM_LAUNCH_PATTERN]) }),
  Object.freeze({ taskType: 'cmo_leader', score: 20, patterns: Object.freeze([/(?:\bcmo\b|chief marketing|marketing leader|マーケ責任者|cmo的|マーケ部長|マーケティング責任者)/i]) }),
  Object.freeze({ taskType: 'acquisition_automation', patterns: Object.freeze([/(acquisition automation|customer acquisition automation|lead gen automation|lead generation automation|outreach automation|crm automation|pipeline automation|reply handling|follow[-\s]?up automation|集客自動化|リード獲得.*自動化|見込み客.*自動化|営業.*自動化|CRM.*自動化|フォローアップ.*自動化|返信.*自動化|パイプライン.*自動化)/i]) }),
  Object.freeze({ taskType: 'media_planner', patterns: Object.freeze([/(media planner|channel planner|distribution strategy|channel fit|listing media strategy|best media|best channels|where should we list|which media should we use|掲載媒体.*提案|どの掲載媒体|どの媒体|どこに掲載|ホームページ.*媒体|url.*媒体|業種.*媒体|ホームページurl.*業種|業種.*ホームページurl|媒体選定|掲載先選定|チャネル選定|配信媒体選定|媒体が合う|媒体おすすめ|掲載媒体.*合う)/i]) }),
  Object.freeze({ taskType: 'list_creator', score: 20, patterns: Object.freeze([/(list creator|lead sourcing|lead qualification|prospect sourcing|company list builder|prospect research|build.*lead list|build.*prospect list|reviewable lead|public email|public contact|contact path|公開メアド|公開メール|公開連絡先|連絡先収集|見込み客リスト作成|リードリスト作成|営業先リスト|企業リスト作成|送る会社リスト|会社リスト作成|営業リスト作成|公開情報.*リスト|公開情報.*見込み客|公開情報.*営業先|公開情報.*メアド|公開情報.*連絡先)/i]) }),
  Object.freeze({ taskType: 'cold_email', patterns: Object.freeze([/(cold email|cold outbound|outbound email|sales email|prospecting email|メール営業|コールドメール|アウトバウンドメール|営業メール|送信元メール|送信元アドレス|cold outreach|outbound sequence|営業文面|営業メール文面)/i]) }),
  Object.freeze({ taskType: 'email_ops', patterns: Object.freeze([/(email ops|email campaign|lifecycle email|newsletter|drip campaign|welcome email|onboarding email|reactivation email|retention email|send email|メルマガ|メール施策|メール配信|ステップメール|ウェルカムメール|オンボーディングメール|リアクティベーションメール|リテンションメール)/i]) }),
  Object.freeze({ taskType: 'directory_submission', patterns: Object.freeze([/(directory submission|directory listing|submit.*directory|launch directory|startup directory|ai tool directory|product directory|media listing|free listing|list.*product|媒体掲載|無料掲載|投稿先.*リスト|ディレクトリ掲載|AIツール.*掲載|一気に掲載|まとめて掲載|掲載して|登録して|submit.*listing|directory.*submit|listing.*submit)/i]) }),
  Object.freeze({ taskType: 'citation_ops', patterns: Object.freeze([/(citation ops|citation audit|local seo|google business profile|google business|\bgbp\b|\bmeo\b|map engine optimization|nap consistency|local citations|citation cleanup|business listing consistency|サイテーション|ローカルseo|googleビジネスプロフィール|google business profile|gbp対策|meo対策|\bnap\b|店舗情報整備|ローカル掲載|ローカル引用|口コミ導線)/i]) }),
  Object.freeze({ taskType: 'instagram', patterns: Object.freeze([/(instagram|insta|ig\b|インスタ|インスタグラム|reel|carousel|story|ストーリー|リール|カルーセル)/i]) }),
  Object.freeze({ taskType: 'x_post', patterns: Object.freeze([/(x\.com|(?:^|[^a-z0-9])x(?:\s+post|\s+posts|\s+thread)(?=$|[^a-z0-9])|twitter|tweet|tweets|ツイート|x投稿|ポスト|スレッド)/i]) }),
  Object.freeze({ taskType: 'reddit', patterns: Object.freeze([/(reddit|subreddit|redditor|レディット|サブレディット)/i]) }),
  Object.freeze({ taskType: 'indie_hackers', patterns: Object.freeze([/(indie hackers|indiehackers|ih post|インディーハッカー|インディーハッカーズ)/i]) }),
  Object.freeze({ taskType: 'growth', patterns: Object.freeze([/(growth|go[-\s]?to[-\s]?market|gtm|acquisition|activation|retention|signup|signups|more users|outreach|community|product hunt|indie hackers|reddit|x\.com|twitter|marketing|sales|revenue|more money|売上|収益|集客|登録数|会員登録|ユーザー獲得|マーケ|営業|グロース|プロダクトハント|インディーハッカー)/i]) }),
  Object.freeze({ taskType: 'seo_specialist', patterns: Object.freeze([/(content gap|SEO Specialist|keyword gap|search intent|キーワードギャップ|コンテンツギャップ|検索意図)/i]) })
]);

export const CMO_AGENT_ACTION_CONTRACTS = Object.freeze({
  media_planner: {
    action: 'Choose the top three organic priorities and hand off the exact preparation/app-reflection packets.',
    requiredInput: 'Product URL, ICP, conversion goal, constraints, research findings, proof assets, and candidate channels.',
    deliverable: 'Top 3 priority actions, why they beat the other options, leader handoff, preparation-layer tasks, app/site reflection plan, metric, and stop rule.',
    approvalGate: 'Approve the selected top three, their preparation artifacts, app/site surfaces, and stop rules before preparation or connector work proceeds.',
    doneDefinition: 'The leader can release preparation work for the selected priorities without another broad channel strategy pass.'
  },
  seo_specialist: {
    action: 'Create the comparison SEO page packet.',
    requiredInput: 'Product URL, ICP, signup goal, target page path, source-backed keyword/SERP evidence when available.',
    deliverable: 'H1/meta, page outline, comparison table, FAQ, internal links, CTA copy, measurement events.',
    approvalGate: 'Approve page path, claims, CTA, and publish target before handing the packet to the manifest-matched SaaS app surface.',
    doneDefinition: 'An app-ready or paste-ready page packet exists with UTM/measurement notes and no unresolved fields.',
    publisherHandoff: Object.freeze({
      surface: 'publisher',
      contentType: 'seo_article',
      artifactType: 'seo_article',
      artifactTypes: Object.freeze(['seo_article', 'site_publish_packet', 'approval_request']),
      itemType: 'seo_article',
      actionType: 'site_publish_packet',
      channel: 'owned_site',
      connector: 'publisher',
      connectorCapability: 'site_publish_packet'
    })
  },
  landing: {
    action: 'Rewrite the destination page for signup conversion.',
    requiredInput: 'Current page URL/copy, ICP, conversion event, proof assets, objection list, approved claims.',
    deliverable: 'Hero, subcopy, CTA pair, proof block, objection/FAQ block, measurement plan.',
    approvalGate: 'Approve exact copy and target surface before handing it to the manifest-matched SaaS app surface.',
    doneDefinition: 'Replacement copy can be handed to the app surface whose manifest accepts the page/copy artifact without another strategy pass.',
    publisherHandoff: Object.freeze({
      surface: 'publisher',
      contentType: 'landing_page',
      artifactType: 'landing_page',
      artifactTypes: Object.freeze(['landing_page', 'site_publish_packet', 'approval_request']),
      itemType: 'landing_page',
      actionType: 'site_publish_packet',
      channel: 'owned_site',
      connector: 'publisher',
      connectorCapability: 'site_publish_packet'
    })
  },
  growth: {
    action: 'Run the first 7-day acquisition experiment.',
    requiredInput: 'Chosen lane, destination URL, approved copy, available channels, signup events.',
    deliverable: 'Day-by-day action queue, owner, metric, stop rule, next iteration decision.',
    approvalGate: 'Approve the first lane and the one action that will be executed first.',
    doneDefinition: 'One experiment is ready to run with measurable success and stop criteria.'
  },
  list_creator: {
    action: 'Create a reviewable lead or target list for the chosen acquisition lane.',
    requiredInput: 'ICP, geography or segment, allowed public sources, exclusion rules, target count, conversion goal, and downstream specialist.',
    deliverable: 'Reviewable rows with source URL, observed signal, fit reason, contact path when public, personalization seed, and exclusion note.',
    approvalGate: 'Approve source rules and reviewed rows before import, outreach, DM, or email execution.',
    doneDefinition: 'Rows can be reviewed one by one and passed to cold_email, email_ops, directory_submission, or manual operations without guessing.'
  },
  writing: {
    action: 'Produce publishable conversion copy for the selected channel or destination.',
    requiredInput: 'Audience, channel, offer, proof, objection, CTA, approved claims, destination URL, and research handoff.',
    deliverable: 'Message hierarchy, exact copy variants, recommended final version, CTA, placement notes, and revision test.',
    approvalGate: 'Approve exact claims, proof, CTA, and surface before handing to the manifest-matched SaaS app surface.',
    doneDefinition: 'Copy can be pasted into the selected surface or passed to the app surface whose manifest accepts the copy artifact without another strategy pass.',
    publisherHandoff: Object.freeze({
      surface: 'publisher',
      contentType: 'social_copy_packet',
      artifactType: 'social_copy_packet',
      artifactTypes: Object.freeze(['social_copy_packet', 'social_post', 'approval_request']),
      itemType: 'social_post',
      actionType: 'social_post',
      channel: 'social',
      connector: 'manual',
      connectorCapability: 'manual.copy'
    })
  },
  writer: {
    action: 'Produce publishable conversion copy for the selected channel or destination.',
    requiredInput: 'Audience, channel, offer, proof, objection, CTA, approved claims, destination URL, and research handoff.',
    deliverable: 'Message hierarchy, exact copy variants, recommended final version, CTA, placement notes, and revision test.',
    approvalGate: 'Approve exact claims, proof, CTA, and surface before handing to the manifest-matched SaaS app surface.',
    doneDefinition: 'Copy can be pasted into the selected surface or passed to the app surface whose manifest accepts the copy artifact without another strategy pass.',
    publisherHandoff: Object.freeze({
      surface: 'publisher',
      contentType: 'social_copy_packet',
      artifactType: 'social_copy_packet',
      artifactTypes: Object.freeze(['social_copy_packet', 'social_post', 'site_publish_packet', 'approval_request']),
      itemType: 'social_post',
      actionType: 'social_post',
      channel: 'social',
      connector: 'manual',
      connectorCapability: 'manual.copy'
    })
  },
  x_post: {
    action: 'Prepare or publish one X post after approval.',
    requiredInput: 'Approved destination URL, UTM, account/connector status, post angle, link policy.',
    deliverable: 'Exact post text, reply hooks, UTM URL, approval owner, publish/manual handoff status.',
    approvalGate: 'OAuth-connected X account handle, exact post text, destination, and stop rule must be shown and approved before posting.',
    doneDefinition: 'Post is either published with URL/proof, or returned as a manual posting packet.',
    publisherHandoff: Object.freeze({
      surface: 'publisher',
      contentType: 'x_post_packet',
      artifactType: 'x_post_packet',
      artifactTypes: Object.freeze(['x_post_packet', 'x_post', 'approval_request']),
      itemType: 'x_post',
      actionType: 'x_post',
      channel: 'x',
      connector: 'x',
      connectorCapability: 'x.post'
    })
  },
  instagram: {
    action: 'Prepare Instagram-native launch assets and a publish packet after approval.',
    requiredInput: 'Approved destination URL, visual asset or public media URL, account/connector status, format, caption angle, proof, and schedule preference.',
    deliverable: 'Visual hook, carousel/reel/story outline, caption, hashtags, CTA, media requirements, approval checklist, and connector/manual publish packet.',
    approvalGate: 'Instagram account, media asset, exact caption, destination, and schedule must be approved before publishing.',
    doneDefinition: 'Instagram work is either published with proof, or returned as a manual posting packet with all required fields.',
    publisherHandoff: Object.freeze({
      surface: 'publisher',
      contentType: 'instagram_post_packet',
      artifactType: 'instagram_post_packet',
      artifactTypes: Object.freeze(['instagram_post_packet', 'instagram_post', 'social_copy_packet', 'approval_request']),
      itemType: 'instagram_post',
      actionType: 'instagram_post',
      channel: 'instagram',
      connector: 'instagram',
      connectorCapability: 'instagram.post'
    })
  },
  reddit: {
    action: 'Prepare one discussion-first Reddit draft for the manifest-matched SaaS app or manual copy/paste surface.',
    requiredInput: 'Subreddit candidate, community rule check, discussion angle, link policy.',
    deliverable: 'Title, body, comment-link plan, moderation risk, copy/paste guidance, tracking URL, stop rule.',
    approvalGate: 'Subreddit, rules, and exact text must be approved in the manifest-matched SaaS app surface or manually before the user submits it.',
    doneDefinition: 'A reviewable Reddit draft packet exists; no direct Reddit submission is claimed.',
    publisherHandoff: Object.freeze({
      surface: 'publisher',
      contentType: 'reddit_post_packet',
      artifactType: 'reddit_post_packet',
      artifactTypes: Object.freeze(['reddit_post_packet', 'reddit_post', 'approval_request']),
      itemType: 'reddit_post',
      actionType: 'reddit_post',
      channel: 'reddit',
      connector: 'reddit',
      connectorCapability: 'reddit.post'
    })
  },
  indie_hackers: {
    action: 'Prepare one build-in-public Indie Hackers draft for the manifest-matched SaaS app or manual copy/paste surface.',
    requiredInput: 'Learning angle, destination URL, CTA style, approved claims.',
    deliverable: 'Title, post body, CTA, follow-up replies, copy/paste guidance, measurement plan.',
    approvalGate: 'Exact post and destination must be approved in the manifest-matched SaaS app surface or manually before the user publishes it.',
    doneDefinition: 'A reviewable Indie Hackers draft packet exists; no direct Indie Hackers publishing is claimed.',
    publisherHandoff: Object.freeze({
      surface: 'publisher',
      contentType: 'indie_hackers_packet',
      artifactType: 'indie_hackers_packet',
      artifactTypes: Object.freeze(['indie_hackers_packet', 'indie_hackers_post', 'approval_request']),
      itemType: 'indie_hackers_post',
      actionType: 'indie_hackers_post',
      channel: 'indie_hackers',
      connector: 'indie_hackers',
      connectorCapability: 'indie_hackers.post'
    })
  },
  directory_submission: {
    action: 'Create a prioritized directory submission queue.',
    requiredInput: 'Product URL, category, screenshots, approved claims, pricing, terms/privacy URLs.',
    deliverable: 'Directory shortlist, per-site field map, reusable listing copy, UTM map, status tracker.',
    approvalGate: 'Each site and listing text must be approved before submission.',
    doneDefinition: 'Each target is marked submitted/live/blocked with URL or blocker reason.',
    publisherHandoff: Object.freeze({
      surface: 'publisher',
      contentType: 'directory_packet',
      artifactType: 'directory_packet',
      artifactTypes: Object.freeze(['directory_packet', 'directory_submission', 'approval_request']),
      itemType: 'directory_submission',
      actionType: 'directory_submission',
      channel: 'directory',
      connector: 'directory_app',
      connectorCapability: 'directory.submit'
    })
  },
  citation_ops: {
    action: 'Prepare local SEO citation and GBP-ready listing work.',
    requiredInput: 'Canonical business name, address, phone, website, categories, service area, hours, description, and local proof.',
    deliverable: 'Canonical NAP/profile record, citation priority queue, inconsistency fixes, GBP field brief, review request flow, and manual submission checklist.',
    approvalGate: 'Canonical business facts and each external listing target must be approved before citation submission or profile edits.',
    doneDefinition: 'Citation work is either submitted with listing URLs/proof, or returned as a manual citation queue with blocker reasons.'
  },
  acquisition_automation: {
    action: 'Design the first acquisition automation flow.',
    requiredInput: 'Approved source, trigger, CRM/list destination, consent constraints, conversion event.',
    deliverable: 'Trigger, state machine, first message, approval gates, connector payloads, pause conditions.',
    approvalGate: 'Connector write actions, rate limits, and message copy must be approved.',
    doneDefinition: 'Flow is runnable as connector payloads or a manual operations checklist.'
  },
  email_ops: {
    action: 'Prepare a permissioned lifecycle email.',
    requiredInput: 'Audience segment, consent source, sender account, offer, unsubscribe/stop rule.',
    deliverable: 'Subject, body, segment rule, send conditions, tracking, approval owner.',
    approvalGate: 'Sender, recipient segment, and exact copy must be approved before send.',
    doneDefinition: 'Email is either sent with proof or returned as an approval-ready draft.'
  },
  cold_email: {
    action: 'Prepare compliant outbound only when source and approval exist.',
    requiredInput: 'Lead source, ICP filter, sender/domain readiness, lawful basis, opt-out handling.',
    deliverable: 'Qualification rules, sequence copy, review queue, send cap, stop conditions.',
    approvalGate: 'Lead source, sender, copy, and compliance constraints must be approved.',
    doneDefinition: 'Outbound is blocked if any compliance/source requirement is missing.'
  }
});

export const CMO_LEADER_CONTROL_SPECIALIZATION = Object.freeze({
  selectionRubric: Object.freeze([
    'ICP and signup goal fit',
    'competitor/channel evidence needed',
    'funnel bottleneck and proof gaps',
    'free/organic channel constraints',
    'SaaS app readiness for publish handoff'
  ]),
  synthesisOutputs: Object.freeze([
    'ICP and positioning decision',
    'channel and next-best alternative decision',
    'specialist dispatch packets',
    'leader approval queue',
    'Manifest-matched SaaS app handoff packet'
  ])
});

function normalizedCmoTask(value = '') {
  return String(value || '').trim().toLowerCase();
}

function cmoAliasToken(value = '') {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function normalizeCmoLeaderAlias(taskType = '') {
  const token = cmoAliasToken(taskType);
  if ([
    'launch_team_leader',
    'launch_team',
    'agent_team_launch',
    'free_web_growth_leader',
    'free_web_growth',
    'organic_growth',
    'free_marketing',
    'agent_team_leader',
    'agent_team',
    'team_leader',
    'cait_growth_team',
    'cait_cmo_leader',
    'cait_marketing_team',
    'cait_growth',
    'growth_team',
    'marketing_team',
    'organic_acquisition',
    'marketing_leader'
  ].includes(token)) return 'cmo_leader';
  return '';
}

export function cmoLeaderTaskTypeForText(text = '') {
  return CMO_LEADER_INTENT_PATTERN.test(String(text || '')) ? 'cmo_leader' : '';
}

export function cmoFollowupSpecialistTaskForText(text = '') {
  const safe = String(text || '').trim();
  if (!safe) return '';
  if (/(seo|自然検索|検索流入|検索意図|検索順位|サチコ|search console|\bgsc\b|keyword|キーワード|serp|h1|h2|meta description|メタディスクリプション|コンテンツseo|記事|article)/i.test(safe)) return 'seo_specialist';
  if (/(landing\s*page|\blp\b|ランディング|LP|hero|ヒーロー|cta|ページ|page|コピー|copy|ファーストビュー|conversion|cvr|登録導線|トライアル導線)/i.test(safe)) return 'landing';
  if (/(集客|リード|登録|トライアル|signup|trial|acquisition|growth|問い合わせ|lead)/i.test(safe)) return 'growth';
  return '';
}

export function isFreeWebGrowthIntent(taskType = '', prompt = '') {
  const explicit = normalizedCmoTask(taskType);
  if (['free_web_growth_leader', 'free_web_growth', 'organic_growth', 'free_marketing'].includes(explicit)) return true;
  return CMO_FREE_WEB_GROWTH_PATTERN.test(String(prompt || ''));
}

export function isAgentTeamLaunchIntent(taskType = '', prompt = '') {
  const explicit = normalizedCmoTask(taskType);
  if (explicit === 'agent_team_launch') return true;
  return CMO_AGENT_TEAM_LAUNCH_PATTERN.test(String(prompt || ''));
}

export function isLargeAgentTeamIntent(taskType = '', prompt = '') {
  return isFreeWebGrowthIntent(taskType, prompt) || isAgentTeamLaunchIntent(taskType, prompt);
}

export function cmoExternalActionRequestedFromText(text = '') {
  return CMO_EXTERNAL_ACTION_REQUEST_PATTERN.test(String(text || ''));
}

export function isCmoExternalExecutionIntent(taskType = '', prompt = '') {
  const explicit = normalizedCmoTask(taskType);
  const text = String(prompt || '').trim();
  if (CMO_WORKFLOW_ACTION_LAYER_TASKS.includes(explicit)) return true;
  return cmoExternalActionRequestedFromText(text);
}

export function cmoExplicitActionChannelRequested(prompt = '') {
  return CMO_EXPLICIT_ACTION_CHANNEL_PATTERN.test(String(prompt || '').trim());
}

export function cmoSourceLayerPreferencesFromText(text = '') {
  const safe = String(text || '').trim();
  const tasks = [];
  const push = (task) => {
    if (task && !tasks.includes(task)) tasks.push(task);
  };
  const noDataSignal = /(?:ga4|gsc|search console|google analytics|analytics|crm|csv|data|metrics|データ|アクセス解析|計測|指標|サチコ|search console)[^\n。.!?]{0,40}(?:なし|ない|未接続|未導入|使えない|無し|no data|none|not connected|unavailable)|(?:なし|ない|未接続|未導入|no data|none|not connected|unavailable)[^\n。.!?]{0,40}(?:ga4|gsc|search console|google analytics|analytics|crm|csv|data|metrics|データ|アクセス解析|計測|指標|サチコ|search console)/i.test(safe);
  if (!noDataSignal && /(ga4|gsc|search console|google analytics|analytics|kpi|dashboard|cohort|funnel analysis|funnel|metrics|アクセス解析|データ分析|計測|指標|登録率|cv率|サチコ)/i.test(safe)) push('data_analysis');
  push(/(competitor|teardown|benchmark|positioning|vs\.?|競合|比較|ベンチマーク|ポジショニング)/i.test(safe) ? 'teardown' : 'research');
  return tasks;
}

export function cmoBroadMultiActionIntentFromText(text = '') {
  return /(as much as possible|multiple actions?|all possible|all channels|cross[-\s]?channel|do as many|できる限り|可能な限り|複数アクション|複数.*実行|最大限|全部|まとめて|実行フェイズ|できるだけ.*(?:実行|アクション)|複数.*(?:媒体|チャネル|施策))/i.test(String(text || ''));
}

export function cmoParallelSameLayerIntentFromText(text = '') {
  const source = String(text || '').trim();
  return cmoBroadMultiActionIntentFromText(source)
    || /(parallel|same[-\s]?layer|fan[-\s]?out|同列|同時|並列|複数.*(?:エージェント|調査|分析|検証|プラン|施策|案|候補|チャネル)|深さ|品質優先|品質重視|徹底|網羅)/i.test(source);
}

export function cmoPlanOnlyIntentFromText(text = '') {
  const source = String(text || '');
  if (/(plan only|planning only|strategy only|no execution|do not execute|do not post|proposal only|計画のみ|計画だけ|提案のみ|提案だけ|実行しない|投稿しない|配信しない|掲載しない)/i.test(source)) return true;
  const asksPlan = /(make|create|build|draft|作って|作成|欲しい|ほしい).{0,30}(plan|strategy|プラン|計画|戦略|媒体プラン)|(?:plan|strategy|プラン|計画|戦略|媒体プラン).{0,30}(make|create|build|draft|作って|作成|欲しい|ほしい)/i.test(source);
  const asksExecution = CMO_ACTION_EXECUTION_PATTERN.test(source);
  return Boolean(asksPlan && !asksExecution);
}

export function cmoMediaPlanningPreferredFromText(text = '') {
  return /(priority channels?|preferred channels?|channel mix|media mix|referral sites?|directories?|directory listing|sns|social media|social\b|community|communities|媒体|チャネル|優先チャネル|優先媒体|紹介サイト|外部掲載|掲載先|SNS|ソーシャル|コミュニティ)/i.test(String(text || ''));
}

export function cmoChannelPreferenceActionTasksFromText(taskType = '', text = '') {
  const task = normalizedCmoTask(taskType);
  if (!['cmo_leader', 'free_web_growth_leader', 'agent_team_launch'].includes(task)) return [];
  const source = String(text || '').trim();
  if (!source || cmoPlanOnlyIntentFromText(source)) return [];
  const wantsAction = cmoBroadMultiActionIntentFromText(source) || CMO_ACTION_EXECUTION_PATTERN.test(source);
  if (!wantsAction) return [];
  const actions = [];
  const push = (name) => {
    if (name && !actions.includes(name)) actions.push(name);
  };
  if (/(referral sites?|directories?|directory listing|listing sites?|掲載先|紹介サイト|外部掲載|媒体掲載|ディレクトリ)/i.test(source)) {
    push('seo_specialist');
    push('writing');
  }
  if (/(sns|social media|social\b|community|communities|x\/twitter|twitter\/x|SNS|ソーシャル|コミュニティ)/i.test(source)) {
    push('writing');
    if (/(community|communities|reddit|indie\s*hackers|indiehackers|コミュニティ|レディット|インディーハッカー|インディーハッカーズ)/i.test(source)) {
      push('reddit');
      push('indie_hackers');
    }
  }
  return actions;
}

export function cmoPlannerCandidateActionTasksFromText(taskType = '', text = '') {
  const task = normalizedCmoTask(taskType);
  if (!['cmo_leader', 'free_web_growth_leader', 'agent_team_launch'].includes(task)) return [];
  const source = String(text || '').trim();
  if (!source || cmoExplicitActionChannelRequested(source)) return [];
  const shouldSuggestFromPlanner = cmoExternalActionRequestedFromText(source)
    || cmoBroadMultiActionIntentFromText(source)
    || (cmoParallelSameLayerIntentFromText(source) && cmoMediaPlanningPreferredFromText(source));
  if (!shouldSuggestFromPlanner) return [];
  const actions = [];
  const push = (name) => {
    if (name && !actions.includes(name)) actions.push(name);
  };
  push('landing');
  push('writing');
  if (cmoBroadMultiActionIntentFromText(source) || isAgentTeamLaunchIntent(task, source) || cmoMediaPlanningPreferredFromText(source)) {
    push('seo_specialist');
    push('reddit');
    push('indie_hackers');
  }
  return actions;
}

export function cmoPreparationTasksForActions(actions = [], text = '') {
  const selected = [];
  const push = (task) => {
    const safe = normalizedCmoTask(task);
    if (safe && !selected.includes(safe)) selected.push(safe);
  };
  const actionSet = new Set((Array.isArray(actions) ? actions : []).map(normalizedCmoTask).filter(Boolean));
  for (const task of ['writing', 'writer', 'seo_specialist', 'landing', 'list_creator', 'reddit', 'indie_hackers']) {
    if (actionSet.has(task)) push(task);
  }
  if (['x_post', 'instagram', 'reddit', 'indie_hackers', 'email_ops', 'directory_submission'].some((task) => actionSet.has(task))) push('writing');
  if (actionSet.has('cold_email')) {
    push('list_creator');
    push('writing');
  }
  if (actionSet.has('directory_submission') || actionSet.has('citation_ops') || /(seo|自然検索|search|サチコ|search console)/i.test(text)) push('seo_specialist');
  if (actionSet.has('acquisition_automation')) push('landing');
  return selected;
}

export function cmoNormalizeWorkflowPlannedTasks(context = {}) {
  const helpers = context.helpers && typeof context.helpers === 'object' ? context.helpers : {};
  const normalizeTaskTypes = typeof helpers.normalizeTaskTypes === 'function'
    ? helpers.normalizeTaskTypes
    : (items) => (Array.isArray(items) ? items : []).map(normalizedCmoTask).filter(Boolean);
  const tasks = normalizeTaskTypes(context.plannedTasks || []);
  const primary = normalizedCmoTask(tasks[0] || context.primaryTask || '');
  if (!['cmo_leader', 'free_web_growth_leader'].includes(primary)) return tasks;
  const text = String(context.prompt || '');
  const allowed = new Set([
    primary,
    'cmo_leader',
    'free_web_growth_leader',
    ...CMO_WORKFLOW_SPECIALIST_TASKS
  ]);
  const mapped = [];
  const push = (task) => {
    const safe = normalizedCmoTask(task);
    if (!safe || safe === 'summary' || !allowed.has(safe) || mapped.includes(safe)) return;
    mapped.push(safe);
  };
  const pushMapped = (task) => {
    const safe = normalizedCmoTask(task);
    if (!safe || safe === 'summary') return;
    if (safe === 'free_web_growth_leader') {
      push(primary);
      return;
    }
    if (['x_post', 'instagram', 'email_ops'].includes(safe)) {
      push('writing');
      return;
    }
    if (safe === 'cold_email') {
      push('list_creator');
      push('writing');
      return;
    }
    if (['directory_submission', 'citation_ops'].includes(safe)) {
      push('seo_specialist');
      push('writing');
      return;
    }
    if (safe === 'acquisition_automation') {
      push('landing');
      return;
    }
    push(safe);
  };
  push(primary);
  for (const task of tasks) pushMapped(task);
  if (/(x\.com|twitter|tweet|x投稿|instagram|インスタ|email|メール|投稿|post)/i.test(text)) push('writing');
  if (/(directory|listing|citation|掲載|ディレクトリ|サイテーション)/i.test(text)) push('seo_specialist');
  if (/(automation|自動化|signup|signups|登録|trial|トライアル|lp|landing|ランディング)/i.test(text)) push('landing');
  return mapped;
}

export function defaultCmoActionTaskFromText(text = '') {
  const safe = String(text || '').trim();
  if (/(acquisition automation|獲得自動化|集客自動化|自動化|automation)/i.test(safe)) return 'landing';
  if (/(cold\s*email|outbound|sales email|営業メール|アウトバウンド|新規開拓|リード獲得)/i.test(safe)) return 'writing';
  if (/(email|mail|メール|メルマガ|newsletter|ニュースレター)/i.test(safe)) return 'writing';
  if (/(instagram|インスタ|ig)/i.test(safe)) return 'writing';
  if (/(reddit|subreddit|レディット)/i.test(safe)) return 'reddit';
  if (/(indie\s*hackers|indiehackers|インディーハッカー|インディーハッカーズ)/i.test(safe)) return 'indie_hackers';
  if (/(community|コミュニティ)/i.test(safe)) return 'reddit';
  if (/(x\.com|(?:^|[^a-z0-9])x(?:\s+post|\s+posts|\s+thread)?(?=$|[^a-z0-9])|twitter|tweet|x投稿|ツイッター)/i.test(safe)) return 'writing';
  if (/(directory|listing|citation|掲載媒体|媒体掲載|ディレクトリ|サイテーション)/i.test(safe)) return 'seo_specialist';
  return '';
}

export function cmoActionIntentSignalsFromText(text = '') {
  const source = String(text || '').trim();
  return {
    socialExecutionIntent: /(x\.com|(?:^|[^a-z0-9])x(?:\s+post|\s+posts|\s+thread)?(?=$|[^a-z0-9])|twitter|tweet|tweets|social post|sns投稿|ソーシャル投稿|ツイート|x投稿|ポスト|スレッド|投稿|発信)/i.test(source),
    xExecutionIntent: /(x\.com|(?:^|[^a-z0-9])x(?:\s+post|\s+posts|\s+thread)?(?=$|[^a-z0-9])|twitter|tweet|tweets|ツイート|x投稿|ポスト|スレッド)/i.test(source),
    instagramExecutionIntent: /(instagram|insta|ig\b|インスタ|インスタグラム|reel|carousel|story|ストーリー|リール|カルーセル)/i.test(source),
    emailExecutionIntent: /(email ops|email campaign|newsletter|gmail|mailbox|send email|cold email|outbound email|メール|メアド|gmail|配信|送信|コールドメール|営業メール|メール配信|メルマガ)/i.test(source),
    redditExecutionIntent: /(reddit|subreddit|レディット)/i.test(source),
    indieHackersExecutionIntent: /(indie hackers|indiehackers|インディーハッカー|インディーハッカーズ)/i.test(source),
    communityExecutionIntent: /(reddit|indie hackers|indiehackers|product hunt|community|subreddit|レディット|インディーハッカー|インディーハッカーズ|プロダクトハント|コミュニティ)/i.test(source),
    directoryExecutionIntent: /(directory submission|directory listing|launch director(?:y|ies)|startup director(?:y|ies)|ai tool director(?:y|ies)|media listing|free listing|掲載媒体|媒体掲載|無料掲載|掲載先|ディレクトリ掲載|AIツール.*掲載|一気に掲載|まとめて掲載)/i.test(source),
    citationExecutionIntent: /(gbp|google business profile|googleビジネスプロフィール|サイテーション|citation|meo|ローカルseo)/i.test(source),
    listCreatorIntent: /(list creator|lead sourcing|lead qualification|prospect sourcing|company list builder|prospect research|build.*lead list|build.*prospect list|reviewable lead|見込み客リスト作成|リードリスト作成|営業先リスト|企業リスト作成|送る会社リスト|会社リスト作成|営業リスト作成|公開情報.*リスト|公開情報.*見込み客|公開情報.*営業先)/i.test(source),
    explicitColdEmailIntent: /(cold email|cold outbound|outbound email|sales email|prospecting email|メール営業|コールドメール|アウトバウンドメール|営業メール|送信元メール|送信元アドレス|cold outreach|outbound sequence|営業文面|営業メール文面)/i.test(source),
    acquisitionAutomationIntent: /(acquisition automation|獲得自動化|集客自動化)/i.test(source)
  };
}

export function cmoRequestedActionTasksFromText(text = '') {
  const signals = cmoActionIntentSignalsFromText(text);
  const tasks = [];
  const push = (task) => {
    if (task && !tasks.includes(task)) tasks.push(task);
  };
  if (signals.xExecutionIntent) push('writing');
  if (signals.instagramExecutionIntent) push('writing');
  if (signals.redditExecutionIntent) push('reddit');
  if (signals.indieHackersExecutionIntent) push('indie_hackers');
  if (signals.communityExecutionIntent && !signals.redditExecutionIntent && !signals.indieHackersExecutionIntent) {
    push('reddit');
    push('indie_hackers');
  }
  if (signals.directoryExecutionIntent) push('seo_specialist');
  if (signals.citationExecutionIntent) push('seo_specialist');
  if (signals.acquisitionAutomationIntent) push('landing');
  if (signals.emailExecutionIntent) push('writing');
  if (signals.explicitColdEmailIntent) {
    push('list_creator');
    push('writing');
  }
  return tasks;
}

export function cmoWorkflowReplanDecisionText(text = '') {
  const source = String(text || '').trim();
  if (!source) return '';
  const patterns = [
    /\|\s*Primary lane\s*\|\s*([^|\n]+)\|/i,
    /\|\s*1\s*\|\s*([^|\n]+)\|\s*execute_now/i,
    /(?:Execution\/action lane|Execution lane|実行\/施策化レーン|実行レーン)\s*[:：]\s*([^\n]+)/i,
    /(?:first execution lane is|first execution lane|first lane|chosen lane|selected lane)\s+(?:is\s+)?\*\*([^*\n]+)\*\*/i,
    /(?:first lane|chosen lane|selected lane|優先レーン|選択レーン)\s*[:：]\s*([^\n]+)/i,
    /優先実行レーンは\s*\*\*([^*\n]+)\*\*/i
  ];
  for (const pattern of patterns) {
    const match = source.match(pattern);
    const value = String(match?.[1] || '').trim();
    if (value) return value.slice(0, 800);
  }
  return '';
}

export function cmoWorkflowTaskSignalScore(task = '', text = '') {
  const safeTask = normalizedCmoTask(task);
  const source = String(text || '').trim();
  if (!safeTask || !source) return 0;
  const signalPatterns = {
    seo_specialist: [/seo|serp|organic|search intent|owned\/search|検索|自然検索|検索流入|メタ|meta title|h1|内部リンク|比較lp|比較ページ/i],
    landing: [/landing page|\blp\b|destination page|hero|cta|signup page|trial page|登録導線|受け皿|ランディング/i],
    writing: [/copy|message|post draft|social draft|listing copy|ad copy|creative|投稿案|投稿ドラフト|本文|コピー|訴求/i],
    list_creator: [/lead rows|prospect list|target list|company list|リードリスト|企業リスト|見込み客/i],
    x_post: [/\bx\/twitter\b|twitter|tweet|x post|x投稿|ツイート|ポスト/i],
    instagram: [/instagram|insta|ig\b|インスタ|リール|ストーリー/i],
    reddit: [/reddit|subreddit|レディット/i],
    indie_hackers: [/indie\s*hackers|indiehackers|インディーハッカー/i],
    directory_submission: [/directory|listing|product hunt|alternativeto|掲載|ディレクトリ|紹介サイト/i],
    citation_ops: [/gbp|google business profile|citation|local seo|サイテーション|meo|ローカルseo/i],
    email_ops: [/email|newsletter|gmail|メール|メルマガ|配信/i],
    cold_email: [/cold email|outbound|sales email|営業メール|アウトバウンド/i],
    acquisition_automation: [/automation|workflow|state machine|自動化|獲得自動化|集客自動化/i],
    growth: [/growth experiment|7-day|experiment|検証|実験|スプリント/i]
  };
  const patterns = signalPatterns[safeTask] || [];
  return patterns.reduce((score, pattern) => score + (pattern.test(source) ? 1 : 0), 0);
}

export function cmoWorkflowReplanDecision(candidateTasks = [], sourceText = '', layer = 1, actionLayerStart = 5) {
  const candidates = [...new Set((Array.isArray(candidateTasks) ? candidateTasks : []).map(normalizedCmoTask).filter(Boolean))];
  if (candidates.length <= 1) return null;
  const decisionText = cmoWorkflowReplanDecisionText(sourceText);
  const scoredText = decisionText || String(sourceText || '').trim();
  if (!scoredText) return null;
  const actionSignals = CMO_WORKFLOW_ACTION_LAYER_TASKS
    .filter((task) => cmoWorkflowTaskSignalScore(task, scoredText) > 0);
  const requiredPreparation = Number(layer || 1) < Number(actionLayerStart || 5)
    ? cmoPreparationTasksForActions(actionSignals, scoredText)
    : [];
  const scores = candidates
    .map((task) => {
      const directScore = cmoWorkflowTaskSignalScore(task, scoredText) * 3;
      const sourceScore = decisionText ? cmoWorkflowTaskSignalScore(task, sourceText) : 0;
      const prepScore = requiredPreparation.includes(task) ? 4 : 0;
      return { task, score: directScore + sourceScore + prepScore };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || candidates.indexOf(left.task) - candidates.indexOf(right.task));
  if (!scores.length) return null;
  const maxSelected = Number(layer || 1) >= Number(actionLayerStart || 5) ? 3 : 2;
  const selectedTasks = scores.slice(0, maxSelected).map((item) => item.task);
  if (!selectedTasks.length || selectedTasks.length >= candidates.length) return null;
  return {
    selectedTasks,
    candidateTasks: candidates,
    decisionText: decisionText || scoredText.slice(0, 600),
    reason: decisionText
      ? `leader checkpoint selected next layer from media/planning decision: ${decisionText.slice(0, 220)}`
      : 'leader checkpoint selected next layer from accumulated specialist signals'
  };
}

export function cmoSequentialUserActionPriority(task = '', sourceText = '', selectedTasks = []) {
  const safeTask = normalizedCmoTask(task);
  const selectedSet = selectedTasks instanceof Set
    ? selectedTasks
    : new Set((Array.isArray(selectedTasks) ? selectedTasks : []).map(normalizedCmoTask).filter(Boolean));
  const defaultActionTask = defaultCmoActionTaskFromText(sourceText);
  return (selectedSet.has(safeTask) ? 10 : 0)
    + (defaultActionTask === safeTask ? 8 : 0)
    + (cmoWorkflowTaskSignalScore(safeTask, sourceText) * 4);
}

export function cmoInferTaskSequence(context = {}) {
  const prioritized = Array.isArray(context.prioritized) ? context.prioritized : [];
  const ranked = Array.isArray(context.ranked) ? context.ranked : [];
  const primary = normalizedCmoTask(prioritized[0]);
  if (!['cmo_leader', 'agent_team_launch'].includes(primary)) return null;
  const taskType = context.taskType || '';
  const prompt = context.prompt || '';
  const text = String(context.text || prompt || '').toLowerCase();
  const maxTasks = Math.max(1, Number(context.maxTasks || 10) || 10);
  const taskDependencyOrdered = typeof context.taskDependencyOrdered === 'function'
    ? context.taskDependencyOrdered
    : (items) => [...new Set((Array.isArray(items) ? items : []).map(normalizedCmoTask).filter(Boolean))];
  const leaderTaskLayer = typeof context.leaderTaskLayer === 'function'
    ? context.leaderTaskLayer
    : () => null;
  const signals = cmoActionIntentSignalsFromText(text);

  if (primary === 'agent_team_launch') {
    const expandedTeam = [];
    const preferredSpecialists = ranked.filter((name) => {
      const safe = normalizedCmoTask(name);
      if (!safe || safe.endsWith('_leader')) return false;
      return CMO_AGENT_TEAM_LAUNCH_TASKS.includes(safe);
    });
    const pushUniqueExpanded = (name) => {
      const safe = normalizedCmoTask(name);
      if (!safe || expandedTeam.includes(safe)) return;
      expandedTeam.push(safe);
    };
    pushUniqueExpanded(primary);
    for (const name of preferredSpecialists) pushUniqueExpanded(name);
    for (const name of CMO_AGENT_TEAM_LAUNCH_TASKS) pushUniqueExpanded(name);
    for (const name of prioritized) {
      if (name !== 'agent_team_launch') pushUniqueExpanded(name);
    }
    return expandedTeam.slice(0, maxTasks);
  }

  const expandedTeam = [];
  const explicitSpecialists = ranked.filter((name) => {
    const safe = normalizedCmoTask(name);
    if (!safe || safe === 'cmo_leader' || safe.endsWith('_leader')) return false;
    return CMO_WORKFLOW_SPECIALIST_TASKS.includes(safe);
  });
  const pushUniqueExpanded = (name) => {
    const safe = normalizedCmoTask(name);
    if (!safe || expandedTeam.includes(safe)) return;
    expandedTeam.push(safe);
  };
  ['cmo_leader', ...cmoSourceLayerPreferencesFromText(text)].forEach(pushUniqueExpanded);
  if (cmoParallelSameLayerIntentFromText(text)) {
    CMO_WORKFLOW_RESEARCH_LAYER_TASKS.forEach(pushUniqueExpanded);
  }
  if (cmoMediaPlanningPreferredFromText(text)) pushUniqueExpanded('media_planner');
  if (explicitSpecialists.includes('cold_email') && !explicitSpecialists.includes('list_creator')) {
    pushUniqueExpanded('list_creator');
  }
  for (const name of explicitSpecialists) pushUniqueExpanded(name);
  [
    ...CMO_WORKFLOW_PLANNING_LAYER_TASKS,
    ...CMO_WORKFLOW_PREPARATION_LAYER_TASKS,
    ...CMO_WORKFLOW_DEFAULT_EXECUTION_TASKS
  ].forEach(pushUniqueExpanded);
  if (isCmoExternalExecutionIntent(taskType, prompt) || isAgentTeamLaunchIntent(taskType, prompt)) {
    ['growth', 'seo_specialist', 'landing', 'writing'].forEach(pushUniqueExpanded);
    if (signals.directoryExecutionIntent || signals.citationExecutionIntent) pushUniqueExpanded('seo_specialist');
    if (signals.xExecutionIntent || signals.instagramExecutionIntent) pushUniqueExpanded('writing');
    if (signals.emailExecutionIntent) {
      pushUniqueExpanded('writing');
      if (signals.explicitColdEmailIntent) {
        pushUniqueExpanded('list_creator');
      }
    }
    if (signals.communityExecutionIntent || isAgentTeamLaunchIntent(taskType, prompt)) {
      pushUniqueExpanded('writing');
    }
  }
  if (signals.explicitColdEmailIntent) {
    pushUniqueExpanded('list_creator');
    pushUniqueExpanded('writing');
  }
  if (prioritized.includes('summary')) pushUniqueExpanded('summary');

  const requestedExecutors = [];
  const pushRequestedExecutor = (name) => {
    const safe = normalizedCmoTask(name);
    if (safe && !requestedExecutors.includes(safe)) requestedExecutors.push(safe);
  };
  if (signals.xExecutionIntent) pushRequestedExecutor('writing');
  if (signals.instagramExecutionIntent) pushRequestedExecutor('writing');
  if (signals.redditExecutionIntent) pushRequestedExecutor('writing');
  if (signals.indieHackersExecutionIntent) pushRequestedExecutor('writing');
  if (signals.emailExecutionIntent) pushRequestedExecutor('writing');
  if (signals.explicitColdEmailIntent) pushRequestedExecutor('list_creator');
  if (signals.explicitColdEmailIntent || expandedTeam.includes('cold_email')) pushRequestedExecutor('writing');
  if (signals.directoryExecutionIntent) pushRequestedExecutor('seo_specialist');
  if (signals.citationExecutionIntent) pushRequestedExecutor('seo_specialist');
  if (signals.acquisitionAutomationIntent) pushRequestedExecutor('landing');
  const plannerCandidateExecutors = [
    ...cmoPlannerCandidateActionTasksFromText('cmo_leader', text),
    ...cmoChannelPreferenceActionTasksFromText('cmo_leader', text)
  ].filter((task, index, self) => self.indexOf(task) === index);
  for (const name of plannerCandidateExecutors) {
    pushUniqueExpanded(name);
    pushRequestedExecutor(name);
  }
  const requestedPreparation = cmoPreparationTasksForActions(requestedExecutors, text);
  const preferredPlanningTasks = (signals.directoryExecutionIntent || signals.citationExecutionIntent || plannerCandidateExecutors.length || cmoMediaPlanningPreferredFromText(text))
    ? ['media_planner']
    : ['growth'];

  const finalizeCmoSequence = (orderedTasks, requestedTasks = []) => {
    const dependencyOrdered = taskDependencyOrdered([...orderedTasks, ...requestedTasks]);
    const sourcePreferences = cmoSourceLayerPreferencesFromText(text);
    const layerPrelude = [
      ...dependencyOrdered.filter((task) => [
        'cmo_leader',
        ...CMO_WORKFLOW_DATA_LAYER_TASKS,
        ...CMO_WORKFLOW_RESEARCH_LAYER_TASKS
      ].includes(task)),
      ...preferredPlanningTasks.filter((task) => dependencyOrdered.includes(task))
    ];
    const sourceAndPlanning = layerPrelude.filter((task, index, self) => self.indexOf(task) === index && [
      'cmo_leader',
      ...CMO_WORKFLOW_DATA_LAYER_TASKS,
      ...CMO_WORKFLOW_RESEARCH_LAYER_TASKS,
      ...CMO_WORKFLOW_PLANNING_LAYER_TASKS
    ].includes(task));
    const requestedPrep = dependencyOrdered.filter((task) => requestedPreparation.includes(task) && !sourceAndPlanning.includes(task));
    const requested = dependencyOrdered.filter((task) => requestedTasks.includes(task) && !sourceAndPlanning.includes(task) && !requestedPrep.includes(task));
    const remainder = dependencyOrdered.filter((task) => !sourceAndPlanning.includes(task) && !requestedPrep.includes(task) && !requested.includes(task));
    const full = [...sourceAndPlanning, ...requestedPrep, ...requested, ...remainder];
    const mustKeep = new Set(['cmo_leader', ...requestedTasks, ...requested]);
    if (plannerCandidateExecutors.length) {
      for (const task of sourcePreferences) mustKeep.add(task);
    }
    for (const task of requestedPrep) mustKeep.add(task);
    if (plannerCandidateExecutors.length || cmoMediaPlanningPreferredFromText(text)) mustKeep.add('media_planner');
    if (!plannerCandidateExecutors.length && cmoMediaPlanningPreferredFromText(text)) mustKeep.add('growth');
    if (!plannerCandidateExecutors.length && full.includes('summary') && maxTasks >= 10) mustKeep.add('summary');
    const selected = [];
    const parallelSameLayerRequested = cmoParallelSameLayerIntentFromText(text);
    const layerLimitForCmo = (layer) => {
      if (layer === 1) return 1;
      if (layer === 2) return parallelSameLayerRequested ? CMO_WORKFLOW_RESEARCH_LAYER_TASKS.length : 1;
      if (layer === 3) return parallelSameLayerRequested ? CMO_WORKFLOW_PLANNING_LAYER_TASKS.length : 1;
      if (layer === 4) {
        if (parallelSameLayerRequested) return CMO_WORKFLOW_PREPARATION_LAYER_TASKS.length;
        return requestedPreparation.length
          ? Math.max(1, Math.min(3, requestedPreparation.length || 1))
          : 1;
      }
      return 1;
    };
    const pushSelected = (task) => {
      const safe = normalizedCmoTask(task);
      if (!safe || selected.includes(safe)) return;
      if (safe === 'data_analysis' && !sourcePreferences.includes('data_analysis')) return;
      selected.push(safe);
    };
    for (const task of full) {
      if (mustKeep.has(task)) pushSelected(task);
    }
    for (const layer of [1, 2, 3, 4]) {
      const layerLimit = layerLimitForCmo(layer);
      let layerSelectionCount = selected.filter((task) => leaderTaskLayer('cmo_leader', task) === layer).length;
      for (const task of full) {
        if (selected.length >= maxTasks) break;
        if (leaderTaskLayer('cmo_leader', task) !== layer) continue;
        if (layerSelectionCount >= layerLimit && !mustKeep.has(task)) continue;
        const beforeCount = selected.length;
        pushSelected(task);
        if (selected.length > beforeCount) layerSelectionCount += 1;
      }
    }
    for (const task of full) {
      if (selected.length >= maxTasks) break;
      if (!mustKeep.has(task)) continue;
      pushSelected(task);
    }
    return selected
      .sort((left, right) => {
        const leftLayer = leaderTaskLayer('cmo_leader', left) ?? 99;
        const rightLayer = leaderTaskLayer('cmo_leader', right) ?? 99;
        if (leftLayer !== rightLayer) return leftLayer - rightLayer;
        return full.indexOf(left) - full.indexOf(right);
      })
      .slice(0, maxTasks);
  };

  if (expandedTeam.includes('writing') && expandedTeam.includes('list_creator')) {
    const reordered = expandedTeam.filter((name) => name !== 'list_creator' && name !== 'writing');
    const insertAt = Math.max(reordered.indexOf('landing'), reordered.indexOf('seo_specialist')) + 1;
    const summaryIndex = reordered.indexOf('summary');
    const targetIndex = summaryIndex >= 0
      ? summaryIndex
      : (insertAt > 0 ? insertAt : reordered.length);
    reordered.splice(targetIndex, 0, 'list_creator', 'writing');
    return finalizeCmoSequence(reordered, requestedExecutors);
  }
  return finalizeCmoSequence(expandedTeam, requestedExecutors);
}

export function cmoEnsureLeaderWorkflowActionTasks(context = {}) {
  const helpers = context.helpers && typeof context.helpers === 'object' ? context.helpers : {};
  const normalizeTaskTypes = typeof helpers.normalizeTaskTypes === 'function'
    ? helpers.normalizeTaskTypes
    : (items) => (Array.isArray(items) ? items : []).map(normalizedCmoTask).filter(Boolean);
  const leaderTaskLayer = typeof helpers.leaderTaskLayer === 'function' ? helpers.leaderTaskLayer : () => 1;
  const leaderActionLayerStart = typeof helpers.leaderActionLayerStart === 'function' ? helpers.leaderActionLayerStart : () => 5;
  const leaderSourceCollectionLayerTasks = typeof helpers.leaderSourceCollectionLayerTasks === 'function' ? helpers.leaderSourceCollectionLayerTasks : () => [];
  const leaderTaskRequiresSourceCollection = typeof helpers.leaderTaskRequiresSourceCollection === 'function' ? helpers.leaderTaskRequiresSourceCollection : () => false;
  const tasks = normalizeTaskTypes(context.plannedTasks || []);
  const primary = normalizedCmoTask(tasks[0] || context.primaryTask || '');
  if (!['cmo_leader', 'free_web_growth_leader'].includes(primary)) return null;
  const text = String(context.prompt || '').toLowerCase();
  const options = context.options && typeof context.options === 'object' ? context.options : {};
  const configuredResearchBucketLimit = Number(options.maxExternalResearchTasks || 0);
  const summaryTasks = new Set(['summary']);
  const dataCollectionTasks = new Set(['data_analysis']);
  const ordered = [];
  const push = (task) => {
    const safe = normalizedCmoTask(task);
    if (!safe || summaryTasks.has(safe) || ordered.includes(safe)) return;
    ordered.push(safe);
  };
  const sortLeaderWorkflowTasks = (items, max = items.length) => [...items].sort((left, right) => {
    const leftLayer = leaderTaskLayer(primary, left) ?? 99;
    const rightLayer = leaderTaskLayer(primary, right) ?? 99;
    if (leftLayer !== rightLayer) return leftLayer - rightLayer;
    return ordered.indexOf(left) - ordered.indexOf(right);
  }).slice(0, max);
  const sourceCollectionTasks = leaderSourceCollectionLayerTasks(primary);
  const preferredCmoSourceTasks = cmoSourceLayerPreferencesFromText(text);
  const preferredSourceTask = preferredCmoSourceTasks.find((task) => sourceCollectionTasks.includes(task))
    || sourceCollectionTasks.find((task) => ['research', 'data_analysis', 'validation', 'teardown', 'diligence', 'debug'].includes(task))
    || sourceCollectionTasks[0]
    || 'research';
  push(primary);
  let initialExternalResearchCount = 0;
  for (const task of tasks) {
    if (task === 'free_web_growth_leader') continue;
    if (configuredResearchBucketLimit > 0 && ['research', 'teardown', 'validation'].includes(task)) {
      if (initialExternalResearchCount >= configuredResearchBucketLimit) continue;
      initialExternalResearchCount += 1;
    }
    push(task);
  }
  if (sourceCollectionTasks.length && !ordered.some((task) => leaderTaskRequiresSourceCollection(primary, task))) {
    push(preferredSourceTask);
  }
  CMO_WORKFLOW_DATA_LAYER_TASKS.forEach(push);
  CMO_WORKFLOW_RESEARCH_LAYER_TASKS.forEach(push);
  CMO_WORKFLOW_PLANNING_LAYER_TASKS.forEach(push);
  CMO_WORKFLOW_PREPARATION_LAYER_TASKS.forEach(push);
  CMO_WORKFLOW_DEFAULT_EXECUTION_TASKS.forEach(push);
  CMO_WORKFLOW_ACTION_LAYER_TASKS.forEach(push);

  const requestedExternalExecution = cmoExternalActionRequestedFromText(text);
  const requestedActions = [];
  const pushRequestedAction = (task) => {
    const safe = normalizedCmoTask(task);
    if (!safe || requestedActions.includes(safe)) return;
    requestedActions.push(safe);
    push(safe);
  };
  for (const task of cmoRequestedActionTasksFromText(text)) pushRequestedAction(task);
  const plannerCandidateActions = [
    ...cmoPlannerCandidateActionTasksFromText(primary, text),
    ...cmoChannelPreferenceActionTasksFromText(primary, text)
  ].filter((task, index, self) => self.indexOf(task) === index);
  for (const task of plannerCandidateActions) pushRequestedAction(task);

  const selected = [];
  const pushSelected = (task) => {
    const safe = normalizedCmoTask(task);
    if (!safe || summaryTasks.has(safe) || selected.includes(safe)) return;
    selected.push(safe);
  };
  pushSelected(primary);
  const actionRequested = requestedActions.length > 0 || requestedExternalExecution;
  const preparationForRequestedActions = cmoPreparationTasksForActions(requestedActions, text);
  const parallelSameLayerRequested = cmoParallelSameLayerIntentFromText(text);
  const cmoResearchLayerLimit = parallelSameLayerRequested ? CMO_WORKFLOW_RESEARCH_LAYER_TASKS.length : 1;
  const cmoPlanningLayerLimit = parallelSameLayerRequested
    || requestedActions.length > 1
    || plannerCandidateActions.length > 1
    ? CMO_WORKFLOW_PLANNING_LAYER_TASKS.length
    : 1;
  const cmoPreparationLayerLimit = actionRequested
    ? (parallelSameLayerRequested
        ? CMO_WORKFLOW_PREPARATION_LAYER_TASKS.length
        : Math.max(1, Math.min(3, preparationForRequestedActions.length || 1)))
    : (parallelSameLayerRequested ? CMO_WORKFLOW_PREPARATION_LAYER_TASKS.length : 1);
  const layerLimits = new Map([
    [1, 1],
    [2, cmoResearchLayerLimit],
    [3, cmoPlanningLayerLimit],
    [4, cmoPreparationLayerLimit]
  ]);
  const layerCounts = new Map();
  const sourceBucketCounts = new Map();
  const sourceBucketForTask = (task) => dataCollectionTasks.has(normalizedCmoTask(task)) ? 'data' : 'research';
  const pushLayerTask = (task, itemOptions = {}) => {
    const safe = normalizedCmoTask(task);
    if (!safe || safe === primary || summaryTasks.has(safe) || selected.includes(safe)) return;
    if (safe === 'data_analysis' && !preferredCmoSourceTasks.includes('data_analysis') && !itemOptions.force) return;
    const layer = leaderTaskLayer(primary, safe) || 1;
    if (layer >= leaderActionLayerStart(primary)) {
      if (itemOptions.force || requestedActions.includes(safe)) pushSelected(safe);
      return;
    }
    if (layer === 1 && leaderTaskRequiresSourceCollection(primary, safe)) {
      const bucket = sourceBucketForTask(safe);
      const currentBucket = Number(sourceBucketCounts.get(bucket) || 0);
      const bucketLimit = 1;
      if (!itemOptions.force && currentBucket >= bucketLimit) return;
      pushSelected(safe);
      sourceBucketCounts.set(bucket, currentBucket + 1);
      layerCounts.set(layer, Number(layerCounts.get(layer) || 0) + 1);
      return;
    }
    const limit = layerLimits.has(layer) ? layerLimits.get(layer) : 1;
    const current = Number(layerCounts.get(layer) || 0);
    if (!itemOptions.force && current >= limit) return;
    pushSelected(safe);
    layerCounts.set(layer, current + 1);
  };
  const fillLayer = (layer, preferredTasks = []) => {
    for (const task of preferredTasks) {
      if (layer !== 1 && Number(layerCounts.get(layer) || 0) >= Number(layerLimits.get(layer) || 1)) break;
      if (ordered.includes(task) && leaderTaskLayer(primary, task) === layer) pushLayerTask(task);
    }
    for (const task of ordered) {
      if (layer !== 1 && Number(layerCounts.get(layer) || 0) >= Number(layerLimits.get(layer) || 1)) break;
      if (leaderTaskLayer(primary, task) === layer) pushLayerTask(task);
    }
  };

  const planningPreferences = requestedActions.some((task) => ['seo_specialist', 'landing', 'writing'].includes(task)) || plannerCandidateActions.length || cmoMediaPlanningPreferredFromText(text)
    ? ['media_planner', 'growth']
    : ['growth', 'media_planner'];
  if (preferredCmoSourceTasks.includes('data_analysis')) fillLayer(1, ['data_analysis']);
  fillLayer(2, preferredCmoSourceTasks.filter((task) => task !== 'data_analysis').concat(['research', 'teardown', 'validation']));
  fillLayer(3, planningPreferences);
  for (const task of preparationForRequestedActions) pushLayerTask(task, { force: true });
  fillLayer(4, preparationForRequestedActions.concat(['seo_specialist', 'landing', 'writing', 'writer', 'list_creator']));
  for (const task of requestedActions) pushLayerTask(task, { force: true });
  const actionTasks = ordered.filter((task) => (leaderTaskLayer(primary, task) || 1) >= leaderActionLayerStart(primary));
  if (
    !requestedActions.length
    && requestedExternalExecution
    && !selected.some((task) => (leaderTaskLayer(primary, task) || 1) >= leaderActionLayerStart(primary))
  ) {
    const defaultActionTask = defaultCmoActionTaskFromText(text);
    if (actionTasks.includes(defaultActionTask)) {
      pushLayerTask(defaultActionTask, { force: true });
    }
  }
  for (const task of ordered) {
    const layer = leaderTaskLayer(primary, task) || 1;
    if (layer >= leaderActionLayerStart(primary)) continue;
    if (task === 'data_analysis' && !preferredCmoSourceTasks.includes('data_analysis')) continue;
    if (!selected.includes(task)) pushLayerTask(task);
  }
  return sortLeaderWorkflowTasks(selected);
}

export function isCmoActionTask(taskType = '') {
  return CMO_ACTION_RUN_TASKS.includes(normalizedCmoTask(taskType));
}

export function isCmoWorkflowSpecialistTask(taskType = '') {
  return CMO_WORKFLOW_SPECIALIST_TASKS.includes(normalizedCmoTask(taskType));
}

export function cmoAgentActionContractForKind(kind = '') {
  return CMO_AGENT_ACTION_CONTRACTS[normalizedCmoTask(kind)] || CMO_AGENT_ACTION_CONTRACTS.growth;
}

function cmoAgentPublisherHandoffMetadata(contract = {}) {
  const handoff = contract?.publisherHandoff && typeof contract.publisherHandoff === 'object'
    ? contract.publisherHandoff
    : null;
  if (!handoff) return null;
  const artifactTypes = Array.isArray(handoff.artifactTypes)
    ? handoff.artifactTypes.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  return {
    surface: handoff.surface || 'publisher',
    content_type: handoff.contentType || handoff.content_type || handoff.artifactType || handoff.artifact_type || '',
    artifact_type: handoff.artifactType || handoff.artifact_type || handoff.contentType || handoff.content_type || '',
    artifact_types: artifactTypes,
    item_type: handoff.itemType || handoff.item_type || '',
    action_type: handoff.actionType || handoff.action_type || '',
    channel: handoff.channel || '',
    connector: handoff.connector || '',
    connector_capability: handoff.connectorCapability || handoff.connector_capability || '',
    review_status: 'needs_review',
    ingest_status: 'not_ingested',
    publish_status: 'not_published'
  };
}

function cmoAgentPublisherHandoffInstruction(contract = {}) {
  const metadata = cmoAgentPublisherHandoffMetadata(contract);
  if (!metadata) return '';
  return [
    'Publisher review handoff: this task is known at dispatch time to produce a Publisher-reviewable artifact.',
    'Return the final delivery file or report artifact with explicit metadata:',
    `surface=${metadata.surface}`,
    `content_type=${metadata.content_type}`,
    `artifact_type=${metadata.artifact_type}`,
    metadata.artifact_types.length ? `artifact_types=${metadata.artifact_types.join('|')}` : '',
    `item_type=${metadata.item_type}`,
    `action_type=${metadata.action_type}`,
    `channel=${metadata.channel}`,
    `connector=${metadata.connector}`,
    `connector_capability=${metadata.connector_capability}`,
    'For social/community channels, also include profile_handle/profile_url/media_assets/channel_rules/approval_checklist when known or label each as missing.',
    'review_status=needs_review',
    'ingest_status=not_ingested',
    'publish_status=not_published',
    'Do not claim posted, queued, published, submitted, handed off, ingested, or ready until Publisher/app or connector proof exists.'
  ].filter(Boolean).join(' ');
}

export function cmoAgentActionContractMarkdown(kind = '', isJapanese = false) {
  const contract = cmoAgentActionContractForKind(kind);
  const publisherInstruction = cmoAgentPublisherHandoffInstruction(contract);
  return `## Agent action contract
| Field | Definition |
| --- | --- |
| Action | ${contract.action} |
| Required input | ${contract.requiredInput} |
| Deliverable | ${contract.deliverable} |
| Approval gate | ${contract.approvalGate} |
| Done definition | ${contract.doneDefinition} |${publisherInstruction ? `\n\n${publisherInstruction}` : ''}`;
}

export const CMO_INTAKE_REQUIRED_SIGNALS = Object.freeze([
  Object.freeze({ signal: 'objective', label: 'objective' }),
  Object.freeze({ signal: 'business', label: 'business_or_product' }),
  Object.freeze({ signal: 'audience', label: 'target_customer' }),
  Object.freeze({ signal: 'automationPreference', label: 'automation_or_one_off_preference' }),
  Object.freeze({ signal: 'sourceData', label: 'source_data_context' }),
  Object.freeze({ anyOf: Object.freeze(['currentState', 'constraints']), label: 'current_state_or_constraints' }),
  Object.freeze({ signal: 'deliverable', label: 'desired_delivery', skipWhenIntakeAnswered: true }),
  Object.freeze({ signal: 'longEnough', label: 'business_context_detail', skipWhenIntakeAnswered: true })
]);

export const CMO_INTAKE_QUESTIONS = Object.freeze({
  ja: Object.freeze([
    '売りたい商材・サービス内容とURLを教えてください。',
    '最終的に増やしたい行動とターゲットを教えてください。例: 購入、問い合わせ、登録。誰向けかも入れてください。',
    '集客をスケジュールで自動的に回したいですか？それとも単発の施策/計画がよいですか？自動化なら頻度、回数、止めたい条件も教えてください。',
    '営業資料、LP、価格表、GA4、Search Console、CRM、SNSなど読ませたい資料/実データ、制約、使いたいチャネル、希望する納品形式を教えてください。なければ「なし」で大丈夫です。'
  ]),
  en: Object.freeze([
    'What product or service do you want to sell? Include the URL.',
    'What final action should increase, and who is the target customer? Examples: purchase, lead, signup, or retention.',
    'Should CAIt run acquisition as a scheduled automation loop, or prepare a one-off campaign/plan? If automation, include frequency, run count, and stop conditions.',
    'What source materials, real data, constraints, preferred channels, X/Twitter account URL, and delivery format should apply? Examples: sales deck, landing page, pricing, GA4, Search Console, CRM, social data. If none, say none.'
  ])
});

export const CMO_LEADER_BEHAVIOR = Object.freeze({
  taskInferenceRules: CMO_TASK_INFERENCE_RULES,
  taskExpansionTasks: CMO_TASK_EXPANSION_TASKS,
  analysisPreludeTasks: CMO_LEADER_ANALYSIS_PRELUDE_TASKS,
  connectorExecutionPolicies: CMO_CONNECTOR_EXECUTION_POLICIES,
  normalizeAlias: normalizeCmoLeaderAlias,
  taskTypeForText: cmoLeaderTaskTypeForText,
  followupSpecialistTaskForText: cmoFollowupSpecialistTaskForText,
  inferTaskSequence: cmoInferTaskSequence,
  intakeProfile: 'growth',
  intakeRequiredSignals: CMO_INTAKE_REQUIRED_SIGNALS,
  intakeQuestions: CMO_INTAKE_QUESTIONS,
  actionMode: 'saas_handoff_only',
  publishSurface: 'saas',
  normalizeWorkflowPlannedTasks: cmoNormalizeWorkflowPlannedTasks,
  plannerAllowsCandidateAgentTasks: false,
  ensureWorkflowActionTasks: cmoEnsureLeaderWorkflowActionTasks,
  replanDecision: cmoWorkflowReplanDecision,
  sequentialUserActionPriority: cmoSequentialUserActionPriority,
  externalActionRequested: cmoExternalActionRequestedFromText,
  intentChecks: Object.freeze({
    freeWebGrowth: isFreeWebGrowthIntent,
    agentTeamLaunch: isAgentTeamLaunchIntent,
    largeTeam: isLargeAgentTeamIntent,
    externalExecution: isCmoExternalExecutionIntent
  })
});

const CMO_LEADER_AGENT_PURPOSE = 'Lead source-grounded marketing strategy by integrating ICP, funnel evidence, page/search analytics, proof status, channel priority, and approval-bound execution planning while keeping external channel execution owned by the responsible agent or app.';

const CMO_LEADER_AGENT_ACTION_BOUNDARIES = Object.freeze(Object.entries(CMO_AGENT_ACTION_CONTRACTS).map(([taskType, contract]) => Object.freeze({
  id: `cmo_handoff_${taskType}`,
  mode: isCmoActionTask(taskType) ? 'leader_to_action_handoff' : 'leader_strategy_or_preparation_handoff',
  requires: Object.freeze([contract.requiredInput]),
  prepares: Object.freeze([
    contract.deliverable,
    ...(contract.publisherHandoff ? ['publisher_review_metadata_instruction'] : [])
  ]),
  produces: Object.freeze([
    `${taskType}_leader_handoff_packet`,
    ...(contract.publisherHandoff ? [`${taskType}_publisher_review_packet_instruction`] : [])
  ]),
  cannotClaim: Object.freeze(['published', 'sent', 'posted', 'external_app_ingested_without_proof', 'SaaS executed']),
  authorityBoundary: contract.approvalGate,
  doneDefinition: contract.doneDefinition
})));

const CMO_LEADER_DELIVERY_CONTRACT = Object.freeze({
  requiredDeliverySections: Object.freeze(['Executive summary', 'Confirmed facts', 'Source coverage ledger', 'Open questions', 'Priority diagnosis', 'Recommended actions', 'Channel priority table', '2-week execution plan', 'Measurement checklist', 'Inputs needed next']),
  requiredEvidence: Object.freeze(['source data or prior work used', 'GA4/Search Console/funnel/page/article evidence status or explicit missing labels', 'external execution proof when any external execution is claimed']),
  mustLabel: Object.freeze(['assumptions', 'source coverage', 'missing analytics/search/page/article inputs', 'blocked actions', 'approval owner/status', 'execution not claimed']),
  forbiddenClaims: Object.freeze(['published', 'Publisher item created without proof', 'external app ingested without proof', 'traffic, conversion, query intent, page performance, or content gap treated as verified without supplied evidence', 'channel execution or handoff completion without approval and proof']),
  validDeliveryCheck: 'A valid CMO delivery reads like one end-user growth plan, includes a source coverage ledger for analytics/search/page/content evidence, ties gaps to priority, and keeps internal orchestration or handoff metadata out of the Markdown.'
});

const AGENT_DEFINITION = {
  provider: AGENT_PROVIDER,
  agentPurpose: CMO_LEADER_AGENT_PURPOSE,
  agentActionBoundaries: CMO_LEADER_AGENT_ACTION_BOUNDARIES,
  deliveryContract: CMO_LEADER_DELIVERY_CONTRACT,
  deprecatedSeedIds: Object.freeze([
    'agent_free_web_growth_leader_01'
  ]),
  "fileName": "cmo-team-leader-delivery.md",
  "healthService": "cmo_team_leader",
  "modelRole": "CMO-level marketing strategy and acquisition leadership",
  "executionLayer": "leader",
  "taskRouting": {
    "softMatchTokens": ['cmo', 'marketing_leader', 'free_web_growth_leader', 'launch_team_leader', 'agent_team_launch'],
    "tagHints": ['leader', 'marketing', 'growth', 'strategy']
  },
  "leaderBehavior": CMO_LEADER_BEHAVIOR,
  "connectorExecutionPolicies": CMO_CONNECTOR_EXECUTION_POLICIES,
  "leaderControlSpecialization": CMO_LEADER_CONTROL_SPECIALIZATION,
  "workflowProfile": {
    "aliases": [
      "free_web_growth_leader"
    ],
    "defaultLayer": 4,
    "actionLayerStart": 5,
    "externalActionMode": "saas_handoff_only",
    "publishSurface": "saas",
    "publishApprovalSurface": "saas",
    "layers": [
      {
        "name": "data",
        "phase": "data",
        "number": 1,
        "tasks": [
          "data_analysis"
        ]
      },
      {
        "name": "research",
        "phase": "research",
        "number": 2,
        "tasks": [
          "research",
          "teardown",
          "validation"
        ]
      },
      {
        "name": "planning",
        "phase": "planning",
        "number": 3,
        "tasks": [
          "media_planner",
          "growth"
        ]
      },
      {
        "name": "preparation",
        "phase": "preparation",
        "number": 4,
        "tasks": [
          "list_creator",
          "landing",
          "seo_specialist",
          "writing",
          "writer",
          "reddit",
          "indie_hackers"
        ]
      },
      {
        "name": "saas_publish_handoff",
        "phase": "app_handoff",
        "number": 5,
        "tasks": []
      },
      {
        "name": "summary",
        "phase": "summary",
        "number": 6,
        "tasks": []
      }
    ],
    "protocolExtras": [
      "Data is a separate optional layer and should run only when GA4, Search Console, analytics, CRM, CSV, billing, or other measurable data is supplied or explicitly requested.",
      "Search is allowed only in the research/search layer. Later planning, preparation, and action layers must use the leader handoff and prior research outputs instead of browsing again.",
      "Bridge every layer through the leader: CAIt -> leader -> optional data/research -> planning -> preparation data stored for SaaS -> action/app handoff that links the matched SaaS app screen selected by manifest fit.",
      "Set ICP, positioning, and proof before selecting channels.",
      "Pick the first media lane and explain why it wins against the next-best lane.",
      "Preparation-layer outputs are assumed to be normalized into SaaS delivery/app-handoff data. The action layer should surface the matched SaaS app link selected by inputContract/capabilities, not dispatch another posting worker.",
      "Keep a leader approval queue before handing publishable packets to the matched SaaS app surface.",
      "When choosing a specialist for a layer, inspect all registered agent manifests that match the required capability; do not choose by sample/built-in identity.",
      "At each checkpoint, convert incoming specialist outputs into a structured handoff digest with facts, sources, decisions, artifacts, blockers, and next_inputs before dispatching the next layer.",
      "If a selected specialist's CMO action contract includes publisherHandoff, the first dispatch packet must instruct that specialist to return a Publisher review packet with explicit surface/content_type/artifact_type/artifact_types/item_type/action_type/channel/connector/connector_capability metadata and needs_review/not_ingested/not_published status.",
      "Downstream layers must read the prior raw agent delivery Markdown first as user-facing source material, then use the supporting fact index only to avoid losing sources, decisions, or blockers.",
      "At each checkpoint, cite concrete completed specialist findings by task name before releasing the next layer.",
      "Before final publish handoff, surface the exact packet, target surface, copy, destination, and stop rule.",
      "At final summary, cite concrete specialist findings by task name; never deliver only a generic plan or another research approval request."
    ]
  },
  "seedProfile": {
    "id": "agent_cmo_leader_01",
    "name": "CMO TEAM LEADER",
    "description": "Built-in executive leader that analyzes ICP, competitors, funnel, and channels first, then coordinates marketing strategy, launch, organic growth, channel execution, and leader-mediated approval through exact specialist dispatch and action packets.",
    "taskTypes": [
      "cmo",
      "cmo_leader",
      "marketing_leader",
      "growth",
      "marketing",
      "agent_team",
      "agent_team_launch",
      "launch_team",
      "free_web_growth",
      "free_web_growth_leader"
    ],
    "successRate": 0.94,
    "avgLatencySec": 16,
    "capabilities": [
      "marketing_strategy",
      "specialist_orchestration",
      "launch_orchestration",
      "organic_growth_orchestration",
      "approval_gate",
      "leader_approval_queue",
      "connector_dispatch_queue",
      "planned_action_queue",
      "dispatch_packet_contract",
      "task_decomposition",
      "routing_decision",
      "stop_go_gate",
      "integration",
      "quality_gate",
      "context_control",
      "final_responsibility"
    ],
    "metadata": {
      "layer": "leader",
      "specialist_selection_policy": "Select from every registered agent manifest in the required layer by taskTypes, capabilities, input/output contracts, evidence needs, and approval constraints. Do not prefer sample or built-in agents by identity; sample agents are only candidates under the same manifest/provider contract.",
      "downstream_task_types": [
        "research",
        "writing",
        "media_planner",
        "growth",
        "list_creator",
        "landing",
        "seo_specialist",
        "reddit",
        "indie_hackers"
      ],
      "execution_mode": "leader_mediated",
      "approval_role": "cmo_leader",
      "planned_action_contract": "lane_owner_artifact_matched_app_metric",
      "merged_leader_aliases": [
        "launch_team_leader",
        "free_web_growth_leader"
      ]
    }
  },
  "systemPrompt": "You are the built-in CMO Team Leader for AIagent2. Lead marketing strategy, positioning, launch, free-web growth, channel selection, acquisition experiments, and messaging quality. A good leader gathers information before proposing: first summarize the order owner's intent, identify the product/service URL, inventory supplied sales materials, downloadable materials, landing pages, proof assets, GA4/Search Console/CRM/sales data, existing article/content inventory, and any other source data to read, then label each source as supplied, missing, stale, or not accessed. First analyze the business, ICP, competitors, current funnel, proof, channels, constraints, and source coverage before assigning growth or channel specialists. Use completed evidence-layer, planning-layer, and preparation-layer raw agent deliveries before deciding channels or specialist dispatch; those raw deliveries are user-facing source material, not internal memos. Select specialists from the registered agent manifests available in the required layer by taskTypes, capabilities, input/output contracts, evidence needs, and approval constraints. Do not prefer sample or built-in agents by identity; sample agents and external agents are candidates under the same provider endpoint contract. Treat task names as capability categories, not fixed agent identities. At every checkpoint, read the incoming user-facing specialist deliveries first, summarize the business facts and decisions in user-facing language, and dispatch the next layer from that reviewed user-facing work instead of from a broad template. Act as the marketing leader who chooses the media, required capability, order, and publishable packet that should move next. If a selected specialist is known from CMO_AGENT_ACTION_CONTRACTS to produce an app-reviewable artifact, instruct it from the first dispatch to return a user-facing review packet plus separate metadata for the app surface; do not make the Markdown itself read like metadata. Specialists prepare LP, SEO, and writing artifacts when their manifests match the need; external publishing itself belongs to the matched SaaS app surface selected by manifest inputContract/capabilities, not the CMO workflow. Turn the chosen lane into exact leader-owned packets: every dispatched specialist step should name owner/capability, objective, required input, exact artifact, approval rule, timing, metric, and stop condition in user-facing terms. When the user asks for action, execution, connector work, publishing, sending, scheduling, or completion through delivery, do not stop at a plan or \"approve research first\" message. Choose the next safe executable lane and emit a matched-SaaS-app-ready packet or a structured authority_request for the blocker. Absorb launch-team and free-web-growth leadership inside the CMO role instead of handing them off to separate leaders. Coordinate specialist agents without hiding assumptions, cost, or measurement gaps. Focus on customers, channels, proof, conversion, and measurable growth.",
  "deliverableHint": "Deliver in the user requested language in a clear, user-readable format.",
  "reviewHint": "Remove generic marketing advice, sharpen the target segment, make the measurement plan concrete, and turn prior work into one end-user growth plan with clear priority, execution order, source coverage, proof gaps, and next inputs. Keep internal orchestration, manifest, app, and handoff details out of the Markdown.",
  "executionFocus": "Set ICP, positioning, channel priority, offer, proof, and acquisition experiments from evidence. Decide which business action should move next, but present it as a user-facing execution plan, not as internal agent routing or app handoff.",
  "outputSections": [
    "Executive summary",
    "Confirmed facts",
    "Source coverage ledger",
    "Open questions",
    "Priority diagnosis",
    "Recommended actions",
    "Channel priority table",
    "2-week execution plan",
    "Measurement checklist",
    "Inputs needed next"
  ],
  "inputNeeds": [
    "Product/service URL",
    "Business or product",
    "ICP",
    "Sales, downloadable, landing page, pricing, or proof materials",
    "GA4, Search Console, CRM, sales, lead, or campaign data status",
    "Positioning hypothesis",
    "Channels",
    "Growth target",
    "Automation preference: scheduled loop versus one-off campaign, including frequency, run count, and stop condition",
    "Current proof/assets",
    "Current funnel or bottleneck signal",
    "Execution assets and approval readiness",
    "What the business owner can approve for external execution"
  ],
  "acceptanceChecks": [
    "Research evidence is used before channel choice",
    "ICP, competitor/channel evidence, and positioning are set before tactics",
    "GA4, Search Console, current landing-page copy, proof assets, existing content, and CRM/sales data are each labeled supplied, missing, stale, or not accessed",
    "Missing source coverage is tied to the priority diagnosis without inventing traffic, query, page, or content performance",
    "Chosen media and next-best alternative are explicit",
    "Approval and execution gates are explicit",
    "Each planned action names owner, artifact, approval condition, metric, and stop rule",
    "If the user chooses automation, planned external actions are framed as stoppable scheduled actions with execution time, stop/edit path, and proof requirement rather than defaulting to a passive approval wait",
    "Internal agent, manifest, and app routing details are not exposed in the user-facing Markdown",
    "User-facing plan carries facts, sources, decisions, blockers, and next inputs without exposing internal orchestration",
    "Growth metric is explicit"
  ],
  "firstMove": "Summarize the order owner intent and supplied source data, then analyze business, ICP, competitors, funnel, proof, channel fit, and growth metric before assigning marketing specialists. Turn that analysis into leader-owned action decisions, not just orchestration notes.",
  "failureModes": [
    "Do not assign channels before ICP and positioning",
    "Do not ignore competitor/channel evidence",
    "Do not leave the next lane or approval owner ambiguous",
    "Do not define metrics too vaguely"
  ],
  "evidencePolicy": "Use supplied URLs, sales/downloadable materials, proof assets, GA4, Search Console, CRM, customer, competitor, channel, positioning, funnel, and connector-readiness evidence before assigning specialists. Label missing data, strategic bets, and assumptions separately from facts and date any current market or channel observations.",
  "nextAction": "End with the chosen channel priority, why it beats the next-best lane, the first campaign experiment, the growth metric, and the concrete inputs needed next.",
  "confidenceRubric": "High when business, ICP, positioning, proof, channels, connector readiness, and growth metric are clear; medium when competitor evidence or execution ownership is partial; low when product, market, or approval path is vague.",
  "handoffArtifacts": [
    "Research findings",
    "User-facing growth plan",
    "Chosen media and why",
    "Lane decision memo",
    "Execution approval queue",
    "Planned action table",
    "Growth experiment"
  ],
  "prioritizationRubric": "Prioritize marketing moves by ICP fit, channel evidence, positioning leverage, execution readiness, speed to learning, and compounding distribution value.",
  "measurementSignals": [
    "ICP signal",
    "Channel conversion",
    "Approval-to-execution latency",
    "CAC/time cost proxy",
    "Experiment learning rate"
  ],
  "assumptionPolicy": "Assume the CMO must set ICP and positioning before tactics and remains the broker for approval and execution. Do not assume channel-market fit, connector readiness, or approval ownership without evidence.",
  "escalationTriggers": [
    "Business, ICP, or offer is unclear",
    "Claims require proof not supplied",
    "Approval rules or external execution readiness are unclear",
    "Channel actions risk spam or policy violations"
  ],
  "minimumQuestions": [
    "What product/service and URL are we marketing?",
    "What is the order owner's real intent or decision?",
    "What sales/downloadable materials, proof assets, GA4/Search Console/CRM, or other data should be read?",
    "Who is the ICP and what user action matters most?",
    "What positioning or competitor context exists?",
    "Which external execution surface and assets are actually ready for this lane?",
    "Which prepared materials should be approved for external execution?",
    "Which growth metric matters most now?"
  ],
  "reviewChecks": [
    "ICP and positioning precede tactics",
    "Competitor/channel evidence is used",
    "Approval boundary for execution is explicit",
    "Chosen lane, approval owner, execution surface, and next artifact are explicit",
    "Metric is explicit"
  ],
  "depthPolicy": "Default to ICP, positioning, one chosen media lane, one approval queue, and one planned action table. Go deeper when copy, execution readiness, and competitor/channel evidence must align.",
  "concisionRule": "Avoid generic marketing frameworks; tie each tactic to ICP, positioning, proof, metric, research evidence, and the user's execution path. Prefer short action rows over loose strategy prose when execution is implied.",
  "toolStrategy": {
    "web_search": "default",
    "source_mode": "current_market_competitors_channels_and_positioning",
    "note": "Before assigning marketing work, verify ICP, competitors, channel behavior, positioning, proof, and any time-sensitive media or execution assumptions with current sources."
  },
  "specialistMethod": [
    "Set ICP, positioning, promise, proof, and growth metric before tactics.",
    "Check current competitors, channels, and audience language before assigning specialists.",
    "Create execution-ready work packets that preserve positioning while naming the exact objective, input, artifact, approval rule, timing, metric, and stop rule.",
    "When the user asks to automate acquisition, turn the chosen lane into scheduled actions that can be stopped before execution; reserve needs-policy-change only for actions outside the user's allowed automation scope.",
    "Collect prepared drafts into an approval queue so the business owner can decide what gets routed to an external surface or operator.",
    "Return a planned action table that shows one first lane, the next packet to approve, and what waits until later."
  ],
  "scopeBoundaries": [
    "Do not start tactics before ICP, positioning, promise, proof, and metric are defined.",
    "Do not invent market proof or exaggerate claims for conversion.",
    "Do not let supporting work imply autonomous publishing when an external surface owns the external publish step.",
    "Do not output an action queue that lacks owner, artifact, approval path, or stop rule.",
    "Do not turn an in-scope scheduled automation request into a passive approval wait when a scheduled action with a visible stop/edit path is safer and more useful.",
    "Do not approve channel plans that risk spam, policy violations, or brand damage."
  ],
  "freshnessPolicy": "Treat market positioning, competitor channels, ICP language, and proof as time-sensitive. Date current scans before locking strategy or specialist briefs.",
  "sensitiveDataPolicy": "Treat ICP notes, customer lists, revenue metrics, attribution data, and positioning drafts as confidential. Channel briefs should use aggregated or approved claims only.",
  "costControlPolicy": "Spend analysis on ICP, positioning, and the highest-leverage channel. Avoid assigning every marketing specialist when one bottleneck dominates."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'cmo_leader',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'cmo_leader'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'cmo_leader agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/cmo_leader/health',
  healthcheck_url: '/sample-agents/cmo_leader/health',
  jobEndpoint: '/sample-agents/cmo_leader/jobs',
  job_endpoint: '/sample-agents/cmo_leader/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/cmo_leader/health',
    jobs: '/sample-agents/cmo_leader/jobs'
  }),
  metadata: Object.freeze({
    agent_purpose: AGENT_DEFINITION.agentPurpose,
    action_boundaries: AGENT_DEFINITION.agentActionBoundaries,
    delivery_contract: AGENT_DEFINITION.deliveryContract,
    sample: true,
    sampleKind: 'cmo_leader',
    sample_kind: 'cmo_leader',
    category: 'cmo_leader',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
