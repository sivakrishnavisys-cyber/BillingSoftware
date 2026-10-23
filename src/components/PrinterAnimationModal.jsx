import { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import {
  CheckCircle2,
  Download,
  FileText,
  Printer,
  RotateCcw,
  Share2,
  Sparkles,
  X,
} from 'lucide-react';
import { playPrinterFeedSound } from '../utils/audioUtils';
import { formatINR } from '../utils/currencyUtils';
import { formatDateTime } from '../utils/dateUtils';
import { exportInvoicePdf } from '../utils/pdfReceiptUtils';
import { paymentLabel } from '../utils/receiptUtils';

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

  if (!open || !invoice) return null;

  const downloadPdf = () => {
    exportInvoicePdf(invoice, shop, '80mm');
  };

  const getWhatsAppShareUrl = () => {
    if (!invoice) return '';
    const cleanPhone = (invoice.customerPhone || '').replace(/\D/g, '');
    const text = encodeURIComponent(
      `Hello ${invoice.customerName || 'Customer'},\nThank you for shopping at *${shop.name}*!\n\n` +
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
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 110, padding: 12 }}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 480,
          width: '100%',
          padding: 0,
          overflow: 'hidden',
          borderRadius: 16,
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.35)',
        }}
      >
        {/* Top Header Bar */}
        <div
          style={{
            background: '#0f172a',
            color: '#fff',
            padding: '14px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(56, 189, 248, 0.2)',
                display: 'grid',
                placeItems: 'center',
                color: '#38bdf8',
              }}
            >
              <Printer size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>Thermal Bill Printing</h3>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                Invoice #{invoice.invoiceNumber}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            style={{ color: '#94a3b8' }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Status & Progress Bar */}
        <div style={{ background: '#1e293b', padding: '8px 18px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: stage === 'done' ? '#4ade80' : '#38bdf8' }}>
              {statusMsg}
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>
              {progress}%
            </span>
          </div>

          <div
            style={{
              height: 6,
              background: '#334155',
              borderRadius: 999,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                background: stage === 'done' ? 'linear-gradient(90deg, #22c55e, #4ade80)' : 'linear-gradient(90deg, #0284c7, #38bdf8)',
                transition: 'width 0.1s ease',
                borderRadius: 999,
              }}
            />
          </div>
        </div>

        {/* Interactive Printer Animation Viewport */}
        <div
          style={{
            background: '#f1f5f9',
            padding: '20px 14px 10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            minHeight: 330,
            overflow: 'hidden',
          }}
        >
          {/* Physical Printer Top Body */}
          <div
            style={{
              width: 'min(340px, 92%)',
              height: 68,
              background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
              borderRadius: '14px 14px 6px 6px',
              boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
              position: 'relative',
              zIndex: 10,
              padding: '10px 14px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              border: '1px solid #334155',
            }}
          >
            {/* Printer LEDs & Branding */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#22c55e',
                    boxShadow: '0 0 8px #22c55e',
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
                    boxShadow: stage === 'printing' ? '0 0 8px #38bdf8' : 'none',
                    animation: stage === 'printing' ? 'pulse 0.6s infinite alternate' : 'none',
                    display: 'inline-block',
                  }}
                  title="Paper Feed"
                />
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em' }}>
                  ONLINE
                </span>
              </div>

              <div
                style={{
                  fontSize: '0.62rem',
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
                height: 12,
                background: '#020617',
                borderRadius: 4,
                boxShadow: 'inset 0 3px 6px rgba(0,0,0,0.8)',
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid #1e293b',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%)',
                }}
              />
            </div>
          </div>

          {/* Animated Receipt Paper Rolling Out */}
          <div
            style={{
              width: 'min(300px, 84%)',
              maxHeight: 250,
              height: `${Math.max(40, (progress / 100) * 240)}px`,
              transition: 'height 0.12s linear',
              background: '#ffffff',
              boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
              borderRadius: '0 0 4px 4px',
              overflowY: 'auto',
              padding: '12px 14px 18px',
              fontFamily: '"Courier New", Courier, monospace',
              fontSize: 11,
              lineHeight: 1.3,
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

        {/* Action Button Strip */}
        <div
          style={{
            background: '#ffffff',
            padding: '12px 16px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {/* Main Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handlePrintSystemDialog}
              style={{ padding: '9px 12px', fontSize: '0.84rem' }}
            >
              <Printer size={16} /> Print Receipt Now
            </button>

            <button
              type="button"
              className="btn btn-ghost"
              onClick={downloadPdf}
              style={{ padding: '9px 12px', fontSize: '0.84rem' }}
            >
              <Download size={16} /> Download PDF
            </button>
          </div>

          {/* Secondary Utilities Strip */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            <a
              href={getWhatsAppShareUrl()}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost btn-sm"
              style={{ color: '#16a34a', borderColor: '#bbf7d0', background: '#f0fdf4' }}
            >
              <Share2 size={13} /> Send on WhatsApp
            </a>

            <button
              type="button"
              className="btn btn-success btn-sm"
              onClick={onStartNewBill || onClose}
              style={{ fontWeight: 700 }}
            >
              <Plus size={14} /> Start New Bill
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
