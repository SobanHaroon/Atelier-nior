import { endpoint, json, rawBody, HttpError, uuid } from '../server/http.js';
import { verifySignature, stripe, syncSession } from '../server/stripe.js';
import { db } from '../server/database.js';
export const config = { api: { bodyParser: false } };
export default endpoint(['POST'], async (req, res) => {
  if (!process.env.STRIPE_WEBHOOK_SECRET) throw new HttpError(503, 'Webhook is not configured.');
  const event = verifySignature(await rawBody(req, 262144), req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  if (['checkout.session.completed', 'checkout.session.expired', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
    const id = event.data?.object?.metadata?.order_id;
    if (!uuid(id)) { json(res, 200, { received: true }); return; }
    const [order] = await db(`store_orders?id=eq.${id}&select=*`);
    if (!order) throw new HttpError(409, 'Order not yet available.');
    // Re-read Stripe so delayed/replayed events cannot regress payment state.
    const session = await stripe('checkout/sessions/' + encodeURIComponent(event.data.object.id));
    await syncSession(session, order);
  }
  json(res, 200, { received: true });
});
