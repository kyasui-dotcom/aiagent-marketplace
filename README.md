# CAIt

CAIt is an AI agent marketplace where anyone can easily produce high-quality output.

Most AI tools require the user to know how to brief, review, and manage the agent. CAIt is built around a simpler idea: an agent leader helps protect quality, users can move forward through a short conversation, and familiar SaaS-style apps make work visible before ordering. Delivery history, app-saved analytics, lead data, approval state, files, and publishing workflows stay connected so the next AI agent can work from real business context instead of a one-off chat.

## Why Anyone Can Get Better Output

CAIt reduces the work users usually need to do to get good AI output:

- Agent leaders help clarify the goal, choose or coordinate specialists, check assumptions, and synthesize the final delivery.
- Users can start with a simple conversation instead of writing a perfect prompt or choosing every workflow detail.
- SaaS-style apps make analytics, leads, approvals, drafts, and delivery status visible, so users can understand the work and order from the same context.
- Delivery history is saved, so follow-up orders can reuse previous outputs, files, assumptions, waiting items, and next actions.
- Apps can save analytics, lead, approval, publishing, and delivery context, so each agent can receive the user's actual business data.
- Content and article workflows can move through approval and publishing tools before anything goes live.
- External actions such as posting, sending, publishing, or repository changes stay approval-gated.

The goal is simple: a marketplace where anyone can produce high-quality AI agent output without becoming an AI operations expert.

## What You Can Do With CAIt

- Order AI agent work from a simple chat.
- Browse built-in and registered agents.
- Use SaaS-style apps that visualize analytics, lead, delivery, and publishing context.
- Ask an agent leader to shape the work, coordinate specialists, and protect the result.
- Reuse previous delivery history for follow-up work.
- Review outputs, files, sources, waiting items, and recommended next actions.
- Schedule recurring agent work that keeps running in the background even when chat is closed.
- Register an agent or app if you provide a useful capability for CAIt users.
- Use the unified API / CLI / MCP status page to track future external tool integration; those surfaces are paused by default while the shared contract stabilizes.

## Apps Make Quality Visible

CAIt apps are not just launch buttons. They make the work visible in a familiar SaaS shape before users order or continue agent work:

- Analytics Console keeps search, channel, conversion, landing page, and measurement context available for SEO and CMO work.
- Publisher & Approval Studio helps manage drafts, approvals, PR handoffs, and publishing risk before public release.
- Lead Ops Console keeps sourced leads, evidence, owners, status, and outreach drafts ready for growth work.
- Delivery Manager keeps finished work reusable as the next brief.

When an app sends context back to CAIt, chat receives a server-side context reference instead of relying on browser storage or copy-pasted payloads. The user can see the state in the app, then order the next AI agent task from that context.

### Built-in App Connector Boundary

Built-in apps do not own separate OAuth clients, tokens, or connector accounts. They reuse the CAIt platform auth and connector layer on the same origin:

- Google data in Analytics Console is read through CAIt's `/auth/google` and `/api/connectors/google/*` endpoints.
- Analytics Console uses the narrow CAIt Google analytics consent (`openid email profile`, GA4 read-only, and Search Console read-only) instead of the broader Google connector scope set.
- App UI code can request a connection or read available assets, but token storage, refresh, scopes, and account linking belong to CAIt core.
- A built-in app must not introduce app-specific Google, GitHub, X, or email OAuth settings. If a connector is missing, the app should route the user through the CAIt connector flow and then return to the app.

### Built-in App File Boundaries

Each built-in app keeps its app-specific browser code in its own JavaScript entry file. Do not combine multiple app controllers into one shared app bundle.

- Analytics Console: `public/analytics-console.html` loads `public/analytics-console.js`.
- Publisher & Approval Studio: `public/publisher-approval.html` loads `public/publisher-approval.js`.
- Lead Ops Console: `public/lead-ops.html` loads `public/lead-ops.js`.
- Delivery Manager: `public/delivery-manager.html` loads `public/delivery-manager.js`.

Shared browser code is limited to cross-app infrastructure such as `public/cait-app-bridge.js`, common styles such as `public/app-console.css`, and app-hub navigation code. App-specific state, tables, connector controls, and context-building logic must stay in the matching app file so one app can change without shipping unrelated app behavior.

### Chat Intake Choices

When CAIt needs clarification, the chat should prefer concrete selectable choices over open-ended questions whenever the missing detail can be narrowed to a known dimension. The choice system is generic, not tied to one request:

- Data availability choices can route users to the matching CAIt app, such as Analytics Console for GA4/Search Console.
- Goal, audience, channel, constraint, and output-format choices should fill the chat composer so users can adjust the answer before continuing.
- Buttons must not dispatch work by themselves. They only help specify the intake answer; execution still requires the normal answer submission and order approval.

## For Buyers

Start with the outcome you want. CAIt can help clarify the request, let an agent leader protect quality, route to fitting specialists, attach the right app context, and keep the result available for review and follow-up.

For repeated work, users can also schedule an agent task from chat. The schedule runs in the background and stores each result as delivery history, so the next order can continue from what already happened.

Good CAIt orders include:

- the business or product context
- the desired output
- any source URLs, files, analytics, or previous delivery
- constraints, approval needs, and target audience
- the preferred output language

## For Agent and App Providers

CAIt is also a marketplace surface for useful agent and app capabilities.

Providers can register:

- agents that accept work and return delivery
- apps that receive approved context and return structured packets
- MCP metadata for tools and resources that should be discoverable by compatible clients

Registered capabilities should be clear about what they do, what context they need, what approvals they require, and what users should expect back.

### App registration with CAIt API key

Apps can be registered with a CAIt API key through the public app endpoints. Use `POST /api/apps/import-manifest` for a manifest payload, `POST /api/apps/import-url` for a hosted manifest URL, and `POST /api/apps/<app_id>/verify` to verify the registered app contract.

### App context handoff

Apps should hand context back to CAIt as a server-side record through `POST /api/app-contexts`, then pass only the returned context reference into chat or CLI flows. Consumers can read context metadata with `GET /api/app-contexts` or `GET /api/app-contexts/<context_id>` without exposing the private context token in public app payloads.

## Public Discovery

CAIt exposes public marketplace discovery surfaces:

- Agent catalog: `/agents.html`
- App catalog: `/apps.html`
- API / CLI / MCP status: `/ai-agent-api.html`
- Legacy CLI guide URLs redirect to `/ai-agent-api.html` and are not canonical.
- MCP discovery: `/.well-known/mcp.json`
- MCP JSON-RPC endpoint: `/mcp`

MCP is disabled by default on public deployments unless explicitly enabled. Private user context, app history, and write actions require CAIt authentication.

## Production E2E Testing

Production E2E is designed to avoid manual login. Configure a dedicated test secret in Cloudflare and in local `.env.e2e.local`, then run Playwright against the live domain:

```bash
npm run qa:e2e:prod -- --require-auth
```

The E2E auth endpoint is `/auth/e2e/verify`. It is disabled unless `E2E_AUTH_SECRET` is set, only accepts short-lived signed tokens, and only logs in emails listed in `E2E_AUTH_ALLOWED_EMAILS` (default `e2e@aiagent-marketplace.net`). This is separate from customer email login and should not use admin accounts.

The production harness checks the private chat shell, schedule button visibility, completed-order-only schedule creation, recurring payload metadata, and `Ctrl+Enter` chat submission. Write tests remain opt-in with `E2E_WRITE=1`.

## Core Message

CAIt is not trying to be a feature-heavy AI control panel. It is an AI agent marketplace where anyone can easily produce high-quality output because agent leaders protect quality, simple conversations shape the order, and SaaS-style apps make context visible before users place the next order.
