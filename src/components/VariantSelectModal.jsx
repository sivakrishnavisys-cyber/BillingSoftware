import { useEffect } from 'react';
import { Check, Layers, Package, Tag, X } from 'lucide-react';
import { formatINR } from '../utils/currencyUtils';

export default function VariantSelectModal({
  open,
  product,
  onSelectVariant,
  onClose,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      // Numeric shortcuts: Press 1 for 1st variant, 2 for 2nd, etc.
      const num = parseInt(e.key, 10);
      if (num >= 1 && product?.variants && num <= product.variants.length) {
        onSelectVariant(product.variants[num - 1]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, product, onSelectVariant, onClose]);

  if (!open || !product) return null;

  const variants = product.variants || [];

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="variant-modal-title"
    >
      <div
        className="modal-card variant-select-card animate-popIn"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(500px, 94vw)' }}
      >
        <div className="modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="icon-badge primary" style={{ width: 36, height: 36 }}>
              <Layers size={18} />
            </div>
            <div>
              <h2 id="variant-modal-title" style={{ margin: 0, fontSize: '1.15rem' }}>
                Select Variant
              </h2>
              <div className="muted small">
                {product.name} • {product.brand || product.category}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Close variant selector"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '16px 20px' }}>
          <div
            style={{
              fontSize: '0.82rem',
              color: 'var(--muted)',
              marginBottom: 12,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>Choose a size or variant to add to bill:</span>
            <span className="badge badge-in">{variants.length} Options</span>
          </div>

          <div className="variant-options-list" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {variants.map((v, idx) => {
              const isOutOfStock = v.quantity <= 0;
              return (
                <div
                  key={v.id || idx}
                  className={`variant-select-item ${isOutOfStock ? 'disabled' : ''}`}
                  onClick={() => {
                    if (!isOutOfStock) {
                      onSelectVariant(v);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      if (!isOutOfStock) onSelectVariant(v);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: '1.5px solid var(--border)',
                    background: 'var(--surface-sunken)',
                    cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                    opacity: isOutOfStock ? 0.6 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 6,
                        background: 'var(--blue-light)',
                        color: 'var(--blue)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                      }}
                    >
                      {idx + 1}
                    </span>

                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text)' }}>
                        {v.name}
                      </div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--muted)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          marginTop: 2,
                        }}
                      >
                        <Tag size={12} />
                        <span>Barcode: <code>{v.barcode || 'N/A'}</code></span>
                        <span>•</span>
                        <span>Stock: {v.quantity} {v.unit || product.unit}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontSize: '1.15rem',
                        fontWeight: 800,
                        color: 'var(--blue)',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {formatINR(v.sellingPricePaise)}
                    </div>
                    {isOutOfStock ? (
                      <span className="badge badge-out" style={{ fontSize: '0.7rem' }}>
                        Out of stock
                      </span>
                    ) : (
                      <span className="badge badge-in" style={{ fontSize: '0.7rem' }}>
                        In stock
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="modal-foot" style={{ justifyContent: 'space-between' }}>
          <div className="muted tiny">Tip: Press keys 1, 2, 3... to select quickly</div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
