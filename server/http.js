import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { getConfig } from './config.js';

export class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
export const hash = value => createHash('sha256').update(value).digest('hex');
export const equal = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
export const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export const emailValid = value => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export function json(res, status, data) { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.end(JSON.stringify(data)); }
export function endpoint(methods, handler) {
  return async (req, res) => {
    try {
      if (!methods.includes(req.method)) { res.setHeader('Allow', methods.join(', ')); throw new HttpError(405, 'Method not allowed.'); }
      await handler(req, res);
    } catch (error) {
      // Never log request bodies, customer data, provider responses, or credentials.
      if (!error.status) console.error('Store request failed:', error.name || 'Error');
      json(res, error.status || 503, { error: error.status ? error.message : 'This service is temporarily unavailable. Please try again.' });
    }
  };
}
export function sameOrigin(req) {
  const expected = getConfig().origin;
  if (!expected || req.headers.origin !== expected) throw new HttpError(403, 'This request must come from the store.');
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) throw new HttpError(415, 'Send a JSON request.');
}
export async function rawBody(req, limit = 32768) {
  if (Number(req.headers['content-length']) > limit) throw new HttpError(413, 'Request too large.');
  const chunks = []; let size = 0;
  for await (const chunk of req) { const b = Buffer.from(chunk); size += b.length; if (size > limit) throw new HttpError(413, 'Request too large.'); chunks.push(b); }
  return Buffer.concat(chunks);
}
export async function body(req) {
  let data;
  try { data = req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body) ? req.body : JSON.parse((await rawBody(req)).toString()); } catch (error) { if (error.status) throw error; throw new HttpError(400, 'Invalid request body.'); }
  if (!data || Array.isArray(data) || typeof data !== 'object' || JSON.stringify(data).length > 32768) throw new HttpError(400, 'Invalid request body.');
  return data;
}
export function rateKey(req, scope) {
  const ip = process.env.VERCEL ? String(req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || '').split(',')[0].trim() : req.socket?.remoteAddress || 'local';
  return createHmac('sha256', process.env.RATE_LIMIT_SALT).update(`${scope}:${ip}`).digest('hex');
}
