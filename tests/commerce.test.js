import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { normalizeCart, priceCart } from '../shared/cart.js';
import { getConfig } from '../server/config.js';
import { sessionParams, verifySignature } from '../server/stripe.js';

test('prices are recalculated from the server catalog, ignoring supplied totals', () => {
  const result = priceCart([{ id: 'shell', size: 'M', qty: 2, priceCents: 1, total: 1 }]);
  assert.equal(result.subtotal, 176000);
  assert.equal(result.lines[0].priceCents, 88000);
});
test('tampered IDs, sizes, quantities and empty bags are rejected', () => {
  for (const items of [[], null, [{ id: 'shell', size: 'M', qty: -1 }], [{ id: 'shell', size: 'M', qty: 1.5 }], [{ id: 'shell', size: 'M', qty: 6 }], [{ id: 'shell', size: 'XS', qty: 1 }], [{ id: 'fake', size: 'M', qty: 1 }]]) assert.throws(() => priceCart(items));
});
test('duplicate variants cannot bypass purchase limits', () => {
  assert.throws(() => priceCart([{ id: 'shell', size: 'M', qty: 3 }, { id: 'shell', size: 'M', qty: 3 }]));
  assert.deepEqual(normalizeCart([{ id: 'shell', size: 'M', qty: 1 }, { id: 'shell', size: 'M', qty: 2 }]), [{ id: 'shell', size: 'M', qty: 3 }]);
});
test('invalid browser storage is pruned without trusting its prices', () => {
  assert.deepEqual(normalizeCart([null, { id: 'gone', size: 'M', qty: 1 }, { id: 'knit', size: 'L', qty: 1 }], false), [{ id: 'knit', size: 'L', qty: 1 }]);
});
test('checkout fails closed without merchant and service configuration', () => {
  assert.equal(getConfig({}).checkoutReady, false);
  assert.equal(getConfig({ STRIPE_SECRET_KEY: 'sk_test_fake' }).checkoutReady, false);
  const env = { STORE_URL: 'https://example.com', STORE_LIVE: 'true', STORE_CATALOG_APPROVED: 'true', STORE_LEGAL_NAME: 'Test merchant', STORE_BUSINESS_ADDRESS: 'Test address', STORE_CONTACT_EMAIL: 'test@example.com', STORE_COUNTRIES: 'US,GB', STORE_SHIPPING_CENTS: '0', STORE_SHIPPING_POLICY: 'Test shipping', STORE_RETURNS_POLICY: 'Test returns', STORE_TERMS: 'Test terms', SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test-key', STRIPE_SECRET_KEY: 'sk_test_fake', STRIPE_WEBHOOK_SECRET: 'whsec_test', RATE_LIMIT_SALT: 'x'.repeat(32) };
  assert.equal(getConfig(env).checkoutReady, true);
  assert.equal(getConfig({ ...env, STORE_SHIPPING_CENTS: '' }).checkoutReady, false);
  assert.equal(getConfig({ ...env, STORE_CATALOG_APPROVED: 'false' }).checkoutReady, false);
  assert.equal(getConfig({ ...env, STORE_LIVE: 'false' }).checkoutReady, false);
});
test('hosted checkout uses canonical URLs, authoritative prices and restricted destination', () => {
  const order = { id: 'an-order', email: 'buyer@example.com', country: 'US', shipping: 1500, shipping_label: 'Standard', expires_at: new Date(Date.now() + 2100000).toISOString(), ...priceCart([{ id: 'shell', size: 'M', qty: 2 }]) };
  const params = sessionParams(order, { origin: 'https://store.example' });
  assert.equal(params.get('line_items[0][price_data][unit_amount]'), '88000');
  assert.equal(params.get('line_items[0][quantity]'), '2');
  assert.equal(params.get('shipping_address_collection[allowed_countries][0]'), 'US');
  assert.equal(params.get('automatic_tax[enabled]'), 'true');
  assert.match(params.get('success_url'), /^https:\/\/store.example\/checkout\/success/);
});
test('webhooks require a fresh signature over the exact raw bytes', () => {
  const secret = 'test-secret', now = 1792576800000, t = String(now / 1000), raw = Buffer.from('{"type":"checkout.session.completed"}');
  const digest = createHmac('sha256', secret).update(t + '.').update(raw).digest('hex');
  const header = `t=${t},v1=${digest}`;
  assert.equal(verifySignature(raw, header, secret, now).type, 'checkout.session.completed');
  assert.throws(() => verifySignature(Buffer.from('{}'), header, secret, now));
  assert.throws(() => verifySignature(raw, header, secret, now + 301000));
  assert.throws(() => verifySignature(raw, header, 'wrong', now));
});
