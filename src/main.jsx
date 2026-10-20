import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { motion, AnimatePresence, MotionConfig, useReducedMotion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { animate, stagger } from 'animejs';
import { products, editions, money } from './products';
import '@fontsource/bodoni-moda/latin-400.css';
import '@fontsource/bodoni-moda/latin-400-italic.css';
import '@fontsource/hanken-grotesk/latin-400.css';
import '@fontsource/hanken-grotesk/latin-500.css';
import '@fontsource/hanken-grotesk/latin-600.css';
import './style.css';

const GarmentScene = lazy(() => import('./GarmentScene'));
gsap.registerPlugin(ScrollTrigger);

function Icon({ name, ...props }) {
  const paths = {
    bag: <><path d="M5 7h14l1 14H4L5 7Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
    heart: <path d="M20.5 4.7a5.3 5.3 0 0 0-7.5 0L12 5.8l-1.1-1.1a5.3 5.3 0 0 0-7.5 7.5L12 21l8.5-8.8a5.3 5.3 0 0 0 0-7.5Z"/>,
    arrow: <path d="M4 12h16M14 5l7 7-7 7"/>,
    close: <path d="m5 5 14 14M5 19 14-14"/>,
    plus: <path d="M12 4v16M4 12h16"/>,
    rotate: <path d="M20 9a8 8 0 1 0 0 6M20 3v6h-6"/>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true" {...props}>{paths[name] || paths.arrow}</svg>;
}

function Overlay({ label, children, onClose, drawer = false }) {
  const ref = useRef();
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    const keydown = e => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab') return;
      const elements = [...ref.current.querySelectorAll('button:not([disabled]),a[href],input,select,textarea,[tabindex="0"]')].filter(el => el.getClientRects().length);
      if (!elements.length) { e.preventDefault(); return; }
      const first = elements[0], last = elements[elements.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); previous?.focus({ preventScroll: true }); };
  }, [onClose, label]);
  return <motion.div className={'overlay ' + (drawer ? 'drawer-shade' : '')} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
    <motion.section role="dialog" aria-modal="true" aria-label={label} className={'dialog ' + (drawer ? 'drawer' : '')} ref={ref} tabIndex={-1} onClick={e => e.stopPropagation()} initial={drawer ? { x: '100%' } : { y: 25 }} animate={drawer ? { x: 0 } : { y: 0 }} exit={drawer ? { x: '100%' } : { y: 20 }} transition={{ duration: .4, ease: [.22, 1, .36, 1] }}>
      <button className="close-button" onClick={onClose} aria-label="Close dialog"><Icon name="close"/></button>{children}
    </motion.section>
  </motion.div>;
}

const imageClass = p => (p.crop || '') + (p.isolated ? ' isolated' : '');
function ProductDetail({ product, add, wish, toggleWish }) {
  const [size, setSize] = useState(''), [added, setAdded] = useState(false);
  return <div className="product-detail">
    <div className={'detail-image ' + imageClass(product)}><img src={'/images/' + product.image} alt={product.name}/></div>
    <div className="detail-copy">
      <span className="eyebrow">EDITION 07 / {product.category}</span><h2>{product.name}</h2><p className="price">{money(product.price)} <small>USD</small></p><p>{product.desc}</p>
      <div className="size-heading"><span>Select size</span><span>{product.id === 'shell' || product.id === 'knit' ? 'International sizing' : 'EU sizing'}</span></div>
      <div className="sizes">{product.sizes.map(s => <button key={s} aria-pressed={size === s} onClick={() => { setSize(s); setAdded(false); }} className={size === s ? 'selected' : ''}>{s}</button>)}</div>
      <button className="button red" disabled={!size} onClick={() => { add(product, size); setAdded(true); }}>{added ? 'Added to bag' : size ? 'Add to bag — ' + money(product.price) : 'Choose your size'}<Icon name="plus"/></button>
      <button className="wishlist-detail" onClick={() => toggleWish(product.id)}><Icon name="heart" className={wish ? 'filled' : ''}/>{wish ? 'Saved to your edit' : 'Save to your edit'}</button>
      <details open><summary>01 / Composition</summary><p>{product.material}. Product details are illustrative specifications for this collection concept.</p></details>
      <details><summary>02 / Fit & care</summary><p>Relaxed, structured fit. Select your usual size. Specialist care is recommended for delicate tailoring.</p></details>
      <p className="small-note">Collection preview. Checkout creates a downloadable order summary; no payment is taken.</p>
    </div>
  </div>;
}

function getSaved(key, validate) {
  try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value.filter(validate) : []; } catch { return []; }
}

function App() {
  const root = useRef();
  const motionState = useRef({ rotation: .2, scale: 1.08, x: 0, y: 0, tilt: -.02 });
  const reduced = useReducedMotion();
  const [edition, setEdition] = useState(editions[0]), [ready, setReady] = useState(false), [chapter, setChapter] = useState(0);
  const [filter, setFilter] = useState('All pieces'), [sort, setSort] = useState('Featured');
  const [panel, setPanel] = useState(null), [menu, setMenu] = useState(false), [search, setSearch] = useState(''), [toast, setToast] = useState(''), [orderReady, setOrderReady] = useState(false);
  const [cart, setCart] = useState(() => getSaved('noir-bag', x => x && products.some(p => p.id === x.id && p.sizes.includes(x.size)) && Number.isInteger(x.qty) && x.qty > 0 && x.qty <= 10));
  const [wishlist, setWishlist] = useState(() => getSaved('noir-wishlist', id => products.some(p => p.id === id)));
  const closePanel = useCallback(() => { setPanel(null); setOrderReady(false); }, []);
  const onReady = useCallback(() => setReady(true), []);
  const open = (type, data) => { setMenu(false); setPanel({ type, data }); setOrderReady(false); };

  useEffect(() => { try { localStorage.setItem('noir-bag', JSON.stringify(cart)); localStorage.setItem('noir-wishlist', JSON.stringify(wishlist)); } catch {} }, [cart, wishlist]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 2800); return () => clearTimeout(timer); }, [toast]);
  useLayoutEffect(() => {
    if (reduced) return;
    const ctx = gsap.context(() => {
      gsap.from('.hero-title span', { yPercent: 110, stagger: .12, duration: 1.2, ease: 'power4.out', delay: .2 });
      gsap.from('.hero-intro,.edition-selector,.hero-bottom', { opacity: 0, y: 15, duration: 1, delay: .65 });
      const tl = gsap.timeline({ scrollTrigger: { trigger: '.experience', start: 'top top', end: 'bottom bottom', scrub: 1.2, onUpdate: self => setChapter(Math.min(3, Math.floor(self.progress * 4))) } });
      tl.to('.opening-copy', { autoAlpha: 0, y: -50, duration: .15 }, 0)
        .to('.hero-title', { opacity: .12, scale: 1.2, duration: .2 }, 0)
        .to(motionState.current, { rotation: -.65, scale: 1.75, x: .65, y: -.18, tilt: .06, duration: .26, ease: 'none' }, 0)
        .fromTo('.story-a', { autoAlpha: 0, y: 35 }, { autoAlpha: 1, y: 0, duration: .07 }, .15)
        .to('.story-a', { autoAlpha: 0, y: -35, duration: .06 }, .36)
        .to('.light-world', { opacity: 1, duration: .14 }, .35)
        .to('.stage', { color: '#181818', duration: .14 }, .35)
        .to(motionState.current, { rotation: Math.PI + .3, scale: 1.55, x: -.65, y: -.1, tilt: -.06, duration: .28, ease: 'none' }, .28)
        .fromTo('.story-b', { autoAlpha: 0, y: 35 }, { autoAlpha: 1, y: 0, duration: .07 }, .43)
        .to('.story-b', { autoAlpha: 0, y: -35, duration: .06 }, .65)
        .to('.crimson-world', { opacity: 1, duration: .15 }, .65)
        .to('.stage', { color: '#f1f0e9', duration: .15 }, .65)
        .to(motionState.current, { rotation: Math.PI * 2 + .2, scale: 1.08, x: 0, y: 0, tilt: 0, duration: .32, ease: 'none' }, .6)
        .fromTo('.finale-title', { opacity: 0, scale: 1.25 }, { opacity: .7, scale: 1, duration: .15 }, .73)
        .fromTo('.story-c', { autoAlpha: 0, y: 25 }, { autoAlpha: 1, y: 0, duration: .09 }, .83)
        .to('.poster-motion', { xPercent: 15, scale: 1.8, rotate: 7, duration: .26 }, 0)
        .to('.poster-motion', { xPercent: -15, scale: 1.65, rotate: -5, duration: .3 }, .29)
        .to('.poster-motion', { xPercent: 0, scale: 1, rotate: 0, duration: .3 }, .62)
        .to('.chapter-line', { scaleY: 1, duration: 1, ease: 'none' }, 0);
      gsap.utils.toArray('.reveal').forEach(el => gsap.from(el, { opacity: 0, y: 40, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } }));
      gsap.to('.campaign-photo img', { yPercent: 10, ease: 'none', scrollTrigger: { trigger: '.campaign', start: 'top bottom', end: 'bottom top', scrub: 1 } });
    }, root);
    return () => ctx.revert();
  }, [reduced]);
  useEffect(() => { if (reduced) return; const animation = animate('.brand-line', { strokeDashoffset: [80, 0], duration: 1500, delay: stagger(180), ease: 'outExpo' }); return () => animation.revert(); }, [reduced]);
  useEffect(() => { const timer = setTimeout(() => ScrollTrigger.refresh(), 600); return () => clearTimeout(timer); }, [filter, sort]);

  function add(product, size) {
    setCart(items => { const found = items.find(x => x.id === product.id && x.size === size); return found ? items.map(x => x === found ? { ...x, qty: Math.min(x.qty + 1, 10) } : x) : [...items, { id: product.id, size, qty: 1 }]; });
    setToast(product.name + ' added to your bag'); setOrderReady(false);
  }
  const toggleWish = id => setWishlist(items => items.includes(id) ? items.filter(x => x !== id) : [...items, id]);
  const count = cart.reduce((n, p) => n + p.qty, 0);
  const total = cart.reduce((n, c) => n + products.find(p => p.id === c.id).price * c.qty, 0);
  function quantity(item, delta) { setCart(items => items.map(x => x === item ? { ...x, qty: Math.min(10, x.qty + delta) } : x).filter(x => x.qty > 0)); setOrderReady(false); }
  function download() {
    const text = 'ATELIER NOIR — ORDER SUMMARY\n\n' + cart.map(c => { const p = products.find(p => p.id === c.id); return `${p.name} | Size ${c.size} | Quantity ${c.qty} | ${money(p.price * c.qty)}`; }).join('\n') + '\n\nSubtotal: ' + money(total) + ' USD\n\nCollection concept. No order has been placed, no payment has been taken. Tax and delivery are not calculated.';
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = document.createElement('a'); a.href = url; a.download = 'atelier-noir-order-summary.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  let visible = products.filter(p => filter === 'All pieces' || p.category === filter);
  if (sort === 'Price: low to high') visible = [...visible].sort((a, b) => a.price - b.price);
  if (sort === 'Price: high to low') visible = [...visible].sort((a, b) => b.price - a.price);
  const chapterNames = ['The silhouette', 'The construction', 'The perspective', 'The statement'];
  const searchResults = products.filter(p => (p.name + ' ' + p.category + ' ' + p.material).toLowerCase().includes(search.toLowerCase()));
  const resultItems = panel?.type === 'wishlist' ? products.filter(p => wishlist.includes(p.id)) : searchResults;
  const infoText = {
    'Privacy': 'Your bag and saved pieces are stored in this browser’s local storage so they remain available when you return. Search queries and order summaries are processed on your device. This preview does not collect payment information, send orders, or install analytics. Hosting providers may process standard access logs.',
    'Delivery & returns': 'This is a collection concept, with no live fulfilment or returns service. Prices and products are illustrative. Delivery regions, costs, returns terms and payment services need to be configured before commercial launch.',
    'Contact the atelier': 'The atelier contact channel has not yet been configured. You can explore the collection, save your favourite pieces, and download a selected order summary from your bag.',
    'Concept information': 'An independent Atelier Noir design concept, developed from the supplied Stitch artwork and cinematic video reference. Original garment imagery and a reconstructed interactive 3D scene evoke the reference. Products, prices, material descriptions and atelier narrative are illustrative.',
  };

  return <MotionConfig reducedMotion="user"><div ref={root} className={'app theme-' + edition.id}>
    <a href="#collection" className="skip-link">Skip to collection</a>
    <header className="site-header">
      <a href="#home" className="brand" aria-label="Atelier Noir home"><svg viewBox="0 0 46 38"><path className="brand-line" d="m3 34 14-30 14 30M9 23h15M27 34V5l15 29V4"/></svg><span>ATELIER<br/><b>NOIR</b></span></a>
      <nav className="main-nav"><a href="#collection">Collection <span>07</span></a><a href="#campaign">The campaign</a><a href="#atelier">Our atelier</a></nav>
      <div className="header-actions"><button aria-label="Search collection" onClick={() => open('search')}><Icon name="search"/></button><button className="wish-header" aria-label={'Open wishlist, ' + wishlist.length + ' items'} onClick={() => open('wishlist')}><Icon name="heart"/>{wishlist.length > 0 && <sup>{wishlist.length}</sup>}</button><button className="bag-button" onClick={() => open('bag')} aria-label={'Open bag, ' + count + ' items'}>Bag <span>{String(count).padStart(2, '0')}</span></button><button className="mobile-menu" onClick={() => setMenu(!menu)} aria-label="Toggle menu" aria-expanded={menu}>{menu ? 'Close' : 'Menu'} <span>{menu ? '−' : '+'}</span></button></div>
    </header>
    <AnimatePresence>{menu && <motion.nav className="menu-panel" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
      {[['Collection', 'collection'], ['The campaign', 'campaign'], ['Our atelier', 'atelier']].map(([name, id]) => <a href={'#' + id} key={id} onClick={() => setMenu(false)}>{name}<Icon name="arrow"/></a>)}
      <button onClick={() => open('search')}>Search collection <Icon name="search"/></button><button onClick={() => open('wishlist')}>Saved pieces <Icon name="heart"/></button>
    </motion.nav>}</AnimatePresence>
    <main>
      <section id="home" className="experience"><div className="stage">
        <div className="dark-world"><div className="light-column"/><div className="world-grid"/><div className="studio-ring"/></div><div className="light-world"/><div className="crimson-world"><div/><div/><div/></div>
        <div className="hero-intro opening-copy"><p className="eyebrow"><span className="red-dot"/> Edition N° 07 / Objects in motion</p><p className="tiny">PARIS — KYOTO<br/>A STUDY IN CONTRAST</p></div>
        <div className="hero-title" aria-hidden="true"><div><span>FORM</span></div><div><span>IN MOTION</span></div></div><div className="finale-title" aria-hidden="true">NOIR<br/>NOIR<br/>NOIR</div>
        <div className="garment-stage"><div className={'poster-motion ' + (ready ? 'has-webgl' : '')}><img src="/images/jacket.webp" alt="Floating black technical jacket with crimson piping" fetchPriority="high" className={'garment-poster ' + edition.id}/></div><Suspense fallback={null}><GarmentScene motionState={motionState} edition={edition} onReady={onReady} reduced={reduced}/></Suspense><div className="garment-shadow"/></div>
        <div className="opening-copy hero-side"><span className="eyebrow">Form follows feeling.</span><h1>Engineered<br/>to stand <i>apart.</i></h1><p>Architectural lines.<br/>Uncompromising movement.</p><a href="#collection" className="inline-link">Explore the collection <Icon name="arrow"/></a></div>
        <div className="edition-selector"><span className="tiny">SELECT AN EXPRESSION</span><div>{editions.map(e => <button key={e.id} aria-label={'Select ' + e.name + ' edition'} aria-pressed={edition.id === e.id} className={edition.id === e.id ? 'active' : ''} onClick={() => setEdition(e)}><span style={{ background: e.color }}/><small>{e.name}</small></button>)}</div></div>
        <div className="story story-a"><span className="eyebrow">01 / The construction</span><h2>Nothing<br/>left to<br/><i>chance.</i></h2><p>Articulated seams.<br/>A precise silhouette.<br/>Every detail with purpose.</p></div>
        <div className="story story-b"><span className="eyebrow">02 / A new perspective</span><h2>Designed<br/>from every<br/><i>angle.</i></h2><p>A quiet confidence.<br/>An unmistakable form.</p></div>
        <div className="story story-c"><p className="eyebrow">Edition 07 / {edition.name}</p><h2>Make your <i>statement.</i></h2><button className="button white" onClick={() => open('product', products[0])}>Discover the technical shell <Icon name="arrow"/></button></div>
        <div className="chapter-indicator"><span>0{chapter + 1}</span><div><i className="chapter-line"/></div><span>04</span></div><div className="hero-bottom"><span className="tiny">{chapterNames[chapter]}</span><a href="#collection" className="scroll-prompt"><span>Scroll to explore</span><span>↓</span></a><span className="tiny hero-coordinate">35.6762° N / 139.6503° E</span></div>
      </div></section>
      <section className="intro-section section"><div className="intro-top reveal"><p className="eyebrow"><span className="red-dot"/> A new uniform</p><span className="tiny">AUTUMN / WINTER — EDITION 07</span></div><h2 className="reveal">Beyond the expected.<br/><i>Built around you.</i></h2><div className="intro-bottom reveal"><span className="intro-symbol">AN/07</span><p>A dialogue between precise tailoring and everyday movement. Sculptural silhouettes, considered materials, and nothing that doesn't belong.</p><a href="#collection" className="inline-link">Discover Edition 07 <Icon name="arrow"/></a></div></section>
      <section id="collection" className="collection section"><div className="section-heading reveal"><div><span className="eyebrow">The collection / Six essential forms</span><h2>The considered <i>edit.</i></h2></div><span className="tiny">DESIGNED TO ENDURE.</span></div>
        <div className="collection-tools"><div className="filters" aria-label="Product categories">{['All pieces', 'Outerwear', 'Tailoring', 'Knitwear', 'Footwear'].map(f => <button key={f} className={filter === f ? 'active' : ''} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f}</button>)}</div><label className="sort-label">Sort by<select value={sort} onChange={e => setSort(e.target.value)}><option>Featured</option><option>Price: low to high</option><option>Price: high to low</option></select></label></div>
        <motion.div layout className="product-grid"><AnimatePresence mode="popLayout">{visible.map(p => <motion.article layout key={p.id} className="product-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: .96 }} transition={{ duration: reduced ? 0 : .45 }}>
          <div className={'product-image ' + imageClass(p)}><button className="product-open" onClick={() => open('product', p)} aria-label={'View ' + p.name}><img src={'/images/' + p.image} alt={p.name} loading="lazy"/><span className="quick-view">Discover piece <Icon name="plus"/></span></button><span className="product-tag">{p.tag || 'EDITION 07'}</span><button className={'wish-button ' + (wishlist.includes(p.id) ? 'saved' : '')} aria-label={(wishlist.includes(p.id) ? 'Remove ' : 'Save ') + p.name + (wishlist.includes(p.id) ? ' from wishlist' : ' to wishlist')} onClick={() => toggleWish(p.id)}><Icon name="heart"/></button></div>
          <div className="product-meta"><span>{p.category}</span><span>ATN—0{products.indexOf(p) + 1}</span></div><div className="product-title"><h3><button onClick={() => open('product', p)}>{p.name}</button></h3><span>{money(p.price)}</span></div><p>{p.material}</p>
        </motion.article>)}</AnimatePresence></motion.div>
        <div className="collection-footer"><span>{String(visible.length).padStart(2, '0')} / CONSIDERED OBJECTS</span><button className="inline-link" onClick={() => open('info', 'Size guide')}>Find your fit <Icon name="arrow"/></button></div>
      </section>
      <section id="campaign" className="campaign"><div className="campaign-photo"><img src="/images/editorial-2.webp" alt="Atelier Noir tailoring against brutalist concrete architecture" loading="lazy"/></div><div className="campaign-shade"/><div className="campaign-top"><span className="eyebrow">THE CAMPAIGN / STUDY 07</span><span className="tiny">FORM. FUNCTION. FEELING.</span></div><div className="campaign-copy reveal"><h2>The architecture<br/>of <i>presence.</i></h2><p>Less noise. More intention.</p><a href="#atelier" className="button outline">Inside the atelier <Icon name="arrow"/></a></div><span className="campaign-number">07</span></section>
      <section id="atelier" className="atelier section"><div className="atelier-heading reveal"><p className="eyebrow"><span className="red-dot"/> The atelier</p><h2>Considered.<br/>Constructed.<br/><i>Uncompromised.</i></h2><p>We see clothing as architecture for the everyday. Each proportion has a purpose. Each material brings a feeling. Each piece leaves room for you.</p></div><div className="atelier-details">{[['01', 'The material', 'A tactile vocabulary. From dense wool mélange to fluid technical nylon, texture defines the collection.'], ['02', 'The proportion', 'A deliberate balance of structure and ease. Silhouettes that hold their shape and move with you.'], ['03', 'The perspective', 'A meeting of Parisian tailoring and Japanese restraint. Designed around a quieter kind of confidence.']].map(([n, title, description]) => <div className="reveal" key={n}><span>{n}</span><div><h3>{title}</h3><p>{description}</p></div><Icon name="plus"/></div>)}</div></section>
      <section className="statement"><div className="statement-track" aria-hidden="true">FORM FOLLOWS FEELING <span>✳</span> FORM FOLLOWS FEELING <span>✳</span></div></section>
      <section className="closing section"><span className="eyebrow reveal">Your next chapter</span><h2 className="reveal">Make less.<br/><i>Mean more.</i></h2><a href="#collection" className="button red reveal">Explore the collection <Icon name="arrow"/></a></section>
    </main>
    <footer><div className="footer-top"><a href="#home" className="footer-brand">ATELIER<span>NOIR</span></a><div><p className="eyebrow">Explore</p><a href="#collection">Edition 07</a><a href="#campaign">The campaign</a><a href="#atelier">Our atelier</a></div><div><p className="eyebrow">Client services</p>{['Size guide', 'Delivery & returns', 'Contact the atelier'].map(name => <button key={name} onClick={() => open('info', name)}>{name}</button>)}</div><p className="footer-note">Architectural menswear.<br/>Paris — Kyoto.<br/><span>A collection concept by DevOps Services.</span></p></div><div className="footer-bottom"><span>© {new Date().getFullYear()} ATELIER NOIR</span><span>INDEPENDENT BY DESIGN.</span><div><button onClick={() => open('info', 'Privacy')}>Privacy</button><button onClick={() => open('info', 'Concept information')}>Information</button><a href="#home">Back to top ↑</a></div></div></footer>
    <AnimatePresence>{toast && <motion.div role="status" className="toast" initial={{ y: 25, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 25, opacity: 0 }}><span>✓</span>{toast}<button onClick={() => { open('bag'); setToast(''); }}>View bag →</button></motion.div>}</AnimatePresence>
    <AnimatePresence>{panel && <Overlay key="active-panel" label={panel.type === 'product' ? panel.data.name : panel.type === 'bag' ? 'Shopping bag' : panel.type === 'search' ? 'Search collection' : panel.type === 'wishlist' ? 'Your saved edit' : panel.data} onClose={closePanel} drawer={['bag', 'search', 'wishlist'].includes(panel.type)}>
      {panel.type === 'product' ? <ProductDetail key={panel.data.id} product={panel.data} add={add} wish={wishlist.includes(panel.data.id)} toggleWish={toggleWish}/> : panel.type === 'info' ? <div className="info-dialog"><span className="eyebrow">Client services / Atelier Noir</span><h2>{panel.data}</h2>{panel.data === 'Size guide' ? <><p>Illustrative international size conversion. Measurements and fit must be confirmed against actual garments before sale.</p><table><thead><tr><th>International</th><th>EU</th><th>Chest (cm)</th></tr></thead><tbody>{[['S', '46', '92–96'], ['M', '48', '96–100'], ['L', '50', '100–104'], ['XL', '52', '104–108']].map(row => <tr key={row[0]}>{row.map(value => <td key={value}>{value}</td>)}</tr>)}</tbody></table></> : <p>{infoText[panel.data]}</p>}</div> : <>
        <div className="drawer-header"><span className="eyebrow">ATELIER NOIR / EDITION 07</span><h2>{panel.type === 'bag' ? 'Your bag' : panel.type === 'search' ? 'Find your form.' : 'Your saved edit.'}<sup>{panel.type === 'bag' ? String(count).padStart(2, '0') : panel.type === 'wishlist' ? wishlist.length : ''}</sup></h2></div>
        {panel.type === 'bag' ? cart.length === 0 ? <div className="empty-state"><Icon name="bag"/><h3>A little space for<br/>something considered.</h3><p>Your bag is currently empty.</p><a href="#collection" className="button red" onClick={closePanel}>Explore the collection <Icon name="arrow"/></a></div> : <>
          <div className="cart-items">{cart.map(c => { const p = products.find(x => x.id === c.id); return <div className="cart-item" key={c.id + c.size}><div className={'cart-thumb ' + imageClass(p)}><img src={'/images/' + p.image} alt={p.name}/></div><div><span className="eyebrow">{p.category}</span><h3>{p.name}</h3><p>SIZE {c.size}</p><div className="quantity"><button aria-label={'Decrease quantity of ' + p.name + ' size ' + c.size} onClick={() => quantity(c, -1)}>−</button><span>{c.qty}</span><button aria-label={'Increase quantity of ' + p.name + ' size ' + c.size} onClick={() => quantity(c, 1)} disabled={c.qty >= 10}>+</button></div></div><div className="cart-item-end"><button aria-label={'Remove ' + p.name + ' size ' + c.size} onClick={() => { setCart(items => items.filter(x => x !== c)); setOrderReady(false); }}><Icon name="close"/></button><span>{money(p.price * c.qty)}</span></div></div>; })}</div>
          <div className="cart-total"><div><span>Subtotal</span><strong>{money(total)} <small>USD</small></strong></div><p>Shipping and taxes are not calculated in this preview.</p>{orderReady ? <div className="order-ready" role="status"><span className="eyebrow">Your edit is ready.</span><p>No order has been placed and no payment has been taken. Download your selected pieces below.</p><button className="button red" onClick={download}>Download order summary <span>↓</span></button></div> : <button className="button red" onClick={() => setOrderReady(true)}>Review your order <Icon name="arrow"/></button>}<p className="small-note">Interactive storefront preview. Payment processing is not connected.</p></div>
        </> : <>
          {panel.type === 'search' && <div className="search-field"><Icon name="search"/><input type="search" aria-label="Search products" placeholder="Search pieces, materials, categories…" value={search} onChange={e => setSearch(e.target.value)}/></div>}
          <div className="result-list">{resultItems.map(p => <button className="result-item" key={p.id} onClick={() => open('product', p)}><div className={'result-thumb ' + imageClass(p)}><img src={'/images/' + p.image} alt=""/></div><span><small>{p.category}</small><b>{p.name}</b><small>{money(p.price)}</small></span><Icon name="arrow"/></button>)}</div>
          {panel.type === 'wishlist' && !wishlist.length && <div className="empty-state"><Icon name="heart"/><h3>Your own point of view.</h3><p>Save pieces from the collection to build your personal edit.</p><button className="button outline" onClick={closePanel}>Return to collection</button></div>}
          {panel.type === 'search' && !searchResults.length && <p className="no-results">No pieces match “{search}”. Try wool, shell, or tailoring.</p>}
        </>}
      </>}
    </Overlay>}</AnimatePresence>
  </div></MotionConfig>;
}

createRoot(document.getElementById('root')).render(<App/>);
