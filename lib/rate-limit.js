export function createRateLimitHelpers({
  buckets = new Map(),
  json,
  rateLimitSpecForPath
} = {}) {
  function rateLimitClientKey(request) {
    const cfIp = String(request.headers.get('cf-connecting-ip') || '').trim();
    if (cfIp) return cfIp;
    const forwarded = String(request.headers.get('x-forwarded-for') || '').split(',')[0].trim();
    return forwarded || 'unknown';
  }

  function rateLimitResponseForRequest(request) {
    const url = new URL(request.url);
    const spec = rateLimitSpecForPath(url.pathname, request.method);
    if (!spec) return null;
    const now = Date.now();
    const key = `${spec.name}:${rateLimitClientKey(request)}`;
    const current = buckets.get(key);
    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + spec.windowMs });
      return null;
    }
    current.count += 1;
    if (buckets.size > 2000) {
      for (const [bucketKey, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(bucketKey);
      }
    }
    if (current.count <= spec.limit) return null;
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return json({ error: 'Rate limit exceeded', retry_after: retryAfter }, 429, { 'retry-after': String(retryAfter) });
  }

  return {
    rateLimitClientKey,
    rateLimitResponseForRequest
  };
}
