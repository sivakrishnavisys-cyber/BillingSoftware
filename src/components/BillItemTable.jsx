import { Minus, Plus, Trash2, Tag } from 'lucide-react';
import { formatINR } from '../utils/currencyUtils';
import { lineNetPaise } from '../services/billingService';

export default function BillItemTable({ items, onQty, onRemove, onDiscount }) {
  if (!items.length) {
    return (
      <div className="bill-empty">
        <p>No items yet.</p>
        <p className="muted">Scan a barcode, type a code, or search and tap a product.</p>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="data-table bill-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Price</th>
            <th>Qty</th>
            <th>Discount</th>
            <th>Line total</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const rowKey = item.lineKey || (item.variantId ? `${item.productId}__${item.variantId}` : item.productId);
            return (
              <tr key={rowKey}>
                <td>
                  <strong>{item.name}</strong>
                  <div className="muted small" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {item.variantName ? (
                      <span className="badge badge-in" style={{ fontSize: '0.68rem', padding: '1px 5px' }}>
                        {item.variantName}
                      </span>
                    ) : null}
                    <span>{item.sku} · {item.barcode}</span>
                  </div>
                </td>
                <td>{formatINR(item.unitPricePaise)}</td>
                <td>
                  <div className="qty-stepper">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      onClick={() => onQty(rowKey, item.qty - 1)}
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      value={item.qty}
                      onChange={(e) => onQty(rowKey, e.target.value)}
                      inputMode="numeric"
                      aria-label={`Quantity for ${item.name}`}
                    />
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      onClick={() => onQty(rowKey, item.qty + 1)}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </td>
                <td>
                  <input
                    className="discount-input"
                    value={item.discountPaise ? (item.discountPaise / 100).toFixed(2) : ''}
                    placeholder="0.00"
                    onChange={(e) => onDiscount(rowKey, e.target.value)}
                    aria-label={`Discount for ${item.name} in rupees`}
                  />
                </td>
                <td><strong>{formatINR(lineNetPaise(item))}</strong></td>
                <td>
                  <button
                    type="button"
                    className="icon-btn danger"
                    onClick={() => onRemove(rowKey)}
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
