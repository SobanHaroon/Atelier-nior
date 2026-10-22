import React, { useEffect, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import { BrowserRouter, Routes, Route, useLocation } from './router';
import { ShopProvider } from './shop';
import { Layout } from './components/Layout';
import { EmptyState } from './components/ui';
import Catalog from './pages/Catalog';
import Product from './pages/Product';
import Cart from './pages/Cart';
import Checkout, { OrderResult } from './pages/Checkout';
import Contact from './pages/Contact';
import Information from './pages/Information';
import { products } from './products';
import '@fontsource/bodoni-moda/latin-400.css';
import '@fontsource/bodoni-moda/latin-400-italic.css';
import '@fontsource/hanken-grotesk/latin-400.css';
import '@fontsource/hanken-grotesk/latin-500.css';
import '@fontsource/hanken-grotesk/latin-600.css';
import './style.css';
import './commerce.css';
const Home = lazy(() => import('./pages/Home'));
function Metadata() {
  const { pathname } = useLocation();
  useEffect(() => {
    const product = products.find(p => pathname === '/products/' + p.id);
    const pages = { '/catalog': 'The Collection', '/contact': 'Contact the Atelier', '/cart': 'Your Bag', '/checkout': 'Checkout', '/checkout/success': 'Your Order', '/wishlist': 'Your Saved Edit', '/size-guide': 'Size Guide', '/delivery-returns': 'Delivery & Returns', '/privacy': 'Privacy', '/terms': 'Terms of Sale' };
    document.title = `${product?.name || pages[pathname] || 'Form in Motion'} — Atelier Noir`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', product?.desc || 'Architectural menswear. Explore Atelier Noir Edition 07: considered outerwear, precise tailoring, tactile knitwear and sculpted footwear.');
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) { robots = document.createElement('meta'); robots.name = 'robots'; document.head.append(robots); }
    robots.content = ['/checkout', '/cart', '/wishlist'].some(p => pathname.startsWith(p)) ? 'noindex, nofollow' : 'index, follow';
  }, [pathname]);
  return null;
}
class ErrorBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="commerce-page"><h1>Let’s try that again.</h1><p>Something interrupted the page. Your saved bag is still in this browser.</p><a className="button red" href="/catalog">Return to the collection ↗</a></div> : this.props.children; }
}
function App() {
  return <ErrorBoundary><MotionConfig reducedMotion="user"><BrowserRouter><ShopProvider><Metadata/><Layout><Routes>
    <Route path="/" element={<Suspense fallback={<div className="commerce-page" role="status">Entering the atelier…</div>}><Home/></Suspense>}/><Route path="/catalog" element={<Catalog/>}/><Route path="/products/:id" element={<Product/>}/><Route path="/wishlist" element={<Catalog saved/>}/><Route path="/cart" element={<Cart/>}/><Route path="/checkout" element={<Checkout/>}/><Route path="/checkout/success" element={<OrderResult/>}/><Route path="/contact" element={<Contact/>}/>
    {['size-guide', 'delivery-returns', 'privacy', 'terms'].map(type => <Route key={type} path={'/' + type} element={<Information type={type}/>}/>)}
    <Route path="*" element={<div className="commerce-page"><EmptyState title="A different point of view." text="This page isn’t part of the current edit. Let’s get you back to the collection."/></div>}/>
  </Routes></Layout></ShopProvider></BrowserRouter></MotionConfig></ErrorBoundary>;
}
createRoot(document.getElementById('root')).render(<App/>);
