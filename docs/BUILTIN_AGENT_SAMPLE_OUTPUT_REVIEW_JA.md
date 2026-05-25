# Built-in Agents Sample Output Review

作成日: 2026-05-25 (Asia/Tokyo)

## 前提

- 対象: `lib/builtin-agents/agents/` の 43 sample agent。
- チェック方法: `npm run agent:test:snapshot -- --group all --out tmp\automation-2-before-20260525-sample-agents`
- 出力モード: stable mock OpenAI mode。実モデルの文章品質ではなく、各 agent が provider request packet に agent purpose / action boundaries / delivery contract / forbidden claims を渡せているかを確認するための回帰出力。
- 現状: 43件すべて `completed`。`qa:builtin-agents`、`qa:docs`、`qa:agent-routing-contracts` は通過。`research` の新しい output contract 3項目は routing contract QA の期待値へ反映済み。

## 全体改善方針

| 観点 | 現状 | 改善案 |
|---|---|---|
| サンプル依頼 | 既存 fixture は agent ごとに概ねフィットしている | 各依頼に「具体入力」「期待成果物」「禁止 claim」「次オーナー」を入れて、実モデル出力でも評価しやすくする |
| stable mock 出力 | purpose / action boundaries / delivery contract は全 agent で露出 | 文章成果物そのものの品質評価は live mode または provider mock の成果物生成ケースで追加する |
| 納品品質 | ほぼ全 agent が evidence / approval / execution boundary を持つ | 各 agent ごとに「レビュー可能な成果物」へ寄せる専用シナリオを追加する |
| 残課題 | stable mock では文章成果物そのものの品質までは検査しない | 代表 agent の live mode sample と、証拠あり/なしの専用 fixture を追加する |

## 個別レビュー

### Marketing / Growth

| Agent | フィットしたサンプル依頼 | 現状アウトプットチェック | 改善案 |
|---|---|---|---|
| `cmo_leader` | `aiagent-marketplace.net` の有料agent注文を増やすため、ICP、証拠、優先チャネル、2週間計画、承認が必要なactionを整理してほしい | 16個の handoff action と7つの納品sectionを出せている。内部 orchestration 語彙を最終納品に出さない契約あり | サンプル依頼に GA4/Search Console/LP現状/既存記事を入れ、最終出力が「1本の経営者向けgrowth plan」になるかを live mode で確認する |
| `campaign_operations` | CMO案を Campaign record、Publisher queue、approval backlog、measurement loop に落とし込んでほしい | campaign state / Publisher queue / Week 0-1 / Week 1-3 / measurement loop が契約化済み | サンプルに「承認済み素材」「未承認素材」「計測待ち素材」を混ぜ、queueの分類精度を確認する |
| `ads_planner` | Google Adsの$300テスト計画を、CPA仮説、stop rule、creative packet、launch approval handoffつきで作ってほしい | 広告作成・launch・spendを禁止する境界が明確 | conversion tracking が未確認の場合に、広告開始前の blocker を最上段に出せるか確認する |
| `seo_specialist` | `AI agent marketplace` でhomepage rewriteとSEO article packetを作り、Search Console statusとPublisher handoffを含めてほしい | SEO mode / SERP status / Search Console status / source ledger / Publisher boundary が契約化済み | Search Console query rows あり/なしの2ケースを用意し、intent map を過剰推測しないか確認する |
| `writer` | solo founder向けhomepage copyを、proof placeholder、CTA、2案、claim-use ledgerつきで作ってほしい | copy packet と downstream handoff は強い。公開済み claim も禁止済み | 既存 proof がない場合の placeholder 表現と、proof がある場合の claim ledger 差分を見る |
| `landing` | homepage hero、CTA、trust block、section copy、implementation handoffを改善してほしい | page evidence status と missing page stop rule が入っている | URLだけの依頼と実ページcopy付き依頼を分け、section-specific rewrite が証拠なしに出ないか確認する |
| `x_post` | Publisher Approval StudioのX投稿/thread/reply/cadenceを、account/link policyとapproval boundaryつきで作ってほしい | exact post text / pre-publish review / connector handoff / execution labels が契約化済み | 投稿文の実体、URL policy、owner approval checkbox が同じpacket内に揃うか確認する |
| `instagram` | AI agent marketplace launch用のcarousel/reel/story案、caption、visual brief、schedule handoffを作ってほしい | visual brief / asset status / approval checklist / connector boundary が契約化済み | 画像素材あり/なしで、captionだけ出すか outline guidance に留めるかを分けて評価する |
| `reddit` | founder community向けに、subreddit fit、rule risk、non-promotional draft、comment response planを作ってほしい | rule/source proof-gap ledger と manual posting boundary が強い | 実subreddit名を入れた場合、rules未取得なら「verified」と言わず dated source gap にできるか確認する |
| `indie_hackers` | Indie Hackers向け founder story launch post を、広告っぽさを避けて作ってほしい | founder-story angle / anti-ad tone / manual publish boundary が契約化済み | 投稿本文が「学び」中心になり、露骨なCTAに寄らないかを評価する |
| `email_ops` | signup済み未注文ユーザー向け lifecycle email を、segment、subject、body、ESP map、send boundaryつきで作ってほしい | consent / suppression / unsubscribe / send proof boundary がある | suppression evidence がない場合、send-ready ではなく approval-needed と出せるか確認する |
| `cold_email` | 公開sourceからstartup founders向け cold outreach を、lead source status、sequence、ESP/CRM mapつきで作ってほしい | source-backed outreach と proof tracker が強い | 実lead rowを入れたケースで、row-level source / recipient approval / no-send boundary を検査する |
| `acquisition_automation` | signupから初回有料注文までのautomation flowを、trigger、CRM state、message、GA4 event specつきで作ってほしい | connector未実行、GA4未実装、zero-conversion debug が明示される契約 | GA4 conversion未設定の入力で、acquisition拡大ではなく計測修復を最優先にできるか見る |
| `media_planner` | free/owned channelの上位3つを選び、fit matrix、why-not、selected-channel handoffを作ってほしい | channel readiness ledger と approval/connector boundary が契約化済み | channel選定理由が ICP / proof / conversion bottleneck に結びつくか確認する |
| `directory_submission` | AI tools directory向けsubmission queue、required fields、listing copy、UTM/proof trackerを作ってほしい | submitted/live claim を禁止し、owner handoff を持つ | directoryごとの必須項目と rule check date を表に出せるか確認する |
| `citation_ops` | Tokyo AI automation consultancy の local citation readiness を作ってほしい | canonical facts / unverified fields / approval proof tracker が契約化済み | NAP未確認フィールドを「未確認」のまま残せるか確認する |
| `list_creator` | public-source prospect list brief を、field schema、qualification reason、row-level source ledgerつきで作ってほしい | row-level source ledger と import/outreach boundary が強い | 実rowを3件入れ、duplicate/exclusion review と CRM field map の出方を見る |
| `growth` | 訪問者を有料注文へ変える1つのgrowth experimentを、metric、threshold、kill ruleつきで設計してほしい | 1実験に絞る契約、launch/metric改善 claim 禁止が明確 | activation handoff に exact artifact、owner、review date を必須化する |

### Product / Research / Strategy

| Agent | フィットしたサンプル依頼 | 現状アウトプットチェック | 改善案 |
|---|---|---|---|
| `research` | AI agent marketplace需要について、answer-first、source ledger、current/inferred split、recommendation、verification gapsを出してほしい | source access boundary / decision handoff / execution labels まで強化済み | routing QAの期待値更新。live sampleでは current source がない時に generic summary へ逃げないか確認する |
| `research_team_leader` | 需要調査を複数specialistに分け、source plan、non-overlap、evidence acceptance、confidence gradingを作ってほしい | leaderとして split と synthesis の境界を持つ | specialistごとの担当範囲が重ならず、最終判断に使う evidence standard を明文化する |
| `pricing` | managed agent order のpackage pricingを、value metric、cost basis、scenario、sensitivityで提案してほしい | formula / scenario / approval owner / price-change handoff が契約化済み | checkout変更を実行済みにせず、価格実験の開始条件と rollback rule を強める |
| `cfo_leader` | provider payout と marketplace margin のunit economicsを、assumption table、formula、scenarioで判断してほしい | financial action の proof boundary が強い | payout/billing/payment変更の authority boundary を、決裁者・システム証跡まで具体化する |
| `teardown` | competitor landing pageを、observed facts、inference、comparison table、wedge、first testで分析してほしい | fact/inference分離と dated evidence 契約あり | URLだけで中身未取得の場合の「観測不可」扱いを強化する |
| `validation` | recurring agent orderのapp ideaを、riskiest assumption、test script、success threshold、kill criteriaで検証設計してほしい | test未実行、evidence return path、execution status labels が契約化済み | smoke test asset を具体成果物として出し、学習受理条件を表にする |
| `data_analysis` | funnel datasetからpaid order conversionを分析し、dataset status、metric definition、findings、caveatsを出してほしい | dataset evidence なしの結論や conversion verification claim を禁止 | sample rows を入れた fixture を追加し、数値計算と caveat の正しさを見る |
| `diligence` | marketplace launch planのblockerを、red flag matrix、evidence map、severity、conditional recommendationで見てほしい | blocker severity と fact/inference が契約化済み | red flag ごとに「go/no-goへの影響」と「次の検証」を必須化する |
| `cpo_leader` | recurring agent orders のMVP sliceを、tradeoff matrix、rejected alternatives、experiment、acceptance thresholdで決めてほしい | product decision と validation threshold が出せる | rejected alternatives が浅くならないよう、各代替案の却下理由を evidence/status 付きにする |
| `cto_leader` | queue-backed dispatch rolloutを、architecture options、chosen path、validation gate、rollback triggerで決めてほしい | readiness gate / validation gate / rollback trigger が契約化済み | current-state evidence が不足している時の architecture decision を保留できるか確認する |
| `legal_leader` | provider marketplace termsのpolicy review packetを、issue map、risk level、draft clauses、attorney flagsつきで作ってほしい | non-legal-advice boundary と attorney review flag がある | jurisdiction assumptions と reviewer-needed sections を冒頭に固定する |

### Build / Ops / Admin Work

| Agent | フィットしたサンプル依頼 | 現状アウトプットチェック | 改善案 |
|---|---|---|---|
| `code` | delivery item renderer bug の実装handoffを、affected files、patch plan、validation evidence、rollback、PR notesで作ってほしい | repo-aware implementation contract がある | 実ファイル差分がない場合は patch plan まで、差分がある場合は validation command/result を必須にする |
| `build_team_leader` | order status page bug fix を複数担当に分け、file ownership、shared files、validation、rollback、PR criteriaを作ってほしい | parallel work boundary と PR handoff が契約化済み | shared-file conflict の検出と sequencing をもっと具体化する |
| `agent_team_leader` | checkout conversion改善の3-agent workflowを、roster、non-overlap、merge criteria、acceptance checksで組んでほしい | 非公開fixture。dedupe record と evidence merge の契約あり | 公開注文からは除外維持。CMO/build/research leaderに吸収する前提で回帰対象に残す |
| `free_web_growth_leader` | no-paid growthをSEO/community/directories/owned mediaで24h/7d計画にしてほしい | 非公開fixture。organic growth handoff 契約あり | CMO leaderに統合済みとして非公開維持。単体公開するなら CMOとの差分を再定義する |
| `launch_team_leader` | Publisher Approval Studio feature launch のsequence、asset queue、approval gateを作ってほしい | 非公開fixture。launch execution claim を禁止 | CMO leaderに統合済みとして非公開維持。新規公開するなら product launch専用に再設計する |

### Executive Assistant / Communication Ops

| Agent | フィットしたサンプル依頼 | 現状アウトプットチェック | 改善案 |
|---|---|---|---|
| `secretary_leader` | inbox、calendar、meeting prepを統合し、principal-facing queue、approval gate、least-privilege contextを作ってほしい | specialist synthesis と private context scope が契約化済み | 3 specialist出力を渡す live case で、raw private context を漏らさず1 queueに統合できるか確認する |
| `inbox_triage` | billing/provider/newsletter混在inboxを、priority、reply-needed、owner、deadline、risk flagでtriageしてほしい | snapshot freshness / privacy-minimized handoff / approval packet が強い | message source freshness がない場合に stale label を必ず出す |
| `reply_draft` | data retention質問への返信draftを、unresolved facts、tone rationale、recipient-visible scope、send guardrailつきで作ってほしい | fact/commitment ledger と send boundary が強い | unresolved fact を placeholder に落とし、勝手に約束文へ変換しないか確認する |
| `schedule_coordination` | Tokyo/California demo の候補日時、invite draft、participant response handoff、calendar/link boundaryを作ってほしい | participant response handoff と time option expiry が強い | 実availabilityなしでは candidate を「仮案」とラベル付けする |
| `follow_up` | demo feedback、invoice approval、security questionnaire のopen loop follow-upを作ってほしい | owner/deadline/relationship/follow-up copy が契約化済み | deadline missing のopen loopを混ぜ、優先順位と next check の妥当性を見る |
| `meeting_prep` | billing fallback decision meeting のbrief、agenda、decision points、pre-read、questionsを作ってほしい | participant-visible scope と calendar/send boundary が契約化済み | participantごとに見せる情報/隠す情報を分けるケースを追加する |
| `meeting_notes` | provider approval workflow meeting を minutes、decision log、actions、owners、deadlinesにしてほしい | source-to-action trace / owner handoff / private context scope が強い | raw transcript付きケースで、action itemごとの根拠行と owner-visible handoff を確認する |
| `email_ops` | lifecycle email を send boundary つきで作る | marketing表に記載済み | ESP connector proof がない時に「not queued / not sent」を明示する |
| `cold_email` | cold outreach sequence を send boundary つきで作る | marketing表に記載済み | recipient approval と opt-out note を必須チェック化する |

### Hiring / People

| Agent | フィットしたサンプル依頼 | 現状アウトプットチェック | 改善案 |
|---|---|---|---|
| `hiring` | part-time QA engineer の role packet を、outcomes、scorecard、JD、screening questions、rubricで作ってほしい | JDだけでなく scorecard / interview loop / decision threshold を持つ | protected-classや法務riskを避けつつ、candidate evidence boundary を候補者評価前に出す |

## 次に実装するとよい確認セット

1. stable mock に加えて、代表 agent 10件の live mode sample を実行し、実文章の具体性を確認する。
2. fixture に「証拠あり」「証拠なし」「connectorあり」「connectorなし」を混ぜる。
3. 各 agent の出力で、最終成果物本文が `Purpose / Delivery contract` の列挙だけで終わらないことを確認する acceptance check を追加する。
4. 非公開 fixture 3件は public catalog から隠したまま、CMO/build/research leader への統合方針を維持する。
