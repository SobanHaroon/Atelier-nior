import { createHmac } from 'node:crypto';
import { HttpError, equal } from './http.js';
import { rpc } from './database.js';

export async function stripe(path, { data, idempotencyKey } = {}) {
  const response = await fetch('https://api.stripe.com/v1/' + path, {
    method: data ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, ...(data ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}), ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) },
    ...(data ? { body: data.toString() } : {}), signal: AbortSignal.timeout(15000),
  });
  const result = await response.json();
  if (!response.ok) { const error = new HttpError(503, 'Payment checkout is temporarily unavailable. Your bag is saved; please retry.'); error.definitive = response.status >= 400 && response.status < 500 && ![409, 429].includes(response.status); throw error; }
  return result;
}

export function sessionParams(order, config) {
  const data = new URLSearchParams({ mode: 'payment', 'payment_method_types[0]': 'card', customer_email: order.email, client_reference_id: order.id, 'metadata[order_id]': order.id, 'payment_intent_data[metadata][order_id]': order.id,
    success_url: `${config.origin}/checkout/success?order=${order.id}&session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${config.origin}/checkout?cancelled=1`,
    expires_at: String(Math.floor(new Date(order.expires_at).getTime() / 1000)), 'automatic_tax[enabled]': 'true', billing_address_collection: 'required', 'phone_number_collection[enabled]': 'true', 'shipping_address_collection[allowed_countries][0]': order.country,
    'shipping_options[0][shipping_rate_data][type]': 'fixed_amount', 'shipping_options[0][shipping_rate_data][display_name]': order.shipping_label,
    'shipping_options[0][shipping_rate_data][fixed_amount][amount]': String(order.shipping), 'shipping_options[0][shipping_rate_data][fixed_amount][currency]': 'usd', 'shipping_options[0][shipping_rate_data][tax_behavior]': 'exclusive',
  });
  order.lines.forEach((line, i) => {
    const key = `line_items[${i}]`;
    data.set(`${key}[quantity]`, String(line.qty));
    data.set(`${key}[price_data][currency]`, 'usd');
    data.set(`${key}[price_data][unit_amount]`, String(line.priceCents));
    data.set(`${key}[price_data][tax_behavior]`, 'exclusive');
    data.set(`${key}[price_data][product_data][name]`, `${line.name} / Size ${line.size}`);
    data.set(`${key}[price_data][product_data][metadata][sku]`, `${line.sku}-${line.size}`);
    data.set(`${key}[price_data][product_data][images][0]`, `${config.origin}/images/${line.image}`);
  });
  return data;
}
export function verifySignature(raw, signature, secret, now = Date.now()) {
  if (!secret || typeof signature !== 'string') throw new HttpError(400, 'Invalid signature.');
  const fields = signature.split(',').map(part => part.split('='));
  const timestamp = fields.find(([key]) => key === 't')?.[1];
  if (!/^\d+$/.test(timestamp || '') || Math.abs(now / 1000 - Number(timestamp)) > 300) throw new HttpError(400, 'Invalid signature.');
  const expected = createHmac('sha256', secret).update(timestamp + '.').update(raw).digest('hex');
  if (!fields.some(([key, value]) => key === 'v1' && equal(value, expected))) throw new HttpError(400, 'Invalid signature.');
  try { return JSON.parse(raw.toString()); } catch { throw new HttpError(400, 'Invalid event.'); }
}
export async function syncSession(session, order) {
  if (session.metadata?.order_id !== order.id || session.client_reference_id !== order.id || (order.stripe_session && order.stripe_session !== session.id)) throw new HttpError(409, 'Payment reference does not match this order.');
  if (session.status === 'complete' && session.payment_status === 'paid') {
    const shipping = session.total_details?.amount_shipping;
    const tax = session.total_details?.amount_tax;
    if (session.currency !== 'usd' || session.amount_subtotal !== order.subtotal || shipping !== order.shipping || !Number.isSafeInteger(tax) || tax < 0 || session.amount_total !== order.subtotal + order.shipping + tax) throw new HttpError(409, 'Payment totals need review. Please contact the atelier.');
    return rpc('finish_store_order', { p_id: order.id, p_session: session.id, p_status: 'paid', p_total: session.amount_total, p_customer: { ...session.customer_details, shipping: session.collected_information?.shipping_details || session.shipping_details }, p_payment: session.payment_intent });
  }
  if (session.status === 'expired') return rpc('finish_store_order', { p_id: order.id, p_session: session.id, p_status: 'expired', p_total: null, p_customer: null, p_payment: null });
  return order;
}
