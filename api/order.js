import { endpoint, json, HttpError, uuid, hash, equal } from '../server/http.js';
import { getConfig } from '../server/config.js';
import { db } from '../server/database.js';
import { stripe, syncSession } from '../server/stripe.js';
export default endpoint(['GET'], async (req, res) => {
  if (!getConfig().databaseReady) throw new HttpError(503, 'Order status is temporarily unavailable.');
  const id = new URL(req.url, 'https://store.local').searchParams.get('id');
  const token = String(req.headers.authorization || '').replace(/^Bearer /, '');
  if (!uuid(id) || !/^[a-f0-9]{64}$/.test(token)) throw new HttpError(404, 'Order not found. Return in the browser used for checkout.');
  const [order] = await db(`store_orders?id=eq.${id}&select=*`);
  if (!order || !equal(hash(token), order.token_hash)) throw new HttpError(404, 'Order not found. Return in the browser used for checkout.');
  let current = order;
  if (order.stripe_session && !['paid', 'expired', 'failed'].includes(order.status)) current = await syncSession(await stripe('checkout/sessions/' + encodeURIComponent(order.stripe_session)), order);
  json(res, 200, { id: current.id, status: current.status, lines: current.lines, subtotal: current.subtotal, shipping: current.shipping, total: current.amount_total, paidAt: current.paid_at, testMode: getConfig().testMode });
});
