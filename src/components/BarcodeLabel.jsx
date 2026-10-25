import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { formatINR } from '../utils/currencyUtils';

function formatShortDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

export default function BarcodeLabel({
  product,
  size = '50x30',
  customPackedDate = '',
  customExpiryDate = '',
  shopName = 'Nani Super Mart',
  showStoreHeader = true,
}) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !product?.barcode) return;
    try {
      const barcodeHeight = size === '38x25' ? 24 : size === '40x30' ? 30 : 36;
      const fontSize = size === '38x25' ? 8.5 : size === '40x30' ? 9.5 : 10.5;
      const barcodeWidth = size === '38x25' ? 1.05 : size === '40x30' ? 1.15 : 1.25;

      JsBarcode(svgRef.current, String(product.barcode), {
        format: 'CODE128',
        displayValue: true,
        fontSize,
        font: 'monospace',
        fontOptions: 'bold',
        textMargin: 2,
        height: barcodeHeight,
        margin: 1,
        width: barcodeWidth,
        background: '#ffffff',
        lineColor: '#0f172a',
      });
    } catch {
      // fail-safe on invalid barcode characters
    }
  }, [product?.barcode, size]);

  if (!product) return null;

  const packed = customPackedDate || product.mfgDate || new Date().toISOString().slice(0, 10);
  const expiry = customExpiryDate || product.expiryDate || '';

  return (
    <div className={`retail-sticker-label size-${size}`}>
      {/* Sticker Header: Store Name & Department */}
      {showStoreHeader && size !== '38x25' ? (
        <div className="sticker-header-strip">
          <span className="sticker-shop-name">{shopName}</span>
          <span className="sticker-cat-tag">{product.category || 'Retail'}</span>
        </div>
      ) : null}

      {/* Product Name Title */}
      <div className="sticker-product-title" title={product.name}>
        {product.name}
      </div>

      {/* Meta Row: SKU & High-Contrast MRP Tag */}
      <div className="sticker-meta-row">
        <span className="sticker-sku-tag">{product.sku}</span>
        <div className="sticker-mrp-block">
          <span className="sticker-mrp-label">MRP</span>
          <strong className="sticker-mrp-value">{formatINR(product.sellingPricePaise)}</strong>
        </div>
      </div>

      {/* Barcode SVG Container */}
      <div className="sticker-barcode-center">
        <svg ref={svgRef} role="img" aria-label={`Barcode ${product.barcode}`} />
      </div>

      {/* Bottom Dates Strip: Pkd & Exp */}
      <div className="sticker-dates-strip">
        <span className="sticker-date-pkd">Pkd: {formatShortDate(packed)}</span>
        {expiry ? (
          <span className="sticker-date-exp">Exp: {formatShortDate(expiry)}</span>
        ) : (
          <span className="sticker-date-unit">Net: 1 {product.unit || 'pcs'}</span>
        )}
      </div>
    </div>
  );
}
