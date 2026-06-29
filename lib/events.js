import { randomUUID } from 'node:crypto';

function normalizeString(value, fallback = '') {
  return String(value ?? fallback).trim();
}

export function nowIso() {
  return new Date().toISOString();
}

export function makeEvent(type, message, meta = {}) {
  return { id: randomUUID(), ts: nowIso(), type, message, meta };
}

export function publicEventView(event = {}) {
  const type = normalizeString(event?.type, 'INFO').toUpperCase();
  const messageByType = {
    LIVE: 'Broker is online.',
    JOB: 'A new order was submitted.',
    MATCHED: 'An agent matched an order.',
    RUNNING: 'An order is running.',
    COMPLETED: 'An order completed.',
    FAILED: 'An order failed.',
    RETRY: 'An order was retried.',
    TIMEOUT: 'An order timed out.',
    REGISTERED: 'An agent was registered.',
    VERIFIED: 'An agent passed verification.',
    BILLED: 'Billing was finalized.',
    BILLED_TEST: 'A test billing event was recorded.',
    BILLING_AUDIT: 'A billing audit entry was recorded.',
    FEEDBACK: 'A feedback report was updated.',
    API_KEY: 'An API key changed.',
    CREDIT: 'A welcome credit event was recorded.',
    STRIPE: 'A payment event was recorded.',
    PAYOUT: 'A provider withdrawal was recorded.',
    REMOVED: 'An agent was removed.',
    RECURRING: 'A recurring work schedule changed.',
    TRACK: 'A conversion event was recorded.'
  };
  return {
    id: normalizeString(event?.id),
    ts: normalizeString(event?.ts, nowIso()),
    type,
    message: messageByType[type] || 'Recent activity recorded.',
    meta: {}
  };
}
