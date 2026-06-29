function normalizeString(value, fallback = '') {
  return String(value ?? fallback).trim();
}

export function isPrivateNetworkHostname(hostname = '') {
  const host = normalizeString(hostname).toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) return true;
  if (['localhost', '::1', '0:0:0:0:0:0:0:1'].includes(host)) return true;
  if (host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    const octets = host.split('.').map((part) => Number(part));
    if (octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
    const [a, b] = octets;
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 198 && (b === 18 || b === 19)) return true;
    return false;
  }
  if (host.includes(':')) {
    if (host === '::1') return true;
    if (host.startsWith('fc') || host.startsWith('fd')) return true;
    if (host.startsWith('fe80:')) return true;
    if (host.startsWith('::ffff:127.')) return true;
  }
  return false;
}
