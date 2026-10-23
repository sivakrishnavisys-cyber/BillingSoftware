import { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  Eye,
  FileText,
  Filter,
  IndianRupee,
  Layers,
  Pencil,
  Phone,
  Plus,
  Printer,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
  X,
} from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import StatCard from '../components/StatCard';
import { useStore } from '../context/StoreContext';
import {
  createPurchaseInvoice,
  deleteSupplier,
  getProductPriceComparison,
  getSupplierLedger,
  recordPurchaseReturn,
  recordSupplierPayment,
  saveSupplier,
  searchSuppliers,
} from '../services/supplierService';
import { formatINR, paiseToRupees } from '../utils/currencyUtils';
import { downloadTextFile, toCsv } from '../utils/csvUtils';
import { formatDate, formatDateTime } from '../utils/dateUtils';

const PAYMENT_TERMS_OPTIONS = [
  'Immediate Cash',
  'Net 7 Days',
  '15 Days Credit',
  '30 Days Credit',
  'Weekly Settlement',
  'Monthly Settlement',
];

export default function Suppliers() {
  const {
    suppliers = [],
    purchases = [],
    purchaseReturns = [],
    supplierPayments = [],
    products = [],
    shop,
    update,
    showToast,
  } = useStore();

  const [activeTab, setActiveTab] = useState('suppliers'); // 'suppliers' | 'purchases' | 'returns' | 'comparison'
  const [query, setQuery] = useState('');

  // Supplier Form Modal State
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [supName, setSupName] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supGstin, setSupGstin] = useState('');
  const [supTerms, setSupTerms] = useState(PAYMENT_TERMS_OPTIONS[2]);
  const [supInitialDue, setSupInitialDue] = useState('0');

  // Supplier Payment Modal State
  const [payModalSupplier, setPayModalSupplier] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('bank_transfer');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');

  // New Purchase Invoice Modal State
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [poSupplierId, setPoSupplierId] = useState('');
  const [poBillNumber, setPoBillNumber] = useState('');
  const [poItems, setPoItems] = useState([]);
  const [poPaidAmount, setPoPaidAmount] = useState('0');
  const [poPayMethod, setPoPayMethod] = useState('bank_transfer');
  const [poNotes, setPoNotes] = useState('');
  const [selectedAddProductId, setSelectedAddProductId] = useState('');

  // Purchase Return Modal State
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [retSupplierId, setRetSupplierId] = useState('');
  const [retProductId, setRetProductId] = useState('');
  const [retQty, setRetQty] = useState('1');
  const [retUnitCost, setRetUnitCost] = useState('');
  const [retReason, setRetReason] = useState('Damaged goods / broken seal');
  const [retCreditNote, setRetCreditNote] = useState('');

  // Ledger Statement State
  const [ledgerSupplier, setLedgerSupplier] = useState(null);

  // Delete Confirm State
  const [deleteSupplierId, setDeleteSupplierId] = useState(null);

  // Derived Calculations
  const filteredSuppliers = useMemo(() => {
    return searchSuppliers(suppliers, query);
  }, [suppliers, query]);

  const totalSupplierDuePaise = useMemo(() => {
    return suppliers.reduce((s, sup) => s + (sup.balancePaise || 0), 0);
  }, [suppliers]);

  const totalPurchasesAmountPaise = useMemo(() => {
    return purchases.reduce((s, po) => s + (po.grandTotalPaise || 0), 0);
  }, [purchases]);

  const priceComparisonList = useMemo(() => {
    return getProductPriceComparison(purchases, products, suppliers);
  }, [purchases, products, suppliers]);

  const activeLedgerEvents = useMemo(() => {
    if (!ledgerSupplier) return [];
    return getSupplierLedger(purchases, supplierPayments, purchaseReturns, ledgerSupplier.id);
  }, [ledgerSupplier, purchases, supplierPayments, purchaseReturns]);

  // Handlers for Suppliers
  const openAddSupplier = () => {
    setEditingSupplier(null);
    setSupName('');
    setSupContact('');
    setSupPhone('');
    setSupEmail('');
    setSupAddress('');
    setSupGstin('');
    setSupTerms(PAYMENT_TERMS_OPTIONS[2]);
    setSupInitialDue('0');
    setSupplierModalOpen(true);
  };

  const openEditSupplier = (s) => {
    setEditingSupplier(s);
    setSupName(s.name);
    setSupContact(s.contactPerson || '');
    setSupPhone(s.phone || '');
    setSupEmail(s.email || '');
    setSupAddress(s.address || '');
    setSupGstin(s.gstin || '');
    setSupTerms(s.paymentTerms || PAYMENT_TERMS_OPTIONS[2]);
    setSupInitialDue(paiseToRupees(s.balancePaise || 0));
    setSupplierModalOpen(true);
  };

  const handleSaveSupplier = () => {
    try {
      update((prev) =>
        saveSupplier(
          prev,
          {
            name: supName,
            contactPerson: supContact,
            phone: supPhone,
            email: supEmail,
            address: supAddress,
            gstin: supGstin,
            paymentTerms: supTerms,
            balance: supInitialDue,
          },
          editingSupplier?.id || null
        )
      );

      showToast(editingSupplier ? 'Supplier updated successfully.' : 'New supplier registered.', 'success');
      setSupplierModalOpen(false);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteSupplier = () => {
    if (!deleteSupplierId) return;
    update((prev) => deleteSupplier(prev, deleteSupplierId));
    setDeleteSupplierId(null);
    showToast('Supplier deleted.', 'info');
  };

  // Handlers for Supplier Payments
  const handleRecordPayment = () => {
    try {
      const amountPaise = Math.round(Number(payAmount) * 100);
      if (!amountPaise || amountPaise <= 0) {
        showToast('Please enter a valid payment amount.', 'error');
        return;
      }

      update((prev) =>
        recordSupplierPayment(prev, {
          supplierId: payModalSupplier.id,
          amountPaise,
          paymentMethod: payMethod,
          referenceNumber: payRef,
          notes: payNotes,
        })
      );

      showToast(`Payment of ${formatINR(amountPaise)} recorded for ${payModalSupplier.name}.`, 'success');
      setPayModalSupplier(null);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Handlers for New Purchase Order
  const openNewPurchase = () => {
    setPoSupplierId(suppliers.length ? suppliers[0].id : '');
    setPoBillNumber('');
    setPoItems([]);
    setPoPaidAmount('0');
    setPoPayMethod('bank_transfer');
    setPoNotes('');
    setPurchaseModalOpen(true);
  };

  const addItemToPo = (prodId) => {
    if (!prodId) return;
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;

    if (poItems.some((it) => it.productId === prod.id)) {
      showToast(`${prod.name} is already added in this order.`, 'info');
      return;
    }

    setPoItems((prev) => [
      ...prev,
      {
        productId: prod.id,
        name: prod.name,
        sku: prod.sku,
        barcode: prod.barcode,
        qty: 10,
        unitCost: (prod.purchasePricePaise / 100).toFixed(2),
        taxRate: 5,
        mfgDate: new Date().toISOString().slice(0, 10),
        expiryDate: prod.expiryDate || '',
        batchNo: `BAT-${prod.sku}-26`,
      },
    ]);
    setSelectedAddProductId('');
  };

  const updatePoItem = (index, field, value) => {
    setPoItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, [field]: value } : it))
    );
  };

  const removePoItem = (index) => {
    setPoItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const poTotals = useMemo(() => {
    let sub = 0;
    let tax = 0;
    poItems.forEach((it) => {
      const q = Math.max(1, Number(it.qty) || 1);
      const c = Math.max(0, Number(it.unitCost) || 0) * 100;
      const t = Number(it.taxRate || 0);
      const lineSub = q * c;
      const lineTax = Math.round((lineSub * t) / 100);
      sub += lineSub;
      tax += lineTax;
    });
    const grand = sub + tax;
    return { subPaise: sub, taxPaise: tax, grandPaise: grand };
  }, [poItems]);

  const handleSavePurchase = () => {
    try {
      const sup = suppliers.find((s) => s.id === poSupplierId);
      if (!sup) throw new Error('Please select a valid supplier.');
      if (!poItems.length) throw new Error('Add at least one product item.');

      const paidPaise = Math.round(Number(poPaidAmount || 0) * 100);

      update((prev) =>
        createPurchaseInvoice(prev, {
          supplierId: sup.id,
          supplierName: sup.name,
          billNumber: poBillNumber,
          items: poItems,
          paidAmountPaise: paidPaise,
          paymentMethod: poPayMethod,
          notes: poNotes,
        })
      );

      showToast(`Purchase order recorded! Inventory stock updated automatically.`, 'success');
      setPurchaseModalOpen(false);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Handlers for Purchase Return
  const openNewReturn = () => {
    setRetSupplierId(suppliers.length ? suppliers[0].id : '');
    setRetProductId(products.length ? products[0].id : '');
    setRetQty('1');
    setRetUnitCost(products.length ? (products[0].purchasePricePaise / 100).toFixed(2) : '100');
    setRetReason('Damaged / packaging broken on arrival');
    setRetCreditNote('');
    setReturnModalOpen(true);
  };

  const handleSaveReturn = () => {
    try {
      const sup = suppliers.find((s) => s.id === retSupplierId);
      const prod = products.find((p) => p.id === retProductId);
      if (!sup || !prod) throw new Error('Select both a supplier and product.');

      const qty = Number(retQty);
      if (!qty || qty <= 0) throw new Error('Enter a valid return quantity.');
      if (qty > prod.quantity) {
        throw new Error(`Cannot return ${qty} units. Only ${prod.quantity} units are in store.`);
      }

      const cost = Number(retUnitCost);
      if (!cost || cost < 0) throw new Error('Enter a valid unit cost.');

      update((prev) =>
        recordPurchaseReturn(prev, {
          supplierId: sup.id,
          items: [
            {
              productId: prod.id,
              name: prod.name,
              sku: prod.sku,
              qty,
              unitCost: cost,
              reason: retReason,
            },
          ],
          creditNoteNumber: retCreditNote,
          reason: retReason,
        })
      );

      showToast(`Purchase return recorded! Stock reduced and supplier balance adjusted.`, 'success');
      setReturnModalOpen(false);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const exportSuppliersCsv = () => {
    const csv = toCsv(suppliers, [
      { label: 'Company Name', value: (s) => s.name },
      { label: 'Contact Person', value: (s) => s.contactPerson || '—' },
      { label: 'Phone', value: (s) => s.phone || '—' },
      { label: 'Email', value: (s) => s.email || '—' },
      { label: 'GSTIN', value: (s) => s.gstin || '—' },
      { label: 'Payment Terms', value: (s) => s.paymentTerms || '—' },
      { label: 'Balance Due (INR)', value: (s) => (s.balancePaise / 100).toFixed(2) },
    ]);
    downloadTextFile(`suppliers-directory-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    showToast('Suppliers list exported to CSV.', 'success');
  };

  return (
    <div className="suppliers-page">
      {/* Top Page Header */}
      <div className="page-head">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ margin: 0 }}>Purchase & Supplier Management</h1>
            <span className="demo-pill">PROCUREMENT</span>
          </div>
          <p className="muted">
            Maintain vendors, record purchase invoices, auto-update stock on arrival, track payments & balances, record returns, and compare supplier pricing.
          </p>
        </div>

        <div className="row-actions">
          <button type="button" className="btn btn-ghost" onClick={exportSuppliersCsv}>
            <Download size={15} /> Export CSV
          </button>
          <button type="button" className="btn btn-ghost" onClick={openNewReturn}>
            <ArrowDownRight size={15} color="var(--red)" /> Record Return
          </button>
          <button type="button" className="btn btn-primary" onClick={openNewPurchase}>
            <Plus size={16} /> + New Purchase Invoice
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <section className="stat-grid" style={{ marginBottom: 14 }}>
        <StatCard
          icon={IndianRupee}
          label="Total Vendor Outstanding"
          value={formatINR(totalSupplierDuePaise)}
          hint="Balance due across all suppliers"
          tone={totalSupplierDuePaise > 0 ? 'red' : 'green'}
        />
        <StatCard
          icon={Building2}
          label="Active Vendors"
          value={suppliers.length}
          hint="Registered commercial distributors"
          tone="blue"
        />
        <StatCard
          icon={Truck}
          label="Total Purchases Recorded"
          value={purchases.length}
          hint={`Lifetime procurement ${formatINR(totalPurchasesAmountPaise)}`}
          tone="green"
        />
        <StatCard
          icon={ArrowDownRight}
          label="Purchase Returns"
          value={purchaseReturns.length}
          hint="Damaged / expired goods returned"
          tone="orange"
        />
      </section>

      {/* Main Feature Tabs */}
      <div className="card filter-bar" style={{ marginBottom: 14, padding: '8px 12px' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', width: '100%' }}>
          <button
            type="button"
            className={`chip ${activeTab === 'suppliers' ? 'active' : ''}`}
            onClick={() => setActiveTab('suppliers')}
            style={activeTab === 'suppliers' ? { background: 'var(--blue-light)', borderColor: 'var(--blue)', color: 'var(--blue-dark)' } : {}}
          >
            <Building2 size={14} /> Suppliers Directory ({suppliers.length})
          </button>

          <button
            type="button"
            className={`chip ${activeTab === 'purchases' ? 'active' : ''}`}
            onClick={() => setActiveTab('purchases')}
            style={activeTab === 'purchases' ? { background: 'var(--blue-light)', borderColor: 'var(--blue)', color: 'var(--blue-dark)' } : {}}
          >
            <Truck size={14} /> Purchase Invoices & Stock-In ({purchases.length})
          </button>

          <button
            type="button"
            className={`chip ${activeTab === 'returns' ? 'active' : ''}`}
            onClick={() => setActiveTab('returns')}
            style={activeTab === 'returns' ? { background: 'var(--orange-light)', borderColor: 'var(--orange-border)', color: 'var(--orange)' } : {}}
          >
            <ArrowDownRight size={14} /> Purchase Returns ({purchaseReturns.length})
          </button>

          <button
            type="button"
            className={`chip ${activeTab === 'comparison' ? 'active' : ''}`}
            onClick={() => setActiveTab('comparison')}
            style={activeTab === 'comparison' ? { background: 'var(--green-light)', borderColor: 'var(--green-border)', color: 'var(--green)' } : {}}
          >
            <Layers size={14} /> Price Comparison Matrix
          </button>
        </div>
      </div>

      {/* TAB 1: SUPPLIERS DIRECTORY */}
      {activeTab === 'suppliers' ? (
        <section>
          <div className="card filter-bar" style={{ marginBottom: 12 }}>
            <div className="input-with-icon" style={{ flex: 2, minWidth: '220px' }}>
              <Search size={16} className="muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search suppliers by company name, contact person, phone, or GSTIN..."
              />
            </div>
            <button type="button" className="btn btn-primary btn-sm" onClick={openAddSupplier}>
              <Plus size={14} /> Add Supplier
            </button>
          </div>

          {filteredSuppliers.length === 0 ? (
            <EmptyState
              title="No suppliers found"
              message="Click '+ Add Supplier' above to register your wholesale vendors."
            />
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="table-wrap card desktop-table-view">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Supplier Company</th>
                      <th>Contact Details</th>
                      <th>GSTIN</th>
                      <th>Payment Terms</th>
                      <th>Outstanding Balance</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSuppliers.map((s) => {
                      const hasDue = (s.balancePaise || 0) > 0;
                      return (
                        <tr key={s.id}>
                          <td>
                            <strong>{s.name}</strong>
                            <div className="muted tiny">{s.address || 'Local Depot'}</div>
                          </td>
                          <td>
                            <div><strong>{s.contactPerson || 'Sales Desk'}</strong></div>
                            {s.phone ? (
                              <a href={`tel:${s.phone}`} style={{ fontSize: '0.8rem', color: 'var(--blue)' }}>
                                <Phone size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                                {s.phone}
                              </a>
                            ) : null}
                          </td>
                          <td>
                            <code style={{ fontSize: '0.78rem' }}>{s.gstin || 'Unregistered'}</code>
                          </td>
                          <td>
                            <span className="badge badge-low">{s.paymentTerms || '15 Days Credit'}</span>
                          </td>
                          <td>
                            <strong style={{ fontSize: '1.05rem', color: hasDue ? 'var(--red)' : 'var(--green)' }}>
                              {formatINR(s.balancePaise || 0)}
                            </strong>
                            {hasDue ? (
                              <div className="tiny text-danger">Payment Due</div>
                            ) : (
                              <div className="tiny text-success">Cleared</div>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                              {hasDue ? (
                                <button
                                  type="button"
                                  className="btn btn-success btn-sm"
                                  onClick={() => {
                                    setPayModalSupplier(s);
                                    setPayAmount(((s.balancePaise || 0) / 100).toFixed(2));
                                    setPayRef('');
                                    setPayNotes('');
                                  }}
                                  title="Record Payment to Supplier"
                                >
                                  <CreditCard size={13} /> Pay Supplier
                                </button>
                              ) : null}

                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => setLedgerSupplier(s)}
                                title="View Complete Ledger"
                              >
                                <Eye size={13} /> Ledger
                              </button>

                              <button
                                type="button"
                                className="icon-btn"
                                onClick={() => openEditSupplier(s)}
                                title="Edit Supplier"
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

              {/* Mobile Cards View */}
              <div className="mobile-cards-view">
                {filteredSuppliers.map((s) => {
                  const hasDue = (s.balancePaise || 0) > 0;
                  return (
                    <div key={s.id} className="mobile-entity-card card">
                      <div className="card-top-row">
                        <div>
                          <strong className="entity-title">{s.name}</strong>
                          <div className="muted tiny">{s.contactPerson || 'Sales Desk'} · {s.paymentTerms}</div>
                        </div>
                        <span className={`badge ${hasDue ? 'badge-out' : 'badge-in'}`}>
                          {hasDue ? 'Due' : 'Clear'}
                        </span>
                      </div>

                      <div className="card-detail-grid">
                        <div>
                          <span className="tiny muted">Outstanding Due</span>
                          <div className="card-highlight-val" style={{ color: hasDue ? 'var(--red)' : 'var(--green)' }}>
                            {formatINR(s.balancePaise || 0)}
                          </div>
                          <span className="tiny muted">GSTIN: {s.gstin || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="tiny muted">Contact</span>
                          <div className="card-stock-val">
                            {s.phone ? (
                              <a href={`tel:${s.phone}`} style={{ color: 'var(--blue)' }}>
                                <Phone size={13} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                                {s.phone}
                              </a>
                            ) : '—'}
                          </div>
                          <span className="tiny muted">{s.address ? s.address.slice(0, 24) + '...' : ''}</span>
                        </div>
                      </div>

                      <div className="card-footer-row" style={{ justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setLedgerSupplier(s)}
                          >
                            <Eye size={13} /> Ledger
                          </button>
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => openEditSupplier(s)}
                          >
                            <Pencil size={14} />
                          </button>
                        </div>

                        {hasDue ? (
                          <button
                            type="button"
                            className="btn btn-success btn-sm"
                            onClick={() => {
                              setPayModalSupplier(s);
                              setPayAmount(((s.balancePaise || 0) / 100).toFixed(2));
                            }}
                          >
                            <CreditCard size={13} /> Pay Supplier
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      ) : null}

      {/* TAB 2: PURCHASE INVOICES / GRN */}
      {activeTab === 'purchases' ? (
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span className="small muted">
              Showing {purchases.length} recorded purchases with automatic stock replenishment.
            </span>
            <button type="button" className="btn btn-primary btn-sm" onClick={openNewPurchase}>
              <Plus size={14} /> + Record New Purchase Invoice
            </button>
          </div>

          {purchases.length === 0 ? (
            <EmptyState
              title="No purchases recorded yet"
              message="Click '+ Record New Purchase Invoice' to enter vendor delivery bills."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {purchases.map((po) => (
                <div key={po.id} className="card" style={{ padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <strong style={{ fontSize: '1rem' }}>{po.purchaseNumber}</strong>
                        <span className="badge badge-in">{po.status?.toUpperCase()}</span>
                        <span className={`badge ${po.paymentStatus === 'paid' ? 'badge-in' : po.paymentStatus === 'partial' ? 'badge-low' : 'badge-out'}`}>
                          {po.paymentStatus?.toUpperCase()}
                        </span>
                      </div>
                      <div className="muted tiny" style={{ marginTop: 2 }}>
                        Supplier: <strong>{po.supplierName}</strong> · Bill Ref: <strong>{po.billNumber}</strong> · Date: {formatDate(po.date)}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ fontSize: '1.2rem', color: 'var(--blue)' }}>{formatINR(po.grandTotalPaise)}</strong>
                      <div className="tiny muted">
                        Paid: {formatINR(po.paidAmountPaise || 0)} · Due: <span style={{ color: po.dueAmountPaise > 0 ? 'var(--red)' : 'var(--green)', fontWeight: 700 }}>{formatINR(po.dueAmountPaise || 0)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="table-wrap" style={{ background: '#f8fafc', borderRadius: 8, padding: '4px 8px', marginTop: 8 }}>
                    <table className="data-table" style={{ background: 'transparent' }}>
                      <thead>
                        <tr>
                          <th>Item Name</th>
                          <th>SKU / Batch</th>
                          <th>Expiry Date</th>
                          <th style={{ textAlign: 'right' }}>Qty Received</th>
                          <th style={{ textAlign: 'right' }}>Unit Cost</th>
                          <th style={{ textAlign: 'right' }}>Line Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {po.items.map((it, idx) => (
                          <tr key={idx}>
                            <td><strong>{it.name}</strong></td>
                            <td className="muted tiny">{it.sku} · {it.batchNo || '—'}</td>
                            <td className="tiny">{it.expiryDate ? <span className="text-success">{it.expiryDate}</span> : '—'}</td>
                            <td style={{ textAlign: 'right' }}><strong>+{it.qty}</strong></td>
                            <td style={{ textAlign: 'right' }}>{formatINR(it.unitCostPaise)}</td>
                            <td style={{ textAlign: 'right' }}><strong>{formatINR(it.lineTotalPaise)}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {/* TAB 3: PURCHASE RETURNS */}
      {activeTab === 'returns' ? (
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span className="small muted">
              Manage damaged, expired, or rejected goods returned to suppliers with credit notes.
            </span>
            <button type="button" className="btn btn-primary btn-sm" onClick={openNewReturn}>
              <Plus size={14} /> + Record Purchase Return
            </button>
          </div>

          {purchaseReturns.length === 0 ? (
            <EmptyState
              title="No purchase returns recorded"
              message="Click '+ Record Purchase Return' to return goods back to wholesale vendors."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {purchaseReturns.map((ret) => (
                <div key={ret.id} className="card" style={{ padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <strong style={{ fontSize: '1rem' }}>{ret.returnNumber}</strong>
                        <span className="badge badge-out">RETURNED</span>
                        <span className="badge badge-low">CN: {ret.creditNoteNumber}</span>
                      </div>
                      <div className="muted tiny" style={{ marginTop: 2 }}>
                        Vendor: <strong>{ret.supplierName}</strong> · Date: {formatDate(ret.date)}
                      </div>
                    </div>
                    <strong style={{ fontSize: '1.2rem', color: 'var(--red)' }}>
                      -{formatINR(ret.totalAmountPaise)}
                    </strong>
                  </div>

                  <div className="table-wrap" style={{ background: '#f8fafc', borderRadius: 8, padding: '4px 8px' }}>
                    <table className="data-table" style={{ background: 'transparent' }}>
                      <thead>
                        <tr>
                          <th>Returned Item</th>
                          <th>SKU</th>
                          <th style={{ textAlign: 'right' }}>Qty Returned</th>
                          <th style={{ textAlign: 'right' }}>Credit Value</th>
                          <th>Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ret.items.map((it, idx) => (
                          <tr key={idx}>
                            <td><strong>{it.name}</strong></td>
                            <td className="muted tiny">{it.sku}</td>
                            <td style={{ textAlign: 'right' }}><strong className="text-danger">-{it.qty}</strong></td>
                            <td style={{ textAlign: 'right' }}><strong>{formatINR(it.lineTotalPaise)}</strong></td>
                            <td className="tiny muted">{it.reason || ret.notes || 'Damaged'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {/* TAB 4: PRICE COMPARISON MATRIX */}
      {activeTab === 'comparison' ? (
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h2 style={{ margin: 0 }}>Supplier Purchase Price Comparison</h2>
              <p className="muted small">
                Compare wholesale quotes across vendors for every product in your catalog to procure at the lowest cost.
              </p>
            </div>
          </div>

          <div className="table-wrap card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>SKU / Category</th>
                  <th>Current Cost</th>
                  <th>Selling Price (MRP)</th>
                  <th>Lowest Quote Vendor</th>
                  <th>Best Price</th>
                  <th>Gross Margin</th>
                </tr>
              </thead>
              <tbody>
                {priceComparisonList.slice(0, 30).map((row) => (
                  <tr key={row.product.id}>
                    <td><strong>{row.product.name}</strong></td>
                    <td className="muted tiny">{row.product.sku} · {row.product.category}</td>
                    <td>{formatINR(row.currentCostPaise)}</td>
                    <td><strong>{formatINR(row.product.sellingPricePaise)}</strong></td>
                    <td>
                      <span className="badge badge-in">{row.bestSupplier}</span>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--green)' }}>{formatINR(row.minCostPaise)}</strong>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--blue)' }}>+{row.marginPercent}%</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* MODAL 1: ADD / EDIT SUPPLIER */}
      {supplierModalOpen ? (
        <div className="modal-backdrop" onClick={() => setSupplierModalOpen(false)}>
          <div className="modal-card wide" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>{editingSupplier ? 'Edit Supplier Profile' : 'Register New Vendor / Supplier'}</h3>
              <button type="button" className="icon-btn" onClick={() => setSupplierModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="form-grid two">
              <label className="field">
                <span>Company / Wholesale Name *</span>
                <input
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  placeholder="e.g. Metro Wholesale / ITC Distribution"
                  autoFocus
                />
              </label>

              <label className="field">
                <span>Contact Person</span>
                <input
                  value={supContact}
                  onChange={(e) => setSupContact(e.target.value)}
                  placeholder="e.g. Vikram Singhania"
                />
              </label>

              <label className="field">
                <span>Phone / Mobile *</span>
                <input
                  value={supPhone}
                  onChange={(e) => setSupPhone(e.target.value)}
                  placeholder="10-digit mobile"
                />
              </label>

              <label className="field">
                <span>Email Address</span>
                <input
                  type="email"
                  value={supEmail}
                  onChange={(e) => setSupEmail(e.target.value)}
                  placeholder="orders@vendor.com"
                />
              </label>

              <label className="field">
                <span>GSTIN (GST Number)</span>
                <input
                  value={supGstin}
                  onChange={(e) => setSupGstin(e.target.value.toUpperCase())}
                  placeholder="36AABCU9603R1ZX"
                />
              </label>

              <label className="field">
                <span>Payment Terms</span>
                <select value={supTerms} onChange={(e) => setSupTerms(e.target.value)}>
                  {PAYMENT_TERMS_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>

              <label className="field" style={{ gridColumn: '1 / -1' }}>
                <span>Warehouse / Depot Address</span>
                <input
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  placeholder="Wholesale Market, Industrial Area"
                />
              </label>

              {!editingSupplier ? (
                <label className="field">
                  <span>Opening Outstanding Balance (₹)</span>
                  <input
                    type="number"
                    min="0"
                    value={supInitialDue}
                    onChange={(e) => setSupInitialDue(e.target.value)}
                    placeholder="0"
                  />
                </label>
              ) : null}
            </div>

            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setSupplierModalOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSaveSupplier}>
                {editingSupplier ? 'Update Supplier' : 'Save Supplier'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* MODAL 2: RECORD SUPPLIER PAYMENT */}
      {payModalSupplier ? (
        <div className="modal-backdrop" onClick={() => setPayModalSupplier(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Pay Supplier — {payModalSupplier.name}</h3>
              <button type="button" className="icon-btn" onClick={() => setPayModalSupplier(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ background: 'var(--red-light)', padding: '10px 14px', borderRadius: 8, marginBottom: 14 }}>
              <span className="small">Current Outstanding Balance:</span>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--red)' }}>
                {formatINR(payModalSupplier.balancePaise || 0)}
              </div>
            </div>

            <div className="form-grid">
              <label className="field">
                <span>Payment Amount (₹) *</span>
                <input
                  type="number"
                  min="1"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                />
              </label>

              <label className="field">
                <span>Payment Mode</span>
                <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                  <option value="bank_transfer">Bank Transfer / NEFT / IMPS</option>
                  <option value="upi">UPI / QR Code</option>
                  <option value="cheque">Bank Cheque</option>
                  <option value="cash">Cash Settlement</option>
                </select>
              </label>

              <label className="field">
                <span>Reference / Transaction ID</span>
                <input
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="e.g. UTR-982144 or Cheque #102934"
                />
              </label>

              <label className="field">
                <span>Notes (Optional)</span>
                <input
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Invoice settlement note"
                />
              </label>
            </div>

            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setPayModalSupplier(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-success" onClick={handleRecordPayment}>
                Confirm Payment & Update Balance
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* MODAL 3: NEW PURCHASE INVOICE */}
      {purchaseModalOpen ? (
        <div className="modal-backdrop" onClick={() => setPurchaseModalOpen(false)}>
          <div className="modal-card wide" style={{ width: min(850, 960) }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0 }}>Record Purchase Invoice (Goods Received)</h3>
                <span className="muted tiny">Products added here automatically increase available retail inventory.</span>
              </div>
              <button type="button" className="icon-btn" onClick={() => setPurchaseModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="form-grid two" style={{ marginBottom: 14 }}>
              <label className="field">
                <span>Supplier *</span>
                <select value={poSupplierId} onChange={(e) => setPoSupplierId(e.target.value)}>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} (Due: {formatINR(s.balancePaise || 0)})</option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Supplier Invoice / Bill No *</span>
                <input
                  value={poBillNumber}
                  onChange={(e) => setPoBillNumber(e.target.value)}
                  placeholder="e.g. MET-98421"
                />
              </label>
            </div>

            {/* Product Selector Row */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 14, background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}>
              <label className="field" style={{ flex: 1, margin: 0 }}>
                <span>Select Product to Add to Order:</span>
                <select
                  value={selectedAddProductId}
                  onChange={(e) => setSelectedAddProductId(e.target.value)}
                >
                  <option value="">-- Choose item from store catalog --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) — Current: {p.quantity} {p.unit}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => addItemToPo(selectedAddProductId)}
                disabled={!selectedAddProductId}
              >
                + Add Item
              </button>
            </div>

            {/* PO Items Table */}
            <div className="table-wrap" style={{ maxHeight: 220, overflowY: 'auto', marginBottom: 14 }}>
              {poItems.length === 0 ? (
                <div className="empty-state tiny">No items added yet. Select products above to build invoice.</div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th style={{ width: '90px' }}>Qty</th>
                      <th style={{ width: '100px' }}>Cost (₹)</th>
                      <th style={{ width: '70px' }}>Tax %</th>
                      <th>Expiry</th>
                      <th style={{ width: '100px', textAlign: 'right' }}>Total</th>
                      <th style={{ width: '30px' }} />
                    </tr>
                  </thead>
                  <tbody>
                    {poItems.map((it, idx) => (
                      <tr key={it.productId}>
                        <td>
                          <strong>{it.name}</strong>
                          <div className="muted tiny">{it.sku}</div>
                        </td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            value={it.qty}
                            onChange={(e) => updatePoItem(idx, 'qty', e.target.value)}
                            style={{ padding: '4px 6px', width: '100%' }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.5"
                            value={it.unitCost}
                            onChange={(e) => updatePoItem(idx, 'unitCost', e.target.value)}
                            style={{ padding: '4px 6px', width: '100%' }}
                          />
                        </td>
                        <td>
                          <select
                            value={it.taxRate}
                            onChange={(e) => updatePoItem(idx, 'taxRate', e.target.value)}
                            style={{ padding: '4px 6px', width: '100%' }}
                          >
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                          </select>
                        </td>
                        <td>
                          <input
                            type="date"
                            value={it.expiryDate}
                            onChange={(e) => updatePoItem(idx, 'expiryDate', e.target.value)}
                            style={{ padding: '4px 6px', width: '100%' }}
                          />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <strong>{formatINR((Number(it.qty) || 0) * (Number(it.unitCost) || 0) * 100 * (1 + (Number(it.taxRate) || 0) / 100))}</strong>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="icon-btn danger"
                            onClick={() => removePoItem(idx)}
                          >
                            <X size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Payment & Totals */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, background: '#f8fafc', padding: 12, borderRadius: 8 }}>
              <div>
                <label className="field">
                  <span>Downpayment Paid Now (₹):</span>
                  <input
                    type="number"
                    min="0"
                    value={poPaidAmount}
                    onChange={(e) => setPoPaidAmount(e.target.value)}
                    placeholder="0"
                  />
                </label>
                <label className="field" style={{ marginTop: 6 }}>
                  <span>Payment Mode:</span>
                  <select value={poPayMethod} onChange={(e) => setPoPayMethod(e.target.value)}>
                    <option value="bank_transfer">Bank Transfer / NEFT</option>
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                  </select>
                </label>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div className="muted small">Subtotal: {formatINR(poTotals.subPaise)}</div>
                <div className="muted small">GST Tax: {formatINR(poTotals.taxPaise)}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--blue)', margin: '4px 0' }}>
                  Total: {formatINR(poTotals.grandPaise)}
                </div>
                <div className="tiny" style={{ color: 'var(--red)', fontWeight: 700 }}>
                  Remaining Due on Balance: {formatINR(Math.max(0, poTotals.grandPaise - Math.round(Number(poPaidAmount || 0) * 100)))}
                </div>
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: 14 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setPurchaseModalOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSavePurchase}
                disabled={!poItems.length}
              >
                Confirm Purchase & Restock ({formatINR(poTotals.grandPaise)})
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* MODAL 4: RECORD PURCHASE RETURN */}
      {returnModalOpen ? (
        <div className="modal-backdrop" onClick={() => setReturnModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Record Purchase Return</h3>
              <button type="button" className="icon-btn" onClick={() => setReturnModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <p className="muted small" style={{ marginBottom: 12 }}>
              Returning goods deducts retail inventory stock and automatically reduces the outstanding debt balance owed to the supplier.
            </p>

            <div className="form-grid">
              <label className="field">
                <span>Select Supplier *</span>
                <select value={retSupplierId} onChange={(e) => setRetSupplierId(e.target.value)}>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} (Balance: {formatINR(s.balancePaise || 0)})</option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Product to Return *</span>
                <select
                  value={retProductId}
                  onChange={(e) => {
                    setRetProductId(e.target.value);
                    const found = products.find((p) => p.id === e.target.value);
                    if (found) setRetUnitCost((found.purchasePricePaise / 100).toFixed(2));
                  }}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) — Available: {p.quantity} {p.unit}
                    </option>
                  ))}
                </select>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <label className="field">
                  <span>Return Quantity *</span>
                  <input
                    type="number"
                    min="1"
                    value={retQty}
                    onChange={(e) => setRetQty(e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Credit Cost (₹/unit) *</span>
                  <input
                    type="number"
                    value={retUnitCost}
                    onChange={(e) => setRetUnitCost(e.target.value)}
                  />
                </label>
              </div>

              <label className="field">
                <span>Reason for Return</span>
                <input
                  value={retReason}
                  onChange={(e) => setRetReason(e.target.value)}
                  placeholder="e.g. Broken packaging, expired product"
                />
              </label>

              <label className="field">
                <span>Credit Note Number (Optional)</span>
                <input
                  value={retCreditNote}
                  onChange={(e) => setRetCreditNote(e.target.value)}
                  placeholder="e.g. CN-METRO-442"
                />
              </label>
            </div>

            <div className="modal-actions" style={{ marginTop: 14 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setReturnModalOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={handleSaveReturn}>
                Approve Return & Deduct Stock
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* MODAL 5: SUPPLIER LEDGER STATEMENT */}
      {ledgerSupplier ? (
        <div className="modal-backdrop" onClick={() => setLedgerSupplier(null)}>
          <div className="modal-card wide" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0 }}>Vendor Ledger Statement — {ledgerSupplier.name}</h3>
                <span className="muted tiny">Complete history of purchases, cash payments, and credit notes.</span>
              </div>
              <button type="button" className="icon-btn" onClick={() => setLedgerSupplier(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="table-wrap" style={{ maxHeight: 320, overflowY: 'auto', marginBottom: 14 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th style={{ textAlign: 'right' }}>Debit (Billed ₹)</th>
                    <th style={{ textAlign: 'right' }}>Credit (Paid ₹)</th>
                    <th style={{ textAlign: 'right' }}>Balance Due</th>
                  </tr>
                </thead>
                <tbody>
                  {activeLedgerEvents.map((ev) => (
                    <tr key={ev.id}>
                      <td>{formatDate(ev.date)}</td>
                      <td>
                        <span className={`badge ${ev.type === 'PURCHASE' ? 'badge-low' : ev.type === 'RETURN' ? 'badge-out' : 'badge-in'}`}>
                          {ev.type}
                        </span>
                      </td>
                      <td className="small">{ev.description}</td>
                      <td style={{ textAlign: 'right' }}>
                        {ev.debitPaise > 0 ? formatINR(ev.debitPaise) : '—'}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--green)', fontWeight: 600 }}>
                        {ev.creditPaise > 0 ? `-${formatINR(ev.creditPaise)}` : '—'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <strong style={{ color: ev.runningBalancePaise > 0 ? 'var(--red)' : 'var(--green)' }}>
                          {formatINR(ev.runningBalancePaise)}
                        </strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setLedgerSupplier(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
