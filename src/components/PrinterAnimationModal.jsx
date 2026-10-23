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
  Volume2,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import { playPaytmSuccessChime, playPrinterFeedSound } from '../utils/audioUtils';
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
  const [statusMsg, setStatusMsg] = useState('Paytm Soundbox: Payment Successful');
  const [popperTrigger, setPopperTrigger] = useState(0);
  const barcodeRef = useRef(null);

  // Restart print simulation & Paytm chime whenever modal opens
  useEffect(() => {
    if (!open || !invoice) {
      setStage('idle');
      setProgress(0);
      return;
    }

    setStage('printing');
    setProgress(0);
    setStatusMsg('Paytm Smart POS: Printing Receipt...');
    setPopperTrigger((k) => k + 1); // Celebration poppers burst on payment confirmation
    playPaytmSuccessChime(); // Paytm soundbox chime
    playPrinterFeedSound();

    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 4;
      setProgress((prev) => {
        const next = Math.min(100, prev + 4);
        if (next < 30) {
          setStatusMsg('Paytm Smart POS: Connecting to thermal head...');
        } else if (next < 70) {
          setStatusMsg(`Printing Tax Bill #${invoice.invoiceNumber}...`);
        } else if (next < 95) {
          setStatusMsg('Thermal Paper Cut Complete ✓');
        } else {
          setStatusMsg('Print Complete! Ready for Customer ✓');
          setStage('done');
          setPopperTrigger((k) => k + 1); // Celebration burst when paper finishes
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
      aria-label="Paytm Machine Receipt Printing View"
    >
      {/* Background Celebration Poppers & Confetti Animation on Transparent Screen */}
      <CelebrationPoppers triggerKey={popperTrigger} />

      {/* Top Header Bar (Paytm Iconic Navy & Cyan Theme) */}
      <header className="printer-fullscreen-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #00b9f5 0%, #002970 100%)',
              border: '1px solid rgba(0, 185, 245, 0.4)',
              display: 'grid',
              placeItems: 'center',
              color: '#ffffff',
              boxShadow: '0 0 16px rgba(0, 185, 245, 0.35)',
            }}
          >
            <Zap size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.05rem', color: '#fff', fontWeight: 800, letterSpacing: '-0.01em' }}>
                Paytm Smart POS
              </h2>
              <span
                style={{
                  background: 'rgba(0, 185, 245, 0.2)',
                  color: '#00b9f5',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 6,
                  letterSpacing: '0.05em',
                  border: '1px solid rgba(0, 185, 245, 0.4)',
                }}
              >
                EDC 80MM PRINTER
              </span>
              <span
                style={{
                  background: 'rgba(0, 186, 124, 0.2)',
                  color: '#00ba7c',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 6,
                  border: '1px solid rgba(0, 186, 124, 0.4)',
                }}
              >
                PAYMENT SUCCESSFUL ✓
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: 2 }}>
              Invoice #{invoice.invoiceNumber} · {shop?.name || 'Store'} · {formatDateTime(invoice.createdAt)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={() => setPopperTrigger((k) => k + 1)}
            style={{
              background: 'rgba(245, 158, 11, 0.2)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
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
            title="Burst Celebration Poppers"
          >
            <PartyPopper size={16} /> Pop Confetti 🎉
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
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

      {/* Middle Interactive Paytm Machine Viewport (Transparent Background) */}
      <div className="printer-fullscreen-viewport">
        {/* The Physical Paytm Smart POS EDC Terminal Device */}
        <div
          style={{
            width: 'min(420px, 94vw)',
            background: 'linear-gradient(180deg, #071739 0%, #001f54 60%, #001233 100%)',
            borderRadius: 24,
            border: '2px solid rgba(0, 185, 245, 0.45)',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.55), 0 0 35px rgba(0, 185, 245, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            zIndex: 10,
            overflow: 'hidden',
          }}
        >
          {/* Top Thermal Receipt Slot & Status Bar of Device */}
          <div
            style={{
              background: '#040d21',
              padding: '10px 16px 8px',
              borderBottom: '1px solid #1a2f5a',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {/* Status indicators */}
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
                    background: stage === 'printing' ? '#00b9f5' : '#64748b',
                    boxShadow: stage === 'printing' ? '0 0 10px #00b9f5' : 'none',
                    animation: stage === 'printing' ? 'pulse 0.6s infinite alternate' : 'none',
                    display: 'inline-block',
                  }}
                  title="Printer Feed"
                />
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.06em' }}>
                  ONLINE 4G
                </span>
              </div>

              <div
                style={{
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  color: '#00b9f5',
                  background: 'rgba(0, 185, 245, 0.12)',
                  padding: '2px 8px',
                  borderRadius: 4,
                  letterSpacing: '0.08em',
                  border: '1px solid rgba(0, 185, 245, 0.3)',
                }}
              >
                PAYTM THERMAL POS 80MM
              </div>
            </div>

            {/* Paper Output Slot Mouth */}
            <div
              style={{
                width: '100%',
                height: 12,
                background: '#010511',
                borderRadius: 4,
                boxShadow: 'inset 0 3px 6px rgba(0,0,0,0.95)',
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid #002970',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, rgba(0,0,0,0.9) 0%, transparent 100%)',
                }}
              />
            </div>
          </div>

          {/* Animated Thermal Receipt Paper Rolling Out from Top Slot */}
          <div
            style={{
              padding: '6px 14px 10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: '#040d21',
              borderBottom: '2px solid #002970',
            }}
          >
            <div
              style={{
                width: 'min(340px, 92%)',
                maxHeight: 'min(240px, 32vh)',
                height: `${Math.max(45, (progress / 100) * 230)}px`,
                transition: 'height 0.12s linear',
                background: '#ffffff',
                boxShadow: '0 12px 30px rgba(0,0,0,0.4)',
                borderRadius: '0 0 6px 6px',
                overflowY: 'auto',
                padding: '12px 14px 18px',
                fontFamily: '"Courier New", Courier, monospace',
                fontSize: 11,
                lineHeight: 1.32,
                color: '#0f172a',
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
                  background: 'radial-gradient(circle, transparent, transparent 50%, #e2e8f0 50%, #e2e8f0 100%)',
                  backgroundSize: '8px 8px',
                }}
              />

              {/* Receipt Header */}
              <div style={{ textAlign: 'center', borderBottom: '1px dashed #94a3b8', paddingBottom: 5, marginBottom: 5 }}>
                <div style={{ fontWeight: 800, fontSize: 13, textTransform: 'uppercase', color: '#002970' }}>
                  {shop?.name || 'Retail Supermarket'}
                </div>
                <div style={{ fontSize: 9.5, color: '#64748b' }}>{shop?.address}</div>
                <div style={{ fontSize: 9.5, color: '#64748b' }}>Ph: {shop?.phone}</div>
                {shop?.gstin && <div style={{ fontSize: 9, color: '#64748b' }}>GSTIN: {shop.gstin}</div>}
              </div>

              {/* Receipt Meta */}
              <div style={{ fontSize: 9.5, borderBottom: '1px dashed #94a3b8', paddingBottom: 4, marginBottom: 5 }}>
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
              <div style={{ marginBottom: 5 }}>
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
                  marginBottom: 5,
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
                    fontSize: 11.5,
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

              <div style={{ textAlign: 'center', fontSize: 8.5, color: '#64748b' }}>
                *** Powered by Fast POS · Thank You! ***
              </div>
            </div>
          </div>

          {/* Device Touchscreen Display (Paytm Soundbox + Success UI) */}
          <div
            style={{
              padding: '16px 18px',
              background: 'linear-gradient(180deg, #001f54 0%, #001233 100%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              position: 'relative',
            }}
          >
            {/* Device Android Status Bar */}
            <div
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                color: '#94a3b8',
                fontSize: '0.68rem',
                fontWeight: 600,
                marginBottom: 12,
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                paddingBottom: 6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Wifi size={12} color="#00b9f5" />
                <span>Paytm 4G LTE</span>
              </div>
              <div>
                <span>{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            {/* Glowing Paytm Success Circle */}
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #00ba7c 0%, #00875a 100%)',
                boxShadow: '0 0 25px rgba(0, 186, 124, 0.55)',
                display: 'grid',
                placeItems: 'center',
                color: '#ffffff',
                marginBottom: 10,
              }}
            >
              <CheckCircle2 size={38} color="#ffffff" strokeWidth={2.5} />
            </div>

            <span
              style={{
                fontSize: '0.82rem',
                fontWeight: 800,
                color: '#00ba7c',
                letterSpacing: '0.08em',
                marginBottom: 2,
              }}
            >
              PAYMENT RECEIVED
            </span>

            {/* Giant Paytm Amount */}
            <h1
              style={{
                margin: '2px 0 8px',
                fontSize: '2.1rem',
                fontWeight: 900,
                color: '#ffffff',
                letterSpacing: '-0.02em',
                textShadow: '0 2px 10px rgba(0,0,0,0.5)',
              }}
            >
              {formatINR(invoice.grandTotalPaise)}
            </h1>

            {/* Paytm Soundbox Voice Badge */}
            <div
              style={{
                background: 'rgba(0, 185, 245, 0.14)',
                border: '1px solid rgba(0, 185, 245, 0.35)',
                borderRadius: 20,
                padding: '4px 14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                color: '#00b9f5',
                fontSize: '0.74rem',
                fontWeight: 700,
                marginBottom: 10,
              }}
            >
              <Volume2 size={14} />
              <span>Paytm Soundbox: "{formatINR(invoice.grandTotalPaise)} Received"</span>
            </div>

            {/* Transaction Metadata Footer on Screen */}
            <div
              style={{
                fontSize: '0.72rem',
                color: '#94a3b8',
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              <span>Txn: #{invoice.invoiceNumber}</span>
              <span>·</span>
              <span>{paymentLabel(invoice.paymentMethod).toUpperCase()}</span>
              <span>·</span>
              <span style={{ color: '#00ba7c', fontWeight: 700 }}>APPROVED ✓</span>
            </div>
          </div>
        </div>
      </div>

      {/* Full-Width Sticky Bottom Action Dock (Paytm POS Style) */}
      <footer className="printer-fullscreen-footer">
        <div style={{ maxWidth: 880, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
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
                background: 'linear-gradient(135deg, #00b9f5 0%, #002970 100%)',
                color: '#ffffff',
                border: '1px solid rgba(0, 185, 245, 0.5)',
                borderRadius: 12,
                boxShadow: '0 4px 16px rgba(0, 185, 245, 0.35)',
                cursor: 'pointer',
              }}
            >
              <Printer size={18} /> Print Customer Receipt
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
                border: '1px solid rgba(0, 185, 245, 0.35)',
                color: '#f8fafc',
                borderRadius: 12,
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
                background: 'linear-gradient(135deg, #25d366 0%, #128c7e 100%)',
                border: 'none',
                borderRadius: 12,
                boxShadow: '0 4px 14px rgba(37, 211, 102, 0.3)',
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
                background: 'linear-gradient(135deg, #00ba7c 0%, #00875a 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 12,
                boxShadow: '0 4px 16px rgba(0, 186, 124, 0.45)',
                cursor: 'pointer',
              }}
            >
              <Plus size={19} /> Next Customer / New Bill
            </button>
          </div>

          {/* Dismiss return link */}
          <div style={{ textAlign: 'center', marginTop: 2 }}>
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
