export const glossaryCategories = [
  {
    id: 'core-ai-terms',
    title: 'Core AI Terms',
    terms: [
      ['Artificial Intelligence', 'artificial-intelligence', 'Software techniques that help computers perform tasks that normally require human-like language, perception, reasoning, prediction, or decision-making.'],
      ['Machine Learning', 'machine-learning', 'A branch of AI where systems learn patterns from data instead of being programmed with every rule by hand.'],
      ['Deep Learning', 'deep-learning', 'Machine learning that uses multi-layer neural networks to learn complex patterns in text, images, audio, code, and other data.'],
      ['Neural Network', 'neural-network', 'A model architecture built from connected layers that transform input data into predictions or generated output.'],
      ['Transformer', 'transformer', 'A neural network architecture that powers many modern language models by paying attention to relationships between tokens.'],
      ['Generative AI', 'generative-ai', 'AI that creates new output such as text, code, images, audio, video, plans, summaries, or structured reports.'],
      ['Multimodal AI', 'multimodal-ai', 'AI that can work across multiple input or output types, such as text, images, audio, video, documents, and code.'],
      ['Natural Language Processing', 'natural-language-processing', 'AI techniques for understanding, generating, classifying, translating, summarizing, or extracting information from human language.'],
      ['Computer Vision', 'computer-vision', 'AI techniques for interpreting images or video, including object detection, OCR, image classification, and visual question answering.'],
      ['OCR', 'ocr', 'Optical character recognition. OCR extracts readable text from images, PDFs, screenshots, scans, and photos.'],
      ['Speech-to-Text', 'speech-to-text', 'AI that transcribes spoken audio into text for search, summarization, subtitles, or voice workflows.'],
      ['Text-to-Speech', 'text-to-speech', 'AI that converts written text into spoken audio for narration, voice assistants, accessibility, or product demos.'],
      ['Token', 'token', 'A unit of text processed by a language model. Tokens can be words, word fragments, punctuation, or structured symbols.'],
      ['Training Data', 'training-data', 'The data used to teach a model patterns. Data quality, licensing, bias, and coverage affect model behavior.'],
      ['Dataset', 'dataset', 'A structured collection of examples used for training, evaluation, retrieval, or analysis.'],
      ['Label', 'label', 'A target value or annotation used in supervised learning, such as a category, score, answer, or expected output.'],
      ['Supervised Learning', 'supervised-learning', 'Machine learning that uses labeled examples to learn how inputs should map to expected outputs.'],
      ['Unsupervised Learning', 'unsupervised-learning', 'Machine learning that finds patterns in data without explicit target labels.'],
      ['Reinforcement Learning', 'reinforcement-learning', 'A learning setup where a system improves behavior by receiving rewards or penalties from actions.'],
      ['Synthetic Data', 'synthetic-data', 'Artificially generated data used for training, testing, privacy protection, or simulation.'],
      ['Model Drift', 'model-drift', 'A decline in model quality when real-world inputs change over time compared with the data used to build or evaluate the model.'],
      ['Bias', 'bias', 'A systematic skew in data, model behavior, or outputs that can create unfair, inaccurate, or incomplete results.']
    ]
  },
  {
    id: 'agent-terms',
    title: 'AI Agent Terms',
    terms: [
      ['AI Agent', 'ai-agent', 'Software that uses an AI model to interpret a goal, plan steps, call tools, and produce a result with some level of autonomy.'],
      ['AI Agent Marketplace', 'ai-agent-marketplace', 'A platform where AI agents can be discovered, ordered, verified, reviewed, and paid for as reusable software services.'],
      ['AI Agent Runtime', 'ai-agent-runtime', 'The operational layer that handles agent ordering, routing, verification, delivery, logging, cost tracking, retries, and API access.'],
      ['Agent Monetization', 'agent-monetization', 'The process of earning revenue from an AI agent by turning a repeatable capability into a paid, orderable service.'],
      ['Verifiable AI Agent', 'verifiable-ai-agent', 'An AI agent with manifest data, readiness checks, endpoints, delivery expectations, and observable behavior that can be checked before use.'],
      ['Agentic AI', 'agentic-ai', 'An AI system designed to act toward a goal, not only answer one prompt. It may plan, use tools, remember context, and check its work.'],
      ['Autonomous Agent', 'autonomous-agent', 'An agent that can continue work across multiple steps without asking for human approval at every step.'],
      ['Multi-Agent System', 'multi-agent-system', 'A workflow where multiple agents work together, often with different roles such as researcher, coder, reviewer, planner, or verifier.'],
      ['Single-Agent Workflow', 'single-agent-workflow', 'A task handled by one agent from request to delivery. It is simpler and cheaper when the work does not need multiple specialties.'],
      ['Agent Orchestration', 'agent-orchestration', 'The logic that decides which agent should run, in what order, with which inputs, and how outputs are combined.'],
      ['Planner', 'planner', 'A component that breaks a user request into steps before execution. Planning is useful for long-running research, coding, and analysis work.'],
      ['AI Copilot', 'ai-copilot', 'An AI assistant embedded into a workflow to help a human work faster while the human remains the main decision-maker.'],
      ['Chatbot', 'chatbot', 'A conversational interface. A chatbot may only answer messages, while an agent can also take actions and call tools.'],
      ['Human-in-the-Loop', 'human-in-the-loop', 'A design where the user can review, approve, correct, or add missing information before the agent continues.'],
      ['Memory', 'memory', 'Stored context that helps an agent remember user preferences, prior work, project facts, or workflow state.'],
      ['Reflection', 'reflection', 'A self-checking step where an agent reviews its own output, plan, or tool results before continuing.'],
      ['Action', 'action', 'A step an agent takes outside text generation, such as calling an API, searching the web, writing a file, or creating a pull request.']
    ]
  },
  {
    id: 'model-terms',
    title: 'Model and LLM Terms',
    terms: [
      ['LLM', 'llm', 'A large language model that can read and generate text, code, structured data, and reasoning-like responses based on context.'],
      ['Foundation Model', 'foundation-model', 'A general-purpose AI model trained on broad data and adapted to many downstream tasks.'],
      ['Prompt', 'prompt', 'The instruction and context given to an AI model. Better prompts define the goal, constraints, examples, output format, and success criteria.'],
      ['Prompt Engineering', 'prompt-engineering', 'The practice of improving prompts so the model produces more accurate, useful, and structured outputs.'],
      ['System Prompt', 'system-prompt', 'High-priority instructions that define assistant or agent behavior, boundaries, style, and safety rules.'],
      ['Context Window', 'context-window', 'The amount of text, files, messages, and tool output a model can consider at once when generating a response.'],
      ['Inference', 'inference', 'The process of running a model to generate an answer or action from input.'],
      ['Temperature', 'temperature', 'A generation setting that affects randomness. Lower values are more deterministic; higher values can be more creative but less predictable.'],
      ['Top-p', 'top-p', 'A generation setting that limits output choices to a probability mass, controlling creativity and variability.'],
      ['Structured Output', 'structured-output', 'Model output constrained to a known format such as JSON, tables, schemas, or specific fields.'],
      ['JSON Mode', 'json-mode', 'A mode or instruction pattern that asks the model to return valid JSON for easier parsing by software.'],
      ['Streaming', 'streaming', 'Returning model output incrementally as it is generated, instead of waiting for the full answer.'],
      ['Latency', 'latency', 'The time between sending a request and receiving a usable response.'],
      ['Fine-Tuning', 'fine-tuning', 'Additional training that adapts a model for a narrower pattern or style.'],
      ['Distillation', 'distillation', 'A technique where a smaller model is trained to imitate a larger model, usually to reduce cost or latency.'],
      ['Model Routing', 'model-routing', 'The logic that chooses which model to use for a request based on cost, latency, capability, or quality requirements.'],
      ['Hallucination', 'hallucination', 'A confident but incorrect or unsupported model output. Citations, retrieval, verification, and uncertainty reduce this risk.']
    ]
  },
  {
    id: 'retrieval-terms',
    title: 'Retrieval and Knowledge Terms',
    terms: [
      ['RAG', 'rag', 'Retrieval-augmented generation. The system searches trusted documents or data first, then uses the retrieved context to answer.'],
      ['Embedding', 'embedding', 'A numeric representation of text, code, images, or other content used for similarity search and retrieval.'],
      ['Vector Database', 'vector-database', 'A database optimized for storing embeddings and finding similar content quickly.'],
      ['Semantic Search', 'semantic-search', 'Search based on meaning rather than exact keyword match.'],
      ['Grounding', 'grounding', 'Connecting an AI answer to source material, citations, database records, files, or other evidence.'],
      ['Citation', 'citation', 'A link or reference showing where a claim came from.'],
      ['Corpus', 'corpus', 'The collection of documents, pages, files, or records that a retrieval system can search.'],
      ['Chunking', 'chunking', 'Splitting documents into smaller pieces so retrieval systems can find the most relevant passages for a model.'],
      ['Indexing', 'indexing', 'Preparing content for search by creating keyword indexes, vector indexes, metadata, or lookup structures.'],
      ['Reranking', 'reranking', 'A second search step that reorders retrieved results to put the most relevant passages first.'],
      ['Knowledge Graph', 'knowledge-graph', 'A structured map of entities and relationships that can help agents reason over connected facts.'],
      ['Data Connector', 'data-connector', 'An integration that gives an AI system access to systems such as Google Drive, GitHub, databases, CRMs, or internal documents.']
    ]
  },
  {
    id: 'safety-terms',
    title: 'AI Safety and Security Terms',
    terms: [
      ['Prompt Injection', 'prompt-injection', 'An attack where hidden or malicious instructions try to override the system intended behavior.'],
      ['Jailbreak', 'jailbreak', 'A prompt or technique designed to bypass safety rules, policy constraints, or application guardrails.'],
      ['Data Exfiltration', 'data-exfiltration', 'Unauthorized extraction of private data, secrets, source code, or user information from a system.'],
      ['PII', 'pii', 'Personally identifiable information, such as names, emails, phone numbers, account IDs, addresses, or government identifiers.'],
      ['Secret', 'secret', 'A credential such as an API key, token, webhook signing secret, database password, or OAuth client secret.'],
      ['Least Privilege', 'least-privilege', 'A security principle where users, agents, and integrations receive only the permissions needed for their task.'],
      ['Sandbox', 'sandbox', 'An isolated environment for running code or agent actions with limits that reduce the blast radius of mistakes or attacks.'],
      ['Content Filtering', 'content-filtering', 'Rules or classifiers that block, flag, or transform unsafe, irrelevant, or policy-violating content.'],
      ['Audit Log', 'audit-log', 'A record of important actions, requests, cost events, security decisions, and operational changes.'],
      ['Data Retention', 'data-retention', 'The policy that determines how long user data, prompts, files, logs, and outputs are stored.'],
      ['Guardrail', 'guardrail', 'A rule, validator, permission boundary, or review step that keeps an AI system within safe and expected behavior.']
    ]
  },
  {
    id: 'evaluation-terms',
    title: 'AI Evaluation Terms',
    terms: [
      ['Benchmark', 'benchmark', 'A standard task or dataset used to compare model or agent performance.'],
      ['Eval', 'eval', 'A test that checks whether an AI system produces correct, safe, useful, and properly formatted results.'],
      ['Regression Test', 'regression-test', 'A test that ensures a new change does not break behavior that previously worked.'],
      ['Golden Dataset', 'golden-dataset', 'A trusted set of example inputs and expected outputs used to evaluate quality over time.'],
      ['Ground Truth', 'ground-truth', 'The expected correct answer or trusted reference used to judge AI output.'],
      ['Precision', 'precision', 'The share of returned results that are relevant or correct.'],
      ['Recall', 'recall', 'The share of relevant results that the system successfully finds.'],
      ['Confidence', 'confidence', 'A signal that describes how reliable a model, agent, or delivery appears to be.'],
      ['Red Teaming', 'red-teaming', 'Testing an AI system by intentionally trying to make it fail, leak data, ignore rules, or produce unsafe output.'],
      ['Observability', 'observability', 'Logs, traces, metrics, and dashboards used to understand how an AI system behaves in production.']
    ]
  },
  {
    id: 'operations-terms',
    title: 'AI Operations Terms',
    terms: [
      ['Tool Calling', 'tool-calling', 'The model asks the runtime to call an external tool, API, database, browser, or function instead of only producing text.'],
      ['Function Calling', 'function-calling', 'A structured form of tool calling where the model returns arguments for a defined function.'],
      ['MCP', 'mcp', 'Model Context Protocol. A standard pattern for exposing tools and context sources to AI applications.'],
      ['Workflow Automation', 'workflow-automation', 'Software automation that runs repeated steps. An AI agent can be part of a workflow, but workflows can also be deterministic.'],
      ['API', 'api', 'An application programming interface used by software systems to communicate.'],
      ['Webhook', 'webhook', 'An HTTP callback sent from one system to another when an event happens.'],
      ['OAuth', 'oauth', 'A login and authorization protocol used to connect accounts such as Google or GitHub without sharing passwords with CAIt.'],
      ['API Key', 'api-key', 'A token used by CLI or server-side clients to authenticate API requests. It should be stored like a secret.'],
      ['CLI', 'cli', 'A command-line interface for running workflows from a terminal instead of a browser.'],
      ['SDK', 'sdk', 'A software development kit that provides client libraries, helpers, and examples for building against an API.'],
      ['Rate Limit', 'rate-limit', 'A limit on how many requests can be made in a time window to protect reliability, cost, and abuse resistance.'],
      ['Queue', 'queue', 'A system that stores work until a worker or agent is ready to process it.'],
      ['Retry', 'retry', 'Running a failed or timed-out action again, usually with limits to avoid loops or duplicate side effects.'],
      ['Timeout', 'timeout', 'The maximum time a system waits before stopping a request or marking it as failed.'],
      ['Idempotency', 'idempotency', 'A property where repeating the same request does not create unintended duplicate effects.'],
      ['Webhook Signature', 'webhook-signature', 'A cryptographic check that confirms a webhook came from the expected service and was not modified in transit.']
    ]
  },
  {
    id: 'aiagent2-terms',
    title: 'CAIt Terms',
    terms: [
      ['Order', 'order', 'A request submitted to CAIt. The user describes the outcome, and CAIt routes the work to a suitable agent.'],
      ['Delivery', 'delivery', 'The result returned by an agent. A good delivery includes an answer, files, sources, cost, confidence, and next actions.'],
      ['Built-In Agent', 'built-in-agent', 'An agent provided inside CAIt so users can try the product before publishing their own agent.'],
      ['Manifest', 'manifest', 'A machine-readable description of an agent, including name, owner, task types, endpoint, capabilities, and verification metadata.'],
      ['Verification', 'verification', 'The readiness check that confirms an agent has the required manifest, health endpoint, job endpoint, and expected response behavior.'],
      ['Auto-Routing', 'auto-routing', 'The default routing mode where CAIt infers the task and chooses a ready agent instead of requiring manual selection.'],
      ['Broker', 'broker', 'The routing layer that matches an order to a suitable agent based on task type, readiness, and fit.'],
      ['Adapter PR', 'adapter-pr', 'A GitHub pull request generated by CAIt that adds files for an existing app to expose CAIt-compatible endpoints.'],
      ['CAIt API Key', 'cait-api-key', 'A user-scoped API key used to create and read orders, register agents, verify owned agents, and request GitHub adapter PR creation from CLI or server-side clients.'],
      ['Repository Write Confirmation', 'repository-write-confirmation', 'An explicit confirmation required before CAIt creates a GitHub adapter pull request from an API-key client.']
    ]
  }
];

export function glossaryTerms() {
  return glossaryCategories.flatMap((category) => category.terms.map(([term, slug, summary]) => ({
    term,
    slug,
    summary,
    categoryId: category.id,
    categoryTitle: category.title
  })));
}
