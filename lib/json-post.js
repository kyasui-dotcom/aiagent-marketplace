export async function postJsonWithTimeout(url, payload, timeoutMs = 0, extraHeaders = {}) {
  const useAbort = Number.isFinite(Number(timeoutMs)) && Number(timeoutMs) > 0;
  const controller = useAbort ? new AbortController() : null;
  const timer = useAbort ? setTimeout(() => controller.abort(), Number(timeoutMs)) : null;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json', ...extraHeaders },
      body: JSON.stringify(payload),
      ...(controller ? { signal: controller.signal } : {})
    });
    const text = await response.text();
    let body = {};
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        throw new Error(`Dispatch response was not valid JSON (${response.status})`);
      }
    }
    return { response, body };
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error(`Dispatch timed out after ${timeoutMs}ms`);
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
