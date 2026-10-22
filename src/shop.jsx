import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { products, MAX_QUANTITY } from './products';
import { normalizeCart } from '../shared/cart';

const Context = createContext(null);
function saved(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
const initialStore = { loading: true, checkoutReady: false, contactReady: false, inventory: null, countries: [], shippingCents: null, policies: {} };
export function ShopProvider({ children }) {
  const [cart, setCart] = useState(() => { try { return normalizeCart(saved('noir-bag', []), false); } catch { return []; } });
  const [wishlist, setWishlist] = useState(() => { const list = saved('noir-wishlist', []); return Array.isArray(list) ? [...new Set(list.filter(id => products.some(p => p.id === id)))] : []; });
  const [store, setStore] = useState(initialStore);
  const [toast, setToast] = useState('');
  const [bagOpen, setBagOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const refreshStore = useCallback(async signal => {
    try {
      const response = await fetch('/api/store', { signal });
      if (!response.ok) throw new Error('Store unavailable');
      const data = await response.json();
      setStore({ ...initialStore, ...data, loading: false });
    } catch (error) {
      if (error.name !== 'AbortError') setStore({ ...initialStore, loading: false, unavailable: true });
    }
  }, []);
  useEffect(() => { const c = new AbortController(); refreshStore(c.signal); return () => c.abort(); }, [refreshStore]);
  useEffect(() => { try { localStorage.setItem('noir-bag', JSON.stringify(cart)); } catch {} }, [cart]);
  useEffect(() => { try { localStorage.setItem('noir-wishlist', JSON.stringify(wishlist)); } catch {} }, [wishlist]);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(''), 3500); return () => clearTimeout(id); }, [toast]);
  function add(product, size) {
    const current = cart.find(c => c.id === product.id && c.size === size)?.qty || 0;
    const stock = store.inventory?.[`${product.id}:${size}`];
    if (current >= MAX_QUANTITY || (stock != null && current >= stock)) { setToast('The available quantity is already in your bag.'); return false; }
    setCart(items => normalizeCart([...items, { id: product.id, size, qty: 1 }], false));
    setToast(`${product.name} added to your bag`);
    return true;
  }
  function quantity(item, delta) {
    setCart(items => items.map(c => c.id === item.id && c.size === item.size ? { ...c, qty: Math.min(MAX_QUANTITY, c.qty + delta) } : c).filter(c => c.qty > 0));
  }
  function remove(item) { setCart(items => items.filter(c => c.id !== item.id || c.size !== item.size)); }
  function removePurchased(lines) {
    setCart(items => items.map(c => ({ ...c, qty: c.qty - (lines.find(l => l.id === c.id && l.size === c.size)?.qty || 0) })).filter(c => c.qty > 0));
  }
  const toggleWish = id => setWishlist(list => list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
  const count = cart.reduce((n, c) => n + c.qty, 0);
  const subtotal = cart.reduce((n, c) => n + products.find(p => p.id === c.id).priceCents * c.qty, 0);
  return <Context.Provider value={{ cart, wishlist, toggleWish, add, quantity, remove, removePurchased, count, subtotal, store, refreshStore, toast, setToast, bagOpen, setBagOpen, searchOpen, setSearchOpen }}>{children}</Context.Provider>;
}
export const useShop = () => useContext(Context);
