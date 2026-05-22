import { APP_SETTING_DEFAULTS } from '../../public/work-action-registry.js';

export function appSettingsMap(state = {}) {
  const output = { ...APP_SETTING_DEFAULTS };
  for (const item of Array.isArray(state?.appSettings) ? state.appSettings : []) {
    const key = String(item?.key || '').trim();
    if (!key || !(key in output)) continue;
    output[key] = String(item?.value ?? output[key]);
  }
  return output;
}

export async function lazyAppSettingsMap(storage) {
  if (typeof storage.listAppSettings === 'function') {
    return appSettingsMap({ appSettings: await storage.listAppSettings() });
  }
  const state = await storage.getState();
  return appSettingsMap(state);
}

function sanitizeAppSettingPatch(body = {}, nowIso = () => new Date().toISOString()) {
  const key = String(body?.key || '').trim();
  if (!key || !(key in APP_SETTING_DEFAULTS)) return { error: 'Unknown app setting key.' };
  const value = String(body?.value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
  if (!value) return { error: 'Setting value is required.' };
  if (value.length > 500) return { error: 'Setting value is too long (max 500 characters).' };
  return {
    key,
    value,
    source: 'admin',
    updatedAt: nowIso()
  };
}

export function createAppSettingsRouteHandlers(deps = {}) {
  const {
    canViewAdminDashboard,
    currentUserContext,
    getSession,
    lightweightCurrentFromSession,
    nowIso,
    parseBody
  } = deps;

  async function getAppSettings(storage, request, env) {
    const current = lightweightCurrentFromSession(await getSession(request, env));
    if (!canViewAdminDashboard(current, env)) return { error: 'Admin access required', statusCode: 403 };
    return { app_settings: await lazyAppSettingsMap(storage) };
  }

  async function saveAppSetting(storage, request, env) {
    const current = await currentUserContext(request, env);
    if (!canViewAdminDashboard(current, env)) return { error: 'Admin access required', statusCode: 403 };
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return { error: error.message, statusCode: 400 };
    }
    const patch = sanitizeAppSettingPatch(body || {}, nowIso);
    if (patch.error) return { error: patch.error, statusCode: 400 };
    await storage.mutate(async (draft) => {
      const existing = Array.isArray(draft.appSettings) ? draft.appSettings : [];
      const next = [...existing];
      const index = next.findIndex((item) => String(item?.key || '').trim() === patch.key);
      const merged = {
        ...(index >= 0 ? next[index] : {}),
        ...patch,
        createdAt: index >= 0 ? (next[index]?.createdAt || nowIso()) : nowIso(),
        updatedAt: nowIso()
      };
      if (index >= 0) next[index] = merged;
      else next.push(merged);
      draft.appSettings = next;
    });
    const state = await storage.getState();
    return { app_settings: appSettingsMap(state) };
  }

  async function deleteAppSetting(storage, request, env, key = '') {
    const current = await currentUserContext(request, env);
    if (!canViewAdminDashboard(current, env)) return { error: 'Admin access required', statusCode: 403 };
    const targetKey = String(key || '').trim();
    if (!targetKey || !(targetKey in APP_SETTING_DEFAULTS)) return { error: 'Unknown app setting key.', statusCode: 400 };
    await storage.mutate(async (draft) => {
      const settings = Array.isArray(draft.appSettings) ? draft.appSettings : [];
      const index = settings.findIndex((item) => String(item?.key || '').trim() === targetKey);
      const reset = {
        key: targetKey,
        value: String(APP_SETTING_DEFAULTS[targetKey] || ''),
        source: 'default_reset',
        resetAt: nowIso(),
        updatedAt: nowIso()
      };
      if (index >= 0) settings[index] = { ...settings[index], ...reset, createdAt: settings[index].createdAt || nowIso() };
      else settings.push({ ...reset, createdAt: nowIso() });
      draft.appSettings = settings;
    });
    const state = await storage.getState();
    return { ok: true, app_settings: appSettingsMap(state) };
  }

  return {
    deleteAppSetting,
    getAppSettings,
    saveAppSetting
  };
}
