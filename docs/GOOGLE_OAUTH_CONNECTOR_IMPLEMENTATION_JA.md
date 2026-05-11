# Google OAuth / Analytics Connector 実装メモ

最終更新: 2026-05-11

対象:

- Google OAuth login / connector link
- Analytics Console の GA4 / Search Console source loading
- Google connector token refresh
- Google app context handoff

この領域は何度も regression しているため、変更前にこのメモを読むこと。OAuth の接続、Google API からの一覧取得、注文への app context 添付は別物として扱う。

## 直近の regression と修正

### 1. 接続済みなのに注文で再OAuthを求める

原因:

- Google connector は保存済みでも、Analytics Console の app context が order draft に添付されていないケースがあった。
- 「OAuth接続済み」と「この注文にGA4/Search Console証拠が添付済み」を混同していた。

修正:

- `public/chat.js` が app context return を `state.draft.input._broker.appContexts/connectorContexts` に添付する。
- Google利用を明示した注文で analytics context がない場合、注文送信前に Analytics Console を開く。

### 2. Google OAuth scope が保存されない

原因:

- Google token response が `scope` を返さない場合、requested scope を永続 connector に反映できないことがあった。

修正:

- OAuth start で `requestedScope` を state cookie に保存する。
- OAuth callback で `requestedScope` を `googleConnectorFromOAuthToken(...)` に渡す。
- `token.scope` が空の場合は requested scope を connector scopes に merge する。

重要:

- `analytics_connect` の default scope は GA4 と Search Console の両方。
- `scope_group=ga4` は GA4 のみ。
- `scope_group=gsc` は Search Console のみ。
- `scope_group=ga4,gsc` は両方。

### 3. Analytics Console の connect button が片方ずつしか権限を取れない

原因:

- UI 上で「両方を接続する」標準リンクがなかった。

修正:

- `public/analytics-console.html` に `Connect both` を追加。
- `public/analytics-console.js` の `googleConnectHref(...)` は `analytics` / `both` を `scope_group=ga4,gsc` にする。

### 4. GA4 / Search Console source loading が 503 / Cloudflare 1102 になる

原因:

- `/api/connectors/google/assets` と `/api/connectors/google/analytics-report` が、認証前から `storage.getState()` で D1 の全体 state を読んでいた。
- 未ログインでも重い読み取りに入るため、本番D1サイズで Worker CPU 超過になり 503/1102 になった。

修正:

- `currentAgentRequesterContextWithAccount(...)` を追加。
- まず lightweight session / API key 認証を行う。
- ログイン済みの場合だけ `storage.getAccountByLogin(login)` で対象 account 1件を読む。
- 未ログインは D1 全体 scan なしで 401 を返す。
- Google token refresh は `storage.mutate(...)` ではなく `mutateAccountByLogin(...)` で対象 account だけ更新する。

必須不変条件:

- 未ログインの `/api/connectors/google/assets?include=gsc,ga4` は 401。
- 未ログインの `/api/connectors/google/analytics-report?...` は 401。
- この2 endpoint は認証前に `getState()` / `getFreshState()` を呼ばない。

### 5. GA4 account summaries が古い endpoint 固定

原因:

- GA4 property list に `https://analyticsadmin.googleapis.com/v1alpha/accountSummaries` を使っていた。

修正:

- 公式の現行 endpoint `https://analyticsadmin.googleapis.com/v1beta/accountSummaries` に変更。
- `pageSize=200` と `pageToken` pagination を実装。

公式仕様:

- GA4 account summaries: `GET https://analyticsadmin.googleapis.com/v1beta/accountSummaries`
- Required scope: `https://www.googleapis.com/auth/analytics.readonly`
- Search Console sites: `GET https://www.googleapis.com/webmasters/v3/sites`
- Required scope: `https://www.googleapis.com/auth/webmasters.readonly`

### 6. 接続済みだが一覧が空の原因が分からない

原因:

- Google API の 403 / scope不足 / API未有効 / 権限なしを単なる空リストや汎用 warning にしていた。

修正:

- `fetchGoogleAuthorizedJson(...)` が Google error payload から `status`, `code`, `reason` を保存する。
- `googleApiRecoveryHint(...)` が以下を分ける。
  - API未有効: Google Cloud OAuth project で API を有効化して再接続
  - scope不足: 対象 scope で再接続
  - resource権限不足: GA4/Search Console権限のあるGoogleアカウントを使う
  - token失効: 再接続
- Analytics Console は `googleApiErrors` を app context に含める。
- UI は「Google connected, no sources returned」をOAuth失敗と分けて表示する。

## 実装上の不変条件

### OAuth start

場所:

- `worker.js`
  - `handleGoogleAuthStart`
  - `googleScopeForOAuthAction`
  - `googleOAuthScopeGroupsFromUrl`
  - `googleRequestedScopeForOAuthState`

守ること:

- `action=login` は `openid email profile` のみ。
- `action=analytics_connect` は明示 scope group がなければ GA4 + Search Console。
- `action=connect` / `action=link` も明示 scope group がなければ analytics default。
- Gmail / Drive / Calendar など restricted/broader scopes を analytics connect に混ぜない。
- OAuth state cookie には `requestedScope` を保存する。

### OAuth callback

場所:

- `worker.js`
  - `handleGoogleAuthCallback`
- `lib/connector-secrets.js`
  - `googleConnectorFromOAuthToken`

守ること:

- 永続 connector が使える場合、browser session cookie に Google access token を残さない。
- `googleConnectorFromOAuthToken(...)` は既存 scopes、`token.scope`、requested scope を merge する。
- `token.scope` がない場合でも requested scope を失わない。
- account更新は `mutateAccountByLogin(...)` を優先する。

### Source loading

場所:

- `worker.js`
  - `handleGoogleConnectorAssets`
  - `handleGoogleAnalyticsReport`
  - `currentAgentRequesterContextWithAccount`
  - `googleAccessTokenForCurrent`
  - `fetchGoogleGa4AccountSummaries`

守ること:

- 認証前に D1 全体 state を読まない。
- account は `getAccountByLogin(login)` で対象1件だけ読む。
- connector missing は 409。
- unauthenticated は 401。
- Google API側の失敗は可能な限り partial success + warning にする。
- GA4 list は Admin API `v1beta/accountSummaries`。
- GA4 report rows は Data API `analyticsdata.googleapis.com/v1beta/{property}:runReport`。
- Search Console list は `www.googleapis.com/webmasters/v3/sites`。
- Search Console report は `/searchAnalytics/query`。

### Analytics Console UI

場所:

- `public/analytics-console.html`
- `public/analytics-console.js`

守ること:

- OAuth connect button は標準の `<a>` link として機能する。クリック前に `/auth/status` preflight しない。
- `Connect both` は `scope_group=ga4,gsc`。
- `Connect GA4` は `scope_group=ga4`。
- `Connect Search Console` は `scope_group=gsc`。
- connected + warnings、not connected、connected but no sources を分ける。
- app context には `googleWarnings`, `googleApiErrors`, `googleReportSources`, `googleReportWarnings` を含める。

## 変更時の必須QA

最小:

```powershell
npm run qa:worker-api
npm run qa:ui
```

本番デプロイ前:

```powershell
npm run qa:deployment-ops
```

本番デプロイ後:

```powershell
(Invoke-WebRequest -UseBasicParsing https://aiagent-marketplace.net/api/ready).Content

$res = Invoke-WebRequest -UseBasicParsing 'https://aiagent-marketplace.net/api/connectors/google/assets?include=gsc,ga4' -SkipHttpErrorCheck
"$($res.StatusCode)`n$($res.Content)"

$res = Invoke-WebRequest -UseBasicParsing 'https://aiagent-marketplace.net/api/connectors/google/analytics-report?ga4_property=properties/123456789' -SkipHttpErrorCheck
"$($res.StatusCode)`n$($res.Content)"
```

期待値:

- `/api/ready` は `ok: true`, `ready: true`
- 未ログインの Google assets は 401
- 未ログインの Google analytics-report は 401
- ここで 503 / 1102 が出たら、また認証前に重い処理へ入っている可能性が高い

scope確認用D1 query:

```powershell
npx wrangler d1 execute aiagent2 --remote --command "SELECT login, json_extract(profile_json,'$.connectors.google.connected') AS google_connected, json_extract(profile_json,'$.connectors.google.scopes') AS google_scopes, json_extract(profile_json,'$.connectors.google.updatedAt') AS google_updated_at FROM accounts WHERE profile_json LIKE '%google-oauth%' ORDER BY updated_at DESC LIMIT 10"
```

注意:

- token本体、`accessTokenEnc`, `refreshTokenEnc` は絶対に出力しない。
- scope確認だけに留める。

## QAで固定していること

`scripts/worker-api-qa.mjs`

- default Google login は analytics scopes を要求しない。
- analytics connect は GA4 + Search Console scopes を要求する。
- source-specific connect は片方の scope だけを要求する。
- Google token response に `scope` がなくても requested scope が connector に保存される。
- assets endpoint は GA4/Search Consoleの両方を読める。
- GA4 Admin API disabled は warning と `google.api_errors.ga4.google_reason = SERVICE_DISABLED` になる。
- 未ログインの assets/report は 401 で即時終了する。

`scripts/ui-qa.mjs`

- Analytics Console は `/api/connectors/google/assets?include=gsc,ga4` を呼ぶ。
- Analytics Console は `/api/connectors/google/analytics-report` を呼ぶ。
- connect button は `/auth/status` preflight に依存しない。
- `Connect both` / `Connect GA4` / `Connect Search Console` の scope group が分かれる。
- `googleApiErrors` を app context に含める。
- connected-empty state を OAuth failure と分ける。
- Worker は `analyticsadmin.googleapis.com/v1beta/accountSummaries` を使い、`v1alpha` を使わない。

## 触る時に避けること

- Google OAuth と app context attachment を同じ問題として扱わない。
- connector connected だけで「注文にGA4 evidenceがある」と判定しない。
- OAuth connect 前に `/auth/status` を必須にしない。
- analytics connect に Gmail / Drive など不要な restricted scopes を混ぜない。
- Google source/report endpoint で `storage.getState()` を復活させない。
- token refresh を全体 state mutation に戻さない。
- Google APIエラーを空配列だけに潰さない。
- API未有効、scope不足、resource権限不足、source 0件を同じUI文言にしない。

## 症状別の見る場所

| 症状 | 最初に見る場所 | 典型原因 |
| --- | --- | --- |
| connect button を押してもOAuthが始まらない | `public/analytics-console.js`, `public/analytics-console.html` | link生成、auth origin、target、preflight依存 |
| OAuth後にscope不足になる | `handleGoogleAuthStart`, `handleGoogleAuthCallback`, `googleConnectorFromOAuthToken` | requested scope未保存、token.scope未返却時のmerge漏れ |
| assets/report が503/1102 | `handleGoogleConnectorAssets`, `handleGoogleAnalyticsReport` | 認証前D1全体scan、targeted load漏れ |
| GA4 properties が出ない | `fetchGoogleGa4AccountSummaries` | Admin API未有効、GA4権限なし、endpoint/version間違い |
| Search Console sites が出ない | `handleGoogleConnectorAssets` の GSC fetch | Search Console API未有効、site権限なし |
| 注文でGA4が使われない | `public/chat.js`, app context handoff | Analytics Console context未添付 |

