import { rupeesToPaise } from '../utils/currencyUtils';

export function searchSuppliers(suppliers = [], query = '') {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return suppliers;
  return suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      (s.contactPerson && s.contactPerson.toLowerCase().includes(q)) ||
      (s.phone && s.phone.includes(q)) ||
      (s.gstin && s.gstin.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q))
  );
}

export function saveSupplier(state, supplierData, existingId = null) {
  const name = String(supplierData.name || '').trim();
  if (!name) throw new Error('Supplier company name is required.');

  const suppliers = [...(state.suppliers || [])];
  const now = new Date().toISOString();

  if (existingId) {
    const idx = suppliers.findIndex((s) => s.id === existingId);
    if (idx < 0) throw new Error('Supplier not found.');

    suppliers[idx] = {
      ...suppliers[idx],
      name,
      contactPerson: String(supplierData.contactPerson || '').trim(),
      phone: String(supplierData.phone || '').trim(),
      email: String(supplierData.email || '').trim(),
      address: String(supplierData.address || '').trim(),
      gstin: String(supplierData.gstin || '').trim().toUpperCase(),
      paymentTerms: supplierData.paymentTerms || '15 Days Credit',
    };
  } else {
    const nextSeq = (state.meta?.supplierSeq || suppliers.length) + 1;
    const newSupplier = {
      id: `sup-${nextSeq}`,
      name,
      contactPerson: String(supplierData.contactPerson || '').trim(),
      phone: String(supplierData.phone || '').trim(),
      email: String(supplierData.email || '').trim(),
      address: String(supplierData.address || '').trim(),
      gstin: String(supplierData.gstin || '').trim().toUpperCase(),
      paymentTerms: supplierData.paymentTerms || '15 Days Credit',
      balancePaise: Math.round(Number(supplierData.balance || 0) * 100),
      createdAt: now,
    };
    suppliers.push(newSupplier);
  }

  return {
    ...state,
    suppliers,
    meta: {
      ...state.meta,
      supplierSeq: Math.max(state.meta?.supplierSeq || 0, suppliers.length),
    },
  };
}

export function deleteSupplier(state, supplierId) {
  const suppliers = (state.suppliers || []).filter((s) => s.id !== supplierId);
  return { ...state, suppliers };
}

export function createPurchaseInvoice(state, purchaseData) {
  const {
    supplierId,
    supplierName,
    billNumber,
    items,
    paidAmountPaise = 0,
    notes = '',
    date = new Date().toISOString(),
  } = purchaseData;

  if (!supplierId) throw new Error('Please select a supplier.');
  if (!items || !items.length) throw new Error('Please add at least one product item.');

  const purchases = [...(state.purchases || [])];
  const nextSeq = (state.meta?.purchaseSeq || purchases.length) + 1;
  const purchaseNumber = `PO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(nextSeq).padStart(3, '0')}`;

  let subtotalPaise = 0;
  let taxPaise = 0;

  const validatedItems = items.map((it) => {
    const qty = Math.max(1, Number(it.qty) || 1);
    const unitCostPaise = Math.round(Number(it.unitCost) * 100);
    const taxRate = Number(it.taxRate || 0);
    const lineSubtotal = unitCostPaise * qty;
    const lineTax = Math.round((lineSubtotal * taxRate) / 100);
    const lineTotal = lineSubtotal + lineTax;

    subtotalPaise += lineSubtotal;
    taxPaise += lineTax;

    return {
      productId: it.productId,
      name: it.name,
      sku: it.sku,
      barcode: it.barcode || '',
      qty,
      unitCostPaise,
      taxRate,
      mfgDate: it.mfgDate || new Date().toISOString().slice(0, 10),
      expiryDate: it.expiryDate || '',
      batchNo: it.batchNo || `BAT-${new Date().toISOString().slice(2, 7).replace('-', '')}`,
      lineTotalPaise: lineTotal,
    };
  });

  const grandTotalPaise = subtotalPaise + taxPaise;
  const dueAmountPaise = Math.max(0, grandTotalPaise - paidAmountPaise);
  const paymentStatus =
    paidAmountPaise >= grandTotalPaise
      ? 'paid'
      : paidAmountPaise > 0
      ? 'partial'
      : 'unpaid';

  const newPurchase = {
    id: `pur-${nextSeq}`,
    purchaseNumber,
    supplierId,
    supplierName,
    billNumber: billNumber || `BILL-${Date.now().toString().slice(-6)}`,
    date,
    items: validatedItems,
    subtotalPaise,
    taxPaise,
    grandTotalPaise,
    paidAmountPaise,
    dueAmountPaise,
    status: 'received',
    paymentStatus,
    notes,
  };

  purchases.unshift(newPurchase);

  // 1. Automatically update stock and stock movement logs
  const products = [...(state.products || [])];
  const movements = [...(state.movements || [])];

  validatedItems.forEach((it) => {
    const pIdx = products.findIndex((p) => p.id === it.productId);
    if (pIdx >= 0) {
      const curPrd = products[pIdx];
      const prevQty = curPrd.quantity || 0;
      const nextQty = prevQty + it.qty;

      products[pIdx] = {
        ...curPrd,
        quantity: nextQty,
        purchasePricePaise: it.unitCostPaise > 0 ? it.unitCostPaise : curPrd.purchasePricePaise,
        mfgDate: it.mfgDate || curPrd.mfgDate,
        expiryDate: it.expiryDate || curPrd.expiryDate,
        batchNo: it.batchNo || curPrd.batchNo,
      };

      movements.unshift({
        id: `MOV-PUR-${newPurchase.id}-${it.productId}`,
        productId: it.productId,
        productName: it.name,
        previousQty: prevQty,
        changeQty: it.qty,
        newQty: nextQty,
        type: 'stock-in',
        reason: `Goods Received: ${purchaseNumber} (${supplierName})`,
        date,
        invoiceNumber: purchaseNumber,
      });
    }
  });

  // 2. Automatically update supplier's outstanding balance
  const suppliers = [...(state.suppliers || [])];
  const sIdx = suppliers.findIndex((s) => s.id === supplierId);
  if (sIdx >= 0) {
    suppliers[sIdx] = {
      ...suppliers[sIdx],
      balancePaise: (suppliers[sIdx].balancePaise || 0) + dueAmountPaise,
    };
  }

  // 3. If payment made, record in supplier payments
  const supplierPayments = [...(state.supplierPayments || [])];
  if (paidAmountPaise > 0) {
    supplierPayments.unshift({
      id: `spay-${Date.now()}`,
      supplierId,
      supplierName,
      amountPaise: paidAmountPaise,
      date,
      paymentMethod: purchaseData.paymentMethod || 'cash',
      referenceNumber: `Paid on ${purchaseNumber}`,
      notes: `Purchase downpayment for bill ${newPurchase.billNumber}`,
    });
  }

  return {
    ...state,
    purchases,
    products,
    movements,
    suppliers,
    supplierPayments,
    meta: {
      ...state.meta,
      purchaseSeq: nextSeq,
    },
  };
}

export function recordSupplierPayment(state, paymentData) {
  const {
    supplierId,
    amountPaise,
    paymentMethod = 'cash',
    referenceNumber = '',
    notes = '',
    date = new Date().toISOString(),
  } = paymentData;

  if (!supplierId) throw new Error('Select a supplier to record payment.');
  if (!amountPaise || amountPaise <= 0) throw new Error('Enter a valid payment amount.');

  const suppliers = [...(state.suppliers || [])];
  const sIdx = suppliers.findIndex((s) => s.id === supplierId);
  if (sIdx < 0) throw new Error('Supplier not found.');

  const supplier = suppliers[sIdx];
  const currentBal = supplier.balancePaise || 0;
  suppliers[sIdx] = {
    ...supplier,
    balancePaise: Math.max(0, currentBal - amountPaise),
  };

  const supplierPayments = [...(state.supplierPayments || [])];
  const newPayment = {
    id: `spay-${Date.now()}`,
    supplierId,
    supplierName: supplier.name,
    amountPaise,
    date,
    paymentMethod,
    referenceNumber,
    notes,
  };
  supplierPayments.unshift(newPayment);

  return {
    ...state,
    suppliers,
    supplierPayments,
  };
}

export function recordPurchaseReturn(state, returnData) {
  const {
    supplierId,
    items,
    reason = '',
    creditNoteNumber = '',
    date = new Date().toISOString(),
  } = returnData;

  if (!supplierId) throw new Error('Select a supplier for the return.');
  if (!items || !items.length) throw new Error('Add at least one item to return.');

  const suppliers = [...(state.suppliers || [])];
  const sIdx = suppliers.findIndex((s) => s.id === supplierId);
  if (sIdx < 0) throw new Error('Supplier not found.');

  const supplier = suppliers[sIdx];
  const purchaseReturns = [...(state.purchaseReturns || [])];
  const nextSeq = (purchaseReturns.length || 0) + 1;
  const returnNumber = `PR-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(nextSeq).padStart(3, '0')}`;

  let totalAmountPaise = 0;
  const products = [...(state.products || [])];
  const movements = [...(state.movements || [])];

  const processedItems = items.map((it) => {
    const qty = Math.max(1, Number(it.qty) || 1);
    const unitCostPaise = Math.round(Number(it.unitCost) * 100);
    const lineTotalPaise = unitCostPaise * qty;
    totalAmountPaise += lineTotalPaise;

    // Deduct stock
    const pIdx = products.findIndex((p) => p.id === it.productId);
    if (pIdx >= 0) {
      const curPrd = products[pIdx];
      const prevQty = curPrd.quantity || 0;
      const nextQty = Math.max(0, prevQty - qty);
      products[pIdx] = { ...curPrd, quantity: nextQty };

      movements.unshift({
        id: `MOV-PRET-${returnNumber}-${it.productId}`,
        productId: it.productId,
        productName: it.name,
        previousQty: prevQty,
        changeQty: -qty,
        newQty: nextQty,
        type: 'stock-out',
        reason: `Purchase Return ${returnNumber} to ${supplier.name}: ${it.reason || reason || 'Damaged/Defective'}`,
        date,
        invoiceNumber: returnNumber,
      });
    }

    return {
      productId: it.productId,
      name: it.name,
      sku: it.sku,
      qty,
      unitCostPaise,
      lineTotalPaise,
      reason: it.reason || reason,
    };
  });

  // Deduct from supplier balance
  suppliers[sIdx] = {
    ...supplier,
    balancePaise: Math.max(0, (supplier.balancePaise || 0) - totalAmountPaise),
  };

  const newReturn = {
    id: `pret-${nextSeq}`,
    returnNumber,
    supplierId,
    supplierName: supplier.name,
    date,
    items: processedItems,
    totalAmountPaise,
    creditNoteNumber: creditNoteNumber || `CN-${Date.now().toString().slice(-6)}`,
    status: 'approved',
    notes: reason,
  };

  purchaseReturns.unshift(newReturn);

  return {
    ...state,
    suppliers,
    products,
    movements,
    purchaseReturns,
  };
}

export function getSupplierLedger(purchases = [], payments = [], returns = [], supplierId) {
  const events = [];

  purchases
    .filter((p) => p.supplierId === supplierId)
    .forEach((p) => {
      events.push({
        id: `pur-${p.id}`,
        date: p.date,
        type: 'PURCHASE',
        description: `Invoice: ${p.purchaseNumber} (Bill: ${p.billNumber})`,
        debitPaise: p.grandTotalPaise, // We owe
        creditPaise: 0,
      });
    });

  payments
    .filter((p) => p.supplierId === supplierId)
    .forEach((p) => {
      events.push({
        id: `pay-${p.id}`,
        date: p.date,
        type: 'PAYMENT',
        description: `Payment: ${p.paymentMethod?.toUpperCase()} (Ref: ${p.referenceNumber || 'Cash'})`,
        debitPaise: 0,
        creditPaise: p.amountPaise, // We paid
      });
    });

  returns
    .filter((r) => r.supplierId === supplierId)
    .forEach((r) => {
      events.push({
        id: `ret-${r.id}`,
        date: r.date,
        type: 'RETURN',
        description: `Return: ${r.returnNumber} (CN: ${r.creditNoteNumber})`,
        debitPaise: 0,
        creditPaise: r.totalAmountPaise, // Credit note reduces due
      });
    });

  events.sort((a, b) => new Date(a.date) - new Date(b.date));

  let runningBalance = 0;
  return events.map((ev) => {
    runningBalance += ev.debitPaise - ev.creditPaise;
    return { ...ev, runningBalancePaise: runningBalance };
  });
}

export function getProductPriceComparison(purchases = [], products = [], suppliers = []) {
  const productMap = new Map();

  products.forEach((p) => {
    productMap.set(p.id, {
      product: p,
      quotes: [],
    });
  });

  purchases.forEach((po) => {
    po.items.forEach((item) => {
      const entry = productMap.get(item.productId);
      if (entry) {
        // avoid duplicate quotes from same supplier if price identical
        const exists = entry.quotes.find(
          (q) => q.supplierId === po.supplierId && q.unitCostPaise === item.unitCostPaise
        );
        if (!exists) {
          entry.quotes.push({
            supplierId: po.supplierId,
            supplierName: po.supplierName,
            purchaseNumber: po.purchaseNumber,
            date: po.date,
            unitCostPaise: item.unitCostPaise,
            sellingPricePaise: entry.product.sellingPricePaise,
          });
        }
      }
    });
  });

  return Array.from(productMap.values()).map((entry) => {
    const quotes = entry.quotes.sort((a, b) => a.unitCostPaise - b.unitCostPaise);
    const minQuote = quotes.length ? quotes[0] : null;
    const maxQuote = quotes.length ? quotes[quotes.length - 1] : null;
    const currentCost = entry.product.purchasePricePaise;
    const sellingPrice = entry.product.sellingPricePaise;

    return {
      product: entry.product,
      quotes,
      bestSupplier: minQuote ? minQuote.supplierName : 'Current Supplier',
      minCostPaise: minQuote ? minQuote.unitCostPaise : currentCost,
      maxCostPaise: maxQuote ? maxQuote.unitCostPaise : currentCost,
      currentCostPaise: currentCost,
      marginPercent:
        currentCost > 0
          ? (((sellingPrice - currentCost) / currentCost) * 100).toFixed(0)
          : '0',
    };
  });
}
