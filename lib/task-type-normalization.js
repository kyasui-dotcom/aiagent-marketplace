export function normalizeTaskTypes(value) {
  const clean = (v) => {
    if (v === undefined || v === null) return '';
    const task = String(v).trim().toLowerCase();
    return task === 'undefined' || task === 'null' ? '' : task;
  };
  if (Array.isArray(value)) return value.map(clean).filter(Boolean);
  return String(value || '')
    .split(',')
    .map(clean)
    .filter(Boolean);
}
