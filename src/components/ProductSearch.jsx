import { Search } from 'lucide-react';
import { formatINR } from '../utils/currencyUtils';
import { getStockStatus } from '../services/productService';

export default function ProductSearch({
  query,
  onQueryChange,
  products,
  onPick,
  placeholder = 'Search name, SKU, or barcode',
}) {
  return (
    <div className="product-search">
      <label className="field">
        <span>Find a product</span>
        <div className="input-with-icon">
          <Search size={18} />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={placeholder}
            autoComplete="off"
          />
        </div>
      </label>
      {query.trim() ? (
        <div className="search-results">
          {products.length === 0 ? (
            <p className="muted">No matching products.</p>
          ) : products.slice(0, 12).map((p) => {
            const status = getStockStatus(p);
            return (
              <button
                type="button"
                key={p.id}
                className="search-hit"
                onClick={() => onPick(p)}
                disabled={status === 'out'}
              >
                <span>
                  <strong>{p.name}</strong>
                  <small>{p.sku} · {p.barcode}</small>
                </span>
                <span className="search-hit-right">
                  <b>{formatINR(p.sellingPricePaise)}</b>
                  <small className={`stock-text stock-${status}`}>{p.quantity} {p.unit}</small>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
