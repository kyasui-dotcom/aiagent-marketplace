export function createClientDeliveryGenericRenderer(deps = {}) {
  const {
    connectorActionForChat,
    deliveryControlFieldsForType,
    deliveryGoogleSourceFieldDescriptors,
    deliveryGoogleSourceLoadLabel,
    deliveryPrimaryActionDescriptors,
    deliveryUiText,
    escapeHtml,
    authorityOwnerLabelForRun,
    genericDeliverableAuthoritySummary,
    genericDeliverableScheduleLabel,
    genericDeliverableSectionDescriptors,
    repoOptionsDatalist,
    xConnectorIdentityForClient
  } = deps;

  function renderGenericDeliverableControlField(run = null, draft = {}, field = {}, options = {}) {
    if (!field || typeof field !== 'object') return '';
    if (field.kind === 'group' && Array.isArray(field.fields)) {
      const inner = field.fields.map((item) => renderGenericDeliverableControlField(run, draft, item, options)).join('');
      return inner ? `<div class="${escapeHtml(String(field.layout || 'publish-grid'))}">${inner}</div>` : '';
    }
    const label = String(field.label || '').trim();
    const dataAttr = String(field.dataAttr || '').trim();
    const key = String(field.key || '').trim();
    if (!label || !dataAttr || !key) return '';
    const value = draft?.[key];
    const helperText = String(field.helperText || '').trim();
    const placeholder = String(field.placeholder || '').trim();
    const extraHtml = String(field.extraHtml || '');
    if (field.type === 'select') {
      const overrideOptions = options?.optionOverrides && typeof options.optionOverrides === 'object'
        ? options.optionOverrides[key]
        : null;
      const selectOptions = Array.isArray(overrideOptions) && overrideOptions.length
        ? overrideOptions
        : (Array.isArray(field.options) ? field.options : []);
      return `
      <label class="form-field">
        <span class="field-label">${escapeHtml(label)}</span>
        <select ${escapeHtml(dataAttr)}="${escapeHtml(run?.id || '')}">
          ${selectOptions.map((option) => `<option value="${escapeHtml(String(option?.value || ''))}"${String(value || '') === String(option?.value || '') ? ' selected' : ''}>${escapeHtml(String(option?.label || option?.value || ''))}</option>`).join('')}
        </select>
        ${helperText ? `<span class="row-muted">${escapeHtml(helperText)}</span>` : ''}
      </label>
    `;
    }
    if (field.type === 'textarea') {
      return `
      <label class="form-field">
        <span class="field-label">${escapeHtml(label)}</span>
        <textarea rows="${Number(field.rows || 4)}" ${escapeHtml(dataAttr)}="${escapeHtml(run?.id || '')}" placeholder="${escapeHtml(placeholder)}">${escapeHtml(String(value || ''))}</textarea>
        ${helperText ? `<span class="row-muted">${escapeHtml(helperText)}</span>` : ''}
      </label>
    `;
    }
    const inputType = field.type === 'datetime-local' ? 'datetime-local' : 'text';
    const listAttr = field.listId ? ` list="${escapeHtml(String(field.listId || ''))}"` : '';
    return `
    <label class="form-field">
      <span class="field-label">${escapeHtml(label)}</span>
      <input type="${escapeHtml(inputType)}" ${escapeHtml(dataAttr)}="${escapeHtml(run?.id || '')}" value="${escapeHtml(String(value || ''))}" placeholder="${escapeHtml(placeholder)}"${listAttr} />
      ${helperText ? `<span class="row-muted">${escapeHtml(helperText)}</span>` : ''}
      ${extraHtml}
    </label>
  `;
  }

  function renderDeliveryAuthorityCard(run = null, deliverable = null, authority = null) {
    if (!authority) return '';
    const ownerLabel = authorityOwnerLabelForRun(run, deliverable, authority);
    const authorityText = genericDeliverableAuthoritySummary(run, deliverable, authority);
    return `<div class="detail-box compact-card ${authority.resolved ? 'ok' : 'warn'}"><strong>${escapeHtml(`${ownerLabel.toUpperCase()} REQUEST`)}</strong>\n\n${escapeHtml(authorityText)}</div>`;
  }

  function renderGoogleSourceControls(run = null, draft = {}, authority = null, googleSourcePlan = null, googleOptionsByGroup = {}) {
    const authorityReadyToResume = Boolean(authority && authority.resolved);
    const requestedGroups = Array.isArray(googleSourcePlan?.requestedGroups) ? googleSourcePlan.requestedGroups : [];
    if (!requestedGroups.length || !authorityReadyToResume) return '';
    const authorityOwnerLabel = authorityOwnerLabelForRun(run, { type: 'report_bundle' }, authority);
    const fieldDescriptors = deliveryGoogleSourceFieldDescriptors(requestedGroups);
    return `
      <div class="detail-box compact-card info">
        <div class="field-label">${escapeHtml(deliveryUiText('googleSourcesTitle'))}</div>
        <div class="muted">${escapeHtml(`${authorityOwnerLabel} asked for Google data before continuing.`)}</div>
        <div class="muted">${escapeHtml(String(googleSourcePlan?.summary || deliveryUiText('googleSourcesSummaryFallback')))}</div>
        ${draft.googleAssetsError ? `<div class="detail-box compact-card warn">${escapeHtml(String(draft.googleAssetsError || ''))}</div>` : ''}
        ${fieldDescriptors.map((field) => `
          <label class="form-field">
            <span class="field-label">${escapeHtml(field.label)}</span>
            <select data-generic-delivery-${escapeHtml(field.attr)}="${escapeHtml(run.id)}">
              <option value="">${escapeHtml(field.emptyLabel)}</option>
              ${(googleOptionsByGroup[field.group] || []).map((option) => `<option value="${escapeHtml(String(option.value || ''))}"${String(draft?.[field.key] || '') === String(option.value || '') ? ' selected' : ''}>${escapeHtml(String(option.label || option.value || ''))}</option>`).join('')}
            </select>
          </label>
        `).join('')}
        <div class="helper-row">
          <button class="mini-btn" data-load-generic-google-sources="1">${deliveryGoogleSourceLoadLabel({ loading: draft.googleAssetsLoading })}</button>
        </div>
      </div>
    `;
  }

  function renderGenericDeliverablePrimaryActionButtons(descriptors = [], options = {}) {
    if (options.executionStopped || options.authorityBlocked) return '';
    return (Array.isArray(descriptors) ? descriptors : [])
      .filter((descriptor) => !descriptor.requiresConnectReady || options.connectReady)
      .map((descriptor) => descriptor.mode === 'schedule'
        ? `<button class="mini-btn" data-schedule-generic-deliverable="${escapeHtml(String(descriptor.dataAction || ''))}">${escapeHtml(String(descriptor.label || 'RUN'))}</button>`
        : `<button class="mini-btn" data-execute-generic-deliverable="${escapeHtml(String(descriptor.dataAction || ''))}">${escapeHtml(String(descriptor.label || 'RUN'))}</button>`)
      .join('');
  }

  function renderGenericDeliverableApprovalPreview(context = {}) {
    const draft = context.draft && typeof context.draft === 'object' ? context.draft : {};
    const isXPost = context.deliverable?.type === 'social_post_pack'
      && String(draft.channel || '').trim() === 'x'
      && ['post_ready', 'schedule_ready'].includes(String(draft.actionMode || '').trim());
    if (!isXPost) return '';
    const identity = xConnectorIdentityForClient();
    const postText = String(draft.postText || '').trim();
    const accountLine = context.connectReady && identity.handle
      ? `OAuth account: ${identity.handle}${identity.displayName ? ` (${identity.displayName})` : ''}`
      : 'OAuth account: not connected yet';
    return `
    <div class="detail-box compact-card ${context.connectReady ? 'info' : 'warn'}">
      <strong>X POST APPROVAL PREVIEW</strong>
      <div class="row-muted">${escapeHtml(accountLine)}</div>
      <div class="row-muted">${escapeHtml('CAIt posts only after this account and the exact text are approved.')}</div>
      ${postText ? `<pre class="delivery-preview-text">${escapeHtml(postText)}</pre>` : `<div class="row-muted">${escapeHtml('No exact post text yet.')}</div>`}
    </div>
  `;
  }

  function renderGenericDeliverableAuxiliaryButtons(deliverable = null, authority = null, options = {}) {
    const authorityButtons = Boolean(options.authorityBlocked)
      ? (Array.isArray(authority?.missingConnectors) ? authority.missingConnectors : [])
        .slice(0, 3)
        .map((connector) => {
          const action = connectorActionForChat(connector);
          const capabilities = (Array.isArray(authority?.missingConnectorCapabilities) ? authority.missingConnectorCapabilities : [])
            .filter((capability) => String(capability || '').trim().toLowerCase().startsWith(`${String(connector || '').trim().toLowerCase()}.`));
          const capabilityAttr = capabilities.length ? ` data-connector-capabilities="${escapeHtml(capabilities.join(','))}"` : '';
          return `<button class="mini-btn" data-chat-action="${escapeHtml(action.action)}"${capabilityAttr}>${escapeHtml(action.label)}</button>`;
        })
        .join('')
      : '';
    const stopButton = authority && !options.executionStopped
      ? '<button class="mini-btn" data-stop-generic-execution="1">CANCEL EXECUTION</button>'
      : '';
    const retryButton = options.executionStopped
      ? '<button class="mini-btn" data-clear-generic-execution-stop="1">ALLOW EXECUTION AGAIN</button>'
      : '';
    const executorCommandButton = deliverable?.type === 'code_handoff' && options.executorCommand
      ? '<button class="mini-btn" data-copy-executor-command="1">COPY EXECUTOR COMMAND</button>'
      : '';
    let connectCapabilities = '';
    if (options.connectAction === 'connect_google' && deliverable?.type === 'email_pack' && String(options.target || '') === 'gmail') connectCapabilities = 'google.send_gmail';
    if (options.connectAction === 'connect_x') connectCapabilities = 'x.post';
    const connectCapabilityAttr = connectCapabilities ? ` data-connector-capabilities="${escapeHtml(connectCapabilities)}"` : '';
    const connectButton = options.connectAction && !options.connectReady && !authority
      ? `<button class="mini-btn" data-chat-action="${escapeHtml(String(options.connectAction || ''))}"${connectCapabilityAttr}>${escapeHtml(String(options.connectLabel || ''))}</button>`
      : '';
    const cliButton = deliverable?.type === 'code_handoff' && String(options.target || '') === 'local_terminal'
      ? '<button class="mini-btn" data-open-cli-help="1">OPEN CLI HELP</button>'
      : '';
    return [authorityButtons, stopButton, retryButton, executorCommandButton, connectButton, cliButton].filter(Boolean).join('');
  }

  function renderGenericDeliverableControls(run = null, deliverable = null, draft = {}, options = {}) {
    const fields = deliveryControlFieldsForType(deliverable?.type, draft, options);
    return fields.map((field) => renderGenericDeliverableControlField(run, draft, field, options)).join('');
  }

  function renderGenericDeliverableActionRow(context = {}) {
    const approvalPreview = renderGenericDeliverableApprovalPreview(context);
    const primaryActionDescriptors = Array.isArray(context.primaryActionDescriptors) && context.primaryActionDescriptors.length
      ? context.primaryActionDescriptors
      : deliveryPrimaryActionDescriptors(context.deliverable?.type, context.draft, {
          authorityReadyToResume: context.authorityReadyToResume,
          reportNeedsGoogleLoad: context.reportNeedsGoogleLoad
        });
    const primaryActionButtons = renderGenericDeliverablePrimaryActionButtons(primaryActionDescriptors, {
      executionStopped: context.executionStopped,
      authorityBlocked: context.authorityBlocked,
      connectReady: context.connectReady
    });
    const auxiliaryButtons = renderGenericDeliverableAuxiliaryButtons(context.deliverable, context.authority, {
      authorityBlocked: context.authorityBlocked,
      executionStopped: context.executionStopped,
      executorCommand: context.executorCommand,
      connectAction: context.connectAction,
      connectLabel: context.connectLabel,
      connectReady: context.connectReady,
      target: String(context.draft?.target || '')
    });
    return [
      approvalPreview,
      `<div class="helper-row"><button class="mini-btn" data-copy-generic-deliverable="${escapeHtml(context.run?.id)}">${escapeHtml(context.meta?.copyLabel || 'COPY')}</button><button class="mini-btn" data-prepare-generic-deliverable="${escapeHtml(context.run?.id)}">${escapeHtml(context.meta?.prepareLabel || 'DRAFT NEXT ORDER')}</button>${primaryActionButtons}${auxiliaryButtons}</div>`,
      '<div class="row-muted">Draft buttons only load the next order into CAIt Chat. Execution starts only after Send order.</div>'
    ].join('');
  }

  function renderGenericDeliverableSection(section = {}, context = {}) {
    const kind = String(section?.kind || '').trim();
    if (!kind) return '';
    if (kind === 'intro') {
      return [
        `<div class="field-label">${escapeHtml(context.meta?.title || '')}</div>`,
        `<div class="muted">${escapeHtml(context.meta?.description || '')}</div>`,
        `<div class="publish-meta-line"><strong>${escapeHtml(context.deliverable?.title || 'Detected deliverable')}</strong><span>${escapeHtml(context.confidence)}</span>${context.fileInfo}</div>`
      ].join('');
    }
    if (kind === 'controls') {
      return renderGenericDeliverableControls(context.run, context.deliverable, context.draft, {
        isPlatformAdmin: context.isPlatformAdmin,
        scheduleLabel: genericDeliverableScheduleLabel(context.draft?.scheduledAt || ''),
        repoDatalistId: context.repoDatalistId,
        repoDatalistHtml: repoOptionsDatalist(context.run?.id),
        optionOverrides: context.seed?.controlOptions || {}
      });
    }
    if (kind === 'reason') {
      return `<div class="detail-box compact-card publish-preview-box">${escapeHtml(context.deliverable?.reason || deliveryUiText('genericReasonFallback'))}</div>`;
    }
    if (kind === 'authority') {
      return renderDeliveryAuthorityCard(context.run, context.deliverable, context.authority);
    }
    if (kind === 'google_sources') {
      return renderGoogleSourceControls(context.run, context.draft, context.authority, context.googleSourcePlan, context.googleOptionsByGroup);
    }
    if (kind === 'stopped') {
      return context.executionStopped
        ? `<div class="detail-box compact-card warn">${escapeHtml(deliveryUiText('executionStoppedNotice'))}</div>`
        : '';
    }
    if (kind === 'actions') {
      return renderGenericDeliverableActionRow(context);
    }
    return '';
  }

  function renderGenericDeliverableCard(context = {}) {
    if (!context.run?.id || !context.deliverable?.content || !context.meta) return '';
    const sections = genericDeliverableSectionDescriptors()
      .map((section) => renderGenericDeliverableSection(section, context))
      .filter(Boolean)
      .join('');
    return `
      <div class="detail-box action-card info compact-card delivery-publish-card">
        ${sections}
      </div>
    `;
  }

  return {
    renderGenericDeliverableCard,
    renderGenericDeliverableControls,
    renderGenericDeliverableSection
  };
}
