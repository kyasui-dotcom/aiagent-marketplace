export function normalizeOpenChatIntentText(value = '') {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u30a1-\u30f6]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60))
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function openChatIntentMatchText(value = '') {
  const normalized = normalizeOpenChatIntentText(value);
  if (!normalized) return '';
  const compact = normalized.replace(/\s+/g, '');
  let expanded = ` ${normalized} ${compact} `;
  const replacements = [
    [/(?:caitt|ca1t|cai\s*t|ca\s*it|けいと|毛糸|aiagent2|ai\s*agent\s*market(?:place)?|aiagent\s*market(?:place)?)/g, ' cait '],
    [/(?:ai\s*agents?|aiagents?|agent[s]?|えーじぇんと|えいじぇんと|えーじえんと|えーじぇんつ|えいじぇんつ)/g, ' ai agent agent '],
    [/(?:chat\s*gpt|chatgpt|ちゃっとgpt|ちゃっとじーぴーてぃー|gptちゃっと)/g, ' chatgpt '],
    [/(?:github|git\s*hub|githab|gihub|gitub|ぎっとはぶ|ぎっとは|ぎとはぶ|ぎっとはぶろぐいん|ぎっとはぶ連携)/g, ' github repo repository '],
    [/(?:repo|repository|れぽ|りぽ|りぽじとり|りぽじとりー|りぽじとりい|れぽじとり|れぽじとりー|リポ)/g, ' repo repository '],
    [/(?:pull\s*request|pullreq|pull\s*req|ぷるりく|ぷるりくえすと|\bpr\b)/g, ' pull request pr '],
    [/(?:manifest|まにふぇすと|まにふぇす|まにゅふぇすと|manifst|manfest)/g, ' manifest '],
    [/(?:verify|verification|verfy|varify|べりふぁい|べりふぁいする|べりふぃけーしょん|検証|けんしょう)/g, ' verify verification '],
    [/(?:adapter|あだぷた|あだぷたー|あだぷたあ|あだぷたpr)/g, ' adapter '],
    [/(?:endpoint|end\s*point|えんどぽいんと|えんどぽいんつ|エンドポイント)/g, ' endpoint '],
    [/(?:google|googel|gogle|ぐーぐる|ぐぐる)/g, ' google '],
    [/(?:stripe|strpie|stirpe|すとらいぷ|すとらいぶ|ストライプ|ストライブ)/g, ' stripe payment billing '],
    [/(?:openai|open\s*ai|opneai|おーぷんえーあい|おーぷんai)/g, ' openai model provider '],
    [/(?:anthropic|anthoropic|あんすろぴっく|あんそろぴっく|claude|くろーど|くろーどこーど|cloudecode)/g, ' anthropic claude model provider '],
    [/(?:serp|さーぷ|検索api|けんさくapi)/g, ' serp search api '],
    [/(?:api\s*key|apikey|apiきー|えーぴーあいきー|えーぴーあい\s*きー|鍵|かぎ)/g, ' api key token '],
    [/(?:api|えーぴーあい)/g, ' api '],
    [/(?:cli|しーえるあい|こまんど|たーみなる|ターミナル)/g, ' cli command terminal '],
    [/(?:login|signin|sign\s*in|ろぐいん|ログイン|さいんいん|サインイン)/g, ' login sign in '],
    [/(?:connect|connection|れんけい|連携|せつぞく|接続|おーおーす|oauth|認証|にんしょう)/g, ' connect oauth auth '],
    [/(?:order|おーだー|おーだ|注文|ちゅうもん|発注|はっちゅう|依頼|いらい|work|わーく|作業|さぎょう)/g, ' order work request '],
    [/(?:delivery|でりばり|でりばりー|納品|のうひん|結果|けっか)/g, ' delivery result '],
    [/(?:settings|setting|せってい|設定)/g, ' settings '],
    [/(?:deposit|deposite|でぽじっと|デポジット|残高|ざんだか|balance|ちゃーじ|チャージ|入金|にゅうきん)/g, ' deposit balance payment billing '],
    [/(?:billing|びりんぐ|請求|せいきゅう|課金|かきん|支払|支払い|しはらい|決済|けっさい|payment|\bpay\b)/g, ' billing payment '],
    [/(?:payout|pay\s*out|withdraw|withdrow|withraw|ぺいあうと|出金|しゅっきん|引き出し|ひきだし|受け取り|うけとり|収益|しゅうえき)/g, ' payout withdraw provider revenue '],
    [/(?:bug|ばぐ|不具合|ふぐあい|error|えらー|エラー|動かない|うごかない|壊れ|こわれ|直して|なおして|修正|しゅうせい)/g, ' bug error fix debug '],
    [/(?:code|coding|こーど|コード|実装|じっそう|開発|かいはつ)/g, ' code coding implement build '],
    [/(?:deploy|deployment|でぷろい|デプロイ|本番|ほんばん|cloudflare|くらうどふれあ|vercel|ばーせる|wrangler|らんぐらー)/g, ' deploy cloudflare vercel wrangler '],
    [/(?:marketing|まーけ|まーけてぃんぐ|マーケ|マーケティング|集客|しゅうきゃく|集きゃく|流入|りゅうにゅう|認知|にんち)/g, ' marketing growth acquisition traffic awareness '],
    [/(?:acquire|aquire|acquisition|customer\s*acquisition|new\s*customers?|lead\s*gen(?:eration)?|get\s*customers?)/g, ' acquire acquisition customers leads growth '],
    [/(?:sales|revenue|売上|売り上げ|うりあげ|収益|しゅうえき|利益|りえき|儲け|もうけ|稼ぎ|かせぎ)/g, ' sales revenue profit growth '],
    [/(?:signup|sign\s*up|さいんあっぷ|サインアップ|登録|とうろく|会員登録|かいいんとうろく|問い合わせ|といあわせ|購入|こうにゅう|conversion|こんばーじょん|cvr)/g, ' signup lead purchase conversion '],
    [/(?:retention|りてんしょん|継続|けいぞく|解約|かいやく|churn|ちゃーん)/g, ' retention churn '],
    [/(?:launch|ろーんち|ローンチ|公開|こうかい|告知|こくち|投稿|とうこう|拡散|かくさん|distribution)/g, ' launch posting distribution marketing '],
    [/(?:x\.com|twitter|tweet|tweets|えっくす|ついったー|ツイッター|ついーと|ツイート|ぽすと|ポスト)/g, ' x twitter tweet post '],
    [/(?:reddit|れでぃっと|れでっと|レディット)/g, ' reddit community '],
    [/(?:indie\s*hackers?|indiehackers|いんでぃーはっかー|いんでぃはっかー|インディーハッカー)/g, ' indie hackers community '],
    [/(?:product\s*hunt|producthunt|ぷろだくとはんと|プロダクトハント)/g, ' product hunt launch '],
    [/(?:seo|えすいーおー|検索流入|けんさくりゅうにゅう|検索|けんさく)/g, ' seo search '],
    [/(?:lp|えるぴー|landing\s*page|ランディングページ|らんでぃんぐぺーじ)/g, ' landing page lp '],
    [/(?:compare|comparison|くらべ|比べ|比較|ひかく|ランキング|らんきんぐ|どっち|どれ|選ぶ|えらぶ)/g, ' compare ranking choose decision '],
    [/(?:write|writing|draft|返信|へんしん|文章|ぶんしょう|メール|めーる|記事|きじ|コピー|こぴー|見出し|みだし)/g, ' write writing draft copy email post '],
    [/(?:summary|summarize|要約|ようやく|まとめ|まとめて)/g, ' summary summarize '],
    [/(?:research|りさーち|リサーチ|調査|ちょうさ|情報収集|じょうほうしゅうしゅう|最新|さいしん)/g, ' research current information '],
    [/(?:help|へるぷ|ヘルプ|助けて|たすけて|使い方|つかいかた|何ができる|なにができる|何から|なにから|どうすれば|わからない|分からない)/g, ' help start confused '],
    [/(?:file|files|ふぁいる|ファイル|添付|てんぷ|upload|あっぷろーど|資料|しりょう|source|そーす|ソース|url)/g, ' file upload source url ']
  ];
  replacements.forEach(([pattern, replacement]) => {
    expanded = expanded.replace(pattern, replacement);
  });
  return normalizeOpenChatIntentText(`${normalized} ${expanded}`);
}

export function clientTaskToken(value = '') {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function clientStructuredTaskToken(prompt = '') {
  return clientTaskToken((String(prompt || '').match(/^Task:\s*([a-z_ -]+)/im)?.[1] || '').trim());
}

export function isClientLeaderTaskToken(value = '') {
  const token = clientTaskToken(value);
  return Boolean(token && (token.endsWith('_leader') || ['leader', 'team_leader', 'leader_agent'].includes(token)));
}

export function isExplicitClientLeaderTask(taskType = '', prompt = '') {
  return isClientLeaderTaskToken(taskType) || isClientLeaderTaskToken(clientStructuredTaskToken(prompt));
}

export function isDirectorySubmissionIntentText(taskType = '', prompt = '') {
  const explicit = String(taskType || '').trim().toLowerCase();
  if (['directory_submission', 'directory_listing', 'launch_directory', 'startup_directory', 'ai_tool_directory', 'media_listing', 'free_listing'].includes(explicit)) return true;
  return /(directory submission|directory listing|submit.*directory|launch directory|startup directory|ai tool directory|product directory|media listing|free listing|list.*product|掲載媒体|媒体掲載|無料掲載|掲載先|投稿先.*リスト|ディレクトリ掲載|AIツール.*掲載|一気に掲載|まとめて掲載)/i.test(String(prompt || ''));
}

export function isMediaPlannerIntentText(taskType = '', prompt = '') {
  const explicit = String(taskType || '').trim().toLowerCase();
  if (['media_planner', 'channel_planner', 'distribution_strategy', 'channel_fit', 'listing_media_strategy'].includes(explicit)) return true;
  return /(media planner|channel planner|distribution strategy|channel fit|listing media strategy|best media|best channels|where should we list|which media should we use|掲載媒体.*提案|どの媒体|どこに掲載|ホームページ.*媒体|url.*媒体|業種.*媒体|媒体選定|掲載先選定|チャネル選定|配信媒体選定)/i.test(String(prompt || ''));
}

export function isCitationOpsIntentText(taskType = '', prompt = '') {
  const explicit = String(taskType || '').trim().toLowerCase();
  if (['citation_ops', 'meo', 'local_seo', 'gbp', 'google_business_profile', 'citations'].includes(explicit)) return true;
  return /(citation ops|citation audit|local seo|google business profile|google business|gbp|meo|map engine optimization|nap consistency|local citations|citation cleanup|business listing consistency|サイテーション|ローカルseo|googleビジネスプロフィール|gbp対策|meo対策|nap|店舗情報整備|ローカル掲載|ローカル引用|口コミ導線)/i.test(String(prompt || ''));
}

export function isListCreatorIntentText(taskType = '', prompt = '') {
  const explicit = String(taskType || '').trim().toLowerCase();
  if (['list_creator', 'lead_sourcing', 'lead_qualification', 'company_list_builder', 'prospect_research', 'lead_list_building', 'prospect_list', 'lead_list'].includes(explicit)) return true;
  return /(list creator|lead sourcing|lead qualification|prospect sourcing|company list builder|prospect research|build.*lead list|build.*prospect list|reviewable lead|public email|public contact|contact path|公開メアド|公開メール|公開連絡先|連絡先収集|見込み客リスト作成|リードリスト作成|営業先リスト|企業リスト作成|送る会社リスト|会社リスト作成|営業リスト作成|公開情報.*リスト|公開情報.*見込み客|公開情報.*営業先|公開情報.*メアド|公開情報.*連絡先)/i.test(String(prompt || ''));
}

export function inferClientTaskSequence(taskType, prompt = '') {
  const explicit = String(taskType || '').trim().toLowerCase();
  const text = openChatIntentMatchText(prompt);
  const ordered = [];
  const push = (value) => {
    const safe = String(value || '').trim().toLowerCase();
    if (!safe || ordered.includes(safe)) return;
    ordered.push(safe);
  };
  if (explicit) push(explicit);
  const structuredTask = explicit ? '' : (String(prompt || '').match(/^Task:\s*([a-z_ -]+)/im)?.[1] || '').trim().toLowerCase();
  if (structuredTask) push(structuredTask);
  if (isMediaPlannerIntentText(explicit, text)) push('media_planner');
  if (isListCreatorIntentText(explicit, text)) push('list_creator');
  if (isDirectorySubmissionIntentText(explicit, text)) push('directory_submission');
  if (isCitationOpsIntentText(explicit, text)) push('citation_ops');
  if (/(research team|analysis team|decision team|research leader|調査チーム|分析チーム|調査リーダー|リサーチリーダー)/i.test(text)) push('research_team_leader');
  if (/(build team|coding team|implementation team|engineering team|build leader|開発チーム|実装チーム|ビルドリーダー)/i.test(text)) push('build_team_leader');
  if (/(?:\bcto\b|chief technology|technical leader|ctoリーダー|技術責任者|開発責任者)/i.test(text)) push('cto_leader');
  if (/(?:\bcpo\b|chief product|product leader|cpoリーダー|プロダクト責任者)/i.test(text)) push('cpo_leader');
  if (/(?:\bcfo\b|chief financial|finance leader|cfoリーダー|財務責任者)/i.test(text)) push('cfo_leader');
  if (/(legal leader|legal counsel|compliance leader|法務リーダー|legalリーダー|法務責任者)/i.test(text)) push('legal_leader');
  if (/(fix|bug|debug|実装|修正|コード|\bapi\b|server|worker|deploy|billing|\bui\b)/i.test(text)) push('code');
  if (/(competitor|teardown|benchmark|positioning|vs\.?|競合分析|競合比較|ベンチマーク|ポジショニング)/i.test(text)) push('teardown');
  if (/(landing page critique|lp critique|hero section|cta|コンバージョン|ファーストビュー|lp改善|ランディングページ改善)/i.test(text)) push('landing');
  if (/(acquisition automation|customer acquisition automation|lead gen automation|lead generation automation|outreach automation|crm automation|pipeline automation|reply handling|follow[-\s]?up automation|集客自動化|リード獲得.*自動化|見込み客.*自動化|営業.*自動化|CRM.*自動化|フォローアップ.*自動化|返信.*自動化|パイプライン.*自動化)/i.test(text)) push('acquisition_automation');
  if (isListCreatorIntentText('', text)) push('list_creator');
  if (isMediaPlannerIntentText('', text)) push('media_planner');
  if (isDirectorySubmissionIntentText('', text)) push('directory_submission');
  if (isCitationOpsIntentText('', text)) push('citation_ops');
  if (/(instagram|insta|ig\b|インスタ|インスタグラム|reel|carousel|story|ストーリー|リール|カルーセル)/i.test(text)) push('instagram');
  if (/(x\.com|\bx post\b|\bx posts\b|twitter|tweet|tweets|ツイート|x投稿|ポスト|スレッド)/i.test(text)) push('x_post');
  if (/(reddit|subreddit|redditor|レディット|サブレディット)/i.test(text)) push('reddit');
  if (/(indie hackers|indiehackers|ih post|インディーハッカー|インディーハッカーズ)/i.test(text)) push('indie_hackers');
  if (/(data analysis|analytics|metrics|kpi|dashboard|cohort|funnel analysis|データ分析|アクセス解析|指標|計測|ファネル|登録率|cv率)/i.test(text)) push('data_analysis');
  if (/(growth|go[-\s]?to[-\s]?market|gtm|acquisition|activation|retention|signup|signups|more users|outreach|community|product hunt|marketing|sales|revenue|more money|売上|収益|集客|登録数|会員登録|ユーザー獲得|マーケ|営業|グロース|プロダクトハント)/i.test(text)) push('growth');
  if (/(seo|meta|description|title|検索|流入)/i.test(text)) push('seo');
  if (/(listing|出品|商品ページ|rakuma|yahoo|mercari|amazon|楽天)/i.test(text)) push('listing');
  if (/(write|copy|lp|記事|文章|ライティング|copywriting|landing page)/i.test(text)) push('writing');
  if (/(ops|運用|ルーティング|dispatch|broker|observability|monitoring)/i.test(text)) push('ops');
  if (/(automation|workflow|scheduled|bot|自動化|orchestrat)/i.test(text)) push('automation');
  if (/(translation|localization|i18n|翻訳|多言語)/i.test(text)) push('translation');
  if (/(summary|要約|まとめ|recap|digest)/i.test(text)) push('summary');
  if (/(research|compare|analysis|investigate|市場|比較|調査|戦略)/i.test(text)) push('research');
  if (!ordered.length) push('research');
  const primary = ordered[0] || 'research';
  if (primary === 'research_team_leader') {
    ['research', 'teardown', 'diligence', 'data_analysis', 'summary'].forEach(push);
  }
  if (primary === 'build_team_leader') {
    ['code', 'debug', 'ops', 'automation', 'summary'].forEach(push);
  }
  if (primary === 'cto_leader') {
    ['code', 'debug', 'ops', 'automation', 'summary'].forEach(push);
  }
  if (primary === 'cpo_leader') {
    ['validation', 'landing', 'research', 'data_analysis', 'summary'].forEach(push);
  }
  if (primary === 'cfo_leader') {
    ['pricing', 'data_analysis', 'diligence', 'summary'].forEach(push);
  }
  if (primary === 'legal_leader') {
    ['diligence', 'summary'].forEach(push);
  }
  if (primary === 'research') push('summary');
  if (primary === 'seo') {
    push('research');
    push('writing');
  }
  if (primary === 'writing') {
    push('research');
    push('summary');
  }
  if (primary === 'media_planner') {
    push('directory_submission');
    push('citation_ops');
    push('growth');
    push('data_analysis');
  }
  if (primary === 'citation_ops') {
    push('directory_submission');
    push('seo');
    push('data_analysis');
  }
  if (primary === 'acquisition_automation') {
    push('growth');
    push('writing');
    push('data_analysis');
  }
  if (primary === 'directory_submission') {
    push('growth');
    push('writing');
    push('data_analysis');
  }
  if (primary === 'listing') {
    push('research');
    push('seo');
  }
  if (primary === 'code') push('debug');
  if (primary === 'ops') push('automation');
  if (primary === 'translation') push('summary');
  if (ordered.includes('research')) push('summary');
  if (ordered.includes('seo')) push('writing');
  return ordered.slice(0, 3);
}

export function inferPrimaryTaskSequence(taskType, prompt = '') {
  const explicit = String(taskType || '').trim().toLowerCase();
  const text = openChatIntentMatchText(prompt);
  const ordered = [];
  const push = (value) => {
    const safe = String(value || '').trim().toLowerCase();
    if (!safe || ordered.includes(safe)) return;
    ordered.push(safe);
  };
  if (explicit) push(explicit);
  const structuredTask = explicit ? '' : (String(prompt || '').match(/^Task:\s*([a-z_ -]+)/im)?.[1] || '').trim().toLowerCase();
  if (structuredTask) push(structuredTask);
  if (/(research team|analysis team|decision team|research leader|調査チーム|分析チーム|調査リーダー|リサーチリーダー)/i.test(text)) push('research_team_leader');
  if (/(build team|coding team|implementation team|engineering team|build leader|開発チーム|実装チーム|ビルドリーダー)/i.test(text)) push('build_team_leader');
  if (/(?:\bcto\b|chief technology|technical leader|ctoリーダー|技術責任者|開発責任者)/i.test(text)) push('cto_leader');
  if (/(?:\bcpo\b|chief product|product leader|cpoリーダー|プロダクト責任者)/i.test(text)) push('cpo_leader');
  if (/(?:\bcfo\b|chief financial|finance leader|cfoリーダー|財務責任者)/i.test(text)) push('cfo_leader');
  if (/(legal leader|legal counsel|compliance leader|法務リーダー|legalリーダー|法務責任者)/i.test(text)) push('legal_leader');
  if (/(fix|bug|debug|実装|修正|コード|\bapi\b|server|worker|deploy|billing|\bui\b)/i.test(text)) push('code');
  if (/(competitor|teardown|benchmark|positioning|vs\.?|競合分析|競合比較|ベンチマーク|ポジショニング)/i.test(text)) push('teardown');
  if (/(landing page critique|lp critique|hero section|cta|コンバージョン|ファーストビュー|lp改善|ランディングページ改善)/i.test(text)) push('landing');
  if (/(acquisition automation|customer acquisition automation|lead gen automation|lead generation automation|outreach automation|crm automation|pipeline automation|reply handling|follow[-\s]?up automation|集客自動化|リード獲得.*自動化|見込み客.*自動化|営業.*自動化|CRM.*自動化|フォローアップ.*自動化|返信.*自動化|パイプライン.*自動化)/i.test(text)) push('acquisition_automation');
  if (/(instagram|insta|ig\b|インスタ|インスタグラム|reel|carousel|story|ストーリー|リール|カルーセル)/i.test(text)) push('instagram');
  if (/(x\.com|\bx post\b|\bx posts\b|twitter|tweet|tweets|ツイート|x投稿|ポスト|スレッド)/i.test(text)) push('x_post');
  if (/(reddit|subreddit|redditor|レディット|サブレディット)/i.test(text)) push('reddit');
  if (/(indie hackers|indiehackers|ih post|インディーハッカー|インディーハッカーズ)/i.test(text)) push('indie_hackers');
  if (/(data analysis|analytics|metrics|kpi|dashboard|cohort|funnel analysis|データ分析|アクセス解析|指標|計測|ファネル|登録率|cv率)/i.test(text)) push('data_analysis');
  if (/(growth|go[-\s]?to[-\s]?market|gtm|acquisition|activation|retention|signup|signups|more users|outreach|community|product hunt|marketing|sales|revenue|more money|売上|収益|集客|登録数|会員登録|ユーザー獲得|マーケ|営業|グロース|プロダクトハント)/i.test(text)) push('growth');
  if (/(seo|meta|description|title|検索|流入)/i.test(text)) push('seo');
  if (/(listing|出品|商品ページ|rakuma|yahoo|mercari|amazon|楽天)/i.test(text)) push('listing');
  if (/(write|copy|lp|記事|文章|ライティング|copywriting|landing page)/i.test(text)) push('writing');
  if (/(ops|運用|ルーティング|dispatch|broker|observability|monitoring)/i.test(text)) push('ops');
  if (/(automation|workflow|scheduled|bot|自動化|orchestrat)/i.test(text)) push('automation');
  if (/(translation|localization|i18n|翻訳|多言語)/i.test(text)) push('translation');
  if (/(research|compare|analysis|investigate|市場|比較|調査|戦略)/i.test(text)) push('research');
  if (!ordered.length && text) push(inferClientTaskSequence(explicit, text)[0] || 'research');
  if (!ordered.length) push(explicit || 'research');
  return ordered.slice(0, 3);
}
