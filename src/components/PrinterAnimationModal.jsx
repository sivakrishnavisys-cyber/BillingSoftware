import { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { Scissors, CheckCircle2, Store } from 'lucide-react';
import {
  playPaperTearSound,
  playPaytmSuccessChime,
  playPrinterFeedSound,
} from '../utils/audioUtils';
import { formatINR } from '../utils/currencyUtils';
import { paymentLabel } from '../utils/receiptUtils';

export default function PrinterAnimationModal({
  open,
  invoice,
  shop,
  onClose,
  onStartNewBill,
}) {
  const [progress, setProgress] = useState(0);
  const [isTearing, setIsTearing] = useState(false);
  const barcodeRef = useRef(null);

  // Restart print simulation & sound whenever modal opens
  useEffect(() => {
    if (!open || !invoice) {
      setProgress(0);
      setIsTearing(false);
      return;
    }

    setProgress(0);
    setIsTearing(false);
    playPaytmSuccessChime(); // Professional soundbox confirmation chime
    playPrinterFeedSound(); // Thermal printer mechanical paper feed sound

    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 5;
      setProgress((prev) => {
        const next = Math.min(100, prev + 5);
        if (next >= 100) {
          clearInterval(interval);
        }
        return next;
      });
    }, 32);

    return () => clearInterval(interval);
  }, [open, invoice]);

  // Render barcode on thermal receipt
  useEffect(() => {
    if (barcodeRef.current && invoice?.invoiceNumber) {
      try {
        JsBarcode(barcodeRef.current, invoice.invoiceNumber, {
          format: 'CODE128',
          displayValue: true,
          fontSize: 9,
          height: 22,
          margin: 2,
          width: 1.15,
          background: '#ffffff',
          lineColor: '#111111',
        });
      } catch {
        // fail-safe
      }
    }
  }, [invoice?.invoiceNumber, open]);

  // Lock body scroll while modal is visible
  useEffect(() => {
    if (!open) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Tear the bill and close when user clicks or presses a key
  const handleTearAndClose = () => {
    if (isTearing) return;
    setIsTearing(true);
    playPaperTearSound(); // Crisp realistic paper bite and tear sound

    setTimeout(() => {
      if (onStartNewBill) {
        onStartNewBill();
      } else if (onClose) {
        onClose();
      }
    }, 400);
  };

  // Keyboard shortcut listener: Enter / Space / Escape tears bill
  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleTearAndClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, isTearing, onStartNewBill, onClose]);

  if (!open || !invoice) return null;

  return (
    <div
      className="printer-direct-overlay"
      onClick={handleTearAndClose}
      role="dialog"
      aria-modal="true"
      aria-label="Click anywhere to tear receipt and continue"
    >
      {/* 3D Perspective Container for Vector Illustration Printer & Paper */}
      <div className="printer-direct-bill-container">
        {/* Vector Thermal Printer Hardware Housing */}
        <div className="vector-printer-housing">
          {/* Top Chamfered Bezel with Brushed Finish */}
          <div className="vector-printer-top-bezel">
            <div className="vector-printer-brand">
              <span className="vector-printer-logo-mark">⚡</span>
              <span className="vector-printer-model">THERMAL 80-PRO</span>
            </div>

            {/* Micro Status LEDs */}
            <div className="vector-printer-status-bar">
              <div className="vector-led-group">
                <span className="vector-led led-green" title="Power On" />
                <span className="vector-led-text">ONLINE</span>
              </div>
              <div className="vector-led-group">
                <span
                  className={`vector-led ${progress < 100 ? 'led-cyan pulse' : 'led-muted'}`}
                  title="Print Feed"
                />
                <span className="vector-led-text">
                  {progress < 100 ? 'FEEDING' : 'READY'}
                </span>
              </div>
            </div>
          </div>

          {/* Recessed Cutter Slot with Precision Laser Teeth */}
          <div className="vector-printer-cutter-slot">
            <svg
              className="vector-cutter-teeth"
              viewBox="0 0 100 8"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <polygon
                points="0,0 2,7 4,0 6,7 8,0 10,7 12,0 14,7 16,0 18,7 20,0 22,7 24,0 26,7 28,0 30,7 32,0 34,7 36,0 38,7 40,0 42,7 44,0 46,7 48,0 50,7 52,0 54,7 56,0 58,7 60,0 62,7 64,0 66,7 68,0 70,7 72,0 74,7 76,0 78,7 80,0 82,7 84,0 86,7 88,0 90,7 92,0 94,7 96,0 98,7 100,0"
                fill="#cbd5e1"
              />
            </svg>
          </div>
        </div>

        {/* The Animated Thermal Receipt Paper */}
        <div
          className={`printer-direct-bill vector-receipt-paper ${isTearing ? 'tearing' : ''}`}
          style={{
            height: `${Math.max(70, (progress / 100) * 410)}px`,
          }}
        >
          {/* Serrated Bottom Edge Pattern */}
          <div className="receipt-serrated-edge" />

          {/* Receipt Store Header */}
          <div className="receipt-header-section">
            <div className="receipt-store-title">
              {shop?.name || 'Nani Super Mart'}
            </div>
            <div className="receipt-sub-text">{shop?.address}</div>
            <div className="receipt-sub-text">Ph: {shop?.phone}</div>
            {shop?.gstin ? (
              <div className="receipt-sub-text">GSTIN: {shop.gstin}</div>
            ) : null}

            {/* Branch & Counter Tag */}
            <div className="receipt-branch-counter-tag">
              <span>{invoice.branchName || 'Main Branch'}</span>
              <span>•</span>
              <span>{invoice.counterName || 'Counter 1'}</span>
            </div>
          </div>

          {/* Receipt Meta & Customer Details */}
          <div className="receipt-meta-section">
            <div className="receipt-meta-row">
              <span>Bill: <strong>{invoice.invoiceNumber || 'INV-TEMP'}</strong></span>
              <span>{new Date(invoice.createdAt || Date.now()).toLocaleDateString('en-IN')}</span>
            </div>
            <div className="receipt-meta-row">
              <span>Cust: {invoice.customerName || 'Walk-in Customer'}</span>
              <span className="receipt-paid-badge">
                <CheckCircle2 size={10} style={{ display: 'inline', marginRight: 2 }} />
                {paymentLabel(invoice.paymentMethod || 'cash').toUpperCase()}
              </span>
            </div>
            {invoice.cashierName ? (
              <div className="receipt-meta-row" style={{ color: '#64748b' }}>
                <span>Cashier: {invoice.cashierName}</span>
                <span>{new Date(invoice.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ) : null}
          </div>

          {/* Items Table */}
          <div className="receipt-items-section">
            <div className="receipt-items-header">
              <span>Item</span>
              <span style={{ textAlign: 'center' }}>Qty</span>
              <span style={{ textAlign: 'right' }}>Total</span>
            </div>

            {invoice.items?.map((it, idx) => (
              <div key={idx} className="receipt-item-row">
                <span className="receipt-item-name" title={it.name}>
                  {it.name}
                </span>
                <span style={{ textAlign: 'center' }}>{it.qty}</span>
                <span style={{ textAlign: 'right', fontWeight: 600 }}>
                  {formatINR(it.lineTotalPaise)}
                </span>
              </div>
            ))}
          </div>

          {/* Receipt Totals Summary */}
          <div className="receipt-totals-section">
            <div className="receipt-total-row">
              <span>Subtotal</span>
              <span>{formatINR(invoice.subtotalPaise)}</span>
            </div>

            {invoice.discountPaise > 0 ? (
              <div className="receipt-total-row text-discount">
                <span>Discount</span>
                <span>-{formatINR(invoice.discountPaise)}</span>
              </div>
            ) : null}

            {invoice.taxPaise > 0 ? (
              <div className="receipt-total-row">
                <span>GST Tax</span>
                <span>{formatINR(invoice.taxPaise)}</span>
              </div>
            ) : null}

            <div className="receipt-grand-total-row">
              <span>GRAND TOTAL</span>
              <span>{formatINR(invoice.grandTotalPaise)}</span>
            </div>
          </div>

          {/* Barcode Graphic */}
          <div className="receipt-barcode-wrapper">
            <svg ref={barcodeRef} style={{ maxWidth: '100%' }} />
          </div>

          <div className="receipt-footer-text">
            *** Thank You! Please Visit Again ***
          </div>
        </div>

        {/* Minimalist Tear Instruction Pill */}
        <div className="tear-hint-pill">
          <Scissors size={15} color="#38bdf8" />
          <span>Click anywhere to tear bill & continue</span>
        </div>
      </div>
    </div>
  );
}
