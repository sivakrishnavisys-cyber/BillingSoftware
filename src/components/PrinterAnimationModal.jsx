import { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import {
  CheckCircle2,
  Download,
  PartyPopper,
  Plus,
  Printer,
  Share2,
  Sparkles,
  X,
} from 'lucide-react';
import { playPrinterFeedSound } from '../utils/audioUtils';
import { formatINR } from '../utils/currencyUtils';
import { formatDateTime } from '../utils/dateUtils';
import { exportInvoicePdf } from '../utils/pdfReceiptUtils';
import { paymentLabel } from '../utils/receiptUtils';
import CelebrationPoppers from './CelebrationPoppers';

export default function PrinterAnimationModal({
  open,
  invoice,
  shop,
  onClose,
  onStartNewBill,
  onOpenStandardPrint,
}) {
  const [stage, setStage] = useState('idle'); // 'idle' | 'printing' | 'done'
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('Initializing printer...');
  const [popperTrigger, setPopperTrigger] = useState(0);
  const barcodeRef = useRef(null);

  // Restart print simulation whenever modal opens
  useEffect(() => {
    if (!open || !invoice) {
      setStage('idle');
      setProgress(0);
      return;
    }

    setStage('printing');
    setProgress(0);
    setStatusMsg('Connecting to POS thermal printer...');
    setPopperTrigger((k) => k + 1); // Celebration poppers burst on payment confirmation
    playPrinterFeedSound();

    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 4;
      setProgress((prev) => {
        const next = Math.min(100, prev + 4);
        if (next < 30) {
          setStatusMsg('Connecting to POS thermal printer...');
        } else if (next < 70) {
          setStatusMsg(`Printing bill #${invoice.invoiceNumber}...`);
        } else if (next < 95) {
          setStatusMsg('Cutting thermal paper...');
        } else {
          setStatusMsg('Print Complete! ✓ Ready for customer');
          setStage('done');
          setPopperTrigger((k) => k + 1); // Second celebration burst when paper is cut
          clearInterval(interval);
        }
        return next;
      });
    }, 45);

    return () => clearInterval(interval);
  }, [open, invoice]);

  // Render barcode on miniature animated receipt
  useEffect(() => {
    if (barcodeRef.current && invoice?.invoiceNumber) {
      try {
        JsBarcode(barcodeRef.current, invoice.invoiceNumber, {
          format: 'CODE128',
          displayValue: true,
          fontSize: 9,
          height: 20,
          margin: 2,
          width: 1.1,
          background: '#ffffff',
          lineColor: '#111111',
        });
      } catch {
        // fail-safe
      }
    }
  }, [invoice?.invoiceNumber, open]);

  // Lock body scroll and handle Escape key for full-screen view
  useEffect(() => {
    if (!open) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || !invoice) return null;

  const downloadPdf = () => {
    exportInvoicePdf(invoice, shop, '80mm');
  };

  const getWhatsAppShareUrl = () => {
    if (!invoice) return '';
    const cleanPhone = (invoice.customerPhone || '').replace(/\D/g, '');
    const text = encodeURIComponent(
      `Hello ${invoice.customerName || 'Customer'},\nThank you for shopping at *${shop?.name || 'our store'}*!\n\n` +
      `*Bill No:* ${invoice.invoiceNumber}\n` +
      `*Total Amount:* ₹${((invoice.grandTotalPaise || 0) / 100).toFixed(2)}\n` +
      `*Items:* ${invoice.items?.length || 0} products\n` +
      `*Payment:* ${paymentLabel(invoice.paymentMethod)}\n\n` +
      `Visit again soon!`
    );
    return cleanPhone ? `https://wa.me/91${cleanPhone.slice(-10)}?text=${text}` : `https://wa.me/?text=${text}`;
  };

  const handlePrintSystemDialog = () => {
    if (onOpenStandardPrint) {
      onOpenStandardPrint();
    } else {
      window.print();
    }
  };

  return (
    <div
      className="modal-backdrop printer-fullscreen-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Thermal Receipt Printing View"
    >
      {/* Background Celebration Poppers & Confetti Animation */}
      <CelebrationPoppers triggerKey={popperTrigger} />

      {/* Full-Width Top Header Bar */}
      <header className="printer-fullscreen-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.3), rgba(14, 165, 233, 0.15))',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              display: 'grid',
              placeItems: 'center',
              color: '#38bdf8',
              boxShadow: '0 0 16px rgba(56, 189, 248, 0.25)',
            }}
          >
            <Printer size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', fontWeight: 800, letterSpacing: '-0.01em' }}>
                Receipt Printing
              </h2>
              <span
                style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 6,
                  letterSpacing: '0.05em',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                }}
              >
                POS THERMAL 80MM
              </span>
              <span
                style={{
                  background: 'rgba(74, 222, 128, 0.15)',
                  color: '#4ade80',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 6,
                  border: '1px solid rgba(74, 222, 128, 0.3)',
                }}
              >
                PAID ✓
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 2 }}>
              Invoice #{invoice.invoiceNumber} · {shop?.name || 'Retail Supermarket'} · {formatDateTime(invoice.createdAt)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={() => setPopperTrigger((k) => k + 1)}
            style={{
              background: 'rgba(245, 158, 11, 0.18)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              color: '#fbbf24',
              borderRadius: 8,
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: 700,
              transition: 'all 0.15s ease',
            }}
            title="Pop More Celebration Confetti"
          >
            <PartyPopper size={16} /> Pop More 🎉
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#cbd5e1',
              borderRadius: 8,
              width: 38,
              height: 38,
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Close Receipt View (Esc)"
            aria-label="Close receipt view"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      {/* Full-Width Progress & Status Banner */}
      <div
        style={{
          width: '100%',
          boxSizing: 'border-box',
          background: '#0b1120',
          padding: '8px 24px',
          borderBottom: '1px solid #1e293b',
          flexShrink: 0,
          zIndex: 8,
        }}
      >
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span
              style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: stage === 'done' ? '#4ade80' : '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {stage === 'done' ? <CheckCircle2 size={16} color="#4ade80" /> : <Sparkles size={16} color="#38bdf8" />}
              {statusMsg}
            </span>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#94a3b8' }}>
              {progress}%
            </span>
          </div>

          <div
            style={{
              height: 6,
              background: '#1e293b',
              borderRadius: 999,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                background:
                  stage === 'done'
                    ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                    : 'linear-gradient(90deg, #0284c7, #38bdf8)',
                transition: 'width 0.1s ease',
                borderRadius: 999,
                boxShadow: stage === 'done' ? '0 0 12px rgba(74, 222, 128, 0.7)' : '0 0 12px rgba(56, 189, 248, 0.7)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Middle Interactive Thermal Printer Viewport */}
      <div className="printer-fullscreen-viewport">
        {/* Physical Printer Top Body */}
        <div
          style={{
            width: 'min(380px, 94vw)',
            height: 72,
            background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
            borderRadius: '16px 16px 6px 6px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            position: 'relative',
            zIndex: 10,
            padding: '10px 16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            border: '1px solid #334155',
            flexShrink: 0,
          }}
        >
          {/* Printer LEDs & Branding */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#22c55e',
                  boxShadow: '0 0 10px #22c55e',
                  display: 'inline-block',
                }}
                title="Power On"
              />
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: stage === 'printing' ? '#38bdf8' : '#64748b',
                  boxShadow: stage === 'printing' ? '0 0 10px #38bdf8' : 'none',
                  animation: stage === 'printing' ? 'pulse 0.6s infinite alternate' : 'none',
                  display: 'inline-block',
                }}
                title="Paper Feed"
              />
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em' }}>
                ONLINE
              </span>
            </div>

            <div
              style={{
                fontSize: '0.65rem',
                fontWeight: 800,
                color: '#cbd5e1',
                background: 'rgba(255,255,255,0.08)',
                padding: '2px 8px',
                borderRadius: 4,
                letterSpacing: '0.08em',
              }}
            >
              POS THERMAL 80MM
            </div>
          </div>

          {/* Paper Output Slot (Mouth) */}
          <div
            style={{
              width: '100%',
              height: 14,
              background: '#020617',
              borderRadius: 4,
              boxShadow: 'inset 0 3px 6px rgba(0,0,0,0.9)',
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid #1e293b',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, rgba(0,0,0,0.85) 0%, transparent 100%)',
              }}
            />
          </div>
        </div>

        {/* Animated Receipt Paper Rolling Out */}
        <div
          style={{
            width: 'min(340px, 88vw)',
            maxHeight: 'min(440px, 50vh)',
            height: `${Math.max(45, (progress / 100) * 370)}px`,
            transition: 'height 0.12s linear',
            background: '#ffffff',
            boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
            borderRadius: '0 0 6px 6px',
            overflowY: 'auto',
            padding: '14px 16px 20px',
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: 11,
            lineHeight: 1.35,
            color: '#0f172a',
            marginTop: -4,
            zIndex: 5,
            position: 'relative',
            borderLeft: '1px solid #e2e8f0',
            borderRight: '1px solid #e2e8f0',
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

          {/* Receipt Header */}
          <div style={{ textAlign: 'center', borderBottom: '1px dashed #94a3b8', paddingBottom: 6, marginBottom: 6 }}>
            <div style={{ fontWeight: 800, fontSize: 13, textTransform: 'uppercase' }}>
              {shop?.name || 'Retail Supermarket'}
            </div>
            <div style={{ fontSize: 10, color: '#64748b' }}>{shop?.address}</div>
            <div style={{ fontSize: 10, color: '#64748b' }}>Ph: {shop?.phone}</div>
            {shop?.gstin && <div style={{ fontSize: 9, color: '#64748b' }}>GSTIN: {shop.gstin}</div>}
          </div>

          {/* Receipt Meta */}
          <div style={{ fontSize: 10, borderBottom: '1px dashed #94a3b8', paddingBottom: 4, marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Bill: <strong>{invoice.invoiceNumber || 'INV-TEMP'}</strong></span>
              <span>{new Date(invoice.createdAt || Date.now()).toLocaleDateString('en-IN')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Cust: {invoice.customerName || 'Walk-in'}</span>
              <span>{paymentLabel(invoice.paymentMethod || 'cash').toUpperCase()}</span>
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
                fontSize: 10,
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
                  fontSize: 10,
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
              fontSize: 10,
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
                paddingTop: 2,
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

          <div style={{ textAlign: 'center', fontSize: 9, color: '#64748b' }}>
            *** Thank You! Visit Again ***
          </div>
        </div>
      </div>

      {/* Full-Width Sticky Bottom Action Dock */}
      <footer className="printer-fullscreen-footer">
        <div style={{ maxWidth: 860, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Main Action Buttons Grid (Horizontal on Desktop, 2x2 on Mobile) */}
          <div className="printer-buttons-grid">
            <button
              type="button"
              className="btn"
              onClick={handlePrintSystemDialog}
              style={{
                minHeight: 48,
                fontSize: '0.92rem',
                fontWeight: 700,
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 10,
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                cursor: 'pointer',
              }}
            >
              <Printer size={18} /> Print Receipt Now
            </button>

            <button
              type="button"
              className="btn"
              onClick={downloadPdf}
              style={{
                minHeight: 48,
                fontSize: '0.92rem',
                fontWeight: 600,
                justifyContent: 'center',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#f8fafc',
                borderRadius: 10,
                cursor: 'pointer',
              }}
            >
              <Download size={18} /> Download PDF
            </button>

            <a
              href={getWhatsAppShareUrl()}
              target="_blank"
              rel="noreferrer"
              className="btn"
              style={{
                minHeight: 48,
                fontSize: '0.92rem',
                fontWeight: 700,
                justifyContent: 'center',
                color: '#ffffff',
                background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                border: 'none',
                borderRadius: 10,
                boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Share2 size={18} /> WhatsApp Bill
            </a>

            <button
              type="button"
              className="btn"
              onClick={onStartNewBill || onClose}
              style={{
                minHeight: 48,
                fontSize: '0.94rem',
                fontWeight: 800,
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 10,
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.45)',
                cursor: 'pointer',
              }}
            >
              <Plus size={19} /> Start New Bill
            </button>
          </div>

          {/* Bottom Secondary Links */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 2 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '0.84rem',
                cursor: 'pointer',
                padding: '4px 10px',
                textDecoration: 'underline',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.target.style.color = '#fff')}
              onMouseLeave={(e) => (e.target.style.color = '#94a3b8')}
            >
              Done & Return to Billing Counter
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
