import { endpoint, json, equal, HttpError } from '../server/http.js';
import { getConfig } from '../server/config.js';
import { db } from '../server/database.js';
import { stripe, syncSession } from '../server/stripe.js';
export default endpoint(['POST'], async (req, res) => {
  if (!process.env.RECONCILE_SECRET || !equal(req.headers.authorization, `Bearer ${process.env.RECONCILE_SECRET}`)) throw new HttpError(401, 'Unauthorized.');
  if (!getConfig().databaseReady) throw new HttpError(503, 'Order service is not configured.');
  const orders = await db('store_orders?status=in.(checkout,reserved)&select=*&order=created_at.asc&limit=100');
  let updated = 0, review = 0;
  for (const order of orders) {
    if (!order.stripe_session) { review++; continue; }
    const current = await syncSession(await stripe('checkout/sessions/' + encodeURIComponent(order.stripe_session)), order);
    if (current.status !== order.status) updated++;
  }
  json(res, 200, { checked: orders.length, updated, requiresReview: review });
});
