# Agent Orchestration Discipline

This discipline applies to all languages, locales, UI copy, and operator workflows.

AIagent2 must treat built-in agents, sample agents, and externally registered agents through the same provider endpoint contract.

## Product Value Principle

- CAIt exists to turn a user's rough intent, question, idea bundle, or work request into a safe, reviewable work order, route it to the appropriate specialist or leader agent, and return usable delivery artifacts that can continue into review, approval, or app handoff.
- Development should optimize for reducing the user's burden to write perfect prompts, choose the right agent, understand execution boundaries, and move from delivery to the next practical business action.
- Chat may guide, clarify, draft, guard, and explain before dispatch, but it must preserve the user's control: no paid order, external posting, sending, publishing, repository write, or payout movement should happen without the explicit confirmation path and the responsible surface returning proof.
- Features that do not improve trustworthy work ordering, safe execution, reviewable delivery, or practical handoff should be treated as lower priority than changes that strengthen those paths.

## Core Rules

- Do not put leader-specific or agent-specific work definitions in `worker`, `orchestration`, or `client` code.
- `worker` and `orchestration` own only sequencing, state, handoff, quality gates, retries, and endpoint dispatch.
- Leader-specific decisions, layer definitions, specialist selection, deliverable requirements, and SaaS handoff policy belong in that leader agent definition.
- Follow-up routing to specialists must be decided by the leader or agent definition resolver. Do not add `seo_specialist`, `landing`, `growth`, or similar regex branches to `worker` or `chat`.
- Chat may preserve an explicitly selected or locked leader/agent, or pass through a server-returned `task_type`/`conversationOwner` contract, but must not re-parse user text, LLM summaries, or clarification prose to invent leader routing.
- Workflow child assignment must resolve against the current agent list and manifest/task contract at creation or retry time. Do not persist, replay, or repair a child by trusting a concrete historical agent id when the list/manifest resolver says a different active agent owns the task.
- Specialist deliverable requirements must be passed as explicit agent, leader, or manifest contracts. `worker` may validate those contracts, but must not define SEO, landing-page, post, lead-table, or similar artifact content.
- Search-required research must satisfy the agent search contract or an explicit source collection contract. `worker` must not synthesize a successful research artifact from upstream context alone.
- Sample agents must be treated as HTTP provider endpoints like external agents. Do not create special same-worker execution paths for them.
- Only values returned by the agent/provider contract may be treated as delivery artifacts. `worker`, `chat`, `client`, and delivery views must not synthesize replacement delivery files, readable bundles, or template-based completed outputs when the agent did not return a user-facing artifact.
- When a leader produces a final integrated delivery, the user-facing delivery bundle should prioritize that final leader artifact and explicit app-review packets. Generic supporting specialist memos should remain available through child run summaries/history, not duplicated as peer final files.
- Agent/provider answer builders that define user-facing delivery content, task-specific output structure, work definitions, or approval wording belong in the relevant agent/provider definition. Client-side chat answers may only be pre-dispatch UI responses such as help, login guidance, safety guards, draft review, and local control status; they must not define or replace agent/provider deliverables.
- Delivery follow-up order drafts must be prepared by server or agent/provider contracts. Client code may pass selected UI options and render the returned draft, but must not own follow-up prompt text, task routing, or direct-agent continuation instructions.
- Delivery follow-up preparation may carry the previous order context and explicit UI selections, but must not branch on social/email/code/report delivery types or channel names to invent specialist routing or task-specific execution instructions. Those instructions belong to the assigned agent, leader, or an explicit follow-up contract.
- `authority_request` / approval waits must be requested explicitly by the agent/provider result. `worker` may normalize, persist, block, clear, or resume an explicit request, but must not infer or generate approval requests from delivery text, manifests, task names, or preflight hints.
- Template guidance may only say to deliver in the user requested language in a clear, user-readable format. Shared output-section templates must not be used as a fallback delivery.
- Built-in, sample, and external agents share the same completion policy: if the returned value is missing, generic, templated, or not a concrete user-facing delivery artifact, retry within the dispatch retry budget (default 3 attempts) and then fail. Do not fall back to worker-generated delivery content.
- Agent-side failures and missing-deliverable failures are free to the requester. Release any billing reservation and do not settle agent earnings unless the agent completed with a valid returned delivery artifact.
- During beta, account registration, provider identity, agent registration, and work execution may remain available, but live checkout, card setup, charges, and payout movement must stay paused. Each account may use the beta free allowance up to $10 in welcome credits; do not create unlimited free test-mode order execution for normal users. Keep the billing and payout contracts activation-ready behind `BILLING_ACTIVATION_ENABLED=1` or `BETA_BILLING_PAUSED=0`.
- Until the external developer contract is stable, public CLI/API-key access and MCP must stay disabled by default. Re-enable them only through explicit runtime flags such as `CAIT_DEVELOPER_API_ENABLED=1`, `CAIT_CLI_ENABLED=1`, or `CAIT_MCP_ENABLED=1`, and keep browser-owned app APIs separate from those external surfaces.
- External posting, sending, publishing, PRs, and repository writes must hand off to the relevant SaaS surface instead of relying on ambiguous chat approval. Chat may keep only conversation-required data access such as OAuth or connector access.

## CAIt Core Versus App Surfaces

- `Deliveries` and `delivery-manager` are CAIt core features, not apps. Delivery artifacts, files, history, and status checks may stay tightly coupled to CAIt.
- `Analytics Console`, `Publisher & Approval Studio`, `Lead Ops Console`, `X Client Ops`, and similar surfaces are app surfaces even when CAIt ships and manages them. `worker`, `orchestration`, and `chat` must not branch on them as privileged internal apps.
- Chat app handoff should appear only when the app manifest `inputContract.accepts` and `capabilities` explicitly match the delivery artifact type. Do not show apps based only on body text tokens, leader name, or task name.
- Determine app handoff artifact type from the actual delivery file or explicit packet. Supporting analytics, research, or connector context must not by itself trigger Analytics, Lead Ops, Publisher, or similar app surfaces.
- App handoff completion has a visible action flow: agent/provider returns explicit artifact metadata, CAIt normalizes the item, the target app has an ingest or list path, and the user can open or review that item in the target app. A normalized row alone is not enough to claim app handoff completion.
- If a delivery is intended for an app surface, the responsible agent/provider must return explicit `content_type`/`artifact_type` or `artifact_types` plus destination metadata such as `surface`, `item_type`, `action_type`, `channel`, `connector`, or `connector_capability`. `chat`, `worker`, delivery views, and app list routes must not recover missing app intent from the delivery body.
- App handoff transfer code may preserve delivery file content as content, but must not parse Markdown/body text to recover app-specific metadata such as page title, SEO fields, CTA, channel, or destination. Those fields must come from explicit artifact/file metadata or be completed inside the target app review surface.
- When a leader can determine at dispatch time that a selected specialist should produce an app-review artifact, the leader-owned dispatch packet must say so upfront and include the expected app metadata contract. Do not wait for chat or delivery views to infer that the output belongs in Publisher, Lead Ops, Analytics, or another app.
- The UI must distinguish "prepared for app review" from "ingested into the app" and from "externally executed". Only the app ingest/list route or connector proof may justify saying the item was handed to, queued by, published by, or executed by an app.
- When multiple apps match, rank them by user-facing fit: exact artifact compatibility, connector readiness, execution proof, expected cost, and the shortest review path to the user's intended next action. A generic app such as Publisher may be a fallback, but it should not hide a better specialized path.
- When multiple apps match, a specialized matching app should be shown first. The ranking explanation should remain legible when users compare price, free CAIt-managed option, specialization, fees, or revenue share.
- External user self-service app registration is out of short-term scope. Still, keep manifest, handoff, auth, and billing contracts ready for external apps.
- If user-added apps are opened later, CAIt should present candidates for managing or publishing the final delivery and let the user choose by outcome fit, price, trust, connector readiness, specialization, and review effort. `chat` and `orchestration` must not automatically select a CAIt-managed app unconditionally.
- CAIt-managed apps may be free default candidates when they are the clearest user path, but candidate ranking must not prefer platform revenue, provider revenue share, or internal ownership over the user's safest and most useful next action.
- External apps using CAIt account auth must not receive the CAIt session cookie directly. Use a short-lived signed handoff token, server-side app context id, or future CAIt OAuth/OIDC delegation.
- Posting, publishing, sending, billing, and execution approval are app responsibilities. Chat passes prepared data and handoff context, and may claim execution completion only when the app or connector returns proof.

## Agent Definition Boundaries

- Agent-specific boundaries must be documented in the relevant agent definition file, not in this shared discipline document.
- If an agent needs specialized routing, channel policy, approval wording, deliverable templates, or action handoff rules, put those rules in that agent's JS module.
- This document may name only shared ownership rules and forbidden crossovers. It must not become a registry of special cases for any one agent.

## QA Rules

- After development, run `npm run qa:discipline` first to verify file responsibility and equal treatment for internal and external agents.
- Leader intake questions are owned by each agent JS file through `leaderBehavior.intakeQuestions`. A generic LLM intake generator must not replace them with another agent domain's questions.
- `npm run qa:architecture` verifies that leader or agent-specific context has not leaked into `worker`, `shared`, `orchestration`, or `client`.
- `npm run qa:worker-api` verifies that sample agents run through normal provider endpoints and that agent-specific publish or action policy uses SaaS handoff instead of chat approval.
- `npm run qa:leader-workflows` verifies that leaders preserve layer-to-layer handoff and integrate specialist deliverables without hiding them.
