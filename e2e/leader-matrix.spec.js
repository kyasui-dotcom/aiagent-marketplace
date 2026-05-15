import { expect, test } from '@playwright/test';
import { authSkipReason, canUseAuth, chatResponseTimeout, openAuthenticatedChat } from './helpers/auth.js';

const leaders = [
  {
    taskType: 'research_team_leader',
    label: 'Research Team Leader',
    prompt: 'Research Team Leaderとして、CAItの競合と市場ポジションを複数ソースで調査して意思決定メモにしてください。',
    answer: '対象はCAIt。URLは https://aiagent-marketplace.net 。競合はAI agent marketplace全般。目的は高品質アウトプット市場での差別化判断。読ませたい追加資料はなし。納品は根拠付き意思決定メモ。'
  },
  {
    taskType: 'build_team_leader',
    label: 'Build Team Leader',
    prompt: 'Build Team Leaderとして、GitHub repoのチャット不具合修正を実装チームに分解して検証まで進めたいです。',
    answer: '対象repoはaiagent2。問題はチャットの送信とスケジュール周り。ログはPlaywright E2Eの失敗ログ。制約は小さな差分、既存UI維持、検証はnode --checkとPlaywright。納品は実装分担とPRハンドオフ。'
  },
  {
    taskType: 'cmo_leader',
    label: 'CMO Leader',
    prompt: 'CMO Leaderとして、CAItの集客を増やす施策を考えて実行プランにしてください。',
    answer: '商材はCAIt https://aiagent-marketplace.net 。目標は登録とagent登録。ターゲットはAIツールを使う開発者と小規模SaaS創業者。GA4/Search Consoleは未接続、資料なし。広告費なしでSEO、X、Reddit中心。納品は7日プランと投稿案。'
  },
  {
    taskType: 'cto_leader',
    label: 'CTO Leader',
    prompt: 'CTO Leaderとして、SaaS全体設計、認証、スケジュール実行、ロールバック計画をレビューしてください。',
    answer: '対象はCloudflare Workers上のCAIt。関心は認証、CSRF、スケジュールcron、OAuth継続、E2E。制約は本番影響を小さくし、ロールバック可能な変更にすること。納品は技術判断メモと検証ゲート。'
  },
  {
    taskType: 'cpo_leader',
    label: 'CPO Leader',
    prompt: 'CPO Leaderとして、CAItのプロダクト体験とロードマップ優先順位を整理してください。',
    answer: '対象ユーザーは高品質なAIアウトプットを簡単に欲しい利用者とagent提供者。課題は機能過多で価値がぼやけること。成功指標は初回注文完了率と再注文率。資料は現サイトのみ。納品は優先順位と検証計画。'
  },
  {
    taskType: 'cfo_leader',
    label: 'CFO Leader',
    prompt: 'CFO Leaderとして、CAItの価格設計とユニットエコノミクスを見直してください。',
    answer: '収益モデルは注文課金と将来のサブスク。現時点の数値は仮で、原価はOpenAI API、Cloudflare、決済手数料。目標粗利は70%以上。返金や失敗時の扱いも見たい。納品はシナリオ表と次の価格判断。'
  },
  {
    taskType: 'legal_leader',
    label: 'Legal Leader',
    prompt: 'Legal Leaderとして、AI agent marketplaceの規約、プライバシー、コンプライアンスリスクをレビューしてください。',
    answer: '対象は日本向けCAIt。扱うデータはチャット、納品履歴、OAuth連携データ、支払い情報。資料は公開サイトのみ。法的助言ではなく論点整理でよい。納品はリスクマップ、足りない事実、弁護士確認事項。'
  },
  {
    taskType: 'secretary_leader',
    label: 'Secretary Leader',
    prompt: 'Secretary Leaderとして、受信箱整理、返信下書き、日程調整、フォローアップをまとめて運用したいです。',
    answer: '対象は代表者のGmailとGoogle Calendar。今は実コネクタなしなので送信や予定作成はしない。優先したいのは重要メールの分類、返信下書き、候補日整理、フォローアップ。タイムゾーンはAsia/Tokyo。納品は承認ゲート付き運用パケット。'
  }
];

function safeId(value = '') {
  return String(value || '').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

async function disableOpenChatIntent(page) {
  await page.route('**/api/open-chat/intent', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Open chat LLM disabled for deterministic leader matrix E2E.' })
    });
  });
}

async function mockOrderLifecycle(page, leader) {
  const jobId = `e2e-leader-${safeId(leader.taskType)}`;
  let capturedCreatePayload = null;
  await page.route('**/api/jobs', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    capturedCreatePayload = JSON.parse(route.request().postData() || '{}');
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        mode: 'workflow',
        status: 'running',
        workflow_job_id: jobId,
        order_strategy_resolved: 'multi',
        child_runs: [
          { id: `${jobId}-source`, taskType: 'research', status: 'completed' },
          { id: `${jobId}-summary`, taskType: 'summary', status: 'queued' }
        ]
      })
    });
  });
  await page.route(`**/api/jobs/${jobId}**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        job: {
          id: jobId,
          jobKind: 'workflow',
          parentAgentId: 'chatux',
          taskType: leader.taskType,
          workflowTask: leader.taskType,
          status: 'completed',
          completedAt: new Date().toISOString(),
          workflow: {
            statusCounts: { total: 2, completed: 2, running: 0, queued: 0, waiting: 0, failed: 0 },
            childRuns: [
              { id: `${jobId}-source`, taskType: 'research', status: 'completed' },
              { id: `${jobId}-summary`, taskType: 'summary', status: 'completed' }
            ]
          },
          output: {
            summary: `${leader.label} E2E delivery completed.`,
            report: {
              summary: `${leader.label} E2E delivery completed.`,
              bullets: ['Leader intake was answered.', 'Workflow payload preserved the active leader.', 'Delivery rendered back in chat.'],
              nextAction: 'Review the leader packet before external execution.'
            },
            files: [
              {
                name: `${leader.taskType}-e2e-delivery.md`,
                content: `# ${leader.label} E2E Delivery\n\nCompleted matrix delivery for ${leader.taskType}.\n`
              }
            ]
          }
        }
      })
    });
  });
  return () => capturedCreatePayload;
}

test.describe('all CAIt leaders', () => {
  for (const leader of leaders) {
    test(`${leader.label} reaches intake, draft, dispatch, and delivery`, async ({ page }) => {
      test.skip(!canUseAuth, authSkipReason);
      test.setTimeout(120_000);

      await disableOpenChatIntent(page);
      const capturedPayload = await mockOrderLifecycle(page, leader);
      await openAuthenticatedChat(page, {
        returnTo: `/chat?e2e=leader-matrix-${leader.taskType}`,
        loginSource: `playwright_leader_${leader.taskType}`
      });

      await page.locator('#promptInput').fill(leader.prompt);
      await page.locator('#sendMessageBtn').click();
      await expect(page.locator('#activeLeaderStatus')).toContainText(`Lead: ${leader.label}`, { timeout: chatResponseTimeout });
      await expect(page.locator('#chatThread')).toContainText(/Nothing has been dispatched yet\.|まだ実行も課金も発生していません/, { timeout: chatResponseTimeout });

      await page.locator('#promptInput').fill(leader.answer);
      await page.locator('#sendMessageBtn').click();
      await expect(page.locator('#chatThread')).toContainText(`Task: ${leader.taskType}`, { timeout: chatResponseTimeout });
      await expect(page.locator('#chatThread')).toContainText('Route: MULTI');
      await expect(page.getByRole('button', { name: 'Send order' })).toBeVisible();

      await page.getByRole('button', { name: 'Send order' }).click();
      await expect(page.locator('#chatThread')).toContainText('Agent map', { timeout: chatResponseTimeout });
      await expect(page.locator('#chatThread')).toContainText('Delivery update', { timeout: 60_000 });
      await expect(page.locator('#chatThread')).toContainText(`${leader.label} E2E delivery completed.`);

      const payload = capturedPayload();
      expect(payload?.task_type).toBe(leader.taskType);
      expect(payload?.order_strategy).toBe('multi');
      expect(payload?.input?._broker?.conversationOwner?.type).toBe('leader');
      expect(payload?.input?._broker?.activeLeader?.taskType).toBe(leader.taskType);
    });
  }
});
