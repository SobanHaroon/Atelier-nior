import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, NavLink, useLocation, useNavigate } from '../router';
import { useShop } from '../shop';
import { products, cents, money, MAX_QUANTITY } from '../products';
import { Icon, Overlay, EmptyState, imageClass } from './ui';

export function CartItems({ compact = false }) {
  const { cart, quantity, remove, store } = useShop();
  return <div className={'cart-items ' + (compact ? 'compact' : '')}>{cart.map(c => {
    const p = products.find(p => p.id === c.id);
    const stock = store.inventory?.[`${c.id}:${c.size}`];
    return <article className="cart-item" key={c.id + c.size}>
      <Link className={'cart-thumb ' + imageClass(p)} to={'/products/' + p.id}><img src={'/images/' + p.image} alt={p.name}/></Link>
      <div><span className="eyebrow">{p.category}</span><h3><Link to={'/products/' + p.id}>{p.name}</Link></h3><p>{p.color} / Size {c.size}</p>
        <div className="quantity"><button aria-label={'Decrease ' + p.name + ' size ' + c.size} onClick={() => quantity(c, -1)}>−</button><span aria-live="polite">{c.qty}</span><button aria-label={'Increase ' + p.name + ' size ' + c.size} onClick={() => quantity(c, 1)} disabled={c.qty >= MAX_QUANTITY || (stock != null && c.qty >= stock)}>+</button></div>
        {stock != null && stock < c.qty && <p className="field-error">{stock ? `Only ${stock} available. Reduce quantity to continue.` : 'This size is currently sold out.'}</p>}
      </div><div className="cart-item-end"><button aria-label={'Remove ' + p.name + ' size ' + c.size} onClick={() => remove(c)}><Icon name="close"/></button><span>{cents(p.priceCents * c.qty)}</span></div>
    </article>;
  })}</div>;
}
function SearchDrawer({ close }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const found = products.filter(p => `${p.name} ${p.category} ${p.material} ${p.color}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <><div className="drawer-header"><span className="eyebrow">ATELIER NOIR / SEARCH</span><h2>Find your <i>form.</i></h2></div>
    <form className="search-field" role="search" onSubmit={e => { e.preventDefault(); navigate('/catalog?q=' + encodeURIComponent(query)); close(); }}><Icon name="search"/><input autoFocus type="search" aria-label="Search pieces" placeholder="A piece, a material, a feeling…" maxLength={100} value={query} onChange={e => setQuery(e.target.value)}/><button type="submit" aria-label="See search results"><Icon name="arrow"/></button></form>
    <p className="search-caption">{query ? `${found.length} ${found.length === 1 ? 'piece' : 'pieces'} found` : 'Explore the collection'}</p>
    <div className="result-list">{found.map(p => <Link className="result-item" key={p.id} to={'/products/' + p.id} onClick={close}><div className={'result-thumb ' + imageClass(p)}><img src={'/images/' + p.image} alt=""/></div><span><small>{p.category}</small><b>{p.name}</b><small>{money(p.price)}</small></span><Icon name="arrow"/></Link>)}</div>
    {!found.length && <div className="no-results"><h3>No pieces found.</h3><p>Try “wool”, “shell”, or “tailoring”.</p><button className="inline-link" onClick={() => setQuery('')}>Clear your search</button></div>}
  </>;
}
export function Layout({ children }) {
  const { count, wishlist, subtotal, toast, setToast, bagOpen, setBagOpen, searchOpen, setSearchOpen } = useShop();
  const location = useLocation();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const [query, setQuery] = useState('');
  useEffect(() => { setMenu(false); setBagOpen(false); setSearchOpen(false); }, [location.pathname, location.search, setBagOpen, setSearchOpen]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
      else { window.scrollTo({ top: 0, behavior: 'instant' }); document.getElementById('page-content')?.focus({ preventScroll: true }); }
    });
    return () => cancelAnimationFrame(frame);
  }, [location.pathname, location.hash]);
  return <>
    <a href="#page-content" className="skip-link">Skip to main content</a>
    <header className="site-header">
      <Link to="/" className="brand" aria-label="Atelier Noir home"><svg viewBox="0 0 46 38" aria-hidden="true"><path className="brand-line" d="m3 34 14-30 14 30M9 23h15M27 34V5l15 29V4"/></svg><span>ATELIER<br/><b>NOIR</b></span></Link>
      <nav className="main-nav" aria-label="Main navigation"><NavLink to="/catalog">Collection <span>07</span></NavLink><Link to="/#atelier">The atelier</Link><NavLink to="/contact">Contact</NavLink></nav>
      <div className="header-actions">
        <form className="header-search" role="search" onSubmit={e => { e.preventDefault(); navigate('/catalog?q=' + encodeURIComponent(query)); setQuery(''); }}><input type="search" aria-label="Search the collection" placeholder="Find your form" value={query} maxLength={100} onChange={e => setQuery(e.target.value)}/><button aria-label="Submit search"><Icon name="search"/></button></form>
        <button className="search-toggle" aria-label="Search collection" onClick={() => { setMenu(false); setBagOpen(false); setSearchOpen(true); }}><Icon name="search"/></button>
        <Link className="wish-header" aria-label={'Saved pieces, ' + wishlist.length + ' items'} to="/wishlist"><Icon name="heart"/>{wishlist.length > 0 && <sup>{wishlist.length}</sup>}</Link>
        <button className="bag-button" onClick={() => { setMenu(false); setSearchOpen(false); setBagOpen(true); }} aria-label={'Open bag, ' + count + ' items'}>Bag <span>{String(count).padStart(2, '0')}</span></button>
        <button className="mobile-menu" onClick={() => setMenu(true)} aria-label="Open menu">Menu <Icon name="plus"/></button>
      </div>
    </header>
    <main id="page-content" tabIndex={-1}>{children}</main>
    <footer><div className="footer-top"><Link to="/" className="footer-brand">ATELIER<span>NOIR</span></Link><div><p className="eyebrow">The collection</p><Link to="/catalog">All pieces</Link><Link to="/catalog?category=Outerwear">Outerwear</Link><Link to="/catalog?category=Tailoring">Tailoring</Link><Link to="/wishlist">Your saved edit</Link></div><div><p className="eyebrow">Client services</p><Link to="/contact">Contact the atelier</Link><Link to="/size-guide">Find your fit</Link><Link to="/delivery-returns">Delivery & returns</Link><Link to="/cart">Your shopping bag</Link></div><p className="footer-note">Form follows feeling.<br/>Architectural menswear.<br/><span>Independent by design.</span></p></div><div className="footer-bottom"><span>© {new Date().getFullYear()} ATELIER NOIR</span><span>EDITION N° 07 / OBJECTS IN MOTION</span><div><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/contact">Contact</Link></div></div></footer>
    <AnimatePresence>{toast && <motion.div role="status" className="toast" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}><Icon name="check"/>{toast}<button onClick={() => { setBagOpen(true); setToast(''); }}>View bag →</button></motion.div>}</AnimatePresence>
    <AnimatePresence>{bagOpen && <Overlay key="bag" label="Shopping bag" onClose={() => setBagOpen(false)}><div className="drawer-header"><span className="eyebrow">YOUR CONSIDERED EDIT</span><h2>Your bag<sup>{String(count).padStart(2, '0')}</sup></h2></div>{count ? <><CartItems compact/><div className="cart-total"><div><span>Subtotal</span><strong>{cents(subtotal)}</strong></div><p>Delivery and taxes calculated at checkout.</p><Link className="button red" to="/checkout">Continue to checkout <Icon name="arrow"/></Link><Link className="text-link" to="/cart">View and edit bag</Link></div></> : <EmptyState title="Room for something considered." text="Your bag is currently empty."/>}</Overlay>}
      {searchOpen && <Overlay key="search" label="Search collection" onClose={() => setSearchOpen(false)}><SearchDrawer close={() => setSearchOpen(false)}/></Overlay>}
      {menu && <Overlay key="menu" label="Main menu" onClose={() => setMenu(false)}><div className="drawer-header"><span className="eyebrow">ATELIER NOIR / EXPLORE</span><h2>A point of <i>view.</i></h2></div><nav className="mobile-navigation" aria-label="Mobile navigation">{[['The collection', '/catalog'], ['The atelier', '/#atelier'], ['Your saved edit', '/wishlist'], ['Contact', '/contact'], ['Delivery & returns', '/delivery-returns']].map(([name, to]) => <Link key={to} to={to} onClick={() => setMenu(false)}>{name}<Icon name="arrow"/></Link>)}<button onClick={() => { setMenu(false); setSearchOpen(true); }}>Search pieces <Icon name="search"/></button></nav></Overlay>}
    </AnimatePresence>
  </>;
}
