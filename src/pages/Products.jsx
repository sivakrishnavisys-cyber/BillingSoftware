import { useMemo, useState } from 'react';
import {
  Barcode,
  Camera,
  Check,
  Download,
  Eye,
  Layers,
  Pencil,
  Plus,
  RefreshCw,
  Tag,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import BarcodeScanner from '../components/BarcodeScanner';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import StockBadge from '../components/StockBadge';
import { useStore } from '../context/StoreContext';
import { UNITS } from '../data/demoData';
import { applyStockChange } from '../services/inventoryService';
import {
  deleteProduct,
  getStockStatus,
  saveProduct,
  searchProducts,
  stockStatusLabel,
} from '../services/productService';
import { generateSku, generateUniqueBarcode, lookupProductOrVariant } from '../utils/barcodeUtils';
import { formatINR, paiseToRupees, rupeesToPaise } from '../utils/currencyUtils';
import { downloadTextFile, parseCsv, toCsv } from '../utils/csvUtils';
import { formatDate } from '../utils/dateUtils';

const emptyForm = {
  name: '',
  category: 'Groceries',
  brand: '',
  sku: '',
  barcode: '',
  purchasePrice: '',
  sellingPrice: '',
  quantity: 20,
  minStock: 5,
  unit: 'pack',
  mfgDate: new Date().toISOString().slice(0, 10),
  expiryDate: '',
  batchNo: '',
  status: 'active',
  variants: [],
};

export default function Products() {
  const { products, categories = [], addCategory, update, showToast } = useStore();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [stock, setStock] = useState('all');
  const [expiryFilter, setExpiryFilter] = useState('all');
  const [sort, setSort] = useState('name');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [deleteId, setDeleteId] = useState(null);
  const [view, setView] = useState(null);

  // Quick category creation inside modal
  const [newCatInputOpen, setNewCatInputOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Barcode scanning & quick restock state
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState('catalog'); // 'catalog' or 'form'
  const [restockProduct, setRestockProduct] = useState(null);
  const [restockQty, setRestockQty] = useState(12);

  const rows = useMemo(() => {
    let list = searchProducts(products, query);
    if (category !== 'all') list = list.filter((p) => p.category === category);
    if (stock !== 'all') list = list.filter((p) => getStockStatus(p) === stock);

    const now = new Date();
    if (expiryFilter === 'expired') {
      list = list.filter((p) => p.expiryDate && new Date(p.expiryDate) < now);
    } else if (expiryFilter === 'soon') {
      list = list.filter((p) => {
        if (!p.expiryDate) return false;
        const diff = new Date(p.expiryDate) - now;
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return days >= 0 && days <= 30;
      });
    } else if (expiryFilter === 'valid') {
      list = list.filter((p) => {
        if (!p.expiryDate) return true;
        return new Date(p.expiryDate) > new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      });
    }

    list = [...list].sort((a, b) => {
      if (sort === 'price-asc') return a.sellingPricePaise - b.sellingPricePaise;
      if (sort === 'price-desc') return b.sellingPricePaise - a.sellingPricePaise;
      if (sort === 'stock-asc') return a.quantity - b.quantity;
      if (sort === 'stock-desc') return b.quantity - a.quantity;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [products, query, category, stock, expiryFilter, sort]);

  const openCreate = (initialBarcode = '') => {
    setEditingId(null);
    const existingBarcodes = products.map((p) => p.barcode);
    const barcodeToUse = initialBarcode || generateUniqueBarcode(existingBarcodes);
    setForm({
      ...emptyForm,
      category: categories[0] || 'Groceries',
      barcode: barcodeToUse,
      variants: [],
    });
    setErrors({});
    setNewCatInputOpen(false);
    setFormOpen(true);
  };

  const openEdit = (p) => {
    setEditingId(p.id);
    const mappedVariants = (p.variants || []).map((v) => ({
      ...v,
      sellingPrice: paiseToRupees(v.sellingPricePaise),
      purchasePrice: paiseToRupees(v.purchasePricePaise),
    }));

    setForm({
      name: p.name,
      category: p.category,
      brand: p.brand,
      sku: p.sku,
      barcode: p.barcode,
      purchasePrice: paiseToRupees(p.purchasePricePaise),
      sellingPrice: paiseToRupees(p.sellingPricePaise),
      quantity: p.quantity,
      minStock: p.minStock,
      unit: p.unit,
      mfgDate: p.mfgDate || '',
      expiryDate: p.expiryDate || '',
      batchNo: p.batchNo || '',
      status: p.status,
      variants: mappedVariants,
    });
    setErrors({});
    setNewCatInputOpen(false);
    setFormOpen(true);
  };

  const autoGenerateSku = () => {
    if (!form.name) return;
    const existingSkus = products.map((p) => p.sku);
    const newSku = generateSku(form.name, form.category, existingSkus);
    setForm((prev) => ({ ...prev, sku: newSku }));
  };

  const autoGenerateBarcode = () => {
    const existingBarcodes = products.map((p) => p.barcode);
    const newBarcode = generateUniqueBarcode(existingBarcodes);
    setForm((prev) => ({ ...prev, barcode: newBarcode }));
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    try {
      addCategory(newCatName.trim());
      setForm((prev) => ({ ...prev, category: newCatName.trim() }));
      showToast(`Category "${newCatName.trim()}" created!`, 'success');
      setNewCatName('');
      setNewCatInputOpen(false);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Add a variant row to the form
  const addVariantRow = () => {
    const count = (form.variants || []).length + 1;
    const variantBarcode = `${form.barcode || '890100000000'}-V${count}`;
    const newVar = {
      id: `VAR-${Date.now()}-${count}`,
      name: `Size ${count}`,
      sku: `${form.sku || 'SKU'}-V${count}`,
      barcode: variantBarcode,
      purchasePrice: form.purchasePrice || '0',
      sellingPrice: form.sellingPrice || '0',
      quantity: 20,
      unit: form.unit || 'pack',
    };
    setForm((prev) => ({
      ...prev,
      variants: [...(prev.variants || []), newVar],
    }));
  };

  const updateVariantRow = (idx, field, val) => {
    setForm((prev) => {
      const copy = [...(prev.variants || [])];
      copy[idx] = { ...copy[idx], [field]: val };
      return { ...prev, variants: copy };
    });
  };

  const removeVariantRow = (idx) => {
    setForm((prev) => ({
      ...prev,
      variants: (prev.variants || []).filter((_, i) => i !== idx),
    }));
  };

  const save = () => {
    try {
      const sanitizedVariants = (form.variants || []).map((v) => ({
        id: v.id || `VAR-${Date.now()}`,
        name: v.name,
        sku: v.sku,
        barcode: v.barcode,
        purchasePricePaise: rupeesToPaise(v.purchasePrice || 0),
        sellingPricePaise: rupeesToPaise(v.sellingPrice || 0),
        quantity: Number(v.quantity) || 0,
        unit: v.unit || form.unit,
      }));

      const payload = {
        ...form,
        variants: sanitizedVariants,
      };

      update((prev) => {
        const next = saveProduct(prev, payload, editingId);
        const { createdProduct, ...rest } = next;
        return rest;
      });
      setFormOpen(false);
      showToast(
        editingId
          ? `Updated “${form.name}”.`
          : `Added “${form.name}” with scannable barcode into catalog.`,
        'success'
      );
    } catch (err) {
      setErrors(err.fieldErrors || {});
      showToast(err.message, 'error');
    }
  };

  // Handle barcode scanned from camera or handheld scanner
  const handleBarcodeDetected = (code) => {
    const rawCode = String(code || '').trim();
    if (!rawCode) return;
    setScannerOpen(false);

    if (scannerMode === 'form') {
      // In form mode: populate the barcode field with the scanned manufacturer barcode
      setForm((prev) => ({ ...prev, barcode: rawCode }));
      showToast(`Scanned manufacturer barcode: ${rawCode}`, 'success');
      return;
    }

    // In catalog mode: check if product exists
    const hit = lookupProductOrVariant(products, rawCode);
    if (hit) {
      // Existing product found! Open restock dialog
      setRestockProduct(hit.product);
      setRestockQty(12);
    } else {
      // New product: open Add Product form with this barcode!
      showToast(`New barcode detected: ${rawCode}. Enter product details to save.`, 'info');
      openCreate(rawCode);
    }
  };

  const applyRestockStockIn = () => {
    if (!restockProduct) return;
    const qty = Number(restockQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      showToast('Enter a valid stock-in quantity.', 'error');
      return;
    }

    try {
      update((prev) =>
        applyStockChange(prev, {
          productId: restockProduct.id,
          changeQty: qty,
          type: 'stock-in',
          reason: `Restocked via barcode scan (${restockProduct.barcode})`,
        })
      );
      showToast(
        `Added +${qty} units of ${restockProduct.name} to inventory!`,
        'success'
      );
      setRestockProduct(null);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const exportCsv = () => {
    const csv = toCsv(rows, [
      { label: 'Product ID', value: (p) => p.id },
      { label: 'Name', value: (p) => p.name },
      { label: 'Category', value: (p) => p.category },
      { label: 'Brand', value: (p) => p.brand },
      { label: 'SKU', value: (p) => p.sku },
      { label: 'Barcode', value: (p) => p.barcode },
      { label: 'Purchase Price (INR)', value: (p) => paiseToRupees(p.purchasePricePaise) },
      { label: 'Selling Price (INR)', value: (p) => paiseToRupees(p.sellingPricePaise) },
      { label: 'Quantity', value: (p) => p.quantity },
      { label: 'Min Stock', value: (p) => p.minStock },
      { label: 'Unit', value: (p) => p.unit },
      { label: 'Variants Count', value: (p) => p.variants?.length || 0 },
      { label: 'Status', value: (p) => p.status },
    ]);
    downloadTextFile('products-catalogue.csv', csv);
    showToast('Product catalogue exported to CSV.', 'success');
  };

  const importCsv = async (file) => {
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      let added = 0;
      update((prev) => {
        let next = prev;
        parsed.forEach((row) => {
          try {
            next = saveProduct(
              next,
              {
                name: row.Name || row.name,
                category: row.Category || row.category || 'Groceries',
                brand: row.Brand || row.brand,
                sku: row.SKU || row.sku,
                barcode: row.Barcode || row.barcode,
                purchasePrice:
                  row['Purchase Price (INR)'] || row['Purchase Price'] || row.purchasePrice || 0,
                sellingPrice:
                  row['Selling Price (INR)'] || row['Selling Price'] || row.sellingPrice || 0,
                quantity: row.Quantity || row.quantity || 0,
                minStock: row['Min Stock'] || row.minStock || 0,
                unit: row.Unit || row.unit || 'pcs',
                status: row.Status || row.status || 'active',
              },
              null
            );
            const { createdProduct, ...rest } = next;
            next = rest;
            added += 1;
          } catch {
            // skip invalid rows
          }
        });
        return next;
      });
      showToast(`Imported ${added} products from CSV.`, added ? 'success' : 'warning');
    } catch {
      showToast('Could not parse CSV file. Please check format.', 'error');
    }
  };

  return (
    <div className="products-page">
      <div className="page-head">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ margin: 0 }}>Product Catalog Management</h1>
            <span className="demo-pill">{products.length} PRODUCTS</span>
          </div>
          <p className="muted">
            Manage groceries, packaged items, manufacturer barcodes, size variants, and category taxonomy.
          </p>
        </div>

        <div className="head-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {/* Quick Scan to Restock / Add */}
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setScannerMode('catalog');
              setScannerOpen(true);
            }}
            title="Scan manufacturer barcode (e.g. chocolate, biscuits) to quickly stock in or register"
          >
            <Camera size={16} /> <span>Scan Barcode In</span>
          </button>

          <label className="btn btn-ghost" title="Import products from CSV spreadsheet">
            <Upload size={16} /> <span className="hide-on-mobile">Import CSV</span>
            <input
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importCsv(f);
                e.target.value = '';
              }}
            />
          </label>

          <button type="button" className="btn btn-ghost" onClick={exportCsv} title="Export catalog as CSV">
            <Download size={16} /> <span className="hide-on-mobile">Export CSV</span>
          </button>

          <button type="button" className="btn btn-primary" onClick={() => openCreate()}>
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      <div className="card filter-bar">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by product name, SKU, or scannable barcode..."
          className="search-input"
        />

        <select value={category} onChange={(e) => setCategory(e.target.value)} title="Filter by Category">
          <option value="all">All Categories ({categories.length})</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select value={stock} onChange={(e) => setStock(e.target.value)} title="Filter by Stock Status">
          <option value="all">All Stock Levels</option>
          <option value="in">In Stock</option>
          <option value="low">Low Stock (≤ min alert)</option>
          <option value="out">Out of Stock</option>
        </select>

        <select
          value={expiryFilter}
          onChange={(e) => setExpiryFilter(e.target.value)}
          title="Filter by Expiry Date"
        >
          <option value="all">All Expiry States</option>
          <option value="expired">🚨 Expired Already</option>
          <option value="soon">⚠️ Expiring within 30 Days</option>
          <option value="valid">✅ Fresh / Valid Stock</option>
        </select>

        <select value={sort} onChange={(e) => setSort(e.target.value)} title="Sort Products">
          <option value="name">Sort: Name (A-Z)</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="stock-asc">Stock: Low to High</option>
          <option value="stock-desc">Stock: High to Low</option>
        </select>
      </div>

      {!rows.length ? (
        <EmptyState
          icon={Barcode}
          title="No products found"
          message={
            query || category !== 'all' || stock !== 'all'
              ? 'No products match the selected filters.'
              : 'Add your first product to begin billing in POS.'
          }
          actionLabel="Add Product"
          onAction={() => openCreate()}
        />
      ) : (
        <>
          {/* Desktop Product Table */}
          <div className="table-wrap hide-on-mobile">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>SKU & Barcode</th>
                  <th style={{ textAlign: 'right' }}>Cost</th>
                  <th style={{ textAlign: 'right' }}>Selling MRP</th>
                  <th>Available Stock</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const hasVariants = Array.isArray(p.variants) && p.variants.length > 0;
                  return (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.name}</strong>
                        <div className="muted small">
                          {p.brand ? `${p.brand} · ` : ''}
                          {p.unit}
                        </div>
                        {hasVariants ? (
                          <div style={{ marginTop: 2 }}>
                            <span
                              className="badge badge-in"
                              style={{ fontSize: '0.68rem', padding: '1px 6px' }}
                            >
                              <Layers size={10} style={{ display: 'inline', marginRight: 3 }} />
                              {p.variants.length} Variants
                            </span>
                          </div>
                        ) : null}
                      </td>
                      <td>
                        <span className="badge badge-subtle">{p.category}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.sku}</div>
                        <div className="muted small">
                          <code>{p.barcode}</code>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {formatINR(p.purchasePricePaise)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--blue)' }}>
                        {formatINR(p.sellingPricePaise)}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700 }}>
                          {p.quantity} {p.unit}
                        </div>
                        {p.expiryDate ? (
                          <div style={{ fontSize: '0.72rem', marginTop: 2 }}>
                            {new Date(p.expiryDate) < new Date() ? (
                              <span className="badge badge-out" style={{ fontSize: '0.65rem' }}>
                                Exp: {p.expiryDate}
                              </span>
                            ) : new Date(p.expiryDate) - new Date() <= 30 * 24 * 60 * 60 * 1000 ? (
                              <span className="badge badge-low" style={{ fontSize: '0.65rem' }}>
                                Exp: {p.expiryDate}
                              </span>
                            ) : (
                              <span className="muted">Exp: {p.expiryDate}</span>
                            )}
                          </div>
                        ) : (
                          <span className="muted small">Min: {p.minStock}</span>
                        )}
                      </td>
                      <td>
                        <StockBadge product={p} />
                      </td>
                      <td>
                        <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => setView(p)}
                            title="View Product Details"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => openEdit(p)}
                            title="Edit Product"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn danger"
                            onClick={() => setDeleteId(p.id)}
                            title="Delete Product"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Product Card List */}
          <div className="product-cards-mobile show-on-mobile">
            {rows.map((p) => {
              const hasVariants = Array.isArray(p.variants) && p.variants.length > 0;
              return (
                <div key={p.id} className="card product-mobile-card">
                  <div className="card-top-row">
                    <div>
                      <strong className="product-mobile-title">{p.name}</strong>
                      <div className="muted tiny">
                        {p.brand ? `${p.brand} · ` : ''}
                        <span className="badge badge-subtle" style={{ fontSize: '0.68rem', padding: '1px 5px' }}>
                          {p.category}
                        </span>
                      </div>
                      {hasVariants ? (
                        <div style={{ marginTop: 2 }}>
                          <span className="badge badge-in" style={{ fontSize: '0.65rem' }}>
                            {p.variants.length} Sizes/Variants
                          </span>
                        </div>
                      ) : null}
                    </div>
                    <StockBadge product={p} />
                  </div>

                  <div className="card-mid-grid">
                    <div>
                      <span className="tiny muted">Price:</span>
                      <strong style={{ display: 'block', color: 'var(--blue)', fontSize: '1rem' }}>
                        {formatINR(p.sellingPricePaise)}
                      </strong>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="tiny muted">Stock:</span>
                      <div>
                        <strong>{p.quantity}</strong> <span className="tiny">{p.unit}</span>
                      </div>
                    </div>
                  </div>

                  <div className="card-footer-row">
                    <span className="tiny muted">
                      SKU: <strong>{p.sku}</strong> · <code>{p.barcode}</code>
                    </span>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => setView(p)}
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => openEdit(p)}
                        title="Edit Product"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn danger"
                        onClick={() => setDeleteId(p.id)}
                        title="Delete Product"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Add / Edit Product Modal */}
      {formOpen ? (
        <div className="modal-backdrop" onClick={() => setFormOpen(false)}>
          <div
            className="modal-card wide animate-popIn"
            onClick={(e) => e.stopPropagation()}
            style={{ width: 'min(760px, 96vw)', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0 }}>
                  {editingId ? 'Edit Retail Product' : 'Add New Retail Product'}
                </h3>
                <p className="muted small" style={{ margin: '4px 0 0' }}>
                  Support for existing manufacturer barcodes (chocolates, biscuits), size variants, and categories.
                </p>
              </div>
              <button type="button" className="icon-btn" onClick={() => setFormOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="form-grid two">
              <Field label="Product Name *" error={errors.name}>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Sugar, Basmati Rice, Cadbury Dairy Milk"
                  autoFocus
                />
              </Field>

              <Field label="Category *" error={errors.category}>
                <div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      style={{ flex: 1 }}
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setNewCatInputOpen(!newCatInputOpen)}
                      title="Add a new category on the fly"
                    >
                      <Plus size={14} /> New
                    </button>
                  </div>

                  {newCatInputOpen ? (
                    <div
                      style={{
                        display: 'flex',
                        gap: 6,
                        marginTop: 6,
                        background: 'var(--surface-sunken)',
                        padding: 6,
                        borderRadius: 6,
                      }}
                    >
                      <input
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        placeholder="New category name..."
                        style={{ fontSize: '0.84rem' }}
                      />
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={handleAddCategory}
                      >
                        <Check size={14} /> Add
                      </button>
                    </div>
                  ) : null}
                </div>
              </Field>

              <Field label="Brand / Manufacturer">
                <input
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  placeholder="e.g. Cadbury, Nestle, Tata, D-Mart"
                />
              </Field>

              <Field label="Unit of Measurement">
                <select
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="SKU (Stock Keeping Unit) *" error={errors.sku}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
                    placeholder="e.g. CHK-001"
                  />
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={autoGenerateSku}
                    title="Auto-generate SKU"
                  >
                    <RefreshCw size={14} /> Auto
                  </button>
                </div>
              </Field>

              <Field label="Scannable Barcode *" error={errors.barcode}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    value={form.barcode}
                    onChange={(e) => setForm({ ...form, barcode: e.target.value.trim() })}
                    placeholder="e.g. 8901233020011 (or auto-assigned)"
                  />
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setScannerMode('form');
                      setScannerOpen(true);
                    }}
                    title="Scan manufacturer barcode from wrapper/box with camera"
                  >
                    <Camera size={14} /> Scan
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={autoGenerateBarcode}
                    title="Generate new unique internal barcode"
                  >
                    <Barcode size={14} /> New
                  </button>
                </div>
              </Field>

              <Field label="Purchase / Cost Price (₹) *" error={errors.purchasePrice}>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.purchasePrice}
                  onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
                  placeholder="Cost price in ₹"
                />
              </Field>

              <Field label="Selling / MRP Price (₹) *" error={errors.sellingPrice}>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.sellingPrice}
                  onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                  placeholder="Retail selling price in ₹"
                />
              </Field>

              <Field label="Available Quantity *" error={errors.quantity}>
                <input
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  placeholder="Units currently in stock"
                />
              </Field>

              <Field label="Minimum Stock Alert *" error={errors.minStock}>
                <input
                  type="number"
                  min="0"
                  value={form.minStock}
                  onChange={(e) => setForm({ ...form, minStock: e.target.value })}
                  placeholder="Warning alert threshold"
                />
              </Field>

              <Field label="Mfg / Packing Date">
                <input
                  type="date"
                  value={form.mfgDate}
                  onChange={(e) => setForm({ ...form, mfgDate: e.target.value })}
                />
              </Field>

              <Field label="Expiry Date">
                <input
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                />
              </Field>
            </div>

            {/* Product Variants Section (e.g. Sugar: 500g, 1kg, 5kg) */}
            <div
              style={{
                marginTop: 18,
                padding: '14px 16px',
                background: 'var(--surface-sunken)',
                borderRadius: 10,
                border: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 10,
                }}
              >
                <div>
                  <strong style={{ fontSize: '0.96rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Layers size={16} color="var(--blue)" />
                    Product Size / Weight Variants
                  </strong>
                  <div className="muted tiny">
                    Add different packet weights, sizes, or variants each with their own scannable barcode & MRP (e.g., Sugar: 500g, 1kg, 5kg).
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={addVariantRow}
                >
                  <Plus size={14} /> Add Variant
                </button>
              </div>

              {(!form.variants || form.variants.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--muted)', fontSize: '0.84rem' }}>
                  No variants added. This product will be sold as a single standard item. Click <strong>+ Add Variant</strong> to configure sizes.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {form.variants.map((v, idx) => (
                    <div
                      key={v.id || idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1.2fr 1.4fr 1fr 1fr 1fr 36px',
                        gap: 8,
                        alignItems: 'center',
                        background: 'var(--surface)',
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                      }}
                    >
                      <input
                        value={v.name}
                        onChange={(e) => updateVariantRow(idx, 'name', e.target.value)}
                        placeholder="e.g. 500 g"
                        title="Variant Name / Size"
                        style={{ fontSize: '0.82rem' }}
                      />
                      <input
                        value={v.barcode}
                        onChange={(e) => updateVariantRow(idx, 'barcode', e.target.value)}
                        placeholder="Variant Barcode"
                        title="Unique Barcode for this Variant"
                        style={{ fontSize: '0.82rem' }}
                      />
                      <input
                        type="number"
                        step="0.5"
                        value={v.sellingPrice}
                        onChange={(e) => updateVariantRow(idx, 'sellingPrice', e.target.value)}
                        placeholder="MRP ₹"
                        title="Selling Price in ₹"
                        style={{ fontSize: '0.82rem' }}
                      />
                      <input
                        type="number"
                        step="0.5"
                        value={v.purchasePrice}
                        onChange={(e) => updateVariantRow(idx, 'purchasePrice', e.target.value)}
                        placeholder="Cost ₹"
                        title="Purchase Price in ₹"
                        style={{ fontSize: '0.82rem' }}
                      />
                      <input
                        type="number"
                        value={v.quantity}
                        onChange={(e) => updateVariantRow(idx, 'quantity', e.target.value)}
                        placeholder="Stock Qty"
                        title="Variant Stock Quantity"
                        style={{ fontSize: '0.82rem' }}
                      />
                      <button
                        type="button"
                        className="icon-btn danger"
                        onClick={() => removeVariantRow(idx)}
                        title="Remove Variant"
                        style={{ width: 30, height: 30 }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-actions" style={{ marginTop: 20 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setFormOpen(false)}
              >
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={save}>
                {editingId ? 'Update Product Details' : 'Save Product to Inventory'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Quick Restock Dialog (Triggered by Scanning Manufacturer Barcode of Existing Product) */}
      {restockProduct ? (
        <div className="modal-backdrop" onClick={() => setRestockProduct(null)}>
          <div
            className="modal-card animate-popIn"
            onClick={(e) => e.stopPropagation()}
            style={{ width: 'min(460px, 94vw)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div className="icon-badge primary" style={{ width: 40, height: 40 }}>
                <Barcode size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0 }}>Product Found via Barcode!</h3>
                <span className="muted tiny">Code: <code>{restockProduct.barcode}</code></span>
              </div>
            </div>

            <div
              style={{
                background: 'var(--surface-sunken)',
                padding: '12px 16px',
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text)' }}>
                {restockProduct.name}
              </div>
              <div className="muted small" style={{ marginTop: 2 }}>
                Category: {restockProduct.category} · Price: {formatINR(restockProduct.sellingPricePaise)}
              </div>
              <div style={{ marginTop: 6, fontWeight: 700, color: 'var(--blue)' }}>
                Current Available Stock: {restockProduct.quantity} {restockProduct.unit}
              </div>
            </div>

            <label className="field" style={{ marginBottom: 16 }}>
              <span>Enter Stock-In Quantity to Add:</span>
              <input
                type="number"
                min="1"
                value={restockQty}
                onChange={(e) => setRestockQty(e.target.value)}
                autoFocus
                style={{ fontSize: '1.1rem', fontWeight: 700 }}
              />
            </label>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setRestockProduct(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={applyRestockStockIn}
              >
                + Add {restockQty} Units to Stock
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Barcode Scanner Modal (Camera scanning for manufacturer barcodes) */}
      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleBarcodeDetected}
      />

      {/* View Product Details Modal */}
      {view ? (
        <div className="modal-backdrop" onClick={() => setView(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0 }}>{view.name}</h3>
                <span className="muted small">
                  {view.category} · {view.brand || 'Retail'}
                </span>
              </div>
              <StockBadge product={view} />
            </div>

            <dl className="detail-list" style={{ marginTop: 12 }}>
              <div><dt>Product ID</dt><dd><strong>{view.id}</strong></dd></div>
              <div><dt>SKU</dt><dd><strong>{view.sku}</strong></dd></div>
              <div><dt>Barcode</dt><dd><code>{view.barcode}</code></dd></div>
              <div><dt>Selling MRP</dt><dd><strong>{formatINR(view.sellingPricePaise)}</strong></dd></div>
              <div><dt>Purchase Cost</dt><dd>{formatINR(view.purchasePricePaise)}</dd></div>
              <div><dt>Available Stock</dt><dd><strong>{view.quantity} {view.unit}</strong></dd></div>
              <div><dt>Minimum Stock</dt><dd>{view.minStock} {view.unit}</dd></div>
              <div><dt>Stock Status</dt><dd>{stockStatusLabel(getStockStatus(view))}</dd></div>
              <div><dt>Expiry Date</dt><dd>{view.expiryDate || 'N/A'}</dd></div>
            </dl>

            {view.variants && view.variants.length > 0 ? (
              <div style={{ marginTop: 14 }}>
                <strong style={{ fontSize: '0.88rem' }}>Configured Variants ({view.variants.length}):</strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                  {view.variants.map((v) => (
                    <div
                      key={v.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        background: 'var(--surface-sunken)',
                        borderRadius: 6,
                        fontSize: '0.82rem',
                      }}
                    >
                      <span><strong>{v.name}</strong> (<code>{v.barcode}</code>)</span>
                      <span><strong>{formatINR(v.sellingPricePaise)}</strong> · Stock: {v.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="modal-actions" style={{ marginTop: 20 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  const p = view;
                  setView(null);
                  openEdit(p);
                }}
              >
                <Pencil size={14} /> Edit
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setView(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete this product from catalog?"
        message="The product will be removed from future billing. Past completed bills referencing this item name will remain intact."
        confirmLabel="Confirm Delete"
        danger
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          update((prev) => deleteProduct(prev, deleteId));
          setDeleteId(null);
          showToast('Product deleted from catalog.', 'success');
        }}
      />
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {error ? <small className="field-error">{error}</small> : null}
    </label>
  );
}
