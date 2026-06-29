import {
  deliveryPublishActionDescriptors,
  deliveryPublishSectionDescriptors,
  deliveryPublishFieldDescriptors,
  deliveryUiText
} from './delivery-action-contract.js';

export function createClientDeliveryPublishController(deps = {}) {
  const {
    api,
    applyDeliveryExecutionSuccess,
    bindDescriptorActions,
    bindDescriptorFields,
    copyTextToClipboard,
    deliveryExecutorPersistTimers,
    escapeHtml,
    flash,
    isGithubLinked,
    loadOrderDraftIntoComposer,
    loadPersistedDeliveryActionDrafts,
    mergeProgressJobIntoSnapshot,
    persistDeliveryActionDrafts,
    renderRunDelivery,
    selectedJob,
    state,
    switchTab,
    updateCliPanels
  } = deps;

  async function persistDeliveryPublishDraft(jobId = '', immediate = false) {
    const key = String(jobId || '').trim();
    if (!key) return;
    const draft = state.deliveryPublishDrafts?.[key];
    if (!draft || typeof draft !== 'object') return;
    const timerKey = `publish:${key}`;
    const save = async () => {
      deliveryExecutorPersistTimers.delete(timerKey);
      try {
        const result = await api(`/api/jobs/${encodeURIComponent(key)}/executor-state`, {
          method: 'PATCH',
          body: JSON.stringify({
            publishTarget: String(draft.target || '').trim(),
            publishPathPrefix: String(draft.pathPrefix || '').trim(),
            publishSlug: String(draft.slug || '').trim(),
            publishMode: String(draft.publishMode || '').trim()
          })
        });
        if (result?.job) mergeProgressJobIntoSnapshot(result.job);
      } catch {
        // keep local draft; server sync can be retried by later edits or refresh
      }
    };
    const existingTimer = deliveryExecutorPersistTimers.get(timerKey);
    if (existingTimer) window.clearTimeout(existingTimer);
    if (immediate) {
      await save();
      return;
    }
    const timer = window.setTimeout(save, 260);
    deliveryExecutorPersistTimers.set(timerKey, timer);
  }

  function mergePreparedDeliveryPublishSeed(jobId = '', seed = null) {
    const key = String(jobId || '').trim();
    if (!key || !seed || typeof seed !== 'object') return;
    const current = state.deliveryPublishDrafts?.[key] && typeof state.deliveryPublishDrafts[key] === 'object'
      ? state.deliveryPublishDrafts[key]
      : {};
    const defaults = seed.draftDefaults && typeof seed.draftDefaults === 'object' ? seed.draftDefaults : {};
    const merged = { ...current };
    for (const [field, value] of Object.entries(defaults)) {
      const currentValue = merged[field];
      if (currentValue === undefined || currentValue === null || currentValue === '') {
        merged[field] = value;
      }
    }
    state.deliveryPublishDrafts[key] = merged;
    persistDeliveryActionDrafts();
  }

  async function prepareDeliveryPublishSeed(run = null, article = null) {
    const key = String(run?.id || '').trim();
    if (!key || !article?.content) return null;
    const existing = state.deliveryPublishSeeds?.[key];
    if (existing?.status === 'done') return existing;
    if (existing?.status === 'pending') return null;
    state.deliveryPublishSeeds[key] = { status: 'pending' };
    try {
      const payload = await api('/api/deliveries/prepare-publish', {
        method: 'POST',
        body: JSON.stringify({
          job_id: key,
          title: String(article.title || ''),
          content: String(article.content || ''),
          file_name: String(article.fileName || ''),
          suggested_slug: String(article.suggestedSlug || '')
        })
      });
      const seed = {
        status: 'done',
        draftDefaults: payload?.draft_defaults && typeof payload.draft_defaults === 'object' ? payload.draft_defaults : {},
        fieldDescriptors: Array.isArray(payload?.field_descriptors) ? payload.field_descriptors : [],
        actionDescriptors: Array.isArray(payload?.action_descriptors) ? payload.action_descriptors : [],
        suggestedPrimaryAction: String(payload?.suggested_primary_action || '').trim(),
        githubReady: Boolean(payload?.github_ready)
      };
      state.deliveryPublishSeeds[key] = seed;
      mergePreparedDeliveryPublishSeed(key, seed);
      if (state.selectedJobId === key) renderRunDelivery(selectedJob());
      return seed;
    } catch (error) {
      state.deliveryPublishSeeds[key] = { status: 'error', error: String(error?.message || error) };
      return null;
    }
  }

  function defaultDeliveryPublishDraft(article = null) {
    return {
      target: state.snapshot?.auth && isGithubLinked(state.snapshot.auth) ? 'github_repo' : 'local_terminal',
      pathPrefix: '/blog',
      slug: article?.suggestedSlug || '',
      publishMode: 'draft_pr'
    };
  }

  function deliveryPublishDraftForJob(job = {}, article = null) {
    const key = String(job?.id || '');
    loadPersistedDeliveryActionDrafts();
    const existing = state.deliveryPublishDrafts?.[key];
    if (existing) return existing;
    const persisted = job?.executorState && typeof job.executorState === 'object' ? job.executorState : null;
    const draft = {
      ...defaultDeliveryPublishDraft(article),
      ...(persisted ? {
        target: String(persisted.publishTarget || '').trim() || undefined,
        pathPrefix: String(persisted.publishPathPrefix || '').trim() || undefined,
        slug: String(persisted.publishSlug || '').trim() || undefined,
        publishMode: String(persisted.publishMode || '').trim() || undefined
      } : {})
    };
    state.deliveryPublishDrafts[key] = draft;
    persistDeliveryActionDrafts();
    return draft;
  }

  function updateDeliveryPublishDraft(jobId = '', patch = {}) {
    const key = String(jobId || '').trim();
    if (!key) return;
    loadPersistedDeliveryActionDrafts();
    const current = state.deliveryPublishDrafts?.[key] && typeof state.deliveryPublishDrafts[key] === 'object'
      ? state.deliveryPublishDrafts[key]
      : defaultDeliveryPublishDraft(null);
    state.deliveryPublishDrafts[key] = { ...current, ...patch };
    persistDeliveryActionDrafts();
    void persistDeliveryPublishDraft(key, false);
  }

  function deliveryPublishUrlPath(draft = {}) {
    const prefix = `/${String(draft?.pathPrefix || '/blog').trim().replace(/^\/+|\/+$/g, '')}`.replace(/\/{2,}/g, '/');
    const slug = String(draft?.slug || '').trim().replace(/^\/+|\/+$/g, '');
    return slug ? `${prefix}/${slug}`.replace(/\/{2,}/g, '/') : prefix;
  }

  function deliveryPublishContext(job = null, article = null) {
    const seed = state.deliveryPublishSeeds?.[String(job?.id || '').trim()] || null;
    const draft = deliveryPublishDraftForJob(job || {}, article);
    const githubReady = seed?.status === 'done' ? Boolean(seed.githubReady) : isGithubLinked(state.snapshot?.auth || {});
    const fieldDescriptors = Array.isArray(seed?.fieldDescriptors) && seed.fieldDescriptors.length
      ? seed.fieldDescriptors
      : deliveryPublishFieldDescriptors(draft, article);
    const actionDescriptors = Array.isArray(seed?.actionDescriptors) && seed.actionDescriptors.length
      ? seed.actionDescriptors
      : deliveryPublishActionDescriptors(draft, { githubReady });
    return {
      draft,
      seed,
      githubReady,
      fieldDescriptors,
      actionDescriptors,
      pathPreview: deliveryPublishUrlPath(draft)
    };
  }

  function updateDeliveryPublishPreview(root = null, run = null, article = null) {
    const preview = root?.querySelector('.delivery-publish-card .publish-preview-box');
    if (!preview) return;
    preview.textContent = `Planned URL path: ${deliveryPublishContext(run, article).pathPreview}`;
  }

  function deliveryPublishFieldBinding(run = null, article = null, value = null, root = null, fieldKey = '') {
    const key = String(fieldKey || '').trim();
    if (key === 'target') {
      return {
        event: 'change',
        handler: (input) => {
          updateDeliveryPublishDraft(run.id, { target: String(input.value || 'github_repo') });
          renderRunDelivery(value);
        }
      };
    }
    if (key === 'pathPrefix') {
      return {
        event: 'input',
        handler: (input) => {
          updateDeliveryPublishDraft(run.id, { pathPrefix: String(input.value || '/blog') });
          updateDeliveryPublishPreview(root, run, article);
        }
      };
    }
    if (key === 'slug') {
      return {
        event: 'input',
        handler: (input) => {
          updateDeliveryPublishDraft(run.id, { slug: String(input.value || '') });
          updateDeliveryPublishPreview(root, run, article);
        }
      };
    }
    if (key === 'publishMode') {
      return {
        event: 'change',
        handler: (input) => {
          updateDeliveryPublishDraft(run.id, { publishMode: String(input.value || 'draft_pr') });
        }
      };
    }
    return null;
  }

  function copyArticleCandidate(article = null, options = {}) {
    if (!article?.content) throw new Error('No article content to copy.');
    return copyTextToClipboard(String(article.content || ''), options.silent ? '' : 'Article copied.');
  }

  function applyPublishActionSuccess(run = null, article = null, draft = {}, actionKind = '', payload = {}) {
    applyDeliveryExecutionSuccess(run, article, draft, { kind: String(actionKind || '').trim() }, payload, {
      chatTitle: String(article?.title || 'Article draft')
    });
  }

  async function preparePublishOrderFromDelivery(job = null, article = null) {
    if (!job?.id) throw new Error('Select a completed delivery first.');
    if (!article?.content) throw new Error('No article draft detected in this delivery.');
    const { draft } = deliveryPublishContext(job, article);
    const prepared = await api('/api/deliveries/prepare-publish-order', {
      method: 'POST',
      body: JSON.stringify({
        job_id: String(job.id || ''),
        title: String(article.title || ''),
        content: String(article.content || ''),
        file_name: String(article.fileName || ''),
        draft
      })
    });
    loadOrderDraftIntoComposer({
      followupToJobId: String(prepared?.followup_to_job_id || job.id || ''),
      taskType: String(prepared?.task_type || job.taskType || 'writing'),
      agentId: String(prepared?.agent_id || ''),
      prompt: String(prepared?.prompt || '').trim(),
      budgetCap: Number(job?.budgetCap ?? 300),
      deadlineSec: Number(job?.deadlineSec ?? 120),
      orderStrategy: String(prepared?.order_strategy || 'auto')
    });
    return prepared;
  }

  function deliveryPublishActionHandler(run = null, article = null, actionKind = '') {
    const normalizedActionKind = String(actionKind || '').trim();
    if (normalizedActionKind === 'copy_article') {
      return async () => {
        const publishContext = deliveryPublishContext(run, article);
        await copyArticleCandidate(article, { silent: true });
        applyPublishActionSuccess(run, article, publishContext.draft, normalizedActionKind, {
          ok: true,
          action_kind: normalizedActionKind,
          outcome_kind: 'local_copy',
          message: 'Article copied.'
        });
      };
    }
    if (normalizedActionKind === 'prepare_publish_order') {
      return async () => {
        const publishContext = deliveryPublishContext(run, article);
        const prepared = await preparePublishOrderFromDelivery(run, article);
        applyPublishActionSuccess(run, article, publishContext.draft, normalizedActionKind, {
          ok: true,
          action_kind: normalizedActionKind,
          outcome_kind: 'prepared_order',
          message: `Publish draft prepared for ${String(prepared?.path_preview || '').trim()}. Review it, then SEND ORDER when ready.`,
          entity: {
            path_preview: String(prepared?.path_preview || '').trim()
          }
        });
      };
    }
    if (normalizedActionKind === 'open_cli_help') {
      return () => {
        const publishContext = deliveryPublishContext(run, article);
        switchTab('connect');
        updateCliPanels(state.snapshot);
        applyPublishActionSuccess(run, article, publishContext.draft, normalizedActionKind, {
          ok: true,
          action_kind: normalizedActionKind,
          outcome_kind: 'local_open',
          message: 'Open CLI help for local terminal handoff details.'
        });
      };
    }
    return null;
  }

  function bindDeliveryPublishControls(root = null, run = null, article = null, value = null) {
    if (!root || !run?.id || !article?.content) return;
    const publishContext = deliveryPublishContext(run, article);
    bindDescriptorFields(root, publishContext.fieldDescriptors, (key) => deliveryPublishFieldBinding(run, article, value, root, key));
    bindDescriptorActions(root, publishContext.actionDescriptors, (kind) => deliveryPublishActionHandler(run, article, kind));
  }

  function renderDeliveryPublishField(run = null, draft = {}, field = {}) {
    const dataAttr = String(field?.dataAttr || '').trim();
    const label = String(field?.label || field?.key || '').trim();
    const key = String(field?.key || '').trim();
    const value = String(draft?.[key] || field?.fallbackValue || '');
    if (field.type === 'select') {
      const options = (Array.isArray(field.options) ? field.options : []).map((option) => {
        const optionValue = String(option?.value || '').trim();
        const optionLabel = String(option?.label || optionValue).trim();
        return `<option value="${escapeHtml(optionValue)}"${value === optionValue ? ' selected' : ''}>${escapeHtml(optionLabel)}</option>`;
      }).join('');
      return `
        <label class="form-field">
          <span class="field-label">${escapeHtml(label)}</span>
          <select ${escapeHtml(dataAttr)}="${escapeHtml(run.id)}">
            ${options}
          </select>
        </label>
      `;
    }
    return `
      <label class="form-field">
        <span class="field-label">${escapeHtml(label)}</span>
        <input ${escapeHtml(dataAttr)}="${escapeHtml(run.id)}" value="${escapeHtml(value)}" placeholder="${escapeHtml(String(field?.placeholder || ''))}" />
      </label>
    `;
  }

  function renderDeliveryPublishFields(run = null, draft = {}, article = null) {
    const { fieldDescriptors } = deliveryPublishContext(run, article);
    return fieldDescriptors
      .map((field) => renderDeliveryPublishField(run, draft, field))
      .join('');
  }

  function renderPublishMetaLine(title = '', secondary = '') {
    return `<div class="publish-meta-line"><strong>${escapeHtml(title || 'Article draft')}</strong><span>${escapeHtml(secondary || '-')}</span></div>`;
  }

  function renderPublishPreviewBox(pathPreview = '') {
    return `<div class="detail-box compact-card publish-preview-box">Planned URL path: ${escapeHtml(String(pathPreview || '').trim())}</div>`;
  }

  function renderActionDescriptorButtons(descriptors = [], fallbackValue = '') {
    const actions = Array.isArray(descriptors) ? descriptors : [];
    if (!actions.length) return '';
    return actions.map((action) => {
      const dataAttr = String(action?.dataAttr || '').trim();
      const dataValue = String(action?.dataValue || fallbackValue || '').trim();
      return `<button class="mini-btn" ${escapeHtml(dataAttr)}="${escapeHtml(dataValue)}">${escapeHtml(String(action?.label || 'ACTION'))}</button>`;
    }).join('');
  }

  function renderDeliveryPublishSection(section = {}, context = {}) {
    const kind = String(section?.kind || '').trim();
    if (!kind) return '';
    if (kind === 'intro') {
      return [
        `<div class="field-label">${escapeHtml(deliveryUiText('articleDetectedLabel'))}</div>`,
        `<div class="muted">${escapeHtml(deliveryUiText('articleDetectedDescription'))}</div>`
      ].join('');
    }
    if (kind === 'meta') {
      return renderPublishMetaLine(context.article?.title || 'Article draft', context.article?.fileName || '-');
    }
    if (kind === 'fields') {
      return `<div class="publish-grid">${renderDeliveryPublishFields(context.run, context.draft, context.article)}</div>`;
    }
    if (kind === 'preview') {
      return renderPublishPreviewBox(context.pathPreview);
    }
    if (kind === 'actions') {
      return `<div class="helper-row">${renderActionDescriptorButtons(context.actionDescriptors, context.run?.id || '')}</div>`;
    }
    return '';
  }

  function renderDeliveryPublishCard(run = null, article = null) {
    if (!run?.id || !article?.content) return '';
    const seed = state.deliveryPublishSeeds?.[String(run.id || '').trim()] || null;
    if (!seed || seed.status === 'error') {
      void prepareDeliveryPublishSeed(run, article);
    }
    const context = { run, article, ...deliveryPublishContext(run, article) };
    const sections = deliveryPublishSectionDescriptors(context)
      .map((section) => renderDeliveryPublishSection(section, context))
      .filter(Boolean)
      .join('');
    return `
      <div class="detail-box action-card info compact-card delivery-publish-card">
        ${sections}
      </div>
    `;
  }

  return {
    bindDeliveryPublishControls,
    deliveryPublishContext,
    deliveryPublishDraftForJob,
    deliveryPublishUrlPath,
    prepareDeliveryPublishSeed,
    preparePublishOrderFromDelivery,
    renderDeliveryPublishCard,
    updateDeliveryPublishDraft
  };
}
