import { formatINR } from './currencyUtils';
import { formatDateTime } from './dateUtils';

export function nextInvoiceNumber(state) {
  const seq = (state.meta?.invoiceSeq || 0) + 1;
  const prefix = state.shop?.invoicePrefix || 'INV';
  const year = new Date().getFullYear();
  return {
    invoiceNumber: `${prefix}-${year}-${String(seq).padStart(4, '0')}`,
    invoiceSeq: seq,
  };
}

export function buildReceiptLines(invoice, shop) {
  return {
    shopName: shop.name,
    address: shop.address,
    phone: shop.phone,
    email: shop.email,
    gstin: shop.gstin,
    invoiceNumber: invoice.invoiceNumber,
    when: formatDateTime(invoice.createdAt),
    customerName: invoice.customerName || '',
    customerPhone: invoice.customerPhone || '',
    items: invoice.items,
    subtotal: formatINR(invoice.subtotalPaise),
    discount: formatINR(invoice.discountPaise),
    tax: formatINR(invoice.taxPaise),
    taxRate: invoice.taxRate,
    grandTotal: formatINR(invoice.grandTotalPaise),
    paymentMethod: invoice.paymentMethod,
    amountPaid: formatINR(invoice.amountPaidPaise),
    change: formatINR(invoice.changePaise),
    footer: shop.receiptFooter || 'Thank you for shopping with us!',
  };
}

export function paymentLabel(method) {
  if (method === 'upi') return 'UPI';
  if (method === 'card') return 'Card';
  if (method === 'cash') return 'Cash';
  if (method === 'khata') return 'Khata (Udhar)';
  return method || '—';
}
