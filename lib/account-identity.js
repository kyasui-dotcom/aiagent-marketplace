import { createHash } from 'node:crypto';

function normalizeString(value, fallback = '') {
  return String(value ?? fallback).trim();
}

export function accountHash(login = '') {
  const safe = normalizeString(login).toLowerCase();
  if (!safe) return '';
  return createHash('sha256').update(safe).digest('hex').slice(0, 16);
}
