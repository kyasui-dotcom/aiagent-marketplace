# aiagent2 引継ぎ資料 2026-05-11

## 次セッション冒頭に渡す要約

aiagent2 は CAIt のチャット発注、リーダー/エージェント orchestration、外部コネクタ、納品物管理を扱う Cloudflare Workers + D1 アプリです。直近は「まずジョブを完遂させる」「品質は情報受け渡しとエージェント成果物の問題として別管理する」「builtin と外部エージェントを同じ扱いに寄せる」方針で改善中です。

現在のブランチは `codex/sync-cloudflare-deploy-state`。直近コミット `fea56e4 Fix chat CSRF refresh for order writes` まで GitHub に push 済み、Cloudflare 本番にも deploy 済みです。直近 Cloudflare Version ID は `8b0732af-23c0-4a20-a0c2-355f903b3a3c`。

未追跡ファイルとして `oauth-demo/`, `scripts/build-google-oauth-video-from-screenshots.mjs`, `scripts/build-google-oauth-video.mjs`, `tmp-app-screens/` が残っています。ユーザー作成/検証用の可能性があるため、勝手に削除・コミットしないでください。

## ユーザーの固定方針

- 常に理想形を追う。一時しのぎで worker に特殊処理を増やさない。
- builtin agent もユーザー追加エージェントも、外部エージェントと同じ扱いにする。
- リーダーも例外にしない。リーダー主体の orchestration を外部エージェント扱いで実現する。
- `worker.js` はワークの完遂監視、実行状態管理、失敗検知を担当する。
- `orchestration.js` は情報受け渡し、品質監視、下流エージェントへの文脈伝播を担当する。
- 情報の受け取りと渡しは最終的にリーダーが責任を持つ。最後にまとめるのもリーダー。
- 1回リーダーが確定したら、ユーザーが明確に変更指示しない限り勝手に変更しない。変更候補がある場合は提案として選択を求める。
- まずは完遂率を上げる。品質改善は完遂後にPDCAする。完遂と品質を混ぜて設計しない。
- external write、投稿、送信、PR作成、repository write は UI/API/scheduled execution どこから来ても approval gate 必須。
- データ層とリサーチ層は品質に影響するため、安易なフォールバックに落とさない。検索やデータ取得は短すぎる timeout ではなく、必要なら長めに待つ/リトライする。

## 直近で修正済み

### CSRF token required

症状: オーダー投入時に `CSRF token required` が表示された。

原因: `/api/jobs` などの unsafe write はブラウザCookie付きPOST時に `x-aiagent2-csrf` 必須。OAuth復帰直後や長時間開いたチャットで `state.auth` が空/古いままになり、ヘッダーが付かないことがあった。

対応:

- `public/chat.js` の共通 `api()` に unsafe write 判定を追加。
- `POST/PUT/PATCH/DELETE` 前にCSRFがなければ `refreshAuth()` で `/auth/status` を取り直す。
- 403かつCSRF系エラーなら、CSRF再取得後に1回だけ再送する。
- サーバー側CSRF保護は緩めていない。
- `public/chat.html` の `chat.js` cache bust を `20260511b` に更新。
- `scripts/ui-qa.mjs` にCSRFリトライ検査を追加。

対象コミット: `fea56e4 Fix chat CSRF refresh for order writes`

### GA4 context attachment

症状: オーダー前にGA4 OAuth認証済みなのに、オーダー時に再OAuthを求められる/チャット中OAuthが通らないように見える。

確認:

- 本番D1上では `yasuikunihiro@gmail.com` は Google connector connected。
- scope は `analytics.readonly` と `webmasters.readonly` が確認済み。
- `e2e@aiagent-marketplace.net` は未接続。

原因: OAuth保存自体ではなく、Analytics Console の app context が既存 order draft に自動 attach されないケースがあった。そのため「GA4が接続済みでも、この注文にデータ文脈が付いていない」状態になっていた。

対応:

- `public/chat.js` に draft analytics context 管理を追加。
- app context return 時に `state.draft.input._broker.appContexts/connectorContexts` へ attach。
- prompt が GA4/Search Console 利用を明示しているのに loaded analytics context がない場合、注文送信前に Analytics Console を開く。
- `analytics-use` / `analytics-skip` を draft/intake 両対応にした。
- `public/chat.html` の `chat.js` cache bust を `20260511a` に更新済み。

対象コミット: `44e8a45 Fix GA4 context attachment during order creation`

### retry の扱い

方針: 失敗したら既存の途中状態を無理に再利用して薄い retry を走らせるのではなく、基本は最初からリトライする。前回注文と違う内容になる retry は避ける。

関連コミット:

- `70788e6 Stop in-place workflow child retries`

### delivery item / SaaS反映

ユーザー方針:

- Delivery Manager は納品物全体の表示。
- 個別成果物は各SaaS機能に分解して保存したい。
- リードリストは Lead。
- SEO記事、SNS投稿、Publisher系コンテンツは Publisher。
- メールは Lead 側に寄せる。
- SNS は別アプリより Publisher 統合管理がよい。
- 内部資料っぽい leader md などは納品物としてユーザーに出しすぎない。

関連コミット:

- `3cd8d9e Normalize delivery items for SaaS apps`
- `0ab2539 Add delivery item D1 migration`
- `da11b44 Fix delivery item surface inference`
- `7bc94a2 Keep leader packages out of SaaS delivery items`
- `961764e Constrain delivery item surfaces by agent task`

## 現在の主要課題

### 1. 完遂率

ユーザーの最大不満は「ジョブが安定して完了しない」こと。品質より先に、必ず terminal delivery まで進むことを優先する。

頻発していた症状:

- Leader intake が completed なのに表示上 `Leader intake / running` に戻る。
- Research Agent が timeout する。
- `Built-in workflow dispatch queue was requested repeatedly but did not start execution.`
- `Progress check temporarily failed (503)` が繰り返される。
- approval wait 中にも retry/polling が進み続ける。
- retry した時に前回注文と違う内容になる。
- live progress polling が limit に達してもユーザーには完遂/停止/承認待ちが明確に伝わらない。

調査対象:

- `worker.js`
- `lib/orchestration.js`
- `lib/builtin-agents.js`
- queue consumer / scheduled sweep / workflow dispatch 周辺
- job state machine / timeout retry / completion sweep 周辺
- progress polling UI in `public/chat.js`

### 2. agent の扱い

現状まだ `built_in_agent_run` 的な概念や builtin 前提の処理が残っている可能性がある。ユーザーは強く嫌がっている。

目標:

- builtin agent と外部 agent を同じ execution model に乗せる。
- worker 内に agent 固有の中身や検索ロジックを持たせない。
- worker は実行監視と状態遷移だけを見る。
- agent の能力、入力、出力、品質要件は agent 側に寄せる。

注意:

- 「とりあえず worker で Brave search を呼ぶ」は方針違反。
- Search Agent ではなく Research Agent が必要。検索結果を集めるだけではなく、リーダーから渡されたタスクに合わせてリサーチ見解にまとめ直す。

### 3. Research Agent の仕様

ユーザーが明示した理想仕様:

1. Leader から渡された目的、対象サービス、チャネル、制約を受け取る。
2. Brave API で競合とマーケット状況を調べる。
3. 必要に応じてSEO/SNS/広告などチャネル別に検索する。
4. OpenAIで検索結果を統合・要約する。
5. 3C分析として見解を出す。

例:

- SEO: 競合キーワード、上位記事の内容、文字数、構成、E-E-A-Tの強さ、検索意図を分析する。
- SNS: 競合がどんな投稿をしているか、どんな投稿がいいね/反応を得ているかを分析する。
- 汎用リサーチ: Customer, Company, Competitor の3Cで示す。

重要:

- Braveの生検索結果をそのまま返すだけでは不可。
- 後続の Media Planner、SEO、Writing、List Creator などが使える形に構造化する。
- 情報系はフォールバックで薄くすると後続が全部悪くなるため、短時間で諦めない。

### 4. orchestration と leader

ユーザーの見解が更新された:

- `orchestration.js` が品質監視と文脈伝播を担保するのはよい。
- ただし情報を受け取り、次へ渡す責任は leader が持つべき。
- 最後に統合してまとめるのも leader なので、leader が各層の成果物を理解して再配布する設計にする。
- leader は intake 後、必要以上に止まらず、すぐ次の層へ仕事をパスする。
- 実アクション前には、必要なら agent を使って不足情報やプランを固める。

### 5. E2E

ユーザーは「自分が毎回手動テストしている内容をE2Eに入れて、自分がテストしなくてよいようにしてほしい」と要望。

本番に近いE2Eシナリオ:

```text
Task: cmo_leader
Goal: Original request:
集客

User clarification:
- アナリティクス: GA4/Search Consoleを使う
- 主な目的: 問い合わせ・リード獲得を増やす
- 優先チャネル: 自然検索・SEO
- 優先チャネル: SNS・ソーシャル
- 優先チャネル: 広告
- 対象サービス: https://aiagent-marketplace.net/chat
- 主な目的: 登録・トライアルを増やす
- 対象ユーザー: 開発者・技術ユーザー
- 制約: 深さ・品質優先

Use these clarification details and produce the requested delivery. State any remaining assumptions briefly.
Conversation lead: CMO Leader (cmo_leader)
Work split: team workflow
Inputs: chat request and any URLs or constraints in the message
Constraints: keep the user-facing flow chat-first; do not claim external writes without connector proof
Deliver: チャットに進捗と納品を返す。必要なHTML/ファイルは納品カードとして表示する。
Output language: Japanese
Acceptance: concrete delivery, visible waiting states, source/connector status, and next action are all posted back into this chat
```

E2Eの期待:

- 最後まで完遂する。
- 各 agent の納品物が空ではない。
- Research のデータが下流 agent に渡っている。
- Data/Research/Planning/Preparation/Action の成果物が後続で参照されている。
- Deliveryに内部資料だけが出ない。
- SaaS DBにも成果物が surface 別に保存される。
- テスト時の納品物を人間が読める形で出力し、品質チェックできるようにする。

### 6. GA4 / Search Console

GA4 property ID: `531290961`

ユーザーは手動OAuthでの接続を試している。Google OAuth Playground で token exchange の画面まで進んだが、手順に迷った経緯あり。

Service Account `e2etest@niche-s-492002.iam.gserviceaccount.com` は GA 側で「Googleアカウントと一致しない」と表示され、招待できなかった。GA UIの通常ユーザー追加にはサービスアカウントメールが通らない場合がある。

Search Console は権限付与が難しい。ユーザーは「情報少ないから良いですかね」と発言。GA4を優先し、Search Consoleは未接続でも明示的にスキップ/不足として扱うのが現実的。

## 直近のQA/確認コマンド

直近で通したもの:

```powershell
node --check public/chat.js
node --check public/analytics-console.js
node --check scripts/ui-qa.mjs
node scripts/ui-qa.mjs
node scripts/app-context-handoff-browser-qa.mjs
node scripts/worker-api-qa.mjs
node scripts/storage-qa.mjs
node scripts/architecture-qa.mjs
node scripts/runs-qa.mjs
```

デプロイ:

```powershell
npx wrangler deploy
```

直近 deploy:

- Worker: `aiagent2`
- URL: `https://aiagent2.yasuikunihiro.workers.dev`
- Production base: `https://aiagent-marketplace.net`
- Version ID: `8b0732af-23c0-4a20-a0c2-355f903b3a3c`

本番静的JS確認:

```powershell
$r = Invoke-WebRequest -Uri "https://aiagent-marketplace.net/chat.js?v=20260511b" -UseBasicParsing -TimeoutSec 30
$r.Content -match 'csrfRequiredApiError'
$r.Content -match 'refreshAuthForUnsafeWrite'
```

## 現在のGit状態

作業ブランチ:

```text
codex/sync-cloudflare-deploy-state
```

直近コミット:

```text
fea56e4 Fix chat CSRF refresh for order writes
44e8a45 Fix GA4 context attachment during order creation
70788e6 Stop in-place workflow child retries
961764e Constrain delivery item surfaces by agent task
7bc94a2 Keep leader packages out of SaaS delivery items
da11b44 Fix delivery item surface inference
0ab2539 Add delivery item D1 migration
3cd8d9e Normalize delivery items for SaaS apps
```

未追跡:

```text
oauth-demo/
scripts/build-google-oauth-video-from-screenshots.mjs
scripts/build-google-oauth-video.mjs
tmp-app-screens/
```

## 次にやるべき順番

1. 完遂率の根本改善
   - worker state machine、queue dispatch、timeout retry、completion sweep を確認。
   - approval wait 中は retry/polling を止める。
   - leader intake completed 後に intake に戻る表示/状態を修正。
   - retry は原則「元注文入力を保持した最初からの再実行」にする。

2. builtin/external 統一
   - `built_in_agent_run` 的な命名・状態・分岐を洗い出す。
   - worker から agent 固有ロジックを外す。
   - agent registry / capability / invocation を一本化する。

3. Research Agent
   - Brave API使用を agent 側に移す。
   - OpenAI synthesis で3C分析にする。
   - SEO/SNS/広告などチャネル別の調査観点を実装する。
   - 下流 agent が使う structured artifact を出す。

4. Orchestration/Leader
   - leader が成果物を受け取り、次層に渡す責任を持つ。
   - `orchestration.js` は情報欠落、品質、依存関係の監視に寄せる。
   - leader が必要以上に intake で止まらないようにする。

5. E2E
   - 上記「集客」シナリオを production-like E2E に入れる。
   - 実行後の全納品物を検査し、空成果物や内部資料露出を失敗にする。
   - 検索/リサーチ結果が下流で参照されていることを検査する。

## 注意すること

- ユーザーは毎回本番反映を期待している。修正後は GitHub push と Cloudflare deploy まで行う。
- 既存の untracked ファイルは勝手に削除しない。
- サーバー側 security gate を緩めない。CSRFやapproval gateは守る。
- 品質向上の名目で、完遂しない複雑な多段フローを増やさない。
- ただし理想設計は曲げない。短期対応で worker に agent 固有ロジックを戻さない。
