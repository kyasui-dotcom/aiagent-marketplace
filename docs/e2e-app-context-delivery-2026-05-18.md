# E2E / App Context Handoff Delivery

## Answer first
ローカル E2E と本番 E2E はどちらも `33/33 passed` です。通常 E2E から local write flow は除外され、Analytics Console への app context handoff は一時的な `/api/app-contexts` 失敗をリトライする形になっています。

## Scope
- Chat intake から Analytics Console へヒアリング文脈を渡す導線
- Publisher / Lead Ops など、server-side app context を使う SaaS handoff 導線
- 通常 E2E からの local write flow 排除
- 本番 E2E での主要チャット/アプリ/リーダー導線確認

## Delivered changes
### 1. App context handoff retry
Chat から app を開く前に `/api/app-contexts` へ server-side context を作成します。この作成が一時的な `500` で落ちると、以前は即座に「自動添付失敗」と表示されていました。

対応後は、以下の transient status を最大3回リトライします。

- `408`
- `425`
- `429`
- `500`
- `502`
- `503`
- `504`

対象ファイル:
- `public/chat.js`
- `scripts/ui-qa.mjs`

### 2. Local write flow cleanup
通常 E2E から local-only write flow を外しました。実オーダー品質確認は、明示的に `E2E_ORDER_SCENARIO=1` または `E2E_ORDER_ID` を指定したときだけ走る専用シナリオに寄せています。

対象ファイル:
- `e2e/api-contract.spec.js`
- `playwright.config.js`
- `scripts/e2e-production.mjs`
- `scripts/e2e-qa.mjs`
- `server.js`

### 3. QA guard
`scripts/ui-qa.mjs` に、app context handoff が transient server failure をリトライすることを確認する静的チェックを追加しました。

## E2E results
### Local E2E
Command:

```bash
npm run qa:e2e
```

Result:

```text
33 passed
0 skipped
```

### Production E2E
Command:

```bash
npm run qa:e2e:prod
```

Result:

```text
33 passed
0 skipped
```

## Additional QA
```bash
npm run qa:ui
npm run qa:discipline
```

Result:

```text
ui qa passed
discipline qa passed
```

## What was verified
- Analytics Console context handoff returns to the active intake instead of opening a separate chat.
- CAIt app pages do not persist local browser data.
- Chat shows only contract-matched app handoffs for a delivery.
- Publisher opens with preparation delivery context from chat handoff.
- Lead Ops opens with List Creator lead rows from chat handoff.
- Publisher-capable agent outputs route into Publisher context.
- Retry as new order starts fresh work instead of continuing the old order.
- Approval-required actions remain inside the chat workspace.
- All leader flows reach intake, draft, dispatch, and delivery in the matrix E2E.

## Residual risk
During one production E2E run, `/auth/status` temporarily stayed at `Session status unavailable. Retrying...` and one test timed out. The same test passed immediately when rerun alone, and the full production E2E passed on the next run. Current assessment: transient auth status read failure, not a delivery or app-context regression.

If this becomes frequent, the next fix should target auth-status resilience or E2E auth wait behavior.

## Review notes
- The retry fix is plumbing-only. It does not add CMO-specific behavior to worker/orchestration.
- App context routing remains contract-based.
- Built-in/sample agents are not special-cased by this change.
- Delivery Manager remains a CAIt core feature, not an external app handoff candidate.
