const $ = (id) => document.getElementById(id);

const els = {
  form: $('providerIdentityForm'),
  status: $('identityStatusText'),
  result: $('identityResultText'),
  submit: $('submitIdentityBtn'),
  fullName: $('fullName'),
  birthDate: $('birthDate'),
  phone: $('phone'),
  country: $('country'),
  addressLine1: $('addressLine1'),
  addressLine2: $('addressLine2'),
  city: $('city'),
  region: $('region'),
  postalCode: $('postalCode'),
  documentType: $('documentType'),
  photo: $('identityPhoto'),
  notes: $('notes')
};

const PHOTO_MAX_BYTES = 650 * 1024;

function setText(node, value = '') {
  if (node) node.textContent = String(value ?? '');
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    headers: { accept: 'application/json', ...(options.headers || {}) },
    ...options
  });
  const text = await response.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { error: text || response.statusText };
  }
  if (!response.ok) throw new Error(body?.error || response.statusText || `Request failed (${response.status})`);
  return body;
}

function readPhotoDataUrl(file) {
  if (!file) return Promise.reject(new Error('Photo is required.'));
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return Promise.reject(new Error('Photo must be JPEG, PNG, or WebP.'));
  }
  if (file.size > PHOTO_MAX_BYTES) {
    return Promise.reject(new Error('Photo must be under 650 KB.'));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read photo.'));
    reader.readAsDataURL(file);
  });
}

function identityStatus(account = {}) {
  const identity = account?.payout?.identityVerification || {};
  const status = String(identity.status || 'not_submitted').toLowerCase();
  const reviewed = identity.reviewedAt ? ` Reviewed ${new Date(identity.reviewedAt).toLocaleString('en-US')}.` : '';
  const rejected = identity.rejectionReason ? ` Reason: ${identity.rejectionReason}` : '';
  return `Current CAIt identity status: ${status}.${reviewed}${rejected}`;
}

async function loadCurrentStatus() {
  try {
    const payload = await api('/api/settings');
    setText(els.status, identityStatus(payload.account || {}));
    const fields = payload.account?.payout?.identityVerification?.fields || {};
    if (fields.fullName && !els.fullName.value) els.fullName.value = fields.fullName;
    if (fields.birthDate && !els.birthDate.value) els.birthDate.value = fields.birthDate;
    if (fields.phone && !els.phone.value) els.phone.value = fields.phone;
    if (fields.country && !els.country.value) els.country.value = fields.country;
    if (fields.addressLine1 && !els.addressLine1.value) els.addressLine1.value = fields.addressLine1;
    if (fields.addressLine2 && !els.addressLine2.value) els.addressLine2.value = fields.addressLine2;
    if (fields.city && !els.city.value) els.city.value = fields.city;
    if (fields.region && !els.region.value) els.region.value = fields.region;
    if (fields.postalCode && !els.postalCode.value) els.postalCode.value = fields.postalCode;
    if (fields.documentType && els.documentType) els.documentType.value = fields.documentType;
    if (fields.notes && !els.notes.value) els.notes.value = fields.notes;
  } catch (error) {
    setText(els.status, `Login with GitHub is required before provider identity submission. ${error?.message || ''}`.trim());
  }
}

async function submitIdentity(event) {
  event.preventDefault();
  setText(els.result, 'Submitting identity review...');
  if (els.submit) els.submit.disabled = true;
  try {
    const file = els.photo?.files?.[0] || null;
    const photoDataUrl = await readPhotoDataUrl(file);
    const payload = {
      full_name: els.fullName.value,
      birth_date: els.birthDate.value,
      phone: els.phone.value,
      country: els.country.value,
      address_line1: els.addressLine1.value,
      address_line2: els.addressLine2.value,
      city: els.city.value,
      region: els.region.value,
      postal_code: els.postalCode.value,
      document_type: els.documentType.value,
      notes: els.notes.value,
      photo_name: file.name,
      photo_data_url: photoDataUrl
    };
    const result = await api('/api/settings/provider-identity', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    setText(els.result, `Submitted for admin review. Status: ${result.identity_verification?.status || 'pending'}.`);
    await loadCurrentStatus();
  } catch (error) {
    setText(els.result, error?.message || 'Submission failed.');
  } finally {
    if (els.submit) els.submit.disabled = false;
  }
}

els.form?.addEventListener('submit', submitIdentity);

void loadCurrentStatus();
