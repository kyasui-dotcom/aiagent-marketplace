const AGENT_PROVIDER = Object.freeze({
  health({ kind = '', definition = {}, source = {} } = {}) {
    const seed = agentProviderObject(definition.seedProfile);
    return {
      ok: true,
      service: agentProviderText(definition.healthService, kind || 'agent'),
      kind,
      mode: 'provider_contract',
      provider: 'agent_file',
      generation_provider: agentProviderText(source.OPENAI_API_KEY || source.BUILTIN_OPENAI_API_KEY) ? 'agent_configured' : 'agent_definition_packet',
      file_name: definition.fileName || null,
      model_role: definition.modelRole || null,
      execution_layer: definition.executionLayer || seed.metadata?.layer || null,
      task_types: agentProviderList(seed.taskTypes),
      capabilities: agentProviderList(seed.capabilities),
      tool_strategy: agentProviderObject(definition.toolStrategy),
      specialist_method: agentProviderList(definition.specialistMethod),
      scope_boundaries: agentProviderList(definition.scopeBoundaries),
      freshness_policy: definition.freshnessPolicy || null,
      sensitive_data_policy: definition.sensitiveDataPolicy || null,
      cost_control_policy: definition.costControlPolicy || null
    };
  },

  async runJob({ kind = '', definition = {}, body = {} } = {}) {
    const prompt = agentProviderPrompt(body);
    const japanese = agentProviderJapanese([prompt, body.output_language, body.outputLanguage].join('\n'));
    const seed = agentProviderObject(definition.seedProfile);
    const name = agentProviderText(seed.name || definition.healthService || kind, kind || 'agent');
    const webSources = agentProviderResearchSources(body);
    const searchRequired = agentProviderResearchSearchRequired(body);
    if (searchRequired && !webSources.length) {
      const failure = japanese
        ? `${name} は検索必須の研究ジョブを完了できません。web_sources または提供ソースが必要です。`
        : `${name} cannot complete a search-required research job without web_sources or supplied source context.`;
      return {
        accepted: false,
        status: 'failed',
        summary: failure,
        error: 'missing_required_search_sources',
        failure_reason: `missing_required_search_sources: ${failure}`,
        report: {
          summary: failure,
          bullets: [
            japanese ? '検索必須のジョブですが、provider入力に検索結果または提供ソースがありません。' : 'The job is search-required, but the provider input did not include search results or supplied source context.',
            japanese ? 'ソースなしのメタ納品を completed として返さないため、この agent が失敗を明示しています。' : 'The agent is explicitly failing instead of returning a meta delivery as completed.',
            japanese ? 'オーケストレーション側で検索/ソース収集付きのリトライ対象として扱ってください。' : 'The orchestration layer should retry this with search/source collection attached.'
          ],
          nextAction: japanese ? '検索結果または提供ソースを添付して再実行してください。' : 'Attach search results or source context, then retry.',
          confidence: 'low',
          web_sources: []
        },
        files: [],
        usage: {
          total_cost_basis: 0,
          compute_cost: 0,
          tool_cost: 0,
          labor_cost: 0,
          api_cost: 0
        },
        return_targets: ['chat', 'api'],
        runtime: {
          mode: 'provider_contract',
          provider: 'agent_file',
          kind,
          service: definition.healthService || null,
          file_name: definition.fileName || null,
          failure_category: 'missing_required_search_sources'
        }
      };
    }
    const markdown = webSources.length
      ? agentProviderResearchMarkdown(kind, definition, body, webSources)
      : agentProviderMarkdown(kind, definition, body);
    return {
      accepted: true,
      status: 'completed',
      summary: japanese
        ? `${name} が自身の agent ファイル内 provider 実装で納品しました。`
        : `${name} completed through its own agent-file provider implementation.`,
      report: {
        summary: webSources.length
          ? (japanese ? `${name} source-backed research delivery` : `${name} source-backed research delivery`)
          : (japanese ? `${name} provider delivery` : `${name} provider delivery`),
        bullets: webSources.length
          ? [
              japanese ? `利用ソース: ${webSources.length}件。` : `Sources used: ${webSources.length}.`,
              japanese ? 'ソースは provider 入力から抽出し、web_sources として添付しました。' : 'Sources were extracted from provider input and attached as web_sources.',
              japanese ? '外部投稿、送信、公開、PR作成などは実行していません。' : 'No external posting, sending, publishing, or repository write was performed.'
            ]
          : [
              japanese ? '共通 builtin runner ではなく、この agent ファイル内の provider.runJob が処理しました。' : 'Handled by provider.runJob inside this agent file, not by a central built-in runner.',
              japanese ? '外部投稿、送信、公開、PR作成などは実行していません。' : 'No external posting, sending, publishing, or repository write was performed.',
              japanese ? '改善が必要な場合はこの agent ファイルの provider 実装を直接変更します。' : 'Future behavior changes should be made in this agent file provider implementation.'
            ],
        nextAction: agentProviderText(definition.nextAction, japanese ? '不足情報を確認して次の実行に進んでください。' : 'Review missing inputs, then continue with the next provider action.'),
        confidence: prompt === 'No prompt provided.' ? 'low' : 'medium',
        ...(webSources.length ? { web_sources: webSources } : {})
      },
      files: [{
        name: agentProviderText(definition.fileName, `${kind || 'agent'}-delivery.md`),
        type: 'text/markdown',
        content: markdown,
        source_task_type: kind,
        content_type: 'agent_file_provider_delivery'
      }],
      usage: {
        total_cost_basis: agentProviderUsage(definition),
        compute_cost: Math.round(agentProviderUsage(definition) * 0.35),
        tool_cost: Math.round(agentProviderUsage(definition) * 0.15),
        labor_cost: Math.round(agentProviderUsage(definition) * 0.5),
        api_cost: 0
      },
      return_targets: ['chat', 'api'],
      runtime: {
        mode: 'provider_contract',
        provider: 'agent_file',
        kind,
        service: definition.healthService || null,
        file_name: definition.fileName || null
      }
    };
  }
});

function agentProviderText(value = '', fallback = '') {
  const safe = String(value ?? '').trim();
  return safe || fallback;
}

function agentProviderList(value = []) {
  return Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : [];
}

function agentProviderObject(value = {}) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function agentProviderJapanese(value = '') {
  const text = String(value || '').toLowerCase();
  if (/\b(en|english)\b/.test(text)) return false;
  if (/\b(ja|jp|japanese)\b/.test(text)) return true;
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(text);
}

function agentProviderPrompt(body = {}) {
  return agentProviderText(body.goal || body.full_prompt || body.fullPrompt || body.prompt, 'No prompt provided.');
}

function agentProviderResearchSearchRequired(body = {}) {
  const workflow = body?.input?._broker?.workflow && typeof body.input._broker.workflow === 'object'
    ? body.input._broker.workflow
    : {};
  const sourceCollectionContract = body.source_collection_contract
    || body.sourceCollectionContract
    || workflow.sourceCollectionContract
    || workflow.source_collection_contract
    || null;
  if (
    workflow.forceWebSearch === true
    || workflow.requiresWebSearch === true
    || workflow.searchRequired === true
    || workflow.requiresSourceCollection === true
    || sourceCollectionContract?.required === true
  ) return true;
  const rules = JSON.stringify(body.quality_rules || body.qualityRules || body.downstream_handoff_summary_contract || sourceCollectionContract || {});
  return /web_sources|required search|search-required|source collection|source_collection/i.test(rules);
}

function agentProviderResearchSources(body = {}) {
  const sources = [];
  const seen = new Set();
  const push = (source = {}, fallback = {}) => {
    if (!source) return;
    const value = typeof source === 'string' ? { url: source } : source;
    if (!value || typeof value !== 'object') return;
    const rawUrl = agentProviderText(value.url || value.link || value.href || value.siteUrl || value.site || value.source_url || value.sourceUrl || fallback.url);
    const domainUrl = agentProviderUrlFromSearchConsoleDomain(rawUrl);
    const url = agentProviderCleanUrl(domainUrl || rawUrl);
    const title = agentProviderText(value.title || value.name || value.label || fallback.title, url ? 'Source context' : 'Source query');
    const snippet = agentProviderText(value.snippet || value.description || value.summary || fallback.snippet);
    const query = agentProviderText(value.query || value.search_query || value.searchQuery || fallback.query);
    const action = agentProviderText(value.action || value.source_action || value.sourceAction || fallback.action, 'source_collection');
    const provider = agentProviderText(value.provider || value.search_provider || value.searchProvider || fallback.provider, 'agent_file_source_collection');
    if (!url && !title && !snippet && !query) return;
    const key = [url, title, snippet, query].join('|').toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    sources.push({ url, title, snippet, query, action, provider });
  };

  const broker = body?.input?._broker && typeof body.input._broker === 'object' ? body.input._broker : {};
  const workflow = broker.workflow && typeof broker.workflow === 'object' ? broker.workflow : {};
  const handoff = workflow.leaderHandoff && typeof workflow.leaderHandoff === 'object' ? workflow.leaderHandoff : {};
  const containers = [
    body.web_sources,
    body.webSources,
    body.sources,
    body.source_context?.web_sources,
    body.sourceContext?.webSources,
    body.report?.web_sources,
    body.output?.report?.web_sources,
    body.input?.web_sources,
    body.input?.webSources,
    broker.web_sources,
    broker.webSources,
    workflow.web_sources,
    workflow.webSources,
    handoff.web_sources,
    handoff.webSources
  ];
  for (const container of containers) {
    if (Array.isArray(container)) {
      for (const item of container) push(item, { action: 'source_collection' });
    }
  }
  for (const run of [
    ...(Array.isArray(handoff.priorRuns) ? handoff.priorRuns : []),
    ...(Array.isArray(handoff.priorDeliverables) ? handoff.priorDeliverables : [])
  ]) {
    for (const item of Array.isArray(run?.webSources) ? run.webSources : []) {
      push(item, { title: run?.taskType || run?.workflowTask || 'Prior specialist source', action: 'prior_source_collection', provider: 'leader_handoff' });
    }
  }
  for (const context of [
    ...(Array.isArray(body.input?.connectorContexts) ? body.input.connectorContexts : []),
    ...(Array.isArray(body.input?.appContexts) ? body.input.appContexts : []),
    ...(Array.isArray(broker.appContexts) ? broker.appContexts : []),
    ...(Array.isArray(broker.connectorContexts) ? broker.connectorContexts : [])
  ]) {
    if (!context || typeof context !== 'object') continue;
    const raw = context.raw_context && typeof context.raw_context === 'object'
      ? context.raw_context
      : (context.rawContext && typeof context.rawContext === 'object' ? context.rawContext : {});
    const contextProvider = context.source_app || context.sourceApp || 'app_context';
    for (const value of [raw.googleSearchConsoleSite, raw.siteUrl, raw.site, raw.url, context.url]) {
      push(String(value || ''), {
        title: context.title || context.summary || context.source_app_label || context.source_app || 'Attached source context',
        snippet: context.summary || 'Source URL carried by attached app/connector context.',
        action: 'source_collection',
        provider: contextProvider
      });
    }
    for (const rawUrl of agentProviderExtractUrls(agentProviderContextEvidenceText(context))) {
      push(rawUrl, {
        title: context.title || context.source_app_label || 'Attached source context',
        snippet: context.summary || 'Source URL carried by attached app/connector context.',
        action: 'source_collection',
        provider: contextProvider
      });
    }
    for (const row of agentProviderContextArtifactRows(context)) {
      const rowText = JSON.stringify(row);
      const rowUrls = agentProviderExtractUrls(rowText);
      const query = agentProviderText(row.query || row.search_query || row.searchQuery || row.keyword || row.term);
      const snippet = agentProviderText(row.note || row.snippet || row.summary || row.description);
      if (!rowUrls.length && !query) continue;
      for (const rawUrl of rowUrls.length ? rowUrls : ['']) {
        push({ url: rawUrl, query, snippet }, {
          title: query ? `Search Console query: ${query}` : 'Connector evidence row',
          action: contextProvider === 'analytics_console' ? 'google_search_console' : 'source_collection',
          provider: contextProvider
        });
      }
    }
  }
  const textSources = [
    body.full_prompt,
    body.fullPrompt,
    body.prompt,
    body.goal,
    body.additional_prompt,
    body.additionalPrompt,
    body.input?.original_prompt,
    body.input?.originalPrompt,
    workflow.originalPrompt,
    workflow.original_prompt,
    workflow.objective
  ].map((item) => String(item || '')).join('\n');
  for (const rawUrl of agentProviderExtractUrls(textSources)) {
    push(rawUrl, {
      title: 'Source URL from research prompt',
      snippet: 'URL supplied in the research request or workflow context.',
      action: 'source_collection',
      provider: 'prompt_context'
    });
  }
  return sources.slice(0, 8);
}

function agentProviderContextEvidenceText(context = {}) {
  const parts = [
    context.title,
    context.summary,
    context.source_app_label,
    ...(Array.isArray(context.facts) ? context.facts : []),
    ...(Array.isArray(context.assumptions) ? context.assumptions : [])
  ];
  const raw = context.raw_context && typeof context.raw_context === 'object'
    ? context.raw_context
    : (context.rawContext && typeof context.rawContext === 'object' ? context.rawContext : {});
  parts.push(...Object.values(raw || {}));
  return parts.map((item) => {
    if (item == null) return '';
    if (typeof item === 'string') return item;
    try {
      return JSON.stringify(item);
    } catch {
      return String(item || '');
    }
  }).join('\n');
}

function agentProviderContextArtifactRows(context = {}) {
  const rows = [];
  for (const artifact of Array.isArray(context.artifacts) ? context.artifacts : []) {
    if (!artifact || typeof artifact !== 'object') continue;
    if (Array.isArray(artifact.rows)) rows.push(...artifact.rows.filter((row) => row && typeof row === 'object'));
  }
  return rows.slice(0, 40);
}

function agentProviderUrlFromSearchConsoleDomain(value = '') {
  const text = String(value || '').trim();
  const match = text.match(/^sc-domain:([a-z0-9.-]+)$/i);
  return match ? `https://${match[1]}/` : '';
}

function agentProviderCleanUrl(value = '') {
  const text = String(value || '').trim().replace(/\\?["'].*$/g, '').replace(/[),.;\]]+$/g, '');
  if (!text) return '';
  const fromDomain = agentProviderUrlFromSearchConsoleDomain(text);
  if (fromDomain) return fromDomain;
  if (/^https?:\/\//i.test(text)) return text;
  return '';
}

function agentProviderExtractUrls(value = '') {
  const urls = [];
  const text = String(value || '');
  const pattern = /(https?:\/\/[^\s<>)\]"'\\]+|sc-domain:[a-z0-9.-]+)/ig;
  let match;
  while ((match = pattern.exec(text))) {
    const url = agentProviderCleanUrl(match[1]);
    if (url && !urls.includes(url)) urls.push(url);
  }
  return urls.slice(0, 12);
}

function agentProviderUsage(definition = {}) {
  return Math.max(40, Math.round(Number(definition.seedProfile?.avgLatencySec || 10) * 4));
}

function agentProviderSection(title = '', values = []) {
  const items = agentProviderList(values);
  if (!items.length) return '';
  return [`## ${title}`, ...items.map((item) => `- ${item}`)].join('\n');
}

function agentProviderMarkdown(kind = '', definition = {}, body = {}) {
  const seed = agentProviderObject(definition.seedProfile);
  const prompt = agentProviderPrompt(body);
  const lines = [
    `# ${agentProviderText(definition.fileName, `${kind || 'agent'}-delivery.md`).replace(/\.md$/i, '').replace(/-/g, ' ')}`,
    '',
    '## Request',
    prompt,
    '',
    '## Agent-owned behavior',
    `- agent: ${agentProviderText(seed.name || definition.healthService || kind, kind || 'agent')}`,
    `- role: ${agentProviderText(definition.modelRole, 'provider-defined agent')}`,
    `- layer: ${agentProviderText(definition.executionLayer || seed.metadata?.layer, 'worker')}`,
    definition.executionFocus ? `- Execution focus: ${definition.executionFocus}` : '',
    definition.firstMove ? `- First move: ${definition.firstMove}` : '',
    definition.evidencePolicy ? `- Evidence policy: ${definition.evidencePolicy}` : '',
    definition.nextAction ? `- Next action rule: ${definition.nextAction}` : '',
    '',
    agentProviderSection('Expected output sections', definition.outputSections),
    '',
    agentProviderSection('Input needs', definition.inputNeeds),
    '',
    agentProviderSection('Acceptance checks', definition.acceptanceChecks),
    '',
    agentProviderSection('Scope boundaries', definition.scopeBoundaries),
    '',
    agentProviderSection('Specialist method', definition.specialistMethod),
    '',
    '## Delivery packet',
    agentProviderText(definition.deliverableHint, 'Return the concrete work product requested by the user, with assumptions and next action clearly separated.'),
    '',
    '## Review notes',
    agentProviderText(definition.reviewHint, 'Check the output against this agent definition before returning it.')
  ];
  return lines.filter((line) => line !== '').join('\n').replace(/\n{3,}/g, '\n\n');
}

function agentProviderResearchMarkdown(kind = '', definition = {}, body = {}, webSources = []) {
  const seed = agentProviderObject(definition.seedProfile);
  const prompt = agentProviderPrompt(body);
  const japanese = agentProviderJapanese([prompt, body.output_language, body.outputLanguage].join('\n'));
  const sourceLines = webSources.map((source) => `- ${[source.title, source.url, source.snippet].filter(Boolean).join(' | ')}`);
  const lines = japanese
    ? [
        `# ${agentProviderText(definition.fileName, `${kind || 'agent'}-delivery.md`).replace(/\.md$/i, '').replace(/-/g, ' ')}`,
        '',
        '## 先に結論',
        'この research agent は、provider 入力に含まれる提供ソースを根拠として source-backed research packet を返しました。ライブ検索を実行したとは主張しません。',
        '',
        '## Request',
        prompt,
        '',
        '## Evidence status',
        ...sourceLines,
        '',
        '## 3C / research direction',
        '- Company: 添付データ、対象URL、既存文脈を分けて扱う。',
        '- Customer: 検索・比較・導入判断の不安を仮説として整理する。',
        '- Competitor: 追加の公開検索がない場合、競合断定は避け、検証待ちとして渡す。',
        '',
        '## Next action',
        agentProviderText(definition.nextAction, 'Planning/Preparation はこの source status を保持し、不足ソースを仮定として分離してください。')
      ]
    : [
        `# ${agentProviderText(definition.fileName, `${kind || 'agent'}-delivery.md`).replace(/\.md$/i, '').replace(/-/g, ' ')}`,
        '',
        '## Answer first',
        'This research agent returned a source-backed research packet from the supplied provider input. It does not claim live browsing unless the source packet says so.',
        '',
        '## Request',
        prompt,
        '',
        '## Evidence status',
        ...sourceLines,
        '',
        '## 3C / research direction',
        '- Company: separate attached data, target URL, and prior context.',
        '- Customer: frame search, comparison, and adoption objections as hypotheses.',
        '- Competitor: avoid definitive competitor claims without additional public search; pass them as verification gaps.',
        '',
        '## Next action',
        agentProviderText(definition.nextAction, 'Planning/Preparation should preserve this source status and keep missing sources separated as assumptions.')
      ];
  return lines.filter((line) => line !== '').join('\n').replace(/\n{3,}/g, '\n\n');
}
const AGENT_DEFINITION = {
  provider: AGENT_PROVIDER,
  "fileName": "research-delivery.md",
  "healthService": "research_agent",
  "modelRole": "research and market analysis",
  "executionLayer": "research",
  "taskRouting": {
    "inferenceRules": [
      { taskType: 'research', patterns: [/(research|compare|analysis|investigate|市場|比較|調査|戦略)/i] },
      { taskType: 'summary', patterns: [/(summary|要約|まとめ|recap|digest)/i] }
    ],
    "expansionTasksByTask": {
      research: ['summary']
    },
    "softMatchTokensByTask": {
      research: ['research', 'analysis', 'summary'],
      summary: ['summary', 'synthesis', 'recap', 'final_report']
    },
    "tagHintsByTask": {
      research: ['research', 'analysis', 'evidence'],
      summary: ['summary', 'synthesis', 'research']
    }
  },
  "seedProfile": {
    "id": "agent_research_01",
    "name": "RESEARCH AGENT",
    "description": "Built-in decision-support research agent that turns source evidence into answer-first 3C diagnosis, service-specific improvement directions, and prioritized recommendations.",
    "taskTypes": [
      "research",
      "summary"
    ],
    "successRate": 0.95,
    "avgLatencySec": 8,
    "capabilities": [
      "answer_first_research",
      "source_status_note",
      "option_comparison",
      "decision_recommendation",
      "three_c_diagnosis",
      "service_specific_improvement_plan",
      "preparation_inputs"
    ],
    "metadata": {
      "layer": "research",
      "output_contract": [
        "findings",
        "sources",
        "confidence",
        "recommended_action",
        "three_c_analysis",
        "prioritized_recommendations",
        "preparation_inputs"
      ],
      "connector_behavior": "Use supplied context first and verify current public facts when freshness changes the answer. Return a diagnosis-and-recommendation memo that connects evidence to concrete changes for the target service, not a generic background summary."
    }
  },
  "systemPrompt": "You are the built-in research agent for AIagent2. Return decision-ready research output, not a generic background note. If the user asks a direct factual question, answer the most likely interpretation immediately in the first sentence. For business, marketing, growth, SEO, or product research, your job is not only to summarize sources; it is to convert source evidence into a service-specific diagnosis and improvement proposal. Start with the answer, then separate owned/user data, public/search evidence, competitor evidence, assumptions, and confidence. When doing 3C analysis, each of Company, Customer, and Competitor must include evidence, interpretation, problem for this service, improvement direction, concrete actions, and KPI. After 3C, return 3-5 prioritized recommendations with impact, effort, confidence, why now, first action, and stop rule. If conversions are zero or the conversion path is unclear, include conversion-path repair before acquisition expansion. Do not output duplicated sections, raw search-result dumps, unexplained counts, or contradictions. Do not leak the original task prompt into the analysis. When freshness matters, label what was verified versus what remains an assumption, and state the observation date or source window. Do not claim to have browsed the web unless web search is available and used, or the prompt explicitly includes source material. If the task is underspecified, state assumptions briefly and continue.",
  "deliverableHint": "Write sections for answer first, evidence summary, 3C diagnosis, service-specific improvement directions, prioritized recommendations, risks/unknowns, and next check. Make the result usable as a diagnosis and execution brief, not a generic source summary.",
  "reviewHint": "Tighten the answer, evidence status, 3C diagnosis, service-specific improvement directions, prioritized recommendations, and concrete next inputs. Remove duplicated sections, unexplained counts, contradictions, and raw source-list dominance.",
  "executionFocus": "Start with the answer and the strongest service-specific recommendation. Then show evidence status, 3C diagnosis, improvement directions, prioritized actions, and the concrete next inputs.",
  "outputSections": [
    "Answer first",
    "Evidence summary",
    "3C diagnosis",
    "Service-specific improvement directions",
    "Prioritized recommendations",
    "Risks and unknowns",
    "Next action"
  ],
  "inputNeeds": [
    "Question or decision to answer",
    "Region, market, or time range",
    "Allowed source types",
    "Comparison criteria",
    "Output format"
  ],
  "acceptanceChecks": [
    "Answer-first claim is explicit",
    "Evidence and source status are clear",
    "Assumptions are labeled",
    "3C analysis connects evidence to service-specific problems and improvements",
    "Prioritized recommendations include impact, effort, confidence, first action, KPI, and stop rule"
  ],
  "firstMove": "Identify the exact decision or question first. If this is business or marketing research, state the most important improvement recommendation first, then gather or use sources to support the 3C diagnosis.",
  "failureModes": [
    "Do not bury the direct answer after background",
    "Do not invent citations or pretend to browse",
    "Do not ignore date, region, or source freshness when they affect the answer",
    "Do not stop at search synthesis when the task needs business improvement recommendations",
    "Do not recommend acquisition expansion before conversion-path repair when conversions are zero"
  ],
  "evidencePolicy": "Use current, verifiable sources when facts are time-sensitive. State source dates or evidence status and distinguish direct evidence from inference.",
  "nextAction": "End with the top recommendation, the concrete preparation artifact that should be produced next, and the single source or check that would most improve confidence.",
  "confidenceRubric": "High when scope, date range, source quality, and comparison criteria are verified; medium when current sources are partial; low when freshness, region, or source access materially changes the answer.",
  "handoffArtifacts": [
    "Answer-first summary",
    "Source/evidence map",
    "Assumptions and uncertainty",
    "Decision recommendation",
    "3C diagnosis table",
    "Prioritized improvement plan",
    "Preparation inputs"
  ],
  "prioritizationRubric": "Prioritize claims by decision impact, evidence quality, freshness, region fit, and whether the answer would change with better sources.",
  "measurementSignals": [
    "Source quality",
    "Freshness",
    "Decision confidence",
    "Assumption count"
  ],
  "assumptionPolicy": "Assume a neutral research stance and the most common interpretation of the question. Do not assume region, date range, or source freshness when those change the answer.",
  "escalationTriggers": [
    "Current facts or prices are required but sources are unavailable",
    "Region or date range changes the answer",
    "The question has high-stakes legal, medical, or financial implications"
  ],
  "minimumQuestions": [
    "What exact decision should the research answer?",
    "Which region, market, and time range should apply?",
    "Are current sources required?"
  ],
  "reviewChecks": [
    "Answer appears first",
    "Evidence status is explicit",
    "Recommendation maps to the decision"
  ],
  "depthPolicy": "Default to answer-first synthesis. Go deeper when the decision is source-sensitive, current, comparative, or high-stakes.",
  "concisionRule": "Keep background short; put the answer, evidence status, assumptions, and recommendation before optional detail.",
  "toolStrategy": {
    "web_search": "default",
    "source_mode": "current_web_or_user_sources",
    "note": "Use current web sources for prices, rankings, dates, laws, market claims, and any fact likely to change."
  },
  "specialistMethod": [
    "Convert the user question into the exact decision, scope, date range, and comparison criteria.",
    "Check current or supplied sources before analysis when facts can change.",
    "Answer first, then separate evidence, assumptions, uncertainty, 3C diagnosis, and prioritized recommendations.",
    "For each 3C item, connect evidence to interpretation, service problem, improvement direction, specific actions, and KPI.",
    "Limit the final recommendations to the few actions that should change the target service or preparation queue now."
  ],
  "scopeBoundaries": [
    "Do not present stale or unsourced current facts as certain.",
    "Do not turn research support into medical, legal, financial, or safety-critical advice.",
    "Do not bury the direct answer behind background when the user asked a specific factual question."
  ],
  "freshnessPolicy": "For prices, rankings, laws, market facts, or recent events, use current sources and state the observation date or source date before drawing conclusions.",
  "sensitiveDataPolicy": "Minimize personal data, internal company facts, and paid-source excerpts. Summarize sensitive inputs at the level needed for the decision and do not expose raw private material.",
  "costControlPolicy": "Spend effort on source checks only where freshness or decision impact changes the answer. Prefer concise answer-first synthesis over exhaustive background collection."
};

AGENT_DEFINITION.manifest = Object.freeze({
  schema_version: 'agent-manifest/v1',
  kind: 'research',
  name: agentProviderText(AGENT_DEFINITION.seedProfile?.name, AGENT_DEFINITION.healthService || 'research'),
  description: agentProviderText(AGENT_DEFINITION.seedProfile?.description, AGENT_DEFINITION.modelRole || 'research agent'),
  agent_role: AGENT_DEFINITION.executionLayer === 'leader' ? 'leader' : 'worker',
  task_types: agentProviderList(AGENT_DEFINITION.seedProfile?.taskTypes),
  capabilities: agentProviderList(AGENT_DEFINITION.seedProfile?.capabilities),
  healthcheckUrl: '/sample-agents/research/health',
  healthcheck_url: '/sample-agents/research/health',
  jobEndpoint: '/sample-agents/research/jobs',
  job_endpoint: '/sample-agents/research/jobs',
  endpoints: Object.freeze({
    health: '/sample-agents/research/health',
    jobs: '/sample-agents/research/jobs'
  }),
  metadata: Object.freeze({
    sample: true,
    sampleKind: 'research',
    sample_kind: 'research',
    category: 'research',
    provider: 'agent_file',
    execution_scope: 'agent_file_manifest',
    routable: true,
    externalProviderRequired: false,
    external_provider_required: false
  })
});

export default Object.freeze(AGENT_DEFINITION);
