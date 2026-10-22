import { HttpError, rateKey } from './http.js';
export async function db(path, { method = 'GET', data, prefer } = {}) {
  const response = await fetch(`${process.env.SUPABASE_URL?.replace(/\/$/, '')}/rest/v1/${path}`, {
    method, headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }), signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    if (result.message?.includes('INSUFFICIENT_STOCK')) throw new HttpError(409, 'A selected size has sold out. Please review your bag.');
    if (result.message?.includes('REQUEST_CONFLICT')) throw new HttpError(409, 'This checkout has changed. Please start a new checkout.');
    throw new HttpError(503, 'The store could not save this request. Please try again.');
  }
  return response.status === 204 ? null : response.json();
}
export const rpc = (name, data) => db(`rpc/${name}`, { method: 'POST', data });
export async function limit(req, scope, max = 8, seconds = 900) {
  const allowed = await rpc('take_store_rate_limit', { p_key: rateKey(req, scope), p_max: max, p_seconds: seconds });
  if (!allowed) throw new HttpError(429, 'Too many attempts. Please try again in a few minutes.');
}
