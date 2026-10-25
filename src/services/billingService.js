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

export function getItemLineKey(item) {
  if (item.lineKey) return item.lineKey;
  return item.variantId ? `${item.productId}__${item.variantId}` : item.productId;
}

export function addOrIncreaseItem(items, product, qty = 1) {
  const addQty = Number(qty) || 1;
  const targetKey = product.variantId ? `${product.id}__${product.variantId}` : product.id;
  const existing = items.find((it) => getItemLineKey(it) === targetKey);
  const maxStock = product.quantity !== undefined ? product.quantity : 9999;

  const displayName = product.variantName && !product.name.includes(product.variantName)
    ? `${product.name} (${product.variantName})`
    : product.name;

  if (existing) {
    const nextQty = existing.qty + addQty;
    if (nextQty > maxStock) {
      throw new Error(`Only ${maxStock} ${product.unit} of ${displayName} available in stock.`);
    }
    return items.map((it) => (getItemLineKey(it) === targetKey ? { ...it, qty: nextQty } : it));
  }
  if (maxStock < addQty) {
    throw new Error(`${displayName} is out of stock or does not have enough quantity.`);
  }
  return [
    ...items,
    {
      lineKey: targetKey,
      productId: product.id,
      variantId: product.variantId || null,
      variantName: product.variantName || '',
      name: displayName,
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

export function setItemQty(items, identifier, qty, products) {
  const nextQty = Number(qty);
  if (!Number.isFinite(nextQty) || nextQty < 0) {
    throw new Error('Quantity must be zero or more.');
  }
  const targetItem = items.find((it) => getItemLineKey(it) === identifier || it.productId === identifier);
  if (!targetItem) return items;

  const product = products.find((p) => p.id === targetItem.productId);
  const variant = product?.variants?.find((v) => v.id === targetItem.variantId);
  const maxStock = variant?.quantity !== undefined ? variant.quantity : (product?.quantity || 9999);

  if (nextQty > maxStock) {
    throw new Error(`Only ${maxStock} ${targetItem.unit} available in stock.`);
  }
  if (nextQty === 0) {
    return items.filter((it) => getItemLineKey(it) !== identifier && it.productId !== identifier);
  }
  return items.map((it) => {
    if (getItemLineKey(it) === identifier || it.productId === identifier) {
      return { ...it, qty: nextQty };
    }
    return it;
  });
}

export function validateCheckout(items, products) {
  if (!items.length) throw new Error('Add at least one product before taking payment.');
  for (const item of items) {
    if (item.qty <= 0) throw new Error(`Quantity for ${item.name} is not valid.`);
    const product = products.find((p) => p.id === item.productId);
    if (!product) throw new Error(`${item.name} is no longer in the product list.`);
    if (product.status === 'inactive') throw new Error(`${product.name} is inactive and cannot be billed.`);
    const variant = product?.variants?.find((v) => v.id === item.variantId);
    const available = variant?.quantity !== undefined ? variant.quantity : product.quantity;
    if (item.qty > available) {
      throw new Error(`Not enough stock for ${item.name}. Available: ${available}.`);
    }
  }
}

export function completeCheckout(state, payload = {}) {
  // Support both flat params and nested objects ({ payment, customer, summary })
  const items = payload.items || [];
  const billDiscountType = payload.billDiscountType || 'amount';
  const billDiscountValue = payload.billDiscountValue || 0;

  const paymentMethod = payload.paymentMethod || payload.payment?.paymentMethod || 'cash';
  const amountPaidPaise = payload.amountPaidPaise !== undefined 
    ? payload.amountPaidPaise 
    : (payload.payment?.amountPaidPaise !== undefined ? payload.payment.amountPaidPaise : undefined);

  const customerId = payload.customerId || payload.customer?.id || payload.payment?.customerId || null;
  const customerName = payload.customerName || payload.customer?.name || payload.payment?.customerName || '';
  const customerPhone = payload.customerPhone || payload.customer?.phone || payload.payment?.customerPhone || '';

  validateCheckout(items, state.products);
  const summary = summarizeCart(items, {
    billDiscountType,
    billDiscountValue,
    gstEnabled: state.settings.gstEnabled,
    gstRate: Number(state.settings.gstRate) || 0,
  });
  if (summary.grandTotalPaise < 0) throw new Error('Bill total is not valid.');

  const grandTotal = summary.grandTotalPaise;
  const paid = amountPaidPaise !== undefined ? roundPaise(amountPaidPaise) : grandTotal;
  if (paymentMethod === 'cash' && paid < grandTotal) {
    throw new Error(`Cash received (${paid / 100}) is less than the bill total (${grandTotal / 100}).`);
  }
  const amountPaid = paymentMethod === 'cash' ? paid : grandTotal;
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

  const branch = (state.branches || []).find((b) => b.id === (payload.branchId || state.activeBranchId)) || state.branches?.[0];
  const branchId = payload.branchId || branch?.id || 'BR-001';
  const branchName = payload.branchName || branch?.name || 'Main Branch - Banjara Hills';
  const counter = branch?.counters?.find((c) => c.id === (payload.counterId || state.activeCounterId)) || branch?.counters?.[0];
  const counterId = payload.counterId || counter?.id || 'CNT-01';
  const counterName = payload.counterName || counter?.name || 'Counter 1 (Express POS)';
  const cashierName = payload.cashierName || counter?.cashier || 'Pooja Verma';

  const invoice = {
    id: `BILL-${invoiceSeq}`,
    invoiceNumber,
    createdAt,
    branchId,
    branchName,
    counterId,
    counterName,
    cashierName,
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
