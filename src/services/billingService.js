import { percentOfPaise, roundPaise } from '../utils/currencyUtils';
import { nextInvoiceNumber } from '../utils/receiptUtils';
import { applySaleDeductions } from './inventoryService';
import { recordKhataCredit, saveCustomer } from './khataService';

export function lineNetPaise(item) {
  const gross = roundPaise((item.unitPricePaise || 0) * (item.qty || 0));
  const discount = roundPaise(item.discountPaise || 0);
  return Math.max(0, gross - discount);
}

export function summarizeCart(items, { billDiscountType = 'amount', billDiscountValue = 0, gstEnabled = true, gstRate = 0 } = {}) {
  const safeItems = (items || []).filter((it) => it.qty > 0);
  const subtotalPaise = safeItems.reduce((s, it) => s + (it.unitPricePaise || 0) * (it.qty || 0), 0);
  const itemDiscountPaise = safeItems.reduce((s, it) => s + (it.discountPaise || 0), 0);
  const afterItemDiscount = Math.max(0, subtotalPaise - itemDiscountPaise);
  const billDiscountPaise = billDiscountType === 'percent'
    ? percentOfPaise(afterItemDiscount, billDiscountValue)
    : roundPaise(Number(billDiscountValue) || 0);
  const cappedBillDiscount = Math.min(afterItemDiscount, Math.max(0, billDiscountPaise));
  const taxablePaise = Math.max(0, afterItemDiscount - cappedBillDiscount);
  const taxPaise = gstEnabled ? percentOfPaise(taxablePaise, gstRate) : 0;
  const grandTotalPaise = taxablePaise + taxPaise;
  const itemCount = safeItems.reduce((s, it) => s + (it.qty || 0), 0);
  return {
    subtotalPaise,
    itemDiscountPaise,
    billDiscountPaise: cappedBillDiscount,
    discountPaise: itemDiscountPaise + cappedBillDiscount,
    taxablePaise,
    taxPaise,
    taxRate: gstEnabled ? gstRate : 0,
    grandTotalPaise,
    itemCount,
    lines: safeItems.length,
  };
}

export function addOrIncreaseItem(items, product, qty = 1) {
  const addQty = Number(qty) || 1;
  const existing = items.find((it) => it.productId === product.id);
  if (existing) {
    const nextQty = existing.qty + addQty;
    if (nextQty > product.quantity) {
      throw new Error(`Only ${product.quantity} ${product.unit} of ${product.name} available in stock.`);
    }
    return items.map((it) => (it.productId === product.id ? { ...it, qty: nextQty } : it));
  }
  if (product.quantity < addQty) {
    throw new Error(`${product.name} is out of stock or does not have enough quantity.`);
  }
  return [
    ...items,
    {
      productId: product.id,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      qty: addQty,
      unit: product.unit,
      unitPricePaise: product.sellingPricePaise,
      discountPaise: 0,
      taxPaise: 0,
    },
  ];
}

export function setItemQty(items, productId, qty, products) {
  const nextQty = Number(qty);
  if (!Number.isFinite(nextQty) || nextQty < 0) {
    throw new Error('Quantity must be zero or more.');
  }
  const product = products.find((p) => p.id === productId);
  if (product && nextQty > product.quantity) {
    throw new Error(`Only ${product.quantity} ${product.unit} available in stock.`);
  }
  if (nextQty === 0) return items.filter((it) => it.productId !== productId);
  return items.map((it) => (it.productId === productId ? { ...it, qty: nextQty } : it));
}

export function validateCheckout(items, products) {
  if (!items.length) throw new Error('Add at least one product before taking payment.');
  for (const item of items) {
    if (item.qty <= 0) throw new Error(`Quantity for ${item.name} is not valid.`);
    const product = products.find((p) => p.id === item.productId);
    if (!product) throw new Error(`${item.name} is no longer in the product list.`);
    if (product.status === 'inactive') throw new Error(`${product.name} is inactive and cannot be billed.`);
    if (item.qty > product.quantity) {
      throw new Error(`Not enough stock for ${product.name}. Available: ${product.quantity}.`);
    }
  }
}

export function completeCheckout(state, {
  items,
  billDiscountType,
  billDiscountValue,
  paymentMethod,
  amountPaidPaise,
  customerId,
  customerName,
  customerPhone,
}) {
  validateCheckout(items, state.products);
  const summary = summarizeCart(items, {
    billDiscountType,
    billDiscountValue,
    gstEnabled: state.settings.gstEnabled,
    gstRate: Number(state.settings.gstRate) || 0,
  });
  if (summary.grandTotalPaise < 0) throw new Error('Bill total is not valid.');

  const paid = roundPaise(amountPaidPaise);
  if (paymentMethod === 'cash' && paid < summary.grandTotalPaise) {
    throw new Error('Cash received is less than the bill total.');
  }
  const amountPaid = paymentMethod === 'cash' ? paid : summary.grandTotalPaise;
  const { invoiceNumber, invoiceSeq } = nextInvoiceNumber(state);
  const createdAt = new Date().toISOString();

  const invoiceItems = items.map((it) => {
    const net = lineNetPaise(it);
    const share = summary.taxablePaise > 0 ? net / (summary.subtotalPaise - summary.itemDiscountPaise || 1) : 0;
    const taxShare = roundPaise(summary.taxPaise * share);
    return {
      ...it,
      taxPaise: taxShare,
      lineTotalPaise: net,
    };
  });

  const invoice = {
    id: `BILL-${invoiceSeq}`,
    invoiceNumber,
    createdAt,
    customerId: customerId || null,
    customerName: String(customerName || '').trim(),
    customerPhone: String(customerPhone || '').trim(),
    items: invoiceItems,
    subtotalPaise: summary.subtotalPaise,
    discountPaise: summary.discountPaise,
    taxPaise: summary.taxPaise,
    taxRate: summary.taxRate,
    grandTotalPaise: summary.grandTotalPaise,
    paymentMethod,
    amountPaidPaise: amountPaid,
    changePaise: Math.max(0, amountPaid - summary.grandTotalPaise),
    status: 'completed',
  };

  let next = {
    ...state,
    invoices: [invoice, ...state.invoices],
    meta: { ...state.meta, invoiceSeq },
  };

  // If payment method is Khata (Udhar / Credit), record in Customer Khata
  if (paymentMethod === 'khata') {
    let cust = (state.customers || []).find((c) => c.id === customerId);
    if (!cust && customerName) {
      cust = (state.customers || []).find(
        (c) => c.name.toLowerCase() === customerName.toLowerCase() || (customerPhone && c.phone === customerPhone)
      );
    }
    if (!cust) {
      if (!customerName) {
        throw new Error('Please select or specify customer name for Khata billing.');
      }
      next = saveCustomer(next, { name: customerName, phone: customerPhone, balance: 0, creditLimit: 5000 });
      cust = next.createdCustomer;
    }

    next = recordKhataCredit(next, {
      customerId: cust.id,
      amountPaise: summary.grandTotalPaise,
      invoiceNumber,
      notes: `Bill #${invoiceNumber} purchased on Khata`,
    });

    invoice.customerId = cust.id;
    invoice.customerName = cust.name;
    invoice.customerPhone = cust.phone;
    invoice.customerKhataBalancePaise = (cust.balancePaise || 0) + summary.grandTotalPaise;
  }

  next = applySaleDeductions(next, invoice);
  next.lastInvoice = invoice;
  return next;
}
