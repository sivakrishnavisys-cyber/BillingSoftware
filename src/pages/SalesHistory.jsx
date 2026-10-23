import { useMemo, useState } from 'react';
import { Calendar, Download, Eye, FileText, Filter, IndianRupee, Printer, Receipt as ReceiptIcon, Search } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import PrintStage from '../components/PrintStage';
import PrinterAnimationModal from '../components/PrinterAnimationModal';
import Receipt from '../components/Receipt';
import StatCard from '../components/StatCard';
import { useStore } from '../context/StoreContext';
import { formatINR } from '../utils/currencyUtils';
import { downloadTextFile, toCsv } from '../utils/csvUtils';
import { addDays, endOfDay, formatDateTime, isSameDay, startOfDay } from '../utils/dateUtils';
import { exportInvoicePdf } from '../utils/pdfReceiptUtils';
import { paymentLabel } from '../utils/receiptUtils';

export default function SalesHistory() {
  const { invoices, shop, settings, showToast } = useStore();
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [method, setMethod] = useState('all');
  const [printInvoice, setPrintInvoice] = useState(null);
  const [printerAnimationOpen, setPrinterAnimationOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [previewLayout, setPreviewLayout] = useState(settings.receiptLayout || '80mm');

  const today = new Date();

  const applyPreset = (preset) => {
    if (preset === 'today') {
      const d = today.toISOString().slice(0, 10);
      setFrom(d);
      setTo(d);
    } else if (preset === 'yesterday') {
      const y = addDays(today, -1).toISOString().slice(0, 10);
      setFrom(y);
      setTo(y);
    } else if (preset === 'week') {
      setFrom(addDays(today, -6).toISOString().slice(0, 10));
      setTo(today.toISOString().slice(0, 10));
    } else if (preset === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
      setFrom(firstDay);
      setTo(today.toISOString().slice(0, 10));
    } else if (preset === 'all') {
      setFrom('');
      setTo('');
    }
  };

  const filtered = useMemo(() => invoices.filter((inv) => {
    if (q) {
      const term = q.toLowerCase();
      const matchInv = inv.invoiceNumber.toLowerCase().includes(term);
      const matchCust = (inv.customerName || '').toLowerCase().includes(term);
      const matchPhone = (inv.customerPhone || '').includes(term);
      if (!matchInv && !matchCust && !matchPhone) return false;
    }
    if (method !== 'all' && inv.paymentMethod !== method) return false;
    const t = new Date(inv.createdAt).getTime();
    if (from && t < startOfDay(from).getTime()) return false;
    if (to && t > endOfDay(to).getTime()) return false;
    return true;
  }), [invoices, q, from, to, method]);

  const filteredRevenue = filtered.reduce((sum, inv) => sum + inv.grandTotalPaise, 0);
  const avgBill = filtered.length ? Math.round(filteredRevenue / filtered.length) : 0;
  const todayTotal = invoices.filter((inv) => isSameDay(inv.createdAt, today)).reduce((s, i) => s + i.grandTotalPaise, 0);
  const todayBills = invoices.filter((inv) => isSameDay(inv.createdAt, today)).length;

  const exportCsv = () => {
    const csv = toCsv(filtered, [
      { label: 'Invoice No', value: (i) => i.invoiceNumber },
      { label: 'Date & Time', value: (i) => formatDateTime(i.createdAt) },
      { label: 'Customer Name', value: (i) => i.customerName || 'Walk-in' },
      { label: 'Customer Phone', value: (i) => i.customerPhone || '—' },
      { label: 'Item Lines', value: (i) => i.items.length },
      { label: 'Units Sold', value: (i) => i.items.reduce((s, it) => s + it.qty, 0) },
      { label: 'Subtotal (INR)', value: (i) => (i.subtotalPaise / 100).toFixed(2) },
      { label: 'Discount (INR)', value: (i) => (i.discountPaise / 100).toFixed(2) },
      { label: 'Tax (INR)', value: (i) => (i.taxPaise / 100).toFixed(2) },
      { label: 'Grand Total (INR)', value: (i) => (i.grandTotalPaise / 100).toFixed(2) },
      { label: 'Payment Method', value: (i) => i.paymentMethod },
      { label: 'Status', value: (i) => i.status },
    ]);
    downloadTextFile(`sales-history-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    showToast('Sales records exported to CSV.', 'success');
  };

  const handleDownloadPdf = (inv) => {
    exportInvoicePdf(inv, shop, previewLayout);
    showToast(`PDF invoice ${inv.invoiceNumber} downloaded.`, 'success');
  };

  return (
    <div className="sales-page">
      <div className="page-head">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ margin: 0 }}>Sales History & Invoices</h1>
            <span className="demo-pill">COMPLETED BILLS</span>
          </div>
          <p className="muted">
            All customer invoices recorded in this browser. Search, view details, reprint receipts, or export to CSV.
          </p>
        </div>
        <div className="row-actions">
          <button type="button" className="btn btn-ghost" onClick={exportCsv} disabled={!filtered.length}>
            <Download size={16} /> Export CSV ({filtered.length})
          </button>
        </div>
      </div>

      <section className="stat-grid" style={{ marginBottom: 16 }}>
        <StatCard
          icon={IndianRupee}
          label="Filtered Revenue"
          value={formatINR(filteredRevenue)}
          hint={`${filtered.length} bills in selection`}
          tone="blue"
        />
        <StatCard
          icon={ReceiptIcon}
          label="Today's Sales"
          value={formatINR(todayTotal)}
          hint={`${todayBills} bills today`}
          tone="green"
        />
        <StatCard
          icon={Calendar}
          label="Average Bill Value"
          value={formatINR(avgBill)}
          hint="Within filtered range"
        />
      </section>

      <div className="card filter-bar-container" style={{ marginBottom: 16 }}>
        <div className="filter-presets-row" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          <span className="small muted" style={{ alignSelf: 'center', marginRight: 4 }}>Date Presets:</span>
          <button type="button" className="chip" onClick={() => applyPreset('today')}>Today</button>
          <button type="button" className="chip" onClick={() => applyPreset('yesterday')}>Yesterday</button>
          <button type="button" className="chip" onClick={() => applyPreset('week')}>Last 7 Days</button>
          <button type="button" className="chip" onClick={() => applyPreset('month')}>This Month</button>
          <button type="button" className="chip" onClick={() => applyPreset('all')}>All Time</button>
        </div>

        <div className="filter-bar" style={{ margin: 0 }}>
          <div className="input-with-icon" style={{ flex: 2, minWidth: '220px' }}>
            <Search size={16} className="muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search Invoice #, Customer, or Phone"
            />
          </div>

          <label className="field" style={{ flex: 1, minWidth: '130px' }}>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              title="Start date"
            />
          </label>

          <label className="field" style={{ flex: 1, minWidth: '130px' }}>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              title="End date"
            />
          </label>

          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            style={{ flex: 1, minWidth: '130px' }}
          >
            <option value="all">All Payments</option>
            <option value="cash">Cash Only</option>
            <option value="upi">UPI Only</option>
            <option value="card">Card Only</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No transactions match your search"
          message="Try selecting 'All Time' or clearing the search terms."
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="table-wrap card desktop-table-view">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Date & Time</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Discount</th>
                  <th>GST</th>
                  <th>Grand Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <strong>{inv.invoiceNumber}</strong>
                    </td>
                    <td>
                      {formatDateTime(inv.createdAt)}
                    </td>
                    <td>
                      {inv.customerName || <span className="muted">Walk-in</span>}
                      {inv.customerPhone ? <div className="muted tiny">{inv.customerPhone}</div> : null}
                    </td>
                    <td>
                      {inv.items.reduce((s, it) => s + it.qty, 0)} units
                      <div className="muted tiny">{inv.items.length} lines</div>
                    </td>
                    <td>{inv.discountPaise > 0 ? `-${formatINR(inv.discountPaise)}` : '—'}</td>
                    <td>{formatINR(inv.taxPaise)}</td>
                    <td>
                      <strong>{formatINR(inv.grandTotalPaise)}</strong>
                    </td>
                    <td>
                      <span className="badge badge-in">{paymentLabel(inv.paymentMethod)}</span>
                    </td>
                    <td>
                      <span className="badge badge-in">{inv.status}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => { setDetail(inv); setPreviewLayout('80mm'); }}
                          title="View Receipt"
                        >
                          <Eye size={14} /> View
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => {
                            setPrintInvoice(inv);
                            setPrinterAnimationOpen(true);
                          }}
                          title="Reprint Receipt with Animated Printer"
                        >
                          <Printer size={14} /> Reprint
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Touch-Friendly Sales History Cards */}
          <div className="mobile-cards-view">
            {filtered.map((inv) => (
              <div key={inv.id} className="mobile-entity-card card">
                <div className="card-top-row">
                  <div>
                    <strong className="entity-title">{inv.invoiceNumber}</strong>
                    <div className="muted tiny">{formatDateTime(inv.createdAt)}</div>
                  </div>
                  <span className="badge badge-in">{paymentLabel(inv.paymentMethod)}</span>
                </div>

                <div className="card-detail-grid">
                  <div>
                    <span className="tiny muted">Grand Total</span>
                    <div className="card-highlight-val">{formatINR(inv.grandTotalPaise)}</div>
                    <span className="tiny muted">
                      {inv.items.reduce((s, it) => s + it.qty, 0)} units · {inv.items.length} lines
                    </span>
                  </div>
                  <div>
                    <span className="tiny muted">Billed To</span>
                    <div className="card-stock-val">{inv.customerName || 'Walk-in Customer'}</div>
                    {inv.customerPhone ? (
                      <span className="tiny muted">{inv.customerPhone}</span>
                    ) : null}
                  </div>
                </div>

                <div className="card-footer-row" style={{ justifyContent: 'flex-end', gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => { setDetail(inv); setPreviewLayout('80mm'); }}
                  >
                    <Eye size={14} /> View
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setPrintInvoice(inv);
                      setPrinterAnimationOpen(true);
                    }}
                  >
                    <Printer size={14} /> Reprint
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => handleDownloadPdf(inv)}
                  >
                    <Download size={14} /> PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Invoice Detail Modal */}
      {detail ? (
        <div className="modal-backdrop" onClick={() => setDetail(null)}>
          <div className="modal-card wide" onClick={(e) => e.stopPropagation()}>
            <div className="page-head" style={{ marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0 }}>Invoice Details — {detail.invoiceNumber}</h3>
                <p className="muted small">Reprinting is an audit action and never deducts inventory stock again.</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className={`btn btn-ghost ${previewLayout === '80mm' ? 'btn-primary' : ''}`}
                  onClick={() => setPreviewLayout('80mm')}
                >
                  80mm Thermal
                </button>
                <button
                  type="button"
                  className={`btn btn-ghost ${previewLayout === 'a4' ? 'btn-primary' : ''}`}
                  onClick={() => setPreviewLayout('a4')}
                >
                  <FileText size={14} /> A4 Tax Invoice
                </button>
              </div>
            </div>

            <Receipt invoice={detail} shop={shop} layout={previewLayout} />

            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setDetail(null)}>
                Close
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => handleDownloadPdf(detail)}
              >
                <Download size={16} /> Download PDF
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setPrintInvoice(detail);
                  setDetail(null);
                }}
              >
                <Printer size={16} /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Animated Thermal Receipt Printer Modal */}
      <PrinterAnimationModal
        open={printerAnimationOpen}
        invoice={printInvoice}
        shop={shop}
        onClose={() => setPrinterAnimationOpen(false)}
        onStartNewBill={() => {
          setPrinterAnimationOpen(false);
          setPrintInvoice(null);
        }}
        onOpenStandardPrint={() => {
          setPrinterAnimationOpen(false);
          window.print();
        }}
      />

      {/* Print Stage */}
      <PrintStage
        open={Boolean(printInvoice) && !printerAnimationOpen}
        title={`Reprint ${printInvoice?.invoiceNumber || ''}`}
        extraClass={`receipt-print layout-${previewLayout}`}
        onClose={() => setPrintInvoice(null)}
      >
        <div className="no-print receipt-toolbar-row" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="small muted">Format:</span>
            <button
              type="button"
              className={`btn btn-ghost ${previewLayout === '80mm' ? 'btn-primary' : ''}`}
              onClick={() => setPreviewLayout('80mm')}
            >
              80mm Thermal
            </button>
            <button
              type="button"
              className={`btn btn-ghost ${previewLayout === 'a4' ? 'btn-primary' : ''}`}
              onClick={() => setPreviewLayout('a4')}
            >
              A4 Tax Invoice
            </button>
          </div>
          <div className="row-actions">
            <button type="button" className="btn btn-ghost" onClick={() => handleDownloadPdf(printInvoice)}>
              <Download size={16} /> Download PDF
            </button>
            <button type="button" className="btn btn-primary" onClick={() => window.print()}>
              <Printer size={16} /> Print
            </button>
          </div>
        </div>
        <Receipt invoice={printInvoice} shop={shop} layout={previewLayout} />
      </PrintStage>
    </div>
  );
}
