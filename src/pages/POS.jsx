import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Banknote,
  Barcode,
  BookOpen,
  Camera,
  Check,
  Clock,
  CreditCard,
  Download,
  FileText,
  History,
  Keyboard,
  Minus,
  PauseCircle,
  Plus,
  Printer,
  RotateCcw,
  Search,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import BarcodeScanner from '../components/BarcodeScanner';
import BillItemTable from '../components/BillItemTable';
import PaymentModal from '../components/PaymentModal';
import PrintStage from '../components/PrintStage';
import PrinterAnimationModal from '../components/PrinterAnimationModal';
import Receipt from '../components/Receipt';
import ConfirmDialog from '../components/ConfirmDialog';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { CATEGORIES } from '../data/demoData';
import {
  addOrIncreaseItem,
  completeCheckout,
  setItemQty,
  summarizeCart,
} from '../services/billingService';
import { saveCustomer } from '../services/khataService';
import { searchProducts } from '../services/productService';
import { lookupProductByCode } from '../utils/barcodeUtils';
import { playBeep, playSuccessChime } from '../utils/audioUtils';
import { formatINR, parseRupeeInput } from '../utils/currencyUtils';
import { exportInvoicePdf } from '../utils/pdfReceiptUtils';

export default function POS() {
  const { products, settings, shop, customers, invoices, heldBills = [], update, showToast } = useStore();
  const { t } = useLanguage();

  // Search & Cart state
  const [omniQuery, setOmniQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [items, setItems] = useState([]);
  const [billDiscountType, setBillDiscountType] = useState('percent');
  const [billDiscountValue, setBillDiscountValue] = useState(settings.defaultBillDiscountPercent || 0);

  // Mobile View Tabs: 'cart' or 'catalog'
  const [mobileTab, setMobileTab] = useState('cart');

  // Customer / Khata state
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  // Hold & Reorder States
  const [heldBillsModalOpen, setHeldBillsModalOpen] = useState(false);
  const [reorderModalOpen, setReorderModalOpen] = useState(false);

  // Modals & triggers
  const [scannerOpen, setScannerOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [payInitialMethod, setPayInitialMethod] = useState('cash');
  const [clearOpen, setClearOpen] = useState(false);
  const [printInvoice, setPrintInvoice] = useState(null);
  const [printerAnimationOpen, setPrinterAnimationOpen] = useState(false);
  const [receiptLayout, setReceiptLayout] = useState(settings.receiptLayout || '80mm');
  const [flashMsg, setFlashMsg] = useState(null);

  const searchInputRef = useRef(null);
  const lockingRef = useRef(false);

  // Focus search input on mount on desktop
  useEffect(() => {
    if (window.innerWidth > 768) {
      searchInputRef.current?.focus();
    }
  }, []);

  const liveProducts = useMemo(() => products.filter((p) => p.status !== 'inactive'), [products]);

  // Omni-search suggestions (filtered when query >= 1 char)
  const searchMatches = useMemo(() => {
    if (!omniQuery.trim()) return [];
    return searchProducts(liveProducts, omniQuery).slice(0, 8);
  }, [liveProducts, omniQuery]);

  // Quick Catalog grid items
  const quickCatalogItems = useMemo(() => {
    if (selectedCategory === 'All') return liveProducts.slice(0, 24);
    return liveProducts.filter((p) => p.category === selectedCategory).slice(0, 24);
  }, [liveProducts, selectedCategory]);

  const activeCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [selectedCustomerId, customers]);

  const totals = summarizeCart(items, {
    billDiscountType,
    billDiscountValue,
    gstEnabled: settings.gstEnabled,
    gstRate: Number(settings.gstRate) || 0,
  });

  const flash = (text, type = 'info') => {
    setFlashMsg({ text, type });
    setTimeout(() => setFlashMsg((m) => (m?.text === text ? null : m)), 3000);
  };

  const addProductToBill = useCallback((product, qty = 1) => {
    try {
      setItems((prev) => addOrIncreaseItem(prev, product, qty));
      playBeep();
      flash(`${product.name} added.`, 'success');
      setOmniQuery('');
      if (window.innerWidth > 768) {
        searchInputRef.current?.focus();
      }
    } catch (err) {
      flash(err.message, 'error');
      showToast(err.message, 'error');
    }
  }, [showToast]);

  const handleOmniSubmit = (raw) => {
    const term = String(raw || '').trim();
    if (!term) return;

    // 1. Try exact barcode or SKU match
    const byCode = lookupProductByCode(liveProducts, term);
    if (byCode) {
      addProductToBill(byCode);
      return;
    }

    // 2. Try first search match
    const hits = searchProducts(liveProducts, term);
    if (hits.length > 0) {
      addProductToBill(hits[0]);
      return;
    }

    flash(`No product found for “${term}”.`, 'error');
    showToast(`No product found for “${term}”.`, 'error');
  };

  const onQtyChange = (id, nextQty) => {
    try {
      setItems((prev) => setItemQty(prev, id, nextQty, liveProducts));
    } catch (err) {
      flash(err.message, 'error');
      showToast(err.message, 'error');
    }
  };

  const onLineDiscount = (id, value) => {
    const paise = Math.max(0, parseRupeeInput(value || 0));
    setItems((prev) =>
      prev.map((item) => {
        if (item.productId !== id) return item;
        return { ...item, discountPaise: paise };
      })
    );
  };

  const handleQuickPay = (method) => {
    if (!items.length) {
      flash('Cart is empty. Add items to checkout.', 'error');
      return;
    }
    setPayInitialMethod(method);
    setPayOpen(true);
  };

  const executeCheckout = (paymentDetails) => {
    if (lockingRef.current) return;
    lockingRef.current = true;

    try {
      let createdInvoice = null;

      update((prev) => {
        const nextState = completeCheckout(prev, {
          items,
          billDiscountType,
          billDiscountValue,
          paymentMethod: paymentDetails?.paymentMethod || 'cash',
          amountPaidPaise: paymentDetails?.amountPaidPaise,
          customerId: paymentDetails?.customerId || activeCustomer?.id || null,
          customerName: paymentDetails?.customerName || activeCustomer?.name || '',
          customerPhone: paymentDetails?.customerPhone || activeCustomer?.phone || '',
        });
        createdInvoice = nextState?.lastInvoice || nextState?.invoice || nextState?.invoices?.[0];
        return nextState;
      });

      if (!createdInvoice) {
        throw new Error('Failed to record invoice.');
      }

      playSuccessChime();
      showToast(`Bill ${createdInvoice.invoiceNumber} completed successfully!`, 'success');
      setItems([]);
      setPayOpen(false);
      setPrintInvoice(createdInvoice);
      setPrinterAnimationOpen(true);
      setMobileTab('cart');
    } catch (err) {
      showToast(err.message || 'Error completing checkout', 'error');
    } finally {
      lockingRef.current = false;
    }
  };

  const handleCreateCustomer = () => {
    if (!newCustName.trim()) {
      showToast('Please enter customer name.', 'error');
      return;
    }
    try {
      let newCustId = null;
      update((prev) => {
        const nextState = saveCustomer(prev, {
          name: newCustName.trim(),
          phone: newCustPhone.trim(),
          address: newCustAddress.trim(),
          creditLimit: 5000,
          balance: 0,
        });
        const created = nextState.customers[nextState.customers.length - 1];
        newCustId = created.id;
        return nextState;
      });

      setSelectedCustomerId(newCustId);
      setCustomerModalOpen(false);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustAddress('');
      showToast('New Khata customer created and selected.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const downloadPdf = () => {
    if (!printInvoice) return;
    exportInvoicePdf(printInvoice, shop, receiptLayout);
    showToast(`Invoice ${printInvoice.invoiceNumber} PDF downloaded.`, 'success');
  };

  // Previous Invoices for selected customer
  const customerLastInvoices = useMemo(() => {
    if (!activeCustomer) return [];
    return invoices.filter(
      (inv) =>
        (inv.customerPhone && activeCustomer.phone && inv.customerPhone === activeCustomer.phone) ||
        (inv.customerName && inv.customerName.toLowerCase() === activeCustomer.name.toLowerCase())
    );
  }, [activeCustomer, invoices]);

  const handleReorderLastBill = (inv) => {
    if (!inv || !inv.items?.length) return;
    const reorderItems = [];
    inv.items.forEach((prevItem) => {
      const livePrd = liveProducts.find((p) => p.id === prevItem.productId || p.sku === prevItem.sku);
      if (livePrd && livePrd.quantity > 0) {
        const qty = Math.min(prevItem.qty, livePrd.quantity);
        reorderItems.push({
          productId: livePrd.id,
          name: livePrd.name,
          sku: livePrd.sku,
          barcode: livePrd.barcode,
          unitPricePaise: livePrd.sellingPricePaise,
          qty,
          discountPaise: prevItem.discountPaise || 0,
          unit: livePrd.unit,
          lineTotalPaise: livePrd.sellingPricePaise * qty - (prevItem.discountPaise || 0),
        });
      }
    });

    if (!reorderItems.length) {
      showToast('Items from previous bill are currently out of stock.', 'error');
      return;
    }

    setItems(reorderItems);
    setReorderModalOpen(false);
    showToast(`Loaded ${reorderItems.length} items from previous bill ${inv.invoiceNumber}!`, 'success');
  };

  const holdCurrentBill = () => {
    if (!items.length) {
      showToast('Cart is empty. Nothing to hold.', 'error');
      return;
    }
    const newHeld = {
      id: `HB-${Date.now().toString().slice(-4)}`,
      heldAt: new Date().toISOString(),
      customer: activeCustomer,
      items: [...items],
      billDiscountType,
      billDiscountValue,
      totals,
      note: activeCustomer ? activeCustomer.name : 'Walk-in Customer',
    };
    update((prev) => ({
      ...prev,
      heldBills: [newHeld, ...(prev.heldBills || [])],
    }));
    setItems([]);
    setSelectedCustomerId('');
    showToast(`Bill #${newHeld.id} held. Cart cleared for next customer!`, 'info');
  };

  const resumeHeldBill = (heldBill) => {
    if (items.length > 0) {
      if (!window.confirm('Current cart has items. Replace cart with held bill?')) {
        return;
      }
    }
    setItems(heldBill.items || []);
    setBillDiscountType(heldBill.billDiscountType || 'percent');
    setBillDiscountValue(heldBill.billDiscountValue || 0);
    if (heldBill.customer?.id) {
      setSelectedCustomerId(heldBill.customer.id);
    } else {
      setSelectedCustomerId('');
    }
    update((prev) => ({
      ...prev,
      heldBills: (prev.heldBills || []).filter((hb) => hb.id !== heldBill.id),
    }));
    setHeldBillsModalOpen(false);
    showToast(`Bill #${heldBill.id} resumed!`, 'success');
  };

  const discardHeldBill = (heldId) => {
    update((prev) => ({
      ...prev,
      heldBills: (prev.heldBills || []).filter((hb) => hb.id !== heldId),
    }));
    showToast('Held bill discarded.', 'info');
  };

  return (
    <div className="pos-page modern-pos">
      {/* Mobile-Only Tab Switcher */}
      <div className="pos-mobile-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === 'cart'}
          className={`pos-mobile-tab-btn ${mobileTab === 'cart' ? 'active' : ''}`}
          onClick={() => setMobileTab('cart')}
        >
          <ShoppingCart size={16} />
          <span>{t('cart_items')}</span>
          {items.length > 0 ? (
            <span className="tab-count-badge">{items.length}</span>
          ) : null}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === 'catalog'}
          className={`pos-mobile-tab-btn ${mobileTab === 'catalog' ? 'active' : ''}`}
          onClick={() => setMobileTab('catalog')}
        >
          <Sparkles size={16} />
          <span>{t('quick_catalog')}</span>
        </button>
      </div>

      {/* POS Top Customer Bar */}
      <div className="pos-top-bar">
        <div className="pos-customer-selector">
          <div
            className="customer-badge-btn"
            onClick={() => setCustomerModalOpen(true)}
            role="button"
            tabIndex={0}
          >
            <Users size={16} color="var(--blue)" />
            {activeCustomer ? (
              <div className="selected-cust-info">
                <strong>{activeCustomer.name}</strong>
                {activeCustomer.balancePaise > 0 ? (
                  <span className="cust-due-tag">
                    {t('khata_balance_due')}: {formatINR(activeCustomer.balancePaise)}
                  </span>
                ) : (
                  <span className="cust-clear-tag">No Due</span>
                )}
              </div>
            ) : (
              <span>{t('walk_in_customer')}</span>
            )}
          </div>

          {activeCustomer ? (
            <>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setSelectedCustomerId('')}
                title="Reset to Walk-in customer"
              >
                <X size={15} />
              </button>

              {customerLastInvoices.length > 0 ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--blue)', borderColor: 'var(--blue-border)', background: 'var(--blue-light)' }}
                  onClick={() => setReorderModalOpen(true)}
                  title="Reorder items from previous bill"
                >
                  <RotateCcw size={13} /> ⚡ Reorder Bill ({customerLastInvoices.length})
                </button>
              ) : null}
            </>
          ) : (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setCustomerModalOpen(true)}
              title="Add or Select Khata Customer"
            >
              <UserPlus size={14} /> + Khata
            </button>
          )}
        </div>

        <div className="pos-meta-status">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={holdCurrentBill}
            disabled={!items.length}
            title="Hold current cart and start a new bill"
          >
            <PauseCircle size={14} /> <span>Hold Bill</span>
          </button>

          <button
            type="button"
            className={`btn btn-sm ${heldBills.length ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setHeldBillsModalOpen(true)}
            title="View and resume held bills"
          >
            <Clock size={14} /> <span>Held ({heldBills.length})</span>
          </button>

          <button
            type="button"
            className="btn btn-ghost btn-sm text-danger"
            onClick={() => setClearOpen(true)}
            disabled={!items.length}
            title={t('clear_cart')}
          >
            <Trash2 size={14} /> <span className="hide-on-mobile">{t('clear_cart')}</span>
          </button>
        </div>
      </div>

      {flashMsg ? (
        <div
          className={`alert alert-${
            flashMsg.type === 'error' ? 'error' : flashMsg.type === 'success' ? 'success' : 'info'
          }`}
          style={{ margin: '6px 0' }}
        >
          {flashMsg.text}
        </div>
      ) : null}

      {/* Main 2-Column POS Layout */}
      <div className={`modern-pos-grid mobile-show-${mobileTab}`}>
        {/* Left Column: Omni-Search + Cart Table + Quick Catalog */}
        <section className="pos-main-column">
          {/* Unified Smart Omni-Search Bar */}
          <div className="omni-search-container card">
            <div className="omni-input-wrap">
              <Search size={18} color="var(--blue)" className="search-icon" />
              <input
                ref={searchInputRef}
                value={omniQuery}
                onChange={(e) => setOmniQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleOmniSubmit(omniQuery);
                }}
                placeholder={t('omni_search_placeholder')}
                className="omni-input"
              />
              {omniQuery ? (
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setOmniQuery('')}
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              ) : null}
              <button
                type="button"
                className="btn btn-primary btn-sm omni-btn"
                onClick={() => handleOmniSubmit(omniQuery)}
              >
                {t('add_item')}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm omni-btn omni-scan-btn"
                onClick={() => setScannerOpen(true)}
                title="Open Camera Barcode Scanner"
              >
                <Camera size={16} /> <span className="scan-btn-text">{t('camera_scan')}</span>
              </button>
            </div>

            {/* Live Autocomplete Popover */}
            {searchMatches.length > 0 ? (
              <div className="omni-suggestions-popover">
                {searchMatches.map((p) => (
                  <div
                    key={p.id}
                    className="suggestion-item"
                    onClick={() => addProductToBill(p)}
                  >
                    <div>
                      <strong>{p.name}</strong>
                      <span className="muted tiny" style={{ marginLeft: 6 }}>
                        {p.sku} · {p.barcode}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ color: 'var(--blue)' }}>
                        {formatINR(p.sellingPricePaise)}
                      </strong>
                      <div
                        className={`tiny ${
                          p.quantity <= p.minStock ? 'text-danger' : 'text-success'
                        }`}
                      >
                        {p.quantity} {p.unit} in stock
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* Cart Items Container (Shown in mobile 'cart' tab and desktop) */}
          <div className="card pos-cart-card">
            <div className="cart-card-header">
              <h2>
                {t('cart_items')} ({totals.itemCount} {t('units')} · {items.length} lines)
              </h2>
              {items.length ? (
                <span className="tiny text-success" style={{ fontWeight: 600 }}>
                  <Sparkles size={13} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                  {t('ready_to_bill')}
                </span>
              ) : null}
            </div>

            {items.length === 0 ? (
              <div className="cute-empty-cart">
                <ShoppingCart size={40} color="#cbd5e1" />
                <p>
                  <strong>{t('cart_empty_title')}</strong>
                </p>
                <span className="muted tiny">{t('cart_empty_hint')}</span>
                <button
                  type="button"
                  className="btn btn-primary btn-sm mobile-only"
                  style={{ marginTop: 12 }}
                  onClick={() => setMobileTab('catalog')}
                >
                  Browse Catalog & Add Items
                </button>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="table-wrap cart-table-wrap cart-table-desktop">
                  <table className="data-table pos-table">
                    <thead>
                      <tr>
                        <th style={{ width: '30px' }}>#</th>
                        <th>Product</th>
                        <th style={{ textAlign: 'right' }}>Price</th>
                        <th style={{ textAlign: 'center', width: '130px' }}>Quantity</th>
                        <th style={{ textAlign: 'right', width: '90px' }}>Disc (₹)</th>
                        <th style={{ textAlign: 'right' }}>Line Total</th>
                        <th style={{ width: '40px' }} />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, idx) => (
                        <tr key={it.productId}>
                          <td className="muted tiny">{idx + 1}</td>
                          <td>
                            <strong>{it.name}</strong>
                            <div className="muted tiny">
                              {it.sku} · {it.barcode}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>{formatINR(it.unitPricePaise)}</td>
                          <td>
                            <div className="qty-stepper compact">
                              <button
                                type="button"
                                onClick={() => onQtyChange(it.productId, it.qty - 1)}
                                aria-label="Decrease quantity"
                              >
                                <Minus size={13} />
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={it.qty}
                                onChange={(e) => onQtyChange(it.productId, e.target.value)}
                              />
                              <button
                                type="button"
                                onClick={() => onQtyChange(it.productId, it.qty + 1)}
                                aria-label="Increase quantity"
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                          </td>
                          <td>
                            <input
                              className="discount-input compact"
                              value={it.discountPaise ? (it.discountPaise / 100).toFixed(2) : ''}
                              placeholder="0.00"
                              onChange={(e) => onLineDiscount(it.productId, e.target.value)}
                            />
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <strong>
                              {formatINR(
                                it.lineTotalPaise ||
                                  it.unitPricePaise * it.qty - (it.discountPaise || 0)
                              )}
                            </strong>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="icon-btn danger"
                              onClick={() =>
                                setItems((prev) =>
                                  prev.filter((x) => x.productId !== it.productId)
                                )
                              }
                              title="Remove item"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Touch-Friendly Cart Cards View */}
                <div className="cart-cards-mobile">
                  {items.map((it, idx) => (
                    <div key={it.productId} className="cart-mobile-item-card">
                      <div className="cart-mobile-card-top">
                        <div className="cart-mobile-item-info">
                          <span className="cart-mobile-item-num">#{idx + 1}</span>
                          <div>
                            <strong className="cart-mobile-item-title">{it.name}</strong>
                            <div className="cart-mobile-item-meta">
                              {it.sku} · {it.barcode}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="icon-btn danger cart-mobile-trash-btn"
                          onClick={() =>
                            setItems((prev) =>
                              prev.filter((x) => x.productId !== it.productId)
                            )
                          }
                          aria-label={`Remove ${it.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="cart-mobile-card-bottom">
                        <div className="qty-stepper touch-stepper">
                          <button
                            type="button"
                            onClick={() => onQtyChange(it.productId, it.qty - 1)}
                            aria-label="Decrease quantity"
                          >
                            <Minus size={15} />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={it.qty}
                            onChange={(e) => onQtyChange(it.productId, e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => onQtyChange(it.productId, it.qty + 1)}
                            aria-label="Increase quantity"
                          >
                            <Plus size={15} />
                          </button>
                        </div>

                        <div className="cart-mobile-discount-box">
                          <span className="tiny muted">Disc ₹:</span>
                          <input
                            className="discount-input compact"
                            value={it.discountPaise ? (it.discountPaise / 100).toFixed(2) : ''}
                            placeholder="0"
                            onChange={(e) => onLineDiscount(it.productId, e.target.value)}
                          />
                        </div>

                        <div className="cart-mobile-total-block">
                          <span className="tiny muted">{formatINR(it.unitPricePaise)} ea</span>
                          <strong className="cart-mobile-total-val">
                            {formatINR(
                              it.lineTotalPaise ||
                                it.unitPricePaise * it.qty - (it.discountPaise || 0)
                            )}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Quick Product Shelf Catalog */}
          <div className="card pos-catalog-shelf">
            <div className="shelf-header">
              <span className="small muted">{t('quick_catalog')}</span>
              <div className="shelf-categories scrollable-pills">
                <button
                  type="button"
                  className={`cat-chip ${selectedCategory === 'All' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('All')}
                >
                  {t('all_items')}
                </button>
                {CATEGORIES.map((cat) => (
                  <button
                    type="button"
                    key={cat}
                    className={`cat-chip ${selectedCategory === cat ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="compact-product-grid">
              {quickCatalogItems.map((p) => {
                const isOut = p.quantity <= 0;
                return (
                  <button
                    type="button"
                    key={p.id}
                    className={`shelf-item-card ${isOut ? 'out' : ''}`}
                    onClick={() => addProductToBill(p)}
                    disabled={isOut}
                    title={isOut ? 'Out of Stock' : `Tap to add ${p.name}`}
                  >
                    <span className="shelf-name">{p.name}</span>
                    <div className="shelf-price-row">
                      <strong className="shelf-price">
                        {formatINR(p.sellingPricePaise)}
                      </strong>
                      <span className={`shelf-stock ${p.quantity <= p.minStock ? 'low' : ''}`}>
                        {isOut ? 'Out' : `${p.quantity} ${p.unit}`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Right Column: Bill Summary & Instant Payment Trigger */}
        <aside className="card pos-checkout-panel">
          <div className="checkout-panel-head">
            <h2 style={{ margin: 0 }}>{t('bill_summary')}</h2>
            <span className="demo-pill">FAST POS</span>
          </div>

          {/* Customer Khata Status Card */}
          <div className="checkout-customer-box">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span className="small muted">{t('billed_to')}:</span>
              <button
                type="button"
                className="btn-link"
                onClick={() => setCustomerModalOpen(true)}
              >
                Change
              </button>
            </div>
            <strong style={{ fontSize: '0.98rem' }}>
              {activeCustomer ? activeCustomer.name : t('walk_in_customer')}
            </strong>
            {activeCustomer ? (
              <div className="customer-khata-mini-stat">
                <span>{t('khata_balance_due')}:</span>
                <strong
                  style={{
                    color: activeCustomer.balancePaise > 0 ? 'var(--red)' : 'var(--green)',
                  }}
                >
                  {formatINR(activeCustomer.balancePaise || 0)}
                </strong>
              </div>
            ) : null}
          </div>

          {/* Totals Breakdown */}
          <dl className="totals compact-totals">
            <div>
              <dt>{t('gross_subtotal')}</dt>
              <dd>{formatINR(totals.subtotalPaise)}</dd>
            </div>
            {totals.itemDiscountPaise > 0 ? (
              <div className="text-success">
                <dt>{t('item_savings')}</dt>
                <dd>-{formatINR(totals.itemDiscountPaise)}</dd>
              </div>
            ) : null}
            <div className="discount-row-wrap">
              <dt>{t('bill_discount')}</dt>
              <dd className="discount-row">
                <select
                  value={billDiscountType}
                  onChange={(e) => setBillDiscountType(e.target.value)}
                >
                  <option value="percent">%</option>
                  <option value="amount">₹</option>
                </select>
                <input
                  value={billDiscountValue}
                  onChange={(e) => setBillDiscountValue(e.target.value)}
                  placeholder="0"
                />
              </dd>
            </div>
            {totals.billDiscountPaise > 0 ? (
              <div className="text-success">
                <dt>Discount Applied</dt>
                <dd>-{formatINR(totals.billDiscountPaise)}</dd>
              </div>
            ) : null}
            <div>
              <dt>
                {t('tax_gst')} ({settings.gstEnabled ? `${settings.gstRate}%` : 'Off'})
              </dt>
              <dd>{formatINR(totals.taxPaise)}</dd>
            </div>
            <div className="grand-highlight">
              <dt>{t('grand_total')}</dt>
              <dd className="grand-val">{formatINR(totals.grandTotalPaise)}</dd>
            </div>
          </dl>

          {/* Quick 1-Click Payment Trigger Buttons */}
          <div className="quick-pay-section">
            <span className="small muted">Pay & Complete via:</span>
            <div className="quick-pay-grid">
              <button
                type="button"
                className="quick-pay-btn btn-cash"
                disabled={!items.length}
                onClick={() => handleQuickPay('cash')}
              >
                <Banknote size={18} />
                <span>{t('pay_cash')}</span>
              </button>

              <button
                type="button"
                className="quick-pay-btn btn-upi"
                disabled={!items.length}
                onClick={() => handleQuickPay('upi')}
              >
                <Smartphone size={18} />
                <span>{t('pay_upi')}</span>
              </button>

              <button
                type="button"
                className="quick-pay-btn btn-card"
                disabled={!items.length}
                onClick={() => handleQuickPay('card')}
              >
                <CreditCard size={18} />
                <span>{t('pay_card')}</span>
              </button>

              <button
                type="button"
                className="quick-pay-btn btn-khata"
                disabled={!items.length}
                onClick={() => handleQuickPay('khata')}
              >
                <BookOpen size={18} />
                <span>{t('pay_khata')}</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-success btn-checkout-main"
            disabled={!items.length}
            onClick={() => handleQuickPay('cash')}
          >
            {t('take_payment')} ({formatINR(totals.grandTotalPaise)})
          </button>
        </aside>
      </div>

      {/* Mobile Sticky Floating Checkout Bar (when in Catalog mode with items in cart) */}
      {items.length > 0 && mobileTab === 'catalog' ? (
        <div className="pos-mobile-floating-bar animate-popIn">
          <div className="floating-bar-info">
            <span className="floating-bar-count">
              {totals.itemCount} items ({items.length} lines)
            </span>
            <strong className="floating-bar-total">
              {formatINR(totals.grandTotalPaise)}
            </strong>
          </div>
          <button
            type="button"
            className="btn btn-success btn-sm floating-bar-pay-btn"
            onClick={() => setMobileTab('cart')}
          >
            View Bill & Checkout ➔
          </button>
        </div>
      ) : null}

      {/* Camera Barcode Scanner Modal */}
      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={(code) => {
          handleOmniSubmit(code);
        }}
      />

      {/* Checkout Payment Modal */}
      <PaymentModal
        open={payOpen}
        totalPaise={totals.grandTotalPaise}
        initialMethod={payInitialMethod}
        selectedCustomer={activeCustomer}
        customers={customers}
        onCancel={() => setPayOpen(false)}
        onConfirm={executeCheckout}
      />

      {/* Customer Selection & Quick Add Modal */}
      {customerModalOpen ? (
        <div className="modal-backdrop" onClick={() => setCustomerModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <h3 style={{ margin: 0 }}>Select or Add Customer</h3>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setCustomerModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="field">
                <span>Choose Existing Khata Account:</span>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => {
                    setSelectedCustomerId(e.target.value);
                    setCustomerModalOpen(false);
                    showToast('Customer selected for this bill.', 'info');
                  }}
                >
                  <option value="">Walk-in Customer (General Counter)</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''} — Due:{' '}
                      {formatINR(c.balancePaise || 0)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div
              className="divider-line"
              style={{ margin: '14px 0', borderTop: '1px dashed var(--border)' }}
            />

            <h4 style={{ margin: '0 0 10px', fontSize: '0.95rem' }}>+ Quick Add New Customer</h4>
            <div className="form-grid two">
              <label className="field" style={{ gridColumn: '1 / -1' }}>
                <span>Customer Name *</span>
                <input
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                />
              </label>
              <label className="field">
                <span>Mobile (10 digits)</span>
                <input
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="9876543210"
                  maxLength={10}
                />
              </label>
              <label className="field">
                <span>Address / Area</span>
                <input
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  placeholder="Main Bazaar"
                />
              </label>
            </div>

            <div className="modal-actions" style={{ marginTop: 14 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setCustomerModalOpen(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCreateCustomer}
              >
                Save & Select Customer
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Held Bills Modal */}
      {heldBillsModalOpen ? (
        <div className="modal-backdrop" onClick={() => setHeldBillsModalOpen(false)}>
          <div className="modal-card wide" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={20} color="var(--blue)" />
                <h3 style={{ margin: 0 }}>Held Bills ({heldBills.length})</h3>
              </div>
              <button type="button" className="icon-btn" onClick={() => setHeldBillsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <p className="muted small" style={{ marginBottom: 14 }}>
              Held orders are parked temporarily so you can ring up waiting customers. Click “Resume Bill” to load items back into the active checkout cart.
            </p>

            {heldBills.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 0' }}>
                <Clock size={36} color="#cbd5e1" />
                <p><strong>No held bills</strong></p>
                <span className="muted tiny">Use the “Hold Bill” button on active carts to park bills here.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {heldBills.map((hb) => (
                  <div key={hb.id} className="card" style={{ padding: 12, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <strong style={{ fontSize: '0.98rem' }}>#{hb.id} — {hb.customer ? hb.customer.name : 'Walk-in'}</strong>
                        <div className="muted tiny">
                          Held on: {new Date(hb.heldAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} ({new Date(hb.heldAt).toLocaleDateString('en-IN')})
                        </div>
                      </div>
                      <strong style={{ fontSize: '1.15rem', color: 'var(--blue)' }}>
                        {formatINR(hb.totals?.grandTotalPaise || 0)}
                      </strong>
                    </div>

                    <div className="muted tiny" style={{ marginBottom: 10 }}>
                      Items: {hb.items?.map((it) => `${it.name} (${it.qty})`).join(', ')}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm text-danger"
                        onClick={() => discardHeldBill(hb.id)}
                      >
                        <Trash2 size={14} /> Discard
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => resumeHeldBill(hb)}
                      >
                        Resume Bill ➔
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: 14 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setHeldBillsModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Customer Previous Bills (Reorder) Modal */}
      {reorderModalOpen ? (
        <div className="modal-backdrop" onClick={() => setReorderModalOpen(false)}>
          <div className="modal-card wide" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <RotateCcw size={20} color="var(--blue)" />
                <h3 style={{ margin: 0 }}>Previous Bills for {activeCustomer?.name}</h3>
              </div>
              <button type="button" className="icon-btn" onClick={() => setReorderModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <p className="muted small" style={{ marginBottom: 14 }}>
              Instantly reorder products from past invoices. 1-click loads previous grocery list directly into the current cart.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {customerLastInvoices.slice(0, 5).map((inv) => (
                <div key={inv.id} className="card" style={{ padding: 12, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div>
                      <strong>Invoice {inv.invoiceNumber}</strong>
                      <span className="muted tiny" style={{ marginLeft: 8 }}>
                        {new Date(inv.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--blue)' }}>
                      {formatINR(inv.grandTotalPaise)}
                    </strong>
                  </div>

                  <div className="muted tiny" style={{ marginBottom: 10 }}>
                    {inv.items?.map((it) => `${it.name} × ${it.qty}`).join(' · ')}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="tiny text-success" style={{ fontWeight: 600 }}>
                      Paid via {inv.paymentMethod?.toUpperCase()}
                    </span>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleReorderLastBill(inv)}
                    >
                      <RotateCcw size={14} /> ⚡ 1-Click Reorder Into Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="modal-actions" style={{ marginTop: 14 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setReorderModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Clear Bill Confirm Dialog */}
      <ConfirmDialog
        open={clearOpen}
        title="Clear Current Bill?"
        message="All items in the cart will be removed. Stock will not be affected."
        confirmLabel="Clear Cart"
        danger
        onCancel={() => setClearOpen(false)}
        onConfirm={() => {
          setItems([]);
          setClearOpen(false);
          flash('Cart cleared.', 'info');
        }}
      />

      {/* Animated POS Thermal Printer Modal */}
      <PrinterAnimationModal
        open={printerAnimationOpen}
        invoice={printInvoice}
        shop={shop}
        onClose={() => setPrinterAnimationOpen(false)}
        onStartNewBill={() => {
          setPrinterAnimationOpen(false);
          setPrintInvoice(null);
          setItems([]);
          setSelectedCustomerId('');
          setOmniQuery('');
        }}
        onOpenStandardPrint={() => {
          setPrinterAnimationOpen(false);
          window.print();
        }}
      />

      {/* Print Stage (for Manual / A4 Format Preview) */}
      <PrintStage
        open={Boolean(printInvoice) && !printerAnimationOpen}
        title={`Invoice ${printInvoice?.invoiceNumber || ''}`}
        extraClass={`receipt-print layout-${receiptLayout}`}
        onClose={() => setPrintInvoice(null)}
      >
        <div className="no-print receipt-toolbar-row">
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="small muted">Format:</span>
            <button
              type="button"
              className={`btn btn-ghost btn-sm ${receiptLayout === '80mm' ? 'btn-primary' : ''}`}
              onClick={() => setReceiptLayout('80mm')}
            >
              80mm Thermal
            </button>
            <button
              type="button"
              className={`btn btn-ghost btn-sm ${receiptLayout === 'a4' ? 'btn-primary' : ''}`}
              onClick={() => setReceiptLayout('a4')}
            >
              <FileText size={14} /> A4 Invoice
            </button>
          </div>
          <div className="row-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={downloadPdf}>
              <Download size={14} /> Download PDF
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => window.print()}
            >
              <Printer size={14} /> Print Receipt
            </button>
          </div>
        </div>
        <Receipt invoice={printInvoice} shop={shop} layout={receiptLayout} />
      </PrintStage>
    </div>
  );
}
