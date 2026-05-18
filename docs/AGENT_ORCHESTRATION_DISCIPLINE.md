# Agent Orchestration Discipline

This discipline applies to all languages, locales, UI copy, and operator workflows.

AIagent2 must treat built-in agents, sample agents, and externally registered agents through the same provider endpoint contract.

## Core Rules

- Do not put leader-specific or agent-specific work definitions in `worker`, `orchestration`, or `client` code.
- `worker` and `orchestration` own only sequencing, state, handoff, quality gates, retries, and endpoint dispatch.
- Leader-specific decisions, layer definitions, specialist selection, deliverable requirements, and SaaS handoff policy belong in that leader agent definition.
- Follow-up routing to specialists must be decided by the leader or agent definition resolver. Do not add `seo_gap`, `landing`, `growth`, or similar regex branches to `worker` or `chat`.
- Specialist deliverable requirements must be passed as explicit agent, leader, or manifest contracts. `worker` may validate those contracts, but must not define SEO, landing-page, post, lead-table, or similar artifact content.
- Search-required research must satisfy the agent search contract or an explicit source collection contract. `worker` must not synthesize a successful research artifact from upstream context alone.
- Sample agents must be treated as HTTP provider endpoints like external agents. Do not create special same-worker execution paths for them.
- Only values returned by the agent/provider contract may be treated as delivery artifacts. `worker`, `chat`, `client`, and delivery views must not synthesize replacement delivery files, readable bundles, or template-based completed outputs when the agent did not return a user-facing artifact.
- Template guidance may only say to deliver in the user requested language in a clear, user-readable format. Shared output-section templates must not be used as a fallback delivery.
- Built-in, sample, and external agents share the same completion policy: if the returned value is missing, generic, templated, or not a concrete user-facing delivery artifact, retry within the dispatch retry budget (default 3 attempts) and then fail. Do not fall back to worker-generated delivery content.
- Agent-side failures and missing-deliverable failures are free to the requester. Release any billing reservation and do not settle agent earnings unless the agent completed with a valid returned delivery artifact.
- During beta, account registration, provider identity, agent registration, and work execution may remain available, but live checkout, card setup, charges, and payout movement must stay paused. Keep the billing and payout contracts activation-ready behind `BILLING_ACTIVATION_ENABLED=1` or `BETA_BILLING_PAUSED=0`.
- External posting, sending, publishing, PRs, and repository writes must hand off to the relevant SaaS surface instead of relying on ambiguous chat approval. Chat may keep only conversation-required data access such as OAuth or connector access.

## CAIt Core Versus App Surfaces

- `Deliveries` and `delivery-manager` are CAIt core features, not apps. Delivery artifacts, files, history, and status checks may stay tightly coupled to CAIt.
- `Analytics Console`, `Publisher & Approval Studio`, `Lead Ops Console`, `X Client Ops`, and similar surfaces are app surfaces even when CAIt ships and manages them. `worker`, `orchestration`, and `chat` must not branch on them as privileged internal apps.
- Chat app handoff should appear only when the app manifest `inputContract.accepts` and `capabilities` explicitly match the delivery artifact type. Do not show apps based only on body text tokens, leader name, or task name.
- Determine app handoff artifact type from the actual delivery file or explicit packet. Supporting analytics, research, or connector context must not by itself trigger Analytics, Lead Ops, Publisher, or similar app surfaces.
- When multiple apps match, prefer the app with the narrower and more specialized `inputContract.accepts`. A generic app such as Publisher may be a fallback, but a specialized matching app should be shown first.
- External user self-service app registration is out of short-term scope. Still, keep manifest, handoff, auth, and billing contracts ready for external apps.
- If user-added apps are opened later, CAIt should present candidates for managing or publishing the final delivery and let the user choose by price, free CAIt-managed option, specialization, fees, or revenue share. `chat` and `orchestration` must not automatically select a CAIt-managed app unconditionally.
- CAIt-managed apps are free default candidates, but may use a quiet discovery path so they do not erase specialist app revenue opportunities. Specialist app revenue may support revenue share.
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
