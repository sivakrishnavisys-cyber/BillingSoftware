import { useMemo, useState } from 'react';
import { Barcode, CheckSquare, Copy, Eye, Grid, Printer, Square } from 'lucide-react';
import BarcodeLabel from '../components/BarcodeLabel';
import PrintStage from '../components/PrintStage';
import { useStore } from '../context/StoreContext';
import { CATEGORIES } from '../data/demoData';
import { searchProducts } from '../services/productService';

const SIZES = [
  { id: '50x30', label: '50 × 30 mm (Standard Shelf / Pack)' },
  { id: '40x30', label: '40 × 30 mm (Medium Box)' },
  { id: '38x25', label: '38 × 25 mm (Small Item / Cosmetics)' },
];

export default function BarcodeGenerator() {
  const { products, settings, update } = useStore();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selected, setSelected] = useState([]);
  const [copies, setCopies] = useState(1);
  const [size, setSize] = useState(settings.labelSize || '50x30');
  const [sheet, setSheet] = useState('labels');
  const [printOpen, setPrintOpen] = useState(false);
  const [packedDate, setPackedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expiryOverride, setExpiryOverride] = useState('');

  const list = useMemo(() => {
    let res = searchProducts(products, query);
    if (selectedCategory !== 'all') {
      res = res.filter((p) => p.category === selectedCategory);
    }
    return res;
  }, [products, query, selectedCategory]);

  const chosen = products.filter((p) => selected.includes(p.id));

  const toggle = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAllVisible = () => {
    const ids = list.map((p) => p.id);
    setSelected((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const clearSelection = () => {
    setSelected([]);
  };

  const printNow = (mode) => {
    setSheet(mode);
    update((s) => ({ ...s, settings: { ...s.settings, labelSize: size } }));
    setPrintOpen(true);
  };

  // Build the print items including copies
  const printItems = useMemo(() => {
    const numCopies = Math.max(1, Math.min(100, Number(copies) || 1));
    const items = [];
    chosen.forEach((p) => {
      for (let i = 0; i < numCopies; i++) {
        items.push(p);
      }
    });
    return items;
  }, [chosen, copies]);

  return (
    <div className="barcode-page">
      <div className="page-head">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ margin: 0 }}>Barcode Generator & Label Printing</h1>
            <span className="demo-pill">CODE 128</span>
          </div>
          <p className="muted">
            Render crisp, scannable Code 128 barcodes for retail products. Print individual tags, bulk batches, or standard A4 sticker sheets.
          </p>
        </div>
      </div>

      <div className="filter-bar card">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products by name, SKU, or barcode"
          style={{ minWidth: '220px' }}
        />

        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
          <option value="all">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select value={size} onChange={(e) => setSize(e.target.value)}>
          {SIZES.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="small muted">Copies:</span>
          <input
            type="number"
            min="1"
            max="100"
            value={copies}
            onChange={(e) => setCopies(e.target.value)}
            style={{ width: '65px', padding: '8px' }}
            title="Number of copies per selected product"
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="small muted">Packed Date:</span>
          <input
            type="date"
            value={packedDate}
            onChange={(e) => setPackedDate(e.target.value)}
            style={{ padding: '6px 8px', fontSize: '0.82rem' }}
            title="Packed / Mfg date printed on barcode sticker"
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="small muted">Override Exp:</span>
          <input
            type="date"
            value={expiryOverride}
            onChange={(e) => setExpiryOverride(e.target.value)}
            style={{ padding: '6px 8px', fontSize: '0.82rem' }}
            title="Override expiry date (leave empty to use product expiry)"
          />
        </div>

        <button type="button" className="btn btn-ghost" onClick={selectAllVisible}>
          <CheckSquare size={16} /> Select All ({list.length})
        </button>

        <button type="button" className="btn btn-ghost" onClick={clearSelection} disabled={!selected.length}>
          <Square size={16} /> Clear ({selected.length})
        </button>

        <button
          type="button"
          className="btn btn-primary"
          disabled={!chosen.length}
          onClick={() => printNow('labels')}
        >
          <Printer size={16} /> Print Selected ({chosen.length * (Number(copies) || 1)} labels)
        </button>

        <button
          type="button"
          className="btn btn-ghost"
          disabled={!chosen.length}
          onClick={() => printNow('a4')}
        >
          <Grid size={16} /> A4 Sheet Grid
        </button>
      </div>

      <div className="selection-status-bar">
        <span>
          Showing <strong>{list.length}</strong> products · <strong>{chosen.length}</strong> selected ({chosen.length * (Number(copies) || 1)} labels total)
        </span>
        <span className="muted small">Click any label card to select/unselect for printing</span>
      </div>

      <div className="label-gallery">
        {list.map((p) => {
          const isSelected = selected.includes(p.id);
          return (
            <div
              key={p.id}
              className={`label-pick ${isSelected ? 'selected' : ''}`}
              onClick={() => toggle(p.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') toggle(p.id);
              }}
            >
              <div className="label-checkbox-indicator">
                {isSelected ? <CheckSquare size={18} color="var(--blue)" /> : <Square size={18} color="#94a3b8" />}
              </div>
              <BarcodeLabel
                product={p}
                size={size}
                customPackedDate={packedDate}
                customExpiryDate={expiryOverride}
              />
            </div>
          );
        })}
      </div>

      <PrintStage
        open={printOpen}
        title={`Barcode Print Preview — ${printItems.length} Labels`}
        extraClass={sheet === 'a4' ? 'a4-labels' : 'label-print'}
        onClose={() => setPrintOpen(false)}
      >
        <div className="no-print receipt-toolbar-row" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="small muted">Sheet Mode:</span>
            <button
              type="button"
              className={`btn btn-ghost ${sheet === 'labels' ? 'btn-primary' : ''}`}
              onClick={() => setSheet('labels')}
            >
              Continuous / Roll
            </button>
            <button
              type="button"
              className={`btn btn-ghost ${sheet === 'a4' ? 'btn-primary' : ''}`}
              onClick={() => setSheet('a4')}
            >
              A4 Sticker Sheet (Grid)
            </button>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => window.print()}>
            <Printer size={16} /> Print {printItems.length} Barcodes
          </button>
        </div>

        <div className={`label-print-grid size-${size} sheet-${sheet}`}>
          {printItems.map((p, idx) => (
            <BarcodeLabel
              key={`${p.id}-${idx}`}
              product={p}
              size={size}
              customPackedDate={packedDate}
              customExpiryDate={expiryOverride}
            />
          ))}
        </div>
      </PrintStage>
    </div>
  );
}
