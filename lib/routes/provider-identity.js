const PROVIDER_IDENTITY_PHOTO_MAX_CHARS = 900_000;
const PROVIDER_IDENTITY_FIELD_MAX = 240;
const PROVIDER_IDENTITY_STATUSES = new Set(['not_submitted', 'pending', 'approved', 'rejected']);

export function providerIdentityStatus(account = null) {
  const status = String(account?.payout?.identityVerification?.status || 'not_submitted').trim().toLowerCase();
  return PROVIDER_IDENTITY_STATUSES.has(status) ? status : 'not_submitted';
}

function cleanProviderIdentityField(value = '', max = PROVIDER_IDENTITY_FIELD_MAX) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function providerIdentityPhotoFromBody(body = {}, nowIso = () => new Date().toISOString()) {
  const dataUrl = cleanProviderIdentityField(body.photo_data_url || body.photoDataUrl || body.photo || '', PROVIDER_IDENTITY_PHOTO_MAX_CHARS);
  if (!dataUrl) return { error: 'Photo is required.' };
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,[A-Za-z0-9+/=]+$/);
  if (!match) return { error: 'Photo must be a JPEG, PNG, or WebP data URL.' };
  if (dataUrl.length > PROVIDER_IDENTITY_PHOTO_MAX_CHARS) return { error: 'Photo is too large. Upload an image under about 650 KB.' };
  return {
    submitted: true,
    mimeType: match[1],
    size: Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75),
    name: cleanProviderIdentityField(body.photo_name || body.photoName || 'identity-photo', 120),
    dataUrl,
    submittedAt: nowIso()
  };
}

function sanitizeProviderIdentitySubmission(body = {}, nowIso = () => new Date().toISOString()) {
  const fields = {
    fullName: cleanProviderIdentityField(body.full_name || body.fullName || body.legal_name || body.legalName),
    birthDate: cleanProviderIdentityField(body.birth_date || body.birthDate, 20),
    addressLine1: cleanProviderIdentityField(body.address_line1 || body.addressLine1),
    addressLine2: cleanProviderIdentityField(body.address_line2 || body.addressLine2),
    city: cleanProviderIdentityField(body.city),
    region: cleanProviderIdentityField(body.region || body.prefecture || body.state),
    postalCode: cleanProviderIdentityField(body.postal_code || body.postalCode, 40),
    country: cleanProviderIdentityField(body.country || 'JP', 2).toUpperCase(),
    phone: cleanProviderIdentityField(body.phone, 60),
    documentType: cleanProviderIdentityField(body.document_type || body.documentType || 'photo_id', 80),
    notes: cleanProviderIdentityField(body.notes, 500)
  };
  const missing = [];
  for (const key of ['fullName', 'birthDate', 'addressLine1', 'city', 'postalCode', 'country', 'phone']) {
    if (!fields[key]) missing.push(key);
  }
  if (fields.birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(fields.birthDate)) missing.push('birthDate:yyyy-mm-dd');
  const photo = providerIdentityPhotoFromBody(body, nowIso);
  if (photo.error) missing.push('photo');
  if (missing.length) return { error: `Identity verification is incomplete: ${missing.join(', ')}`, statusCode: 400 };
  return {
    status: 'pending',
    submittedAt: nowIso(),
    reviewedAt: null,
    reviewedBy: '',
    rejectionReason: '',
    fields,
    photo
  };
}

export function createProviderIdentityRouteHandlers(deps = {}) {
  const {
    accountSettingsForLogin,
    canViewAdminDashboard,
    currentUserContext,
    nowIso,
    parseBody,
    sanitizeAccountSettingsForClient,
    touchEvent,
    upsertAccountSettingsInState
  } = deps;

  async function submitProviderIdentityVerification(storage, request, env) {
    const current = await currentUserContext(request, env);
    if (!current.user) return { error: 'Login required', statusCode: 401 };
    if (!current.githubLinked) return { error: 'GitHub connection required for provider identity verification.', statusCode: 403 };
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return { error: error.message, statusCode: 400 };
    }
    const identityVerification = sanitizeProviderIdentitySubmission(body || {}, nowIso);
    if (identityVerification.error) return identityVerification;
    let account = null;
    await storage.mutate(async (draft) => {
      const existing = accountSettingsForLogin(draft, current.login, current.user, current.authProvider);
      account = upsertAccountSettingsInState(draft, current.login, current.user, current.authProvider, {
        billing: {
          ...(existing.billing || {}),
          legalName: existing.billing?.legalName || identityVerification.fields.fullName,
          billingPhone: existing.billing?.billingPhone || identityVerification.fields.phone,
          country: existing.billing?.country || identityVerification.fields.country || 'JP',
          billingPostalCode: existing.billing?.billingPostalCode || identityVerification.fields.postalCode,
          billingRegion: existing.billing?.billingRegion || identityVerification.fields.region,
          billingCity: existing.billing?.billingCity || identityVerification.fields.city,
          billingAddressLine1: existing.billing?.billingAddressLine1 || identityVerification.fields.addressLine1,
          billingAddressLine2: existing.billing?.billingAddressLine2 || identityVerification.fields.addressLine2
        },
        payout: {
          ...(existing.payout || {}),
          providerEnabled: true,
          legalName: existing.payout?.legalName || identityVerification.fields.fullName,
          payoutEmail: existing.payout?.payoutEmail || current.user?.email || current.login,
          country: existing.payout?.country || identityVerification.fields.country || 'JP',
          identityVerification
        }
      });
    });
    await touchEvent(storage, 'IDENTITY', `${current.login} submitted provider identity verification`, {
      login: current.login,
      status: 'pending'
    });
    return {
      ok: true,
      identity_verification: {
        status: identityVerification.status,
        submittedAt: identityVerification.submittedAt,
        photoSubmitted: true
      },
      account: sanitizeAccountSettingsForClient(account)
    };
  }

  async function getAdminProviderIdentityVerification(storage, request, env, login = '') {
    const current = await currentUserContext(request, env);
    if (!canViewAdminDashboard(current, env)) return { error: 'Admin access required', statusCode: 403 };
    const targetLogin = decodeURIComponent(String(login || '').trim()).toLowerCase();
    if (!targetLogin) return { error: 'login required', statusCode: 400 };
    let account = null;
    if (typeof storage.getAccountByLogin === 'function') {
      account = await storage.getAccountByLogin(targetLogin);
    } else {
      const state = await storage.getState();
      account = (Array.isArray(state.accounts) ? state.accounts : [])
        .find((item) => String(item?.login || '').trim().toLowerCase() === targetLogin) || null;
    }
    if (!account?.login) return { error: 'Account not found', statusCode: 404 };
    const identityVerification = account.payout?.identityVerification || { status: 'not_submitted' };
    return {
      ok: true,
      login: account.login,
      display_name: account.profile?.displayName || account.login,
      identity_verification: identityVerification
    };
  }

  async function reviewAdminProviderIdentityVerification(storage, request, env, login = '') {
    const current = await currentUserContext(request, env);
    if (!canViewAdminDashboard(current, env)) return { error: 'Admin access required', statusCode: 403 };
    const targetLogin = decodeURIComponent(String(login || '').trim()).toLowerCase();
    if (!targetLogin) return { error: 'login required', statusCode: 400 };
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return { error: error.message, statusCode: 400 };
    }
    const decision = String(body?.decision || body?.status || '').trim().toLowerCase();
    if (!['approved', 'rejected'].includes(decision)) return { error: 'decision must be approved or rejected', statusCode: 400 };
    const rejectionReason = cleanProviderIdentityField(body?.rejection_reason || body?.rejectionReason || body?.reason || '', 500);
    let account = null;
    await storage.mutate(async (draft) => {
      const existing = (Array.isArray(draft.accounts) ? draft.accounts : [])
        .find((item) => String(item?.login || '').trim().toLowerCase() === targetLogin) || null;
      if (!existing?.login) return;
      const currentIdentity = existing.payout?.identityVerification && typeof existing.payout.identityVerification === 'object'
        ? existing.payout.identityVerification
        : { status: 'not_submitted' };
      const reviewedAt = nowIso();
      const identityVerification = {
        ...currentIdentity,
        status: decision,
        reviewedAt,
        reviewedBy: current.login,
        rejectionReason: decision === 'rejected' ? rejectionReason : ''
      };
      account = upsertAccountSettingsInState(draft, targetLogin, null, existing.authProvider || 'github-app', {
        payout: {
          ...(existing.payout || {}),
          identityVerification
        }
      });
    });
    if (!account) return { error: 'Account not found', statusCode: 404 };
    await touchEvent(storage, 'IDENTITY', `${targetLogin} provider identity ${decision} by ${current.login}`, {
      login: targetLogin,
      reviewedBy: current.login,
      decision
    });
    return {
      ok: true,
      login: targetLogin,
      identity_verification: account.payout?.identityVerification || null,
      account: sanitizeAccountSettingsForClient(account)
    };
  }

  return {
    getAdminProviderIdentityVerification,
    reviewAdminProviderIdentityVerification,
    submitProviderIdentityVerification
  };
}
