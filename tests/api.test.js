import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import checkout from '../api/checkout.js';
import contact from '../api/contact.js';
import orderStatus from '../api/order.js';
import store from '../api/store.js';
import { hash } from '../server/http.js';

const env = {
  STORE_URL: 'https://store.example', STORE_LIVE: 'true', STORE_CATALOG_APPROVED: 'true',
  STORE_LEGAL_NAME: 'Test merchant', STORE_BUSINESS_ADDRESS: 'Test address', STORE_CONTACT_EMAIL: 'store@example.com',
  STORE_COUNTRIES: 'US,GB', STORE_SHIPPING_CENTS: '1500', STORE_SHIPPING_LABEL: 'Standard delivery',
  STORE_SHIPPING_POLICY: 'Test shipping', STORE_RETURNS_POLICY: 'Test returns', STORE_TERMS: 'Test terms',
  SUPABASE_URL: 'https://database.example', SUPABASE_SERVICE_ROLE_KEY: 'test-database-key',
  STRIPE_SECRET_KEY: 'sk_test_fixture', STRIPE_WEBHOOK_SECRET: 'whsec_fixture', RATE_LIMIT_SALT: 'x'.repeat(32),
  RESEND_API_KEY: 'test-mail-key', CONTACT_FROM: 'store@example.com', CONTACT_TO: 'inbox@example.com',
};
const id = 'a1111111-1111-4111-8111-111111111111', token = 'a'.repeat(64);
const input = () => ({ attemptId: id, receiptToken: token, email: 'buyer@example.com', country: 'US', acceptedTerms: true, items: [{ id: 'shell', size: 'M', qty: 1, priceCents: 1 }] });
const message = () => ({ id, name: 'Test customer', email: 'customer@example.com', topic: 'Product & sizing', message: 'Can you help with the fit?', consent: true });
let originalEnv, originalFetch;
beforeEach(() => {
  originalEnv = { ...process.env }; originalFetch = globalThis.fetch; Object.assign(process.env, env);
  globalThis.fetch = async () => { throw new Error('Unexpected external request'); };
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
  Object.assign(process.env, originalEnv);
});
const response = (data, status = 200) => new Response(status === 204 ? null : JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
async function call(handler, { method = 'POST', body, headers = {}, url = '/' } = {}) {
  const req = Readable.from(body === undefined ? [] : [JSON.stringify(body)]);
  Object.assign(req, { method, url, headers: { origin: env.STORE_URL, 'content-type': 'application/json', ...headers }, socket: { remoteAddress: '127.0.0.1' } });
  const res = { headers: {}, setHeader(key, value) { this.headers[key.toLowerCase()] = value; }, end(value) { this.data = JSON.parse(value); } };
  await handler(req, res); return res;
}
function checkoutFetch({ existing = false, reject = false } = {}) {
  const calls = []; let reserved;
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/take_store_rate_limit')) return response(true);
    if (url.endsWith('/reserve_store_order')) {
      reserved = { ...JSON.parse(options.body).p_order, status: 'reserved', expires_at: new Date(Date.now() + 2100000).toISOString(), ...(existing ? { checkout_url: 'https://checkout.stripe.com/existing' } : {}) };
      return response(reserved);
    }
    if (url === 'https://api.stripe.com/v1/checkout/sessions') {
      if (reject) return response({ error: { message: 'Provider rejected' } }, 400);
      return response({ id: 'cs_fixture', url: 'https://checkout.stripe.com/fixture' });
    }
    if (url.endsWith('/attach_store_checkout') || url.endsWith('/finish_store_order')) return response(null);
    throw new Error('Unexpected external request');
  };
  return calls;
}

test('API guards reject wrong methods and origins and keep unconfigured checkout closed', async () => {
  assert.equal((await call(checkout, { method: 'GET' })).statusCode, 405);
  assert.equal((await call(checkout, { body: input(), headers: { origin: 'https://other.example' } })).statusCode, 403);
  process.env.STORE_LIVE = 'false';
  assert.equal((await call(checkout, { body: input() })).statusCode, 503);
});
test('checkout rejects invalid variants, ownership tokens and missing consent before providers', async () => {
  for (const value of [{ ...input(), receiptToken: 'bad' }, { ...input(), acceptedTerms: false }, { ...input(), items: [{ id: 'shell', size: 'XS', qty: 1 }] }]) {
    assert.equal((await call(checkout, { body: value })).statusCode, 400);
  }
});
test('checkout sends authoritative prices and an idempotency key to Stripe', async () => {
  const calls = checkoutFetch(); const result = await call(checkout, { body: input() });
  assert.equal(result.statusCode, 200); assert.equal(result.data.url, 'https://checkout.stripe.com/fixture');
  const payment = calls.find(c => c.url.startsWith('https://api.stripe.com/'));
  assert.equal(new URLSearchParams(payment.options.body).get('line_items[0][price_data][unit_amount]'), '88000');
  assert.equal(payment.options.headers['Idempotency-Key'], `atelier-checkout-${id}`);
  const saved = JSON.parse(calls.find(c => c.url.endsWith('/reserve_store_order')).options.body).p_order;
  assert.equal(saved.token_hash, hash(token)); assert.equal(saved.subtotal, 88000);
  assert.ok(!JSON.stringify(result.data).includes(token));
});
test('resuming an existing checkout does not create another payment session', async () => {
  const calls = checkoutFetch({ existing: true }); const result = await call(checkout, { body: input() });
  assert.equal(result.data.url, 'https://checkout.stripe.com/existing');
  assert.equal(calls.some(c => c.url.startsWith('https://api.stripe.com/')), false);
});
test('stock is retained on uncertain payment creation and released only after definitive rejection', async () => {
  let calls = checkoutFetch(); const base = globalThis.fetch;
  globalThis.fetch = async (url, options) => url.startsWith('https://api.stripe.com/') ? response({}, 500) : base(url, options);
  assert.equal((await call(checkout, { body: input() })).statusCode, 503);
  assert.equal(calls.some(c => c.url.endsWith('/finish_store_order')), false);
  calls = checkoutFetch({ reject: true });
  assert.equal((await call(checkout, { body: input() })).statusCode, 503);
  assert.equal(JSON.parse(calls.find(c => c.url.endsWith('/finish_store_order')).options.body).p_status, 'failed');
});
test('order receipts require their bearer token and omit private customer information', async () => {
  globalThis.fetch = async () => response([{ id, token_hash: hash(token), status: 'paid', lines: [], subtotal: 88000, shipping: 1500, amount_total: 89500, email: 'private@example.com', customer: { address: 'Private address' } }]);
  assert.equal((await call(orderStatus, { method: 'GET', url: `/?id=${id}` })).statusCode, 404);
  assert.equal((await call(orderStatus, { method: 'GET', url: `/?id=${id}`, headers: { authorization: `Bearer ${'b'.repeat(64)}` } })).statusCode, 404);
  const result = await call(orderStatus, { method: 'GET', url: `/?id=${id}`, headers: { authorization: `Bearer ${token}` } });
  assert.equal(result.data.status, 'paid');
  assert.equal('email' in result.data, false); assert.equal('customer' in result.data, false); assert.equal('token_hash' in result.data, false);
});
test('contact rejects unconfigured service, honeypot and invalid submissions', async () => {
  process.env.RESEND_API_KEY = '';
  assert.equal((await call(contact, { body: message() })).statusCode, 503);
  process.env.RESEND_API_KEY = env.RESEND_API_KEY;
  for (const body of [{ ...message(), website: 'spam' }, { ...message(), consent: false }, { ...message(), message: 'short' }]) assert.equal((await call(contact, { body })).statusCode, 400);
});
test('contact persists before provider delivery and uses only the configured recipient', async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/take_store_rate_limit')) return response(true);
    if (url.endsWith('/save_store_message')) return response(JSON.parse(options.body).p_message);
    if (url === 'https://api.resend.com/emails') return response({ id: 'mail_fixture' });
    if (options.method === 'PATCH') return response(null, 204);
    throw new Error('Unexpected external request');
  };
  const result = await call(contact, { body: { ...message(), to: 'attacker@example.com' } });
  assert.equal(result.data.sent, true);
  const sendIndex = calls.findIndex(c => c.url === 'https://api.resend.com/emails');
  assert.ok(calls.findIndex(c => c.url.endsWith('/save_store_message')) < sendIndex);
  const sent = JSON.parse(calls[sendIndex].options.body);
  assert.deepEqual(sent.to, [env.CONTACT_TO]); assert.equal(sent.reply_to, message().email);
  assert.equal(calls[sendIndex].options.headers['Idempotency-Key'], `atelier-contact-${id}`);
});
test('public store configuration never exposes provider secrets', async () => {
  process.env.STORE_LIVE = 'false';
  const result = await call(store, { method: 'GET' });
  assert.equal(result.statusCode, 200); assert.equal(result.data.checkoutReady, false);
  for (const key of ['SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'RESEND_API_KEY', 'RATE_LIMIT_SALT']) assert.equal(JSON.stringify(result.data).includes(env[key]), false);
});
