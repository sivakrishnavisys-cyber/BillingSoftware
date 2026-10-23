import { useMemo, useState } from 'react';
import { AlertCircle, AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2, Download, Package, RefreshCw, Warehouse } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import StatCard from '../components/StatCard';
import StockBadge from '../components/StockBadge';
import { useStore } from '../context/StoreContext';
import { applyStockChange, inventoryValuePaise, totalUnits } from '../services/inventoryService';
import { getStockStatus, searchProducts, stockStatusLabel } from '../services/productService';
import { formatINR } from '../utils/currencyUtils';
import { downloadTextFile, toCsv } from '../utils/csvUtils';
import { formatDateTime } from '../utils/dateUtils';

const COMMON_REASONS = [
  'Supplier shipment restock',
  'Damaged packaging / broken',
  'Expired product write-off',
  'Physical stock count audit',
  'Return to vendor',
  'Customer returned item',
  'Opening inventory adjustment',
];

export default function Inventory() {
  const { products, movements, update, showToast } = useStore();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [adjust, setAdjust] = useState(null);
  const [operationMode, setOperationMode] = useState('add'); // 'add', 'exact', 'reduce'
  const [qtyInput, setQtyInput] = useState('');
  const [reasonPreset, setReasonPreset] = useState(COMMON_REASONS[0]);
  const [customReason, setCustomReason] = useState('');

  const rows = useMemo(() => {
    let list = searchProducts(products, query);
    if (statusFilter !== 'all') {
      list = list.filter((p) => getStockStatus(p) === statusFilter);
    }
    return list;
  }, [products, query, statusFilter]);

  const lowStockProducts = products.filter((p) => getStockStatus(p) === 'low');
  const outOfStockProducts = products.filter((p) => getStockStatus(p) === 'out');
  const totalValuation = inventoryValuePaise(products);
  const totalStockUnits = totalUnits(products);

  const openAdjust = (product, defaultMode = 'add') => {
    setAdjust(product);
    setOperationMode(defaultMode);
    setQtyInput('');
    setCustomReason('');
    setReasonPreset(defaultMode === 'add' ? COMMON_REASONS[0] : COMMON_REASONS[1]);
  };

  const submitAdjust = () => {
    try {
      const num = Number(qtyInput);
      if (!Number.isFinite(num) || num < 0) {
        throw new Error('Please enter a valid positive number.');
      }

      let delta = 0;
      let opType = 'adjustment';
      const curQty = adjust.quantity;

      if (operationMode === 'add') {
        if (num <= 0) throw new Error('Quantity to add must be greater than zero.');
        delta = num;
        opType = 'stock-in';
      } else if (operationMode === 'reduce') {
        if (num <= 0) throw new Error('Quantity to reduce must be greater than zero.');
        if (num > curQty) {
          throw new Error(`Cannot reduce by ${num}. Only ${curQty} units are in stock.`);
        }
        delta = -num;
        opType = 'stock-out';
      } else if (operationMode === 'exact') {
        delta = num - curQty;
        if (delta === 0) {
          throw new Error('New quantity matches current stock. No change needed.');
        }
        opType = 'adjustment';
      }

      const finalReason = customReason.trim() || reasonPreset;

      update((prev) => applyStockChange(prev, {
        productId: adjust.id,
        changeQty: delta,
        type: opType,
        reason: finalReason,
      }));

      showToast(`Stock updated for ${adjust.name}. New stock: ${curQty + delta} ${adjust.unit}.`, 'success');
      setAdjust(null);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const exportInventoryCsv = () => {
    const csv = toCsv(products, [
      { label: 'Product Name', value: (p) => p.name },
      { label: 'SKU', value: (p) => p.sku },
      { label: 'Barcode', value: (p) => p.barcode },
      { label: 'Category', value: (p) => p.category },
      { label: 'Current Quantity', value: (p) => p.quantity },
      { label: 'Min Stock Threshold', value: (p) => p.minStock },
      { label: 'Unit', value: (p) => p.unit },
      { label: 'Stock Status', value: (p) => stockStatusLabel(getStockStatus(p)) },
      { label: 'Purchase Price (INR)', value: (p) => (p.purchasePricePaise / 100).toFixed(2) },
      { label: 'Selling Price (INR)', value: (p) => (p.sellingPricePaise / 100).toFixed(2) },
      { label: 'Total Stock Value (INR)', value: (p) => ((p.purchasePricePaise * p.quantity) / 100).toFixed(2) },
    ]);
    downloadTextFile(`inventory-report-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    showToast('Inventory report exported to CSV.', 'success');
  };

  return (
    <div className="inventory-page">
      <div className="page-head">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ margin: 0 }}>Inventory & Stock Management</h1>
            <span className="demo-pill">REAL-TIME AUDIT</span>
          </div>
          <p className="muted">
            Track current stock levels, perform stock-ins, record damaged/expired write-offs, and inspect stock movement audit trails.
          </p>
        </div>
        <div className="row-actions">
          <button type="button" className="btn btn-ghost" onClick={exportInventoryCsv}>
            <Download size={16} /> Export Stock CSV
          </button>
        </div>
      </div>

      <section className="stat-grid" style={{ marginBottom: 16 }}>
        <StatCard
          icon={Warehouse}
          label="Total Inventory Value"
          value={formatINR(totalValuation)}
          hint="Calculated at purchase cost"
          tone="blue"
        />
        <StatCard
          icon={Package}
          label="Total Stock Units"
          value={`${totalStockUnits} units`}
          hint={`Across ${products.length} products`}
        />
        <StatCard
          icon={AlertTriangle}
          label="Low Stock Warnings"
          value={lowStockProducts.length}
          hint="At or below minimum limit"
          tone={lowStockProducts.length ? 'orange' : undefined}
        />
        <StatCard
          icon={AlertCircle}
          label="Out of Stock Items"
          value={outOfStockProducts.length}
          hint="Requires immediate replenishment"
          tone={outOfStockProducts.length ? 'red' : undefined}
        />
      </section>

      {/* Critical Stock Alerts Banner */}
      {lowStockProducts.concat(outOfStockProducts).length > 0 ? (
        <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid var(--orange)' }}>
          <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 6, margin: '0 0 8px' }}>
            <AlertTriangle size={18} color="var(--orange)" />
            Stock Replenishment Alerts ({lowStockProducts.concat(outOfStockProducts).length})
          </h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {outOfStockProducts.map((p) => (
              <button
                type="button"
                key={p.id}
                className="chip"
                style={{ borderColor: 'var(--red)', color: 'var(--red)', background: '#fdecec' }}
                onClick={() => openAdjust(p, 'add')}
              >
                + Restock {p.name} (0 left)
              </button>
            ))}
            {lowStockProducts.map((p) => (
              <button
                type="button"
                key={p.id}
                className="chip"
                style={{ borderColor: 'var(--orange)', color: '#9a3412', background: '#fff4e8' }}
                onClick={() => openAdjust(p, 'add')}
              >
                + Restock {p.name} ({p.quantity} left)
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="filter-bar card">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search inventory by product name, SKU, or barcode"
          style={{ minWidth: '240px' }}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Stock Statuses</option>
          <option value="in">In Stock Only</option>
          <option value="low">Low Stock Only</option>
          <option value="out">Out of Stock Only</option>
        </select>
      </div>

      {/* Desktop Table View */}
      <div className="table-wrap card desktop-table-view" style={{ marginBottom: 20 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Product Details</th>
              <th>SKU / Barcode</th>
              <th>Available Qty</th>
              <th>Min Limit</th>
              <th>Stock Status</th>
              <th>Cost / Selling</th>
              <th>Total Stock Value</th>
              <th style={{ textAlign: 'right' }}>Stock Operations</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const val = p.purchasePricePaise * p.quantity;
              return (
                <tr key={p.id}>
                  <td>
                    <strong>{p.name}</strong>
                    <div className="muted tiny">{p.category} · {p.brand}</div>
                  </td>
                  <td>
                    <div>{p.sku}</div>
                    <div className="muted tiny">{p.barcode}</div>
                  </td>
                  <td>
                    <strong>{p.quantity}</strong> {p.unit}
                  </td>
                  <td>{p.minStock} {p.unit}</td>
                  <td><StockBadge product={p} /></td>
                  <td>
                    <div>Buy: {formatINR(p.purchasePricePaise)}</div>
                    <div className="muted tiny">Sell: {formatINR(p.sellingPricePaise)}</div>
                  </td>
                  <td>
                    <strong>{formatINR(val)}</strong>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => openAdjust(p, 'add')}
                        title="Stock-in / Receive inventory"
                      >
                        <ArrowUpRight size={14} color="var(--green)" /> + Stock In
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => openAdjust(p, 'reduce')}
                        title="Write-off damaged / expired items"
                      >
                        <ArrowDownRight size={14} color="var(--red)" /> - Reduce
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => openAdjust(p, 'exact')}
                        title="Manual count adjustment"
                      >
                        <RefreshCw size={14} /> Audit
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Touch-Friendly Inventory Cards */}
      <div className="mobile-cards-view" style={{ marginBottom: 20 }}>
        {rows.map((p) => {
          const val = p.purchasePricePaise * p.quantity;
          return (
            <div key={p.id} className="mobile-entity-card card">
              <div className="card-top-row">
                <div>
                  <strong className="entity-title">{p.name}</strong>
                  <div className="muted tiny">{p.category} · {p.brand || 'Unbranded'}</div>
                </div>
                <StockBadge product={p} />
              </div>

              <div className="card-detail-grid">
                <div>
                  <span className="tiny muted">Current Stock</span>
                  <div className="card-stock-val">
                    <strong>{p.quantity}</strong> <span className="tiny">{p.unit}</span>
                  </div>
                  <span className="tiny muted">Min alert: {p.minStock} {p.unit}</span>
                </div>
                <div>
                  <span className="tiny muted">Inventory Valuation</span>
                  <div className="card-highlight-val">{formatINR(val)}</div>
                  <span className="tiny muted">Buy: {formatINR(p.purchasePricePaise)}</span>
                </div>
              </div>

              <div className="card-footer-row" style={{ flexDirection: 'column', gap: 8, alignItems: 'stretch' }}>
                <span className="tiny muted">SKU: <strong>{p.sku}</strong> · {p.barcode}</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--green)', borderColor: 'var(--green-border)', justifyContent: 'center' }}
                    onClick={() => openAdjust(p, 'add')}
                  >
                    <ArrowUpRight size={14} /> + In
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--red)', borderColor: 'var(--red-border)', justifyContent: 'center' }}
                    onClick={() => openAdjust(p, 'reduce')}
                  >
                    <ArrowDownRight size={14} /> - Out
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ justifyContent: 'center' }}
                    onClick={() => openAdjust(p, 'exact')}
                  >
                    <RefreshCw size={14} /> Audit
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stock Movement Audit Log */}
      <article className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h2 style={{ margin: 0 }}>Stock Movement Audit Log</h2>
            <p className="muted small">Every sale checkout, stock-in receipt, and manual audit creates an immutable entry.</p>
          </div>
          <span className="demo-pill">{movements.length} EVENTS</span>
        </div>

        {movements.length === 0 ? (
          <EmptyState title="No movements recorded yet" message="Completed bills and inventory adjustments will be logged here." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Product</th>
                  <th>Transaction Type</th>
                  <th>Quantity Delta</th>
                  <th>Quantity Audit</th>
                  <th>Reason / Reference</th>
                </tr>
              </thead>
              <tbody>
                {movements.slice(0, 50).map((m) => (
                  <tr key={m.id}>
                    <td>{formatDateTime(m.date)}</td>
                    <td><strong>{m.productName}</strong></td>
                    <td>
                      <span className={`badge ${m.type === 'sale' ? 'badge-low' : m.changeQty > 0 ? 'badge-in' : 'badge-out'}`}>
                        {m.type.toUpperCase()}{m.invoiceNumber ? ` #${m.invoiceNumber}` : ''}
                      </span>
                    </td>
                    <td>
                      <strong className={m.changeQty < 0 ? 'text-danger' : 'text-success'}>
                        {m.changeQty > 0 ? `+${m.changeQty}` : m.changeQty}
                      </strong>
                    </td>
                    <td>
                      <span className="muted">{m.previousQty}</span> → <strong>{m.newQty}</strong>
                    </td>
                    <td>{m.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {/* Stock Adjustment Modal */}
      {adjust ? (
        <div className="modal-backdrop" onClick={() => setAdjust(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Adjust Stock — {adjust.name}</h3>
            <p className="muted small">
              Current Available Quantity: <strong>{adjust.quantity} {adjust.unit}</strong> (Min Threshold: {adjust.minStock})
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, margin: '14px 0' }}>
              <button
                type="button"
                className={`btn btn-ghost ${operationMode === 'add' ? 'btn-primary' : ''}`}
                onClick={() => setOperationMode('add')}
              >
                + Stock In
              </button>
              <button
                type="button"
                className={`btn btn-ghost ${operationMode === 'reduce' ? 'btn-danger' : ''}`}
                onClick={() => setOperationMode('reduce')}
              >
                - Reduce
              </button>
              <button
                type="button"
                className={`btn btn-ghost ${operationMode === 'exact' ? 'btn-primary' : ''}`}
                onClick={() => setOperationMode('exact')}
              >
                Set Exact Qty
              </button>
            </div>

            <label className="field" style={{ marginBottom: 12 }}>
              <span>
                {operationMode === 'add' && 'Quantity to Add (Receive):'}
                {operationMode === 'reduce' && 'Quantity to Reduce (Write-off):'}
                {operationMode === 'exact' && 'New Total Quantity Counted:'}
              </span>
              <input
                type="number"
                min="0"
                value={qtyInput}
                onChange={(e) => setQtyInput(e.target.value)}
                placeholder="Enter unit count..."
                autoFocus
              />
            </label>

            <label className="field" style={{ marginBottom: 12 }}>
              <span>Standard Reason:</span>
              <select value={reasonPreset} onChange={(e) => setReasonPreset(e.target.value)}>
                {COMMON_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>

            <label className="field" style={{ marginBottom: 12 }}>
              <span>Custom Remark / Invoice Ref (Optional):</span>
              <input
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="e.g. Supplier PO #9821 or batch check"
              />
            </label>

            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setAdjust(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={submitAdjust}>
                Save Stock Change
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
