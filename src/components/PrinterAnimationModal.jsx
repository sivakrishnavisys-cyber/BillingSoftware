import { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { Scissors } from 'lucide-react';
import {
  playPaperTearSound,
  playPaytmSuccessChime,
  playPrinterFeedSound,
} from '../utils/audioUtils';
import { formatINR } from '../utils/currencyUtils';
import { formatDateTime } from '../utils/dateUtils';
import { paymentLabel } from '../utils/receiptUtils';
import CelebrationPoppers from './CelebrationPoppers';

export default function PrinterAnimationModal({
  open,
  invoice,
  shop,
  onClose,
  onStartNewBill,
}) {
  const [progress, setProgress] = useState(0);
  const [isTearing, setIsTearing] = useState(false);
  const [popperTrigger, setPopperTrigger] = useState(0);
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
    setPopperTrigger((k) => k + 1); // Confetti celebration burst
    playPaytmSuccessChime(); // Success announcement chime
    playPrinterFeedSound(); // Thermal printer feed mechanical ticking

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
    }, 40);

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
    playPaperTearSound(); // Realistic crisp paper rip sound

    setTimeout(() => {
      if (onStartNewBill) {
        onStartNewBill();
      } else if (onClose) {
        onClose();
      }
    }, 380);
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
      {/* Subtle Background Celebration Poppers & Confetti */}
      <CelebrationPoppers triggerKey={popperTrigger} />

      {/* Centered Printer Device & Paper Rollout */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          zIndex: 10,
          maxWidth: 380,
          width: '100%',
        }}
      >
        {/* Physical Thermal Printer Top Hardware Mouth */}
        <div
          style={{
            width: 'min(360px, 94vw)',
            height: 64,
            background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
            borderRadius: '16px 16px 4px 4px',
            boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
            padding: '10px 16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            border: '1px solid #334155',
            position: 'relative',
            zIndex: 15,
          }}
        >
          {/* Hardware LEDs & Status */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  background: '#00ba7c',
                  boxShadow: '0 0 10px #00ba7c',
                  display: 'inline-block',
                }}
                title="Power On"
              />
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  background: progress < 100 ? '#00b9f5' : '#64748b',
                  boxShadow: progress < 100 ? '0 0 10px #00b9f5' : 'none',
                  animation: progress < 100 ? 'pulse 0.5s infinite alternate' : 'none',
                  display: 'inline-block',
                }}
                title="Paper Feed"
              />
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.06em' }}>
                {progress < 100 ? 'PRINTING BILL...' : 'PRINT READY ✓'}
              </span>
            </div>

            <div
              style={{
                fontSize: '0.65rem',
                fontWeight: 800,
                color: '#38bdf8',
                background: 'rgba(56, 189, 248, 0.14)',
                padding: '2px 8px',
                borderRadius: 4,
                letterSpacing: '0.08em',
                border: '1px solid rgba(56, 189, 248, 0.3)',
              }}
            >
              THERMAL POS 80MM
            </div>
          </div>

          {/* Metal Cutter Blade Slot */}
          <div
            style={{
              width: '100%',
              height: 10,
              background: '#020617',
              borderRadius: 3,
              boxShadow: 'inset 0 3px 6px rgba(0,0,0,0.95)',
              position: 'relative',
              borderBottom: '1px dashed #475569',
            }}
          />
        </div>

        {/* The Animated Thermal Receipt Paper */}
        <div
          className={`printer-direct-bill ${isTearing ? 'tearing' : ''}`}
          style={{
            width: 'min(330px, 88vw)',
            maxHeight: 'min(440px, 58vh)',
            height: `${Math.max(65, (progress / 100) * 400)}px`,
            transition: isTearing ? undefined : 'height 0.12s linear',
            background: '#ffffff',
            boxShadow: '0 20px 45px rgba(0,0,0,0.35)',
            borderRadius: '0 0 6px 6px',
            overflowY: 'auto',
            padding: '14px 16px 20px',
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: 11,
            lineHeight: 1.34,
            color: '#0f172a',
            marginTop: -3,
            zIndex: 10,
            position: 'relative',
            borderLeft: '1px solid #cbd5e1',
            borderRight: '1px solid #cbd5e1',
          }}
        >
          {/* Serrated Bottom Edge */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 6,
              background: 'radial-gradient(circle, transparent, transparent 50%, #f1f5f9 50%, #f1f5f9 100%)',
              backgroundSize: '8px 8px',
            }}
          />

          {/* Receipt Store Header */}
          <div style={{ textAlign: 'center', borderBottom: '1px dashed #94a3b8', paddingBottom: 6, marginBottom: 6 }}>
            <div style={{ fontWeight: 800, fontSize: 13, textTransform: 'uppercase', color: '#002970' }}>
              {shop?.name || 'Retail Supermarket'}
            </div>
            <div style={{ fontSize: 9.5, color: '#64748b' }}>{shop?.address}</div>
            <div style={{ fontSize: 9.5, color: '#64748b' }}>Ph: {shop?.phone}</div>
            {shop?.gstin && <div style={{ fontSize: 9, color: '#64748b' }}>GSTIN: {shop.gstin}</div>}
          </div>

          {/* Receipt Bill Meta */}
          <div style={{ fontSize: 9.5, borderBottom: '1px dashed #94a3b8', paddingBottom: 4, marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Bill: <strong>{invoice.invoiceNumber || 'INV-TEMP'}</strong></span>
              <span>{new Date(invoice.createdAt || Date.now()).toLocaleDateString('en-IN')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Cust: {invoice.customerName || 'Walk-in'}</span>
              <span style={{ fontWeight: 700, color: '#16a34a' }}>
                {paymentLabel(invoice.paymentMethod || 'cash').toUpperCase()} (PAID ✓)
              </span>
            </div>
          </div>

          {/* Items Table */}
          <div style={{ marginBottom: 6 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr',
                fontWeight: 700,
                borderBottom: '1px dashed #94a3b8',
                paddingBottom: 2,
                fontSize: 9.5,
              }}
            >
              <span>Item</span>
              <span style={{ textAlign: 'center' }}>Qty</span>
              <span style={{ textAlign: 'right' }}>Total</span>
            </div>

            {invoice.items?.map((it, idx) => (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr',
                  padding: '2px 0',
                  fontSize: 9.5,
                }}
              >
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {it.name}
                </span>
                <span style={{ textAlign: 'center' }}>{it.qty}</span>
                <span style={{ textAlign: 'right', fontWeight: 600 }}>{formatINR(it.lineTotalPaise)}</span>
              </div>
            ))}
          </div>

          {/* Receipt Totals */}
          <div
            style={{
              borderTop: '1px dashed #94a3b8',
              paddingTop: 4,
              marginBottom: 6,
              fontSize: 9.5,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Subtotal</span>
              <span>{formatINR(invoice.subtotalPaise)}</span>
            </div>

            {invoice.discountPaise > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                <span>Discount</span>
                <span>-{formatINR(invoice.discountPaise)}</span>
              </div>
            )}

            {invoice.taxPaise > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>GST Tax</span>
                <span>{formatINR(invoice.taxPaise)}</span>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 800,
                fontSize: 12,
                borderTop: '1px dashed #000',
                marginTop: 2,
                paddingTop: 3,
              }}
            >
              <span>GRAND TOTAL</span>
              <span>{formatINR(invoice.grandTotalPaise)}</span>
            </div>
          </div>

          {/* Barcode Graphic */}
          <div style={{ textAlign: 'center', marginTop: 4, marginBottom: 2 }}>
            <svg ref={barcodeRef} style={{ maxWidth: '100%' }} />
          </div>

          <div style={{ textAlign: 'center', fontSize: 8.5, color: '#64748b' }}>
            *** Thank You! Visit Again ***
          </div>
        </div>

        {/* Floating Tear Instruction Pill */}
        <div
          className="tear-hint-pill"
          style={{
            marginTop: 22,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            color: '#ffffff',
            padding: '10px 22px',
            borderRadius: 999,
            fontSize: '0.88rem',
            fontWeight: 700,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            zIndex: 20,
          }}
        >
          <Scissors size={18} color="#38bdf8" />
          <span>Click anywhere to tear bill & continue</span>
        </div>
      </div>
    </div>
  );
}
