import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { formatINR } from '../utils/currencyUtils';
import { formatDateTime } from '../utils/dateUtils';
import { paymentLabel } from '../utils/receiptUtils';

export default function Receipt({ invoice, shop, layout = '80mm' }) {
  const barcodeRef = useRef(null);

  useEffect(() => {
    if (barcodeRef.current && invoice?.invoiceNumber) {
      try {
        JsBarcode(barcodeRef.current, invoice.invoiceNumber, {
          format: 'CODE128',
          displayValue: true,
          fontSize: 10,
          height: layout === 'a4' ? 32 : 24,
          margin: 2,
          width: 1.2,
          background: '#ffffff',
          lineColor: '#111111',
        });
      } catch {
        // fail-safe if invalid chars
      }
    }
  }, [invoice?.invoiceNumber, layout]);

  if (!invoice) return null;

  const halfTax = Math.round((invoice.taxPaise || 0) / 2);

  if (layout === 'a4') {
    return (
      <section className="receipt layout-a4">
        <header className="a4-header">
          <div className="a4-shop-info">
            <h1 className="a4-shop-title">{shop.name}</h1>
            <p className="a4-shop-addr">{shop.address}</p>
            <p><strong>Phone:</strong> {shop.phone} {shop.email ? ` | Email: ${shop.email}` : ''}</p>
            {shop.gstin ? <p><strong>GSTIN:</strong> {shop.gstin}</p> : null}
          </div>
          <div className="a4-inv-meta">
            <span className="a4-badge">TAX INVOICE</span>
            <h2>{invoice.invoiceNumber}</h2>
            <p><strong>Date:</strong> {formatDateTime(invoice.createdAt)}</p>
            <p><strong>Payment:</strong> {paymentLabel(invoice.paymentMethod).toUpperCase()} (Demo)</p>
          </div>
        </header>

        <div className="a4-customer-box">
          <div>
            <span className="a4-box-title">Billed To:</span>
            <p><strong>{invoice.customerName || 'Walk-in Customer'}</strong></p>
            {invoice.customerPhone ? <p>Mobile: {invoice.customerPhone}</p> : null}
          </div>
          <div>
            <span className="a4-box-title">Branch & Counter:</span>
            <p><strong>{invoice.branchName || 'Main Branch'}</strong></p>
            <p>{invoice.counterName || 'Counter 1 (Express POS)'} {invoice.cashierName ? `· Cashier: ${invoice.cashierName}` : ''}</p>
          </div>
        </div>

        <table className="a4-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>#</th>
              <th>Item Description</th>
              <th>SKU / Barcode</th>
              <th style={{ textAlign: 'right' }}>Price</th>
              <th style={{ textAlign: 'center' }}>Qty</th>
              <th style={{ textAlign: 'right' }}>Discount</th>
              <th style={{ textAlign: 'right' }}>Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((it, idx) => (
              <tr key={`${it.productId}-${it.barcode}-${idx}`}>
                <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                <td>
                  <strong>{it.name}</strong>
                  {it.unit ? <span className="muted small"> ({it.unit})</span> : null}
                </td>
                <td className="muted small">{it.sku} · {it.barcode}</td>
                <td style={{ textAlign: 'right' }}>{formatINR(it.unitPricePaise)}</td>
                <td style={{ textAlign: 'center' }}>{it.qty}</td>
                <td style={{ textAlign: 'right' }}>
                  {it.discountPaise > 0 ? `-${formatINR(it.discountPaise)}` : '—'}
                </td>
                <td style={{ textAlign: 'right' }}><strong>{formatINR(it.lineTotalPaise)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="a4-bottom-section">
          <div className="a4-notes">
            <p><strong>Terms & Notes:</strong></p>
            <p className="muted small">1. Goods once sold can be exchanged within 7 days with original invoice.</p>
            <p className="muted small">2. This is a computer-generated simulated receipt for demo purposes.</p>
            <div className="receipt-barcode-box" style={{ marginTop: 12 }}>
              <svg ref={barcodeRef} />
            </div>
          </div>

          <div className="a4-totals-table">
            <div className="a4-tot-row"><span>Subtotal</span><span>{formatINR(invoice.subtotalPaise)}</span></div>
            {invoice.discountPaise > 0 ? (
              <div className="a4-tot-row text-success">
                <span>Total Savings/Discount</span>
                <span>-{formatINR(invoice.discountPaise)}</span>
              </div>
            ) : null}
            {invoice.taxPaise > 0 ? (
              <>
                <div className="a4-tot-row">
                  <span>CGST ({(invoice.taxRate / 2).toFixed(1)}%)</span>
                  <span>{formatINR(halfTax)}</span>
                </div>
                <div className="a4-tot-row">
                  <span>SGST ({(invoice.taxRate / 2).toFixed(1)}%)</span>
                  <span>{formatINR(invoice.taxPaise - halfTax)}</span>
                </div>
              </>
            ) : null}
            <div className="a4-tot-row grand">
              <span>Grand Total</span>
              <span>{formatINR(invoice.grandTotalPaise)}</span>
            </div>
            <div className="a4-tot-row">
              <span>Amount Paid ({paymentLabel(invoice.paymentMethod)})</span>
              <span>{formatINR(invoice.amountPaidPaise)}</span>
            </div>
            {invoice.paymentMethod === 'cash' ? (
              <div className="a4-tot-row">
                <span>Change Returned</span>
                <span>{formatINR(invoice.changePaise)}</span>
              </div>
            ) : null}
            {invoice.customerKhataBalancePaise !== undefined ? (
              <div className="a4-tot-row text-danger" style={{ borderTop: '1px dashed #cbd5e1', marginTop: 4, paddingTop: 4, fontWeight: 700 }}>
                <span>Customer Khata Total Due</span>
                <span>{formatINR(invoice.customerKhataBalancePaise)}</span>
              </div>
            ) : null}
          </div>
        </div>

        <footer className="a4-footer">
          <p><strong>{shop.receiptFooter}</strong></p>
          <p className="tiny muted">Demo Application — Not connected to any live banking or tax authority.</p>
        </footer>
      </section>
    );
  }

  // 80mm Thermal Receipt Layout
  return (
    <section className="receipt layout-80mm">
      <header className="receipt-head">
        <h2>{shop.name}</h2>
        <p>{shop.address}</p>
        <p>Ph: {shop.phone}</p>
        {shop.email ? <p>{shop.email}</p> : null}
        {shop.gstin ? <p>GSTIN: {shop.gstin}</p> : null}
        <p style={{ fontWeight: 700, marginTop: 2 }}>{invoice.branchName || 'Main Branch'} · {invoice.counterName || 'Counter 1'}</p>
      </header>

      <div className="receipt-meta">
        <p><strong>INVOICE:</strong> {invoice.invoiceNumber}</p>
        <p><strong>DATE:</strong> {formatDateTime(invoice.createdAt)}</p>
        {invoice.customerName ? <p><strong>CUSTOMER:</strong> {invoice.customerName}</p> : null}
        {invoice.customerPhone ? <p><strong>PHONE:</strong> {invoice.customerPhone}</p> : null}
        <p><strong>PAYMENT:</strong> {paymentLabel(invoice.paymentMethod).toUpperCase()} (DEMO)</p>
      </div>

      <table className="receipt-table">
        <thead>
          <tr>
            <th>Item</th>
            <th style={{ textAlign: 'center' }}>Qty</th>
            <th style={{ textAlign: 'right' }}>Rate</th>
            <th style={{ textAlign: 'right' }}>Amt</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((it, idx) => (
            <tr key={`${it.productId}-${it.barcode}-${idx}`}>
              <td>
                <div className="receipt-item-name">{it.name}</div>
                <div className="tiny muted">{it.sku}</div>
              </td>
              <td style={{ textAlign: 'center' }}>{it.qty}</td>
              <td style={{ textAlign: 'right' }}>{formatINR(it.unitPricePaise)}</td>
              <td style={{ textAlign: 'right' }}>{formatINR(it.lineTotalPaise)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="receipt-totals">
        <div><dt>Subtotal</dt><dd>{formatINR(invoice.subtotalPaise)}</dd></div>
        {invoice.discountPaise > 0 ? (
          <div><dt>Discount</dt><dd>-{formatINR(invoice.discountPaise)}</dd></div>
        ) : null}
        {invoice.taxPaise > 0 ? (
          <>
            <div><dt>CGST ({(invoice.taxRate / 2).toFixed(1)}%)</dt><dd>{formatINR(halfTax)}</dd></div>
            <div><dt>SGST ({(invoice.taxRate / 2).toFixed(1)}%)</dt><dd>{formatINR(invoice.taxPaise - halfTax)}</dd></div>
          </>
        ) : null}
        <div className="grand"><dt>GRAND TOTAL</dt><dd>{formatINR(invoice.grandTotalPaise)}</dd></div>
        <div><dt>Amount Paid</dt><dd>{formatINR(invoice.amountPaidPaise)}</dd></div>
        {invoice.paymentMethod === 'cash' ? (
          <div><dt>Change Due</dt><dd>{formatINR(invoice.changePaise)}</dd></div>
        ) : null}
        {invoice.customerKhataBalancePaise !== undefined ? (
          <div style={{ color: 'var(--red)', fontWeight: 700 }}><dt>KHATA TOTAL DUE</dt><dd>{formatINR(invoice.customerKhataBalancePaise)}</dd></div>
        ) : null}
      </dl>

      <div className="receipt-barcode-box">
        <svg ref={barcodeRef} />
      </div>

      <p className="receipt-foot">{shop.receiptFooter}</p>
      <p className="tiny center muted">Demo receipt · payment not sent to real gateway.</p>
    </section>
  );
}
