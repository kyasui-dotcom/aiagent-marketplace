import {
  deliveryGoogleSourceFlowPlan,
  googleIncludeGroupsForCapabilities
} from './delivery-action-contract.js';

export function createClientDeliveryExecutorPreferences(deps = {}) {
  const {
    api,
    flash,
    mergeProgressJobIntoSnapshot,
    normalizeClientConnectorCapabilityList,
    normalizeClientList,
    normalizeRepoFullName,
    renderRunDelivery,
    selectedJob,
    selectedRepoFromPicker,
    state,
    updateGenericDeliverableDraft
  } = deps;

  function preferredGithubRepoFullName() {
    const saved = normalizeRepoFullName(state.snapshot?.accountSettings?.executorPreferences?.github?.repoFullName || '');
    if (saved) return saved;
    const selected = normalizeRepoFullName(state.selectedRepoFullName || '');
    if (selected) return selected;
    const picked = selectedRepoFromPicker?.();
    if (picked?.fullName) return normalizeRepoFullName(picked.fullName);
    const first = Array.isArray(state.githubRepos) ? state.githubRepos[0] : null;
    return normalizeRepoFullName(first?.fullName || '');
  }

  function normalizeGoogleIncludeGroup(value = '') {
    const raw = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (!raw) return '';
    if (['gsc', 'search_console', 'google_search_console', 'webmasters'].includes(raw)) return 'gsc';
    if (['ga4', 'analytics', 'google_analytics', 'google_analytics_4'].includes(raw)) return 'ga4';
    if (['drive', 'docs', 'sheets', 'slides', 'presentations'].includes(raw)) return 'drive';
    if (['calendar', 'google_calendar'].includes(raw)) return 'calendar';
    if (['gmail', 'mail', 'email'].includes(raw)) return 'gmail';
    return '';
  }

  function googleIncludeGroupsFromAuthorityRequest(request = null) {
    if (!request || typeof request !== 'object') return [];
    const explicit = normalizeClientList(
      request.requiredGoogleSources
        || request.required_google_sources
        || request.googleSourceTypes
        || request.google_source_types,
      []
    ).map(normalizeGoogleIncludeGroup).filter(Boolean);
    if (explicit.length) return Array.from(new Set(explicit));
    return googleIncludeGroupsForCapabilities(
      normalizeClientConnectorCapabilityList(request.missingConnectorCapabilities
        || request.missing_connector_capabilities
        || request.requiredConnectorCapabilities
        || request.required_connector_capabilities
        || request.capabilities
        || [])
    );
  }

  function googleExecutorPreferences() {
    return state.snapshot?.accountSettings?.executorPreferences?.google || {};
  }

  function githubExecutorPreferences() {
    return state.snapshot?.accountSettings?.executorPreferences?.github || {};
  }

  function xExecutorPreferences() {
    return state.snapshot?.accountSettings?.executorPreferences?.x || {};
  }

  function applyExecutorPreferenceResult(result = {}) {
    if (!state.snapshot) return;
    if (result.account) state.snapshot.accountSettings = result.account;
    if (result.monthly_summary) state.snapshot.monthlySummary = result.monthly_summary;
  }

  async function saveGoogleExecutorPreferences(patch = {}) {
    const current = googleExecutorPreferences();
    const payload = {
      google: {
        searchConsoleSite: String(patch.searchConsoleSite ?? current.searchConsoleSite ?? '').trim(),
        ga4Property: String(patch.ga4Property ?? current.ga4Property ?? '').trim(),
        driveFileId: String(patch.driveFileId ?? current.driveFileId ?? '').trim(),
        calendarId: String(patch.calendarId ?? current.calendarId ?? '').trim(),
        gmailLabelId: String(patch.gmailLabelId ?? current.gmailLabelId ?? '').trim()
      }
    };
    const result = await api('/api/settings/executor-preferences', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    applyExecutorPreferenceResult(result);
    return result;
  }

  async function saveGithubExecutorPreferences(patch = {}) {
    const current = githubExecutorPreferences();
    const payload = {
      github: {
        repoFullName: normalizeRepoFullName(String(patch.repoFullName ?? current.repoFullName ?? ''))
      }
    };
    const result = await api('/api/settings/executor-preferences', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    applyExecutorPreferenceResult(result);
    return result;
  }

  async function saveXExecutorPreferences(patch = {}) {
    const current = xExecutorPreferences();
    const payload = {
      x: {
        channel: String(patch.channel ?? current.channel ?? '').trim(),
        actionMode: String(patch.actionMode ?? current.actionMode ?? '').trim()
      }
    };
    const result = await api('/api/settings/executor-preferences', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    applyExecutorPreferenceResult(result);
    return result;
  }

  function flattenGa4PropertyOptions(accountSummaries = []) {
    const options = [];
    for (const summary of Array.isArray(accountSummaries) ? accountSummaries : []) {
      const accountLabel = String(summary?.displayName || summary?.name || '').trim();
      for (const property of Array.isArray(summary?.propertySummaries) ? summary.propertySummaries : []) {
        const id = String(property?.property || '').trim();
        if (!id) continue;
        options.push({
          value: id,
          label: [String(property?.displayName || id), accountLabel].filter(Boolean).join(' - ')
        });
      }
    }
    return options;
  }

  function flattenGoogleDriveOptions(files = []) {
    return (Array.isArray(files) ? files : [])
      .map((file) => {
        const id = String(file?.id || '').trim();
        if (!id) return null;
        const name = String(file?.name || id).trim();
        const mimeType = String(file?.mimeType || '').trim();
        return {
          value: id,
          label: mimeType ? `${name} - ${mimeType}` : name
        };
      })
      .filter(Boolean);
  }

  function flattenGoogleCalendarOptions(calendars = []) {
    return (Array.isArray(calendars) ? calendars : [])
      .map((calendar) => {
        const id = String(calendar?.id || '').trim();
        if (!id) return null;
        const summary = String(calendar?.summary || id).trim();
        const accessRole = String(calendar?.accessRole || '').trim();
        return {
          value: id,
          label: accessRole ? `${summary} - ${accessRole}` : summary
        };
      })
      .filter(Boolean);
  }

  function flattenGoogleGmailLabelOptions(labels = []) {
    const all = (Array.isArray(labels) ? labels : [])
      .map((label) => {
        const id = String(label?.id || '').trim();
        if (!id) return null;
        const name = String(label?.name || id).trim();
        const type = String(label?.type || '').trim();
        return {
          value: id,
          label: type ? `${name} - ${type}` : name
        };
      })
      .filter(Boolean);
    const inbox = all.find((label) => label.value === 'INBOX' || /^inbox$/i.test(label.label));
    if (!inbox) return all;
    return [inbox, ...all.filter((label) => label !== inbox)];
  }

  async function loadGoogleSourcesForGenericDeliverable(job = null, draft = null, authority = null) {
    const jobId = String(job?.id || '').trim();
    if (!jobId) return;
    const googleSourcePlan = deliveryGoogleSourceFlowPlan(draft, authority);
    const includeGroups = googleSourcePlan.requestedGroups;
    if (!includeGroups.length) return;
    updateGenericDeliverableDraft(jobId, {
      googleIncludeGroups: includeGroups,
      googleAssetsLoading: true,
      googleAssetsError: '',
      googleAssetsRequestedAt: new Date().toISOString()
    });
    if (state.selectedJobId === jobId) renderRunDelivery(selectedJob());
    try {
      const params = new URLSearchParams();
      params.set('include', includeGroups.join(','));
      const payload = await api(`/api/connectors/google/assets?${params.toString()}`);
      const sites = Array.isArray(payload?.search_console?.sites) ? payload.search_console.sites : [];
      const accountSummaries = Array.isArray(payload?.ga4?.account_summaries) ? payload.ga4.account_summaries : [];
      const ga4Options = flattenGa4PropertyOptions(accountSummaries);
      const driveOptions = flattenGoogleDriveOptions(payload?.drive?.files || []);
      const calendarOptions = flattenGoogleCalendarOptions(payload?.calendar?.calendars || []);
      const gmailLabelOptions = flattenGoogleGmailLabelOptions(payload?.gmail?.labels || []);
      const nextPatch = {
        googleIncludeGroups: includeGroups,
        googleAssetsLoading: false,
        googleAssetsError: '',
        googleAssets: payload
      };
      if (includeGroups.includes('gsc') && !String(draft?.googleSearchConsoleSite || '').trim() && sites.length) {
        nextPatch.googleSearchConsoleSite = String(sites[0]?.siteUrl || '');
      }
      if (includeGroups.includes('ga4') && !String(draft?.googleGa4Property || '').trim() && ga4Options.length) {
        nextPatch.googleGa4Property = String(ga4Options[0]?.value || '');
      }
      if (includeGroups.includes('drive') && !String(draft?.googleDriveFileId || '').trim() && driveOptions.length) {
        nextPatch.googleDriveFileId = String(driveOptions[0]?.value || '');
      }
      if (includeGroups.includes('calendar') && !String(draft?.googleCalendarId || '').trim() && calendarOptions.length) {
        nextPatch.googleCalendarId = String(calendarOptions[0]?.value || '');
      }
      if (includeGroups.includes('gmail') && !String(draft?.googleGmailLabelId || '').trim() && gmailLabelOptions.length) {
        nextPatch.googleGmailLabelId = String(gmailLabelOptions[0]?.value || '');
      }
      updateGenericDeliverableDraft(jobId, nextPatch);
      if (state.selectedJobId === jobId) renderRunDelivery(selectedJob());
      flash('Google sources loaded for this delivery.', 'ok');
    } catch (error) {
      updateGenericDeliverableDraft(jobId, {
        googleIncludeGroups: includeGroups,
        googleAssetsLoading: false,
        googleAssetsError: String(error?.message || 'Google sources could not be loaded.')
      });
      if (state.selectedJobId === jobId) renderRunDelivery(selectedJob());
      throw error;
    }
  }

  return {
    flattenGa4PropertyOptions,
    flattenGoogleCalendarOptions,
    flattenGoogleDriveOptions,
    flattenGoogleGmailLabelOptions,
    githubExecutorPreferences,
    googleExecutorPreferences,
    googleIncludeGroupsFromAuthorityRequest,
    loadGoogleSourcesForGenericDeliverable,
    normalizeGoogleIncludeGroup,
    preferredGithubRepoFullName,
    saveGithubExecutorPreferences,
    saveGoogleExecutorPreferences,
    saveXExecutorPreferences,
    xExecutorPreferences
  };
}
