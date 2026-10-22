import React from 'react';
import { Link } from '../router';
import { useShop } from '../shop';
import { cents, products } from '../products';
import { CartItems } from '../components/Layout';
import { Breadcrumb, PageHeading, EmptyState, Icon, ProductGrid } from '../components/ui';
export default function Cart() {
  const { cart, count, subtotal } = useShop();
  return <div className="commerce-page"><Breadcrumb><span>Your bag</span></Breadcrumb><PageHeading eyebrow={`${String(count).padStart(2, '0')} pieces / Your next chapter`} title="Your considered" italic="edit."/>
    {!count ? <EmptyState title="A little space for something considered." text="Explore the collection and make it your own."/> : <><div className="cart-layout"><div><CartItems/><Link className="inline-link" to="/catalog">Continue exploring <Icon name="arrow"/></Link></div><aside className="order-summary"><span className="eyebrow">The details</span><h2>Order summary</h2><dl><div><dt>Subtotal · {count} {count === 1 ? 'piece' : 'pieces'}</dt><dd>{cents(subtotal)}</dd></div><div><dt>Delivery</dt><dd>At checkout</dd></div><div><dt>Taxes</dt><dd>At payment</dd></div></dl><div className="summary-total"><span>Subtotal</span><strong>{cents(subtotal)} <small>USD</small></strong></div><Link className="button red" to="/checkout">Continue to checkout <Icon name="arrow"/></Link><p className="secure-note"><Icon name="lock"/>Secure payment through Stripe</p><p className="summary-note">Your pieces are reserved when a secure payment session begins.</p><Link className="text-link" to="/delivery-returns">Delivery & returns ↗</Link></aside></div><section className="related-products"><div className="section-heading"><div><p className="eyebrow">A considered addition</p><h2>Complete your <i>uniform.</i></h2></div></div><ProductGrid items={products.filter(p => !cart.some(c => c.id === p.id)).slice(0, 3)}/></section></>}
  </div>;
}
