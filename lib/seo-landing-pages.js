export const seoLandingPages = [
  {
    slug: 'no-api-key-ai-agents',
    title: 'Use AI Agents Without Managing API Keys',
    description: 'CAIt lets buyers order built-in AI agents without bringing their own model-provider or tool-provider API keys, while keeping chat intake, routing, cost transparency, and delivery in one runtime.',
    keyword: 'AI agents without API keys',
    sublogo: 'NO API KEY AI AGENTS',
    audience: 'buyers, founders, marketers, operators, and small teams that want useful AI agent work without opening separate model, search, or automation API contracts first',
    sections: [
      {
        heading: 'The buyer problem is setup, not curiosity',
        body: 'Many teams want to try AI agents, but the first step often becomes provider accounts, API keys, model choices, tool credentials, and routing decisions. CAIt starts from CAIt Chat and an order-ready brief instead. For built-in orders, the buyer does not need separate model-provider or tool-provider API keys.'
      },
      {
        heading: 'One account, many AI agent capabilities',
        body: 'A single CAIt account can request research, SEO, prompt brush-up, pricing, code review, writing, validation, and other built-in agent work. The platform keeps chat intake, order routing, cost transparency, delivery, files, sources, confidence, and follow-up context together so the result is easier to review than a one-off chat.'
      },
      {
        heading: 'Developers can still publish behind the scenes',
        body: 'No buyer API keys does not mean no integrations exist. Provider agents may still use their own backend, model, search, or workflow APIs behind verified endpoints. CAIt separates the buyer experience from the provider integration layer so users can order useful work without understanding the supply-side implementation.'
      }
    ],
    bullets: [
      'Buyers do not need to provide OpenAI, Anthropic, search, or automation API keys for built-in CAIt orders.',
      'Describe the work in natural language and let CAIt infer the task, route, and delivery shape.',
      'See cost context without registering a card, opening checkout, or creating a subscription.',
      'Review summary, sources, files, cost context, confidence, and follow-up state after delivery.'
    ],
    faq: [
      ['Do buyers need their own model API keys?', 'No for built-in CAIt orders. Buyers prepare a work order and receive delivery without bringing separate model-provider API keys.'],
      ['Is this the same as an AI API gateway?', 'No. An API gateway focuses on model access. CAIt focuses on work orders, agent assignment, quality checks, cost context, and delivery records.'],
      ['Can provider agents still use their own APIs?', 'Yes. A provider can run its own backend and API stack behind a verified CAIt integration while buyers use CAIt as the order and delivery surface.']
    ]
  },
  {
    slug: 'ai-agent-marketplace',
    title: 'High-Quality AI Agent Output for Everyone',
    description: 'CAIt helps anyone easily produce high-quality AI agent output with agent leaders, simple conversations, SaaS-style apps, saved delivery history, and visible app context.',
    keyword: 'AI agent service',
    sublogo: 'AI AGENT SERVICES',
    audience: 'buyers evaluating where AI agent work can be ordered, verified, and reviewed as a CAIt-operated service',
    sections: [
      {
        heading: 'What an AI agent service should do',
        body: 'A useful AI agent service should not only expose agent cards. It should help users describe work, route the order to a capable agent, verify delivery, show cost context, and keep enough operational history to trust what happened.'
      },
      {
        heading: 'How CAIt is different',
        body: 'CAIt treats useful AI work as an orderable CAIt service. The platform connects CAIt Chat intake, agent profiles, readiness checks, routing, browser orders, the unified API / CLI / MCP surface, delivery review, and cost history.'
      },
      {
        heading: 'Who should use it',
        body: 'Buyers can start with CAIt-managed agents and route work through the browser, API, CLI, or MCP-aware clients. Teams can inspect delivery, cost, confidence, and follow-up context instead of trusting an isolated chat result.'
      }
    ],
    bullets: [
      'Order CAIt-managed agent work from a simple browser flow.',
      'Verify health, job endpoints, readiness, and delivery behavior before routing work.',
      'Route built-in agents from the browser or through the active API / CLI / MCP developer surface.',
      'Track funded work, delivery output, cost history, and follow-up state.'
    ],
    faq: [
      ['What is an AI agent service?', 'An AI agent service is a product where users order useful AI work, receive reviewable delivery, and keep enough history to continue from the result.'],
      ['Can developers publish agents on CAIt?', 'External agent review can still exist, but open provider monetization is not the short-term default.'],
      ['Can buyers order agents without choosing a routing mode?', 'Yes. CAIt can infer the task from natural language and auto-route work to a matching ready agent.']
    ]
  },
  {
    slug: 'publish-ai-agents',
    title: 'Register Agents and Apps That Make Quality Easy',
    description: 'Register agents and apps on CAIt that make high-quality AI agent output easier to order with visible context, reviewable delivery, and approval-aware workflows.',
    keyword: 'register AI agents and apps',
    sublogo: 'REGISTER AGENTS AND APPS',
    audience: 'developers who already have an AI-enabled app, script, workflow, connector, or service and want it to become usable inside CAIt marketplace workflows',
    sections: [
      {
        heading: 'From private workflow to orchestrated capability',
        body: 'Many useful AI systems start as private scripts, hosted apps, notebooks, or team tools. Registration turns that capability into something CAIt can route, verify, call, and hand context to from a leader-run workflow.'
      },
      {
        heading: 'Two registration lanes',
        body: 'Register an agent when the service should accept work and return delivery. Register an app when it should receive approved context from a leader and complete a final action, such as opening an X posting tool with strategy and draft text already loaded.'
      },
      {
        heading: 'Where this sits in the product',
        body: 'Users start in chat. CAIt prepares the order, calls a leader, coordinates specialist agents, and then offers app handoffs only when the action packet is ready. Engineers can register supply through manifests, app manifests, GitHub adapter PRs, CLI commands, or API calls.'
      },
      {
        heading: 'Verification before real orders',
        body: 'Registration is not complete until readiness checks pass. CAIt verifies manifest fields, safety signals, health behavior, job endpoint configuration, task fit, app launch metadata, and delivery expectations before the capability is treated as ready supply.'
      }
    ],
    bullets: [
      'Use an agent manifest when your endpoint should accept jobs and return delivery.',
      'Use an app manifest when your tool should receive approved handoff context from a leader workflow.',
      'Use GitHub adapter generation when an existing hosted app needs CAIt-compatible endpoints.',
      'Run import and verify so the agent or app can be reused from chat, API, or CLI flows.'
    ],
    faq: [
      ['Do I need to rewrite my app to register it?', 'No. If the app can expose the required manifest, health, and job endpoints, CAIt can register and verify it. If it is an action tool, an app manifest can describe launch and handoff behavior.'],
      ['Can CAIt create a GitHub pull request for adapter files?', 'Yes. The GitHub-assisted flow can create an adapter PR for supported repositories so the provider can review and merge the changes.'],
      ['What happens if verification fails?', 'The provider should fix manifest fields, endpoint reachability, ownership checks, task fit, or app handoff metadata, then rerun verification.']
    ]
  },
  {
    slug: 'ai-agent-runtime',
    title: 'AI Agent Leaders, Apps, and Orders',
    description: 'CAIt helps anyone create high-quality AI agent output with agent leaders, simple conversations, SaaS-style apps, saved delivery history, and reusable follow-up context.',
    keyword: 'AI Agent Leaders',
    sublogo: 'AI AGENT LEADERS AND APPS',
    audience: 'users and builders who need better output than a standalone chat answer can provide',
    sections: [
      {
        heading: 'The runtime layer around agents',
        body: 'An agent runtime handles the operational pieces that a model or agent framework usually does not own: order intake, account identity, task routing, retries, delivery format, API access, observability, cost context, and provider readiness.'
      },
      {
        heading: 'Why runtime matters',
        body: 'A demo agent can answer a prompt once. A production agent needs repeatable inputs, predictable outputs, readiness checks, failure recovery, cost history, and a way for users to order the same capability again.'
      },
      {
        heading: 'Where CAIt fits',
        body: 'CAIt sits between users and agents. It interprets a work order, chooses or pins an agent, runs preflight checks, dispatches work, records delivery, and keeps cost and provider context connected to the result.'
      }
    ],
    bullets: [
      'Natural-language order intake before dispatch.',
      'Auto-routing between ready single-agent and multi-agent workflows.',
      'Manifest, health, endpoint, and delivery verification.',
      'A unified API / CLI / MCP surface for teams that need external access.'
    ],
    faq: [
      ['Is CAIt an AI agent framework?', 'CAIt is closer to an order and delivery runtime. It can work around agents built with different frameworks as long as they expose the expected integration contract.'],
      ['Why not just use a chat interface?', 'Chat interfaces are useful, but they usually do not provide order shaping, quality checks, delivery review, or reusable follow-up context.'],
      ['Can external clients use the runtime?', 'Yes. API, CLI, and MCP share one active developer surface, with private context and write actions protected by CAIt session or API-key auth.']
    ]
  },
  {
    slug: 'ai-agent-monetization',
    title: 'Selling AI Agent Services with Verified Delivery',
    description: 'CAIt presents AI agent work as a CAIt-operated service with order intake, verification, delivery review, cost transparency, and no in-app payment processing.',
    keyword: 'AI agent monetization',
    sublogo: 'AI AGENT MONETIZATION',
    audience: 'buyers and operators evaluating how CAIt can package repeatable AI agent work while payment processing is removed',
    sections: [
      {
        heading: 'AI work needs more than a payment link',
        body: 'Packaging access to an AI agent is difficult when users cannot see what they will receive, how the agent is verified, or what happens on failure. CAIt starts from an order-ready brief and ends with a reviewable delivery.'
      },
      {
        heading: 'How CAIt presents the service',
        body: 'CAIt keeps agent work visible as a reviewable service, but in-app checkout, saved cards, subscriptions, invoices, marketplace revenue split, donation collection, and payout movement have been removed. Stripe Payment Links are a possible external donation path later, but only after recipient, purpose, compliance, and gift or donation agreement review.'
      },
      {
        heading: 'Where this lives in the product',
        body: 'Buyers start from CAIt Chat. Agent and app registration remains a review path for useful capabilities, while any future payment or provider settlement model must be designed and approved separately.'
      },
      {
        heading: 'Why buyers are more likely to trust it',
        body: 'Buyers need confidence before committing time or future budget. CAIt shows the intended delivery shape, tracks estimated cost, stores results, supports follow-up context, and keeps failed or incomplete work from looking like a successful invisible black box.'
      }
    ],
    bullets: [
      'Present clear CAIt agent service outcomes instead of vague access.',
      'Use verification to reduce buyer risk before orders are routed.',
      'Keep donation support outside CAIt unless an external donation link is reviewed and approved.',
      'Do not add checkout, card setup, subscriptions, invoices, or payout movement until a new model is explicitly approved.'
    ],
    faq: [
      ['How does CAIt charge for AI agent services?', 'It currently does not process in-app payments. A Stripe Payment Link for external donations is only a future option after recipient, purpose, compliance, and gift or donation agreement review.'],
      ['Do buyers pay before the agent runs?', 'No in-app checkout, saved card, subscription, invoice, or payout flow is currently active.'],
      ['Does monetization require a hosted endpoint?', 'A provider agent generally needs public integration points such as manifest, health, and job endpoints so CAIt can verify and dispatch work.']
    ]
  },
  {
    slug: 'order-ai-agents',
    title: 'Order AI Agents with Natural-Language Work Orders',
    description: 'Order AI agents on CAIt by describing the desired outcome in CAIt Chat, reviewing delivery expectations, and routing work through the browser or active API / CLI / MCP developer surface.',
    keyword: 'order AI agents',
    sublogo: 'ORDER AI AGENTS',
    audience: 'buyers and teams who want to request useful AI agent work without learning routing modes, manifests, or provider setup first',
    sections: [
      {
        heading: 'Start with the work, not the settings',
        body: 'Most users do not know which agent, task type, or routing mode they need before they describe the outcome. CAIt starts from CAIt Chat and then infers the likely task, matching agent, delivery shape, and cost range.'
      },
      {
        heading: 'What happens before dispatch',
        body: 'The runtime can ask clarifying questions when the request is incomplete, show cost context when available, and route the order to a ready built-in or provider agent. This keeps the first action simple while preserving operational controls.'
      },
      {
        heading: 'What the buyer receives',
        body: 'A useful AI agent order should end in a delivery, not a vague chat transcript. CAIt stores the result, expected files, sources when available, cost context, confidence notes, and follow-up options so the work can be reviewed later.'
      }
    ],
    bullets: [
      'Write the desired outcome in one natural-language request.',
      'Let CAIt infer task type and route when no agent is pinned.',
      'Use files or URLs as source material when the work needs context.',
      'Review delivery output and create follow-up work when more action is needed.'
    ],
    faq: [
      ['Can I order an AI agent without choosing the agent manually?', 'Yes. CAIt can infer the task from natural language and route to a matching ready agent.'],
      ['Can an order include files or URLs?', 'Yes. The order surface supports source URLs and file inputs for work that needs additional context.'],
      ['What if the request is incomplete?', 'CAIt can ask clarifying questions before running the agent when missing information would affect delivery quality.']
    ]
  },
  {
    slug: 'ai-agent-api',
    title: 'AI Agent API, CLI, and MCP Access',
    description: 'One CAIt page for API, CLI, and MCP access. External developer surfaces are active on the public deployment and controlled by explicit runtime policy flags.',
    keyword: 'AI agent API, CLI, and MCP',
    sublogo: 'API / CLI / MCP',
    audience: 'developers and teams that want one external developer surface for backend services, terminal workflows, MCP clients, team tools, or workflow automation',
    sections: [
      {
        heading: 'One external surface',
        body: 'API-key access, CLI execution, and MCP share the same external developer contract. Keeping them on one page prevents separate tabs from implying separate policy, leader-guided ordering, auth, delivery history, app context, approval, or billing rules.'
      },
      {
        heading: 'Runtime activation policy',
        body: 'External API-key, CLI, and MCP access are active on the public deployment through explicit runtime flags. Browser Chat, Apps, Deliveries, and Publisher remain available for real work.'
      },
      {
        heading: 'What is active when enabled',
        body: 'The external surface supports reviewable order creation, delivery reads, app-context reuse, manifest import, verification, follow-up workflows, and MCP discovery while preserving CAIt-visible delivery history and approval state.'
      }
    ],
    bullets: [
      'API-key access, CLI execution, and MCP are one active runtime-gated developer access surface.',
      'Browser Chat, Apps, Deliveries, and Publisher remain available.',
      'Examples for API, CLI, and MCP are published together because they share one policy.',
      'Production activation is controlled by explicit runtime flags.'
    ],
    faq: [
      ['Are API, CLI, and MCP available today?', 'Yes. The public deployment enables them through explicit runtime flags. Private context and write actions still require CAIt session or API-key auth.'],
      ['Why are they on one page?', 'They are one external access surface with different clients, and must share the same auth, delivery, app context, approval, and billing rules.'],
      ['How do I authenticate?', 'Sign in and issue a CAIt API key from the API keys surface, then send it as a Bearer token for API and CLI workflows.']
    ]
  },
  {
    slug: 'ai-agent-verification',
    title: 'AI Agent Leader and Quality Checks',
    description: 'CAIt verifies AI agents with manifest checks, health checks, job endpoint readiness, task fit, and delivery expectations before routing real work.',
    keyword: 'AI Agent Leader',
    sublogo: 'AI AGENT VERIFICATION',
    audience: 'buyers and providers who need confidence that an AI agent can be reached, routed, and reviewed before real work is sent to it',
    sections: [
      {
        heading: 'Verification is the trust layer',
        body: 'An agent listing is not enough. Users need to know that the agent has a manifest, reachable endpoints, compatible task types, and a delivery shape that can be inspected after the work runs.'
      },
      {
        heading: 'What CAIt checks',
        body: 'CAIt checks manifest structure, health behavior, job endpoint configuration, ownership context, task mismatch risk, and delivery expectations. Built-in agents are managed by the platform, while provider agents need to pass readiness checks.'
      },
      {
        heading: 'Why this matters for routing',
        body: 'Auto-routing only works if the supply side is trustworthy. Verification reduces the chance that CAIt routes a paid order to an unreachable endpoint, the wrong task category, or an agent that cannot return a usable delivery.'
      }
    ],
    bullets: [
      'Validate manifest fields before an agent becomes ready supply.',
      'Check health and job endpoints before routing work.',
      'Detect task mismatch and endpoint issues early.',
      'Show verification status so buyers and providers know what to fix next.'
    ],
    faq: [
      ['What does AI agent verification mean?', 'It means checking whether an agent has the required manifest, endpoints, readiness behavior, and delivery expectations before real orders are routed.'],
      ['Can verification fail?', 'Yes. Missing endpoints, invalid manifests, ownership problems, or task mismatch can prevent an agent from becoming ready.'],
      ['Does verification guarantee perfect output?', 'No. It reduces operational risk, but users should still review the delivery and sources when the task requires evidence.']
    ]
  },
  {
    slug: 'ai-agent-manifest',
    title: 'Agent and App Profiles for Easy High-Quality Output',
    description: 'An AI agent manifest tells CAIt what an agent does, which task types it supports, where its health and job endpoints live, and how it should be verified.',
    keyword: 'Agent and App Profiles',
    sublogo: 'AI AGENT MANIFEST',
    audience: 'developers preparing an existing AI app, endpoint, script, or hosted workflow to become an orderable CAIt agent',
    sections: [
      {
        heading: 'The manifest is the agent contract',
        body: 'A manifest turns an agent from an invisible implementation into a machine-readable service. It explains the agent name, owner, description, supported task types, health endpoint, job endpoint, product kind, grouping metadata, and verification details.'
      },
      {
        heading: 'Why CAIt needs it',
        body: 'CAIt cannot safely route work to a provider app unless it understands what the app claims to do and how to contact it. The manifest gives the broker and verifier a shared contract to inspect.'
      },
      {
        heading: 'Manifest plus adapter',
        body: 'Some apps already expose compatible endpoints. Others need a small adapter PR that adds the manifest, health route, and job route. CAIt can help generate those files through the GitHub-assisted publishing flow.'
      },
      {
        heading: 'Single agent, composite agent, or agent group',
        body: 'The default is to register each AI agent separately. Use a shared group when CAIt should reason about related agents together, such as a SaaS builder agent and a marketing agent. Use composite_agent only when one provider endpoint runs a full sequence internally and returns one delivery.'
      }
    ],
    bullets: [
      'Describe agent capability, ownership, and task types.',
      'Expose health and job endpoint locations.',
      'Declare whether the record is a single agent, provider-orchestrated composite agent, or grouped set of separately registered agents.',
      'Provide metadata used by verification and routing.',
      'Use GitHub adapter generation when an existing app needs compatible files.'
    ],
    faq: [
      ['What is an AI agent manifest?', 'It is a machine-readable description of an agent and its integration contract.'],
      ['How should multi-agent products be registered?', 'Register each agent separately by default, attach shared group metadata when they belong together, and use composite_agent only for one endpoint that orchestrates a complete sequence internally.'],
      ['Can I import an agent with only a manifest URL?', 'Yes, if the manifest points to reachable and compatible health and job endpoints.'],
      ['What if my app does not have the needed endpoints yet?', 'Use the GitHub adapter flow or add compatible manifest, health, and job routes manually.']
    ]
  },
  {
    slug: 'github-ai-agent-integration',
    title: 'GitHub AI Agent Integration with Adapter Pull Requests',
    description: 'Connect GitHub to CAIt, select a repository, generate an adapter pull request, merge it, and import plus verify the agent.',
    keyword: 'GitHub AI agent integration',
    sublogo: 'GITHUB AI AGENT INTEGRATION',
    audience: 'developers who have an AI-enabled repository and want CAIt to create the adapter path needed to publish it as an agent',
    sections: [
      {
        heading: 'Why GitHub is part of publishing',
        body: 'Many real agents already live inside GitHub repositories as apps, workers, backend services, or scripts. CAIt uses GitHub integration to inspect repository context, propose adapter changes, and keep ownership in the provider account.'
      },
      {
        heading: 'The adapter PR flow',
        body: 'The provider installs or configures the GitHub App, selects a repository, generates manifest or adapter changes, opens the pull request, reviews and merges it, then returns to CAIt to import and verify the agent.'
      },
      {
        heading: 'Why pull requests are safer',
        body: 'A pull request lets the provider inspect exactly what will be added before their app exposes CAIt-compatible endpoints. It also keeps the change history inside the repository where the agent code already lives.'
      }
    ],
    bullets: [
      'Connect GitHub when you want to publish an existing app as an agent.',
      'Generate adapter files instead of copying code manually.',
      'Review and merge the pull request in the provider repository.',
      'Import and verify the manifest after the adapter is deployed.'
    ],
    faq: [
      ['Does CAIt need GitHub for every agent?', 'No. Direct manifest import works when the endpoint contract already exists. GitHub helps when an existing repo needs adapter files.'],
      ['Who owns the adapter pull request?', 'The provider reviews and merges the pull request in their own repository.'],
      ['What permissions are needed?', 'The integration needs enough repository access to read contents and create pull requests for the selected repository.']
    ]
  },
  {
    slug: 'verifiable-ai-agent-delivery',
    title: 'Reviewable AI Agent Delivery for Higher-Quality Output',
    description: 'Verifiable AI agent delivery means the result includes structured output, files, sources when available, cost context, confidence, and follow-up state instead of only chat text.',
    keyword: 'verifiable AI agent delivery',
    sublogo: 'VERIFIABLE AI AGENT DELIVERY',
    audience: 'buyers, developers, and teams who need agent output that can be inspected, trusted, reused, and followed up after the run completes',
    sections: [
      {
        heading: 'Delivery is the product outcome',
        body: 'Users do not only want an agent to run. They want to know what was delivered, why it matters, what it cost, what assumptions were made, and whether a follow-up order is needed. That makes delivery more important than the chat surface alone.'
      },
      {
        heading: 'What makes delivery verifiable',
        body: 'A verifiable delivery separates summary, files, sources, cost, confidence, and next actions. The exact fields depend on the agent and task, but the principle is consistent: the output should be reviewable after the conversation ends.'
      },
      {
        heading: 'How CAIt uses delivery state',
        body: 'CAIt stores delivery output with the order, connects it to cost and agent context, and supports follow-up work. This creates a record of what happened instead of relying on memory inside a one-off chat.'
      }
    ],
    bullets: [
      'Show the answer or summary first.',
      'Attach files or structured output when the agent creates deliverables.',
      'Expose sources, assumptions, confidence, and cost context when available.',
      'Support follow-up orders from the previous delivery.'
    ],
    faq: [
      ['What is verifiable AI agent delivery?', 'It is agent output structured so a user can inspect the result, context, assumptions, files, sources, and next actions after the run completes.'],
      ['Does every delivery include sources?', 'Not always. Source availability depends on the task and provided material, but the delivery should make evidence and assumptions clear when they matter.'],
      ['Why is delivery different from chat?', 'Delivery is the reviewable work product. Chat is only one way to collect input or discuss follow-up.']
    ]
  }
];
