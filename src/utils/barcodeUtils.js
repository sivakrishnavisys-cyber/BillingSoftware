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

export function lookupProductByCode(products, code) {
  const q = String(code || '').trim().toLowerCase();
  if (!q) return null;
  return (products || []).find((p) =>
    String(p.barcode).toLowerCase() === q
    || String(p.sku).toLowerCase() === q
    || String(p.id).toLowerCase() === q
  ) || null;
}
