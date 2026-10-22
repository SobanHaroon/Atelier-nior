import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from '../router';
import { useShop } from '../shop';
import { money } from '../products';

export function Icon({ name, ...props }) {
  const paths = {
    bag: <><path d="M5 7h14l1 14H4L5 7Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
    heart: <path d="M20.5 4.7a5.3 5.3 0 0 0-7.5 0L12 5.8l-1.1-1.1a5.3 5.3 0 0 0-7.5 7.5L12 21l8.5-8.8a5.3 5.3 0 0 0 0-7.5Z"/>,
    arrow: <path d="M4 12h16M14 5l7 7-7 7"/>,
    close: <path d="m5 5 14 14M5 19 14-14"/>,
    plus: <path d="M12 4v16M4 12h16"/>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="1"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3"/></>,
    check: <path d="m5 12 4 4L20 5"/>,
    filter: <><path d="M3 7h18M3 17h18"/><circle cx="8" cy="7" r="2"/><circle cx="16" cy="17" r="2"/></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true" {...props}>{paths[name] || paths.arrow}</svg>;
}
export const imageClass = p => (p.crop || '') + (p.isolated ? ' isolated' : '');
export function ProductGrid({ items }) {
  const { wishlist, toggleWish } = useShop();
  return <div className="product-grid">{items.map(p => <motion.article key={p.id} className="product-card" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .35 }}>
    <div className={'product-image ' + imageClass(p)}><Link className="product-open" to={'/products/' + p.id} aria-label={'View ' + p.name}><img src={'/images/' + p.image} alt={p.name} loading="lazy"/><span className="quick-view">Discover piece <Icon name="plus"/></span></Link><span className="product-tag">{p.tag || 'EDITION 07'}</span><button className={'wish-button ' + (wishlist.includes(p.id) ? 'saved' : '')} aria-label={(wishlist.includes(p.id) ? 'Unsave ' : 'Save ') + p.name} aria-pressed={wishlist.includes(p.id)} onClick={() => toggleWish(p.id)}><Icon name="heart"/></button></div>
    <div className="product-meta"><span>{p.category}</span><span>{p.sku}</span></div><div className="product-title"><h3><Link to={'/products/' + p.id}>{p.name}</Link></h3><span>{money(p.price)}</span></div><p>{p.material}</p>
  </motion.article>)}</div>;
}
export function Overlay({ label, children, onClose, drawer = true }) {
  const ref = useRef();
  const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const main = document.querySelector('#page-content');
    if (main) main.inert = true;
    ref.current?.focus();
    const keydown = e => {
      if (e.key === 'Escape') close.current();
      if (e.key !== 'Tab') return;
      const elements = [...ref.current.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select,textarea,[tabindex="0"]')].filter(el => el.getClientRects().length);
      const first = elements[0], last = elements.at(-1);
      if (!first) e.preventDefault();
      else if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = overflow; if (main) main.inert = false; document.removeEventListener('keydown', keydown); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  return <motion.div className={'overlay ' + (drawer ? 'drawer-shade' : '')} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
    <motion.section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={label} className={'dialog ' + (drawer ? 'drawer' : '')} onClick={e => e.stopPropagation()} initial={{ x: drawer ? '100%' : 0, y: drawer ? 0 : 20 }} animate={{ x: 0, y: 0 }} exit={{ x: drawer ? '100%' : 0 }} transition={{ duration: .3 }}>
      <button className="close-button" onClick={onClose} aria-label="Close dialog"><Icon name="close"/></button>{children}
    </motion.section>
  </motion.div>;
}
export function Breadcrumb({ children }) { return <nav className="breadcrumb" aria-label="Breadcrumb"><Link to="/">Home</Link><span>/</span>{children}</nav>; }
export function EmptyState({ title, text, icon = 'bag', action = 'Explore the collection', to = '/catalog' }) { return <div className="empty-state"><Icon name={icon}/><h2>{title}</h2><p>{text}</p><Link className="button red" to={to}>{action}<Icon name="arrow"/></Link></div>; }
export function PageHeading({ eyebrow, title, italic, text }) { return <div className="page-heading"><p className="eyebrow"><span className="red-dot"/>{eyebrow}</p><h1>{title} {italic && <i>{italic}</i>}</h1>{text && <p>{text}</p>}</div>; }
export function Notice({ children, error = false }) { return <div className={'notice ' + (error ? 'notice-error' : '')} role={error ? 'alert' : 'status'}>{children}</div>; }
