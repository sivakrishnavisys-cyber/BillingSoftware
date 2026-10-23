import { rupeesToPaise } from '../utils/currencyUtils';

const RAW_CUSTOMERS = [
  { id: 'CUST-001', name: 'Ramesh Patel', phone: '9876543210', address: 'Flat 204, Shanti Heights, Main Road', creditLimit: 10000, balance: 2450 },
  { id: 'CUST-002', name: 'Sita Devi', phone: '9123456780', address: 'Plot 12, Gandhi Nagar', creditLimit: 5000, balance: 850 },
  { id: 'CUST-003', name: 'Arjun Reddy', phone: '9988776655', address: 'Near RTC Cross Road, Ashok Nagar', creditLimit: 15000, balance: 4120 },
  { id: 'CUST-004', name: 'Meena Shah', phone: '9848012345', address: 'Street 4, Tilak Road', creditLimit: 8000, balance: 0 },
  { id: 'CUST-005', name: 'Imran Ali', phone: '9000011122', address: 'Shop 8, Masjid Galli', creditLimit: 12000, balance: 1800 },
  { id: 'CUST-006', name: 'Lakshmi Rao', phone: '9700112233', address: 'House 55, Temple View Colony', creditLimit: 6000, balance: 520 },
];

export function buildSampleCustomers(invoices, now) {
  const customers = RAW_CUSTOMERS.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    address: c.address,
    creditLimitPaise: rupeesToPaise(c.creditLimit),
    balancePaise: rupeesToPaise(c.balance),
    createdAt: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
  }));

  const khataTransactions = [
    {
      id: 'KHATA-001',
      customerId: 'CUST-001',
      customerName: 'Ramesh Patel',
      type: 'credit', // 'credit' = udhar taken (bill purchase)
      amountPaise: rupeesToPaise(1800),
      invoiceNumber: 'INV-2026-0008',
      paymentMethod: 'khata',
      notes: 'Monthly grocery bill on credit',
      date: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      balanceAfterPaise: rupeesToPaise(3450),
    },
    {
      id: 'KHATA-002',
      customerId: 'CUST-001',
      customerName: 'Ramesh Patel',
      type: 'payment', // 'payment' = jama (paid by customer)
      amountPaise: rupeesToPaise(1000),
      invoiceNumber: '',
      paymentMethod: 'upi',
      notes: 'Partial repayment via GPay',
      date: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      balanceAfterPaise: rupeesToPaise(2450),
    },
    {
      id: 'KHATA-003',
      customerId: 'CUST-002',
      customerName: 'Sita Devi',
      type: 'credit',
      amountPaise: rupeesToPaise(850),
      invoiceNumber: 'INV-2026-0014',
      paymentMethod: 'khata',
      notes: 'Provisions on credit',
      date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      balanceAfterPaise: rupeesToPaise(850),
    },
    {
      id: 'KHATA-004',
      customerId: 'CUST-003',
      customerName: 'Arjun Reddy',
      type: 'credit',
      amountPaise: rupeesToPaise(4120),
      invoiceNumber: 'INV-2026-0019',
      paymentMethod: 'khata',
      notes: 'Rice bags and oil on credit',
      date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      balanceAfterPaise: rupeesToPaise(4120),
    },
    {
      id: 'KHATA-005',
      customerId: 'CUST-005',
      customerName: 'Imran Ali',
      type: 'credit',
      amountPaise: rupeesToPaise(2800),
      invoiceNumber: 'INV-2026-0022',
      paymentMethod: 'khata',
      notes: 'Snacks & beverages inventory',
      date: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      balanceAfterPaise: rupeesToPaise(2800),
    },
    {
      id: 'KHATA-006',
      customerId: 'CUST-005',
      customerName: 'Imran Ali',
      type: 'payment',
      amountPaise: rupeesToPaise(1000),
      invoiceNumber: '',
      paymentMethod: 'cash',
      notes: 'Cash paid at shop counter',
      date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      balanceAfterPaise: rupeesToPaise(1800),
    },
    {
      id: 'KHATA-007',
      customerId: 'CUST-006',
      customerName: 'Lakshmi Rao',
      type: 'credit',
      amountPaise: rupeesToPaise(520),
      invoiceNumber: 'INV-2026-0026',
      paymentMethod: 'khata',
      notes: 'Dairy & bakery items',
      date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      balanceAfterPaise: rupeesToPaise(520),
    },
  ];

  return { customers, khataTransactions };
}
