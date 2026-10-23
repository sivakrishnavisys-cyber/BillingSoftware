import { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  IndianRupee,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  Printer,
  Search,
  UserCheck,
  Users,
} from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import PrintStage from '../components/PrintStage';
import StatCard from '../components/StatCard';
import { useStore } from '../context/StoreContext';
import {
  getCustomerLedger,
  getKhataSummary,
  getKhataWhatsAppUrl,
  recordKhataPayment,
  saveCustomer,
  searchCustomers,
} from '../services/khataService';
import { formatINR, paiseToRupees } from '../utils/currencyUtils';
import { downloadTextFile, toCsv } from '../utils/csvUtils';
import { formatDateTime } from '../utils/dateUtils';
import { playSuccessChime } from '../utils/audioUtils';

export default function Khata() {
  const { customers, khataTransactions, shop, update, showToast } = useStore();
  const [query, setQuery] = useState('');
  const [filterMode, setFilterMode] = useState('due'); // 'due', 'all', 'settled'

  // Modal states
  const [payModalCustomer, setPayModalCustomer] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [payNotes, setPayNotes] = useState('');

  const [statementCustomer, setStatementCustomer] = useState(null);
  const [statementPrintOpen, setStatementPrintOpen] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCreditLimit, setFormCreditLimit] = useState('5000');
  const [formInitialDue, setFormInitialDue] = useState('0');

  const summary = useMemo(() => getKhataSummary(customers, khataTransactions), [customers, khataTransactions]);

  const filteredCustomers = useMemo(() => {
    let list = searchCustomers(customers, query);
    if (filterMode === 'due') {
      list = list.filter((c) => (c.balancePaise || 0) > 0);
    } else if (filterMode === 'settled') {
      list = list.filter((c) => (c.balancePaise || 0) === 0);
    }
    // Sort highest due first
    return [...list].sort((a, b) => (b.balancePaise || 0) - (a.balancePaise || 0));
  }, [customers, query, filterMode]);

  const openAddCustomer = () => {
    setEditingCustomer(null);
    setFormName('');
    setFormPhone('');
    setFormAddress('');
    setFormCreditLimit('5000');
    setFormInitialDue('0');
    setFormOpen(true);
  };

  const openEditCustomer = (c) => {
    setEditingCustomer(c);
    setFormName(c.name);
    setFormPhone(c.phone || '');
    setFormAddress(c.address || '');
    setFormCreditLimit(paiseToRupees(c.creditLimitPaise));
    setFormInitialDue(paiseToRupees(c.balancePaise));
    setFormOpen(true);
  };

  const handleSaveCustomer = () => {
    try {
      update((prev) => saveCustomer(prev, {
        name: formName,
        phone: formPhone,
        address: formAddress,
        creditLimit: formCreditLimit,
        balance: formInitialDue,
      }, editingCustomer?.id || null));

      showToast(editingCustomer ? 'Customer account updated.' : 'New Khata customer created.', 'success');
      setFormOpen(false);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleRecordPayment = () => {
    try {
      const amountPaise = Math.round(Number(payAmount) * 100);
      if (!amountPaise || amountPaise <= 0) {
        showToast('Please enter a valid payment amount.', 'error');
        return;
      }
      update((prev) => recordKhataPayment(prev, {
        customerId: payModalCustomer.id,
        amountPaise,
        paymentMethod: payMethod,
        notes: payNotes,
      }));
      playSuccessChime();
      showToast(`Payment of ₹${payAmount} received from ${payModalCustomer.name}.`, 'success');
      setPayModalCustomer(null);
      setPayAmount('');
      setPayNotes('');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const exportKhataCsv = () => {
    const csv = toCsv(customers, [
      { label: 'Customer ID', value: (c) => c.id },
      { label: 'Customer Name', value: (c) => c.name },
      { label: 'Mobile Phone', value: (c) => c.phone || '—' },
      { label: 'Address', value: (c) => c.address || '—' },
      { label: 'Current Due (INR)', value: (c) => ((c.balancePaise || 0) / 100).toFixed(2) },
      { label: 'Credit Limit (INR)', value: (c) => ((c.creditLimitPaise || 0) / 100).toFixed(2) },
      { label: 'Status', value: (c) => (c.balancePaise > 0 ? 'Pending Udhar' : 'Settled') },
    ]);
    downloadTextFile(`khata-ledger-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    showToast('Customer Khata exported to CSV.', 'success');
  };

  const customerLedgerList = useMemo(() => {
    if (!statementCustomer) return [];
    return getCustomerLedger(khataTransactions, statementCustomer.id);
  }, [statementCustomer, khataTransactions]);

  return (
    <div className="khata-page">
      <div className="page-head">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ margin: 0 }}>Customer Khata & Udhar Ledger</h1>
            <span className="demo-pill">खाता बही</span>
          </div>
          <p className="muted">
            Manage customer credit, record Udhar bills, collect repayments (Jama), and track store credit accounts.
          </p>
        </div>

        <div className="row-actions">
          <button type="button" className="btn btn-ghost" onClick={exportKhataCsv}>
            <Download size={15} /> Export Khata CSV
          </button>
          <button type="button" className="btn btn-primary" onClick={openAddCustomer}>
            <Plus size={16} /> New Customer Account
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <section className="stat-grid" style={{ marginBottom: 14 }}>
        <StatCard
          icon={IndianRupee}
          label="Total Market Udhar (Due)"
          value={formatINR(summary.totalMarketDuePaise)}
          hint={`${summary.customersWithDueCount} customers have outstanding balance`}
          tone={summary.totalMarketDuePaise > 0 ? 'red' : 'green'}
        />
        <StatCard
          icon={Users}
          label="Total Khata Customers"
          value={summary.totalCustomersCount}
          hint="Registered local customers"
          tone="blue"
        />
        <StatCard
          icon={ArrowDownLeft}
          label="Today's Jama (Collected)"
          value={formatINR(summary.todayCollectedPaise)}
          hint="Repayments received today"
          tone="green"
        />
        <StatCard
          icon={UserCheck}
          label="Settled (Zero Due)"
          value={summary.totalCustomersCount - summary.customersWithDueCount}
          hint="Customers with ₹0 balance"
        />
      </section>

      {/* Search & Filter Bar */}
      <div className="card filter-bar" style={{ marginBottom: 14 }}>
        <div className="input-with-icon" style={{ flex: 2, minWidth: '220px' }}>
          <Search size={16} className="muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by customer name, mobile number, or address..."
          />
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`chip ${filterMode === 'due' ? 'active' : ''}`}
            onClick={() => setFilterMode('due')}
            style={filterMode === 'due' ? { background: 'var(--red-light)', borderColor: 'var(--red-border)', color: 'var(--red)' } : {}}
          >
            Pending Due ({summary.customersWithDueCount})
          </button>
          <button
            type="button"
            className={`chip ${filterMode === 'all' ? 'active' : ''}`}
            onClick={() => setFilterMode('all')}
            style={filterMode === 'all' ? { background: 'var(--blue-light)', borderColor: 'var(--blue-border)', color: 'var(--blue)' } : {}}
          >
            All Accounts ({customers.length})
          </button>
          <button
            type="button"
            className={`chip ${filterMode === 'settled' ? 'active' : ''}`}
            onClick={() => setFilterMode('settled')}
            style={filterMode === 'settled' ? { background: 'var(--green-light)', borderColor: 'var(--green-border)', color: 'var(--green)' } : {}}
          >
            Settled (₹0 Due)
          </button>
        </div>
      </div>

      {/* Customers List View */}
      {filteredCustomers.length === 0 ? (
        <EmptyState
          title="No customer accounts match your search"
          message="Try selecting 'All Accounts' or click '+ New Customer Account' to add one."
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="table-wrap card desktop-table-view">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer Information</th>
                  <th>Contact & Address</th>
                  <th>Total Outstanding Due</th>
                  <th>Credit Limit</th>
                  <th>Account Status</th>
                  <th style={{ textAlign: 'right' }}>Khata Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c) => {
                  const hasDue = (c.balancePaise || 0) > 0;
                  const limitUsage = c.creditLimitPaise > 0
                    ? Math.min(100, Math.round((c.balancePaise / c.creditLimitPaise) * 100))
                    : 0;

                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="avatar-circle">
                            {c.name.slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <strong>{c.name}</strong>
                            <div className="muted tiny">{c.id}</div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div>
                          {c.phone ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Phone size={12} className="muted" /> {c.phone}
                            </span>
                          ) : (
                            <span className="muted tiny">No phone</span>
                          )}
                        </div>
                        <div className="muted tiny">{c.address || 'Local Customer'}</div>
                      </td>

                      <td>
                        <span style={{ fontSize: '1.05rem', fontWeight: 800, color: hasDue ? 'var(--red)' : 'var(--green)' }}>
                          {formatINR(c.balancePaise || 0)}
                        </span>
                        {hasDue ? (
                          <div className="tiny text-danger">Payment Pending</div>
                        ) : (
                          <div className="tiny text-success">All Cleared</div>
                        )}
                      </td>

                      <td>
                        <div>Limit: {formatINR(c.creditLimitPaise || 0)}</div>
                        {hasDue ? (
                          <div className="credit-bar-wrap" title={`${limitUsage}% credit used`}>
                            <div
                              className={`credit-bar-fill ${limitUsage > 85 ? 'bar-danger' : limitUsage > 50 ? 'bar-warning' : 'bar-safe'}`}
                              style={{ width: `${limitUsage}%` }}
                            />
                          </div>
                        ) : null}
                      </td>

                      <td>
                        <span className={`badge ${hasDue ? 'badge-out' : 'badge-in'}`}>
                          {hasDue ? 'Due Pending' : 'Clear'}
                        </span>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                          {hasDue ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-success"
                                style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                                onClick={() => {
                                  setPayModalCustomer(c);
                                  setPayAmount(((c.balancePaise || 0) / 100).toFixed(2));
                                }}
                                title="Record repayment (Jama)"
                              >
                                <ArrowDownLeft size={14} /> Receive Jama
                              </button>

                              {c.phone ? (
                                <a
                                  href={getKhataWhatsAppUrl(c, shop)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="btn btn-ghost"
                                  style={{ padding: '6px 10px', fontSize: '0.82rem', color: 'var(--green)', borderColor: 'var(--green-border)' }}
                                  title="Send WhatsApp payment reminder"
                                >
                                  <MessageSquare size={14} /> WhatsApp
                                </a>
                              ) : null}
                            </>
                          ) : null}

                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                            onClick={() => setStatementCustomer(c)}
                            title="View Ledger Statement"
                          >
                            <Eye size={14} /> Statement
                          </button>

                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => openEditCustomer(c)}
                            title="Edit Customer Details"
                          >
                            <Pencil size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Touch-Friendly Khata Customer Cards */}
          <div className="mobile-cards-view">
            {filteredCustomers.map((c) => {
              const hasDue = (c.balancePaise || 0) > 0;
              const limitUsage = c.creditLimitPaise > 0
                ? Math.min(100, Math.round((c.balancePaise / c.creditLimitPaise) * 100))
                : 0;

              return (
                <div key={c.id} className="mobile-entity-card card">
                  <div className="card-top-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar-circle">
                        {c.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <strong className="entity-title">{c.name}</strong>
                        <div className="muted tiny">{c.address || 'Local Customer'}</div>
                      </div>
                    </div>
                    <span className={`badge ${hasDue ? 'badge-out' : 'badge-in'}`}>
                      {hasDue ? 'Due' : 'Clear'}
                    </span>
                  </div>

                  <div className="card-detail-grid">
                    <div>
                      <span className="tiny muted">Outstanding Due</span>
                      <div
                        className="card-highlight-val"
                        style={{ color: hasDue ? 'var(--red)' : 'var(--green)' }}
                      >
                        {formatINR(c.balancePaise || 0)}
                      </div>
                      {hasDue ? (
                        <span className="tiny text-danger">Pending</span>
                      ) : (
                        <span className="tiny text-success">Zero Balance</span>
                      )}
                    </div>
                    <div>
                      <span className="tiny muted">Credit Limit</span>
                      <div className="card-stock-val">{formatINR(c.creditLimitPaise || 0)}</div>
                      {hasDue ? (
                        <div className="credit-bar-wrap" style={{ marginTop: 6 }}>
                          <div
                            className={`credit-bar-fill ${limitUsage > 85 ? 'bar-danger' : limitUsage > 50 ? 'bar-warning' : 'bar-safe'}`}
                            style={{ width: `${limitUsage}%` }}
                          />
                        </div>
                      ) : (
                        <span className="tiny text-success">Available</span>
                      )}
                    </div>
                  </div>

                  <div className="card-footer-row" style={{ flexDirection: 'column', gap: 8, alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {c.phone ? (
                        <a
                          href={`tel:${c.phone}`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--blue)', fontWeight: 600, fontSize: '0.85rem' }}
                        >
                          <Phone size={13} /> {c.phone}
                        </a>
                      ) : (
                        <span className="muted tiny">No phone</span>
                      )}

                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setStatementCustomer(c)}
                        >
                          <Eye size={13} /> Statement
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => openEditCustomer(c)}
                          title="Edit Customer"
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                    </div>

                    {hasDue ? (
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <button
                          type="button"
                          className="btn btn-success btn-sm"
                          style={{ flex: 1, justifyContent: 'center' }}
                          onClick={() => {
                            setPayModalCustomer(c);
                            setPayAmount(((c.balancePaise || 0) / 100).toFixed(2));
                          }}
                        >
                          <ArrowDownLeft size={14} /> Receive Jama
                        </button>

                        {c.phone ? (
                          <a
                            href={getKhataWhatsAppUrl(c, shop)}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--green)', borderColor: 'var(--green-border)', flex: 1, justifyContent: 'center' }}
                          >
                            <MessageSquare size={14} /> WhatsApp
                          </a>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Receive Payment (Jama) Modal */}
      {payModalCustomer ? (
        <div className="modal-backdrop" onClick={() => setPayModalCustomer(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Receive Jama (Khata Repayment)</h3>
              <span className="demo-pill" style={{ background: 'var(--green-light)', color: 'var(--green)', borderColor: 'var(--green-border)' }}>JAMA</span>
            </div>

            <div style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: 8, marginBottom: 14 }}>
              <div>Customer: <strong>{payModalCustomer.name}</strong></div>
              <div className="muted small">Phone: {payModalCustomer.phone || '—'}</div>
              <div style={{ marginTop: 4 }}>
                Current Outstanding Due: <strong style={{ color: 'var(--red)' }}>{formatINR(payModalCustomer.balancePaise)}</strong>
              </div>
            </div>

            <label className="field" style={{ marginBottom: 12 }}>
              <span>Payment Amount Received (₹) *</span>
              <input
                type="number"
                min="1"
                step="1"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="Enter amount in ₹"
                autoFocus
              />
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <button
                  type="button"
                  className="chip"
                  onClick={() => setPayAmount(((payModalCustomer.balancePaise || 0) / 100).toFixed(2))}
                >
                  Full Due ({formatINR(payModalCustomer.balancePaise)})
                </button>
                <button type="button" className="chip" onClick={() => setPayAmount('500')}>₹500</button>
                <button type="button" className="chip" onClick={() => setPayAmount('1000')}>₹1,000</button>
                <button type="button" className="chip" onClick={() => setPayAmount('2000')}>₹2,000</button>
              </div>
            </label>

            <label className="field" style={{ marginBottom: 12 }}>
              <span>Payment Mode</span>
              <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                <option value="cash">Cash Counter</option>
                <option value="upi">UPI / GPay / PhonePe</option>
                <option value="bank">Bank Transfer / Cheque</option>
              </select>
            </label>

            <label className="field" style={{ marginBottom: 14 }}>
              <span>Note / Receipt Reference (Optional)</span>
              <input
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="e.g. Paid in person at counter"
              />
            </label>

            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setPayModalCustomer(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-success" onClick={handleRecordPayment}>
                Confirm Jama ({payAmount ? `₹${payAmount}` : 'Save'})
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Customer Ledger Statement Modal */}
      {statementCustomer ? (
        <div className="modal-backdrop" onClick={() => setStatementCustomer(null)}>
          <div className="modal-card wide" onClick={(e) => e.stopPropagation()}>
            <div className="page-head" style={{ marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0 }}>Khata Statement — {statementCustomer.name}</h3>
                <span className="muted small">
                  Phone: {statementCustomer.phone || '—'} · Address: {statementCustomer.address || '—'}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="small muted">Current Balance:</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: statementCustomer.balancePaise > 0 ? 'var(--red)' : 'var(--green)' }}>
                  {formatINR(statementCustomer.balancePaise || 0)}
                </div>
              </div>
            </div>

            {customerLedgerList.length === 0 ? (
              <EmptyState title="No transactions recorded yet" message="Bills bought on Khata or Jama payments will appear here." />
            ) : (
              <div className="table-wrap" style={{ maxHeight: '380px' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>Type</th>
                      <th>Details / Bill #</th>
                      <th style={{ textAlign: 'right' }}>Udhar (Debit)</th>
                      <th style={{ textAlign: 'right' }}>Jama (Credit)</th>
                      <th style={{ textAlign: 'right' }}>Running Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerLedgerList.map((tx) => (
                      <tr key={tx.id}>
                        <td>{formatDateTime(tx.date)}</td>
                        <td>
                          <span className={`badge ${tx.type === 'credit' ? 'badge-out' : 'badge-in'}`}>
                            {tx.type === 'credit' ? 'Udhar (Bill)' : 'Jama (Paid)'}
                          </span>
                        </td>
                        <td>
                          <strong>{tx.invoiceNumber ? `Bill #${tx.invoiceNumber}` : tx.notes}</strong>
                          {tx.paymentMethod && tx.type === 'payment' ? (
                            <span className="muted tiny"> via {tx.paymentMethod.toUpperCase()}</span>
                          ) : null}
                        </td>
                        <td style={{ textAlign: 'right', color: tx.type === 'credit' ? 'var(--red)' : undefined, fontWeight: 700 }}>
                          {tx.type === 'credit' ? formatINR(tx.amountPaise) : '—'}
                        </td>
                        <td style={{ textAlign: 'right', color: tx.type === 'payment' ? 'var(--green)' : undefined, fontWeight: 700 }}>
                          {tx.type === 'payment' ? formatINR(tx.amountPaise) : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800 }}>
                          {formatINR(tx.balanceAfterPaise || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setStatementCustomer(null)}>
                Close
              </button>
              {statementCustomer.phone ? (
                <a
                  href={getKhataWhatsAppUrl(statementCustomer, shop)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ghost"
                  style={{ color: 'var(--green)', borderColor: 'var(--green-border)' }}
                >
                  <MessageSquare size={15} /> WhatsApp Reminder
                </a>
              ) : null}
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setStatementPrintOpen(true);
                }}
              >
                <Printer size={15} /> Print Statement
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Printable Statement */}
      <PrintStage
        open={statementPrintOpen}
        title={`Khata Statement — ${statementCustomer?.name || ''}`}
        extraClass="statement-print layout-a4"
        onClose={() => setStatementPrintOpen(false)}
      >
        {statementCustomer ? (
          <section className="receipt layout-a4">
            <header className="a4-header">
              <div className="a4-shop-info">
                <h1 className="a4-shop-title">{shop.name}</h1>
                <p className="a4-shop-addr">{shop.address}</p>
                <p>Phone: {shop.phone} | GSTIN: {shop.gstin || 'N/A'}</p>
              </div>
              <div className="a4-inv-meta">
                <span className="a4-badge">CUSTOMER KHATA STATEMENT</span>
                <h2>{statementCustomer.name}</h2>
                <p>Contact: {statementCustomer.phone || '—'}</p>
                <p>Date: {formatDateTime(new Date())}</p>
              </div>
            </header>

            <div className="a4-customer-box">
              <div>
                <span className="a4-box-title">Customer Account</span>
                <p><strong>{statementCustomer.name}</strong> ({statementCustomer.id})</p>
                <p className="muted small">{statementCustomer.address || 'Address on file'}</p>
              </div>
              <div>
                <span className="a4-box-title">Total Outstanding Due Balance</span>
                <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--red)' }}>
                  {formatINR(statementCustomer.balancePaise || 0)}
                </p>
              </div>
            </div>

            <table className="a4-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Transaction</th>
                  <th>Bill / Ref</th>
                  <th style={{ textAlign: 'right' }}>Udhar (Debit)</th>
                  <th style={{ textAlign: 'right' }}>Jama (Credit)</th>
                  <th style={{ textAlign: 'right' }}>Balance Due</th>
                </tr>
              </thead>
              <tbody>
                {customerLedgerList.map((tx) => (
                  <tr key={tx.id}>
                    <td>{formatDateTime(tx.date)}</td>
                    <td>{tx.type === 'credit' ? 'Bill Purchase (Udhar)' : 'Payment Received (Jama)'}</td>
                    <td>{tx.invoiceNumber ? `Bill #${tx.invoiceNumber}` : tx.notes}</td>
                    <td style={{ textAlign: 'right' }}>{tx.type === 'credit' ? formatINR(tx.amountPaise) : '—'}</td>
                    <td style={{ textAlign: 'right' }}>{tx.type === 'payment' ? formatINR(tx.amountPaise) : '—'}</td>
                    <td style={{ textAlign: 'right' }}><strong>{formatINR(tx.balanceAfterPaise || 0)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: 24, textAlign: 'center', borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
              <p><strong>{shop.receiptFooter}</strong></p>
              <p className="tiny muted">Computer Generated Khata Statement · {shop.name}</p>
            </div>
          </section>
        ) : null}
      </PrintStage>

      {/* Add / Edit Customer Modal */}
      {formOpen ? (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>{editingCustomer ? 'Edit Customer Account' : 'Add New Khata Customer'}</h3>
            <p className="muted small" style={{ marginBottom: 14 }}>
              Register regular customers to allow credit billing (Udhar) and maintain their personal ledger.
            </p>

            <div className="form-grid two">
              <label className="field" style={{ gridColumn: '1 / -1' }}>
                <span>Customer Full Name *</span>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Ramesh Patel"
                  autoFocus
                />
              </label>

              <label className="field">
                <span>Mobile Phone (10 digits)</span>
                <input
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  inputMode="numeric"
                  maxLength={10}
                />
              </label>

              <label className="field">
                <span>Credit Limit (₹)</span>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={formCreditLimit}
                  onChange={(e) => setFormCreditLimit(e.target.value)}
                  placeholder="e.g. 5000"
                />
              </label>

              <label className="field" style={{ gridColumn: '1 / -1' }}>
                <span>Store / Home Address</span>
                <textarea
                  rows={2}
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Street, Colony, Landmark"
                />
              </label>

              {!editingCustomer ? (
                <label className="field">
                  <span>Initial Due Balance (₹)</span>
                  <input
                    type="number"
                    min="0"
                    value={formInitialDue}
                    onChange={(e) => setFormInitialDue(e.target.value)}
                    placeholder="Previous balance if any"
                  />
                </label>
              ) : null}
            </div>

            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSaveCustomer}>
                {editingCustomer ? 'Update Customer' : 'Save Customer'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
