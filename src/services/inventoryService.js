import { getStockStatus } from './productService';

export { getStockStatus };

export function applyStockChange(state, {
  productId,
  changeQty,
  type,
  reason,
  invoiceNumber = '',
  date = new Date().toISOString(),
}) {
  const product = state.products.find((p) => p.id === productId);
  if (!product) {
    throw new Error('Product not found.');
  }
  const delta = Number(changeQty);
  if (!Number.isFinite(delta) || delta === 0) {
    throw new Error('Enter a quantity to change.');
  }
  const previousQty = Number(product.quantity) || 0;
  const newQty = previousQty + delta;
  if (newQty < 0) {
    throw new Error(`Not enough stock for ${product.name}. Available: ${previousQty}.`);
  }

  const seq = (state.meta?.movementSeq || 0) + 1;
  const movement = {
    id: `MOV-${String(seq).padStart(4, '0')}`,
    productId,
    productName: product.name,
    previousQty,
    changeQty: delta,
    newQty,
    type,
    reason: reason || type,
    date,
    invoiceNumber,
  };

  return {
    ...state,
    products: state.products.map((p) => (p.id === productId ? { ...p, quantity: newQty } : p)),
    movements: [movement, ...state.movements],
    meta: { ...state.meta, movementSeq: seq },
  };
}

export function applySaleDeductions(state, invoice) {
  let next = state;
  for (const item of invoice.items) {
    next = applyStockChange(next, {
      productId: item.productId,
      changeQty: -Math.abs(item.qty),
      type: 'sale',
      reason: `Sold on ${invoice.invoiceNumber}`,
      invoiceNumber: invoice.invoiceNumber,
      date: invoice.createdAt,
    });
  }
  return next;
}

export function inventoryValuePaise(products) {
  return (products || []).reduce((sum, p) => sum + (p.purchasePricePaise || 0) * (p.quantity || 0), 0);
}

export function totalUnits(products) {
  return (products || []).reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
}
