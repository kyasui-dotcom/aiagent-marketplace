function clipText(value, max = 160) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length <= max ? text : `${text.slice(0, max - 1)}...`;
}

function markdownTableCell(value = '', max = 220) {
  return clipText(value, max).replace(/\|/g, '/').replace(/\n+/g, ' ');
}

function normalizeEvidenceUrl(value = '') {
  const text = String(value || '').trim().replace(/[)\].,;、。]+$/u, '');
  if (!/^https?:\/\//i.test(text)) return '';
  try {
    const parsed = new URL(text);
    if (!parsed.hostname.includes('.')) return '';
    parsed.hostname = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}

function evidenceHost(value = '') {
  try {
    return new URL(normalizeEvidenceUrl(value)).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

function isInternalOrInstructionEvidence(item = {}, context = {}) {
  const title = String(item?.title || '').trim();
  const url = normalizeEvidenceUrl(item?.url || '');
  const signal = String(item?.signal || item?.snippet || item?.description || '').trim();
  const text = `${title} ${url} ${signal}`;
  const host = evidenceHost(url);
  const targetHost = evidenceHost(context.url || '');
  if (!url) return true;
  if (targetHost && host === targetHost) return true;
  if (/(delivery|deliverable|handoff|specialist|source URL found in|search query|query:|cmo team leader|research delivery|growth operator|landing-page-critique|list-creator)/i.test(text)) return true;
  if (/^(research|teardown|data_analysis|growth|media_planner|landing|seo_gap|writing|writer|directory_submission|x_post|reddit|acquisition_automation)$/i.test(title)) return true;
  return false;
}

function companyNameFromEvidence(item = {}, url = '') {
  const title = String(item?.title || '').trim();
  const host = evidenceHost(url);
  const fromTitle = title
    .replace(/\s*[-|:]\s*(公式|official|homepage|home|pricing|case study|事例|導入事例|採用|recruit|review|reviews|alternatives?|directory|listing).*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (fromTitle && !/^(source|website|homepage|official)$/i.test(fromTitle)) return fromTitle;
  return host || '';
}

export function cmoLocalizedIcp(value = '', isJapanese = false) {
  const text = String(value || '').trim();
  if (!isJapanese) return text || 'user-specified audience';
  if (/small businesses|local operators/i.test(text)) return '中小企業・店舗の集客担当/事業者';
  if (/engineers|developers/i.test(text)) return 'エンジニア/開発者';
  if (/sales teams/i.test(text)) return '営業チーム';
  if (/marketers|growth teams/i.test(text)) return 'マーケティング/グロース担当';
  if (/founders|builders/i.test(text)) return '創業者/事業責任者';
  if (/local customers/i.test(text)) return '地域顧客';
  if (/user-specified/i.test(text)) return '入力で指定された対象顧客';
  return text || '入力で指定された対象顧客';
}

export function cmoLocalizedConversion(value = '', isJapanese = false) {
  const text = String(value || '').trim();
  if (!isJapanese) return text || 'user-specified primary conversion';
  if (/account signups/i.test(text)) return '会員登録';
  if (/qualified leads|inquiries/i.test(text)) return '問い合わせ/商談化';
  if (/purchase|paid conversion/i.test(text)) return '購入/有料化';
  if (/user-specified/i.test(text)) return '入力で指定された主要CV';
  return text || '入力で指定された主要CV';
}

function cmoEvidenceSignalSummary(items = [], isJapanese = false) {
  const text = (Array.isArray(items) ? items : [])
    .map((item) => `${item.title || ''} ${item.signal || ''} ${item.url || ''}`)
    .join(' ');
  const signals = [];
  const add = (ja, en) => signals.push(isJapanese ? ja : en);
  if (/チラシ|flyer|配布|print|印刷/i.test(text)) add('チラシ/印刷/配布の需要が見えるため、抽象的な認知施策より「用途別の発注・見積もり・配布」導線を優先する。', 'Flyer, print, or distribution signals suggest prioritizing use-case order, quote, and delivery paths over generic awareness.');
  if (/中小企業|small business|local|店舗|商売/i.test(text)) add('中小企業・店舗向けの文脈があるため、専門用語より「今日の集客にどう効くか」を先に出す。', 'Small-business or local-operator signals mean the message should lead with immediate commercial impact, not platform jargon.');
  if (/商品一覧|products?|category|サービス/i.test(text)) add('商品/サービス一覧があるため、LPは1枚完結ではなくカテゴリ別の次アクションへ分岐させる。', 'Product/category signals mean the page should branch into category-specific next actions rather than a single generic CTA.');
  if (/集客方法|how to attract|guide|magazine|column|SEO|検索/i.test(text)) add('検索意図のあるコンテンツがあるため、SEO記事からCVページへ内部リンクを渡す構成にする。', 'Search-intent content signals mean the SEO page should hand users into a conversion page through internal links.');
  if (/会社|corp|about|press|news|導入|case|事例/i.test(text)) add('会社情報・プレス・事例は信頼補強に使い、CV主導ページの主役にはしない。', 'Corporate, press, or case-study pages should support trust, not replace the conversion page.');
  if (!signals.length) add('入力とソースから、最初の施策は1つの高意図ページと1つの検証チャネルに絞る。', 'The source/input pattern supports one high-intent page plus one validation channel first.');
  return signals.slice(0, 5);
}

function cmoGenericEvidenceTable(items = [], isJapanese = false) {
  const rows = (Array.isArray(items) ? items : []).slice(0, 6);
  if (!rows.length) {
    return isJapanese
      ? '検証済みの検索/受け渡しソースがありません。次回は検索結果URL、競合URL、既存LP、媒体候補を渡すと精度が上がります。'
      : 'No verified search or handoff source bundle is available. Add search-result URLs, competitor URLs, the current page, and candidate channels for a stronger next pass.';
  }
  return [
    '| Source | Signal used | Decision impact |',
    '| --- | --- | --- |',
    ...rows.map((item) => {
      const text = `${item.title || ''} ${item.signal || ''}`;
      const impact = /チラシ|印刷|配布|flyer|print/i.test(text)
        ? (isJapanese ? '用途別LP/見積CTA/配布導線へ反映' : 'Use-case page, quote CTA, and delivery path')
        : /商品|products?|category|サービス/i.test(text)
          ? (isJapanese ? 'カテゴリ別導線と内部リンクへ反映' : 'Category branching and internal links')
          : /集客|SEO|検索|magazine|column/i.test(text)
            ? (isJapanese ? 'SEO記事からCVページへ送客' : 'SEO-to-conversion-page flow')
            : (isJapanese ? '訴求、証拠、CTAの制約に使う' : 'Constrain positioning, proof, and CTA');
      return `| ${markdownTableCell(item.title || item.url || 'source', 120)} | ${markdownTableCell(item.signal || item.url || item.title, 220)} | ${markdownTableCell(impact, 140)} |`;
    })
  ].join('\n');
}

function cmoListCreatorRows(evidenceItems = [], context = {}, isJapanese = false) {
  const rows = [];
  const sourceItems = (Array.isArray(evidenceItems) ? evidenceItems : [])
    .map((item) => ({ ...item, url: normalizeEvidenceUrl(item?.url || '') }))
    .filter((item) => !isInternalOrInstructionEvidence(item, context));
  sourceItems.slice(0, 8).forEach((item, index) => {
    const title = String(item?.title || item?.url || `candidate ${index + 1}`).trim();
    const url = normalizeEvidenceUrl(item?.url || '');
    const signal = String(item?.signal || item?.snippet || item?.description || title).trim();
    const companyName = companyNameFromEvidence(item, url)
      || `Candidate ${index + 1}`;
    rows.push({
      companyName,
      website: url,
      whyFit: signal || (isJapanese ? `${context.icp} に近い公開シグナル` : `Public signal near ${context.icp}`),
      observedSignal: signal || title,
      targetRole: isJapanese ? 'マーケ/事業責任者または該当部門責任者' : 'Marketing, growth, business owner, or relevant department lead',
      contactPath: isJapanese ? '公開問い合わせフォームまたは会社サイトの公開連絡先を確認' : 'Verify public contact form or company-site contact path',
      sourceUrl: url,
      angle: isJapanese
        ? `${context.product} の ${cmoLocalizedConversion(context.conversion, true)} に近い課題を、公開情報の語彙で個別化`
        : `Personalize around the public signal and ${context.product}'s ${cmoLocalizedConversion(context.conversion, false)} goal`,
      note: isJapanese ? '人手レビュー後に送信可否を判断' : 'Review manually before outreach'
    });
  });
  return rows;
}

function cmoListCreatorRowsMarkdown(evidenceItems = [], context = {}, isJapanese = false) {
  const rows = cmoListCreatorRows(evidenceItems, context, isJapanese);
  const header = '| # | company_name | website | why_fit | observed_signal | target_role_hypothesis | public_email_or_contact_path | contact_source_url | company_specific_angle | review_note |';
  if (!rows.length) {
    const blocker = isJapanese
      ? {
          companyName: 'BLOCKED_MISSING_SOURCE_ROWS',
          website: 'source_required',
          whyFit: 'research/teardownから会社URL・媒体URL・公開接点が渡っていないため送信候補行は作らない',
          observedSignal: 'search query、delivery title、handoff summaryは会社行として扱わない',
          targetRole: 'source_required',
          contactPath: 'public_contact_required',
          sourceUrl: 'source_required',
          angle: '実在する公開URLが渡った後に会社別angleを作る',
          note: 'research層で候補会社/媒体の公開URLを取得してから再実行'
        }
      : {
          companyName: 'BLOCKED_MISSING_SOURCE_ROWS',
          website: 'source_required',
          whyFit: 'No company, media, or public-contact URLs were handed off from research/teardown, so do not fabricate lead rows.',
          observedSignal: 'Search queries, delivery titles, and handoff summaries are not companies.',
          targetRole: 'source_required',
          contactPath: 'public_contact_required',
          sourceUrl: 'source_required',
          angle: 'Create company-specific angles only after real public URLs are handed off.',
          note: 'Run/source the research layer for candidate public URLs before outreach preparation.'
        };
    return [
      header,
      '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
      `| 0 | ${markdownTableCell(blocker.companyName, 80)} | ${markdownTableCell(blocker.website, 110)} | ${markdownTableCell(blocker.whyFit, 160)} | ${markdownTableCell(blocker.observedSignal, 160)} | ${markdownTableCell(blocker.targetRole, 100)} | ${markdownTableCell(blocker.contactPath, 120)} | ${markdownTableCell(blocker.sourceUrl, 130)} | ${markdownTableCell(blocker.angle, 160)} | ${markdownTableCell(blocker.note, 110)} |`
    ].join('\n');
  }
  return [
    header,
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map((row, index) => `| ${index + 1} | ${markdownTableCell(row.companyName, 80)} | ${markdownTableCell(row.website, 110)} | ${markdownTableCell(row.whyFit, 160)} | ${markdownTableCell(row.observedSignal, 160)} | ${markdownTableCell(row.targetRole, 100)} | ${markdownTableCell(row.contactPath, 120)} | ${markdownTableCell(row.sourceUrl, 130)} | ${markdownTableCell(row.angle, 160)} | ${markdownTableCell(row.note, 110)} |`)
  ].join('\n');
}

function cmoListCreatorArtifactMarkdown(context = {}, evidenceItems = [], isJapanese = false) {
  const conversion = cmoLocalizedConversion(context.conversion, isJapanese);
  const icp = cmoLocalizedIcp(context.icp, isJapanese);
  const rows = cmoListCreatorRowsMarkdown(evidenceItems, context, isJapanese);
  if (isJapanese) {
    return `## List Creatorの位置づけ
この担当は調査層ではなく、planning後の実行準備層です。search/research/teardown/data_analysis/media_planner から渡された情報を使い、送信前レビューできる候補行へ変換します。

## リスト作成方針
| 項目 | 内容 |
| --- | --- |
| ICP | ${icp} |
| 目的 | ${conversion} に近い会社・媒体・接点候補を人手レビューできる形へ整理 |
| 件数 | 初回は最大8件のreviewable shortlist。拡張時は20件batchで追加 |
| contact rule | 公開メール、問い合わせフォーム、公開プロフィールのvisible contact pathのみ。個人メール推測や購入リストは禁止 |
| next handoff | cold_email / email_ops / directory_submission / manual review |

## Reviewable lead rows
${rows}

## Import-ready field map
| CRM/import field | Source field |
| --- | --- |
| company_name | company_name |
| website | website |
| source_url | contact_source_url |
| persona_note | target_role_hypothesis |
| personalization_seed | observed_signal + company_specific_angle |
| review_status | review_note |

## 品質チェック
- contact_source_url が source_required の行は送信対象にしない。
- 送信、import、DM、投稿はこのagentでは実行しない。
- リーダーはこのリストを確認し、承認済み行だけを次の実行agentへ渡す。`;
  }
  return `## List Creator role
This is not the research/search layer. It is the execution-preparation layer after planning: convert research, teardown, data, and media-planning handoff into reviewable rows for the next operator.

## List-building rules
| Field | Value |
| --- | --- |
| ICP | ${icp} |
| Objective | Prepare reviewable company/source rows that can move toward ${conversion} |
| Count | First shortlist up to 8 rows; expand in 20-company batches |
| Contact rule | Public work email, contact form, team page, or visible public contact path only. No guessed personal emails or purchased lists |
| Next handoff | cold_email / email_ops / directory_submission / manual review |

## Reviewable lead rows
${rows}

## Import-ready field map
| CRM/import field | Source field |
| --- | --- |
| company_name | company_name |
| website | website |
| source_url | contact_source_url |
| persona_note | target_role_hypothesis |
| personalization_seed | observed_signal + company_specific_angle |
| review_status | review_note |

## Quality checks
- Rows without a verified contact_source_url are not send-ready.
- This agent does not send, import, DM, or post.
- The leader should approve rows before passing them to an execution agent.`;
}

function cmoJapaneseArtifactMarkdown(normalizedKind = '', context = {}, evidenceItems = []) {
  const product = context.product;
  const conversion = cmoLocalizedConversion(context.conversion, true);
  const icp = cmoLocalizedIcp(context.icp, true);
  const channel = context.primaryLane;
  const evidenceSignals = cmoEvidenceSignalSummary(evidenceItems, true);
  if (normalizedKind === 'list_creator') return cmoListCreatorArtifactMarkdown(context, evidenceItems, true);
  if (normalizedKind === 'research' || normalizedKind === 'teardown' || normalizedKind === 'data_analysis') {
    return `## 調査からの判断
${evidenceSignals.map((item) => `- ${item}`).join('\n')}

## 顧客・訴求仮説
| 項目 | 仮説 |
| --- | --- |
| Primary audience | ${icp} |
| Trigger | 今すぐ集客/比較/発注/問い合わせを進めたい場面 |
| Main objection | 効果、費用、手間、実行後の成果が見えないこと |
| Proof to show | 価格/納期/実績/手順/対象業種/失敗しない選び方 |
| Conversion path | 検索意図ページ -> 用途別説明 -> ${conversion} |

## 3C診断と改善方向
| 3C | 観測事実 | 意味 | 当該サービスの課題 | 改善方向 | 具体施策 | KPI |
| --- | --- | --- | --- | --- | --- | --- |
| Company | ${product} の ${conversion} が目的 | 流入量だけでなく、訴求/証拠/CTA/計測を揃える必要がある | 次の行動と成果がCV前に伝わり切らない可能性 | ホーム/主要LPのCV導線を先に直す | hero、CTA pair、proof、FAQ、event名を作る | CTA click、${conversion} |
| Customer | ${icp} は比較・検討・発注に近い場面で情報を探す | 技術適合、用途、証拠、実行後の流れが判断材料になる | 一般説明だけでは選ぶ理由が弱い | 比較基準と導入イメージをページ内で明示 | keyword map、比較表、FAQ、CTA path | organic click、CTA到達 |
| Competitor | 競合/上位は証拠、比較、FAQ、用途を見せる | 証拠密度でCV前の不安を減らしている | 証拠や不安解消が薄いと離脱する | 比較・証明型ページとlisting packetを準備 | SEO page、agent detail proof、directory copy | referral session、signup by source |

## 優先改善提案トップ3
| Priority | Recommendation | Impact | Effort | First action | Stop rule |
| --- | --- | --- | --- | --- | --- |
| 1 | ホーム/主要LPのCV導線修正 | High | Medium | hero、CTA、proof、FAQ、event名を1枚のbrief化 | CV仮説が書けなければ媒体拡大しない |
| 2 | 比較・証明型SEOページ作成 | High | Medium | H1/H2、比較表、FAQ、CTA pathを作る | 証拠blockなしなら公開しない |
| 3 | referral/directory掲載準備 | Medium | Low-Medium | 掲載候補、紹介文、スクショ、UTM、承認チェックを作る | LP未修正なら掲載実行を保留 |

## Preparation層へのhandoff
- prepare_homepage_conversion: homepage hero、CTA buttons、trackingへ反映。
- prepare_seo_landing_page: new SEO page、internal links、metadataへ反映。
- prepare_referral_directory_packet: LP ready後にreferral URLと掲載文へ反映。

## 次の計画へ渡すこと
- 媒体は ${channel} を主軸にし、外部SNSは行き先ページが整ってから検証する。
- CTAは「登録」だけでなく、見積もり、問い合わせ、資料請求、注文開始など商材に合う低摩擦行動へ置き換える。
- 計画agentは、この調査表の source/decision impact を使って媒体順序を決める。`;
  }
  if (normalizedKind === 'media_planner') {
    return `## Decision first
| Priority | Action | Why now | App/site change | Preparation artifact | KPI | Stop rule |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | ホーム/主要LPのCV導線修正 | ${conversion} が増える前提を作る。媒体追加より受け皿が先 | hero、CTA、proof、FAQ、tracking | prepare_homepage_conversion | CTA click / ${conversion} | CV仮説が書けなければ媒体拡大しない |
| 2 | owned/searchの比較・証明ページ作成 | 検索/比較意図を受け止めやすい | H1、meta、比較表、FAQ、内部リンク | prepare_seo_landing_page | organic click / CTA到達 | 証拠blockとCTAがなければ公開しない |
| 3 | directory/comparison掲載準備 | カテゴリ検索と比較面は相性が良いが受け皿後に実行 | 掲載文、スクショ、UTM付きURL | prepare_referral_directory_packet | referral session / ${conversion} by source | LP未修正なら掲載実行を保留 |

## なぜこの3つを選ぶか
- ${channel} は主軸候補だが、実行前に「どのページへ送り、何をCVとして測るか」を固定する必要がある。
- community/socialは反応語彙収集に使えるが、行き先ページと証拠が弱いと成果に接続しにくい。
- email/CRMはconsent済みセグメントがある場合だけ有効で、初回優先にはしない。

## Media-fit analysis
| 優先 | 媒体 | 判定 | スコア理由 | 実行前に必要なもの |
| --- | --- | --- | --- | --- |
| 1 | homepage/CV destination | execute_now | ${conversion} への近さが最も高く全媒体の受け皿になる | 入口URL、主CTA、証拠block、計測event |
| 2 | owned/search page | execute_now | 検索意図と比較検討を受け止めやすい | H1、FAQ、内部リンク、UTM |
| 3 | directory/comparison | prepare_first | カテゴリ検索がある商材なら高効率 | 掲載文、スクリーンショット、価格/カテゴリfields |
| 4 | community/social | wait or narrow prepare | 反応語彙収集に向くが、規約/宣伝感/アカウント文脈の確認が必要 | exact copy、投稿先、SaaS/copy-paste手順、stop rule |
| 5 | email/CRM | avoid_now unless consented | consentなしでは実行不可 | segment、sender、suppression、配信承認 |

## Readiness scorecard
| Criterion | Current read | Decision impact |
| --- | --- | --- |
| Audience intent | ${icp} が比較・検討・発注に近い場所を優先 | 低意図SNSより検索/比較/既存導線を先にする |
| Proof/assets | 実績、画面、価格、手順が不足しやすい | 必要artifactを出せるpreparation capabilityで先に補う |
| SaaS app readiness | 投稿・送信・掲載はSaaS上の承認packetまたは手動コピペ導線が必要 | action層ではmanifest適合したSaaS appリンクを提示する |
| Policy risk | コミュニティ投稿、メール、掲載は規約差が大きい | rule check と exact copy approval を必須にする |

## Preparation layer tasks
| Task | Input | Output | Must reflect into app |
| --- | --- | --- | --- |
| prepare_homepage_conversion | 現行LP、ICP、${conversion}、証拠素材 | hero、subcopy、CTA pair、proof、FAQ、event名 | homepage hero、CTA、tracking |
| prepare_seo_landing_page | 検索意図、比較語彙、CTA | keyword map、H1/H2、比較表、FAQ、meta | new SEO page、internal links、metadata |
| prepare_referral_directory_packet | 掲載候補、カテゴリ、スクショ、URL | listing copy、field map、UTM、approval checklist | LP ready後のreferral URLと掲載文 |

## SaaS handoff plan
- conversion-page/search-page capability: H1、導線、FAQ、内部リンク、proof blockを作る。
- listing/community capability: 選ばれた1媒体だけ exact copy、UTM、投稿先rule check、SaaS/copy-paste手順を作る。
- directory系: カテゴリ/掲載条件に合う候補だけをmanifest適合SaaS app用packet化する。
- data_analysis: データがある場合だけ referral、CV開始、CV完了を媒体別に見る。

## App/site reflection plan
- homepage: hero、CTA、proof、FAQ、event tracking。
- SEO landing page: H1/meta、比較表、FAQ、内部リンク。
- referral URL: directory掲載用UTMを付け、LP修正後に使う。

## Ask user before action
- どの媒体を最初に実行するか、またはMedia Plannerの上位候補をまとめて承認するか。
- SaaSで開くpacket、URL、exact copy、投稿先、停止条件。
- GA4/Search Consoleなどのデータがない場合は、データ分析を待たずに簡易UTMと手動statusで進めるか。`;
  }
  if (normalizedKind === 'x_post' || normalizedKind === 'reddit' || normalizedKind === 'indie_hackers') {
    const destination = `${context.url || product}${String(context.url || product).includes('?') ? '&' : '?'}utm_source=${normalizedKind === 'x_post' ? 'x' : normalizedKind}&utm_medium=social&utm_campaign=first_growth_action`;
    const exactCopy = `${product} は、${icp} が迷わず${conversion}へ進めるように、用途・証拠・次の行動を1つの導線に整理しています。媒体を増やす前に、まず ${channel} で反応語彙を検証します。`;
    return `## 投稿ドラフト
1. ${exactCopy}
2. 集客施策は媒体を増やす前に、検索で来た人が迷わず次の行動へ進めるページが必要です。${product} はまず用途、証拠、CTAを整理してから外部投稿へ回します。
3. ${icp} 向けに、情報収集から${conversion}までの摩擦を減らす導線を作っています。見積もり/相談/注文開始のどこが一番自然かを検証します。

## 承認packet
| Field | Value |
| --- | --- |
| target_surface | ${normalizedKind === 'reddit' ? 'Reddit copy/paste draft' : normalizedKind === 'indie_hackers' ? 'Indie Hackers copy/paste draft' : 'manifest-matched SaaS app draft'} |
| exact_copy | ${exactCopy} |
| destination | ${destination} |
| CTA | ${conversion}へ進む |
| approval | target_surface、exact_copy、destination、停止条件をSaaS上で提示してユーザー承認 |
| stop rule | 24-48時間で反応語彙が取れなければ投稿追加ではなくLPコピーを修正 |`;
  }
  return `## 7日実行スプリント
| Day | Action | Artifact |
| --- | --- | --- |
| 1 | ソースで見えた用途/悩みを1ページに整理 | H1、リード、CTA、FAQ |
| 2 | CV導線を1つに絞る | ${conversion} 用の主CTAと補助CTA |
| 3 | 既存コンテンツ/カテゴリから内部リンクを追加 | search -> landing -> conversion の導線 |
| 4 | X/コミュニティ投稿を1本だけ出す準備 | exact copy + UTM |
| 5 | 流入とCV開始を確認 | referral、primary intent、${conversion} |
| 6 | 反応語彙をLPへ戻す | revised headline / FAQ |
| 7 | 継続媒体を1つに決める | continue/stop decision |

## そのまま使う制作物
| Surface | Draft |
| --- | --- |
| H1 | ${icp}向けに、${product}で集客の次アクションをすぐ決める |
| Lead | 用途、費用感、実行手順、証拠を1画面で確認し、迷わず${conversion}へ進める導線を作ります。 |
| Primary CTA | ${conversion}へ進む |
| Secondary CTA | 用途別のサービスを見る |
| FAQ | どの用途に向いていますか？ / 費用と手間はどれくらいですか？ / 実行後に何を測ればよいですか？ |
| X draft | 媒体を増やす前に、検索で来た人が次の行動を迷わないページを作る。${product} はまず用途、証拠、CTAを整理して ${conversion} までの摩擦を減らします。 |

## 承認packet
| Field | Value |
| --- | --- |
| Owner | CMO leader -> ${normalizedKind} |
| Artifact | LPコピー、投稿文、UTM、計測イベント、manifest-matched SaaS app packet |
| Approval owner | Operator |
| Metric | ${conversion}, referral source, primary intent event |
| Stop rule | 7日で反応が弱ければ媒体追加ではなくH1/CTA/証拠を修正 |`;
}

function cmoEnglishArtifactMarkdown(normalizedKind = '', context = {}, evidenceItems = []) {
  const product = context.product;
  const conversion = cmoLocalizedConversion(context.conversion, false);
  const icp = cmoLocalizedIcp(context.icp, false);
  const channel = context.primaryLane;
  const evidenceSignals = cmoEvidenceSignalSummary(evidenceItems, false);
  if (normalizedKind === 'list_creator') return cmoListCreatorArtifactMarkdown(context, evidenceItems, false);
  if (normalizedKind === 'research' || normalizedKind === 'teardown' || normalizedKind === 'data_analysis') {
    const sectionTitle = normalizedKind === 'teardown'
      ? 'Competitor and alternative readout'
      : normalizedKind === 'data_analysis'
        ? 'Measurement readout'
        : 'Acquisition research readout';
    return `## ${sectionTitle}
${evidenceSignals.map((item) => `- ${item}`).join('\n')}

## Customer and positioning hypothesis
| Field | Working read |
| --- | --- |
| Primary audience | ${icp} |
| Conversion | ${conversion} |
| Trigger to test | A moment where the audience is already comparing options, looking for a workflow, or deciding the next action |
| Likely objection | Unclear proof, unclear effort, unclear outcome after the conversion step |
| Proof to prepare | Product flow, sample output, comparison criteria, pricing/friction notes, implementation steps, or real use-case examples |

## 3C diagnosis and improvement directions
| 3C | Evidence | Interpretation | Problem for this service | Improvement direction | Specific actions | KPI |
| --- | --- | --- | --- | --- | --- | --- |
| Company | ${product} is trying to grow ${conversion}. | Traffic alone will not solve weak promise, proof, CTA, or measurement. | Users may not understand the outcome or next step before the CTA. | Repair the homepage/main destination conversion path first. | Create hero, CTA pair, proof block, FAQ, and event names. | CTA click, ${conversion} |
| Customer | ${icp} are likely comparing options or looking for implementation confidence. | Technical fit, use case, proof, and next-step clarity drive trust. | Generic marketplace copy does not give enough reason to choose. | Show comparison criteria and adoption flow on the page. | Build keyword map, comparison table, FAQ, and CTA path. | organic click, CTA reach |
| Competitor | Alternatives tend to show proof, comparisons, FAQs, and use cases. | Proof density reduces pre-CTA uncertainty. | Weak proof and objection handling can leak intent. | Build a comparison/proof page plus listing packet. | SEO page, agent-detail proof, directory copy. | referral session, signup by source |

## Top 3 prioritized recommendations
| Priority | Recommendation | Impact | Effort | First action | Stop rule |
| --- | --- | --- | --- | --- | --- |
| 1 | Repair the homepage/main CV path | High | Medium | Draft hero, CTA, proof, FAQ, and event names. | Do not expand media if the conversion-path hypothesis is unclear. |
| 2 | Create one comparison/proof SEO page | High | Medium | Create H1/H2, comparison table, FAQ, and CTA path. | Do not publish without proof blocks. |
| 3 | Prepare referral/directory listing packet | Medium | Low-Medium | Create listing targets, description, screenshots, UTM, and approval checklist. | Hold submissions until LP repair is done. |

## Preparation-layer handoff
- prepare_homepage_conversion: reflect into homepage hero, CTA buttons, and tracking.
- prepare_seo_landing_page: reflect into a new SEO page, internal links, and metadata.
- prepare_referral_directory_packet: reflect into referral URL and listing copy after LP readiness.

## Handoff to planning
- Choose one channel where the audience already has intent instead of spreading across every possible channel.
- Ask the planning layer to name the exact destination page, traffic source, message angle, conversion event, and stop rule.
- Treat missing analytics, claims, screenshots, or app-handoff readiness as blockers, not as reasons to invent proof.`;
  }
  if (normalizedKind === 'media_planner') {
    return `## Decision first
| Priority | Action | Why now | App/site change | Preparation artifact | KPI | Stop rule |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Repair the homepage/main CV path | Create the condition for ${conversion}; destination clarity comes before channel expansion. | hero, CTA, proof, FAQ, tracking | prepare_homepage_conversion | CTA click / ${conversion} | Stop expansion if the conversion-path hypothesis is unclear. |
| 2 | Build one owned/search comparison page | Captures search and comparison intent before broad promotion. | H1/meta, comparison table, FAQ, internal links | prepare_seo_landing_page | organic click / CTA reach | Do not publish without proof blocks and CTA path. |
| 3 | Prepare directory/comparison listing packet | High leverage when the category has active discovery, but only after the destination is ready. | listing copy, screenshots, UTM destination | prepare_referral_directory_packet | referral session / ${conversion} by source | Hold submissions until LP repair is complete. |

## Why these 3 beat the other options
- ${channel} remains the strategic lane, but the planner must define where it sends users and what event proves intent.
- Community/social can collect response language, but it should wait or stay narrow until the destination and proof are ready.
- Email/CRM is strong only with permission, segment, sender, and suppression rules.

## Media-fit analysis
| Priority | Medium | Decision | Score rationale | What must be ready first |
| --- | --- | --- | --- | --- |
| 1 | Homepage/CV destination | execute_now | closest path to ${conversion} and required for every channel. | Destination URL, primary CTA, proof block, and one measurable intent event |
| 2 | Owned/search destination | execute_now | captures comparison and use-case intent before broad promotion. | H1/meta, FAQ, internal links, proof block, UTM |
| 3 | Directory/comparison surfaces | prepare_first | high leverage when the category has active discovery or comparison behavior. | Listing copy, screenshots, pricing/category fields, status tracker |
| 4 | Community/social | wait or narrow prepare | useful for response language, but surface rules and account context matter. | Exact copy, destination, UTM, SaaS/copy-paste path, stop rule |
| 5 | Email/CRM | avoid_now unless consented | strong only when permission, segment, sender, and suppression rules exist. | Consented segment, sender identity, suppression list, approval |

## Media readiness scorecard
| Criterion | Current read | Decision impact |
| --- | --- | --- |
| Audience intent | Prioritize places where ${icp} are already comparing, searching, or deciding. | Do not lead with low-intent awareness channels. |
| Conversion proximity | Favor surfaces that can point directly to ${conversion}. | Destination and CTA preparation come before publishing. |
| Proof and assets | Claims need real screenshots, examples, pricing, process, or approved proof. | Missing proof routes to writing, landing, or seo_gap before SaaS handoff. |
| SaaS app readiness | Posting, sending, and submission require an app-ready packet or copy/paste path. | Action layer shows the matched SaaS app link selected by manifest fit. |
| Policy or spam risk | Communities, outbound email, and listings differ by rule set. | Use rule checks, exact copy approval, and stop rules. |

## Priority media queue
| Order | Channel | Specialist handoff | Required output |
| --- | --- | --- | --- |
| 1 | Homepage/CV destination | conversion-page preparation capability | Hero, CTA, proof module, FAQ, event names |
| 2 | Owned/search destination | search-page + conversion-page preparation capability | Page path, H1/meta, proof module, CTA, internal links |
| 3 | Listing queue | listing-copy + app-handoff preparation capability | Shortlist, per-site fields, reusable listing copy, handoff status |

## Preparation layer tasks
| Task | Input | Output | Must reflect into app |
| --- | --- | --- | --- |
| prepare_homepage_conversion | current LP, ICP, ${conversion}, proof assets | hero, subcopy, CTA pair, proof, FAQ, event names | homepage hero, CTA, tracking |
| prepare_seo_landing_page | search intent, comparison vocabulary, CTA | keyword map, H1/H2, comparison table, FAQ, meta | new SEO page, internal links, metadata |
| prepare_referral_directory_packet | listing targets, category, screenshots, URL | listing copy, field map, UTM, approval checklist | referral URL and listing copy after LP readiness |

## Channels to avoid for this first pass
- Avoid adding more social posts before the destination page can convert or at least measure intent.
- Avoid paid media until a no-paid baseline shows which promise and CTA work.
- Avoid directory submissions that cannot be verified against audience fit, category, and listing rules.

## SaaS handoff to leader
- Release only the first queue item and one distribution channel at a time.
- The downstream preparation agent must return the exact artifact for its surface, not another media plan.
- The action layer should surface the SaaS app whose manifest matches the artifact type, with selected media, exact copy, destination URL, UTM, target surface, and stop rule. Use a generic publisher only as fallback when no narrower app matches.`;
  }
  if (normalizedKind === 'growth') {
    return `## First growth bottleneck
The likely bottleneck is not channel volume. It is whether ${icp} understand the promise, proof, and next step quickly enough to move toward ${conversion}.

## 7-day acquisition experiment
| Day | Action | Artifact | Metric |
| --- | --- | --- | --- |
| 1 | Lock one destination and one conversion step | Page path, primary CTA, secondary CTA | destination published or ready |
| 2 | Add proof and objection handling | proof block, FAQ, comparison/use-case section | CTA click or primary intent event |
| 3 | Prepare one distribution post | exact copy, UTM, approval checkpoint | post approved |
| 4 | Prepare one listing or owned-link placement | field map or internal-link list | source/medium visible |
| 5 | Review first signals | visits, intent event, ${conversion} | signal quality |
| 6 | Revise headline or CTA from objections | replacement copy | intent-event lift |
| 7 | Continue/stop decision | keep one channel, stop one channel, next test | decision logged |

## Execution packet
| Field | Value |
| --- | --- |
| Owner | CMO leader -> growth |
| First action | Ship or revise one high-intent destination before expanding channels |
| Artifact | 7-day action queue, page/copy handoff, distribution handoff, metric check |
| Metric | ${conversion}, primary intent event, source/medium/campaign |
| Stop rule | If no qualified intent signal appears after a real traffic attempt, change the promise/proof/CTA before adding another channel. |`;
  }
  if (normalizedKind === 'landing' || normalizedKind === 'writing') {
    return `## Destination page packet
| Section | Replacement direction |
| --- | --- |
| Hero promise | Help ${icp} understand the concrete outcome and next step without a generic platform claim. |
| Lead | Explain the use case, proof, effort, and conversion path in one short paragraph. |
| Primary CTA | Continue to ${conversion}. |
| Secondary CTA | See the relevant use case or proof first. |
| Proof module | Use only real assets: product flow, sample output, screenshots, comparison criteria, process, pricing/friction notes, or approved customer evidence. |
| Objection block | Address effort, trust, cost, implementation, and what happens after the conversion step. |
| Measurement | Track page view, primary CTA click, secondary CTA click, and ${conversion}. |

## Page structure to ship first
1. Hero: promise, audience, primary CTA.
2. Use-case block: the exact job the audience wants done.
3. Proof block: real screenshot/process/sample output instead of invented metrics.
4. Comparison or alternative block: why this path is easier or more useful than the current workaround.
5. FAQ/objection block: cost, time, trust, setup, next step.
6. Final CTA: repeat the same conversion with UTM-safe destination.

## Copy draft
- H1: Help ${icp} move from research to the next action with ${product}.
- Lead: Use the product context, proof, and constraints in one focused page so visitors can decide whether to continue to ${conversion}.
- CTA: Continue to ${conversion}
- Secondary CTA: Review the use case first

## Handoff
- Pass this to implementation only after claims, proof assets, destination URL, and conversion event are approved.
- Do not publish invented proof, testimonials, metrics, or integration claims.`;
  }
  if (normalizedKind === 'seo_gap') {
    return `## SEO page packet
| Field | Decision |
| --- | --- |
| Page to build first | One page that matches ${icp} search intent and points to ${conversion}. |
| Search intent | Comparison, workflow selection, use-case evaluation, or "how to solve this job" intent. |
| Primary CTA | Continue to ${conversion}. |
| Supporting page | A use-case or comparison page that links back to the primary destination. |

## Page map
| Element | Draft |
| --- | --- |
| H1 | Best way for ${icp} to choose the next action with ${product} |
| Meta title | ${product}: practical next-action workflow for ${icp} |
| Meta description | Compare the use case, proof, effort, and next step before continuing to ${conversion}. |
| H2 set | Problem / Current alternatives / How ${product} helps / Proof and workflow / FAQ / Next step |
| Internal links | homepage -> SEO page -> conversion page; relevant use-case pages -> SEO page |
| Trust modules | sample output, process, screenshots, approved claims, update policy |

## Distribution templates
- X/social: "Before adding channels, fix the page that turns intent into action. Here is the use case, proof, and next step for ${icp}."
- Community: Ask for feedback on the workflow/problem, not a promotional click.

## Measurement
- Track organic landing page views, primary intent event, ${conversion}, and assisted conversions by source/medium.`;
  }
  if (normalizedKind === 'directory_submission') {
    return `## Directory submission queue
| Priority | Target type | Fit check | Submission artifact |
| --- | --- | --- | --- |
| 1 | Category-specific directories | Audience overlaps with ${icp}; category matches the product; free/manual listing path exists. | Listing title, one-line pitch, category, URL, screenshot, pricing/plan field, UTM |
| 2 | Alternative/comparison directories | Users compare options before converting. | Comparison positioning, differentiator, approved claim, destination URL |
| 3 | Startup/product launch directories | Useful for initial discovery but less durable than intent pages. | Launch copy, founder/product note, tags, image/screenshot |
| 4 | Community resource lists | Only if the submission is useful without spam. | Resource description, disclosure, link policy |

## Reusable listing copy packet
| Field | Copy |
| --- | --- |
| product_name | ${product} |
| one_line_pitch | A focused way for ${icp} to understand the use case, proof, and next step before ${conversion}. |
| category | Choose the closest product category based on the directory taxonomy. |
| short_description | ${product} helps ${icp} evaluate the workflow, proof, and action path in one destination instead of scattering the decision across disconnected channels. |
| primary_url | ${context.url || product} |
| tracking_url | ${(context.url || product)}${String(context.url || product).includes('?') ? '&' : '?'}utm_source=directory&utm_medium=listing&utm_campaign=first_growth_action |
| approved_claims | Use only claims present in the product page or supplied proof assets. |

## Per-site field map
| Directory field | Source |
| --- | --- |
| Name | product_name |
| URL | tracking_url |
| Category | directory taxonomy after fit check |
| Short description | one_line_pitch |
| Long description | short_description |
| Tags | audience, use case, category keywords |
| Screenshot/video | approved product asset |
| Status | queued / submitted / live / rejected / needs owner review |

## Manual submission checklist
- Verify category, rules, pricing field, screenshot requirement, and duplicate-listing policy before submission.
- Submit only after the exact listing text and destination URL are approved.
- Record the submission URL or blocker reason for each target.`;
  }
  if (normalizedKind === 'x_post') {
    const destination = `${context.url || product}${String(context.url || product).includes('?') ? '&' : '?'}utm_source=x&utm_medium=social&utm_campaign=first_growth_action`;
    const exactCopy = clipText(`Testing one destination, one proof block, one CTA: ${product} helps ${icp} decide whether the workflow is worth ${conversion}. ${destination}`, 270);
    return `## Exact X post packet
| Field | Value |
| --- | --- |
| exact_copy | ${exactCopy} |
| destination | ${destination} |
| CTA | Continue to ${conversion} |
| oauth_account | Connected X @handle must be shown before publish. |
| approval_owner | User or CMO leader |
| publish_status | Ready for approval; external posting requires OAuth account match, exact text approval, and explicit confirmation. |

## Variants
1. ${exactCopy}
2. Growth does not start with every channel. For ${icp}, the first test is whether the page explains the use case, proof, and next step clearly enough to earn ${conversion}. ${destination}
3. The next acquisition test for ${product}: one focused destination, one proof block, one CTA, one measurable source. No channel sprawl until the signal is real.

## Reply hooks
- "What would make this page trustworthy enough before you sign up?"
- "Which proof would you want first: workflow, screenshots, comparison, or sample output?"
- "What current workaround would you compare this against?"

## Approval and tracking
- Confirm the OAuth-connected @handle, exact text, link, posting time, and stop rule before publishing.
- Track utm_source=x, primary intent event, and ${conversion}.`;
  }
  if (normalizedKind === 'reddit') {
    const destination = `${context.url || product}${String(context.url || product).includes('?') ? '&' : '?'}utm_source=reddit&utm_medium=community&utm_campaign=first_growth_action`;
    return `## Reddit discussion packet
| Field | Value |
| --- | --- |
| Post angle | Ask for feedback on the workflow/problem, not a promotional announcement. |
| Audience | ${icp} |
| Link policy | Lead with useful context; place the link in a comment only if the community allows it. |
| Destination | ${destination} |
| Approval owner | User or CMO leader |

## Subreddit fit checklist
- The community discusses the problem, workflow, or category behind ${product}.
- Self-promotion rules allow feedback requests or require a no-link post.
- The post is useful even if no one clicks.
- Disclosure is included if the poster is affiliated with the product.

## Draft title options
1. How would you evaluate a tool/page before moving from research to ${conversion}?
2. What proof makes a workflow/product credible enough for ${icp}?
3. I am testing a clearer acquisition page and want feedback on the decision path.

## Draft body
I am working on ${product} for ${icp}. The current acquisition test is not "post everywhere"; it is whether one destination can explain the use case, proof, effort, and next step clearly enough to earn ${conversion}.

I am looking for feedback on the decision path:
- What proof would you need before taking the next step?
- Which claim would feel vague or overhyped?
- Would a workflow example, comparison table, screenshot, or sample output help most?

If links are allowed, I can share the page in a comment. If not, I can summarize the page structure here.

## Follow-up comments
- Thank critics by identifying the exact page section to revise.
- Do not argue or push the link repeatedly.
- Convert repeated objections into FAQ/proof updates.`;
  }
  if (normalizedKind === 'acquisition_automation') {
    return `## Acquisition automation packet
| Field | Value |
| --- | --- |
| Trigger | Visitor or lead reaches the first intent event before ${conversion}. |
| State 1 | New visitor from tracked source |
| State 2 | Intent event completed |
| State 3 | Conversion started or abandoned |
| State 4 | Follow-up/review queue, only when consent and connector authority exist |

## Manual-first flow
1. Capture source/medium/campaign and landing page.
2. Capture primary intent event and ${conversion}.
3. Segment visitors by source and intent behavior.
4. Queue only approved follow-up actions.
5. Stop automation if consent, sender, rate limit, or copy approval is missing.

## Message draft
Subject/first line: "Quick follow-up on the workflow you reviewed"
Body: "You looked at the ${product} workflow for ${icp}. If useful, the next step is ${conversion}; otherwise, the comparison/proof section may help you decide."

## Connector gate
- No external send, DM, CRM write, or sequence activation happens without approved source, consent, copy, connector, and stop condition.`;
  }
  if (normalizedKind === 'email_ops' || normalizedKind === 'cold_email') {
    return `## Email packet
| Field | Value |
| --- | --- |
| Audience | ${icp} |
| Purpose | Move qualified readers toward ${conversion} without broad promotional copy. |
| Subject | A clearer way to evaluate the next step |
| Body | Hi, this is a short note about ${product}. The useful question is whether the page explains the use case, proof, effort, and next step clearly enough for ${icp}. If it fits your current need, continue to ${conversion}; if not, use the proof/comparison section to decide quickly. |
| CTA | Continue to ${conversion} |
| Stop rule | Do not send without consent/source approval, sender approval, exact copy approval, and unsubscribe/opt-out handling. |

## Review checklist
- Recipient source and consent are approved.
- Sender/account is approved.
- Copy and CTA are approved.
- Tracking and stop conditions are defined.`;
  }
  return `## Decision from research
${evidenceSignals.map((item) => `- ${item}`).join('\n')}

## Execution artifact
| Surface | Draft |
| --- | --- |
| H1 | Help ${icp} choose the next action with ${product}. |
| Lead | Show the use case, proof, cost/friction, and next step clearly enough to move users toward ${conversion}. |
| Primary CTA | Continue to ${conversion}. |
| Secondary CTA | Browse use cases first. |
| Social draft | Before adding channels, fix the destination: one page that makes the use case, proof, CTA, and next step clear for ${icp}. That is the first growth move for ${product}. |

## Approval packet
| Field | Value |
| --- | --- |
| Owner | CMO leader -> ${normalizedKind} |
| Artifact | Page copy, social copy, UTM, measurement events, manifest-matched SaaS app packet |
| Approval owner | Operator |
| Metric | ${conversion}, referral source, primary intent event |
| Stop rule | If response is weak in 7 days, revise H1, CTA, and proof before adding channels. |`;
}

export function cmoSpecialistArtifactMarkdown(kind = '', context = {}, evidenceItems = [], isJapanese = false) {
  const normalizedKind = String(kind || '').trim().toLowerCase();
  return isJapanese
    ? cmoJapaneseArtifactMarkdown(normalizedKind, context, evidenceItems)
    : cmoEnglishArtifactMarkdown(normalizedKind, context, evidenceItems);
}

export function cmoSpecialistDeliveryMarkdown(options = {}) {
  const normalizedKind = String(options.kind || '').trim().toLowerCase();
  const context = options.context || {};
  const evidenceItems = Array.isArray(options.evidenceItems) ? options.evidenceItems : [];
  const isJapanese = Boolean(options.isJapanese);
  const phase = String(options.phase || 'preparation');
  const title = String(options.title || 'CMO specialist delivery');
  const evidenceTable = cmoGenericEvidenceTable(evidenceItems, isJapanese);
  const artifact = cmoSpecialistArtifactMarkdown(normalizedKind, context, evidenceItems, isJapanese);
  const displayIcp = cmoLocalizedIcp(context.icp, isJapanese);
  const displayConversion = cmoLocalizedConversion(context.conversion, isJapanese);
  if (isJapanese) {
    const answerLine = normalizedKind === 'media_planner'
      ? `${context.product} の ${displayConversion} を進める最初の判断は、媒体を網羅することではなく、Top3優先施策を「CV導線修正、SEO受け皿、referral/directory準備」に絞り、Preparation層とApp反映へ渡すことです。この納品は ${phase} レイヤーとして、次の担当がそのまま使える判断と成果物を返します。`
      : `${context.product} の ${displayConversion} を進める最初の勝ち筋は、媒体を増やすことではなく、ソースで見えた用途・顧客語彙・証拠を ${context.primaryLane} に落とし込み、承認できる制作物まで作ることです。この納品は ${phase} レイヤーとして、次の担当がそのまま使える判断と成果物を返します。`;
    return `# ${title}

## 先に結論
${answerLine}

## Evidence used
${evidenceTable}

## 入力から読んだ前提
| 項目 | 内容 |
| --- | --- |
| Product | ${context.productLabel}${context.url ? ` (${context.url})` : ''} |
| ICP | ${displayIcp} |
| Conversion | ${displayConversion} |
| Budget / constraint | ${context.budget} |
| Candidate channels | ${(Array.isArray(context.channels) ? context.channels : []).join(', ')} |
| Primary lane | ${context.primaryLane} |

${artifact}

## SaaS publish handoff
- この納品はartifact typeに一致するSaaS app manifestへ渡すpreparationデータとして扱う。
- action層は追加の投稿エージェントを動かさず、manifest適合したSaaS appリンク、exact copy、URL、CTA、UTM、公開先、停止条件を提示する。
- Reddit / Indie Hackers などSaaSから直接公開できない面は、承認後のコピペ投稿手順として扱う。`;
  }
  const answerLine = normalizedKind === 'media_planner'
    ? `The first media-planning decision for ${context.product} is not listing every channel; it is narrowing to the top three priorities, then handing conversion repair, the SEO destination, and referral/directory preparation into the preparation and app-reflection layers. This is a ${phase}-layer delivery with concrete work for the next specialist.`
    : `The first growth move for ${context.product} is not adding more channels; it is turning source-backed use cases, audience language, and proof into ${context.primaryLane} plus approval-ready artifacts for ${displayConversion}. This is a ${phase}-layer delivery with concrete work for the next specialist.`;
  return `# ${title}

## Answer first
${answerLine}

## Evidence used
${evidenceTable}

## Context extracted from the order
| Item | Value |
| --- | --- |
| Product | ${context.productLabel}${context.url ? ` (${context.url})` : ''} |
| ICP | ${displayIcp} |
| Conversion | ${displayConversion} |
| Budget / constraint | ${context.budget} |
| Candidate channels | ${(Array.isArray(context.channels) ? context.channels : []).join(', ')} |
| Primary lane | ${context.primaryLane} |

${artifact}

## SaaS publish handoff
- Treat this delivery as preparation data for the SaaS app whose manifest accepts the artifact type.
- The action layer should not dispatch another posting worker; it should show the manifest-matched SaaS app link plus exact copy, URL, CTA, UTM, target surface, and stop rule.
- For Reddit, Indie Hackers, or other surfaces that are not publishable through SaaS yet, provide approved copy/paste instructions.`;
}

const ROLE_SPECIFIC_REQUIREMENTS = Object.freeze({
  media_planner: /(Media-fit analysis|Media readiness scorecard|Priority media queue|Channels to avoid|媒体設計|Readiness scorecard)/i,
  growth: /(First growth bottleneck|7-day acquisition experiment|7日実行スプリント|Execution packet)/i,
  landing: /(Destination page packet|Page structure to ship first|Replacement copy|Hero promise|ページ構成)/i,
  writing: /(Destination page packet|Copy draft|Replacement direction|Hero promise|投稿ドラフト|投稿案)/i,
  seo_gap: /(SEO page packet|Page map|Meta title|SERP|内部リンク)/i,
  directory_submission: /(Directory submission queue|Reusable listing copy packet|Per-site field map|Manual submission checklist|ディレクトリ掲載)/i,
  x_post: /(Exact X post packet|Reply hooks|utm_source=x|exact_copy|投稿ドラフト)/i,
  reddit: /(Reddit discussion packet|Subreddit fit checklist|Draft title options|Draft body)/i,
  acquisition_automation: /(Acquisition automation packet|Manual-first flow|Connector gate|state machine)/i,
  email_ops: /(Email packet|Subject|Recipient source|Review checklist)/i,
  cold_email: /(Email packet|Recipient source|consent|opt-out|Review checklist)/i
});

export function cmoWorkflowDeliveryQualityFailure(options = {}) {
  if (!options.applies) return null;
  const normalizedKind = String(options.kind || '').trim().toLowerCase();
  const phase = String(options.phase || '').trim();
  const priorRuns = Array.isArray(options.priorRuns) ? options.priorRuns : [];
  const text = String(options.markdown || '');
  const finalDeliveryPlaceholderPattern = /\bTBD\b|not attached|not connected|not the final delivery|最終納品ではありません/i;
  if (!text.trim()) return 'empty_cmo_workflow_delivery';
  if (/\bTBD\b|\[[^\]\n]{2,80}\]/i.test(text)) return 'placeholder_left_in_cmo_workflow_delivery';
  if (/Evidence and handoff contract|Research layer:\s*use Brave|Planning layer:\s*use concrete|Preparation\/action layer|この specialist は.*レイヤーの納品を返します/i.test(text)) return 'meta_quality_contract_left_in_cmo_workflow_delivery';
  if (/Decision or question framing|Decision framing|Output contract|Professional preflight|Minimum blocker questions|Suggested dispatch|How to continue|Evidence and source status|Comparison or options|Recommendation|Risks and unknowns|Next check|Task:|Goal:|Source type|Option A|Option B|Direct competitor\s*\|\s*direct competitor|Adjacent substitute\s*\|\s*same problem|Status quo \/ manual workflow\s*\|\s*same job|Start with the shortest answer|Name the single highest-value follow-up check|the product being compared|the stated ICP|the primary conversion event|budget not confirmed|verify current promise|verify current page|Buyer \/ ICP|専門家の事前確認|出力契約|最小確認質問/i.test(text)) return 'generic_template_left_in_cmo_workflow_delivery';
  if (normalizedKind === 'cmo_leader') {
    if (phase === 'final_summary' && finalDeliveryPlaceholderPattern.test(text)) return 'placeholder_left_in_final_delivery';
    if (['checkpoint', 'final_summary'].includes(phase) && priorRuns.length) {
      if (/Specialist outputs are not attached|No specialist file snippets were attached/i.test(text)) return 'missing_specialist_outputs_in_cmo_leader_delivery';
      if (!/(Execution status|実行ステータス|Specialist成果物プレビュー|Specialist deliverable preview|Execution \/ approval packet|実行・承認packet|Supporting work products|visible delivery summary|表示されているdelivery要約)/i.test(text)) {
        return 'missing_cmo_leader_execution_synthesis';
      }
    }
    if (!/(Execution packet|First execution packet|実行パケット|実行・承認packet|Leader approval queue|承認|approval|Metric|Stop rule|停止条件)/i.test(text)) {
      return 'missing_cmo_leader_action_contract';
    }
    return null;
  }
  if (normalizedKind === 'list_creator') {
    if (!/(Reviewable lead rows|company_name|contact_source_url|public_email_or_contact_path|Import-ready field map)/i.test(text)) {
      return 'missing_list_creator_rows';
    }
    return null;
  }
  const requirement = ROLE_SPECIFIC_REQUIREMENTS[normalizedKind];
  if (requirement && !requirement.test(text)) return `missing_${normalizedKind}_specific_artifact`;
  if (!/(Execution packet|実行パケット|Post draft|投稿案|Page structure|ページ構成|7-day execution sprint|7日実行スプリント|Media planner|Media plan|媒体設計|Funnel contract|計測・データ分析|Competitor teardown|競合ティアダウン|Acquisition research|顧客獲得リサーチ|Reviewable lead rows|Owner|Objective|Artifact|Metric|Stop rule|停止条件)/i.test(text)) return 'missing_cmo_execution_contract';
  return null;
}
