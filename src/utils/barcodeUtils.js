const BARCODE_START = 890100000001;

export function isValidBarcode(value) {
  const text = String(value || '').trim();
  if (text.length < 4 || text.length > 32) return false;
  return /^[A-Za-z0-9\-]+$/.test(text);
}

export function generateUniqueBarcode(existingBarcodes = []) {
  const used = new Set((existingBarcodes || []).map((b) => String(b)));
  let n = BARCODE_START;
  while (used.has(String(n))) n += 1;
  return String(n);
}

export function generateSku(name, category, existingSkus = []) {
  const used = new Set((existingSkus || []).map((s) => String(s).toUpperCase()));
  const prefix = (category || name || 'PRD')
    .replace(/[^A-Za-z]/g, '')
    .slice(0, 3)
    .toUpperCase()
    .padEnd(3, 'X');
  let i = 1;
  let sku = `${prefix}-${String(i).padStart(3, '0')}`;
  while (used.has(sku)) {
    i += 1;
    sku = `${prefix}-${String(i).padStart(3, '0')}`;
  }
  return sku;
}

export function lookupProductOrVariant(products, code) {
  const q = String(code || '').trim().toLowerCase();
  if (!q) return null;

  for (const p of products || []) {
    // 1. Check variant barcode or variant SKU match first
    if (Array.isArray(p.variants) && p.variants.length > 0) {
      const matchedVariant = p.variants.find(
        (v) =>
          String(v.barcode || '').toLowerCase() === q ||
          String(v.sku || '').toLowerCase() === q ||
          String(v.id || '').toLowerCase() === q
      );
      if (matchedVariant) {
        return { product: p, variant: matchedVariant, isVariantScan: true };
      }
    }

    // 2. Check main product code
    if (
      String(p.barcode || '').toLowerCase() === q ||
      String(p.sku || '').toLowerCase() === q ||
      String(p.id || '').toLowerCase() === q
    ) {
      return { product: p, variant: null, isVariantScan: false };
    }
  }

  return null;
}

export function lookupProductByCode(products, code) {
  const hit = lookupProductOrVariant(products, code);
  if (!hit) return null;
  if (hit.variant) {
    return {
      ...hit.product,
      variantId: hit.variant.id,
      variantName: hit.variant.name,
      name: `${hit.product.name} (${hit.variant.name})`,
      sku: hit.variant.sku,
      barcode: hit.variant.barcode,
      sellingPricePaise: hit.variant.sellingPricePaise,
      purchasePricePaise: hit.variant.purchasePricePaise,
      unit: hit.variant.unit || hit.product.unit,
      quantity: hit.variant.quantity !== undefined ? hit.variant.quantity : hit.product.quantity,
    };
  }
  return hit.product;
}
