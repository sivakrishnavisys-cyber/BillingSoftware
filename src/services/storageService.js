import { STORAGE_KEY, createInitialState, DEFAULT_BRANCHES, CATEGORIES } from '../data/demoData';
import { buildSampleCustomers } from '../data/khataData';
import {
  buildSampleSuppliers,
  buildSamplePurchases,
  buildSamplePurchaseReturns,
  buildSampleSupplierPayments,
  buildSampleStaff,
} from '../data/supplierData';

export function loadState() {
  const defaults = {
    shop: {
      name: 'Nani Super Mart',
      address: '12, Market Road, Near Bus Stand, Hyderabad, Telangana 500001',
      phone: '+91 98765 43210',
      email: 'hello@nanisupermart.demo',
      gstin: '36AABCU9603R1ZX',
      invoicePrefix: 'INV',
      receiptFooter: 'Thank you for shopping at Nani Super Mart. Please visit again!',
    },
    settings: {
      gstEnabled: true,
      gstRate: 5,
      defaultBillDiscountPercent: 0,
      labelSize: '50x30',
      receiptLayout: '80mm',
      demoBanner: true,
      variantSelectionOnScan: true,
      multiVariantBarcodes: true,
      activeBranchId: 'BR-001',
      activeCounterId: 'CNT-01',
    },
    branches: DEFAULT_BRANCHES,
    categories: [...CATEGORIES],
    activeBranchId: 'BR-001',
    activeCounterId: 'CNT-01',
    products: [],
    invoices: [],
    movements: [],
    customers: [],
    khataTransactions: [],
    suppliers: [],
    purchases: [],
    purchaseReturns: [],
    supplierPayments: [],
    staff: [],
    heldBills: [],
    meta: { invoiceSeq: 0, movementSeq: 0, productSeq: 0, customerSeq: 0, khataSeq: 0, supplierSeq: 0, purchaseSeq: 0, staffSeq: 0 },
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createInitialState();
      saveState(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (!parsed?.products || !Array.isArray(parsed.products)) {
      const initial = createInitialState();
      saveState(initial);
      return initial;
    }

    // Auto-migrate if customers array is missing
    let customers = parsed.customers;
    let khataTransactions = parsed.khataTransactions;
    if (!customers || !Array.isArray(customers) || customers.length === 0) {
      const sample = buildSampleCustomers(parsed.invoices || [], new Date());
      customers = sample.customers;
      khataTransactions = sample.khataTransactions;
    }

    // Auto-migrate suppliers & purchases
    let suppliers = parsed.suppliers;
    if (!suppliers || !Array.isArray(suppliers) || suppliers.length === 0) {
      suppliers = buildSampleSuppliers();
    }

    let purchases = parsed.purchases;
    if (!purchases || !Array.isArray(purchases) || purchases.length === 0) {
      purchases = buildSamplePurchases(parsed.products || []);
    }

    let purchaseReturns = parsed.purchaseReturns;
    if (!purchaseReturns || !Array.isArray(purchaseReturns)) {
      purchaseReturns = buildSamplePurchaseReturns();
    }

    let supplierPayments = parsed.supplierPayments;
    if (!supplierPayments || !Array.isArray(supplierPayments)) {
      supplierPayments = buildSampleSupplierPayments();
    }

    let staff = parsed.staff;
    if (!staff || !Array.isArray(staff) || staff.length === 0) {
      staff = buildSampleStaff();
    }

    const heldBills = parsed.heldBills || [];

    // Ensure products have mfgDate & expiryDate
    const products = (parsed.products || []).map((p) => {
      let mfgDate = p.mfgDate || '2026-09-01';
      let expiryDate = p.expiryDate;
      if (!expiryDate) {
        if (p.category === 'Dairy') {
          expiryDate = p.sku === 'MLK-001' ? '2026-10-21' : '2026-10-28';
        } else if (p.category === 'Bakery') {
          expiryDate = '2026-10-26';
        } else if (p.category === 'Snacks') {
          expiryDate = '2026-11-12';
        } else if (p.category === 'Beverages') {
          expiryDate = p.sku === 'JUC-001' ? '2026-10-15' : '2026-11-02';
        } else {
          expiryDate = '2027-08-31';
        }
      }
      let variants = p.variants || [];
      if ((!variants || variants.length === 0) && p.sku === 'SUG-001') {
        variants = [
          { id: 'VAR-SUG-500G', name: '500 g', sku: 'SUG-001-500G', barcode: '890100000003-500', purchasePricePaise: 2100, sellingPricePaise: 2500, quantity: 40, unit: 'pack' },
          { id: 'VAR-SUG-1KG', name: '1 kg', sku: 'SUG-001-1KG', barcode: '890100000003', purchasePricePaise: 4000, sellingPricePaise: 4800, quantity: 80, unit: 'pack', isDefault: true },
          { id: 'VAR-SUG-5KG', name: '5 kg', sku: 'SUG-001-5KG', barcode: '890100000003-5KG', purchasePricePaise: 19500, sellingPricePaise: 23000, quantity: 25, unit: 'bag' },
        ];
      }
      return {
        ...p,
        variants,
        mfgDate,
        expiryDate,
        batchNo: p.batchNo || `BAT-${p.sku || 'GEN'}-26`,
      };
    });

    const branches = parsed.branches && Array.isArray(parsed.branches) && parsed.branches.length > 0
      ? parsed.branches
      : DEFAULT_BRANCHES;
    const categories = parsed.categories && Array.isArray(parsed.categories) && parsed.categories.length > 0
      ? parsed.categories
      : [...CATEGORIES];
    const activeBranchId = parsed.activeBranchId || 'BR-001';
    const activeCounterId = parsed.activeCounterId || 'CNT-01';

    const invoices = (parsed.invoices || []).map((inv) => ({
      ...inv,
      branchId: inv.branchId || 'BR-001',
      branchName: inv.branchName || 'Main Branch - Banjara Hills',
      counterId: inv.counterId || 'CNT-01',
      counterName: inv.counterName || 'Counter 1 (Express POS)',
      cashierName: inv.cashierName || 'Pooja Verma',
    }));

    return {
      ...defaults,
      ...parsed,
      products,
      invoices,
      branches,
      categories,
      activeBranchId,
      activeCounterId,
      customers,
      khataTransactions: khataTransactions || [],
      suppliers,
      purchases,
      purchaseReturns,
      supplierPayments,
      staff,
      heldBills,
      shop: { ...defaults.shop, ...(parsed.shop || {}) },
      settings: { ...defaults.settings, ...(parsed.settings || {}) },
      meta: { ...defaults.meta, ...(parsed.meta || {}) },
    };
  } catch {
    const initial = createInitialState();
    saveState(initial);
    return initial;
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState() {
  const initial = createInitialState();
  saveState(initial);
  return initial;
}

export function hasSavedState() {
  return Boolean(localStorage.getItem(STORAGE_KEY));
}
