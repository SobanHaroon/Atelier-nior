import React, { useState } from 'react';
import { Link, useParams } from '../router';
import { useShop } from '../shop';
import { products, money } from '../products';
import { Breadcrumb, ProductGrid, Icon, Notice, imageClass, EmptyState } from '../components/ui';

export default function Product() {
  const { id } = useParams();
  const product = products.find(p => p.id === id);
  if (!product) return <div className="commerce-page"><EmptyState title="This piece isn’t in the edit." text="Explore the current collection to find your next piece."/></div>;
  return <ProductContent key={id} product={product}/>;
}
function ProductContent({ product: p }) {
  const { add, wishlist, toggleWish, store, setBagOpen } = useShop();
  const [size, setSize] = useState(''), [added, setAdded] = useState(false), [zoom, setZoom] = useState(false);
  const available = s => store.inventory?.[`${p.id}:${s}`];
  return <div className="commerce-page product-page"><Breadcrumb><Link to="/catalog">Collection</Link><span>/</span><span>{p.name}</span></Breadcrumb>
    <div className="product-layout"><div className="product-gallery"><button className={'product-portrait ' + imageClass(p) + (zoom ? ' zoomed' : '')} onClick={() => setZoom(!zoom)} aria-label={(zoom ? 'Zoom out ' : 'Zoom in ') + p.name} aria-pressed={zoom}><img src={'/images/' + p.image} alt={`${p.color} ${p.name}`} fetchPriority="high"/><span>{zoom ? '−' : '+'} / EXPLORE THE DETAIL</span></button><div className="gallery-caption"><span>{p.sku} / {p.color}</span><span>EDITION N° 07</span></div></div>
      <div className="product-information"><p className="eyebrow"><span className="red-dot"/>{p.category} / {p.tag || 'The collection'}</p><h1>{p.name}</h1><p className="product-price">{money(p.price)} <span>USD</span></p><p className="product-description">{p.desc}</p>
        <div className="color-detail"><span className={'color-chip ' + p.color.toLowerCase()}/><span>{p.color}</span></div>
        <div className="size-heading"><span>Select your size</span><Link className="text-link" to="/size-guide">Size guide ↗</Link></div><div className="sizes">{p.sizes.map(s => <button key={s} disabled={available(s) === 0} aria-label={`Size ${s}${available(s) === 0 ? ', sold out' : ''}`} aria-pressed={size === s} className={size === s ? 'selected' : ''} onClick={() => { setSize(s); setAdded(false); }}>{s}</button>)}</div>
        <button className="button red add-piece" disabled={!size || available(size) === 0} onClick={() => setAdded(add(p, size))}>{added ? 'Add another' : size ? 'Add to bag — ' + money(p.price) : 'Select a size'}<Icon name="plus"/></button>
        {added && <button className="button outline" onClick={() => setBagOpen(true)}>View your bag <Icon name="arrow"/></button>}
        <button className="wishlist-detail" aria-pressed={wishlist.includes(p.id)} onClick={() => toggleWish(p.id)}><Icon name="heart" className={wishlist.includes(p.id) ? 'filled' : ''}/>{wishlist.includes(p.id) ? 'Saved to your edit' : 'Save to your edit'}</button>
        <div className="product-accordions"><details open><summary>01 / Composition & detail</summary><p>{p.material}. {p.color} expression.</p></details><details><summary>02 / Fit & care</summary><p>{p.id === 'boots' ? 'European shoe sizing. Consult the size guide before choosing your fit.' : 'A structured silhouette with room to move. Consult the size guide before choosing your fit.'} Follow the garment’s care label for cleaning instructions.</p></details><details><summary>03 / Delivery & returns</summary><p>{store.policies?.shipping || 'Delivery destinations and charges are shown at checkout when ordering opens.'}</p><Link className="text-link" to="/delivery-returns">Read delivery & return information ↗</Link></details></div>
        <Link className="product-help" to="/contact">A question about this piece? <span>Contact the atelier ↗</span></Link>
      </div></div>
    <section className="related-products"><div className="section-heading"><div><span className="eyebrow">Build your uniform</span><h2>In good <i>company.</i></h2></div><Link to="/catalog" className="inline-link">All pieces <Icon name="arrow"/></Link></div><ProductGrid items={products.filter(other => other.id !== p.id).slice(0, 3)}/></section>
  </div>;
}
