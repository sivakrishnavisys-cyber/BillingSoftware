// Supplier, Purchase, and Staff Sample Data

export function buildSampleSuppliers() {
  return [
    {
      id: 'sup-1',
      name: 'Metro Cash & Carry Wholesale',
      contactPerson: 'Vikram Singhania',
      phone: '9822012345',
      email: 'orders@metro-wholesale.in',
      address: 'Gachibowli Wholesale Hub, Hyderabad',
      gstin: '36METRO9603R1ZX',
      paymentTerms: '15 Days Credit',
      balancePaise: 4500000, // ₹45,000 due
      createdAt: '2025-01-10T10:00:00.000Z',
    },
    {
      id: 'sup-2',
      name: 'ITC Limited FMCG Distribution',
      contactPerson: 'Anand Verma',
      phone: '9845098765',
      email: 'fmcg@itc-distrib.in',
      address: 'Kukatpally Depot, Hyderabad',
      gstin: '36ITCFM9603R1Z2',
      paymentTerms: '30 Days Credit',
      balancePaise: 2800000, // ₹28,000 due
      createdAt: '2025-02-15T11:00:00.000Z',
    },
    {
      id: 'sup-3',
      name: 'Amul Dairy Cooperative Federation',
      contactPerson: 'Rajesh Joshi',
      phone: '9819054321',
      email: 'supply@amuldairy.coop',
      address: 'Dairy Colony, Begumpet, Hyderabad',
      gstin: '36AMULD9603R1Z7',
      paymentTerms: 'Weekly Settlement',
      balancePaise: 1250000, // ₹12,500 due
      createdAt: '2025-01-20T09:30:00.000Z',
    },
    {
      id: 'sup-4',
      name: 'Hindustan Unilever Distributor (HUL)',
      contactPerson: 'Sunil Mehra',
      phone: '9833076543',
      email: 'hyd.distrib@hul.com',
      address: 'Balanagar Industrial Estate, Hyderabad',
      gstin: '36HULIN9603R1Z9',
      paymentTerms: 'Net 7 Days',
      balancePaise: 0, // Cleared
      createdAt: '2025-03-01T14:00:00.000Z',
    },
    {
      id: 'sup-5',
      name: 'Sri Lakshmi Agro Traders & Mills',
      contactPerson: 'M. Venkat Rao',
      phone: '9849033445',
      email: 'lakshmi.agro@gmail.com',
      address: 'Grain Market, Secunderabad',
      gstin: '36AGROT9603R1Z8',
      paymentTerms: '10 Days Credit',
      balancePaise: 3500000, // ₹35,000 due
      createdAt: '2025-02-01T08:00:00.000Z',
    },
  ];
}

export function buildSamplePurchases(products) {
  const now = new Date();
  const getPrd = (sku) => products.find((p) => p.sku === sku);

  const p1 = getPrd('RIC-001');
  const p2 = getPrd('OIL-001');
  const p3 = getPrd('SUG-001');
  const p4 = getPrd('BIS-001');
  const p5 = getPrd('MLK-001');

  return [
    {
      id: 'pur-1',
      purchaseNumber: 'PO-202610-001',
      supplierId: 'sup-1',
      supplierName: 'Metro Cash & Carry Wholesale',
      billNumber: 'MET-98214',
      date: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      items: [
        {
          productId: p1?.id || 'PRD-001',
          name: p1?.name || 'Premium Basmati Rice 5 kg',
          sku: 'RIC-001',
          qty: 25,
          unitCostPaise: 36000, // ₹360
          taxRate: 5,
          mfgDate: '2026-09-10',
          expiryDate: '2027-09-10',
          batchNo: 'BAT-RIC-901',
          lineTotalPaise: 900000, // ₹9,000
        },
        {
          productId: p2?.id || 'PRD-005',
          name: p2?.name || 'Sunflower Oil 1 L',
          sku: 'OIL-001',
          qty: 30,
          unitCostPaise: 11800, // ₹118
          taxRate: 5,
          mfgDate: '2026-09-15',
          expiryDate: '2027-03-15',
          batchNo: 'BAT-OIL-802',
          lineTotalPaise: 354000, // ₹3,540
        },
        {
          productId: p3?.id || 'PRD-003',
          name: p3?.name || 'Sugar 1 kg',
          sku: 'SUG-001',
          qty: 50,
          unitCostPaise: 4000, // ₹40
          taxRate: 5,
          mfgDate: '2026-08-01',
          expiryDate: '2027-08-01',
          batchNo: 'BAT-SUG-504',
          lineTotalPaise: 200000, // ₹2,000
        },
      ],
      subtotalPaise: 1454000,
      taxPaise: 72700,
      grandTotalPaise: 1526700,
      paidAmountPaise: 1000000,
      dueAmountPaise: 526700,
      status: 'received',
      paymentStatus: 'partial',
      notes: 'Initial October staples bulk delivery',
    },
    {
      id: 'pur-2',
      purchaseNumber: 'PO-202610-002',
      supplierId: 'sup-2',
      supplierName: 'ITC Limited FMCG Distribution',
      billNumber: 'ITC-44321',
      date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      items: [
        {
          productId: p4?.id || 'PRD-023',
          name: p4?.name || 'Glucose Biscuits 100 g',
          sku: 'BIS-001',
          qty: 60,
          unitCostPaise: 1200, // ₹12
          taxRate: 5,
          mfgDate: '2026-09-01',
          expiryDate: '2027-03-01',
          batchNo: 'BAT-BIS-401',
          lineTotalPaise: 72000,
        },
      ],
      subtotalPaise: 72000,
      taxPaise: 3600,
      grandTotalPaise: 75600,
      paidAmountPaise: 75600,
      dueAmountPaise: 0,
      status: 'received',
      paymentStatus: 'paid',
      notes: 'Snacks & biscuits weekly top-up',
    },
    {
      id: 'pur-3',
      purchaseNumber: 'PO-202610-003',
      supplierId: 'sup-3',
      supplierName: 'Amul Dairy Cooperative Federation',
      billNumber: 'AML-10294',
      date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      items: [
        {
          productId: p5?.id || 'PRD-013',
          name: p5?.name || 'Toned Milk 500 ml',
          sku: 'MLK-001',
          qty: 40,
          unitCostPaise: 2200, // ₹22
          taxRate: 5,
          mfgDate: '2026-10-20',
          expiryDate: '2026-10-25',
          batchNo: 'BAT-MLK-102',
          lineTotalPaise: 88000,
        },
      ],
      subtotalPaise: 88000,
      taxPaise: 4400,
      grandTotalPaise: 92400,
      paidAmountPaise: 0,
      dueAmountPaise: 92400,
      status: 'received',
      paymentStatus: 'unpaid',
      notes: 'Fresh dairy weekly delivery',
    },
  ];
}

export function buildSamplePurchaseReturns() {
  const now = new Date();
  return [
    {
      id: 'pret-1',
      returnNumber: 'PR-202610-001',
      supplierId: 'sup-1',
      supplierName: 'Metro Cash & Carry Wholesale',
      date: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      items: [
        {
          productId: 'PRD-005',
          name: 'Sunflower Oil 1 L',
          sku: 'OIL-001',
          qty: 4,
          unitCostPaise: 11800,
          lineTotalPaise: 47200, // ₹472
          reason: 'Damaged can seal on arrival',
        },
      ],
      totalAmountPaise: 47200,
      creditNoteNumber: 'CN-MET-441',
      status: 'approved',
      notes: 'Supplier acknowledged damage and adjusted in balance',
    },
  ];
}

export function buildSampleSupplierPayments() {
  const now = new Date();
  return [
    {
      id: 'spay-1',
      supplierId: 'sup-1',
      supplierName: 'Metro Cash & Carry Wholesale',
      amountPaise: 2000000, // ₹20,000
      date: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      paymentMethod: 'bank_transfer',
      referenceNumber: 'NEFT-AXIS-99214',
      notes: 'Part payment against bill MET-98214',
    },
    {
      id: 'spay-2',
      supplierId: 'sup-2',
      supplierName: 'ITC Limited FMCG Distribution',
      amountPaise: 1000000, // ₹10,000
      date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      paymentMethod: 'upi',
      referenceNumber: 'UPI-HDFC-88310',
      notes: 'Advance settlement for confectionery',
    },
  ];
}

export function buildSampleStaff() {
  return [
    {
      id: 'stf-1',
      name: 'Ramesh Kumar',
      role: 'Admin',
      phone: '9876543210',
      email: 'ramesh@nanisupermart.demo',
      shift: 'Full Day (9 AM - 9 PM)',
      status: 'Active',
      pin: '1234',
      joinedDate: '2024-01-15',
      monthlySalesCount: 142,
    },
    {
      id: 'stf-2',
      name: 'Priya Sharma',
      role: 'Cashier',
      phone: '9848011223',
      email: 'priya@nanisupermart.demo',
      shift: 'Morning Shift (8 AM - 4 PM)',
      status: 'Active',
      pin: '2345',
      joinedDate: '2024-06-01',
      monthlySalesCount: 380,
    },
    {
      id: 'stf-3',
      name: 'Suresh Patel',
      role: 'Store Manager',
      phone: '9822099887',
      email: 'suresh@nanisupermart.demo',
      shift: 'Evening Shift (2 PM - 10 PM)',
      status: 'Active',
      pin: '3456',
      joinedDate: '2024-03-10',
      monthlySalesCount: 95,
    },
    {
      id: 'stf-4',
      name: 'Ananya Reddy',
      role: 'Cashier',
      phone: '9866044556',
      email: 'ananya@nanisupermart.demo',
      shift: 'Evening Shift (2 PM - 10 PM)',
      status: 'Active',
      pin: '4567',
      joinedDate: '2025-02-20',
      monthlySalesCount: 290,
    },
    {
      id: 'stf-5',
      name: 'Kiran Varma',
      role: 'Stock Keeper',
      phone: '9899077889',
      email: 'kiran@nanisupermart.demo',
      shift: 'Morning Shift (8 AM - 4 PM)',
      status: 'Active',
      pin: '5678',
      joinedDate: '2024-08-15',
      monthlySalesCount: 0,
    },
  ];
}
