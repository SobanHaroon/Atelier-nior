import { catalog, MAX_QUANTITY } from './catalog.js';

// Only catalog IDs, valid sizes and bounded integers cross the trust boundary.
export function normalizeCart(input, strict = true) {
  if (!Array.isArray(input) || input.length > 30 || (strict && !input.length)) throw new Error('Your bag is empty or invalid.');
  const lines = new Map();
  for (const item of input) {
    const product = catalog.find(p => p.id === item?.id);
    if (!product || !product.sizes.includes(item.size) || !Number.isInteger(item.qty) || item.qty < 1 || item.qty > MAX_QUANTITY) {
      if (strict) throw new Error('A piece, size or quantity is no longer available. Please review your bag.');
      continue;
    }
    const key = `${item.id}:${item.size}`;
    const qty = (lines.get(key)?.qty || 0) + item.qty;
    if (strict && qty > MAX_QUANTITY) throw new Error(`A maximum of ${MAX_QUANTITY} of each size can be ordered.`);
    lines.set(key, { id: product.id, size: item.size, qty: Math.min(qty, MAX_QUANTITY) });
  }
  return [...lines.values()].sort((a, b) => `${a.id}:${a.size}`.localeCompare(`${b.id}:${b.size}`));
}

export function priceCart(input) {
  const lines = normalizeCart(input).map(item => {
    const p = catalog.find(p => p.id === item.id);
    return { ...item, name: p.name, sku: p.sku, priceCents: p.priceCents, image: p.image };
  });
  return { lines, subtotal: lines.reduce((sum, line) => sum + line.priceCents * line.qty, 0) };
}
