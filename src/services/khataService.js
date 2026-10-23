import { rupeesToPaise } from '../utils/currencyUtils';

export function searchCustomers(customers = [], query = '') {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return customers;
  return customers.filter((c) =>
    c.name.toLowerCase().includes(q)
    || (c.phone && c.phone.includes(q))
    || (c.address && c.address.toLowerCase().includes(q))
  );
}

export function saveCustomer(state, input, editingId = null) {
  const name = String(input.name || '').trim();
  const phone = String(input.phone || '').trim();
  if (!name) {
    throw new Error('Please enter customer name.');
  }

  const creditLimitPaise = rupeesToPaise(input.creditLimit || 5000);
  const initialBalancePaise = rupeesToPaise(input.balance || 0);

  if (editingId) {
    return {
      ...state,
      customers: (state.customers || []).map((c) => (c.id === editingId ? {
        ...c,
        name,
        phone,
        address: String(input.address || '').trim(),
        creditLimitPaise,
        status: input.status || 'active',
      } : c)),
    };
  }

  const seq = (state.meta?.customerSeq || (state.customers || []).length) + 1;
  const newCustomer = {
    id: `CUST-${String(seq).padStart(3, '0')}`,
    name,
    phone,
    address: String(input.address || '').trim(),
    creditLimitPaise,
    balancePaise: initialBalancePaise,
    createdAt: new Date().toISOString(),
    status: 'active',
  };

  return {
    ...state,
    customers: [newCustomer, ...(state.customers || [])],
    meta: {
      ...state.meta,
      customerSeq: seq,
    },
    createdCustomer: newCustomer,
  };
}

export function recordKhataCredit(state, { customerId, amountPaise, invoiceNumber, notes }) {
  const customers = state.customers || [];
  const customer = customers.find((c) => c.id === customerId);
  if (!customer) {
    throw new Error('Selected customer not found in Khata.');
  }

  const delta = Number(amountPaise) || 0;
  const newBalancePaise = (customer.balancePaise || 0) + delta;
  const seq = (state.meta?.khataSeq || (state.khataTransactions || []).length) + 1;

  const transaction = {
    id: `KHATA-${String(seq).padStart(4, '0')}`,
    customerId: customer.id,
    customerName: customer.name,
    type: 'credit', // udhar added to customer's account
    amountPaise: delta,
    invoiceNumber: invoiceNumber || '',
    paymentMethod: 'khata',
    notes: notes || `Bill #${invoiceNumber} added to Khata`,
    date: new Date().toISOString(),
    balanceAfterPaise: newBalancePaise,
  };

  return {
    ...state,
    customers: customers.map((c) => (c.id === customerId ? { ...c, balancePaise: newBalancePaise } : c)),
    khataTransactions: [transaction, ...(state.khataTransactions || [])],
    meta: {
      ...state.meta,
      khataSeq: seq,
    },
    lastKhataTx: transaction,
  };
}

export function recordKhataPayment(state, { customerId, amountPaise, paymentMethod = 'cash', notes = '' }) {
  const customers = state.customers || [];
  const customer = customers.find((c) => c.id === customerId);
  if (!customer) {
    throw new Error('Customer not found in Khata.');
  }

  const payAmount = Number(amountPaise);
  if (!Number.isFinite(payAmount) || payAmount <= 0) {
    throw new Error('Please enter a valid payment amount greater than zero.');
  }

  const currentBal = customer.balancePaise || 0;
  const newBalancePaise = Math.max(0, currentBal - payAmount);
  const seq = (state.meta?.khataSeq || (state.khataTransactions || []).length) + 1;

  const transaction = {
    id: `KHATA-${String(seq).padStart(4, '0')}`,
    customerId: customer.id,
    customerName: customer.name,
    type: 'payment', // jama (repayment towards outstanding balance)
    amountPaise: payAmount,
    invoiceNumber: '',
    paymentMethod,
    notes: notes || `Jama repayment via ${paymentMethod.toUpperCase()}`,
    date: new Date().toISOString(),
    balanceAfterPaise: newBalancePaise,
  };

  return {
    ...state,
    customers: customers.map((c) => (c.id === customerId ? { ...c, balancePaise: newBalancePaise } : c)),
    khataTransactions: [transaction, ...(state.khataTransactions || [])],
    meta: {
      ...state.meta,
      khataSeq: seq,
    },
    lastKhataTx: transaction,
  };
}

export function getCustomerLedger(khataTransactions = [], customerId) {
  return khataTransactions
    .filter((tx) => tx.customerId === customerId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function getKhataSummary(customers = [], khataTransactions = []) {
  const totalMarketDuePaise = (customers || []).reduce((sum, c) => sum + (c.balancePaise || 0), 0);
  const customersWithDue = (customers || []).filter((c) => (c.balancePaise || 0) > 0);
  const today = new Date().toISOString().slice(0, 10);
  const todayCollectedPaise = (khataTransactions || [])
    .filter((tx) => tx.type === 'payment' && tx.date.startsWith(today))
    .reduce((sum, tx) => sum + (tx.amountPaise || 0), 0);

  return {
    totalMarketDuePaise,
    customersWithDueCount: customersWithDue.length,
    totalCustomersCount: customers.length,
    todayCollectedPaise,
  };
}

export function getKhataWhatsAppUrl(customer, shop) {
  if (!customer?.phone) return '';
  const digits = customer.phone.replace(/[^0-9]/g, '');
  const phone = digits.length === 10 ? `91${digits}` : digits;
  const balanceRupees = ((customer.balancePaise || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const shopName = shop?.name || 'our shop';
  const text = encodeURIComponent(
    `Namaste ${customer.name}, this is a gentle reminder from ${shopName}. Your current outstanding balance (Khata / Udhar) is ₹${balanceRupees}. Please clear at your earliest convenience. Thank you!`
  );
  return `https://wa.me/${phone}?text=${text}`;
}
