import { useMemo, useState } from 'react';
import {
  Barcode,
  Calendar,
  Check,
  CheckSquare,
  Copy,
  Download,
  Eye,
  Filter,
  Grid,
  Layers,
  Minus,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Sliders,
  Square,
  Store,
  Tag,
  X,
} from 'lucide-react';
import BarcodeLabel from '../components/BarcodeLabel';
import PrintStage from '../components/PrintStage';
import { useStore } from '../context/StoreContext';
import { searchProducts } from '../services/productService';

const SIZES = [
  { id: '50x30', label: '50 × 30 mm (Standard Shelf / Pack)', desc: 'Retail Shelf Edge & Polybags' },
  { id: '40x30', label: '40 × 30 mm (Medium Box)', desc: 'Cartons & Grocery Boxes' },
  { id: '38x25', label: '38 × 25 mm (Small Item / Cosmetics)', desc: 'Chocolates & Cosmetics' },
];

export default function BarcodeGenerator() {
  const { products, categories = [], shop, settings, update, showToast } = useStore();

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selected, setSelected] = useState([]);
  const [globalCopies, setGlobalCopies] = useState(1);
  const [itemCopies, setItemCopies] = useState({}); // { [productId]: number }
  const [size, setSize] = useState(settings.labelSize || '50x30');
  const [sheet, setSheet] = useState('labels'); // 'labels' or 'a4'
  const [printOpen, setPrintOpen] = useState(false);
  const [showStoreHeader, setShowStoreHeader] = useState(true);
  const [packedDate, setPackedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expiryOverride, setExpiryOverride] = useState('');

  // Single label quick preview / print
  const [singlePrintProduct, setSinglePrintProduct] = useState(null);

  // Filter products list
  const list = useMemo(() => {
    let res = searchProducts(products, query);
    if (selectedCategory !== 'all') {
      res = res.filter((p) => p.category === selectedCategory);
    }
    return res;
  }, [products, query, selectedCategory]);

  const chosen = useMemo(
    () => products.filter((p) => selected.includes(p.id)),
    [products, selected]
  );

  const toggle = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllVisible = () => {
    const ids = list.map((p) => p.id);
    setSelected((prev) => Array.from(new Set([...prev, ...ids])));
    showToast(`Selected all ${ids.length} visible items.`, 'info');
  };

  const clearSelection = () => {
    setSelected([]);
    showToast('Cleared label selections.', 'info');
  };

  // Set quantity for a specific product card
  const setCopiesForProduct = (productId, delta) => {
    setItemCopies((prev) => {
      const current = prev[productId] !== undefined ? prev[productId] : globalCopies;
      const next = Math.max(1, Math.min(100, current + delta));
      return { ...prev, [productId]: next };
    });
  };

  const getProductCopies = (productId) => {
    return itemCopies[productId] !== undefined ? itemCopies[productId] : globalCopies;
  };

  // Calculate total labels to print
  const totalLabelsCount = useMemo(() => {
    return chosen.reduce((sum, p) => sum + getProductCopies(p.id), 0);
  }, [chosen, itemCopies, globalCopies]);

  // Build the print items array including copies
  const printItems = useMemo(() => {
    if (singlePrintProduct) {
      const qty = getProductCopies(singlePrintProduct.id);
      const items = [];
      for (let i = 0; i < qty; i++) {
        items.push(singlePrintProduct);
      }
      return items;
    }

    const items = [];
    chosen.forEach((p) => {
      const count = getProductCopies(p.id);
      for (let i = 0; i < count; i++) {
        items.push(p);
      }
    });
    return items;
  }, [chosen, singlePrintProduct, itemCopies, globalCopies]);

  const printNow = (mode) => {
    if (!chosen.length && !singlePrintProduct) {
      showToast('Select at least one product label to print.', 'error');
      return;
    }
    setSheet(mode);
    setPrintOpen(true);
  };

  const quickPrintSingle = (e, product) => {
    e.stopPropagation();
    setSinglePrintProduct(product);
    setSheet('labels');
    setPrintOpen(true);
  };

  return (
    <div className="barcode-studio-page">
      {/* Studio Page Header */}
      <div className="page-head">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ margin: 0 }}>Retail Barcode Studio & Label Printing</h1>
            <span className="demo-pill">CODE 128 HIGH DENSITY</span>
          </div>
          <p className="muted">
            Generate crisp Code 128 retail barcodes, shelf edge price tags, and standard A4 24-up sticker sheets.
          </p>
        </div>

        <div className="head-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              selectAllVisible();
              printNow('a4');
            }}
            title="Batch print all visible items on standard A4 sticker sheet"
          >
            <Grid size={16} /> <span>Print Full Sheet</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            disabled={!chosen.length}
            onClick={() => {
              setSinglePrintProduct(null);
              printNow('labels');
            }}
          >
            <Printer size={16} /> <span>Print Selected ({totalLabelsCount})</span>
          </button>
        </div>
      </div>

      {/* Studio Master Control Card */}
      <div className="card barcode-control-panel">
        {/* Row 1: Search, Category & Label Template Dimension */}
        <div className="control-row primary-controls">
          <div className="control-input-group search-group">
            <Search size={16} className="control-icon" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by product name, SKU, or scannable barcode..."
              className="control-input"
            />
            {query ? (
              <button
                type="button"
                className="icon-btn-micro"
                onClick={() => setQuery('')}
                aria-label="Clear query"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>

          <div className="control-input-group select-group">
            <Filter size={15} className="control-icon" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="control-select"
            >
              <option value="all">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="control-input-group template-group">
            <Tag size={15} className="control-icon" />
            <select
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="control-select"
            >
              {SIZES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Sticker Customization (Copies, Dates, Header Branding) */}
        <div className="control-row secondary-controls">
          <div className="control-pill-box">
            <span className="control-label">Batch Copies:</span>
            <div className="stepper-mini">
              <button
                type="button"
                onClick={() => setGlobalCopies((prev) => Math.max(1, prev - 1))}
                aria-label="Decrease copies"
              >
                <Minus size={13} />
              </button>
              <input
                type="number"
                min="1"
                max="100"
                value={globalCopies}
                onChange={(e) => setGlobalCopies(Math.max(1, Number(e.target.value) || 1))}
              />
              <button
                type="button"
                onClick={() => setGlobalCopies((prev) => Math.min(100, prev + 1))}
                aria-label="Increase copies"
              >
                <Plus size={13} />
              </button>
            </div>
          </div>

          <div className="control-pill-box">
            <Calendar size={14} color="var(--blue)" />
            <span className="control-label">Packed Date:</span>
            <input
              type="date"
              value={packedDate}
              onChange={(e) => setPackedDate(e.target.value)}
              className="date-pill-input"
            />
            <button
              type="button"
              className="btn-link tiny"
              onClick={() => setPackedDate(new Date().toISOString().slice(0, 10))}
              title="Set to today"
            >
              Today
            </button>
          </div>

          <div className="control-pill-box">
            <Calendar size={14} color="#f59e0b" />
            <span className="control-label">Expiry Override:</span>
            <input
              type="date"
              value={expiryOverride}
              onChange={(e) => setExpiryOverride(e.target.value)}
              className="date-pill-input"
              placeholder="Product Expiry"
            />
            {expiryOverride ? (
              <button
                type="button"
                className="btn-link tiny text-danger"
                onClick={() => setExpiryOverride('')}
                title="Use product default expiry"
              >
                Reset
              </button>
            ) : null}
          </div>

          <label className="control-checkbox-box">
            <input
              type="checkbox"
              checked={showStoreHeader}
              onChange={(e) => setShowStoreHeader(e.target.checked)}
            />
            <Store size={14} color="var(--blue)" />
            <span className="control-label">Store Branding Header</span>
          </label>
        </div>

        {/* Row 3: Selection Triggers & Action Buttons */}
        <div className="control-row action-row">
          <div className="selection-buttons-group">
            <button
              type="button"
              className="btn btn-ghost btn-sm control-btn"
              onClick={selectAllVisible}
            >
              <CheckSquare size={15} /> Select Visible ({list.length})
            </button>

            <button
              type="button"
              className="btn btn-ghost btn-sm control-btn"
              onClick={clearSelection}
              disabled={!selected.length}
            >
              <Square size={15} /> Clear ({selected.length})
            </button>

            <div className="selection-badge-info">
              <span>Selected: <strong>{chosen.length}</strong> items</span>
              <span>•</span>
              <span className="badge badge-in"><strong>{totalLabelsCount}</strong> Stickers Total</span>
            </div>
          </div>

          <div className="print-buttons-group">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={!chosen.length}
              onClick={() => {
                setSinglePrintProduct(null);
                printNow('a4');
              }}
              title="Preview standard A4 sticker sheet grid (24 labels per sheet)"
            >
              <Grid size={15} /> A4 Sheet Grid
            </button>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={!chosen.length}
              onClick={() => {
                setSinglePrintProduct(null);
                printNow('labels');
              }}
            >
              <Printer size={15} /> Print {totalLabelsCount} Stickers
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Realistic Commercial Retail Sticker Cards */}
      <div className="retail-stickers-grid">
        {list.map((p) => {
          const isSelected = selected.includes(p.id);
          const copiesForThisItem = getProductCopies(p.id);

          return (
            <div
              key={p.id}
              className={`sticker-card-container ${isSelected ? 'is-selected' : ''}`}
              onClick={() => toggle(p.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') toggle(p.id);
              }}
              title={isSelected ? 'Click to deselect label' : 'Click to select label'}
            >
              {/* Sticker Selector Badge */}
              <div className={`sticker-select-badge ${isSelected ? 'active' : ''}`}>
                {isSelected ? (
                  <CheckSquare size={18} color="#2563eb" />
                ) : (
                  <Square size={18} color="#94a3b8" />
                )}
              </div>

              {/* The Actual Sticker Label */}
              <div className="sticker-label-inner-wrapper">
                <BarcodeLabel
                  product={p}
                  size={size}
                  customPackedDate={packedDate}
                  customExpiryDate={expiryOverride}
                  shopName={shop.name}
                  showStoreHeader={showStoreHeader}
                />
              </div>

              {/* Bottom Card Controls: Quantity Multiplier & 1-Click Quick Print */}
              <div
                className="sticker-card-bottom-bar"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sticker-qty-stepper">
                  <span className="qty-label">Qty:</span>
                  <button
                    type="button"
                    onClick={() => setCopiesForProduct(p.id, -1)}
                    title="Decrease label copies for this product"
                  >
                    <Minus size={11} />
                  </button>
                  <span className="qty-num">{copiesForThisItem}</span>
                  <button
                    type="button"
                    onClick={() => setCopiesForProduct(p.id, +1)}
                    title="Increase label copies for this product"
                  >
                    <Plus size={11} />
                  </button>
                </div>

                <button
                  type="button"
                  className="quick-print-single-btn"
                  onClick={(e) => quickPrintSingle(e, p)}
                  title={`1-Click Print ${copiesForThisItem} sticker(s) for ${p.name}`}
                >
                  <Printer size={13} />
                  <span>Print</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Print Preview Stage */}
      <PrintStage
        open={printOpen}
        title={`Barcode Print Preview — ${printItems.length} Stickers`}
        extraClass={sheet === 'a4' ? 'a4-labels-stage' : 'thermal-roll-stage'}
        onClose={() => {
          setPrintOpen(false);
          setSinglePrintProduct(null);
        }}
      >
        <div className="no-print receipt-toolbar-row" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="small muted">Print Mode:</span>
            <button
              type="button"
              className={`btn btn-ghost btn-sm ${sheet === 'labels' ? 'btn-primary' : ''}`}
              onClick={() => setSheet('labels')}
            >
              Continuous Thermal Roll
            </button>
            <button
              type="button"
              className={`btn btn-ghost btn-sm ${sheet === 'a4' ? 'btn-primary' : ''}`}
              onClick={() => setSheet('a4')}
            >
              <Grid size={14} /> A4 Sheet Grid (3 × 8)
            </button>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span className="small muted">
              Total Labels: <strong>{printItems.length}</strong>
            </span>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => window.print()}
            >
              <Printer size={16} /> Print Now ({printItems.length})
            </button>
          </div>
        </div>

        {/* Printable Barcode Stickers Grid */}
        <div className={`printable-stickers-container size-${size} mode-${sheet}`}>
          {printItems.map((p, idx) => (
            <div key={`${p.id}-${idx}`} className="printable-sticker-wrapper">
              <BarcodeLabel
                product={p}
                size={size}
                customPackedDate={packedDate}
                customExpiryDate={expiryOverride}
                shopName={shop.name}
                showStoreHeader={showStoreHeader}
              />
            </div>
          ))}
        </div>
      </PrintStage>
    </div>
  );
}
