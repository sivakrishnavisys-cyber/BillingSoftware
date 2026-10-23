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
}) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !product?.barcode) return;
    try {
      JsBarcode(svgRef.current, product.barcode, {
        format: 'CODE128',
        displayValue: true,
        fontSize: size === '38x25' ? 9 : 11,
        height: size === '38x25' ? 28 : size === '40x30' ? 34 : 40,
        margin: 2,
        width: size === '38x25' ? 1.1 : 1.3,
        background: '#ffffff',
        lineColor: '#111111',
      });
    } catch {
      /* invalid barcode characters */
    }
  }, [product?.barcode, size]);

  if (!product) return null;

  const packed = customPackedDate || product.mfgDate || new Date().toISOString().slice(0, 10);
  const expiry = customExpiryDate || product.expiryDate || '';

  return (
    <div className={`barcode-label size-${size}`}>
      <p className="label-name">{product.name}</p>
      
      <div className="label-sub-row">
        <span className="label-meta">SKU: {product.sku}</span>
        <strong className="label-price">{formatINR(product.sellingPricePaise)}</strong>
      </div>

      <svg ref={svgRef} role="img" aria-label={`Barcode ${product.barcode}`} />

      {/* Date of Packed & Date of Expiry */}
      <div className="label-dates-row">
        <span className="date-pkd">Pkd: {formatShortDate(packed)}</span>
        {expiry ? <span className="date-exp">Exp: {formatShortDate(expiry)}</span> : null}
      </div>
    </div>
  );
}
