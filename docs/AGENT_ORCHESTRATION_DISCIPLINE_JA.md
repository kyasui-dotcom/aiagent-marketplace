# Agent orchestration discipline

AIagent2 のエージェント実行は、ビルトイン/サンプル/外部登録エージェントを同じ provider endpoint 契約で扱う。

## 守ること

- worker / orchestration / client に、特定リーダーや特定エージェントの仕事定義を書かない。
- worker / orchestration は、順序、状態、handoff、品質ゲート、再試行、endpoint dispatch だけを扱う。
- リーダー固有の判断、レイヤー定義、専門エージェント選択、成果物条件、SaaS handoff 方針は、そのリーダーエージェント定義に置く。
- follow-up をどの専門agentへ送るかは leader/agent 定義の resolver で決める。worker や chat に `seo_gap` / `landing` / `growth` などの正規表現分岐を書かない。
- specialist の具体成果物条件は agent/leader/manifest の明示contractで渡す。worker はそのcontractを検査するだけで、SEO/LP/投稿/リード表などの中身を定義しない。
- 検索必須の research は、agent が検索または明示された source collection contract を満たす必要がある。worker が上流contextだけで research 成果物を合成して成功扱いにしない。
- サンプルエージェントも外部エージェントと同じ HTTP provider endpoint として扱い、同一worker内の特別実行経路を作らない。
- 外部投稿、送信、公開、PR/repository write は、チャット内の曖昧なapprovalではなく、該当SaaS surfaceへhandoffする。チャット側に残すのは取得系OAuth/connector accessなど、会話内で必要な情報取得だけにする。

## CAIt機能 / app surface の境界

- `Deliveries` / `delivery-manager` は app ではなく CAIt の中核機能として扱う。納品物、ファイル、履歴、ステータス確認は CAIt に密結合してよい。
- `Analytics Console`、`Publisher & Approval Studio`、`Lead Ops Console`、`X Client Ops` などは、CAIt が同梱・管理していても app surface として扱う。worker / orchestration / chat は、これらを内部特権appとして分岐しない。
- chat の app handoff は、app manifest の `inputContract.accepts` と `capabilities` が納品artifact typeに明示一致した場合だけ表示する。本文トークン一致、leader名、task名だけでappを出さない。
- app handoff の artifact type は、実際の納品ファイルまたは明示packetから判定する。上流の analytics / research / connector context が supporting evidence として同梱されていても、それだけで Analytics / Lead Ops / Publisher などを表示しない。
- 複数appが一致した場合は、より狭く専門的な `inputContract.accepts` を持つappを優先する。Publisherのような汎用appは暫定受け皿にできるが、同じartifactを受け取れる専門appが登録されたら専門appを先に出す。
- ユーザーによる外部appセルフサービス登録は短期スコープ外とする。ただし将来の有料/外部app登録に備え、manifest、handoff、auth、billingの契約は外部app前提で保つ。
- 将来ユーザー追加appを開放する場合、最終デリバリーをどのappで管理/公開するかは CAIt が候補を出し、価格、無料CAIt管理app、専門性、手数料/レベニューシェアを並べてユーザーに選ばせる。chat / orchestration がCAIt管理appを無条件に自動選択しない。
- CAIt管理appは無料の標準候補として扱うが、探さないと見つからないような控えめな導線にできる。専門appの売上機会を潰さず、専門app経由の売上にはレベニューシェアを設定できる前提にする。
- 外部appがCAItアカウント認証を使う場合は、CAIt session cookieを直接共有しない。短命の署名付きhandoff token、server-side app context id、または将来のCAIt OAuth/OIDCで明示的に委譲する。
- app側の投稿、公開、送信、課金、実行承認はapp側の責任にする。chatは準備済みデータとhandoff contextを渡し、実行完了はapp/connectorからの証跡がある場合だけ主張する。

## CMO leader の境界

- CMO 固有の定義は `lib/builtin-agents/agents/cmo-leader.js` に集約する。
- Reddit / Indie Hackers / X などの投稿文は preparation data として作り、publish/action は Publisher / Approval Studio などのSaaS surfaceへ渡す。
- worker 側に CMO 用のアクション名変換、媒体判断、approval文言、納品テンプレートを追加しない。

## QAで守ること

- `npm run qa:architecture` は、worker / shared / orchestration / client に CMO 文脈が混ざっていないことを検査する。
- `npm run qa:worker-api` は、サンプルエージェントが通常の provider endpoint で動き、CMO publish は chat approval ではなく SaaS handoff になることを検査する。
- `npm run qa:leader-workflows` は、leader がレイヤー間handoffを持ち、専門エージェント成果物を隠さず統合することを検査する。
