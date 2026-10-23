import { generateSku, generateUniqueBarcode, isValidBarcode } from '../utils/barcodeUtils';
import { rupeesToPaise } from '../utils/currencyUtils';

export function getStockStatus(product) {
  const qty = Number(product?.quantity) || 0;
  const min = Number(product?.minStock) || 0;
  if (qty <= 0) return 'out';
  if (qty <= min) return 'low';
  return 'in';
}

export function stockStatusLabel(status) {
  if (status === 'out') return 'Out of Stock';
  if (status === 'low') return 'Low Stock';
  return 'In Stock';
}

export function searchProducts(products, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return products;
  return products.filter((p) =>
    p.name.toLowerCase().includes(q)
    || p.sku.toLowerCase().includes(q)
    || p.barcode.toLowerCase().includes(q)
    || p.brand.toLowerCase().includes(q)
    || p.category.toLowerCase().includes(q)
  );
}

export function validateProductInput(input, products, editingId = null) {
  const errors = {};
  const name = String(input.name || '').trim();
  const sku = String(input.sku || '').trim();
  const barcode = String(input.barcode || '').trim();
  if (!name) errors.name = 'Enter a product name.';
  if (!input.category) errors.category = 'Choose a category.';
  if (!sku) errors.sku = 'Enter a SKU.';
  if (sku) {
    const dupSku = products.find((p) => p.sku.toLowerCase() === sku.toLowerCase() && p.id !== editingId);
    if (dupSku) errors.sku = 'This SKU is already used by another product.';
  }
  if (barcode && !isValidBarcode(barcode)) errors.barcode = 'Use 4–32 letters or numbers.';
  if (barcode) {
    const dup = products.find((p) => p.barcode.toLowerCase() === barcode.toLowerCase() && p.id !== editingId);
    if (dup) errors.barcode = 'This barcode is already used by another product.';
  }
  const selling = Number(input.sellingPrice);
  const purchase = Number(input.purchasePrice);
  if (!Number.isFinite(selling) || selling < 0) errors.sellingPrice = 'Enter a valid selling price.';
  if (!Number.isFinite(purchase) || purchase < 0) errors.purchasePrice = 'Enter a valid purchase price.';
  const qty = Number(input.quantity);
  if (!Number.isFinite(qty) || qty < 0) errors.quantity = 'Quantity cannot be negative.';
  const minStock = Number(input.minStock);
  if (!Number.isFinite(minStock) || minStock < 0) errors.minStock = 'Minimum stock cannot be negative.';
  return errors;
}

export function saveProduct(state, input, editingId = null) {
  const errors = validateProductInput(input, state.products, editingId);
  if (Object.keys(errors).length) {
    const err = new Error('Please fix the highlighted fields.');
    err.fieldErrors = errors;
    throw err;
  }

  const barcodes = state.products.map((p) => p.barcode);
  const skus = state.products.map((p) => p.sku);
  const barcode = String(input.barcode || '').trim() || generateUniqueBarcode(barcodes);
  const sku = String(input.sku || '').trim() || generateSku(input.name, input.category, skus);

  if (editingId) {
    return {
      ...state,
      products: state.products.map((p) => (p.id === editingId ? {
        ...p,
        name: input.name.trim(),
        category: input.category,
        brand: String(input.brand || '').trim(),
        sku,
        barcode,
        purchasePricePaise: rupeesToPaise(input.purchasePrice),
        sellingPricePaise: rupeesToPaise(input.sellingPrice),
        quantity: Number(input.quantity),
        minStock: Number(input.minStock),
        unit: input.unit || 'pcs',
        image: input.image || p.image || '',
        mfgDate: input.mfgDate || p.mfgDate || '',
        expiryDate: input.expiryDate || p.expiryDate || '',
        batchNo: input.batchNo || p.batchNo || '',
        status: input.status || 'active',
      } : p)),
    };
  }

  const seq = (state.meta?.productSeq || state.products.length) + 1;
  const product = {
    id: `PRD-${String(seq).padStart(3, '0')}`,
    name: input.name.trim(),
    category: input.category,
    brand: String(input.brand || '').trim(),
    sku,
    barcode,
    purchasePricePaise: rupeesToPaise(input.purchasePrice),
    sellingPricePaise: rupeesToPaise(input.sellingPrice),
    quantity: Number(input.quantity) || 0,
    minStock: Number(input.minStock) || 0,
    unit: input.unit || 'pcs',
    mfgDate: input.mfgDate || '',
    expiryDate: input.expiryDate || '',
    batchNo: input.batchNo || '',
    image: input.image || '',
    createdAt: new Date().toISOString(),
    status: input.status || 'active',
  };

  return {
    ...state,
    products: [product, ...state.products],
    meta: { ...state.meta, productSeq: seq },
    createdProduct: product,
  };
}

export function deleteProduct(state, productId) {
  return {
    ...state,
    products: state.products.filter((p) => p.id !== productId),
  };
}
