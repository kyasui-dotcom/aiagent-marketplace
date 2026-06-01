# Built-in Agents Sample Output Review

作成日: 2026-06-01 (Asia/Tokyo)

## 前提

- 対象: `lib/builtin-agents/agents/` の 43 sample agent。
- チェック方法: `npm run agent:test:snapshot -- --group all --out tmp\automation-2-before-20260601-sample-agents` と `npm run agent:test:compare -- --group all --baseline tmp\automation-2-before-20260601-sample-agents\snapshot.json --out tmp\automation-2-after-20260601-sample-agents`
- 出力モード: stable mock OpenAI mode。実モデルの文章品質ではなく、各 agent が provider request packet に agent purpose / action boundaries / delivery contract / forbidden claims を渡せているかを確認するための回帰出力。
- 現状: 43件すべて `completed`。Before/After の変更は 0 件。前回証跡との差分も 0 件。公開注文可は 40 件、非公開 fixture は 3 件。
- 実装判断: 今回の回帰では納品物としての契約差分は見つからないため、サンプルエージェント本体の修正は不要。理想形/現実差分表と今回の証跡を更新する。

## 全体改善方針

| 観点 | 現状 | 改善案 |
|---|---|---|
| サンプル依頼 | 全 agent に1件ずつ canonical fixture があり、目的・成果物・禁止 claim を渡せている | agentを変更した時だけ専用 fixture を増やし、証拠あり/なし・connectorあり/なしの差分を見る |
| stable mock 出力 | purpose / action boundaries / delivery contract は全 agent で露出 | 成果物本文そのものの品質評価は live mode または provider mock の追加ケースで評価する |
| 納品品質 | 現在の43件はすべて delivery gate packet を満たす | 実注文でよく使う代表 agent は live sample を残し、具体性・文体・過剰claimを確認する |
| 残課題 | regression package上の契約gapはなし | UI/production catalog とD1 seedの同期をデプロイ後smokeで継続確認する |

## 個別レビュー

| Agent | Catalog | 現状アウトプットチェック | 改善案 |
|---|---|---|---|
| `cmo_leader` | 公開注文可 | `completed`; Before/After changed no; actions 16, sections 10, evidence 3, labels 6, forbidden 5 | 現状は納品可能。次回変更時は該当agentのlive sampleで文章品質を確認。 |
| `free_web_growth_leader` | 非公開 fixture | `completed`; Before/After changed no; actions 2, sections 8, evidence 2, labels 3, forbidden 5 | 公開注文からは除外維持。統合先leaderとの役割重複を増やさない。 |
| `launch_team_leader` | 非公開 fixture | `completed`; Before/After changed no; actions 2, sections 8, evidence 3, labels 3, forbidden 5 | 公開注文からは除外維持。統合先leaderとの役割重複を増やさない。 |
| `campaign_operations` | 公開注文可 | `completed`; Before/After changed no; actions 4, sections 11, evidence 7, labels 11, forbidden 13 | 現状は納品可能。次回変更時は該当agentのlive sampleで文章品質を確認。 |
| `ads_planner` | 公開注文可 | `completed`; Before/After changed no; actions 4, sections 12, evidence 5, labels 6, forbidden 8 | 現状は納品可能。次回変更時は該当agentのlive sampleで文章品質を確認。 |
| `seo_specialist` | 公開注文可 | `completed`; Before/After changed no; actions 4, sections 11, evidence 6, labels 9, forbidden 9 | 現状は納品可能。次回変更時は該当agentのlive sampleで文章品質を確認。 |
| `writer` | 公開注文可 | `completed`; Before/After changed no; actions 3, sections 10, evidence 5, labels 6, forbidden 7 | 現状は納品可能。次回変更時は該当agentのlive sampleで文章品質を確認。 |
| `landing` | 公開注文可 | `completed`; Before/After changed no; actions 3, sections 16, evidence 7, labels 10, forbidden 12 | 現状は納品可能。次回変更時は該当agentのlive sampleで文章品質を確認。 |
| `x_post` | 公開注文可 | `completed`; Before/After changed no; actions 4, sections 11, evidence 5, labels 7, forbidden 7 | 現状は納品可能。次回変更時は該当agentのlive sampleで文章品質を確認。 |
| `instagram` | 公開注文可 | `completed`; Before/After changed no; actions 4, sections 14, evidence 8, labels 8, forbidden 11 | 現状は納品可能。次回変更時は該当agentのlive sampleで文章品質を確認。 |
| `reddit` | 公開注文可 | `completed`; Before/After changed no; actions 3, sections 14, evidence 7, labels 8, forbidden 10 | 現状は納品可能。次回変更時は該当agentのlive sampleで文章品質を確認。 |
| `indie_hackers` | 公開注文可 | `completed`; Before/After changed no; actions 3, sections 13, evidence 6, labels 9, forbidden 8 | 現状は納品可能。次回変更時は該当agentのlive sampleで文章品質を確認。 |
| `email_ops` | 公開注文可 | `completed`; Before/After changed no; actions 4, sections 14, evidence 7, labels 7, forbidden 9 | 現状は納品可能。次回変更時は該当agentのlive sampleで文章品質を確認。 |
| `cold_email` | 公開注文可 | `completed`; Before/After changed no; actions 4, sections 14, evidence 9, labels 10, forbidden 12 | 現状は納品可能。次回変更時は該当agentのlive sampleで文章品質を確認。 |
| `acquisition_automation` | 公開注文可 | `completed`; Before/After changed no; actions 3, sections 10, evidence 5, labels 8, forbidden 9 | 現状は納品可能。次回変更時は該当agentのlive sampleで文章品質を確認。 |
| `media_planner` | 公開注文可 | `completed`; Before/After changed no; actions 3, sections 12, evidence 4, labels 6, forbidden 8 | 現状は納品可能。次回変更時は該当agentのlive sampleで文章品質を確認。 |
| `directory_submission` | 公開注文可 | `completed`; Before/After changed no; actions 3, sections 10, evidence 3, labels 5, forbidden 7 | 現状は納品可能。次回変更時は該当agentのlive sampleで文章品質を確認。 |
| `citation_ops` | 公開注文可 | `completed`; Before/After changed no; actions 3, sections 8, evidence 3, labels 6, forbidden 7 | 現状は納品可能。次回変更時は該当agentのlive sampleで文章品質を確認。 |
| `list_creator` | 公開注文可 | `completed`; Before/After changed no; actions 3, sections 13, evidence 9, labels 11, forbidden 9 | 現状は納品可能。次回変更時は該当agentのlive sampleで文章品質を確認。 |
| `growth` | 公開注文可 | `completed`; Before/After changed no; actions 3, sections 15, evidence 6, labels 9, forbidden 10 | 現状は納品可能。次回変更時は該当agentのlive sampleで文章品質を確認。 |
| `agent_team_leader` | 非公開 fixture | `completed`; Before/After changed no; actions 3, sections 8, evidence 3, labels 6, forbidden 4 | 公開注文からは除外維持。統合先leaderとの役割重複を増やさない。 |
| `build_team_leader` | 公開注文可 | `completed`; Before/After changed no; actions 3, sections 14, evidence 7, labels 14, forbidden 9 | 現状は納品可能。次回変更時は該当agentのlive sampleで文章品質を確認。 |
| `cfo_leader` | 公開注文可 | `completed`; Before/After changed no; actions 4, sections 11, evidence 6, labels 8, forbidden 5 | 現状は納品可能。次回変更時は該当agentのlive sampleで文章品質を確認。 |
| `code` | 公開注文可 | `completed`; Before/After changed no; actions 5, sections 10, evidence 5, labels 7, forbidden 6 | 現状は納品可能。次回変更時は該当agentのlive sampleで文章品質を確認。 |
| `cpo_leader` | 公開注文可 | `completed`; Before/After changed no; actions 3, sections 9, evidence 4, labels 7, forbidden 4 | 現状は納品可能。次回変更時は該当agentのlive sampleで文章品質を確認。 |
| `cto_leader` | 公開注文可 | `completed`; Before/After changed no; actions 3, sections 11, evidence 5, labels 7, forbidden 5 | 現状は納品可能。次回変更時は該当agentのlive sampleで文章品質を確認。 |
| `data_analysis` | 公開注文可 | `completed`; Before/After changed no; actions 3, sections 10, evidence 7, labels 10, forbidden 6 | 現状は納品可能。次回変更時は該当agentのlive sampleで文章品質を確認。 |
| `diligence` | 公開注文可 | `completed`; Before/After changed no; actions 3, sections 12, evidence 6, labels 11, forbidden 6 | 現状は納品可能。次回変更時は該当agentのlive sampleで文章品質を確認。 |
| `follow_up` | 公開注文可 | `completed`; Before/After changed no; actions 3, sections 13, evidence 6, labels 9, forbidden 6 | 現状は納品可能。次回変更時は該当agentのlive sampleで文章品質を確認。 |
| `hiring` | 公開注文可 | `completed`; Before/After changed no; actions 3, sections 13, evidence 6, labels 12, forbidden 8 | 現状は納品可能。次回変更時は該当agentのlive sampleで文章品質を確認。 |
| `inbox_triage` | 公開注文可 | `completed`; Before/After changed no; actions 3, sections 14, evidence 7, labels 12, forbidden 7 | 現状は納品可能。次回変更時は該当agentのlive sampleで文章品質を確認。 |
| `legal_leader` | 公開注文可 | `completed`; Before/After changed no; actions 3, sections 9, evidence 4, labels 8, forbidden 5 | 現状は納品可能。次回変更時は該当agentのlive sampleで文章品質を確認。 |
| `meeting_notes` | 公開注文可 | `completed`; Before/After changed no; actions 4, sections 13, evidence 6, labels 11, forbidden 8 | 現状は納品可能。次回変更時は該当agentのlive sampleで文章品質を確認。 |
| `meeting_prep` | 公開注文可 | `completed`; Before/After changed no; actions 3, sections 11, evidence 4, labels 8, forbidden 5 | 現状は納品可能。次回変更時は該当agentのlive sampleで文章品質を確認。 |
| `pricing` | 公開注文可 | `completed`; Before/After changed no; actions 4, sections 14, evidence 6, labels 9, forbidden 5 | 現状は納品可能。次回変更時は該当agentのlive sampleで文章品質を確認。 |
| `prompt_brushup` | 公開注文可 | `completed`; Before/After changed no; actions 3, sections 11, evidence 4, labels 8, forbidden 4 | 現状は納品可能。次回変更時は該当agentのlive sampleで文章品質を確認。 |
| `reply_draft` | 公開注文可 | `completed`; Before/After changed no; actions 3, sections 16, evidence 6, labels 11, forbidden 7 | 現状は納品可能。次回変更時は該当agentのlive sampleで文章品質を確認。 |
| `research_team_leader` | 公開注文可 | `completed`; Before/After changed no; actions 3, sections 10, evidence 6, labels 10, forbidden 5 | 現状は納品可能。次回変更時は該当agentのlive sampleで文章品質を確認。 |
| `research` | 公開注文可 | `completed`; Before/After changed no; actions 4, sections 11, evidence 6, labels 7, forbidden 9 | 現状は納品可能。次回変更時は該当agentのlive sampleで文章品質を確認。 |
| `schedule_coordination` | 公開注文可 | `completed`; Before/After changed no; actions 5, sections 14, evidence 6, labels 8, forbidden 7 | 現状は納品可能。次回変更時は該当agentのlive sampleで文章品質を確認。 |
| `secretary_leader` | 公開注文可 | `completed`; Before/After changed no; actions 3, sections 10, evidence 3, labels 5, forbidden 4 | 現状は納品可能。次回変更時は該当agentのlive sampleで文章品質を確認。 |
| `teardown` | 公開注文可 | `completed`; Before/After changed no; actions 3, sections 10, evidence 5, labels 6, forbidden 4 | 現状は納品可能。次回変更時は該当agentのlive sampleで文章品質を確認。 |
| `validation` | 公開注文可 | `completed`; Before/After changed no; actions 4, sections 14, evidence 7, labels 9, forbidden 6 | 現状は納品可能。次回変更時は該当agentのlive sampleで文章品質を確認。 |

## 次に実装するとよい確認セット

1. stable mock に加えて、代表 agent の live mode sample を実行し、実文章の具体性を確認する。
2. fixture に「証拠あり」「証拠なし」「connectorあり」「connectorなし」を混ぜる。
3. 各 agent の出力で、最終成果物本文が `Purpose / Delivery contract` の列挙だけで終わらないことを確認する acceptance check を追加する。
4. 非公開 fixture 3件は public catalog から隠したまま、CMO/build/research leader への統合方針を維持する。
