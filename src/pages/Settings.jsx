import { useState } from 'react';
import {
  Building2,
  Check,
  CheckCircle2,
  Download,
  Layers,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Sliders,
  Store,
  Tag,
  Trash2,
  Upload,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { downloadTextFile } from '../utils/csvUtils';

export default function Settings() {
  const {
    state,
    branches = [],
    categories = [],
    activeBranchId,
    activeCounterId,
    setActiveBranch,
    setActiveCounter,
    addCategory,
    updateCategory,
    deleteCategory,
    products = [],
    update,
    resetDemo,
    showToast,
  } = useStore();
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState('profile');

  // Form states
  const [shop, setShop] = useState(state.shop);
  const [settings, setSettings] = useState(state.settings);

  // Category tab state
  const [newCatInput, setNewCatInput] = useState('');
  const [editingCategory, setEditingCategory] = useState(null); // { oldName, newName }
  const [deleteCatName, setDeleteCatName] = useState(null);

  // Branch tab state
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [branchForm, setBranchForm] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
    manager: '',
  });
  const [newCounterBranchId, setNewCounterBranchId] = useState(null);
  const [newCounterName, setNewCounterName] = useState('');

  // Reset dialog state
  const [resetOpen, setResetOpen] = useState(false);

  // Save general shop & POS settings
  const handleSaveGeneral = () => {
    const gstRate = Number(settings.gstRate);
    if (settings.gstEnabled && (!Number.isFinite(gstRate) || gstRate < 0 || gstRate > 40)) {
      showToast('GST rate must be a valid percentage between 0 and 40.', 'error');
      return;
    }
    update((prev) => ({
      ...prev,
      shop,
      settings: { ...settings, gstRate },
    }));
    showToast('Settings saved successfully.', 'success');
  };

  // Add a new branch
  const handleCreateBranch = () => {
    if (!branchForm.name.trim()) {
      showToast('Enter branch name.', 'error');
      return;
    }
    const newId = `BR-${String(branches.length + 1).padStart(3, '0')}`;
    const newBranch = {
      id: newId,
      name: branchForm.name.trim(),
      code: branchForm.code.trim() || `BR-0${branches.length + 1}`,
      address: branchForm.address.trim() || shop.address,
      phone: branchForm.phone.trim() || shop.phone,
      manager: branchForm.manager.trim() || 'Store Manager',
      counters: [
        { id: `CNT-${newId}-01`, name: 'Counter 1 (Main POS)', cashier: 'Cashier', isExpress: true },
        { id: `CNT-${newId}-02`, name: 'Counter 2 (General)', cashier: 'Cashier', isExpress: false },
      ],
    };

    update((prev) => ({
      ...prev,
      branches: [...(prev.branches || []), newBranch],
    }));
    setBranchModalOpen(false);
    setBranchForm({ name: '', code: '', address: '', phone: '', manager: '' });
    showToast(`Branch "${newBranch.name}" created with 2 default counters!`, 'success');
  };

  // Add a counter to a branch
  const handleAddCounter = (branchId) => {
    if (!newCounterName.trim()) return;
    update((prev) => {
      const updatedBranches = (prev.branches || []).map((b) => {
        if (b.id !== branchId) return b;
        const newCounterId = `CNT-${branchId}-${(b.counters || []).length + 1}`;
        const newCounter = {
          id: newCounterId,
          name: newCounterName.trim(),
          cashier: 'Cashier',
          isExpress: false,
        };
        return {
          ...b,
          counters: [...(b.counters || []), newCounter],
        };
      });
      return { ...prev, branches: updatedBranches };
    });

    showToast(`Counter "${newCounterName.trim()}" added!`, 'success');
    setNewCounterName('');
    setNewCounterBranchId(null);
  };

  // Backup & Restore
  const backupData = () => {
    const jsonStr = JSON.stringify(state, null, 2);
    downloadTextFile(`pos-system-backup-${new Date().toISOString().slice(0, 10)}.json`, jsonStr);
    showToast('Complete system backup JSON downloaded.', 'success');
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

  const tabs = [
    { id: 'profile', label: 'Store Profile', icon: Store },
    { id: 'branches', label: 'Branches & Counters', icon: Building2 },
    { id: 'categories', label: 'Categories', icon: Tag },
    { id: 'pos', label: 'POS Preferences', icon: Sliders },
    { id: 'staff', label: 'Staff & Logins', icon: Users },
    { id: 'data', label: 'Backup & Reset', icon: Download },
  ];

  return (
    <div className="settings-page">
      <div className="page-head">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ margin: 0 }}>System Control Center</h1>
            <span className="demo-pill">ENTERPRISE CONFIG</span>
          </div>
          <p className="muted">
            Configure branches, counters, product categories, POS variant toggles, staff logins, and database backups.
          </p>
        </div>

        <button type="button" className="btn btn-primary" onClick={handleSaveGeneral}>
          <Save size={16} /> Save All Changes
        </button>
      </div>

      {/* Modern Tabs Navigation Bar */}
      <div className="settings-tabs-bar" role="tablist">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`settings-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.id === 'branches' ? (
                <span className="tab-pill-badge">{branches.length}</span>
              ) : tab.id === 'categories' ? (
                <span className="tab-pill-badge">{categories.length}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Store & Branding Profile */}
      {activeTab === 'profile' && (
        <article className="card animate-popIn">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div className="icon-badge primary" style={{ width: 36, height: 36 }}>
              <Store size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0 }}>Store & Receipt Branding</h2>
              <span className="muted small">
                These branding details are automatically printed on thermal paper receipts & A4 tax invoices.
              </span>
            </div>
          </div>

          <div className="form-grid two">
            <label className="field">
              <span>Supermarket / Brand Name *</span>
              <input
                value={shop.name}
                onChange={(e) => setShop({ ...shop, name: e.target.value })}
                placeholder="e.g. Nani Super Mart"
              />
            </label>

            <label className="field">
              <span>Customer Helpline Phone *</span>
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
                placeholder="e.g. contact@nanisupermart.com"
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
              <span>Headquarters / Registered Store Address</span>
              <textarea
                rows={2}
                value={shop.address}
                onChange={(e) => setShop({ ...shop, address: e.target.value })}
                placeholder="Plot No, Road No, Area, City, State, PIN"
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

            <label className="field">
              <span>Receipt Footer Greeting Note</span>
              <input
                value={shop.receiptFooter}
                onChange={(e) => setShop({ ...shop, receiptFooter: e.target.value })}
                placeholder="e.g. Thank you for shopping with us! Visit again."
              />
            </label>
          </div>

          <div className="modal-actions" style={{ marginTop: 20 }}>
            <button type="button" className="btn btn-primary" onClick={handleSaveGeneral}>
              <Save size={16} /> Save Profile Changes
            </button>
          </div>
        </article>
      )}

      {/* TAB 2: Multi-Branch & Multi-Counter Management (Centralized Admin) */}
      {activeTab === 'branches' && (
        <div className="animate-popIn" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Active Terminal Selection Card */}
          <article className="card" style={{ background: 'var(--surface-sunken)', border: '1.5px solid var(--blue-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <strong style={{ fontSize: '1.02rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Building2 size={18} color="var(--blue)" />
                  Centralized Admin: Current Terminal Active Location
                </strong>
                <span className="muted small">
                  Bills generated on this device will record this active branch and counter.
                </span>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <select
                  value={activeBranchId}
                  onChange={(e) => {
                    setActiveBranch(e.target.value);
                    showToast('Switched active store branch!', 'info');
                  }}
                  style={{ fontWeight: 700, padding: '7px 12px' }}
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      🏢 {b.name} ({b.code})
                    </option>
                  ))}
                </select>

                <select
                  value={activeCounterId}
                  onChange={(e) => {
                    setActiveCounter(e.target.value);
                    showToast('Switched active counter!', 'info');
                  }}
                  style={{ fontWeight: 700, padding: '7px 12px' }}
                >
                  {(branches.find((b) => b.id === activeBranchId)?.counters || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      ⚡ {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </article>

          {/* Branches List */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0 }}>Registered Store Branches ({branches.length})</h2>
              <span className="muted small">Multiple branches and independent billing counters per branch.</span>
            </div>
            <button type="button" className="btn btn-primary" onClick={() => setBranchModalOpen(true)}>
              <Plus size={16} /> Add New Branch
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {branches.map((b) => {
              const isTerminalActive = b.id === activeBranchId;
              return (
                <div
                  key={b.id}
                  className="card"
                  style={{
                    position: 'relative',
                    borderColor: isTerminalActive ? 'var(--blue)' : undefined,
                    boxShadow: isTerminalActive ? '0 0 0 2px var(--blue-light)' : undefined,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <strong style={{ fontSize: '1.05rem' }}>{b.name}</strong>
                        {isTerminalActive ? (
                          <span className="badge badge-in" style={{ fontSize: '0.65rem' }}>
                            ACTIVE NOW
                          </span>
                        ) : null}
                      </div>
                      <span className="muted tiny">Code: <strong>{b.code}</strong> · Mgr: {b.manager || 'Rajesh'}</span>
                    </div>
                  </div>

                  <p className="muted tiny" style={{ marginBottom: 10 }}>
                    {b.address} · Ph: {b.phone}
                  </p>

                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)' }}>
                        Billing Counters ({(b.counters || []).length})
                      </span>
                      <button
                        type="button"
                        className="btn-link tiny"
                        onClick={() => setNewCounterBranchId(b.id)}
                      >
                        + Add Counter
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {(b.counters || []).map((cnt) => (
                        <div
                          key={cnt.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'var(--surface-sunken)',
                            padding: '6px 10px',
                            borderRadius: 6,
                            fontSize: '0.82rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ color: 'var(--blue)' }}>⚡</span>
                            <strong>{cnt.name}</strong>
                          </div>
                          <span className="muted tiny">{cnt.cashier || 'Staff'}</span>
                        </div>
                      ))}
                    </div>

                    {/* Inline Counter Add Input */}
                    {newCounterBranchId === b.id ? (
                      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        <input
                          value={newCounterName}
                          onChange={(e) => setNewCounterName(e.target.value)}
                          placeholder="e.g. Counter 4 (Express)"
                          style={{ fontSize: '0.82rem', flex: 1 }}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handleAddCounter(b.id)}
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setNewCounterBranchId(null)}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: Category Management */}
      {activeTab === 'categories' && (
        <article className="card animate-popIn">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: 0 }}>Product Taxonomy & Categories</h2>
              <span className="muted small">
                Manage supermarket departments and shelves. Renaming categories automatically updates all associated products.
              </span>
            </div>

            <span className="badge badge-in">{categories.length} Total Categories</span>
          </div>

          {/* Quick Add Category Bar */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              padding: 12,
              background: 'var(--surface-sunken)',
              borderRadius: 8,
              marginBottom: 18,
            }}
          >
            <input
              value={newCatInput}
              onChange={(e) => setNewCatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newCatInput.trim()) {
                  try {
                    addCategory(newCatInput.trim());
                    showToast(`Category "${newCatInput.trim()}" created!`, 'success');
                    setNewCatInput('');
                  } catch (err) {
                    showToast(err.message, 'error');
                  }
                }
              }}
              placeholder="Enter new category name (e.g. Frozen Foods, Pet Care, Organic Vegetables)..."
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (!newCatInput.trim()) return;
                try {
                  addCategory(newCatInput.trim());
                  showToast(`Category "${newCatInput.trim()}" created!`, 'success');
                  setNewCatInput('');
                } catch (err) {
                  showToast(err.message, 'error');
                }
              }}
            >
              <Plus size={16} /> Add Category
            </button>
          </div>

          {/* Categories Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {categories.map((cat) => {
              const productCount = products.filter((p) => p.category === cat).length;
              const isEditing = editingCategory?.oldName === cat;

              return (
                <div
                  key={cat}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                  }}
                >
                  {isEditing ? (
                    <div style={{ display: 'flex', gap: 6, width: '100%' }}>
                      <input
                        value={editingCategory.newName}
                        onChange={(e) =>
                          setEditingCategory({ ...editingCategory, newName: e.target.value })
                        }
                        style={{ fontSize: '0.85rem', flex: 1 }}
                        autoFocus
                      />
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          try {
                            updateCategory(cat, editingCategory.newName);
                            showToast(`Category updated to "${editingCategory.newName}"!`, 'success');
                            setEditingCategory(null);
                          } catch (err) {
                            showToast(err.message, 'error');
                          }
                        }}
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setEditingCategory(null)}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <strong style={{ fontSize: '0.94rem' }}>{cat}</strong>
                        <div className="muted tiny">
                          {productCount} {productCount === 1 ? 'item' : 'items'} in catalog
                        </div>
                      </div>

                      <div className="row-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => setEditingCategory({ oldName: cat, newName: cat })}
                          title="Rename Category"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn danger"
                          onClick={() => setDeleteCatName(cat)}
                          title="Delete Category"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </article>
      )}

      {/* TAB 4: POS & Variants Preferences */}
      {activeTab === 'pos' && (
        <article className="card animate-popIn">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div className="icon-badge primary" style={{ width: 36, height: 36 }}>
              <Sliders size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0 }}>POS Checkout & Hardware Preferences</h2>
              <span className="muted small">
                Customize variant popups, printer roll widths, barcodes, and automated tax calculations.
              </span>
            </div>
          </div>

          <div className="form-grid two">
            {/* Requirement 2: Variant Selection Popup Toggle */}
            <div
              style={{
                gridColumn: '1 / -1',
                padding: '14px 16px',
                background: 'var(--surface-sunken)',
                borderRadius: 10,
                border: '1.5px solid var(--blue-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <div>
                <strong style={{ fontSize: '1rem', color: 'var(--text)', display: 'block' }}>
                  Show Variant Selection Popup on Scan / Search
                </strong>
                <span className="muted small">
                  When enabled, scanning or selecting items with multiple sizes (e.g. Sugar: 500g, 1kg, 5kg) will prompt a clean selector modal. If disabled, the default variant is billed immediately.
                </span>
              </div>

              <label className="toggle-switch" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.variantSelectionOnScan !== false}
                  onChange={(e) =>
                    setSettings({ ...settings, variantSelectionOnScan: e.target.checked })
                  }
                  style={{ width: 22, height: 22, cursor: 'pointer' }}
                />
              </label>
            </div>

            {/* Multi-Variant Barcode Support Toggle */}
            <div
              style={{
                gridColumn: '1 / -1',
                padding: '14px 16px',
                background: 'var(--surface-sunken)',
                borderRadius: 10,
                border: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <div>
                <strong style={{ fontSize: '1rem', color: 'var(--text)', display: 'block' }}>
                  Multi-Variant Barcode Direct Billing
                </strong>
                <span className="muted small">
                  Allow each individual size variant to have its own unique barcode. Scanning that variant barcode bypasses the modal and rings up that exact size directly.
                </span>
              </div>

              <label className="toggle-switch" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.multiVariantBarcodes !== false}
                  onChange={(e) =>
                    setSettings({ ...settings, multiVariantBarcodes: e.target.checked })
                  }
                  style={{ width: 22, height: 22, cursor: 'pointer' }}
                />
              </label>
            </div>

            <label className="field checkbox" style={{ gridColumn: '1 / -1' }}>
              <input
                type="checkbox"
                checked={settings.gstEnabled}
                onChange={(e) => setSettings({ ...settings, gstEnabled: e.target.checked })}
              />
              <span>Enable GST Tax Calculation on billing checkout</span>
            </label>

            <label className="field">
              <span>Standard Store GST Rate (%)</span>
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
              <span>Default Bill Discount (%)</span>
              <input
                type="number"
                min="0"
                max="50"
                value={settings.defaultBillDiscountPercent || 0}
                onChange={(e) =>
                  setSettings({ ...settings, defaultBillDiscountPercent: Number(e.target.value) || 0 })
                }
                placeholder="e.g. 0, 5, 10"
              />
            </label>

            <label className="field">
              <span>Receipt Printer Paper Layout</span>
              <select
                value={settings.receiptLayout || '80mm'}
                onChange={(e) => setSettings({ ...settings, receiptLayout: e.target.value })}
              >
                <option value="80mm">Thermal 80mm Roll (Standard POS Receipt)</option>
                <option value="58mm">Thermal 58mm Roll (Mini Mobile Printer)</option>
                <option value="a4">A4 Full Page GST Tax Invoice</option>
              </select>
            </label>

            <label className="field">
              <span>Barcode Sticker Label Dimension</span>
              <select
                value={settings.labelSize}
                onChange={(e) => setSettings({ ...settings, labelSize: e.target.value })}
              >
                <option value="50x30">50 × 30 mm (Standard Shelf / Pack Sticker)</option>
                <option value="40x30">40 × 30 mm (Medium Box Label)</option>
                <option value="38x25">38 × 25 mm (Small Chocolate / Cosmetic Label)</option>
              </select>
            </label>
          </div>

          <div className="modal-actions" style={{ marginTop: 20 }}>
            <button type="button" className="btn btn-primary" onClick={handleSaveGeneral}>
              <Save size={16} /> Save Preferences
            </button>
          </div>
        </article>
      )}

      {/* TAB 5: Staff & Logins */}
      {activeTab === 'staff' && (
        <article className="card animate-popIn">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: 0 }}>Staff Accounts & Counter Authorization</h2>
              <span className="muted small">
                Individual cashier logins and centralized administrator permissions.
              </span>
            </div>
            <span className="demo-pill">SECURITY</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            <div className="card" style={{ background: 'var(--surface-sunken)', border: '1.5px solid var(--blue)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div className="user-avatar-badge admin-avatar" style={{ width: 38, height: 38 }}>
                  RS
                </div>
                <div>
                  <strong>Rajesh Sharma</strong>
                  <div className="muted tiny">admin@nanisupermart.com</div>
                  <span className="badge badge-in" style={{ marginTop: 4 }}>
                    Store Owner / Central Admin
                  </span>
                </div>
              </div>
              <div className="muted tiny" style={{ marginTop: 8 }}>
                Access: Full Centralized Store Control across all branches & counters.
              </div>
            </div>

            <div className="card" style={{ background: 'var(--surface-sunken)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div className="user-avatar-badge subadmin-avatar" style={{ width: 38, height: 38 }}>
                  PV
                </div>
                <div>
                  <strong>Pooja Verma</strong>
                  <div className="muted tiny">pooja@nanisupermart.com</div>
                  <span className="badge badge-low" style={{ marginTop: 4 }}>
                    Cashier / Sub-Admin
                  </span>
                </div>
              </div>
              <div className="muted tiny" style={{ marginTop: 8 }}>
                Access: Assigned to Main Branch Banjara Hills • Counter 1 (Express POS).
              </div>
            </div>
          </div>
        </article>
      )}

      {/* TAB 6: Backup & Reset */}
      {activeTab === 'data' && (
        <article className="card animate-popIn">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div className="icon-badge primary" style={{ width: 36, height: 36 }}>
              <Download size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0 }}>System Data Backup & Local Restore</h2>
              <span className="muted small">
                Export complete database records (products, variants, branches, invoices, Khata customers) to JSON.
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
            <button type="button" className="btn btn-ghost" onClick={backupData}>
              <Download size={16} /> Export Full System Backup (JSON)
            </button>

            <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
              <Upload size={16} /> Restore from JSON Backup
              <input
                type="file"
                accept=".json,application/json"
                hidden
                onChange={(e) => e.target.files?.[0] && restoreData(e.target.files[0])}
              />
            </label>

            <button type="button" className="btn btn-danger" onClick={() => setResetOpen(true)}>
              <RotateCcw size={16} /> Restore Demo Initial Data
            </button>
          </div>

          <div
            style={{
              padding: '12px 16px',
              background: 'var(--surface-sunken)',
              borderRadius: 8,
              fontSize: '0.82rem',
              color: 'var(--muted)',
            }}
          >
            All records persist securely inside your local browser storage. No cloud connection is mandatory to ring up bills or manage stock.
          </div>
        </article>
      )}

      {/* Add Branch Modal */}
      {branchModalOpen ? (
        <div className="modal-backdrop" onClick={() => setBranchModalOpen(false)}>
          <div
            className="modal-card animate-popIn"
            onClick={(e) => e.stopPropagation()}
            style={{ width: 'min(480px, 94vw)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Add New Store Branch</h3>
              <button type="button" className="icon-btn" onClick={() => setBranchModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="form-grid one" style={{ gap: 10 }}>
              <label className="field">
                <span>Branch Location Name *</span>
                <input
                  value={branchForm.name}
                  onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                  placeholder="e.g. Gachibowli Branch, Secunderabad Hub"
                  autoFocus
                />
              </label>

              <label className="field">
                <span>Branch Identifier Code</span>
                <input
                  value={branchForm.code}
                  onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value })}
                  placeholder="e.g. GB-04"
                />
              </label>

              <label className="field">
                <span>Branch Address</span>
                <input
                  value={branchForm.address}
                  onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                  placeholder="Street, Area, City"
                />
              </label>

              <label className="field">
                <span>Contact Phone</span>
                <input
                  value={branchForm.phone}
                  onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                  placeholder="+91 ..."
                />
              </label>

              <label className="field">
                <span>Branch Manager Name</span>
                <input
                  value={branchForm.manager}
                  onChange={(e) => setBranchForm({ ...branchForm, manager: e.target.value })}
                  placeholder="Manager Name"
                />
              </label>
            </div>

            <div className="modal-actions" style={{ marginTop: 18 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setBranchModalOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleCreateBranch}>
                Create Branch
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Delete Category Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteCatName)}
        title={`Delete Category "${deleteCatName}"?`}
        message="Deleting this category will remove it from future product categorization. Existing products in this category will keep their catalog entries."
        confirmLabel="Confirm Delete"
        danger
        onCancel={() => setDeleteCatName(null)}
        onConfirm={() => {
          deleteCategory(deleteCatName);
          showToast(`Category "${deleteCatName}" removed.`, 'info');
          setDeleteCatName(null);
        }}
      />

      {/* Reset Demo Dialog */}
      <ConfirmDialog
        open={resetOpen}
        title="Reset Demo Data to Initial State?"
        message="This action will restore the original sample supermarket products (including Sugar variants, Chocolates, Basmati Rice), branches with counters, and transactions."
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
