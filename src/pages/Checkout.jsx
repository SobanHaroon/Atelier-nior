import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from '../router';
import { useShop } from '../shop';
import { products, cents } from '../products';
import { request, newId, newToken } from '../client';
import { Breadcrumb, PageHeading, EmptyState, Icon, Notice, imageClass } from '../components/ui';

export default function Checkout() {
  const { cart, count, subtotal, store, refreshStore } = useShop();
  const [params] = useSearchParams();
  function savedField(field) { try { return JSON.parse(JSON.parse(sessionStorage.getItem('noir-checkout-attempt')).fingerprint)[field] || ''; } catch { return ''; } }
  const [email, setEmail] = useState(() => savedField('email')), [country, setCountry] = useState(() => savedField('country')), [terms, setTerms] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const submitLock = useRef(false);
  useEffect(() => { refreshStore(); }, [refreshStore]);
  const destination = country || store.countries[0] || '';
  const outOfStock = cart.some(c => store.inventory && (store.inventory[`${c.id}:${c.size}`] || 0) < c.qty);
  async function checkout(e) {
    e.preventDefault(); if (submitLock.current) return;
    submitLock.current = true; setBusy(true); setError('');
    try {
      const fingerprint = JSON.stringify({ cart, email: email.trim().toLowerCase(), country: destination, shipping: store.shippingCents });
      let attempt;
      try { attempt = JSON.parse(sessionStorage.getItem('noir-checkout-attempt')); } catch {}
      if (!attempt || attempt.fingerprint !== fingerprint) attempt = { fingerprint, id: newId(), token: newToken() };
      // Save the bearer receipt token before redirecting; never place it in a URL.
      sessionStorage.setItem('noir-checkout-attempt', JSON.stringify(attempt));
      sessionStorage.setItem('noir-receipt-' + attempt.id, attempt.token);
      const result = await request('/api/checkout', { data: { items: cart, email: email.trim(), country: destination, acceptedTerms: terms, attemptId: attempt.id, receiptToken: attempt.token } });
      if (result.completed) window.location.assign('/checkout/success?order=' + result.orderId);
      else if (typeof result.url === 'string' && new URL(result.url).origin === 'https://checkout.stripe.com') window.location.assign(result.url);
      else throw new Error('The payment page could not be opened. Please retry.');
    } catch (err) {
      if (err.status === 409) sessionStorage.removeItem('noir-checkout-attempt');
      setError(err.name === 'QuotaExceededError' || err.name === 'SecurityError' ? 'Allow session storage in this browser to continue securely.' : err.message || 'Could not reach checkout. Please retry.');
      refreshStore(); submitLock.current = false; setBusy(false);
    }
  }
  if (!count) return <div className="commerce-page"><Breadcrumb><span>Checkout</span></Breadcrumb><EmptyState title="Your next chapter starts with a piece." text="Add a piece to your bag before checking out."/></div>;
  const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
  return <div className="commerce-page checkout-page"><Breadcrumb><Link to="/cart">Your bag</Link><span>/</span><span>Checkout</span></Breadcrumb><PageHeading eyebrow="The final details" title="Complete your" italic="edit."/>
    <div className="checkout-layout"><form className="checkout-form" onSubmit={checkout} aria-label="Checkout details">
      {params.has('cancelled') && <Notice>Payment was cancelled. Your bag is still here. Continue below when you’re ready.</Notice>}
      {!store.loading && !store.checkoutReady && <Notice>Online checkout is not open yet. Your bag is saved for later. <Link to="/contact">Contact the atelier</Link></Notice>}
      {store.testMode && store.checkoutReady && <Notice>Test checkout. Use test payment details only; no real payment will be taken.</Notice>}
      {error && <Notice error>{error}</Notice>}
      {outOfStock && <Notice>Some pieces may be reserved or sold out. Continue to check your existing reservation, or <Link to="/cart">review your bag</Link>.</Notice>}
      <fieldset disabled={busy}><legend><span>01</span>Contact</legend><label htmlFor="checkout-email">Email address</label><input id="checkout-email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)}/><p className="field-hint">Used for your order and payment receipt.</p></fieldset>
      <fieldset disabled={busy}><legend><span>02</span>Delivery</legend><label htmlFor="delivery-country">Ship to</label><select id="delivery-country" value={destination} onChange={e => setCountry(e.target.value)} required><option value="" disabled>{store.loading ? 'Loading destinations…' : 'Destinations available when ordering opens'}</option>{store.countries.map(c => <option key={c} value={c}>{regionNames.of(c)}</option>)}</select>
        <div className="delivery-choice"><Icon name="check"/><div><strong>{store.shippingLabel || 'Standard delivery'}</strong><p>{store.policies?.shipping || 'Delivery options are confirmed before payment.'}</p></div><span>{store.shippingCents == null ? '—' : store.shippingCents === 0 ? 'Complimentary' : cents(store.shippingCents)}</span></div>
        <p className="field-hint">Enter your full shipping address on the next, secure payment page.</p></fieldset>
      <fieldset disabled={busy}><legend><span>03</span>Secure payment</legend><div className="payment-info"><Icon name="lock"/><div><strong>Your details. Protected.</strong><p>Continue to Stripe to enter your address, review final taxes, and pay securely. Card details never pass through this website.</p></div></div><div className="payment-methods"><span>VISA</span><span>mastercard</span><span>AMEX</span><span>Stripe</span></div>
        <label className="checkbox-label"><input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)} required/><span>I agree to the <Link to="/terms" target="_blank" rel="noopener">terms of sale</Link> and have read the <Link to="/privacy" target="_blank" rel="noopener">privacy notice</Link> and <Link to="/delivery-returns" target="_blank" rel="noopener">delivery & returns policy</Link>.</span></label>
      </fieldset>
      <button className="button red checkout-submit" type="submit" disabled={busy || store.loading || !store.checkoutReady}>{busy ? 'Opening secure checkout…' : store.loading ? 'Checking availability…' : !store.checkoutReady ? 'Checkout opening soon' : 'Continue to secure payment'}<Icon name="lock"/></button><p className="checkout-footnote">You’ll review the final total before paying. <Link to="/cart">Return to your bag</Link></p>
    </form><aside className="order-summary checkout-summary"><div className="summary-heading"><h2>Your edit</h2><Link className="text-link" to="/cart">Edit bag</Link></div><div className="checkout-lines">{cart.map(c => { const p = products.find(p => p.id === c.id); return <div className="checkout-line" key={c.id + c.size}><div className={'checkout-thumb ' + imageClass(p)}><img src={'/images/' + p.image} alt=""/></div><div><h3>{p.name}</h3><p>{p.color} / Size {c.size} / Qty {c.qty}</p><strong>{cents(p.priceCents * c.qty)}</strong></div></div>; })}</div><dl><div><dt>Subtotal</dt><dd>{cents(subtotal)}</dd></div><div><dt>Delivery</dt><dd>{store.shippingCents == null ? 'To be confirmed' : store.shippingCents === 0 ? 'Complimentary' : cents(store.shippingCents)}</dd></div><div><dt>Taxes</dt><dd>Calculated at payment</dd></div></dl><div className="summary-total"><span>Before tax{store.shippingCents == null ? ' & delivery' : ''}</span><strong>{cents(subtotal + (store.shippingCents || 0))} <small>USD</small></strong></div><Link className="summary-help" to="/contact">Need a hand? Contact the atelier ↗</Link></aside></div>
  </div>;
}

export function OrderResult() {
  const [params] = useSearchParams(); const id = params.get('order');
  const { removePurchased } = useShop();
  const [order, setOrder] = useState(null), [error, setError] = useState(''), [loading, setLoading] = useState(true), [reload, setReload] = useState(0);
  const cleared = useRef(false);
  useEffect(() => {
    const controller = new AbortController(); let timer;
    async function load(attempt = 0) {
      try {
        const token = sessionStorage.getItem('noir-receipt-' + id);
        if (!id || !token) throw new Error('Open this page in the browser used for checkout. Your payment receipt is also available from Stripe.');
        const result = await request('/api/order?id=' + encodeURIComponent(id), { token, signal: controller.signal });
        setOrder(result); setError(''); setLoading(false);
        if (result.status === 'paid') {
          if (!cleared.current && !sessionStorage.getItem('noir-cleared-' + id)) { cleared.current = true; sessionStorage.setItem('noir-cleared-' + id, 'true'); removePurchased(result.lines); }
          sessionStorage.removeItem('noir-checkout-attempt');
        } else if (!['expired', 'failed'].includes(result.status) && attempt < 4) timer = setTimeout(() => load(attempt + 1), 2000);
      } catch (err) { if (err.name !== 'AbortError') { setError(err.message); setLoading(false); } }
    }
    load(); return () => { controller.abort(); clearTimeout(timer); };
  }, [id, reload]);
  const paid = order?.status === 'paid';
  return <div className="commerce-page order-result"><div className="receipt-symbol"><Icon name={paid ? 'check' : 'bag'}/></div><PageHeading eyebrow={paid ? order.testMode ? 'Test order confirmed' : 'Payment confirmed' : 'Your order'} title={paid ? 'A considered' : loading ? 'Checking your' : 'Your next'} italic={paid ? 'choice.' : loading ? 'payment.' : 'chapter.'}/>
    {error && <Notice error>{error}</Notice>}
    {paid ? <><p>Your order is confirmed. Thank you for choosing Atelier Noir.</p><div className="receipt-card"><span className="eyebrow">Order reference</span><strong className="order-reference">{order.id}</strong>{order.lines.map(line => <div className="receipt-line" key={line.id + line.size}><span>{line.name}<small>Size {line.size} · Qty {line.qty}</small></span><span>{cents(line.priceCents * line.qty)}</span></div>)}<div className="receipt-line"><span>Delivery</span><span>{cents(order.shipping)}</span></div><div className="receipt-line"><span>Tax</span><span>{cents(order.total - order.subtotal - order.shipping)}</span></div><div className="summary-total"><span>Paid</span><strong>{cents(order.total)}</strong></div><button className="text-link" onClick={() => window.print()}>Print order confirmation ↗</button></div></> : order && <Notice>{['expired', 'failed'].includes(order.status) ? 'This payment session has ended. Your bag is saved; you can start again.' : 'We’re waiting for verified payment confirmation. Your order will appear here once payment is confirmed. Do not pay again while confirmation is pending.'}</Notice>}
    {!loading && !paid && <button className="button outline" onClick={() => { setLoading(true); setReload(n => n + 1); }}>Check status again</button>}<div className="receipt-actions"><Link className="button red" to={paid ? '/catalog' : '/cart'}>{paid ? 'Explore the collection' : 'Return to bag'}<Icon name="arrow"/></Link><Link className="text-link" to="/contact">Contact the atelier</Link></div>
  </div>;
}
