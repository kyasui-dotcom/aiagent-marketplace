export function createWorkflowQualityHandoffHelpers({
  leaderActionLayerStart,
  workflowLayerLabel,
  workflowPrimaryTask,
  workflowSearchSourcesFromReport
} = {}) {
  function workflowSourceSignalStrings(sources = []) {
    const signals = [];
    const seen = new Set();
    const push = (value = '') => {
      const text = String(value || '').trim();
      if (!text) return;
      const normalized = text.toLowerCase();
      if (seen.has(normalized)) return;
      seen.add(normalized);
      signals.push(text);
    };
    for (const source of Array.isArray(sources) ? sources : []) {
      if (!source || typeof source !== 'object') continue;
      push(source.url);
      push(source.title);
      push(source.snippet);
      push(source.query);
      push(source.action);
      push(source.provider);
      try {
        const hostname = source.url ? new URL(source.url).hostname.replace(/^www\./i, '') : '';
        push(hostname);
      } catch {}
    }
    return signals.slice(0, 20);
  }
  
  function workflowMinimumPriorUseForPhase(phase = '', priorRunCount = 0) {
    const normalizedPhase = String(phase || '').trim().toLowerCase();
    const count = Math.max(0, Number(priorRunCount || 0) || 0);
    if (!count) return 0;
    if (normalizedPhase === 'planning') return 1;
    if (['preparation', 'action', 'implementation'].includes(normalizedPhase)) return Math.min(2, count);
    if (['checkpoint', 'final_summary'].includes(normalizedPhase)) return Math.min(2, count);
    return Math.min(1, count);
  }
  
  function workflowHandoffPriorDeliverables(priorRuns = []) {
    return (Array.isArray(priorRuns) ? priorRuns : [])
      .map((run) => {
        const files = Array.isArray(run?.files)
          ? run.files.map((file) => ({
            name: String(file?.name || 'delivery.md').slice(0, 160),
            content: String(file?.content || '').slice(0, 10000)
          })).filter((file) => file.name || file.content).slice(0, 2)
          : [];
        return {
          jobId: run?.jobId || null,
          taskType: run?.taskType || run?.workflowTask || '',
          layer: Number(run?.layer || 0) || null,
          summary: String(run?.summary || run?.reportSummary || '').slice(0, 1600),
          bullets: Array.isArray(run?.bullets) ? run.bullets.slice(0, 6) : [],
          webSources: Array.isArray(run?.webSources) ? run.webSources.slice(0, 8) : [],
          files,
          requiredUsageSignals: workflowHandoffOriginalSignals([run]).slice(0, 8)
        };
      })
      .filter((item) => item.summary || item.bullets.length || item.webSources.length || item.files.length)
      .slice(0, 10);
  }
  
  function workflowSlimPriorRunForHandoff(run = {}) {
    const deliverableMarkdown = String(
      run.deliverableMarkdown
      || (Array.isArray(run.files)
        ? run.files
          .map((file) => {
            if (typeof file === 'string') return '';
            return [`# ${file?.name || 'delivery.md'}`, file?.content || ''].filter(Boolean).join('\n');
          })
          .filter(Boolean)
          .join('\n\n')
        : '')
      || ''
    ).trim();
    const files = Array.isArray(run.files)
      ? run.files
        .map((file) => {
          if (typeof file === 'string') return { name: workflowHandoffClip(file, 120), content_available: false };
          return {
            name: workflowHandoffClip(file?.name || 'delivery.md', 120),
            content_available: Boolean(String(file?.content || '').trim())
          };
        })
        .filter((file) => file.name)
        .slice(0, 4)
      : [];
    const structuredDigest = run.structuredDigest && typeof run.structuredDigest === 'object'
      ? run.structuredDigest
      : workflowStructuredHandoffDigestFromRun(run);
    return {
      jobId: run.jobId || null,
      taskType: run.taskType || run.workflowTask || '',
      agentId: run.agentId || null,
      agentName: run.agentName || null,
      sequencePhase: run.sequencePhase || run.phase || null,
      layer: Number(run.layer || 0) || null,
      completedAt: run.completedAt || null,
      summary: String(run.summary || run.reportSummary || '').slice(0, 500),
      nextAction: String(run.nextAction || run.next_action || '').slice(0, 360),
      webSources: Array.isArray(run.webSources) ? run.webSources.slice(0, 8) : [],
      sourceBundle: run.sourceBundle || null,
      qualityGate: run.qualityGate || null,
      files,
      deliverableMarkdownExcerpt: deliverableMarkdown ? workflowHandoffBlockClip(deliverableMarkdown, 1600) : '',
      structuredDigest,
      requiredUsageSignals: Array.isArray(run.requiredUsageSignals) ? run.requiredUsageSignals.slice(0, 8) : [],
      promptContextAttached: run.promptContextAttached === true
    };
  }
  
  function workflowExecutionProgram(parent = {}, targetLayer = 1, priorRuns = []) {
    const primaryTask = workflowPrimaryTask(parent);
    const targetPhase = workflowLayerLabel(primaryTask, targetLayer);
    const requiredPriorUse = workflowMinimumPriorUseForPhase(targetPhase, priorRuns.length);
    return {
      version: 'workflow-execution-program/v1',
      primaryTask,
      targetLayer,
      targetPhase,
      steps: [
        'read_structured_handoff_digest',
        'apply_agent_role_contract',
        'produce_phase_specific_artifact',
        'surface_missing_source_or_connector_blockers'
      ],
      gates: {
        sourceBackedResearchBeforePlanning: targetLayer >= 2,
        priorHandoffBeforePreparationOrAction: targetLayer >= 3,
        approvalBeforeExternalWrite: targetLayer >= leaderActionLayerStart(primaryTask),
        noGenericTemplateFallbackWhenPriorRunsExist: priorRuns.length > 0
      },
      requiredPriorUse,
      priorDependencies: priorRuns.map((run) => ({
        taskType: run.taskType || run.workflowTask || '',
        jobId: run.jobId || null,
        layer: Number(run.layer || 0) || null,
        status: run.status || 'completed'
      })).slice(0, 12)
    };
  }
  
  function workflowOutputText(job = {}) {
    const output = job?.output && typeof job.output === 'object' ? job.output : {};
    const report = output.report && typeof output.report === 'object' ? output.report : {};
    const bullets = Array.isArray(report.bullets) ? report.bullets : [];
    const files = Array.isArray(output.files) ? output.files : [];
    const webSources = workflowSearchSourcesFromReport(report);
    return [
      output.summary,
      report.summary,
      report.answer,
      report.nextAction,
      report.next_action,
      ...bullets,
      ...webSources.flatMap((source) => [source.title, source.url, source.snippet]),
      ...files.map((file) => file?.content || '')
    ]
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .join('\n');
  }
  
  function workflowOutputTextForQuality(job = {}) {
    return workflowOutputText(job)
      .replace(/##\s+Original information used[\s\S]*?(?=\n##\s+|$)/gi, '')
      .replace(/^[-*]?\s*Used original information:\s*.*$/gmi, '')
      .replace(/^[-*]?\s*Handoff evidence attached:\s*.*$/gmi, '');
  }
  
  function workflowHandoffClip(value = '', max = 500) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (!text || text.length <= max) return text;
    return `${text.slice(0, Math.max(0, max - 1)).trim()}...`;
  }
  
  function workflowHandoffBlockClip(value = '', max = 5000) {
    const text = String(value || '')
      .replace(/\r\n/g, '\n')
      .replace(/\n{4,}/g, '\n\n\n')
      .trim();
    if (!text || text.length <= max) return text;
    return `${text.slice(0, Math.max(0, max - 1)).trim()}...`;
  }
  
  function workflowFlattenTextParts(value, parts = []) {
    if (value == null) return parts;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      const text = String(value).trim();
      if (text) parts.push(text);
      return parts;
    }
    if (Array.isArray(value)) {
      for (const entry of value) workflowFlattenTextParts(entry, parts);
      return parts;
    }
    if (typeof value === 'object') {
      for (const entry of Object.values(value)) workflowFlattenTextParts(entry, parts);
    }
    return parts;
  }
  
  function workflowNormalizeCandidateUrl(value = '') {
    let text = String(value || '')
      .trim()
      .replace(/^[0-9０-９]+[.)．、]\s*/u, '')
      .replace(/[)\].,;、。]+$/u, '');
    if (!text) return '';
    if (!/^https?:\/\//i.test(text)) text = `https://${text}`;
    try {
      const parsed = new URL(text);
      if (!['http:', 'https:'].includes(parsed.protocol)) return '';
      if (!parsed.hostname.includes('.')) return '';
      parsed.hostname = parsed.hostname.replace(/^www\./i, '').toLowerCase();
      return parsed.toString().replace(/\/$/, '');
    } catch {
      return '';
    }
  }
  
  function workflowExtractSourceUrls(text = '', limit = 8) {
    const source = String(text || '')
      .replace(/(^|[\s\n])[0-9０-９]+[.)．、]\s*(?=(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+)/gi, '$1');
    const urls = [];
    const seen = new Set();
    const push = (value = '') => {
      const url = workflowNormalizeCandidateUrl(value);
      const key = url.toLowerCase();
      if (!url || seen.has(key)) return;
      seen.add(key);
      urls.push(url);
    };
    for (const match of source.match(/https?:\/\/[^\s)"'<>]+/ig) || []) push(match);
    const domainPattern = /(?:^|[^@a-z0-9_-])((?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+)(?=[^a-z0-9_-]|$)/gi;
    let match = domainPattern.exec(source);
    while (match) {
      push(match[1]);
      if (urls.length >= limit) break;
      match = domainPattern.exec(source);
    }
    return urls.slice(0, limit);
  }
  
  function workflowCanonicalBriefFromJob(job = {}, workflow = {}, handoff = {}) {
    const input = job?.input && typeof job.input === 'object' ? job.input : {};
    const broker = input._broker && typeof input._broker === 'object' ? input._broker : {};
    const promptOptimization = broker.promptOptimization || job.promptOptimization || {};
    const rawText = workflowFlattenTextParts([
      handoff.canonicalBrief?.rawRequest,
      handoff.objective,
      workflow.objective,
      workflow.originalPrompt,
      job.originalPrompt,
      promptOptimization.originalPrompt,
      input.originalPrompt,
      input.orderBrief,
      input.brief,
      input.request,
      input.summary,
      input.description,
      input.product,
      input.productName,
      input.product_name,
      input.url,
      input.urls,
      input.website,
      input.websites,
      input.audience,
      input.icp,
      input.conversion,
      input.constraints,
      input.channels,
      input.answers,
      input.intake,
      input.intakeAnswers,
      job.prompt
    ]).join('\n');
    const urls = workflowExtractSourceUrls(rawText, 8);
    const product = workflowHandoffClip(
      input.product || input.productName || input.product_name || input.service || input.serviceName || urls[0] || '',
      360
    );
    const audience = workflowHandoffClip(input.audience || input.icp || input.targetAudience || '', 360);
    const conversion = workflowHandoffClip(input.conversion || input.goal || input.primaryConversion || '', 300);
    const constraints = workflowHandoffClip(input.constraints || input.budget || input.channels || '', 500);
    return {
      rawRequest: workflowHandoffBlockClip(rawText, 5000),
      sourceUrls: urls,
      product,
      audience,
      conversion,
      constraints
    };
  }
  
  function workflowCanonicalBriefPromptLines(job = {}, workflow = {}, handoff = {}) {
    const canonical = (handoff.canonicalBrief && typeof handoff.canonicalBrief === 'object')
      ? handoff.canonicalBrief
      : workflowCanonicalBriefFromJob(job, workflow, handoff);
    const lines = [
      'CANONICAL USER BRIEF (source of truth; preserve these facts over templates or prior examples):',
      canonical.rawRequest ? `Original user request and intake:\n${workflowHandoffBlockClip(canonical.rawRequest, 5000)}` : '',
      Array.isArray(canonical.sourceUrls) && canonical.sourceUrls.length
        ? `Source/target URLs from user input: ${canonical.sourceUrls.join(' | ')}`
        : 'Source/target URLs from user input: none detected; do not invent or truncate URLs.',
      canonical.product ? `Product/service from user input: ${workflowHandoffClip(canonical.product, 360)}` : '',
      canonical.audience ? `Audience/ICP from user input: ${workflowHandoffClip(canonical.audience, 360)}` : '',
      canonical.conversion ? `Conversion goal from user input: ${workflowHandoffClip(canonical.conversion, 300)}` : '',
      canonical.constraints ? `Constraints/channels/budget from user input: ${workflowHandoffClip(canonical.constraints, 500)}` : '',
      'Rules: do not replace the target with CAIt/AIagent2 unless the canonical brief explicitly names it as the product; do not shorten domains into broken URLs; if a URL or target is missing, state the missing context instead of fabricating.'
    ].filter(Boolean);
    return lines;
  }
  
  function workflowDigestPushUnique(list = [], value = '', max = 260) {
    const text = workflowHandoffClip(value, max);
    if (!text) return;
    const key = text.toLowerCase();
    if (list.some((item) => String(item || '').toLowerCase() === key)) return;
    list.push(text);
  }
  
  function workflowDigestLinesFromText(text = '', options = {}) {
    const maxItems = Math.max(1, Math.min(24, Number(options.maxItems || 8) || 8));
    const maxLen = Math.max(80, Math.min(500, Number(options.maxLen || 240) || 240));
    const source = String(text || '')
      .replace(/```[\s\S]*?```/g, (block) => block.slice(0, 1200))
      .split(/\n+/)
      .map((line) => line
        .replace(/^\s{0,3}#{1,6}\s*/, '')
        .replace(/^\s*[-*]\s+/, '')
        .replace(/^\s*\d+[.)]\s+/, '')
        .replace(/\s+/g, ' ')
        .trim())
      .filter((line) => line && line.length >= 12 && !/^[-|:]+$/.test(line))
      .filter((line) => !/^(field|item|value|source|url|status|summary)$/i.test(line));
    const picked = [];
    for (const line of source) {
      workflowDigestPushUnique(picked, line, maxLen);
      if (picked.length >= maxItems) break;
    }
    return picked;
  }
  
  function workflowDigestClassifyLines(text = '') {
    const lines = workflowDigestLinesFromText(text, { maxItems: 36, maxLen: 280 });
    const classified = {
      facts: [],
      decisions: [],
      artifacts: [],
      blockers: []
    };
    for (const line of lines) {
      if (/(blocked|missing|required|approval|approve|connector|authority|source_required|not connected|未接続|承認|必要|不足|ブロック|確認待ち)/i.test(line)) {
        workflowDigestPushUnique(classified.blockers, line, 260);
        continue;
      }
      if (/(exact_copy|post text|subject|body|h1|hero|cta|utm_|url|field map|company_name|contact_source_url|draft|packet|copy|headline|投稿|件名|本文|コピー|見出し|実行パケット|承認packet|掲載文)/i.test(line)) {
        workflowDigestPushUnique(classified.artifacts, line, 260);
        continue;
      }
      if (/(answer first|先に結論|recommend|recommendation|chosen|priority|prioritize|decision|next action|stop rule|metric|推奨|優先|判断|結論|次に|停止条件|指標)/i.test(line)) {
        workflowDigestPushUnique(classified.decisions, line, 260);
        continue;
      }
      workflowDigestPushUnique(classified.facts, line, 240);
    }
    return classified;
  }
  
  function workflowResearchHandoffFromReport(report = {}) {
    const findings = report?.research_findings && typeof report.research_findings === 'object'
      ? report.research_findings
      : (report?.researchFindings && typeof report.researchFindings === 'object' ? report.researchFindings : {});
    const downstream = report?.downstream_handoff && typeof report.downstream_handoff === 'object'
      ? report.downstream_handoff
      : (report?.downstreamHandoff && typeof report.downstreamHandoff === 'object'
        ? report.downstreamHandoff
        : (findings.downstream_handoff && typeof findings.downstream_handoff === 'object'
          ? findings.downstream_handoff
          : (findings.downstreamHandoff && typeof findings.downstreamHandoff === 'object' ? findings.downstreamHandoff : {})));
    const channelRequirements = downstream.channel_requirements && typeof downstream.channel_requirements === 'object'
      ? downstream.channel_requirements
      : (downstream.channelRequirements && typeof downstream.channelRequirements === 'object'
        ? downstream.channelRequirements
        : (findings.channel_requirements && typeof findings.channel_requirements === 'object'
          ? findings.channel_requirements
          : (findings.channelRequirements && typeof findings.channelRequirements === 'object' ? findings.channelRequirements : {})));
    const evidenceGaps = Array.isArray(report.evidence_gaps)
      ? report.evidence_gaps
      : (Array.isArray(report.evidenceGaps)
        ? report.evidenceGaps
        : (Array.isArray(findings.evidence_gaps)
          ? findings.evidence_gaps
          : (Array.isArray(findings.evidenceGaps)
            ? findings.evidenceGaps
            : (Array.isArray(downstream.evidence_gaps) ? downstream.evidence_gaps : (Array.isArray(downstream.evidenceGaps) ? downstream.evidenceGaps : [])))));
    const sourceStatus = downstream.source_status && typeof downstream.source_status === 'object'
      ? downstream.source_status
      : (downstream.sourceStatus && typeof downstream.sourceStatus === 'object' ? downstream.sourceStatus : null);
    const approvalBoundary = downstream.approval_boundary && typeof downstream.approval_boundary === 'object'
      ? downstream.approval_boundary
      : (downstream.approvalBoundary && typeof downstream.approvalBoundary === 'object' ? downstream.approvalBoundary : null);
    const requirements = [];
    for (const [channel, raw] of Object.entries(channelRequirements || {})) {
      const item = raw && typeof raw === 'object' ? raw : { use: raw };
      const pieces = [
        item.use,
        item.evidence_rule || item.evidenceRule,
        item.avoid ? `avoid: ${item.avoid}` : '',
        Array.isArray(item.required_artifacts) ? `return: ${item.required_artifacts.join(', ')}` : '',
        Array.isArray(item.requiredArtifacts) ? `return: ${item.requiredArtifacts.join(', ')}` : ''
      ].map((value) => workflowHandoffClip(value, 260)).filter(Boolean);
      if (pieces.length) workflowDigestPushUnique(requirements, `${channel}: ${pieces.join(' / ')}`, 420);
    }
    const gaps = [];
    for (const gap of evidenceGaps) {
      if (!gap || typeof gap !== 'object') continue;
      workflowDigestPushUnique(gaps, [
        gap.id,
        gap.severity ? `(${gap.severity})` : '',
        gap.gap,
        gap.next_check || gap.nextCheck ? `next: ${gap.next_check || gap.nextCheck}` : ''
      ].filter(Boolean).join(' '), 360);
    }
    const sourceStatusText = sourceStatus
      ? [
          sourceStatus.provider ? `provider=${sourceStatus.provider}` : '',
          Number.isFinite(Number(sourceStatus.source_count)) ? `sources=${Number(sourceStatus.source_count)}` : '',
          Number.isFinite(Number(sourceStatus.fetched_page_count)) ? `fetched_pages=${Number(sourceStatus.fetched_page_count)}` : '',
          Array.isArray(sourceStatus.domains) && sourceStatus.domains.length ? `domains=${sourceStatus.domains.slice(0, 6).join(',')}` : '',
          Array.isArray(sourceStatus.limitations) && sourceStatus.limitations.length ? `limitations=${sourceStatus.limitations.slice(0, 3).join(' / ')}` : ''
        ].filter(Boolean).join('; ')
      : '';
    const approvalText = approvalBoundary
      ? [
          approvalBoundary.use,
          approvalBoundary.approval_required === true ? 'approval_required=true' : '',
          approvalBoundary.approvalRequired === true ? 'approval_required=true' : ''
        ].filter(Boolean).join(' / ')
      : '';
    if (!requirements.length && !gaps.length && !sourceStatusText && !approvalText) return null;
    return {
      sourceStatus: workflowHandoffClip(sourceStatusText, 420),
      channelRequirements: requirements.slice(0, 8),
      evidenceGaps: gaps.slice(0, 6),
      approvalBoundary: workflowHandoffClip(approvalText, 360)
    };
  }
  
  function workflowStructuredHandoffDigestFromRun(run = {}) {
    const files = Array.isArray(run.files) ? run.files : [];
    const fileText = files
      .map((file) => typeof file === 'string' ? '' : String(file?.content || ''))
      .filter(Boolean)
      .join('\n\n');
    const combinedText = [
      run.summary,
      run.reportSummary,
      Array.isArray(run.bullets) ? run.bullets.join('\n') : '',
      run.nextAction,
      run.next_action,
      run.deliverableMarkdown,
      fileText
    ].map((item) => String(item || '').trim()).filter(Boolean).join('\n\n');
    const classified = workflowDigestClassifyLines(combinedText);
    const sources = [];
    for (const source of Array.isArray(run.webSources) ? run.webSources : []) {
      const url = workflowHandoffClip(source?.url || source?.link || source?.query || '', 220);
      const title = workflowHandoffClip(source?.title || source?.name || '', 140);
      const snippet = workflowHandoffClip(source?.snippet || source?.description || source?.summary || '', 180);
      workflowDigestPushUnique(sources, [title, url, snippet].filter(Boolean).join(' | '), 360);
    }
    for (const file of files) {
      const content = typeof file === 'string' ? '' : String(file?.content || '');
      for (const url of workflowExtractSourceUrls(content, 4)) workflowDigestPushUnique(sources, url, 220);
    }
    const nextInputs = [];
    for (const signal of Array.isArray(run.requiredUsageSignals) ? run.requiredUsageSignals : []) {
      workflowDigestPushUnique(nextInputs, signal, 220);
    }
    workflowDigestPushUnique(nextInputs, run.nextAction || run.next_action || '', 360);
    const researchHandoff = run.structuredResearchHandoff && typeof run.structuredResearchHandoff === 'object'
      ? run.structuredResearchHandoff
      : null;
    return {
      taskType: String(run.taskType || run.workflowTask || '').trim(),
      status: String(run.status || 'completed').trim(),
      phase: String(run.sequencePhase || run.phase || run.workflowPhase || '').trim(),
      summary: workflowHandoffClip(run.summary || run.reportSummary || '', 500),
      facts: classified.facts.slice(0, 5),
      sources: sources.slice(0, 6),
      decisions: classified.decisions.slice(0, 5),
      artifacts: classified.artifacts.slice(0, 6),
      blockers: classified.blockers.slice(0, 5),
      nextInputs: nextInputs.filter(Boolean).slice(0, 5),
      sourceStatus: researchHandoff?.sourceStatus || '',
      channelRequirements: Array.isArray(researchHandoff?.channelRequirements) ? researchHandoff.channelRequirements.slice(0, 8) : [],
      evidenceGaps: Array.isArray(researchHandoff?.evidenceGaps) ? researchHandoff.evidenceGaps.slice(0, 6) : [],
      approvalBoundary: researchHandoff?.approvalBoundary || ''
    };
  }
  
  function workflowStructuredDigestPromptLines(run = {}, index = 0) {
    const looksLikeDigest = run && typeof run === 'object' && (
      Array.isArray(run.facts)
      || Array.isArray(run.sources)
      || Array.isArray(run.decisions)
      || Array.isArray(run.artifacts)
      || Array.isArray(run.blockers)
      || Array.isArray(run.nextInputs)
    );
    const digest = (run.structuredDigest && typeof run.structuredDigest === 'object')
      ? run.structuredDigest
      : looksLikeDigest
        ? run
        : workflowStructuredHandoffDigestFromRun(run);
    const task = workflowHandoffClip(digest.taskType || run.taskType || run.workflowTask || `prior_${index + 1}`, 90);
    const phase = workflowHandoffClip(digest.phase || run.sequencePhase || '', 50);
    const status = workflowHandoffClip(digest.status || run.status || 'completed', 40);
    const itemLines = [];
    const pushList = (label, values = []) => {
      const list = Array.isArray(values) ? values.map((item) => workflowHandoffClip(item, 260)).filter(Boolean).slice(0, 5) : [];
      if (list.length) itemLines.push(`   ${label}: ${list.join(' / ')}`);
    };
    itemLines.push(`${index + 1}. ${task}${phase ? ` / ${phase}` : ''} (${status})`);
    if (digest.summary) itemLines.push(`   Summary: ${workflowHandoffClip(digest.summary, 500)}`);
    pushList('Facts', digest.facts);
    pushList('Sources', digest.sources);
    pushList('Decisions', digest.decisions);
    pushList('Artifacts', digest.artifacts);
    pushList('Blockers', digest.blockers);
    pushList('Next inputs', digest.nextInputs);
    pushList('Channel requirements', digest.channelRequirements);
    pushList('Evidence gaps', digest.evidenceGaps);
    if (digest.sourceStatus) itemLines.push(`   Source status: ${workflowHandoffClip(digest.sourceStatus, 360)}`);
    if (digest.approvalBoundary) itemLines.push(`   Approval boundary: ${workflowHandoffClip(digest.approvalBoundary, 320)}`);
    return itemLines.join('\n');
  }
  
  function workflowStructuredDigestPromptBlock(priorRuns = []) {
    const runs = Array.isArray(priorRuns)
      ? priorRuns.filter((run) => run && typeof run === 'object').slice(0, 10)
      : [];
    if (!runs.length) return '';
    return [
      'SUPPORTING FACT INDEX (internal aid; do not copy these labels into the user delivery):',
      ...runs.map((run, index) => workflowStructuredDigestPromptLines(run, index))
    ].filter(Boolean).join('\n');
  }
  
  function workflowHandoffPromptDataFromRun(run = {}, index = 0, options = {}) {
    const task = workflowHandoffClip(run.taskType || run.workflowTask || `prior_${index + 1}`, 90);
    const status = workflowHandoffClip(run.status || 'completed', 40);
    const lines = [`${index + 1}. USER-FACING PRIOR DELIVERABLE: ${task} (${status})`];
    const structuredDigest = workflowStructuredDigestPromptLines(run, index);
    if (structuredDigest) lines.push(`   Supporting fact index (internal aid; do not copy labels):\n${structuredDigest}`);
    const jobId = workflowHandoffClip(run.jobId || '', 120);
    if (jobId) lines.push(`   Job ID: ${jobId}`);
    const summary = workflowHandoffClip(run.summary || run.reportSummary || '', 360);
    if (summary) lines.push(`   Summary: ${summary}`);
    const sources = Array.isArray(run.webSources)
      ? run.webSources
        .map((source) => ({
          title: workflowHandoffClip(source?.title || source?.name || '', 130),
          url: workflowHandoffClip(source?.url || source?.link || source?.query || '', 220),
          snippet: workflowHandoffClip(source?.snippet || source?.description || source?.summary || '', 260)
        }))
        .filter((source) => source.title || source.url || source.snippet)
        .slice(0, 8)
      : [];
    for (const source of sources) {
      lines.push(`   Source: ${[source.title, source.url, source.snippet].filter(Boolean).join(' | ')}`);
    }
    const requiredSignals = Array.isArray(run.requiredUsageSignals)
      ? run.requiredUsageSignals.map((item) => workflowHandoffClip(item, 180)).filter(Boolean).slice(0, 6)
      : workflowHandoffOriginalSignals([run]).map((item) => workflowHandoffClip(item, 180)).filter(Boolean).slice(0, 6);
    if (requiredSignals.length) {
      lines.push(`   Required usage signals: ${requiredSignals.join(' / ')}`);
    }
    const nextAction = workflowHandoffClip(run.nextAction || run.next_action || '', 420);
    if (nextAction) lines.push(`   Next action: ${nextAction}`);
    const files = Array.isArray(run.files)
      ? run.files
        .map((file) => {
          if (typeof file === 'string') return { name: workflowHandoffClip(file, 120), content_available: false };
          return {
            name: workflowHandoffClip(file?.name || 'delivery.md', 120),
            content_available: file?.content_available === true || Boolean(String(file?.content || '').trim())
          };
        })
        .filter((file) => file.name)
        .slice(0, 2)
      : [];
    for (const file of files) {
      lines.push(`   File reference: ${file.name || 'delivery.md'}${file.content_available ? ' (content kept in parent delivery bundle, not injected into this downstream prompt)' : ''}`);
    }
    const deliverableMarkdownExcerpt = options.includeMarkdownExcerpt === true
      ? workflowHandoffBlockClip(run.deliverableMarkdownExcerpt || run.deliverableMarkdown || '', 1600)
      : '';
    if (deliverableMarkdownExcerpt) {
      lines.push(`   User-facing prior Markdown to reuse as source material:\n\`\`\`markdown\n${deliverableMarkdownExcerpt}\n\`\`\``);
    }
    return lines.join('\n');
  }
  
  function workflowHandoffOriginalSignals(priorRuns = []) {
    const signals = [];
    const seen = new Set();
    const push = (value = '') => {
      const text = String(value || '').trim();
      if (!text) return;
      const normalized = text.toLowerCase();
      if (seen.has(normalized)) return;
      seen.add(normalized);
      signals.push(text);
    };
    for (const run of Array.isArray(priorRuns) ? priorRuns : []) {
      const webSources = Array.isArray(run?.webSources) ? run.webSources : [];
      for (const signal of workflowSourceSignalStrings(webSources)) push(signal);
      const structuredDigest = run?.structuredDigest && typeof run.structuredDigest === 'object'
        ? run.structuredDigest
        : workflowStructuredHandoffDigestFromRun(run || {});
      for (const source of Array.isArray(structuredDigest?.sources) ? structuredDigest.sources.slice(0, 4) : []) push(String(source || '').slice(0, 180));
      for (const fact of Array.isArray(structuredDigest?.facts) ? structuredDigest.facts.slice(0, 3) : []) push(String(fact || '').slice(0, 160));
      for (const decision of Array.isArray(structuredDigest?.decisions) ? structuredDigest.decisions.slice(0, 2) : []) push(String(decision || '').slice(0, 160));
      for (const artifact of Array.isArray(structuredDigest?.artifacts) ? structuredDigest.artifacts.slice(0, 2) : []) push(String(artifact || '').slice(0, 160));
      for (const requirement of Array.isArray(structuredDigest?.channelRequirements) ? structuredDigest.channelRequirements.slice(0, 4) : []) push(String(requirement || '').slice(0, 200));
      for (const gap of Array.isArray(structuredDigest?.evidenceGaps) ? structuredDigest.evidenceGaps.slice(0, 3) : []) push(String(gap || '').slice(0, 180));
      push(String(structuredDigest?.approvalBoundary || '').slice(0, 180));
      push(String(run?.summary || '').slice(0, 160));
      for (const bullet of Array.isArray(run?.bullets) ? run.bullets.slice(0, 3) : []) push(String(bullet || '').slice(0, 120));
    }
    return signals.slice(0, 24);
  }
  
  function workflowAppContextOriginalSignals(job = {}) {
    const broker = job?.input?._broker && typeof job.input._broker === 'object' ? job.input._broker : {};
    const appContexts = Array.isArray(broker.appContexts) ? broker.appContexts : [];
    const signals = [];
    const seen = new Set();
    const push = (value = '') => {
      const text = String(value || '').trim();
      if (!text) return;
      const normalized = text.toLowerCase();
      if (seen.has(normalized)) return;
      seen.add(normalized);
      signals.push(text);
    };
    for (const context of appContexts.slice(0, 4)) {
      push(context.title);
      push(context.summary);
      for (const fact of Array.isArray(context.facts) ? context.facts.slice(0, 12) : []) push(fact);
      for (const metric of Array.isArray(context.metrics) ? context.metrics.slice(0, 8) : []) {
        if (typeof metric === 'string') push(metric);
        else if (metric && typeof metric === 'object') push([metric.label || metric.name, metric.value].filter(Boolean).join(': '));
      }
    }
    return signals.slice(0, 24);
  }
  
  function workflowTextUsesSignals(text = '', signals = []) {
    const normalizedText = String(text || '').toLowerCase();
    const matches = [];
    for (const signal of Array.isArray(signals) ? signals : []) {
      const normalizedSignal = String(signal || '').trim().toLowerCase();
      if (!normalizedSignal || normalizedSignal.length < 6) continue;
      if (normalizedText.includes(normalizedSignal)) matches.push(signal);
    }
    return {
      used: matches.length > 0,
      matches: matches.slice(0, 8)
    };
  }
  
  function workflowResearchHandoffRuns(priorRuns = []) {
    return (Array.isArray(priorRuns) ? priorRuns : []).filter((run) => {
      const task = String(run?.taskType || run?.workflowTask || '').toLowerCase();
      const phase = String(run?.sequencePhase || run?.phase || run?.workflowPhase || '').toLowerCase();
      const hasSearchSources = Array.isArray(run?.webSources) && run.webSources.length > 0;
      return phase === 'research'
        || hasSearchSources
        || ['research', 'teardown', 'competitor_teardown', 'data_analysis', 'list_creator', 'validation', 'diligence'].includes(task);
    });
  }
  
  function workflowExecutionNeedsMultipleInputs(phase = '') {
    return ['preparation', 'action', 'implementation'].includes(String(phase || '').toLowerCase());
  }
  
  function workflowCreativeOrActionArtifactPresent(text = '') {
    return /(post draft|exact post|subject line|email body|headline|hero|cta|copy|page structure|listing copy|message sequence|reply hooks|payload|action packet|approval packet|field map|status tracker|checklist|draft|publish|send|submit|creative|artifact|投稿案|本文|コピー|件名|見出し|実行パケット|承認パケット|送信|投稿|掲載|提出|チェックリスト)/i
      .test(String(text || ''));
  }

  return {
    workflowSourceSignalStrings,
    workflowMinimumPriorUseForPhase,
    workflowHandoffPriorDeliverables,
    workflowSlimPriorRunForHandoff,
    workflowExecutionProgram,
    workflowOutputText,
    workflowOutputTextForQuality,
    workflowHandoffClip,
    workflowHandoffBlockClip,
    workflowFlattenTextParts,
    workflowNormalizeCandidateUrl,
    workflowExtractSourceUrls,
    workflowCanonicalBriefFromJob,
    workflowCanonicalBriefPromptLines,
    workflowDigestPushUnique,
    workflowDigestLinesFromText,
    workflowDigestClassifyLines,
    workflowResearchHandoffFromReport,
    workflowStructuredHandoffDigestFromRun,
    workflowStructuredDigestPromptLines,
    workflowStructuredDigestPromptBlock,
    workflowHandoffPromptDataFromRun,
    workflowHandoffOriginalSignals,
    workflowAppContextOriginalSignals,
    workflowTextUsesSignals,
    workflowResearchHandoffRuns,
    workflowExecutionNeedsMultipleInputs,
    workflowCreativeOrActionArtifactPresent
  };
}
