import { useMemo, useState } from 'react';
import { Barcode, Download, Eye, Pencil, Plus, RefreshCw, Trash2, Upload } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import StockBadge from '../components/StockBadge';
import { useStore } from '../context/StoreContext';
import { CATEGORIES, UNITS } from '../data/demoData';
import { deleteProduct, getStockStatus, saveProduct, searchProducts, stockStatusLabel } from '../services/productService';
import { generateSku, generateUniqueBarcode } from '../utils/barcodeUtils';
import { formatINR, paiseToRupees } from '../utils/currencyUtils';
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
};

export default function Products() {
  const { products, update, showToast } = useStore();
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

  const openCreate = () => {
    setEditingId(null);
    const existingBarcodes = products.map((p) => p.barcode);
    setForm({
      ...emptyForm,
      barcode: generateUniqueBarcode(existingBarcodes),
    });
    setErrors({});
    setFormOpen(true);
  };

  const openEdit = (p) => {
    setEditingId(p.id);
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
    });
    setErrors({});
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

  const save = () => {
    try {
      update((prev) => {
        const next = saveProduct(prev, form, editingId);
        const { createdProduct, ...rest } = next;
        return rest;
      });
      setFormOpen(false);
      showToast(editingId ? `Updated “${form.name}”.` : `Added “${form.name}” with scannable barcode.`, 'success');
    } catch (err) {
      setErrors(err.fieldErrors || {});
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
            next = saveProduct(next, {
              name: row.Name || row.name,
              category: row.Category || row.category || 'Groceries',
              brand: row.Brand || row.brand,
              sku: row.SKU || row.sku,
              barcode: row.Barcode || row.barcode,
              purchasePrice: row['Purchase Price (INR)'] || row['Purchase Price'] || row.purchasePrice || 0,
              sellingPrice: row['Selling Price (INR)'] || row['Selling Price'] || row.sellingPrice || 0,
              quantity: row.Quantity || row.quantity || 0,
              minStock: row['Min Stock'] || row.minStock || 0,
              unit: row.Unit || row.unit || 'pcs',
              status: row.Status || row.status || 'active',
            }, null);
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
          <p className="muted">Manage retail SKU catalog, pricing, unique barcodes, categories, and inventory thresholds.</p>
        </div>
        <div className="row-actions">
          <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
            <Upload size={16} /> Import CSV
            <input
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])}
            />
          </label>
          <button type="button" className="btn btn-ghost" onClick={exportCsv}>
            <Download size={16} /> Export CSV
          </button>
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      <div className="filter-bar card">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by product name, brand, SKU, or barcode"
          style={{ minWidth: '240px' }}
        />

        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select value={stock} onChange={(e) => setStock(e.target.value)}>
          <option value="all">All Stock Statuses</option>
          <option value="in">In Stock</option>
          <option value="low">Low Stock</option>
          <option value="out">Out of Stock</option>
        </select>

        <select value={expiryFilter} onChange={(e) => setExpiryFilter(e.target.value)}>
          <option value="all">All Expiry Dates</option>
          <option value="expired">⚠️ Expired Products</option>
          <option value="soon">⏳ Expiring within 30 Days</option>
          <option value="valid">✅ Fresh Stock (&gt;30d)</option>
        </select>

        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="name">Sort by Name (A–Z)</option>
          <option value="price-asc">Sort by Price (Low → High)</option>
          <option value="price-desc">Sort by Price (High → Low)</option>
          <option value="stock-asc">Sort by Stock (Lowest First)</option>
          <option value="stock-desc">Sort by Stock (Highest First)</option>
        </select>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No products found"
          message="Try adjusting your filter criteria or click 'Add Product' to create a new one."
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="table-wrap card desktop-table-view">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product Description</th>
                  <th>SKU & Barcode</th>
                  <th>Selling Price</th>
                  <th>Stock Units</th>
                  <th>Status</th>
                  <th>Expiry Date</th>
                  <th>Created</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const margin = p.purchasePricePaise > 0
                    ? (((p.sellingPricePaise - p.purchasePricePaise) / p.purchasePricePaise) * 100).toFixed(0)
                    : 0;
                  return (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.name}</strong>
                        <div className="muted small">
                          {p.category} · {p.brand} {p.status === 'inactive' ? '· (Inactive)' : ''}
                        </div>
                      </td>
                      <td>
                        <div><strong>{p.sku}</strong></div>
                        <div className="muted tiny" style={{ letterSpacing: '0.04em' }}>{p.barcode}</div>
                      </td>
                      <td>
                        <strong>{formatINR(p.sellingPricePaise)}</strong>
                        <div className="muted tiny">Cost {formatINR(p.purchasePricePaise)} (+{margin}%)</div>
                      </td>
                      <td>
                        <strong>{p.quantity}</strong> {p.unit}
                        <div className="muted tiny">Min: {p.minStock}</div>
                      </td>
                      <td><StockBadge product={p} /></td>
                      <td>
                        {p.expiryDate ? (
                          <div>
                            {new Date(p.expiryDate) < new Date() ? (
                              <span className="badge badge-out" style={{ padding: '2px 6px' }}>Expired ({p.expiryDate})</span>
                            ) : (new Date(p.expiryDate) - new Date()) <= 30 * 24 * 60 * 60 * 1000 ? (
                              <span className="badge badge-low" style={{ padding: '2px 6px' }}>Exp: {p.expiryDate}</span>
                            ) : (
                              <span style={{ fontSize: '0.82rem' }}>{p.expiryDate}</span>
                            )}
                          </div>
                        ) : (
                          <span className="muted tiny">—</span>
                        )}
                      </td>
                      <td>{formatDate(p.createdAt)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                          <button type="button" className="icon-btn" onClick={() => setView(p)} title="View Details">
                            <Eye size={16} />
                          </button>
                          <button type="button" className="icon-btn" onClick={() => openEdit(p)} title="Edit Product">
                            <Pencil size={16} />
                          </button>
                          <button type="button" className="icon-btn danger" onClick={() => setDeleteId(p.id)} title="Delete Product">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Touch-Friendly Product Cards View */}
          <div className="mobile-cards-view">
            {rows.map((p) => {
              const margin = p.purchasePricePaise > 0
                ? (((p.sellingPricePaise - p.purchasePricePaise) / p.purchasePricePaise) * 100).toFixed(0)
                : 0;
              return (
                <div key={p.id} className="mobile-entity-card card">
                  <div className="card-top-row">
                    <div>
                      <strong className="entity-title">{p.name}</strong>
                      <div className="muted tiny">{p.category} · {p.brand || 'General'}</div>
                    </div>
                    <StockBadge product={p} />
                  </div>

                  <div className="card-detail-grid">
                    <div>
                      <span className="tiny muted">Selling Price</span>
                      <div className="card-highlight-val">{formatINR(p.sellingPricePaise)}</div>
                      <span className="tiny muted">Cost {formatINR(p.purchasePricePaise)} (+{margin}%)</span>
                    </div>
                    <div>
                      <span className="tiny muted">Current Stock</span>
                      <div className="card-stock-val">
                        <strong>{p.quantity}</strong> <span className="tiny">{p.unit}</span>
                      </div>
                      {p.expiryDate ? (
                        <div style={{ marginTop: 2 }}>
                          {new Date(p.expiryDate) < new Date() ? (
                            <span className="badge badge-out" style={{ fontSize: '0.65rem' }}>Expired: {p.expiryDate}</span>
                          ) : (new Date(p.expiryDate) - new Date()) <= 30 * 24 * 60 * 60 * 1000 ? (
                            <span className="badge badge-low" style={{ fontSize: '0.65rem' }}>Exp: {p.expiryDate}</span>
                          ) : (
                            <span className="tiny muted">Exp: {p.expiryDate}</span>
                          )}
                        </div>
                      ) : (
                        <span className="tiny muted">Min alert: {p.minStock}</span>
                      )}
                    </div>
                  </div>

                  <div className="card-footer-row">
                    <span className="tiny muted">SKU: <strong>{p.sku}</strong> · {p.barcode}</span>
                    <div className="row-actions">
                      <button type="button" className="icon-btn" onClick={() => setView(p)} title="View Details">
                        <Eye size={16} />
                      </button>
                      <button type="button" className="icon-btn" onClick={() => openEdit(p)} title="Edit Product">
                        <Pencil size={16} />
                      </button>
                      <button type="button" className="icon-btn danger" onClick={() => setDeleteId(p.id)} title="Delete Product">
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
        <div className="modal-backdrop">
          <div className="modal-card wide">
            <h3>{editingId ? 'Edit Product Details' : 'Add New Retail Product'}</h3>
            <p className="muted small" style={{ marginBottom: 14 }}>
              Barcodes and SKUs must be unique. An official Code 128 barcode is automatically assigned if empty.
            </p>

            <div className="form-grid two">
              <Field label="Product Name *" error={errors.name}>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Basmati Rice 5 kg"
                  autoFocus
                />
              </Field>

              <Field label="Category *" error={errors.category}>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>

              <Field label="Brand / Manufacturer">
                <input
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  placeholder="e.g. Tata, Britannia, D-Mart Select"
                />
              </Field>

              <Field label="Unit of Measurement">
                <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </Field>

              <Field label="SKU (Stock Keeping Unit) *" error={errors.sku}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
                    placeholder="e.g. RIC-001"
                  />
                  <button type="button" className="btn btn-ghost" onClick={autoGenerateSku} title="Auto-generate SKU from name">
                    <RefreshCw size={14} /> Auto
                  </button>
                </div>
              </Field>

              <Field label="Unique Barcode *" error={errors.barcode}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    value={form.barcode}
                    onChange={(e) => setForm({ ...form, barcode: e.target.value.trim() })}
                    placeholder="e.g. 890100000001"
                  />
                  <button type="button" className="btn btn-ghost" onClick={autoGenerateBarcode} title="Generate new unique barcode">
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

              <Field label="Initial Available Quantity *" error={errors.quantity}>
                <input
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  placeholder="Units currently in stock"
                />
              </Field>

              <Field label="Minimum Alert Threshold *" error={errors.minStock}>
                <input
                  type="number"
                  min="0"
                  value={form.minStock}
                  onChange={(e) => setForm({ ...form, minStock: e.target.value })}
                  placeholder="Warning trigger quantity"
                />
              </Field>

              <Field label="Packed / Mfg Date">
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

              <Field label="Batch Number">
                <input
                  value={form.batchNo}
                  onChange={(e) => setForm({ ...form, batchNo: e.target.value })}
                  placeholder="e.g. BAT-2026-10"
                />
              </Field>

              <Field label="Product Status">
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="active">Active (Available for billing)</option>
                  <option value="inactive">Inactive (Hidden from POS)</option>
                </select>
              </Field>
            </div>

            <div className="modal-actions" style={{ marginTop: 20 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={save}>
                {editingId ? 'Update Product' : 'Save Product'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* View Product Details Modal */}
      {view ? (
        <div className="modal-backdrop" onClick={() => setView(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0 }}>{view.name}</h3>
                <span className="muted small">{view.category} · {view.brand}</span>
              </div>
              <StockBadge product={view} />
            </div>

            <dl className="detail-list" style={{ marginTop: 12 }}>
              <div><dt>Product ID</dt><dd><strong>{view.id}</strong></dd></div>
              <div><dt>SKU</dt><dd><strong>{view.sku}</strong></dd></div>
              <div><dt>Barcode</dt><dd><code>{view.barcode}</code></dd></div>
              <div><dt>Selling Price</dt><dd><strong>{formatINR(view.sellingPricePaise)}</strong></dd></div>
              <div><dt>Purchase Cost</dt><dd>{formatINR(view.purchasePricePaise)}</dd></div>
              <div>
                <dt>Gross Margin</dt>
                <dd className="text-success">
                  {view.purchasePricePaise > 0
                    ? `+${(((view.sellingPricePaise - view.purchasePricePaise) / view.purchasePricePaise) * 100).toFixed(1)}%`
                    : 'N/A'}
                </dd>
              </div>
              <div><dt>Available Stock</dt><dd><strong>{view.quantity} {view.unit}</strong></dd></div>
              <div><dt>Minimum Stock Threshold</dt><dd>{view.minStock} {view.unit}</dd></div>
              <div><dt>Stock Status</dt><dd>{stockStatusLabel(getStockStatus(view))}</dd></div>
              <div><dt>Product Status</dt><dd>{view.status === 'active' ? 'Active in POS' : 'Inactive'}</dd></div>
              <div><dt>Added Date</dt><dd>{formatDate(view.createdAt)}</dd></div>
            </dl>

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
