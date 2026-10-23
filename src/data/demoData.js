import { rupeesToPaise } from '../utils/currencyUtils';
import { addDays, startOfDay } from '../utils/dateUtils';
import { buildSampleCustomers } from './khataData';
import {
  buildSampleSuppliers,
  buildSamplePurchases,
  buildSamplePurchaseReturns,
  buildSampleSupplierPayments,
  buildSampleStaff,
} from './supplierData';

function seededRandom(seed) {
  let a = seed;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function uid(prefix, n) {
  return `${prefix}-${String(n).padStart(3, '0')}`;
}

const RAW_PRODUCTS = [
  { name: 'Premium Basmati Rice 5 kg', category: 'Groceries', brand: 'Annapurna', sku: 'RIC-001', barcode: '890100000001', purchase: 360, selling: 425, qty: 48, min: 10, unit: 'bag' },
  { name: 'Sona Masoori Rice 5 kg', category: 'Groceries', brand: 'Harvest Gold', sku: 'RIC-002', barcode: '890100000002', purchase: 255, selling: 310, qty: 36, min: 8, unit: 'bag' },
  { name: 'Sugar 1 kg', category: 'Groceries', brand: 'SweetHome', sku: 'SUG-001', barcode: '890100000003', purchase: 40, selling: 48, qty: 80, min: 20, unit: 'pack' },
  { name: 'Jaggery 500 g', category: 'Groceries', brand: 'Village', sku: 'SUG-002', barcode: '890100000004', purchase: 48, selling: 65, qty: 22, min: 8, unit: 'pack' },
  { name: 'Sunflower Oil 1 L', category: 'Groceries', brand: 'Golden Drop', sku: 'OIL-001', barcode: '890100000005', purchase: 118, selling: 145, qty: 40, min: 12, unit: 'bottle' },
  { name: 'Mustard Oil 1 L', category: 'Groceries', brand: 'Kachi Ghani', sku: 'OIL-002', barcode: '890100000006', purchase: 138, selling: 168, qty: 18, min: 8, unit: 'bottle' },
  { name: 'Cooking Salt 1 kg', category: 'Groceries', brand: 'Crystal', sku: 'SLT-001', barcode: '890100000007', purchase: 16, selling: 22, qty: 90, min: 20, unit: 'pack' },
  { name: 'Turmeric Powder 200 g', category: 'Groceries', brand: 'SpiceNest', sku: 'SPC-001', barcode: '890100000008', purchase: 38, selling: 55, qty: 30, min: 10, unit: 'pack' },
  { name: 'Red Chilli Powder 200 g', category: 'Groceries', brand: 'SpiceNest', sku: 'SPC-002', barcode: '890100000009', purchase: 52, selling: 72, qty: 26, min: 10, unit: 'pack' },
  { name: 'Tea Powder 250 g', category: 'Beverages', brand: 'Morning Leaf', sku: 'TEA-001', barcode: '890100000010', purchase: 98, selling: 135, qty: 34, min: 10, unit: 'pack' },
  { name: 'Filter Coffee 100 g', category: 'Beverages', brand: 'Kaapi', sku: 'COF-001', barcode: '890100000011', purchase: 140, selling: 185, qty: 16, min: 6, unit: 'pack' },
  { name: 'Toor Dal 1 kg', category: 'Groceries', brand: 'Pulses Plus', sku: 'DAL-001', barcode: '890100000012', purchase: 132, selling: 168, qty: 28, min: 10, unit: 'pack' },
  { name: 'Toned Milk 500 ml', category: 'Dairy', brand: 'FreshDay', sku: 'MLK-001', barcode: '890100000013', purchase: 22, selling: 28, qty: 60, min: 20, unit: 'pack' },
  { name: 'Curd 400 g', category: 'Dairy', brand: 'FreshDay', sku: 'CUR-001', barcode: '890100000014', purchase: 26, selling: 35, qty: 24, min: 10, unit: 'cup' },
  { name: 'Paneer 200 g', category: 'Dairy', brand: 'DairyHill', sku: 'PNR-001', barcode: '890100000015', purchase: 72, selling: 95, qty: 12, min: 6, unit: 'pack' },
  { name: 'Butter 100 g', category: 'Dairy', brand: 'DairyHill', sku: 'BTR-001', barcode: '890100000016', purchase: 48, selling: 62, qty: 20, min: 8, unit: 'pack' },
  { name: 'Toothpaste 150 g', category: 'Personal Care', brand: 'BrightSmile', sku: 'PAS-001', barcode: '890100000017', purchase: 72, selling: 95, qty: 32, min: 10, unit: 'tube' },
  { name: 'Bath Soap 100 g', category: 'Personal Care', brand: 'CleanBar', sku: 'SOP-001', barcode: '890100000018', purchase: 28, selling: 42, qty: 55, min: 15, unit: 'bar' },
  { name: 'Shampoo 180 ml', category: 'Personal Care', brand: 'SoftCare', sku: 'SHP-001', barcode: '890100000019', purchase: 92, selling: 125, qty: 21, min: 8, unit: 'bottle' },
  { name: 'Handwash 250 ml', category: 'Personal Care', brand: 'CleanBar', sku: 'HND-001', barcode: '890100000020', purchase: 55, selling: 78, qty: 14, min: 8, unit: 'bottle' },
  { name: 'Detergent Powder 1 kg', category: 'Household', brand: 'WashWell', sku: 'DET-001', barcode: '890100000021', purchase: 108, selling: 138, qty: 27, min: 10, unit: 'pack' },
  { name: 'Dishwash Bar 200 g', category: 'Household', brand: 'Sparkle', sku: 'DSH-001', barcode: '890100000022', purchase: 16, selling: 25, qty: 40, min: 12, unit: 'bar' },
  { name: 'Glucose Biscuits 100 g', category: 'Snacks', brand: 'CrunchTime', sku: 'BIS-001', barcode: '890100000023', purchase: 12, selling: 20, qty: 70, min: 20, unit: 'pack' },
  { name: 'Cream Biscuits 150 g', category: 'Snacks', brand: 'CrunchTime', sku: 'BIS-002', barcode: '890100000024', purchase: 24, selling: 35, qty: 44, min: 12, unit: 'pack' },
  { name: 'Potato Chips 50 g', category: 'Snacks', brand: 'Crispy', sku: 'CHP-001', barcode: '890100000025', purchase: 12, selling: 20, qty: 50, min: 15, unit: 'pack' },
  { name: 'Namkeen Mix 200 g', category: 'Snacks', brand: 'Chatpata', sku: 'NMK-001', barcode: '890100000026', purchase: 38, selling: 55, qty: 8, min: 10, unit: 'pack' },
  { name: 'Instant Noodles 70 g', category: 'Snacks', brand: 'QuickCup', sku: 'NDL-001', barcode: '890100000027', purchase: 10, selling: 14, qty: 96, min: 24, unit: 'pack' },
  { name: 'White Bread 400 g', category: 'Bakery', brand: 'DailyBake', sku: 'BRD-001', barcode: '890100000028', purchase: 28, selling: 40, qty: 18, min: 8, unit: 'loaf' },
  { name: 'Bottled Water 1 L', category: 'Beverages', brand: 'PureSpring', sku: 'WAT-001', barcode: '890100000029', purchase: 12, selling: 20, qty: 120, min: 30, unit: 'bottle' },
  { name: 'Soft Drink 750 ml', category: 'Beverages', brand: 'FizzUp', sku: 'SOD-001', barcode: '890100000030', purchase: 28, selling: 40, qty: 42, min: 12, unit: 'bottle' },
  { name: 'Mango Juice 1 L', category: 'Beverages', brand: 'Orchard', sku: 'JUC-001', barcode: '890100000031', purchase: 82, selling: 110, qty: 0, min: 8, unit: 'carton' },
  { name: 'Coconut Water 200 ml', category: 'Beverages', brand: 'TropiCool', sku: 'COC-001', barcode: '890100000032', purchase: 24, selling: 35, qty: 15, min: 10, unit: 'tetra' },
  { name: 'Floor Cleaner 500 ml', category: 'Household', brand: 'ShineHome', sku: 'FLR-001', barcode: '890100000033', purchase: 72, selling: 98, qty: 11, min: 6, unit: 'bottle' },
  { name: 'Match Box (10 pcs)', category: 'Household', brand: 'SafeLite', sku: 'MCH-001', barcode: '890100000034', purchase: 8, selling: 12, qty: 60, min: 15, unit: 'pack' },
  { name: 'Garbage Bags (30 pcs)', category: 'Household', brand: 'CleanUp', sku: 'BAG-001', barcode: '890100000035', purchase: 62, selling: 85, qty: 9, min: 8, unit: 'roll' },
  { name: 'Aluminium Foil 10 m', category: 'Household', brand: 'WrapRight', sku: 'FOL-001', barcode: '890100000036', purchase: 52, selling: 75, qty: 13, min: 6, unit: 'roll' },
];

export const CATEGORIES = [
  'Groceries',
  'Dairy',
  'Beverages',
  'Snacks',
  'Personal Care',
  'Household',
  'Bakery',
];

export const UNITS = ['pack', 'bag', 'bottle', 'kg', 'g', 'L', 'ml', 'pcs', 'bar', 'tube', 'loaf', 'cup', 'carton', 'tetra', 'roll'];

export function getShopDefaults() {
  return {
    name: 'Nani Super Mart',
    address: '12, Market Road, Near Bus Stand, Hyderabad, Telangana 500001',
    phone: '+91 98765 43210',
    email: 'hello@nanisupermart.demo',
    gstin: '36AABCU9603R1ZX',
    invoicePrefix: 'INV',
    receiptFooter: 'Thank you for shopping at Nani Super Mart. Please visit again!',
  };
}

export function getSettingsDefaults() {
  return {
    gstEnabled: true,
    gstRate: 5,
    defaultBillDiscountPercent: 0,
    labelSize: '50x30',
    receiptLayout: '80mm',
    demoBanner: true,
  };
}

function buildProducts(createdAt) {
  return RAW_PRODUCTS.map((p, i) => {
    let mfgDate = '2026-09-01';
    let expiryDate = '2027-08-31';

    if (p.category === 'Dairy') {
      if (p.sku === 'MLK-001') {
        mfgDate = '2026-10-18';
        expiryDate = '2026-10-21'; // Expired 2 days ago
      } else if (p.sku === 'CUR-001') {
        mfgDate = '2026-10-20';
        expiryDate = '2026-10-28'; // Expiring in 5 days
      } else if (p.sku === 'PNR-001') {
        mfgDate = '2026-10-15';
        expiryDate = '2026-11-05'; // Expiring in 13 days
      } else {
        mfgDate = '2026-09-10';
        expiryDate = '2027-03-10';
      }
    } else if (p.category === 'Bakery') {
      mfgDate = '2026-10-20';
      expiryDate = '2026-10-26'; // Expiring in 3 days
    } else if (p.category === 'Snacks') {
      if (p.sku === 'NMK-001') {
        mfgDate = '2026-08-15';
        expiryDate = '2026-11-12'; // Expiring in 20 days
      } else {
        mfgDate = '2026-09-01';
        expiryDate = '2027-04-15';
      }
    } else if (p.category === 'Beverages') {
      if (p.sku === 'JUC-001') {
        mfgDate = '2026-06-01';
        expiryDate = '2026-10-15'; // Expired
      } else if (p.sku === 'COC-001') {
        mfgDate = '2026-08-01';
        expiryDate = '2026-11-02'; // Expiring in 10 days
      } else {
        mfgDate = '2026-09-01';
        expiryDate = '2027-09-01';
      }
    }

    return {
      id: uid('PRD', i + 1),
      name: p.name,
      category: p.category,
      brand: p.brand,
      sku: p.sku,
      barcode: p.barcode,
      purchasePricePaise: rupeesToPaise(p.purchase),
      sellingPricePaise: rupeesToPaise(p.selling),
      quantity: p.qty,
      minStock: p.min,
      unit: p.unit,
      mfgDate,
      expiryDate,
      batchNo: `BAT-${p.sku}-26`,
      image: '',
      createdAt,
      status: 'active',
    };
  });
}

function calcBillTotals(items, taxRate) {
  const subtotalPaise = items.reduce((s, it) => s + it.unitPricePaise * it.qty, 0);
  const discountPaise = items.reduce((s, it) => s + it.discountPaise, 0);
  const taxable = Math.max(0, subtotalPaise - discountPaise);
  const taxPaise = Math.round(taxable * taxRate / 100);
  const grandTotalPaise = taxable + taxPaise;
  return { subtotalPaise, discountPaise, taxPaise, grandTotalPaise };
}

function makeItem(product, qty, discountPaise = 0) {
  const line = product.sellingPricePaise * qty;
  return {
    productId: product.id,
    name: product.name,
    sku: product.sku,
    barcode: product.barcode,
    qty,
    unit: product.unit,
    unitPricePaise: product.sellingPricePaise,
    discountPaise,
    taxPaise: 0,
    lineTotalPaise: Math.max(0, line - discountPaise),
  };
}

function buildSampleInvoices(products, now) {
  const rand = seededRandom(20261021);
  const methods = ['cash', 'upi', 'card', 'upi', 'cash', 'upi'];
  const names = ['Ravi Kumar', 'Sita Devi', 'Arjun Reddy', 'Meena Shah', 'Imran Ali', 'Lakshmi Rao', ''];
  const phones = ['9876543210', '9123456780', '9988776655', '', '9000011122', '9848012345', ''];
  const invoices = [];
  let seq = 0;
  const today = startOfDay(now);

  for (let dayOffset = 14; dayOffset >= 0; dayOffset -= 1) {
    const day = addDays(today, -dayOffset);
    const billsToday = dayOffset === 0 ? 5 : 2 + Math.floor(rand() * 4);
    for (let b = 0; b < billsToday; b += 1) {
      seq += 1;
      const itemCount = 2 + Math.floor(rand() * 5);
      const used = new Set();
      const items = [];
      for (let i = 0; i < itemCount; i += 1) {
        let p = products[Math.floor(rand() * products.length)];
        let guard = 0;
        while ((used.has(p.id) || p.quantity <= 0) && guard < 20) {
          p = products[Math.floor(rand() * products.length)];
          guard += 1;
        }
        used.add(p.id);
        const qty = 1 + Math.floor(rand() * 3);
        const discountPaise = rand() > 0.85 ? Math.round(p.sellingPricePaise * qty * 0.05) : 0;
        items.push(makeItem(p, qty, discountPaise));
      }
      const taxRate = 5;
      const totals = calcBillTotals(items, taxRate);
      items.forEach((it) => {
        const net = it.unitPricePaise * it.qty - it.discountPaise;
        it.taxPaise = Math.round(net * taxRate / 100);
        it.lineTotalPaise = net;
      });
      const method = methods[Math.floor(rand() * methods.length)];
      const createdAt = new Date(day);
      createdAt.setHours(9 + Math.floor(rand() * 11), Math.floor(rand() * 60), Math.floor(rand() * 60), 0);
      const nameIdx = Math.floor(rand() * names.length);
      const amountPaid = method === 'cash'
        ? Math.ceil(totals.grandTotalPaise / 10000) * 10000
        : totals.grandTotalPaise;
      invoices.push({
        id: uid('BILL', seq),
        invoiceNumber: `INV-2026-${String(seq).padStart(4, '0')}`,
        createdAt: createdAt.toISOString(),
        customerName: names[nameIdx],
        customerPhone: phones[nameIdx],
        items,
        subtotalPaise: totals.subtotalPaise,
        discountPaise: totals.discountPaise,
        taxPaise: totals.taxPaise,
        taxRate,
        grandTotalPaise: totals.grandTotalPaise,
        paymentMethod: method,
        amountPaidPaise: amountPaid,
        changePaise: Math.max(0, amountPaid - totals.grandTotalPaise),
        status: 'completed',
      });
    }
  }
  return { invoices, invoiceSeq: seq };
}

function buildMovements(products, invoices, now) {
  const movements = products.map((p, i) => ({
    id: uid('MOV', i + 1),
    productId: p.id,
    productName: p.name,
    previousQty: 0,
    changeQty: p.quantity,
    newQty: p.quantity,
    type: 'stock-in',
    reason: 'Opening stock for demo',
    date: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    invoiceNumber: '',
  }));

  const extra = [
    { product: products.find((p) => p.sku === 'NMK-001'), change: -4, type: 'adjustment', reason: 'Damaged packets discarded' },
    { product: products.find((p) => p.sku === 'JUC-001'), change: -8, type: 'stock-out', reason: 'Expired cartons removed' },
    { product: products.find((p) => p.sku === 'MLK-001'), change: 24, type: 'stock-in', reason: 'Morning dairy delivery' },
    { product: products.find((p) => p.sku === 'BRD-001'), change: 12, type: 'stock-in', reason: 'Bakery restock' },
  ].filter((x) => x.product);

  extra.forEach((x, idx) => {
    const prev = x.product.quantity - x.change;
    movements.push({
      id: uid('MOV', products.length + idx + 1),
      productId: x.product.id,
      productName: x.product.name,
      previousQty: Math.max(0, prev),
      changeQty: x.change,
      newQty: x.product.quantity,
      type: x.type,
      reason: x.reason,
      date: new Date(now.getTime() - (idx + 1) * 6 * 60 * 60 * 1000).toISOString(),
      invoiceNumber: '',
    });
  });

  invoices.slice(-8).forEach((inv, idx) => {
    inv.items.forEach((item, j) => {
      movements.push({
        id: `MOV-SALE-${inv.id}-${j}`,
        productId: item.productId,
        productName: item.name,
        previousQty: item.qty + 4,
        changeQty: -item.qty,
        newQty: 4,
        type: 'sale',
        reason: `Sold on ${inv.invoiceNumber}`,
        date: inv.createdAt,
        invoiceNumber: inv.invoiceNumber,
      });
    });
    if (idx > 6) return;
  });

  movements.sort((a, b) => new Date(b.date) - new Date(a.date));
  return movements;
}

export function createInitialState() {
  const now = new Date();
  const products = buildProducts(addDays(now, -40).toISOString());
  const { invoices, invoiceSeq } = buildSampleInvoices(products, now);
  const movements = buildMovements(products, invoices, now);
  const { customers, khataTransactions } = buildSampleCustomers(invoices, now);
  const suppliers = buildSampleSuppliers();
  const purchases = buildSamplePurchases(products);
  const purchaseReturns = buildSamplePurchaseReturns();
  const supplierPayments = buildSampleSupplierPayments();
  const staff = buildSampleStaff();
  const heldBills = [];

  return {
    shop: getShopDefaults(),
    settings: getSettingsDefaults(),
    products,
    invoices,
    movements,
    customers,
    khataTransactions,
    suppliers,
    purchases,
    purchaseReturns,
    supplierPayments,
    staff,
    heldBills,
    meta: {
      invoiceSeq,
      movementSeq: movements.length + 50,
      productSeq: products.length,
      customerSeq: customers.length,
      khataSeq: khataTransactions.length,
      supplierSeq: suppliers.length,
      purchaseSeq: purchases.length,
      staffSeq: staff.length,
      initializedAt: now.toISOString(),
    },
  };
}

export const STORAGE_KEY = 'nani_super_mart_pos_v1';
