import worker from '../worker.js';

export const env = {
  APP_VERSION: '0.2.0-test',
  ALLOW_OPEN_WRITE_API: '1',
  ALLOW_GUEST_RUN_READ_API: '1',
  ALLOW_DEV_API: '1',
  CAIT_DEVELOPER_API_ENABLED: '1',
  CAIT_CLI_ENABLED: '1',
  CAIT_MCP_ENABLED: '1',
  EXPOSE_JOB_SECRETS: '1',
  SESSION_SECRET: 'worker-api-qa-secret',
  BILLING_ACTIVATION_ENABLED: '0',
  BASE_URL: 'https://example.test',
  SAMPLE_AGENT_ENDPOINT_BASE_URL: 'https://example.test/sample-agents',
  CAIT_ADMIN_API_TOKEN: 'worker-api-qa-admin-token',
  ALLOW_IN_MEMORY_STORAGE: '1',
  GITHUB_CLIENT_ID: 'github-worker-api-qa-client-id',
  GITHUB_CLIENT_SECRET: 'github-worker-api-qa-client-secret',
  GOOGLE_CLIENT_ID: 'google-worker-api-qa-client-id',
  GOOGLE_CLIENT_SECRET: 'google-worker-api-qa-client-secret',
  X_CLIENT_ID: 'x-worker-api-qa-client-id',
  X_CLIENT_SECRET: 'x-worker-api-qa-client-secret',
  X_TOKEN_ENCRYPTION_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
  OPEN_CHAT_INTENT_LLM: 'openai',
  OPEN_CHAT_ALLOW_PLATFORM_OPENAI_FALLBACK: 'true',
  OPENAI_API_KEY: 'sk-test-worker-open-chat',
  WORKFLOW_ENDPOINT_DISPATCH_TIMEOUT_MS: '10000',
  MY_BINDING: null,
  ASSETS: {
    async fetch() {
      return new Response('not found', { status: 404 });
    }
  }
};

const originalWorkerApiQaFetch = globalThis.fetch;
let workerApiQaSelfFetchEnv = env;
let leaderIntakeQuestionCalls = 0;
export function workerApiQaOpenAiStructuredOutput(schemaName = '') {
  const name = String(schemaName || '').trim().toLowerCase();
  if (name === 'cait_publisher_context_shaper') {
    return {
      title: 'QA shaped publisher packet',
      summary: 'Publisher-ready packet shaped from a writer delivery before entering Publisher.',
      facts: ['Source writer draft was normalized for Publisher fields.'],
      assumptions: ['No external publish action has been approved yet.'],
      recommended_next_actions: ['Review the owned-site packet in Publisher and approve the final publish handoff.'],
      artifacts: [
        {
          id: 'qa-shaped-owned-site',
          type: 'page',
          channel: 'owned_site',
          destination: 'CAIt owned site',
          connector: 'publisher',
          connector_capability: 'site_publish_packet',
          publish_method: 'publisher_review_or_selected_connector',
          action_type: 'site_publish_packet',
          market: 'Global',
          locale: 'en',
          owner: 'CAIt',
          title: 'QA shaped publisher article',
          slug: '/qa-shaped-publisher-article',
          meta: 'QA meta description shaped for Publisher.',
          keywords: 'publisher qa',
          h1: 'QA Shaped Publisher Article',
          primary_cta: 'Try CAIt',
          secondary_cta: '',
          internal_links: '/chat',
          og_title: 'QA shaped publisher article',
          og_description: 'QA OpenAI-shaped Publisher packet.',
          source_evidence: [],
          publish_variants: [],
          eeat_notes: {
            expertise: '',
            experience: '',
            authoritativeness: '',
            trust: '',
            compliance: 'Final publishing still requires approval.'
          },
          body: '# QA Shaped Publisher Article\n\nThis body was shaped by the OpenAI publisher context shaper.',
          status: 'needs approval',
          target: 'Owned site publish packet',
          risk: 'Review required before publishing to any external surface.'
        }
      ],
      approval_requests: [
        {
          id: 'qa-publisher-approval',
          title: 'Approve owned-site publish packet',
          description: 'Review the shaped Publisher packet before routing to a publish connector.',
          action_type: 'site_publish_packet',
          status: 'needs approval',
          blocker: 'Human approval required.',
          risk: 'External publishing must not occur automatically.',
          body: 'Approve only after checking copy, destination, and claims.'
        }
      ],
      delivery_files: [
        {
          name: 'qa-shaped-publisher.md',
          type: 'markdown',
          content: '# QA Shaped Publisher Article\n\nThis body was shaped by the OpenAI publisher context shaper.'
        }
      ]
    };
  }
  if (name.endsWith('_plan')) {
    return {
      task_understanding: 'QA workflow request understood with current inputs and source constraints.',
      assumptions: ['QA uses mocked OpenAI output.', 'Connector writes remain approval-gated.'],
      workstreams: ['Collect source evidence', 'Prepare the specialist artifact', 'Return the next approval-ready action'],
      risks: ['Private connector data may be unavailable.', 'External writes require explicit approval.'],
      success_checks: ['Delivery includes a concrete artifact.', 'Delivery includes metric and stop rule.']
    };
  }
  const kind = name.replace(/^aiagent2_/, '').replace(/_(draft|review)$/, '');
  const artifact = kind === 'cmo_leader'
    ? 'Leader synthesis of supporting work products: prior specialist evidence, qa research completed for research, qa planning completed for media_planner, qa preparation completed for seo_specialist, qa action completed for x_post. Uses handed-off source URL https://aiagent-marketplace.net/. Return this to the CMO leader for synthesis.'
    : kind === 'teardown'
    ? 'Competitor teardown: compare CAIt marketplace positioning, buyer proof, and conversion friction against visible alternatives.'
    : kind === 'data_analysis'
      ? 'Funnel contract: track source, landing page view, primary intent event, purchase, and assisted conversion.'
      : kind === 'validation'
        ? 'Validation packet: test one offer, one audience, one page, and one conversion signal before expanding channels.'
        : kind === 'media_planner'
          ? 'Media-fit analysis and Priority media queue: prioritize owned SEO, X proof posts, and directory listing only after evidence review. Channels to avoid: unfocused paid awareness.'
          : kind === 'directory_submission'
            ? 'Directory submission packet: listing title, one-line pitch, category, destination URL, and review checklist.'
            : kind === 'x_post'
              ? 'Exact X post packet: approved_copy, destination URL, utm_source=x, metric, and stop rule.'
              : kind === 'acquisition_automation'
                ? 'Acquisition automation flow: source capture, qualification state, manual approval, follow-up trigger, and stop rule.'
                : kind === 'seo_specialist'
                  ? 'SEO Specialist packet: target query, current page gap, title/H1 fix, internal link, directory/citation support, metric, and review checklist.'
                  : kind === 'landing'
                    ? 'Landing packet: hero copy, CTA copy, proof module, objection handling, measurement event, and publish note.'
                    : 'Execution packet: owner, objective, artifact, metric, stop rule, and approval owner.';
  return {
    summary: `QA ${kind || 'agent'} delivery ready.`,
    report_summary: `QA ${kind || 'agent'} report with source-aware action packet.`,
    bullets: [
      'Search evidence used: CAIt AI agent marketplace https://aiagent-marketplace.net/',
      kind === 'cmo_leader' ? 'Supporting work products and prior specialist handoff were synthesized.' : 'Prior specialist handoff was used where available.',
      'Owner and approval are explicit before external execution.',
      'Metric and stop rule are included for the next run.'
    ].slice(0, 4),
    next_action: 'Review the packet, approve the exact connector action, then dispatch the next specialist.',
    file_markdown: [
      `# QA ${kind || 'agent'} delivery`,
      '',
      artifact,
      '',
      '## 日本語納品品質',
      '- GA4 / Search Console の接続・利用状況を明示し、未接続の場合は仮定を分ける。',
      '- 自然検索・SEO、SNS・ソーシャル、広告の各チャネルで、開発者向け登録・トライアル獲得の具体策を出す。',
      '- 外部投稿、広告配信、送信、PR作成などは承認後にのみ実行する。',
      '',
      '| Owner | Objective | Artifact | Metric | Stop rule | Approval owner |',
      '| --- | --- | --- | --- | --- | --- |',
      '| CMO Leader | Turn source evidence into one approved growth action | Approval-ready execution packet | purchase and qualified intent event | stop if no qualified signal after 7 days | order owner |',
      '',
      '## Execution packet',
      '- Destination: https://aiagent-marketplace.net/',
      '- Source evidence: https://aiagent-marketplace.net/',
      '- Review checklist: exact copy, account, destination, metric, stop rule.',
      '- No external write occurs before approval.'
    ].join('\n'),
    confidence: 'medium',
    authority_request: null
  };
}

globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input?.url;
  if (String(url || '').startsWith('https://example.test/sample-agents/')) {
    const parsed = new URL(url);
    const [, kind = '', route = ''] = parsed.pathname.match(/^\/sample-agents\/([^/]+)\/([^/]+)$/) || [];
    if (route === 'health') {
      return new Response(JSON.stringify({ ok: true, service: `qa_${kind}_provider` }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }
    if (route === 'jobs') {
      const body = JSON.parse(String(init?.body || '{}'));
      const effectiveKind = String(body.task_type || kind || 'agent').trim().toLowerCase();
      const qa = workerApiQaOpenAiStructuredOutput(effectiveKind);
      const fileName = effectiveKind === 'seo_specialist'
        ? 'seo-agent-delivery.md'
        : (effectiveKind === 'data_analysis'
          ? 'data-analysis-delivery.md'
          : `${effectiveKind}-delivery.md`);
      const searchBackedKinds = new Set(['research', 'teardown', 'validation']);
      const webSources = searchBackedKinds.has(effectiveKind)
        ? [
            {
              title: 'CAIt AI agent marketplace',
              url: 'https://aiagent-marketplace.net/',
              snippet: 'QA source-backed provider result for workflow progression.',
              query: 'CAIt AI agent marketplace acquisition workflow',
              action: 'brave_search',
              provider: 'brave'
            }
          ]
        : [];
      return new Response(JSON.stringify({
        status: 'completed',
        summary: qa.summary,
        report: {
          summary: qa.report_summary,
          bullets: qa.bullets,
          nextAction: qa.next_action,
          authority_request: qa.authority_request,
          ...(webSources.length ? { web_sources: webSources } : {})
        },
        files: [{ name: fileName, content: qa.file_markdown }],
        usage: { input_tokens: 100, output_tokens: 120, api_cost: 1 }
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }
  }
  if (String(url || '') === 'https://api.openai.com/v1/responses') {
    const requestBody = JSON.parse(String(init?.body || '{}'));
    const schemaName = requestBody?.text?.format?.name || '';
    if (schemaName === 'cait_leader_intake_questions') {
      leaderIntakeQuestionCalls += 1;
      return new Response(JSON.stringify({
        output_text: JSON.stringify({
          questions: [
            '主な目的は問い合わせ・リード獲得、売上・購入、登録・トライアル、流入・認知のどれですか？',
            '対象ユーザーと広告・SEO・SNSの制約を教えてください。',
            '納品形式はKPI表、投稿文、LP改善案のどれですか？'
          ]
        }),
        usage: {
          input_tokens: 120,
          output_tokens: 80,
          total_tokens: 200
        }
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (schemaName === 'cait_preorder_intent') {
      const userPayload = JSON.parse(String(requestBody?.input?.find((item) => item?.role === 'user')?.content || '{}'));
      const prompt = String(userPayload.prompt || '').toLowerCase();
      const growth = /集客|購入.*増|new customers?|get customers?|growth|sales|purchase/.test(prompt);
      const research = /research|調査|summarize|findings/.test(prompt);
      const task = growth ? 'cmo_leader' : (research ? 'research' : 'summary');
      const action = growth ? 'ask_clarifying_question' : 'prepare_order';
      return new Response(JSON.stringify({
        output_text: JSON.stringify({
          action,
          intent: growth ? 'natural_business_growth' : 'natural_entity_exploration',
          intent_label: growth ? 'customer acquisition' : 'research request',
          summary: growth ? 'The user wants customer acquisition or purchase growth.' : 'The user wants source-backed research.',
          chat_answer: '',
          narrowing_question: growth ? 'What website URL, target customer, conversion goal, available analytics/source data, and delivery format should the CMO Leader use?' : '',
          intake_questions: growth
            ? [
                'What website URL or product should the CMO Leader review?',
                'Who is the target customer and what conversion should increase?',
                'What source data is available, such as GA4, Search Console, CRM, sales data, or social accounts?',
                'What delivery format and constraints should the leader follow?'
              ]
            : [],
          order_brief: action === 'prepare_order'
            ? [
                `Task: ${task}`,
                `Goal: ${prompt || 'Complete the requested research.'}`,
                'Work split: source collection -> analysis -> summary',
                'Inputs: chat request and any provided URLs or constraints',
                'Constraints: use source-backed evidence when current information matters',
                'Deliver: answer-first findings, assumptions, source status, and next action',
                'Output language: English',
                'Acceptance: concrete delivery with source status and reusable findings'
              ].join('\n')
            : '',
          options: [],
          confidence: 0.82
        }),
        usage: {
          input_tokens: 120,
          output_tokens: 80,
          total_tokens: 200
        }
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (schemaName === 'cait_leader_workflow_plan') {
      const userPayload = JSON.parse(String(requestBody?.input?.find((item) => item?.role === 'user')?.content || '{}'));
      const deterministic = Array.isArray(userPayload.deterministic_plan) ? userPayload.deterministic_plan : [];
      const prompt = String(userPayload.prompt || '');
      const planned = /qa force legacy action planner/i.test(prompt)
        ? ['cmo_leader', 'research', 'media_planner', 'x_post', 'acquisition_automation', 'reddit', 'indie_hackers', 'directory_submission']
        : (deterministic.length ? deterministic.slice(0, 10) : ['cmo_leader', 'research', 'media_planner', 'seo_specialist']);
      return new Response(JSON.stringify({
        output_text: JSON.stringify({
          planned_tasks: planned,
          task_tags: planned.map((task) => ({ task_type: task, tags: ['qa', 'source-aware'] })),
          reason: 'QA leader planner keeps deterministic ordering while making the planner success explicit.',
          confidence: 0.86
        }),
        usage: {
          input_tokens: 100,
          output_tokens: 60,
          total_tokens: 160
        }
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response(JSON.stringify({
      output_text: JSON.stringify(workerApiQaOpenAiStructuredOutput(schemaName)),
      usage: {
        input_tokens: 120,
        output_tokens: 80,
        total_tokens: 200
      }
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (String(url || '').startsWith('https://api.search.brave.com/')) {
    return new Response(JSON.stringify({
      web: {
        results: [
          {
            title: 'CAIt AI agent marketplace',
            url: 'https://aiagent-marketplace.net/',
            description: 'CAIt marketplace source result for workflow QA.',
            extra_snippets: ['AI agent marketplace workflow, ordering, execution, and delivery review.']
          }
        ]
      }
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  return originalWorkerApiQaFetch(input, init);
};
export const qaSearchEnv = {
  ...env,
  BRAVE_SEARCH_API_KEY: 'brave-worker-api-qa',
  OPENAI_API_KEY: 'sk-test-worker-qa'
};
workerApiQaSelfFetchEnv = qaSearchEnv;

export const SESSION_COOKIE = 'aiagent2_session';
const textEncoder = new TextEncoder();
const sessionCsrfTokens = new Map();

function base64urlEncode(value) {
  return Buffer.from(value).toString('base64url');
}

export async function buildSessionCookie(login, name, options = {}) {
  const provider = String(options.provider || 'google-oauth').trim();
  const csrfToken = `csrf_${login}_${Math.random().toString(16).slice(2)}`;
  const payload = {
    authProvider: provider,
    user: { login, name },
    accountLogin: login,
    csrfToken,
    createdAt: Date.now(),
    sessionVersion: 2,
    exp: Date.now() + 12 * 60 * 60 * 1000
  };
  if (provider === 'github-app') {
    payload.githubIdentity = {
      login,
      providerUserId: `${login}-gh-app`,
      name
    };
    payload.githubAppUserAccessToken = `ghapp_${login}`;
    payload.githubApp = { installations: [], repos: [] };
    payload.linkedProviders = ['github-app'];
  } else if (provider === 'github-oauth') {
    payload.githubIdentity = {
      login,
      providerUserId: `${login}-gh-oauth`,
      name
    };
    payload.githubAccessToken = `gho_${login}`;
    payload.githubScopes = ['read:user'];
    payload.linkedProviders = ['github-oauth'];
  } else if (provider === 'google-oauth') {
    payload.googleIdentity = {
      email: `${login}@example.com`,
      providerUserId: `${login}-google`,
      name
    };
    payload.googleAccessToken = `goog_${login}`;
    payload.linkedProviders = ['google-oauth'];
  }
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(env.SESSION_SECRET));
  const key = await crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    textEncoder.encode(JSON.stringify(payload))
  );
  const sealed = `${base64urlEncode(iv)}.${base64urlEncode(new Uint8Array(ciphertext))}`;
  const cookie = `${SESSION_COOKIE}=${encodeURIComponent(sealed)}`;
  sessionCsrfTokens.set(cookie, csrfToken);
  return cookie;
}

export async function request(path, init = {}, options = {}) {
  const headers = new Headers(init.headers || {});
  if (options.sessionCookie) headers.set('cookie', options.sessionCookie);
  const method = String(init.method || 'GET').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && !headers.has('origin')) headers.set('origin', 'https://example.test');
  if (options.sessionCookie && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && !options.skipCsrf) {
    if (!headers.has('x-aiagent2-csrf')) headers.set('x-aiagent2-csrf', sessionCsrfTokens.get(options.sessionCookie) || '');
  }
  const targetEnv = options.env || env;
  if (process.env.WORKER_API_QA_TRACE === '1') console.error(`REQ ${method} ${path}`);
  const ctx = Array.isArray(options.waitUntilPromises)
    ? { waitUntil: (promise) => options.waitUntilPromises.push(Promise.resolve(promise)) }
    : undefined;
  const previousSelfFetchEnv = workerApiQaSelfFetchEnv;
  workerApiQaSelfFetchEnv = targetEnv;
  const restoreSelfFetchEnv = !Array.isArray(options.waitUntilPromises);
  let res;
  let timeoutHandle = null;
  try {
    res = await Promise.race([
      worker.fetch(new Request(`https://example.test${path}`, { ...init, headers }), targetEnv, ctx),
      new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error(`worker-api-qa request timed out: ${method} ${path}`)), 20000);
      })
    ]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    if (restoreSelfFetchEnv) workerApiQaSelfFetchEnv = previousSelfFetchEnv;
  }
  const text = await res.text();
  if (process.env.WORKER_API_QA_TRACE === '1') console.error(`RES ${method} ${path} ${res.status}`);
  const responseHeaders = Object.fromEntries(res.headers.entries());
  if (typeof res.headers.getSetCookie === 'function') {
    const setCookies = res.headers.getSetCookie();
    if (setCookies.length) responseHeaders['set-cookie'] = setCookies.join('\n');
  }
  let body = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {}
  return { status: res.status, body, text, headers: responseHeaders };
}

export function cookiePairFromSetCookieHeader(headers = {}, name = '') {
  const raw = String(headers['set-cookie'] || headers['Set-Cookie'] || '');
  const marker = `${name}=`;
  const start = raw.indexOf(marker);
  if (start === -1) return '';
  const tail = raw.slice(start);
  const end = tail.indexOf(';');
  return end === -1 ? tail : tail.slice(0, end);
}

if (process.env.WORKER_API_QA_TRACE === '1') console.error('TRACE before sessions');
export const aliceSession = await buildSessionCookie('alice', 'Alice Example', { provider: 'github-app' });
export const samuraiSession = await buildSessionCookie('samurai', 'Samurai Example', { provider: 'github-app' });
export const daveSession = await buildSessionCookie('dave', 'Dave Example', { provider: 'google-oauth' });
export const adminSession = await buildSessionCookie('yasuikunihiro@gmail.com', 'Yasu Admin', { provider: 'google-oauth' });


export function setWorkerApiQaSelfFetchEnv(nextEnv) {
  workerApiQaSelfFetchEnv = nextEnv || env;
}

export function getLeaderIntakeQuestionCalls() {
  return leaderIntakeQuestionCalls;
}
