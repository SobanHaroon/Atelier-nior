import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { priceCart } from '../shared/cart.js';
let db;
before(async () => {
  db = new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to anon, authenticated, service_role;');
  await db.exec(await readFile(new URL('../supabase/migrations/202610210001_store.sql', import.meta.url), 'utf8'));
});
beforeEach(async () => { await db.exec('reset role; delete from public.store_orders; delete from public.store_rate_limits; update public.store_inventory set stock = 3;'); });
after(async () => { await db?.close(); });
const order = (items = [{ id: 'shell', size: 'M', qty: 1 }]) => ({ id: randomUUID(), token_hash: 'owner-token', fingerprint: 'basket-fingerprint', email: 'test@example.com', country: 'US', shipping: 1000, shipping_label: 'Standard', ...priceCart(items) });
const reserve = async value => (await db.query('select public.reserve_store_order($1::jsonb) as value', [JSON.stringify(value)])).rows[0].value;
const stock = async () => (await db.query("select stock from public.store_inventory where product_id = 'shell' and size = 'M'")).rows[0].stock;
const finish = async (id, status, session = 'cs_test', total = 89000) => (await db.query('select public.finish_store_order($1,$2,$3,$4,$5,$6) as value', [id, session, status, total, '{}', 'pi_test'])).rows[0].value;

test('schema denies anonymous and signed-in clients direct orders, inventory writes and RPC access', async () => {
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`set role ${role}`);
    await assert.rejects(db.query('select * from public.store_orders'), /permission denied/);
    await assert.rejects(db.query("update public.store_inventory set stock=999"), /permission denied/);
    await assert.rejects(reserve(order()), /permission denied/);
    await db.exec('reset role');
  }
});
test('server role reserves inventory atomically and retries do not reserve twice', async () => {
  await db.exec('set role service_role'); const input = order();
  const first = await reserve(input); const second = await reserve(input);
  assert.equal(first.id, second.id); assert.equal(await stock(), 2);
});
test('a different receipt owner or changed basket cannot reuse an order ID', async () => {
  const input = order(); await reserve(input);
  await assert.rejects(reserve({ ...input, token_hash: 'another-owner' }), /REQUEST_CONFLICT/);
  await assert.rejects(reserve({ ...input, fingerprint: 'another-basket' }), /REQUEST_CONFLICT/);
  assert.equal(await stock(), 2);
});
test('insufficient stock rolls back the entire basket and order', async () => {
  const input = order([{ id: 'coat', size: '48', qty: 1 }, { id: 'shell', size: 'M', qty: 4 }]);
  await assert.rejects(reserve(input), /INSUFFICIENT_STOCK/);
  assert.equal((await db.query("select stock from public.store_inventory where product_id='coat' and size='48'")).rows[0].stock, 3);
  assert.equal((await db.query('select count(*) from public.store_orders')).rows[0].count, 0);
});
test('a competing checkout cannot oversell the remaining stock', async () => {
  await reserve(order([{ id: 'shell', size: 'M', qty: 2 }]));
  await assert.rejects(reserve(order([{ id: 'shell', size: 'M', qty: 2 }])), /INSUFFICIENT_STOCK/);
  assert.equal(await stock(), 1);
});
test('duplicate paid webhooks and late expiry cannot release sold inventory', async () => {
  const input = order(); await reserve(input);
  const paid = await finish(input.id, 'paid'); assert.equal(paid.status, 'paid');
  await finish(input.id, 'paid'); const late = await finish(input.id, 'expired');
  assert.equal(late.status, 'paid'); assert.equal(await stock(), 2);
});
test('verified expiration restores inventory exactly once', async () => {
  const input = order(); await reserve(input);
  await finish(input.id, 'expired'); await finish(input.id, 'expired');
  assert.equal(await stock(), 3);
  await assert.rejects(finish(input.id, 'paid'), /PAYMENT_REQUIRES_REVIEW/);
});
test('a conflicting Stripe session cannot change an attached order', async () => {
  const input = order(); await reserve(input);
  await db.query('select public.attach_store_checkout($1,$2,$3)', [input.id, 'cs_owned', 'https://checkout.stripe.com/test']);
  await assert.rejects(finish(input.id, 'paid', 'cs_other'), /REQUEST_CONFLICT/);
});
test('durable rate limiting counts attempts across calls', async () => {
  const check = async () => (await db.query('select public.take_store_rate_limit($1,$2,$3) as allowed', ['test-key', 2, 900])).rows[0].allowed;
  assert.equal(await check(), true); assert.equal(await check(), true); assert.equal(await check(), false);
});
