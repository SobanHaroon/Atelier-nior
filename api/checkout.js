import { endpoint, json, body, sameOrigin, HttpError, uuid, emailValid, hash } from '../server/http.js';
import { getConfig } from '../server/config.js';
import { limit, rpc } from '../server/database.js';
import { stripe, sessionParams } from '../server/stripe.js';
import { priceCart } from '../shared/cart.js';

export default endpoint(['POST'], async (req, res) => {
  sameOrigin(req);
  const config = getConfig();
  if (!config.checkoutReady) throw new HttpError(503, 'Online checkout is not open yet. Your bag is saved for later.');
  const input = await body(req);
  if (!uuid(input.attemptId) || typeof input.receiptToken !== 'string' || !/^[a-f0-9]{64}$/.test(input.receiptToken)) throw new HttpError(400, 'Start a new checkout and try again.');
  if (!emailValid(input.email) || !config.countries.includes(input.country) || input.acceptedTerms !== true) throw new HttpError(400, 'Check your email, delivery country and acceptance of the terms.');
  let priced;
  try { priced = priceCart(input.items); } catch (error) { throw new HttpError(400, error.message); }
  await limit(req, 'checkout', 12, 3600);
  const email = input.email.trim().toLowerCase();
  const fingerprint = hash(JSON.stringify({ lines: priced.lines, email, country: input.country, shipping: config.shippingCents, shippingLabel: config.shippingLabel }));
  const order = await rpc('reserve_store_order', { p_order: { id: input.attemptId, token_hash: hash(input.receiptToken), fingerprint, email, country: input.country, lines: priced.lines, subtotal: priced.subtotal, shipping: config.shippingCents, shipping_label: config.shippingLabel } });
  if (order.status === 'paid') { json(res, 200, { completed: true, orderId: order.id }); return; }
  if (['expired', 'failed'].includes(order.status) || new Date(order.expires_at).getTime() < Date.now()) throw new HttpError(409, 'This checkout has expired. Start a new checkout to refresh availability.');
  if (order.checkout_url) { json(res, 200, { url: order.checkout_url, orderId: order.id }); return; }
  let session;
  try { session = await stripe('checkout/sessions', { data: sessionParams(order, config), idempotencyKey: `atelier-checkout-${order.id}` }); }
  catch (error) {
    // Only a definitive rejection permits release. Network timeouts may hide a created session.
    if (error.definitive) await rpc('finish_store_order', { p_id: order.id, p_session: null, p_status: 'failed', p_total: null, p_customer: null, p_payment: null });
    throw error;
  }
  if (!session.url?.startsWith('https://checkout.stripe.com/')) throw new HttpError(503, 'Payment checkout is temporarily unavailable. Please retry.');
  await rpc('attach_store_checkout', { p_id: order.id, p_session: session.id, p_url: session.url });
  json(res, 200, { url: session.url, orderId: order.id });
});
