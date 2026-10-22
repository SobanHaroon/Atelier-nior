import React, { useState } from 'react';
import { useSearchParams, Link } from '../router';
import { products, categories, money } from '../products';
import { useShop } from '../shop';
import { Breadcrumb, PageHeading, ProductGrid, Icon, EmptyState } from '../components/ui';

export default function Catalog({ saved = false }) {
  const [params, setParams] = useSearchParams();
  const { wishlist } = useShop();
  const [filtersOpen, setFiltersOpen] = useState(() => window.matchMedia('(min-width: 641px)').matches);
  const query = params.get('q') || '', category = params.get('category') || '', size = params.get('size') || '', price = params.get('price') || '', sort = params.get('sort') || 'featured';
  function update(key, value) { const next = new URLSearchParams(params); value ? next.set(key, value) : next.delete(key); setParams(next, { replace: true, preventScrollReset: true }); }
  let result = products.filter(p => (!saved || wishlist.includes(p.id)) && (!category || p.category === category) && (!size || p.sizes.includes(size)) && (!price || p.price <= Number(price)) && `${p.name} ${p.material} ${p.category} ${p.color}`.toLowerCase().includes(query.trim().toLowerCase()));
  if (sort === 'price-low') result.sort((a, b) => a.price - b.price);
  if (sort === 'price-high') result.sort((a, b) => b.price - a.price);
  if (sort === 'name') result.sort((a, b) => a.name.localeCompare(b.name));
  const active = [query, category, size, price].filter(Boolean).length;
  return <div className="commerce-page catalog-page">
    <Breadcrumb><span>{saved ? 'Saved pieces' : 'The collection'}</span></Breadcrumb>
    <div className="catalog-heading"><PageHeading eyebrow={saved ? 'Your own point of view' : 'Autumn / Winter — Edition 07'} title={saved ? 'Your saved' : 'The considered'} italic="edit." text={saved ? 'The pieces that feel like you. Saved here, ready when you are.' : 'Six essential forms. A dialogue between precision, texture, and everyday movement.'}/><span className="catalog-monogram" aria-hidden="true">AN/07</span></div>
    <div className="catalog-layout"><aside className="catalog-sidebar"><details open={filtersOpen} onToggle={e => setFiltersOpen(e.currentTarget.open)}><summary><Icon name="filter"/>Refine your edit {active > 0 && <span>({active})</span>}</summary>
      <div className="filter-group"><span className="eyebrow">01 / Category</span>{['', ...categories].map(c => <button key={c} aria-pressed={category === c} className={category === c ? 'active' : ''} onClick={() => update('category', c)}>{c || 'All pieces'}<span>{products.filter(p => (!c || p.category === c) && (!saved || wishlist.includes(p.id))).length}</span></button>)}</div>
      <div className="filter-group"><label htmlFor="size-filter" className="eyebrow">02 / Size</label><select id="size-filter" value={size} onChange={e => update('size', e.target.value)}><option value="">All sizes</option>{['S', 'M', 'L', 'XL', '38', '40', '41', '42', '43', '44', '46', '48', '50', '52'].map(s => <option key={s}>{s}</option>)}</select><Link className="text-link" to="/size-guide">Find your fit ↗</Link></div>
      <div className="filter-group"><label htmlFor="price-filter" className="eyebrow">03 / Price range</label><select id="price-filter" value={price} onChange={e => update('price', e.target.value)}><option value="">All prices</option>{[750, 1000, 1500].map(p => <option value={p} key={p}>{money(p)} & under</option>)}</select></div>
      {active > 0 && <button className="text-link reset-filters" onClick={() => setParams({})}>Clear all filters <Icon name="close"/></button>}
    </details><div className="sidebar-note"><span className="eyebrow">Need a second opinion?</span><p>Let’s find the right form for you.</p><Link className="inline-link" to="/contact">Ask the atelier <Icon name="arrow"/></Link></div></aside>
    <section className="catalog-results" aria-label="Collection results"><div className="catalog-toolbar"><form className="catalog-search" role="search" onSubmit={e => e.preventDefault()}><Icon name="search"/><input aria-label="Search catalog" type="search" placeholder="Search pieces or materials" value={query} maxLength={100} onChange={e => update('q', e.target.value)}/></form><label className="catalog-sort"><span className="sr-only">Sort collection</span><select value={sort} onChange={e => update('sort', e.target.value)}><option value="featured">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="name">Name: A–Z</option></select></label></div>
    <div className="results-meta"><p aria-live="polite">{String(result.length).padStart(2, '0')} {result.length === 1 ? 'piece' : 'pieces'}{query && <> for “{query}”</>}</p><span>FORM. FUNCTION. FEELING.</span></div>
    {result.length ? <ProductGrid items={result}/> : <><EmptyState icon={saved ? 'heart' : 'search'} title={saved && !wishlist.length ? 'Your edit starts here.' : 'A little too specific.'} text={saved && !wishlist.length ? 'Save pieces with the heart icon to build your personal collection.' : 'No pieces match this selection. Try another material or clear your filters.'}/>{active > 0 && <button className="button outline reset-empty" onClick={() => setParams({})}>Clear filters</button>}</>}
    <div className="catalog-end"><span>END OF THE EDIT</span><span>Made to be considered.</span></div></section></div>
  </div>;
}
