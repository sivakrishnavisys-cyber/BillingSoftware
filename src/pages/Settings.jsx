import { useState } from 'react';
import { Download, RotateCcw, Save, Store, Upload } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import { useStore } from '../context/StoreContext';
import { downloadTextFile } from '../utils/csvUtils';

export default function Settings() {
  const { state, update, resetDemo, showToast } = useStore();
  const [shop, setShop] = useState(state.shop);
  const [settings, setSettings] = useState(state.settings);
  const [resetOpen, setResetOpen] = useState(false);

  const save = () => {
    const gstRate = Number(settings.gstRate);
    if (settings.gstEnabled && (!Number.isFinite(gstRate) || gstRate < 0 || gstRate > 40)) {
      showToast('GST rate must be a valid percentage between 0 and 40.', 'error');
      return;
    }
    update((prev) => ({ ...prev, shop, settings: { ...settings, gstRate } }));
    showToast('Shop and POS settings saved successfully.', 'success');
  };

  const backupData = () => {
    const jsonStr = JSON.stringify(state, null, 2);
    downloadTextFile(`pos-system-backup-${new Date().toISOString().slice(0, 10)}.json`, jsonStr);
    showToast('System backup JSON downloaded.', 'success');
  };

  const restoreData = async (file) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed.products || !Array.isArray(parsed.products) || !parsed.shop) {
        throw new Error('Invalid backup file structure.');
      }
      update(() => parsed);
      setShop(parsed.shop);
      setSettings(parsed.settings || settings);
      showToast('System data successfully restored from backup JSON.', 'success');
    } catch {
      showToast('Failed to restore. Please supply a valid POS backup JSON file.', 'error');
    }
  };

  return (
    <div className="settings-page">
      <div className="page-head">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ margin: 0 }}>System Settings & Shop Profile</h1>
            <span className="demo-pill">CONFIG</span>
          </div>
          <p className="muted">
            Configure supermarket shop details, tax/GST rates, receipt formats, and backup demo state.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={save}>
          <Save size={16} /> Save All Settings
        </button>
      </div>

      <article className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Store size={20} color="var(--blue)" />
          <h2 style={{ margin: 0 }}>Shop & Branding Profile</h2>
        </div>
        <p className="muted small" style={{ marginBottom: 14 }}>
          These details are automatically printed on customer receipts (both 80mm thermal and A4 tax invoices).
        </p>

        <div className="form-grid two">
          <label className="field">
            <span>Shop Name *</span>
            <input
              value={shop.name}
              onChange={(e) => setShop({ ...shop, name: e.target.value })}
              placeholder="e.g. DMart Ready / Nani Super Mart"
            />
          </label>

          <label className="field">
            <span>Customer Support Phone *</span>
            <input
              value={shop.phone}
              onChange={(e) => setShop({ ...shop, phone: e.target.value })}
              placeholder="e.g. +91 98765 43210"
            />
          </label>

          <label className="field">
            <span>Official Email Address</span>
            <input
              value={shop.email}
              onChange={(e) => setShop({ ...shop, email: e.target.value })}
              placeholder="e.g. support@nanisupermart.com"
            />
          </label>

          <label className="field">
            <span>GSTIN / Tax ID Number</span>
            <input
              value={shop.gstin}
              onChange={(e) => setShop({ ...shop, gstin: e.target.value.toUpperCase() })}
              placeholder="e.g. 36AABCU9603R1ZX"
            />
          </label>

          <label className="field" style={{ gridColumn: '1 / -1' }}>
            <span>Store Address (Printed on Receipts)</span>
            <textarea
              rows={2}
              value={shop.address}
              onChange={(e) => setShop({ ...shop, address: e.target.value })}
              placeholder="Shop No, Street, Landmark, City, State, PIN"
            />
          </label>

          <label className="field">
            <span>Invoice Number Prefix</span>
            <input
              value={shop.invoicePrefix}
              onChange={(e) => setShop({ ...shop, invoicePrefix: e.target.value.toUpperCase() })}
              placeholder="e.g. INV, BILL, POS"
            />
          </label>

          <label className="field" style={{ gridColumn: '1 / -1' }}>
            <span>Receipt Footer Thank-You Message</span>
            <input
              value={shop.receiptFooter}
              onChange={(e) => setShop({ ...shop, receiptFooter: e.target.value })}
              placeholder="e.g. Thank you for shopping with us! Please visit again."
            />
          </label>
        </div>
      </article>

      <article className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ margin: '0 0 12px' }}>Tax, Discounts, and Receipt Preferences</h2>

        <div className="form-grid two">
          <label className="field checkbox">
            <input
              type="checkbox"
              checked={settings.gstEnabled}
              onChange={(e) => setSettings({ ...settings, gstEnabled: e.target.checked })}
            />
            <span>Enable GST / Tax calculation on billing checkout</span>
          </label>

          <label className="field">
            <span>Default GST Rate (%)</span>
            <input
              type="number"
              min="0"
              max="40"
              value={settings.gstRate}
              onChange={(e) => setSettings({ ...settings, gstRate: e.target.value })}
              placeholder="e.g. 5, 12, 18"
            />
          </label>

          <label className="field">
            <span>Default Receipt Layout Format</span>
            <select
              value={settings.receiptLayout}
              onChange={(e) => setSettings({ ...settings, receiptLayout: e.target.value })}
            >
              <option value="80mm">Thermal Receipt (80 mm standard POS)</option>
              <option value="a4">A4 Full Page Tax Invoice</option>
            </select>
          </label>

          <label className="field">
            <span>Default Barcode Sticker Label Size</span>
            <select
              value={settings.labelSize}
              onChange={(e) => setSettings({ ...settings, labelSize: e.target.value })}
            >
              <option value="50x30">50 × 30 mm (Standard Shelf / Pack)</option>
              <option value="40x30">40 × 30 mm (Medium Box)</option>
              <option value="38x25">38 × 25 mm (Small Item)</option>
            </select>
          </label>
        </div>

        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button type="button" className="btn btn-primary" onClick={save}>
            <Save size={16} /> Save Settings
          </button>
        </div>
      </article>

      <article className="card">
        <h2 style={{ margin: '0 0 8px' }}>Demo Data Backup, Restore & Reset</h2>
        <p className="muted small" style={{ marginBottom: 16 }}>
          All catalogue items, bills, barcodes, and stock levels are stored persistently in this browser’s{' '}
          <code>localStorage</code>. They do not require any cloud database.
        </p>

        <div className="row-actions">
          <button type="button" className="btn btn-ghost" onClick={backupData}>
            <Download size={16} /> Backup System Data (JSON)
          </button>

          <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
            <Upload size={16} /> Restore from JSON
            <input
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(e) => e.target.files?.[0] && restoreData(e.target.files[0])}
            />
          </label>

          <button type="button" className="btn btn-danger" onClick={() => setResetOpen(true)}>
            <RotateCcw size={16} /> Reset Demo Data
          </button>
        </div>
      </article>

      <ConfirmDialog
        open={resetOpen}
        title="Reset Demo Data to Initial State?"
        message="This action will restore the original 36 sample supermarket products, reset stock levels, and reload sample transactions. Any local changes made in this browser will be replaced."
        confirmLabel="Reset Demo Data"
        danger
        onCancel={() => setResetOpen(false)}
        onConfirm={() => {
          resetDemo();
          setResetOpen(false);
        }}
      />
    </div>
  );
}
